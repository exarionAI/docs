import { SoundMesh } from './SoundMesh.js';
import { SoundObject, UpdateType } from './SoundObject.js';
/** Scene collider composed of one native SoundObject and one native SoundMesh. */
export class SoundCollider {
    mesh;
    object;
    scene = null;
    _disposed = false;
    /** The caller's standing update policy. Refit/Rebuild are one-shots the
     *  core consumes and replaces with STATIC (SoundScene.cpp
     *  updateDirtyObjects) — without this memory a dynamic collider that ever
     *  rebuilt or refit froze in the TLAS for good (finding #4). */
    dynamicIntent = false;
    /** @internal - construct via `SoundTrace.createCollider()`. */
    constructor(b, h, opts = {}) {
        this.mesh = new SoundMesh(b, h);
        this.object = new SoundObject(b, h).setMesh(this.mesh.id);
        this.dynamicIntent = opts.dynamic === true;
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
        if (ok) {
            this.object.setUpdateType(UpdateType.Rebuild);
            this.rearmDynamicIntent();
        }
        return ok;
    }
    refitVertices(vertices) {
        this.assertLive();
        const ok = this.mesh.updateVerticesAndRefit(vertices);
        if (ok) {
            this.object.setUpdateType(UpdateType.Refit);
            this.rearmDynamicIntent();
        }
        return ok;
    }
    setUpdateType(t) {
        this.assertLive();
        // Static/Dynamic express a standing policy; Refit/Rebuild are one-shots
        // and leave the standing intent untouched.
        if (t === UpdateType.Dynamic)
            this.dynamicIntent = true;
        else if (t === UpdateType.Static)
            this.dynamicIntent = false;
        return this.object.setUpdateType(t);
    }
    setDynamic(enabled = true) {
        this.assertLive();
        this.dynamicIntent = enabled;
        this.object.setDynamic(enabled);
        return this;
    }
    /** Re-issue the Dynamic policy a Refit/Rebuild one-shot displaced. Attached:
     *  wait until the scene tick has consumed the one-shot (re-arming earlier
     *  would erase it before the core saw it). Detached: restore immediately —
     *  there is no consumption to wait for, and adding the object to a scene
     *  triggers a TLAS rebuild regardless (objectSetChanged). */
    rearmDynamicIntent() {
        if (!this.dynamicIntent)
            return;
        if (this.scene) {
            this.scene.afterNextGeometryUpdate(() => {
                if (!this._disposed && this.dynamicIntent) {
                    this.object.setUpdateType(UpdateType.Dynamic);
                }
            });
            return;
        }
        this.object.setUpdateType(UpdateType.Dynamic);
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