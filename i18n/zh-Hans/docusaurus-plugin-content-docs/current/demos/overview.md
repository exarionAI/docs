---
title: 演示
description: 官方 Sound-tracing.js 一体化浏览器演示。
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# 演示

## Sound-tracing.js 一体化演示

原来的 `three-basic` 静态演示已替换为
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing) 的最新构建。
部署 URL 保持不变，但内容现在是一个包含 Capability、Shoebox 和 Multiroom 场景的
应用。

<a href={useSharedStaticUrl('/demos/three-basic/')} target="_blank" rel="noreferrer">
  在新窗口中打开演示
</a>

| 场景 | 用途 |
|---|---|
| Capability | 浏览器、AudioWorklet、WebAssembly、MT 和 WebGPU 支持 |
| Shoebox | 声源／监听器移动、材质、反射和质量预设 |
| Multiroom | 多声源、门、遮挡和房间之间的传播 |

## 选择器

| UI | 可选值 |
|---|---|
| Backend | Single Thread、Multi Thread、WebGPU |
| Quality | Fast、Middle、Quality |
| Material | 场景对应的 SoundTrace 材质预设 |

Band8 和 Parametric HRTF 的选择方法请参阅 [Web SDK](../sdk/web.md) 指南。

## 运行要求

- Single Thread：普通静态托管
- Multi Thread：COOP/COEP 和 `SharedArrayBuffer`
- WebGPU：`navigator.gpu` 和硬件加速
- 空间音频评估：建议使用耳机

文档预览服务器会发送所需的 COOP/COEP 响应头。

```bash
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

## 更新静态产物

```bash
export SOUND_TRACING_DEMO=/path/to/Sound-tracing
export SOUNDTRACE_DOCS=/path/to/docs

cd "$SOUND_TRACING_DEMO"
npm run build

rsync -a --delete \
  "$SOUND_TRACING_DEMO/dist/" \
  "$SOUNDTRACE_DOCS/static/demos/three-basic/"
```

嵌入式演示包含授权 SDK 文件。公开发布前请确认分发权限和许可证范围。
