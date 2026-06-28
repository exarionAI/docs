---
title: Web
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# Web SDK

**soundtrace.js** is a TypeScript/WebAssembly binding for using [STCoreV2](../core/stcorev2.md) in the browser. It connects to an application-owned `AudioContext` like a standard `AudioNode`, and reflects the mesh, material, source, and listener state of a rendering scene such as Three.js into real-time acoustic propagation.

## When to Use It

| Use case | Description |
|---|---|
| Three.js/WebGL apps | Pass visual scene colliders and materials directly into the acoustic scene |
| Browser games and simulators | Update reflection, diffraction, and transmission paths as sources and listeners move |
| Web Audio graphs | Spatialize MP3, streaming, or microphone input through an `AudioWorkletNode` |
| Debugging and visualization | Query valid paths, BVH leaf boxes, and ray/path statistics from JavaScript |

## Installation and Artifacts

The package is distributed as ESM. Normal applications start from the facade
surface on the `soundtrace.js` entry point.

```ts
import {
  SoundTrace,
  workerHostedMtSupport,
  type MeshTriangle,
} from 'soundtrace.js';
```

The package includes the following runtime files.

| Path | Purpose |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |
| `soundtrace.js/assets/hrtf/*.bin` | packaged HRTF tables used by `loadHrtf()` |

Load HRTF explicitly with `loadHrtf('parametric')` or
`loadHrtf('convolution')`. You can use the packaged tables, or pass your own
URL, `ArrayBuffer`, or typed array.

When a bundler needs file URLs for subpath assets, resolve them with `new URL(..., import.meta.url)`.

```ts
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## Quick Start

```ts
import {
  SoundTrace,
  type MeshTriangle,
  workerHostedMtSupport,
} from 'soundtrace.js';

// Run this inside a user click/tap handler.
const ctx = new AudioContext();
await ctx.resume();

const mt = workerHostedMtSupport();
if (!mt.supported) {
  throw new Error(`soundtrace.js mode=multi_thread requires ${mt.missing.join(', ')}`);
}

const sound = await SoundTrace.create(ctx, {
  mode: 'multi_thread',
  throughput: 'max',
  quality: 'balanced',
});

sound.listener
  .setAudioOption({
    sampleRate: ctx.sampleRate,
    inputSampleCount: 128,
    outputChannels: 2,
  })
  .setPose({ position: [0, 0, 0], orientation: [0, 0, 0, 1] });

const vertices = new Float32Array([
  -2, -1, -2,
   2, -1, -2,
   2, -1,  2,
  -2, -1,  2,
]);
const triangles: MeshTriangle[] = [
  { a: 0, b: 1, c: 2, materialIndex: 0 },
  { a: 0, b: 2, c: 3, materialIndex: 0 },
];

const floor = sound.addMesh({
  vertices,
  triangles,
  material: 'Concrete',
});

const source = sound.addSource({
  position: [2, 0, -1],
  gain: 1,
  paths: {
    direct: true,
    reflection: true,
    diffraction: true,
    reverberation: true,
  },
});

await sound.update(0);

const buffer = await fetch('/audio/music.mp3')
  .then((r) => r.arrayBuffer())
  .then((b) => ctx.decodeAudioData(b));

const player = ctx.createBufferSource();
player.buffer = buffer;
player.loop = true;
const spatialNode = await source.play(player, 2);
spatialNode.connect(sound.output).connect(ctx.destination);
player.start();
```

When `mode: 'gpu'` is selected, the chosen `quality` still controls the ray grid
and render options, but GPU propagation depth is fixed at the validated WebGPU
backend cap of `8`.

At runtime, the facade preflight helper can check deployment support:

```ts
import { workerHostedMtSupport } from 'soundtrace.js';

const mt = workerHostedMtSupport();
if (!mt.supported) {
  throw new Error(`soundtrace.js thread=mt requires ${mt.missing.join(', ')}`);
}
```

ST mode also uses an `AudioWorkletNode` for real-time Web Audio integration.
For service deployment, applying the same COOP/COEP headers to both ST and MT
is usually the simplest path.

## Runtime Structure

```
AudioBufferSourceNode
        │
        ▼
AudioWorkletNode  (listener, source pair)
        │
        ▼
sound.output      (GainNode, master output)
        │
        ▼
