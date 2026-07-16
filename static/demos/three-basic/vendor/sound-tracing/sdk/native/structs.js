// ============================================================================
// Struct layouts mirror the explicit fixed-width DTO layout of exaSoundC.h
// (the frozen C-ABI v0.7.0 / EXA_ABI_VERSION 4 clean break — no pragma pack;
// every field is aligned by construction with explicit padding). Field offsets
// are hand-verified against the frozen header — keep in sync if the header
// changes (a mismatch is silent memory corruption). Layout guard:
// tests/abi-layout.test.mjs. See ADR-0005 (engineer workspace) for the break.
// ============================================================================
// ---- Constants (in sync with exaSoundC.h / engine_config.h) ----
export const EXA_MAX_DEPTH = 16;
export const EXA_MAX_FREQUENCY_COUNT = 8;
export const EXA_MEMORY_TAG_COUNT = 9;
/** MAX_DYNAMIC_SOUNDSOURCE(16) */
export const EXA_MAX_SOUNDSOURCE = 16;
export const EXA_ABI_VERSION = 4;
export const EXA_MAX_PATH_CACHE_SIZE = 16384;
// ---- Path types (EXA_PATH_*) — valid range [0, EXA_PATH_COUNT) -------------
// TRANSMISSION is official as of v0.7. NOTE: the legacy exaGetPathTypeCount()
// native call predates TRANSMISSION and still returns 4; EXA_PATH_COUNT is the
// authoritative compile-time count.
export const EXA_PATH_DIRECT = 0;
export const EXA_PATH_REFLECTION = 1;
export const EXA_PATH_DIFFRACTION = 2;
export const EXA_PATH_REVERB = 3;
export const EXA_PATH_TRANSMISSION = 4;
export const EXA_PATH_COUNT = 5;
// ---- Propagation presets (exaListenerApplyPreset) ---------------------------
// INVERTED scale: 1 = best (ULTRA) … 5 = fastest (LOWEST); 0 = no-op.
// Do not confuse with the render path budgets below (larger = higher quality).
export const EXA_PRESET_DEFAULT = 0;
export const EXA_PRESET_ULTRA = 1;
export const EXA_PRESET_HIGH = 2;
export const EXA_PRESET_MEDIUM = 3;
export const EXA_PRESET_LOW = 4;
export const EXA_PRESET_LOWEST = 5;
// ---- Listener output modes (exaListenerSet/GetOutputMode) -------------------
// EXA_OUTPUT_MODE_HRTF (default) keeps the binaural/HRTF renderer; SPEAKER
// selects the internal Ambisonic speaker renderer (1ch center / 2ch stereo
// scope). HRTF modes/assets apply to HRTF output only. Added core 7efb8b87.
export const EXA_OUTPUT_MODE_HRTF = 0;
export const EXA_OUTPUT_MODE_SPEAKER = 1;
// ---- HRTF spatializer modes (exaListenerSetHrtfMode) ------------------------
// Vendor-neutral v0.7 names. BAND8 needs no table; PARAMETRIC needs a BPH1
// table; HRIR / HRIR_INTERPOLATED share one MPI1 min-phase table (a legacy
// SAH1 table satisfies HRIR_INTERPOLATED only). Load tables through the single
// magic-sniffing exaListenerLoadHrtf.
export const EXA_HRTF_MODE_BAND8 = 0;
export const EXA_HRTF_MODE_PARAMETRIC = 1;
export const EXA_HRTF_MODE_HRIR = 2;
export const EXA_HRTF_MODE_HRIR_INTERPOLATED = 3;
// Bit flags reported by exaListenerGetLoadedHrtfKinds.
export const EXA_HRTF_KIND_PARAMETRIC = 1 << EXA_HRTF_MODE_PARAMETRIC;
export const EXA_HRTF_KIND_HRIR = 1 << EXA_HRTF_MODE_HRIR;
export const EXA_HRTF_KIND_HRIR_INTERPOLATED = 1 << EXA_HRTF_MODE_HRIR_INTERPOLATED;
// ---- Render path budgets (raw top-K counts; larger = higher quality) --------
// Documented operating points for exaListenerSet{Diffuse,Hrtf}PathBudget —
// the same internal points the pre-v0.7 LOW/MED/HIGH quality levels mapped to.
export const EXA_DIFFUSE_BUDGET_LOW = 128;
export const EXA_DIFFUSE_BUDGET_MED = 512;
export const EXA_DIFFUSE_BUDGET_HIGH = 1024;
export const EXA_HRTF_BUDGET_LOW = 4;
export const EXA_HRTF_BUDGET_MED = 16;
export const EXA_HRTF_BUDGET_HIGH = 32;
export const EXA_MAX_VALIDPATH_COUNT = 128;
export const EXA_LISTENER_WIDTH = 32;
export const EXA_LISTENER_HEIGHT = 32;
export const EXA_SOUND_WIDTH = 16;
export const EXA_SOUND_HEIGHT = 8;
export const EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES = 256;
export const EXA_PROPAGATION_JOB_TIMING_MAX_JOBS = 16;
function readU64(h, ptr) {
    const lo = h.readU32(ptr + 0);
    const hi = h.readU32(ptr + 4);
    return hi * 0x1_0000_0000 + lo;
}
export const VEC3_SIZE = 12;
export function writeVec3(h, ptr, v) {
    h.writeF32(ptr + 0, v.x);
    h.writeF32(ptr + 4, v.y);
    h.writeF32(ptr + 8, v.z);
}
export function readVec3(h, ptr) {
    return { x: h.readF32(ptr + 0), y: h.readF32(ptr + 4), z: h.readF32(ptr + 8) };
}
// ----------------------------------------------------------------------------
// ExaMat3x3f { Vec3 x,y,z } → 36 bytes (three row vectors)
// ----------------------------------------------------------------------------
export const MAT3X3_SIZE = 36;
export const RAY_SIZE = 28;
export function writeRay(h, ptr, r) {
    writeVec3(h, ptr + 0, r.origin);
    writeVec3(h, ptr + 12, r.dir);
    h.writeF32(ptr + 24, r.dist);
}
export function readRay(h, ptr) {
    return {
        origin: readVec3(h, ptr + 0),
        dir: readVec3(h, ptr + 12),
        dist: h.readF32(ptr + 24),
    };
}
export const RAYHIT_SIZE = 88;
export function readRayHit(h, ptr) {
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
export const AUDIO_OPTION_SIZE = 28;
export function writeAudioOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? AUDIO_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeU32(ptr + 8, o.sampleRate);
    h.writeU32(ptr + 12, o.inputSampleCount);
    h.writeU32(ptr + 16, o.outputChannels);
    h.writeU32(ptr + 20, o.reserved?.[0] ?? 0);
    h.writeU32(ptr + 24, o.reserved?.[1] ?? 0);
}
export function readAudioOption(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        sampleRate: h.readU32(ptr + 8),
        inputSampleCount: h.readU32(ptr + 12),
        outputChannels: h.readU32(ptr + 16),
        reserved: [h.readU32(ptr + 20), h.readU32(ptr + 24)],
    };
}
export const AMBIENT_PHYSICAL_FILTER_OPTION_SIZE = 36;
export function defaultAmbientPhysicalFilterOption() {
    return {
        structSize: AMBIENT_PHYSICAL_FILTER_OPTION_SIZE,
        version: EXA_ABI_VERSION,
        enabled: false,
        airAbsorptionDistanceMeters: 0,
    };
}
export function writeAmbientPhysicalFilterOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? AMBIENT_PHYSICAL_FILTER_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeI32(ptr + 8, o.enabled ? 1 : 0);
    h.writeF32(ptr + 12, o.airAbsorptionDistanceMeters);
    for (let i = 0; i < 5; i++)
        h.writeU32(ptr + 16 + i * 4, o.reserved?.[i] ?? 0);
}
export function readAmbientPhysicalFilterOption(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        enabled: h.readI32(ptr + 8) !== 0,
        airAbsorptionDistanceMeters: h.readF32(ptr + 12),
        reserved: [0, 1, 2, 3, 4].map((i) => h.readU32(ptr + 16 + i * 4)),
    };
}
export const AIR_ABSORPTION_OPTION_SIZE = 40;
export function defaultAirAbsorptionOption() {
    return {
        structSize: AIR_ABSORPTION_OPTION_SIZE,
        version: EXA_ABI_VERSION,
        enabled: true,
        temperatureCelsius: 20,
        relativeHumidityPercent: 50,
        pressurePa: 101325,
    };
}
export function writeAirAbsorptionOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? AIR_ABSORPTION_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeI32(ptr + 8, o.enabled ? 1 : 0);
    h.writeF32(ptr + 12, o.temperatureCelsius);
    h.writeF32(ptr + 16, o.relativeHumidityPercent);
    h.writeF32(ptr + 20, o.pressurePa);
    for (let i = 0; i < 4; i++)
        h.writeU32(ptr + 24 + i * 4, o.reserved?.[i] ?? 0);
}
export function readAirAbsorptionOption(h, ptr) {
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
export const PERCEPTUAL_DEPTH_OPTION_SIZE = 36;
export function defaultPerceptualDepthOption() {
    return {
        structSize: PERCEPTUAL_DEPTH_OPTION_SIZE,
        version: EXA_ABI_VERSION,
        enabled: false,
        audibilityThreshold: 0,
        maxDeltaPerFrame: 1,
    };
}
export function writePerceptualDepthOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? PERCEPTUAL_DEPTH_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeI32(ptr + 8, o.enabled ? 1 : 0);
    h.writeF32(ptr + 12, o.audibilityThreshold);
    h.writeI32(ptr + 16, o.maxDeltaPerFrame);
    for (let i = 0; i < 4; i++)
        h.writeU32(ptr + 20 + i * 4, o.reserved?.[i] ?? 0);
}
export function readPerceptualDepthOption(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        enabled: h.readI32(ptr + 8) !== 0,
        audibilityThreshold: h.readF32(ptr + 12),
        maxDeltaPerFrame: h.readI32(ptr + 16),
        reserved: [0, 1, 2, 3].map((i) => h.readU32(ptr + 20 + i * 4)),
    };
}
export const RUNTIME_OPTION_SIZE = 28;
export function writeRuntimeOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? RUNTIME_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeI32(ptr + 8, o.propagationThreadCount);
    h.writeU32(ptr + 12, o.reserved?.[0] ?? 0);
    h.writeU32(ptr + 16, o.reserved?.[1] ?? 0);
    h.writeU32(ptr + 20, o.reserved?.[2] ?? 0);
    h.writeU32(ptr + 24, o.reserved?.[3] ?? 0);
}
export function readRuntimeOption(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        propagationThreadCount: h.readI32(ptr + 8),
        reserved: [h.readU32(ptr + 12), h.readU32(ptr + 16), h.readU32(ptr + 20), h.readU32(ptr + 24)],
    };
}
export const MESH_BUILD_OPTION_SIZE = 32;
export function writeMeshBuildOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? MESH_BUILD_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeI32(ptr + 8, o.bvhType);
    h.writeI32(ptr + 12, o.bvhMaxDepth);
    h.writeU32(ptr + 16, o.primPerLeaf);
    h.writeU32(ptr + 20, o.reserved?.[0] ?? 0);
    h.writeU32(ptr + 24, o.reserved?.[1] ?? 0);
    h.writeU32(ptr + 28, o.reserved?.[2] ?? 0);
}
export function readMeshBuildOption(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        bvhType: h.readI32(ptr + 8),
        bvhMaxDepth: h.readI32(ptr + 12),
        primPerLeaf: h.readU32(ptr + 16),
        reserved: [h.readU32(ptr + 20), h.readU32(ptr + 24), h.readU32(ptr + 28)],
    };
}
export const LISTENER_OPTION_SIZE = 52;
/** Engine header defaults — matches C++ `ExaListenerOption{}` zero-init +
 *  documented defaults. Grid/depth are NOT here (single writers, D-14). */
