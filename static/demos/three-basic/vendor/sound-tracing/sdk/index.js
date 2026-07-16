import { SoundTrace as SoundTraceImplementation } from './facade/SoundTrace.js';
// Main surface — the entity-oriented facade.
//
// `soundtrace.js` exposes the high-level API: SoundTrace (the world),
// Source/Mesh/Listener entities, quality presets, and input resolvers.
// For the underlying low-level C-ABI 1:1 classes (SoundScene, SoundObject,
// SoundSource, ...), import from `soundtrace.js/native`.
export const SoundTrace = SoundTraceImplementation;
export { Source, Mesh, Listener, webPthreadPoolSize, resolveCoordinateTransform, objectUpdateTypeName, objectUpdateTypeValue, sourcePathTypeValue, listenerOutputModeValue, listenerOutputModeName, transformVec3, transformQuat, transformScale, transformVertices, workerHostedMtSupport, } from './facade/facade.js';
// Public error contract — thrown/rejected when MT is requested on a runtime
// that cannot host it. Catchable via `instanceof` or its `code`.
export { SoundTraceMtUnsupportedError } from './facade/SoundTrace-types.js';
export { EXA_MAX_DEPTH, EXA_MAX_FREQUENCY_COUNT, EXA_MEMORY_TAG_COUNT, EXA_MAX_SOUNDSOURCE, EXA_MAX_PATH_CACHE_SIZE, EXA_MAX_VALIDPATH_COUNT, EXA_LISTENER_WIDTH, EXA_LISTENER_HEIGHT, EXA_SOUND_WIDTH, EXA_SOUND_HEIGHT, EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, EXA_PROPAGATION_JOB_TIMING_MAX_JOBS, EXA_PATH_DIRECT, EXA_PATH_REFLECTION, EXA_PATH_DIFFRACTION, EXA_PATH_REVERB, EXA_PATH_TRANSMISSION, EXA_PATH_COUNT, EXA_DIFFUSE_BUDGET_LOW, EXA_DIFFUSE_BUDGET_MED, EXA_DIFFUSE_BUDGET_HIGH, EXA_HRTF_BUDGET_LOW, EXA_HRTF_BUDGET_MED, EXA_HRTF_BUDGET_HIGH, EXA_PRESET_DEFAULT, EXA_PRESET_ULTRA, EXA_PRESET_HIGH, EXA_PRESET_MEDIUM, EXA_PRESET_LOW, EXA_PRESET_LOWEST, defaultAmbientPhysicalFilterOption, defaultAirAbsorptionOption, defaultPerceptualDepthOption, defaultListenerOption, speedTracePreset, balancedTracePreset, qualityTracePreset, } from './native-public.js';
//# sourceMappingURL=index.js.map