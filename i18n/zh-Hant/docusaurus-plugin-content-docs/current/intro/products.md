---
sidebar_position: 3
title: 產品線
---

# 產品線

Sound Tracing 產品線由 **引擎**、**SDK 與外掛**、**分析工具** 三個軸線組成。

## Core — SimpleST

以 C++20 為基礎的幾何聲學原生引擎。

- [SimpleST](../core/simplest.md) — 現行引擎。公開 C ABI 6（即時 `st_rt_*` / 離線 `st_off_*`）
- [STCoreV2 → SimpleST](../core/stcorev2.md) — 給從前一代引擎遷移的團隊的對照表

## SDK · 外掛

讓引擎能在各平台與中介軟體中使用的包裝陣容。

- [SDK 概覽](../sdk/overview.md)
- 遊戲引擎：[Unity](../sdk/unity.md)、[Unreal Engine](../sdk/ue.md)
- 音訊中介軟體：[FMOD](../sdk/fmod.md)、[Wwise](../sdk/wwise.md)
- Web：[soundtrace.js](../sdk/web.md)
- 規劃中：[Python](../sdk/python.md)

## ExaTools

用於 IR 分析、資料轉換、批次驗證等工作的公用程式工具集。

- [ExaTools 概覽](../exatools/overview.md)
