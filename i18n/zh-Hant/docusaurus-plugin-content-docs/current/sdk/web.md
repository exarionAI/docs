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

包以 ESM 分發，公開 API 從 `soundtrace.js` 入口匯入。

```ts
import {
  SoundTrace,
  UpdateType,
  PathType,
  recommendedSTOption,
  type SoundMaterial,
  type Triangle,
} from 'soundtrace.js';
```

包中包含以下 runtime 檔案。

| 路徑 | 用途 |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/hrtf/hrtf.bytes` | default HRTF dataset |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |

當 bundler 需要 subpath asset URL 時，用 `new URL(..., import.meta.url)` 解析。

```ts
const hrtfUrl = new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url);
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## 快速開始

```ts
import {
  SoundTrace,
  recommendedSTOption,
  type Triangle,
  type SoundMaterial,
} from 'soundtrace.js';

// Run this inside a user click/tap handler.
const ctx = new AudioContext();
await ctx.resume();

const sound = await SoundTrace.create(ctx, { thread: 'mt' });

const listener = sound.createListener();
const source = sound.createSource();
const scene = sound.createScene().setListener(listener).addSource(source);

await listener.setHRTFFromUrl(
  new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url),
);

listener
  .setOption(recommendedSTOption())
  .setAudioOption({
    sampleRate: ctx.sampleRate,
    inputSampleCount: 128,
    outputChannels: 2,
  })
  .setOrientation([1, 0, 0, 0, 1, 0, 0, 0, -1])
  .setRayCount(16, 16)
  .setRayDepth(3)
  .setPosition(0, 0, 0);

source
  .setIntensity(1)
  .setDepth(3)
  .setRayCount(16, 16)
  .setPosition(2, 0, -1);

const material: SoundMaterial = {
  reflection:   [0.95, 0.95, 0.92, 0.88, 0.80, 0.70, 0.65, 0.60],
  absorption:   [0.05, 0.05, 0.08, 0.12, 0.20, 0.30, 0.35, 0.40],
  transmission: [0.01, 0.01, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001],
  scattering: 0.12,
  index: 0,
};
sound.materials.add(material);

const vertices = new Float32Array([
  -2, -1, -2,
   2, -1, -2,
   2, -1,  2,
  -2, -1,  2,
]);
const triangles: Triangle[] = [
  { a: 0, b: 1, c: 2, materialIndex: 0 },
  { a: 0, b: 2, c: 3, materialIndex: 0 },
];

const floor = sound.createCollider({
  vertices,
  triangles,
  bvhType: 0,
  bvhMaxDepth: 16,
  primPerLeaf: 4,
});
scene.addCollider(floor);

scene.update(0);

const spatialNode = await sound.createWorkletNode(listener, source, 2);
const buffer = await fetch('/audio/music.mp3')
  .then((r) => r.arrayBuffer())
  .then((b) => ctx.decodeAudioData(b));

const player = ctx.createBufferSource();
player.buffer = buffer;
player.loop = true;
player.connect(spatialNode).connect(sound.output).connect(ctx.destination);
player.start();
```

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
| Multi | `{ thread: 'mt' }` | 推荐。部署環境可使用 `SharedArrayBuffer` 與 COOP/COEP header 時 | WASM 直接在 `AudioWorkletProcessor` 中 render |
| Single | `{ thread: 'st' }` | 有 header 限制，或先驗證簡單 scene 時 | JS main thread block render 後傳给 worklet/ring 或 fallback |

MT 模式要求瀏覽器 `crossOriginIsolated === true`。請在 HTML 響應中設定以下 header。

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

## Scene 编写流程

