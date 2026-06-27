import type { Heap } from './heap.js';

// ============================================================================
// Struct layouts mirror the explicit fixed-width DTO layout of exaSoundC.h
// (the frozen C-ABI v0.6.0 / EXA_ABI_VERSION 2 — no #pragma pack; every field is
// 4-byte aligned by construction). Field offsets are hand-verified against the
// frozen header — keep in sync if the header changes (a mismatch is silent memory
// corruption). See ADR-0003 (engineer workspace) for the freeze.
// ============================================================================

// ---- Constants (in sync with exaSoundC.h / engine_config.h) ----
export const EXA_MAX_DEPTH = 16;
export const EXA_MAX_FREQUENCY_COUNT = 8;
export const EXA_MEMORY_TAG_COUNT = 9;
/** MAX_DYNAMIC_SOUNDSOURCE(16) */
export const EXA_MAX_SOUNDSOURCE = 16;
export const EXA_ABI_VERSION = 2;
export const EXA_MAX_PATH_CACHE_SIZE = 16384;
export const EXA_MAX_VALIDPATH_COUNT = 128;
export const EXA_LISTENER_WIDTH = 32;
export const EXA_LISTENER_HEIGHT = 32;
export const EXA_SOUND_WIDTH = 16;
export const EXA_SOUND_HEIGHT = 8;
export const EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES = 256;
export const EXA_PROPAGATION_JOB_TIMING_MAX_JOBS = 16;

function readU64(h: Heap, ptr: number): number {
  const lo = h.readU32(ptr + 0);
  const hi = h.readU32(ptr + 4);
  return hi * 0x1_0000_0000 + lo;
}

// ----------------------------------------------------------------------------
// ExaVec3f { float v[3] } → 12 bytes
// ----------------------------------------------------------------------------
export interface Vec3 { x: number; y: number; z: number }
export const VEC3_SIZE = 12;

export function writeVec3(h: Heap, ptr: number, v: Vec3): void {
  h.writeF32(ptr + 0, v.x);
  h.writeF32(ptr + 4, v.y);
  h.writeF32(ptr + 8, v.z);
}
export function readVec3(h: Heap, ptr: number): Vec3 {
  return { x: h.readF32(ptr + 0), y: h.readF32(ptr + 4), z: h.readF32(ptr + 8) };
}

// ----------------------------------------------------------------------------
// ExaMat3x3f { Vec3 x,y,z } → 36 bytes (three row vectors)
// ----------------------------------------------------------------------------
export const MAT3X3_SIZE = 36;

// ----------------------------------------------------------------------------
// ExaRay { Vec3 origin; Vec3 dir; float dist } → 28 bytes
// ----------------------------------------------------------------------------
export interface Ray { origin: Vec3; dir: Vec3; dist: number }
export const RAY_SIZE = 28;

export function writeRay(h: Heap, ptr: number, r: Ray): void {
  writeVec3(h, ptr + 0, r.origin);
  writeVec3(h, ptr + 12, r.dir);
  h.writeF32(ptr + 24, r.dist);
}
export function readRay(h: Heap, ptr: number): Ray {
  return {
    origin: readVec3(h, ptr + 0),
    dir: readVec3(h, ptr + 12),
    dist: h.readF32(ptr + 24),
  };
}

// ----------------------------------------------------------------------------
// ExaRayHit { Ray ray; u8 hit; u8 pad[3]; float distance; i32 primIndex;
//             Vec3 normal; Vec3 v0; Vec3 v1; Vec3 v2 }
//   28 + 1 + 3(pad) + 4 + 4 + 12*4 = 88 bytes
// ----------------------------------------------------------------------------
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
export const RAYHIT_SIZE = 88;

export function readRayHit(h: Heap, ptr: number): RayHit {
  return {
    ray: readRay(h, ptr + 0),
    hit: h.readBool(ptr + 28),
    // +29..31 padding
    distance: h.readF32(ptr + 32),
    primIndex: h.readI32(ptr + 36),
    normal: readVec3(h, ptr + 40),
    v0: readVec3(h, ptr + 52),
    v1: readVec3(h, ptr + 64),
    v2: readVec3(h, ptr + 76),
  };
}

