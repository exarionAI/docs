---
title: Unreal Engine
description: SoundTrace Unreal Engine SDK 安装、单声道音频导入、插件设置、Detail Properties 和公开 API。
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal Engine SDK 是实时空间音频插件，将 Unreal 的声源、监听器和网格连接到 [STCoreV2](../core/stcorev2.md)。通过项目全局设置和 Actor Component 配置声学路径、材质、HRTF 和 GPU 运算。

## 要求与平台

| 项目 | 要求 / 支持范围 |
|---|---|
| Unreal Engine | `5.6` 及以上 |
| 支持平台 | Windows x64, macOS, Linux, Android, iOS |

## 安装

1. 关闭 Unreal Editor 和目标项目。
2. 将 SDK 中的 `Plugins/SoundTracing` 复制到目标项目的 `Plugins/`。
3. 打开 `.uproject` 并启用 `SoundTracing` plugin。
4. 完成 C++ module 编译并重新启动 Editor。
5. 在 `Project Settings > Plugins > SoundTracing` 中检查全局设置。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

仅分发 Plugin 文件夹时，也要保留 `Content/STData` 和 `ThirdParty/STCoreV2`。Material
preset、custom HRTF 和 native runtime 会使用这些路径。

## Unreal 编辑器设置

1. 在 `Edit > Project Settings > Platforms` 中打开目标平台的 `Audio` 设置。
2. 将 `Spatialization Plugin` 设为 `SoundTracing`。
3. 将 `Source Data Override Plugin` 设为 `SoundTracing`。
4. 重启编辑器。
5. 打开 `Project Settings > Plugins > SoundTracing`，检查全局设置。

![在 Project Settings 中选择 SoundTracing](/img/unreal/ST_Listener_Setting_Editor01.png)

Windows 项目可从以下值开始，再根据音频负载调整。

| 设置 | 起始值 |
|---|---:|
| `Audio Sample Rate` | `48000 Hz` |
| `Callback Buffer Frame Size` | `1024` |
| `Buffers To Enqueue` | `2` |

## 音频资源导入设置 — 单声道

![普通和单声道 Sound Wave 资源](/img/unreal/MonoSoundImport.png)

用于 SoundTrace 空间化的音源应准备为单声道（1 个声道）。

1. 在音频编辑工具中将原始音频导出为单声道 PCM WAV 文件。
2. 使用 Content Browser 的 `Import` 导入，生成 `Sound Wave` 资源。
3. 确认 Sound Wave 的声道数为 `1`。
4. 将该资源指定到 Audio Component 的 `Sound` 字段。

单声道描述的是输入音源的声道配置。SoundTrace 根据监听器位置渲染耳机方向感。基本导入流程请参阅 [Unreal 音频导入指南](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-audio-files?application_version=5.6)。

## 快速开始

1. 在 `Project Settings > Plugins > SoundTracing` 中从 `Quality Preset = Fast` 开始。
2. 在 Content Browser 的 `Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` 中创建声源设置资源。
3. 创建 `Sound Attenuation` 资源并启用 `Enable Spatialization`。将 `Spatialization Method` 设为 `Plugin-Spatialized`，把声源设置资源加入 `Spatialization Plugin Settings` 数组。
4. 为 Audio Component 指定单声道 Sound Wave。启用 `Allow Spatialization`，关闭 `Override Attenuation`，将 Sound Attenuation 资源指定到 `Attenuation Settings`。
5. 在用于声学几何的 `StaticMeshComponent` 或 `SkinnedMeshComponent` 下直接添加子组件 `SoundTracingObjectComponent`。
6. 执行 Object 的 `Auto Set Materials` 并按需调整材质槽。
7. 启动 PIE 并播放 Audio Component。使用 `SoundTracing.Status` 检查运行时就绪状态和路径数。
8. 为 Actor 添加 `SoundTracingPathVisualizerComponent` 以显示路径。

在 SoundTracing 插件设置中管理全局配置，通过 `SoundTracingSubsystem` 查询运行时状态。不添加 Listener Component 时，使用 Unreal 音频监听器的位置及项目默认监听器设置。

## 组件概览

| 组件 | Unreal Engine SDK | 作用 |
|---|---|---|
| SoundTracing 插件设置 | `SoundTracingSettings`, `SoundTracingSubsystem` | 项目配置及运行时状态查询和控制 |
| 监听器 | `SoundTracingListenerComponent` | 监听器质量、输出设置和位置覆盖 |
| 声源 | `SoundTracingSourceSettings` + `Audio Component` | 各声源的辐射强度、声学路径和衰减 |
| 声音对象 | `SoundTracingObjectComponent` | 注册网格、BVH 和材质槽 |
| 声学材质 | `SoundTracingMaterialPresetLibrary` | 材质预设及各频带的反射、吸收和透射 |
| 声音路径可视化 | `SoundTracingPathVisualizerComponent` | 使用 Niagara 显示声学路径 |

