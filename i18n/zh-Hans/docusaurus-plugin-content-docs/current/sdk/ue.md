---
title: Unreal Engine
description: Sound-Tracing SDK for Unreal Engine — 安装、Native/FMOD/Wwise 集成模式、Project Settings、听者/声源/对象组件、单次音效、声源/输出 EQ。
---

# Sound-Tracing SDK for Unreal Engine

Sound-Tracing SDK for UE5 插件通过 Unreal Audio Mixer 的 Spatialization 插件 + 子混音（submix）以及
Actor Component 连接引擎。

## 当前状态

| 项目 | 内容 |
|---|---|
| Engine | Unreal Engine 5.6（5.7 已验证） |
| Plugin | `Plugins/SoundTracing`（`SoundTracing` 运行时 + `SoundTracingEditor` 模块，依赖 Niagara） |
| 支持平台 | Win64、Mac、Linux、Android、IOS |
| 引擎二进制 | `ThirdParty/SimpleST/Binaries/<Plat>/<Config>/` — 仅 UE Debug 使用 SDK Debug，其余使用 Release |

## 安装

把下载的 `SoundTracing` 插件文件夹放入 Unreal 项目的 `Plugins/` 文件夹（没有该文件夹时请创建）。
要在多个项目中使用，也可以放入 `<UE 安装文件夹>/Engine/Plugins/Marketplace/`。重新打开编辑器后会编译模块
（非 C++ 项目会弹出询问是否编译的对话框），在 `Edit > Plugins` 中确认 **SoundTracing** 已启用，
然后重启编辑器。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/           Niagara 路径可视化、Material Preset Library
      ├─ Source/            SoundTracing · SoundTracingEditor
      └─ ThirdParty/SimpleST/
         ├─ Include/SimpleST/ABI/
         ├─ Binaries/<Plat>/<Config>/
         └─ Resources/HRTF/
