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

包以 ESM 分发。普通应用从 `soundtrace.js` 入口的 facade 表面开始。

```ts
import {
  SoundTrace,
  workerHostedMtSupport,
  type MeshTriangle,
} from 'soundtrace.js';
```

包中包含以下 runtime 文件。

| 路径 | 用途 |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |
| `soundtrace.js/assets/hrtf/*.bin` | `loadHrtf()` 使用的 packaged HRTF tables |

请用 `loadHrtf('parametric')` 或 `loadHrtf('convolution')` 显式加载 HRTF。
可以使用 packaged tables，也可以由应用传入 URL、`ArrayBuffer` 或 typed array。

当 bundler 需要 subpath asset URL 时，用 `new URL(..., import.meta.url)` 解析。

```ts
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## 快速开始

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

运行时可以用 facade preflight helper 检查部署支持：

```ts
import { workerHostedMtSupport } from 'soundtrace.js';

const mt = workerHostedMtSupport();
if (!mt.supported) {
  throw new Error(`soundtrace.js thread=mt requires ${mt.missing.join(', ')}`);
}
```

ST mode 在 real-time Web Audio 集成中也使用 `AudioWorkletNode`。服务部署时，给 ST/MT
都应用同一组 COOP/COEP headers 通常最简单。

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
| Multi | `{ thread: 'mt' }` | 需要 worker-hosted control 和 pthread-enabled propagation 的部署 | WASM `AudioWorkletProcessor` 渲染 worker-owned engine session |
| Single | `{ thread: 'st' }` | single-thread WASM binary | WASM `AudioWorkletProcessor` 渲染 ST engine session |

`thread` 不是 automatic fallback，而是显式选择要加载的 WASM binary。在
`thread: 'mt'` 中，SDK 会创建专用 control worker。该 worker 拥有 MT WASM module、
scene state 和 propagation frame loop；browser main thread 不会直接调用 MT control loop。

MT 使用两条输入路径：

| 路径 | 含义 | 对象 |
|---|---|---|
| HOT lane | 只有最新值有意义的 per-frame transform，通过 `SharedArrayBuffer` 写入并在 worker frame 前消费 | `source transform`, `listener transform`, `mesh transform` |
| command channel | 不可丢弃、按 FIFO 处理的 async operation | create/delete、material 变更、mesh upload、BVH/options、audio source start/stop、reset/dispose 和其他 non-transform 工作 |

MT mode 要求浏览器 cross-origin isolation。HTML response 以及所有 WASM、worker、
worklet asset 都必须满足条件，使 `SharedArrayBuffer` 和 `crossOriginIsolated === true` 可用。

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

在 `thread: 'mt'` 或 `mode: 'multi_thread'` 中，main thread 不会直接创建 native
scene object。支持的公开流程是 facade 和 demo 流程。

1. 用 `SoundTrace.create(ctx, { mode: 'multi_thread' })` 或 `{ thread: 'mt' }` 准备 control worker 和 MT WASM。
2. 用 `sound.addMesh(...)` 添加 geometry。facade 管理 material table 和 mesh lifecycle，而 create/delete/material/mesh upload/BVH/options 等工作通过 command channel 发送。
3. 用 `sound.listener.setPose(...)`、`source.setPose(...)`、`mesh.setPose(...)` 更新 listener/source/mesh pose。这三个 transform 通过 SharedArrayBuffer backed HOT lane 传递。
4. 用 `const source = sound.addSource(...)` 添加 source。
5. 用 `await sound.update(dt)` 发送 worker frame request 并等待结果。
6. audio 通过 `await source.play(inputNode, 2)` 创建的 `AudioWorkletNode` render。
7. engine-output-style data 通过 `await sound.debugSnapshot(...)` 等 async API 读取。

`simple.ts` 和 `three-basic` demo 是该流程的参考示例。`getStatistics()`、
`propagator.getValidPaths()` 等同步 GET 诊断在 MT 中不会调用 main-thread native getter；
需要时请使用 `debugSnapshot()` 的 async readback。

## Advanced direct-native reference

普通应用应使用上面的 facade flow（`SoundTrace.create`, `sound.addMesh`,
`sound.addSource`, `source.play`, `sound.update`）作为默认路径。以下内容是需要直接
engine object 的高级 `thread: 'st'`/direct-native 集成参考。

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
| `createCollider(opts?)` | 创建同时拥有 `SoundMesh + SoundObject` 的 `SoundCollider` |
| `createSource()` | 创建 `SoundSource` |
| `createListener()` | 创建 `SoundListener`；listener ID 也作为 renderer handle |
| `materials` | global material table wrapper |
| `propagator` | valid path、guide plane、profile 查询 |
| `diagnostics` | version、memory trace、ray statistics 查询 |
| `createWorkletNode(listener, source, channels = 2)` | 创建所选 ST/MT binary 的 `AudioWorkletNode` |
| `reset()` | reset core state |
| `dispose()` | disconnect output node 并释放 WASM wrapper 引用 |

`SoundTraceOptions`:

| 字段 | 默认值 | 范围/注意 |
|---|---:|---|
| `thread` | `'st'` | `'st'` 或 `'mt'`。实际服务推荐 MT |
| `coreBaseUrl` | package internal `./core` | 自托管时指定包含 `st/`, `mt/` 的目录，例如 `./core` |
| `propagationThreadCount` | `-1` | native `ExaRuntimeOption.propagationThreadCount`; `-1` 使用 native default |
| `defaultMeshBuild` | native default | native `ExaMeshBuildOption` process-wide mesh build default |

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

`propagationThreadCount` 和 `defaultMeshBuild` 会在 native `exaInit()` 前通过 C API
传入。`thread: 'st' | 'mt'` 保持为 binary selection，BVH/SIMD 选择通过
`BvhType` 和 mesh build option 控制。

### `SoundScene`

| API | 说明 |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | 管理 sound collider |
| `addCollider(collider)`, `removeCollider(collider)` | 连接/解除 `SoundCollider` RAII 对象 |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | 管理 source |
| `setListener(listener)` | 设置 scene 的单一 listener。已有 listener 时会替换 |
| `addListener(listener)`, `removeListener(listener)` | 兼容用 listener API。添加第二个 listener 会抛出错误 |
| `clearListeners()` | 解除当前 listener 连接 |
| `update(dt)` | `tick(dt)` 后执行 `updatePropagation()` |
| `tick(dt)` | 消费 object update type，并更新 TLAS/BVH state |
| `updatePropagation()` | 执行 ray/path propagation |

scene 中应只有一个 listener。即使 UI 管理多个 listener 候选，也请选出实际参与传播计算的一个，并用 `setListener()` 替换。

### `SoundObject` 与 `UpdateType`

| 值 | 用途 |
|---|---|
| `UpdateType.Static` (`0`) | 默认。geometry 和 transform 不变化的静态 collider |
| `UpdateType.Refit` (`1`) | vertex 位置变化但 topology 相同。用于 skinned/animated collider |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()`、topology 变化、BVH option 变化、scene 添加/删除 |

