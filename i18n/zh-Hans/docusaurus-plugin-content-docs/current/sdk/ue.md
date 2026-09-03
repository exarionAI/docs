---
title: Unreal Engine
description: SoundTracing Unreal Engine 插件 0.2.0 的安装、Unity 风格组件、HRTF、几何体、材质、GPU 后端和 Blueprint API。
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal SDK 通过 Unreal Audio Extension Plugin 和 Actor Component 连接
[STCoreV2](../core/stcorev2.md)。0.2.0 使用 STCoreV2 v0.7 的 C-ABI 4，并提供与 Unity SDK
一致的 Manager、Listener、Source、Object 和 PathVisualizer 结构。

本文介绍 Unreal native audio integration。FMOD 和 Wwise 应分别构建为独立的 integration，
不能在同一个 build 中与 native integration 同时启用。

## 要求与平台

| 项目 | 当前版本／范围 |
|---|---|
| Unreal Engine | `5.6` |
| SoundTracing plugin | `0.2.0` Beta |
| STCoreV2 | `v0.7`，C-ABI `4` |
| 声明支持的 target platform | Win64、macOS、Linux、Android、iOS |
| 当前 SDK checkout 中的 prebuilt binary | Win64 Release |
| Source channel | Mono 或 Stereo，最多 2 channels |
| 附加 plugin | Niagara，由 `SoundTracing.uplugin` 自动启用 |

当前 Win64 package 包含：

```text
Plugins/SoundTracing/ThirdParty/STCoreV2/
├─ Binaries/Win64/Release/exaSound.dll
├─ Binaries/Win64/Release/webgpu_dawn.dll
└─ Lib/Win64/Release/exaSound.lib
```

构建其他 target 时，必须把对应 platform 的 `exaSound` runtime 和 link artifact 放入同样的
ThirdParty 结构。`SupportedTargetPlatforms` 中的声明不会自动生成 native binary。

:::warning 仅支持 ABI 4
SoundTracing 0.2.0 不兼容 ABI 3 或更早版本的 `exaSound`。混用旧 DLL 时，初始化会以
`STCoreV2 export table is incomplete` 错误终止。
:::

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

## Unreal Audio 设置

Native Unreal audio integration 需要在每个 target platform 的 Audio 设置中选择：

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

修改后重新启动 Editor。还要在每个 `Audio Component` 或 `Sound Attenuation` asset 中
启用 Spatialization，并指定 `SoundTracing Audio Spatialization Settings` asset。

SDK sample project 使用以下 Windows audio 值作为起点：

| 设置 | Sample 值 |
|---|---:|
| Audio Sample Rate | `48000` Hz |
| Callback Buffer Frame Size | `1024` |
| Buffers To Enqueue | `1` |

这些是 sample 值，不是 plugin 的硬性要求。如果项目的 audio budget 不同，请先用这些值
确认功能，再调整 callback 和 buffer size。

## 最快设置

1. 检查 `Project Settings > Plugins > SoundTracing` 中的 Runtime Options 和
   Default Listener Settings。
2. 在 Content Browser 的 `Sounds > SoundTracing` 中创建
   `SoundTracing Audio Spatialization Settings` asset。
3. 将 asset 分配给 `Audio Component` 或 `Sound Attenuation` 的
   Spatialization Plugin Settings。
4. 在作为声学 geometry 的 `StaticMeshComponent` 或 `SkinnedMeshComponent` 正下方添加
   `SoundTracingObjectComponent` child component。
5. 执行 Object Component 的 `Auto Set Materials`，只修正匹配错误的 slot。
6. 启动 PIE，运行 `SoundTracing.Status` 检查 native runtime、backend、listener 和 path 数量。

没有 Listener Component 时 plugin 仍可工作。此时它跟随 Unreal audio-device listener，
并使用 Project Settings 中的 Default Listener Settings。

## 组件概览

| Unity SDK | Unreal Engine SDK | 作用 |
|---|---|---|
| `SoundTraceManager` | `Project Settings > Plugins > SoundTracing` | Native runtime、thread、GPU、cache 和默认 Listener 设置 |
| `SoundTraceListener` | `SoundTracingListenerComponent` | Level 级 Listener profile 和可选 transform override |
| `SoundTraceSource` | `SoundTracing Audio Spatialization Settings` | Source 级 emission、ray、path、attenuation 和 render tuning |
| `SoundTraceObject` | `SoundTracingObjectComponent` | Static/Skinned geometry、BVH 和 material slot 注册 |
| `SoundTracePathVisualizer` | `SoundTracingPathVisualizerComponent` | 基于 Niagara 的 propagation path 显示 |
| Manager runtime panel | `SoundTracingSubsystem` | 通过 Blueprint 读取 runtime 状态和最近 propagation 结果 |

