import { SoundTrace as SoundTraceImplementation } from './SoundTrace.js';
// Main surface — the entity-oriented facade.
//
// `soundtrace.js` exposes the high-level API: SoundTrace (the world),
// Source/Mesh/Listener entities, quality presets, and input resolvers.
// For the underlying low-level C-ABI 1:1 classes (SoundScene, SoundObject,
// SoundSource, ...), import from `soundtrace.js/native`.
export const SoundTrace = SoundTraceImplementation;
export { Source, Mesh, Listener, webPthreadPoolSize, resolveCoordinateTransform, objectUpdateTypeName, objectUpdateTypeValue, sourcePathTypeValue, transformVec3, transformQuat, transformScale, transformVertices, workerHostedMtSupport, } from './facade.js';
export { EXA_MAX_DEPTH, EXA_MAX_FREQUENCY_COUNT, EXA_MEMORY_TAG_COUNT, EXA_MAX_SOUNDSOURCE, EXA_MAX_PATH_CACHE_SIZE, EXA_MAX_VALIDPATH_COUNT, EXA_LISTENER_WIDTH, EXA_LISTENER_HEIGHT, EXA_SOUND_WIDTH, EXA_SOUND_HEIGHT, EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, EXA_PROPAGATION_JOB_TIMING_MAX_JOBS, defaultAmbientPhysicalFilterOption, defaultAirAbsorptionOption, defaultPerceptualDepthOption, speedSTOption, balancedSTOption, qualitySTOption, } from './native-public.js';
//# sourceMappingURL=index.js.map