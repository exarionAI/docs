---
title: Unity
description: Sound-Tracing SDK for Unity — installation, FMOD/Wwise integration, component Inspector contract, HRTF and output, materials, source and output EQ.
---

# Sound-Tracing SDK for Unity

Sound-Tracing SDK for Unity is a Unity package that wraps the sound-tracing engine DLL for Unity users.
You can build content comfortably with Unity's component pattern, manager scripts, and scriptable objects
as they are. Demo scenes are included as well.

## Requirements and platforms

| Item | Value |
|---|---|
| Unity | 2022.3 LTS or later (verified on Unity 6) |
| Package | `SoundTrace-SimpleST-release.unitypackage` (default, for Wwise) / `SoundTrace-SimpleST-FMOD-release.unitypackage` (FMOD edition) → `Assets/SoundTrace` |
| Platforms | Windows x64 · macOS Universal · Linux x86_64 · Android (ARMv7/ARM64/x86_64, API 28+) · iOS 15+ |
| WebGL | Not supported — Unity WebGL does not support audio filters (`OnAudioFilterRead`). For the web, use the [Web SDK](./web.md), the WASM build of the C SDK |

## Installation

Drag and drop the `.unitypackage` into the Project window, or import it with `Assets > Import Package > Custom Package`;
it installs into `Assets/SoundTrace`. Updates of the same package keep the GUIDs, so they can be imported over the existing install.

