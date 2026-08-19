---
title: Unity
description: Install the SoundTrace Unity SDK and use its component APIs, HRTF, GPU/BVH, and Surface and Solid Distance transmission settings.
---

# SoundTrace SDK for Unity

The SoundTrace Unity SDK is a real-time spatial audio plugin that connects Unity meshes,
Renderer material slots, audio sources, and listeners to
[STCoreV2](../core/stcorev2.md).

This page documents the public components and Inspector contract of the current Unity SDK.

## Requirements and platforms

| Area | Current package status |
|---|---|
| Unity | 2022.3 LTS or newer |
| Bundled native plugins | macOS, Windows x64, iOS, Android |
| Linux | The current package does not include a binary; build it separately on a Linux host |
| Unity WebGL | Unsupported. The `OnAudioFilterRead`-based DSP path is unavailable on Unity WebGL |

`Use GPU Backend` requests the WebGPU compute provider for reflection and reverb propagation.
Diffraction remains on the CPU. Actual availability depends on the native plugin and device;
SoundTrace uses CPU propagation when GPU initialization fails.

## Installation

The SoundTrace Unity SDK package and its installation instructions are supplied through the
contracted evaluation or licensing delivery channel. Follow the instructions included with
your distribution.

To import the samples, select SoundTrace SDK in Package Manager and choose
`Samples > Demo Assets > Import`.

## Unity Audio settings

1. Open `Edit > Project Settings > Audio`.
2. Set `Default Speaker Mode` to `Stereo`.
3. Set `DSP Buffer Size` to `Best latency`.

![Unity Audio settings](/img/unity/Image01_AudioSetting.png)

The Manager and Listener Inspectors display a warning when these settings do not match.

## Fastest setup

1. Add `SoundTraceManager` to an empty GameObject.
2. Add `SoundTraceListener` to the Main Camera.
3. Add `SoundTraceSource` to an audio-source GameObject and assign a clip to the `AudioSource` on the same GameObject.
4. Add `SoundTraceObject` to each mesh GameObject used as acoustic geometry.
5. If needed, add `SoundTracePathVisualizer` to the same GameObject as the Manager.
6. Enter Play Mode and check the Console for errors, then verify the audio and paths.

Across all loaded scenes, only one active Manager and one active Path Visualizer may be used.
Multiple Listeners may register, but Source rendering uses the first registered
`PrimaryListener`.

## Component overview

| Component | Role | Required dependency |
|---|---|---|
| `SoundTraceManager` | Manages the runtime, scene, material registration, and propagation backend | One per runtime |
| `SoundTraceListener` | Manages the listener transform, ray quality, output, and HRTF settings | Active Manager |
| `SoundTraceSource` | Spatializes `AudioSource` output and configures each path type | `AudioSource` on the same GameObject and an active Listener |
| `SoundTraceObject` | Registers a Mesh and its submesh materials in the acoustic scene | `MeshFilter`, `MeshRenderer` |
| `SoundTracePathVisualizer` | Debug display for valid paths and hit triangles | Same GameObject as the Manager |

## SoundTraceManager

### Inspector

| Field | Default | Behavior |
|---|---:|---|
| `bool propagateOnStart` | `true` | Synchronizes the initial scene graph and transforms in `Start()`, then requests the first propagation pass. |
| `bool loadDefaultMaterialsOnEnable` | `true` | Registers the bundled Material Preset Library in the native material table during `OnEnable()`. |
| `int propagationThreadCount` | `-1` | Sets the sound engine's execution-thread count for propagation jobs. On native platforms, `-1` is configured automatically from the logical-thread count reported by `std::thread::hardware_concurrency()`, while `0` and `1` run single-threaded. Values of `2` or more use the specified total, including the calling thread. |
| `bool useGpuBackend` | `false` | Runs propagation on GPU compute shaders instead of job multithreading. |
| `int pathCacheSize` | `256` | Cache-buffer size for generated paths, with a minimum of `0` and a maximum of `1024`. Higher values improve the spatial-audio effect but also increase computation. Depending on device performance, we recommend starting below the default value of `256`. |

### Public properties