ctx.destination
```

`soundtrace.js` does not create an `AudioContext` itself. It receives the context owned by the app and returns an `AudioNode` as output. This means regular Web Audio nodes such as EQ, compressors, and master volume can be inserted freely before or after spatialization.

## Thread Modes

| Mode | Option | When to use | Audio path |
|---|---|---|---|
| Multi | `{ thread: 'mt' }` | worker-hosted control plus pthread-enabled propagation | WASM `AudioWorkletProcessor` renders the worker-owned engine session |
| Single | `{ thread: 'st' }` | single-thread WASM binary | WASM `AudioWorkletProcessor` renders the ST engine session |

`thread` is an explicit binary selection, not an automatic fallback policy. ST
and MT do not use the same control topology. In `thread: 'mt'`, the SDK creates
a dedicated control worker. That worker owns the MT WASM module, scene state,
and propagation frame loop; the browser main thread does not call the MT
control loop directly.

MT uses two input lanes:

| Lane | Meaning | Targets |
|---|---|---|
| HOT lane | Latest-value per-frame transforms written through `SharedArrayBuffer` and consumed before the worker frame | `source transform`, `listener transform`, `mesh transform` |
| Command channel | FIFO async operations that must not be dropped | create/delete, material changes, mesh upload, BVH/options, audio source start/stop, reset/dispose, and other non-transform work |

MT mode requires browser cross-origin isolation. The HTML response and every
WASM, worker, and worklet asset must allow `SharedArrayBuffer` and
`crossOriginIsolated === true`.

```txt
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite development server example:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

## Worker-hosted MT Authoring Flow

With `thread: 'mt'` or `mode: 'multi_thread'`, the main thread does not create
native scene objects directly. The supported public flow is the facade and demo
flow.

1. Prepare the control worker and MT WASM with `SoundTrace.create(ctx, { mode: 'multi_thread' })` or `{ thread: 'mt' }`.
2. Add geometry with `sound.addMesh(...)`. The facade manages the material table and mesh lifecycle, while create/delete/material/mesh upload/BVH/options work goes through the command channel.
3. Update listener/source/mesh poses with `sound.listener.setPose(...)`, `source.setPose(...)`, and `mesh.setPose(...)`. These three transforms are delivered through the SharedArrayBuffer-backed HOT lane.
4. Add sources with `const source = sound.addSource(...)`.
5. Send a worker frame request and await the result with `await sound.update(dt)`.
6. Render audio through the `AudioWorkletNode` created by `await source.play(inputNode, 2)`.
7. Read engine-output-style data through async APIs such as `await sound.debugSnapshot(...)`.

`simple.ts` and the `three-basic` demo are the reference examples for this flow.
Synchronous GET-style diagnostics such as `getStatistics()` or
`propagator.getValidPaths()` do not call main-thread native getters in MT; use
async readback through `debugSnapshot()` when needed.

## Advanced direct-native reference

Normal applications should use the facade flow above (`SoundTrace.create`,
`sound.addMesh`, `sound.addSource`, `source.play`, `sound.update`). The
sections below are advanced `thread: 'st'`/direct-native integration reference
for cases that need direct engine objects.

## TypeScript API

### `SoundTrace`

| API | Description |
|---|---|
| `new SoundTrace(audioContext, options)` | Create an instance. Call `load()` before use |
| `SoundTrace.create(audioContext, options)` | Create and `load()` in one step |
| `load()` | Load `st` or `mt` WASM, call `exaInit()`, and create `output` |
| `output` | master `GainNode` |
| `audioContext` | context passed to the constructor |
| `createScene()` | create a `SoundScene` |
| `createObject()` | create a `SoundObject` |
| `createMesh()` | create a `SoundMesh` |
| `createCollider(opts?)` | create a `SoundCollider` that owns a `SoundMesh + SoundObject` pair |
| `createSource()` | create a `SoundSource` |
| `createListener()` | create a `SoundListener`; the listener ID also acts as renderer handle |
| `materials` | global material table wrapper |
| `propagator` | valid path, guide plane, and profile queries |
| `diagnostics` | version, memory trace, and ray statistics queries |
| `createWorkletNode(listener, source, channels = 2)` | create an `AudioWorkletNode` for the selected ST/MT binary |
| `reset()` | reset core state |
| `dispose()` | disconnect output node and release WASM wrapper references |

`SoundTraceOptions`:

| Field | Default | Range / note |
|---|---:|---|
| `thread` | `'st'` | `'st'` or `'mt'`; MT is recommended for production services |
| `coreBaseUrl` | package internal `./core` | Directory containing `st/` and `mt/`, such as `./core`, when self-hosting |
| `propagationThreadCount` | `-1` | native `ExaRuntimeOption.propagationThreadCount`; `-1` uses the native default |
| `defaultMeshBuild` | native default | native `ExaMeshBuildOption` process-wide mesh build default |