## SoundTracing 插件设置

<span id="project-settings" />

<span id="soundtracingsubsystem" />

![SoundTracing 运行时和默认监听器设置](/img/unreal/ST_Listener_Setting_Editor02.png)

![SoundTracing 声源上限、衰减、材质和路径设置](/img/unreal/ST_Listener_Setting_Editor03.png)

### Detail Properties

`SoundTracingSettings` 管理全局设置，`SoundTracingSubsystem` 控制运行时。在 `Project Settings > Plugins > SoundTracing` 中编辑全局配置。表格列出 SDK 默认值，图片展示配置示例。

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`。`-1` 根据逻辑核心数自动配置，`0` 和 `1` 使用单线程。修改后重启。 |
| `Use GPU Backend` | 禁用 | 请求 GPU 运算，初始化失败时回退到 CPU。修改后重启。 |
| `Path Cache Size` | `256` | `0..1024`，活动声源共享的路径缓存大小。`0` 关闭缓存。 |
| `Propagation Interval (ms)` | `0` | `0..500`，传播请求的最小间隔。`0` 表示每个游戏 tick 请求一次，运行中的请求会合并。 |
| `Quality Preset`, `Listener Rays`, `HRTF`, `Render Quality` | `Fast` | 默认监听器配置。各字段详见下方监听器的 Detail Properties 表。 |
| `Source Ray Resolution Cap` | `0` | `0..32`，各声源混响射线分辨率的全局上限。`0` 不施加额外限制。 |
| `Source Ray Depth Cap` | `0` | `0..16`，各声源混响射线深度的全局上限。`0` 不施加额外限制。 |
| 各路径 `Strength` | 各 `1.0` | `Direct`、`Reflection`、`Diffraction`、`Reverb` 和 `Transmission` 的衰减强度，范围 `0.5..1.5`。应用于使用项目衰减设置的声源；值越大，相同距离下衰减越快。 |
| `Material Preset Library` | 未指定 | 未指定时使用内置库。选择其他库后重启。 |
| `Paths`, `Air Absorption` | 启用 | 默认监听器的路径类型和空气吸收设置。 |

### 公开方法

在 Blueprint 中使用 `Get World Subsystem` 获取 `SoundTracingSubsystem`。C++ 可使用 `USoundTracingSubsystem::Get(WorldContextObject)`。

| 方法 | 返回值 / 行为 |
|---|---|
| `Get(const UObject* WorldContextObject)` | C++ 静态方法，返回对应 World 的 Subsystem。 |
| `IsNativeRuntimeReady()` | `bool`，原生库、场景和监听器是否就绪。 |
| `IsGpuPropagationActive()` | `bool`，GPU 传播是否实际启用。 |
| `GetGpuBackendStatus()` | `FString`：`GPU active`、`CPU` 或包含原因的 `CPU fallback (...)`。无法访问运行时时返回 `Unavailable`。 |
| `GetLastValidPathCount()` | `int32`，最近完成的传播帧的有效路径数。 |
| `GetLastNativeError()` | `FString`，最近的原生错误。最新帧成功时为空。 |
| `GetNativeVersion()` | `FString`，以 `major.minor.revision` 格式表示的原生库版本。 |
| `GetRegisteredObjectCount()` | `int32`，当前 World 中注册的对象数。 |
| `GetActiveListenerSettings()` | `FSoundTracingListenerSettings`，当前实际应用的监听器设置。 |
| `ResetMotionState()` | 在传送或切换关卡后重置监听器和声源的运动历史。 |
| `RequestPropagationFrame()` | 在常规更新周期之外请求传播计算。 |

### 公开属性

以下为 `USoundTracingSettings` 的 C++ 配置成员。使用 `GetDefault<USoundTracingSettings>()` 读取项目设置。

| 属性 | 类型 | 说明 |
|---|---|---|
| `PropagationThreadCount` | `int32` | 配置的传播线程数。 |
| `bEnableGpuPropagation` | `bool` | GPU 使用请求标志。通过 `IsGpuPropagationActive()` 检查实际启用状态。 |
| `PathCacheSize` | `int32` | 路径缓存大小。 |
| `PropagationIntervalMs` | `int32` | 传播请求最小间隔，单位毫秒。 |
| `DefaultListenerSettings` | `FSoundTracingListenerSettings` | 项目默认监听器配置。 |
| `SourceRayResolutionCap`, `SourceRayDepthCap` | `int32` | 声源射线分辨率和深度的全局上限。 |
| `DefaultSourceAttenuationStrengths` | `FSoundTracingAttenuationStrengths` | 各路径类型的默认距离衰减强度。 |
| `MaterialPresetLibrary` | `TSoftObjectPtr<USoundTracingMaterialPresetLibrary>` | 启动时注册的材质库。 |

## 监听器

<span id="soundtracinglistenercomponent" />

![默认监听器配置](/img/unreal/ST_Listener_Setting_Editor02.png)

将 `SoundTracingListenerComponent` 添加到 Pawn 或 Camera，可以按关卡覆盖项目监听器配置，或使用该组件的 Transform 替代 Unreal 音频设备监听器。

### Detail Properties

Project Settings 和 Listener Component 共用监听器配置字段。上图为项目默认配置，组件还提供以下覆盖选项。

| 字段 | 默认值 | 行为 |
|---|---:|---|
| `Override Project Listener Settings` | 开启 | 使用 `Listener Settings` 代替 Project Settings |
| `Listener Settings` | `Fast` | Quality、HRTF、output mode、path 和 air absorption |
| `Drive Listener Transform` | 关闭 | 把该 component 的 world transform 和 velocity 发送给 native listener |

一个 World 中只有一个 Listener Component 能驱动 active listener。另一个 component 开始
Begin Play 时会替换前一个，并在 Output Log 中写入警告。

| 监听器配置字段 | 默认值 | 说明 |
|---|---:|---|
| `Quality Preset` | `Fast` | 选择 `Custom`、`Fast`、`Middle` 或 `Quality`。 |
| `Ray Resolution`, `Ray Depth` | `16`, `4` | 分别为 `1..32` 和 `1..16`。路径追踪分辨率和深度，可在 `Custom` 下编辑。 |
| `Output Mode` | `Headphones` | 选择耳机或扬声器输出。 |
| `Hrtf Mode` | `HRIR Interpolated` | 参阅下方 HRTF 表。 |
| `Custom HRTF Relative Path` | 空字符串 | 相对于插件 Content 的自定义 HRTF 路径。留空使用内置表。 |
| `HRTF Path Budget` | `1` | `1..32`，应用方向性 HRTF 处理的优先路径数。 |
| `Diffuse Enabled`, `Diffuse Quality` | 禁用, `Low` | 控制早期散射声及其质量。`Low/Medium/High` 最多保留 `128/512/1024` 条散射路径。 |
| `Delay Interpolation` | `Linear` | 选择 `Linear`、`Cubic Lagrange` 或 `Lagrange 6` 延迟插值。 |
| `Early Path Budget` | `128` | `0..4096`，应用完整移动延迟处理的早期间接路径数。`0` 取消限制。 |
| `Render Band Tier` | `Merged4` | 通过 `Merged4` 或 `Full8` 选择渲染频带数。 |
| 各路径 `Enable … Path` | 全部启用 | 分别启用或关闭 `Direct`、`Reflection`、`Diffraction`、`Reverb` 和 `Transmission` 路径。 |
| `Air Absorption Enabled` | 启用 | 应用空气吸收造成的衰减。 |
| `Temperature Celsius` | `20` | `-40..60 °C`，空气温度。 |
| `Relative Humidity Percent` | `50` | `0..100%`，相对湿度。 |
| `Pressure Pa` | `101325` | `50000..120000 Pa`，气压。 |

#### Quality Preset

`Fast`、`Middle`、`Quality` 会同时应用 ray 和高级 render 品质值。需要手动编辑时选择
`Custom`。

| Preset | Ray Resolution | Ray Depth | HRTF Path Budget | Diffuse | Delay Interpolation | Early Path Budget |
|---|---:|---:|---:|---|---|---:|
| `Custom` | 保存值 | 保存值 | 保存值 | 保存值 | 保存值 | 保存值 |
| `Fast` | `16` | `4` | `1` | 关闭 / Low | Linear | `128` |
| `Middle` | `24` | `8` | `1` | 开启 / Medium | Cubic Lagrange | `128` |
| `Quality` | `32` | `12` | `1` | 开启 / High | Lagrange 6 | `128` |

`HRTF Path Budget` 是获得完整 directional HRTF voice 的高优先级 path 数。所有内置 preset
都保持为 `1`，为 audio thread 留出余量。在 Custom 中提高它可能导致多 source scene 出现
dropout。

#### HRTF 与输出模式

| HRTF 模式 | 所需 asset | 说明 |
|---|---|---|
| `Band8` | 无 | 使用 8-band magnitude 与 ITD 的轻量模式 |
| `HRIR` | STCoreV2 embedded table | 使用最近方向的测量 HRIR |
| `HRIR Interpolated` | STCoreV2 embedded table | 按方向插值测量 HRIR；默认模式 |

`Custom HRTF Relative Path` 可指定相对于插件 `Content` 的 `MPI1`、`SAH1` 或 `BPH1` 表路径。留空使用 STCoreV2 内置表。

| Output Mode | 说明 |
|---|---|
| `Headphones` | Binaural HRTF 输出 |
| `Speaker` | 内部 Ambisonic stereo decode |

高级 `Render Band Tier` 推荐使用 `Merged4`；`Full8` 会增加每条 path 的 audio-thread
band 处理。Air Absorption 默认值为 `20 °C`、相对湿度 `50%`、`101325 Pa`，用于
ISO 9613-1 衰减。

### 公开方法

| 方法 | 行为 |
|---|---|
| `ApplyListenerSettings()` | 将当前 Detail Properties 值重新应用到 native listener |
| `SetQualityPreset(Preset)` | 更改并立即应用 quality preset |
| `SetHrtfMode(Mode)` | 更改并立即应用 HRTF mode |
| `SetOutputMode(Mode)` | 切换 Headphones/Speaker 并立即应用 |
| `ResetMotionState()` | Teleport、respawn 后清除 listener/source velocity history |
| `GetListenerSettings()` | 返回 component 当前的 listener settings |
| `static GetActiveListener(const UWorld* World)` | 在 C++ 中返回对应 World 的活动 Listener Component。 |

### 公开属性

| 属性 | 类型 / 访问 | 说明 |
|---|---|---|
| `bOverrideProjectListenerSettings` | `bool` / 读写 | 是否使用该组件的监听器配置。 |
| `ListenerSettings` | `FSoundTracingListenerSettings` / 读写 | 组件的质量、输出和路径设置。运行时直接修改后，调用 `ApplyListenerSettings()` 应用。 |
| `bDriveListenerTransform` | `bool` / 读写 | 是否使用组件的位置和方向驱动监听器。 |

## 声源

<span id="soundtracing-audio-spatialization-settings" />

![声源设置资源的 Detail Properties](/img/unreal/STSettingAssets_SourceSetups.png)

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` 中创建。相同用途的
source 应共享一个 asset，无需为每个 Audio Component 复制。

