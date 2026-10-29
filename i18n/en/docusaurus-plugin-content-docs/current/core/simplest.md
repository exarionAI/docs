---
sidebar_position: 1
title: SimpleST
description: SimpleST, the current native engine of Sound Tracing — C++20 geometric-acoustics core, 2-DLL public C ABI (ABI 6), 9-band materials, Hybrid early reflections, parametric EQ, host pull render.
---

# SimpleST

**SimpleST** is the current native engine of the Sound Tracing product family. It is a C++20
library that geometrically computes direct, transmission, reflection, and diffraction paths plus
late-reverb statistics from meshes, materials, sources, and a listener, and synthesizes the result
as real-time spatial audio or as a deterministic impulse response (IR). It replaces the
previous-generation engine [STCoreV2](./stcorev2.md), and every SDK and middleware plug-in runs on
top of its public C ABI.

![Engine pipeline](/img/core/pipeline-overview.png)

## Overview

| Item | Value |
|---|---|
| Engine version | **2.22.0** (`ST_VERSION_STRING`), SDK release 2.22.0-jhj.5. Previous SDK releases: 2.18.2-jhj.7 (engine 2.18.2), 2.12.0 |
| Public ABI | **ABI 6** (`ST_ABI_VERSION`, 3.0 clean break). All changes since 2.12.0 are additive |
| Primary language | C++20 (C ABI exposed, C11-header compatible) |
| Build system | CMake 3.21+ · platform entry point `mainBuild.sh` |
| Platforms | Windows x64 · macOS Universal · Linux x86_64 · Android (arm64-v8a/armeabi-v7a/x86_64) · iOS (device/simulator) · Web (Emscripten, pthreads) |
| Distribution | Real-time DLL `SimpleSTRealtime` + offline DLL `SimpleSTOffline` (static libraries on iOS/Web) |
| Sample rate | Fixed 44.1 kHz inside the engine; host rates converted by the built-in resampler |
| Bands | 9 octave bands `63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz` |
| Acceleration structure | TinyBVH (default) · BinnedSAH · HybridKD · LBVH · LBVH_SIMD |
| Tests | Regression harness `SimpleST_demo` + about 110 CTest targets |

## Architecture

```text
SceneManager → STPropagator → STIRConverter ─┬→ STOnlineAuralizator  (realtime stream)
                                             └→ STOfflineAuralizator (deterministic RIR / band IR)
```

- **SceneManager** — owns meshes, materials, sources, the listener, and the TLAS/BLAS. Static
  geometry is built once; dynamic objects only get their transforms updated.
- **STPropagator** — the geometry-only stage. It finds direct/transmission/reflection/diffraction
  paths and computes the room statistics for the late reverb (mean free path, surface area,
  material distribution) and the source transport (diffuse transport) rays. No acoustic gain is
  computed here.
- **STIRConverter** — converts geometry into the acoustic domain. Delay, Doppler slope, 9-band
  energy gain, distance/air attenuation, UTD diffraction, the reverb send tap, and the HOA3 early
  bed aggregation are all decided here.
- **Auralizator** — two renderers on top of a shared executor. The real-time renderer processes
  9-band crossover → band delay ring → path taps (Doppler/fade) → spatialization (panning /
  MIT KEMAR / SADIE II D2 HRIR) → FDN16 late reverb → limiter, in that order.

![The three engine shells](/img/core/engine-shells.png)

There are three engine shells.

| Shell | Purpose |
|---|---|
| `STRealTimeEngine` | Synchronous propagation + audio render. Diagnostics and compatibility |
| `STRealTimeMultiEngine` | Propagator/IRConverter workers with a latest-only triple buffer. **Real-time default** |
| `STOfflineEngine` | Builds a canonical IR cache once and deterministically derives Raw energy / pressure IR / binaural IR from it |

## Public C ABI

The public ABI is physically split into two DLLs; the shared PODs live in `STTypes.h`.

| Header | Context | Function prefix | Role |
|---|---|---|---|
| `SimpleST/ABI/STRealtime.h` | `STRT_Context*` | `st_rt_*` | Real-time propagation + audio render (181 exports) |
| `SimpleST/ABI/STOffline.h` | `STOFF_Context*` | `st_off_*` | Offline IR computation and render (121 exports) |
| `SimpleST/ABI/STTypes.h` | — | `ST_*` | Shared PODs, enums, capability bits |