1. 用 `SoundTrace.create(ctx, options)` 載入 WASM core。
2. 建立 `createScene()`, `createListener()`, `createSource()` 並加入 scene。listener 的基本模型是每個 scene 只有 1 個，因此使用 `scene.setListener(listener)`。
3. 用 `createCollider()` 或 `createColliderFromThree()` 建立 sound collider，並加入 scene。
4. 需要低層控制時，也可以直接建立 `createMesh()` 和 `createObject()`。
5. 每帧更新移動的 source、listener、collider。
6. 用 `scene.update(dt)` 一次執行 `tick(dt)` 和 `updatePropagation()`。
7. MT 中由 worklet render audio；ST 中可手動 pump `listener.render()` fallback。

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
| `createColliderFromThree(objectOrGeometry, opts?)` | 將 Three.js `Object3D`/`BufferGeometry` 轉為 sound collider |
| `createSource()` | 建立 `SoundSource` |
| `createListener()` | 建立 `SoundListener`；listener ID 也作為 renderer handle |
| `materials` | global material table wrapper |
| `propagator` | valid path、guide plane、profile 查詢 |
| `diagnostics` | version、memory trace、ray statistics 查詢 |
| `createWorkletNode(listener, source, channels = 2)` | 建立 MT 模式用 `AudioWorkletNode` |
| `reset()` | reset core state |
| `dispose()` | disconnect output node 並释放 WASM wrapper 引用 |

`SoundTraceOptions`:

| 字段 | 預設值 | 範圍/注意 |
|---|---:|---|
| `thread` | `'st'` | `'st'` 或 `'mt'`。實際服务推荐 MT |
| `coreBaseUrl` | package internal `./core` | 自托管時指定包含 `st/`, `mt/` 的目錄，例如 `./core` |

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
`Refit` 用在**將 skinned animation 作為 sound collider**的場景。這時 BVH 必须用 `LBVH` 建置。每帧只用 `mesh.updateVertices(vertices)` 更新 vertex buffer，將對應 object 標記為 `UpdateType.Refit`，然後執行 `scene.tick(dt)`。BLAS refit 與 TLAS refit 會在 `SoundScene::tick()` 内消费 update flag 後處理。
:::

:::info 需要 Rebuild 的情况
`SoundMesh.setData()` 會建立新的內部 BVH object。如果 object 已经挂在 scene 上，請在下一次 tick 前调用 `object.setUpdateType(UpdateType.Rebuild)`。`scene.tick(dt)` 會根據该 flag 處理 BLAS/TLAS rebuild。
:::

### `SoundMesh`

| API | 说明 |
|---|---|
| `setData(vertices, triangles, opts?)` | 重新建置 geometry 與 BVH |
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
| `bvhType` | `0` | `0` 或 `1` | `0 = HKDtree`, `1 = LBVH` |
| `bvhMaxDepth` | `24` | `1..32` | tree 最大深度。更深可能讓 leaf 更小，但會增加 build 成本 |
| `primPerLeaf` | `4` | `1..32` | 每個 leaf 的 primitive 數。较低會增加 node，较高會增加 leaf 内 triangle test |

BVH 選擇:

| 類型 | 值 | 用途 |
|---|---:|---|
| `HKDtree` | `0` | **靜態 sound collider**。如墙、房间、地板等 topology 和 vertex 固定的 mesh。目前引擎中它作為 `SBVH` 的替代存在 |
| `LBVH` | `1` | **動態/skinned collider 必選**。vertex 每帧變化且需要 scene tick refit 路徑的 mesh |

`SpatialBuilder` 中仍有 `SBVH`, `WBVH` 等名稱，但 Web SDK 的 `SoundMesh.setData()` 路徑只连接了 `HKDtree` 和 `LBVH`。不要傳其他值。

### `SoundCollider`

`SoundCollider` 是把 `SoundMesh` 和 `SoundObject` 綁在一起的上層 RAII 物件。對 Three.js 或 scene component 整合來說，它讓 mesh、object、scene 連接共享同一個生命週期。

| API | 说明 |
|---|---|
| `sound.createCollider(opts?)` | 從 `vertices`, `triangles` 和 BVH options 建立 collider |
| `sound.createColliderFromThree(objectOrGeometry, opts?)` | 從 Three.js `Object3D` 或 `BufferGeometry` 建立 collider |
| `scene.addCollider(collider)` | 將 collider object 加入 scene 並記錄連接狀態 |
| `scene.removeCollider(collider)` | 從 scene 移除並清除連接狀態 |
| `collider.rebuild(vertices, triangles, opts?)` | 調用 `mesh.setData(...)` 後把 object 標記為 `UpdateType.Rebuild` |
| `collider.refitVertices(vertices)` | 只更新 vertex，並把 object 標記為 `UpdateType.Refit` |
| `collider.dispose()` | 一起清理 scene 連接、object 和 mesh |

