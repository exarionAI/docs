---
title: Unity
description: 安装 SoundTrace Unity SDK，并使用质量预设、Band8/Parametric HRTF、GPU 传播和三个示例场景。
---

# SoundTrace SDK for Unity

Unity SDK 将 Unity 网格、渲染材质槽、声源和监听器连接到
[STCoreV2](../core/stcorev2.md)。

## 要求

| 项目 | 支持 |
|---|---|
| Unity | 2022.3 LTS 或更高版本 |
| 桌面平台 | macOS、Windows、Linux |
| 移动平台 | iOS、Android |
| Web | WebGL ST/MT 插件 |

只有已安装的原生插件和平台支持时，GPU 传播才会启用。不支持的配置会继续使用 CPU
传播。目前 iOS 和 Android 使用 CPU 传播。

## 安装

在 Unity Package Manager 中选择 `Add package from git URL...`，然后输入：

```text
https://github.com/exarionAI/Unity_SoundTraceSDK.git
```

可能需要身份验证或授权包。直接克隆时，只能将 SDK 安装到 `Packages/` 或开发环境的
`Assets/SoundTrace` 其中之一，不要同时安装到两处。

## Unity Audio 设置

1. 打开 `Edit > Project Settings > Audio`。
2. 将 `Default Speaker Mode` 设为 `Stereo`。
3. 将 `DSP Buffer Size` 设为 `Best latency`。

![Unity Audio settings](/img/unity/Image01_AudioSetting.png)

## 最快设置

1. 在空 GameObject 上添加 `SoundTraceManager`。
2. 在 Main Camera 上添加 `SoundTraceListener`。
3. 在声源 GameObject 上添加 `SoundTraceSource`，并为 `AudioSource` 分配音频片段。
4. 在作为声学几何体的网格 GameObject 上添加 `SoundTraceObject`。
5. 可选：在 Manager GameObject 上添加 `SoundTracePathVisualizer`。
6. 进入 Play Mode，确认音频和路径。

![SoundTraceManager](/img/unity/Image06_Manager.png)

![SoundTraceListener](/img/unity/Image04_Listener.png)

![SoundTraceSource](/img/unity/Image05_Source.png)

![SoundTraceObject](/img/unity/Image03_SoundTraceObject.png)

## 质量预设

开始时只选择 `SoundTraceListener > Quality Preset`。

| 预设 | 推荐目标 |
|---|---|
| `Fast` | 移动设备、低功耗设备、大量声源 |
| `Middle` | 普通游戏和桌面平台的默认选择 |
| `Quality` | 高端设备和质量优先演示 |

预设会同时应用监听器射线和 HRTF／Diffuse 渲染质量。单独编辑受预设控制的属性会将
预设切换为 `Custom`。常规集成应使用预设，不要手动调节射线分辨率、深度或路径预算。

## 选择 HRTF

在 `SoundTraceListener > HRTF` 下选择模式。

| 模式 | 行为 |
|---|---|
| `Band8` | 不使用外部 HRTF 表的轻量路径 |
| `Parametric` | 使用 KU100 参数资源的测量型路径 |

当前 Unity 封装默认使用 `Parametric`。`Parametric` 会加载
`Runtime/Resources/SoundTrace/HRTF/KU100_bprime.bytes`；`Band8` 不需要加载资源。
SDK 还提供高级 HRIR 模式，但主要指南只介绍 Band8 和 Parametric。

## GPU 后端

启用 `SoundTraceManager > Use GPU Backend` 以请求 GPU 传播。

- 初始化成功后使用 GPU 后端。
- 不支持的插件或设备会继续使用 CPU 回退。
- `Propagation Thread Count` 会保留用于回退。
- WebGL 使用 STCoreV2 WebGPU 构建。

Manager 的运行时状态会显示 `Active`、`Requested / CPU fallback` 或 `Disabled`。

## 声学材质预设

`SoundTraceObject` 将 Unity 材质槽映射到 SoundTrace 材质预设。

1. 在网格导入设置中启用 `Read/Write Enabled`。
2. 在 `SoundTraceObject` Inspector 中运行 `Auto Set`。
3. 只修正错误匹配的子网格。

![Material Preset Library](/img/unity/Image_Mat_01.png)

默认库为
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。
从 `Concrete`、`Steel`、`Marble`、`Snow`、`Soil` 等预设开始。
直接编辑原始 8 频段值属于高级自定义材质流程。

## 对象更新

| 模式 | 用途 |
|---|---|
| `Static` | 不移动的房间、墙壁和地面 |
| `Dynamic` | 仅 Transform 移动的门和道具 |
| `Refit` | 拓扑稳定的蒙皮或动画网格 |
| `Rebuild` | 拓扑实际发生变化的几何体 |

大多数场景只需要 `Static` 和 `Dynamic`。

## 主要组件

### SoundTraceManager

每个场景使用一个。它拥有原生运行时、材质预设、传播更新和 GPU/CPU 后端选择。

### SoundTraceListener

通常附加到 Main Camera。选择 `Quality Preset` 和 `HRTF`，高级控制保持默认值。

### SoundTraceSource

空间化同一 GameObject 上的 `AudioSource`。同步多个声源时，使用共享的
`AudioSettings.dspTime` 和 `PlayScheduled()`。

### SoundTraceObject

注册 `MeshFilter` 和 `MeshRenderer` 几何体。导入模型包含多个网格子对象时，
使用 `Add To Child Meshes`。

### SoundTracePathVisualizer

显示直达、反射、绕射、混响和透射路径，用于调试。正式性能测量时应禁用。

## 示例

### SampleScene01

![SampleScene01](/img/unity/SampleScene01.png)

基本房间、声源、监听器、几何体、材质和路径可视化。

### SampleScene02

![SampleScene02](/img/unity/SampleScene02.png)

声源／监听器移动、材质预设，以及 Unity Audio 与 SoundTrace 输出比较。

### SampleScene03

![SampleScene03](/img/unity/Img_25_Sample03.png)

较大空间中的 NPC 声源、墙体遮挡、移动监听器的 HRTF 方向和房间响应。

## 故障排除

| 症状 | 检查项 |
|---|---|
| 没有声音 | Stereo／Best latency、AudioSource 片段、Listener 和 Manager |
| 几何体被忽略 | `Read/Write Enabled`、MeshFilter/MeshRenderer 和更新模式 |
| GPU 未启用 | 平台插件支持；CPU 回退警告是有效状态 |
| 性能较低 | 按 `Quality → Middle → Fast` 降级，然后关闭可视化 |
| 方向不正确 | Main Camera Transform 和重复的 AudioListener |
| 多个声源出现镶边声 | 从相同的 `AudioSettings.dspTime` 开始播放 |

## 下一步

- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
- [SDK 概览](./overview.md)
