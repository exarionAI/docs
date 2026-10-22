---
title: Unreal Engine
description: SoundTracing UE5 plugin 0.3.0 (SimpleST ABI 6) installation, Project Settings, listener/source/object components, Native/FMOD/Wwise integration modes, platform link contract.
---

# SoundTrace SDK for Unreal Engine

The SoundTracing UE5 plugin connects [SimpleST](../core/simplest.md) through the Unreal Audio Mixer
Spatialization plugin + submix and through Actor Components. From 0.3.0 the engine has changed from
STCoreV2 to **SimpleST 2.12.0 / ABI 6**, and when the project has an FMOD or Wwise plugin the same
source builds in an **integration mode** that attaches to that middleware's SimpleST plug-in.

## Current status

| Item | Details |
|---|---|
| Engine | Unreal Engine 5.6 (verified on 5.7) |
| Plugin | `Plugins/SoundTracing` 0.3.0 (`SoundTracing` runtime + `SoundTracingEditor` modules, depends on Niagara) |
| Supported platforms | Win64, Mac, Linux, Android, IOS |
| Distribution | `SoundTracing-release.zip` (plugin + standalone Python installer) |
| Engine binaries | `ThirdParty/SimpleST/Binaries/<Plat>/<Config>/` — only UE Debug uses the SDK Debug build, everything else uses Release |
| Demo scenes | 3 documentation placeholders. Shipped scenes are not included yet |

## Installation

Run the installer in an environment with Python 3.9+. It installs every included platform into the
project's `Plugins/SoundTracing` and keeps any existing plugin in `.simplest-backups/`. Project
settings are not modified.

```bash
python3 install.py /path/to/Game.uproject
python3 install.py /path/to/Game.uproject --dry-run
```

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

After installation, enable the `SoundTracing` plugin in the `.uproject` and restart the editor to
finish the module compile. The installation contains only the UE wrapper source, assets, the public
C ABI headers, per-platform engine binaries, the HRTF, and licenses.

## Integration modes — Native / FMOD / Wwise

![Integration mode selection](/img/ue/integration-mode.png)

`SoundTracing.Build.cs` picks the integration from the plugins enabled in the `.uproject`
(`Wwise` → `FMODStudio` → Native, in that order; force it with the environment variable
`SOUNDTRACING_UNREAL_INTEGRATION=native|fmod|wwise`). The components have the same names and usage
in all three modes.

| | Native | FMOD | Wwise |
|---|---|---|---|
| SimpleST context and render | SoundTracing (UE Audio Mixer Spatialization + submix) | `SimpleSTFmod` (Source/Listener DSP) | `SimpleSTWwise` (Sound-tracing Renderer) |
| What SoundTracing does | Everything | Geometry, materials, visualization, statistics only | Same (`sceneRatio = 0.01`, Unreal axes notification) |
| Listener | UE listener / `ListenerComponent` | FMOD listener 0 | Wwise listener |
| Engine DLL location | `ThirdParty/SimpleST/Binaries` | `FMODStudio/Binaries/<Plat>/` | `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` |

In FMOD and Wwise modes, the output settings of `ListenerComponent` (HRTF, output mode) and the
Source Settings assets are not used — the middleware plug-in's parameters take over that role.

### FMOD mode installation

```bash
python3 install.py /path/to/Game.uproject --fmod <fmod/plugins folder>
```

`--fmod` copies `SimpleSTFmod`, `SimpleSTRealtime`, and the HRTF into `Plugins/FMODStudio/Binaries/<Plat>/`
and adds `+PluginFiles=SimpleSTFmod` to `Config/DefaultEngine.ini` (= Project Settings › FMOD Studio ›
Plugin Files). Then, in FMOD Studio, put SimpleST Listener on the master bus and SimpleST Source on
the master track of 3D events — see [FMOD plug-in](./fmod.md).

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

### Wwise mode installation

```bash
python3 install.py /path/to/Game.uproject --wwise <wwise/SDK folder>
```

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

Any Audio Mixer Sample Rate works. SimpleST runs at 44.1 kHz and converts to the device rate (the
conversion is skipped at 44.1 kHz).

## Project Settings › Plugins › SoundTracing

![Project Settings](/img/ue/project-settings.png)