## Project Settings

`Project Settings > Plugins > SoundTracing` 对应 Unity 的 `SoundTraceManager`。

### Runtime Options

| 字段 | 默认值 | 范围／行为 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`。`-1` 让 STCoreV2 使用逻辑 core 数减一；`0` 或 `1` 为 serial。GPU 模式下禁用。需要重启 |
| `Use GPU Backend` | 关闭 | 请求 Dawn/WebGPU 初始化，失败时 fallback 到 CPU。需要重启 |
| `Path Cache Size` | `256` | `0..1024`。所有 active source 共享的 cache budget。`0` 禁用 cache |
| `Propagation Interval (ms)` | `0` | `0..500`。`0` 表示每个 game tick 请求一次；前一 frame 运行时会合并请求 |

### Listener、Attenuation 与 Materials

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `Default Listener Settings` | `Fast` | Level 中没有 Listener Component override 时使用 |
| `Default Source Attenuation Strengths` | 每个 path `1.0` | Source asset 不覆盖 project attenuation 时使用。范围 `0.5..1.5` |
| `Material Preset Library` | 空 | 空时使用内置 `SoundTraceMaterialPresetLibrary`。选择其他 library 后需要重启 |

SDK sample project 的 `DefaultGame.ini` 为演示 override 为 `Middle` 并启用 GPU。Plugin 本身的
默认值如上表所示。

## SoundTracingListenerComponent

把该组件添加到 Pawn 或 Camera，可按 Level 覆盖 Project Settings 中的 Listener profile，
或用该 component 的 transform 代替 Unreal audio-device listener。

### Inspector

| 字段 | 默认值 | 行为 |
|---|---:|---|
| `Override Project Listener Settings` | 开启 | 使用 `Listener Settings` 代替 Project Settings |
| `Listener Settings` | `Fast` | Quality、HRTF、output mode、path 和 air absorption |
| `Drive Listener Transform` | 关闭 | 把该 component 的 world transform 和 velocity 发送给 native listener |

一个 World 中只有一个 Listener Component 能驱动 active listener。另一个 component 开始
Begin Play 时会替换前一个，并在 Output Log 中写入警告。

### Quality preset

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

### HRTF 与输出模式

| HRTF 模式 | 所需 asset | 说明 |
|---|---|---|
| `Band8` | 无 | 使用 8-band magnitude 与 ITD 的轻量模式 |
| `HRIR` | STCoreV2 embedded table | 使用最近方向的测量 HRIR |
| `HRIR Interpolated` | STCoreV2 embedded table | 按方向插值测量 HRIR；默认模式 |

0.1.0 的 `Parametric`、`Convolution`、`SteamAudio` 已在 0.2.0 中移除。
`Custom HRTF Relative Path` 可指定相对于 plugin `Content` 的 `MPI1`、`SAH1` 或
`BPH1` table 路径。留空时使用 STCoreV2 embedded table。

| Output Mode | 说明 |
|---|---|
| `Headphones` | Binaural HRTF 输出 |
| `Speaker` | 内部 Ambisonic stereo decode |

高级 `Render Band Tier` 推荐使用 `Merged4`；`Full8` 会增加每条 path 的 audio-thread
band 处理。Air Absorption 默认值为 `20 °C`、相对湿度 `50%`、`101325 Pa`，用于
ISO 9613-1 衰减。

### Blueprint 方法

| 方法 | 行为 |
|---|---|
| `ApplyListenerSettings()` | 将当前 Inspector 值重新应用到 native listener |
| `SetQualityPreset(Preset)` | 更改并立即应用 quality preset |
| `SetHrtfMode(Mode)` | 更改并立即应用 HRTF mode |
| `SetOutputMode(Mode)` | 切换 Headphones/Speaker 并立即应用 |
| `ResetMotionState()` | Teleport、respawn 后清除 listener/source velocity history |
| `GetListenerSettings()` | 返回 component 当前的 listener settings |

## SoundTracing Audio Spatialization Settings

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` 中创建。相同用途的
source 应共享一个 asset，无需为每个 Audio Component 复制。

### Inspector

