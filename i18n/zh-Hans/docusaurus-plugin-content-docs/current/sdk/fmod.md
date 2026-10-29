---
title: FMOD
description: SimpleSTFmod — 面向 FMOD Studio / FMOD Engine 的 SimpleST DSP 插件的结构、安装、Studio 创作、EQ、单次音效与预热声源池、游戏侧 C API、UE/Unity 集成。
---

# SimpleST FMOD 插件

**SimpleSTFmod** 是在 FMOD Studio / FMOD Engine 中使用 [SimpleST](../core/simplest.md) 的 DSP 插件。
它由两个 DSP — 在创作工具中插到事件上的 **SimpleST Source** 和在主总线上放置一个的
**SimpleST Listener** — 以及供游戏引擎上传几何体的 C API 组成。

| 项目 | 值 |
|---|---|
| 插件版本 | v0.3.0（SimpleST 2.22.0，SDK 发行版 2.22.0-jhj.5 — 4 频段 [EQ](#eq)、听者 roll）。上一版本：v0.3.0（SimpleST 2.18.2）、v0.2.0（SimpleST 2.12.0）。FMOD 看到的 DSP 描述版本为 0.3.0（SDK 2.18.2 早期发行包显示为 0.2.0） |
| FMOD | Studio / Engine 2.03 ~ 2.04（plug-in SDK 110 构建 = 2.00 ~ 2.04，204 构建 = 2.04+） |
| 平台 | Windows x64 · macOS · Linux · Android · iOS（静态）· Web（静态，FMOD HTML5 pthreads） |
| 分发 | `SimpleST-fmod-release.zip`（各平台 `plugins/` + `install.py`，含 FMOD 版 UE 插件和 Unity 包） |
| 商用分发条件 | 需与 FMOD（sales@fmod.com）确认 |

## 结构

![SimpleSTFmod 结构](/img/fmod/structure.png)

```text
[事件主轨道]                                      [主总线]
 SimpleST Source  ──(单声道 PCM, write_stream)──▶  SimpleST Listener ──▶ 立体声(HRTF/声像)
   · 3D Attributes(Studio 自动) → 声源位置          · st_rt_render_process (全部声源渲染 1 次)
   · 输出为静音 (无 Listener 时 dry 直通)            · FMOD 听者 0 → SimpleST 听者
                 └──────────── SystemRuntime (每个 FMOD::System 1 个) ─┘
                               · SimpleST 上下文 + 控制线程
                               · 游戏侧 C API (几何体上传等)
```

- SimpleST 是"N 个声源输入 → 1 路听者混音输出"的结构，因此不是 Steam Audio 式（逐声源输出），
  而是 **Resonance / Meta XR Audio 式**（Source 只推送并输出静音，总线上的 Listener 一次性渲染）。
- 插件**从自己所在文件夹**动态绑定 `SimpleSTRealtime`，游戏侧通过插件导出的
  `SimpleSTFmod_GetRealtimeProc` 获取**同一模块**的 `st_rt_*` — 引擎实例只有一个。
- 渲染器在每个块选出"当前正在运行 process 的 Listener"。Studio 创建的预览用虚拟实例不会抢占
  在线 Listener；如果渲染器停止 250 ms，则由其他 Listener 接管，若没有任何 Listener，
  Source 回到 dry 直通。
- 只为实际有音频输入的 Source 创建引擎声源（保护 64 个并发流）。已结束 voice 的引擎声源会留在
  预热池中供下一个 voice 复用 — [单次音效与预热声源池](#单次音效与预热声源池)。
- **关闭输出限制器**：SimpleST 2.18 在创建后会开启 true-peak 限制器（−1 dBTP，137 采样延迟），
  但在 FMOD 中由主总线负责限幅。
- **同样关闭等响度补偿**：SimpleST 2.21 在创建后会开启输出级等响度补偿（低频搁架约 +7.2 dB @ 120 Hz），
  但音色与电平由 FMOD 混音负责。在创建上下文后以及重新开启 Sound Tracing 时，与限制器一起关闭。
- **听者方向**：把 FMOD 听者的 forward·up 以 SimpleST 四元数传入，从而反映头部倾斜（roll）（自 SDK 发行版
  2.22.0-jhj 起）。

## 安装

### FMOD Studio（创作工具）

![插件安装位置](/img/fmod/studio-plugins-folder.png)

1. **版本匹配**：Studio 2.03.x → SDK 110 构建，Studio 2.04.x → SDK 204 构建。204 插件在
   Studio 2.03 中无法加载。
2. 把发行包 `plugins/` 文件夹的内容（`SimpleSTFmod.dll` · `SimpleSTFmod.plugin.js` · `SimpleSTRealtime.dll` ·
   `Resources/HRTF/`）复制到 **Studio 项目的 `Plugins/`**（利于版本控制）或用户插件文件夹，
   然后重启 Studio。
   - Windows：`%localappdata%/FMOD Studio/Plugins`
   - macOS：`~/Library/Preferences/FMOD Studio/Plugins/SimpleST`（`install.py fmod --payload mac --studio "/Applications/FMOD Studio.app"`）
3. Studio 日志中的 `No FMOD symbols found in dynamic library '.../SimpleSTRealtime.dll'` 是无害的
   （Studio 会把文件夹中的所有 DLL 当作插件候选打开。引擎 DLL 由 SimpleSTFmod 直接加载）。

安装器会检查 manifest 哈希、平台、Studio/SDK 版本，并把现有文件备份到扫描器之外。
没有 HRTF 资源时回退到引擎内置的 MIT KEMAR。

### 游戏运行时

| 平台 | 链接 | 产物 |
|---|---|---|
| win / mac / linux | 动态 | `SimpleSTFmod.{dll,dylib,so}` + 旁边的 `SimpleSTRealtime.*` + `Resources/HRTF` |
| android | 动态 | `<abi>/plugins/libSimpleSTFmod.so` + `libSimpleSTRealtime.so`（应用库文件夹） |
| ios | 静态 | `SimpleSTFmod.xcframework`（包含引擎对象） |
| web | 静态 | `libSimpleSTFmod.a`（包含引擎）— FMOD HTML5 pthreads 构建 + 以 `-pthread` 链接 |

动态平台上，FMOD 加载插件后，插件会在旁边查找引擎。静态平台（iOS/Web）在加载 bank 之前直接注册。

```cpp
studioSystem->registerPlugin(FMOD_SimpleST_Source_GetDSPDescription());
studioSystem->registerPlugin(FMOD_SimpleST_Listener_GetDSPDescription());
```

## 在 FMOD Studio 中使用

![主总线上的 SimpleST Listener](/img/fmod/studio-master-bus-listener.png)

1. 在主总线上添加 **Exarion › SimpleST Listener**（每个项目 1 个。如果同时有 2 个在运行，
   只有一个渲染，其余直通）。
2. 在 3D 事件的主轨道上**删除或 bypass FMOD Spatializer**，并添加 **Exarion › SimpleST Source**
   （不删除会导致双重空间化）。
3. Studio 中没有游戏场景，因此在创作工具中运行时会自动铺设一个 **8 × 3 × 10 m 试听房间**
   （用 `SIMPLESTFMOD_AUDITION_ROOM="W,H,D"` 改变尺寸，`"0"` 则关闭）。在预览中把声源移出房间，
   就能听到墙体遮挡。

![3D 事件上的 SimpleST Source](/img/fmod/studio-event-source.png)

### DSP 参数

![SimpleST Source 面板 UI](/img/fmod/studio-source-params.png)

| DSP | 参数 | 含义 |
|---|---|---|
| SimpleST Source | Gain / Direct / Reflections / Diffraction / Reverb Send (dB) | 输入电平、各路径音量（SimpleST path volume） |
| | Directivity (0 ~ 1) | 0 全指向 ~ 1 心形（以事件 forward 为基准） |
| | Stationary | 不移动的发射器提示（创建时应用） |
| | Bypass | 不经过 SimpleST，dry 直通 |
| | 3D Attributes / Overall Gain / Atten Range | FMOD 特殊 data 参数（自动） |
| SimpleST Listener | Wet Level / Dry Level (dB) | SimpleST 渲染 / 总线上其他音频的电平 |
| | HRTF | 开启为双耳（耳机），关闭为立体声声像 |
| 两者（EQ 块） | EQ / EQ Preamp (dB) | 4 频段 EQ 开关·前级增益 — [EQ](#eq) |
| | EQn Type / EQn Freq (Hz) / EQn Gain (dB) / EQn Q（n = 1 ~ 4） | 各频段的滤波器类型·频率·增益·Q |

将 Listener **bypass** 后，Source 回到 dry 直通（用于 A/B 对比）。DSP 名称和参数名称由 bank
作为标识符保存，因此发布后不要更改。

### EQ

从 SDK 发行版 2.22.0-jhj 起，两个 DSP 都有相同的 4 频段 EQ 参数块，直接使用 SimpleST 参数 EQ。

| DSP | 作用点 |
|---|---|
| SimpleST Source | **声源 EQ** — 作用于进入 SimpleST 的事件信号，位于引擎频段拆分之前。直达声·反射·绕射·混响都得到相同音色 |
| SimpleST Listener | **输出 EQ** — 作用于 SimpleST 混音，位于 Wet Level 之前 |

- `EQ` 为开关，`EQ Preamp` 为频段之前的增益（−48 ~ +12 dB，提升时用负值留出余量）。
- `EQn Type` 为 Off · Peaking · Low Shelf · High Shelf · High Cut（12 dB/oct 低通）· Low Cut（12 dB/oct 高通）· Notch。
- `EQn Freq` 为 20 ~ 20,000 Hz，`EQn Gain` 为 ±24 dB（仅 Peaking·搁架），`EQn Q` 为 0.1 ~ 30（搁架最多 3）。
- 4 个频段足以同时设置低切·低频搁架·高频搁架·高切。`EQn Type` 是整数参数（7 个值名称，
  0 = Off），其余为实数参数。
- 默认关闭，关闭时不调用引擎。只发送变化的值，引擎以 20 ms 交叉淡化过渡。
- 存在多个 Listener 时，使用被选为渲染器的实例的 EQ。从预热池复用的引擎声源会先清除上一个 voice 的 EQ
  或换成新的 EQ，然后再开始。

## 单次音效与预热声源池

每次事件都会来一个新 voice 的短声音。为此，从 0.3.0 起插件会在 voice 之间复用引擎
声源。无需修改 FMOD Studio 事件或 DSP 配置。

- 引擎会在 150 ms 内淡入**新声源**的所有路径并等待第一个 IR。0.2.0 为每个 voice 新建引擎声源，
  导致 25 ms 的短音效听起来小 15 ~ 20 dB 且延迟；而且 voice 一结束就立即删除声源，流环形缓冲中
  剩余的尾部会被截断。
- 0.3.0 会把已结束 voice 已经推入的 PCM **最多再播放 300 ms**，然后停止声源（混响继续），并把这些
  声源**最多 16 个、保留 2 秒**处于预热状态。
- 下一个 voice 挂接到距离最近的预热声源。**在 0.25 m 以内时立即**开始播放，更远时约 25 ms 后
  开始播放。2 秒内未被再次使用的预热声源会被释放。

以下是用核心测试（不使用 FMOD 的同一运行时）测得的相对 0.2.0 的结果。

| 项目 | 0.2.0（每个 voice 新建声源） | 0.3.0（预热池） |
|---|---|---|
| 同一位置 16 个 voice（间隔 120 ms）的引擎声源创建数 | 16 | 4 |
| 同一位置 voice 电平 | 基准 | +15.7 dB（应有音量） |
| 移动 voice 电平 | 基准 | +19.3 dB（应有音量） |
| voice 开始 → 首次出声 | 92 ms | 69 ms |
| 350 ms voice 的可听时长 | 275 ms | 350 ms |

环境变量 `SIMPLESTFMOD_WARM_SOURCES=0` 时，会像以前一样为每个 voice 新建声源（用于对比）。

## 游戏侧 C API

`include/SimpleSTFmod/SimpleSTFmod.h` — 由插件库导出。**在 FMOD 加载的那个模块**上绑定。
所有调用都在游戏线程进行，SimpleST `[control]` 调用必须放在
`SimpleSTFmod_InvokeOnControlThread` 内。

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // 默认。IN_CALLBACK = 在 FMOD 混音器回调内渲染
cfg.sceneRatio = 0.f;                            // 0 = 1.0（FMOD UE/Unity 集成的单位是米）
cfg.maxSources = 0;                              // 0 = 引擎平台默认（桌面 128，Android/iOS 48，Web 32）
SimpleSTFmod_Configure(&cfg);                    // 运行时启动前（第一个 SimpleST DSP 创建前）

SimpleSTFmod_Status st = { sizeof st };
SimpleSTFmod_GetStatus(SIMPLESTFMOD_SYSTEM_LATEST, &st);   // state READY, boundSources, latency, defaultMaterialId

typedef STMeshId (*mesh_create_fn)(STRT_Context*, const STMesh*, STMaterialId, const int32_t*);
mesh_create_fn meshCreate = (mesh_create_fn)SimpleSTFmod_GetRealtimeProc("st_rt_mesh_create");

SimpleSTFmod_InvokeOnControlThread(SIMPLESTFMOD_SYSTEM_LATEST,
    [](STRT_Context* ctx, void* user) {
        /* st_rt_mesh_create / st_rt_object_create_q / st_rt_build ... */
    }, user, /*wait=*/1);
```

- 系统索引 = `FMOD_DSP_STATE::systemobject`（进程中最先创建的 FMOD::System 为 0）。
  编辑器集成会创建多个 System，因此 `SIMPLESTFMOD_SYSTEM_LATEST(-1)` = 最新的运行时。
- FMOD 与 SimpleST 的坐标系相同（左手系，+Y up，+Z forward）。FMOD UE 集成的 `(UE.Y, UE.Z, UE.X)/100`
  转换与 SoundTracing UE 插件的转换一致。
- 插件上下文中已预先注册默认材质库。请从 `defaultMaterialId` 开始加上 preset index 使用。
- **声源上限**（自 SDK 发行版 2.18.2 起）：`SimpleSTFmod_Config.maxSources` 是引擎声源数上限（0 = 平台
  默认）。超出时引擎拒绝创建声源，该 voice 以 dry 播放。这是追加在结构体末尾的字段，因此传入旧版较短
  结构体的主机也能正常工作 — [声源内存预算](../core/simplest.md#声源内存预算)。

### 开启和关闭 Sound Tracing

```c
SimpleSTFmod_SetSoundTracingEnabled(SIMPLESTFMOD_SYSTEM_LATEST, 0);   // 关闭。1 = 开启（默认）
```

这是 SDK 发行版 2.18.2 中新增的游戏侧 A/B 开关。它作用于一个运行时（`systemIndex < 0` = 最新的运行时），
并在控制线程上异步生效。

- **关闭时**，会启用 SimpleST 渲染器旁路（`st_rt_render_set_sound_tracing_enabled`），清空预热声源池后不再
  重新填充，插件也不会唤醒传播 lane。
- **传播 lane 不会完全停止。** SimpleST 没有传播暂停，因此只要还有声源存在，lane 就会按自身周期
  继续运行。
- **开启时**，会重新应用插件的渲染选项。
- 成功入队时返回 1，没有运行时时返回 0。之后启动的运行时以开启状态启动。
- 这是可选 export，游戏 API 版本仍为 1。请先查找该 export，不存在时跳过。

UE SoundTracing 的 `SetSoundTracingEnabled` 在 FMOD 模式下会调用此函数 — [Unreal Engine SDK](./ue.md)。

## UE · Unity 集成

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

- **Unreal Engine**：把发行包中的 `Unreal/SoundTracing`（FMOD 版）放入项目的 `Plugins/` 并构建，
  构建会把插件、引擎、HRTF 放入 `Plugins/FMODStudio/Binaries/<Plat>/`，并在 `DefaultEngine.ini` 中加入
  `+PluginFiles=SimpleSTFmod`。
  SoundTracing 插件以 FMOD 模式构建，只上传几何体 — 参见 [Unreal Engine SDK](./ue.md)。
  UE 5.7 + FMOD for Unreal 2.04 试听验证（2026-10-15）。
- **Unity**：拖放 FMOD 版包（`SoundTrace-SimpleST-FMOD-release.unitypackage`）后，编辑器加载时
  SoundTrace 会把 DLL/bundle 复制到 FMOD 插件文件夹并注册到 Dynamic Plugins — 参见
  [Unity SDK](./unity.md#与-fmod-配合使用)。Unity 6000.3 + FMOD for Unity 2.04 E2E 通过。

![导入 FMOD 版包](/img/fmod/unity-fmod-edition-import.png)

## 验证结果（2026-10-01 · FMOD 2.04.00）

| 测试 | 内容 | 结果 |
|---|---|---|
| `core_smoke` | 不使用 FMOD，仅运行时：48 kHz/1024 块，右侧 80° 噪声，上传房间 → 混响，渲染器选举/接管规则 | PASS — ILD +14.6 dB |
| `fmod_host_smoke` | FMOD Core 主机 `loadPlugin` → Source/Listener → WAV，通过游戏 API 上传房间 | PASS |
| `studio_project` | FMOD Studio（fmodstudiocl）识别两个 DSP、加载参数、构建 bank | PASS |
| `studio_smoke` | 在 Studio API 运行时中 3D 播放该 bank，从右向左移动 | PASS — ILD +14.97 → −14.80 dB |

渲染延迟（BUFFERED，48 kHz）：约 1,790 帧（≈37 ms）。FMOD Studio GUI 实时试听于 2026-10-15
手动验证。

## 已知限制

- 1 个听者，64 个并发流（超出部分 dry），仅立体声输出（未暴露扬声器布局）。
- EQ 每个 DSP 固定为 4 频段（UE、Unity、Web 最多 16 频段）。
- 引擎声源数不会超过平台上限（`maxSources`）。超出的 voice 为 dry。
- Source 之后的事件效果器/发送只收到静音（SimpleST 混音在 Listener 总线上输出）。
- `Overall Gain`（用于虚拟化的可听度）是基于距离的估计值。
- FMOD Studio 可能创建多个 System，每个 System 会生成一个 SimpleST 上下文。
- SDK 110 发行构建必须用官方 FMOD 2.03 SDK 重新构建（FMOD EULA 禁止再分发 SDK）。

## 日志 / 环境变量

| 变量 | 含义 |
|---|---|
| `SIMPLESTFMOD_LOG_FILE` | 日志文件路径 |
| `SIMPLESTFMOD_LOG_STDERR` | stderr 日志 |
| `SIMPLESTFMOD_RUNTIME_LIBRARY` | 强制指定 SimpleSTRealtime 路径 |
| `SIMPLESTFMOD_AUDITION_ROOM` | `"W,H,D"` 试听房间（m），`"0"` 关闭 |
| `SIMPLESTFMOD_WARM_SOURCES` | 为 `"0"` 时关闭预热声源池，每个 voice 新建引擎声源（用于对比） |

在 Windows 上始终也会通过 `OutputDebugString` 输出。渲染器状态每次变化时，控制线程都会记录
`SimpleST Listener rendering` / `no SimpleST Listener rendering`。

## 后续文档

- [Wwise 插件](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
