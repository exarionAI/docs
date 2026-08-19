---
title: Unity
description: SoundTrace Unity SDK 安装、主要组件 API、HRTF、GPU/BVH、Surface 和 Solid Distance Transmission 配置。
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK 是一款实时空间音频插件，用于将 Unity 的网格、Renderer 材质槽、声源和监听器连接到
[STCoreV2](../core/stcorev2.md)。

本页以当前 Unity SDK 的公开组件和 Inspector 契约为准。

## 要求与平台

| 项目 | 当前包状态 |
|---|---|
| Unity | 2022.3 LTS 或更高版本 |
| 随包提供的原生插件 | macOS、Windows x64、iOS、Android |
| Linux | 当前包不包含二进制文件，需要在 Linux 主机上单独构建 |
| Unity WebGL | 不支持。Unity WebGL 无法使用基于 `OnAudioFilterRead` 的 DSP 处理 |

`Use GPU Backend` 会为 reflection 和 reverb propagation 请求 WebGPU compute provider。
diffraction 仍由 CPU 计算。实际是否启用取决于原生插件和设备；GPU 初始化失败时使用
CPU propagation。

## 安装

SoundTrace Unity SDK 包和安装说明通过已签约的评估或许可证交付渠道提供。
请遵循所收到发行包中的安装步骤。

在 Package Manager 中选择 SoundTrace SDK，然后通过 `Samples > Demo Assets > Import`
导入示例。

## Unity Audio 设置

1. 打开 `Edit > Project Settings > Audio`。
2. 将 `Default Speaker Mode` 设为 `Stereo`。
3. 将 `DSP Buffer Size` 设为 `Best latency`。

![Unity Audio 设置](/img/unity/Image01_AudioSetting.png)

如果这些设置不一致，Manager 和 Listener Inspector 会显示警告。

## 最快设置

1. 在空 GameObject 上添加 `SoundTraceManager`。
2. 在 Main Camera 上添加 `SoundTraceListener`。
3. 在声源 GameObject 上添加 `SoundTraceSource`，并为同一 GameObject 上的 `AudioSource` 指定 clip。
4. 在要用作声学几何体的 Mesh GameObject 上添加 `SoundTraceObject`。
5. 如有需要，在与 Manager 相同的 GameObject 上添加 `SoundTracePathVisualizer`。
6. 在 Play Mode 中检查 Console 错误、声音和 path。

在所有同时加载的 scene 中，只能各有一个活动的 Manager 和 Path Visualizer。
可以注册多个 Listener，但 Source 渲染使用第一个注册的 `PrimaryListener`。

## 组件概览

| 组件 | 作用 | 必需依赖 |
|---|---|---|
| `SoundTraceManager` | 管理运行时、scene、材质注册和 propagation backend | 每个运行时 1 个 |
| `SoundTraceListener` | Listener transform、ray 质量、输出/HRTF 设置 | 活动的 Manager |
| `SoundTraceSource` | 对 `AudioSource` 输出进行空间化并配置各类 path | 同一 GameObject 上的 `AudioSource`、活动的 Listener |
| `SoundTraceObject` | 将 Mesh 和 submesh 材质注册到声学 scene | `MeshFilter`、`MeshRenderer` |
| `SoundTracePathVisualizer` | 调试显示有效 path 和 hit triangle | 与 Manager 相同的 GameObject |

## SoundTraceManager

### Inspector

| 字段 | 默认值 | 行为 |
|---|---:|---|
| `bool propagateOnStart` | `true` | 在 `Start()` 中同步初始 scene graph 和 transform，然后请求第一次 propagation。 |
| `bool loadDefaultMaterialsOnEnable` | `true` | 在 `OnEnable()` 中将随包提供的 Material Preset Library 注册到原生 material table。 |
| `int propagationThreadCount` | `-1` | 指定声音引擎内部 propagation job 的执行线程数。在原生平台上，`-1` 根据 `std::thread::hardware_concurrency()` 返回的逻辑线程数自动设置，`0` 和 `1` 以单线程运行。`2` 及以上使用指定数量，其中包含调用线程。 |
| `bool useGpuBackend` | `false` | propagation 不使用 job 多线程，而是通过 GPU compute shader 计算。 |
| `int pathCacheSize` | `256` | 生成 path 的 cache buffer size，最小值为 `0`，最大值为 `1024`。值越高，空间音频效果越好，但计算量也会随之增加。建议根据设备性能，从低于默认值 `256` 的设置开始。 |

