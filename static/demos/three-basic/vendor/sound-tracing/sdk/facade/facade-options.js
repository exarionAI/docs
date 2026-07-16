import { PathType } from '../engine/SoundSource.js';
import { UpdateType } from '../engine/SoundObject.js';
import { BVHType } from '../engine/SoundMesh.js';
import { DelayInterpolation, DiffusePathBudget, HrtfPathBudget, OutputMode } from '../engine/SoundListener.js';
import { speedTracePreset, balancedTracePreset, qualityTracePreset } from '../native/structs.js';
const QUALITY_PRESET = {
    fast: speedTracePreset,
    middle: balancedTracePreset,
    quality: qualityTracePreset,
    speed: speedTracePreset,
    balanced: balancedTracePreset,
};
const FACADE_EARLY_RENDER_PATH_BUDGET = 128;
// One definition per behavior; deprecated aliases share the same object so the
// alias pairs (speed≡fast, middle≡balanced) cannot drift apart.
const FAST_RENDER_OPTIONS = {
    hrtfQuality: 'low',
    diffuseEnabled: false,
    diffuseQuality: 'low',
    delayInterpolation: 'linear',
    earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
};
const BALANCED_RENDER_OPTIONS = {
    hrtfQuality: 'medium',
    diffuseEnabled: true,
    diffuseQuality: 'medium',
    delayInterpolation: 'cubic-lagrange',
    earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
};
const QUALITY_RENDER_OPTIONS = {
    fast: FAST_RENDER_OPTIONS,
    balanced: BALANCED_RENDER_OPTIONS,
    quality: {
        hrtfQuality: 'high',
        diffuseEnabled: true,
        diffuseQuality: 'high',
        delayInterpolation: 'lagrange6',
        earlyRenderPathBudget: FACADE_EARLY_RENDER_PATH_BUDGET,
    },
    speed: FAST_RENDER_OPTIONS,
    middle: BALANCED_RENDER_OPTIONS,
};
// v0.7: the facade 'low'|'medium'|'high' strings now resolve to the RAW path
// budgets (documented operating points — the same values the old quality
// levels mapped to internally).
const HRTF_QUALITY = {
    low: HrtfPathBudget.Low,
    medium: HrtfPathBudget.Medium,
    high: HrtfPathBudget.High,
};
const DIFFUSE_QUALITY = {
    low: DiffusePathBudget.Low,
    medium: DiffusePathBudget.Medium,
    high: DiffusePathBudget.High,
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
/** Map the facade output-mode string to the numeric EXA_OUTPUT_MODE_* value. */
export function listenerOutputModeValue(mode) {
    switch (mode) {
        case 'hrtf': return OutputMode.Hrtf;
        case 'speaker': return OutputMode.Speaker;
        default:
            throw new Error(`[soundtrace.js] unknown listener output mode: ${mode}`);
    }
}
/** Map the numeric EXA_OUTPUT_MODE_* value back to the facade string. */
export function listenerOutputModeName(value) {
    switch (value) {
        case OutputMode.Hrtf: return 'hrtf';
        case OutputMode.Speaker: return 'speaker';
        default:
            throw new Error(`[soundtrace.js] unknown native listener output mode: ${value}`);
    }
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
    const delayInterpolation = options.delayInterpolation === undefined
        ? undefined
        : requireRenderOptionValue(DELAY_INTERPOLATION, 'delayInterpolation', options.delayInterpolation);
    if (hrtfQuality !== undefined) {
        requireNativeSet(native.setHrtfPathBudget(hrtfQuality), 'HRTF path budget');
    }
    if (options.diffuseEnabled !== undefined) {
        requireNativeSet(native.setDiffuseEnabled(options.diffuseEnabled), 'diffuse enabled');
    }
    if (diffuseQuality !== undefined) {
        requireNativeSet(native.setDiffusePathBudget(diffuseQuality), 'diffuse path budget');
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