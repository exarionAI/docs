---
sidebar_position: 1
title: SimpleST
description: Sound Tracing 的現行原生引擎 SimpleST — C++20 幾何聲學核心、2-DLL 公開 C ABI（ABI 6）、9 頻段材質、Hybrid 早期反射、主機 pull 渲染。
---

# SimpleST

**SimpleST** 是 Sound Tracing 產品線的現行原生引擎。它是一個 C++20 函式庫，從網格、材質、音源與聆聽者
以幾何方式計算直達音、穿透、反射、繞射路徑與 late reverb 統計，再將結果合成為即時空間音訊或
確定性的脈衝響應（IR）。它取代了前一代引擎 [STCoreV2](./stcorev2.md)，所有 SDK 與中介軟體外掛
都建構在這個引擎的公開 C ABI 之上。

![引擎管線](/img/core/pipeline-overview.png)

## 概覽

| 項目 | 值 |
|---|---|
| 引擎版本 | **2.12.0**（`ST_VERSION_STRING`） |
| 公開 ABI | **ABI 6**（`ST_ABI_VERSION`，3.0 乾淨斷裂） |
| 主要語言 | C++20（暴露 C ABI，相容 C11 標頭） |
| 建置系統 | CMake 3.21+ · 平台進入點 `mainBuild.sh` |
| 平台 | Windows x64 · macOS Universal · Linux x86_64 · Android（arm64-v8a/armeabi-v7a/x86_64）· iOS（device/simulator）· Web（Emscripten，pthreads） |
| 發布形式 | 即時 DLL `SimpleSTRealtime` + 離線 DLL `SimpleSTOffline`（iOS/Web 為靜態函式庫） |
| 取樣率 | 引擎內部固定 44.1 kHz，主機取樣率由內建重取樣器轉換 |
| 頻段 | 9 個八度頻段 `63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz` |
| 加速結構 | TinyBVH（預設）· BinnedSAH · HybridKD · LBVH · LBVH_SIMD |
| 測試 | 回歸測試框架 `SimpleST_demo` + 約 90 個 CTest |

## 架構

```text
SceneManager → STPropagator → STIRConverter ─┬→ STOnlineAuralizator  (即時串流)
                                             └→ STOfflineAuralizator (確定性 RIR / 頻段 IR)
```

- **SceneManager** — 擁有網格、材質、音源、聆聽者與 TLAS/BLAS。靜態幾何體只建置一次，
  動態物件只更新變換。
- **STPropagator** — 純幾何階段。找出直達音／穿透／反射／繞射路徑，並計算 late reverb 用的
  房間統計（mean free path、表面積、材質分布）與 source transport（擴散傳輸）射線。
  聲學增益不在這裡計算。
- **STIRConverter** — 將幾何轉換到聲學領域。延遲、Doppler slope、9 頻段能量增益、
  距離／空氣衰減、UTD 繞射、reverb send tap、HOA3 early bed 彙整都在這裡決定。
- **Auralizator** — 共用執行器之上有兩個渲染器。即時渲染器依序處理 9 頻段分頻器 →
  頻段延遲環 → 路徑 tap（Doppler／淡入淡出）→ 空間化（panning / MIT KEMAR / SADIE II D2 HRIR）→
  FDN16 late reverb → 限幅器。

![三種引擎外殼](/img/core/engine-shells.png)

引擎外殼（shell）有三種。

| 外殼 | 用途 |
|---|---|
| `STRealTimeEngine` | 同步傳播 + 音訊渲染。供診斷與相容用途 |
| `STRealTimeMultiEngine` | Propagator/IRConverter 工作執行緒與 latest-only 三重緩衝。**即時預設** |
| `STOfflineEngine` | 建立一次 canonical IR 快取，再以確定性方式衍生 Raw 能量 / 壓力 IR / 雙耳 IR |

## 公開 C ABI

公開 ABI 在實體上分成兩個 DLL，共用的 POD 位於 `STTypes.h`。