### 公开属性

| 属性 | 类型/访问方式 | 准确含义 |
|---|---|---|
| `Instance` | `static SoundTraceManager` / `get; private set;` | 所有已加载 scene 共用的单例 Manager；没有启用的 Manager 时为 `null`。 |
| `DefaultMaterialsLoaded` | `int` / `get; private set;` | 在 `OnEnable()` 中自动注册的随包材质数量。关闭自动加载或 asset 缺失时为 `0`。 |
| `Scene` | `SoundScene` / `get; private set;` | Manager 所有的底层 scene。处于禁用状态或初始化失败后为 `null`。 |
| `PrimaryListener` | `SoundTraceListener` / `get` | Source 渲染使用的第一个已注册 Listener；没有 Listener 时为 `null`。 |
| `ListenerCount` | `int` / `get` | 当前注册到 Manager 的 Listener 数量。 |
| `SourceCount` | `int` / `get` | 当前注册到 Manager 的 Source 数量。 |
| `ObjectCount` | `int` / `get` | 当前注册到 Manager 的 Object 数量。 |
| `LastValidPathCount` | `int` / `get; private set;` | 最近完成的 propagation 结果中的有效 path 数量。无法运行 propagation 时为 `0`。 |
| `LastNativeError` | `string` / `get; private set;` | 最近的 scene graph 或 propagation 错误；没有错误时为空字符串。 |
| `PropagationThreadCount` | `int` / `get` | propagation job 的执行线程数量。`-1` 表示最大值。 |
| `IsGpuPropagate` | `bool` / `get; private set;` | `exaPropagatorInitGpu()` 是否成功并启用了 GPU propagation provider。 |
| `GpuBackendStatus` | `string` / `get; private set;` | GPU Backend 初始化结果：`GPU active` 或 `CPU fallback (<ExaResult>): <error>`。 |
| `PathCacheSize` | `int` / `get` | 生成 path 的 cache buffer size。 |

### 公开方法

| 方法 | 行为 |
|---|---|
| `public void ResetMotionState()` | 在 teleport、respawn 或 scene 切换后，立即重置所有已注册 Listener 和 Source 的 motion history。 |

## SoundTraceListener

通常添加到 Main Camera。

### Inspector

