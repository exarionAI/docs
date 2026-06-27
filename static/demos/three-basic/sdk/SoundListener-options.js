export const HrtfMode = {
    Parametric: 1,
    Convolution: 2,
};
export const HrtfModeName = {
    Parametric: 'parametric',
    Convolution: 'convolution',
};
export const HrtfQuality = {
    Low: 0,
    Medium: 1,
    High: 2,
};
export const DiffuseQuality = {
    Low: 0,
    Medium: 1,
    High: 2,
};
export const LateReverbMode = {
    OnePole: 0,
    Tilt: 1,
    EightBand: 2,
};
export const DelayInterpolation = {
    Linear: 0,
    CubicLagrange: 1,
    Lagrange6: 2,
};
export function isSupportedHrtfMode(value) {
    return value === HrtfMode.Parametric || value === HrtfMode.Convolution;
}
export function isHrtfQuality(value) {
    return value === HrtfQuality.Low || value === HrtfQuality.Medium || value === HrtfQuality.High;
}
export function isDiffuseQuality(value) {
    return value === DiffuseQuality.Low || value === DiffuseQuality.Medium || value === DiffuseQuality.High;
}
export function isLateReverbMode(value) {
    return value === LateReverbMode.OnePole || value === LateReverbMode.Tilt || value === LateReverbMode.EightBand;
}
export function isDelayInterpolation(value) {
    return value === DelayInterpolation.Linear
        || value === DelayInterpolation.CubicLagrange
        || value === DelayInterpolation.Lagrange6;
}
//# sourceMappingURL=SoundListener-options.js.map