The naming rule is `st_<dll>_<family>_<verb>[_<what>]`, where family is one of
`scene / mesh / object / material / source / listener / render / debug / ir`.
Context lifecycle, build, and global policy functions have no family.

### Entity handles

Mesh, object, source, listener, and material ids are distinct struct types. Their size and calling
convention match `int32_t`, but mixing the kinds is a compile error.

```c
typedef struct STMeshId     { int32_t v; } STMeshId;
typedef struct STObjectId   { int32_t v; } STObjectId;
typedef struct STSourceId   { int32_t v; } STSourceId;
typedef struct STListenerId { int32_t v; } STListenerId;
typedef struct STMaterialId { int32_t v; } STMaterialId;
```

Create functions return the handle by value and **failure is `v < 0`**. `0` is a valid id.

### Real-time function families

| family | Representative functions |
|---|---|
| Lifecycle | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_api_version`, `st_rt_get_version_string`, `st_rt_get_capabilities`, `st_rt_get_capability_word`, `st_rt_get_last_status/error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create` (one material or per-triangle material indices), `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| scene | `st_rt_scene_set_accel`, `st_rt_scene_set_triangle_intersection`, `st_rt_scene_get_stats`, `st_rt_scene_raycast` |
| source | `st_rt_source_create`, `set_position/direction/velocity`, `set_orientation_q`, `set_directivity`, `set_axis_attenuation`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_ray_count`, `set_depth`, `set_transport_refresh_steps`, `set_parametric_eq` / `set_eq` (source EQ) |
| source audio input | `st_rt_source_set_audio_file` (WAV/FLAC/MP3/Ogg), `st_rt_source_attach_stream` + `write_stream` + `get_stream_status` (host PCM), `st_rt_source_set_audio_clip` / `set_audio_clip_asset` (cached clip), `clear_audio` |
| source playback control | `st_rt_source_play/pause/stop/seek`, `set_volume` (linear 0 ~ 16), `set_pitch` (0.25 ~ 4), `set_loop_count`, `st_rt_source_trigger`, `set_retrigger_interval` |
| listener | `st_rt_listener_set_position/velocity/rotation`, `set_rotation_ypr`, `set_orientation_q` (2.22, includes head roll), `set_ray_count`, `set_ray_sampling_method` |
| Propagation | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_transmission_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| Acoustic policy | `st_rt_set_atmosphere`, `st_rt_set_physical_distance_attenuation`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_doppler_gain_mode`, `st_rt_set_late_coupling[_preset]`, `st_rt_set_early_late_band_energy_targets` |
| render | `st_rt_render_start/stop`, `st_rt_render_process` (host pull), `set_options/get_options`, `set_spatializer`, `set_speaker_layout[_custom]`, `set_parametric_eq`, `set_eq`, `set_loudness_compensation`, `set_virtual_bass`, `set_master_gain_db`, `set_limiter_type`, `get_limiter_latency_samples`, `set_path_fade_time`, `set_max_delay_seconds`, `get_latency_frames`, `get_process_stats` |
| Threads | `st_rt_set_thread_attributes`, `st_rt_get_thread_inventory`, `STRT_CreateOptions.maxComputeThreads` |
| Idle / run | `st_rt_idle`, `st_rt_run`, `st_rt_get_idle_state`, `STRT_CreateOptions.startIdle` (2.20; 1 starts IDLE, so compute and render rest until `st_rt_run`), per-source `st_rt_source_idle/run` |
| Memory budget | `st_rt_set_memory_budget`, `st_rt_get_memory_budget`, `st_rt_get_memory_stats`, `STRT_CreateOptions.maxSources` — [Source memory budget](#source-memory-budget) |
| Diagnostics | `st_rt_get_timing`, `st_rt_ir_get_stats`, `st_rt_debug_acquire_snapshot`, `st_rt_debug_copy_visual_paths`, `st_rt_debug_copy_mesh/scene_accel_nodes` |

### Thread tags

Every export in the headers carries a one-line tag stating which thread may call it.

| Tag | Meaning |
|---|---|
| `[control]` | For the control thread. May take the scene lock, so never call from the audio callback |
| `[control, blocking]` | Long exclusive sections such as acceleration-structure builds, device start/stop, HRIR loading |
| `[any]` | Reads only atomics and constants without locking, or fills caller-owned PODs |
| `[audio]` | Safe on the host audio thread — `st_rt_render_process`, `st_rt_source_write_stream` |

:::tip
The FMOD, Wwise, UE, and Unity wrappers all keep a **dedicated control thread** and serialize
`[control]` calls onto it. The same structure is recommended when you use the ABI directly.
:::

## Getting Started

### SDK layout

The SDK produced by `mainBuild.sh build <platform> release` uses the same layout as UE `ThirdParty`.

```text
out/dist/<platform>_release/SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/ SimpleSTRealtime.{dll,dylib,so} · SimpleSTOffline.* · (iOS/Web) libsimplest_static.a
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin + license
└─ Licenses/                miniaudio · tinybvh
```

### Minimal usage scenario

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);             // scheduler=PIPELINED, sceneRatio=1(m), renderOutputMode=DEVICE
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // when the host pulls blocks
opt.hostSampleRate   = 48000;                 // host rate. 0 = keep 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error */ }