| 標頭 | 上下文 | 函式前綴 | 角色 |
|---|---|---|---|
| `SimpleST/ABI/STRealtime.h` | `STRT_Context*` | `st_rt_*` | 即時傳播 + 音訊渲染（121 個 export） |
| `SimpleST/ABI/STOffline.h` | `STOFF_Context*` | `st_off_*` | 離線 IR 計算與渲染（87 個 export） |
| `SimpleST/ABI/STTypes.h` | — | `ST_*` | 共用 POD、enum、capability 位元 |

命名規則為 `st_<dll>_<family>_<verb>[_<what>]`，family 為
`scene / mesh / object / material / source / listener / render / debug / ir`。
上下文生命週期、建置與全域政策函式沒有 family。

### 實體控制代碼

網格、物件、音源、聆聽者、材質的 id 各是不同的 struct 型別。大小與呼叫慣例與 `int32_t` 相同，
但混用不同種類會導致編譯失敗。

```c
typedef struct STMeshId     { int32_t v; } STMeshId;
typedef struct STObjectId   { int32_t v; } STObjectId;
typedef struct STSourceId   { int32_t v; } STSourceId;
typedef struct STListenerId { int32_t v; } STListenerId;
typedef struct STMaterialId { int32_t v; } STMaterialId;
```

建立函式以值回傳控制代碼，**失敗為 `v < 0`**。`0` 是有效的 id。

### 即時函式群摘要

| family | 代表函式 |
|---|---|
| 生命週期 | `st_rt_init_create_options`、`st_rt_create`、`st_rt_destroy`、`st_rt_get_api_version`、`st_rt_get_version_string`、`st_rt_get_capabilities`、`st_rt_get_last_status/error` |
| material | `st_rt_material_create`、`st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`（單一材質或逐三角形材質索引）、`st_rt_mesh_set_material`、`st_rt_object_create[_q]`、`st_rt_object_set_transform[_q]`、`*_destroy` |
| scene | `st_rt_scene_set_accel`、`st_rt_scene_set_triangle_intersection`、`st_rt_scene_get_stats`、`st_rt_scene_raycast` |
| source | `st_rt_source_create`、`set_position/direction/velocity`、`set_orientation_q`、`set_directivity`、`set_axis_attenuation`、`set_energy`、`set_path_enabled`、`set_path_volume`、`set_ray_count`、`set_depth`、`set_transport_refresh_steps` |
| source 音訊輸入 | `st_rt_source_set_audio_file`（WAV/FLAC/MP3/Ogg）、`st_rt_source_attach_stream` + `write_stream` + `get_stream_status`（主機 PCM）、`play/pause/stop`、`clear_audio` |
| listener | `st_rt_listener_set_position/velocity/rotation`、`set_ray_count`、`set_ray_sampling_method` |
| 傳播 | `st_rt_build`、`st_rt_build_dynamic`、`st_rt_propagate`、`st_rt_set_max_depth`、`st_rt_set_transmission_max_depth`、`st_rt_set_path_type_enabled`、`st_rt_set_lane_update_interval` |
| 聲學政策 | `st_rt_set_atmosphere`、`st_rt_set_physical_distance_attenuation`、`st_rt_set_acoustic_feature_enabled`、`st_rt_set_doppler_gain_mode`、`st_rt_set_late_coupling[_preset]`、`st_rt_set_early_late_band_energy_targets` |
| render | `st_rt_render_start/stop`、`st_rt_render_process`（主機 pull）、`set_options/get_options`、`set_spatializer`、`set_speaker_layout[_custom]`、`set_eq`、`set_limiter_type`、`set_path_fade_time`、`set_max_delay_seconds`、`get_latency_frames`、`get_process_stats` |
| 執行緒 | `st_rt_set_thread_attributes`、`st_rt_get_thread_inventory`、`STRT_CreateOptions.maxComputeThreads` |
| 診斷 | `st_rt_get_timing`、`st_rt_ir_get_stats`、`st_rt_debug_acquire_snapshot`、`st_rt_debug_copy_visual_paths`、`st_rt_debug_copy_mesh/scene_accel_nodes` |

### 執行緒標籤

標頭中每個 export 上方都有一行標籤，標示可呼叫它的執行緒。

