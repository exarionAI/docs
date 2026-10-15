---
title: ExaTools 概览
---

# ExaTools

用于分析、验证和可视化声学仿真结果的工具集。

## 工具

| 名称 | 用途 | 状态 |
|---|---|---|
| [IRAnalyzer](./iranalyzer.md) | IR 分析与可视化，基于 Embree 的验证 | 可用 |

## SimpleST 内置的分析路径

即使没有单独的工具，[SimpleST](../core/simplest.md) 离线引擎（`SimpleSTOffline`）也能确定性地生成
Raw 能量 tap、9 频段压力 IR 和双耳 IR。soundtrace.js 的 `getIRs()` / `renderMonoImpulseResponse()`
以及 UE、Unity 的统计表面也暴露同样的引擎计量（`st_rt_get_timing`、`st_rt_ir_get_stats`）。

## 追加工具

更多工具会逐步加入。
