---
title: Facade API
description: 在 ST 與 MT 上用法一致的 soundtrace.js 建議 API。
---

# Facade API

Facade 是一般 Web 應用的建議入口。`SoundTrace` 管理場景生命週期，`Listener`、
`Source`、`Mesh` 表示應用的 3D 狀態。

[Web SDK 概覽](../web.md) · [Native API](./native.md)

## 基本流程

```ts
const sound = await SoundTrace.create(audioContext, options);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

const spatial = await source.play(inputNode);
spatial.connect(sound.output).connect(audioContext.destination);

await sound.update(0);
```

這套呼叫流程在 ST 與 worker-hosted MT 上完全相同。在 MT 上請使用
`debugSnapshot()` 這類非同步回讀，而非同步的 native getter。

## `SoundTrace` 選項

| 選項 | 預設值 | 說明 |
|---|---|---|
| `mode` | 未指定 | `'single_thread'`、`'multi_thread'`、`'gpu'` 其中之一 |
| `thread` | `'auto'` | 進階 WASM 選擇：`'auto'`、`'st'`、`'mt'`；`mode` 優先 |
| `quality` | `'balanced'` | `'fast'`、`'balanced'`、`'quality'` |
| `throughput` | 未指定 | MT worker 預算：`'low'`、`'medium'`、`'max'` |
| `coordinateBasis` | core 座標系 | 將渲染器座標系轉換為 SDK 座標系 |
| `coreBaseUrl` | 套件內 | 包含 `st/`、`mt/` 的 core URL |
| `assetBaseUrl` | 套件內 | 材質與 HRTF 資源的 URL |
| `propagationThreadCount` | 引擎預設 | MT propagation 執行緒數的低階 override |
| `defaultMeshBuild` | 引擎預設 | `addMesh()` 使用的預設 BVH build 選項 |
| `sceneRatio` | `1.0` | 每個場景長度單位對應的公尺數。不要與預先縮放的幾何體混用（會重複縮放） |
| `autoLoadMaterials` | `true` | 載入預設材質，啟用以名稱對應 |
| `transmissionModel` | `'surface'` | 直達音穿過材質時的能量衰減模型，參見[材質穿透模型](#材質穿透模型) |
| `debug` | `false` | 輸出初始化診斷記錄 |

Three.js 的相機朝向 `-Z`，因此可以從下列 basis 開始。

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
```

## 主要 API

### `SoundTrace`

| API | 說明 |
|---|---|
| `SoundTrace.create(ctx, options?)` | 建立並載入引擎（建構式 + `load()`） |
| `output` / `audioContext` | master output 節點與應用傳入的 `AudioContext` |
| `listener` | 場景中唯一的聽者 |
| `addMesh(options)` | 新增聲學幾何體 |
| `removeMesh(mesh)` | 移除幾何體 |
| `addSource(options)` | 新增空間音源 |
| `setQuality(tier)` | 變更品質預設 |
| `setAudioOption(options)` | 覆寫區塊大小與輸出聲道 |
| `loadHrtf(mode, source?)` | 載入隨套件或自訂的 HRTF |
| `loadMaterialAssets()` | 手動載入材質表（`autoLoadMaterials: false` 時） |
| `enableGpu()` | 啟用 WebGPU 傳播並回傳是否成功；不支援時回傳 `false` 並維持 CPU |
| `update(dt?)` | 更新場景並執行 propagation |
| `debugSnapshot(options?)` | 相容 MT 的非同步診斷快照 |
| `getStatistics(options?)` | valid path、ray 與記憶體統計（async） |
| `getGpuStats()` | GPU dispatch/fallback 計數（async） |
| `getIRs()` | 最近一次 propagation 各 path 的脈衝響應（async） |
| `renderMonoImpulseResponse(source, sec)` | 離線 mono IR 渲染，僅在輸出聲道為 1 時使用 |
| `reset()` | 重設引擎狀態（async） |
| `dispose()` | 釋放 SDK 擁有的資源。冪等，可搭配 `using` |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: [0, 0, 0, 1] })
  .setRenderOptions({ hrtfQuality: 'medium' });
```

場景中只有一個 listener。它由 `SoundTrace` 擁有，因此不需要另外 dispose。

用 `setOutputMode()` 切換輸出渲染器。預設的 `'hrtf'` 是雙耳渲染器，`'speaker'`
則選擇內部的 Ambisonic 喇叭渲染器（1ch/2ch）。HRTF 模式與已載入的 HRTF 表僅對
`'hrtf'` 輸出生效。

```ts
sound.listener.setOutputMode('speaker');
```

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: {
    direct: true,
    reflection: true,
    diffraction: true,
    reverberation: true,
  },
});

