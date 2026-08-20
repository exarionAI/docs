---
title: Native API
description: soundtrace.js の single-thread 低レベル API と現在のサポート範囲です。
---

# Native API

Native API は、scene、listener、source、mesh、BVH を直接制御する必要がある高度な
single-thread 統合向けです。一般的なアプリは [Facade API](./facade.md) を使用して
ください。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
import {
  BvhType,
  PathType,
  UpdateType,
  type MeshBuildOptions,
} from '@exarionai/soundtrace.js/native';
```

## サポート範囲

:::warning 現在の公開型契約
`@exarionai/soundtrace.js/native` は低レベルのクラスと型を export しますが、現在
`SoundTrace.create()` の公開戻り値型は facade です。したがって `createScene()`、
`createListener()`、`createSource()` などの factory を使う完全な direct-native
TypeScript のエントリーフローは、まだ公開契約として提供されていません。

公開型が拡張されるまでは facade を使用してください。内部実装へのキャストや非公開の
deep import はバージョン互換性を保証しません。
:::

また direct-native 制御は ST 専用です。worker-hosted MT では次の surface が
`SoundTraceMtUnsupportedError` を送出します。

- `createScene()`、`createListener()`、`createSource()`
- `createMesh()`、`createObject()`、`createCollider()`
- `materials`、`propagator`、`diagnostics`
- `createWorkletNode()`
- 同期 native getter

MT アプリケーションは facade と `await sound.debugSnapshot()` を使用してください。

## オブジェクトモデル

| オブジェクト | 役割 |
|---|---|
| `SoundScene` | object、source、単一の listener を所有し propagation を実行 |
| `SoundListener` | listener の pose、ray と render オプションを管理 |
| `SoundSource` | source の pose、gain、path 別オプションを管理 |
| `SoundMesh` | 三角形ジオメトリと BLAS を管理 |
| `SoundObject` | シーンの transform と mesh インスタンスを管理 |
| `SoundCollider` | `SoundMesh` と `SoundObject` のライフサイクルを結合 |
| `MaterialTable` | 周波数帯域ごとのマテリアルを登録 |
| `Propagator` | valid path と profile を照会 |
| `Diagnostics` | ray、メモリ、ランタイム診断を照会 |

## シーンの更新

低レベルのシーンは次の順序で更新します。

```ts
scene.tick(dt);
scene.updatePropagation();
```

`scene.update(dt)` は 2 つの呼び出しを順に実行するショートハンドです。

シーンの listener は 1 つです。

```ts
scene.setListener(listener);
scene.addSource(source);
scene.addCollider(collider);
```

## ジオメトリの変更

| 変更 | API | update type |
|---|---|---|
| transform のみ変更 | `object.setPosition(...)` など | object の状態に合わせて更新 |
| 頂点のみ変更 | `mesh.updateVerticesAndRefit(...)` | `UpdateType.Refit` |
| トポロジーまたは BVH オプションの変更 | `mesh.setData(...)` | `UpdateType.Rebuild` |

refit はトポロジーが保たれるアニメーションジオメトリ（skinned animation、procedural 変形）に
使用します。このパスは refit 可能な LBVH 系と組み合わせてください。

頂点の更新は core の `exaMeshUpdateVertices` → `exaMeshRefit` という 2-call protocol です。
`mesh.updateVertices()` は頂点をアップロードするだけで BVH を refit しないため、両方を行う
`mesh.updateVerticesAndRefit()` を使うか、自分で `mesh.refit()` を呼んでください。頂点数は
build 時と完全に一致している必要があります。

```ts
mesh.updateVerticesAndRefit(vertices);  // updateVertices + refit
object.setUpdateType(UpdateType.Refit);
scene.tick(dt);
```

`SoundCollider` を使うと 2 つのステップを 1 回で処理できます。

```ts
collider.refitVertices(vertices);  // updateVerticesAndRefit + setUpdateType(Refit)
scene.tick(dt);
```

トポロジーが変わる場合は rebuild を明示します。

```ts
mesh.setData(vertices, triangles, buildOptions);
object.setUpdateType(UpdateType.Rebuild);
scene.tick(dt);
```

`collider.rebuild(vertices, triangles, buildOptions)` が同じ組み合わせを実行します。

## BVH の選択

| タイプ | 用途 |
|---|---|
| `BvhType.HKDtree` | 壁や床などの静的ジオメトリ |
| `BvhType.LBVH` | 頂点が頻繁に変わるジオメトリ |
| `BvhType.LBVH_SIMD*` | SIMD 幅を明示した LBVH |
| `BvhType.LBVH_NWAY*` | N-way LBVH |

`BvhType.Default` は per-mesh でエンジン既定値に従う sentinel です。プロセス全体の
既定値を決めるときは具体的な BVH タイプを使用してください。

```ts
const buildOptions: MeshBuildOptions = {
  bvhType: BvhType.HKDtree,
  bvhMaxDepth: 0,
  primPerLeaf: 0,
};
```

## オーディオ

Native のリアルタイムレンダリングも `AudioWorkletNode` を使用します。基本契約は
次のとおりです。

- サンプルレート: `AudioContext.sampleRate`
- ブロックサイズ: 128 samples
- 出力: 2 チャンネルのバイノーラル

facade の `source.play()` がこの設定と graph 接続を管理します。direct-native の
`createWorkletNode()` は、公開 factory 型が提供されたあとにアプリケーション
コードで使用することを推奨します。

## 診断

| 必要な情報 | Facade | Native ST |
|---|---|---|
| valid path と profile | `await debugSnapshot()` | `Propagator` |
| ray とメモリ統計 | `await debugSnapshot()` | `Diagnostics` |
| アプリが設定した pose | エンティティの状態 | native object getter |

MT では propagation の結果を同期 getter で読まないでください。

## 関連ドキュメント

- [Web SDK 概要](../web.md)
- [Facade API](./facade.md)
- [Performance Guide](../performance.md)