| 字段 | 默认值 | 范围/选项 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`、`Fast`、`Middle`、`Quality` |
| `Ray Resolution` | `16` | `1..32`；横向和纵向使用相同值 |
| `Ray Depth` | `4` | `1..16` |
| `Output Mode` | `Headset` | `Headset`、`Speaker` |
| `HRTF` | `HRIR Interpolated` | 以下三种模式 |

选择 `Fast`、`Middle` 或 `Quality` 时，会同时应用 ray 值和关联的 render 质量值，
ray 字段也会在 Inspector 中禁用。要直接编辑这些值，请先选择 `Custom`。
从预设返回 `Custom` 时，会保留最后应用的值。

| 预设 | Ray Resolution | Ray Depth | 推荐起点 |
|---|---:|---:|---|
| `Custom` | 已保存的值 | 已保存的值 | 手动调优 |
| `Fast` | `16` | `4` | 移动端、大量声源 |
| `Middle` | `24` | `8` | 普通游戏和桌面平台 |
| `Quality` | `32` | `12` | 音频占比较高、其他处理负载较低的应用 |

### HRTF 与输出模式

| 模式 | 所需 asset | 说明 |
|---|---|---|
| `Band8` | 无 | 不加载外部 HRTF table 的轻量模式 |
| `Hrir` | `KU100_convolution.bytes` | HRIR 模式 |
| `HRIR Interpolated` | `KU100_convolution.bytes` | 在 HRIR 模式中应用插值计算，以增强方向感。 |

Asset 从 `Runtime/Resources/SoundTrace/HRTF/` 加载。如果所需 asset 不存在或为空，
Listener 初始化会失败，并且不会自动切换到其他模式。

## SoundTraceSource

`SoundTraceSource` 处理同一 GameObject 上的 `AudioSource` 输出。启用时，会将
`AudioSource.spatialBlend` 和 `AudioSource.dopplerLevel` 设为 `0`，让 SoundTrace
负责空间化和 Doppler。

### Inspector

| 字段 | 默认值 | 行为 |
|---|---:|---|
| `Intensity` | `1` | Source 发射强度，范围为 `0..10`。 |
| `Ray Resolution` | `24` | 对 Reverb ray 的水平和垂直分辨率应用相同值，范围为 `1..32`。 |
| `Reverb Ray Depth` | `4` | Reverb ray 的最大反射深度，范围为 `1..16`。 |
| `Enable Direct` | `true` | 启用 Direct path。 |
| `Enable Reflection` | `true` | 启用 Reflection path。 |
| `Enable Diffraction` | `true` | 启用 Diffraction path。 |
| `Enable Reverb` | `true` | 启用 Reverb path。 |
| `Enable Transmission` | `true` | 启用 Transmission path。 |
| `Direct Attenuation` | `1.0` | Direct path 的距离衰减。数值越大，在相同距离下听到的声音越小。范围为 `0.5..1.5`。 |
| `Reflection Attenuation` | `1.0` | Reflection path 的距离衰减。数值越大，在相同距离下听到的声音越小。范围为 `0.5..1.5`。 |
| `Diffraction Attenuation` | `1.0` | Diffraction path 的距离衰减。数值越大，在相同距离下听到的声音越小。范围为 `0.5..1.5`。 |
| `Reverb Attenuation` | `1.0` | Reverb path 的距离衰减。数值越大，在相同距离下听到的声音越小。范围为 `0.5..1.5`。 |
| `Transmission Attenuation` | `1.0` | Transmission path 的距离衰减。数值越大，在相同距离下听到的声音越小。范围为 `0.5..1.5`。 |
| `Max Delay Seconds` | `1.0 s` | Source renderer 保留的最大 propagation delay。时间越长，内存占用越多。范围为 `0.01..5 s`。 |
| `Path Fade Time Seconds` | `0.066 s` | Path 进入或离开 renderer 时使用的 fade 时间，范围为 `0.001..0.5 s`。 |
| `Path Hold Time Seconds` | `0.120 s` | 消失的 non-direct path 开始 fade 前的保留时间。`0` 会禁用 hold。 |
| `Max Delay Rate` | `0.1` | 每个 sample 允许的最大 delay 变化量，范围为 `0.001..0.999`。 |
| `Bypass` | `false` | 跳过 SoundTrace spatial rendering，并直接传递原始 `AudioSource` 输出。 |

Distance Attenuation 值越大，对应 path 的距离衰减越快。`Show Gizmo` 会在 Scene View 中
分别显示 Direct、Reflection、Diffraction、Reverb 和 Transmission 的可达范围。

Render Tuning 应用于 source-listener 配对。`Path Hold = 0` 会关闭 hold。

### 公开方法

| 方法 | 行为 |
|---|---|
| `SetBypass(bool enabled)` | 为 `true` 时跳过 SoundTrace spatial rendering，并直接传递原始 `AudioSource` 输出；为 `false` 时重新应用 SoundTrace rendering。 |
| `ResetMotionState()` | 将当前 Transform 重新设为 motion 基准点，并以速度 `0` 反映，从而防止 teleport 或 respawn 后出现 Doppler spike。 |

要同步多个 `AudioSource` 的播放时机，请基于同一个 `AudioSettings.dspTime` 调用
`PlayScheduled()`。

## SoundTraceObject

`SoundTraceObject` 注册 `MeshFilter.sharedMesh` 和 Renderer 的 submesh 材质槽。
由于 Build 中需要读取网格数据，请在 Import Settings 中启用 `Read/Write Enabled`。

### Geometry 与 BVH

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`、`LBVH`、`LBVH_SIMD4`、`LBVH_SIMD8`、`LBVH_SIMD16` |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Update Mode` | `Static` | `Static`、`Dynamic`、`Refit`、`Rebuild` |

#### BVH Type

| BVH Type | 说明 |
|---|---|
| `HKDTree` | 使用基于 KD 划分的 traversal。它支持 Refit，但 Refit 后会切换为 BVH-style fallback traversal。不支持 GPU backend。 |
| `LBVH` | 基于 Morton code，rebuild 速度比 HKDTree 更快，并支持 Refit。通过底层 API 上传 vertex 后进行 Refit，可用于 SkinnedMesh 或 procedural mesh 变形。标量格式不支持 GPU backend。 |
| `LBVH_SIMD4` | 以 4 个一组的 SIMD batch 并行处理 LBVH leaf intersection。支持 Refit 和 GPU backend。 |
| `LBVH_SIMD8` | 以 8 个一组的 SIMD batch 并行处理 LBVH leaf intersection。它是当前默认值，并支持 Refit 和 GPU backend。 |
| `LBVH_SIMD16` | 以 16 个一组的 SIMD batch 并行处理 LBVH leaf intersection。支持 Refit 和 GPU backend。 |

如果在请求 GPU 的 scene 中选择 `HKDTree` 或标量 `LBVH`，Inspector 会显示警告。

| Update Mode | 当前组件契约 |
|---|---|
| `Static` | 用于不移动的 mesh。 |
| `Dynamic` | 用于 Transform 会变化的 object。 |
| `Refit` | 在底层 API 更新 vertex 时使用的 native update 策略。 |
| `Rebuild` | 在底层 API 重新提供 geometry 时使用的 native update 策略。 |

`SoundTraceObject` MonoBehaviour 会自动反映 Transform 变化，但不会自动上传运行时 Unity
Mesh 的 vertex 或 topology 变化。因此，仅选择 `Refit` 或 `Rebuild` 并不会自动反映
SkinnedMesh 或 procedural mesh 的变形。

### 公开方法

`Auto Set` 会将 Renderer material 名称与随包 preset 匹配。如果 imported model root
上没有 mesh，而是由 child 持有 geometry，请使用 `Add To Child Meshes`。

| 方法 | 行为 |
|---|---|
| `AutoSetMaterialSlots()` | 遍历所有 submesh，将 Renderer material 名称与随包 preset 自动匹配，并刷新槽位配置。 |
| `GetMaterialPresetIndex(int slotIndex)` | 返回指定槽位的 preset index。没有槽位或槽位 index 无效时返回 `0`。 |
| `GetPresetName(int slotIndex)` | 返回指定槽位所用 preset 的显示名称。找不到 preset 时返回 `Concrete`。 |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 更改一个槽位的 preset。`presetIndex` 最小会修正为 `0`，槽位 index 无效时返回 `false`。 |
| `SetMaterialPresetForAllSlots(int presetIndex)` | 对所有槽位应用同一个 preset。`presetIndex` 最小会修正为 `0`，没有可应用的槽位时返回 `false`。 |
| `GetNativeMaterialIndices()` | 以 native mesh 注册所需的数组格式返回每个 submesh 的 preset index。空缺或缺失的槽位使用 `0`。 |
| `GetTriangleCount()` | 汇总所有 submesh 的 index 数并返回 triangle 数。没有 mesh 时返回 `0`。 |
| `static IsGpuCompatibleBvhType(BvhType value)` | 当值为 `LBVH_SIMD4`、`LBVH_SIMD8` 或 `LBVH_SIMD16` 时返回 `true`。 |

## 声学材质与 Transmission

默认创作资源为
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。
在 `SoundTrace > Material Preset Library` 中可以执行以下操作：

- 添加、删除预设并调整顺序
- 导入/导出 `soundMaterial.json`，或重新导入随包 JSON
- 编辑 Scattering 以及 8 频段 Reflection、Absorption、Transmission 图表
- 选择 `Transmission Model`

频段中心为 `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、
`8000 Hz`。材质顺序必须与表索引一致。

