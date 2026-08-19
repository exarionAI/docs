---
title: Facade API
description: ST と MT で同じように使う soundtrace.js の推奨 API です。
---

# Facade API

Facade は一般的な Web アプリケーションの推奨エントリーポイントです。`SoundTrace`
がシーンのライフサイクルを管理し、`Listener`、`Source`、`Mesh` がアプリの 3D
状態を表現します。

[Web SDK 概要](../web.md) · [Native API](./native.md)

## 基本の流れ

```ts
const sound = await SoundTrace.create(audioContext, options);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

const spatial = await source.play(inputNode);
spatial.connect(sound.output).connect(audioContext.destination);

await sound.update(0);
```

この呼び出しの流れは ST でも worker-hosted MT でも同じです。MT では同期の native
getter ではなく、`debugSnapshot()` のような非同期リードバックを使用します。

## `SoundTrace` のオプション

| オプション | 既定値 | 説明 |
|---|---|---|
| `mode` | 未指定 | `'single_thread'`、`'multi_thread'`、`'gpu'` のいずれか |
| `thread` | `'auto'` | 高度な WASM 選択: `'auto'`、`'st'`、`'mt'`。`mode` が優先 |
| `quality` | `'balanced'` | `'fast'`、`'balanced'`、`'quality'` |
| `throughput` | 未指定 | MT worker の予算: `'low'`、`'medium'`、`'max'` |
| `coordinateBasis` | コア座標系 | レンダラーの座標系を SDK の座標系へ変換 |
| `coreBaseUrl` | パッケージ内 | `st/`、`mt/` を含むコアの URL |
| `assetBaseUrl` | パッケージ内 | マテリアルと HRTF アセットの URL |
| `propagationThreadCount` | エンジン既定値 | MT propagation スレッド数の低レベル override |
| `defaultMeshBuild` | エンジン既定値 | `addMesh()` が使う既定の BVH build オプション |
| `sceneRatio` | `1.0` | シーンの長さ単位あたりのメートル。ジオメトリの事前スケールとの併用は禁止（二重スケール） |
| `autoLoadMaterials` | `true` | 既定マテリアルをロードし、名前ベースのマッピングを有効化 |
| `transmissionModel` | `'surface'` | 直接音がマテリアルを透過する際のエネルギー減衰モデル。[マテリアル透過モデル](#マテリアル透過モデル)を参照 |
| `debug` | `false` | 初期化診断ログを出力 |

Three.js はカメラが `-Z` を向くため、次の basis から始められます。

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

## 主な API

### `SoundTrace`

| API | 説明 |
|---|---|
| `SoundTrace.create(ctx, options?)` | エンジンを生成してロード（コンストラクター + `load()`） |
| `output` / `audioContext` | master output ノードと、アプリが渡した `AudioContext` |
| `listener` | シーン唯一のリスナー |
| `addMesh(options)` | 音響ジオメトリを追加 |
| `removeMesh(mesh)` | ジオメトリを削除 |
| `addSource(options)` | 空間音源を追加 |
| `setQuality(tier)` | 品質プリセットを変更 |
| `setAudioOption(options)` | ブロックサイズと出力チャンネルを override |
| `loadHrtf(mode, source?)` | 同梱またはカスタムの HRTF をロード |
| `loadMaterialAssets()` | マテリアルテーブルを手動ロード（`autoLoadMaterials: false` のとき） |
| `enableGpu()` | WebGPU 伝播を有効化し成否を返す。非対応なら `false` で CPU を維持 |
| `update(dt?)` | シーンを更新して propagation を実行 |
| `debugSnapshot(options?)` | MT 互換の非同期診断スナップショット |
| `getStatistics(options?)` | valid path・ray・メモリ統計（async） |
| `getGpuStats()` | GPU の dispatch/fallback カウンター（async） |
| `getIRs()` | 直近 propagation の path 別インパルス応答（async） |
| `renderMonoImpulseResponse(source, sec)` | オフライン mono IR レンダリング。出力チャンネルが 1 のときのみ |
| `reset()` | エンジン状態をリセット（async） |
| `dispose()` | SDK 所有のリソースを解放。冪等で `using` に対応 |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: [0, 0, 0, 1] })
  .setRenderOptions({ hrtfQuality: 'medium' });