:::warning Refit 使用规则
`Refit` 用在**将 skinned animation 作为 sound collider**的场景。这时 BVH 应使用 `LBVH` family builder 构建。每帧只用 `mesh.updateVertices(vertices)` 更新 vertex buffer，将对应 object 标记为 `UpdateType.Refit`，然后运行 `scene.tick(dt)`。BLAS refit 与 TLAS refit 会在 `SoundScene::tick()` 内消费 update flag 后处理。
:::

:::info 需要 Rebuild 的情况
`SoundMesh.setData()` 会创建新的内部 BVH object。如果 object 已经挂在 scene 上，请在下一次 tick 前调用 `object.setUpdateType(UpdateType.Rebuild)`。`scene.tick(dt)` 会根据该 flag 处理 BLAS/TLAS rebuild。
:::

### `SoundMesh`

| API | 说明 |
|---|---|
| `setData(vertices, triangles, opts?)` | 重新构建 geometry 与 BVH |
| `updateVertices(vertices)` | 只更新 vertex buffer |
| `updateVerticesAndRefit(vertices)` | 更新 vertex buffer 后执行 mesh refit |
| `setMaterial(materialIndex)` | 修改全部 triangle 的 material |
| `setMaterialRange(triStart, triCount, materialIndex)` | 修改部分 triangle 的 material |
| `getBVHWireframe()` | 用于可视化 BVH leaf AABB 的 float array |
| `intersect(sceneID, ray)` | 对 scene 中 sound mesh 执行 raycast |

