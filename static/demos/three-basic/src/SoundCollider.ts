import { SoundMesh, type MeshBuildOptions } from './SoundMesh.js';
import { SoundObject, UpdateType } from './SoundObject.js';
import type { SoundScene } from './SoundScene.js';
import type { Bindings, Heap, Triangle } from './native/index.js';
import type { Disposable } from './Disposable.js';

export interface SoundColliderBuildOptions extends MeshBuildOptions {
  vertices?: ArrayLike<number>;
  triangles?: ArrayLike<Triangle>;
  dynamic?: boolean;
}

/** Scene collider composed of one native SoundObject and one native SoundMesh. */
export class SoundCollider implements Disposable {
  readonly mesh: SoundMesh;
  readonly object: SoundObject;
  private scene: SoundScene | null = null;
  private _disposed = false;

  /** @internal - construct via `SoundTrace.createCollider()`. */
  constructor(b: Bindings, h: Heap, opts: SoundColliderBuildOptions = {}) {
    this.mesh = new SoundMesh(b, h);
    this.object = new SoundObject(b, h).setMesh(this.mesh.id);
    if (opts.vertices && opts.triangles) {
      this.rebuild(opts.vertices, opts.triangles, opts);
    }
    if (opts.dynamic) this.object.setDynamic(true);
  }

  get id(): number { return this.object.id; }
  get meshId(): number { return this.mesh.id; }
  get disposed(): boolean { return this._disposed; }

  attach(scene: SoundScene): this {
    this.assertLive();
    if (this.scene === scene) return this;
    this.detach();
    scene.addObject(this.object);
    this.scene = scene;
    return this;
  }

  detach(scene?: SoundScene): this {
    if (scene && this.scene !== scene) return this;
    if (this.scene) {
      this.scene.removeObject(this.object);
      this.scene = null;
    }
    return this;
  }

  rebuild(
    vertices: ArrayLike<number>,
    triangles: ArrayLike<Triangle>,
    opts: MeshBuildOptions = {},
  ): boolean {
    this.assertLive();
    const ok = this.mesh.setData(vertices, triangles, opts);
    if (ok) this.object.setUpdateType(UpdateType.Rebuild);
    return ok;
  }

  refitVertices(vertices: ArrayLike<number>): boolean {
    this.assertLive();
    const ok = this.mesh.updateVerticesAndRefit(vertices);
    if (ok) this.object.setUpdateType(UpdateType.Refit);
    return ok;
  }

  setUpdateType(t: number): boolean {
    this.assertLive();
    return this.object.setUpdateType(t);
  }
  setDynamic(enabled = true): this {
    this.assertLive();
    this.object.setDynamic(enabled);
    return this;
  }
  isDynamic(): boolean {
    this.assertLive();
    return this.object.isDynamic();
  }

  dispose(): void {
    if (this._disposed) return;
    this.detach();
    this.object.dispose();
    this.mesh.dispose();
    this._disposed = true;
  }

  [Symbol.dispose](): void { this.dispose(); }

  private assertLive(): void {
    if (this._disposed) throw new Error('[soundtrace.js] SoundCollider is disposed');
  }
}
