---
title: Performance Guide
---

# Web SDK Performance Guide

soundtrace.js では、ray count、depth、source count、geometry/BVH の設定を上げるほど
音響経路の安定性と空間感が向上する可能性があります。同じ設定は、伝播計算の時間、
メモリ使用量、メインスレッドの frame time、AudioWorklet の負荷も同時に上げます。

このドキュメントは、SDK 統合者がオプションを選ぶときの基準となる性能/品質ガイド
です。以下のプリセットは出発点であり、実際の推奨 source 数とプラットフォーム別の
限界は、測定完了後に数値表として更新します。

## 固定ランタイム契約

| 項目 | 現在の契約 |
|---|---|
| Listener | scene ごとに 1 個 |
| Realtime output | stereo/binaural 2ch |
| オーディオレンダーパス | ST/MT ともに WASM `AudioWorkletProcessor` |
| Multi-source オーディオ | source ごとに `source.play(input, 2)`（facade）/ ST・direct-native は `createWorkletNode()` |
| Native source cap | 16 sources（`EXA_MAX_SOUNDSOURCE`） |
| Ray depth 上限 | 16（`EXA_MAX_DEPTH`） |
| 既定の品質プリセット | `quality: 'balanced'` = listener ray `24 x 24`、depth `8` |

`16` は native cap であり、1 つの scene に同時に存在できる source 数の上限です。
顧客アプリで推奨するリアルタイム source 数は、この上限の範囲内で、プラット
フォーム、geometry のサイズ、ray budget、BVH、ST/MT モードごとに個別に測定する
必要があります。

品質プリセットが設定する listener ray grid と depth は次のとおりです。

| Preset | Listener ray | Depth |
|---|---|---|
| `fast` | `16 x 16` | `4` |
| `balanced`（既定） | `24 x 24` | `8` |
| `quality` | `32 x 32` | `12` |

## 主なオプションとトレードオフ

| オプション | 品質への影響 | 性能への影響 |
|---|---|---|
| Listener ray width/height | リスナー基準の経路発見と方向の安定性が向上 | ray grid の面積に比例して伝播計算が増加 |
| Listener depth | より深い reflection/diffraction/reverb 経路を許可 | path search と cache pressure が増加 |
| Source reverb ray width/height | source 側 late reverb のカバレッジとマテリアル応答の安定性が向上 | source 数と ray grid 面積に比例してコストが増加 |
| Source reverb depth | source 側 late reverb の追跡深度が増加 | depth が大きいほど path search と cache pressure が増加 |
| Source count | 同時に空間化される emitter が増加 | propagation と AudioWorklet mixer のコストが増加 |
| BVH type | traversal/build 特性が変化 | geometry と更新方式により build/refit/traversal コストが変化 |
| BVH max depth | tree の深さを制御 | 浅すぎると traversal が非効率、深すぎると build/memory コストが増加 |
| Prims per leaf | leaf あたりの三角形数を制御 | scene 構造により traversal/build のバランス点が変化 |
| Animated/refit geometry | 動く collider を反映 | refit/rebuild コストが増加。stress 項目として分離測定 |
| Thread mode | MT は propagation job を worker thread に分散可能 | cross-origin isolation が必要で、thread/memory のオーバーヘッドが増加 |

## Reverb ray budget

Reverb ray は listener ray を複製した値ではありません。source 側 late reverb は
`source count × width × height × depth` でコストが増えるため、production の既定値は
listener ray とは分けてシーンごとに上げます。QA 基準の sweep は source
`[4, 8, 12, 16]`、general ray と reverb ray それぞれ `4 x 4 x 3`、`8 x 8 x 7`、
`16 x 16 x 11`、`32 x 32 x 16` の段階、path cache `[256, 512, 1024]` です。

## 開始プリセット

実測テーブルが埋まるまでは以下の値を出発点として使い、アプリの目標 FPS と聴感品質に
合わせて調整します。