```

シーンにリスナーは 1 つです。リスナーは `SoundTrace` が所有するため、個別に
dispose しません。

出力レンダラーは `setOutputMode()` で切り替えます。既定の `'hrtf'` はバイノーラル
レンダラー、`'speaker'` は内部の Ambisonic スピーカーレンダラー（1ch/2ch）です。
HRTF モードとロード済み HRTF テーブルは `'hrtf'` 出力にのみ適用されます。

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

`play(input, channels?)` は入力を接続した `AudioWorkletNode` を返します。出力は
アプリが `sound.output` または別の Web Audio graph に接続します。

#### 距離減衰

`addSource()` は 5 種類すべての path に、既定の距離減衰係数
`{ constant: 1, linear: 0, quadratic: 1 }` を適用します。

```text
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

つまり既定のカーブは `1 / (1 + distance²)` です。`constant = 1` が距離 0 付近での
発散を防ぎ、`quadratic = 1` が逆二乗に近い減衰を作ります。

#### 指向性

音源に指向性を持たせるには、角度ごとの帯域減衰テーブルを登録して有効化します。

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

`indices` はメッシュ全体で 1 つのマテリアルを使う場合に便利です。面ごとに
マテリアルが必要な場合は、`{ a, b, c, materialIndex }` 形式の `triangles` を
渡してください。

生成後もマテリアルと更新ポリシーを変更できます。

| API | 説明 |
|---|---|
| `setMaterial(material)` | メッシュ全体のマテリアルを差し替え |
| `setMaterialRange(triStart, triCount, material)` | 三角形の範囲ごとにマテリアルを差し替え |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`、`'refit'`、`'rebuild'`、`'dynamic'` |
| `setPose(pose)` | position、orientation、scale を更新 |
| `dispose()` | メッシュと collider を解放 |

動かない壁は `'static'`、頂点だけが変わるジオメトリは `'refit'`、トポロジーが
変わる場合は `'rebuild'` を使用します。

## マテリアル透過モデル

`transmissionModel` は、直接音が壁などのマテリアルを通過する際のエネルギーの
失われ方を選択します。

| 値 | 動作 |
|---|---|
| `'surface'`（既定） | 表面を通過するたびにマテリアルの透過係数を 1 回適用。壁の厚みとは無関係 |
| `'solid'` | 厚みを考慮: ray が solid 内部を進む距離に、マテリアルごとの帯域別の厚みを適用。厚い壁ほど強く遮る |

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  transmissionModel: 'solid',
});
```

`'solid'` は厚みが定義されたマテリアルのみを切り替え、厚みのないマテリアルは
`'surface'` の動作を維持します。既定のマテリアルテーブルでは 22 種類のうち
15 種類が厚みを持ちます。

:::warning
opt-in のオプションです。壁越しの音源の大きさが変わるため、既存シーンのサウンドを
維持する必要がある場合は既定値のままにしてください。
:::

## 伝播 path cache

すべてのセッションは propagation path cache が**有効な状態**で開始します（固定
seed、サイズ 512）。ST と MT の両方で最初のフレーム前に適用され、`reset()` 後にも
再適用されるため、キャッシュを有効にするために呼ぶ API はありません。

## フレーム更新

pose の変更は高速に記録できますが、propagation update は同時に 1 つだけ実行するのが
安全です。

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

## ライフサイクル

`SoundTrace`、`Source`、`Mesh` は `dispose()` に対応しています。
`SoundTrace.dispose()` はリスナーを含む SDK 所有のリソースをすべて片付け、複数回
呼び出しても安全です。

```ts
source.dispose();
mesh.dispose();
sound.dispose();
```

## 関連ドキュメント

- [Web SDK 概要](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
