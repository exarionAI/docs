---
title: Facade API
description: The recommended soundtrace.js API, identical on ST and MT — creation options, scene/source/mesh API, lifecycle, EQ.
---

# Facade API

The facade is the recommended entry point for ordinary web applications. `SoundTrace` manages the
scene lifecycle, and `Listener`, `Source`, and `Mesh` represent the app's 3D state. Every public
method behaves identically with `thread: 'st'` and `'mt'`, and all diagnostics are asynchronous.

[Web SDK overview](../web.md) · [Native API](./native.md)

## Basic flow

```ts
const sound = await SoundTrace.create(audioContext, options);
sound.output.connect(audioContext.destination);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

await source.play(inputNode);      // input capture. The only output is sound.output
await sound.update(0);
```

## `SoundTrace` options

| Option | Default | Description |
|---|---|---|
| `thread` | `'auto'` | `'st'` (synchronous propagation) / `'mt'` (pipelined propagation). Both use a dedicated Worker + pthread WASM |
| `mode` | unset | `'single_thread'` / `'multi_thread'`. Alias of `thread`; `mode` takes precedence |
| `quality` | `'balanced'` | `'fast'`, `'balanced'`, `'quality'` |
| `earlyReflectionMode` | `'hybrid'` | Real-time is always Hybrid. Other values are rejected |
| `coordinateBasis` | Engine coordinate system (`+Z` forward) | Converts the renderer's coordinate system to the SDK's |
| `coreBaseUrl` | Inside the package | URL where `SimpleSTRealtime.mjs/.wasm` and `SimpleSTOffline.mjs` live |
| `assetBaseUrl` | Inside the package | URL of the material JSON and HRTF assets |
| `propagationThreadCount` | Synchronous 1 / pipelined 3 | Compute budget 1 ~ 5 (negative = 5). Pipelined needs at least 3 |
| `throughput` | unset | `'low'` / `'medium'` / `'max'` — shorthand for the MT worker budget |
| `sceneRatio` | `1.0` | Meters per scene length unit (cm = 0.01). **Never combine** with pre-scaled geometry |
| `maxSources` | `0` | Cap on the number of simultaneously live engine sources (integer 0 ~ 512). `0` = wasm platform default (32 sources · source memory 64 MiB · delay ring ceiling 0.5 s — conservative because the heap is fixed at 256 MiB). The engine rejects creating sources beyond it with status 11 (`BUDGET_EXCEEDED`), and existing sources keep rendering |
| `autoLoadMaterials` | `true` | Loads the default material table and enables name mapping |
| `debug` | `false` | Prints one line of initialization diagnostics |

```ts
const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',
  quality: 'balanced',
  coordinateBasis: { right: [-1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, // Three.js
});
```

## Core API

### `SoundTrace`

| API | Description |
|---|---|
| `SoundTrace.create(ctx, options?)` | Creates and loads the engine (constructor + `load()`) |
| `output` / `audioContext` | The listener master output node (stereo) and the `AudioContext` the app passed in |
| `listener` | The scene's single listener |
| `descriptor` | `{ transport: 'worker', thread: 'st' \| 'mt' }` — for diagnostics. Do not branch on it |
| `addMesh(options)` / `removeMesh(mesh)` | Add/remove acoustic geometry |
| `addSource(options)` | Add a spatial source |
| `setQuality(tier)` | Change the quality preset (listener and source rays plus depth) |
| `setAudioOption(options)` | Input block size, output channel override |
| `setOutputEq(eq \| null)` | Global output parametric EQ (up to 16 bands). `null` turns it off. Kept across `reset()` — see [EQ](#eq) |
| `loadHrtf(mode, source?)` | `'mit-kemar'` / `'sadie-d2'` (aliases `'convolution'` / `'steamaudio'`) |
| `loadMaterialAssets()` | Load the material table manually (when `autoLoadMaterials: false`) |
| `update(dt?)` | Updates the scene and runs propagation. Resolves with this frame's valid path count |
| `debugSnapshot(options?)` | Asynchronous diagnostic snapshot. `.simplest` holds scene/timing/render/IR statistics, `features`, `output` (limiter, type, latency, master gain, output EQ `eq`), and `inputs` (live/clip source counts) |
| `getStatistics(options?)` | Wrapper around `debugSnapshot`. `validPathCount` and `.simplest` |
| `getIRs()` | Recomputes the 9-band early path IR in a separate Offline Worker |
| `renderMonoImpulseResponse(source, sec)` | 44.1 kHz mono pressure IR from the Offline Worker (max 30 s) |
| `reset()` | Resets the engine state (async). Hybrid, materials, and quality are re-applied |
| `dispose()` | Releases SDK-owned resources. Idempotent, `using`-compatible |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: camera.quaternion.toArray() })
  .setRenderOptions({ useDoppler: true, useLimiter: false, pathFadeTime: 0.05, maxDelaySeconds: 2 }) // useLimiter defaults to false
  .setOutputMode('hrtf');   // 'hrtf' (binaural) | 'speaker' (stereo panning)