```ts
const sound = await SoundTrace.create(ctx, {
  thread: 'mt',
  propagationThreadCount: -1,
  defaultMeshBuild: {
    bvhType: BvhType.LBVH_SIMD8,
    bvhMaxDepth: 16,
    primPerLeaf: 4,
  },
});
```

`propagationThreadCount` and `defaultMeshBuild` are applied through the C API
before native `exaInit()`. Keep `thread: 'st' | 'mt'` as binary selection, and
control BVH/SIMD choice through `BvhType` and mesh build options.

### `SoundScene`

| API | Description |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | manage sound colliders |
| `addCollider(collider)`, `removeCollider(collider)` | attach/detach a `SoundCollider` RAII object |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | manage sound sources |
| `setListener(listener)` | set the single listener for the scene. Replaces the previous listener if present |
| `addListener(listener)`, `removeListener(listener)` | compatibility listener API. Adding a second listener throws |
| `clearListeners()` | detach the current listener |
| `update(dt)` | run `tick(dt)` and then `updatePropagation()` |
| `tick(dt)` | consume object update types and update TLAS/BVH state |
| `updatePropagation()` | execute ray/path propagation |

A scene should contain one listener. If your UI exposes multiple listener candidates, choose the active one and replace it with `setListener()`.

### `SoundObject` and `UpdateType`