### Detail Properties

| 字段 | 默认值 | 范围／行为 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`。乘到每条 path 的 linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`。在 Intensity 之上增加的 gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`。Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`。Early reflection send |
| `Ray Preset` | `Custom` | `Custom`、`Fast`（8×8，depth 4）、`Middle`（16×16，depth 4）、`Quality`（24×24，depth 4）。非 `Custom` 时用 preset 值覆盖下面两个值。对应 Unity `SoundTraceSource` 的 `Reverb Ray Resolution`，应用于共享该 asset 的所有 source |
| `Ray Resolution` | `24` | `0..32`。`0` 继承 Listener grid；其他值使用 `N × N` source reverb ray |
| `Ray Depth` | `4` | `0..16`。`0` 继承 Listener depth |
| 各路径 `… Path Enabled` | 全部启用 | 按声源启用或关闭 `Direct`、`Reflection`、`Diffraction`、`Reverb` 和 `Transmission`。 |
| `Override Project Attenuation Strengths` | 开启 | 关闭时使用 Project Settings attenuation |
| 每种 path 的 `Strength` | `1.0` | `0.5..1.5`。值越大，同距离下衰减越快 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`。Renderer 保留的最大 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。Path 进入／移除 fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`。缺失 non-direct path 在 fade 前的保持时间。`0` 禁用 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`。每个 sample 的最大 delay 变化 |
| `Bypass` | 关闭 | 跳过 SoundTrace spatial rendering，直接传递输入 |

#### 连接到 Audio Component

将声源设置资源连接到 Sound Attenuation，再将该 Attenuation 资源指定给 Audio Component。同类声源可共用这两个资源。

![在 Sound Attenuation 的 Spatialization Plugin Settings 中指定声源设置](/img/unreal/ST_AttenAsset_PutSettingAssetHere.png)

启用 `Enable Spatialization` 并选择插件空间化方式。在 `Spatialization Plugin Settings` 数组中添加 `SoundTracing Audio Spatialization Settings` 资源。

![在 Audio Component 的 Attenuation Settings 中指定 Sound Attenuation](/img/unreal/ST_Source_PutAssetHere.png)

启用 Audio Component 的 `Allow Spatialization`，关闭 `Override Attenuation`。将之前创建的 Sound Attenuation 指定到 `Attenuation Settings`。

### 公开方法

以下为 `USoundTracingSourceSettings` 提供的 C++ 方法。使用 Audio Component 的 `Play()` 和 `Stop()` 控制播放。

| 方法 | 返回值 / 行为 |
|---|---|
| `GetEffectiveAttenuationStrengths()` | `FSoundTracingAttenuationStrengths`，根据覆盖设置返回声源或项目的衰减强度。 |
| `ApplyRayPreset()` | 根据 `RayPreset` 更新 `RayResolution` 和 `RayDepth`，`Custom` 下保持原值。 |

## 声音对象

<span id="soundtracingobjectcomponent" />

![SoundTracingObjectComponent Detail Properties](/img/unreal/STObj_01.png)

`SoundTracingObjectComponent` 将 immediate parent 的 `StaticMeshComponent` 或
`SkinnedMeshComponent` 注册为声学 geometry。它必须直接放在目标 mesh component 下方，
不能放在 Actor 层级中的任意位置。

### Detail Properties

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `Auto Register Native Object` | 开启 | Begin Play 时自动注册 native object |
| `Sync Transform On Tick` | 开启 | Parent 变化时才更新 native transform |
| `Auto Sync Materials` | 开启 | Parent render material 变化时刷新 slot |
| `Update Type` | `Static` | Geometry update policy |
| `BVH Type` | `LBVH SIMD8` | Native acceleration structure builder |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Sync Skinned Vertices On Tick` | 关闭 | 在 `Refit` 模式下每 tick 上传当前 skeletal pose |
| `Sound Material Slots` | 自动生成 | Render material slot 到 SoundTrace preset 的 mapping |
| `Visualize BVH` | 关闭 | 使用 Editor component visualizer 绘制 BVH line |
| `BVH Visualization Color` | 青色 | BVH 显示颜色。 |
| `Native Object Id`, `Native Mesh Id` | `-1` | 已注册的原生 ID，只读，未注册时为 `-1`。 |

