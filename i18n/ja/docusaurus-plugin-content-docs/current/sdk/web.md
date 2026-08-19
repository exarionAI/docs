---
title: Web
description: soundtrace.js WebAssembly SDK の導入方法と、HRTF モード、品質プリセット、CPU/MT/WebGPU バックエンドについて説明します。
---

# Web SDK

**soundtrace.js** は、ブラウザーから [STCoreV2](../core/stcorev2.md) を使用するための
TypeScript/WebAssembly SDK です。レンダーシーンのメッシュ、マテリアル、音源、
リスナーを Sound Tracing シーンに接続し、Web Audio グラフへ空間オーディオ出力を
提供します。

## 現行 SDK の要点

| 項目 | 推奨ワークフロー |
|---|---|
| HRTF | 既定はコア内蔵の HRIR テーブル（ロード不要）。パラメトリック指向性レンダリングは `loadHrtf('parametric')` |
| バックエンド | `Single Thread`、`Multi Thread`、`WebGPU` から選択 |
| 品質 | `Fast`、`Balanced`、`Quality` プリセットから選択 |
| マテリアル | `concrete`、`wood`、`glass`、`metal` などの名前でマテリアルプリセットを指定 |
| 低レベル設定 | レイ解像度、深度、レンダリング予算はプリセットに任せる |

## 要件

- Node.js 20 以降
- Web Audio API と AudioWorklet に対応した最新ブラウザー
- `Multi Thread` では COOP/COEP と `crossOriginIsolated === true`
- `WebGPU` では `navigator.gpu` を公開するブラウザーと GPU
- ライセンス済み SDK ディストリビューション

## インストール

`soundtrace.js` はライセンス契約に基づいて提供される非公開パッケージ
`@exarionai/soundtrace.js` です。配布物を受け取ったら、以下の例と同じ import
指定子をそのまま使用します。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

パッケージは WASM コア（`core/st`、`core/mt`）とマテリアル/HRTF アセットを同梱し、
実行時に直接 fetch します。バンドラーがこのモジュールグラフを事前バンドルすると
worker と wasm の読み込みが壊れるため、Vite では事前バンドルの対象から除外します。

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

コアとアセットを自前でホストする場合は、`coreBaseUrl` と `assetBaseUrl` で URL を
指定します。詳細は [Facade API](./web/facade.md) を参照してください。

## クイックスタート

ユーザーのクリックまたはタップハンドラー内で実行してください。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});

const room = sound.addMesh({
  vertices,
  indices,
  material: 'concrete',
});

const source = sound.addSource({
  position: [2, 1.5, -1],
  gain: 1,
});

sound.listener.setPose({
  position: [0, 1.7, 0],
});

await sound.update(0);
```

Three.js のカメラは `-Z` を向くため、上記の座標基底を使用します。基底が正しくないと、
HRTF の左右または前後方向が反転します。

## HRTF の選択

コアは listener の生成時に min-phase HRIR テーブルを組み込んだ状態で開始します。
そのため `loadHrtf()` を呼ばなくてもバイノーラルレンダリングは動作し、これが既定の
経路です。

計測データを縮約した KU100 parametric テーブルに切り替えるには明示的にロードします。

```ts
await sound.loadHrtf('parametric');
```

| 呼び出し | 使用するテーブル | 追加アセット |
|---|---|---|
| （呼ばない） | コア内蔵 min-phase HRIR | なし |
| `loadHrtf('parametric')` | KU100 parametric | `KU100_bprime.bin` |
| `loadHrtf('convolution')` | コア内蔵 HRIR（最近傍ルックアップに切り替え） | なし |
| `loadHrtf('steamaudio')` | SADIE H12 HRIR | `sadie_h12_steamaudio.bin` |

アプリケーションが持つテーブルを使う場合は、第 2 引数に URL、`ArrayBuffer`、
typed array を渡します。

```ts
await sound.loadHrtf('parametric', '/assets/my-hrtf.bin');
```

:::note
8 バンドの振幅と ITD でレンダリングする `Band8` スペシャライザーはコアに存在します
が、facade からは選択できません。`setRenderOptions()` は `hrtfMode` キーを拒否し、
切り替えは native の `setHrtfMode()` からのみ可能です。
:::

## バックエンドの選択

| モード | コード | 要件 | 動作 |
|---|---|---|---|
| Single Thread | `mode: 'single_thread'` | 通常のブラウザーホスティング | 最も単純な CPU 経路 |
| Multi Thread | `mode: 'multi_thread'` | COOP/COEP と SharedArrayBuffer | Worker 上で動作する MT CPU 経路 |
| WebGPU | `mode: 'gpu'` | WebGPU | GPU 伝搬を試行し、失敗時は CPU にフォールバック |

### Multi Thread の配信ヘッダー

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

専用 Worker が MT エンジンセッションを所有し、メインスレッドは UI と Web Audio を
所有します。Transform 更新には高速ステート経路を使用し、生成／削除、マテリアル、
メッシュ操作には順序付きコマンド経路を使用します。

### WebGPU

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'gpu',
  quality: 'balanced',
});
```