source.setPose({ position: [1, 1, -2] });
source.setGain(0.8);
source.setPathEnabled('reverberation', false);
```

`play(input, channels?)` 會回傳已接上輸入的 `AudioWorkletNode`。輸出由應用連接到
`sound.output` 或其他 Web Audio graph。

#### 距離衰減

`addSource()` 會對全部 5 種 path 套用預設衰減係數
`{ constant: 1, linear: 0, quadratic: 1 }`。

```text
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

也就是說預設曲線為 `1 / (1 + distance²)`。`constant = 1` 可避免距離接近 0 時增益
發散，`quadratic = 1` 則提供接近平方反比的衰減。

#### 指向性

若要讓音源具指向性，需註冊依角度的頻段衰減表並啟用。

```ts
source.setDirection([0, 0, -1]);
source.setDirectivityTable(anglesDeg, attenDbPerBand);
source.setDirectivityEnabled(true);
```

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

當整個網格使用同一種材質時，`indices` 很方便。若需要逐面材質，請改為傳入
`{ a, b, c, materialIndex }` 形式的 `triangles`。

建立之後仍可變更材質與更新策略。

| API | 說明 |
|---|---|
| `setMaterial(material)` | 替換整個網格的材質 |
| `setMaterialRange(triStart, triCount, material)` | 依三角形範圍替換材質 |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`、`'refit'`、`'rebuild'`、`'dynamic'` |
| `setPose(pose)` | 更新 position、orientation、scale |
| `dispose()` | 釋放網格與 collider |

不會移動的牆面使用 `'static'`，只有頂點變化的幾何體使用 `'refit'`，拓撲改變時使用
`'rebuild'`。

## 材質穿透模型

`transmissionModel` 決定直達音穿過牆面等材質時如何損失能量。

| 值 | 行為 |
|---|---|
| `'surface'`（預設） | 每穿過一個表面就套用一次材質的穿透係數，與牆面厚度無關 |
| `'solid'` | 考慮厚度：依 ray 在 solid 內部行進的距離，套用材質各頻段的厚度，越厚的牆阻隔越強 |

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  transmissionModel: 'solid',
});
```

`'solid'` 只會切換有標註厚度的材質，沒有厚度的材質維持 `'surface'` 行為。在預設
材質表中，22 種材質裡有 15 種帶有厚度。

:::warning
這是 opt-in 選項 —— 它會改變牆後音源的音量，因此若需維持既有場景的聲音，請保留
預設值。
:::

## 傳播 path cache

每個工作階段啟動時 propagation path cache 都是**開啟**的（固定 seed，大小 512）。
它在 ST 與 MT 上都會於第一個 frame 之前生效，`reset()` 之後也會重新套用，因此不
需要呼叫任何 API 來開啟。

## Frame 更新

pose 變更可以快速記錄，但同一時間只保持一個 propagation update 在執行較為安全。

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => {
      updateInFlight = undefined;
    });
  }
}
```

## 生命週期

`SoundTrace`、`Source`、`Mesh` 都支援 `dispose()`。`SoundTrace.dispose()` 會清理
包含 listener 在內的所有 SDK 擁有資源，且可安全地多次呼叫。

```ts
source.dispose();
mesh.dispose();
sound.dispose();
```

## 相關文件

- [Web SDK 概覽](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
