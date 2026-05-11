---
sidebar_position: 1
title: SDK 概览
---

# SDK 概览

**SDK** 是让 [Core 引擎](../core/stcorev2.md) 可在各平台/语言中使用的绑定阵列。关于 C/C++ 原生引擎本身的信息，请参考 [Core](../core/stcorev2.md) 部分。

## 绑定

| 名称 | 目标 | 状态 |
|---|---|---|
| [Web](./web.md) | 浏览器 (WebAssembly) | 可用，草案文档 |
| [Python](./python.md) | 分析和研究 | 计划中 |
| [Unity](./unity.md) | Unity 游戏引擎 | 计划中 |
| [Unreal Engine](./ue.md) | Unreal Engine | 计划中 |

所有绑定都以 Core 的 C API (`exasoundC.h`) 作为公共入口。

## 从哪里开始

- 第一次了解 → [Sound Tracing 是什么？](../intro/what-is-soundtracing.md)
- 浏览器/Three.js 集成 → [Web SDK](./web.md)
- 原生(C/C++)集成 → [STCoreV2](../core/stcorev2.md)（当前活跃线路）
- 两代比较 → [STCore vs STCoreV2](../core/comparison.md)