| Value | Use |
|---|---|
| `UpdateType.Static` (`0`) | Default. Static collider whose geometry and transform do not change |
| `UpdateType.Refit` (`1`) | Vertex positions change while topology stays the same. Use for skinned/animated colliders |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()`, topology change, BVH option change, or scene add/remove |

:::warning Refit rule
Use `Refit` when a **skinned animation is used as a sound collider**. In that case the BVH must be built with an `LBVH`-family builder. Every frame, update only the vertex buffer with `mesh.updateVertices(vertices)`, mark the object with `UpdateType.Refit`, then run `scene.tick(dt)`. BLAS refit and TLAS refit are handled inside `SoundScene::tick()` when it consumes the update flag.
:::

:::info When Rebuild is required
`SoundMesh.setData()` creates a new internal BVH object. If the object is already attached to a scene, call `object.setUpdateType(UpdateType.Rebuild)` before the next tick. `scene.tick(dt)` reads that flag and performs the BLAS/TLAS rebuild path.
:::

### `SoundMesh`

| API | Description |
|---|---|
| `setData(vertices, triangles, opts?)` | build geometry and BVH from scratch |
| `updateVertices(vertices)` | update only the vertex buffer |
| `updateVerticesAndRefit(vertices)` | update the vertex buffer and refit the mesh |
| `setMaterial(materialIndex)` | change material for all triangles |
| `setMaterialRange(triStart, triCount, materialIndex)` | change material for a triangle range |
| `getBVHWireframe()` | float array for visualizing BVH leaf AABBs |
| `intersect(sceneID, ray)` | raycast against sound meshes in a scene |

Two-level BVH synchronization is handled during scene tick through the `SoundObject` `UpdateType` flag. If topology, triangle list, or BVH options change, call `setData()` again and mark any object already attached to a scene as `UpdateType.Rebuild`. For animated colliders where only vertices change, use `updateVerticesAndRefit()` or `SoundCollider.refitVertices()`.

`MeshBuildOptions`:

| Field | Default | Recommended range | Description |
|---|---:|---:|---|
| `bvhType` | `BvhType.Default` | enum below | `Default(-1)` uses the current native `ExaMeshBuildOption.bvhType` |
| `bvhMaxDepth` | `0` | `0` or `1..32` | `0` or omitted uses the native default |
| `primPerLeaf` | `0` | `0` or `1..32` | `0` or omitted uses the native default |

BVH selection:

| Type | Value | Use |
|---|---:|---|
| `Default` | `-1` | Use current native default mesh build option in `SoundMesh.setData()` |
| `HKDtree` | `0` | **Static sound colliders** such as walls, rooms, and floors whose topology and vertices are fixed. In the current engine it exists as a substitute for `SBVH` |
| `LBVH` | `1` | Dynamic/skinned collider default where vertices change every frame and the scene tick refit path is needed |
| `LBVH_SIMD4` | `2` | SIMD4 LBVH builder |
| `LBVH_SIMD8` | `3` | SIMD8 LBVH builder |
| `LBVH_SIMD16` | `4` | SIMD16 LBVH builder |
| `LBVH_NWAY4` | `5` | 4-way LBVH builder |
| `LBVH_NWAY8` | `6` | 8-way LBVH builder |
| `LBVH_NWAY16` | `7` | 16-way LBVH builder |

`defaultMeshBuild.bvhType` is the native process-wide default and must be a real
builder enum. `BvhType.Default` is only the per-mesh `setData()` sentinel that
means “use the current native default”.

### `SoundCollider`

`SoundCollider` is a higher-level RAII object that owns a `SoundMesh` and `SoundObject` together. It is the preferred collider unit for Three.js and scene-component style integrations because the mesh, object, and scene attachment have one lifetime.

| API | Description |
|---|---|
| `sound.createCollider(opts?)` | create a collider from `vertices`, `triangles`, and BVH options |
| `scene.addCollider(collider)` | add the collider object to the scene and record the attachment |
| `scene.removeCollider(collider)` | remove it from the scene and clear the attachment |
| `collider.rebuild(vertices, triangles, opts?)` | call `mesh.setData(...)` and mark the object as `UpdateType.Rebuild` |
| `collider.refitVertices(vertices)` | update only vertices and mark the object as `UpdateType.Refit` |
| `collider.dispose()` | detach from the scene and dispose the object and mesh together |

The Three.js adapter reads `BufferGeometry.groups[].materialIndex` and the `mesh.material` slot to produce triangle `materialIndex` values. Resolution order is:

1. `material.userData.soundMaterialIndex` or `material.soundMaterialIndex`
2. `materialMap` by slot number, `slot:N`, material `name`, `uuid`, or `type`
3. `defaultMaterialIndex` when no match is found (`0` by default)

Static colliders default to `HKDtree`; `dynamic: true` and skinned colliders default to `LBVH`. Use a SIMD/N-way builder by passing `bvhType` in collider options. For skinned animation, keep topology stable and call `collider.refitVertices(vertices)` each frame.

### `SoundListener`

| API | Description |
|---|---|
| `setPosition(x, y, z)`, `setVelocity(x, y, z)` | listener position and velocity |
| `setOrientation(mat3x3)` | row-major 3x3 orientation matrix. The demo uses `right, up, forward(-Z)` |
| `setOrientationQuat(qx, qy, qz, qw)` | quaternion orientation |
| `setOption(option)` | set propagation options as a batch |
| `setAudioOption(option)` | set audio sample/block/channel options |
| `setPathEnable(pathType, enabled)` | enable/disable direct/reflection/diffraction/reverb/transmission |
| `setRayCount(width, height)` | listener guide ray grid size |
| `setRayDepth(depth)` | maximum path depth |
| `render(sourceID, input, output, channelCount)` | low-level manual render; normal Web Audio integration should use `createWorkletNode()` |
| `setMaxDelay(sourceID, v)` | maximum delay line length |
| `setPathFadeTime(sourceID, v)` | cross-fade time for path changes |
| `setMaxDelayRate(sourceID, v)` | delay change rate limit |

`STOption` parameters:

Use `recommendedSTOption()` for application startup. The current ray-budget caps are
`EXA_LISTENER_WIDTH = 32`, `EXA_LISTENER_HEIGHT = 32`, and `EXA_MAX_DEPTH = 16`;
the recommended runtime starting point is `16 × 16 × depth 3`.

| Field | Recommended preset | Min / max | Why tune it |
|---|---:|---:|---|
| `maxDepth` | `3` | `1..16` | Maximum depth for reflection/diffraction paths. Higher values sound richer but cost grows with `ray count × depth` |
| `listenerWidth` | `16` | `1..32` | Horizontal ray resolution |
| `listenerHeight` | `16` | `1..32` | Vertical ray resolution |
| `seedValue` | `0` | `0..2^32-1` | Random/cache seed. The current C API forces `pathCacheSize` to `0` when this is `0` |
| `maxSoundSource` | `116` | `1..116` | Maximum number of sources tracked in the scene |
| `pathCacheSize` | `16384` | `0..16384` | Path cache capacity. Larger values use more memory; disabled when `seedValue=0` |
| `enableEnergyBasedTermination` | `false` | boolean | Early-terminate paths whose energy is low enough to reduce deep-path cost |
| `energyThreshold` | `0.001` | `0..1` | EBT threshold. `0.01` is close to RT20, `0.001` to RT30, and `0.000001` to a conservative RT60-like setting |
| `samePlaneEpsilonDist` | `0.001` | `0..` | Distance tolerance for merging nearly identical planes, in scene meters |
| `samePlaneEpsilonNormal` | `0.999` | `0..1` | Plane normal similarity. Closer to 1 is stricter |
| `guideRayMethod` | `0` | `0` or `1` | `0 = GridStaggered`, `1 = Fibonacci` |

Avoid changing ray count and depth on every dragged pixel. In UI, applying them on slider release is safer because internal path caches and guide-plane buffers may be reallocated.

`AudioOption` parameters:

| Field | Recommended value | Description |
|---|---:|---|
| `sampleRate` | `ctx.sampleRate` | Must match the browser `AudioContext` |
| `inputSampleCount` | `128` | Number of frames the engine processes at once on the `createWorkletNode()` path |
| `outputChannels` | `2` | HRTF binaural output; stereo is recommended for the current real-time path |

### `SoundSource`

| API | Description |
|---|---|
| `setPosition(x, y, z)` | source position |
| `setDirection(x, y, z)` | direction vector for directional sources |
| `setVelocity(x, y, z)` | velocity for Doppler/dynamic behavior |
| `setIntensity(v)` | source base gain. `1.0` is the reference; avoid negative values |
| `setGainBoostDb(db)` | overall gain boost. Native clamps to `0..20 dB` |
| `setReverbSendDb(db)` | reverb send. Native clamps to `-60..20 dB` |
| `setReflectionSendDb(db)` | reflection send. Native clamps to `-60..20 dB` |
| `setDepth(depth)` | source ray depth. Start at `3`; range is `1..16` |
| `setRayCount(width, height)` | source ray grid. Start at `16 × 16`; cap is `32 × 32` |
| `setDistanceAttenuation(pathType, vec3)` | distance attenuation curve per path type |

Path type:

| Name | Value |
|---|---:|
| `PathType.Direct` | `0` |
| `PathType.Reflection` | `1` |
| `PathType.Diffraction` | `2` |
| `PathType.Reverb` | `3` |
| `PathType.Transmission` | `4` |

Distance attenuation uses `vec3 = { x: constant, y: linear, z: quadratic }`, and the internal calculation has this form.

```txt
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

