---
sidebar_position: 1
title: SimpleST
description: Sound Tracing 的现行原生引擎 SimpleST — C++20 几何声学核心、2-DLL 公开 C ABI（ABI 6）、9 频段材质、Hybrid 早期反射、参数 EQ、主机 pull 渲染。
---

# SimpleST

**SimpleST** 是 Sound Tracing 产品线的现行原生引擎。它是一个 C++20 库，从网格、材质、声源、听者
出发以几何方式计算直达声、透射、反射、绕射路径和 late reverb 统计量，并把结果合成为实时空间音频
或确定性脉冲响应（IR）。它取代了上一代引擎 [STCoreV2](./stcorev2.md)，所有 SDK 和中间件插件都
运行在这个引擎的公开 C ABI 之上。

![引擎管线](/img/core/pipeline-overview.png)

## 概览

| 项目 | 值 |
|---|---|
| 引擎版本 | **2.22.0**（`ST_VERSION_STRING`），SDK 发行版 2.22.0-jhj.5。上一 SDK 发行版：2.18.2-jhj.7（引擎 2.18.2）、2.12.0 |
| 公开 ABI | **ABI 6**（`ST_ABI_VERSION`，3.0 clean break）。2.12.0 之后的变更全部为 additive |
| 主要语言 | C++20（暴露 C ABI，兼容 C11 头文件） |
| 构建系统 | CMake 3.21+ · 平台入口 `mainBuild.sh` |
| 平台 | Windows x64 · macOS Universal · Linux x86_64 · Android（arm64-v8a/armeabi-v7a/x86_64）· iOS（device/simulator）· Web（Emscripten，pthreads） |
| 分发形式 | 实时 DLL `SimpleSTRealtime` + 离线 DLL `SimpleSTOffline`（iOS/Web 为静态库） |
| 采样率 | 引擎内部固定 44.1 kHz，主机采样率由内置重采样器转换 |
| 频段 | 9 个倍频程频段 `63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz` |
| 加速结构 | TinyBVH（默认）· BinnedSAH · HybridKD · LBVH · LBVH_SIMD |
| 测试 | 回归测试工具 `SimpleST_demo` + 约 110 个 CTest |

## 架构

```text
SceneManager → STPropagator → STIRConverter ─┬→ STOnlineAuralizator  (实时流)
                                             └→ STOfflineAuralizator (确定性 RIR / 频段 IR)
```

- **SceneManager** — 拥有网格、材质、声源、听者以及 TLAS/BLAS。静态几何体只构建一次，
  动态对象只更新变换。
- **STPropagator** — 纯几何阶段。查找直达声/透射/反射/绕射路径，并计算 late reverb 所需的
  房间统计量（mean free path、表面积、材质分布）和 source transport（漫散射传输）射线。
  这里不计算声学增益。
- **STIRConverter** — 把几何量转换到声学域。延迟、Doppler slope、9 频段能量增益、
  距离/空气衰减、UTD 绕射、reverb send tap、HOA3 early bed 聚合都在这里决定。
- **Auralizator** — 在公共执行器之上有两个渲染器。实时渲染器按 9 频段分频 →
  频段延迟环 → 路径 tap（Doppler/淡入淡出）→ 空间化（声像 / MIT KEMAR / SADIE II D2 HRIR）→
  FDN16 late reverb → 限制器的顺序处理。

![三种引擎外壳](/img/core/engine-shells.png)

引擎外壳有三种。

| 外壳 | 用途 |
|---|---|
| `STRealTimeEngine` | 同步传播 + 音频渲染。用于诊断和兼容 |
| `STRealTimeMultiEngine` | Propagator/IRConverter 工作线程和 latest-only 三重缓冲。**实时默认** |
| `STOfflineEngine` | 一次性生成 canonical IR 缓存，并确定性地派生 Raw 能量 / 压力 IR / 双耳 IR |

## 公开 C ABI

公开 ABI 在物理上分为两个 DLL，公共 POD 位于 `STTypes.h`。

| 头文件 | 上下文 | 函数前缀 | 作用 |
|---|---|---|---|
| `SimpleST/ABI/STRealtime.h` | `STRT_Context*` | `st_rt_*` | 实时传播 + 音频渲染（181 个 export） |
| `SimpleST/ABI/STOffline.h` | `STOFF_Context*` | `st_off_*` | 离线 IR 计算与渲染（121 个 export） |
| `SimpleST/ABI/STTypes.h` | — | `ST_*` | 公共 POD、enum、capability 位 |

