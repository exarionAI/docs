import { isOk, requireOk } from '../native/index.js';
export class SoundScene {
    b;
    h;
    id;
    _disposed = false;
    listener = null;
    /** @inheritdoc */
    get disposed() { return this._disposed; }
    /** @internal — construct via `SoundTrace.createScene()`. */
    constructor(b, h) {
        this.b = b;
        this.h = h;
        // v0.7 creator: out-param + ExaResult (the -1 sentinel is gone).
        this.id = h.withScope(s => {
            const p = s.i32();
            requireOk(b.exaSceneCreate(p), 'exaSceneCreate', b.exaGetLastError);
            return h.readI32(p);
        });
    }
    // --- object ---
    addObject(obj) {
        requireOk(this.b.exaSceneAddObject(this.id, obj.id), 'exaSceneAddObject', this.b.exaGetLastError);
        return this;
    }
    removeObject(obj) {
        requireOk(this.b.exaSceneRemoveObject(this.id, obj.id), 'exaSceneRemoveObject', this.b.exaGetLastError);
        return this;
    }
    clearObjects() { return isOk(this.b.exaSceneClearObjects(this.id)); }
    getObjectCount() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaSceneGetObjectCount(this.id, p), 'exaSceneGetObjectCount', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    // --- source ---
    addSource(src) {
        requireOk(this.b.exaSceneAddSource(this.id, src.id), 'exaSceneAddSource', this.b.exaGetLastError);
        return this;
    }
    removeSource(src) {
        requireOk(this.b.exaSceneRemoveSource(this.id, src.id), 'exaSceneRemoveSource', this.b.exaGetLastError);
        return this;
    }
    clearSources() { return isOk(this.b.exaSceneClearSources(this.id)); }
    getSourceCount() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaSceneGetSourceCount(this.id, p), 'exaSceneGetSourceCount', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    // --- listener ---
    addListener(l) {
        if (this.listener?.id === l.id)
            return this;
        if (this.listener || this.getListenerCount() > 0) {
            throw new Error('[soundtrace.js] SoundScene supports one listener; use setListener() to replace it');
        }
        requireOk(this.b.exaSceneAddListener(this.id, l.id), 'exaSceneAddListener', this.b.exaGetLastError);
        this.listener = l;
        return this;
    }
    setListener(l) {
        if (this.listener?.id === l.id)
            return this;
        this.clearListeners();
        requireOk(this.b.exaSceneAddListener(this.id, l.id), 'exaSceneAddListener', this.b.exaGetLastError);
        this.listener = l;
        return this;
    }
    removeListener(l) {
        requireOk(this.b.exaSceneRemoveListener(this.id, l.id), 'exaSceneRemoveListener', this.b.exaGetLastError);
        if (this.listener?.id === l.id)
            this.listener = null;
        return this;
    }
    clearListeners() {
        const ok = isOk(this.b.exaSceneClearListeners(this.id));
        if (ok)
            this.listener = null;
        return ok;
    }
    getListenerCount() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaSceneGetListenerCount(this.id, p), 'exaSceneGetListenerCount', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    // --- simulation ---
    postGeometryUpdateOnce = [];
    /** @internal Run `callback` once, right after the next updateGeometry() —
     *  i.e. after the core consumed the per-object one-shot update types
     *  (Refit/Rebuild reset the object to Static inside the tick). Used by
     *  SoundCollider to re-arm a Dynamic policy the one-shot displaced
     *  (finding #4). */
    afterNextGeometryUpdate(callback) {
        this.postGeometryUpdateOnce.push(callback);
    }
    /** Refresh the scene geometry acceleration structure (TLAS) after object /
     *  mesh changes. Call once per frame, before updatePropagation(). */
    updateGeometry() {
        requireOk(this.b.exaSceneUpdateGeometry(this.id), 'exaSceneUpdateGeometry', this.b.exaGetLastError);
        if (this.postGeometryUpdateOnce.length > 0) {
            const callbacks = this.postGeometryUpdateOnce.splice(0, this.postGeometryUpdateOnce.length);
            for (const callback of callbacks)
                callback();
        }
        return this;
    }
    /** @deprecated v0.7 renamed exaTickScene to exaSceneUpdateGeometry and
     *  dropped the (always-discarded) deltaTime. Use updateGeometry(). */
    tick(_dt = 0) { return this.updateGeometry(); }
    /** Run propagation; returns the valid path count (on the wasm mt build the
     *  call is async and the count reports the previous completed frame). */
    updatePropagation() {
        return this.h.withScope(s => {
            const countPtr = s.i32();
            requireOk(this.b.exaScenePropagate(this.id, countPtr), 'exaScenePropagate', this.b.exaGetLastError);
            return this.h.readI32(countPtr);
        });
    }
    update(dt = 0) {
        this.tick(dt);
        return this.updatePropagation();
    }
    // --- colliders ---
    addCollider(collider) { collider.attach(this); return this; }
    removeCollider(collider) { collider.detach(this); return this; }
    /** @inheritdoc */
    dispose() {
        if (this._disposed)
            return;
        this.b.exaSceneDestroy(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundScene.js.map