| Property | Type / access | Exact meaning |
|---|---|---|
| `Instance` | `static SoundTraceManager` / `get; private set;` | Singleton Manager used across all loaded scenes, or `null` when none is enabled. |
| `DefaultMaterialsLoaded` | `int` / `get; private set;` | Number of bundled materials registered automatically in `OnEnable()`. It is `0` when automatic loading is disabled or the asset is missing. |
| `Scene` | `SoundScene` / `get; private set;` | Low-level scene owned by the Manager. It is `null` while inactive or after initialization failure. |
| `PrimaryListener` | `SoundTraceListener` / `get` | First registered Listener used by Source rendering, or `null` when no Listener is registered. |
| `ListenerCount` | `int` / `get` | Number of Listeners currently registered with the Manager. |
| `SourceCount` | `int` / `get` | Number of Sources currently registered with the Manager. |
| `ObjectCount` | `int` / `get` | Number of Objects currently registered with the Manager. |
| `LastValidPathCount` | `int` / `get; private set;` | Valid-path count from the most recently completed propagation result. It is `0` when propagation cannot run. |
| `LastNativeError` | `string` / `get; private set;` | Most recent scene-graph or propagation error; an empty string means no current error. |
| `PropagationThreadCount` | `int` / `get` | Number of execution threads used by propagation jobs. `-1` means the maximum. |
| `IsGpuPropagate` | `bool` / `get; private set;` | Whether `exaPropagatorInitGpu()` succeeded and activated the GPU propagation provider. |
| `GpuBackendStatus` | `string` / `get; private set;` | GPU backend initialization result: `GPU active` or `CPU fallback (<ExaResult>): <error>`. |
| `PathCacheSize` | `int` / `get` | Cache-buffer size for generated paths. |

### Public methods

| Method | Behavior |
|---|---|
| `public void ResetMotionState()` | Clears motion history for every registered Listener and Source immediately after a teleport, respawn, or scene transition. |

## SoundTraceListener

Add this component to the Main Camera in most projects.

### Inspector

| Field | Default | Range/options |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`, `Fast`, `Middle`, `Quality` |
| `Ray Resolution` | `16` | `1..32`; the same value is applied to width and height |
| `Ray Depth` | `4` | `1..16` |
| `Output Mode` | `Headset` | `Headset`, `Speaker` |
| `HRTF` | `HRIR Interpolated` | The three modes below |

Selecting `Fast`, `Middle`, or `Quality` applies the ray values and associated rendering-quality
settings together, and disables the ray fields in the Inspector. Select `Custom` before editing
the values directly. Switching from a preset back to `Custom` preserves the last applied values.

| Preset | Ray Resolution | Ray Depth | Recommended starting point |
|---|---:|---:|---|
| `Custom` | Stored value | Stored value | Manual tuning |
| `Fast` | `16` | `4` | Mobile and projects with many sources |
| `Middle` | `24` | `8` | General games and desktop |
| `Quality` | `32` | `12` | Apps where audio is a major focus and other workloads are light |

### HRTF and output modes

| Mode | Required asset | Description |
|---|---|---|
| `Band8` | None | Lightweight mode that does not load an external HRTF table |
| `Hrir` | `KU100_convolution.bytes` | HRIR mode |
| `HRIR Interpolated` | `KU100_convolution.bytes` | Applies interpolation to HRIR mode to improve directional perception. |

Assets are loaded from `Runtime/Resources/SoundTrace/HRTF/`. If a required asset is missing or
empty, Listener initialization fails; SoundTrace does not switch to another mode automatically.

## SoundTraceSource

`SoundTraceSource` processes the output of the `AudioSource` on the same GameObject. When
enabled, it sets `AudioSource.spatialBlend` and `AudioSource.dopplerLevel` to `0` so SoundTrace
handles spatialization and Doppler.

### Inspector

| Field | Default | Behavior |
|---|---:|---|
| `Intensity` | `1` | Source emission intensity in the `0..10` range. |
| `Ray Resolution` | `24` | Applies the same horizontal and vertical resolution to reverb rays. Range: `1..32`. |
| `Reverb Ray Depth` | `4` | Maximum reflection depth for reverb rays. Range: `1..16`. |
| `Enable Direct` | `true` | Enables the Direct path. |
| `Enable Reflection` | `true` | Enables the Reflection path. |
| `Enable Diffraction` | `true` | Enables the Diffraction path. |
| `Enable Reverb` | `true` | Enables the Reverb path. |
| `Enable Transmission` | `true` | Enables the Transmission path. |
| `Direct Attenuation` | `1.0` | Distance attenuation for the Direct path. Higher values sound quieter at the same distance. Range: `0.5..1.5`. |
| `Reflection Attenuation` | `1.0` | Distance attenuation for the Reflection path. Higher values sound quieter at the same distance. Range: `0.5..1.5`. |
| `Diffraction Attenuation` | `1.0` | Distance attenuation for the Diffraction path. Higher values sound quieter at the same distance. Range: `0.5..1.5`. |
| `Reverb Attenuation` | `1.0` | Distance attenuation for the Reverb path. Higher values sound quieter at the same distance. Range: `0.5..1.5`. |
| `Transmission Attenuation` | `1.0` | Distance attenuation for the Transmission path. Higher values sound quieter at the same distance. Range: `0.5..1.5`. |
| `Max Delay Seconds` | `1.0 s` | Maximum propagation delay retained by the Source renderer. Longer delays use more memory. Range: `0.01..5 s`. |
| `Path Fade Time Seconds` | `0.066 s` | Fade time used when a path enters or leaves the renderer. Range: `0.001..0.5 s`. |
| `Path Hold Time Seconds` | `0.120 s` | Time a missing non-direct path is retained before fading starts. `0` disables holding. |
| `Max Delay Rate` | `0.1` | Maximum delay change allowed per sample. Range: `0.001..0.999`. |
| `Bypass` | `false` | Skips SoundTrace spatial rendering and passes through the original `AudioSource` output. |

A larger Distance Attenuation value makes the corresponding path type roll off faster with
distance. `Show Gizmo` displays the reach of Direct, Reflection, Diffraction, Reverb, and
Transmission independently in the Scene view.

Render Tuning applies to a source-listener pair. `Path Hold = 0` disables path holding.

### Public methods

| Method | Behavior |
|---|---|
| `SetBypass(bool enabled)` | When `true`, skips SoundTrace spatial rendering and passes through the original `AudioSource` output. When `false`, applies SoundTrace rendering again. |
| `ResetMotionState()` | Re-seeds motion from the current Transform and publishes zero velocity to prevent a Doppler spike after a teleport or respawn. |

To synchronize multiple `AudioSource` instances, call `PlayScheduled()` against the same
`AudioSettings.dspTime` reference.

## SoundTraceObject

`SoundTraceObject` registers `MeshFilter.sharedMesh` and the Renderer submesh material slots.
Enable `Read/Write Enabled` in Import Settings because builds must read the mesh data.

### Geometry and BVH

| Field | Default | Description |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`, `LBVH`, `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Update Mode` | `Static` | `Static`, `Dynamic`, `Refit`, `Rebuild` |