命名规则为 `st_<dll>_<family>_<verb>[_<what>]`，family 为
`scene / mesh / object / material / source / listener / render / debug / ir`。
上下文生命周期、构建和全局策略函数没有 family。

### 实体句柄

网格、对象、声源、听者、材质的 id 是彼此不同的 struct 类型。大小和调用约定与 `int32_t` 相同，
但混用不同种类会导致编译失败。

```c
typedef struct STMeshId     { int32_t v; } STMeshId;
typedef struct STObjectId   { int32_t v; } STObjectId;
typedef struct STSourceId   { int32_t v; } STSourceId;
typedef struct STListenerId { int32_t v; } STListenerId;
typedef struct STMaterialId { int32_t v; } STMaterialId;
```

创建函数按值返回句柄，**失败时 `v < 0`**。`0` 是有效 id。

### 实时函数族摘要

| family | 代表函数 |
|---|---|
| 生命周期 | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_api_version`, `st_rt_get_version_string`, `st_rt_get_capabilities`, `st_rt_get_capability_word`, `st_rt_get_last_status/error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`（单一材质或逐三角形材质索引）, `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| scene | `st_rt_scene_set_accel`, `st_rt_scene_set_triangle_intersection`, `st_rt_scene_get_stats`, `st_rt_scene_raycast` |
| source | `st_rt_source_create`, `set_position/direction/velocity`, `set_orientation_q`, `set_directivity`, `set_axis_attenuation`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_ray_count`, `set_depth`, `set_transport_refresh_steps`, `set_parametric_eq` / `set_eq`（声源 EQ） |
| source 音频输入 | `st_rt_source_set_audio_file`（WAV/FLAC/MP3/Ogg）, `st_rt_source_attach_stream` + `write_stream` + `get_stream_status`（主机 PCM）, `st_rt_source_set_audio_clip` / `set_audio_clip_asset`（缓存剪辑）, `clear_audio` |
| source 播放控制 | `st_rt_source_play/pause/stop/seek`, `set_volume`（线性 0 ~ 16）, `set_pitch`（0.25 ~ 4）, `set_loop_count`, `st_rt_source_trigger`, `set_retrigger_interval` |
| listener | `st_rt_listener_set_position/velocity/rotation`, `set_rotation_ypr`, `set_orientation_q`（2.22，含头部 roll）, `set_ray_count`, `set_ray_sampling_method` |
| 传播 | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_transmission_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| 声学策略 | `st_rt_set_atmosphere`, `st_rt_set_physical_distance_attenuation`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_doppler_gain_mode`, `st_rt_set_late_coupling[_preset]`, `st_rt_set_early_late_band_energy_targets` |
| render | `st_rt_render_start/stop`, `st_rt_render_process`（主机 pull）, `set_options/get_options`, `set_spatializer`, `set_speaker_layout[_custom]`, `set_parametric_eq`, `set_eq`, `set_loudness_compensation`, `set_virtual_bass`, `set_master_gain_db`, `set_limiter_type`, `get_limiter_latency_samples`, `set_path_fade_time`, `set_max_delay_seconds`, `get_latency_frames`, `get_process_stats` |
| 线程 | `st_rt_set_thread_attributes`, `st_rt_get_thread_inventory`, `STRT_CreateOptions.maxComputeThreads` |
| 休眠·运行 | `st_rt_idle`, `st_rt_run`, `st_rt_get_idle_state`, `STRT_CreateOptions.startIdle`（2.20，为 1 时以 IDLE 启动，在 `st_rt_run` 之前计算与渲染都暂停）, 按声源的 `st_rt_source_idle/run` |
| 内存预算 | `st_rt_set_memory_budget`, `st_rt_get_memory_budget`, `st_rt_get_memory_stats`, `STRT_CreateOptions.maxSources` — [声源内存预算](#声源内存预算) |
| 诊断 | `st_rt_get_timing`, `st_rt_ir_get_stats`, `st_rt_debug_acquire_snapshot`, `st_rt_debug_copy_visual_paths`, `st_rt_debug_copy_mesh/scene_accel_nodes` |

### 线程标签

头文件中每个 export 上方都有一行标签，说明可以从哪个线程调用。

| 标签 | 含义 |
|---|---|
| `[control]` | 供控制线程使用。可能获取场景锁，因此不要在音频回调中调用 |
| `[control, blocking]` | 加速结构构建、设备 start/stop、HRIR 加载等较长的独占区间 |
| `[any]` | 不加锁，只读取 atomic/常量或只填写调用方的 POD |
| `[audio]` | 可在主机音频线程安全调用 — `st_rt_render_process`, `st_rt_source_write_stream` |

:::tip
FMOD、Wwise、UE、Unity 封装全部使用一个**专用控制线程**，并把 `[control]` 调用串行化到那里。
直接使用 ABI 时也建议采用同样的结构。
:::

## 开始使用

### SDK 布局

`mainBuild.sh build <platform> release` 生成的 SDK 与 UE `ThirdParty` 布局相同。

```text
out/dist/<platform>_release/SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/ SimpleSTRealtime.{dll,dylib,so} · SimpleSTOffline.* · (iOS/Web) libsimplest_static.a
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin + 许可证
└─ Licenses/                miniaudio · tinybvh
```

### 最小使用场景

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);             // scheduler=PIPELINED, sceneRatio=1(m), renderOutputMode=DEVICE
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 由主机拉取块的情况
opt.hostSampleRate   = 48000;                 // 主机采样率。0 = 保持 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error */ }

