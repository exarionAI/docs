---
sidebar_position: 3
title: Product Family
---

# Product Family

The Sound Tracing product family has three pillars: the **engine**, the **SDKs and plug-ins**, and the **analysis tools**.

## Core — SimpleST

A C++20 native geometric-acoustics engine.

- [SimpleST](../core/simplest.md) — the current engine. Public C ABI 6 (real-time `st_rt_*` / offline `st_off_*`)
- [STCoreV2 → SimpleST](../core/stcorev2.md) — a mapping table for teams moving from the previous-generation engine

## SDKs and Plug-ins

The lineup that wraps the engine for each platform and middleware.

- [SDK Overview](../sdk/overview.md)
- Game engines: [Unity](../sdk/unity.md), [Unreal Engine](../sdk/ue.md)
- Audio middleware: [FMOD](../sdk/fmod.md), [Wwise](../sdk/wwise.md)
- Web: [soundtrace.js](../sdk/web.md)
- Planned: [Python](../sdk/python.md)

## ExaTools

A collection of utilities for IR analysis, data conversion, and batch validation.

- [ExaTools Overview](../exatools/overview.md)
