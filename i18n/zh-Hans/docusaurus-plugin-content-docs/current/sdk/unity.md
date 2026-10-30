---
title: Unity
description: Sound-Tracing SDK for Unity — 安装、FMOD/Wwise 集成、组件 Inspector 约定、HRTF 与输出、材质、声源/输出 EQ。
---

# Sound-Tracing SDK for Unity

Sound-Tracing SDK for Unity 是把声音追踪引擎 DLL 针对 Unity 用户封装而成的 Unity 包。
可以直接沿用 Unity 的组件模式、管理器脚本和 ScriptableObject，舒适地制作内容。
同时附带演示场景。

## 要求与平台

| 项目 | 值 |
|---|---|
| Unity | 2022.3 LTS 或更高（Unity 6 已验证） |
| 包 | `SoundTrace-SimpleST-release.unitypackage`（基础版，用于 Wwise）/ `SoundTrace-SimpleST-FMOD-release.unitypackage`（FMOD 版）→ `Assets/SoundTrace` |
| 平台 | Windows x64 · macOS Universal · Linux x86_64 · Android（ARMv7/ARM64/x86_64，API 28+）· iOS 15+ |
| WebGL | 不支持 — Unity WebGL 不支持音频滤波器（`OnAudioFilterRead`）。Web 请使用 C SDK 的 WASM 构建 [Web SDK](./web.md) |

## 安装

把 `.unitypackage` 拖放到 Project 窗口，或通过 `Assets > Import Package > Custom Package` 导入，
即可安装到 `Assets/SoundTrace`。同一包的更新会保留 GUID，可以直接覆盖。