| 標籤 | 意義 |
|---|---|
| `[control]` | 供控制執行緒使用。可能取得場景鎖，因此不要在音訊回呼中呼叫 |
| `[control, blocking]` | 加速結構建置、裝置 start/stop、HRIR 載入等長時間的互斥區段 |
| `[any]` | 不取鎖，只讀取 atomic 與常數，或只填寫呼叫端的 POD |
| `[audio]` | 可在主機音訊執行緒安全呼叫 — `st_rt_render_process`、`st_rt_source_write_stream` |

:::tip
FMOD、Wwise、UE、Unity 包裝層全都設有 **專用控制執行緒**，並將 `[control]` 呼叫序列化到該執行緒。
直接使用 ABI 時也建議採用相同結構。
:::

## 開始使用

### SDK 配置

`mainBuild.sh build <platform> release` 產生的 SDK 採用與 UE `ThirdParty` 相同的配置。

```text
out/dist/<platform>_release/SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/ SimpleSTRealtime.{dll,dylib,so} · SimpleSTOffline.* · (iOS/Web) libsimplest_static.a
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin + 授權
└─ Licenses/                miniaudio · tinybvh
```

### 最小使用情境

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);             // scheduler=PIPELINED, sceneRatio=1(m), renderOutputMode=DEVICE
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 由主機取走區塊的情況
opt.hostSampleRate   = 48000;                 // 主機取樣率。0 = 維持 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error */ }

// 1. 材質 — 整批註冊預設材質庫（BRAS 24 種）。回傳第一個材質的控制代碼。
STMaterialId firstMat = st_rt_material_load_defaults(ctx);

// 2. 網格 + 物件
STMesh mesh = { numVertices, vertices, numTriangles, triangles };   // xyz interleaved, index triplets
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, firstMat, NULL);    // NULL = 整個網格使用單一材質
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 音源與聆聽者
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
st_rt_listener_set_rotation(ctx, /*yaw*/0.f, /*pitch*/0.f);        // 弧度

// 4. 主機 PCM 串流輸入
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };     // 單聲道，capacity 0 = 8192 影格
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 建置加速結構 + 啟動渲染 + 選擇 Hybrid 早期反射
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                                                   // 1 = hybrid（必須在 render_start 之後！）
st_rt_render_set_options(ctx, &ro);

// 6. 遊戲迴圈（控制執行緒）
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // PIPELINED 會喚醒工作執行緒並立即返回

// 7. 音訊回呼（主機音訊執行緒）
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);   // [audio]
st_rt_render_process(ctx, interleavedStereoOut, frames);  // [audio]

