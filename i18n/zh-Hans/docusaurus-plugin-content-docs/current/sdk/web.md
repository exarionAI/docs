---
title: Web
description: soundtrace.js 1.0.0 — SimpleST ABI 6 WebAssembly SDK 的安装、部署要求、HRTF、质量预设、材质与故障排除。
---

# Web SDK

**soundtrace.js** 是在浏览器中使用 [SimpleST](../core/simplest.md) 的 TypeScript/WebAssembly SDK。
它把 Three.js 等渲染场景中的网格、材质、声源和听者连接到 Sound Tracing 场景，
并向 Web Audio graph 提供空间化的立体声输出。

从 1.0.0 起，引擎由 STCoreV2 换成了 **SimpleST 2.12.0 / ABI 6**。`SoundTrace`、`Source`、`Mesh`、
`Listener` facade 保持不变，但后端、HRTF、材质和选项约定发生了变化。完整选项和实体 API 见
[Facade API](./web/facade.md)，低层 SimpleST 模块访问见 [Native API](./web/native.md)。

![soundtrace.js 架构](/img/web/architecture.png)

## 当前 SDK 要点

| 项目 | 当前行为 |
|---|---|
| 引擎 | SimpleST Realtime（pthreads WASM）+ Offline（单线程，仅用于 IR 分析） |
| 运行模式 | `single_thread`（同步传播）/ `multi_thread`（管线传播）。**两者都使用专用 Worker + pthread WASM** |
| 早期反射 | 始终为 **Hybrid**。渲染启动、HRTF 更改、reset 之后也会重新应用 |
| HRTF | 内置 MIT KEMAR（`'mit-kemar'`），随包 SADIE II D2（`'sadie-d2'`） |
| 质量 | `fast` / `balanced` / `quality` — 同时设置听者与声源射线网格和反射深度 |
| 材质 | 9 频段（63 Hz ~ 16 kHz）SoundTrace 游戏材质 22 种，按名称、别名或索引指定 |
| 输出 | 每个声源单声道输入，听者渲染器混合为一路立体声（`sound.output`） |
| GPU | 无。`mode: 'gpu'`、`enableGpu()` 报错 |

## 要求

- Node.js 20 或更高版本（构建工具），推荐最新的 Chromium 系浏览器
- HTTPS 或 localhost
- AudioWorklet、SharedArrayBuffer、**cross-origin isolation** — ST/MT 都需要
  （没有非隔离回退）
- 已授权的 SDK 发行包（vendor ZIP 或 npm tgz）

## 安装

`soundtrace.js` 是通过授权协议提供的私有包 `@exarionai/soundtrace.js`。发行包有两种形式。

| 形式 | 文件 | 安装 |
|---|---|---|
| vendor 目录树 | `soundtrace-js-release-vendor.zip`（根目录 `sdk/`） | 解压到静态路径并提供服务。随附的 `install.py` 校验哈希后安装到 `vendor/sound-tracing/sdk` |
| npm 包 | `exarionai-soundtrace.js-1.0.0.tgz` | `npm install /absolute/path/exarionai-soundtrace.js-1.0.0.tgz` |

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

该包自带 WASM 核心（`core/SimpleSTRealtime.mjs/.wasm`、`core/SimpleSTOffline.mjs`）以及材质和 HRTF
资源，并在运行时 fetch。若打包器对这部分模块图做预打包，Worker 与 WASM 加载会失败，
因此在 Vite 中需要将其排除在预打包之外，并以静态 vendor 目录树提供。

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

若自行托管核心和资源，可用 `coreBaseUrl`、`assetBaseUrl` 选项指定 URL。
`.mjs` 以 JavaScript、`.wasm` 以 `application/wasm` MIME 提供服务。

### 部署响应头

页面响应和 **Worker 脚本响应都**必须带有以下响应头。

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## 快速开始

