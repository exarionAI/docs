---
sidebar_position: 1
title: SDK概要
---

# SDK概要

**SDK**は、[Coreエンジン](../core/stcorev2.md)を各プラットフォーム/言語から利用できるようにするバインディング群です。C/C++ネイティブエンジン自体の情報は [Core](../core/stcorev2.md) セクションを参照してください。

## バインディング

| 名前 | 対象 | 状態 |
|---|---|---|
| [Web](./web.md) | ブラウザ (WebAssembly) | 利用可能、ドラフト文書 |
| [Python](./python.md) | 解析・研究 | 予定 |
| [Unity](./unity.md) | Unityゲームエンジン | 予定 |
| [Unreal Engine](./ue.md) | Unreal Engine | 予定 |

すべてのバインディングはCoreのC API (`exasoundC.h`) を共通入口として使います。

## どこから始めるか

- 初めての場合 → [Sound Tracingとは?](../intro/what-is-soundtracing.md)
- ブラウザ/Three.js統合 → [Web SDK](./web.md)
- ネイティブ(C/C++)統合 → [STCoreV2](../core/stcorev2.md)（現在のアクティブライン）
- 2世代比較 → [STCore vs STCoreV2](../core/comparison.md)
