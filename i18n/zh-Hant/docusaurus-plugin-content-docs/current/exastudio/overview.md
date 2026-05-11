---
title: ExaStudio 概覽
---

# ExaStudio

**面向 Sound Tracing 工作流程的跨平台渲染软件。**

ExaStudio 是建置在內部 **exaEngine**（sound tracing rendering engine）之上的整合工具。目標是在一個環境中完成聲學場景建置、模擬結果視覺化和結果产出。

## 概覽

| 專案 | 值 |
|---|---|
| 基礎引擎 | exaEngine (in-house) |
| 平台 | Windows · macOS · **WebAssembly** |
| 主要目標 | Web 平台 |
| 建置 | CMake + 自訂建置脚本 (`mainBuild.sh`) |
| 狀態 | 活躍開發 |

## 設計方向

- 以**先建立共用模組，再按分支适配**的模型吸收不同客户端需求
- **跨平台**結構，同時支援 Windows / macOS / WebAssembly
- 追求**最小體積與最大性能**
- **重点面向 Web 平台** — 在瀏覽器中執行的 Sound Tracing 方案

## exaEngine 模組

ExaStudio 的核心引擎 (`exaEngine`) 結構如下。

```
exaEngine/
├── Engine/        # shared engine modules
├── Project/       # project management
├── core/          # core libraries
├── 3rd_party/     # external dependencies
├── buildTools/    # custom build system
└── cmake/         # CMake modules
```

## 建置

```bash
# Entry point — platform auto-detect + dependency build + main build
./exaEngine/mainBuild.sh
```

平台專用選項 override 位於 `exaEngine/buildTools/configs/` 下。

| 路徑 | 适用 |
|---|---|
| `cmake_opts/*.conf` | desktop (Windows/macOS) default |
| `cmake_opts/wasm/*.conf` | WebAssembly build override |

## 靜態連結 vs 動態連結

不同平台的函式庫連結方式不同。

| 平台 | 連結 |
|---|---|
| Windows | DLL (dynamic) |
| macOS | dylib (dynamic) / static |
| iOS | **static only** |
| WebAssembly | **static only** |

iOS 和 WASM 沒有相同的動態函式庫模型，因此所有依賴都必须靜態建置 (`BUILD_SHARED_LIBS=OFF`)。

:::info 即將推出 (Coming Soon)
包含安装、工作流程、快捷鍵和主要功能面板的使用者指南將在後續新增。
:::
