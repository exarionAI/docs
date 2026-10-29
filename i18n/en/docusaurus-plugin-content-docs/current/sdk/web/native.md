---
title: Native API
description: The low-level soundtrace.js entry point `@exarionai/soundtrace.js/native` — SimpleST WASM module loader, heap helpers, Realtime/Offline adapters.
---

# Native API

`@exarionai/soundtrace.js/native` exposes the SimpleST module loader and adapters the facade uses
internally. Ordinary apps should use the [Facade API](./facade.md). This surface follows the
SimpleST C ABI contract (the `core/Include/SimpleST/ABI/*.h` headers bundled in the package) as is,
and its cross-version compatibility guarantee is weaker than the facade's.

```ts
import {
  SimpleSTRealtime,
  loadRealtimeModule, loadOfflineModule, analyzeScene,
  Heap, packMaterial, validateMaterial,
  ST_ABI_VERSION, ST_FREQUENCY_BANDS, ST_SAMPLE_RATE, layout,
  type SimpleSTModule, type SimpleSTMaterial, type SimpleSTDiagnostics, type SimpleSTFeatures, type SimpleSTSceneSnapshot,
} from '@exarionai/soundtrace.js/native';
```

## Support scope

:::warning What changed
The STCoreV2-era `SoundScene` / `SoundListener` / `SoundMesh` / `SoundObject` / `SoundCollider` /
`MaterialTable` / `Propagator` / `Diagnostics` classes and the `./internal` entry were removed in
1.0.0. The current low-level contract is the SimpleST ABI 6 headers plus the adapters below.
:::

- All SimpleST `[control]` calls happen in **one Worker** only. The facade keeps a dedicated control
  Worker and touches the engine only there.
- Calling a blocking entry point such as `st_rt_propagate` on the main thread fails because
  `Atomics.wait` is blocked there.

## Components

| Name | Role |
|---|---|
| `loadRealtimeModule(baseUrl)` | Loads `SimpleSTRealtime.mjs` + `.wasm` (pthreads) and returns a `SimpleSTModule` |
| `loadOfflineModule(baseUrl)` | Loads `SimpleSTOffline.mjs` (single-threaded). IR analysis only |
| `Heap` | Helper for writing and reading PODs on the WASM heap. Includes allocation of structs stamped with `structSize`/`apiVersion` (`stamped`) |
| `layout` | Offsets/sizes of `STRT_CreateOptions`, `STMaterial`, `STRenderOptions`, `STTiming`, `STSceneStats`, `STProcessStats`, `STIrStats`, etc. |
| `packMaterial` / `validateMaterial` | Packs 9-band R/A/T/scattering into an `STMaterial` and validates `R+A+T=1` |
| `SimpleSTRealtime` | Adapter owning one listener and the shared renderer. Translates facade commands into `st_rt_*` calls. `features` (1.1.0) lists the optional features for which the engine has both the capability bit and the export (clip, trigger, playback control, true-peak limiter, master gain) |
| `analyzeScene(module, snapshot, …)` | Clones a scene snapshot into an Offline context and computes the Raw IR / pressure IR |
| `ST_ABI_VERSION` / `ST_FREQUENCY_BANDS` / `ST_SAMPLE_RATE` | `6` / `9` / `44100` |

## `SimpleSTRealtime`

The adapter used by the facade's control Worker. When using it directly, follow this order inside
a Worker.

```ts
const M = await loadRealtimeModule(coreBaseUrl);
const rt = new SimpleSTRealtime(M, startupOptions);   // st_rt_create, loudness compensation off, material table registration, Hybrid applied

rt.command({ type: 'createMesh', handle, state });     // st_rt_mesh_create + st_rt_object_create_q
rt.command({ type: 'createSource', handle, state });   // st_rt_source_create + quality preset applied
rt.attachStream(handle);                               // st_rt_source_attach_stream (mono)
rt.sourcePose(handle, cache); rt.listenerPose(cache); rt.meshPose(handle, pose);

const validPaths = rt.frame();                         // st_rt_build[_dynamic] + st_rt_propagate
rt.writeStream(handle, monoSamples);                   // [audio] st_rt_source_write_stream
const stereo = rt.render(frames);                      // [audio] st_rt_render_process

const diag = rt.diagnostics();                         // SimpleSTDiagnostics
rt.reset(); rt.dispose();
```

- `setQuality(tier)` sets the listener guide rays, source transport rays, and reflection depth at
  once (`fast` 8×8/4, `balanced` 16×16/6, `quality` 24×24/8).
- Source gain is a pressure value and reaches the engine as `st_rt_source_set_energy(gain²)`.
- The `'direct'` path gate switches Direct and Transmission together.
- Render option changes (`useDoppler`, `useLimiter`, `diffuseEnabled`) overwrite the matching
  `STRenderOptions` fields while always keeping `reserved0 = 1` (Hybrid). If Hybrid is lost,
  `diagnostics()` throws.
- The output stage is set explicitly on every render start: limiter off (true-peak with
  `useLimiter: true`), master gain 0 dB. It does not rely on SimpleST 2.18's defaults right after
  creation (true-peak limiter on).
- Right after creating the context, it turns off the equal-loudness compensation that SimpleST 2.21 turns on
  (when `features.loudnessCompensation`).
- The listener orientation is passed to `st_rt_listener_set_orientation_q` as a quaternion built from
  forward/up, so roll is kept.
- The source EQ goes through `st_rt_source_set_parametric_eq` (cleared with `st_rt_source_set_eq(NULL)`), the output
  EQ through `st_rt_render_set_parametric_eq`. Without `features.sourceParametricEq` / `outputParametricEq` they are rejected.

## Diagnostic snapshot

```ts
interface SimpleSTDiagnostics {
  engine: 'SimpleST'; abiVersion: number; version: string;
  scheduler: 'synchronous' | 'pipelined'; earlyReflectionMode: 'hybrid'; spatializer: number;
  scene:  { meshes; objects; sources; triangles };
  timing: { propagationMs; directMs; reflectionDiffractionMs; reverbMs; irMs; renderMs };
  render: { blockSequence; activeSources; exactTaps; sendTaps; totalUs } | null;
  ir:     { publishSequence; exactTaps; bedCells; sendTaps } | null;
  audioTransport?: { outputUnderrunFrames; inputDroppedFrames; streams: Array<{ handle; queuedFrames; capacityFrames; droppedFrames; underrunFrames }> };
  features?: SimpleSTFeatures;                                                   // 1.1.0
  output?: { limiter; limiterType; limiterLatencyFrames; masterGainDb; diffuseRain; eq? };  // 1.1.0, applied output stage (eq = output EQ)
  inputs?: { live; clip };                                                       // 1.1.0, live/clip source counts
}
```

The facade's `debugSnapshot().simplest` and `getStatistics().simplest` return the same object.
The old STCore profile / memory / ray statistics and the per-source `ExaRenderStats` are gone.

## Audio contract

- The engine's internal rate is 44.1 kHz; put `AudioContext.sampleRate` into
  `STRT_CreateOptions.hostSampleRate` and the engine converts both input and output.
- Source input is mono float PCM (`st_rt_source_write_stream`); output is interleaved stereo
  (`st_rt_render_process`). The output mode is `HOST_PULL_BUFFERED`, and the AudioWorklet copies
  from the shared ring.
- There are 64 concurrent stream slots. Creating sources beyond that fails.

## Related documents

- [Web SDK overview](../web.md)
- [Facade API](./facade.md)
- [SimpleST engine](../../core/simplest.md) — the full C ABI contract
