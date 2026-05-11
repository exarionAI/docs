---
title: ExaStudio 概览
---

# ExaStudio

**面向 Sound Tracing 工作流的跨平台渲染软件。**

ExaStudio 是构建在内部 **exaEngine**（sound tracing rendering engine）之上的集成工具。目标是在一个环境中完成声学场景构建、仿真结果可视化和结果产出。

## 概览

| 项目 | 值 |
|---|---|
| 基础引擎 | exaEngine (in-house) |
| 平台 | Windows · macOS · **WebAssembly** |
| 主要目标 | Web 平台 |
| 构建 | CMake + 自定义构建脚本 (`mainBuild.sh`) |
| 状态 | 活跃开发 |

## 设计方向

- 以**先建立公共模块，再按分支适配**的模型吸收不同客户端需求
- **跨平台**结构，同时支持 Windows / macOS / WebAssembly
- 追求**最小体积与最大性能**
- **重点面向 Web 平台** — 在浏览器中运行的 Sound Tracing 方案

## exaEngine 模块

ExaStudio 的核心引擎 (`exaEngine`) 结构如下。

```
exaEngine/
├── Engine/        # shared engine modules
├── Project/       # project management
├── core/          # core libraries
├── 3rd_party/     # external dependencies
├── buildTools/    # custom build system
└── cmake/         # CMake modules
```

## 构建

```bash
# Entry point — platform auto-detect + dependency build + main build
./exaEngine/mainBuild.sh
```

平台专用选项 override 位于 `exaEngine/buildTools/configs/` 下。

| 路径 | 适用 |
|---|---|
| `cmake_opts/*.conf` | desktop (Windows/macOS) default |
| `cmake_opts/wasm/*.conf` | WebAssembly build override |

## 静态链接 vs 动态链接

不同平台的库链接方式不同。

| 平台 | 链接 |
|---|---|
| Windows | DLL (dynamic) |
| macOS | dylib (dynamic) / static |
| iOS | **static only** |
| WebAssembly | **static only** |

iOS 和 WASM 没有相同的动态库模型，因此所有依赖都必须静态构建 (`BUILD_SHARED_LIBS=OFF`)。

:::info 即将推出 (Coming Soon)
包含安装、工作流、快捷键和主要功能面板的用户指南将在后续添加。
:::
