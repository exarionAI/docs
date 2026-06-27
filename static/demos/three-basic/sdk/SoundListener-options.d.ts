export declare const HrtfMode: {
    readonly Parametric: 1;
    readonly Convolution: 2;
};
export type HrtfMode = (typeof HrtfMode)[keyof typeof HrtfMode];
export declare const HrtfModeName: {
    readonly Parametric: "parametric";
    readonly Convolution: "convolution";
};
export type HrtfModeName = (typeof HrtfModeName)[keyof typeof HrtfModeName];
export declare const HrtfQuality: {
    readonly Low: 0;
    readonly Medium: 1;
    readonly High: 2;
};
export type HrtfQuality = (typeof HrtfQuality)[keyof typeof HrtfQuality];
export declare const DiffuseQuality: {
    readonly Low: 0;
    readonly Medium: 1;
    readonly High: 2;
};
export type DiffuseQuality = (typeof DiffuseQuality)[keyof typeof DiffuseQuality];
export declare const LateReverbMode: {
    readonly OnePole: 0;
    readonly Tilt: 1;
    readonly EightBand: 2;
};
export type LateReverbMode = (typeof LateReverbMode)[keyof typeof LateReverbMode];
export declare const DelayInterpolation: {
    readonly Linear: 0;
    readonly CubicLagrange: 1;
    readonly Lagrange6: 2;
};
export type DelayInterpolation = (typeof DelayInterpolation)[keyof typeof DelayInterpolation];
export declare function isSupportedHrtfMode(value: number): value is HrtfMode;
export declare function isHrtfQuality(value: number): value is HrtfQuality;
export declare function isDiffuseQuality(value: number): value is DiffuseQuality;
export declare function isLateReverbMode(value: number): value is LateReverbMode;
export declare function isDelayInterpolation(value: number): value is DelayInterpolation;
//# sourceMappingURL=SoundListener-options.d.ts.map