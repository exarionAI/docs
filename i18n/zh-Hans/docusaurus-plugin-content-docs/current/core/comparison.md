---
title: STCore vs STCoreV2
---

# STCore vs STCoreV2

本页汇总 [STCore](./stcore.md) 与 [STCoreV2](./stcorev2.md) 的功能差异。选型建议请参考 [推荐使用场景](#推荐使用场景)。

:::note 基准分支
- **STCore** — `main`
- **STCoreV2** — `feat/lock-free-hybrid-v2-reverb` (lock-free reverb)
:::

## 一览

| 项目 | STCore | STCoreV2 |
|---|---|---|
| 代际 | 第一代 | 第二代 |
| 活跃开发 | — | ✅ |
| 新集成推荐 | △（特殊场景） | ✅ |
| 主要语言 | C / C++ | C++ core + **C API** |
| 构建 | Visual Studio solution + CMake | CMake (cross-platform) |
| 主要平台 | Windows | macOS · Windows · Linux · WebAssembly |
| HW 加速 | 包含 **FPGA** 接口 | SW only |

## 传播算法

| 类别 | STCore | STCoreV2 |
|---|---|---|
| 核心模块 | `SoundTracer` (Core/) | `Propagator` + **`IPathModule` system** (propagation/module/) |
| 算法分离 | 单一 pipeline | **模块化**：Specular / UTDDiffraction / DiffuseOffset / StaticReverb，可按 listener 选择和替换 |
| Ray Generation | `RGC` (Ray Generation Cluster) | `RGC` + 每个 listener 的 ray count/depth API |
| 绕射模型 | `UTDDiffraction` (Uniform Theory of Diffraction) | `UTDDiffraction` (Uniform Theory of Diffraction) |
| 混响处理 | `ReverberationZoneManager` | **`StaticReverbModule`**，ReverbHitCollector + ReverbCoefficients |
| Max Path Depth | 项目设置 | **64** (`EXA_MAX_DEPTH_LIMIT`) |
| 结果数据结构 | `PathPPV`, `PropagationPath` | `PathPPV`, `Primitive`, sorted IR data |

## 声音化 (Auralization)

| 类别 | STCore | STCoreV2 |
|---|---|---|
| 模块 | `Auralization/` | **`auralizator/`** (core, frequence, filter, HRTF, states) |
| HRTF | `HRTF.h` + MIT HRTF library | `HRTF.h` + 外部 HRTF 文件/内存加载 API |
| HRTF 加载 API | 直接调用库 | `exaListenerSetHRTFFromFile/Memory` |
| 频率分段 | `FrequencyPartition` | `frequence/` (FrequencyBandResponse 等) |
| 卷积 | `Auralizator` | `filter/` (FilterChain, IRConvolver) |

## 材质模型

| 类别 | STCore | STCoreV2 |
|---|---|---|
| 模型 | 独立 Material 对象/ID | **直接存储在 Triangle 上** (absorption/transmission) |
| 反射计算 | 显式反射系数 | `reflection = 1 − (absorption + transmission)` |
| 路径统计 | 包含材质 ID | 暴露 absorption 系数 |

## API 与集成

| 类别 | STCore | STCoreV2 |
|---|---|---|
| API 暴露 | 直接链接 C++ 库 | **120+ C 函数** (`exasoundC.h`) |
| Web 构建 | — | **Emscripten** (`EMSCRIPTEN_KEEPALIVE`) |
| 绑定兼容性 | 仅 C++ target | 可集成 Web/Python/Unity/Unreal |
| 算法结构 | 单一实现 | 内部分离 reflection / diffraction / diffuse / reverb 模块 |
| 诊断与统计 | 主要用于内部 | `exaPropagatorGetProfile`, `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot` |
| 错误报告 | 主要依靠返回值 | 单一入口 `exaGetLastError()` |

## 平台与构建

| 类别 | STCore | STCoreV2 |
|---|---|---|
| Windows | ✅ | ✅ |
| macOS | △ 可尝试 CMake | ✅ |
| Linux | △ | ✅ |
| WebAssembly | — | ✅ |
| 构建系统 | Visual Studio `.sln` + CMake | CMake 3.22+ |
| C++ 标准 | 取决于项目设置 | C++17 build / C++20 coding guide |

## 加速器与外部集成

| 类别 | STCore | STCoreV2 |
|---|---|---|
| FPGA 接口 | ✅ (`HW/` — bfm_api, fpga_interface, libusb) | — |
| Bus Functional Model | ✅ | — |
| USB 设备通信 | ✅ (libusb) | — |
| 内置 BVH/TLAS | 自定义 | ✅ Native BVH/TLAS |
| **外部 BVH 回调** | — | ✅ **`ExternalAccelerator`** — 将 ray intersection 委托给主机 BVH，例如游戏引擎 BVH |
| 加速器抽象 | — | `IAccelerator` interface |

> STCore 的差异点在于同一个声学算法可以在 SW（通用 CPU）和 HW（FPGA 加速）两侧运行。STCoreV2 目前是 SW only，但可以通过**外部加速器回调**把 ray intersection 委托给主机已有的 BVH，从而降低集成成本。

## 并发与数据传递

| 类别 | STCore | STCoreV2 |
|---|---|---|
| Scene 数据传递 | 推测为直接引用 + mutex | **`SceneSnapshot`** — immutable per-tick POD snapshot |
| 多槽缓冲 | — | **`TripleBuffer`** (lock-free) |
| 线程亲和 | — | `ThreadAffinity` module |
| 诊断遥测 | 内部 | `Telemetry` module |

## 测试与文档

| 类别 | STCore | STCoreV2 |
|---|---|---|
| 自动化测试 | — 仅 Doxygen 文档 | **Google Test** (unit + benchmark) |
| 文档化 | Doxygen | Doxygen + 内部设计文档 (`docs/design/`) |

## 推荐使用场景

### 选择 STCoreV2 — *默认*

- 新项目
- Web 集成（浏览器 / WebAssembly）
- 包含 macOS、Linux 的跨平台部署
- 计划提供 Python、Unity、Unreal 等语言绑定
- 使用统计声学传播 (SSP) 模型

### 选择 STCore — *特殊场景*

- 维护已经集成 STCore 的代码
- 需要 **FPGA 加速路径**，且无法用 V2 的 SSP 模型替代
- 必须直接集成到基于 Visual Studio solution 的既有构建系统
- 必须保留依赖 UTD 绕射模型的已验证结果

## 参考

- [STCore](./stcore.md) — 第一代 core 详情
- [STCoreV2](./stcorev2.md) — 第二代 core 详情
- [SDK 概览](../sdk/overview.md)