export function defaultListenerOption() {
    return {
        structSize: LISTENER_OPTION_SIZE,
        version: EXA_ABI_VERSION,
        guideRayMethod: 0,
        seedValue: 0,
        maxSoundSource: EXA_MAX_SOUNDSOURCE,
        pathCacheSize: EXA_MAX_PATH_CACHE_SIZE,
        enableEnergyBasedTermination: false,
        enableAmbientSoundPath: false,
        energyThreshold: 0.001,
        samePlaneEpsilonDist: 0.001,
        samePlaneEpsilonNormal: 0.999,
        reserved: [0, 0],
    };
}
export function writeListenerOption(h, ptr, o) {
    h.writeU32(ptr + 0, o.structSize ?? LISTENER_OPTION_SIZE);
    h.writeU32(ptr + 4, o.version ?? EXA_ABI_VERSION);
    h.writeU8(ptr + 8, o.guideRayMethod);
    h.writeU8(ptr + 9, 0);
    h.writeU8(ptr + 10, 0);
    h.writeU8(ptr + 11, 0);
    h.writeU32(ptr + 12, o.seedValue);
    h.writeU16(ptr + 16, o.maxSoundSource & 0xffff);
    h.writeU16(ptr + 18, o.pathCacheSize & 0xffff);
    h.writeI32(ptr + 20, o.enableEnergyBasedTermination ? 1 : 0);
    h.writeI32(ptr + 24, o.enableAmbientSoundPath ? 1 : 0);
    h.writeF32(ptr + 28, o.energyThreshold);
    h.writeF32(ptr + 32, o.samePlaneEpsilonDist);
    h.writeF32(ptr + 36, o.samePlaneEpsilonNormal);
    // @40 = float sceneRatio. 0 = "use the core default 1.0".
    h.writeF32(ptr + 40, o.sceneRatio ?? 0);
    h.writeU32(ptr + 44, o.reserved?.[0] ?? 0);
    h.writeU32(ptr + 48, o.reserved?.[1] ?? 0);
}
export function readListenerOption(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        guideRayMethod: h.readU8(ptr + 8),
        seedValue: h.readU32(ptr + 12),
        maxSoundSource: h.readU16(ptr + 16),
        pathCacheSize: h.readU16(ptr + 18),
        enableEnergyBasedTermination: h.readI32(ptr + 20) !== 0,
        enableAmbientSoundPath: h.readI32(ptr + 24) !== 0,
        energyThreshold: h.readF32(ptr + 28),
        samePlaneEpsilonDist: h.readF32(ptr + 32),
        samePlaneEpsilonNormal: h.readF32(ptr + 36),
        sceneRatio: h.readF32(ptr + 40),
        reserved: [h.readU32(ptr + 44), h.readU32(ptr + 48)],
    };
}
/** Engine defaults as a preset — depth 16, 32×32 grid. */
export function defaultTracePreset() {
    return {
        ...defaultListenerOption(),
        maxDepth: EXA_MAX_DEPTH,
        listenerWidth: EXA_LISTENER_WIDTH,
        listenerHeight: EXA_LISTENER_HEIGHT,
    };
}
/** Runtime-friendly defaults for browser scenes. */
export function recommendedTracePreset() {
    return { ...defaultTracePreset(), maxDepth: 3, listenerWidth: 16, listenerHeight: 16 };
}
/** `quality: 'fast'` — lightest. depth 4, 16×16 grid. */
export function speedTracePreset() {
    return { ...defaultTracePreset(), maxDepth: 4, listenerWidth: 16, listenerHeight: 16 };
}
/** `quality: 'balanced'` (facade default) — depth 8, 24×24 grid. */
export function balancedTracePreset() {
    return { ...defaultTracePreset(), maxDepth: 8, listenerWidth: 24, listenerHeight: 24 };
}
/** `quality: 'quality'` — heaviest shipped tier. depth 12, 32×32 grid. */
export function qualityTracePreset() {
    return { ...defaultTracePreset(), maxDepth: 12, listenerWidth: 32, listenerHeight: 32 };
}
export const MATERIAL_SIZE = 100;
export function writeMaterial(h, ptr, m) {
    h.writeF32Array(ptr + 0, m.reflection);
    h.writeF32Array(ptr + 32, m.absorption);
    h.writeF32Array(ptr + 64, m.transmission);
    h.writeF32(ptr + 96, m.scattering);
}
export function readMaterial(h, ptr) {
    return {
        reflection: h.readF32Array(ptr + 0, 8),
        absorption: h.readF32Array(ptr + 32, 8),
        transmission: h.readF32Array(ptr + 64, 8),
        scattering: h.readF32(ptr + 96),
    };
}
export const TRIANGLE_SIZE = 16;
export function writeTriangles(h, ptr, tris) {
    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        const off = ptr + i * TRIANGLE_SIZE;
        h.writeU32(off + 0, t.a);
        h.writeU32(off + 4, t.b);
        h.writeU32(off + 8, t.c);
        h.writeU32(off + 12, t.materialIndex);
    }
}
/** ABI bound: vertex/triangle counts and indices are marshalled as C `uint32_t`. */
const MAX_MESH_U32 = 0xffffffff;
/**
 * Validate mesh geometry before it is written into the (memory-unsafe C++) WASM
 * heap. Triangle indices are consumed by the core's BVH and triangle lookups, so
 * an index outside `[0, numVerts)` — or a negative / non-integer index — is an
 * out-of-bounds access in native code. Counts are bounded to the C-ABI `uint32_t`
 * range so the values handed to `exaMeshSetData` cannot truncate.
 *
 * Callers MUST invoke this before allocating/writing the vertex and triangle
 * buffers (see `SoundMesh.setData` and the worker `createMesh` adapter).
 *
 * @throws if numVerts or any triangle index / materialIndex is out of range.
 */
