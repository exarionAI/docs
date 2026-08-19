---
title: Facade API
description: The recommended soundtrace.js API, identical on ST and MT.
---

# Facade API

The facade is the recommended entry point for a typical web application.
`SoundTrace` owns the scene lifecycle, and `Listener`, `Source`, and `Mesh`
represent your application's 3D state.

[Web SDK overview](../web.md) · [Native API](./native.md)

## Basic flow

```ts
const sound = await SoundTrace.create(audioContext, options);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

const spatial = await source.play(inputNode);
spatial.connect(sound.output).connect(audioContext.destination);

await sound.update(0);
```

This call flow is the same on ST and on worker-hosted MT. Instead of MT's
synchronous native getters, use asynchronous readbacks such as
`debugSnapshot()`.

## `SoundTrace` options

| Option | Default | Description |
|---|---|---|
| `mode` | unset | One of `'single_thread'`, `'multi_thread'`, `'gpu'` |
| `thread` | `'auto'` | Advanced WASM selection: `'auto'`, `'st'`, `'mt'`; `mode` wins |
| `quality` | `'balanced'` | `'fast'`, `'balanced'`, `'quality'` |
| `throughput` | unset | MT worker budget: `'low'`, `'medium'`, `'max'` |
| `coordinateBasis` | core frame | Converts the renderer's coordinate frame to the SDK's |
| `coreBaseUrl` | inside the package | URL holding the `st/` and `mt/` cores |
| `assetBaseUrl` | inside the package | URL for material and HRTF assets |
| `propagationThreadCount` | engine default | Low-level override for MT propagation thread count |
| `defaultMeshBuild` | engine default | Default BVH build options used by `addMesh()` |
| `sceneRatio` | `1.0` | Meters per scene length unit. Never combine with pre-scaled geometry (double scaling) |
| `autoLoadMaterials` | `true` | Load the default materials so name-based mapping works |
| `transmissionModel` | `'surface'` | How the direct path loses energy crossing a material. See [Material transmission model](#material-transmission-model) |
| `debug` | `false` | Emit an initialization diagnostic log line |

Three.js cameras look down `-Z`, so this basis is a good starting point.

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
```

## Core API

### `SoundTrace`

| API | Description |
|---|---|
| `SoundTrace.create(ctx, options?)` | Construct and load the engine (constructor + `load()`) |
| `output` / `audioContext` | The master output node and the `AudioContext` you passed in |
| `listener` | The scene's single listener |
| `addMesh(options)` | Add acoustic geometry |
| `removeMesh(mesh)` | Remove geometry |
| `addSource(options)` | Add a spatial sound source |
| `setQuality(tier)` | Change the quality preset |
| `setAudioOption(options)` | Override block size and output channels |
| `loadHrtf(mode, source?)` | Load a packaged or custom HRTF table |
| `loadMaterialAssets()` | Load the material table manually (when `autoLoadMaterials: false`) |
| `enableGpu()` | Turn on WebGPU propagation and report success; `false` keeps the CPU path |
| `update(dt?)` | Advance the scene and run propagation |
| `debugSnapshot(options?)` | MT-compatible asynchronous diagnostics snapshot |
| `getStatistics(options?)` | Valid-path, ray, and memory statistics (async) |
| `getGpuStats()` | GPU dispatch/fallback counters (async) |
| `getIRs()` | Per-path impulse responses from the latest propagation (async) |
| `renderMonoImpulseResponse(source, sec)` | Offline mono IR render; requires a 1-channel output |
| `reset()` | Reset engine state (async) |
| `dispose()` | Release SDK-owned resources. Idempotent, works with `using` |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: [0, 0, 0, 1] })
  .setRenderOptions({ hrtfQuality: 'medium' });
```

A scene has exactly one listener. `SoundTrace` owns it, so you never dispose it
separately.

Switch the output renderer with `setOutputMode()`. The default `'hrtf'` is the
binaural renderer; `'speaker'` selects the internal Ambisonic speaker renderer
(1ch/2ch). HRTF modes and loaded HRTF tables apply to `'hrtf'` output only.

```ts
sound.listener.setOutputMode('speaker');
```

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: {
    direct: true,
    reflection: true,
    diffraction: true,
    reverberation: true,
  },
});

source.setPose({ position: [1, 1, -2] });
source.setGain(0.8);
source.setPathEnabled('reverberation', false);
```

`play(input, channels?)` returns an `AudioWorkletNode` with the input wired in.
Your application connects the output to `sound.output` or to another Web Audio
graph.

#### Distance attenuation

`addSource()` applies the default attenuation coefficients
`{ constant: 1, linear: 0, quadratic: 1 }` to all five path types.

```text
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

So the default curve is `1 / (1 + distance²)`. `constant = 1` keeps the gain
from blowing up near distance 0, and `quadratic = 1` gives roughly
inverse-square falloff.

#### Directivity

To make a source directional, register a per-angle band attenuation table and
enable it.

```ts
source.setDirection([0, 0, -1]);
source.setDirectivityTable(anglesDeg, attenDbPerBand);
source.setDirectivityEnabled(true);
```

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

`indices` is convenient when the whole mesh uses one material. For per-face
materials, pass `triangles` as `{ a, b, c, materialIndex }` records instead.

Material and update policy can also change after creation.

| API | Description |
|---|---|
| `setMaterial(material)` | Replace the material for the whole mesh |
| `setMaterialRange(triStart, triCount, material)` | Replace the material for a triangle range |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`, `'refit'`, `'rebuild'`, `'dynamic'` |
| `setPose(pose)` | Update position, orientation, and scale |
| `dispose()` | Release the mesh and its collider |

Use `'static'` for walls that never move, `'refit'` when only vertices change,
and `'rebuild'` when topology changes.

## Material transmission model

`transmissionModel` selects how the direct path loses energy when it crosses a
material such as a wall.

| Value | Behavior |
|---|---|
| `'surface'` (default) | Applies the material's transmission coefficient once per surface crossed, regardless of wall thickness |
| `'solid'` | Thickness-aware: applies the material's per-band distances over the chord the ray travels inside the solid, so a thicker wall blocks more |

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  transmissionModel: 'solid',
});
```

`'solid'` only switches over materials that ship an authored thickness; the rest
keep `'surface'` behavior. In the default material table, 15 of the 22 materials
carry a thickness.

:::warning
This is opt-in — it changes how loud sources are through walls, so leave the
default in place if an existing scene has to keep sounding the same.
:::

## Propagation path cache

Every session starts with the propagation path cache **on** (fixed seed, size
512). It is applied before the first frame on both ST and MT and re-applied
after `reset()`, so there is no API to call to turn it on.

## Frame updates

Pose changes can be recorded quickly, but it is safest to keep only one
propagation update in flight at a time.

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => {
      updateInFlight = undefined;
    });
  }
}
```

## Lifecycle

`SoundTrace`, `Source`, and `Mesh` all support `dispose()`.
`SoundTrace.dispose()` cleans up every SDK-owned resource including the
listener, and is safe to call more than once.

```ts
source.dispose();
mesh.dispose();
sound.dispose();
```

## Related documents

- [Web SDK overview](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