#### BVH Type

| BVH Type | Description |
|---|---|
| `HKDTree` | Uses KD-partition traversal. It supports Refit, but switches to BVH-style fallback traversal after a Refit. The GPU backend does not support it. |
| `LBVH` | Uses Morton codes, rebuilds faster than HKDTree, and supports Refit. After uploading vertices through the low-level API, it can be refit for SkinnedMesh or procedural-mesh deformation. The scalar format does not support the GPU backend. |
| `LBVH_SIMD4` | Processes LBVH leaf intersections in SIMD batches of 4. It supports Refit and the GPU backend. |
| `LBVH_SIMD8` | Processes LBVH leaf intersections in SIMD batches of 8. This is the current default and supports both Refit and the GPU backend. |
| `LBVH_SIMD16` | Processes LBVH leaf intersections in SIMD batches of 16. It supports Refit and the GPU backend. |

The Inspector displays a warning when `HKDTree` or scalar `LBVH` is selected in a scene that requests the GPU backend.

| Update Mode | Current component contract |
|---|---|
| `Static` | Use for meshes that do not move. |
| `Dynamic` | Use for objects whose Transform changes. |
| `Refit` | Native update strategy used when vertices are updated through the low-level API. |
| `Rebuild` | Native update strategy used when geometry is supplied again through the low-level API. |

The `SoundTraceObject` MonoBehaviour automatically applies Transform changes, but it does not
upload Unity Mesh vertex or topology changes at runtime. Selecting `Refit` or `Rebuild` alone
therefore does not automatically apply SkinnedMesh or procedural-mesh deformation.

### Public methods

`Auto Set` matches Renderer material names against the bundled presets. If an imported model
root has no mesh and its children own the geometry, use `Add To Child Meshes`.

