---
sidebar_position: 1
title: SDK Overview
---

# SDK Overview

The **SDK** is the binding lineup that makes the [Core engine](../core/stcorev2.md) available from each platform and language. For details about the native C/C++ engine itself, see the [Core](../core/stcorev2.md) section.

## Bindings

| Name | Target | Status |
|---|---|---|
| [Web](./web.md) | Browser (WebAssembly) | Available, draft documentation |
| [Python](./python.md) | Analysis and research | Planned |
| [Unity](./unity.md) | Unity game engine | Planned |
| [Unreal Engine](./ue.md) | Unreal Engine | Planned |

All bindings use the Core C API (`exasoundC.h`) as their common entry point.

## Where to Start

- New to the concept → [What Is Sound Tracing?](../intro/what-is-soundtracing.md)
- Browser/Three.js integration → [Web SDK](./web.md)
- Native C/C++ integration → [STCoreV2](../core/stcorev2.md), the active line
- Comparing generations → [STCore vs STCoreV2](../core/comparison.md)
