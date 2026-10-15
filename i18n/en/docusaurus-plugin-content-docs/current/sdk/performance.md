---
title: Performance Guide
description: The performance axes of SimpleST-based integrations — ray budget, lane intervals, Hybrid early reflections, render modes, threads, and the metrics to measure.
---

# Performance Guide

In SimpleST, raising the listener guide rays, source transport rays, reflection depth, source count,
and geometry size makes paths more stable and improves the sense of space, but propagation time and
the per-block audio render cost rise with them. This document summarizes the cost axes and starting
points shared by the Web, Unity, UE, FMOD, and Wwise integrations.

## Fixed runtime contract

| Item | Current contract |
|---|---|
| Listener | 1 per real-time context |
| Output | Binaural/panning 2ch, or N channels for a speaker layout (HOA3 decode) |
| Engine sample rate | Fixed 44.1 kHz; host rates go through the built-in resampler |
| Render block | 512 frames (≈11.6 ms @ 44.1 kHz) — the per-block render cost must stay within this budget to avoid dropouts |
| Concurrent source streams | 64 (excess sources go dry or fail to create) |
| Max reflection depth | 16 · transmission 64 |
| Default guide rays / depth | `16 × 16` / 8 (global), per-source depth 4 |
| Default transport rays | `16 × 8` |
| Compute threads | `maxComputeThreads = 0` → min(performance cores, 6) |

## Key options and trade-offs

| Option | Quality effect | Performance effect |
|---|---|---|
| Listener guide rays (N×N) | Reflection/diffraction path discovery and directional stability | Reflection/diffraction lane cost grows with the grid area |
| Reflection depth | Allows higher-order reflections and mixed diffraction paths | More path search and more IR taps |
| Source transport rays (W×H) × depth | Stability of the late reverb room response and material response | Proportional to source count × grid × depth |
| Source count | Emitters spatialized at the same time | Propagation + render (tap count) cost |
| Early reflection mode | Objects = individual HRTF per path, Hybrid = budget + HOA3 bed | **Objects grows the render block in proportion to the path count** |
| Reflection lane interval | Longer = early reflections follow listener movement later | The largest propagation CPU saving |
| Render mode | Buffered ≈3 blocks of latency / In Callback lowest latency | In Callback puts the render cost on the host audio thread |
| HRTF dataset | SADIE D2 (256 taps) > MIT KEMAR (128 taps) resolution | Convolution cost proportional to tap length |
| Dynamic object count | Reflects moving occluders | Dynamic TLAS rebuild cost |

## Early reflections: use Hybrid

Render block cost measured in a reverberant hall (Sibenik) with 8 sources.

| Mode | Exact objects | Block cost | Verdict |
|---|---:|---:|---|
| Objects | ≈650 | 16.8 ms | Exceeds the 11.6 ms budget — dropouts |
| Hybrid | ≈33 | 2.4 ms | Pass |

Hybrid renders only a listener-global budget (reflection 12+4 · diffraction 3+1) as exact objects
and collects the rest into an HOA3 bed. With HRTF and multiple sources there is a level difference
of about −1 ~ −2 dB. Every official integration applies Hybrid by default; Objects is for reference
listening and offline A/B.

## Quality presets (per integration)

| Integration | Fast | Balanced / Middle | Quality |
|---|---|---|---|
| Web (`quality`) | 8×8, depth 4 | 16×16, depth 6 | 24×24, depth 8 |
| Unity Listener | 16, depth 4 | 24, depth 8 | 32, depth 12 |
| UE Listener | 12×12, depth 4 | 16×16, depth 8 | 24×24, depth 8 |
| UE Source (transport) | 8×4, depth 3 | 16×8, depth 4 | 24×12, depth 6 |

On Web the source transport rays follow the same values. Unity source transport rays default to
24 / depth 4.

## Starting presets

| Situation | guide rays | transport rays | Depth | Reflection lane interval | Notes |
|---|---|---|---|---|---|
| Mobile / Web with many sources | 8×8 ~ 12×12 | 8×4 ~ 8×8 | 4 | 33 ~ 66 ms | Fast preset |
| Desktop game | 16×16 | 16×8 | 8 | 33 ms (UE default) ~ 0 | Balanced |
| Quality demo | 24×24 ~ 32×32 | 24×12 | 8 ~ 12 | 0 ms | Quality, ≤ 8 sources |

If the sense of space is weak, do not add sources first; raise guide rays, transport rays, and
depth separately, step by step, and check. If performance is short, adjust in this order:
(1) confirm Hybrid → (2) lower the quality preset → (3) raise the reflection lane interval →
(4) disable path visualization.

## Threads and lanes

The PIPELINED scheduler runs the Direct / Reflection-Diffraction / Reverb lanes at independent cadences.

| Lane | Default minimum interval | Meaning |
|---|---:|---|
| Direct | 10 ms | Interval between consecutive run starts. Direct sound and transmission — keep it free of dropouts |
| Reflection-Diffraction | 0 ms (immediate) | Most of the propagation cost. Pending requests collapse into one |
| Reverb | 4 ms | Interval from run completion to the next run |

The `maxComputeThreads` budget N is at least 3 in PIPELINED (1 audio + 1 dedicated Direct + N−2
general). On hybrid CPUs, pinning to performance cores with `st_rt_set_thread_attributes` (UE
`Prefer Performance Cores`) is recommended. Check the actual thread count with
`st_rt_get_thread_inventory`.

## Metrics to measure

| Group | Metric | Source |
|---|---|---|
| Propagation | Per-lane ms (direct / reflDiff / reverb), IR build ms | `st_rt_get_timing` (Web `debugSnapshot().simplest.timing`, UE Subsystem) |
| Render block | `totalUs`, per-stage µs (sourceInput / exactTaps / bed / send / late / output), activeSources, exactTaps, sendTaps | `st_rt_render_get_process_stats` |
| IR publish | publishSequence cadence, bed cell count, prepare CPU/wall ratio (preemption vs. slow cores) | `st_rt_ir_get_stats` |
| Scene | Mesh, object, source, triangle counts | `st_rt_scene_get_stats` |
| Audio input | queued / capacity / dropped / underrun frames | `st_rt_source_get_stream_status` |
| Latency | Output stage latency (frames) + queue + fixed DSP latency | `st_rt_render_get_latency_frames` |
| Host | Frame time p50/p95/p99, audio callback overrun count | Platform profiler |

## Publication rules

| Item | Rule |
|---|---|
| Measured values | State the platform, host version, SimpleST commit/version, and scenario together |
| Unmeasured values | Do not estimate numbers; mark them `Measurement pending` |
| Stream limit | Separate the engine limit of 64 from the actually recommended source count |
| Raw logs | Do not paste into customer documents; publish only summary tables and interpretation |