Keep every coefficient `>= 0`. The demo uses `{ x: 0.001, y: 1.0, z: 0.0 }` for nearly `1 / distance` behavior while using a tiny `constant` to prevent near-field runaway. The `setAllDistanceAttenuations` helper currently covers only direct/reflection/diffraction/reverb, so set transmission separately with `setDistanceAttenuation(PathType.Transmission, value)`.

### `MaterialTable`

| API | Description |
|---|---|
| `sound.materials.add(material)` | add to the global material table and return the index |
| `sound.materials.set(index, material)` | replace an existing material |

### `Propagator`

| API | Description |
|---|---|
| `getValidPathCount()` | current valid path count |
| `getValidPaths(count?)` | query path polylines, energy, and material hits as JS arrays |
| `getGuidePlaneCount(sceneID)`, `getGuidePlanes(sceneID)` | guide plane visualization |
| `getMirrorPositionCount(sceneID)`, `getMirrorPositions(sceneID)` | image-source position visualization |
| `getProfile()` | latest propagation stage timings in ms and path counts |
| `setJobTimingOption({ enabled, frameCapacity })` | configure the native propagation job timing ring buffer |
| `getJobTimingFrames(sceneID, maxFrames?)` | query recent propagation frame/job timing snapshots |
| `resetJobTiming()` | reset job timing snapshots |
| `sortIRDatas()` | request IR data sorting |
| `findAttenuationForDistance(...)` | invert a distance for target attenuation |

The direct-native `Propagator` surface is for ST/direct-native integrations.
Worker-hosted MT applications use the facade command APIs and async debug
snapshot APIs instead of calling `tick()` and `updatePropagation()` on the
browser main thread.

## Sound Material JSON

Default materials are stored in the `_soundMaterials` array in `soundMaterial.json`. The current bundle includes 22 materials, and `ConcreteBlockPainted` type `20` is the default wall/room material in the three.js demo.

```jsonc
{
  "_soundMaterials": [
    {
      "materialType": 0,
      "description": "Concrete",
      "scattering": 0.08,
      "reflection": [0.99, 0.98, 0.94, 0.86, 0.63, 0.40, 0.35, 0.30],
      "absorption": [0.01, 0.02, 0.06, 0.14, 0.37, 0.60, 0.65, 0.70],
      "transmission": [0.005, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001, 0.001]
    }
  ]
}
```

