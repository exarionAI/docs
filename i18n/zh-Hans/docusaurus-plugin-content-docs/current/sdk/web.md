---
title: Web
description: 安装 soundtrace.js WebAssembly SDK，并使用 HRTF 模式、质量预设与 CPU/MT/WebGPU 后端。
---

# Web SDK

**soundtrace.js** 是在浏览器中使用 [STCoreV2](../core/stcorev2.md) 的
TypeScript/WebAssembly SDK。它将渲染场景中的网格、材质、声源和监听器连接到
Sound Tracing 场景，并向 Web Audio 图提供空间音频输出。

## 当前 SDK 要点

| 项目 | 推荐流程 |
|---|---|
| HRTF | 默认使用 core 内置 HRIR 表（无需加载）；参数化方向渲染调用 `loadHrtf('parametric')` |
| 后端 | 选择 `Single Thread`、`Multi Thread` 或 `WebGPU` |
| 质量 | 选择 `Fast`、`Balanced` 或 `Quality` 预设 |
| 材质 | 通过名称引用材质预设：`concrete`、`wood`、`glass`、`metal` 等 |
| 底层参数 | 让预设统一管理射线分辨率、深度和渲染预算 |

## 要求

- Node.js 20 或更高版本
- 支持 Web Audio API 和 AudioWorklet 的现代浏览器
- `Multi Thread` 需要 COOP/COEP 和 `crossOriginIsolated === true`
- `WebGPU` 需要提供 `navigator.gpu` 的浏览器和 GPU
- 已授权的 SDK 发行包

## 安装

`soundtrace.js` 是通过授权协议提供的私有包 `@exarionai/soundtrace.js`。拿到发行版
之后，直接使用下面示例中的 import 说明符即可。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

该包自带 WASM core（`core/st`、`core/mt`）以及材质和 HRTF 资源，并在运行时直接
fetch。若打包器对这部分模块图做预打包，worker 与 wasm 加载会失败，因此在 Vite 中
需要将该包排除在依赖预打包之外。

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

如需自行托管 core 和资源，可用 `coreBaseUrl`、`assetBaseUrl` 指定 URL，详见
[Facade API](./web/facade.md)。

## 快速开始

请在用户点击或触摸事件处理函数中运行。

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});

const room = sound.addMesh({
  vertices,
  indices,
  material: 'concrete',
});

const source = sound.addSource({
  position: [2, 1.5, -1],
  gain: 1,
});

sound.listener.setPose({
  position: [0, 1.7, 0],
});

await sound.update(0);
```

Three.js 相机朝向 `-Z`，因此应使用上面的坐标基。如果坐标基错误，HRTF 的左右或前后
方向会被镜像。

## 选择 HRTF

core 在创建每个 listener 时就已装载 min-phase HRIR 表，因此即使完全不调用
`loadHrtf()`，双耳渲染也能工作 —— 这就是默认路径。

若要切换到精简后的 KU100 parametric 表，需要显式加载。

```ts
await sound.loadHrtf('parametric');
```

| 调用 | 使用的表 | 额外资源 |
|---|---|---|
| （不调用） | core 内置 min-phase HRIR | 无 |
| `loadHrtf('parametric')` | KU100 parametric | `KU100_bprime.bin` |
| `loadHrtf('convolution')` | core 内置 HRIR（切换为最近邻查找） | 无 |
| `loadHrtf('steamaudio')` | SADIE H12 HRIR | `sadie_h12_steamaudio.bin` |

要使用应用自己的表，把 URL、`ArrayBuffer` 或 typed array 作为第二个参数传入。

```ts
await sound.loadHrtf('parametric', '/assets/my-hrtf.bin');
```

:::note
core 中确实存在以 8 频段幅度加 ITD 渲染的 `Band8` 空间化器，但 facade 无法选择它：
`setRenderOptions()` 会拒绝 `hrtfMode` 键，只能通过 native 的 `setHrtfMode()` 切换。
:::

## 选择后端

| 模式 | 代码 | 要求 | 行为 |
|---|---|---|---|
| Single Thread | `mode: 'single_thread'` | 普通浏览器托管 | 最简单的 CPU 路径 |
| Multi Thread | `mode: 'multi_thread'` | COOP/COEP 和 SharedArrayBuffer | 在 Worker 中运行的 MT CPU 路径 |
| WebGPU | `mode: 'gpu'` | WebGPU | 尝试 GPU 传播，失败时回退到 CPU |

### Multi Thread 部署响应头

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

专用 Worker 拥有 MT 引擎会话，主线程保留 UI 和 Web Audio 所有权。Transform 更新使用
快速状态路径，创建／删除、材质和网格操作使用有序命令路径。

### WebGPU

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'gpu',
  quality: 'balanced',
});
```

