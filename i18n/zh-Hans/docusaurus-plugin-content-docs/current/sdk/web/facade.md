---
title: Facade API
description: 在 ST 与 MT 上用法一致的 soundtrace.js 1.1.0 推荐 API，以及因切换到 SimpleST 而变化的选项。
---

# Facade API

Facade 是普通 Web 应用的推荐入口。`SoundTrace` 管理场景生命周期，`Listener`、`Source`、`Mesh`
表示应用的 3D 状态。所有公开方法在 `thread: 'st'` 和 `'mt'` 上行为一致，诊断全部为异步。

[Web SDK 概览](../web.md) · [Native API](./native.md)

## 基本流程

```ts
const sound = await SoundTrace.create(audioContext, options);
sound.output.connect(audioContext.destination);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

await source.play(inputNode);      // 输入捕获。输出只有 sound.output 一个
await sound.update(0);
```

## `SoundTrace` 选项

| 选项 | 默认值 | 说明 |
|---|---|---|
| `thread` | `'auto'` | `'st'`（同步传播）/ `'mt'`（管线传播）。两者都使用专用 Worker + pthread WASM |
| `mode` | 未指定 | `'single_thread'` / `'multi_thread'`。是 `thread` 的别名，`mode` 优先。`'gpu'` 会被**拒绝** |
| `quality` | `'balanced'` | `'fast'`、`'balanced'`、`'quality'` |
| `earlyReflectionMode` | `'hybrid'` | 实时始终为 Hybrid。其他值会被拒绝 |
| `coordinateBasis` | 引擎坐标系（`+Z` forward） | 把渲染器坐标系转换为 SDK 坐标系 |
| `coreBaseUrl` | 包内 | 存放 `SimpleSTRealtime.mjs/.wasm`、`SimpleSTOffline.mjs` 的 URL |
| `assetBaseUrl` | 包内 | 材质 JSON 与 HRTF 资源的 URL |
| `propagationThreadCount` | 同步 1 / 管线 3 | 计算预算 1 ~ 5（负数 = 5）。管线模式至少 3 |
| `throughput` | 未指定 | `'low'` / `'medium'` / `'max'` — MT 工作线程预算的简写 |
| `sceneRatio` | `1.0` | 每个场景长度单位对应的米数（cm = 0.01）。**不要**与预缩放几何体混用 |
| `maxSources` | `0` | 同时存活的引擎声源数上限（0 ~ 512 的整数）。`0` = wasm 平台默认（32 个声源 · 声源内存 64 MiB · 延迟环上限 0.5 s — 堆固定为 256 MiB，因此较为保守）。超出的声源创建会被引擎以 status 11（`BUDGET_EXCEEDED`）拒绝，已有声源继续渲染。自 SDK 发行版 2.18.2-jhj.3 起 |
| `autoLoadMaterials` | `true` | 加载默认材质表并启用按名称映射 |
| `transmissionModel` | `'surface'` | SimpleST 只支持表面 R/A/T。`'solid'` 会被**拒绝** |
| `defaultMeshBuild` | — | STCoreV2 BVH 选项。指定后加载会被**拒绝** |
| `debug` | `false` | 输出一行初始化诊断日志 |

```ts
const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',
  quality: 'balanced',
  coordinateBasis: { right: [-1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, // Three.js
});
```

## 主要 API

### `SoundTrace`

| API | 说明 |
|---|---|
| `SoundTrace.create(ctx, options?)` | 创建并加载引擎（构造函数 + `load()`） |
| `output` / `audioContext` | 听者主输出节点（立体声）与应用传入的 `AudioContext` |
| `listener` | 场景中唯一的听者 |
| `descriptor` | `{ transport: 'worker', thread: 'st' \| 'mt' }` — 仅用于诊断，不要用于分支 |
| `addMesh(options)` / `removeMesh(mesh)` | 添加/移除声学几何体 |
| `addSource(options)` | 添加空间声源 |
| `setQuality(tier)` | 更改质量预设（听者与声源射线和深度） |
| `setAudioOption(options)` | 覆盖输入块大小、输出通道 |
| `loadHrtf(mode, source?)` | `'mit-kemar'` / `'sadie-d2'`（别名 `'convolution'` / `'steamaudio'`） |
| `loadMaterialAssets()` | 手动加载材质表（`autoLoadMaterials: false` 时） |
| `update(dt?)` | 更新场景并执行传播。以本帧的有效路径数 resolve |
| `debugSnapshot(options?)` | 异步诊断快照。`.simplest` 中包含 SimpleST scene/timing/render/IR 统计，从 1.1.0 起还包含 `features`、`output`（限制器、类型、延迟、主增益）、`inputs`（实时/剪辑声源数） |
| `getStatistics(options?)` | `debugSnapshot` 的封装。`validPathCount` 与 `.simplest` |
| `getIRs()` | 在独立 Offline Worker 中重新计算 9 频段 early path IR |
| `renderMonoImpulseResponse(source, sec)` | 在 Offline Worker 中生成 44.1 kHz 单声道压力 IR（最长 30 s） |
| `enableGpu()` / `getGpuStats()` | **拒绝** — SimpleST Web 仅支持 CPU |
| `reset()` | 重置引擎状态（async）。Hybrid、材质、质量会重新应用 |
| `dispose()` | 释放 SDK 拥有的资源。幂等，可配合 `using` |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: camera.quaternion.toArray() })
  .setRenderOptions({ useDoppler: true, useLimiter: false, pathFadeTime: 0.05, maxDelaySeconds: 2 }) // useLimiter 默认 false
  .setOutputMode('hrtf');   // 'hrtf'（双耳）| 'speaker'（立体声声像）
