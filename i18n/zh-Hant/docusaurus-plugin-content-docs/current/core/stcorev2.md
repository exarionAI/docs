---
sidebar_position: 2
title: 從 STCoreV2 到 SimpleST
sidebar_label: STCoreV2 → SimpleST
description: 從前一代引擎 STCoreV2（exasoundC.h）遷移到現行 SimpleST ABI 6 時改變的概念與 API 對照表。
---

# 從 STCoreV2 到 SimpleST

**STCoreV2**（`exaSound`，`exasoundC.h` 的 `exa*` API）是 Sound Tracing 的前一代核心。
自 2026 年 10 月起，所有 SDK、外掛與示範都已換成 [SimpleST](./simplest.md)，
STCoreV2 實作不再發布。本頁整理擁有 STCoreV2 整合的團隊在遷移時需要確認的差異。

:::info 關於這個 URL
本頁的網址（`/core/stcorev2`）是過去 STCoreV2 參考文件所在的位置。參考文件本文已由
[SimpleST](./simplest.md) 取代。
:::

## 改變的概念

| 項目 | STCoreV2 | SimpleST |
|---|---|---|
| 標頭 / 前綴 | `exasoundC.h`，`exa*` 單一 DLL | `STRealtime.h`（`st_rt_*`）+ `STOffline.h`（`st_off_*`）2-DLL，共用 `STTypes.h` |
| 上下文 | 全域 `exaInit()` / `exaReset()` | 上下文物件 `st_rt_create` / `st_rt_destroy`。一個行程可有多個 |
| 實體 id | 全為 `int`，**0 = 無效** | 型別化控制代碼 `STMeshId` 等，**`v < 0` = 無效**，0 為有效 |
| 場景 | `exaNewScene` + `exaSceneAdd*` | 上下文即場景。每個即時上下文一個聆聽者（隱含） |
| 材質 | 8 頻段（`67.5…8k Hz`），吸收／穿透直接存於三角形，推導 `reflection = 1 − (A+T)`，`Surface` / `Solid Distance` 穿透模型 | **9 頻段（63…16k Hz）** 明示 R/A/T/scattering，嚴格驗證 `|R+A+T−1| ≤ 0.001`，無自動推導，不可變材質（更換時建立新材質控制代碼） |
| 距離衰減 | 多項式 `1/(c + l·d + q·d²)`，逐音源、逐路徑 | 物理 `1/r` + 參考／最小距離（`st_rt_set_physical_distance_attenuation`），ISO 9613-1 空氣吸收 |
| 音源音訊 | 渲染器逐音源輸出（`exaRenderSound`、`exaCreateRenderer`） | 音源為 **單聲道輸入串流**，聆聽者渲染器一次將全部音源混成立體聲／N 聲道（`st_rt_render_process`） |
| 渲染輸出 | 呼叫端逐音源收集緩衝區 | `DEVICE` / `HOST_PULL` / `HOST_PULL_BUFFERED` 三種模式，內建主機取樣率轉換 |
| 早期反射 | 逐路徑物件 | Objects / **Hybrid（exact 預算 + HOA3 bed）** |
| HRTF | KU100 parametric / convolution / SADIE H12 表載入，Band8 | panning / 內建 **MIT KEMAR** / **SADIE II D2**（單一檔案）。沒有 KU100、H12、Band8、parametric |
| GPU | WebGPU（Dawn）propagation provider | **無**（CPU 管線排程器）。`enableGpu` 之類會回傳錯誤 |
| 加速結構 | HKDTree / LBVH / LBVH_SIMD4·8·16 / NWAY，逐網格建置選項 | 上下文全域 `st_rt_scene_set_accel`（預設 TinyBVH），沒有逐網格選項 |
| 蒙皮網格 | `exaMeshUpdateVertices` → `exaMeshRefit` 兩次呼叫 refit | **沒有 refit** — 新姿態以建立新網格（`st_rt_mesh_create`）替換 |
| 物件更新 | `STATIC / REFIT / REBUILD / DYNAMIC` 四種 | `isDynamic` 旗標（靜態 = 靜態 TLAS，動態 = 只更新變換） |
| path cache / seed | `pathCacheSize`、`seedValue` 選項 | 只有 `seedValue`（`STRT_CreateOptions`），沒有 path cache 選項 |
| 傳播呼叫 | `exaTickScene` 同步 | `st_rt_propagate` — PIPELINED 會喚醒工作執行緒並立即返回，SYNCHRONOUS 在呼叫執行緒上執行 |
| 統計 | `exaGetStatistics`、`exaPropagatorGetProfile`、`exaGetMemoryTraceSnapshot` | `st_rt_get_timing`、`st_rt_ir_get_stats`、`st_rt_render_get_process_stats`、`st_rt_scene_get_stats` |
| 視覺化 | `exaGetValidPaths`（`ExaPathData`） | `st_rt_debug_set_collect_visual_paths` + `acquire_snapshot` + `copy_visual_paths` |
| 座標 | 右手系，`+Y` 向上，`-Z` 向前，`exaListenerSetCoordinateBasis` | **左手系，`+Y` 向上，`+Z` 向前（與 Unity 相同）**，沒有 basis API — 由包裝層轉換 |
| 單位 | `ExaSTOption.sceneRatio` | `STRT_CreateOptions.sceneRatio`（建立時一次） |
| 最大深度 | `EXA_MAX_DEPTH = 16` | 反射 16，穿透 64 |

