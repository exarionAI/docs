---
title: Web
description: soundtrace.js 1.1.0 — SimpleST ABI 6 WebAssembly SDK 的安裝、部署需求、HRTF、品質預設、材質、EQ 與疑難排解。
---

# Web SDK

**soundtrace.js** 是在瀏覽器中使用 [SimpleST](../core/simplest.md) 的 TypeScript/WebAssembly SDK。
它將 Three.js 之類渲染場景中的網格、材質、音源與聆聽者連接到 Sound Tracing 場景，
並向 Web Audio graph 提供空間化的立體聲輸出。

自 1.0.0 起，引擎從 STCoreV2 換成 SimpleST，1.1.0 使用 **SimpleST 2.22.0 / ABI 6**
（SDK 發行版 2.22.0-jhj.5。前一 SDK 發行版 2.18.2-jhj.7 為同一個 1.1.0 使用 SimpleST 2.18.2，1.0.0 = SimpleST 2.12.0）。
本次發行套件版本維持不變，加入了[音源 EQ 與輸出 EQ](#eq)（`source.setEq`、`sound.setOutputEq`），
聆聽者 `orientation` 四元數的頭部傾斜（roll）也會傳遞到引擎（以前只有 yaw/pitch）。2.18.2 SDK 加入了 `maxSources`
選項（音源數上限）。既有的呼叫端不需變更。`SoundTrace`、`Source`、`Mesh`、`Listener` facade 維持不變，但相較於 STCoreV2，
後端、HRTF、材質與選項契約都已改變。
完整選項與實體 API 請見 [Facade API](./web/facade.md)，低階 SimpleST 模組存取請見
[Native API](./web/native.md)。

![soundtrace.js 結構](/img/web/architecture.png)

## 目前 SDK 重點

| 項目 | 目前行為 |
|---|---|
| 引擎 | SimpleST Realtime（pthreads WASM）+ Offline（單執行緒，僅供 IR 分析） |
| 執行模式 | `single_thread`（同步傳播）/ `multi_thread`（管線傳播）。**兩者都使用專用 Worker + pthread WASM** |
| 早期反射 | 永遠是 **Hybrid**。渲染啟動、HRTF 變更、reset 之後都會重新套用 |
| HRTF | 內建 MIT KEMAR（`'mit-kemar'`）、隨附 SADIE II D2（`'sadie-d2'`） |
| 品質 | `fast` / `balanced` / `quality` — 同時設定聆聽者與音源的射線格網及反射深度 |
| 材質 | 9 頻段（63 Hz ~ 16 kHz）SoundTrace 遊戲材質 22 種，以名稱、別名或索引指定 |
| 輸出 | 每個音源為單聲道輸入，聆聽者渲染器混出一路立體聲（`sound.output`） |
| 音源上限 | 預設 32 個音源 · 音源記憶體 64 MiB · 延遲環上限 0.5 s。音源數以 `maxSources` 選項變更 — [音源記憶體預算](../core/simplest.md#音源記憶體預算) |
| EQ | 逐音源的音源 EQ 與全域輸出 EQ，參數式最多 16 頻段 — [EQ](#eq) |
| GPU | 無。`mode: 'gpu'`、`enableGpu()` 會出錯 |

## 需求

- Node.js 20 以上（建置工具），建議使用最新的 Chromium 系瀏覽器
- HTTPS 或 localhost
- AudioWorklet、SharedArrayBuffer、**cross-origin isolation** — ST/MT 都需要
  （沒有非隔離的回退）
- 已授權的 SDK 發布物（vendor ZIP 或 npm tgz）

## 安裝

`soundtrace.js` 是依授權合約提供的非公開套件 `@exarionai/soundtrace.js`。
發布物有兩種形式。

| 形式 | 檔案 | 安裝 |
|---|---|---|
| vendor 樹 | `soundtrace-js-release-vendor.zip`（根目錄 `sdk/`） | 解壓到靜態路徑後提供服務。隨附的 `install.py` 會在驗證雜湊後安裝到 `vendor/sound-tracing/sdk` |
| npm 套件 | `exarionai-soundtrace.js-1.1.0.tgz` | `npm install /absolute/path/exarionai-soundtrace.js-1.1.0.tgz` |

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

套件同時包含 WASM 核心（`core/SimpleSTRealtime.mjs/.wasm`、`core/SimpleSTOffline.mjs`）與材質、HRTF
資源，並於執行期 fetch。若打包工具對這段模組圖做預先打包，Worker 與 WASM 載入會失效，
因此在 Vite 中要將它排除在預先打包之外，改以靜態 vendor 樹提供。

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

若自行託管核心與資源，以 `coreBaseUrl`、`assetBaseUrl` 選項指定 URL。
`.mjs` 請以 JavaScript、`.wasm` 請以 `application/wasm` MIME 提供服務。

### 部署標頭

頁面回應與 **Worker 指令碼的回應** 都必須帶有下列標頭。

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## 快速開始

下列程式碼必須在使用者點擊或觸控事件內執行。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',              // 'st' = 同步傳播，'mt' = 管線傳播（建議）
  quality: 'balanced',
  earlyReflectionMode: 'hybrid',
  coordinateBasis: {         // Three.js：相機看向 -Z
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
sound.output.connect(audioContext.destination);

const room = sound.addMesh({ vertices, indices, material: 'concrete' });
const source = sound.addSource({ position: [2, 1.5, -1], gain: 1 });
sound.listener.setPose({ position: [0, 1.7, 0] });

const player = audioContext.createBufferSource();
player.buffer = decodedMonoBuffer;
player.loop = true;
await source.play(player);     // 輸入擷取節點。輸出為靜音 — 聲音從 sound.output 發出
await sound.update(0);
player.start();
```

SimpleST 的座標系與 Unity 相同，為 `+Z` 向前。像 Three.js 這類看向 `-Z` 的渲染器必須傳入上述
`coordinateBasis`，左右與前後才會正確。

## 執行模式

| 選項 | 傳播 | 說明 |
|---|---|---|
| `thread: 'st'` / `mode: 'single_thread'` | 同步（SYNCHRONOUS） | `update()` 在傳播完成後才返回。預設計算預算 1 |
| `thread: 'mt'` / `mode: 'multi_thread'` | 管線（PIPELINED） | Direct / Reflection-Diffraction / Reverb lane 在 worker 中獨立執行。預設預算 3 |

兩種模式都由專用 Worker 擁有引擎工作階段並使用相同的 pthread WASM。發布的 pthread
pool 為 5，`propagationThreadCount` 為 1 ~ 5。主執行緒只保留 UI 與 Web Audio graph；
位置更新經由共享記憶體 lane 傳遞，建立／刪除／材質變更則經由保證順序的命令路徑傳遞。

## 選擇 HRTF

| 呼叫 | 表 | 額外資源 |
|---|---|---|
| （不呼叫） | 內建 MIT KEMAR（SDK 預設值）。`setOutputMode('speaker')` 切換為立體聲 panning | 無 |
| `loadHrtf('mit-kemar')` 或 `'convolution'` | 引擎內建 MIT KEMAR 128 tap | 無 |
| `loadHrtf('sadie-d2')` 或 `'steamaudio'` | SADIE II D2 KEMAR 8,802 個方向 256 tap | `SADIE_D2_44K_16bit_256tap.hrtfbin` |

舊的 KU100 parametric / convolution / SADIE H12 表與 `Band8` 模式已不存在。
`loadHrtf('parametric')` 會出錯。

```ts
await sound.loadHrtf('sadie-d2');
sound.listener.setOutputMode('speaker');   // 'hrtf'（預設）| 'speaker'（立體聲 panning）
```

## 品質預設

| 預設 | 聆聽者 guide ray | 音源 transport ray | 反射深度 | 用途 |
|---|---|---|---|---|
| `fast` | `8 × 8` | `8 × 8` | 4 | 行動裝置、大量同時音源 |
| `balanced`（預設） | `16 × 16` | `16 × 16` | 6 | 桌機基本設定 |
| `quality` | `24 × 24` | `24 × 24` | 8 | 品質優先的示範 |

```ts
sound.setQuality('quality');
```

`'speed'`、`'middle'` 分別是 `fast`、`balanced` 的即將棄用別名。遇到效能問題時，
在調整個別射線數之前，先依 `quality → balanced → fast` 的順序降低。

## 材質

網格可指定材質名稱、別名或索引。預設表為 SoundTrace 遊戲材質 22 種，與 Unity SDK 使用同一張表、
同一組索引。這些是遊戲用預設，並非量測資料，所有值都是 9 頻段 R/A/T/scattering。轉換方式：保留原
8 頻段（63 Hz ~ 8 kHz）的反射 R 與穿透 T，吸收 A = 1 − R − T，16 kHz 頻段重複 8 kHz 的值，
scattering 在 9 個頻段取相同值。

名稱與別名不區分大小寫。材質名稱保留原始拼寫（`Sherdded-woodFiberborad`）。

| 索引 | 材質名稱 | 別名 |
|---:|---|---|
| 0 | `Concrete` | `cement`、`콘크리트` |
| 1 | `Fabric` | `cloth`、`carpet`、`curtain`、`천`、`카펫` |
| 2 | `Wood` | `timber`、`나무`、`목재` |
| 3 | `Brick` | `bricks`、`벽돌` |
| 4 | `ConcreteBlock` | `concrete block`、`cinder block`、`블록` |
| 5 | `Glass` | `window`、`유리`、`창문` |
| 6 | `Gravel` | `자갈` |
| 7 | `GypsumBoard` | `gypsum`、`drywall`、`석고보드` |
| 8 | `Linoleum,RubberOrAsphaltTile` | `linoleum`、`rubber`、`tile`、`vinyl`、`리놀륨`、`고무` |
| 9 | `Marble` | `대리석` |
| 10 | `Plaster` | `회반죽`、`플라스터` |
| 11 | `Plywood` | `합판` |
| 12 | `Sherdded-woodFiberborad` | `shreddedWoodFiberboard`、`woodFiberboard`、`fiberboard`、`목모보드` |
| 13 | `Snow` | `눈` |
| 14 | `Soil` | `dirt`、`earth`、`ground`、`흙` |
| 15 | `Steel` | `metal`、`iron`、`철`、`금속` |
| 16 | `Stone` | `rock`、`돌` |
| 17 | `WaterSurface` | `water`、`물` |
| 18 | `TunableAbsorber` | `absorber` |
| 19 | `LowVarianceTarget` | — |
| 20 | `ConcreteBlockPainted` | `painted concrete block` |
| 21 | `FiberglassReinforcedPlastic` | `fiberglass`、`frp` |

別名以套件的 `assets/soundMaterialAlias.json` 為準，材質數值在 `assets/soundMaterial.json`。

```ts
sound.addMesh({ vertices, indices, material: 'GypsumBoard' });
sound.addMesh({ vertices, indices, material: '유리' });   // → Glass (5)
```

:::warning
不在表中的名稱不會擲出例外，而是靜默替換為預設材質（`defaultMaterialType = 0`，`Concrete`）。
舊文件中的 `BRAS_*` 名稱已不在表中，因此也會變成 `Concrete`。要確認材質如預期套用，請精確使用
上述名稱或別名。
:::

要自行定義材質，請傳入四組各 9 個值，且每個頻段滿足 `R + A + T = 1`（容許誤差 0.001）。
陣列長度不是 9 時會回報錯誤。

## 連接 Web Audio

```ts
const node = await source.play(player);  // AudioWorkletNode：供輸入擷取，輸出靜音
sound.output.connect(audioContext.destination);
```

`soundtrace.js` 不會建立 `AudioContext`。應用程式擁有 context 與播放節點，SDK 提供逐音源的
**輸入擷取節點** 與一個 **聆聽者主輸出**（`sound.output`）。逐音源的輸出效果必須移到
`sound.output` 之後。

SDK 將輸出限幅器維持在 **關閉狀態**。SimpleST 2.18 在建立後會立即啟用 true-peak 限幅器（−1 dBTP，
137 樣本延遲），但 `sound.output` 之後的 Web Audio 主匯流排由應用程式擁有。需要引擎限幅器時，以
`sound.listener.setRenderOptions({ useLimiter: true })` 啟用 true-peak 限幅器。

基於相同理由，自 SimpleST 2.21 起引擎在建立後立即啟用的等響度補償（低頻 shelf 約 +7.2 dB @ 120 Hz，高頻 +1.8 dB）
也會在建立上下文後立即關閉（包含 `reset()`）。關閉後的輸出與引擎 2.20 位元相同，此設定不對外公開。

## EQ

自 SDK 發行版 2.22.0-jhj 起，可以在音源與輸出上套用 SimpleST 參數式 EQ。

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });

source.setEq(null);        // 移除音源 EQ
sound.setOutputEq(null);   // 關閉輸出 EQ
```

| API | 作用處 |
|---|---|
| `Source.setEq(eq \| null)` | 音源訊號，引擎分頻之前。該音源的直達、反射、繞射、殘響全部帶有相同音色。即時與片段輸入皆可。也會進入 `renderMonoImpulseResponse` 的離線壓力 IR（不在 `getIRs()` 的頻段能量中） |
| `SoundTrace.setOutputEq(eq \| null)` | 全域單一輸出 EQ，渲染末端（主增益之前）。`reset()` 後仍保留。不會進入離線分析 |

- `eq = { enabled = true, preampDb = 0 (−48 ~ +12), bands = [] (最多 16) }`
- `band = { type = 'peaking', enabled = true, frequencyHz = 1000 (20 ~ 20,000), gainDb = 0 (±24，僅 peaking 與 shelf), q = 0.7071 (0.1 ~ 30，shelf 由引擎限制為 3) }`
- `type` 為 `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'`（Web Audio
  `BiquadFilterType` 名稱，切除固定為 12 dB/oct）。
- 超出範圍的值會以 `RangeError` 拒絕，不會送出指令。`{ enabled: false }` 會保留頻段並直通。
- 未呼叫 EQ 時不會呼叫引擎 EQ，因此輸出與沒有 EQ 時位元相同。相同的值不會重複送出，
  變更的值由引擎以 20 ms 交叉淡化切換。
- 在不支援 EQ 的舊版核心上會指明引擎版本並失敗。已套用的輸出 EQ 位於 `debugSnapshot().simplest.output.eq`。

## 更新與清理

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25], orientation: camera.quaternion.toArray() });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);   // 回傳這一影格的有效路徑數

