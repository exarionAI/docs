---
title: Web
description: soundtrace.js 1.0.0 — installation, deployment requirements, HRTF, quality presets, materials, and troubleshooting for the SimpleST ABI 6 WebAssembly SDK.
---

# Web SDK

**soundtrace.js** is the TypeScript/WebAssembly SDK for using [SimpleST](../core/simplest.md) in the
browser. It connects the meshes, materials, sources, and listener of a rendering scene such as
Three.js to a Sound Tracing scene, and provides spatialized stereo output to the Web Audio graph.

From 1.0.0 the engine has changed from STCoreV2 to **SimpleST 2.12.0 / ABI 6**. The `SoundTrace`,
`Source`, `Mesh`, and `Listener` facades are kept, but the backend, HRTF, material, and option
contracts have changed. See [Facade API](./web/facade.md) for the full options and entity API, and
[Native API](./web/native.md) for low-level access to the SimpleST module.

![soundtrace.js architecture](/img/web/architecture.png)

## Current SDK essentials

| Item | Current behavior |
|---|---|
| Engine | SimpleST Realtime (pthreads WASM) + Offline (single-threaded, IR analysis only) |
| Execution modes | `single_thread` (synchronous propagation) / `multi_thread` (pipelined propagation). **Both use a dedicated Worker + pthread WASM** |
| Early reflections | Always **Hybrid**. Re-applied after render start, HRTF change, and reset |
| HRTF | Embedded MIT KEMAR (`'mit-kemar'`), bundled SADIE II D2 (`'sadie-d2'`) |
| Quality | `fast` / `balanced` / `quality` — sets the listener and source ray grids and reflection depth together |
| Materials | 9-band (63 Hz ~ 16 kHz), 24 BRAS materials + 3 demo materials, selected by name or alias |
| Output | Mono input per source; the listener renderer mixes one stereo output (`sound.output`) |
| GPU | None. `mode: 'gpu'` and `enableGpu()` are errors |

## Requirements

- Node.js 20 or later (build tooling); a recent Chromium-based browser is recommended
- HTTPS or localhost
- AudioWorklet, SharedArrayBuffer, **cross-origin isolation** — required for both ST and MT
  (there is no non-isolated fallback)
- A licensed SDK distribution (vendor ZIP or npm tgz)

## Installation

`soundtrace.js` is the private package `@exarionai/soundtrace.js`, provided under a license
agreement. It is distributed in two forms.

| Form | File | Installation |
|---|---|---|
| vendor tree | `soundtrace-js-release-vendor.zip` (root `sdk/`) | Extract to a static path and serve it. The bundled `install.py` verifies hashes and installs to `vendor/sound-tracing/sdk` |
| npm package | `exarionai-soundtrace.js-1.0.0.tgz` | `npm install /absolute/path/exarionai-soundtrace.js-1.0.0.tgz` |

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

The package ships the WASM core (`core/SimpleSTRealtime.mjs/.wasm`, `core/SimpleSTOffline.mjs`)
together with the material and HRTF assets, and fetches them at runtime. If a bundler pre-bundles
this module graph, Worker and WASM loading breaks, so with Vite exclude it from dependency
pre-bundling and serve it as a static vendor tree.

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

If you host the core and assets yourself, specify the URLs with the `coreBaseUrl` and
`assetBaseUrl` options. Serve `.mjs` as JavaScript and `.wasm` with the `application/wasm` MIME type.

### Deployment headers

The following headers must be present on the page response **and on the Worker script responses**.

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Quick start