```

场景中只有一个 listener，由 `SoundTrace` 拥有。`orientation` 直接传入相机的当前旋转四元数（XYZW）。

`setRenderOptions` 接受的键：

| 键 | 含义 |
|---|---|
| `earlyReflectionMode` | 仅允许 `'hybrid'` |
| `useDoppler` | 可变延迟 Doppler 音高 — 自 SimpleST 2.18.1 起实时渲染中始终开启，`false` 会被忽略 |
| `useLimiter` | 输出限制器。默认 `false` — 由应用的 Web Audio 主总线负责限幅（引擎 2.18 创建后的默认为开启，但 SDK 会在每次渲染启动、HRTF/输出变更、reset 时将其关闭）。为 `true` 时使用 SimpleST 2.18 true-peak 限制器（−1 dBTP，137 采样延迟） |
| `pathFadeTime` | 路径出现/消失的交叉淡化（秒） |
| `maxDelaySeconds` | 每个声源延迟环的上限（秒）。引擎按每个声源的路径所需分配环（下限 0.25 s）。Web 平台默认上限为 0.5 s |
| `diffuseEnabled` | late reverb 渲染开关。从 1.1.0 起也会一并开关 2.18 的一阶散射（diffuse rain）渲染 |

`hrtfQuality`、`diffuseQuality`、`delayInterpolation`、`hrtfMode` 为 STCoreV2 专用，会被**拒绝**。

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: { direct: true, reflection: true, diffraction: true, reverberation: true },
});

source.setPose({ position: [1, 1, -2], velocity: [0.5, 0, 0] });
source.setGain(0.8);                          // 压力增益。传给引擎时为 energy = gain²
source.setPathEnabled('reverberation', false);
source.setDirection([0, 0, -1]);
```

| API | 说明 |
|---|---|
| `play(input, channels?)` | 返回已接入输入的 `AudioWorkletNode`。**输出为静音**，实际声音来自 `sound.output` |
| `setPose(pose)` / `setGain(g)` | 位置、速度、方向，增益 |
| `setPathEnabled(path, on)` / `setPathOptions(o)` / `isPathEnabled(path)` | `'direct'`（含透射）/ `'reflection'` / `'diffraction'` / `'reverberation'` |
| `setDirection(v)` | 声源 forward。以无 roll 的最小旋转同时更新 orientation |
| `setDirectivityTable(anglesDeg, attenDbPerBand)` / `setDirectivityEnabled(on)` | 把按角度的 9 频段衰减表转换为 SimpleST 指向性表并应用 |
| `dispose()` | 释放声源与流 |

#### 距离衰减

STCoreV2 的逐声源多项式衰减（`constant / linear / quadratic`）已不存在。SimpleST 对所有路径应用
物理 `1/r` 衰减和 ISO 9613-1 空气吸收，参考距离（1 m）与最小距离（1 m）是引擎策略。

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

`indices` 用于整个网格使用同一种材质的情况。若需要逐面材质，请传入
`{ a, b, c, materialIndex }` 形式的 `triangles`。

| API | 说明 |
|---|---|
| `setMaterial(material)` | 替换整个网格的材质。SimpleST 材质不可变，内部会重新绑定到新的材质/网格句柄 |
| `setMaterialRange(triStart, triCount, material)` | 按三角形范围替换材质 |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`（静态 TLAS）/ `'dynamic'`（只更新变换）。`'refit'`、`'rebuild'` 仅为兼容保留，在 SimpleST 中会重新创建网格 |
| `setPose(pose)` | 更新 position、orientation、scale |
| `dispose()` | 释放网格与对象 |

BVH 由 SimpleST 拥有（默认 TinyBVH）。没有逐网格构建选项。

## 相对 STCoreV2 的选项变更摘要

| 之前 | 现在 |
|---|---|
| `mode: 'gpu'`, `enableGpu()`, `getGpuStats()` | 拒绝（仅 CPU） |
| `transmissionModel: 'solid'` | 拒绝（仅表面 T） |
| `defaultMeshBuild`, `BvhType` | 拒绝（SimpleST 拥有 BVH） |
| `hrtfQuality`, `diffuseQuality`, `delayInterpolation`, `hrtfMode` | 拒绝 |
| `loadHrtf('parametric')`，KU100/H12 表 | 无。改为 `'mit-kemar'` / `'sadie-d2'` |
| path cache（`seedValue`, `pathCacheSize`） | 无 |
| 逐声源多项式距离衰减 | 物理衰减（引擎） |
| 连接 `source.play()` 的输出节点 | 输出只有 `sound.output` 一个。`play()` 节点用于输入捕获 |
| 8 频段材质 | 9 频段，严格 R+A+T=1 |
| 同步 `getStatistics()` 等 | 全部为 `Promise` |
| `./internal` entry, `SoundTraceMtUnsupportedError` | 已移除。通过 `./native` 访问 SimpleST 模块 |

## 帧更新

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => { updateInFlight = undefined; });
  }
}
```

pose 变更可以快速记录，但同一时刻只执行一个传播 update 更为安全。

## 生命周期

`SoundTrace`、`Source`、`Mesh` 都支持 `dispose()`。`SoundTrace.dispose()` 会清理包括 listener 和
Worker 在内的所有 SDK 所有资源，多次调用也是安全的。

## 相关文档

- [Web SDK 概览](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
