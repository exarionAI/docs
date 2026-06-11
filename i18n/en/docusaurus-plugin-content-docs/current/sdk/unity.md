---
title: Unity
---

# SoundTrace SDK for Unity

SoundTrace SDK for Unity is a real-time spatial audio plugin that brings the native [STCoreV2](../core/stcorev2.md) engine into Unity. It sends Unity meshes, render-material slots, audio sources, and listener transforms into the SoundTrace runtime, then applies direct, reflection, diffraction, reverb, and transmission paths to Unity `AudioSource` output.

## Requirements

| Item | Requirement |
|---|---|
| Unity | `2022.3.62f2` or newer |
| Platforms | macOS, Windows, Linux, iOS, Android |

## Unity Project Setup

### Unity Audio settings

1. Open `Edit > Project Settings > Audio`.
2. Set `Default Speaker Mode` to `Stereo`.
3. Set `DSP Buffer Size` to `Best latency`.

![Unity Audio settings screen](/img/unity/Image01_AudioSetting.png)

## Getting Started

![Model Read/Write setting](/img/unity/Image02_ModelRW.png)

1. Place a mesh with `Read/Write Enabled` in the scene and add `SoundTraceObject`.

![SoundTraceObject component](/img/unity/Image03_SoundTraceObject.png)

2. Add `SoundTraceListener` to the listener GameObject. Configure it together with Unity's built-in `AudioListener`. In a default Unity scene, note that `AudioListener` is already attached to the Main Camera.

![SoundTraceListener component](/img/unity/Image04_Listener.png)

3. Create a source GameObject and add `SoundTraceSource`. A Unity `AudioSource` is added automatically.

![SoundTraceSource component](/img/unity/Image05_Source.png)

4. Assign the desired audio clip to the Unity `AudioSource`.
5. Create a manager GameObject and add `SoundTraceManager` and `SoundTracePathVisualizer`.

![SoundTraceManager and Path Visualizer components](/img/unity/Image06_Manager.png)

6. Position the listener, source, and `SoundTraceObject` geometry so reflected sound paths can form between them.

![Listener, source, and geometry positioning](/img/unity/Image07_Positioning.png)

7. Enter Play Mode.
8. Enable path visualization on `SoundTracePathVisualizer`.
9. If reflected path lines appear between the listener, source, and objects, the basic setup is working.

![Successful reflected path lines](/img/unity/Image08_Success.png)

![Path type colors](/img/unity/Image11_PathTypes.png)

10. Red line - direct sound (`Direct Path`)<br />Orange line - reflected sound (`Reflection Path`)<br />Green line - diffracted sound (`Diffraction Path`)
11. Move the listener or source and verify that the sound changes physically.
12. If a `SoundTraceObject` uses `Static` update mode, runtime Transform movement is not reflected in propagation and has no TLAS refit cost.
13. Use `Dynamic` for objects whose Transform movement must affect propagation.

![Movable object setting](/img/unity/Image09_Movable.png)

14. Use `Refit` for skinned or animated meshes where vertex positions change but topology stays the same. This path also refreshes TLAS with the current Transform after the BLAS work.
15. Use `Rebuild` only when topology, the triangle list, BVH options, or the shape structure changes. Avoid configurations that rebuild every frame. This path also rebuilds TLAS with the current Transform.

![Path check after movement](/img/unity/Image10_Moved.png)

## Main Features

### SoundTraceObject

![SoundTraceObject inspector](/img/unity/Image_20_Object.png)

`SoundTraceObject` registers a Unity `MeshFilter`/`MeshRenderer` as SoundTrace collision geometry. It is currently built around `MeshFilter` and `MeshRenderer`, and meshes used as SoundTrace geometry need `Read/Write Enabled` in import settings. Do not assume automatic per-tick baking of `SkinnedMeshRenderer` vertex deformation.

![Add components to child mesh objects](/img/unity/Image12_ChildObjh.png)

For imported models made of multiple child mesh objects, add `SoundTraceObject` to the root GameObject, then click `Add To Child Meshes` to add components to all child objects that contain meshes. If the root component's `MeshFilter` is empty afterward, remove that empty root component with `Remove Root Component(s)`.