// ----------------------------------------------------------------------------
// ExaSTTransform { Vec3 position; float m[9]; float scaleX,Y,Z }
//   12 + 36 + 12 = 60 bytes
// ----------------------------------------------------------------------------
export interface Transform {
  position: Vec3;
  /** 3x3 rotation matrix, row-major (m[0..2]=row0, m[3..5]=row1, m[6..8]=row2). */
  rotation: Float32Array;
  scale: Vec3;
}
export const TRANSFORM_SIZE = 60;

export function writeTransform(h: Heap, ptr: number, t: Transform): void {
  writeVec3(h, ptr + 0, t.position);
  h.writeF32Array(ptr + 12, t.rotation);
  h.writeF32(ptr + 48, t.scale.x);
  h.writeF32(ptr + 52, t.scale.y);
  h.writeF32(ptr + 56, t.scale.z);
}
export function readTransform(h: Heap, ptr: number): Transform {
  return {
    position: readVec3(h, ptr + 0),
    rotation: h.readF32Array(ptr + 12, 9),
    scale: { x: h.readF32(ptr + 48), y: h.readF32(ptr + 52), z: h.readF32(ptr + 56) },
  };
}

// ----------------------------------------------------------------------------
// ExaAudioOption { u32 structSize; u32 version; u32 sampleRate; u32 inputSampleCount;
//                u32 outputChannels; u32 reserved[2] }
//   7 * 4 = 28 bytes
// ----------------------------------------------------------------------------
export interface AudioOption {
  structSize?: number;
  version?: number;
  sampleRate: number;
  inputSampleCount: number;
  outputChannels: number;
  reserved?: [number, number];
}
export const AUDIO_OPTION_SIZE = 28;

export function writeAudioOption(h: Heap, ptr: number, o: AudioOption): void {
  h.writeU32(ptr + 0, o.structSize ?? AUDIO_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeU32(ptr + 8, o.sampleRate);
  h.writeU32(ptr + 12, o.inputSampleCount);
  h.writeU32(ptr + 16, o.outputChannels);
  h.writeU32(ptr + 20, o.reserved?.[0] ?? 0);
  h.writeU32(ptr + 24, o.reserved?.[1] ?? 0);
}
export function readAudioOption(h: Heap, ptr: number): AudioOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    sampleRate: h.readU32(ptr + 8),
    inputSampleCount: h.readU32(ptr + 12),
    outputChannels: h.readU32(ptr + 16),
    reserved: [h.readU32(ptr + 20), h.readU32(ptr + 24)],
  };
}

// ----------------------------------------------------------------------------
// ExaAmbientPhysicalFilterOption { u32 structSize; u32 version; i32 enabled;
//   float airAbsorptionDistanceMeters; u32 reserved[5] } -> 36 bytes
// MIGRATION (v0.6 / ABI 2): the atmospheric fields (temperature/humidity/pressure)
// were REMOVED from this struct and moved to ExaAirAbsorptionOption;
// airAbsorptionDistanceMeters now sits at offset 12 (the old temperatureCelsius
// slot). Writing the old layout would have temperatureCelsius silently
// reinterpreted as airAbsorptionDistanceMeters.
// ----------------------------------------------------------------------------
export interface AmbientPhysicalFilterOption {
  structSize?: number;
  version?: number;
  /** Toggles the ambient (guide-miss) path's air-absorption filter. */
  enabled: boolean;
  /** Extra path distance (m) the ambient path travels for air absorption. */
  airAbsorptionDistanceMeters: number;
  reserved?: number[];
}
export const AMBIENT_PHYSICAL_FILTER_OPTION_SIZE = 36;

export function defaultAmbientPhysicalFilterOption(): AmbientPhysicalFilterOption {
  return {
    structSize: AMBIENT_PHYSICAL_FILTER_OPTION_SIZE,
    version: EXA_ABI_VERSION,
    enabled: false,
    airAbsorptionDistanceMeters: 0,
  };
}

export function writeAmbientPhysicalFilterOption(
  h: Heap,
  ptr: number,
  o: AmbientPhysicalFilterOption,
): void {
  h.writeU32(ptr + 0, o.structSize ?? AMBIENT_PHYSICAL_FILTER_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeI32(ptr + 8, o.enabled ? 1 : 0);
  h.writeF32(ptr + 12, o.airAbsorptionDistanceMeters);
  for (let i = 0; i < 5; i++) h.writeU32(ptr + 16 + i * 4, o.reserved?.[i] ?? 0);
}

export function readAmbientPhysicalFilterOption(
  h: Heap,
  ptr: number,
): AmbientPhysicalFilterOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    enabled: h.readI32(ptr + 8) !== 0,
    airAbsorptionDistanceMeters: h.readF32(ptr + 12),
    reserved: [0, 1, 2, 3, 4].map((i) => h.readU32(ptr + 16 + i * 4)),
  };
}