export function validateMeshGeometry(numVerts, tris) {
    if (!Number.isInteger(numVerts) || numVerts < 0) {
        throw new Error(`[soundtrace.js] mesh vertex count must be a non-negative integer (got ${numVerts})`);
    }
    if (numVerts > MAX_MESH_U32) {
        throw new Error(`[soundtrace.js] mesh vertex count ${numVerts} exceeds the maximum of ${MAX_MESH_U32}`);
    }
    if (tris.length > MAX_MESH_U32) {
        throw new Error(`[soundtrace.js] mesh triangle count ${tris.length} exceeds the maximum of ${MAX_MESH_U32}`);
    }
    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        validateTriangleIndex(t.a, i, 'a', numVerts);
        validateTriangleIndex(t.b, i, 'b', numVerts);
        validateTriangleIndex(t.c, i, 'c', numVerts);
        if (!Number.isInteger(t.materialIndex) || t.materialIndex < 0) {
            throw new Error(`[soundtrace.js] triangle[${i}].materialIndex must be a non-negative integer (got ${t.materialIndex})`);
        }
    }
}
function validateTriangleIndex(value, triIndex, label, numVerts) {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`[soundtrace.js] triangle[${triIndex}].${label} must be a non-negative integer (got ${value})`);
    }
    if (value >= numVerts) {
        throw new Error(`[soundtrace.js] triangle[${triIndex}].${label} index ${value} out of range [0, ${numVerts})`);
    }
}
export const RENDER_STATS_SIZE = 60;
/** Zero the struct and stamp structSize/version — the required pre-call state
 *  for exaRenderGetStats' versioned-header validation. */
