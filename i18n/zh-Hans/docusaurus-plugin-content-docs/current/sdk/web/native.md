---
title: Native API
description: soundtrace.js 的低层入口 `@exarionai/soundtrace.js/native` — WASM 模块加载器、堆辅助工具、Realtime/Offline 适配器、EQ。
---

# Native API

`@exarionai/soundtrace.js/native` 公开了 facade 在内部使用的 Sound-Tracing SDK 模块加载器和适配器。
普通应用请使用 [Facade API](./facade.md)。这一层直接遵循 Sound-Tracing SDK C ABI 约定
（包内随附的 `core/Include/SimpleST/ABI/*.h`），版本间兼容性保证弱于 facade。

```ts
import {
  SimpleSTRealtime,
  loadRealtimeModule, loadOfflineModule, analyzeScene,
  Heap, packMaterial, validateMaterial,
  ST_ABI_VERSION, ST_FREQUENCY_BANDS, ST_SAMPLE_RATE, layout,
  type SimpleSTModule, type SimpleSTMaterial, type SimpleSTDiagnostics, type SimpleSTFeatures, type SimpleSTSceneSnapshot,
} from '@exarionai/soundtrace.js/native';
```

## 支持范围

- 所有 Sound-Tracing SDK `[control]` 调用只在**一个 Worker** 中进行。facade 设有专用 control Worker，
  只在那里操作引擎。
- 在主线程调用 `st_rt_propagate` 等阻塞入口会因 `Atomics.wait` 被阻止而失败。

## 组成

| 名称 | 作用 |
|---|---|
| `loadRealtimeModule(baseUrl)` | 加载 `SimpleSTRealtime.mjs` + `.wasm`（pthreads）并返回 `SimpleSTModule` |
| `loadOfflineModule(baseUrl)` | 加载 `SimpleSTOffline.mjs`（单线程）。仅用于 IR 分析 |
| `Heap` | 向 WASM 堆读写 POD 的辅助工具。包含带 `structSize`/`apiVersion` 戳的结构体分配（`stamped`） |
| `layout` | `STRT_CreateOptions`、`STMaterial`、`STRenderOptions`、`STTiming`、`STSceneStats`、`STProcessStats`、`STIrStats` 等的偏移/大小 |
| `packMaterial` / `validateMaterial` | 把 9 频段 R/A/T/scattering 打包为 `STMaterial` 并校验 `R+A+T=1` |
| `SimpleSTRealtime` | 拥有一个听者和共享渲染器的适配器。把 facade 命令转换为 `st_rt_*` 调用。`features`表示引擎同时具备 capability 位和 export 的可选功能（剪辑、trigger、播放控制、true-peak 限制器、主增益） |
| `analyzeScene(module, snapshot, …)` | 把场景快照复制到 Offline 上下文并计算 Raw IR / 压力 IR |
| `ST_ABI_VERSION` / `ST_FREQUENCY_BANDS` / `ST_SAMPLE_RATE` | `6` / `9` / `44100` |

## `SimpleSTRealtime`

这是 facade 的 control Worker 所使用的适配器。直接使用时，在 Worker 内按以下顺序调用。

```ts
const M = await loadRealtimeModule(coreBaseUrl);
const rt = new SimpleSTRealtime(M, startupOptions);   // st_rt_create、关闭等响度补偿、注册材质表、应用 Hybrid

rt.command({ type: 'createMesh', handle, state });     // st_rt_mesh_create + st_rt_object_create_q
rt.command({ type: 'createSource', handle, state });   // st_rt_source_create + 应用质量预设
rt.attachStream(handle);                               // st_rt_source_attach_stream（单声道）
rt.sourcePose(handle, cache); rt.listenerPose(cache); rt.meshPose(handle, pose);

const validPaths = rt.frame();                         // st_rt_build[_dynamic] + st_rt_propagate
rt.writeStream(handle, monoSamples);                   // [audio] st_rt_source_write_stream
const stereo = rt.render(frames);                      // [audio] st_rt_render_process

const diag = rt.diagnostics();                         // SimpleSTDiagnostics
rt.reset(); rt.dispose();
```

