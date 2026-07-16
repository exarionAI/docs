---
title: Web
description: soundtrace.js WebAssembly SDK の導入方法と、HRTF モード、品質プリセット、CPU/MT/WebGPU バックエンド、公式統合デモについて説明します。
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# Web SDK

**soundtrace.js** は、ブラウザーから [STCoreV2](../core/stcorev2.md) を使用するための
TypeScript/WebAssembly SDK です。レンダーシーンのメッシュ、マテリアル、音源、
リスナーを Sound Tracing シーンに接続し、Web Audio グラフへ空間オーディオ出力を
提供します。

## 現行 SDK の要点

| 項目 | 推奨ワークフロー |
|---|---|
| HRTF | 軽量な `Band8` または計測ベースの指向性レンダリングを行う `Parametric` を選択 |
| バックエンド | `Single Thread`、`Multi Thread`、`WebGPU` から選択 |
| 品質 | `Fast`、`Balanced`、`Quality` プリセットから選択 |
| マテリアル | `Concrete`、`Steel`、`Marble`、`Snow`、`Soil` などのプリセットを使用 |
| 低レベル設定 | レイ解像度、深度、レンダリング予算はプリセットに任せる |

## Web デモ

埋め込みデモは
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing) の最新ビルドです。
1 つのアプリケーションに 3 つのシーンが含まれています。

| シーン | 確認できる機能 |
|---|---|
| Capability | WebAssembly、AudioWorklet、SharedArrayBuffer、WebGPU の対応状況 |
| Shoebox | 音源／リスナーの移動、マテリアル、反射経路、品質プリセット |
| Multiroom | 複数音源、ドア、遮蔽、部屋間の伝搬 |

<iframe
  title="Sound-tracing.js 統合デモ"
  src={useSharedStaticUrl('/demos/three-basic/')}
  style={{width: '100%', height: '576px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

上部ナビゲーションでシーンを切り替えられます。空間オーディオの評価には、
ヘッドフォンと最新の Chrome を推奨します。

## 要件

- Node.js 20 以降
- Web Audio API と AudioWorklet に対応した最新ブラウザー
- `Multi Thread` では COOP/COEP と `crossOriginIsolated === true`
- `WebGPU` では `navigator.gpu` を公開するブラウザーと GPU
- ライセンス済み SDK ディストリビューション

## ライセンス SDK のインストール

評価版およびライセンス版は ZIP で配布される場合があります。公式デモでは、
次のディレクトリ構成を使用します。

```text
your-project/
└─ vendor/
   └─ sound-tracing/
      └─ sdk/
         ├─ index.js
         ├─ core/
         │  ├─ st/
         │  └─ mt/
         └─ assets/
```

ZIP のルートにある `sdk/` ディレクトリを、正確に
`vendor/sound-tracing/sdk/` へ配置します。`.env.local` は使用しません。
開発時は、リポジトリに含まれるランタイムマニフェストが次のエントリーを解決します。

```text
/vendor-runtime/sound-tracing/sdk/index.js
```

Vite の開発配信と本番コピーについては、リポジトリの
[`vite.config.ts`](https://github.com/exarionAI/Sound-tracing/blob/dev/vite.config.ts)
を参照してください。

## クイックスタート

ユーザーのクリックまたはタップハンドラー内で実行してください。

```ts
const { SoundTrace } = await import(
  '/vendor-runtime/sound-tracing/sdk/index.js'
);

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

### Band8

`Band8` は外部 HRTF テーブルを必要としない軽量レンダリング経路です。
`loadHrtf()` を呼び出さない場合、コアはこの経路を使用します。

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
});
```

### Parametric

コンパクトな KU100 計測パラメトリックテーブルを明示的に読み込みます。

```ts
await sound.loadHrtf('parametric');
```

主要な製品ガイドでは `Band8` と `Parametric` を扱います。SDK には高度な HRIR
ローダーも含まれますが、対象プラットフォームでアセットサイズとレンダリング負荷を
検証した後に導入してください。

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

メッシュにマテリアル名またはインデックスを割り当てます。

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',
});
```

まず同梱プリセットを使用してください。8 バンドの反射、吸収、透過値を直接編集する
方法は、カスタム音響マテリアル向けの高度なワークフローです。

## トラブルシューティング

| 症状 | 確認項目 |
|---|---|
| 音が出ない | ユーザージェスチャー内で先に `AudioContext.resume()` を呼び出す |
| MT の起動に失敗する | COOP/COEP、SharedArrayBuffer、`crossOriginIsolated` を確認 |
| GPU が有効にならない | `navigator.gpu` とハードウェアアクセラレーションを確認。CPU フォールバックは正常動作 |
| 方向が反転する | レンダラー固有の `coordinateBasis` を確認 |
| SDK エントリーが 404 | `vendor/sound-tracing/sdk/index.js` とランタイムマニフェストを確認 |
| 性能が低い | 詳細調整の前に品質プリセットを下げ、経路可視化を無効化 |

## 次に読む

- [SDK 概要](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
- [デモ](../demos/overview.md)
