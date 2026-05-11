---
title: Web
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# Web SDK

**soundtrace.js** 是用于在浏览器中使用 [STCoreV2](../core/stcorev2.md) 的 TypeScript/WebAssembly 绑定。它像标准 `AudioNode` 一样连接到应用拥有的 `AudioContext`，并把 Three.js 等渲染场景中的 mesh、material、source、listener 状态反映到实时声学传播中。

## 何时使用

| 用途 | 说明 |
|---|---|
| Three.js/WebGL 应用 | 将视觉场景中的 collider 和 material 直接传入声学场景 |
| 浏览器游戏/模拟器 | 随 source 和 listener 移动更新 reflection、diffraction、transmission 路径 |
| Web Audio graph | 通过 `AudioWorkletNode` 空间化 MP3、streaming 或 microphone 输入 |
| 调试与可视化 | 从 JavaScript 查询 valid path、BVH leaf box、ray/path 统计 |

## 安装与构件

包以 ESM 分发，公开 API 从 `soundtrace.js` 入口导入。

```ts
import {
  SoundTrace,
  UpdateType,
  PathType,
  defaultSTOption,
  type SoundMaterial,
  type Triangle,
} from 'soundtrace.js';
```

包中包含以下 runtime 文件。

| 路径 | 用途 |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/hrtf/hrtf.bytes` | default HRTF dataset |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |
| `soundtrace.js/assets/soundMaterialAlias.json` | app layer 自动 mapping 用 alias table |

:::info 分发内容
SDK 分发包不包含 `STCoreV2` 子模块或 C++ 完整源码。浏览器 runtime 只提供编译后的 `exaSound.js`/`exaSound.wasm` binary、TypeScript wrapper、HRTF 和 material asset。
:::

当 bundler 需要 subpath asset URL 时，用 `new URL(..., import.meta.url)` 解析。

```ts
const hrtfUrl = new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url);
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## 快速开始