```

插件中包含 UE 封装源码、资源、公开 C ABI 头文件、各平台引擎二进制、HRTF 和许可证。

## 集成模式 — Native / FMOD / Wwise

![集成模式选择](/img/ue/integration-mode.png)

`SoundTracing.Build.cs` 根据 `.uproject` 中启用的插件选择集成方式
（按 `Wwise` → `FMODStudio` → Native 的顺序，可用环境变量
`SOUNDTRACING_UNREAL_INTEGRATION=native|fmod|wwise` 强制指定）。组件在三种模式下的名称和用法相同。

| | Native | FMOD | Wwise |
|---|---|---|---|
| Sound-Tracing SDK 上下文与渲染 | SoundTracing（UE Audio Mixer Spatialization + 子混音） | `SimpleSTFmod`（Source/Listener DSP） | `SimpleSTWwise`（Sound-tracing Renderer） |
| 听者 | UE 听者 / `ListenerComponent` | FMOD 听者 | Wwise 听者 |
| 引擎 DLL 位置 | `ThirdParty/SimpleST/Binaries` | `FMODStudio/Binaries/<Plat>/` | `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` |

在 FMOD/Wwise 模式下，`ListenerComponent` 的输出设置（HRTF、输出模式）和 Source Settings 资源
不会被使用 — 由中间件插件的参数承担这些职责。

- **DSP**：Native 模式在 Unreal Audio Mixer 内渲染，FMOD/Wwise 模式由中间件插件渲染。
- **变换更新**：对象 — `SoundTracingObjectComponent.cpp` `TickComponent()` → `SyncNativeTransform()`，
  听者 — `SoundTracingListenerComponent.cpp` `TickComponent()`。三种模式通用。

### FMOD 模式安装

FMOD 发行包（`SimpleST-fmod-release.zip`）中的 `Unreal/SoundTracing` 是 **FMOD 版**。
`ThirdParty/SimpleSTFmod/<Plat>/` 中包含 `SimpleSTFmod`、`SimpleSTRealtime`、HRTF。

1. 把 FMOD for Unreal 放入项目的 `Plugins/FMODStudio`。
2. 把 `Unreal/SoundTracing` 放入项目的 `Plugins/` 并构建。构建时 SoundTracing 会把上述文件复制到
   `Plugins/FMODStudio/Binaries/<Plat>/`，并在 `Config/DefaultEngine.ini` 中加入 `+PluginFiles=SimpleSTFmod`
   （= Project Settings › FMOD Studio › Plugin Files）。已有相同文件时跳过。Win64、Mac。
3. 之后在 FMOD Studio 中，在主总线上放置 SimpleST Listener，在 3D 事件的主轨道上放置
   Sound-Tracing SDK Source — 参见 [FMOD 插件](./fmod.md)。

### Wwise 模式安装

Wwise 插件与其他 Wwise 插件一样由 Audiokinetic Launcher 安装。

1. 把从 Audiokinetic Launcher 商店获取的 **Sound-Tracing SDK for Wwise**（插件名称 `Sound-tracing`）安装到 Wwise。
2. 运行 Launcher › **Unreal Engine › Modify Wwise in Project**（首次为 Integrate）。Launcher 会把 Wwise SDK 的
   插件（包括 Sound-tracing）复制到 `WwiseSoundEngine/ThirdParty`。
3. 把 `SoundTracing` 放入项目的 `Plugins/` 并构建。

![Launcher 的 Modify Wwise in Project](/img/wwise/launcher-modify-project.png)

SoundTracing 在模块启动时获取插件，设置 `sceneRatio = 0.01`（Wwise Unreal 单位 = cm），
并通过 `SimpleSTWwise_SetWorldAxes(UNREAL)` 通知 Unreal 坐标轴（+Z 向上）。这是因为
Wwise for Unreal 2024.1+ 会不经坐标轴转换直接传递位置 — 参见 [Wwise 插件](./wwise.md)。

![UE Wwise 安装结果](/img/wwise/ue-install.png)

## Unreal Audio 设置（Native 模式）

在每个 target platform 的 Audio 设置中选择以下 plugin。

![Audio 插件设置](/img/ue/audio-plugin-settings.png)

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

Audio Mixer Sample Rate 可以是任意值。Sound-Tracing SDK 以 44.1 kHz 运行并转换到设备采样率
（44.1 kHz 时跳过转换）。

## Project Settings › Plugins › SoundTracing

![Project Settings](/img/ue/project-settings.png)

| 类别 | 项目 | 默认值 | 说明 |
|---|---|---:|---|
| Runtime | `Max Compute Threads` | `0` | Sound-Tracing SDK 计算线程上限。0 = auto（min(性能核数, 6)）。需要重启 |
| Runtime | `Prefer Performance Cores` | `true` | 把传播 lane 和计算池固定到性能核（关闭 Windows 11 EcoQoS）。混合架构 CPU 推荐 |
| Runtime | `Render Mode` | `Buffered` | `Buffered`（Sound-Tracing SDK 渲染线程填充环形缓冲，回调只复制，约 3 块延迟）/ `In Callback`（在 Unreal 音频回调内渲染，最低延迟） |
| Runtime | `Max Sources` | `0` | 高级。同时存活的引擎声源数上限。0 = 引擎平台默认（桌面 128，Android/iOS 48）。超出的声源由引擎拒绝（`ST_STATUS_BUDGET_EXCEEDED`，显示在日志中），组件回退到 dry 路径。在由 SoundTracing 创建上下文的 Native 模式下于创建时应用（需要重启）。FMOD/Wwise 模式遵循插件设置 |
| Runtime | `Max Delay Seconds` | `0` | 高级。每个声源延迟环的上限。0 = 引擎平台默认（桌面 2 s，Android/iOS 1 s）。环只按路径所需增长 |
| Runtime | `Dry Fallback When Unavailable` | `true` | 运行时不存在或失败时，声源以 dry 播放而非静音 |
| Runtime | `Output Submix Parent` | 空 | 空间化输出子混音的父级 |
| Propagation | `Reflection Update Interval (ms)` | `33` | 反射/绕射 lane 的最小周期。它占传播成本的大部分，要回收 CPU 就提高此值。0 = 无限制 |
| Propagation | `Direct Update Interval (ms)` / `Reverb Update Interval (ms)` | `10` / `4` | direct、reverb lane 的最小周期 |
| Propagation | `Acceleration Structure` | `TinyBVH` | BinnedSAH / HybridKD / TinyBVH / LBVH / LBVH SIMD |
| Propagation | `Static Rebuild Delay Seconds` | `0.1` | 把静态几何体变更合入静态加速结构前的等待时间（用于 level streaming 批处理） |
| Listener | `Default Listener Settings` | — | 下面的听者设置结构体 |
| Sources | `Source Ray Resolution Cap` / `Source Ray Depth Cap` | `0` / `0` | 所有声源资源的 transport ray 网格与深度上限。0 = 按资源值 |
| Listener | `Output EQ` | 关闭 | 作用于整个 Sound-Tracing SDK 混音的参数输出 EQ — [EQ](#eq)。开启期间取代听者的图示 `Output EQ`。仅 Native 模式 |
| Materials | `Material Preset Library` | 空 | 启动时注册到 Sound-Tracing SDK 的库。为空时使用插件随包库 |

## 听者设置（`FSoundTracingListenerSettings`）

![听者设置](/img/ue/listener-settings.png)

项目默认值放在 Project Settings 中，按关卡的 override 放在 `USoundTracingListenerComponent` 上。

| 类别 | 项目 | 默认值 | 选项 / 说明 |
|---|---|---:|---|
| Quality Preset | `Quality Preset` | `Balanced` | `Custom`（保留字段）/ `Fast`（12×12，深度 4）/ `Balanced`（16×16，深度 8 = 引擎默认）/ `Quality`（24×24，深度 8） |
| Listener Rays | `Ray Resolution` / `Ray Depth` | `16` / `8` | guide ray N×N（`4..64`），反射最大阶数（`1..16`）。仅 Custom 时可编辑 |
| Listener Rays | `Ray Sampling` | `FibonacciSphere` | 仅 `FibonacciSphere` |
| Output | `Output Mode` | `Headphones` | `Headphones`（双耳 HRIR）/ `Speakers (HOA decode)` / `Stereo Panning` |
| Output | `HRTF Dataset` | `SADIE II D2 KEMAR` | SADIE II D2（8,802 方向 · 256 tap，插件随包）/ MIT KEMAR（128 tap，引擎内置） |
| Output | `Speaker Layout` | `Stereo 2.0` | Stereo 2.0 / Laptop Stereo 2.0 / 2.1 / 4.1 / 5.1 / 7.1 |
| Output | `Early Reflections` | `Hybrid Ambisonic Bed` | 仅 Headphones、Stereo Panning。`Objects` 用于基准试听 — 8 个声源的大厅中每块 16.8 ms（上限 11.6 ms），Hybrid 2.4 ms |
| Render | `Doppler` / `Doppler Gain` | `true` / `Off` | 可变延迟音高 / 运动单极子辐射增益 |
| Render | `Late Reverb` / `Late Reverb Coupling` | `true` / `Default` | FDN16 / Off · Subtle 6 dB · Default 9 dB · Strong 12 dB |
| Render | `Path Fade Time Seconds` | `0.05` | 路径出现/消失的交叉淡化 |
| Render | `Limiter` | `Off` | Off / Envelope / LookaheadPeak / True Peak（−1 dBTP，137 采样延迟）。默认 `Off` — 由 Unreal 主输出链负责限幅 |
| Render | `Output EQ Enabled` / `Output EQ Gains Db` | `false` | 63 ~ 16k Hz 9 频段 ±24 dB 图示 EQ。Project Settings 的参数 `Output EQ` 开启时以其为准，关闭后恢复此值 |
| Paths | `Enable Direct/Transmission/Reflection/Diffraction/Reverb Path` | 全部 `true` | 全局路径门控 |
| Acoustics | `Propagation Delay` / `Direct Occlusion` | `true` / `true` | 关闭后分别为：所有路径与直达声同时到达 / 直达声穿过几何体 |
| Acoustics | `Reference Distance Meters` / `Min Distance Meters` | `1.0` / `1.0` | 物理 `1/r` 衰减的起始距离 / 近距离钳制 |
| Air Absorption | `Air Absorption Enabled`, `Temperature Celsius`, `Relative Humidity Percent`, `Pressure Pa` | `true`, `20`, `50`, `101325` | ISO 9613-1。声速由温度推导 |

### `USoundTracingListenerComponent`

可选组件。即使没有它，插件也会用项目默认听者设置和音频设备听者 transform 运行。
把它挂到 Pawn 或相机上，可提供按关卡的 override 或直接供给 transform。

| 项目 | 说明 |
|---|---|
| `Override Project Listener Settings` / `Listener Settings` | 用上述结构体覆盖项目默认值 |
| `Drive Listener Transform` | 把此组件的 world transform 和速度传给 Sound-Tracing SDK，代替音频设备听者（旋转包含 roll） |
| `ApplyListenerSettings()`, `SetQualityPreset()`, `SetHrtfDataset()`, `SetOutputMode()`, `SetSpeakerLayout()` | 在 Blueprint 中运行时更改 |
| `ResetMotionState()` | 传送、重生后防止 Doppler 尖峰 |

## 声源设置资源（`USoundTracingSourceSettings`）

![Source Settings 资源](/img/ue/source-settings-asset.png)

在 Content Browser 中创建 `SoundTracing Source Settings` 资源，并连接到 Audio Component 或
Sound Attenuation 的 spatialization plugin settings。请按用途把共享资源当作 preset 使用。

| preset asset | 用途 |
|---|---|
| `ST_Source_Fast` | 大量同时声源、背景 source |
| `ST_Source_Balanced` | 普通 gameplay source |
| `ST_Source_Quality` | 主角声源、质量优先 demo |

| 类别 | 项目 | 默认值 | 说明 |
|---|---|---:|---|
| Attenuation | `Preserve Unreal Attenuation` | `false` | 开启后保留 Unreal 距离衰减（通常关闭 — 由 Sound-Tracing SDK 做物理衰减） |
| Attenuation | `Disable Unreal Reverb Sends` | `false` | 阻断 Unreal 混响发送 |
| Emission | `Gain Boost Db` | `0` | 输入电平（±24 dB） |
| Emission | `Direct/Reflection/Diffraction/Reverb Send Db` | `0` | Sound-Tracing SDK path volume |
| Emission | `Directivity` | `0` | 0 全指向 ~ 1 心形 |
| Reverb Rays | `Ray Preset` | `Balanced` | `Fast`（8×4，深度 3）/ `Balanced`（16×8，深度 4 = 引擎默认）/ `Quality`（24×12，深度 6）/ `Custom` |
| Reverb Rays | `Ray Resolution` / `Ray Depth` | `16` / `4` | N×N/2 transport ray，深度。仅 Custom 时可编辑 |
| Reverb Rays | `Transport Refresh Steps` | `0` | 把传输网格分成 n 次传播更新（0 = 引擎默认） |
| Reverb Rays | `Stationary Emitter` | `false` | 不移动的发射器提示 |
| Per-Path Enable | `Direct/Transmission/Reflection/Diffraction/Reverb Path Enabled` | 全部 `true` | 逐声源路径门控 |
| Bypass | `Bypass` | `false` | 不经过 Sound-Tracing SDK 直接通过 |
| EQ | `Source EQ` | 关闭 | 作用于使用此资产的声源信号的参数 EQ — [EQ](#eq) |

## 单次音效

引擎会在 150 ms 内淡入**新声源**的所有路径并等待第一个 IR，因此如果每次播放短音效都新建引擎
声源，声音听起来会又小又迟。插件按模式处理这一问题。

- **Native 模式**：在上下文启动时预先创建引擎声源池，voice 结束后把该声源归还到池中，由距离最近的
  下一个 voice 接手。即使每次都重新播放 Audio Component 和声音，也不会新建引擎声源。
- **FMOD / Wwise 模式**：渲染由中间件插件完成，因此遵循其预热声源池
  — [FMOD](./fmod.md#单次音效与预热声源池) · [Wwise](./wwise.md#单次音效与预热声源池)。像
  **Wwise AudioLink** 这样为每个声音注册新游戏对象的情况也能处理。

## 几何体（`USoundTracingObjectComponent`）

![Object Component](/img/ue/object-component.png)

作为要用作声学 geometry 的 `StaticMeshComponent` 或 `SkinnedMeshComponent` 的**直接 child** 添加。
使用相同网格 asset、LOD 和材质排列的对象共享一个 Sound-Tracing SDK 网格。

| 项目 | 默认值 | 说明 |
|---|---:|---|
| `Acoustic Mobility` | `Auto` | `Auto`（跟随父级 Mobility）/ `Static`（静态加速结构，移动时重建）/ `Movable`（动态实例，每个传播周期应用变换） |
| `Sound Material Slots` | — | 渲染材质槽 → `Sound Material Type`（preset index）。`Auto Set Materials` 按钮按名称和别名自动排列 |
| `Skinned Pose Refresh Seconds` | `0` | 仅蒙皮父级。Sound-Tracing SDK 没有 vertex refit，因此每隔此周期**构建新网格**替换。0 = 保持注册时的姿态 |
| `Auto Register Native Object` / `Sync Transform On Tick` / `Auto Sync Materials` | `true` | 高级 |
| Debug: `Visualize Acoustic Mesh`, `Visualize BVH`（+ `BVH Depth`, `BVH Leaves Only`） | 关闭 | 选中时在编辑器中显示上传的三角形和加速结构节点包围盒 |

专用服务器会跳过注册。在 Blueprint 中可调用 `RegisterNativeObject`、`UnregisterNativeObject`、
`SyncNativeTransform`、`RefreshNativeMesh` 以及材质槽 get/set。

## Material preset

插件 content 中的 `SoundTraceMaterialPresetLibrary` 提供 SoundTrace 游戏材质 22 种 9 频段 preset，
名称、顺序（索引 0 `Concrete` ~ 21 `FiberglassReinforcedPlastic`）和 9 频段数值都与 Unity、Web SDK 相同。
这些是游戏用预设，不是测量数据。
`Sound Material Slots` 根据 render material 名称和 alias 选择最接近的 preset。直接编辑 9 频段
reflection、absorption、transmission、scattering 的工作，请仅限于创建了单独 Material Preset Library
asset 的情况。每个频段必须满足 `R + A + T = 1`（±0.001）。

## Path visualization

![Path Visualizer](/img/ue/path-visualizer.png)

在 Actor 上添加 `SoundTracingPathVisualizerComponent`，即可显示基于 Niagara 的 path segment。
可以调整各路径类型（Direct、Reflection、Diffraction、Reverb、Transmission、GuideRay）的颜色、
最大路径数、线宽和 alpha。它用于调试和演示，在 shipping 性能测量中应禁用。

## 统计（`USoundTracingSubsystem`）

可在 Blueprint 中读取的 World Subsystem — 集成模式、场景网格/对象/声源/三角形数、有效路径数、
各 lane 的传播/IR/渲染时间（ms）、渲染块统计（active sources、exact/send taps）。

用 `SetSoundTracingEnabled(bool)` / `IsSoundTracingEnabled()` 整体开启和关闭 Sound Tracing。关闭期间，
即使听者和声源移动也不会唤醒传播 lane，也不收集可视化路径，因此不会残留最后的路径。
在 FMOD 和 Wwise 模式下会把此开关传给中间件插件
（`SimpleSTFmod_SetSoundTracingEnabled` / `SimpleSTWwise_SetSoundTracingEnabled`）。引擎没有传播暂停，
因此只要还有声源存在，lane 就会按自身周期继续运行。

## 平台链接约定

| UE 平台 | SDK 路径（`Binaries/` 之下） | 链接 |
|---|---|---|
| Win64 | `Win64/<Config>/SimpleSTRealtime.dll` | 运行时 export 绑定 |
| Mac | `Mac/<Config>/libSimpleSTRealtime.dylib` | Universal，运行时绑定 |
| Linux | `Linux/<Config>/libSimpleSTRealtime.so` | x86_64，运行时绑定 |
| Android | `Android/<ABI>/<Config>/libSimpleSTRealtime.so` | 通过 UPL 复制到 APK 各 ABI 文件夹。HRTF 从 UFS 提取 |
| IOS | `IOS/device` 或 `IOS/simulator` 下的 `<Config>/libsimplest_static.a` | 静态链接，直接函数指针绑定 |

仅 UE Debug 使用 SDK Debug，Development/DebugGame/Shipping 使用 Release。缺失时在 UBT 阶段报错。
在中间件插件静态链接的 iOS 和 Web 上，FMOD/Wwise 模式尚不支持（桌面 Win64 已验证，
Mac/Linux 为相同代码路径）。

## 故障排除

| 症状 | 检查项 |
|---|---|
| plugin 不在选择列表中 | plugin enable、module compile、target platform Audio 设置 |
| native library load 失败 | `ThirdParty/SimpleST/Binaries` 中各 target 的 binary、Config（Debug/Release）是否匹配 |
| 集成模式与预期不同 | `.uproject` 中 Wwise/FMODStudio 插件的启用状态、`SOUNDTRACING_UNREAL_INTEGRATION` |
| FMOD/Wwise 模式下声音未空间化 | FMOD Studio / Wwise 项目侧的 Sound-Tracing SDK DSP 配置、运行时 READY 状态（Output Log） |
| source 未空间化（Native） | Audio Component 是否连接了 SoundTracing Source Settings asset |
| geometry 未生效 | Object Component 的 immediate parent 是否为支持的 mesh component、`Acoustic Mobility` |
| 渲染块超时（音频断续） | `Early Reflections = Hybrid`、提高 `Reflection Update Interval`、降低 Quality Preset |
| 短音效偏小或延迟（FMOD/Wwise 模式） | 是否设置了 `SIMPLESTFMOD_WARM_SOURCES=0` |
| 部分声源以 dry 播放（Native） | Output Log 中的 `ST_STATUS_BUDGET_EXCEEDED` — 减少声源或调高 `Max Sources` |
| 开启 EQ 后声音没有变化 | 是否为 Native 模式（FMOD/Wwise 模式使用中间件 EQ），Output Log 中的 EQ 不支持警告 |
| FMOD/Wwise 模式下关闭 Sound Tracing 后没有变化 | 插件是否为导出 `*_SetSoundTracingEnabled` 的版本（没有时 Output Log 中有警告） |
| 看不到 path | visualizer component、Niagara plugin、path enable 状态、Sound Tracing 是否被关闭 |

## EQ

Sound-Tracing SDK 的参数 EQ 可在两个位置应用。

- **声源 EQ** — 在引擎频段拆分之前作用于声源信号本身。该声源的直达声、反射、绕射、混响都会得到相同的音色。
- **输出 EQ** — 在渲染末端（主增益之前）作用于整个 Sound-Tracing SDK 混音。

滤波器类型为 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6 种（切滤波固定为 12 dB/oct），
范围为频率 20 ~ 20,000 Hz，增益 ±24 dB（仅 Peaking·搁架），Q 0.1 ~ 30（搁架最多 3），前级增益 −48 ~ +12 dB。
默认关闭，关闭时不调用引擎，因此输出与没有 EQ 时相同。只发送变化的值，引擎以
20 ms 交叉淡化过渡。

两处都使用同一个结构体 `FSoundTracingEq`（`Enabled`、`Preamp (dB)`、`Bands` 最多 16 个）。

| 位置 | 设置 | 运行时修改 |
|---|---|---|
| 声源 EQ | Source Settings 资产 `Source EQ` | `USoundTracingSourceSettings::SetSourceEq` / `GetSourceEq`（Blueprint） |
| 输出 EQ | Project Settings › SoundTracing › Listener › `Output EQ` | `USoundTracingSubsystem::SetOutputEq` / `ClearOutputEqOverride` / `GetOutputEq` |

- 频段（`FSoundTracingEqBand`）包括 `Enabled`、`Type`、`Frequency Hz`、`Gain (dB)`、`Q`。`Type`（`ESoundTracingEqFilterType`）为
  `Peaking (Bell)` · `Low Shelf` · `High Shelf` · `High Cut (Low-pass)` · `Low Cut (High-pass)` · `Notch`。
- `SetSourceEq` 会立即作用于正在用该资产播放的 voice；从引擎声源池复用的声源在创建时重新应用或清除 EQ。
- `SetOutputEq` 在调用 `ClearOutputEqOverride` 之前覆盖 Project Settings 的值，即使重启运行时也会保留。
  传入关闭的 EQ 会关闭输出 EQ。开启期间取代听者的 9 频段图示 `Output EQ`。
- **仅限 Native 模式**。FMOD/Wwise 模式使用中间件插件的 EQ —
  [FMOD](./fmod.md#eq) · [Wwise](./wwise.md#eq)。

## 后续文档

- [FMOD 插件](./fmod.md) · [Wwise 插件](./wwise.md)
- [Unity SDK](./unity.md) · [Web SDK](./web.md)