```

The scene has one listener, owned by `SoundTrace`. Pass the camera's active rotation quaternion
(XYZW) as `orientation` unchanged. Head tilt (roll) also reaches the engine (both real-time and
offline IR analysis).

Keys accepted by `setRenderOptions`:

| Key | Meaning |
|---|---|
| `earlyReflectionMode` | Only `'hybrid'` is allowed |
| `useDoppler` | Variable-delay Doppler pitch — always on in real time; `false` is ignored |
| `useLimiter` | Output limiter. Default `false` — the app's Web Audio master bus handles limiting (the SDK turns it off on every render start, HRTF/output change, and reset). `true` enables the true-peak limiter (−1 dBTP, 137-sample latency) |
| `pathFadeTime` | Path appear/disappear crossfade (seconds) |
| `maxDelaySeconds` | Ceiling of the per-source delay ring (seconds). The engine allocates a ring per source only as large as its paths need (floor 0.25 s). The default ceiling on the web platform is 0.5 s |
| `diffuseEnabled` | Late reverb render on/off. Also turns the first-order scattering (diffuse rain) render on and off |

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: { direct: true, reflection: true, diffraction: true, reverberation: true },
});

source.setPose({ position: [1, 1, -2], velocity: [0.5, 0, 0] });
source.setGain(0.8);                          // pressure gain; passed to the engine as energy = gain²
source.setPathEnabled('reverberation', false);
source.setDirection([0, 0, -1]);
```

| API | Description |
|---|---|
| `play(input, channels?)` | Returns the `AudioWorkletNode` the input is connected to. **Its output is silent**; the actual sound comes from `sound.output` |
| `setPose(pose)` / `setGain(g)` | Position, velocity, direction; gain |
| `setPathEnabled(path, on)` / `setPathOptions(o)` / `isPathEnabled(path)` | `'direct'` (includes transmission) / `'reflection'` / `'diffraction'` / `'reverberation'` |
| `setDirection(v)` | Source forward. The orientation is updated along with it using a minimal roll-free rotation |
| `setDirectivityTable(anglesDeg, attenDbPerBand)` / `setDirectivityEnabled(on)` | Converts a per-angle 9-band attenuation table into a Sound-Tracing SDK directivity table and applies it |
| `setEq(eq \| null)` | Source parametric EQ for this source (up to 16 bands, before the engine's band split). `null` removes it — see [EQ](#eq) |
| `dispose()` | Releases the source and its stream |

#### Distance attenuation

Physical `1/r` attenuation and ISO 9613-1 air absorption are applied to every path; the reference
distance (1 m) and minimum distance (1 m) are engine policy. There is no per-source attenuation curve option.

### `Mesh`

```ts
const mesh = sound.addMesh({
  vertices: geometry.attributes.position.array,
  indices: geometry.index.array,
  material: 'concrete',
});

mesh.setPose({
  position: object.position.toArray(),
  orientation: object.quaternion.toArray(),
  scale: object.scale.toArray(),
});
```

Use `indices` when the whole mesh has one material. If you need per-face materials, pass
`triangles` in the form `{ a, b, c, materialIndex }`.

| API | Description |
|---|---|
| `setMaterial(material)` | Replaces the material of the whole mesh. Sound-Tracing SDK materials are immutable, so internally it rebinds to a new material/mesh handle |
| `setMaterialRange(triStart, triCount, material)` | Replaces the material of a triangle range |
| `setUpdateType(type)` / `getUpdateType()` | `'static'` (static TLAS) / `'dynamic'` (transform updates only). `'refit'` and `'rebuild'` are kept for compatibility and recreate the mesh |
| `setPose(pose)` | Updates position, orientation, scale |
| `dispose()` | Releases the mesh and object |

The Sound-Tracing SDK owns the BVH (TinyBVH by default). There are no per-mesh build options.

## Frame updates

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => { updateInFlight = undefined; });
  }
}
```

Pose changes can be recorded quickly, but it is safest to run only one propagation update at a time.

## Lifecycle

`SoundTrace`, `Source`, and `Mesh` support `dispose()`. `SoundTrace.dispose()` cleans up the
SDK-owned resources including the listener and the Worker, and is safe to call multiple times.

## EQ

The Sound-Tracing SDK's parametric EQ can be applied at two points.

- **Source EQ** — applied to the source signal itself, before the engine's band split. Direct, reflection, diffraction, and reverb of that source all get the same tone.
- **Output EQ** — applied to the whole Sound-Tracing SDK mix at the end of the render (before the master gain).

There are six filter types: Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch (cuts are fixed at 12 dB/oct).
Ranges are frequency 20 ~ 20,000 Hz, gain ±24 dB (Peaking and shelves only), Q 0.1 ~ 30 (shelves up to 3), preamp −48 ~ +12 dB.
The default is off, and while off the engine is not called, so the output is the same as with no EQ. Only changed values
are sent, and the engine crossfades to them over 20 ms.

| API | Where it applies |
|---|---|
| `Source.setEq(eq \| null)` | Source EQ for this source (up to 16 bands). `null` removes it |
| `SoundTrace.setOutputEq(eq \| null)` | One global output EQ. `null` turns it off. Kept across `reset()` |

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });
```

- `eq = { enabled = true, preampDb = 0, bands = [] }`, `band = { type = 'peaking', enabled = true, frequencyHz = 1000, gainDb = 0, q = 0.7071 }`
- `type` is a Web Audio `BiquadFilterType` name: `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'`.
- Out-of-range values are rejected with a `RangeError` and no command is sent. `{ enabled: false }` keeps the bands and passes the signal through.
- The applied output EQ is in `debugSnapshot().simplest.output.eq`.

## Related documents

- [Web SDK overview](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