// Since 2.21.0 st_rt_create turns equal-loudness compensation on. Turn it off right after creation
// when the host mix owns the tone
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. Materials — register the whole default library (24 BRAS presets). Returns the first handle.
STMaterialId firstMat = st_rt_material_load_defaults(ctx);

// 2. Mesh + object
STMesh mesh = { numVertices, vertices, numTriangles, triangles };   // xyz interleaved, index triplets
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, firstMat, NULL);    // NULL = one material for the whole mesh
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. Source and listener
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
st_rt_listener_set_rotation(ctx, /*yaw*/0.f, /*pitch*/0.f);        // radians. With roll: set_orientation_q(XYZW)

// 4. Host PCM stream input
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };     // mono, capacity 0 = 8192 frames
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. Build acceleration structures + start render + set the output stage explicitly
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // 1 = hybrid (2.18.0 default; set it explicitly after render_start)
ro.useLimiter = 0;               // off when the host master chain handles limiting (2.18.0 default 1 = true-peak)
st_rt_render_set_options(ctx, &ro);
st_rt_render_set_master_gain_db(ctx, 0.f);                          // engine default 0 dB

// 6. Game loop (control thread)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // PIPELINED wakes the workers and returns immediately

// 7. Audio callback (host audio thread)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);   // [audio]
st_rt_render_process(ctx, interleavedStereoOut, frames);  // [audio]