| 字段 | 默认值 | 范围／行为 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`。乘到每条 path 的 linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`。在 Intensity 之上增加的 gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`。Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`。Early reflection send |
| `Ray Resolution` | `24` | `0..32`。`0` 继承 Listener grid；其他值使用 `N × N` source reverb ray |
| `Ray Depth` | `4` | `0..16`。`0` 继承 Listener depth |
| `Direct/Reflection/Diffraction/Reverb/Transmission` | 全部开启 | 按 Source 启用 path family |
| `Override Project Attenuation Strengths` | 开启 | 关闭时使用 Project Settings attenuation |
| 每种 path 的 `Strength` | `1.0` | `0.5..1.5`。值越大，同距离下衰减越快 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`。Renderer 保留的最大 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。Path 进入／移除 fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`。缺失 non-direct path 在 fade 前的保持时间。`0` 禁用 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`。每个 sample 的最大 delay 变化 |
| `Bypass` | 关闭 | 跳过 SoundTrace spatial rendering，直接传递输入 |

从 0.2.0 起，spatializer 在每个 audio block 中直接读取
`FAudioPluginSourceInputData::SpatializationParams` 更新 source。如果 source 仍停留在
native `(0,0,0)`，请确认 0.2.0 plugin module 和 binary 已一起部署。

## SoundTracingObjectComponent

`SoundTracingObjectComponent` 将 immediate parent 的 `StaticMeshComponent` 或
`SkinnedMeshComponent` 注册为声学 geometry。它必须直接放在目标 mesh component 下方，
不能放在 Actor 层级中的任意位置。

### Inspector

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

Static Mesh 设置 Forced LOD 时使用该 LOD，否则使用 LOD 0。Skinned Mesh 也优先 Forced LOD，
并上传当前 pose vertex。

### Geometry 与 BVH

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

### Blueprint 方法

| 方法 | 行为 |
|---|---|
| `RegisterNativeObject()` | 将 Parent geometry 注册到 native scene |
| `UnregisterNativeObject()` | 删除 native object 注册 |
| `SyncNativeTransform()` | 立即应用当前 parent transform |
| `RefreshNativeMesh()` | Mesh 或 material 变化后重新上传 geometry |
| `Auto Set Materials` | 按 Parent render material 名称和 alias 自动匹配 preset |
| `SetMaterialPresetIndex(Slot, Preset)` | 更改一个 slot 的 preset index |
| `SetMaterialPresetForAllSlots(Preset)` | 对所有 slot 应用同一 preset |
| `SetUpdateType(Type)` | 更改 native object update policy |
| `GetResolvedMeshLodIndex()` | 返回实际上传的 LOD index |
| `GetUploadedTriangleCount()` | 返回上次上传的 triangle 数量 |
| `IsRegistered()` | 返回 native object 和 mesh 是否均有效 |

## 声学材质与 Transmission

默认 library 位于 plugin 的
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset`，当前包含与 Unity/Web SDK
相同的 22 种 material table。

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Material Preset Library` 中创建 custom library。
新 asset 会复制当前默认 library。在 Project Settings 的 `Material Preset Library` 中选择
后重新启动 Editor。

每个 preset 包含：

- Display name 和 render material name alias
- Scattering `0..1`
- 8-band Reflection、Absorption、Transmission `0..1`
- Transmission Model
- `Solid Distance` 使用的 8-band `Thickness to -30 dB (m)`

频带中心为 `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000 Hz`。
可在 Editor band graph 上点击或拖动来编辑。

### Transmission Model

| 模型 | 输入 | Geometry 条件 |
|---|---|---|
| `Surface` | 穿过一次表面后剩余的各频带 energy coefficient `0..1` | 可用于开放面和薄 surface |
| `Solid Distance` | 透射 energy 衰减到 `-30 dB` 时的各频带参考距离 (m) | 需要闭合 volume 和一致的 face 方向 |

`Solid Distance` 不是 object 的实际厚度。Runtime 测量 ray 在 geometry 内部经过的实际距离，
再按参考距离衰减。`0` 会完全阻断该 band。

`ImportFromJson`、`ExportToJson`、`ResetToBundledJson` 使用 Unity/Web 共用的
`soundMaterial.json` 格式。没有 `transmissionDistanceToMinus30DbMeters` 表示 `Surface`；
存在 8 个有效值表示 `Solid Distance`。

## SoundTracingPathVisualizerComponent

在 Actor 上添加 `SoundTracingPathVisualizerComponent`，可用 Niagara line segment 显示
最近一次 propagation frame。

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `Visualization Enabled` | 开启 | 是否显示 path |
| `Refresh Interval Ms` | `50` | 可视化最小刷新间隔，不影响 propagation |
| `Max Visualized Paths` | `1024` | 最大显示 path 数，范围 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 强度，范围 `0.01..2.0` |
| `Niagara System` | 空 | 空时使用 plugin 默认 Niagara system |

颜色为 Direct=red、Reflection=orange、Diffraction=green、Transmission=cyan、
Reverb=purple。用 `SetVisualizationEnabled(bool)` 控制 runtime 显示，用
`GetActivePathCount()` 读取当前 path 数。Shipping 性能测试时应关闭。

## SoundTracingSubsystem

`SoundTracingSubsystem` 是对应 Unity Manager runtime panel 的 `WorldSubsystem`，向
Blueprint 提供：

| 方法 | 行为 |
|---|---|
| `IsNativeRuntimeReady()` | Library、native init、scene、listener 是否就绪 |
| `IsGpuPropagationActive()` | 是否实际取得 GPU device |
| `GetGpuBackendStatus()` | 返回 `GPU active`、`CPU` 或 `CPU fallback (...)` |
| `GetLastValidPathCount()` | 最近 propagation frame 的 valid path 数 |
| `GetLastNativeError()` | Control thread 最近 native error；无错误时为空字符串 |
| `GetNativeVersion()` | Native version `major.minor.revision` |
| `GetRegisteredObjectCount()` | 当前 World 注册的 object 数 |
| `GetActiveListenerSettings()` | Native listener 当前实际使用的设置 |
| `ResetMotionState()` | 清除 Listener 和 source motion history |
| `RequestPropagationFrame()` | 在常规周期外请求 propagation frame |

## GPU 后端

启用 `Use GPU Backend` 并重新启动 Editor 后，通过 `exaPropagatorInitGpu` 请求
Dawn/WebGPU backend。

- 初始化成功：`GPU active`
- Native build 不含 GPU add-on：`CPU fallback (this exaSound build has no GPU backend)`
- Adapter/device 初始化失败：带原因的 `CPU fallback (...)`
- 未请求 GPU：`CPU`

Win64 分发必须把与 `exaSound.dll` 同一 artifact directory 中的 `webgpu_dawn.dll` 一起
stage。Plugin Build.cs 会把该目录的 DLL 注册为 runtime dependency。

可通过 Blueprint 的 `GetGpuBackendStatus()` 或以下 console command 检查实际状态：

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` 输出 native version、ready 状态、backend、object/path 数和 Listener
profile。`SoundTracing.DumpGpuPropagationStats` 输出 GPU dispatch、ready、CPU fallback
counter。