two-level BVH 同步通过 `SoundObject` 的 `UpdateType` flag 在 scene tick 中处理。若 topology、triangle list 或 BVH option 变化，请再次调用 `setData()`，并把已挂到 scene 的 object 标记为 `UpdateType.Rebuild`。只有 vertex 变化的 animated collider 可使用 `updateVerticesAndRefit()` 或 `SoundCollider.refitVertices()`。

`MeshBuildOptions`:

| 字段 | 默认值 | 推荐范围 | 说明 |
|---|---:|---:|---|
| `bvhType` | `BvhType.Default` | enum below | `Default(-1)` 使用当前 native `ExaMeshBuildOption.bvhType` |
| `bvhMaxDepth` | `0` | `0` 或 `1..32` | `0` 或省略时使用 native default |
| `primPerLeaf` | `0` | `0` 或 `1..32` | `0` 或省略时使用 native default |

BVH 选择:

| 类型 | 值 | 用途 |
|---|---:|---|
| `Default` | `-1` | `SoundMesh.setData()` 中使用当前 native default mesh build option |
| `HKDtree` | `0` | **静态 sound collider**。如墙、房间、地板等 topology 和 vertex 固定的 mesh。当前引擎中它作为 `SBVH` 的替代存在 |
| `LBVH` | `1` | 动态/skinned collider default。vertex 每帧变化且需要 scene tick refit 路径的 mesh |
| `LBVH_SIMD4` | `2` | SIMD4 LBVH builder |
| `LBVH_SIMD8` | `3` | SIMD8 LBVH builder |
| `LBVH_SIMD16` | `4` | SIMD16 LBVH builder |
| `LBVH_NWAY4` | `5` | 4-way LBVH builder |
| `LBVH_NWAY8` | `6` | 8-way LBVH builder |
| `LBVH_NWAY16` | `7` | 16-way LBVH builder |

`defaultMeshBuild.bvhType` 是 native process-wide default，必须传实际 builder enum。
`BvhType.Default` 只是在 per-mesh `setData()` 中表示“使用当前 native default”的 sentinel。

### `SoundCollider`

`SoundCollider` 是把 `SoundMesh` 和 `SoundObject` 绑在一起的上层 RAII 对象。对 Three.js 或 scene component 集成来说，它让 mesh、object、scene 连接共享同一个生命周期。

| API | 说明 |
|---|---|
| `sound.createCollider(opts?)` | 从 `vertices`, `triangles` 和 BVH options 创建 collider |
| `scene.addCollider(collider)` | 将 collider object 加入 scene 并记录连接状态 |
| `scene.removeCollider(collider)` | 从 scene 移除并清除连接状态 |
| `collider.rebuild(vertices, triangles, opts?)` | 调用 `mesh.setData(...)` 后把 object 标记为 `UpdateType.Rebuild` |
| `collider.refitVertices(vertices)` | 只更新 vertex，并把 object 标记为 `UpdateType.Refit` |
| `collider.dispose()` | 一起清理 scene 连接、object 和 mesh |

Three.js adapter 会读取 `BufferGeometry.groups[].materialIndex` 和 `mesh.material` slot，转换为 triangle 的 `materialIndex`。解析顺序如下：

1. material 的 `userData.soundMaterialIndex` 或 `soundMaterialIndex`
2. `materialMap` 中的 slot 编号、`slot:N`、material `name`、`uuid`、`type`
3. 未匹配时使用 `defaultMaterialIndex`（默认 `0`）

静态 collider 的默认 BVH 是 `HKDtree`；`dynamic: true` 或 skinned collider 的默认 BVH 是 `LBVH`。如需 SIMD/N-way builder，请在 collider option 中指定 `bvhType`。skinning animation 应保持 topology 不变，并在每帧调用 `collider.refitVertices(vertices)`。

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
| `render(sourceID, input, output, channelCount)` | low-level manual render；常规 Web Audio 集成使用 `createWorkletNode()` |
| `setMaxDelay(sourceID, v)` | delay line 最大长度 |
| `setPathFadeTime(sourceID, v)` | path 变化 cross-fade 时间 |
| `setMaxDelayRate(sourceID, v)` | delay 变化 rate limit |

