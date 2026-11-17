---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — 全平台共用核心的二进制文件、头文件、最小使用流程、函数族与线程规则。
---

# Sound-Tracing SDK (C/C++)

所有平台使用同一个核心。Unity · Unreal Engine · FMOD · Wwise · Web SDK 是按各平台方式封装该二进制文件的
包装层；在原生 C/C++ 中，只需包含头文件并链接对应平台的二进制文件即可。

## 分发内容

| 平台 | 二进制文件 (`Binaries/`) | 链接 |
|---|---|---|
| Windows x64 | `Win64/Release/SoundTracingRealtime.dll` + `.lib` | 动态 |
| macOS (Universal) | `Mac/Release/libSoundTracingRealtime.dylib` | 动态 |
| Linux x86_64 | `Linux/Release/libSoundTracingRealtime.so` | 动态 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSoundTracingRealtime.so` | 动态 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsoundtracing_static.a` | 静态 |
| Web | `Web/Release/SoundTracingRealtime.mjs` + `.wasm` (pthreads) | WASM 模块 (需要 COOP/COEP) |

用于离线 IR 计算的 `SoundTracingOffline`（同一文件夹，`st_off_*`）也一并包含。头文件在所有平台通用。

```text
SoundTracing/
├─ Include/SoundTracing/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| 头文件 | 上下文 | 函数前缀 | 作用 |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | 实时传播 + 音频渲染 |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | 离线 IR 计算与渲染 |
| `STTypes.h` | — | `ST_*` | 公共 POD 与 enum |

实体 id 是按类型区分的句柄（`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`，均为
`struct { int32_t v; }`），**失败即 `v < 0`**。坐标系为左手系 `+Y` up · `+Z` forward，单位为米
（通过 `STRT_CreateOptions.sceneRatio` 指定 cm = `0.01`），听者角度为弧度。

## 最小使用流程

```c
#include <SoundTracing/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 由宿主音频回调拉取块
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// 若宿主混音负责音色与电平，则在创建后立即关闭（所有官方包装层均关闭）
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 材质 — 注册默认库后返回第一个材质的句柄
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. 网格 + 对象 (xyz interleaved，索引三角形)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = 整个网格使用同一材质
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 声源与听者
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW，包含 roll

// 4. 宿主 PCM 输入流 (单声道)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 构建 + 开始渲染 + 显式设置输出级
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid 早期反射 (实时推荐)
ro.useLimiter = 0;               // 若宿主主链负责限幅则关闭
st_rt_render_set_options(ctx, &ro);

// 6. 游戏循环 (控制线程)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // 唤醒工作线程并立即返回

// 7. 音频回调 (宿主音频线程)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## API 参考

按类别整理了实时 DLL（`st_rt_*`，`STRealtime.h`）与离线 DLL（`st_off_*`，`STOffline.h`）的全部导出函数。展开类别和函数即可查看签名、用途、调用时机与线程、参数和返回值。线程标签的含义见 [线程模型](#线程模型)；调用失败的原因通过 `st_rt_get_last_status` / `st_rt_get_last_error`（离线为 `st_off_*`）读取。

<details>
<summary><strong>上下文 · 运行时 — 创建、版本·capability、状态、idle/run、线程属性·清单、内存预算、计时</strong> — 24 个</summary>

<details>
<summary><code>st_rt_get_api_version</code> — 返回此库的 ABI 版本号</summary>

```c
uint32_t st_rt_get_api_version(void);
```

**用途** — 用于判断已加载的 `SoundTracingRealtime` 库与宿主编译时所用头文件是否为同一 ABI 的基准值。兼容性以此值判断，而不是版本字符串。

**调用方式** — 在加载库之后、创建上下文之前调用。将返回值与头文件中的 `ST_ABI_VERSION` 比较，不同则不使用该库。所有带版本戳的结构体的 `apiVersion` 字段也填入相同的值（`ST_ABI_VERSION`）。线程：`[any]` — 编译期常量，可在任意线程调用且不阻塞。

| 参数 | 说明 |
|---|---|
| (无) | |

**返回值** — 库的 ABI 版本（`ST_ABI_VERSION`，当前为 `6`）。不会失败。

</details>

<details>
<summary><code>st_rt_get_version_string</code> — 返回产品发布版本字符串</summary>

```c
const char* st_rt_get_version_string(void);
```

**用途** — 供日志、诊断界面显示的人类可读发布版本。与离线库的 `st_off_get_version_string` 形式相同。

**调用方式** — 可随时调用。不要用于 ABI 兼容性判断，应使用 `st_rt_get_api_version`。线程：`[any]` — 可在任意线程无阻塞调用。

| 参数 | 说明 |
|---|---|
| (无) | |

**返回值** — 库内部的静态 NUL 结尾字符串。调用方不得释放。

</details>

<details>
<summary><code>st_rt_get_capabilities</code> — 返回能力字 0（<code>ST_CAP_*</code>）</summary>

```c
uint64_t st_rt_get_capabilities(void);
```

**用途** — 以位的形式告知此库支持哪些功能面。宿主在使用可选功能（宿主 pull 渲染、线程属性、IR 统计等）之前检查相应的 `ST_CAP_*` 位，按功能有无分支。

**调用方式** — 无需上下文，可随时调用。与 `st_rt_get_capability_word(0)` 的值相同。字 0 的位只对应 `ST_CAP_*` 名称，`ST_CAP1_*` 位必须通过 `st_rt_get_capability_word(1)` 检查（相同位号在不同字中含义不同）。以下位是旧能力的空缺位，永远不会被置位：`ST_CAP_RETIRED_MASK`（8·9·10·13·18·20·21·25）。线程：`[any]` — 编译期常量。

| 参数 | 说明 |
|---|---|
| (无) | |

**返回值** — 能力字 0 的 64 位掩码。若位 63 `ST_CAP_CAPABILITY_WORDS` 被置位，则可通过 `st_rt_get_capability_word` 读取字 1 及以上。

</details>

<details>
<summary><code>st_rt_get_capability_word</code> — 返回指定编号的能力字</summary>

```c
uint64_t st_rt_get_capability_word(uint32_t word);
```

**用途** — 由于字 0 的 64 位已全部用完，新能力从字 1 起以 `ST_CAP<n>_*` 名称添加。通过此函数指定字编号读取。

**调用方式** — 无需上下文，可随时调用。先确认 `st_rt_get_capabilities()` 中是否有 `ST_CAP_CAPABILITY_WORDS`（位 63）。例如引擎休眠（`st_rt_idle`/`st_rt_run`）用 `st_rt_get_capability_word(1) & ST_CAP1_ENGINE_IDLE` 检查，声源内存预算用 `ST_CAP1_MEMORY_BUDGET`（字 1 的位 63）检查。不要将不同字的位混在一起做 AND。线程：`[any]` — 编译期常量。

| 参数 | 说明 |
|---|---|
| `word` | 字编号。`0` = 与 `st_rt_get_capabilities()` 相同的值（`ST_CAP_*`），`1` = `ST_CAP1_*`。头文件已知的字数为 `ST_CAPABILITY_WORD_COUNT`（当前为 `2`） |

**返回值** — 该字的 64 位掩码。未知的字（`word ≥ ST_CAPABILITY_WORD_COUNT`）返回 `0`（= 无该能力）。

</details>

<details>
<summary><code>st_rt_get_sample_rate</code> — 返回引擎内部采样率</summary>

```c
int st_rt_get_sample_rate(void);
```

**用途** — 告知引擎内部使用的固定采样率。若宿主音频以其他采样率运行，则通过 `STRT_CreateOptions.hostSampleRate` 让引擎在边界处转换。

**调用方式** — 可随时调用。线程：`[any]` — 编译期常量。

| 参数 | 说明 |
|---|---|
| (无) | |

**返回值** — `44100`（Hz，固定）。

</details>

<details>
<summary><code>st_rt_set_thread_attributes</code> — 按引擎线程类型指定优先级、核心偏好与 affinity</summary>

```c
int st_rt_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**用途** — 游戏、中间件宿主按自身线程布局策略，按类型指定引擎所创建线程的优先级、核心偏好与 affinity（与 FMOD `Thread_SetAttributes` 作用相同）。这是与上下文无关的 **进程全局** 表，Realtime 库与 Offline 库各自拥有自己的表 — 同时使用两个库时，需要在 `st_rt_` 与 `st_off_` 两侧指定相同的值。

**调用方式** — 约定 **在 `st_rt_create` 之前** 调用。对已启动的线程不追溯，从之后产生的线程（下一次 `st_rt_create`、下一次 `st_rt_render_start`、下一次附加文件输入）开始生效。有实际 OS 线程的类型只有 `ST_THREAD_COMPUTE_POOL`（计算池）· `ST_THREAD_AUDIO_RENDER`（渲染线程）· `ST_THREAD_FILE_DECODER`（文件解码器）三种，其余值是运行在共享计算池上的逻辑角色，只会被保存而不会应用到物理线程 — 计算任务的策略通过 `ST_THREAD_COMPUTE_POOL` 指定。`ST_THREAD_PRIORITY_DEFAULT` 直接使用平台默认表，因此即使只指定 affinity 或核心偏好，音频渲染线程的默认优先级提升也会保留。若给出显式优先级，则改为应用该值。线程：`[any]` — 用一个短互斥锁更新进程全局表。

| 参数 | 说明 |
|---|---|
| `threadType` | `STThreadType` 值 `0`~`10`（见下表）。超出范围则返回 `0` |
| `attributes` | 请求值。调用方填写 `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION`。为 `NULL` 时将该类型恢复为默认值（重置） |

**结构体** `STThreadAttributes`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `priority` | `STThreadPriority`（见下表）。默认 `ST_THREAD_PRIORITY_DEFAULT`(0) |
| `flags` | `ST_THREAD_FLAG_*` 组合。默认 `0` |
| `affinityMask` | 逻辑处理器位掩码，`0` = 不指定。**仅 Windows 遵守**。若不是进程掩码的子集则会被内核拒绝。在超过 64 个逻辑处理器的机器上，仅在当前处理器组内解释 |
| `reserved[4]` | 必须全部为 `0` |

所有字段均为 `0`（DEFAULT · flags 0 · affinity 0）时等同于“不指定”。

**枚举** `STThreadType`

| 值 | 名称 | 含义 |
|---|---|---|
| `0` | `ST_THREAD_LANE_DIRECT` | 逻辑角色：direct 传播任务（无专用线程） |
| `1` | `ST_THREAD_LANE_GUIDE` | 逻辑角色：guide 任务 |
| `2` | `ST_THREAD_LANE_REFLECTION_DIFFRACTION` | 逻辑角色：反射/衍射任务 |
| `3` | `ST_THREAD_LANE_REVERB` | 逻辑角色：混响任务 |
| `4` | `ST_THREAD_COMPUTE_POOL` | 实际线程：计算池工作线程。PIPELINED 为 `max(3,N)−1` 个（含 Direct 专用 1 个），SYNCHRONOUS 在 `N>1` 时为 `N` 个 |
| `5` | `ST_THREAD_AUDIO_RENDER` | 实际线程：`st_rt_render_start` 开启的渲染线程（`HOST_PULL` 模式下没有） |
| `6` | `ST_THREAD_FILE_DECODER` | 实际线程：文件解码器，每个引擎最多 1 个 |
| `7` | `ST_THREAD_ACCEL_BUILD` | 保留值。加速结构构建在调用线程上执行，没有单独的工作线程 |
| `8` | `ST_THREAD_IR_CONVERTER` | 逻辑角色：IR 转换任务 |
| `9` | `ST_THREAD_AU_PREPARE` | 逻辑角色：IR 准备任务 |
| `10` | `ST_THREAD_SCENE_INPUT` | 逻辑角色：场景输入任务 |
| `11` | `ST_THREAD_TYPE_COUNT` | 类型数量（不作为参数使用） |

**枚举** `STThreadPriority`

| 值 | 名称 | Windows | macOS QoS |
|---|---|---|---|
| `0` | `ST_THREAD_PRIORITY_DEFAULT` | 沿用平台默认表 | 沿用平台默认表 |
| `1` | `ST_THREAD_PRIORITY_LOW` | LOWEST | BACKGROUND |
| `2` | `ST_THREAD_PRIORITY_BELOW_NORMAL` | BELOW_NORMAL | UTILITY |
| `3` | `ST_THREAD_PRIORITY_NORMAL` | NORMAL | USER_INITIATED |
| `4` | `ST_THREAD_PRIORITY_ABOVE_NORMAL` | ABOVE_NORMAL | USER_INTERACTIVE |
| `5` | `ST_THREAD_PRIORITY_HIGH` | HIGHEST | USER_INTERACTIVE |
| `6` | `ST_THREAD_PRIORITY_TIME_CRITICAL` | TIME_CRITICAL | USER_INTERACTIVE |

**标志** `ST_THREAD_FLAG_*`

| 标志 | 含义 |
|---|---|
| `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` (`1u << 0`) | 偏好性能核心 |
| `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES` (`1u << 1`) | 偏好能效核心 |

核心偏好通过 Windows 11 EcoQoS 应用，在 macOS 上被忽略（由 QoS 类决定集群布局）。两个标志同时开启时会被拒绝。

**返回值** — `1` = 成功 / `0` = 失败（`threadType` 超出范围、`structSize`/`apiVersion` 不一致、`priority` 超出范围、核心偏好标志冲突、`reserved[]` 不为 0）。失败时表不变。由于不接收上下文，`st_rt_get_last_status` 中不会留下任何记录。

</details>

<details>
<summary><code>st_rt_get_thread_attributes</code> — 读取按线程类型保存的属性请求值</summary>

```c
int st_rt_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**用途** — 确认通过 `st_rt_set_thread_attributes` 保存的值。返回的不是实际应用到 OS 的值，而是 **原样的请求值**。

**调用方式** — 可随时调用。从未指定过的类型返回默认值（priority `DEFAULT` · flags `0` · affinityMask `0`）。线程：`[any]` — 用一个短互斥锁读取进程全局表。

| 参数 | 说明 |
|---|---|
| `threadType` | `STThreadType` 值 `0`~`10`。超出范围则返回 `0` |
| `outAttributes` | 输出。调用方填写 `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION`。成功时填入 `priority`·`flags`·`affinityMask`，`reserved[]` 置 0 |

`STThreadAttributes` 字段参见 `st_rt_set_thread_attributes` 条目。

**返回值** — `1` = 成功 / `0` = 拒绝（`outAttributes` 为 `NULL`、版本戳不一致、`threadType` 超出范围）。

</details>

<details>
<summary><code>st_rt_init_create_options</code> — 用默认值填充创建选项结构体</summary>

```c
void st_rt_init_create_options(STRT_CreateOptions* outOptions);
```

**用途** — 用正确的版本戳和默认值初始化 `STRT_CreateOptions`。宿主先用此函数填充，再只修改需要的字段后传给 `st_rt_create`。这样以后新增的字段也会被填入安全的默认值（0）。

**调用方式** — 在 `st_rt_create` 之前调用。`structSize` 与 `apiVersion` 自动填写，`scheduler` 为 `ST_RT_SCHEDULER_PIPELINED`，其余字段全部为 `0`（各字段的“默认”含义）。线程：`[any]` — 只填充调用方拥有的结构体。

| 参数 | 说明 |
|---|---|
| `outOptions` | 要填充的结构体。为 `NULL` 时不做任何事 |

**结构体** `STRT_CreateOptions`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `structSize` | `uint32_t` | `sizeof(STRT_CreateOptions)` | 版本戳。不一致则拒绝创建 |
| `apiVersion` | `uint32_t` | `ST_ABI_VERSION` | 版本戳。不一致则拒绝创建 |
| `scheduler` | `int32_t` | `ST_RT_SCHEDULER_PIPELINED`(1) | `STRT_Scheduler`。`PIPELINED`(1) = 引擎工作线程在后台以最新帧优先计算传播与 IR 的实时默认模式。`SYNCHRONOUS`(0) = 管线在宿主调用 `st_rt_propagate` 的线程上运行的同步模式（用于诊断、兼容）。创建后不可更改（`st_rt_get_scheduler`） |
| `seedValue` | `uint32_t` | `0` | 兼容用字段。不影响默认后端的输出 |
| `maxDelaySeconds` | `float` | `0` | 渲染延迟环长度（秒）。`0` = 平台默认（桌面 2.0 s，Android·iOS 1.0 s，Emscripten 0.5 s）。其他值须为约 0.0118 s（一个处理块 + 8 采样）~60 s 的有限值。创建后通过 `st_rt_render_set_max_delay_seconds` 更改 |
| `maxComputeThreads` | `uint32_t` | `0` | 用于传播与 IR 计算的线程数上限 = 引擎所拥有的共享计算池的宽度。`0` = 自动 = `min(性能核心数, 6)`，最小 1。不受环境变量影响。在 PIPELINED 下预算 `N` 至少提升到 3，并分为音频槽 1 + Direct 专用工作线程 1 + 通用工作线程 `N−2`（见下方 `st_rt_create` 的线程数表）。是否支持见 `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | `float` | `0` | 场景单位 → 米的换算系数。`0` = 默认 1.0（场景单位 = 米）。厘米宿主为 `0.01f`，英尺宿主为 `0.3048f`。**仅在创建时设置**，没有运行时 setter。非有限值、0 及以下的值会被拒绝。是否支持见 `ST_CAP_SCENE_RATIO` |
| `renderOutputMode` | `int32_t` | `ST_RT_RENDER_OUTPUT_DEVICE`(0) | `STRT_RenderOutputMode`（见下表）。超出范围则拒绝。是否支持见 `ST_CAP_HOST_PULL_RENDER` / `ST_CAP_HOST_PULL_BUFFERED` |
| `hostSampleRate` | `int32_t` | `0` | 宿主采样率。`0` = 引擎采样率（44100）— 不创建重采样器。其他值时，引擎用内置的加窗 sinc 转换器转换流输入（`st_rt_source_write_stream`）与 pull 输出（`st_rt_render_process`），公开 API 中以“帧”为单位的值（`write_stream`·`render_process`·`render_get_latency_frames`·`STStreamDesc.capacityFrames`·`STStreamStatus`）**全部采用此采样率**。允许范围 `[8000, 384000]`。`DEVICE` 模式下非 0 值会被拒绝（设备路径固定为引擎采样率）。是否支持见 `ST_CAP_HOST_SAMPLE_RATE` |
| `backend` | `int32_t` | `ST_BACKEND_ST`(0) | `STBackend` 管线选择。`ST_BACKEND_ST`(0) 是默认引擎。`ST_BACKEND_EXA`(1) 仅在库声明 `ST_CAP_BACKEND_EXA` 时可用，并且需要 `SYNCHRONOUS` 调度器与 `maxDelaySeconds = 0`。其他值、不可用值会被拒绝 |
| `startIdle` | `uint32_t` | `0` | `0` = 创建后立即 `RUNNING`，`1` = 创建后立即 `IDLE` — 宿主须调用 `st_rt_run` 后传播、IR、渲染才会运行（避免无内容播放时计算空转）。其他值会被拒绝。是否支持见 `ST_CAP1_ENGINE_IDLE` |
| `maxSources` | `uint32_t` | `0` | 最大声源数。`0` = 平台默认（桌面 128，Android·iOS 48，Emscripten 32）。创建后通过 `st_rt_set_memory_budget` 更改。是否支持见 `ST_CAP1_MEMORY_BUDGET` |

**枚举** `STRT_RenderOutputMode`

| 值 | 名称 | 含义 |
|---|---|---|
| `0` | `ST_RT_RENDER_OUTPUT_DEVICE` | 默认。`st_rt_render_start` 打开输出设备和引擎渲染线程，由引擎直接输出到设备 |
| `1` | `ST_RT_RENDER_OUTPUT_HOST_PULL` | 宿主 pull。引擎既不创建设备也不创建渲染线程，由宿主在自己的音频线程上调用 `st_rt_render_process` 取走块。此模式下也必须调用 `st_rt_render_start(useHrtf)`（兼做双耳/扬声器选择与“允许渲染”标志） |
| `2` | `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED` | 引擎渲染线程填充环（容量 8 块、目标 3 块），`st_rt_render_process` 只从环中复制。宿主回调开销降至 memcpy 水平，抖动由环吸收。若块处理本身持续超过块时长，环也无法弥补，将以静音填充。延迟上限 ≈ 引擎 3 块。`hostSampleRate ≠ 0` 时转换在渲染线程上进行 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_create</code> — 创建实时上下文（引擎、工作线程、计算池）</summary>

```c
STStatus st_rt_create(const STRT_CreateOptions* options, STRT_Context** outContext);
```

**用途** — 创建一个实时引擎实例。场景、声源、听者、渲染等其他所有 `st_rt_*` 调用都接收此上下文。调度器、计算线程宽度、单位倍率、输出模式、宿主采样率等运行中无法更改的设置在此确定。

**调用方式** — 若要使用线程属性（`st_rt_set_thread_attributes`），须在此之前指定后再调用。用 `st_rt_init_create_options` 填充选项，只修改需要的字段后传入。成功后按场景构建（网格、对象、声源、听者）→ `st_rt_build` → `st_rt_render_start` 的顺序进行，结束时用 `st_rt_destroy` 释放。创建后的初始状态为 PIPELINED 调度器、采样率 44100 Hz、通道更新周期 direct 10 ms / 反射·衍射 0 ms / 混响 4 ms、引擎休眠状态 `RUNNING`（`startIdle = 1` 时为 `IDLE`），默认后端的上下文以输出级等响度补偿开启的状态启动（可通过 `st_rt_render_set_loudness_compensation` 关闭）。线程：`[control, blocking]` — 创建引擎、工作线程与计算池的较长区间，不要在游戏循环或音频线程中调用。

| 参数 | 说明 |
|---|---|
| `options` | 创建选项。为 `NULL` 时以 `st_rt_init_create_options` 的默认值创建。直接填写时 `structSize`/`apiVersion` 版本戳必须正确 |
| `outContext` | 输出句柄。成功时写入新上下文，失败时写入 `NULL`。传入 `NULL` 则返回 `ST_STATUS_INVALID_ARGUMENT` |

`STRT_CreateOptions` 字段参见 `st_rt_init_create_options` 条目。

**引擎启动的线程数** — `N` 在 SYNCHRONOUS 下为解析后的 `maxComputeThreads` 预算，在 PIPELINED 下为 `max(3, 解析后的预算)`。只要存在一个文件输入（`st_rt_source_set_audio_file`），就会额外增加 1 个文件解码器线程，宿主流输入没有解码器。加速结构构建在调用线程上执行，不增加线程。

| 输出模式 | SYNCHRONOUS | PIPELINED |
|---|---|---|
| `DEVICE` | 池工作线程 `N`（N=1 时为 0，在调用线程内联）+ 渲染 1 + 设备 1 | 池工作线程 `N−1`（Direct 专用 1 + 通用 `N−2`）+ 渲染 1 + 设备 1 |
| `HOST_PULL` | 在上述基础上去掉渲染、设备线程 | 在上述基础上去掉渲染、设备线程 |
| `HOST_PULL_BUFFERED` | 只有渲染线程，没有设备线程 | 只有渲染线程，没有设备线程 |

PIPELINED 的渲染线程是预算 `N` 内的音频槽，只提升优先级。实际数量用 `st_rt_get_thread_inventory` 确认。

**返回值** — `STStatus`。
- `ST_STATUS_OK` — 成功。
- `ST_STATUS_INVALID_ARGUMENT` — `outContext` 为 `NULL`，或选项值超出范围（`scheduler`、`maxDelaySeconds`、`sceneRatio`、`renderOutputMode`、`hostSampleRate`、`backend`、`startIdle`）。
- `ST_STATUS_VERSION_MISMATCH` — `structSize`/`apiVersion` 不一致。
- `ST_STATUS_INITIALIZATION_FAILED` / `ST_STATUS_ALLOCATION_FAILED` — 引擎初始化、分配失败。

失败原因字符串通过 `st_rt_get_last_error(NULL, ...)` 读取（同一调用线程上最后一次失败的创建）。

</details>

<details>
<summary><code>st_rt_get_backend</code> — 返回上下文使用的管线后端</summary>

```c
int st_rt_get_backend(const STRT_Context* context);
```

**用途** — 确认创建时通过 `STRT_CreateOptions.backend` 选择的管线。不支持运行中切换。

**调用方式** — 创建后可随时调用。线程：`[control]` — 在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STBackend` 值（`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1）。`context` 为 `NULL` 时返回 `-1`。

</details>

<details>
<summary><code>st_rt_destroy</code> — 释放上下文（停止并 join 工作线程）</summary>

```c
void st_rt_destroy(STRT_Context* context);
```

**用途** — 释放上下文以及引擎拥有的所有资源（场景、声源、工作线程与计算池线程、渲染输出）。

**调用方式** — 上下文使用结束时调用一次。调用后句柄失效，因此不得有其他线程正在使用同一上下文。线程：`[control, blocking]` — 会停止并 join 工作线程，不要在音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 要释放的上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_get_last_status</code> — 读取上下文中留下的最后状态码</summary>

```c
STStatus st_rt_get_last_status(const STRT_Context* context);
```

**用途** — 返回 `int`/`void` 的函数失败时，以 `STStatus` 确认其原因。许多函数在失败时会在此诊断字段中留下状态。

**调用方式** — 在收到失败返回后，立即在同一控制线程上调用。人类可读的消息通过 `st_rt_get_last_error` 获取。若音频路径（`st_rt_render_process`）留有状态，则优先返回该状态并清空。多个线程同时使用同一上下文时，错误路径的诊断记录不会被串行化。线程：`[control]` — 在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 最后的 `STStatus`。`context` 为 `NULL` 时返回 `ST_STATUS_INVALID_CONTEXT`。

| 值 | 名称 |
|---|---|
| `0` | `ST_STATUS_OK` |
| `1` | `ST_STATUS_INVALID_CONTEXT` |
| `2` | `ST_STATUS_INVALID_ARGUMENT` |
| `3` | `ST_STATUS_VERSION_MISMATCH` |
| `4` | `ST_STATUS_INITIALIZATION_FAILED` |
| `5` | `ST_STATUS_ALLOCATION_FAILED` |
| `6` | `ST_STATUS_NOT_FOUND` |
| `7` | `ST_STATUS_BUFFER_TOO_SMALL` |
| `8` | `ST_STATUS_INVALID_MATERIAL` |
| `9` | `ST_STATUS_STALE_SNAPSHOT` |
| `10` | `ST_STATUS_UNAVAILABLE` |
| `11` | `ST_STATUS_BUDGET_EXCEEDED` — 超出声源内存预算（`st_rt_source_create`，拒绝策略为 `ST_MEMORY_REJECT_NEW` 时） |

</details>

<details>
<summary><code>st_rt_get_last_error</code> — 复制最后的错误消息字符串</summary>

```c
int st_rt_get_last_error(const STRT_Context* context, char* outMessage, int capacity);
```

**用途** — 获取最后一次失败的人类可读说明并记录到日志。`context` 传入 `NULL` 时，可读取没有上下文的 `st_rt_create` 失败原因。

**调用方式** — 失败后立即调用。若想先知道所需大小，可用 `outMessage = NULL` 调用，只取返回值。`context = NULL` 时为 **此调用线程** 上最后一次失败的 `st_rt_create` 的消息，下一次 `st_rt_create` 调用会将其清除。线程：`[control]` — 在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄。为 `NULL` 时为此线程最后一次创建失败的消息 |
| `outMessage` | 输出缓冲区。为 `NULL` 时不复制，只返回大小 |
| `capacity` | `outMessage` 的字节数。不足时截断为 `capacity − 1` 字节并以 NUL 结尾 |

**返回值** — 容纳完整消息所需的字节数（含 NUL）。返回值大于 `capacity` 表示已被截断。

</details>

<details>
<summary><code>st_rt_is_acoustic_feature_enabled</code> — 读取单项声学功能（空气吸收、传播延迟、直达声遮挡）是否开启</summary>

```c
int st_rt_is_acoustic_feature_enabled(const STRT_Context* context, int feature);
```

**用途** — 确认通过 `st_rt_set_acoustic_feature_enabled` 开关的声学功能的当前状态。与路径类型门控一起用于试听 A/B 对比（逐一分离对声音有贡献的因素）。

**调用方式** — 创建后可随时调用。默认三项功能全部开启。线程：`[control]` — 无锁读取引擎状态，但须在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`（0，大气衰减、高频损失）/ `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`（1，基于路径长度的传播延迟）/ `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`（2，直达声遮挡） |

**返回值** — `1` = 开启 / `0` = 关闭 / `-1` = `context` 为 `NULL`。

</details>

<details>
<summary><code>st_rt_idle</code> — 让整个引擎休眠（停止计算，渲染输出尾音后静音）</summary>

```c
int st_rt_idle(STRT_Context* context);
```

**用途** — 没有需要播放的内容时（停止播放、暂停、没有房间），停止传播与 IR 计算以及渲染处理，以收回 CPU。缓存与平滑历史会保留，因此用 `st_rt_run` 唤醒后会接续计算。

**调用方式** — 渲染期间可随时调用，不等待完成。调用后传播通道、IR 组装、IR 准备任务的新执行会停止（已在运行的那 1 次会执行到底）。渲染继续用已采用的 IR 输出输入与尾音，当以下条件全部满足时停止处理并只输出 0（`DRAINING` → `IDLE`）：正在播放的输入中没有尚未取出的声音、所有声源输入在延迟线长度 + 1 s 内保持静音、输出低于 −80 dBFS 持续 0.5 s。若输入持续发声，则在上限（5 s 与“输入静音长度 + 2 s”中的较大值）处经过一个块的淡出后强制进入 `IDLE`。渲染未运行时（`st_rt_render_start` 之前、`st_rt_render_stop` 之后）直接为 `IDLE`。休眠期间仍接受 setter，播放请求在唤醒后生效。宿主流、扬声器组的环不会被消费（写入会一直接受直到环满）。输出设备保持打开，因此长时间休眠时应在确认 `IDLE` 后调用 `st_rt_render_stop`。SYNCHRONOUS 调度器下计算只在 `st_rt_propagate` 中运行，因此只有渲染侧休眠。是否支持见 `ST_CAP1_ENGINE_IDLE`。线程：`[control]` — 只持有短暂的锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `1` = 成功（若已在休眠则不做任何事）/ `0` = `context` 为 `NULL`。

</details>

<details>
<summary><code>st_rt_run</code> — 唤醒休眠中的引擎</summary>

```c
int st_rt_run(STRT_Context* context);
```

**用途** — 在通过 `st_rt_idle` 休眠或以 `startIdle = 1` 创建的上下文上，重新运行传播、IR 与渲染。

**调用方式** — 重新开始播放时调用。立即变为 `RUNNING` 并唤醒计算任务，休眠期间接收的场景、运动、策略变更在此时生效。IR 组装的时间轴（平滑、迟滞）会跳过休眠时间。因强制 `IDLE` 而停止的延迟线、混响状态会接续输出，首个块淡入。不等待完成。线程：`[control]` — 只做短暂加锁与唤醒计算任务。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `1` = 成功 / `0` = `context` 为 `NULL`。

</details>

<details>
<summary><code>st_rt_get_idle_state</code> — 读取引擎休眠状态（RUNNING / DRAINING / IDLE）</summary>

```c
int st_rt_get_idle_state(const STRT_Context* context);
```

**用途** — 在 `st_rt_idle` 之后确认渲染是否已输出完尾音。例如在变为 `IDLE` 之后用 `st_rt_render_stop` 关闭设备。

**调用方式** — 可随时调用。`IDLE` 表示“无新计算 + 渲染输出 0”，并不表示进行中的那 1 次计算也已结束。线程：`[any]` — 读取一个 atomic。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STRT_IdleState`：`ST_RT_IDLE_RUNNING`（0，运行中）/ `ST_RT_IDLE_DRAINING`（1，已请求休眠，渲染正在输出剩余声音）/ `ST_RT_IDLE_IDLE`（2，计算休眠 + 渲染只输出 0 — `startIdle = 1` 时创建后即为此状态）。`context` 为 `NULL` 时返回 `-1`。

</details>

<details>
<summary><code>st_rt_get_scheduler</code> — 返回上下文的调度器</summary>

```c
int st_rt_get_scheduler(const STRT_Context* context);
```

**用途** — 确认创建时确定的调度器。用于判断是否使用通道更新周期（`st_rt_set_lane_update_interval`）这类仅在 PIPELINED 下有意义的 API，或是否需要自行驱动 `st_rt_propagate`。

**调用方式** — 创建后可随时调用。值不可变。线程：`[any]` — 读取创建时确定的不可变值。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STRT_Scheduler`：`ST_RT_SCHEDULER_SYNCHRONOUS`(0) / `ST_RT_SCHEDULER_PIPELINED`(1)。

</details>

<details>
<summary><code>st_rt_get_timing</code> — 一次读取管线各阶段最近的耗时</summary>

```c
int st_rt_get_timing(const STRT_Context* context, STTiming* outTiming);
```

**用途** — 以一个结构体获取传播（3 个通道）、IR 转换、IR 发布、块渲染最近 1 次的耗时，在宿主性能分析器或 HUD 上显示引擎负载。这是获取计时的唯一接口。

**调用方式** — 可随时轮询（例如每帧）。比较两次读取的 `irPublishSequence` 即可知道其间是否发布了新 IR。是否支持见 `ST_CAP_ENGINE_TIMING`（`irPublishSequence` 为 `ST_CAP_IR_STATS`）。线程：`[any]` — 只读取 atomic。但版本戳错误的错误路径会写入上下文诊断缓冲区。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outTiming` | 输出。调用方填写 `structSize = sizeof(STTiming)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STTiming`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 调用方填写的版本戳 |
| `propagateTotalMs` | 传播总计（ms）。PIPELINED 下各通道在不同工作线程上以不同周期运行，因此不是三个通道之和，而是等于最重的反射·衍射通道值（`== propagateReflDiffMs`）。SYNCHRONOUS 下 ≈ direct + reflDiff + reverb |
| `propagateDirectMs` | Direct 通道（直达声 + 透射） |
| `propagateReflDiffMs` | 反射·衍射通道（含 guide） |
| `propagateReverbMs` | 混响通道（扩散、声源输运） |
| `irBuildMs` | 几何 → IR 转换 |
| `auralUpdateIrMs` | IR 发布（应用到渲染侧） |
| `auralProcessMs` | 每块的渲染处理时间（渲染线程或宿主 pull 回调） |
| `irPublishSequence` | IR 发布序号的低 32 位。与 `st_rt_ir_get_stats` 的 `publishSequence` 相同，`0` = 尚未发布 |
| `reserved[7]` | 保留 |

尚未运行过的阶段为 `0`。

**返回值** — `1` = 成功 / `0` = `context`·`outTiming` 为 `NULL` 或版本戳不一致（不一致时 `st_rt_get_last_status` 中为 `ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_set_memory_budget</code> — 指定声源内存预算（最大声源数、字节上限、拒绝策略）</summary>

```c
int st_rt_set_memory_budget(STRT_Context* context, const STMemoryBudget* budget);
```

**用途** — 在移动端、Web 等内存紧张的平台上，为声源数量与各声源内存总和设定上限。一个声源的内存由固定开销（传播、IR 副本、输运、流环）、延迟环（与场景最长路径成正比，下限 `ringFloorSeconds` ~ 上限 `st_rt_render_get_max_delay_seconds`）以及路径通道构成。超出预算的 `st_rt_source_create` 会根据策略被拒绝，或在驱逐最远的声源后被接受，因此创建之后不会因新声源而增加内存。

**调用方式** — 创建后可随时调用。若只需设定最大声源数，也可在创建时通过 `STRT_CreateOptions.maxSources` 设置。若要在现有值的基础上修改，先用 `st_rt_get_memory_budget` 读取，只改需要的字段后再 set。即使减小上限，已有声源也会保留，从新的创建开始生效。用量通过 `st_rt_get_memory_stats` 查看。是否支持见 `ST_CAP1_MEMORY_BUDGET`（能力字 1）。线程：`[control]` — 在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `budget` | 新策略。调用方填写 `structSize = sizeof(STMemoryBudget)`、`apiVersion = ST_ABI_VERSION`。为 `0` 的字段表示默认值 |

**结构体** `STMemoryBudget`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 调用方填写的版本戳 |
| `maxSources` | 最大声源数。`0` = 平台默认 |
| `rejectPolicy` | `STMemoryRejectPolicy`：`ST_MEMORY_REJECT_NEW`（0，默认）= 超出时 `st_rt_source_create` 返回失败句柄（`v < 0`）与 `ST_STATUS_BUDGET_EXCEEDED`。`ST_MEMORY_EVICT_FARTHEST`(1) = 以与 `st_rt_source_destroy` 相同的路径驱逐离听者最远的声源并接受新声源（被驱逐的 id 见 `STMemoryStats.lastEvictedSource`） |
| `sourceBudgetBytes` | 各声源可变内存总和的上限（字节）= 跟踪字节 + `fixedPerSourceBytes` × 声源数。`0` = 无限制（仅观测） |
| `fixedPerSourceBytes` | 单个声源固定开销的估计值。`0` = 引擎默认（2.5 MiB）。仅用于预算估算 |
| `ringFloorSeconds` | 刚附加输入、没有路径的声源的延迟环大小（秒）。`0` = 0.25 |
| `ringGrowthHeadroom` | 环增长余量倍率 — 所需延迟 × 此值（+50 ms，按 125 ms 向上取整）。`0` = 1.25 |
| `allowShrink` | `0` = 不缩小环（会话期间保持最大值），`1` = 允许缩小 |
| `reserved[5]` | 必须全部为 `0` |

**平台默认值**

| 构建目标 | `maxSources` | `sourceBudgetBytes` | 延迟环上限 |
|---|---|---|---|
| 桌面 | 128 | 无限制 | 2.0 s |
| Android · iOS | 48 | 96 MiB | 1.0 s |
| Emscripten（Web） | 32 | 64 MiB | 0.5 s |

**返回值** — `1` = 已应用 / `0` = 拒绝。拒绝时状态不变，`st_rt_get_last_status` 中留下 `ST_STATUS_VERSION_MISMATCH`（`budget` 为 `NULL` 或版本戳不一致）或 `ST_STATUS_INVALID_ARGUMENT`（值为非有限值或超出范围、`reserved` 不为 0）。`context` 为 `NULL` 时返回 `0`。

</details>

<details>
<summary><code>st_rt_get_memory_budget</code> — 读取当前声源内存预算策略</summary>

```c
int st_rt_get_memory_budget(const STRT_Context* context, STMemoryBudget* outBudget);
```

**用途** — 确认当前生效的预算策略（已填入平台默认值的实际值），或作为只修改部分字段的起点。

**调用方式** — 创建后可随时调用。典型用法是修改读取到的结构体后传给 `st_rt_set_memory_budget`。是否支持见 `ST_CAP1_MEMORY_BUDGET`。线程：`[control]` — 在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outBudget` | 输出。调用方填写 `structSize`/`apiVersion`。成功时 `reserved[]` 置 0 |

`STMemoryBudget` 字段参见 `st_rt_set_memory_budget` 条目。

**返回值** — `1` = 成功 / `0` = `context` 为 `NULL`，或 `outBudget` 为 `NULL`、版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_get_memory_stats</code> — 读取声源内存用量、拒绝与驱逐统计</summary>

```c
int st_rt_get_memory_stats(const STRT_Context* context, STMemoryStats* outStats);
```

**用途** — 观测相对于预算的当前用量以确定预算值，或确认是否发生了拒绝、驱逐。

**调用方式** — 创建后可随时调用。只读取控制侧记录与池，不访问音频线程。是否支持见 `ST_CAP1_MEMORY_BUDGET`。线程：`[control]` — 在控制线程上调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outStats` | 输出。调用方填写 `structSize = sizeof(STMemoryStats)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STMemoryStats`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 调用方填写的版本戳 |
| `sourceCount` | 当前声源数 |
| `maxSources` | 生效中的最大声源数 |
| `trackedBytes` | 跟踪字节 = 已安装的延迟环（含等待替换的环）+ 路径通道估算 + 池中保留的环 |
| `estimatedBytes` | `trackedBytes + fixedPerSourceBytes × sourceCount`。预算判定时若此值超出，先清空池中保留的环再重新测量 |
| `sourceBudgetBytes` | 生效中的字节上限（`0` = 无限制） |
| `pooledRingBytes` | 为复用而保留的环字节（包含在 `trackedBytes` 中）。上限为桌面 16 MiB · 移动端 8 MiB · Web 4 MiB，10 s 未使用即释放 |
| `rejectedCreates` | 因超出预算而被拒绝的 `st_rt_source_create` 累计数 |
| `evictions` | 通过 `ST_MEMORY_EVICT_FARTHEST` 驱逐的声源累计数 |
| `lastEvictedSource` | 最后被驱逐的声源 id，`-1` = 无 |
| `ringBytesPerSourceMax` | 最大的声源延迟环字节数 |
| `reserved[6]` | 保留 |

**返回值** — `1` = 成功 / `0` = `context` 为 `NULL`，或 `outStats` 为 `NULL`、版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_ir_get_stats</code> — 读取最近一次 IR 发布的一致性计量快照</summary>

```c
int st_rt_ir_get_stats(const STRT_Context* context, STIrStats* outStats);
```

**用途** — 嵌入宿主时，无需查看引擎内部即可分辨“IR 烘焙为何变慢”的计量数据。约定所有字段都来自同一次发布，可区分以下三种情况：① 工作量大 → `stagedBedCells`·`mergedBedCells`·`exactTaps`，② 被抢占 → `prepareCpuUs` ≪ `prepareTotalUs`（CPU/wall 比率低），③ 位于慢核心 → `prepareCpuUs` ≈ `prepareTotalUs` 但绝对值大（用 `prepareCpuIndex` 确认逻辑处理器）。宿主帧之间 `publishSequence` 的增量反映发布周期。

**调用方式** — 可随时轮询。在 PIPELINED 下，场景静止时发布也会停止 — 通道输入与组装键保持不变且距最后一次变化超过 2 s 后便不再重新组装（通道仍持续运行）。任何变化都会立即组装并发布，之后的 2 s 内最多每 50 ms 重新组装一次。因此在静止场景中，“IR 是否为最新”应以 `settled` 而不是 `publishSequence` 判断。在 SYNCHRONOUS 下同样有效（调用线程烘焙后立即采用，因此 CPU/wall 比率接近 1）。是否支持见 `ST_CAP_IR_STATS`。线程：`[any]` — 无锁的一致性快照，不会输出撕裂的值。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outStats` | 输出。调用方填写 `structSize = sizeof(STIrStats)`、`apiVersion = ST_ABI_VERSION`。被拒绝时不做修改 |

**结构体** `STIrStats`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 调用方填写的版本戳 |
| `publishSequence` | 渲染每采用一个新 IR 就 +1。`0` = 尚未发布 |
| `lastPublishLaneMask` | 自上一次发布以来几何有推进的通道位：`ST_IR_LANE_DIRECT`(`1u<<0`) · `ST_IR_LANE_REFLECTION_DIFFRACTION`(`1u<<1`) · `ST_IR_LANE_REVERB`(`1u<<2`)，以及仅在没有任何几何位时才置位的 `ST_IR_LANE_POLICY_ONLY`（`1u<<3`，无新几何的重新转换 — IR 策略变更或组装仍在收敛） |
| `stagedBedCells` | early bed 合并输入单元数（各声源之和） |
| `mergedBedCells` | early bed 合并输出单元数 |
| `activePartitions` / `maxPartitions` | bed 卷积分区数（活动 / 最大） |
| `irSpanMs` | 合并后 bed IR 长度（ms） |
| `exactTaps` | exact 路径抽头数 |
| `sendTaps` | 混响 send 抽头数 |
| `rainTaps` | 一阶散射（diffuse rain）抽头数 |
| `prepareMergeUs` | bed 合并、频带归一化时间（µs） |
| `prepareBakeUs` | bed 时域烘焙时间（不含 FFT，µs） |
| `prepareFftUs` | 分区 FFT 时间（µs） |
| `prepareTotalUs` | IR 准备的总 wall 时间（µs）。PIPELINED 只计烘焙线程的准备，SYNCHRONOUS 是含应用在内的全部，因此不要并列比较两种调度器的值。三个阶段 µs 之和小于此值 |
| `prepareCpuUs` | 同一区间内烘焙线程的 CPU 时间（µs）。Windows 的分辨率为调度器时钟周期（约 15.6 ms），应观察多次发布的比率趋势而非单个值。POSIX 精细得多 |
| `prepareCpuIndex` | 准备完成时该线程所在的逻辑处理器编号（提示）。不支持 = `0xFFFFFFFF`（macOS 始终为此值） |
| `directLaneFrames` / `exactLaneFrames` / `reverbLaneFrames` | IR 组装收到的通道帧累计数（direct · 反射/衍射 · 混响，uint32 循环）。在变更（添加声源、听者移动等）后立即记录该值，增加 +2 以上即表示变化之后开始的通道执行结果已进入组装 |
| `settled` | `1` = 组装已处理完收到的所有通道帧（收敛），且渲染已采用最后发布的 IR |
| `reserved[2]` | 全部为 0 |

`directLaneFrames`~`settled` 以 `ST_CAP1_ENGINE_IDLE` 为标志，仅在 PIPELINED 下有意义（SYNCHRONOUS 为 0 与 `settled = 1`），是与其余快照分开读取的值。bed 相关的 8 个字段（`stagedBedCells`·`mergedBedCells`·`activePartitions`·`maxPartitions`·`irSpanMs`·`prepareMergeUs`·`prepareBakeUs`·`prepareFftUs`）仅在 early bed 渲染模式（`STRenderOptions.reserved0 = 1`）下非 0 — exact objects 模式（`0`）下的 0 表示“根本没有烘焙阶段”。`exactTaps`·`sendTaps`·`rainTaps` 与模式无关均会填写。

**返回值** — `1` = 成功（尚未发布时以 `publishSequence = 0` 成功）/ `0` = 拒绝：`context`·`outStats` 为 `NULL`、版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）、快照与并发发布连续冲突（`ST_STATUS_UNAVAILABLE` — 很少见，重新调用即可）。

</details>

<details>
<summary><code>st_rt_get_thread_inventory</code> — 按类型读取上下文当前启动的线程数</summary>

```c
int st_rt_get_thread_inventory(const STRT_Context* context, STThreadInventory* outInventory);
```

**用途** — 如果说线程属性（`STThreadAttributes`）是“要设定什么”，清单就是“实际运行了几个”。让宿主以实测数值而非猜测来制定自己的线程预算。

**调用方式** — 可随时调用。各类型的计数器是相互独立的 atomic，因此并非同一时刻的快照 — 线程正在启动或退出时，总和可能暂时不一致，这不是错误。输出设备线程（音频驱动）由其他路径创建，不计入清单。是否支持见 `ST_CAP_THREAD_INVENTORY`。线程：`[any]` — 只读取各类型的 atomic 计数器。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outInventory` | 输出。调用方填写 `structSize = sizeof(STThreadInventory)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STThreadInventory`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 调用方填写的版本戳 |
| `countByRole[ST_THREAD_TYPE_COUNT]` | 按 `STThreadType` 顺序排列的线程数（索引 = 类型）。逻辑角色（LANE_*·IR_CONVERTER·AU_PREPARE·SCENE_INPUT）运行在计算池上，始终为 `0`，`ST_THREAD_ACCEL_BUILD` 也为 `0` |
| `reserved[5]` | 保留 |

`STThreadType` 值参见 `st_rt_set_thread_attributes` 条目。

典型值（PIPELINED，计算池预算 `N = max(3, 解析后的预算)`，有文件声源）：

| 输出模式 | LANE_* | IR_CONVERTER · AU_PREPARE | COMPUTE_POOL | AUDIO_RENDER | FILE_DECODER |
|---|---|---|---|---|---|
| `DEVICE` | 0 | 0 | `N−1`（含 Direct 专用 1 个） | 1 | 1 |
| `HOST_PULL` | 0 | 0 | `N−1` | 0 | 1 |

SYNCHRONOUS 下 LANE_* 全部为 0，没有文件输入时 FILE_DECODER 为 0。

**返回值** — `1` = 成功 / `0` = `context`·`outInventory` 为 `NULL` 或版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

</details>

<details>
<summary><strong>材质 · 网格 · 对象 · 场景</strong> — 17 个</summary>

<details>
<summary><code>st_rt_material_create</code> — 注册一个声学材质并获取句柄</summary>

```c
STMaterialId st_rt_material_create(STRT_Context* context, const STMaterial* material);
```

**用途** — 将以 9 个倍频程频带的反射、吸收、透射、散射系数定义的材质注册到引擎。网格（`st_rt_mesh_create`）引用此函数返回的材质句柄来确定表面的声学特性。

**调用方式** — 在创建使用该材质的网格之前调用。多个材质通过反复调用此函数注册，返回句柄的 `v` 按注册顺序连续。需要默认材质库时，一并使用 `st_rt_material_load_defaults`。线程：`[control]` — 仅限控制线程，与工作线程互斥，可能短暂阻塞，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `material` | 要注册的材质。调用方填写 `structSize = sizeof(STMaterial)`、`apiVersion = ST_ABI_VERSION`。先验证版本戳，再验证系数 |

**结构体** `STMaterial`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STMaterial)` — 由调用方填写 |
| `apiVersion` | `ST_ABI_VERSION` — 由调用方填写 |
| `reflection[ST_FREQUENCY_BANDS]` | 各频带反射能量比，`[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | 各频带吸收能量比，`[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | 各频带透射能量比，`[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 反射能量中转为扩散（diffuse）的比例，`[0, 1]`。不计入 R+A+T 之和 |
| `reserved[8]` | 保留 |

- 频带固定为 `ST_FREQUENCY_BANDS` = 9 个（63 · 125 · 250 · 500 · 1000 · 2000 · 4000 · 8000 · 16000 Hz）。
- 所有系数均为 **能量域**（无量纲能量比），不是声压振幅。
- 每个频带必须满足 `|R + A + T − 1| <= ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`(0.001)。引擎不会推导、归一化、钳位或插值这些值，因此调用方必须使其和为 1。

**返回值** — 材质句柄（`STMaterialId`，`struct { int32_t v; }`）。网格、对象句柄（`STMeshId`·`STObjectId`）也是同形但不同的类型，混用会产生编译错误。失败时 `v < 0`，原因留在 `st_rt_get_last_status` 中：`material` 为 NULL 时为 `ST_STATUS_INVALID_ARGUMENT`，版本戳不一致时为 `ST_STATUS_VERSION_MISMATCH`，非有限值、超出范围的值、R+A+T 之和不符时为 `ST_STATUS_INVALID_MATERIAL`。

</details>

<details>
<summary><code>st_rt_material_load_defaults</code> — 一次性注册默认材质库</summary>

```c
STMaterialId st_rt_material_load_defaults(STRT_Context* context);
```

**用途** — 整体注册引擎内置的默认材质库。用于不自行准备材质系数、直接构建场景的情况。

**调用方式** — 在创建网格之前调用。返回值是库中 **第一个材质** 的句柄，其余材质按 `v+1`、`v+2` … 顺序连续。可以与通过 `st_rt_material_create` 注册的材质一起使用。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 库中第一个材质的句柄。失败时 `v < 0`。

</details>

<details>
<summary><code>st_rt_scene_set_edge_split_collinear_overlaps</code> — 设定是否拆分共线重叠的声学边</summary>

```c
void st_rt_scene_set_edge_split_collinear_overlaps(STRT_Context* context, int enabled);
```

**用途** — 场景构建选项，决定在创建网格时编译的声学边（衍射边）拓扑中，是否将同一直线上相互重叠（共线重叠）的边拆分处理。是否支持通过 capability 位 `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS` 确认。

**调用方式** — 使用网格创建时刻的值，因此 **仅对此调用之后创建的网格** 生效。已创建网格的拓扑不会改变，应在 `st_rt_mesh_create` 之前设置。默认关闭。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | `0` = 关闭（默认）/ 非 0 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_scene_set_solid_wedge_gate</code> — 开关衍射楔的定向剔除门控</summary>

```c
void st_rt_scene_set_solid_wedge_gate(STRT_Context* context, int enabled);
```

**用途** — 在两个面相交形成的衍射楔（wedge）处，按网格绕序（法线方向）区分凸、凹，剔除进入楔体实体一侧的衍射路径的门控。是否支持通过 capability 位 `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE` 确认。

**调用方式** — 默认关闭。在传播阶段判定，因此对已有网格也生效。开启后判定依赖网格绕序，因此须在单个网格内保持绕序一致，并使法线朝向空气一侧 — 绕序反转会使凸凹互换，被剔除的衍射路径集合随之相反（参见 `st_rt_mesh_create` 的绕序说明）。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | `0` = 关闭（默认）/ 非 0 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_scene_set_accel</code> — 选择网格与静态场景的加速结构类型</summary>

```c
int st_rt_scene_set_accel(STRT_Context* context, int kind);
```

**用途** — 选择用于网格 BLAS 与静态场景加速结构的结构类型。引擎在创建时也会读取 `SOUNDTRACING_ACCEL` 环境变量，但通过此函数，宿主无需改动自身进程环境即可做出相同选择。

**调用方式** — 在添加对象之前调用。仅对之后的构建生效，已有网格的 BLAS 保持按创建时刻的值构建的状态。默认值为 `2`（TinyBVH）。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH（默认）/ `3` = LBVH / `4` = LBVH_Simd |

**返回值** — `1` = 已应用 / `0` = `kind` 超出范围或没有上下文。

</details>

<details>
<summary><code>st_rt_scene_set_triangle_intersection</code> — 选择三角形求交内核</summary>

```c
int st_rt_scene_set_triangle_intersection(STRT_Context* context, int kind);
```

**用途** — 选择用于射线-三角形求交判定的内核。三种内核都是双面求交。

**调用方式** — 内核在 `st_rt_mesh_create` 时固定到网格上，因此 **仅对此调用之后添加的网格** 生效（不追溯已有网格）。每个网格使用不同内核的配置也有效。默认为 `0`（MollerTrumbore）。当前值通过 `st_rt_scene_get_triangle_intersection` 读取。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `kind` | `0` = MollerTrumbore（默认）/ `1` = PluckerAdaptive / `2` = Watertight |

**返回值** — `1` = 已应用 / `0` = `kind` 无效或没有上下文。

</details>

<details>
<summary><code>st_rt_scene_get_triangle_intersection</code> — 读取当前三角形求交内核设置</summary>

```c
int st_rt_scene_get_triangle_intersection(const STRT_Context* context);
```

**用途** — 查询通过 `st_rt_scene_set_triangle_intersection` 指定的值，即将应用于下一个创建的网格的求交内核。

**调用方式** — 可随时调用。已创建的网格各自保持创建时刻的内核，因此不保证返回值与已有网格的内核相同。线程：`[control]` — 只持有场景读锁的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight。没有上下文时返回 `-1`。

</details>

<details>
<summary><code>st_rt_scene_get_stats</code> — 查询存活的网格、对象、声源与三角形数量</summary>

```c
int st_rt_scene_get_stats(STRT_Context* context, STSceneStats* outStats);
```

**用途** — 以一次读锁快照返回当前存活的声学场景清单（网格、对象、声源数量与三角形数）。所有值描述同一时刻的场景，用于诊断与估算内存规模。是否支持通过 capability 位 `ST_CAP_SCENE_STATS` 确认。

**调用方式** — 无论在场景构建中还是渲染中，都可在控制线程上随时调用。线程：`[control]` — 只持有场景读锁的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outStats` | 接收结果的结构体。调用方填写 `structSize = sizeof(STSceneStats)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STSceneStats`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STSceneStats)` — 由调用方填写 |
| `apiVersion` | `ST_ABI_VERSION` — 由调用方填写 |
| `meshCount` | 存活网格数 |
| `objectCount` | 存活对象数。destroy 成功后立即减少 |
| `sourceCount` | 存活声源数。包括已禁用（disabled）的声源，destroy 成功后立即减少 |
| `reserved0` | 保留 |
| `triangleCount` | 存活对象所引用网格的三角形 **按实例** 累加的值。3 个对象共享一个 100 三角形的网格时为 300 |
| `uniqueTriangleCount` | 存活网格资源 **只计一次** 累加的值（上例中为 100）。用于查看几何与加速结构的内存规模 |
| `reserved[4]` | 保留 |

**返回值** — `1` = 成功 / `0` = `context`·`outStats` 为 NULL（`ST_STATUS_INVALID_ARGUMENT`）或版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_scene_raycast</code> — 用引擎加速结构查询最近命中</summary>

```c
int st_rt_scene_raycast(STRT_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**用途** — 向传播计算所用的同一加速结构（静态 + 动态对象全部）发射射线，返回最近的一个命中。这是只读查询，不改变管线状态，因此宿主可用它确认引擎实际看到的声学几何，或用于自身逻辑（遮挡判定、调试显示等）。是否支持通过 capability 位 `ST_CAP_SCENE_RAYCAST` 确认。

**调用方式** — 在通过 `st_rt_build` 构建加速结构之后才有意义。构建前调用会无错误地返回未命中。只持有场景读锁，因此在 `ST_RT_SCHEDULER_PIPELINED` 下也可与工作线程并行运行。线程：`[control]` — 只持有场景读锁的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `origin` | 射线原点，世界坐标 3 分量（场景单位）。必须为有限值 |
| `direction` | 射线方向 3 分量。引擎会归一化，因此不必是单位向量，但必须为有限值且不是零向量 |
| `maxDistanceMeters` | 最大距离（米，按场景单位 × `sceneRatio` 约定）。`<= 0` 或非有限值表示无限 |
| `outHit` | 接收结果的结构体。调用方填写 `structSize = sizeof(STRayHit)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STRayHit`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STRayHit)` — 由调用方填写 |
| `apiVersion` | `ST_ABI_VERSION` — 由调用方填写 |
| `hit` | `1` = 命中 / `0` = 未命中 |
| `distanceMeters` | 从原点到命中点的距离（米）。场景距离 × `sceneRatio`（创建选项，默认 1） |
| `point[3]` | 命中点。保持场景坐标系坐标（不做单位换算） |
| `normal[3]` | 命中三角形的单位几何法线。始终对齐为朝向 **射线原点一侧**，不保留网格绕序给出的符号 |
| `objectId` | 命中对象的 id（`STObjectId` 的 `v` 值）。未命中时为 `-1` |
| `meshId` | 该对象的网格 id（`STMeshId` 的 `v` 值）。未命中时为 `-1` |
| `triangleIndex` | 网格局部三角形索引。未命中时为 `-1` |
| `materialIndex` | 该三角形的材质索引（`STMaterialId` 的 `v` 值）。未命中时为 `-1` |
| `reserved[6]` | 保留 |

未命中（`hit == 0`）时 `distanceMeters`·`point`·`normal` 为 0，四个 id 全部为 `-1`。`0` 是有效的 id，因此不用作未命中标记。id 字段是 `int32_t`，而不是句柄结构体。

**返回值** — `1` = 调用成功（是否命中由 `outHit->hit` 判断 — 未命中不是失败）/ `0` = 失败：`context`·指针为 NULL、版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）、`origin`·`direction` 为非有限值或 `direction` 为零向量（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_mesh_create</code> — 注册三角形网格并获取句柄</summary>

```c
STMeshId st_rt_mesh_create(STRT_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**用途** — 注册用作声学几何的三角形网格。网格是几何资源，要实际放入场景，需通过 `st_rt_object_create`/`st_rt_object_create_q` 创建引用该网格的对象（实例）。一个网格可由多个对象共享。

**调用方式** — 先注册要使用的材质再调用。材质指定方式二选一。

- `triangleMaterialIndices == NULL`：整个网格使用一个 `material`。
- `triangleMaterialIndices != NULL`：为每个三角形指定材质（数组长度 `mesh->numTriangles`）。此时忽略 `material` 参数。是否支持通过 `ST_CAP_PER_TRIANGLE_MATERIALS` 确认。

求交内核（`st_rt_scene_set_triangle_intersection`）、边拆分选项（`st_rt_scene_set_edge_split_collinear_overlaps`）、加速结构类型（`st_rt_scene_set_accel`）以此调用时刻的值固定到网格上。输入数组在调用期间被复制，因此返回后即可释放。线程：`[control, blocking]` — 编译声学边拓扑的较长独占区间，请勿在游戏循环或音频线程中调用。

绕序：求交是双面的，反射、透射与绕序无关，但部分衍射边判定（零厚度板的边采用、`st_rt_scene_set_solid_wedge_gate`）依赖绕序。请在单个网格内 **保持一致** 的绕序，并尽可能使法线朝向空气一侧。以镜像坐标系导入时，索引顺序也必须一并反转。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 网格几何（`STMesh`）。不可为 NULL |
| `material` | 整个网格的材质句柄。仅在 `triangleMaterialIndices` 为 NULL 时使用，必须是已注册的材质 |
| `triangleMaterialIndices` | 各三角形的材质索引数组（`numTriangles` 个，每个元素为已注册 `STMaterialId` 的 `v` 值）或 NULL |

**结构体** `STMesh`

| 字段 | 说明 |
|---|---|
| `numVertices` | 顶点数（> 0） |
| `vertices` | 顶点坐标 xyz 交错数组，`numVertices * 3` 个 float。场景单位（网格局部坐标系） |
| `numTriangles` | 三角形数（> 0） |
| `triangles` | 三角形顶点索引数组，`numTriangles * 3` 个 int。每个值在 `[0, numVertices)` 内 |

**返回值** — 网格句柄。失败时 `v < 0`：`mesh`·数组指针为 NULL 或数量为 0 及以下时为 `ST_STATUS_INVALID_ARGUMENT`，因索引越界、未注册的材质等导致网格被拒绝时为 `ST_STATUS_INVALID_MATERIAL`。

</details>

<details>
<summary><code>st_rt_object_create</code> — 以矩阵变换将网格放入场景</summary>

```c
STObjectId st_rt_object_create(STRT_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**用途** — 创建将已注册网格连同世界变换放入场景的对象（实例）。传播计算与 `st_rt_scene_raycast` 只看对象。若要以四元数给出旋转，请使用 `st_rt_object_create_q`。

**调用方式** — 在 `st_rt_mesh_create` 之后调用。通过 `isDynamic` 决定静态/动态。

- 静态（`0`）：进入由 `st_rt_build`（静态 + 动态整体构建）发布的静态 TLAS。添加、移除、变换更改在下一次 `st_rt_build` 之前不会反映到已发布的静态结构中。用于不移动的墙壁、地板等建筑几何。
- 动态（`1`）：进入动态对象 TLAS，变换更改无需整体构建，通过动态重建（refit，`st_rt_build_dynamic`）反映。用于门、车辆等移动几何。

线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 要放置的网格句柄 |
| `transform` | 局部→世界变换（`STTransform`）。为 NULL 时为恒等变换 |
| `isDynamic` | `0` = 静态 / 非 0 = 动态 |

**结构体** `STTransform`

| 字段 | 说明 |
|---|---|
| `m00, m01, m02` | 3x3 旋转·缩放矩阵第 1 行 |
| `m10, m11, m12` | 第 2 行 |
| `m20, m21, m22` | 第 3 行 |
| `tx, ty, tz` | 平移（场景单位） |

行优先（row-major），点以 **列向量** 相乘：`x' = m00*x + m01*y + m02*z + tx`、`y' = m10*x + m11*y + m12*z + ty`、`z' = m20*x + m21*y + m22*z + tz`（不是 `m00*x + m10*y + m20*z` 形式）。也接受非均匀缩放与行列式为负的变换（镜像、负缩放）。分量为非有限值或无法求逆的变换会被拒绝。坐标系为左手系，+Y up，+Z forward，+X right。

**返回值** — 对象句柄。失败时 `v < 0`（网格不存在、变换不可用等）。

</details>

<details>
<summary><code>st_rt_object_create_q</code> — 以位置、四元数、缩放将网格放入场景</summary>

```c
STObjectId st_rt_object_create_q(STRT_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**用途** — 创建与 `st_rt_object_create` 相同的对象，但以位置、旋转四元数、缩放（TRS）接收变换。用于将游戏引擎的变换不经矩阵转换直接传入。

**调用方式** — 在 `st_rt_mesh_create` 之后调用。静态/动态的含义与构建反映时机与 `st_rt_object_create` 相同。之后的变换通过 `st_rt_object_set_transform_q` 更新。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 要放置的网格句柄 |
| `position` | 世界位置 xyz（场景单位）。不可为 NULL |
| `quatXYZW` | 局部→世界旋转四元数，**XYZW 顺序**。由引擎归一化，范数小于 `1e-12` 时以恒等旋转代替。不可为 NULL |
| `scale` | 各轴缩放 xyz。以列缩放形式合成到旋转中（R·S），允许非均匀缩放。不可为 NULL |
| `isDynamic` | `0` = 静态 / 非 0 = 动态 |

**返回值** — 对象句柄。失败时 `v < 0`（指针为 NULL、网格不存在、变换不可用等）。

</details>

<details>
<summary><code>st_rt_object_set_transform</code> — 更改对象的矩阵变换</summary>

```c
void st_rt_object_set_transform(STRT_Context* context, STObjectId object, const STTransform* transform);
```

**用途** — 以矩阵更新已放置对象的局部→世界变换。

**调用方式** — 移动对象时调用。动态对象无需整体构建，通过动态重建反映。静态对象的更改会处于等待状态，在下一次 `st_rt_build` 时反映，因此每帧移动的几何应创建为动态（`isDynamic = 1`）。若要以四元数给出，请使用 `st_rt_object_set_transform_q`。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `object` | 目标对象句柄 |
| `transform` | 新变换。`STTransform` 字段参见 `st_rt_object_create` 条目。为 NULL 时不做任何事 |

**返回值** — 无。不存在的对象或不可用的变换（非有限值、不可求逆）会被忽略。

</details>

<details>
<summary><code>st_rt_object_set_transform_q</code> — 以位置、四元数、缩放更改对象变换</summary>

```c
void st_rt_object_set_transform_q(STRT_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**用途** — `st_rt_object_set_transform` 的 TRS 版本。直接传入游戏引擎变换（位置、四元数、缩放）来更新对象。

**调用方式** — 静态/动态各自的反映时机与 `st_rt_object_set_transform` 相同。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `object` | 目标对象句柄 |
| `position` | 世界位置 xyz（场景单位） |
| `quatXYZW` | 局部→世界旋转四元数，**XYZW 顺序**。由引擎归一化，范数小于 `1e-12` 时以恒等旋转代替 |
| `scale` | 各轴缩放 xyz（R·S 合成，允许非均匀） |

**返回值** — 无。任一指针为 NULL 时不做任何事，不存在的对象或不可用的变换会被忽略。

</details>

<details>
<summary><code>st_rt_mesh_destroy</code> — 移除网格及使用该网格的对象</summary>

```c
int st_rt_mesh_destroy(STRT_Context* context, STMeshId mesh);
```

**用途** — 从场景中移除已注册的网格资源。引用该网格的对象也会一并释放。

**调用方式** — 清理不再使用的几何时调用。若静态对象被一并移除，在下一次 `st_rt_build` 之前它仍留在已发布的静态结构中，因此移除后请调用 `st_rt_build` 以反映。已移除的句柄不再使用。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 要移除的网格句柄 |

**返回值** — `1` = 已移除 / `0` = 没有上下文或网格不存在。

</details>

<details>
<summary><code>st_rt_object_destroy</code> — 从场景中移除对象</summary>

```c
int st_rt_object_destroy(STRT_Context* context, STObjectId object);
```

**用途** — 将已放置的对象（实例）从场景中移除。所引用的网格资源保留。

**调用方式** — 成功后 `st_rt_scene_get_stats` 的 `objectCount` 立即减少。静态对象在下一次 `st_rt_build` 之前仍留在已发布的静态结构中，因此移除后请调用 `st_rt_build` 以反映。动态对象会从动态重建中移出。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `object` | 要移除的对象句柄 |

**返回值** — `1` = 已移除 / `0` = 没有上下文或对象不存在（已被移除）。

</details>

<details>
<summary><code>st_rt_mesh_set_material</code> — 在运行时更改整个网格的材质</summary>

```c
int st_rt_mesh_set_material(STRT_Context* context, STMeshId mesh, STMaterialId material);
```

**用途** — 将已注册网格的材质替换为另一个材质。用于不重建网格、只改变表面声学特性的情况。

**调用方式** — 场景构建后可随时调用。网格的所有三角形都将使用 `material`，创建时按三角形指定的材质也会改为这一个。材质无效时保留原材质。会反映到使用该网格的所有对象。线程：`[control]` — 仅限控制线程，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 目标网格句柄 |
| `material` | 新材质句柄（已注册的材质） |

**返回值** — `1` = 已更改 / `0` = 没有上下文、网格不存在或材质未注册。

</details>

</details>

<details>
<summary><strong>声源 — 创建、位置·方向·速度、指向性、路径门控·音量、射线预算</strong> — 21 个</summary>

<details>
<summary><code>st_rt_source_create</code> — 创建声源并返回句柄</summary>

```c
STSourceId st_rt_source_create(STRT_Context* context, const STSourceDesc* source);
```

**用途** — 在场景中注册一个声源，并返回之后所有 `st_rt_source_*` 调用所使用的 `STSourceId` 句柄。一次性确定位置、方向、速度、声压倍率、指向性配置以及动态/静态。

**调用方式** — 创建上下文后可随时调用。创建后附加音频输入（`st_rt_source_set_audio_file`、`st_rt_source_attach_stream` 等），移动的声源每帧通过 `st_rt_source_set_position` / `st_rt_source_set_velocity` 更新。创建后的初始状态：source energy 1.0、4 种路径音量 1.0、5 种路径类型门控全部开启、启用（enabled）、未休眠（`ST_RT_IDLE_RUNNING`）、无指向性表、输运更新步数 0（默认）、输运射线网格 16 × 8、每声源最大深度 4。orientation 设为与 `direction` 对齐的无 roll 最小旋转（`direction` 为 `{0,0,1}` 时为恒等）。线程：`[control]` — 可能持有场景锁，不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 创建描述符 `STSourceDesc`（见下）。为 NULL 则失败。此结构体没有 `structSize` / `apiVersion` 版本戳 |

**结构体** `STSourceDesc`

| 字段 | 说明 |
|---|---|
| `positionX`, `positionY`, `positionZ` | 世界位置。**保持场景单位**（引擎用 `sceneRatio` 换算为米）。必须为有限值 |
| `directionX`, `directionY`, `directionZ` | 声源正面（forward）方向。由引擎归一化，并据此方向以无 roll 方式设置声源 orientation（局部 forward = +Z）。零向量时为 +Z。必须为有限值 |
| `velocityX`, `velocityY`, `velocityZ` | 声源速度，场景单位/秒。在 Doppler 计算前换算为 m/s。必须为有限值 |
| `intensity` | 无量纲 **线性声压（pressure）倍率**。不是声强（W/m²）、SPL（dB）或校准后的 Pa。必须为有限值且不小于 0。能量域倍率另行通过 `st_rt_source_set_energy` 给出 |
| `directional` | `0` = 无指向（全频带 onAxis = offAxis = 1）。非 `0` = 简易指向配置（onAxis = 1，offAxis = 0）。要按频带精细设置，请在创建后使用 `st_rt_source_set_axis_attenuation` 或 `st_rt_source_set_directivity` |
| `isDynamic` | `1` = 动态声源（每帧重新计算混响），`0` = 静态声源（缓存混响并复用）。输运更新步数的默认值也由此值区分（参见 `st_rt_source_set_transport_refresh_steps`） |

**返回值** — 成功时为 `v >= 0` 的 `STSourceId`。失败为 **`v < 0`**，通过 `st_rt_get_last_status` 查看原因。
- `ST_STATUS_INVALID_ARGUMENT` — `source` 为 NULL，位置、方向、速度、`intensity` 中有非有限值，`intensity < 0`，或其他被引擎拒绝的情况。
- `ST_STATUS_BUDGET_EXCEEDED` — 超出声源内存预算（`STRT_CreateOptions.maxSources`、`st_rt_set_memory_budget` 的 `maxSources` · `sourceBudgetBytes`）时。仅在策略为 `ST_MEMORY_REJECT_NEW`（默认）时出现，若为 `ST_MEMORY_EVICT_FARTHEST`，则以与 `st_rt_source_destroy` 相同的路径驱逐离听者最远的声源并接受新声源（被驱逐的 id 见 `STMemoryStats.lastEvictedSource`）。是否支持通过 `st_rt_get_capability_word(1)` 的 `ST_CAP1_MEMORY_BUDGET` 确认。

</details>

<details>
<summary><code>st_rt_source_set_position</code> — 移动声源位置</summary>

```c
void st_rt_source_set_position(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 更新声源的世界位置。用于将移动的声源附着在游戏对象上跟随移动。

**调用方式** — 可在游戏循环中每帧调用。知道速度的宿主也应同时更新 `st_rt_source_set_velocity`。线程：`[control]` — 在 `ST_RT_SCHEDULER_PIPELINED` 下放入运动队列后返回，不要在音频回调中调用。不能用于扬声器组成员声源（会被忽略且 `last_status` = `ST_STATUS_INVALID_ARGUMENT`）— 请使用扬声器组的姿态更新。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `x`, `y`, `z` | 新的世界位置，**场景单位**（不做坐标转换） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_set_direction</code> — 更改声源正面方向</summary>

```c
void st_rt_source_set_direction(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 更改声源的正面（forward）方向。锥形衰减（`st_rt_source_set_axis_attenuation`）与指向性表（`st_rt_source_set_directivity`）以此方向为基准应用。

**调用方式** — 可随时调用。此 setter 会同时将声源 orientation 更新为“从 +Z 转向该方向的 **无 roll 最小旋转**”。需要 roll 的指向性表（左右不对称的声源等）请改用 `st_rt_source_set_orientation_q`。线程：`[control]`。不能用于扬声器组成员声源（忽略，`ST_STATUS_INVALID_ARGUMENT`）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `x`, `y`, `z` | 世界坐标下的正面方向向量。坐标系为 +X right · +Y up · +Z forward |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_set_velocity</code> — 设置声源速度</summary>

```c
void st_rt_source_set_velocity(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 更新声源的移动速度。引擎将此值用于 Doppler 计算。

**调用方式** — 以与位置更新相同的周期调用。线程：`[control]` — 在 `ST_RT_SCHEDULER_PIPELINED` 下放入运动队列后返回。不能用于扬声器组成员声源（忽略，`ST_STATUS_INVALID_ARGUMENT`）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `x`, `y`, `z` | 速度向量，**场景单位/秒**。引擎用 `sceneRatio` 换算为 m/s |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_destroy</code> — 删除声源</summary>

```c
int st_rt_source_destroy(STRT_Context* context, STSourceId source);
```

**用途** — 从场景中移除声源并清理其渲染状态。从声源内存预算中收回名额也通过此调用。

**调用方式** — 对不再使用的声源调用。若正在渲染，会以 3 ms 斜坡降低声音后回收渲染状态。被删除声源的每声源休眠（`st_rt_source_idle`）设置也一并消失。线程：`[control]`。不能删除扬声器组成员声源（`0`，`ST_STATUS_INVALID_ARGUMENT`）— 应删除扬声器组。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 要删除的声源句柄 |

**返回值** — `1` = 已移除 / `0` = 失败（上下文为 NULL、声源不存在、扬声器组成员）。

</details>

<details>
<summary><code>st_rt_source_set_path_enabled</code> — 开关单个声源的路径类型</summary>

```c
void st_rt_source_set_path_enabled(STRT_Context* context, STSourceId source, int pathType, int enabled);
```

**用途** — 针对单个声源，将特定路径类型（直达、透射、反射、衍射、混响）从计算与贡献中移除或重新加入。是全局门控 `st_rt_set_path_type_enabled` 的每声源版本。用于只去掉特定声源混响之类的表现或试听 A/B 对比。

**调用方式** — 可随时调用。默认 5 种全部开启。若不想完全移除路径而只减小大小，请使用 `st_rt_source_set_path_volume`（`STSourceVolumeKind`：`ST_SOURCE_VOLUME_DIRECT`（0，含透射）/ `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3)，线性声压倍率）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb。超出范围的值被忽略 |
| `enabled` | `0` = 关闭，非 `0` = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_is_path_enabled</code> — 读取单个声源的路径类型门控</summary>

```c
int st_rt_source_is_path_enabled(STRT_Context* context, STSourceId source, int pathType);
```

**用途** — 查询通过 `st_rt_source_set_path_enabled` 设置的每声源路径门控的当前值。

**调用方式** — 可随时调用。线程：`[control]` — 只持有场景读锁的纯查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |

**返回值** — `1` = 开启 / `0` = 关闭。上下文为 NULL、声源不存在、`pathType` 超出范围时也返回 `0`。

</details>

<details>
<summary><code>st_rt_source_set_energy</code> — 设置声源的能量倍率</summary>

```c
int st_rt_source_set_energy(STRT_Context* context, STSourceId source, float energy);
```

**用途** — 以 **energy-domain**（无量纲能量比）倍率设置声源的相对辐射能量。这是与 `STSourceDesc::intensity`（声压倍率）不同的倍率，也是在以 `ST_DIRECTIVITY_POWER_MEAN` 归一化指向性表时设定总辐射功率的位置。

**调用方式** — 创建后可随时调用。默认值为 1.0。能量与声压的关系为 **energy = gain²** — 若想要声压增益 g，则传入 `g * g`（例：−6 dB，g ≈ 0.5 → energy ≈ 0.25）。引擎只在渲染边界处取一次平方根。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `energy` | 能量倍率。有限值且不小于 0。默认 1.0 |

**返回值** — `1` = 已应用 / `0` = 失败（上下文为 NULL、非有限值或负数、声源不存在）。

</details>

<details>
<summary><code>st_rt_source_get_energy</code> — 读取声源的能量倍率</summary>

```c
float st_rt_source_get_energy(STRT_Context* context, STSourceId source);
```

**用途** — 查询通过 `st_rt_source_set_energy` 设置的能量倍率（energy-domain）。

**调用方式** — 可随时调用。线程：`[control]` — 只持有场景读锁的纯查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |

**返回值** — 当前能量倍率（默认 1.0）。上下文为 NULL 或声源不存在时返回 `-1.0`。

</details>

<details>
<summary><code>st_rt_source_set_enabled</code> — 开关整个声源</summary>

```c
void st_rt_source_set_enabled(STRT_Context* context, STSourceId source, int enabled);
```

**用途** — 不删除声源，将其整体移出或重新加入传播计算的总开关。位于各路径类型门控（`st_rt_source_set_path_enabled`）之上。

**调用方式** — 可随时调用。创建后为开启。要触发（`st_rt_source_trigger`）片段的声源应保持开启使用。若要让暂时无内容可播放的声源连同状态一起休眠，请使用 `st_rt_source_idle`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `enabled` | `0` = 关闭，非 `0` = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_set_ray_count</code> — 设置声源的输运射线网格大小</summary>

```c
void st_rt_source_set_ray_count(STRT_Context* context, STSourceId source, int width, int height);
```

**用途** — 设置此声源发射的输运（diffuse transport）射线网格 N = `width` × `height`。这是按声源调节质量与计算开销的手柄。

**调用方式** — 创建后可随时调用。默认网格为 16 × 8。射线数越多开销越大，若要将该开销分摊到多次传播，请一并使用 `st_rt_source_set_transport_refresh_steps`。值为 0 及以下或超出引擎的输运预算（取决于网格、深度的上限）时会被拒绝，`last_status` 中留下 `ST_STATUS_INVALID_ARGUMENT`（原因见 `st_rt_get_last_error`）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `width` | 网格水平射线数，至少 1。默认 16 |
| `height` | 网格垂直射线数，至少 1。默认 8 |

**返回值** — 无。是否成功通过 `st_rt_get_last_status` 确认。

</details>

<details>
<summary><code>st_rt_source_set_depth</code> — 设置每声源最大反射深度</summary>

```c
void st_rt_source_set_depth(STRT_Context* context, STSourceId source, int depth);
```

**用途** — 设置此声源输运射线的最大反射（反弹）深度。与 `st_rt_source_set_ray_count` 一起决定每声源质量与开销。

**调用方式** — 创建后可随时调用。每声源默认值为 4。超出引擎的输运预算或允许范围时会被拒绝，`last_status` 中留下 `ST_STATUS_INVALID_ARGUMENT`（原因见 `st_rt_get_last_error`）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `depth` | 最大反射深度。默认 4 |

**返回值** — 无。是否成功通过 `st_rt_get_last_status` 确认。

</details>

<details>
<summary><code>st_rt_source_set_transport_refresh_steps</code> — 设置输运射线网格分几次传播更新</summary>

```c
int st_rt_source_set_transport_refresh_steps(STRT_Context* context, STSourceId source, int steps);
```

**用途** — 让此声源的输运射线网格 N（= `width` × `height`）**分 n 次传播** 更新。每次传播替换 ceil(N/n) 条射线，总开销为 Σ N/n。引擎不设全局预算上限，因此声源较多时由宿主通过 n 控制开销。是否支持通过 `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS` 确认。

**调用方式** — 创建后可随时调用。分摊网格时，未更新射线的方向在传播之间保持不变，使混响抽头平滑衔接；`steps = 1` 则每次传播都重新铺设整个网格，牺牲这种连续性换取完全确定性。不会引发 IR 重新转换，但值改变时会重新发布场景快照传给工作线程，输运缓存在下一次传播时重建。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `steps` | `0` = 默认（由调度器与 `isDynamic` 决定 — `ST_RT_SCHEDULER_PIPELINED` 为动态 8 · 静态 16，`ST_RT_SCHEDULER_SYNCHRONOUS` 为动态 1 · 静态 16）/ `1` = 每次传播全部重新追踪（不创建存储的确定性路径）/ `2` 及以上 = 分 n 次更新，使用时 clamp 到 `[1, N]`。负数会被拒绝 |

**返回值** — `1` = 成功 / `0` = 失败。负的 `steps` 为 `ST_STATUS_INVALID_ARGUMENT`，声源不存在为 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_rt_source_get_transport_refresh_steps</code> — 读取输运更新步数的存储值</summary>

```c
int st_rt_source_get_transport_refresh_steps(const STRT_Context* context, STSourceId source);
```

**用途** — 查询通过 `st_rt_source_set_transport_refresh_steps` 保存的值。

**调用方式** — 可随时调用。返回的是 **原样的存储值**（包括 0），而不是经过调度器默认值与网格 clamp 后的实际 n。线程：`[control]` — 只持有场景读锁的纯查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |

**返回值** — 保存的步数（`0` = 默认）。失败时返回 `-1`。

</details>

<details>
<summary><code>st_rt_source_set_axis_attenuation</code> — 按频带设置锥形（on/off-axis）指向衰减</summary>

```c
void st_rt_source_set_axis_attenuation(STRT_Context* context, STSourceId source, const float onAxis[ST_FREQUENCY_BANDS], const float offAxis[ST_FREQUENCY_BANDS]);
```

**用途** — 按 9 个频带设置声源正面（on-axis）与侧后方（off-axis）辐射的简单锥形指向性。在没有实测指向性数据时为声源提供大致的方向性。

**调用方式** — 创建后可随时调用。默认为无指向（全频带 1.0）。无指向传入 `onAxis[] = offAxis[] = 1.0`，简单指向传入 `onAxis[] = 1.0` / `offAxis[] = 0.0`（与 `STSourceDesc::directional` 的两种配置相同）。正面方向由 `st_rt_source_set_direction` / `st_rt_source_set_orientation_q` 决定。附加了指向性表（`st_rt_source_set_directivity`）期间使用该表，此锥形值会被保留，移除表后重新使用。线程：`[control]`。不能用于扬声器组成员声源（忽略，`ST_STATUS_INVALID_ARGUMENT`）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `onAxis` | 正面辐射衰减，`ST_FREQUENCY_BANDS`(9) 个，频带 63 Hz … 16 kHz。为 NULL 时不做任何更改 |
| `offAxis` | 侧后方辐射衰减，9 个。为 NULL 时不做任何更改 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_set_orientation_q</code> — 以四元数设置声源局部坐标系</summary>

```c
int st_rt_source_set_orientation_q(STRT_Context* context, STSourceId source, const float quatXYZW[4]);
```

**用途** — 以单位四元数（局部→世界）设置将声源局部坐标系放到世界中的旋转。与 `st_rt_source_set_direction` 不同，**连 roll 也能表达**，因此用于精确设定左右不对称指向性表的坐标系。是否支持通过 `ST_CAP_SOURCE_DIRECTIVITY` 确认。

**调用方式** — 创建后可随时调用。局部轴为 forward = +Z / up = +Y / right = +X。与 `st_rt_source_set_direction` 双向同步 — 调用此函数时 direction 一并更新为 forward(q)，调用 `st_rt_source_set_direction` 时 orientation 变为无 roll 最小旋转（以最后调用的一方为准）。四元数由引擎归一化，因此传入大致归一化的值即可。与指向性表（`st_rt_source_set_directivity`）配对使用。线程：`[control]`。扬声器组成员声源返回 `0`（`ST_STATUS_INVALID_ARGUMENT`）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `quatXYZW` | 局部→世界旋转四元数，**X、Y、Z、W 顺序**（与 `st_rt_object_create_q` 顺序相同） |

**返回值** — `1` = 成功 / `0` = 失败。`ST_STATUS_INVALID_ARGUMENT`（非有限分量或退化，norm &lt; 1e-12），`ST_STATUS_NOT_FOUND`（声源不存在）。

</details>

<details>
<summary><code>st_rt_source_set_directivity</code> — 为声源附加或移除指向性表</summary>

```c
int st_rt_source_set_directivity(STRT_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**用途** — 为声源附加从实测数据等获得的按方向、按频带的辐射能量表。在使用锥形公式（`st_rt_source_set_axis_attenuation`）无法表达的真实声源指向模式时需要。是否支持通过 `ST_CAP_SOURCE_DIRECTIVITY` 确认。

**调用方式** — 创建后可随时调用。引擎会 **复制** 表，并在此调用中一次性计算归一化标量，因此返回后可释放宿主缓冲区。附加表期间使用表而非锥形衰减，以 `table = NULL` 移除后恢复为保留的锥形值。表的查询方向以声源局部坐标系为基准，因此与 `st_rt_source_set_orientation_q` 配对使用。线程：`[control]`。扬声器组成员声源返回 `0`（`ST_STATUS_INVALID_ARGUMENT`）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |
| `table` | 指向性表 `STSourceDirectivity`（见下）。调用方填写 `structSize` / `apiVersion`。NULL = 移除表 |

**结构体** `STSourceDirectivity`

声源局部坐标系（forward = +Z，up = +Y，right = +X）下等角方位角（az）× 仰角（el）节点网格 × 9 频带的 **能量** 表。方向约定与引擎全局相同：az = atan2(x, z)（正面 0°，右侧 +90°），el = asin(y)（向上 = +）。节点为 az_i = i × 360/`azCount`（在 360° 处 wrap），el_j = −90 + j × 180/(`elCount` − 1)，查询为 az wrap · el clamp 的双线性插值。`elCount` 为奇数时水平面（el = 0）落在节点上，推荐网格为 5° 间隔（`azCount` = 72，`elCount` = 37）。

| 字段 | 说明 |
|---|---|
| `structSize` | 调用方以 `sizeof(STSourceDirectivity)` 填写 |
| `apiVersion` | 调用方以 `ST_ABI_VERSION` 填写 |
| `azCount` | 方位角节点数，`[3, 361]` |
| `elCount` | 仰角节点数，`[2, 181]` |
| `levelMode` | `STDirectivityLevelMode` — 表的绝对电平解释（见下） |
| `reserved0` | 保留 |
| `energy` | 表数据，`elCount` × `azCount` × `ST_FREQUENCY_BANDS` 个 float。布局为 `[el][az][band]`（band 为最快变化的轴）。**energy-domain**（不是 pressure），所有值必须为有限值且不小于 0 |
| `reserved[6]` | 保留 |

**枚举** `STDirectivityLevelMode` — raw 表保持不变，只改变引擎在设置时一次性计算的各频带归一化标量。

| 值 | 说明 |
|---|---|
| `ST_DIRECTIVITY_ABSOLUTE` (0) | 不归一化，直接使用原值。用于包含绝对电平的实测表 |
| `ST_DIRECTIVITY_POWER_MEAN` (1) | 归一化使各频带球面功率平均为 1（等辐射功率）。用于只使用指向模式、另以 `intensity` / `st_rt_source_set_energy` 设定总辐射功率的情况。**默认推荐** |
| `ST_DIRECTIVITY_ON_AXIS` (2) | 归一化使正面（az = 0，el = 0）的值为 1。对应游戏工具中锥形的惯例 |

**返回值** — `1` = 成功（含移除表成功）/ `0` = 失败。`last_status`：
- `ST_STATUS_VERSION_MISMATCH` — `table` 的 `structSize` / `apiVersion` 不一致。
- `ST_STATUS_INVALID_ARGUMENT` — `levelMode` 不在 `STDirectivityLevelMode` 范围内、`azCount` · `elCount` 超出范围、`energy` 为 NULL、`energy` 中有非有限或负数元素（原因见 `st_rt_get_last_error`）、扬声器组成员。
- `ST_STATUS_NOT_FOUND` — 声源不存在。

</details>

<details>
<summary><code>st_rt_source_idle</code> — 让单个声源休眠</summary>

```c
int st_rt_source_idle(STRT_Context* context, STSourceId source);
```

**用途** — 与引擎整体休眠（`st_rt_idle`）分开，只停止单个声源的计算与渲染。用于将播放结束但很快会再用的声源无开销地保留而不删除。是否支持通过 `st_rt_get_capability_word(1)` 的 `ST_CAP1_ENGINE_IDLE` 确认。

**调用方式** — 在该声源停止发声（stop · pause · 写入 0）后调用。刚创建的声源为 RUNNING（即使引擎整体为 IDLE）。
- 调用后传播通道（direct · 反射/衍射 · 混响）不再计算该声源，并冻结最后的结果。休眠期间即使听者或声源移动，该声源的传播路径也保持原位；若房间（静态·动态几何）发生变化，则重新计算一次后再冻结。
- `ST_RT_IDLE_DRAINING` 期间渲染会输出该声源剩余的声音（尾音）。若输入持续发声，则以 DRAINING 继续渲染。
- 输入在延迟线长度（max delay）+ 1 s 内保持静音时变为 `ST_RT_IDLE_IDLE`，渲染既不读取也不渲染该声源的输入，并将其移出 IR 组装（共享混响箱的尾音会延续）。
- 可同时休眠的声源最多 128 个。以相同值重复调用不做任何事。
- 冻结传播的是 `ST_RT_SCHEDULER_PIPELINED`。在 `ST_RT_SCHEDULER_SYNCHRONOUS` 下 `st_rt_propagate` 也会计算休眠的声源，只有渲染侧休眠相同。
- 扬声器组成员的休眠由扬声器组所有，因此使用 `st_rt_speaker_set_idle` / `_run`。

线程：`[control]` — 持有场景锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 要休眠的声源句柄 |

**返回值** — `1` = 成功 / `0` = 失败：上下文为 NULL、声源不存在（`ST_STATUS_NOT_FOUND`）、扬声器组成员（`ST_STATUS_INVALID_ARGUMENT`）、同时休眠表已满（`ST_STATUS_UNAVAILABLE`，不做任何更改）。

</details>

<details>
<summary><code>st_rt_source_run</code> — 重新运行休眠的声源</summary>

```c
int st_rt_source_run(STRT_Context* context, STSourceId source);
```

**用途** — 让通过 `st_rt_source_idle` 休眠的声源重新计算与渲染。是否支持通过 `ST_CAP1_ENGINE_IDLE` 确认。

**调用方式** — 在重新播放该声源之前调用。从下一次传播起重新计算，从下一个块起渲染。立即用保留的 IR 发声，从包含该声源的下一个 IR（组装一个周期之后）起使用新结果。休眠期间未读取的宿主流帧从原位置接续输出。若已是 RUNNING 则不做任何事。线程：`[control]` — 持有场景锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 要唤醒的声源句柄 |

**返回值** — `1` = 成功 / `0` = 失败：上下文为 NULL、声源不存在（`ST_STATUS_NOT_FOUND`）、扬声器组成员（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_source_get_idle_state</code> — 读取声源的休眠状态</summary>

```c
int st_rt_source_get_idle_state(const STRT_Context* context, STSourceId source);
```

**用途** — 查询单个声源的休眠状态。用于在 `st_rt_source_idle` 之后确认尾音是否已输出完毕。

**调用方式** — 可随时调用。未请求休眠时为 RUNNING，渲染正在输出剩余声音时为 DRAINING，全部清空后为 IDLE。渲染未运行或引擎整体为 IDLE 时，已请求休眠的声源为 IDLE。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |

**返回值** — `STRT_IdleState` 值：`ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1) / `ST_RT_IDLE_IDLE`(2)。声源不存在或上下文为 NULL 时返回 `-1`。

</details>

<details>
<summary><code>st_rt_source_get_position_seconds</code> — 以秒读取声源输入的播放位置</summary>

```c
double st_rt_source_get_position_seconds(STRT_Context* context, STSourceId source);
```

**用途** — 以声源时间（秒）查询附加到声源的文件输入的当前播放位置。用于播放 UI 的进度显示或与 `st_rt_source_seek` 配合。是否支持通过 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 确认。

**调用方式** — 附加音频输入后可随时调用。值为以声源时间为基准的秒数，与 `hostSampleRate` 或音高无关。宿主流这类实时 PCM 输入的时间线由宿主拥有，因此没有位置。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 目标声源句柄 |

**返回值** — 播放位置（秒）。声源不存在或为实时输入时返回 `-1`。

</details>

</details>

<details>
<summary><strong>声源 — 音频输入（文件·片段·流）、播放控制、声源 EQ</strong> — 27 个</summary>

<details>
<summary><code>st_rt_source_clear_audio</code> — 从声源移除音频输入（文件、片段、宿主流）</summary>

```c
int st_rt_source_clear_audio(STRT_Context* context, STSourceId source);
```

**用途** — 分离附加到声源的音频输入。声源与渲染槽保留，只有该声源变为静音。文件输入（`st_rt_source_set_audio_file` 系列）与宿主流（`st_rt_source_attach_stream`）都属于“音频输入”，均通过此函数移除。

**调用方式** — 用于不删除声源而只切断声音，或在换成其他输入前先清空。分离以 3 ms 斜坡降低。分离流后的 `st_rt_source_write_stream` 不写入任何内容并返回 `0`。不要在同一声源上与 `st_rt_source_write_stream` 同时调用。删除声源的 `st_rt_source_destroy` 也会一并分离输入，因此无需事先调用此函数。扬声器组成员声源会被拒绝（`ST_STATUS_INVALID_ARGUMENT`）。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id（`STSourceId`，`st_rt_source_create` 返回的值） |

**返回值** — `1` = 已分离 / `0` = 失败（上下文为 NULL、声源不存在、扬声器组成员等）。

</details>

<details>
<summary><code>st_rt_source_set_eq</code> — 对声源原始信号施加 9 频带图形 EQ</summary>

```c
int st_rt_source_set_eq(STRT_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 对声源信号施加各频带增益以校正音色。滤波器位于分频器之前，即作用于声源信号本身，因此该声源的直达、透射、反射、衍射、混响发送都经过同一滤波器（等同于在实际扬声器信号链上加 EQ）。与输出级 EQ（`st_rt_render_set_eq`）采用相同滤波器设计，与离线 `st_off_source_set_eq` 为相同实现。

**调用方式** — 创建声源后可随时调用，播放中也可。不会使 IR 失效，以无分配的命令传递给渲染线程。播放中更改时保持滤波器状态，只立即替换系数（不做平滑斜坡 — 需要无爆音切换时请使用 `st_rt_source_set_parametric_eq`）。此函数与 `st_rt_source_set_parametric_eq` 修改的是 **同一个声源 EQ**，以最后调用的一方为准。传入 `gainsDb = NULL` 会关闭并清除 EQ（以参数式设置的 EQ 也通过此方式清除）。设置保持到删除声源为止。也可用于扬声器组成员声源。是否支持通过 `ST_CAP_SOURCE_EQ`（`st_rt_get_capability_word(0)`）确认。线程：`[control]` — 会短暂持有场景读锁与渲染控制锁，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `gainsDb` | `ST_FREQUENCY_BANDS`(9) 个增益（dB），频带顺序 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz。每个值必须为有限值且在 `[-ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`（±24 dB）内 — 超出则不钳位而是拒绝。`NULL` 或全频带 0 dB 时关闭 EQ（与无 EQ 的结果位一致） |

**滤波器定义** — 每个频带一个 RBJ peaking biquad（Q = 1.414，约 1 个倍频程），按频带升序串联。采样率固定为引擎内部 44100 Hz，与宿主采样率（`hostSampleRate`）无关。`|g| ≤ 1e-4 dB` 的频带被跳过。相邻频带的响应会重叠（峰值滤波器裙边），因此若要在频带中心精确达到指定增益，需由宿主对增益进行补偿后传入。

**返回值** — `1` = 成功 / `0` = 失败。失败时 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（非有限值或 `|g| > 24`，不做任何更改）/ `ST_STATUS_NOT_FOUND`（声源不存在）/ `ST_STATUS_UNAVAILABLE`（此上下文的后端不支持声源 EQ）。

</details>

<details>
<summary><code>st_rt_source_get_eq</code> — 以 9 频带增益读取声源 EQ</summary>

```c
int st_rt_source_get_eq(STRT_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 以 9 频带图形视图返回当前声源 EQ。声源 EQ 只有一个，此函数是以 9 频带增益显示其频带列表的兼容视图。

**调用方式** — 没有 EQ 或 EQ 关闭时全部写入 0。若为 9 频带形态（canonical 中心频率·Q 1.414 的 `ST_PARAMETRIC_EQ_PEAKING` 9 个·前置放大 0·开启），则写入其增益。其他参数式设置无法用 9 频带表示，因此返回 `0` + `ST_STATUS_UNAVAILABLE`，且不修改 `outGainsDb`。要区分 `UNAVAILABLE` 的含义，请调用 `st_rt_source_get_parametric_eq` — 成功则表示“是参数式设置，无法以 9 频带读取”（设置通过该函数读取），若以相同的 `UNAVAILABLE` 失败，则表示后端不支持声源 EQ。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `outGainsDb` | 调用方拥有的 `float[ST_FREQUENCY_BANDS]` 输出缓冲区（63…16k Hz 顺序，dB）。为 `NULL` 则拒绝 |

**返回值** — `1` = 成功 / `0` = 失败。失败时 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（`outGainsDb` 为 NULL）/ `ST_STATUS_NOT_FOUND`（声源不存在）/ `ST_STATUS_UNAVAILABLE`（上述两种情况）。

</details>

<details>
<summary><code>st_rt_source_set_parametric_eq</code> — 对声源原始信号施加最多 16 频带参数式 EQ</summary>

```c
int st_rt_source_set_parametric_eq(STRT_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 对声源信号施加直接指定频带类型、频率、增益、Q 的参数式 EQ。施加位置与 `st_rt_source_set_eq` 相同（分频器之前，该声源的所有路径），且是 **同一个 EQ**。用于虚拟扬声器等每个声源需要不同频率校正的情况。

**调用方式** — 创建声源后可随时调用，播放中也可。不会使 IR 失效，以无分配的命令传递给渲染线程。值改变时，新旧设置会并行运行 20 ms 并对输出交叉淡化，因此不会产生爆音。期间再次更改时只保留最新的一个值等待，随后接续切换。此函数与 `st_rt_source_set_eq` 都会替换声源 EQ 的整个列表，以最后调用的 setter 为准。关闭的列表、无效果的列表也会被保存，getter 原样返回 — 要关闭并清除，请调用 `st_rt_source_set_eq(context, source, NULL)`。也可直接用于扬声器组成员声源（通过 `st_rt_speaker_set_get_source` 获得的 id），从而为每个虚拟扬声器施加不同的校正。AutoEq `ParametricEQ.txt` 可通过 `st_rt_render_parse_autoeq_parametric` 读取并将结果直接传入。设置保持到删除声源为止。是否支持通过 `ST_CAP1_SOURCE_PARAMETRIC_EQ`（`st_rt_get_capability_word(1)`）确认。线程：`[control]` — 持有场景读锁与渲染控制锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `bands` | `STParametricEqBand` 数组（`bandCount` 个）。`bandCount = 0` 时可为 `NULL` |
| `bandCount` | 频带数，`[0, ST_PARAMETRIC_EQ_MAX_BANDS]`（0~16）。超出范围则拒绝 |
| `preampDb` | 施加在频带之前的线性增益（dB），`[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[-48, +12]`。主要用途是用于防止削波的负值 |
| `enabled` | `0` = 保存列表但直通（等同于无 EQ）/ 其他 = 开启 |

**结构体** `STParametricEqBand`（32 字节，作为数组元素没有版本戳）

| 字段 | 说明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5)。未知值会被拒绝 |
| `enabled` | `0` = 跳过此频带（恒等）/ 其他 = 开启 |
| `frequencyHz` | PEAKING·NOTCH 为中心频率，搁架为中点频率，LP·HP 为转折频率。`[ST_PARAMETRIC_EQ_MIN_FREQUENCY_HZ, min(ST_PARAMETRIC_EQ_MAX_FREQUENCY_HZ, 0.49·Fs)]` = 20 Hz ~ 20 kHz（Fs = 44100） |
| `gainDb` | 仅 PEAKING·LOW_SHELF·HIGH_SHELF 使用（LP·HP·NOTCH 只保存值）。`[-ST_PARAMETRIC_EQ_MAX_GAIN_DB, +ST_PARAMETRIC_EQ_MAX_GAIN_DB]` = ±24 dB |
| `q` | `[ST_PARAMETRIC_EQ_MIN_Q, ST_PARAMETRIC_EQ_MAX_Q]` = 0.1 ~ 30。LOW_SHELF·HIGH_SHELF 为 `[0.1, ST_PARAMETRIC_EQ_MAX_SHELF_Q]` = 0.1 ~ 3 — 大增益搁架配大 Q 会在拐角处产生很大的谐振峰，而声源 EQ 位于限幅器之前，无从抑制 |
| `reserved[3]` | 必须为 0（否则拒绝） |

**滤波器定义** — 每个频带一个 RBJ Audio EQ Cookbook 二阶节，链路为前置放大 → 频带 0…`bandCount-1` 串联。采样率为引擎内部 44100 Hz。`enabled = 0` 的频带与 `|gainDb| ≤ 1e-4` 的 PEAKING·搁架频带严格为恒等。整体关闭或无效果时（全频带恒等 + 前置放大 0 dB），在切换斜坡结束后与无 EQ 的结果位一致。

**值验证** — 非有限值、未知的 `type`、`reserved ≠ 0`、`bandCount` 超出范围、（`bandCount > 0` 时）`bands` 为 NULL 会被拒绝且不做任何更改。有限值超出范围时会被 **钳位**，getter 返回钳位后的实际值（与 9 频带 `st_rt_source_set_eq` 不钳位而直接拒绝不同）。

**返回值** — `1` = 成功 / `0` = 失败。失败时 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（上述验证）/ `ST_STATUS_NOT_FOUND`（声源不存在）/ `ST_STATUS_UNAVAILABLE`（此上下文的后端不支持声源 EQ）。

</details>

<details>
<summary><code>st_rt_source_get_parametric_eq</code> — 读取声源 EQ 的频带列表、前置放大与开关状态</summary>

```c
int st_rt_source_get_parametric_eq(STRT_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 以钳位后的实际值返回声源 EQ 的当前设置。通过 `st_rt_source_set_eq`（9 频带）施加的设置也会读作 9 个 `ST_PARAMETRIC_EQ_PEAKING` 频带。没有 EQ 时为 0 个频带、关闭。

**调用方式** — 输出约定与 `st_rt_render_get_parametric_eq` 相同。`outBands = NULL` 时作为大小查询，不写频带，只填写数量、前置放大与开关状态后返回 `1`。将 `bandCapacity` 设为 `ST_PARAMETRIC_EQ_MAX_BANDS`(16) 则始终能容纳。返回频带的 `reserved` 填为 0。线程：`[control]` — 持有场景读锁与渲染控制锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `outBands` | 调用方拥有的 `STParametricEqBand` 数组。为 `NULL` 时为大小查询。字段参见 `st_rt_source_set_parametric_eq` 条目 |
| `bandCapacity` | `outBands` 元素数。负数则拒绝。小于频带数时返回 `0` + `ST_STATUS_BUFFER_TOO_SMALL`（仍写入数量、前置放大与开关状态） |
| `outBandCount` | 接收频带数的指针。为 `NULL` 时跳过 |
| `outPreampDb` | 接收前置放大（dB）的指针。为 `NULL` 时跳过 |
| `outEnabled` | 接收开关状态（`0`/`1`）的指针。为 `NULL` 时跳过 |

**返回值** — `1` = 成功 / `0` = 失败。失败时 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（`bandCapacity < 0`）/ `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_NOT_FOUND`（声源不存在）/ `ST_STATUS_UNAVAILABLE`（此上下文的后端不支持声源 EQ）。

</details>

<details>
<summary><code>st_rt_source_set_path_volume</code> — 设置声源各路径类型的音量</summary>

```c
int st_rt_source_set_path_volume(STRT_Context* context, STSourceId source, int volumeKind, float volume);
```

**用途** — 分别增大或减小一个声源的直达声、反射、衍射、混响贡献。值为线性声压倍率。直达声音量也包括透射路径，混响音量只调节 **此声源发送到** 听者共享的后期混响的量。

**调用方式** — 创建声源后可随时调用。创建后 4 种均为 `1.0`。要完全移除路径请使用 `st_rt_source_set_path_enabled`，声源整体电平请使用 `st_rt_source_set_volume`。也可用于扬声器组成员声源。是否支持通过 `ST_CAP_SOURCE_PATH_VOLUME` 确认。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`（0，含透射）/ `ST_SOURCE_VOLUME_REFLECTION`(1) / `ST_SOURCE_VOLUME_DIFFRACTION`(2) / `ST_SOURCE_VOLUME_REVERB`（3，发送到共享后期混响）。其他值会被拒绝 |
| `volume` | 线性声压倍率，有限且不小于 `0`。默认 `1.0` |

**返回值** — `1` = 已应用 / `0` = 失败（未知的 `volumeKind`、非有限或负数的 `volume`、声源不存在）。

</details>

<details>
<summary><code>st_rt_source_get_path_volume</code> — 读取声源各路径类型的音量</summary>

```c
float st_rt_source_get_path_volume(STRT_Context* context, STSourceId source, int volumeKind);
```

**用途** — 返回通过 `st_rt_source_set_path_volume` 设置的各路径类型线性音量。

**调用方式** — 可随时调用。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `volumeKind` | `STSourceVolumeKind` — `DIRECT`(0) / `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3) |

**返回值** — 线性音量（默认 `1.0`）。未知的 `volumeKind` 或上下文为 NULL 时返回 `-1`。

</details>

<details>
<summary><code>st_rt_source_set_audio_file</code> — 打开音频文件并作为声源输入附加</summary>

```c
int st_rt_source_set_audio_file(STRT_Context* context, STSourceId source, const char* audioPath, int loop);
```

**用途** — 由引擎直接打开并解码文件作为声源输入。这是宿主无需处理 PCM 的最简单输入方式。

**调用方式** — 创建声源后调用，附加后处于停止状态，从 `st_rt_source_play` 开始发声。声道混为单声道（立体声 = 1/√2·L + 1/√2·R）并转换为引擎采样率 44.1 kHz。若同一声源上附加了宿主流，文件输入会替换该流（之后 `st_rt_source_write_stream` 返回 `0`）。重复次数之后可通过 `st_rt_source_set_loop_count` 更改。扬声器组成员声源会被拒绝。线程：`[control, blocking]` — 会打开文件并创建解码器，请勿在游戏循环或音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `audioPath` | 文件路径，**UTF-8**（Windows 上也是 — 可使用含非 ASCII 字符的路径）。支持：WAV（PCM·float·ADPCM·µ-law·A-law，RF64·W64）、FLAC、MP3、Ogg Vorbis。Ogg Opus·AAC/M4A·ALAC·WMA 无法打开而失败 |
| `loop` | `0` = 播放一次 / 其他 = 无限循环 |

**返回值** — `1` = 已附加输入 / `0` = 失败（路径为 NULL、无法打开的文件或不支持的格式、声源不存在、扬声器组成员等）。

</details>

<details>
<summary><code>st_rt_source_set_audio_asset</code> — 将宿主资源系统的编码文件作为流式输入附加</summary>

```c
int st_rt_source_set_audio_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io, int repeatCount);
```

**用途** — 让无法通过 OS 路径打开的音频（如游戏引擎的包文件、虚拟文件系统）通过宿主回调读取。使用与 `st_rt_source_set_audio_file` 相同的解码器（WAV/FLAC/MP3/Vorbis），不预先读取整个文件，而是作为可寻址的流解码。

**调用方式** — 播放约定与 `st_rt_source_set_audio_file` 相同（附加后停止，通过 `st_rt_source_play` 开始）。回调表会被复制，但 `userData` 与宿主资源系统在输入附加期间必须保持有效。`open`/`close` 在控制线程上调用，`read`/`seek` 在本调用中的探测过程与单个解码器工作线程上调用。回调不得抛出异常或再次调用引擎 API。每次成功的 `open` 都会调用一次 `close`（包括解码器初始化失败的情况）。不同上下文可同时解码。附加失败时保留之前的输入。是否支持通过 `ST_CAP_AUDIO_ASSET_IO` 确认。扬声器组成员声源会被拒绝。线程：`[control, blocking]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `assetName` | 原样传给 `io->open` 的资源名称 |
| `io` | `STAudioAssetIO` 回调表。调用方填写 `structSize = sizeof(STAudioAssetIO)`、`apiVersion = ST_ABI_VERSION`，`reserved` 为 0 |
| `repeatCount` | 额外重复次数 — `0` = 一次 / `-1` = 无限 / 正数 N = 再重复 N 次 |

**结构体** `STAudioAssetIO`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STAudioAssetIO)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `userData` | 作为所有回调第一个参数传递的宿主指针 |
| `open` | `void* open(void* userData, const char* assetName)` — 打开资源并返回句柄 |
| `read` | `uint64_t read(void* userData, void* handle, void* output, uint64_t bytes)` — 返回读取的字节数（`0` = EOF，不得大于请求值） |
| `seek` | `int seek(void* userData, void* handle, int64_t offset, int origin)` — `origin` `0` = 以开头为基准 / `1` = 以当前位置为基准。`1` = 成功 / `0` = 错误 |
| `close` | `void close(void* userData, void* handle)` — 关闭句柄 |
| `reserved[2]` | 0 |

**返回值** — `1` = 已附加输入 / `0` = 失败（保留之前的输入）。

</details>

<details>
<summary><code>st_rt_source_set_audio_clip</code> — 将短文件整体解码后作为缓存片段附加</summary>

```c
int st_rt_source_set_audio_clip(STRT_Context* context, STSourceId source, const char* audioPath);
```

**用途** — 将短声音一次性完整解码为 44.1 kHz 单声道 PCM 并缓存在声源中。这是在重复发出同一声音时，不新建声源也不重新解码，而是在存活的声源上通过 `st_rt_source_trigger`（每次一次）或 `st_rt_source_set_retrigger_interval`（固定间隔）重新开始的输入。

**调用方式** — 格式与缩混与 `st_rt_source_set_audio_file` 相同，解码后的长度最多 60 秒。附加失败时保留之前的输入。成功时片段以暂停状态开始，重启间隔为 `0`、EOF 重复次数为 `0`，声源的音量与音高保持不变。是否支持通过 `ST_CAP_SOURCE_RETRIGGER` 确认。扬声器组成员声源会被拒绝。线程：`[control, blocking]` — 会解码整个文件，请勿在游戏循环或音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `audioPath` | 文件路径（UTF-8）。支持的格式参见 `st_rt_source_set_audio_file` 条目 |

**返回值** — `1` = 已附加片段 / `0` = 失败（保留之前的输入）。

</details>

<details>
<summary><code>st_rt_source_set_audio_clip_asset</code> — 将宿主资源整体解码后作为缓存片段附加</summary>

```c
int st_rt_source_set_audio_clip_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io);
```

**用途** — `st_rt_source_set_audio_clip` 的资源版本。将通过宿主回调（`STAudioAssetIO`）读取的编码数据完整解码为 44.1 kHz 单声道 PCM 并缓存。

**调用方式** — 行为与限制（最多 60 秒、以暂停开始、间隔 `0`·EOF 重复 `0`、保持音量与音高、失败时保留之前的输入）与 `st_rt_source_set_audio_clip` 相同。由于是缓存片段，回调全部在此调用内被调用并关闭 — `userData` 只需在此函数返回前保持有效。是否支持通过 `ST_CAP_SOURCE_RETRIGGER` 与 `ST_CAP_AUDIO_ASSET_IO` 确认。线程：`[control, blocking]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `assetName` | 传给 `io->open` 的资源名称 |
| `io` | `STAudioAssetIO` 回调表（调用方填写 `structSize`/`apiVersion`）。字段参见 `st_rt_source_set_audio_asset` 条目 |

**返回值** — `1` = 已附加片段 / `0` = 失败（保留之前的输入）。

</details>

<details>
<summary><code>st_rt_source_set_retrigger_interval</code> — 让缓存片段按固定间隔重新开始</summary>

```c
int st_rt_source_set_retrigger_interval(STRT_Context* context, STSourceId source, double seconds);
```

**用途** — 以输出时刻为基准，每隔起始到起始间隔 `seconds` 重新开始同一缓存片段。用于需要不受控制线程调用时机影响的规律重复音的情况。重新开始时声学路径、延迟、混响状态保持不变。

**调用方式** — 仅可用于通过 `st_rt_source_set_audio_clip`/`_clip_asset` 附加的缓存片段。间隔四舍五入到最接近的 44.1 kHz 输出采样，音高不改变间隔。更改在下一个输入读取边界生效，并完整开始一个新间隔。在 EOF 之后开启会重新开始片段。重新设置相同的（量化后）间隔时，进行中的时钟保持不变。给出 `0` 会取消之后的重新开始，当前正在发声的一次会播放到结束。`st_rt_source_play` 开始或恢复，`st_rt_source_pause` 停止时钟，`st_rt_source_stop` 会暂停并倒回但保留间隔设置。EOF 重复（`st_rt_source_set_loop_count`）与正间隔不能同时使用。重新开始时游标重置以 3 ms 过渡衔接，未结束的上一次发声会被替换而不混合。是否支持通过 `ST_CAP_SOURCE_RETRIGGER` 确认。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id（附加了缓存片段的声源） |
| `seconds` | 起始到起始间隔（秒）。正值范围为输出 1 个采样 ~ 3600 s。`0` = 关闭（默认） |

**返回值** — `1` = 成功 / `0` = 失败（无效值、声源不存在、输入不是缓存片段等）。

</details>

<details>
<summary><code>st_rt_source_get_retrigger_interval</code> — 读取缓存片段的重新开始间隔</summary>

```c
double st_rt_source_get_retrigger_interval(STRT_Context* context, STSourceId source);
```

**用途** — 以量化后的实际值（秒）返回通过 `st_rt_source_set_retrigger_interval` 设置的间隔。

**调用方式** — 可随时调用。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 量化后的间隔（秒）。`0` = 关闭 / `-1` = 声源不存在或不是缓存片段。

</details>

<details>
<summary><code>st_rt_source_trigger</code> — 请求缓存片段从头播放一次</summary>

```c
int st_rt_source_trigger(STRT_Context* context, STSourceId source);
```

**用途** — 配合一次外部事件，让存活声源的缓存片段从头重新开始。既不解码也不创建声源，因此在频繁发出短声音时用来代替新建声源。重新开始时声学延迟、反射、混响历史会照常延续。

**调用方式** — 必须已附加缓存片段，且重启间隔为 `0`、EOF 重复次数为 `0`。无需另外调用 `st_rt_source_play`。请求在上下文的初始声场被消费后的下一个引擎块开始，在此之前多次请求会合并为一次。`st_rt_source_pause`/`st_rt_source_stop`、成功的 `st_rt_source_seek`、间隔或重复设置的更改会取消等待中的请求。请保持声源处于开启状态（`st_rt_source_set_enabled`）以便渲染。游标在输入读取边界以 3 ms 过渡重置，未结束的上一次发声会被替换。`1` 表示已进入队列，并不表示已在设备上播放。是否支持通过 `ST_CAP_SOURCE_TRIGGER` 确认。扬声器组成员声源会被拒绝。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id（附加了缓存片段的声源） |

**返回值** — `1` = 已入队 / `0` = 拒绝（不是缓存片段、间隔或重复不为 0、声源不存在等）。

</details>

<details>
<summary><code>st_rt_source_seek</code> — 移动文件输入的播放位置</summary>

```c
int st_rt_source_seek(STRT_Context* context, STSourceId source, double seconds);
```

**用途** — 将文件、资源、片段输入的播放游标移动到以声源时间为基准的 `seconds`。

**调用方式** — 位置按原始文件帧向下取整，播放/暂停状态保持不变。丢弃解码器与音高预读，并重新填充已设置的重复次数。压缩格式的寻址精度受编解码器限制。宿主流（实时 PCM）的时间线由宿主拥有，因此会被拒绝。当前位置通过 `st_rt_source_get_position_seconds` 读取（以秒为单位，与 `hostSampleRate`·音高无关）。成功的寻址会取消等待中的 `st_rt_source_trigger` 请求。是否支持通过 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 确认。扬声器组成员声源会被拒绝。线程：`[control, blocking]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `seconds` | 声源时间位置（秒）。有限且不小于 `0` |

**返回值** — `1` = 成功 / `0` = 失败（无效值、声源不存在、不是文件输入等）。

</details>

<details>
<summary><code>st_rt_source_set_loop_count</code> — 设置文件输入的重复次数</summary>

```c
int st_rt_source_set_loop_count(STRT_Context* context, STSourceId source, int repeatCount);
```

**用途** — 设置文件、资源、片段输入到达末尾时回到开头再播放几次。

**调用方式** — 从当前游标位置重新填充重复预算。`st_rt_source_stop` 在倒回的同时恢复此预算。宿主流（实时 PCM）会被拒绝。在缓存片段上不能与正的重启间隔（`st_rt_source_set_retrigger_interval`）同时使用，更改重复设置会取消等待中的 `st_rt_source_trigger` 请求（触发要求重复次数为 `0`）。是否支持通过 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 确认。扬声器组成员声源会被拒绝。线程：`[control, blocking]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `repeatCount` | 额外重复次数 — `0` = 一次 / `-1` = 无限 / 正数 N = 再重复 N 次。小于 `-1` 则拒绝 |

**返回值** — `1` = 成功 / `0` = 失败（无效值、声源不存在、不是文件输入等）。

</details>

<details>
<summary><code>st_rt_source_get_loop_count</code> — 读取文件输入的重复次数</summary>

```c
int st_rt_source_get_loop_count(STRT_Context* context, STSourceId source);
```

**用途** — 返回已设置的额外重复次数。

**调用方式** — 可随时调用。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 重复次数（不小于 `0`）。`-1` = 无限 / `-2` = 声源不存在或不支持的输入。

</details>

<details>
<summary><code>st_rt_source_set_volume</code> — 设置声源输入的音量</summary>

```c
int st_rt_source_set_volume(STRT_Context* context, STSourceId source, float volume);
```

**用途** — 对声源输入信号施加线性声压增益。作用于声学路径与 DSP 处理 **之前**，因此该声源的所有路径（直达、反射、衍射、混响发送）一并改变。

**调用方式** — 对附加了音频输入的声源可随时调用，播放中也可。更改的值以 3 ms 斜坡过渡。各路径类型的比例另行通过 `st_rt_source_set_path_volume` 设置。是否支持通过 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 确认。扬声器组成员声源会被拒绝（成员电平由扬声器组 API 决定）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `volume` | 线性声压增益，`[0, 16]`，默认 `1`。超出范围、非有限值会被拒绝 |

**返回值** — `1` = 成功 / `0` = 失败（值超出范围、声源不存在或没有音频输入等）。

</details>

<details>
<summary><code>st_rt_source_get_volume</code> — 读取声源输入的音量</summary>

```c
float st_rt_source_get_volume(STRT_Context* context, STSourceId source);
```

**用途** — 返回通过 `st_rt_source_set_volume` 设置的线性音量。斜坡进行中时为斜坡的目标值。

**调用方式** — 可随时调用，也可用于扬声器组成员声源。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 线性音量（默认 `1`）。`-1` = 声源不存在。

</details>

<details>
<summary><code>st_rt_source_set_pitch</code> — 设置声源输入的播放速度（音高）</summary>

```c
int st_rt_source_set_pitch(STRT_Context* context, STSourceId source, float ratio);
```

**用途** — 按播放速度比率加快/放慢读取输入以改变音高。不做时间伸缩，因此文件的播放时长或宿主流环的消耗速度也随之改变。

**调用方式** — 对附加了音频输入的声源可随时调用。若宿主送入的信号已自行改变过音高，请避免重复施加。非 1 的比率使用带限 sinc 插值，产生最多 67 帧的预读。缓存片段的重启间隔不受音高影响。是否支持通过 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 确认。扬声器组成员声源会被拒绝。线程：`[control]` — 会生成滤波器系数，请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `ratio` | 播放速度比率，`[0.25, 4]`，默认 `1`。超出范围、非有限值会被拒绝 |

**返回值** — `1` = 成功 / `0` = 失败（值超出范围、声源不存在或没有音频输入等）。

</details>

<details>
<summary><code>st_rt_source_get_pitch</code> — 读取声源输入的播放速度比率</summary>

```c
float st_rt_source_get_pitch(STRT_Context* context, STSourceId source);
```

**用途** — 返回通过 `st_rt_source_set_pitch` 设置的播放速度比率。

**调用方式** — 可随时调用。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 播放速度比率（默认 `1`）。`-1` = 声源不存在。

</details>

<details>
<summary><code>st_rt_source_attach_stream</code> — 为声源附加由宿主推送 PCM 的流输入</summary>

```c
int st_rt_source_attach_stream(STRT_Context* context, STSourceId source, const STStreamDesc* desc);
```

**用途** — 将宿主实时生成的单声道 PCM（如语音聊天、合成音、外部中间件输出）用作声源输入。如果说文件输入是“引擎打开文件”，那么这里就是“宿主推送 PCM”。渲染主导权与音频设备仍由引擎掌握，引擎渲染线程拉取 512 帧块时从各声源的环形缓冲区读取（不是宿主推送渲染）。

**调用方式** — 创建声源后调用，随后通过 `st_rt_source_write_stream` 供给 PCM。生命周期与播放约定与文件输入相同：附加后处于停止状态，从 `st_rt_source_play` 开始发声，`st_rt_source_pause`/`st_rt_source_stop` 同样生效（`stop` 会丢弃环中积累的帧 — 实时流没有“倒回开头”）。分离由 `st_rt_source_clear_audio` 完成，`st_rt_source_destroy` 也会分离流并归还槽位。在同一声源上附加文件输入会替换流，反之此函数会替换文件输入。可同时附加的流为 64 个，归还的槽位由下一次 attach 复用（累计计数器在每次 attach 时从 0 重新计数）。环的分配只在此调用中发生一次。流上的 `st_rt_source_seek`·`st_rt_source_set_loop_count` 会被拒绝。是否支持通过 `ST_CAP_SOURCE_STREAM_INPUT`（仅实时）确认。扬声器组成员声源会被拒绝。线程：`[control]` — 持有场景读锁与播放互斥锁。不要针对同一声源与 `st_rt_source_write_stream` 同时调用（不同声源之间无关）。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |
| `desc` | `STStreamDesc`。调用方填写 `structSize = sizeof(STStreamDesc)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STStreamDesc`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STStreamDesc)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `sampleRate` | 输入采样率。必须为引擎采样率（`st_rt_get_sample_rate`，44100）。但在指定了 `STRT_CreateOptions.hostSampleRate` 的上下文中必须为该值，引擎会为每个声源在环前端加入宿主→引擎转换器 |
| `channels` | 只允许 `1`（仅单声道） |
| `capacityFrames` | 环大小，**宿主帧**（= 以 `sampleRate` 为基准）。`0` = 默认 8192 宿主帧（引擎采样率下约 186 ms），其他值为 `[512, 1048576]`。引擎将其换算为引擎帧（四舍五入）后向上取到 2 的幂，因此实际容量大于请求值 — 请通过 `STStreamStatus.capacityFrames` 确认 |
| `reserved[5]` | 0 |

**返回值** — `1` = 成功 / `0` = 失败。失败时 `st_rt_get_last_status`：`ST_STATUS_VERSION_MISMATCH`（`desc` 版本戳不一致）/ `ST_STATUS_INVALID_ARGUMENT`（`sampleRate` 不符合上述规则、`channels ≠ 1`、`capacityFrames` 既不是 0 也不在 `[512, 1048576]` 内）/ `ST_STATUS_NOT_FOUND`（声源不存在）/ `ST_STATUS_UNAVAILABLE`（64 个并发流槽位已用尽）。

</details>

<details>
<summary><code>st_rt_source_write_stream</code> — 向流输入环写入单声道 PCM</summary>

```c
int st_rt_source_write_stream(STRT_Context* context, STSourceId source, const float* mono, int frames);
```

**用途** — 向通过 `st_rt_source_attach_stream` 附加的声源的环形缓冲区写入单声道 float PCM。不阻塞，也不加锁、不分配，因此可在宿主音频线程上直接调用。

**调用方式** — 以每个声源 **单一生产者** 为前提，与渲染线程以 SPSC 方式交互 — 每个声源只能由一个线程写入。不要针对同一声源与 `st_rt_source_attach_stream`/`st_rt_source_clear_audio` 同时调用（不同声源之间无关）。失败时也不触碰诊断缓冲区（`st_rt_get_last_status`），只以 `0` 告知。不检查非有限采样（NaN/Inf），保证有限性是宿主的责任。返回值的含义取决于是否指定了 `hostSampleRate`，请按下文区分。线程：`[any]` — 可在任意线程调用且不阻塞。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 附加了流的声源 id |
| `mono` | 单声道 float PCM 缓冲区（`frames` 个） |
| `frames` | 要写入的帧数，**宿主帧**（以 `STStreamDesc.sampleRate` 为基准） |

**返回值** — 写入的帧数。未附加流或已分离时为 `0`。

- `hostSampleRate == 0`（无转换）：实际进入环的帧数（`0`…`frames`）。环满时其余部分被丢弃并累计到 `droppedFrames`。返回值小于 `frames` 时，可在下一次调用中重新推送剩余部分，因此可用作背压信号。
- `hostSampleRate ≠ 0`（重采样路径）：始终为 `frames`。转换器会消费全部输入，因此不得重新推送相同的帧（信号会重叠）。溢出丢弃的部分只通过 `droppedFrames` 报告，返回值中没有背压信号 — 请查看 `st_rt_source_get_stream_status` 的 `queuedFrames`/`capacityFrames` 调节供给量（例：`queuedFrames` 超过容量的 3/4 时减少推送量）。

</details>

<details>
<summary><code>st_rt_source_get_stream_status</code> — 读取流输入环的余量、欠载与丢弃统计</summary>

```c
int st_rt_source_get_stream_status(const STRT_Context* context, STSourceId source, STStreamStatus* outStatus);
```

**用途** — 返回流环中积累的量以及累计欠载、丢弃、写入量。在重采样路径（`hostSampleRate ≠ 0`）中，`st_rt_source_write_stream` 的返回值没有背压信号，因此 `queuedFrames` 与 `capacityFrames` 之比是唯一的供给调节信号。

**调用方式** — 正常路径只做 atomic 读取，因此可在包括音频线程在内的任意线程调用。但版本戳错误或流不存在的错误路径会写入上下文的诊断缓冲区，此写入在线程间不串行化 — 正确填写参数就不会走到这里。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 附加了流的声源 id |
| `outStatus` | `STStreamStatus` 输出。调用方填写 `structSize = sizeof(STStreamStatus)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STStreamStatus`

五个帧字段全部为 **宿主帧**（以 `STStreamDesc.sampleRate` = `hostSampleRate`，未指定时以 44100 为基准）。换算在查询时一次性四舍五入，因此误差不会累积。在 48 kHz 宿主上 `capacityFrames` 不是 2 的幂（例：引擎 8192 → 宿主 8916），因此不要假定环大小为 2 的幂。3 个累计计数器是自 attach 起的总和，重新 attach 时从 0 计数。

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STStreamStatus)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `queuedFrames` | 当前积累在环中的帧 |
| `capacityFrames` | 引擎实际分配的环容量 |
| `underrunFrames` | 累计：因环为空而以静音填充的帧 |
| `droppedFrames` | 累计：因环满而丢弃的帧 |
| `totalWrittenFrames` | 累计：实际进入环的帧 |
| `reserved[6]` | 保留 |

**返回值** — `1` = 成功 / `0` = 失败。失败时 `st_rt_get_last_status`：`ST_STATUS_VERSION_MISMATCH`（版本戳不一致）/ `ST_STATUS_NOT_FOUND`（未附加流）。`outStatus` 或上下文为 NULL 时也返回 `0`。

</details>

<details>
<summary><code>st_rt_source_play</code> — 开始或恢复声源输入的播放</summary>

```c
void st_rt_source_play(STRT_Context* context, STSourceId source);
```

**用途** — 开始文件、资源、片段、流输入的播放。附加输入后处于停止状态，因此要发声必须调用此函数。

**调用方式** — 附加音频输入后调用。实际声音在该声源的第一个 IR 到达渲染器之后才发出。若处于暂停状态则从该位置恢复，缓存片段的重启间隔时钟也会开始或恢复。只通过 `st_rt_source_trigger` 发声的片段不需要调用。对扬声器组成员声源会被忽略。线程：`[control]` — 持有播放互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_pause</code> — 暂停声源输入的播放</summary>

```c
void st_rt_source_pause(STRT_Context* context, STSourceId source);
```

**用途** — 保持当前游标位置并停止播放。通过 `st_rt_source_play` 从同一位置恢复。

**调用方式** — 游标立即停止，输出将最后波形的末端以 3 ms 斜坡降到 0，无爆音地切断。已在房间中扩散的混响可能继续鸣响。缓存片段的重启时钟也会停止，等待中的 `st_rt_source_trigger` 请求被取消。对扬声器组成员声源会被忽略。线程：`[control]` — 持有播放互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_source_stop</code> — 停止声源输入的播放并回到开头</summary>

```c
void st_rt_source_stop(STRT_Context* context, STSourceId source);
```

**用途** — 停止播放并将游标倒回开头。下一次 `st_rt_source_play` 从头播放。

**调用方式** — 输出与 `st_rt_source_pause` 一样以 3 ms 斜坡切断，已在房间中扩散的混响可能继续鸣响。文件输入在倒回的同时恢复已设置的重复次数。缓存片段保留重启间隔设置，等待中的 `st_rt_source_trigger` 请求被取消。宿主流没有可倒回的开头，因此丢弃环中积累的帧。对扬声器组成员声源会被忽略。线程：`[control]` — 持有播放互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 实时上下文句柄 |
| `source` | 目标声源 id |

**返回值** — 无。

</details>

</details>

<details>
<summary><strong>听者 · 传播 · 声学策略</strong> — 27 个</summary>

<details>
<summary><code>st_rt_listener_set_position</code> — 设置听者位置</summary>

```c
void st_rt_listener_set_position(STRT_Context* context, float x, float y, float z);
```

**用途** — 更改听者（收听者）的世界位置。所有声源的直达声、反射、衍射、混响路径都以此位置为终点计算。

**调用方式** — 在游戏循环中每当摄像机或玩家头部位置改变时调用。方向另行通过 `st_rt_listener_set_rotation` / `st_rt_listener_set_rotation_ypr` / `st_rt_listener_set_orientation_q` 给出，更改位置时方向保持不变。坐标 **保持场景单位** 传入（由引擎通过 `STRT_CreateOptions.sceneRatio` 换算为米）。线程：`[control]` — 在控制线程上调用，不要在音频回调中调用。在 `ST_RT_SCHEDULER_PIPELINED` 下不直接锁定场景，而是放入运动队列后返回，传播工作线程在下一个周期应用最新值。在 `ST_RT_SCHEDULER_SYNCHRONOUS` 下由下一次 `st_rt_propagate` 读取新位置。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `x` | 世界 X 坐标（场景单位，+X = right） |
| `y` | 世界 Y 坐标（场景单位，+Y = up） |
| `z` | 世界 Z 坐标（场景单位，+Z = forward） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_listener_set_velocity</code> — 设置听者速度（用于多普勒）</summary>

```c
void st_rt_listener_set_velocity(STRT_Context* context, float x, float y, float z);
```

**用途** — 告知听者的移动速度向量。引擎根据声源与听者速度计算各路径的多普勒斜率。

**调用方式** — 一般与位置一起每帧更新。速度以 **场景单位/秒** 传入，引擎乘以 `sceneRatio` 换算为 m/s 后再除以声速。静止的听者为 `(0, 0, 0)`。多普勒音高渲染本身由 `STRenderOptions.useDoppler` 负责，移动声源的辐射增益由 `st_rt_set_doppler_gain_mode` 负责。线程：`[control]` — 请勿在音频回调中调用。在 `PIPELINED` 下进入运动队列，在下一个传播周期应用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `x` | 速度 X 分量（场景单位/秒） |
| `y` | 速度 Y 分量（场景单位/秒） |
| `z` | 速度 Z 分量（场景单位/秒） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_listener_set_rotation</code> — 以 yaw·pitch（弧度）设置听者方向</summary>

```c
void st_rt_listener_set_rotation(STRT_Context* context, float yaw, float pitch);
```

**用途** — 以 yaw·pitch 设置听者头部方向。空间化（声像、HRTF、扬声器解码）的方位角与仰角以此方向为基准计算。不表达 roll（头部倾斜）。

**调用方式** — 每当摄像机旋转改变时调用。角度为 **弧度**。旋转矩阵为 `R = Ry(yaw)·Rx(pitch)`，`yaw = 0, pitch = 0` 时 forward = +Z，up = +Y，right = +X（恒等）。**yaw 为正 = 向右转**（从上往下看为顺时针），**pitch 为正 = 向下看**。若要从方向向量 `d` 反求，使用 `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`。引擎坐标系与 Unity 相同，因此 Unity 宿主可不经转换直接传入；forward 取 −Z 的宿主（OpenGL 式摄像机）需翻转 Z 或给 yaw 加 180 度后传入。三个听者方向 setter（`st_rt_listener_set_rotation`、`st_rt_listener_set_rotation_ypr`、`st_rt_listener_set_orientation_q`）覆盖同一方向值，**以最后调用的一方为准**。线程：`[control]` — 请勿在音频回调中调用。在 `PIPELINED` 下进入运动队列。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `yaw` | 绕 +Y 轴旋转（弧度）。正值 = 向右转 |
| `pitch` | 绕 +X 轴旋转（弧度）。正值 = 向下看 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_listener_set_orientation_q</code> — 以四元数（XYZW）设置听者方向（含 roll）</summary>

```c
int st_rt_listener_set_orientation_q(STRT_Context* context, const float quatXYZW[4]);
```

**用途** — 以局部→世界单位四元数给出听者方向。可包含 yaw·pitch 无法表达的 roll（头部倾斜），因此在 VR 头部追踪等宿主已持有四元数的情况下可直接传入。

**调用方式** — 局部轴为 forward = +Z · up = +Y · right = +X。分量顺序为 **XYZW**，归一化由引擎完成，宿主无需事先归一化。验证与 `st_rt_source_set_orientation_q` 相同。`st_rt_listener_set_rotation(yaw, pitch)` 等同于 `q = q_y(yaw) · q_x(pitch)` 的 roll 0 情况。三个听者方向 setter **以最后调用的一方为准**。是否支持通过 `st_rt_get_capability_word(1)` 的 `ST_CAP1_LISTENER_ORIENTATION_Q` 位确认。线程：`[control]` — 请勿在音频回调中调用。在 `PIPELINED` 下进入运动队列。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `quatXYZW` | 局部→世界旋转四元数 `[x, y, z, w]`。有非有限分量或范数退化（`norm < 1e-12`）时拒绝 |

**返回值** — `1` = 已应用 / `0` = 失败。非有限或退化的四元数不做任何更改，并在 `st_rt_get_last_status` 中留下 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_rt_listener_set_rotation_ypr</code> — 以 yaw·pitch·roll（弧度）设置听者方向</summary>

```c
int st_rt_listener_set_rotation_ypr(STRT_Context* context, float yaw, float pitch, float roll);
```

**用途** — 在 `st_rt_listener_set_rotation` 基础上加入 roll 的欧拉角版本。供以欧拉角处理头部倾斜的宿主使用。

**调用方式** — 旋转矩阵为 `R = Ry(yaw)·Rx(pitch)·Rz(roll)`，与 Unity `Quaternion.Euler(pitch, yaw, roll)`（将度换算为弧度的值）顺序相同。yaw·pitch 的含义与 `st_rt_listener_set_rotation` 相同（yaw 为正 = 向右转，pitch 为正 = 向下看），**roll 为正 = right 轴向上倾斜**（头部向左倾斜，右耳抬高）。`roll = 0` 时与 `st_rt_listener_set_rotation(yaw, pitch)` 矩阵相同。三个听者方向 setter **以最后调用的一方为准**。是否支持通过 `ST_CAP1_LISTENER_ORIENTATION_Q`（能力字 1）确认。线程：`[control]` — 请勿在音频回调中调用。在 `PIPELINED` 下进入运动队列。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `yaw` | 绕 +Y 轴旋转（弧度）。正值 = 向右转 |
| `pitch` | 绕 +X 轴旋转（弧度）。正值 = 向下看 |
| `roll` | 绕 +Z 轴旋转（弧度）。正值 = right 轴向上（头部向左倾斜） |

**返回值** — `1` = 已应用 / `0` = 失败。有非有限值时不做任何更改，并留下 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_rt_set_path_type_enabled</code> — 全局开关各路径类型的传播</summary>

```c
void st_rt_set_path_type_enabled(STRT_Context* context, int pathType, int enabled);
```

**用途** — 让引擎整体不计算直达声、透射、反射、衍射、混响中的特定类型路径。用于逐一分离试听各成分对声音的贡献，或去掉不需要的类型以降低开销。

**调用方式** — 默认 5 种全部开启。这是传播阶段的门控，因此关闭的类型根本不会生成路径（与渲染阶段门控 `STRenderOptions.render*` 不同）。若只应用于一个声源，请使用 `st_rt_source_set_path_enabled`。与 `st_rt_set_acoustic_feature_enabled` 组合，仅通过设置即可构建“关闭声音追踪”的基准 — 关闭反射、衍射、混响并关闭全部三项声学功能后，只剩距离衰减与声像。线程：`[control]` — 持有场景写锁，可能与工作线程短暂竞争。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb。超出范围的值被忽略 |
| `enabled` | `0` = 关闭，其他 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_set_acoustic_feature_enabled</code> — 分别开关空气吸收、传播延迟、直达声遮挡</summary>

```c
int st_rt_set_acoustic_feature_enabled(STRT_Context* context, int feature, int enabled);
```

**用途** — 开关单项声学功能以进行试听 A/B 对比。与路径类型门控（`st_rt_set_path_type_enabled`）一起，用于逐一分离“哪些因素对声音有贡献”进行试听的接口。

**调用方式** — 默认三项功能全部开启（保持物理行为）。关闭反射、衍射、混响路径并关闭全部三项功能后，得到只剩距离衰减与立体声声像的基准。当前值通过 `st_rt_is_acoustic_feature_enabled` 读取。此函数是 **会引发 IR 重新转换** 的 setter — 仅调用即会使 IR 转换管线重新运行并发布新 IR（`PIPELINED` 会唤醒工作线程），因此请只在值改变时调用。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`(0) = 大气衰减（高频损失）/ `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`(1) = 基于路径长度的传播延迟 / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`(2) = 直达声遮挡（可见性检测） |
| `enabled` | `0` = 关闭，其他 = 开启 |

**返回值** — `1` = 已应用 / `0` = `feature` 超出范围或失败。

</details>

<details>
<summary><code>st_rt_set_late_coupling</code> — 详细设置基于听者–声源扩散场耦合的混响衰减</summary>

```c
int st_rt_set_late_coupling(STRT_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**用途** — 根据听者与声源扩散场的耦合程度衰减 late reverb（FDN）注入。混响箱是完全混合的单一空间，默认在任何位置听到的大小都相同；此选项用于修正 U 形、回字形等经拐角分隔的空间中“远离声源后混响不变甚至变大”的问题。

**调用方式** — 大多数情况使用 `st_rt_set_late_coupling_preset` 即可，只在需要精细调整时使用此函数。耦合衰减（`floorDb`）、send 平坦化（`sendNormalizeTrim`）、方向样本采集（`rainDirectionWalk`）是按配合使用设计的 — 不做平坦化而只开启耦合，会残留越远混响注入越大的反转；关闭方向样本采集，则分隔空间对侧的混响方向信息会不足。各参数的构成今后可能变化，请尽量使用预设。当前值通过 `st_rt_get_late_coupling` 读取。这是 **会引发 IR 重新转换** 的 setter（调用后 IR 会重新转换并发布）。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `floorDb` | 完全阻断时的衰减深度（dB，不小于 0）。`0` = 关闭耦合衰减。默认 `9` |
| `visibleLow` | 可见比例低于此值时视为完全阻断，衰减 `floorDb`。`[0, 1)`。`0` → 默认 `0.05` |
| `visibleHigh` | 可见比例高于此值时视为同一空间，**恰好 0 dB**。`[0, 1]`。`0` → 默认 `0.60` |
| `sendNormalizeTrim` | 混响 send 总和平坦化修正量（不小于 0）。`0` = 不做平坦化。默认 `0.75` |
| `rainDirectionWalk` | `1`（默认）= 持续采集混响方向样本（不传递能量）/ `0` = 关闭 |

**返回值** — `1` = 已应用 / `0` = 超出范围（非有限值、负数、`visibleLow >= 1`、`visibleHigh > 1`）或失败。失败时值不变。

</details>

<details>
<summary><code>st_rt_get_late_coupling</code> — 读取当前 late 耦合衰减设置</summary>

```c
int st_rt_get_late_coupling(const STRT_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**用途** — 返回通过 `st_rt_set_late_coupling` / `st_rt_set_late_coupling_preset` 设置的当前值。用于确认预设实际填入了哪些值，或在 UI 中显示。

**调用方式** — 可随时调用。不需要的输出参数传 `NULL` 即跳过。线程：`[control]` — 无锁读取引擎状态的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outFloorDb` | 接收完全阻断衰减深度（dB）的指针。允许 `NULL` |
| `outVisibleLow` | 接收完全阻断拐点的指针。允许 `NULL` |
| `outVisibleHigh` | 接收同一空间（0 dB）拐点的指针。允许 `NULL` |
| `outSendNormalizeTrim` | 接收 send 平坦化修正量的指针。允许 `NULL` |
| `outRainDirectionWalk` | 接收是否采集方向样本（`1`/`0`）的指针。允许 `NULL` |

**返回值** — `1` = 成功（当前值写入输出指针）/ `0` = 没有上下文。

</details>

<details>
<summary><code>st_rt_set_late_coupling_preset</code> — 以推荐预设一次性设置 late 耦合衰减</summary>

```c
int st_rt_set_late_coupling_preset(STRT_Context* context, int preset);
```

**用途** — 以推荐组合一次性填入 `st_rt_set_late_coupling` 的五个值。各预设只有衰减下限深度不同，其余（两个拐点、平坦化修正量、方向样本采集）均为相同的推荐值。

**调用方式** — 引擎默认状态与 `ST_LATE_COUPLING_DEFAULT` 相同。无论哪个预设，听者与声源处于同一空间时衰减都恰好为 0 dB，在单个房间中实际上没有差别 — 差别只出现在经拐角分隔的空间中，因此如何选择是听感问题。需要单独调整时请使用 `st_rt_set_late_coupling`。这是 **会引发 IR 重新转换** 的 setter。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `preset` | `ST_LATE_COUPLING_OFF`(0) = 耦合衰减、平坦化、方向样本采集全部关闭 / `ST_LATE_COUPLING_SUBTLE`(1) = 下限 6 dB / `ST_LATE_COUPLING_DEFAULT`(2) = 下限 9 dB（引擎默认）/ `ST_LATE_COUPLING_STRONG`(3) = 下限 12 dB |

**返回值** — `1` = 已应用 / `0` = `preset` 超出范围或失败。

</details>

<details>
<summary><code>st_rt_set_physical_distance_attenuation</code> — 设置物理距离衰减的参考距离与最小距离</summary>

```c
void st_rt_set_physical_distance_attenuation(STRT_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**用途** — 设定基于路径长度的距离衰减（球面扩散）的基准点。引擎的距离衰减定律只有物理声压扩散一种，声压增益为 `referenceDistanceMeters / max(距离, minDistanceMeters)`。即在参考距离处增益为 1（0 dB）。

**调用方式** — 默认值为参考距离 1.0 m · 最小距离 1.0 m（1 m 以内不再增大）。若 `minDistanceMeters` 小于参考距离，会产生近场增强（例：参考 1，最小 0.25 → 最大增益 4 倍）。两个值以 **米** 给出，不应用 `sceneRatio`（因为比较对象路径长度已换算为米）。这是 **会引发 IR 重新转换** 的 setter。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `referenceDistanceMeters` | 增益为 1 的参考距离（m）。默认 `1.0` |
| `minDistanceMeters` | 距离下限（m）。比此更近也按此距离计算。默认 `1.0` |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_set_atmosphere</code> — 设置大气条件（温度、湿度、气压）</summary>

```c
void st_rt_set_atmosphere(STRT_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**用途** — 设置用于空气吸收与声速计算的大气状态。声速不是固定常数，而是由该大气值推导，各频带空气吸收（高频损失）按 ISO 9613-1 纯音吸收公式计算。可以表现炎热干燥的沙漠、寒冷潮湿的户外等环境下远距离高频衰减与延迟的差异。

**调用方式** — 默认值为 20.0 °C · 50.0 % RH · 101.325 kPa。仅在关卡加载或天气变化等值改变时调用。要关闭空气吸收本身，请使用 `st_rt_set_acoustic_feature_enabled(ST_ACOUSTIC_FEATURE_AIR_ABSORPTION, 0)`。这是 **会引发 IR 重新转换** 的 setter。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `temperatureC` | 气温（°C）。默认 `20.0` |
| `relativeHumidityPercent` | 相对湿度（%，0~100）。默认 `50.0` |
| `pressureKPa` | 大气压（kPa）。默认 `101.325` |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_set_doppler_gain_mode</code> — 设置移动声源的多普勒辐射增益模式</summary>

```c
int st_rt_set_doppler_gain_mode(STRT_Context* context, int mode);
```

**用途** — 开关声源移动时向前进方向辐射更响、向反方向辐射更弱的效果（移动单极子近似）。这是与可变延迟引起的多普勒 **音高** 变化（`STRenderOptions.useDoppler`）相互独立的开关。

**调用方式** — 默认值为 `ST_DOPPLER_GAIN_MOVING_MONOPOLE`。静止声源的增益为 1，不受影响；在 IR 转换时每条路径计算一次，因此不产生渲染开销。当前值通过 `st_rt_get_doppler_gain_mode` 读取。是否支持通过 `ST_CAP_DOPPLER_GAIN_MODE` 确认。这是 **会引发 IR 重新转换** 的 setter（重复传入相同值不做任何事）。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) = 无辐射增益 / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`(1) = 移动单极子近似：声压 `D^2`，能量 `D^4`，`D = 1/(1 - Mr)`（声源速度在辐射方向上的马赫数 `Mr`），按路径的每个辐射方向分别计算 |

**返回值** — `1` = 已应用 / `0` = `mode` 超出范围或失败。

</details>

<details>
<summary><code>st_rt_get_doppler_gain_mode</code> — 读取当前多普勒辐射增益模式</summary>

```c
int st_rt_get_doppler_gain_mode(const STRT_Context* context);
```

**用途** — 返回通过 `st_rt_set_doppler_gain_mode` 设置的当前模式。

**调用方式** — 可随时调用。线程：`[control]` — 无锁读取引擎状态的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STDopplerGainMode` 值（`0` = `ST_DOPPLER_GAIN_OFF`，`1` = `ST_DOPPLER_GAIN_MOVING_MONOPOLE`）。

</details>

<details>
<summary><code>st_rt_set_early_late_band_energy_targets</code> — 分别设置早期反射与混响的各频带能量倍率</summary>

```c
int st_rt_set_early_late_band_energy_targets(STRT_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**用途** — 相互独立地调整早期（early）成分与混响（late）成分的各频带能量。例如只降低混响的高频或只提升早期反射的低频，无需改动材质即可进行音色校正。

**调用方式** — **一次性替换** 两个数组（若只改一侧，另一侧须重新传入当前值）。数组为按 63、125、250、500、1k、2k、4k、8k、16k Hz 顺序排列的 9 个值，是 **energy-domain** 倍率（`2.0` ≈ +3 dB，`0.5` ≈ −3 dB）。early 数组只作用于单条路径（exact/early tap），late 数组只作用于混响 send 与混响箱驱动，两者不会相乘。默认值全部为 `1.0`（中性）。是否支持通过 `ST_CAP_EARLY_LATE_BAND_ENERGY` 确认。这是 **会引发 IR 重新转换** 的 setter。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `earlyBandEnergy` | 早期成分各频带能量倍率 9 个。非有限值规整为 `1.0`，其余规整到 `[0, 16]`。不可为 `NULL` |
| `lateBandEnergy` | 混响成分各频带能量倍率 9 个。规整规则相同。不可为 `NULL` |

**返回值** — `1` = 已应用 / `0` = 任一数组为 `NULL` 或失败。

</details>

<details>
<summary><code>st_rt_set_max_depth</code> — 设置反射·衍射路径的全局最大阶数</summary>

```c
void st_rt_set_max_depth(STRT_Context* context, int depth);
```

**用途** — 针对整个引擎设定反射·衍射路径搜索可追踪的最大边界面交互次数（阶数）。提高该值可精确追踪到高阶反射，但传播开销会增加。

**调用方式** — 默认值为全局 8。每声源深度（默认 4）另行通过 `st_rt_source_set_depth` 设置。通常在构建场景后的质量设置阶段调用一次。线程：`[control]` — 持有场景写锁，可能与工作线程短暂竞争。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `depth` | 最大阶数，`[1, 64]`。默认 `8`。超出范围的值被忽略（保持之前的值） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_set_transmission_max_depth</code> — 设置直达声·透射路径可穿过的最大面数</summary>

```c
void st_rt_set_transmission_max_depth(STRT_Context* context, int depth);
```

**用途** — 设置声源→听者直线被遮挡时，透射路径最多可穿过多少个面。决定穿过多层墙壁传来的声音计算到何种程度。

**调用方式** — 默认值为 64。为 `0` 时不穿过透射面。要关闭透射路径本身，请使用 `st_rt_set_path_type_enabled`（Transmission = 1）。线程：`[control]` — 持有场景写锁。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `depth` | 可穿过的最大面数，`[0, 64]`。默认 `64`。超出范围的值被忽略（保持之前的值） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_listener_set_ray_count</code> — 设置听者探测（guide）射线数</summary>

```c
void st_rt_listener_set_ray_count(STRT_Context* context, int width, int height);
```

**用途** — 以 `width × height` 设置从听者发射的探测（guide/probe）射线数量。这些射线用于寻找反射·衍射路径候选，增加数量可降低遗漏小反射面的概率，但传播开销会增加。

**调用方式** — 默认值为 16 × 16（256 条）。声源侧的输运射线另行通过 `st_rt_source_set_ray_count` 设置。射线方向分布由 `st_rt_listener_set_ray_sampling_method` 决定。线程：`[control]` — 持有场景写锁。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `width` | 网格水平数，`[1, 4096]`。默认 `16` |
| `height` | 网格垂直数，`[1, 4096]`。默认 `16`。任一超出范围时忽略整个调用 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_listener_set_ray_sampling_method</code> — 设置听者探测射线的方向分布</summary>

```c
int st_rt_listener_set_ray_sampling_method(STRT_Context* context, int method);
```

**用途** — 选择听者探测射线在球面上的分布方式。当前可选的分布只有 `ST_RAY_SAMPLING_FIBONACCI_SPHERE` 一种，此函数保留用于显式确认或设置该值。

**调用方式** — 默认值也是唯一接受的值为 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)。斐波那契分布是确定性的，不使用种子。其余 `STRaySamplingMethod` 值仅为编号兼容保留在枚举中，会被拒绝。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `method` | `STRaySamplingMethod`。只允许 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)。`ST_RAY_SAMPLING_LEGACY_GRID`(0) / `ST_RAY_SAMPLING_EQUAL_AREA_GRID`(2) / `ST_RAY_SAMPLING_SOBOL_SPHERE`(3) / `ST_RAY_SAMPLING_ICOSAHEDRAL`(4) 会被拒绝 |

**返回值** — `1` = 已应用 / `0` = 拒绝（状态不变，并留下 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_listener_get_ray_sampling_method</code> — 读取听者探测射线的方向分布</summary>

```c
int st_rt_listener_get_ray_sampling_method(const STRT_Context* context);
```

**用途** — 返回当前听者探测射线的分布。

**调用方式** — 可随时调用。可选分布只有斐波那契一种，因此在正常上下文中始终为 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`。线程：`[control]` — 只持有场景读锁的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STRaySamplingMethod` 值（始终为 `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`）/ `-1` = 没有上下文。

</details>

<details>
<summary><code>st_rt_set_source_ray_sampling_method</code> — 设置声源输运射线的方向分布</summary>

```c
int st_rt_set_source_ray_sampling_method(STRT_Context* context, int method);
```

**用途** — 选择从声源发射的输运（用于混响·扩散能量）射线的球面分布。与听者侧相同，当前可选的值只有 `ST_RAY_SAMPLING_FIBONACCI_SPHERE` 一种。

**调用方式** — 默认值也是唯一接受的值为 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)。声源输运射线数通过 `st_rt_source_set_ray_count` 设置。线程：`[control]` — 请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `method` | `STRaySamplingMethod`。只允许 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)，其余值会被拒绝 |

**返回值** — `1` = 已应用 / `0` = 拒绝（状态不变，并留下 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_get_source_ray_sampling_method</code> — 读取声源输运射线的方向分布</summary>

```c
int st_rt_get_source_ray_sampling_method(const STRT_Context* context);
```

**用途** — 返回当前声源输运射线的分布。

**调用方式** — 可随时调用。在正常上下文中始终为 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`。线程：`[control]` — 只持有场景读锁的查询。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STRaySamplingMethod` 值（始终为 `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`）/ `-1` = 没有上下文。

</details>

<details>
<summary><code>st_rt_build</code> — 完整构建静态与动态加速结构</summary>

```c
void st_rt_build(STRT_Context* context);
```

**用途** — 根据网格与对象布局重新构建静态 TLAS 和动态 TLAS。传播与 `st_rt_scene_raycast` 使用此加速结构，因此构建场景后必须至少调用一次。

**调用方式** — 在创建网格与对象之后、第一次 `st_rt_propagate` 之前调用。之后若添加、删除、移动 **静态** 对象等使静态构成发生变化，必须重新调用 — 在 `st_rt_build` 之前静态 TLAS 一直沿用之前发布的版本，期间的静态更改不可见。若只需反映动态对象（`isDynamic = 1`）的移动，请使用更轻量的 `st_rt_build_dynamic`。线程：`[control, blocking]` — 加速结构的整体构建，是较长的独占区间。不要在游戏循环的每帧路径或音频线程中调用，请在加载阶段调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_build_dynamic</code> — 仅重新调整动态对象加速结构</summary>

```c
void st_rt_build_dynamic(STRT_Context* context);
```

**用途** — 只更新（refit）由动态对象（`isDynamic = 1`）构成的动态 TLAS。在存在门、电梯等移动几何时，用于无需整体构建即可将其变化反映到传播中的轻量路径。

**调用方式** — 在更改动态对象的变换（`st_rt_object_set_transform` 等）之后调用。不触及静态 TLAS，因此静态构成的更改需要 `st_rt_build`。线程：`[control]` — 持有场景写锁，可能与工作线程短暂竞争。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_set_lane_update_interval</code> — 设置各传播通道的更新周期</summary>

```c
int st_rt_set_lane_update_interval(STRT_Context* context, int lane, float milliseconds);
```

**用途** — 在 `PIPELINED` 调度器下设置直达声、反射/衍射、混响三个传播通道重新计算的频率。这是宿主在 CPU 占用与响应性之间调节平衡的手柄。反射/衍射通道占传播开销的大部分，若要节省 CPU，请先调高此通道的周期。代价是早期反射跟随听者移动会稍慢，但直达声通道的周期不变，因此不会出现静音或断音。

**调用方式** — 可在 **运行时随时** 调用（不同于线程属性，没有须在 `st_rt_create` 之前的限制）。工作线程运行中更改也会从下一个周期起以新值运行，已进入等待的截止时间保持不变，从下一次执行起使用新值。即使没有 Guide 或宿主的新请求，各通道也独立重复执行。周期的含义因通道而异（见下表）。`ST_RT_SCHEDULER_SYNCHRONOUS` 没有通道，因此会失败。是否支持通过 `ST_CAP_LANE_UPDATE_INTERVAL` 确认。线程：`[control]` — 以 atomic 保存值并传递给工作线程。请勿在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `lane` | `STPropagationLane` — `ST_PROPAGATION_LANE_DIRECT`(0)：连续执行 **开始** 之间的最小间隔，默认 10 ms / `ST_PROPAGATION_LANE_REFLECTION_DIFFRACTION`(1)：连续两次执行之间的最小间隔，默认 0 ms（无限制）。等待期间到达的请求在截止前合并为一个，不会饿死 / `ST_PROPAGATION_LANE_REVERB`(2)：执行 **完成后** 到下一次执行的最小间隔，默认 4 ms |
| `milliseconds` | 最小间隔（ms），`[0, 60000]`。`0` = 无额外等待。负数、NaN、无穷大、超过 60000 的值不做 clamp 而是拒绝 |

**返回值** — `1` = 已应用 / `0` = 拒绝。`lane` 超出范围或 `milliseconds` 超出允许范围时在 `st_rt_get_last_status` 中留下 `ST_STATUS_INVALID_ARGUMENT`，`SYNCHRONOUS` 调度器时留下 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_get_lane_update_interval</code> — 读取传播通道的更新周期</summary>

```c
float st_rt_get_lane_update_interval(const STRT_Context* context, int lane);
```

**用途** — 以 ms 为单位返回通道中保存的更新周期。

**调用方式** — 即使最后一次 `st_rt_set_lane_update_interval` 被拒绝，也会返回当前 **保存的值**，因此用于确认传入的值是否实际生效。线程：`[any]` — 只读取一个 atomic，可在任意线程调用且不阻塞。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `lane` | `STPropagationLane` — `DIRECT`(0) / `REFLECTION_DIFFRACTION`(1) / `REVERB`(2) |

**返回值** — 保存的周期（ms）。`lane` 超出范围或没有上下文时返回 `0`。

</details>

<details>
<summary><code>st_rt_propagate</code> — 执行传播（SYNCHRONOUS）或唤醒传播工作线程（PIPELINED）</summary>

```c
int st_rt_propagate(STRT_Context* context);
```

**用途** — 以当前场景、声源、听者状态推进声学传播与 IR 转换。行为因调度器而异。

**调用方式** — 在 `st_rt_build` 之后调用。

- `ST_RT_SCHEDULER_SYNCHRONOUS`：传播与 IR 管线 **在调用线程上实际运行**。只有宿主调用此函数计算才会推进，因此在游戏循环中周期性调用（例：每帧）。在此调度器下休眠的声源（`st_rt_source_idle`）也会被计算。
- `ST_RT_SCHEDULER_PIPELINED`（默认）：唤醒工作线程并 **立即返回**。即使没有宿主请求，通道也会按 `st_rt_set_lane_update_interval` 的周期重复执行，因此此调用是“有变化，请立即运行”的信号。

线程：`[control, runs-here]` — 在 `SYNCHRONOUS` 下调用线程直接承担传播开销，请勿在音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 传播的路径数（在 `PIPELINED` 下为工作线程最近一次输出的值）。`PIPELINED` 下工作线程出错时返回 `-1`，没有上下文时返回 `0`。

</details>

</details>

<details>
<summary><strong>渲染 · 输出级 · 扬声器组</strong> — 56 个</summary>

<details>
<summary><code>st_rt_render_set_spatializer</code> — 选择空间化方式（声像 / HRIR 数据集）</summary>

```c
int st_rt_render_set_spatializer(STRT_Context* context, int type);
```

**用途** — 选择渲染路径的空间化实现。`PANNING` 不使用 HRIR 数据，以立体声声像输出；`MIT_KEMAR` 与 `SADIE_D2_KEMAR` 以实测 HRIR 卷积生成双耳输出。SADIE II D2 是包含数据集实测 ITD 与相位的基准 HRTF。

**调用方式** — HRIR 空间化（1·2）用于耳机双耳输出，即以 `st_rt_render_start(context, 1)` 启动的渲染。通常在 `st_rt_render_start` 之前选择一次。线程：`[control, blocking]` — 读取 HRIR 数据集的较长区间，不要在游戏循环或音频线程中调用。是否支持通过 `ST_CAP_HRTF`、`ST_CAP_SADIE_D2_HRTF`（能力字 0）确认。

`PANNING` 与 `MIT_KEMAR` 内置于库中。`SADIE_D2_KEMAR` 需要外部文件 `SADIE_D2_44K_16bit_256tap.hrtfbin`（与许可证 `LICENSE-SADIE-II.txt` 一同包含在 SDK 的 `Resources/HRTF/` 中），引擎按以下顺序查找。

1. 环境变量 `SOUNDTRACING_SADIE_D2_HRTF_PATH`（文件路径）
2. 当前工作目录，3. 可执行文件所在目录，4. 本库所在目录 — 分别在该目录及其上 8 级目录中查找 `Assets/HRTF/`、`SoundTracing/Assets/HRTF/`、`Resources/HRTF/` 下的该文件

部署时最简单的做法是在库旁边（或上级目录）放置 `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`（0，默认）/ `ST_SPATIALIZER_MIT_KEMAR`(1) / `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) |

**返回值** — `1` = 已应用 / `0` = 失败。`type` 超出范围时返回 `0`。找不到 SADIE D2 资源文件时返回 `0`，并在 `st_rt_get_last_status` 中留下 `ST_STATUS_UNAVAILABLE`（"SADIE D2 HRTF asset not found ..."）。

</details>

<details>
<summary><code>st_rt_render_get_spatializer</code> — 读取当前空间化方式</summary>

```c
int st_rt_render_get_spatializer(const STRT_Context* context);
```

**用途** — 返回通过 `st_rt_render_set_spatializer` 选择的空间化方式。

**调用方式** — 可随时调用。线程：`[any]` — atomic 读取，在任意线程调用都不阻塞。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STSpatializerType` 值（`0` PANNING / `1` MIT_KEMAR / `2` SADIE_D2_KEMAR）。默认为 `0`。上下文为 `NULL` 时返回 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_limiter_type</code> — 选择输出限幅器类型</summary>

```c
void st_rt_render_set_limiter_type(STRT_Context* context, int type);
```

**用途** — 选择最终混音（主总线）最后一级输出限幅器的算法。限幅器作用于立体声（耳机、声像）与扬声器布局输出，对 N 声道输出以对所有声道施加相同增益的声道联动方式工作。超过 32 声道的自定义布局会让限幅器直通。

**调用方式** — 渲染中也可更改。开关限幅器不是通过此函数，而是通过 `STRenderOptions.useLimiter`（默认 `1`，`st_rt_render_set_options`）。更改类型会改变限幅器延迟，因此需重新读取 `st_rt_render_get_limiter_latency_samples`。线程：`[control]` — 更改渲染阶段的控制线程调用，不要在音频回调中调用。true-peak 类型的支持通过 `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER`（能力字 1）确认，前瞻限幅器通过 `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`（能力字 0）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `type` | `STOutputLimiterType`。`0`·`1`·`2` 以外的值按 `LEGACY_ENVELOPE` 处理 |

**`STOutputLimiterType` 值**

| 值 | 行为 |
|---|---|
| `ST_OUTPUT_LIMITER_LEGACY_ENVELOPE`(0) | 无前瞻，2 ms attack，−0.2 dBFS 采样峰值 + ±1 硬削波（仅供参考）。延迟 0 |
| `ST_OUTPUT_LIMITER_LOOKAHEAD_PEAK`(1) | 前瞻线性斜坡，−0.2 dBFS 采样峰值（仅供参考）。延迟 = 前瞻长度 |
| `ST_OUTPUT_LIMITER_TRUE_PEAK`（2，默认） | ITU-R BS.1770-5 4× true-peak 侧链，上限 −1 dBTP（固定），前瞻（= attack）+ hold 10 ms + 自动 release 60→400 ms。输出 true-peak 不超过上限。延迟 = `max(lookahead, 1) + 5` 采样（默认 132 → 137，3.1 ms） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_get_limiter_type</code> — 读取当前输出限幅器类型</summary>

```c
int st_rt_render_get_limiter_type(const STRT_Context* context);
```

**用途** — 返回通过 `st_rt_render_set_limiter_type` 设置的限幅器类型。

**调用方式** — 线程：`[control]` — 供控制线程使用、无锁读取引擎状态的查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STOutputLimiterType` 值（默认 `2` = `TRUE_PEAK`）。上下文为 `NULL` 时返回 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_limiter_lookahead_samples</code> — 设置限幅器前瞻长度</summary>

```c
int st_rt_render_set_limiter_lookahead_samples(STRT_Context* context, int samples);
```

**用途** — 以采样为单位设置 `LOOKAHEAD_PEAK`·`TRUE_PEAK` 限幅器预先查看峰值的长度（= attack）。越长增益变化越平滑，越短输出延迟越小。

**调用方式** — 重新构建前瞻缓冲区。更改后用 `st_rt_render_get_limiter_latency_samples` 重新读取实际延迟。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `samples` | 前瞻采样数（44.1 kHz 引擎采样），`[0, ST_OUTPUT_LIMITER_MAX_LOOKAHEAD_SAMPLES]` = `[0, 511]`。默认 `ST_OUTPUT_LIMITER_DEFAULT_LOOKAHEAD_SAMPLES` = 132（3 ms） |

**返回值** — `1` = 已应用 / `0` = 拒绝（超出范围、上下文为 `NULL`）。

</details>

<details>
<summary><code>st_rt_render_get_limiter_lookahead_samples</code> — 读取限幅器前瞻长度</summary>

```c
int st_rt_render_get_limiter_lookahead_samples(const STRT_Context* context);
```

**用途** — 返回当前限幅器前瞻采样数。

**调用方式** — 线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 前瞻采样数（默认 `132`）。上下文为 `NULL` 时为 `-1`。

</details>

<details>
<summary><code>st_rt_render_get_limiter_latency_samples</code> — 读取限幅器增加的输出延迟</summary>

```c
int st_rt_render_get_limiter_latency_samples(const STRT_Context* context);
```

**用途** — 以引擎采样为单位返回输出限幅器给信号增加的固定延迟。用于与视频·输入事件的同步校正以及测量时的对齐。

**调用方式** — 更改限幅器类型·前瞻·`useLimiter` 后重新读取。值遵循以下规则。

- `useLimiter` = 1 · `TRUE_PEAK`: `max(lookahead, 1) + 5`（默认 137 采样，3.1 ms）
- `useLimiter` = 1 · `LOOKAHEAD_PEAK`: `lookahead`
- `useLimiter` = 1 · `LEGACY_ENVELOPE`: 0
- `useLimiter` = 0: 0

线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 限幅器延迟（采样）。上下文为 `NULL` 时为 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_master_gain_db</code> — 设置主输出增益</summary>

```c
int st_rt_render_set_master_gain_db(STRT_Context* context, float gainDb);
```

**用途** — 渲染输出级的音量。不会使传播·IR 结果失效，因此用于无需重新计算 IR 即可调节整体音量。位于输出 EQ 之后、限幅器之前，提升的部分由限幅器承接。与立体声·扬声器布局等声道数无关，作用于所有输出。

**调用方式** — 渲染期间可随时调用。值改变时以 20 ms 线性斜坡过渡，0 dB 时不做乘法。若等响度补偿的 `followMasterGain` 开启，补偿也会随此增益重新计算（参见 `st_rt_render_set_loudness_compensation`）。线程：`[control]` — 只改变输出级，不要在音频回调中调用。是否支持通过 `ST_CAP1_MASTER_GAIN`（能力字 1）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `gainDb` | 增益 [dB]，`[ST_MASTER_GAIN_MIN_DB, ST_MASTER_GAIN_MAX_DB]` = `[−96, +24]`。默认 0 |

**返回值** — `1` = 已应用 / `0` = 失败。非有限值·超出范围时为 `ST_STATUS_INVALID_ARGUMENT`，且不做任何更改。`ST_BACKEND_EXA` 后端上下文为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_master_gain_db</code> — 读取主输出增益</summary>

```c
float st_rt_render_get_master_gain_db(const STRT_Context* context);
```

**用途** — 返回已保存的主增益 [dB]。

**调用方式** — 线程：`[control]` — 短暂持有声化器控制锁并复制保存值。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 主增益 [dB]（默认 `0`）。上下文为 `NULL` 时为 `0`。

</details>

<details>
<summary><code>st_rt_render_set_loudness_compensation</code> — 设置等响度补偿（ISO 226）</summary>

```c
int st_rt_render_set_loudness_compensation(STRT_Context* context, const STLoudnessCompensationDesc* desc);
```

**用途** — 当内容以低于其平衡基准电平的音量播放时，人耳对低频·极高频的感知会减弱。此级用低频搁架与高频搁架近似两条 ISO 226:2003 等响度曲线（基准电平 R、播放电平 P）的形状差并加以还原。P 大于 R 时则反向衰减。引擎不知道绝对 SPL，因此电平由宿主以 phon（1 kHz 纯音 dB SPL）给出。

**调用方式** — 在输出级（立体声·双耳与扬声器布局均适用）中，按等响度补偿 → 虚拟低音的顺序作用于输出 EQ 之后、主增益·限幅器之前。不会使传播·IR 结果失效。`st_rt_create` 之后 **默认开启** 并跟随主增益（基准 83 → 播放 70 phon，120 Hz 处低频约 +7.2 dB，高频 +1.8 dB）。在中间件·游戏混音等由宿主掌控输出音色的集成中，请考虑在创建后立即关闭。关闭期间不触碰采样。

开关·值变更均无咔嗒声过渡（搁架参数 50 ms smoothstep 斜坡，关闭时到达 0 dB 后进行 5.8 ms 原信号交叉淡化）。输出声道数改变时（扬声器布局变更等）清空历史，并以与开启相同的斜坡重新进入。`followMasterGain` 时音量变更会与主增益斜坡（20 ms）一起变化，但因是独立命令，起始可能最多错开一个块（各自都是斜坡，因此无不连续）。不作用于超过 32 声道的自定义扬声器布局。

若要保持默认值仅开关，先用 get 填充，再只改 `enabled` 后 set。

```c
STLoudnessCompensationDesc d = { sizeof d, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &d);
d.enabled = 0;                                  /* 关闭 */
st_rt_render_set_loudness_compensation(ctx, &d);
```

线程：`[control]` — 只改变输出级，在控制线程上进行 ISO 226 拟合（数十 µs）。是否支持通过 `ST_CAP1_LOUDNESS_COMPENSATION`（能力字 1）确认。离线库中没有此功能。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `desc` | 设置。调用方须填写 `structSize` / `apiVersion`，`reserved` 必须为 0 |

**结构体** `STLoudnessCompensationDesc`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STLoudnessCompensationDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1。创建后为 1 |
| `followMasterGain` | 0/1。为 1 时有效播放电平 = `playbackLevelPhon` + 主增益 dB。将 `playbackLevelPhon` 一次性设为"主增益 0 dB 时的播放电平"后，在把主增益当作音量旋钮的宿主中补偿会自动跟随。创建后为 1 |
| `referenceLevelPhon` | 基准聆听电平 `[0, 120]` phon，默认 83（电影·音乐母带制作的基准监听电平） |
| `playbackLevelPhon` | 实际播放电平 `[0, 120]` phon，默认 70（家庭·耳机的常规聆听电平）。与基准相同时补偿为 0 |
| `bassScale` | 低频搁架增益倍率 `[0, 1]`，默认 1（按 ISO 原样） |
| `trebleScale` | 高频搁架增益倍率 `[0, 1]`，默认 1。为 0 时只补偿低频 |
| `maxShelfGainDb` | 搁架增益绝对值上限 `[0, 40]` dB（在倍率之后应用），默认 15。低频搁架触及上限时不只截断增益，而是使用"搁架触及上限时的播放电平"的形状（拐点·斜率）。高频搁架形状固定，因此只截断增益 |
| `reserved[5]` | 0 |

ISO 公式有效范围（20 Hz–4 kHz 为 20–90 phon，5–12.5 kHz 为 20–80 phon）之外的电平，在该频率上按端点电平等响曲线的形状评估（R·P 均超过 80 phon 时高频补偿为 0）。1.25–5 kHz 的 ISO 凹陷（不足数 dB）不用搁架实现。电平差越大、较低一侧电平越低，近似误差越大（以中频为准相对 ISO 表的最大误差：83→70 0.5 dB，83→60 0.9 dB，83→40 1.9 dB，90→20 3.7 dB）。

**返回值** — `1` = 已应用 / `0` = 失败。`NULL`·字段超出范围·`reserved` ≠ 0 时为 `ST_STATUS_INVALID_ARGUMENT`，版本戳不一致时为 `ST_STATUS_VERSION_MISMATCH`（两者都不做任何更改）。`ST_BACKEND_EXA` 后端上下文为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_loudness_compensation</code> — 读取等响度补偿设置</summary>

```c
int st_rt_render_get_loudness_compensation(const STRT_Context* context, STLoudnessCompensationDesc* outDesc);
```

**用途** — 返回已保存的等响度补偿设置（请求值）。若从未 set，则填入创建后的默认值。在保持默认值只改部分字段时先调用。

**调用方式** — 线程：`[control]` — 短暂持有声化器控制锁并复制保存值。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outDesc` | 输出。调用方填写 `structSize` / `apiVersion`。字段参见 `st_rt_render_set_loudness_compensation` 条目 |

**返回值** — `1` = 成功 / `0` = 失败。`ST_BACKEND_EXA` 后端上下文填入默认值（关闭）。

</details>

<details>
<summary><code>st_rt_render_set_virtual_bass</code> — 设置虚拟低音（谐波合成）</summary>

```c
int st_rt_render_set_virtual_bass(STRT_Context* context, const STVirtualBassDesc* desc);
```

**用途** — 在无法重放低频的小型驱动单元·耳机上让人感受到低音的 missing fundamental 效果。分离截止频率以下的低频，生成 2·3·4 次谐波并经带通修整后叠加到原信号上。谐波电平与输入电平成正比。

**调用方式** — 在输出级中位于等响度补偿之后、主增益·限幅器之前。默认关闭。不会使传播·IR 结果失效。开关·值变更以 30 ms smoothstep 斜坡过渡，开启·截止/频带变更时在混合为 0 的状态下让滤波器稳定 23 ms 后再升起。输出声道数改变时清空历史并重新进入。跳过扬声器布局的 LFE 声道，且不作用于超过 32 声道的自定义布局。

低频中同时存在多个音调时会产生带内互调（和音 f1+f2 等）。例如等幅的 40 Hz + 55 Hz 时，和音 95 Hz 比 2 次谐波大 8.6–10.5 dB。单一音调时只产生 2·3·4 次谐波（其他成分 −77 dB 以下）。是否采用请凭听感判断。若要以默认值开启，先用 get 填充，再只把 `enabled` 改为 1 后 set。线程：`[control]` — 只改变输出级，不要在音频回调中调用。是否支持通过 `ST_CAP1_VIRTUAL_BASS`（能力字 1）确认。离线库中没有此功能。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `desc` | 设置。调用方须填写 `structSize` / `apiVersion`，`reserved` 必须为 0 |

**结构体** `STVirtualBassDesc`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STVirtualBassDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1。默认 0 |
| `mode` | `STVirtualBassMode` — `ST_VIRTUAL_BASS_HYBRID`（0，默认）：保留原低频并叠加谐波（能重放低频的耳机等） / `ST_VIRTUAL_BASS_HARMONICS_ONLY`（1）：用 `cutoffHz` LR4 HPF 滤除原信号，只保留谐波（保护小型驱动单元） |
| `cutoffHz` | 低频分离·HPF 截止 `[40, 160]` Hz，默认 90 |
| `harmonicLowHz` | 谐波频带下限 `[20, 1000]` Hz，默认 70 |
| `harmonicHighHz` | 谐波频带上限 `[20, 1000]` Hz，须大于 `harmonicLowHz`。默认 220 |
| `intensity` | 谐波混合强度（线性）`[0, 4]`。1 = 带通前谐波能量等于分离出的低频能量。默认 0.5（−6 dB）— 在 HYBRID 中使 2 次谐波听起来与基波大小相近的值。没有基波的 `HARMONICS_ONLY` 建议 1.0 左右 |
| `reserved[6]` | 0 |

**返回值** — `1` = 已应用 / `0` = 失败。`NULL`·字段超出范围·`reserved` ≠ 0 时为 `ST_STATUS_INVALID_ARGUMENT`，版本戳不一致时为 `ST_STATUS_VERSION_MISMATCH`（两者都不做任何更改）。`ST_BACKEND_EXA` 后端上下文为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_virtual_bass</code> — 读取虚拟低音设置</summary>

```c
int st_rt_render_get_virtual_bass(const STRT_Context* context, STVirtualBassDesc* outDesc);
```

**用途** — 返回已保存的虚拟低音设置（请求值）。若从未 set，则填入默认值。

**调用方式** — 线程：`[control]` — 短暂持有声化器控制锁并复制保存值。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outDesc` | 输出。调用方填写 `structSize` / `apiVersion`。字段参见 `st_rt_render_set_virtual_bass` 条目 |

**返回值** — `1` = 成功 / `0` = 失败。`ST_BACKEND_EXA` 后端上下文填入默认值（关闭）。

</details>

<details>
<summary><code>st_rt_render_set_eq</code> — 设置输出 9 频段图示 EQ（混音器 EQ）</summary>

```c
int st_rt_render_set_eq(STRT_Context* context, const float gainsDb[ST_FREQUENCY_BANDS], int enabled);
```

**用途** — 只作用于渲染输出的 9 频段音色控制。不会使传播·IR 结果失效。输出 EQ 只有一个，此函数是输出参量 EQ（`st_rt_render_set_parametric_eq`）的 **兼容视图** — 在每个引擎频段中心（63…16k Hz）设置 Q 1.414 的峰值滤波器共 9 个 + 前级放大 0 dB。

**调用方式** — 渲染期间可随时调用。此函数与 `st_rt_render_set_parametric_eq` 会替换同一个 EQ 的整个频段列表，**以最后调用的一方为准**。此路径立即替换系数（无斜坡），在 9 声道及以上的扬声器布局中直通。即使只想切换开关，也必须同时传入 `ST_FREQUENCY_BANDS` 个增益。没有 9 频段专用 getter，`st_rt_render_get_parametric_eq` 会把此设置返回为 9 个 `PEAKING` 频段。线程：`[control]` — 只改变输出级，不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `gainsDb` | 频段增益 [dB] `ST_FREQUENCY_BANDS`（9）个，顺序为 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz。引擎会 clamp 到 `[−24, +24]` dB。为 `NULL` 时不做任何操作 |
| `enabled` | 为 0 时更新系数但旁路。非 0 时开启 |

**返回值** — `1` = 已应用 / `0` = 失败（`gainsDb` 为 `NULL` 等）。

</details>

<details>
<summary><code>st_rt_render_set_parametric_eq</code> — 设置输出参量 EQ</summary>

```c
int st_rt_render_set_parametric_eq(STRT_Context* context, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 用于耳机校正（AutoEq 配置等）或输出音色调整的最多 16 频段参量 EQ。只作用于渲染输出，不会使传播·IR 结果失效。

**调用方式** — 渲染期间可随时调用，变更时以 20 ms 交叉淡化过渡（从 9 频段视图切换过来时也是如此）。作用位置在渲染链末端、主增益之前（立体声·双耳），扬声器输出时则在解码·距离对齐之后。所有输出声道（含扬声器 LFE）都施加相同滤波器 — 等同于作用在声学总和上，无论低频如何在主声道·LFE 间分配，最终音色都相同。各声道不同的校正请使用 `st_rt_render_set_speaker_channel_eq`。最多处理 64 声道。与 `st_rt_render_set_eq` 是同一个 EQ，因此以最后调用的 setter 为准。AutoEq 文本用 `st_rt_render_parse_autoeq_parametric` 转换为频段数组后传入。线程：`[control]` — 只改变输出级，不要在音频回调中调用。是否支持通过 `ST_CAP1_OUTPUT_PARAMETRIC_EQ`（能力字 1）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `bands` | `bandCount` 个元素的频段数组。仅在调用期间读取。`bandCount` = 0 时可为 `NULL` |
| `bandCount` | 频段数 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` = `[0, 16]` |
| `preampDb` | 前级放大 [dB]，clamp 到 `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[−48, +12]`。主要用途是用负值防止削波，提升则由主增益负责 |
| `enabled` | 为 0 时保存列表但直通 |

**结构体** `STParametricEqBand`（32 bytes，作为数组元素没有版本戳）

| 字段 | 说明 |
|---|---|
| `type` | `STParametricEqType` — `PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 此频段为恒等（跳过），其他 = 开启 |
| `frequencyHz` | 中心（PEAKING·NOTCH）或拐点（搁架中点·LP·HP）频率。clamp 到 `[20, min(20000, 0.49·Fs)]` Hz |
| `gainDb` | 仅 PEAKING·LOW_SHELF·HIGH_SHELF 使用（LP·HP·NOTCH 只保存）。clamp 到 `[−24, +24]` dB |
| `q` | clamp 到 `[0.1, 30]`，搁架为 `[0.1, 3]`（大 Q 的搁架会在拐角处产生大的谐振峰） |
| `reserved[3]` | 必须为 0（否则拒绝） |

滤波器定义（输出 EQ·声源 EQ·扬声器声道 EQ 通用）：每个频段为一个 RBJ Audio EQ Cookbook 二阶节，搁架为使用 Q 的 RBJ 搁架（与 AutoEq 相同）。Fs 为引擎内部采样率 44100 Hz，系数·运算为 double Direct Form I。链路为前级放大 → 频段 0..count−1 串联。`enabled` = 0 的频段以及 \|gain\| ≤ 1e-4 dB 的 PEAKING·搁架严格为恒等，整体关闭或无效果时（全部频段恒等 + 前级放大 0 dB）不触碰采样。值改变时新旧设置并行运行 20 ms 并交叉淡化输出（不是系数插值，因此无咔嗒声·发散），期间若再次变更，只等待最新的一个值，随后接着过渡。有限值会 clamp 到上述范围，getter 返回 clamp 后的有效值。

**返回值** — `1` = 已应用 / `0` = 失败。为 `0` 时 `st_rt_get_last_status`：

- `ST_STATUS_INVALID_ARGUMENT` — `bandCount` 超出范围、`bands` 为 `NULL`（`bandCount` > 0）、非有限值、未知 `type`、`reserved` ≠ 0。不做任何更改。
- `ST_STATUS_UNAVAILABLE` — `ST_BACKEND_EXA` 后端上下文

</details>

<details>
<summary><code>st_rt_render_get_parametric_eq</code> — 读取输出 EQ 频段列表</summary>

```c
int st_rt_render_get_parametric_eq(const STRT_Context* context, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 返回当前输出 EQ 的频段列表（clamp 后的有效值）·前级放大·开启状态。用 `st_rt_render_set_eq` 设置的配置也读作 9 个 `PEAKING` 频段（Q 1.414）。

**调用方式** — 不知道大小时，先以 `outBands` 为 `NULL` 调用只获取 `outBandCount`，再次调用。给出 `ST_PARAMETRIC_EQ_MAX_BANDS`（16）个容量则总能容纳。线程：`[control]` — 持有声化器控制锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outBands` | 频段输出数组。为 `NULL` 时为大小查询（不写频段）。字段参见 `st_rt_render_set_parametric_eq` 条目 |
| `bandCapacity` | `outBands` 容量（元素数），0 以上 |
| `outBandCount` | 频段数输出。为 `NULL` 时跳过 |
| `outPreampDb` | 前级放大 [dB] 输出。为 `NULL` 时跳过 |
| `outEnabled` | 开启状态（0/1）输出。为 `NULL` 时跳过 |

**返回值** — `1` = 成功（含大小查询） / `0` = 失败。为 `0` 时 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（`bandCapacity < 0`） / `ST_STATUS_BUFFER_TOO_SMALL`（容量小于频段数 — 此时仍会写入个数·前级放大·开启状态） / `ST_STATUS_UNAVAILABLE`（`ST_BACKEND_EXA` 后端）。

</details>

<details>
<summary><code>st_rt_render_parse_autoeq_parametric</code> — 将 AutoEq ParametricEQ.txt 解析为频段数组</summary>

```c
int32_t st_rt_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**用途** — 将 AutoEq 的 `ParametricEQ.txt`（Equalizer APO 语法的子集）文本转换为 `STParametricEqBand` 数组与前级放大。结果可直接传入 `st_rt_render_set_parametric_eq`（以开启状态）、`st_rt_source_set_parametric_eq`、`st_rt_render_set_speaker_channel_eq`。

**调用方式** — 不需要上下文，无全局状态·分配。与离线库的 `st_off_render_parse_autoeq_parametric` 实现相同、约定相同。线程：`[any]` — 在任何线程调用都不会阻塞。是否支持包含在 `ST_CAP1_OUTPUT_PARAMETRIC_EQ`（能力字 1）中。

接受的语法（不区分大小写）：

```text
Preamp: -6.2 dB
Filter 1: ON LSC Fc 105 Hz Gain 6.8 dB Q 0.70
```

- `Preamp: <数> [dB]` — 多行时按 dB 相加。
- `Filter[ <编号>]: ON|OFF <类型> Fc <数> [Hz] [Gain <数> [dB]] [Q <数>]` — 类型为 `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`。省略 Q 时搁架·LP·HP 为 0.7071，PK·NO 必须给出 Q。PK·搁架必须给出 Gain。`OFF` 滤波器作为 `enabled` 0 的频段加入并计入频段数。
- 忽略空行与 `#` 之后的内容（行尾注释），接受 UTF-8 BOM·CRLF。数值读取与区域设置无关。
- 拒绝：其他命令（`Channel`·`Device`·`GraphicEQ`·`Include` 等）、`BP`·`AP`·`IIR`、搁架斜率形式（`LS 6dB`）、`BW Oct`、超出范围的值（Fc `[20, 20000]` Hz · Gain ±24 dB · Q `[0.1, 30]`，搁架 Q `[0.1, 3]` · 前级放大最终和 `[−48, +12]` dB）、注释以外的非 ASCII、指数表示法。解析器不 clamp，而是拒绝。

| 参数 | 说明 |
|---|---|
| `utf8Text` | 以 NUL 结尾的 UTF-8 文本。必需 |
| `outBands` | 频段输出数组。`bandCapacity` > 0 时必需。`reserved` 填为 0 |
| `bandCapacity` | `outBands` 容量，0 以上 |
| `outBandCount` | 频段数输出。必需 |
| `outPreampDb` | 前级放大 [dB] 输出。必需 |
| `outErrorLine` | 失败时的错误行号（从 1 开始，与行无关的错误为 0 — 前级放大最终和超出范围在文件末尾判定，为 0；若存在行级错误则优先报告行级错误）。允许 `NULL` |
| `outErrorMessage` | 失败原因（以 NUL 结尾的英文，按容量截断）。允许 `NULL` |
| `errorMessageCapacity` | `outErrorMessage` 字节容量 |

**返回值** — `STAutoEqParseStatus`。成功时写入 `outBands[0..*outBandCount)` 与 `*outPreampDb`，失败时 `*outBandCount` = 0 · `*outPreampDb` = 0。由于没有上下文，不会记录到 `st_rt_get_last_status`。

| 值 | 含义 |
|---|---|
| `ST_AUTOEQ_PARSE_OK`(0) | 成功 |
| `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`(1) | `utf8Text`·`outBandCount`·`outPreampDb` 为 `NULL`、`bandCapacity < 0`、`outBands` 为 `NULL` 而 `bandCapacity > 0` |
| `ST_AUTOEQ_PARSE_SYNTAX`(2) | 行格式错误（非数值·缺少必需字段·重复·未知标记） |
| `ST_AUTOEQ_PARSE_UNSUPPORTED`(3) | 不支持的命令·滤波器类型·斜率·BW 形式 |
| `ST_AUTOEQ_PARSE_OUT_OF_RANGE`(4) | 超出范围的值 |
| `ST_AUTOEQ_PARSE_TOO_MANY_BANDS`(5) | 超过 `ST_PARAMETRIC_EQ_MAX_BANDS` 或 `bandCapacity` |
| `ST_AUTOEQ_PARSE_EMPTY`(6) | 一行 `Preamp`·`Filter` 都没有 |

</details>

<details>
<summary><code>st_rt_render_set_options</code> — 更改渲染选项（路径成分·空间化·限幅器开关）</summary>

```c
void st_rt_render_set_options(STRT_Context* context, const STRenderOptions* options);
```

**用途** — 一次性更改声化阶段的开关。可单独开关直达声·透射·反射·衍射·混响成分进行听感对比（A/B），或选择早期反射渲染路径（exact 对象 / hybrid HOA bed）、空间化·HRTF、路径淡化、输出限幅器。传播与 IR 转换继续生成相同数据，此选项只过滤渲染合成阶段。

**调用方式** — 渲染期间也可调用。若只改部分字段，先用 `st_rt_render_get_options` 获取当前值，修改字段后传入。扬声器输出激活期间，布局掌控 early 路径（全 Ambisonics）·`useSpatialization` = 1·`useHrtf` = 0，因此这些值保持不变，只应用其余开关。关闭扬声器后 `reserved0` 重新限制在 0/1 范围。一次散射开关（`st_rt_render_set_diffuse_rain_enabled`）是此结构体之外的值，此调用不会更改它。线程：`[control]` — 包含 IR 策略钩子的控制线程调用，不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `options` | 新选项。为 `NULL` 时不做任何操作 |

**结构体** `STRenderOptions`（无版本戳的 12 个 `int` 字段，0 = 关 / 非 0 = 开）

| 字段 | 默认 | 说明 |
|---|---|---|
| `renderDirect` | 1 | 直达声渲染 |
| `renderTransmission` | 1 | 透射声渲染 |
| `renderReflection` | 1 | 反射声渲染 |
| `renderDiffraction` | 1 | 衍射声渲染 |
| `renderLateReverb` | 1 | 后期混响（FDN 罐）。为 0 时只关闭混响罐，保留一次散射 |
| `useDoppler` | 1 | 可变延迟多普勒（音高）。实时中被忽略，始终为 1 — 即使传入 0 也开启，get 返回 1。移动声源的辐射增益是另一个开关（`st_rt_set_doppler_gain_mode`） |
| `usePathFade` | 1 | 路径淡化。长度由 `st_rt_render_set_path_fade_time` 设置 |
| `reserved0` | 1 | 早期反射渲染路径（与 `STEarlySpatialMode` 编号相同）。`0` = Objects：所有早期路径作为 exact 对象单独渲染（渲染开销与路径数成正比增长）。`1` = Hybrid：听者全局预算内的 exact 对象 + 其余早期反射·一次散射为 HOA3 bed。实时游戏集成建议使用 1。超出范围的值会 clamp 到 `[0, 1]`。扬声器输出期间可能读到表示布局专用路径的其他值 |
| `useSpatialization` | 1 | 使用空间化（声像·HRIR） |
| `useHrtf` | 0 | HRTF 双耳空间化。`st_rt_render_start` 的 `useHrtf` 参数在渲染开始时决定此值 |
| `useLimiter` | 1 | 开启输出限幅器。类型由 `st_rt_render_set_limiter_type` 设置 |
| `outputBandPressure` | 0 | 预留槽位。实时中始终为 0 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_get_options</code> — 读取当前渲染选项</summary>

```c
void st_rt_render_get_options(const STRT_Context* context, STRenderOptions* outOptions);
```

**用途** — 填充当前应用的 `STRenderOptions`。用于只改部分字段前先读取。

**调用方式** — 线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outOptions` | 输出。为 `NULL` 时不做任何操作。字段参见 `st_rt_render_set_options` 条目 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_set_diffuse_rain_enabled</code> — 开关一次散射（diffuse rain）渲染</summary>

```c
void st_rt_render_set_diffuse_rain_enabled(STRT_Context* context, int enabled);
```

**用途** — 一次散射是与直达声·反射声·衍射声·混响（`STRenderOptions` 的 `render*`）并列的独立渲染成分。用此开关单独开关一次散射以进行听感对比。关闭时只去掉 hybrid 路径的 rain bed 单元和 Objects 路径的 rain RIR 单元，FDN 尾部保持不变。反之 `renderLateReverb` = 0 只关闭混响罐，保留一次散射。

**调用方式** — 渲染期间也可调用，无需重新转换 IR，只重新进行渲染准备。它是 `STRenderOptions` 之外的值，因此 `st_rt_render_set_options` 与扬声器布局切换不会更改它。关闭声音追踪时（`st_rt_render_set_sound_tracing_enabled(…, 0)`）一次散射也会一起关闭。默认 1。线程：`[control]` — 重新发布渲染准备的控制线程调用。是否支持通过 `ST_CAP1_RENDER_DIFFUSE_RAIN_GATE`（能力字 1）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | 0 = 关闭一次散射，非 0 = 开启（默认） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_is_diffuse_rain_enabled</code> — 读取一次散射渲染开关状态</summary>

```c
int st_rt_render_is_diffuse_rain_enabled(const STRT_Context* context);
```

**用途** — 返回通过 `st_rt_render_set_diffuse_rain_enabled` 设置的值。

**调用方式** — 线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `1` = 开启（默认） / `0` = 关闭。无上下文时为 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_sound_tracing_enabled</code> — 开关声音追踪效果（基线对比）</summary>

```c
void st_rt_render_set_sound_tracing_enabled(STRT_Context* context, int enabled);
```

**用途** — 用于与关闭声音追踪效果的"距离衰减 + 声像"基线进行对比的开关。`enabled` = 0 不是单独的旁路渲染器 — 仍运行同一条追踪管线，但关闭反射·衍射·混响·一次散射路径以及空气吸收·传播延迟·直达声遮挡，只保留距离衰减与空间化。空间化方式（`st_rt_render_set_spatializer`）保持不变。

**调用方式** — 渲染期间也可调用。关闭状态下场景 setter·传播工作线程·IR 转换·发布仍继续运行 — 这不是停止调度器或数据泵的功能，若要节省 CPU 请使用 `st_rt_idle`。因此关闭状态下也要在第一个 IR 安装之后才会出声。默认开启。线程：`[control]` — 会多次获取场景锁，不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | 0 = 基线（仅距离衰减 + 空间化），非 0 = 开启声音追踪（默认） |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_is_sound_tracing_enabled</code> — 读取声音追踪效果是否开启</summary>

```c
int st_rt_render_is_sound_tracing_enabled(const STRT_Context* context);
```

**用途** — 返回通过 `st_rt_render_set_sound_tracing_enabled` 设置的值。

**调用方式** — 线程：`[any]` — atomic 读取，在任何线程调用都不会阻塞。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `1` = 开启（默认） / `0` = 关闭或上下文为 `NULL`。

</details>

<details>
<summary><code>st_rt_render_set_path_fade_time</code> — 设置路径淡化时间</summary>

```c
void st_rt_render_set_path_fade_time(STRT_Context* context, float seconds);
```

**用途** — 设置 IR 更新导致路径变化时为无咔嗒声过渡而施加的淡化长度（秒）。在声源·听者移动的场景中，用于在过渡平滑度与响应性之间取舍。在 `STRenderOptions.usePathFade` 开启时（默认）使用。

**调用方式** — 渲染期间也可调用。时间参数是与场景单位无关的秒。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `seconds` | 淡化长度 [s]，正有限值。默认 0.05 s。0 及以下·非有限值会被忽略 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_get_path_fade_time</code> — 读取路径淡化时间</summary>

```c
float st_rt_render_get_path_fade_time(const STRT_Context* context);
```

**用途** — 返回当前路径淡化时间（秒）。

**调用方式** — 线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 淡化时间 [s]（默认 `0.05`）。上下文为 `NULL` 时为 `0`。

</details>

<details>
<summary><code>st_rt_render_set_max_delay_seconds</code> — 设置渲染延迟环的最大延迟</summary>

```c
int st_rt_render_set_max_delay_seconds(STRT_Context* context, float seconds);
```

**用途** — 设置渲染器可表示的最大传播延迟（秒）。延迟超过此上限的 exact 路径将从渲染中去掉，后期混响由 FDN 覆盖。大型室内·室外等需要晚到达路径时调大，要减少内存时调小。延迟环内存按每个渲染的声源 9 频段 × 环长度增长。在声源内存预算（`STMemoryBudget`）中，此值是各声源延迟环的上限。

**调用方式** — 会重新分配延迟环，因此最好在创建大量声源之前、开始渲染之前设置。创建时的值也可通过 `STRT_CreateOptions.maxDelaySeconds`（0 = 默认 2.0 s）给出。线程：`[control, blocking]` — 包含延迟环重新分配的较长区间，不要在游戏循环·音频线程中调用。是否支持通过 `ST_CAP_RUNTIME_DELAY_RESIZE`（能力字 0）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `seconds` | 最大延迟 [s]，约 `0.012`（引擎块 512 + 插值余量 8 采样）~ `60`。默认 2.0。与场景单位无关的秒 |

**返回值** — `1` = 已应用（值相同时仍为 1） / `0` = 拒绝（超出范围·非有限值、上下文为 `NULL`）。

</details>

<details>
<summary><code>st_rt_render_get_max_delay_seconds</code> — 读取渲染延迟环的最大延迟</summary>

```c
float st_rt_render_get_max_delay_seconds(const STRT_Context* context);
```

**用途** — 返回当前最大延迟（秒）。

**调用方式** — 线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 最大延迟 [s]（默认 `2.0`）。上下文为 `NULL` 时为 `0`。

</details>

<details>
<summary><code>st_rt_render_get_ring_buffer_samples</code> — 读取延迟环长度（采样）</summary>

```c
int st_rt_render_get_ring_buffer_samples(const STRT_Context* context);
```

**用途** — 以引擎采样（44.1 kHz）为单位返回与当前最大延迟对应的渲染延迟环长度。值为最大延迟 × 44100 加上渲染块（512）与插值余量，用于估算内存。

**调用方式** — 在 `st_rt_render_set_max_delay_seconds` 之后重新读取。线程：`[control]` — 无锁读取引擎状态的控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 环长度（采样）。上下文为 `NULL` 时为 `0`。

</details>

<details>
<summary><code>st_rt_render_start</code> — 开始音频渲染（按输出模式）</summary>

```c
int st_rt_render_start(STRT_Context* context, int useHrtf);
```

**用途** — 开始渲染输出并决定输出形式（耳机双耳 / 立体声声像 / 扬声器布局）。启动什么取决于创建选项 `STRT_CreateOptions.renderOutputMode`。

| `renderOutputMode` | `st_rt_render_start` 所做的事 | 取走输出的一方 |
|---|---|---|
| `ST_RT_RENDER_OUTPUT_DEVICE`(0, 默认) | 打开 OS 音频设备并启动引擎渲染线程 | 引擎直接输出到设备 |
| `ST_RT_RENDER_OUTPUT_HOST_PULL`(1) | **既不创建线程也不创建设备**，只设置双耳/扬声器选择和"允许渲染"标志。pull 缓冲区与重采样器在此分配 | 宿主在自己的音频线程上调用 `st_rt_render_process` |
| `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED`(2) | 启动引擎渲染线程填充输出环（容量 8 块·目标 3 块）。没有设备 | 宿主通过 `st_rt_render_process` 只从环中复制 |

**调用方式** — 在准备好场景·声源·听者后调用。HOST_PULL 系列也 **必须调用** — 调用前 `st_rt_render_process` 返回 0 帧。若使用 HRIR 空间化，先用 `st_rt_render_set_spatializer` 选择数据集，再以 `useHrtf` = 1 开始。若已设置扬声器布局（`st_rt_render_set_speaker_layout[_custom]`）并以 `useHrtf` = 0 开始，则以该布局的 N 声道输出，扬声器输出的激活判定（`st_rt_render_get_speaker_channels`）在此调用之后成立。在引擎空闲（`st_rt_idle`）期间开始时，以 IDLE 状态开始。线程：`[control, blocking]` — DEVICE 模式包含设备·线程启动的较长区间，不要在游戏循环·音频线程中调用。HOST_PULL 支持通过 `ST_CAP_HOST_PULL_RENDER`、BUFFERED 通过 `ST_CAP_HOST_PULL_BUFFERED`（能力字 0）确认。

线程数（PIPELINED 调度器，N = `max(3, 计算线程预算)`）：DEVICE = 计算工作线程 N−1 + 渲染 1 + 设备 1，HOST_PULL = 计算工作线程 N−1（渲染·设备 0），HOST_PULL_BUFFERED = 计算工作线程 N−1 + 渲染 1（设备 0）。有文件输入时再加 1 个解码器线程。实测用 `st_rt_get_thread_inventory` 查看。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `useHrtf` | 1 = HRTF 双耳 2 声道（用 `st_rt_render_set_spatializer` 选择的 HRIR）。0 = 立体声声像 2 声道，若已设置扬声器布局则为其 N 声道。`STRenderOptions.useHrtf` 也由此值决定 |

**返回值** — `1` = 已开始（DEVICE 模式下已在运行时仍为 1） / `0` = 失败（上下文为 `NULL`、设备启动失败等）。

</details>

<details>
<summary><code>st_rt_render_stop</code> — 停止音频渲染</summary>

```c
void st_rt_render_stop(STRT_Context* context);
```

**用途** — 停止通过 `st_rt_render_start` 开始的渲染。

**调用方式** — 各模式的行为：

- DEVICE：停止设备并 join 渲染线程。
- HOST_PULL：清除"允许渲染"标志并清空结转 FIFO（以免下次 start 输出残留尾部）。此后 `st_rt_render_process` 返回 0。
- HOST_PULL_BUFFERED：停止渲染线程并丢弃输出环。环中的部分已计入扬声器组的 `contentFrame` 但不会被听到，因此若要对齐组的位置，请在丢弃前读取 `contentFrame − latencyFrames`（已听到的位置）并用 `st_rt_speaker_set_relocate` 重新定位。

与 `st_rt_render_process` 同时调用也是安全的 — 引擎清除渲染允许标志，等待正在进行的 `st_rt_render_process` 退出后再停止。长时间空闲时若要连设备也释放，请在 `st_rt_get_idle_state` 变为 IDLE 后调用此函数。线程：`[control, blocking]` — 包含设备停止·线程 join，不要在游戏循环·音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_is_running</code> — 读取渲染是否在运行</summary>

```c
int st_rt_render_is_running(const STRT_Context* context);
```

**用途** — 返回渲染状态。含义与输出模式无关、保持一致 — DEVICE 查看设备是否在运行，HOST_PULL 查看的不是设备，而是"允许渲染"标志（`st_rt_render_start` 之后·`st_rt_render_stop` 之前）。

**调用方式** — 线程：`[control]` — 控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `1` = 正在渲染 / `0` = 已停止或上下文为 `NULL`。

</details>

<details>
<summary><code>st_rt_render_process</code> — 在宿主音频线程上取走输出块（pull 渲染）</summary>

```c
int st_rt_render_process(STRT_Context* context, float* interleavedOut, int frames);
```

**用途** — HOST_PULL 系列输出模式的入口。在引擎输出必须经过宿主音频图的集成中 — 游戏引擎子混音效果、音频采集·录制管线等 — 宿主在自己的音频线程上取走块。HOST_PULL 在此调用线程上渲染，HOST_PULL_BUFFERED 只从引擎渲染线程填充的环中复制（宿主回调开销 ≈ memcpy，抖动由环吸收）。三种输出模式使用同一个块函数，因此声音相同。

**调用方式** — 在 `st_rt_render_start` 之后，于每次宿主音频回调中调用。线程：`[audio]` — 在宿主音频线程（MMCSS/HIGHEST）上调用是安全的。不新增锁·分配·系统调用（缓冲区与重采样器在 `st_rt_render_start` 中分配，IR 采用为指针替换），不触碰调用线程的优先级·affinity。仅在此调用区间内开启 FTZ/DAZ，随后恢复原状。

- **声道数** — 双耳·立体声为 2，扬声器布局激活时为 `st_rt_render_get_speaker_channels()` 的值。该函数返回 0 时输出为 **2 声道** — 不要把 0 当作声道数。
- **布局切换** — 渲染期间调用 `st_rt_render_set_speaker_layout[_custom]` / `st_rt_render_disable_speaker_output` 时 pull 输出会重新构建（声道数·引擎块·结转 FIFO·输出重采样器）。切换与此函数同时调用也是安全的 — 引擎清除渲染允许标志，等待正在进行的调用退出后再更改（`st_rt_render_start` / `stop` 也相同）。落在切换窗口内的调用返回 **0 帧**，该块由宿主按静音处理。切换后重新读取 `st_rt_render_get_speaker_channels()`，按该宽度分配缓冲区。
- **欠载** — 声源流填充少于请求时，该声源以静音填充并累计到 `STStreamStatus.underrunFrames`。**绝不会 stall。** 在 BUFFERED 下若每块渲染开销持续超过块时长（11.61 ms），环也无法挡住，该欠载会计入引擎环计数器并以静音填充。
- **任意 `frames`** — 内部以 512 帧引擎块渲染，余下部分留在结转 FIFO 中。即使宿主块不是 512 的倍数（例：48 kHz 下 1024 = 941.6 引擎帧）也不会 stall，但留在 FIFO 中的部分相应地成为延迟。延迟上限为 1 个引擎块 + 重采样器延迟，宿主块是 512 的倍数时结转余量固定为 0（参见 `st_rt_render_get_latency_frames`）。
- **采样率** — `frames` 以 `STRT_CreateOptions.hostSampleRate`（为 0 时为引擎采样率 44100）为单位。非 0 时由引擎进行输出侧转换（BUFFERED 在渲染线程上转换）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `interleavedOut` | 输出缓冲区。interleaved float，须能容纳 `frames × 声道数` 个 |
| `frames` | 请求帧数（宿主采样率），1 以上 |

**返回值** — 实际写入的帧数（正常为 `frames`）。部分返回（`0 < 返回值 < frames`）时其余部分已以静音填充。为 `0` 的情况与 `st_rt_get_last_status`：

| 情形 | 状态 |
|---|---|
| 上下文·缓冲区为 `NULL`，`frames` ≤ 0 | `ST_STATUS_INVALID_ARGUMENT` |
| DEVICE 模式上下文 | `ST_STATUS_UNAVAILABLE` |
| `st_rt_render_start` 之前 | `ST_STATUS_UNAVAILABLE` |
| 布局切换窗口 | 0 帧（按静音处理） |

</details>

<details>
<summary><code>st_rt_render_get_latency_frames</code> — 读取 pull 输出级持有的延迟</summary>

```c
int st_rt_render_get_latency_frames(const STRT_Context* context);
```

**用途** — 以宿主帧返回 pull 路径的 **输出级** 当前持有的延迟。用于 A/V 同步校正。

延迟 = 结转 FIFO 余量 + 输出重采样器延迟 + 输入重采样器固定延迟

**调用方式** — 不是固定值，而是 **调用时刻的快照**。请求的 `frames` 不是 512 的倍数时，每次调用会随结转余量（相当于 0..511 引擎帧）波动，上限为 1 个引擎块 + 重采样器延迟。用于 A/V 同步时，在块处理 **之前** 读取一次。`hostSampleRate` = 0（不转换）时也存在结转 FIFO，因此可能不为 0。BUFFERED 模式下为环中累积的帧（宿主采样率）+ 转换器延迟，上限约为 3 个引擎块。线程：`[any]` — 在任何线程调用都不会阻塞。

此值只计入输出级的部分。"现在推入的输入帧要过多少帧才输出"的完整答案是此值 + `STStreamStatus.queuedFrames` + 引擎 DSP 的固定延迟（限幅器延迟等，设置相同时为常数）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 延迟（宿主帧）。DEVICE 模式下始终为 `0`。

</details>

<details>
<summary><code>st_rt_render_get_process_stats</code> — 读取最后一个渲染块的分阶段耗时</summary>

```c
int st_rt_render_get_process_stats(const STRT_Context* context, STProcessStats* outStats);
```

**用途** — 返回最后完成的一个 512 帧渲染块各阶段的纯运算时间（µs）与抽头数。用于宿主在不查看引擎内部的情况下分辨"渲染为何繁重"。三种输出模式是同一个块函数，因此值的含义相同（HOST_PULL 是在宿主回调内测得的值）。

**调用方式** — 渲染期间可随时、在任何线程调用。线程：`[any]` — seqlock 快照（逐字段 atomic，最多重试 8 次），不会阻塞。是否支持通过 `ST_CAP_PROCESS_STATS`（能力字 0）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outStats` | 输出。调用方填写 `structSize` / `apiVersion` |

**结构体** `STProcessStats`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STProcessStats)` / `ST_ABI_VERSION` |
| `blockSequence` | 每块 +1。0 = 尚未运行过任何块（静音预滚期间也为 0） |
| `sourceInputUs` | 声源输入读取 + 9 频段分频 + 频段延迟环写入（各声源之和） |
| `exactTapsUs` | exact 路径抽头渲染（HRIR 总线累加或立体声声像，各声源之和） |
| `bedUs` | early bed — 各声源 send 总线求和 + 合并 bed 卷积 |
| `sendUs` | 混响 send — 各声源频段总线求和 + 听者全局 send 抽头渲染 |
| `lateUs` | FDN16 后期混响 |
| `outputUs` | 其余 — HRTF 频谱合成·HOA 解码·EQ·限幅器·模式淡化 |
| `totalUs` | 整个块（与 `STTiming.auralProcessMs` 相同的区间）。六个阶段之和等于或略小于此值 |
| `activeSources` | 已连接输入的声源数 |
| `exactTaps` | 该块实际渲染的 exact 抽头数（各声源之和） |
| `sendTaps` | 听者全局 send 抽头数 — 与声源数无关，上限为时间 bin 数 |
| `reserved[8]` | 预留 |

**返回值** — `1` = 成功 / `0` = 失败。`NULL`·版本戳不一致为 `ST_STATUS_VERSION_MISMATCH`，引擎未初始化为 `ST_STATUS_INVALID_CONTEXT`，快照失败为 `ST_STATUS_UNAVAILABLE`（`outStats` 不变）。

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout</code> — 以预设扬声器布局输出</summary>

```c
int st_rt_render_set_speaker_layout(STRT_Context* context, int preset);
```

**用途** — 以实际扬声器布置（2.0~7.1）代替耳机双耳输出 N 声道。扬声器输出时，布局掌控全 Ambisonics early 路径·空间化开启·HRTF 关闭（参见 `st_rt_render_set_options`）。

**调用方式** — 通常在 `st_rt_render_start(context, 0)` 之前设置。渲染期间调用时会按 stop → 应用 → start 重启音频设备，若设备拒绝 N 声道格式，则降级为立体声重试一次。HOST_PULL 系列中 pull 输出会重新构建，期间 `st_rt_render_process` 返回 0 帧。调用后用 `st_rt_render_get_speaker_channels()` 重新读取实际输出宽度。每次设置布局时（即使是相同布局）扬声器声道 EQ 都会全部清空，因此声道 EQ 应在设置布局之后再设置。线程：`[control, blocking]` — 包含设备重启，不要在游戏循环·音频线程中调用。

声道顺序遵循 WAVEFORMATEXTENSIBLE 标准顺序（FL FR FC LFE BL BR SL SR 中跳过布局中没有的声道），方向约定与引擎全局相同（azimuth 正前方 0° · 右侧 +90°，elevation 向上为 +）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `preset` | `0` = 2.0 / `1` = 2.1 / `2` = 4.1 / `3` = 5.1 / `4` = 7.1 / `5` = 笔记本近场 2.0 |

`5`（LaptopNearfield20，"MacBook Pro 16-inch reference"）正好是 2 个 PCM 声道，与 `0` 的区别仅在于聆听几何（半角 30° → 15.642°）。不触碰设备·OS 掌控的内置扬声器处理（低音单元·宽立体声·空间音频 DSP 等）。

**返回值** — `1` = 已应用 / `0` = 失败。`preset` 超出范围时不做任何操作并返回 `0`。

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout_custom</code> — 以任意扬声器布置输出</summary>

```c
int st_rt_render_set_speaker_layout_custom(STRT_Context* context, const float* azimuthDegrees, const float* elevationDegrees, const unsigned char* isLfe, const float* gainTrim, const float* distanceMeters, int channelCount);
```

**用途** — 通过各声道的方向·是否 LFE·微调·距离直接定义预设中没有的扬声器布置（穹顶·不规则阵列等）。给出距离时，以最远的扬声器为基准对齐延迟·1/r 电平，校正到各扬声器距离不同的安装。

**调用方式** — 调用时机·重启·声道 EQ 初始化·`st_rt_render_get_speaker_channels` 重新确认与 `st_rt_render_set_speaker_layout` 相同。声道顺序为数组顺序，方向约定与引擎全局相同（azimuth 正前方 0° · 右侧 +90°，elevation 向上为 +）。限幅器·等响度补偿·虚拟低音作用于最多 32 声道，输出参量 EQ·扬声器声道 EQ 作用于最多 64 声道。线程：`[control, blocking]` — 包含设备重启，不要在游戏循环·音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `azimuthDegrees` | 各声道方位角 [°]，`channelCount` 个。必需 |
| `elevationDegrees` | 各声道仰角 [°]，`channelCount` 个。必需 |
| `isLfe` | 各声道是否 LFE（0/1），`channelCount` 个。必需 |
| `gainTrim` | 各声道线性微调，`channelCount` 个。为 `NULL` 时全部为 1.0 |
| `distanceMeters` | 各声道扬声器距离 [m]，`channelCount` 个（不是场景单位而是米）。非 `NULL` 且所有非 LFE 声道均为正数时，在渲染输出级以最远扬声器为基准进行延迟·1/r 电平对齐。为 `NULL` 时不对齐 |
| `channelCount` | 声道数，1 以上 |

**返回值** — `1` = 已应用 / `0` = 失败（`azimuthDegrees`·`elevationDegrees`·`isLfe` 为 `NULL` 或 `channelCount` ≤ 0 等）。

</details>

<details>
<summary><code>st_rt_render_disable_speaker_output</code> — 关闭扬声器输出并恢复立体声</summary>

```c
void st_rt_render_disable_speaker_output(STRT_Context* context);
```

**用途** — 关闭扬声器布局输出，恢复默认立体声（2 声道）路径。

**调用方式** — 渲染期间会发生设备重启（DEVICE）或 pull 输出重新构建（HOST_PULL 系列），期间 `st_rt_render_process` 返回 0 帧。扬声器声道 EQ 全部清空，`STRenderOptions.reserved0` 重新限制在 0/1 范围。线程：`[control, blocking]` — 包含设备重启，不要在游戏循环·音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_render_get_speaker_channels</code> — 读取扬声器输出声道数</summary>

```c
int st_rt_render_get_speaker_channels(STRT_Context* context);
```

**用途** — 扬声器输出激活时返回当前输出声道数。HOST_PULL 系列中与实际 `st_rt_render_process` 输出宽度一致（为 0 时为 2 声道）。

**调用方式** — 激活判定在 `st_rt_render_start` 之后成立 — 只设置了布局而未开始渲染时仍为 0。更改布局后重新读取以匹配缓冲区宽度。线程：`[control]` — 非原子成员读取，不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 输出声道数。扬声器输出未激活时为 `0`（此时输出为 2 声道）。

</details>

<details>
<summary><code>st_rt_render_set_speaker_channel_eq</code> — 对单个扬声器输出声道设置 EQ（房间校正）</summary>

```c
int st_rt_render_set_speaker_channel_eq(STRT_Context* context, int32_t channelIndex, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 只作用于单个输出声道的参量 EQ，例如按每个物理扬声器测得的房间校正。全声道共用的音色由输出 EQ（`st_rt_render_set_parametric_eq`）负责。

**调用方式** — 在扬声器路径中位于全局输出 EQ 之后、主增益之前。只作用于扬声器布局输出，对立体声·双耳输出无效。未设置（或关闭·无效果）的声道不触碰采样。**每次设置布局时（`st_rt_render_set_speaker_layout[_custom]`，即使是相同布局）以及 `st_rt_render_disable_speaker_output` 时所有声道都会被清空** — 声道编号的含义因布局而异（同样的 3 号在 5.1 中是 LFE），若保留在旧编号上会作用到错误的扬声器。请在设置布局之后再设置。与 `st_rt_render_get_speaker_channels` 不同，声道数在设置布局后立即计入，即使在 `st_rt_render_start` 之前。值改变时以 20 ms 交叉淡化过渡。线程：`[control]` — 只改变输出级，不要在音频回调中调用。是否支持通过 `ST_CAP1_SPEAKER_CHANNEL_EQ`（能力字 1）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `channelIndex` | 输出声道编号（布局声道顺序，含 LFE），`[0, 布局声道数)`。最多 64 声道 |
| `bands` | `bandCount` 个元素的频段数组。`bandCount` = 0 时允许 `NULL`。`STParametricEqBand` 字段·滤波器定义参见 `st_rt_render_set_parametric_eq` 条目 |
| `bandCount` | 频段数 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` |
| `preampDb` | 前级放大 [dB]，clamp 到 `[−48, +12]` |
| `enabled` | 为 0 时保存列表但直通 |

**返回值** — `1` = 已应用 / `0` = 失败。为 `0` 时 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（声道超出范围·无布局，其他校验与 `st_rt_render_set_parametric_eq` 相同） / `ST_STATUS_UNAVAILABLE`（`ST_BACKEND_EXA` 后端）。

</details>

<details>
<summary><code>st_rt_render_get_speaker_channel_eq</code> — 读取扬声器声道 EQ</summary>

```c
int st_rt_render_get_speaker_channel_eq(const STRT_Context* context, int32_t channelIndex, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 返回单个输出声道的 EQ 频段列表（clamp 后的有效值）·前级放大·开启状态。未设置的声道为 0 频段·关闭。

**调用方式** — 输出约定（大小查询、跳过 `NULL` 输出、容量不足处理）与 `st_rt_render_get_parametric_eq` 相同。线程：`[control]` — 持有声化器控制锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `channelIndex` | 输出声道编号，`[0, 布局声道数)` |
| `outBands` | 频段输出数组。为 `NULL` 时为大小查询 |
| `bandCapacity` | `outBands` 容量，0 以上 |
| `outBandCount` | 频段数输出。为 `NULL` 时跳过 |
| `outPreampDb` | 前级放大 [dB] 输出。为 `NULL` 时跳过 |
| `outEnabled` | 开启状态（0/1）输出。为 `NULL` 时跳过 |

**返回值** — `1` = 成功 / `0` = 失败（`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_UNAVAILABLE`，含义与 `st_rt_render_get_parametric_eq` 相同）。

</details>

<details>
<summary><code>st_rt_render_clear_speaker_channel_eqs</code> — 关闭所有扬声器声道 EQ</summary>

```c
int st_rt_render_clear_speaker_channel_eqs(STRT_Context* context);
```

**用途** — 一次性关闭所有声道的扬声器声道 EQ。

**调用方式** — 播放期间以 20 ms 斜坡过渡。没有布局时也会成功。线程：`[control]` — 只改变输出级，不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `1` = 成功 / `0` = 失败（`ST_BACKEND_EXA` 后端为 `ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_create</code> — 创建用于播放多声道输入的虚拟扬声器组</summary>

```c
STSpeakerSetId st_rt_speaker_set_create(STRT_Context* context, const STSpeakerSetDesc* desc);
```

**用途** — 扬声器组用房间内的 N 个虚拟扬声器播放一个多声道 PCM 输入（C 个内容声道）。一个扬声器即引擎创建的一个声源（成员声源），一个声道可由多个扬声器分担输出（影院阵列）。每个组只有 **一个** 输入环（interleaved），每个渲染块取出一次，所有扬声器读取同一块·同一采样 — 欠载也是全声道同时发生，声道之间不会错位。也支持将立体声输入上混为 3.0/5.1/7.1 的上混输入。

**调用方式** — 在准备好场景·听者后创建，用 `st_rt_speaker_set_write` 填充环后用 `st_rt_speaker_set_play` 播放。成员在创建后立即进入播放状态，但在组 play 之前输出静音。成员质量设置（光线数·深度·传输更新阶段）可在创建后随时作用于通过 `st_rt_speaker_set_get_source` 获取的 id（若在首次传播之前，则从第一个 IR 起生效）。线程：`[control, blocking]` — 包含创建 N 个成员声源（+指向性·增益），不要在游戏循环·音频线程中调用。是否支持通过 `ST_CAP1_SPEAKER_SET`（能力字 1）确认。

- **上限** — 组 `ST_SPEAKER_SET_MAX_SETS`（12）个，每组声道 `ST_SPEAKER_SET_MAX_CHANNELS`（16）·扬声器 `ST_SPEAKER_SET_MAX_SPEAKERS`（64）。组不占用宿主流槽位（64）。未使用的槽位·空闲的组在每个渲染块只有几次原子读取。
- **坐标** — 扬声器姿态为 **组坐标**，世界 = 锚点 ∘ 组变换 ∘ 扬声器姿态。`WORLD` 锚点为恒等（固定于房间），`LISTENER` 锚点为听者位置 + yaw（绕 +Y 轴旋转）。`LISTENER` 锚点只通过 `st_rt_speaker_set_update` 的听者字段重新计算，一般的听者 setter（含头部旋转）不会移动组。创建时的锚点为当时的听者位置·yaw。四元数为 XYZW，由引擎归一化（范数 `< 1e-12` 时拒绝）。扬声器局部坐标系·指向性表坐标系与声源相同（forward = +Z）。
- **电平** — 成员音量（与声源音量位置相同，3 ms 斜坡）= `muted`·`silenced` 时为 0，否则为 `gain × trim`。`ST_SPEAKER_SET_FLAG_ARRAY_TRIM` 时 `trim = 1/√N`，N 为同一声道中非 `muted` 且 `gain` > 0 的扬声器数（`silenced` 计入）。LFE 无特殊处理。`st_rt_source_get_volume` 返回斜坡的目标值。
- **成员所有权** — 成员声源归组所有。针对成员 id 的输入（`set_audio_*`·`attach_stream`·`clear_audio`）、播放（play/pause/stop/seek/loop/trigger/retrigger）、姿态（position/direction/velocity/orientation_q）、辐射（directivity/axis_attenuation）、音量·音高·destroy、`st_rt_source_idle`/`_run` 返回 0 或被忽略，并留下 `ST_STATUS_INVALID_ARGUMENT`。质量设置（光线数·深度·更新阶段·EQ·路径开关·路径音量）与 getter 照常可用。指向性在创建时确定，全指向扬声器的旋转不会发送给引擎。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `desc` | 组描述符。调用方填写 `structSize` / `apiVersion`。指针数组仅在调用期间读取（复制） |

**结构体** `STSpeakerSetDesc`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDesc)` / `ST_ABI_VERSION` |
| `channelCount` | 内容声道数 `[1, ST_SPEAKER_SET_MAX_CHANNELS]` |
| `speakerCount` | 扬声器数 `[1, ST_SPEAKER_SET_MAX_SPEAKERS]` |
| `speakers` | `speakerCount` 个元素的 `STSpeakerDesc` 数组 |
| `directivities` | 共享指向性表指针数组（`STSourceDirectivity`）。指向同一表的扬声器共用引擎的一份副本。各表的校验与 `st_rt_source_set_directivity` 相同。允许 `NULL`（`directivityCount` 0） |
| `directivityCount` | `directivities` 元素数 |
| `anchor` | `STSpeakerSetAnchor` — `ST_SPEAKER_SET_ANCHOR_WORLD`(0) / `ST_SPEAKER_SET_ANCHOR_LISTENER`(1) |
| `position[3]` / `rotationXYZW[4]` | 组变换（锚点坐标） |
| `sampleRate` | 输入采样率。须为引擎采样率（44100），或在指定了 `hostSampleRate` 的上下文中为该值 |
| `capacityFrames` | 环容量（宿主帧），`[512, 1048576]`。0 = 16384 |
| `flags` | `ST_SPEAKER_SET_FLAG_ARRAY_TRIM`（对共享同一声道的 N 个扬声器施加 1/√N） / `ST_SPEAKER_SET_FLAG_STATIC`（成员声源设为静态 `isDynamic` 0） |
| `inputChannels` | 上混输入。0 = 按 `channelCount` 原样。2 = 将立体声上混为 `channelCount`（3 = L R C，6 = 5.1，8 = 7.1）— 此时 write 接收立体声 |
| `upmixWindowFrames` | 上混窗口长度 `[1024, 65536]` 偶数，0 = 4096。窗口延迟 = 窗口的一半（默认 2048） |
| `reserved[5]` | 0 |

**结构体** `STSpeakerDesc`

| 字段 | 说明 |
|---|---|
| `channel` | 此扬声器输出的内容声道 `[0, channelCount)` |
| `directivityIndex` | -1 = 全指向，其他 = `STSpeakerSetDesc.directivities` 索引 |
| `pose` | `STSpeakerPose` — 组坐标姿态与电平 |
| `reserved[2]` | 0 |

**结构体** `STSpeakerPose`

| 字段 | 说明 |
|---|---|
| `position[3]` / `rotationXYZW[4]` | 组坐标位置·旋转 |
| `gain` | 线性声压 `[0, 16]` |
| `muted` | 0/1 — 为 1 时音量为 0，且从 `ARRAY_TRIM` 的 N 中排除 |
| `silenced` | 0/1 — 为 1 时音量为 0 但 N 不变（用于测量的单独播放：将其余设为 `silenced`） |
| `reserved[2]` | 0 |

**上混输入**（`inputChannels` = 2）— 引擎内置上混器根据左右成分的电平差确定前方方位（±30°），根据相关度确定前·侧·后（相关 → 前，不相关 → 侧，反相 → 后），在扬声器环上保持能量进行分配，并向 LFE 叠加 (L + R)/2 的低频（至 80 Hz，160 Hz 处为 0）。3.0 为中置提取，只把前方相关汇聚的部分移到 FC，其余留在 L·R 以保持立体声声像（无 LFE）。输出声道顺序为 3.0 = FL FR FC，5.1 = FL FR FC LFE SL SR，7.1 = FL FR FC LFE SL SR BL BR（与扬声器 `channel` 编号相同），假定的角度为 FL −30° · FR 30° · FC 0°，5.1 SL −110° · SR 110°，7.1 SL −90° · SR 90° · BL −150° · BR 150°。上混在调用 write 的生产者线程上以宿主采样率运行（无分配）。截掉了窗口延迟，因此输入帧 n = 内容帧 n，但输入须多送入 `inputDelayFrames` 才会出现在环中，因此预填充要相应增加。stop/relocate 后的第一次 write 也会丢弃上混历史。

**返回值** — 组句柄。失败时 `v < 0`，并删除正在创建的所有成员。`st_rt_get_last_status`：`ST_STATUS_VERSION_MISMATCH` / `ST_STATUS_INVALID_ARGUMENT`（范围·非有限·声道·采样率·`reserved`） / `ST_STATUS_UNAVAILABLE`（组 `ST_SPEAKER_SET_MAX_SETS` 个已用尽）。

</details>

<details>
<summary><code>st_rt_speaker_set_destroy</code> — 删除扬声器组</summary>

```c
int st_rt_speaker_set_destroy(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 删除成员声源（3 ms 淡出）并归还组槽位。

**调用方式** — 不再需要组时调用。对成员 id 调用 `st_rt_source_destroy` 会被拒绝，因此必须用此函数删除。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `1` = 已删除 / `0` = 组不存在。

</details>

<details>
<summary><code>st_rt_speaker_set_get_source</code> — 获取单个扬声器的成员声源 id</summary>

```c
STSourceId st_rt_speaker_set_get_source(STRT_Context* context, STSpeakerSetId set, int speakerIndex);
```

**用途** — 返回负责第 `speakerIndex` 号扬声器的成员声源 id。用于各成员的质量设置（光线数·深度·传输更新阶段·EQ·路径开关·路径音量）与声源 getter。

**调用方式** — 创建组后可随时调用。若在首次传播之前设置质量，则从第一个 IR 起生效。输入·播放·姿态·辐射·音量·音高·destroy 归组所有，因此用此 id 调用会被拒绝（参见 `st_rt_speaker_set_create`）。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `speakerIndex` | 扬声器编号 `[0, speakerCount)`（`STSpeakerSetDesc.speakers` 顺序） |

**返回值** — 成员声源 id。失败（组不存在·超出范围）时 `v < 0`。

</details>

<details>
<summary><code>st_rt_speaker_set_update</code> — 批量更新组变换·扬声器姿态·听者</summary>

```c
int st_rt_speaker_set_update(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetUpdate* update, uint32_t* outChanged);
```

**用途** — 一次性更改组变换、全部扬声器姿态·电平、听者姿态、`ARRAY_TRIM` 标志。值与上次应用值逐位相同时不发送给引擎，因此即使每帧调用也只反映变化的部分。

**调用方式** — 可在游戏循环中每帧调用。`LISTENER` 锚点组只通过此调用的听者字段重新计算，同一调用也会以相同布置移动引擎听者（含义与 `st_rt_listener_set_position`/`rotation` 相同）。原子性：SYNCHRONOUS 调度器下，下一次 `st_rt_propagate` 一次性看到全部更新。PIPELINED 将全部扬声器位置与听者位置放入同一个修订版本，旋转变更是场景提交，可能比位置早一个任务可见。`outChanged` 为 0 表示没有向引擎发送任何内容，因此 SYNCHRONOUS 宿主可以跳过 propagate。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `update` | 更新内容。调用方填写 `structSize` / `apiVersion`。只读取 `fields` 中包含的项 |
| `outChanged` | 已发送给引擎的项目位输出。允许 `NULL`。`ST_SPEAKER_SET_CHANGED_LISTENER`（引擎听者姿态） / `ST_SPEAKER_SET_CHANGED_POSES`（成员声源世界位置·旋转） / `ST_SPEAKER_SET_CHANGED_GAINS`（成员声源音量） |

**结构体** `STSpeakerSetUpdate`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetUpdate)` / `ST_ABI_VERSION` |
| `fields` | 要读取的项目位：`ST_SPEAKER_SET_UPDATE_TRANSFORM` / `_SPEAKERS` / `_LISTENER` / `_FLAGS` |
| `position[3]` / `rotationXYZW[4]` | TRANSFORM — 组变换（锚点坐标） |
| `listenerPosition[3]` | LISTENER — 听者位置（场景单位） |
| `listenerYaw` | LISTENER — yaw [rad]，+Y 轴 |
| `listenerPitch` | LISTENER — pitch [rad]。只作用于听者，锚点只跟随 yaw |
| `speakerCount` | SPEAKERS — 须与组的扬声器数相同 |
| `speakers` | SPEAKERS — `speakerCount` 个元素的 `STSpeakerPose` 数组（全部）。字段参见 `st_rt_speaker_set_create` 条目 |
| `flags` | FLAGS — `ST_SPEAKER_SET_FLAG_ARRAY_TRIM` 开/关（其他位为 0） |
| `reserved[5]` | 0 |

**返回值** — `1` = 成功 / `0` = 失败。

</details>

<details>
<summary><code>st_rt_speaker_set_write</code> — 向组环写入 interleaved PCM</summary>

```c
int st_rt_speaker_set_write(STRT_Context* context, STSpeakerSetId set, const float* interleaved, int frames);
```

**用途** — 向环提供组的多声道内容。无论来自文件解码·网页 PCM·麦克风等何处，写入方式都相同。

**调用方式** — 播放前预填充，播放中参照 `st_rt_speaker_set_get_status` 的 `queuedFrames` 调整供给量。渲染未运行时也可写入，引擎·组空闲期间写入的帧会留在环中，唤醒后输出。线程：`[any]` — 仅限单一生产者，无锁·无分配（上混也在此调用线程上运行）。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `interleaved` | interleaved float，`frames × 输入声道数` 个。输入声道数 = `channelCount`，上混输入时为 2 |
| `frames` | 帧数（宿主帧 = `STSpeakerSetDesc.sampleRate`） |

**返回值** — `hostSampleRate` = 0 且无上混时，为实际进入环的帧数（背压 — 其余部分需重新写入）。其他情况（指定了 `hostSampleRate` 或上混输入）始终为 `frames` 且无背压，因此用 `queuedFrames` 调整供给量。溢出部分只记录在 `droppedFrames` 中。

</details>

<details>
<summary><code>st_rt_speaker_set_write_planar</code> — 以按声道数组向组环写入 PCM</summary>

```c
int st_rt_speaker_set_write_planar(STRT_Context* context, STSpeakerSetId set, const float* const* channels, int frames);
```

**用途** — 与 `st_rt_speaker_set_write` 相同，只是输入为按声道（planar）数组。在解码器输出 planar 时可避免 interleave 复制。

**调用方式** — 与 `st_rt_speaker_set_write` 相同。线程：`[any]` — 仅限单一生产者，无锁·无分配。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `channels` | 声道指针数组 `channels[输入声道数]`，每个含 `frames` 个 float。输入声道数 = `channelCount`，上混输入时为 2 |
| `frames` | 帧数（宿主帧） |

**返回值** — 与 `st_rt_speaker_set_write` 相同。

</details>

<details>
<summary><code>st_rt_speaker_set_play</code> — 开始播放组</summary>

```c
int st_rt_speaker_set_play(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 请求播放整个组。所有成员在同一渲染块中一起开始。

**调用方式** — 请求状态 **在调用时立即** 改变，声音在下一个渲染块边界一次性作用于整个组。因此即使在渲染停止期间，stop → relocate → write（预填充）→ play 也会累积起来，在下一个首块中一并生效。play 会以 `ST_SPEAKER_SET_STARTING` 等待，直到包含成员声源的 IR 被渲染器采用（不取出内容），之后即使环为空也会开始（计为欠载）— 宿主应先填充。**首次播放不带淡入** 开始，暂停·停止后重新开始时施加 132 采样淡入。pause 后恢复从停止时的那一帧开始。引擎空闲时，唤醒后在块边界解除。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `1` = 已请求 / `0` = 失败（组不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_pause</code> — 暂停组（保留队列）</summary>

```c
int st_rt_speaker_set_pause(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 暂停整个组。保留环中累积的队列，因此再次 play 时从停止时的那一帧继续。

**调用方式** — 请求立即生效，声音在下一个渲染块边界生效。停止时各声道从最后输出的采样到 0 施加 132 采样斜坡，并不再从环中取出，因此 `contentFrame` 是实际输出的位置。已经进入房间的混响会继续鸣响。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `1` = 已请求 / `0` = 失败（组不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_stop</code> — 停止组（清空队列）</summary>

```c
int st_rt_speaker_set_stop(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 停止整个组并清空环中的队列。

**调用方式** — 请求立即生效，声音在下一个渲染块边界生效（132 采样斜坡淡出）。已经进入房间的混响会继续鸣响。若要定位，在 stop（或 pause）之后按 `st_rt_speaker_set_relocate` → write（预填充）→ play 的顺序调用。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `1` = 已请求 / `0` = 失败（组不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_relocate</code> — 重新定位组的内容位置（定位）</summary>

```c
int st_rt_speaker_set_relocate(STRT_Context* context, STSpeakerSetId set, int64_t contentFrame);
```

**用途** — 用于定位（seek）。丢弃到调用时为止写入的帧，从下一次取出起 `contentFrame` 从此值开始计数。之后写入的帧会保留。

**调用方式** — 只在请求状态为停止·暂停时接受（在 stop 之后立即调用也可以）。输入重采样器（`hostSampleRate`）·上混历史也会在下一次 write 时丢弃，因此 relocate 后的第一个输出采样按采样精度对齐到其后首次写入的宿主帧（= `contentFrame` 基准值）。在 HOST_PULL_BUFFERED 中用 `st_rt_render_stop`/`start` 丢弃输出环之前，先读取 `contentFrame − latencyFrames`（已听到的位置），再用此函数重新定位。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `contentFrame` | 新的内容位置基准（宿主帧） |

**返回值** — `1` = 已应用 / `0` = 失败（正在播放、组不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_idle</code> — 使组（全部成员）进入空闲</summary>

```c
int st_rt_speaker_set_idle(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 消除无内容可播放的组的计算·渲染开销。一次性（1 次场景提交）使全部成员进入空闲（行为与 `st_rt_source_idle` 相同），当组窗口在与成员相同的时长（延迟线长度 + 1 s）内为静音且原声模式延迟环也为空时，每个渲染块进行的环取出·原声混合也会停止（块时刻 `renderFrame` 也停止）。

**调用方式** — 在停止播放后（stop·pause·写入静音）调用。空闲期间写入的帧留在环中，唤醒后输出。对成员 id 的 `st_rt_source_idle`/`_run` 会被拒绝，因此组用此函数和 `st_rt_speaker_set_run` 处理。线程：`[control]` — 持有场景锁。是否支持通过 `ST_CAP1_ENGINE_IDLE`（能力字 1）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `1` = 成功 / `0` = 失败（`ST_STATUS_NOT_FOUND` 组不存在，`ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_run</code> — 唤醒空闲的组</summary>

```c
int st_rt_speaker_set_run(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 重新运行通过 `st_rt_speaker_set_idle` 进入空闲的组。先唤醒成员再打开组窗口，因此即使其间插入渲染块也不会丢失内容。

**调用方式** — 在重新播放之前调用。空闲期间写入环的帧在唤醒后输出。线程：`[control]` — 持有场景锁。是否支持通过 `ST_CAP1_ENGINE_IDLE`（能力字 1）确认。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `1` = 成功 / `0` = 失败（`ST_STATUS_NOT_FOUND` 组不存在，`ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_get_idle_state</code> — 读取组的空闲状态</summary>

```c
int st_rt_speaker_set_get_idle_state(const STRT_Context* context, STSpeakerSetId set);
```

**用途** — 以 `STRT_IdleState` 返回组的空闲·运行状态。组与成员都空闲时才为 IDLE。

**调用方式** — 用于在 `st_rt_speaker_set_idle` 之后确认尾部是否已全部输出。线程：`[control]` — 控制线程查询。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |

**返回值** — `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`（1，正在输出剩余声音） / `ST_RT_IDLE_IDLE`(2)。组不存在·上下文为 `NULL` 时为 `-1`。

</details>

<details>
<summary><code>st_rt_speaker_set_set_direct</code> — 设置原声模式（跳过传播的直接输出）</summary>

```c
int st_rt_speaker_set_set_direct(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetDirect* direct);
```

**用途** — 原声模式跳过传播·声化，将组声道直接输出到输出声道。开关时在房间内扬声器声音与内容原声之间以相同内容位置交叉淡化。使用相同的环·`contentFrame`·transport·淡化，将每个渲染块取出的同一内容采样按原声 g、湿路径（成员声源）1 − g 分配，并在交叉淡化期间线性移动 g。即使湿路径变为 0，已经进入房间的混响也会自然衰减。

**调用方式** — 每次都发送完整设置，从下一个渲染块起应用。组未发声期间（停止·暂停·等待开始）更改的设置会不经交叉淡化立即生效 — 以原声模式首次播放时，从第一个采样起只输出原声。原声在 `delayFrames` 之后经矩阵叠加到输出级（输出 EQ → 主增益 → 限幅器）**之前**，因此限幅器·输出级延迟与湿路径相同，剩余的差异即湿路径的传播延迟（距离/声速）用 `delayFrames` 对齐。原声开启期间更改 `delayFrames` 时不做衔接而直接跳转。耳机输出时原声也不经过 HRTF。从未开启原声的组的输出与没有此功能时逐位相同。线程：`[control]` — 不要在音频回调中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `direct` | 原声设置。调用方填写 `structSize` / `apiVersion` |

**结构体** `STSpeakerSetDirect`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDirect)` / `ST_ABI_VERSION` |
| `enabled` | 0 = 湿路径（默认），1 = 原声 |
| `crossfadeMs` | 切换长度 `[0, 1000]` ms。短于 3 ms 时为 3 ms |
| `delayFrames` | 原声延迟（宿主帧），`[0, 1 s]` |
| `outputChannels` | `matrix` 行数。为 0 时无矩阵（引擎默认映射） |
| `matrix` | `outputChannels × channelCount`，输出行优先 — `matrix[o * channelCount + c]`。允许 `NULL` |
| `reserved[6]` | 0 |

`outputChannels` 与当前输出声道数（立体声 2 · 扬声器布局 N）不同或 `matrix` 为 `NULL` 时，使用引擎默认映射。

| 条件 | 默认映射 |
|---|---|
| 声道数 = 输出数 | 原样 |
| 输出 2 | ITU-R BS.775 下混 — 3.0 读作 FL FR FC（FC 0.7071），其他读作 FL FR FC LFE SL SR [BL BR \| BC]，FC·环绕·后方 0.7071，LFE 0（排除），6.1 的 BC 两侧各 0.5，单声道两侧各 0.7071，其他声道数为偶数 → L · 奇数 → R |
| 其他 | 从前往后 1:1 |

下混不做归一化（由限幅器承接）。

**返回值** — `1` = 已应用 / `0` = 失败（`ST_STATUS_VERSION_MISMATCH` · `ST_STATUS_INVALID_ARGUMENT` · `ST_STATUS_NOT_FOUND`）。

</details>

<details>
<summary><code>st_rt_speaker_set_get_status</code> — 读取组的播放状态·计数器·时刻</summary>

```c
int st_rt_speaker_set_get_status(const STRT_Context* context, STSpeakerSetId set, STSpeakerSetStatus* outStatus);
```

**用途** — 一次性返回组的 transport 状态、环状态、累计计数器以及用于采样级对齐的渲染时刻。用于调节供给量（`queuedFrames`）、显示播放位置以及与视频的采样级同步。

**调用方式** — 可在任何线程调用。帧字段全部为宿主帧（查询时将引擎帧累计值 round-half-up 换算一次），计数器为自创建以来的累计值。`state`·`contentFrame`·`renderFrame`·`playRenderFrame`·`playContentFrame` 由同一个渲染块一起写入，因此在一次调用内彼此一致。`latencyFrames` 单独读取输出级状态，因此在与渲染不同的线程上读取时可能偏差 ±1 块 — 采样级对齐请使用渲染时刻字段。线程：`[any]` — 不会阻塞。

采样级对齐：若播放从 `playRenderFrame` 开始后无欠载地持续，则渲染位置 r（`renderFrame` 轴）的内容为 `playContentFrame + (r − playRenderFrame)`（含 3 ms 淡入）。输出采样随后再延迟 `latencyFrames`（输出级 + 限幅器）输出。声音的传播延迟（距离/声速）与滤波器群延迟不包含在内，若指定了 `hostSampleRate`，两轴换算的舍入可能造成 ±1 帧差异。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `set` | 组句柄 |
| `outStatus` | 输出。调用方填写 `structSize` / `apiVersion` |

**结构体** `STSpeakerSetStatus`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetStatus)` / `ST_ABI_VERSION` |
| `state` | `STSpeakerSetState` — `STOPPED`(0) / `PLAYING`(1) / `PAUSED`(2) / `STARTING`（3，play 请求后等待包含成员声源的 IR 被采用 — 不取出内容） |
| `queuedFrames` | 环中累积的部分 |
| `capacityFrames` | 引擎实际分配的环容量 |
| `latencyFrames` | 渲染 → 输出延迟：输出级（pull FIFO·缓冲环·输出重采样器）+ 限幅器 |
| `contentFrame` | relocate 基准 + 渲染从环中取出的部分 |
| `underrunFrames` | 播放中环为空而以静音填充的部分 |
| `droppedFrames` | 环已满而丢弃的部分 |
| `totalWrittenFrames` | 实际进入环的部分 |
| `renderFrame` | 上下文迄今渲染的帧（含静音预滚块） |
| `playRenderFrame` | 最后一次播放开始块的首个采样渲染位置。开始前为 −1 |
| `playContentFrame` | 该采样的内容帧 |
| `appliedSetters` | `st_rt_speaker_set_update` 发送给引擎的值数（位置·旋转·增益·听者位置·旋转） |
| `skippedSetters` | 因逐位相同·全指向旋转而未发送的值数 |
| `directMix` | 原声比例 0..1（上一块末尾）。0 = 仅湿路径 |
| `inputDelayFrames` | 上混窗口延迟（宿主帧，无上混时为 0） |
| `reserved[4]` | 预留 |

**返回值** — `1` = 成功 / `0` = 失败（`NULL`、版本戳不一致、组不存在）。

</details>

</details>

<details>
<summary><strong>调试 · 可视化</strong> — 9 个</summary>

<details>
<summary><code>st_rt_debug_get_frame_generation</code> — 读取传播帧代号</summary>

```c
uint64_t st_rt_debug_get_frame_generation(const STRT_Context* context);
```

**用途** — 仅通过值的变化轻量检测是否有新传播结果的计数器。用于调试可视化判断是否需要每帧重新获取快照。

**调用方式** — 可随时轮询。值变化时调用 `st_rt_debug_acquire_snapshot` 获取新快照。传给 `st_rt_debug_copy_visual_paths` 的代号不是此值，而是 `st_rt_debug_acquire_snapshot` 返回的 `frameGeneration`。线程：`[any]` — 读取一个 atomic。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 当前代号。尚无传播结果或 `context` 为 `NULL` 时为 `0`。

</details>

<details>
<summary><code>st_rt_debug_set_collect_failed_walks</code> — 设置是否也收集中途失败的路径 walk 用于可视化</summary>

```c
void st_rt_debug_set_collect_failed_walks(STRT_Context* context, int enabled);
```

**用途** — 默认可视化只包含从声源完整到达听者的路径。开启此选项后，中途中断的 walk 也会被收集，可用于调试"为什么这条路径没有连通"。

**调用方式** — 创建后可随时调用，从之后的传播结果起生效。收集的路径类型由 `st_rt_debug_set_collect_visual_paths` 的掩码单独指定，此标志独立于该掩码保持（不会出现在 `st_rt_debug_get_collect_mask` 中）。失败 walk 以 `STVisualPathRecord.valid = 0` 进入，复制时用 `ST_VISUAL_PATH_COPY_ALL` 获取。默认关闭。线程：`[control]` — 持有场景写锁，不要在音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | `0` = 关闭（默认） / 非 `0` 值 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_rt_debug_set_collect_visual_paths</code> — 指定用于可视化收集的路径类型掩码</summary>

```c
int st_rt_debug_set_collect_visual_paths(STRT_Context* context, uint32_t mask);
```

**用途** — 让传播记录路径几何，以便在编辑器·调试视图中将 guide 射线、声源传输射线、直达声·透射路径、反射·衍射路径绘制为线段。

**调用方式** — 创建后可随时调用，从之后的传播结果起生效。收集的结果按 `st_rt_debug_acquire_snapshot` → `st_rt_debug_copy_visual_paths` 的顺序获取。默认掩码为 `0`（不收集）。是否支持见 `ST_CAP_PATH_COLLECTION_MASK`。线程：`[control]` — 持有场景写锁，不要在音频线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mask` | `STPathCollectionFlag` 组合（见下表）。`0` = 关闭收集。含未定义位时拒绝 |

**枚举** `STPathCollectionFlag`

| 值 | 名称 | 收集对象 |
|---|---|---|
| `1u << 0` | `ST_PATH_COLLECTION_GUIDE_RAY` | 从听者发射的 guide 射线 |
| `1u << 1` | `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY` | 声源传输射线 |
| `1u << 2` | `ST_PATH_COLLECTION_DIRECT_TRANSMISSION` | 直达声·透射路径 |
| `1u << 3` | `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION` | 反射·衍射路径（存在包含反射段的混合衍射路径，因此合为一个位） |
| 以上四者的 OR | `ST_PATH_COLLECTION_ALL` | 全部 |

**返回值** — `1` = 已应用 / `0` = 拒绝（`context` 为 `NULL`、`mask` 含未定义位）。

</details>

<details>
<summary><code>st_rt_debug_get_collect_mask</code> — 读取当前路径收集掩码</summary>

```c
uint32_t st_rt_debug_get_collect_mask(const STRT_Context* context);
```

**用途** — 确认通过 `st_rt_debug_set_collect_visual_paths` 指定的收集掩码。

**调用方式** — 可随时调用。是否收集失败 walk（`st_rt_debug_set_collect_failed_walks`）不包含在此值中。线程：`[any]` — 读取 atomic 副本。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STPathCollectionFlag` 位组合。默认 `0`，`context` 为 `NULL` 时为 `0`。

</details>

<details>
<summary><code>st_rt_debug_acquire_snapshot</code> — 获取最新传播诊断快照并读取摘要</summary>

```c
int st_rt_debug_acquire_snapshot(STRT_Context* context, STPropagationSnapshotInfo* outInfo);
```

**用途** — 将最新的一个传播代固定用于诊断，并一次性返回该代的路径数·可视化缓冲区大小。所有值都来自 **同一代**，因此路径数统计与可视化路径不会互相错位。

**调用方式** — 若要获取可视化路径，先用此函数获取快照，再用返回的 `frameGeneration` 与数量准备缓冲区并调用 `st_rt_debug_copy_visual_paths`。再次调用时若其间产生了新代，则切换到该代，因此复制针对最后获取的代进行。可视化路径·点数仅在通过 `st_rt_debug_set_collect_visual_paths` 开启收集时才非 0。线程：`[control]` — 持有诊断互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outInfo` | 输出。调用方填写 `structSize = sizeof(STPropagationSnapshotInfo)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STPropagationSnapshotInfo`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 由调用方填写的版本戳 |
| `frameGeneration` | 此快照的代号。原样传给 `st_rt_debug_copy_visual_paths` |
| `collectionMask` | 生成此代时使用的收集掩码（`STPathCollectionFlag`） |
| `reserved0` | 预留 |
| `visualPathCount` | 可视化路径总数（含失败 walk） |
| `validVisualPathCount` | 完整到达的可视化路径数。有效路径位于数组前部 |
| `visualPointCount` | 可视化点总数 |
| `validVisualPointCount` | 属于有效路径的点数。位于数组前部 |
| `totalPathCount` | 此代的全部声学路径数 |
| `reflectionPathCount` | 反射路径数 |
| `diffractionPathCount` | 衍射路径数 |
| `sourceSideOnlyPaths` | 只有声源侧衍射棱边的衍射路径数 |
| `unclassifiedPaths` | 未分类的衍射路径数（正常运行时为 0） |
| `sourceSideEvents` | 声源侧衍射事件数 |
| `terminalOnlyPaths` | 只有听者侧末端棱边衍射的路径数 |
| `sourceAndTerminalPaths` | 同时具有声源侧与听者侧衍射的路径数 |
| `terminalEvents` | 听者侧末端棱边衍射事件数 |
| `reserved[4]` | 预留 |

**返回值** — `1` = 成功 / `0` = `context`·`outInfo` 为 `NULL`、版本戳不一致，或尚无任何传播结果。失败时 `outInfo` 不变。

</details>

<details>
<summary><code>st_rt_debug_copy_visual_paths</code> — 复制已获取快照的可视化路径与点</summary>

```c
int st_rt_debug_copy_visual_paths(STRT_Context* context, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**用途** — 为在调试视图中将路径绘制为线段，把路径记录与顶点数组复制到宿主缓冲区。音频数据不经过此接口（仅用于检查·可视化）。

**调用方式** — 先调用 `st_rt_debug_acquire_snapshot`，用其 `frameGeneration` 与数量准备缓冲区：`VALID_ONLY` 时路径 `validVisualPathCount` 个·点 `validVisualPointCount` 个，`ALL` 时 `visualPathCount` 个·`visualPointCount` 个。缓冲区须容纳相应集合的全部内容，不做部分复制。每条记录的 `points[pointOffset .. pointOffset + pointCount)` 按顺序连接构成一条路径。线程：`[control]` — 持有诊断互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `frameGeneration` | `st_rt_debug_acquire_snapshot` 返回的代号。与已获取快照的代号不同则失败 |
| `copyMode` | `STVisualPathCopyMode`：`ST_VISUAL_PATH_COPY_VALID_ONLY`(0) = 仅完整到达的路径 / `ST_VISUAL_PATH_COPY_ALL`(1) = 含失败 walk 的全部。其他值失败 |
| `outPaths` | 路径记录输出数组。要复制的路径为 0 条时可为 `NULL` |
| `pathCapacity` | `outPaths` 元素数 |
| `outPoints` | 点输出数组。要复制的点为 0 个时可为 `NULL` |
| `pointCapacity` | `outPoints` 元素数 |

**结构体** `STVisualPathRecord`

| 字段 | 说明 |
|---|---|
| `pointOffset` | 此路径首个点在 `outPoints` 中的索引 |
| `pointCount` | 此路径的点数 |
| `depth` | 路径深度（交互阶数） |
| `pathKind` | `STPathKind`（见下表） |
| `soundSourceIndex` | 声源索引。guide 射线为 `-1` |
| `valid` | `1` = 完整到达 / `0` = 中途失败的 walk |
| `totalLengthMeters` | 路径总长度（m） |
| `reserved0` | 预留 |

声学路径的点顺序为声源 → 各交互点 → 听者，guide 射线为听者 → 各命中点。

**枚举** `STPathKind`

| 值 | 名称 | 含义 |
|---|---|---|
| `0` | `ST_PATH_GUIDE_RAY` | guide 射线 |
| `1` | `ST_PATH_DIRECT` | 直达声（含透射） |
| `2` | `ST_PATH_REFLECTION` | 反射 |
| `3` | `ST_PATH_DIFFRACTION_UNKNOWN` | 未分类的衍射（正常运行时不会出现） |
| `1 << 2` | `ST_PATH_DIFFRACTION_S` | 声源侧棱边衍射 |
| `1 << 3` | `ST_PATH_DIFFRACTION_L` | 听者侧末端棱边衍射 |
| `S \| L` | `ST_PATH_DIFFRACTION_SL` | 声源侧与听者侧衍射兼有 |
| `1 << 4` | `ST_PATH_SOURCE_TRANSPORT_RAY` | 声源传输射线 |

**结构体** `STVisualPoint`

| 字段 | 说明 |
|---|---|
| `x`, `y`, `z` | 点坐标（场景坐标系） |
| `flags` | `STVisualPointFlag`：`ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`（`1u << 0`，衍射点） |

**返回值** — `1` = 成功 / `0` = 失败：`context` 为 `NULL`、`copyMode` 超出范围、尚无快照、`frameGeneration` 与已获取的代不同、缓冲区容量不足（或需要时为 `NULL`）。因代号不一致而失败时，重新调用 `st_rt_debug_acquire_snapshot` 后再复制。

</details>

<details>
<summary><code>st_rt_debug_copy_mesh_accel_nodes</code> — 复制单个网格加速结构（BLAS）的节点包围盒</summary>

```c
int st_rt_debug_copy_mesh_accel_nodes(STRT_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 取出传播所用网格加速结构的节点包围盒用于可视化。用于确认网格如何被划分，或在编辑器中叠加绘制 BVH 包围盒。只读取传播所用的结构。

**调用方式** — 在 `st_rt_mesh_create` 之后可随时调用。BLAS 按网格创建时的 `st_rt_scene_set_accel` 值构建。通常先以 `outNodes = NULL` 调用获取节点数，分配缓冲区后再次调用。大型网格有数千个节点，因此可视化时通常用 `maxDepth` 只看上层。缓冲区不足时只写入前序遍历的前部（从最左分支开始），因此若只需上层请用 `maxDepth` 截断。是否支持见 `ST_CAP_ACCEL_DEBUG_NODES`。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 目标网格句柄（`st_rt_mesh_create` 返回的值） |
| `maxDepth` | `< 0` = 全部深度。`0` 及以上时只计数并写入 `depth ≤ maxDepth` 的节点 |
| `outNodes` | 输出数组。为 `NULL` 时为大小查询（忽略 `nodeCapacity`） |
| `nodeCapacity` | `outNodes` 元素数。从前往后写入 `min(全部, nodeCapacity)` 个 |

**结构体** `STAccelNode`（32 字节，无版本戳的数组元素）

| 字段 | 说明 |
|---|---|
| `boundsMin[3]` | 节点包围盒最小坐标 |
| `boundsMax[3]` | 节点包围盒最大坐标 |
| `depth` | 深度，根 = `0` |
| `primitiveCount` | 叶：包含的图元数（≥ 0） / 内部节点：`-1` |

- **顺序**：深度优先前序（pre-order）。根为 `[0]`，每个节点的父节点是数组中位于其前方最近的 `depth − 1` 节点 — 无需父索引即可还原树。
- **坐标**：网格 BLAS 为传给 `st_rt_mesh_create` 的顶点坐标系（网格局部）。若要在实例位置绘制，由宿主乘以对象变换。没有 `sceneRatio` 换算。
- **各加速结构类型的含义**（`st_rt_scene_set_accel` 的 kind）：BVH 系列（`0` BinnedSAH，`2` TinyBVH，`3` LBVH，`4` LBVH_Simd）是构建出的二叉树，4/8-wide 遍历表示的包围盒是此列表的子集。TinyBVH BVH8 的叶最多含 4 个三角形。KD（`1` HybridKD）用分割平面切分根包围盒来推导包围盒，因此兄弟包围盒不重叠且精确划分父节点。可能存在空叶（`primitiveCount = 0`），跨越多个叶的三角形在每个叶中都计数。

**返回值** — `maxDepth` 内的 **全部** 节点数（≥ 0），失败时为 `-1`（`context` 为 `NULL`、网格不存在 → `ST_STATUS_NOT_FOUND`）。因缓冲区不足而截断的复制也返回全部数量，并在 `st_rt_get_last_status` 中留下 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_rt_debug_copy_scene_accel_nodes</code> — 复制场景顶层加速结构（TLAS）的节点包围盒</summary>

```c
int st_rt_debug_copy_scene_accel_nodes(STRT_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 取出在对象实例之上构建的场景加速结构节点包围盒用于可视化。用于确认静态·动态对象在场景中如何分组。

**调用方式** — 在 `st_rt_build` 之后调用。静态 TLAS 由 `st_rt_build` 发布，因此在下一次 `st_rt_build` 之前看不到暂存的静态变更。动态 TLAS 由动态重建重新发布。大小查询（`outNodes = NULL`）·`maxDepth`·截断复制的约定与 `st_rt_debug_copy_mesh_accel_nodes` 相同。是否支持见 `ST_CAP_ACCEL_DEBUG_NODES`。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `layer` | `STAccelLayer`：`ST_ACCEL_LAYER_STATIC`(0) = `st_rt_build` 发布的静态 TLAS / `ST_ACCEL_LAYER_DYNAMIC`(1) = 动态对象 TLAS |
| `maxDepth` | `< 0` = 全部深度。`0` 及以上时只取 `depth ≤ maxDepth` 的节点 |
| `outNodes` | 输出数组。为 `NULL` 时为大小查询 |
| `nodeCapacity` | `outNodes` 元素数 |

`STAccelNode` 字段参见 `st_rt_debug_copy_mesh_accel_nodes` 条目。TLAS 的坐标为场景（世界）坐标系，叶的图元不是三角形而是对象实例。

**返回值** — `maxDepth` 内的全部节点数（≥ 0）。该 TLAS 尚不存在时（构建前、无该类型的对象）为 `0`，不是错误。`-1` = 失败（`context` 为 `NULL`、`layer` 超出范围 → `ST_STATUS_INVALID_ARGUMENT`）。截断复制与 `st_rt_debug_copy_mesh_accel_nodes` 一样留下 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_rt_debug_build_mesh_accel_nodes</code> — 无需上下文构建单个网格的 BLAS 并返回节点包围盒</summary>

```c
int st_rt_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 用于宿主编辑器在创建场景之前预览网格的加速结构。经过与 `st_rt_mesh_create` 相同的输入校验·相同的构建路径，因此 `accelKind` 相同时得到与实时上下文构建的 BLAS 相同的树。

**调用方式** — 无需上下文，可随时调用。每次调用都会重新构建 BLAS（开销与网格大小成正比），因此结果由宿主缓存。大小查询（`outNodes = NULL`）·`maxDepth`·前序顺序约定与 `st_rt_debug_copy_mesh_accel_nodes` 相同。是否支持见 `ST_CAP_ACCEL_DEBUG_NODES`。线程：`[any]` — 不使用全局状态（构建开销由调用线程承担）。

| 参数 | 说明 |
|---|---|
| `mesh` | 输入网格。`vertices` 为 xyz 交错（`numVertices × 3` float），`triangles` 为顶点索引（`numTriangles × 3` int） |
| `accelKind` | `st_rt_scene_set_accel` 的 kind：`0` BinnedSAH / `1` HybridKD / `2` TinyBVH / `3` LBVH / `4` LBVH_Simd。`-1` = 引擎默认（TinyBVH，若有环境变量 `SOUNDTRACING_ACCEL` 则为其值） |
| `maxDepth` | `< 0` = 全部深度。`0` 及以上时只取 `depth ≤ maxDepth` 的节点 |
| `outNodes` | 输出数组。为 `NULL` 时为大小查询 |
| `nodeCapacity` | `outNodes` 元素数 |

**结构体** `STMesh`

| 字段 | 说明 |
|---|---|
| `numVertices` | 顶点数 |
| `vertices` | 顶点坐标数组（xyz 交错） |
| `numTriangles` | 三角形数 |
| `triangles` | 三角形顶点索引数组（每个三角形 3 个） |

`STAccelNode` 字段与节点顺序·坐标约定参见 `st_rt_debug_copy_mesh_accel_nodes` 条目。坐标保持输入顶点坐标系不变。

**返回值** — `maxDepth` 内的全部节点数（≥ 0）。`-1` = 失败（`mesh` 或数组为 `NULL`、数量为 0 及以下、非有限顶点、超出范围的索引、无效的 `accelKind`、分配失败）。由于没有上下文，`st_rt_get_last_status` 中不会留下任何内容。

</details>

</details>

<details>
<summary><strong>离线（`st_off_*`） — 上下文 · 场景 · 声源 · 听者</strong> — 72 个</summary>

<details>
<summary><code>st_off_get_api_version</code> — 返回离线 DLL 的 ABI 版本</summary>

```c
uint32_t st_off_get_api_version(void);
```

**用途** — 告知已加载的 `SoundTracingOffline` 库是以哪个 ABI 版本构建的。这是确认宿主编译时使用的头文件（`STTypes.h` 的 `ST_ABI_VERSION`）与 DLL 是否使用相同结构体布局的唯一判定手段。

**调用方式** — 在加载库后、创建上下文之前调用一次，并与 `ST_ABI_VERSION` 比较。不同则结构体布局不一致，应停止使用。所有带版本戳结构体的 `apiVersion` 字段也填入此值（`ST_ABI_VERSION`）。线程：`[any]` — 编译期常量，可在任何线程无阻塞调用。

**参数** — 无。

**返回值** — 库的 ABI 版本（须与 `ST_ABI_VERSION` 相同才兼容）。

</details>

<details>
<summary><code>st_off_get_version_string</code> — 返回产品发布版本字符串</summary>

```c
const char* st_off_get_version_string(void);
```

**用途** — 以人类可读字符串给出用于日志·诊断界面显示的产品发布版本。

**调用方式** — 可随时调用。不用于 ABI 兼容性判定 — 该判定使用 `st_off_get_api_version`。线程：`[any]` — 不会阻塞。

**参数** — 无。

**返回值** — DLL 拥有的以 NUL 结尾的静态字符串。调用方不得释放。

</details>

<details>
<summary><code>st_off_get_capabilities</code> — 返回能力字 0（<code>ST_CAP_*</code>）</summary>

```c
uint64_t st_off_get_capabilities(void);
```

**用途** — 以位掩码告知此离线库支持的功能。由于这是一个功能按需添加的 ABI，宿主应通过此位而不是函数是否存在来判断是否支持。

**调用方式** — 初始化时读取一次，并与 `ST_CAP_*` 位做 AND 来确认。例：`ST_CAP_OFFLINE`、`ST_CAP_SCENE_RAYCAST`、`ST_CAP_SOURCE_DIRECTIVITY`、`ST_CAP_SCENE_RATIO`、`ST_CAP_THREAD_ATTRIBUTES`、`ST_CAP_SOURCE_EQ` 等。集合与实时 DLL 不同 — 没有实时专用位（`ST_CAP_REALTIME_SINGLE` / `ST_CAP_REALTIME_MULTI`、`ST_CAP_RUNTIME_DELAY_RESIZE`、`ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`、`ST_CAP_ENGINE_TIMING` 等），而有 `ST_CAP_OFFLINE_*` 位。包含 Exa 后端的构建会额外带有 `ST_CAP_BACKEND_EXA`。字 1 及以上的能力（`ST_CAP1_*`）用 `st_off_get_capability_word` 读取 — 不要混用不同字的位做 AND。线程：`[any]` — 编译期常量。

**参数** — 无。

**返回值** — 能力字 0 的位 OR（与 `st_off_get_capability_word(0)` 相同的值）。

</details>

<details>
<summary><code>st_off_get_capability_word</code> — 返回能力字 n</summary>

```c
uint64_t st_off_get_capability_word(uint32_t word);
```

**用途** — 按字查询在字 0 的 64 位用完后新增的能力。此函数本身是否存在可通过字 0 的 `ST_CAP_CAPABILITY_WORDS` 位得知。

**调用方式** — 初始化时读取所需的字，只与同一字的常量（`ST_CAP1_*` 为字 1）做 AND。离线 DLL 的字 1 中包含 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN`、`ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`、`ST_CAP1_OFFLINE_MAX_DELAY`、`ST_CAP1_SOURCE_PARAMETRIC_EQ`、`ST_CAP1_LISTENER_ORIENTATION_Q`。线程：`[any]` — 编译期常量。

| 参数 | 说明 |
|---|---|
| `word` | 字编号。`0` = 与 `st_off_get_capabilities()` 相同的值，`1` = `ST_CAP1_*` 字。头文件已知的字数为 `ST_CAPABILITY_WORD_COUNT`，其他编号返回 `0` |

**返回值** — 该字的位 OR。未知的字为 `0`（= 无相应能力）。

</details>

<details>
<summary><code>st_off_get_sample_rate</code> — 返回引擎采样率（44100 Hz）</summary>

```c
int st_off_get_sample_rate(void);
```

**用途** — 告知引擎生成 IR 与音频所用的固定采样率。用于将离线渲染结果的采样数换算为时间，或判断是否需要重采样到其他采样率。

**调用方式** — 可随时调用。值固定为 44100 Hz，宿主使用其他采样率时由宿主负责重采样。线程：`[any]` — 编译期常量。

**参数** — 无。

**返回值** — `44100`。

</details>

<details>
<summary><code>st_off_set_thread_attributes</code> — 按引擎线程类型指定优先级·核心偏好·affinity</summary>

```c
int st_off_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**用途** — 由宿主在线程 **创建之前** 决定引擎所创建线程的属性。这是让宿主将引擎计算线程纳入自己的线程预算·优先级策略的接口。

**调用方式** — 约定在 `st_off_create` **之前** 调用。不作用于已启动的线程，从之后创建的线程（下一次 `st_off_create` 的计算池等）起生效。表与上下文无关、是 **进程全局** 的，实时 DLL 与离线 DLL 各自拥有自己的表 — 同时使用两个 DLL 时，须在 `st_rt_set_thread_attributes` 和此函数两边都填入相同的值。在离线外壳中真正有意义的类型只有 `ST_THREAD_COMPUTE_POOL`，其余类型只保存值而没有可作用的线程（批处理工作线程不属于 `STThreadType`）。`affinityMask` 与核心偏好标志仅在 Windows 上生效，在 macOS 上被忽略（由 QoS 类决定调度）。是否支持见 `ST_CAP_THREAD_ATTRIBUTES`。线程：`[any]` — 用互斥锁更新一次进程全局表。

| 参数 | 说明 |
|---|---|
| `threadType` | `STThreadType` 值，`[0, ST_THREAD_TYPE_COUNT)`。离线中生效的是 `ST_THREAD_COMPUTE_POOL`(4) — 计算池工作线程（`maxComputeThreads` N > 1 时为 N 个） |
| `attributes` | 要指定的属性。调用方填写 `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION`。为 `NULL` 时将该类型恢复为默认值 |

**结构体** `STThreadAttributes`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)`。由调用方填写 |
| `apiVersion` | `ST_ABI_VERSION`。由调用方填写 |
| `priority` | `STThreadPriority` — `ST_THREAD_PRIORITY_DEFAULT`（0，保持平台默认） / `LOW`(1) / `BELOW_NORMAL`(2) / `NORMAL`(3) / `ABOVE_NORMAL`(4) / `HIGH`(5) / `TIME_CRITICAL`(6)。Windows 映射为同名线程优先级（LOW→LOWEST，HIGH→HIGHEST），macOS 映射为 QoS 类（LOW→BACKGROUND，BELOW_NORMAL→UTILITY，NORMAL→USER_INITIATED，更高→USER_INTERACTIVE） |
| `flags` | `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` / `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES`。两者同时开启则拒绝。仅 Windows 生效 |
| `affinityMask` | 逻辑处理器位掩码，`0` = 不指定。仅 Windows 生效，在超过 64 个处理器的机器上只在当前处理器组内解释 |
| `reserved[4]` | 必须全部为 `0` |

**返回值** — `1` = 成功 / `0` = 失败：`threadType` 超出范围、`structSize`/`apiVersion` 不一致、`priority` 超出范围、核心偏好标志冲突、`reserved[]` 不为 0。不接收上下文，因此 `st_off_get_last_status` 中不会留下任何内容。

</details>

<details>
<summary><code>st_off_get_thread_attributes</code> — 读取已保存的线程属性请求值</summary>

```c
int st_off_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**用途** — 确认通过 `st_off_set_thread_attributes` 指定的值。

**调用方式** — 可随时调用。返回的不是实际施加到线程上的值，而是保存的 **请求值** 原样。未指定类型的默认值为 `priority` = `ST_THREAD_PRIORITY_DEFAULT` · `flags` = 0 · `affinityMask` = 0。线程：`[any]` — 用互斥锁读取一次进程全局表。

| 参数 | 说明 |
|---|---|
| `threadType` | `STThreadType` 值，`[0, ST_THREAD_TYPE_COUNT)` |
| `outAttributes` | 接收结果的结构体。调用方填写 `structSize`/`apiVersion`。字段参见 `st_off_set_thread_attributes` 条目 |

**返回值** — `1` = 成功 / `0` = 拒绝（`outAttributes` 为 `NULL`、版本戳不一致、`threadType` 超出范围）。

</details>

<details>
<summary><code>st_off_get_thread_inventory</code> — 按类型读取此上下文启动的线程数</summary>

```c
int st_off_get_thread_inventory(const STOFF_Context* context, STThreadInventory* outInventory);
```

**用途** — 按类型给出上下文当前实际占用的线程数。目的是让宿主依据测量值而非猜测来制定线程预算。

**调用方式** — 创建上下文后可随时调用。离线外壳没有传播通道·音频渲染·设备·文件解码器线程，因此有值的位置只有 `ST_THREAD_COMPUTE_POOL` — `maxComputeThreads` 为 N > 1 时为 N，为 1 时为 0（在调用方线程上内联执行）。`ST_THREAD_ACCEL_BUILD` 是预留角色，为 0。各类型的值分别是独立的 atomic，因此不是同一时刻的快照。是否支持见 `ST_CAP_THREAD_INVENTORY`。线程：`[any]` — 只读取 atomic 计数器，不会阻塞。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outInventory` | 接收结果的结构体。调用方填写 `structSize = sizeof(STThreadInventory)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STThreadInventory`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STThreadInventory)`。由调用方填写 |
| `apiVersion` | `ST_ABI_VERSION`。由调用方填写 |
| `countByRole[ST_THREAD_TYPE_COUNT]` | 按 `STThreadType` 顺序的各类型线程数（索引 = 类型）。离线中只有 `[ST_THREAD_COMPUTE_POOL]` 可能非 0 |
| `reserved[5]` | 预留 |

**返回值** — `1` = 成功 / `0` = `context`·`outInventory` 为 `NULL` 或版本戳不一致（`st_off_get_last_status` 中为 `ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_off_init_create_options</code> — 以默认值填充 <code>STOFF_CreateOptions</code></summary>

```c
void st_off_init_create_options(STOFF_CreateOptions* outOptions);
```

**用途** — 以版本戳与默认值初始化上下文创建选项。目的是让宿主只覆盖想更改的字段，其余采用引擎默认值。

**调用方式** — 在 `st_off_create` 之前调用。将整个结构体清零后填写 `structSize` 与 `apiVersion`，因此所有以 0 表示"默认"的字段都成为默认值。随后只更改所需字段（`maxComputeThreads`、`sceneRatio` 等）并传给 `st_off_create`。线程：`[any]` — 只填充调用方拥有的 POD。

| 参数 | 说明 |
|---|---|
| `outOptions` | 要填充的结构体。为 `NULL` 时不做任何操作 |

**结构体** `STOFF_CreateOptions`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STOFF_CreateOptions)`。由此函数填写 |
| `apiVersion` | `ST_ABI_VERSION`。由此函数填写 |
| `seedValue` | 默认 `0`。对默认（ST）后端的输出没有影响 — 是为 ABI 兼容与 Exa 后端保留的字段 |
| `maxComputeThreads` | 上下文使用的计算线程上限。`0` = 自动 = min(性能核心数, 6)，最小 1。此值即引擎所有的共享计算池宽度，在离线外壳中这就是上下文创建的全部线程 — `1` 时池线程为 0 个（所有计算在调用线程上内联执行），N > 1 时为 N 个计算池工作线程。不受环境变量影响。批处理工作线程不归上下文所有，而归 `st_off_batch_create` 创建的批处理对象所有。是否支持见 `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | 场景单位 → 米的换算系数。`0` = 默认 = `1.0`（场景单位即米）。厘米宿主为 `0.01f`，英尺宿主为 `0.3048f`。**仅限初始化**，没有运行时 setter。坐标按场景单位原样传入，引擎只在需要米的地方（传播延迟·距离衰减·空气吸收·混响描述符·`...Meters` 输出字段等）乘以此系数。非有限值或 0 以下（不含 0）会被 `st_off_create` 拒绝。是否支持见 `ST_CAP_SCENE_RATIO` |
| `backend` | `STBackend` — `ST_BACKEND_ST`（0，默认） / `ST_BACKEND_EXA`(1)。在创建时选择整个管线，不支持运行时切换。Exa 只有在库声明 `ST_CAP_BACKEND_EXA` 时才可用 |
| `reserved[5]` | 预留。置为 0 |

离线选项中没有对应实时的 `scheduler`·`maxDelaySeconds`·`renderOutputMode`·`hostSampleRate`·`startIdle`·`maxSources` 的字段 — 因为没有调度器，由调用线程驱动管线，也没有设备·流式·声源预算。渲染延迟环长度在创建后用 `st_off_render_set_max_delay_seconds` 设置（默认 4.0 s）。

**返回值** — 无。

</details>

<details>
<summary><code>st_off_create</code> — 创建离线上下文</summary>

```c
STStatus st_off_create(const STOFF_CreateOptions* options, STOFF_Context** outContext);
```

**用途** — 创建离线引擎实例（拥有场景·材质·声源·听者·IR 缓存）及其计算池。离线上下文没有设备·音频渲染·传播工作线程，用于由调用线程通过 `st_off_ir_compute` 运行一次传播以生成确定性 IR。

**调用方式** — 如有需要先调用 `st_off_set_thread_attributes`，用 `st_off_init_create_options` 初始化选项后调用。成功后的状态：自动创建一个听者并处于激活状态（id `1`，位置 (0,0,0)，方向为恒等），IR 缓存为空，因此在 `st_off_ir_compute` 之前渲染系列会以 `ST_STATUS_UNAVAILABLE` 失败。三角形求交内核为 `0`（MollerTrumbore），early 空间模式为 `ST_EARLY_SPATIAL_OBJECTS`，渲染延迟环为 4.0 s，其他默认值（大气·距离衰减·能量目标·路径类型·声学功能·声源默认值）与实时相同。若是 **不同的** 上下文，可在多个线程同时调用 `st_off_create`/`st_off_destroy`，也可与其他上下文的 compute·渲染·批处理作业重叠（Exa 后端即使是不同上下文也不得同时运行 compute）。失败原因字符串在同一线程上用 `st_off_get_last_error(NULL, ...)` 读取。线程：`[control, blocking]` — 创建引擎与计算池的较长区间。

| 参数 | 说明 |
|---|---|
| `options` | 创建选项。为 `NULL` 时使用 `st_off_init_create_options` 的默认值。字段参见 `st_off_init_create_options` 条目 |
| `outContext` | 接收所创建上下文的指针。失败时填入 `NULL` |

**返回值** — `STStatus`：`ST_STATUS_OK` = 成功 / `ST_STATUS_INVALID_ARGUMENT` = `outContext` 为 `NULL`、未知或此构建中不存在的 `backend`、无效的 `sceneRatio` / `ST_STATUS_VERSION_MISMATCH` = `structSize`·`apiVersion` 不一致 / `ST_STATUS_INITIALIZATION_FAILED` = 引擎初始化失败 / `ST_STATUS_ALLOCATION_FAILED` = 内存分配失败。

</details>

<details>
<summary><code>st_off_get_backend</code> — 返回上下文使用的后端</summary>

```c
int st_off_get_backend(const STOFF_Context* context);
```

**用途** — 确认创建时通过 `STOFF_CreateOptions.backend` 选择的管线。

**调用方式** — 创建后可随时调用。后端在创建时确定，运行时不可更改。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STBackend` 值（`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1）。`context` 为 `NULL` 时为 `-1`。

</details>

<details>
<summary><code>st_off_destroy</code> — 销毁离线上下文</summary>

```c
void st_off_destroy(STOFF_Context* context);
```

**用途** — 释放上下文及其引擎·计算池·IR 缓存。

**调用方式** — 在对该上下文的其他调用全部结束后调用。其他线程不得使用正在销毁或已销毁的上下文。注册到批处理（`st_off_batch_*`）的上下文，只有在用 `st_off_batch_poll` 收到其作业完成记录后才能销毁。此函数只 join 该上下文的计算池工作线程（`maxComputeThreads` 为 1 时没有要 join 的线程）。若是不同的上下文，可在多个线程同时调用。线程：`[control, blocking]`。

| 参数 | 说明 |
|---|---|
| `context` | 要销毁的上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_get_last_status</code> — 读取最后一次调用的状态码</summary>

```c
STStatus st_off_get_last_status(const STOFF_Context* context);
```

**用途** — 对只返回 `0`/`-1`/失败句柄的函数，通过状态码确认其失败原因。

**调用方式** — 在返回失败的调用之后立即在同一线程上调用。每个上下文只有一个诊断字段，因此多个线程同时使用同一上下文时值可能混杂。人类可读的消息见 `st_off_get_last_error`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STStatus`：`ST_STATUS_OK`(0) / `INVALID_CONTEXT`(1) / `INVALID_ARGUMENT`(2) / `VERSION_MISMATCH`(3) / `INITIALIZATION_FAILED`(4) / `ALLOCATION_FAILED`(5) / `NOT_FOUND`(6) / `BUFFER_TOO_SMALL`(7) / `INVALID_MATERIAL`(8) / `STALE_SNAPSHOT`(9) / `UNAVAILABLE`(10)。`context` 为 `NULL` 时为 `ST_STATUS_INVALID_CONTEXT`。

</details>

<details>
<summary><code>st_off_get_last_error</code> — 复制最后的错误消息</summary>

```c
int st_off_get_last_error(const STOFF_Context* context, char* outMessage, int capacity);
```

**用途** — 获取最后一次失败的人类可读说明（例：校验器的拒绝原因）。将 `context` 传为 `NULL` 可获取 `st_off_create` 的失败原因 — 因为此时还没有上下文。

**调用方式** — 在失败之后立即在同一线程上调用。以 `NULL` 上下文调用时，返回此调用线程上最后一次失败的 `st_off_create` 的消息，下一次 create 会将其清除。不知道所需大小时，先以 `outMessage = NULL` 调用获取长度。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄。为 `NULL` 时为此线程最后一次 create 失败的消息 |
| `outMessage` | 接收消息的缓冲区。为 `NULL` 时不复制，只返回长度 |
| `capacity` | `outMessage` 的字节数。不足时截断并以 NUL 结尾 |

**返回值** — 容纳完整消息所需的字节数（含 NUL）。返回值大于 `capacity` 表示已截断。

</details>

<details>
<summary><code>st_off_material_create</code> — 注册一个声学材质</summary>

```c
STMaterialId st_off_material_create(STOFF_Context* context, const STMaterial* material);
```

**用途** — 注册用于网格表面的 9 频段声学材质（反射·吸收·透射·散射）并获取句柄。材质系数是引擎不做修正的严格输入，因此在注册时校验并立即拒绝错误值。

**调用方式** — 在创建网格之前注册所有需要的材质，并将得到的句柄用于 `st_off_mesh_create` 的 `material`（或逐三角形材质索引）。多个材质通过重复调用此函数注册，返回的 id 按注册顺序连续。与实时 `st_rt_material_create` 约定相同。线程：`[control]` — 持有场景写锁，可能短暂阻塞。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `material` | 要注册的材质。调用方填写 `structSize`/`apiVersion` |

**结构体** `STMaterial`

| 字段 | 说明 |
|---|---|
| `structSize` | `sizeof(STMaterial)`。在读取系数之前校验 |
| `apiVersion` | `ST_ABI_VERSION` |
| `reflection[ST_FREQUENCY_BANDS]` | 各频段反射能量比，`[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | 各频段吸收能量比，`[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | 各频段透射能量比，`[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 反射能量中的扩散比例，`[0, 1]`。不参与 R+A+T 之和检查 |
| `reserved[8]` | 预留 |

频段顺序为 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz（`ST_FREQUENCY_BANDS` = 9）。所有系数都是 **能量域** 的无量纲比值，每个频段都须满足 `|R + A + T − 1| ≤ ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`（0.001）。引擎不对值进行推导·归一化·钳位·插值。

**返回值** — 材质句柄 `STMaterialId`。失败时 `v < 0`：`context`·`material` 为 `NULL` 时为 `ST_STATUS_INVALID_ARGUMENT`，未通过系数校验时为 `ST_STATUS_INVALID_MATERIAL`（版本戳不一致为 `ST_STATUS_VERSION_MISMATCH`），记录在 `st_off_get_last_status` 中，原因用 `st_off_get_last_error` 读取。

</details>

<details>
<summary><code>st_off_material_load_defaults</code> — 一次性注册整个默认材质库</summary>

```c
STMaterialId st_off_material_load_defaults(STOFF_Context* context);
```

**用途** — 一次性注册引擎内置的默认材质集，无需自行准备材质系数即可构建场景。

**调用方式** — 在创建网格之前调用。返回的句柄是该集合的第一个材质，后续材质按 `v+1`、`v+2` … 的顺序连续。与实时 `st_rt_material_load_defaults` 约定相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 第一个材质的句柄 `STMaterialId`。失败时 `v < 0`。

</details>

<details>
<summary><code>st_off_scene_set_edge_split_collinear_overlaps</code> — 开关网格棱边拓扑编译选项</summary>

```c
void st_off_scene_set_edge_split_collinear_overlaps(STOFF_Context* context, int enabled);
```

**用途** — 场景构建选项，决定 `st_off_mesh_create` 编译网格的声学棱边（衍射候选）拓扑时，是否将同一直线上重叠的棱边拆分处理。

**调用方式** — 在创建网格之前调用。只作用于此调用之后添加的网格，已创建的网格保持创建时编译的拓扑。是否支持见 `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`。与实时 `st_rt_scene_set_edge_split_collinear_overlaps` 约定相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | `0` = 关闭 / 其他 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_scene_set_solid_wedge_gate</code> — 开关双面衍射楔的角度区间剔除</summary>

```c
void st_off_scene_set_solid_wedge_gate(STOFF_Context* context, int enabled);
```

**用途** — 在校验衍射路径时，剔除穿过由两个面构成的楔（wedge）实体侧角度区间的路径的开关。默认关闭。

**调用方式** — 这是在传播时生效的选项，因此在 `st_off_ir_compute` 之前设置。开启后，楔的凸/凹判定会使用网格绕序（三角形顶点顺序给出的法线符号），因此翻转绕序会使被剔除的衍射路径集合反转 — 请在一个网格内保持绕序一致，并尽可能让法线朝向空气一侧。是否支持见 `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`。与实时 `st_rt_scene_set_solid_wedge_gate` 约定相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `enabled` | `0` = 关闭（默认） / 其他 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_scene_set_accel</code> — 选择网格·静态加速结构类型</summary>

```c
int st_off_scene_set_accel(STOFF_Context* context, int kind);
```

**用途** — 由宿主选择用于射线求交的 BLAS·静态加速结构实现。可根据场景规模或构建时间·查询速度的优先级更换结构进行比较。

**调用方式** — 在放入对象之前调用。只作用于之后的构建。默认为 `2`（TinyBVH）。与实时 `st_rt_scene_set_accel` 约定完全相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH（默认） / `3` = LBVH / `4` = LBVH_Simd |

**返回值** — `1` = 已应用 / `0` = `kind` 超出范围或无上下文。

</details>

<details>
<summary><code>st_off_scene_set_triangle_intersection</code> — 选择三角形求交内核</summary>

```c
int st_off_scene_set_triangle_intersection(STOFF_Context* context, int kind);
```

**用途** — 选择射线–三角形求交计算方式。默认值与实时相同为 MollerTrumbore，因此离线与实时得到相同的几何统计。

**调用方式** — 内核在 `st_off_mesh_create` 时固定到网格上，因此只作用于此调用 **之后添加的网格**（不追溯已有网格，各网格内核不同也是有效配置）。通常在创建网格之前调用一次。三种内核均为双面求交，没有背面剔除。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `kind` | `0` = MollerTrumbore（默认） / `1` = PluckerAdaptive / `2` = Watertight |

**返回值** — `1` = 已应用 / `0` = 无效的 `kind` 或无上下文。

</details>

<details>
<summary><code>st_off_scene_get_triangle_intersection</code> — 读取将作用于下一个网格的求交内核</summary>

```c
int st_off_scene_get_triangle_intersection(const STOFF_Context* context);
```

**用途** — 确认通过 `st_off_scene_set_triangle_intersection` 指定的值。

**调用方式** — 可随时调用。值是 **将作用于下一次 `st_off_mesh_create`** 的内核，可能与已创建网格的内核不同。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight。

</details>

<details>
<summary><code>st_off_scene_raycast</code> — 用引擎加速结构查询最近命中</summary>

```c
int st_off_scene_raycast(STOFF_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**用途** — 向传播所用的同一加速结构（静态+动态 TLAS）发射一条射线并返回最近的命中。使宿主能够独立于自己的物理引擎，确认·调试引擎实际看到的声学几何。

**调用方式** — 在 `st_off_build` 之后调用。构建前调用时不报错，结果为未命中。这是只读查询，不改变管线状态。是否支持见 `ST_CAP_SCENE_RAYCAST`。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `origin` | 射线原点，世界坐标 3 分量（场景单位）。须为有限值 |
| `direction` | 射线方向 3 分量。由引擎归一化，须为有限值且非零向量 |
| `maxDistanceMeters` | 最大距离（米）。通过 `sceneRatio` 换算回场景单位后应用。`≤ 0` 或非有限值 = 无限 |
| `outHit` | 结果。调用方填写 `structSize = sizeof(STRayHit)`、`apiVersion = ST_ABI_VERSION` |

**结构体** `STRayHit`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 由调用方填写 |
| `hit` | `1` = 命中 / `0` = 未命中 |
| `distanceMeters` | 从原点到命中点的距离（场景距离 × `sceneRatio`）。未命中时为 0 |
| `point[3]` | 命中点，保持场景坐标。未命中时为 0 |
| `normal[3]` | 命中三角形的单位几何法线。始终朝向射线原点一侧（不保留绕序符号），未命中时为 0 |
| `objectId` | 命中的对象 id。未命中时为 `-1` |
| `meshId` | 该对象的网格 id。未命中时为 `-1` |
| `triangleIndex` | 网格局部三角形索引。未命中时为 `-1` |
| `materialIndex` | 该三角形的材质索引。未命中时为 `-1` |
| `reserved[6]` | 预留 |

`0` 是有效的 id，因此未命中判定必须依据 `hit`（或 id 是否为 `-1`）。

**返回值** — `1` = 调用成功（是否命中见 `outHit->hit`，未命中不算失败） / `0` = `context`·指针为 `NULL`、版本戳不一致（`ST_STATUS_VERSION_MISMATCH`）、`origin`·`direction` 非有限或 `direction` 为零向量（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_mesh_create</code> — 注册三角形网格</summary>

```c
STMeshId st_off_mesh_create(STOFF_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**用途** — 注册用作声学几何的三角形网格。注册时编译用于衍射的声学棱边拓扑并固定求交内核。网格本身不会放入场景，须通过 `st_off_object_create` 创建实例才参与传播。

**调用方式** — 注册材质，必要时设置 `st_off_scene_set_triangle_intersection`·`st_off_scene_set_edge_split_collinear_overlaps` 后调用。材质以两种方式之一指定 — `triangleMaterialIndices` 为 `NULL` 时整个网格使用一个 `material`，非 `NULL` 时为每个三角形给出材质索引，此时忽略 `material` 参数（是否支持见 `ST_CAP_PER_TRIANGLE_MATERIALS`）。请在一个网格内保持绕序一致 — 部分翻转的绕序可能导致零厚度板丢失衍射棱边。与实时 `st_rt_mesh_create` 约定完全相同。线程：`[control, blocking]` — 声学棱边拓扑编译耗时与网格大小成正比，可能较长。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 网格数据。引擎在调用期间读入 |
| `material` | 整个网格的材质句柄（仅在 `triangleMaterialIndices == NULL` 时使用） |
| `triangleMaterialIndices` | 逐三角形材质索引数组（`mesh->numTriangles` 个，材质句柄的 `v` 值）。为 `NULL` 时使用单个 `material` |

**结构体** `STMesh`

| 字段 | 说明 |
|---|---|
| `numVertices` | 顶点数（> 0） |
| `vertices` | xyz 连续排列的顶点数组（`numVertices × 3` float），网格局部坐标（场景单位） |
| `numTriangles` | 三角形数（> 0） |
| `triangles` | 顶点索引数组（`numTriangles × 3` int） |

**返回值** — 网格句柄 `STMeshId`。失败时 `v < 0`（上下文·`mesh`·数组为 `NULL`，或顶点·三角形数为 0 及以下等）。

</details>

<details>
<summary><code>st_off_object_create</code> — 以矩阵变换将网格实例放入场景</summary>

```c
STObjectId st_off_object_create(STOFF_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**用途** — 将已注册的网格连同世界变换放入场景以参与传播。多个对象可共享同一网格。

**调用方式** — 在 `st_off_mesh_create` 之后、`st_off_build` 之前调用。静态对象（`isDynamic = 0`）进入静态加速结构，动态对象进入动态 TLAS，用 `st_off_object_set_transform*` 移动后通过 `st_off_build_dynamic` 更新。若用四元数放置请使用 `st_off_object_create_q`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | `st_off_mesh_create` 返回的网格句柄 |
| `transform` | 网格局部 → 世界变换 |
| `isDynamic` | `0` = 静态 / 其他 = 动态 |

**结构体** `STTransform`

| 字段 | 说明 |
|---|---|
| `m00, m01, m02` / `m10, m11, m12` / `m20, m21, m22` | 3×3 旋转·缩放，行优先（row-major） |
| `tx, ty, tz` | 平移（场景单位） |

点以列向量相乘：`x' = m00·x + m01·y + m02·z + tx`，`y' = m10·x + m11·y + m12·z + ty`，`z' = m20·x + m21·y + m22·z + tz`。也接受非均匀缩放以及行列式为负的变换（镜像·负缩放）。

**返回值** — 对象句柄 `STObjectId`。失败时 `v < 0`。

</details>

<details>
<summary><code>st_off_object_create_q</code> — 以位置·四元数·缩放将网格实例放入场景</summary>

```c
STObjectId st_off_object_create_q(STOFF_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**用途** — `st_off_object_create` 的四元数版本。可直接传入游戏引擎的 TRS（位置·旋转·缩放）表示，无需转换为矩阵。

**调用方式** — 与 `st_off_object_create` 相同（在 `st_off_build` 之前，动态对象之后用 `st_off_build_dynamic`）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 网格句柄 |
| `position` | 位置 xyz（场景单位） |
| `quatXYZW` | 局部 → 世界旋转四元数，**XYZW 顺序**。由引擎归一化，`norm < 1e-12` 时替换为恒等 |
| `scale` | 各轴缩放 xyz。以 R·S 合成，允许非均匀 |
| `isDynamic` | `0` = 静态 / 其他 = 动态 |

**返回值** — 对象句柄 `STObjectId`。失败时 `v < 0`。

</details>

<details>
<summary><code>st_off_source_create</code> — 创建声源</summary>

```c
STSourceId st_off_source_create(STOFF_Context* context, const STSourceDesc* source);
```

**用途** — 向场景添加用于计算 IR 的声源。离线上下文的声源不接收音频输入（文件·流），与听者配对作为 IR 计算·渲染的对象。与实时不同，没有声源数量预算。

**调用方式** — 在构建场景后、`st_off_ir_compute` 之前创建。创建后的状态与实时相同 — source energy 1.0，4 种路径音量 1.0，无指向性表，朝向为对准 `direction` 的无 roll 旋转，传输更新阶段数 0。之后的位置·方向·射线数·深度·EQ·指向性等用 `st_off_source_set_*` 更改。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源描述符。所有值须为有限值，且 `intensity ≥ 0` |

**结构体** `STSourceDesc`

| 字段 | 说明 |
|---|---|
| `positionX, positionY, positionZ` | 位置（场景单位） |
| `directionX, directionY, directionZ` | 正面方向。据此方向生成无 roll 的声源坐标系 |
| `velocityX, velocityY, velocityZ` | 速度（场景单位/秒）。通过 `sceneRatio` 换算为 m/s，用于多普勒辐射增益（`st_off_set_doppler_gain_mode`） |
| `intensity` | 无量纲线性 **声压** 增益（≥ 0）。不是声强（W/m²）·SPL·Pa。单独的能量倍率见 `st_off_source_set_energy` |
| `directional` | `0` = 全指向（onAxis = offAxis = 1） / 其他 = 指向轮廓（onAxis = 1，offAxis = 0） |
| `isDynamic` | `1` = 动态 / `0` = 静态。离线中静态声源的传输每次计算烘焙一次并固定，动态声源每次计算全部重新追踪 |

**返回值** — 声源句柄 `STSourceId`。失败时 `v < 0`（`NULL`、非有限值、负 `intensity` 为 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_listener_create</code> — 再创建一个听者</summary>

```c
STListenerId st_off_listener_create(STOFF_Context* context);
```

**用途** — 离线上下文可以有多个听者。用于通过一次 `st_off_ir_compute` 获取同一场景中多个聆听位置的 IR。这是实时 DLL 中没有的离线专用函数。

**调用方式** — 创建上下文时会自动创建一个听者（id `1`）并处于激活状态。其他每个聆听位置调用一次此函数。新听者不会自动激活 — 听者位置·方向 setter（`st_off_listener_set_position` 等）作用于 **激活听者**，因此先用 `st_off_listener_set_active` 切换后再指定姿态。IR 计算对每个已注册的听者进行，渲染·原始 IR 查询函数以听者句柄为参数。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 新听者句柄 `STListenerId`。失败时 `v < 0`。

</details>

<details>
<summary><code>st_off_listener_set_active</code> — 更改激活听者</summary>

```c
void st_off_listener_set_active(STOFF_Context* context, STListenerId listener);
```

**用途** — 选择听者姿态 setter（`st_off_listener_set_position` · `_set_rotation` · `_set_orientation_q` · `_set_rotation_ypr`）作用于哪个听者。

**调用方式** — 使用多个听者时，在指定各听者姿态之前调用。听者句柄不存在时不做任何更改。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `listener` | 要激活的听者句柄 |

**返回值** — 无。是否切换用 `st_off_listener_get_active` 确认。

</details>

<details>
<summary><code>st_off_listener_get_active</code> — 读取当前激活听者</summary>

```c
STListenerId st_off_listener_get_active(const STOFF_Context* context);
```

**用途** — 确认姿态 setter 当前以哪个听者为对象。

**调用方式** — 可随时调用。创建后的值为自动创建的听者 `1`。线程：`[any]` — atomic 读取。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 激活听者句柄。`context` 为 `NULL` 时 `v = -1`。

</details>

<details>
<summary><code>st_off_listener_destroy</code> — 删除听者</summary>

```c
int st_off_listener_destroy(STOFF_Context* context, STListenerId listener);
```

**用途** — 移除不再需要计算的聆听位置，以降低下一次计算的开销。

**调用方式** — 激活听者不能删除 — 先用 `st_off_listener_set_active` 切换到其他听者。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `listener` | 要删除的听者句柄 |

**返回值** — `1` = 已移除 / `0` = 无上下文、听者不存在或为激活听者。

</details>

<details>
<summary><code>st_off_source_set_position</code> — 更改声源位置</summary>

```c
void st_off_source_set_position(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 移动声源。

**调用方式** — 在 `st_off_ir_compute` 之前调用。变更反映在下一次计算中。与实时不同，没有运动队列，立即应用到场景。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `x`, `y`, `z` | 世界位置（场景单位） |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_source_set_direction</code> — 更改声源正面方向</summary>

```c
void st_off_source_set_direction(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 转动指向性声源（锥形或指向性表）的正面。

**调用方式** — 与声源坐标系（`st_off_source_set_orientation_q`）双向同步 — 调用此函数后，坐标系变为"从 +Z 转向此方向的无 roll 最小旋转"。需要 roll 时请改用 `st_off_source_set_orientation_q`。变更反映在下一次 `st_off_ir_compute` 中。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `x`, `y`, `z` | 世界方向向量 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_listener_set_position</code> — 更改激活听者的位置</summary>

```c
void st_off_listener_set_position(STOFF_Context* context, float x, float y, float z);
```

**用途** — 指定聆听位置。

**调用方式** — 作用于 **激活听者**（多个听者通过 `st_off_listener_set_active` 切换后指定）。方向保持不变。变更反映在下一次 `st_off_ir_compute` 中。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `x`, `y`, `z` | 世界位置（场景单位） |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_listener_set_rotation</code> — 以 yaw·pitch 设置激活听者的方向</summary>

```c
void st_off_listener_set_rotation(STOFF_Context* context, float yaw, float pitch);
```

**用途** — 指定双耳·空间化渲染作为基准的听者头部朝向。

**调用方式** — 作用于激活听者。旋转为 R = Ry(yaw)·Rx(pitch)，yaw = pitch = 0 时 forward = +Z，up = +Y，right = +X。forward = (sin(yaw)·cos(pitch), −sin(pitch), cos(yaw)·cos(pitch))。若要从方向向量 d 反求，使用 `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`。无法表示 roll — 需要时请使用 `st_off_listener_set_rotation_ypr` 或 `st_off_listener_set_orientation_q`。三个听者方向 setter 以最后调用的一方为准。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `yaw` | 弧度。正值 = 从上方俯视时顺时针（向右转） |
| `pitch` | 弧度。正值 = 向下看 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_listener_set_orientation_q</code> — 以四元数设置激活听者的方向</summary>

```c
int st_off_listener_set_orientation_q(STOFF_Context* context, const float quatXYZW[4]);
```

**用途** — 直接以游戏引擎的四元数传入包含 roll（头部倾斜）在内的听者方向。

**调用方式** — 作用于激活听者。局部轴为 forward = +Z · up = +Y · right = +X，与声源 `orientation_q` 顺序相同·校验相同。yaw/pitch 表示对应 q = q_y(yaw)·q_x(pitch) 的 roll 为 0 的情形。三个听者方向 setter 以最后调用的一方为准。是否支持见字 1 的 `ST_CAP1_LISTENER_ORIENTATION_Q`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `quatXYZW` | 局部 → 世界单位四元数，**XYZW 顺序**。由引擎归一化 |

**返回值** — `1` = 成功 / `0` = 失败。非有限分量或退化（`norm < 1e-12`）为 `ST_STATUS_INVALID_ARGUMENT`，且不做任何更改。

</details>

<details>
<summary><code>st_off_listener_set_rotation_ypr</code> — 以 yaw·pitch·roll 设置激活听者的方向</summary>

```c
int st_off_listener_set_rotation_ypr(STOFF_Context* context, float yaw, float pitch, float roll);
```

**用途** — 在 `st_off_listener_set_rotation` 基础上加入 roll 的欧拉角版本。

**调用方式** — 作用于激活听者。旋转为 R = Ry(yaw)·Rx(pitch)·Rz(roll)，与 Unity `Quaternion.Euler(pitch, yaw, roll)`（度 → 弧度）顺序相同。`roll = 0` 时与 `st_off_listener_set_rotation(yaw, pitch)` 矩阵相同。三个听者方向 setter 以最后调用的一方为准。是否支持见 `ST_CAP1_LISTENER_ORIENTATION_Q`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `yaw` | 弧度。正值 = 向右转 |
| `pitch` | 弧度。正值 = 向下看 |
| `roll` | 弧度。正值 = right 轴向上倾斜（头向左倾，右耳抬高） |

**返回值** — `1` = 成功 / `0` = 失败。非有限值为 `ST_STATUS_INVALID_ARGUMENT`，且不做任何更改。

</details>

<details>
<summary><code>st_off_object_set_transform</code> — 以矩阵更改对象变换</summary>

```c
void st_off_object_set_transform(STOFF_Context* context, STObjectId object, const STTransform* transform);
```

**用途** — 移动已放置的对象，或对其进行旋转、缩放。

**调用方式** — 更改后需要反映到加速结构中，才会用于下一次计算 — 动态对象用 `st_off_build_dynamic`（动态 TLAS refit），静态对象用 `st_off_build`（完整构建）。四元数版本为 `st_off_object_set_transform_q`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `object` | 对象句柄 |
| `transform` | 新的局部 → 世界变换。`STTransform` 字段参见 `st_off_object_create` 条目 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_object_set_transform_q</code> — 以位置·四元数·缩放更改对象变换</summary>

```c
void st_off_object_set_transform_q(STOFF_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**用途** — `st_off_object_set_transform` 的四元数版本。与实时 `st_rt_object_set_transform_q` 的契约相同。

**调用方式** — 与 `st_off_object_set_transform` 相同（之后调用 `st_off_build_dynamic` 或 `st_off_build`）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `object` | 对象句柄 |
| `position` | 位置 xyz（场景单位） |
| `quatXYZW` | 旋转四元数，**XYZW 顺序**。由引擎归一化 |
| `scale` | 各轴缩放 xyz（允许非均匀） |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_source_destroy</code> — 删除声源</summary>

```c
int st_off_source_destroy(STOFF_Context* context, STSourceId source);
```

**用途** — 从场景中移除声源。声源 EQ 等按声源的设置也一并删除。

**调用方式** — 从下一次 `st_off_ir_compute` 起不再计算该声源。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |

**返回值** — `1` = 已移除 / `0` = 无上下文或声源不存在。

</details>

<details>
<summary><code>st_off_mesh_destroy</code> — 删除网格</summary>

```c
int st_off_mesh_destroy(STOFF_Context* context, STMeshId mesh);
```

**用途** — 移除已注册的网格。

**调用方式** — 更改场景构成后，用 `st_off_build` 重新构建加速结构。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 网格句柄 |

**返回值** — `1` = 已移除 / `0` = 无上下文或移除失败。

</details>

<details>
<summary><code>st_off_object_destroy</code> — 删除对象</summary>

```c
int st_off_object_destroy(STOFF_Context* context, STObjectId object);
```

**用途** — 从场景中移除已放置的网格实例。

**调用方式** — 更改场景构成后，用 `st_off_build` 重新构建加速结构。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `object` | 对象句柄 |

**返回值** — `1` = 已移除 / `0` = 无上下文或对象不存在。

</details>

<details>
<summary><code>st_off_mesh_set_material</code> — 更改网格材质</summary>

```c
int st_off_mesh_set_material(STOFF_Context* context, STMeshId mesh, STMaterialId material);
```

**用途** — 不重新注册几何体，只替换网格的材质。用于材质 A/B 比较。

**调用方式** — 更改在下一次 `st_off_ir_compute` 中生效。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mesh` | 网格句柄 |
| `material` | 新材质句柄 |

**返回值** — `1` = 成功 / `0` = 无上下文、网格或材质不存在。

</details>

<details>
<summary><code>st_off_source_set_ray_count</code> — 设置声源的输运射线网格大小</summary>

```c
void st_off_source_set_ray_count(STOFF_Context* context, STSourceId source, int width, int height);
```

**用途** — 设置从声源发射的漫射输运（diffuse transport）射线数量。射线数 N = `width × height`，增加后混响·漫射成分的统计更稳定，但计算开销也随之增加。

**调用方式** — 在 `st_off_ir_compute` 之前为每个声源调用。默认为 16 × 8。若值不可接受，则不更改设置，并在 `st_off_get_last_status` 中留下 `ST_STATUS_INVALID_ARGUMENT`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `width` | 网格横向射线数（默认 16） |
| `height` | 网格纵向射线数（默认 8） |

**返回值** — 无。失败通过 `st_off_get_last_status` 确认。

</details>

<details>
<summary><code>st_off_source_set_depth</code> — 设置各声源的最大反射深度</summary>

```c
void st_off_source_set_depth(STOFF_Context* context, STSourceId source, int depth);
```

**用途** — 为每个声源单独设置从该声源追踪的反射阶数上限。用于只对重要声源进行深度追踪以分配开销。

**调用方式** — 在 `st_off_ir_compute` 之前调用。默认每个声源为 4（全局上限为 `st_off_set_max_depth`，默认 8）。若值不可接受，则在 `st_off_get_last_status` 中留下 `ST_STATUS_INVALID_ARGUMENT`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `depth` | 最大反射深度（默认 4） |

**返回值** — 无。失败通过 `st_off_get_last_status` 确认。

</details>

<details>
<summary><code>st_off_source_set_energy</code> — 设置声源的能量倍率</summary>

```c
int st_off_source_set_energy(STOFF_Context* context, STSourceId source, float energy);
```

**用途** — 以独立于 `STSourceDesc.intensity`（声压域增益）的**能量域**相对倍率调整声源强度。是否支持见 `ST_CAP_SOURCE_ENERGY`。

**调用方式** — 在 `st_off_ir_compute` 之前调用。默认为 1.0。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `energy` | 能量倍率。必须为有限值且 `≥ 0`（默认 1.0） |

**返回值** — `1` = 成功 / `0` = 无上下文、非有限值或负值、声源不存在。

</details>

<details>
<summary><code>st_off_source_set_transport_refresh_steps</code> — 保存各声源的输运刷新步数</summary>

```c
int st_off_source_set_transport_refresh_steps(STOFF_Context* context, STSourceId source, int steps);
```

**用途** — 在实时上下文中，使声源的输运射线网格 N 分摊到 n 次传播中刷新的值。离线也有同样的 setter，是为了让值能够往返，使宿主可以把同一场景设置原样重放到实时上下文中。

**调用方式** — 离线上下文不使用滚动输运，因此**忽略动态声源的 n，每次计算都全量重新追踪**（实际 n = 1）。因此同一场景、同一输入下，无论计算多少次都会得到相同的 RIR。静态声源与 n 无关，每次计算都固定为烘焙一次的结果。值本身会被保存，`st_off_source_get_transport_refresh_steps` 原样返回。与实时 `st_rt_source_set_transport_refresh_steps` 的签名·返回契约相同。是否支持见 `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `steps` | `0` = 默认（由外壳·声源标志决定） / `1` = 每次传播全量重新追踪 / `≥ 2` = 分 n 次刷新（实时中 clamp 到 `[1, N]`）。负数被拒绝 |

**返回值** — `1` = 成功 / `0` = 失败：负数 `steps` 为 `ST_STATUS_INVALID_ARGUMENT`，声源不存在为 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_get_transport_refresh_steps</code> — 读取已保存的输运刷新步数</summary>

```c
int st_off_source_get_transport_refresh_steps(const STOFF_Context* context, STSourceId source);
```

**用途** — 确认通过 `st_off_source_set_transport_refresh_steps` 保存的值。

**调用方式** — 可随时调用。返回的不是实际 n，而是**原样的保存值**（包括 0） — 离线中动态声源的实际值始终为 1。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |

**返回值** — 已保存的步数（`≥ 0`）。失败为 `-1`。

</details>

<details>
<summary><code>st_off_source_set_orientation_q</code> — 用四元数设置声源局部坐标系</summary>

```c
int st_off_source_set_orientation_q(STOFF_Context* context, STSourceId source, const float quatXYZW[4]);
```

**用途** — 将声源的局部坐标系（包括 roll）放置到世界中。指向性表以该坐标系为基准查询，因此使用表的声源用此函数指定方向。

**调用方式** — 局部轴为 forward = +Z / up = +Y / right = +X。与 `st_off_source_set_direction` 双向同步 — 在此给出坐标系时 direction = forward(q) 随之改变；调用 direction setter 时坐标系变为无 roll 的最小旋转。需要 roll 时必须使用此函数。与实时 `st_rt_source_set_orientation_q` 的契约相同。是否支持见 `ST_CAP_SOURCE_DIRECTIVITY`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `quatXYZW` | 局部 → 世界单位四元数，**XYZW 顺序**。由引擎归一化 |

**返回值** — `1` = 成功 / `0` = 失败：非有限分量或退化（`norm < 1e-12`）为 `ST_STATUS_INVALID_ARGUMENT`，声源不存在为 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_set_directivity</code> — 附加或移除声源指向性表</summary>

```c
int st_off_source_set_directivity(STOFF_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**用途** — 用测量或制作的方位角 × 仰角 × 9 频段能量表指定声源的辐射模式。比简单的正面/侧面锥形更能准确表达真实声源（乐器·扬声器·人声等）的辐射。

**调用方式** — 表附加期间使用表而不是锥形衰减（由 `STSourceDesc.directional` 产生的 on/off-axis），用 `table = NULL` 移除后回到锥形公式。引擎会**复制**表，因此调用返回后宿主可以释放缓冲区。查询方向以声源坐标系为基准，因此与 `st_off_source_set_orientation_q` 配对使用。与实时 `st_rt_source_set_directivity` 的契约相同。是否支持见 `ST_CAP_SOURCE_DIRECTIVITY`。线程：`[control]` — 表复制与归一化标量计算在此调用中一次完成。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `table` | 指向性表。由调用方填写 `structSize`/`apiVersion`。为 `NULL` 时移除表 |

**结构体** `STSourceDirectivity`

| 字段 | 说明 |
|---|---|
| `structSize` / `apiVersion` | 由调用方填写 |
| `azCount` | 方位角节点数，`[3, 361]`。节点 az_i = i·360/azCount（在 360° 处 wrap） |
| `elCount` | 仰角节点数，`[2, 181]`。节点 el_j = −90 + j·180/(elCount−1)。为奇数时水平面（0°）位于节点上。推荐网格为 5° 间隔（72 × 37） |
| `levelMode` | `STDirectivityLevelMode` — `ST_DIRECTIVITY_ABSOLUTE`（0，按原值使用：用于包含绝对电平的测量数据） / `ST_DIRECTIVITY_POWER_MEAN`（1，归一化使各频段球面功率平均为 1：只使用模式、总功率由 intensity/energy 设定时，推荐） / `ST_DIRECTIVITY_ON_AXIS`（2，归一化使正面值为 1） |
| `reserved0` | 保留 |
| `energy` | `elCount × azCount × ST_FREQUENCY_BANDS` 个 float，布局 `[el][az][band]`（band 变化最快）。**能量域**，有限值且 `≥ 0` |
| `reserved[6]` | 保留 |

方向约定为在声源局部坐标系中 az = atan2(x, z)（正面 0，右侧 +90°），el = asin(y)（向上为 +），查询采用 az wrap · el clamp 双线性插值。

**返回值** — `1` = 成功（包括移除表） / `0` = 失败：标记不一致为 `ST_STATUS_VERSION_MISMATCH`；`levelMode`·`azCount`·`elCount` 超出范围、`energy` 为 `NULL`、非有限或负元素为 `ST_STATUS_INVALID_ARGUMENT`（原因见 `st_off_get_last_error`）；声源不存在为 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_set_eq</code> — 对声源原声施加 9 频段图示 EQ</summary>

```c
int st_off_source_set_eq(STOFF_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 以 9 频段校正声源信号本身的音色。施加在分频器之前，因此该声源的所有路径（直达·透射·反射·衍射）与混响发送都应用同一滤波器。与实时 `st_rt_source_set_eq` 实现相同，结果也相同。

**调用方式** — 这是仅渲染的设置，不会使 IR 缓存失效 — 无需重新执行 `st_off_ir_compute`，只需重新渲染即可立即生效（声压 IR 的独奏·混合·批量渲染均适用）。`gainsDb = NULL` 或所有频段为 0 dB 时关闭 EQ，其结果与无 EQ 的结果逐位相同。设置保持到删除声源为止，`st_off_trim_memory` 之后也会保留。与参数 EQ（`st_off_source_set_parametric_eq`）共享同一个 EQ，以最后调用的 setter 为准。是否支持见 `ST_CAP_SOURCE_EQ`。线程：`[control]` — 持有场景读锁与听觉化器控制锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `gainsDb` | 各频段增益（dB），按 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz 顺序。必须为有限值且在 `[−ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`（±24 dB）范围内，不做 clamp 而是拒绝。`NULL` = 关闭 |

滤波器为每个频段一个 RBJ 峰值 biquad（中心 = 频段中心，Q = 1.414），在 44100 Hz 下按升序串联。相邻频段的响应相互重叠，因此若希望在频段中心精确得到指定值，需由宿主校正增益后传入。

**返回值** — `1` = 成功 / `0` = 失败：非有限值或超出范围为 `ST_STATUS_INVALID_ARGUMENT`（不做任何更改），声源不存在为 `ST_STATUS_NOT_FOUND`，不支持声源 EQ 的后端（Exa）为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_source_get_eq</code> — 以 9 频段增益读取声源 EQ</summary>

```c
int st_off_source_get_eq(STOFF_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 以 9 频段图示 EQ 视图返回当前声源 EQ。

**调用方式** — 可随时调用。EQ 关闭时全部为 0。若通过参数 EQ 设置了非 9 频段形状的配置，则无法以图示视图表达而失败 — 返回 `0` + `ST_STATUS_UNAVAILABLE` 时调用 `st_off_source_get_parametric_eq`，若成功则从那里读取设置；若同样以 `UNAVAILABLE` 失败，则表示后端不支持声源 EQ。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `outGainsDb` | 接收 9 频段增益（dB）的数组 |

**返回值** — `1` = 成功 / `0` = 失败：`outGainsDb` 为 `NULL` 时为 `ST_STATUS_INVALID_ARGUMENT`，声源不存在为 `ST_STATUS_NOT_FOUND`，`ST_STATUS_UNAVAILABLE`（后端不支持或无法以 9 频段表达的参数设置 — 此时不修改 `outGainsDb`）。

</details>

<details>
<summary><code>st_off_source_set_parametric_eq</code> — 对声源原声施加参数 EQ</summary>

```c
int st_off_source_set_parametric_eq(STOFF_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 以比 9 频段固定 EQ 更自由的频段列表（峰值·搁架·LP·HP·陷波）校正声源音色。与 `st_off_source_set_eq` 是**同一个 EQ**，施加位置（分频器之前，该声源的所有路径）也相同。AutoEq 配置文件可用 `st_off_render_parse_autoeq_parametric` 读取后直接传入。

**调用方式** — 离线无渐变、立即更改，声压渲染的独奏·混合·批量都施加同一滤波器。不会使 IR 缓存失效，因此只需重新渲染即可生效。两个声源 EQ setter 都会替换整个列表，以最后调用的为准。关闭的列表或无效果的列表也会被保存；要关闭并清除，请调用 `st_off_source_set_eq(context, source, NULL)`。设置保持到删除声源为止。与实时 `st_rt_source_set_parametric_eq` 契约相同·实现相同。是否支持见字 1 的 `ST_CAP1_SOURCE_PARAMETRIC_EQ`。线程：`[control]` — 持有场景读锁与听觉化器控制锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `bands` | 频段数组（`bandCount` 个）。`bandCount = 0` 时可为 `NULL` |
| `bandCount` | 频段数，`[0, ST_PARAMETRIC_EQ_MAX_BANDS]`（16） |
| `preampDb` | 前置放大（dB），clamp 到 `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]`（−48 ~ +12）。主要用途是用于防止削波的负值 |
| `enabled` | `0` = 保存列表但直通 / 其他 = 开启 |

**结构体** `STParametricEqBand`

| 字段 | 说明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | `0` = 该频段为恒等（跳过） / 其他 = 开启 |
| `frequencyHz` | 中心（PEAKING·NOTCH）或转角（搁架中点·LP·HP）频率。clamp 到 `[20, min(20000, 0.49·44100)]` |
| `gainDb` | 仅 PEAKING·搁架使用。clamp 到 `[−24, +24]` |
| `q` | clamp 到 `[0.1, 30]`，搁架为 `[0.1, 3]` |
| `reserved[3]` | 必须为 `0` |

非有限值·未知 `type`·`reserved ≠ 0`·频段数超出范围会被拒绝（不做任何更改），有限值则 clamp 到上述范围。滤波器为每个频段一个 RBJ 二阶节（44100 Hz，double），链路为前置放大 → 频段 0..count−1 串联。

**返回值** — `1` = 成功 / `0` = 失败：`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_NOT_FOUND`（声源不存在） / `ST_STATUS_UNAVAILABLE`（Exa 后端）。

</details>

<details>
<summary><code>st_off_source_get_parametric_eq</code> — 以参数频段列表读取声源 EQ</summary>

```c
int st_off_source_get_parametric_eq(STOFF_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 以经 clamp 后实际值的频段列表返回当前声源 EQ。用 9 频段 setter 设置的配置也读取为 9 个 PEAKING 频段。

**调用方式** — 不知道大小时，先以 `outBands = NULL` 调用获取频段数。提供 `ST_PARAMETRIC_EQ_MAX_BANDS` 个容量则总能放下。没有 EQ 时为 0 频段·关闭。输出约定与实时 `st_rt_render_get_parametric_eq` 相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `outBands` | 接收频段的数组。为 `NULL` 时为大小查询（不写入频段） |
| `bandCapacity` | `outBands` 的元素数（`≥ 0`） |
| `outBandCount` | 频段数。为 `NULL` 时跳过 |
| `outPreampDb` | 前置放大（dB）。为 `NULL` 时跳过 |
| `outEnabled` | 是否开启。为 `NULL` 时跳过 |

`STParametricEqBand` 字段参见 `st_off_source_set_parametric_eq` 条目。

**返回值** — `1` = 成功（包括大小查询） / `0` = 失败：`bandCapacity < 0` 时为 `ST_STATUS_INVALID_ARGUMENT`，容量小于频段数时为 `ST_STATUS_BUFFER_TOO_SMALL`（仍写入频段数·前置放大·开启状态），声源不存在为 `ST_STATUS_NOT_FOUND`，Exa 后端为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_source_set_path_volume</code> — 按路径类型设置声源音量</summary>

```c
int st_off_source_set_path_volume(STOFF_Context* context, STSourceId source, int volumeKind, float volume);
```

**用途** — 单独增大或减小一个声源的直达声·反射·衍射·混响贡献。用于在保持物理结果的同时进行混音层面的调整。是否支持见 `ST_CAP_SOURCE_PATH_VOLUME`。

**调用方式** — 默认四种类型均为 1.0。值为**声压域**线性倍率。线程：`[control]` — 只持有场景读锁。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `source` | 声源句柄 |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`（0，包括透射） / `ST_SOURCE_VOLUME_REFLECTION`（1） / `ST_SOURCE_VOLUME_DIFFRACTION`（2） / `ST_SOURCE_VOLUME_REVERB`（3，仅调整该声源驱动听者共享混响箱的量） |
| `volume` | 线性声压倍率。有限值且 `≥ 0`（默认 1.0） |

**返回值** — `1` = 成功 / `0` = 无上下文、`volumeKind` 超出范围、`volume` 非有限或为负、声源不存在。

</details>

<details>
<summary><code>st_off_set_path_type_enabled</code> — 全局开关路径类型</summary>

```c
void st_off_set_path_type_enabled(STOFF_Context* context, int pathType, int enabled);
```

**用途** — 将直达声·透射·反射·衍射·混响中的特定路径类型从计算中排除，以分别试听各成分对结果的贡献，或降低开销。

**调用方式** — 在 `st_off_ir_compute` 之前调用。默认五种类型全部开启。与 `st_off_set_acoustic_feature_enabled` 组合，仅通过设置即可构建"只保留距离衰减 + 声像"的基准线。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |
| `enabled` | `0` = 关闭 / 其他 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_set_acoustic_feature_enabled</code> — 开关单项声学功能</summary>

```c
int st_off_set_acoustic_feature_enabled(STOFF_Context* context, int feature, int enabled);
```

**用途** — 逐个开关空气吸收·传播延迟·直达声遮挡，进行试听 A/B 比较。与实时 `st_rt_set_acoustic_feature_enabled` 的契约相同。

**调用方式** — 默认三项功能全部开启（保持物理原样）。这是 IR 策略设置，调用后 IR 缓存失效，因此渲染前需重新调用 `st_off_ir_compute`。关闭反射·衍射·混响（`st_off_set_path_type_enabled`）并关闭全部三项功能后，只剩距离衰减 + 声像。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`（0，大气衰减·高频损失） / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`（1，基于路径长度的传播延迟） / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`（2，直达声可见性检查） |
| `enabled` | `0` = 关闭 / 其他 = 开启 |

**返回值** — `1` = 成功 / `0` = `feature` 超出范围或失败。

</details>

<details>
<summary><code>st_off_is_acoustic_feature_enabled</code> — 读取声学功能是否开启</summary>

```c
int st_off_is_acoustic_feature_enabled(const STOFF_Context* context, int feature);
```

**用途** — 确认通过 `st_off_set_acoustic_feature_enabled` 指定的状态。

**调用方式** — 可随时调用。线程：`[control]` — 无锁读取引擎状态。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `feature` | `ST_ACOUSTIC_FEATURE_*`(0~2) |

**返回值** — `1` = 开启 / `0` = 关闭 / `-1` = 无上下文。

</details>

<details>
<summary><code>st_off_set_late_coupling</code> — 单独设置 late 混响耦合衰减参数</summary>

```c
int st_off_set_late_coupling(STOFF_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**用途** — 根据听者与声源扩散场的耦合程度（可见比例）衰减 late 混响注入。混响箱是完全混合的单一空间，默认在任何位置听起来大小相同；此选项用于修正在コ字形·口字形等隔着拐角分开的空间中"走远了混响却不变甚至变大"的问题。

**调用方式** — 通常 `st_off_set_late_coupling_preset` 已足够，需要精细调整时使用此函数。耦合衰减·send 平坦化·rain 方向游走是设计为一起开启的组合 — 不开平坦化只开耦合，可能越远混响注入反而越大；没有 rain 游走，分隔空间另一侧的 late 方向样本会不足。与声源处于同一空间（可见比例在 `visibleHigh` 以上）时恰好为 0 dB。参数构成尚未确定，可能会变化。这是 IR 策略，更改的值从下一次 `st_off_ir_compute` 起生效。与实时 `st_rt_set_late_coupling` 的契约相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `floorDb` | 完全阻断时的衰减深度（dB）。`0` = 关闭耦合衰减。默认 9 |
| `visibleLow` | 可见比例小于此值时视为完全阻断，施加底部衰减。`0` → 默认 0.05 |
| `visibleHigh` | 可见比例大于此值时视为同一空间，恰好 0 dB。`0` → 默认 0.60 |
| `sendNormalizeTrim` | send 总和平坦化微调。`0` = 不做平坦化。默认 0.75 |
| `rainDirectionWalk` | `0` = 关闭 / 其他 = 开启（默认）。链结束后仍继续收集 late 方向样本（不携带能量） |

**返回值** — `1` = 成功 / `0` = 值超出范围或失败。

</details>

<details>
<summary><code>st_off_get_late_coupling</code> — 读取 late 混响耦合衰减参数</summary>

```c
int st_off_get_late_coupling(const STOFF_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**用途** — 确认当前生效的 late 耦合衰减设置（通过单独 setter 或预设设置的值）。

**调用方式** — 可随时调用。不需要的输出设为 `NULL`。线程：`[control]` — 无锁读取引擎状态。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `outFloorDb` | 底部衰减深度（dB）。允许 `NULL` |
| `outVisibleLow` | 完全阻断拐点。允许 `NULL` |
| `outVisibleHigh` | 同一空间拐点。允许 `NULL` |
| `outSendNormalizeTrim` | send 平坦化微调。允许 `NULL` |
| `outRainDirectionWalk` | rain 方向游走是否开启。允许 `NULL` |

各值的含义参见 `st_off_set_late_coupling` 条目。

**返回值** — `1` = 成功 / `0` = 无上下文。

</details>

<details>
<summary><code>st_off_set_late_coupling_preset</code> — 以推荐预设设置 late 混响耦合衰减</summary>

```c
int st_off_set_late_coupling_preset(STOFF_Context* context, int preset);
```

**用途** — 只选择底部衰减深度，其余（两个拐点·平坦化微调·rain 游走）用推荐值填充的一次性设置。

**调用方式** — 预设的选择主要是听感问题 — 在单个房间中可见比例在拐点之上，衰减不介入；无论哪个预设，与声源处于同一空间时都恰好为 0 dB。需要单独调整时使用 `st_off_set_late_coupling`。这是 IR 策略，更改的值从下一次 `st_off_ir_compute` 起生效。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `preset` | `ST_LATE_COUPLING_OFF`（0，耦合衰减·平坦化·rain 游走全部关闭） / `ST_LATE_COUPLING_SUBTLE`（1，底部 6 dB） / `ST_LATE_COUPLING_DEFAULT`（2，底部 9 dB，引擎默认） / `ST_LATE_COUPLING_STRONG`（3，底部 12 dB） |

**返回值** — `1` = 成功 / `0` = `preset` 超出范围或失败。

</details>

<details>
<summary><code>st_off_set_physical_distance_attenuation</code> — 设置距离衰减的参考距离与最小距离</summary>

```c
void st_off_set_physical_distance_attenuation(STOFF_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**用途** — 设置物理球面扩散（声压 1/R）距离衰减的参考点与近距离极限。这是引擎唯一的距离衰减定律，声压增益为 `reference / max(R, min)`。

**调用方式** — 默认参考 1.0 m · 最小 1.0 m（若最小距离小于参考距离，则比参考更近时会产生近距离放大）。两个值与 `sceneRatio` 无关，**由宿主以米为单位**给出 — 因为作为比较对象的路径长度已换算为米。会使 IR 缓存失效，因此渲染前需重新调用 `st_off_ir_compute`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `referenceDistanceMeters` | 增益为 1 的参考距离（m）。默认 1.0 |
| `minDistanceMeters` | 比此值更近的距离按此值处理（m）。默认 1.0 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_set_atmosphere</code> — 设置大气条件（温度·湿度·气压）</summary>

```c
void st_off_set_atmosphere(STOFF_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**用途** — 指定决定空气吸收（高频损失）与声速的大气状态。声速不是固定常数，而是在运行时由该值推导，因此传播延迟也会随之变化。

**调用方式** — 默认 20.0 °C · 50.0 %RH · 101.325 kPa。会使 IR 缓存失效，因此渲染前需重新调用 `st_off_ir_compute`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `temperatureC` | 气温（°C）。默认 20.0 |
| `relativeHumidityPercent` | 相对湿度（%）。默认 50.0 |
| `pressureKPa` | 气压（kPa）。默认 101.325 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_set_doppler_gain_mode</code> — 选择运动声源的辐射增益模式</summary>

```c
int st_off_set_doppler_gain_mode(STOFF_Context* context, int mode);
```

**用途** — 决定是否在 IR 中反映声源运动时朝前进方向辐射增大、反方向减小的增益。这是与可变延迟产生的多普勒音高分开的开关。是否支持见 `ST_CAP_DOPPLER_GAIN_MODE`。

**调用方式** — 默认为 `ST_DOPPLER_GAIN_MOVING_MONOPOLE`。声源速度通过 `STSourceDesc.velocity*` 给出，静止声源的增益为 1。会使 IR 缓存失效，因此渲染前需重新调用 `st_off_ir_compute`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`（1，默认：运动单极子近似 — 声压 D²，能量 D⁴，D = 1/(1−Mr)，按每个辐射路径方向分别计算） |

**返回值** — `1` = 成功 / `0` = 无上下文或 `mode` 超出范围。

</details>

<details>
<summary><code>st_off_get_doppler_gain_mode</code> — 读取多普勒辐射增益模式</summary>

```c
int st_off_get_doppler_gain_mode(const STOFF_Context* context);
```

**用途** — 确认通过 `st_off_set_doppler_gain_mode` 指定的值。

**调用方式** — 可随时调用。线程：`[control]` — 无锁读取引擎状态。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — `STDopplerGainMode` 值（`0` = OFF / `1` = MOVING_MONOPOLE）。无上下文时为 `-1`。

</details>

<details>
<summary><code>st_off_set_early_late_band_energy_targets</code> — 设置 early·late 各频段能量倍率</summary>

```c
int st_off_set_early_late_band_energy_targets(STOFF_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**用途** — 按频段相互独立地调整早期声（early）与后期混响（late）的频谱。用于匹配测量值或单独修饰混响音色。是实时 `st_rt_set_early_late_band_energy_targets` 的离线对应。是否支持见 `ST_CAP_EARLY_LATE_BAND_ENERGY`。

**调用方式** — 一次替换两个数组。early 倍率只作用于 exact·早期抽头，late 倍率只作用于混响 send·混响箱驱动，二者不相乘。默认全部为 1.0（中性）。会使 IR 缓存失效，因此渲染前需重新调用 `st_off_ir_compute`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `earlyBandEnergy` | 早期声各频段的**能量域**倍率（63 ~ 16k Hz 共 9 个）。非有限值归一为 1.0，其余归一到 `[0, 16]` |
| `lateBandEnergy` | 后期混响各频段能量倍率。规则同上 |

**返回值** — `1` = 成功 / `0` = 无上下文或数组为 `NULL`。

</details>

<details>
<summary><code>st_off_set_max_depth</code> — 设置全局最大反射深度</summary>

```c
void st_off_set_max_depth(STOFF_Context* context, int depth);
```

**用途** — 设置反射路径搜索的全局阶数上限，以调节计算开销与早期反射密度。

**调用方式** — 在 `st_off_ir_compute` 之前调用。默认为 8（各声源上限为 `st_off_source_set_depth`，默认 4）。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `depth` | 全局最大反射深度（默认 8） |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_set_transmission_max_depth</code> — 设置透射路径的最大深度</summary>

```c
void st_off_set_transmission_max_depth(STOFF_Context* context, int depth);
```

**用途** — 设置直达声透射墙体时最多追踪穿过多少个面的上限。

**调用方式** — 在 `st_off_ir_compute` 之前调用。默认为 64。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `depth` | 透射最大深度（默认 64） |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_listener_set_ray_count</code> — 设置听者引导射线网格大小</summary>

```c
void st_off_listener_set_ray_count(STOFF_Context* context, int width, int height);
```

**用途** — 设置从听者发射的引导（probe）射线数量（N = `width × height`）。以计算开销换取反射·衍射路径搜索与空间统计的分辨率。

**调用方式** — 在 `st_off_ir_compute` 之前调用。默认为 16 × 16。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `width` | 网格横向射线数（默认 16） |
| `height` | 网格纵向射线数（默认 16） |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_listener_set_ray_sampling_method</code> — 选择听者引导射线的方向分布</summary>

```c
int st_off_listener_set_ray_sampling_method(STOFF_Context* context, int method);
```

**用途** — 决定听者引导射线在球面上如何分布的 setter。目前只能选择斐波那契球面分布，其他值仅为编号兼容而保留在枚举中。斐波那契分布是不使用种子的确定性分布。

**调用方式** — 默认值已是 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`，通常无需调用。是否支持见 `ST_CAP_RAY_SAMPLING_METHODS`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `method` | `STRaySamplingMethod`。仅接受 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) — `LEGACY_GRID`(0) / `EQUAL_AREA_GRID`(2) / `SOBOL_SPHERE`(3) / `ICOSAHEDRAL`(4) 被拒绝 |

**返回值** — `1` = 成功 / `0` = 其他值（`ST_STATUS_INVALID_ARGUMENT`，状态不变）或无上下文。

</details>

<details>
<summary><code>st_off_set_source_ray_sampling_method</code> — 选择声源输运射线的方向分布</summary>

```c
int st_off_set_source_ray_sampling_method(STOFF_Context* context, int method);
```

**用途** — 决定声源输运射线球面分布的 setter。与 `st_off_listener_set_ray_sampling_method` 一样，只能选择斐波那契球面分布。

**调用方式** — 默认值已是 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |
| `method` | `STRaySamplingMethod`。仅允许 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)，其余被拒绝 |

**返回值** — `1` = 成功 / `0` = 其他值（`ST_STATUS_INVALID_ARGUMENT`，状态不变）或无上下文。

</details>

<details>
<summary><code>st_off_build</code> — 完整构建场景加速结构</summary>

```c
void st_off_build(STOFF_Context* context);
```

**用途** — 用已注册的网格·对象构建全部静态+动态加速结构。传播与 `st_off_scene_raycast` 使用此结构。

**调用方式** — 在添加或删除网格·对象之后、移动静态对象之后，以及 `st_off_ir_compute` 之前调用。构建前所有射线查询均为未命中。加速结构类型由 `st_off_scene_set_accel` 决定。线程：`[control, blocking]` — 与场景大小成正比的较长独占区间。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_build_dynamic</code> — 仅更新动态对象的 TLAS</summary>

```c
void st_off_build_dynamic(STOFF_Context* context);
```

**用途** — 只有动态对象的变换改变时，无需完整构建，通过 refit 动态 TLAS 快速反映。

**调用方式** — 用 `st_off_object_set_transform` / `_q` 移动动态对象之后、`st_off_ir_compute` 之前调用。若添加·删除了网格·对象或静态对象发生变化，则使用 `st_off_build`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 上下文句柄 |

**返回值** — 无。

</details>

</details>

<details>
<summary><strong>离线(`st_off_*`) — IR 计算·渲染、批处理、调试</strong> — 49 个</summary>

<details>
<summary><code>st_off_render_parse_autoeq_parametric</code> — 将 AutoEq ParametricEQ.txt 文本解析为参数 EQ 频段数组</summary>

```c
int32_t st_off_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**用途** — 读取 AutoEq 发布的 `ParametricEQ.txt`（Equalizer APO 语法的子集），转换为 `STParametricEqBand` 数组与前置放大值。结果可直接传入 `st_off_source_set_parametric_eq`，因此宿主无需自行解析，即可将耳机校正曲线等外部 EQ 文件作为声源 EQ 施加。与实时 `st_rt_render_parse_autoeq_parametric` 实现相同·契约相同。

**调用方式** — 不需要上下文，因此可随时调用。成功后将结果以开启状态（`enabled` = 1）传给 `st_off_source_set_parametric_eq`。是否支持通过 `st_off_get_capability_word(1)` 的 `ST_CAP1_SOURCE_PARAMETRIC_EQ` 确认（此解析器包含在该位中，没有单独的位）。线程：`[any]` — 无全局状态也无分配，可在任意线程无阻塞调用。

接受的语法（不区分大小写）：

- `Preamp: <数值> [dB]` — 有多行时按 dB 相加。
- `Filter[ <编号>]: ON|OFF <类型> Fc <数值> [Hz] [Gain <数值> [dB]] [Q <数值>]` — 类型为 `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`。省略 Q 时搁架·LP·HP 为 0.7071，`PK`·`NO` 必须给出 Q。PK·搁架必须给出 Gain。`OFF` 滤波器作为 `enabled` = 0 的频段加入，并计入频段数。
- 忽略空行与 `#` 之后的内容（行尾注释），接受 UTF-8 BOM·CRLF。数值的读取与区域设置无关。

拒绝的内容：其他命令（`Channel`·`Device`·`GraphicEQ`·`Include` 等）、`BP`·`AP`·`IIR`、搁架斜率格式（`LS 6dB`）、`BW Oct`、超出范围的值（Fc [20, 20000] Hz · Gain ±24 dB · Q [0.1, 30]，搁架为 Q [0.1, 3] · 前置放大最终和 [−48, +12] dB）、注释之外的非 ASCII 字符、指数表示法。解析器不做 clamp 而是拒绝（setter 以相同范围 clamp）。

| 参数 | 说明 |
|---|---|
| `utf8Text` | 以 NUL 结尾的 UTF-8 文本（整个文件内容）。必需 |
| `outBands` | 接收频段的调用方数组。`bandCapacity` 大于 0 时必需 |
| `bandCapacity` | `outBands` 元素数。0 以上。最大频段数为 `ST_PARAMETRIC_EQ_MAX_BANDS`（16） |
| `outBandCount` | 接收解析出的频段数。必需（不可为 NULL） |
| `outPreampDb` | 接收前置放大（dB）。必需（不可为 NULL） |
| `outErrorLine` | 失败的行号（从 1 开始，与行无关的错误为 0）。允许 NULL |
| `outErrorMessage` | 失败原因（以 NUL 结尾的英文）。允许 NULL |
| `errorMessageCapacity` | `outErrorMessage` 字节数。按此长度截断 |

**结构体** `STParametricEqBand`（32 字节，无版本标记的数组元素）

| 字段 | 说明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 恒等（跳过），其他 = 开启 |
| `frequencyHz` | 中心（PEAKING·NOTCH）或转角（搁架中点·LP·HP）频率 |
| `gainDb` | 仅 PEAKING·LOW_SHELF·HIGH_SHELF 使用 |
| `q` | Q 值 |
| `reserved[3]` | 0。解析器填充为 0 |

**返回值** — `STAutoEqParseStatus`。为 `ST_AUTOEQ_PARSE_OK`(0) 时写入 `outBands[0..*outBandCount)` 与 `*outPreampDb`。失败时 `*outBandCount` = 0 · `*outPreampDb` = 0，并写入错误行·消息：`ST_AUTOEQ_PARSE_INVALID_ARGUMENT`（1，必需指针为 NULL·容量为负等） / `SYNTAX`（2，行格式错误） / `UNSUPPORTED`（3，不支持的命令·滤波器·格式） / `OUT_OF_RANGE`（4，值超出范围） / `TOO_MANY_BANDS`（5，超过 `ST_PARAMETRIC_EQ_MAX_BANDS` 或 `bandCapacity`） / `EMPTY`（6，一行 Preamp·Filter 都没有）。由于没有上下文，不会留下 last_status。

</details>

<details>
<summary><code>st_off_render_set_spatializer</code> — 选择上下文的空间化器（HRTF 类型）并加载 HRIR 数据集</summary>

```c
int st_off_render_set_spatializer(STOFF_Context* context, int type);
```

**用途** — 选择离线上下文的空间化实现（声像 / 内置 MIT KEMAR / SADIE II D2），并加载所需的 HRIR 数据集。接受与实时 `st_rt_render_set_spatializer` 相同的取值集合。

**调用方式** — 双耳 IR·试听渲染通过请求结构体（`STOfflineBinauralIRRequestOptions.hrtfType`）为每个请求选择空间化器，因此若只使用这些渲染，无需单独调用此函数。SADIE D2 需要外部资源文件 `SADIE_D2_44K_16bit_256tap.hrtfbin` — 引擎依次在环境变量 `SOUNDTRACING_SADIE_D2_HRTF_PATH`、当前工作文件夹、可执行文件文件夹、DLL 文件夹（各自该文件夹及向上 8 级的 `Assets/HRTF/`·`SoundTracing/Assets/HRTF/`·`Resources/HRTF/`）中查找。分发时放在 DLL 旁（或上级）的 `Resources/HRTF/` 中最简单。线程：`[control, blocking]` — 有加载 HRIR 数据集的较长区间，因此不要在对延迟敏感的线程中调用。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`（0，无需 HRIR 数据） / `ST_SPATIALIZER_MIT_KEMAR`（1，DLL 内置） / `ST_SPATIALIZER_SADIE_D2_KEMAR`（2，需要外部资源）。其他值被拒绝 |

**返回值** — `1` = 已应用 / `0` = 失败。上下文为 NULL 或 `type` 超出范围时为 0。选择 SADIE D2 但资源文件不存在时，返回 0 并留下 `ST_STATUS_UNAVAILABLE`（"SADIE D2 HRTF asset not found ..."）。

</details>

<details>
<summary><code>st_off_render_set_early_spatial_mode</code> — 选择双耳·试听渲染的早期反射渲染路径（exact 对象 / HOA3 bed）</summary>

```c
int st_off_render_set_early_spatial_mode(STOFF_Context* context, int mode);
```

**用途** — 选择双耳 IR 与试听渲染通过哪条路径输出早期反射。`ST_EARLY_SPATIAL_OBJECTS`（默认）是将所有早期路径合成为 exact 对象的标准版本；`ST_EARLY_SPATIAL_BED` 则以实时耳机默认路径（预算内的 exact 对象 + 其余早期反射·一阶散射走 HOA3 bed → 双耳解码）渲染。以 BED 渲染的结果等同于"仅有该声源的静止场景的同步实时输出"，因此用于离线预听或比较游戏中实际会听到的声音。

**调用方式** — 模式与计算·渲染按以下顺序关联。

1. 用此函数选择模式。不清空 IR 缓存。
2. `st_off_ir_compute` — 为 BED 时每个听者传播一次、转换两次，同时缓存 exact 标准版本与 bed 变体（只增加转换时间与 IR 内存，传播开销不变）。为 OBJECTS 时转换也只进行一次。
3. `st_off_ir_render_binaural` / `st_off_ir_render_audition_pair` 遵循**渲染时的模式**。以 BED 计算的缓存同时拥有两种变体，因此无需重新计算即可切换模式渲染两者。用 BED 渲染没有变体的缓存（以 OBJECTS 计算的缓存等）时返回 0 与 `ST_STATUS_UNAVAILABLE`，此时保持模式为 BED 并重新 compute。结果 info 中的 `earlySpatialMode` 是实际使用的模式。

声压 IR（独奏·混合·批量）与原始 IR 查询与模式无关，始终是 exact 标准版本。IR 存档若为以 BED 计算的缓存，会同时保存两种变体；加载存档不会改变上下文的模式。BED 渲染在安装 IR 后，先用静音预热（16384 帧 ≈ 0.37 s，从输出中丢弃）使路径淡入淡出·增益渐变稳定，然后再送入输入，因此渲染时间会相应增加。同时播放多个声源的实时输出会在声源之间共享合并的 bed·send，因此与逐对结果之和存在细微差异。两种模式都以听者周围一阶散射的到达方向分布对 late 扩散场加权（声压 IR 不做空间化，因此不受影响）。

是否支持通过 `st_off_get_capability_word(1)` 的 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE` 确认。线程：`[control]` — 持有作业互斥锁，因此可能阻塞直到进行中的 compute·渲染结束。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `mode` | `STEarlySpatialMode` — `ST_EARLY_SPATIAL_OBJECTS`（0，默认，exact 标准版本） / `ST_EARLY_SPATIAL_BED`（1，实时 bed 路径）。其他值被拒绝 |

**返回值** — `1` = 成功 / `0` = 失败。其他值时为 `ST_STATUS_INVALID_ARGUMENT`；在 `ST_BACKEND_EXA` 上下文中选择 BED 时为 `ST_STATUS_UNAVAILABLE`（OBJECTS 始终可用）。

</details>

<details>
<summary><code>st_off_render_get_early_spatial_mode</code> — 读取当前 early 空间模式</summary>

```c
int st_off_render_get_early_spatial_mode(const STOFF_Context* context);
```

**用途** — 返回通过 `st_off_render_set_early_spatial_mode` 选择的当前模式。默认值为 `ST_EARLY_SPATIAL_OBJECTS`(0)，与实时默认值（BED）不同。

**调用方式** — 可随时调用。实际渲染所用的模式也可通过结果 info（`STOfflineBinauralIRInfo.earlySpatialMode`、`STOFF_AuditionInfo.earlySpatialMode`）确认。线程：`[any]` — atomic 读取，可在任意线程无阻塞调用。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — 当前模式（`ST_EARLY_SPATIAL_OBJECTS`(0) / `ST_EARLY_SPATIAL_BED`(1)）。`context` 为 NULL 时为 `-1`。

</details>

<details>
<summary><code>st_off_render_set_max_delay_seconds</code> — 设置离线渲染使用的延迟环长度（秒）</summary>

```c
int st_off_render_set_max_delay_seconds(STOFF_Context* context, float seconds);
```

**用途** — 设置声压·双耳·试听·批量渲染使用的延迟环长度。延迟超过环上限的 exact 路径会从渲染中排除（late 由 FDN 覆盖），因此在需要晚于默认 4 s 到达的路径的大空间或长 IR 中，应增大此值。

**调用方式** — 这是与 IR 缓存无关的渲染设置，无需重新 compute，从下一次渲染起生效。环内存为每个渲染声源 9 频段 × 环长度。IR 存档记录保存时的值，加载的上下文使用该值（加载后可再更改）。是否支持通过 `st_off_get_capability_word(1)` 的 `ST_CAP1_OFFLINE_MAX_DELAY` 确认。线程：`[control, blocking]` — 持有作业互斥锁并重新分配延迟环。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `seconds` | 环长度（秒）。默认 4.0 s（与实时默认 2.0 s 不同）。范围与实时 `st_rt_render_set_max_delay_seconds` 相同，约 0.012 s ~ 60 s。超出范围·非有限值被拒绝 |

**返回值** — `1` = 成功 / `0` = 失败。超出范围·非有限值时为 `ST_STATUS_INVALID_ARGUMENT`，无法更改环长度的后端为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_render_get_max_delay_seconds</code> — 读取当前渲染延迟环长度（秒）</summary>

```c
float st_off_render_get_max_delay_seconds(const STOFF_Context* context);
```

**用途** — 返回通过 `st_off_render_set_max_delay_seconds` 设置（或从存档加载）的当前延迟环长度。

**调用方式** — 用于确认晚于渲染长度到达的路径是否被截断。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — 当前值（秒，默认 4.0）。`context` 为 NULL 时为 `0`。

</details>

<details>
<summary><code>st_off_debug_set_collect_visual_paths</code> — 设置下一次计算中收集哪些类型的可视化路径</summary>

```c
int st_off_debug_set_collect_visual_paths(STOFF_Context* context, uint32_t mask);
```

**用途** — 开启用于在 3D 视图中叠加绘制传播路径的可视化路径收集，并以掩码选择要收集的路径类型。默认为 0（不收集），仅在需要调试可视化时才产生开销。

**调用方式** — 可视化快照由 `st_off_ir_compute` 发布，因此需在 compute **之前**设置掩码。计算后按 `st_off_debug_get_snapshot_info` → `st_off_debug_copy_visual_paths` 的顺序读取。若要查看失败的 walk，同时开启 `st_off_debug_set_collect_failed_walks`。是否支持通过 `ST_CAP_PATH_COLLECTION_MASK` 确认。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `mask` | `STPathCollectionFlag` 位 OR — `ST_PATH_COLLECTION_GUIDE_RAY`(1) / `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY`(2) / `ST_PATH_COLLECTION_DIRECT_TRANSMISSION`(4) / `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION`（8，存在包含反射区间的衍射路径，因此两种类型共用一位） / `ST_PATH_COLLECTION_ALL`。0 = 不收集 |

**返回值** — `1` = 已应用 / `0` = 失败（`context` 为 NULL 或未定义的位）。

</details>

<details>
<summary><code>st_off_debug_set_collect_failed_walks</code> — 设置可视化收集是否包含中途失败的 walk</summary>

```c
void st_off_debug_set_collect_failed_walks(STOFF_Context* context, int enabled);
```

**用途** — 默认情况下，可视化快照中只有走完全程的路径有意义。开启此选项后也会记录中途失败的 walk，可用于调试路径为何没有生成。失败的 walk 以 `STVisualPathRecord.valid` = 0 标示。

**调用方式** — 与 `st_off_debug_set_collect_visual_paths` 一起在 compute 之前设置。要获取失败的 walk，需以 `ST_VISUAL_PATH_COPY_ALL` 调用 `st_off_debug_copy_visual_paths`（`VALID_ONLY` 只复制走完的路径）。默认关闭。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `enabled` | 0 = 关闭（默认） / 其他 = 开启 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_ir_compute</code> — 执行一次传播与 IR 转换，生成 canonical IR 缓存</summary>

```c
int st_off_ir_compute(STOFF_Context* context);
```

**用途** — 离线 IR 生成的起点。为每个已注册的听者执行一次传播（几何）与 IR 转换，在缓存中为每个听者 × 声源对生成 **canonical 原始 IR**。原始 IR 不是时域样本，而是参数形式（能量域早期抽头、late 混响发送抽头、一阶散射单元、late 混响描述符），因此与 IR 长度无关，只计算一次。之后的所有结果都派生自同一代缓存。

- 原始 IR 查询：`st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_*` — 原样复制抽头·单元·描述符
- 声压 IR：`st_off_ir_render_pressure`（单对） / `st_off_ir_render_pressure_mixed`（多个声源之和） — 宽带单声道或 9 频段分离
- 双耳 IR：`st_off_ir_render_binaural` — 立体声（L/R）
- 试听：`st_off_ir_render_audition_pair` — 将干信号分别以固定 RIR 卷积与引擎渲染阶段渲染

渲染函数只消费缓存，因此即使更改长度·输出模式·HRTF 多次渲染，也不会重新计算。

**调用方式** — 设置场景（材质·网格·对象）·声源·听者·传播选项，并用 `st_off_build` 构建加速结构后调用。更改场景·声源·听者或 IR 策略（大气、距离衰减、Doppler gain mode、能量目标等）后，需重新 compute 才会反映到结果中。而仅渲染的设置（声源 EQ、early 空间模式切换、延迟环长度）会保留缓存，从下一次渲染起生效。early 空间模式为 `ST_EARLY_SPATIAL_BED` 时，也会为每对一起生成 bed 变体（参见 `st_off_render_set_early_spatial_mode`）。若开启了可视化路径收集，还会发布同一代的可视化快照。

成功后缓存代（`st_off_ir_get_cache_generation`）改变，所有结果 info 中都带有该代号。计算失败或被取消时不发布新缓存，保留之前的缓存。进度在其他线程中用 `st_off_ir_get_progress` 读取，取消用 `st_off_ir_request_cancel` 发起。在通过 `st_off_ir_archive_load_pair` 加载存档的 render-only 上下文中会被拒绝。`maxComputeThreads` 大于 1 时，并行区间在上下文的计算池工作线程上运行。要并行计算多个上下文，请使用批处理 API（`st_off_batch_*`）。

线程：`[control, runs-here]` — 整个传播·转换管线**实际在调用线程上运行**，直到完成才返回。与此上下文的其他作业（渲染·查询）通过作业互斥锁串行化。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — `1` = 成功（已发布缓存） / `0` = 失败。计算失败·取消·render-only 上下文为 `ST_STATUS_INITIALIZATION_FAILED`（"canonical IR computation failed or was canceled"）。

</details>

<details>
<summary><code>st_off_ir_archive_save</code> — 将当前整个 canonical IR 缓存保存为带版本的存档文件</summary>

```c
int st_off_ir_archive_save(STOFF_Context* context, const char* utf8Path);
```

**用途** — 将计算出的 canonical IR 缓存保存为文件，以后无需场景·加速结构·传播·IR 转换即可重新渲染相同结果。用于只做一次繁重计算，而在单独的进程或时间点进行渲染（更改长度·输出模式·HRTF）的场景。

**调用方式** — 在 `st_off_ir_compute` 成功且存在缓存时调用。不运行 DSP。先写入临时文件并验证，再发布到目标路径，**不会覆盖已存在的文件**（此时失败）。若为以 early 空间模式 BED 计算的缓存，也会一并保存 bed 变体，并记录当前渲染延迟环长度（`st_off_render_get_max_delay_seconds`）。不保存可视化快照。加载使用 `st_off_ir_archive_load_pair`。格式·引擎版本必须相同才能加载，宿主还需确认是与生成存档的 DLL 相同的二进制（哈希）。仅在 `ST_BACKEND_ST` 上下文中可用。线程：`[control, runs-here]` — 序列化·文件写入在调用线程上运行。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `utf8Path` | 要保存的文件路径（UTF-8，以 NUL 结尾）。为空则拒绝。文件已存在则失败 |

**返回值** — `1` = 成功 / `0` = 失败。路径为 NULL·空字符串或非 ST 后端时为 `ST_STATUS_INVALID_ARGUMENT`，没有完整的 canonical 缓存或保存失败时为 `ST_STATUS_UNAVAILABLE`。即使失败，目标路径上的现有文件也保持不变。

</details>

<details>
<summary><code>st_off_ir_archive_load_pair</code> — 从存档加载一个听者·声源对，使其成为仅渲染上下文</summary>

```c
int st_off_ir_archive_load_pair(STOFF_Context* context, const char* utf8Path, STListenerId listener, STSourceId source);
```

**用途** — 从通过 `st_off_ir_archive_save` 保存的存档中取出一个已记录的对，并安装为无需场景·BVH·传播·IR 转换即可直接渲染的状态。用于无计算开销地重新试听已保存的 IR，或以不同长度·输出模式渲染。

**调用方式** — 典型用法是在新创建的离线上下文上调用。该对被安装到新的冷渲染器中，之后上下文变为 **render-only**：`st_off_ir_compute` 被拒绝，渲染也不会隐式重新计算。调用 `st_off_ir_clear_cache` 或 `st_off_trim_memory`（`ST_OFFLINE_TRIM_IR_CACHE`）后仍为 render-only，要再次渲染需重新加载。现有的渲染·查询函数（`st_off_ir_render_*`、`st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_*`）直接接受**存档中记录的 ID**。渲染延迟环长度变为存档中记录的值（加载后可再更改），early 空间模式不变。不恢复可视化快照。格式·引擎版本必须相同，宿主还需确认是与生成时相同的 DLL 二进制。仅在 `ST_BACKEND_ST` 上下文中可用。线程：`[control, runs-here]` — 文件读取与安装在调用线程上运行。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `utf8Path` | 存档文件路径（UTF-8，以 NUL 结尾）。为空则拒绝 |
| `listener` | 要加载的对的听者 ID（存档中记录的值） |
| `source` | 要加载的对的声源 ID（存档中记录的值） |

**返回值** — `1` = 成功 / `0` = 失败。路径为 NULL·空字符串或非 ST 后端时为 `ST_STATUS_INVALID_ARGUMENT`；存档中没有该对、格式·版本不匹配或加载被取消时为 `ST_STATUS_UNAVAILABLE`。即使失败，此前发布的缓存也保持不变。

</details>

<details>
<summary><code>st_off_ir_clear_cache</code> — 清空 canonical IR 缓存</summary>

```c
void st_off_ir_clear_cache(STOFF_Context* context);
```

**用途** — 清空已发布的离线查询产物（canonical 原始 IR、存档记录、可视化快照）。保留场景·引擎选项·传播工作缓冲区（若要连工作缓冲区也释放，请用 `st_off_trim_memory`）。

**调用方式** — 在用完大型缓存后回收内存，或防止误渲染旧结果时调用。清空后需重新调用 `st_off_ir_compute` 才能渲染·查询（在此之前为 `ST_STATUS_UNAVAILABLE`）。通过存档加载的 render-only 上下文在清空后需重新加载。等同于 `st_off_trim_memory(context, ST_OFFLINE_TRIM_IR_CACHE)`。线程：`[control]` — 持有作业互斥锁，因此可能要等待进行中的 compute·渲染结束。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_trim_memory</code> — 保留场景·设置，释放 IR 缓存·工作缓冲区·渲染状态内存</summary>

```c
int st_off_trim_memory(STOFF_Context* context, uint32_t flags);
```

**用途** — 在上下文闲置期间（批处理复用池等）减少其占用的内存。保留场景·BVH·材质·声源·听者·选项，因此无需重新创建上下文；下一次 compute·渲染会重新分配缓冲区，结果与未释放的上下文·新上下文逐位相同。

**调用方式** — 选择 `ST_OFFLINE_TRIM_IR_CACHE` 时等同于 `st_off_ir_clear_cache`，下一次渲染前需要 compute（通过存档加载的 render-only 上下文需重新加载）；不选择时可直接渲染已缓存的 IR。已注册到批处理的上下文，需在通过 `st_off_batch_poll` 收到该作业的完成记录后调用。是否支持通过 `ST_CAP_OFFLINE_TRIM_MEMORY` 确认。`ST_BACKEND_EXA` 上下文不清空后端工作缓冲区（会清空 IR 缓存·执行帧）。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `flags` | `ST_OFFLINE_TRIM_*` 位 OR。为 0 时不做任何操作 |

`flags` 位：

| 位 | 清除内容 |
|---|---|
| `ST_OFFLINE_TRIM_IR_CACHE` (1) | 等同于 `st_off_ir_clear_cache` — canonical 原始 IR·存档记录·可视化快照。下一次渲染前需要 compute |
| `ST_OFFLINE_TRIM_PROPAGATION_SCRATCH` (2) | 传播器·IR 转换器·执行帧为下一次 compute 保留的最大尺寸工作缓冲区。大小取决于射线数·反射阶数（例：声源 64×32 ×3、听者 64×64、深度 4 时约 23 MB）。已缓存的 IR 可照常渲染 |
| `ST_OFFLINE_TRIM_RENDER_STATE` (4) | 下一次渲染会从头重建的渲染状态（声源渲染状态·路径状态、离线渲染计划） |
| `ST_OFFLINE_TRIM_ALL` | 以上三者 |

**返回值** — `1` = 成功（`flags` = 0 时不做任何操作并返回 1） / `0` = `context` 为 NULL 或未定义的位（`ST_STATUS_INVALID_ARGUMENT`，不清除任何内容）。

</details>

<details>
<summary><code>st_off_ir_get_progress</code> — 读取进行中的计算·渲染进度（0~1）</summary>

```c
float st_off_ir_get_progress(const STOFF_Context* context);
```

**用途** — 用于在 `st_off_ir_compute` 占用调用线程运行期间**从其他线程**读取进度。与 `st_off_ir_request_cancel` 一起，是唯一一对设计为在计算期间从其他线程调用的函数。

**调用方式** — 在 UI 线程等处定期轮询。进度**从 1.0 开始** — 工作总量为 0 时按"无工作 = 已完成"返回 1.0，因此期待 0.0 的轮询循环可能在计算开始前就误判为已完成。完成判定以 `st_off_ir_compute` 的返回为准，进度仅用于显示。线程：`[any]` — lock-free atomic 读取，可在任意线程无阻塞调用。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — 进度 `[0, 1]`（已完成工作量 ÷ 总量，总量为 0 时为 1.0）。`context` 为 NULL 时为 `0`。

</details>

<details>
<summary><code>st_off_ir_request_cancel</code> — 中止进行中的计算·渲染</summary>

```c
void st_off_ir_request_cancel(STOFF_Context* context);
```

**用途** — **从其他线程**中止耗时的 `st_off_ir_compute` 或渲染。与 `st_off_ir_get_progress` 一起，是唯一一对可 lock-free 调用的函数。

**调用方式** — 在计算·渲染运行期间从其他线程调用。只中止调用时已在进行中的作业，对之后新开始的 compute·渲染没有影响（不能预先设置）。被取消的 compute 返回 0 且不发布新缓存，因此保留之前的缓存。被取消的渲染返回 0 与 `ST_STATUS_UNAVAILABLE`。要停止整个批处理作业，请使用 `st_off_batch_cancel`。线程：`[any]` — lock-free atomic，可在任意线程无阻塞调用。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_ir_get_cache_generation</code> — 读取当前 canonical IR 缓存的代号</summary>

```c
uint64_t st_off_ir_get_cache_generation(const STOFF_Context* context);
```

**用途** — 返回缓存最后一次发布的代号。原始 IR 描述符与所有渲染结果 info（`cacheGeneration` 字段）中也带有相同编号，因此宿主可以确认多次查询·渲染的结果是否**来自同一次计算**。

**调用方式** — compute 之前为 0。每次 compute 成功时改变。与抽头复制·渲染结果的 `cacheGeneration` 比较，用于检查期间是否有其他线程重新计算。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |

**返回值** — 当前代号。没有缓存（compute 之前）或 `context` 为 NULL 时为 `0`。

</details>

<details>
<summary><code>st_off_ir_get_raw_descriptor</code> — 读取听者·声源对的原始 IR 概要（数量·代号·late 混响描述符·输运能量）</summary>

```c
int st_off_ir_get_raw_descriptor(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDescriptor* outDescriptor);
```

**用途** — 返回 canonical 缓存中一个对的原始 IR 头信息。一次获取抽头·单元·连续性 ID 数量（复制缓冲区大小）、声速·采样率、缓存代号、late 混响描述符（T60·平均自由程·室内体积等）、声源输运能量收支。是不经引擎渲染而直接分析几何·统计数据，或将其送入自有渲染器时的起点。

**调用方式** — 在 `st_off_ir_compute` 之后（或加载存档之后）调用。按返回的数量分配缓冲区，再用 `st_off_ir_copy_raw_early_taps` / `st_off_ir_copy_raw_diffuse_rain_cells` / `st_off_ir_copy_raw_reverb_send_taps` / `st_off_ir_copy_raw_continuity_ids` 复制内容。原始 IR 与 early 空间模式无关，始终是 exact 标准版本。是否支持通过 `ST_CAP_OFFLINE_RAW_IR` 确认。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `outDescriptor` | 接收结果的结构体。由调用方填写 `structSize` = `sizeof(STRawIRDescriptor)`、`apiVersion` = `st_off_get_api_version()` |

**结构体** `STRawIRDescriptor`

| 字段 | 说明 |
|---|---|
| `structSize`, `apiVersion` | 由调用方填写的版本标记 |
| `cacheGeneration` | 此结果所属的缓存代号 |
| `listenerId`, `sourceId` | 对的 ID |
| `sampleRate` | 采样率（固定 44100 Hz） |
| `soundSpeedMetersPerSecond` | 此次计算使用的声速（m/s）。由大气设置推导的值 |
| `earlyTapCount` | 原始早期抽头数（`st_off_ir_copy_raw_early_taps` 所需数量）。只计几何路径 |
| `reverbSendTapCount` | late 混响发送抽头数（`st_off_ir_copy_raw_reverb_send_taps` 所需数量） |
| `continuityIdCount` | 连续性 ID 总数（`st_off_ir_copy_raw_continuity_ids` 所需数量） |
| `sourceTransportEnergy` | `STRawIRSourceTransportEnergy` — 声源输运能量收支（见下表） |
| `lateReverb` | `STRawIRReverbDescriptor` — late 混响场描述符（见下表） |
| `diffuseRainCellCount` | 一阶散射单元数（`st_off_ir_copy_raw_diffuse_rain_cells` 所需数量）。是否支持见 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` |
| `reserved[5]` | 保留 |

**结构体** `STRawIRSourceTransportEnergy` — 9 频段数组均为能量域。

| 字段 | 说明 |
|---|---|
| `valid` | 1 = 值有效 / 0 = 无 |
| `emitted[9]` | 声源输运发出的能量 |
| `diffuseReleased[9]` | 作为扩散能量释放、进入 late 混响发送的能量 |
| `escapedCoherent[9]` | 以相干状态逸出的能量 |
| `depthRemainder[9]` | 在反射深度上限处剩余的能量 |
| `boundaryAndAirLoss[9]` | 因边界（吸收）·空气吸收损失的能量 |

**结构体** `STRawIRReverbDescriptor` — 反射率·空气项为能量域，`diffuseFieldPressureGain`·`level`·`dryInputGain` 为声压域线性倍率。

| 字段 | 说明 |
|---|---|
| `valid` | 1 = 值有效 / 0 = 无 |
| `avgReflection[9]` | 平均反射率（能量） |
| `airEnergyGainPerMeanFreePath[9]` | 经过一个平均自由程时的空气吸收能量增益 |
| `eyringT60Seconds[9]` | Eyring 混响时间 T60（秒） |
| `diffuseFieldPressureGain[9]` | 扩散场声压增益（声压域） |
| `roomVolumeMetersCubed` | 估计室内体积（m³） |
| `meanFreePath` | 平均自由程（m） |
| `meanFreeFlightTimeSeconds` | 平均自由飞行时间（秒） |
| `boundaryHitRatio` | 边界命中比例（无量纲） |
| `reserved[2]` | 保留 |
| `level` | late 电平（声压域） |
| `dryInputGain` | 干输入增益（声压域） |

长度·体积输出为反映了 `sceneRatio` 的实际米单位。

**返回值** — `1` = 成功 / `0` = 失败。`outDescriptor` 为 NULL 或标记错误时为 `ST_STATUS_INVALID_ARGUMENT`，没有缓存或没有该对时为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_early_taps</code> — 复制对的原始早期抽头（直达·透射·反射·衍射路径）</summary>

```c
int st_off_ir_copy_raw_early_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRTap* outTaps, int tapCapacity);
```

**用途** — 将每条几何路径输出为能量域抽头（路径类型、延迟、9 频段能量增益、到达方向、路径长度、Doppler 斜率、路径 ID）。用于计算直达声到达时刻·ITDG·路径数等几何指标，或驱动自有渲染器。需要声压时，对各频段能量**只施加一次** `sqrt`。

**调用方式** — 原始早期抽头**只有几何路径**。进入声压 IR 渲染的一阶散射（diffuse rain）单元是以 1 ms 单元汇集的统计成分，不包含在此（`earlyTapCount` 与连续性 ID 也一样），需另外通过 `st_off_ir_copy_raw_diffuse_rain_cells` 获取。因此几何指标不会受这些单元影响。大小查询：以 `outTaps` = NULL、`tapCapacity` = 0 调用时返回所需数量（与 `STRawIRDescriptor.earlyTapCount` 相同）。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `outTaps` | 接收抽头的调用方数组。为 NULL 时为大小查询（此时 `tapCapacity` 必须为 0） |
| `tapCapacity` | `outTaps` 元素数。0 以上 |

**结构体** `STRawIRTap`（能量域）

| 字段 | 说明 |
|---|---|
| `pathType` | 0 = Direct / 1 = Transmission / 2 = Reflection / 3 = Diffraction |
| `depth` | 交互阶数 |
| `delaySeconds` | 到达延迟（秒） |
| `delaySamples` | 到达延迟（44.1 kHz 样本，含小数） |
| `bandEnergyGain[9]` | 9 频段能量增益。声压通过 `sqrt` 获得 |
| `dirFromListener[3]` | 从听者看的到达方向 |
| `matchDirFromListener[3]` | 仅用于路径对应（连续性匹配）的听者侧方向（世界坐标） |
| `matchDirFromSource[3]` | 仅用于路径对应（连续性匹配）的声源侧方向（世界坐标） |
| `pathLengthMeters` | 路径长度（m，反映 `sceneRatio`） |
| `relativeSpeed` | 相对速度（m/s） — `delayChangePerSample` × 声速 |
| `delayChangePerSample` | 每样本延迟变化（Doppler 斜率） |
| `pathId` | 64 位基于拓扑的路径 ID（在多次计算之间对应同一路径的键） |
| `interactionSignature` | 区分共享同一 `pathId` 的物理分支的交互·材质判别符 |
| `continuityOffset` | 此抽头的连续性 ID 在 `st_off_ir_copy_raw_continuity_ids` 数组中的起始索引 |
| `continuityCount` | 此抽头的连续性 ID 数。唯一路径为 0（`pathId` 即该 ID） |

**返回值** — 已复制（或所需）的抽头数。失败为 `0`：容量为负·`outTaps` 为 NULL 而容量不为 0 时为 `ST_STATUS_INVALID_ARGUMENT`，容量不足为 `ST_STATUS_BUFFER_TOO_SMALL`，没有缓存·对时为 `ST_STATUS_UNAVAILABLE`。一个抽头都没有的正常结果也为 0，因此需通过 `st_off_get_last_status` 区分。

</details>

<details>
<summary><code>st_off_ir_copy_raw_diffuse_rain_cells</code> — 复制对的一阶散射（diffuse rain）单元</summary>

```c
int st_off_ir_copy_raw_diffuse_rain_cells(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDiffuseRainCell* outCells, int cellCapacity);
```

**用途** — 输出将从散射点直接到达听者的散射能量，按直达声之后的 1 ms 单元汇集的统计成分。声压·双耳渲染将这些单元作为 late 分轨渲染（不是几何路径，因此不在 `st_off_ir_copy_raw_early_taps` 中）。用于将渲染 IR 分解为原始成分，或在自有渲染器中重现一阶散射。

**调用方式** — 契约与其他原始复制相同：`outCells` = NULL、`cellCapacity` = 0 时返回所需数量（与 `STRawIRDescriptor.diffuseRainCellCount` 相同）。没有散射时为 0。渲染声压 = `polarity` × √(能量)。是否支持通过 `st_off_get_capability_word(1)` 的 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` 确认。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `outCells` | 接收单元的调用方数组。为 NULL 时为大小查询（此时 `cellCapacity` 必须为 0） |
| `cellCapacity` | `outCells` 元素数。0 以上 |

**结构体** `STRawIRDiffuseRainCell`（能量域）

| 字段 | 说明 |
|---|---|
| `pathId` | 仅由单元编号决定的确定性 ID（同一单元为同一 ID） |
| `cellIndex` | 直达声之后的 1 ms 单元编号（从 0 开始） |
| `polarity` | 渲染声压符号 +1 / −1（每个单元确定） |
| `delaySeconds` | 单元内能量加权到达时刻（秒） |
| `delaySamples` | 同一值（44.1 kHz 样本） |
| `bandEnergyGain[9]` | 9 频段能量增益 |
| `dirFromListener[3]` | 能量加权到达方向（听者局部） |
| `delayChangePerSample` | 每样本延迟变化 |
| `reserved[4]` | 保留 |

**返回值** — 已复制（或所需）的单元数。失败为 `0`：参数错误为 `ST_STATUS_INVALID_ARGUMENT`，容量不足为 `ST_STATUS_BUFFER_TOO_SMALL`，没有缓存·对时为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_reverb_send_taps</code> — 复制对的 late 混响发送抽头（扩散能量事件）</summary>

```c
int st_off_ir_copy_raw_reverb_send_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRReverbSendTap* outTaps, int tapCapacity);
```

**用途** — 输出从声源输运获得的统计性扩散能量事件（激励 late 混响箱的发送抽头）。在引擎渲染中，这些抽头被实现为声压后进入 FDN。exact 早期路径（直达·透射·反射·衍射）不进入 FDN，而通过单独路径渲染。用于分析 late 混响的时间·频谱输入，或送入自有混响器。

**调用方式** — `outTaps` = NULL、`tapCapacity` = 0 时返回所需数量（与 `STRawIRDescriptor.reverbSendTapCount` 相同）。渲染请求的 `reverbSendMask` 选择其中哪些抽头激励混响箱。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `outTaps` | 接收抽头的调用方数组。为 NULL 时为大小查询（此时 `tapCapacity` 必须为 0） |
| `tapCapacity` | `outTaps` 元素数。0 以上 |

**结构体** `STRawIRReverbSendTap`（能量域）

| 字段 | 说明 |
|---|---|
| `sourcePathType` | 声源侧路径系列路由标签（目前声源输运为 Reflection） |
| `role` | `STReverbSendRole` — 目前只有 `ST_REVERB_SEND_OBSERVED_SCATTER`(0) 一个值 |
| `depth` | 稳定的输运时间桶序号 |
| `reserved0` | 保留 |
| `delaySeconds` | 延迟（秒） |
| `delaySamples` | 延迟（44.1 kHz 样本） |
| `bandEnergy[9]` | 9 频段能量 |
| `matchDirFromSource[3]` | 声源侧方向 |
| `pathLengthMeters` | 路径长度（m，反映 `sceneRatio`） |
| `relativeSpeed` | 相对速度（m/s） |
| `delayChangePerSample` | 每样本延迟变化 |
| `pathId` | 64 位路径 ID |

**返回值** — 已复制（或所需）的抽头数。失败为 `0`：参数错误为 `ST_STATUS_INVALID_ARGUMENT`，容量不足为 `ST_STATUS_BUFFER_TOO_SMALL`，没有缓存·对时为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_continuity_ids</code> — 复制原始早期抽头的连续性路径 ID 数组</summary>

```c
int st_off_ir_copy_raw_continuity_ids(STOFF_Context* context, STListenerId listener, STSourceId source, uint64_t* outPathIds, int idCapacity);
```

**用途** — 当合并为一个抽头的路径拥有多个拓扑路径 ID 时，将判定为同一路径的这些 ID（别名）输出为一个扁平数组。抽头 `i` 的 ID 为 `outPathIds[taps[i].continuityOffset .. + taps[i].continuityCount)`。唯一路径的抽头范围为空（`pathId` 即该 ID）。用于宿主自行在计算结果之间建立路径对应时，即使代表 `pathId` 改变也能识别为同一路径。

**调用方式** — 与 `st_off_ir_copy_raw_early_taps` 在同一缓存代中一起复制（不包含一阶散射单元）。`outPathIds` = NULL、`idCapacity` = 0 时返回所需数量（与 `STRawIRDescriptor.continuityIdCount` 相同）。线程：`[control]` — 持有作业互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `outPathIds` | 接收 64 位路径 ID 的调用方数组。为 NULL 时为大小查询（此时 `idCapacity` 必须为 0） |
| `idCapacity` | `outPathIds` 元素数。0 以上 |

**返回值** — 已复制（或所需）的 ID 数。失败为 `0`：参数错误为 `ST_STATUS_INVALID_ARGUMENT`，容量不足为 `ST_STATUS_BUFFER_TOO_SMALL`，没有缓存·对时为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_init_pressure_request</code> — 以默认值填充声压 IR 请求结构体</summary>

```c
void st_off_ir_init_pressure_request(STOfflinePressureIRRequestOptions* outOptions);
```

**用途** — 一次填充 `STOfflinePressureIRRequestOptions` 的版本标记与默认值。传给声压 IR 渲染（`st_off_ir_render_pressure`、`st_off_ir_render_pressure_mixed`、`st_off_batch_add_pressure_render*`）之前，始终先用此函数初始化，再只修改需要的字段。

**调用方式** — 可随时调用。线程：`[any]` — 只填充调用方结构体，可在任意线程无阻塞调用。

| 参数 | 说明 |
|---|---|
| `outOptions` | 要填充的结构体。为 NULL 时不做任何操作 |

**结构体** `STOfflinePressureIRRequestOptions`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `structSize` | `sizeof(STOfflinePressureIRRequestOptions)` | 版本标记 |
| `apiVersion` | `st_off_get_api_version()` 的值 | 版本标记 |
| `outputMode` | `ST_PRESSURE_IR_BROADBAND_MONO`(0) | `STPressureIROutput` — `ST_PRESSURE_IR_BROADBAND_MONO`（0，宽带单声道 1 通道） / `ST_PRESSURE_IR_SEPARATE_BANDS`（1，9 频段分离）。在同一请求中，单声道 = 9 频段之和成立 |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 要放入结果的成分。`ST_OFFLINE_OUTPUT_DIRECT`(1) / `TRANSMISSION`(2) / `REFLECTION`(4) / `DIFFRACTION`(8) / `LATE_REVERB`(16) 的 OR。组合 `ST_OFFLINE_OUTPUT_EARLY_ALL`（早期 4 种）、`ST_OFFLINE_OUTPUT_FULL`（全部）。`LATE_REVERB` 同时包含 late 混响与一阶散射单元。`FULL` 以外的位被拒绝 |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | 用早期路径 4 位（`ST_OFFLINE_OUTPUT_DIRECT`·`TRANSMISSION`·`REFLECTION`·`DIFFRACTION`）选择激励 late 混响箱的发送抽头。`ST_OFFLINE_REVERB_SEND_ALL` = `ST_OFFLINE_OUTPUT_EARLY_ALL`。`EARLY_ALL` 以外的位被拒绝 |
| `renderMethod` | 0 | 渲染器选择符。声压 IR 渲染器只有一个，0·1·2（`ST_PRESSURE_IR_RENDER_SIMULATE` / `SYNTHESIZE_EXACT` / `SIMULATE2`，旧版别名）都走同一渲染，结果字节相同。新代码用 0。其他值被拒绝 |
| `reserved[9]` | 0 | 保留 |

`outputMask` 决定可听到（返回）的成分，`reverbSendMask` 决定哪些发送抽头激励 late 混响箱。例如只设 `outputMask` = `ST_OFFLINE_OUTPUT_LATE_REVERB`，即可得到去除早期路径的 late 分轨。

**返回值** — 无。

</details>

<details>
<summary><code>st_off_ir_get_pressure_band_centers</code> — 复制 9 频段声压 IR 的频段中心频率（Hz）</summary>

```c
int st_off_ir_get_pressure_band_centers(float* outHz, int capacity);
```

**用途** — 告知 `ST_PRESSURE_IR_SEPARATE_BANDS` 结果中频段 `b` 对应哪个频率范围。引擎频段为 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz 共 9 个（`ST_FREQUENCY_BANDS`）。

**调用方式** — 无需上下文，可随时调用。在保存频段分离 IR 或绘制图表时用作标签。是否支持通过 `ST_CAP_OFFLINE_PRESSURE_BAND_METADATA` 确认。线程：`[any]` — 复制编译期常量。

| 参数 | 说明 |
|---|---|
| `outHz` | 接收中心频率的数组。为 NULL 时为大小查询（此时 `capacity` 为 0） |
| `capacity` | `outHz` 元素数。必须为 9 以上 |

**返回值** — 频段数 `9`（复制成功或大小查询）。`capacity` 小于 9，或 `outHz` 为 NULL 而 `capacity` 不为 0 时为 `0`。

</details>

<details>
<summary><code>st_off_ir_render_pressure</code> — 渲染一个听者·声源对的声压 IR（宽带单声道或 9 频段）</summary>

```c
int st_off_ir_render_pressure(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 将 canonical 缓存中的一个对渲染为时域声压脉冲响应（RIR）。exact 早期路径与发送抽头以脉冲合成，late 混响以 FDN 渲染。用于声学分析（T60·C80·EDT 等）、与测量值比较，或提取用于外部卷积混响的 IR。这是未经空间化的声压信号，与 early 空间模式无关，始终是 exact 标准版本。

**调用方式** — 在 `st_off_ir_compute` 之后调用。结果一次写入调用方拥有的缓冲区。

1. 大小查询：以 `outValues` = NULL、`capacityValues` = 0 调用时返回所需值数量，对有效时也会填充 `outInfo`。
2. 按该大小分配缓冲区后再次调用。

采样率固定为 44100 Hz。长度为 `floor(seconds × 44100)` 帧，值数量在单声道时为帧数，频段分离时为 9 × 帧数。频段分离的布局为 `values[band × bandStride + sample]`（`bandStride` = `frameCount`）。输出为**未归一化**的绝对电平，没有归一化选项。晚于延迟环上限（`st_off_render_set_max_delay_seconds`，默认 4 s）到达的 exact 路径会被排除。若施加了声源 EQ，会应用同一滤波器。重复渲染同一请求时结果逐位相同。可从其他线程通过 `st_off_ir_request_cancel` 中止。是否支持通过 `ST_CAP_OFFLINE_PRESSURE_IR` 确认。线程：`[control, blocking]` — 渲染在调用线程上运行，并与此上下文的其他作业串行化。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `seconds` | IR 长度（秒）。有限正数，至少 1 帧 |
| `options` | 用 `st_off_ir_init_pressure_request` 初始化的请求。不可为 NULL。字段参见该条目 |
| `outValues` | 接收结果的调用方缓冲区（float）。为 NULL 时为大小查询 |
| `capacityValues` | `outValues` 的 float 数量。大小查询时为 0 |
| `outInfo` | 结果元数据。允许 NULL。传入时由调用方填写 `structSize` = `sizeof(STOfflinePressureIRInfo)`、`apiVersion` |

**结构体** `STOfflinePressureIRInfo`

| 字段 | 说明 |
|---|---|
| `structSize`, `apiVersion` | 由调用方填写的版本标记 |
| `cacheGeneration` | 渲染所用的缓存代号 |
| `listenerId` | 听者 ID |
| `sourceId` | 声源 ID。混合渲染为 `-1` |
| `sampleRate` | 44100 |
| `frameCount` | 帧数 |
| `bandCount` | 1（宽带单声道）或 9（频段分离） |
| `bandStride` | 频段间隔 = `frameCount` |
| `valueCount` | float 总数 = `frameCount × bandCount` |
| `outputMode` | 实际使用的 `STPressureIROutput` |
| `reverbSendTapCount` | 进入渲染的发送抽头数（混合渲染为各声源之和） |
| `outputMask`, `reverbSendMask` | 实际使用的掩码 |
| `sourceCount` | 进入渲染的声源数。独奏渲染为 1 |
| `reserved[9]` | 保留 |

**返回值** — 已写入（或所需）的 float 数量。失败为 `0`：没有缓存时为 `ST_STATUS_UNAVAILABLE`；请求·长度·掩码·标记有误，或大小查询时对不存在为 `ST_STATUS_INVALID_ARGUMENT`；缓冲区不足为 `ST_STATUS_BUFFER_TOO_SMALL`；渲染失败·取消为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_render_pressure_mixed</code> — 一次载入一个听者和多个声源，渲染合并后的单个声压 IR</summary>

```c
int st_off_ir_render_pressure_mixed(STOFF_Context* context, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 不必分别渲染同一听者的多个声源 RIR 再相加，而是全部载入一次脉冲渲染，输出一个 RIR。结果等于各声源 `st_off_ir_render_pressure` 结果之和：exact 抽头按请求顺序累加到同一输出，发送以原振幅（含符号）累加到听者侧，FDN 只运行一次。FDN 是线性·时不变的，因此 late 也像独奏之和一样相干相加，而 FDN 开销只有一次。用于需要多个声源同时发声场景的 RIR。

**调用方式** — 在 `st_off_ir_compute` 之后调用。缓冲区·大小查询约定、长度·采样率·无归一化与 `st_off_ir_render_pressure` 相同。也可以只放入该听者的部分声源。仅浮点求和顺序与独奏之和不同，因此并非逐位相同，求和顺序为 `sources` 数组顺序（与声源注册顺序无关）。同一请求的重复渲染逐位相同，`sourceCount` = 1 时与独奏渲染逐位相同。原始 IR 查询仍按声源进行。是否支持通过 `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED` 确认。线程：`[control, blocking]` — 渲染在调用线程上运行。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `sources` | 声源句柄数组。无重复，且全部必须是该听者的 canonical 对 |
| `sourceCount` | 声源数。`1` 以上 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`（1024）以下 |
| `seconds` | IR 长度（秒）。有限正数，至少 1 帧 |
| `options` | 用 `st_off_ir_init_pressure_request` 初始化的请求 |
| `outValues` | 结果缓冲区。为 NULL 时为大小查询 |
| `capacityValues` | `outValues` 的 float 数量。大小查询时为 0 |
| `outInfo` | 结果元数据（`STOfflinePressureIRInfo`，字段参见 `st_off_ir_render_pressure` 条目）。允许 NULL。`sourceId` = -1，`sourceCount` = 声源数，`reverbSendTapCount` = 各声源之和 |

**返回值** — 已写入（或所需）的 float 数量。失败为 `0`：没有缓存时为 `ST_STATUS_UNAVAILABLE`，重复·未注册声源·错误请求为 `ST_STATUS_INVALID_ARGUMENT`，缓冲区不足为 `ST_STATUS_BUFFER_TOO_SMALL`，渲染失败·取消为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_init_binaural_request</code> — 以默认值填充双耳 IR 请求结构体</summary>

```c
void st_off_ir_init_binaural_request(STOfflineBinauralIRRequestOptions* outOptions);
```

**用途** — 填充 `STOfflineBinauralIRRequestOptions` 的版本标记与默认值。传给 `st_off_ir_render_binaural` 和 `st_off_ir_render_audition_pair` 之前，始终先用此函数初始化。

**调用方式** — 默认 `hrtfType` 为 SADIE D2，需要外部资源文件（查找顺序参见 `st_off_render_set_spatializer` 条目）。若不使用资源，将 `hrtfType` 改为 `ST_SPATIALIZER_MIT_KEMAR`（1，内置）或 `ST_SPATIALIZER_PANNING`(0)。线程：`[any]` — 只填充调用方结构体。

| 参数 | 说明 |
|---|---|
| `outOptions` | 要填充的结构体。为 NULL 时不做任何操作 |

**结构体** `STOfflineBinauralIRRequestOptions`

| 字段 | 默认值 | 说明 |
|---|---|---|
| `structSize` | `sizeof(STOfflineBinauralIRRequestOptions)` | 版本标记 |
| `apiVersion` | `st_off_get_api_version()` 的值 | 版本标记 |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 要放入结果的成分（`ST_OFFLINE_OUTPUT_*`，含义与 `st_off_ir_init_pressure_request` 条目相同） |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | 激励 late 混响箱的发送抽头（早期路径 4 位） |
| `hrtfType` | `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) | `STSpatializerType` — `PANNING`(0) / `MIT_KEMAR`(1) / `SADIE_D2_KEMAR`(2) |
| `reserved[10]` | 0 | 保留 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_ir_render_binaural</code> — 渲染一个听者·声源对的双耳（立体声 L/R）IR</summary>

```c
int st_off_ir_render_binaural(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflineBinauralIRRequestOptions* options, float* outInterleavedLR, int capacityFrames, STOfflineBinauralIRInfo* outInfo);
```

**用途** — 将 canonical 缓存中的一个对渲染为经 HRTF 空间化的双通道脉冲响应。用于获取耳机试听用 BRIR，或送入外部卷积器。早期反射路径遵循渲染时的 early 空间模式（`st_off_render_set_early_spatial_mode`）。

**调用方式** — 在 `st_off_ir_compute` 之后调用，大小查询方式与声压 IR 相同（`outInterleavedLR` = NULL、`capacityFrames` = 0 → 所需帧数与 `outInfo`）。`capacityFrames` 不是 float 数量而是**立体声帧数**，缓冲区为 L/R 交错（`[L0, R0, L1, R1, …]`），需容纳帧数 × 2 个 float。长度为 `floor(seconds × 44100)` 帧，采样率固定为 44100 Hz。限幅器与归一化始终关闭（无归一化选项）。OBJECTS 模式下路径淡入淡出与 Doppler 也固定关闭；BED 模式为同步实时 bed 路径，路径淡入淡出·Doppler·增益渐变以实时默认值开启，在稳态下渲染（静止场景中对结果无影响）。若 SADIE D2 资源不存在，则从大小查询起就失败。是否支持通过 `ST_CAP_OFFLINE_BINAURAL_IR` 确认。线程：`[control, blocking]` — 渲染在调用线程上运行。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `seconds` | IR 长度（秒）。有限正数，至少 1 帧 |
| `options` | 用 `st_off_ir_init_binaural_request` 初始化的请求。不可为 NULL |
| `outInterleavedLR` | L/R 交错结果缓冲区。为 NULL 时为大小查询 |
| `capacityFrames` | 缓冲区的**立体声帧**数。大小查询时为 0 |
| `outInfo` | 结果元数据。允许 NULL。传入时由调用方填写 `structSize` = `sizeof(STOfflineBinauralIRInfo)`、`apiVersion` |

**结构体** `STOfflineBinauralIRInfo`

| 字段 | 说明 |
|---|---|
| `structSize`, `apiVersion` | 由调用方填写的版本标记 |
| `cacheGeneration` | 渲染所用的缓存代号 |
| `listenerId`, `sourceId` | 对的 ID |
| `sampleRate` | 44100 |
| `frameCount` | 立体声帧数 |
| `channelCount` | 固定为 2 |
| `valueCount` | float 数量 = `frameCount × 2` |
| `reverbSendTapCount` | 进入渲染的发送抽头数 |
| `outputMask`, `reverbSendMask` | 实际使用的掩码 |
| `hrtfType` | 实际使用的 `STSpatializerType` |
| `earlySpatialMode` | 实际使用的 `STEarlySpatialMode`（是否支持见 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`） |
| `reserved[9]` | 保留 |

**返回值** — 已写入（或所需）的立体声帧数。失败为 `0`：没有缓存、SADIE D2 资源不存在或 BED 模式下缓存中没有 bed 变体时为 `ST_STATUS_UNAVAILABLE`；请求·标记有误或大小查询时对不存在为 `ST_STATUS_INVALID_ARGUMENT`；缓冲区不足为 `ST_STATUS_BUFFER_TOO_SMALL`；渲染失败·取消为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_render_audition_pair</code> — 将干信号分别以固定 RIR 卷积与引擎渲染阶段渲染，作为一对返回</summary>

```c
int st_off_ir_render_audition_pair(STOFF_Context* context, STListenerId listener, STSourceId source, double irSeconds, const STOfflineBinauralIRRequestOptions* options, const float* dryMono, int dryFrames, float* outConvolvedLR, float* outStageLR, int capacityFrames, STOFF_AuditionInfo* outInfo);
```

**用途** — 从同一 canonical 对生成两种试听结果：(1) 将双耳 IR 渲染为固定 RIR 后与干信号卷积的结果；(2) 将同一对置于引擎的渲染阶段（与实时渲染共用的阶段）并让干信号直接通过的结果。并排试听或比较两种结果，用于确认提取的 IR 在多大程度上代表引擎实际输出的声音。

**调用方式** — 在 `st_off_ir_compute` 之后调用。两个输出缓冲区均为 L/R 交错立体声帧，必须同时传入或同时为 NULL。两者都为 NULL 时 `capacityFrames` 必须为 0，`dryMono` 也可为 NULL，此时成为仅用 `dryFrames` 计算大小的元数据查询。输出长度为 `dryFrames + irFrames − 1` 帧（`irFrames` = `floor(irSeconds × 44100)`），每个缓冲区需容纳该帧数 × 2 个 float。空间化器·掩码·early 空间模式·限幅器/归一化关闭规则与 `st_off_ir_render_binaural` 相同。线程：`[control, blocking]` — 渲染在调用线程上运行。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `irSeconds` | 卷积所用 IR 长度（秒）。有限正数，至少 1 帧 |
| `options` | 用 `st_off_ir_init_binaural_request` 初始化的请求（`STOfflineBinauralIRRequestOptions`，字段参见该条目） |
| `dryMono` | 44.1 kHz 单声道干信号。渲染时必需，大小查询时允许 NULL |
| `dryFrames` | 干信号帧数。1 以上（大小查询时也需要） |
| `outConvolvedLR` | 固定 RIR 卷积结果（L/R 交错）。与 `outStageLR` 同时为 NULL 时为大小查询 |
| `outStageLR` | 引擎渲染阶段结果（L/R 交错） |
| `capacityFrames` | 每个缓冲区的立体声帧数。大小查询时为 0 |
| `outInfo` | 结果元数据。允许 NULL。传入时由调用方填写 `structSize` = `sizeof(STOFF_AuditionInfo)`、`apiVersion` |

**结构体** `STOFF_AuditionInfo`

| 字段 | 说明 |
|---|---|
| `structSize`, `apiVersion` | 由调用方填写的版本标记 |
| `cacheGeneration` | 渲染所用的缓存代号 |
| `listenerId`, `sourceId` | 对的 ID |
| `sampleRate` | 44100 |
| `frameCount` | 输出立体声帧数 = `dryFrameCount + irFrameCount − 1` |
| `dryFrameCount` | 干信号帧数 |
| `irFrameCount` | IR 帧数 |
| `earlySpatialMode` | 实际使用的 `STEarlySpatialMode` |
| `reserved[7]` | 保留 |

**返回值** — 输出立体声帧数。失败为 `0`：没有缓存、SADIE D2 资源不存在或 BED 模式下没有 bed 变体时为 `ST_STATUS_UNAVAILABLE`；只有一个缓冲区为 NULL·`dryFrames` 为 0 以下·错误请求为 `ST_STATUS_INVALID_ARGUMENT`；缓冲区不足为 `ST_STATUS_BUFFER_TOO_SMALL`；渲染失败·取消为 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_debug_get_snapshot_info</code> — 读取听者最近一次计算代的诊断快照概要（路径数·可视化缓冲区大小）</summary>

```c
int st_off_debug_get_snapshot_info(STOFF_Context* context, STListenerId listener, STPropagationSnapshotInfo* outInfo);
```

**用途** — 返回最近一次 `st_off_ir_compute` 为该听者发布的诊断快照概要。由 `frameGeneration` 保证总·反射·衍射路径数、衍射分类计数器、可视化路径·点数量全部**来自同一代**。用于确认路径数并确定 `st_off_debug_copy_visual_paths` 的缓冲区大小。

**调用方式** — 快照由 `st_off_ir_compute` 发布，因此在此之前返回 0。要获取可视化路径·点，需在 compute 之前通过 `st_off_debug_set_collect_visual_paths` 开启收集。将返回的 `frameGeneration` 原样传给 `st_off_debug_copy_visual_paths`，即可检查复制的是否为同一代。线程：`[control]` — 持有作业·可视化互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `outInfo` | 结果结构体。由调用方填写 `structSize` = `sizeof(STPropagationSnapshotInfo)`、`apiVersion` |

**结构体** `STPropagationSnapshotInfo`

| 字段 | 说明 |
|---|---|
| `structSize`, `apiVersion` | 由调用方填写的版本标记 |
| `frameGeneration` | 此快照的代号（离线为 IR 缓存代号） |
| `collectionMask` | 收集此代时的 `STPathCollectionFlag` 掩码 |
| `reserved0` | 保留 |
| `visualPathCount` | 可视化路径记录总数（含失败的 walk，`ST_VISUAL_PATH_COPY_ALL` 所需数量） |
| `validVisualPathCount` | 走完全程的路径记录数（`ST_VISUAL_PATH_COPY_VALID_ONLY` 所需数量） |
| `visualPointCount` | 可视化点总数 |
| `validVisualPointCount` | 走完全程路径的点数 |
| `totalPathCount` | 路径总数 |
| `reflectionPathCount` | 反射路径数 |
| `diffractionPathCount` | 衍射路径数 |
| `sourceSideOnlyPaths` | 仅在声源侧边缘衍射的路径数 |
| `unclassifiedPaths` | 未分类的衍射路径数 |
| `sourceSideEvents` | 声源侧衍射事件数 |
| `terminalOnlyPaths` | 仅在听者侧末端边缘衍射的路径数 |
| `sourceAndTerminalPaths` | 两侧都衍射的路径数 |
| `terminalEvents` | 听者侧末端衍射事件数 |
| `reserved[4]` | 保留 |

走完全程的路径及其点占据各数组的前部（prefix）。

**返回值** — `1` = 成功 / `0` = 失败或没有快照（compute 之前、该听者不存在、`outInfo` 为 NULL·标记不一致）。

</details>

<details>
<summary><code>st_off_debug_copy_visual_paths</code> — 将可视化路径记录与点复制到调用方缓冲区</summary>

```c
int st_off_debug_copy_visual_paths(STOFF_Context* context, STListenerId listener, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**用途** — 将最近一次计算代的可视化路径（声源 → 交互点 → 听者，引导射线为听者 → 命中点）复制为记录数组与点数组，以便在 3D 视图中绘制。顶点坐标保持场景单位，可直接叠加绘制到宿主场景中。

**调用方式** — 用 `st_off_debug_get_snapshot_info` 获取数量并分配缓冲区后调用。没有大小查询模式 — 容量小于所需数量时失败。在 `frameGeneration` 中传入 `st_off_debug_get_snapshot_info` 返回的值，则期间若发布了新的代就会失败。传入 0 则不做代检查，复制当前快照。记录 `i` 的点为 `outPoints[pointOffset .. pointOffset + pointCount)`。线程：`[control]` — 持有作业·可视化互斥锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `listener` | 听者句柄 |
| `frameGeneration` | 期望的代号（`st_off_debug_get_snapshot_info` 的值）。0 = 不检查，使用当前快照 |
| `copyMode` | `STVisualPathCopyMode` — `ST_VISUAL_PATH_COPY_VALID_ONLY`（0，仅走完全程的路径） / `ST_VISUAL_PATH_COPY_ALL`（1，含失败的 walk）。其他值被拒绝 |
| `outPaths` | 路径记录缓冲区。有要复制的路径时不可为 NULL |
| `pathCapacity` | `outPaths` 元素数。不少于对应模式的路径数 |
| `outPoints` | 点缓冲区。有要复制的点时不可为 NULL |
| `pointCapacity` | `outPoints` 元素数。不少于对应模式的点数 |

**结构体** `STVisualPathRecord`

| 字段 | 说明 |
|---|---|
| `pointOffset`, `pointCount` | 此路径的点在点数组中占据的区间（有序路径） |
| `depth` | 交互阶数 |
| `pathKind` | `STPathKind` — `ST_PATH_GUIDE_RAY`(0) / `ST_PATH_DIRECT`（1，包括透射） / `ST_PATH_REFLECTION`(2) / `ST_PATH_DIFFRACTION_S`（4，声源侧边缘） / `ST_PATH_DIFFRACTION_L`（8，听者侧末端边缘） / `ST_PATH_DIFFRACTION_SL`(12) / `ST_PATH_SOURCE_TRANSPORT_RAY`(16)。`ST_PATH_DIFFRACTION_UNKNOWN`(3) 正常情况下不会出现 |
| `soundSourceIndex` | 声源索引。引导射线为 -1 |
| `valid` | 1 = 走完全程 / 0 = 中途失败的 walk |
| `totalLengthMeters` | 路径总长度（m，反映 `sceneRatio`） |
| `reserved0` | 保留 |

**结构体** `STVisualPoint`

| 字段 | 说明 |
|---|---|
| `x`, `y`, `z` | 顶点坐标（保持场景单位） |
| `flags` | `STVisualPointFlag` — `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`（1，衍射点） |

**返回值** — `1` = 成功 / `0` = 失败。`copyMode` 有误或所需缓冲区为 NULL 时为 `ST_STATUS_INVALID_ARGUMENT`，没有快照或代已改变时为 `ST_STATUS_UNAVAILABLE`，容量不足为 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_off_debug_copy_mesh_accel_nodes</code> — 复制网格 BLAS 的节点包围盒用于可视化</summary>

```c
int st_off_debug_copy_mesh_accel_nodes(STOFF_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 以只读方式复制传播所用网格加速结构（BLAS）的节点包围盒。用于调试可视化加速结构如何划分网格。与实时 `st_rt_debug_copy_mesh_accel_nodes` 契约相同，离线上下文也以与实时相同的边界设置构建 BLAS，因此加速结构类型相同时结果相同。

**调用方式** — 创建网格后可随时调用。BLAS 按网格创建时的 `st_off_scene_set_accel` 值构建。节点为深度优先**前序**顺序，根为 `[0]`（depth 0），每个节点的父节点是数组中位于其前面最近的 depth − 1 节点。坐标为传给 `st_off_mesh_create` 的顶点坐标系（网格局部），要按实例绘制需由宿主乘以对象变换。大型网格有数千个节点，通常用 `maxDepth` 只看上层。缓冲区不足时只写入前序顺序的前部（从最左分支开始），因此要看上层请用 `maxDepth` 截断。是否支持通过 `ST_CAP_ACCEL_DEBUG_NODES` 确认。线程：`[control]` — 只持有场景 read 锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `mesh` | 网格句柄 |
| `maxDepth` | 负数 = 全部深度。0 以上时只计数·写入 depth 在 `maxDepth` 以下的节点 |
| `outNodes` | 节点缓冲区。为 NULL 时为大小查询（忽略 `nodeCapacity`） |
| `nodeCapacity` | `outNodes` 元素数。从前往后写入 min(总数, `nodeCapacity`) 个 |

**结构体** `STAccelNode`（32 字节，无版本标记的数组元素）

| 字段 | 说明 |
|---|---|
| `boundsMin[3]`, `boundsMax[3]` | 节点包围盒（该加速结构构建时的坐标系，无 `sceneRatio` 变换） |
| `depth` | 深度。根 = 0 |
| `primitiveCount` | 叶节点：包含的图元数（0 以上） / 内部节点：-1 |

各加速结构类型的含义：BVH 系列（0 BinnedSAH、2 TinyBVH、3 LBVH、4 LBVH_Simd）为构建出的二叉树，4/8-wide 遍历表示是将此树折叠而成，因此其包围盒是此列表的子集。KD（1 HybridKD）是用分割平面切割根包围盒推导出的包围盒，兄弟包围盒不重叠且精确划分父节点，存在空叶节点（`primitiveCount` 0），跨多个叶节点的三角形在每个叶节点中各计一次。

**返回值** — `maxDepth` 范围内的**总**节点数（0 以上） / `-1` = 失败（`context` 为 NULL，网格不存在为 `ST_STATUS_NOT_FOUND`）。截断的复制仍返回总数，并留下 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_off_debug_copy_scene_accel_nodes</code> — 复制场景 TLAS（对象实例加速结构）的节点包围盒</summary>

```c
int st_off_debug_copy_scene_accel_nodes(STOFF_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 复制在对象实例之上构建的场景加速结构（TLAS）的节点包围盒。用于可视化整个场景的空间划分。与实时 `st_rt_debug_copy_scene_accel_nodes` 的契约相同。

**调用方式** — 静态 TLAS 是 `st_off_build` 发布的，在下次构建之前保持上次发布的版本（看不到暂存的静态更改）。动态 TLAS 由动态对象重建重新发布。坐标为场景（世界）坐标系，TLAS 叶节点的图元不是三角形而是对象实例。节点顺序·`maxDepth`·大小查询·截断约定与 `STAccelNode` 字段与 `st_off_debug_copy_mesh_accel_nodes` 条目相同。是否支持见 `ST_CAP_ACCEL_DEBUG_NODES`。线程：`[control]` — 只持有场景 read 锁。

| 参数 | 说明 |
|---|---|
| `context` | 离线上下文句柄 |
| `layer` | `STAccelLayer` — `ST_ACCEL_LAYER_STATIC`（0，`st_off_build` 发布的静态 TLAS） / `ST_ACCEL_LAYER_DYNAMIC`（1，动态对象 TLAS） |
| `maxDepth` | 负数 = 全部深度。0 以上时只到该深度 |
| `outNodes` | 节点缓冲区。为 NULL 时为大小查询 |
| `nodeCapacity` | `outNodes` 元素数 |

**返回值** — `maxDepth` 范围内的总节点数（0 以上）。该 TLAS 尚不存在时（构建之前、没有该类型对象）不是错误，返回 `0`。`-1` = 失败（`context` 为 NULL，`layer` 超出范围为 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_debug_build_mesh_accel_nodes</code> — 无需上下文，为单个网格构建 BLAS 并返回节点包围盒</summary>

```c
int st_off_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 在创建场景或上下文之前，预览单个网格的加速结构会如何构建（宿主编辑器预览等）。与网格创建使用相同的输入验证·相同的构建路径，因此 `accelKind` 相同时与上下文构建的 BLAS 是同一棵树。与实时 `st_rt_debug_build_mesh_accel_nodes` 结果相同。

**调用方式** — 每次调用都会重新构建 BLAS（与网格大小成正比）。结果由宿主缓存。节点顺序·`maxDepth`·大小查询·截断约定与 `STAccelNode` 字段与 `st_off_debug_copy_mesh_accel_nodes` 条目相同。线程：`[any]` — 无全局状态，可在任意线程调用（耗时与构建开销相当）。

| 参数 | 说明 |
|---|---|
| `mesh` | 三角形网格（见下方结构体）。不可为 NULL |
| `accelKind` | `st_off_scene_set_accel` 的 kind — 0 BinnedSAH / 1 HybridKD / 2 TinyBVH / 3 LBVH / 4 LBVH_Simd。`-1` = 引擎默认（TinyBVH） |
| `maxDepth` | 负数 = 全部深度。0 以上时只到该深度 |
| `outNodes` | 节点缓冲区。为 NULL 时为大小查询 |
| `nodeCapacity` | `outNodes` 元素数 |

**结构体** `STMesh`

| 字段 | 说明 |
|---|---|
| `numVertices` | 顶点数 |
| `vertices` | xyz 交错 float 数组（`numVertices × 3` 个） |
| `numTriangles` | 三角形数 |
| `triangles` | 顶点索引数组（`numTriangles × 3` 个） |

**返回值** — `maxDepth` 范围内的总节点数（0 以上） / `-1` = 失败（mesh·数组为 NULL、数量为 0 以下、非有限顶点、索引超出范围、错误的 kind、分配失败）。由于没有上下文，不会留下 last_status。

</details>

<details>
<summary><code>st_off_batch_create</code> — 创建并行执行多个上下文计算·声压 IR 渲染的批处理对象</summary>

```c
STOFF_Batch* st_off_batch_create(int32_t workerCount);
```

**用途** — 离线批处理运行时的起点。为每个上下文照常设置场景·声源·听者·选项后，将这些上下文与声压 IR 渲染请求一次性注册到批处理中，引擎便以自身的**批处理工作线程**为每个作业依次运行 `st_off_ir_compute` 与已注册的声压渲染，并通过轮询返回已完成的作业。批量生成大量场景·位置的 RIR 时，宿主无需自行编写线程池。结果与在同一上下文中由调用线程运行 `st_off_ir_compute` → `st_off_ir_render_pressure` 逐位相同。

**调用方式** — 生命周期如下。

1. `st_off_batch_create` — 创建批处理对象（此时不创建线程）
2. `st_off_batch_add_job` — 一个上下文 = 一个作业进行注册
3. `st_off_batch_add_pressure_render` / `st_off_batch_add_pressure_render_mixed` — 为每个作业注册渲染请求
4. `st_off_batch_start` — 启动批处理工作线程并立即返回（每个批处理一次）
5. `st_off_batch_poll`（接收完成记录） · `st_off_batch_wait` · `st_off_batch_remaining` — 观察进度
6. `st_off_batch_fetch_pressure` — 复制已完成作业的结果
7. `st_off_batch_release_job` — 释放已取完作业的结果内存
8. `st_off_batch_destroy` — 取消剩余作业、join 工作线程、释放

批处理只处理声压 IR（双耳·试听渲染直接通过上下文函数调用）。批处理工作线程与上下文内部计算池工作线程相互独立，不属于 `STThreadType`。是否支持通过 `ST_CAP_OFFLINE_BATCH` 确认。线程：`[any]` — 批处理工作线程在 start 时创建。

| 参数 | 说明 |
|---|---|
| `workerCount` | 批处理工作线程数。0 以下 = 硬件线程数。实际启动的数量不超过作业数 |

**返回值** — 批处理句柄。分配失败时为 NULL。

</details>

<details>
<summary><code>st_off_batch_destroy</code> — 取消·清理并释放批处理</summary>

```c
void st_off_batch_destroy(STOFF_Batch* batch);
```

**用途** — 取消剩余作业，join 所有批处理工作线程后，释放批处理及其保管的结果。

**调用方式** — 在取完结果后，或想要中止时调用。返回后批处理不再引用已注册的上下文。会等待运行中的作业响应取消而停止，因此会阻塞。线程：`[any, blocking]` — 可在任意线程调用，但会阻塞直到工作线程 join。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄。为 NULL 时不做任何操作 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_batch_get_last_status</code> — 读取批处理自身最后一次调用的状态码</summary>

```c
int st_off_batch_get_last_status(const STOFF_Batch* batch);
```

**用途** — 批处理函数（`add_*`、`start`、`fetch_pressure`、`release_job` 等）失败时，以 `STStatus` 返回原因。各作业的失败（计算·渲染失败）不在此处读取，而是通过 `st_off_batch_get_job_error` 读取。

**调用方式** — 在批处理函数返回失败值（-1 / 0）后立即调用。成功的调用会将其清为 `ST_STATUS_OK`。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |

**返回值** — `STStatus` 值（`ST_STATUS_OK`、`ST_STATUS_INVALID_ARGUMENT`、`ST_STATUS_UNAVAILABLE`、`ST_STATUS_BUFFER_TOO_SMALL` 等）。`batch` 为 NULL 时为 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_get_last_error</code> — 复制批处理自身的最后一条错误消息</summary>

```c
int st_off_batch_get_last_error(const STOFF_Batch* batch, char* outMessage, int32_t capacity);
```

**用途** — 返回与 `st_off_batch_get_last_status` 配对的人类可读错误消息（英文）。

**调用方式** — 在批处理函数失败后立即调用以记录日志。没有错误时为空字符串。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄。为 NULL 时复制空字符串 |
| `outMessage` | 接收消息的缓冲区。以 NUL 结尾，按 `capacity` 截断 |
| `capacity` | `outMessage` 字节数。1 以上 |

**返回值** — `1` = 已复制 / `0` = `outMessage` 为 NULL 或 `capacity` 为 0 以下。

</details>

<details>
<summary><code>st_off_batch_worker_count</code> — 读取批处理设置的工作线程数</summary>

```c
int32_t st_off_batch_worker_count(const STOFF_Batch* batch);
```

**用途** — 返回解析传给 `st_off_batch_create` 的值后得到的工作线程数（若传入 0 以下则为硬件线程数）。

**调用方式** — 可随时调用。`st_off_batch_start` 按此值与作业数中较小者启动工作线程。完成记录的 `workerIndex` 从 0 开始，小于此值。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |

**返回值** — 工作线程数。`batch` 为 NULL 时为 `0`。

</details>

<details>
<summary><code>st_off_batch_add_job</code> — 将一个上下文注册为批处理作业</summary>

```c
int32_t st_off_batch_add_job(STOFF_Batch* batch, STOFF_Context* context);
```

**用途** — 将已设置好场景·声源·听者·选项的离线上下文注册为一个作业。作业在一个批处理工作线程上运行 `st_off_ir_compute` 后，按注册顺序执行为该作业注册的声压渲染。

**调用方式** — **仅在** `st_off_batch_start` **之前**接受。在同一批处理中不要将同一上下文注册到两个作业。上下文指针是**借用的**：从注册起直到通过 `st_off_batch_poll` 收到该作业的完成记录为止，不得销毁该上下文或调用其他 API。收到完成记录后批处理不再引用该上下文，因此即使批处理仍存活，宿主也重新拥有它 — 原始 IR 查询、场景·声源修改、销毁、重新注册到其他批处理均可进行，而该作业的结果由批处理单独保管，因此 `st_off_batch_fetch_pressure` 仍可照常使用。此行为通过 `ST_CAP_OFFLINE_BATCH_CONTEXT_RETURN` 确认；在没有此位的库中，直到销毁批处理为止都不要触碰已注册的上下文。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `context` | 要注册的离线上下文（借出） |

**返回值** — 作业索引（从 0 开始，按注册顺序）。失败为 `-1`：`context` 无效或批处理已 start 时，批处理状态为 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_add_pressure_render</code> — 为作业添加一个听者·声源对的声压 IR 渲染请求</summary>

```c
int32_t st_off_batch_add_pressure_render(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**用途** — `st_off_ir_render_pressure` 的批处理版本。作业完成 compute 后渲染此请求，结果由批处理保管，并通过 `st_off_batch_fetch_pressure` 提供。

**调用方式** — 在 `st_off_batch_start` 之前调用。一个作业可放入多个请求，按注册顺序执行。若一个请求失败，该作业即以失败结束，后续渲染不再执行。对是否存在在渲染时检查，因此未注册的对会表现为作业失败（`st_off_batch_get_job_error`）。请求字段·长度·无归一化等结果含义与 `st_off_ir_render_pressure` 相同。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `jobIndex` | `st_off_batch_add_job` 返回的作业索引 |
| `listener` | 听者句柄 |
| `source` | 声源句柄 |
| `seconds` | IR 长度（秒）。有限正数 |
| `options` | 用 `st_off_ir_init_pressure_request` 初始化的请求（`STOfflinePressureIRRequestOptions`，字段参见该条目）。在注册时复制 |

**返回值** — 该作业内的渲染索引（从 0 开始，按注册顺序）。失败为 `-1`：错误请求、作业索引不存在、批处理已 start 时，批处理状态为 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_add_pressure_render_mixed</code> — 为作业添加一个听者·多个声源的混合声压 IR 渲染请求</summary>

```c
int32_t st_off_batch_add_pressure_render_mixed(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**用途** — `st_off_ir_render_pressure_mixed` 的批处理版本。与同一作业的独奏渲染使用**同一渲染索引空间**，结果通过 `st_off_batch_fetch_pressure` 获取（`info.sourceId` = -1，`info.sourceCount` = 声源数）。

**调用方式** — 在 `st_off_batch_start` 之前调用。声源列表在注册时复制，因此调用后可复用数组。句柄有效性·重复在注册时检查，对是否存在则在作业完成 compute 后的渲染时检查，因此未注册的对会表现为作业失败（`st_off_batch_get_job_error`）。是否支持见 `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `jobIndex` | 作业索引 |
| `listener` | 听者句柄 |
| `sources` | 声源句柄数组。无重复 |
| `sourceCount` | 声源数。`1` 以上 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`（1024）以下 |
| `seconds` | IR 长度（秒）。有限正数 |
| `options` | 用 `st_off_ir_init_pressure_request` 初始化的请求 |

**返回值** — 该作业内的渲染索引。失败为 `-1`：错误请求·声源数超出范围·无效或重复的句柄·作业索引不存在·批处理已 start 时，批处理状态为 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_start</code> — 启动批处理工作线程，开始执行已注册的作业</summary>

```c
int st_off_batch_start(STOFF_Batch* batch);
```

**用途** — 结束注册并启动批处理工作线程。工作线程逐个取走作业并运行 compute 与渲染。

**调用方式** — 在注册完所有作业与渲染请求后只调用一次。立即返回，之后的进度通过 `st_off_batch_poll` / `st_off_batch_wait` / `st_off_batch_remaining` 观察。start 之后 `add_*` 会被拒绝。批处理不能再次 start，因此新工作需注册到新的批处理。线程：`[control]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |

**返回值** — `1` = 已开始 / `0` = 失败（没有作业或已 start → 批处理状态为 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_batch_poll</code> — 取出已完成作业的完成记录</summary>

```c
int32_t st_off_batch_poll(STOFF_Batch* batch, STOfflineBatchCompletion* outCompletions, int32_t capacity);
```

**用途** — 每完成一个作业就会产生一条完成记录，此函数最多取出 `capacity` 条（从队列中移除）并复制。收到完成记录是 fetch 该作业结果并收回上下文的前提条件。

**调用方式** — start 之后在任意线程定期调用，或在 `st_off_batch_wait` 之后一次性取空。每个作业的记录恰好出现一次。对已收到记录的作业调用 `st_off_batch_fetch_pressure` → `st_off_batch_release_job`。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `outCompletions` | 接收记录的数组。由引擎填写每条记录的 `structSize`·`apiVersion` |
| `capacity` | `outCompletions` 元素数。1 以上 |

**结构体** `STOfflineBatchCompletion`

| 字段 | 说明 |
|---|---|
| `structSize`, `apiVersion` | 由引擎填写的版本标记 |
| `jobIndex` | 已完成作业的索引 |
| `status` | 0 = 成功 / 1 = compute·渲染失败（消息见 `st_off_batch_get_job_error`） / 2 = 取消 |
| `renderCount` | 成功的声压渲染数 |
| `workerIndex` | 运行该作业的批处理工作线程编号 |
| `computeMicros` | 该作业的 compute 耗时（µs） |
| `renderMicros` | 该作业的渲染耗时（µs） |
| `reserved[8]` | 保留 |

**返回值** — 已复制的记录数（0 以上）。没有新的完成、`batch`·`outCompletions` 为 NULL 或 `capacity` 为 0 以下时为 `0`。

</details>

<details>
<summary><code>st_off_batch_wait</code> — 等待所有作业完成（或超时）</summary>

```c
int st_off_batch_wait(STOFF_Batch* batch, int32_t timeoutMs);
```

**用途** — 代替轮询循环，阻塞等待整个批处理完成。

**调用方式** — 在 start 之后调用。等待结束后完成记录仍留在队列中，因此需接着用 `st_off_batch_poll` 取空（收到记录后才能 fetch·返还上下文）。线程：`[any, blocking]` — 可在任意线程调用，但会阻塞直到完成或超时。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `timeoutMs` | 最长等待时间（ms）。负数 = 无限等待 |

**返回值** — `1` = 所有作业已完成 / `0` = 超时或 `batch` 为 NULL。

</details>

<details>
<summary><code>st_off_batch_remaining</code> — 读取尚未完成的作业数</summary>

```c
int32_t st_off_batch_remaining(const STOFF_Batch* batch);
```

**用途** — 返回用于进度显示或完成判定的剩余作业数。

**调用方式** — 可随时调用。已结束（成功·失败·取消）的作业不计入。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |

**返回值** — 未完成的作业数。`batch` 为 NULL 时为 `0`。

</details>

<details>
<summary><code>st_off_batch_cancel</code> — 取消剩余作业，并对运行中的作业发起取消</summary>

```c
void st_off_batch_cancel(STOFF_Batch* batch);
```

**用途** — 中止整个批处理。尚未开始的作业以取消（`status` 2）结束，运行中作业的上下文会被施加与 `st_off_ir_request_cancel` 相同的取消。

**调用方式** — 可在任意线程调用，不等待即返回。运行中的作业根据中止时机以失败（`status` 1）或取消（`status` 2）结束。之后所有作业的完成记录仍会产生，因此需通过 `st_off_batch_poll` 接收后收回上下文。中止前已完成作业的结果仍可照常 fetch。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄。为 NULL 时不做任何操作 |

**返回值** — 无。

</details>

<details>
<summary><code>st_off_batch_fetch_pressure</code> — 将已完成作业的声压 IR 渲染结果复制到调用方缓冲区</summary>

```c
int32_t st_off_batch_fetch_pressure(STOFF_Batch* batch, int32_t jobIndex, int32_t renderIndex, float* outValues, int32_t capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 取出批处理保管的渲染结果（值数组与元数据）。批处理将结果与上下文分开保管，因此即使在更改或销毁上下文之后也能取出。

**调用方式** — 在通过 `st_off_batch_poll` 收到该作业的完成记录后调用。`outValues` = NULL 时只返回值数量与 `outInfo`，因此先获取大小、分配缓冲区后再次调用。值布局（单声道 / `values[band × bandStride + sample]`）与 info 字段与 `st_off_ir_render_pressure` 相同。已取完的作业用 `st_off_batch_release_job` 释放。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `jobIndex` | 作业索引 |
| `renderIndex` | 该作业的渲染索引（`add_pressure_render*` 的返回值） |
| `outValues` | 结果缓冲区。为 NULL 时只返回数量·info |
| `capacityValues` | `outValues` 的 float 数量 |
| `outInfo` | 结果元数据（`STOfflinePressureIRInfo`，字段参见 `st_off_ir_render_pressure` 条目）。允许 NULL。传入时由调用方填写 `structSize`·`apiVersion` |

**返回值** — 值数量（已复制或所需的 float 数）。失败为 `0`：渲染未完成、失败或已释放时为 `ST_STATUS_UNAVAILABLE`，缓冲区不足为 `ST_STATUS_BUFFER_TOO_SMALL`，`outInfo` 标记错误为 `ST_STATUS_INVALID_ARGUMENT`（均留在批处理状态中）。

</details>

<details>
<summary><code>st_off_batch_release_job</code> — 释放已完成作业的结果内存</summary>

```c
int st_off_batch_release_job(STOFF_Batch* batch, int32_t jobIndex);
```

**用途** — 从批处理中删除已取完作业的渲染结果以回收内存。在大型批处理中，取得结果后立即释放可降低峰值内存使用量。

**调用方式** — 在通过 `st_off_batch_fetch_pressure` 取完该作业的结果后调用。已释放作业的结果不能再 fetch。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `jobIndex` | 作业索引 |

**返回值** — `1` = 已释放 / `0` = 作业尚未完成（批处理状态为 `ST_STATUS_UNAVAILABLE`）或 `batch` 为 NULL。

</details>

<details>
<summary><code>st_off_batch_get_job_error</code> — 复制各作业的失败消息</summary>

```c
int st_off_batch_get_job_error(const STOFF_Batch* batch, int32_t jobIndex, char* outMessage, int32_t capacity);
```

**用途** — 返回完成记录的 `status` 为 1（失败）或 2（取消）的作业的原因（英文）。例：compute 失败·取消、因未注册的对等导致的渲染失败。

**调用方式** — 在收到完成记录后调用。批处理函数调用本身的错误通过 `st_off_batch_get_last_status` / `st_off_batch_get_last_error` 读取。线程：`[any]`。

| 参数 | 说明 |
|---|---|
| `batch` | 批处理句柄 |
| `jobIndex` | 作业索引 |
| `outMessage` | 接收消息的缓冲区。以 NUL 结尾，按 `capacity` 截断 |
| `capacity` | `outMessage` 字节数。1 以上 |

**返回值** — `1` = 有消息（已复制） / `0` = 无消息（成功的作业等）或参数错误。

</details>

</details>

## 线程模型

![Sound-Tracing SDK (C/C++) 线程与数据流](/img/sdk/native-architecture.png)

宿主提供两个线程 — **一个控制线程**（场景、声源、听者、传播调用）和 **音频线程**
（PCM 输入、渲染输出）。其余线程由引擎在上下文内部创建。

### 可调用线程

头文件中每个函数上方都有标签。

| 标签 | 含义 | 代表函数 |
|---|---|---|
| `[control]` | 控制线程。可能持有场景锁，因此不要在音频回调中调用 | 创建、场景、声源、听者 setter，`st_rt_propagate`（PIPELINED 唤醒工作线程后立即返回） |
| `[control, blocking]` | 较长的独占区间 — 不要在游戏循环、音频线程中调用 | `st_rt_build`、`st_rt_render_start` / `stop`、HRIR 加载、延迟环重新分配 |
| `[audio]` | 在宿主音频线程上安全 — 无锁、无分配、无系统调用 | `st_rt_source_write_stream`、`st_rt_render_process` |
| `[any]` | 任意线程（atomic 读取 / 常量） | `st_rt_get_timing`、`st_rt_get_thread_inventory`、`st_rt_get_lane_update_interval` |

请将 `[control]` 调用串行化到 **唯一的专用控制线程**。所有官方包装层都采用这一结构。

### 引擎创建的线程

| 类型 (`STThreadType`) | 数量 | 作用 |
|---|---|---|
| `ST_THREAD_COMPUTE_POOL` | PIPELINED: N − 1（Direct 专用 1 + 通用 N − 2），N = max(3, 预算) · SYNCHRONOUS: N（N = 1 时在调用方内联） | 传播通道、IR 转换、IR 准备 task 全部在此池中运行 |
| `ST_THREAD_AUDIO_RENDER` | 1 (DEVICE · HOST_PULL_BUFFERED) / 0 (HOST_PULL) | 块渲染。BUFFERED 下填充环形缓冲区，回调只做复制 |
| 设备线程 | 1 (仅 DEVICE) | OS 输出设备（WASAPI · CoreAudio · AAudio）驱动。不计入清单 |
| `ST_THREAD_FILE_DECODER` | ≤ 1 | 仅当有 `st_rt_source_set_audio_file` 输入时存在。宿主流输入下没有 |

- **预算**: `STRT_CreateOptions.maxComputeThreads` — `0` = auto = min(性能核心数, 6)。不受环境变量影响。
- **调度器**: `STRT_CreateOptions.scheduler` — `ST_RT_SCHEDULER_PIPELINED`（默认，各通道在工作线程上以独立周期运行）/
  `ST_RT_SCHEDULER_SYNCHRONOUS`（`st_rt_propagate` 在调用线程上完成传播后返回）。
- **合计 (DEVICE 模式)**: PIPELINED = N + 1（+ 文件解码器 1）· SYNCHRONOUS = N + 2（+ 1）。HOST_PULL 去掉渲染、设备线程，
  HOST_PULL_BUFFERED 只保留渲染 1。实测用 `st_rt_get_thread_inventory`（`[any]`，按类型的 atomic 计数器）查看。
- 加速结构（TinyBVH）构建在调用线程上执行，不会创建单独的工作线程。

### 传播通道周期

PIPELINED 的 3 种几何通道可通过 `st_rt_set_lane_update_interval(ctx, lane, ms)` 在 **运行时随时** 更改周期
（`[0, 60000]` ms，超出范围则拒绝）。

| `STPropagationLane` | 默认 | 含义 |
|---|---|---|
| `DIRECT` (0) | 10 ms | 连续执行开始之间的最小间隔 |
| `REFLECTION_DIFFRACTION` (1) | 0 ms | 连续两次执行之间的最小间隔。占传播开销的大部分 — 要收回 CPU 先调高这里（代价是早期反射跟随听者变慢，不会出现静音或丢音） |
| `REVERB` (2) | 4 ms | 执行完成后到下一次执行的最小间隔 |

### 线程属性

`st_rt_set_thread_attributes(threadType, &attr)` 须在 **创建上下文之前** 按类型指定（对已在运行的线程不追溯，
进程全局，与 FMOD `Thread_SetAttributes` 处于同一位置）。逻辑角色（`LANE_*` · `IR_CONVERTER` ·
`AU_PREPARE` · `SCENE_INPUT`）没有专用线程，因此池策略设置在 `ST_THREAD_COMPUTE_POOL` 上。

```c
STThreadAttributes attr = { sizeof attr, ST_ABI_VERSION };
attr.priority = ST_THREAD_PRIORITY_ABOVE_NORMAL;            // DEFAULT · LOW · BELOW_NORMAL · NORMAL · ABOVE_NORMAL · HIGH · TIME_CRITICAL
attr.flags    = ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES;    // 或 PREFER_EFFICIENCY_CORES（两者同时开启则拒绝）
attr.affinityMask = 0;                                      // 逻辑处理器位掩码，仅 Windows 遵守。0 = 不指定
st_rt_set_thread_attributes(ST_THREAD_COMPUTE_POOL, &attr);
st_rt_set_thread_attributes(ST_THREAD_AUDIO_RENDER, &attr);
```

### 输出模式与延迟

| `renderOutputMode` | 引擎线程 | 宿主回调所做的事 | 延迟 |
|---|---|---|---|
| `DEVICE` (0) | 渲染 1 + 设备 1 | 无 — 引擎直接打开设备 | 设备缓冲区 |
| `HOST_PULL` (1) | 无 | `st_rt_render_process` 在回调内渲染块 | 0 块（渲染开销落在回调上） |
| `HOST_PULL_BUFFERED` (2) | 渲染 1 | 仅从环形缓冲区复制（≈ memcpy） | 环 ≈ 3 块（`st_rt_render_get_latency_frames`） |

三种模式都必须调用 `st_rt_render_start(useHrtf)`（HOST_PULL 系列不创建线程、设备，只设置渲染允许标志和
双耳/扬声器选择）。`hostSampleRate ≠ 0` 时，采样率转换由引擎在渲染线程（BUFFERED）或回调（HOST_PULL）中完成。
UE · Unity · FMOD · Wwise 插件全部使用 BUFFERED。

## 平台说明

- **Android**: API 28 及以上。将各 ABI 的 `.so` 放入应用的库文件夹。
- **iOS**: 单个静态库（`libsoundtracing_static.a`）同时包含实时与离线。按 device / simulator 分别链接。
- **Web**: `SoundTracingRealtime.mjs/.wasm` 是 pthreads 构建，页面和 Worker 响应需要 `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp`。`[control]` 调用只在一个 Worker 中进行（主线程上的阻塞调用会因
  `Atomics.wait` 限制而失败），音频通过共享环形缓冲区与 AudioWorklet 交换。若需要 TypeScript facade，请使用 [Web SDK](./web.md)。
- **宿主采样率**: 引擎内部为 44.1 kHz，指定 `hostSampleRate` 后由引擎转换输入与输出。

## 下一步

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD 插件](./fmod.md) · [Wwise 插件](./wwise.md)