```ts
import {
  SoundTrace,
  UpdateType,
  defaultSTOption,
  type Triangle,
  type SoundMaterial,
} from 'soundtrace.js';

// Run this inside a user click/tap handler.
const ctx = new AudioContext();
await ctx.resume();

const sound = await SoundTrace.create(ctx, { thread: 'mt' });

const listener = sound.createListener();
const source = sound.createSource();
const scene = sound.createScene().addListener(listener).addSource(source);

await listener.setHRTFFromUrl(
  new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url),
);

listener
  .setOption(defaultSTOption())
  .setAudioOption({
    sampleRate: ctx.sampleRate,
    inputSampleCount: 128,
    outputChannels: 2,
  })
  .setOrientation([1, 0, 0, 0, 1, 0, 0, 0, -1])
  .setRayCount(32, 32)
  .setRayDepth(7)
  .setPosition(0, 0, 0);

source
  .setIntensity(1)
  .setDepth(4)
  .setRayCount(64, 64)
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

const mesh = sound.createMesh();
mesh.setData(vertices, triangles, { bvhType: 0, bvhMaxDepth: 16, primPerLeaf: 4 });

const floor = sound.createObject().setMesh(mesh.id);
floor.setUpdateType(UpdateType.Rebuild);
scene.addObject(floor);

scene.tick(0);
scene.updatePropagation();

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

## Runtime 结构

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

`soundtrace.js` 不会自己创建 `AudioContext`。它接收由应用创建的 context，并返回 `AudioNode` 作为输出。因此在空间化前后可以自由插入 EQ、compressor、master volume 等普通 Web Audio node。

## 线程模式

| 模式 | 选择值 | 使用场景 | Audio path |
|---|---|---|---|
| Multi | `{ thread: 'mt' }` | 推荐。部署环境可使用 `SharedArrayBuffer` 与 COOP/COEP header 时 | WASM 直接在 `AudioWorkletProcessor` 中 render |
| Single | `{ thread: 'st' }` | 有 header 限制，或先验证简单 scene 时 | JS main thread block render 后传给 worklet/ring 或 fallback |

MT 模式要求浏览器 `crossOriginIsolated === true`。请在 HTML 响应中设置以下 header。

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

1. 用 `SoundTrace.create(ctx, options)` 加载 WASM core。
2. 创建 `createScene()`, `createListener()`, `createSource()` 并加入 scene。
3. 将 vertices、triangles、BVH options 传给 `createMesh()`。
4. 给 `createObject()` 指定 mesh ID 和 transform，并加入 scene。
5. 每帧更新移动的 source、listener、collider。
6. 用 `scene.tick(dt)` 和 `scene.updatePropagation()` 更新传播结果。
7. MT 中由 worklet render audio；ST 中可手动 pump `listener.render()` fallback。

## TypeScript API

### `SoundTrace`

| API | 说明 |
|---|---|
| `new SoundTrace(audioContext, options)` | 创建实例。使用前需要 `load()` |
| `SoundTrace.create(audioContext, options)` | 一次完成创建和 `load()` |
| `load()` | 加载 `st` 或 `mt` WASM，调用 `exaInit()` 并创建 `output` |
| `output` | master `GainNode` |
| `audioContext` | constructor 接收的 context |
| `createScene()` | 创建 `SoundScene` |
| `createObject()` | 创建 `SoundObject` |
| `createMesh()` | 创建 `SoundMesh` |
| `createSource()` | 创建 `SoundSource` |
| `createListener()` | 创建 `SoundListener`；listener ID 也作为 renderer handle |
| `materials` | global material table wrapper |
| `propagator` | valid path、guide plane、profile 查询 |
| `diagnostics` | version、memory trace、ray statistics 查询 |
| `createWorkletNode(listener, source, channels = 2)` | 创建 MT 模式用 `AudioWorkletNode` |
| `reset()` | reset core state |
| `dispose()` | disconnect output node 并释放 WASM wrapper 引用 |

`SoundTraceOptions`:

| 字段 | 默认值 | 范围/注意 |
|---|---:|---|
| `thread` | `'st'` | `'st'` 或 `'mt'`。实际服务推荐 MT |
| `coreBaseUrl` | package internal `./core` | 自托管时指定包含 `st/`, `mt/` 的目录，例如 `./core` |

### `SoundScene`

| API | 说明 |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | 管理 sound collider |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | 管理 source |
| `addListener(listener)`, `removeListener(listener)` | 管理 listener |
| `tick(dt)` | 消费 object update type，并更新 TLAS/BVH state |
| `updatePropagation()` | 执行 ray/path propagation |

### `SoundObject` 与 `UpdateType`

| 值 | 用途 |
|---|---|
| `UpdateType.Static` (`0`) | 默认。geometry 和 transform 不变化的静态 collider |
| `UpdateType.Refit` (`1`) | vertex 位置变化但 topology 相同。用于 skinned/animated collider |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()`、topology 变化、BVH option 变化、scene 添加/删除 |

:::warning Refit 使用规则
`Refit` 用在**将 skinned animation 作为 sound collider**的场景。这时 BVH 必须用 `LBVH` 构建。每帧只用 `mesh.updateVertices(vertices)` 更新 vertex buffer，将对应 object 标记为 `UpdateType.Refit`，然后运行 `scene.tick(dt)`。BLAS refit 与 TLAS refit 会在 `SoundScene::tick()` 内消费 update flag 后处理。
:::

:::info 需要 Rebuild 的情况
`SoundMesh.setData()` 会创建新的内部 BVH object。如果 object 已经挂在 scene 上，请在下一次 tick 前调用 `object.setUpdateType(UpdateType.Rebuild)`。`scene.tick(dt)` 会根据该 flag 处理 BLAS/TLAS rebuild。
:::

### `SoundMesh`

