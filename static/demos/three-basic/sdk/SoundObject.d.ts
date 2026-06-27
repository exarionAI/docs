import type { Bindings, Heap, Vec3 } from './native/index.js';
import type { Disposable } from './Disposable.js';
export interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}
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
export declare const UpdateType: {
    readonly Static: 0;
    readonly Refit: 1;
    readonly Rebuild: 2;
    readonly Dynamic: 3;
};
export type UpdateTypeValue = (typeof UpdateType)[keyof typeof UpdateType];
export declare class SoundObject implements Disposable {
    private readonly b;
    private readonly h;
    readonly id: number;
    private _disposed;
    /** @inheritdoc */
    get disposed(): boolean;
    /** @internal — construct via `SoundTrace.createObject()`. */
    constructor(b: Bindings, h: Heap);
    setPosition(x: number, y: number, z: number): this;
    setRotationQuat(qx: number, qy: number, qz: number, qw: number): this;
    setScale(sx: number, sy: number, sz: number): this;
    setMesh(meshID: number): this;
    setUpdateType(t: number): boolean;
    getUpdateType(): number;
    setDynamic(enabled?: boolean): this;
    isDynamic(): boolean;
    getPosition(): Vec3;
    getRotationQuat(): Quat;
    getScale(): Vec3;
    getMesh(): number;
    /** @inheritdoc */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
}
//# sourceMappingURL=SoundObject.d.ts.map