// ----------------------------------------------------------------------------
// ExaAirAbsorptionOption { u32 structSize; u32 version; i32 enabled;
//   float temperatureCelsius; float relativeHumidityPercent; float pressurePa;
//   u32 reserved[4] } -> 40 bytes. Added in v0.6 (ABI 2). The single source of
//   temperature/humidity/pressure for BOTH geometric and ambient air absorption.
//   `enabled` toggles geometric air absorption. Defaults 20C / 50% RH / 1 atm /
//   enabled.
// ----------------------------------------------------------------------------
export interface AirAbsorptionOption {
  structSize?: number;
  version?: number;
  enabled: boolean;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  pressurePa: number;
  reserved?: number[];
}
export const AIR_ABSORPTION_OPTION_SIZE = 40;

export function defaultAirAbsorptionOption(): AirAbsorptionOption {
  return {
    structSize: AIR_ABSORPTION_OPTION_SIZE,
    version: EXA_ABI_VERSION,
    enabled: true,
    temperatureCelsius: 20,
    relativeHumidityPercent: 50,
    pressurePa: 101325,
  };
}

export function writeAirAbsorptionOption(h: Heap, ptr: number, o: AirAbsorptionOption): void {
  h.writeU32(ptr + 0, o.structSize ?? AIR_ABSORPTION_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeI32(ptr + 8, o.enabled ? 1 : 0);
  h.writeF32(ptr + 12, o.temperatureCelsius);
  h.writeF32(ptr + 16, o.relativeHumidityPercent);
  h.writeF32(ptr + 20, o.pressurePa);
  for (let i = 0; i < 4; i++) h.writeU32(ptr + 24 + i * 4, o.reserved?.[i] ?? 0);
}

export function readAirAbsorptionOption(h: Heap, ptr: number): AirAbsorptionOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    enabled: h.readI32(ptr + 8) !== 0,
    temperatureCelsius: h.readF32(ptr + 12),
    relativeHumidityPercent: h.readF32(ptr + 16),
    pressurePa: h.readF32(ptr + 20),
    reserved: [0, 1, 2, 3].map((i) => h.readU32(ptr + 24 + i * 4)),
  };
}

// ----------------------------------------------------------------------------
// ExaPerceptualDepthOption { u32 structSize; u32 version; i32 enabled;
//   float audibilityThreshold; i32 maxDeltaPerFrame; u32 reserved[4] } -> 36 bytes.
//   Added in v0.6 (ABI 2). Global perceptual-depth adaptation (GSound-style):
//   adapts the trace depth each frame to the audible reflection-order count.
//   enabled=0 -> identical to before (no adaptation).
// ----------------------------------------------------------------------------
export interface PerceptualDepthOption {
  structSize?: number;
  version?: number;
  enabled: boolean;
  audibilityThreshold: number;
  maxDeltaPerFrame: number;
  reserved?: number[];
}
export const PERCEPTUAL_DEPTH_OPTION_SIZE = 36;

export function defaultPerceptualDepthOption(): PerceptualDepthOption {
  return {
    structSize: PERCEPTUAL_DEPTH_OPTION_SIZE,
    version: EXA_ABI_VERSION,
    enabled: false,
    audibilityThreshold: 0,
    maxDeltaPerFrame: 1,
  };
}

export function writePerceptualDepthOption(h: Heap, ptr: number, o: PerceptualDepthOption): void {
  h.writeU32(ptr + 0, o.structSize ?? PERCEPTUAL_DEPTH_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeI32(ptr + 8, o.enabled ? 1 : 0);
  h.writeF32(ptr + 12, o.audibilityThreshold);
  h.writeI32(ptr + 16, o.maxDeltaPerFrame);
  for (let i = 0; i < 4; i++) h.writeU32(ptr + 20 + i * 4, o.reserved?.[i] ?? 0);
}

export function readPerceptualDepthOption(h: Heap, ptr: number): PerceptualDepthOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    enabled: h.readI32(ptr + 8) !== 0,
    audibilityThreshold: h.readF32(ptr + 12),
    maxDeltaPerFrame: h.readI32(ptr + 16),
    reserved: [0, 1, 2, 3].map((i) => h.readU32(ptr + 20 + i * 4)),
  };
}

