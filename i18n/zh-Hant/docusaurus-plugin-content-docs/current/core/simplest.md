---
sidebar_position: 1
title: SimpleST
description: Sound Tracing 的現行原生引擎 SimpleST — C++20 幾何聲學核心、2-DLL 公開 C ABI（ABI 6）、9 頻段材質、Hybrid 早期反射、參數式 EQ、主機 pull 渲染。
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
| 引擎版本 | **2.22.0**（`ST_VERSION_STRING`），SDK 發行版 2.22.0-jhj.5。前一 SDK 發行版：2.18.2-jhj.7（引擎 2.18.2）、2.12.0 |
| 公開 ABI | **ABI 6**（`ST_ABI_VERSION`，3.0 乾淨斷裂）。2.12.0 之後的變更全部為 additive |
| 主要語言 | C++20（暴露 C ABI，相容 C11 標頭） |
| 建置系統 | CMake 3.21+ · 平台進入點 `mainBuild.sh` |
| 平台 | Windows x64 · macOS Universal · Linux x86_64 · Android（arm64-v8a/armeabi-v7a/x86_64）· iOS（device/simulator）· Web（Emscripten，pthreads） |
| 發布形式 | 即時 DLL `SimpleSTRealtime` + 離線 DLL `SimpleSTOffline`（iOS/Web 為靜態函式庫） |
| 取樣率 | 引擎內部固定 44.1 kHz，主機取樣率由內建重取樣器轉換 |
| 頻段 | 9 個八度頻段 `63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz` |
| 加速結構 | TinyBVH（預設）· BinnedSAH · HybridKD · LBVH · LBVH_SIMD |
| 測試 | 回歸測試框架 `SimpleST_demo` + 約 110 個 CTest |

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
| `SimpleST/ABI/STRealtime.h` | `STRT_Context*` | `st_rt_*` | 即時傳播 + 音訊渲染（181 個 export） |
| `SimpleST/ABI/STOffline.h` | `STOFF_Context*` | `st_off_*` | 離線 IR 計算與渲染（121 個 export） |
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
| 生命週期 | `st_rt_init_create_options`、`st_rt_create`、`st_rt_destroy`、`st_rt_get_api_version`、`st_rt_get_version_string`、`st_rt_get_capabilities`、`st_rt_get_capability_word`、`st_rt_get_last_status/error` |
| material | `st_rt_material_create`、`st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`（單一材質或逐三角形材質索引）、`st_rt_mesh_set_material`、`st_rt_object_create[_q]`、`st_rt_object_set_transform[_q]`、`*_destroy` |
| scene | `st_rt_scene_set_accel`、`st_rt_scene_set_triangle_intersection`、`st_rt_scene_get_stats`、`st_rt_scene_raycast` |
| source | `st_rt_source_create`、`set_position/direction/velocity`、`set_orientation_q`、`set_directivity`、`set_axis_attenuation`、`set_energy`、`set_path_enabled`、`set_path_volume`、`set_ray_count`、`set_depth`、`set_transport_refresh_steps`、`set_parametric_eq` / `set_eq`（音源 EQ） |
| source 音訊輸入 | `st_rt_source_set_audio_file`（WAV/FLAC/MP3/Ogg）、`st_rt_source_attach_stream` + `write_stream` + `get_stream_status`（主機 PCM）、`st_rt_source_set_audio_clip` / `set_audio_clip_asset`（快取片段）、`clear_audio` |
| source 播放控制 | `st_rt_source_play/pause/stop/seek`、`set_volume`（線性 0 ~ 16）、`set_pitch`（0.25 ~ 4）、`set_loop_count`、`st_rt_source_trigger`、`set_retrigger_interval` |
| listener | `st_rt_listener_set_position/velocity/rotation`、`set_rotation_ypr`、`set_orientation_q`（2.22，含頭部 roll）、`set_ray_count`、`set_ray_sampling_method` |
| 傳播 | `st_rt_build`、`st_rt_build_dynamic`、`st_rt_propagate`、`st_rt_set_max_depth`、`st_rt_set_transmission_max_depth`、`st_rt_set_path_type_enabled`、`st_rt_set_lane_update_interval` |
| 聲學政策 | `st_rt_set_atmosphere`、`st_rt_set_physical_distance_attenuation`、`st_rt_set_acoustic_feature_enabled`、`st_rt_set_doppler_gain_mode`、`st_rt_set_late_coupling[_preset]`、`st_rt_set_early_late_band_energy_targets` |
| render | `st_rt_render_start/stop`、`st_rt_render_process`（主機 pull）、`set_options/get_options`、`set_spatializer`、`set_speaker_layout[_custom]`、`set_parametric_eq`、`set_eq`、`set_loudness_compensation`、`set_virtual_bass`、`set_master_gain_db`、`set_limiter_type`、`get_limiter_latency_samples`、`set_path_fade_time`、`set_max_delay_seconds`、`get_latency_frames`、`get_process_stats` |
| 執行緒 | `st_rt_set_thread_attributes`、`st_rt_get_thread_inventory`、`STRT_CreateOptions.maxComputeThreads` |
| 休眠／執行 | `st_rt_idle`、`st_rt_run`、`st_rt_get_idle_state`、`STRT_CreateOptions.startIdle`（2.20，為 1 時以 IDLE 啟動，直到 `st_rt_run` 前計算與渲染都暫停）、逐音源的 `st_rt_source_idle/run` |
| 記憶體預算 | `st_rt_set_memory_budget`、`st_rt_get_memory_budget`、`st_rt_get_memory_stats`、`STRT_CreateOptions.maxSources` — [音源記憶體預算](#音源記憶體預算) |
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

// 自 2.21.0 起 st_rt_create 會啟用等響度補償。由主機混音負責音色時，請在建立後立即關閉
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

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
st_rt_listener_set_rotation(ctx, /*yaw*/0.f, /*pitch*/0.f);        // 弧度。含 roll：set_orientation_q(XYZW)

// 4. 主機 PCM 串流輸入
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };     // 單聲道，capacity 0 = 8192 影格
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 建置加速結構 + 啟動渲染 + 明確指定輸出端
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // 1 = hybrid（2.18.0 預設。在 render_start 之後明確指定）
ro.useLimiter = 0;               // 由主機主輸出鏈負責限幅時關閉（2.18.0 預設 1 = true-peak）
st_rt_render_set_options(ctx, &ro);
st_rt_render_set_master_gain_db(ctx, 0.f);                          // 引擎預設 0 dB

