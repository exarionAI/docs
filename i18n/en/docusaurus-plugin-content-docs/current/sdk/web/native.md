---
title: Native API
description: The low-level single-thread API of soundtrace.js and its current support scope.
---

# Native API

The Native API is for advanced single-thread integrations that need direct
control over scenes, listeners, sources, meshes, and BVHs. Ordinary
applications should use the [Facade API](./facade.md).

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
import {
  BvhType,
  PathType,
  UpdateType,
  type MeshBuildOptions,
} from '@exarionai/soundtrace.js/native';
```

## Support scope

:::warning Current public type contract
`@exarionai/soundtrace.js/native` exports the low-level classes and types, but
the public return type of `SoundTrace.create()` is still the facade. A complete
direct-native TypeScript entry flow through factories such as `createScene()`,
`createListener()`, and `createSource()` is therefore not yet offered as a
public contract.

Until the public types expand, use the facade. Casts into internal
implementations and private deep imports carry no version-compatibility
guarantee.
:::

Direct-native control is also ST-only. On worker-hosted MT, the following
surfaces throw `SoundTraceMtUnsupportedError`.

- `createScene()`, `createListener()`, `createSource()`
- `createMesh()`, `createObject()`, `createCollider()`
- `materials`, `propagator`, `diagnostics`
- `createWorkletNode()`
- Synchronous native getters

MT applications should use the facade together with
`await sound.debugSnapshot()`.

## Object model

| Object | Role |
|---|---|
| `SoundScene` | Owns objects, sources, and the single listener; runs propagation |
| `SoundListener` | Manages listener pose, ray settings, and render options |
| `SoundSource` | Manages source pose, gain, and per-path options |
| `SoundMesh` | Manages triangle geometry and its BLAS |
| `SoundObject` | Manages scene transforms and mesh instances |
| `SoundCollider` | Binds the lifecycles of a `SoundMesh` and a `SoundObject` |
| `MaterialTable` | Registers per-frequency-band materials |
| `Propagator` | Queries valid paths and profiles |
| `Diagnostics` | Queries ray, memory, and runtime diagnostics |

## Scene updates

A low-level scene is advanced in this order.

```ts
scene.tick(dt);
scene.updatePropagation();
```

`scene.update(dt)` is shorthand for running both in sequence.

A scene has exactly one listener.

```ts
scene.setListener(listener);
scene.addSource(source);
scene.addCollider(collider);
```

## Geometry changes

| Change | API | Update type |
|---|---|---|
| Transform only | `object.setPosition(...)` and friends | Updated to match the object's state |
| Vertices only | `mesh.updateVerticesAndRefit(...)` | `UpdateType.Refit` |
| Topology or BVH options | `mesh.setData(...)` | `UpdateType.Rebuild` |

Use refit for animated geometry that keeps its topology — skinned animation and procedural
deformation — together with a refit-capable LBVH family.

A vertex update is the core's `exaMeshUpdateVertices` → `exaMeshRefit` two-call protocol.
`mesh.updateVertices()` only uploads the vertices and does not refit the BVH, so call
`mesh.updateVerticesAndRefit()`, which does both, or follow up with `mesh.refit()` yourself. The
vertex count must exactly match the count the mesh was built with.

```ts
mesh.updateVerticesAndRefit(vertices);  // updateVertices + refit
object.setUpdateType(UpdateType.Refit);
scene.tick(dt);
```

`SoundCollider` folds both steps into one call.

```ts
collider.refitVertices(vertices);  // updateVerticesAndRefit + setUpdateType(Refit)
scene.tick(dt);
```

When topology changes, ask for a rebuild explicitly.

```ts
mesh.setData(vertices, triangles, buildOptions);
object.setUpdateType(UpdateType.Rebuild);
scene.tick(dt);
```

`collider.rebuild(vertices, triangles, buildOptions)` performs the same combination.

## BVH selection

| Type | Use for |
|---|---|
| `BvhType.HKDtree` | Static geometry such as walls and floors |
| `BvhType.LBVH` | Geometry whose vertices change often |
| `BvhType.LBVH_SIMD*` | LBVH with an explicit SIMD width |
| `BvhType.LBVH_NWAY*` | N-way LBVH |

`BvhType.Default` is a per-mesh sentinel meaning "follow the engine default".
Use a concrete BVH type when setting a process-wide default.

```ts
const buildOptions: MeshBuildOptions = {
  bvhType: BvhType.HKDtree,
  bvhMaxDepth: 0,
  primPerLeaf: 0,
};
```

## Audio

Native realtime rendering also uses an `AudioWorkletNode`. The base contract is:

- Sample rate: `AudioContext.sampleRate`
- Block size: 128 samples
- Output: 2-channel binaural

The facade's `source.play()` manages this setup and the graph connections. Use
direct-native `createWorkletNode()` from application code only once its public
factory types are provided.

## Diagnostics

| What you need | Facade | Native ST |
|---|---|---|
| Valid paths and profiles | `await debugSnapshot()` | `Propagator` |
| Ray and memory statistics | `await debugSnapshot()` | `Diagnostics` |
| Poses the app has set | Entity state | Native object getters |

On MT, never read propagation results through synchronous getters.

## Related documents

- [Web SDK overview](../web.md)
- [Facade API](./facade.md)
- [Performance Guide](../performance.md)
