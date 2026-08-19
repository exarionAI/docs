---
title: Performance Guide
---

# Web SDK Performance Guide

在 soundtrace.js 中，提高 ray count、depth、source count 以及 geometry/BVH 设置，
可以改善声学路径的稳定性和空间感。同样的设置也会同时提高传播计算时间、内存占用、
主线程 frame time 和 AudioWorklet 负载。

本文是 SDK 集成方选择选项时的性能/质量参考。下面的预设是起点；实际推荐的 source
数量与各平台上限，会在测量完成后以数值表更新。

## 固定运行时契约

| 项目 | 当前契约 |
|---|---|
| Listener | 每个 scene 1 个 |
| Realtime output | stereo/binaural 2ch |
| 音频渲染路径 | ST/MT 均为 WASM `AudioWorkletProcessor` |
| Multi-source 音频 | 每个 source 调用 `source.play(input, 2)`（facade）/ ST·direct-native 使用 `createWorkletNode()` |
| Native source cap | 16 sources（`EXA_MAX_SOUNDSOURCE`） |
| Ray depth 上限 | 16（`EXA_MAX_DEPTH`） |
| 默认质量预设 | `quality: 'balanced'` = listener ray `24 x 24`，depth `8` |

`16` 是 native cap，即一个 scene 中可同时存在的 source 数量上限。面向客户应用推荐的
实时 source 数，必须在该上限之内，按平台、geometry 规模、ray budget、BVH 与 ST/MT
模式分别测量。

各质量预设设定的 listener ray grid 与 depth 如下。

| Preset | Listener ray | Depth |
|---|---|---|
| `fast` | `16 x 16` | `4` |
| `balanced`（默认） | `24 x 24` | `8` |
| `quality` | `32 x 32` | `12` |

## 主要选项与取舍

| 选项 | 质量影响 | 性能影响 |
|---|---|---|
| Listener ray width/height | 改善以听者为基准的路径发现与方向稳定性 | 传播计算随 ray grid 面积成比例增加 |
| Listener depth | 允许更深的 reflection/diffraction/reverb 路径 | path search 与 cache pressure 增加 |
| Source reverb ray width/height | 改善 source 侧 late reverb 覆盖与材质响应稳定性 | 成本随 source 数与 ray grid 面积增加 |
| Source reverb depth | 增加 source 侧 late reverb 的追踪深度 | depth 越大，path search 与 cache pressure 越高 |
| Source count | 同时空间化的 emitter 更多 | propagation 与 AudioWorklet mixer 成本增加 |
| BVH type | 改变 traversal/build 特性 | 依几何体与更新方式，build/refit/traversal 成本不同 |
| BVH max depth | 控制树深度 | 过浅会导致 traversal 低效，过深会增加 build/memory 成本 |
| Prims per leaf | 控制每个 leaf 的三角形数 | 依场景结构，traversal/build 的平衡点不同 |
| Animated/refit geometry | 反映移动的 collider | refit/rebuild 成本增加，作为 stress 项单独测量 |
| Thread mode | MT 可把 propagation job 分散到 worker 线程 | 需要 cross-origin isolation，线程/内存开销增加 |

## Reverb ray budget

Reverb ray 不是 listener ray 的复制值。source 侧 late reverb 的成本按
`source count × width × height × depth` 增长，因此生产默认值要与 listener ray 分开，
按场景逐步提高。QA 基准 sweep 为 source `[4, 8, 12, 16]`，general ray 与 reverb ray
各自经过 `4 x 4 x 3`、`8 x 8 x 7`、`16 x 16 x 11`、`32 x 32 x 16` 档位，path cache
`[256, 512, 1024]`。

## 起始预设

在实测表格填好之前，请把下面的值作为起点，并按应用的目标 FPS 与听感质量调整。