| API | 说明 |
|---|---|
| `setData(vertices, triangles, opts?)` | 重新构建 geometry 与 BVH |
| `updateVertices(vertices)` | 只更新 vertex buffer |
| `setMaterial(materialIndex)` | 修改全部 triangle 的 material |
| `setMaterialRange(triStart, triCount, materialIndex)` | 修改部分 triangle 的 material |
| `getBVHWireframe()` | 用于可视化 BVH leaf AABB 的 float array |
| `intersect(sceneID, ray)` | 对 scene 中 sound mesh 执行 raycast |

Web SDK 不把 BLAS refit/rebuild 暴露为单独的 mesh method。two-level BVH 同步通过 `SoundObject` 的 `UpdateType` flag 在 scene tick 中处理。若 topology、triangle list 或 BVH option 变化，请再次调用 `setData()`，并把已挂到 scene 的 object 标记为 `UpdateType.Rebuild`。

`MeshBuildOptions`:

| 字段 | 默认值 | 推荐范围 | 说明 |
|---|---:|---:|---|
| `bvhType` | `0` | `0` 或 `1` | `0 = HKDtree`, `1 = LBVH` |
| `bvhMaxDepth` | `24` | `1..32` | tree 最大深度。更深可能让 leaf 更小，但会增加 build 成本 |
| `primPerLeaf` | `4` | `1..32` | 每个 leaf 的 primitive 数。较低会增加 node，较高会增加 leaf 内 triangle test |

BVH 选择:

| 类型 | 值 | 用途 |
|---|---:|---|
| `HKDtree` | `0` | **静态 sound collider**。如墙、房间、地板等 topology 和 vertex 固定的 mesh。当前引擎中它作为 `SBVH` 的替代存在 |
| `LBVH` | `1` | **动态/skinned collider 必选**。vertex 每帧变化且需要 scene tick refit 路径的 mesh |

`SpatialBuilder` 中仍有 `SBVH`, `WBVH` 等名称，但 Web SDK 的 `SoundMesh.setData()` 路径只连接了 `HKDtree` 和 `LBVH`。不要传其他值。

### `SoundListener`

| API | 说明 |
|---|---|
| `setPosition(x, y, z)`, `setVelocity(x, y, z)` | listener 位置与速度 |
| `setOrientation(mat3x3)` | row-major 3x3 orientation matrix。demo 使用 `right, up, forward(-Z)` |
| `setOrientationQuat(qx, qy, qz, qw)` | quaternion orientation |
| `setOption(option)` | 批量设置 propagation option |
| `setAudioOption(option)` | 设置 audio sample/block/channel |
| `setPathEnable(pathType, enabled)` | direct/reflection/diffraction/reverb/transmission on/off |
| `setRayCount(width, height)` | listener guide ray grid size |
| `setRayDepth(depth)` | maximum path depth |
| `setHRTFFromUrl(url)` | fetch 并应用 HRTF 文件 |
| `setHRTFFromMemory(buffer)` | 直接应用 HRTF binary |
| `render(sourceID, input, output, channelCount)` | ST fallback manual render |
| `setMaxDelay(sourceID, v)` | delay line 最大长度 |
| `setPathFadeTime(sourceID, v)` | path 变化 cross-fade 时间 |
| `setMaxDelayRate(sourceID, v)` | delay 变化 rate limit |

`STOption` 参数:

