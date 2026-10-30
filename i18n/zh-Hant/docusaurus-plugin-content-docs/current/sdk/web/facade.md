---
title: Facade API
description: 在 ST 與 MT 上用法一致的 soundtrace.js 建議 API — 建立選項、場景／音源／網格 API、生命週期、EQ。
---

# Facade API

Facade 是一般 Web 應用程式的建議進入點。`SoundTrace` 管理場景生命週期，`Listener`、`Source`、
`Mesh` 表示應用程式的 3D 狀態。所有公開方法在 `thread: 'st'` 與 `'mt'` 上行為相同，
診斷全部為非同步。

[Web SDK 概覽](../web.md) · [Native API](./native.md)

## 基本流程

```ts
const sound = await SoundTrace.create(audioContext, options);
sound.output.connect(audioContext.destination);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

await source.play(inputNode);      // 輸入擷取。輸出只有 sound.output 一路
await sound.update(0);
```

## `SoundTrace` 選項

| 選項 | 預設值 | 說明 |
|---|---|---|
| `thread` | `'auto'` | `'st'`（同步傳播）/ `'mt'`（管線傳播）。兩者都使用專用 Worker + pthread WASM |
| `mode` | 未指定 | `'single_thread'` / `'multi_thread'`。為 `thread` 的別名，`mode` 優先 |
| `quality` | `'balanced'` | `'fast'`、`'balanced'`、`'quality'` |
| `earlyReflectionMode` | `'hybrid'` | 即時永遠是 Hybrid。其他值會被拒絕 |
| `coordinateBasis` | 引擎座標系（`+Z` 向前） | 將渲染器座標系轉換為 SDK 座標系 |
| `coreBaseUrl` | 套件內 | `SimpleSTRealtime.mjs/.wasm`、`SimpleSTOffline.mjs` 所在的 URL |
| `assetBaseUrl` | 套件內 | 材質 JSON 與 HRTF 資源的 URL |
| `propagationThreadCount` | 同步 1 / 管線 3 | 計算預算 1 ~ 5（負數 = 5）。管線至少 3 |
| `throughput` | 未指定 | `'low'` / `'medium'` / `'max'` — MT worker 預算的簡寫 |
| `sceneRatio` | `1.0` | 每個場景長度單位對應的公尺數（cm = 0.01）。**禁止** 與預先縮放的幾何體混用 |
| `maxSources` | `0` | 同時存活的引擎音源數上限（0 ~ 512 的整數）。`0` = wasm 平台預設（32 個音源 · 音源記憶體 64 MiB · 延遲環上限 0.5 s — 因堆積固定為 256 MiB 而偏保守）。超出的音源建立會被引擎以 status 11（`BUDGET_EXCEEDED`）拒絕，既有音源繼續渲染 |
| `autoLoadMaterials` | `true` | 載入預設材質表，啟用名稱對應 |
| `debug` | `false` | 輸出一行初始化診斷記錄 |

```ts
const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',
  quality: 'balanced',
  coordinateBasis: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, // Three.js
});
```

## 主要 API

### `SoundTrace`

