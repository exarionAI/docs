---
sidebar_position: 1
title: SDK 概要
description: STCoreV2 空間オーディオエンジン向け Web、Unity、Unreal Engine、Python SDK の概要です。
---

# SDK 概要

SoundTrace SDK ファミリーは [STCoreV2](../core/stcorev2.md) を Web と
ゲームエンジンから利用できるようにします。

## バインディング

| 名前 | 対象 | 状態 |
|---|---|---|
| [Web](./web.md) | TypeScript、WebAssembly、Web Audio | 利用可能 |
| [Unity](./unity.md) | Unity 2022.3 LTS 以降 | 利用可能 |
| [Unreal Engine](./ue.md) | Unreal Engine 5.6 プラグイン | 利用可能。デモシーンはプレースホルダー |
| [Python](./python.md) | 解析と研究 | 予定 |

## 共通ワークフロー

1. `Fast`、`Middle/Balanced`、`Quality` のいずれかから開始します。
2. `Band8` または `Parametric` HRTF を選択します。
3. 対応環境では GPU 伝搬を使用し、それ以外では CPU フォールバックを使用します。
4. 8 バンド値の直接編集より、マテリアルプリセットを優先します。
5. レイ深度、幅、レンダリング予算は、実測で問題を確認した後にのみ調整します。

## はじめに

- ブラウザーと Three.js → [Web SDK](./web.md)
- Unity ゲーム → [Unity SDK](./unity.md)
- Unreal Engine ゲーム → [Unreal Engine SDK](./ue.md)
- ブラウザーシーン → [デモ](../demos/overview.md)
- ネイティブ C/C++ → [STCoreV2](../core/stcorev2.md)
