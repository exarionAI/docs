---
title: Unity
---

# SoundTrace SDK for Unity

SoundTrace SDK for Unity 是用于在 Unity 中使用原生 [STCoreV2](../core/stcorev2.md) 引擎的实时空间音频插件。它会把 Unity 场景中的网格、渲染材质槽、声源和听者 Transform 传入 SoundTrace runtime，并将 direct、reflection、diffraction、reverb、transmission path 应用到 Unity `AudioSource` 输出。

## Requirements

| 项目 | 要求 |
|---|---|
| Unity | `2022.3.62f2` 或更新版本 |
| 平台 | macOS, Windows, Linux, iOS, Android, WebGL |

## Unity Project Setup

### Unity Audio 设置 (image: unity-audio-settings-stereo-best-latency)

1. 打开 `Edit > Project Settings > Audio`。
2. 将 `Default Speaker Mode` 设置为 `Stereo`。
3. 将 `DSP Buffer Size` 设置为 `Best latency`。

## Getting Started

1. 在场景中放置已启用 `Read/Write Enabled` 的网格，并添加 `SoundTraceObject`。
2. 给听者角色的 GameObject 添加 `SoundTraceListener`。请与 Unity 内置 `AudioListener` 一起配置。默认 Unity 场景中，`AudioListener` 已经挂在 Main Camera 上，请注意这一点。
3. 创建声源 GameObject 并添加 `SoundTraceSource`。Unity `AudioSource` 会被自动要求。
4. 给 Unity `AudioSource` 分配要播放的 audio clip。
5. 创建管理器 GameObject，并添加 `SoundTraceManager` 和 `SoundTracePathVisualizer`。
6. 重新放置听者、声源和 `SoundTraceObject` geometry，让它们之间可以形成反射声学路径。
7. 进入 Play Mode。
8. 在 `SoundTracePathVisualizer` 中启用 path visualization。
9. 如果听者、声源和物体之间出现反射 path line，基础连接就已成功。
10. 移动听者或声源，确认声音会按物理关系变化。
11. 如果 `SoundTraceObject` 的 `Update Mode` 是 `Static`，移动 Transform 不会为了 runtime update 重建 geometry。
12. 对需要移动或 runtime shape update 的对象使用 `Refit`。
13. `Rebuild` 只在形状发生明显变化时使用，避免每 frame rebuild 的配置。

## Main Features

### SoundTraceObject

`SoundTraceObject` 会把 Unity `MeshFilter`/`MeshRenderer` 注册为 SoundTrace collision geometry。它当前基于 `MeshFilter` 和 `MeshRenderer`，用作 SoundTrace geometry 的网格需要在 import settings 中启用 `Read/Write Enabled`。不要假设 `SkinnedMeshRenderer` 的 vertex deformation 会每 tick 自动 bake。

它不是修改渲染材质本身的功能，而是把每个 render material slot 映射到 SoundTrace material preset index，并把该 index 附加到对应的 submesh triangle。

### Sound material slots (image: soundtrace-object-material-slots-auto-set)

- `Auto Set` 会读取 Unity render material 名称，并自动分配最接近的 SoundTrace material preset。
- 例如，`Sword` 这样的幻想剑模型的 material 名称包含 `Metal` 时，会映射到 `Steel` 系列 preset。
- 如果没有匹配名称，或 material 为空，fallback 是 `Concrete`。
- 如果自动匹配不正确，请在每个 submesh row 的 dropdown 中手动选择 preset。

### BVH and update mode

| 设置 | 说明 |
|---|---|
| `HKDTree` | 具有 SBVH 类似特性的高细节结构。Raycast 快，并且适合保留带孔洞或复杂静态背景网格的 primitive detail。缺点是 rebuild 较慢。 |
| `LBVH` | build 快的默认 LBVH。对于复杂形状，它可能更粗略地近似 geometry，导致设计师制作的孔洞表现得像被封住。 |
| `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` | LBVH 系列的 SIMD variant。场景越复杂，较高 SIMD width 的选项可能越有利。 |
| `bvhMaxDepth` | BVH 最大 depth。depth 越大，越能受益于 traversal pruning，建议先从较大的值开始测试。 |
| `primitivesPerLeaf` | 最终 leaf node 内包含的 triangle 数量。值越小 detail 越好，但 build/traversal cost 会变化。 |
| `Static` | 用于静态 geometry。适合不需要把 runtime 移动或形状变化反映到传播中的对象。 |
| `Refit` | 保持现有结构，同时跟随 runtime transform 或 shape update。 |
| `Rebuild` | 仅在 topology 或形状变化到必须重建 BVH 时使用。 |

