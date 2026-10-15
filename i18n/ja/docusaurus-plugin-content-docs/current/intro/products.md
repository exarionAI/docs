---
sidebar_position: 3
title: 製品群
---

# 製品群

Sound Tracing 製品群は、**エンジン**、**SDK・プラグイン**、**解析ツール**の3つを軸に構成されます。

## Core — SimpleST

C++20 ベースの幾何音響ネイティブエンジンです。

- [SimpleST](../core/simplest.md) — 現行エンジン。公開 C ABI 6（リアルタイム `st_rt_*` / オフライン `st_off_*`）
- [STCoreV2 → SimpleST](../core/stcorev2.md) — 前世代エンジンから移行するチーム向けの対応表

## SDK・プラグイン

エンジンを各プラットフォーム・ミドルウェアから利用できるようにラップするラインアップです。

- [SDK概要](../sdk/overview.md)
- ゲームエンジン: [Unity](../sdk/unity.md)、[Unreal Engine](../sdk/ue.md)
- オーディオミドルウェア: [FMOD](../sdk/fmod.md)、[Wwise](../sdk/wwise.md)
- Web: [soundtrace.js](../sdk/web.md)
- 予定: [Python](../sdk/python.md)

## ExaTools

IR解析、データ変換、バッチ検証などのためのユーティリティツール群です。

- [ExaTools概要](../exatools/overview.md)
