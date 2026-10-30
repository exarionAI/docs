---
title: Facade API
description: ST と MT で同一に使える soundtrace.js の推奨 API — 生成オプション、シーン・音源・メッシュ API、ライフサイクル、EQ。
---

# Facade API

Facade は一般的な Web アプリケーションの推奨エントリポイントです。`SoundTrace` がシーンのライフサイクルを
管理し、`Listener`、`Source`、`Mesh` がアプリの 3D 状態を表現します。すべての公開メソッドは
`thread: 'st'` と `'mt'` で同一に動作し、診断はすべて非同期です。

[Web SDK 概要](../web.md) · [Native API](./native.md)

## 基本の流れ

```ts
const sound = await SoundTrace.create(audioContext, options);
sound.output.connect(audioContext.destination);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

await source.play(inputNode);      // 入力キャプチャ。出力は sound.output 1 つ
await sound.update(0);
```

## `SoundTrace` のオプション

| オプション | 既定値 | 説明 |
|---|---|---|
| `thread` | `'auto'` | `'st'`（同期伝搬）/ `'mt'`（パイプライン伝搬）。どちらも専用 Worker + pthread WASM |
| `mode` | 未指定 | `'single_thread'` / `'multi_thread'`。`thread` のエイリアスで `mode` が優先 |
| `quality` | `'balanced'` | `'fast'`、`'balanced'`、`'quality'` |
| `earlyReflectionMode` | `'hybrid'` | リアルタイムは常に Hybrid。他の値は拒否 |
| `coordinateBasis` | エンジン座標系（`+Z` forward） | レンダラーの座標系を SDK 座標系へ変換 |
| `coreBaseUrl` | パッケージ内部 | `SimpleSTRealtime.mjs/.wasm`、`SimpleSTOffline.mjs` がある URL |
| `assetBaseUrl` | パッケージ内部 | 材質 JSON と HRTF asset の URL |
| `propagationThreadCount` | 同期 1 / パイプライン 3 | 計算予算 1 ~ 5（負数 = 5）。パイプラインは最小 3 |
| `throughput` | 未指定 | `'low'` / `'medium'` / `'max'` — MT ワーカー予算の省略表記 |
| `sceneRatio` | `1.0` | シーン長さ単位あたりのメートル（cm = 0.01）。ジオメトリの事前スケールとの**併用禁止** |
| `maxSources` | `0` | 同時に生存するエンジン音源数の上限（0 ~ 512 の整数）。`0` = wasm プラットフォーム既定（32 音源 · 音源メモリ 64 MiB · 遅延リングの天井 0.5 s — ヒープが 256 MiB 固定のため保守的）。超える音源の生成はエンジンが status 11（`BUDGET_EXCEEDED`）で拒否し、既存の音源はレンダーを継続します |
| `autoLoadMaterials` | `true` | 既定材質テーブルをロードして名前マッピングを有効化 |
| `debug` | `false` | 初期化診断ログを 1 行出力 |

```ts
const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',
  quality: 'balanced',
  coordinateBasis: { right: [-1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, // Three.js
});
```

## 主な API

### `SoundTrace`

