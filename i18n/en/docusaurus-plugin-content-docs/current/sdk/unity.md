---
title: Unity
---

# SoundTrace SDK for Unity

SoundTrace SDK for Unity is a real-time spatial audio plugin that brings the native [STCoreV2](../core/stcorev2.md) engine into Unity. It sends Unity meshes, render-material slots, audio sources, and listener transforms into the SoundTrace runtime, then applies direct, reflection, diffraction, reverb, and transmission paths to Unity `AudioSource` output.

## Requirements

| Item | Requirement |
|---|---|
| Unity | `2022.3.62f2` or newer |
| Platforms | macOS, Windows, Linux, iOS, Android, WebGL |

## Unity Project Setup

### Unity Audio settings (image: unity-audio-settings-stereo-best-latency)

1. Open `Edit > Project Settings > Audio`.
2. Set `Default Speaker Mode` to `Stereo`.
3. Set `DSP Buffer Size` to `Best latency`.

![Unity Audio settings screen](/img/unity/Image01_AudioSetting.png)

## Getting Started

1. Place a mesh with `Read/Write Enabled` in the scene and add `SoundTraceObject`.
2. Add `SoundTraceListener` to the listener GameObject. Configure it together with Unity's built-in `AudioListener`. In a default Unity scene, note that `AudioListener` is already attached to the Main Camera.
3. Create a source GameObject and add `SoundTraceSource`. A Unity `AudioSource` is required automatically.
4. Assign the desired audio clip to the Unity `AudioSource`.
5. Create a manager GameObject and add `SoundTraceManager` and `SoundTracePathVisualizer`.
6. Position the listener, source, and `SoundTraceObject` geometry so reflected sound paths can form between them.
7. Enter Play Mode.
8. Enable path visualization on `SoundTracePathVisualizer`.
9. If reflected path lines appear between the listener, source, and objects, the basic setup is working.
10. Move the listener or source and verify that the sound changes physically.
11. If a `SoundTraceObject` uses `Static` update mode, moving it will not rebuild the geometry for runtime updates.
12. Use `Refit` for objects that need movement or runtime shape updates.
13. Use `Rebuild` only when the shape changes substantially. Avoid configurations that rebuild every frame.

## Main Features

### SoundTraceObject

`SoundTraceObject` registers a Unity `MeshFilter`/`MeshRenderer` as SoundTrace collision geometry. It is currently built around `MeshFilter` and `MeshRenderer`, and meshes used as SoundTrace geometry need `Read/Write Enabled` in import settings. Do not assume automatic per-tick baking of `SkinnedMeshRenderer` vertex deformation.

It does not change Unity render materials. It maps each render material slot to a SoundTrace material preset index and attaches that index to the corresponding submesh triangles.

### Sound material slots (image: soundtrace-object-material-slots-auto-set)

- `Auto Set` reads Unity render material names and assigns the closest SoundTrace material preset.
- For example, if a fantasy sword model such as `Sword` has a material name containing `Metal`, it maps to a `Steel`-style preset.
- If no name matches, or if a material is missing, the fallback is `Concrete`.
- If the automatic match is wrong, choose the preset manually from each submesh row dropdown.

### BVH and update mode

| Setting | Description |
|---|---|
| `HKDTree` | A high-detail structure with SBVH-like behavior. Raycasts are fast, and primitive detail is preserved well for static background meshes with holes or complex shapes. Rebuilds are slower. |
| `LBVH` | The default fast-build LBVH. On complex geometry it can approximate shape more roughly, so authored holes may behave as if they are closed. |
| `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` | SIMD variants of LBVH. Higher SIMD width can be better for complex scenes. |
| `bvhMaxDepth` | Maximum BVH depth. Larger depths can benefit more from traversal pruning, so start testing from a high value. |
| `primitivesPerLeaf` | Triangle count stored in each final leaf node. Smaller values improve detail but change build and traversal cost. |
| `Static` | For static geometry. Use it when runtime movement or shape changes do not need to affect propagation. |
| `Refit` | Keeps the existing structure while following runtime transform or shape updates. |
| `Rebuild` | Use only when topology or shape changes enough to require rebuilding the BVH. |

