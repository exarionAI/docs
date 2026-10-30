---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — 全平台共用核心的二進位檔、標頭檔、最小使用流程、函式族與執行緒規則。
---

# Sound-Tracing SDK (C/C++)

所有平台使用同一個核心。Unity · Unreal Engine · FMOD · Wwise · Web SDK 是依各平台方式包裝此二進位檔的
包裝層；在原生 C/C++ 中，只需引入標頭檔並連結對應平台的二進位檔即可。

## 發佈內容

| 平台 | 二進位檔 (`Binaries/`) | 連結 |
|---|---|---|
| Windows x64 | `Win64/Release/SimpleSTRealtime.dll` + `.lib` | 動態 |
| macOS (Universal) | `Mac/Release/libSimpleSTRealtime.dylib` | 動態 |
| Linux x86_64 | `Linux/Release/libSimpleSTRealtime.so` | 動態 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSimpleSTRealtime.so` | 動態 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsimplest_static.a` | 靜態 |
| Web | `Web/Release/SimpleSTRealtime.mjs` + `.wasm` (pthreads) | WASM 模組 (需要 COOP/COEP) |

用於離線 IR 計算的 `SimpleSTOffline`（同一資料夾，`st_off_*`）也一併包含。標頭檔在所有平台通用。

```text
SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| 標頭檔 | 情境 | 函式前綴 | 作用 |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | 即時傳播 + 音訊渲染 |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | 離線 IR 計算與渲染 |
| `STTypes.h` | — | `ST_*` | 共用 POD 與 enum |

實體 id 是依型別區分的控制代碼（`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`，皆為
`struct { int32_t v; }`），**失敗即 `v < 0`**。座標系為左手系 `+Y` up · `+Z` forward，單位為公尺
（透過 `STRT_CreateOptions.sceneRatio` 指定 cm = `0.01`），聆聽者角度為弧度。

## 最小使用流程

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 由主機音訊回呼拉取區塊
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// 若主機混音負責音色與電平，則在建立後立即關閉（所有官方包裝層皆關閉）
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 材質 — 註冊預設資料庫後回傳第一個材質的控制代碼
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. 網格 + 物件 (xyz interleaved，索引三角形)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = 整個網格使用同一材質
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 音源與聆聽者
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW，包含 roll

// 4. 主機 PCM 輸入串流 (單聲道)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 建置 + 開始渲染 + 明確設定輸出級
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid 早期反射 (即時建議)
ro.useLimiter = 0;               // 若主機主鏈負責限幅則關閉
st_rt_render_set_options(ctx, &ro);

// 6. 遊戲迴圈 (控制執行緒)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // 喚醒工作執行緒並立即返回

// 7. 音訊回呼 (主機音訊執行緒)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## 函式族

| family | 代表函式 |
|---|---|
| 生命週期 | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_version_string`, `st_rt_get_capability_word`, `st_rt_get_last_status` / `st_rt_get_last_error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`, `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| source | `st_rt_source_create`, `set_position` / `set_velocity` / `set_orientation_q`, `set_directivity`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_parametric_eq` |
| source 輸入與播放 | `st_rt_source_attach_stream` + `write_stream`, `set_audio_file`, `set_audio_clip`, `play` / `pause` / `stop` / `seek`, `set_volume`, `set_pitch`, `set_loop_count`, `trigger` |
| listener | `st_rt_listener_set_position` / `set_velocity` / `set_orientation_q` / `set_rotation_ypr`, `set_ray_count` |
| 傳播 | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| 聲學策略 | `st_rt_set_atmosphere`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_late_coupling_preset` |
| render | `st_rt_render_start` / `stop`, `st_rt_render_process`, `set_options` / `get_options`, `set_spatializer`, `set_speaker_layout`, `set_parametric_eq`, `set_loudness_compensation`, `set_master_gain_db`, `set_limiter_type`, `set_max_delay_seconds`, `get_latency_frames` |
| 記憶體預算 | `STRT_CreateOptions.maxSources`, `st_rt_set_memory_budget`, `st_rt_get_memory_stats` |
| 診斷 | `st_rt_get_timing`, `st_rt_scene_get_stats`, `st_rt_ir_get_stats`, `st_rt_debug_copy_visual_paths` |

空間化透過 `st_rt_render_set_spatializer` 選擇 `0` 聲像 · `1` MIT KEMAR（內建）· `2` SADIE II D2 KEMAR（`Resources/HRTF`），
喇叭輸出透過 `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1）開啟。材質為 9 頻段
（`63 Hz ~ 16 kHz`）的 `reflection / absorption / transmission / scattering`，每個頻段必須滿足 `R + A + T = 1`。

## 執行緒規則

標頭檔中每個函式上方都標有可呼叫執行緒的標籤。

| 標籤 | 意義 |
|---|---|
| `[control]` | 控制執行緒。可能持有場景鎖，因此不要在音訊回呼中呼叫 |
| `[control, blocking]` | 加速結構建置、渲染 start/stop、HRIR 載入等耗時區間 |
| `[audio]` | 在主機音訊執行緒上安全 — `st_rt_source_write_stream`, `st_rt_render_process` |
| `[any]` | 任意執行緒 |

請將 `[control]` 呼叫序列化到唯一的專用控制執行緒。所有官方包裝層都採用這一結構。

## 平台備註

- **Android**: API 28 以上。將各 ABI 的 `.so` 放入應用程式的程式庫資料夾。
- **iOS**: 單一靜態程式庫（`libsimplest_static.a`）同時包含即時與離線。依 device / simulator 分別連結。
- **Web**: `SimpleSTRealtime.mjs/.wasm` 是 pthreads 建置，頁面與 Worker 回應需要 `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp`。`[control]` 呼叫只在一個 Worker 中進行（主執行緒上的阻塞呼叫會因
  `Atomics.wait` 限制而失敗），音訊透過共用環形緩衝區與 AudioWorklet 交換。若需要 TypeScript facade，請使用 [Web SDK](./web.md)。
- **主機取樣率**: 引擎內部為 44.1 kHz，指定 `hostSampleRate` 後由引擎轉換輸入與輸出。

## 離線 IR

`SimpleSTOffline`（`st_off_*`）使用相同的場景 API，無需裝置與工作執行緒，一次傳播即可產生 IR。

| 輸出 | 函式 |
|---|---|
| 計算 | `st_off_ir_compute` |
| 聲壓 IR (單聲道 / 9 頻段) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| 雙耳 IR | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| Raw 能量抽頭 | `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |

## 下一篇

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD 外掛](./fmod.md) · [Wwise 外掛](./wwise.md)
