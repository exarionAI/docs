---
title: Wwise
description: Sound-tracing（SimpleSTWwise）— 面向 Wwise 2025.1 的 SimpleST Object Processor + Metadata 插件的结构、安装、创作、单次音效与预热声源池、游戏侧 C API、UE/Unity 集成。
---

# Sound-tracing Wwise 插件

**Sound-tracing**（源码和二进制名称为 `SimpleSTWwise`）是在 Wwise 2025.1 中使用
[SimpleST](../core/simplest.md) 的插件。它由两个插件 — 插到 Audio Objects 总线上的
**Sound-tracing Renderer**（Object Processor）和附加到 sound/actor-mixer 上的
**Sound-tracing Source Settings**（Metadata）— 以及供游戏引擎上传几何体的 C API 组成。

| 项目 | 值 |
|---|---|
| 插件版本 | v0.2.0（SimpleST 2.18.2）。上一版本：v0.1.0（SimpleST 2.12.0，Wwise 2025.1.11 声音引擎 E2E 已验证） |
| Audiokinetic | CompanyID **325**，PluginID 1001（Renderer）· 1002（Source Settings）。Launcher 包名 `Sound-tracing` |
| Wwise | 2025.1（插件二进制与 SDK 版本绑定） |
| 平台 | Windows（vc170）· macOS · Linux · Android · iOS（静态）· Web（静态） |
| 分发 | `SimpleST-wwise-release.zip`（各平台 SDK + Authoring + Launcher 包 + `install.py`，含 UE/Unity 胶水代码） |
| 合作伙伴审批 | Community Partner Program 第一阶段已批准（2026-10-08）。最终审批进行中 |

## 结构

![SimpleSTWwise 结构](/img/wwise/structure.png)

```text
 3D 声音 ──(Listener Relative Routing)──▶ [SimpleST 总线: Bus Configuration = Audio Objects]
   + Sound-tracing Source Settings (元数据, 可选)           Sound-tracing Renderer (Object Processor)
                                                        · 每个对象: 单声道下混 → st_rt_source_write_stream
                                                          位置 = 相对总线听者的坐标 → 反变换为世界坐标
                                                        · st_rt_render_process 1 次 → 1 个立体声输出对象
                                                        · SimpleST 不接收的对象(2D / Bypass / 超过 64 个)
                                                          由渲染器用 Wwise 声像直接混合 ("Dry Level")
                                   SystemRuntime (每个进程 1 个 = 1 个 Wwise 声音引擎)
```

- **为什么是 Object Processor**：它在一个回调中接收总线上所有带位置元数据的音频对象，
  因此 push 和 render 发生在同一个 `Execute` 内。与 FMOD 版（Source push + Listener pull）不同，
  没有块顺序偏差，voice 也不需要输出静音，所以 Wwise 的计量/虚拟化照常工作。也不替换系统 Audio Device。
- **坐标**：Wwise 给出的对象位置是相对总线听者平移和旋转后的。渲染器用总线游戏对象（= 听者）的
  世界姿态把它还原回去。Wwise 和 SimpleST 都是左手系、+X right、+Y up、+Z forward，
  因此没有坐标轴转换（只有 Unreal 集成例外 — 见下文）。
