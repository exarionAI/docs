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

The package is distributed as ESM, and the public surface is imported from the `soundtrace.js` entry point.

```ts
import {
  SoundTrace,
  UpdateType,
  PathType,
  defaultSTOption,
  type SoundMaterial,
  type Triangle,
} from 'soundtrace.js';
```

The package includes the following runtime files.

| Path | Purpose |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/hrtf/hrtf.bytes` | default HRTF dataset |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |
| `soundtrace.js/assets/soundMaterialAlias.json` | alias table for app-layer automatic mapping |

:::info Distribution contents
The SDK distribution package does not include the `STCoreV2` submodule or full C++ source. The browser runtime ships only the compiled `exaSound.js`/`exaSound.wasm` binaries, TypeScript wrapper, HRTF asset, and material assets.
:::

When a bundler needs file URLs for subpath assets, resolve them with `new URL(..., import.meta.url)`.

```ts
const hrtfUrl = new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url);
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## Quick Start

```ts
import {
  SoundTrace,
  UpdateType,
  defaultSTOption,
  type Triangle,
  type SoundMaterial,
} from 'soundtrace.js';

// Run this inside a user click/tap handler.
const ctx = new AudioContext();
await ctx.resume();

const sound = await SoundTrace.create(ctx, { thread: 'mt' });

const listener = sound.createListener();
const source = sound.createSource();
const scene = sound.createScene().addListener(listener).addSource(source);

await listener.setHRTFFromUrl(
  new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url),
);

listener
  .setOption(defaultSTOption())
  .setAudioOption({
    sampleRate: ctx.sampleRate,
    inputSampleCount: 128,
    outputChannels: 2,
  })
  .setOrientation([1, 0, 0, 0, 1, 0, 0, 0, -1])
  .setRayCount(32, 32)
  .setRayDepth(7)
  .setPosition(0, 0, 0);

source
  .setIntensity(1)
  .setDepth(4)
  .setRayCount(64, 64)
  .setPosition(2, 0, -1);

const material: SoundMaterial = {
  reflection:   [0.95, 0.95, 0.92, 0.88, 0.80, 0.70, 0.65, 0.60],
  absorption:   [0.05, 0.05, 0.08, 0.12, 0.20, 0.30, 0.35, 0.40],
  transmission: [0.01, 0.01, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001],
  scattering: 0.12,
  index: 0,
};
sound.materials.add(material);

const vertices = new Float32Array([
  -2, -1, -2,
   2, -1, -2,
   2, -1,  2,
  -2, -1,  2,
]);
const triangles: Triangle[] = [
  { a: 0, b: 1, c: 2, materialIndex: 0 },
  { a: 0, b: 2, c: 3, materialIndex: 0 },
];

const mesh = sound.createMesh();
mesh.setData(vertices, triangles, { bvhType: 0, bvhMaxDepth: 16, primPerLeaf: 4 });

const floor = sound.createObject().setMesh(mesh.id);
floor.setUpdateType(UpdateType.Rebuild);
scene.addObject(floor);

scene.tick(0);
scene.updatePropagation();

const spatialNode = await sound.createWorkletNode(listener, source, 2);
const buffer = await fetch('/audio/music.mp3')
  .then((r) => r.arrayBuffer())
  .then((b) => ctx.decodeAudioData(b));

const player = ctx.createBufferSource();
player.buffer = buffer;
player.loop = true;
player.connect(spatialNode).connect(sound.output).connect(ctx.destination);
player.start();
```

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
| Multi | `{ thread: 'mt' }` | Recommended when deployment can use `SharedArrayBuffer` and COOP/COEP headers | WASM renders directly inside `AudioWorkletProcessor` |
| Single | `{ thread: 'st' }` | Use when headers are constrained or when first checking a simple scene | JS main thread block render, then worklet/ring or fallback delivery |

MT mode requires `crossOriginIsolated === true` in the browser. Set the following headers on the HTML response.

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

## Scene Authoring Flow

1. Load the WASM core with `SoundTrace.create(ctx, options)`.
2. Create `createScene()`, `createListener()`, and `createSource()`, then add them to the scene.
3. Pass vertices, triangles, and BVH options to `createMesh()`.
4. Assign the mesh ID and transform to `createObject()`, then add the object to the scene.
5. Update moving sources, listeners, and colliders each frame.
6. Refresh propagation results with `scene.tick(dt)` and `scene.updatePropagation()`.
7. In MT mode the worklet renders audio; in ST mode you can manually pump the `listener.render()` fallback.

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
| `createSource()` | create a `SoundSource` |
| `createListener()` | create a `SoundListener`; the listener ID also acts as renderer handle |
| `materials` | global material table wrapper |
| `propagator` | valid path, guide plane, and profile queries |
| `diagnostics` | version, memory trace, and ray statistics queries |
| `createWorkletNode(listener, source, channels = 2)` | create an `AudioWorkletNode` for MT mode |
| `reset()` | reset core state |
| `dispose()` | disconnect output node and release WASM wrapper references |

