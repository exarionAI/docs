import { PathType } from './SoundSource.js';
import { UpdateType } from './SoundObject.js';
import { BVHType } from './SoundMesh.js';
import { DelayInterpolation, DiffuseQuality, HrtfQuality, LateReverbMode } from './SoundListener.js';
import { speedSTOption, balancedSTOption, qualitySTOption } from './native/structs.js';
const QUALITY_PRESET = {
    fast: speedSTOption,
    middle: balancedSTOption,
    quality: qualitySTOption,
    speed: speedSTOption,
    balanced: balancedSTOption,
};
const FACADE_EARLY_RENDER_PATH_BUDGET = 128;
const QUALITY_RENDER_OPTIONS = {
    fast: {
        hrtfQuality: 'low',
        diffuseEnabled: false,
        diffuseQuality: 'low',
        lateReverbMode: 'one-pole',
        perBandLateReverb: false,
        delayInterpolation: 'linear',
        earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
    },
    middle: {
        hrtfQuality: 'medium',
        diffuseEnabled: true,
        diffuseQuality: 'medium',
        lateReverbMode: 'tilt',
        perBandLateReverb: false,
        delayInterpolation: 'cubic-lagrange',
        earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
    },
    quality: {
        hrtfQuality: 'high',
        diffuseEnabled: true,
        diffuseQuality: 'high',
        lateReverbMode: 'eight-band',
        perBandLateReverb: true,
        delayInterpolation: 'lagrange6',
        earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
    },
    speed: {
        hrtfQuality: 'low',
        diffuseEnabled: false,
        diffuseQuality: 'low',
        lateReverbMode: 'one-pole',
        perBandLateReverb: false,
        delayInterpolation: 'linear',
        earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
    },
    balanced: {
        hrtfQuality: 'medium',
        diffuseEnabled: true,
        diffuseQuality: 'medium',
        lateReverbMode: 'tilt',
        perBandLateReverb: false,
        delayInterpolation: 'cubic-lagrange',
        earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
    },
};
const HRTF_QUALITY = {
    low: HrtfQuality.Low,
    medium: HrtfQuality.Medium,
    high: HrtfQuality.High,
};
const DIFFUSE_QUALITY = {
    low: DiffuseQuality.Low,
    medium: DiffuseQuality.Medium,
    high: DiffuseQuality.High,
};
const LATE_REVERB_MODE = {
    'one-pole': LateReverbMode.OnePole,
    tilt: LateReverbMode.Tilt,
    'eight-band': LateReverbMode.EightBand,
};
const DELAY_INTERPOLATION = {
    linear: DelayInterpolation.Linear,
    'cubic-lagrange': DelayInterpolation.CubicLagrange,
    lagrange6: DelayInterpolation.Lagrange6,
};
const OBJECT_UPDATE_TYPE = {
    static: UpdateType.Static,
    refit: UpdateType.Refit,
    rebuild: UpdateType.Rebuild,
    dynamic: UpdateType.Dynamic,
};
const SOURCE_PATH_TYPE = {
    direct: PathType.Direct,
    reflection: PathType.Reflection,
    reverberation: PathType.Reverb,
    diffraction: PathType.Diffraction,
};
function requireNativeSet(ok, label) {
    if (!ok)
        throw new Error(`[soundtrace.js] failed to set listener ${label}`);
}
function requireObjectUpdateTypeSet(ok) {
    if (!ok)
        throw new Error('[soundtrace.js] failed to set object update type');
}
function requireRenderOptionValue(values, option, value) {
    const resolved = values[value];
    if (resolved === undefined) {
        throw new Error(`[soundtrace.js] unknown ${option}: ${value}`);
    }
    return resolved;
}
function requireNoHrtfMode(options) {
    const hrtfMode = Object.getOwnPropertyDescriptor(options, 'hrtfMode');
    if (hrtfMode !== undefined) {
        throw new Error(`[soundtrace.js] unknown hrtfMode: ${String(hrtfMode.value)}`);
    }
}
export function qualityPreset(tier) {
    const make = QUALITY_PRESET[tier];
    if (!make)
        throw new Error(`[soundtrace.js] unknown quality tier: ${tier}`);
    return make();
}
export function qualityRenderOptions(tier) {
    const options = QUALITY_RENDER_OPTIONS[tier];
    if (!options)
        throw new Error(`[soundtrace.js] unknown quality tier: ${tier}`);
    return { ...options };
}
export function objectUpdateTypeValue(type) {
    const value = OBJECT_UPDATE_TYPE[type];
    if (value === undefined)
        throw new Error(`[soundtrace.js] unknown object update type: ${type}`);
    return value;
}
export function objectUpdateTypeName(value) {
    switch (value) {
        case UpdateType.Static: return 'static';
        case UpdateType.Refit: return 'refit';
        case UpdateType.Rebuild: return 'rebuild';
        case UpdateType.Dynamic: return 'dynamic';
        default:
            throw new Error(`[soundtrace.js] unknown native object update type: ${value}`);
    }
}
export function sourcePathTypeValue(path) {
    const value = SOURCE_PATH_TYPE[path];
    if (value === undefined)
        throw new Error(`[soundtrace.js] unknown source path type: ${path}`);
    return value;
}
export function applySourcePathOptions(native, options) {
    if (options.direct !== undefined)
        native.setPathEnable(PathType.Direct, options.direct);
    if (options.reflection !== undefined)
        native.setPathEnable(PathType.Reflection, options.reflection);
    if (options.reverberation !== undefined)
        native.setPathEnable(PathType.Reverb, options.reverberation);
    if (options.diffraction !== undefined)
        native.setPathEnable(PathType.Diffraction, options.diffraction);
}
export function applyListenerRenderOptions(native, options) {
    requireNoHrtfMode(options);
    const hrtfQuality = options.hrtfQuality === undefined
        ? undefined
        : requireRenderOptionValue(HRTF_QUALITY, 'hrtfQuality', options.hrtfQuality);
    const diffuseQuality = options.diffuseQuality === undefined
        ? undefined
        : requireRenderOptionValue(DIFFUSE_QUALITY, 'diffuseQuality', options.diffuseQuality);
    const lateReverbMode = options.lateReverbMode === undefined
        ? undefined
        : requireRenderOptionValue(LATE_REVERB_MODE, 'lateReverbMode', options.lateReverbMode);
    const delayInterpolation = options.delayInterpolation === undefined
        ? undefined
        : requireRenderOptionValue(DELAY_INTERPOLATION, 'delayInterpolation', options.delayInterpolation);
    if (hrtfQuality !== undefined) {
        requireNativeSet(native.setHrtfQuality(hrtfQuality), 'HRTF quality');
    }
    if (options.diffuseEnabled !== undefined) {
        requireNativeSet(native.setDiffuseEnabled(options.diffuseEnabled), 'diffuse enabled');
    }
    if (diffuseQuality !== undefined) {
        requireNativeSet(native.setDiffuseQuality(diffuseQuality), 'diffuse quality');
    }
    if (lateReverbMode !== undefined) {
        requireNativeSet(native.setLateReverbMode(lateReverbMode), 'late reverb mode');
    }
    if (options.perBandLateReverb !== undefined) {
        requireNativeSet(native.setPerBandLateReverb(options.perBandLateReverb), 'per-band late reverb');
    }
    if (delayInterpolation !== undefined) {
        requireNativeSet(native.setDelayInterpolation(delayInterpolation), 'delay interpolation');
    }
    if (options.earlyRenderPathBudget !== undefined) {
        requireNativeSet(native.setEarlyRenderPathBudget(options.earlyRenderPathBudget), 'early render path budget');
    }
}
export function applyQualityRenderOptions(native, tier) {
    applyListenerRenderOptions(native, qualityRenderOptions(tier));
}
/** The BVH the facade builds every mesh with. Fixed and NOT exposed as an option
 *  for now — EXP-0002 measured LBVH_SIMD4 faster than scalar LBVH with full path
 *  parity. This single line is the one place to retarget it. Advanced callers who
 *  need a different BVH use the native createMesh()/setData() path. */
export const FACADE_BVH = BVHType.LBVH_SIMD4;
//# sourceMappingURL=facade-options.js.map