// ----------------------------------------------------------------------------
// ExaRuntimeOption { u32 structSize; u32 version; int propagationThreadCount;
//                  u32 reserved[4] } -> 28 bytes
// ----------------------------------------------------------------------------
export interface RuntimeOption {
  structSize?: number;
  version?: number;
  propagationThreadCount: number;
  reserved?: [number, number, number, number];
}
export const RUNTIME_OPTION_SIZE = 28;

export function writeRuntimeOption(h: Heap, ptr: number, o: RuntimeOption): void {
  h.writeU32(ptr + 0, o.structSize ?? RUNTIME_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeI32(ptr + 8, o.propagationThreadCount);
  h.writeU32(ptr + 12, o.reserved?.[0] ?? 0);
  h.writeU32(ptr + 16, o.reserved?.[1] ?? 0);
  h.writeU32(ptr + 20, o.reserved?.[2] ?? 0);
  h.writeU32(ptr + 24, o.reserved?.[3] ?? 0);
}
export function readRuntimeOption(h: Heap, ptr: number): RuntimeOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    propagationThreadCount: h.readI32(ptr + 8),
    reserved: [h.readU32(ptr + 12), h.readU32(ptr + 16), h.readU32(ptr + 20), h.readU32(ptr + 24)],
  };
}

// ----------------------------------------------------------------------------
// ExaMeshBuildOption { u32 structSize; u32 version; int bvhType;
//   int bvhMaxDepth; uint32 primPerLeafNode; u32 reserved[3] } -> 32 bytes
// ----------------------------------------------------------------------------
export interface MeshBuildOption {
  structSize?: number;
  version?: number;
  bvhType: number;
  bvhMaxDepth: number;
  primPerLeaf: number;
  reserved?: [number, number, number];
}
export const MESH_BUILD_OPTION_SIZE = 32;

export function writeMeshBuildOption(h: Heap, ptr: number, o: MeshBuildOption): void {
  h.writeU32(ptr + 0, o.structSize ?? MESH_BUILD_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeI32(ptr + 8, o.bvhType);
  h.writeI32(ptr + 12, o.bvhMaxDepth);
  h.writeU32(ptr + 16, o.primPerLeaf);
  h.writeU32(ptr + 20, o.reserved?.[0] ?? 0);
  h.writeU32(ptr + 24, o.reserved?.[1] ?? 0);
  h.writeU32(ptr + 28, o.reserved?.[2] ?? 0);
}
export function readMeshBuildOption(h: Heap, ptr: number): MeshBuildOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    bvhType: h.readI32(ptr + 8),
    bvhMaxDepth: h.readI32(ptr + 12),
    primPerLeaf: h.readU32(ptr + 16),
    reserved: [h.readU32(ptr + 20), h.readU32(ptr + 24), h.readU32(ptr + 28)],
  };
}

// ----------------------------------------------------------------------------
// ExaSTOption — ABI aligned:
//   u32 structSize; u32 version;
//   u8 maxDepth; u8 listenerWidth; u8 listenerHeight; u8 guideRayMethod;
//   u32 SeedValue;
//   u16 maxSoundSource; u16 pathCacheSize;
//   i32 EnableEnergyBasedTermination;
//   i32 EnableAmbientSoundPath;
//   float EnergyThreshold; float samePlaneEpsilonDist;
//   float samePlaneEpsilonNormal;
//   u32 reserved[4];
// total = 56 bytes
// ----------------------------------------------------------------------------
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
export const ST_OPTION_SIZE = 56;

/** Engine header defaults — matches C++ `ExaSTOption{}` default-construction. */
export function defaultSTOption(): STOption {
  return {
    structSize: ST_OPTION_SIZE,
    version: EXA_ABI_VERSION,
    maxDepth: EXA_MAX_DEPTH,
    listenerWidth: EXA_LISTENER_WIDTH,
    listenerHeight: EXA_LISTENER_HEIGHT,
    seedValue: 0,
    maxSoundSource: EXA_MAX_SOUNDSOURCE,
    pathCacheSize: EXA_MAX_PATH_CACHE_SIZE,
    enableEnergyBasedTermination: false,
    enableAmbientSoundPath: false,
    energyThreshold: 0.001,
    samePlaneEpsilonDist: 0.001,
    samePlaneEpsilonNormal: 0.999,
    guideRayMethod: 0,
    reserved: [0, 0, 0, 0],
  };
}