// 6. 遊戲迴圈（控制執行緒）
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // PIPELINED 會喚醒工作執行緒並立即返回

// 7. 音訊回呼（主機音訊執行緒）
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);   // [audio]
st_rt_render_process(ctx, interleavedStereoOut, frames);  // [audio]

st_rt_destroy(ctx);
```

:::note
從 2.18.0 起，建立後的預設值與即時渲染預設（開關揚聲器配置時會重新套用）為
**Hybrid（`reserved0 = 1`）+ 啟用 true-peak 輸出限幅器（−1 dBTP，137 樣本延遲）**，主增益為 0 dB
（至 2.12.0 為止為 Objects + 限幅器關閉）。請不要依賴預設值，而是在 **`render_start` 與配置變更之後**
明確指定 Hybrid 與限幅器。所有官方外掛都依這個順序重新套用各自的預設值。

自 2.21.0 起，`st_rt_create` 也會啟用[等響度補償](#等響度補償)。此設定以上下文為單位，`render_start`
不會將其還原，因此在建立後設定一次即可。所有官方包裝層都會在建立後立即關閉它。
:::

## 核心概念

### 座標與單位契約

- **座標系與 Unity 相同** — 左手系，`+Y` 向上，`+Z` 向前，`+X` 向右。yaw 為正 = 向右轉，
  pitch 為正 = 向下。Unity 主機不需轉換即可直接傳入；`-Z` 向前的主機（Three.js 等）由包裝層翻轉 Z。
  UE 則由外掛執行 `(Y, Z, X)` 重排與 cm→m 轉換。
- **單位為公尺**。使用其他單位的主機在建立時一次指定 `STRT_CreateOptions.sceneRatio`
  （cm = `0.01`，ft = `0.3048`）。座標以場景單位原樣傳入，引擎只在需要公尺的地方才乘上比例。
  **禁止重複縮放**：不要在預先縮放幾何體的同時又指定 `sceneRatio`。
- 角度：聆聽者 rotation 為 **弧度**，只有揚聲器配置使用度（degree）。自 2.22.0 起，可以用
  `st_rt_listener_set_orientation_q`（本地→世界的單位四元數，XYZW）與 `st_rt_listener_set_rotation_ypr`（yaw · pitch · roll）
  連同頭部傾斜（roll）一起傳入。三個聆聽者方向 setter 以最後呼叫者為準。
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
| `0` Objects | 將所有 early path 渲染為個別的空間化物件 | 基準聆聽、離線 A/B（至 2.12.0 為止的預設值） |
| `1` Hybrid | 只有聆聽者全域預算（反射 12+4 · 繞射 3+1）為 exact，其餘進入 HOA3 bed | **即時遊戲**（2.18.0 起為引擎預設） |

在有 8 個音源的廳堂中，Objects 每區塊 16.8 ms（上限 11.6 ms），Hybrid 為 2.4 ms。
從 2.18.0 起引擎預設值也是 Hybrid，UE、Unity、FMOD、Wwise、soundtrace.js 全都在渲染開始後
明確啟用 Hybrid。

### 空間化與輸出

| `st_rt_render_set_spatializer` | 說明 |
|---|---|
| `0` PANNING | 立體聲振幅 panning（預設） |
| `1` MIT_KEMAR | 引擎內建的 MIT KEMAR HRIR（128 tap） |
| `2` SADIE_D2_KEMAR | 隨附發布的 SADIE II D2 KEMAR HRIR（8,802 個方向 · 256 tap） |

揚聲器輸出透過 `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 筆電近場 2.0）
或自訂配置啟用，內部以 HOA3 解碼輸出 N 聲道。輸出端依序為輸出 EQ →（揚聲器）聲道 EQ →
等響度補償 → 虛擬低音 → 主增益 → 限幅器。