### SoundTraceListener (image: soundtrace-listener-inspector)

`SoundTraceListener` 是场景听者。它每 frame 将 Transform position 和 orientation 同步到原生 listener，并拥有 listener ray 设置和 path type enable。

| 设置 | 说明 |
|---|---|
| `Ray Count Width`, `Ray Count Height` | listener guide ray 分辨率。值越高，总 ray 数和 CPU cost 越高。 |
| `Ray Depth` | ray 的反射/传播 depth。最大值是 `16`。值越高，残响感和复杂 path 表现越好，但计算量也越高。 |
| `Per-path enable` | 按类型启用或禁用 `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission` path。 |

复杂游戏场景的初始值建议使用 `16 x 16 x 4`。

### SoundTraceSource (image: soundtrace-source-inspector)

`SoundTraceSource` 是 SoundTrace 声源组件，需要 Unity `AudioSource`。它在 Unity audio filter callback `OnAudioFilterRead` 中，将输入 buffer in-place 渲染为 SoundTrace spatial output。

| 设置 | 说明 |
|---|---|
| `Intensity` | 声源基础强度。 |
| `Gain Boost Db`, `Reverb Send Db`, `Reflection Send Db` | 以 dB 调整整体 gain 与 reverb/reflection send level。 |
| `Reverb Rays` | 声源侧的残响 ray 分辨率和 depth。它与 listener ray 是独立设置。 |
| `Per-path enable` | 按声源启用或禁用 path type。 |
| `Distance Attenuation` | 按 path type 控制衰减范围。当前 inspector slider 控制 attenuation constant；数值越大，有效范围越小。 |
| `Distance Attenuation Gizmos` | 在 Scene View 中用 wire sphere 显示各 path type 的衰减范围。 |
| `Bypass` | 跳过 SoundTrace 空间渲染，直接传递原始 `AudioSource` 输出。 |

### SoundTraceManager

`SoundTraceManager` 是每个场景的 SoundTrace runtime owner。listener、source、object 启用时会注册到 manager，manager 负责运行 scene tick 和 propagation update。

### SoundTraceManager settings (image: soundtrace-manager-visualizer-inspector)

| 设置 | 说明 |
|---|---|
| `Propagation Interval Ms` | ray-trace propagation pass 的执行间隔。position sync tick 每 frame 运行，propagation 会按该间隔 throttle。 |
| `Propagate On Start` | 在 `Start()` 时先 flush 一次 scene graph，然后立即执行一次 propagation pass 和 visualizer update。下一次 propagation 会在 `Propagation Interval Ms` 之后运行。 |
| `Load Default Materials On Enable` | 将 package 的默认 `SoundTraceMaterialPresetLibrary.asset` 注册到 native material table。 |
| `Propagation Thread Count` | 内部 job system 的 worker 数。`-1` 表示 STCoreV2 按 logical hardware thread 选择。应用开发者应根据整体 CPU budget 分配，实际项目建议从 3 个以上 thread 开始测试。 |

### SoundTracePathVisualizer (image: soundtrace-path-visualizer-rays)

`SoundTracePathVisualizer` 是将 valid path 以 runtime line renderer 显示出来的调试组件。用于目视确认场景中的 reflection、diffraction、reverb、transmission path 如何生成。

| 设置 | 说明 |
|---|---|
| `Enable Path Visualization` | 启用或禁用 path line rendering。 |
| `Max Visualized Paths` | 屏幕上显示的最大 path 数量。 |
| `Path Width` | line width。 |
| `Path Alpha Intensity` | 基于 attenuation 的 alpha scaling 强度。 |
| `Draw Valid Paths`, `Draw Hit Triangles` | Scene View debug drawing 选项。 |

### SoundTraceMaterialPresetLibrary (image: material-preset-library-editor)

默认 material preset library 位于 package 内部的 `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。可通过 Unity 菜单 `SoundTrace > Material Preset Library` 选择。

每个 preset 都包含 8-band `Reflection`, `Absorption`, `Transmission` 和 `Scattering` 值。可以直接编辑 ScriptableObject 来修改 material property 或添加新 preset，也可以在 inspector toolbar 中 import/export `soundMaterial.json`。

## Samples

:::info 计划中
示例文档将作为单独页面添加。
:::

## Troubleshooting

:::info 计划中
故障排查文档将作为单独页面添加。
:::