| Field | Range | Description |
|---|---:|---|
| `materialType` | `0..` unique integer | Stable ID referenced by triangle `materialIndex` |
| `description` | string | Name shown in UI and authoring tools |
| `scattering` | `0..1` | `0` favors specular behavior, `1` favors diffuse scattering |
| `reflection` | float[8], each `0..1` | reflection coefficient per 8 frequency bands |
| `absorption` | float[8], each `0..1` | absorption coefficient per 8 frequency bands |
| `transmission` | float[8], each `0..1` | transmission coefficient per 8 frequency bands |

The eight frequency bands are fixed.

```txt
[67.5, 125, 250, 500, 1000, 2000, 4000, 8000] Hz
```

For energy conservation, keep `reflection + absorption + transmission` near or below `1.0` in each band. Some measured or tuned materials may have small deviations, but large excess values can over-amplify path energy.

Runtime loading example:

```ts
const res = await fetch(new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url));
const { _soundMaterials } = await res.json() as {
  _soundMaterials: Array<{
    materialType: number;
    description: string;
    scattering: number;
    reflection: number[];
    absorption: number[];
    transmission: number[];
  }>;
};

for (const m of _soundMaterials) {
  sound.materials.add({
    reflection: m.reflection,
    absorption: m.absorption,
    transmission: m.transmission,
    scattering: m.scattering,
    index: m.materialType,
  });
}
```

Default material list:

| ID | Name | scattering |
|---:|---|---:|
| 0 | Concrete | 0.08 |
| 1 | Fabric | 0.40 |
| 2 | Wood | 0.15 |
| 3 | Brick | 0.25 |
| 4 | ConcreteBlock | 0.35 |
| 5 | Glass | 0.05 |
| 6 | Gravel | 0.65 |
| 7 | GypsumBoard | 0.08 |
| 8 | Linoleum,RubberOrAsphaltTile | 0.05 |
| 9 | Marble | 0.05 |
| 10 | Plaster | 0.06 |
| 11 | Plywood | 0.12 |
| 12 | Sherdded-woodFiberborad | 0.55 |
| 13 | Snow | 0.75 |
| 14 | Soil | 0.60 |
| 15 | Steel | 0.06 |
| 16 | Stone | 0.30 |
| 17 | WaterSurface | 0.03 |
| 18 | TunableAbsorber | 0.20 |
| 19 | LowVarianceTarget | 0.02 |
| 20 | ConcreteBlockPainted | 0.15 |
| 21 | FiberglassReinforcedPlastic | 0.10 |

`soundMaterialAlias.json` is UX convenience data, not an engine feature. It is an auxiliary table for automatically mapping strings from an authoring tool or app layer to canonical materials, and it is not required for `soundtrace.js` core behavior. For example, `cement` and `beton` can map to `concrete`; `timber` and `oak` can map to `wood`. If matching fails, the app can use `defaultMaterialType` as a fallback.

## Three.js Demo