// 从 2.21.0 起 st_rt_create 会开启等响度补偿。由主机混音负责音色时，创建后立即关闭
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 材质 — 整体注册默认库（BRAS 24 种）。返回第一个材质的句柄。
STMaterialId firstMat = st_rt_material_load_defaults(ctx);

// 2. 网格 + 对象
STMesh mesh = { numVertices, vertices, numTriangles, triangles };   // xyz interleaved, index triplets
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, firstMat, NULL);    // NULL = 整个网格使用一种材质
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 声源与听者
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
st_rt_listener_set_rotation(ctx, /*yaw*/0.f, /*pitch*/0.f);        // 弧度。含 roll：set_orientation_q(XYZW)

// 4. 主机 PCM 流输入
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };     // 单声道，capacity 0 = 8192 帧
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 构建加速结构 + 启动渲染 + 显式设置输出级
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // 1 = hybrid（2.18.0 默认。在 render_start 之后显式设置）
ro.useLimiter = 0;               // 由主机主输出链负责限幅时关闭（2.18.0 默认 1 = true-peak）
st_rt_render_set_options(ctx, &ro);
st_rt_render_set_master_gain_db(ctx, 0.f);                          // 引擎默认 0 dB

// 6. 游戏循环（控制线程）
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // PIPELINED 唤醒工作线程后立即返回

// 7. 音频回调（主机音频线程）
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);   // [audio]
st_rt_render_process(ctx, interleavedStereoOut, frames);  // [audio]

