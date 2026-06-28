---
title: Web
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# Web SDK

**soundtrace.js** 是用於在瀏覽器中使用 [STCoreV2](../core/stcorev2.md) 的 TypeScript/WebAssembly 綁定。它像標准 `AudioNode` 一样连接到應用拥有的 `AudioContext`，並把 Three.js 等渲染場景中的 mesh、material、source、listener 狀態反映到即時聲學傳播中。

## 何時使用

| 用途 | 说明 |
|---|---|
| Three.js/WebGL 應用 | 將視觉場景中的 collider 和 material 直接傳入聲學場景 |
| 瀏覽器遊戲/模擬器 | 随 source 和 listener 移動更新 reflection、diffraction、transmission 路徑 |
| Web Audio graph | 透過 `AudioWorkletNode` 空間化 MP3、streaming 或 microphone 輸入 |
| 调試與視覺化 | 從 JavaScript 查詢 valid path、BVH leaf box、ray/path 統計 |

## 安装與構件

包以 ESM 分發。普通應用從 `soundtrace.js` 入口的 facade 表面開始。

```ts
import {
  SoundTrace,
  workerHostedMtSupport,
  type MeshTriangle,
} from 'soundtrace.js';
```

包中包含以下 runtime 檔案。

| 路徑 | 用途 |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |
| `soundtrace.js/assets/hrtf/*.bin` | `loadHrtf()` 使用的 packaged HRTF tables |

請用 `loadHrtf('parametric')` 或 `loadHrtf('convolution')` 明確載入 HRTF。
可以使用 packaged tables，也可以由應用傳入 URL、`ArrayBuffer` 或 typed array。

當 bundler 需要 subpath asset URL 時，用 `new URL(..., import.meta.url)` 解析。

```ts
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## 快速開始

```ts
import {
  SoundTrace,
  type MeshTriangle,
  workerHostedMtSupport,
} from 'soundtrace.js';

// Run this inside a user click/tap handler.
const ctx = new AudioContext();
await ctx.resume();

const mt = workerHostedMtSupport();
if (!mt.supported) {
  throw new Error(`soundtrace.js mode=multi_thread requires ${mt.missing.join(', ')}`);
}

const sound = await SoundTrace.create(ctx, {
  mode: 'multi_thread',
  throughput: 'max',
  quality: 'balanced',
});

sound.listener
  .setAudioOption({
    sampleRate: ctx.sampleRate,
    inputSampleCount: 128,
    outputChannels: 2,
  })
  .setPose({ position: [0, 0, 0], orientation: [0, 0, 0, 1] });

const vertices = new Float32Array([
  -2, -1, -2,
   2, -1, -2,
   2, -1,  2,
  -2, -1,  2,
]);
const triangles: MeshTriangle[] = [
  { a: 0, b: 1, c: 2, materialIndex: 0 },
  { a: 0, b: 2, c: 3, materialIndex: 0 },
];

const floor = sound.addMesh({
  vertices,
  triangles,
  material: 'Concrete',
});

const source = sound.addSource({
  position: [2, 0, -1],
  gain: 1,
  paths: {
    direct: true,
    reflection: true,
    diffraction: true,
    reverberation: true,
  },
});

await sound.update(0);

const buffer = await fetch('/audio/music.mp3')
  .then((r) => r.arrayBuffer())
  .then((b) => ctx.decodeAudioData(b));

const player = ctx.createBufferSource();
player.buffer = buffer;
player.loop = true;
const spatialNode = await source.play(player, 2);
spatialNode.connect(sound.output).connect(ctx.destination);
player.start();
```

選擇 `mode: 'gpu'` 時，所選 `quality` 仍會控制 ray grid 和 render option，
但 GPU propagation depth 會固定為經過驗證的 WebGPU backend 上限 `8`。

運行時可以用 facade preflight helper 檢查部署支持：

```ts
import { workerHostedMtSupport } from 'soundtrace.js';