<iframe
  title="soundtrace.js three-basic worker-hosted MT demo"
  src={useBaseUrl('/demos/three-basic/simple.html')}
  style={{display: 'block', width: '100%', height: '486px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

`three-basic` is the `simple.ts` integration example for the Web SDK. The local
docs preview server sends COOP/COEP headers, so MT can be checked directly in
the iframe. Use the same headers when moving the demo to another static host.

Runtime and demo build:

```bash
npm install

cd /path/to/soundtrace.js
npm run build

cd /path/to/soundtrace-three-basic
npm install
SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk
npm run build

cd /path/to/docs
rsync -a --delete /path/to/soundtrace-three-basic/dist/ \
  static/demos/three-basic/

BASE_URL=/docs/ npm run build
npm run serve -- --port 3100
```

For a deployed-path preview such as `http://127.0.0.1:3100/docs/sdk/web`, set
`BASE_URL=/docs/` during build so Docusaurus client routes and static file
prefixes match.

MT check procedure:

1. Confirm `npm run dev` or `npm run serve` sends COOP/COEP headers.
2. Confirm `crossOriginIsolated === true` and `SharedArrayBuffer` are available in the browser.
3. In `simple.html` or the docs iframe, set `Backend` to `mt` and press `Start Audio`.
4. Move the source/listener/mesh and confirm `source transform`, `listener transform`, and `mesh transform` are reflected immediately.

### Bottom Buttons

| Control | Description |
|---|---|
| `Room` | select the material for the full room collider |
| `Collider` | select the material for the static wall and Flair collider |
| `Backend` | choose `st` or `mt` before starting. The selection explicitly chooses the WASM binary |
| `Start Audio` | load WASM, materials, and MP3, then start audio. The default HRTF is applied by native initialization |
| `Move` / `Stop` | move the source along an elliptical path in the room, or stop it at its current position |
| `Wall: On/Off` | add or remove the static wall collider near the listener |
| `Flair: On/Off` | add or remove the FBX skinned animation collider |

`Flair` samples skinned vertices every frame and uses them as a sound collider. This path demonstrates an `LBVH`-family builder with `updateVertices + UpdateType.Refit`. If the demo BVH type is changed to `HKDtree`, treat Flair as a bind-pose static inspection case.

### lil-gui Panel

| Panel | Control | Description |
|---|---|---|
| `Listener · General Rays` | `Width`, `Height` | listener guide ray resolution. Demo range `1..32`, default `32` |
| `Listener · General Rays` | `Depth` | listener guide ray max path depth. Demo range `1..16`, default `7` |
| `Listener · Reverb Rays` | `Width`, `Height` | source reverb ray resolution. Demo range `1..64`, default `16` |
| `Listener · Reverb Rays` | `Depth` | source reverb ray depth. Demo range `1..16`, default `4` |
| `Debug overlays` | `Show Valid Paths` | show propagation result polylines |
| `Debug overlays` | `Show FPS` | show Stats HUD |
| `Colliders · BVH` | `Type` | `Default`, `HKDtree`, `LBVH`, `LBVH_SIMD4/8/16`, `LBVH_NWAY4/8/16` |
| `Colliders · BVH` | `Max Depth` | BVH build depth. Demo range `1..32` |
| `Colliders · BVH` | `Prims / Leaf` | primitives per leaf. Demo range `1..32` |
| `Colliders · BVH` | `Show BVH Boxes` | show leaf AABB wireframes |
| `Render Params` | `Max Delay Rate` | `0.01..0.5`, default `0.03`; limits delay change speed |
| `Render Params` | `Path Fade Time` | `0.005..0.2 s`, default `0.066`; cross-fade for path changes |
| `Render Params` | `Max Path Delay` | `0.1..3.0 s`, default `1.0`; maximum delay line length |

### Mouse Controls

| Action | Description |
|---|---|
| Right-drag | orbit camera around the listener |
| Wheel | zoom |
| Blue arrow | listener forward direction |
| Red arrow | listener right direction |

## Performance Tuning Order

1. Start runtime apps at `Ray Width = 16`, `Ray Height = 16`, and `Ray Depth = 3`.
2. Increase listener `General Rays` and source `Reverb Rays` only as needed.
3. Separate static structures as `HKDtree` and animated colliders as an `LBVH`-family builder.
4. Keep topology stable for animated colliders and update only vertices.
5. If paths change too abruptly, increase `Path Fade Time`; if delay pitch wobble is audible, lower `Max Delay Rate`.
6. Enable valid path and BVH box overlays only during debugging.

The three.js demo is configured for **1 listener + 1 source** and favors high quality and debugging visibility. Gizmos are not required in production apps. In particular, drawing valid paths and BVH boxes copies WASM internal data to JS and rebuilds it as Three.js geometry, so it introduces communication and visualization overhead. Enable it during development and disable it for runtime deployment.

Because the demo is a small scene, it starts listener `General Rays` at `32 × 32 × depth 7` and source `Reverb Rays` at `16 × 16 × depth 4` to show quality and visualization. The general app starting recommendation remains `16 × 16 × depth 3`.

## Troubleshooting

| Symptom | Check |
|---|---|
| Native worklet/MT load fails | Confirm the HTML response has COOP/COEP and `crossOriginIsolated` is `true` |
| `createWorkletNode` error | Confirm `ctx.resume()` ran inside a user gesture and the worklet core asset path is correct |
| No sound | Call `ctx.resume()` inside a user click, confirm `soundMaterial.json` loaded into the material table, and check that the absorption array was not accidentally copied identical to reflection |
| Reflection/diffraction/absorption changes are not audible | Without a sound collider, the scene mainly produces direct sound. Add a collider with geometry and mapped sound materials |
| Directionality feels missing | Confirm listener audio options, orientation, source/listener positions, and collider/material setup |
| Frame rate drops | Lower `Ray Depth`, `Ray Width`, and `Ray Height`. Recommended runtime starting point is `16 × 16 × depth 3` |
| Mono input is silent | The SDK fixes the worklet node channel count to `2`, `explicit`, `speakers`. If you create the node manually, use the same settings |
| Path gizmo looks like it leaves trails | Use only the actual count returned by `getValidPaths()` |
| Ray/path gizmo is not visible | Confirm a sound collider object has been added to the scene |
| Animated collider jumps | Confirm the flow is `LBVH` family, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, then `scene.tick()` |
| Crash after changing BVH options | After `mesh.setData()`, mark the object as `UpdateType.Rebuild` and run `scene.tick()` |

### FAQ: sound plays from only one side

This section is for `soundtrace.js` module users who attach the SDK to an
existing Web Audio app or build a new web app audio graph. The symptom is that
audio is audible, but it leans to one side, HRTF/spatialization does not feel
alive, and moving the source produces little directional change.

This is usually caused by initialization order, audio options, or
application-level channel routing rather than the STCoreV2 core itself. The
examples and recent fixes point to the checklist below.

The points that are easiest to miss during implementation are:

- The real-time HRTF output of `soundtrace.js` is not a hardware 5.1/7.1 bus. It is a `2` channel binaural/stereo render target. A speaker layout still means virtual sources summed to stereo.
- If you create an `AudioWorkletNode` manually and omit `outputChannelCount: [2]`, a 1-output/1-input worklet can start with channel count `1`. The SDK `createWorkletNode()` avoids this by pinning `channelCount = 2`, `channelCountMode = 'explicit'`, and `channelInterpretation = 'speakers'`.
- If low-level code calls `listener.render()` directly, pass `channelCount = 2` and an interleaved input buffer whose length is `frames * 2`. Passing only the frame count or a mono buffer violates the engine's mono-mix/render-buffer contract.
- When an app creates several virtual speaker sources, the browser will not split channels by speaker for you. The app must explicitly route left/right/mix input per source.

Checklist:

1. **Confirm that the SDK wrapper is used.** Do not load only the WASM files by hand. For the facade path, use `SoundTrace`, `sound.listener`, `sound.addSource()`, and `source.play()` from the `soundtrace.js` module. Direct-native combinations such as `SoundListener`, `createWorkletNode`, `recommendedSTOption`, and `PathType` belong only to ST/direct-native integrations.
2. **Call `AudioContext.resume()` immediately inside a user click.** If `resume()` is delayed until after WASM or audio fetches, browser autoplay policy can leave the context `suspended`. Follow the example pattern: create `const resumeP = ctx.resume()` near the start of the click handler and `await resumeP` near the end.
3. **Match listener audio options to the real context.** Use `ctx.sampleRate` for `sampleRate` and `2` for `outputChannels` on the current real-time HRTF path. Use `128` as the `inputSampleCount` baseline for both the facade `source.play()` path and the ST/direct-native `createWorkletNode()` path.
4. **Start with the same pose and quality options as the examples.** On the facade path, use `sound.listener.setPose(...)`, `sound.setQuality(...)`, and `sound.setAudioOption(...)`. Use `listener.setOption(recommendedSTOption())`, `listener.setOrientation(...)`, and `listener.setPosition(...)` directly only in ST/direct-native integrations.
5. **Load materials and colliders before judging spatial behavior.** On the facade path, add materials and colliders with `sound.addMesh(...)`. In ST/direct-native integrations, use `sound.materials`, `createCollider()`, and `scene.addCollider(...)`. Without a collider, the scene is mostly direct sound, so spatial changes can feel weak.
6. **Set stereo node options explicitly in custom Web Audio graphs.** The facade `source.play()` path and the ST/direct-native `createWorkletNode()` path both use `channelCount = 2`, `channelCountMode = 'explicit'`, and `channelInterpretation = 'speakers'`. If you build nodes manually or compose a separate graph, set the same options on the input hub, splitter, merger, and worklet/input nodes.
7. **Route channels explicitly when a speaker layout uses multiple sound sources.** Do not implicitly connect the same stereo input to every source. For example, `L/LS/SL/BL` sources should receive the left channel duplicated to both input frames, `R/RS/SR/BR` should receive the right channel duplicated, and `C/LFE/Mono` should receive `(L + R) * 0.5`.
8. **Fully clean up the graph before replay.** Disconnect old `MediaElementAudioSourceNode`, `AudioBufferSourceNode`, splitter, merger, and gain nodes. Then build a fresh source graph and connect only the soundtrace output to master/destination.
9. **Prime propagation before the first audio block.** After listener, source, and collider setup, call `scene.tick(0)` and `scene.updatePropagation()` once to prepare the initial path state.

Before blaming the SDK core for one-sided sound, check AudioContext resume
timing, audio options, channel routing, and graph lifecycle.

## References

- [SDK Overview](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [Demos](../demos/overview.md)