| API | 説明 |
|---|---|
| `SoundTrace.create(ctx, options?)` | エンジンを生成してロード（コンストラクタ + `load()`） |
| `output` / `audioContext` | リスナーマスター出力ノード（ステレオ）と、アプリが渡した `AudioContext` |
| `listener` | シーンの単一リスナー |
| `descriptor` | `{ transport: 'worker', thread: 'st' \| 'mt' }` — 診断用。分岐には使わない |
| `addMesh(options)` / `removeMesh(mesh)` | 音響 geometry の追加/削除 |
| `addSource(options)` | 空間音源の追加 |
| `setQuality(tier)` | 品質プリセットの変更（リスナー・音源のレイと深度） |
| `setAudioOption(options)` | 入力ブロックサイズ、出力チャンネルの override |
| `setOutputEq(eq \| null)` | グローバルな出力パラメトリック EQ（最大 16 バンド）。`null` なら無効。`reset()` 後も維持 — [EQ](#eq) |
| `loadHrtf(mode, source?)` | `'mit-kemar'` / `'sadie-d2'`（エイリアス `'convolution'` / `'steamaudio'`） |
| `loadMaterialAssets()` | 材質テーブルの手動ロード（`autoLoadMaterials: false` のとき） |
| `update(dt?)` | シーンを更新して伝搬を実行。このフレームの有効経路数で resolve |
| `debugSnapshot(options?)` | 非同期の診断スナップショット。`.simplest` に scene/timing/render/IR 統計、`features`・`output`（リミッター・種類・遅延・マスターゲイン・出力 EQ `eq`）・`inputs`（ライブ/クリップ音源数） |
| `getStatistics(options?)` | `debugSnapshot` のラッパー。`validPathCount` と `.simplest` |
| `getIRs()` | 別の Offline Worker で 9バンド early path IR を再計算 |
| `renderMonoImpulseResponse(source, sec)` | Offline Worker で 44.1 kHz モノ圧力 IR（最大 30 s） |
| `reset()` | エンジン状態の初期化（async）。Hybrid・材質・品質が再適用される |
| `dispose()` | SDK が所有するリソースの解放。冪等、`using` 互換 |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: camera.quaternion.toArray() })
  .setRenderOptions({ useDoppler: true, useLimiter: false, pathFadeTime: 0.05, maxDelaySeconds: 2 }) // useLimiter 既定 false
  .setOutputMode('hrtf');   // 'hrtf'(バイノーラル) | 'speaker'(ステレオパンニング)
```

シーンには listener が 1 つで、`SoundTrace` が所有します。`orientation` にはカメラのアクティブな回転
クォータニオン（XYZW）をそのまま渡します。頭部の傾き（roll）までエンジンに伝わります（リアルタイム・オフライン IR 分析の両方）。

`setRenderOptions` が受け取るキー:

| キー | 意味 |
|---|---|
| `earlyReflectionMode` | `'hybrid'` のみ許可 |
| `useDoppler` | 可変遅延 Doppler ピッチ — リアルタイムでは常に有効で `false` は無視されます |
| `useLimiter` | 出力リミッター。既定 `false` — アプリの Web Audio マスターバスがリミッティングを担います（SDK がレンダー開始・HRTF/出力変更・reset のたびに無効にします）。`true` なら true-peak リミッター（−1 dBTP、137 サンプル遅延） |
| `pathFadeTime` | 経路の出現/消滅クロスフェード（秒） |
| `maxDelaySeconds` | 音源ごとの遅延リングの天井（秒）。エンジンは音源ごとに経路が必要とする分だけリングを確保します（下限 0.25 s）。Web プラットフォームの既定の天井は 0.5 s |
| `diffuseEnabled` | late reverb レンダーの on/off。1 次散乱（diffuse rain）レンダーも合わせてオン/オフします |

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: { direct: true, reflection: true, diffraction: true, reverberation: true },
});

source.setPose({ position: [1, 1, -2], velocity: [0.5, 0, 0] });
source.setGain(0.8);                          // 圧力ゲイン。エンジンには energy = gain² で渡す
source.setPathEnabled('reverberation', false);
source.setDirection([0, 0, -1]);
```