/** Runtime-friendly defaults for browser scenes. */
export function recommendedSTOption(): STOption {
  return {
    ...defaultSTOption(),
    maxDepth: 3,
    listenerWidth: 16,
    listenerHeight: 16,
  };
}

// --- Facade quality tiers (design: web-sdk-facade-layer.md §7) -------------
// Three named presets the high-level facade maps `quality: 'speed'|'balanced'|
// 'quality'` onto. They vary only the two cost levers — reflection `maxDepth`
// and the listener ray grid (width×height) — which dominate per-frame ray work
// (cost ~ depth × grid²). Everything else stays at the engine default. Grid
// values scale with depth (16²/24²/32²) for a meaningful speed↔quality spread.

/** `quality: 'speed'` — lightest. depth 4, 16×16 grid. */
export function speedSTOption(): STOption {
  return { ...defaultSTOption(), maxDepth: 4, listenerWidth: 16, listenerHeight: 16 };
}
/** `quality: 'balanced'` (facade default) — depth 8, 24×24 grid. */
export function balancedSTOption(): STOption {
  return { ...defaultSTOption(), maxDepth: 8, listenerWidth: 24, listenerHeight: 24 };
}
/** `quality: 'quality'` — heaviest shipped tier. depth 12, 32×32 grid. */
export function qualitySTOption(): STOption {
  return { ...defaultSTOption(), maxDepth: 12, listenerWidth: 32, listenerHeight: 32 };
}

export function writeSTOption(h: Heap, ptr: number, o: STOption): void {
  h.writeU32(ptr + 0, o.structSize ?? ST_OPTION_SIZE);
  h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
  h.writeU8(ptr + 8, o.maxDepth);
  h.writeU8(ptr + 9, o.listenerWidth);
  h.writeU8(ptr + 10, o.listenerHeight);
  h.writeU8(ptr + 11, o.guideRayMethod);
  h.writeU32(ptr + 12, o.seedValue);
  h.writeU16(ptr + 16, o.maxSoundSource & 0xffff);
  h.writeU16(ptr + 18, o.pathCacheSize & 0xffff);
  h.writeI32(ptr + 20, o.enableEnergyBasedTermination ? 1 : 0);
  h.writeI32(ptr + 24, o.enableAmbientSoundPath ? 1 : 0);
  h.writeF32(ptr + 28, o.energyThreshold);
  h.writeF32(ptr + 32, o.samePlaneEpsilonDist);
  h.writeF32(ptr + 36, o.samePlaneEpsilonNormal);
  h.writeU32(ptr + 40, o.reserved?.[0] ?? 0);
  h.writeU32(ptr + 44, o.reserved?.[1] ?? 0);
  h.writeU32(ptr + 48, o.reserved?.[2] ?? 0);
  h.writeU32(ptr + 52, o.reserved?.[3] ?? 0);
}

export function readSTOption(h: Heap, ptr: number): STOption {
  return {
    structSize: h.readU32(ptr + 0),
    version: h.readU32(ptr + 4),
    maxDepth: h.readU8(ptr + 8),
    listenerWidth: h.readU8(ptr + 9),
    listenerHeight: h.readU8(ptr + 10),
    guideRayMethod: h.readU8(ptr + 11),
    seedValue: h.readU32(ptr + 12),
    maxSoundSource: h.readU16(ptr + 16),
    pathCacheSize: h.readU16(ptr + 18),
    enableEnergyBasedTermination: h.readI32(ptr + 20) !== 0,
    enableAmbientSoundPath: h.readI32(ptr + 24) !== 0,
    energyThreshold: h.readF32(ptr + 28),
    samePlaneEpsilonDist: h.readF32(ptr + 32),
    samePlaneEpsilonNormal: h.readF32(ptr + 36),
    reserved: [
      h.readU32(ptr + 40),
      h.readU32(ptr + 44),
      h.readU32(ptr + 48),
      h.readU32(ptr + 52),
    ],
  };
}

// ----------------------------------------------------------------------------
// ExaSTSoundMaterial
//   float reflection[8]   = 32
//   float absorption[8]   = 32
//   float transmition[8]  = 32
//   float scattering      = 4
//   u32 index             = 4
// total = 104 bytes
// ----------------------------------------------------------------------------
export interface SoundMaterial {
  reflection: ArrayLike<number>;   // length 8
  absorption: ArrayLike<number>;   // length 8
  transmission: ArrayLike<number>; // length 8
  scattering: number;
  index: number;
}
export const SOUND_MATERIAL_SIZE = 104;

