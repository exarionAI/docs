import type { Bindings, Heap, Ray, RayHit, Triangle } from './native/index.js';
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
export declare const BVHType: {
    readonly Default: -1;
    readonly HKDtree: 0;
    readonly LBVH: 1;
    readonly LBVH_SIMD4: 2;
    readonly LBVH_SIMD8: 3;
    readonly LBVH_SIMD16: 4;
    readonly LBVH_NWAY4: 5;
    readonly LBVH_NWAY8: 6;
    readonly LBVH_NWAY16: 7;
};
export declare const BvhType: {
    readonly Default: -1;
    readonly HKDtree: 0;
    readonly LBVH: 1;
    readonly LBVH_SIMD4: 2;
    readonly LBVH_SIMD8: 3;
    readonly LBVH_SIMD16: 4;
    readonly LBVH_NWAY4: 5;
    readonly LBVH_NWAY8: 6;
    readonly LBVH_NWAY16: 7;
};
export type BvhTypeValue = (typeof BVHType)[keyof typeof BVHType];
export type BVHTypeValue = BvhTypeValue;
export declare class SoundMesh implements Disposable {
    private readonly b;
    private readonly h;
    readonly id: number;
    private _disposed;
    private updateVertsPtr;
    private updateVertsBytes;
    /** @inheritdoc */
    get disposed(): boolean;
    /** @internal — construct via `SoundTrace.createMesh()`. */
    constructor(b: Bindings, h: Heap);
    /**
     * Set mesh geometry.
     * @param vertices flat float32 array — length = numVerts * 3 (xyz xyz ...)
     * @param triangles per-triangle records { a, b, c, materialIndex }
     */
    setData(vertices: ArrayLike<number>, triangles: ArrayLike<Triangle>, opts?: MeshBuildOptions): boolean;
    updateVertices(vertices: ArrayLike<number>): boolean;
    updateVerticesAndRefit(vertices: ArrayLike<number>): boolean;
    refit(): boolean;
    setMaterial(materialIndex: number): boolean;
    setMaterialRange(triStart: number, triCount: number, materialIndex: number): boolean;
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
    getBVHWireframe(): Float32Array | null;
    /** Intersect a ray against meshes registered in the given scene. */
    intersect(sceneID: number, ray: Ray): RayHit | null;
    /** @inheritdoc */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
}
//# sourceMappingURL=SoundMesh.d.ts.map