st_rt_destroy(ctx);
```

:::note
从 2.18.0 起，创建后的默认值和实时渲染预设（开关扬声器布局时会重新铺设）为
**Hybrid（`reserved0 = 1`）+ true-peak 输出限制器开启（−1 dBTP，137 采样延迟）**，主增益为 0 dB
（2.12.0 及之前为 Objects + 限制器关闭）。不要依赖默认值，请在 **`render_start` 和布局变更之后**
显式设置 Hybrid 与限制器。所有官方插件都按这一顺序重新应用各自的默认值。

从 2.21.0 起，`st_rt_create` 还会开启[等响度补偿](#等响度补偿)。该设置以上下文为单位，`render_start` 不会还原它，
因此在创建后设定一次即可。所有官方封装都在创建后立即将其关闭。
:::

## 核心概念

### 坐标与单位约定

- **坐标系与 Unity 相同** — 左手系，`+Y` up，`+Z` forward，`+X` right。yaw 为正 = 向右旋转，
  pitch 为正 = 向下。Unity 主机可直接传入而无需转换；`-Z` forward 的主机（Three.js 等）由封装翻转 Z。
  UE 由插件执行 `(Y, Z, X)` 重排和 cm→m 转换。
- **单位是米**。使用其他单位的主机在创建时一次性指定 `STRT_CreateOptions.sceneRatio`
  （cm = `0.01`，ft = `0.3048`）。坐标按场景单位原样传入，引擎只在需要米的地方相乘。
  **禁止双重缩放**：既预先缩放几何体，又给出 `sceneRatio`。
- 角度：听者 rotation 为**弧度**，只有扬声器布局使用度（degree）。从 2.22.0 起，可以用
  `st_rt_listener_set_orientation_q`（本地→世界单位四元数，XYZW）和 `st_rt_listener_set_rotation_ypr`（yaw·pitch·roll）
  一并传入头部倾斜（roll）。三个听者方向 setter 以最后调用者为准。
- 网格绕序：求交内核是双面的，因此反射和透射与绕序无关，但绕射棱边判定中有两处会查看法线符号。
  请在同一网格内保持绕序一致。

### 材质 — 9 频段，严格校验

```c
typedef struct STMaterial {
    uint32_t structSize, apiVersion;
    float reflection[9], absorption[9], transmission[9], scattering[9];
    uint32_t reserved[8];
} STMaterial;
```

- R/A/T/scattering 都是 **energy-domain** 无量纲比率，每个频段必须满足
  `|R + A + T − 1| ≤ 0.001`。没有自动推导、归一化或插值。
- scattering 是反射能量中的漫反射比例，不计入总和。
- 默认库是从 BRAS 测量拟合的 24 种材质（`st_rt_material_load_defaults`）。
- `sqrt` 只在渲染边界精确地施加一次。主机传入的值是能量。

### 路径类型与门控

| pathType | 含义 |
|---|---|
| 0 Direct | 直达声 |
| 1 Transmission | 穿过几何体的直达声（遮挡） |
| 2 Reflection | 镜面反射（最大深度 `st_rt_set_max_depth`，默认 8） |
| 3 Diffraction | UTD 绕射（source-side 1 + terminal 1 edge） |
| 4 Reverb | source transport 漫散射传输 → FDN16 late reverb |

有全局（`st_rt_set_path_type_enabled`）和逐声源（`st_rt_source_set_path_enabled`）两级门控，
并可用 `st_rt_set_acoustic_feature_enabled` 分别关闭空气吸收、传播延迟和直达声遮挡。
全部关闭后就只剩距离衰减 + 立体声声像，成为"Sound Tracing OFF"基线。

### 射线预算

| 轴 | 默认值 | 函数 |
|---|---|---|
| 听者 guide ray | `16 × 16`，Fibonacci sphere | `st_rt_listener_set_ray_count`, `_set_ray_sampling_method` |
| 反射最大深度 | 全局 8，逐声源 4 | `st_rt_set_max_depth`, `st_rt_source_set_depth` |
| 声源 transport ray | `16 × 8` | `st_rt_source_set_ray_count` |
| 透射最大深度 | 64 | `st_rt_set_transmission_max_depth` |
| transport 刷新步数 | 0（自动：PIPELINED 动态 8 · 静态 16） | `st_rt_source_set_transport_refresh_steps` |

### Hybrid 早期反射（实时游戏推荐）

![Hybrid 早期反射](/img/core/hybrid-early-reflections.png)

`STRenderOptions.reserved0`（earlySpatialMode）有两个值。

| 值 | 行为 | 用途 |
|---|---|---|
| `0` Objects | 把所有 early path 作为单独的空间化对象渲染 | 基准试听、离线 A/B（2.12.0 及之前的预设默认） |
| `1` Hybrid | 只有听者全局预算（反射 12+4 · 绕射 3+1）为 exact，其余进入 HOA3 bed | **实时游戏**（从 2.18.0 起为引擎默认） |

在有 8 个声源的大厅中，Objects 每块 16.8 ms（上限 11.6 ms），Hybrid 为 2.4 ms。
从 2.18.0 起引擎默认值也是 Hybrid，UE、Unity、FMOD、Wwise、soundtrace.js 都会在渲染启动后
显式启用 Hybrid。

### 空间化与输出

| `st_rt_render_set_spatializer` | 说明 |
|---|---|
| `0` PANNING | 立体声幅度声像（默认） |
| `1` MIT_KEMAR | 引擎内置的 MIT KEMAR HRIR（128 tap） |
| `2` SADIE_D2_KEMAR | 随包分发的 SADIE II D2 KEMAR HRIR（8,802 方向 · 256 tap） |

扬声器输出通过 `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 笔记本近场 2.0）
或自定义布局启用，内部以 HOA3 解码输出 N 声道。输出级的顺序为输出 EQ →（扬声器）声道 EQ →
等响度补偿 → 虚拟低音 → 主增益 → 限制器。