export function writeSoundMaterial(h: Heap, ptr: number, m: SoundMaterial): void {
  h.writeF32Array(ptr + 0, m.reflection);
  h.writeF32Array(ptr + 32, m.absorption);
  h.writeF32Array(ptr + 64, m.transmission);
  h.writeF32(ptr + 96, m.scattering);
  h.writeU32(ptr + 100, m.index);
}

// ----------------------------------------------------------------------------
// Triangle { size_t vertex_indices[3]; size_t material_index }
//   wasm32 size_t = 4 → 4*4 = 16 bytes
// ----------------------------------------------------------------------------
export interface Triangle { a: number; b: number; c: number; materialIndex: number }
export const TRIANGLE_SIZE = 16;

export function writeTriangles(h: Heap, ptr: number, tris: ArrayLike<Triangle>): void {
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i]!;
    const off = ptr + i * TRIANGLE_SIZE;
    h.writeU32(off + 0, t.a);
    h.writeU32(off + 4, t.b);
    h.writeU32(off + 8, t.c);
    h.writeU32(off + 12, t.materialIndex);
  }
}

// ----------------------------------------------------------------------------
// ExaGuidePlane { Vec3 v[3]; Vec3 normal; int depth } → 12*3 + 12 + 4 = 52
// ----------------------------------------------------------------------------
export interface GuidePlane { vertices: [Vec3, Vec3, Vec3]; normal: Vec3; depth: number }
export const GUIDE_PLANE_SIZE = 52;

export function readGuidePlane(h: Heap, ptr: number): GuidePlane {
  return {
    vertices: [readVec3(h, ptr + 0), readVec3(h, ptr + 12), readVec3(h, ptr + 24)],
    normal: readVec3(h, ptr + 36),
    depth: h.readI32(ptr + 48),
  };
}

// ----------------------------------------------------------------------------
// ExaAmbientSoundPath
//   Vec3 lastHitPoint; Vec3 missDirection; i32 depth; i32 guideRayIndex;
//   f32 pathDistanceMeters; ExaGuidePlane guidePlanes[EXA_MAX_DEPTH]
//   12 + 12 + 4 + 4 + 4 + 52 * 16 = 868 bytes
// ----------------------------------------------------------------------------
export interface AmbientSoundPath {
  lastHitPoint: Vec3;
  missDirection: Vec3;
  depth: number;
  guideRayIndex: number;
  pathDistanceMeters: number;
  guidePlanes: GuidePlane[];
}
export const AMBIENT_SOUND_PATH_SIZE = 868;

export function readAmbientSoundPath(h: Heap, ptr: number): AmbientSoundPath {
  const depth = Math.max(0, Math.min(h.readI32(ptr + 24), EXA_MAX_DEPTH));
  const guidePlanes: GuidePlane[] = [];
  const guidePlaneBase = ptr + 36;
  for (let i = 0; i < depth; i++) {
    guidePlanes.push(readGuidePlane(h, guidePlaneBase + i * GUIDE_PLANE_SIZE));
  }
  return {
    lastHitPoint: readVec3(h, ptr + 0),
    missDirection: readVec3(h, ptr + 12),
    depth,
    guideRayIndex: h.readI32(ptr + 28),
    pathDistanceMeters: h.readF32(ptr + 32),
    guidePlanes,
  };
}

// ----------------------------------------------------------------------------
// ExaMirrorPosition { Vec3 position; int setupPlaneIndex; int depth; int planeType }
//   12 + 4 + 4 + 4 = 24
// ----------------------------------------------------------------------------
export interface MirrorPosition {
  position: Vec3;
  setupPlaneIndex: number;
  depth: number;
  planeType: number;
}
export const MIRROR_POSITION_SIZE = 24;

export function readMirrorPosition(h: Heap, ptr: number): MirrorPosition {
  return {
    position: readVec3(h, ptr + 0),
    setupPlaneIndex: h.readI32(ptr + 12),
    depth: h.readI32(ptr + 16),
    planeType: h.readI32(ptr + 20),
  };
}

// ----------------------------------------------------------------------------
// ExaPropagatorProfile — doubles + ints
//   6 * f64 (8) = 48
//   6 * i32 (4) = 24
// total = 72 bytes
// ----------------------------------------------------------------------------
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
export const PROPAGATOR_PROFILE_SIZE = 72;

