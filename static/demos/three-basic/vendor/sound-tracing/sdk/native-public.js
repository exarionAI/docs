import { balancedTracePreset as nativeBalancedTracePreset, defaultAirAbsorptionOption as nativeDefaultAirAbsorptionOption, defaultAmbientPhysicalFilterOption as nativeDefaultAmbientPhysicalFilterOption, defaultListenerOption as nativeDefaultListenerOption, defaultPerceptualDepthOption as nativeDefaultPerceptualDepthOption, defaultTracePreset as nativeDefaultTracePreset, qualityTracePreset as nativeQualityTracePreset, recommendedTracePreset as nativeRecommendedTracePreset, speedTracePreset as nativeSpeedTracePreset, } from './native/structs.js';
export const EXA_MAX_DEPTH = 16;
export const EXA_MAX_FREQUENCY_COUNT = 8;
export const EXA_MEMORY_TAG_COUNT = 9;
export const EXA_MAX_SOUNDSOURCE = 16;
export const EXA_MAX_PATH_CACHE_SIZE = 16384;
export const EXA_MAX_VALIDPATH_COUNT = 128;
export const EXA_LISTENER_WIDTH = 32;
export const EXA_LISTENER_HEIGHT = 32;
export const EXA_SOUND_WIDTH = 16;
export const EXA_SOUND_HEIGHT = 8;
export const EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES = 256;
export const EXA_PROPAGATION_JOB_TIMING_MAX_JOBS = 16;
// v0.7 path types (EXA_PATH_*). TRANSMISSION is official as of v0.7;
// EXA_PATH_COUNT (5) is the authoritative count (the legacy native
// exaGetPathTypeCount() still returns 4).
export const EXA_PATH_DIRECT = 0;
export const EXA_PATH_REFLECTION = 1;
export const EXA_PATH_DIFFRACTION = 2;
export const EXA_PATH_REVERB = 3;
export const EXA_PATH_TRANSMISSION = 4;
export const EXA_PATH_COUNT = 5;
// v0.7 render path budgets (raw top-K counts, larger = higher quality).
export const EXA_DIFFUSE_BUDGET_LOW = 128;
export const EXA_DIFFUSE_BUDGET_MED = 512;
export const EXA_DIFFUSE_BUDGET_HIGH = 1024;
export const EXA_HRTF_BUDGET_LOW = 4;
export const EXA_HRTF_BUDGET_MED = 16;
export const EXA_HRTF_BUDGET_HIGH = 32;
// v0.7 propagation presets for exaListenerApplyPreset — INVERTED scale
// (1 = ULTRA … 5 = LOWEST; 0 = no-op).
export const EXA_PRESET_DEFAULT = 0;
export const EXA_PRESET_ULTRA = 1;
export const EXA_PRESET_HIGH = 2;
export const EXA_PRESET_MEDIUM = 3;
export const EXA_PRESET_LOW = 4;
export const EXA_PRESET_LOWEST = 5;
export const PropagationThreadMode = {
    Single: 0,
    NativeMT: 1,
    WasmMT: 2,
};
export const PropagationJobKind = {
    FrameTotal: 0,
    Init: 1,
    GuideRayTrace: 2,
    GuidePlaneCompact: 3,
    GuidePlaneSort: 4,
    DirectPathTrace: 5,
    DirectPathMerge: 6,
    ReflectionDiffractionSetupBuild: 7,
    ReflectionDiffractionTrace: 8,
    ReflectionDiffractionMerge: 9,
    Count: 10,
};
export function defaultAmbientPhysicalFilterOption() {
    return nativeDefaultAmbientPhysicalFilterOption();
}
export function defaultAirAbsorptionOption() {
    return nativeDefaultAirAbsorptionOption();
}
export function defaultPerceptualDepthOption() {
    return nativeDefaultPerceptualDepthOption();
}
export function defaultListenerOption() {
    return nativeDefaultListenerOption();
}
export function defaultTracePreset() {
    return nativeDefaultTracePreset();
}
export function recommendedTracePreset() {
    return nativeRecommendedTracePreset();
}
export function speedTracePreset() {
    return nativeSpeedTracePreset();
}
export function balancedTracePreset() {
    return nativeBalancedTracePreset();
}
export function qualityTracePreset() {
    return nativeQualityTracePreset();
}
//# sourceMappingURL=native-public.js.map