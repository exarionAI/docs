import { SoundTrace as SoundTraceImplementation } from './SoundTrace.js';
import type { SoundTraceConstructor, SoundTraceFacade } from './SoundTrace-public.js';

// Main surface — the entity-oriented facade.
//
// `soundtrace.js` exposes the high-level API: SoundTrace (the world),
// Source/Mesh/Listener entities, quality presets, and input resolvers.
// For the underlying low-level C-ABI 1:1 classes (SoundScene, SoundObject,
// SoundSource, ...), import from `soundtrace.js/native`.
export const SoundTrace: SoundTraceConstructor = SoundTraceImplementation;
export interface SoundTrace extends SoundTraceFacade {}
export type {
  SoundTraceAddMeshOptions, SoundTraceAddSourceOptions, SoundTraceAudioOptions,
  SoundTraceFacade, SoundTraceOptions,
} from './SoundTrace-public.js';
export type {
  HrtfLoadMode, HrtfSource, StatisticsPathSnapshot, StatisticsSnapshot,
  StatisticsSnapshotOptions, StatisticsSourceSnapshot,
} from './SoundTrace-types.js';
export {
  Source, Mesh, Listener, webPthreadPoolSize, resolveCoordinateTransform,
  objectUpdateTypeName, objectUpdateTypeValue, sourcePathTypeValue,
  transformVec3, transformQuat, transformScale, transformVertices,
  workerHostedMtSupport,
  type ExecutionMode, type ListenerDelayInterpolation, type ListenerDiffuseQuality,
  type ListenerHrtfQuality, type ListenerLateReverbMode, type ListenerRenderOptions,
  type ObjectUpdateType, type QualityTier, type SourcePathOptions, type SourcePathType,
  type ThreadOption, type Throughput,
  type CoordinateBasisOption, type CoordinateTransform, type Vec3In, type Vec3Tuple,
  type QuatIn, type Pose,
  type WorkerHostedMtPrecondition, type WorkerHostedMtSupport,
} from './facade.js';
export type {
  Vec3, Ray, RayHit, Transform, AudioOption, AmbientPhysicalFilterOption,
  AirAbsorptionOption, PerceptualDepthOption, STOption,
  SoundMaterial, Triangle, GuidePlane, AmbientSoundPath, MirrorPosition,
  PropagatorProfile, RuntimeOption, MeshBuildOption,
  PropagationFrameTiming, PropagationJobTiming, PropagationJobTimingOption,
  MemoryTraceOption, MemoryTraceSnapshot, PathData,
} from './native-public.js';
export {
  EXA_MAX_DEPTH, EXA_MAX_FREQUENCY_COUNT, EXA_MEMORY_TAG_COUNT,
  EXA_MAX_SOUNDSOURCE, EXA_MAX_PATH_CACHE_SIZE, EXA_MAX_VALIDPATH_COUNT,
  EXA_LISTENER_WIDTH, EXA_LISTENER_HEIGHT, EXA_SOUND_WIDTH, EXA_SOUND_HEIGHT,
  EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, EXA_PROPAGATION_JOB_TIMING_MAX_JOBS,
  defaultAmbientPhysicalFilterOption, defaultAirAbsorptionOption,
  defaultPerceptualDepthOption,
  speedSTOption, balancedSTOption, qualitySTOption,
} from './native-public.js';
