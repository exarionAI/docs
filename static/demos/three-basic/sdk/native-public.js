import { balancedSTOption as nativeBalancedSTOption, defaultAirAbsorptionOption as nativeDefaultAirAbsorptionOption, defaultAmbientPhysicalFilterOption as nativeDefaultAmbientPhysicalFilterOption, defaultPerceptualDepthOption as nativeDefaultPerceptualDepthOption, defaultSTOption as nativeDefaultSTOption, qualitySTOption as nativeQualitySTOption, recommendedSTOption as nativeRecommendedSTOption, speedSTOption as nativeSpeedSTOption, } from './native/structs.js';
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
export function defaultSTOption() {
    return nativeDefaultSTOption();
}
export function recommendedSTOption() {
    return nativeRecommendedSTOption();
}
export function speedSTOption() {
    return nativeSpeedSTOption();
}
export function balancedSTOption() {
    return nativeBalancedSTOption();
}
export function qualitySTOption() {
    return nativeQualitySTOption();
}
//# sourceMappingURL=native-public.js.map