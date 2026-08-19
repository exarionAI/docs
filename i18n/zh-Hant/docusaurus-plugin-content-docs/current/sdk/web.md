---
title: Web
description: 安裝 soundtrace.js WebAssembly SDK，並使用 HRTF 模式、品質預設與 CPU/MT/WebGPU 後端。
---

# Web SDK

**soundtrace.js** 是在瀏覽器中使用 [STCoreV2](../core/stcorev2.md) 的
TypeScript/WebAssembly SDK。它將渲染場景中的網格、材質、音源與聆聽者連接到
Sound Tracing 場景，並向 Web Audio 圖提供空間音訊輸出。

## 目前 SDK 重點

| 項目 | 建議流程 |
|---|---|
| HRTF | 預設使用 core 內建 HRIR 表（不需載入）；參數化方向渲染呼叫 `loadHrtf('parametric')` |
| 後端 | 選擇 `Single Thread`、`Multi Thread` 或 `WebGPU` |
| 品質 | 選擇 `Fast`、`Balanced` 或 `Quality` 預設 |
| 材質 | 以名稱指定材質預設：`concrete`、`wood`、`glass`、`metal` 等 |
| 底層參數 | 讓預設統一管理射線解析度、深度與渲染預算 |

## 需求

- Node.js 20 或更新版本
- 支援 Web Audio API 與 AudioWorklet 的現代瀏覽器
- `Multi Thread` 需要 COOP/COEP 與 `crossOriginIsolated === true`
- `WebGPU` 需要提供 `navigator.gpu` 的瀏覽器與 GPU
- 已授權的 SDK 發行包

## 安裝

`soundtrace.js` 是透過授權合約提供的非公開套件 `@exarionai/soundtrace.js`。取得
發行版之後，直接使用下列範例中的 import 指定子即可。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

套件自帶 WASM core（`core/st`、`core/mt`）以及材質與 HRTF 資源，並於執行時直接
fetch。若打包工具對這段模組圖做預先打包，worker 與 wasm 載入會失效，因此在 Vite
中要將該套件排除在相依預先打包之外。

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

如需自行託管 core 與資源，可用 `coreBaseUrl`、`assetBaseUrl` 指定 URL，詳見
[Facade API](./web/facade.md)。

## 快速開始

請在使用者點擊或觸控事件處理函式中執行。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});

const room = sound.addMesh({
  vertices,
  indices,
  material: 'concrete',
});

const source = sound.addSource({
  position: [2, 1.5, -1],
  gain: 1,
});

sound.listener.setPose({
  position: [0, 1.7, 0],
});

await sound.update(0);
```

Three.js 相機朝向 `-Z`，因此應使用上面的座標基底。如果座標基底錯誤，HRTF 的左右
或前後方向會被鏡像。

## 選擇 HRTF

core 在建立每個 listener 時就已安裝 min-phase HRIR 表，因此即使完全不呼叫
`loadHrtf()`，雙耳渲染也能運作 —— 這就是預設路徑。

若要切換到精簡後的 KU100 parametric 表，需要明確載入。

```ts
await sound.loadHrtf('parametric');
```

| 呼叫 | 使用的表 | 額外資源 |
|---|---|---|
| （不呼叫） | core 內建 min-phase HRIR | 無 |
| `loadHrtf('parametric')` | KU100 parametric | `KU100_bprime.bin` |
| `loadHrtf('convolution')` | core 內建 HRIR（切換為最近鄰查找） | 無 |
| `loadHrtf('steamaudio')` | SADIE H12 HRIR | `sadie_h12_steamaudio.bin` |

若要使用應用程式自有的表，將 URL、`ArrayBuffer` 或 typed array 作為第二個參數傳入。

```ts
await sound.loadHrtf('parametric', '/assets/my-hrtf.bin');
```

:::note
core 中確實存在以 8 頻段振幅加 ITD 渲染的 `Band8` 空間化器，但 facade 無法選擇它：
`setRenderOptions()` 會拒絕 `hrtfMode` 鍵，只能透過 native 的 `setHrtfMode()` 切換。
:::

## 選擇後端

| 模式 | 程式碼 | 需求 | 行為 |
|---|---|---|---|
| Single Thread | `mode: 'single_thread'` | 一般瀏覽器託管 | 最簡單的 CPU 路徑 |
| Multi Thread | `mode: 'multi_thread'` | COOP/COEP 與 SharedArrayBuffer | 在 Worker 中執行的 MT CPU 路徑 |
| WebGPU | `mode: 'gpu'` | WebGPU | 嘗試 GPU 傳播，失敗時回退至 CPU |

### Multi Thread 部署回應標頭

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

專用 Worker 擁有 MT 引擎工作階段，主執行緒保留 UI 與 Web Audio 所有權。
Transform 更新使用快速狀態路徑，建立／刪除、材質與網格操作使用有序命令路徑。

### WebGPU

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'gpu',
  quality: 'balanced',
});
```