`STOption` 参数:

应用启动推荐使用 `recommendedSTOption()`。当前 ray budget 上限是
`EXA_LISTENER_WIDTH = 32`, `EXA_LISTENER_HEIGHT = 32`, `EXA_MAX_DEPTH = 16`；
runtime 推荐起点是 `16 × 16 × depth 3`。

| 字段 | 推荐 preset | 最小/最大 | 为什么调整 |
|---|---:|---:|---|
| `maxDepth` | `3` | `1..16` | reflection/diffraction path 最大深度。越高越丰富，但成本随 `ray count × depth` 增加 |
| `listenerWidth` | `16` | `1..32` | horizontal ray resolution |
| `listenerHeight` | `16` | `1..32` | vertical ray resolution |
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
| `inputSampleCount` | `128` | `createWorkletNode()` path 中引擎一次处理的 frame 数 |
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
| `setDepth(depth)` | source ray depth。起点 `3`，范围 `1..16` |
| `setRayCount(width, height)` | source ray grid。起点 `16 × 16`，上限 `32 × 32` |
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
| `setJobTimingOption({ enabled, frameCapacity })` | 配置 native propagation job timing ring buffer |
| `getJobTimingFrames(sceneID, maxFrames?)` | 查询最近 propagation frame/job timing snapshot |
| `resetJobTiming()` | reset job timing snapshot |
| `sortIRDatas()` | 请求 IR data 排序 |
| `findAttenuationForDistance(...)` | 反算 target attenuation 对应 distance |

