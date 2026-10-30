---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — 全平台共用核心的二进制文件、头文件、最小使用流程、函数族与线程规则。
---

# Sound-Tracing SDK (C/C++)

所有平台使用同一个核心。Unity · Unreal Engine · FMOD · Wwise · Web SDK 是按各平台方式封装该二进制文件的
包装层；在原生 C/C++ 中，只需包含头文件并链接对应平台的二进制文件即可。

## 分发内容

| 平台 | 二进制文件 (`Binaries/`) | 链接 |
|---|---|---|
| Windows x64 | `Win64/Release/SimpleSTRealtime.dll` + `.lib` | 动态 |
| macOS (Universal) | `Mac/Release/libSimpleSTRealtime.dylib` | 动态 |
| Linux x86_64 | `Linux/Release/libSimpleSTRealtime.so` | 动态 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSimpleSTRealtime.so` | 动态 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsimplest_static.a` | 静态 |
| Web | `Web/Release/SimpleSTRealtime.mjs` + `.wasm` (pthreads) | WASM 模块 (需要 COOP/COEP) |

用于离线 IR 计算的 `SimpleSTOffline`（同一文件夹，`st_off_*`）也一并包含。头文件在所有平台通用。

```text
SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| 头文件 | 上下文 | 函数前缀 | 作用 |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | 实时传播 + 音频渲染 |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | 离线 IR 计算与渲染 |
| `STTypes.h` | — | `ST_*` | 公共 POD 与 enum |

实体 id 是按类型区分的句柄（`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`，均为
`struct { int32_t v; }`），**失败即 `v < 0`**。坐标系为左手系 `+Y` up · `+Z` forward，单位为米
（通过 `STRT_CreateOptions.sceneRatio` 指定 cm = `0.01`），听者角度为弧度。

## 最小使用流程

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 由宿主音频回调拉取块
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// 若宿主混音负责音色与电平，则在创建后立即关闭（所有官方包装层均关闭）
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 材质 — 注册默认库后返回第一个材质的句柄
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. 网格 + 对象 (xyz interleaved，索引三角形)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = 整个网格使用同一材质
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 声源与听者
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW，包含 roll

// 4. 宿主 PCM 输入流 (单声道)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 构建 + 开始渲染 + 显式设置输出级
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid 早期反射 (实时推荐)
ro.useLimiter = 0;               // 若宿主主链负责限幅则关闭
st_rt_render_set_options(ctx, &ro);

// 6. 游戏循环 (控制线程)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // 唤醒工作线程并立即返回

// 7. 音频回调 (宿主音频线程)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## 函数族

| family | 代表函数 |
|---|---|
| 生命周期 | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_version_string`, `st_rt_get_capability_word`, `st_rt_get_last_status` / `st_rt_get_last_error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`, `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| source | `st_rt_source_create`, `set_position` / `set_velocity` / `set_orientation_q`, `set_directivity`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_parametric_eq` |
| source 输入与播放 | `st_rt_source_attach_stream` + `write_stream`, `set_audio_file`, `set_audio_clip`, `play` / `pause` / `stop` / `seek`, `set_volume`, `set_pitch`, `set_loop_count`, `trigger` |
| listener | `st_rt_listener_set_position` / `set_velocity` / `set_orientation_q` / `set_rotation_ypr`, `set_ray_count` |
| 传播 | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| 声学策略 | `st_rt_set_atmosphere`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_late_coupling_preset` |
| render | `st_rt_render_start` / `stop`, `st_rt_render_process`, `set_options` / `get_options`, `set_spatializer`, `set_speaker_layout`, `set_parametric_eq`, `set_loudness_compensation`, `set_master_gain_db`, `set_limiter_type`, `set_max_delay_seconds`, `get_latency_frames` |
| 内存预算 | `STRT_CreateOptions.maxSources`, `st_rt_set_memory_budget`, `st_rt_get_memory_stats` |
| 线程 | `STRT_CreateOptions.maxComputeThreads` / `.scheduler`, `st_rt_set_thread_attributes`, `st_rt_get_thread_inventory`, `st_rt_set_lane_update_interval` — [线程模型](#线程模型) |
| 诊断 | `st_rt_get_timing`, `st_rt_scene_get_stats`, `st_rt_ir_get_stats`, `st_rt_debug_copy_visual_paths` |

空间化通过 `st_rt_render_set_spatializer` 选择 `0` 声像 · `1` MIT KEMAR（内置）· `2` SADIE II D2 KEMAR（`Resources/HRTF`），
扬声器输出通过 `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1）开启。材质为 9 频段
（`63 Hz ~ 16 kHz`）的 `reflection / absorption / transmission / scattering`，每个频段必须满足 `R + A + T = 1`。

