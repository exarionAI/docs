---
title: Native API
description: soundtrace.js 的 single-thread 低层 API 及当前支持范围。
---

# Native API

Native API 面向需要直接控制 scene、listener、source、mesh 和 BVH 的高级
single-thread 集成。普通应用请使用 [Facade API](./facade.md)。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
import {
  BvhType,
  PathType,
  UpdateType,
  type MeshBuildOptions,
} from '@exarionai/soundtrace.js/native';
```

## 支持范围

:::warning 当前公开类型契约
`@exarionai/soundtrace.js/native` 导出了低层类与类型，但目前
`SoundTrace.create()` 的公开返回类型仍是 facade。因此，通过 `createScene()`、
`createListener()`、`createSource()` 等 factory 的完整 direct-native TypeScript
入口流程尚未作为公开契约提供。

在公开类型扩展之前请使用 facade。对内部实现的强制类型转换和非公开的 deep import
不保证版本兼容性。
:::

此外，direct-native 控制仅限 ST。在 worker-hosted MT 上，以下 surface 会抛出
`SoundTraceMtUnsupportedError`。

- `createScene()`、`createListener()`、`createSource()`
- `createMesh()`、`createObject()`、`createCollider()`
- `materials`、`propagator`、`diagnostics`
- `createWorkletNode()`
- 同步 native getter

MT 应用请使用 facade 与 `await sound.debugSnapshot()`。

## 对象模型

| 对象 | 职责 |
|---|---|
| `SoundScene` | 拥有 object、source 和唯一 listener，并执行 propagation |
| `SoundListener` | 管理 listener 的 pose、ray 与 render 选项 |
| `SoundSource` | 管理 source 的 pose、gain 与各 path 选项 |
| `SoundMesh` | 管理三角形几何体与 BLAS |
| `SoundObject` | 管理场景 transform 与 mesh 实例 |
| `SoundCollider` | 绑定 `SoundMesh` 与 `SoundObject` 的生命周期 |
| `MaterialTable` | 注册按频段的材质 |
| `Propagator` | 查询 valid path 与 profile |
| `Diagnostics` | 查询 ray、内存与运行时诊断 |

## 场景更新

低层场景按以下顺序更新。

```ts
scene.tick(dt);
scene.updatePropagation();
```

`scene.update(dt)` 是依次执行这两个调用的简写。

场景中只有一个 listener。

```ts
scene.setListener(listener);
scene.addSource(source);
scene.addCollider(collider);
```

## 几何体变更

| 变更 | API | update type |
|---|---|---|
| 仅 transform 变化 | `object.setPosition(...)` 等 | 按 object 状态更新 |
| 仅顶点变化 | `mesh.updateVerticesAndRefit(...)` | `UpdateType.Refit` |
| 拓扑或 BVH 选项变化 | `mesh.setData(...)` | `UpdateType.Rebuild` |

Refit 用于保持拓扑的动画几何体（skinned animation、procedural 形变），请与可 refit 的
LBVH 系列搭配使用。

顶点更新在 core 中是 `exaMeshUpdateVertices` → `exaMeshRefit` 的 2-call protocol。
`mesh.updateVertices()` 只上传顶点而不会 refit BVH，因此请使用同时完成两步的
`mesh.updateVerticesAndRefit()`，或自行再调用 `mesh.refit()`。顶点数量必须与构建时完全一致。

```ts
mesh.updateVerticesAndRefit(vertices);  // updateVertices + refit
object.setUpdateType(UpdateType.Refit);
scene.tick(dt);
```

使用 `SoundCollider` 可以一次完成这两步。

```ts
collider.refitVertices(vertices);  // updateVerticesAndRefit + setUpdateType(Refit)
scene.tick(dt);
```

拓扑发生变化时需要显式 rebuild。

```ts
mesh.setData(vertices, triangles, buildOptions);
object.setUpdateType(UpdateType.Rebuild);
scene.tick(dt);
```

`collider.rebuild(vertices, triangles, buildOptions)` 会执行相同的组合。

## BVH 选择

| 类型 | 用途 |
|---|---|
| `BvhType.HKDtree` | 墙体、地面等静态几何体 |
| `BvhType.LBVH` | 顶点频繁变化的几何体 |
| `BvhType.LBVH_SIMD*` | 明确指定 SIMD 宽度的 LBVH |
| `BvhType.LBVH_NWAY*` | N-way LBVH |

`BvhType.Default` 是 per-mesh 层面「沿用引擎默认值」的 sentinel。设置进程级默认值
时请使用具体的 BVH 类型。

```ts
const buildOptions: MeshBuildOptions = {
  bvhType: BvhType.HKDtree,
  bvhMaxDepth: 0,
  primPerLeaf: 0,
};
```

## 音频

Native 实时渲染同样使用 `AudioWorkletNode`。基本契约如下。

- 采样率：`AudioContext.sampleRate`
- 块大小：128 samples
- 输出：2 通道双耳

Facade 的 `source.play()` 会管理这些设置与 graph 连接。建议在公开 factory 类型
提供之后，再在应用代码中使用 direct-native 的 `createWorkletNode()`。

## 诊断

| 需要的信息 | Facade | Native ST |
|---|---|---|
| valid path 与 profile | `await debugSnapshot()` | `Propagator` |
| ray 与内存统计 | `await debugSnapshot()` | `Diagnostics` |
| 应用设置的 pose | 实体状态 | native object getter |

在 MT 上不要用同步 getter 读取 propagation 结果。

## 相关文档

- [Web SDK 概览](../web.md)
- [Facade API](./facade.md)
- [Performance Guide](../performance.md)