## 函式對照表

| STCoreV2 | SimpleST（即時） |
|---|---|
| `exaInit()` / `exaReset()` | `st_rt_create(&opt, &ctx)` / `st_rt_destroy(ctx)` |
| `exaGetVersion()` | `st_rt_get_version_string()`、`st_rt_get_api_version()`、`st_rt_get_capabilities()` |
| `exaGetLastError()` | `st_rt_get_last_status(ctx)`、`st_rt_get_last_error(ctx, buf, cap)` |
| `exaNewScene()` / `exaTickScene()` | （上下文）/ `st_rt_propagate(ctx)` |
| `exaAddSoundMaterial()` / `exaSetSoundMaterial()` | `st_rt_material_create(ctx, &mat)` / 材質不可變 — 建立新材質後 `st_rt_mesh_set_material` |
| 載入預設材質表（SDK 端） | `st_rt_material_load_defaults(ctx)` |
| `exaNewMesh()` + `exaMeshSetData()` + `exaMeshSetMaterial()` | `st_rt_mesh_create(ctx, &mesh, material, triMaterialIndices)` |
| `exaMeshUpdateVertices()` + `exaMeshRefit()` | 無 — 建立新網格後替換物件 |
| `exaNewObject()` + `exaObjectSetMesh()` + `exaSceneAddObject()` | `st_rt_object_create(ctx, mesh, &transform, isDynamic)` 或 `_q`（位置、四元數、縮放） |
| `exaObjectSetPosition/Rotation/Scale()` | `st_rt_object_set_transform[_q]()` |
| `exaObjectSetUpdateType()` | 建立時的 `isDynamic`；靜態變更用 `st_rt_build`，動態用 `st_rt_build_dynamic` |
| `exaNewSoundSource()` + `exaSceneAddSource()` | `st_rt_source_create(ctx, &desc)` |
| `exaSoundSourceSetPosition/Direction/Velocity()` | `st_rt_source_set_position/direction/velocity()` |
| `exaSoundSourceSetIntensity()` | `STSourceDesc.intensity`（壓力倍率）+ `st_rt_source_set_energy()`（能量倍率） |
| `exaSoundSourceSetRayCount/Depth()` | `st_rt_source_set_ray_count()`、`st_rt_source_set_depth()` |
| `exaSoundSourceSetReverbSendDb()` | `st_rt_source_set_path_volume(ctx, src, ST_SOURCE_VOLUME_REVERB, linear)` |
| `exaSoundSourceSetPathEnable()` | `st_rt_source_set_path_enabled(ctx, src, pathType, enabled)` |
| 逐音源指向性表 | `st_rt_source_set_directivity()` + `st_rt_source_set_orientation_q()`，錐形公式用 `st_rt_source_set_axis_attenuation()` |
| `exaNewListener()` + `exaSceneAddListener()` | 隱含的單一聆聽者（`st_rt_listener_*`） |
| `exaListenerSetPosition/Orientation/Velocity()` | `st_rt_listener_set_position/rotation(yaw,pitch)/velocity()` |
| `exaListenerSetRayCount/RayDepth()` | `st_rt_listener_set_ray_count()`、`st_rt_set_max_depth()` |
| `exaListenerSetOption()`（`sceneRatio` 等） | `STRT_CreateOptions.sceneRatio`、各 `st_rt_set_*` 政策函式 |
| `exaListenerSetCoordinateBasis()` | 無 — 在主機包裝層轉換 |
| `exaListenerSetHrtfMode()` / `exaListenerLoadHrtf()` | `st_rt_render_set_spatializer(ctx, 0/1/2)` |
| `exaCreateRenderer()` / `exaRenderSound()` / `exaRemoveRenderer()` | `st_rt_render_start(ctx, useHrtf)` / `st_rt_render_process(ctx, out, frames)` / `st_rt_render_stop(ctx)` |
| 音源音訊輸入（主機混音） | `st_rt_source_attach_stream()` + `st_rt_source_write_stream()`，或 `st_rt_source_set_audio_file()` |
| `exaGetValidPathCount/Paths()` | `st_rt_debug_set_collect_visual_paths(mask)` → `st_rt_debug_acquire_snapshot()` → `st_rt_debug_copy_visual_paths()` |
| `exaGetSortedIRDatas()` | 即時 ABI 中沒有 — 離線 `st_off_ir_compute()` + `st_off_ir_copy_raw_early_taps()` / `render_pressure()` |
| `exaGetStatistics()` / `exaPropagatorGetProfile()` | `st_rt_get_timing()`、`st_rt_ir_get_stats()`、`st_rt_render_get_process_stats()`、`st_rt_scene_get_stats()` |
| `exaGetMemoryTraceSnapshot()` | 無 |
| `exaPropagatorInitGpu()` / `exaPropagatorSetGpuProvider()` | 無（僅 CPU） |
| `exaPropagatorGetGuidePlanes/MirrorPositions()` | 無（guide ray 以 visual path 收集 mask 觀察） |

