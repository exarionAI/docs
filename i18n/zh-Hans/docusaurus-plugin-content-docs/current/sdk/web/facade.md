---
title: Facade API
description: 在 ST 与 MT 上用法一致的 soundtrace.js 推荐 API。
---

# Facade API

Facade 是普通 Web 应用的推荐入口。`SoundTrace` 管理场景生命周期，`Listener`、
`Source`、`Mesh` 表示应用的 3D 状态。

[Web SDK 概览](../web.md) · [Native API](./native.md)

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

这套调用流程在 ST 和 worker-hosted MT 上完全相同。在 MT 上请使用
`debugSnapshot()` 这类异步回读，而不是同步的 native getter。

## `SoundTrace` 选项

| 选项 | 默认值 | 说明 |
|---|---|---|
| `mode` | 未指定 | `'single_thread'`、`'multi_thread'`、`'gpu'` 之一 |
| `thread` | `'auto'` | 高级 WASM 选择：`'auto'`、`'st'`、`'mt'`；`mode` 优先 |
| `quality` | `'balanced'` | `'fast'`、`'balanced'`、`'quality'` |
| `throughput` | 未指定 | MT worker 预算：`'low'`、`'medium'`、`'max'` |
| `coordinateBasis` | core 坐标系 | 把渲染器坐标系转换为 SDK 坐标系 |
| `coreBaseUrl` | 包内 | 包含 `st/`、`mt/` 的 core URL |
| `assetBaseUrl` | 包内 | 材质与 HRTF 资源的 URL |
| `propagationThreadCount` | 引擎默认 | MT propagation 线程数的低层 override |
| `defaultMeshBuild` | 引擎默认 | `addMesh()` 使用的默认 BVH build 选项 |
| `sceneRatio` | `1.0` | 每个场景长度单位对应的米数。不要与预缩放几何体混用（会双重缩放） |
| `autoLoadMaterials` | `true` | 加载默认材质，启用按名称映射 |
| `transmissionModel` | `'surface'` | 直达声穿过材质时的能量衰减模型，参见[材质透射模型](#材质透射模型) |
| `debug` | `false` | 输出初始化诊断日志 |

Three.js 的相机朝向 `-Z`，因此可以从下面的 basis 开始。

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

| API | 说明 |
|---|---|
| `SoundTrace.create(ctx, options?)` | 创建并加载引擎（构造函数 + `load()`） |
| `output` / `audioContext` | master output 节点与应用传入的 `AudioContext` |
| `listener` | 场景中唯一的听者 |
| `addMesh(options)` | 添加声学几何体 |
| `removeMesh(mesh)` | 移除几何体 |
| `addSource(options)` | 添加空间声源 |
| `setQuality(tier)` | 更改质量预设 |
| `setAudioOption(options)` | 覆盖块大小与输出通道 |
| `loadHrtf(mode, source?)` | 加载随包或自定义 HRTF |
| `loadMaterialAssets()` | 手动加载材质表（`autoLoadMaterials: false` 时） |
| `enableGpu()` | 开启 WebGPU 传播并返回是否成功；不支持时返回 `false` 并保持 CPU |
| `update(dt?)` | 更新场景并执行 propagation |
| `debugSnapshot(options?)` | 兼容 MT 的异步诊断快照 |
| `getStatistics(options?)` | valid path、ray 与内存统计（async） |
| `getGpuStats()` | GPU dispatch/fallback 计数（async） |
| `getIRs()` | 最近一次 propagation 的各 path 脉冲响应（async） |
| `renderMonoImpulseResponse(source, sec)` | 离线 mono IR 渲染，仅在输出通道为 1 时使用 |
| `reset()` | 重置引擎状态（async） |
| `dispose()` | 释放 SDK 拥有的资源。幂等，可配合 `using` |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: [0, 0, 0, 1] })
  .setRenderOptions({ hrtfQuality: 'medium' });
```

场景中只有一个 listener。它由 `SoundTrace` 拥有，因此不需要单独 dispose。

用 `setOutputMode()` 切换输出渲染器。默认的 `'hrtf'` 是双耳渲染器，`'speaker'`
选择内部的 Ambisonic 扬声器渲染器（1ch/2ch）。HRTF 模式与已加载的 HRTF 表仅对
`'hrtf'` 输出生效。

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

`play(input, channels?)` 返回已接入输入的 `AudioWorkletNode`。输出由应用连接到
`sound.output` 或其他 Web Audio graph。

#### 距离衰减

`addSource()` 会对全部 5 种 path 应用默认衰减系数
`{ constant: 1, linear: 0, quadratic: 1 }`。

```text
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

也就是说默认曲线为 `1 / (1 + distance²)`。`constant = 1` 防止距离接近 0 时增益
发散，`quadratic = 1` 提供接近平方反比的衰减。

#### 指向性

要让声源具有指向性，需要注册按角度的频段衰减表并启用它。

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

当整个网格使用同一种材质时，`indices` 很方便。若需要逐面材质，请改为传入
`{ a, b, c, materialIndex }` 形式的 `triangles`。

创建之后仍可更改材质与更新策略。

| API | 说明 |
|---|---|
| `setMaterial(material)` | 替换整个网格的材质 |
| `setMaterialRange(triStart, triCount, material)` | 按三角形范围替换材质 |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`、`'refit'`、`'rebuild'`、`'dynamic'` |
| `setPose(pose)` | 更新 position、orientation、scale |
| `dispose()` | 释放网格与 collider |

不动的墙体用 `'static'`，只有顶点变化的几何体用 `'refit'`，拓扑发生变化时用
`'rebuild'`。

## 材质透射模型

`transmissionModel` 决定直达声穿过墙体等材质时如何损失能量。

| 值 | 行为 |
|---|---|
| `'surface'`（默认） | 每穿过一个表面就应用一次材质的透射系数，与墙体厚度无关 |
| `'solid'` | 考虑厚度：按 ray 在 solid 内部经过的距离，应用材质各频段的厚度，越厚的墙阻隔越强 |

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  transmissionModel: 'solid',
});
```

`'solid'` 只会切换那些标注了厚度的材质，没有厚度的材质保持 `'surface'` 行为。
在默认材质表中，22 种材质里有 15 种带有厚度。

:::warning
这是 opt-in 选项 —— 它会改变墙后声源的响度，因此若需要保持既有场景的声音，请
保留默认值。
:::

## 传播 path cache

每个会话启动时 propagation path cache 都是**开启**的（固定 seed，大小 512）。它在
ST 和 MT 上都会在第一帧之前生效，`reset()` 之后也会重新应用，因此不需要调用任何
API 来开启它。

## 帧更新

pose 变更可以快速记录，但同一时刻只保持一个 propagation update 在执行更为安全。

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

## 生命周期

`SoundTrace`、`Source`、`Mesh` 都支持 `dispose()`。`SoundTrace.dispose()` 会清理
包括 listener 在内的所有 SDK 所有资源，并且可以安全地多次调用。

```ts
source.dispose();
mesh.dispose();
sound.dispose();
```

## 相关文档

- [Web SDK 概览](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
