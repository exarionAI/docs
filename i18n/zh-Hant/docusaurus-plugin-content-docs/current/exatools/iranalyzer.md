---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response（IR）分析與視覺化工具。**

IRAnalyzer 用於驗證 Sound Tracing 幾何聲學模擬器所產生 IR 的正確性，並與實測資料或其他模擬器的結果
進行比較分析。它由兩個可執行檔組成。

:::note
IRAnalyzer 的即時模擬後端串接選項是以 STCoreV2 原始碼樹為基準撰寫的。
以 SimpleST 離線 ABI（`SimpleSTOffline`）作為後端的串接是另一項工作；在那之前，請採用將
SimpleST 產生的壓力 IR（WAV）當作外部 IR 載入後分析的流程。
:::

## 組成

| 模組 | 可執行檔 | 說明 |
|---|---|---|
| **simulator** | `rir_sim` | 以 Embree 為基礎的獨立路徑追蹤 IR 合成器（驗證用基準線） |
| **viewer** | `rir_viewer` | 以 SDL3 + ImGui 為基礎的即時視覺化與分析工具 |

## 建置

### 需求

- CMake 3.20+
- 相容 C++20 的編譯器
- macOS 13.0+（優先支援 Apple 平台）

大部分相依套件會透過 CMake `FetchContent` 自動下載。

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### 可選相依套件

| 相依套件 | CMake 變數 | 用途 |
|---|---|---|
| Intel Embree 4 | （系統安裝） | `rir_sim` 路徑追蹤 |
| STCoreV2 原始碼（舊版） | `STCORE_SOURCE_DIR` | 舊的即時模擬後端 |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | 直接載入 `.skp` 檔案 |

```bash
# 加入 SketchUp SDK
cmake -S . -B build \
  -DSKETCHUP_SDK_DIR=/path/to/sketchup-sdk-mac \
  -DCMAKE_BUILD_TYPE=Release
```

### 測試

```bash
cd build && ctest
```

## Viewer（`rir_viewer`）

以 ImGui docking 為基礎的多面板介面執行。

| 面板 | 功能 |
|---|---|
| **3D Viewport** | 場景幾何體、聲學路徑、偵錯視覺化 |
| **Control** | 模擬參數（ray 解析度、max depth、調校） |
| **View** | 場景統計、渲染選項（wireframe、face culling） |
| **Materials** | 各頻段吸音率與散射係數、BRAS CSV 自動對應 |

## Simulator（`rir_sim`）

直接使用 Embree 追蹤路徑並合成 IR 的 **獨立** 合成器。在相同場景與材質條件下與 SimpleST 的結果比較，
作為驗證正確性的 *基準線（reference）*。

## 應用情境

- **回歸驗證** — 確認引擎變更前後的 IR 差異
- **演算法比較** — 確定性追蹤（rir_sim、Embree）vs 統計式聲學傳播（SimpleST）
- **材質調校** — 調整各頻段吸音率後立即視覺化
- **實測比較** — 在同一座標上疊加量測 IR 與模擬 IR（以 BRAS CR2 ~ CR4 為基準）

## 參考

- [SimpleST](../core/simplest.md) — 分析對象的模擬器
- [ExaTools 概覽](./overview.md)
