---
sidebar_position: 2
title: 从 STCoreV2 到 SimpleST
sidebar_label: STCoreV2 → SimpleST
description: 从上一代引擎 STCoreV2（exasoundC.h）迁移到现行 SimpleST ABI 6 时发生变化的概念与 API 对照表。
---

# 从 STCoreV2 到 SimpleST

**STCoreV2**（`exaSound`，`exasoundC.h` 中的 `exa*` API）是 Sound Tracing 的上一代核心。
自 2026 年 10 月起，所有 SDK、插件和演示都已替换为 [SimpleST](./simplest.md)，
STCoreV2 实现不再分发。本页整理了拥有 STCoreV2 集成的团队在迁移时需要确认的差异。

:::info 关于此 URL
本页地址（`/core/stcorev2`）是过去 STCoreV2 参考文档所在的位置。参考正文已由
[SimpleST](./simplest.md) 取代。
:::

## 变化的概念

| 项目 | STCoreV2 | SimpleST |
|---|---|---|
| 头文件 / 前缀 | `exasoundC.h`，`exa*` 单一 DLL | `STRealtime.h`（`st_rt_*`）+ `STOffline.h`（`st_off_*`）2-DLL，公共 `STTypes.h` |
| 上下文 | 全局 `exaInit()` / `exaReset()` | 上下文对象 `st_rt_create` / `st_rt_destroy`。一个进程中可有多个 |
| 实体 id | 全部为 `int`，**0 = 无效** | 类型句柄 `STMeshId` 等，**`v < 0` = 无效**，0 有效 |
| 场景 | `exaNewScene` + `exaSceneAdd*` | 上下文即场景。每个实时上下文一个听者（隐式） |
| 材质 | 8 频段（`67.5…8k Hz`），吸收/透射直接存储在三角形上，推导 `reflection = 1 − (A+T)`，`Surface` / `Solid Distance` 透射模型 | **9 频段（63…16k Hz）** 显式 R/A/T/scattering，严格校验 `|R+A+T−1| ≤ 0.001`，无自动推导，不可变材质（替换时创建新材质句柄） |
| 距离衰减 | 多项式 `1/(c + l·d + q·d²)`，逐声源、逐路径 | 物理 `1/r` + 参考/最小距离（`st_rt_set_physical_distance_attenuation`），ISO 9613-1 空气吸收 |
| 声源音频 | 渲染器逐声源输出（`exaRenderSound`, `exaCreateRenderer`） | 声源是**单声道输入流**，听者渲染器一次性把全部声源混合为立体声/N 声道（`st_rt_render_process`） |
| 渲染输出 | 调用方逐声源收集缓冲 | `DEVICE` / `HOST_PULL` / `HOST_PULL_BUFFERED` 三种模式，内置主机采样率转换 |
| 早期反射 | 逐路径对象 | Objects / **Hybrid（exact 预算 + HOA3 bed）** |
| HRTF | KU100 parametric / convolution / SADIE H12 表加载，Band8 | 声像 / 内置 **MIT KEMAR** / **SADIE II D2**（单个文件）。没有 KU100、H12、Band8、parametric |
| GPU | WebGPU（Dawn）propagation provider | **无**（CPU 管线调度器）。`enableGpu` 类调用返回错误 |
| 加速结构 | HKDTree / LBVH / LBVH_SIMD4·8·16 / NWAY，逐网格构建选项 | 上下文全局 `st_rt_scene_set_accel`（默认 TinyBVH），无逐网格选项 |
| 蒙皮网格 | `exaMeshUpdateVertices` → `exaMeshRefit` 2-call refit | **无 refit** — 新姿态通过创建新网格（`st_rt_mesh_create`）替换 |
| 对象更新 | `STATIC / REFIT / REBUILD / DYNAMIC` 4 种 | `isDynamic` 标志（静态 = 静态 TLAS，动态 = 只更新变换） |
| path cache / seed | `pathCacheSize`, `seedValue` 选项 | 只有 `seedValue`（`STRT_CreateOptions`），无 path cache 选项 |
| 传播调用 | `exaTickScene` 同步 | `st_rt_propagate` — PIPELINED 唤醒工作线程后立即返回，SYNCHRONOUS 在调用线程上执行 |
| 统计 | `exaGetStatistics`, `exaPropagatorGetProfile`, `exaGetMemoryTraceSnapshot` | `st_rt_get_timing`, `st_rt_ir_get_stats`, `st_rt_render_get_process_stats`, `st_rt_scene_get_stats` |
| 可视化 | `exaGetValidPaths`（`ExaPathData`） | `st_rt_debug_set_collect_visual_paths` + `acquire_snapshot` + `copy_visual_paths` |
| 坐标 | 右手系，`+Y` up，`-Z` forward，`exaListenerSetCoordinateBasis` | **左手系，`+Y` up，`+Z` forward（与 Unity 相同）**，无 basis API — 由封装转换 |
| 单位 | `ExaSTOption.sceneRatio` | `STRT_CreateOptions.sceneRatio`（创建时一次） |
| 最大深度 | `EXA_MAX_DEPTH = 16` | 反射 16，透射 64 |

