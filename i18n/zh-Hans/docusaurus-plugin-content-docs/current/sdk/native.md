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
| 诊断 | `st_rt_get_timing`, `st_rt_scene_get_stats`, `st_rt_ir_get_stats`, `st_rt_debug_copy_visual_paths` |

空间化通过 `st_rt_render_set_spatializer` 选择 `0` 声像 · `1` MIT KEMAR（内置）· `2` SADIE II D2 KEMAR（`Resources/HRTF`），
扬声器输出通过 `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1）开启。材质为 9 频段
（`63 Hz ~ 16 kHz`）的 `reflection / absorption / transmission / scattering`，每个频段必须满足 `R + A + T = 1`。

## 线程规则

头文件中每个函数上方都标有可调用线程的标签。

| 标签 | 含义 |
|---|---|
| `[control]` | 控制线程。可能持有场景锁，因此不要在音频回调中调用 |
| `[control, blocking]` | 加速结构构建、渲染 start/stop、HRIR 加载等耗时区间 |
| `[audio]` | 在宿主音频线程上安全 — `st_rt_source_write_stream`, `st_rt_render_process` |
| `[any]` | 任意线程 |

请将 `[control]` 调用串行化到唯一的专用控制线程。所有官方包装层都采用这一结构。

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
