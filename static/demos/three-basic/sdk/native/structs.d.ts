import type { Heap } from './heap.js';
export declare const EXA_MAX_DEPTH = 16;
export declare const EXA_MAX_FREQUENCY_COUNT = 8;
export declare const EXA_MEMORY_TAG_COUNT = 9;
/** MAX_DYNAMIC_SOUNDSOURCE(16) */
export declare const EXA_MAX_SOUNDSOURCE = 16;
export declare const EXA_ABI_VERSION = 2;
export declare const EXA_MAX_PATH_CACHE_SIZE = 16384;
export declare const EXA_MAX_VALIDPATH_COUNT = 128;
export declare const EXA_LISTENER_WIDTH = 32;
export declare const EXA_LISTENER_HEIGHT = 32;
export declare const EXA_SOUND_WIDTH = 16;
export declare const EXA_SOUND_HEIGHT = 8;
export declare const EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES = 256;
export declare const EXA_PROPAGATION_JOB_TIMING_MAX_JOBS = 16;
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export declare const VEC3_SIZE = 12;
export declare function writeVec3(h: Heap, ptr: number, v: Vec3): void;
export declare function readVec3(h: Heap, ptr: number): Vec3;
export declare const MAT3X3_SIZE = 36;
export interface Ray {
    origin: Vec3;
    dir: Vec3;
    dist: number;
}
export declare const RAY_SIZE = 28;
export declare function writeRay(h: Heap, ptr: number, r: Ray): void;
export declare function readRay(h: Heap, ptr: number): Ray;
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
export declare const RAYHIT_SIZE = 88;
export declare function readRayHit(h: Heap, ptr: number): RayHit;
export interface Transform {
    position: Vec3;
    /** 3x3 rotation matrix, row-major (m[0..2]=row0, m[3..5]=row1, m[6..8]=row2). */
    rotation: Float32Array;
    scale: Vec3;
}
export declare const TRANSFORM_SIZE = 60;
export declare function writeTransform(h: Heap, ptr: number, t: Transform): void;
export declare function readTransform(h: Heap, ptr: number): Transform;
export interface AudioOption {
    structSize?: number;
    version?: number;
    sampleRate: number;
    inputSampleCount: number;
    outputChannels: number;
    reserved?: [number, number];
}
export declare const AUDIO_OPTION_SIZE = 28;
export declare function writeAudioOption(h: Heap, ptr: number, o: AudioOption): void;
export declare function readAudioOption(h: Heap, ptr: number): AudioOption;
export interface AmbientPhysicalFilterOption {
    structSize?: number;
    version?: number;
    /** Toggles the ambient (guide-miss) path's air-absorption filter. */
    enabled: boolean;
    /** Extra path distance (m) the ambient path travels for air absorption. */
    airAbsorptionDistanceMeters: number;
    reserved?: number[];
}
export declare const AMBIENT_PHYSICAL_FILTER_OPTION_SIZE = 36;
export declare function defaultAmbientPhysicalFilterOption(): AmbientPhysicalFilterOption;
export declare function writeAmbientPhysicalFilterOption(h: Heap, ptr: number, o: AmbientPhysicalFilterOption): void;
export declare function readAmbientPhysicalFilterOption(h: Heap, ptr: number): AmbientPhysicalFilterOption;
export interface AirAbsorptionOption {
    structSize?: number;
    version?: number;
    enabled: boolean;
    temperatureCelsius: number;
    relativeHumidityPercent: number;
    pressurePa: number;
    reserved?: number[];
}
export declare const AIR_ABSORPTION_OPTION_SIZE = 40;
export declare function defaultAirAbsorptionOption(): AirAbsorptionOption;
export declare function writeAirAbsorptionOption(h: Heap, ptr: number, o: AirAbsorptionOption): void;
export declare function readAirAbsorptionOption(h: Heap, ptr: number): AirAbsorptionOption;
export interface PerceptualDepthOption {
    structSize?: number;
    version?: number;
    enabled: boolean;
    audibilityThreshold: number;
    maxDeltaPerFrame: number;
    reserved?: number[];
}
export declare const PERCEPTUAL_DEPTH_OPTION_SIZE = 36;
export declare function defaultPerceptualDepthOption(): PerceptualDepthOption;
export declare function writePerceptualDepthOption(h: Heap, ptr: number, o: PerceptualDepthOption): void;
export declare function readPerceptualDepthOption(h: Heap, ptr: number): PerceptualDepthOption;
export interface RuntimeOption {
    structSize?: number;
    version?: number;
    propagationThreadCount: number;
    reserved?: [number, number, number, number];
}
export declare const RUNTIME_OPTION_SIZE = 28;
export declare function writeRuntimeOption(h: Heap, ptr: number, o: RuntimeOption): void;
export declare function readRuntimeOption(h: Heap, ptr: number): RuntimeOption;
export interface MeshBuildOption {
    structSize?: number;
    version?: number;
    bvhType: number;
    bvhMaxDepth: number;
    primPerLeaf: number;
    reserved?: [number, number, number];
}
export declare const MESH_BUILD_OPTION_SIZE = 32;
export declare function writeMeshBuildOption(h: Heap, ptr: number, o: MeshBuildOption): void;
export declare function readMeshBuildOption(h: Heap, ptr: number): MeshBuildOption;
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
export declare const ST_OPTION_SIZE = 56;
/** Engine header defaults — matches C++ `ExaSTOption{}` default-construction. */
export declare function defaultSTOption(): STOption;
/** Runtime-friendly defaults for browser scenes. */
export declare function recommendedSTOption(): STOption;
/** `quality: 'speed'` — lightest. depth 4, 16×16 grid. */
export declare function speedSTOption(): STOption;
/** `quality: 'balanced'` (facade default) — depth 8, 24×24 grid. */
export declare function balancedSTOption(): STOption;
/** `quality: 'quality'` — heaviest shipped tier. depth 12, 32×32 grid. */
export declare function qualitySTOption(): STOption;
export declare function writeSTOption(h: Heap, ptr: number, o: STOption): void;
export declare function readSTOption(h: Heap, ptr: number): STOption;
export interface SoundMaterial {
    reflection: ArrayLike<number>;
    absorption: ArrayLike<number>;
    transmission: ArrayLike<number>;
    scattering: number;
    index: number;
}
export declare const SOUND_MATERIAL_SIZE = 104;
export declare function writeSoundMaterial(h: Heap, ptr: number, m: SoundMaterial): void;
export interface Triangle {
    a: number;
    b: number;
    c: number;
    materialIndex: number;
}
export declare const TRIANGLE_SIZE = 16;
export declare function writeTriangles(h: Heap, ptr: number, tris: ArrayLike<Triangle>): void;
export interface GuidePlane {
    vertices: [Vec3, Vec3, Vec3];
    normal: Vec3;
    depth: number;
}
export declare const GUIDE_PLANE_SIZE = 52;
export declare function readGuidePlane(h: Heap, ptr: number): GuidePlane;
export interface AmbientSoundPath {
    lastHitPoint: Vec3;
    missDirection: Vec3;
    depth: number;
    guideRayIndex: number;
    pathDistanceMeters: number;
    guidePlanes: GuidePlane[];
}
export declare const AMBIENT_SOUND_PATH_SIZE = 868;
export declare function readAmbientSoundPath(h: Heap, ptr: number): AmbientSoundPath;
export interface MirrorPosition {
    position: Vec3;
    setupPlaneIndex: number;
    depth: number;
    planeType: number;
}
export declare const MIRROR_POSITION_SIZE = 24;
export declare function readMirrorPosition(h: Heap, ptr: number): MirrorPosition;
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
export declare const PROPAGATOR_PROFILE_SIZE = 72;
export declare function readPropagatorProfile(h: Heap, ptr: number): PropagatorProfile;
export declare const PropagationThreadMode: {
    readonly Single: 0;
    readonly NativeMT: 1;
    readonly WasmMT: 2;
};
export type PropagationThreadModeValue = (typeof PropagationThreadMode)[keyof typeof PropagationThreadMode];
export declare const PropagationJobKind: {
    readonly FrameTotal: 0;
    readonly Init: 1;
    readonly GuideRayTrace: 2;
    readonly GuidePlaneCompact: 3;
    readonly GuidePlaneSort: 4;
    readonly DirectPathTrace: 5;
    readonly DirectPathMerge: 6;
    readonly ReflectionDiffractionSetupBuild: 7;
    readonly ReflectionDiffractionTrace: 8;
    readonly ReflectionDiffractionMerge: 9;
    readonly Count: 10;
};
export type PropagationJobKindValue = (typeof PropagationJobKind)[keyof typeof PropagationJobKind];
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
export declare const PROPAGATION_JOB_TIMING_SIZE = 56;
export declare function readPropagationJobTiming(h: Heap, ptr: number): PropagationJobTiming;
export interface PropagationFrameTiming {
    frameSequence: number;
    sceneID: number;
    listenerID: number;
    threadMode: number | null;
    propagationThreadCount: number;
    jobs: PropagationJobTiming[];
}
export declare const PROPAGATION_FRAME_TIMING_SIZE: number;
export declare function readPropagationFrameTiming(h: Heap, ptr: number): PropagationFrameTiming;
export interface PropagationJobTimingOption {
    enabled: boolean;
    frameCapacity: number;
}
export declare const PROPAGATION_JOB_TIMING_OPTION_SIZE = 8;
export declare function writePropagationJobTimingOption(h: Heap, ptr: number, o: PropagationJobTimingOption): void;
export interface MemoryTraceOption {
    enabled: boolean;
    writeLog: boolean;
    writeCsv: boolean;
    flushEvery: number;
    csvPath: string;
}
export declare const MEMORY_TRACE_OPTION_SIZE = 276;
export declare function writeMemoryTraceOption(h: Heap, ptr: number, o: MemoryTraceOption): void;
export interface MemoryTraceSnapshot {
    tagCount: number;
    bytes: number[];
}
export declare const MEMORY_TRACE_SNAPSHOT_SIZE = 80;
export declare function readMemoryTraceSnapshot(h: Heap, ptr: number): MemoryTraceSnapshot;
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
export declare const PATH_DATA_SIZE = 1384;
export declare function readPathData(h: Heap, ptr: number): PathData;
//# sourceMappingURL=structs.d.ts.map