export function readPropagatorProfile(h: Heap, ptr: number): PropagatorProfile {
  return {
    initMs: h.readF64(ptr + 0),
    guideRayMs: h.readF64(ptr + 8),
    sortPlaneMs: h.readF64(ptr + 16),
    directPathMs: h.readF64(ptr + 24),
    reflDiffMs: h.readF64(ptr + 32),
    totalMs: h.readF64(ptr + 40),
    reflectionCount: h.readI32(ptr + 48),
    diffractionCount: h.readI32(ptr + 52),
    setupPlaneTotal: h.readI32(ptr + 56),
    setupPlaneDiffraction: h.readI32(ptr + 60),
    pathCacheOverflowCount: h.readI32(ptr + 64),
    soundOutputOverflowCount: h.readI32(ptr + 68),
  };
}

// ----------------------------------------------------------------------------
// ExaPropagationJobTiming and related diagnostic frames.
// ----------------------------------------------------------------------------
export const PropagationThreadMode = {
  Single: 0,
  NativeMT: 1,
  WasmMT: 2,
} as const;
export type PropagationThreadModeValue =
  (typeof PropagationThreadMode)[keyof typeof PropagationThreadMode];

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
export type PropagationJobKindValue =
  (typeof PropagationJobKind)[keyof typeof PropagationJobKind];

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
// ExaPropagationJobTiming is declared after `#pragma pack(pop)` in exaSoundC.h.
// wasm clang aligns uint64_t fields to 8 bytes, so there is 4 bytes of padding
// after jobKind and the struct stride is 56 bytes.
export const PROPAGATION_JOB_TIMING_SIZE = 56;

export function readPropagationJobTiming(h: Heap, ptr: number): PropagationJobTiming {
  return {
    jobKind: h.readI32(ptr + 0),
    wallTimeNs: readU64(h, ptr + 8),
    workerTotalNs: readU64(h, ptr + 16),
    workerMaxNs: readU64(h, ptr + 24),
    scheduleWaitNs: readU64(h, ptr + 32),
    invocationCount: h.readU32(ptr + 40),
    workItemCount: h.readU32(ptr + 44),
    partitionCount: h.readU32(ptr + 48),
    activeWorkerCount: h.readU32(ptr + 52),
  };
}

export interface PropagationFrameTiming {
  frameSequence: number;
  sceneID: number;
  listenerID: number;
  threadMode: number | null;
  propagationThreadCount: number;
  jobs: PropagationJobTiming[];
}
export const PROPAGATION_FRAME_TIMING_SIZE =
  24 + EXA_PROPAGATION_JOB_TIMING_MAX_JOBS * PROPAGATION_JOB_TIMING_SIZE;

export function readPropagationFrameTiming(h: Heap, ptr: number): PropagationFrameTiming {
  const jobCount = Math.max(
    0,
    Math.min(h.readI32(ptr + 20), EXA_PROPAGATION_JOB_TIMING_MAX_JOBS),
  );
  const jobs: PropagationJobTiming[] = [];
  for (let i = 0; i < jobCount; i++) {
    jobs.push(readPropagationJobTiming(h, ptr + 24 + i * PROPAGATION_JOB_TIMING_SIZE));
  }
  return {
    frameSequence: readU64(h, ptr + 0),
    sceneID: h.readI32(ptr + 8),
    listenerID: h.readI32(ptr + 12),
    // ExaPropagationFrameTiming does not expose threadMode in the C diagnostics API.
    threadMode: null,
    propagationThreadCount: h.readI32(ptr + 16),
    jobs,
  };
}

export interface PropagationJobTimingOption {
  enabled: boolean;
  frameCapacity: number;
}
export const PROPAGATION_JOB_TIMING_OPTION_SIZE = 8;

export function writePropagationJobTimingOption(
  h: Heap,
  ptr: number,
  o: PropagationJobTimingOption,
): void {
  h.writeI32(ptr + 0, o.enabled ? 1 : 0);
  h.writeI32(ptr + 4, o.frameCapacity);
}

// ----------------------------------------------------------------------------
// ExaMemoryTraceOption { int enabled; int writeLog; int writeCsv; int flushEvery;
//                        char csvPath[260] }
//   4*4 + 260 = 276 bytes (pad to 4 → 276 already /4)
// ----------------------------------------------------------------------------
export interface MemoryTraceOption {
  enabled: boolean;
  writeLog: boolean;
  writeCsv: boolean;
  flushEvery: number;
  csvPath: string;
}
export const MEMORY_TRACE_OPTION_SIZE = 276;

