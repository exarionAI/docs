---
title: STCore
---

# STCore

**第一代 Sound Tracing core 模組：與 FPGA 硬件加速联動的 SoundTracer + Auralizator 函式庫。**

STCore 是 Sound Tracing 技術的第一代實作。它是基於 C/C++ 的聲學模擬函式庫，並包含用於和 FPGA 加速器通訊的 HW 介面層。目前處於維護模式，新開發在 [STCoreV2](./stcorev2.md) 中进行。

## 概覽

| 專案 | 值 |
|---|---|
| 主要語言 | C / C++ |
| 建置 | Visual Studio solution (`SoundTracer.sln`) + CMake |
| 主要平台 | Windows (x64) |
| HW 加速 | FPGA 介面 (基於 libusb) |
| 狀態 | 維護 |
| 後續線路 | [STCoreV2](./stcorev2.md) |

## 模組結構

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

### Core 主要元件

| 元件 | 作用 |
|---|---|
| `SoundTracer` | 基於 ray tracing 的聲學路徑搜尋 |
| `Auralizator` | 路徑 → IR 合成 → 卷積 |
| `UTDDiffraction` | UTD (Uniform Theory of Diffraction) 繞射模型 |
| `ReverberationZoneManager` | 混響区域管理 |
| `RGC` | Ray Generation Cluster |
| `PathPPV` | 路徑資訊資料結構 |

### HW 模組

`HW/` 目錄是與 FPGA 加速器通訊的層。

- `fpga_interface.{cpp,h}` — 板卡控制
- `bfm_api.{c,h}` — Bus Functional Model 介面
- `mem_api.{c,h}` — 設備記憶體访问
- `libusb` — USB 通訊

由於這一層，同一個聲學演算法可以在 SW（通用 CPU）和 HW（FPGA 加速）两侧執行。

## 與 STCoreV2 的關係

STCoreV2 是在 STCore 的傳播模型、建置方式和 API 暴露方式上擴充的後續線路。完整比較表請參考 [STCore vs STCoreV2](./comparison.md)。

## 何時選擇 STCore

新專案推荐使用 [STCoreV2](./stcorev2.md)。仅在以下情况下考虑 STCore。

- 已有程式碼整合了 STCore，正在遷移到 V2
- 需要 FPGA 加速路徑，且无法用 V2 的 SSP 模型替代
- 必须直接整合到基於 Visual Studio solution 的既有建置系統

## 參考

- [STCoreV2](./stcorev2.md) — 活躍開發中的下一代 core
- [SDK 概覽](../sdk/overview.md)