## 坐标系

使用 Plugin component 时无需手动转换坐标。0.2.0 将 Unreal 坐标按以下方式传给 STCoreV2：

```text
position / vertex / velocity = (UE.Y, UE.Z, UE.X) × 0.01 m
sceneRatio = 1
listener basis: right=(1,0,0), up=(0,1,0), forward=(0,0,-1)
```

Listener basis 遵循 ADR-0001，修复了旧版本 HRTF 前后反转的问题。只有 custom native
integration 才需要自行应用该 contract。

## 示例项目

当前 SDK source project 的 `Content/FirstPerson/Test.umap` 可用于查看
`SoundTracingObjectComponent` 的 geometry、BVH 和 material slot 设置。该 map 位于 host
project 的 Content 中，仅复制 `Plugins/SoundTracing` 时不会包含。

## 故障排除

| 症状 | 检查项 |
|---|---|
| `STCoreV2 export table is incomplete` | 将 Plugin 0.2.0 与 STCoreV2 v0.7 ABI 4 binary 一起部署，删除 ABI 3 DLL |
| Audio 列表中没有 Plugin | Plugin enable、C++ module 编译、target Audio 设置、Editor 重启 |
| Native library 加载失败 | 对应 target 的 `ThirdParty/STCoreV2` runtime/link artifact 与 package staging |
| Source 没有空间化 | 全局 Spatialization/Source Data Override、source Spatialization、SoundTracing settings asset |
| Source 停留在原点 | 确认 0.2.0 module 与 binary 一起部署；0.2.0 每个 audio block 读取 spatialization params |
| Listener 位置错误 | `Drive Listener Transform`；关闭时使用 Unreal audio-device listener |
| Listener 替换警告 | 每个 World 只保留一个 active `SoundTracingListenerComponent` |
| Geometry 不生效 | Object Component 是否为支持 mesh 的 immediate child，是否有 render data 和 triangle |
| Skinned animation 不生效 | `Update Type = Refit`、`Sync Skinned Vertices On Tick = true`、固定 LOD 与 vertex count |
| GPU fallback 到 CPU | `webgpu_dawn.dll`、支持 GPU 的 native build、adapter/device、Output Log、`SoundTracing.DumpGpuPropagationStats` |
| 看不到 Path | Niagara plugin、Visualizer enable、max path 数、Source/Listener path enable |
| Teleport 后 pitch 跳变 | 移动后立即调用 Listener Component 或 Subsystem 的 `ResetMotionState()` |
| 多 Source 时 dropout | HRTF Path Budget `1`、`Merged4`、较低 quality preset、callback/buffer 设置 |
| Editor 退出时 stack overflow | 使用包含 control-thread shutdown fix 的最终 0.2.0 plugin |

## 下一步

- [SDK 概览](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