| API | 說明 |
|---|---|
| `SoundTrace.create(ctx, options?)` | 建立並載入引擎（建構子 + `load()`） |
| `output` / `audioContext` | 聆聽者主輸出節點（立體聲）與應用程式傳入的 `AudioContext` |
| `listener` | 場景中唯一的聆聽者 |
| `descriptor` | `{ transport: 'worker', thread: 'st' \| 'mt' }` — 供診斷。不要用來分支 |
| `addMesh(options)` / `removeMesh(mesh)` | 新增／移除聲學 geometry |
| `addSource(options)` | 新增空間音源 |
| `setQuality(tier)` | 變更品質預設（聆聽者與音源的射線及深度） |
| `setAudioOption(options)` | 輸入區塊大小、輸出聲道 override |
| `setOutputEq(eq \| null)` | 全域輸出參數式 EQ（最多 16 頻段）。`null` 為關閉。`reset()` 後仍保留 — [EQ](#eq) |
| `loadHrtf(mode, source?)` | `'mit-kemar'` / `'sadie-d2'`（別名 `'convolution'` / `'steamaudio'`） |
| `loadMaterialAssets()` | 手動載入材質表（`autoLoadMaterials: false` 時） |
| `update(dt?)` | 更新場景並執行傳播。以這一影格的有效路徑數 resolve |
| `debugSnapshot(options?)` | 非同步診斷快照。`.simplest` 含 scene/timing/render/IR 統計、`features`、`output`（限幅器、種類、延遲、主增益、輸出 EQ `eq`）、`inputs`（即時／片段音源數） |
| `getStatistics(options?)` | `debugSnapshot` 的包裝。`validPathCount` 與 `.simplest` |
| `getIRs()` | 在獨立的 Offline Worker 中重新計算 9 頻段 early path IR |
| `renderMonoImpulseResponse(source, sec)` | 在 Offline Worker 中計算 44.1 kHz 單聲道壓力 IR（最長 30 s） |
| `reset()` | 重設引擎狀態（async）。Hybrid、材質、品質會重新套用 |
| `dispose()` | 釋放 SDK 擁有的資源。冪等，相容 `using` |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: camera.quaternion.toArray() })
  .setRenderOptions({ useDoppler: true, useLimiter: false, pathFadeTime: 0.05, maxDelaySeconds: 2 }) // useLimiter 預設 false
  .setOutputMode('hrtf');   // 'hrtf'（雙耳）| 'speaker'（立體聲 panning）
```

場景中只有一個 listener，由 `SoundTrace` 擁有。`orientation` 直接傳入相機目前的旋轉
四元數（XYZW）。頭部傾斜（roll）也會傳遞到引擎（即時與離線 IR 分析皆是）。

`setRenderOptions` 接受的鍵：

| 鍵 | 意義 |
|---|---|
| `earlyReflectionMode` | 只允許 `'hybrid'` |
| `useDoppler` | 可變延遲的 Doppler 音高 — 即時渲染中一律開啟，`false` 會被忽略 |
| `useLimiter` | 輸出限幅器。預設 `false` — 由應用程式的 Web Audio 主匯流排負責限幅（SDK 會在每次渲染啟動、HRTF／輸出變更與 reset 時將其關閉）。`true` 時為 true-peak 限幅器（−1 dBTP，137 樣本延遲） |
| `pathFadeTime` | 路徑出現／消失的交叉淡化（秒） |
| `maxDelaySeconds` | 逐音源延遲環的上限（秒）。引擎只為每個音源配置路徑所需長度的環（下限 0.25 s）。Web 平台預設上限為 0.5 s |
| `diffuseEnabled` | late reverb 渲染開關。也會一併開關一次散射（diffuse rain）渲染 |

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: { direct: true, reflection: true, diffraction: true, reverberation: true },
});

source.setPose({ position: [1, 1, -2], velocity: [0.5, 0, 0] });
source.setGain(0.8);                          // 壓力增益。傳給引擎時為 energy = gain²
source.setPathEnabled('reverberation', false);
source.setDirection([0, 0, -1]);
```

