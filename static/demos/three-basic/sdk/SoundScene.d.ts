import type { Bindings, Heap } from './native/index.js';
import type { SoundCollider } from './SoundCollider.js';
import type { Disposable } from './Disposable.js';
import type { SoundListener } from './SoundListener.js';
type SceneObjectRef = {
    readonly id: number;
};
type SceneSourceRef = {
    readonly id: number;
};
export declare class SoundScene implements Disposable {
    private readonly b;
    private readonly h;
    readonly id: number;
    private _disposed;
    private listener;
    /** @inheritdoc */
    get disposed(): boolean;
    /** @internal — construct via `SoundTrace.createScene()`. */
    constructor(b: Bindings, h: Heap);
    addObject(obj: SceneObjectRef): this;
    removeObject(obj: SceneObjectRef): this;
    clearObjects(): boolean;
    getObjectCount(): number;
    addSource(src: SceneSourceRef): this;
    removeSource(src: SceneSourceRef): this;
    clearSources(): boolean;
    getSourceCount(): number;
    addListener(l: SoundListener): this;
    setListener(l: SoundListener): this;
    removeListener(l: SoundListener): this;
    clearListeners(): boolean;
    getListenerCount(): number;
    tick(dt: number): this;
    updatePropagation(): number;
    update(dt: number): number;
    addCollider(collider: SoundCollider): this;
    removeCollider(collider: SoundCollider): this;
    /** @inheritdoc */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
}
export {};
//# sourceMappingURL=SoundScene.d.ts.map