---
title: STCoreV2
---

# STCoreV2

**The next-generation Sound Tracing core with modular acoustic path search and lock-free data delivery.**

STCoreV2 is the successor line to [STCore](./stcore.md). It is a C++ library that synthesizes impulse responses (IRs) and spatial audio in real time from meshes, materials, listeners, and sound sources.

## Overview

| Item | Value |
|---|---|
| Baseline branch | `feat/lock-free-hybrid-v2-reverb` (lock-free reverb) |
| Primary language | C++ (C++17 build, C API exposed) |
| Build system | CMake 3.22+ |
| Platforms | macOS · Windows · Linux |
| Web build | Emscripten support (`EMSCRIPTEN_KEEPALIVE` export) |
| Accelerator | Built-in BVH **or** external callback such as a game engine BVH |
| Max Path Depth | **64** (`EXA_MAX_DEPTH_LIMIT`) |
| Tests | Google Test (unit + benchmark) |
| Status | Active development |

## Architecture

```
                Scene
                  │
                  ▼
        SceneSnapshot  ── lock-free per-tick snapshot
                  │       (TripleBuffer · POD · immutable)
                  ▼
        ┌─────────────────────────────────────────────┐
        │  Propagation                                │
        │   ├ IAccelerator                            │
        │   │   ├ Internal BVH                        │
        │   │   └ ExternalAccelerator (callback)      │
        │   └ Path Modules  (IPathModule)             │
        │       ├ SpecularReflectionModule            │
        │       ├ UTDDiffractionModule                │
        │       ├ DiffuseOffsetModule                 │
        │       └ StaticReverbModule                  │
        │       (+ ScatterHandoff, ComparisonReport)  │
        └─────────────────────────────────────────────┘
                  │
                  ▼
        Auralizator (filter / frequence / HRTF / states)
                  │
                  ▼
              Audio Output
```

The engine has four main layers.

- **Scene → Snapshot** — every tick, scene state is captured into a POD-based `SceneSnapshot` and delivered lock-free to propagation and render threads through `TripleBuffer`.
- **Propagation (modular)** — four modules run on the common `IPathModule` interface, making it possible to swap algorithms and compare numeric behavior. The accelerator can use an internal BVH or delegate to a host-side BVH through callbacks.
- **Auralizator** — tracked paths are synthesized into IRs, then filters, frequency decomposition, and HRTF are applied to produce spatial audio.
- **Audio Output** — channel-mapped output is returned to the caller.

## Module Layout

```
exaSound/
├── src/
│   ├── core/                    # engine core
│   │   ├── EngineConfig         #  engine settings
│   │   ├── SceneSnapshot         #  immutable per-tick snapshot
│   │   ├── SnapshotBuilder       #  snapshot builder
│   │   ├── ExternalAccelerator   #  external BVH callback
│   │   ├── IAccelerator          #  accelerator abstraction
│   │   ├── Handle / Ref / FixedPool / PoolAllocator
│   │   ├── ThreadAffinity / Telemetry
│   │   └── PropagationResult
│   ├── propagation/
│   │   ├── Propagator            #  top-level dispatch
│   │   ├── RGC                   #  Ray Generation Cluster
│   │   ├── module/               #  Path Module abstraction
│   │   │   ├── IPathModule       #   common interface
│   │   │   ├── PathModuleRegistry
│   │   │   ├── reflection/       #   SpecularReflectionModule
│   │   │   ├── diffraction/      #   UTDDiffractionModule
│   │   │   ├── diffuse/          #   DiffuseOffsetModule
│   │   │   └── reverb/           #   StaticReverbModule
│   │   ├── UTDDiffraction.hpp    #  UTD formula
│   │   └── Ray/                  #  ray and plane utilities
│   ├── auralizator/              # auralization
│   │   ├── core / filter / frequence / HRTF / states
│   ├── scene/
│   │   ├── SoundObject           #  Object / Mesh / Preprocessing
│   │   └── BVH                   #  Native BVH/TLAS
│   ├── math/, utils/, objects/, config/
│   ├── exasound.h                # C++ main header
│   └── exasoundC.h               # **public C API**
├── tests/                        # Google Test
└── demo/                         # demos
```

