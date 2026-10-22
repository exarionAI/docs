---
sidebar_position: 2
title: From STCoreV2 to SimpleST
sidebar_label: STCoreV2 → SimpleST
description: Concepts that changed and the API mapping table for moving from the previous-generation engine STCoreV2 (exasoundC.h) to the current SimpleST ABI 6.
---

# From STCoreV2 to SimpleST

**STCoreV2** (`exaSound`, the `exa*` API in `exasoundC.h`) was the previous-generation core of
Sound Tracing. As of October 2026 every SDK, plug-in, and demo has been switched to
[SimpleST](./simplest.md), and the STCoreV2 implementation is no longer distributed. This page
summarizes the differences teams with an STCoreV2 integration should check when migrating.

:::info About this URL
This page's address (`/core/stcorev2`) is where the STCoreV2 reference used to live. The reference
body has been replaced by [SimpleST](./simplest.md).
:::

## Changed Concepts

| Item | STCoreV2 | SimpleST |
|---|---|---|
| Header / prefix | `exasoundC.h`, single `exa*` DLL | `STRealtime.h` (`st_rt_*`) + `STOffline.h` (`st_off_*`) 2-DLL, shared `STTypes.h` |
| Context | Global `exaInit()` / `exaReset()` | Context object `st_rt_create` / `st_rt_destroy`. Multiple per process allowed |
| Entity ids | All `int`, **0 = invalid** | Typed handles such as `STMeshId`, **`v < 0` = invalid**, 0 is valid |
| Scene | `exaNewScene` + `exaSceneAdd*` | The context is the scene. One (implicit) listener per real-time context |
| Materials | 8 bands (`67.5…8k Hz`), absorption/transmission stored directly on triangles, `reflection = 1 − (A+T)` derived, `Surface` / `Solid Distance` transmission models | **9 bands (63…16k Hz)** with explicit R/A/T/scattering, strict `|R+A+T−1| ≤ 0.001` validation, no automatic derivation, immutable materials (a new material handle to replace) |
| Distance attenuation | Polynomial `1/(c + l·d + q·d²)` per source and per path | Physical `1/r` + reference/minimum distance (`st_rt_set_physical_distance_attenuation`), ISO 9613-1 air absorption |
| Source audio | Renderer outputs per source (`exaRenderSound`, `exaCreateRenderer`) | Sources are **mono input streams**; the listener renderer mixes all sources at once to stereo/N channels (`st_rt_render_process`) |
| Render output | Caller collects per-source buffers | Three modes `DEVICE` / `HOST_PULL` / `HOST_PULL_BUFFERED`, built-in host sample-rate conversion |
| Early reflections | One object per path | Objects / **Hybrid (exact budget + HOA3 bed)** |
| HRTF | KU100 parametric / convolution / SADIE H12 table load, Band8 | Panning / embedded **MIT KEMAR** / **SADIE II D2** (one file). No KU100, H12, Band8, or parametric |
| GPU | WebGPU (Dawn) propagation provider | **None** (CPU pipeline scheduler). `enableGpu`-style calls return an error |
| Acceleration structure | HKDTree / LBVH / LBVH_SIMD4·8·16 / NWAY, per-mesh build options | Context-global `st_rt_scene_set_accel` (TinyBVH default), no per-mesh options |
| Skinned meshes | `exaMeshUpdateVertices` → `exaMeshRefit` 2-call refit | **No refit** — a new pose means creating a new mesh (`st_rt_mesh_create`) and swapping it in |
| Object updates | `STATIC / REFIT / REBUILD / DYNAMIC` | `isDynamic` flag (static = static TLAS, dynamic = transform updates only) |
| Path cache / seed | `pathCacheSize`, `seedValue` options | `seedValue` only (`STRT_CreateOptions`), no path cache option |
| Propagation call | `exaTickScene`, synchronous | `st_rt_propagate` — PIPELINED wakes the workers and returns immediately, SYNCHRONOUS runs on the calling thread |
| Statistics | `exaGetStatistics`, `exaPropagatorGetProfile`, `exaGetMemoryTraceSnapshot` | `st_rt_get_timing`, `st_rt_ir_get_stats`, `st_rt_render_get_process_stats`, `st_rt_scene_get_stats` |
| Visualization | `exaGetValidPaths` (`ExaPathData`) | `st_rt_debug_set_collect_visual_paths` + `acquire_snapshot` + `copy_visual_paths` |
| Coordinates | Right-handed, `+Y` up, `-Z` forward, `exaListenerSetCoordinateBasis` | **Left-handed, `+Y` up, `+Z` forward (same as Unity)**, no basis API — the wrapper converts |
| Units | `ExaSTOption.sceneRatio` | `STRT_CreateOptions.sceneRatio` (once at creation) |
| Max depth | `EXA_MAX_DEPTH = 16` | Reflection 16, transmission 64 |

## Function Mapping

