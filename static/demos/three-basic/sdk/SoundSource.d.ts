import type { Bindings, Heap, Vec3 } from './native/index.js';
import type { Disposable } from './Disposable.js';
/** Path type constants used by `exaSoundSourceGetDistanceAttenuation(id, pathType, ...)` etc.
 *  Mirrors the engine enum (`config/exa_enum.h::PathFlag::Type`). All five
 *  types — including transmission — accept their own distance-attenuation
 *  curve. exaStudio's ECS_AudioSTComponent also sets all five explicitly. */
export declare const PathType: {
    readonly Direct: 0;
    readonly Reflection: 1;
    readonly Diffraction: 2;
    readonly Reverb: 3;
    readonly Transmission: 4;
};
export type PathTypeValue = (typeof PathType)[keyof typeof PathType];
export interface DistanceAttenuations {
    direct: Vec3;
    reflection: Vec3;
    diffraction: Vec3;
    reverb: Vec3;
}
export declare class SoundSource implements Disposable {
    private readonly b;
    private readonly h;
    readonly id: number;
    private _disposed;
    /** @inheritdoc */
    get disposed(): boolean;
    /** @internal — construct via `SoundTrace.createSource()`. */
    constructor(b: Bindings, h: Heap);
    setPosition(x: number, y: number, z: number): this;
    getPosition(): Vec3;
    setDirection(x: number, y: number, z: number): this;
    getDirection(): Vec3;
    setVelocity(x: number, y: number, z: number): this;
    getVelocity(): Vec3;
    setIntensity(v: number): this;
    getIntensity(): number;
    setGainBoostDb(db: number): this;
    getGainBoostDb(): number;
    setReverbSendDb(db: number): this;
    getReverbSendDb(): number;
    setReflectionSendDb(db: number): this;
    getReflectionSendDb(): number;
    setPathEnable(pathType: PathTypeValue, enabled: boolean): this;
    isPathEnabled(pathType: PathTypeValue): boolean;
    setAmbientEnabled(enabled: boolean): this;
    getAmbientEnabled(): boolean;
    setDepth(depth: number): this;
    getDepth(): number;
    getDepthOk(): boolean;
    setRayCount(w: number, h: number): this;
    getRayCount(): {
        width: number;
        height: number;
    };
    setReverbRayCount(width: number, height: number): this;
    getReverbRayCount(): {
        width: number;
        height: number;
    };
    setReverbRayDepth(depth: number): this;
    getReverbRayDepth(): number;
    getDistanceAttenuation(pathType: PathTypeValue): Vec3;
    setDistanceAttenuation(pathType: PathTypeValue, v: Vec3): this;
    /** Set all four path-type attenuations (direct / reflection / diffraction / reverb) in one call. */
    setAllDistanceAttenuations(direct: Vec3, reflection: Vec3, diffraction: Vec3, reverb: Vec3): this;
    getAllDistanceAttenuations(): DistanceAttenuations;
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
}
//# sourceMappingURL=SoundSource.d.ts.map