Three.js adapter 會讀取 `BufferGeometry.groups[].materialIndex` 和 `mesh.material` slot，轉換為 triangle 的 `materialIndex`。解析順序如下：

1. material 的 `userData.soundMaterialIndex` 或 `soundMaterialIndex`
2. `materialMap` 中的 slot 編號、`slot:N`、material `name`、`uuid`、`type`
3. 未匹配時使用 `defaultMaterialIndex`（預設 `0`）

靜態 collider 的預設 BVH 是 `HKDtree`；`dynamic: true` 或 skinned collider 的預設 BVH 是 `LBVH`。skinning animation 應保持 topology 不變，並在每帧調用 `collider.refitVertices(vertices)`。

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
| `setHRTFFromUrl(url)` | fetch 並應用 HRTF 檔案 |
| `setHRTFFromMemory(buffer)` | 直接應用 HRTF binary |
| `render(sourceID, input, output, channelCount)` | ST fallback manual render |
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
| `inputSampleCount` | MT `128`, ST `sampleRate / 100` 或 fallback `1024` | 引擎一次處理的 frame 數 |
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
| `sortIRDatas()` | 請求 IR data 排序 |
| `findAttenuationForDistance(...)` | 反算 target attenuation 對應 distance |
| `startBackgroundLoop(sceneID, intervalMs = 16)` | 在 MT WASM 的 engine pthread 上執行 tick + propagation |
| `stopBackgroundLoop()` | 停止 background loop |

