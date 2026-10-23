---
sidebar_position: 1
title: SDK 概览
description: SimpleST 实时空间声学引擎的 Web、Unity、Unreal Engine、FMOD、Wwise 集成概览。
---

# SDK 概览

SoundTrace SDK 是把 [SimpleST](../core/simplest.md) 引擎封装到 Web、游戏引擎和音频中间件中的
产品线。所有封装都在同一仓库中消费同一份引擎 SDK（`out/dist/<platform>_release/SimpleST`），
基于 **SimpleST 2.18.2 / ABI 6**。
当前 SDK 发行版为 2.18.2-jhj.3（2026-10-23）。引擎加入了[声源内存预算](#声源数量上限)，封装版本
保持不变。
上一版本：2.12.0 — Web 1.0.0 · Unity 0.3.0 · UE 0.3.0 · FMOD 0.2.0 · Wwise 0.1.0。作为旧版产品线继续提供。

## 集成阵列

| 名称 | 目标 | 形式 | 状态 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.1.0（vendor ZIP / npm tgz） | 可用 |
| [Unity](./unity.md) | Unity 2022.3 LTS 或更高（Unity 6 已验证） | `.unitypackage` 0.4.0 | 可用 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.4.0 + Python 安装器 | 可用 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP 插件 0.3.0 | 可用 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing`（Object Processor + Metadata）插件 0.2.0 | 可用（Audiokinetic 合作伙伴审批进行中） |
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
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 28+（引擎 `.so` 直接链接 `libaaudio`） |
| iOS | device arm64 · simulator arm64 静态库 / XCFramework | iOS 15+ |
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
7. **输出限制器由主机主输出链负责**。引擎 2.18.0 在创建上下文后立即开启 true-peak 限制器
   （−1 dBTP，137 采样延迟），但 UE、Unity、FMOD、Wwise、Web 封装按文档所述的默认值将限制器保持**关闭**。
   开启方法请参见各 SDK 页面。

## 声源数量上限

从 SDK 发行版 2.18.2-jhj.3 起，引擎按平台对并发声源数和声源内存设有上限 — 桌面
128 个声源 · 内存无限制 · 延迟环上限 2.0 s，Android/iOS 48 个声源 · 96 MiB · 1.0 s，Web 32 个声源 · 64 MiB · 0.5 s。
超出上限的声源由引擎拒绝创建（`ST_STATUS_BUDGET_EXCEEDED`），游戏不会因此停止。桌面
默认 128 个声源相对以前（无限制）是一项**行为变更**。引擎侧细节请参见
[SimpleST — 声源内存预算](../core/simplest.md#声源内存预算)。

| SDK | 声源数设置（0 = 平台默认） | 被拒绝的声源 | 延迟环上限 |
|---|---|---|---|
| [Unreal Engine](./ue.md) | Project Settings `Max Sources` | 回退到 dry 路径 | `Max Delay Seconds`（0 = 平台默认） |
| [Unity](./unity.md) | `SoundTraceRuntime.MaxSources` | 记录警告并让 `AudioSource` 以 dry 播放 | `SoundTraceListener.maxDelaySeconds`（默认 0 = 平台默认） |
| [Web](./web.md) | `SoundTrace.create` 选项 `maxSources` | 拒绝创建（status 11），已有声源继续渲染 | `setRenderOptions({ maxDelaySeconds })` |
| [FMOD](./fmod.md) | `SimpleSTFmod_Config.maxSources` | 该 voice 以 dry 播放 | 引擎平台默认 |
| [Wwise](./wwise.md) | `SimpleSTWwise_Config.maxSources` | 该 voice 以 dry 播放 | 引擎平台默认 |

## 从哪里开始

- 浏览器和 Three.js → [Web SDK](./web.md)
- Unity 游戏 → [Unity SDK](./unity.md)
- Unreal Engine 游戏 → [Unreal Engine SDK](./ue.md)
- 用 FMOD Studio 创作的项目 → [FMOD 插件](./fmod.md)
- 用 Wwise 创作的项目 → [Wwise 插件](./wwise.md)
- 原生 C/C++ → [SimpleST](../core/simplest.md)
- 正在迁移 STCoreV2 集成 → [STCoreV2 → SimpleST](../core/stcorev2.md)
