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
        this.id = b.exaNewScene();
    }
    // --- object ---
    addObject(obj) { this.b.exaSceneAddObject(this.id, obj.id); return this; }
    removeObject(obj) { this.b.exaSceneRemoveObject(this.id, obj.id); return this; }
    clearObjects() { return this.b.exaSceneClearObjects(this.id); }
    getObjectCount() { return this.b.exaSceneGetObjectCount(this.id); }
    // --- source ---
    addSource(src) { this.b.exaSceneAddSource(this.id, src.id); return this; }
    removeSource(src) { this.b.exaSceneRemoveSource(this.id, src.id); return this; }
    clearSources() { return this.b.exaSceneClearSources(this.id); }
    getSourceCount() {
        return this.h.withScope(s => {
            const p = s.u32();
            this.b.exaSceneGetSourceCount(this.id, p);
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
        this.b.exaSceneAddListener(this.id, l.id);
        this.listener = l;
        return this;
    }
    setListener(l) {
        if (this.listener?.id === l.id)
            return this;
        this.clearListeners();
        this.b.exaSceneAddListener(this.id, l.id);
        this.listener = l;
        return this;
    }
    removeListener(l) {
        this.b.exaSceneRemoveListener(this.id, l.id);
        if (this.listener?.id === l.id)
            this.listener = null;
        return this;
    }
    clearListeners() {
        const ok = this.b.exaSceneClearListeners(this.id);
        if (ok)
            this.listener = null;
        return ok;
    }
    getListenerCount() {
        return this.h.withScope(s => {
            const p = s.u32();
            this.b.exaSceneGetListenerCount(this.id, p);
            return this.h.readU32(p);
        });
    }
    // --- simulation ---
    tick(dt) { this.b.exaTickScene(this.id, dt); return this; }
    updatePropagation() { return this.b.exaUpdatePropagation(this.id); }
    update(dt) {
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
        this.b.exaDeleteScene(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundScene.js.map