Web 的 MT background loop 是為了瀏覽器 WASM 記憶體共享限制而提供的辅助 API。native SDK 保持调用方在自己的 thread/job system 中直接调用 `tick()` 和 `updatePropagation()` 的模型。

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
  title="soundtrace.js three.js static single-thread demo"
  src={useBaseUrl('/demos/three-basic/?thread=st')}
  style={{display: 'block', width: '85%', height: '540px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

runtime 和 demo 建置:

```bash
npm install

cd /Users/ethanjung/dev/soundtrace.js/STCoreV2/exaSound
./mainBuild.sh rebuild wasm release
./mainBuild.sh rebuild wasm release --use-thread

cd /Users/ethanjung/dev/soundtrace.js
npm run build

cd examples/three-basic
npm install
npm run build

cd /Users/ethanjung/dev/docs
rsync -a --delete --exclude '.DS_Store' \
  /Users/ethanjung/dev/soundtrace.js/examples/three-basic/dist/ \
  static/demos/three-basic/

npm run build
npm run serve
```

Vite dev server 預設設定 COOP/COEP header，因此也能確認 MT mode。檔案中嵌入的 iframe 固定為 `?thread=st`，以便在沒有 COOP/COEP header 的靜態托管中執行。

### 底部按鈕

| Control | 说明 |
|---|---|
| `Room` | 選擇整個 room collider 的 material |
| `Collider` | 選擇 static wall 與 Flair collider 的 material |
| `Thread` | 啟動前選擇 `Single` 或 `Multi`。如果 MT 不可用，會自動固定為 ST |
| `Start Audio` | 載入 WASM、material、HRTF、MP3 並啟動 audio。瀏覽器 autoplay policy 要求使用者點擊 |
| `Move` / `Stop` | 讓 source 沿 room 内椭圆路徑移動，或停在目前位置 |
| `Wall: On/Off` | 向 scene 新增/移除 listener 附近的 static wall collider |
| `Flair: On/Off` | 向 scene 新增/移除 FBX skinned animation collider |

`Flair` 每帧采样 skinned vertex 並作為 sound collider 使用。该路徑用於展示 `LBVH + updateVertices + UpdateType.Refit` 组合。如果在 demo 中把 BVH type 改為 `HKDtree`，請把 Flair 視為基於 bind pose 的靜態檢查場景。

### lil-gui 面板

| Panel | Control | 说明 |
|---|---|---|
| `Listener` | `Ray Width`, `Ray Height` | listener guide ray resolution。demo range `1..32` |
| `Listener` | `Ray Depth` | max path depth。demo range `1..16`, default `7` |
| `Debug overlays` | `Show Valid Paths` | 顯示 propagation result polyline |
| `Debug overlays` | `Show FPS` | 顯示 Stats HUD |
| `Colliders · BVH` | `Type` | `HKDtree` 或 `LBVH` |
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
2. listener `Ray Width × Ray Height × Ray Depth` 只按需要提升。
3. static structure 使用 `HKDtree`，animation collider 使用 `LBVH`。
4. animation collider 保持 topology，只更新 vertex。
5. 如果 path 變化過快，提升 `Path Fade Time`；如果听到 delay pitch wobble，降低 `Max Delay Rate`。
6. valid path 與 BVH box overlay 只在调試時開啟。

three.js demo 按 **1 listener + 1 source** 設定，優先展示高質量和调試可见性。實際 app 中 gizmo 不是必需的。尤其绘制 valid path 和 BVH box 時，會把 WASM 內部資料複製到 JS 並重建為 Three.js geometry，因此會产生通訊和視覺化開销。建議只在開發中開啟，runtime 發布時關閉。

demo 是小場景，用於展示品質和視覺化，因此 listener 從 `32 × 32 × depth 7` 開始，source 從 `64 × 64 × depth 4` 開始。一般 app 的起始推薦仍是 `16 × 16 × depth 3`。

## 故障排除

| 症状 | 檢查項 |
|---|---|
| MT 載入失败 | 確認 HTML 響應包含 COOP/COEP，且 `crossOriginIsolated` 為 `true` |
| `createWorkletNode` error | 確認 `SoundTrace` 是用 `{ thread: 'mt' }` 建立 |
| 沒有聲音 | 確認在使用者點擊中调用 `ctx.resume()`，`soundMaterial.json` 已載入到 material table，且 absorption array 沒有误複製成與 reflection 相同 |
| 聽不到 reflection/diffraction/absorption 變化 | 沒有 sound collider 時，scene 主要只產生 direct sound。請加入已映射 geometry 和 sound material 的 collider |
| 感覺不到方向感 | 確認 HRTF asset (`hrtf.bytes`) 成功載入 |
| 影格率下降 | 降低 `Ray Depth`, `Ray Width`, `Ray Height`。runtime 起始推荐 `16 × 16 × depth 3` |
| mono input 无聲 | SDK 將 worklet node channel count 固定為 `2`, `explicit`, `speakers`。手動建立 node 時也要使用相同設定 |
| path gizmo 像残影 | 只使用 `getValidPaths()` 返回的實際 count |
| ray/path gizmo 不顯示 | 確認 scene 中已新增 sound collider object |
| animation collider 抖動 | 確認流程為 `LBVH`, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, `scene.tick()` |
| 修改 BVH option 後 crash | `mesh.setData()` 後，把 object 標記為 `UpdateType.Rebuild` 並執行 `scene.tick()` |

### FAQ: 聲音只從一側播放

本節面向 `soundtrace.js` 模組使用者，尤其是把 SDK 接入現有 Web Audio app，或為新
web app 建構 audio graph 時遇到的問題。典型症狀是：有聲音，但偏向一側；
HRTF/空間音訊感覺不明顯；移動 source 時方向變化也很弱。

這個問題通常不是 STCoreV2 core 本身，而是初始化順序、HRTF 載入檢查遺漏，或 app 端
channel routing 引起的。示範和最近的修復中，下面這些點最關鍵。

實作時最容易遺漏的是下面幾點。

- `soundtrace.js` 的 real-time HRTF 輸出不是硬體 5.1/7.1 bus，而是 `2` channel binaural/stereo render target。即使實作 speaker layout，每個 speaker 也是 virtual source，最終輸出仍會混合為 stereo。
- 如果手動建立 `AudioWorkletNode`，但省略 `outputChannelCount: [2]`，1-output/1-input worklet 的初始 channel count 可能是 `1`。SDK 的 `createWorkletNode()` 會固定 `channelCount = 2`、`channelCountMode = 'explicit'`、`channelInterpretation = 'speakers'` 來避免這個問題。
- 在 ST fallback 中直接呼叫 `listener.render()` 時，`channelCount` 必須是 `2`，輸入 buffer 長度必須是 `frames * 2` 的 interleaved sample 數。只傳 frame 數或 mono buffer 會違反 engine 的 mono-mix/render-buffer 契約。
- 在建立多個 virtual speaker source 的 app 中，不要假設瀏覽器會自動按 speaker 分配 channel。app 必須為每個 source 明確設定 left/right/mix routing。

檢查清單:

1. **確認正在使用 SDK wrapper。** 不要只手動載入 WASM 檔案。應從 `soundtrace.js` 模組匯入 `SoundTrace`、`SoundListener`、`createWorkletNode`、`recommendedSTOption`、`PathType` 等 API。
2. **在使用者點擊中立即呼叫 `AudioContext.resume()`。** 如果等 WASM、HRTF、audio fetch 之後才呼叫 `resume()`，瀏覽器 autoplay policy 可能讓 context 一直保持 `suspended`。參考示範，在 click handler 前半段建立 `const resumeP = ctx.resume()`，最後再 `await resumeP`。
3. **必須檢查 HRTF 載入結果。** 呼叫 `listener.setHRTFFromUrl(...)` 或 `setHRTFFromMemory(...)` 後，如果結果是 `false`，不要繼續播放。同時記錄 `hrtf.bytes` 在 bundler 或 static host 中是否真的可存取。
4. **listener audio option 要匹配真實 context。** `sampleRate` 使用 `ctx.sampleRate`，目前 real-time HRTF path 的 `outputChannels` 使用 `2`。MT worklet 的 `inputSampleCount` 使用 `128`；ST fallback 則要與 app 的 render block size 一致。
5. **從示範的 listener option/orientation 開始。** 使用 `listener.setOption(recommendedSTOption())`、`listener.setOrientation([1, 0, 0, 0, 1, 0, 0, 0, -1])`、`listener.setPosition(...)`。如果改變 three.js 座標基準，source position/direction 也要按同一基準更新。
6. **先設定 material table 和 collider。** 把 `soundMaterial.json` 加入 material table，並在 scene 中新增 sound collider 後再連接 listener/source。沒有 collider 時主要是 direct sound，空間變化會比較弱。
7. **custom Web Audio graph 中明確設定 stereo。** SDK 的 `createWorkletNode()` 會設定 `channelCount = 2`、`channelCountMode = 'explicit'`、`channelInterpretation = 'speakers'`。如果手動建立 node，或組合獨立 graph，也要給 input hub、splitter、merger、worklet/input node 設定相同選項。
8. **用多個 sound source 實作 speaker layout 時，明確 routing channel。** 不要把同一個 stereo input 隱式連接到所有 source。例如 `L/LS/SL/BL` 系 source 接收 left channel 並複製到左右 input frame，`R/RS/SR/BR` 系 source 接收 right channel，`C/LFE/Mono` 使用 `(L + R) * 0.5` mono mix。
9. **重新播放前完整清理 graph。** 斷開舊的 `MediaElementAudioSourceNode`、`AudioBufferSourceNode`、splitter、merger 和 gain node，再建立新的 source graph，只把 soundtrace output 接到 master/destination。
10. **第一個 audio block 前預熱 propagation。** listener、source、collider 設定完成後，呼叫一次 `scene.tick(0)` 和 `scene.updatePropagation()`，準備初始 path state。

因此在判斷 SDK core 有問題前，先檢查 HRTF load、AudioContext resume timing、
audio option、channel routing 和 graph lifecycle。

## 參考

- [SDK 概覽](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [示範](../demos/overview.md)
