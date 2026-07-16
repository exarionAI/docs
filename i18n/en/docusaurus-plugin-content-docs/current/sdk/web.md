---
title: Web
description: Install the soundtrace.js WebAssembly SDK and use HRTF modes, quality presets, CPU/MT/WebGPU backends, and the official all-in-one demo.
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# Web SDK

**soundtrace.js** is the TypeScript/WebAssembly SDK for using
[STCoreV2](../core/stcorev2.md) in a browser. It connects render-scene meshes,
materials, sources, and listeners to a Sound Tracing scene and exposes spatial
output in a Web Audio graph.

## Current SDK essentials

| Area | Recommended workflow |
|---|---|
| HRTF | Use `Band8` for the lightweight path or `Parametric` for measured directional rendering |
| Backend | Select `Single Thread`, `Multi Thread`, or `WebGPU` |
| Quality | Select the `Fast`, `Balanced`, or `Quality` preset |
| Materials | Use presets such as `Concrete`, `Steel`, `Marble`, `Snow`, and `Soil` |
| Low-level controls | Let the preset manage ray resolution, depth, and render budgets |

## Web demo

The embedded demo is the latest build from
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing). It
contains three scenes in one application.

| Scene | What it demonstrates |
|---|---|
| Capability | WebAssembly, AudioWorklet, SharedArrayBuffer, and WebGPU support |
| Shoebox | Moving source/listener, materials, reflection paths, and quality presets |
| Multiroom | Multiple sources, doors, occlusion, and propagation between rooms |

<iframe
  title="Sound-tracing.js all-in-one demo"
  src={useSharedStaticUrl('/demos/three-basic/')}
  style={{width: '100%', height: '576px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

Use the top navigation to switch scenes. Headphones and a recent Chrome release
are recommended for spatial-audio evaluation.

## Requirements

- Node.js 20 or newer
- A modern browser with Web Audio API and AudioWorklet
- COOP/COEP and `crossOriginIsolated === true` for `Multi Thread`
- A browser and GPU exposing `navigator.gpu` for `WebGPU`
- A licensed SDK distribution

## Licensed SDK installation

Evaluation and licensed builds may be distributed as a ZIP. The official demo
uses this directory contract:

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

Place the ZIP's root `sdk/` directory at exactly
`vendor/sound-tracing/sdk/`. No `.env.local` file is used. During development,
the checked-in runtime manifest resolves this entry:

```text
/vendor-runtime/sound-tracing/sdk/index.js
```

The repository's
[`vite.config.ts`](https://github.com/exarionAI/Sound-tracing/blob/dev/vite.config.ts)
is the reference for Vite serving and production copying.

## Quick start

Run this inside a user click or tap handler.

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

Three.js cameras look toward `-Z`, so use the coordinate basis shown above.
Without the correct basis, left/right or front/back HRTF direction can be
mirrored.

## HRTF selection

### Band8

`Band8` is the lightweight rendering path and does not require an external HRTF
table. If you do not call `loadHrtf()`, the core uses this path.

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
});
```

### Parametric

Load the compact measured KU100 parametric table explicitly.

```ts
await sound.loadHrtf('parametric');
```

The primary product guide exposes `Band8` and `Parametric`. The SDK also contains
advanced HRIR loaders; introduce them only after validating asset size and render
cost for the target platform.

## Backend selection

| Mode | Code | Requirement | Behavior |
|---|---|---|---|
| Single Thread | `mode: 'single_thread'` | Standard browser hosting | Simplest CPU path |
| Multi Thread | `mode: 'multi_thread'` | COOP/COEP and SharedArrayBuffer | Worker-hosted MT CPU path |
| WebGPU | `mode: 'gpu'` | WebGPU | Attempts GPU propagation and falls back to CPU |

### Multi Thread deployment headers

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The dedicated worker owns the MT engine session. The main thread keeps UI and Web
Audio ownership. Transform updates use the fast state path, while create/delete,
material, and mesh operations use an ordered command path.

### WebGPU

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'gpu',
  quality: 'balanced',
});
```

The current automatic WebGPU path is paired with the single-thread core. Do not
force `thread: 'mt'` together with `mode: 'gpu'`. If GPU initialization fails,
the SDK continues on CPU.

## Quality presets

| Preset | Recommended use |
|---|---|
| `fast` | Mobile, low-power devices, many simultaneous sources |
| `balanced` | Default for normal desktop and product integration |
| `quality` | High-end desktop and quality-first demos |

```ts
sound.setQuality('quality');
```

The preset coordinates propagation and HRTF/diffuse render budgets. When
performance is insufficient, step down `quality → balanced → fast` before
editing individual ray properties.

## Web Audio connection

```ts
const player = audioContext.createBufferSource();
player.buffer = decodedBuffer;
player.loop = true;

const spatialNode = await source.play(player);
spatialNode.connect(sound.output).connect(audioContext.destination);
player.start();
```

The application owns the `AudioContext` and playback nodes. soundtrace.js
provides the per-source spatial node and master output.

## Update and cleanup

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25] });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);

sound.dispose();
await audioContext.close();
```

## Material presets

Assign a material name or index to a mesh.

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',
});
```

Start with the bundled presets. Direct editing of 8-band reflection, absorption,
and transmission values is an advanced path for custom acoustic materials.

## Troubleshooting

| Symptom | Check |
|---|---|
| Silent output | Call `AudioContext.resume()` first inside a user gesture |
| MT startup failure | Verify COOP/COEP, SharedArrayBuffer, and `crossOriginIsolated` |
| GPU not active | Verify `navigator.gpu` and hardware acceleration; CPU fallback is valid |
| Mirrored direction | Verify the renderer-specific `coordinateBasis` |
| SDK entry returns 404 | Verify `vendor/sound-tracing/sdk/index.js` and the runtime manifest |
| Low performance | Lower the quality preset and disable path visualization before deeper tuning |

## Next

- [SDK Overview](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
- [Demos](../demos/overview.md)
