---
title: Web
description: Sound-Tracing SDK for Web (soundtrace.js) — installation, deployment requirements, HRTF, quality presets, materials, EQ, and troubleshooting for the WebAssembly SDK.
---

# Sound-Tracing SDK for Web

**soundtrace.js** is the TypeScript/WebAssembly SDK for using the Sound-Tracing SDK in the
browser. It connects the meshes, materials, sources, and listener of a rendering scene such as
Three.js to a Sound Tracing scene, and provides spatialized stereo output to the Web Audio graph.

See [Facade API](./web/facade.md) for the full options and entity API, and
[Native API](./web/native.md) for low-level module access.

![soundtrace.js architecture](/img/web/architecture.png)

## Current SDK essentials

| Item | Current behavior |
|---|---|
| Engine | Sound-Tracing SDK Realtime (pthreads WASM) + Offline (single-threaded, IR analysis only) |
| Execution modes | `single_thread` (synchronous propagation) / `multi_thread` (pipelined propagation). **Both use a dedicated Worker + pthread WASM** |
| Early reflections | Always **Hybrid**. Re-applied after render start, HRTF change, and reset |
| HRTF | Embedded MIT KEMAR (`'mit-kemar'`), bundled SADIE II D2 (`'sadie-d2'`) |
| Quality | `fast` / `balanced` / `quality` — sets the listener and source ray grids and reflection depth together |
| Materials | 9-band (63 Hz ~ 16 kHz), 22 SoundTrace game materials, selected by name, alias, or index |
| Output | Mono input per source; the listener renderer mixes one stereo output (`sound.output`) |
| Source cap | Default 32 sources · source memory 64 MiB · delay ring ceiling 0.5 s. The source count is changed with the `maxSources` option |
| EQ | Per-source source EQ and a global output EQ, parametric, up to 16 bands — see [EQ](#eq) |

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
| vendor tree | `soundtrace-js-release-vendor.zip` (root `sdk/`) | Extract to a static path (e.g. `vendor/sound-tracing/sdk`) and serve it |
| npm package | `exarionai-soundtrace.js-1.1.0.tgz` | `npm install /absolute/path/exarionai-soundtrace.js-1.1.0.tgz` |

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

The Sound-Tracing SDK's coordinate system is `+Z` forward, the same as Unity. Renderers that look down `-Z`,
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

A mesh takes a material name, alias, or index. The default table is the 22 SoundTrace game
materials, the same table and indices as the Unity SDK. These are game presets, not measured data,
and every entry is 9-band R/A/T/scattering.

Names and aliases are case-insensitive. Material names keep their original spelling
(`Sherdded-woodFiberborad`).

| Index | Material name | Aliases |
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

The alias source of truth is the package's `assets/soundMaterialAlias.json`; material values are in
`assets/soundMaterial.json`.

```ts
sound.addMesh({ vertices, indices, material: 'GypsumBoard' });
sound.addMesh({ vertices, indices, material: '유리' });   // → Glass (5)
```

:::warning
A name that is not in the table is silently replaced by the default material
(`defaultMaterialType = 0`, `Concrete`) without throwing. Use the exact names or aliases above to
make sure the intended material is applied.
:::

To define a material yourself, pass four sets of 9 values satisfying `R + A + T = 1` (tolerance
0.001) in every band. Arrays whose length is not 9 are rejected with an error.

## Web Audio connection

```ts
const node = await source.play(player);  // AudioWorkletNode: input capture only, silent output
sound.output.connect(audioContext.destination);
```

`soundtrace.js` does not create an `AudioContext`. The app owns the context and the playback nodes;
the SDK provides a per-source **input capture node** and one **listener master output**
(`sound.output`). Per-source output effects must be moved behind `sound.output`.

The SDK keeps the output limiter **off**, because the Web Audio master bus after `sound.output` is owned
by the app. If you need the engine limiter, turn on the true-peak limiter with
`sound.listener.setRenderOptions({ useLimiter: true })`.

For the same reason, the equal-loudness compensation that the engine turns on right after creation is
turned off right after the context is created (including `reset()`). This setting is not exposed.

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
| Directions sound reversed | A `coordinateBasis` matching the renderer's coordinate system (required for `-Z` forward) |
| Materials do not seem to apply | The name exists in the material table/aliases (otherwise it falls back to concrete) |
| Core/asset 404 | Bundler pre-bundling exclusion, `coreBaseUrl`/`assetBaseUrl`, `.wasm` MIME type |
| Not enough performance | Lower the quality preset, use `thread: 'mt'`, disable path visualization |
| `setEq` / `setOutputEq` throws `RangeError` | Frequency, gain, Q, and preamp ranges; 16 bands or fewer |

## EQ

The Sound-Tracing SDK's parametric EQ can be applied at two points.

- **Source EQ** — applied to the source signal itself, before the engine's band split. Direct, reflection, diffraction, and reverb of that source all get the same tone.
- **Output EQ** — applied to the whole Sound-Tracing SDK mix at the end of the render (before the master gain).

There are six filter types: Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch (cuts are fixed at 12 dB/oct).
Ranges are frequency 20 ~ 20,000 Hz, gain ±24 dB (Peaking and shelves only), Q 0.1 ~ 30 (shelves up to 3), preamp −48 ~ +12 dB.
The default is off, and while off the engine is not called, so the output is the same as with no EQ. Only changed values
are sent, and the engine crossfades to them over 20 ms.

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });

source.setEq(null);        // remove the source EQ
sound.setOutputEq(null);   // turn the output EQ off
```

| API | Where it applies |
|---|---|
| `Source.setEq(eq \| null)` | The source signal, before the engine's band split. Direct, reflection, diffraction, and reverb of that source all get the same tone. Both live and clip input. Also included in the offline pressure IR of `renderMonoImpulseResponse` (not in the band energies of `getIRs()`) |
| `SoundTrace.setOutputEq(eq \| null)` | One global output EQ at the end of the render (before the master gain). Kept across `reset()`. Not included in offline analysis |

- `eq = { enabled = true, preampDb = 0 (−48 ~ +12), bands = [] (up to 16) }`
- `band = { type = 'peaking', enabled = true, frequencyHz = 1000 (20 ~ 20,000), gainDb = 0 (±24, peaking and shelves only), q = 0.7071 (0.1 ~ 30, the engine limits shelves to 3) }`
- `type` is `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'` (Web Audio
  `BiquadFilterType` names; cuts are fixed at 12 dB/oct).
- Out-of-range values are rejected with a `RangeError` and no command is sent. `{ enabled: false }` keeps the bands
  and passes the signal through.
- If you never call the EQ, the engine EQ is not called, so the output is bit-identical to having no EQ. The same
  value is not sent again, and changed values are crossfaded by the engine over 20 ms.
- An older core without EQ support fails with a message naming the engine version. The applied output EQ is in
  `debugSnapshot().simplest.output.eq`.

## Next

- [Facade API](./web/facade.md) — creation options, scene/source/mesh API, lifecycle
- [Native API](./web/native.md) — the Sound-Tracing SDK module loader and low-level adapters
- [Performance Guide](./performance.md)