| Preset | Thread | Listener rays | Reverb rays | Depth | BVH | 用途 | 測定状況 |
|---|---|---:|---:|---:|---|---|---|
| Mobile conservative | ST | `16 x 16` | `4 x 4` または `8 x 8` | `4` | LBVH または platform default | モバイル最小基準 | Measurement pending |
| Desktop balanced | ST または MT | `24 x 24` | `8 x 8` | `8` | LBVH_SIMD8 | デスクトップ基本基準 | Measurement pending |
| Desktop quality | MT | `32 x 32` | `16 x 16` | `12` | LBVH_SIMD8 | 品質優先デスクトップ | Measurement pending |
| Stress only | MT | `32 x 32` | `32 x 32` | `7..16` | BVH matrix | 限界測定専用 | Realtime default ではない |

> **MT の利得は未測定であり、無条件に速いわけではありません。** 上記 MT プリセットの
> 速度利得はまだ `Measurement pending` です。MT は propagation job を worker に分散
> するため、**ray 予算と source 数が大きいとき**（高い ray grid・depth、多数の source）
> に利得が現れ、小さなシーンでは worker の往復とメモリオーバーヘッドにより ST の方が
> シンプルで速い場合があります。さらに MT は cross-origin isolation（COOP/COEP）の
> 配信コストがかかります。小さなシーンや単純なページは ST で始め、予算の大きい
> シーンで ST↔MT を**実測比較**したうえで MT を選択してください。

空間感が弱い場合は、まず source 数を増やすのではなく、listener ray と source reverb
ray の count/depth を分けて段階的に上げて確認します。source 数の増加は最後に測定
します。

## 測定すべき指標

顧客ドキュメントに数値を載せるときは、同じ scenario を同じ duration/warmup 条件で
繰り返し測定し、raw log ではなく要約値のみを公開します。

| グループ | 指標 |
|---|---|
| Browser frame | 平均 FPS、frame time p50/p95/p99、worst frame、dropped frame count |
| Main-thread stall | `PerformanceObserver` の longtask count/total/worst（対応ブラウザーのみ） |
| Engine propagation | `scene.tick()` + `scene.updatePropagation()` の時間 p50/p95/p99/worst |
| Native job timing | propagation job timing frame、worker の分散/待機時間 |
| Path quality | valid path count の平均/最大、material/path 変化の聴感メモ |
| Audio | `AudioContext.sampleRate`、`baseLatency`、`outputLatency`、state、setup time |
| Memory | native memory trace snapshot、JS heap snapshot |
| Manual observation | drop-out、定位の弱さ、thermal、ファンノイズ、体感バッテリー消費 |

ブラウザーの JavaScript だけでは、プラットフォーム共通の電力/thermal の数値を信頼性
高く得ることは困難です。電力と thermal は自動計測値として確定させず、manual
observation または別途の計測機器の値として分離してください。

## 測定マトリクス

| Matrix | 値 |
|---|---|
| Baseline | ST/MT それぞれ 1 source、listener `16 x 16 x 3`、source `16 x 8 x 3`、static small geometry |
| Quality scale | listener `16 x 16`、`32 x 32`; source reverb `4 x 4`、`8 x 8`、`16 x 16`、`32 x 32`; depth `3`、`7`、`11`、`16` |
| Source scale | `1`、`2`、`4`、`8`、`12`、`16` sources（native cap `16`） |
| Reverb ray scale | source `[4, 8, 12, 16]`、general ray step `4 x 4 x 3` → `8 x 8 x 7` → `16 x 16 x 11` → `32 x 32 x 16`、reverb ray も同じ step、path cache `[256, 512, 1024]` |
| Geometry/BVH | small/medium/large geometry、HKDtree、LBVH、LBVH_SIMD4/8/16、LBVH_NWAY4/8/16 |
| Stress only | animated/refit、rebuild-heavy、native source cap、high ray budget |

## 公開基準

| 項目 | 基準 |
|---|---|
| 実測済みの値 | platform、browser、SDK commit、STCoreV2 commit、scenario を併記 |
| 未測定の値 | 数値を推定せず `Measurement pending` と表記 |
| Source cap | native cap `16` と実際の推奨 source 数を分離 |
| Stress 結果 | realtime の推奨値ではなく、限界/回帰検出の目的として分離 |
| Raw log | 顧客ドキュメントにそのまま載せず、要約テーブルと解釈のみを公開 |