| STCoreV2 | SimpleST (real-time) |
|---|---|
| `exaInit()` / `exaReset()` | `st_rt_create(&opt, &ctx)` / `st_rt_destroy(ctx)` |
| `exaGetVersion()` | `st_rt_get_version_string()`, `st_rt_get_api_version()`, `st_rt_get_capabilities()` |
| `exaGetLastError()` | `st_rt_get_last_status(ctx)`, `st_rt_get_last_error(ctx, buf, cap)` |
| `exaNewScene()` / `exaTickScene()` | (the context) / `st_rt_propagate(ctx)` |
| `exaAddSoundMaterial()` / `exaSetSoundMaterial()` | `st_rt_material_create(ctx, &mat)` / materials are immutable — create a new material, then `st_rt_mesh_set_material` |
| Default material table load (SDK side) | `st_rt_material_load_defaults(ctx)` |
| `exaNewMesh()` + `exaMeshSetData()` + `exaMeshSetMaterial()` | `st_rt_mesh_create(ctx, &mesh, material, triMaterialIndices)` |
| `exaMeshUpdateVertices()` + `exaMeshRefit()` | None — create a new mesh and replace the object |
| `exaNewObject()` + `exaObjectSetMesh()` + `exaSceneAddObject()` | `st_rt_object_create(ctx, mesh, &transform, isDynamic)` or `_q` (position, quaternion, scale) |
| `exaObjectSetPosition/Rotation/Scale()` | `st_rt_object_set_transform[_q]()` |
| `exaObjectSetUpdateType()` | `isDynamic` at creation; static changes go through `st_rt_build`, dynamic ones through `st_rt_build_dynamic` |
| `exaNewSoundSource()` + `exaSceneAddSource()` | `st_rt_source_create(ctx, &desc)` |
| `exaSoundSourceSetPosition/Direction/Velocity()` | `st_rt_source_set_position/direction/velocity()` |
| `exaSoundSourceSetIntensity()` | `STSourceDesc.intensity` (pressure multiplier) + `st_rt_source_set_energy()` (energy multiplier) |
| `exaSoundSourceSetRayCount/Depth()` | `st_rt_source_set_ray_count()`, `st_rt_source_set_depth()` |
| `exaSoundSourceSetReverbSendDb()` | `st_rt_source_set_path_volume(ctx, src, ST_SOURCE_VOLUME_REVERB, linear)` |
| `exaSoundSourceSetPathEnable()` | `st_rt_source_set_path_enabled(ctx, src, pathType, enabled)` |
| Per-source directivity table | `st_rt_source_set_directivity()` + `st_rt_source_set_orientation_q()`; the cone formula is `st_rt_source_set_axis_attenuation()` |
| `exaNewListener()` + `exaSceneAddListener()` | One implicit listener (`st_rt_listener_*`) |
| `exaListenerSetPosition/Orientation/Velocity()` | `st_rt_listener_set_position/rotation(yaw,pitch)/velocity()` |
| `exaListenerSetRayCount/RayDepth()` | `st_rt_listener_set_ray_count()`, `st_rt_set_max_depth()` |
| `exaListenerSetOption()` (`sceneRatio` etc.) | `STRT_CreateOptions.sceneRatio`, the `st_rt_set_*` policy functions |
| `exaListenerSetCoordinateBasis()` | None — convert in the host wrapper |
| `exaListenerSetHrtfMode()` / `exaListenerLoadHrtf()` | `st_rt_render_set_spatializer(ctx, 0/1/2)` |
| `exaCreateRenderer()` / `exaRenderSound()` / `exaRemoveRenderer()` | `st_rt_render_start(ctx, useHrtf)` / `st_rt_render_process(ctx, out, frames)` / `st_rt_render_stop(ctx)` |
| Source audio input (host mixing) | `st_rt_source_attach_stream()` + `st_rt_source_write_stream()`, or `st_rt_source_set_audio_file()` |
| `exaGetValidPathCount/Paths()` | `st_rt_debug_set_collect_visual_paths(mask)` → `st_rt_debug_acquire_snapshot()` → `st_rt_debug_copy_visual_paths()` |
| `exaGetSortedIRDatas()` | Not in the real-time ABI — offline `st_off_ir_compute()` + `st_off_ir_copy_raw_early_taps()` / `render_pressure()` |
| `exaGetStatistics()` / `exaPropagatorGetProfile()` | `st_rt_get_timing()`, `st_rt_ir_get_stats()`, `st_rt_render_get_process_stats()`, `st_rt_scene_get_stats()` |
| `exaGetMemoryTraceSnapshot()` | None |
| `exaPropagatorInitGpu()` / `exaPropagatorSetGpuProvider()` | None (CPU only) |
| `exaPropagatorGetGuidePlanes/MirrorPositions()` | None (observe guide rays through the visual path collection mask) |

## Migration Checklist

1. **Re-enter materials as 9 bands.** Do not duplicate the 8-band values to fill them; measure or
   estimate the 16 kHz value and make R+A+T=1 in every band. The `Solid Distance` transmission
   distance does not exist in SimpleST, so convert it into a surface transmission coefficient (T).
2. **Push source audio as mono streams.** Move per-source output nodes and effects behind the
   listener mix.
3. If you had an `exaMeshRefit` path, restructure skinned meshes to be **periodically replaced by a
   new mesh** (the UE plug-in's `SkinnedPoseRefreshSeconds` works this way).
4. Check the coordinate system. `-Z` forward hosts flip the sign of Z (soundtrace.js handles this
   with `coordinateBasis`).
5. Replace `exaRenderSound` with `st_rt_render_process` in the host audio callback, and set
   `renderOutputMode` and `hostSampleRate` in the create options.
6. Apply `STRenderOptions.reserved0 = 1` (Hybrid) **after** `st_rt_render_start` (the engine default
   is Hybrid since 2.18.0, but setting it explicitly is recommended). If the host handles output
   limiting, turn the output limiter off with `useLimiter = 0` at the same point.
7. Check feature availability through the capability bits (`ST_CAP_*`), and fill
   `structSize`/`apiVersion` before every call.

## References

- [SimpleST](./simplest.md)
- Changes per SDK: [Web](../sdk/web.md) · [Unity](../sdk/unity.md) · [Unreal Engine](../sdk/ue.md)
