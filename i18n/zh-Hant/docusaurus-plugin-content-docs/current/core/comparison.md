---
title: STCore vs STCoreV2
---

# STCore vs STCoreV2

本頁汇总 [STCore](./stcore.md) 與 [STCoreV2](./stcorev2.md) 的功能差异。選型建議請參考 [推薦使用場景](#推薦使用場景)。

:::note 基準分支
- **STCore** — `main`
- **STCoreV2** — `feat/lock-free-hybrid-v2-reverb` (lock-free reverb)
:::

## 一览

| 專案 | STCore | STCoreV2 |
|---|---|---|
| 代际 | 第一代 | 第二代 |
| 活躍開發 | — | ✅ |
| 新整合推薦 | △（特殊場景） | ✅ |
| 主要語言 | C / C++ | C++ core + **C API** |
| 建置 | Visual Studio solution + CMake | CMake (cross-platform) |
| 主要平台 | Windows | macOS · Windows · Linux · WebAssembly |
| HW 加速 | 包含 **FPGA** 介面 | SW only |

## 傳播演演算法

| 類別 | STCore | STCoreV2 |
|---|---|---|
| 核心模組 | `SoundTracer` (Core/) | `Propagator` + **`IPathModule` system** (propagation/module/) |
| 演算法分离 | 單一 pipeline | **模組化**：Specular / UTDDiffraction / DiffuseOffset / StaticReverb，可按 listener 選擇和替換 |
| Ray Generation | `RGC` (Ray Generation Cluster) | `RGC` + 每個 listener 的 ray count/depth API |
| 繞射模型 | `UTDDiffraction` (Uniform Theory of Diffraction) | `UTDDiffraction` (Uniform Theory of Diffraction) |
| 混響處理 | `ReverberationZoneManager` | **`StaticReverbModule`**，ReverbHitCollector + ReverbCoefficients |
| Max Path Depth | 專案設定 | **16** (`EXA_MAX_DEPTH`) |
| 結果資料結構 | `PathPPV`, `PropagationPath` | `PathPPV`, `Primitive`, sorted IR data |

## 聲音化 (Auralization)

| 類別 | STCore | STCoreV2 |
|---|---|---|
| 模組 | `Auralization/` | **`auralizator/`** (core, frequence, filter, HRTF, states) |
| HRTF | `HRTF.h` + MIT HRTF library | `HRTF.h` + 外部 HRTF 檔案/記憶體載入 API |
| HRTF 載入 API | 直接调用函式庫 | `exaListenerSetHRTFFromFile/Memory` |
| 頻率分段 | `FrequencyPartition` | `frequence/` (FrequencyBandResponse 等) |
| 卷積 | `Auralizator` | `filter/` (FilterChain, IRConvolver) |

## 材質模型

| 類別 | STCore | STCoreV2 |
|---|---|---|
| 模型 | 独立 Material 物件/ID | **直接存储在 Triangle 上** (absorption/transmission) |
| 反射计算 | 显式反射系數 | `reflection = 1 − (absorption + transmission)` |
| 路徑統計 | 包含材質 ID | 暴露 absorption 系數 |

## API 與整合

| 類別 | STCore | STCoreV2 |
|---|---|---|
| API 暴露 | 直接連結 C++ 函式庫 | **120+ C 函數** (`exasoundC.h`) |
| Web 建置 | — | **Emscripten** (`EMSCRIPTEN_KEEPALIVE`) |
| 綁定兼容性 | 仅 C++ target | 可整合 Web/Python/Unity/Unreal |
| 演算法結構 | 單一實作 | 內部分离 reflection / diffraction / diffuse / reverb 模組 |
| 診斷與統計 | 主要用於內部 | `exaPropagatorGetProfile`, `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot` |
| 錯誤报告 | 主要依靠返回值 | 單一入口 `exaGetLastError()` |

## 平台與建置

| 類別 | STCore | STCoreV2 |
|---|---|---|
| Windows | ✅ | ✅ |
| macOS | △ 可尝試 CMake | ✅ |
| Linux | △ | ✅ |
| WebAssembly | — | ✅ |
| 建置系統 | Visual Studio `.sln` + CMake | CMake 3.22+ |
| C++ 標准 | 取决於專案設定 | C++17 build / C++20 coding guide |

## 加速器與外部整合

| 類別 | STCore | STCoreV2 |
|---|---|---|
| FPGA 介面 | ✅ (`HW/` — bfm_api, fpga_interface, libusb) | — |
| Bus Functional Model | ✅ | — |
| USB 設備通訊 | ✅ (libusb) | — |
| 内置 BVH/TLAS | 自訂 | ✅ Native BVH/TLAS |
| **外部 BVH 回调** | — | ✅ **`ExternalAccelerator`** — 將 ray intersection 委托给主機 BVH，例如遊戲引擎 BVH |
| 加速器抽象 | — | `IAccelerator` interface |

> STCore 的差异点在於同一個聲學演算法可以在 SW（通用 CPU）和 HW（FPGA 加速）两侧執行。STCoreV2 目前是 SW only，但可以透過**外部加速器回调**把 ray intersection 委托给主機已有的 BVH，從而降低整合成本。

## 並行與資料傳遞

| 類別 | STCore | STCoreV2 |
|---|---|---|
| Scene 資料傳递 | 推測為直接引用 + mutex | **`SceneSnapshot`** — immutable per-tick POD snapshot |
| 多槽缓冲 | — | **`TripleBuffer`** (lock-free) |
| 執行緒亲和 | — | `ThreadAffinity` module |
| 診斷遙測 | 內部 | `Telemetry` module |

## 測試與檔案

| 類別 | STCore | STCoreV2 |
|---|---|---|
| 自動化測試 | — 仅 Doxygen 檔案 | **Google Test** (unit + benchmark) |
| 檔案化 | Doxygen | Doxygen + 內部設計檔案 (`docs/design/`) |

## 推薦使用場景

### 選擇 STCoreV2 — *預設*

- 新專案
- Web 整合（瀏覽器 / WebAssembly）
- 包含 macOS、Linux 的跨平台部署
- 計畫提供 Python、Unity、Unreal 等語言綁定
- 使用統計聲學傳播 (SSP) 模型

### 選擇 STCore — *特殊場景*

- 維護已经整合 STCore 的程式碼
- 需要 **FPGA 加速路徑**，且无法用 V2 的 SSP 模型替代
- 必须直接整合到基於 Visual Studio solution 的既有建置系統
- 必须保留依賴 UTD 繞射模型的已驗證結果

## 參考

- [STCore](./stcore.md) — 第一代 core 详情
- [STCoreV2](./stcorev2.md) — 第二代 core 详情
- [SDK 概覽](../sdk/overview.md)