- `setQuality(tier)` 一次性设置听者 guide ray、声源 transport ray 和反射深度
  （`fast` 8×8/4，`balanced` 16×16/6，`quality` 24×24/8）。
- 声源增益是压力值，传入引擎时为 `st_rt_source_set_energy(gain²)`。
- `'direct'` 路径门控同时开关 Direct 和 Transmission。
- 渲染选项变更（`useDoppler`、`useLimiter`、`diffuseEnabled`）会覆盖 `STRenderOptions` 的对应字段，
  但始终保持 `reserved0 = 1`（Hybrid）。如果 Hybrid 被解除，`diagnostics()` 会抛出异常。
- 每次渲染启动时显式设置输出级：关闭限制器（`useLimiter: true` 时为 true-peak），主增益 0 dB。
- 创建上下文后立即关闭引擎开启的等响度补偿（`features.loudnessCompensation` 时）。
- 听者方向由 forward/up 构造的四元数传给 `st_rt_listener_set_orientation_q`，从而保留 roll。

## 诊断快照

```ts
interface SimpleSTDiagnostics {
  engine: 'Sound-Tracing SDK'; abiVersion: number; version: string;
  scheduler: 'synchronous' | 'pipelined'; earlyReflectionMode: 'hybrid'; spatializer: number;
  scene:  { meshes; objects; sources; triangles };
  timing: { propagationMs; directMs; reflectionDiffractionMs; reverbMs; irMs; renderMs };
  render: { blockSequence; activeSources; exactTaps; sendTaps; totalUs } | null;
  ir:     { publishSequence; exactTaps; bedCells; sendTaps } | null;
  audioTransport?: { outputUnderrunFrames; inputDroppedFrames; streams: Array<{ handle; queuedFrames; capacityFrames; droppedFrames; underrunFrames }> };
  features?: SimpleSTFeatures;
  output?: { limiter; limiterType; limiterLatencyFrames; masterGainDb; diffuseRain; eq? };  // 已应用的输出级（eq = 输出 EQ）
  inputs?: { live; clip };                                                       // 实时/剪辑声源数
}
```

facade 的 `debugSnapshot().simplest` 和 `getStatistics().simplest` 返回同一个对象。

## 音频约定

- 引擎内部采样率为 44.1 kHz，把 `AudioContext.sampleRate` 填入 `STRT_CreateOptions.hostSampleRate`，
  输入和输出都由引擎转换。
- 声源输入为单声道 float PCM（`st_rt_source_write_stream`），输出为交错立体声
  （`st_rt_render_process`）。输出模式为 `HOST_PULL_BUFFERED`，AudioWorklet 从共享环形缓冲复制。
- 并发流槽位为 64 个。超出的声源创建会失败。

## EQ

Sound-Tracing SDK 的参数 EQ 可在两个位置应用。

- **声源 EQ** — 在引擎频段拆分之前作用于声源信号本身。该声源的直达声、反射、绕射、混响都会得到相同的音色。
- **输出 EQ** — 在渲染末端（主增益之前）作用于整个 Sound-Tracing SDK 混音。

滤波器类型为 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6 种（切滤波固定为 12 dB/oct），
范围为频率 20 ~ 20,000 Hz，增益 ±24 dB（仅 Peaking·搁架），Q 0.1 ~ 30（搁架最多 3），前级增益 −48 ~ +12 dB。
默认关闭，关闭时不调用引擎，因此输出与没有 EQ 时相同。只发送变化的值，引擎以
20 ms 交叉淡化过渡。

| 位置 | 引擎调用 | 支持确认 |
|---|---|---|
| 声源 EQ | `st_rt_source_set_parametric_eq`（清除用 `st_rt_source_set_eq(ctx, id, NULL)`） | `features.sourceParametricEq` |
| 输出 EQ | `st_rt_render_set_parametric_eq`（关闭用 `enabled = 0`） | `features.outputParametricEq` |

`SimpleSTRealtime` 适配器把 facade 的 `source.setEq` / `sound.setOutputEq` 命令转换为这两个调用，在没有这两个 feature 的
内核上会拒绝。已应用的输出 EQ 位于 `diagnostics().output.eq`。

## 相关文档

- [Web SDK 概览](../web.md)
- [Facade API](./facade.md)
