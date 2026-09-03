---
title: Unreal Engine
description: Install SoundTracing Unreal Engine plugin 0.2.0 and configure its Unity-style components, HRTF, geometry, materials, GPU backend, and Blueprint API.
---

# SoundTrace SDK for Unreal Engine

The SoundTrace Unreal SDK connects [STCoreV2](../core/stcorev2.md) through Unreal Audio
Extension Plugins and Actor Components. Version 0.2.0 uses the STCoreV2 v0.7 C-ABI 4 and
provides the same Manager, Listener, Source, Object, and PathVisualizer organization as the
Unity SDK.

This guide covers the native Unreal audio integration. FMOD and Wwise must be configured as
separate integration builds, not enabled alongside the native integration in the same build.

## Requirements and platforms

| Item | Current version/range |
|---|---|
| Unreal Engine | `5.6` |
| SoundTracing plugin | `0.2.0` Beta |
| STCoreV2 | `v0.7`, C-ABI `4` |
| Declared target platforms | Win64, macOS, Linux, Android, iOS |
| Prebuilt binaries in the current SDK checkout | Win64 Release |
| Source channels | Mono or Stereo, up to 2 channels |
| Additional plugin | Niagara, enabled by `SoundTracing.uplugin` |

The current Win64 package contains these files:

```text
Plugins/SoundTracing/ThirdParty/STCoreV2/
├─ Binaries/Win64/Release/exaSound.dll
├─ Binaries/Win64/Release/webgpu_dawn.dll
└─ Lib/Win64/Release/exaSound.lib
```

To build another target, add that platform's `exaSound` runtime and link artifacts under the
same ThirdParty layout. A platform entry in `SupportedTargetPlatforms` does not create its
native binaries.

:::warning ABI 4 only
SoundTracing 0.2.0 is not compatible with an ABI 3 or older `exaSound` binary. Mixing an old
DLL into the package stops initialization with `STCoreV2 export table is incomplete`.
:::

## Installation

1. Close Unreal Editor and the target project.
2. Copy `Plugins/SoundTracing` from the SDK into the target project's `Plugins/` directory.
3. Open the `.uproject` and enable the `SoundTracing` plugin.
4. Complete the C++ module build and restart the Editor.
5. Review the global settings under `Project Settings > Plugins > SoundTracing`.

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

Keep `Content/STData` and `ThirdParty/STCoreV2` when distributing the plugin folder. Material
presets, custom HRTF data, and the native runtime use these paths.

## Unreal Audio settings

For the native Unreal audio integration, select both plugins in the Audio settings for each
target platform:

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

Restart the Editor after changing these settings. Also enable Spatialization on each
`Audio Component` or `Sound Attenuation` asset and assign a
`SoundTracing Audio Spatialization Settings` asset.

The SDK sample project uses these Windows audio values as a starting point:

| Setting | Sample value |
|---|---:|
| Audio Sample Rate | `48000` Hz |
| Callback Buffer Frame Size | `1024` |
| Buffers To Enqueue | `1` |

These are sample values, not hard plugin requirements. If your project has a different audio
budget, verify functionality with these values first, then tune callback and buffer sizes.

## Fastest setup

1. Review Runtime Options and Default Listener Settings under
   `Project Settings > Plugins > SoundTracing`.
2. Create a `SoundTracing Audio Spatialization Settings` asset from
   `Sounds > SoundTracing` in the Content Browser.
3. Assign the asset to Spatialization Plugin Settings on an `Audio Component` or
   `Sound Attenuation` asset.
4. Add a `SoundTracingObjectComponent` as a direct child of every
   `StaticMeshComponent` or `SkinnedMeshComponent` used as acoustic geometry.
5. Run `Auto Set Materials` on the Object Component and correct only mismatched slots.
6. Start PIE and run `SoundTracing.Status` to inspect the native runtime, backend, listener,
   and path count.

The plugin works without a Listener Component. In that case it follows the Unreal audio-device
listener and uses Default Listener Settings from Project Settings.

## Component overview

