---
sidebar_position: 1
title: SDK 概览
description: SimpleST 实时空间声学引擎的 Web、Unity、Unreal Engine、FMOD、Wwise 集成概览。
---

# SDK 概览

SoundTrace SDK 是把 [SimpleST](../core/simplest.md) 引擎封装到 Web、游戏引擎和音频中间件中的
产品线。所有封装都在同一仓库中消费同一份引擎 SDK（`out/dist/<platform>_release/SimpleST`），
基于 **SimpleST 2.12.0 / ABI 6**。

## 集成阵列

| 名称 | 目标 | 形式 | 状态 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.0.0（vendor ZIP / npm tgz） | 可用 |
| [Unity](./unity.md) | Unity 2022.3 LTS 或更高（Unity 6 已验证） | `.unitypackage` 0.3.0 | 可用 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.3.0 + Python 安装器 | 可用 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP 插件 | 可用 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing`（Object Processor + Metadata）插件 | 可用（Audiokinetic 合作伙伴审批进行中） |
| [Python](./python.md) | 分析与研究 | — | 计划中 |

当项目中存在 FMOD 或 Wwise 插件时，UE 和 Unity 封装会自动切换为挂接到该中间件 SimpleST 插件的
**集成模式**（与 Meta XR Audio 相同的分工）。此时游戏引擎侧的组件只负责几何体、材质和可视化，
渲染由中间件插件完成。

## 支持平台

| 平台 | 引擎二进制 | 备注 |
|---|---|---|
| Windows x64 | `SimpleSTRealtime.dll` | Wwise Authoring 插件为 Windows DLL |
| macOS | Universal dylib（arm64 + x86_64） | |
| Linux x86_64 | `.so`（glibc 2.34+） | |
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 24+ |
| iOS | device arm64 · simulator arm64/x86_64 静态库 / XCFramework | iOS 15+ |
| Web | pthreads WASM（`SimpleSTRealtime.mjs/.wasm`）+ 单线程 Offline | 需要 COOP/COEP |

## 通用使用原则

1. **从质量预设开始** — `Fast` / `Balanced` / `Quality`。它同时决定听者 guide ray 和反射深度，
   默认 `Balanced` 与引擎默认（16×16，深度 8）相同。
2. **早期反射使用 Hybrid**。所有集成都在渲染启动后应用 Hybrid。Objects 模式用于基准试听和离线对比。
3. **HRTF 有两种**。引擎内置的 MIT KEMAR，以及随包分发的 SADIE II D2 KEMAR。
   扬声器输出为 HOA3 解码（2.0 ~ 7.1），并有轻量的立体声声像回退。
4. **材质按名称映射到 9 频段预设**。Unity、Web、UE 默认使用同一套 SoundTrace 游戏材质 22 种（游戏预设，
   不是测量数据；名称、顺序和 9 频段数值相同）；FMOD、Wwise 不公开材质名称，使用引擎默认库。直接编辑
   仅限于每个频段都满足 R+A+T=1 的已验证值。
5. 射线分辨率、深度、lane 刷新周期等高级旋钮**只在测量之后**调整。
6. 单位是米。以 cm 为单位的主机（UE、Wwise for Unreal）由封装传入 `sceneRatio = 0.01`。

## 从哪里开始

- 浏览器和 Three.js → [Web SDK](./web.md)
- Unity 游戏 → [Unity SDK](./unity.md)
- Unreal Engine 游戏 → [Unreal Engine SDK](./ue.md)
- 用 FMOD Studio 创作的项目 → [FMOD 插件](./fmod.md)
- 用 Wwise 创作的项目 → [Wwise 插件](./wwise.md)
- 原生 C/C++ → [SimpleST](../core/simplest.md)
- 正在迁移 STCoreV2 集成 → [STCoreV2 → SimpleST](../core/stcorev2.md)