export function writeMemoryTraceOption(h: Heap, ptr: number, o: MemoryTraceOption): void {
  h.writeI32(ptr + 0, o.enabled ? 1 : 0);
  h.writeI32(ptr + 4, o.writeLog ? 1 : 0);
  h.writeI32(ptr + 8, o.writeCsv ? 1 : 0);
  h.writeI32(ptr + 12, o.flushEvery);
  const enc = new TextEncoder().encode(o.csvPath);
  const n = Math.min(enc.length, 259);
  h.writeBytes(ptr + 16, enc.subarray(0, n));
  h.writeU8(ptr + 16 + n, 0);
}

// ----------------------------------------------------------------------------
// ExaMemoryTraceSnapshot { int tagCount; long long bytes[EXA_MEMORY_TAG_COUNT] }
//   4 + 4 pad + 8*9 = 80 bytes
// ----------------------------------------------------------------------------
export interface MemoryTraceSnapshot { tagCount: number; bytes: number[] }
export const MEMORY_TRACE_SNAPSHOT_SIZE = 80;

export function readMemoryTraceSnapshot(h: Heap, ptr: number): MemoryTraceSnapshot {
  const bytes: number[] = [];
  for (let i = 0; i < EXA_MEMORY_TAG_COUNT; i++) {
    bytes.push(readU64(h, ptr + 8 + i * 8));
  }
  return { tagCount: h.readI32(ptr + 0), bytes };
}

// ----------------------------------------------------------------------------
// ExaPathData — the largest struct
//   Vec3 pos[EXA_MAX_DEPTH+1]    = 17 * 12 = 204
//   int maxDepth                 = 4
//   int pathKind                 = 4
//   int soundSourceIndex         = 4
//   bool isDynamic + 3 pad       = 4
//   float totalDistance          = 4
//   float toa_ms                 = 4
//   float energy_avg             = 4
//   float finalEnergy[8]         = 32
//   float energyPerBand[17][8]   = 544
//   int hitMaterialId[16]        = 64
//   float hitAbsorption[16][8]   = 512
// total = 204 + 4*4 + 4*3 + 32 + 544 + 64 + 512 = 1384 bytes
// ----------------------------------------------------------------------------
export interface PathData {
  points: Vec3[];
  maxDepth: number;
  pathKind: number;         // 0=direct, 1=reflection, 2=diffraction, 3=reverb
  soundSourceIndex: number;
  isDynamic: boolean;
  totalDistance: number;
  toaMs: number;
  energyAvg: number;
  finalEnergy: Float32Array;       // 8
  energyPerBand: Float32Array[];   // 17 × 8
  hitMaterialId: Int32Array;       // 16
  hitAbsorption: Float32Array[];   // 16 × 8
}
export const PATH_DATA_SIZE = 1384;

export function readPathData(h: Heap, ptr: number): PathData {
  const points: Vec3[] = [];
  for (let i = 0; i < EXA_MAX_DEPTH + 1; i++) {
    points.push(readVec3(h, ptr + i * 12));
  }
  const base1 = ptr + 204;             // maxDepth
  const energyPerBandOff = base1 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 32;  // 228..
  const hitMatOff = energyPerBandOff + 544;
  const hitAbsOff = hitMatOff + 64;

  const energyPerBand: Float32Array[] = [];
  for (let d = 0; d < EXA_MAX_DEPTH + 1; d++) {
    energyPerBand.push(h.readF32Array(energyPerBandOff + d * 32, 8));
  }
  const hitAbsorption: Float32Array[] = [];
  for (let d = 0; d < EXA_MAX_DEPTH; d++) {
    hitAbsorption.push(h.readF32Array(hitAbsOff + d * 32, 8));
  }

  return {
    points,
    maxDepth: h.readI32(base1 + 0),
    pathKind: h.readI32(base1 + 4),
    soundSourceIndex: h.readI32(base1 + 8),
    isDynamic: h.readBool(base1 + 12),
    totalDistance: h.readF32(base1 + 16),
    toaMs: h.readF32(base1 + 20),
    energyAvg: h.readF32(base1 + 24),
    finalEnergy: h.readF32Array(base1 + 28, 8),
    energyPerBand,
    hitMaterialId: h.readI32Array(hitMatOff, 16),
    hitAbsorption,
  };
}
