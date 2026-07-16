---
title: Web
description: 安装 soundtrace.js WebAssembly SDK，并使用 HRTF 模式、质量预设、CPU/MT/WebGPU 后端和官方一体化演示。
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# Web SDK

**soundtrace.js** 是在浏览器中使用 [STCoreV2](../core/stcorev2.md) 的
TypeScript/WebAssembly SDK。它将渲染场景中的网格、材质、声源和监听器连接到
Sound Tracing 场景，并向 Web Audio 图提供空间音频输出。

## 当前 SDK 要点

| 项目 | 推荐流程 |
|---|---|
| HRTF | 轻量路径使用 `Band8`，测量型方向渲染使用 `Parametric` |
| 后端 | 选择 `Single Thread`、`Multi Thread` 或 `WebGPU` |
| 质量 | 选择 `Fast`、`Balanced` 或 `Quality` 预设 |
| 材质 | 使用 `Concrete`、`Steel`、`Marble`、`Snow`、`Soil` 等预设 |
| 底层参数 | 让预设统一管理射线分辨率、深度和渲染预算 |

## Web 演示

嵌入式演示来自
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing) 的最新构建，
在一个应用中包含三个场景。

| 场景 | 演示内容 |
|---|---|
| Capability | WebAssembly、AudioWorklet、SharedArrayBuffer 和 WebGPU 支持 |
| Shoebox | 声源／监听器移动、材质、反射路径和质量预设 |
| Multiroom | 多声源、门、遮挡和房间之间的传播 |

<iframe
  title="Sound-tracing.js 一体化演示"
  src={useSharedStaticUrl('/demos/three-basic/')}
  style={{width: '100%', height: '576px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

使用顶部导航切换场景。评估空间音频时建议使用耳机和较新的 Chrome。

## 要求

- Node.js 20 或更高版本
- 支持 Web Audio API 和 AudioWorklet 的现代浏览器
- `Multi Thread` 需要 COOP/COEP 和 `crossOriginIsolated === true`
- `WebGPU` 需要提供 `navigator.gpu` 的浏览器和 GPU
- 已授权的 SDK 发行包

## 安装授权 SDK

评估版和授权版可能以 ZIP 形式提供。官方演示使用以下目录约定：

```text
your-project/
└─ vendor/
   └─ sound-tracing/
      └─ sdk/
         ├─ index.js
         ├─ core/
         │  ├─ st/
         │  └─ mt/
         └─ assets/
```

将 ZIP 根目录中的 `sdk/` 精确放置到
`vendor/sound-tracing/sdk/`。不使用 `.env.local`。开发时，仓库内的运行时清单会解析：

```text
/vendor-runtime/sound-tracing/sdk/index.js
```

Vite 开发服务和生产复制规则以仓库中的
[`vite.config.ts`](https://github.com/exarionAI/Sound-tracing/blob/dev/vite.config.ts)
为准。

## 快速开始

请在用户点击或触摸事件处理函数中运行。

```ts
const { SoundTrace } = await import(
  '/vendor-runtime/sound-tracing/sdk/index.js'
);

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

### Band8

`Band8` 是不需要外部 HRTF 表的轻量渲染路径。如果不调用 `loadHrtf()`，
核心会使用该路径。

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
});
```

### Parametric

显式加载紧凑的 KU100 测量型参数表。

```ts
await sound.loadHrtf('parametric');
```

主要产品指南仅公开 `Band8` 和 `Parametric`。SDK 还包含高级 HRIR 加载器，
但应先验证目标平台上的资源大小和渲染成本，再决定是否引入。

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

为网格分配材质名称或索引。

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',
});
```

优先使用内置预设。直接编辑 8 频段的反射、吸收和透射值属于自定义声学材质的高级流程。

## 故障排除

| 症状 | 检查项 |
|---|---|
| 没有声音 | 在用户手势中先调用 `AudioContext.resume()` |
| MT 启动失败 | 检查 COOP/COEP、SharedArrayBuffer 和 `crossOriginIsolated` |
| GPU 未启用 | 检查 `navigator.gpu` 和硬件加速；CPU 回退是有效状态 |
| 方向被镜像 | 检查渲染器对应的 `coordinateBasis` |
| SDK 入口返回 404 | 检查 `vendor/sound-tracing/sdk/index.js` 和运行时清单 |
| 性能较低 | 在深入调优前降低质量预设并关闭路径可视化 |

## 下一步

- [SDK 概览](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
- [演示](../demos/overview.md)
