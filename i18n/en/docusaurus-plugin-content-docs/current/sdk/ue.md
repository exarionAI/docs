---
title: Unreal Engine
description: Install the SoundTracing UE5 plugin and configure audio integration, HRTF, GPU propagation, material presets, and sample placeholders.
---

# SoundTrace SDK for Unreal Engine

The UE5 SDK connects [STCoreV2](../core/stcorev2.md) through Unreal Audio
Extension plugins and Actor Components. The current source project targets
Unreal Engine 5.6 and includes selection paths for native Unreal Audio, FMOD,
and Wwise integrations.

## Current status

| Area | Status |
|---|---|
| Engine | Unreal Engine 5.6 |
| Plugin | `Plugins/SoundTracing` |
| Declared targets | Win64, macOS, Linux, Android, iOS |
| Prebuilt binary in this checkout | Win64 Release |
| Demo scenes | Three documentation placeholders; scene assets are not included yet |

Other target platforms require the corresponding STCoreV2 binary in the
distributed package.

## Installation

1. Close the project.
2. Copy `Plugins/SoundTracing` into the target project's `Plugins/` directory.
3. Open the `.uproject` and enable the `SoundTracing` plugin.
4. Restart the editor and complete module compilation.
5. Open `Project Settings > Plugins > SoundTracing`.

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

## Unreal Audio settings

For each target platform, select:

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

The sample project uses 48 kHz, a 1024-frame callback, and one queued buffer.
Verify functionality with the current project audio budget before tuning it.

## Fastest setup

### 1. Project settings

Initially decide only:

- HRTF: `Band8` or `Parametric`
- Whether to request GPU propagation
- Default path enable states

Keep ray resolution, depth, and early-path budgets at their defaults.

### 2. Source settings assets

Create reusable `SoundTracing Audio Spatialization Settings` assets in the
Content Browser. Treat shared assets as presets instead of editing every Audio
Component independently.

| Preset asset | Use |
|---|---|
| `ST_Source_Fast` | Many simultaneous or background sources |
| `ST_Source_Middle` | Normal gameplay sources |
| `ST_Source_Quality` | Hero sources and quality-first demos |

The current plugin exposes advanced source properties, but most projects should
change only intensity, path enable flags, and attenuation overrides.

### 3. Audio Component

Assign the shared SoundTracing settings asset to the Audio Component or Sound
Attenuation spatialization plugin settings.

### 4. Geometry

Add `SoundTracingObjectComponent` as a direct child of the target
`StaticMeshComponent` or `SkinnedMeshComponent`. The current implementation
uses its immediate parent mesh.

### 5. Materials

Run `Sync Materials From Parent` to map render-material names to SoundTrace
material presets, then correct only mismatched slots.

## HRTF

The primary guide uses two modes.

| Mode | Behavior |
|---|---|
| `Band8` | Lightweight rendering without an external HRTF asset |
| `Parametric` | Measured rendering using a KU100 parametric table |

The source also contains `Convolution` and `SteamAudio` advanced modes. Use them
only in distributions that have validated the corresponding assets and platform
binaries.

## GPU backend

Enabling `bEnableGpuPropagation` requests GPU-provider initialization.

- Successful initialization uses GPU propagation.
- Missing exports, devices, or backends continue on CPU.
- Win64 packages must stage `webgpu_dawn.dll`.
- GPU deployments should use a compatible LBVH-family geometry setup.

Confirm the actual path through the Output Log message:
`SoundTracing GPU propagation enabled` or the CPU fallback warning.

## Material presets

The plugin content includes a default `SoundTraceMaterialPresetLibrary`.
`SoundTracingObjectComponent` maps render-material names and aliases to presets.
Start with the bundled presets; raw 8-band reflection, absorption, transmission,
and scattering edits belong in a separate custom library.

## Object updates

| Mode | Use |
|---|---|
| `Static` | Non-moving level geometry |
| `Dynamic` | Transform-only doors and props |
| `Refit` | Skinned meshes with changing vertex pose |
| `Rebuild` | Geometry whose topology changes |

## Path visualization

Add `SoundTracingPathVisualizerComponent` to display Niagara-based path
segments. It is a debugging/demo feature and should be disabled during shipping
performance measurements.

## Demo scene placeholders

The current checkout does not contain these three demo assets. These sections
reserve the documentation pattern that will be connected when the scenes ship.

### SampleScene01 — Basic Room

:::note Placeholder
Basic source, listener, static room geometry, material presets, and
direct/reflection paths.
:::

### SampleScene02 — Material and Dynamic Door

:::note Placeholder
Shared source presets, material changes, dynamic-door occlusion, and CPU/GPU
comparison.
:::

### SampleScene03 — Multiroom

:::note Placeholder
Multiple sources, room transitions, diffraction/transmission, and HRTF
direction.
:::

## Troubleshooting

| Symptom | Check |
|---|---|
| Plugin is missing from the selector | Plugin enable state, module compile, and platform Audio settings |
| Native library load failure | Target-specific binaries and staged dependencies under `ThirdParty/STCoreV2` |
| Source is not spatialized | SoundTracing source settings asset assigned to the Audio Component |
| Geometry is ignored | Object Component's immediate parent is a supported mesh component |
| GPU falls back to CPU | GPU provider/export/device and `webgpu_dawn.dll` staging |
| Paths are not visible | Visualizer component, Niagara plugin, and path enable states |

## Next

- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