| Preset | Thread | Listener rays | Reverb rays | Depth | BVH | 用途 | 测量状态 |
|---|---|---:|---:|---:|---|---|---|
| Mobile conservative | ST | `16 x 16` | `4 x 4` 或 `8 x 8` | `4` | LBVH 或 platform default | 移动端最低基准 | Measurement pending |
| Desktop balanced | ST 或 MT | `24 x 24` | `8 x 8` | `8` | LBVH_SIMD8 | 桌面基本基准 | Measurement pending |
| Desktop quality | MT | `32 x 32` | `16 x 16` | `12` | LBVH_SIMD8 | 质量优先桌面 | Measurement pending |
| Stress only | MT | `32 x 32` | `32 x 32` | `7..16` | BVH matrix | 仅用于极限测量 | 非 realtime 默认值 |

> **MT 的收益尚未测量，并非必然更快。** 上表 MT 预设的速度收益仍是
> `Measurement pending`。MT 会把 propagation job 分散到 worker，因此收益出现在
> **ray 预算与 source 数较大时**（高 ray grid/depth、多 source）；在小场景中，worker
> 往返与内存开销可能让 ST 更简单也更快。此外 MT 还有 cross-origin isolation
> （COOP/COEP）的部署成本。小场景与简单页面请从 ST 开始，在预算较大的场景中
> **实测对比** ST↔MT 后再选择 MT。

如果空间感偏弱，不要先增加 source 数量；应分别、逐级提高 listener ray 与 source
reverb ray 的 count/depth。source 数量的增加放到最后测量。

## 需要测量的指标

在客户文档中给出数值时，请在相同 duration/warmup 条件下重复测量同一 scenario，并且
只公开汇总值而非 raw log。

| 分组 | 指标 |
|---|---|
| Browser frame | 平均 FPS、frame time p50/p95/p99、worst frame、dropped frame count |
| Main-thread stall | `PerformanceObserver` longtask count/total/worst（仅支持的浏览器） |
| Engine propagation | `scene.tick()` + `scene.updatePropagation()` 时间 p50/p95/p99/worst |
| Native job timing | propagation job timing frame、worker 分散/等待时间 |
| Path quality | valid path count 平均/最大值、material/path 变化的听感记录 |
| Audio | `AudioContext.sampleRate`、`baseLatency`、`outputLatency`、state、setup time |
| Memory | native memory trace snapshot、JS heap snapshot |
| Manual observation | drop-out、定位偏弱、thermal、风扇噪音、体感耗电 |

仅靠浏览器 JavaScript 很难可靠地得到跨平台通用的功耗/thermal 数值。功耗与 thermal
不要作为自动测量值确定，应拆分为 manual observation 或专用设备的测量结果。

## 测量矩阵

| Matrix | 值 |
|---|---|
| Baseline | ST/MT 各 1 source，listener `16 x 16 x 3`，source `16 x 8 x 3`，static small geometry |
| Quality scale | listener `16 x 16`、`32 x 32`；source reverb `4 x 4`、`8 x 8`、`16 x 16`、`32 x 32`；depth `3`、`7`、`11`、`16` |
| Source scale | `1`、`2`、`4`、`8`、`12`、`16` sources（native cap `16`） |
| Reverb ray scale | source `[4, 8, 12, 16]`，general ray 步进 `4 x 4 x 3` → `8 x 8 x 7` → `16 x 16 x 11` → `32 x 32 x 16`，reverb ray 同步进，path cache `[256, 512, 1024]` |
| Geometry/BVH | small/medium/large geometry、HKDtree、LBVH、LBVH_SIMD4/8/16、LBVH_NWAY4/8/16 |
| Stress only | animated/refit、rebuild-heavy、native source cap、high ray budget |

## 公开准则

| 项目 | 准则 |
|---|---|
| 已实测的值 | 同时标注 platform、browser、SDK commit、STCoreV2 commit 与 scenario |
| 未测量的值 | 不要估算数字，标注为 `Measurement pending` |
| Source cap | 把 native cap `16` 与实际推荐 source 数分开 |
| Stress 结果 | 作为极限/回归检测用途，而非 realtime 推荐值 |
| Raw log | 不要原样放进客户文档，只公开汇总表与解读 |
