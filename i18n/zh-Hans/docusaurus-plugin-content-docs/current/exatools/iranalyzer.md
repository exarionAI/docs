---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response (IR) 分析与可视化工具。**

IRAnalyzer 用于验证 Sound Tracing 几何声学仿真器生成的 IR 的准确性，并与实测数据或其他仿真器
结果进行比较分析。它由两个可执行文件组成。

:::note
IRAnalyzer 的实时仿真后端联动选项是基于 STCoreV2 源码树编写的。以 SimpleST 离线 ABI
（`SimpleSTOffline`）作为后端的联动是单独的工作；在此之前，请使用把 SimpleST 生成的压力 IR（WAV）
作为外部 IR 导入并分析的流程。
:::

## 组成

| 模块 | 可执行文件 | 说明 |
|---|---|---|
| **simulator** | `rir_sim` | 基于 Embree 的独立路径追踪 IR 合成器（用作验证基线） |
| **viewer** | `rir_viewer` | 基于 SDL3 + ImGui 的实时可视化与分析工具 |

## 构建

### 要求

- CMake 3.20+
- C++20 兼容编译器
- macOS 13.0+（优先支持 Apple 平台）

大部分依赖通过 CMake `FetchContent` 自动下载。

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### 可选依赖

| 依赖 | CMake 变量 | 用途 |
|---|---|---|
| Intel Embree 4 | （系统安装） | `rir_sim` 路径追踪 |
| STCoreV2 源码（遗留） | `STCORE_SOURCE_DIR` | 旧的实时仿真后端 |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | 直接加载 `.skp` 文件 |

```bash
# 添加 SketchUp SDK
cmake -S . -B build \
  -DSKETCHUP_SDK_DIR=/path/to/sketchup-sdk-mac \
  -DCMAKE_BUILD_TYPE=Release
```

### 测试

```bash
cd build && ctest
```

## Viewer（`rir_viewer`）

以 ImGui docking 风格的多面板界面运行。

| 面板 | 功能 |
|---|---|
| **3D Viewport** | 场景 geometry、声学路径、调试可视化 |
| **Control** | 仿真参数（ray 分辨率、max depth、调优） |
| **View** | 场景统计、渲染选项（wireframe、face culling） |
| **Materials** | 各频段吸声与散射系数，BRAS CSV 自动映射 |

## Simulator（`rir_sim`）

直接使用 Embree 追踪路径并合成 IR 的**独立**合成器。它在相同场景与材质条件下与 SimpleST 对比结果，
用作验证准确性的*基线（reference）*。

## 使用场景

- **回归验证** — 确认引擎修改前后的 IR 差异
- **算法比较** — 确定性追踪（rir_sim, Embree）vs 统计性声学传播（SimpleST）
- **材质调优** — 调整各频段吸声率后立即可视化
- **实测比较** — 在同一坐标下叠加实测 IR 与仿真 IR（以 BRAS CR2 ~ CR4 为基准）

## 参考

- [SimpleST](../core/simplest.md) — 分析目标仿真器
- [ExaTools 概览](./overview.md)
