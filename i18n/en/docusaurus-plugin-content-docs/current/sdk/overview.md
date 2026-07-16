---
sidebar_position: 1
title: SDK Overview
description: Overview of the Web, Unity, Unreal Engine, and Python SDKs for the STCoreV2 spatial-audio engine.
---

# SDK Overview

The SoundTrace SDK family exposes [STCoreV2](../core/stcorev2.md) to the Web and
game engines.

## Bindings

| Name | Target | Status |
|---|---|---|
| [Web](./web.md) | TypeScript, WebAssembly, Web Audio | Available |
| [Unity](./unity.md) | Unity 2022.3 LTS or newer | Available |
| [Unreal Engine](./ue.md) | Unreal Engine 5.6 plugin | Available; demo scenes are placeholders |
| [Python](./python.md) | Analysis and research | Planned |

## Common workflow

1. Start from `Fast`, `Middle/Balanced`, or `Quality`.
2. Select `Band8` or `Parametric` HRTF.
3. Use GPU propagation where supported and CPU fallback elsewhere.
4. Prefer material presets over raw 8-band edits.
5. Tune ray depth, width, and render budgets only after measuring a real issue.

## Start here

- Browser and Three.js → [Web SDK](./web.md)
- Unity game → [Unity SDK](./unity.md)
- Unreal Engine game → [Unreal Engine SDK](./ue.md)
- Browser scenes → [Demos](../demos/overview.md)
- Native C/C++ → [STCoreV2](../core/stcorev2.md)
