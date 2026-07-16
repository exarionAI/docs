---
title: Web
description: 安裝 soundtrace.js WebAssembly SDK，並使用 HRTF 模式、品質預設、CPU/MT/WebGPU 後端與官方整合示範。
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# Web SDK

**soundtrace.js** 是在瀏覽器中使用 [STCoreV2](../core/stcorev2.md) 的
TypeScript/WebAssembly SDK。它將渲染場景中的網格、材質、音源與聆聽者連接到
Sound Tracing 場景，並向 Web Audio 圖提供空間音訊輸出。

## 目前 SDK 重點

| 項目 | 建議流程 |
|---|---|
| HRTF | 輕量路徑使用 `Band8`，測量型方向渲染使用 `Parametric` |
| 後端 | 選擇 `Single Thread`、`Multi Thread` 或 `WebGPU` |
| 品質 | 選擇 `Fast`、`Balanced` 或 `Quality` 預設 |
| 材質 | 使用 `Concrete`、`Steel`、`Marble`、`Snow`、`Soil` 等預設 |
| 底層參數 | 讓預設統一管理射線解析度、深度與渲染預算 |

## Web 示範

內嵌示範來自
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing) 的最新建置，
在一個應用程式中包含三個場景。

| 場景 | 示範內容 |
|---|---|
| Capability | WebAssembly、AudioWorklet、SharedArrayBuffer 與 WebGPU 支援 |
| Shoebox | 音源／聆聽者移動、材質、反射路徑與品質預設 |
| Multiroom | 多音源、門、遮蔽與房間之間的傳播 |

<iframe
  title="Sound-tracing.js 整合示範"
  src={useSharedStaticUrl('/demos/three-basic/')}
  style={{width: '100%', height: '576px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

使用頂端導覽切換場景。評估空間音訊時，建議使用耳機與較新的 Chrome。

## 需求

- Node.js 20 或更新版本
- 支援 Web Audio API 與 AudioWorklet 的現代瀏覽器
- `Multi Thread` 需要 COOP/COEP 與 `crossOriginIsolated === true`
- `WebGPU` 需要提供 `navigator.gpu` 的瀏覽器與 GPU
- 已授權的 SDK 發行包

## 安裝授權 SDK

評估版與授權版可能以 ZIP 形式提供。官方示範使用以下目錄約定：

```text
your-project/
└─ vendor/
   └─ sound-tracing/
      └─ sdk/
         ├─ index.js
         ├─ core/
         │  ├─ st/
         │  └─ mt/
         └─ assets/
```

將 ZIP 根目錄中的 `sdk/` 精確放置到
`vendor/sound-tracing/sdk/`。不使用 `.env.local`。開發時，儲存庫內的執行階段
資訊清單會解析：

```text
/vendor-runtime/sound-tracing/sdk/index.js
```

Vite 開發服務與正式環境複製規則以儲存庫中的
[`vite.config.ts`](https://github.com/exarionAI/Sound-tracing/blob/dev/vite.config.ts)
為準。

## 快速開始

請在使用者點擊或觸控事件處理函式中執行。

```ts
const { SoundTrace } = await import(
  '/vendor-runtime/sound-tracing/sdk/index.js'
);

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

### Band8

`Band8` 是不需要外部 HRTF 表的輕量渲染路徑。如果不呼叫 `loadHrtf()`，
核心會使用此路徑。

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
});
```

### Parametric

明確載入精簡的 KU100 測量型參數表。

```ts
await sound.loadHrtf('parametric');
```

主要產品指南僅公開 `Band8` 與 `Parametric`。SDK 還包含進階 HRIR 載入器，
但應先驗證目標平台上的資源大小與渲染成本，再決定是否導入。

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

為網格指定材質名稱或索引。

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',
});
```

優先使用內建預設。直接編輯 8 頻段的反射、吸收與透射值屬於自訂聲學材質的進階流程。

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 沒有聲音 | 在使用者手勢中先呼叫 `AudioContext.resume()` |
| MT 啟動失敗 | 檢查 COOP/COEP、SharedArrayBuffer 與 `crossOriginIsolated` |
| GPU 未啟用 | 檢查 `navigator.gpu` 與硬體加速；CPU 回退是有效狀態 |
| 方向被鏡像 | 檢查渲染器對應的 `coordinateBasis` |
| SDK 入口回傳 404 | 檢查 `vendor/sound-tracing/sdk/index.js` 與執行階段資訊清單 |
| 效能較低 | 深入調校前先降低品質預設並關閉路徑視覺化 |

## 下一步

- [SDK 概覽](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
- [示範](../demos/overview.md)
