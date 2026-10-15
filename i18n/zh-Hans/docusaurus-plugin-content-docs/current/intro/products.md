---
sidebar_position: 3
title: 产品线
---

# 产品线

Sound Tracing 产品线由 **引擎**、**SDK 与插件**、**分析工具** 三个部分组成。

## Core — SimpleST

基于 C++20 的几何声学原生引擎。

- [SimpleST](../core/simplest.md) — 现行引擎。公开 C ABI 6（实时 `st_rt_*` / 离线 `st_off_*`）
- [STCoreV2 → SimpleST](../core/stcorev2.md) — 面向从上一代引擎迁移的团队的对照表

## SDK · 插件

让引擎可在各平台和中间件中使用的封装阵列。

- [SDK 概览](../sdk/overview.md)
- 游戏引擎：[Unity](../sdk/unity.md)、[Unreal Engine](../sdk/ue.md)
- 音频中间件：[FMOD](../sdk/fmod.md)、[Wwise](../sdk/wwise.md)
- Web：[soundtrace.js](../sdk/web.md)
- 计划中：[Python](../sdk/python.md)

## ExaTools

用于 IR 分析、数据转换、批量验证等工作的工具集。

- [ExaTools 概览](../exatools/overview.md)