Static Mesh 设置 Forced LOD 时使用该 LOD，否则使用 LOD 0。Skinned Mesh 也优先 Forced LOD，
并上传当前 pose vertex。

#### Geometry 与 BVH

| BVH Type | Refit | GPU backend | 说明 |
|---|---|---|---|
| `HKDTree` | 支持 | 不支持 | KD split；Refit 后切换到 BVH-style fallback traversal |
| `LBVH` | 支持 | 不支持 | Scalar Morton LBVH |
| `LBVH SIMD4` | 支持 | 支持 | 4-wide leaf intersection |
| `LBVH SIMD8` | 支持 | 支持 | 当前默认值 |
| `LBVH SIMD16` | 支持 | 支持 | 16-wide leaf intersection |

请求 GPU backend 时若选择 `HKDTree` 或 scalar `LBVH`，plugin 会替换为可上传到 GPU 的
`LBVH SIMD8` native builder。

| Update Type | 用途 |
|---|---|
| `Static` | 不移动的 level geometry |
| `Dynamic` | 仅 transform 改变的 door、prop；更新 TLAS instance |
| `Refit` | Topology 不变但 vertex pose 变化的 Skinned Mesh |
| `Rebuild` | Triangle topology 变化、需要重建 BVH 的 geometry |

要同步 skinned animation，请同时启用 `Update Type = Refit` 和
`Sync Skinned Vertices On Tick = true`。Plugin 会上传当前 pose vertex 并 refit native mesh。
这会在每 tick 进行 CPU skinning 和 vertex upload，因此应限制对象数量和 LOD。