It does not change Unity render materials. It maps each render material slot to a SoundTrace material preset index and attaches that index to the corresponding submesh triangles.

### SoundTraceMaterialPresetLibrary

| ![Material Preset Library 1](/img/unity/Image_Mat_01.png) | ![Material Preset Library 2](/img/unity/Image_Mat_02.png) |
|---|---|

The default material preset library is stored in the package at `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`. Select it from Unity with `SoundTrace > Material Preset Library`.

Each preset contains 8-band `Reflection`, `Absorption`, `Transmission`, and `Scattering` values. You can edit the ScriptableObject directly, add presets, and import or export `soundMaterial.json` from the inspector toolbar.

### Sound material slots

- `Auto Set` reads Unity render material names and assigns the closest SoundTrace material preset.
- For example, if a fantasy sword model such as `Sword` has a material name containing `Metal`, it maps to a `Steel`-style preset.
- If no name matches, or if a material is missing, the fallback is `Concrete`.
- If the automatic match is wrong, choose the preset manually from each submesh row dropdown.
- To make reflection easy to hear, test with `Steel`/`Marble`; to hear absorption, test with `Snow`/`Soil`; to hear transmission, test with `Fabric`.

### BVH and update mode

| Setting | Description |
|---|---|
| `HKDTree` | A high-detail structure with SBVH-like behavior. Raycasts are fast, and primitive detail is preserved well for static background meshes with holes or complex shapes. Rebuilds are slower. |
| `LBVH` | The default fast-build LBVH. On complex geometry it can approximate shape more roughly, so authored holes may behave as if they are closed. |
| `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` | SIMD variants of LBVH. Higher SIMD width can be better for complex scenes. |
| `bvhMaxDepth` | Maximum BVH depth. Larger depths can benefit more from traversal pruning, so start testing from a high value. |
| `primitivesPerLeaf` | Triangle count stored in each final leaf node. The range is `1-128`. Smaller values improve detail but change build and traversal cost. |
| `Static` | For static collision geometry. Runtime Transform movement is not reflected in propagation and has no TLAS refit cost. |
| `Dynamic` | Reflects Transform movement in propagation. It updates only TLAS instance/bounds without refitting BLAS. |
| `Refit` | Use for skinned or animated meshes where vertex positions change while topology stays the same. After BLAS refit it also refreshes TLAS instance/bounds with the current Transform. |
| `Rebuild` | Use only when topology, the triangle list, BVH options, or the shape structure changes enough to rebuild the BVH. After rebuild it also rebuilds TLAS with the current Transform. |

### SoundTraceListener

![SoundTraceListener component](/img/unity/Image04_Listener.png)

`SoundTraceListener` is the scene listener. It synchronizes Transform position and orientation to the native listener every frame and owns listener ray settings plus path-type enable flags.

| Setting | Description |
|---|---|
| `Ray Resolution` | Listener guide-ray resolution. The range is `1-32`, and one value is applied to both native listener width and height. A value of `16` uses `16 x 16` guide rays. |
| `Ray Depth` | Ray reflection/propagation depth. The range is `1-16`. Higher values improve reverb feel and complex path coverage but increase cost. |
| `Per-path enable` | Enables or disables `Direct`, `Reflection`, `Diffraction`, `Reverb`, and `Transmission` paths by type. |

For complex game scenes, start with `Ray Resolution 16` and `Ray Depth 4`.

### SoundTraceSource

![SoundTraceSource component](/img/unity/Image05_Source.png)

`SoundTraceSource` is the SoundTrace audio source component and requires a Unity `AudioSource`. It uses Unity's audio filter callback, `OnAudioFilterRead`, to render the input buffer in place into SoundTrace spatial output.

