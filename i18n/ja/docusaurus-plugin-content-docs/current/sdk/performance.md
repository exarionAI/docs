---
title: Performance Guide
description: SimpleST ベース統合の性能軸 — レイ予算、レーン周期、Hybrid 初期反射、レンダーモード、スレッド、測定指標。
---

# Performance Guide

SimpleST は、リスナー guide ray、音源 transport ray、反射深度、音源数、ジオメトリサイズを上げるほど
経路が安定し空間感が良くなりますが、伝搬時間とオーディオレンダーブロックのコストも同時に上がります。
このドキュメントは、Web・Unity・UE・FMOD・Wwise 統合に共通するコスト軸と出発点をまとめたものです。

## 固定ランタイム契約

| 項目 | 現在の契約 |
|---|---|
| リスナー | リアルタイムコンテキストごとに 1 個 |
| 出力 | バイノーラル/パンニング 2ch、またはスピーカーレイアウト（HOA3 デコード）N チャンネル |
| エンジンサンプルレート | 44.1 kHz 固定、ホストレートは内蔵リサンプラー |
| レンダーブロック | 512 フレーム（≈11.6 ms @ 44.1 kHz）— ブロックあたりのレンダーコストがこの予算内でなければ途切れる |
| 同時音源ストリーム | 64 個（超過音源は dry または生成失敗） |
| 反射最大深度 | 16 · 透過 64 |
| 既定の guide ray / 深度 | `16 × 16` / 8（グローバル）、音源ごとの深度 4 |
| 既定の transport ray | `16 × 8` |
| 計算スレッド | `maxComputeThreads = 0` → min(パフォーマンスコア, 6) |

## 主なオプションと tradeoff

| オプション | 品質への影響 | 性能への影響 |
|---|---|---|
| リスナー guide ray（N×N） | 反射・回折経路の発見と方向の安定性 | 格子面積に比例して反射/回折レーンのコスト増 |
| 反射深度 | 高次反射・混合回折経路の許容 | 経路探索と IR タップ数の増加 |
| 音源 transport ray（W×H）× 深度 | late reverb のルーム応答と材質反応の安定性 | 音源数 × 格子 × 深度に比例 |
| 音源数 | 同時に空間化されるエミッター | 伝搬 + レンダー（タップ数）コスト |
| 初期反射モード | Objects = 全経路を個別 HRTF、Hybrid = 予算 + HOA3 bed | **Objects は経路数に比例**してレンダーブロックが大きくなる |
| 反射レーン周期 | 長いほど初期反射がリスナーの動きに遅れて追従 | 伝搬 CPU を最も大きく削減 |
| レンダーモード | Buffered ≈3 ブロック遅延 / In Callback 最低遅延 | In Callback はレンダーコストがホストオーディオスレッドに乗る |
| HRTF データセット | SADIE D2（256 タップ）> MIT KEMAR（128 タップ）の解像度 | タップ長に比例したコンボリューションコスト |
| 動的オブジェクト数 | 動く遮蔽物の反映 | 動的 TLAS の再構築コスト |

## 初期反射: Hybrid を使う

音源 8 個がある残響ホール（Sibenik）で測定したレンダーブロックコストです。

| モード | exact オブジェクト | ブロックコスト | 判定 |
|---|---:|---:|---|
| Objects | ≈650 | 16.8 ms | 11.6 ms の予算超過 — 途切れ |
| Hybrid | ≈33 | 2.4 ms | 合格 |

Hybrid はリスナー全域予算（反射 12+4 · 回折 3+1）だけを exact オブジェクトとしてレンダーし、残りを HOA3
bed に集めます。HRTF の多音源では −1 ~ −2 dB 程度の音量差があります。すべての公式統合が
Hybrid を既定で適用し、Objects は基準聴取・オフライン A/B 用です。

## 品質プリセット（統合別）

