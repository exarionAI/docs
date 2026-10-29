---
sidebar_position: 1
title: SDK Overview
description: Overview of the Web, Unity, Unreal Engine, FMOD, and Wwise integrations for the SimpleST real-time spatial-audio engine.
---

# SDK Overview

The SoundTrace SDKs wrap the [SimpleST](../core/simplest.md) engine for use on the web, in game
engines, and in audio middleware. All wrappers consume the same engine SDK from the same
repository (`out/dist/<platform>_release/SimpleST`) and are based on **SimpleST 2.22.0 / ABI 6**.
The current SDK release is 2.22.0-jhj.5 (2026-10-28). The wrapper versions are unchanged, and all five
wrappers gain a [source EQ and an output EQ](#tone-control-eq). The listener orientation is passed as a
quaternion so head tilt (roll) is kept, and the wrappers turn off the equal-loudness compensation that engine
2.21 turns on (principle 8 below). The [source count limit](#source-count-limit) is the same as in the 2.18.2 SDK.
Previous SDK release: 2.18.2-jhj.7 — SimpleST 2.18.2, same wrapper versions as now. Release before that:
2.12.0 — Web 1.0.0 · Unity 0.3.0 · UE 0.3.0 · FMOD 0.2.0 · Wwise 0.1.0. It remains available as a legacy line.

## Integration Lineup

| Name | Target | Form | Status |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.1.0 (vendor ZIP / npm tgz) | Available |
| [Unity](./unity.md) | Unity 2022.3 LTS or later (verified on Unity 6) | `.unitypackage` 0.4.0 | Available |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.4.0 + Python installer | Available |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP plug-in 0.3.0 | Available |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing` (Object Processor + Metadata) plug-in 0.2.0 | Available (Audiokinetic partner approval in progress) |
| [Python](./python.md) | Analysis and research | — | Planned |

When the project contains an FMOD or Wwise plug-in, the UE and Unity wrappers automatically switch
to an **integration mode** that attaches to that middleware's SimpleST plug-in (the same split as
Meta XR Audio). In that mode the game-engine components handle only geometry, materials, and
visualization, and the middleware plug-in does the rendering.

## Supported Platforms

| Platform | Engine binary | Notes |
|---|---|---|
| Windows x64 | `SimpleSTRealtime.dll` | The Wwise Authoring plug-in is a Windows DLL |
| macOS | Universal dylib (arm64 + x86_64) | |
| Linux x86_64 | `.so` (glibc 2.34+) | |
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 28+ (the engine `.so` links `libaaudio` directly) |
| iOS | device arm64 · simulator arm64 static library / XCFramework | iOS 15+ |
| Web | pthreads WASM (`SimpleSTRealtime.mjs/.wasm`) + single-threaded Offline | COOP/COEP required |

## Common Usage Principles

1. **Start from a quality preset** — `Fast` / `Balanced` / `Quality`. A preset sets the listener
   guide rays and reflection depth together; the default `Balanced` equals the engine default
   (16×16, depth 8).
2. **Early reflections are Hybrid.** Every integration applies Hybrid after the render starts.
   Objects mode is for reference listening and offline comparison.
3. **There are two HRTFs.** The MIT KEMAR embedded in the engine, and the bundled SADIE II D2 KEMAR.
   Speaker output is an HOA3 decode (2.0 ~ 7.1), with a lightweight stereo panning fallback.
4. **Materials map to the 9-band presets** by name. Unity, Web and UE all default to the same 22
   SoundTrace game materials (game presets, not measured data; same names, order and 9-band values);
   FMOD and Wwise use the engine default library and do not expose material names. Direct editing is
   limited to validated values with R+A+T=1 in every band.
5. Advanced knobs such as ray resolution, depth, and lane update intervals are adjusted **only after
   measuring**.
6. Units are meters. For cm-based hosts (UE, Wwise for Unreal) the wrapper sets `sceneRatio = 0.01`.
7. **Output limiting belongs to the host master chain.** Engine 2.18.0 turns on a true-peak limiter
   (−1 dBTP, 137-sample latency) right after context creation, but the UE, Unity, FMOD, Wwise, and
   Web wrappers keep the limiter **off**, as their documented default. See each SDK page for how to turn
   it on.
8. **Equal-loudness compensation also belongs to the host mix.** Engine 2.21.0 turns on
   [equal-loudness compensation](../core/simplest.md#equal-loudness-compensation) (low shelf about +7.2 dB @ 120 Hz,
   high +1.8 dB) right after context creation, but every wrapper turns it off right after creation. The output
   with it off is bit-identical to engine 2.20. Adjust the tone with the EQ below or with the host mixer.

## Tone Control (EQ)

From SDK release 2.22.0-jhj, every wrapper exposes the engine's [parametric EQ](../core/simplest.md#parametric-eq)
in two places.

- **Source EQ** — applied to the source signal itself, before the engine's band split. Direct sound, reflections,
  diffraction, and reverb of that source all get the same tone.
- **Output EQ** — applied to the whole SimpleST mix at the end of the render (before the master gain).

| SDK | Source EQ | Output EQ | Bands |
|---|---|---|---|
| [Unreal Engine](./ue.md#eq) | Source Settings asset `Source EQ`, Blueprint `SetSourceEq` | Project Settings `Output EQ`, `USoundTracingSubsystem::SetOutputEq` | Up to 16 |
| [Unity](./unity.md#eq) | `SoundTraceSource` Inspector `Source EQ`, `SetSourceEq` | `SoundTraceListener` Inspector `Output EQ`, `SetOutputEq` | Up to 16 |
| [Web](./web.md#eq) | `source.setEq(eq \| null)` | `sound.setOutputEq(eq \| null)` | Up to 16 |
| [FMOD](./fmod.md#eq) | EQ parameters of the SimpleST Source DSP | EQ parameters of the SimpleST Listener DSP | Fixed 4 |
| [Wwise](./wwise.md#eq) | EQ properties of Sound-tracing Source Settings | EQ properties of Sound-tracing Renderer | Fixed 4 |

- Six filter types: Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch (cuts fixed at 12 dB/oct).
  Only Web uses the Web Audio `BiquadFilterType` names (`'peaking'`, `'lowshelf'`, `'highshelf'`, `'lowpass'`, `'highpass'`, `'notch'`).
- Ranges: frequency 20 ~ 20,000 Hz, gain ±24 dB (Peaking and shelves only), Q 0.1 ~ 30 (shelves up to 3), preamp −48 ~ +12 dB.
- **Off by default**, and while off the engine is not called, so the output is the same as without an EQ. Only
  changed values are sent, and the engine crossfades over 20 ms.
- When UE or Unity runs in FMOD/Wwise integration mode, the game-engine-side EQ is not sent. Use the middleware
  plug-in's EQ.

## Source Count Limit

Starting with SDK release 2.18.2, the engine caps the number of concurrent sources and the
source memory per platform — desktop 128 sources · unlimited memory · delay ring ceiling 2.0 s,
Android/iOS 48 sources · 96 MiB · 1.0 s, web 32 sources · 64 MiB · 0.5 s. The engine rejects
creating sources beyond the cap (`ST_STATUS_BUDGET_EXCEEDED`), and the game does not stop. The
desktop default of 128 sources is a **behavior change** from before (unlimited). For engine-side
details see [SimpleST — Source memory budget](../core/simplest.md#source-memory-budget).

| SDK | Source count setting (0 = platform default) | Rejected sources | Delay ring ceiling |
|---|---|---|---|
| [Unreal Engine](./ue.md) | Project Settings `Max Sources` | Fall back to the dry path | `Max Delay Seconds` (0 = platform default) |
| [Unity](./unity.md) | `SoundTraceRuntime.MaxSources` | Logs a warning; the `AudioSource` stays dry | `SoundTraceListener.maxDelaySeconds` (default 0 = platform default) |
| [Web](./web.md) | `SoundTrace.create` option `maxSources` | Creation rejected (status 11); existing sources keep rendering | `setRenderOptions({ maxDelaySeconds })` |
| [FMOD](./fmod.md) | `SimpleSTFmod_Config.maxSources` | That voice plays dry | Engine platform default |
| [Wwise](./wwise.md) | `SimpleSTWwise_Config.maxSources` | That voice plays dry | Engine platform default |

## Where to Start

- Browser and Three.js → [Web SDK](./web.md)
- Unity games → [Unity SDK](./unity.md)
- Unreal Engine games → [Unreal Engine SDK](./ue.md)
- Projects authored in FMOD Studio → [FMOD plug-in](./fmod.md)
- Projects authored in Wwise → [Wwise plug-in](./wwise.md)
- Native C/C++ → [SimpleST](../core/simplest.md)
- Migrating an STCoreV2 integration → [STCoreV2 → SimpleST](../core/stcorev2.md)