## Public C API

The public interface is a C linkage API (`exasoundC.h`, **about 120 exports**).

| Category | Representative functions |
|---|---|
| Lifecycle | `exaInit`, `exaReset`, `exaGetVersion`, `exaGetPathTypeCount` |
| Scene | `exaNewScene`, `exaTickScene`, `exaSceneAddObject/Source/Listener` |
| Object | `exaNewObject`, `exaObjectSetPosition/Rotation/Scale/Mesh`, `exaObjectSetUpdateType` |
| Mesh | `exaNewMesh`, `exaMeshSetData`, `exaMeshUpdateVertices`, `exaMeshRefit`, `exaMeshSetMaterial` |
| Material | `exaAddSoundMaterial`, `exaSetSoundMaterial` |
| SoundSource | `exaNewSoundSource`, `exaSoundSourceSetPosition/Direction/Velocity/Intensity` |
| Listener (basic) | `exaNewListener`, `exaListenerSetPosition/Orientation/Velocity`, `exaListenerSetRayCount/RayDepth` |
| Listener (HRTF) | `exaListenerSetHRTFFromFile/Memory` |
| Renderer | `exaCreateRenderer`, `exaRenderSound`, `exaRemoveRenderer` |
| Results | `exaGetValidPathCount`, `exaGetValidPaths`, `exaGetSortedIRDatas` |
| Diagnostics/visualization | `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot`, `exaGetLastError` |

## Getting Started

### Requirements

- CMake 3.22 or newer
- C++17-compatible compiler
- macOS · Windows · Linux

### Build

```bash
cd exaSound
cmake -S . -B build
cmake --build build
```

With tests:

```bash
cmake -S . -B build -DBUILD_TESTS=ON
cmake --build build --target unit_tests
./build/tests/unit/unit_tests
```

### Minimal Usage Scenario (Pseudocode)

```c
#include "exasoundC.h"

// 1. Initialize the engine
exaInit();

// 2. Create a scene
int sceneID = exaNewScene();

// 3. Register a mesh and assign material
int meshID = exaNewMesh();
exaMeshSetData(meshID, vertices, vertexCount, indices, indexCount);
exaMeshSetMaterial(meshID, materialIndex);

// 4. Attach the mesh to an object and add it to the scene
int objID = exaNewObject();
exaObjectSetMesh(objID, meshID);
exaObjectSetPosition(objID, 0.f, 0.f, 0.f);
exaSceneAddObject(sceneID, objID);

// 5. Configure source and listener
int srcID = exaNewSoundSource();
exaSoundSourceSetPosition(srcID, 1.f, 1.f, 0.f);
exaSoundSourceSetIntensity(srcID, 1.0f);
exaSceneAddSource(sceneID, srcID);

int listenerID = exaNewListener();
exaListenerSetPosition(listenerID, -1.f, 1.f, 0.f);
exaListenerSetRayCount(listenerID, 4096);
exaListenerSetRayDepth(listenerID, 16);    // up to EXA_MAX_DEPTH = 64
exaSceneAddListener(sceneID, listenerID);

// 6. Simulate and render audio each frame
for (;;) {
  exaTickScene(sceneID, deltaTime);
  exaRenderSound(/* render args */);
  // Query results through exaGetValidPaths / exaGetSortedIRDatas
}

// 7. Clean up
exaReset();
```

> This is pseudocode that shows the API flow. Check `exasoundC.h` for the actual signatures.

## Core Concepts

### Path Module Structure

Propagation algorithms are separated into four modules inside the internal pipeline.

| Module | Path type | Location |
|---|---|---|
| `SpecularReflectionModule` | specular reflection | `propagation/module/reflection/` |
| `UTDDiffractionModule` | diffraction (UTD) | `propagation/module/diffraction/` |
| `DiffuseOffsetModule` | scattering | `propagation/module/diffuse/` |
| `StaticReverbModule` | static reverb | `propagation/module/reverb/` |

