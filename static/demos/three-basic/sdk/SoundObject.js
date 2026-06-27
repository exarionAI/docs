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
        this.id = b.exaNewObject();
    }
    // --- transform (set) ---
    setPosition(x, y, z) {
        this.b.exaObjectSetPosition(this.id, x, y, z);
        return this;
    }
    setRotationQuat(qx, qy, qz, qw) {
        this.b.exaObjectSetRotation(this.id, qx, qy, qz, qw);
        return this;
    }
    setScale(sx, sy, sz) {
        this.b.exaObjectSetScale(this.id, sx, sy, sz);
        return this;
    }
    setMesh(meshID) {
        this.b.exaObjectSetMesh(this.id, meshID);
        return this;
    }
    // --- update policy ---
    setUpdateType(t) { return this.b.exaObjectSetUpdateType(this.id, t); }
    getUpdateType() { return this.b.exaObjectgetUpdateType(this.id); }
    setDynamic(enabled = true) {
        this.setUpdateType(enabled ? UpdateType.Dynamic : UpdateType.Static);
        return this;
    }
    isDynamic() { return this.getUpdateType() === UpdateType.Dynamic; }
    // --- transform (get) ---
    getPosition() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            this.b.exaObjectGetPosition(this.id, x, y, z);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    getRotationQuat() {
        return this.h.withScope(s => {
            const qx = s.f32(), qy = s.f32(), qz = s.f32(), qw = s.f32();
            this.b.exaObjectGetRotation(this.id, qx, qy, qz, qw);
            return {
                x: this.h.readF32(qx), y: this.h.readF32(qy),
                z: this.h.readF32(qz), w: this.h.readF32(qw),
            };
        });
    }
    getScale() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            this.b.exaObjectGetScale(this.id, x, y, z);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    getMesh() {
        return this.h.withScope(s => {
            const p = s.i32();
            this.b.exaObjectGetMesh(this.id, p);
            return this.h.readI32(p);
        });
    }
    /** @inheritdoc */
    dispose() {
        if (this._disposed)
            return;
        this.b.exaDeleteObject(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundObject.js.map