export function writeRenderStatsHeader(h, ptr) {
    for (let off = 0; off < RENDER_STATS_SIZE; off += 4)
        h.writeU32(ptr + off, 0);
    h.writeU32(ptr + 0, RENDER_STATS_SIZE);
    h.writeU32(ptr + 4, EXA_ABI_VERSION);
}
export function readRenderStats(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        pathDelayMinSeconds: h.readF32(ptr + 8),
        pathDelayMaxSeconds: h.readF32(ptr + 12),
        pathDelayAvgSeconds: h.readF32(ptr + 16),
        droppedPathCount: h.readU32(ptr + 20),
        renderFailNullOrZeroArg: h.readU32(ptr + 24),
        renderFailConfigGateMismatch: h.readU32(ptr + 28),
        renderFailResultMismatch: h.readU32(ptr + 32),
        renderFailNonFiniteOutput: h.readU32(ptr + 36),
        dryBypassCount: h.readU32(ptr + 40),
    };
}
export const IR_SIZE = 40;
export function readIR(h, ptr) {
    return {
        energyPerBand: h.readF32Array(ptr + 0, EXA_MAX_FREQUENCY_COUNT),
        toaMs: h.readF32(ptr + 32),
        pathType: h.readU32(ptr + 36),
    };
}
export const GPU_PROPAGATION_STATS_SIZE = 28;
/** Zero the struct and stamp structSize/version — the required pre-call state
 *  for exaPropagatorGetGpuStats' versioned-header validation. */