| 輸出端 | 函式 | 即時預設（2.22.0） |
|---|---|---|
| 輸出 EQ | `st_rt_render_set_parametric_eq` — [參數式 EQ](#參數式-eq)。舊的 9 頻段 `st_rt_render_set_eq` 是同一個 EQ 的圖形化檢視 | 關閉 |
| 等響度補償 | `st_rt_render_set_loudness_compensation`（2.21.0） | **開啟**（由 `st_rt_create` 啟用） |
| 虛擬低音 | `st_rt_render_set_virtual_bass`（2.21.0） | 關閉 |
| 主增益 | `st_rt_render_set_master_gain_db`（−96 ~ +24 dB，20 ms 斜坡） | 0 dB |
| 限幅器種類 | `st_rt_render_set_limiter_type` — Envelope(0) / Lookahead peak(1) / True peak(2) | True peak，上限 −1 dBTP |
| 限幅器開關 | `STRenderOptions.useLimiter` | 開啟（1）。延遲為 `st_rt_render_get_limiter_latency_samples` = 137 樣本 |

限幅器是立體聲與揚聲器配置（N 聲道，聲道連動）所有輸出的最後一級。像中介軟體、遊戲引擎這樣由
主機主輸出鏈負責限幅的整合，請以 `useLimiter = 0` 關閉。新功能以
`st_rt_get_capability_word(1)` 的 `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER` · `ST_CAP1_MASTER_GAIN` 確認
（word 0 = `st_rt_get_capabilities()` 的位元，請勿混在一起做 AND）。

### 參數式 EQ

自 2.21.0 起，EQ 是將 RBJ 二階濾波器頻段串聯的單一參數式 EQ。同一個頻段結構體（`STParametricEqBand`）
用於兩個位置。

| 位置 | 函式 | 作用處 |
|---|---|---|
| 音源 EQ | `st_rt_source_set_parametric_eq`（`ST_CAP1_SOURCE_PARAMETRIC_EQ`） | 音源原始 PCM，9 頻段分頻器 **之前**。該音源的直達、反射、繞射、殘響送出全部帶有相同音色。清除為 `st_rt_source_set_eq(ctx, id, NULL)` |
| 輸出 EQ | `st_rt_render_set_parametric_eq`（`ST_CAP1_OUTPUT_PARAMETRIC_EQ`） | 渲染末端、主增益之前的全域單一 EQ。關閉為 `enabled = 0` |

- 濾波器種類為 `ST_PARAMETRIC_EQ_PEAKING` · `LOW_SHELF` · `HIGH_SHELF` · `LOW_PASS` · `HIGH_PASS` · `NOTCH` 共 6 種。
  低頻／高頻切除（HIGH_PASS / LOW_PASS）固定為 12 dB/oct。
- 範圍：頻率 20 ~ 20,000 Hz，增益 ±24 dB（僅 PEAKING 與 shelf），Q 0.1 ~ 30（shelf 最多 3），前級增益 −48 ~ +12 dB，
  最多 16 個頻段。
- 數值變更時，引擎以 20 ms 交叉淡化切換。關閉狀態下不會改動樣本。
- 音源 EQ 在離線 DLL 中也有（`st_off_source_set_parametric_eq`）。輸出 EQ 僅限即時。

### 等響度補償

自 2.21.0 起，即時 `st_rt_create` 會啟用等響度補償（ISO 226:2003，基準 83 → 播放 70 phon）。主增益 0 dB 時，
低頻 shelf 約 +7.2 dB（120 Hz），高頻 shelf 約 +1.8 dB，且預設補償量會跟隨主增益變化。關閉後輸出與 2.20 位元相同。
離線 DLL 中沒有此功能。

這一級屬於播放裝置端的功能，因此與限幅器相同，在由主機混音負責音色與音量的整合中建議關閉。
UE、Unity、FMOD、Wwise、soundtrace.js 包裝層都會在上下文建立後立即關閉它（SDK 發行版 2.22.0-jhj.5）。

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

### 音源記憶體預算

從 SDK 發行版 2.18.2 起，即時上下文會對同時存活的音源數與音源記憶體設定上限。
這是 ABI 6 additive 變更，以 `st_rt_get_capability_word(1)` 的 `ST_CAP1_MEMORY_BUDGET` 確認。一個音源的
記憶體由固定成本（傳播、IR 副本、transport、串流環）加上延遲環與路徑 lane 組成。

- **動態延遲環** — 逐音源的延遲環長度為該音源路徑所需的最大延遲 × 1.25 + 50 ms（以 125 ms 為單位
  無條件進位，下限 0.25 s）。需要更多時，由控制執行緒準備較大的環，音訊執行緒在不複製、不配置的情況下
  直接替換。`st_rt_render_set_max_delay_seconds` 不再是為所有音源配置相同長度的值，而是 **上限（天花板）**。
  在方盒房間量測中，以 60 個音源為基準，每個音源的記憶體為 6.89 → 2.70 MiB。
- **平台預設值** — 由 `st_rt_create` 依建置目標套用。

| 平台 | 最大音源數 | 音源記憶體上限 | 延遲環上限 |
|---|---:|---:|---:|
| 桌面（Windows · macOS · Linux） | 128 | 無限制 | 2.0 s |
| 行動（Android · iOS） | 48 | 96 MiB | 1.0 s |
| Web（Emscripten） | 32 | 64 MiB | 0.5 s |

- **超過上限時**，`st_rt_source_create` 會回傳失敗控制代碼（`v < 0`），最後狀態為
  `ST_STATUS_BUDGET_EXCEEDED`（11）。這是預設政策 `ST_MEMORY_REJECT_NEW`。
  改為 `ST_MEMORY_EVICT_FARTHEST` 時，會以與 `st_rt_source_destroy` 相同的路徑移出距離聆聽者最遠的音源，
  並接受新音源（被移出的 id 為 `STMemoryStats.lastEvictedSource`）。UE、Unity、FMOD、Wwise 包裝層會以 dry 播放被拒絕的音源。
- **設定** — 建立時以 `STRT_CreateOptions.maxSources`（0 = 平台預設），建立後以
  `st_rt_set_memory_budget` 變更。`STMemoryBudget` 中為 0 的欄位維持預設值。即使調低上限，
  已存在的音源仍會保留，從新的建立開始套用。`st_rt_get_memory_stats` 會回傳音源數、追蹤與估計位元組數，
  以及拒絕與移出次數。
- **延遲環池** — 為重複使用而保留已回收延遲環的池設有依平台的總量上限（桌面 16 · 行動 8 · Web 4 MiB，超過時先釋放大的環），
  10 s 未使用的環會被釋放。自 SDK 發行版 2.18.2-jhj.7 起，`STMemoryStats.trackedBytes`（因此 `estimatedBytes`）包含池中保留的環。
  預算判定超過時會先清空池再重新計算，因此不會因為池而拒絕或移出新音源（結構體配置不變）。

```c
typedef struct STMemoryBudget {
    uint32_t structSize, apiVersion;
    uint32_t maxSources;            /* 0 = 平台預設 */
    int32_t  rejectPolicy;          /* ST_MEMORY_REJECT_NEW(0, 預設) / ST_MEMORY_EVICT_FARTHEST(1) */
    uint64_t sourceBudgetBytes;     /* 0 = 無限制（僅觀測） */
    uint64_t fixedPerSourceBytes;   /* 0 = 引擎預設（2.5 MiB）。僅用於估計 */
    float    ringFloorSeconds;      /* 0 = 0.25 */
    float    ringGrowthHeadroom;    /* 0 = 1.25 */
    int32_t  allowShrink;           /* 0 = 不縮小（維持工作階段中的最大值） */
    uint32_t reserved[5];
} STMemoryBudget;
```

:::caution 行為變更
- 桌面預設最大音源數為 **128**（以前為無限制）。需要更多的主機請以 `st_rt_set_memory_budget`
  調高。
- 行動與 Web 的延遲環上限預設為 1.0 s / 0.5 s，因此超過 343 m / 171 m 的早期路徑不會被渲染。需要以前的
  值時，請以 `st_rt_render_set_max_delay_seconds` 指定。
- 離線 DLL（`st_off_*`）不受預算限制（無限制）。
- 行動與 Web 以 Hybrid 早期反射為前提。Objects 模式每個音源超過 30 MB。
:::

:::caution 從 SDK 2.18.2-jhj 標頭遷移時
- 自 SDK 發行版 2.22.0-jhj 起，`STRT_CreateOptions.maxSources` 位於 **偏移 44**。這是因為引擎 2.20 將偏移 40
  用於 `startIdle`（結構體大小 48 不變）。以 2.18.2-jhj 標頭建置的主機請重新建置 —
  若在舊位置寫入音源數，`startIdle` 不是 0/1，`st_rt_create` 會以 `ST_STATUS_INVALID_ARGUMENT` 失敗。
- `ST_CAP1_MEMORY_BUDGET` 現在是位元 63（2.18.2-jhj 為位元 6，引擎 2.19 將該位元用於 `ST_CAP1_SPEAKER_SET`）。
  請不要直接寫位元編號，而是以標頭常數確認。
:::

各包裝層的設定彙整於 [SDK 概覽](../sdk/overview.md#音源數上限)。

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
