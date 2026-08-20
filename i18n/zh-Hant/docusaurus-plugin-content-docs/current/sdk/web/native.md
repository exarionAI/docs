---
title: Native API
description: soundtrace.js 的 single-thread 低階 API 與目前支援範圍。
---

# Native API

Native API 面向需要直接控制 scene、listener、source、mesh 與 BVH 的進階
single-thread 整合。一般應用請使用 [Facade API](./facade.md)。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
import {
  BvhType,
  PathType,
  UpdateType,
  type MeshBuildOptions,
} from '@exarionai/soundtrace.js/native';
```

## 支援範圍

:::warning 目前的公開型別合約
`@exarionai/soundtrace.js/native` 匯出了低階類別與型別，但目前
`SoundTrace.create()` 的公開回傳型別仍是 facade。因此透過 `createScene()`、
`createListener()`、`createSource()` 等 factory 的完整 direct-native TypeScript
進入流程，尚未以公開合約的形式提供。

在公開型別擴充之前請使用 facade。對內部實作的強制轉型與非公開的 deep import
不保證版本相容性。
:::

此外，direct-native 控制僅限 ST。在 worker-hosted MT 上，下列 surface 會擲出
`SoundTraceMtUnsupportedError`。

- `createScene()`、`createListener()`、`createSource()`
- `createMesh()`、`createObject()`、`createCollider()`
- `materials`、`propagator`、`diagnostics`
- `createWorkletNode()`
- 同步 native getter

MT 應用請使用 facade 與 `await sound.debugSnapshot()`。

## 物件模型

| 物件 | 角色 |
|---|---|
| `SoundScene` | 擁有 object、source 與唯一的 listener，並執行 propagation |
| `SoundListener` | 管理 listener 的 pose、ray 與 render 選項 |
| `SoundSource` | 管理 source 的 pose、gain 與各 path 選項 |
| `SoundMesh` | 管理三角形幾何體與 BLAS |
| `SoundObject` | 管理場景 transform 與 mesh 實例 |
| `SoundCollider` | 綁定 `SoundMesh` 與 `SoundObject` 的生命週期 |
| `MaterialTable` | 註冊依頻段的材質 |
| `Propagator` | 查詢 valid path 與 profile |
| `Diagnostics` | 查詢 ray、記憶體與執行階段診斷 |

## 場景更新

低階場景依下列順序更新。

```ts
scene.tick(dt);
scene.updatePropagation();
```

`scene.update(dt)` 是依序執行這兩個呼叫的簡寫。

場景中只有一個 listener。

```ts
scene.setListener(listener);
scene.addSource(source);
scene.addCollider(collider);
```

## 幾何體變更

| 變更 | API | update type |
|---|---|---|
| 僅 transform 變更 | `object.setPosition(...)` 等 | 依 object 狀態更新 |
| 僅頂點變更 | `mesh.updateVerticesAndRefit(...)` | `UpdateType.Refit` |
| 拓撲或 BVH 選項變更 | `mesh.setData(...)` | `UpdateType.Rebuild` |

Refit 用於維持拓撲的動畫幾何體（skinned animation、procedural 形變），請與可 refit 的
LBVH 系列搭配使用。

頂點更新在 core 中是 `exaMeshUpdateVertices` → `exaMeshRefit` 的 2-call protocol。
`mesh.updateVertices()` 只會上傳頂點而不會 refit BVH，因此請使用同時完成兩步的
`mesh.updateVerticesAndRefit()`，或自行再呼叫 `mesh.refit()`。頂點數量必須與建置時完全一致。

```ts
mesh.updateVerticesAndRefit(vertices);  // updateVertices + refit
object.setUpdateType(UpdateType.Refit);
scene.tick(dt);
```

使用 `SoundCollider` 可以一次完成這兩個步驟。

```ts
collider.refitVertices(vertices);  // updateVerticesAndRefit + setUpdateType(Refit)
scene.tick(dt);
```

拓撲改變時需明確指定 rebuild。

```ts
mesh.setData(vertices, triangles, buildOptions);
object.setUpdateType(UpdateType.Rebuild);
scene.tick(dt);
```

`collider.rebuild(vertices, triangles, buildOptions)` 會執行相同的組合。

## BVH 選擇

| 類型 | 用途 |
|---|---|
| `BvhType.HKDtree` | 牆面、地板等靜態幾何體 |
| `BvhType.LBVH` | 頂點經常變動的幾何體 |
| `BvhType.LBVH_SIMD*` | 明確指定 SIMD 寬度的 LBVH |
| `BvhType.LBVH_NWAY*` | N-way LBVH |

`BvhType.Default` 是 per-mesh 層級「沿用引擎預設值」的 sentinel。設定 process 層級
的預設值時請使用具體的 BVH 類型。

```ts
const buildOptions: MeshBuildOptions = {
  bvhType: BvhType.HKDtree,
  bvhMaxDepth: 0,
  primPerLeaf: 0,
};
```

## 音訊

Native 即時渲染同樣使用 `AudioWorkletNode`。基本合約如下。

- 取樣率：`AudioContext.sampleRate`
- 區塊大小：128 samples
- 輸出：2 聲道雙耳

Facade 的 `source.play()` 會管理這些設定與 graph 連接。建議在公開 factory 型別
提供之後，再於應用程式碼中使用 direct-native 的 `createWorkletNode()`。

## 診斷

| 需要的資訊 | Facade | Native ST |
|---|---|---|
| valid path 與 profile | `await debugSnapshot()` | `Propagator` |
| ray 與記憶體統計 | `await debugSnapshot()` | `Diagnostics` |
| 應用設定的 pose | 實體狀態 | native object getter |

在 MT 上請勿以同步 getter 讀取 propagation 結果。

## 相關文件

- [Web SDK 概覽](../web.md)
- [Facade API](./facade.md)
- [Performance Guide](../performance.md)
