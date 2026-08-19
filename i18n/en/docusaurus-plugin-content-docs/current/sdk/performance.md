---
title: Performance Guide
---

# Web SDK Performance Guide

In soundtrace.js, raising ray count, depth, source count, and geometry/BVH
settings can improve path stability and spatial impression. The same settings
also raise propagation time, memory use, main-thread frame time, and
AudioWorklet load.

This guide is the reference an SDK integrator uses when choosing options. The
presets below are starting points; the recommended source counts and
platform-specific limits will be replaced with measured tables once
measurement is complete.

## Fixed runtime contract

| Item | Current contract |
|---|---|
| Listener | 1 per scene |
| Realtime output | Stereo/binaural, 2ch |
| Audio render path | WASM `AudioWorkletProcessor` on both ST and MT |
| Multi-source audio | `source.play(input, 2)` per source (facade) / `createWorkletNode()` for ST direct-native |
| Native source cap | 16 sources (`EXA_MAX_SOUNDSOURCE`) |
| Ray depth ceiling | 16 (`EXA_MAX_DEPTH`) |
| Default quality preset | `quality: 'balanced'` = listener rays `24 x 24`, depth `8` |

`16` is the native cap — the maximum number of sources that can exist in one
scene at a time. The realtime source count you recommend to customers has to be
measured separately within that cap, per platform, geometry size, ray budget,
BVH, and ST/MT mode.

The listener ray grid and depth set by each quality preset:

| Preset | Listener rays | Depth |
|---|---|---|
| `fast` | `16 x 16` | `4` |
| `balanced` (default) | `24 x 24` | `8` |
| `quality` | `32 x 32` | `12` |

## Key options and trade-offs

| Option | Quality effect | Performance effect |
|---|---|---|
| Listener ray width/height | Better path discovery and directional stability at the listener | Propagation cost grows with the ray grid area |
| Listener depth | Allows deeper reflection/diffraction/reverb paths | More path search and cache pressure |
| Source reverb ray width/height | Better source-side late reverb coverage and material response stability | Cost grows with source count and ray grid area |
| Source reverb depth | Deeper source-side late reverb tracing | Path search and cache pressure grow with depth |
| Source count | More simultaneously spatialized emitters | Higher propagation and AudioWorklet mixer cost |
| BVH type | Changes traversal/build characteristics | Build/refit/traversal cost varies with geometry and update style |
| BVH max depth | Controls tree depth | Too shallow wastes traversal; too deep costs build time and memory |
| Prims per leaf | Controls triangles per leaf | The traversal/build balance point depends on scene structure |
| Animated/refit geometry | Reflects moving colliders | Higher refit/rebuild cost; measure separately as a stress item |
| Thread mode | MT can distribute propagation jobs across worker threads | Requires cross-origin isolation; adds thread/memory overhead |

## Reverb ray budget

Reverb rays are not a copy of the listener rays. Source-side late reverb costs
scale as `source count × width × height × depth`, so production defaults are
raised per scene separately from the listener rays. The QA sweep uses sources
`[4, 8, 12, 16]`, general and reverb rays each stepping through `4 x 4 x 3`,
`8 x 8 x 7`, `16 x 16 x 11`, `32 x 32 x 16`, and path cache `[256, 512, 1024]`.

## Starting presets

Until the measured tables are filled in, use these as starting points and adjust
against your target FPS and perceived quality.

| Preset | Thread | Listener rays | Reverb rays | Depth | BVH | Use for | Measurement status |
|---|---|---:|---:|---:|---|---|---|
| Mobile conservative | ST | `16 x 16` | `4 x 4` or `8 x 8` | `4` | LBVH or platform default | Mobile minimum baseline | Measurement pending |
| Desktop balanced | ST or MT | `24 x 24` | `8 x 8` | `8` | LBVH_SIMD8 | Desktop default baseline | Measurement pending |
| Desktop quality | MT | `32 x 32` | `16 x 16` | `12` | LBVH_SIMD8 | Quality-first desktop | Measurement pending |
| Stress only | MT | `32 x 32` | `32 x 32` | `7..16` | BVH matrix | Limit measurement only | Not a realtime default |

> **The MT gain is unmeasured and is not automatically faster.** The speed gain
> of the MT presets above is still `Measurement pending`. MT distributes
> propagation jobs to a worker, so the gain shows up **when the ray budget and
> source count are large** (high ray grid/depth, many sources); in small scenes
> the worker round trip and memory overhead can make ST simpler and faster. MT
> also carries the deployment cost of cross-origin isolation (COOP/COEP). Start
> small scenes and simple pages on ST, and choose MT only after **measuring
> ST vs MT** on a scene with a large budget.

If the spatial impression is weak, do not raise the source count first. Raise
the listener rays and the source reverb ray count/depth separately, in steps.
Measure source-count increases last.

## Metrics to measure

When publishing numbers in customer documentation, repeat the same scenario
under the same duration/warmup conditions and publish summaries only, never raw
logs.

| Group | Metrics |
|---|---|
| Browser frame | Average FPS, frame time p50/p95/p99, worst frame, dropped frame count |
| Main-thread stall | `PerformanceObserver` longtask count/total/worst, where supported |
| Engine propagation | `scene.tick()` + `scene.updatePropagation()` time p50/p95/p99/worst |
| Native job timing | Propagation job timing frames, worker distribution/wait time |
| Path quality | Valid path count average/max, listening notes on material/path changes |
| Audio | `AudioContext.sampleRate`, `baseLatency`, `outputLatency`, state, setup time |
| Memory | Native memory trace snapshot, JS heap snapshot |
| Manual observation | Drop-outs, weak localization, thermals, fan noise, perceived battery drain |

Browser JavaScript alone cannot reliably produce cross-platform power and
thermal numbers. Do not treat power and thermals as automatic measurements —
separate them into manual observation or dedicated instrumentation.

## Measurement matrix

| Matrix | Values |
|---|---|
| Baseline | 1 source on ST and MT each, listener `16 x 16 x 3`, source `16 x 8 x 3`, static small geometry |
| Quality scale | Listener `16 x 16`, `32 x 32`; source reverb `4 x 4`, `8 x 8`, `16 x 16`, `32 x 32`; depth `3`, `7`, `11`, `16` |
| Source scale | `1`, `2`, `4`, `8`, `12`, `16` sources (native cap `16`) |
| Reverb ray scale | Sources `[4, 8, 12, 16]`, general ray steps `4 x 4 x 3` → `8 x 8 x 7` → `16 x 16 x 11` → `32 x 32 x 16`, reverb rays on the same steps, path cache `[256, 512, 1024]` |
| Geometry/BVH | Small/medium/large geometry, HKDtree, LBVH, LBVH_SIMD4/8/16, LBVH_NWAY4/8/16 |
| Stress only | Animated/refit, rebuild-heavy, native source cap, high ray budget |

## Publication rules

| Item | Rule |
|---|---|
| Measured values | Publish with platform, browser, SDK commit, STCoreV2 commit, and scenario |
| Unmeasured values | Do not estimate a number; mark it `Measurement pending` |
| Source cap | Keep the native cap `16` separate from the recommended source count |
| Stress results | Present as limit/regression detection, not as realtime recommendations |
| Raw logs | Never paste into customer docs; publish summary tables and interpretation |