st_rt_destroy(ctx);
```

:::note
Since 2.18.0, the defaults right after creation and the real-time render preset (re-applied whenever
a speaker layout is turned on or off) are **Hybrid (`reserved0 = 1`) + true-peak output limiter
(−1 dBTP, 137-sample latency) on**, with a master gain of 0 dB (up to 2.12.0: Objects + limiter off).
Do not rely on the defaults; set Hybrid and the limiter explicitly **after `render_start` and after any
layout change**. All official plug-ins re-apply their own defaults in this order.

Since 2.21.0, `st_rt_create` also turns on [equal-loudness compensation](#equal-loudness-compensation). This
setting is per context and `render_start` does not reset it, so decide it once right after creation. All
official wrappers turn it off right after creation.
:::

## Core Concepts

### Coordinate and unit contract

- **The coordinate system matches Unity** — left-handed, `+Y` up, `+Z` forward, `+X` right.
  Positive yaw = turn right, positive pitch = down. Unity hosts pass values unchanged; `-Z` forward
  hosts (Three.js and the like) have the wrapper flip Z. For UE, the plug-in performs the `(Y, Z, X)`
  reordering and the cm→m conversion.
- **Units are meters.** Hosts with other units set `STRT_CreateOptions.sceneRatio`
  (cm = `0.01`, ft = `0.3048`) once at creation. Pass coordinates in scene units as they are; the
  engine multiplies only where meters are needed. **Double scaling is forbidden**: never pre-scale
  the geometry and also pass `sceneRatio`.
- Angles: listener rotation is in **radians**; only speaker layouts use degrees. Since 2.22.0,
  `st_rt_listener_set_orientation_q` (local-to-world unit quaternion, XYZW) and `st_rt_listener_set_rotation_ypr`
  (yaw · pitch · roll) also pass head tilt (roll). Of the three listener orientation setters, the last call wins.
- Mesh winding: the intersection kernel is two-sided, so reflection and transmission are
  winding-independent, but two diffraction edge tests look at the normal sign. Keep the winding
  consistent within a mesh.

### Materials — 9 bands, strict validation

```c
typedef struct STMaterial {
    uint32_t structSize, apiVersion;
    float reflection[9], absorption[9], transmission[9], scattering[9];
    uint32_t reserved[8];
} STMaterial;
```

- R/A/T/scattering are all **energy-domain** dimensionless ratios, and every band must satisfy
  `|R + A + T − 1| ≤ 0.001`. There is no automatic derivation, normalization, or interpolation.
- Scattering is the diffuse fraction of the reflected energy, so it is not part of the sum.
- The default library is the 24 materials fitted from BRAS measurements (`st_rt_material_load_defaults`).
- `sqrt` is applied exactly once, at the render boundary. Values the host passes in are energy.

### Path types and gates

| pathType | Meaning |
|---|---|
| 0 Direct | Direct sound |
| 1 Transmission | Direct sound passing through geometry (occlusion) |
| 2 Reflection | Specular reflection (max depth `st_rt_set_max_depth`, default 8) |
| 3 Diffraction | UTD diffraction (source-side 1 + terminal 1 edge) |
| 4 Reverb | Source transport diffuse transport → FDN16 late reverb |

There is a global gate (`st_rt_set_path_type_enabled`) and a per-source gate
(`st_rt_source_set_path_enabled`), and `st_rt_set_acoustic_feature_enabled` can individually
disable air absorption, propagation delay, and direct-sound occlusion. Disabling everything leaves
distance attenuation + stereo panning only, which serves as the "Sound Tracing OFF" baseline.

### Ray budget

| Axis | Default | Function |
|---|---|---|
| Listener guide rays | `16 × 16`, Fibonacci sphere | `st_rt_listener_set_ray_count`, `_set_ray_sampling_method` |
| Max reflection depth | Global 8, per-source 4 | `st_rt_set_max_depth`, `st_rt_source_set_depth` |
| Source transport rays | `16 × 8` | `st_rt_source_set_ray_count` |
| Max transmission depth | 64 | `st_rt_set_transmission_max_depth` |
| Transport refresh steps | 0 (auto: PIPELINED dynamic 8 · static 16) | `st_rt_source_set_transport_refresh_steps` |

### Hybrid early reflections (recommended for real-time games)

![Hybrid early reflections](/img/core/hybrid-early-reflections.png)

`STRenderOptions.reserved0` (earlySpatialMode) takes two values.

| Value | Behavior | Use |
|---|---|---|
| `0` Objects | Renders every early path as an individually spatialized object | Reference listening, offline A/B (preset default up to 2.12.0) |
| `1` Hybrid | Only a listener-global budget (reflection 12+4 · diffraction 3+1) is exact; the rest goes to the HOA3 bed | **Real-time games** (engine default since 2.18.0) |

In a hall with 8 sources, Objects costs 16.8 ms per block (budget 11.6 ms) while Hybrid costs 2.4 ms.
Since 2.18.0 the engine default is also Hybrid, and UE, Unity, FMOD, Wwise, and soundtrace.js all
apply Hybrid explicitly after the render starts.

### Spatialization and output

| `st_rt_render_set_spatializer` | Description |
|---|---|
| `0` PANNING | Stereo amplitude panning (default) |
| `1` MIT_KEMAR | MIT KEMAR HRIR embedded in the engine (128 taps) |
| `2` SADIE_D2_KEMAR | Bundled SADIE II D2 KEMAR HRIR (8,802 directions · 256 taps) |

Speaker output is enabled with `st_rt_render_set_speaker_layout` (2.0 / 2.1 / 4.1 / 5.1 / 7.1 /
laptop near-field 2.0) or a custom layout, and produces N channels through an internal HOA3 decode.
The output stage runs output EQ → (speaker) channel EQ → equal-loudness compensation → virtual bass →
master gain → limiter, in that order.

| Output stage | Function | Real-time default (2.22.0) |
|---|---|---|
| Output EQ | `st_rt_render_set_parametric_eq` — [Parametric EQ](#parametric-eq). The former 9-band `st_rt_render_set_eq` is a graphic view of the same EQ | Off |
| Equal-loudness compensation | `st_rt_render_set_loudness_compensation` (2.21.0) | **On** (turned on by `st_rt_create`) |
| Virtual bass | `st_rt_render_set_virtual_bass` (2.21.0) | Off |
| Master gain | `st_rt_render_set_master_gain_db` (−96 ~ +24 dB, 20 ms ramp) | 0 dB |
| Limiter type | `st_rt_render_set_limiter_type` — Envelope (0) / Lookahead peak (1) / True peak (2) | True peak, ceiling −1 dBTP |
| Limiter on/off | `STRenderOptions.useLimiter` | On (1). Latency is `st_rt_render_get_limiter_latency_samples` = 137 samples |

The limiter is the last stage of every output, both stereo and speaker layouts (N channels,
channel-linked). Integrations where the host master chain handles limiting, such as middleware and
game engines, turn it off with `useLimiter = 0`. Check for the new features with
`ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER` · `ST_CAP1_MASTER_GAIN` from `st_rt_get_capability_word(1)`
(do not mix them with the word-0 bits of `st_rt_get_capabilities()` in an AND).

### Parametric EQ

Since 2.21.0 the EQ is a single parametric EQ that runs RBJ second-order filter bands in series. The same
band struct (`STParametricEqBand`) is used in two places.

| Place | Function | Where it applies |
|---|---|---|
| Source EQ | `st_rt_source_set_parametric_eq` (`ST_CAP1_SOURCE_PARAMETRIC_EQ`) | The source's raw PCM, **before** the 9-band crossover. Direct, reflection, diffraction, and reverb sends of that source all get the same tone. Clear it with `st_rt_source_set_eq(ctx, id, NULL)` |
| Output EQ | `st_rt_render_set_parametric_eq` (`ST_CAP1_OUTPUT_PARAMETRIC_EQ`) | One global EQ at the end of the render, before the master gain. Turn it off with `enabled = 0` |

- Six filter types: `ST_PARAMETRIC_EQ_PEAKING` · `LOW_SHELF` · `HIGH_SHELF` · `LOW_PASS` · `HIGH_PASS` · `NOTCH`.
  The low and high cuts (HIGH_PASS / LOW_PASS) are fixed at 12 dB/oct.
- Ranges: frequency 20 ~ 20,000 Hz, gain ±24 dB (PEAKING and shelves only), Q 0.1 ~ 30 (shelves up to 3),
  preamp −48 ~ +12 dB, up to 16 bands.
- When a value changes the engine crossfades over 20 ms. While off, samples are left untouched.
- The offline DLL also has the source EQ (`st_off_source_set_parametric_eq`). The output EQ is real-time only.

### Equal-loudness compensation

Since 2.21.0 the real-time `st_rt_create` turns on equal-loudness compensation (ISO 226:2003, reference 83 →
playback 70 phon). At 0 dB master gain this is a low shelf of about +7.2 dB (120 Hz) and a high shelf of about
+1.8 dB, and by default the amount follows the master gain. With it off, the output is bit-identical to 2.20.
The offline DLL does not have it.

This stage is a playback-device feature, so like the limiter we recommend turning it off in integrations where
the host mix owns tone and level. The UE, Unity, FMOD, Wwise, and soundtrace.js wrappers all turn it off right
after creating the context (SDK release 2.22.0-jhj.5).

### Host pull render

![Host pull render](/img/core/host-pull-render.png)

| `renderOutputMode` | Engine threads | Description |
|---|---|---|
| `DEVICE` (0) | 1 render + 1 device | The engine opens the output device (WASAPI etc.) itself |
| `HOST_PULL` (1) | None | The host audio callback renders a block via `st_rt_render_process` |
| `HOST_PULL_BUFFERED` (2) | 1 render | The engine render thread fills a ring and the callback only copies (≈3 blocks of latency) |

The UE, FMOD, Wwise, and Unity integrations default to `BUFFERED`. When `hostSampleRate` is set,
the engine converts both input streams and output with a windowed-sinc resampler, so no host-side
resampling is needed. There are **64** concurrent host stream slots.

### Scheduler and threads

- `scheduler = PIPELINED` (default): the Direct / Reflection-Diffraction / Reverb lanes run at
  independent cadences. The default intervals are direct 10 ms · refl 0 ms (immediate) · reverb
  4 ms, changed at runtime with `st_rt_set_lane_update_interval`. Raising the reflection lane
  interval is the knob that buys back the most CPU.
- `maxComputeThreads = 0` means auto (= min(performance cores, 6)); per-kind priorities and core
  preferences are set **before create** with `st_rt_set_thread_attributes` (the counterpart of
  FMOD `Thread_SetAttributes`).
- `st_rt_get_thread_inventory` returns the number of threads actually running, per kind.

### Source memory budget

Starting with SDK release 2.18.2, the real-time context caps the number of simultaneously
live sources and the source memory. This is an ABI 6 additive change, detected with
`ST_CAP1_MEMORY_BUDGET` from `st_rt_get_capability_word(1)`. The memory of one source consists of a
fixed cost (propagation · IR copies · transport · stream ring), the delay ring, and the path lanes.

- **Dynamic delay ring** — each source's delay ring is sized to the maximum delay its paths require
  × 1.25 + 50 ms (rounded up in 125 ms units, floor 0.25 s). When more is needed, the control thread
  prepares a larger ring and the audio thread swaps it in without copying or allocating.
  `st_rt_render_set_max_delay_seconds` is now a **ceiling**, not a length allocated identically to
  every source. In a box-room measurement with 60 sources, memory per source went from
  6.89 → 2.70 MiB.
- **Platform defaults** — applied by `st_rt_create` according to the build target.

| Platform | Max sources | Source memory cap | Delay ring ceiling |
|---|---:|---:|---:|
| Desktop (Windows · macOS · Linux) | 128 | Unlimited | 2.0 s |
| Mobile (Android · iOS) | 48 | 96 MiB | 1.0 s |
| Web (Emscripten) | 32 | 64 MiB | 0.5 s |

- **When the cap is exceeded**, `st_rt_source_create` returns a failure handle (`v < 0`) and the last
  status is `ST_STATUS_BUDGET_EXCEEDED` (11). This is the default policy, `ST_MEMORY_REJECT_NEW`.
  Switching to `ST_MEMORY_EVICT_FARTHEST` evicts the source farthest from the listener through the
  same path as `st_rt_source_destroy` and accepts the new source (the evicted id is in
  `STMemoryStats.lastEvictedSource`). The UE, Unity, FMOD, and Wwise wrappers play rejected sources dry.
- **Configuration** — at creation time use `STRT_CreateOptions.maxSources` (0 = platform default);
  after creation change it with `st_rt_set_memory_budget`. Fields that are 0 in `STMemoryBudget`
  keep their default. Lowering the cap leaves existing sources in place and applies from the next
  creation on. `st_rt_get_memory_stats` returns the source count, tracked and estimated bytes, and
  the reject and evict counts.
- **Delay ring pool** — the pool that keeps reclaimed delay rings for reuse has a per-platform total cap
  (desktop 16 · mobile 8 · web 4 MiB; on overflow the largest rings are freed first), and rings unused
  for 10 s are freed. From SDK release 2.18.2-jhj.7, `STMemoryStats.trackedBytes` (and therefore
  `estimatedBytes`) includes rings held in the pool. When the budget check overflows, it empties the pool
  first and measures again, so the pool never causes a new source to be rejected or evicted (the struct
  layout is unchanged).

```c
typedef struct STMemoryBudget {
    uint32_t structSize, apiVersion;
    uint32_t maxSources;            /* 0 = platform default */
    int32_t  rejectPolicy;          /* ST_MEMORY_REJECT_NEW(0, default) / ST_MEMORY_EVICT_FARTHEST(1) */
    uint64_t sourceBudgetBytes;     /* 0 = unlimited (observe only) */
    uint64_t fixedPerSourceBytes;   /* 0 = engine default (2.5 MiB). Used only for estimation */
    float    ringFloorSeconds;      /* 0 = 0.25 */
    float    ringGrowthHeadroom;    /* 0 = 1.25 */
    int32_t  allowShrink;           /* 0 = no shrinking (keeps the session maximum) */
    uint32_t reserved[5];
} STMemoryBudget;
```

:::caution Behavior change
- The default max source count on desktop is **128** (previously unlimited). Hosts that need more
  raise it with `st_rt_set_memory_budget`.
- On mobile and web the default delay ring ceiling is 1.0 s / 0.5 s, so early paths longer than
  343 m / 171 m are not rendered. If you need the previous value, set it with
  `st_rt_render_set_max_delay_seconds`.
- The offline DLL (`st_off_*`) is not subject to the budget (unlimited).
- Mobile and web assume Hybrid early reflections. Objects mode exceeds 30 MB per source.
:::

:::caution Moving from SDK 2.18.2-jhj headers
- From SDK release 2.22.0-jhj, `STRT_CreateOptions.maxSources` is at **offset 44**, because engine 2.20 uses
  offset 40 for `startIdle` (the struct size stays 48). Rebuild hosts built with 2.18.2-jhj headers — writing the
  source count at the old position makes `startIdle` something other than 0/1, and `st_rt_create` fails with
  `ST_STATUS_INVALID_ARGUMENT`.
- `ST_CAP1_MEMORY_BUDGET` is now bit 63 (bit 6 in 2.18.2-jhj; engine 2.19 uses that bit for `ST_CAP1_SPEAKER_SET`).
  Do not hard-code bit numbers; check with the header constant.
:::

Per-wrapper settings are collected in the [SDK overview](../sdk/overview.md#source-count-limit).

### Late reverb

A single FDN16 is owned by the current listener, and its only input is the per-source
`ReverbSendTap` (the first diffuse scattering event of the source transport).
`st_rt_set_late_coupling_preset` (OFF / SUBTLE 6 dB / DEFAULT 9 dB / STRONG 12 dB) attenuates the
injection according to how far the listener is from the source's diffuse field, addressing the
problem of reverb not dropping around a corner.

## Offline Engine

`SimpleSTOffline` runs propagation once on the calling thread, with no device or workers, to build a
canonical IR cache (`st_off_ir_compute`), then derives the following from the same generation.

| Output | Functions |
|---|---|
| Raw energy taps (early + reverb send + transport ledger) | `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |
| Pressure IR (broadband mono / 9-band split) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| Binaural IR (panning / MIT KEMAR / SADIE D2) | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| Audition pair (dry WAV + render) | `st_off_ir_render_audition_pair` |