`SoundTraceOptions`:

| Field | Default | Range / note |
|---|---:|---|
| `thread` | `'st'` | `'st'` or `'mt'`; MT is recommended for production services |
| `coreBaseUrl` | package internal `./core` | Directory containing `st/` and `mt/`, such as `./core`, when self-hosting |

### `SoundScene`

| API | Description |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | manage sound colliders |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | manage sound sources |
| `addListener(listener)`, `removeListener(listener)` | manage listeners |
| `tick(dt)` | consume object update types and update TLAS/BVH state |
| `updatePropagation()` | execute ray/path propagation |

### `SoundObject` and `UpdateType`

| Value | Use |
|---|---|
| `UpdateType.Static` (`0`) | Default. Static collider whose geometry and transform do not change |
| `UpdateType.Refit` (`1`) | Vertex positions change while topology stays the same. Use for skinned/animated colliders |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()`, topology change, BVH option change, or scene add/remove |

:::warning Refit rule
Use `Refit` when a **skinned animation is used as a sound collider**. In that case the BVH must be built with `LBVH`. Every frame, update only the vertex buffer with `mesh.updateVertices(vertices)`, mark the object with `UpdateType.Refit`, then run `scene.tick(dt)`. BLAS refit and TLAS refit are handled inside `SoundScene::tick()` when it consumes the update flag.
:::

:::info When Rebuild is required
`SoundMesh.setData()` creates a new internal BVH object. If the object is already attached to a scene, call `object.setUpdateType(UpdateType.Rebuild)` before the next tick. `scene.tick(dt)` reads that flag and performs the BLAS/TLAS rebuild path.
:::

### `SoundMesh`

| API | Description |
|---|---|
| `setData(vertices, triangles, opts?)` | build geometry and BVH from scratch |
| `updateVertices(vertices)` | update only the vertex buffer |
| `setMaterial(materialIndex)` | change material for all triangles |
| `setMaterialRange(triStart, triCount, materialIndex)` | change material for a triangle range |
| `getBVHWireframe()` | float array for visualizing BVH leaf AABBs |
| `intersect(sceneID, ray)` | raycast against sound meshes in a scene |

The Web SDK does not expose BLAS refit/rebuild as separate mesh methods. Two-level BVH synchronization is handled during scene tick through the `SoundObject` `UpdateType` flag. If topology, triangle list, or BVH options change, call `setData()` again and mark any object already attached to a scene as `UpdateType.Rebuild`.

`MeshBuildOptions`:

| Field | Default | Recommended range | Description |
|---|---:|---:|---|
| `bvhType` | `0` | `0` or `1` | `0 = HKDtree`, `1 = LBVH` |
| `bvhMaxDepth` | `24` | `1..32` | Maximum tree depth. Deeper trees can create smaller leaves but increase build cost |
| `primPerLeaf` | `4` | `1..32` | Primitive count per leaf. Lower values increase nodes; higher values increase triangle tests inside leaves |

BVH selection:

| Type | Value | Use |
|---|---:|---|
| `HKDtree` | `0` | **Static sound colliders** such as walls, rooms, and floors whose topology and vertices are fixed. In the current engine it exists as a substitute for `SBVH` |
| `LBVH` | `1` | **Required for dynamic/skinned colliders** where vertices change every frame and the scene tick refit path is needed |

Names such as `SBVH` and `WBVH` still exist in `SpatialBuilder`, but only `HKDtree` and `LBVH` are connected to the Web SDK `SoundMesh.setData()` path. Do not pass other values.

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
| `setHRTFFromUrl(url)` | fetch and apply an HRTF file |
| `setHRTFFromMemory(buffer)` | apply HRTF binary data directly |
| `render(sourceID, input, output, channelCount)` | manual ST fallback render |
| `setMaxDelay(sourceID, v)` | maximum delay line length |
| `setPathFadeTime(sourceID, v)` | cross-fade time for path changes |
| `setMaxDelayRate(sourceID, v)` | delay change rate limit |

`STOption` parameters:

| Field | Default | Min / max | Why tune it |
|---|---:|---:|---|
| `maxDepth` | `16` | `1..16` | Maximum depth for reflection/diffraction paths. Higher values sound richer but cost grows with `ray count × depth` |
| `listenerWidth` | `32` | recommended `1..32`, hard cap `255` | Horizontal ray resolution. The demo validation range is `1..32` |
| `listenerHeight` | `32` | recommended `1..32`, hard cap `255` | Vertical ray resolution |
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
| `inputSampleCount` | MT `128`, ST `sampleRate / 100` or fallback `1024` | Number of frames the engine processes at once |
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
| `setDepth(depth)` | source ray depth. Demo default is `4`; recommended real-use range is `1..16` |
| `setRayCount(width, height)` | source ray grid. Demo default is `64 × 64` |
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
| `sortIRDatas()` | request IR data sorting |
| `findAttenuationForDistance(...)` | invert a distance for target attenuation |
| `startBackgroundLoop(sceneID, intervalMs = 16)` | run tick + propagation on an engine pthread in MT WASM |
| `stopBackgroundLoop()` | stop the background loop |

The Web MT background loop is an auxiliary API provided because of browser WASM memory sharing constraints. Native SDKs keep the model where the caller runs `tick()` and `updatePropagation()` from their own thread/job system.

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
  title="soundtrace.js three.js static single-thread demo"
  src={useBaseUrl('/demos/three-basic/?thread=st')}
  style={{display: 'block', width: '85%', height: '540px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

Run locally:

```bash
cd /Users/ethanjung/dev/soundtrace.js
npm install
npm run build
cd examples/three-basic
npm install
npm run dev
```

The Vite dev server sets COOP/COEP headers by default, so MT mode can also be tested. The iframe embedded in this documentation is fixed to `?thread=st` so it works on static hosting without COOP/COEP headers.

### Bottom Buttons

| Control | Description |
|---|---|
| `Room` | select the material for the full room collider |
| `Collider` | select the material for the static wall and Flair collider |
| `Thread` | choose `Single` or `Multi` before starting. If MT is unavailable, it automatically locks to ST |
| `Start Audio` | load WASM, materials, HRTF, and MP3, then start audio. A user click is required by browser autoplay policy |
| `Move` / `Stop` | move the source along an elliptical path in the room, or stop it at its current position |
| `Wall: On/Off` | add or remove the static wall collider near the listener |
| `Flair: On/Off` | add or remove the FBX skinned animation collider |

`Flair` samples skinned vertices every frame and uses them as a sound collider. This path demonstrates the `LBVH + updateVertices + UpdateType.Refit` combination. If the demo BVH type is changed to `HKDtree`, treat Flair as a bind-pose static inspection case.

### lil-gui Panel

| Panel | Control | Description |
|---|---|---|
| `Listener` | `Ray Width`, `Ray Height` | listener guide ray resolution. Demo range `1..32` |
| `Listener` | `Ray Depth` | maximum path depth. Demo range `1..16`, default `7` |
| `Debug overlays` | `Show Valid Paths` | show propagation result polylines |
| `Debug overlays` | `Show FPS` | show Stats HUD |
| `Colliders · BVH` | `Type` | `HKDtree` or `LBVH` |
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
2. Increase listener `Ray Width × Ray Height × Ray Depth` only as needed.
3. Separate static structures as `HKDtree` and animated colliders as `LBVH`.
4. Keep topology stable for animated colliders and update only vertices.
5. If paths change too abruptly, increase `Path Fade Time`; if delay pitch wobble is audible, lower `Max Delay Rate`.
6. Enable valid path and BVH box overlays only during debugging.

The three.js demo is configured for **1 listener + 1 source** and favors high quality and debugging visibility. Gizmos are not required in production apps. In particular, drawing valid paths and BVH boxes copies WASM internal data to JS and rebuilds it as Three.js geometry, so it introduces communication and visualization overhead. Enable it during development and disable it for runtime deployment.

## Troubleshooting

| Symptom | Check |
|---|---|
| MT load fails | Confirm the HTML response has COOP/COEP and `crossOriginIsolated` is `true` |
| `createWorkletNode` error | Confirm `SoundTrace` was created with `{ thread: 'mt' }` |
| No sound | Call `ctx.resume()` inside a user click, confirm `soundMaterial.json` loaded into the material table, and check that the absorption array was not accidentally copied identical to reflection |
| Directionality feels missing | Confirm the HRTF asset (`hrtf.bytes`) loaded successfully |
| Frame rate drops | Lower `Ray Depth`, `Ray Width`, and `Ray Height`. Recommended runtime starting point is `16 × 16 × depth 3` |
| Mono input is silent | The SDK fixes the worklet node channel count to `2`, `explicit`, `speakers`. If you create the node manually, use the same settings |
| Path gizmo looks like it leaves trails | Use only the actual count returned by `getValidPaths()` |
| Ray/path gizmo is not visible | Confirm a sound collider object has been added to the scene |
| Animated collider jumps | Confirm the flow is `LBVH`, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, then `scene.tick()` |
| Crash after changing BVH options | After `mesh.setData()`, mark the object as `UpdateType.Rebuild` and run `scene.tick()` |

## References

- [SDK Overview](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [Demos](../demos/overview.md)