- **voice 与引擎声源**：每个音频对象（voice）使用一个 SimpleST 声源，但已结束 voice 的引擎声源会
  留在预热池中，由下一个 voice 接手 — [单次音效与预热声源池](#单次音效与预热声源池)。
- **共享核心**：与 FMOD 插件共享同一运行时层，从自己所在文件夹动态绑定 `SimpleSTRealtime`，
  游戏侧通过 `SimpleSTWwise_GetRealtimeProc` 获取同一模块的 `st_rt_*`。
- **关闭输出限制器**：SimpleST 2.18 在创建后会开启 true-peak 限制器，但在 Wwise 中由主总线
  负责限幅。
- **生命周期**：运行时在声音引擎 Init 钩子（静态注册）或第一个渲染器实例创建时启动，
  在 `AK::SoundEngine::Term` 的全局回调中终止。

## 安装

### Authoring（创作工具）

![Launcher 包安装](/img/wwise/launcher-bundle.png)

- **Windows**：用 Audiokinetic Launcher 的 **Add from directory** 安装发行包 `packages/` 中的 Launcher 包
  （`bundle.json` + `*.tar.xz`），或把发行文件夹直接覆盖到 Wwise 安装文件夹（`SDK/…`、`Authoring/…`）。
  Authoring 插件为 `Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + 引擎 + HRTF。
- **macOS**：Wwise Authoring 在 Mac 上也使用 **Windows DLL**。安装位置为
  `/Library/Application Support/Audiokinetic/Wwise <version>/Authoring/x64/Release/bin/Plugins`，
  用 `python3 install.py wwise --payload win --wwise-root "/Applications/Audiokinetic/Wwise_2025.1.11.9262"`
  安装。现有文件保留在 `bin/.simplest-backups` 中。

### 游戏运行时（SoundEngine）

| 平台 | 产物 |
|---|---|
| Windows | `SDK/x64_vc170/<Config>/bin/SimpleSTWwise.dll`（+ `SimpleSTRealtime.dll`、`Resources/HRTF`），`lib/SimpleSTWwiseFX.lib`，`include/AK/Plugin/SimpleSTWwiseFXFactory.h` |
| macOS / Linux / Android | `libSimpleSTWwise.{dylib,so}` + 同一构建的 `SimpleSTRealtime`（Android 按 ABI） |
| iOS / Web | 包含引擎对象的 `libSimpleSTWwiseFX.a` — 在应用中包含 `AK/Plugin/SimpleSTWwiseFXFactory.h` 注册两个插件 |

Debug 插件放到 Debug 配置，Release 插件放到 Profile/Release 配置。静态链接平台上，
`SimpleSTWwiseFX` 一个库包含两个插件（如果 bank 的 `PluginInfo.json` 把元数据插件的 lib 名推断为
`SimpleSTWwiseMeta`，可能需要别名）。

## 在 Wwise 中使用

![Audio Objects 总线](/img/wwise/bus-audio-objects.png)

1. 创建一个总线（例如 `SimpleST`），设置 **Bus Configuration = Audio Objects**。
2. 在该总线的 Effects 中插入 **Sound-tracing Renderer**。总线输出变为一路立体声
   （开启 HRTF 时为双耳 — 耳机）。
3. 把 3D 声音路由到该总线：在 Positioning 中设置 **3D Spatialization = Position（或 + Orientation）**，
   开启 Listener Relative Routing。**距离衰减（Attenuation）关闭或设为平坦** — SimpleST 自己做物理
   距离衰减，不关闭会导致双重衰减（对象缓冲中已经乘上了 Wwise 的音量/衰减）。
4. 如需逐声源调整，在 sound/actor-mixer/总线上添加 **Metadata › Sound-tracing Source Settings**。
5. 创作工具中没有游戏场景，因此在 `Wwise.exe` / `WwiseConsole.exe` 中会自动铺设一个
   **8 × 3 × 10 m 试听房间**（`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`，`"0"` 则关闭）。

![Positioning 设置](/img/wwise/positioning-attenuation.png)

### 属性

![Sound-tracing Renderer 属性](/img/wwise/renderer-properties.png)

| 插件 | 属性 | 含义 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | SimpleST 渲染 / 渲染器直接声像处理的对象的电平 |
| | HRTF (Binaural) | 开启为双耳，关闭为立体声声像 |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 输入电平、各路径音量（SimpleST path volume） |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | 以对象 front 为基准的指向性 |
| | Stationary (never moves) | 不移动的发射器提示（创建时应用） |
| | Bypass SimpleST (RTPC) | 不经过 SimpleST，由渲染器用 Wwise 声像混合 |

![Source Settings 元数据](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID、属性名称、AudioEnginePropertyID 由项目和 bank 保存，因此发布后不要更改。

## 单次音效与预热声源池

从 0.2.0 起加入了与 FMOD 插件 0.3.0 相同的预热声源池（共用核心）。即使每个声音
都来一个新 voice，也不会为每个 voice 新建引擎声源，因此省去了新声源 150 ms 的路径淡入和等待第一个
IR 的过程，短音效能以应有音量准时听到。无需修改 Wwise 项目配置。

- 把已结束 voice 已经传入的 PCM 最多再播放 300 ms，然后停止声源（混响继续），最多 16 个声源
  保持预热状态 2 秒。
- 下一个 voice 挂接到距离最近的预热声源。在 0.25 m 以内时立即播放，更远时约 25 ms 后播放。
- 像 Unreal 的 **Wwise AudioLink** 这样为每个声音注册新游戏对象的集成，也通过这一路径处理。

测量值（同一位置 16 个 voice 的引擎声源创建数 16 → 4、电平 +15.7 dB、移动时 +19.3 dB 等）见
[FMOD 插件](./fmod.md#单次音效与预热声源池)。环境变量 `SIMPLESTFMOD_WARM_SOURCES=0`（由于是共用核心，
Wwise 版也使用同一名称）时，会像以前一样为每个 voice 新建声源（用于对比）。

## 游戏侧 C API

`include/SimpleSTWwise/SimpleSTWwise.h` — 由 SoundEngine 库导出。**在 Wwise 加载的那个模块**上绑定
（Unreal：`FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`，静态平台直接调用）。
与 FMOD 版约定相同，但没有系统索引（每个进程一个声音引擎）。

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal（cm）。Unity 为 0（=1.0，m）
cfg.maxSources = 0;                              // 0 = 引擎平台默认（桌面 128，Android/iOS 48，Web 32）
SimpleSTWwise_Configure(&cfg);                   // AK::SoundEngine::Init 之前
SimpleSTWwise_SetWorldAxes(SIMPLESTWWISE_AXES_UNREAL);   // 仅 Unreal。Unity 使用默认（WWISE）

SimpleSTWwise_Status st = { sizeof st };
SimpleSTWwise_GetStatus(&st);                    // 变为 READY 后上传几何体
void* p = SimpleSTWwise_GetRealtimeProc("st_rt_mesh_create");
SimpleSTWwise_InvokeOnControlThread(
    [](STRT_Context* ctx, void* user) { /* st_rt_mesh_create / object_create / build ... */ }, user, 1);
```

- 运行时启动：静态注册时在 `SoundEngine::Init` 内，DLL 注册时在第一个 SimpleST 总线开始播放时。
  在此之前 `GetStatus` 返回 0。
- **Unreal 坐标轴**：Wwise for Unreal 2024.1+ 会原样传递 Unreal 向量（+Z 向上），因此必须调用
  `SetWorldAxes(UNREAL)`，渲染器才会转换为 (Y, Z, X)，与游戏上传的几何体一致。不调用的话，
  听者和声源会被错误的墙体遮挡（2026-10-15 修复）。
- **声源上限**（SDK 发行版 2.18.2-jhj.4）：`SimpleSTWwise_Config.maxSources` 是引擎声源数上限（0 = 平台
  默认）。超出时引擎拒绝创建声源，该 voice 以 dry 播放。这是追加在结构体末尾的字段，因此传入旧版较短
  结构体的主机也能正常工作 — [声源内存预算](../core/simplest.md#声源内存预算)。

### 开启和关闭 Sound Tracing

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // 关闭。1 = 开启（默认）
```

这是 SDK 发行版 2.18.2-jhj.4 中新增的游戏侧 A/B 开关。它作用于正在运行的运行时，并在控制线程上
异步生效。行为与 [FMOD 版](./fmod.md#开启和关闭-sound-tracing)相同。

- **关闭时**，会启用 SimpleST 渲染器旁路（`st_rt_render_set_sound_tracing_enabled`），清空预热声源池后不再
  重新填充，插件也不会唤醒传播 lane。
- **传播 lane 不会完全停止。** SimpleST 没有传播暂停，因此只要还有声源存在，lane 就会按自身周期
  继续运行。
- **开启时**，会重新应用插件的渲染选项。
- 成功入队时返回 1，没有正在运行的运行时时返回 0。之后启动的运行时以开启状态启动，因此请在运行时
  就绪后重新发送状态。
- 这是可选 export，游戏 API 版本仍为 1。请先查找该 export，不存在时跳过。

UE SoundTracing 的 `SetSoundTracingEnabled` 在 Wwise 模式下会调用此函数 — [Unreal Engine SDK](./ue.md)。

## UE · Unity 集成

- **Unreal Engine**：`install.py /path/to/Game.uproject --wwise <wwise/SDK>` 把 `SimpleSTWwise`、
  `SimpleSTRealtime`、HRTF 放入 `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin`。SoundTracing 插件
  以 Wwise 模式构建，设置 `sceneRatio = 0.01` 和 Unreal 坐标轴，只上传几何体 — 参见
  [Unreal Engine SDK](./ue.md)。E2E PASS（2026-10-07：对象 6 / 三角形 288 / 路径 1 → 346 → 1）。
- **Unity**：**SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** 菜单把插件复制到 Wwise Unity
  集成的 DSP 文件夹。引擎共享 SoundTrace 的 `SimpleSTRealtime`，单位为米 — 参见
  [Unity SDK](./unity.md#与-wwise-配合使用)。

![UE Wwise 安装结果](/img/wwise/ue-install.png)

## 验证结果（2026-10-01 · Wwise 2025.1.11.9262）

用 WwiseConsole 创建项目 → 用 WAAPI 配置总线、效果器、元数据、事件 → 生成 bank → 实际的
`AkSoundEngine`（Profile）通过 `RegisterPluginDLL("SimpleSTWwise")` 加载发行用 DLL 进行离线渲染。

| 阶段 | 内容 | 结果 |
|---|---|---|
| 创作工具 | WwiseConsole 识别两个插件，参数写入 bank | PASS |
| A | 噪声，发射器右侧 80°，自由声场 | PASS — ILD +14.64 dB |
| B | Source Settings Bypass → 渲染器用 Wwise 声像混合 | PASS |
| C | 听者移动到 (10,0,5) + 旋转 180°，发射器右侧 80° | PASS — 相对→世界转换正确 |
| D | 通过游戏 API 上传房间后播放 1.5 s 音调 | PASS — 混响尾音 |
| 终止 | `AK::SoundEngine::Term` 回调终止运行时 | PASS |

渲染延迟（BUFFERED，48 kHz，512 帧缓冲）：约 2,100 帧（≈44 ms）。Mac/Linux 已通过实际 Wwise 注册，
Android 两个 ABI 构建通过，iOS device/simulator 和 Web 最终链接通过（2026-10-06）。

## 已知限制

- 1 个听者（SimpleST 的限制）。如果同一总线为第二个听者再次实例化，该实例会把所有对象用
  Wwise 声像混合。
- 音频对象没有速度，因此没有 SimpleST Doppler。
- 引擎声源数不会超过平台上限（`maxSources`）。超出的 voice 为 dry。
- 首次看到新音频对象时，会在音频线程上分配一个小槽位。引擎声源本身在控制线程上复用预热池中的
  声源或新建。
- Launcher 包目前只包含 Authoring + Windows_vc170。Mac、Linux、Android、iOS 包以及 EULA 和 logo 正在准备中。
- Wwise 创作工具 GUI 手动试听尚未记录。

## 日志 / 环境变量

| 变量 | 含义 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | 日志文件路径 |
| `SIMPLESTWWISE_LOG_STDERR` | stderr 日志 |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | 强制指定 SimpleSTRealtime 路径 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` 试听房间（m），`"0"` 关闭 |
| `SIMPLESTFMOD_WARM_SOURCES` | 为 `"0"` 时关闭预热声源池，每个 voice 新建引擎声源（用于对比，共用核心变量） |

渲染器警告也会显示在 Wwise Capture Log 中（`PostMonitorMessage`）。

## 后续文档

- [FMOD 插件](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
