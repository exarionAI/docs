---
sidebar_position: 1
title: SDK 概覽
description: STCoreV2 空間音訊引擎的 Web、Unity、Unreal Engine 與 Python SDK 概覽。
---

# SDK 概覽

SoundTrace SDK 系列讓 Web 與遊戲引擎能夠使用
[STCoreV2](../core/stcorev2.md)。

## 綁定

| 名稱 | 目標 | 狀態 |
|---|---|---|
| [Web](./web.md) | TypeScript、WebAssembly、Web Audio | 可用 |
| [Unity](./unity.md) | Unity 2022.3 LTS 或更新版本 | 可用 |
| [Unreal Engine](./ue.md) | Unreal Engine 5.6 外掛 | 可用；示範場景為預留內容 |
| [Python](./python.md) | 分析與研究 | 規劃中 |

## 共用流程

1. 從 `Fast`、`Middle/Balanced` 或 `Quality` 開始。
2. 選擇 `Band8` 或 `Parametric` HRTF。
3. 支援時使用 GPU 傳播，否則使用 CPU 回退。
4. 優先使用材質預設，不直接編輯 8 頻段值。
5. 只有在測量到實際問題後，才調整射線深度、寬度與渲染預算。

## 從這裡開始

- 瀏覽器與 Three.js → [Web SDK](./web.md)
- Unity 遊戲 → [Unity SDK](./unity.md)
- Unreal Engine 遊戲 → [Unreal Engine SDK](./ue.md)
- 瀏覽器場景 → [示範](../demos/overview.md)
- 原生 C/C++ → [STCoreV2](../core/stcorev2.md)