| 字段 | 默认值 | 最小/最大 | 为什么调整 |
|---|---:|---:|---|
| `maxDepth` | `16` | `1..16` | reflection/diffraction path 最大深度。越高越丰富，但成本随 `ray count × depth` 增加 |
| `listenerWidth` | `32` | 推荐 `1..32`, hard cap `255` | horizontal ray resolution。demo 验证范围 `1..32` |
| `listenerHeight` | `32` | 推荐 `1..32`, hard cap `255` | vertical ray resolution |
| `seedValue` | `0` | `0..2^32-1` | random/cache seed。当前 C API 在 `0` 时会强制 `pathCacheSize` 为 `0` |
| `maxSoundSource` | `116` | `1..116` | scene 中可追踪的 source 上限 |
| `pathCacheSize` | `16384` | `0..16384` | path cache 容量。越大内存越多，`seedValue=0` 时禁用 |
| `enableEnergyBasedTermination` | `false` | boolean | 让能量足够低的 path 提前结束，减少深路径成本 |
| `energyThreshold` | `0.001` | `0..1` | EBT 阈值。`0.01` 接近 RT20，`0.001` 接近 RT30，`0.000001` 接近保守 RT60 |
| `samePlaneEpsilonDist` | `0.001` | `0..` | 合并近似同平面的距离容差，单位为 scene meter |
| `samePlaneEpsilonNormal` | `0.999` | `0..1` | plane normal 相似度，越接近 1 越严格 |
| `guideRayMethod` | `0` | `0` 或 `1` | `0 = GridStaggered`, `1 = Fibonacci` |

不要在拖动 UI 的每个像素都改变 ray count 和 depth。更安全的做法是在 slider release 时应用，因为内部 path cache 和 guide-plane buffer 可能重新分配。

`AudioOption` 参数:

| 字段 | 推荐值 | 说明 |
|---|---:|---|
| `sampleRate` | `ctx.sampleRate` | 必须与浏览器 `AudioContext` 一致 |
| `inputSampleCount` | MT `128`, ST `sampleRate / 100` 或 fallback `1024` | 引擎一次处理的 frame 数 |
| `outputChannels` | `2` | HRTF binaural 输出。当前实时路径推荐 stereo |

### `SoundSource`

| API | 说明 |
|---|---|
| `setPosition(x, y, z)` | source 位置 |
| `setDirection(x, y, z)` | directional source 的方向 vector |
| `setVelocity(x, y, z)` | Doppler/dynamic 处理用 velocity |
| `setIntensity(v)` | source base gain。以 `1.0` 为基准，避免负值 |
| `setGainBoostDb(db)` | overall gain boost。native clamp 到 `0..20 dB` |
| `setReverbSendDb(db)` | reverb send。native clamp 到 `-60..20 dB` |
| `setReflectionSendDb(db)` | reflection send。native clamp 到 `-60..20 dB` |
| `setDepth(depth)` | source ray depth。demo 默认 `4`，实际使用推荐 `1..16` |
| `setRayCount(width, height)` | source ray grid。demo 默认 `64 × 64` |
| `setDistanceAttenuation(pathType, vec3)` | 每个 path type 的 distance attenuation curve |

Path type:

| 名称 | 值 |
|---|---:|
| `PathType.Direct` | `0` |
| `PathType.Reflection` | `1` |
| `PathType.Diffraction` | `2` |
| `PathType.Reverb` | `3` |
| `PathType.Transmission` | `4` |

Distance attenuation 使用 `vec3 = { x: constant, y: linear, z: quadratic }`，内部计算如下。