| Unity SDK | Unreal Engine SDK | Role |
|---|---|---|
| `SoundTraceManager` | `Project Settings > Plugins > SoundTracing` | Native runtime, threads, GPU, cache, and default Listener settings |
| `SoundTraceListener` | `SoundTracingListenerComponent` | Per-level Listener profile and optional transform override |
| `SoundTraceSource` | `SoundTracing Audio Spatialization Settings` | Per-source emission, rays, paths, attenuation, and render tuning |
| `SoundTraceObject` | `SoundTracingObjectComponent` | Static/Skinned geometry, BVH, and material-slot registration |
| `SoundTracePathVisualizer` | `SoundTracingPathVisualizerComponent` | Niagara-based propagation-path display |
| Manager runtime panel | `SoundTracingSubsystem` | Blueprint access to runtime state and the latest propagation result |

## Project Settings

`Project Settings > Plugins > SoundTracing` is the Unreal counterpart of Unity's
`SoundTraceManager`.

### Runtime Options

| Field | Default | Range/behavior |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`. `-1` lets STCoreV2 use logical cores minus one. `0` or `1` is serial. Disabled while GPU mode is selected. Restart required |
| `Use GPU Backend` | Off | Requests Dawn/WebGPU initialization and falls back to CPU on failure. Restart required |
| `Path Cache Size` | `256` | `0..1024`. Shared cache budget for all active sources. `0` disables the cache |
| `Propagation Interval (ms)` | `0` | `0..500`. `0` requests one frame per game tick; requests coalesce while a frame is running |

### Listener, Attenuation, and Materials

| Field | Default | Description |
|---|---:|---|
| `Default Listener Settings` | `Fast` | Used when no Listener Component overrides the level |
| `Default Source Attenuation Strengths` | `1.0` per path | Used by Source assets that do not override project attenuation. Range `0.5..1.5` |
| `Material Preset Library` | Empty | Uses the bundled `SoundTraceMaterialPresetLibrary` when empty. Restart after selecting another library |

The SDK sample project's `DefaultGame.ini` overrides these defaults with `Middle` and GPU
enabled for demonstration. The plugin defaults are listed above.

## SoundTracingListenerComponent

Add this component to a Pawn or Camera to override the project Listener profile for a level, or
to drive the native listener from the component instead of the Unreal audio-device listener.

### Inspector

| Field | Default | Behavior |
|---|---:|---|
| `Override Project Listener Settings` | On | Applies `Listener Settings` instead of Project Settings |
| `Listener Settings` | `Fast` | Quality, HRTF, output mode, path, and air-absorption settings |
| `Drive Listener Transform` | Off | Sends this component's world transform and velocity to the native listener |

Only one Listener Component drives the active listener in a World. If another component begins
play, it replaces the previous component and writes a warning to the Output Log.

### Quality preset

`Fast`, `Middle`, and `Quality` apply the ray and advanced render-quality values together.
Select `Custom` to edit them manually.

| Preset | Ray Resolution | Ray Depth | HRTF Path Budget | Diffuse | Delay Interpolation | Early Path Budget |
|---|---:|---:|---:|---|---|---:|
| `Custom` | Stored value | Stored value | Stored value | Stored value | Stored value | Stored value |
| `Fast` | `16` | `4` | `1` | Off / Low | Linear | `128` |
| `Middle` | `24` | `8` | `1` | On / Medium | Cubic Lagrange | `128` |
| `Quality` | `32` | `12` | `1` | On / High | Lagrange 6 | `128` |

`HRTF Path Budget` is the number of highest-priority paths that receive a full directional
HRTF voice. Every built-in preset keeps it at `1` for audio-thread headroom. Raising it in
Custom mode can cause dropouts in scenes with many sources.

### HRTF and output mode

| HRTF mode | Required asset | Description |
|---|---|---|
| `Band8` | None | Lightweight 8-band magnitude and ITD mode |
| `HRIR` | STCoreV2 embedded table | Uses the nearest measured HRIR direction |
| `HRIR Interpolated` | STCoreV2 embedded table | Interpolates measured HRIRs by direction; the default |

The 0.1.0 `Parametric`, `Convolution`, and `SteamAudio` modes were removed in 0.2.0.
`Custom HRTF Relative Path` accepts an `MPI1`, `SAH1`, or `BPH1` table path relative to the
plugin `Content` directory. Leave it empty to use the STCoreV2 embedded table.

| Output Mode | Description |
|---|---|
| `Headphones` | Binaural HRTF output |
| `Speaker` | Internal Ambisonic stereo decode |

The recommended advanced `Render Band Tier` is `Merged4`; `Full8` increases per-path
audio-thread band processing. Air Absorption defaults to `20 °C`, `50%` relative humidity,
and `101325 Pa` for ISO 9613-1 attenuation.

### Blueprint methods

| Method | Behavior |
|---|---|
| `ApplyListenerSettings()` | Reapplies current Inspector values to the native listener |
| `SetQualityPreset(Preset)` | Changes and immediately applies the quality preset |
| `SetHrtfMode(Mode)` | Changes and immediately applies the HRTF mode |
| `SetOutputMode(Mode)` | Switches Headphones/Speaker and applies it |
| `ResetMotionState()` | Clears listener/source velocity history after a teleport or respawn |
| `GetListenerSettings()` | Returns the component's current listener settings |

## SoundTracing Audio Spatialization Settings

Create this asset from
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` in the Content Browser.
Share one asset between sources with the same role instead of duplicating it per Audio Component.

