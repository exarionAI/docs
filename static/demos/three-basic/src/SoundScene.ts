import type { Bindings, Heap } from './native/index.js';
import type { SoundCollider } from './SoundCollider.js';
import type { Disposable } from './Disposable.js';
import type { SoundListener } from './SoundListener.js';

type SceneObjectRef = { readonly id: number };
type SceneSourceRef = { readonly id: number };

export class SoundScene implements Disposable {
  private readonly b: Bindings;
  private readonly h: Heap;
  readonly id: number;
  private _disposed = false;
  private listener: SoundListener | null = null;
  /** @inheritdoc */
  get disposed(): boolean { return this._disposed; }

  /** @internal — construct via `SoundTrace.createScene()`. */
  constructor(b: Bindings, h: Heap) {
    this.b = b;
    this.h = h;
    this.id = b.exaNewScene();
  }

  // --- object ---
  addObject(obj: SceneObjectRef): this { this.b.exaSceneAddObject(this.id, obj.id); return this; }
  removeObject(obj: SceneObjectRef): this { this.b.exaSceneRemoveObject(this.id, obj.id); return this; }
  clearObjects(): boolean { return this.b.exaSceneClearObjects(this.id); }
  getObjectCount(): number { return this.b.exaSceneGetObjectCount(this.id); }

  // --- source ---
  addSource(src: SceneSourceRef): this { this.b.exaSceneAddSource(this.id, src.id); return this; }
  removeSource(src: SceneSourceRef): this { this.b.exaSceneRemoveSource(this.id, src.id); return this; }
  clearSources(): boolean { return this.b.exaSceneClearSources(this.id); }
  getSourceCount(): number {
    return this.h.withScope(s => {
      const p = s.u32();
      this.b.exaSceneGetSourceCount(this.id, p);
      return this.h.readU32(p);
    });
  }

  // --- listener ---
  addListener(l: SoundListener): this {
    if (this.listener?.id === l.id) return this;
    if (this.listener || this.getListenerCount() > 0) {
      throw new Error('[soundtrace.js] SoundScene supports one listener; use setListener() to replace it');
    }
    this.b.exaSceneAddListener(this.id, l.id);
    this.listener = l;
    return this;
  }
  setListener(l: SoundListener): this {
    if (this.listener?.id === l.id) return this;
    this.clearListeners();
    this.b.exaSceneAddListener(this.id, l.id);
    this.listener = l;
    return this;
  }
  removeListener(l: SoundListener): this {
    this.b.exaSceneRemoveListener(this.id, l.id);
    if (this.listener?.id === l.id) this.listener = null;
    return this;
  }
  clearListeners(): boolean {
    const ok = this.b.exaSceneClearListeners(this.id);
    if (ok) this.listener = null;
    return ok;
  }
  getListenerCount(): number {
    return this.h.withScope(s => {
      const p = s.u32();
      this.b.exaSceneGetListenerCount(this.id, p);
      return this.h.readU32(p);
    });
  }

  // --- simulation ---
  tick(dt: number): this { this.b.exaTickScene(this.id, dt); return this; }
  updatePropagation(): number { return this.b.exaUpdatePropagation(this.id); }
  update(dt: number): number {
    this.tick(dt);
    return this.updatePropagation();
  }

  // --- colliders ---
  addCollider(collider: SoundCollider): this { collider.attach(this); return this; }
  removeCollider(collider: SoundCollider): this { collider.detach(this); return this; }

  /** @inheritdoc */
  dispose(): void {
    if (this._disposed) return;
    this.b.exaDeleteScene(this.id);
    this._disposed = true;
  }
  /** @inheritdoc */
  [Symbol.dispose](): void { this.dispose(); }
}