### SoundTraceListener (image: soundtrace-listener-inspector)

`SoundTraceListener` is the scene listener. It synchronizes Transform position and orientation to the native listener every frame and owns listener ray settings plus path-type enable flags.

| Setting | Description |
|---|---|
| `Ray Resolution` | Listener guide-ray resolution. The range is `1-64`, and one value is applied to both native listener width and height. A value of `16` uses `16 x 16` guide rays. |
| `Ray Depth` | Ray reflection/propagation depth. The range is `1-16`. Higher values improve reverb feel and complex path coverage but increase cost. |
| `Per-path enable` | Enables or disables `Direct`, `Reflection`, `Diffraction`, `Reverb`, and `Transmission` paths by type. |

For complex game scenes, start with `Ray Resolution 16` and `Ray Depth 4`.

### SoundTraceSource (image: soundtrace-source-inspector)

`SoundTraceSource` is the SoundTrace audio source component and requires a Unity `AudioSource`. It uses Unity's audio filter callback, `OnAudioFilterRead`, to render the input buffer in place into SoundTrace spatial output.

| Setting | Description |
|---|---|
| `Intensity` | Base source intensity. |
| `Gain Boost Db`, `Reverb Send Db`, `Reflection Send Db` | Overall gain and reverb/reflection send levels in dB. |
| `Reverb Rays` | Source-side reverb ray settings. `Ray Resolution` ranges from `1-64` and is applied to both reverb ray width and height. `Reverb Ray Depth` ranges from `1-16`. This is separate from listener rays. |
| `Per-path enable` | Enables or disables path types per source. |
| `Distance Attenuation` | Controls attenuation range per path type. The current inspector slider controls the attenuation constant; larger values make the effective range smaller. |
| `Distance Attenuation Gizmos` | Shows attenuation ranges per path type as Scene View wire spheres. |
| `Bypass` | Skips SoundTrace spatial rendering and passes the raw `AudioSource` output through unchanged. |

### SoundTraceManager

`SoundTraceManager` is the per-scene SoundTrace runtime owner. Listeners, sources, and objects register with it when enabled, and the manager runs scene ticks and propagation updates.

### SoundTraceManager settings (image: soundtrace-manager-visualizer-inspector)

| Setting | Description |
|---|---|
| `Propagation Interval Ms` | Interval for the ray-trace propagation pass. Position sync ticks every frame; propagation is throttled by this interval. |
| `Propagate On Start` | During `Start()`, flushes the scene graph once, then immediately runs one propagation pass and visualizer update. The next propagation runs after `Propagation Interval Ms`. |
| `Load Default Materials On Enable` | Registers the package's default `SoundTraceMaterialPresetLibrary.asset` into the native material table. |
| `Propagation Thread Count` | Worker count for the internal job system. `-1` lets STCoreV2 choose from logical hardware threads. The application should assign this based on CPU budget; begin production testing from 3 or more threads. |

### SoundTracePathVisualizer (image: soundtrace-path-visualizer-rays)

`SoundTracePathVisualizer` is a debugging component that renders valid paths as runtime line renderers. Use it to visually inspect reflection, diffraction, reverb, and transmission paths in the scene.

| Setting | Description |
|---|---|
| `Enable Path Visualization` | Turns path line rendering on or off. |
| `Max Visualized Paths` | Maximum number of paths shown on screen. |
| `Path Width` | Line width. |
| `Path Alpha Intensity` | Strength of attenuation-based alpha scaling. |
| `Draw Valid Paths`, `Draw Hit Triangles` | Scene View debug drawing options. |

### SoundTraceMaterialPresetLibrary (image: material-preset-library-editor)

The default material preset library is stored in the package at `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`. Select it from Unity with `SoundTrace > Material Preset Library`.

Each preset contains 8-band `Reflection`, `Absorption`, `Transmission`, and `Scattering` values. You can edit the ScriptableObject directly, add presets, and import or export `soundMaterial.json` from the inspector toolbar.

## Samples

:::info Planned
Sample documentation will be added on a separate page.
:::

## Troubleshooting

:::info Planned
Troubleshooting documentation will be added on a separate page.
:::
