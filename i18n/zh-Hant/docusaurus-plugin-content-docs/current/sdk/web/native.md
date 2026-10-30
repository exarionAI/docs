---
title: Native API
description: soundtrace.js 的低階進入點 `@exarionai/soundtrace.js/native` — WASM 模組載入器、堆積輔助工具、Realtime/Offline 配接器、EQ。
---

# Native API

`@exarionai/soundtrace.js/native` 公開 facade 內部所使用的 Sound-Tracing SDK 模組載入器與配接器。
一般應用程式請使用 [Facade API](./facade.md)。這個介面直接遵循 Sound-Tracing SDK C ABI
契約（套件隨附的 `core/Include/SimpleST/ABI/*.h`），版本間的相容性保證比
facade 弱。

```ts
import {
  SimpleSTRealtime,
  loadRealtimeModule, loadOfflineModule, analyzeScene,
  Heap, packMaterial, validateMaterial,
  ST_ABI_VERSION, ST_FREQUENCY_BANDS, ST_SAMPLE_RATE, layout,
  type SimpleSTModule, type SimpleSTMaterial, type SimpleSTDiagnostics, type SimpleSTFeatures, type SimpleSTSceneSnapshot,
} from '@exarionai/soundtrace.js/native';
```

## 支援範圍

- 所有 Sound-Tracing SDK `[control]` 呼叫都只在 **單一 Worker** 中進行。facade 設有專用的 control Worker，
  只在那裡操作引擎。
- 在主執行緒呼叫 `st_rt_propagate` 這類會阻塞的進入點時，`Atomics.wait` 會被擋下而失敗。

## 組成

| 名稱 | 角色 |
|---|---|
| `loadRealtimeModule(baseUrl)` | 載入 `SimpleSTRealtime.mjs` + `.wasm`（pthreads）並回傳 `SimpleSTModule` |
| `loadOfflineModule(baseUrl)` | 載入 `SimpleSTOffline.mjs`（單執行緒）。僅供 IR 分析 |
| `Heap` | 在 WASM 堆積（heap）讀寫 POD 的輔助工具。含帶有 `structSize`/`apiVersion` 戳記的結構配置（`stamped`） |
| `layout` | `STRT_CreateOptions`、`STMaterial`、`STRenderOptions`、`STTiming`、`STSceneStats`、`STProcessStats`、`STIrStats` 等的偏移量／大小 |
| `packMaterial` / `validateMaterial` | 將 9 頻段 R/A/T/scattering 封裝為 `STMaterial`，並驗證 `R+A+T=1` |
| `SimpleSTRealtime` | 擁有一個聆聽者與共用渲染器的配接器。將 facade 命令轉換為 `st_rt_*` 呼叫。`features` 是引擎同時具備 capability 位元與 export 的選用功能（片段、trigger、播放控制、true-peak 限幅器、主增益） |
| `analyzeScene(module, snapshot, …)` | 將場景快照複製到 Offline 上下文，計算 Raw IR / 壓力 IR |
| `ST_ABI_VERSION` / `ST_FREQUENCY_BANDS` / `ST_SAMPLE_RATE` | `6` / `9` / `44100` |

## `SimpleSTRealtime`

facade 的 control Worker 所使用的配接器。直接使用時，請在 Worker 內遵守下列
順序。

```ts
const M = await loadRealtimeModule(coreBaseUrl);
const rt = new SimpleSTRealtime(M, startupOptions);   // st_rt_create、關閉等響度補償、註冊材質表、套用 Hybrid

rt.command({ type: 'createMesh', handle, state });     // st_rt_mesh_create + st_rt_object_create_q
rt.command({ type: 'createSource', handle, state });   // st_rt_source_create + 套用品質預設
rt.attachStream(handle);                               // st_rt_source_attach_stream（單聲道）
rt.sourcePose(handle, cache); rt.listenerPose(cache); rt.meshPose(handle, pose);

const validPaths = rt.frame();                         // st_rt_build[_dynamic] + st_rt_propagate
rt.writeStream(handle, monoSamples);                   // [audio] st_rt_source_write_stream
const stereo = rt.render(frames);                      // [audio] st_rt_render_process

const diag = rt.diagnostics();                         // SimpleSTDiagnostics
rt.reset(); rt.dispose();
```