source.dispose();
sound.dispose();
await audioContext.close();
```

## 診斷與 IR 分析

```ts
const snap = await sound.debugSnapshot();
snap.simplest.timing;   // { propagationMs, directMs, reflectionDiffractionMs, reverbMs, irMs, renderMs }
snap.simplest.scene;    // { meshes, objects, sources, triangles }
snap.simplest.render;   // { blockSequence, activeSources, exactTaps, sendTaps, totalUs }

const irs = await sound.getIRs();                               // 9 頻段 early path IR
const h = await sound.renderMonoImpulseResponse(source, 2.0);   // 44.1 kHz 單聲道壓力 IR（最長 30 s）
```

IR 分析會在獨立的 Offline Worker 中複製場景後計算，因此即時輸出不會中斷。
`renderMonoImpulseResponse` 是壓力 IR，不是 HRTF/Hybrid 輸出的錄音。

## 示範

在公開示範儲存庫 [Sound-tracing](https://github.com/exarionAI/Sound-tracing) 可以執行 Shoebox room、
Multi-room occlusion、Runtime capability 範例。

![Shoebox room 示範](/img/web/demo-shoebox.png)

![Multi-room occlusion 示範](/img/web/demo-multiroom.png)

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 沒有聲音 | 是否先在使用者手勢內呼叫了 `AudioContext.resume()`，是否將 `sound.output` 連接到 destination |
| `SoundTrace.create` 因 cross-origin isolation 錯誤被拒絕 | 頁面與 Worker 回應的 COOP/COEP 標頭、`crossOriginIsolated === true`（ST 也需要） |
| `mode: 'gpu'` / `enableGpu()` 錯誤 | SimpleST Web 僅支援 CPU。移除該選項 |
| `transmissionModel: 'solid'`、`defaultMeshBuild`、`hrtfQuality` 等被拒絕 | STCoreV2 專用選項。參考 [Facade API](./web/facade.md) 的拒絕清單 |
| 方向聽起來相反 | 符合渲染器座標系的 `coordinateBasis`（`-Z` 向前時必要） |
| 材質似乎沒有生效 | 名稱是否存在於材質表或別名中（不存在時會替換為混凝土） |
| 核心／資源 404 | 打包工具的預先打包排除、`coreBaseUrl`、`assetBaseUrl`、`.wasm` MIME |
| 效能不足 | 降低品質預設並使用 `thread: 'mt'`，關閉路徑視覺化 |
| `setEq` / `setOutputEq` 擲出 `RangeError` | 頻率、增益、Q、前級增益範圍，頻段是否在 16 個以內 |

## 下一篇

- [Facade API](./web/facade.md) — 建立選項、場景／音源／網格 API、生命週期、被拒絕的舊選項
- [Native API](./web/native.md) — SimpleST 模組載入器與低階配接器
- [Performance Guide](./performance.md)