相同 Static Mesh、LOD、material mapping 和 BVH 设置的 object 共享一个 native BVH。
Skinned Mesh 的 cache key 包含 component path，不同 pose 不会覆盖同一个 native mesh。

### 公开方法

| 方法 | 行为 |
|---|---|
| `RegisterNativeObject()` | 将 Parent geometry 注册到 native scene |
| `UnregisterNativeObject()` | 删除 native object 注册 |
| `SyncNativeTransform()` | 立即应用当前 parent transform |
| `RefreshNativeMesh()` | Mesh 或 material 变化后重新上传 geometry |
| `SyncMaterialsFromParent()` (`Auto Set Materials`) | 根据父组件的渲染材质名称和别名自动匹配预设。 |
| `SetMaterialPresetIndex(Slot, Preset)` | 更改一个 slot 的 preset index |
| `SetMaterialPresetForAllSlots(Preset)` | 对所有 slot 应用同一 preset |
| `SetUpdateType(Type)` | 更改 native object update policy |
| `GetResolvedMeshLodIndex()` | 返回实际上传的 LOD index |
| `GetUploadedTriangleCount()` | 返回上次上传的 triangle 数量 |
| `IsRegistered()` | 返回 native object 和 mesh 是否均有效 |
| `GetNativeObjectId()`, `GetNativeMeshId()` | 返回已注册的原生 ID，未注册时为 `-1`。 |
| `GetTargetMeshComponent()` | 返回用于注册的直接父网格组件。 |
| `static IsGpuCompatibleBvhType(ESoundTracingBvhType InBvhType)` | 属于 SIMD LBVH 系列时返回 `true`。 |
| `GetBvhMaxDepth()`, `GetPrimitivesPerLeafNode()`, `GetBvhType()` | 在 C++ 中查询 BVH 设置。 |
| `GetSoundMaterialSlots()` | 在 C++ 中返回声学材质槽数组的只读引用。 |
| `BuildNativeBvhDebugLineSegments(TArray<FVector>& OutLocalLinePoints)` | 在 C++ 中获取局部坐标下的 BVH 调试线段。 |
| `ShouldVisualizeBvh()`, `GetBvhVisualizationColor()` | 仅 Editor 可用的 C++ 方法，用于查询 BVH 显示状态和颜色。 |

