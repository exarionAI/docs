import type { Bindings, Heap, Ray, RayHit, Triangle } from './native/index.js';
import {
  RAY_SIZE,
  RAYHIT_SIZE,
  TRIANGLE_SIZE,
  VEC3_SIZE,
  readRayHit,
  writeRay,
  writeTriangles,
} from './native/index.js';
import type { Disposable } from './Disposable.js';

/** BVH build options. */
export interface MeshBuildOptions {
  /** Default: use the engine's current ExaMeshBuildOption. */
  bvhMaxDepth?: number;
  /** Default: use the engine's current ExaMeshBuildOption. */
  primPerLeaf?: number;
  /**
   * BVH type — mirrors STCoreV2 `ExaBvhType`.
   * Omit or pass `BvhType.Default` to use the engine's current default mesh
   * build option.
   */
  bvhType?: BvhTypeValue;
}

export const BVHType = {
  Default: -1,
  HKDtree: 0,
  LBVH: 1,
  LBVH_SIMD4: 2,
  LBVH_SIMD8: 3,
  LBVH_SIMD16: 4,
  LBVH_NWAY4: 5,
  LBVH_NWAY8: 6,
  LBVH_NWAY16: 7,
} as const;
export const BvhType = BVHType;
export type BvhTypeValue = (typeof BVHType)[keyof typeof BVHType];
export type BVHTypeValue = BvhTypeValue;

export class SoundMesh implements Disposable {
  private readonly b: Bindings;
  private readonly h: Heap;
  readonly id: number;
  private _disposed = false;
  private updateVertsPtr = 0;
  private updateVertsBytes = 0;
  /** @inheritdoc */
  get disposed(): boolean { return this._disposed; }

  /** @internal — construct via `SoundTrace.createMesh()`. */
  constructor(b: Bindings, h: Heap) {
    this.b = b;
    this.h = h;
    this.id = b.exaNewMesh();
  }

  /**
   * Set mesh geometry.
   * @param vertices flat float32 array — length = numVerts * 3 (xyz xyz ...)
   * @param triangles per-triangle records { a, b, c, materialIndex }
   */
  setData(
    vertices: ArrayLike<number>,
    triangles: ArrayLike<Triangle>,
    opts: MeshBuildOptions = {},
  ): boolean {
    const numVerts = vertices.length / 3;
    if (!Number.isInteger(numVerts)) {
      throw new Error(`[soundtrace.js] vertices.length must be multiple of 3 (got ${vertices.length})`);
    }
    const bvhMaxDepth = opts.bvhMaxDepth ?? 0;
    const primPerLeaf = opts.primPerLeaf ?? 0;
    const bvhType = opts.bvhType ?? BVHType.Default;

    return this.h.withScope(s => {
      const vPtr = s.alloc(numVerts * VEC3_SIZE);
      this.h.writeF32Array(vPtr, vertices);
      const tPtr = s.alloc(triangles.length * TRIANGLE_SIZE);
      writeTriangles(this.h, tPtr, triangles);
      const ok = this.b.exaMeshSetData(
        this.id, vPtr, numVerts, tPtr, triangles.length,
        bvhMaxDepth, primPerLeaf, bvhType,
      );
      // Current wasm builds invalidate the debug BVH wireframe cache through
      // refit(), while setData() rebuilds geometry without touching that cache.
      // Refit is geometry-preserving here and makes getBVHWireframe() reflect
      // BVH builder changes immediately.
      if (ok) this.b.exaMeshRefit(this.id);
      return ok;
    });
  }

  updateVertices(vertices: ArrayLike<number>): boolean {
    const numVerts = vertices.length / 3;
    if (!Number.isInteger(numVerts)) {
      throw new Error(`[soundtrace.js] vertices.length must be multiple of 3 (got ${vertices.length})`);
    }
    const bytes = numVerts * VEC3_SIZE;
    if (bytes > this.updateVertsBytes) {
      if (this.updateVertsPtr) this.h.free(this.updateVertsPtr);
      this.updateVertsPtr = this.h.malloc(bytes);
      this.updateVertsBytes = bytes;
    }
    this.h.writeF32Array(this.updateVertsPtr, vertices);
    return this.b.exaMeshUpdateVertices(this.id, this.updateVertsPtr, numVerts);
  }

  updateVerticesAndRefit(vertices: ArrayLike<number>): boolean {
    const numVerts = vertices.length / 3;
    if (!Number.isInteger(numVerts)) {
      throw new Error(`[soundtrace.js] vertices.length must be multiple of 3 (got ${vertices.length})`);
    }
    const bytes = numVerts * VEC3_SIZE;
    if (bytes > this.updateVertsBytes) {
      if (this.updateVertsPtr) this.h.free(this.updateVertsPtr);
      this.updateVertsPtr = this.h.malloc(bytes);
      this.updateVertsBytes = bytes;
    }
    this.h.writeF32Array(this.updateVertsPtr, vertices);
    return this.b.exaMeshUpdateVertices(this.id, this.updateVertsPtr, numVerts) && this.b.exaMeshRefit(this.id);
  }

  refit(): boolean { return this.b.exaMeshRefit(this.id); }

  setMaterial(materialIndex: number): boolean {
    return this.b.exaMeshSetMaterial(this.id, materialIndex);
  }
  setMaterialRange(triStart: number, triCount: number, materialIndex: number): boolean {
    return this.b.exaMeshSetMaterialRange(this.id, triStart, triCount, materialIndex);
  }

  /**
   * Return the BVH-leaf bounding-box wireframe geometry as a flat triangle
   * vertex array. Each consecutive 9 floats = one triangle (3 verts × xyz);
   * each consecutive 36 vertices (12 triangles) form one cube — the AABB of a
   * single BVH leaf node.
   *
   * Backed by exaSound's `getTriangleVertexArrayCached()` (see
   * `STCoreV2/exaSound/src/scene/SoundObject/SoundMesh.cpp:81`). The cache is
   * invalidated automatically by `setData()` and `refit()`.
   *
   * @returns Float32Array view (independent copy, length = numTris * 9), or
   *          `null` if the engine could not service the call (mesh deleted,
   *          BVH not yet built, etc.).
   */
  getBVHWireframe(): Float32Array | null {
    return this.h.withScope(s => {
      const ptrPtr   = s.alloc(4);
      const countPtr = s.alloc(4);
      const ok = this.b.exaGetSoundMeshVrtsTrisAll(this.id, ptrPtr, countPtr);
      if (!ok) return null;
      const dataPtr = this.h.readU32(ptrPtr);
      const count   = this.h.readU32(countPtr);
      if (!dataPtr || count === 0) return null;
      // `count` is float-element count from the C side; copy out so the buffer
      // survives the heap's next allocation/grow.
      return this.h.readF32Array(dataPtr, count);
    });
  }

  /** Intersect a ray against meshes registered in the given scene. */
  intersect(sceneID: number, ray: Ray): RayHit | null {
    return this.h.withScope(s => {
      const rPtr = s.block(RAY_SIZE);
      writeRay(this.h, rPtr, ray);
      const hitPtr = s.block(RAYHIT_SIZE);
      const ok = this.b.exaIntersectSoundMesh(sceneID, rPtr, hitPtr);
      if (!ok) return null;
      return readRayHit(this.h, hitPtr);
    });
  }

  /** @inheritdoc */
  dispose(): void {
    if (this._disposed) return;
    if (this.updateVertsPtr) this.h.free(this.updateVertsPtr);
    this.b.exaDeleteMesh(this.id);
    this._disposed = true;
  }
  /** @inheritdoc */
  [Symbol.dispose](): void { this.dispose(); }
}
