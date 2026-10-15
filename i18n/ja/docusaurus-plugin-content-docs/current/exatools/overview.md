---
title: ExaTools概要
---

# ExaTools

音響シミュレーション結果を解析・検証・可視化するユーティリティツール群です。

## ツール

| 名前 | 用途 | 状態 |
|---|---|---|
| [IRAnalyzer](./iranalyzer.md) | IR解析・可視化、Embreeベース検証 | 利用可能 |

## SimpleST に内蔵された解析経路

別のツールがなくても、[SimpleST](../core/simplest.md) のオフラインエンジン（`SimpleSTOffline`）が Raw エネルギータップ、
9バンド圧力 IR、バイノーラル IR を決定的に生成します。soundtrace.js の `getIRs()` /
`renderMonoImpulseResponse()` と UE・Unity の統計表面も、同じエンジン計測（`st_rt_get_timing`、
`st_rt_ir_get_stats`）を公開しています。

## 追加ツール

追加ツールは段階的に合流する予定です。