## 线程模型

![Sound-Tracing SDK (C/C++) 线程与数据流](/img/sdk/native-architecture.png)

宿主提供两个线程 — **一个控制线程**（场景、声源、听者、传播调用）和 **音频线程**
（PCM 输入、渲染输出）。其余线程由引擎在上下文内部创建。

### 可调用线程

头文件中每个函数上方都有标签。

| 标签 | 含义 | 代表函数 |
|---|---|---|
| `[control]` | 控制线程。可能持有场景锁，因此不要在音频回调中调用 | 创建、场景、声源、听者 setter，`st_rt_propagate`（PIPELINED 唤醒工作线程后立即返回） |
| `[control, blocking]` | 较长的独占区间 — 不要在游戏循环、音频线程中调用 | `st_rt_build`、`st_rt_render_start` / `stop`、HRIR 加载、延迟环重新分配 |
| `[audio]` | 在宿主音频线程上安全 — 无锁、无分配、无系统调用 | `st_rt_source_write_stream`、`st_rt_render_process` |
| `[any]` | 任意线程（atomic 读取 / 常量） | `st_rt_get_timing`、`st_rt_get_thread_inventory`、`st_rt_get_lane_update_interval` |

请将 `[control]` 调用串行化到 **唯一的专用控制线程**。所有官方包装层都采用这一结构。

### 引擎创建的线程

| 类型 (`STThreadType`) | 数量 | 作用 |
|---|---|---|
| `ST_THREAD_COMPUTE_POOL` | PIPELINED: N − 1（Direct 专用 1 + 通用 N − 2），N = max(3, 预算) · SYNCHRONOUS: N（N = 1 时在调用方内联） | 传播通道、IR 转换、IR 准备 task 全部在此池中运行 |
| `ST_THREAD_AUDIO_RENDER` | 1 (DEVICE · HOST_PULL_BUFFERED) / 0 (HOST_PULL) | 块渲染。BUFFERED 下填充环形缓冲区，回调只做复制 |
| 设备线程 | 1 (仅 DEVICE) | OS 输出设备（WASAPI · CoreAudio · AAudio）驱动。不计入清单 |
| `ST_THREAD_FILE_DECODER` | ≤ 1 | 仅当有 `st_rt_source_set_audio_file` 输入时存在。宿主流输入下没有 |

- **预算**: `STRT_CreateOptions.maxComputeThreads` — `0` = auto = min(性能核心数, 6)。不受环境变量影响。
- **调度器**: `STRT_CreateOptions.scheduler` — `ST_RT_SCHEDULER_PIPELINED`（默认，各通道在工作线程上以独立周期运行）/
  `ST_RT_SCHEDULER_SYNCHRONOUS`（`st_rt_propagate` 在调用线程上完成传播后返回）。
- **合计 (DEVICE 模式)**: PIPELINED = N + 1（+ 文件解码器 1）· SYNCHRONOUS = N + 2（+ 1）。HOST_PULL 去掉渲染、设备线程，
  HOST_PULL_BUFFERED 只保留渲染 1。实测用 `st_rt_get_thread_inventory`（`[any]`，按类型的 atomic 计数器）查看。
- 加速结构（TinyBVH）构建在调用线程上执行，不会创建单独的工作线程。

### 传播通道周期

PIPELINED 的 3 种几何通道可通过 `st_rt_set_lane_update_interval(ctx, lane, ms)` 在 **运行时随时** 更改周期
（`[0, 60000]` ms，超出范围则拒绝）。