Each module implements `IPathModule` and runs in two phases.

1. **Phase 1 — `buildSetupPlanes`**: construct SetupPlanes from guide ray results
2. **Phase 2 — `validatePaths`**: trace and validate paths, then write valid paths to the output buffer

Path state is handed from Specular to Diffuse through `ScatterHandoffEntry`.

### Lock-Free Snapshot (`SceneSnapshot`)

Scene state is captured every tick as an immutable POD snapshot.

- All structures are flat arrays, non-virtual, and free of heap pointers, so values can be copied into `TripleBuffer` slots
- Propagation and audio threads read separate slots lock-free
- Geometry is managed through separate BVH double buffers (Phase 3)

This structure allows simulation and rendering to proceed safely on multiple threads without mutexes.

### Material Model

`SoundTriangle` directly stores **absorption** and **transmission**. There is no separate Material ID/pointer model, and reflection follows this rule.

```
reflection = 1 - (absorption + transmission)
```

`ExaRayHit` exposes a `materialId` field, so ray casts can directly identify the hit material.

### Ray Count and Ray Depth

Ray count and maximum reflection depth are configured per listener.

| Function | Effect |
|---|---|
| `exaListenerSetRayCount(id, n)` | Set ray count |
| `exaListenerSetRayDepth(id, d)` | Set maximum depth (`1 ≤ d ≤ EXA_MAX_DEPTH = 64`) |

> **Note**: the old `EXA_MAX_DEPTH = 16` limit was expanded 4x to `EXA_MAX_DEPTH_LIMIT = 64` while keeping a backward-compatible alias.

### Diffuse Scattering Options

`ExaSTOption` includes scattering parameters for fine-tuning the simulation.

| Field | Meaning |
|---|---|
| `diffuseEnabled` | Enable/disable scattering |
| `diffuseStartDepth` | Reflection depth where scattering starts, default 5 |
| `diffuseMaxOffsetRadius` | Scattering offset radius |
| `diffuseCurveA/B/C` | Scattering curve coefficients for distance and angle |
| `guideDiffuseEnabled` | Use guide diffuse rays |
| `guideDiffuseListenerHeadRadius` | Listener head radius, default 0.0875 m |

### HRTF

```c
exaListenerSetHRTFFromFile(listenerID, "/path/to/hrtf");
exaListenerSetHRTFFromMemory(listenerID, dataPtr, dataSize);
```

### Querying Results

| Form | Function |
|---|---|
| Valid paths for visualization/debugging | `exaGetValidPathCount`, `exaGetValidPaths` |
| Sorted IR for convolution input | `exaGetSortedIRDatas` |
| Guide Plane / Mirror Position diagnostics | `exaPropagatorGetGuidePlanes`, `exaPropagatorGetMirrorPositions` |

`ExaPathData` stores `pos[0]=source`, `pos[1..N]=hit points`, and `pos[N+1]=listener`.

### Object Update Type

```c
exaObjectSetUpdateType(objID, eUpdateTypeData);  // 0=Static, 1=Refit, 2=Rebuild
```

Static objects avoid per-frame BVH refit cost.

## Diagnostics and Statistics

| Function | Use |
|---|---|
| `exaGetStatistics()` | Ray, path, and timing statistics |
| `exaPropagatorGetProfile(sceneID)` | Per-stage propagation profile |
| `exaPropagatorGetGuidePlanes/MirrorPositions` | Internal algorithm state |
| `exaGetMemoryTraceSnapshot()` | Memory usage snapshot |
| `exaGetLastError()` | Last error message |

## References

- [STCore vs STCoreV2](./comparison.md) — feature comparison table
- [STCore](./stcore.md) — first-generation core
- [SDK Overview](../sdk/overview.md)
- [What Sound Tracing Solves](../intro/what-is-soundtracing.md)