const mt = workerHostedMtSupport();
if (!mt.supported) {
  throw new Error(`soundtrace.js thread=mt requires ${mt.missing.join(', ')}`);
}
```

ST mode 在 real-time Web Audio 整合中也使用 `AudioWorkletNode`。服務部署時，給 ST/MT
都應用同一組 COOP/COEP headers 通常最簡單。

### 打包工具整合

`soundtrace.js` 是 deep-import ESM，並透過
`new Worker(new URL('./control/control-worker.js', import.meta.url))` 建立 MT control worker。
在打包工具（Vite/webpack/Next）中請注意兩點。

1. **worker 模組圖不會被自動追蹤。** 打包工具會輸出 worker *entry* chunk，但無法追蹤
   worker 在 runtime 才 import 的同層模組（`control-worker-*.js`、`control-hot-*.js`），
   導致這些檔案在輸出中遺漏，引發 runtime 404。
2. **wasm glue 是動態 import。** 請把套件從相依性 pre-bundle 中排除，並確保
   `dist/core`（wasm）與 `dist/assets`（HRTF）有被 serve，而 MT 需套用 COOP/COEP。

Vite 建議設定：

```ts
// vite.config.ts
export default defineConfig({
  // soundtrace.js 會動態 import wasm glue → 從 pre-bundle 排除
  optimizeDeps: { exclude: ['soundtrace.js'] },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

`vite build` 之後，需要一個 post-build 步驟把 worker entry 的遞移模組圖複製到產物中
（Rollup 無法追蹤 worker 的 runtime import）。`three-basic` demo 維護一份參考腳本
`scripts/copy-worker-module-graph.mjs`，並如下串接。

```jsonc
// package.json
"scripts": { "build": "vite build && node scripts/copy-worker-module-graph.mjs" }
```

webpack/Next 也適用同樣的限制（worker 圖 + wasm asset + COOP/COEP）。若把 asset 目錄
托管在不同 base，請用 `coreBaseUrl`/`assetBaseUrl` 對齊 runtime 解析。

## Runtime 結構

```
AudioBufferSourceNode
        │
        ▼
AudioWorkletNode  (listener, source pair)
        │
        ▼
sound.output      (GainNode, master output)
        │
        ▼
ctx.destination
```

`soundtrace.js` 不會自己建立 `AudioContext`。它接收由應用建立的 context，並返回 `AudioNode` 作為輸出。因此在空間化前後可以自由插入 EQ、compressor、master volume 等普通 Web Audio node。

## 執行緒模式

| 模式 | 選擇值 | 使用場景 | Audio path |
|---|---|---|---|
| Multi | `{ thread: 'mt' }` | 需要 worker-hosted control 和 pthread-enabled propagation 的部署 | WASM `AudioWorkletProcessor` 渲染 worker-owned engine session |
| Single | `{ thread: 'st' }` | single-thread WASM binary | WASM `AudioWorkletProcessor` 渲染 ST engine session |

`thread` 不是 automatic fallback，而是明確選擇要載入的 WASM binary。在
`thread: 'mt'` 中，SDK 會建立專用 control worker。該 worker 擁有 MT WASM module、
scene state 和 propagation frame loop；browser main thread 不會直接呼叫 MT control loop。

MT 使用兩條輸入路徑：

| 路徑 | 含義 | 對象 |
|---|---|---|
| HOT lane | 只有最新值有意義的 per-frame transform，透過 `SharedArrayBuffer` 寫入並在 worker frame 前消費 | `source transform`, `listener transform`, `mesh transform` |
| command channel | 不可丟棄、按 FIFO 處理的 async operation | create/delete、material 變更、mesh upload、BVH/options、audio source start/stop、reset/dispose 和其他 non-transform 工作 |

MT mode 要求瀏覽器 cross-origin isolation。HTML response 以及所有 WASM、worker、
worklet asset 都必須滿足條件，使 `SharedArrayBuffer` 和 `crossOriginIsolated === true` 可用。

```txt
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite dev server 示例:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

## Worker-hosted MT 编写流程

在 `thread: 'mt'` 或 `mode: 'multi_thread'` 中，main thread 不會直接建立 native
scene object。支持的公開流程是 facade 和 demo 流程。

1. 用 `SoundTrace.create(ctx, { mode: 'multi_thread' })` 或 `{ thread: 'mt' }` 準備 control worker 和 MT WASM。
2. 用 `sound.addMesh(...)` 加入 geometry。facade 管理 material table 和 mesh lifecycle，而 create/delete/material/mesh upload/BVH/options 等工作透過 command channel 傳送。
3. 用 `sound.listener.setPose(...)`、`source.setPose(...)`、`mesh.setPose(...)` 更新 listener/source/mesh pose。這三個 transform 透過 SharedArrayBuffer backed HOT lane 傳遞。
4. 用 `const source = sound.addSource(...)` 加入 source。
5. 用 `await sound.update(dt)` 傳送 worker frame request 並等待結果。
6. audio 透過 `await source.play(inputNode, 2)` 建立的 `AudioWorkletNode` render。
7. engine-output-style data 透過 `await sound.debugSnapshot(...)` 等 async API 讀取。

`simple.ts` 和 `three-basic` demo 是該流程的參考範例。`getStatistics()`、
`propagator.getValidPaths()` 等同步 GET 診斷在 MT 中不會呼叫 main-thread native getter；
需要時請使用 `debugSnapshot()` 的 async readback。

## Advanced direct-native reference

普通應用應使用上面的 facade flow（`SoundTrace.create`, `sound.addMesh`,
`sound.addSource`, `source.play`, `sound.update`）作為預設路徑。以下內容是需要直接
engine object 的高級 `thread: 'st'`/direct-native 整合參考。

## TypeScript API

### `SoundTrace`

| API | 说明 |
|---|---|
| `new SoundTrace(audioContext, options)` | 建立实例。使用前需要 `load()` |
| `SoundTrace.create(audioContext, options)` | 一次完成建立和 `load()` |
| `load()` | 載入 `st` 或 `mt` WASM，调用 `exaInit()` 並建立 `output` |
| `output` | master `GainNode` |
| `audioContext` | constructor 接收的 context |
| `createScene()` | 建立 `SoundScene` |
| `createObject()` | 建立 `SoundObject` |
| `createMesh()` | 建立 `SoundMesh` |
| `createCollider(opts?)` | 建立同時擁有 `SoundMesh + SoundObject` 的 `SoundCollider` |
| `createSource()` | 建立 `SoundSource` |
| `createListener()` | 建立 `SoundListener`；listener ID 也作為 renderer handle |
| `materials` | global material table wrapper |
| `propagator` | valid path、guide plane、profile 查詢 |
| `diagnostics` | version、memory trace、ray statistics 查詢 |
| `createWorkletNode(listener, source, channels = 2)` | 建立所選 ST/MT binary 的 `AudioWorkletNode` |
| `update(dt = 0)` | advance propagation 並回傳 `Promise<number>`。ST 與 MT 都一律 async（facade 隱藏 ST/MT 執行模式）— 請用 `await sound.update(dt)` 呼叫 |
| `reset()` | reset core state。回傳 `Promise<void>`（ST 與 MT 都一律 async）— 請用 `await sound.reset()` |
| `dispose()` | disconnect output node 並释放 WASM wrapper 引用 |

`SoundTraceOptions`:

| 字段 | 預設值 | 範圍/注意 |
|---|---:|---|
| `mode` | （未指定） | 執行模式選擇器（建議）：`'single_thread'` \| `'multi_thread'` \| `'gpu'`。`'gpu'` 在 load 時自動啟用 WebGPU（不支援時 fallback 到 CPU）。優先於 `thread` |
| `thread` | `'auto'` | wasm build 變體（進階；有 `mode` 時忽略）：`'auto'`（cross-origin isolated 時為 `'mt'`，否則為 `'st'`）\| `'st'` \| `'mt'`。MT 需要 control worker、SharedArrayBuffer、COOP/COEP |
| `quality` | `'balanced'` | facade 品質 tier：`'fast'` \| `'balanced'` \| `'quality'`。別名 `'speed'`（=fast）、`'middle'`（=balanced）為 `@deprecated`（runtime 仍保留）。詳見下方 [品質 tier](#品質-tier) |
| `throughput` | （未指定） | propagation 吞吐量 tier（僅 mt）：`'low'`（¼ pool）\| `'medium'`（½）\| `'max'`（full）。會映射為 `propagationThreadCount`，若後者明確指定則忽略 |
| `coreBaseUrl` | package internal `./core` | 自托管時指定包含 `st/`, `mt/` 的目錄，例如 `./core` |
| `assetBaseUrl` | package internal `./assets` | HRTF、material 等 packaged asset 的 base URL。CDN/複製部署時指定 |
| `propagationThreadCount` | `-1` | native `ExaRuntimeOption.propagationThreadCount`。`-1` 使用 native default，`1` 以上為 propagation job thread budget。優先於 `throughput` |
| `defaultMeshBuild` | native default | native `ExaMeshBuildOption`。`bvhType`、`bvhMaxDepth`、`primPerLeaf` 的 process-wide mesh build default |
| `coordinateBasis` | （預設 basis） | 輸入座標系轉換選項 |
| `autoLoadMaterials` | `true` | load 時自動 fetch 並註冊 `soundMaterial*.json`（解析 `addMesh({material:'concrete'})` 名稱）。`false` 則略過 fetch（offline/受控環境） |
| `debug` | `false` | load 時於 console 輸出 `[soundtrace.js] ready (...)` 診斷 log。預設安靜（library 不污染 console） |

```ts
const sound = await SoundTrace.create(ctx, {
  thread: 'mt',
  propagationThreadCount: -1,
  defaultMeshBuild: {
    bvhType: BvhType.LBVH_SIMD8,
    bvhMaxDepth: 16,
    primPerLeaf: 4,
  },
});
```

`propagationThreadCount` 和 `defaultMeshBuild` 會在 WASM 載入後、native `exaInit()` 前
透過 C API 傳入。在 worker-hosted MT 中，調整細部 BVH option 的公開路徑僅限於 facade
command surface；direct-native mesh build option 操作請只在 ST/direct-native 整合中使用。

### 品質 tier

`quality` 用單一個值同時設定 **propagation 成本槓桿** 與 **audio render option**，
是一條單調（speed↔quality）的階梯。正式值有 3 個，`'speed'`（=`'fast'`）與
`'middle'`（=`'balanced'`）為向後相容的 `@deprecated` 別名（runtime 仍可運作）。
預設值為 `'balanced'`。

| tier | propagation `maxDepth` | listener ray grid | HRTF | diffuse | late reverb | delay interp |
|---|---:|---:|---|---|---|---|
| `fast` (`speed`) | 4 | 16 × 16 | low | off | one-pole | linear |
| `balanced` (`middle`, 預設) | 8 | 24 × 24 | medium | medium | tilt | cubic-lagrange |
| `quality` | 12 | 32 × 32 | high | high | eight-band(per-band) | lagrange6 |

在 `mode: 'gpu'` 中，tier 的 ray grid 與 render option 仍會套用，但 propagation
depth 會固定為 WebGPU backend 上限 `8`。若只想單獨調整 audio render option，可以用
`sound.listener.setRenderOptions(...)` 與 tier 獨立 override。

### `SoundScene`

| API | 说明 |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | 管理 sound collider |
| `addCollider(collider)`, `removeCollider(collider)` | 連接/解除 `SoundCollider` RAII 物件 |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | 管理 source |
| `setListener(listener)` | 設定 scene 的單一 listener。已有 listener 時會替換 |
| `addListener(listener)`, `removeListener(listener)` | 相容用 listener API。加入第二個 listener 會拋出錯誤 |
| `clearListeners()` | 解除目前 listener 連接 |
| `update(dt)` | `tick(dt)` 後執行 `updatePropagation()` |
| `tick(dt)` | 消费 object update type，並更新 TLAS/BVH state |
| `updatePropagation()` | 執行 ray/path propagation |

scene 中應只有一個 listener。即使 UI 管理多個 listener 候選，也請選出實際參與傳播計算的一個，並用 `setListener()` 替換。

### `SoundObject` 與 `UpdateType`

| 值 | 用途 |
|---|---|
| `UpdateType.Static` (`0`) | 預設。geometry 和 transform 不變化的靜態 collider |
| `UpdateType.Refit` (`1`) | vertex 位置變化但 topology 相同。用於 skinned/animated collider |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()`、topology 變化、BVH option 變化、scene 新增/刪除 |

:::warning Refit 使用规则
`Refit` 用在**將 skinned animation 作為 sound collider**的場景。這時 BVH 應使用 `LBVH` family builder 建置。每帧只用 `mesh.updateVertices(vertices)` 更新 vertex buffer，將對應 object 標記為 `UpdateType.Refit`，然後執行 `scene.tick(dt)`。BLAS refit 與 TLAS refit 會在 `SoundScene::tick()` 内消费 update flag 後處理。
:::

:::info 需要 Rebuild 的情况
`SoundMesh.setData()` 會建立新的內部 BVH object。如果 object 已经挂在 scene 上，請在下一次 tick 前调用 `object.setUpdateType(UpdateType.Rebuild)`。`scene.tick(dt)` 會根據该 flag 處理 BLAS/TLAS rebuild。
:::

### `SoundMesh`

| API | 说明 |
|---|---|
| `setData(vertices, triangles, opts?)` | 重新建置 geometry 與 BVH。triangle index（`a`/`b`/`c`）必須是 `[0, numVerts)` 範圍內的整數，超出範圍、負值或非整數會在呼叫 native 前被拒絕並報錯（`addMesh` 也做同樣驗證） |
| `updateVertices(vertices)` | 只更新 vertex buffer |
| `updateVerticesAndRefit(vertices)` | 更新 vertex buffer 後執行 mesh refit |
| `setMaterial(materialIndex)` | 修改全部 triangle 的 material |
| `setMaterialRange(triStart, triCount, materialIndex)` | 修改部分 triangle 的 material |
| `getBVHWireframe()` | 用於視覺化 BVH leaf AABB 的 float array |
| `intersect(sceneID, ray)` | 對 scene 中 sound mesh 執行 raycast |

two-level BVH 同步透過 `SoundObject` 的 `UpdateType` flag 在 scene tick 中處理。若 topology、triangle list 或 BVH option 變化，請再次调用 `setData()`，並把已挂到 scene 的 object 標記為 `UpdateType.Rebuild`。只有 vertex 變化的 animated collider 可使用 `updateVerticesAndRefit()` 或 `SoundCollider.refitVertices()`。

`MeshBuildOptions`:

| 字段 | 預設值 | 推荐範圍 | 说明 |
|---|---:|---:|---|
| `bvhType` | `BvhType.Default` | enum below | `Default(-1)` 使用目前 native `ExaMeshBuildOption.bvhType` |
| `bvhMaxDepth` | `0` | `0` 或 `1..32` | `0` 或省略時使用 native default |
| `primPerLeaf` | `0` | `0` 或 `1..32` | `0` 或省略時使用 native default |

BVH 選擇:

| 類型 | 值 | 用途 |
|---|---:|---|
| `Default` | `-1` | `SoundMesh.setData()` 中使用目前 native default mesh build option |
| `HKDtree` | `0` | **靜態 sound collider**。如墙、房间、地板等 topology 和 vertex 固定的 mesh。目前引擎中它作為 `SBVH` 的替代存在 |
| `LBVH` | `1` | 動態/skinned collider default。vertex 每帧變化且需要 scene tick refit 路徑的 mesh |
| `LBVH_SIMD4` | `2` | SIMD4 LBVH builder |
| `LBVH_SIMD8` | `3` | SIMD8 LBVH builder |
| `LBVH_SIMD16` | `4` | SIMD16 LBVH builder |
| `LBVH_NWAY4` | `5` | 4-way LBVH builder |
| `LBVH_NWAY8` | `6` | 8-way LBVH builder |
| `LBVH_NWAY16` | `7` | 16-way LBVH builder |

`defaultMeshBuild.bvhType` 是 native process-wide default，必須傳實際 builder enum。
`BvhType.Default` 只是在 per-mesh `setData()` 中表示「使用目前 native default」的 sentinel。

### `SoundCollider`

`SoundCollider` 是把 `SoundMesh` 和 `SoundObject` 綁在一起的上層 RAII 物件。對 Three.js 或 scene component 整合來說，它讓 mesh、object、scene 連接共享同一個生命週期。

| API | 说明 |
|---|---|
| `sound.createCollider(opts?)` | 從 `vertices`, `triangles` 和 BVH options 建立 collider |
| `scene.addCollider(collider)` | 將 collider object 加入 scene 並記錄連接狀態 |
| `scene.removeCollider(collider)` | 從 scene 移除並清除連接狀態 |
| `collider.rebuild(vertices, triangles, opts?)` | 調用 `mesh.setData(...)` 後把 object 標記為 `UpdateType.Rebuild` |
| `collider.refitVertices(vertices)` | 只更新 vertex，並把 object 標記為 `UpdateType.Refit` |
| `collider.dispose()` | 一起清理 scene 連接、object 和 mesh |

Three.js adapter 會讀取 `BufferGeometry.groups[].materialIndex` 和 `mesh.material` slot，轉換為 triangle 的 `materialIndex`。解析順序如下：

1. material 的 `userData.soundMaterialIndex` 或 `soundMaterialIndex`
2. `materialMap` 中的 slot 編號、`slot:N`、material `name`、`uuid`、`type`
3. 未匹配時使用 `defaultMaterialIndex`（預設 `0`）

靜態 collider 的預設 BVH 是 `HKDtree`；`dynamic: true` 或 skinned collider 的預設 BVH 是 `LBVH`。如需 SIMD/N-way builder，請在 collider option 中指定 `bvhType`。skinning animation 應保持 topology 不變，並在每帧調用 `collider.refitVertices(vertices)`。

### `SoundListener`

| API | 说明 |
|---|---|
| `setPosition(x, y, z)`, `setVelocity(x, y, z)` | listener 位置與速度 |
| `setOrientation(mat3x3)` | row-major 3x3 orientation matrix。demo 使用 `right, up, forward(-Z)` |
| `setOrientationQuat(qx, qy, qz, qw)` | quaternion orientation |
| `setOption(option)` | 批量設定 propagation option |
| `setAudioOption(option)` | 設定 audio sample/block/channel |
| `setPathEnable(pathType, enabled)` | direct/reflection/diffraction/reverb/transmission on/off |
| `setRayCount(width, height)` | listener guide ray grid size |
| `setRayDepth(depth)` | maximum path depth |
| `render(sourceID, input, output, channelCount)` | low-level manual render；常規 Web Audio 整合使用 `createWorkletNode()` |
| `setMaxDelay(sourceID, v)` | delay line 最大长度 |
| `setPathFadeTime(sourceID, v)` | path 變化 cross-fade 時間 |
| `setMaxDelayRate(sourceID, v)` | delay 變化 rate limit |

`STOption` 参數:

應用啟動推薦使用 `recommendedSTOption()`。目前 ray budget 上限是
`EXA_LISTENER_WIDTH = 32`, `EXA_LISTENER_HEIGHT = 32`, `EXA_MAX_DEPTH = 16`；
runtime 推薦起點是 `16 × 16 × depth 3`。

| 字段 | 推薦 preset | 最小/最大 | 為什麼调整 |
|---|---:|---:|---|
| `maxDepth` | `3` | `1..16` | reflection/diffraction path 最大深度。越高越丰富，但成本随 `ray count × depth` 增加 |
| `listenerWidth` | `16` | `1..32` | horizontal ray resolution |
| `listenerHeight` | `16` | `1..32` | vertical ray resolution |
| `seedValue` | `0` | `0..2^32-1` | random/cache seed。目前 C API 在 `0` 時會强制 `pathCacheSize` 為 `0` |
| `maxSoundSource` | `116` | `1..116` | scene 中可追蹤的 source 上限 |
| `pathCacheSize` | `16384` | `0..16384` | path cache 容量。越大記憶體越多，`seedValue=0` 時停用 |
| `enableEnergyBasedTermination` | `false` | boolean | 讓能量足够低的 path 提前结束，减少深路徑成本 |
| `energyThreshold` | `0.001` | `0..1` | EBT 阈值。`0.01` 接近 RT20，`0.001` 接近 RT30，`0.000001` 接近保守 RT60 |
| `samePlaneEpsilonDist` | `0.001` | `0..` | 合並近似同平面的距离容差，單位為 scene meter |
| `samePlaneEpsilonNormal` | `0.999` | `0..1` | plane normal 相似度，越接近 1 越严格 |
| `guideRayMethod` | `0` | `0` 或 `1` | `0 = GridStaggered`, `1 = Fibonacci` |

不要在拖動 UI 的每個像素都改变 ray count 和 depth。更安全的做法是在 slider release 時應用，因為內部 path cache 和 guide-plane buffer 可能重新分配。

`AudioOption` 参數:

| 字段 | 推荐值 | 说明 |
|---|---:|---|
| `sampleRate` | `ctx.sampleRate` | 必须與瀏覽器 `AudioContext` 一致 |
| `inputSampleCount` | `128` | `createWorkletNode()` path 中引擎一次處理的 frame 數 |
| `outputChannels` | `2` | HRTF binaural 輸出。目前即時路徑推荐 stereo |

### `SoundSource`

| API | 说明 |
|---|---|
| `setPosition(x, y, z)` | source 位置 |
| `setDirection(x, y, z)` | directional source 的方向 vector |
| `setVelocity(x, y, z)` | Doppler/dynamic 處理用 velocity |
| `setIntensity(v)` | source base gain。以 `1.0` 為基准，避免负值 |
| `setGainBoostDb(db)` | overall gain boost。native clamp 到 `0..20 dB` |
| `setReverbSendDb(db)` | reverb send。native clamp 到 `-60..20 dB` |
| `setReflectionSendDb(db)` | reflection send。native clamp 到 `-60..20 dB` |
| `setDepth(depth)` | source ray depth。起點 `3`，範圍 `1..16` |
| `setRayCount(width, height)` | source ray grid。起點 `16 × 16`，上限 `32 × 32` |
| `setDistanceAttenuation(pathType, vec3)` | 每個 path type 的 distance attenuation curve |

Path type:

| 名稱 | 值 |
|---|---:|
| `PathType.Direct` | `0` |
| `PathType.Reflection` | `1` |
| `PathType.Diffraction` | `2` |
| `PathType.Reverb` | `3` |
| `PathType.Transmission` | `4` |

Distance attenuation 使用 `vec3 = { x: constant, y: linear, z: quadratic }`，內部计算如下。

```txt
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

每個系數都應為 `0` 以上。demo 對所有 path type 使用 `{ x: 0.001, y: 1.0, z: 0.0 }`，接近 `1 / distance` 曲線，並用很小的 `constant` 防止 near-field 爆增。`setAllDistanceAttenuations` helper 目前只處理 direct/reflection/diffraction/reverb 四種，因此 transmission 建議用 `setDistanceAttenuation(PathType.Transmission, value)` 單独設定。

### `MaterialTable`

| API | 说明 |
|---|---|
| `sound.materials.add(material)` | 新增到 global material table 並返回 index |
| `sound.materials.set(index, material)` | 替換既有 material |

### `Propagator`

| API | 说明 |
|---|---|
| `getValidPathCount()` | 目前 valid path 數量 |
| `getValidPaths(count?)` | 以 JS array 查詢 path polyline、energy、material hit |
| `getGuidePlaneCount(sceneID)`, `getGuidePlanes(sceneID)` | guide plane visualization |
| `getMirrorPositionCount(sceneID)`, `getMirrorPositions(sceneID)` | image-source position visualization |
| `getProfile()` | 最近 propagation 阶段 ms 和 path count |
| `setJobTimingOption({ enabled, frameCapacity })` | 設定 native propagation job timing ring buffer |
| `getJobTimingFrames(sceneID, maxFrames?)` | 查詢最近 propagation frame/job timing snapshot |
| `resetJobTiming()` | reset job timing snapshot |
| `sortIRDatas()` | 請求 IR data 排序 |
| `findAttenuationForDistance(...)` | 反算 target attenuation 對應 distance |

direct-native `Propagator` surface 僅用於 ST/direct-native 整合。worker-hosted MT
應用應使用 facade command API 和 async debug snapshot API，而不是在 browser main
thread 直接呼叫 `tick()` 和 `updatePropagation()`。

## Sound Material JSON

預設材質位於 `soundMaterial.json` 的 `_soundMaterials` 陣列。目前 bundle 包含 22 個材質，`ConcreteBlockPainted` type `20` 是 three.js demo 的預設 wall/room material。

```jsonc
{
  "_soundMaterials": [
    {
      "materialType": 0,
      "description": "Concrete",
      "scattering": 0.08,
      "reflection": [0.99, 0.98, 0.94, 0.86, 0.63, 0.40, 0.35, 0.30],
      "absorption": [0.01, 0.02, 0.06, 0.14, 0.37, 0.60, 0.65, 0.70],
      "transmission": [0.005, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001, 0.001]
    }
  ]
}
```

| 字段 | 範圍 | 说明 |
|---|---:|---|
| `materialType` | `0..` unique integer | triangle 的 `materialIndex` 引用的 stable ID |
| `description` | string | 顯示在 UI 和 authoring tool 中的名稱 |
| `scattering` | `0..1` | `0` 偏向 specular，`1` 偏向 diffuse scattering |
| `reflection` | float[8], each `0..1` | 8 個 frequency band 的 reflection coefficient |
| `absorption` | float[8], each `0..1` | 8 個 frequency band 的 absorption coefficient |
| `transmission` | float[8], each `0..1` | 8 個 frequency band 的 transmission coefficient |

8 個 frequency band 是固定的。

```txt
[67.5, 125, 250, 500, 1000, 2000, 4000, 8000] Hz
```

為了能量守恒，同一 band 中 `reflection + absorption + transmission` 應大致接近或低於 `1.0`。部分測量或调优材質可能有小误差，但较大的超出值會讓 path energy 過强。

Runtime loading 示例:

```ts
const res = await fetch(new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url));
const { _soundMaterials } = await res.json() as {
  _soundMaterials: Array<{
    materialType: number;
    description: string;
    scattering: number;
    reflection: number[];
    absorption: number[];
    transmission: number[];
  }>;
};

for (const m of _soundMaterials) {
  sound.materials.add({
    reflection: m.reflection,
    absorption: m.absorption,
    transmission: m.transmission,
    scattering: m.scattering,
    index: m.materialType,
  });
}
```

預設材質列表:

| ID | 名稱 | scattering |
|---:|---|---:|
| 0 | Concrete | 0.08 |
| 1 | Fabric | 0.40 |
| 2 | Wood | 0.15 |
| 3 | Brick | 0.25 |
| 4 | ConcreteBlock | 0.35 |
| 5 | Glass | 0.05 |
| 6 | Gravel | 0.65 |
| 7 | GypsumBoard | 0.08 |
| 8 | Linoleum,RubberOrAsphaltTile | 0.05 |
| 9 | Marble | 0.05 |
| 10 | Plaster | 0.06 |
| 11 | Plywood | 0.12 |
| 12 | Sherdded-woodFiberborad | 0.55 |
| 13 | Snow | 0.75 |
| 14 | Soil | 0.60 |
| 15 | Steel | 0.06 |
| 16 | Stone | 0.30 |
| 17 | WaterSurface | 0.03 |
| 18 | TunableAbsorber | 0.20 |
| 19 | LowVarianceTarget | 0.02 |
| 20 | ConcreteBlockPainted | 0.15 |
| 21 | FiberglassReinforcedPlastic | 0.10 |

`soundMaterialAlias.json` 不是引擎功能，而是 UX 便利資料。它是辅助表，用於將 authoring tool 或 app layer 傳入的字符串自動映射到 canonical material，對 `soundtrace.js` core 行為不是必需的。例如 `cement`、`beton` 可以映射到 `concrete`，`timber`、`oak` 可以映射到 `wood`。匹配失败時，app 可以使用 `defaultMaterialType` fallback。

## Three.js 示範

<iframe
  title="soundtrace.js three-basic worker-hosted MT demo"
  src={useBaseUrl('/demos/three-basic/simple.html')}
  style={{display: 'block', width: '100%', height: '486px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

`three-basic` 是 Web SDK 的 `simple.ts` 整合範例。docs preview server 會傳送
COOP/COEP headers，因此可以在 iframe 中直接檢查 MT。遷移到其他 static host 時也需要同樣的 headers。

runtime 和 demo 建置:

```bash
npm install

cd /path/to/soundtrace.js
npm run build

cd /path/to/soundtrace-three-basic
npm install
SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk
npm run build

cd /path/to/docs
rsync -a --delete /path/to/soundtrace-three-basic/dist/ \
  static/demos/three-basic/

BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

對於 `http://127.0.0.1:3100/docs/sdk/web` 這樣的部署路徑 preview，build 時也要指定
`BASE_URL=/docs/`，使 Docusaurus client route 與 static file prefix 一致。

MT 檢查流程：

1. 確認 `npm run dev` 或 `npm run serve` 傳送 COOP/COEP headers。
2. 在瀏覽器中確認 `crossOriginIsolated === true` 且 `SharedArrayBuffer` 可用。
3. 在 `simple.html` 或 docs iframe 中將 `Backend` 設為 `mt`，然後按 `Start Audio`。
4. 移動 source/listener/mesh，確認 `source transform`、`listener transform`、`mesh transform` 會立即反映。

### 底部按鈕

| Control | 说明 |
|---|---|
| `Room` | 選擇整個 room collider 的 material |
| `Collider` | 選擇 static wall 與 Flair collider 的 material |
| `Backend` | 啟動前選擇 `st` 或 `mt`。選擇值明確指定要載入的 WASM binary |
| `Start Audio` | 載入 WASM、material、MP3 並啟動 audio。default HRTF 會在 native 初始化中自動套用 |
| `Move` / `Stop` | 讓 source 沿 room 内椭圆路徑移動，或停在目前位置 |
| `Wall: On/Off` | 向 scene 新增/移除 listener 附近的 static wall collider |
| `Flair: On/Off` | 向 scene 新增/移除 FBX skinned animation collider |

`Flair` 每帧采样 skinned vertex 並作為 sound collider 使用。該路徑用於展示 `LBVH`
family builder 與 `updateVertices + UpdateType.Refit` 組合。如果在 demo 中把 BVH
type 改為 `HKDtree`，請把 Flair 視為基於 bind pose 的靜態檢查場景。

### lil-gui 面板

| Panel | Control | 说明 |
|---|---|---|
| `Listener · General Rays` | `Width`, `Height` | listener guide ray resolution。demo range `1..32`, default `32` |
| `Listener · General Rays` | `Depth` | listener guide ray max path depth。demo range `1..16`, default `7` |
| `Listener · Reverb Rays` | `Width`, `Height` | source reverb ray resolution。demo range `1..64`, default `16` |
| `Listener · Reverb Rays` | `Depth` | source reverb ray depth。demo range `1..16`, default `4` |
| `Debug overlays` | `Show Valid Paths` | 顯示 propagation result polyline |
| `Debug overlays` | `Show FPS` | 顯示 Stats HUD |
| `Colliders · BVH` | `Type` | `Default`, `HKDtree`, `LBVH`, `LBVH_SIMD4/8/16`, `LBVH_NWAY4/8/16` |
| `Colliders · BVH` | `Max Depth` | BVH build depth。demo range `1..32` |
| `Colliders · BVH` | `Prims / Leaf` | 每個 leaf 的 primitive 數。demo range `1..32` |
| `Colliders · BVH` | `Show BVH Boxes` | 顯示 leaf AABB wireframe |
| `Render Params` | `Max Delay Rate` | `0.01..0.5`, default `0.03`。限制 delay 變化速度 |
| `Render Params` | `Path Fade Time` | `0.005..0.2 s`, default `0.066`。path 變化 cross-fade |
| `Render Params` | `Max Path Delay` | `0.1..3.0 s`, default `1.0`。delay line 最大长度 |

### 滑鼠操作

| 操作 | 说明 |
|---|---|
| 右鍵拖動 | 围绕 listener 进行 camera orbit |
| 滚轮 | zoom |
| 蓝色箭头 | listener forward 方向 |
| 红色箭头 | listener right 方向 |

## 效能調校顺序

1. runtime app 從 `Ray Width = 16`, `Ray Height = 16`, `Ray Depth = 3` 開始。
2. listener `General Rays` 與 source `Reverb Rays` 只按需要提升。
3. static structure 使用 `HKDtree`，animation collider 使用 `LBVH` family。
4. animation collider 保持 topology，只更新 vertex。
5. 如果 path 變化過快，提升 `Path Fade Time`；如果听到 delay pitch wobble，降低 `Max Delay Rate`。
6. valid path 與 BVH box overlay 只在调試時開啟。

three.js demo 按 **1 listener + 1 source** 設定，優先展示高質量和调試可见性。實際 app 中 gizmo 不是必需的。尤其绘制 valid path 和 BVH box 時，會把 WASM 內部資料複製到 JS 並重建為 Three.js geometry，因此會产生通訊和視覺化開销。建議只在開發中開啟，runtime 發布時關閉。

demo 是小場景，用於展示品質和視覺化，因此 listener `General Rays` 從 `32 × 32 × depth 7` 開始，source `Reverb Rays` 從 `16 × 16 × depth 4` 開始。一般 app 的起始推薦仍是 `16 × 16 × depth 3`。

## 故障排除

| 症状 | 檢查項 |
|---|---|
| Native worklet/MT 載入失败 | 確認 HTML 響應包含 COOP/COEP，且 `crossOriginIsolated` 為 `true` |
| `createWorkletNode` error | 確認 `ctx.resume()` 在 user gesture 中執行，且 worklet core asset path 正確 |
| 沒有聲音 | 確認在使用者點擊中调用 `ctx.resume()`，`soundMaterial.json` 已載入到 material table，且 absorption array 沒有误複製成與 reflection 相同 |
| 聽不到 reflection/diffraction/absorption 變化 | 沒有 sound collider 時，scene 主要只產生 direct sound。請加入已映射 geometry 和 sound material 的 collider |
| 感覺不到方向感 | 確認 listener audio option、orientation、source/listener 位置、collider/material 設定 |
| 影格率下降 | 降低 `Ray Depth`, `Ray Width`, `Ray Height`。runtime 起始推荐 `16 × 16 × depth 3` |
| mono input 无聲 | SDK 將 worklet node channel count 固定為 `2`, `explicit`, `speakers`。手動建立 node 時也要使用相同設定 |
| path gizmo 像残影 | 只使用 `getValidPaths()` 返回的實際 count |
| ray/path gizmo 不顯示 | 確認 scene 中已新增 sound collider object |
| animation collider 抖動 | 確認流程為 `LBVH` family, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, `scene.tick()` |
| 修改 BVH option 後 crash | `mesh.setData()` 後，把 object 標記為 `UpdateType.Rebuild` 並執行 `scene.tick()` |

### FAQ: 聲音只從一側播放

本節面向 `soundtrace.js` 模組使用者，尤其是把 SDK 接入現有 Web Audio app，或為新
web app 建構 audio graph 時遇到的問題。典型症狀是：有聲音，但偏向一側；
HRTF/空間音訊感覺不明顯；移動 source 時方向變化也很弱。

這個問題通常不是 STCoreV2 core 本身，而是初始化順序、audio option，或 app 端
channel routing 引起的。示範和最近的修復中，下面這些點最關鍵。

實作時最容易遺漏的是下面幾點。

- `soundtrace.js` 的 real-time HRTF 輸出不是硬體 5.1/7.1 bus，而是 `2` channel binaural/stereo render target。即使實作 speaker layout，每個 speaker 也是 virtual source，最終輸出仍會混合為 stereo。
- 如果手動建立 `AudioWorkletNode`，但省略 `outputChannelCount: [2]`，1-output/1-input worklet 的初始 channel count 可能是 `1`。SDK 的 `createWorkletNode()` 會固定 `channelCount = 2`、`channelCountMode = 'explicit'`、`channelInterpretation = 'speakers'` 來避免這個問題。
- low-level code 直接呼叫 `listener.render()` 時，`channelCount` 必須是 `2`，輸入 buffer 長度必須是 `frames * 2` 的 interleaved sample 數。只傳 frame 數或 mono buffer 會違反 engine 的 mono-mix/render-buffer 契約。
- 在建立多個 virtual speaker source 的 app 中，不要假設瀏覽器會自動按 speaker 分配 channel。app 必須為每個 source 明確設定 left/right/mix routing。

檢查清單:

1. **確認正在使用 SDK wrapper。** 不要只手動載入 WASM 檔案。對 facade 路徑，應使用 `soundtrace.js` 模組中的 `SoundTrace`、`sound.listener`、`sound.addSource()`、`source.play()`。像 `SoundListener`、`createWorkletNode`、`recommendedSTOption`、`PathType` 這類 direct-native 組合，只適用於 ST/direct-native 整合。
2. **在使用者點擊中立即呼叫 `AudioContext.resume()`。** 如果等 WASM 或 audio fetch 之後才呼叫 `resume()`，瀏覽器 autoplay policy 可能讓 context 一直保持 `suspended`。參考示範，在 click handler 前半段建立 `const resumeP = ctx.resume()`，最後再 `await resumeP`。
3. **listener audio option 要匹配真實 context。** `sampleRate` 使用 `ctx.sampleRate`，`outputChannels` 在目前即時 HRTF 路徑中使用 `2`。`inputSampleCount` 以 `128` 為基準，適用於 facade 的 `source.play()` 路徑與 ST/direct-native 的 `createWorkletNode()` 路徑。
4. **listener pose 和品質選項先依示範起步。** facade 路徑使用 `sound.listener.setPose(...)`、`sound.setQuality(...)`、`sound.setAudioOption(...)`。只有在 ST/direct-native 整合中，才直接使用 `listener.setOption(recommendedSTOption())`、`listener.setOrientation(...)`、`listener.setPosition(...)`。
5. **先設定 material table 和 collider。** facade 路徑用 `sound.addMesh(...)` 新增 material 與 collider。ST/direct-native 整合則使用 `sound.materials`、`createCollider()`、`scene.addCollider(...)`。沒有 collider 時主要是 direct sound，空間變化會比較弱。
6. **custom Web Audio graph 中明確設定 stereo。** facade 的 `source.play()` 路徑與 ST/direct-native 的 `createWorkletNode()` 路徑都會使用 `channelCount = 2`、`channelCountMode = 'explicit'`、`channelInterpretation = 'speakers'`。如果手動建立 node，或組合獨立 graph，也要給 input hub、splitter、merger、worklet/input node 設定相同選項。
7. **用多個 sound source 實作 speaker layout 時，明確 routing channel。** 不要把同一個 stereo input 隱式連接到所有 source。例如 `L/LS/SL/BL` 系 source 接收 left channel 並複製到左右 input frame，`R/RS/SR/BR` 系 source 接收 right channel，`C/LFE/Mono` 使用 `(L + R) * 0.5` mono mix。
8. **重新播放前完整清理 graph。** 斷開舊的 `MediaElementAudioSourceNode`、`AudioBufferSourceNode`、splitter、merger 和 gain node，再建立新的 source graph，只把 soundtrace output 接到 master/destination。
9. **第一個 audio block 前預熱 propagation。** listener、source、collider 設定完成後，呼叫一次 `scene.tick(0)` 和 `scene.updatePropagation()`，準備初始 path state。

因此在判斷 SDK core 有問題前，先檢查 AudioContext resume timing、audio option、
channel routing 和 graph lifecycle。

## 參考

- [SDK 概覽](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [示範](../demos/overview.md)