| Category | Item | Default | Description |
|---|---|---:|---|
| Runtime | `Max Compute Threads` | `0` | Upper bound of SimpleST compute threads. 0 = auto (min(performance cores, 6)). Requires restart |
| Runtime | `Prefer Performance Cores` | `true` | Pins the propagation lanes and compute pool to performance cores (disables Windows 11 EcoQoS). Recommended on hybrid CPUs |
| Runtime | `Render Mode` | `Buffered` | `Buffered` (the SimpleST render thread fills a ring and the callback copies, ≈3 blocks of latency) / `In Callback` (renders inside the Unreal audio callback, lowest latency) |
| Runtime | `Max Delay Seconds` | `0` | Maximum path delay the renderer keeps. 0 = engine default 2 s |
| Runtime | `Dry Fallback When Unavailable` | `true` | When the runtime is missing or fails, plays sources dry instead of silent |
| Runtime | `Output Submix Parent` | Empty | Parent of the spatialized output submix |
| Propagation | `Reflection Update Interval (ms)` | `33` | Minimum interval of the reflection/diffraction lane. It is most of the propagation cost, so raise this to buy back CPU. 0 = no limit |
| Propagation | `Direct Update Interval (ms)` / `Reverb Update Interval (ms)` | `10` / `4` | Minimum interval of the direct and reverb lanes |
| Propagation | `Acceleration Structure` | `TinyBVH` | BinnedSAH / HybridKD / TinyBVH / LBVH / LBVH SIMD |
| Propagation | `Static Rebuild Delay Seconds` | `0.1` | Wait before folding static geometry changes into the static acceleration structure (level-streaming batching) |
| Listener | `Default Listener Settings` | — | The listener settings struct below |
| Sources | `Source Ray Resolution Cap` / `Source Ray Depth Cap` | `0` / `0` | Upper bound on the transport ray grid and depth of every source asset. 0 = asset values as they are |
| Materials | `Material Preset Library` | Empty | Library registered with SimpleST at startup. Empty = the plugin's bundled library |

## Listener settings (`FSoundTracingListenerSettings`)

![Listener settings](/img/ue/listener-settings.png)

Project defaults live in Project Settings; per-level overrides go on `USoundTracingListenerComponent`.

| Category | Item | Default | Choices / description |
|---|---|---:|---|
| Quality Preset | `Quality Preset` | `Balanced` | `Custom` (keeps the fields) / `Fast` (12×12, depth 4) / `Balanced` (16×16, depth 8 = engine default) / `Quality` (24×24, depth 8) |
| Listener Rays | `Ray Resolution` / `Ray Depth` | `16` / `8` | Guide rays N×N (`4..64`), maximum reflection order (`1..16`). Editable only in Custom |
| Listener Rays | `Ray Sampling` | `FibonacciSphere` | LegacyGrid / FibonacciSphere / EqualAreaGrid / SobolSphere / Icosahedral |
| Output | `Output Mode` | `Headphones` | `Headphones` (binaural HRIR) / `Speakers (HOA decode)` / `Stereo Panning` |
| Output | `HRTF Dataset` | `SADIE II D2 KEMAR` | SADIE II D2 (8,802 directions, 256 taps, bundled with the plugin) / MIT KEMAR (128 taps, embedded in the engine) |
| Output | `Speaker Layout` | `Stereo 2.0` | Stereo 2.0 / Laptop Stereo 2.0 / 2.1 / 4.1 / 5.1 / 7.1 |
| Output | `Early Reflections` | `Hybrid Ambisonic Bed` | Headphones and Stereo Panning only. `Objects` is for reference listening — in a hall with 8 sources it costs 16.8 ms per block (budget 11.6 ms), Hybrid 2.4 ms |
| Render | `Doppler` / `Doppler Gain` | `true` / `Off` | Variable-delay pitch / moving-monopole radiation gain |
| Render | `Late Reverb` / `Late Reverb Coupling` | `true` / `Default` | FDN16 / Off · Subtle 6 dB · Default 9 dB · Strong 12 dB |
| Render | `Path Fade Time Seconds` | `0.05` | Path appear/disappear crossfade |
| Render | `Limiter` | `Off` | Off / Envelope / LookaheadPeak |
| Render | `Output EQ Enabled` / `Output EQ Gains Db` | `false` | 9 bands from 63 to 16k Hz, ±24 dB |
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
| `Drive Listener Transform` | Passes this component's world transform and velocity to SimpleST instead of the audio device listener |
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
| Attenuation | `Preserve Unreal Attenuation` | `false` | Keeps Unreal distance attenuation when enabled (usually off — SimpleST applies physical attenuation) |
| Attenuation | `Disable Unreal Reverb Sends` | `false` | Blocks Unreal reverb sends |
| Emission | `Gain Boost Db` | `0` | Input level (±24 dB) |
| Emission | `Direct/Reflection/Diffraction/Reverb Send Db` | `0` | SimpleST path volume |
| Emission | `Directivity` | `0` | 0 omnidirectional ~ 1 cardioid |
| Reverb Rays | `Ray Preset` | `Balanced` | `Fast` (8×4, depth 3) / `Balanced` (16×8, depth 4 = engine default) / `Quality` (24×12, depth 6) / `Custom` |
| Reverb Rays | `Ray Resolution` / `Ray Depth` | `16` / `4` | N×N/2 transport rays, depth. Editable only in Custom |
| Reverb Rays | `Transport Refresh Steps` | `0` | Spreads the transport grid refresh over n propagations (0 = engine default) |
| Reverb Rays | `Stationary Emitter` | `false` | Hint that the emitter never moves |
| Per-Path Enable | `Direct/Transmission/Reflection/Diffraction/Reverb Path Enabled` | All `true` | Per-source path gates |
| Bypass | `Bypass` | `false` | Passes through without going through SimpleST |