### Transmission Model

| 模型 | 输入 | 几何体条件 |
|---|---|---|
| `Surface` | 每个频段中穿过表面后保留的透射能量系数 `0..1` | 可用于开放面和薄表面 |
| `Solid Distance` | 每个频段中透射能量达到 `-30 dB` 时的材质参考距离（m），不小于 `0` | 需要封闭体积和一致的面方向 |

`Solid Distance` 的输入不是对象的实际厚度。运行时会根据在几何体内部的实际
穿行距离应用衰减。更改模式不会自动计算这 8 个值，因此请填写全部已验证值，
不要保持默认的 `0` 状态。

在 JSON 中，如果没有 `transmissionDistanceToMinus30DbMeters`，则使用 `Surface`；
如果该字段包含恰好 8 个有限且不小于 0 的值，则使用 `Solid Distance`。
导出为 `Surface` 时会省略此字段，而不是写入 `null` 或空数组。

## SoundTracePathVisualizer

只能在与 Manager 相同的 GameObject 上添加一个。

| Inspector 字段 | 默认值 | 说明 |
|---|---:|---|
| `Enable Path Visualization` | 开启 | 是否显示 path mesh |
| `Refresh Interval Ms` | `50` | 重建可视化 mesh 的最小间隔；不影响声学 propagation 周期 |
| `Max Visualized Paths` | `1024` | 最多显示的 path 数量 |
| `Path Width` | `0.08` | 线宽 |
| `Path Alpha Intensity` | `0.5` | 显示强度 |
| `Draw Hit Triangles` | 关闭 | 在 Scene View 中显示 hit triangle |

