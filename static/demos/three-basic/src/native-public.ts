import {
  balancedSTOption as nativeBalancedSTOption,
  defaultAirAbsorptionOption as nativeDefaultAirAbsorptionOption,
  defaultAmbientPhysicalFilterOption as nativeDefaultAmbientPhysicalFilterOption,
  defaultPerceptualDepthOption as nativeDefaultPerceptualDepthOption,
  defaultSTOption as nativeDefaultSTOption,
  qualitySTOption as nativeQualitySTOption,
  recommendedSTOption as nativeRecommendedSTOption,
  speedSTOption as nativeSpeedSTOption,
} from './native/structs.js';

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
} as const;
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
} as const;

export interface Vec3 { x: number; y: number; z: number }
export interface Ray { origin: Vec3; dir: Vec3; dist: number }
export interface RayHit {
  ray: Ray;
  hit: boolean;
  distance: number;
  primIndex: number;
  normal: Vec3;
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}
export interface Transform {
  position: Vec3;
  rotation: Float32Array;
  scale: Vec3;
}
export interface AudioOption {
  structSize?: number;
  version?: number;
  sampleRate: number;
  inputSampleCount: number;
  outputChannels: number;
  reserved?: [number, number];
}
export interface AmbientPhysicalFilterOption {
  structSize?: number;
  version?: number;
  enabled: boolean;
  airAbsorptionDistanceMeters: number;
  reserved?: number[];
}
export interface AirAbsorptionOption {
  structSize?: number;
  version?: number;
  enabled: boolean;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  pressurePa: number;
  reserved?: number[];
}
export interface PerceptualDepthOption {
  structSize?: number;
  version?: number;
  enabled: boolean;
  audibilityThreshold: number;
  maxDeltaPerFrame: number;
  reserved?: number[];
}
export interface RuntimeOption {
  structSize?: number;
  version?: number;
  propagationThreadCount: number;
  reserved?: [number, number, number, number];
}
export interface MeshBuildOption {
  structSize?: number;
  version?: number;
  bvhType: number;
  bvhMaxDepth: number;
  primPerLeaf: number;
  reserved?: [number, number, number];
}
export interface STOption {
  structSize?: number;
  version?: number;
  maxDepth: number;
  listenerWidth: number;
  listenerHeight: number;
  seedValue: number;
  maxSoundSource: number;
  pathCacheSize: number;
  enableEnergyBasedTermination: boolean;
  enableAmbientSoundPath: boolean;
  energyThreshold: number;
  samePlaneEpsilonDist: number;
  samePlaneEpsilonNormal: number;
  guideRayMethod: number;
  reserved?: [number, number, number, number];
}
export interface SoundMaterial {
  reflection: ArrayLike<number>;
  absorption: ArrayLike<number>;
  transmission: ArrayLike<number>;
  scattering: number;
  index: number;
}
export interface Triangle { a: number; b: number; c: number; materialIndex: number }
export interface GuidePlane { vertices: [Vec3, Vec3, Vec3]; normal: Vec3; depth: number }
export interface AmbientSoundPath {
  lastHitPoint: Vec3;
  missDirection: Vec3;
  depth: number;
  guideRayIndex: number;
  pathDistanceMeters: number;
  guidePlanes: GuidePlane[];
}
export interface MirrorPosition {
  position: Vec3;
  setupPlaneIndex: number;
  depth: number;
  planeType: number;
}
export interface PropagatorProfile {
  initMs: number;
  guideRayMs: number;
  sortPlaneMs: number;
  directPathMs: number;
  reflDiffMs: number;
  totalMs: number;
  reflectionCount: number;
  diffractionCount: number;
  setupPlaneTotal: number;
  setupPlaneDiffraction: number;
  pathCacheOverflowCount: number;
  soundOutputOverflowCount: number;
}
export interface PropagationJobTiming {
  jobKind: number;
  wallTimeNs: number;
  workerTotalNs: number;
  workerMaxNs: number;
  scheduleWaitNs: number;
  invocationCount: number;
  workItemCount: number;
  partitionCount: number;
  activeWorkerCount: number;
}
export interface PropagationFrameTiming {
  frameSequence: number;
  sceneID: number;
  listenerID: number;
  threadMode: number | null;
  propagationThreadCount: number;
  jobs: PropagationJobTiming[];
}
export interface PropagationJobTimingOption {
  enabled: boolean;
  frameCapacity: number;
}
export interface MemoryTraceOption {
  enabled: boolean;
  writeLog: boolean;
  writeCsv: boolean;
  flushEvery: number;
  csvPath: string;
}
export interface MemoryTraceSnapshot { tagCount: number; bytes: number[] }
export interface PathData {
  points: Vec3[];
  maxDepth: number;
  pathKind: number;
  soundSourceIndex: number;
  isDynamic: boolean;
  totalDistance: number;
  toaMs: number;
  energyAvg: number;
  finalEnergy: Float32Array;
  energyPerBand: Float32Array[];
  hitMaterialId: Int32Array;
  hitAbsorption: Float32Array[];
}

export function defaultAmbientPhysicalFilterOption(): AmbientPhysicalFilterOption {
  return nativeDefaultAmbientPhysicalFilterOption();
}
export function defaultAirAbsorptionOption(): AirAbsorptionOption {
  return nativeDefaultAirAbsorptionOption();
}
export function defaultPerceptualDepthOption(): PerceptualDepthOption {
  return nativeDefaultPerceptualDepthOption();
}
export function defaultSTOption(): STOption {
  return nativeDefaultSTOption();
}
export function recommendedSTOption(): STOption {
  return nativeRecommendedSTOption();
}
export function speedSTOption(): STOption {
  return nativeSpeedSTOption();
}
export function balancedSTOption(): STOption {
  return nativeBalancedSTOption();
}
export function qualitySTOption(): STOption {
  return nativeQualitySTOption();
}