| 输出级 | 函数 | 实时默认（2.22.0） |
|---|---|---|
| 输出 EQ | `st_rt_render_set_parametric_eq` — [参数 EQ](#参数-eq)。旧的 9 频段 `st_rt_render_set_eq` 是同一 EQ 的图示视图 | 关闭 |
| 等响度补偿 | `st_rt_render_set_loudness_compensation`（2.21.0） | **开启**（由 `st_rt_create` 开启） |
| 虚拟低音 | `st_rt_render_set_virtual_bass`（2.21.0） | 关闭 |
| 主增益 | `st_rt_render_set_master_gain_db`（−96 ~ +24 dB，20 ms 斜坡） | 0 dB |
| 限制器类型 | `st_rt_render_set_limiter_type` — Envelope(0) / Lookahead peak(1) / True peak(2) | True peak，上限 −1 dBTP |
| 限制器开关 | `STRenderOptions.useLimiter` | 开启（1）。延迟为 `st_rt_render_get_limiter_latency_samples` = 137 采样 |

限制器是立体声和扬声器布局（N 声道，声道联动）所有输出的最后一级。像中间件、游戏引擎这样
由主机主输出链负责限幅的集成，用 `useLimiter = 0` 将其关闭。新功能通过
`st_rt_get_capability_word(1)` 的 `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER` · `ST_CAP1_MASTER_GAIN` 确认
（字 0 = `st_rt_get_capabilities()` 的位，不要把两者混在一起做 AND）。

### 参数 EQ

从 2.21.0 起，EQ 是把 RBJ 二阶滤波频段串联起来的单一参数 EQ。同一个频段结构体（`STParametricEqBand`）用于两个位置。

| 位置 | 函数 | 作用点 |
|---|---|---|
| 声源 EQ | `st_rt_source_set_parametric_eq`（`ST_CAP1_SOURCE_PARAMETRIC_EQ`） | 声源原始 PCM，9 频段分频器**之前**。该声源的直达·反射·绕射·混响发送都会得到相同的音色。清除用 `st_rt_source_set_eq(ctx, id, NULL)` |
| 输出 EQ | `st_rt_render_set_parametric_eq`（`ST_CAP1_OUTPUT_PARAMETRIC_EQ`） | 渲染末端、主增益之前的全局唯一 EQ。关闭用 `enabled = 0` |

- 滤波器类型为 `ST_PARAMETRIC_EQ_PEAKING` · `LOW_SHELF` · `HIGH_SHELF` · `LOW_PASS` · `HIGH_PASS` · `NOTCH` 6 种。
  低切·高切（HIGH_PASS / LOW_PASS）固定为 12 dB/oct。
- 范围：频率 20 ~ 20,000 Hz，增益 ±24 dB（仅 PEAKING·搁架），Q 0.1 ~ 30（搁架最多 3），前级增益 −48 ~ +12 dB，
  最多 16 个频段。
- 值变化时引擎以 20 ms 交叉淡化过渡。关闭状态下不触碰采样。
- 离线 DLL 也有声源 EQ（`st_off_source_set_parametric_eq`）。输出 EQ 仅限实时。

### 等响度补偿

从 2.21.0 起，实时 `st_rt_create` 会开启等响度补偿（ISO 226:2003，基准 83 → 回放 70 phon）。主增益为 0 dB 时，
低频搁架约 +7.2 dB（120 Hz），高频搁架约 +1.8 dB，默认情况下补偿量随主增益变化。关闭后输出与 2.20 逐位一致。
离线 DLL 中没有此功能。

这一级属于回放设备侧功能，因此与限制器一样，在由主机混音掌控音色与电平的集成中建议关闭。
UE、Unity、FMOD、Wwise、soundtrace.js 封装都会在创建上下文后立即将其关闭（SDK 发行版 2.22.0-jhj.5）。

### 主机 pull 渲染

![主机 pull 渲染](/img/core/host-pull-render.png)

| `renderOutputMode` | 引擎线程 | 说明 |
|---|---|---|
| `DEVICE`(0) | 渲染 1 + 设备 1 | 引擎直接打开 WASAPI 等输出设备 |
| `HOST_PULL`(1) | 无 | 主机音频回调用 `st_rt_render_process` 渲染块 |
| `HOST_PULL_BUFFERED`(2) | 渲染 1 | 引擎渲染线程填充环形缓冲，回调只做复制（约 3 块延迟） |

UE、FMOD、Wwise、Unity 集成默认为 `BUFFERED`。指定 `hostSampleRate` 后，输入流和输出都由引擎
用窗口 sinc 重采样器转换，主机侧不需要重采样。并发主机流槽位为 **64 个**。

### 调度器与线程

- `scheduler = PIPELINED`（默认）：Direct / Reflection-Diffraction / Reverb 三条 lane 以独立节奏运行。
  默认周期为 direct 10 ms · refl 0 ms（立即）· reverb 4 ms，可在运行时用
  `st_rt_set_lane_update_interval` 修改。提高反射 lane 的周期是回收 CPU 最多的旋钮。
- `maxComputeThreads = 0` 为 auto（= min(性能核数, 6)），各类线程的优先级和核心偏好在 **create 之前**
  用 `st_rt_set_thread_attributes`（与 FMOD `Thread_SetAttributes` 同一位置）指定。
- `st_rt_get_thread_inventory` 按类型返回实际存在的线程数。

### 声源内存预算

从 SDK 发行版 2.18.2 起，实时上下文对同时存活的声源数和声源内存设有上限。
这是 ABI 6 additive 变更，可通过 `st_rt_get_capability_word(1)` 的 `ST_CAP1_MEMORY_BUDGET` 确认。单个声源的
内存由固定开销（传播、IR 副本、transport、流环形缓冲）、延迟环和路径 lane 组成。

- **动态延迟环** — 每个声源的延迟环按该声源路径所需的最大延迟 × 1.25 + 50 ms 分配（以 125 ms 为单位
  向上取整，下限 0.25 s）。需要更长时，控制线程准备更大的环，音频线程在不复制、不分配的情况下将其替换。
  `st_rt_render_set_max_delay_seconds` 不再是为所有声源分配同一长度的值，而是**上限**。在箱形房间测量中，
  以 60 个声源计，每个声源的内存从 6.89 MiB 降至 2.70 MiB。
- **平台默认值** — `st_rt_create` 按构建目标设置。

| 平台 | 最大声源数 | 声源内存上限 | 延迟环上限 |
|---|---:|---:|---:|
| 桌面（Windows · macOS · Linux） | 128 | 无限制 | 2.0 s |
| 移动（Android · iOS） | 48 | 96 MiB | 1.0 s |
| Web（Emscripten） | 32 | 64 MiB | 0.5 s |

- **超出上限时**，`st_rt_source_create` 返回失败句柄（`v < 0`），最后状态为
  `ST_STATUS_BUDGET_EXCEEDED`（11）。这就是默认策略 `ST_MEMORY_REJECT_NEW`。
  改为 `ST_MEMORY_EVICT_FARTHEST` 后，会以与 `st_rt_source_destroy` 相同的路径移出距听者最远的声源，
  并接受新声源（被移出的 id 为 `STMemoryStats.lastEvictedSource`）。UE、Unity、FMOD、Wwise 封装以 dry 播放被拒绝的声源。
- **设置** — 创建时用 `STRT_CreateOptions.maxSources`（0 = 平台默认），创建之后用
  `st_rt_set_memory_budget` 修改。`STMemoryBudget` 中为 0 的字段保持默认值。降低上限时
  已有的声源会保留，从新的创建开始生效。`st_rt_get_memory_stats` 返回声源数、跟踪与估算字节数、
  拒绝与移出次数。
- **延迟环池** — 为复用而保留已回收延迟环的池有按平台的总量上限（桌面 16 · 移动 8 · Web 4 MiB，超出时先释放大的环），
  10 s 未使用的环会被释放。自 SDK 发行版 2.18.2-jhj.7 起，`STMemoryStats.trackedBytes`（因此 `estimatedBytes`）包含池中保留的环。
  预算判定超出时会先清空池再重新计算，因此不会因为池而拒绝或移出新声源（结构体布局不变）。

```c
typedef struct STMemoryBudget {
    uint32_t structSize, apiVersion;
    uint32_t maxSources;            /* 0 = 平台默认 */
    int32_t  rejectPolicy;          /* ST_MEMORY_REJECT_NEW(0, 默认) / ST_MEMORY_EVICT_FARTHEST(1) */
    uint64_t sourceBudgetBytes;     /* 0 = 无限制（仅观测） */
    uint64_t fixedPerSourceBytes;   /* 0 = 引擎默认（2.5 MiB）。仅用于估算 */
    float    ringFloorSeconds;      /* 0 = 0.25 */
    float    ringGrowthHeadroom;    /* 0 = 1.25 */
    int32_t  allowShrink;           /* 0 = 不收缩（会话期间保持最大值） */
    uint32_t reserved[5];
} STMemoryBudget;
```

:::caution 行为变更
- 桌面默认最大声源数为 **128**（以前无限制）。需要更多的主机用 `st_rt_set_memory_budget`
  调高。
- 移动和 Web 的延迟环上限默认为 1.0 s / 0.5 s，因此超过 343 m / 171 m 的早期路径不会被渲染。需要以前的
  值时，用 `st_rt_render_set_max_delay_seconds` 指定。
- 离线 DLL（`st_off_*`）不受预算约束（无限制）。
- 移动和 Web 以 Hybrid 早期反射为前提。Objects 模式下每个声源超过 30 MB。
:::

:::caution 从 SDK 2.18.2-jhj 头文件迁移时
- 从 SDK 发行版 2.22.0-jhj 起，`STRT_CreateOptions.maxSources` 位于**偏移 44**。因为引擎 2.20 把偏移 40 用作
  `startIdle`（结构体大小 48 不变）。用 2.18.2-jhj 头文件构建的主机请重新构建 —
  若在旧位置写入声源数，`startIdle` 不是 0/1，`st_rt_create` 会以 `ST_STATUS_INVALID_ARGUMENT` 失败。
- `ST_CAP1_MEMORY_BUDGET` 现在是位 63（2.18.2-jhj 为位 6，引擎 2.19 把该位用于 `ST_CAP1_SPEAKER_SET`）。
  不要直接写位号，请用头文件常量判断。
:::

各封装的设置汇总在 [SDK 概览](../sdk/overview.md#声源数量上限)中。

### Late reverb

一个 FDN16 由当前听者拥有，输入只有逐声源的 `ReverbSendTap`（source transport 的第一次
漫散射事件）。`st_rt_set_late_coupling_preset`（OFF / SUBTLE 6 dB / DEFAULT 9 dB / STRONG 12 dB）
按听者距声源扩散场的远近衰减注入量，用于处理在拐角之外混响不减弱的问题。

## 离线引擎

`SimpleSTOffline` 不使用设备或工作线程，而是在调用线程上执行一次传播以生成 canonical IR 缓存
（`st_off_ir_compute`），并在同一代数据上派生以下输出。

| 输出 | 函数 |
|---|---|
| Raw 能量 tap（early + reverb send + transport 账本） | `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |
| 压力 IR（宽带单声道 / 9 频段分离） | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| 双耳 IR（声像 / MIT KEMAR / SADIE D2） | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| 试听对（dry WAV + 渲染） | `st_off_ir_render_audition_pair` |

离线上下文可以创建多个听者（`st_off_listener_create`），只有进度与取消
（`st_off_ir_get_progress`, `st_off_ir_request_cancel`）是 lock-free 的。EDC、T60、C50 等能量分析
基于压力 IR 的 `h(t)²` 计算。

## 诊断

| 函数 | 用途 |
|---|---|
| `st_rt_get_timing` | 各 lane 的传播、IR 构建、渲染块时间（ms） |
| `st_rt_ir_get_stats` | 一次 IR 发布的快照（tap 数、bed 单元、prepare CPU/wall） |
| `st_rt_render_get_process_stats` | 512 帧块各阶段的 µs |
| `st_rt_scene_get_stats` | 在线网格、对象、声源、三角形数 |
| `st_rt_debug_set_collect_visual_paths` + `st_rt_debug_copy_visual_paths` | 用于可视化的路径点列（guide ray / direct / reflection / diffraction / transport） |
| `st_rt_debug_copy_mesh_accel_nodes` / `_scene_accel_nodes` | BLAS/TLAS 节点包围盒 |
| `st_rt_scene_raycast` | 用传播所用的加速结构查询最近命中 |

![SimpleST 演示应用](/img/core/demo-app.png)

## 参考

- [从 STCoreV2 到 SimpleST](./stcorev2.md) — 与旧 `exa*` API 的对照表
- [SDK 概览](../sdk/overview.md)
- [FMOD 插件](../sdk/fmod.md) · [Wwise 插件](../sdk/wwise.md)
