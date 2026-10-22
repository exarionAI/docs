---
title: Native API
description: soundtrace.js 的低层入口 `@exarionai/soundtrace.js/native` — SimpleST WASM 模块加载器、堆辅助工具、Realtime/Offline 适配器。
---

# Native API

`@exarionai/soundtrace.js/native` 公开了 facade 在内部使用的 SimpleST 模块加载器和适配器。
普通应用请使用 [Facade API](./facade.md)。这一层直接遵循 SimpleST C ABI 约定
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

:::warning 变更
STCoreV2 时期的 `SoundScene` / `SoundListener` / `SoundMesh` / `SoundObject` / `SoundCollider` /
`MaterialTable` / `Propagator` / `Diagnostics` 类和 `./internal` entry 已在 1.0.0 中移除。
当前的低层约定是 SimpleST ABI 6 头文件和下面的适配器。
:::

- 所有 SimpleST `[control]` 调用只在**一个 Worker** 中进行。facade 设有专用 control Worker，
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
| `SimpleSTRealtime` | 拥有一个听者和共享渲染器的适配器。把 facade 命令转换为 `st_rt_*` 调用。`features`（1.1.0）表示引擎同时具备 capability 位和 export 的可选功能（剪辑、trigger、播放控制、true-peak 限制器、主增益） |
| `analyzeScene(module, snapshot, …)` | 把场景快照复制到 Offline 上下文并计算 Raw IR / 压力 IR |
| `ST_ABI_VERSION` / `ST_FREQUENCY_BANDS` / `ST_SAMPLE_RATE` | `6` / `9` / `44100` |

## `SimpleSTRealtime`

这是 facade 的 control Worker 所使用的适配器。直接使用时，在 Worker 内按以下顺序调用。

```ts
const M = await loadRealtimeModule(coreBaseUrl);
const rt = new SimpleSTRealtime(M, startupOptions);   // st_rt_create、注册材质表、应用 Hybrid

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
  不依赖 SimpleST 2.18 创建后的默认值（true-peak 限制器开启）。

## 诊断快照

```ts
interface SimpleSTDiagnostics {
  engine: 'SimpleST'; abiVersion: number; version: string;
  scheduler: 'synchronous' | 'pipelined'; earlyReflectionMode: 'hybrid'; spatializer: number;
  scene:  { meshes; objects; sources; triangles };
  timing: { propagationMs; directMs; reflectionDiffractionMs; reverbMs; irMs; renderMs };
  render: { blockSequence; activeSources; exactTaps; sendTaps; totalUs } | null;
  ir:     { publishSequence; exactTaps; bedCells; sendTaps } | null;
  audioTransport?: { outputUnderrunFrames; inputDroppedFrames; streams: Array<{ handle; queuedFrames; capacityFrames; droppedFrames; underrunFrames }> };
  features?: SimpleSTFeatures;                                                   // 1.1.0
  output?: { limiter; limiterType; limiterLatencyFrames; masterGainDb; diffuseRain };  // 1.1.0，已应用的输出级
  inputs?: { live; clip };                                                       // 1.1.0，实时/剪辑声源数
}
```

facade 的 `debugSnapshot().simplest` 和 `getStatistics().simplest` 返回同一个对象。
旧 STCore 的 profile / memory / ray 统计和逐声源 `ExaRenderStats` 已不存在。

## 音频约定

- 引擎内部采样率为 44.1 kHz，把 `AudioContext.sampleRate` 填入 `STRT_CreateOptions.hostSampleRate`，
  输入和输出都由引擎转换。
- 声源输入为单声道 float PCM（`st_rt_source_write_stream`），输出为交错立体声
  （`st_rt_render_process`）。输出模式为 `HOST_PULL_BUFFERED`，AudioWorklet 从共享环形缓冲复制。
- 并发流槽位为 64 个。超出的声源创建会失败。

## 相关文档

- [Web SDK 概览](../web.md)
- [Facade API](./facade.md)
- [SimpleST 引擎](../../core/simplest.md) — C ABI 完整约定
