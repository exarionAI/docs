---
title: Unreal Engine
description: Sound-Tracing SDK for Unreal Engine — installation, Native/FMOD/Wwise integration modes, Project Settings, listener/source/object components, one-shot sounds, source and output EQ.
---

# Sound-Tracing SDK for Unreal Engine

The Sound-Tracing SDK for UE5 plugin connects the engine through the Unreal Audio Mixer Spatialization
plugin + submix and through Actor Components.

## Current status

| Item | Details |
|---|---|
| Engine | Unreal Engine 5.6 (verified on 5.7) |
| Plugin | `Plugins/SoundTracing` (`SoundTracing` runtime + `SoundTracingEditor` modules, depends on Niagara) |
| Supported platforms | Win64, Mac, Linux, Android, IOS |
| Engine binaries | `ThirdParty/SimpleST/Binaries/<Plat>/<Config>/` — only UE Debug uses the SDK Debug build, everything else uses Release |

## Installation

Put the downloaded `SoundTracing` plugin folder into your Unreal project's `Plugins/` folder (create it if it does
not exist). To use it across several projects you can also put it in `<UE install folder>/Engine/Plugins/Marketplace/`.
Reopening the editor compiles the modules (a non-C++ project shows a dialog asking to compile); check that
**SoundTracing** is enabled in `Edit > Plugins`, then restart the editor.

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/           Niagara path visualization, Material Preset Library
      ├─ Source/            SoundTracing · SoundTracingEditor
      └─ ThirdParty/SimpleST/
         ├─ Include/SimpleST/ABI/
         ├─ Binaries/<Plat>/<Config>/
         └─ Resources/HRTF/
