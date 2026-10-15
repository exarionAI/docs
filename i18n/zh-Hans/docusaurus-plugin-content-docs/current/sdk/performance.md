---
title: Performance Guide
description: 基于 SimpleST 的集成的性能轴 — 射线预算、lane 周期、Hybrid 早期反射、渲染模式、线程、测量指标。
---

# Performance Guide

在 SimpleST 中，提高听者 guide ray、声源 transport ray、反射深度、声源数和几何体规模，
路径会更稳定、空间感更好，但传播时间和音频渲染块成本也会随之上升。
本文整理 Web、Unity、UE、FMOD、Wwise 集成共有的成本轴和起点。

## 固定运行时约定

| 项目 | 当前约定 |
|---|---|
| 听者 | 每个实时上下文 1 个 |
| 输出 | 双耳/声像 2ch，或扬声器布局（HOA3 解码）N 声道 |
| 引擎采样率 | 固定 44.1 kHz，主机采样率由内置重采样器转换 |
| 渲染块 | 512 帧（≈11.6 ms @ 44.1 kHz）— 每块渲染成本必须在此预算内才不会断续 |
| 并发声源流 | 64 个（超出的声源为 dry 或创建失败） |
| 反射最大深度 | 16 · 透射 64 |
| 默认 guide ray / 深度 | `16 × 16` / 8（全局），逐声源深度 4 |
| 默认 transport ray | `16 × 8` |
| 计算线程 | `maxComputeThreads = 0` → min(性能核数, 6) |

## 主要选项与取舍

| 选项 | 质量影响 | 性能影响 |
|---|---|---|
| 听者 guide ray（N×N） | 反射/绕射路径发现与方向稳定性 | 反射/绕射 lane 成本随网格面积成比例增加 |
| 反射深度 | 允许高阶反射和混合绕射路径 | 路径搜索与 IR tap 数增加 |
| 声源 transport ray（W×H）× 深度 | late reverb 房间响应与材质响应的稳定性 | 与声源数 × 网格 × 深度成比例 |
| 声源数 | 同时空间化的发射器 | 传播 + 渲染（tap 数）成本 |
| 早期反射模式 | Objects = 所有路径单独 HRTF，Hybrid = 预算 + HOA3 bed | **Objects 与路径数成比例**地放大渲染块 |
| 反射 lane 周期 | 越长，早期反射跟随听者移动越慢 | 对传播 CPU 节省最大 |
| 渲染模式 | Buffered ≈3 块延迟 / In Callback 最低延迟 | In Callback 把渲染成本放在主机音频线程上 |
| HRTF 数据集 | SADIE D2（256 tap）> MIT KEMAR（128 tap）分辨率 | 卷积成本与 tap 长度成比例 |
| 动态对象数 | 反映移动的遮挡物 | 动态 TLAS 重建成本 |

## 早期反射：使用 Hybrid

这是在有 8 个声源的混响大厅（Sibenik）中测得的渲染块成本。

| 模式 | exact 对象 | 块成本 | 判定 |
|---|---:|---:|---|
| Objects | ≈650 | 16.8 ms | 超出 11.6 ms 预算 — 断续 |
| Hybrid | ≈33 | 2.4 ms | 通过 |

Hybrid 只把听者全局预算（反射 12+4 · 绕射 3+1）作为 exact 对象渲染，其余汇集到 HOA3 bed。
在 HRTF 多声源下约有 −1 ~ −2 dB 的音量差异。所有官方集成都默认启用 Hybrid，
Objects 用于基准试听和离线 A/B。

## 质量预设（按集成）

| 集成 | Fast | Balanced / Middle | Quality |
|---|---|---|---|
| Web（`quality`） | 8×8，深度 4 | 16×16，深度 6 | 24×24，深度 8 |
| Unity Listener | 16，深度 4 | 24，深度 8 | 32，深度 12 |
| UE Listener | 12×12，深度 4 | 16×16，深度 8 | 24×24，深度 8 |
| UE Source（transport） | 8×4，深度 3 | 16×8，深度 4 | 24×12，深度 6 |

Web 的声源 transport ray 也遵循同样的值。Unity 声源的 transport ray 默认为 24 / 深度 4。

## 起始 preset

| 场景 | guide ray | transport ray | 深度 | 反射 lane 周期 | 备注 |
|---|---|---|---|---|---|
| 移动端 / Web 多声源 | 8×8 ~ 12×12 | 8×4 ~ 8×8 | 4 | 33 ~ 66 ms | Fast 预设 |
| 桌面游戏 | 16×16 | 16×8 | 8 | 33 ms（UE 默认）~ 0 | Balanced |
| 质量演示 | 24×24 ~ 32×32 | 24×12 | 8 ~ 12 | 0 ms | Quality，声源 ≤ 8 |

如果空间感偏弱，不要先增加声源数，而是分别逐级提高 guide ray 与 transport ray 和深度来确认。
性能不足时按 (1) 确认 Hybrid → (2) 降低质量预设 → (3) 提高反射 lane 周期 →
(4) 关闭路径可视化的顺序调整。

## 线程与 lane

PIPELINED 调度器以独立节奏运行 Direct / Reflection-Diffraction / Reverb lane。

| lane | 默认最小周期 | 含义 |
|---|---:|---|
| Direct | 10 ms | 连续执行开始之间的间隔。直达声与透射 — 保持无 dropout |
| Reflection-Diffraction | 0 ms（立即） | 传播成本的大部分。等待中的请求会合并为一个 |
| Reverb | 4 ms | 执行完成到下一次的间隔 |

在 PIPELINED 中，`maxComputeThreads` 预算 N 至少为 3（音频 1 + Direct 专用 1 + 通用 N−2）。
在混合架构 CPU 上，建议用 `st_rt_set_thread_attributes`（UE `Prefer Performance Cores`）固定到性能核。
实际线程数用 `st_rt_get_thread_inventory` 确认。

## 需要测量的指标

| 分组 | 指标 | 来源 |
|---|---|---|
| 传播 | 各 lane 的 ms（direct / reflDiff / reverb）、IR 构建 ms | `st_rt_get_timing`（Web `debugSnapshot().simplest.timing`、UE Subsystem） |
| 渲染块 | `totalUs`、各阶段 µs（sourceInput / exactTaps / bed / send / late / output）、activeSources、exactTaps、sendTaps | `st_rt_render_get_process_stats` |
| IR 发布 | publishSequence 节奏、bed 单元数、prepare CPU/wall 比例（抢占 vs 慢核） | `st_rt_ir_get_stats` |
| 场景 | 网格、对象、声源、三角形数 | `st_rt_scene_get_stats` |
| 音频输入 | queued / capacity / dropped / underrun 帧 | `st_rt_source_get_stream_status` |
| 延迟 | 输出级延迟（帧）+ 队列 + 固定 DSP 延迟 | `st_rt_render_get_latency_frames` |
| 主机 | 帧时间 p50/p95/p99、音频回调超时次数 | 平台分析器 |

## 公开准则

| 项目 | 准则 |
|---|---|
| 已实测的值 | 同时标注平台、主机版本、SimpleST commit 与版本、场景 |
| 未测量的值 | 不要估算数字，标注为 `Measurement pending` |
| 流上限 | 把引擎上限 64 与实际推荐声源数分开 |
| Raw log | 不要原样放进客户文档，只公开汇总表与解读 |
