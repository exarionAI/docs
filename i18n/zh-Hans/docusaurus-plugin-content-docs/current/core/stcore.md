---
title: STCore
---

# STCore

**第一代 Sound Tracing core 模块：与 FPGA 硬件加速联动的 SoundTracer + Auralizator 库。**

STCore 是 Sound Tracing 技术的第一代实现。它是基于 C/C++ 的声学仿真库，并包含用于和 FPGA 加速器通信的 HW 接口层。目前处于维护模式，新开发在 [STCoreV2](./stcorev2.md) 中进行。

## 概览

| 项目 | 值 |
|---|---|
| 主要语言 | C / C++ |
| 构建 | Visual Studio solution (`SoundTracer.sln`) + CMake |
| 主要平台 | Windows (x64) |
| HW 加速 | FPGA 接口 (基于 libusb) |
| 状态 | 维护 |
| 后续线路 | [STCoreV2](./stcorev2.md) |

## 模块结构

```
STCore/
├── SoundTracerSource/
│   ├── Core/         # acoustic tracing and auralization core
│   ├── HW/           # FPGA interface
│   ├── Auralization/ # convolution and HRTF
│   ├── Math/         # vector and matrix utilities
│   ├── Objects/      # scene objects
│   ├── OperatorSource/
│   ├── GL/           # visualization helpers
│   └── Utils/        # common utilities
├── SoundTracer/         # Visual Studio demo/launcher
├── SoundTracingDemo/    # demo application
├── LIB/                 # build outputs
└── Doc/                 # Doxygen documentation
```

### Core 主要组件

| 组件 | 作用 |
|---|---|
| `SoundTracer` | 基于 ray tracing 的声学路径搜索 |
| `Auralizator` | 路径 → IR 合成 → 卷积 |
| `UTDDiffraction` | UTD (Uniform Theory of Diffraction) 绕射模型 |
| `ReverberationZoneManager` | 混响区域管理 |
| `RGC` | Ray Generation Cluster |
| `PathPPV` | 路径信息数据结构 |

### HW 模块

`HW/` 目录是与 FPGA 加速器通信的层。

- `fpga_interface.{cpp,h}` — 板卡控制
- `bfm_api.{c,h}` — Bus Functional Model 接口
- `mem_api.{c,h}` — 设备内存访问
- `libusb` — USB 通信

由于这一层，同一个声学算法可以在 SW（通用 CPU）和 HW（FPGA 加速）两侧运行。

## 与 STCoreV2 的关系

STCoreV2 是在 STCore 的传播模型、构建方式和 API 暴露方式上扩展的后续线路。完整比较表请参考 [STCore vs STCoreV2](./comparison.md)。

## 何时选择 STCore

新项目推荐使用 [STCoreV2](./stcorev2.md)。仅在以下情况下考虑 STCore。

- 已有代码集成了 STCore，正在迁移到 V2
- 需要 FPGA 加速路径，且无法用 V2 的 SSP 模型替代
- 必须直接集成到基于 Visual Studio solution 的既有构建系统

## 参考

- [STCoreV2](./stcorev2.md) — 活跃开发中的下一代 core
- [SDK 概览](../sdk/overview.md)