The following code must run inside a user click or tap event.

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',              // 'st' = synchronous propagation, 'mt' = pipelined (recommended)
  quality: 'balanced',
  earlyReflectionMode: 'hybrid',
  coordinateBasis: {         // Three.js: the camera looks down -Z
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
await source.play(player);     // input-capture node; its output is silent — audio comes from sound.output
await sound.update(0);
player.start();
```

SimpleST's coordinate system is `+Z` forward, the same as Unity. Renderers that look down `-Z`,
such as Three.js, need the `coordinateBasis` above for left/right and front/back to line up.

## Execution modes

| Option | Propagation | Description |
|---|---|---|
| `thread: 'st'` / `mode: 'single_thread'` | Synchronous (SYNCHRONOUS) | `update()` returns after propagation finishes. Default compute budget 1 |
| `thread: 'mt'` / `mode: 'multi_thread'` | Pipelined (PIPELINED) | The Direct / Reflection-Diffraction / Reverb lanes run independently on workers. Default budget 3 |

In both modes a dedicated Worker owns the engine session and uses the same pthread WASM. The shipped
pthread pool is 5 and `propagationThreadCount` ranges from 1 to 5. The main thread only keeps the UI
and the Web Audio graph; position updates go through shared-memory lanes, and create/delete/material
changes go through an ordered command path.

## HRTF selection

| Call | Table | Extra asset |
|---|---|---|
| (not called) | Embedded MIT KEMAR — the SDK default. `setOutputMode('speaker')` switches to stereo panning | None |
| `loadHrtf('mit-kemar')` or `'convolution'` | Engine-embedded MIT KEMAR, 128 taps | None |
| `loadHrtf('sadie-d2')` or `'steamaudio'` | SADIE II D2 KEMAR, 8,802 directions, 256 taps | `SADIE_D2_44K_16bit_256tap.hrtfbin` |

The old KU100 parametric / convolution / SADIE H12 tables and the `Band8` mode no longer exist.
`loadHrtf('parametric')` is an error.

```ts
await sound.loadHrtf('sadie-d2');
sound.listener.setOutputMode('speaker');   // 'hrtf' (default) | 'speaker' (stereo panning)
```

## Quality presets

| Preset | Listener guide rays | Source transport rays | Reflection depth | Use |
|---|---|---|---|---|
| `fast` | `8 × 8` | `8 × 8` | 4 | Mobile, many concurrent sources |
| `balanced` (default) | `16 × 16` | `16 × 16` | 6 | Desktop default |
| `quality` | `24 × 24` | `24 × 24` | 8 | Quality-first demos |

```ts
sound.setQuality('quality');
```

`'speed'` and `'middle'` are deprecated aliases of `fast` and `balanced`. If you hit performance
problems, step down `quality → balanced → fast` before touching individual ray counts.

## Materials

A mesh takes a material name, alias, or index. The default table is the 24 SimpleST BRAS materials
plus 3 demo approximations (`Fabric`, `Sand`, `Water` — not measured values), 27 in total, and every
entry is 9-band R/A/T/scattering.

| Alias | Mapped material |
|---|---|
| `concrete`, `cement`, `콘크리트` | `BRAS_CR2_concrete` |
| `glass`, `window`, `유리` | `BRAS_CR2_windows` |
| `wood`, `timber`, `나무` | `BRAS_CR4_woodPanels` |
| `fabric`, `cloth`, `carpet`, `curtain`, `천` | `Fabric` |
| `sand`, `snow`, `모래` | `Sand` |
| `water`, `waterSurface`, `물` | `Water` |

Full BRAS material names (`BRAS_CR2_ceiling`, `BRAS_CR3_seating`, `BRAS_CR4_brickwall` …) can be
used as they are. The complete list is in the package's `assets/soundMaterial.json`.

```ts
sound.addMesh({ vertices, indices, material: 'BRAS_CR4_parquet' });
```

:::warning
A name that is not in the table is silently replaced by the default material
(`defaultMaterialType = 1`, `BRAS_CR2_concrete`) without throwing. Use the exact names above to make
sure the intended material is applied.
:::

To define a material yourself, pass four sets of 9 values satisfying `R + A + T = 1` (tolerance
0.001) in every band. Do not fill 9 bands by duplicating 8-band values.

## Web Audio connection

```ts
const node = await source.play(player);  // AudioWorkletNode: input capture only, silent output
sound.output.connect(audioContext.destination);
```

`soundtrace.js` does not create an `AudioContext`. The app owns the context and the playback nodes;
the SDK provides a per-source **input capture node** and one **listener master output**
(`sound.output`). Per-source output effects must be moved behind `sound.output`.

## Update and cleanup

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25], orientation: camera.quaternion.toArray() });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);   // resolves with this frame's valid path count

source.dispose();
sound.dispose();
await audioContext.close();
```

## Diagnostics and IR analysis

```ts
const snap = await sound.debugSnapshot();
snap.simplest.timing;   // { propagationMs, directMs, reflectionDiffractionMs, reverbMs, irMs, renderMs }
snap.simplest.scene;    // { meshes, objects, sources, triangles }
snap.simplest.render;   // { blockSequence, activeSources, exactTaps, sendTaps, totalUs }

const irs = await sound.getIRs();                               // nine-band early path IRs
const h = await sound.renderMonoImpulseResponse(source, 2.0);   // 44.1 kHz mono pressure IR (max 30 s)
```

IR analysis clones the scene into a separate Offline Worker, so real-time output is not interrupted.
`renderMonoImpulseResponse` returns a pressure IR, not a recording of the HRTF/Hybrid output.

## Demos

The public demo repository [Sound-tracing](https://github.com/exarionAI/Sound-tracing) lets you run
the Shoebox room, Multi-room occlusion, and Runtime capability examples.

![Shoebox room demo](/img/web/demo-shoebox.png)

![Multi-room occlusion demo](/img/web/demo-multiroom.png)

## Troubleshooting

| Symptom | What to check |
|---|---|
| No sound | `AudioContext.resume()` was called first inside a user gesture; `sound.output` is connected to the destination |
| `SoundTrace.create` rejects with a cross-origin isolation error | COOP/COEP headers on the page and Worker responses, `crossOriginIsolated === true` (required for ST too) |
| `mode: 'gpu'` / `enableGpu()` error | SimpleST Web is CPU only. Remove the option |
| `transmissionModel: 'solid'`, `defaultMeshBuild`, `hrtfQuality` etc. rejected | STCoreV2-only options. See the rejected list in [Facade API](./web/facade.md) |
| Directions sound reversed | A `coordinateBasis` matching the renderer's coordinate system (required for `-Z` forward) |
| Materials do not seem to apply | The name exists in the material table/aliases (otherwise it falls back to concrete) |
| Core/asset 404 | Bundler pre-bundling exclusion, `coreBaseUrl`/`assetBaseUrl`, `.wasm` MIME type |
| Not enough performance | Lower the quality preset, use `thread: 'mt'`, disable path visualization |

## Next

- [Facade API](./web/facade.md) — creation options, scene/source/mesh API, lifecycle, rejected legacy options
- [Native API](./web/native.md) — the SimpleST module loader and low-level adapters
- [Performance Guide](./performance.md)