st_rt_destroy(ctx);
```

:::note
`st_rt_render_start` 會重設渲染預設，因此 **Hybrid（`reserved0 = 1`）必須在它之後** 套用。
所有官方外掛都遵守這個順序。
:::

## 核心概念

### 座標與單位契約

- **座標系與 Unity 相同** — 左手系，`+Y` 向上，`+Z` 向前，`+X` 向右。yaw 為正 = 向右轉，
  pitch 為正 = 向下。Unity 主機不需轉換即可直接傳入；`-Z` 向前的主機（Three.js 等）由包裝層翻轉 Z。
  UE 則由外掛執行 `(Y, Z, X)` 重排與 cm→m 轉換。
- **單位為公尺**。使用其他單位的主機在建立時一次指定 `STRT_CreateOptions.sceneRatio`
  （cm = `0.01`，ft = `0.3048`）。座標以場景單位原樣傳入，引擎只在需要公尺的地方才乘上比例。
  **禁止重複縮放**：不要在預先縮放幾何體的同時又指定 `sceneRatio`。
- 角度：聆聽者 rotation 為 **弧度**，只有揚聲器配置使用度（degree）。
- 網格繞序：交點核心為雙面，因此反射與穿透與繞序無關，但繞射邊緣判定有兩處會看法線符號。
  請在同一個網格內保持一致的繞序。

### 材質 — 9 頻段、嚴格驗證

```c
typedef struct STMaterial {
    uint32_t structSize, apiVersion;
    float reflection[9], absorption[9], transmission[9], scattering[9];
    uint32_t reserved[8];
} STMaterial;
```

- R/A/T/scattering 全都是 **energy-domain** 的無因次比例，每個頻段都必須滿足
  `|R + A + T − 1| ≤ 0.001`。沒有自動推導、正規化或插值。
- scattering 是反射能量中的擴散比例，不計入總和。
- 預設材質庫為從 BRAS 量測擬合的 24 種（`st_rt_material_load_defaults`）。
- `sqrt` 只在渲染邊界恰好套用一次。主機傳入的值是能量。

### 路徑種類與閘門

| pathType | 意義 |
|---|---|
| 0 Direct | 直達音 |
| 1 Transmission | 穿過幾何體的直達音（遮蔽） |
| 2 Reflection | 鏡面反射（最大深度 `st_rt_set_max_depth`，預設 8） |
| 3 Diffraction | UTD 繞射（source-side 1 + terminal 1 edge） |
| 4 Reverb | source transport 擴散傳輸 → FDN16 late reverb |

有全域（`st_rt_set_path_type_enabled`）與逐音源（`st_rt_source_set_path_enabled`）閘門，
並可用 `st_rt_set_acoustic_feature_enabled` 分別關閉空氣吸收、傳播延遲與直達音遮蔽。
全部關閉後就只剩距離衰減 + 立體聲 panning，成為「Sound Tracing OFF」的基準線。

### 射線預算

| 軸 | 預設值 | 函式 |
|---|---|---|
| 聆聽者 guide ray | `16 × 16`，Fibonacci sphere | `st_rt_listener_set_ray_count`、`_set_ray_sampling_method` |
| 反射最大深度 | 全域 8，逐音源 4 | `st_rt_set_max_depth`、`st_rt_source_set_depth` |
| 音源 transport ray | `16 × 8` | `st_rt_source_set_ray_count` |
| 穿透最大深度 | 64 | `st_rt_set_transmission_max_depth` |
| transport 更新步數 | 0（自動：PIPELINED 動態 8 · 靜態 16） | `st_rt_source_set_transport_refresh_steps` |

### Hybrid 早期反射（即時遊戲建議）

![Hybrid 早期反射](/img/core/hybrid-early-reflections.png)

`STRenderOptions.reserved0`（earlySpatialMode）有兩個值。

| 值 | 行為 | 用途 |
|---|---|---|
| `0` Objects | 將所有 early path 渲染為個別的空間化物件 | 基準聆聽、離線 A/B（預設的預設值） |
| `1` Hybrid | 只有聆聽者全域預算（反射 12+4 · 繞射 3+1）為 exact，其餘進入 HOA3 bed | **即時遊戲** |

在有 8 個音源的廳堂中，Objects 每區塊 16.8 ms（上限 11.6 ms），Hybrid 為 2.4 ms。
UE、Unity、FMOD、Wwise、soundtrace.js 全都預設啟用 Hybrid。

### 空間化與輸出

| `st_rt_render_set_spatializer` | 說明 |
|---|---|
| `0` PANNING | 立體聲振幅 panning（預設） |
| `1` MIT_KEMAR | 引擎內建的 MIT KEMAR HRIR（128 tap） |
| `2` SADIE_D2_KEMAR | 隨附發布的 SADIE II D2 KEMAR HRIR（8,802 個方向 · 256 tap） |

揚聲器輸出透過 `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 筆電近場 2.0）
或自訂配置啟用，內部以 HOA3 解碼輸出 N 聲道。輸出端有 9 頻段 EQ 與限幅器（Envelope / Lookahead peak）。

### 主機 pull 渲染

![主機 pull 渲染](/img/core/host-pull-render.png)

| `renderOutputMode` | 引擎執行緒 | 說明 |
|---|---|---|
| `DEVICE`（0） | 渲染 1 + 裝置 1 | 引擎直接開啟 WASAPI 等輸出裝置 |
| `HOST_PULL`（1） | 無 | 主機音訊回呼以 `st_rt_render_process` 渲染區塊 |
| `HOST_PULL_BUFFERED`（2） | 渲染 1 | 引擎渲染執行緒填滿環形緩衝區，回呼只做複製（約 3 個區塊的延遲） |

