import { DelayInterpolation, DiffusePathBudget, HrtfPathBudget } from '../engine/SoundListener.js';
export function cloneTupleVec3(value) {
    return { x: value[0], y: value[1], z: value[2] };
}
export function defaultPathOptions(overrides) {
    return {
        direct: overrides?.direct ?? true,
        reflection: overrides?.reflection ?? true,
        reverberation: overrides?.reverberation ?? true,
        diffraction: overrides?.diffraction ?? true,
    };
}
export function defaultAudioOption(sampleRate) {
    return { sampleRate, inputSampleCount: 128, outputChannels: 2 };
}
export function resolveListenerRenderCache(tier) {
    // v0.7: the LOW/MED/HIGH quality enums became RAW path budgets — the tier
    // mapping uses the documented operating points (the same internal values the
    // old levels resolved to).
    switch (tier) {
        case 'fast':
        case 'speed':
            return {
                hrtfPathBudget: HrtfPathBudget.Low,
                diffuseEnabled: false,
                diffusePathBudget: DiffusePathBudget.Low,
                delayInterpolation: DelayInterpolation.Linear,
                earlyRenderPathBudget: 128,
            };
        case 'middle':
        case 'balanced':
            return {
                hrtfPathBudget: HrtfPathBudget.Medium,
                diffuseEnabled: true,
                diffusePathBudget: DiffusePathBudget.Medium,
                delayInterpolation: DelayInterpolation.CubicLagrange,
                earlyRenderPathBudget: 128,
            };
        case 'quality':
            return {
                hrtfPathBudget: HrtfPathBudget.High,
                diffuseEnabled: true,
                diffusePathBudget: DiffusePathBudget.High,
                delayInterpolation: DelayInterpolation.Lagrange6,
                earlyRenderPathBudget: 128,
            };
        default:
            throw new Error(`[soundtrace.js] unknown quality tier: ${tier}`);
    }
}
//# sourceMappingURL=soundtrace-mt-facade-defaults.js.map