---
title: Unity
description: Install the SoundTrace Unity SDK and use quality presets, Band8/Parametric HRTF, GPU propagation, and the three sample scenes.
---

# SoundTrace SDK for Unity

The Unity SDK connects Unity meshes, render-material slots, sources, and the
listener to [STCoreV2](../core/stcorev2.md).

## Requirements

| Area | Support |
|---|---|
| Unity | 2022.3 LTS or newer |
| Desktop | macOS, Windows, Linux |
| Mobile | iOS, Android |
| Web | WebGL ST/MT plugins |

GPU propagation is enabled only when the installed native plugin and platform
support it. Unsupported configurations continue with CPU propagation. iOS and
Android currently use CPU propagation.

## Installation

In Unity Package Manager, select `Add package from git URL...` and enter:

```text
https://github.com/exarionAI/Unity_SoundTraceSDK.git
```

Authentication or a licensed package may be required. When cloning directly,
install the SDK in either `Packages/` or the development shell's
`Assets/SoundTrace`, never both.

## Unity Audio settings

1. Open `Edit > Project Settings > Audio`.
2. Set `Default Speaker Mode` to `Stereo`.
3. Set `DSP Buffer Size` to `Best latency`.

![Unity Audio settings](/img/unity/Image01_AudioSetting.png)

## Fastest setup

1. Add `SoundTraceManager` to an empty GameObject.
2. Add `SoundTraceListener` to the Main Camera.
3. Add `SoundTraceSource` to a source GameObject and assign an `AudioSource` clip.
4. Add `SoundTraceObject` to mesh GameObjects used as acoustic geometry.
5. Optionally add `SoundTracePathVisualizer` to the Manager GameObject.
6. Enter Play Mode and verify audio and paths.

![SoundTraceManager](/img/unity/Image06_Manager.png)

![SoundTraceListener](/img/unity/Image04_Listener.png)

![SoundTraceSource](/img/unity/Image05_Source.png)

![SoundTraceObject](/img/unity/Image03_SoundTraceObject.png)

## Quality presets

Start by selecting only `SoundTraceListener > Quality Preset`.

| Preset | Recommended target |
|---|---|
| `Fast` | Mobile, low-power devices, many sources |
| `Middle` | Default for normal games and desktop |
| `Quality` | High-end devices and quality-first demos |

The preset applies listener-ray and HRTF/diffuse render quality together.
Editing an individual controlled property changes the preset to `Custom`.
Normal integrations should use presets instead of manually tuning ray
resolution, depth, or path budgets.

## HRTF selection

Select the mode under `SoundTraceListener > HRTF`.

| Mode | Behavior |
|---|---|
| `Band8` | Lightweight path with no external HRTF table |
| `Parametric` | Measured path using the KU100 parametric asset |

The current Unity wrapper defaults to `Parametric`.
`Parametric` loads
`Runtime/Resources/SoundTrace/HRTF/KU100_bprime.bytes`; `Band8` needs no asset
load. Advanced HRIR modes also exist, but the primary guide focuses on Band8 and
Parametric.

## GPU backend

Enable `SoundTraceManager > Use GPU Backend` to request GPU propagation.

- Successful initialization uses the GPU backend.
- Unsupported plugins or devices continue with CPU fallback.
- `Propagation Thread Count` remains stored for fallback.
- WebGL uses the STCoreV2 WebGPU build.

The Manager runtime state reports `Active`, `Requested / CPU fallback`, or
`Disabled`.

## Acoustic material presets

`SoundTraceObject` maps Unity material slots to SoundTrace material presets.

1. Enable `Read/Write Enabled` in the mesh import settings.
2. Run `Auto Set` in the `SoundTraceObject` Inspector.
3. Override only incorrectly matched submeshes.

![Material Preset Library](/img/unity/Image_Mat_01.png)

The default library is
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`. Begin with
presets such as `Concrete`, `Steel`, `Marble`, `Snow`, and `Soil`. Editing raw
8-band values is an advanced custom-material workflow.

## Object updates

| Mode | Use |
|---|---|
| `Static` | Rooms, walls, and floors that do not move |
| `Dynamic` | Doors and props with transform-only movement |
| `Refit` | Skinned or animated meshes with stable topology |
| `Rebuild` | Geometry whose topology actually changes |

Most scenes need only `Static` and `Dynamic`.

## Main components

### SoundTraceManager

Use one per scene. It owns the native runtime, material presets, propagation
updates, and GPU/CPU backend selection.

### SoundTraceListener

Usually attached to the Main Camera. Select `Quality Preset` and `HRTF`, then
keep advanced controls at their defaults.

### SoundTraceSource

Spatializes the `AudioSource` on the same GameObject. To synchronize multiple
sources, use a shared `AudioSettings.dspTime` and `PlayScheduled()`.

### SoundTraceObject

Registers `MeshFilter` and `MeshRenderer` geometry. Use `Add To Child Meshes`
for imported models containing multiple mesh children.

### SoundTracePathVisualizer

Displays direct, reflection, diffraction, reverb, and transmission paths for
debugging. Disable it for shipping performance measurements.

## Samples

### SampleScene01

![SampleScene01](/img/unity/SampleScene01.png)

Basic room, source, listener, geometry, materials, and path visualization.

### SampleScene02

![SampleScene02](/img/unity/SampleScene02.png)

Source/listener movement, material presets, and comparison between Unity audio
and SoundTrace output.

### SampleScene03

![SampleScene03](/img/unity/Img_25_Sample03.png)

NPC sources in a larger space, wall occlusion, moving-listener HRTF direction,
and room response.

## Troubleshooting

| Symptom | Check |
|---|---|
| Silent output | Stereo/Best latency, AudioSource clip, Listener, and Manager |
| Geometry ignored | `Read/Write Enabled`, MeshFilter/MeshRenderer, update mode |
| GPU not active | Platform plugin support; CPU fallback warnings are valid |
| Low performance | Step down `Quality → Middle → Fast`, then disable visualization |
| Incorrect direction | Main Camera transform and duplicate AudioListeners |
| Multiple sources sound flanged | Start them from the same `AudioSettings.dspTime` |

## Next

- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
- [SDK Overview](./overview.md)