UE、FMOD、Wwise、Unity 整合預設為 `BUFFERED`。指定 `hostSampleRate` 後，輸入串流與輸出都由
引擎以視窗 sinc 重取樣器轉換，主機端不需要重取樣。同時存在的主機串流插槽為 **64 個**。

### 排程器與執行緒

- `scheduler = PIPELINED`（預設）：Direct / Reflection-Diffraction / Reverb lane 以各自獨立的節奏運行。
  預設週期為 direct 10 ms · refl 0 ms（立即）· reverb 4 ms，可在執行期以
  `st_rt_set_lane_update_interval` 變更。提高反射 lane 的週期是省回最多 CPU 的旋鈕。
- `maxComputeThreads = 0` 為 auto（= min(效能核心數, 6)），各類執行緒的優先權與核心偏好
  以 `st_rt_set_thread_attributes`（相當於 FMOD 的 `Thread_SetAttributes`）在 **create 之前** 指定。
- `st_rt_get_thread_inventory` 會按種類回傳實際存在的執行緒數。

### Late reverb

一個 FDN16 由目前的聆聽者擁有，輸入只有逐音源的 `ReverbSendTap`（source transport 的第一次
擴散散射事件）。`st_rt_set_late_coupling_preset`（OFF / SUBTLE 6 dB / DEFAULT 9 dB /
STRONG 12 dB）依聆聽者與音源擴散場的距離衰減注入量，處理轉角之外殘響不會變小的問題。

## 離線引擎

`SimpleSTOffline` 不需要裝置與工作執行緒，在呼叫執行緒上執行一次傳播建立 canonical IR 快取
（`st_off_ir_compute`），再從同一個世代衍生下列輸出。

| 輸出 | 函式 |
|---|---|
| Raw 能量 tap（early + reverb send + transport 帳冊） | `st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_early_taps`、`st_off_ir_copy_raw_reverb_send_taps` |
| 壓力 IR（全頻單聲道 / 9 頻段分離） | `st_off_ir_init_pressure_request`、`st_off_ir_render_pressure` |
| 雙耳 IR（panning / MIT KEMAR / SADIE D2） | `st_off_ir_init_binaural_request`、`st_off_ir_render_binaural` |
| 試聽配對（dry WAV + 渲染） | `st_off_ir_render_audition_pair` |

離線上下文可以建立多個聆聽者（`st_off_listener_create`），只有進度與取消
（`st_off_ir_get_progress`、`st_off_ir_request_cancel`）是 lock-free。EDC、T60、C50 等能量分析
以壓力 IR 的 `h(t)²` 計算。

## 診斷

| 函式 | 用途 |
|---|---|
| `st_rt_get_timing` | 各 lane 的傳播、IR 建置、渲染區塊時間（ms） |
| `st_rt_ir_get_stats` | 一次 IR 發布的快照（tap 數、bed 格數、prepare CPU/wall） |
| `st_rt_render_get_process_stats` | 512 影格區塊各階段的 µs |
| `st_rt_scene_get_stats` | 即時的網格、物件、音源、三角形數 |
| `st_rt_debug_set_collect_visual_paths` + `st_rt_debug_copy_visual_paths` | 視覺化用的路徑點列（guide ray / direct / reflection / diffraction / transport） |
| `st_rt_debug_copy_mesh_accel_nodes` / `_scene_accel_nodes` | BLAS/TLAS 節點方框 |
| `st_rt_scene_raycast` | 以傳播所用的加速結構查詢最近命中 |

![SimpleST 示範應用程式](/img/core/demo-app.png)

## 參考

- [從 STCoreV2 到 SimpleST](./stcorev2.md) — 與舊 `exa*` API 的對照表
- [SDK 概覽](../sdk/overview.md)
- [FMOD 外掛](../sdk/fmod.md) · [Wwise 外掛](../sdk/wwise.md)