### Inspector

| Field | Default | Range/behavior |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`. Linear emission gain multiplied into every path |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`. Additional gain above Intensity |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`. Late-reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`. Early-reflection send |
| `Ray Resolution` | `24` | `0..32`. `0` inherits the Listener grid; otherwise uses an `N × N` source reverb grid |
| `Ray Depth` | `4` | `0..16`. `0` inherits Listener depth |
| `Direct/Reflection/Diffraction/Reverb/Transmission` | All on | Enables each path family per source |
| `Override Project Attenuation Strengths` | On | When off, uses the Project Settings attenuation values |
| Per-path `Strength` | `1.0` | `0.5..1.5`. Higher values attenuate faster at the same distance |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`. Maximum propagation delay retained by the renderer |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`. Fade time for path entry/removal |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`. Holds a missing non-direct path before fading. `0` disables hold |
| `Max Delay Rate` | `0.1` | `0.001..0.999`. Maximum delay change per sample |
| `Bypass` | Off | Passes input through without SoundTrace spatial rendering |

Since 0.2.0, the spatializer updates each source directly from
`FAudioPluginSourceInputData::SpatializationParams` on every audio block. If a source remains
at native `(0,0,0)`, verify that the 0.2.0 plugin module and binaries were deployed together.

## SoundTracingObjectComponent

`SoundTracingObjectComponent` registers its immediate parent `StaticMeshComponent` or
`SkinnedMeshComponent` as acoustic geometry. Add it directly below the target mesh component,
not at an arbitrary place in the Actor hierarchy.

### Inspector

| Field | Default | Description |
|---|---:|---|
| `Auto Register Native Object` | On | Registers the native object at Begin Play |
| `Sync Transform On Tick` | On | Updates the native transform only when the parent changes |
| `Auto Sync Materials` | On | Refreshes slots when parent render materials change |
| `Update Type` | `Static` | Geometry update policy |
| `BVH Type` | `LBVH SIMD8` | Native acceleration-structure builder |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Sync Skinned Vertices On Tick` | Off | Uploads the current skeletal pose each tick in `Refit` mode |
| `Sound Material Slots` | Generated | Maps render-material slots to SoundTrace presets |
| `Visualize BVH` | Off | Draws BVH lines with the Editor component visualizer |

A Static Mesh uses Forced LOD when set, otherwise LOD 0. A Skinned Mesh also prefers Forced LOD
and uploads the current pose vertices.

### Geometry and BVH

| BVH Type | Refit | GPU backend | Description |
|---|---|---|---|
| `HKDTree` | Supported | No | KD-split traversal; switches to BVH-style fallback after refit |
| `LBVH` | Supported | No | Scalar Morton LBVH |
| `LBVH SIMD4` | Supported | Yes | 4-wide leaf intersection |
| `LBVH SIMD8` | Supported | Yes | Current default |
| `LBVH SIMD16` | Supported | Yes | 16-wide leaf intersection |

If GPU mode is requested with `HKDTree` or scalar `LBVH`, the plugin substitutes the
GPU-uploadable `LBVH SIMD8` native builder.

