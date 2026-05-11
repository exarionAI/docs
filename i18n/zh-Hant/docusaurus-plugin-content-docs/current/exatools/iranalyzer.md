---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response (IR) 分析與視覺化工具。**

IRAnalyzer 用於驗證 [exaSound (STCoreV2)](../core/stcorev2.md) 幾何聲學模擬器產生的 IR 准确性，並與实測資料或其他模擬器結果进行比較分析。它由两個可執行檔案组成。

## 组成

| 模組 | 可執行檔案 | 说明 |
|---|---|---|
| **simulator** | `rir_sim` | 基於 Embree 的独立路徑追蹤 IR 合成器，用作驗證 baseline |
| **viewer** | `rir_viewer` | 基於 SDL3 + ImGui 的即時視覺化與分析工具 |

## 建置

### 要求

- CMake 3.20+
- C++20 兼容编譯器
- macOS 13.0+（優先支援 Apple 平台）

大部分依賴透過 CMake `FetchContent` 自動下载。

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### 可選依賴

| 依賴 | CMake 变量 | 用途 |
|---|---|---|
| Intel Embree 4 | system install | `rir_sim` path tracing |
| exaSound (STCoreV2) | `STCORE_SOURCE_DIR` | 即時幾何聲學模擬 backend |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | 直接載入 `.skp` 檔案 |

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

### 測試

```bash
cd build && ctest
```

## Viewer (`rir_viewer`)

Viewer 以 ImGui docking 风格的多面板界面執行。

| 面板 | 功能 |
|---|---|
| **3D Viewport** | scene geometry、聲學路徑、debug visualization |
| **Control** | simulation parameters（ray resolution、max depth、tuning） |
| **View** | scene statistics、render options（wireframe、face culling） |
| **Materials** | 8-band absorption/scattering 系數，BRAS CSV 自動 mapping |

## Simulator (`rir_sim`)

Simulator 是一個直接使用 Embree 追蹤路徑並合成 IR 的**独立**合成器。它在相同 scene/material 条件下與 STCoreV2 對比，用作驗證准确性的 *reference* baseline。

## 使用場景

- **回归驗證** — 確認 STCoreV2 修改前後的 IR 差异
- **演算法比較** — deterministic tracing (`rir_sim`, Embree) vs statistical sound propagation (STCoreV2)
- **材質调优** — 调整 8-band absorption 後立即視覺化
- **实測比較** — 在同一坐標下 overlay 实測 IR 與模擬 IR

## 參考

- [STCoreV2](../core/stcorev2.md) — 分析目標模擬器
- [ExaTools 概覽](./overview.md)
