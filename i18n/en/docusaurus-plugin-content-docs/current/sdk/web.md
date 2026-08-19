---
title: Web
description: Install the soundtrace.js WebAssembly SDK and use HRTF modes, quality presets, and the CPU/MT/WebGPU backends.
---

# Web SDK

**soundtrace.js** is the TypeScript/WebAssembly SDK for using
[STCoreV2](../core/stcorev2.md) in a browser. It connects render-scene meshes,
materials, sources, and listeners to a Sound Tracing scene and exposes spatial
output in a Web Audio graph.

## Current SDK essentials

| Area | Recommended workflow |
|---|---|
| HRTF | The core-embedded HRIR table is the default (no load); call `loadHrtf('parametric')` for parametric directional rendering |
| Backend | Select `Single Thread`, `Multi Thread`, or `WebGPU` |
| Quality | Select the `Fast`, `Balanced`, or `Quality` preset |
| Materials | Reference material presets by name: `concrete`, `wood`, `glass`, `metal`, and so on |
| Low-level controls | Let the preset manage ray resolution, depth, and render budgets |

## Requirements

- Node.js 20 or newer
- A modern browser with Web Audio API and AudioWorklet
- COOP/COEP and `crossOriginIsolated === true` for `Multi Thread`
- A browser and GPU exposing `navigator.gpu` for `WebGPU`
- A licensed SDK distribution

## Installation

`soundtrace.js` ships as the private package `@exarionai/soundtrace.js` under a
license agreement. Once you have the distribution, use the import specifier
exactly as the examples below do.

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

The package carries its own WASM cores (`core/st`, `core/mt`) and its material
and HRTF assets, and fetches them at runtime. A bundler that pre-bundles that
module graph breaks worker and wasm loading, so exclude the package from
dependency pre-bundling in Vite.

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

To host the cores and assets yourself, point `coreBaseUrl` and `assetBaseUrl` at
your own URLs — see the [Facade API](./web/facade.md).

## Quick start

Run this inside a user click or tap handler.

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

Three.js cameras look toward `-Z`, so use the coordinate basis shown above.
Without the correct basis, left/right or front/back HRTF direction can be
mirrored.

## HRTF selection

The core installs a min-phase HRIR table on every listener at creation, so
binaural rendering works without calling `loadHrtf()` at all. That is the
default path.

To switch to the reduced KU100 parametric table, load it explicitly.

```ts
await sound.loadHrtf('parametric');
```

| Call | Table used | Extra asset |
|---|---|---|
| (not called) | Core-embedded min-phase HRIR | None |
| `loadHrtf('parametric')` | KU100 parametric | `KU100_bprime.bin` |
| `loadHrtf('convolution')` | Core-embedded HRIR, switched to nearest lookup | None |
| `loadHrtf('steamaudio')` | SADIE H12 HRIR | `sadie_h12_steamaudio.bin` |

To use a table your application owns, pass a URL, `ArrayBuffer`, or typed array
as the second argument.

```ts
await sound.loadHrtf('parametric', '/assets/my-hrtf.bin');
```

:::note
The core also has a `Band8` spatializer (8-band magnitude plus ITD), but the
facade cannot select it: `setRenderOptions()` rejects an `hrtfMode` key, and the
switch is only reachable through the native `setHrtfMode()`.
:::

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

A mesh takes a material name or index. The default table holds 22 materials,
and names resolve through these 10 canonical names.

| Canonical name | Recognized aliases (partial) |
|---|---|
| `concrete` | cement, beton, pavement, sidewalk |
| `wood` | plank, timber, oak, pine, bamboo |
| `glass` | window, mirror, crystal |
| `metal` | steel, iron, aluminum, copper, brass |
| `brick` | tile, ceramic, terracotta |
| `fabric` | cloth, textile, carpet, curtain |
| `plastic` | rubber, vinyl, pvc |
| `water` | liquid, pool |
| `grass` | vegetation, leaves, lawn |
| `sand` | dirt, gravel, soil, mud |

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',   // alias of metal
});
```

:::warning
An unknown name does not throw — it silently falls back to the default material
(index `0`, `concrete`). A typo still produces sound, so use the names above
when you need to be sure the material was applied.
:::

Start from the shipped presets, and reserve editing the raw 8-band
reflection/absorption/transmission values for cases that genuinely need a custom
acoustic material.

## Troubleshooting

| Symptom | Check |
|---|---|
| Silent output | Call `AudioContext.resume()` first inside a user gesture |
| MT startup failure | Verify COOP/COEP, SharedArrayBuffer, and `crossOriginIsolated` |
| GPU not active | Verify `navigator.gpu` and hardware acceleration; CPU fallback is valid |
| Mirrored direction | Verify the renderer-specific `coordinateBasis` |
| Material seems to have no effect | Check the name against the canonical/alias table above — an unknown name falls back to the default material |
| Core or asset returns 404 | Check that the bundler is not pre-bundling the package, and that `coreBaseUrl` / `assetBaseUrl` are correct |
| Low performance | Lower the quality preset and disable path visualization before deeper tuning |

## Next

- [SDK Overview](./overview.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
