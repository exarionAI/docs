---
title: Unreal Engine
description: 安装 SoundTracing UE5 插件，并配置音频集成、HRTF、GPU 传播、材质预设和示例占位内容。
---

# SoundTrace SDK for Unreal Engine

UE5 SDK 通过 Unreal Audio Extension 插件和 Actor Component 连接
[STCoreV2](../core/stcorev2.md)。当前源项目面向 Unreal Engine 5.6，
并包含原生 Unreal Audio、FMOD 和 Wwise 集成的选择路径。

## 当前状态

| 项目 | 状态 |
|---|---|
| 引擎 | Unreal Engine 5.6 |
| 插件 | `Plugins/SoundTracing` |
| 声明的目标平台 | Win64、macOS、Linux、Android、iOS |
| 当前检出中包含的预构建二进制 | Win64 Release |
| 演示场景 | 三个文档占位场景；尚未包含场景资源 |

其他目标平台需要发行包中提供对应的 STCoreV2 二进制文件。

## 安装

1. 关闭项目。
2. 将 `Plugins/SoundTracing` 复制到目标项目的 `Plugins/` 目录。
3. 打开 `.uproject` 并启用 `SoundTracing` 插件。
4. 重启编辑器并完成模块编译。
5. 打开 `Project Settings > Plugins > SoundTracing`。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

## Unreal Audio 设置

为每个目标平台选择：

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

示例项目使用 48 kHz、1024 帧回调和一个排队缓冲区。调优前应先使用当前项目的音频
预算验证功能。

## 最快设置

### 1. Project Settings

开始时只决定：

- HRTF：`Band8` 或 `Parametric`
- 是否请求 GPU 传播
- 默认启用的路径

保持射线分辨率、深度和 Early Path 预算的默认值。

### 2. 声源设置资源

在 Content Browser 中创建可复用的 `SoundTracing Audio Spatialization Settings`
资源。将共享资源作为预设使用，不要逐个编辑 Audio Component。

| 预设资源 | 用途 |
|---|---|
| `ST_Source_Fast` | 大量同时播放的声源或背景声源 |
| `ST_Source_Middle` | 普通游戏声源 |
| `ST_Source_Quality` | 主角声源和质量优先演示 |

当前插件公开了高级声源属性，但大多数项目只需要修改强度、路径启用标记和衰减覆盖。

### 3. Audio Component

将共享的 SoundTracing 设置资源分配给 Audio Component，或分配到 Sound Attenuation
的 Spatialization Plugin Settings。

### 4. 几何体

将 `SoundTracingObjectComponent` 作为目标 `StaticMeshComponent` 或
`SkinnedMeshComponent` 的直接子组件添加。当前实现使用它的直接父网格。

### 5. 材质

运行 `Sync Materials From Parent`，将渲染材质名称映射到 SoundTrace 材质预设，
然后只修正不匹配的槽。

## HRTF

主要指南使用两种模式。

| 模式 | 行为 |
|---|---|
| `Band8` | 不需要外部 HRTF 资源的轻量渲染 |
| `Parametric` | 使用 KU100 参数表的测量型渲染 |

源码还包含高级 `Convolution` 和 `SteamAudio` 模式。只有在发行包已经验证相应资源和
平台二进制文件后才应使用。

## GPU 后端

启用 `bEnableGpuPropagation` 会请求初始化 GPU Provider。

- 初始化成功后使用 GPU 传播。
- 缺少 Export、设备或后端时继续使用 CPU。
- Win64 包必须包含 `webgpu_dawn.dll`。
- GPU 部署应使用兼容的 LBVH 系列几何体配置。

通过 Output Log 中的 `SoundTracing GPU propagation enabled` 或 CPU 回退警告确认
实际运行路径。

## 材质预设

插件内容包含默认 `SoundTraceMaterialPresetLibrary`。
`SoundTracingObjectComponent` 将渲染材质名称和别名映射到预设。优先使用内置预设；
直接编辑 8 频段反射、吸收、透射和散射值时，应建立独立的自定义库。

## 对象更新

| 模式 | 用途 |
|---|---|
| `Static` | 不移动的关卡几何体 |
| `Dynamic` | 仅 Transform 移动的门和道具 |
| `Refit` | 顶点姿态变化的蒙皮网格 |
| `Rebuild` | 拓扑变化的几何体 |

## 路径可视化

添加 `SoundTracingPathVisualizerComponent` 可以显示基于 Niagara 的路径线段。
这是调试／演示功能，正式性能测量时应禁用。

## 演示场景占位内容

当前检出不包含以下三个演示资源。这些章节保留了未来场景发布后要接入的文档结构。

### SampleScene01 — Basic Room

:::note 占位内容
基本声源、监听器、静态房间几何体、材质预设和直达／反射路径。
:::

### SampleScene02 — Material and Dynamic Door

:::note 占位内容
共享声源预设、材质变化、动态门遮挡和 CPU/GPU 比较。
:::

### SampleScene03 — Multiroom

:::note 占位内容
多声源、房间切换、绕射／透射和 HRTF 方向。
:::

## 故障排除

| 症状 | 检查项 |
|---|---|
| 选择器中没有插件 | 插件启用状态、模块编译和平台 Audio 设置 |
| 原生库加载失败 | `ThirdParty/STCoreV2` 下的目标平台二进制和已打包依赖项 |
| 声源未空间化 | Audio Component 是否分配了 SoundTracing 声源设置资源 |
| 几何体被忽略 | Object Component 的直接父级是否为支持的网格组件 |
| GPU 回退到 CPU | GPU Provider／Export／设备以及 `webgpu_dawn.dll` 打包 |
| 路径不可见 | Visualizer Component、Niagara 插件和路径启用状态 |

## 下一步

- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
