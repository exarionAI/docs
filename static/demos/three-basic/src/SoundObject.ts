import type { Bindings, Heap, Vec3 } from './native/index.js';
import type { Disposable } from './Disposable.js';

export interface Quat { x: number; y: number; z: number; w: number }

/**
 * Per-object update policy consumed by `SoundScene.tick()`.
 *
 * Mirrors `STCoreV2/exaSound/src/scene/SoundObject/SoundObject.h::eUpdateType`.
 *
 * `Static` stores transform setter values but does not refresh the scene
 * acceleration structure. Use `Dynamic` for objects whose transform changes at
 * runtime, `Refit` for mesh-local vertex deformation, and `Rebuild` for
 * topology/BLAS replacement.
 *
 * Set `Rebuild` after every `SoundMesh.setData()` call so the TLAS re-reads
 * the rebuilt BLAS pointer.
 */
export const UpdateType = {
  Static:  0,
  Refit:   1,
  Rebuild: 2,
  Dynamic: 3,
} as const;
export type UpdateTypeValue = (typeof UpdateType)[keyof typeof UpdateType];

export class SoundObject implements Disposable {
  private readonly b: Bindings;
  private readonly h: Heap;
  readonly id: number;
  private _disposed = false;
  /** @inheritdoc */
  get disposed(): boolean { return this._disposed; }

  /** @internal — construct via `SoundTrace.createObject()`. */
  constructor(b: Bindings, h: Heap) {
    this.b = b;
    this.h = h;
    this.id = b.exaNewObject();
  }

  // --- transform (set) ---
  setPosition(x: number, y: number, z: number): this {
    this.b.exaObjectSetPosition(this.id, x, y, z);
    return this;
  }
  setRotationQuat(qx: number, qy: number, qz: number, qw: number): this {
    this.b.exaObjectSetRotation(this.id, qx, qy, qz, qw);
    return this;
  }
  setScale(sx: number, sy: number, sz: number): this {
    this.b.exaObjectSetScale(this.id, sx, sy, sz);
    return this;
  }
  setMesh(meshID: number): this {
    this.b.exaObjectSetMesh(this.id, meshID);
    return this;
  }

  // --- update policy ---
  setUpdateType(t: number): boolean { return this.b.exaObjectSetUpdateType(this.id, t); }
  getUpdateType(): number { return this.b.exaObjectgetUpdateType(this.id); }
  setDynamic(enabled = true): this {
    this.setUpdateType(enabled ? UpdateType.Dynamic : UpdateType.Static);
    return this;
  }
  isDynamic(): boolean { return this.getUpdateType() === UpdateType.Dynamic; }

  // --- transform (get) ---
  getPosition(): Vec3 {
    return this.h.withScope(s => {
      const x = s.f32(), y = s.f32(), z = s.f32();
      this.b.exaObjectGetPosition(this.id, x, y, z);
      return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
    });
  }
  getRotationQuat(): Quat {
    return this.h.withScope(s => {
      const qx = s.f32(), qy = s.f32(), qz = s.f32(), qw = s.f32();
      this.b.exaObjectGetRotation(this.id, qx, qy, qz, qw);
      return {
        x: this.h.readF32(qx), y: this.h.readF32(qy),
        z: this.h.readF32(qz), w: this.h.readF32(qw),
      };
    });
  }
  getScale(): Vec3 {
    return this.h.withScope(s => {
      const x = s.f32(), y = s.f32(), z = s.f32();
      this.b.exaObjectGetScale(this.id, x, y, z);
      return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
    });
  }
  getMesh(): number {
    return this.h.withScope(s => {
      const p = s.i32();
      this.b.exaObjectGetMesh(this.id, p);
      return this.h.readI32(p);
    });
  }

  /** @inheritdoc */
  dispose(): void {
    if (this._disposed) return;
    this.b.exaDeleteObject(this.id);
    this._disposed = true;
  }
  /** @inheritdoc */
  [Symbol.dispose](): void { this.dispose(); }
}