## 函数对照表

| STCoreV2 | SimpleST（实时） |
|---|---|
| `exaInit()` / `exaReset()` | `st_rt_create(&opt, &ctx)` / `st_rt_destroy(ctx)` |
| `exaGetVersion()` | `st_rt_get_version_string()`, `st_rt_get_api_version()`, `st_rt_get_capabilities()` |
| `exaGetLastError()` | `st_rt_get_last_status(ctx)`, `st_rt_get_last_error(ctx, buf, cap)` |
| `exaNewScene()` / `exaTickScene()` | （上下文）/ `st_rt_propagate(ctx)` |
| `exaAddSoundMaterial()` / `exaSetSoundMaterial()` | `st_rt_material_create(ctx, &mat)` / 材质不可变 — 创建新材质后 `st_rt_mesh_set_material` |
| 默认材质表加载（SDK 侧） | `st_rt_material_load_defaults(ctx)` |
| `exaNewMesh()` + `exaMeshSetData()` + `exaMeshSetMaterial()` | `st_rt_mesh_create(ctx, &mesh, material, triMaterialIndices)` |
| `exaMeshUpdateVertices()` + `exaMeshRefit()` | 无 — 创建新网格后替换对象 |
| `exaNewObject()` + `exaObjectSetMesh()` + `exaSceneAddObject()` | `st_rt_object_create(ctx, mesh, &transform, isDynamic)` 或 `_q`（位置、四元数、缩放） |
| `exaObjectSetPosition/Rotation/Scale()` | `st_rt_object_set_transform[_q]()` |
| `exaObjectSetUpdateType()` | 创建时的 `isDynamic`；静态变更用 `st_rt_build`，动态用 `st_rt_build_dynamic` |
| `exaNewSoundSource()` + `exaSceneAddSource()` | `st_rt_source_create(ctx, &desc)` |
| `exaSoundSourceSetPosition/Direction/Velocity()` | `st_rt_source_set_position/direction/velocity()` |
| `exaSoundSourceSetIntensity()` | `STSourceDesc.intensity`（压力倍率）+ `st_rt_source_set_energy()`（能量倍率） |
| `exaSoundSourceSetRayCount/Depth()` | `st_rt_source_set_ray_count()`, `st_rt_source_set_depth()` |
| `exaSoundSourceSetReverbSendDb()` | `st_rt_source_set_path_volume(ctx, src, ST_SOURCE_VOLUME_REVERB, linear)` |
| `exaSoundSourceSetPathEnable()` | `st_rt_source_set_path_enabled(ctx, src, pathType, enabled)` |
| 逐声源指向性表 | `st_rt_source_set_directivity()` + `st_rt_source_set_orientation_q()`，锥形公式用 `st_rt_source_set_axis_attenuation()` |
| `exaNewListener()` + `exaSceneAddListener()` | 隐式单听者（`st_rt_listener_*`） |
| `exaListenerSetPosition/Orientation/Velocity()` | `st_rt_listener_set_position/rotation(yaw,pitch)/velocity()` |
| `exaListenerSetRayCount/RayDepth()` | `st_rt_listener_set_ray_count()`, `st_rt_set_max_depth()` |
| `exaListenerSetOption()`（`sceneRatio` 等） | `STRT_CreateOptions.sceneRatio`，`st_rt_set_*` 策略函数 |
| `exaListenerSetCoordinateBasis()` | 无 — 在主机封装中转换 |
| `exaListenerSetHrtfMode()` / `exaListenerLoadHrtf()` | `st_rt_render_set_spatializer(ctx, 0/1/2)` |
| `exaCreateRenderer()` / `exaRenderSound()` / `exaRemoveRenderer()` | `st_rt_render_start(ctx, useHrtf)` / `st_rt_render_process(ctx, out, frames)` / `st_rt_render_stop(ctx)` |
| 声源音频输入（主机混音） | `st_rt_source_attach_stream()` + `st_rt_source_write_stream()`，或 `st_rt_source_set_audio_file()` |
| `exaGetValidPathCount/Paths()` | `st_rt_debug_set_collect_visual_paths(mask)` → `st_rt_debug_acquire_snapshot()` → `st_rt_debug_copy_visual_paths()` |
| `exaGetSortedIRDatas()` | 实时 ABI 中没有 — 离线 `st_off_ir_compute()` + `st_off_ir_copy_raw_early_taps()` / `render_pressure()` |
| `exaGetStatistics()` / `exaPropagatorGetProfile()` | `st_rt_get_timing()`, `st_rt_ir_get_stats()`, `st_rt_render_get_process_stats()`, `st_rt_scene_get_stats()` |
| `exaGetMemoryTraceSnapshot()` | 无 |
| `exaPropagatorInitGpu()` / `exaPropagatorSetGpuProvider()` | 无（仅 CPU） |
| `exaPropagatorGetGuidePlanes/MirrorPositions()` | 无（guide ray 通过 visual path 收集 mask 观察） |