## 声学材质与 Transmission

![SoundTracing Material Preset Library Detail Properties](/img/unreal/ST_Material_Graph.png)

### Detail Properties

默认 library 位于 plugin 的
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset`，当前包含与 Unity/Web SDK
相同的 22 种 material table。

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Material Preset Library` 中创建 custom library。
新 asset 会复制当前默认 library。在 Project Settings 的 `Material Preset Library` 中选择
后重新启动 Editor。

| 字段 | 说明 |
|---|---|
| `Presets` | 声学材质列表。 |
| `Display Name`, `Aliases` | 选择列表中的显示名称及自动匹配渲染材质的别名。 |
| `Material Index` | 原生材质索引，按库中的列表顺序维护。 |
| `Scattering` | `0..1`，镜面反射与散射的比例。 |
| `Reflection`, `Absorption`, `Transmission` | 8 个频带的反射、吸收和透射能量系数，各值为 `0..1`。 |
| `Transmission Model` | 选择 `Surface` 或 `Solid Distance`。 |
| `Thickness to -30 dB (m)` | `Solid Distance` 各频带的衰减参考距离。 |
| `ResetToBundledJson` | 从内置 JSON 恢复预设列表。 |

频带中心为 `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000 Hz`。
可在 Editor band graph 上点击或拖动来编辑。

#### Transmission Model

| 模型 | 输入 | Geometry 条件 |
|---|---|---|
| `Surface` | 穿过一次表面后剩余的各频带 energy coefficient `0..1` | 可用于开放面和薄 surface |
| `Solid Distance` | 透射 energy 衰减到 `-30 dB` 时的各频带参考距离 (m) | 需要闭合 volume 和一致的 face 方向 |

`Solid Distance` 不是 object 的实际厚度。Runtime 测量 ray 在 geometry 内部经过的实际距离，
再按参考距离衰减。`0` 会完全阻断该 band。

`ImportFromJson`、`ExportToJson`、`ResetToBundledJson` 使用 Unity/Web 共用的
`soundMaterial.json` 格式。没有 `transmissionDistanceToMinus30DbMeters` 表示 `Surface`；
存在 8 个有效值表示 `Solid Distance`。

### 公开方法

| 方法 | 返回值 / 行为 |
|---|---|
| `NormalizePresets()` | 规范化预设索引和各频带值。 |
| `GetPresetCount()` | 返回预设数量。 |
| `FindBestPresetIndexByName(const FString& RenderMaterialName)` | 查找与渲染材质名称或别名匹配的预设索引。 |
| `GetPresetDisplayName(int32 PresetIndex)` | 返回预设的显示名称。 |
| `ResetToBundledJson()` | 用内置 JSON 替换列表，可通过编辑器按钮或 C++ 调用。 |
| `ExportToJson()` | 返回 `soundMaterial.json` 格式的字符串。 |
| `ImportFromJson(const FString& JsonText)` | 使用 JSON 替换列表，没有可解析的材质时返回 `false`。 |
| `FindBestPresetIndex(const UMaterialInterface* RenderMaterial)` | 在 C++ 中查找匹配渲染材质的预设。 |
| `FindPresetIndexByToken(const FString& Token, int32 FallbackIndex)` | 在 C++ 中按词查找预设，未找到时使用 fallback 索引。 |
| `static GetFrequencyBandCentersHz()` | 在 C++ 中返回 8 个中心频率数组的只读引用。 |
| `static LoadDefaultLibrary()` | 在 C++ 中加载项目指定的库或默认库。 |
| `static MakeFallbackPresets()` | 在 C++ 中创建备用预设数组。 |
| `static ParseSoundMaterialJson(const FString& JsonText, TArray<FSoundTracingMaterialPreset>& OutPresets)` | 在 C++ 中将 JSON 解析为预设数组。 |
| `static SerializeSoundMaterialJson(const TArray<FSoundTracingMaterialPreset>& InPresets)` | 在 C++ 中将预设数组转换为 JSON 字符串。 |
| `static LoadBundledJson(FString& OutJson)` | 在 C++ 中读取内置 JSON 字符串并返回是否成功。 |

