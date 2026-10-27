---
title: Web
description: soundtrace.js 1.1.0 — SimpleST ABI 6 WebAssembly SDK のインストール、配信要件、HRTF、品質プリセット、材質、トラブルシューティング。
---

# Web SDK

**soundtrace.js** は、[SimpleST](../core/simplest.md) をブラウザーで使うための TypeScript/WebAssembly
SDK です。Three.js のようなレンダリングシーンのメッシュ・材質・音源・リスナーを Sound Tracing のシーンに接続し、
Web Audio graph に空間化されたステレオ出力を提供します。

1.0.0 からエンジンが STCoreV2 から SimpleST に変わり、1.1.0 は **SimpleST 2.18.2 / ABI 6** を使います
（以前のリリース: 1.0.0 = SimpleST 2.12.0）。SDK リリース 2.18.2-jhj.7 ではパッケージバージョンはそのままで、`maxSources`
オプション（音源数の上限）が入りました。既存の
呼び出し側は変わりません。`SoundTrace`、`Source`、`Mesh`、`Listener` の facade は維持されますが、STCoreV2 と比べて
バックエンド・HRTF・材質・オプションの契約が変わっています。
全オプションとエンティティ API は [Facade API](./web/facade.md)、低レベルの SimpleST モジュールアクセスは
[Native API](./web/native.md) を参照してください。

![soundtrace.js の構造](/img/web/architecture.png)

## 現行 SDK の要点