| API | 說明 |
|---|---|
| `play(input, channels?)` | 回傳已連接輸入的 `AudioWorkletNode`。**輸出為靜音**，實際聲音來自 `sound.output` |
| `setPose(pose)` / `setGain(g)` | 位置、速度、方向，增益 |
| `setPathEnabled(path, on)` / `setPathOptions(o)` / `isPathEnabled(path)` | `'direct'`（含穿透）/ `'reflection'` / `'diffraction'` / `'reverberation'` |
| `setDirection(v)` | 音源 forward。以不含 roll 的最小旋轉同步更新 orientation |
| `setDirectivityTable(anglesDeg, attenDbPerBand)` / `setDirectivityEnabled(on)` | 將逐角度的 9 頻段衰減表轉換為 Sound-Tracing SDK 指向性表並套用 |
| `setEq(eq \| null)` | 此音源的音源參數式 EQ（最多 16 頻段，引擎分頻之前）。`null` 為移除 — [EQ](#eq) |
| `dispose()` | 釋放音源與串流 |

#### 距離衰減

對所有路徑套用物理 `1/r` 衰減與 ISO 9613-1 空氣吸收，參考距離（1 m）與最小距離（1 m）為
引擎政策。沒有逐音源的衰減曲線選項。

### `Mesh`

```ts
const mesh = sound.addMesh({
  vertices: geometry.attributes.position.array,
  indices: geometry.index.array,
  material: 'concrete',
});

mesh.setPose({
  position: object.position.toArray(),
  orientation: object.quaternion.toArray(),
  scale: object.scale.toArray(),
});
```

`indices` 用於整個網格為單一材質的情況。需要逐面材質時，請傳入
`{ a, b, c, materialIndex }` 形式的 `triangles`。

| API | 說明 |
|---|---|
| `setMaterial(material)` | 更換整個網格的材質。Sound-Tracing SDK 材質不可變，內部會重新綁定到新的材質／網格控制代碼 |
| `setMaterialRange(triStart, triCount, material)` | 依 triangle 範圍更換材質 |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`（靜態 TLAS）/ `'dynamic'`（只更新變換）。`'refit'`、`'rebuild'` 為相容用途，會重建網格 |
| `setPose(pose)` | 更新 position、orientation、scale |
| `dispose()` | 釋放網格與物件 |

BVH 由 Sound-Tracing SDK 擁有（預設 TinyBVH）。沒有逐網格的建置選項。

## 影格更新

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => { updateInFlight = undefined; });
  }
}
```

pose 變更可以快速記錄，但傳播 update 同時只執行一個較為安全。

## 生命週期

`SoundTrace`、`Source`、`Mesh` 都支援 `dispose()`。`SoundTrace.dispose()` 會清理包含 listener 與
Worker 在內、SDK 擁有的資源，重複呼叫也安全。

## EQ

在兩個位置套用 Sound-Tracing SDK 的參數式 EQ。

- **音源 EQ** — 在引擎分頻之前作用於音源訊號本身。該音源的直達音、反射、繞射、殘響全部帶有相同音色。
- **輸出 EQ** — 在渲染末端（主增益之前）作用於整個 Sound-Tracing SDK 混音。

濾波器種類為 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 共 6 種（切除固定 12 dB/oct），
範圍為頻率 20 ~ 20,000 Hz，增益 ±24 dB（僅 Peaking 與 shelf），Q 0.1 ~ 30（shelf 最多 3），前級增益 −48 ~ +12 dB。
預設為關閉，關閉時不會呼叫引擎，因此輸出與沒有 EQ 時相同。只送出變更的值，引擎以
20 ms 交叉淡化切換。

| API | 作用處 |
|---|---|
| `Source.setEq(eq \| null)` | 此音源的音源 EQ（最多 16 頻段）。`null` 為移除 |
| `SoundTrace.setOutputEq(eq \| null)` | 全域單一輸出 EQ。`null` 為關閉。`reset()` 後仍保留 |

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });
```

- `eq = { enabled = true, preampDb = 0, bands = [] }`、`band = { type = 'peaking', enabled = true, frequencyHz = 1000, gainDb = 0, q = 0.7071 }`
- `type` 為 Web Audio `BiquadFilterType` 名稱 `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'`。
- 超出範圍的值會以 `RangeError` 拒絕，不會送出指令。`{ enabled: false }` 會保留頻段並直通。
- 已套用的輸出 EQ 位於 `debugSnapshot().simplest.output.eq`。

## 相關文件

- [Web SDK 概覽](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