| API | 説明 |
|---|---|
| `play(input, channels?)` | 入力を接続した `AudioWorkletNode` を返す。**出力は無音**で、実際の音は `sound.output` |
| `setPose(pose)` / `setGain(g)` | 位置・速度・方向、ゲイン |
| `setPathEnabled(path, on)` / `setPathOptions(o)` / `isPathEnabled(path)` | `'direct'`（透過を含む）/ `'reflection'` / `'diffraction'` / `'reverberation'` |
| `setDirection(v)` | 音源の forward。roll のない最小回転で orientation も同時に更新される |
| `setDirectivityTable(anglesDeg, attenDbPerBand)` / `setDirectivityEnabled(on)` | 角度ごとの 9バンド減衰テーブルを Sound-Tracing SDK の指向性テーブルに変換して適用 |
| `setEq(eq \| null)` | この音源のソースパラメトリック EQ（最大 16 バンド、エンジンのバンド分割の前）。`null` なら削除 — [EQ](#eq) |
| `dispose()` | 音源とストリームの解放 |

#### 距離減衰

すべての経路に物理 `1/r` 減衰と ISO 9613-1 空気吸収を適用し、参照距離（1 m）・最小距離（1 m）は
エンジンのポリシーです。音源ごとの減衰カーブオプションはありません。

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

`indices` はメッシュ全体が 1 つの材質のときに使います。面ごとの材質が必要な場合は
`{ a, b, c, materialIndex }` 形式の `triangles` を渡してください。

| API | 説明 |
|---|---|
| `setMaterial(material)` | メッシュ全体の材質を差し替え。Sound-Tracing SDK の材質は不変なので、内部的に新しい材質/メッシュハンドルへ再バインド |
| `setMaterialRange(triStart, triCount, material)` | triangle 範囲ごとの材質差し替え |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`（静的 TLAS）/ `'dynamic'`（変換のみ更新）。`'refit'`・`'rebuild'` は互換用で、メッシュを作り直す |
| `setPose(pose)` | position、orientation、scale の更新 |
| `dispose()` | メッシュとオブジェクトの解放 |

BVH は Sound-Tracing SDK が所有します（TinyBVH 既定）。メッシュごとのビルドオプションはありません。

## フレーム更新

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => { updateInFlight = undefined; });
  }
}
```

pose の変更は高速に記録できますが、伝搬の update は同時に 1 つだけ実行するのが安全です。

## ライフサイクル

`SoundTrace`、`Source`、`Mesh` は `dispose()` をサポートします。`SoundTrace.dispose()` は listener と
Worker を含め SDK が所有するリソースを片付け、複数回呼んでも安全です。

## EQ

Sound-Tracing SDK のパラメトリック EQ を 2 か所でかけます。

- **ソース EQ** — 音源信号そのものに、エンジンのバンド分割の前でかけます。その音源の直接音・反射・回折・残響がすべて同じ音色になります。
- **出力 EQ** — Sound-Tracing SDK のミックス全体に、レンダー末尾（マスターゲインの前）でかけます。

フィルターの種類は Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の 6 種（カットは 12 dB/oct 固定）、
範囲は周波数 20 ~ 20,000 Hz、ゲイン ±24 dB（Peaking・シェルフのみ）、Q 0.1 ~ 30（シェルフは 3 まで）、プリアンプ −48 ~ +12 dB です。
既定は無効で、無効の間はエンジンを呼び出さないため、出力は EQ がないときと同じです。変更された値だけを送り、エンジンが
20 ms のクロスフェードで切り替えます。

| API | かける場所 |
|---|---|
| `Source.setEq(eq \| null)` | この音源のソース EQ（最大 16 バンド）。`null` なら削除 |
| `SoundTrace.setOutputEq(eq \| null)` | グローバルな出力 EQ 1 つ。`null` なら無効。`reset()` 後も維持 |

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });
```

- `eq = { enabled = true, preampDb = 0, bands = [] }`、`band = { type = 'peaking', enabled = true, frequencyHz = 1000, gainDb = 0, q = 0.7071 }`
- `type` は Web Audio `BiquadFilterType` の名前 `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'` です。
- 範囲外の値は `RangeError` で拒否し、コマンドを送りません。`{ enabled: false }` はバンドを保持したまま素通しします。
- 適用された出力 EQ は `debugSnapshot().simplest.output.eq` にあります。

## 関連ドキュメント

- [Web SDK 概要](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