export function writeGpuPropagationStatsHeader(h, ptr) {
    for (let off = 0; off < GPU_PROPAGATION_STATS_SIZE; off += 4)
        h.writeU32(ptr + off, 0);
    h.writeU32(ptr + 0, GPU_PROPAGATION_STATS_SIZE);
    h.writeU32(ptr + 4, EXA_ABI_VERSION);
}
export function readGpuPropagationStats(h, ptr) {
    return {
        structSize: h.readU32(ptr + 0),
        version: h.readU32(ptr + 4),
        dispatchCount: h.readU32(ptr + 8),
        readyCount: h.readU32(ptr + 12),
        cpuFallbackCount: h.readU32(ptr + 16),
    };
}
export const GUIDE_PLANE_SIZE = 52;
export function readGuidePlane(h, ptr) {
    return {
        vertices: [readVec3(h, ptr + 0), readVec3(h, ptr + 12), readVec3(h, ptr + 24)],
        normal: readVec3(h, ptr + 36),
        depth: h.readI32(ptr + 48),
    };
}
export const AMBIENT_SOUND_PATH_SIZE = 868;
export function readAmbientSoundPath(h, ptr) {
    const depth = Math.max(0, Math.min(h.readI32(ptr + 24), EXA_MAX_DEPTH));
    const guidePlanes = [];
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
export const MIRROR_POSITION_SIZE = 24;
export function readMirrorPosition(h, ptr) {
    return {
        position: readVec3(h, ptr + 0),
        setupPlaneIndex: h.readI32(ptr + 12),
        depth: h.readI32(ptr + 16),
        planeType: h.readI32(ptr + 20),
    };
}
export const PROPAGATOR_PROFILE_SIZE = 72;
export function readPropagatorProfile(h, ptr) {
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
// ExaPropagationJobTiming is declared after `#pragma pack(pop)` in exaSoundC.h.
// wasm clang aligns uint64_t fields to 8 bytes, so there is 4 bytes of padding
// after jobKind and the struct stride is 56 bytes.
export const PROPAGATION_JOB_TIMING_SIZE = 56;
export function readPropagationJobTiming(h, ptr) {
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
export const PROPAGATION_FRAME_TIMING_SIZE = 24 + EXA_PROPAGATION_JOB_TIMING_MAX_JOBS * PROPAGATION_JOB_TIMING_SIZE;
export function readPropagationFrameTiming(h, ptr) {
    const jobCount = Math.max(0, Math.min(h.readI32(ptr + 20), EXA_PROPAGATION_JOB_TIMING_MAX_JOBS));
    const jobs = [];
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
export const PROPAGATION_JOB_TIMING_OPTION_SIZE = 8;
export function writePropagationJobTimingOption(h, ptr, o) {
    h.writeI32(ptr + 0, o.enabled ? 1 : 0);
    h.writeI32(ptr + 4, o.frameCapacity);
}
export const MEMORY_TRACE_OPTION_SIZE = 276;
export function writeMemoryTraceOption(h, ptr, o) {
    h.writeI32(ptr + 0, o.enabled ? 1 : 0);
    h.writeI32(ptr + 4, o.writeLog ? 1 : 0);
    h.writeI32(ptr + 8, o.writeCsv ? 1 : 0);
    h.writeI32(ptr + 12, o.flushEvery);
    const enc = new TextEncoder().encode(o.csvPath);
    const n = Math.min(enc.length, 259);
    h.writeBytes(ptr + 16, enc.subarray(0, n));
    h.writeU8(ptr + 16 + n, 0);
}
export const MEMORY_TRACE_SNAPSHOT_SIZE = 80;
export function readMemoryTraceSnapshot(h, ptr) {
    const bytes = [];
    for (let i = 0; i < EXA_MEMORY_TAG_COUNT; i++) {
        bytes.push(readU64(h, ptr + 8 + i * 8));
    }
    return { tagCount: h.readI32(ptr + 0), bytes };
}
export const PATH_DATA_SIZE = 1384;
export function readPathData(h, ptr) {
    const points = [];
    for (let i = 0; i < EXA_MAX_DEPTH + 1; i++) {
        points.push(readVec3(h, ptr + i * 12));
    }
    const base1 = ptr + 204; // maxDepth
    const energyPerBandOff = base1 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 32; // 228..
    const hitMatOff = energyPerBandOff + 544;
    const hitAbsOff = hitMatOff + 64;
    const energyPerBand = [];
    for (let d = 0; d < EXA_MAX_DEPTH + 1; d++) {
        energyPerBand.push(h.readF32Array(energyPerBandOff + d * 32, 8));
    }
    const hitAbsorption = [];
    for (let d = 0; d < EXA_MAX_DEPTH; d++) {
        hitAbsorption.push(h.readF32Array(hitAbsOff + d * 32, 8));
    }
    return {
        points,
        maxDepth: h.readI32(base1 + 0),
        pathKind: h.readI32(base1 + 4),
        soundSourceIndex: h.readI32(base1 + 8),
        isDynamic: h.readI32(base1 + 12) !== 0, // ExaBool is int32 in v0.7
        totalDistance: h.readF32(base1 + 16),
        toaMs: h.readF32(base1 + 20),
        energyAvg: h.readF32(base1 + 24),
        finalEnergy: h.readF32Array(base1 + 28, 8),
        energyPerBand,
        hitMaterialId: h.readI32Array(hitMatOff, 16),
        hitAbsorption,
    };
}
//# sourceMappingURL=structs.js.map