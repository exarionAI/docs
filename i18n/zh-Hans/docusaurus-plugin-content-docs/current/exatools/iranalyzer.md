---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response (IR) 分析与可视化工具。**

IRAnalyzer 用于验证 [exaSound (STCoreV2)](../core/stcorev2.md) 几何声学仿真器生成的 IR 准确性，并与实测数据或其他仿真器结果进行比较分析。它由两个可执行文件组成。

## 组成

| 模块 | 可执行文件 | 说明 |
|---|---|---|
| **simulator** | `rir_sim` | 基于 Embree 的独立路径追踪 IR 合成器，用作验证 baseline |
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
| Intel Embree 4 | system install | `rir_sim` path tracing |
| exaSound (STCoreV2) | `STCORE_SOURCE_DIR` | 实时几何声学仿真 backend |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | 直接加载 `.skp` 文件 |

```bash
# exaSound integration
cmake -S . -B build \
  -DSTCORE_SOURCE_DIR=/path/to/STCoreV2/exaSound \
  -DCMAKE_BUILD_TYPE=Release

# Add SketchUp SDK
cmake -S . -B build \
  -DSKETCHUP_SDK_DIR=/path/to/sketchup-sdk-mac \
  -DCMAKE_BUILD_TYPE=Release
```

### 测试

```bash
cd build && ctest
```

## Viewer (`rir_viewer`)

Viewer 以 ImGui docking 风格的多面板界面运行。

| 面板 | 功能 |
|---|---|
| **3D Viewport** | scene geometry、声学路径、debug visualization |
| **Control** | simulation parameters（ray resolution、max depth、tuning） |
| **View** | scene statistics、render options（wireframe、face culling） |
| **Materials** | 8-band absorption/scattering 系数，BRAS CSV 自动 mapping |

## Simulator (`rir_sim`)

Simulator 是一个直接使用 Embree 追踪路径并合成 IR 的**独立**合成器。它在相同 scene/material 条件下与 STCoreV2 对比，用作验证准确性的 *reference* baseline。

## 使用场景

- **回归验证** — 确认 STCoreV2 修改前后的 IR 差异
- **算法比较** — deterministic tracing (`rir_sim`, Embree) vs statistical sound propagation (STCoreV2)
- **材质调优** — 调整 8-band absorption 后立即可视化
- **实测比较** — 在同一坐标下 overlay 实测 IR 与仿真 IR

## 参考

- [STCoreV2](../core/stcorev2.md) — 分析目标仿真器
- [ExaTools 概览](./overview.md)
