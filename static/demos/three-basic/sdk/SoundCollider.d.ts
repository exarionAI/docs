import { SoundMesh, type MeshBuildOptions } from './SoundMesh.js';
import { SoundObject } from './SoundObject.js';
import type { SoundScene } from './SoundScene.js';
import type { Bindings, Heap, Triangle } from './native/index.js';
import type { Disposable } from './Disposable.js';
export interface SoundColliderBuildOptions extends MeshBuildOptions {
    vertices?: ArrayLike<number>;
    triangles?: ArrayLike<Triangle>;
    dynamic?: boolean;
}
/** Scene collider composed of one native SoundObject and one native SoundMesh. */
export declare class SoundCollider implements Disposable {
    readonly mesh: SoundMesh;
    readonly object: SoundObject;
    private scene;
    private _disposed;
    /** @internal - construct via `SoundTrace.createCollider()`. */
    constructor(b: Bindings, h: Heap, opts?: SoundColliderBuildOptions);
    get id(): number;
    get meshId(): number;
    get disposed(): boolean;
    attach(scene: SoundScene): this;
    detach(scene?: SoundScene): this;
    rebuild(vertices: ArrayLike<number>, triangles: ArrayLike<Triangle>, opts?: MeshBuildOptions): boolean;
    refitVertices(vertices: ArrayLike<number>): boolean;
    setUpdateType(t: number): boolean;
    setDynamic(enabled?: boolean): this;
    isDynamic(): boolean;
    dispose(): void;
    [Symbol.dispose](): void;
    private assertLive;
}
//# sourceMappingURL=SoundCollider.d.ts.map