## 遷移檢查清單

1. **以 9 頻段重新輸入材質**。不要複製 8 頻段來填充，而是量測或估算 16 kHz 的值，
   並讓每個頻段滿足 R+A+T=1。SimpleST 沒有 `Solid Distance` 穿透距離，請換算成表面穿透係數（T）。
2. **將音源音訊推成單聲道串流**。逐音源的輸出節點與效果移到聆聽者混音之後。
3. 若原本有 `exaMeshRefit` 路徑，改為 **定期以新網格替換** 蒙皮網格的結構
   （UE 外掛的 `SkinnedPoseRefreshSeconds` 就是這種方式）。
4. 確認座標系。`-Z` 向前的主機要翻轉 Z 的符號（soundtrace.js 由 `coordinateBasis` 處理）。
5. 將 `exaRenderSound` 換成主機音訊回呼中的 `st_rt_render_process`，
   並在建立選項中指定 `renderOutputMode` 與 `hostSampleRate`。
6. 在 `st_rt_render_start` **之後** 套用 `STRenderOptions.reserved0 = 1`（Hybrid）。
7. 以 capability 位元（`ST_CAP_*`）確認功能是否存在，並填入 `structSize`/`apiVersion` 再呼叫。

## 參考

- [SimpleST](./simplest.md)
- 各 SDK 的變更：[Web](../sdk/web.md) · [Unity](../sdk/unity.md) · [Unreal Engine](../sdk/ue.md)
