import type { STOption } from './native-public.js';
import type { ListenerNativeLike, SourceNativeLike } from './facade-native-types.js';
export type QualityTier = 'fast' | 'middle' | 'quality' | 'speed' | 'balanced';
export type ListenerHrtfQuality = 'low' | 'medium' | 'high';
export type ListenerDiffuseQuality = 'low' | 'medium' | 'high';
export type ListenerLateReverbMode = 'one-pole' | 'tilt' | 'eight-band';
export type ListenerDelayInterpolation = 'linear' | 'cubic-lagrange' | 'lagrange6';
export type ObjectUpdateType = 'static' | 'refit' | 'rebuild' | 'dynamic';
export type SourcePathType = 'direct' | 'reflection' | 'reverberation' | 'diffraction';
export interface SourcePathOptions {
    readonly direct?: boolean;
    readonly reflection?: boolean;
    readonly reverberation?: boolean;
    readonly diffraction?: boolean;
}
export interface ListenerRenderOptions {
    readonly hrtfQuality?: ListenerHrtfQuality;
    readonly diffuseEnabled?: boolean;
    readonly diffuseQuality?: ListenerDiffuseQuality;
    readonly lateReverbMode?: ListenerLateReverbMode;
    readonly perBandLateReverb?: boolean;
    readonly delayInterpolation?: ListenerDelayInterpolation;
    /** Cap the early (direct + reflection) paths rendered per audio block to the
     *  N loudest. Bounds audio-thread render cost (which spikes on a moving
     *  source); the direct path is always kept. 0 = unbounded (default). */
    readonly earlyRenderPathBudget?: number;
}
export declare function qualityPreset(tier: QualityTier): STOption;
export declare function qualityRenderOptions(tier: QualityTier): ListenerRenderOptions;
export declare function objectUpdateTypeValue(type: ObjectUpdateType): number;
export declare function objectUpdateTypeName(value: number): ObjectUpdateType;
export declare function sourcePathTypeValue(path: SourcePathType): number;
export declare function applySourcePathOptions(native: SourceNativeLike, options: SourcePathOptions): void;
export declare function applyListenerRenderOptions(native: ListenerNativeLike, options: ListenerRenderOptions): void;
export declare function applyQualityRenderOptions(native: ListenerNativeLike, tier: QualityTier): void;
/** The BVH the facade builds every mesh with. Fixed and NOT exposed as an option
 *  for now — EXP-0002 measured LBVH_SIMD4 faster than scalar LBVH with full path
 *  parity. This single line is the one place to retarget it. Advanced callers who
 *  need a different BVH use the native createMesh()/setData() path. */
export declare const FACADE_BVH: 2;
//# sourceMappingURL=facade-options.d.ts.map