## Geometry (`USoundTracingObjectComponent`)

![Object Component](/img/ue/object-component.png)

Add it as the **immediate child** of the `StaticMeshComponent` or `SkinnedMeshComponent` to be used
as acoustic geometry. Objects that use the same mesh asset, LOD, and material layout share one
SimpleST mesh.

| Item | Default | Description |
|---|---:|---|
| `Acoustic Mobility` | `Auto` | `Auto` (follows the parent Mobility) / `Static` (static acceleration structure, rebuilt when moved) / `Movable` (dynamic instance, transform applied every propagation cycle) |
| `Sound Material Slots` | — | Render material slot → `Sound Material Type` (preset index). The `Auto Set Materials` button assigns by name and alias |
| `Skinned Pose Refresh Seconds` | `0` | Skinned parents only. SimpleST has no vertex refit, so a **new mesh is built** and swapped in at this interval. 0 = keep the pose at registration |
| `Auto Register Native Object` / `Sync Transform On Tick` / `Auto Sync Materials` | `true` | Advanced |
| Debug: `Visualize Acoustic Mesh`, `Visualize BVH` (+ `BVH Depth`, `BVH Leaves Only`) | Off | When selected, shows the uploaded triangles and acceleration-structure node boxes in the editor |

Dedicated servers skip registration. From Blueprint you can call `RegisterNativeObject`,
`UnregisterNativeObject`, `SyncNativeTransform`, `RefreshNativeMesh`, and the material slot
getters/setters.

## Material presets

The `SoundTraceMaterialPresetLibrary` in the plugin content provides the 22 SoundTrace game materials
as 9-band presets, with the same names, order (index 0 `Concrete` ~ 21 `FiberglassReinforcedPlastic`)
and 9-band values as the Unity and Web SDKs. They are game presets, not measured data, converted from
the previous 8-band values: reflection R and transmission T are kept, absorption A = 1 − R − T, and the
16 kHz band repeats the 8 kHz value. Legacy STCoreV2 material libraries and `soundMaterial.json` tables
are converted the same way on load (including `Import From JSON`); resave converted assets.
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

## Demo scene placeholders

The current SDK checkout does not include the three documentation demo scenes below. They are
placeholders to be linked in the same pattern as the Unity documentation once the actual assets are
added.

### SampleScene01 — Basic Room

:::note Placeholder
A scene to explain a basic source, listener, static room geometry, material presets, and
direct/reflection paths.
:::

### SampleScene02 — Material and Dynamic Door

:::note Placeholder
A scene to explain shared source presets, material changes, Movable door occlusion, and a comparison
of the Buffered/In Callback render modes.
:::

### SampleScene03 — Multiroom

:::note Placeholder
A scene to explain multiple sources, moving between rooms, diffraction/transmission, HRTF
directionality, and late reverb coupling.
:::

## Troubleshooting

| Symptom | What to check |
|---|---|
| The plugin is not in the selection list | Plugin enabled, module compile, target platform Audio settings |
| Native library load failure | Per-target binaries under `ThirdParty/SimpleST/Binaries`, Config (Debug/Release) matching |
| Integration mode differs from what you expect | Wwise/FMODStudio plugin enabled state in the `.uproject`, `SOUNDTRACING_UNREAL_INTEGRATION` |
| Sound is not spatialized in FMOD/Wwise mode | SimpleST DSP configuration on the FMOD Studio / Wwise project side, runtime READY state (Output Log) |
| Source is not spatialized (Native) | A SoundTracing Source Settings asset is attached to the Audio Component |
| Geometry is not reflected | The Object Component's immediate parent is a supported mesh component, `Acoustic Mobility` |
| Render block overrun (audio dropouts) | `Early Reflections = Hybrid`, raise `Reflection Update Interval`, lower the Quality Preset |
| No paths visible | Visualizer component, Niagara plugin, path enable state |

## Next

- [FMOD plug-in](./fmod.md) · [Wwise plug-in](./wwise.md)
- [Unity SDK](./unity.md) · [Web SDK](./web.md)
- [SimpleST](../core/simplest.md)