```

The plugin contains the UE wrapper source, assets, the public C ABI headers, per-platform engine binaries, the
HRTF, and licenses.

## Integration modes — Native / FMOD / Wwise

![Integration mode selection](/img/ue/integration-mode.png)

`SoundTracing.Build.cs` picks the integration from the plugins enabled in the `.uproject`
(`Wwise` → `FMODStudio` → Native, in that order; force it with the environment variable
`SOUNDTRACING_UNREAL_INTEGRATION=native|fmod|wwise`). The components have the same names and usage
in all three modes.

| | Native | FMOD | Wwise |
|---|---|---|---|
| Sound-Tracing SDK context and render | SoundTracing (UE Audio Mixer Spatialization + submix) | `SimpleSTFmod` (Source/Listener DSP) | `SimpleSTWwise` (Sound-tracing Renderer) |
| Listener | UE listener / `ListenerComponent` | FMOD listener | Wwise listener |
| Engine DLL location | `ThirdParty/SimpleST/Binaries` | `FMODStudio/Binaries/<Plat>/` | `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` |

In FMOD and Wwise modes, the output settings of `ListenerComponent` (HRTF, output mode) and the
Source Settings assets are not used — the middleware plug-in's parameters take over that role.

- **DSP**: Native mode renders inside the Unreal Audio Mixer; FMOD/Wwise modes let the middleware plug-in render.
- **Transform updates**: objects — `SoundTracingObjectComponent.cpp` `TickComponent()` → `SyncNativeTransform()`;
  listener — `SoundTracingListenerComponent.cpp` `TickComponent()`. Common to all three modes.

### FMOD mode installation

`Unreal/SoundTracing` in the FMOD distribution (`SimpleST-fmod-release.zip`) is the **FMOD edition**.
`ThirdParty/SimpleSTFmod/<Plat>/` contains `SimpleSTFmod`, `SimpleSTRealtime`, and the HRTF.

1. Put FMOD for Unreal into the project's `Plugins/FMODStudio`.
2. Put `Unreal/SoundTracing` into the project's `Plugins/` and build. During the build, SoundTracing copies
   the files above into `Plugins/FMODStudio/Binaries/<Plat>/` and adds `+PluginFiles=SimpleSTFmod` to
   `Config/DefaultEngine.ini` (= Project Settings › FMOD Studio › Plugin Files). Files that are already
   there are skipped. Win64 · Mac.
3. Then, in FMOD Studio, put SimpleST Listener on the master bus and Sound-Tracing SDK Source on
the master track of 3D events — see [FMOD plug-in](./fmod.md).

### Wwise mode installation

The Wwise plug-in is installed by the Audiokinetic Launcher, like any other Wwise plug-in.

1. Install **Sound-Tracing SDK for Wwise** (plug-in name `Sound-tracing`), obtained from the Audiokinetic Launcher store, into Wwise.
2. Run Launcher › **Unreal Engine › Modify Wwise in Project** (Integrate the first time). The Launcher copies the
   Wwise SDK plug-ins (including Sound-tracing) into `WwiseSoundEngine/ThirdParty`.
3. Put `SoundTracing` into the project's `Plugins/` and build.

![Modify Wwise in Project in the Launcher](/img/wwise/launcher-modify-project.png)

At module startup SoundTracing grabs the plug-in, sets `sceneRatio = 0.01` (Wwise Unreal units = cm),
and notifies it of the Unreal axes (+Z up) with `SimpleSTWwise_SetWorldAxes(UNREAL)`, because Wwise
for Unreal 2024.1+ passes positions without an axis conversion — see [Wwise plug-in](./wwise.md).

![UE Wwise install result](/img/wwise/ue-install.png)

## Unreal Audio settings (Native mode)

Select the following plugins in the Audio settings of each target platform.

![Audio plugin settings](/img/ue/audio-plugin-settings.png)

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

Any Audio Mixer Sample Rate works. The Sound-Tracing SDK runs at 44.1 kHz and converts to the device rate (the
conversion is skipped at 44.1 kHz).

## Project Settings › Plugins › SoundTracing

![Project Settings](/img/ue/project-settings.png)

| Category | Item | Default | Description |
|---|---|---:|---|
| Runtime | `Max Compute Threads` | `0` | Upper bound of Sound-Tracing SDK compute threads. 0 = auto (min(performance cores, 6)). Requires restart |
| Runtime | `Prefer Performance Cores` | `true` | Pins the propagation lanes and compute pool to performance cores (disables Windows 11 EcoQoS). Recommended on hybrid CPUs |
| Runtime | `Render Mode` | `Buffered` | `Buffered` (the Sound-Tracing SDK render thread fills a ring and the callback copies, ≈3 blocks of latency) / `In Callback` (renders inside the Unreal audio callback, lowest latency) |
| Runtime | `Max Sources` | `0` | Advanced. Cap on the number of simultaneously live engine sources. 0 = engine platform default (desktop 128, Android/iOS 48). The engine rejects sources beyond it (`ST_STATUS_BUDGET_EXCEEDED`, shown in the log) and the component falls back to the dry path. Applied at creation in Native mode, where SoundTracing creates the context (requires restart). FMOD/Wwise modes follow the plug-in settings |
| Runtime | `Max Delay Seconds` | `0` | Advanced. Ceiling of the per-source delay ring. 0 = engine platform default (desktop 2 s, Android/iOS 1 s). The ring grows only as far as the paths need |
| Runtime | `Dry Fallback When Unavailable` | `true` | When the runtime is missing or fails, plays sources dry instead of silent |
| Runtime | `Output Submix Parent` | Empty | Parent of the spatialized output submix |
| Propagation | `Reflection Update Interval (ms)` | `33` | Minimum interval of the reflection/diffraction lane. It is most of the propagation cost, so raise this to buy back CPU. 0 = no limit |
| Propagation | `Direct Update Interval (ms)` / `Reverb Update Interval (ms)` | `10` / `4` | Minimum interval of the direct and reverb lanes |
| Propagation | `Acceleration Structure` | `TinyBVH` | BinnedSAH / HybridKD / TinyBVH / LBVH / LBVH SIMD |
| Propagation | `Static Rebuild Delay Seconds` | `0.1` | Wait before folding static geometry changes into the static acceleration structure (level-streaming batching) |
| Listener | `Default Listener Settings` | — | The listener settings struct below |
| Sources | `Source Ray Resolution Cap` / `Source Ray Depth Cap` | `0` / `0` | Upper bound on the transport ray grid and depth of every source asset. 0 = asset values as they are |
| Listener | `Output EQ` | Off | Parametric output EQ over the whole Sound-Tracing SDK mix — see [EQ](#eq). While on, it replaces the listener's graphic `Output EQ`. Native mode only |
| Materials | `Material Preset Library` | Empty | Library registered with the Sound-Tracing SDK at startup. Empty = the plugin's bundled library |

## Listener settings (`FSoundTracingListenerSettings`)

![Listener settings](/img/ue/listener-settings.png)

Project defaults live in Project Settings; per-level overrides go on `USoundTracingListenerComponent`.

| Category | Item | Default | Choices / description |
|---|---|---:|---|
| Quality Preset | `Quality Preset` | `Balanced` | `Custom` (keeps the fields) / `Fast` (12×12, depth 4) / `Balanced` (16×16, depth 8 = engine default) / `Quality` (24×24, depth 8) |
| Listener Rays | `Ray Resolution` / `Ray Depth` | `16` / `8` | Guide rays N×N (`4..64`), maximum reflection order (`1..16`). Editable only in Custom |
| Listener Rays | `Ray Sampling` | `FibonacciSphere` | `FibonacciSphere` only |
| Output | `Output Mode` | `Headphones` | `Headphones` (binaural HRIR) / `Speakers (HOA decode)` / `Stereo Panning` |
| Output | `HRTF Dataset` | `SADIE II D2 KEMAR` | SADIE II D2 (8,802 directions, 256 taps, bundled with the plugin) / MIT KEMAR (128 taps, embedded in the engine) |
| Output | `Speaker Layout` | `Stereo 2.0` | Stereo 2.0 / Laptop Stereo 2.0 / 2.1 / 4.1 / 5.1 / 7.1 |
| Output | `Early Reflections` | `Hybrid Ambisonic Bed` | Headphones and Stereo Panning only. `Objects` is for reference listening — in a hall with 8 sources it costs 16.8 ms per block (budget 11.6 ms), Hybrid 2.4 ms |
| Render | `Doppler` / `Doppler Gain` | `true` / `Off` | Variable-delay pitch / moving-monopole radiation gain |
| Render | `Late Reverb` / `Late Reverb Coupling` | `true` / `Default` | FDN16 / Off · Subtle 6 dB · Default 9 dB · Strong 12 dB |
| Render | `Path Fade Time Seconds` | `0.05` | Path appear/disappear crossfade |
| Render | `Limiter` | `Off` | Off / Envelope / LookaheadPeak / True Peak (−1 dBTP, 137-sample latency). Default `Off` — the Unreal master chain handles limiting |
| Render | `Output EQ Enabled` / `Output EQ Gains Db` | `false` | Graphic EQ, 9 bands from 63 to 16k Hz, ±24 dB. While the parametric `Output EQ` in Project Settings is on it wins; turning it off brings these values back |
| Paths | `Enable Direct/Transmission/Reflection/Diffraction/Reverb Path` | All `true` | Global path gates |
| Acoustics | `Propagation Delay` / `Direct Occlusion` | `true` / `true` | When disabled: every path collapses onto the direct-sound time / the direct sound passes through geometry |
| Acoustics | `Reference Distance Meters` / `Min Distance Meters` | `1.0` / `1.0` | Start distance of physical `1/r` attenuation / near-field clamp |
| Air Absorption | `Air Absorption Enabled`, `Temperature Celsius`, `Relative Humidity Percent`, `Pressure Pa` | `true`, `20`, `50`, `101325` | ISO 9613-1. Speed of sound derived from temperature |

### `USoundTracingListenerComponent`

An optional component. Without it the plugin runs with the project default listener settings and
the audio device listener transform. Attach it to a Pawn or camera to provide per-level overrides or
to drive the transform directly.

| Item | Description |
|---|---|
| `Override Project Listener Settings` / `Listener Settings` | Overrides the project defaults with the struct above |
| `Drive Listener Transform` | Passes this component's world transform and velocity to the Sound-Tracing SDK instead of the audio device listener (rotation includes roll) |
| `ApplyListenerSettings()`, `SetQualityPreset()`, `SetHrtfDataset()`, `SetOutputMode()`, `SetSpeakerLayout()` | Runtime changes from Blueprint |
| `ResetMotionState()` | Prevents a Doppler spike after a teleport or respawn |

## Source settings asset (`USoundTracingSourceSettings`)

![Source Settings asset](/img/ue/source-settings-asset.png)

Create a `SoundTracing Source Settings` asset in the Content Browser and attach it to the
spatialization plugin settings of an Audio Component or Sound Attenuation. Use shared assets per
purpose like presets.

| preset asset | Use |
|---|---|
| `ST_Source_Fast` | Many concurrent sources, background sources |
| `ST_Source_Balanced` | Typical gameplay sources |
| `ST_Source_Quality` | Hero sources, quality-first demos |

| Category | Item | Default | Description |
|---|---|---:|---|
| Attenuation | `Preserve Unreal Attenuation` | `false` | Keeps Unreal distance attenuation when enabled (usually off — the Sound-Tracing SDK applies physical attenuation) |
| Attenuation | `Disable Unreal Reverb Sends` | `false` | Blocks Unreal reverb sends |
| Emission | `Gain Boost Db` | `0` | Input level (±24 dB) |
| Emission | `Direct/Reflection/Diffraction/Reverb Send Db` | `0` | Sound-Tracing SDK path volume |
| Emission | `Directivity` | `0` | 0 omnidirectional ~ 1 cardioid |
| Reverb Rays | `Ray Preset` | `Balanced` | `Fast` (8×4, depth 3) / `Balanced` (16×8, depth 4 = engine default) / `Quality` (24×12, depth 6) / `Custom` |
| Reverb Rays | `Ray Resolution` / `Ray Depth` | `16` / `4` | N×N/2 transport rays, depth. Editable only in Custom |
| Reverb Rays | `Transport Refresh Steps` | `0` | Spreads the transport grid refresh over n propagations (0 = engine default) |
| Reverb Rays | `Stationary Emitter` | `false` | Hint that the emitter never moves |
| Per-Path Enable | `Direct/Transmission/Reflection/Diffraction/Reverb Path Enabled` | All `true` | Per-source path gates |
| Bypass | `Bypass` | `false` | Passes through without going through the Sound-Tracing SDK |
| EQ | `Source EQ` | Off | Parametric EQ applied to the signal of sources using this asset — see [EQ](#eq) |

## One-shot sounds

The engine fades in every path of a **new source** over 150 ms and waits for its first IR, so
creating a new engine source every time a short sound plays makes it sound quiet and late.
The plugin handles this per mode.

- **Native mode**: an engine source pool is created up front when the context starts, and when a
  voice ends its source returns to the pool so the nearest next voice picks it up. Playing a new
  Audio Component or sound for every playback does not create a new engine source.
- **FMOD / Wwise mode**: rendering is done by the middleware plug-in, so this follows its warm source
  pool — [FMOD](./fmod.md#one-shots-and-the-warm-source-pool) ·
  [Wwise](./wwise.md#one-shots-and-the-warm-source-pool). Cases that register a new game object per
  sound, such as **Wwise AudioLink**, are handled as well.

## Geometry (`USoundTracingObjectComponent`)

![Object Component](/img/ue/object-component.png)

Add it as the **immediate child** of the `StaticMeshComponent` or `SkinnedMeshComponent` to be used
as acoustic geometry. Objects that use the same mesh asset, LOD, and material layout share one
Sound-Tracing SDK mesh.

| Item | Default | Description |
|---|---:|---|
| `Acoustic Mobility` | `Auto` | `Auto` (follows the parent Mobility) / `Static` (static acceleration structure, rebuilt when moved) / `Movable` (dynamic instance, transform applied every propagation cycle) |
| `Sound Material Slots` | — | Render material slot → `Sound Material Type` (preset index). The `Auto Set Materials` button assigns by name and alias |
| `Skinned Pose Refresh Seconds` | `0` | Skinned parents only. The Sound-Tracing SDK has no vertex refit, so a **new mesh is built** and swapped in at this interval. 0 = keep the pose at registration |
| `Auto Register Native Object` / `Sync Transform On Tick` / `Auto Sync Materials` | `true` | Advanced |
| Debug: `Visualize Acoustic Mesh`, `Visualize BVH` (+ `BVH Depth`, `BVH Leaves Only`) | Off | When selected, shows the uploaded triangles and acceleration-structure node boxes in the editor |

Dedicated servers skip registration. From Blueprint you can call `RegisterNativeObject`,
`UnregisterNativeObject`, `SyncNativeTransform`, `RefreshNativeMesh`, and the material slot
getters/setters.

## Material presets

The `SoundTraceMaterialPresetLibrary` in the plugin content provides the 22 SoundTrace game materials
as 9-band presets, with the same names, order (index 0 `Concrete` ~ 21 `FiberglassReinforcedPlastic`)
and 9-band values as the Unity and Web SDKs. They are game presets, not measured data.
`Sound Material Slots` picks the closest preset from the render material name and aliases. Limit
direct editing of the 9-band reflection, absorption, transmission, and scattering values to cases
where you have created a separate Material Preset Library asset. Every band must satisfy
`R + A + T = 1` (±0.001).

## Path visualization

![Path Visualizer](/img/ue/path-visualizer.png)

Adding `SoundTracingPathVisualizerComponent` to an Actor displays Niagara-based path segments. You
can adjust the color per path type (Direct, Reflection, Diffraction, Reverb, Transmission, GuideRay),
the maximum path count, line width, and alpha. It is for debugging and demos; disable it for
shipping performance measurements.

## Statistics (`USoundTracingSubsystem`)

A World Subsystem readable from Blueprint — integration mode, scene mesh/object/source/triangle
counts, valid path count, per-lane propagation/IR/render time (ms), and render block statistics
(active sources, exact/send taps).

`SetSoundTracingEnabled(bool)` / `IsSoundTracingEnabled()` turn sound tracing on and off as a whole.
While it is off, moving the listener or sources does not wake the propagation lanes, and
visualization paths are not collected either, so no stale paths remain. In FMOD and Wwise modes,
this switch is passed on to the middleware plug-in
(`SimpleSTFmod_SetSoundTracingEnabled` / `SimpleSTWwise_SetSoundTracingEnabled`). The engine has no
propagation pause, so while sources remain the lanes keep running at their own cadence.

## Platform link contract

| UE platform | SDK path (under `Binaries/`) | Linking |
|---|---|---|
| Win64 | `Win64/<Config>/SimpleSTRealtime.dll` | Runtime export binding |
| Mac | `Mac/<Config>/libSimpleSTRealtime.dylib` | Universal, runtime binding |
| Linux | `Linux/<Config>/libSimpleSTRealtime.so` | x86_64, runtime binding |
| Android | `Android/<ABI>/<Config>/libSimpleSTRealtime.so` | Copied into the per-ABI APK folder via UPL. HRTF extracted from the UFS |
| IOS | `<Config>/libsimplest_static.a` under `IOS/device` or `IOS/simulator` | Static link, direct function-pointer binding |

Only UE Debug uses the SDK Debug build; Development/DebugGame/Shipping use Release. A missing binary
is a UBT-stage error. FMOD/Wwise modes are not yet supported on iOS and Web, where the middleware
plug-ins are statically linked (verified on desktop Win64; Mac/Linux share the same code path).

## Troubleshooting

| Symptom | What to check |
|---|---|
| The plugin is not in the selection list | Plugin enabled, module compile, target platform Audio settings |
| Native library load failure | Per-target binaries under `ThirdParty/SimpleST/Binaries`, Config (Debug/Release) matching |
| Integration mode differs from what you expect | Wwise/FMODStudio plugin enabled state in the `.uproject`, `SOUNDTRACING_UNREAL_INTEGRATION` |
| Sound is not spatialized in FMOD/Wwise mode | Sound-Tracing SDK DSP configuration on the FMOD Studio / Wwise project side, runtime READY state (Output Log) |
| Source is not spatialized (Native) | A SoundTracing Source Settings asset is attached to the Audio Component |
| Geometry is not reflected | The Object Component's immediate parent is a supported mesh component, `Acoustic Mobility` |
| Render block overrun (audio dropouts) | `Early Reflections = Hybrid`, raise `Reflection Update Interval`, lower the Quality Preset |
| Short sounds play quiet or late (FMOD/Wwise mode) | `SIMPLESTFMOD_WARM_SOURCES=0` is not set |
| Some sources play dry (Native) | `ST_STATUS_BUDGET_EXCEEDED` in the Output Log — reduce the sources or raise `Max Sources` |
| Turning on the EQ changes nothing | Whether you are in Native mode (FMOD/Wwise mode uses the middleware EQ), the EQ-unsupported warning in the Output Log |
| Turning sound tracing off has no effect in FMOD/Wwise mode | Whether the plug-in version exports `*_SetSoundTracingEnabled` (if not, a warning appears in the Output Log) |
| No paths visible | Visualizer component, Niagara plugin, path enable state, sound tracing is not turned off |

## EQ

The Sound-Tracing SDK's parametric EQ is applied in two places.

- **Source EQ** — applied to the source signal itself, before the engine's band split. That source's direct sound, reflections, diffraction, and reverb all get the same tone.
- **Output EQ** — applied to the whole Sound-Tracing SDK mix at the end of the render (before the master gain).

There are 6 filter types: Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch (cuts are fixed at 12 dB/oct).
Ranges are frequency 20 ~ 20,000 Hz, gain ±24 dB (Peaking and shelves only), Q 0.1 ~ 30 (shelves up to 3), preamp −48 ~ +12 dB.
Off by default, and while off the engine is not called, so the output is the same as without EQ. Only changed values are
sent, and the engine crossfades over 20 ms.

Both places use the same struct `FSoundTracingEq` (`Enabled`, `Preamp (dB)`, `Bands` up to 16).

| Place | Setting | Runtime change |
|---|---|---|
| Source EQ | Source Settings asset `Source EQ` | `USoundTracingSourceSettings::SetSourceEq` / `GetSourceEq` (Blueprint) |
| Output EQ | Project Settings › SoundTracing › Listener › `Output EQ` | `USoundTracingSubsystem::SetOutputEq` / `ClearOutputEqOverride` / `GetOutputEq` |

- A band (`FSoundTracingEqBand`) has `Enabled`, `Type`, `Frequency Hz`, `Gain (dB)`, and `Q`. `Type` (`ESoundTracingEqFilterType`) is
  `Peaking (Bell)` · `Low Shelf` · `High Shelf` · `High Cut (Low-pass)` · `Low Cut (High-pass)` · `Notch`.
- `SetSourceEq` also applies immediately to voices already playing with that asset, and sources reused from the
  engine source pool get their EQ set or cleared when created.
- `SetOutputEq` overrides the Project Settings value until `ClearOutputEqOverride` is called, and persists across
  runtime restarts. Passing a disabled EQ turns the output EQ off. While on, it replaces the listener's 9-band graphic `Output EQ`.
- **Native mode only.** In FMOD/Wwise mode use the middleware plug-in's EQ —
  [FMOD](./fmod.md#eq) · [Wwise](./wwise.md#eq).

## Next

- [FMOD plug-in](./fmod.md) · [Wwise plug-in](./wwise.md)
- [Unity SDK](./unity.md) · [Web SDK](./web.md)