- `setQuality(tier)` 一次設定聆聽者 guide ray、音源 transport ray 與反射深度
  （`fast` 8×8/4、`balanced` 16×16/6、`quality` 24×24/8）。
- 音源增益為壓力值，傳入引擎時為 `st_rt_source_set_energy(gain²)`。
- `'direct'` 路徑閘門會同時開關 Direct 與 Transmission。
- 渲染選項變更（`useDoppler`、`useLimiter`、`diffuseEnabled`）會覆寫 `STRenderOptions` 的對應欄位，
  但永遠維持 `reserved0 = 1`（Hybrid）。若 Hybrid 被解除，`diagnostics()` 會擲出例外。
- 每次渲染啟動時都會明確指定輸出端：限幅器關閉（`useLimiter: true` 時為 true-peak）、主增益 0 dB。
- 建立上下文後立即關閉引擎所啟用的等響度補償（`features.loudnessCompensation` 時）。
- 聆聽者方向以由 forward/up 建立的四元數傳給 `st_rt_listener_set_orientation_q`，保留 roll。

## 診斷快照

```ts
interface SimpleSTDiagnostics {
  engine: 'Sound-Tracing SDK'; abiVersion: number; version: string;
  scheduler: 'synchronous' | 'pipelined'; earlyReflectionMode: 'hybrid'; spatializer: number;
  scene:  { meshes; objects; sources; triangles };
  timing: { propagationMs; directMs; reflectionDiffractionMs; reverbMs; irMs; renderMs };
  render: { blockSequence; activeSources; exactTaps; sendTaps; totalUs } | null;
  ir:     { publishSequence; exactTaps; bedCells; sendTaps } | null;
  audioTransport?: { outputUnderrunFrames; inputDroppedFrames; streams: Array<{ handle; queuedFrames; capacityFrames; droppedFrames; underrunFrames }> };
  features?: SimpleSTFeatures;
  output?: { limiter; limiterType; limiterLatencyFrames; masterGainDb; diffuseRain; eq? };  // 已套用的輸出端（eq = 輸出 EQ）
  inputs?: { live; clip };                                                       // 即時／片段音源數
}
```

facade 的 `debugSnapshot().simplest` 與 `getStatistics().simplest` 回傳同一個物件。

## 音訊契約

- 引擎內部取樣率為 44.1 kHz；將 `AudioContext.sampleRate` 填入 `STRT_CreateOptions.hostSampleRate`，
  輸入與輸出都由引擎轉換。
- 音源輸入為單聲道 float PCM（`st_rt_source_write_stream`），輸出為交錯立體聲
  （`st_rt_render_process`）。輸出模式為 `HOST_PULL_BUFFERED`，AudioWorklet 從共享環形緩衝區複製。
- 同時存在的串流插槽為 64 個。超出的音源建立會失敗。

## EQ

在兩個位置套用 Sound-Tracing SDK 的參數式 EQ。

- **音源 EQ** — 在引擎分頻之前作用於音源訊號本身。該音源的直達音、反射、繞射、殘響全部帶有相同音色。
- **輸出 EQ** — 在渲染末端（主增益之前）作用於整個 Sound-Tracing SDK 混音。

濾波器種類為 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 共 6 種（切除固定 12 dB/oct），
範圍為頻率 20 ~ 20,000 Hz，增益 ±24 dB（僅 Peaking 與 shelf），Q 0.1 ~ 30（shelf 最多 3），前級增益 −48 ~ +12 dB。
預設為關閉，關閉時不會呼叫引擎，因此輸出與沒有 EQ 時相同。只送出變更的值，引擎以
20 ms 交叉淡化切換。

| 位置 | 引擎呼叫 | 支援確認 |
|---|---|---|
| 音源 EQ | `st_rt_source_set_parametric_eq`（清除為 `st_rt_source_set_eq(ctx, id, NULL)`） | `features.sourceParametricEq` |
| 輸出 EQ | `st_rt_render_set_parametric_eq`（關閉為 `enabled = 0`） | `features.outputParametricEq` |

`SimpleSTRealtime` 配接器會將 facade 的 `source.setEq` / `sound.setOutputEq` 命令轉換為這兩個呼叫，在缺少
這兩個 feature 的核心上會拒絕。已套用的輸出 EQ 位於 `diagnostics().output.eq`。

## 相關文件

- [Web SDK 概覽](../web.md)
- [Facade API](./facade.md)