```txt
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

每个系数都应为 `0` 以上。demo 对所有 path type 使用 `{ x: 0.001, y: 1.0, z: 0.0 }`，接近 `1 / distance` 曲线，并用很小的 `constant` 防止 near-field 爆增。`setAllDistanceAttenuations` helper 目前只处理 direct/reflection/diffraction/reverb 四种，因此 transmission 建议用 `setDistanceAttenuation(PathType.Transmission, value)` 单独设置。

### `MaterialTable`

| API | 说明 |
|---|---|
| `sound.materials.add(material)` | 添加到 global material table 并返回 index |
| `sound.materials.set(index, material)` | 替换既有 material |

### `Propagator`

| API | 说明 |
|---|---|
| `getValidPathCount()` | 当前 valid path 数量 |
| `getValidPaths(count?)` | 以 JS array 查询 path polyline、energy、material hit |
| `getGuidePlaneCount(sceneID)`, `getGuidePlanes(sceneID)` | guide plane visualization |
| `getMirrorPositionCount(sceneID)`, `getMirrorPositions(sceneID)` | image-source position visualization |
| `getProfile()` | 最近 propagation 阶段 ms 和 path count |
| `sortIRDatas()` | 请求 IR data 排序 |
| `findAttenuationForDistance(...)` | 反算 target attenuation 对应 distance |
| `startBackgroundLoop(sceneID, intervalMs = 16)` | 在 MT WASM 的 engine pthread 上运行 tick + propagation |
| `stopBackgroundLoop()` | 停止 background loop |

Web 的 MT background loop 是为了浏览器 WASM 内存共享限制而提供的辅助 API。native SDK 保持调用方在自己的 thread/job system 中直接调用 `tick()` 和 `updatePropagation()` 的模型。

## Sound Material JSON

默认材质位于 `soundMaterial.json` 的 `_soundMaterials` 数组。当前 bundle 包含 22 个材质，`ConcreteBlockPainted` type `20` 是 three.js demo 的默认 wall/room material。

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

| 字段 | 范围 | 说明 |
|---|---:|---|
| `materialType` | `0..` unique integer | triangle 的 `materialIndex` 引用的 stable ID |
| `description` | string | 显示在 UI 和 authoring tool 中的名称 |
| `scattering` | `0..1` | `0` 偏向 specular，`1` 偏向 diffuse scattering |
| `reflection` | float[8], each `0..1` | 8 个 frequency band 的 reflection coefficient |
| `absorption` | float[8], each `0..1` | 8 个 frequency band 的 absorption coefficient |
| `transmission` | float[8], each `0..1` | 8 个 frequency band 的 transmission coefficient |

8 个 frequency band 是固定的。

```txt
[67.5, 125, 250, 500, 1000, 2000, 4000, 8000] Hz
```

为了能量守恒，同一 band 中 `reflection + absorption + transmission` 应大致接近或低于 `1.0`。部分测量或调优材质可能有小误差，但较大的超出值会让 path energy 过强。

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

默认材质列表:

| ID | 名称 | scattering |
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

`soundMaterialAlias.json` 不是引擎功能，而是 UX 便利数据。它是辅助表，用于将 authoring tool 或 app layer 传入的字符串自动映射到 canonical material，对 `soundtrace.js` core 行为不是必需的。例如 `cement`、`beton` 可以映射到 `concrete`，`timber`、`oak` 可以映射到 `wood`。匹配失败时，app 可以使用 `defaultMaterialType` fallback。

## Three.js 演示

<iframe
  title="soundtrace.js three.js static single-thread demo"
  src={useBaseUrl('/demos/three-basic/?thread=st')}
  style={{display: 'block', width: '85%', height: '540px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

本地运行:

```bash
cd /Users/ethanjung/dev/soundtrace.js
npm install
npm run build
cd examples/three-basic
npm install
npm run dev
```

Vite dev server 默认设置 COOP/COEP header，因此也能确认 MT mode。文档中嵌入的 iframe 固定为 `?thread=st`，以便在没有 COOP/COEP header 的静态托管中运行。

### 底部按钮

| Control | 说明 |
|---|---|
| `Room` | 选择整个 room collider 的 material |
| `Collider` | 选择 static wall 与 Flair collider 的 material |
| `Thread` | 启动前选择 `Single` 或 `Multi`。如果 MT 不可用，会自动固定为 ST |
| `Start Audio` | 加载 WASM、material、HRTF、MP3 并启动 audio。浏览器 autoplay policy 要求用户点击 |
| `Move` / `Stop` | 让 source 沿 room 内椭圆路径移动，或停在当前位置 |
| `Wall: On/Off` | 向 scene 添加/移除 listener 附近的 static wall collider |
| `Flair: On/Off` | 向 scene 添加/移除 FBX skinned animation collider |

`Flair` 每帧采样 skinned vertex 并作为 sound collider 使用。该路径用于展示 `LBVH + updateVertices + UpdateType.Refit` 组合。如果在 demo 中把 BVH type 改为 `HKDtree`，请把 Flair 视为基于 bind pose 的静态检查场景。

### lil-gui 面板

| Panel | Control | 说明 |
|---|---|---|
| `Listener` | `Ray Width`, `Ray Height` | listener guide ray resolution。demo range `1..32` |
| `Listener` | `Ray Depth` | max path depth。demo range `1..16`, default `7` |
| `Debug overlays` | `Show Valid Paths` | 显示 propagation result polyline |
| `Debug overlays` | `Show FPS` | 显示 Stats HUD |
| `Colliders · BVH` | `Type` | `HKDtree` 或 `LBVH` |
| `Colliders · BVH` | `Max Depth` | BVH build depth。demo range `1..32` |
| `Colliders · BVH` | `Prims / Leaf` | 每个 leaf 的 primitive 数。demo range `1..32` |
| `Colliders · BVH` | `Show BVH Boxes` | 显示 leaf AABB wireframe |
| `Render Params` | `Max Delay Rate` | `0.01..0.5`, default `0.03`。限制 delay 变化速度 |
| `Render Params` | `Path Fade Time` | `0.005..0.2 s`, default `0.066`。path 变化 cross-fade |
| `Render Params` | `Max Path Delay` | `0.1..3.0 s`, default `1.0`。delay line 最大长度 |

### 鼠标操作

| 操作 | 说明 |
|---|---|
| 右键拖动 | 围绕 listener 进行 camera orbit |
| 滚轮 | zoom |
| 蓝色箭头 | listener forward 方向 |
| 红色箭头 | listener right 方向 |

## 性能调优顺序

1. runtime app 从 `Ray Width = 16`, `Ray Height = 16`, `Ray Depth = 3` 开始。
2. listener `Ray Width × Ray Height × Ray Depth` 只按需要提高。
3. static structure 使用 `HKDtree`，animation collider 使用 `LBVH`。
4. animation collider 保持 topology，只更新 vertex。
5. 如果 path 变化过快，提高 `Path Fade Time`；如果听到 delay pitch wobble，降低 `Max Delay Rate`。
6. valid path 与 BVH box overlay 只在调试时开启。

three.js demo 按 **1 listener + 1 source** 配置，优先展示高质量和调试可见性。实际 app 中 gizmo 不是必需的。尤其绘制 valid path 和 BVH box 时，会把 WASM 内部数据复制到 JS 并重建为 Three.js geometry，因此会产生通信和可视化开销。建议只在开发中开启，runtime 发布时关闭。

## 故障排除

| 症状 | 检查项 |
|---|---|
| MT 加载失败 | 确认 HTML 响应包含 COOP/COEP，且 `crossOriginIsolated` 为 `true` |
| `createWorkletNode` error | 确认 `SoundTrace` 是用 `{ thread: 'mt' }` 创建 |
| 没有声音 | 确认在用户点击中调用 `ctx.resume()`，`soundMaterial.json` 已加载到 material table，且 absorption array 没有误复制成与 reflection 相同 |
| 感觉不到方向感 | 确认 HRTF asset (`hrtf.bytes`) 成功加载 |
| 帧率下降 | 降低 `Ray Depth`, `Ray Width`, `Ray Height`。runtime 起始推荐 `16 × 16 × depth 3` |
| mono input 无声 | SDK 将 worklet node channel count 固定为 `2`, `explicit`, `speakers`。手动创建 node 时也要使用相同设置 |
| path gizmo 像残影 | 只使用 `getValidPaths()` 返回的实际 count |
| ray/path gizmo 不显示 | 确认 scene 中已添加 sound collider object |
| animation collider 抖动 | 确认流程为 `LBVH`, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, `scene.tick()` |
| 修改 BVH option 后 crash | `mesh.setData()` 后，把 object 标记为 `UpdateType.Rebuild` 并执行 `scene.tick()` |

## 参考

- [SDK 概览](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [演示](../demos/overview.md)
