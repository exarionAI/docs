// Low-level surface — the C-ABI 1:1 mirror. Escape hatch from the facade.
//
// The main entrypoint (`soundtrace.js`) exposes the entity-oriented facade
// (SoundTrace / Source / Mesh / Listener + presets + resolvers). Everything
// below is the underlying low-level API, reachable via `soundtrace.js/native`
// for advanced callers who need the raw handles, option structs, and manual
// graph assembly. The facade is pure composition over these classes.
export { SoundScene } from './SoundScene.js';
export { SoundObject, UpdateType, type UpdateTypeValue } from './SoundObject.js';
export { SoundMesh, BVHType, BvhType, type BVHTypeValue, type BvhTypeValue } from './SoundMesh.js';
export { SoundCollider, type SoundColliderBuildOptions } from './SoundCollider.js';
export { SoundSource, PathType, type DistanceAttenuations, type PathTypeValue } from './SoundSource.js';
export {
  SoundListener,
  DelayInterpolation, DiffuseQuality, HrtfMode, HrtfModeName,
  HrtfQuality, LateReverbMode,
  type DelayInterpolation as DelayInterpolationValue,
  type DiffuseQuality as DiffuseQualityValue,
  type HrtfMode as HrtfModeValue,
  type HrtfModeName as HrtfModeNameValue,
  type HrtfQuality as HrtfQualityValue,
  type LateReverbMode as LateReverbModeValue,
} from './SoundListener.js';
export { MaterialTable } from './MaterialTable.js';
export { Propagator } from './Propagator.js';
export { Diagnostics } from './Diagnostics.js';
export type { Disposable } from './Disposable.js';
export type { ThreadMode } from './types.js';
export type { Quat } from './SoundObject.js';
export type { MeshBuildOptions } from './SoundMesh.js';
export type {
  Vec3, Ray, RayHit, Transform, AudioOption, AmbientPhysicalFilterOption,
  AirAbsorptionOption, PerceptualDepthOption, STOption,
  SoundMaterial, Triangle, GuidePlane, AmbientSoundPath, MirrorPosition,
  PropagatorProfile, RuntimeOption, MeshBuildOption,
  PropagationFrameTiming, PropagationJobTiming, PropagationJobTimingOption,
  MemoryTraceOption, MemoryTraceSnapshot, PathData,
} from './native/index.js';
export {
  EXA_MAX_DEPTH, EXA_MAX_FREQUENCY_COUNT, EXA_MEMORY_TAG_COUNT,
  EXA_MAX_SOUNDSOURCE, EXA_MAX_PATH_CACHE_SIZE, EXA_MAX_VALIDPATH_COUNT,
  EXA_LISTENER_WIDTH, EXA_LISTENER_HEIGHT, EXA_SOUND_WIDTH, EXA_SOUND_HEIGHT,
  EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, EXA_PROPAGATION_JOB_TIMING_MAX_JOBS,
  PropagationThreadMode, PropagationJobKind,
  defaultAmbientPhysicalFilterOption, defaultAirAbsorptionOption,
  defaultPerceptualDepthOption, defaultSTOption, recommendedSTOption,
  speedSTOption, balancedSTOption, qualitySTOption,
} from './native/index.js';