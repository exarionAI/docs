---
sidebar_position: 1
title: SDK 概覽
---

# SDK 概覽

**SDK** 是讓 [Core 引擎](../core/stcorev2.md) 可在各平台/語言中使用的綁定陣列。關於 C/C++ 原生引擎本身的資訊，請參考 [Core](../core/stcorev2.md) 部分。

## 綁定

| 名稱 | 目標 | 狀態 |
|---|---|---|
| [Web](./web.md) | 瀏覽器 (WebAssembly) | 可用，草案文件 |
| [Python](./python.md) | 分析和研究 | 計畫中 |
| [Unity](./unity.md) | Unity 遊戲引擎 | 計畫中 |
| [Unreal Engine](./ue.md) | Unreal Engine | 計畫中 |

所有綁定都以 Core 的 C API (`exasoundC.h`) 作為共用入口。

## 從哪裡開始

- 第一次瞭解 → [Sound Tracing 是什麼？](../intro/what-is-soundtracing.md)
- 瀏覽器/Three.js 整合 → [Web SDK](./web.md)
- 原生(C/C++)整合 → [STCoreV2](../core/stcorev2.md)（目前活躍線路）
- 兩代比較 → [STCore vs STCoreV2](../core/comparison.md)
