import { SoundMesh } from './SoundMesh.js';
import { SoundObject, UpdateType } from './SoundObject.js';
/** Scene collider composed of one native SoundObject and one native SoundMesh. */
export class SoundCollider {
    mesh;
    object;
    scene = null;
    _disposed = false;
    /** @internal - construct via `SoundTrace.createCollider()`. */
    constructor(b, h, opts = {}) {
        this.mesh = new SoundMesh(b, h);
        this.object = new SoundObject(b, h).setMesh(this.mesh.id);
        if (opts.vertices && opts.triangles) {
            this.rebuild(opts.vertices, opts.triangles, opts);
        }
        if (opts.dynamic)
            this.object.setDynamic(true);
    }
    get id() { return this.object.id; }
    get meshId() { return this.mesh.id; }
    get disposed() { return this._disposed; }
    attach(scene) {
        this.assertLive();
        if (this.scene === scene)
            return this;
        this.detach();
        scene.addObject(this.object);
        this.scene = scene;
        return this;
    }
    detach(scene) {
        if (scene && this.scene !== scene)
            return this;
        if (this.scene) {
            this.scene.removeObject(this.object);
            this.scene = null;
        }
        return this;
    }
    rebuild(vertices, triangles, opts = {}) {
        this.assertLive();
        const ok = this.mesh.setData(vertices, triangles, opts);
        if (ok)
            this.object.setUpdateType(UpdateType.Rebuild);
        return ok;
    }
    refitVertices(vertices) {
        this.assertLive();
        const ok = this.mesh.updateVerticesAndRefit(vertices);
        if (ok)
            this.object.setUpdateType(UpdateType.Refit);
        return ok;
    }
    setUpdateType(t) {
        this.assertLive();
        return this.object.setUpdateType(t);
    }
    setDynamic(enabled = true) {
        this.assertLive();
        this.object.setDynamic(enabled);
        return this;
    }
    isDynamic() {
        this.assertLive();
        return this.object.isDynamic();
    }
    dispose() {
        if (this._disposed)
            return;
        this.detach();
        this.object.dispose();
        this.mesh.dispose();
        this._disposed = true;
    }
    [Symbol.dispose]() { this.dispose(); }
    assertLive() {
        if (this._disposed)
            throw new Error('[soundtrace.js] SoundCollider is disposed');
    }
}
//# sourceMappingURL=SoundCollider.js.map