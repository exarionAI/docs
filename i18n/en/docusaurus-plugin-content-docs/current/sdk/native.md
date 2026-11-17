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
| Windows x64 | `Win64/Release/SoundTracingRealtime.dll` + `.lib` | Dynamic |
| macOS (Universal) | `Mac/Release/libSoundTracingRealtime.dylib` | Dynamic |
| Linux x86_64 | `Linux/Release/libSoundTracingRealtime.so` | Dynamic |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSoundTracingRealtime.so` | Dynamic (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsoundtracing_static.a` | Static |
| Web | `Web/Release/SoundTracingRealtime.mjs` + `.wasm` (pthreads) | WASM module (COOP/COEP required) |

`SoundTracingOffline` for offline IR computation (same folder, `st_off_*`) is included as well. The headers are shared by all platforms.

```text
SoundTracing/
├─ Include/SoundTracing/ABI/   STRealtime.h · STOffline.h · STTypes.h
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
#include <SoundTracing/ABI/STRealtime.h>

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

## API reference

Every export of the realtime DLL (`st_rt_*`, `STRealtime.h`) and the offline DLL (`st_off_*`, `STOffline.h`), grouped by category. Expand a category and a function to see its signature, purpose, when/how to call it and on which thread, parameters and return value. Thread tags are explained in [Thread model](#thread-model); read the cause of a failed call with `st_rt_get_last_status` / `st_rt_get_last_error` (`st_off_*` for offline).

<details>
<summary><strong>Context · runtime — creation, version · capabilities, status, idle/run, thread attributes · inventory, memory budget, timing</strong> — 24 functions</summary>

<details>
<summary><code>st_rt_get_api_version</code> — Returns the ABI version number of this library</summary>

```c
uint32_t st_rt_get_api_version(void);
```

**Purpose** — The reference value for deciding whether the loaded `SoundTracingRealtime` library has the same ABI as the headers the host was compiled against. Judge compatibility by this value, not by the version string.

**When / how** — Call it right after loading the library, before creating a context. Compare the return value with `ST_ABI_VERSION` from the header and do not use the library if they differ. Put the same value (`ST_ABI_VERSION`) in the `apiVersion` field of every version-stamped struct. Thread: `[any]` — a compile-time constant, so it can be called from any thread and does not block.

| Parameter | Description |
|---|---|
| (none) | |

**Returns** — The library's ABI version (`ST_ABI_VERSION`, currently `6`). Never fails.

</details>

<details>
<summary><code>st_rt_get_version_string</code> — Returns the product release version string</summary>

```c
const char* st_rt_get_version_string(void);
```

**Purpose** — A human-readable release version for logs and diagnostic screens. Same form as `st_off_get_version_string` in the offline library.

**When / how** — Can be called at any time. Do not use it to judge ABI compatibility; use `st_rt_get_api_version` instead. Thread: `[any]` — callable from any thread without blocking.

| Parameter | Description |
|---|---|
| (none) | |

**Returns** — A static NUL-terminated string inside the library. The caller does not free it.

</details>

<details>
<summary><code>st_rt_get_capabilities</code> — Returns capability word 0 (<code>ST_CAP_*</code>)</summary>

```c
uint64_t st_rt_get_capabilities(void);
```

**Purpose** — Reports, as bits, which feature surfaces this library supports. Before using an optional feature (host pull rendering, thread attributes, IR statistics, etc.), the host checks the corresponding `ST_CAP_*` bit and branches on whether the feature is present.

**When / how** — Can be called at any time without a context. Same value as `st_rt_get_capability_word(0)`. Bits in word 0 correspond only to `ST_CAP_*` names; always check `ST_CAP1_*` bits with `st_rt_get_capability_word(1)` (the same bit position means different things in different words). The following positions are retired slots of old capabilities and are never set: `ST_CAP_RETIRED_MASK` (8 · 9 · 10 · 13 · 18 · 20 · 21 · 25). Thread: `[any]` — a compile-time constant.

| Parameter | Description |
|---|---|
| (none) | |

**Returns** — The 64-bit mask of capability word 0. If bit 63 `ST_CAP_CAPABILITY_WORDS` is set, words 1 and above can be read with `st_rt_get_capability_word`.

</details>

<details>
<summary><code>st_rt_get_capability_word</code> — Returns the capability word with the given number</summary>

```c
uint64_t st_rt_get_capability_word(uint32_t word);
```

**Purpose** — All 64 positions of word 0 are taken, so new capabilities are added from word 1 onward under `ST_CAP<n>_*` names. This function reads a word by its number.

**When / how** — Can be called at any time without a context. First check that `st_rt_get_capabilities()` has `ST_CAP_CAPABILITY_WORDS` (bit 63). For example, engine idle (`st_rt_idle`/`st_rt_run`) is checked with `st_rt_get_capability_word(1) & ST_CAP1_ENGINE_IDLE`, and the source memory budget with `ST_CAP1_MEMORY_BUDGET` (bit 63 of word 1). Do not AND bits from different words together. Thread: `[any]` — a compile-time constant.

| Parameter | Description |
|---|---|
| `word` | Word number. `0` = same value as `st_rt_get_capabilities()` (`ST_CAP_*`), `1` = `ST_CAP1_*`. The number of words the header knows is `ST_CAPABILITY_WORD_COUNT` (currently `2`) |

**Returns** — The 64-bit mask of that word. An unknown word (`word ≥ ST_CAPABILITY_WORD_COUNT`) returns `0` (= no such capability).

</details>

<details>
<summary><code>st_rt_get_sample_rate</code> — Returns the engine's internal sample rate</summary>

```c
int st_rt_get_sample_rate(void);
```

**Purpose** — Reports the fixed sample rate the engine uses internally. If the host audio runs at a different rate, use `STRT_CreateOptions.hostSampleRate` so the engine converts at the boundary.

**When / how** — Can be called at any time. Thread: `[any]` — a compile-time constant.

| Parameter | Description |
|---|---|
| (none) | |

**Returns** — `44100` (Hz, fixed).

</details>

<details>
<summary><code>st_rt_set_thread_attributes</code> — Sets priority · core preference · affinity per engine thread type</summary>

```c
int st_rt_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**Purpose** — Lets a game or middleware host set, per type, the priority · core preference · affinity of the threads the engine creates to match its own thread-placement policy (same role as FMOD `Thread_SetAttributes`). It is a **process-global** table independent of any context, and the Realtime and Offline libraries each have their own table — when both libraries are used together, set the same values on both `st_rt_` and `st_off_`.

**When / how** — The contract is to call it **before `st_rt_create`**. It is not retroactive for threads already started; it applies from threads created afterwards (the next `st_rt_create`, the next `st_rt_render_start`, the next file-input attach). Only three types have real OS threads: `ST_THREAD_COMPUTE_POOL` (compute pool) · `ST_THREAD_AUDIO_RENDER` (render thread) · `ST_THREAD_FILE_DECODER` (file decoder); the other values are logical roles that run on the shared compute pool, so they are only stored and not applied to physical threads — set the policy for compute work with `ST_THREAD_COMPUTE_POOL`. `ST_THREAD_PRIORITY_DEFAULT` uses the platform default table as is, so setting only affinity or core preference keeps the default priority boost of the audio render thread. An explicit priority is applied instead when given. Thread: `[any]` — updates the process-global table under one short mutex.

| Parameter | Description |
|---|---|
| `threadType` | `STThreadType` value `0`–`10` (table below). Out of range returns `0` |
| `attributes` | Requested values. The caller fills `structSize = sizeof(STThreadAttributes)`, `apiVersion = ST_ABI_VERSION`. `NULL` resets that type to the default |

**Struct** `STThreadAttributes`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `priority` | `STThreadPriority` (table below). Default `ST_THREAD_PRIORITY_DEFAULT` (0) |
| `flags` | Combination of `ST_THREAD_FLAG_*`. Default `0` |
| `affinityMask` | Logical processor bitmask, `0` = unspecified. **Honored on Windows only**. The kernel rejects it if it is not a subset of the process mask. On machines with more than 64 logical processors it is interpreted only within the current processor group |
| `reserved[4]` | Must all be `0` |

All fields `0` (DEFAULT · flags 0 · affinity 0) is the same as "unspecified".

**Enum** `STThreadType`

| Value | Name | Meaning |
|---|---|---|
| `0` | `ST_THREAD_LANE_DIRECT` | Logical role: direct propagation work (no dedicated thread) |
| `1` | `ST_THREAD_LANE_GUIDE` | Logical role: guide work |
| `2` | `ST_THREAD_LANE_REFLECTION_DIFFRACTION` | Logical role: reflection/diffraction work |
| `3` | `ST_THREAD_LANE_REVERB` | Logical role: reverb work |
| `4` | `ST_THREAD_COMPUTE_POOL` | Real thread: compute pool workers. PIPELINED has `max(3,N)−1` (including 1 dedicated to Direct), SYNCHRONOUS has `N` when `N>1` |
| `5` | `ST_THREAD_AUDIO_RENDER` | Real thread: the render thread opened by `st_rt_render_start` (absent in `HOST_PULL` mode) |
| `6` | `ST_THREAD_FILE_DECODER` | Real thread: file decoder, at most 1 per engine |
| `7` | `ST_THREAD_ACCEL_BUILD` | Reserved. Acceleration-structure builds run on the calling thread, so there is no separate worker |
| `8` | `ST_THREAD_IR_CONVERTER` | Logical role: IR conversion work |
| `9` | `ST_THREAD_AU_PREPARE` | Logical role: IR preparation work |
| `10` | `ST_THREAD_SCENE_INPUT` | Logical role: scene input work |
| `11` | `ST_THREAD_TYPE_COUNT` | Number of types (not used as an argument) |

**Enum** `STThreadPriority`

| Value | Name | Windows | macOS QoS |
|---|---|---|---|
| `0` | `ST_THREAD_PRIORITY_DEFAULT` | Platform default table as is | Platform default table as is |
| `1` | `ST_THREAD_PRIORITY_LOW` | LOWEST | BACKGROUND |
| `2` | `ST_THREAD_PRIORITY_BELOW_NORMAL` | BELOW_NORMAL | UTILITY |
| `3` | `ST_THREAD_PRIORITY_NORMAL` | NORMAL | USER_INITIATED |
| `4` | `ST_THREAD_PRIORITY_ABOVE_NORMAL` | ABOVE_NORMAL | USER_INTERACTIVE |
| `5` | `ST_THREAD_PRIORITY_HIGH` | HIGHEST | USER_INTERACTIVE |
| `6` | `ST_THREAD_PRIORITY_TIME_CRITICAL` | TIME_CRITICAL | USER_INTERACTIVE |

**Flags** `ST_THREAD_FLAG_*`

| Flag | Meaning |
|---|---|
| `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` (`1u << 0`) | Prefer performance cores |
| `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES` (`1u << 1`) | Prefer efficiency cores |

Core preference is applied via Windows 11 EcoQoS and ignored on macOS (the QoS class decides cluster placement). Setting both flags at once is rejected.

**Returns** — `1` = success / `0` = failure (`threadType` out of range, `structSize`/`apiVersion` mismatch, `priority` out of range, conflicting core-preference flags, `reserved[]` not zero). On failure the table is unchanged. It takes no context, so nothing is left in `st_rt_get_last_status`.

</details>

<details>
<summary><code>st_rt_get_thread_attributes</code> — Reads the stored attribute request for a thread type</summary>

```c
int st_rt_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**Purpose** — Checks the values stored with `st_rt_set_thread_attributes`. Returns **the requested values as is**, not the values actually applied by the OS.

**When / how** — Can be called at any time. A type that was never set returns the defaults (priority `DEFAULT` · flags `0` · affinityMask `0`). Thread: `[any]` — reads the process-global table under one short mutex.

| Parameter | Description |
|---|---|
| `threadType` | `STThreadType` value `0`–`10`. Out of range returns `0` |
| `outAttributes` | Output. The caller fills `structSize = sizeof(STThreadAttributes)`, `apiVersion = ST_ABI_VERSION`. On success `priority` · `flags` · `affinityMask` are filled and `reserved[]` is zeroed |

See the `st_rt_set_thread_attributes` entry for the `STThreadAttributes` fields.

**Returns** — `1` = success / `0` = rejected (`outAttributes` is `NULL`, stamp mismatch, `threadType` out of range).

</details>

<details>
<summary><code>st_rt_init_create_options</code> — Fills the creation options struct with defaults</summary>

```c
void st_rt_init_create_options(STRT_CreateOptions* outOptions);
```

**Purpose** — Initializes `STRT_CreateOptions` with the correct version stamp and defaults. The host fills it with this function, changes only the fields it needs and passes it to `st_rt_create`. This way fields added later are also filled with safe defaults (0).

**When / how** — Call it right before `st_rt_create`. `structSize` and `apiVersion` are filled automatically, `scheduler` is `ST_RT_SCHEDULER_PIPELINED`, and every other field is `0` (each field's "default" meaning). Thread: `[any]` — only fills a caller-owned struct.

| Parameter | Description |
|---|---|
| `outOptions` | Struct to fill. `NULL` does nothing |

**Struct** `STRT_CreateOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `structSize` | `uint32_t` | `sizeof(STRT_CreateOptions)` | Version stamp. Creation is rejected on mismatch |
| `apiVersion` | `uint32_t` | `ST_ABI_VERSION` | Version stamp. Creation is rejected on mismatch |
| `scheduler` | `int32_t` | `ST_RT_SCHEDULER_PIPELINED`(1) | `STRT_Scheduler`. `PIPELINED`(1) = the real-time default mode in which engine workers compute propagation and IRs in the background, latest frame first. `SYNCHRONOUS`(0) = synchronous mode in which the pipeline runs on the thread where the host calls `st_rt_propagate` (for diagnostics and compatibility). Cannot be changed after creation (`st_rt_get_scheduler`) |
| `seedValue` | `uint32_t` | `0` | Compatibility field. Has no effect on the default backend's output |
| `maxDelaySeconds` | `float` | `0` | Render delay ring length (seconds). `0` = platform default (desktop 2.0 s, Android · iOS 1.0 s, Emscripten 0.5 s). Other values range from about 0.0118 s (one processing block + 8 samples) to 60 s and must be finite. After creation, change it with `st_rt_render_set_max_delay_seconds` |
| `maxComputeThreads` | `uint32_t` | `0` | Upper limit on threads used for propagation and IR computation = width of the engine-owned shared compute pool. `0` = auto = `min(performance cores, 6)`, at least 1. Not influenced by environment variables. In PIPELINED the budget `N` is raised to at least 3 and split into 1 audio slot + 1 worker dedicated to Direct + `N−2` general workers (thread-count table under `st_rt_create` below). Support is indicated by `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | `float` | `0` | Scene unit → meter conversion factor. `0` = default 1.0 (scene unit = meter). Centimeter hosts use `0.01f`, foot hosts `0.3048f`. **Creation-only**, so there is no runtime setter. Non-finite values and values ≤ 0 are rejected. Support is indicated by `ST_CAP_SCENE_RATIO` |
| `renderOutputMode` | `int32_t` | `ST_RT_RENDER_OUTPUT_DEVICE`(0) | `STRT_RenderOutputMode` (table below). Out of range is rejected. Support is indicated by `ST_CAP_HOST_PULL_RENDER` / `ST_CAP_HOST_PULL_BUFFERED` |
| `hostSampleRate` | `int32_t` | `0` | Host sample rate. `0` = engine rate (44100) — no resampler is created. Any other value makes the engine convert stream input (`st_rt_source_write_stream`) and pull output (`st_rt_render_process`) with its built-in windowed-sinc converter, and every value the public API expresses in "frames" (`write_stream` · `render_process` · `render_get_latency_frames` · `STStreamDesc.capacityFrames` · `STStreamStatus`) is **all at this rate**. Allowed range `[8000, 384000]`. A nonzero value is rejected in `DEVICE` mode (the device path is fixed to the engine rate). Support is indicated by `ST_CAP_HOST_SAMPLE_RATE` |
| `backend` | `int32_t` | `ST_BACKEND_ST`(0) | `STBackend` pipeline selection. `ST_BACKEND_ST`(0) is the default engine. `ST_BACKEND_EXA`(1) is usable only when the library advertises `ST_CAP_BACKEND_EXA`, and requires the `SYNCHRONOUS` scheduler and `maxDelaySeconds = 0`. Other or unavailable values are rejected |
| `startIdle` | `uint32_t` | `0` | `0` = `RUNNING` right after creation, `1` = `IDLE` right after creation — propagation · IR · rendering run only after the host calls `st_rt_run` (so computation does not spin when there is nothing to play). Other values are rejected. Support is indicated by `ST_CAP1_ENGINE_IDLE` |
| `maxSources` | `uint32_t` | `0` | Maximum number of sources. `0` = platform default (desktop 128, Android · iOS 48, Emscripten 32). After creation, change it with `st_rt_set_memory_budget`. Support is indicated by `ST_CAP1_MEMORY_BUDGET` |

**Enum** `STRT_RenderOutputMode`

| Value | Name | Meaning |
|---|---|---|
| `0` | `ST_RT_RENDER_OUTPUT_DEVICE` | Default. `st_rt_render_start` opens the output device and the engine render thread, and the engine outputs directly to the device |
| `1` | `ST_RT_RENDER_OUTPUT_HOST_PULL` | Host pull. The engine creates neither a device nor a render thread; the host calls `st_rt_render_process` on its own audio thread to take blocks. `st_rt_render_start(useHrtf)` must still be called in this mode (it doubles as the binaural/speaker choice and the "render enabled" flag) |
| `2` | `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED` | The engine render thread fills a ring (8-block capacity · 3-block target) and `st_rt_render_process` only copies from the ring. The host callback cost drops to memcpy level and the ring absorbs jitter. If block processing itself keeps exceeding the block time, the ring cannot prevent it either and silence is filled in. Latency bound ≈ 3 engine blocks. When `hostSampleRate ≠ 0`, conversion is done on the render thread |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_create</code> — Creates a real-time context (engine · workers · compute pool)</summary>

```c
STStatus st_rt_create(const STRT_CreateOptions* options, STRT_Context** outContext);
```

**Purpose** — Creates one real-time engine instance. Every other `st_rt_*` call (scene, source, listener, render, etc.) takes this context. Settings that cannot change at runtime — scheduler, compute thread width, unit scale, output mode, host sample rate — are fixed here.

**When / how** — To use thread attributes (`st_rt_set_thread_attributes`), set them before calling this. Fill the options with `st_rt_init_create_options`, change only the fields you need and pass them in. On success proceed with scene setup (meshes · objects · sources · listener) → `st_rt_build` → `st_rt_render_start`, and release with `st_rt_destroy` when done. The state right after creation is the PIPELINED scheduler, sample rate 44100 Hz, lane update intervals direct 10 ms / reflection · diffraction 0 ms / reverb 4 ms, engine idle state `RUNNING` (`IDLE` if `startIdle = 1`), and a default-backend context starts with output-stage loudness compensation enabled (it can be disabled with `st_rt_render_set_loudness_compensation`). Thread: `[control, blocking]` — a long section that creates the engine, workers and compute pool, so do not call it from the game loop or the audio thread.

| Parameter | Description |
|---|---|
| `options` | Creation options. `NULL` creates with the defaults of `st_rt_init_create_options`. When filled manually, the `structSize`/`apiVersion` stamps must match |
| `outContext` | Output handle. Receives the new context on success, `NULL` on failure. Passing `NULL` gives `ST_STATUS_INVALID_ARGUMENT` |

See the `st_rt_init_create_options` entry for the `STRT_CreateOptions` fields.

**Threads the engine starts** — `N` is the resolved `maxComputeThreads` budget in SYNCHRONOUS, and `max(3, resolved budget)` in PIPELINED. If there is at least one file input (`st_rt_source_set_audio_file`), one file decoder thread is added; host stream input has no decoder. Acceleration-structure builds run on the calling thread and add no thread.

| Output mode | SYNCHRONOUS | PIPELINED |
|---|---|---|
| `DEVICE` | `N` pool workers (0 when N=1, inline on the calling thread) + 1 render + 1 device | `N−1` pool workers (1 dedicated to Direct + `N−2` general) + 1 render + 1 device |
| `HOST_PULL` | Same as above minus the render and device threads | Same as above minus the render and device threads |
| `HOST_PULL_BUFFERED` | Render thread only, no device thread | Render thread only, no device thread |

In PIPELINED the render thread is the audio slot within the budget `N`; only its priority is raised. Check the actual count with `st_rt_get_thread_inventory`.

**Returns** — `STStatus`.
- `ST_STATUS_OK` — success.
- `ST_STATUS_INVALID_ARGUMENT` — `outContext` is `NULL`, or an option value is out of range (`scheduler`, `maxDelaySeconds`, `sceneRatio`, `renderOutputMode`, `hostSampleRate`, `backend`, `startIdle`).
- `ST_STATUS_VERSION_MISMATCH` — `structSize`/`apiVersion` mismatch.
- `ST_STATUS_INITIALIZATION_FAILED` / `ST_STATUS_ALLOCATION_FAILED` — engine initialization or allocation failed.

Read the failure reason string with `st_rt_get_last_error(NULL, ...)` (the last failed creation on the same calling thread).

</details>

<details>
<summary><code>st_rt_get_backend</code> — Returns the pipeline backend the context uses</summary>

```c
int st_rt_get_backend(const STRT_Context* context);
```

**Purpose** — Checks the pipeline selected at creation with `STRT_CreateOptions.backend`. Switching at runtime is not supported.

**When / how** — Can be called at any time after creation. Thread: `[control]` — call from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — An `STBackend` value (`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1). `-1` if `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_destroy</code> — Releases the context (stops and joins workers)</summary>

```c
void st_rt_destroy(STRT_Context* context);
```

**Purpose** — Releases the context and every resource the engine owns (scene, sources, worker and compute pool threads, render output).

**When / how** — Call it once when you are done with the context. The handle is invalid after the call, so no other thread may be using the same context. Thread: `[control, blocking]` — stops and joins workers, so do not call it from the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle to release |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_get_last_status</code> — Reads the last status code left in the context</summary>

```c
STStatus st_rt_get_last_status(const STRT_Context* context);
```

**Purpose** — When a function returning `int`/`void` fails, checks the reason as an `STStatus`. Many functions leave a status in this diagnostic field on failure.

**When / how** — Call it on the same control thread right after receiving a failure. Get a human-readable message with `st_rt_get_last_error`. If there is a status left by the audio path (`st_rt_render_process`), that is returned first and cleared. If the same context is used from several threads at once, diagnostic recording on error paths is not serialized. Thread: `[control]` — call from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — The last `STStatus`. `ST_STATUS_INVALID_CONTEXT` if `context` is `NULL`.

| Value | Name |
|---|---|
| `0` | `ST_STATUS_OK` |
| `1` | `ST_STATUS_INVALID_CONTEXT` |
| `2` | `ST_STATUS_INVALID_ARGUMENT` |
| `3` | `ST_STATUS_VERSION_MISMATCH` |
| `4` | `ST_STATUS_INITIALIZATION_FAILED` |
| `5` | `ST_STATUS_ALLOCATION_FAILED` |
| `6` | `ST_STATUS_NOT_FOUND` |
| `7` | `ST_STATUS_BUFFER_TOO_SMALL` |
| `8` | `ST_STATUS_INVALID_MATERIAL` |
| `9` | `ST_STATUS_STALE_SNAPSHOT` |
| `10` | `ST_STATUS_UNAVAILABLE` |
| `11` | `ST_STATUS_BUDGET_EXCEEDED` — source memory budget exceeded (`st_rt_source_create`, when the policy is `ST_MEMORY_REJECT_NEW`) |

</details>

<details>
<summary><code>st_rt_get_last_error</code> — Copies the last error message string</summary>

```c
int st_rt_get_last_error(const STRT_Context* context, char* outMessage, int capacity);
```

**Purpose** — Gets a human-readable description of the last failure for logging. Passing `NULL` as `context` reads the reason for an `st_rt_create` failure, which has no context.

**When / how** — Call it right after a failure. To learn the required size first, call with `outMessage = NULL` and take only the return value. With `context = NULL` it is the message of the last failed `st_rt_create` on **this calling thread**, and the next `st_rt_create` call clears it. Thread: `[control]` — call from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle. `NULL` = this thread's last creation-failure message |
| `outMessage` | Output buffer. `NULL` copies nothing and returns only the size |
| `capacity` | Bytes in `outMessage`. If too small, truncates to `capacity − 1` bytes and NUL-terminates |

**Returns** — Bytes needed to hold the whole message (including NUL). If the return value is larger than `capacity`, the message was truncated.

</details>

<details>
<summary><code>st_rt_is_acoustic_feature_enabled</code> — Reads whether an individual acoustic feature (air absorption · propagation delay · direct occlusion) is enabled</summary>

```c
int st_rt_is_acoustic_feature_enabled(const STRT_Context* context, int feature);
```

**Purpose** — Checks the current state of an acoustic feature toggled with `st_rt_set_acoustic_feature_enabled`. Used together with the path-type gates for listening A/B comparisons (isolating one by one what contributes to the sound).

**When / how** — Call it at any time after creation. All three features are enabled by default. Thread: `[control]` — reads engine state without a lock but is called from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION` (0, atmospheric attenuation · high-frequency loss) / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY` (1, propagation delay from path length) / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION` (2, direct-sound occlusion) |

**Returns** — `1` = enabled / `0` = disabled / `-1` = `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_idle</code> — Idles the whole engine (computation stops, render plays out the tail, then silence)</summary>

```c
int st_rt_idle(STRT_Context* context);
```

**Purpose** — When there is nothing to play (playback stopped · paused · no room), stops propagation · IR computation and render processing to give CPU back. Caches and smoothing history are preserved, so waking with `st_rt_run` resumes computation where it left off.

**When / how** — Can be called at any time during rendering and does not wait for completion. Calling it stops new runs of the propagation lanes · IR assembly · IR preparation work (a run already in progress finishes). The render keeps outputting input and tail with the adopted IR, and stops processing and outputs only zeros (`DRAINING` → `IDLE`) once all of the following hold: playing input has no sound left to pull, every source input has been silent for the delay-line length + 1 s, and the output has stayed below −80 dBFS for 0.5 s. If the input keeps producing sound, it is forced to `IDLE` after a one-block fade at the upper bound (the larger of 5 s and "input silence length + 2 s"). When the render is not running (before `st_rt_render_start`, after `st_rt_render_stop`) it is `IDLE` immediately. Setters are still accepted while idle, and play requests take effect after waking. Host stream and speaker-set rings are not consumed (writes are accepted until the ring is full). The output device stays open, so for long idles confirm `IDLE` and then call `st_rt_render_stop`. With the SYNCHRONOUS scheduler computation runs only in `st_rt_propagate`, so only the render side idles. Support is indicated by `ST_CAP1_ENGINE_IDLE`. Thread: `[control]` — takes only a short lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `1` = success (does nothing if already idle) / `0` = `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_run</code> — Wakes an idle engine</summary>

```c
int st_rt_run(STRT_Context* context);
```

**Purpose** — Restarts propagation · IR · rendering on a context idled with `st_rt_idle` or created with `startIdle = 1`.

**When / how** — Call it when resuming playback. It becomes `RUNNING` immediately and wakes the compute work, and scene · motion · policy changes received while idle take effect then. The IR assembly timeline (smoothing · hysteresis) skips over the idle time. Delay-line and reverb state stopped by a forced `IDLE` continues from where it was, and the first block is faded in. Does not wait for completion. Thread: `[control]` — only takes a short lock and wakes the compute work.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `1` = success / `0` = `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_get_idle_state</code> — Reads the engine idle state (RUNNING / DRAINING / IDLE)</summary>

```c
int st_rt_get_idle_state(const STRT_Context* context);
```

**Purpose** — Checks whether the render has finished playing out the tail after `st_rt_idle`. For example, close the device with `st_rt_render_stop` once it becomes `IDLE`.

**When / how** — Can be called at any time. `IDLE` means "no new computation + render outputs zeros"; it does not mean that a computation run in progress has also finished. Thread: `[any]` — reads one atomic.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `STRT_IdleState`: `ST_RT_IDLE_RUNNING` (0, running) / `ST_RT_IDLE_DRAINING` (1, idle requested and the render is playing out remaining sound) / `ST_RT_IDLE_IDLE` (2, computation idle + render outputs only zeros — the state right after creation if `startIdle = 1`). `-1` if `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_get_scheduler</code> — Returns the context's scheduler</summary>

```c
int st_rt_get_scheduler(const STRT_Context* context);
```

**Purpose** — Checks the scheduler fixed at creation. Used to decide whether to use APIs meaningful only in PIPELINED, such as lane update intervals (`st_rt_set_lane_update_interval`), or whether you must drive `st_rt_propagate` yourself.

**When / how** — Can be called at any time after creation. The value is immutable. Thread: `[any]` — reads an immutable value fixed at creation.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `STRT_Scheduler`: `ST_RT_SCHEDULER_SYNCHRONOUS` (0) / `ST_RT_SCHEDULER_PIPELINED` (1).

</details>

<details>
<summary><code>st_rt_get_timing</code> — Reads the latest duration of each pipeline stage at once</summary>

```c
int st_rt_get_timing(const STRT_Context* context, STTiming* outTiming);
```

**Purpose** — Gets the latest single-run duration of propagation (split into 3 lanes) · IR conversion · IR publishing · block rendering in one struct, to show engine load in a host profiler or HUD. This is the only surface for timing.

**When / how** — Can be polled at any time (e.g. every frame). Comparing two reads of `irPublishSequence` tells you whether a new IR was published in between. Support is indicated by `ST_CAP_ENGINE_TIMING` (`irPublishSequence` by `ST_CAP_IR_STATS`). Thread: `[any]` — reads atomics only. However, the error path for a wrong stamp writes to the context's diagnostic buffer.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outTiming` | Output. The caller fills `structSize = sizeof(STTiming)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STTiming`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Stamps filled by the caller |
| `propagateTotalMs` | Whole propagation (ms). In PIPELINED the lanes run on different workers at different intervals, so this is not the sum of the three lanes but equals the heaviest, reflection · diffraction lane (`== propagateReflDiffMs`). In SYNCHRONOUS ≈ direct + reflDiff + reverb |
| `propagateDirectMs` | Direct lane (direct sound + transmission) |
| `propagateReflDiffMs` | Reflection · diffraction lane (including guide) |
| `propagateReverbMs` | Reverb lane (diffuse · source transport) |
| `irBuildMs` | Geometry → IR conversion |
| `auralUpdateIrMs` | IR publishing (applied on the render side) |
| `auralProcessMs` | Render processing time per block (render thread or host pull callback) |
| `irPublishSequence` | Lower 32 bits of the IR publish sequence. Same value as `publishSequence` of `st_rt_ir_get_stats`, `0` = nothing published yet |
| `reserved[7]` | Reserved |

A stage that has never run is `0`.

**Returns** — `1` = success / `0` = `context` · `outTiming` is `NULL` or stamp mismatch (a mismatch leaves `ST_STATUS_VERSION_MISMATCH` in `st_rt_get_last_status`).

</details>

<details>
<summary><code>st_rt_set_memory_budget</code> — Sets the source memory budget (maximum source count · byte limit · reject policy)</summary>

```c
int st_rt_set_memory_budget(STRT_Context* context, const STMemoryBudget* budget);
```

**Purpose** — Caps the number of sources and the sum of per-source memory on memory-constrained platforms such as mobile and web. Each source uses memory for a fixed cost (propagation · IR copies · transport · stream ring), a delay ring (proportional to the longest path in the scene, from the floor `ringFloorSeconds` to the ceiling `st_rt_render_get_max_delay_seconds`) and path lanes. An `st_rt_source_create` that exceeds the budget is either rejected or accepted by evicting the farthest source, depending on the policy, so memory does not grow because of new sources after creation.

**When / how** — Can be called at any time after creation. To set only the maximum source count, `STRT_CreateOptions.maxSources` at creation also works. To change it based on the existing values, read them with `st_rt_get_memory_budget`, modify only the fields you need, then set. Lowering a limit keeps existing sources and applies from the next creation. View usage with `st_rt_get_memory_stats`. Support is indicated by `ST_CAP1_MEMORY_BUDGET` (capability word 1). Thread: `[control]` — call from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `budget` | New policy. The caller fills `structSize = sizeof(STMemoryBudget)`, `apiVersion = ST_ABI_VERSION`. A field set to `0` means the default |

**Struct** `STMemoryBudget`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Stamps filled by the caller |
| `maxSources` | Maximum number of sources. `0` = platform default |
| `rejectPolicy` | `STMemoryRejectPolicy`: `ST_MEMORY_REJECT_NEW` (0, default) = when exceeded, `st_rt_source_create` returns a failure handle (`v < 0`) and `ST_STATUS_BUDGET_EXCEEDED`. `ST_MEMORY_EVICT_FARTHEST` (1) = evicts the source farthest from the listener through the same path as `st_rt_source_destroy` and accepts the new source (the evicted id is in `STMemoryStats.lastEvictedSource`) |
| `sourceBudgetBytes` | Upper limit (bytes) on the sum of variable per-source memory = tracked bytes + `fixedPerSourceBytes` × source count. `0` = unlimited (observe only) |
| `fixedPerSourceBytes` | Estimated fixed cost of one source. `0` = engine default (2.5 MiB). Used only for budget estimation |
| `ringFloorSeconds` | Delay ring size (seconds) of a source right after input is attached or with no paths. `0` = 0.25 |
| `ringGrowthHeadroom` | Ring growth headroom factor — required delay × this value (+50 ms, rounded up to 125 ms units). `0` = 1.25 |
| `allowShrink` | `0` = never shrink rings (keep the session maximum), `1` = allow shrinking |
| `reserved[5]` | Must all be `0` |

**Platform defaults**

| Build target | `maxSources` | `sourceBudgetBytes` | Delay ring ceiling |
|---|---|---|---|
| Desktop | 128 | Unlimited | 2.0 s |
| Android · iOS | 48 | 96 MiB | 1.0 s |
| Emscripten (web) | 32 | 64 MiB | 0.5 s |

**Returns** — `1` = applied / `0` = rejected. On rejection the state is unchanged and `st_rt_get_last_status` holds `ST_STATUS_VERSION_MISMATCH` (`budget` is `NULL` or stamp mismatch) or `ST_STATUS_INVALID_ARGUMENT` (non-finite or out-of-range value, `reserved` not zero). `0` if `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_get_memory_budget</code> — Reads the current source memory budget policy</summary>

```c
int st_rt_get_memory_budget(const STRT_Context* context, STMemoryBudget* outBudget);
```

**Purpose** — Checks the budget policy currently in effect (effective values with platform defaults filled in), or serves as the starting point for changing only some fields.

**When / how** — Can be called at any time after creation. The typical pattern is to modify the struct you read and pass it to `st_rt_set_memory_budget`. Support is indicated by `ST_CAP1_MEMORY_BUDGET`. Thread: `[control]` — call from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outBudget` | Output. The caller fills `structSize`/`apiVersion`. On success `reserved[]` is zeroed |

See the `st_rt_set_memory_budget` entry for the `STMemoryBudget` fields.

**Returns** — `1` = success / `0` = `context` is `NULL`, or `outBudget` is `NULL` or stamp mismatch (`ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_get_memory_stats</code> — Reads source memory usage · rejection · eviction statistics</summary>

```c
int st_rt_get_memory_stats(const STRT_Context* context, STMemoryStats* outStats);
```

**Purpose** — Observes current usage against the budget to choose budget values, or checks whether rejections or evictions have occurred.

**When / how** — Can be called at any time after creation. Reads only control-side records and the pool and does not touch the audio thread. Support is indicated by `ST_CAP1_MEMORY_BUDGET`. Thread: `[control]` — call from the control thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outStats` | Output. The caller fills `structSize = sizeof(STMemoryStats)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STMemoryStats`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Stamps filled by the caller |
| `sourceCount` | Current number of sources |
| `maxSources` | Maximum source count in effect |
| `trackedBytes` | Tracked bytes = installed delay rings (including rings pending replacement) + path lane estimate + rings held in the pool |
| `estimatedBytes` | `trackedBytes + fixedPerSourceBytes × sourceCount`. If this value overflows, the budget check first empties the pooled rings and measures again |
| `sourceBudgetBytes` | Byte limit in effect (`0` = unlimited) |
| `pooledRingBytes` | Ring bytes held for reuse (included in `trackedBytes`). Capped at 16 MiB on desktop · 8 MiB on mobile · 4 MiB on web, released after 10 s unused |
| `rejectedCreates` | Cumulative `st_rt_source_create` calls rejected for exceeding the budget |
| `evictions` | Cumulative sources evicted by `ST_MEMORY_EVICT_FARTHEST` |
| `lastEvictedSource` | Id of the last evicted source, `-1` = none |
| `ringBytesPerSourceMax` | Bytes of the largest source delay ring |
| `reserved[6]` | Reserved |

**Returns** — `1` = success / `0` = `context` is `NULL`, or `outStats` is `NULL` or stamp mismatch (`ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_ir_get_stats</code> — Reads a consistent instrumentation snapshot of the last IR publish</summary>

```c
int st_rt_ir_get_stats(const STRT_Context* context, STIrStats* outStats);
```

**Purpose** — Instrumentation for telling apart, when embedded in a host, "why IR baking is slow" without looking inside the engine. The contract is that every field comes from the same publish, which lets you distinguish three cases: ① too much work → `stagedBedCells` · `mergedBedCells` · `exactTaps`, ② being preempted → `prepareCpuUs` ≪ `prepareTotalUs` (low CPU/wall ratio), ③ running on a slow core → `prepareCpuUs` ≈ `prepareTotalUs` but large in absolute terms (check the logical processor with `prepareCpuIndex`). The increase in `publishSequence` between host frames gives the publish rate.

**When / how** — Can be polled at any time. In PIPELINED, publishing stops when the scene stops — if lane inputs and assembly keys are unchanged and 2 s have passed since the last change, it does not reassemble (the lanes keep running). Any change triggers immediate assembly and publishing, and for the following 2 s it reassembles at most once every 50 ms. So in a static scene, judge "is the IR up to date" with `settled` instead of `publishSequence`. Also valid in SYNCHRONOUS (the calling thread bakes and adopts immediately, so the CPU/wall ratio is close to 1). Support is indicated by `ST_CAP_IR_STATS`. Thread: `[any]` — a lock-free consistent snapshot that never returns torn values.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outStats` | Output. The caller fills `structSize = sizeof(STIrStats)`, `apiVersion = ST_ABI_VERSION`. Left untouched on rejection |

**Struct** `STIrStats`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Stamps filled by the caller |
| `publishSequence` | +1 each time the render adopts a new IR. `0` = nothing published yet |
| `lastPublishLaneMask` | Bits of lanes whose geometry advanced since the previous publish: `ST_IR_LANE_DIRECT` (`1u<<0`) · `ST_IR_LANE_REFLECTION_DIFFRACTION` (`1u<<1`) · `ST_IR_LANE_REVERB` (`1u<<2`), plus `ST_IR_LANE_POLICY_ONLY` (`1u<<3`, set only when no geometry bit is set: reconverted without new geometry — an IR policy change or assembly still converging) |
| `stagedBedCells` | Number of early bed merge input cells (summed over sources) |
| `mergedBedCells` | Number of early bed merge output cells |
| `activePartitions` / `maxPartitions` | Number of bed convolution partitions (active / maximum) |
| `irSpanMs` | Merged bed IR length (ms) |
| `exactTaps` | Number of exact path taps |
| `sendTaps` | Number of reverb send taps |
| `rainTaps` | Number of first-order scattering (diffuse rain) taps |
| `prepareMergeUs` | Bed merge · band normalization time (µs) |
| `prepareBakeUs` | Bed time-domain bake time (excluding FFT, µs) |
| `prepareFftUs` | Partition FFT time (µs) |
| `prepareTotalUs` | Total IR preparation wall time (µs). PIPELINED covers only the baking thread's preparation, while SYNCHRONOUS covers everything including application, so do not compare the two schedulers' values side by side. The sum of the three stage µs values is smaller than this |
| `prepareCpuUs` | Baking thread CPU time over the same interval (µs). On Windows the resolution is the scheduler tick (about 15.6 ms), so look at the ratio trend over several publishes rather than one value. POSIX is much finer |
| `prepareCpuIndex` | Logical processor number the thread was on when preparation finished (hint). Unsupported = `0xFFFFFFFF` (always this value on macOS) |
| `directLaneFrames` / `exactLaneFrames` / `reverbLaneFrames` | Cumulative lane frames received by IR assembly (direct · reflection/diffraction · reverb, uint32 wraparound). Record the value right after a change (adding a source, moving the listener, etc.); once it has advanced by +2 or more, the result of a lane run started after that change has entered assembly |
| `settled` | `1` = assembly has processed every lane frame it received (converged) and the render has adopted the last published IR |
| `reserved[2]` | All 0 |

`directLaneFrames`–`settled` are indicated by `ST_CAP1_ENGINE_IDLE`, are meaningful only in PIPELINED (SYNCHRONOUS gives 0 and `settled = 1`), and are read separately from the rest of the snapshot. The eight bed-related fields (`stagedBedCells` · `mergedBedCells` · `activePartitions` · `maxPartitions` · `irSpanMs` · `prepareMergeUs` · `prepareBakeUs` · `prepareFftUs`) are nonzero only in early bed render mode (`STRenderOptions.reserved0 = 1`) — a 0 in exact objects mode (`0`) means "there is no bake stage at all". `exactTaps` · `sendTaps` · `rainTaps` are filled regardless of mode.

**Returns** — `1` = success (if nothing has been published yet, succeeds with `publishSequence = 0`) / `0` = rejected: `context` · `outStats` is `NULL`, stamp mismatch (`ST_STATUS_VERSION_MISMATCH`), the snapshot repeatedly collided with a concurrent publish (`ST_STATUS_UNAVAILABLE` — rare; just call again).

</details>

<details>
<summary><code>st_rt_get_thread_inventory</code> — Reads, per type, how many threads the context is currently running</summary>

```c
int st_rt_get_thread_inventory(const STRT_Context* context, STThreadInventory* outInventory);
```

**Purpose** — If thread attributes (`STThreadAttributes`) are "what to plant", the inventory is "how many are actually running". It lets the host set its own thread budget from numbers rather than guesses.

**When / how** — Can be called at any time. Each per-type counter is an independent atomic, so the result is not a snapshot of a single instant — while threads are starting or stopping the totals may be momentarily inconsistent, which is not an error. The output device thread (audio driver) is created through a separate path and is not included in the inventory. Support is indicated by `ST_CAP_THREAD_INVENTORY`. Thread: `[any]` — reads only per-type atomic counters.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outInventory` | Output. The caller fills `structSize = sizeof(STThreadInventory)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STThreadInventory`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Stamps filled by the caller |
| `countByRole[ST_THREAD_TYPE_COUNT]` | Thread counts in `STThreadType` order (index = type). Logical roles (LANE_* · IR_CONVERTER · AU_PREPARE · SCENE_INPUT) run on the compute pool and are always `0`; `ST_THREAD_ACCEL_BUILD` is also `0` |
| `reserved[5]` | Reserved |

See the `st_rt_set_thread_attributes` entry for `STThreadType` values.

Typical values (PIPELINED, compute pool budget `N = max(3, resolved budget)`, with a file source):

| Output mode | LANE_* | IR_CONVERTER · AU_PREPARE | COMPUTE_POOL | AUDIO_RENDER | FILE_DECODER |
|---|---|---|---|---|---|
| `DEVICE` | 0 | 0 | `N−1` (including 1 dedicated to Direct) | 1 | 1 |
| `HOST_PULL` | 0 | 0 | `N−1` | 0 | 1 |

In SYNCHRONOUS every LANE_* is 0, and FILE_DECODER is 0 when there is no file input.

**Returns** — `1` = success / `0` = `context` · `outInventory` is `NULL` or stamp mismatch (`ST_STATUS_VERSION_MISMATCH`).

</details>

</details>

<details>
<summary><strong>Materials · meshes · objects · scene</strong> — 17 functions</summary>

<details>
<summary><code>st_rt_material_create</code> — Registers one acoustic material and returns its handle</summary>

```c
STMaterialId st_rt_material_create(STRT_Context* context, const STMaterial* material);
```

**Purpose** — Registers with the engine a material defined by reflection · absorption · transmission · scattering coefficients over 9 octave bands. Meshes (`st_rt_mesh_create`) reference the material handle returned by this function to set the acoustic properties of their surfaces.

**When / how** — Call it before creating the meshes that use the material. Register multiple materials by calling this function repeatedly; the `v` of the returned handles is consecutive in registration order. If you need the default material library, use `st_rt_material_load_defaults` as well. Thread: `[control]` — control thread only; it is exclusive with the workers and may block briefly, so do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `material` | Material to register. The caller fills `structSize = sizeof(STMaterial)`, `apiVersion = ST_ABI_VERSION`. The stamps are validated before the coefficients |

**Struct** `STMaterial`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STMaterial)` — filled by the caller |
| `apiVersion` | `ST_ABI_VERSION` — filled by the caller |
| `reflection[ST_FREQUENCY_BANDS]` | Reflected energy ratio per band, `[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | Absorbed energy ratio per band, `[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | Transmitted energy ratio per band, `[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | Fraction of reflected energy that goes diffuse, `[0, 1]`. Not part of the R+A+T sum |
| `reserved[8]` | Reserved |

- Bands are fixed at `ST_FREQUENCY_BANDS` = 9 (63 · 125 · 250 · 500 · 1000 · 2000 · 4000 · 8000 · 16000 Hz).
- All coefficients are in the **energy domain** (dimensionless energy ratios), not pressure amplitudes.
- Each band must satisfy `|R + A + T − 1| <= ST_MATERIAL_ENERGY_BALANCE_TOLERANCE` (0.001). The engine does not derive, normalize, clamp or interpolate values, so the caller must supply values that sum to 1.

**Returns** — A material handle (`STMaterialId`, `struct { int32_t v; }`). Mesh and object handles (`STMeshId` · `STObjectId`) are distinct types of the same shape, so mixing them is a compile error. On failure `v < 0` and the cause is left in `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` if `material` is NULL, `ST_STATUS_VERSION_MISMATCH` on stamp mismatch, `ST_STATUS_INVALID_MATERIAL` for non-finite values, out-of-range values or an R+A+T sum mismatch.

</details>

<details>
<summary><code>st_rt_material_load_defaults</code> — Registers the default material library at once</summary>

```c
STMaterialId st_rt_material_load_defaults(STRT_Context* context);
```

**Purpose** — Registers the engine's built-in default material library in full. Use it to build a scene right away without preparing material coefficients yourself.

**When / how** — Call it before creating meshes. The return value is the handle of the library's **first material**, and the remaining materials follow consecutively as `v+1`, `v+2` …. Can be used together with materials registered by `st_rt_material_create`. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — The handle of the library's first material. `v < 0` on failure.

</details>

<details>
<summary><code>st_rt_scene_set_edge_split_collinear_overlaps</code> — Sets whether collinearly overlapping acoustic edges are split</summary>

```c
void st_rt_scene_set_edge_split_collinear_overlaps(STRT_Context* context, int enabled);
```

**Purpose** — A scene build option that decides whether, in the acoustic edge (diffraction edge) topology compiled when a mesh is created, edges lying on top of each other along one line (collinear overlap) are split. Check support with the capability bit `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`.

**When / how** — The value at mesh creation is used, so it applies **only to meshes created after this call**. The topology of meshes already created does not change, so set it before `st_rt_mesh_create`. Disabled by default. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | `0` = off (default) / nonzero = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_scene_set_solid_wedge_gate</code> — Enables or disables the oriented rejection gate for diffraction wedges</summary>

```c
void st_rt_scene_set_solid_wedge_gate(STRT_Context* context, int enabled);
```

**Purpose** — A gate that, at a diffraction wedge where two faces meet, distinguishes convex from concave by the mesh winding (normal direction) and rejects diffraction paths that enter the solid side of the wedge. Check support with the capability bit `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`.

**When / how** — Disabled by default. It is evaluated in the propagation stage, so it also applies to existing meshes. When enabled, the decision depends on mesh winding, so keep winding consistent within one mesh with normals pointing toward the air — flipping the winding swaps convex and concave and inverts the set of rejected diffraction paths (see the winding note under `st_rt_mesh_create`). Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | `0` = off (default) / nonzero = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_scene_set_accel</code> — Selects the acceleration-structure type for meshes and the static scene</summary>

```c
int st_rt_scene_set_accel(STRT_Context* context, int kind);
```

**Purpose** — Selects the structure type used for mesh BLAS and the static scene acceleration structure. The engine also reads the `SOUNDTRACING_ACCEL` environment variable at creation, but this function lets the host make the same choice without changing its own process environment.

**When / how** — Call it before adding objects. It applies only to later builds; the BLAS of existing meshes stays as built with the value at their creation. The default is `2` (TinyBVH). Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH (default) / `3` = LBVH / `4` = LBVH_Simd |

**Returns** — `1` = applied / `0` = `kind` out of range or no context.

</details>

<details>
<summary><code>st_rt_scene_set_triangle_intersection</code> — Selects the triangle intersection kernel</summary>

```c
int st_rt_scene_set_triangle_intersection(STRT_Context* context, int kind);
```

**Purpose** — Selects the kernel used for ray-triangle intersection tests. All three kernels are two-sided.

**When / how** — The kernel is fixed to a mesh at `st_rt_mesh_create` time, so it applies **only to meshes added after this call** (not retroactive for existing meshes). A setup with different kernels per mesh is also valid. The default is `0` (MollerTrumbore). Read the current value with `st_rt_scene_get_triangle_intersection`. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `kind` | `0` = MollerTrumbore (default) / `1` = PluckerAdaptive / `2` = Watertight |

**Returns** — `1` = applied / `0` = invalid `kind` or no context.

</details>

<details>
<summary><code>st_rt_scene_get_triangle_intersection</code> — Reads the current triangle intersection kernel setting</summary>

```c
int st_rt_scene_get_triangle_intersection(const STRT_Context* context);
```

**Purpose** — Queries the value set with `st_rt_scene_set_triangle_intersection`, i.e. the intersection kernel that will apply to the next mesh created.

**When / how** — Can be called at any time. Existing meshes each keep the kernel from their creation, so there is no guarantee that the return value matches the kernel of existing meshes. Thread: `[control]` — a query that takes only the scene read lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight. `-1` if there is no context.

</details>

<details>
<summary><code>st_rt_scene_get_stats</code> — Queries live mesh · object · source · triangle counts</summary>

```c
int st_rt_scene_get_stats(STRT_Context* context, STSceneStats* outStats);
```

**Purpose** — Returns the inventory of the currently live acoustic scene (mesh, object and source counts and triangle counts) as a single read-lock snapshot. Every value describes the scene at the same instant, so use it for diagnostics and gauging memory scale. Check support with the capability bit `ST_CAP_SCENE_STATS`.

**When / how** — Can be called at any time from the control thread, whether during scene setup or rendering. Thread: `[control]` — a query that takes only the scene read lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outStats` | Struct that receives the result. The caller fills `structSize = sizeof(STSceneStats)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STSceneStats`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STSceneStats)` — filled by the caller |
| `apiVersion` | `ST_ABI_VERSION` — filled by the caller |
| `meshCount` | Number of live meshes |
| `objectCount` | Number of live objects. Decreases as soon as a destroy succeeds |
| `sourceCount` | Number of live sources. Includes disabled sources and decreases as soon as a destroy succeeds |
| `reserved0` | Reserved |
| `triangleCount` | Triangles of the meshes referenced by live objects, summed **per instance**. A 100-triangle mesh shared by 3 objects counts as 300 |
| `uniqueTriangleCount` | Live mesh resources summed **once each** (100 in the example above). Use it to gauge geometry and acceleration-structure memory |
| `reserved[4]` | Reserved |

**Returns** — `1` = success / `0` = `context` · `outStats` is NULL (`ST_STATUS_INVALID_ARGUMENT`) or stamp mismatch (`ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_scene_raycast</code> — Queries the nearest hit using the engine's acceleration structure</summary>

```c
int st_rt_scene_raycast(STRT_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**Purpose** — Casts a ray into the very acceleration structure the propagation uses (both static and dynamic objects) and returns the single nearest hit. It is a read-only query that does not change pipeline state, so the host can use it to inspect the acoustic geometry the engine actually sees or for its own logic (occlusion checks, debug display, etc.). Check support with the capability bit `ST_CAP_SCENE_RAYCAST`.

**When / how** — Meaningful after the acceleration structure is built with `st_rt_build`. Before a build it returns a miss without error. It takes only the scene read lock, so it can run alongside the workers under `ST_RT_SCHEDULER_PIPELINED`. Thread: `[control]` — a query that takes only the scene read lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `origin` | Ray origin, 3 world-coordinate components (scene units). Must be finite |
| `direction` | Ray direction, 3 components. The engine normalizes it, so it need not be a unit vector, but it must be finite and nonzero |
| `maxDistanceMeters` | Maximum distance (meters, by the scene unit × `sceneRatio` convention). `<= 0` or non-finite means infinite |
| `outHit` | Struct that receives the result. The caller fills `structSize = sizeof(STRayHit)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STRayHit`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STRayHit)` — filled by the caller |
| `apiVersion` | `ST_ABI_VERSION` — filled by the caller |
| `hit` | `1` = hit / `0` = miss |
| `distanceMeters` | Distance from the origin to the hit point (meters). Scene distance × `sceneRatio` (creation option, default 1) |
| `point[3]` | Hit point, in scene-frame coordinates as is (no unit conversion) |
| `normal[3]` | Unit geometric normal of the hit triangle. Always oriented to face **the ray origin**; the sign given by the mesh winding is not preserved |
| `objectId` | Id of the hit object (the `v` value of `STObjectId`). `-1` on a miss |
| `meshId` | Mesh id of that object (the `v` value of `STMeshId`). `-1` on a miss |
| `triangleIndex` | Mesh-local triangle index. `-1` on a miss |
| `materialIndex` | Material index of that triangle (the `v` value of `STMaterialId`). `-1` on a miss |
| `reserved[6]` | Reserved |

On a miss (`hit == 0`), `distanceMeters` · `point` · `normal` are 0 and all four ids are `-1`. `0` is a valid id, so it is not used as a miss marker. The id fields are `int32_t`, not handle structs.

**Returns** — `1` = call succeeded (judge whether it hit by `outHit->hit` — a miss is not a failure) / `0` = failure: `context` or a pointer is NULL, stamp mismatch (`ST_STATUS_VERSION_MISMATCH`), `origin` · `direction` non-finite or `direction` is a zero vector (`ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_rt_mesh_create</code> — Registers a triangle mesh and returns its handle</summary>

```c
STMeshId st_rt_mesh_create(STRT_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**Purpose** — Registers a triangle mesh to use as acoustic geometry. A mesh is a geometry resource; to actually place it in the scene, create objects (instances) that reference this mesh with `st_rt_object_create`/`st_rt_object_create_q`. One mesh can be shared by several objects.

**When / how** — Register the materials you will use first, then call it. Materials are assigned in one of two ways.

- `triangleMaterialIndices == NULL`: the whole mesh uses the single `material`.
- `triangleMaterialIndices != NULL`: a material is assigned per triangle (array length `mesh->numTriangles`). The `material` argument is then ignored. Check support with `ST_CAP_PER_TRIANGLE_MATERIALS`.

The intersection kernel (`st_rt_scene_set_triangle_intersection`), edge split option (`st_rt_scene_set_edge_split_collinear_overlaps`) and acceleration-structure type (`st_rt_scene_set_accel`) are fixed to the mesh with their values at the time of this call. Input arrays are copied during the call, so they may be freed after it returns. Thread: `[control, blocking]` — a long exclusive section that compiles the acoustic edge topology, so do not call it from the game loop or the audio thread.

Winding: intersection is two-sided and reflection · transmission are independent of winding, but some diffraction edge decisions (edge adoption on zero-thickness plates, `st_rt_scene_set_solid_wedge_gate`) depend on winding. Keep winding **consistent** within one mesh and, where possible, make normals face the air. When importing from a mirrored coordinate system, flip the index order as well.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Mesh geometry (`STMesh`). Must not be NULL |
| `material` | Material handle for the whole mesh. Used only when `triangleMaterialIndices` is NULL and must be a registered material |
| `triangleMaterialIndices` | Per-triangle material index array (`numTriangles` entries, each the `v` value of a registered `STMaterialId`) or NULL |

**Struct** `STMesh`

| Field | Description |
|---|---|
| `numVertices` | Number of vertices (> 0) |
| `vertices` | Vertex coordinates as an xyz interleaved array, `numVertices * 3` floats. Scene units (mesh-local frame) |
| `numTriangles` | Number of triangles (> 0) |
| `triangles` | Triangle vertex index array, `numTriangles * 3` ints. Each value is in `[0, numVertices)` |

**Returns** — A mesh handle. On failure `v < 0`: `ST_STATUS_INVALID_ARGUMENT` if `mesh` or an array pointer is NULL or a count is 0 or less, `ST_STATUS_INVALID_MATERIAL` if the mesh is rejected for an out-of-range index, an unregistered material, etc.

</details>

<details>
<summary><code>st_rt_object_create</code> — Places a mesh in the scene with a matrix transform</summary>

```c
STObjectId st_rt_object_create(STRT_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**Purpose** — Creates an object (instance) that places a registered mesh in the scene with a world transform. Propagation and `st_rt_scene_raycast` see only objects. To give the rotation as a quaternion, use `st_rt_object_create_q`.

**When / how** — Call it after `st_rt_mesh_create`. `isDynamic` selects static or dynamic.

- Static (`0`): goes into the static TLAS published by `st_rt_build` (full static + dynamic build). Additions, removals and transform changes are not reflected in the published static structure until the next `st_rt_build`. Use it for architectural geometry that does not move, such as walls and floors.
- Dynamic (`1`): goes into the dynamic object TLAS, and transform changes are reflected by a dynamic rebuild (refit, `st_rt_build_dynamic`) without a full build. Use it for moving geometry such as doors and vehicles.

Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Handle of the mesh to place |
| `transform` | Local→world transform (`STTransform`). NULL means the identity transform |
| `isDynamic` | `0` = static / nonzero = dynamic |

**Struct** `STTransform`

| Field | Description |
|---|---|
| `m00, m01, m02` | Row 1 of the 3x3 rotation · scale matrix |
| `m10, m11, m12` | Row 2 |
| `m20, m21, m22` | Row 3 |
| `tx, ty, tz` | Translation (scene units) |

Row-major, and points are multiplied **as column vectors**: `x' = m00*x + m01*y + m02*z + tx`, `y' = m10*x + m11*y + m12*z + ty`, `z' = m20*x + m21*y + m22*z + tz` (not the `m00*x + m10*y + m20*z` form). Non-uniform scale and transforms with a negative determinant (mirroring · negative scale) are accepted. Transforms with non-finite components or that cannot be inverted are rejected. The coordinate system is left-handed, +Y up, +Z forward, +X right.

**Returns** — An object handle. `v < 0` on failure (nonexistent mesh, unusable transform, etc.).

</details>

<details>
<summary><code>st_rt_object_create_q</code> — Places a mesh in the scene with position · quaternion · scale</summary>

```c
STObjectId st_rt_object_create_q(STRT_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**Purpose** — Creates the same object as `st_rt_object_create`, but takes the transform as position · rotation quaternion · scale (TRS). Use it to pass a game engine transform directly without converting it to a matrix.

**When / how** — Call it after `st_rt_mesh_create`. The meaning of static/dynamic and when changes reach the build are the same as `st_rt_object_create`. Update the transform afterwards with `st_rt_object_set_transform_q`. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Handle of the mesh to place |
| `position` | World position xyz (scene units). Must not be NULL |
| `quatXYZW` | Local→world rotation quaternion, **XYZW order**. The engine normalizes it and substitutes the identity rotation if the norm is below `1e-12`. Must not be NULL |
| `scale` | Per-axis scale xyz. Composed with the rotation as column scale (R·S); non-uniform scale is allowed. Must not be NULL |
| `isDynamic` | `0` = static / nonzero = dynamic |

**Returns** — An object handle. `v < 0` on failure (NULL pointer, nonexistent mesh, unusable transform, etc.).

</details>

<details>
<summary><code>st_rt_object_set_transform</code> — Changes an object's matrix transform</summary>

```c
void st_rt_object_set_transform(STRT_Context* context, STObjectId object, const STTransform* transform);
```

**Purpose** — Updates the local→world transform of an already placed object with a matrix.

**When / how** — Call it when moving an object. Dynamic objects are updated by a dynamic rebuild without a full build. Changes to static objects are held pending and applied at the next `st_rt_build`, so make geometry that moves every frame dynamic (`isDynamic = 1`). To give a quaternion, use `st_rt_object_set_transform_q`. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `object` | Target object handle |
| `transform` | New transform. See the `st_rt_object_create` entry for the `STTransform` fields. NULL does nothing |

**Returns** — Nothing. Nonexistent objects and unusable transforms (non-finite · non-invertible) are ignored.

</details>

<details>
<summary><code>st_rt_object_set_transform_q</code> — Changes an object's transform with position · quaternion · scale</summary>

```c
void st_rt_object_set_transform_q(STRT_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**Purpose** — The TRS version of `st_rt_object_set_transform`. Updates the object by passing a game engine transform (position · quaternion · scale) as is.

**When / how** — When changes take effect for static/dynamic objects is the same as `st_rt_object_set_transform`. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `object` | Target object handle |
| `position` | World position xyz (scene units) |
| `quatXYZW` | Local→world rotation quaternion, **XYZW order**. The engine normalizes it and substitutes the identity rotation if the norm is below `1e-12` |
| `scale` | Per-axis scale xyz (R·S composition, non-uniform allowed) |

**Returns** — Nothing. If any pointer is NULL it does nothing, and nonexistent objects or unusable transforms are ignored.

</details>

<details>
<summary><code>st_rt_mesh_destroy</code> — Removes a mesh and the objects that use it</summary>

```c
int st_rt_mesh_destroy(STRT_Context* context, STMeshId mesh);
```

**Purpose** — Removes a registered mesh resource from the scene. Objects that referenced this mesh are released as well.

**When / how** — Call it to clean up geometry that is no longer used. If static objects are removed along with it, they remain in the published static structure until the next `st_rt_build`, so call `st_rt_build` after the removal to apply it. Do not reuse a removed handle. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Handle of the mesh to remove |

**Returns** — `1` = removed / `0` = no context or nonexistent mesh.

</details>

<details>
<summary><code>st_rt_object_destroy</code> — Removes an object from the scene</summary>

```c
int st_rt_object_destroy(STRT_Context* context, STObjectId object);
```

**Purpose** — Takes a placed object (instance) out of the scene. The mesh resource it referenced remains.

**When / how** — `objectCount` of `st_rt_scene_get_stats` decreases as soon as it succeeds. Static objects remain in the published static structure until the next `st_rt_build`, so call `st_rt_build` after the removal to apply it. Dynamic objects drop out of the dynamic rebuild. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `object` | Handle of the object to remove |

**Returns** — `1` = removed / `0` = no context or nonexistent (already removed) object.

</details>

<details>
<summary><code>st_rt_mesh_set_material</code> — Changes the material of a whole mesh at runtime</summary>

```c
int st_rt_mesh_set_material(STRT_Context* context, STMeshId mesh, STMaterialId material);
```

**Purpose** — Replaces the material of an already registered mesh with a single other material. Use it to change only the surface acoustic properties without recreating the mesh.

**When / how** — Can be called at any time after scene setup. Every triangle of the mesh then uses `material`, and per-triangle materials assigned at creation are also replaced by this one. If the material is invalid, the existing material is kept. Applies to every object that uses this mesh. Thread: `[control]` — control thread only; do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Target mesh handle |
| `material` | New material handle (a registered material) |

**Returns** — `1` = changed / `0` = no context, nonexistent mesh or unregistered material.

</details>

</details>

<details>
<summary><strong>Sources — creation, position · direction · velocity, directivity, path gates · volumes, ray budget</strong> — 21 functions</summary>

<details>
<summary><code>st_rt_source_create</code> — Creates a source and returns its handle</summary>

```c
STSourceId st_rt_source_create(STRT_Context* context, const STSourceDesc* source);
```

**Purpose** — Registers one source in the scene and returns the `STSourceId` handle used by every subsequent `st_rt_source_*` call. Sets position · direction · velocity · pressure scale · directivity profile · dynamic/static at once.

**When / how** — Call it at any time after creating the context. After creation, attach audio input (`st_rt_source_set_audio_file`, `st_rt_source_attach_stream`, etc.), and update moving sources every frame with `st_rt_source_set_position` / `st_rt_source_set_velocity`. State right after creation: source energy 1.0, all 4 path volumes 1.0, all 5 path-type gates enabled, enabled, not idle (`ST_RT_IDLE_RUNNING`), no directivity table, transport refresh steps 0 (default), transport ray grid 16 × 8, per-source maximum depth 4. The orientation is set to the roll-free minimal rotation matching `direction` (identity if `direction` is `{0,0,1}`). Thread: `[control]` — may take the scene lock, so do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Creation descriptor `STSourceDesc` (below). Fails if NULL. This struct has no `structSize` / `apiVersion` stamps |

**Struct** `STSourceDesc`

| Field | Description |
|---|---|
| `positionX`, `positionY`, `positionZ` | World position. **In scene units as is** (the engine converts to meters with `sceneRatio`). Must be finite |
| `directionX`, `directionY`, `directionZ` | Source front (forward) direction. The engine normalizes it and sets the source orientation (local forward = +Z) to this direction without roll. A zero vector means +Z. Must be finite |
| `velocityX`, `velocityY`, `velocityZ` | Source velocity, scene units/second. Converted to m/s before the Doppler computation. Must be finite |
| `intensity` | Dimensionless **linear pressure scale**. Not acoustic intensity (W/m²), SPL (dB) or calibrated Pa. Must be finite and ≥ 0. An energy-domain scale is given separately with `st_rt_source_set_energy` |
| `directional` | `0` = omnidirectional (onAxis = offAxis = 1 in every band). Not `0` = simple directional profile (onAxis = 1, offAxis = 0). For fine per-band control, use `st_rt_source_set_axis_attenuation` or `st_rt_source_set_directivity` after creation |
| `isDynamic` | `1` = dynamic source (reverb recomputed every frame), `0` = static source (reverb cached and reused). The default number of transport refresh steps also depends on this value (see `st_rt_source_set_transport_refresh_steps`) |

**Returns** — On success an `STSourceId` with `v >= 0`. Failure is **`v < 0`**; check the reason with `st_rt_get_last_status`.
- `ST_STATUS_INVALID_ARGUMENT` — `source` is NULL, non-finite position · direction · velocity · `intensity`, `intensity < 0`, or another case the engine rejected.
- `ST_STATUS_BUDGET_EXCEEDED` — when the source memory budget (`STRT_CreateOptions.maxSources`, `maxSources` · `sourceBudgetBytes` of `st_rt_set_memory_budget`) is exceeded. Occurs only when the policy is `ST_MEMORY_REJECT_NEW` (default); with `ST_MEMORY_EVICT_FARTHEST` the source farthest from the listener is evicted through the same path as `st_rt_source_destroy` and the new source is accepted (the evicted id is in `STMemoryStats.lastEvictedSource`). Check support with `ST_CAP1_MEMORY_BUDGET` of `st_rt_get_capability_word(1)`.

</details>

<details>
<summary><code>st_rt_source_set_position</code> — Moves the source</summary>

```c
void st_rt_source_set_position(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**Purpose** — Updates the source's world position. Use it to attach a moving source to a game object so it follows.

**When / how** — May be called every frame from the game loop. Hosts that know the velocity also update `st_rt_source_set_velocity`. Thread: `[control]` — under `ST_RT_SCHEDULER_PIPELINED` it enqueues into the motion queue and returns; do not call it from the audio callback. It cannot be used on speaker-set member sources (ignored, with `last_status` = `ST_STATUS_INVALID_ARGUMENT`) — use the set's pose update instead.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `x`, `y`, `z` | New world position, **in scene units** (as is, with no coordinate conversion) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_set_direction</code> — Changes the source's front direction</summary>

```c
void st_rt_source_set_direction(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**Purpose** — Changes the source's front (forward) direction. Cone attenuation (`st_rt_source_set_axis_attenuation`) and the directivity table (`st_rt_source_set_directivity`) are applied relative to this direction.

**When / how** — Call it at any time. This setter also updates the source orientation to "the **roll-free minimal rotation** from +Z to that direction". For directivity tables that need roll (sources asymmetric left/right, etc.), use `st_rt_source_set_orientation_q` instead of this function. Thread: `[control]`. It cannot be used on speaker-set member sources (ignored, `ST_STATUS_INVALID_ARGUMENT`).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `x`, `y`, `z` | Front direction vector in world space. The coordinate system is +X right · +Y up · +Z forward |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_set_velocity</code> — Sets the source velocity</summary>

```c
void st_rt_source_set_velocity(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**Purpose** — Updates the source's movement velocity. The engine uses this value for the Doppler computation.

**When / how** — Call it at the same rate as position updates. Thread: `[control]` — under `ST_RT_SCHEDULER_PIPELINED` it enqueues into the motion queue and returns. It cannot be used on speaker-set member sources (ignored, `ST_STATUS_INVALID_ARGUMENT`).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `x`, `y`, `z` | Velocity vector, **scene units/second**. The engine converts to m/s with `sceneRatio` |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_destroy</code> — Deletes a source</summary>

```c
int st_rt_source_destroy(STRT_Context* context, STSourceId source);
```

**Purpose** — Removes the source from the scene and cleans up its render state. This call is also what frees its slot in the source memory budget.

**When / how** — Call it on sources no longer in use. While rendering, it ramps the sound down over 3 ms and then reclaims the render state. The deleted source's per-source idle (`st_rt_source_idle`) setting also goes away. Thread: `[control]`. Speaker-set member sources cannot be deleted (`0`, `ST_STATUS_INVALID_ARGUMENT`) — delete the set instead.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Handle of the source to delete |

**Returns** — `1` = removed / `0` = failure (NULL context, nonexistent source, speaker-set member).

</details>

<details>
<summary><code>st_rt_source_set_path_enabled</code> — Enables or disables a path type for one source</summary>

```c
void st_rt_source_set_path_enabled(STRT_Context* context, STSourceId source, int pathType, int enabled);
```

**Purpose** — Removes a specific path type (direct · transmission · reflection · diffraction · reverb) from the computation and contribution of one source, or puts it back. The per-source version of the global gate `st_rt_set_path_type_enabled`. Use it for effects like removing reverb from only certain sources, or for listening A/B comparisons.

**When / how** — Call it at any time. All 5 types are enabled by default. To only reduce a path's level instead of removing it entirely, use `st_rt_source_set_path_volume` (`STSourceVolumeKind`: `ST_SOURCE_VOLUME_DIRECT` (0, includes transmission) / `REFLECTION` (1) / `DIFFRACTION` (2) / `REVERB` (3), linear pressure scale). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb. Out of range is ignored |
| `enabled` | `0` = off, not `0` = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_is_path_enabled</code> — Reads a path-type gate of one source</summary>

```c
int st_rt_source_is_path_enabled(STRT_Context* context, STSourceId source, int pathType);
```

**Purpose** — Queries the current value of a per-source path gate set with `st_rt_source_set_path_enabled`.

**When / how** — Call it at any time. Thread: `[control]` — a pure query that takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |

**Returns** — `1` = enabled / `0` = disabled. A NULL context, nonexistent source or out-of-range `pathType` also returns `0`.

</details>

<details>
<summary><code>st_rt_source_set_energy</code> — Sets the source's energy scale</summary>

```c
int st_rt_source_set_energy(STRT_Context* context, STSourceId source, float energy);
```

**Purpose** — Sets the source's relative radiated energy as an **energy-domain** (dimensionless energy ratio) scale. It is a separate scale from `STSourceDesc::intensity` (pressure scale), and is also where the total radiated power is set when the directivity table is normalized with `ST_DIRECTIVITY_POWER_MEAN`.

**When / how** — Call it at any time after creation. The default is 1.0. Energy relates to pressure as **energy = gain²** — for a pressure gain g, pass `g * g` (e.g. −6 dB, g ≈ 0.5 → energy ≈ 0.25). The engine takes the square root exactly once at the render boundary. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `energy` | Energy scale. Finite and ≥ 0. Default 1.0 |

**Returns** — `1` = applied / `0` = failure (NULL context, non-finite or negative value, nonexistent source).

</details>

<details>
<summary><code>st_rt_source_get_energy</code> — Reads the source's energy scale</summary>

```c
float st_rt_source_get_energy(STRT_Context* context, STSourceId source);
```

**Purpose** — Queries the energy scale (energy-domain) set with `st_rt_source_set_energy`.

**When / how** — Call it at any time. Thread: `[control]` — a pure query that takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |

**Returns** — The current energy scale (default 1.0). `-1.0` for a NULL context or nonexistent source.

</details>

<details>
<summary><code>st_rt_source_set_enabled</code> — Enables or disables the whole source</summary>

```c
void st_rt_source_set_enabled(STRT_Context* context, STSourceId source, int enabled);
```

**Purpose** — A master switch that takes the source out of the propagation computation entirely, or puts it back, without deleting it. It sits above the per-path-type gates (`st_rt_source_set_path_enabled`).

**When / how** — Call it at any time. Enabled right after creation. Keep sources that trigger clips (`st_rt_source_trigger`) enabled. To idle a source that has nothing to play for a while while keeping its state, use `st_rt_source_idle`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `enabled` | `0` = off, not `0` = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_set_ray_count</code> — Sets the size of the source's transport ray grid</summary>

```c
void st_rt_source_set_ray_count(STRT_Context* context, STSourceId source, int width, int height);
```

**Purpose** — Sets the transport (diffuse transport) ray grid N = `width` × `height` that this source casts. A per-source knob for balancing quality against compute cost.

**When / how** — Call it at any time after creation. The default grid is 16 × 8. More rays cost more; to spread that cost over several propagations, also use `st_rt_source_set_transport_refresh_steps`. A value of 0 or less, or one that exceeds the engine's transport budget (a limit depending on grid and depth), is rejected and leaves `ST_STATUS_INVALID_ARGUMENT` in `last_status` (reason via `st_rt_get_last_error`). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `width` | Horizontal ray count of the grid, at least 1. Default 16 |
| `height` | Vertical ray count of the grid, at least 1. Default 8 |

**Returns** — Nothing. Check success with `st_rt_get_last_status`.

</details>

<details>
<summary><code>st_rt_source_set_depth</code> — Sets the per-source maximum reflection depth</summary>

```c
void st_rt_source_set_depth(STRT_Context* context, STSourceId source, int depth);
```

**Purpose** — Sets the maximum reflection (bounce) depth of this source's transport rays. Together with `st_rt_source_set_ray_count`, a knob for per-source quality and cost.

**When / how** — Call it at any time after creation. The per-source default is 4. A value that exceeds the engine's transport budget or is out of the allowed range is rejected and leaves `ST_STATUS_INVALID_ARGUMENT` in `last_status` (reason via `st_rt_get_last_error`). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `depth` | Maximum reflection depth. Default 4 |

**Returns** — Nothing. Check success with `st_rt_get_last_status`.

</details>

<details>
<summary><code>st_rt_source_set_transport_refresh_steps</code> — Sets over how many propagations the transport ray grid is refreshed</summary>

```c
int st_rt_source_set_transport_refresh_steps(STRT_Context* context, STSourceId source, int steps);
```

**Purpose** — Makes this source's transport ray grid N (= `width` × `height`) refresh **over n propagations**. Each propagation replaces ceil(N/n) rays, and the total cost is Σ N/n. The engine imposes no global budget limit, so with many sources the host controls the cost through n. Check support with `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`.

**When / how** — Call it at any time after creation. When the grid is split, the directions of rays not yet refreshed are kept between propagations so reverb taps continue smoothly; `steps = 1` re-lays the whole grid every propagation, breaking that continuity in exchange for being fully deterministic. It does not trigger IR reconversion, but when the value changes the scene snapshot is republished to the workers and the transport cache is rebuilt at the next propagation. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `steps` | `0` = default (decided by the scheduler and `isDynamic` — `ST_RT_SCHEDULER_PIPELINED` dynamic 8 · static 16, `ST_RT_SCHEDULER_SYNCHRONOUS` dynamic 1 · static 16) / `1` = full retrace every propagation (deterministic path with no storage) / `2` or more = refresh split over n, clamped to `[1, N]` when used. Negative values are rejected |

**Returns** — `1` = success / `0` = failure. A negative `steps` gives `ST_STATUS_INVALID_ARGUMENT`, a nonexistent source `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_rt_source_get_transport_refresh_steps</code> — Reads the stored transport refresh step count</summary>

```c
int st_rt_source_get_transport_refresh_steps(const STRT_Context* context, STSourceId source);
```

**Purpose** — Queries the value stored with `st_rt_source_set_transport_refresh_steps`.

**When / how** — Call it at any time. The returned value is **the stored value as is** (including 0), not the effective n after the scheduler default and grid clamp. Thread: `[control]` — a pure query that takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |

**Returns** — The stored step count (`0` = default). `-1` on failure.

</details>

<details>
<summary><code>st_rt_source_set_axis_attenuation</code> — Sets cone (on/off-axis) directional attenuation per band</summary>

```c
void st_rt_source_set_axis_attenuation(STRT_Context* context, STSourceId source, const float onAxis[ST_FREQUENCY_BANDS], const float offAxis[ST_FREQUENCY_BANDS]);
```

**Purpose** — Simple cone directivity that sets the source's front (on-axis) and side/rear (off-axis) radiation per each of the 9 bands. Gives the source a rough directionality when no measured directivity data is available.

**When / how** — Call it at any time after creation. The default is omnidirectional (1.0 in every band). For omnidirectional pass `onAxis[] = offAxis[] = 1.0`; for simple directional pass `onAxis[] = 1.0` / `offAxis[] = 0.0` (the same as the two profiles of `STSourceDesc::directional`). The front direction is set by `st_rt_source_set_direction` / `st_rt_source_set_orientation_q`. While a directivity table (`st_rt_source_set_directivity`) is attached, the table is used; these cone values are preserved and used again once the table is removed. Thread: `[control]`. It cannot be used on speaker-set member sources (ignored, `ST_STATUS_INVALID_ARGUMENT`).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `onAxis` | Front radiation attenuation, `ST_FREQUENCY_BANDS` (9) values, bands 63 Hz … 16 kHz. NULL changes nothing |
| `offAxis` | Side/rear radiation attenuation, 9 values. NULL changes nothing |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_set_orientation_q</code> — Sets the source's local frame with a quaternion</summary>

```c
int st_rt_source_set_orientation_q(STRT_Context* context, STSourceId source, const float quatXYZW[4]);
```

**Purpose** — Sets the rotation that places the source's local frame in the world as a unit quaternion (local→world). Unlike `st_rt_source_set_direction` it expresses **roll as well**, so use it to set the frame of a left/right-asymmetric directivity table precisely. Check support with `ST_CAP_SOURCE_DIRECTIVITY`.

**When / how** — Call it at any time after creation. The local axes are forward = +Z / up = +Y / right = +X. It is synchronized both ways with `st_rt_source_set_direction` — calling this function also updates direction = forward(q), and calling `st_rt_source_set_direction` changes the orientation to the roll-free minimal rotation (whichever is called last wins). The engine normalizes the quaternion, so a roughly normalized value is fine. Use it as a pair with the directivity table (`st_rt_source_set_directivity`). Thread: `[control]`. Speaker-set member sources return `0` (`ST_STATUS_INVALID_ARGUMENT`).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `quatXYZW` | Local→world rotation quaternion, **X, Y, Z, W order** (same order as `st_rt_object_create_q`) |

**Returns** — `1` = success / `0` = failure. `ST_STATUS_INVALID_ARGUMENT` (non-finite component or degenerate, norm &lt; 1e-12), `ST_STATUS_NOT_FOUND` (nonexistent source).

</details>

<details>
<summary><code>st_rt_source_set_directivity</code> — Attaches or detaches a directivity table on a source</summary>

```c
int st_rt_source_set_directivity(STRT_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**Purpose** — Attaches to a source a per-direction, per-band radiated energy table obtained from measurement data or similar. Needed to use the directivity pattern of a real source that cannot be expressed with the cone formula (`st_rt_source_set_axis_attenuation`). Check support with `ST_CAP_SOURCE_DIRECTIVITY`.

**When / how** — Call it at any time after creation. The engine **copies** the table and also computes the normalization scalar once in this call, so the host buffer may be freed after it returns. While a table is attached it is used instead of cone attenuation; detaching it with `table = NULL` returns to the preserved cone values. Table lookup directions are relative to the source local frame, so use it as a pair with `st_rt_source_set_orientation_q`. Thread: `[control]`. Speaker-set member sources return `0` (`ST_STATUS_INVALID_ARGUMENT`).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |
| `table` | Directivity table `STSourceDirectivity` (below). The caller fills `structSize` / `apiVersion`. NULL = remove the table |

**Struct** `STSourceDirectivity`

A 9-band **energy** table over an equiangular azimuth (az) × elevation (el) node grid in the source local frame (forward = +Z, up = +Y, right = +X). The direction convention is the same as engine-wide: az = atan2(x, z) (front 0°, right +90°), el = asin(y) (up = +). Nodes are az_i = i × 360/`azCount` (wrapping at 360°), el_j = −90 + j × 180/(`elCount` − 1), and lookup is bilinear interpolation with az wrap · el clamp. If `elCount` is odd the horizontal plane (el = 0) lies on a node; the recommended grid is 5° spacing (`azCount` = 72, `elCount` = 37).

| Field | Description |
|---|---|
| `structSize` | Filled by the caller with `sizeof(STSourceDirectivity)` |
| `apiVersion` | Filled by the caller with `ST_ABI_VERSION` |
| `azCount` | Number of azimuth nodes, `[3, 361]` |
| `elCount` | Number of elevation nodes, `[2, 181]` |
| `levelMode` | `STDirectivityLevelMode` — how the table's absolute level is interpreted (below) |
| `reserved0` | Reserved |
| `energy` | Table data, `elCount` × `azCount` × `ST_FREQUENCY_BANDS` floats. Layout is `[el][az][band]` (band is the fastest axis). **Energy-domain** (not pressure); every value must be finite and ≥ 0 |
| `reserved[6]` | Reserved |

**Enum** `STDirectivityLevelMode` — Leaves the raw table as is and changes only the per-band normalization scalar the engine computes once when it is set.

| Value | Description |
|---|---|
| `ST_DIRECTIVITY_ABSOLUTE` (0) | No normalization; values are used as is. For measured tables that include the absolute level |
| `ST_DIRECTIVITY_POWER_MEAN` (1) | Normalized so the per-band spherical power mean is 1 (equal radiated power). For when you use only the directivity pattern and set the total radiated power separately with `intensity` / `st_rt_source_set_energy`. **Recommended default** |
| `ST_DIRECTIVITY_ON_AXIS` (2) | Normalized so the front (az = 0, el = 0) value is 1. Matches the cone convention of game tools |

**Returns** — `1` = success (including a successful table removal) / `0` = failure. `last_status`:
- `ST_STATUS_VERSION_MISMATCH` — `structSize` / `apiVersion` mismatch in `table`.
- `ST_STATUS_INVALID_ARGUMENT` — `levelMode` outside `STDirectivityLevelMode`, `azCount` · `elCount` out of range, `energy` is NULL, non-finite or negative elements in `energy` (reason via `st_rt_get_last_error`), speaker-set member.
- `ST_STATUS_NOT_FOUND` — nonexistent source.

</details>

<details>
<summary><code>st_rt_source_idle</code> — Idles one source</summary>

```c
int st_rt_source_idle(STRT_Context* context, STSourceId source);
```

**Purpose** — Stops computation and rendering for a single source, independently of whole-engine idle (`st_rt_idle`). Use it to hold a source that has finished playing but will be used again soon, at no cost, without deleting it. Check support with `ST_CAP1_ENGINE_IDLE` of `st_rt_get_capability_word(1)`.

**When / how** — Call it after that source has stopped producing sound (stop · pause · writing zeros). A newly created source is RUNNING (even if the whole engine is IDLE).
- Once called, the propagation lanes (direct · reflection/diffraction · reverb) stop computing that source and freeze its last result. If the listener or source moves while idle, that source's propagation paths stay where they were; if the room (static · dynamic geometry) changes, they are recomputed once and frozen again.
- During `ST_RT_IDLE_DRAINING` the render plays out the source's remaining sound (tail). If the input keeps producing sound, it keeps rendering as DRAINING.
- Once the input has been silent for the delay-line length (max delay) + 1 s it becomes `ST_RT_IDLE_IDLE`: the render neither reads nor renders that source's input, and it drops out of IR assembly (the tail in the shared reverb tank continues).
- Up to 128 sources can be idle at once. Calling again with the same value does nothing.
- Propagation is frozen under `ST_RT_SCHEDULER_PIPELINED`. Under `ST_RT_SCHEDULER_SYNCHRONOUS`, `st_rt_propagate` also computes idle sources; only the render-side idle is the same.
- Speaker-set members have their idle owned by the set, so use `st_rt_speaker_set_idle` / `_run`.

Thread: `[control]` — takes the scene lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Handle of the source to idle |

**Returns** — `1` = success / `0` = failure: NULL context, nonexistent source (`ST_STATUS_NOT_FOUND`), speaker-set member (`ST_STATUS_INVALID_ARGUMENT`), the concurrent-idle table is full (`ST_STATUS_UNAVAILABLE`, nothing changes).

</details>

<details>
<summary><code>st_rt_source_run</code> — Restarts an idle source</summary>

```c
int st_rt_source_run(STRT_Context* context, STSourceId source);
```

**Purpose** — Makes a source idled with `st_rt_source_idle` compute and render again. Check support with `ST_CAP1_ENGINE_IDLE`.

**When / how** — Call it right before playing that source again. Computation resumes from the next propagation and rendering from the next block. It sounds immediately with the held IR, and uses new results from the next IR that includes that source (one assembly cycle later). Host stream frames not read while idle continue from where they left off. Does nothing if already RUNNING. Thread: `[control]` — takes the scene lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Handle of the source to wake |

**Returns** — `1` = success / `0` = failure: NULL context, nonexistent source (`ST_STATUS_NOT_FOUND`), speaker-set member (`ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_rt_source_get_idle_state</code> — Reads a source's idle state</summary>

```c
int st_rt_source_get_idle_state(const STRT_Context* context, STSourceId source);
```

**Purpose** — Queries the idle state of one source. Use it to check whether the tail has fully played out after `st_rt_source_idle`.

**When / how** — Call it at any time. It is RUNNING if idle was not requested, DRAINING while the render is playing out remaining sound, and IDLE once drained. If the render is not running or the whole engine is IDLE, a source for which idle was requested is IDLE. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |

**Returns** — An `STRT_IdleState` value: `ST_RT_IDLE_RUNNING` (0) / `ST_RT_IDLE_DRAINING` (1) / `ST_RT_IDLE_IDLE` (2). `-1` for a nonexistent source or NULL context.

</details>

<details>
<summary><code>st_rt_source_get_position_seconds</code> — Reads the playback position of the source input in seconds</summary>

```c
double st_rt_source_get_position_seconds(STRT_Context* context, STSourceId source);
```

**Purpose** — Queries the current playback position of the file input attached to a source, in source time (seconds). Use it for progress display in a playback UI or to pair with `st_rt_source_seek`. Check support with `ST_CAP_SOURCE_PLAYBACK_CONTROL`.

**When / how** — Call it at any time after attaching audio input. The value is in seconds of source time and is independent of `hostSampleRate` and pitch. Live PCM input such as a host stream has its timeline owned by the host, so it has no position. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Target source handle |

**Returns** — Playback position (seconds). `-1` for a nonexistent source or live input.

</details>

</details>

<details>
<summary><strong>Sources — audio input (file · clip · stream), playback control, source EQ</strong> — 27 functions</summary>

<details>
<summary><code>st_rt_source_clear_audio</code> — Detaches the audio input (file · clip · host stream) from a source</summary>

```c
int st_rt_source_clear_audio(STRT_Context* context, STSourceId source);
```

**Purpose** — Detaches the audio input attached to a source. The source and its render slot remain; only that source goes silent. File input (the `st_rt_source_set_audio_file` family) and host streams (`st_rt_source_attach_stream`) are both "audio input", so both are detached with this function.

**When / how** — Use it to cut only the sound without deleting the source, or to clear it before switching to another input. Detaching ramps down over 3 ms. After a stream is detached, `st_rt_source_write_stream` writes nothing and returns `0`. Do not call it concurrently with `st_rt_source_write_stream` on the same source. `st_rt_source_destroy`, which deletes the source, also detaches the input, so there is no need to call this function before it. Rejected for speaker-set member sources (`ST_STATUS_INVALID_ARGUMENT`). Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id (`STSourceId`, the value returned by `st_rt_source_create`) |

**Returns** — `1` = detached / `0` = failure (NULL context, nonexistent source, speaker-set member, etc.).

</details>

<details>
<summary><code>st_rt_source_set_eq</code> — Applies a 9-band graphic EQ to the source's dry signal</summary>

```c
int st_rt_source_set_eq(STRT_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**Purpose** — Applies per-band gains to the source signal to correct its timbre. The filter sits before the crossover, i.e. on the source signal itself, so the source's direct · transmission · reflection · diffraction · reverb sends all pass through the same filter (the same as putting an EQ in a real loudspeaker's signal chain). Same filter design as the output-stage EQ (`st_rt_render_set_eq`) and same implementation as offline `st_off_source_set_eq`.

**When / how** — Can be called at any time after the source is created, including during playback. It does not invalidate the IR and is delivered to the render thread as an allocation-free command. Changing it during playback switches the coefficients immediately while keeping the filter state (no smooth ramp — if you need click-free transitions, use `st_rt_source_set_parametric_eq`). This function and `st_rt_source_set_parametric_eq` change **the same source EQ**, and whichever is called last wins. Passing `gainsDb = NULL` disables and clears the EQ (this also clears a parametric setting). The setting persists until the source is deleted. It can also be applied to speaker-set member sources. Check support with `ST_CAP_SOURCE_EQ` (`st_rt_get_capability_word(0)`). Thread: `[control]` — briefly takes the scene read lock and the render control lock, so do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `gainsDb` | `ST_FREQUENCY_BANDS` (9) gains (dB), band order 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz. Each value must be finite and within `[-ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]` (±24 dB) — values outside are rejected, not clamped. `NULL` or 0 dB in every band disables the EQ (bit-identical to the result without EQ) |

**Filter definition** — One RBJ peaking biquad per band (Q = 1.414, about 1 octave), cascaded in ascending band order. The sample rate is fixed at the engine's internal 44100 Hz and is independent of the host sample rate (`hostSampleRate`). Bands with `|g| ≤ 1e-4 dB` are skipped. Neighboring band responses overlap (peaking filter skirts), so for the exact specified gain at a band center the host must compensate the gains it passes.

**Returns** — `1` = success / `0` = failure. On failure `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` (non-finite value or `|g| > 24`, nothing changed) / `ST_STATUS_NOT_FOUND` (no source) / `ST_STATUS_UNAVAILABLE` (this context's backend does not support source EQ).

</details>

<details>
<summary><code>st_rt_source_get_eq</code> — Reads the source EQ as 9-band gains</summary>

```c
int st_rt_source_get_eq(STRT_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**Purpose** — Returns the current source EQ as a 9-band graphic view. There is one source EQ, and this function is a compatibility view that shows its band list as 9-band gains.

**When / how** — If there is no EQ or it is disabled, writes all zeros. If it has the 9-band shape (canonical center frequencies · 9 `ST_PARAMETRIC_EQ_PEAKING` bands with Q 1.414 · preamp 0 · enabled), writes those gains. Any other parametric setting cannot be expressed as 9 bands, so it returns `0` + `ST_STATUS_UNAVAILABLE` and leaves `outGainsDb` untouched. To tell what `UNAVAILABLE` means, call `st_rt_source_get_parametric_eq` — if it succeeds, it means "a parametric setting that cannot be read as 9 bands" (read the setting that way); if it fails with the same `UNAVAILABLE`, the backend does not support source EQ. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `outGainsDb` | Caller-owned `float[ST_FREQUENCY_BANDS]` output buffer (63…16k Hz order, dB). `NULL` is rejected |

**Returns** — `1` = success / `0` = failure. On failure `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` (`outGainsDb` is NULL) / `ST_STATUS_NOT_FOUND` (no source) / `ST_STATUS_UNAVAILABLE` (the two cases above).

</details>

<details>
<summary><code>st_rt_source_set_parametric_eq</code> — Applies a parametric EQ of up to 16 bands to the source's dry signal</summary>

```c
int st_rt_source_set_parametric_eq(STRT_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**Purpose** — Applies to the source signal a parametric EQ whose band type · frequency · gain · Q you set directly. It is applied at the same place as `st_rt_source_set_eq` (before the crossover, on every path of that source) and is **the same EQ**. Use it when each source needs a different frequency correction, as with virtual speakers.

**When / how** — Can be called at any time after the source is created, including during playback. It does not invalidate the IR and is delivered to the render thread as an allocation-free command. When the value changes, the old and new settings run side by side for 20 ms and the output is crossfaded, so there are no clicks. If it changes again in the meantime, only the most recent value waits and then follows on. This function and `st_rt_source_set_eq` both replace the entire source EQ list, and the last setter wins. Disabled lists and lists with no effect are also stored and returned as is by the getter — to disable and clear, call `st_rt_source_set_eq(context, source, NULL)`. It can be applied as is to speaker-set member sources (ids obtained with `st_rt_speaker_set_get_source`), so each virtual speaker can get a different correction. An AutoEq `ParametricEQ.txt` can be read with `st_rt_render_parse_autoeq_parametric` and its result passed straight in. The setting persists until the source is deleted. Check support with `ST_CAP1_SOURCE_PARAMETRIC_EQ` (`st_rt_get_capability_word(1)`). Thread: `[control]` — takes the scene read lock and the render control lock.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `bands` | `STParametricEqBand` array (`bandCount` entries). May be `NULL` when `bandCount = 0` |
| `bandCount` | Number of bands, `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` (0–16). Out of range is rejected |
| `preampDb` | Linear gain applied before the bands (dB), `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[-48, +12]`. Mainly used with negative values to prevent clipping |
| `enabled` | `0` = store the list but bypass (same as no EQ) / anything else = on |

**Struct** `STParametricEqBand` (32 bytes, an array element so no version stamp)

| Field | Description |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING` (0) / `LOW_SHELF` (1) / `HIGH_SHELF` (2) / `LOW_PASS` (3) / `HIGH_PASS` (4) / `NOTCH` (5). Unknown values are rejected |
| `enabled` | `0` = skip this band (identity) / anything else = on |
| `frequencyHz` | Center frequency for PEAKING · NOTCH, midpoint for shelves, corner frequency for LP · HP. `[ST_PARAMETRIC_EQ_MIN_FREQUENCY_HZ, min(ST_PARAMETRIC_EQ_MAX_FREQUENCY_HZ, 0.49·Fs)]` = 20 Hz – 20 kHz (Fs = 44100) |
| `gainDb` | Used only by PEAKING · LOW_SHELF · HIGH_SHELF (LP · HP · NOTCH only store the value). `[-ST_PARAMETRIC_EQ_MAX_GAIN_DB, +ST_PARAMETRIC_EQ_MAX_GAIN_DB]` = ±24 dB |
| `q` | `[ST_PARAMETRIC_EQ_MIN_Q, ST_PARAMETRIC_EQ_MAX_Q]` = 0.1 – 30. LOW_SHELF · HIGH_SHELF use `[0.1, ST_PARAMETRIC_EQ_MAX_SHELF_Q]` = 0.1 – 3 — a large Q on a high-gain shelf produces a large resonant peak at the corner, and the source EQ sits before the limiter, so nothing stops it |
| `reserved[3]` | Must be 0 (otherwise rejected) |

**Filter definition** — One RBJ Audio EQ Cookbook second-order section per band, and the chain is preamp → bands 0…`bandCount-1` in series. The sample rate is the engine's internal 44100 Hz. Bands with `enabled = 0` and PEAKING · shelf bands with `|gainDb| ≤ 1e-4` are exactly identity. If the whole EQ is disabled or has no effect (every band identity + preamp 0 dB), the result is bit-identical to having no EQ once the transition ramp ends.

**Value validation** — Non-finite values · unknown `type` · `reserved ≠ 0` · `bandCount` out of range · `bands` NULL (when `bandCount > 0`) are rejected and nothing changes. Finite values out of range are **clamped**, and the getter returns the clamped effective values (unlike the 9-band `st_rt_source_set_eq`, which rejects instead of clamping).

**Returns** — `1` = success / `0` = failure. On failure `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` (validation above) / `ST_STATUS_NOT_FOUND` (no source) / `ST_STATUS_UNAVAILABLE` (this context's backend does not support source EQ).

</details>

<details>
<summary><code>st_rt_source_get_parametric_eq</code> — Reads the source EQ's band list · preamp · enabled state</summary>

```c
int st_rt_source_get_parametric_eq(STRT_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**Purpose** — Returns the current source EQ setting as clamped effective values. A setting applied with `st_rt_source_set_eq` (9 bands) is also read as 9 `ST_PARAMETRIC_EQ_PEAKING` bands. With no EQ it is 0 bands · disabled.

**When / how** — The output convention is the same as `st_rt_render_get_parametric_eq`. `outBands = NULL` acts as a size query: it writes no bands, fills only the count · preamp · enabled state and returns `1`. Passing `bandCapacity` as `ST_PARAMETRIC_EQ_MAX_BANDS` (16) always fits. The `reserved` of returned bands is filled with 0. Thread: `[control]` — takes the scene read lock and the render control lock.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `outBands` | Caller-owned `STParametricEqBand` array. `NULL` = size query. See the `st_rt_source_set_parametric_eq` entry for the fields |
| `bandCapacity` | Number of `outBands` elements. Negative is rejected. If smaller than the band count, `0` + `ST_STATUS_BUFFER_TOO_SMALL` (count · preamp · enabled are still written) |
| `outBandCount` | Pointer that receives the band count. Skipped if `NULL` |
| `outPreampDb` | Pointer that receives the preamp (dB). Skipped if `NULL` |
| `outEnabled` | Pointer that receives the enabled state (`0`/`1`). Skipped if `NULL` |

**Returns** — `1` = success / `0` = failure. On failure `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` (`bandCapacity < 0`) / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_NOT_FOUND` (no source) / `ST_STATUS_UNAVAILABLE` (this context's backend does not support source EQ).

</details>

<details>
<summary><code>st_rt_source_set_path_volume</code> — Sets a source's volume per path type</summary>

```c
int st_rt_source_set_path_volume(STRT_Context* context, STSourceId source, int volumeKind, float volume);
```

**Purpose** — Raises or lowers a source's direct · reflection · diffraction · reverb contributions separately. The value is a linear pressure scale. The direct volume also covers transmission paths, and the reverb volume adjusts only **the amount this source sends** into the late reverb shared by the listener.

**When / how** — Call it at any time after the source is created. All 4 are `1.0` right after creation. To remove a path entirely use `st_rt_source_set_path_enabled`; for the whole source level use `st_rt_source_set_volume`. It can also be applied to speaker-set member sources. Check support with `ST_CAP_SOURCE_PATH_VOLUME`. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT` (0, includes transmission) / `ST_SOURCE_VOLUME_REFLECTION` (1) / `ST_SOURCE_VOLUME_DIFFRACTION` (2) / `ST_SOURCE_VOLUME_REVERB` (3, send into the shared late reverb). Anything else is rejected |
| `volume` | Linear pressure scale, finite and ≥ `0`. Default `1.0` |

**Returns** — `1` = applied / `0` = failure (unknown `volumeKind`, non-finite or negative `volume`, nonexistent source).

</details>

<details>
<summary><code>st_rt_source_get_path_volume</code> — Reads a source's volume per path type</summary>

```c
float st_rt_source_get_path_volume(STRT_Context* context, STSourceId source, int volumeKind);
```

**Purpose** — Returns the per-path-type linear volume set with `st_rt_source_set_path_volume`.

**When / how** — Can be called at any time. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `volumeKind` | `STSourceVolumeKind` — `DIRECT`(0) / `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3) |

**Returns** — Linear volume (default `1.0`). `-1` for an unknown `volumeKind` or NULL context.

</details>

<details>
<summary><code>st_rt_source_set_audio_file</code> — Opens an audio file and attaches it as the source's input</summary>

```c
int st_rt_source_set_audio_file(STRT_Context* context, STSourceId source, const char* audioPath, int loop);
```

**Purpose** — The engine opens and decodes the file itself and uses it as the source input. The soundtracing input method, since the host does not need to handle PCM.

**When / how** — Call it after creating the source; right after attaching it is stopped, so sound starts with `st_rt_source_play`. Channels are mixed to mono (stereo = 1/√2·L + 1/√2·R) and converted to the engine rate of 44.1 kHz. If a host stream is attached to the same source, the file input displaces it (`st_rt_source_write_stream` then returns `0`). The repeat count can be changed later with `st_rt_source_set_loop_count`. Rejected for speaker-set member sources. Thread: `[control, blocking]` — opens the file and creates a decoder, so do not call it from the game loop or the audio thread.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `audioPath` | File path, **UTF-8** (on Windows too — non-ASCII paths such as Korean work). Supported: WAV (PCM · float · ADPCM · µ-law · A-law, RF64 · W64), FLAC, MP3, Ogg Vorbis. Ogg Opus · AAC/M4A · ALAC · WMA cannot be opened and fail |
| `loop` | `0` = play once / anything else = loop forever |

**Returns** — `1` = input attached / `0` = failure (NULL path, unopenable file · unsupported format, nonexistent source, speaker-set member, etc.).

</details>

<details>
<summary><code>st_rt_source_set_audio_asset</code> — Attaches an encoded file from the host asset system as streaming input</summary>

```c
int st_rt_source_set_audio_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io, int repeatCount);
```

**Purpose** — Lets audio that cannot be opened by an OS path, such as a game engine's pack files or virtual file system, be read through host callbacks. Uses the same decoders as `st_rt_source_set_audio_file` (WAV/FLAC/MP3/Vorbis) and decodes as a seekable stream without reading the whole file up front.

**When / how** — The playback convention is the same as `st_rt_source_set_audio_file` (stopped right after attaching, started with `st_rt_source_play`). The callback table is copied, but `userData` and the host asset system must stay alive while the input is attached. `open`/`close` are called on the control thread, and `read`/`seek` during probing within this call and on the single decoder worker thread. Callbacks must not throw exceptions or call back into the engine API. `close` is called once for every successful `open` (including when decoder initialization fails). Different contexts can decode concurrently. If attaching fails, the previous input is kept. Check support with `ST_CAP_AUDIO_ASSET_IO`. Rejected for speaker-set member sources. Thread: `[control, blocking]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `assetName` | Asset name passed as is to `io->open` |
| `io` | `STAudioAssetIO` callback table. The caller fills `structSize = sizeof(STAudioAssetIO)`, `apiVersion = ST_ABI_VERSION`, with `reserved` set to 0 |
| `repeatCount` | Additional repeats — `0` = once / `-1` = forever / positive N = N more times |

**Struct** `STAudioAssetIO`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STAudioAssetIO)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `userData` | Host pointer passed as the first argument of every callback |
| `open` | `void* open(void* userData, const char* assetName)` — opens the asset and returns a handle |
| `read` | `uint64_t read(void* userData, void* handle, void* output, uint64_t bytes)` — returns the number of bytes read (`0` = EOF, must not exceed the request) |
| `seek` | `int seek(void* userData, void* handle, int64_t offset, int origin)` — `origin` `0` = from the start / `1` = from the current position. `1` = success / `0` = error |
| `close` | `void close(void* userData, void* handle)` — closes the handle |
| `reserved[2]` | 0 |

**Returns** — `1` = input attached / `0` = failure (previous input kept).

</details>

<details>
<summary><code>st_rt_source_set_audio_clip</code> — Decodes a short file in full and attaches it as a cached clip</summary>

```c
int st_rt_source_set_audio_clip(STRT_Context* context, STSourceId source, const char* audioPath);
```

**Purpose** — Decodes a short sound in full, once, to 44.1 kHz mono PCM and caches it on the source. An input for replaying the same sound repeatedly from a live source with `st_rt_source_trigger` (one shot at a time) or `st_rt_source_set_retrigger_interval` (fixed interval), without creating a new source or decoding again.

**When / how** — Formats and downmix are the same as `st_rt_source_set_audio_file`, and the decoded length is at most 60 seconds. If attaching fails, the previous input is kept. On success the clip starts paused with retrigger interval `0` and EOF repeat count `0`, and the source's volume · pitch are kept. Check support with `ST_CAP_SOURCE_RETRIGGER`. Rejected for speaker-set member sources. Thread: `[control, blocking]` — decodes the whole file, so do not call it from the game loop or the audio thread.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `audioPath` | File path (UTF-8). See the `st_rt_source_set_audio_file` entry for supported formats |

**Returns** — `1` = clip attached / `0` = failure (previous input kept).

</details>

<details>
<summary><code>st_rt_source_set_audio_clip_asset</code> — Decodes a host asset in full and attaches it as a cached clip</summary>

```c
int st_rt_source_set_audio_clip_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io);
```

**Purpose** — The asset version of `st_rt_source_set_audio_clip`. Decodes encoded data read through host callbacks (`STAudioAssetIO`) in full to 44.1 kHz mono PCM and caches it.

**When / how** — Behavior and constraints (at most 60 seconds, starts paused, interval `0` · EOF repeat `0`, volume · pitch kept, previous input kept on failure) are the same as `st_rt_source_set_audio_clip`. Since it is a cached clip, every callback is called and closed within this call — `userData` only needs to be valid until this function returns. Check support with `ST_CAP_SOURCE_RETRIGGER` and `ST_CAP_AUDIO_ASSET_IO`. Thread: `[control, blocking]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `assetName` | Asset name passed to `io->open` |
| `io` | `STAudioAssetIO` callback table (the caller fills `structSize`/`apiVersion`). See the `st_rt_source_set_audio_asset` entry for the fields |

**Returns** — `1` = clip attached / `0` = failure (previous input kept).

</details>

<details>
<summary><code>st_rt_source_set_retrigger_interval</code> — Makes a cached clip restart at a fixed interval</summary>

```c
int st_rt_source_set_retrigger_interval(STRT_Context* context, STSourceId source, double seconds);
```

**Purpose** — Restarts the same cached clip every `seconds` start-to-start interval, measured on the output timeline. Use it when you need a regular repeating sound that is not jittered by the timing of control-thread calls. Acoustic paths · delay · reverb state are kept across restarts.

**When / how** — Usable only with a cached clip attached by `st_rt_source_set_audio_clip`/`_clip_asset`. The interval is rounded to the nearest 44.1 kHz output sample, and pitch does not change the interval. A change takes effect at the next input read boundary and starts one full new interval. Enabling it after EOF restarts the clip. Setting the same (quantized) interval again leaves the running clock as is. `0` cancels further restarts and lets the currently sounding shot finish. `st_rt_source_play` starts · resumes, `st_rt_source_pause` stops the clock, and `st_rt_source_stop` pauses and rewinds but keeps the interval setting. EOF repeat (`st_rt_source_set_loop_count`) and a positive interval cannot be used together. On restart the cursor reset continues through a 3 ms transition, and an unfinished previous shot is replaced rather than mixed. Check support with `ST_CAP_SOURCE_RETRIGGER`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id (a source with a cached clip attached) |
| `seconds` | Start-to-start interval (seconds). The positive range is 1 output sample – 3600 s. `0` = off (default) |

**Returns** — `1` = success / `0` = failure (invalid value, nonexistent source, input that is not a cached clip, etc.).

</details>

<details>
<summary><code>st_rt_source_get_retrigger_interval</code> — Reads the cached clip's retrigger interval</summary>

```c
double st_rt_source_get_retrigger_interval(STRT_Context* context, STSourceId source);
```

**Purpose** — Returns the interval set with `st_rt_source_set_retrigger_interval` as its quantized effective value (seconds).

**When / how** — Can be called at any time. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — The quantized interval (seconds). `0` = off / `-1` = no source or not a cached clip.

</details>

<details>
<summary><code>st_rt_source_trigger</code> — Requests that the cached clip play once from the start</summary>

```c
int st_rt_source_trigger(STRT_Context* context, STSourceId source);
```

**Purpose** — Restarts a live source's cached clip from the start, timed to a single external event. It neither decodes nor creates a source, so use it instead of creating a new source when playing short sounds frequently. Acoustic delay · reflection · reverb history continue across the restart.

**When / how** — A cached clip must be attached, with retrigger interval `0` and EOF repeat count `0`. No separate `st_rt_source_play` is needed. The request starts at the next engine block after the context's initial sound field has been consumed, and multiple requests before that are merged into one. `st_rt_source_pause`/`st_rt_source_stop`, a successful `st_rt_source_seek`, and changes to the interval or repeat settings cancel a pending request. Keep the source enabled (`st_rt_source_set_enabled`) so it renders. The cursor resets at the input read boundary with a 3 ms transition, and an unfinished previous shot is replaced. `1` means it was queued, not that it has already played on the device. Check support with `ST_CAP_SOURCE_TRIGGER`. Rejected for speaker-set member sources. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id (a source with a cached clip attached) |

**Returns** — `1` = queued / `0` = rejected (not a cached clip, interval or repeat not zero, nonexistent source, etc.).

</details>

<details>
<summary><code>st_rt_source_seek</code> — Moves the playback position of the file input</summary>

```c
int st_rt_source_seek(STRT_Context* context, STSourceId source, double seconds);
```

**Purpose** — Moves the playback cursor of a file · asset · clip input to `seconds` in source time.

**When / how** — The position is rounded down to source file frames, and the play/pause state is kept. It discards decoder and pitch lookahead and refills the configured repeat count. Seek accuracy in compressed formats is limited by the codec. Host streams (live PCM) are rejected because the host owns their timeline. Read the current position with `st_rt_source_get_position_seconds` (in seconds, independent of `hostSampleRate` and pitch). A successful seek cancels a pending `st_rt_source_trigger` request. Check support with `ST_CAP_SOURCE_PLAYBACK_CONTROL`. Rejected for speaker-set member sources. Thread: `[control, blocking]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `seconds` | Position in source time (seconds). Finite and ≥ `0` |

**Returns** — `1` = success / `0` = failure (invalid value, nonexistent source, not a file input, etc.).

</details>

<details>
<summary><code>st_rt_source_set_loop_count</code> — Sets the repeat count of the file input</summary>

```c
int st_rt_source_set_loop_count(STRT_Context* context, STSourceId source, int repeatCount);
```

**Purpose** — Sets how many more times a file · asset · clip input returns to the start and plays again when it reaches the end.

**When / how** — Refills the repeat budget from the current cursor position. `st_rt_source_stop` restores this budget as it rewinds. Host streams (live PCM) are rejected. On a cached clip it cannot be combined with a positive retrigger interval (`st_rt_source_set_retrigger_interval`), and changing the repeat setting cancels a pending `st_rt_source_trigger` request (trigger requires a repeat count of `0`). Check support with `ST_CAP_SOURCE_PLAYBACK_CONTROL`. Rejected for speaker-set member sources. Thread: `[control, blocking]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `repeatCount` | Additional repeats — `0` = once / `-1` = forever / positive N = N more times. Values below `-1` are rejected |

**Returns** — `1` = success / `0` = failure (invalid value, nonexistent source, not a file input, etc.).

</details>

<details>
<summary><code>st_rt_source_get_loop_count</code> — Reads the repeat count of the file input</summary>

```c
int st_rt_source_get_loop_count(STRT_Context* context, STSourceId source);
```

**Purpose** — Returns the configured additional repeat count.

**When / how** — Can be called at any time. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — Repeat count (≥ `0`). `-1` = forever / `-2` = no source or unsupported input.

</details>

<details>
<summary><code>st_rt_source_set_volume</code> — Sets the volume of the source input</summary>

```c
int st_rt_source_set_volume(STRT_Context* context, STSourceId source, float volume);
```

**Purpose** — Applies a linear pressure gain to the source input signal. It is applied **before** the acoustic paths and DSP processing, so every path of that source (direct · reflection · diffraction · reverb send) changes together.

**When / how** — Can be called at any time on a source with audio input attached, including during playback. A changed value transitions with a 3 ms ramp. Set per-path-type ratios separately with `st_rt_source_set_path_volume`. Check support with `ST_CAP_SOURCE_PLAYBACK_CONTROL`. Rejected for speaker-set member sources (member levels are set by the speaker set API). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `volume` | Linear pressure gain, `[0, 16]`, default `1`. Out-of-range or non-finite values are rejected |

**Returns** — `1` = success / `0` = failure (out-of-range value, nonexistent source or no audio input, etc.).

</details>

<details>
<summary><code>st_rt_source_get_volume</code> — Reads the volume of the source input</summary>

```c
float st_rt_source_get_volume(STRT_Context* context, STSourceId source);
```

**Purpose** — Returns the linear volume set with `st_rt_source_set_volume`. During a ramp it is the ramp's target value.

**When / how** — Can be called at any time, and also works on speaker-set member sources. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — Linear volume (default `1`). `-1` = no source.

</details>

<details>
<summary><code>st_rt_source_set_pitch</code> — Sets the playback rate (pitch) of the source input</summary>

```c
int st_rt_source_set_pitch(STRT_Context* context, STSourceId source, float ratio);
```

**Purpose** — Changes pitch by reading the input faster or slower by a playback rate ratio. No time stretching is done, so the playback length of a file or the consumption rate of a host stream ring changes along with it.

**When / how** — Can be called at any time on a source with audio input attached. If the host already feeds a signal it has pitch-shifted itself, avoid applying it twice. Ratios other than 1 use band-limited sinc interpolation and introduce up to 67 frames of lookahead. A cached clip's retrigger interval is not affected by pitch. Check support with `ST_CAP_SOURCE_PLAYBACK_CONTROL`. Rejected for speaker-set member sources. Thread: `[control]` — builds filter coefficients, so do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `ratio` | Playback rate ratio, `[0.25, 4]`, default `1`. Out-of-range or non-finite values are rejected |

**Returns** — `1` = success / `0` = failure (out-of-range value, nonexistent source or no audio input, etc.).

</details>

<details>
<summary><code>st_rt_source_get_pitch</code> — Reads the playback rate ratio of the source input</summary>

```c
float st_rt_source_get_pitch(STRT_Context* context, STSourceId source);
```

**Purpose** — Returns the playback rate ratio set with `st_rt_source_set_pitch`.

**When / how** — Can be called at any time. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — Playback rate ratio (default `1`). `-1` = no source.

</details>

<details>
<summary><code>st_rt_source_attach_stream</code> — Attaches a stream input into which the host pushes PCM</summary>

```c
int st_rt_source_attach_stream(STRT_Context* context, STSourceId source, const STStreamDesc* desc);
```

**Purpose** — Uses mono PCM the host produces in real time, such as voice chat, synthesized sound or external middleware output, as the source input. Where file input is "the engine opens a file", this is "the host pushes PCM". The engine still owns render control and the audio device; the engine render thread reads from the per-source ring buffer when it pulls 512-frame blocks (this is not host push rendering).

**When / how** — Call it after creating the source, then supply PCM with `st_rt_source_write_stream`. Lifetime and playback conventions are the same as file input: right after attaching it is stopped, sound starts with `st_rt_source_play`, and `st_rt_source_pause`/`st_rt_source_stop` work as usual (`stop` discards frames queued in the ring — a live stream has no "rewind to start"). `st_rt_source_clear_audio` detaches it, and `st_rt_source_destroy` also detaches the stream and returns the slot. Attaching a file input to the same source displaces the stream, and conversely this function displaces a file input. Up to 64 streams can be attached at once, and a returned slot is reused by the next attach (cumulative counters restart from 0 on each attach). Ring allocation happens only once, in this call. `st_rt_source_seek` · `st_rt_source_set_loop_count` are rejected on streams. Check support with `ST_CAP_SOURCE_STREAM_INPUT` (real-time only). Rejected for speaker-set member sources. Thread: `[control]` — takes the scene read lock and the playback mutex. Do not call it concurrently with `st_rt_source_write_stream` on the same source (different sources are independent).

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |
| `desc` | `STStreamDesc`. The caller fills `structSize = sizeof(STStreamDesc)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STStreamDesc`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STStreamDesc)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `sampleRate` | Input sample rate. Must be the engine rate (`st_rt_get_sample_rate`, 44100). However, in a context that set `STRT_CreateOptions.hostSampleRate` it must be that value, and the engine puts a host→engine converter in front of the ring for each source |
| `channels` | Only `1` allowed (mono only) |
| `capacityFrames` | Ring size in **host frames** (= relative to `sampleRate`). `0` = default 8192 host frames (about 186 ms at the engine rate); otherwise `[512, 1048576]`. The engine converts this to engine frames (rounded) and then rounds up to a power of two, so the actual capacity is larger than requested — check it with `STStreamStatus.capacityFrames` |
| `reserved[5]` | 0 |

**Returns** — `1` = success / `0` = failure. On failure `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH` (`desc` stamp mismatch) / `ST_STATUS_INVALID_ARGUMENT` (`sampleRate` does not follow the rule above, `channels ≠ 1`, `capacityFrames` is neither 0 nor in `[512, 1048576]`) / `ST_STATUS_NOT_FOUND` (no source) / `ST_STATUS_UNAVAILABLE` (all 64 concurrent stream slots in use).

</details>

<details>
<summary><code>st_rt_source_write_stream</code> — Writes mono PCM into the stream input ring</summary>

```c
int st_rt_source_write_stream(STRT_Context* context, STSourceId source, const float* mono, int frames);
```

**Purpose** — Puts mono float PCM into the ring buffer of a source attached with `st_rt_source_attach_stream`. It does not block and takes no locks or allocations, so it can be called directly from the host audio thread.

**When / how** — It meets the render thread as SPSC, assuming a **single producer** per source — write to one source from only one thread. Do not call it concurrently with `st_rt_source_attach_stream`/`st_rt_source_clear_audio` on the same source (different sources are independent). On failure it does not touch the diagnostic buffer (`st_rt_get_last_status`) and reports only through `0`. Non-finite samples (NaN/Inf) are not checked, so guaranteeing finiteness is the host's responsibility. The meaning of the return value depends on whether `hostSampleRate` is set, so read the cases below carefully. Thread: `[any]` — callable from any thread and does not block.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Id of the source with a stream attached |
| `mono` | Mono float PCM buffer (`frames` samples) |
| `frames` | Number of frames to write, in **host frames** (relative to `STStreamDesc.sampleRate`) |

**Returns** — Number of frames written. `0` if no stream is attached or after it was detached.

- `hostSampleRate == 0` (no conversion): the number of frames actually put into the ring (`0`…`frames`). When the ring is full the rest is discarded and accumulated in `droppedFrames`. If the return is smaller than `frames`, the remainder may be pushed again on the next call, so it can be used as a backpressure signal.
- `hostSampleRate ≠ 0` (resampling path): always `frames`. The converter consumes all the input, so do not push the same frames again (the signal would overlap). The portion discarded on overflow is reported only through `droppedFrames`, and the return value carries no backpressure signal — throttle the supply by looking at `queuedFrames`/`capacityFrames` of `st_rt_source_get_stream_status` (e.g. push less once `queuedFrames` exceeds 3/4 of capacity).

</details>

<details>
<summary><code>st_rt_source_get_stream_status</code> — Reads fill level · underrun · drop statistics of the stream input ring</summary>

```c
int st_rt_source_get_stream_status(const STRT_Context* context, STSourceId source, STStreamStatus* outStatus);
```

**Purpose** — Returns the amount queued in the stream ring and the cumulative underrun · drop · written amounts. On the resampling path (`hostSampleRate ≠ 0`) the return value of `st_rt_source_write_stream` carries no backpressure signal, so the ratio of `queuedFrames` to `capacityFrames` is the only supply-throttling signal.

**When / how** — The normal path only does atomic reads, so it can be called from any thread, including the audio thread. However, error paths (wrong stamp or no stream) write to the context's diagnostic buffer, and this write is not serialized across threads — it is never reached if the arguments are filled correctly. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Id of the source with a stream attached |
| `outStatus` | `STStreamStatus` output. The caller fills `structSize = sizeof(STStreamStatus)`, `apiVersion = ST_ABI_VERSION` |

**Struct** `STStreamStatus`

All five frame fields are in **host frames** (relative to `STStreamDesc.sampleRate` = `hostSampleRate`, or 44100 if not set). Conversion rounds once at query time, so errors do not accumulate. On a 48 kHz host `capacityFrames` is not a power of two (e.g. engine 8192 → host 8916), so do not assume the ring size is a power of two. The three cumulative counters are totals since attach, and restart from 0 on re-attach.

| Field | Description |
|---|---|
| `structSize` | `sizeof(STStreamStatus)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `queuedFrames` | Frames currently queued in the ring |
| `capacityFrames` | Ring capacity the engine actually allocated |
| `underrunFrames` | Cumulative: frames filled with silence because the ring was empty |
| `droppedFrames` | Cumulative: frames discarded because the ring was full |
| `totalWrittenFrames` | Cumulative: frames actually put into the ring |
| `reserved[6]` | Reserved |

**Returns** — `1` = success / `0` = failure. On failure `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH` (stamp mismatch) / `ST_STATUS_NOT_FOUND` (no stream attached). Also `0` if `outStatus` or the context is NULL.

</details>

<details>
<summary><code>st_rt_source_play</code> — Starts or resumes playback of the source input</summary>

```c
void st_rt_source_play(STRT_Context* context, STSourceId source);
```

**Purpose** — Starts playback of a file · asset · clip · stream input. Right after attaching, the input is stopped, so this function must be called to produce sound.

**When / how** — Call it after attaching audio input. Actual sound starts after that source's first IR reaches the renderer. If paused it resumes from that position, and it also starts or resumes a cached clip's retrigger interval clock. Not needed for clips sounded only with `st_rt_source_trigger`. Ignored for speaker-set member sources. Thread: `[control]` — takes the playback mutex.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_pause</code> — Pauses playback of the source input</summary>

```c
void st_rt_source_pause(STRT_Context* context, STSourceId source);
```

**Purpose** — Stops playback while keeping the current cursor position. `st_rt_source_play` resumes from the same position.

**When / how** — The cursor stops immediately, and the output ramps the last waveform endpoint down to 0 over 3 ms so it cuts without a click. Reverb already spread through the room may keep ringing. A cached clip's retrigger clock also stops, and a pending `st_rt_source_trigger` request is canceled. Ignored for speaker-set member sources. Thread: `[control]` — takes the playback mutex.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_source_stop</code> — Stops playback of the source input and rewinds to the start</summary>

```c
void st_rt_source_stop(STRT_Context* context, STSourceId source);
```

**Purpose** — Stops playback and rewinds the cursor to the start. The next `st_rt_source_play` plays from the beginning.

**When / how** — The output cuts with a 3 ms ramp as with `st_rt_source_pause`, and reverb already spread through the room may keep ringing. File input restores the configured repeat count along with the rewind. A cached clip keeps its retrigger interval setting, and a pending `st_rt_source_trigger` request is canceled. A host stream has no start to rewind to, so it discards the frames queued in the ring. Ignored for speaker-set member sources. Thread: `[control]` — takes the playback mutex.

| Parameter | Description |
|---|---|
| `context` | Real-time context handle |
| `source` | Target source id |

**Returns** — Nothing.

</details>

</details>

<details>
<summary><strong>Listener · propagation · acoustic policy</strong> — 27 functions</summary>

<details>
<summary><code>st_rt_listener_set_position</code> — Sets the listener position</summary>

```c
void st_rt_listener_set_position(STRT_Context* context, float x, float y, float z);
```

**Purpose** — Changes the listener's world position. The direct · reflection · diffraction · reverb paths of every source are computed with this position as their endpoint.

**When / how** — Call it from the game loop whenever the camera or the player's head position changes. Orientation is given separately with `st_rt_listener_set_rotation` / `st_rt_listener_set_rotation_ypr` / `st_rt_listener_set_orientation_q`, and changing the position keeps the orientation. Pass coordinates **in scene units as is** (the engine converts to meters with `STRT_CreateOptions.sceneRatio`). Thread: `[control]` — call from the control thread, not from the audio callback. Under `ST_RT_SCHEDULER_PIPELINED` it does not lock the scene directly but enqueues into the motion queue and returns, and the propagation worker applies the most recent value in its next cycle. Under `ST_RT_SCHEDULER_SYNCHRONOUS` the next `st_rt_propagate` sees the new position.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `x` | World X coordinate (scene units, +X = right) |
| `y` | World Y coordinate (scene units, +Y = up) |
| `z` | World Z coordinate (scene units, +Z = forward) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_listener_set_velocity</code> — Sets the listener velocity (for Doppler)</summary>

```c
void st_rt_listener_set_velocity(STRT_Context* context, float x, float y, float z);
```

**Purpose** — Tells the engine the listener's velocity vector. The engine computes the per-path Doppler slope from the source and listener velocities.

**When / how** — It is usual to update it every frame along with the position. Pass the velocity in **scene units/second**; the engine multiplies by `sceneRatio` to get m/s and divides by the speed of sound. A stationary listener is `(0, 0, 0)`. Doppler pitch rendering itself is handled by `STRenderOptions.useDoppler`, and the radiation gain of moving sources by `st_rt_set_doppler_gain_mode`. Thread: `[control]` — do not call it from the audio callback. Under `PIPELINED` it goes into the motion queue and is applied in the next propagation cycle.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `x` | Velocity X component (scene units/second) |
| `y` | Velocity Y component (scene units/second) |
| `z` | Velocity Z component (scene units/second) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_listener_set_rotation</code> — Sets the listener orientation as yaw · pitch (radians)</summary>

```c
void st_rt_listener_set_rotation(STRT_Context* context, float yaw, float pitch);
```

**Purpose** — Sets the listener's head orientation as yaw · pitch. The azimuth and elevation for spatialization (panning · HRTF · speaker decoding) are computed relative to this orientation. Roll (head tilt) is not expressed.

**When / how** — Call it whenever the camera rotation changes. Angles are in **radians**. The rotation matrix is `R = Ry(yaw)·Rx(pitch)`, and `yaw = 0, pitch = 0` gives forward = +Z, up = +Y, right = +X (identity). **Positive yaw = turn right** (clockwise seen from above), **positive pitch = look down**. To derive them from a direction vector `d`, use `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`. The engine coordinate system is the same as Unity's, so Unity hosts can pass values without conversion; hosts with forward at −Z (OpenGL-style cameras) must flip Z or add 180 degrees to yaw. The three listener orientation setters (`st_rt_listener_set_rotation`, `st_rt_listener_set_rotation_ypr`, `st_rt_listener_set_orientation_q`) overwrite the same orientation value, and **whichever is called last wins**. Thread: `[control]` — do not call it from the audio callback. Under `PIPELINED` it goes into the motion queue.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `yaw` | Rotation about the +Y axis (radians). Positive = turn right |
| `pitch` | Rotation about the +X axis (radians). Positive = look down |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_listener_set_orientation_q</code> — Sets the listener orientation as a quaternion (XYZW), including roll</summary>

```c
int st_rt_listener_set_orientation_q(STRT_Context* context, const float quatXYZW[4]);
```

**Purpose** — Gives the listener orientation as a local→world unit quaternion. It can also carry roll (head tilt), which yaw · pitch cannot express, so when the host already has a quaternion, as with VR head tracking, it can be passed as is.

**When / how** — The local axes are forward = +Z · up = +Y · right = +X. The component order is **XYZW** and the engine normalizes, so the host need not normalize beforehand. Validation is the same as `st_rt_source_set_orientation_q`. `st_rt_listener_set_rotation(yaw, pitch)` equals the roll-0 case `q = q_y(yaw) · q_x(pitch)`. Among the three listener orientation setters, **whichever is called last wins**. Check support with the `ST_CAP1_LISTENER_ORIENTATION_Q` bit of `st_rt_get_capability_word(1)`. Thread: `[control]` — do not call it from the audio callback. Under `PIPELINED` it goes into the motion queue.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `quatXYZW` | Local→world rotation quaternion `[x, y, z, w]`. Rejected if any component is non-finite or the norm is degenerate (`norm < 1e-12`) |

**Returns** — `1` = applied / `0` = failure. A non-finite or degenerate quaternion changes nothing and leaves `ST_STATUS_INVALID_ARGUMENT` in `st_rt_get_last_status`.

</details>

<details>
<summary><code>st_rt_listener_set_rotation_ypr</code> — Sets the listener orientation as yaw · pitch · roll (radians)</summary>

```c
int st_rt_listener_set_rotation_ypr(STRT_Context* context, float yaw, float pitch, float roll);
```

**Purpose** — The Euler-angle version of `st_rt_listener_set_rotation` with roll added. For hosts that handle head tilt as Euler angles.

**When / how** — The rotation matrix is `R = Ry(yaw)·Rx(pitch)·Rz(roll)`, the same order as Unity `Quaternion.Euler(pitch, yaw, roll)` (with degrees converted to radians). Yaw · pitch mean the same as in `st_rt_listener_set_rotation` (positive yaw = turn right, positive pitch = look down), and **positive roll = the right axis tilts up** (the head tilts left and the right ear rises). With `roll = 0` it is the same matrix as `st_rt_listener_set_rotation(yaw, pitch)`. Among the three listener orientation setters, **whichever is called last wins**. Check support with `ST_CAP1_LISTENER_ORIENTATION_Q` (capability word 1). Thread: `[control]` — do not call it from the audio callback. Under `PIPELINED` it goes into the motion queue.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `yaw` | Rotation about the +Y axis (radians). Positive = turn right |
| `pitch` | Rotation about the +X axis (radians). Positive = look down |
| `roll` | Rotation about the +Z axis (radians). Positive = right axis up (head tilts left) |

**Returns** — `1` = applied / `0` = failure. Any non-finite value changes nothing and leaves `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_rt_set_path_type_enabled</code> — Enables or disables propagation per path type globally</summary>

```c
void st_rt_set_path_type_enabled(STRT_Context* context, int pathType, int enabled);
```

**Purpose** — Stops the whole engine from computing a specific path type among direct · transmission · reflection · diffraction · reverb. Use it to listen to how much each component contributes by isolating them one by one, or to cut cost by dropping types you do not need.

**When / how** — By default all 5 types are enabled. It is a propagation-stage gate, so for a disabled type the paths themselves are never created (unlike `STRenderOptions.render*`, which are render-stage gates). To apply it to a single source, use `st_rt_source_set_path_enabled`. Combined with `st_rt_set_acoustic_feature_enabled`, a "sound tracing off" baseline can be built from settings alone — disabling reflection · diffraction · reverb and all three acoustic features leaves only distance attenuation and panning. Thread: `[control]` — takes the scene write lock, so it may briefly contend with the workers. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb. Out-of-range values are ignored |
| `enabled` | `0` = off, anything else = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_set_acoustic_feature_enabled</code> — Enables or disables air absorption · propagation delay · direct occlusion individually</summary>

```c
int st_rt_set_acoustic_feature_enabled(STRT_Context* context, int feature, int enabled);
```

**Purpose** — Toggles individual acoustic features to enable listening A/B comparisons. Together with the path-type gates (`st_rt_set_path_type_enabled`), a surface for isolating and playing "what contributes to the sound" one by one.

**When / how** — By default all three features are enabled (physics as is). Disabling the reflection · diffraction · reverb paths and all three features gives a baseline with only distance attenuation and stereo panning. Read the current value with `st_rt_is_acoustic_feature_enabled`. This function is an **IR-reconversion-triggering** setter — calling it reruns the IR conversion pipeline and publishes a new IR (`PIPELINED` wakes the workers), so call it only when the value changes. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION` (0) = atmospheric attenuation (high-frequency loss) / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY` (1) = propagation delay from path length / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION` (2) = direct-sound occlusion (visibility test) |
| `enabled` | `0` = off, anything else = on |

**Returns** — `1` = applied / `0` = `feature` out of range or failure.

</details>

<details>
<summary><code>st_rt_set_late_coupling</code> — Fine-tunes reverb attenuation from listener–source diffuse-field coupling</summary>

```c
int st_rt_set_late_coupling(STRT_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**Purpose** — Attenuates late reverb (FDN) injection according to how strongly the listener is coupled to the source's diffuse field. The reverb tank is a single fully mixed space, so by default it sounds equally loud everywhere; this option fixes the problem in spaces split around corners, such as U-shaped or ring-shaped layouts, where "the reverb stays the same or even gets louder as you move away from the source".

**When / how** — `st_rt_set_late_coupling_preset` is enough in most cases; use this function only when fine-tuning is needed. Coupling attenuation (`floorDb`), send flattening (`sendNormalizeTrim`) and direction sample collection (`rainDirectionWalk`) are designed to be used together — enabling only coupling without flattening leaves an inversion where reverb injection grows with distance, and disabling direction sample collection leaves too little reverb direction information from across the split space. The individual parameter set may change in the future, so use the presets where possible. Read the current values with `st_rt_get_late_coupling`. It is an **IR-reconversion-triggering** setter (calling it reconverts and republishes the IR). Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `floorDb` | Attenuation depth at full blockage (dB, ≥ 0). `0` = coupling attenuation off. Default `9` |
| `visibleLow` | If the visible ratio is below this, it is treated as fully blocked and attenuated by `floorDb`. `[0, 1)`. `0` → default `0.05` |
| `visibleHigh` | If the visible ratio is above this, it is treated as the same space and gets **exactly 0 dB**. `[0, 1]`. `0` → default `0.60` |
| `sendNormalizeTrim` | Flattening trim for the total reverb send (≥ 0). `0` = no flattening. Default `0.75` |
| `rainDirectionWalk` | `1` (default) = keep collecting reverb direction samples (carries no energy) / `0` = off |

**Returns** — `1` = applied / `0` = out of range (non-finite or negative, `visibleLow >= 1`, `visibleHigh > 1`) or failure. On failure the values are unchanged.

</details>

<details>
<summary><code>st_rt_get_late_coupling</code> — Reads the current late coupling attenuation settings</summary>

```c
int st_rt_get_late_coupling(const STRT_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**Purpose** — Returns the current values applied by `st_rt_set_late_coupling` / `st_rt_set_late_coupling_preset`. Use it to check which values a preset actually filled in, or to display them in a UI.

**When / how** — Can be called at any time. Output arguments you do not need can be passed as `NULL` and are skipped. Thread: `[control]` — a query that reads engine state without a lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outFloorDb` | Pointer that receives the full-blockage attenuation depth (dB). `NULL` allowed |
| `outVisibleLow` | Pointer that receives the full-blockage knee point. `NULL` allowed |
| `outVisibleHigh` | Pointer that receives the same-space (0 dB) knee point. `NULL` allowed |
| `outSendNormalizeTrim` | Pointer that receives the send flattening trim. `NULL` allowed |
| `outRainDirectionWalk` | Pointer that receives whether direction samples are collected (`1`/`0`). `NULL` allowed |

**Returns** — `1` = success (current values written to the output pointers) / `0` = no context.

</details>

<details>
<summary><code>st_rt_set_late_coupling_preset</code> — Sets late coupling attenuation at once from a recommended preset</summary>

```c
int st_rt_set_late_coupling_preset(STRT_Context* context, int preset);
```

**Purpose** — Fills the five values of `st_rt_set_late_coupling` at once with a recommended combination. Presets differ only in the attenuation floor depth; the rest (the two knee points · flattening trim · direction sample collection) are the same recommended values.

**When / how** — The engine default state equals `ST_LATE_COUPLING_DEFAULT`. With any preset, attenuation is exactly 0 dB when the listener is in the same space as the source, and in a single room there is practically no difference — differences appear only in spaces split around corners, so the choice is a matter of listening taste. If individual adjustment is needed, use `st_rt_set_late_coupling`. It is an **IR-reconversion-triggering** setter. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `preset` | `ST_LATE_COUPLING_OFF` (0) = coupling attenuation · flattening · direction sample collection all off / `ST_LATE_COUPLING_SUBTLE` (1) = 6 dB floor / `ST_LATE_COUPLING_DEFAULT` (2) = 9 dB floor (engine default) / `ST_LATE_COUPLING_STRONG` (3) = 12 dB floor |

**Returns** — `1` = applied / `0` = `preset` out of range or failure.

</details>

<details>
<summary><code>st_rt_set_physical_distance_attenuation</code> — Sets the reference distance · minimum distance of physical distance attenuation</summary>

```c
void st_rt_set_physical_distance_attenuation(STRT_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**Purpose** — Sets the reference point for distance attenuation (spherical spreading) by path length. The engine has a single distance attenuation law, physical pressure spreading, and the pressure gain is `referenceDistanceMeters / max(distance, minDistanceMeters)`. That is, the gain is 1 (0 dB) at the reference distance.

**When / how** — The defaults are reference distance 1.0 m · minimum distance 1.0 m (it gets no louder inside 1 m). Setting `minDistanceMeters` below the reference distance produces a near-field boost (e.g. reference 1, minimum 0.25 → up to 4× gain). Both values are given in **meters** and `sceneRatio` is not applied (because the path lengths they are compared with are already converted to meters). It is an **IR-reconversion-triggering** setter. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `referenceDistanceMeters` | Reference distance (m) at which the gain is 1. Default `1.0` |
| `minDistanceMeters` | Lower distance bound (m). Closer distances are computed as this distance. Default `1.0` |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_set_atmosphere</code> — Sets atmospheric conditions (temperature · humidity · pressure)</summary>

```c
void st_rt_set_atmosphere(STRT_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**Purpose** — Sets the atmospheric state used for air absorption and speed-of-sound computation. The speed of sound is not a fixed constant but is derived from these atmospheric values, and per-band air absorption (high-frequency loss) is computed with the ISO 9613-1 pure-tone absorption formula. It can express how long-distance high-frequency attenuation and delay vary with the environment, such as a hot, dry desert or a cold, humid outdoor scene.

**When / how** — The defaults are 20.0 °C · 50.0 % RH · 101.325 kPa. Call it only when the values change, such as on level load or a weather change. To disable air absorption itself, use `st_rt_set_acoustic_feature_enabled(ST_ACOUSTIC_FEATURE_AIR_ABSORPTION, 0)`. It is an **IR-reconversion-triggering** setter. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `temperatureC` | Air temperature (°C). Default `20.0` |
| `relativeHumidityPercent` | Relative humidity (%, 0–100). Default `50.0` |
| `pressureKPa` | Atmospheric pressure (kPa). Default `101.325` |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_set_doppler_gain_mode</code> — Sets the Doppler radiation gain mode for moving sources</summary>

```c
int st_rt_set_doppler_gain_mode(STRT_Context* context, int mode);
```

**Purpose** — Enables or disables the effect whereby a moving source radiates louder toward its direction of travel and quieter away from it (moving monopole approximation). It is a separate switch from the Doppler **pitch** change caused by variable delay (`STRenderOptions.useDoppler`).

**When / how** — The default is `ST_DOPPLER_GAIN_MOVING_MONOPOLE`. For a stationary source the gain is 1, so it has no effect, and it is computed once per path during IR conversion, so it adds no render cost. Read the current value with `st_rt_get_doppler_gain_mode`. Check support with `ST_CAP_DOPPLER_GAIN_MODE`. It is an **IR-reconversion-triggering** setter (setting the same value again does nothing). Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF` (0) = no radiation gain / `ST_DOPPLER_GAIN_MOVING_MONOPOLE` (1) = moving monopole approximation: pressure `D^2`, energy `D^4`, `D = 1/(1 - Mr)` (`Mr` = Mach number of the source velocity along the radiation direction), computed separately for each path's radiation direction |

**Returns** — `1` = applied / `0` = `mode` out of range or failure.

</details>

<details>
<summary><code>st_rt_get_doppler_gain_mode</code> — Reads the current Doppler radiation gain mode</summary>

```c
int st_rt_get_doppler_gain_mode(const STRT_Context* context);
```

**Purpose** — Returns the current mode set with `st_rt_set_doppler_gain_mode`.

**When / how** — Can be called at any time. Thread: `[control]` — a query that reads engine state without a lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — An `STDopplerGainMode` value (`0` = `ST_DOPPLER_GAIN_OFF`, `1` = `ST_DOPPLER_GAIN_MOVING_MONOPOLE`).

</details>

<details>
<summary><code>st_rt_set_early_late_band_energy_targets</code> — Sets per-band energy scales for early reflections and reverb separately</summary>

```c
int st_rt_set_early_late_band_energy_targets(STRT_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**Purpose** — Adjusts the per-frequency-band energy of the early component and the late (reverb) component independently. For example, it allows tonal corrections such as reducing only the highs of the reverb or boosting only the lows of the early reflections, without touching materials.

**When / how** — **Replaces both arrays at once** (to change only one, pass the current values for the other again). Each array is 9 values in the order 63, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz, and they are **energy-domain** scales (`2.0` ≈ +3 dB, `0.5` ≈ −3 dB). The early array applies only to individual paths (exact/early taps) and the late array only to reverb sends · tank drive; the two are not multiplied together. The defaults are all `1.0` (neutral). Check support with `ST_CAP_EARLY_LATE_BAND_ENERGY`. It is an **IR-reconversion-triggering** setter. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `earlyBandEnergy` | 9 per-band energy scales for the early component. Non-finite values are normalized to `1.0`, the rest to `[0, 16]`. Must not be `NULL` |
| `lateBandEnergy` | 9 per-band energy scales for the reverb component. Same normalization rule. Must not be `NULL` |

**Returns** — `1` = applied / `0` = one of the arrays is `NULL` or failure.

</details>

<details>
<summary><code>st_rt_set_max_depth</code> — Sets the global maximum order of reflection · diffraction paths</summary>

```c
void st_rt_set_max_depth(STRT_Context* context, int depth);
```

**Purpose** — Sets, for the whole engine, the maximum number of boundary interactions (order) that the reflection · diffraction path search follows. Raising it traces higher-order reflections accurately at the cost of more propagation work.

**When / how** — The global default is 8. Per-source depth (default 4) is set separately with `st_rt_source_set_depth`. Usually called once at the quality-settings stage after building the scene. Thread: `[control]` — takes the scene write lock, so it may briefly contend with the workers. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `depth` | Maximum order, `[1, 64]`. Default `8`. Out-of-range values are ignored (previous value kept) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_set_transmission_max_depth</code> — Sets the maximum number of faces direct · transmission paths can pass through</summary>

```c
void st_rt_set_transmission_max_depth(STRT_Context* context, int depth);
```

**Purpose** — Sets how many faces a transmission path can pass through when the source→listener line is occluded. This value decides how far sound coming through several layers of walls is computed.

**When / how** — The default is 64. `0` passes through no transmission faces. To disable transmission paths entirely, use `st_rt_set_path_type_enabled` (Transmission = 1). Thread: `[control]` — takes the scene write lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `depth` | Maximum number of faces that can be passed through, `[0, 64]`. Default `64`. Out-of-range values are ignored (previous value kept) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_listener_set_ray_count</code> — Sets the number of listener search (guide) rays</summary>

```c
void st_rt_listener_set_ray_count(STRT_Context* context, int width, int height);
```

**Purpose** — Sets the number of search (guide/probe) rays cast from the listener as `width × height`. These rays find reflection · diffraction path candidates, so increasing them lowers the chance of missing small reflecting surfaces and raises propagation cost.

**When / how** — The default is 16 × 16 (256 rays). Source-side transport rays are set separately with `st_rt_source_set_ray_count`. The ray direction distribution is set by `st_rt_listener_set_ray_sampling_method`. Thread: `[control]` — takes the scene write lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `width` | Grid width, `[1, 4096]`. Default `16` |
| `height` | Grid height, `[1, 4096]`. Default `16`. If either is out of range, the whole call is ignored |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_listener_set_ray_sampling_method</code> — Sets the direction distribution of listener search rays</summary>

```c
int st_rt_listener_set_ray_sampling_method(STRT_Context* context, int method);
```

**Purpose** — Chooses how listener search rays are distributed over the sphere. The only distribution currently selectable is `ST_RAY_SAMPLING_FIBONACCI_SPHERE`, and this function remains for explicitly checking and setting that value.

**When / how** — `ST_RAY_SAMPLING_FIBONACCI_SPHERE` (1) is both the default and the only accepted value. The Fibonacci distribution is deterministic and uses no seed. The other `STRaySamplingMethod` values remain in the enum only for numbering compatibility and are rejected. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `method` | `STRaySamplingMethod`. Only `ST_RAY_SAMPLING_FIBONACCI_SPHERE` (1) is allowed. `ST_RAY_SAMPLING_LEGACY_GRID` (0) / `ST_RAY_SAMPLING_EQUAL_AREA_GRID` (2) / `ST_RAY_SAMPLING_SOBOL_SPHERE` (3) / `ST_RAY_SAMPLING_ICOSAHEDRAL` (4) are rejected |

**Returns** — `1` = applied / `0` = rejected (state unchanged, leaves `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_rt_listener_get_ray_sampling_method</code> — Reads the direction distribution of listener search rays</summary>

```c
int st_rt_listener_get_ray_sampling_method(const STRT_Context* context);
```

**Purpose** — Returns the current listener search ray distribution.

**When / how** — Can be called at any time. Since Fibonacci is the only selectable distribution, it is always `ST_RAY_SAMPLING_FIBONACCI_SPHERE` on a valid context. Thread: `[control]` — a query that takes only the scene read lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — An `STRaySamplingMethod` value (always `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`) / `-1` = no context.

</details>

<details>
<summary><code>st_rt_set_source_ray_sampling_method</code> — Sets the direction distribution of source transport rays</summary>

```c
int st_rt_set_source_ray_sampling_method(STRT_Context* context, int method);
```

**Purpose** — Chooses the spherical distribution of transport rays (for reverb · diffuse energy) cast from sources. As on the listener side, the only value currently selectable is `ST_RAY_SAMPLING_FIBONACCI_SPHERE`.

**When / how** — `ST_RAY_SAMPLING_FIBONACCI_SPHERE` (1) is both the default and the only accepted value. The number of source transport rays is set with `st_rt_source_set_ray_count`. Thread: `[control]` — do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `method` | `STRaySamplingMethod`. Only `ST_RAY_SAMPLING_FIBONACCI_SPHERE` (1) is allowed; other values are rejected |

**Returns** — `1` = applied / `0` = rejected (state unchanged, leaves `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_rt_get_source_ray_sampling_method</code> — Reads the direction distribution of source transport rays</summary>

```c
int st_rt_get_source_ray_sampling_method(const STRT_Context* context);
```

**Purpose** — Returns the current source transport ray distribution.

**When / how** — Can be called at any time. It is always `ST_RAY_SAMPLING_FIBONACCI_SPHERE` on a valid context. Thread: `[control]` — a query that takes only the scene read lock. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — An `STRaySamplingMethod` value (always `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`) / `-1` = no context.

</details>

<details>
<summary><code>st_rt_build</code> — Builds all static and dynamic acceleration structures</summary>

```c
void st_rt_build(STRT_Context* context);
```

**Purpose** — Rebuilds both the static TLAS and the dynamic TLAS from the mesh and object placement. Propagation and `st_rt_scene_raycast` use these acceleration structures, so it must be called at least once after building the scene.

**When / how** — Call it after creating meshes and objects, before the first `st_rt_propagate`. Afterwards, call it again whenever the static setup changes, such as adding, deleting or moving **static** objects — the previously published static TLAS is used as is until `st_rt_build`, and static changes in between are not visible. To apply only the movement of dynamic objects (`isDynamic = 1`), use the lighter `st_rt_build_dynamic`. Thread: `[control, blocking]` — a full acceleration-structure build and a long exclusive section. Do not call it on the per-frame game loop path or the audio thread; call it during loading.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_build_dynamic</code> — Refits only the dynamic object acceleration structure</summary>

```c
void st_rt_build_dynamic(STRT_Context* context);
```

**Purpose** — Updates (refits) only the dynamic TLAS made of dynamic objects (`isDynamic = 1`). A lightweight path for reflecting the changes of moving geometry, such as doors and elevators, in propagation without a full build.

**When / how** — Call it after changing the transforms of dynamic objects (`st_rt_object_set_transform`, etc.). It does not touch the static TLAS, so static setup changes require `st_rt_build`. Thread: `[control]` — takes the scene write lock, so it may briefly contend with the workers. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_set_lane_update_interval</code> — Sets the update interval per propagation lane</summary>

```c
int st_rt_set_lane_update_interval(STRT_Context* context, int lane, float milliseconds);
```

**Purpose** — Under the `PIPELINED` scheduler, sets how often the three propagation lanes — direct · reflection/diffraction · reverb — are recomputed. A knob for the host to balance CPU usage against responsiveness. The reflection/diffraction lane accounts for most of the propagation cost, so if you want to save CPU, raise this lane's interval first. The price is that early reflections follow listener movement slightly later, but the direct lane's interval is unchanged, so there is no silence or dropout.

**When / how** — Can be called **at any time at runtime** (unlike thread attributes, there is no before-`st_rt_create` constraint). Changing it while the workers are running takes effect from the next cycle; a deadline already being waited on is kept, and the new value is used from the next run. Each lane runs repeatedly on its own even without a new request from the Guide or the host. The meaning of the interval differs per lane (table below). `ST_RT_SCHEDULER_SYNCHRONOUS` has no lanes, so it fails. Check support with `ST_CAP_LANE_UPDATE_INTERVAL`. Thread: `[control]` — stores the value atomically and passes it to the workers. Do not call it from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `lane` | `STPropagationLane` — `ST_PROPAGATION_LANE_DIRECT` (0): minimum gap between the **starts** of consecutive runs, default 10 ms / `ST_PROPAGATION_LANE_REFLECTION_DIFFRACTION` (1): minimum gap between two consecutive runs, default 0 ms (no limit). Requests arriving while waiting are folded into one until the deadline, so they never starve / `ST_PROPAGATION_LANE_REVERB` (2): minimum gap from the **completion** of a run to the next run, default 4 ms |
| `milliseconds` | Minimum gap (ms), `[0, 60000]`. `0` = no extra wait. Negative, NaN, infinite or values above 60000 are rejected, not clamped |

**Returns** — `1` = applied / `0` = rejected. Leaves `ST_STATUS_INVALID_ARGUMENT` in `st_rt_get_last_status` if `lane` is out of range or `milliseconds` is outside the allowed range, and `ST_STATUS_UNAVAILABLE` with the `SYNCHRONOUS` scheduler.

</details>

<details>
<summary><code>st_rt_get_lane_update_interval</code> — Reads a propagation lane's update interval</summary>

```c
float st_rt_get_lane_update_interval(const STRT_Context* context, int lane);
```

**Purpose** — Returns the update interval stored for a lane, in ms.

**When / how** — Returns the currently **stored value** even if the last `st_rt_set_lane_update_interval` was rejected, so use it to check whether the value you set actually took effect. Thread: `[any]` — reads a single atomic, so it can be called from any thread and does not block.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `lane` | `STPropagationLane` — `DIRECT`(0) / `REFLECTION_DIFFRACTION`(1) / `REVERB`(2) |

**Returns** — The stored interval (ms). `0` if `lane` is out of range or there is no context.

</details>

<details>
<summary><code>st_rt_propagate</code> — Runs propagation (SYNCHRONOUS) or wakes the propagation workers (PIPELINED)</summary>

```c
int st_rt_propagate(STRT_Context* context);
```

**Purpose** — Advances acoustic propagation and IR conversion with the current scene · source · listener state. Its behavior depends on the scheduler.

**When / how** — Call it after `st_rt_build`.

- `ST_RT_SCHEDULER_SYNCHRONOUS`: the propagation · IR pipeline **actually runs on the calling thread**. Computation advances only when the host calls this function, so call it periodically from the game loop (e.g. every frame). Under this scheduler, idled sources (`st_rt_source_idle`) are also computed.
- `ST_RT_SCHEDULER_PIPELINED` (default): wakes the workers and **returns immediately**. Lanes run repeatedly at the `st_rt_set_lane_update_interval` intervals even without host requests, so this call is a signal meaning "something changed, run now".

Thread: `[control, runs-here]` — under `SYNCHRONOUS` the calling thread bears the full propagation cost, so do not call it from the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Number of propagated paths (under `PIPELINED`, the value most recently produced by the workers). `-1` if a worker error occurred under `PIPELINED`, `0` if there is no context.

</details>

</details>

<details>
<summary><strong>Rendering · output stage · speaker sets</strong> — 56 functions</summary>

<details>
<summary><code>st_rt_render_set_spatializer</code> — Selects the spatialization method (panning / HRIR dataset)</summary>

```c
int st_rt_render_set_spatializer(STRT_Context* context, int type);
```

**Purpose** — Selects the spatialization implementation of the render path. `PANNING` produces stereo panning without HRIR data, while `MIT_KEMAR` and `SADIE_D2_KEMAR` produce binaural output by convolution with measured HRIRs. SADIE II D2 is the reference HRTF that includes the dataset's measured ITD and phase.

**When / how** — HRIR spatialization (1 · 2) is used for headphone binaural output, i.e. a render started with `st_rt_render_start(context, 1)`. Usually choose it once before `st_rt_render_start`. Thread: `[control, blocking]` — a long section that loads the HRIR dataset, so do not call it from the game loop or the audio thread. Check support with `ST_CAP_HRTF`, `ST_CAP_SADIE_D2_HRTF` (capability word 0).

`PANNING` and `MIT_KEMAR` are built into the library. `SADIE_D2_KEMAR` requires the external file `SADIE_D2_44K_16bit_256tap.hrtfbin` (included in the SDK's `Resources/HRTF/` together with the license `LICENSE-SADIE-II.txt`), which the engine searches for in this order.

1. Environment variable `SOUNDTRACING_SADIE_D2_HRTF_PATH` (file path)
2. The current working folder, 3. the executable's folder, 4. this library's folder — in each case that file under `Assets/HRTF/`, `SoundTracing/Assets/HRTF/`, `Resources/HRTF/` in that folder and up to 8 parent levels

For distribution, the soundtracing approach is to place `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` next to (or above) the library.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING` (0, default) / `ST_SPATIALIZER_MIT_KEMAR` (1) / `ST_SPATIALIZER_SADIE_D2_KEMAR` (2) |

**Returns** — `1` = applied / `0` = failure. An out-of-range `type` gives `0`. If the SADIE D2 asset file cannot be found it returns `0` and leaves `ST_STATUS_UNAVAILABLE` ("SADIE D2 HRTF asset not found ...") in `st_rt_get_last_status`.

</details>

<details>
<summary><code>st_rt_render_get_spatializer</code> — Reads the current spatialization method</summary>

```c
int st_rt_render_get_spatializer(const STRT_Context* context);
```

**Purpose** — Returns the spatialization method selected with `st_rt_render_set_spatializer`.

**When / how** — Can be called at any time. Thread: `[any]` — an atomic read, so it does not block from any thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — An `STSpatializerType` value (`0` PANNING / `1` MIT_KEMAR / `2` SADIE_D2_KEMAR). The default is `0`. `-1` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_limiter_type</code> — Selects the output limiter type</summary>

```c
void st_rt_render_set_limiter_type(STRT_Context* context, int type);
```

**Purpose** — Selects the algorithm of the output limiter, the last stage of the final mix (master bus). The limiter applies to both stereo (headphones · panning) and speaker layout outputs, and for N-channel output it operates as a channel link applying the same gain to every channel. Custom layouts with more than 32 channels bypass the limiter.

**When / how** — Can be changed during rendering. Turning the limiter on and off is done not by this function but by `STRenderOptions.useLimiter` (default `1`, `st_rt_render_set_options`). Changing the type changes the limiter latency, so read `st_rt_render_get_limiter_latency_samples` again. Thread: `[control]` — a control-thread call that changes a render stage, so do not call it from the audio callback. Check support for the true-peak type with `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER` (capability word 1) and for the lookahead limiter with `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER` (capability word 0).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `type` | `STOutputLimiterType`. Values other than `0` · `1` · `2` are treated as `LEGACY_ENVELOPE` |

**`STOutputLimiterType` values**

| Value | Behavior |
|---|---|
| `ST_OUTPUT_LIMITER_LEGACY_ENVELOPE`(0) | No lookahead, 2 ms attack, −0.2 dBFS sample peak + ±1 hard clip (for reference). Latency 0 |
| `ST_OUTPUT_LIMITER_LOOKAHEAD_PEAK`(1) | Lookahead linear ramp, −0.2 dBFS sample peak (for reference). Latency = lookahead |
| `ST_OUTPUT_LIMITER_TRUE_PEAK`(2, default) | ITU-R BS.1770-5 4× true-peak sidechain, ceiling −1 dBTP (fixed), lookahead (= attack) + 10 ms hold + automatic release 60→400 ms. Output true peak never exceeds the ceiling. Latency = `max(lookahead, 1) + 5` samples (default 132 → 137, 3.1 ms) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_rt_render_get_limiter_type</code> — Reads the current output limiter type</summary>

```c
int st_rt_render_get_limiter_type(const STRT_Context* context);
```

**Purpose** — Returns the limiter type set with `st_rt_render_set_limiter_type`.

**When / how** — Thread: `[control]` — a control-thread query that reads engine state without a lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — An `STOutputLimiterType` value (default `2` = `TRUE_PEAK`). `-1` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_limiter_lookahead_samples</code> — Sets the limiter lookahead length</summary>

```c
int st_rt_render_set_limiter_lookahead_samples(STRT_Context* context, int samples);
```

**Purpose** — Sets, in samples, how far ahead the `LOOKAHEAD_PEAK` / `TRUE_PEAK` limiters look at peaks (= attack). Longer gives smoother gain changes; shorter reduces output latency.

**When / how** — Rebuilds the lookahead buffer. After changing it, re-read the actual latency with `st_rt_render_get_limiter_latency_samples`. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `samples` | Lookahead sample count (44.1 kHz engine samples), `[0, ST_OUTPUT_LIMITER_MAX_LOOKAHEAD_SAMPLES]` = `[0, 511]`. Default `ST_OUTPUT_LIMITER_DEFAULT_LOOKAHEAD_SAMPLES` = 132 (3 ms) |

**Returns** — `1` = applied / `0` = rejected (out of range, context `NULL`).

</details>

<details>
<summary><code>st_rt_render_get_limiter_lookahead_samples</code> — Reads the limiter lookahead length</summary>

```c
int st_rt_render_get_limiter_lookahead_samples(const STRT_Context* context);
```

**Purpose** — Returns the current limiter lookahead sample count.

**When / how** — Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Lookahead sample count (default `132`). `-1` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_get_limiter_latency_samples</code> — Reads the output latency the limiter adds</summary>

```c
int st_rt_render_get_limiter_latency_samples(const STRT_Context* context);
```

**Purpose** — Returns the fixed latency the output limiter adds to the signal, in engine samples. Use it to compensate sync with video and input events, and for alignment during measurements.

**When / how** — Re-read it after changing the limiter type, lookahead or `useLimiter`. The value follows these rules.

- `useLimiter` = 1 · `TRUE_PEAK`: `max(lookahead, 1) + 5` (default 137 samples, 3.1 ms)
- `useLimiter` = 1 · `LOOKAHEAD_PEAK`: `lookahead`
- `useLimiter` = 1 · `LEGACY_ENVELOPE`: 0
- `useLimiter` = 0: 0

Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Limiter latency (samples). `-1` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_master_gain_db</code> — Sets the master output gain</summary>

```c
int st_rt_render_set_master_gain_db(STRT_Context* context, float gainDb);
```

**Purpose** — The volume of the render output stage. It does not invalidate propagation or IR results, so use it to adjust overall loudness without IR recomputation. It sits after the output EQ and before the limiter, so whatever you boost is received by the limiter. It applies to every output regardless of channel count, stereo or speaker layout.

**When / how** — Can be called at any time during rendering. Changes transition over a 20 ms linear ramp; at 0 dB no multiplication is performed. If loudness compensation's `followMasterGain` is enabled, the compensation is also recomputed to follow this gain (see `st_rt_render_set_loudness_compensation`). Thread: `[control]` — changes only the output stage; do not call from the audio callback. Check support with `ST_CAP1_MASTER_GAIN` (capability word 1).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `gainDb` | Gain [dB], `[ST_MASTER_GAIN_MIN_DB, ST_MASTER_GAIN_MAX_DB]` = `[−96, +24]`. Default 0 |

**Returns** — `1` = applied / `0` = failed. Non-finite or out-of-range values give `ST_STATUS_INVALID_ARGUMENT` and change nothing. `ST_STATUS_UNAVAILABLE` for an `ST_BACKEND_EXA` backend context.

</details>

<details>
<summary><code>st_rt_render_get_master_gain_db</code> — Reads the master output gain</summary>

```c
float st_rt_render_get_master_gain_db(const STRT_Context* context);
```

**Purpose** — Returns the stored master gain [dB].

**When / how** — Thread: `[control]` — briefly takes the auralizer control lock and copies the stored value.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Master gain [dB] (default `0`). `0` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_loudness_compensation</code> — Configures equal-loudness compensation (ISO 226)</summary>

```c
int st_rt_render_set_loudness_compensation(STRT_Context* context, const STLoudnessCompensationDesc* desc);
```

**Purpose** — When content is played back quieter than the balanced reference level, the human ear hears less of the low and very high frequencies. This stage approximates the shape difference between two ISO 226:2003 equal-loudness contours (reference level R, playback level P) with a low shelf and a high shelf and restores it. If P is greater than R it cuts instead. The engine does not know absolute SPL, so the host supplies the levels in phon (dB SPL of a 1 kHz pure tone).

**When / how** — On the output stage (both stereo/binaural and speaker layouts), it is applied after the output EQ and before the master gain and limiter, in the order equal-loudness compensation → virtual bass. It does not invalidate propagation or IR results. Right after `st_rt_create` it is **enabled** and follows the master gain (reference 83 → playback 70 phon, about +7.2 dB low end at 120 Hz, +1.8 dB high end). For integrations where the host owns the output tone, such as middleware or a game mix, consider disabling it right after creation. While disabled it does not touch samples.

Enabling, disabling and value changes transition without clicks (50 ms smoothstep ramp on the shelf parameters; when disabling, a 5.8 ms crossfade to the dry signal after reaching 0 dB). When the output channel count changes (speaker layout change, etc.) it clears its history and re-enters with the same ramp as enabling. With `followMasterGain`, volume changes move together with the master gain ramp (20 ms), but as they are separate commands their start can be offset by up to one block (each is ramped, so there is no discontinuity). It is not applied to custom speaker layouts with more than 32 channels.

To toggle while keeping the defaults, fill the struct with get and then set it with only `enabled` changed.

```c
STLoudnessCompensationDesc d = { sizeof d, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &d);
d.enabled = 0;                                  /* disable */
st_rt_render_set_loudness_compensation(ctx, &d);
```

Thread: `[control]` — changes only the output stage and performs the ISO 226 fitting (tens of µs) on the control thread. Check support with `ST_CAP1_LOUDNESS_COMPENSATION` (capability word 1). Not available in the offline library.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `desc` | Settings. The caller fills `structSize` / `apiVersion`, and `reserved` must be 0 |

**Struct** `STLoudnessCompensationDesc`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STLoudnessCompensationDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1. 1 right after creation |
| `followMasterGain` | 0/1. When 1, effective playback level = `playbackLevelPhon` + master gain dB. Set `playbackLevelPhon` once to "the playback level at 0 dB master gain" and, for hosts that use the master gain as a volume knob, the compensation follows automatically. 1 right after creation |
| `referenceLevelPhon` | Reference listening level `[0, 120]` phon, default 83 (reference monitor level for film and music mastering) |
| `playbackLevelPhon` | Actual playback level `[0, 120]` phon, default 70 (typical home and headphone listening level). Equal to the reference means zero compensation |
| `bassScale` | Low-shelf gain scale `[0, 1]`, default 1 (ISO as is) |
| `trebleScale` | High-shelf gain scale `[0, 1]`, default 1. 0 compensates the low end only |
| `maxShelfGainDb` | Absolute cap on shelf gain `[0, 40]` dB (applied after the scale), default 15. When the low shelf hits the cap, instead of just clipping the gain it uses the shape (corner, slope) of "the playback level at which the shelf reaches the cap". The high shelf has a fixed shape, so only its gain is clipped |
| `reserved[5]` | 0 |

Levels outside the valid range of the ISO formula (20–90 phon for 20 Hz–4 kHz, 20–80 phon for 5–12.5 kHz) are evaluated with the shape of the edge-level contour at that frequency (if R and P both exceed 80 phon, the high-end compensation is 0). The ISO dip at 1.25–5 kHz (under a few dB) is not modeled with a shelf. The approximation error grows with larger level differences and lower low-side levels (maximum error against the ISO table, mid-band reference: 83→70 0.5 dB, 83→60 0.9 dB, 83→40 1.9 dB, 90→20 3.7 dB).

**Returns** — `1` = applied / `0` = failed. `NULL`, out-of-range fields or `reserved` ≠ 0 give `ST_STATUS_INVALID_ARGUMENT`, and a stamp mismatch gives `ST_STATUS_VERSION_MISMATCH` (neither changes anything). `ST_STATUS_UNAVAILABLE` for an `ST_BACKEND_EXA` backend context.

</details>

<details>
<summary><code>st_rt_render_get_loudness_compensation</code> — Reads the equal-loudness compensation settings</summary>

```c
int st_rt_render_get_loudness_compensation(const STRT_Context* context, STLoudnessCompensationDesc* outDesc);
```

**Purpose** — Returns the stored equal-loudness compensation settings (requested values). If it has never been set, fills the post-creation defaults. Call it first when changing only some fields while keeping the defaults.

**When / how** — Thread: `[control]` — briefly takes the auralizer control lock and copies the stored value.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outDesc` | Output. The caller fills `structSize` / `apiVersion`. See `st_rt_render_set_loudness_compensation` for the fields |

**Returns** — `1` = success / `0` = failed. An `ST_BACKEND_EXA` backend context fills the defaults (disabled).

</details>

<details>
<summary><code>st_rt_render_set_virtual_bass</code> — Configures virtual bass (harmonic synthesis)</summary>

```c
int st_rt_render_set_virtual_bass(STRT_Context* context, const STVirtualBassDesc* desc);
```

**Purpose** — A missing-fundamental effect that lets small drivers and earphones that cannot reproduce low frequencies convey bass. It splits off the low band below the cutoff frequency, generates 2nd, 3rd and 4th harmonics, shapes them with a band-pass and adds them to the original signal. The harmonic level is proportional to the input level.

**When / how** — On the output stage it is applied after equal-loudness compensation and before the master gain and limiter. Disabled by default. It does not invalidate propagation or IR results. Enabling, disabling and value changes transition over a 30 ms smoothstep ramp; on enable or a cutoff/band change, the filters settle for 23 ms at zero mix before it ramps up. When the output channel count changes it clears its history and re-enters. It skips the LFE channel of speaker layouts and is not applied to custom layouts with more than 32 channels.

When several tones are present together in the low band, in-band intermodulation (sum tone f1+f2, etc.) occurs. For example, with 40 Hz + 55 Hz at equal amplitude, the 95 Hz sum tone is 8.6–10.5 dB louder than the 2nd harmonic. A single tone produces only the 2nd, 3rd and 4th harmonics (other components −77 dB or lower). Decide whether to use it by listening. To enable it with the defaults, fill the struct with get and then set it with only `enabled` changed to 1. Thread: `[control]` — changes only the output stage; do not call from the audio callback. Check support with `ST_CAP1_VIRTUAL_BASS` (capability word 1). Not available in the offline library.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `desc` | Settings. The caller fills `structSize` / `apiVersion`, and `reserved` must be 0 |

**Struct** `STVirtualBassDesc`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STVirtualBassDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1. Default 0 |
| `mode` | `STVirtualBassMode` — `ST_VIRTUAL_BASS_HYBRID` (0, default): keeps the original low end and adds harmonics (earphones that reproduce low frequencies, etc.) / `ST_VIRTUAL_BASS_HARMONICS_ONLY` (1): filters the original signal with a `cutoffHz` LR4 HPF and keeps only the harmonics (protects small drivers) |
| `cutoffHz` | Low-band split and HPF cutoff `[40, 160]` Hz, default 90 |
| `harmonicLowHz` | Lower edge of the harmonic band `[20, 1000]` Hz, default 70 |
| `harmonicHighHz` | Upper edge of the harmonic band `[20, 1000]` Hz, must be greater than `harmonicLowHz`. Default 220 |
| `intensity` | Harmonic mix strength (linear) `[0, 4]`. 1 = harmonic energy before the band-pass equals the split low-band energy. Default 0.5 (−6 dB) — the value at which, in HYBRID, the 2nd harmonic sounds about as loud as the fundamental. For `HARMONICS_ONLY`, which has no fundamental, around 1.0 is recommended |
| `reserved[6]` | 0 |

**Returns** — `1` = applied / `0` = failed. `NULL`, out-of-range fields or `reserved` ≠ 0 give `ST_STATUS_INVALID_ARGUMENT`, and a stamp mismatch gives `ST_STATUS_VERSION_MISMATCH` (neither changes anything). `ST_STATUS_UNAVAILABLE` for an `ST_BACKEND_EXA` backend context.

</details>

<details>
<summary><code>st_rt_render_get_virtual_bass</code> — Reads the virtual bass settings</summary>

```c
int st_rt_render_get_virtual_bass(const STRT_Context* context, STVirtualBassDesc* outDesc);
```

**Purpose** — Returns the stored virtual bass settings (requested values). If it has never been set, fills the defaults.

**When / how** — Thread: `[control]` — briefly takes the auralizer control lock and copies the stored value.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outDesc` | Output. The caller fills `structSize` / `apiVersion`. See `st_rt_render_set_virtual_bass` for the fields |

**Returns** — `1` = success / `0` = failed. An `ST_BACKEND_EXA` backend context fills the defaults (disabled).

</details>

<details>
<summary><code>st_rt_render_set_eq</code> — Applies the output 9-band graphic EQ (mixer EQ)</summary>

```c
int st_rt_render_set_eq(STRT_Context* context, const float gainsDb[ST_FREQUENCY_BANDS], int enabled);
```

**Purpose** — A 9-band tone control applied only to the render output. It does not invalidate propagation or IR results. There is a single output EQ, and this function is a **compatibility view** of the output parametric EQ (`st_rt_render_set_parametric_eq`) — it configures 9 peaking filters with Q 1.414, one at each engine band center (63…16k Hz), plus a 0 dB preamp.

**When / how** — Can be called at any time during rendering. This function and `st_rt_render_set_parametric_eq` both replace the entire band list of the same EQ, and **the last one called wins**. This path swaps coefficients immediately (no ramp) and passes through on speaker layouts with 9 or more channels. Even when you only want to toggle, always pass the `ST_FREQUENCY_BANDS` gains. There is no 9-band-specific getter; `st_rt_render_get_parametric_eq` returns this setting as 9 `PEAKING` bands. Thread: `[control]` — changes only the output stage; do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `gainsDb` | `ST_FREQUENCY_BANDS` (9) band gains [dB], in the order 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz. The engine clamps them to `[−24, +24]` dB. Does nothing if `NULL` |
| `enabled` | 0 updates the coefficients but bypasses. Nonzero enables |

**Returns** — `1` = applied / `0` = failed (`gainsDb` is `NULL`, etc.).

</details>

<details>
<summary><code>st_rt_render_set_parametric_eq</code> — Applies the output parametric EQ</summary>

```c
int st_rt_render_set_parametric_eq(STRT_Context* context, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**Purpose** — A parametric EQ of up to 16 bands for headphone correction (AutoEq profiles, etc.) or output tone shaping. It applies only to the render output and does not invalidate propagation or IR results.

**When / how** — Can be called at any time during rendering; changes transition over a 20 ms crossfade (including when coming from the 9-band view). It sits at the end of the render chain, before the master gain (stereo/binaural), and on speaker output after decoding and distance alignment. The same filter is applied to every output channel (including the speaker LFE) — equivalent to applying it to the acoustic sum, so the resulting tone is the same however the mains and LFE split the low end. For per-channel correction use `st_rt_render_set_speaker_channel_eq`. Handles up to 64 channels. It is the same EQ as `st_rt_render_set_eq`, so the last setter called wins. Convert AutoEq text into a band array with `st_rt_render_parse_autoeq_parametric` and pass it in. Thread: `[control]` — changes only the output stage; do not call from the audio callback. Check support with `ST_CAP1_OUTPUT_PARAMETRIC_EQ` (capability word 1).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `bands` | Array of `bandCount` bands. Read only during the call. May be `NULL` when `bandCount` = 0 |
| `bandCount` | Band count `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` = `[0, 16]` |
| `preampDb` | Preamp [dB], clamped to `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[−48, +12]`. Mainly a negative value to prevent clipping; boosting is the master gain's job |
| `enabled` | 0 stores the list but passes through |

**Struct** `STParametricEqBand` (32 bytes, no version stamp as it is an array element)

| Field | Description |
|---|---|
| `type` | `STParametricEqType` — `PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = this band is identity (skipped), otherwise = enabled |
| `frequencyHz` | Center (PEAKING, NOTCH) or corner (shelf midpoint, LP, HP) frequency. Clamped to `[20, min(20000, 0.49·Fs)]` Hz |
| `gainDb` | Used only by PEAKING, LOW_SHELF and HIGH_SHELF (stored only for LP, HP, NOTCH). Clamped to `[−24, +24]` dB |
| `q` | Clamped to `[0.1, 30]`, and `[0.1, 3]` for shelves (a high-Q shelf creates a large resonant peak at the corner) |
| `reserved[3]` | Must be 0 (otherwise rejected) |

Filter definition (shared by the output EQ, source EQ and speaker channel EQ): each band is one RBJ Audio EQ Cookbook biquad section, and shelves are the Q-based RBJ shelves (same as AutoEq). Fs is the engine's internal sample rate of 44100 Hz; coefficients and processing are double-precision Direct Form I. The chain is preamp → bands 0..count−1 in series. Bands with `enabled` = 0 and PEAKING/shelf bands with \|gain\| ≤ 1e-4 dB are exactly identity, and when the whole EQ is disabled or has no effect (all bands identity + 0 dB preamp) samples are not touched. When values change, the old and new settings run side by side for 20 ms and the output is crossfaded (not coefficient interpolation, so no clicks or divergence); if it changes again in the meantime, only the most recent value waits and then transitions next. Finite values are clamped to the ranges above, and the getter returns the clamped effective values.

**Returns** — `1` = applied / `0` = failed. On `0`, `st_rt_get_last_status`:

- `ST_STATUS_INVALID_ARGUMENT` — `bandCount` out of range, `bands` `NULL` (`bandCount` > 0), non-finite value, unknown `type`, `reserved` ≠ 0. Changes nothing.
- `ST_STATUS_UNAVAILABLE` — `ST_BACKEND_EXA` backend context

</details>

<details>
<summary><code>st_rt_render_get_parametric_eq</code> — Reads the output EQ band list</summary>

```c
int st_rt_render_get_parametric_eq(const STRT_Context* context, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**Purpose** — Returns the current output EQ band list (clamped effective values), preamp and enabled state. A setting applied with `st_rt_render_set_eq` is also read back as 9 `PEAKING` bands (Q 1.414).

**When / how** — If you do not know the size, call with `outBands` as `NULL` to get only `outBandCount`, then call again. A capacity of `ST_PARAMETRIC_EQ_MAX_BANDS` (16) always fits. Thread: `[control]` — takes the auralizer control lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outBands` | Band output array. `NULL` makes it a size query (no bands written). See `st_rt_render_set_parametric_eq` for the fields |
| `bandCapacity` | Capacity of `outBands` (element count), 0 or greater |
| `outBandCount` | Band count output. Skipped if `NULL` |
| `outPreampDb` | Preamp [dB] output. Skipped if `NULL` |
| `outEnabled` | Enabled (0/1) output. Skipped if `NULL` |

**Returns** — `1` = success (including size queries) / `0` = failed. On `0`, `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` (`bandCapacity < 0`) / `ST_STATUS_BUFFER_TOO_SMALL` (capacity smaller than the band count — the count, preamp and enabled state are still written) / `ST_STATUS_UNAVAILABLE` (`ST_BACKEND_EXA` backend).

</details>

<details>
<summary><code>st_rt_render_parse_autoeq_parametric</code> — Parses AutoEq ParametricEQ.txt into a band array</summary>

```c
int32_t st_rt_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**Purpose** — Converts AutoEq `ParametricEQ.txt` text (a subset of the Equalizer APO syntax) into an `STParametricEqBand` array and a preamp. Pass the result directly to `st_rt_render_set_parametric_eq` (as enabled), `st_rt_source_set_parametric_eq` or `st_rt_render_set_speaker_channel_eq`.

**When / how** — Needs no context and has no global state or allocations. Same implementation and contract as `st_off_render_parse_autoeq_parametric` in the offline library. Thread: `[any]` — does not block from any thread. Support is included in `ST_CAP1_OUTPUT_PARAMETRIC_EQ` (capability word 1).

Accepted syntax (case-insensitive):

```text
Preamp: -6.2 dB
Filter 1: ON LSC Fc 105 Hz Gain 6.8 dB Q 0.70
```

- `Preamp: <number> [dB]` — multiple lines are summed in dB.
- `Filter[ <index>]: ON|OFF <type> Fc <number> [Hz] [Gain <number> [dB]] [Q <number>]` — the type is `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`. If Q is omitted it is 0.7071 for shelves, LP and HP; Q is required for PK and NO. Gain is required for PK and shelves. `OFF` filters become bands with `enabled` 0 and count toward the band count.
- Blank lines and anything after `#` (end-of-line comments) are ignored; UTF-8 BOM and CRLF are accepted. Numbers are read independently of the locale.
- Rejected: any other command (`Channel`, `Device`, `GraphicEQ`, `Include`, etc.), `BP`·`AP`·`IIR`, the shelf-slope form (`LS 6dB`), `BW Oct`, out-of-range values (Fc `[20, 20000]` Hz · Gain ±24 dB · Q `[0.1, 30]`, shelf Q `[0.1, 3]` · final preamp sum `[−48, +12]` dB), non-ASCII outside comments, exponent notation. The parser rejects rather than clamps.

| Parameter | Description |
|---|---|
| `utf8Text` | NUL-terminated UTF-8 text. Required |
| `outBands` | Band output array. Required if `bandCapacity` > 0. `reserved` is filled with 0 |
| `bandCapacity` | Capacity of `outBands`, 0 or greater |
| `outBandCount` | Band count output. Required |
| `outPreampDb` | Preamp [dB] output. Required |
| `outErrorLine` | Error line number on failure (1-based; 0 for errors not tied to a line — a final preamp sum out of range is judged at end of file and gives 0, and a line-level error, if any, is reported first). `NULL` allowed |
| `outErrorMessage` | Failure reason (NUL-terminated English, truncated to capacity). `NULL` allowed |
| `errorMessageCapacity` | Byte capacity of `outErrorMessage` |

**Returns** — `STAutoEqParseStatus`. On success writes `outBands[0..*outBandCount)` and `*outPreampDb`; on failure `*outBandCount` = 0 · `*outPreampDb` = 0. There is no context, so nothing is recorded in `st_rt_get_last_status`.

| Value | Meaning |
|---|---|
| `ST_AUTOEQ_PARSE_OK`(0) | Success |
| `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`(1) | `utf8Text`, `outBandCount` or `outPreampDb` `NULL`, `bandCapacity < 0`, `outBands` `NULL` with `bandCapacity > 0` |
| `ST_AUTOEQ_PARSE_SYNTAX`(2) | Line format error (not a number, missing required field, duplicate, unknown token) |
| `ST_AUTOEQ_PARSE_UNSUPPORTED`(3) | Unsupported command, filter type, slope or BW form |
| `ST_AUTOEQ_PARSE_OUT_OF_RANGE`(4) | Out-of-range value |
| `ST_AUTOEQ_PARSE_TOO_MANY_BANDS`(5) | Exceeds `ST_PARAMETRIC_EQ_MAX_BANDS` or `bandCapacity` |
| `ST_AUTOEQ_PARSE_EMPTY`(6) | No `Preamp` or `Filter` lines at all |

</details>

<details>
<summary><code>st_rt_render_set_options</code> — Changes render options (path components, spatialization, limiter gate)</summary>

```c
void st_rt_render_set_options(STRT_Context* context, const STRenderOptions* options);
```

**Purpose** — Changes the gates of the auralization stage in one call. Toggle the direct, transmission, reflection, diffraction and reverb components individually for listening comparisons (A/B), or choose the early-reflection render path (exact objects / hybrid HOA bed), spatialization/HRTF, path fades and the output limiter. Propagation and IR conversion keep producing the same data; these options filter only the render synthesis stage.

**When / how** — Can also be called during rendering. To change only some fields, get the current values with `st_rt_render_get_options`, modify the fields and pass them back. While speaker output is active, the layout owns the early path (full ambisonics), `useSpatialization` = 1 and `useHrtf` = 0, so those values are kept and only the remaining gates are applied. After speakers are disabled, `reserved0` is again limited to the 0/1 range. The first-order scattering gate (`st_rt_render_set_diffuse_rain_enabled`) is outside this struct, so this call does not change it. Thread: `[control]` — a control-thread call that includes IR policy hooks; do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `options` | New options. Does nothing if `NULL` |

**Struct** `STRenderOptions` (12 `int` fields without a version stamp, 0 = off / nonzero = on)

| Field | Default | Description |
|---|---|---|
| `renderDirect` | 1 | Render direct sound |
| `renderTransmission` | 1 | Render transmitted sound |
| `renderReflection` | 1 | Render reflected sound |
| `renderDiffraction` | 1 | Render diffracted sound |
| `renderLateReverb` | 1 | Late reverb (FDN tank). 0 disables only the tank and keeps first-order scattering |
| `useDoppler` | 1 | Variable-delay Doppler (pitch). Ignored in real time and always 1 — passing 0 still enables it and get returns 1. Radiation gain of moving sources is a separate switch (`st_rt_set_doppler_gain_mode`) |
| `usePathFade` | 1 | Path fade. Length is `st_rt_render_set_path_fade_time` |
| `reserved0` | 1 | Early-reflection render path (same numbering as `STEarlySpatialMode`). `0` = Objects: renders every early path individually as an exact object (render cost grows with the path count). `1` = Hybrid: exact objects within a listener-global budget + the remaining early reflections and first-order scattering in an HOA3 bed. 1 is recommended for real-time game integration. Out-of-range values are clamped to `[0, 1]`. During speaker output, a different value indicating a layout-specific path may be read |
| `useSpatialization` | 1 | Use spatialization (panning, HRIR) |
| `useHrtf` | 0 | HRTF binaural spatialization. The `useHrtf` argument of `st_rt_render_start` sets this value when rendering starts |
| `useLimiter` | 1 | Enable the output limiter. Type is `st_rt_render_set_limiter_type` |
| `outputBandPressure` | 0 | Reserved slot. Always 0 in real time |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_get_options</code> — Reads the current render options</summary>

```c
void st_rt_render_get_options(const STRT_Context* context, STRenderOptions* outOptions);
```

**Purpose** — Fills the currently applied `STRenderOptions`. Used to read first when changing only some fields.

**When / how** — Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outOptions` | Output. Does nothing if `NULL`. See `st_rt_render_set_options` for the fields |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_set_diffuse_rain_enabled</code> — Enables or disables first-order scattering (diffuse rain) rendering</summary>

```c
void st_rt_render_set_diffuse_rain_enabled(STRT_Context* context, int enabled);
```

**Purpose** — First-order scattering is an independent render component alongside direct, reflected, diffracted sound and reverb (`render*` in `STRenderOptions`). Use this gate to toggle only first-order scattering for listening comparisons. Disabling removes only the rain bed cells of the hybrid path and the rain RIR cells of the Objects path; the FDN tail is unchanged. Conversely, `renderLateReverb` = 0 disables only the tank and keeps first-order scattering.

**When / how** — Can also be called during rendering; only render preparation is redone, without IR reconversion. It is outside `STRenderOptions`, so `st_rt_render_set_options` and speaker layout switches do not change it. Disabling sound tracing (`st_rt_render_set_sound_tracing_enabled(…, 0)`) also disables first-order scattering. Default 1. Thread: `[control]` — a control-thread call that republishes render preparation. Check support with `ST_CAP1_RENDER_DIFFUSE_RAIN_GATE` (capability word 1).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | 0 = first-order scattering off, nonzero = on (default) |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_is_diffuse_rain_enabled</code> — Reads the first-order scattering render gate state</summary>

```c
int st_rt_render_is_diffuse_rain_enabled(const STRT_Context* context);
```

**Purpose** — Returns the value set with `st_rt_render_set_diffuse_rain_enabled`.

**When / how** — Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `1` = enabled (default) / `0` = disabled. `-1` if there is no context.

</details>

<details>
<summary><code>st_rt_render_set_sound_tracing_enabled</code> — Enables or disables the sound tracing effect (baseline comparison)</summary>

```c
void st_rt_render_set_sound_tracing_enabled(STRT_Context* context, int enabled);
```

**Purpose** — A toggle for comparing against a "distance attenuation + panning" baseline with the sound tracing effect off. `enabled` = 0 is not a separate bypass renderer — the same tracing pipeline keeps running, but the reflection, diffraction, reverb and first-order scattering paths and air absorption, propagation delay and direct-sound occlusion are disabled, leaving only distance attenuation and spatialization. The spatialization method (`st_rt_render_set_spatializer`) is unchanged.

**When / how** — Can also be called during rendering. Even when disabled, scene setters, propagation workers, IR conversion and publishing keep running — it does not stop the scheduler or data pump; to save CPU use `st_rt_idle`. Therefore, even when disabled, sound plays only after the first IR is installed. Enabled by default. Thread: `[control]` — takes the scene lock several times; do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | 0 = baseline (distance attenuation + spatialization only), nonzero = sound tracing on (default) |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_is_sound_tracing_enabled</code> — Reads whether the sound tracing effect is enabled</summary>

```c
int st_rt_render_is_sound_tracing_enabled(const STRT_Context* context);
```

**Purpose** — Returns the value set with `st_rt_render_set_sound_tracing_enabled`.

**When / how** — Thread: `[any]` — an atomic read, so it does not block from any thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `1` = enabled (default) / `0` = disabled or context `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_path_fade_time</code> — Sets the path fade time</summary>

```c
void st_rt_render_set_path_fade_time(STRT_Context* context, float seconds);
```

**Purpose** — Sets the length (seconds) of the fade applied so that path changes during IR updates transition without clicks. Adjusts the trade-off between transition smoothness and responsiveness in scenes where sources and the listener move. Used while `STRenderOptions.usePathFade` is enabled (default).

**When / how** — Can also be called during rendering. The time argument is in seconds, independent of scene units. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `seconds` | Fade length [s], positive finite value. Default 0.05 s. Values of 0 or less and non-finite values are ignored |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_get_path_fade_time</code> — Reads the path fade time</summary>

```c
float st_rt_render_get_path_fade_time(const STRT_Context* context);
```

**Purpose** — Returns the current path fade time (seconds).

**When / how** — Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Fade time [s] (default `0.05`). `0` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_max_delay_seconds</code> — Sets the maximum delay of the render delay ring</summary>

```c
int st_rt_render_set_max_delay_seconds(STRT_Context* context, float seconds);
```

**Purpose** — Sets the maximum propagation delay (seconds) the renderer can represent. Exact paths whose delay exceeds this limit are dropped from rendering, and the late reverb is covered by the FDN. Increase it when late-arriving paths are needed, as in large interiors or outdoors; decrease it to reduce memory. Delay ring memory grows by 9 bands × ring length for every rendered source. In the source memory budget (`STMemoryBudget`), this value is the ceiling of the per-source delay ring.

**When / how** — It reallocates the delay rings, so it is best set before creating many sources and before starting rendering. The value at creation can also be given with `STRT_CreateOptions.maxDelaySeconds` (0 = default 2.0 s). Thread: `[control, blocking]` — a long section with delay ring reallocation; do not call from the game loop or the audio thread. Check support with `ST_CAP_RUNTIME_DELAY_RESIZE` (capability word 0).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `seconds` | Maximum delay [s], about `0.012` (engine block 512 + 8 samples of interpolation margin) to `60`. Default 2.0. Seconds, independent of scene units |

**Returns** — `1` = applied (also 1 for the same value) / `0` = rejected (out-of-range or non-finite value, context `NULL`).

</details>

<details>
<summary><code>st_rt_render_get_max_delay_seconds</code> — Reads the maximum delay of the render delay ring</summary>

```c
float st_rt_render_get_max_delay_seconds(const STRT_Context* context);
```

**Purpose** — Returns the current maximum delay (seconds).

**When / how** — Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Maximum delay [s] (default `2.0`). `0` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_get_ring_buffer_samples</code> — Reads the delay ring length (samples)</summary>

```c
int st_rt_render_get_ring_buffer_samples(const STRT_Context* context);
```

**Purpose** — Returns the length of the render delay ring corresponding to the current maximum delay, in engine samples (44.1 kHz). It is maximum delay × 44100 plus the render block (512) and interpolation margin, so use it for memory estimates.

**When / how** — Re-read it after `st_rt_render_set_max_delay_seconds`. Thread: `[control]` — a control-thread query that reads engine state without locks.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Ring length (samples). `0` if the context is `NULL`.

</details>

<details>
<summary><code>st_rt_render_start</code> — Starts audio rendering (per output mode)</summary>

```c
int st_rt_render_start(STRT_Context* context, int useHrtf);
```

**Purpose** — Starts render output and sets the output form (headphone binaural / stereo panning / speaker layout). What it brings up depends on the creation option `STRT_CreateOptions.renderOutputMode`.

| `renderOutputMode` | What `st_rt_render_start` does | Who takes the output |
|---|---|---|
| `ST_RT_RENDER_OUTPUT_DEVICE`(0, default) | Opens the OS audio device and starts the engine render thread | The engine outputs directly to the device |
| `ST_RT_RENDER_OUTPUT_HOST_PULL`(1) | **Creates no thread and no device**; only sets the binaural/speaker choice and the "render enabled" flag. Allocates the pull buffer and resampler here | The host calls `st_rt_render_process` on its own audio thread |
| `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED`(2) | Starts the engine render thread to fill the output ring (8-block capacity, 3-block target). No device | The host only copies from the ring with `st_rt_render_process` |

**When / how** — Call it after preparing the scene, sources and listener. It **must be called** in the HOST_PULL family too — before it is called, `st_rt_render_process` returns 0 frames. To use HRIR spatialization, first choose the dataset with `st_rt_render_set_spatializer` and start with `useHrtf` = 1. If a speaker layout (`st_rt_render_set_speaker_layout[_custom]`) is set and you start with `useHrtf` = 0, it outputs the N channels of that layout, and speaker output becomes active (`st_rt_render_get_speaker_channels`) only after this call. Starting while the engine is idle (`st_rt_idle`) starts in the IDLE state. Thread: `[control, blocking]` — DEVICE mode is a long section with device and thread startup; do not call from the game loop or the audio thread. Check HOST_PULL support with `ST_CAP_HOST_PULL_RENDER` and BUFFERED with `ST_CAP_HOST_PULL_BUFFERED` (capability word 0).

Thread count (PIPELINED scheduler, N = `max(3, compute thread budget)`): DEVICE = N−1 compute workers + 1 render + 1 device, HOST_PULL = N−1 compute workers (0 render and device), HOST_PULL_BUFFERED = N−1 compute workers + 1 render (0 device). With file input, one decoder thread is added. Measure with `st_rt_get_thread_inventory`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `useHrtf` | 1 = HRTF binaural 2 channels (HRIR chosen with `st_rt_render_set_spatializer`). 0 = stereo panning 2 channels, or the N channels of the speaker layout if one is set. `STRenderOptions.useHrtf` is also set from this value |

**Returns** — `1` = started (also 1 if already running in DEVICE mode) / `0` = failed (context `NULL`, device startup failure, etc.).

</details>

<details>
<summary><code>st_rt_render_stop</code> — Stops audio rendering</summary>

```c
void st_rt_render_stop(STRT_Context* context);
```

**Purpose** — Stops rendering started with `st_rt_render_start`.

**When / how** — Behavior per mode:

- DEVICE: stops the device and joins the render thread.
- HOST_PULL: clears the "render enabled" flag and empties the carry-over FIFO (so the next start does not emit a leftover tail). Afterwards `st_rt_render_process` returns 0.
- HOST_PULL_BUFFERED: stops the render thread and discards the output ring. What was in the ring is already counted in the speaker set's `contentFrame` but was never heard, so to keep the set position aligned, read `contentFrame − latencyFrames` (the heard position) before discarding and re-seat it with `st_rt_speaker_set_relocate`.

Safe to call concurrently with `st_rt_render_process` — the engine clears render enable, waits for any in-progress `st_rt_render_process` to exit, then stops. To also release the device during a long idle period, call this function after `st_rt_get_idle_state` becomes IDLE. Thread: `[control, blocking]` — involves device stop and thread join; do not call from the game loop or the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_is_running</code> — Reads whether rendering is running</summary>

```c
int st_rt_render_is_running(const STRT_Context* context);
```

**Purpose** — Returns the render state. The meaning is consistent regardless of output mode — DEVICE checks whether the device is running; HOST_PULL checks not a device but the "render enabled" flag (after `st_rt_render_start`, before `st_rt_render_stop`).

**When / how** — Thread: `[control]` — a control-thread query.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `1` = rendering / `0` = stopped or context `NULL`.

</details>

<details>
<summary><code>st_rt_render_process</code> — Pulls an output block on the host audio thread (pull rendering)</summary>

```c
int st_rt_render_process(STRT_Context* context, float* interleavedOut, int frames);
```

**Purpose** — The entry point of the HOST_PULL family output modes. In integrations where the engine output must pass through the host audio graph — game engine submix effects, audio capture and recording pipelines, etc. — the host pulls blocks on its own audio thread. HOST_PULL renders on this calling thread; HOST_PULL_BUFFERED only copies from the ring filled by the engine render thread (host callback cost ≈ memcpy, the ring absorbs jitter). All three output modes use the same block function, so the sound is the same.

**When / how** — Call it in every host audio callback after `st_rt_render_start`. Thread: `[audio]` — safe on the host audio thread (MMCSS/HIGHEST). It introduces no new locks, allocations or system calls (buffers and the resampler are allocated in `st_rt_render_start`, and IR adoption is a pointer swap), and does not touch the calling thread's priority or affinity. Only FTZ/DAZ are enabled for the duration of this call and then restored.

- **Channel count** — 2 for binaural/stereo, and the value of `st_rt_render_get_speaker_channels()` when a speaker layout is active. If that function returns 0, the output is **2 channels** — do not use 0 as the channel count.
- **Layout switches** — Calling `st_rt_render_set_speaker_layout[_custom]` / `st_rt_render_disable_speaker_output` during rendering reconfigures the pull output (channel count, engine block, carry-over FIFO, output resampler). Switching is safe to call concurrently with this function — the engine clears render enable, waits for the in-progress call to exit, then switches (same for `st_rt_render_start` / `stop`). A call that hits the switching window returns **0 frames**, so the host treats that block as silence. After a switch, re-read `st_rt_render_get_speaker_channels()` and size buffers to that width.
- **Underrun** — If a source stream was filled with less than requested, that source is filled with silence and the shortfall accumulates in `STStreamStatus.underrunFrames`. **It never stalls.** In BUFFERED, if the per-block render cost persistently exceeds the block time (11.61 ms), the ring cannot hide it either; that underrun is counted by the engine ring counter and filled with silence.
- **Arbitrary `frames`** — Internally it renders in 512-frame engine blocks and keeps the remainder in the carry-over FIFO. Even if the host block is not a multiple of 512 (e.g. 1024 at 48 kHz = 941.6 engine frames) it does not stall, but what remains in the FIFO is latency. The latency cap is 1 engine block + resampler latency, and when the host block is a multiple of 512 the carry-over remainder is fixed at 0 (see `st_rt_render_get_latency_frames`).
- **Sample rate** — `frames` is in units of `STRT_CreateOptions.hostSampleRate` (the engine rate 44100 if 0). When nonzero, the engine converts on the output side (BUFFERED converts on the render thread).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `interleavedOut` | Output buffer. Interleaved float; must hold `frames × channel count` values |
| `frames` | Requested frame count (host rate), 1 or greater |

**Returns** — Number of frames actually written (normally `frames`). On a partial return (`0 < returned < frames`) the rest is filled with silence. Cases of `0` and `st_rt_get_last_status`:

| Situation | Status |
|---|---|
| Context or buffer `NULL`, `frames` ≤ 0 | `ST_STATUS_INVALID_ARGUMENT` |
| DEVICE mode context | `ST_STATUS_UNAVAILABLE` |
| Before `st_rt_render_start` | `ST_STATUS_UNAVAILABLE` |
| Layout switching window | 0 frames (treat as silence) |

</details>

<details>
<summary><code>st_rt_render_get_latency_frames</code> — Reads the latency held by the pull output stage</summary>

```c
int st_rt_render_get_latency_frames(const STRT_Context* context);
```

**Purpose** — Returns, in host frames, the latency currently held by the **output stage** of the pull path. Use it for A/V sync compensation.

Latency = carry-over FIFO remainder + output resampler latency + fixed input resampler latency

**When / how** — Not a fixed value but a **snapshot at call time**. If the requested `frames` is not a multiple of 512, it fluctuates per call by the carry-over remainder (equivalent to 0..511 engine frames), capped at 1 engine block + resampler latency. For A/V sync, read it once **just before** processing a block. Even with `hostSampleRate` = 0 (no conversion) the carry-over FIFO exists, so it may be nonzero. In BUFFERED mode it is the frames queued in the ring (host rate) + converter latency, capped at about 3 engine blocks. Thread: `[any]` — does not block from any thread.

This value counts only the output stage's share. The complete answer to "how many frames later will the input frame I just pushed come out" is this value + `STStreamStatus.queuedFrames` + the fixed latency of the engine DSP (limiter latency, etc., constant for the same settings).

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Latency (host frames). Always `0` in DEVICE mode.

</details>

<details>
<summary><code>st_rt_render_get_process_stats</code> — Reads the per-stage timings of the last render block</summary>

```c
int st_rt_render_get_process_stats(const STRT_Context* context, STProcessStats* outStats);
```

**Purpose** — Returns the per-stage pure compute time (µs) and tap counts of the last completed 512-frame render block. Use it to determine "why rendering is heavy" from the host without looking into the engine. All three output modes use the same block function, so the values mean the same thing (HOST_PULL values are measured inside the host callback).

**When / how** — Can be called at any time during rendering, from any thread. Thread: `[any]` — a seqlock snapshot (per-field atomics, up to 8 retries), so it does not block. Check support with `ST_CAP_PROCESS_STATS` (capability word 0).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outStats` | Output. The caller fills `structSize` / `apiVersion` |

**Struct** `STProcessStats`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STProcessStats)` / `ST_ABI_VERSION` |
| `blockSequence` | +1 per block. 0 = no block has run yet (also 0 during the silent preroll) |
| `sourceInputUs` | Source input read + 9-band crossover + band delay ring write (summed over sources) |
| `exactTapsUs` | Exact path tap rendering (HRIR bus accumulation or stereo panning, summed over sources) |
| `bedUs` | Early bed — per-source send bus summing + merged bed convolution |
| `sendUs` | Reverb send — per-source band bus summing + listener-global send tap rendering |
| `lateUs` | FDN16 late reverb |
| `outputUs` | The rest — HRTF spectral synthesis, HOA decode, EQ, limiter, mode fade |
| `totalUs` | The whole block (same span as `STTiming.auralProcessMs`). The sum of the six stages equals or is slightly less than this value |
| `activeSources` | Number of sources with attached input |
| `exactTaps` | Number of exact taps actually rendered in that block (summed over sources) |
| `sendTaps` | Number of listener-global send taps — independent of the source count, capped by the number of time bins |
| `reserved[8]` | Reserved |

**Returns** — `1` = success / `0` = failed. `NULL` or a stamp mismatch gives `ST_STATUS_VERSION_MISMATCH`, an uninitialized engine gives `ST_STATUS_INVALID_CONTEXT`, and a snapshot failure gives `ST_STATUS_UNAVAILABLE` (`outStats` unchanged).

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout</code> — Outputs to a preset speaker layout</summary>

```c
int st_rt_render_set_speaker_layout(STRT_Context* context, int preset);
```

**Purpose** — Produces N-channel output for a real speaker arrangement (2.0–7.1) instead of headphone binaural. In speaker output, the layout owns the full-ambisonics early path, spatialization on and HRTF off (see `st_rt_render_set_options`).

**When / how** — Usually set before `st_rt_render_start(context, 0)`. Called during rendering, it restarts the audio device as stop → apply → start, and if the device rejects the N-channel format it falls back once to stereo and retries. In the HOST_PULL family the pull output is reconfigured, and meanwhile `st_rt_render_process` returns 0 frames. After calling, re-read the actual output width with `st_rt_render_get_speaker_channels()`. Every time a layout is set (even the same layout) all speaker channel EQs are cleared, so configure channel EQs after setting the layout. Thread: `[control, blocking]` — involves a device restart; do not call from the game loop or the audio thread.

The channel order follows the WAVEFORMATEXTENSIBLE standard order (of FL FR FC LFE BL BR SL SR, channels not in the layout are skipped), and the direction convention is the same as the engine-wide one (azimuth front 0° · right +90°, elevation up +).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `preset` | `0` = 2.0 / `1` = 2.1 / `2` = 4.1 / `3` = 5.1 / `4` = 7.1 / `5` = laptop nearfield 2.0 |

`5` (LaptopNearfield20, "MacBook Pro 16-inch reference") is exactly 2 PCM channels and differs from `0` only in listening geometry (half-angle 30° → 15.642°). It does not touch built-in speaker processing owned by the device or OS (woofers, wide stereo, spatial audio DSP, etc.).

**Returns** — `1` = applied / `0` = failed. An out-of-range `preset` does nothing and returns `0`.

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout_custom</code> — Outputs to an arbitrary speaker arrangement</summary>

```c
int st_rt_render_set_speaker_layout_custom(STRT_Context* context, const float* azimuthDegrees, const float* elevationDegrees, const unsigned char* isLfe, const float* gainTrim, const float* distanceMeters, int channelCount);
```

**Purpose** — Defines a speaker arrangement not covered by presets (domes, irregular arrays, etc.) directly with per-channel direction, LFE flag, trim and distance. If distances are given, delay and 1/r level are aligned to the farthest speaker to compensate installations with differing speaker distances.

**When / how** — Call timing, restart, channel EQ reset and re-checking `st_rt_render_get_speaker_channels` are the same as `st_rt_render_set_speaker_layout`. The channel order is the array order, and the direction convention is the same as the engine-wide one (azimuth front 0° · right +90°, elevation up +). The limiter, equal-loudness compensation and virtual bass apply up to 32 channels; the output parametric EQ and speaker channel EQ apply up to 64 channels. Thread: `[control, blocking]` — involves a device restart; do not call from the game loop or the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `azimuthDegrees` | Per-channel azimuth [°], `channelCount` values. Required |
| `elevationDegrees` | Per-channel elevation [°], `channelCount` values. Required |
| `isLfe` | Per-channel LFE flag (0/1), `channelCount` values. Required |
| `gainTrim` | Per-channel linear trim, `channelCount` values. All 1.0 if `NULL` |
| `distanceMeters` | Per-channel speaker distance [m], `channelCount` values (meters, not scene units). If not `NULL` and all non-LFE channels are positive, the render output stage applies delay and 1/r level alignment relative to the farthest speaker. No alignment if `NULL` |
| `channelCount` | Channel count, 1 or greater |

**Returns** — `1` = applied / `0` = failed (`azimuthDegrees`, `elevationDegrees` or `isLfe` is `NULL`, or `channelCount` ≤ 0, etc.).

</details>

<details>
<summary><code>st_rt_render_disable_speaker_output</code> — Disables speaker output and returns to stereo</summary>

```c
void st_rt_render_disable_speaker_output(STRT_Context* context);
```

**Purpose** — Disables speaker layout output and returns to the default stereo (2-channel) path.

**When / how** — During rendering this causes a device restart (DEVICE) or pull output reconfiguration (HOST_PULL family), and meanwhile `st_rt_render_process` returns 0 frames. All speaker channel EQs are cleared, and `STRenderOptions.reserved0` is again limited to the 0/1 range. Thread: `[control, blocking]` — involves a device restart; do not call from the game loop or the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_render_get_speaker_channels</code> — Reads the speaker output channel count</summary>

```c
int st_rt_render_get_speaker_channels(STRT_Context* context);
```

**Purpose** — Returns the current output channel count when speaker output is active. In the HOST_PULL family it matches the actual `st_rt_render_process` output width (0 means 2 channels).

**When / how** — Speaker output becomes active only after `st_rt_render_start` — if a layout is set but rendering has not started, it is still 0. After changing the layout, re-read it to match the buffer width. Thread: `[control]` — a non-atomic member read; do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Output channel count. `0` if speaker output is inactive (the output is then 2 channels).

</details>

<details>
<summary><code>st_rt_render_set_speaker_channel_eq</code> — Applies an EQ to one speaker output channel (room correction)</summary>

```c
int st_rt_render_set_speaker_channel_eq(STRT_Context* context, int32_t channelIndex, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**Purpose** — A parametric EQ applied to a single output channel, such as room correction measured per physical speaker. Tone common to all channels is handled by the output EQ (`st_rt_render_set_parametric_eq`).

**When / how** — In the speaker path it sits right after the global output EQ and before the master gain. It applies only to speaker layout output and has no effect on stereo or binaural output. Channels that are not configured (or are disabled or have no effect) are not touched. **All channels are cleared every time a layout is set (`st_rt_render_set_speaker_layout[_custom]`, even the same layout) and on `st_rt_render_disable_speaker_output`** — the meaning of a channel index differs per layout (the same index 3 is the LFE in 5.1), so keeping old indices would apply EQ to the wrong speaker. Configure it after setting the layout. Unlike `st_rt_render_get_speaker_channels`, the channel count is counted right after the layout is set, even before `st_rt_render_start`. Changes transition over a 20 ms crossfade. Thread: `[control]` — changes only the output stage; do not call from the audio callback. Check support with `ST_CAP1_SPEAKER_CHANNEL_EQ` (capability word 1).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `channelIndex` | Output channel index (layout channel order, including LFE), `[0, layout channel count)`. Up to 64 channels |
| `bands` | Array of `bandCount` bands. `NULL` allowed when `bandCount` = 0. See `st_rt_render_set_parametric_eq` for the `STParametricEqBand` fields and filter definition |
| `bandCount` | Band count `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` |
| `preampDb` | Preamp [dB], clamped to `[−48, +12]` |
| `enabled` | 0 stores the list but passes through |

**Returns** — `1` = applied / `0` = failed. On `0`, `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT` (channel out of range or no layout; other validation is the same as `st_rt_render_set_parametric_eq`) / `ST_STATUS_UNAVAILABLE` (`ST_BACKEND_EXA` backend).

</details>

<details>
<summary><code>st_rt_render_get_speaker_channel_eq</code> — Reads a speaker channel EQ</summary>

```c
int st_rt_render_get_speaker_channel_eq(const STRT_Context* context, int32_t channelIndex, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**Purpose** — Returns the EQ band list (clamped effective values), preamp and enabled state of one output channel. A channel that has not been configured has 0 bands and is disabled.

**When / how** — The output conventions (size query, skipping `NULL` outputs, insufficient-capacity handling) are the same as `st_rt_render_get_parametric_eq`. Thread: `[control]` — takes the auralizer control lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `channelIndex` | Output channel index, `[0, layout channel count)` |
| `outBands` | Band output array. `NULL` makes it a size query |
| `bandCapacity` | Capacity of `outBands`, 0 or greater |
| `outBandCount` | Band count output. Skipped if `NULL` |
| `outPreampDb` | Preamp [dB] output. Skipped if `NULL` |
| `outEnabled` | Enabled (0/1) output. Skipped if `NULL` |

**Returns** — `1` = success / `0` = failed (`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_UNAVAILABLE`, same meanings as `st_rt_render_get_parametric_eq`).

</details>

<details>
<summary><code>st_rt_render_clear_speaker_channel_eqs</code> — Disables all speaker channel EQs</summary>

```c
int st_rt_render_clear_speaker_channel_eqs(STRT_Context* context);
```

**Purpose** — Disables the speaker channel EQ of every channel at once.

**When / how** — During playback it transitions over a 20 ms ramp. Succeeds even without a layout. Thread: `[control]` — changes only the output stage; do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `1` = success / `0` = failed (`ST_STATUS_UNAVAILABLE` for the `ST_BACKEND_EXA` backend).

</details>

<details>
<summary><code>st_rt_speaker_set_create</code> — Creates a virtual speaker set that plays multichannel input</summary>

```c
STSpeakerSetId st_rt_speaker_set_create(STRT_Context* context, const STSpeakerSetDesc* desc);
```

**Purpose** — A speaker set plays one multichannel PCM input (C content channels) through N virtual speakers in the room. Each speaker is one engine-created source (member source), and several speakers can share one channel (cinema arrays). The set has **one** input ring (interleaved), read once per render block so every speaker reads the same block and the same samples — underruns also hit all channels simultaneously, so channels never drift apart. Upmix input that raises stereo input to 3.0/5.1/7.1 is also supported.

**When / how** — Create it after preparing the scene and listener, fill the ring with `st_rt_speaker_set_write`, then play with `st_rt_speaker_set_play`. Members enter the playing state as soon as they are created but output silence until the set is played. Member quality settings (ray count, depth, transport update tier) can be applied at any time after creation to the ids obtained with `st_rt_speaker_set_get_source` (before the first propagation, they take effect from the first IR). Thread: `[control, blocking]` — creates N member sources (+ directivity, gain); do not call from the game loop or the audio thread. Check support with `ST_CAP1_SPEAKER_SET` (capability word 1).

- **Limits** — `ST_SPEAKER_SET_MAX_SETS` (12) sets, and per set `ST_SPEAKER_SET_MAX_CHANNELS` (16) channels and `ST_SPEAKER_SET_MAX_SPEAKERS` (64) speakers. Sets do not use host stream slots (64). Unused slots and idle sets cost only a few atomic reads per render block.
- **Coordinates** — Speaker poses are in **set coordinates**, and world = anchor ∘ set transform ∘ speaker pose. The `WORLD` anchor is identity (room-fixed); the `LISTENER` anchor is listener position + yaw (rotation about +Y). The `LISTENER` anchor is recomputed only from the listener fields of `st_rt_speaker_set_update`; the regular listener setters (including head rotation) do not move the set. The anchor at creation is the listener position and yaw at that time. Quaternions are XYZW and normalized by the engine (norm `< 1e-12` is rejected). The speaker local frame and directivity table frame are the same as for sources (forward = +Z).
- **Level** — Member volume (same slot as source volume, 3 ms ramp) = 0 if `muted` or `silenced`, otherwise `gain × trim`. With `ST_SPEAKER_SET_FLAG_ARRAY_TRIM`, `trim = 1/√N`, where N is the number of speakers on the same channel that are not `muted` and have `gain` > 0 (`silenced` ones are counted). LFE has no special treatment. `st_rt_source_get_volume` returns the ramp target.
- **Member ownership** — Member sources are owned by the set. For member ids, input (`set_audio_*`, `attach_stream`, `clear_audio`), playback (play/pause/stop/seek/loop/trigger/retrigger), pose (position/direction/velocity/orientation_q), radiation (directivity/axis_attenuation), volume, pitch, destroy and `st_rt_source_idle`/`_run` return 0 or are ignored and leave `ST_STATUS_INVALID_ARGUMENT`. Quality settings (ray count, depth, update tier, EQ, path enable, path volume) and getters work as usual. Directivity is set at creation, and rotations of omnidirectional speakers are not sent to the engine.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `desc` | Set descriptor. The caller fills `structSize` / `apiVersion`. Pointer arrays are read only during the call (copied) |

**Struct** `STSpeakerSetDesc`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDesc)` / `ST_ABI_VERSION` |
| `channelCount` | Content channel count `[1, ST_SPEAKER_SET_MAX_CHANNELS]` |
| `speakerCount` | Speaker count `[1, ST_SPEAKER_SET_MAX_SPEAKERS]` |
| `speakers` | Array of `speakerCount` `STSpeakerDesc` |
| `directivities` | Array of pointers to shared directivity tables (`STSourceDirectivity`). Speakers pointing to the same table share one engine copy. Each table is validated the same as `st_rt_source_set_directivity`. `NULL` allowed (`directivityCount` 0) |
| `directivityCount` | Number of elements in `directivities` |
| `anchor` | `STSpeakerSetAnchor` — `ST_SPEAKER_SET_ANCHOR_WORLD`(0) / `ST_SPEAKER_SET_ANCHOR_LISTENER`(1) |
| `position[3]` / `rotationXYZW[4]` | Set transform (anchor coordinates) |
| `sampleRate` | Input rate. Must be the engine rate (44100), or `hostSampleRate` if the context specifies it |
| `capacityFrames` | Ring capacity (host frames), `[512, 1048576]`. 0 = 16384 |
| `flags` | `ST_SPEAKER_SET_FLAG_ARRAY_TRIM` (1/√N for N speakers sharing a channel) / `ST_SPEAKER_SET_FLAG_STATIC` (member sources static, `isDynamic` 0) |
| `inputChannels` | Upmix input. 0 = `channelCount` as is. 2 = upmixes stereo to `channelCount` (3 = L R C, 6 = 5.1, 8 = 7.1) — write then takes stereo |
| `upmixWindowFrames` | Upmix window length `[1024, 65536]`, even, 0 = 4096. Window latency = half the window (default 2048) |
| `reserved[5]` | 0 |

**Struct** `STSpeakerDesc`

| Field | Description |
|---|---|
| `channel` | Content channel this speaker plays `[0, channelCount)` |
| `directivityIndex` | -1 = omnidirectional, otherwise = index into `STSpeakerSetDesc.directivities` |
| `pose` | `STSpeakerPose` — pose in set coordinates and level |
| `reserved[2]` | 0 |

**Struct** `STSpeakerPose`

| Field | Description |
|---|---|
| `position[3]` / `rotationXYZW[4]` | Position and rotation in set coordinates |
| `gain` | Linear pressure `[0, 16]` |
| `muted` | 0/1 — 1 means volume 0 and excluded from N of `ARRAY_TRIM` |
| `silenced` | 0/1 — 1 means volume 0 but N is unchanged (solo playback for measurement: set the rest to `silenced`) |
| `reserved[2]` | 0 |

**Upmix input** (`inputChannels` = 2) — The engine's built-in upmixer determines the front azimuth (±30°) from the level difference of the left and right components and front/side/back from their correlation (correlated → front, uncorrelated → side, out of phase → back), distributes energy-preservingly over the speaker ring, and adds the low band of (L + R)/2 (up to 80 Hz, 0 at 160 Hz) to the LFE. 3.0 is a center extraction that moves only the correlated front share to FC and leaves the rest in L and R to keep the stereo image (no LFE). The output channel order is 3.0 = FL FR FC, 5.1 = FL FR FC LFE SL SR, 7.1 = FL FR FC LFE SL SR BL BR (same as the speaker `channel` numbers), and the assumed angles are FL −30° · FR 30° · FC 0°, 5.1 SL −110° · SR 110°, 7.1 SL −90° · SR 90° · BL −150° · BR 150°. The upmix runs at the host rate on the producer thread that calls write (no allocation). The window latency is trimmed so input frame n = content frame n, but input must go `inputDelayFrames` further before it emerges into the ring, so prefill that much more. After stop/relocate, the first write also discards the upmix history.

**Returns** — Set handle. On failure `v < 0`, and any members being created are all destroyed. `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH` / `ST_STATUS_INVALID_ARGUMENT` (range, non-finite, channel, rate, `reserved`) / `ST_STATUS_UNAVAILABLE` (all `ST_SPEAKER_SET_MAX_SETS` sets in use).

</details>

<details>
<summary><code>st_rt_speaker_set_destroy</code> — Destroys a speaker set</summary>

```c
int st_rt_speaker_set_destroy(STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Destroys the member sources (3 ms fade) and returns the set slot.

**When / how** — Call it when the set is no longer needed. Calling `st_rt_source_destroy` on a member id is rejected, so always destroy with this function. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `1` = destroyed / `0` = no such set.

</details>

<details>
<summary><code>st_rt_speaker_set_get_source</code> — Gets the member source id of one speaker</summary>

```c
STSourceId st_rt_speaker_set_get_source(STRT_Context* context, STSpeakerSetId set, int speakerIndex);
```

**Purpose** — Returns the id of the member source handling speaker number `speakerIndex`. Use it for per-member quality settings (ray count, depth, transport update tier, EQ, path enable, path volume) and source getters.

**When / how** — Call it any time after creating the set. Quality applied before the first propagation takes effect from the first IR. Input, playback, pose, radiation, volume, pitch and destroy are owned by the set and are rejected through this id (see `st_rt_speaker_set_create`). Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `speakerIndex` | Speaker index `[0, speakerCount)` (order of `STSpeakerSetDesc.speakers`) |

**Returns** — Member source id. On failure (no such set, out of range) `v < 0`.

</details>

<details>
<summary><code>st_rt_speaker_set_update</code> — Updates the set transform, speaker poses and listener in one call</summary>

```c
int st_rt_speaker_set_update(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetUpdate* update, uint32_t* outChanged);
```

**Purpose** — Changes the set transform, all speaker poses and levels, the listener pose and the `ARRAY_TRIM` flag at once. Values bit-identical to the last applied values are not sent to the engine, so even if called every frame only what changed is applied.

**When / how** — Can be called every frame from the game loop. A `LISTENER`-anchored set is recomputed only from this call's listener fields, and the same call also moves the engine listener to the same placement (same meaning as `st_rt_listener_set_position`/`rotation`). Atomicity: with the SYNCHRONOUS scheduler, the next `st_rt_propagate` sees the whole update at once. PIPELINED puts all speaker positions and the listener position into one revision; rotation changes are scene commits and may become visible one task ahead of positions. If `outChanged` is 0, nothing was sent to the engine, so a SYNCHRONOUS host may skip propagate. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `update` | Update contents. The caller fills `structSize` / `apiVersion`. Only what is in `fields` is read |
| `outChanged` | Output bits of the items sent to the engine. `NULL` allowed. `ST_SPEAKER_SET_CHANGED_LISTENER` (engine listener pose) / `ST_SPEAKER_SET_CHANGED_POSES` (member source world positions and rotations) / `ST_SPEAKER_SET_CHANGED_GAINS` (member source volumes) |

**Struct** `STSpeakerSetUpdate`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetUpdate)` / `ST_ABI_VERSION` |
| `fields` | Bits of the items to read: `ST_SPEAKER_SET_UPDATE_TRANSFORM` / `_SPEAKERS` / `_LISTENER` / `_FLAGS` |
| `position[3]` / `rotationXYZW[4]` | TRANSFORM — set transform (anchor coordinates) |
| `listenerPosition[3]` | LISTENER — listener position (scene units) |
| `listenerYaw` | LISTENER — yaw [rad], about +Y |
| `listenerPitch` | LISTENER — pitch [rad]. Applies only to the listener; the anchor follows yaw only |
| `speakerCount` | SPEAKERS — must equal the set's speaker count |
| `speakers` | SPEAKERS — array of `speakerCount` `STSpeakerPose` (all of them). See `st_rt_speaker_set_create` for the fields |
| `flags` | FLAGS — `ST_SPEAKER_SET_FLAG_ARRAY_TRIM` on/off (other bits 0) |
| `reserved[5]` | 0 |

**Returns** — `1` = success / `0` = failed.

</details>

<details>
<summary><code>st_rt_speaker_set_write</code> — Writes interleaved PCM to the set ring</summary>

```c
int st_rt_speaker_set_write(STRT_Context* context, STSpeakerSetId set, const float* interleaved, int frames);
```

**Purpose** — Supplies the set's multichannel content to the ring. Write it the same way whatever the origin — file decoding, web PCM, microphone, etc.

**When / how** — Prefill before playback, and during playback match the supply rate by watching `queuedFrames` of `st_rt_speaker_set_get_status`. It can be written even while rendering is not running; frames written while the engine or set is idle stay in the ring and play after waking. Thread: `[any]` — single producer only, no locks or allocations (the upmix also runs on this calling thread).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `interleaved` | Interleaved float, `frames × input channel count` values. Input channel count = `channelCount`, or 2 for upmix input |
| `frames` | Frame count (host frames = `STSpeakerSetDesc.sampleRate`) |

**Returns** — With `hostSampleRate` = 0 and no upmix, the number of frames that actually entered the ring (backpressure — write the rest again). Otherwise (`hostSampleRate` specified or upmix input) always `frames` with no backpressure, so match the supply rate with `queuedFrames`. Overflow is recorded only in `droppedFrames`.

</details>

<details>
<summary><code>st_rt_speaker_set_write_planar</code> — Writes PCM to the set ring as per-channel arrays</summary>

```c
int st_rt_speaker_set_write_planar(STRT_Context* context, STSpeakerSetId set, const float* const* channels, int frames);
```

**Purpose** — Same as `st_rt_speaker_set_write`, except the input is per-channel (planar) arrays. Avoids an interleave copy when the decoder outputs planar data.

**When / how** — Same as `st_rt_speaker_set_write`. Thread: `[any]` — single producer only, no locks or allocations.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `channels` | Array of channel pointers `channels[input channel count]`, each with `frames` floats. Input channel count = `channelCount`, or 2 for upmix input |
| `frames` | Frame count (host frames) |

**Returns** — Same as `st_rt_speaker_set_write`.

</details>

<details>
<summary><code>st_rt_speaker_set_play</code> — Starts set playback</summary>

```c
int st_rt_speaker_set_play(STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Requests playback of the whole set. All members start together in the same render block.

**When / how** — The requested state changes **immediately on the call**, and the sound takes effect for the whole set at once at the next render block boundary. So even while rendering is stopped, stop → relocate → write (prefill) → play accumulate and all take effect together in the next first block. play waits in `ST_SPEAKER_SET_STARTING` until an IR containing the member sources is adopted by the renderer (without consuming content), and after that starts even if the ring is empty (counted as underrun) — the host fills it first. **The first playback starts without a fade-in**; restarting after pause or stop applies a 132-sample fade-in. Resuming after pause continues from exactly the frame where it stopped. If the engine is idle, it is released at a block boundary after waking. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `1` = requested / `0` = failed (no such set, etc.).

</details>

<details>
<summary><code>st_rt_speaker_set_pause</code> — Pauses the set (keeps the queue)</summary>

```c
int st_rt_speaker_set_pause(STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Pauses the whole set. The queue in the ring is kept, so playing again continues from exactly the frame where it stopped.

**When / how** — The request is immediate; the sound takes effect at the next render block boundary. When stopping, it applies a 132-sample ramp from the last output sample of each channel to 0 and consumes no more from the ring, so `contentFrame` is the position actually output. Reverb already released into the room keeps ringing. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `1` = requested / `0` = failed (no such set, etc.).

</details>

<details>
<summary><code>st_rt_speaker_set_stop</code> — Stops the set (empties the queue)</summary>

```c
int st_rt_speaker_set_stop(STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Stops the whole set and empties the ring queue.

**When / how** — The request is immediate; the sound takes effect at the next render block boundary (132-sample ramp out). Reverb already released into the room keeps ringing. To seek, call `st_rt_speaker_set_relocate` → write (prefill) → play right after stop (or pause). Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `1` = requested / `0` = failed (no such set, etc.).

</details>

<details>
<summary><code>st_rt_speaker_set_relocate</code> — Re-seats the set's content position (seek)</summary>

```c
int st_rt_speaker_set_relocate(STRT_Context* context, STSpeakerSetId set, int64_t contentFrame);
```

**Purpose** — For seeking. Discards the frames written up to the call, and from the next read counts `contentFrame` from this value. Frames written afterwards are kept.

**When / how** — Accepted only when the requested state is stopped or paused (it can be called right after stop). The input resampler (`hostSampleRate`) and upmix history are also discarded on the next write, so the first output sample after relocate is sample-accurately aligned to the first host frame written afterwards (= the `contentFrame` reference). In HOST_PULL_BUFFERED, before discarding the output ring with `st_rt_render_stop`/`start`, read `contentFrame − latencyFrames` (the heard position) and re-seat with this function. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `contentFrame` | New content position reference (host frames) |

**Returns** — `1` = applied / `0` = failed (playing, no such set, etc.).

</details>

<details>
<summary><code>st_rt_speaker_set_idle</code> — Idles the set (all members)</summary>

```c
int st_rt_speaker_set_idle(STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Eliminates the compute and render cost of a set that has nothing to play. Idles all members at once (one scene commit; behavior is the same as `st_rt_source_idle`), and once the set window has been silent for as long as the members (delay line length + 1 s) and the dry-mode delay ring is also empty, the per-render-block ring reads and dry mix stop as well (the block clock `renderFrame` also stops).

**When / how** — Call it after stopping playback (stop, pause, writing silence). Frames written while idle stay in the ring and play after waking. `st_rt_source_idle`/`_run` on member ids are rejected, so handle sets with this function and `st_rt_speaker_set_run`. Thread: `[control]` — takes the scene lock. Check support with `ST_CAP1_ENGINE_IDLE` (capability word 1).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `1` = success / `0` = failed (`ST_STATUS_NOT_FOUND` no such set, `ST_STATUS_UNAVAILABLE`).

</details>

<details>
<summary><code>st_rt_speaker_set_run</code> — Wakes an idle set</summary>

```c
int st_rt_speaker_set_run(STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Runs a set idled with `st_rt_speaker_set_idle` again. It wakes the members first and then opens the set window, so no content is lost even if a render block intervenes.

**When / how** — Call it before playing again. Frames written to the ring while idle play after waking. Thread: `[control]` — takes the scene lock. Check support with `ST_CAP1_ENGINE_IDLE` (capability word 1).

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `1` = success / `0` = failed (`ST_STATUS_NOT_FOUND` no such set, `ST_STATUS_UNAVAILABLE`).

</details>

<details>
<summary><code>st_rt_speaker_set_get_idle_state</code> — Reads the set's idle state</summary>

```c
int st_rt_speaker_set_get_idle_state(const STRT_Context* context, STSpeakerSetId set);
```

**Purpose** — Returns the set's idle/running state as `STRT_IdleState`. It is IDLE only when the set and all members are idle.

**When / how** — Use it to check whether the tail has fully played out after `st_rt_speaker_set_idle`. Thread: `[control]` — a control-thread query.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |

**Returns** — `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1, still outputting remaining sound) / `ST_RT_IDLE_IDLE`(2). `-1` for no such set or context `NULL`.

</details>

<details>
<summary><code>st_rt_speaker_set_set_direct</code> — Configures dry mode (direct output bypassing propagation)</summary>

```c
int st_rt_speaker_set_set_direct(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetDirect* direct);
```

**Purpose** — Dry mode bypasses propagation and auralization and outputs the set channels directly to the output channels. Toggling it crossfades between the in-room speaker sound and the dry content at the same content position. It uses the same ring, `contentFrame`, transport and fades; the same content samples read each render block are split into dry g and the wet path (member sources) 1 − g, and g moves linearly during the crossfade. Even when the wet path reaches 0, reverb already released into the room decays naturally.

**When / how** — The full setting is sent each time and applies from the next render block. Settings changed while the set was not sounding (stopped, paused, waiting to start) take effect immediately without a crossfade — playing for the first time in dry mode outputs only dry sound from the first sample. The dry signal goes through the matrix after `delayFrames` and is added **before** the output stage (output EQ → master gain → limiter), so the limiter and output-stage latency are the same as the wet path; match the remaining difference, the wet path's propagation delay (distance/speed of sound), with `delayFrames`. Changing `delayFrames` while dry is enabled jumps instead of splicing. Even on headphone output the dry signal does not go through HRTF. The output of a set that has never enabled dry mode is bit-identical to having no such feature. Thread: `[control]` — do not call from the audio callback.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `direct` | Dry settings. The caller fills `structSize` / `apiVersion` |

**Struct** `STSpeakerSetDirect`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDirect)` / `ST_ABI_VERSION` |
| `enabled` | 0 = wet path (default), 1 = dry |
| `crossfadeMs` | Transition length `[0, 1000]` ms. Shorter than 3 ms becomes 3 ms |
| `delayFrames` | Dry delay (host frames), `[0, 1 s]` |
| `outputChannels` | Number of `matrix` rows. 0 means no matrix (engine default mapping) |
| `matrix` | `outputChannels × channelCount`, output-row major — `matrix[o * channelCount + c]`. `NULL` allowed |
| `reserved[6]` | 0 |

If `outputChannels` differs from the current output channel count (stereo 2 · speaker layout N) or `matrix` is `NULL`, the engine default mapping is used.

| Condition | Default mapping |
|---|---|
| Channel count = output count | As is |
| Output 2 | ITU-R BS.775 downmix — 3.0 is read as FL FR FC (FC 0.7071), others as FL FR FC LFE SL SR [BL BR \| BC], with FC, surrounds and backs at 0.7071, LFE 0 (excluded), the BC of 6.1 at 0.5 to both sides, mono at 0.7071 to both sides, and other channel counts even → L · odd → R |
| Otherwise | 1:1 from the front |

The downmix is not normalized (the limiter handles it).

**Returns** — `1` = applied / `0` = failed (`ST_STATUS_VERSION_MISMATCH` · `ST_STATUS_INVALID_ARGUMENT` · `ST_STATUS_NOT_FOUND`).

</details>

<details>
<summary><code>st_rt_speaker_set_get_status</code> — Reads the set's playback state, counters and clocks</summary>

```c
int st_rt_speaker_set_get_status(const STRT_Context* context, STSpeakerSetId set, STSpeakerSetStatus* outStatus);
```

**Purpose** — Returns the set's transport state, ring state, cumulative counters and render clocks for sample-accurate alignment in one call. Use it for supply control (`queuedFrames`), playback position display and sample-accurate sync with video.

**When / how** — Can be called from any thread. All frame fields are host frames (engine frame totals converted once at query time with round-half-up), and counters are cumulative since creation. `state`, `contentFrame`, `renderFrame`, `playRenderFrame` and `playContentFrame` are written together by one render block, so they are mutually consistent within one call. `latencyFrames` reads the output-stage state separately, so it may be off by ±1 block when read from a thread other than the render thread — do sample-accurate alignment with the render clock fields. Thread: `[any]` — does not block.

Sample-accurate alignment: if playback started at `playRenderFrame` and continued without underrun, the content at render position r (on the `renderFrame` axis) is `playContentFrame + (r − playRenderFrame)` (including the 3 ms fade-in). The output sample comes out `latencyFrames` (output stage + limiter) later. The sound's propagation delay (distance/speed of sound) and filter group delay are not included, and if `hostSampleRate` is specified, conversion rounding between the two axes may cause a ±1 frame difference.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `set` | Set handle |
| `outStatus` | Output. The caller fills `structSize` / `apiVersion` |

**Struct** `STSpeakerSetStatus`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetStatus)` / `ST_ABI_VERSION` |
| `state` | `STSpeakerSetState` — `STOPPED`(0) / `PLAYING`(1) / `PAUSED`(2) / `STARTING`(3, waiting after a play request for an IR containing the member sources to be adopted — no content is consumed) |
| `queuedFrames` | Amount queued in the ring |
| `capacityFrames` | Ring capacity actually allocated by the engine |
| `latencyFrames` | Render → output latency: output stage (pull FIFO, buffered ring, output resampler) + limiter |
| `contentFrame` | Relocate reference + amount the renderer has read from the ring |
| `underrunFrames` | Amount filled with silence because the ring was empty during playback |
| `droppedFrames` | Amount discarded because the ring was full |
| `totalWrittenFrames` | Amount that actually entered the ring |
| `renderFrame` | Frames rendered by the context so far (including silent preroll blocks) |
| `playRenderFrame` | Render position of the first sample of the last playback start block. −1 before start |
| `playContentFrame` | Content frame of that sample |
| `appliedSetters` | Number of values `st_rt_speaker_set_update` sent to the engine (position, rotation, gain, listener position, rotation) |
| `skippedSetters` | Number of values not sent because they were bit-identical or omnidirectional rotations |
| `directMix` | Dry share 0..1 (at the end of the previous block). 0 = wet path only |
| `inputDelayFrames` | Upmix window latency (host frames, 0 without upmix) |
| `reserved[4]` | Reserved |

**Returns** — `1` = success / `0` = failed (`NULL`, stamp mismatch, no such set).

</details>

</details>

<details>
<summary><strong>Debug · Visualization</strong> — 9 functions</summary>

<details>
<summary><code>st_rt_debug_get_frame_generation</code> — Reads the propagation frame generation number</summary>

```c
uint64_t st_rt_debug_get_frame_generation(const STRT_Context* context);
```

**Purpose** — A counter for cheaply detecting, by a change in value alone, whether a new propagation result has been produced. Use it in debug visualization to decide whether a new snapshot needs to be fetched each frame.

**When / how** — Can be polled at any time. If the value has changed, call `st_rt_debug_acquire_snapshot` to take a new snapshot. For the generation passed to `st_rt_debug_copy_visual_paths`, use the `frameGeneration` returned by `st_rt_debug_acquire_snapshot`, not this value. Thread: `[any]` — reads a single atomic.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Current generation number. `0` if there is no propagation result yet or `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_debug_set_collect_failed_walks</code> — Sets whether path walks that failed midway are also collected for visualization</summary>

```c
void st_rt_debug_set_collect_failed_walks(STRT_Context* context, int enabled);
```

**Purpose** — Default visualization contains only paths that completed from source to listener. Enabling this option also collects walks that broke off midway, so you can debug "why this path did not connect".

**When / how** — Can be called any time after creation and takes effect from subsequent propagation results. The path kinds to collect are set separately with the mask of `st_rt_debug_set_collect_visual_paths`, and this flag is kept independently of that mask (it does not appear in `st_rt_debug_get_collect_mask`). Failed walks come in with `STVisualPathRecord.valid = 0` and are fetched with `ST_VISUAL_PATH_COPY_ALL` when copying. Disabled by default. Thread: `[control]` — takes the scene write lock; do not call from the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | `0` = off (default) / non-`0` value = on |

**Returns** — None.

</details>

<details>
<summary><code>st_rt_debug_set_collect_visual_paths</code> — Specifies the mask of path kinds collected for visualization</summary>

```c
int st_rt_debug_set_collect_visual_paths(STRT_Context* context, uint32_t mask);
```

**Purpose** — Makes propagation record path geometry so that editor and debug views can draw guide rays, source transport rays, direct and transmission paths, and reflection and diffraction paths as line segments.

**When / how** — Can be called any time after creation and takes effect from subsequent propagation results. Fetch the collected results in the order `st_rt_debug_acquire_snapshot` → `st_rt_debug_copy_visual_paths`. The default mask is `0` (no collection). Support: `ST_CAP_PATH_COLLECTION_MASK`. Thread: `[control]` — takes the scene write lock; do not call from the audio thread.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mask` | Combination of `STPathCollectionFlag` (table below). `0` = collection off. Rejected if it contains undefined bits |

**Enum** `STPathCollectionFlag`

| Value | Name | Collected |
|---|---|---|
| `1u << 0` | `ST_PATH_COLLECTION_GUIDE_RAY` | Guide rays cast from the listener |
| `1u << 1` | `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY` | Source transport rays |
| `1u << 2` | `ST_PATH_COLLECTION_DIRECT_TRANSMISSION` | Direct and transmission paths |
| `1u << 3` | `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION` | Reflection and diffraction paths (grouped into one bit because there are mixed diffraction paths that include reflection segments) |
| OR of the four above | `ST_PATH_COLLECTION_ALL` | All |

**Returns** — `1` = applied / `0` = rejected (`context` is `NULL`, undefined bits in `mask`).

</details>

<details>
<summary><code>st_rt_debug_get_collect_mask</code> — Reads the current path collection mask</summary>

```c
uint32_t st_rt_debug_get_collect_mask(const STRT_Context* context);
```

**Purpose** — Checks the collection mask specified with `st_rt_debug_set_collect_visual_paths`.

**When / how** — Can be called at any time. Whether failed walks are collected (`st_rt_debug_set_collect_failed_walks`) is not included in this value. Thread: `[any]` — reads an atomic copy.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Bit combination of `STPathCollectionFlag`. Default `0`; `0` if `context` is `NULL`.

</details>

<details>
<summary><code>st_rt_debug_acquire_snapshot</code> — Takes the latest propagation diagnostic snapshot and reads its summary</summary>

```c
int st_rt_debug_acquire_snapshot(STRT_Context* context, STPropagationSnapshotInfo* outInfo);
```

**Purpose** — Pins the latest propagation generation for diagnostics and returns that generation's path counts and visualization buffer sizes in one call. All values come from the **same generation**, so path-count statistics and visualization paths never disagree.

**When / how** — To fetch visualization paths, first take a snapshot with this function, prepare buffers using the returned `frameGeneration` and counts, then call `st_rt_debug_copy_visual_paths`. Calling it again switches to a newer generation if one has appeared in the meantime, so copy against the most recently taken generation. Visualization path and point counts are nonzero only when collection is enabled with `st_rt_debug_set_collect_visual_paths`. Thread: `[control]` — takes the diagnostics mutex.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outInfo` | Output. The caller fills `structSize = sizeof(STPropagationSnapshotInfo)` and `apiVersion = ST_ABI_VERSION` |

**Struct** `STPropagationSnapshotInfo`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Stamps filled by the caller |
| `frameGeneration` | Generation of this snapshot. Pass it as is to `st_rt_debug_copy_visual_paths` |
| `collectionMask` | Collection mask used when producing this generation (`STPathCollectionFlag`) |
| `reserved0` | Reserved |
| `visualPathCount` | Total number of visualization paths (including failed walks) |
| `validVisualPathCount` | Number of completed visualization paths. Valid paths occupy the front of the array |
| `visualPointCount` | Total number of visualization points |
| `validVisualPointCount` | Number of points belonging to valid paths. They occupy the front of the array |
| `totalPathCount` | Total number of acoustic paths in this generation |
| `reflectionPathCount` | Number of reflection paths |
| `diffractionPathCount` | Number of diffraction paths |
| `sourceSideOnlyPaths` | Number of diffraction paths with only source-side diffraction edges |
| `unclassifiedPaths` | Number of unclassified diffraction paths (0 in normal operation) |
| `sourceSideEvents` | Number of source-side diffraction events |
| `terminalOnlyPaths` | Number of paths with only listener-side terminal-edge diffraction |
| `sourceAndTerminalPaths` | Number of paths with both source-side and listener-side diffraction |
| `terminalEvents` | Number of listener-side terminal-edge diffraction events |
| `reserved[4]` | Reserved |

**Returns** — `1` = success / `0` = `context` or `outInfo` is `NULL`, stamp mismatch, or no propagation result has been produced yet. On failure `outInfo` is unchanged.

</details>

<details>
<summary><code>st_rt_debug_copy_visual_paths</code> — Copies the visualization paths and points of the held snapshot</summary>

```c
int st_rt_debug_copy_visual_paths(STRT_Context* context, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**Purpose** — Copies path records and vertex arrays into host buffers so a debug view can draw paths as line segments. No audio data passes through this surface (inspection and visualization only).

**When / how** — Call `st_rt_debug_acquire_snapshot` first and prepare buffers with its `frameGeneration` and counts: for `VALID_ONLY`, `validVisualPathCount` paths and `validVisualPointCount` points; for `ALL`, `visualPathCount` and `visualPointCount`. The buffers must hold the entire corresponding set; no partial copy is performed. Each record's `points[pointOffset .. pointOffset + pointCount)` is one path in order. Thread: `[control]` — takes the diagnostics mutex.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `frameGeneration` | Generation returned by `st_rt_debug_acquire_snapshot`. Fails if it differs from the generation of the held snapshot |
| `copyMode` | `STVisualPathCopyMode`: `ST_VISUAL_PATH_COPY_VALID_ONLY`(0) = completed paths only / `ST_VISUAL_PATH_COPY_ALL`(1) = everything including failed walks. Other values fail |
| `outPaths` | Path record output array. May be `NULL` if there are 0 paths to copy |
| `pathCapacity` | Number of elements in `outPaths` |
| `outPoints` | Point output array. May be `NULL` if there are 0 points to copy |
| `pointCapacity` | Number of elements in `outPoints` |

**Struct** `STVisualPathRecord`

| Field | Description |
|---|---|
| `pointOffset` | Index in `outPoints` of this path's first point |
| `pointCount` | Number of points in this path |
| `depth` | Path depth (interaction order) |
| `pathKind` | `STPathKind` (table below) |
| `soundSourceIndex` | Source index. `-1` for guide rays |
| `valid` | `1` = completed / `0` = walk that failed midway |
| `totalLengthMeters` | Total path length (m) |
| `reserved0` | Reserved |

The point order of acoustic paths is source → interaction points → listener; for guide rays it is listener → hit points.

**Enum** `STPathKind`

| Value | Name | Meaning |
|---|---|---|
| `0` | `ST_PATH_GUIDE_RAY` | Guide ray |
| `1` | `ST_PATH_DIRECT` | Direct sound (including transmission) |
| `2` | `ST_PATH_REFLECTION` | Reflection |
| `3` | `ST_PATH_DIFFRACTION_UNKNOWN` | Unclassified diffraction (does not occur in normal operation) |
| `1 << 2` | `ST_PATH_DIFFRACTION_S` | Source-side edge diffraction |
| `1 << 3` | `ST_PATH_DIFFRACTION_L` | Listener-side terminal-edge diffraction |
| `S \| L` | `ST_PATH_DIFFRACTION_SL` | Both source-side and listener-side diffraction |
| `1 << 4` | `ST_PATH_SOURCE_TRANSPORT_RAY` | Source transport ray |

**Struct** `STVisualPoint`

| Field | Description |
|---|---|
| `x`, `y`, `z` | Point coordinates (scene frame) |
| `flags` | `STVisualPointFlag`: `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`(`1u << 0`, diffraction point) |

**Returns** — `1` = success / `0` = failed: `context` is `NULL`, `copyMode` out of range, no snapshot yet, `frameGeneration` differs from the held generation, insufficient buffer capacity (or `NULL` where needed). On a generation mismatch, call `st_rt_debug_acquire_snapshot` again and then copy.

</details>

<details>
<summary><code>st_rt_debug_copy_mesh_accel_nodes</code> — Copies the acceleration structure (BLAS) node boxes of one mesh</summary>

```c
int st_rt_debug_copy_mesh_accel_nodes(STRT_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**Purpose** — Extracts the node bounding boxes of the mesh acceleration structure used by propagation, for visualization. Use it to check how a mesh was partitioned or to overlay BVH boxes in an editor. It only reads the structure propagation uses.

**When / how** — Can be called any time after `st_rt_mesh_create`. The BLAS is built with the `st_rt_scene_set_accel` value at mesh creation time. Usually call first with `outNodes = NULL` to get the node count, allocate a buffer, then call again. Large meshes have thousands of nodes, so for visualization it is common to view only the upper levels with `maxDepth`. If the buffer is too small, only the front of the pre-order sequence (starting from the leftmost branch) is written, so if you want only the upper levels, cut with `maxDepth`. Support: `ST_CAP_ACCEL_DEBUG_NODES`. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Target mesh handle (value returned by `st_rt_mesh_create`) |
| `maxDepth` | `< 0` = all depths. When `0` or greater, counts and writes only nodes with `depth ≤ maxDepth` |
| `outNodes` | Output array. `NULL` makes it a size query (`nodeCapacity` ignored) |
| `nodeCapacity` | Number of elements in `outNodes`. Writes `min(total, nodeCapacity)` nodes from the front |

**Struct** `STAccelNode` (32 bytes, array element without a version stamp)

| Field | Description |
|---|---|
| `boundsMin[3]` | Minimum coordinates of the node box |
| `boundsMax[3]` | Maximum coordinates of the node box |
| `depth` | Depth, root = `0` |
| `primitiveCount` | Leaf: number of contained primitives (≥ 0) / interior node: `-1` |

- **Order**: depth-first pre-order. The root is `[0]`, and each node's parent is the nearest preceding node in the array with `depth − 1` — the tree can be reconstructed without parent indices.
- **Coordinates**: A mesh BLAS is in the vertex frame passed to `st_rt_mesh_create` (mesh-local). To draw at the instance location, the host multiplies by the object transform. There is no `sceneRatio` conversion.
- **Meaning per acceleration structure kind** (kind of `st_rt_scene_set_accel`): The BVH family (`0` BinnedSAH, `2` TinyBVH, `3` LBVH, `4` LBVH_Simd) is the built binary tree, and the boxes of the 4/8-wide traversal representation are a subset of this list. TinyBVH BVH8 leaves hold at most 4 triangles. KD (`1` HybridKD) derives boxes by cutting the root box with split planes, so sibling boxes do not overlap and exactly partition the parent. There may be empty leaves (`primitiveCount = 0`), and triangles spanning several leaves are counted in each leaf.

**Returns** — The **total** number of nodes within `maxDepth` (≥ 0), `-1` on failure (`context` is `NULL`, no such mesh → `ST_STATUS_NOT_FOUND`). A copy truncated by an insufficient buffer also returns the total count and leaves `ST_STATUS_BUFFER_TOO_SMALL` in `st_rt_get_last_status`.

</details>

<details>
<summary><code>st_rt_debug_copy_scene_accel_nodes</code> — Copies the node boxes of the scene top-level acceleration structure (TLAS)</summary>

```c
int st_rt_debug_copy_scene_accel_nodes(STRT_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**Purpose** — Extracts, for visualization, the node boxes of the scene acceleration structure built over object instances. Use it to check how static and dynamic objects are grouped in the scene.

**When / how** — Call it after `st_rt_build`. The static TLAS is the one published by `st_rt_build`, so staged static changes are not visible until the next `st_rt_build`. The dynamic TLAS is republished by dynamic rebuilds. The size query (`outNodes = NULL`), `maxDepth` and truncated-copy conventions are the same as `st_rt_debug_copy_mesh_accel_nodes`. Support: `ST_CAP_ACCEL_DEBUG_NODES`. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `layer` | `STAccelLayer`: `ST_ACCEL_LAYER_STATIC`(0) = static TLAS published by `st_rt_build` / `ST_ACCEL_LAYER_DYNAMIC`(1) = dynamic object TLAS |
| `maxDepth` | `< 0` = all depths. When `0` or greater, only nodes with `depth ≤ maxDepth` |
| `outNodes` | Output array. `NULL` makes it a size query |
| `nodeCapacity` | Number of elements in `outNodes` |

See `st_rt_debug_copy_mesh_accel_nodes` for the `STAccelNode` fields. TLAS coordinates are in the scene (world) frame, and leaf primitives are object instances, not triangles.

**Returns** — Total number of nodes within `maxDepth` (≥ 0). If that TLAS does not exist yet (before build, no objects of that kind) it is `0`, which is not an error. `-1` = failed (`context` is `NULL`, `layer` out of range → `ST_STATUS_INVALID_ARGUMENT`). A truncated copy leaves `ST_STATUS_BUFFER_TOO_SMALL`, as in `st_rt_debug_copy_mesh_accel_nodes`.

</details>

<details>
<summary><code>st_rt_debug_build_mesh_accel_nodes</code> — Builds the BLAS of one mesh without a context and returns its node boxes</summary>

```c
int st_rt_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**Purpose** — Used by a host editor to preview a mesh's acceleration structure before building a scene. It goes through the same input validation and the same build path as `st_rt_mesh_create`, so for the same `accelKind` it produces the same tree as the BLAS a real-time context builds.

**When / how** — Can be called at any time without a context. Every call builds the BLAS anew (cost proportional to mesh size), so the host caches the result. The size query (`outNodes = NULL`), `maxDepth` and pre-order conventions are the same as `st_rt_debug_copy_mesh_accel_nodes`. Support: `ST_CAP_ACCEL_DEBUG_NODES`. Thread: `[any]` — uses no global state (the build cost is borne by the calling thread).

| Parameter | Description |
|---|---|
| `mesh` | Input mesh. `vertices` is xyz interleaved (`numVertices × 3` float), `triangles` is vertex indices (`numTriangles × 3` int) |
| `accelKind` | kind of `st_rt_scene_set_accel`: `0` BinnedSAH / `1` HybridKD / `2` TinyBVH / `3` LBVH / `4` LBVH_Simd. `-1` = engine default (TinyBVH, or the value of the environment variable `SOUNDTRACING_ACCEL` if set) |
| `maxDepth` | `< 0` = all depths. When `0` or greater, only nodes with `depth ≤ maxDepth` |
| `outNodes` | Output array. `NULL` makes it a size query |
| `nodeCapacity` | Number of elements in `outNodes` |

**Struct** `STMesh`

| Field | Description |
|---|---|
| `numVertices` | Vertex count |
| `vertices` | Vertex coordinate array (xyz interleaved) |
| `numTriangles` | Triangle count |
| `triangles` | Triangle vertex index array (3 per triangle) |

See `st_rt_debug_copy_mesh_accel_nodes` for the `STAccelNode` fields and the node order and coordinate conventions. Coordinates are in the input vertex frame as is.

**Returns** — Total number of nodes within `maxDepth` (≥ 0). `-1` = failed (`mesh` or an array is `NULL`, count of 0 or less, non-finite vertex, out-of-range index, invalid `accelKind`, allocation failure). There is no context, so nothing is recorded in `st_rt_get_last_status`.

</details>

</details>

<details>
<summary><strong>Offline (`st_off_*`) — Context · Scene · Source · Listener</strong> — 72 functions</summary>

<details>
<summary><code>st_off_get_api_version</code> — Returns the ABI version of the offline DLL</summary>

```c
uint32_t st_off_get_api_version(void);
```

**Purpose** — Reports which ABI version the loaded `SoundTracingOffline` library was built with. It is the only means of determining whether the header the host compiled against (`ST_ABI_VERSION` in `STTypes.h`) and the DLL use the same struct layout.

**When / how** — Call it once right after loading the library, before creating a context, and compare it with `ST_ABI_VERSION`. If they differ, struct layouts disagree, so stop using it. Also put this value (`ST_ABI_VERSION`) in the `apiVersion` field of every version-stamped struct. Thread: `[any]` — a compile-time constant, callable from any thread without blocking.

**Parameters** — None.

**Returns** — The library's ABI version (compatible only if equal to `ST_ABI_VERSION`).

</details>

<details>
<summary><code>st_off_get_version_string</code> — Returns the product release version string</summary>

```c
const char* st_off_get_version_string(void);
```

**Purpose** — Provides the product release version as a human-readable string for logs and diagnostic screens.

**When / how** — Can be called at any time. Do not use it to determine ABI compatibility — use `st_off_get_api_version` for that. Thread: `[any]` — does not block.

**Parameters** — None.

**Returns** — A static NUL-terminated string owned by the DLL. The caller does not free it.

</details>

<details>
<summary><code>st_off_get_capabilities</code> — Returns capability word 0 (<code>ST_CAP_*</code>)</summary>

```c
uint64_t st_off_get_capabilities(void);
```

**Purpose** — Reports the features this offline library supports as a bitmask. Because features are added optionally to the ABI, the host determines support from these bits, not from the existence of functions.

**When / how** — Read it once at initialization and check by ANDing with `ST_CAP_*` bits. Examples: `ST_CAP_OFFLINE`, `ST_CAP_SCENE_RAYCAST`, `ST_CAP_SOURCE_DIRECTIVITY`, `ST_CAP_SCENE_RATIO`, `ST_CAP_THREAD_ATTRIBUTES`, `ST_CAP_SOURCE_EQ`, etc. The set differs from the realtime DLL — real-time-only bits (`ST_CAP_REALTIME_SINGLE` / `ST_CAP_REALTIME_MULTI`, `ST_CAP_RUNTIME_DELAY_RESIZE`, `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`, `ST_CAP_ENGINE_TIMING`, etc.) are absent and `ST_CAP_OFFLINE_*` bits are present. Builds that include the Exa backend add `ST_CAP_BACKEND_EXA`. Capabilities in word 1 and above (`ST_CAP1_*`) are read with `st_off_get_capability_word` — do not mix bits from different words in an AND. Thread: `[any]` — a compile-time constant.

**Parameters** — None.

**Returns** — Bitwise OR of capability word 0 (same value as `st_off_get_capability_word(0)`).

</details>

<details>
<summary><code>st_off_get_capability_word</code> — Returns capability word n</summary>

```c
uint64_t st_off_get_capability_word(uint32_t word);
```

**Purpose** — Queries, per word, capabilities added after the 64 bits of word 0 were used up. The existence of this function itself is indicated by the `ST_CAP_CAPABILITY_WORDS` bit of word 0.

**When / how** — Read the needed words at initialization and AND only with constants of the same word (`ST_CAP1_*` is word 1). Word 1 of the offline DLL contains `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN`, `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`, `ST_CAP1_OFFLINE_MAX_DELAY`, `ST_CAP1_SOURCE_PARAMETRIC_EQ` and `ST_CAP1_LISTENER_ORIENTATION_Q`. Thread: `[any]` — a compile-time constant.

| Parameter | Description |
|---|---|
| `word` | Word number. `0` = same value as `st_off_get_capabilities()`, `1` = the `ST_CAP1_*` word. The number of words the header knows is `ST_CAPABILITY_WORD_COUNT`; other numbers return `0` |

**Returns** — Bitwise OR of that word. `0` for unknown words (= no such capabilities).

</details>

<details>
<summary><code>st_off_get_sample_rate</code> — Returns the engine sample rate (44100 Hz)</summary>

```c
int st_off_get_sample_rate(void);
```

**Purpose** — Reports the fixed sample rate at which the engine produces IRs and audio. Use it to convert sample counts of offline render results to time, or to decide whether to resample to another rate.

**When / how** — Can be called at any time. The value is fixed at 44100 Hz; if the host uses another rate, resampling is the host's job. Thread: `[any]` — a compile-time constant.

**Parameters** — None.

**Returns** — `44100`.

</details>

<details>
<summary><code>st_off_set_thread_attributes</code> — Specifies priority, core preference and affinity per engine thread type</summary>

```c
int st_off_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**Purpose** — Lets the host set the attributes of engine-created threads **before the threads are created**. It is the surface for fitting engine compute threads into the host's own thread budget and priority policy.

**When / how** — The contract is to call it **before** `st_off_create`. It does not apply to threads already started, only to threads created afterwards (the compute pool of the next `st_off_create`, etc.). The table is **process-global** and independent of contexts, and the realtime and offline DLLs each have their own table — when using both DLLs, put the same values into both `st_rt_set_thread_attributes` and this function. In the offline shell only `ST_THREAD_COMPUTE_POOL` is actually meaningful; other types are only stored and have no thread to apply to (batch workers are not part of `STThreadType`). `affinityMask` and the core preference flags are honored only on Windows and ignored on macOS (the QoS class determines placement). Support: `ST_CAP_THREAD_ATTRIBUTES`. Thread: `[any]` — updates the process-global table once under a mutex.

| Parameter | Description |
|---|---|
| `threadType` | `STThreadType` value, `[0, ST_THREAD_TYPE_COUNT)`. What applies offline is `ST_THREAD_COMPUTE_POOL`(4) — compute pool workers (N of them when `maxComputeThreads` N > 1) |
| `attributes` | Attributes to set. The caller fills `structSize = sizeof(STThreadAttributes)` and `apiVersion = ST_ABI_VERSION`. `NULL` resets that type to defaults |

**Struct** `STThreadAttributes`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)`. Filled by the caller |
| `apiVersion` | `ST_ABI_VERSION`. Filled by the caller |
| `priority` | `STThreadPriority` — `ST_THREAD_PRIORITY_DEFAULT`(0, platform default as is) / `LOW`(1) / `BELOW_NORMAL`(2) / `NORMAL`(3) / `ABOVE_NORMAL`(4) / `HIGH`(5) / `TIME_CRITICAL`(6). On Windows it maps to the thread priority of the same name (LOW→LOWEST, HIGH→HIGHEST); on macOS to QoS classes (LOW→BACKGROUND, BELOW_NORMAL→UTILITY, NORMAL→USER_INITIATED, higher→USER_INTERACTIVE) |
| `flags` | `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` / `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES`. Setting both is rejected. Honored on Windows only |
| `affinityMask` | Logical processor bitmask, `0` = unspecified. Honored on Windows only; on machines with more than 64 processors it is interpreted only within the current processor group |
| `reserved[4]` | Must all be `0` |

**Returns** — `1` = success / `0` = failed: `threadType` out of range, `structSize`/`apiVersion` mismatch, `priority` out of range, conflicting core preference flags, `reserved[]` not 0. It takes no context, so nothing is recorded in `st_off_get_last_status`.

</details>

<details>
<summary><code>st_off_get_thread_attributes</code> — Reads the stored requested thread attributes</summary>

```c
int st_off_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**Purpose** — Checks the values specified with `st_off_set_thread_attributes`.

**When / how** — Can be called at any time. The returned value is the stored **requested value** as is, not what was actually applied to threads. Defaults for unspecified types are `priority` = `ST_THREAD_PRIORITY_DEFAULT` · `flags` = 0 · `affinityMask` = 0. Thread: `[any]` — reads the process-global table once under a mutex.

| Parameter | Description |
|---|---|
| `threadType` | `STThreadType` value, `[0, ST_THREAD_TYPE_COUNT)` |
| `outAttributes` | Struct to receive the result. The caller fills `structSize`/`apiVersion`. See `st_off_set_thread_attributes` for the fields |

**Returns** — `1` = success / `0` = rejected (`outAttributes` is `NULL`, stamp mismatch, `threadType` out of range).

</details>

<details>
<summary><code>st_off_get_thread_inventory</code> — Reads the number of threads this context started, per type</summary>

```c
int st_off_get_thread_inventory(const STOFF_Context* context, STThreadInventory* outInventory);
```

**Purpose** — Reports, as per-type counts, how many threads the context actually occupies right now. The aim is to let the host set its thread budget from measurements rather than guesses.

**When / how** — Call it any time after creating the context. The offline shell has no propagation lane, audio render, device or file decoder threads, so the only slot with a value is `ST_THREAD_COMPUTE_POOL` — N when `maxComputeThreads` N > 1, and 0 when it is 1 (inline execution on the calling thread). `ST_THREAD_ACCEL_BUILD` is a reserved role and is 0. Each per-type value is an independent atomic, so they are not a snapshot of the same instant. Support: `ST_CAP_THREAD_INVENTORY`. Thread: `[any]` — reads only atomic counters and does not block.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outInventory` | Struct to receive the result. The caller fills `structSize = sizeof(STThreadInventory)` and `apiVersion = ST_ABI_VERSION` |

**Struct** `STThreadInventory`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STThreadInventory)`. Filled by the caller |
| `apiVersion` | `ST_ABI_VERSION`. Filled by the caller |
| `countByRole[ST_THREAD_TYPE_COUNT]` | Thread count per type in `STThreadType` order (index = type). Offline, only `[ST_THREAD_COMPUTE_POOL]` can be nonzero |
| `reserved[5]` | Reserved |

**Returns** — `1` = success / `0` = `context` or `outInventory` is `NULL`, or stamp mismatch (`ST_STATUS_VERSION_MISMATCH` in `st_off_get_last_status`).

</details>

<details>
<summary><code>st_off_init_create_options</code> — Fills <code>STOFF_CreateOptions</code> with defaults</summary>

```c
void st_off_init_create_options(STOFF_CreateOptions* outOptions);
```

**Purpose** — Initializes the context creation options with the version stamp and defaults. The aim is to let the host overwrite only the fields it wants to change and get engine defaults for the rest.

**When / how** — Call it right before `st_off_create`. It zeroes the whole struct and then fills `structSize` and `apiVersion`, so all fields for which 0 means "default" get their defaults. Then change only the fields you need (`maxComputeThreads`, `sceneRatio`, etc.) and pass it to `st_off_create`. Thread: `[any]` — fills only a caller-owned POD.

| Parameter | Description |
|---|---|
| `outOptions` | Struct to fill. Does nothing if `NULL` |

**Struct** `STOFF_CreateOptions`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STOFF_CreateOptions)`. Filled by this function |
| `apiVersion` | `ST_ABI_VERSION`. Filled by this function |
| `seedValue` | Default `0`. Has no effect on the output of the default (ST) backend — a field kept for ABI compatibility and the Exa backend |
| `maxComputeThreads` | Upper limit of compute threads used by the context. `0` = auto = min(performance cores, 6), minimum 1. This value becomes the width of the engine-owned shared compute pool, and in the offline shell it is all the threads the context creates — `1` means 0 pool threads (all computation inline on the calling thread), N > 1 means N compute pool workers. Environment variables have no influence. Batch workers are owned not by the context but by the batch object created by `st_off_batch_create`. Support: `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | Scene unit → meter conversion factor. `0` = default = `1.0` (scene units are meters). Centimeter hosts use `0.01f`, feet hosts `0.3048f`. **Initialization only**, so there is no runtime setter. Pass coordinates in scene units as is; the engine multiplies by this factor only where meters are needed, such as propagation delay, distance attenuation, air absorption, reverb descriptors and `...Meters` output fields. Non-finite values or values of 0 or less (excluding 0) are rejected by `st_off_create`. Support: `ST_CAP_SCENE_RATIO` |
| `backend` | `STBackend` — `ST_BACKEND_ST`(0, default) / `ST_BACKEND_EXA`(1). Selects the whole pipeline at creation; there is no runtime switching. Exa can be used only when the library advertises `ST_CAP_BACKEND_EXA` |
| `reserved[5]` | Reserved. Leave as 0 |

The offline options have no fields corresponding to the real-time `scheduler`, `maxDelaySeconds`, `renderOutputMode`, `hostSampleRate`, `startIdle` or `maxSources` — the calling thread drives the pipeline without a scheduler, and there is no device, streaming or source budget. Set the render delay ring length after creation with `st_off_render_set_max_delay_seconds` (default 4.0 s).

**Returns** — None.

</details>

<details>
<summary><code>st_off_create</code> — Creates an offline context</summary>

```c
STStatus st_off_create(const STOFF_CreateOptions* options, STOFF_Context** outContext);
```

**Purpose** — Creates an offline engine instance (owning the scene, materials, sources, listeners and IR cache) and its compute pool. An offline context has no device, audio render or propagation worker threads; it is for producing deterministic IRs by having the calling thread run propagation once with `st_off_ir_compute`.

**When / how** — If needed, call `st_off_set_thread_attributes` first, initialize the options with `st_off_init_create_options`, then call it. State right after success: one listener is created automatically and is active (id `1`, position (0,0,0), identity orientation), and the IR cache is empty, so render functions fail with `ST_STATUS_UNAVAILABLE` before `st_off_ir_compute`. The triangle intersection kernel is `0` (MollerTrumbore), the early spatial mode is `ST_EARLY_SPATIAL_OBJECTS`, the render delay ring is 4.0 s, and the other defaults (atmosphere, distance attenuation, energy target, path kinds, acoustic features, source defaults) are the same as real time. For **different** contexts, `st_off_create`/`st_off_destroy` may be called concurrently from multiple threads and may overlap with compute, render and batch work of other contexts (the Exa backend must not run compute concurrently, even on different contexts). Read the failure reason string with `st_off_get_last_error(NULL, ...)` on the same thread. Thread: `[control, blocking]` — a long section that creates the engine and the compute pool.

| Parameter | Description |
|---|---|
| `options` | Creation options. `NULL` uses the defaults of `st_off_init_create_options`. See `st_off_init_create_options` for the fields |
| `outContext` | Pointer to receive the created context. Set to `NULL` on failure |

**Returns** — `STStatus`: `ST_STATUS_OK` = success / `ST_STATUS_INVALID_ARGUMENT` = `outContext` is `NULL`, unknown `backend` or one not in this build, invalid `sceneRatio` / `ST_STATUS_VERSION_MISMATCH` = `structSize` or `apiVersion` mismatch / `ST_STATUS_INITIALIZATION_FAILED` = engine initialization failure / `ST_STATUS_ALLOCATION_FAILED` = memory allocation failure.

</details>

<details>
<summary><code>st_off_get_backend</code> — Returns the backend the context uses</summary>

```c
int st_off_get_backend(const STOFF_Context* context);
```

**Purpose** — Checks the pipeline chosen with `STOFF_CreateOptions.backend` at creation.

**When / how** — Call it any time after creation. The backend is fixed at creation and cannot be changed at runtime. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `STBackend` value (`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1). `-1` if `context` is `NULL`.

</details>

<details>
<summary><code>st_off_destroy</code> — Destroys an offline context</summary>

```c
void st_off_destroy(STOFF_Context* context);
```

**Purpose** — Releases the context and its engine, compute pool and IR cache.

**When / how** — Call it after all other calls on that context have finished. Other threads must not use a context that is being or has been destroyed. Destroy a context registered with a batch (`st_off_batch_*`) only after receiving its work's completion record with `st_off_batch_poll`. This function joins only that context's compute pool workers (if `maxComputeThreads` is 1 there are no threads to join). For different contexts it may be called concurrently from multiple threads. Thread: `[control, blocking]`.

| Parameter | Description |
|---|---|
| `context` | Handle of the context to destroy |

**Returns** — None.

</details>

<details>
<summary><code>st_off_get_last_status</code> — Reads the status code of the last call</summary>

```c
STStatus st_off_get_last_status(const STOFF_Context* context);
```

**Purpose** — Checks, as a status code, why a function that only returns `0`/`-1`/a failure handle failed.

**When / how** — Call it on the same thread right after the call that returned failure. There is one diagnostic field per context, so values may mix if the same context is used concurrently from multiple threads. For a human-readable message use `st_off_get_last_error`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `STStatus`: `ST_STATUS_OK`(0) / `INVALID_CONTEXT`(1) / `INVALID_ARGUMENT`(2) / `VERSION_MISMATCH`(3) / `INITIALIZATION_FAILED`(4) / `ALLOCATION_FAILED`(5) / `NOT_FOUND`(6) / `BUFFER_TOO_SMALL`(7) / `INVALID_MATERIAL`(8) / `STALE_SNAPSHOT`(9) / `UNAVAILABLE`(10). `ST_STATUS_INVALID_CONTEXT` if `context` is `NULL`.

</details>

<details>
<summary><code>st_off_get_last_error</code> — Copies the last error message</summary>

```c
int st_off_get_last_error(const STOFF_Context* context, char* outMessage, int capacity);
```

**Purpose** — Gets a human-readable description of the last failure (e.g. the validator's rejection reason). Passing `context` as `NULL` gives the reason for an `st_off_create` failure — since there is no context in that case.

**When / how** — Call it on the same thread right after the failure. With a `NULL` context it returns the message of the last failed `st_off_create` on this calling thread, and the next create clears it. If you do not know the required size, call first with `outMessage = NULL` to get the length. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle. `NULL` gives this thread's last create failure message |
| `outMessage` | Buffer to receive the message. `NULL` copies nothing and only returns the length |
| `capacity` | Byte size of `outMessage`. If insufficient, truncates and NUL-terminates |

**Returns** — Number of bytes needed to hold the whole message (including NUL). If the return value is greater than `capacity`, it was truncated.

</details>

<details>
<summary><code>st_off_material_create</code> — Registers one acoustic material</summary>

```c
STMaterialId st_off_material_create(STOFF_Context* context, const STMaterial* material);
```

**Purpose** — Registers a 9-band acoustic material (reflection, absorption, transmission, scattering) for mesh surfaces and returns a handle. Material coefficients are strict inputs the engine does not correct, so they are validated at registration and invalid values are rejected immediately.

**When / how** — Register all needed materials before creating meshes, and use the returned handles as the `material` (or per-triangle material indices) of `st_off_mesh_create`. Register multiple materials by calling this function repeatedly; returned ids are consecutive in registration order. Same contract as real-time `st_rt_material_create`. Thread: `[control]` — takes the scene write lock and may block briefly.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `material` | Material to register. The caller fills `structSize`/`apiVersion` |

**Struct** `STMaterial`

| Field | Description |
|---|---|
| `structSize` | `sizeof(STMaterial)`. Validated before reading the coefficients |
| `apiVersion` | `ST_ABI_VERSION` |
| `reflection[ST_FREQUENCY_BANDS]` | Per-band reflected energy ratio, `[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | Per-band absorbed energy ratio, `[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | Per-band transmitted energy ratio, `[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | Diffuse fraction of the reflected energy, `[0, 1]`. Excluded from the R+A+T sum check |
| `reserved[8]` | Reserved |

The band order is 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz (`ST_FREQUENCY_BANDS` = 9). All coefficients are dimensionless ratios in the **energy domain**, and each band must satisfy `|R + A + T − 1| ≤ ST_MATERIAL_ENERGY_BALANCE_TOLERANCE` (0.001). The engine does not derive, normalize, clamp or interpolate values.

**Returns** — Material handle `STMaterialId`. Failure is `v < 0`: `ST_STATUS_INVALID_ARGUMENT` if `context` or `material` is `NULL`, `ST_STATUS_INVALID_MATERIAL` if coefficient validation fails (`ST_STATUS_VERSION_MISMATCH` for a stamp mismatch) is recorded in `st_off_get_last_status`, and the reason is read with `st_off_get_last_error`.

</details>

<details>
<summary><code>st_off_material_load_defaults</code> — Registers the whole default material library</summary>

```c
STMaterialId st_off_material_load_defaults(STOFF_Context* context);
```

**Purpose** — Registers the engine's built-in default material set in one call, so a scene can be built without preparing material coefficients yourself.

**When / how** — Call it before creating meshes. The returned handle is the first material of the set, and the following materials are consecutive in the order `v+1`, `v+2` …. Same contract as real-time `st_rt_material_load_defaults`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Handle of the first material, `STMaterialId`. Failure is `v < 0`.

</details>

<details>
<summary><code>st_off_scene_set_edge_split_collinear_overlaps</code> — Enables or disables a mesh edge topology compile option</summary>

```c
void st_off_scene_set_edge_split_collinear_overlaps(STOFF_Context* context, int enabled);
```

**Purpose** — A scene build option that determines whether, when `st_off_mesh_create` compiles a mesh's acoustic edge (diffraction candidate) topology, edges overlapping on one straight line are split and handled separately.

**When / how** — Call it before creating meshes. It applies only to meshes added after this call; meshes already created keep the topology compiled at creation. Support: `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`. Same contract as real-time `st_rt_scene_set_edge_split_collinear_overlaps`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | `0` = off / otherwise = on |

**Returns** — None.

</details>

<details>
<summary><code>st_off_scene_set_solid_wedge_gate</code> — Enables or disables angular-range rejection for two-face diffraction wedges</summary>

```c
void st_off_scene_set_solid_wedge_gate(STOFF_Context* context, int enabled);
```

**Purpose** — A gate that, when validating diffraction paths, rejects paths passing through the solid-side angular range of a wedge formed by two faces. Disabled by default.

**When / how** — It is an option applied at propagation time, so set it before `st_off_ir_compute`. When enabled, mesh winding (the normal sign given by triangle vertex order) is used to decide whether a wedge is convex or concave, so flipping the winding inverts the set of rejected diffraction paths — keep winding consistent within a mesh and, where possible, have normals face the air side. Support: `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`. Same contract as real-time `st_rt_scene_set_solid_wedge_gate`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `enabled` | `0` = off (default) / otherwise = on |

**Returns** — None.

</details>

<details>
<summary><code>st_off_scene_set_accel</code> — Chooses the mesh and static acceleration structure kind</summary>

```c
int st_off_scene_set_accel(STOFF_Context* context, int kind);
```

**Purpose** — Lets the host choose the implementation of the BLAS and static acceleration structure used for ray intersection. Allows switching and comparing structures according to scene size or build-time vs. query-speed priorities.

**When / how** — Call it before adding objects. It applies only to subsequent builds. Default is `2` (TinyBVH). Exactly the same contract as real-time `st_rt_scene_set_accel`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH (default) / `3` = LBVH / `4` = LBVH_Simd |

**Returns** — `1` = applied / `0` = `kind` out of range or no context.

</details>

<details>
<summary><code>st_off_scene_set_triangle_intersection</code> — Chooses the triangle intersection kernel</summary>

```c
int st_off_scene_set_triangle_intersection(STOFF_Context* context, int kind);
```

**Purpose** — Chooses the ray–triangle intersection method. The default is MollerTrumbore, the same as real time, so offline produces the same geometry statistics as real time.

**When / how** — The kernel is fixed to a mesh at `st_off_mesh_create` time, so it applies **only to meshes added after this call** (not retroactive to existing meshes; meshes with different kernels are a valid configuration). Usually call it once before creating meshes. All three kernels are double-sided with no backface culling. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `kind` | `0` = MollerTrumbore (default) / `1` = PluckerAdaptive / `2` = Watertight |

**Returns** — `1` = applied / `0` = invalid `kind` or no context.

</details>

<details>
<summary><code>st_off_scene_get_triangle_intersection</code> — Reads the intersection kernel that will apply to the next mesh</summary>

```c
int st_off_scene_get_triangle_intersection(const STOFF_Context* context);
```

**Purpose** — Checks the value specified with `st_off_scene_set_triangle_intersection`.

**When / how** — Can be called at any time. The value is the kernel **that will apply to the next `st_off_mesh_create`** and may differ from the kernels of meshes already created. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight.

</details>

<details>
<summary><code>st_off_scene_raycast</code> — Queries the nearest hit with the engine acceleration structure</summary>

```c
int st_off_scene_raycast(STOFF_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**Purpose** — Casts a single ray into the very acceleration structure propagation uses (static + dynamic TLAS) and returns the nearest hit. Lets the host check and debug the acoustic geometry the engine actually sees, separately from its own physics engine.

**When / how** — Call it after `st_off_build`. Before a build it is a miss without error. A read-only query that does not change pipeline state. Support: `ST_CAP_SCENE_RAYCAST`. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `origin` | Ray origin, 3 world-coordinate components (scene units). Must be finite |
| `direction` | 3 ray direction components. Normalized by the engine; must be finite and not a zero vector |
| `maxDistanceMeters` | Maximum distance (meters). Converted back to scene units with `sceneRatio`. `≤ 0` or a non-finite value = infinite |
| `outHit` | Result. The caller fills `structSize = sizeof(STRayHit)` and `apiVersion = ST_ABI_VERSION` |

**Struct** `STRayHit`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Filled by the caller |
| `hit` | `1` = hit / `0` = miss |
| `distanceMeters` | Distance from the origin to the hit point (scene distance × `sceneRatio`). 0 on a miss |
| `point[3]` | Hit point, in scene coordinates as is. 0 on a miss |
| `normal[3]` | Unit geometric normal of the hit triangle. Always oriented to face the ray origin (winding sign is not preserved); 0 on a miss |
| `objectId` | Id of the hit object. `-1` on a miss |
| `meshId` | Mesh id of that object. `-1` on a miss |
| `triangleIndex` | Mesh-local triangle index. `-1` on a miss |
| `materialIndex` | Material index of that triangle. `-1` on a miss |
| `reserved[6]` | Reserved |

`0` is a valid id, so always detect a miss with `hit` (or by whether the id is `-1`).

**Returns** — `1` = call succeeded (whether it hit is in `outHit->hit`; a miss is not a failure) / `0` = `context` or a pointer is `NULL`, stamp mismatch (`ST_STATUS_VERSION_MISMATCH`), `origin` or `direction` non-finite, or `direction` is a zero vector (`ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_mesh_create</code> — Registers a triangle mesh</summary>

```c
STMeshId st_off_mesh_create(STOFF_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**Purpose** — Registers a triangle mesh to use as acoustic geometry. At registration it compiles the acoustic edge topology for diffraction and fixes the intersection kernel. A mesh by itself is not placed in the scene; it participates in propagation only once an instance is created with `st_off_object_create`.

**When / how** — Call it after registering materials and, if needed, setting `st_off_scene_set_triangle_intersection` and `st_off_scene_set_edge_split_collinear_overlaps`. Materials are specified in one of two ways — if `triangleMaterialIndices` is `NULL` the whole mesh uses a single `material`; if not `NULL`, a material index is given per triangle and the `material` argument is ignored (support: `ST_CAP_PER_TRIANGLE_MATERIALS`). Keep winding consistent within a mesh — partially flipped winding can lose the diffraction edges of zero-thickness plates. Exactly the same contract as real-time `st_rt_mesh_create`. Thread: `[control, blocking]` — acoustic edge topology compilation can take long, proportional to mesh size.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Mesh data. Read by the engine during the call |
| `material` | Material handle for the whole mesh (used only when `triangleMaterialIndices == NULL`) |
| `triangleMaterialIndices` | Per-triangle material index array (`mesh->numTriangles` entries, the `v` values of material handles). `NULL` uses the single `material` |

**Struct** `STMesh`

| Field | Description |
|---|---|
| `numVertices` | Vertex count (> 0) |
| `vertices` | Vertex array of consecutive xyz (`numVertices × 3` float), mesh-local coordinates (scene units) |
| `numTriangles` | Triangle count (> 0) |
| `triangles` | Vertex index array (`numTriangles × 3` int) |

**Returns** — Mesh handle `STMeshId`. Failure is `v < 0` (context, `mesh` or an array is `NULL`, vertex or triangle count of 0 or less, etc.).

</details>

<details>
<summary><code>st_off_object_create</code> — Places a mesh instance in the scene with a matrix transform</summary>

```c
STObjectId st_off_object_create(STOFF_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**Purpose** — Places a registered mesh in the scene with a world transform so it participates in propagation. Several objects can share the same mesh.

**When / how** — Call it after `st_off_mesh_create` and before `st_off_build`. Static objects (`isDynamic = 0`) go into the static acceleration structure and dynamic objects into the dynamic TLAS; move them with `st_off_object_set_transform*` and then update with `st_off_build_dynamic`. To place with a quaternion, use `st_off_object_create_q`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Mesh handle returned by `st_off_mesh_create` |
| `transform` | Mesh-local → world transform |
| `isDynamic` | `0` = static / otherwise = dynamic |

**Struct** `STTransform`

| Field | Description |
|---|---|
| `m00, m01, m02` / `m10, m11, m12` / `m20, m21, m22` | 3×3 rotation and scale, row-major |
| `tx, ty, tz` | Translation (scene units) |

Points are multiplied as column vectors: `x' = m00·x + m01·y + m02·z + tx`, `y' = m10·x + m11·y + m12·z + ty`, `z' = m20·x + m21·y + m22·z + tz`. Non-uniform scale and transforms with a negative determinant (mirroring, negative scale) are also accepted.

**Returns** — Object handle `STObjectId`. Failure is `v < 0`.

</details>

<details>
<summary><code>st_off_object_create_q</code> — Places a mesh instance in the scene with position, quaternion and scale</summary>

```c
STObjectId st_off_object_create_q(STOFF_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**Purpose** — The quaternion version of `st_off_object_create`. Lets you pass a game engine's TRS (position, rotation, scale) representation as is, without converting it to a matrix.

**When / how** — Same as `st_off_object_create` (before `st_off_build`; if dynamic, `st_off_build_dynamic` afterwards). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Mesh handle |
| `position` | Position xyz (scene units) |
| `quatXYZW` | Local → world rotation quaternion, **XYZW order**. Normalized by the engine; replaced with identity if `norm < 1e-12` |
| `scale` | Per-axis scale xyz. Composed as R·S; non-uniform is allowed |
| `isDynamic` | `0` = static / otherwise = dynamic |

**Returns** — Object handle `STObjectId`. Failure is `v < 0`.

</details>

<details>
<summary><code>st_off_source_create</code> — Creates a source</summary>

```c
STSourceId st_off_source_create(STOFF_Context* context, const STSourceDesc* source);
```

**Purpose** — Adds a source to the scene for which IRs are computed. Sources in an offline context take no audio input (file, stream); paired with listeners, they are the targets of IR computation and rendering. Unlike real time, there is no source count budget.

**When / how** — Create it after building the scene and before `st_off_ir_compute`. The state right after creation is the same as real time — source energy 1.0, all 4 path volumes 1.0, no directivity table, orientation a roll-free rotation aligned to `direction`, 0 transport update tiers. Afterwards change position, direction, ray count, depth, EQ, directivity, etc. with `st_off_source_set_*`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source descriptor. All values must be finite and `intensity ≥ 0` |

**Struct** `STSourceDesc`

| Field | Description |
|---|---|
| `positionX, positionY, positionZ` | Position (scene units) |
| `directionX, directionY, directionZ` | Front direction. A roll-free source frame matching this direction is created |
| `velocityX, velocityY, velocityZ` | Velocity (scene units/s). Converted to m/s with `sceneRatio` and used for the Doppler radiation gain (`st_off_set_doppler_gain_mode`) |
| `intensity` | Dimensionless linear **pressure** gain (≥ 0). Not acoustic intensity (W/m²), SPL or Pa. A separate energy scale is `st_off_source_set_energy` |
| `directional` | `0` = omnidirectional (onAxis = offAxis = 1) / otherwise = directional profile (onAxis = 1, offAxis = 0) |
| `isDynamic` | `1` = dynamic / `0` = static. Offline, the transport of static sources is baked once per computation and fixed, while dynamic sources are fully retraced every computation |

**Returns** — Source handle `STSourceId`. Failure is `v < 0` (`NULL`, non-finite values and negative `intensity` give `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_listener_create</code> — Creates an additional listener</summary>

```c
STListenerId st_off_listener_create(STOFF_Context* context);
```

**Purpose** — An offline context can have multiple listeners. This is for getting IRs at several listening positions in one scene with a single `st_off_ir_compute`. An offline-only function not present in the realtime DLL.

**When / how** — Creating a context automatically creates one listener (id `1`), which is active. Call this function for each additional listening position. A new listener does not automatically become active — the listener position and orientation setters (`st_off_listener_set_position`, etc.) apply to the **active listener**, so switch with `st_off_listener_set_active` and then set the pose. IR computation is performed for every registered listener, and the render and raw IR query functions take a listener handle as an argument. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — New listener handle `STListenerId`. Failure is `v < 0`.

</details>

<details>
<summary><code>st_off_listener_set_active</code> — Changes the active listener</summary>

```c
void st_off_listener_set_active(STOFF_Context* context, STListenerId listener);
```

**Purpose** — Chooses which listener the listener pose setters (`st_off_listener_set_position` · `_set_rotation` · `_set_orientation_q` · `_set_rotation_ypr`) apply to.

**When / how** — When using multiple listeners, call it right before setting each listener's pose. A nonexistent listener handle changes nothing. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `listener` | Handle of the listener to make active |

**Returns** — None. Check whether it switched with `st_off_listener_get_active`.

</details>

<details>
<summary><code>st_off_listener_get_active</code> — Reads the current active listener</summary>

```c
STListenerId st_off_listener_get_active(const STOFF_Context* context);
```

**Purpose** — Checks which listener the pose setters currently target.

**When / how** — Can be called at any time. Right after creation the value is the automatically created listener `1`. Thread: `[any]` — an atomic read.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Active listener handle. `v = -1` if `context` is `NULL`.

</details>

<details>
<summary><code>st_off_listener_destroy</code> — Destroys a listener</summary>

```c
int st_off_listener_destroy(STOFF_Context* context, STListenerId listener);
```

**Purpose** — Removes a listening position that no longer needs to be computed, reducing the cost of the next computation.

**When / how** — The active listener cannot be destroyed — first switch to another listener with `st_off_listener_set_active`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `listener` | Handle of the listener to destroy |

**Returns** — `1` = removed / `0` = no context, no such listener, or the active listener.

</details>

<details>
<summary><code>st_off_source_set_position</code> — Changes the source position</summary>

```c
void st_off_source_set_position(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**Purpose** — Moves the source.

**When / how** — Call it before `st_off_ir_compute`. The change is reflected in the next computation. Unlike real time there is no motion queue; it is applied to the scene immediately. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `x`, `y`, `z` | World position (scene units) |

**Returns** — None.

</details>

<details>
<summary><code>st_off_source_set_direction</code> — Changes the source front direction</summary>

```c
void st_off_source_set_direction(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**Purpose** — Rotates the front of a directional source (cone or directivity table).

**When / how** — Synchronized both ways with the source frame (`st_off_source_set_orientation_q`) — calling this function sets the frame to "the minimal roll-free rotation from +Z to this direction". If roll is needed, use `st_off_source_set_orientation_q` instead. The change is reflected in the next `st_off_ir_compute`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `x`, `y`, `z` | World direction vector |

**Returns** — None.

</details>

<details>
<summary><code>st_off_listener_set_position</code> — Changes the position of the active listener</summary>

```c
void st_off_listener_set_position(STOFF_Context* context, float x, float y, float z);
```

**Purpose** — Sets the listening position.

**When / how** — Applies to the **active listener** (for multiple listeners, switch with `st_off_listener_set_active` while setting). Orientation is kept. The change is reflected in the next `st_off_ir_compute`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `x`, `y`, `z` | World position (scene units) |

**Returns** — None.

</details>

<details>
<summary><code>st_off_listener_set_rotation</code> — Sets the active listener's orientation with yaw and pitch</summary>

```c
void st_off_listener_set_rotation(STOFF_Context* context, float yaw, float pitch);
```

**Purpose** — Sets the listener head orientation used as the reference by binaural and spatialized rendering.

**When / how** — Applies to the active listener. The rotation is R = Ry(yaw)·Rx(pitch); with yaw = pitch = 0, forward = +Z, up = +Y, right = +X. forward = (sin(yaw)·cos(pitch), −sin(pitch), cos(yaw)·cos(pitch)). To derive them from a direction vector d: `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`. Roll cannot be expressed — if needed, use `st_off_listener_set_rotation_ypr` or `st_off_listener_set_orientation_q`. Among the three listener orientation setters, the last one called wins. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `yaw` | Radians. Positive = clockwise viewed from above (turns right) |
| `pitch` | Radians. Positive = looks down |

**Returns** — None.

</details>

<details>
<summary><code>st_off_listener_set_orientation_q</code> — Sets the active listener's orientation with a quaternion</summary>

```c
int st_off_listener_set_orientation_q(STOFF_Context* context, const float quatXYZW[4]);
```

**Purpose** — Passes the listener orientation, including roll (head tilt), as the game engine's quaternion as is.

**When / how** — Applies to the active listener. The local axes are forward = +Z · up = +Y · right = +X, with the same order and validation as the source `orientation_q`. The yaw/pitch representation corresponds to the roll-0 case q = q_y(yaw)·q_x(pitch). Among the three listener orientation setters, the last one called wins. Support: `ST_CAP1_LISTENER_ORIENTATION_Q` in word 1. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `quatXYZW` | Local → world unit quaternion, **XYZW order**. Normalized by the engine |

**Returns** — `1` = success / `0` = failed. Non-finite components or degeneracy (`norm < 1e-12`) give `ST_STATUS_INVALID_ARGUMENT` and change nothing.

</details>

<details>
<summary><code>st_off_listener_set_rotation_ypr</code> — Sets the active listener's orientation with yaw, pitch and roll</summary>

```c
int st_off_listener_set_rotation_ypr(STOFF_Context* context, float yaw, float pitch, float roll);
```

**Purpose** — The Euler version of `st_off_listener_set_rotation` with roll added.

**When / how** — Applies to the active listener. The rotation is R = Ry(yaw)·Rx(pitch)·Rz(roll), the same order as Unity `Quaternion.Euler(pitch, yaw, roll)` (degrees → radians). With `roll = 0` it is the same matrix as `st_off_listener_set_rotation(yaw, pitch)`. Among the three listener orientation setters, the last one called wins. Support: `ST_CAP1_LISTENER_ORIENTATION_Q`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `yaw` | Radians. Positive = turns right |
| `pitch` | Radians. Positive = looks down |
| `roll` | Radians. Positive = the right axis tilts up (head tilts left, right ear rises) |

**Returns** — `1` = success / `0` = failed. Non-finite values give `ST_STATUS_INVALID_ARGUMENT` and change nothing.

</details>

<details>
<summary><code>st_off_object_set_transform</code> — Changes an object's transform with a matrix</summary>

```c
void st_off_object_set_transform(STOFF_Context* context, STObjectId object, const STTransform* transform);
```

**Purpose** — Moves, rotates or scales a placed object.

**When / how** — After the change, apply it to the acceleration structure so the next computation uses it — `st_off_build_dynamic` (dynamic TLAS refit) for dynamic objects, `st_off_build` (full build) for static objects. The quaternion variant is `st_off_object_set_transform_q`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `object` | Object handle |
| `transform` | New local → world transform. See `st_off_object_create` for the `STTransform` fields |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_object_set_transform_q</code> — Changes an object's transform with position, quaternion and scale</summary>

```c
void st_off_object_set_transform_q(STOFF_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**Purpose** — Quaternion variant of `st_off_object_set_transform`. Same contract as the real-time `st_rt_object_set_transform_q`.

**When / how** — Same as `st_off_object_set_transform` (followed by `st_off_build_dynamic` or `st_off_build`). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `object` | Object handle |
| `position` | Position xyz (scene units) |
| `quatXYZW` | Rotation quaternion, **XYZW order**. The engine normalizes it |
| `scale` | Per-axis scale xyz (non-uniform allowed) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_source_destroy</code> — Deletes a source</summary>

```c
int st_off_source_destroy(STOFF_Context* context, STSourceId source);
```

**Purpose** — Removes a source from the scene. Per-source settings such as the source EQ are removed with it.

**When / how** — From the next `st_off_ir_compute` on, the source is no longer computed. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |

**Returns** — `1` = removed / `0` = no context or unknown source.

</details>

<details>
<summary><code>st_off_mesh_destroy</code> — Deletes a mesh</summary>

```c
int st_off_mesh_destroy(STOFF_Context* context, STMeshId mesh);
```

**Purpose** — Removes a registered mesh.

**When / how** — After changing the scene composition, rebuild the acceleration structure with `st_off_build`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Mesh handle |

**Returns** — `1` = removed / `0` = no context or removal failed.

</details>

<details>
<summary><code>st_off_object_destroy</code> — Deletes an object</summary>

```c
int st_off_object_destroy(STOFF_Context* context, STObjectId object);
```

**Purpose** — Removes a placed mesh instance from the scene.

**When / how** — After changing the scene composition, rebuild the acceleration structure with `st_off_build`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `object` | Object handle |

**Returns** — `1` = removed / `0` = no context or unknown object.

</details>

<details>
<summary><code>st_off_mesh_set_material</code> — Changes a mesh's material</summary>

```c
int st_off_mesh_set_material(STOFF_Context* context, STMeshId mesh, STMaterialId material);
```

**Purpose** — Replaces only the mesh's material without re-registering the geometry. Use it for material A/B comparisons.

**When / how** — The change takes effect at the next `st_off_ir_compute`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mesh` | Mesh handle |
| `material` | New material handle |

**Returns** — `1` = success / `0` = no context, unknown mesh or material.

</details>

<details>
<summary><code>st_off_source_set_ray_count</code> — Sets the size of a source's transport ray grid</summary>

```c
void st_off_source_set_ray_count(STOFF_Context* context, STSourceId source, int width, int height);
```

**Purpose** — Sets the number of diffuse transport rays cast from the source. The ray count N = `width × height`; raising it stabilizes the statistics of the reverb and diffuse components at the cost of more computation.

**When / how** — Call it per source before `st_off_ir_compute`. The default is 16 × 8. An unacceptable value leaves the setting unchanged and records `ST_STATUS_INVALID_ARGUMENT` in `st_off_get_last_status`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `width` | Horizontal ray count of the grid (default 16) |
| `height` | Vertical ray count of the grid (default 8) |

**Returns** — Nothing. Check failures with `st_off_get_last_status`.

</details>

<details>
<summary><code>st_off_source_set_depth</code> — Sets the per-source maximum reflection depth</summary>

```c
void st_off_source_set_depth(STOFF_Context* context, STSourceId source, int depth);
```

**Purpose** — Sets the cap on the reflection order traced from this source, separately per source. Use it to distribute cost by tracing only important sources deeply.

**When / how** — Call it before `st_off_ir_compute`. The default is 4 per source (the global cap is `st_off_set_max_depth`, default 8). An unacceptable value records `ST_STATUS_INVALID_ARGUMENT` in `st_off_get_last_status`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `depth` | Maximum reflection depth (default 4) |

**Returns** — Nothing. Check failures with `st_off_get_last_status`.

</details>

<details>
<summary><code>st_off_source_set_energy</code> — Sets a source's energy multiplier</summary>

```c
int st_off_source_set_energy(STOFF_Context* context, STSourceId source, float energy);
```

**Purpose** — Adjusts source strength with an **energy-domain** relative multiplier, separate from `STSourceDesc.intensity` (pressure-domain gain). Support is indicated by `ST_CAP_SOURCE_ENERGY`.

**When / how** — Call it before `st_off_ir_compute`. The default is 1.0. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `energy` | Energy multiplier. Must be finite and `≥ 0` (default 1.0) |

**Returns** — `1` = success / `0` = no context, non-finite or negative value, unknown source.

</details>

<details>
<summary><code>st_off_source_set_transport_refresh_steps</code> — Stores the per-source transport refresh step count</summary>

```c
int st_off_source_set_transport_refresh_steps(STOFF_Context* context, STSourceId source, int steps);
```

**Purpose** — In a real-time context, this value makes the source's transport ray grid N refresh spread over n propagations. The offline context has the same setter so the value round-trips, letting the host replay the same scene settings unchanged in a real-time context.

**When / how** — The offline context does not use rolling transport, so it **ignores n for dynamic sources and fully retraces on every computation** (effective n = 1). The same scene and the same inputs therefore produce the same RIR no matter how many times you compute. Static sources are fixed to the result baked once per computation, regardless of n. The value itself is stored and `st_off_source_get_transport_refresh_steps` returns it as is. Signature and return contract match the real-time `st_rt_source_set_transport_refresh_steps`. Support is indicated by `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `steps` | `0` = default (decided by the shell and source flags) / `1` = full retrace every propagation / `≥ 2` = refresh spread over n (clamped to `[1, N]` in real time). Negative values are rejected |

**Returns** — `1` = success / `0` = failure: negative `steps` gives `ST_STATUS_INVALID_ARGUMENT`, an unknown source gives `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_off_source_get_transport_refresh_steps</code> — Reads the stored transport refresh step count</summary>

```c
int st_off_source_get_transport_refresh_steps(const STOFF_Context* context, STSourceId source);
```

**Purpose** — Checks the value stored with `st_off_source_set_transport_refresh_steps`.

**When / how** — Can be called at any time. The returned value is **the stored value as is** (including 0), not the effective n — the effective value for offline dynamic sources is always 1. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |

**Returns** — The stored step count (`≥ 0`). `-1` on failure.

</details>

<details>
<summary><code>st_off_source_set_orientation_q</code> — Sets a source's local frame with a quaternion</summary>

```c
int st_off_source_set_orientation_q(STOFF_Context* context, STSourceId source, const float quatXYZW[4]);
```

**Purpose** — Places the source's local frame in the world, including roll. The directivity table is looked up relative to this frame, so sources that use a table set their orientation with this function.

**When / how** — Local axes are forward = +Z / up = +Y / right = +X. It is synchronized both ways with `st_off_source_set_direction` — setting the frame here also changes direction = forward(q), and calling the direction setter makes the frame the minimal rotation without roll. If you need roll, always use this function. Same contract as the real-time `st_rt_source_set_orientation_q`. Support is indicated by `ST_CAP_SOURCE_DIRECTIVITY`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `quatXYZW` | Local → world unit quaternion, **XYZW order**. The engine normalizes it |

**Returns** — `1` = success / `0` = failure: non-finite components or degenerate (`norm < 1e-12`) give `ST_STATUS_INVALID_ARGUMENT`, an unknown source gives `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_off_source_set_directivity</code> — Attaches or detaches a source directivity table</summary>

```c
int st_off_source_set_directivity(STOFF_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**Purpose** — Specifies the source's radiation pattern with a measured or authored azimuth × elevation × 9-band energy table. It captures the radiation of real sources (instruments, loudspeakers, human voice, etc.) more accurately than a simple front/side cone.

**When / how** — While a table is attached it is used instead of the cone attenuation (the on/off-axis made by `STSourceDesc.directional`); detaching it with `table = NULL` returns to the cone formula. The engine **copies** the table, so the host buffer can be freed once the call returns. Lookup directions are relative to the source frame, so pair it with `st_off_source_set_orientation_q`. Same contract as the real-time `st_rt_source_set_directivity`. Support is indicated by `ST_CAP_SOURCE_DIRECTIVITY`. Thread: `[control]` — the table copy and the normalization scalar computation happen once in this call.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `table` | Directivity table. The caller fills `structSize`/`apiVersion`. `NULL` removes the table |

**Struct** `STSourceDirectivity`

| Field | Description |
|---|---|
| `structSize` / `apiVersion` | Filled by the caller |
| `azCount` | Number of azimuth nodes, `[3, 361]`. Node az_i = i·360/azCount (wraps at 360°) |
| `elCount` | Number of elevation nodes, `[2, 181]`. Node el_j = −90 + j·180/(elCount−1). If odd, the horizontal plane (0°) falls on a node. The recommended grid is 5° spacing (72 × 37) |
| `levelMode` | `STDirectivityLevelMode` — `ST_DIRECTIVITY_ABSOLUTE` (0, values used as is: for measurement data that includes absolute level) / `ST_DIRECTIVITY_POWER_MEAN` (1, normalized so the per-band spherical power mean is 1: when only the pattern is used and total power is set by intensity/energy, recommended) / `ST_DIRECTIVITY_ON_AXIS` (2, normalized so the on-axis value is 1) |
| `reserved0` | Reserved |
| `energy` | `elCount × azCount × ST_FREQUENCY_BANDS` floats, layout `[el][az][band]` (band fastest). **Energy domain**, finite and `≥ 0` |
| `reserved[6]` | Reserved |

The direction convention in the source local frame is az = atan2(x, z) (front 0, right +90°), el = asin(y) (up +), and lookup is bilinear interpolation with az wrap · el clamp.

**Returns** — `1` = success (including table removal) / `0` = failure: stamp mismatch `ST_STATUS_VERSION_MISMATCH`, `levelMode` · `azCount` · `elCount` out of range · `energy` is `NULL` · non-finite or negative element `ST_STATUS_INVALID_ARGUMENT` (reason in `st_off_get_last_error`), unknown source `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_off_source_set_eq</code> — Applies a 9-band graphic EQ to the source's dry signal</summary>

```c
int st_off_source_set_eq(STOFF_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**Purpose** — Corrects the tone of the source signal itself in 9 bands. It is applied before the crossover, so the same filter applies to every path of that source (direct, transmission, reflection, diffraction) and to its reverb send. It is the same implementation as the real-time `st_rt_source_set_eq` and produces the same result.

**When / how** — It is a render-only setting and does not invalidate the IR cache — re-rendering without another `st_off_ir_compute` applies it immediately (for solo, mixed and batch renders of pressure IRs alike). `gainsDb = NULL` or 0 dB in every band turns the EQ off, and the result is bit-identical to having no EQ. The setting persists until the source is deleted and also survives `st_off_trim_memory`. It shares the same EQ as the parametric EQ (`st_off_source_set_parametric_eq`); the last setter called wins. Support is indicated by `ST_CAP_SOURCE_EQ`. Thread: `[control]` — takes the scene read lock and the auralizer control lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `gainsDb` | Per-band gain (dB), in the order 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz. Must be finite and within `[−ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]` (±24 dB); out-of-range values are rejected, not clamped. `NULL` = off |

The filter is one RBJ peaking biquad per band (center = band center, Q = 1.414), applied in series in ascending order at 44100 Hz. Responses of neighboring bands overlap, so if you need exactly the specified value at band centers, the host compensates the gains it passes in.

**Returns** — `1` = success / `0` = failure: non-finite or out-of-range value `ST_STATUS_INVALID_ARGUMENT` (nothing changed), unknown source `ST_STATUS_NOT_FOUND`, backend without source EQ support (Exa) `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_source_get_eq</code> — Reads the source EQ as 9-band gains</summary>

```c
int st_off_source_get_eq(STOFF_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**Purpose** — Returns the current source EQ as a 9-band graphic EQ view.

**When / how** — Can be called at any time. All zeros when the EQ is off. If a parametric EQ setting that is not 9-band shaped was applied, it cannot be expressed as a graphic view and the call fails — on `0` + `ST_STATUS_UNAVAILABLE`, call `st_off_source_get_parametric_eq`; if it succeeds, read the setting from there, and if it fails with the same `UNAVAILABLE`, the backend does not support source EQ. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `outGainsDb` | Array that receives the 9-band gains (dB) |

**Returns** — `1` = success / `0` = failure: `ST_STATUS_INVALID_ARGUMENT` if `outGainsDb` is `NULL`, unknown source `ST_STATUS_NOT_FOUND`, `ST_STATUS_UNAVAILABLE` (backend not supported, or a parametric setting not expressible in 9 bands — `outGainsDb` is left untouched in that case).

</details>

<details>
<summary><code>st_off_source_set_parametric_eq</code> — Applies a parametric EQ to the source's dry signal</summary>

```c
int st_off_source_set_parametric_eq(STOFF_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**Purpose** — Corrects source tone with a band list (peaking, shelf, LP, HP, notch) that is more flexible than the fixed 9-band EQ. It is **the same EQ** as `st_off_source_set_eq`, applied at the same point (before the crossover, on every path of that source). AutoEq profiles can be read with `st_off_render_parse_autoeq_parametric` and passed in as is.

**When / how** — Offline, it changes immediately without a ramp, and the same filter applies to solo, mixed and batch pressure renders alike. It does not invalidate the IR cache, so re-rendering applies it. Both source EQ setters replace the whole list, and the last one called wins. A disabled list or a list with no effect is still stored; to turn it off and clear it, call `st_off_source_set_eq(context, source, NULL)`. The setting persists until the source is deleted. Same contract and same implementation as the real-time `st_rt_source_set_parametric_eq`. Support is indicated by `ST_CAP1_SOURCE_PARAMETRIC_EQ` in word 1. Thread: `[control]` — takes the scene read lock and the auralizer control lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `bands` | Band array (`bandCount` entries). May be `NULL` when `bandCount = 0` |
| `bandCount` | Number of bands, `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` (16) |
| `preampDb` | Preamp (dB), clamped to `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` (−48 to +12). Mainly used with negative values to prevent clipping |
| `enabled` | `0` = store the list but pass through / otherwise = on |

**Struct** `STParametricEqBand`

| Field | Description |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | `0` = this band is identity (skipped) / otherwise = on |
| `frequencyHz` | Center (PEAKING, NOTCH) or corner (shelf midpoint, LP, HP) frequency. Clamped to `[20, min(20000, 0.49·44100)]` |
| `gainDb` | Used by PEAKING and shelves only. Clamped to `[−24, +24]` |
| `q` | Clamped to `[0.1, 30]`, shelves to `[0.1, 3]` |
| `reserved[3]` | Must be `0` |

Non-finite values, unknown `type`, `reserved ≠ 0` and an out-of-range band count are rejected (nothing changes); finite values are clamped to the ranges above. Each band is an RBJ second-order section (44100 Hz, double), and the chain is preamp → bands 0..count−1 in series.

**Returns** — `1` = success / `0` = failure: `ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_NOT_FOUND` (no source) / `ST_STATUS_UNAVAILABLE` (Exa backend).

</details>

<details>
<summary><code>st_off_source_get_parametric_eq</code> — Reads the source EQ as a parametric band list</summary>

```c
int st_off_source_get_parametric_eq(STOFF_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**Purpose** — Returns the current source EQ as a band list of clamped effective values. A setting applied with the 9-band setter also reads back as 9 PEAKING bands.

**When / how** — If you do not know the size, call it first with `outBands = NULL` to get the band count. A capacity of `ST_PARAMETRIC_EQ_MAX_BANDS` always fits. With no EQ, it is 0 bands and off. The output convention matches the real-time `st_rt_render_get_parametric_eq`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `outBands` | Array that receives the bands. `NULL` = size query (no bands written) |
| `bandCapacity` | Number of elements in `outBands` (`≥ 0`) |
| `outBandCount` | Band count. Skipped if `NULL` |
| `outPreampDb` | Preamp (dB). Skipped if `NULL` |
| `outEnabled` | Whether enabled. Skipped if `NULL` |

See `st_off_source_set_parametric_eq` for the `STParametricEqBand` fields.

**Returns** — `1` = success (including size queries) / `0` = failure: `ST_STATUS_INVALID_ARGUMENT` if `bandCapacity < 0`, `ST_STATUS_BUFFER_TOO_SMALL` if the capacity is smaller than the band count (band count, preamp and enabled are still written), unknown source `ST_STATUS_NOT_FOUND`, Exa backend `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_source_set_path_volume</code> — Sets a source's volume per path type</summary>

```c
int st_off_source_set_path_volume(STOFF_Context* context, STSourceId source, int volumeKind, float volume);
```

**Purpose** — Raises or lowers the direct, reflection, diffraction and reverb contributions of one source separately. Use it when you need mix-oriented adjustments while keeping the physical result. Support is indicated by `ST_CAP_SOURCE_PATH_VOLUME`.

**When / how** — The default is 1.0 for all four types. The value is a **pressure-domain** linear multiplier. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `source` | Source handle |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT` (0, includes transmission) / `ST_SOURCE_VOLUME_REFLECTION` (1) / `ST_SOURCE_VOLUME_DIFFRACTION` (2) / `ST_SOURCE_VOLUME_REVERB` (3, adjusts only how much this source drives the listener's shared reverb tank) |
| `volume` | Linear pressure multiplier. Finite and `≥ 0` (default 1.0) |

**Returns** — `1` = success / `0` = no context, out-of-range `volumeKind`, non-finite or negative `volume`, unknown source.

</details>

<details>
<summary><code>st_off_set_path_type_enabled</code> — Enables or disables a path type globally</summary>

```c
void st_off_set_path_type_enabled(STOFF_Context* context, int pathType, int enabled);
```

**Purpose** — Excludes a specific path type (direct, transmission, reflection, diffraction or reverb) from computation, to listen separately to what each component contributes to the result or to reduce cost.

**When / how** — Call it before `st_off_ir_compute`. By default all five types are enabled. Combined with `st_off_set_acoustic_feature_enabled`, you can build a "distance attenuation + panning only" baseline purely through settings. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |
| `enabled` | `0` = off / otherwise = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_set_acoustic_feature_enabled</code> — Enables or disables individual acoustic features</summary>

```c
int st_off_set_acoustic_feature_enabled(STOFF_Context* context, int feature, int enabled);
```

**Purpose** — Turns air absorption, propagation delay and direct-sound occlusion off and on one at a time for listening A/B comparisons. Same contract as the real-time `st_rt_set_acoustic_feature_enabled`.

**When / how** — By default all three features are on (physically as is). It is an IR policy setting, so calling it invalidates the IR cache; call `st_off_ir_compute` again before rendering. Disabling reflection, diffraction and reverb (`st_off_set_path_type_enabled`) and all three features leaves only distance attenuation + panning. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION` (0, atmospheric attenuation and high-frequency loss) / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY` (1, propagation delay based on path length) / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION` (2, direct-sound visibility test) |
| `enabled` | `0` = off / otherwise = on |

**Returns** — `1` = success / `0` = out-of-range `feature` or failure.

</details>

<details>
<summary><code>st_off_is_acoustic_feature_enabled</code> — Reads whether an acoustic feature is enabled</summary>

```c
int st_off_is_acoustic_feature_enabled(const STOFF_Context* context, int feature);
```

**Purpose** — Checks the state set with `st_off_set_acoustic_feature_enabled`.

**When / how** — Can be called at any time. Thread: `[control]` — reads engine state without a lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `feature` | `ST_ACOUSTIC_FEATURE_*`(0~2) |

**Returns** — `1` = on / `0` = off / `-1` = no context.

</details>

<details>
<summary><code>st_off_set_late_coupling</code> — Sets the late-reverb coupling attenuation parameters individually</summary>

```c
int st_off_set_late_coupling(STOFF_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**Purpose** — Attenuates late-reverb injection according to how strongly the listener is coupled to the source's diffuse field (the visible fraction). The reverb tank is a single fully mixed space, so by default it sounds equally loud everywhere; this option fixes the problem in spaces split around corners, such as U- or ring-shaped layouts, where "you move away but the reverb stays the same or even gets louder".

**When / how** — `st_off_set_late_coupling_preset` is usually enough; use this function when you need fine adjustments. Coupling attenuation, send flattening and the rain direction walk are a bundle designed to be enabled together — enabling coupling without flattening can make reverb injection grow as you move away, and without the rain walk there are too few late direction samples on the far side of a split space. A space shared with the source (visible fraction at or above `visibleHigh`) is exactly 0 dB. The parameter set is not final and may change. It is an IR policy, so changed values take effect from the next `st_off_ir_compute`. Same contract as the real-time `st_rt_set_late_coupling`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `floorDb` | Attenuation depth (dB) at full blocking. `0` = coupling attenuation off. Default 9 |
| `visibleLow` | Below this visible fraction, the listener is treated as fully blocked and gets the floor attenuation. `0` → default 0.05 |
| `visibleHigh` | Above this visible fraction, the listener is treated as in the same space, exactly 0 dB. `0` → default 0.60 |
| `sendNormalizeTrim` | Trim for flattening the send total. `0` = no flattening. Default 0.75 |
| `rainDirectionWalk` | `0` = off / otherwise = on (default). Keeps collecting late direction samples after the chain ends (carries no energy) |

**Returns** — `1` = success / `0` = out-of-range value or failure.

</details>

<details>
<summary><code>st_off_get_late_coupling</code> — Reads the late-reverb coupling attenuation parameters</summary>

```c
int st_off_get_late_coupling(const STOFF_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**Purpose** — Checks the late coupling attenuation settings currently in effect (values set by the individual setter or a preset).

**When / how** — Can be called at any time. Leave outputs you do not need as `NULL`. Thread: `[control]` — reads engine state without a lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `outFloorDb` | Floor attenuation depth (dB). `NULL` allowed |
| `outVisibleLow` | Full-blocking knee. `NULL` allowed |
| `outVisibleHigh` | Same-space knee. `NULL` allowed |
| `outSendNormalizeTrim` | Send flattening trim. `NULL` allowed |
| `outRainDirectionWalk` | Whether the rain direction walk is on. `NULL` allowed |

See `st_off_set_late_coupling` for the meaning of each value.

**Returns** — `1` = success / `0` = no context.

</details>

<details>
<summary><code>st_off_set_late_coupling_preset</code> — Sets late-reverb coupling attenuation to a recommended preset</summary>

```c
int st_off_set_late_coupling_preset(STOFF_Context* context, int preset);
```

**Purpose** — One-shot setup that lets you choose only the floor attenuation depth and fills the rest (the two knees, flattening trim, rain walk) with recommended values.

**When / how** — Choosing a preset is mostly a matter of listening — in a single room the visible fraction is above the knee so the attenuation never engages, and with any preset a space shared with the source is exactly 0 dB. Use `st_off_set_late_coupling` if you need individual adjustments. It is an IR policy, so changed values take effect from the next `st_off_ir_compute`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `preset` | `ST_LATE_COUPLING_OFF` (0, coupling attenuation, flattening and rain walk all off) / `ST_LATE_COUPLING_SUBTLE` (1, floor 6 dB) / `ST_LATE_COUPLING_DEFAULT` (2, floor 9 dB, engine default) / `ST_LATE_COUPLING_STRONG` (3, floor 12 dB) |

**Returns** — `1` = success / `0` = out-of-range `preset` or failure.

</details>

<details>
<summary><code>st_off_set_physical_distance_attenuation</code> — Sets the reference and minimum distances for distance attenuation</summary>

```c
void st_off_set_physical_distance_attenuation(STOFF_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**Purpose** — Sets the reference point and near-field limit of physical spherical-spreading (pressure 1/R) distance attenuation. It is the engine's only distance attenuation law, and the pressure gain is `reference / max(R, min)`.

**When / how** — The default is reference 1.0 m · minimum 1.0 m (setting the minimum below the reference produces near-field boost closer than the reference). The **host passes both values in meters**, regardless of `sceneRatio` — the path lengths they are compared with are already converted to meters. It invalidates the IR cache, so call `st_off_ir_compute` again before rendering. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `referenceDistanceMeters` | Reference distance (m) at which the gain is 1. Default 1.0 |
| `minDistanceMeters` | Distances closer than this are treated as this value (m). Default 1.0 |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_set_atmosphere</code> — Sets atmospheric conditions (temperature, humidity, pressure)</summary>

```c
void st_off_set_atmosphere(STOFF_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**Purpose** — Specifies the atmospheric state that determines air absorption (high-frequency loss) and the speed of sound. The speed of sound is not a fixed constant but derived from these values at runtime, so propagation delay changes too.

**When / how** — The default is 20.0 °C · 50.0 %RH · 101.325 kPa. It invalidates the IR cache, so call `st_off_ir_compute` again before rendering. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `temperatureC` | Air temperature (°C). Default 20.0 |
| `relativeHumidityPercent` | Relative humidity (%). Default 50.0 |
| `pressureKPa` | Atmospheric pressure (kPa). Default 101.325 |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_set_doppler_gain_mode</code> — Selects the radiation gain mode for moving sources</summary>

```c
int st_off_set_doppler_gain_mode(STOFF_Context* context, int mode);
```

**Purpose** — Decides whether the IR includes the gain by which a moving source radiates more toward its direction of travel and less behind it. It is a separate switch from the Doppler pitch produced by variable delay. Support is indicated by `ST_CAP_DOPPLER_GAIN_MODE`.

**When / how** — The default is `ST_DOPPLER_GAIN_MOVING_MONOPOLE`. Source velocity is given with `STSourceDesc.velocity*`; a stationary source has gain 1. It invalidates the IR cache, so call `st_off_ir_compute` again before rendering. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF` (0) / `ST_DOPPLER_GAIN_MOVING_MONOPOLE` (1, default: moving monopole approximation — pressure D², energy D⁴, D = 1/(1−Mr), computed separately for each radiated path direction) |

**Returns** — `1` = success / `0` = no context or out-of-range `mode`.

</details>

<details>
<summary><code>st_off_get_doppler_gain_mode</code> — Reads the Doppler radiation gain mode</summary>

```c
int st_off_get_doppler_gain_mode(const STOFF_Context* context);
```

**Purpose** — Checks the value set with `st_off_set_doppler_gain_mode`.

**When / how** — Can be called at any time. Thread: `[control]` — reads engine state without a lock.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — A `STDopplerGainMode` value (`0` = OFF / `1` = MOVING_MONOPOLE). `-1` if there is no context.

</details>

<details>
<summary><code>st_off_set_early_late_band_energy_targets</code> — Sets per-band energy multipliers for early and late</summary>

```c
int st_off_set_early_late_band_energy_targets(STOFF_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**Purpose** — Adjusts the spectra of the early sound and the late reverb per band, independently of each other. Use it to match measurements or to shape the reverb tone on its own. Offline counterpart of the real-time `st_rt_set_early_late_band_energy_targets`. Support is indicated by `ST_CAP_EARLY_LATE_BAND_ENERGY`.

**When / how** — Replaces both arrays at once. Early multipliers apply only to exact and early taps, late multipliers only to the reverb send and tank drive, and they are not multiplied together. All default to 1.0 (neutral). It invalidates the IR cache, so call `st_off_ir_compute` again before rendering. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `earlyBandEnergy` | Per-band **energy-domain** multipliers for the early sound (9 values, 63 to 16k Hz). Non-finite values are normalized to 1.0, the rest to `[0, 16]` |
| `lateBandEnergy` | Per-band energy multipliers for the late reverb. Same rules as above |

**Returns** — `1` = success / `0` = no context or an array is `NULL`.

</details>

<details>
<summary><code>st_off_set_max_depth</code> — Sets the global maximum reflection depth</summary>

```c
void st_off_set_max_depth(STOFF_Context* context, int depth);
```

**Purpose** — Sets the global order cap for reflection path search to control computation cost and early reflection density.

**When / how** — Call it before `st_off_ir_compute`. The default is 8 (the per-source cap is `st_off_source_set_depth`, default 4). Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `depth` | Global maximum reflection depth (default 8) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_set_transmission_max_depth</code> — Sets the maximum depth of transmission paths</summary>

```c
void st_off_set_transmission_max_depth(STOFF_Context* context, int depth);
```

**Purpose** — Sets the cap on how many surfaces are traced when direct sound transmits through walls.

**When / how** — Call it before `st_off_ir_compute`. The default is 64. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `depth` | Maximum transmission depth (default 64) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_listener_set_ray_count</code> — Sets the size of the listener guide ray grid</summary>

```c
void st_off_listener_set_ray_count(STOFF_Context* context, int width, int height);
```

**Purpose** — Sets the number of guide (probe) rays cast from the listener (N = `width × height`). Trades the resolution of reflection/diffraction path search and spatial statistics against computation cost.

**When / how** — Call it before `st_off_ir_compute`. The default is 16 × 16. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `width` | Horizontal ray count of the grid (default 16) |
| `height` | Vertical ray count of the grid (default 16) |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_listener_set_ray_sampling_method</code> — Selects the direction distribution of listener guide rays</summary>

```c
int st_off_listener_set_ray_sampling_method(STOFF_Context* context, int method);
```

**Purpose** — Setter that decides how listener guide rays are placed on the sphere. Currently only the Fibonacci sphere distribution can be selected; the other values remain in the enum only for numbering compatibility. The Fibonacci distribution is deterministic and uses no seed.

**When / how** — The default is already `ST_RAY_SAMPLING_FIBONACCI_SPHERE`, so you normally do not need to call it. Support is indicated by `ST_CAP_RAY_SAMPLING_METHODS`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `method` | `STRaySamplingMethod`. The only accepted value is `ST_RAY_SAMPLING_FIBONACCI_SPHERE` (1) — `LEGACY_GRID` (0) / `EQUAL_AREA_GRID` (2) / `SOBOL_SPHERE` (3) / `ICOSAHEDRAL` (4) are rejected |

**Returns** — `1` = success / `0` = any other value (`ST_STATUS_INVALID_ARGUMENT`, state unchanged) or no context.

</details>

<details>
<summary><code>st_off_set_source_ray_sampling_method</code> — Selects the direction distribution of source transport rays</summary>

```c
int st_off_set_source_ray_sampling_method(STOFF_Context* context, int method);
```

**Purpose** — Setter that decides the spherical placement of source transport rays. As with `st_off_listener_set_ray_sampling_method`, only the Fibonacci sphere distribution can be selected.

**When / how** — The default is already `ST_RAY_SAMPLING_FIBONACCI_SPHERE`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |
| `method` | `STRaySamplingMethod`. Only `ST_RAY_SAMPLING_FIBONACCI_SPHERE` (1) is allowed; the rest are rejected |

**Returns** — `1` = success / `0` = any other value (`ST_STATUS_INVALID_ARGUMENT`, state unchanged) or no context.

</details>

<details>
<summary><code>st_off_build</code> — Fully builds the scene acceleration structure</summary>

```c
void st_off_build(STOFF_Context* context);
```

**Purpose** — Builds both the static and dynamic acceleration structures from the registered meshes and objects. Propagation and `st_off_scene_raycast` use this structure.

**When / how** — Call it after adding or deleting meshes or objects, after moving static objects, and before `st_off_ir_compute`. Before a build, every ray query misses. The acceleration structure type is decided by `st_off_scene_set_accel`. Thread: `[control, blocking]` — a long exclusive section proportional to scene size.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_build_dynamic</code> — Updates only the TLAS of dynamic objects</summary>

```c
void st_off_build_dynamic(STOFF_Context* context);
```

**Purpose** — When only dynamic object transforms changed, refits the dynamic TLAS to apply them quickly without a full build.

**When / how** — Call it after moving dynamic objects with `st_off_object_set_transform` / `_q` and before `st_off_ir_compute`. If you added or deleted meshes or objects, or static objects changed, use `st_off_build`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Context handle |

**Returns** — Nothing.

</details>

</details>

<details>
<summary><strong>Offline (`st_off_*`) — IR computation and rendering, batch, debug</strong> — 49 functions</summary>

<details>
<summary><code>st_off_render_parse_autoeq_parametric</code> — Parses AutoEq ParametricEQ.txt text into a parametric EQ band array</summary>

```c
int32_t st_off_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**Purpose** — Reads the `ParametricEQ.txt` distributed by AutoEq (a subset of the Equalizer APO syntax) and converts it into a `STParametricEqBand` array and a preamp value. The result can be passed as is to `st_off_source_set_parametric_eq`, so the host can apply external EQ files such as headphone correction curves as a source EQ without parsing them itself. Same implementation and same contract as the real-time `st_rt_render_parse_autoeq_parametric`.

**When / how** — It needs no context, so it can be called at any time. On success, pass the result to `st_off_source_set_parametric_eq` as enabled (`enabled` = 1). Check support with `ST_CAP1_SOURCE_PARAMETRIC_EQ` of `st_off_get_capability_word(1)` (this parser is covered by that bit and has no separate bit). Thread: `[any]` — no global state and no allocation, so it can be called from any thread without blocking.

Accepted syntax (case-insensitive):

- `Preamp: <number> [dB]` — multiple lines are summed in dB.
- `Filter[ <index>]: ON|OFF <type> Fc <number> [Hz] [Gain <number> [dB]] [Q <number>]` — types are `PK` · `PEQ` · `MODAL` / `LSC` · `LS` / `HSC` · `HS` / `LP` · `LPQ` / `HP` · `HPQ` / `NO`. If Q is omitted it is 0.7071 for shelves, LP and HP; `PK` and `NO` require Q. Gain is required for PK and shelves. An `OFF` filter becomes an `enabled` = 0 band and counts toward the band count.
- Blank lines and anything after `#` (end-of-line comments) are ignored; UTF-8 BOM and CRLF are accepted. Numbers are read independently of locale.

Rejected: other commands (`Channel` · `Device` · `GraphicEQ` · `Include`, etc.), `BP` · `AP` · `IIR`, shelf slope forms (`LS 6dB`), `BW Oct`, out-of-range values (Fc [20, 20000] Hz · Gain ±24 dB · Q [0.1, 30], Q [0.1, 3] for shelves · final preamp sum [−48, +12] dB), non-ASCII characters outside comments, exponent notation. The parser rejects rather than clamps (the setter clamps to the same ranges).

| Parameter | Description |
|---|---|
| `utf8Text` | NUL-terminated UTF-8 text (the entire file content). Required |
| `outBands` | Caller array that receives the bands. Required if `bandCapacity` is greater than 0 |
| `bandCapacity` | Number of elements in `outBands`. 0 or more. The maximum band count is `ST_PARAMETRIC_EQ_MAX_BANDS` (16) |
| `outBandCount` | Receives the number of parsed bands. Required (not NULL) |
| `outPreampDb` | Receives the preamp (dB). Required (not NULL) |
| `outErrorLine` | Line number of the failure (from 1; 0 for errors not tied to a line). NULL allowed |
| `outErrorMessage` | Failure reason (NUL-terminated English). NULL allowed |
| `errorMessageCapacity` | Byte size of `outErrorMessage`. The message is truncated to fit |

**Struct** `STParametricEqBand` (32 bytes, array element without a version stamp)

| Field | Description |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = identity (skipped), otherwise = on |
| `frequencyHz` | Center (PEAKING, NOTCH) or corner (shelf midpoint, LP, HP) frequency |
| `gainDb` | Used only by PEAKING, LOW_SHELF and HIGH_SHELF |
| `q` | Q value |
| `reserved[3]` | 0. The parser fills it with 0 |

**Returns** — `STAutoEqParseStatus`. On `ST_AUTOEQ_PARSE_OK` (0), writes `outBands[0..*outBandCount)` and `*outPreampDb`. On failure, `*outBandCount` = 0 · `*outPreampDb` = 0 and the error line and message are written: `ST_AUTOEQ_PARSE_INVALID_ARGUMENT` (1, required pointer NULL, negative capacity, etc.) / `SYNTAX` (2, malformed line) / `UNSUPPORTED` (3, unsupported command, filter or form) / `OUT_OF_RANGE` (4, out-of-range value) / `TOO_MANY_BANDS` (5, exceeds `ST_PARAMETRIC_EQ_MAX_BANDS` or `bandCapacity`) / `EMPTY` (6, no Preamp or Filter lines at all). There is no context, so no last_status is recorded.

</details>

<details>
<summary><code>st_off_render_set_spatializer</code> — Selects the context's spatializer (HRTF type) and loads the HRIR dataset</summary>

```c
int st_off_render_set_spatializer(STOFF_Context* context, int type);
```

**Purpose** — Selects the offline context's spatialization implementation (panning / built-in MIT KEMAR / SADIE II D2) and loads the required HRIR dataset. Accepts the same set of values as the real-time `st_rt_render_set_spatializer`.

**When / how** — Binaural IR and audition renders select the spatializer per request through the request struct (`STOfflineBinauralIRRequestOptions.hrtfType`), so if you only use those renders you do not need to call this function separately. SADIE D2 requires the external asset file `SADIE_D2_44K_16bit_256tap.hrtfbin` — the engine searches, in order, the environment variable `SOUNDTRACING_SADIE_D2_HRTF_PATH`, the current working folder, the executable folder and the DLL folder (in each case `Assets/HRTF/` · `SoundTracing/Assets/HRTF/` · `Resources/HRTF/` in that folder and up to 8 parent levels). For distribution, placing it in `Resources/HRTF/` next to (or above) the DLL is soundtracing. Thread: `[control, blocking]` — it has a long section that loads the HRIR dataset, so do not call it from latency-sensitive threads.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING` (0, no HRIR data needed) / `ST_SPATIALIZER_MIT_KEMAR` (1, built into the DLL) / `ST_SPATIALIZER_SADIE_D2_KEMAR` (2, external asset required). Other values are rejected |

**Returns** — `1` = applied / `0` = failure. 0 if the context is NULL or `type` is out of range. If SADIE D2 is selected and the asset file is missing, returns 0 and records `ST_STATUS_UNAVAILABLE` ("SADIE D2 HRTF asset not found ...").

</details>

<details>
<summary><code>st_off_render_set_early_spatial_mode</code> — Selects the early-reflection render path (exact objects / HOA3 bed) for binaural and audition renders</summary>

```c
int st_off_render_set_early_spatial_mode(STOFF_Context* context, int mode);
```

**Purpose** — Selects which path binaural IR and audition renders use for early reflections. `ST_EARLY_SPATIAL_OBJECTS` (default) is the reference that synthesizes every early path as an exact object; `ST_EARLY_SPATIAL_BED` renders with the real-time headphone default path (exact objects within budget + the remaining early reflections and first-order scattering into an HOA3 bed → binaural decode). A BED render equals "the synchronous real-time output of a static scene with only that one source", so use it to preview offline, or compare, what will actually be heard in the game.

**When / how** — The mode connects to computation and rendering in this order.

1. Select the mode with this function. The IR cache is not cleared.
2. `st_off_ir_compute` — with BED, it propagates once per listener and converts twice, caching both the exact reference and the bed variant (only conversion time and IR memory grow; propagation cost stays the same). With OBJECTS, it converts once as well.
3. `st_off_ir_render_binaural` / `st_off_ir_render_audition_pair` follow **the mode at render time**. A cache computed with BED holds both variants, so you can switch modes and render both without recomputing. Rendering a cache without the variant (such as one computed with OBJECTS) in BED returns 0 and `ST_STATUS_UNAVAILABLE`; in that case leave the mode at BED and compute again. `earlySpatialMode` in the result info is the mode actually used.

Pressure IRs (solo, mixed, batch) and raw IR queries are always the exact reference regardless of mode. An IR archive stores both variants if the cache was computed with BED, and loading an archive does not change the context's mode. A BED render installs the IR, settles path fades and gain ramps with a silent warm-up (16384 frames ≈ 0.37 s, discarded from the output) and then feeds the input, so render time grows by that much. Real-time output that plays several sources together shares the merged bed and send between sources, so it differs slightly from the sum of the pairwise results. Both modes weight the late diffuse field by the arrival-direction distribution of first-order scattering around the listener (pressure IRs are not spatialized, so they are unaffected).

Check support with `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE` of `st_off_get_capability_word(1)`. Thread: `[control]` — it takes the job mutex, so it may block until an in-progress compute or render finishes.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `mode` | `STEarlySpatialMode` — `ST_EARLY_SPATIAL_OBJECTS` (0, default, exact reference) / `ST_EARLY_SPATIAL_BED` (1, real-time bed path). Other values are rejected |

**Returns** — `1` = success / `0` = failure. Any other value gives `ST_STATUS_INVALID_ARGUMENT`; selecting BED on an `ST_BACKEND_EXA` context gives `ST_STATUS_UNAVAILABLE` (OBJECTS always works).

</details>

<details>
<summary><code>st_off_render_get_early_spatial_mode</code> — Reads the current early spatial mode</summary>

```c
int st_off_render_get_early_spatial_mode(const STOFF_Context* context);
```

**Purpose** — Returns the current mode selected with `st_off_render_set_early_spatial_mode`. The default is `ST_EARLY_SPATIAL_OBJECTS` (0), which differs from the real-time default (BED).

**When / how** — Can be called at any time. The mode actually used for a render can also be checked in the result info (`STOfflineBinauralIRInfo.earlySpatialMode`, `STOFF_AuditionInfo.earlySpatialMode`). Thread: `[any]` — an atomic read, so it can be called from any thread without blocking.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — The current mode (`ST_EARLY_SPATIAL_OBJECTS` (0) / `ST_EARLY_SPATIAL_BED` (1)). `-1` if `context` is NULL.

</details>

<details>
<summary><code>st_off_render_set_max_delay_seconds</code> — Sets the delay ring length (seconds) used by offline renders</summary>

```c
int st_off_render_set_max_delay_seconds(STOFF_Context* context, float seconds);
```

**Purpose** — Sets the length of the delay ring used by pressure, binaural, audition and batch renders. Exact paths whose delay exceeds the ring limit are dropped from the render (the FDN covers the late part), so raise this value for large spaces or long IRs that need paths arriving later than the default 4 s.

**When / how** — It is a render setting independent of the IR cache, so it applies from the next render without recomputing. Ring memory is 9 bands × ring length per rendered source. An IR archive records the value at save time, and a context that loads it uses that value (it can be changed again after loading). Check support with `ST_CAP1_OFFLINE_MAX_DELAY` of `st_off_get_capability_word(1)`. Thread: `[control, blocking]` — takes the job mutex and reallocates the delay ring.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `seconds` | Ring length (seconds). Default 4.0 s (differs from the real-time default of 2.0 s). The range is about 0.012 s to 60 s, the same as the real-time `st_rt_render_set_max_delay_seconds`. Out-of-range and non-finite values are rejected |

**Returns** — `1` = success / `0` = failure. Out-of-range or non-finite values give `ST_STATUS_INVALID_ARGUMENT`; a backend that cannot change the ring length gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_render_get_max_delay_seconds</code> — Reads the current render delay ring length (seconds)</summary>

```c
float st_off_render_get_max_delay_seconds(const STOFF_Context* context);
```

**Purpose** — Returns the current delay ring length set with `st_off_render_set_max_delay_seconds` (or loaded from an archive).

**When / how** — Use it to check that paths arriving later than the render length are not cut off. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — The current value (seconds, default 4.0). `0` if `context` is NULL.

</details>

<details>
<summary><code>st_off_debug_set_collect_visual_paths</code> — Sets which path types to collect for visualization in the next computation</summary>

```c
int st_off_debug_set_collect_visual_paths(STOFF_Context* context, uint32_t mask);
```

**Purpose** — Enables collection of visualization paths for overlaying propagation paths in a 3D view, and selects the path types to collect with a mask. The default is 0 (no collection), so the cost is paid only when debug visualization is needed.

**When / how** — The visualization snapshot is published by `st_off_ir_compute`, so set the mask **before** computing. After computing, read it with `st_off_debug_get_snapshot_info` → `st_off_debug_copy_visual_paths` in that order. To also see failed walks, enable `st_off_debug_set_collect_failed_walks` too. Check support with `ST_CAP_PATH_COLLECTION_MASK`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `mask` | Bitwise OR of `STPathCollectionFlag` — `ST_PATH_COLLECTION_GUIDE_RAY` (1) / `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY` (2) / `ST_PATH_COLLECTION_DIRECT_TRANSMISSION` (4) / `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION` (8, diffraction paths can contain reflection segments, so the two types share one bit) / `ST_PATH_COLLECTION_ALL`. 0 = no collection |

**Returns** — `1` = applied / `0` = failure (`context` NULL or undefined bits).

</details>

<details>
<summary><code>st_off_debug_set_collect_failed_walks</code> — Sets whether visualization collection also includes walks that failed midway</summary>

```c
void st_off_debug_set_collect_failed_walks(STOFF_Context* context, int enabled);
```

**Purpose** — By default, only completed paths are meaningfully used in the visualization snapshot. Enabling this option also records walks that failed midway, so you can debug why a path is not formed. Failed walks are marked with `STVisualPathRecord.valid` = 0.

**When / how** — Set it before computing, together with `st_off_debug_set_collect_visual_paths`. To receive failed walks, call `st_off_debug_copy_visual_paths` with `ST_VISUAL_PATH_COPY_ALL` (`VALID_ONLY` copies only completed paths). Off by default. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `enabled` | 0 = off (default) / otherwise = on |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_ir_compute</code> — Runs propagation and IR conversion once to build the canonical IR cache</summary>

```c
int st_off_ir_compute(STOFF_Context* context);
```

**Purpose** — The starting point of offline IR generation. For each registered listener it runs propagation (geometry) and IR conversion once, building a **canonical raw IR** in the cache for every listener × source pair. Raw IRs are not time-domain samples but a parametric form (energy-domain early taps, late-reverb send taps, first-order scattering cells, late-reverb descriptor), so they are computed only once regardless of IR length. Every later result is derived from this same generation.

- Raw IR queries: `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_*` — copy taps, cells and descriptors as is
- Pressure IR: `st_off_ir_render_pressure` (one pair) / `st_off_ir_render_pressure_mixed` (sum of several sources) — broadband mono or 9 separate bands
- Binaural IR: `st_off_ir_render_binaural` — stereo (L/R)
- Audition: `st_off_ir_render_audition_pair` — renders a dry signal through fixed-RIR convolution and through the engine render stage, separately

Render functions only consume the cache, so rendering many times with different lengths, output modes or HRTFs does not recompute.

**When / how** — Call it after setting up the scene (materials, meshes, objects), sources, listeners and propagation options and building the acceleration structure with `st_off_build`. Changes to the scene, sources, listeners or IR policy (atmosphere, distance attenuation, Doppler gain mode, energy targets, etc.) require another compute to show up in the results. Render-only settings (source EQ, switching the early spatial mode, delay ring length), on the other hand, keep the cache and apply from the next render. When the early spatial mode is `ST_EARLY_SPATIAL_BED`, a bed variant is also built for each pair (see `st_off_render_set_early_spatial_mode`). If visualization path collection is enabled, it also publishes a visualization snapshot of the same generation.

On success the cache generation (`st_off_ir_get_cache_generation`) changes and every result info carries that generation. If the computation fails or is canceled, no new cache is published and the previous cache remains. Read progress from another thread with `st_off_ir_get_progress`, and cancel with `st_off_ir_request_cancel`. It is rejected on a render-only context that loaded an archive with `st_off_ir_archive_load_pair`. When `maxComputeThreads` is greater than 1, parallel sections run on the context's compute pool workers. To compute several contexts in parallel, use the batch API (`st_off_batch_*`).

Thread: `[control, runs-here]` — the whole propagation and conversion pipeline **actually runs on the calling thread** and does not return until it finishes. It is serialized with this context's other jobs (render, queries) by the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — `1` = success (cache published) / `0` = failure. Computation failure, cancellation and render-only contexts give `ST_STATUS_INITIALIZATION_FAILED` ("canonical IR computation failed or was canceled").

</details>

<details>
<summary><code>st_off_ir_archive_save</code> — Saves the entire current canonical IR cache to a versioned archive file</summary>

```c
int st_off_ir_archive_save(STOFF_Context* context, const char* utf8Path);
```

**Purpose** — Keeps the computed canonical IR cache in a file so the same results can later be re-rendered without the scene, acceleration structure, propagation or IR conversion. Use it when you want to do the heavy computation only once and render (changing length, output mode, HRTF) in a separate process or at a separate time.

**When / how** — Call it when `st_off_ir_compute` has succeeded and a cache exists. No DSP runs. It writes to a temporary file, verifies it and then publishes it to the target path, and **does not overwrite an existing file** (it fails in that case). If the cache was computed with early spatial mode BED, the bed variant is saved too, and the current render delay ring length (`st_off_render_get_max_delay_seconds`) is recorded as well. Visualization snapshots are not saved. Load with `st_off_ir_archive_load_pair`. Loading requires the same format and engine version, and the host must additionally make sure it is the same binary (hash) as the DLL that created the archive. Works only on `ST_BACKEND_ST` contexts. Thread: `[control, runs-here]` — serialization and file writing run on the calling thread.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `utf8Path` | Path of the file to save (UTF-8, NUL-terminated). Rejected if empty. Fails if the file already exists |

**Returns** — `1` = success / `0` = failure. A NULL or empty path, or a non-ST backend, gives `ST_STATUS_INVALID_ARGUMENT`; no complete canonical cache or a save failure gives `ST_STATUS_UNAVAILABLE`. On failure, any existing file at the target path is left as is.

</details>

<details>
<summary><code>st_off_ir_archive_load_pair</code> — Loads one listener/source pair from an archive, making the context render-only</summary>

```c
int st_off_ir_archive_load_pair(STOFF_Context* context, const char* utf8Path, STListenerId listener, STSourceId source);
```

**Purpose** — Takes one recorded pair from an archive saved with `st_off_ir_archive_save` and installs it so it can be rendered right away, without the scene, BVH, propagation or IR conversion. Use it to listen again to a saved IR with no computation cost, or to render it with a different length or output mode.

**When / how** — Typically called on a freshly created offline context. The pair is installed into a new cold renderer, after which the context becomes **render-only**: `st_off_ir_compute` is rejected and renders never recompute implicitly. It remains render-only after `st_off_ir_clear_cache` or `st_off_trim_memory` (`ST_OFFLINE_TRIM_IR_CACHE`); load again to render again. The existing render and query functions (`st_off_ir_render_*`, `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_*`) take **the IDs recorded in the archive** as is. The render delay ring length changes to the value recorded in the archive (it can be changed again after loading); the early spatial mode does not change. Visualization snapshots are not restored. The format and engine version must match, and the host must also make sure it is the same binary as the DLL that created it. Works only on `ST_BACKEND_ST` contexts. Thread: `[control, runs-here]` — file reading and installation run on the calling thread.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `utf8Path` | Archive file path (UTF-8, NUL-terminated). Rejected if empty |
| `listener` | Listener ID of the pair to load (the value recorded in the archive) |
| `source` | Source ID of the pair to load (the value recorded in the archive) |

**Returns** — `1` = success / `0` = failure. A NULL or empty path, or a non-ST backend, gives `ST_STATUS_INVALID_ARGUMENT`; a pair missing from the archive, a format or version mismatch, or a canceled load gives `ST_STATUS_UNAVAILABLE`. On failure, the previously published cache is left as is.

</details>

<details>
<summary><code>st_off_ir_clear_cache</code> — Clears the canonical IR cache</summary>

```c
void st_off_ir_clear_cache(STOFF_Context* context);
```

**Purpose** — Clears the published offline query outputs (canonical raw IRs, archive records, visualization snapshot). The scene, engine options and propagation work buffers remain (to release the work buffers too, use `st_off_trim_memory`).

**When / how** — Call it to get memory back after you are done with a large cache, or to avoid accidentally rendering old results. After clearing, call `st_off_ir_compute` again before rendering or querying (until then, `ST_STATUS_UNAVAILABLE`). A render-only context loaded from an archive must be loaded again after clearing. Equivalent to `st_off_trim_memory(context, ST_OFFLINE_TRIM_IR_CACHE)`. Thread: `[control]` — takes the job mutex, so it may wait until an in-progress compute or render finishes.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_trim_memory</code> — Releases IR cache, work buffer and render state memory while keeping the scene and settings</summary>

```c
int st_off_trim_memory(STOFF_Context* context, uint32_t flags);
```

**Purpose** — Reduces the memory a context holds while idle (in a batch reuse pool, etc.). The scene, BVH, materials, sources, listeners and options remain, so the context need not be recreated; the next compute or render reacquires the buffers, and the results are bit-identical to an untrimmed context or a new context.

**When / how** — Choosing `ST_OFFLINE_TRIM_IR_CACHE` is equivalent to `st_off_ir_clear_cache`, so a compute is needed before the next render (a render-only context loaded from an archive is loaded again); without it, cached IRs can be rendered as is. For a context registered in a batch, call it after receiving that job's completion record with `st_off_batch_poll`. Check support with `ST_CAP_OFFLINE_TRIM_MEMORY`. `ST_BACKEND_EXA` contexts do not clear backend work buffers (the IR cache and execution frames are cleared). Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `flags` | Bitwise OR of `ST_OFFLINE_TRIM_*`. 0 does nothing |

`flags` bits:

| Bit | What it clears |
|---|---|
| `ST_OFFLINE_TRIM_IR_CACHE` (1) | Same as `st_off_ir_clear_cache` — canonical raw IRs, archive records, visualization snapshot. Compute required before the next render |
| `ST_OFFLINE_TRIM_PROPAGATION_SCRATCH` (2) | Maximum-size work buffers that the propagator, IR converter and execution frames hold for the next compute. Size follows the ray count and reflection order (e.g. about 23 MB at source 64×32 ×3, listener 64×64, depth 4). Cached IRs still render as is |
| `ST_OFFLINE_TRIM_RENDER_STATE` (4) | Render state that the next render rebuilds from scratch (source render state and path state, offline render plan) |
| `ST_OFFLINE_TRIM_ALL` | All three |

**Returns** — `1` = success (with `flags` = 0, does nothing and returns 1) / `0` = `context` NULL or undefined bits (`ST_STATUS_INVALID_ARGUMENT`, nothing cleared).

</details>

<details>
<summary><code>st_off_ir_get_progress</code> — Reads the progress (0–1) of an in-progress computation or render</summary>

```c
float st_off_ir_get_progress(const STOFF_Context* context);
```

**Purpose** — Reads progress **from another thread** while `st_off_ir_compute` holds the calling thread. Together with `st_off_ir_request_cancel`, it is the only pair intended to be called from another thread during a computation.

**When / how** — Poll it periodically from a UI thread or similar. Progress **starts at 1.0** — when the total amount of work is 0 it returns 1.0 as "nothing to do = done", so a polling loop that expects 0.0 can mistake it for completion before the computation starts. Decide completion from the return of `st_off_ir_compute` and use progress for display only. Thread: `[any]` — a lock-free atomic read, so it can be called from any thread without blocking.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — Progress `[0, 1]` (completed work ÷ total; 1.0 if the total is 0). `0` if `context` is NULL.

</details>

<details>
<summary><code>st_off_ir_request_cancel</code> — Stops an in-progress computation or render</summary>

```c
void st_off_ir_request_cancel(STOFF_Context* context);
```

**Purpose** — Stops a long-running `st_off_ir_compute` or render **from another thread**. Together with `st_off_ir_get_progress`, it is the only pair that can be called lock-free.

**When / how** — Call it from another thread while a computation or render runs. Only jobs already in progress at the time of the call are stopped; compute or render jobs started afterward are unaffected (it cannot be armed in advance). A canceled compute returns 0 and publishes no new cache, so the previous cache remains. A canceled render returns 0 and `ST_STATUS_UNAVAILABLE`. To stop an entire batch job, use `st_off_batch_cancel`. Thread: `[any]` — lock-free atomic, so it can be called from any thread without blocking.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_ir_get_cache_generation</code> — Reads the generation number of the current canonical IR cache</summary>

```c
uint64_t st_off_ir_get_cache_generation(const STOFF_Context* context);
```

**Purpose** — Returns the generation at which the cache was last published. The same number is carried in raw IR descriptors and every render result info (the `cacheGeneration` field), so the host can verify that results from several queries and renders **came from the same computation**.

**When / how** — 0 before a compute. It changes every time a compute succeeds. Compare it with `cacheGeneration` in tap copies and render results to check that no other thread recomputed in between. Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |

**Returns** — The current generation number. `0` if there is no cache (before a compute) or `context` is NULL.

</details>

<details>
<summary><code>st_off_ir_get_raw_descriptor</code> — Reads the raw IR summary (counts, generation, late-reverb descriptor, transport energy) of a listener/source pair</summary>

```c
int st_off_ir_get_raw_descriptor(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDescriptor* outDescriptor);
```

**Purpose** — Returns the raw IR header of one pair in the canonical cache. In one call you get the tap, cell and continuity ID counts (copy buffer sizes), speed of sound and sample rate, cache generation, late-reverb descriptor (T60, mean free path, room volume, etc.) and the source transport energy balance. It is the starting point for analyzing geometry and statistics data directly, bypassing the engine's render, or for feeding your own renderer.

**When / how** — Call it after `st_off_ir_compute` (or after loading an archive). Allocate buffers from the returned counts and copy the contents with `st_off_ir_copy_raw_early_taps` / `st_off_ir_copy_raw_diffuse_rain_cells` / `st_off_ir_copy_raw_reverb_send_taps` / `st_off_ir_copy_raw_continuity_ids`. Raw IRs are always the exact reference regardless of the early spatial mode. Check support with `ST_CAP_OFFLINE_RAW_IR`. Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `outDescriptor` | Struct that receives the result. The caller fills `structSize` = `sizeof(STRawIRDescriptor)`, `apiVersion` = `st_off_get_api_version()` |

**Struct** `STRawIRDescriptor`

| Field | Description |
|---|---|
| `structSize`, `apiVersion` | Version stamp filled by the caller |
| `cacheGeneration` | Cache generation this result belongs to |
| `listenerId`, `sourceId` | IDs of the pair |
| `sampleRate` | Sample rate (fixed at 44100 Hz) |
| `soundSpeedMetersPerSecond` | Speed of sound used for this computation (m/s). Derived from the atmosphere settings |
| `earlyTapCount` | Number of raw early taps (required count for `st_off_ir_copy_raw_early_taps`). Counts geometric paths only |
| `reverbSendTapCount` | Number of late-reverb send taps (required count for `st_off_ir_copy_raw_reverb_send_taps`) |
| `continuityIdCount` | Total number of continuity IDs (required count for `st_off_ir_copy_raw_continuity_ids`) |
| `sourceTransportEnergy` | `STRawIRSourceTransportEnergy` — source transport energy balance (table below) |
| `lateReverb` | `STRawIRReverbDescriptor` — late-reverb field descriptor (table below) |
| `diffuseRainCellCount` | Number of first-order scattering cells (required count for `st_off_ir_copy_raw_diffuse_rain_cells`). Support is indicated by `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` |
| `reserved[5]` | Reserved |

**Struct** `STRawIRSourceTransportEnergy` — all 9-band arrays are in the energy domain.

| Field | Description |
|---|---|
| `valid` | 1 = values valid / 0 = none |
| `emitted[9]` | Energy emitted by source transport |
| `diffuseReleased[9]` | Energy released as diffuse energy into the late-reverb send |
| `escapedCoherent[9]` | Energy that escaped while still coherent |
| `depthRemainder[9]` | Energy remaining at the reflection depth limit |
| `boundaryAndAirLoss[9]` | Energy lost to boundaries (absorption) and air absorption |

**Struct** `STRawIRReverbDescriptor` — reflectance and air terms are in the energy domain; `diffuseFieldPressureGain`, `level` and `dryInputGain` are pressure-domain linear multipliers.

| Field | Description |
|---|---|
| `valid` | 1 = values valid / 0 = none |
| `avgReflection[9]` | Average reflectance (energy) |
| `airEnergyGainPerMeanFreePath[9]` | Air absorption energy gain over one mean free path |
| `eyringT60Seconds[9]` | Eyring reverberation time T60 (seconds) |
| `diffuseFieldPressureGain[9]` | Diffuse-field pressure gain (pressure domain) |
| `roomVolumeMetersCubed` | Estimated room volume (m³) |
| `meanFreePath` | Mean free path (m) |
| `meanFreeFlightTimeSeconds` | Mean free flight time (seconds) |
| `boundaryHitRatio` | Boundary hit ratio (dimensionless) |
| `reserved[2]` | Reserved |
| `level` | Late level (pressure domain) |
| `dryInputGain` | Dry input gain (pressure domain) |

Length and volume outputs are in real meters with `sceneRatio` applied.

**Returns** — `1` = success / `0` = failure. A NULL `outDescriptor` or a wrong stamp gives `ST_STATUS_INVALID_ARGUMENT`; no cache or no such pair gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_early_taps</code> — Copies the raw early taps (direct, transmission, reflection, diffraction paths) of a pair</summary>

```c
int st_off_ir_copy_raw_early_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRTap* outTaps, int tapCapacity);
```

**Purpose** — Exports each geometric path as an energy-domain tap (path type, delay, 9-band energy gain, arrival direction, path length, Doppler slope, path ID). Use it to compute geometric metrics such as direct-sound arrival time, ITDG and path count, or to drive your own renderer. If you need pressure, apply `sqrt` **once** to each band energy.

**When / how** — Raw early taps are **geometric paths only**. The first-order scattering (diffuse rain) cells that go into pressure IR renders are a statistical component gathered into 1 ms cells, so they are not included here (nor in `earlyTapCount` or the continuity IDs); receive them separately with `st_off_ir_copy_raw_diffuse_rain_cells`. Geometric metrics are therefore not perturbed by those cells. Size query: calling with `outTaps` = NULL and `tapCapacity` = 0 returns the required count (same as `STRawIRDescriptor.earlyTapCount`). Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `outTaps` | Caller array that receives the taps. NULL = size query (`tapCapacity` must then be 0) |
| `tapCapacity` | Number of elements in `outTaps`. 0 or more |

**Struct** `STRawIRTap` (energy domain)

| Field | Description |
|---|---|
| `pathType` | 0 = Direct / 1 = Transmission / 2 = Reflection / 3 = Diffraction |
| `depth` | Interaction order |
| `delaySeconds` | Arrival delay (seconds) |
| `delaySamples` | Arrival delay (44.1 kHz samples, fractional) |
| `bandEnergyGain[9]` | 9-band energy gain. Pressure is obtained with `sqrt` |
| `dirFromListener[3]` | Arrival direction as seen from the listener |
| `matchDirFromListener[3]` | Listener-side direction (world coordinates) used only for path correspondence (continuity matching) |
| `matchDirFromSource[3]` | Source-side direction (world coordinates) used only for path correspondence (continuity matching) |
| `pathLengthMeters` | Path length (m, `sceneRatio` applied) |
| `relativeSpeed` | Relative speed (m/s) — `delayChangePerSample` × speed of sound |
| `delayChangePerSample` | Delay change per sample (Doppler slope) |
| `pathId` | 64-bit topology-based path ID (key that matches the same path across computations) |
| `interactionSignature` | Interaction and material discriminator that separates physical branches sharing the same `pathId` |
| `continuityOffset` | Index at which this tap's continuity IDs start in the `st_off_ir_copy_raw_continuity_ids` array |
| `continuityCount` | Number of continuity IDs of this tap. 0 for a unique path (`pathId` is that ID) |

**Returns** — The number of taps copied (or required). Failure is `0`: negative capacity, or `outTaps` NULL with non-zero capacity, gives `ST_STATUS_INVALID_ARGUMENT`; insufficient capacity gives `ST_STATUS_BUFFER_TOO_SMALL`; no cache or pair gives `ST_STATUS_UNAVAILABLE`. A valid result with no taps is also 0, so distinguish with `st_off_get_last_status`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_diffuse_rain_cells</code> — Copies the first-order scattering (diffuse rain) cells of a pair</summary>

```c
int st_off_ir_copy_raw_diffuse_rain_cells(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDiffuseRainCell* outCells, int cellCapacity);
```

**Purpose** — Exports the statistical component that gathers scattered energy going straight from scattering points to the listener into 1 ms cells after the direct sound. Pressure and binaural renders render these cells as the late stem (they are not geometric paths, so they are not in `st_off_ir_copy_raw_early_taps`). Use it to decompose a rendered IR into raw components or to reproduce first-order scattering in your own renderer.

**When / how** — The contract is the same as the other raw copies: with `outCells` = NULL and `cellCapacity` = 0 it returns the required count (same as `STRawIRDescriptor.diffuseRainCellCount`). 0 if there is no scattering. Rendered pressure = `polarity` × √(energy). Check support with `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` of `st_off_get_capability_word(1)`. Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `outCells` | Caller array that receives the cells. NULL = size query (`cellCapacity` must then be 0) |
| `cellCapacity` | Number of elements in `outCells`. 0 or more |

**Struct** `STRawIRDiffuseRainCell` (energy domain)

| Field | Description |
|---|---|
| `pathId` | Deterministic ID determined by the cell number alone (the same cell has the same ID) |
| `cellIndex` | 1 ms cell number after the direct sound (from 0) |
| `polarity` | Render pressure sign +1 / −1 (deterministic per cell) |
| `delaySeconds` | Energy-weighted arrival time within the cell (seconds) |
| `delaySamples` | Same value (44.1 kHz samples) |
| `bandEnergyGain[9]` | 9-band energy gain |
| `dirFromListener[3]` | Energy-weighted arrival direction (listener local) |
| `delayChangePerSample` | Delay change per sample |
| `reserved[4]` | Reserved |

**Returns** — The number of cells copied (or required). Failure is `0`: argument errors give `ST_STATUS_INVALID_ARGUMENT`, insufficient capacity gives `ST_STATUS_BUFFER_TOO_SMALL`, no cache or pair gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_reverb_send_taps</code> — Copies the late-reverb send taps (diffuse energy events) of a pair</summary>

```c
int st_off_ir_copy_raw_reverb_send_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRReverbSendTap* outTaps, int tapCapacity);
```

**Purpose** — Exports the statistical diffuse energy events obtained from source transport (the send taps that excite the late-reverb tank). In the engine render these taps are realized as pressure and fed into the FDN. Exact early paths (direct, transmission, reflection, diffraction) do not go into the FDN and are rendered on a separate path. Use it to analyze the time and spectral input of the late reverb or to feed your own reverberator.

**When / how** — With `outTaps` = NULL and `tapCapacity` = 0 it returns the required count (same as `STRawIRDescriptor.reverbSendTapCount`). The render request's `reverbSendMask` selects which of these taps excite the tank. Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `outTaps` | Caller array that receives the taps. NULL = size query (`tapCapacity` must then be 0) |
| `tapCapacity` | Number of elements in `outTaps`. 0 or more |

**Struct** `STRawIRReverbSendTap` (energy domain)

| Field | Description |
|---|---|
| `sourcePathType` | Source-side path family routing tag (currently Reflection for source transport) |
| `role` | `STReverbSendRole` — the only current value is `ST_REVERB_SEND_OBSERVED_SCATTER`(0) |
| `depth` | Stable transport time-bin ordinal |
| `reserved0` | Reserved |
| `delaySeconds` | Delay (seconds) |
| `delaySamples` | Delay (44.1 kHz samples) |
| `bandEnergy[9]` | 9-band energy |
| `matchDirFromSource[3]` | Source-side direction |
| `pathLengthMeters` | Path length (m, `sceneRatio` applied) |
| `relativeSpeed` | Relative speed (m/s) |
| `delayChangePerSample` | Delay change per sample |
| `pathId` | 64-bit path ID |

**Returns** — The number of taps copied (or required). Failure is `0`: argument errors give `ST_STATUS_INVALID_ARGUMENT`, insufficient capacity gives `ST_STATUS_BUFFER_TOO_SMALL`, no cache or pair gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_continuity_ids</code> — Copies the continuity path ID array of the raw early taps</summary>

```c
int st_off_ir_copy_raw_continuity_ids(STOFF_Context* context, STListenerId listener, STSourceId source, uint64_t* outPathIds, int idCapacity);
```

**Purpose** — When paths merged into one tap carry several topology path IDs, exports those IDs (aliases), judged to be the same path, as one flat array. The IDs of tap `i` are `outPathIds[taps[i].continuityOffset .. + taps[i].continuityCount)`. The range is empty for the tap of a unique path (`pathId` is that ID). Use it when the host matches paths across computation results itself, to recognize the same path even if the representative `pathId` changes.

**When / how** — Copy it together with `st_off_ir_copy_raw_early_taps` from the same cache generation (first-order scattering cells are not included). With `outPathIds` = NULL and `idCapacity` = 0 it returns the required count (same as `STRawIRDescriptor.continuityIdCount`). Thread: `[control]` — takes the job mutex.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `outPathIds` | Caller array that receives the 64-bit path IDs. NULL = size query (`idCapacity` must then be 0) |
| `idCapacity` | Number of elements in `outPathIds`. 0 or more |

**Returns** — The number of IDs copied (or required). Failure is `0`: argument errors give `ST_STATUS_INVALID_ARGUMENT`, insufficient capacity gives `ST_STATUS_BUFFER_TOO_SMALL`, no cache or pair gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_init_pressure_request</code> — Fills a pressure IR request struct with defaults</summary>

```c
void st_off_ir_init_pressure_request(STOfflinePressureIRRequestOptions* outOptions);
```

**Purpose** — Fills the version stamp and defaults of `STOfflinePressureIRRequestOptions` in one call. Before passing it to a pressure IR render (`st_off_ir_render_pressure`, `st_off_ir_render_pressure_mixed`, `st_off_batch_add_pressure_render*`), always initialize it with this function and then change only the fields you need.

**When / how** — Can be called at any time. Thread: `[any]` — it only fills the caller's struct, so it can be called from any thread without blocking.

| Parameter | Description |
|---|---|
| `outOptions` | Struct to fill. Does nothing if NULL |

**Struct** `STOfflinePressureIRRequestOptions`

| Field | Default | Description |
|---|---|---|
| `structSize` | `sizeof(STOfflinePressureIRRequestOptions)` | Version stamp |
| `apiVersion` | Value of `st_off_get_api_version()` | Version stamp |
| `outputMode` | `ST_PRESSURE_IR_BROADBAND_MONO`(0) | `STPressureIROutput` — `ST_PRESSURE_IR_BROADBAND_MONO` (0, broadband mono, 1 channel) / `ST_PRESSURE_IR_SEPARATE_BANDS` (1, 9 separate bands). Within the same request, mono = sum of the 9 bands holds |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | Components to include in the result. OR of `ST_OFFLINE_OUTPUT_DIRECT` (1) / `TRANSMISSION` (2) / `REFLECTION` (4) / `DIFFRACTION` (8) / `LATE_REVERB` (16). Groups `ST_OFFLINE_OUTPUT_EARLY_ALL` (the 4 early types) and `ST_OFFLINE_OUTPUT_FULL` (all). `LATE_REVERB` carries the late reverb and the first-order scattering cells together. Bits outside `FULL` are rejected |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | Selects which send taps excite the late-reverb tank using the 4 early-path bits (`ST_OFFLINE_OUTPUT_DIRECT` · `TRANSMISSION` · `REFLECTION` · `DIFFRACTION`). `ST_OFFLINE_REVERB_SEND_ALL` = `ST_OFFLINE_OUTPUT_EARLY_ALL`. Bits outside `EARLY_ALL` are rejected |
| `renderMethod` | 0 | Renderer selector. There is one pressure IR renderer, and 0, 1 and 2 (`ST_PRESSURE_IR_RENDER_SIMULATE` / `SYNTHESIZE_EXACT` / `SIMULATE2`, legacy aliases) all go to the same render with byte-identical results. New code uses 0. Other values are rejected |
| `reserved[9]` | 0 | Reserved |

`outputMask` decides which components are heard (returned), and `reverbSendMask` decides which send taps excite the late tank. For example, setting `outputMask` = `ST_OFFLINE_OUTPUT_LATE_REVERB` only yields just the late stem without the early paths.

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_ir_get_pressure_band_centers</code> — Copies the band center frequencies (Hz) of 9-band pressure IRs</summary>

```c
int st_off_ir_get_pressure_band_centers(float* outHz, int capacity);
```

**Purpose** — Tells which frequency band band `b` of an `ST_PRESSURE_IR_SEPARATE_BANDS` result is. The engine bands are the 9 bands 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz (`ST_FREQUENCY_BANDS`).

**When / how** — Can be called at any time without a context. Use the values as labels when saving or plotting band-separated IRs. Check support with `ST_CAP_OFFLINE_PRESSURE_BAND_METADATA`. Thread: `[any]` — copies compile-time constants.

| Parameter | Description |
|---|---|
| `outHz` | Array that receives the center frequencies. NULL = size query (`capacity` is then 0) |
| `capacity` | Number of elements in `outHz`. Must be 9 or more |

**Returns** — The band count `9` (successful copy or size query). `0` if `capacity` is less than 9, or if `outHz` is NULL and `capacity` is not 0.

</details>

<details>
<summary><code>st_off_ir_render_pressure</code> — Renders the pressure IR (broadband mono or 9 bands) of one listener/source pair</summary>

```c
int st_off_ir_render_pressure(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**Purpose** — Renders one pair from the canonical cache as a time-domain pressure impulse response (RIR). Exact early paths and send taps are synthesized as impulses, and the late reverb is rendered with the FDN. Use it for acoustic analysis (T60, C80, EDT, etc.), comparison with measurements, or extracting IRs for external convolution reverbs. It is an unspatialized pressure signal and is always the exact reference regardless of the early spatial mode.

**When / how** — Call it after `st_off_ir_compute`. The result is written in one go to a caller-owned buffer.

1. Size query: calling with `outValues` = NULL and `capacityValues` = 0 returns the required value count, and also fills `outInfo` if the pair is valid.
2. Allocate a buffer of that size and call again.

The sample rate is fixed at 44100 Hz. The length is `floor(seconds × 44100)` frames; the value count is the frame count for mono, or 9 × the frame count for separate bands. The band-separated layout is `values[band × bandStride + sample]` (`bandStride` = `frameCount`). Output is absolute level, **not normalized**, and there is no normalization option. Exact paths arriving later than the delay ring limit (`st_off_render_set_max_delay_seconds`, default 4 s) are dropped. If a source EQ is set, the same filter is applied. Rendering the same request repeatedly is bit-identical. It can be stopped from another thread with `st_off_ir_request_cancel`. Check support with `ST_CAP_OFFLINE_PRESSURE_IR`. Thread: `[control, blocking]` — the render runs on the calling thread and is serialized with this context's other jobs.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `seconds` | IR length (seconds). A finite positive value, at least 1 frame |
| `options` | Request initialized with `st_off_ir_init_pressure_request`. Must not be NULL. See that entry for the fields |
| `outValues` | Caller buffer (float) that receives the result. NULL = size query |
| `capacityValues` | Number of floats in `outValues`. 0 for a size query |
| `outInfo` | Result metadata. NULL allowed. If passed, the caller fills `structSize` = `sizeof(STOfflinePressureIRInfo)` and `apiVersion` |

**Struct** `STOfflinePressureIRInfo`

| Field | Description |
|---|---|
| `structSize`, `apiVersion` | Version stamp filled by the caller |
| `cacheGeneration` | Cache generation used for the render |
| `listenerId` | Listener ID |
| `sourceId` | Source ID. `-1` for mixed renders |
| `sampleRate` | 44100 |
| `frameCount` | Frame count |
| `bandCount` | 1 (broadband mono) or 9 (separate bands) |
| `bandStride` | Stride between bands = `frameCount` |
| `valueCount` | Total float count = `frameCount × bandCount` |
| `outputMode` | The `STPressureIROutput` actually used |
| `reverbSendTapCount` | Number of send taps that went into the render (sum per source for mixed renders) |
| `outputMask`, `reverbSendMask` | The masks actually used |
| `sourceCount` | Number of sources that went into the render. 1 for a solo render |
| `reserved[9]` | Reserved |

**Returns** — The number of floats written (or required). Failure is `0`: no cache gives `ST_STATUS_UNAVAILABLE`; an invalid request, length, mask or stamp, or a missing pair in a size query, gives `ST_STATUS_INVALID_ARGUMENT`; a too-small buffer gives `ST_STATUS_BUFFER_TOO_SMALL`; render failure or cancellation gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_render_pressure_mixed</code> — Renders one combined pressure IR for one listener and several sources at once</summary>

```c
int st_off_ir_render_pressure_mixed(STOFF_Context* context, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**Purpose** — Instead of rendering the RIRs of several sources for the same listener separately and adding them, puts them all into one impulse render and produces a single RIR. The result equals the sum of the per-source `st_off_ir_render_pressure` results: exact taps accumulate into the same output in request order, and sends accumulate on the listener side with their amplitude (including sign) intact, so the FDN runs only once. Because the FDN is linear and time-invariant, the late part also adds coherently like the solo sum, while the FDN cost is paid once. Use it when you need the RIR of a scene where several sources sound at the same time.

**When / how** — Call it after `st_off_ir_compute`. The buffer and size-query conventions, length, sample rate and lack of normalization are the same as `st_off_ir_render_pressure`. You may include only some of that listener's sources. Only the floating-point summation order differs from the solo sum, so it is not bit-identical; the summation order is the order of the `sources` array (independent of source registration order). Repeated renders of the same request are bit-identical, and with `sourceCount` = 1 it is bit-identical to a solo render. Raw IR queries remain per source. Check support with `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`. Thread: `[control, blocking]` — the render runs on the calling thread.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `sources` | Array of source handles. No duplicates; all must be canonical pairs of that listener |
| `sourceCount` | Number of sources. At least `1` and at most `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES` (1024) |
| `seconds` | IR length (seconds). A finite positive value, at least 1 frame |
| `options` | Request initialized with `st_off_ir_init_pressure_request` |
| `outValues` | Result buffer. NULL = size query |
| `capacityValues` | Number of floats in `outValues`. 0 for a size query |
| `outInfo` | Result metadata (`STOfflinePressureIRInfo`; see `st_off_ir_render_pressure` for the fields). NULL allowed. `sourceId` = -1, `sourceCount` = number of sources, `reverbSendTapCount` = sum across sources |

**Returns** — The number of floats written (or required). Failure is `0`: no cache gives `ST_STATUS_UNAVAILABLE`; duplicate or unregistered sources or an invalid request give `ST_STATUS_INVALID_ARGUMENT`; a too-small buffer gives `ST_STATUS_BUFFER_TOO_SMALL`; render failure or cancellation gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_init_binaural_request</code> — Fills a binaural IR request struct with defaults</summary>

```c
void st_off_ir_init_binaural_request(STOfflineBinauralIRRequestOptions* outOptions);
```

**Purpose** — Fills the version stamp and defaults of `STOfflineBinauralIRRequestOptions`. Always initialize it with this function before passing it to `st_off_ir_render_binaural` or `st_off_ir_render_audition_pair`.

**When / how** — The default `hrtfType` is SADIE D2, which requires the external asset file (see the search order in the `st_off_render_set_spatializer` entry). To use it without the asset, change `hrtfType` to `ST_SPATIALIZER_MIT_KEMAR` (1, built in) or `ST_SPATIALIZER_PANNING` (0). Thread: `[any]` — it only fills the caller's struct.

| Parameter | Description |
|---|---|
| `outOptions` | Struct to fill. Does nothing if NULL |

**Struct** `STOfflineBinauralIRRequestOptions`

| Field | Default | Description |
|---|---|---|
| `structSize` | `sizeof(STOfflineBinauralIRRequestOptions)` | Version stamp |
| `apiVersion` | Value of `st_off_get_api_version()` | Version stamp |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | Components to include in the result (`ST_OFFLINE_OUTPUT_*`, same meaning as in the `st_off_ir_init_pressure_request` entry) |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | Send taps that excite the late tank (4 early-path bits) |
| `hrtfType` | `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) | `STSpatializerType` — `PANNING`(0) / `MIT_KEMAR`(1) / `SADIE_D2_KEMAR`(2) |
| `reserved[10]` | 0 | Reserved |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_ir_render_binaural</code> — Renders the binaural (stereo L/R) IR of one listener/source pair</summary>

```c
int st_off_ir_render_binaural(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflineBinauralIRRequestOptions* options, float* outInterleavedLR, int capacityFrames, STOfflineBinauralIRInfo* outInfo);
```

**Purpose** — Renders one pair from the canonical cache as a 2-channel impulse response spatialized with an HRTF. Use it to obtain a BRIR for headphone listening or to feed an external convolver. Early reflection paths follow the early spatial mode at render time (`st_off_render_set_early_spatial_mode`).

**When / how** — Call it after `st_off_ir_compute`; size queries work as for pressure IRs (`outInterleavedLR` = NULL, `capacityFrames` = 0 → required frame count and `outInfo`). `capacityFrames` is the number of **stereo frames**, not floats, and the buffer must hold frame count × 2 floats, L/R interleaved (`[L0, R0, L1, R1, …]`). The length is `floor(seconds × 44100)` frames, and the sample rate is fixed at 44100 Hz. The limiter and normalization are always off (no normalization option). In OBJECTS mode, path fades and Doppler are also fixed off; BED mode is the synchronous real-time bed path, so it renders in steady state with path fades, Doppler and gain ramps on at their real-time defaults (no effect on the result in a static scene). If the SADIE D2 asset is missing, even the size query fails. Check support with `ST_CAP_OFFLINE_BINAURAL_IR`. Thread: `[control, blocking]` — the render runs on the calling thread.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `seconds` | IR length (seconds). A finite positive value, at least 1 frame |
| `options` | Request initialized with `st_off_ir_init_binaural_request`. Must not be NULL |
| `outInterleavedLR` | L/R interleaved result buffer. NULL = size query |
| `capacityFrames` | Number of **stereo frames** in the buffer. 0 for a size query |
| `outInfo` | Result metadata. NULL allowed. If passed, the caller fills `structSize` = `sizeof(STOfflineBinauralIRInfo)` and `apiVersion` |

**Struct** `STOfflineBinauralIRInfo`

| Field | Description |
|---|---|
| `structSize`, `apiVersion` | Version stamp filled by the caller |
| `cacheGeneration` | Cache generation used for the render |
| `listenerId`, `sourceId` | IDs of the pair |
| `sampleRate` | 44100 |
| `frameCount` | Number of stereo frames |
| `channelCount` | Always 2 |
| `valueCount` | Float count = `frameCount × 2` |
| `reverbSendTapCount` | Number of send taps that went into the render |
| `outputMask`, `reverbSendMask` | The masks actually used |
| `hrtfType` | The `STSpatializerType` actually used |
| `earlySpatialMode` | The `STEarlySpatialMode` actually used (support: `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`) |
| `reserved[9]` | Reserved |

**Returns** — The number of stereo frames written (or required). Failure is `0`: no cache, a missing SADIE D2 asset, or BED mode with no bed variant in the cache gives `ST_STATUS_UNAVAILABLE`; an invalid request or stamp, or a missing pair in a size query, gives `ST_STATUS_INVALID_ARGUMENT`; a too-small buffer gives `ST_STATUS_BUFFER_TOO_SMALL`; render failure or cancellation gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_render_audition_pair</code> — Renders a dry signal through fixed-RIR convolution and through the engine render stage, returning both as a pair</summary>

```c
int st_off_ir_render_audition_pair(STOFF_Context* context, STListenerId listener, STSourceId source, double irSeconds, const STOfflineBinauralIRRequestOptions* options, const float* dryMono, int dryFrames, float* outConvolvedLR, float* outStageLR, int capacityFrames, STOFF_AuditionInfo* outInfo);
```

**Purpose** — Produces two listening results from the same canonical pair: (1) the dry signal convolved with the binaural IR rendered as a fixed RIR, and (2) the dry signal passed directly through the engine's render stage (the stage shared with real-time rendering) with the same pair installed. Listen to or compare the two side by side to check how well the extracted IR represents the sound the engine actually produces.

**When / how** — Call it after `st_off_ir_compute`. Both output buffers are L/R interleaved stereo frames; pass both or leave both NULL. If both are NULL, `capacityFrames` must be 0 and `dryMono` may also be NULL, making it a metadata query that only computes sizes from `dryFrames`. The output length is `dryFrames + irFrames − 1` frames (`irFrames` = `floor(irSeconds × 44100)`), and each buffer must hold that frame count × 2 floats. The rules for the spatializer, masks, early spatial mode and limiter/normalization off are the same as `st_off_ir_render_binaural`. Thread: `[control, blocking]` — the render runs on the calling thread.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `source` | Source handle |
| `irSeconds` | IR length used for the convolution (seconds). A finite positive value, at least 1 frame |
| `options` | Request initialized with `st_off_ir_init_binaural_request` (`STOfflineBinauralIRRequestOptions`; see that entry for the fields) |
| `dryMono` | 44.1 kHz mono dry signal. Required when rendering; NULL allowed for a size query |
| `dryFrames` | Number of dry signal frames. At least 1 (also required for a size query) |
| `outConvolvedLR` | Fixed-RIR convolution result (L/R interleaved). NULL together with `outStageLR` = size query |
| `outStageLR` | Engine render stage result (L/R interleaved) |
| `capacityFrames` | Number of stereo frames in each buffer. 0 for a size query |
| `outInfo` | Result metadata. NULL allowed. If passed, the caller fills `structSize` = `sizeof(STOFF_AuditionInfo)` and `apiVersion` |

**Struct** `STOFF_AuditionInfo`

| Field | Description |
|---|---|
| `structSize`, `apiVersion` | Version stamp filled by the caller |
| `cacheGeneration` | Cache generation used for the render |
| `listenerId`, `sourceId` | IDs of the pair |
| `sampleRate` | 44100 |
| `frameCount` | Number of output stereo frames = `dryFrameCount + irFrameCount − 1` |
| `dryFrameCount` | Number of dry signal frames |
| `irFrameCount` | Number of IR frames |
| `earlySpatialMode` | The `STEarlySpatialMode` actually used |
| `reserved[7]` | Reserved |

**Returns** — The number of output stereo frames. Failure is `0`: no cache, a missing SADIE D2 asset, or BED mode with no bed variant gives `ST_STATUS_UNAVAILABLE`; only one buffer NULL, `dryFrames` of 0 or less, or an invalid request gives `ST_STATUS_INVALID_ARGUMENT`; a too-small buffer gives `ST_STATUS_BUFFER_TOO_SMALL`; render failure or cancellation gives `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_debug_get_snapshot_info</code> — Reads the diagnostic snapshot summary (path counts, visualization buffer sizes) for a listener's last computed generation</summary>

```c
int st_off_debug_get_snapshot_info(STOFF_Context* context, STListenerId listener, STPropagationSnapshotInfo* outInfo);
```

**Purpose** — Returns the summary of the diagnostic snapshot that the last `st_off_ir_compute` published for that listener. `frameGeneration` guarantees that the total, reflection and diffraction path counts, the diffraction classification counters and the visualization path and point counts **all come from one generation**. Use it to check path counts and to size buffers for `st_off_debug_copy_visual_paths`.

**When / how** — The snapshot is published by `st_off_ir_compute`, so it returns 0 before that. To receive visualization paths and points, enable collection with `st_off_debug_set_collect_visual_paths` before computing. Passing the returned `frameGeneration` as is to `st_off_debug_copy_visual_paths` lets you check that you copy the same generation. Thread: `[control]` — takes the job and visualization mutexes.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `outInfo` | Result struct. The caller fills `structSize` = `sizeof(STPropagationSnapshotInfo)` and `apiVersion` |

**Struct** `STPropagationSnapshotInfo`

| Field | Description |
|---|---|
| `structSize`, `apiVersion` | Version stamp filled by the caller |
| `frameGeneration` | Generation of this snapshot (the IR cache generation, offline) |
| `collectionMask` | The `STPathCollectionFlag` mask used when this generation was collected |
| `reserved0` | Reserved |
| `visualPathCount` | Total number of visualization path records (including failed walks; required count for `ST_VISUAL_PATH_COPY_ALL`) |
| `validVisualPathCount` | Number of completed path records (required count for `ST_VISUAL_PATH_COPY_VALID_ONLY`) |
| `visualPointCount` | Total number of visualization points |
| `validVisualPointCount` | Number of points of completed paths |
| `totalPathCount` | Total number of paths |
| `reflectionPathCount` | Number of reflection paths |
| `diffractionPathCount` | Number of diffraction paths |
| `sourceSideOnlyPaths` | Number of paths diffracted only at source-side edges |
| `unclassifiedPaths` | Number of unclassified diffraction paths |
| `sourceSideEvents` | Number of source-side diffraction events |
| `terminalOnlyPaths` | Number of paths diffracted only at listener-side terminal edges |
| `sourceAndTerminalPaths` | Number of paths diffracted on both sides |
| `terminalEvents` | Number of listener-side terminal diffraction events |
| `reserved[4]` | Reserved |

Completed paths and their points occupy the front (prefix) of each array.

**Returns** — `1` = success / `0` = failure or no snapshot (before a compute, no such listener, `outInfo` NULL or stamp mismatch).

</details>

<details>
<summary><code>st_off_debug_copy_visual_paths</code> — Copies visualization path records and points into caller buffers</summary>

```c
int st_off_debug_copy_visual_paths(STOFF_Context* context, STListenerId listener, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**Purpose** — Copies the visualization paths of the last computed generation (source → interaction points → listener; guide rays are listener → hit point) into a record array and a point array so they can be drawn in a 3D view. Vertex coordinates are in scene units as is, so they can be overlaid directly on the host scene.

**When / how** — Get the counts with `st_off_debug_get_snapshot_info`, allocate buffers, then call it. There is no size-query mode — it fails if a capacity is smaller than the required count. Passing the value returned by `st_off_debug_get_snapshot_info` as `frameGeneration` makes it fail if a new generation was published in between. Passing 0 copies the current snapshot without a generation check. The points of record `i` are `outPoints[pointOffset .. pointOffset + pointCount)`. Thread: `[control]` — takes the job and visualization mutexes.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `listener` | Listener handle |
| `frameGeneration` | Expected generation (the value from `st_off_debug_get_snapshot_info`). 0 = current snapshot without a check |
| `copyMode` | `STVisualPathCopyMode` — `ST_VISUAL_PATH_COPY_VALID_ONLY` (0, completed paths only) / `ST_VISUAL_PATH_COPY_ALL` (1, including failed walks). Other values are rejected |
| `outPaths` | Path record buffer. Must not be NULL if there are paths to copy |
| `pathCapacity` | Number of elements in `outPaths`. At least the path count for the mode |
| `outPoints` | Point buffer. Must not be NULL if there are points to copy |
| `pointCapacity` | Number of elements in `outPoints`. At least the point count for the mode |

**Struct** `STVisualPathRecord`

| Field | Description |
|---|---|
| `pointOffset`, `pointCount` | Range this path's points occupy in the point array (ordered path) |
| `depth` | Interaction order |
| `pathKind` | `STPathKind` — `ST_PATH_GUIDE_RAY` (0) / `ST_PATH_DIRECT` (1, includes transmission) / `ST_PATH_REFLECTION` (2) / `ST_PATH_DIFFRACTION_S` (4, source-side edge) / `ST_PATH_DIFFRACTION_L` (8, listener-side terminal edge) / `ST_PATH_DIFFRACTION_SL` (12) / `ST_PATH_SOURCE_TRANSPORT_RAY` (16). `ST_PATH_DIFFRACTION_UNKNOWN` (3) does not occur normally |
| `soundSourceIndex` | Source index. -1 for guide rays |
| `valid` | 1 = completed / 0 = walk that failed midway |
| `totalLengthMeters` | Total path length (m, `sceneRatio` applied) |
| `reserved0` | Reserved |

**Struct** `STVisualPoint`

| Field | Description |
|---|---|
| `x`, `y`, `z` | Vertex coordinates (scene units as is) |
| `flags` | `STVisualPointFlag` — `ST_VISUAL_POINT_NONE` (0) / `ST_VISUAL_POINT_DIFFRACTION` (1, diffraction point) |

**Returns** — `1` = success / `0` = failure. An invalid `copyMode` or a NULL required buffer gives `ST_STATUS_INVALID_ARGUMENT`; no snapshot or a changed generation gives `ST_STATUS_UNAVAILABLE`; insufficient capacity gives `ST_STATUS_BUFFER_TOO_SMALL`.

</details>

<details>
<summary><code>st_off_debug_copy_mesh_accel_nodes</code> — Copies the node boxes of a mesh BLAS for visualization</summary>

```c
int st_off_debug_copy_mesh_accel_nodes(STOFF_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**Purpose** — Copies, read-only, the node bounding boxes of the mesh acceleration structure (BLAS) used by propagation. Use it for debug visualization of how the acceleration structure partitioned a mesh. Same contract as the real-time `st_rt_debug_copy_mesh_accel_nodes`; the offline context builds BLASes with the same bounds settings as real time, so the results match for the same acceleration structure type.

**When / how** — Can be called any time after the mesh is created. The BLAS is built with the `st_off_scene_set_accel` value at mesh creation time. Nodes are in depth-first **pre-order** with the root at `[0]` (depth 0), and each node's parent is the nearest depth − 1 node earlier in the array. Coordinates are in the vertex frame passed to `st_off_mesh_create` (mesh local), so to draw an instance the host multiplies by the object transform. Large meshes have thousands of nodes, so you usually look only at the upper levels with `maxDepth`. If the buffer is too small only the front of the pre-order (starting from the leftmost branch) is written, so to get the upper levels, cut with `maxDepth`. Check support with `ST_CAP_ACCEL_DEBUG_NODES`. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `mesh` | Mesh handle |
| `maxDepth` | Negative = all depths. If 0 or more, only nodes with depth up to `maxDepth` are counted and written |
| `outNodes` | Node buffer. NULL = size query (`nodeCapacity` ignored) |
| `nodeCapacity` | Number of elements in `outNodes`. Writes min(total, `nodeCapacity`) nodes from the front |

**Struct** `STAccelNode` (32 bytes, array element without a version stamp)

| Field | Description |
|---|---|
| `boundsMin[3]`, `boundsMax[3]` | Node bounding box (in the frame the acceleration structure was built in, no `sceneRatio` conversion) |
| `depth` | Depth. Root = 0 |
| `primitiveCount` | Leaf: number of contained primitives (0 or more) / internal node: -1 |

Meaning per acceleration structure type: the BVH family (0 BinnedSAH, 2 TinyBVH, 3 LBVH, 4 LBVH_Simd) is the built binary tree, and the 4/8-wide traversal representation collapses this tree, so its boxes are a subset of this list. KD (1 HybridKD) boxes are derived by cutting the root box with split planes, so sibling boxes do not overlap and exactly partition the parent; there are empty leaves (`primitiveCount` 0), and a triangle spanning several leaves is counted in each leaf.

**Returns** — The **total** number of nodes within `maxDepth` (0 or more) / `-1` = failure (`context` NULL; an unknown mesh gives `ST_STATUS_NOT_FOUND`). A truncated copy still returns the total count and records `ST_STATUS_BUFFER_TOO_SMALL`.

</details>

<details>
<summary><code>st_off_debug_copy_scene_accel_nodes</code> — Copies the node boxes of the scene TLAS (object instance acceleration structure)</summary>

```c
int st_off_debug_copy_scene_accel_nodes(STOFF_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**Purpose** — Copies the node bounding boxes of the scene acceleration structure (TLAS) built over object instances. Use it to visualize the spatial partitioning of the whole scene. Same contract as the real-time `st_rt_debug_copy_scene_accel_nodes`.

**When / how** — The static TLAS is the one published by `st_off_build` and stays the last published version until the next build (staged static changes are not visible). The dynamic TLAS is republished by dynamic object rebuilds. Coordinates are in the scene (world) frame, and the primitives of TLAS leaves are object instances, not triangles. Node order, `maxDepth`, size-query and truncation conventions and the `STAccelNode` fields are the same as in the `st_off_debug_copy_mesh_accel_nodes` entry. Support is indicated by `ST_CAP_ACCEL_DEBUG_NODES`. Thread: `[control]` — takes only the scene read lock.

| Parameter | Description |
|---|---|
| `context` | Offline context handle |
| `layer` | `STAccelLayer` — `ST_ACCEL_LAYER_STATIC` (0, static TLAS published by `st_off_build`) / `ST_ACCEL_LAYER_DYNAMIC` (1, dynamic object TLAS) |
| `maxDepth` | Negative = all depths. If 0 or more, only up to that depth |
| `outNodes` | Node buffer. NULL = size query |
| `nodeCapacity` | Number of elements in `outNodes` |

**Returns** — The total number of nodes within `maxDepth` (0 or more). If that TLAS does not exist yet (before a build, no objects of that kind), `0` rather than an error. `-1` = failure (`context` NULL; `layer` out of range gives `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_debug_build_mesh_accel_nodes</code> — Builds the BLAS of a single mesh without a context and returns its node boxes</summary>

```c
int st_off_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**Purpose** — Lets you preview how the acceleration structure will be built for one mesh before creating a scene or context (host editor previews, etc.). It uses the same input validation and build path as mesh creation, so for the same `accelKind` it is the same tree as the BLAS a context builds. Results match the real-time `st_rt_debug_build_mesh_accel_nodes`.

**When / how** — Every call builds a new BLAS (proportional to mesh size). The host caches the result. Node order, `maxDepth`, size-query and truncation conventions and the `STAccelNode` fields are the same as in the `st_off_debug_copy_mesh_accel_nodes` entry. Thread: `[any]` — there is no global state, so it can be called from any thread (it takes as long as the build costs).

| Parameter | Description |
|---|---|
| `mesh` | Triangle mesh (struct below). Must not be NULL |
| `accelKind` | The kind of `st_off_scene_set_accel` — 0 BinnedSAH / 1 HybridKD / 2 TinyBVH / 3 LBVH / 4 LBVH_Simd. `-1` = engine default (TinyBVH) |
| `maxDepth` | Negative = all depths. If 0 or more, only up to that depth |
| `outNodes` | Node buffer. NULL = size query |
| `nodeCapacity` | Number of elements in `outNodes` |

**Struct** `STMesh`

| Field | Description |
|---|---|
| `numVertices` | Number of vertices |
| `vertices` | xyz-interleaved float array (`numVertices × 3` elements) |
| `numTriangles` | Number of triangles |
| `triangles` | Vertex index array (`numTriangles × 3` elements) |

**Returns** — The total number of nodes within `maxDepth` (0 or more) / `-1` = failure (mesh or array NULL, count of 0 or less, non-finite vertex, out-of-range index, invalid kind, allocation failure). There is no context, so no last_status is recorded.

</details>

<details>
<summary><code>st_off_batch_create</code> — Creates a batch object that runs computation and pressure IR renders of several contexts in parallel</summary>

```c
STOFF_Batch* st_off_batch_create(int32_t workerCount);
```

**Purpose** — The starting point of the offline batch runtime. After setting up the scene, sources, listeners and options of each context as usual, register those contexts and their pressure IR render requests with the batch once; the engine then runs `st_off_ir_compute` followed by the registered pressure renders for each job on its own **batch worker** threads and returns finished jobs through polling. When generating RIRs for many scenes and positions in bulk, the host does not need to write its own thread pool. Results are bit-identical to running `st_off_ir_compute` → `st_off_ir_render_pressure` on the same context from the calling thread.

**When / how** — The life cycle is as follows.

1. `st_off_batch_create` — create the batch object (no threads are created at this point)
2. `st_off_batch_add_job` — register one context = one job
3. `st_off_batch_add_pressure_render` / `st_off_batch_add_pressure_render_mixed` — register render requests per job
4. `st_off_batch_start` — launch the batch workers and return immediately (once per batch)
5. `st_off_batch_poll` (receive completion records) · `st_off_batch_wait` · `st_off_batch_remaining` — observe progress
6. `st_off_batch_fetch_pressure` — copy the results of completed jobs
7. `st_off_batch_release_job` — release the result memory of fully received jobs
8. `st_off_batch_destroy` — cancel remaining jobs, join workers, free

The batch handles pressure IRs only (call binaural and audition renders directly with the context functions). Batch workers are separate from the context's internal compute pool workers and do not belong to any `STThreadType`. Check support with `ST_CAP_OFFLINE_BATCH`. Thread: `[any]` — batch workers are created at start.

| Parameter | Description |
|---|---|
| `workerCount` | Number of batch workers. 0 or less = number of hardware threads. The number actually launched never exceeds the job count |

**Returns** — The batch handle. NULL on allocation failure.

</details>

<details>
<summary><code>st_off_batch_destroy</code> — Cancels, cleans up and frees a batch</summary>

```c
void st_off_batch_destroy(STOFF_Batch* batch);
```

**Purpose** — Cancels remaining jobs, joins all batch workers, then frees the batch and the results it holds.

**When / how** — Call it after receiving all results, or when you want to stop. After it returns, the batch no longer references the registered contexts. It blocks, because it waits until running jobs respond to the cancellation and stop. Thread: `[any, blocking]` — callable from any thread, but blocks until the workers are joined.

| Parameter | Description |
|---|---|
| `batch` | Batch handle. Does nothing if NULL |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_batch_get_last_status</code> — Reads the status code of the batch's own last call</summary>

```c
int st_off_batch_get_last_status(const STOFF_Batch* batch);
```

**Purpose** — Returns the cause as an `STStatus` when a batch function (`add_*`, `start`, `fetch_pressure`, `release_job`, etc.) fails. Per-job failures (computation or render failures) are read with `st_off_batch_get_job_error`, not here.

**When / how** — Call it right after a batch function returns a failure value (-1 / 0). A successful call clears it to `ST_STATUS_OK`. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |

**Returns** — An `STStatus` value (`ST_STATUS_OK`, `ST_STATUS_INVALID_ARGUMENT`, `ST_STATUS_UNAVAILABLE`, `ST_STATUS_BUFFER_TOO_SMALL`, etc.). `ST_STATUS_INVALID_ARGUMENT` if `batch` is NULL.

</details>

<details>
<summary><code>st_off_batch_get_last_error</code> — Copies the batch's own last error message</summary>

```c
int st_off_batch_get_last_error(const STOFF_Batch* batch, char* outMessage, int32_t capacity);
```

**Purpose** — Returns the human-readable error message (English) that pairs with `st_off_batch_get_last_status`.

**When / how** — Call it for logging right after a batch function fails. Empty string if there is no error. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle. Copies an empty string if NULL |
| `outMessage` | Buffer that receives the message. NUL-terminated, truncated to `capacity` |
| `capacity` | Byte size of `outMessage`. At least 1 |

**Returns** — `1` = copied / `0` = `outMessage` is NULL or `capacity` is 0 or less.

</details>

<details>
<summary><code>st_off_batch_worker_count</code> — Reads the number of batch workers configured for the batch</summary>

```c
int32_t st_off_batch_worker_count(const STOFF_Batch* batch);
```

**Purpose** — Returns the worker count resolved from the value passed to `st_off_batch_create` (the number of hardware threads if 0 or less was passed).

**When / how** — Can be called at any time. `st_off_batch_start` launches as many workers as the smaller of this value and the job count. The `workerIndex` of completion records ranges from 0 to below this value. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |

**Returns** — The worker count. `0` if `batch` is NULL.

</details>

<details>
<summary><code>st_off_batch_add_job</code> — Registers one context as a batch job</summary>

```c
int32_t st_off_batch_add_job(STOFF_Batch* batch, STOFF_Context* context);
```

**Purpose** — Registers a fully set up offline context (scene, sources, listeners, options) as one job. A job runs `st_off_ir_compute` on one batch worker and then executes the pressure renders registered to that job in registration order.

**When / how** — Accepted **only before** `st_off_batch_start`. Do not register the same context in two jobs within one batch. The context pointer is **borrowed**: from registration until you receive that job's completion record with `st_off_batch_poll`, you must not destroy the context or call any other API on it. After the completion record is received the batch no longer references the context, so the host owns it again even while the batch is alive — raw IR queries, scene and source changes, destruction and re-registration in another batch all work, and since the batch keeps that job's results separately, `st_off_batch_fetch_pressure` still works. Check this behavior with `ST_CAP_OFFLINE_BATCH_CONTEXT_RETURN`; on libraries without this bit, do not touch registered contexts until the batch is destroyed. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `context` | Offline context to register (lent) |

**Returns** — The job index (from 0, in registration order). Failure is `-1`: if `context` is invalid or the batch has already started, the batch status gets `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_add_pressure_render</code> — Adds a pressure IR render request for one listener/source pair to a job</summary>

```c
int32_t st_off_batch_add_pressure_render(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**Purpose** — Batch version of `st_off_ir_render_pressure`. After the job finishes its compute it renders this request; the batch keeps the result and hands it out through `st_off_batch_fetch_pressure`.

**When / how** — Call it before `st_off_batch_start`. A job can hold several requests, executed in registration order. If one request fails, the job ends as failed and later renders are not executed. Pair existence is checked at render time, so an unregistered pair shows up as a job failure (`st_off_batch_get_job_error`). Request fields, length, lack of normalization and other aspects of the result mean the same as in `st_off_ir_render_pressure`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `jobIndex` | Job index returned by `st_off_batch_add_job` |
| `listener` | Listener handle |
| `source` | Source handle |
| `seconds` | IR length (seconds). A finite positive value |
| `options` | Request initialized with `st_off_ir_init_pressure_request` (`STOfflinePressureIRRequestOptions`; see that entry for the fields). Copied at registration |

**Returns** — The render index within that job (from 0, in registration order). Failure is `-1`: an invalid request, a nonexistent job index or an already started batch sets the batch status to `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_add_pressure_render_mixed</code> — Adds a mixed pressure IR render request for one listener and several sources to a job</summary>

```c
int32_t st_off_batch_add_pressure_render_mixed(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**Purpose** — Batch version of `st_off_ir_render_pressure_mixed`. It uses **the same render index space** as the job's solo renders, and the result is received with `st_off_batch_fetch_pressure` (`info.sourceId` = -1, `info.sourceCount` = number of sources).

**When / how** — Call it before `st_off_batch_start`. The source list is copied at registration, so the array can be reused after the call. Handle validity and duplicates are checked at registration, while pair existence is checked at render time after the job finishes its compute, so an unregistered pair shows up as a job failure (`st_off_batch_get_job_error`). Support is indicated by `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `jobIndex` | Job index |
| `listener` | Listener handle |
| `sources` | Array of source handles. No duplicates |
| `sourceCount` | Number of sources. At least `1` and at most `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES` (1024) |
| `seconds` | IR length (seconds). A finite positive value |
| `options` | Request initialized with `st_off_ir_init_pressure_request` |

**Returns** — The render index within that job. Failure is `-1`: an invalid request, a source count out of range, invalid or duplicate handles, a nonexistent job index or an already started batch sets the batch status to `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_start</code> — Launches batch workers and starts executing the registered jobs</summary>

```c
int st_off_batch_start(STOFF_Batch* batch);
```

**Purpose** — Closes registration and launches the batch workers. Workers take jobs one at a time and run compute and renders.

**When / how** — Call it only once, after registering all jobs and render requests. It returns immediately; observe progress afterward with `st_off_batch_poll` / `st_off_batch_wait` / `st_off_batch_remaining`. After start, `add_*` is rejected. A batch cannot be started again, so register new work in a new batch. Thread: `[control]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |

**Returns** — `1` = started / `0` = failure (no jobs or already started → `ST_STATUS_INVALID_ARGUMENT` in the batch status).

</details>

<details>
<summary><code>st_off_batch_poll</code> — Takes completion records of finished jobs</summary>

```c
int32_t st_off_batch_poll(STOFF_Batch* batch, STOfflineBatchCompletion* outCompletions, int32_t capacity);
```

**Purpose** — Takes (draining them from the queue) and copies up to `capacity` completion records, one of which is produced each time a job finishes. Receiving a job's completion record is the condition for fetching its results and getting the context back.

**When / how** — After start, call it periodically from any thread, or drain everything at once after `st_off_batch_wait`. Each job produces exactly one record. For jobs whose record you received, call `st_off_batch_fetch_pressure` → `st_off_batch_release_job`. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `outCompletions` | Array that receives the records. The engine fills each record's `structSize` and `apiVersion` |
| `capacity` | Number of elements in `outCompletions`. At least 1 |

**Struct** `STOfflineBatchCompletion`

| Field | Description |
|---|---|
| `structSize`, `apiVersion` | Version stamp filled by the engine |
| `jobIndex` | Index of the finished job |
| `status` | 0 = success / 1 = compute or render failure (message via `st_off_batch_get_job_error`) / 2 = canceled |
| `renderCount` | Number of successful pressure renders |
| `workerIndex` | Number of the batch worker that ran the job |
| `computeMicros` | Elapsed compute time of the job (µs) |
| `renderMicros` | Elapsed render time of the job (µs) |
| `reserved[8]` | Reserved |

**Returns** — The number of records copied (0 or more). `0` if there are no new completions, `batch` or `outCompletions` is NULL, or `capacity` is 0 or less.

</details>

<details>
<summary><code>st_off_batch_wait</code> — Waits until all jobs finish (or until timeout)</summary>

```c
int st_off_batch_wait(STOFF_Batch* batch, int32_t timeoutMs);
```

**Purpose** — Blocks waiting for the whole batch to complete instead of a polling loop.

**When / how** — Call it after start. Completion records remain in the queue after the wait ends, so drain them next with `st_off_batch_poll` (records must be received before fetching and getting contexts back). Thread: `[any, blocking]` — callable from any thread, but blocks until completion or timeout.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `timeoutMs` | Maximum wait time (ms). Negative = wait indefinitely |

**Returns** — `1` = all jobs complete / `0` = timeout or `batch` NULL.

</details>

<details>
<summary><code>st_off_batch_remaining</code> — Reads the number of jobs not yet finished</summary>

```c
int32_t st_off_batch_remaining(const STOFF_Batch* batch);
```

**Purpose** — Returns the number of remaining jobs, for progress display or completion checks.

**When / how** — Can be called at any time. Finished jobs (succeeded, failed or canceled) are excluded. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |

**Returns** — The number of unfinished jobs. `0` if `batch` is NULL.

</details>

<details>
<summary><code>st_off_batch_cancel</code> — Cancels remaining jobs and signals cancellation to running jobs</summary>

```c
void st_off_batch_cancel(STOFF_Batch* batch);
```

**Purpose** — Stops the whole batch. Jobs not yet started end as canceled (`status` 2), and the contexts of running jobs receive the same cancellation as `st_off_ir_request_cancel`.

**When / how** — Callable from any thread; returns without waiting. Jobs that were running end as failed (`status` 1) or canceled (`status` 2) depending on when they stop. Completion records still come out for every job afterward, so receive them with `st_off_batch_poll` and then take the contexts back. Results of jobs that finished before the stop can still be fetched. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle. Does nothing if NULL |

**Returns** — Nothing.

</details>

<details>
<summary><code>st_off_batch_fetch_pressure</code> — Copies a completed job's pressure IR render result into a caller buffer</summary>

```c
int32_t st_off_batch_fetch_pressure(STOFF_Batch* batch, int32_t jobIndex, int32_t renderIndex, float* outValues, int32_t capacityValues, STOfflinePressureIRInfo* outInfo);
```

**Purpose** — Retrieves a render result (value array and metadata) held by the batch. The batch keeps results separately from the context, so they can be retrieved even after the context is changed or destroyed.

**When / how** — Call it after receiving that job's completion record with `st_off_batch_poll`. With `outValues` = NULL it returns only the value count and `outInfo`, so get the size first, allocate a buffer and call again. The value layout (mono / `values[band × bandStride + sample]`) and info fields are the same as `st_off_ir_render_pressure`. Release fully received jobs with `st_off_batch_release_job`. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `jobIndex` | Job index |
| `renderIndex` | Render index within that job (the return value of `add_pressure_render*`) |
| `outValues` | Result buffer. NULL = count and info only |
| `capacityValues` | Number of floats in `outValues` |
| `outInfo` | Result metadata (`STOfflinePressureIRInfo`; see `st_off_ir_render_pressure` for the fields). NULL allowed. If passed, the caller fills `structSize` and `apiVersion` |

**Returns** — The value count (floats copied or required). Failure is `0`: a render that has not finished, failed or was already released gives `ST_STATUS_UNAVAILABLE`; a too-small buffer gives `ST_STATUS_BUFFER_TOO_SMALL`; a wrong `outInfo` stamp gives `ST_STATUS_INVALID_ARGUMENT` (all recorded in the batch status).

</details>

<details>
<summary><code>st_off_batch_release_job</code> — Releases the result memory of a completed job</summary>

```c
int st_off_batch_release_job(STOFF_Batch* batch, int32_t jobIndex);
```

**Purpose** — Removes the render results of a fully received job from the batch to get the memory back. In large batches, releasing results as soon as you receive them lowers peak memory use.

**When / how** — Call it after receiving all of that job's results with `st_off_batch_fetch_pressure`. Results of a released job can no longer be fetched. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `jobIndex` | Job index |

**Returns** — `1` = released / `0` = the job has not finished yet (`ST_STATUS_UNAVAILABLE` in the batch status) or `batch` NULL.

</details>

<details>
<summary><code>st_off_batch_get_job_error</code> — Copies the per-job failure message</summary>

```c
int st_off_batch_get_job_error(const STOFF_Batch* batch, int32_t jobIndex, char* outMessage, int32_t capacity);
```

**Purpose** — Returns the reason (English) for a job whose completion record `status` is 1 (failed) or 2 (canceled). Examples: compute failure or cancellation, render failure due to an unregistered pair.

**When / how** — Call it after receiving the completion record. Errors of batch function calls themselves are read with `st_off_batch_get_last_status` / `st_off_batch_get_last_error`. Thread: `[any]`.

| Parameter | Description |
|---|---|
| `batch` | Batch handle |
| `jobIndex` | Job index |
| `outMessage` | Buffer that receives the message. NUL-terminated, truncated to `capacity` |
| `capacity` | Byte size of `outMessage`. At least 1 |

**Returns** — `1` = a message exists (copied) / `0` = no message (e.g. a successful job) or argument error.

</details>

</details>

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
- **iOS**: A single static library (`libsoundtracing_static.a`) contains both real-time and offline. Link the device / simulator variant accordingly.
- **Web**: `SoundTracingRealtime.mjs/.wasm` is a pthreads build, so the page and Worker responses need `Cross-Origin-Opener-Policy: same-origin`
  and `Cross-Origin-Embedder-Policy: require-corp`. Make `[control]` calls from one Worker only (blocking calls on the main thread fail
  due to the `Atomics.wait` restriction), and exchange audio with an AudioWorklet through a shared ring. If you need a TypeScript facade, use the [Web SDK](./web.md).
- **Host sample rate**: The engine runs internally at 44.1 kHz; when `hostSampleRate` is set, the engine converts input and output.

## Next

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD plug-in](./fmod.md) · [Wwise plug-in](./wwise.md)
