---
title: 示範
description: 官方 Sound-tracing.js 整合瀏覽器示範。
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# 示範

## Sound-tracing.js 整合示範

原本的 `three-basic` 靜態示範已替換為
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing) 的最新建置。
部署 URL 維持不變，但內容現在是一個包含 Capability、Shoebox 與 Multiroom 場景的
應用程式。

<a href={useSharedStaticUrl('/demos/three-basic/')} target="_blank" rel="noreferrer">
  在新視窗中開啟示範
</a>

| 場景 | 用途 |
|---|---|
| Capability | 瀏覽器、AudioWorklet、WebAssembly、MT 與 WebGPU 支援 |
| Shoebox | 音源／聆聽者移動、材質、反射與品質預設 |
| Multiroom | 多音源、門、遮蔽與房間之間的傳播 |

## 選擇器

| UI | 可選值 |
|---|---|
| Backend | Single Thread、Multi Thread、WebGPU |
| Quality | Fast、Middle、Quality |
| Material | 場景對應的 SoundTrace 材質預設 |

Band8 與 Parametric HRTF 的選擇方式請參閱 [Web SDK](../sdk/web.md) 指南。

## 執行需求

- Single Thread：一般靜態託管
- Multi Thread：COOP/COEP 與 `SharedArrayBuffer`
- WebGPU：`navigator.gpu` 與硬體加速
- 空間音訊評估：建議使用耳機

文件預覽伺服器會傳送所需的 COOP/COEP 回應標頭。

```bash
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

## 更新靜態產物

```bash
export SOUND_TRACING_DEMO=/path/to/Sound-tracing
export SOUNDTRACE_DOCS=/path/to/docs

cd "$SOUND_TRACING_DEMO"
npm run build

rsync -a --delete \
  "$SOUND_TRACING_DEMO/dist/" \
  "$SOUNDTRACE_DOCS/static/demos/three-basic/"
```

內嵌示範包含授權 SDK 檔案。公開發佈前請確認散佈權限與授權範圍。