| 項目 | 現在の動作 |
|---|---|
| エンジン | SimpleST Realtime（pthreads WASM）+ Offline（シングルスレッド、IR 解析専用） |
| 実行モード | `single_thread`（同期伝搬）/ `multi_thread`（パイプライン伝搬）。**どちらも専用 Worker + pthread WASM** |
| 初期反射 | 常に **Hybrid**。レンダー開始・HRTF 変更・reset の後も再適用 |
| HRTF | 内蔵 MIT KEMAR（`'mit-kemar'`）、同梱 SADIE II D2（`'sadie-d2'`） |
| 品質 | `fast` / `balanced` / `quality` — リスナー・音源のレイ格子と反射深度をまとめて設定 |
| 材質 | 9バンド（63 Hz ~ 16 kHz）SoundTrace ゲーム材質 22 種、名前・エイリアス・インデックスで指定 |
| 出力 | 音源ごとにモノ入力、リスナーレンダラーがステレオ 1 本をミックス（`sound.output`） |
| 音源の上限 | 既定 32 音源 · 音源メモリ 64 MiB · 遅延リングの天井 0.5 s。音源数は `maxSources` オプションで変更します — [音源メモリ予算](../core/simplest.md#音源メモリ予算) |
| GPU | なし。`mode: 'gpu'`、`enableGpu()` はエラー |

## 要件

- Node.js 20 以上（ビルドツール）、最新の Chromium 系ブラウザーを推奨
- HTTPS または localhost
- AudioWorklet、SharedArrayBuffer、**cross-origin isolation** — ST/MT のどちらでも必要です
  （非隔離フォールバックはありません）
- ライセンス SDK 配布物（vendor ZIP または npm tgz）

## インストール

`soundtrace.js` はライセンス契約で提供される非公開パッケージ `@exarionai/soundtrace.js` です。
配布物は 2 形態です。

| 形態 | ファイル | インストール |
|---|---|---|
| vendor ツリー | `soundtrace-js-release-vendor.zip`（ルート `sdk/`） | 静的パスに展開して配信。同梱の `install.py` がハッシュ検証後に `vendor/sound-tracing/sdk` へインストール |
| npm パッケージ | `exarionai-soundtrace.js-1.1.0.tgz` | `npm install /absolute/path/exarionai-soundtrace.js-1.1.0.tgz` |

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

パッケージは WASM コア（`core/SimpleSTRealtime.mjs/.wasm`、`core/SimpleSTOffline.mjs`）と材質・HRTF
asset を同梱し、ランタイムに fetch します。バンドラーがこのモジュールグラフを事前バンドルすると Worker と
WASM のロードが壊れるため、Vite では事前バンドルの対象から除外し、静的 vendor ツリーとして提供します。

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

コアと asset を自前でホスティングする場合は `coreBaseUrl`、`assetBaseUrl` オプションで URL を指定します。
`.mjs` は JavaScript、`.wasm` は `application/wasm` の MIME で配信してください。

### 配信ヘッダー

ページ応答と **Worker スクリプト応答の両方**に次のヘッダーが必要です。

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## クイックスタート

次のコードはユーザーのクリックやタップイベント内で実行する必要があります。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',              // 'st' = 同期伝搬, 'mt' = パイプライン伝搬(推奨)
  quality: 'balanced',
  earlyReflectionMode: 'hybrid',
  coordinateBasis: {         // Three.js: カメラは -Z を向く
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
sound.output.connect(audioContext.destination);

const room = sound.addMesh({ vertices, indices, material: 'concrete' });
const source = sound.addSource({ position: [2, 1.5, -1], gain: 1 });
sound.listener.setPose({ position: [0, 1.7, 0] });

const player = audioContext.createBufferSource();
player.buffer = decodedMonoBuffer;
player.loop = true;
await source.play(player);     // 入力キャプチャノード。出力は無音 — 音は sound.output から出る
await sound.update(0);
player.start();
```

SimpleST の座標系は Unity と同じ `+Z` forward です。Three.js のように `-Z` を見るレンダラーでは、上の
`coordinateBasis` を指定しないと左右・前後が合いません。

## 実行モード

| オプション | 伝搬 | 説明 |
|---|---|---|
| `thread: 'st'` / `mode: 'single_thread'` | 同期（SYNCHRONOUS） | `update()` が伝搬を終えてから返る。既定の計算予算 1 |
| `thread: 'mt'` / `mode: 'multi_thread'` | パイプライン（PIPELINED） | Direct / Reflection-Diffraction / Reverb レーンがワーカーで独立実行。既定予算 3 |

どちらのモードも専用 Worker がエンジンセッションを所有し、同じ pthread WASM を使います。配布 pthread
pool は 5 で、`propagationThreadCount` は 1 ~ 5 です。メインスレッドは UI と Web Audio graph だけを
維持し、位置更新は共有メモリレーンで、生成/削除/材質変更は順序が保証されるコマンド経路で
伝達されます。

## HRTF の選択

| 呼び出し | テーブル | 追加 asset |
|---|---|---|
| （呼び出さない） | 内蔵 MIT KEMAR（SDK 既定）。`setOutputMode('speaker')` でステレオパンニングに切り替え | なし |
| `loadHrtf('mit-kemar')` または `'convolution'` | エンジン内蔵 MIT KEMAR 128 タップ | なし |
| `loadHrtf('sadie-d2')` または `'steamaudio'` | SADIE II D2 KEMAR 8,802 方向 256 タップ | `SADIE_D2_44K_16bit_256tap.hrtfbin` |

旧 KU100 parametric / convolution / SADIE H12 テーブルと `Band8` モードはもうありません。
`loadHrtf('parametric')` はエラーです。

```ts
await sound.loadHrtf('sadie-d2');
sound.listener.setOutputMode('speaker');   // 'hrtf'(既定) | 'speaker'(ステレオパンニング)
```

## 品質プリセット

| プリセット | リスナー guide ray | 音源 transport ray | 反射深度 | 用途 |
|---|---|---|---|---|
| `fast` | `8 × 8` | `8 × 8` | 4 | モバイル、多数の同時音源 |
| `balanced`（既定） | `16 × 16` | `16 × 16` | 6 | デスクトップ既定 |
| `quality` | `24 × 24` | `24 × 24` | 8 | 品質優先のデモ |

```ts
sound.setQuality('quality');
```

`'speed'`・`'middle'` はそれぞれ `fast`・`balanced` の廃止予定エイリアスです。性能問題が出た場合は、個別の
レイ数を触る前に `quality → balanced → fast` の順に下げてください。

## 材質

メッシュには材質の名前、エイリアス、またはインデックスを指定します。既定テーブルは SoundTrace ゲーム材質
22 種で、Unity SDK と同じ表・同じインデックスです。測定データではなくゲーム用プリセットで、すべての値は
9バンド R/A/T/scattering です。既存の 8バンド（63 Hz ~ 8 kHz）値から反射 R と透過 T はそのまま残し、
吸収は A = 1 − R − T、16 kHz バンドは 8 kHz の値を繰り返し、scattering は 9バンドに同じ値として変換しました。

名前とエイリアスは大文字・小文字を区別しません。材質名は元の綴りのままです（`Sherdded-woodFiberborad`）。

| インデックス | 材質名 | エイリアス |
|---:|---|---|
| 0 | `Concrete` | `cement`、`콘크리트` |
| 1 | `Fabric` | `cloth`、`carpet`、`curtain`、`천`、`카펫` |
| 2 | `Wood` | `timber`、`나무`、`목재` |
| 3 | `Brick` | `bricks`、`벽돌` |
| 4 | `ConcreteBlock` | `concrete block`、`cinder block`、`블록` |
| 5 | `Glass` | `window`、`유리`、`창문` |
| 6 | `Gravel` | `자갈` |
| 7 | `GypsumBoard` | `gypsum`、`drywall`、`석고보드` |
| 8 | `Linoleum,RubberOrAsphaltTile` | `linoleum`、`rubber`、`tile`、`vinyl`、`리놀륨`、`고무` |
| 9 | `Marble` | `대리석` |
| 10 | `Plaster` | `회반죽`、`플라스터` |
| 11 | `Plywood` | `합판` |
| 12 | `Sherdded-woodFiberborad` | `shreddedWoodFiberboard`、`woodFiberboard`、`fiberboard`、`목모보드` |
| 13 | `Snow` | `눈` |
| 14 | `Soil` | `dirt`、`earth`、`ground`、`흙` |
| 15 | `Steel` | `metal`、`iron`、`철`、`금속` |
| 16 | `Stone` | `rock`、`돌` |
| 17 | `WaterSurface` | `water`、`물` |
| 18 | `TunableAbsorber` | `absorber` |
| 19 | `LowVarianceTarget` | — |
| 20 | `ConcreteBlockPainted` | `painted concrete block` |
| 21 | `FiberglassReinforcedPlastic` | `fiberglass`、`frp` |

エイリアスの正本はパッケージの `assets/soundMaterialAlias.json`、材質の値は `assets/soundMaterial.json` です。

```ts
sound.addMesh({ vertices, indices, material: 'GypsumBoard' });
sound.addMesh({ vertices, indices, material: '유리' });   // → Glass (5)
```

:::warning
テーブルにない名前は例外を出さず、既定材質（`defaultMaterialType = 0`、`Concrete`）に黙って
置き換えられます。以前のドキュメントの `BRAS_*` 名もテーブルにないため `Concrete` になります。材質が
意図どおり適用されているか確認するには、上の名前かエイリアスを正確に使ってください。
:::

材質を直接定義するには、バンドごとに `R + A + T = 1`（許容誤差 0.001）を満たす 9 個の値を 4 組
渡します。配列の長さが 9 でなければエラーです。

## Web Audio への接続

```ts
const node = await source.play(player);  // AudioWorkletNode: 入力キャプチャ用、出力は無音
sound.output.connect(audioContext.destination);
```

`soundtrace.js` は `AudioContext` を作成しません。アプリが context と再生ノードを所有し、
SDK は音源ごとの**入力キャプチャノード**と**リスナーマスター出力**（`sound.output`）を 1 つ提供します。
音源ごとの出力エフェクトは `sound.output` の後ろへ移す必要があります。

SDK は出力リミッターを**無効の状態**にしておきます。SimpleST 2.18 は生成直後に true-peak リミッター（−1 dBTP、137 サンプル
遅延）を有効にしますが、`sound.output` の後ろの Web Audio マスターバスはアプリが所有するためです。エンジンのリミッターが
必要なら、`sound.listener.setRenderOptions({ useLimiter: true })` で true-peak リミッターを有効にします。

## 更新と破棄

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25], orientation: camera.quaternion.toArray() });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);   // このフレームの有効経路数を返す

source.dispose();
sound.dispose();
await audioContext.close();
```

## 診断と IR 解析

```ts
const snap = await sound.debugSnapshot();
snap.simplest.timing;   // { propagationMs, directMs, reflectionDiffractionMs, reverbMs, irMs, renderMs }
snap.simplest.scene;    // { meshes, objects, sources, triangles }
snap.simplest.render;   // { blockSequence, activeSources, exactTaps, sendTaps, totalUs }

const irs = await sound.getIRs();                               // 9バンド early path IR
const h = await sound.renderMonoImpulseResponse(source, 2.0);   // 44.1 kHz モノ圧力 IR (最大 30 s)
```

IR 解析は別の Offline Worker でシーンを複製して計算するため、リアルタイム出力は途切れません。
`renderMonoImpulseResponse` は HRTF/Hybrid 出力の録音ではなく圧力 IR です。

## デモ

公開デモリポジトリ [Sound-tracing](https://github.com/exarionAI/Sound-tracing) で Shoebox room、
Multi-room occlusion、Runtime capability のサンプルを実行できます。

![Shoebox room デモ](/img/web/demo-shoebox.png)

![Multi-room occlusion デモ](/img/web/demo-multiroom.png)

## トラブルシューティング

| 症状 | 確認すること |
|---|---|
| 音が出ない | ユーザー gesture 内で `AudioContext.resume()` を先に呼んだか、`sound.output` を destination に接続したか |
| `SoundTrace.create` が cross-origin isolation エラーで拒否される | ページと Worker 応答の COOP/COEP ヘッダー、`crossOriginIsolated === true`（ST でも必要） |
| `mode: 'gpu'` / `enableGpu()` のエラー | SimpleST Web は CPU 専用。オプションを削除 |
| `transmissionModel: 'solid'`、`defaultMeshBuild`、`hrtfQuality` などが拒否される | STCoreV2 専用オプション。[Facade API](./web/facade.md) の拒否リストを参照 |
| 方向が逆に聞こえる | レンダラーの座標系に合った `coordinateBasis`（`-Z` forward なら必須） |
| 材質が効いていないように見える | 名前が材質テーブル/エイリアスにあるか（なければコンクリートに置き換え） |
| コア/asset の 404 | バンドラーの事前バンドル除外、`coreBaseUrl`・`assetBaseUrl`、`.wasm` の MIME |
| 性能が足りない | 品質プリセットを下げて `thread: 'mt'` を使用、経路可視化を無効化 |

## 次のドキュメント

- [Facade API](./web/facade.md) — 生成オプション、シーン・音源・メッシュ API、ライフサイクル、拒否される旧オプション
- [Native API](./web/native.md) — SimpleST モジュールローダーと低レベルアダプター
- [Performance Guide](./performance.md)
