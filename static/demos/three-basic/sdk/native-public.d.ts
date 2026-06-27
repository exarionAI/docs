export declare const EXA_MAX_DEPTH = 16;
export declare const EXA_MAX_FREQUENCY_COUNT = 8;
export declare const EXA_MEMORY_TAG_COUNT = 9;
export declare const EXA_MAX_SOUNDSOURCE = 16;
export declare const EXA_MAX_PATH_CACHE_SIZE = 16384;
export declare const EXA_MAX_VALIDPATH_COUNT = 128;
export declare const EXA_LISTENER_WIDTH = 32;
export declare const EXA_LISTENER_HEIGHT = 32;
export declare const EXA_SOUND_WIDTH = 16;
export declare const EXA_SOUND_HEIGHT = 8;
export declare const EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES = 256;
export declare const EXA_PROPAGATION_JOB_TIMING_MAX_JOBS = 16;
export declare const PropagationThreadMode: {
    readonly Single: 0;
    readonly NativeMT: 1;
    readonly WasmMT: 2;
};
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
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
export interface Ray {
    origin: Vec3;
    dir: Vec3;
    dist: number;
}
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
export interface Triangle {
    a: number;
    b: number;
    c: number;
    materialIndex: number;
}
export interface GuidePlane {
    vertices: [Vec3, Vec3, Vec3];
    normal: Vec3;
    depth: number;
}
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
export interface MemoryTraceSnapshot {
    tagCount: number;
    bytes: number[];
}
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
export declare function defaultAmbientPhysicalFilterOption(): AmbientPhysicalFilterOption;
export declare function defaultAirAbsorptionOption(): AirAbsorptionOption;
export declare function defaultPerceptualDepthOption(): PerceptualDepthOption;
export declare function defaultSTOption(): STOption;
export declare function recommendedSTOption(): STOption;
export declare function speedSTOption(): STOption;
export declare function balancedSTOption(): STOption;
export declare function qualitySTOption(): STOption;
//# sourceMappingURL=native-public.d.ts.map