与 FMOD、Wwise 配合使用时，请按照下文的 [与 FMOD 配合使用](#与-fmod-配合使用)、[与 Wwise 配合使用](#与-wwise-配合使用) 操作。
FMOD 只需导入 FMOD 版包即可，Wwise 插件则由 Audiokinetic Launcher 安装。

## 与 FMOD 配合使用

如果项目中存在 Sound-Tracing SDK FMOD 插件（`SimpleSTFmod`），SoundTrace 会自动以 **FMOD 集成**方式工作。
空间声学渲染由 FMOD Studio 的 SimpleST Source / Listener DSP 完成，SoundTrace 只通过
`SoundTraceManager` + `SoundTraceObject` 把几何体和材质上传到插件上下文。
`SoundTraceListener` / `SoundTraceSource` 会记录警告并关闭。

![导入 FMOD 版包](/img/fmod/unity-fmod-edition-import.png)

1. 把 FMOD for Unity 2.04 放入项目（`Assets/Plugins/FMOD`；如果用 tgz 安装，则以 embed 方式放入 `Packages/`）。
2. 把 **FMOD 版**包 `SoundTrace-SimpleST-FMOD-release.unitypackage` 拖放到 Project 窗口。
   没有单独的菜单。包的 `Runtime/Plugins/FMOD` 中含有 `SimpleSTFmod`（Windows x64、macOS），
   编辑器加载时 SoundTrace 会把它复制到 FMOD 插件文件夹，并注册到 FMOD Settings › Dynamic Plugins。
   即使之后才放入 FMOD，下次加载时也会执行同样的操作。
3. 在 FMOD Studio 中，在主总线上放置 **SimpleST Listener**，在 3D 事件的主轨道上用
   **SimpleST Source** 替代 FMOD Spatializer — 参见 [FMOD 插件](./fmod.md)。
4. 场景中放置 `SoundTraceManager`、用于几何体的 `SoundTraceObject` 和 FMOD `StudioListener`。

引擎实例只有一个。SimpleSTFmod 加载的 `SimpleSTRealtime` 与 SoundTrace 通过 P/Invoke 使用的是同一个，
所有控制调用都在插件的控制线程上执行。

## 与 Wwise 配合使用

如果 Wwise Unity 集成的 DSP 文件夹中存在 `SimpleSTWwise`，则以 **Wwise 集成**方式工作
（如果同时存在 FMOD，则 FMOD 优先）。

SoundTrace 使用基础包，Wwise 插件则与其他 Wwise 插件一样由 Audiokinetic Launcher 安装。

![Launcher 中已安装的 Sound-tracing](/img/wwise/launcher-bundle.png)

1. 把基础包 `SoundTrace-SimpleST-release.unitypackage` 拖放到 Project 窗口。
2. 把从 Audiokinetic Launcher 商店获取的 **Sound-Tracing SDK for Wwise**（插件名称 `Sound-tracing`）
   安装到 Wwise。
3. 运行 Launcher › **Unity › Integrate（或 Modify）Wwise in Project**。Launcher 会把 Wwise SDK 中已安装的
   插件（包括 Sound-tracing）放入 Wwise Unity 集成的 DSP 文件夹，并由 Wwise 声音引擎加载。
   请在关闭 Unity 编辑器的状态下运行。
4. 在 Wwise 项目中，在 Audio Objects 总线上放置 **Sound-tracing Renderer**，并把 3D 声音发送到该总线
   （Attenuation 关闭或设为平坦）— 参见 [Wwise 插件](./wwise.md)。
5. 场景中放置 `AkInitializer`、`AkAudioListener`、发射器上的 `AkGameObj`，以及 `SoundTraceManager`、
   `SoundTraceObject`。Wwise Unity 的单位是米，因此 `sceneRatio = 1`。

## Unity Audio 设置

1. 打开 `Edit > Project Settings > Audio`。
2. 将 `Default Speaker Mode` 设为 `Stereo`。
3. 将 `DSP Buffer Size` 设为 `Best latency`。

![Unity Audio 设置](/img/unity/Image01_AudioSetting.png)

如果这些设置不一致，Manager 和 Listener Inspector 会显示警告。输出采样率直接使用设备值
（Sound-Tracing SDK 与内部 44.1 kHz 相互转换），设备采样率变化时会以相同设置重建原生状态。

## Audio Asset Import 设置

以使用单声道声源为前提，音频剪辑设置为 PCM 格式。

![Audio Asset Import 设置](/img/unity/ImportSetting.png)

## 最快设置

1. 在空 GameObject 上添加 `SoundTraceManager`。
2. 在带有 `AudioListener` 的 Main Camera 上添加 `SoundTraceListener`。
3. 在声源 GameObject 上添加 `SoundTraceSource`，并为同一 GameObject 上的 `AudioSource` 指定 clip。
4. 在要用作声学几何体的 Mesh GameObject 上添加 `SoundTraceObject`。
5. 如有需要，在与 Manager 相同的 GameObject 上添加 `SoundTracePathVisualizer`。
6. 在 Play Mode 中检查 Console 错误、声音和 path。

在所有同时加载的 scene 中，只能各有一个活动的 Manager 和 Path Visualizer。
每个 Sound-Tracing SDK 上下文只有一个听者，由第一个注册的 `PrimaryListener` 渲染。

## 组件概览

| 组件 | 作用 | 必需依赖 |
|---|---|---|
| `SoundTraceManager` | 运行时（上下文与控制线程）、scene、材质注册、传播 | 每个运行时 1 个 |
| `SoundTraceListener` | Listener transform、ray 质量、输出/HRTF、延迟与淡化 | 活动的 Manager、`AudioListener` |
| `SoundTraceSource` | 把 `AudioSource` 输出作为单声道流输入，按 path 配置 | 同一 GameObject 上的 `AudioSource`、活动的 Listener |
| `SoundTraceObject` | 将 Mesh 和 submesh 材质注册到声学 scene | `MeshFilter`、`MeshRenderer`（Read/Write Enabled） |
| `SoundTracePathVisualizer` | 调试显示有效 path 和 hit triangle | 与 Manager 相同的 GameObject |

## 音频流与线程

- `SoundTraceSource.OnAudioFilterRead` 把输入写入**单声道主机流**（`st_rt_source_write_stream`）
  并清除 Unity 的 dry 输出。`SoundTraceListener` 的回调一次性拉取整个空间声学混音
  （`st_rt_render_process`，Buffered 模式）。
- 场景变更、声源创建/删除、传播、可视化快照在专用 **control thread**（`SoundTraceControlThread`）
  上串行处理。音频回调中不包含场景控制 API 或托管堆分配。
- 位置通过固定步长运动采样（`SoundTraceFixedStepMotion`）估算速度。传送后调用
  `ResetMotionState()` 防止 Doppler 尖峰。
- 每次启动渲染时（包括重启和 HRTF 切换），都会显式设置 Hybrid（`reserved0 = 1`）和**关闭引擎限制器**，
  并把主增益保持为 0 dB。限幅由 Unity 混音器负责。渲染选项只在引擎创建时和扬声器布局变更时以预设重新铺设，
  `render_start` 会保持原样。
- 创建引擎后立即**关闭等响度补偿**（`SoundTraceRuntime.DisableLoudnessCompensation`）。
  音色与电平由 Unity 混音器负责。

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| 字段 | 默认值 | 行为 |
|---|---:|---|
| `Propagate On Start` | `true` | 在 `Start()` 中同步初始 scene graph 和 transform，然后请求第一次传播。 |
| `Load Default Materials On Enable` | `true` | 在 `OnEnable()` 中把随包 Material Preset Library（SoundTrace 游戏材质 22 种）注册到原生材质表。 |
| `Propagation Thread Count` | `-1` | Sound-Tracing SDK 计算池宽度（`maxComputeThreads`）。`-1` 为自动（按逻辑线程数，引擎调整为 min(性能核数, 6)），`0`/`1` 为单线程，`2` 及以上为指定数量。在原生初始化之前生效。 |

### 公开属性

| 属性 | 类型 | 含义 |
|---|---|---|
| `Instance` | `static SoundTraceManager` | 单例 Manager。不存在时为 `null` |
| `Scene` | `SoundScene` | Manager 拥有的低层 scene |
| `PrimaryListener` / `ListenerCount` / `SourceCount` / `ObjectCount` | — | 注册状况 |
| `DefaultMaterialsLoaded` | `int` | 自动注册的随包材质数量 |
| `LastValidPathCount` | `int` | 最近一次传播的有效 path 数 |
| `LastNativeError` | `string` | 最近的 scene graph/传播错误 |
| `PropagationThreadCount` | `int` | 生效的计算线程数 |

### 公开方法

| 方法 | 行为 |
|---|---|
| `ResetMotionState()` | 在 teleport、respawn、scene 切换后立即重置所有 Listener 和 Source 的 motion history。 |

### 声源数量上限

`SoundTraceRuntime.MaxSources`（静态 `uint`，默认 `0`）是同时存活的引擎声源数上限。
为 `0` 时使用引擎平台默认（桌面 128 · Android/iOS 48）。请在第一个 `SoundTraceListener` 启用
**之前**设置（通过 `STRT_CreateOptions.maxSources` 传递）。超出上限的声源不会抛出异常 —
`SoundSourceCore` 会对 `ST_STATUS_BUDGET_EXCEEDED` 警告一次，并让该 `AudioSource` 保持 dry。

```csharp
SoundTraceRuntime.MaxSources = 64;   // 第一个 Listener 启用之前
```

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

通常添加到 Main Camera。

### Inspector

| 字段 | 默认值 | 范围/选项 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`、`Fast`、`Middle`、`Quality` |
| `Ray Resolution` | `16` | `1..32`；听者 guide ray 横向和纵向使用相同值 |
| `Ray Depth` | `4` | `1..16`；反射最大深度 |
| `Output Mode` | `Headset` | `Headset`（双耳）、`Speaker`（立体声声像） |
| `HRTF` | `HRIR Interpolated` | 以下三种模式 |
| `Max Delay Seconds` | `0` | `0..5 s`；每个声源延迟环的上限。`0` = 引擎平台上限（桌面 2 s · Android/iOS 1 s）。非 0 时覆盖该上限（小于 0.012 s 时按 0.012 s） |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`；路径出现/消失的交叉淡化 |
| `Output EQ` | 关闭 | 作用于整个 Sound-Tracing SDK 混音的参数 EQ — [EQ](#eq) |

引擎按每个声源的路径所需分配延迟环，`Max Delay Seconds` 仅用作上限。Android/iOS 的默认上限为 1 s，
因此更长的路径不会被渲染。需要更远的路径时，请指定听者的 `maxDelaySeconds`。

选择 `Fast`、`Middle` 或 `Quality` 时会同时应用 ray 值，并在 Inspector 中锁定。
要直接编辑，请选择 `Custom`。

| 预设 | Ray Resolution | Ray Depth | 推荐起点 |
|---|---:|---:|---|
| `Custom` | 已保存的值 | 已保存的值 | 手动调优 |
| `Fast` | `16` | `4` | 移动端、大量声源 |
| `Middle` | `24` | `8` | 普通游戏和桌面平台 |
| `Quality` | `32` | `12` | 音频占比较高的应用 |

### HRTF 与输出模式

| 模式 | 所需 asset | 说明 |
|---|---|---|
| `Band8` | 无 | 不使用外部表的轻量模式 — 以**立体声声像**渲染 |
| `Hrir` | 无 | 引擎内置的 **MIT KEMAR** HRIR |
| `HRIR Interpolated` | 无 | MIT KEMAR HRIR（默认）。Sound-Tracing SDK 执行宽带 HRIR 卷积 |

`Output Mode = Speaker` 为声像输出。

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource` 把同一 GameObject 上的 `AudioSource` 输出作为单声道流推送给引擎。
启用时，为了让 SoundTrace 负责空间化和 Doppler，会把 `AudioSource.spatialBlend` 和
`AudioSource.dopplerLevel` 设为 `0`。

### Inspector

| 字段 | 默认值 | 行为 |
|---|---:|---|
| `Intensity` | `1` | 声源辐射强度（压力倍率）。范围 `0..10` |
| `Reverb Ray Resolution` | `24` | source transport ray 横向和纵向分辨率。范围 `1..32` |
| `Reverb Ray Depth` | `4` | transport ray 最大反射深度。范围 `1..16` |
| `Enable Direct` / `Reflection` / `Diffraction` / `Reverb` / `Transmission` | `true` | 按 path 门控 |
| `Bypass` | `false` | 跳过 SoundTrace 渲染，直接传递原始 `AudioSource` 输出 |
| `Source EQ` | 关闭 | 作用于此声源信号的参数 EQ — [EQ](#eq) |

距离衰减由引擎以物理 `1/r` 衰减和空气吸收应用，最大延迟与淡化是 Listener 的设置。
Scene View 中的 `Show Gizmo` 显示各 path 的可听范围。

### 公开方法

| 方法 | 行为 |
|---|---|
| `SetBypass(bool enabled)` | 为 `true` 时跳过 SoundTrace 渲染并传递原始输出。 |
| `ResetMotionState()` | 将当前 Transform 重新设为 motion 基准点，防止 teleport 后出现 Doppler spike。 |

要同步多个 `AudioSource` 的播放时机，请基于同一个 `AudioSettings.dspTime` 调用 `PlayScheduled()`。

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject` 注册 `MeshFilter.sharedMesh` 和 Renderer 的 submesh 材质槽。
由于 Build 中需要读取网格数据，请在 Import Settings 中启用 `Read/Write Enabled`。
对于程序化网格，不要调用 `UploadMeshData(true)`。

### Geometry 与加速结构

![Scene View 中显示的 BVH](/img/unity/Img_STObjDome.png)

| 字段 | 默认值 | 说明 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`（→ Sound-Tracing SDK HybridKD）、`LBVH`（→ LBVH）、`LBVH_SIMD4/8/16`（→ LBVH_SIMD） |
| `BVH Max Depth` / `Primitives Per Leaf` | `12` / `16` | 兼容字段。**引擎在内部决定 leaf 大小，因此被忽略** |
| `Update Mode` | `Static` | `Static`（静态 TLAS）/ `Dynamic`（只更新变换）。`Refit`、`Rebuild` 仅为兼容保留 |

`BVH Type` 只选择网格注册时的加速结构类型。使用相同 Mesh asset、材质槽和 BVH 设置的 object
由 `SoundTraceMeshCache` 以 refcount 共享原生网格。

### 蒙皮与程序化网格

引擎没有 vertex refit。要反映变形后的几何体，请烘焙新 Mesh 并重新注册 `SoundTraceObject`
（或调用 `MeshCore.SetData`），**替换为新的原生网格**。每帧替换成本很高，请定期（例如 0.2 ~ 0.5 s）更新。

### 公开方法

`Auto Set` 会将 Renderer material 名称与随包 preset 匹配。如果 imported model root 上没有 mesh，
而是由 child 持有 geometry，请使用 `Add To Child Meshes`。

| 方法 | 行为 |
|---|---|
| `AutoSetMaterialSlots()` | 将所有 submesh 的 Renderer material 名称与随包 preset 自动匹配。 |
| `GetMaterialPresetIndex(int slotIndex)` / `GetPresetName(int slotIndex)` | 返回槽位的 preset index / 显示名称。 |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 更改一个槽位的 preset。 |
| `SetMaterialPresetForAllSlots(int presetIndex)` | 对所有槽位应用同一个 preset。 |
| `GetNativeMaterialIndices()` | 以原生注册格式的数组返回每个 submesh 的 preset index。 |
| `GetTriangleCount()` | 返回所有 submesh 的 triangle 数。 |
| `static IsGpuCompatibleBvhType(BvhType value)` | 仅为兼容保留。SIMD 系列时返回 `true` |

## 声学材质

默认创作资源为 `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。
在 `SoundTrace > Material Preset Library` 中可以执行以下操作。

- 添加、删除 preset 并调整顺序
- 导入/导出 `soundMaterial.json`，或重新导入随包 JSON
- 编辑 Scattering 以及 **9 频段** Reflection、Absorption、Transmission 图表

![Material Preset Library](/img/unity/Image_Mat_01.png)

频段中心为 `63`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000`、`16000 Hz`。
每个频段的 `R + A + T` 必须为 `1`，容差 `0.001`。错误的长度和系数会报错，并且不会把 8 频段输入
自动填充为 9 频段。

默认材质是 SoundTrace 游戏材质 22 种。

| 索引 | 材质 |
|---|---|
| 0 ~ 5 | `Concrete`, `Fabric`, `Wood`, `Brick`, `ConcreteBlock`, `Glass` |
| 6 ~ 11 | `Gravel`, `GypsumBoard`, `Linoleum,RubberOrAsphaltTile`, `Marble`, `Plaster`, `Plywood` |
| 12 ~ 17 | `Sherdded-woodFiberborad`, `Snow`, `Soil`, `Steel`, `Stone`, `WaterSurface` |
| 18 ~ 21 | `TunableAbsorber`, `LowVarianceTarget`, `ConcreteBlockPainted`, `FiberglassReinforcedPlastic` |

这些是游戏用预设，不是测量数据。用户材质按 9 频段录入。

![按频段编辑材质图表](/img/unity/Image_Mat_02.png)

透射用各频段的表面透射系数 `T` 表示。

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

只能在与 Manager 相同的 GameObject 上添加一个。

| Inspector 字段 | 默认值 | 说明 |
|---|---:|---|
| `Enable Path Visualization` | 开启 | 是否显示 path mesh |
| `Refresh Interval Ms` | `50` | 重建可视化 mesh 的最小间隔。不影响传播周期 |
| `Max Visualized Paths` | `1024` | 最多显示的 path 数量（`16..5000`） |
| `Path Width` | `0.08` | 线宽 |
| `Path Alpha Intensity` | `0.5` | 显示强度 |
| `Path Depth Mode` / `Sorting Layer` / `Sorting Order` | `AlwaysOnTop` / `Default` / `10` | 渲染排序 |
| `Draw Hit Triangles` | 关闭 | 在 Scene View 中显示 hit triangle |

Direct、Reflection、Diffraction、Reverb 和 Transmission 按 path 类型用不同颜色显示。
此组件用于调试，在性能测量和 release build 中应禁用。主要公开成员为
`Active`、`Render()` 和 `Clear()`。

## 演示场景

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

用于检查基础 room、source、listener、geometry、material preset 和 path visualization。

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

用于检查 source/listener 移动、material preset 切换，以及 Unity 原始 audio 与 SoundTrace 输出的对比。

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

用于检查大空间中的多个 source、wall occlusion、移动期间的 HRTF 方位感和 room response。

## 故障排除

| 症状 | 检查项 |
|---|---|
| 没有声音 | Console 中首个 Manager 初始化错误、Stereo/Best latency、AudioSource clip、是否存在 Manager/Listener |
| Source/Listener/Object 要求 Manager | 检查级联错误之前记录的 `Failed to initialize SoundTraceManager` 原因 |
| Geometry 未生效 | `Read/Write Enabled`、MeshFilter/MeshRenderer、child mesh 位置、注册状态 |
| 运行时变形 mesh 未生效 | 引擎没有 refit。替换为新网格 |
| FMOD/Wwise 模式下 Listener/Source 被关闭 | 正常 — 渲染由中间件插件负责 |
| 部分声源未空间化，听起来是 dry | Console 中的 `ST_STATUS_BUDGET_EXCEEDED` 警告 — 减少声源或调高 `SoundTraceRuntime.MaxSources` |
| Android 构建因 `Sound-Tracing SDK requires Android API 28 or newer` 失败 | 将 Player Settings › Minimum API Level 设为 28 或更高 |
| 开启 EQ 后声音没有变化 | Console 中的 EQ 不支持警告，是否处于 FMOD/Wwise 集成模式（使用中间件 EQ） |
| Teleport 后 pitch 跳变 | 更改 transform 后立即调用 `ResetMotionState()` |
| 性能不足 | 按 `Quality → Middle → Fast`、缩小 Reverb Ray Resolution、禁用 path visualizer 的顺序检查 |
| 多个声源听起来像 comb filtering | 使用相同的 `AudioSettings.dspTime` 调用 `PlayScheduled()` |

## EQ

Sound-Tracing SDK 的参数 EQ 可在两个位置应用。

- **声源 EQ** — 在引擎频段拆分之前作用于声源信号本身。该声源的直达声、反射、绕射、混响都会得到相同的音色。
- **输出 EQ** — 在渲染末端（主增益之前）作用于整个 Sound-Tracing SDK 混音。

滤波器类型为 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6 种（切滤波固定为 12 dB/oct），
范围为频率 20 ~ 20,000 Hz，增益 ±24 dB（仅 Peaking·搁架），Q 0.1 ~ 30（搁架最多 3），前级增益 −48 ~ +12 dB。
默认关闭，关闭时不调用引擎，因此输出与没有 EQ 时相同。只发送变化的值，引擎以
20 ms 交叉淡化过渡。

| 位置 | Inspector | 脚本 |
|---|---|---|
| 声源 EQ | `SoundTraceSource`（及 `SoundTraceClipSource`）的 `Source EQ` | `SetSourceEq(SoundTraceEq)`、`SetSourceEqEnabled(bool)`、`GetSourceEq()` |
| 输出 EQ | `SoundTraceListener` 的 `Output EQ` | `SetOutputEq(SoundTraceEq)`、`SetOutputEqEnabled(bool)`、`GetOutputEq()` |

- `SoundTraceEq`：`enabled`、`preampDb`、`bands`（最多 16 个）。`SoundTraceEqBand`：`enabled`、`type`、`frequencyHz`、`gainDb`、`q`。
- `SoundTraceEqFilterType`：`Peaking (Bell)` · `Low Shelf` · `High Shelf` · `High Cut (Low-pass)` · `Low Cut (High-pass)` · `Notch`。
  对不使用 Gain 的类型，Inspector 会隐藏 Gain。
- 只修改输出 EQ 的 Inspector 编辑不会重启渲染。关闭声源 EQ 会在引擎中清除它；重新创建原生声源时会再次应用。
- 是否支持可用 `SoundTraceRuntime.SupportsSourceParametricEq` / `SupportsOutputParametricEq` 确认。
- 在 FMOD/Wwise 集成模式下 `SoundTraceListener`、`SoundTraceSource` 会关闭，因此请使用中间件插件的 EQ —
  [FMOD](./fmod.md#eq) · [Wwise](./wwise.md#eq)。

## 后续文档

- [支持的平台](./overview.md)
- [FMOD 插件](./fmod.md) · [Wwise 插件](./wwise.md)
- [Web SDK](./web.md) · [Unreal Engine SDK](./ue.md)