| `STPropagationLane` | 默认 | 含义 |
|---|---|---|
| `DIRECT` (0) | 10 ms | 连续执行开始之间的最小间隔 |
| `REFLECTION_DIFFRACTION` (1) | 0 ms | 连续两次执行之间的最小间隔。占传播开销的大部分 — 要收回 CPU 先调高这里（代价是早期反射跟随听者变慢，不会出现静音或丢音） |
| `REVERB` (2) | 4 ms | 执行完成后到下一次执行的最小间隔 |

### 线程属性

`st_rt_set_thread_attributes(threadType, &attr)` 须在 **创建上下文之前** 按类型指定（对已在运行的线程不追溯，
进程全局，与 FMOD `Thread_SetAttributes` 处于同一位置）。逻辑角色（`LANE_*` · `IR_CONVERTER` ·
`AU_PREPARE` · `SCENE_INPUT`）没有专用线程，因此池策略设置在 `ST_THREAD_COMPUTE_POOL` 上。

```c
STThreadAttributes attr = { sizeof attr, ST_ABI_VERSION };
attr.priority = ST_THREAD_PRIORITY_ABOVE_NORMAL;            // DEFAULT · LOW · BELOW_NORMAL · NORMAL · ABOVE_NORMAL · HIGH · TIME_CRITICAL
attr.flags    = ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES;    // 或 PREFER_EFFICIENCY_CORES（两者同时开启则拒绝）
attr.affinityMask = 0;                                      // 逻辑处理器位掩码，仅 Windows 遵守。0 = 不指定
st_rt_set_thread_attributes(ST_THREAD_COMPUTE_POOL, &attr);
st_rt_set_thread_attributes(ST_THREAD_AUDIO_RENDER, &attr);
```

### 输出模式与延迟

| `renderOutputMode` | 引擎线程 | 宿主回调所做的事 | 延迟 |
|---|---|---|---|
| `DEVICE` (0) | 渲染 1 + 设备 1 | 无 — 引擎直接打开设备 | 设备缓冲区 |
| `HOST_PULL` (1) | 无 | `st_rt_render_process` 在回调内渲染块 | 0 块（渲染开销落在回调上） |
| `HOST_PULL_BUFFERED` (2) | 渲染 1 | 仅从环形缓冲区复制（≈ memcpy） | 环 ≈ 3 块（`st_rt_render_get_latency_frames`） |

三种模式都必须调用 `st_rt_render_start(useHrtf)`（HOST_PULL 系列不创建线程、设备，只设置渲染允许标志和
双耳/扬声器选择）。`hostSampleRate ≠ 0` 时，采样率转换由引擎在渲染线程（BUFFERED）或回调（HOST_PULL）中完成。
UE · Unity · FMOD · Wwise 插件全部使用 BUFFERED。

## 平台说明

- **Android**: API 28 及以上。将各 ABI 的 `.so` 放入应用的库文件夹。
- **iOS**: 单个静态库（`libsimplest_static.a`）同时包含实时与离线。按 device / simulator 分别链接。
- **Web**: `SimpleSTRealtime.mjs/.wasm` 是 pthreads 构建，页面和 Worker 响应需要 `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp`。`[control]` 调用只在一个 Worker 中进行（主线程上的阻塞调用会因
  `Atomics.wait` 限制而失败），音频通过共享环形缓冲区与 AudioWorklet 交换。若需要 TypeScript facade，请使用 [Web SDK](./web.md)。
- **宿主采样率**: 引擎内部为 44.1 kHz，指定 `hostSampleRate` 后由引擎转换输入与输出。

## 离线 IR

`SimpleSTOffline`（`st_off_*`）使用相同的场景 API，无需设备和工作线程，一次传播即可生成 IR。

| 输出 | 函数 |
|---|---|
| 计算 | `st_off_ir_compute` |
| 声压 IR (单声道 / 9 频段) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| 双耳 IR | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| Raw 能量抽头 | `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |

## 下一步

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD 插件](./fmod.md) · [Wwise 插件](./wwise.md)
