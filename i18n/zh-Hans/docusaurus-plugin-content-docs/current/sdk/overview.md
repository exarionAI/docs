---
sidebar_position: 1
title: SDK 概览
description: STCoreV2 空间音频引擎的 Web、Unity、Unreal Engine 和 Python SDK 概览。
---

# SDK 概览

SoundTrace SDK 系列让 Web 和游戏引擎能够使用
[STCoreV2](../core/stcorev2.md)。

## 绑定

| 名称 | 目标 | 状态 |
|---|---|---|
| [Web](./web.md) | TypeScript、WebAssembly、Web Audio | 可用 |
| [Unity](./unity.md) | Unity 2022.3 LTS 或更高版本 | 可用 |
| [Unreal Engine](./ue.md) | Unreal Engine 5.6 插件 | 可用；演示场景为占位内容 |
| [Python](./python.md) | 分析和研究 | 计划中 |

## 通用流程

1. 从 `fast`、`balanced` 或 `quality` 质量预设开始（默认 `balanced`）。
2. HRTF 默认使用 core 内置表，仅在需要时才加载其他表。
3. 支持时使用 GPU 传播，否则使用 CPU 回退。
4. 优先使用材质预设，不直接编辑 8 频段值。
5. 只有在测量到实际问题后，才调节射线深度、宽度和渲染预算。

## 从这里开始

- 浏览器和 Three.js → [Web SDK](./web.md)
- Unity 游戏 → [Unity SDK](./unity.md)
- Unreal Engine 游戏 → [Unreal Engine SDK](./ue.md)
- 原生 C/C++ → [STCoreV2](../core/stcorev2.md)