Direct、Reflection、Diffraction、Reverb 和 Transmission 会按 path 类型使用不同颜色显示。
此组件用于调试，在性能测量和 release build 中应禁用。

主要公开成员为 `Instance`、设置/计数属性、`Render()` 和 `Clear()`。

## 示例

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

用于检查基础房间、声源、监听器、几何体、材质预设和路径可视化。

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

用于检查声源/监听器移动、材质预设切换，以及 Unity 原始音频与
SoundTrace 输出的对比。

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

用于检查大空间中的多个声源、墙体遮挡、移动期间的 HRTF 方位感和房间响应。

## 故障排除

| 症状 | 检查项 |
|---|---|
| 没有声音 | Console 中首个 Manager 初始化错误、Stereo/Best latency、AudioSource clip、是否存在 Manager/Listener |
| Source/Listener/Object 要求 Manager | 检查级联错误之前记录的 `Failed to initialize SoundTraceManager` 原因 |
| HRTF 初始化失败 | 所选模式对应的 Resources asset 是否存在，以及文件是否为空 |
| Geometry 未生效 | `Read/Write Enabled`、MeshFilter/MeshRenderer、子网格位置、注册状态 |
| 运行时变形 mesh 未生效 | 仅设置 `Update Mode` 不会上传顶点/拓扑；需要单独的底层几何体更新路径 |
| GPU 未启用 | 检查 `GpuBackendStatus`、Console 回退原因、Object 是否选择 SIMD BVH |
| Teleport 后音高跳变 | 更改 transform 后立即调用 `ResetMotionState()` |
| 性能不足 | 按 `Quality → Middle → Fast` 顺序检查，缩小 path cache buffer，然后禁用路径可视化 |
| 多个声源听起来像梳状滤波 | 使用相同的 `AudioSettings.dspTime` 调用 `PlayScheduled()` |

## 后续文档

- [SDK 概览](./overview.md)
- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