| Setting | Description |
|---|---|
| `Intensity` | Base source intensity. |
| `Gain Boost Db`, `Reverb Send Db`, `Reflection Send Db` | Overall gain and reverb/reflection send levels in dB. |
| `Reverb Rays` | Source-side reverb ray settings. `Ray Resolution` ranges from `1-32` and is applied to both reverb ray width and height. `Reverb Ray Depth` ranges from `1-16`. This is separate from listener rays. |
| `Per-path enable` | Enables or disables path types per source. |
| `Distance Attenuation` | Controls attenuation range per path type. The current inspector slider controls the attenuation constant; larger values make the effective range smaller. |
| `Distance Attenuation Gizmos` | Shows attenuation ranges per path type as Scene View wire spheres. |
| `Bypass` | Skips SoundTrace spatial rendering and passes the raw `AudioSource` output through unchanged. |

### SoundTraceManager

![SoundTraceManager component](/img/unity/Image_21_Manager.png)

`SoundTraceManager` is the per-scene SoundTrace runtime owner. Listeners, sources, and objects register with it when enabled, and the manager runs scene ticks and propagation updates.

| Setting | Description |
|---|---|
| `Propagation Interval Ms` | Interval for the ray-trace propagation pass. Position sync ticks every frame; propagation is throttled by this interval. |
| `Propagate On Start` | During `Start()`, flushes the scene graph once, then immediately runs one propagation pass and visualizer update. The next propagation runs after `Propagation Interval Ms`. |
| `Load Default Materials On Enable` | Registers the package's default `SoundTraceMaterialPresetLibrary.asset` into the native material table. |
| `Propagation Thread Count` | Worker count for the internal job system. `-1` lets STCoreV2 choose from logical hardware threads. The application should assign this based on CPU budget; begin production testing from 3 or more threads. |
| `Path Cache Size` | A value of `0` or lower disables the cache buffer. A value of `1` or higher stores the path cache each frame, increasing ray count and acoustic detail. Recommended values are `256`, `512`, and `1024`. |

### SoundTracePathVisualizer

![SoundTracePathVisualizer component](/img/unity/Image_22_PathVisual.png)

`SoundTracePathVisualizer` is a debugging component that renders valid paths as runtime line renderers. Use it to visually inspect reflection, diffraction, reverb, and transmission paths in the scene.

| Setting | Description |
|---|---|
| `Enable Path Visualization` | Turns path line rendering on or off. |
| `Max Visualized Paths` | Maximum number of paths shown on screen. |
| `Path Width` | Line width. |
| `Path Alpha Intensity` | Strength of attenuation-based alpha scaling. |
| `Draw Valid Paths`, `Draw Hit Triangles` | Scene View debug drawing options. |

## Samples

### SampleScene01

![SampleScene01](/img/unity/SampleScene01.png)

`SampleScene01` is a simple sample scene similar to Getting Started. It does not include additional scripts, and lets you inspect detailed SoundTrace ray calculations inside a simple cube-geometry room.

### SampleScene02

![SampleScene02](/img/unity/SampleScene02.png)

`SampleScene02` lets you move the listener and sound sources directly with touch or mouse input.

The gray circular outline is not just a UI marker; it is real `Ico Sphere Dome` geometry. It provides a different reflection response from the cube room.

1. Move the separated sound sources left and right, including outside the outline boundary, and listen for how the music changes.
2. The `UIVisible` button hides the UI so source manipulation is easier.
3. The `Reset` button restores the music, positions, and material to their initial values.
4. The `Toggle UnitySound` button toggles between SoundTrace rendering and the default Unity `AudioSource` output.
5. The material scroll bar on the right changes the Dome material using the provided SoundTrace material presets. `Steel`, `Marble`, `Snow`, and `Soil` provide a strong audible contrast.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Multiple audio sources drift out of sync and sound like echo/flanging | Start multiple `AudioSource` instances from one script instead of `playOnAwake` or separate `Play()` calls. Create one `startDspTime` from `AudioSettings.dspTime` and start every source with `AudioSource.PlayScheduled(startDspTime)`.<br /><br />For verification audio assets, set Import Settings to `Decompress On Load`, `PCM`, `Preserve Sample Rate`, `Preload Audio Data`, `Force To Mono` On, and `Normalize` Off. |

<img src="/img/unity/ImportSetting.png" alt="Audio Import Settings" width="420" />