目前自動 WebGPU 路徑與 Single Thread 核心搭配使用。不要同時強制
`thread: 'mt'` 與 `mode: 'gpu'`。GPU 初始化失敗時，SDK 會繼續使用 CPU。

## 品質預設

| 預設 | 建議用途 |
|---|---|
| `fast` | 行動裝置、低功耗裝置、大量同時音源 |
| `balanced` | 一般桌面平台與產品整合的預設選擇 |
| `quality` | 高階桌面平台與品質優先示範 |

```ts
sound.setQuality('quality');
```

預設會同時協調傳播與 HRTF／Diffuse 渲染預算。效能不足時，應先依
`quality → balanced → fast` 降級，再考慮編輯個別射線屬性。

## 連接 Web Audio

```ts
const player = audioContext.createBufferSource();
player.buffer = decodedBuffer;
player.loop = true;

const spatialNode = await source.play(player);
spatialNode.connect(sound.output).connect(audioContext.destination);
player.start();
```

應用程式擁有 `AudioContext` 與播放節點。soundtrace.js 提供每個音源的空間節點與
主輸出。

## 更新與清理

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25] });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);

sound.dispose();
await audioContext.close();
```

## 材質預設

網格接受材質名稱或索引。預設材質表共 22 種，名稱透過下列 10 個 canonical name 解析。

| Canonical name | 可辨識別名（部分） |
|---|---|
| `concrete` | cement、beton、pavement、sidewalk |
| `wood` | plank、timber、oak、pine、bamboo |
| `glass` | window、mirror、crystal |
| `metal` | steel、iron、aluminum、copper、brass |
| `brick` | tile、ceramic、terracotta |
| `fabric` | cloth、textile、carpet、curtain |
| `plastic` | rubber、vinyl、pvc |
| `water` | liquid、pool |
| `grass` | vegetation、leaves、lawn |
| `sand` | dirt、gravel、soil、mud |

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',   // metal 的別名
});
```

:::warning
表中不存在的名稱不會擲出例外，而是靜默回退到預設材質（索引 `0`、`concrete`）。
即使拼錯仍會發聲，因此要確認材質是否如預期套用，請使用上表中的名稱。
:::

請先使用隨套件提供的預設；只有在確實需要自訂聲學材質時，才直接編輯 8 頻段的
reflection/absorption/transmission 數值。

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 沒有聲音 | 在使用者手勢中先呼叫 `AudioContext.resume()` |
| MT 啟動失敗 | 檢查 COOP/COEP、SharedArrayBuffer 與 `crossOriginIsolated` |
| GPU 未啟用 | 檢查 `navigator.gpu` 與硬體加速；CPU 回退是有效狀態 |
| 方向被鏡像 | 檢查渲染器對應的 `coordinateBasis` |
| 材質似乎沒有作用 | 對照上面的 canonical name／別名表檢查名稱；未知名稱會回退到預設材質 |
| core/資源回傳 404 | 檢查打包工具是否對該套件做了預先打包，以及 `coreBaseUrl`、`assetBaseUrl` 是否正確 |
| 效能較低 | 深入調校前先降低品質預設並關閉路徑視覺化 |

## 下一步

- [SDK 概覽](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
