---
title: Native API
description: soundtrace.js の低レベルエントリポイント `@exarionai/soundtrace.js/native` — WASM モジュールローダー、ヒープヘルパー、Realtime/Offline アダプター、EQ。
---

# Native API

`@exarionai/soundtrace.js/native` は、facade が内部で使う Sound-Tracing SDK モジュールローダーとアダプターを
公開します。一般的なアプリは [Facade API](./facade.md) を使ってください。この表面は Sound-Tracing SDK C ABI の
契約（パッケージに同梱された `core/Include/SimpleST/ABI/*.h`）にそのまま従い、バージョン間の互換性保証は
facade より弱くなります。

```ts
import {
  SimpleSTRealtime,
  loadRealtimeModule, loadOfflineModule, analyzeScene,
  Heap, packMaterial, validateMaterial,
  ST_ABI_VERSION, ST_FREQUENCY_BANDS, ST_SAMPLE_RATE, layout,
  type SimpleSTModule, type SimpleSTMaterial, type SimpleSTDiagnostics, type SimpleSTFeatures, type SimpleSTSceneSnapshot,
} from '@exarionai/soundtrace.js/native';
```

## サポート範囲

- すべての Sound-Tracing SDK `[control]` 呼び出しは**1 つの Worker** でのみ行います。facade は専用の control Worker を
  持ち、そこでのみエンジンを操作します。
- メインスレッドで `st_rt_propagate` のようなブロッキングエントリポイントを呼ぶと、`Atomics.wait` がブロックされて失敗します。

## 構成要素

| 名前 | 役割 |
|---|---|
| `loadRealtimeModule(baseUrl)` | `SimpleSTRealtime.mjs` + `.wasm`（pthreads）をロードして `SimpleSTModule` を返します |
| `loadOfflineModule(baseUrl)` | `SimpleSTOffline.mjs`（シングルスレッド）をロードします。IR 解析専用 |
| `Heap` | WASM ヒープに POD を書き込み・読み出すヘルパー。`structSize`/`apiVersion` のスタンプが付いた構造体の割り当て（`stamped`）を含む |
| `layout` | `STRT_CreateOptions`、`STMaterial`、`STRenderOptions`、`STTiming`、`STSceneStats`、`STProcessStats`、`STIrStats` などのオフセット/サイズ |
| `packMaterial` / `validateMaterial` | 9バンド R/A/T/scattering を `STMaterial` にパックし、`R+A+T=1` を検証 |
| `SimpleSTRealtime` | リスナー 1 つと共有レンダラーを所有するアダプター。facade のコマンドを `st_rt_*` 呼び出しに変換します。`features`は、エンジンが capability ビットと export の両方を備えたオプション機能（クリップ・trigger・再生制御・true-peak リミッター・マスターゲイン）です |
| `analyzeScene(module, snapshot, …)` | Offline コンテキストにシーンスナップショットを複製して Raw IR / 圧力 IR を計算 |
| `ST_ABI_VERSION` / `ST_FREQUENCY_BANDS` / `ST_SAMPLE_RATE` | `6` / `9` / `44100` |

## `SimpleSTRealtime`

facade の control Worker が使うアダプターです。直接使う場合は Worker 内で次の順序を
守ります。

```ts
const M = await loadRealtimeModule(coreBaseUrl);
const rt = new SimpleSTRealtime(M, startupOptions);   // st_rt_create, 等ラウドネス補正を無効化, 材質テーブル登録, Hybrid 適用

rt.command({ type: 'createMesh', handle, state });     // st_rt_mesh_create + st_rt_object_create_q
rt.command({ type: 'createSource', handle, state });   // st_rt_source_create + 品質プリセット適用
rt.attachStream(handle);                               // st_rt_source_attach_stream (モノ)
rt.sourcePose(handle, cache); rt.listenerPose(cache); rt.meshPose(handle, pose);

const validPaths = rt.frame();                         // st_rt_build[_dynamic] + st_rt_propagate
rt.writeStream(handle, monoSamples);                   // [audio] st_rt_source_write_stream
const stereo = rt.render(frames);                      // [audio] st_rt_render_process

const diag = rt.diagnostics();                         // SimpleSTDiagnostics
rt.reset(); rt.dispose();
```

- `setQuality(tier)` はリスナー guide ray、音源 transport ray、反射深度を一度に設定します
  （`fast` 8×8/4、`balanced` 16×16/6、`quality` 24×24/8）。
