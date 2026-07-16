---
title: Demos
description: Official Sound-tracing.js all-in-one browser demo.
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# Demos

## Sound-tracing.js all-in-one demo

The previous `three-basic` static demo has been replaced with the latest build
from [exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing). The
deployment URL is preserved, but the content is now one application containing
Capability, Shoebox, and Multiroom scenes.

<a href={useSharedStaticUrl('/demos/three-basic/')} target="_blank" rel="noreferrer">
  Open the demo in a new window
</a>

| Scene | Purpose |
|---|---|
| Capability | Browser, AudioWorklet, WebAssembly, MT, and WebGPU support |
| Shoebox | Source/listener movement, materials, reflections, and quality presets |
| Multiroom | Multiple sources, doors, occlusion, and room-to-room propagation |

## Selectors

| UI | Values |
|---|---|
| Backend | Single Thread, Multi Thread, WebGPU |
| Quality | Fast, Middle, Quality |
| Material | Scene-specific SoundTrace material presets |

See the [Web SDK](../sdk/web.md) guide for Band8 and Parametric HRTF selection.

## Runtime requirements

- Single Thread: normal static hosting
- Multi Thread: COOP/COEP and `SharedArrayBuffer`
- WebGPU: `navigator.gpu` and hardware acceleration
- Spatial evaluation: headphones recommended

The documentation preview server sends the required COOP/COEP headers.

```bash
BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

## Updating the static artifact

```bash
export SOUND_TRACING_DEMO=/path/to/Sound-tracing
export SOUNDTRACE_DOCS=/path/to/docs

cd "$SOUND_TRACING_DEMO"
npm run build

rsync -a --delete \
  "$SOUND_TRACING_DEMO/dist/" \
  "$SOUNDTRACE_DOCS/static/demos/three-basic/"
```

The embedded demo contains licensed SDK files. Confirm distribution rights and
license scope before publishing it publicly.