### 公开属性

| 属性 | 类型 / 访问 | 说明 |
|---|---|---|
| `Presets` | `TArray<FSoundTracingMaterialPreset>` / 读写 | 库中保存的预设数组。 |
| `FrequencyBandCount` | `static constexpr int32` / 常量 | 频带数量，值为 `8`。 |

## 声音路径可视化

<span id="soundtracingpathvisualizercomponent" />

![Add Component 搜索结果中的 Sound Tracing Path Visualizer](/img/unreal/PathVisualizer_01.png)

在 Actor 的 `Add Component` 中搜索并添加 `Sound Tracing Path Visualizer`。该组件由 C++ 实现，会创建路径渲染所需的 Niagara 组件。

![使用 NS_Arrow 的 Niagara 组件的 Detail Properties](/img/unreal/PathVisualizer_02.png)

在 Actor 上添加 `SoundTracingPathVisualizerComponent`，可用 Niagara line segment 显示
最近一次 propagation frame。

:::note NS_Arrow 内置资源路径
`Niagara System Asset` 使用插件内置的 `NS_Arrow`。默认路径为 `/SoundTracing/FX/NS_Arrow.NS_Arrow`，关联材质位于 `/SoundTracing/Materials/MAT_ArrowLine`。安装或移动插件时，请同时保留 `Content/FX` 和 `Content/Materials`，并检查 Niagara 系统及材质引用是否有效。
:::

### Detail Properties

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `Visualization Enabled` | 开启 | 是否显示 path |
| `Refresh Interval Ms` | `50` | 可视化最小刷新间隔，不影响 propagation |
| `Max Visualized Paths` | `1024` | 最大显示 path 数，范围 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 强度，范围 `0.01..2.0` |
| `Niagara System` | 空 | 空时使用 plugin 默认 Niagara system |

颜色分别为 Direct=红色、Reflection=橙色、Diffraction=绿色、Transmission=青色、Reverb=紫色。性能测量时请关闭可视化。

### 公开方法

| 方法 | 返回值 / 行为 |
|---|---|
| `SetVisualizationEnabled(bool bEnabled)` | 在运行时启用或关闭路径显示。 |
| `GetActivePathCount()` | `int32`，返回可视化组件当前保留的路径数。 |

## 示例演示

Unity SDK 的三个示例也以 Unreal 关卡和蓝图的形式提供，保留相同的场景构成。
在 Content Browser 中启用 `Settings > Show Plugin Content`，打开
`SoundTracing Content > Samples > Maps` 下的关卡，然后点击 `Play`。
每个关卡均已配置专用 GameMode 和摄像机，运行后会自动播放音频。

三个演示共用以下 UI：

| 按钮 | 键盘 | 操作 |
|---|---|---|
| `Play` | `P` | 从头播放音乐或对话。 |
| `Pause / Resume` | `Space` | 暂停或继续播放。 |
| `Stop` | `X` | 停止播放。 |
| `Reset` | `R` | 重新开始演示。02 还会重置位置和声学材质。 |
| `Show / hide UI` | — | 隐藏或显示左侧控制面板。 |

关卡位于 `/SoundTracing/Samples/Maps`，行为和 UI 蓝图位于
`/SoundTracing/Samples/Blueprints`，各声源的设置可在
`/SoundTracing/Samples/Audio/Settings` 中编辑。

### ST_SampleScene01

![ST_SampleScene01 — 房间内的单个声源和监听器](/img/unreal/ST_Sample01.png)

在 10 m 的房间内，通过一个声源和固定监听器体验基本空间音频。
聆听音乐，了解房间几何体、声学材质以及可视化路径与声音的关系。

使用 `SoundTrace / Unreal dry` 按钮切换 SoundTrace 输出和 Unreal 常规输出。
两路输出保持播放位置同步，因此可以连续聆听同一段音乐，比较空间感和混响。

行为蓝图为 `BP_Sample01`，UI 为 `WBP_Sample01`。

### ST_SampleScene02

![ST_SampleScene02 — 可拖动乐器声源和监听器的俯视演示](/img/unreal/ST_Sample02.png)

在俯视图中移动吉他、贝斯、鼓和合成器的左右八个声源，以及耳机形状的监听器。
Quartz 同步播放音乐，可通过改变位置和声学材质来比较方向感与空间响应。