To use it with FMOD or Wwise, follow [Using with FMOD](#using-with-fmod) and [Using with Wwise](#using-with-wwise) below.
For FMOD, importing the FMOD edition package is all you need; the Wwise plug-in is installed by the Audiokinetic Launcher.

## Using with FMOD

When the Sound-Tracing SDK FMOD plug-in (`SimpleSTFmod`) is present in the project, SoundTrace automatically
runs in **FMOD integration** mode. Spatial audio rendering is done by the SimpleST Source / Listener
DSPs in FMOD Studio, and SoundTrace only uploads geometry and materials to the plug-in context via
`SoundTraceManager` + `SoundTraceObject`. `SoundTraceListener` / `SoundTraceSource` log a warning
and disable themselves.

![Importing the FMOD edition package](/img/fmod/unity-fmod-edition-import.png)

1. Add FMOD for Unity 2.04 to the project (`Assets/Plugins/FMOD`; if you installed it from a tgz, embed it under `Packages/`).
2. Drag and drop the **FMOD edition** package `SoundTrace-SimpleST-FMOD-release.unitypackage` into the Project window.
   There is no separate menu. The package's `Runtime/Plugins/FMOD` contains `SimpleSTFmod` (Windows x64 · macOS),
   and when the editor loads, SoundTrace copies it into the FMOD plug-in folder and registers it under
   FMOD Settings › Dynamic Plugins. If you add FMOD later, it does the same on the next load.
3. In FMOD Studio, put **SimpleST Listener** on the master bus and **SimpleST Source** on the master
   track of 3D events in place of the FMOD Spatializer — see [FMOD plug-in](./fmod.md).
4. In the scene, place `SoundTraceManager`, `SoundTraceObject` for the geometry, and the FMOD
   `StudioListener`.

There is one engine instance. SimpleSTFmod loads the same `SimpleSTRealtime` that SoundTrace
P/Invokes, and every control call runs on the plug-in's control thread.

## Using with Wwise

When `SimpleSTWwise` is present in the DSP folder of the Wwise Unity integration, SoundTrace runs in
**Wwise integration** mode (FMOD takes precedence if both are present).

SoundTrace uses the default package, and the Wwise plug-in is installed by the Audiokinetic Launcher like any other Wwise plug-in.

![Sound-tracing installed in the Launcher](/img/wwise/launcher-bundle.png)

1. Drag and drop the default package `SoundTrace-SimpleST-release.unitypackage` into the Project window.
2. Install **Sound-Tracing SDK for Wwise** (plug-in name `Sound-tracing`), acquired from the Audiokinetic Launcher
   store, into Wwise.
3. Run Launcher › **Unity › Integrate (or Modify) Wwise in Project**. The Launcher puts the plug-ins installed
   in the Wwise SDK (including Sound-tracing) into the DSP folder of the Wwise Unity integration, and the Wwise
   sound engine loads them. Run it with the Unity editor closed.
4. In the Wwise project, put **Sound-tracing Renderer** on an Audio Objects bus and route 3D sounds to
   that bus (disable or flatten Attenuation) — see [Wwise plug-in](./wwise.md).
5. In the scene, place `AkInitializer`, `AkAudioListener`, `AkGameObj` on the emitters, plus
   `SoundTraceManager` and `SoundTraceObject`. Wwise Unity units are meters, so `sceneRatio = 1`.

## Unity Audio settings

1. Open `Edit > Project Settings > Audio`.
2. Set `Default Speaker Mode` to `Stereo`.
3. Set `DSP Buffer Size` to `Best latency`.

![Unity Audio settings](/img/unity/Image01_AudioSetting.png)

The Manager and Listener Inspectors display a warning when these settings differ. The output sample
rate is the device value as is (Sound-Tracing SDK converts from its internal 44.1 kHz); if the device rate
changes, the native state is recreated with the same settings.

## Audio asset import settings

Mono sound sources are assumed, and audio clips should be set to the PCM format.

![Audio asset import settings](/img/unity/ImportSetting.png)

## Fastest setup

1. Add `SoundTraceManager` to an empty GameObject.
2. Add `SoundTraceListener` to the Main Camera that has the `AudioListener`.
3. Add `SoundTraceSource` to a source GameObject and assign a clip to the `AudioSource` on the same GameObject.
4. Add `SoundTraceObject` to the Mesh GameObjects you want to use as acoustic geometry.
5. If needed, add `SoundTracePathVisualizer` to the same GameObject as the Manager.
6. In Play Mode, check the Console for errors, the sound, and the paths.

Only one active Manager and one Path Visualizer can be used across all simultaneously loaded
scenes. There is one listener per Sound-Tracing SDK context, and the first registered `PrimaryListener`
renders.

## Component overview

| Component | Role | Required dependencies |
|---|---|---|
| `SoundTraceManager` | Runtime (context and control thread), scene, material registration, propagation | 1 per runtime |
| `SoundTraceListener` | Listener transform, ray quality, output/HRTF, delay and fade | Active Manager, `AudioListener` |
| `SoundTraceSource` | Feeds the `AudioSource` output as a mono stream, per-path settings | `AudioSource` on the same GameObject, active Listener |
| `SoundTraceObject` | Registers the Mesh and submesh materials in the acoustic scene | `MeshFilter`, `MeshRenderer` (Read/Write Enabled) |
| `SoundTracePathVisualizer` | Debug display of valid paths and hit triangles | Same GameObject as the Manager |

## Audio flow and threads

- `SoundTraceSource.OnAudioFilterRead` pushes the input into a **mono host stream**
  (`st_rt_source_write_stream`) and clears Unity's dry output. The `SoundTraceListener` callback
  pulls the full spatial mix once (`st_rt_render_process`, Buffered mode).
- Scene changes, source create/destroy, propagation, and visualization snapshots are processed
  serially on a dedicated **control thread** (`SoundTraceControlThread`). No scene control API or
  managed heap allocation runs in the audio callback.
- Positions are sampled with fixed-step motion sampling (`SoundTraceFixedStepMotion`) to estimate
  velocity. After a teleport, call `ResetMotionState()` to prevent a Doppler spike.
- On every render start (including restarts and HRTF toggles), Hybrid (`reserved0 = 1`) and
  **engine limiter off** are set explicitly, and the master gain is left at 0 dB. Limiting is handled
  by the Unity mixer. Render options are re-applied from the preset only at engine creation and on
  speaker-layout changes; `render_start` leaves them as they are.
- Right after creating the engine, **equal-loudness compensation is turned off**
  (`SoundTraceRuntime.DisableLoudnessCompensation`). Tone and level are handled by the Unity mixer.

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| Field | Default | Behavior |
|---|---:|---|
| `Propagate On Start` | `true` | In `Start()`, synchronizes the initial scene graph and transforms, then requests the first propagation. |
| `Load Default Materials On Enable` | `true` | In `OnEnable()`, registers the bundled Material Preset Library (22 SoundTrace game materials) in the native material table. |
| `Propagation Thread Count` | `-1` | Width of the Sound-Tracing SDK compute pool (`maxComputeThreads`). `-1` is auto (based on the logical thread count, adjusted by the engine to min(performance cores, 6)), `0`/`1` is single, `2` or more is the given count. Applied before native initialization. |

### Public properties

| Property | Type | Meaning |
|---|---|---|
| `Instance` | `static SoundTraceManager` | The singleton Manager. `null` if none |
| `Scene` | `SoundScene` | The low-level scene owned by the Manager |
| `PrimaryListener` / `ListenerCount` / `SourceCount` / `ObjectCount` | — | Registration status |
| `DefaultMaterialsLoaded` | `int` | Number of automatically registered bundled materials |
| `LastValidPathCount` | `int` | Valid path count of the most recent propagation |
| `LastNativeError` | `string` | The most recent scene graph/propagation error |
| `PropagationThreadCount` | `int` | The applied compute thread count |

### Public methods

| Method | Behavior |
|---|---|
| `ResetMotionState()` | Resets the motion history of every Listener and Source right after a teleport, respawn, or scene transition. |

### Source count limit

`SoundTraceRuntime.MaxSources` (static `uint`, default `0`) is the cap on the number of
simultaneously live engine sources. `0` uses the engine platform default (desktop 128 · Android/iOS 48).
Set it **before** the first `SoundTraceListener` is enabled (it is passed as
`STRT_CreateOptions.maxSources`). Sources beyond the cap do not throw an exception —
`SoundSourceCore` warns once about `ST_STATUS_BUDGET_EXCEEDED` and leaves that `AudioSource` dry.

```csharp
SoundTraceRuntime.MaxSources = 64;   // before the first Listener is enabled
```

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

Usually added to the Main Camera.

### Inspector

| Field | Default | Range/choices |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`, `Fast`, `Middle`, `Quality` |
| `Ray Resolution` | `16` | `1..32`; the same value for the listener guide ray width and height |
| `Ray Depth` | `4` | `1..16`; maximum reflection depth |
| `Output Mode` | `Headset` | `Headset` (binaural), `Speaker` (stereo panning) |
| `HRTF` | `HRIR Interpolated` | The three modes below |
| `Max Delay Seconds` | `0` | `0..5 s`; ceiling of the per-source delay ring. `0` = engine platform ceiling (desktop 2 s · Android/iOS 1 s). A nonzero value overrides the ceiling (values below 0.012 s become 0.012 s) |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`; path appear/disappear crossfade |
| `Output EQ` | Off | Parametric EQ over the whole Sound-Tracing SDK mix — see [EQ](#eq) |

The engine allocates a delay ring per source only as large as its paths need and uses `Max Delay Seconds`
only as a ceiling. On Android/iOS the default ceiling is 1 s, so paths longer than that are not rendered.
If you need more distant paths, set the listener's `maxDelaySeconds`.

Selecting `Fast`, `Middle`, or `Quality` applies the ray values together and locks them in the
Inspector. Select `Custom` to edit them directly.

| Preset | Ray Resolution | Ray Depth | Recommended starting point |
|---|---:|---:|---|
| `Custom` | Saved value | Saved value | Manual tuning |
| `Fast` | `16` | `4` | Mobile, many sources |
| `Middle` | `24` | `8` | Typical games and desktop |
| `Quality` | `32` | `12` | Acoustics-heavy apps |

### HRTF and output modes

| Mode | Required asset | Description |
|---|---|---|
| `Band8` | None | Lightweight mode without an external table — renders as **stereo panning** |
| `Hrir` | None | The **MIT KEMAR** HRIR embedded in the engine |
| `HRIR Interpolated` | None | MIT KEMAR HRIR (default). Sound-Tracing SDK performs broadband HRIR convolution |

`Output Mode = Speaker` is panned output.

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource` pushes the output of the `AudioSource` on the same GameObject into the engine as
a mono stream. On enable it sets `AudioSource.spatialBlend` and `AudioSource.dopplerLevel` to `0` so
that SoundTrace handles spatialization and Doppler.

### Inspector

| Field | Default | Behavior |
|---|---:|---|
| `Intensity` | `1` | Source radiation intensity (pressure multiplier). Range `0..10` |
| `Reverb Ray Resolution` | `24` | Source transport ray horizontal and vertical resolution. Range `1..32` |
| `Reverb Ray Depth` | `4` | Maximum reflection depth of transport rays. Range `1..16` |
| `Enable Direct` / `Reflection` / `Diffraction` / `Reverb` / `Transmission` | `true` | Per-path gates |
| `Bypass` | `false` | Skips the SoundTrace render and passes the original `AudioSource` output through |
| `Source EQ` | Off | Parametric EQ applied to this source's signal — see [EQ](#eq) |

Distance attenuation is applied by the engine as physical `1/r` attenuation and air absorption, and the
maximum delay and fade are Listener settings. `Show Gizmo` in the Scene View shows the audible range per path.

### Public methods

| Method | Behavior |
|---|---|
| `SetBypass(bool enabled)` | When `true`, skips the SoundTrace render and passes the original output through. |
| `ResetMotionState()` | Re-anchors the motion reference to the current Transform to prevent a Doppler spike after a teleport. |

To align the playback timing of multiple `AudioSource`s, call `PlayScheduled()` against the same
`AudioSettings.dspTime`.

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject` registers `MeshFilter.sharedMesh` and the Renderer's submesh material slots. The
mesh data must be readable in a Build, so enable `Read/Write Enabled` in the Import Settings. Do not
call `UploadMeshData(true)` on procedural meshes.

### Geometry and acceleration structure

![BVH displayed in the Scene View](/img/unity/Img_STObjDome.png)

| Field | Default | Description |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree` (→ Sound-Tracing SDK HybridKD), `LBVH` (→ LBVH), `LBVH_SIMD4/8/16` (→ LBVH_SIMD) |
| `BVH Max Depth` / `Primitives Per Leaf` | `12` / `16` | Compatibility fields. **Ignored, because the engine decides the leaf size internally** |
| `Update Mode` | `Static` | `Static` (static TLAS) / `Dynamic` (transform updates only). `Refit` and `Rebuild` are kept for compatibility |

`BVH Type` only chooses the acceleration structure kind at mesh registration time. Objects that use
the same Mesh asset, material slots, and BVH settings share the native mesh through
`SoundTraceMeshCache` with reference counting.

### Skinned and procedural meshes

The engine has no vertex refit. To reflect deformed geometry, bake a new Mesh and re-register the
`SoundTraceObject` (or call `MeshCore.SetData`) to **replace it with a new native mesh**. Replacing
every frame is expensive, so refresh periodically (for example every 0.2 ~ 0.5 s).

### Public methods

`Auto Set` matches Renderer material names against the bundled presets. If an imported model root
has no mesh and the children own the geometry, use `Add To Child Meshes`.

| Method | Behavior |
|---|---|
| `AutoSetMaterialSlots()` | Automatically matches the Renderer material name of every submesh against the bundled presets. |
| `GetMaterialPresetIndex(int slotIndex)` / `GetPresetName(int slotIndex)` | Returns the preset index / display name of a slot. |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | Changes the preset of one slot. |
| `SetMaterialPresetForAllSlots(int presetIndex)` | Applies the same preset to every slot. |
| `GetNativeMaterialIndices()` | Returns the per-submesh preset indices as an array in the native registration format. |
| `GetTriangleCount()` | Returns the triangle count across all submeshes. |
| `static IsGpuCompatibleBvhType(BvhType value)` | Compatibility only. `true` for the SIMD family |

## Sound materials

The default authoring asset is `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`.
In `SoundTrace > Material Preset Library` you can:

- Add, remove, and reorder presets
- Import/export `soundMaterial.json` and re-import the bundled JSON
- Edit Scattering and the **9-band** Reflection, Absorption, and Transmission graphs

![Material Preset Library](/img/unity/Image_Mat_01.png)

The band centers are `63`, `125`, `250`, `500`, `1000`, `2000`, `4000`, `8000`, and `16000 Hz`.
`R + A + T` in every band must be `1`, with a tolerance of `0.001`. Wrong lengths and coefficients
are reported as errors, and 8-band input is not padded to 9 bands automatically.

The default materials are the 22 SoundTrace game materials.

| Index | Materials |
|---|---|
| 0 ~ 5 | `Concrete`, `Fabric`, `Wood`, `Brick`, `ConcreteBlock`, `Glass` |
| 6 ~ 11 | `Gravel`, `GypsumBoard`, `Linoleum,RubberOrAsphaltTile`, `Marble`, `Plaster`, `Plywood` |
| 12 ~ 17 | `Sherdded-woodFiberborad`, `Snow`, `Soil`, `Steel`, `Stone`, `WaterSurface` |
| 18 ~ 21 | `TunableAbsorber`, `LowVarianceTarget`, `ConcreteBlockPainted`, `FiberglassReinforcedPlastic` |

These are game presets, not measured data. Enter custom materials as 9 bands.

![Editing the per-band material graphs](/img/unity/Image_Mat_02.png)

Transmission is expressed through the per-band surface transmission coefficient `T`.

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

Add exactly one to the same GameObject as the Manager.

| Inspector field | Default | Description |
|---|---:|---|
| `Enable Path Visualization` | On | Whether to display the path mesh |
| `Refresh Interval Ms` | `50` | Minimum interval between visualization mesh rebuilds. Does not affect the propagation cadence |
| `Max Visualized Paths` | `1024` | Maximum number of paths to display (`16..5000`) |
| `Path Width` | `0.08` | Line width |
| `Path Alpha Intensity` | `0.5` | Display intensity |
| `Path Depth Mode` / `Sorting Layer` / `Sorting Order` | `AlwaysOnTop` / `Default` / `10` | Render sorting |
| `Draw Hit Triangles` | Off | Shows hit triangles in the Scene View |

Direct, Reflection, Diffraction, Reverb, and Transmission paths are drawn in per-type colors. It is a
debug tool; disable it for performance measurements and release builds. The main public members are
`Active`, `Render()`, and `Clear()`.

## Demo scenes

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

Demonstrates a basic room, source, listener, geometry, material presets, and path visualization.

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

Demonstrates source/listener movement, material preset changes, and a comparison between Unity's
original audio and the SoundTrace output.

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

Demonstrates multiple sources in a large space, wall occlusion, HRTF directionality while moving,
and the room response.

## Troubleshooting

| Symptom | What to check |
|---|---|
| No sound | The first Manager initialization error in the Console, Stereo/Best latency, AudioSource clip, presence of Manager/Listener |
| Source/Listener/Object requires a Manager | The `Failed to initialize SoundTraceManager` cause logged before the cascade errors |
| Geometry is not reflected | `Read/Write Enabled`, MeshFilter/MeshRenderer, child mesh placement, registration status |
| Deformed meshes are not reflected at runtime | The engine has no refit. Replace with a new mesh |
| Listener/Source disabled in FMOD/Wwise mode | Expected — the middleware plug-in renders |
| Some sources are not spatialized and sound dry | The `ST_STATUS_BUDGET_EXCEEDED` warning in the Console — reduce the sources or raise `SoundTraceRuntime.MaxSources` |
| Android build fails with `Sound-Tracing SDK requires Android API 28 or newer` | Set Player Settings › Minimum API Level to 28 or higher |
| Turning on the EQ changes nothing | The EQ-unsupported warning in the Console, whether you are in FMOD/Wwise integration mode (middleware EQ) |
| Pitch jumps after a teleport | Call `ResetMotionState()` right after changing the transform |
| Not enough performance | In order: `Quality → Middle → Fast`, lower Reverb Ray Resolution, disable the path visualizer |
| Multiple sources sound like comb filtering | Run `PlayScheduled()` against the same `AudioSettings.dspTime` |

## EQ

The Sound-Tracing SDK parametric EQ is applied in two places.

- **Source EQ** — applied to the source signal itself, before the engine's band split. The direct sound, reflections, diffraction, and reverb of that source all get the same tone.
- **Output EQ** — applied to the whole Sound-Tracing SDK mix at the end of the render (before the master gain).

The filter types are Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch (six; cuts are fixed at 12 dB/oct),
with a frequency range of 20 ~ 20,000 Hz, gain ±24 dB (Peaking and shelves only), Q 0.1 ~ 30 (shelves up to 3), and preamp −48 ~ +12 dB.
Off by default, and while off the engine is not called, so the output is the same as without an EQ. Only changed values are sent,
and the engine crossfades over 20 ms.

| Place | Inspector | Script |
|---|---|---|
| Source EQ | `Source EQ` on `SoundTraceSource` (and `SoundTraceClipSource`) | `SetSourceEq(SoundTraceEq)`, `SetSourceEqEnabled(bool)`, `GetSourceEq()` |
| Output EQ | `Output EQ` on `SoundTraceListener` | `SetOutputEq(SoundTraceEq)`, `SetOutputEqEnabled(bool)`, `GetOutputEq()` |

- `SoundTraceEq`: `enabled`, `preampDb`, `bands` (up to 16). `SoundTraceEqBand`: `enabled`, `type`, `frequencyHz`, `gainDb`, `q`.
- `SoundTraceEqFilterType`: `Peaking (Bell)` · `Low Shelf` · `High Shelf` · `High Cut (Low-pass)` · `Low Cut (High-pass)` · `Notch`.
  The Inspector hides Gain for the types that do not use it.
- An Inspector edit that changes only the output EQ does not restart rendering. Turning the source EQ off clears it in the engine, and it is applied again when the native source is re-created.
- Check support with `SoundTraceRuntime.SupportsSourceParametricEq` / `SupportsOutputParametricEq`.
- In FMOD/Wwise integration mode `SoundTraceListener` and `SoundTraceSource` are disabled, so use the middleware
  plug-in's EQ — [FMOD](./fmod.md#eq) · [Wwise](./wwise.md#eq).

## Next

- [Supported Platforms](./overview.md)
- [FMOD plug-in](./fmod.md) · [Wwise plug-in](./wwise.md)
- [Web SDK](./web.md) · [Unreal Engine SDK](./ue.md)