| Update Type | Use |
|---|---|
| `Static` | Level geometry that never moves |
| `Dynamic` | Transform-only doors and props; updates the TLAS instance |
| `Refit` | Skinned Mesh vertices whose topology stays fixed |
| `Rebuild` | Geometry whose triangle topology changes and needs a new BVH |

To follow skinned animation, enable both `Update Type = Refit` and
`Sync Skinned Vertices On Tick = true`. The plugin uploads current-pose vertices and refits the
native mesh. This performs CPU skinning and a vertex upload every tick, so limit the number and
LOD of updated objects.

Objects with the same Static Mesh, LOD, material mapping, and BVH settings share one native BVH.
The Skinned Mesh cache key includes the component path, so distinct poses do not overwrite the
same native mesh.

### Blueprint methods

| Method | Behavior |
|---|---|
| `RegisterNativeObject()` | Registers the parent geometry in the native scene |
| `UnregisterNativeObject()` | Removes the native object registration |
| `SyncNativeTransform()` | Immediately applies the parent transform |
| `RefreshNativeMesh()` | Reuploads geometry after a mesh or material change |
| `Auto Set Materials` | Matches presets by parent render-material names and aliases |
| `SetMaterialPresetIndex(Slot, Preset)` | Changes one slot's preset index |
| `SetMaterialPresetForAllSlots(Preset)` | Applies one preset to every slot |
| `SetUpdateType(Type)` | Changes the native object update policy |
| `GetResolvedMeshLodIndex()` | Returns the LOD index actually uploaded |
| `GetUploadedTriangleCount()` | Returns the triangle count from the last upload |
| `IsRegistered()` | Returns whether both native object and mesh are valid |

## Acoustic materials and Transmission

The default library is
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset` in the plugin. It currently
contains the same 22-material table as the Unity and Web SDKs.

Create a custom library from
`Sounds > SoundTracing > SoundTracing Material Preset Library` in the Content Browser. A new
asset copies the active default library. Select it under `Material Preset Library` in Project
Settings and restart the Editor.

Each preset contains:

- Display name and render-material name aliases
- Scattering `0..1`
- 8-band Reflection, Absorption, and Transmission `0..1`
- Transmission Model
- Eight `Thickness to -30 dB (m)` values for `Solid Distance`

Band centers are `67.5`, `125`, `250`, `500`, `1000`, `2000`, `4000`, and `8000 Hz`.
Click or drag the Editor band graph to edit values.

### Transmission Model

| Model | Input | Geometry requirement |
|---|---|---|
| `Surface` | Per-band energy coefficient `0..1` remaining after one surface crossing | Works with open faces and thin surfaces |
| `Solid Distance` | Per-band reference distance in meters at which transmitted energy reaches `-30 dB` | Requires a closed volume with consistent face orientation |

A `Solid Distance` value is not the object's actual thickness. Runtime measures the distance
travelled inside geometry and attenuates it against this reference distance. `0` completely
blocks the band.

`ImportFromJson`, `ExportToJson`, and `ResetToBundledJson` use the shared Unity/Web
`soundMaterial.json` format. A missing `transmissionDistanceToMinus30DbMeters` means
`Surface`; eight valid values mean `Solid Distance`.

## SoundTracingPathVisualizerComponent

Add `SoundTracingPathVisualizerComponent` to an Actor to display the latest propagation frame
as Niagara line segments.

| Field | Default | Description |
|---|---:|---|
| `Visualization Enabled` | On | Enables path display |
| `Refresh Interval Ms` | `50` | Minimum visualization refresh interval; does not affect propagation |
| `Max Visualized Paths` | `1024` | Maximum displayed paths, range `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha strength, range `0.01..2.0` |
| `Niagara System` | Empty | Uses the plugin's default Niagara system when empty |

Colors are Direct=red, Reflection=orange, Diffraction=green, Transmission=cyan, and
Reverb=purple. Use `SetVisualizationEnabled(bool)` to control it at runtime and
`GetActivePathCount()` to read the current path count. Disable it for shipping performance
measurements.

## SoundTracingSubsystem

`SoundTracingSubsystem` is a `WorldSubsystem` equivalent to the Unity Manager runtime panel.
It exposes these states and commands to Blueprint:

| Method | Behavior |
|---|---|
| `IsNativeRuntimeReady()` | Reports whether the library, native init, scene, and listener are ready |
| `IsGpuPropagationActive()` | Reports whether a GPU device was actually acquired |
| `GetGpuBackendStatus()` | Returns `GPU active`, `CPU`, or `CPU fallback (...)` |
| `GetLastValidPathCount()` | Returns valid paths from the latest propagation frame |
| `GetLastNativeError()` | Returns the control thread's latest native error, or an empty string |
| `GetNativeVersion()` | Returns native version `major.minor.revision` |
| `GetRegisteredObjectCount()` | Returns registered objects in the current World |
| `GetActiveListenerSettings()` | Returns settings currently applied to the native listener |
| `ResetMotionState()` | Clears Listener and Source motion history |
| `RequestPropagationFrame()` | Requests a propagation frame outside the regular cadence |

## GPU backend

Enable `Use GPU Backend` and restart the Editor to request the Dawn/WebGPU backend through
`exaPropagatorInitGpu`.

- Initialization succeeds: `GPU active`
- Native build has no GPU add-on: `CPU fallback (this exaSound build has no GPU backend)`
- Adapter/device initialization fails: `CPU fallback (...)` with the reason
- GPU was not requested: `CPU`

For Win64, stage `webgpu_dawn.dll` from the same artifact directory as `exaSound.dll`. The
plugin Build.cs registers DLLs in this directory as runtime dependencies.

Inspect the actual state with Blueprint `GetGpuBackendStatus()` or these console commands:

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` prints native version, readiness, backend, object/path counts, and the
Listener profile. `SoundTracing.DumpGpuPropagationStats` prints GPU dispatch, ready, and CPU
fallback counters.

## Coordinate system

Plugin components perform coordinate conversion automatically. SoundTracing 0.2.0 sends Unreal
coordinates to STCoreV2 as follows:

```text
position / vertex / velocity = (UE.Y, UE.Z, UE.X) × 0.01 m
sceneRatio = 1
listener basis: right=(1,0,0), up=(0,1,0), forward=(0,0,-1)
```

The listener basis follows ADR-0001 and fixes the HRTF front/back inversion in the previous
version. Apply this contract yourself only in a custom native integration.

## Sample project

The current SDK source project includes `Content/FirstPerson/Test.umap`, where you can inspect
`SoundTracingObjectComponent` geometry, BVH, and material-slot setup. This map belongs to the
host project's Content and is not included when only `Plugins/SoundTracing` is copied.

## Troubleshooting

| Symptom | Check |
|---|---|
| `STCoreV2 export table is incomplete` | Deploy plugin 0.2.0 with an STCoreV2 v0.7 ABI 4 binary and remove ABI 3 DLLs |
| Plugin is absent from Audio lists | Plugin enabled, C++ module built, target Audio settings selected, Editor restarted |
| Native library fails to load | Target-specific `ThirdParty/STCoreV2` runtime/link artifacts and package staging |
| Source is not spatialized | Global Spatialization/Source Data Override plugins, source Spatialization enabled, SoundTracing settings asset assigned |
| Source remains at the origin | Ensure the 0.2.0 module and binaries were deployed together; 0.2.0 reads spatialization params per audio block |
| Listener position is wrong | `Drive Listener Transform`; when off, the Unreal audio-device listener is used |
| Listener replacement warning | Keep one active `SoundTracingListenerComponent` per World |
| Geometry has no effect | Object Component is the immediate child of a supported mesh with render data and triangles |
| Skinned animation has no effect | `Update Type = Refit`, `Sync Skinned Vertices On Tick = true`, stable LOD and vertex count |
| GPU falls back to CPU | `webgpu_dawn.dll`, GPU-enabled native build, adapter/device, Output Log, and `SoundTracing.DumpGpuPropagationStats` |
| Paths are not visible | Niagara plugin, Visualizer enabled, max path count, and Source/Listener path enables |
| Pitch jumps after teleport | Call `ResetMotionState()` on the Listener Component or Subsystem immediately after moving |
| Dropouts with many sources | HRTF Path Budget `1`, `Merged4`, a lower quality preset, then callback/buffer settings |
| Stack overflow when Editor exits | Use the final 0.2.0 plugin containing the control-thread shutdown fix |

## Next

- [SDK overview](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