## 迁移检查清单

1. **把材质重新录入为 9 频段**。不要复制 8 频段值来填充，而是测量或估算 16 kHz 的值，
   并让每个频段满足 R+A+T=1。SimpleST 没有 `Solid Distance` 透射距离，请换算为表面透射系数（T）。
2. **把声源音频作为单声道流推送**。逐声源的输出节点和效果器移到听者混音之后。
3. 如果曾使用 `exaMeshRefit` 路径，改为**定期用新网格替换**蒙皮网格的结构
   （UE 插件的 `SkinnedPoseRefreshSeconds` 就是这种方式）。
4. 确认坐标系。`-Z` forward 的主机需要翻转 Z 符号（soundtrace.js 由 `coordinateBasis` 处理）。
5. 把 `exaRenderSound` 替换为主机音频回调中的 `st_rt_render_process`，并在创建选项中指定
   `renderOutputMode` 和 `hostSampleRate`。
6. 在 `st_rt_render_start` **之后**应用 `STRenderOptions.reserved0 = 1`（Hybrid）（从 2.18.0 起引擎默认
   就是 Hybrid，但仍建议显式设置）。如果由主机负责输出限制器，在同一位置用 `useLimiter = 0` 将其关闭。
7. 用 capability 位（`ST_CAP_*`）确认功能是否存在，并填好 `structSize`/`apiVersion` 后再调用。

## 参考

- [SimpleST](./simplest.md)
- 各 SDK 的变更：[Web](../sdk/web.md) · [Unity](../sdk/unity.md) · [Unreal Engine](../sdk/ue.md)
