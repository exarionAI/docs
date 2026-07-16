import { isOk, requireOk } from '../native/index.js';
/**
 * Per-object update policy consumed by `SoundScene.updateGeometry()`.
 *
 * Mirrors the public EXA_OBJECT_UPDATE_* values (exaSoundC.h, audit D-23).
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
    Static: 0,
    Refit: 1,
    Rebuild: 2,
    Dynamic: 3,
};
export class SoundObject {
    b;
    h;
    id;
    _disposed = false;
    /** @inheritdoc */
    get disposed() { return this._disposed; }
    /** @internal — construct via `SoundTrace.createObject()`. */
    constructor(b, h) {
        this.b = b;
        this.h = h;
        this.id = h.withScope(s => {
            const p = s.i32();
            requireOk(b.exaObjectCreate(p), 'exaObjectCreate', b.exaGetLastError);
            return h.readI32(p);
        });
    }
    // --- transform (set) ---
    setPosition(x, y, z) {
        requireOk(this.b.exaObjectSetPosition(this.id, x, y, z), 'exaObjectSetPosition', this.b.exaGetLastError);
        return this;
    }
    setRotationQuat(qx, qy, qz, qw) {
        // v0.7: exaObjectSetOrientation (Rotation -> Orientation rename).
        requireOk(this.b.exaObjectSetOrientation(this.id, qx, qy, qz, qw), 'exaObjectSetOrientation', this.b.exaGetLastError);
        return this;
    }
    setScale(sx, sy, sz) {
        requireOk(this.b.exaObjectSetScale(this.id, sx, sy, sz), 'exaObjectSetScale', this.b.exaGetLastError);
        return this;
    }
    setMesh(meshID) {
        requireOk(this.b.exaObjectSetMesh(this.id, meshID), 'exaObjectSetMesh', this.b.exaGetLastError);
        return this;
    }
    // --- update policy ---
    setUpdateType(t) { return isOk(this.b.exaObjectSetUpdateType(this.id, t)); }
    getUpdateType() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaObjectGetUpdateType(this.id, p), 'exaObjectGetUpdateType', this.b.exaGetLastError);
            return this.h.readI32(p);
        });
    }
    setDynamic(enabled = true) {
        this.setUpdateType(enabled ? UpdateType.Dynamic : UpdateType.Static);
        return this;
    }
    isDynamic() { return this.getUpdateType() === UpdateType.Dynamic; }
    // --- transform (get) ---
    getPosition() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            requireOk(this.b.exaObjectGetPosition(this.id, x, y, z), 'exaObjectGetPosition', this.b.exaGetLastError);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    getRotationQuat() {
        return this.h.withScope(s => {
            const qx = s.f32(), qy = s.f32(), qz = s.f32(), qw = s.f32();
            requireOk(this.b.exaObjectGetOrientation(this.id, qx, qy, qz, qw), 'exaObjectGetOrientation', this.b.exaGetLastError);
            return {
                x: this.h.readF32(qx), y: this.h.readF32(qy),
                z: this.h.readF32(qz), w: this.h.readF32(qw),
            };
        });
    }
    getScale() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            requireOk(this.b.exaObjectGetScale(this.id, x, y, z), 'exaObjectGetScale', this.b.exaGetLastError);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    /** Attached mesh id, or 0 when no mesh is attached (ExaMeshId{0}). */
    getMesh() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaObjectGetMesh(this.id, p), 'exaObjectGetMesh', this.b.exaGetLastError);
            return this.h.readI32(p);
        });
    }
    /** @inheritdoc */
    dispose() {
        if (this._disposed)
            return;
        this.b.exaObjectDestroy(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundObject.js.map