- 音源ゲインは圧力値で、エンジンには `st_rt_source_set_energy(gain²)` として渡されます。
- `'direct'` 経路ゲートは Direct と Transmission を同時に on/off します。
- レンダーオプションの変更（`useDoppler`、`useLimiter`、`diffuseEnabled`）は `STRenderOptions` の該当フィールドを
  上書きしますが、`reserved0 = 1`（Hybrid）は常に維持します。Hybrid が外れると `diagnostics()` が例外を投げます。
- レンダー開始のたびに出力段を明示します: リミッター無効（`useLimiter: true` なら true-peak）、マスターゲイン 0 dB。
- コンテキスト作成直後にエンジンが有効にする等ラウドネス補正を無効にします（`features.loudnessCompensation` のとき）。
- リスナーの向きは forward/up から作ったクォータニオンで `st_rt_listener_set_orientation_q` に渡し、roll を保ちます。

## 診断スナップショット

```ts
interface SimpleSTDiagnostics {
  engine: 'Sound-Tracing SDK'; abiVersion: number; version: string;
  scheduler: 'synchronous' | 'pipelined'; earlyReflectionMode: 'hybrid'; spatializer: number;
  scene:  { meshes; objects; sources; triangles };
  timing: { propagationMs; directMs; reflectionDiffractionMs; reverbMs; irMs; renderMs };
  render: { blockSequence; activeSources; exactTaps; sendTaps; totalUs } | null;
  ir:     { publishSequence; exactTaps; bedCells; sendTaps } | null;
  audioTransport?: { outputUnderrunFrames; inputDroppedFrames; streams: Array<{ handle; queuedFrames; capacityFrames; droppedFrames; underrunFrames }> };
  features?: SimpleSTFeatures;
  output?: { limiter; limiterType; limiterLatencyFrames; masterGainDb; diffuseRain; eq? };  // 適用された出力段（eq = 出力 EQ）
  inputs?: { live; clip };                                                       // ライブ/クリップ音源数
}
```

facade の `debugSnapshot().simplest` と `getStatistics().simplest` は同じオブジェクトを返します。

## オーディオ契約

- エンジン内部レートは 44.1 kHz で、`STRT_CreateOptions.hostSampleRate` に `AudioContext.sampleRate` を
  入れると入力・出力ともエンジンが変換します。
- 音源入力はモノ float PCM（`st_rt_source_write_stream`）、出力はインターリーブのステレオ
  （`st_rt_render_process`）です。出力モードは `HOST_PULL_BUFFERED` で、AudioWorklet が共有
  リングからコピーします。
- 同時ストリームのスロットは 64 個です。超過した音源は生成に失敗します。

## EQ

Sound-Tracing SDK のパラメトリック EQ を 2 か所でかけます。

- **ソース EQ** — 音源信号そのものに、エンジンのバンド分割の前でかけます。その音源の直接音・反射・回折・残響がすべて同じ音色になります。
- **出力 EQ** — Sound-Tracing SDK のミックス全体に、レンダー末尾（マスターゲインの前）でかけます。

フィルターの種類は Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の 6 種（カットは 12 dB/oct 固定）、
範囲は周波数 20 ~ 20,000 Hz、ゲイン ±24 dB（Peaking・シェルフのみ）、Q 0.1 ~ 30（シェルフは 3 まで）、プリアンプ −48 ~ +12 dB です。
既定は無効で、無効の間はエンジンを呼び出さないため、出力は EQ がないときと同じです。変更された値だけを送り、エンジンが
20 ms のクロスフェードで切り替えます。

| 位置 | エンジン呼び出し | サポート確認 |
|---|---|---|
| ソース EQ | `st_rt_source_set_parametric_eq`（解除は `st_rt_source_set_eq(ctx, id, NULL)`） | `features.sourceParametricEq` |
| 出力 EQ | `st_rt_render_set_parametric_eq`（無効化は `enabled = 0`） | `features.outputParametricEq` |

`SimpleSTRealtime` アダプターは facade の `source.setEq` / `sound.setOutputEq` コマンドをこの 2 つの呼び出しに変換し、両 feature がない
コアでは拒否します。適用された出力 EQ は `diagnostics().output.eq` にあります。

## 関連ドキュメント

- [Web SDK 概要](../web.md)
- [Facade API](./facade.md)