| 統合 | Fast | Balanced / Middle | Quality |
|---|---|---|---|
| Web（`quality`） | 8×8、深度 4 | 16×16、深度 6 | 24×24、深度 8 |
| Unity Listener | 16、深度 4 | 24、深度 8 | 32、深度 12 |
| UE Listener | 12×12、深度 4 | 16×16、深度 8 | 24×24、深度 8 |
| UE Source（transport） | 8×4、深度 3 | 16×8、深度 4 | 24×12、深度 6 |

Web は音源 transport ray も同じ値に従います。Unity 音源の transport ray は既定 24 / 深度 4 です。

## 開始 preset

| 状況 | guide ray | transport ray | 深度 | 反射レーン周期 | 備考 |
|---|---|---|---|---|---|
| モバイル / Web 多音源 | 8×8 ~ 12×12 | 8×4 ~ 8×8 | 4 | 33 ~ 66 ms | Fast プリセット |
| デスクトップゲーム | 16×16 | 16×8 | 8 | 33 ms（UE 既定）~ 0 | Balanced |
| 品質デモ | 24×24 ~ 32×32 | 24×12 | 8 ~ 12 | 0 ms | Quality、音源 ≤ 8 |

空間感が弱い場合は、音源数を先に増やさず、guide ray と transport ray・深度を分けて段階的に
上げて確認します。性能が足りない場合は (1) Hybrid の確認 → (2) 品質プリセットの引き下げ → (3) 反射レーン周期の引き上げ
→ (4) 経路可視化の無効化の順に調整します。

## スレッドとレーン

PIPELINED スケジューラは Direct / Reflection-Diffraction / Reverb レーンを独立したケイデンスで回します。

| レーン | 既定の最小周期 | 意味 |
|---|---:|---|
| Direct | 10 ms | 連続実行の開始間隔。直接音・透過 — ドロップアウトがないよう維持 |
| Reflection-Diffraction | 0 ms（即時） | 伝搬コストの大半。待機中の要求は 1 つに畳まれる |
| Reverb | 4 ms | 実行完了後、次までの間隔 |

`maxComputeThreads` の予算 N は PIPELINED では最小 3（オーディオ 1 + Direct 専用 1 + 一般 N−2）です。
ハイブリッド CPU では `st_rt_set_thread_attributes`（UE `Prefer Performance Cores`）でパフォーマンスコアに
固定することを推奨します。実際のスレッド数は `st_rt_get_thread_inventory` で確認します。

## 測定すべき指標

| グループ | 指標 | 出典 |
|---|---|---|
| 伝搬 | レーン別 ms（direct / reflDiff / reverb）、IR ビルド ms | `st_rt_get_timing`（Web `debugSnapshot().simplest.timing`、UE Subsystem） |
| レンダーブロック | `totalUs`、ステージ別 µs（sourceInput / exactTaps / bed / send / late / output）、activeSources、exactTaps、sendTaps | `st_rt_render_get_process_stats` |
| IR 発行 | publishSequence のケイデンス、bed セル数、prepare CPU/wall 比率（プリエンプション vs 遅いコア） | `st_rt_ir_get_stats` |
| シーン | メッシュ・オブジェクト・音源・三角形数 | `st_rt_scene_get_stats` |
| オーディオ入力 | queued / capacity / dropped / underrun フレーム | `st_rt_source_get_stream_status` |
| 遅延 | 出力段の遅延（フレーム）+ キュー + 固定 DSP 遅延 | `st_rt_render_get_latency_frames` |
| ホスト | フレーム時間 p50/p95/p99、オーディオコールバック超過回数 | プラットフォームのプロファイラー |

## 公開基準

| 項目 | 基準 |
|---|---|
| 実測済みの値 | プラットフォーム、ホストバージョン、SimpleST の commit・バージョン、シナリオを併記 |
| 未測定の値 | 数値を推定せず `Measurement pending` と表記 |
| ストリーム上限 | エンジン上限 64 と実際の推奨音源数を分離 |
| Raw log | 顧客向けドキュメントにそのまま入れず、要約 table と解釈のみ公開 |