下面的代码必须在用户点击或触摸事件中运行。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',              // 'st' = 同步传播，'mt' = 管线传播（推荐）
  quality: 'balanced',
  earlyReflectionMode: 'hybrid',
  coordinateBasis: {         // Three.js：相机朝向 -Z
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
sound.output.connect(audioContext.destination);

const room = sound.addMesh({ vertices, indices, material: 'concrete' });
const source = sound.addSource({ position: [2, 1.5, -1], gain: 1 });
sound.listener.setPose({ position: [0, 1.7, 0] });

const player = audioContext.createBufferSource();
player.buffer = decodedMonoBuffer;
player.loop = true;
await source.play(player);     // 输入捕获节点。输出为静音 — 声音来自 sound.output
await sound.update(0);
player.start();
```

SimpleST 的坐标系与 Unity 相同，为 `+Z` forward。Three.js 这类朝向 `-Z` 的渲染器必须传入上面的
`coordinateBasis`，左右和前后才会正确。

## 运行模式

| 选项 | 传播 | 说明 |
|---|---|---|
| `thread: 'st'` / `mode: 'single_thread'` | 同步（SYNCHRONOUS） | `update()` 在传播完成后返回。默认计算预算 1 |
| `thread: 'mt'` / `mode: 'multi_thread'` | 管线（PIPELINED） | Direct / Reflection-Diffraction / Reverb lane 在工作线程中独立运行。默认预算 3 |

两种模式都由专用 Worker 拥有引擎会话，使用同一份 pthread WASM。发行版的 pthread pool 为 5，
`propagationThreadCount` 为 1 ~ 5。主线程只保留 UI 和 Web Audio graph，位置更新通过共享内存 lane
传递，创建/删除/材质变更通过保证顺序的命令路径传递。

## 选择 HRTF

| 调用 | 表 | 额外资源 |
|---|---|---|
| （不调用） | 内置 MIT KEMAR（SDK 默认）。`setOutputMode('speaker')` 切换为立体声声像 | 无 |
| `loadHrtf('mit-kemar')` 或 `'convolution'` | 引擎内置 MIT KEMAR 128 tap | 无 |
| `loadHrtf('sadie-d2')` 或 `'steamaudio'` | SADIE II D2 KEMAR 8,802 方向 256 tap | `SADIE_D2_44K_16bit_256tap.hrtfbin` |

旧的 KU100 parametric / convolution / SADIE H12 表和 `Band8` 模式已不存在。
`loadHrtf('parametric')` 会报错。

```ts
await sound.loadHrtf('sadie-d2');
sound.listener.setOutputMode('speaker');   // 'hrtf'（默认）| 'speaker'（立体声声像）
```

## 质量预设

| 预设 | 听者 guide ray | 声源 transport ray | 反射深度 | 用途 |
|---|---|---|---|---|
| `fast` | `8 × 8` | `8 × 8` | 4 | 移动端、大量同时声源 |
| `balanced`（默认） | `16 × 16` | `16 × 16` | 6 | 桌面默认 |
| `quality` | `24 × 24` | `24 × 24` | 8 | 质量优先演示 |

```ts
sound.setQuality('quality');
```

`'speed'`、`'middle'` 分别是 `fast`、`balanced` 的待废弃别名。出现性能问题时，先按
`quality → balanced → fast` 的顺序降级，再考虑调整单独的射线数量。

## 材质

网格可以指定材质名称、别名或索引。默认表是 SoundTrace 游戏材质 22 种，与 Unity SDK 使用同一张表、
同一套索引。这些是游戏用预设，不是测量数据，所有值都是 9 频段 R/A/T/scattering。转换方式：保留原
8 频段（63 Hz ~ 8 kHz）的反射 R 和透射 T，吸收 A = 1 − R − T，16 kHz 频段重复 8 kHz 的值，
scattering 在 9 个频段上取相同值。

名称和别名不区分大小写。材质名称保留原始拼写（`Sherdded-woodFiberborad`）。

| 索引 | 材质名称 | 别名 |
|---:|---|---|
| 0 | `Concrete` | `cement`, `콘크리트` |
| 1 | `Fabric` | `cloth`, `carpet`, `curtain`, `천`, `카펫` |
| 2 | `Wood` | `timber`, `나무`, `목재` |
| 3 | `Brick` | `bricks`, `벽돌` |
| 4 | `ConcreteBlock` | `concrete block`, `cinder block`, `블록` |
| 5 | `Glass` | `window`, `유리`, `창문` |
| 6 | `Gravel` | `자갈` |
| 7 | `GypsumBoard` | `gypsum`, `drywall`, `석고보드` |
| 8 | `Linoleum,RubberOrAsphaltTile` | `linoleum`, `rubber`, `tile`, `vinyl`, `리놀륨`, `고무` |
| 9 | `Marble` | `대리석` |
| 10 | `Plaster` | `회반죽`, `플라스터` |
| 11 | `Plywood` | `합판` |
| 12 | `Sherdded-woodFiberborad` | `shreddedWoodFiberboard`, `woodFiberboard`, `fiberboard`, `목모보드` |
| 13 | `Snow` | `눈` |
| 14 | `Soil` | `dirt`, `earth`, `ground`, `흙` |
| 15 | `Steel` | `metal`, `iron`, `철`, `금속` |
| 16 | `Stone` | `rock`, `돌` |
| 17 | `WaterSurface` | `water`, `물` |
| 18 | `TunableAbsorber` | `absorber` |
| 19 | `LowVarianceTarget` | — |
| 20 | `ConcreteBlockPainted` | `painted concrete block` |
| 21 | `FiberglassReinforcedPlastic` | `fiberglass`, `frp` |

别名以包内的 `assets/soundMaterialAlias.json` 为准，材质数值在 `assets/soundMaterial.json`。

```ts
sound.addMesh({ vertices, indices, material: 'GypsumBoard' });
sound.addMesh({ vertices, indices, material: '유리' });   // → Glass (5)
```

:::warning
表中不存在的名称不会抛出异常，而是静默回退到默认材质（`defaultMaterialType = 0`，`Concrete`）。
旧文档中的 `BRAS_*` 名称已不在表中，因此也会变成 `Concrete`。要确认材质是否按预期生效，请准确使用
上面的名称或别名。
:::

若要自定义材质，请传入四组各 9 个值，每个频段满足 `R + A + T = 1`（容差 0.001）。
数组长度不是 9 时会报错。

## 连接 Web Audio

```ts
const node = await source.play(player);  // AudioWorkletNode：用于输入捕获，输出静音
sound.output.connect(audioContext.destination);
```

`soundtrace.js` 不会创建 `AudioContext`。应用拥有 context 和播放节点，SDK 提供每个声源的
**输入捕获节点**和唯一的**听者主输出**（`sound.output`）。逐声源的输出效果器必须移到
`sound.output` 之后。

## 更新与清理

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25], orientation: camera.quaternion.toArray() });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);   // 返回本帧的有效路径数

source.dispose();
sound.dispose();
await audioContext.close();
```

## 诊断与 IR 分析

```ts
const snap = await sound.debugSnapshot();
snap.simplest.timing;   // { propagationMs, directMs, reflectionDiffractionMs, reverbMs, irMs, renderMs }
snap.simplest.scene;    // { meshes, objects, sources, triangles }
snap.simplest.render;   // { blockSequence, activeSources, exactTaps, sendTaps, totalUs }

const irs = await sound.getIRs();                               // 9 频段 early path IR
const h = await sound.renderMonoImpulseResponse(source, 2.0);   // 44.1 kHz 单声道压力 IR（最长 30 s）
```

IR 分析在独立的 Offline Worker 中复制场景进行计算，因此实时输出不会中断。
`renderMonoImpulseResponse` 得到的是压力 IR，而不是 HRTF/Hybrid 输出的录音。

## 演示

在公开演示仓库 [Sound-tracing](https://github.com/exarionAI/Sound-tracing) 中可以运行 Shoebox room、
Multi-room occlusion、Runtime capability 示例。

![Shoebox room 演示](/img/web/demo-shoebox.png)

![Multi-room occlusion 演示](/img/web/demo-multiroom.png)

## 故障排除

| 症状 | 检查项 |
|---|---|
| 没有声音 | 是否在用户手势中先调用了 `AudioContext.resume()`，是否把 `sound.output` 连接到了 destination |
| `SoundTrace.create` 因 cross-origin isolation 错误被拒绝 | 页面和 Worker 响应的 COOP/COEP 响应头，`crossOriginIsolated === true`（ST 也需要） |
| `mode: 'gpu'` / `enableGpu()` 报错 | SimpleST Web 仅支持 CPU。移除该选项 |
| `transmissionModel: 'solid'`、`defaultMeshBuild`、`hrtfQuality` 等被拒绝 | STCoreV2 专用选项。参见 [Facade API](./web/facade.md) 的拒绝列表 |
| 方向听起来相反 | 与渲染器坐标系匹配的 `coordinateBasis`（`-Z` forward 时必需） |
| 材质似乎不起作用 | 名称是否在材质表/别名中（否则回退为混凝土） |
| 核心/资源 404 | 打包器预打包排除、`coreBaseUrl`、`assetBaseUrl`、`.wasm` MIME |
| 性能不足 | 降低质量预设并使用 `thread: 'mt'`，关闭路径可视化 |

## 下一步

- [Facade API](./web/facade.md) — 创建选项、场景/声源/网格 API、生命周期、被拒绝的旧选项
- [Native API](./web/native.md) — SimpleST 模块加载器与低层适配器
- [Performance Guide](./performance.md)
