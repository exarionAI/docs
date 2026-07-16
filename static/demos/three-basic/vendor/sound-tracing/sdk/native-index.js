// Low-level surface — the C-ABI 1:1 mirror. Escape hatch from the facade.
//
// The main entrypoint (`soundtrace.js`) exposes the entity-oriented facade
// (SoundTrace / Source / Mesh / Listener + presets + resolvers). Everything
// below is the underlying low-level API, reachable via `soundtrace.js/native`
// for advanced callers who need the raw handles, option structs, and manual
// graph assembly. The facade is pure composition over these classes.
export { SoundScene } from './engine/SoundScene.js';
export { SoundObject, UpdateType } from './engine/SoundObject.js';
export { SoundMesh, BVHType, BvhType } from './engine/SoundMesh.js';
export { SoundCollider } from './engine/SoundCollider.js';
export { SoundSource, PathType } from './engine/SoundSource.js';
export { SoundListener, DelayInterpolation, DiffusePathBudget, HrtfMode, HrtfModeName, HrtfPathBudget, OutputMode, } from './engine/SoundListener.js';
export { MaterialTable } from './engine/MaterialTable.js';
export { Propagator } from './engine/Propagator.js';
export { Diagnostics } from './engine/Diagnostics.js';
export { EXA_MAX_DEPTH, EXA_MAX_FREQUENCY_COUNT, EXA_MEMORY_TAG_COUNT, EXA_MAX_SOUNDSOURCE, EXA_MAX_PATH_CACHE_SIZE, EXA_MAX_VALIDPATH_COUNT, EXA_LISTENER_WIDTH, EXA_LISTENER_HEIGHT, EXA_SOUND_WIDTH, EXA_SOUND_HEIGHT, EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, EXA_PROPAGATION_JOB_TIMING_MAX_JOBS, EXA_PATH_DIRECT, EXA_PATH_REFLECTION, EXA_PATH_DIFFRACTION, EXA_PATH_REVERB, EXA_PATH_TRANSMISSION, EXA_PATH_COUNT, EXA_PRESET_DEFAULT, EXA_PRESET_ULTRA, EXA_PRESET_HIGH, EXA_PRESET_MEDIUM, EXA_PRESET_LOW, EXA_PRESET_LOWEST, EXA_HRTF_MODE_BAND8, EXA_HRTF_MODE_PARAMETRIC, EXA_HRTF_MODE_HRIR, EXA_HRTF_MODE_HRIR_INTERPOLATED, EXA_HRTF_KIND_PARAMETRIC, EXA_HRTF_KIND_HRIR, EXA_HRTF_KIND_HRIR_INTERPOLATED, EXA_OUTPUT_MODE_HRTF, EXA_OUTPUT_MODE_SPEAKER, IR_SIZE, GPU_PROPAGATION_STATS_SIZE, EXA_DIFFUSE_BUDGET_LOW, EXA_DIFFUSE_BUDGET_MED, EXA_DIFFUSE_BUDGET_HIGH, EXA_HRTF_BUDGET_LOW, EXA_HRTF_BUDGET_MED, EXA_HRTF_BUDGET_HIGH, PropagationThreadMode, PropagationJobKind, defaultAmbientPhysicalFilterOption, defaultAirAbsorptionOption, defaultPerceptualDepthOption, defaultListenerOption, defaultTracePreset, recommendedTracePreset, speedTracePreset, balancedTracePreset, qualityTracePreset, 
// v0.7 ExaResult error model (0 = success — see the truthiness-flip notes).
EXA_OK, EXA_OK_BYPASSED, EXA_ERR_NOT_INITIALIZED, EXA_ERR_INVALID_HANDLE, EXA_ERR_INVALID_ARG, EXA_ERR_OUT_OF_RANGE, EXA_ERR_NOT_LOADED, EXA_ERR_BUFFER_TOO_SMALL, EXA_ERR_WRONG_THREAD, EXA_ERR_UNSUPPORTED, EXA_ERR_ALREADY, EXA_ERR_INTERNAL, ExaResultError, exaResultName, isOk, isError, requireOk, } from './native/index.js';
//# sourceMappingURL=native-index.js.map