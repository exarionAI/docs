---
sidebar_position: 3
title: 製品群
---

# 製品群

Sound Tracing製品群は、**Coreエンジン**、**SDKバインディング**、**スタジオツール**、**解析ツール**の4つを軸に構成されます。

## Core

C/C++ベースのネイティブ音響シミュレーションエンジンです。

- [STCore](../core/stcore.md) — 第1世代コア（FPGAアクセラレーションインターフェースを含む、保守中）
- [STCoreV2](../core/stcorev2.md) — 第2世代コア（モジュール式path module、lock-free）
- [STCore vs STCoreV2比較](../core/comparison.md)

## SDK

Coreエンジンを各プラットフォーム/言語から利用できるようにするバインディング群です。

- [SDK概要](../sdk/overview.md)
- 提供中: Web、Unity、Unreal Engine
- 予定: Python

## ExaStudio

音響シーンを視覚的に構成し、デバッグするデスクトップアプリケーションです。

- [ExaStudio概要](../exastudio/overview.md)

## ExaTools

IR解析、データ変換、バッチ検証などのためのユーティリティツール群です。

- [ExaTools概要](../exatools/overview.md)