当前自动 WebGPU 路径与 Single Thread 核心配套使用。不要同时强制
`thread: 'mt'` 和 `mode: 'gpu'`。GPU 初始化失败时，SDK 会继续使用 CPU。

## 质量预设

| 预设 | 推荐用途 |
|---|---|
| `fast` | 移动设备、低功耗设备、大量同时声源 |
| `balanced` | 普通桌面平台和产品集成的默认选择 |
| `quality` | 高端桌面平台和质量优先演示 |

```ts
sound.setQuality('quality');
```

预设会同时协调传播和 HRTF／Diffuse 渲染预算。性能不足时，应先按
`quality → balanced → fast` 降级，再考虑编辑单独的射线属性。

## 连接 Web Audio

```ts
const player = audioContext.createBufferSource();
player.buffer = decodedBuffer;
player.loop = true;

const spatialNode = await source.play(player);
spatialNode.connect(sound.output).connect(audioContext.destination);
player.start();
```

应用拥有 `AudioContext` 和播放节点。soundtrace.js 提供每个声源的空间节点和主输出。

## 更新和清理

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25] });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);

sound.dispose();
await audioContext.close();
```

## 材质预设

网格接受材质名称或索引。默认材质表共 22 种，名称通过下列 10 个 canonical name 解析。

| Canonical name | 可识别别名（部分） |
|---|---|
| `concrete` | cement、beton、pavement、sidewalk |
| `wood` | plank、timber、oak、pine、bamboo |
| `glass` | window、mirror、crystal |
| `metal` | steel、iron、aluminum、copper、brass |
| `brick` | tile、ceramic、terracotta |
| `fabric` | cloth、textile、carpet、curtain |
| `plastic` | rubber、vinyl、pvc |
| `water` | liquid、pool |
| `grass` | vegetation、leaves、lawn |
| `sand` | dirt、gravel、soil、mud |

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',   // metal 的别名
});
```

:::warning
表中不存在的名称不会抛出异常，而是静默回退到默认材质（索引 `0`，`concrete`）。
即使拼错也仍会出声，所以要确认材质是否按预期生效，请使用上表中的名称。
:::

请先使用随包提供的预设；只有在确实需要自定义声学材质时，才直接编辑 8 频段的
reflection/absorption/transmission 数值。

## 故障排除

| 症状 | 检查项 |
|---|---|
| 没有声音 | 在用户手势中先调用 `AudioContext.resume()` |
| MT 启动失败 | 检查 COOP/COEP、SharedArrayBuffer 和 `crossOriginIsolated` |
| GPU 未启用 | 检查 `navigator.gpu` 和硬件加速；CPU 回退是有效状态 |
| 方向被镜像 | 检查渲染器对应的 `coordinateBasis` |
| 材质似乎不起作用 | 对照上面的 canonical name/别名表检查名称；未知名称会回退到默认材质 |
| core/资源返回 404 | 检查打包器是否对该包做了预打包，以及 `coreBaseUrl`、`assetBaseUrl` 是否正确 |
| 性能较低 | 在深入调优前降低质量预设并关闭路径可视化 |

## 下一步

- [SDK 概览](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
