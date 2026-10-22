---
sidebar_position: 1
title: SDK Overview
description: Overview of the Web, Unity, Unreal Engine, FMOD, and Wwise integrations for the SimpleST real-time spatial-audio engine.
---

# SDK Overview

The SoundTrace SDKs wrap the [SimpleST](../core/simplest.md) engine for use on the web, in game
engines, and in audio middleware. All wrappers consume the same engine SDK from the same
repository (`out/dist/<platform>_release/SimpleST`) and are based on **SimpleST 2.12.0 / ABI 6**.

## Integration Lineup

| Name | Target | Form | Status |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.0.0 (vendor ZIP / npm tgz) | Available |
| [Unity](./unity.md) | Unity 2022.3 LTS or later (verified on Unity 6) | `.unitypackage` 0.3.0 | Available |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.3.0 + Python installer | Available |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP plug-in | Available |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing` (Object Processor + Metadata) plug-in | Available (Audiokinetic partner approval in progress) |
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
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 24+ |
| iOS | device arm64 · simulator arm64/x86_64 static library / XCFramework | iOS 15+ |
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

## Where to Start

- Browser and Three.js → [Web SDK](./web.md)
- Unity games → [Unity SDK](./unity.md)
- Unreal Engine games → [Unreal Engine SDK](./ue.md)
- Projects authored in FMOD Studio → [FMOD plug-in](./fmod.md)
- Projects authored in Wwise → [Wwise plug-in](./wwise.md)
- Native C/C++ → [SimpleST](../core/simplest.md)
- Migrating an STCoreV2 integration → [STCoreV2 → SimpleST](../core/stcorev2.md)