| Method | Behavior |
|---|---|
| `AutoSetMaterialSlots()` | Iterates over every submesh, matches the Renderer material name against the bundled presets, and refreshes the slot configuration. |
| `GetMaterialPresetIndex(int slotIndex)` | Returns the preset index for the specified slot. Returns `0` when no slots exist or the slot index is invalid. |
| `GetPresetName(int slotIndex)` | Returns the display name of the preset assigned to the specified slot. Returns `Concrete` when the preset cannot be found. |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | Changes one slot's preset. Clamps `presetIndex` to at least `0` and returns `false` when the slot index is invalid. |
| `SetMaterialPresetForAllSlots(int presetIndex)` | Applies one preset to every slot. Clamps `presetIndex` to at least `0` and returns `false` when there are no slots to update. |
| `GetNativeMaterialIndices()` | Returns the per-submesh preset indices in the array format used to register a native mesh. Missing or empty slots use `0`. |
| `GetTriangleCount()` | Sums the index counts of all submeshes and returns the triangle count. Returns `0` when no mesh is assigned. |
| `static IsGpuCompatibleBvhType(BvhType value)` | Returns `true` for `LBVH_SIMD4`, `LBVH_SIMD8`, and `LBVH_SIMD16`. |

## Acoustic materials and Transmission

The default authoring asset is
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`.
Use `SoundTrace > Material Preset Library` to:

- Add, remove, and reorder presets
- Import or export `soundMaterial.json`, or re-import the bundled JSON
- Edit Scattering and the 8-band Reflection, Absorption, and Transmission graphs
- Select the `Transmission Model`

The frequency-band centers are `67.5`, `125`, `250`, `500`, `1000`, `2000`, `4000`, and
`8000 Hz`. Material order and table indices must match.

### Transmission Model

| Model | Input | Geometry requirements |
|---|---|---|
| `Surface` | Per-band transmitted-energy coefficient remaining after crossing a surface, `0..1` | May be used with open faces and thin surfaces |
| `Solid Distance` | Per-band material reference distance (m) at which transmitted energy reaches `-30 dB`; `0` or greater | Requires a closed volume with consistent face winding |

The `Solid Distance` input is not the actual thickness of the object. At runtime, attenuation is
applied from the distance actually traveled through the geometry. Changing the model does not
calculate the eight values automatically. Enter a verified value for every band and do not leave
them at the default `0`.

In JSON, the absence of `transmissionDistanceToMinus30DbMeters` selects `Surface`; its presence
as exactly eight finite, non-negative values selects `Solid Distance`. When exporting `Surface`,
the field is omitted instead of being written as `null` or an empty array.

## SoundTracePathVisualizer

Add one to the same GameObject as the Manager.

| Inspector field | Default | Description |
|---|---:|---|
| `Enable Path Visualization` | Enabled | Controls whether the path mesh is displayed. |
| `Refresh Interval Ms` | `50` | Minimum interval between visualization-mesh rebuilds. Does not affect the acoustic propagation interval. |
| `Max Visualized Paths` | `1024` | Maximum number of paths to display. |
| `Path Width` | `0.08` | Line width. |
| `Path Alpha Intensity` | `0.5` | Display intensity. |
| `Draw Hit Triangles` | Disabled | Displays hit triangles in the Scene view. |

Direct, Reflection, Diffraction, Reverb, and Transmission use distinct path colors. This
component is for debugging; disable it during performance measurements and in release builds.

The main public members are `Instance`, the settings and count properties, `Render()`, and
`Clear()`.

## Samples

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

Demonstrates a basic room, source, listener, geometry, material presets, and path visualization.

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

Demonstrates source/listener movement, material-preset changes, and comparison between the
original Unity audio and SoundTrace output.

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

Demonstrates multiple sources in a large space, wall occlusion, HRTF directionality while moving,
and room response.

## Troubleshooting

| Symptom | Check |
|---|---|
| No audio output | Check the first Manager initialization error in the Console, Stereo/Best latency, the AudioSource clip, and the presence of a Manager and Listener |
| Source/Listener/Object reports that it requires a Manager | Find the earlier `Failed to initialize SoundTraceManager` cause instead of a later cascade error |
| HRTF initialization fails | Check that the Resources asset for the selected mode exists and is not empty |
| Geometry is ignored | Check `Read/Write Enabled`, MeshFilter/MeshRenderer, child-mesh placement, and registration state |
| A deformed mesh does not update at runtime | `Update Mode` alone does not upload vertices or topology; use a separate low-level geometry update path |
| GPU is not active | Check `GpuBackendStatus`, the Console fallback reason, and the Object SIMD BVH selection |
| Pitch jumps after a teleport | Call `ResetMotionState()` immediately after changing the Transform |
| Performance is insufficient | Step down `Quality → Middle → Fast`, reduce the path cache buffer, then disable the path visualizer |
| Multiple sources produce a comb-filtered sound | Call `PlayScheduled()` against the same `AudioSettings.dspTime` |

## Next

- [SDK Overview](./overview.md)
- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