現在の自動 WebGPU 経路は Single Thread コアと組み合わせて使用します。
`mode: 'gpu'` と `thread: 'mt'` を同時に強制しないでください。GPU 初期化に失敗した
場合、SDK は CPU で処理を継続します。

## 品質プリセット

| プリセット | 推奨用途 |
|---|---|
| `fast` | モバイル、低消費電力デバイス、多数の同時音源 |
| `balanced` | 通常のデスクトップおよび製品統合の既定値 |
| `quality` | ハイエンドデスクトップおよび品質優先デモ |

```ts
sound.setQuality('quality');
```

プリセットは伝搬処理と HRTF／Diffuse レンダリング予算をまとめて調整します。
性能が不足する場合は、個別のレイ設定を変更する前に
`quality → balanced → fast` の順で下げてください。

## Web Audio への接続

```ts
const player = audioContext.createBufferSource();
player.buffer = decodedBuffer;
player.loop = true;

const spatialNode = await source.play(player);
spatialNode.connect(sound.output).connect(audioContext.destination);
player.start();
```

アプリケーションが `AudioContext` と再生ノードを所有します。soundtrace.js は
音源ごとの空間ノードとマスター出力を提供します。

## 更新と破棄

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25] });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);

sound.dispose();
await audioContext.close();
```

## マテリアルプリセット

メッシュにはマテリアル名またはインデックスを指定します。既定のマテリアルテーブルは
22 種類で、名前は次の 10 個の canonical name に解決されます。

| Canonical name | 認識されるエイリアス（一部） |
|---|---|
| `concrete` | cement、beton、pavement、sidewalk |
| `wood` | plank、timber、oak、pine、bamboo |
| `glass` | window、mirror、crystal |
| `metal` | steel、iron、aluminum、copper、brass |
| `brick` | tile、ceramic、terracotta |
| `fabric` | cloth、textile、carpet、curtain |
| `plastic` | rubber、vinyl、pvc |
| `water` | liquid、pool |
| `grass` | vegetation、leaves、lawn |
| `sand` | dirt、gravel、soil、mud |

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',   // metal のエイリアス
});
```

:::warning
テーブルにない名前は例外を投げず、既定のマテリアル（インデックス `0`、`concrete`）に
無言でフォールバックします。タイプミスでも音は鳴るため、マテリアルが意図どおりに
適用されたか確認するには上の表の名前を使用してください。
:::

まずは同梱プリセットを使い、8 バンドの reflection/absorption/transmission の値を
直接編集するのは、カスタム音響マテリアルがどうしても必要な場合に限定してください。

## トラブルシューティング

| 症状 | 確認項目 |
|---|---|
| 音が出ない | ユーザージェスチャー内で先に `AudioContext.resume()` を呼び出す |
| MT の起動に失敗する | COOP/COEP、SharedArrayBuffer、`crossOriginIsolated` を確認 |
| GPU が有効にならない | `navigator.gpu` とハードウェアアクセラレーションを確認。CPU フォールバックは正常動作 |
| 方向が反転する | レンダラー固有の `coordinateBasis` を確認 |
| マテリアルが効いていないように聞こえる | 名前が上の canonical name / エイリアス表にあるか確認（無い名前は既定マテリアルにフォールバック） |
| コア/アセットが 404 | バンドラーがパッケージを事前バンドルしていないか、`coreBaseUrl`・`assetBaseUrl` が正しいかを確認 |
| 性能が低い | 詳細調整の前に品質プリセットを下げ、経路可視化を無効化 |

## 次に読む

- [SDK 概要](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