| 控件 | 操作 |
|---|---|
| 拖动图标 | 使用鼠标左键或第一个触点移动声源、监听器，保持其高度及初始抓取位置的偏移。 |
| `Mirror: ON / OFF` | 拖动声源时，使另一侧配对声源左右对称移动。启用时不会立即重新对齐位置。 |
| `SoundTrace / Unreal dry` | 保持播放位置，切换 SoundTrace 输出和 Unreal 常规输出。 |
| `Acoustic material (floor + dome)` | 同时更改地板和穹顶的声学材质。初始预设为 `Glass`，该设置独立于视觉材质。 |
| `Reset` / `R` | 恢复声源、监听器的位置、`Mirror: ON` 和 `Glass` 声学材质，并重新播放。 |
| `Record / save` / `F9` | 开始录制输出。录制中再次按下会保存 WAV 并结束录制。 |
| `Save WAV` / `F10` | 将当前录音保存为 WAV 并结束录制。 |

录音文件以唯一文件名保存在项目的 `Saved/BouncedWavFiles` 中。
Unreal 保存 WAV 时会结束当前录制，操作方式与 Unity 在录制中导出快照不同。
从 UI 上或屏幕边缘 24 px 范围内开始的拖动会被忽略，请从图标内部开始拖动。

行为蓝图为 `BP_Sample02`，UI 为 `WBP_Sample02`。

### ST_SampleScene03

![ST_SampleScene03 — 墙壁和隔板之间的男女语音演示](/img/unreal/ST_Sample03.png)

在有墙壁和隔板的空间中，男性、女性两个声源交替循环播放八段语音。
随摄像机移动监听器，体验墙壁遮挡、反射、HRTF 方向感和空间混响的变化。

| 控件 | 操作 |
|---|---|
| `WASD` | 向前、后、左、右移动。 |
| `Q / E` | 下降、上升。 |
| 移动鼠标 | 旋转视角。 |
| `Esc` | 释放视角控制以操作 UI。在编辑器 PIE 中，使用 `Shift+F1` 释放光标。 |
| 鼠标右键 | 恢复视角控制。 |
| `Reset` / `R` | 在当前摄像机位置从头播放对话。 |

在编辑器 PIE 中，`Esc` 用于结束运行。
行为蓝图为 `BP_Sample03`，UI 为 `WBP_Sample03`。

## 故障排除提示

| 症状 | 检查项 |
|---|---|
| Audio 列表中没有插件 | 检查 SoundTracing 是否启用、C++ 模块是否构建、目标平台 Audio 设置及编辑器是否已重启。 |
| 原生库加载或 ABI 错误 | 使用同一 SDK 发行包中的插件和原生库，并确认打包包含 ThirdParty 文件。 |
| 没有声音或未空间化 | 检查单声道 Sound Wave、Audio Component 播放、两个全局 Audio 插件、Spatialization 启用状态和资源连接。 |
| 声源设置未生效 | 检查 `Audio Component → Sound Attenuation → SoundTracing Source Settings` 连接和 `Override Attenuation` 设置。 |
| 监听器位置不符 | 启用 `Drive Listener Transform` 时使用组件位置，否则使用 Unreal 音频监听器位置。 |
| 监听器替换警告 | 每个 World 只保留一个活动 Listener Component。 |
| 几何体未反映到音频 | 检查 Object Component 是否为受支持网格的直接子组件，以及是否存在网格数据和三角形。 |
| 蒙皮动画未生效 | 检查 `Update Type = Refit`、`Sync Skinned Vertices On Tick = true` 和 LOD。 |
| GPU 未启用 | 检查 `GetGpuBackendStatus()` 和 Output Log。Windows 上需同时部署 `exaSound.dll` 和 `webgpu_dawn.dll`。 |
| 路径不可见 | 检查 Niagara 是否启用、`Visualization Enabled`、声源和监听器的路径设置及 `GetLastValidPathCount()`。 |
| 传送后音高突变 | 修改位置后立即调用 Listener 或 Subsystem 的 `ResetMotionState()`。 |
| 声源较多时断音 | 按下方顺序调整传播计算和音频缓冲区。 |

### 声源较多时断音

1. 将 `Propagation Interval (ms)` 设为 `50`，降低传播请求频率。
2. 将 `Source Ray Resolution Cap` 降到 `8..16`，或将声源的 `Ray Preset` 设为 `Fast`。
3. 监听器从 `Quality Preset = Fast`、`HRTF Path Budget = 1` 和 `Render Band Tier = Merged4` 开始。
4. 将 `Propagation Thread Count` 设为 `2..3` 并重启，为游戏、渲染和音频线程留出执行时间。
5. 将 `Buffers To Enqueue` 设为至少 `2`，必要时调整 `Callback Buffer Frame Size`。
6. 关闭路径可视化，每次仅修改一个设置进行对比。

### 运行时状态

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` 输出原生版本、就绪状态、运算后端、对象和路径数以及监听器设置。`SoundTracing.DumpGpuPropagationStats` 输出 GPU 执行和 CPU 回退统计。

## 下一步

- [SDK 概览](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