An offline context can create multiple listeners (`st_off_listener_create`); only progress and
cancellation (`st_off_ir_get_progress`, `st_off_ir_request_cancel`) are lock-free. Energy analyses
such as EDC, T60, and C50 are computed from the pressure IR's `h(t)²`.

## Diagnostics

| Function | Purpose |
|---|---|
| `st_rt_get_timing` | Per-lane propagation, IR build, and render block time (ms) |
| `st_rt_ir_get_stats` | Snapshot of one IR publish (tap count, bed cells, prepare CPU/wall) |
| `st_rt_render_get_process_stats` | Per-stage µs for a 512-frame block |
| `st_rt_scene_get_stats` | Live mesh, object, source, and triangle counts |
| `st_rt_debug_set_collect_visual_paths` + `st_rt_debug_copy_visual_paths` | Path polylines for visualization (guide ray / direct / reflection / diffraction / transport) |
| `st_rt_debug_copy_mesh_accel_nodes` / `_scene_accel_nodes` | BLAS/TLAS node boxes |
| `st_rt_scene_raycast` | Closest-hit query using the same acceleration structure as propagation |

![SimpleST demo app](/img/core/demo-app.png)

## References

- [From STCoreV2 to SimpleST](./stcorev2.md) — mapping table from the old `exa*` API
- [SDK Overview](../sdk/overview.md)
- [FMOD plug-in](../sdk/fmod.md) · [Wwise plug-in](../sdk/wwise.md)
