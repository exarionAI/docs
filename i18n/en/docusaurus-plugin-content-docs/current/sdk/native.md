---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — binaries, headers, minimal usage flow, function families and threading rules of the core shared by every platform.
---

# Sound-Tracing SDK (C/C++)

Every platform uses the same core. The Unity · Unreal Engine · FMOD · Wwise · Web SDKs are wrappers around this
binary in each platform's own style; from native C/C++ you include the headers and link the binary for your platform.

## Distribution

| Platform | Binary (`Binaries/`) | Linking |
|---|---|---|
| Windows x64 | `Win64/Release/SimpleSTRealtime.dll` + `.lib` | Dynamic |
| macOS (Universal) | `Mac/Release/libSimpleSTRealtime.dylib` | Dynamic |
| Linux x86_64 | `Linux/Release/libSimpleSTRealtime.so` | Dynamic |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSimpleSTRealtime.so` | Dynamic (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsimplest_static.a` | Static |
| Web | `Web/Release/SimpleSTRealtime.mjs` + `.wasm` (pthreads) | WASM module (COOP/COEP required) |

`SimpleSTOffline` for offline IR computation (same folder, `st_off_*`) is included as well. The headers are shared by all platforms.

```text
SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| Header | Context | Function prefix | Role |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | Real-time propagation + audio rendering |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | Offline IR computation and rendering |
| `STTypes.h` | — | `ST_*` | Shared PODs and enums |

Entity ids are per-type handles (`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`, each
`struct { int32_t v; }`), and **failure is `v < 0`**. The coordinate system is left-handed, `+Y` up · `+Z` forward, units are meters
(set cm with `STRT_CreateOptions.sceneRatio` = `0.01`), and listener angles are in radians.

## Minimal usage flow

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // the host audio callback pulls blocks
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// Disable right after creation when the host mix owns tone and level (every official wrapper does)
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. Materials — registering the default library returns the handle of the first material
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. Mesh + object (xyz interleaved, indexed triangles)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = one material for the whole mesh
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. Source and listener
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW, includes roll

// 4. Host PCM input stream (mono)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. Build + start rendering + set the output stage explicitly
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid early reflections (recommended for real time)
ro.useLimiter = 0;               // Disable when the host master chain owns limiting
st_rt_render_set_options(ctx, &ro);

// 6. Game loop (control thread)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // wakes the worker and returns immediately

// 7. Audio callback (host audio thread)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## Function families

| family | Representative functions |
|---|---|
| Lifecycle | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_version_string`, `st_rt_get_capability_word`, `st_rt_get_last_status` / `st_rt_get_last_error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`, `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| source | `st_rt_source_create`, `set_position` / `set_velocity` / `set_orientation_q`, `set_directivity`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_parametric_eq` |
| source input and playback | `st_rt_source_attach_stream` + `write_stream`, `set_audio_file`, `set_audio_clip`, `play` / `pause` / `stop` / `seek`, `set_volume`, `set_pitch`, `set_loop_count`, `trigger` |
| listener | `st_rt_listener_set_position` / `set_velocity` / `set_orientation_q` / `set_rotation_ypr`, `set_ray_count` |
| Propagation | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| Acoustic policy | `st_rt_set_atmosphere`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_late_coupling_preset` |
| render | `st_rt_render_start` / `stop`, `st_rt_render_process`, `set_options` / `get_options`, `set_spatializer`, `set_speaker_layout`, `set_parametric_eq`, `set_loudness_compensation`, `set_master_gain_db`, `set_limiter_type`, `set_max_delay_seconds`, `get_latency_frames` |
| Memory budget | `STRT_CreateOptions.maxSources`, `st_rt_set_memory_budget`, `st_rt_get_memory_stats` |
| Threads | `STRT_CreateOptions.maxComputeThreads` / `.scheduler`, `st_rt_set_thread_attributes`, `st_rt_get_thread_inventory`, `st_rt_set_lane_update_interval` — [Thread model](#thread-model) |
| Diagnostics | `st_rt_get_timing`, `st_rt_scene_get_stats`, `st_rt_ir_get_stats`, `st_rt_debug_copy_visual_paths` |

Spatialization is selected with `st_rt_render_set_spatializer`: `0` panning · `1` MIT KEMAR (built in) · `2` SADIE II D2 KEMAR (`Resources/HRTF`);
speaker output is enabled with `st_rt_render_set_speaker_layout` (2.0 / 2.1 / 4.1 / 5.1 / 7.1). Materials are 9-band
(`63 Hz ~ 16 kHz`) `reflection / absorption / transmission / scattering`, and every band must satisfy `R + A + T = 1`.

## Thread model

![Sound-Tracing SDK (C/C++) threads and data flow](/img/sdk/native-architecture.png)

The host provides two threads — **one control thread** (scene, source, listener and propagation calls) and the **audio thread**
(PCM input and render output). Everything else is created by the engine inside the context.

### Callable threads

Every function in the headers carries a tag.

| Tag | Meaning | Representative functions |
|---|---|---|
| `[control]` | Control thread. May take the scene lock, so never call from the audio callback | Creation, scene, source and listener setters, `st_rt_propagate` (PIPELINED wakes the worker and returns immediately) |
| `[control, blocking]` | Long exclusive sections — never call from the game loop or the audio thread | `st_rt_build`, `st_rt_render_start` / `stop`, HRIR loading, delay ring reallocation |
| `[audio]` | Safe on the host audio thread — no locks, allocations or system calls | `st_rt_source_write_stream`, `st_rt_render_process` |
| `[any]` | Any thread (atomic reads / constants) | `st_rt_get_timing`, `st_rt_get_thread_inventory`, `st_rt_get_lane_update_interval` |

Serialize `[control]` calls onto **a single dedicated control thread**. Every official wrapper is built this way.

### Threads created by the engine

| Type (`STThreadType`) | Count | Role |
|---|---|---|
| `ST_THREAD_COMPUTE_POOL` | PIPELINED: N − 1 (1 dedicated to Direct + N − 2 general), N = max(3, budget) · SYNCHRONOUS: N (inline on the caller when N = 1) | Propagation lanes, IR conversion and IR preparation tasks all run on this pool |
| `ST_THREAD_AUDIO_RENDER` | 1 (DEVICE · HOST_PULL_BUFFERED) / 0 (HOST_PULL) | Block rendering. In BUFFERED it fills the ring and the callback only copies |
| Device thread | 1 (DEVICE only) | OS output device (WASAPI · CoreAudio · AAudio) driver. Not included in the inventory |
| `ST_THREAD_FILE_DECODER` | ≤ 1 | Only when there is `st_rt_source_set_audio_file` input. Absent for host stream input |

- **Budget**: `STRT_CreateOptions.maxComputeThreads` — `0` = auto = min(performance cores, 6). No environment variable influence.
- **Scheduler**: `STRT_CreateOptions.scheduler` — `ST_RT_SCHEDULER_PIPELINED` (default; lanes run on workers at independent intervals) /
  `ST_RT_SCHEDULER_SYNCHRONOUS` (`st_rt_propagate` finishes propagation on the calling thread before returning).
- **Total (DEVICE mode)**: PIPELINED = N + 1 (+ 1 file decoder) · SYNCHRONOUS = N + 2 (+ 1). HOST_PULL drops the render and device threads,
  HOST_PULL_BUFFERED keeps only 1 render thread. Measure the actual count with `st_rt_get_thread_inventory` (`[any]`, atomic counters per type).
- Acceleration-structure (TinyBVH) builds run on the calling thread and create no separate worker.

### Propagation lane intervals

The three geometry lanes of PIPELINED change their interval **at any time at runtime** via `st_rt_set_lane_update_interval(ctx, lane, ms)`
(`[0, 60000]` ms; out-of-range values are rejected).

| `STPropagationLane` | Default | Meaning |
|---|---|---|
| `DIRECT` (0) | 10 ms | Minimum gap between the starts of consecutive runs |
| `REFLECTION_DIFFRACTION` (1) | 0 ms | Minimum gap between two consecutive runs. Most of the propagation cost — raise this first to buy back CPU (the price is early reflections following the listener later; no silence or dropouts) |
| `REVERB` (2) | 4 ms | Minimum gap from the completion of a run to the next run |

### Thread attributes

`st_rt_set_thread_attributes(threadType, &attr)` is set per type **before the context is created** (not retroactive for threads
already running, process-global, same place as FMOD `Thread_SetAttributes`). The logical roles (`LANE_*` · `IR_CONVERTER` ·
`AU_PREPARE` · `SCENE_INPUT`) have no dedicated thread, so apply the pool policy to `ST_THREAD_COMPUTE_POOL`.

```c
STThreadAttributes attr = { sizeof attr, ST_ABI_VERSION };
attr.priority = ST_THREAD_PRIORITY_ABOVE_NORMAL;            // DEFAULT · LOW · BELOW_NORMAL · NORMAL · ABOVE_NORMAL · HIGH · TIME_CRITICAL
attr.flags    = ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES;    // or PREFER_EFFICIENCY_CORES (setting both is rejected)
attr.affinityMask = 0;                                      // logical processor bitmask, honored on Windows only. 0 = unspecified
st_rt_set_thread_attributes(ST_THREAD_COMPUTE_POOL, &attr);
st_rt_set_thread_attributes(ST_THREAD_AUDIO_RENDER, &attr);
```

### Output modes and latency

| `renderOutputMode` | Engine threads | What the host callback does | Latency |
|---|---|---|---|
| `DEVICE` (0) | 1 render + 1 device | Nothing — the engine opens the device itself | Device buffer |
| `HOST_PULL` (1) | None | `st_rt_render_process` renders the block inside the callback | 0 blocks (render cost lands on the callback) |
| `HOST_PULL_BUFFERED` (2) | 1 render | Copy from the ring only (≈ memcpy) | Ring ≈ 3 blocks (`st_rt_render_get_latency_frames`) |

All three modes require calling `st_rt_render_start(useHrtf)` (in the HOST_PULL family it creates no thread or device and only sets the
render-enable flag and the binaural/speaker choice). When `hostSampleRate ≠ 0`, the engine performs rate conversion on the render thread (BUFFERED) or in the callback (HOST_PULL).
The UE · Unity · FMOD · Wwise plug-ins all use BUFFERED.

## Platform notes

- **Android**: API 28 or later. Place the per-ABI `.so` in the app's library folder.
- **iOS**: A single static library (`libsimplest_static.a`) contains both real-time and offline. Link the device / simulator variant accordingly.
- **Web**: `SimpleSTRealtime.mjs/.wasm` is a pthreads build, so the page and Worker responses need `Cross-Origin-Opener-Policy: same-origin`
  and `Cross-Origin-Embedder-Policy: require-corp`. Make `[control]` calls from one Worker only (blocking calls on the main thread fail
  due to the `Atomics.wait` restriction), and exchange audio with an AudioWorklet through a shared ring. If you need a TypeScript facade, use the [Web SDK](./web.md).
- **Host sample rate**: The engine runs internally at 44.1 kHz; when `hostSampleRate` is set, the engine converts input and output.

## Offline IR

`SimpleSTOffline` (`st_off_*`) uses the same scene API to propagate once, without a device or worker, and produce an IR.

| Output | Functions |
|---|---|
| Computation | `st_off_ir_compute` |
| Pressure IR (mono / 9-band) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| Binaural IR | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| Raw energy taps | `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |

## Next

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD plug-in](./fmod.md) · [Wwise plug-in](./wwise.md)