direct-native `Propagator` surface 仅用于 ST/direct-native 集成。worker-hosted MT
应用应使用 facade command API 和 async debug snapshot API，而不是在 browser main
thread 直接调用 `tick()` 和 `updatePropagation()`。

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
  title="soundtrace.js three-basic worker-hosted MT demo"
  src={useBaseUrl('/demos/three-basic/simple.html')}
  style={{display: 'block', width: '100%', height: '486px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

`three-basic` 是 Web SDK 的 `simple.ts` 集成示例。docs preview server 会发送
COOP/COEP headers，因此可以在 iframe 中直接检查 MT。迁移到其他 static host 时也需要同样的 headers。

runtime 和 demo 构建:

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

对于 `http://127.0.0.1:3100/docs/sdk/web` 这样的部署路径 preview，build 时也要指定
`BASE_URL=/docs/`，使 Docusaurus client route 与 static file prefix 一致。

MT 检查流程：

1. 确认 `npm run dev` 或 `npm run serve` 发送 COOP/COEP headers。
2. 在浏览器中确认 `crossOriginIsolated === true` 且 `SharedArrayBuffer` 可用。
3. 在 `simple.html` 或 docs iframe 中将 `Backend` 设为 `mt`，然后按 `Start Audio`。
4. 移动 source/listener/mesh，确认 `source transform`、`listener transform`、`mesh transform` 会立即反映。

### 底部按钮

| Control | 说明 |
|---|---|
| `Room` | 选择整个 room collider 的 material |
| `Collider` | 选择 static wall 与 Flair collider 的 material |
| `Backend` | 启动前选择 `st` 或 `mt`。选择值明确指定要加载的 WASM binary |
| `Start Audio` | 加载 WASM、material、MP3 并启动 audio。default HRTF 会在 native 初始化中自动应用 |
| `Move` / `Stop` | 让 source 沿 room 内椭圆路径移动，或停在当前位置 |
| `Wall: On/Off` | 向 scene 添加/移除 listener 附近的 static wall collider |
| `Flair: On/Off` | 向 scene 添加/移除 FBX skinned animation collider |

`Flair` 每帧采样 skinned vertex 并作为 sound collider 使用。该路径用于展示 `LBVH`
family builder 与 `updateVertices + UpdateType.Refit` 组合。如果在 demo 中把 BVH
type 改为 `HKDtree`，请把 Flair 视为基于 bind pose 的静态检查场景。

### lil-gui 面板

| Panel | Control | 说明 |
|---|---|---|
| `Listener · General Rays` | `Width`, `Height` | listener guide ray resolution。demo range `1..32`, default `32` |
| `Listener · General Rays` | `Depth` | listener guide ray max path depth。demo range `1..16`, default `7` |
| `Listener · Reverb Rays` | `Width`, `Height` | source reverb ray resolution。demo range `1..64`, default `16` |
| `Listener · Reverb Rays` | `Depth` | source reverb ray depth。demo range `1..16`, default `4` |
| `Debug overlays` | `Show Valid Paths` | 显示 propagation result polyline |
| `Debug overlays` | `Show FPS` | 显示 Stats HUD |
| `Colliders · BVH` | `Type` | `Default`, `HKDtree`, `LBVH`, `LBVH_SIMD4/8/16`, `LBVH_NWAY4/8/16` |
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
2. listener `General Rays` 与 source `Reverb Rays` 只按需要提高。
3. static structure 使用 `HKDtree`，animation collider 使用 `LBVH` family。
4. animation collider 保持 topology，只更新 vertex。
5. 如果 path 变化过快，提高 `Path Fade Time`；如果听到 delay pitch wobble，降低 `Max Delay Rate`。
6. valid path 与 BVH box overlay 只在调试时开启。

three.js demo 按 **1 listener + 1 source** 配置，优先展示高质量和调试可见性。实际 app 中 gizmo 不是必需的。尤其绘制 valid path 和 BVH box 时，会把 WASM 内部数据复制到 JS 并重建为 Three.js geometry，因此会产生通信和可视化开销。建议只在开发中开启，runtime 发布时关闭。

demo 是小场景，用于展示质量和可视化，因此 listener `General Rays` 从 `32 × 32 × depth 7` 开始，source `Reverb Rays` 从 `16 × 16 × depth 4` 开始。一般 app 的起始推荐仍是 `16 × 16 × depth 3`。

## 故障排除

| 症状 | 检查项 |
|---|---|
| Native worklet/MT 加载失败 | 确认 HTML 响应包含 COOP/COEP，且 `crossOriginIsolated` 为 `true` |
| `createWorkletNode` error | 确认 `ctx.resume()` 在 user gesture 中执行，且 worklet core asset path 正确 |
| 没有声音 | 确认在用户点击中调用 `ctx.resume()`，`soundMaterial.json` 已加载到 material table，且 absorption array 没有误复制成与 reflection 相同 |
| 听不到 reflection/diffraction/absorption 变化 | 没有 sound collider 时，scene 主要只产生 direct sound。请添加已映射 geometry 和 sound material 的 collider |
| 感觉不到方向感 | 确认 listener audio option、orientation、source/listener 位置、collider/material 设置 |
| 帧率下降 | 降低 `Ray Depth`, `Ray Width`, `Ray Height`。runtime 起始推荐 `16 × 16 × depth 3` |
| mono input 无声 | SDK 将 worklet node channel count 固定为 `2`, `explicit`, `speakers`。手动创建 node 时也要使用相同设置 |
| path gizmo 像残影 | 只使用 `getValidPaths()` 返回的实际 count |
| ray/path gizmo 不显示 | 确认 scene 中已添加 sound collider object |
| animation collider 抖动 | 确认流程为 `LBVH` family, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, `scene.tick()` |
| 修改 BVH option 后 crash | `mesh.setData()` 后，把 object 标记为 `UpdateType.Rebuild` 并执行 `scene.tick()` |

### FAQ: 声音只从一侧播放

本节面向 `soundtrace.js` 模块用户，尤其是把 SDK 接入现有 Web Audio app，或为新
web app 构建 audio graph 时遇到的问题。典型症状是：有声音，但偏向一侧；
HRTF/空间音频感觉不明显；移动 source 时方向变化也很弱。

这个问题通常不是 STCoreV2 core 本身，而是初始化顺序、audio option，或 app 侧
channel routing 引起的。示例和最近的修复中，下面这些点最关键。

实现时最容易遗漏的是下面几点。

- `soundtrace.js` 的 real-time HRTF 输出不是硬件 5.1/7.1 bus，而是 `2` channel binaural/stereo render target。即使实现 speaker layout，每个 speaker 也是 virtual source，最终输出仍会混合为 stereo。
- 如果手动创建 `AudioWorkletNode`，但省略 `outputChannelCount: [2]`，1-output/1-input worklet 的初始 channel count 可能是 `1`。SDK 的 `createWorkletNode()` 会固定 `channelCount = 2`、`channelCountMode = 'explicit'`、`channelInterpretation = 'speakers'` 来避免这个问题。
- low-level code 直接调用 `listener.render()` 时，`channelCount` 必须是 `2`，输入 buffer 长度必须是 `frames * 2` 的 interleaved sample 数。只传 frame 数或 mono buffer 会违反 engine 的 mono-mix/render-buffer 契约。
- 在创建多个 virtual speaker source 的 app 中，不要假设浏览器会自动按 speaker 分配 channel。app 必须为每个 source 显式设置 left/right/mix routing。

检查清单:

1. **确认正在使用 SDK wrapper。** 不要只手动加载 WASM 文件。对 facade 路径，应使用 `soundtrace.js` 模块中的 `SoundTrace`、`sound.listener`、`sound.addSource()`、`source.play()`。像 `SoundListener`、`createWorkletNode`、`recommendedSTOption`、`PathType` 这样的 direct-native 组合只适用于 ST/direct-native 集成。
2. **在用户点击中立即调用 `AudioContext.resume()`。** 如果等 WASM 或 audio fetch 之后才调用 `resume()`，浏览器 autoplay policy 可能让 context 一直保持 `suspended`。参考示例，在 click handler 前半段创建 `const resumeP = ctx.resume()`，最后再 `await resumeP`。
3. **listener audio option 要匹配真实 context。** `sampleRate` 使用 `ctx.sampleRate`，`outputChannels` 在当前实时 HRTF 路径中使用 `2`。`inputSampleCount` 以 `128` 为基准，适用于 facade 的 `source.play()` 路径和 ST/direct-native 的 `createWorkletNode()` 路径。
4. **listener pose 和质量选项先按示例起步。** facade 路径使用 `sound.listener.setPose(...)`、`sound.setQuality(...)`、`sound.setAudioOption(...)`。只有在 ST/direct-native 集成中，才直接使用 `listener.setOption(recommendedSTOption())`、`listener.setOrientation(...)`、`listener.setPosition(...)`。
5. **先设置 material table 和 collider。** facade 路径用 `sound.addMesh(...)` 添加 material 和 collider。ST/direct-native 集成则使用 `sound.materials`、`createCollider()`、`scene.addCollider(...)`。没有 collider 时主要是 direct sound，空间变化会比较弱。
6. **custom Web Audio graph 中显式设置 stereo。** facade 的 `source.play()` 路径和 ST/direct-native 的 `createWorkletNode()` 路径都会使用 `channelCount = 2`、`channelCountMode = 'explicit'`、`channelInterpretation = 'speakers'`。如果手动创建 node，或组合独立 graph，也要给 input hub、splitter、merger、worklet/input node 设置相同选项。
7. **用多个 sound source 实现 speaker layout 时，显式路由 channel。** 不要把同一个 stereo input 隐式连接到所有 source。例如 `L/LS/SL/BL` 系 source 接收 left channel 并复制到左右 input frame，`R/RS/SR/BR` 系 source 接收 right channel，`C/LFE/Mono` 使用 `(L + R) * 0.5` mono mix。
8. **重新播放前完整清理 graph。** 断开旧的 `MediaElementAudioSourceNode`、`AudioBufferSourceNode`、splitter、merger 和 gain node，再创建新的 source graph，只把 soundtrace output 接到 master/destination。
9. **第一个 audio block 前预热 propagation。** listener、source、collider 配置完成后，调用一次 `scene.tick(0)` 和 `scene.updatePropagation()`，准备初始 path state。

因此在判断 SDK core 有问题前，先检查 AudioContext resume timing、audio option、
channel routing 和 graph lifecycle。

## 参考

- [SDK 概览](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [演示](../demos/overview.md)
