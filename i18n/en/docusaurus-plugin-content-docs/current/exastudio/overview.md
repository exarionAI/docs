---
title: ExaStudio Overview
---

# ExaStudio

**Cross-platform rendering software for the Sound Tracing workflow.**

ExaStudio is an integrated tool built on the internal **exaEngine** sound tracing rendering engine. Its goal is to let users configure acoustic scenes, visualize simulation results, and produce outputs within one environment.

## Overview

| Item | Value |
|---|---|
| Base engine | exaEngine (in-house) |
| Platforms | Windows · macOS · **WebAssembly** |
| Primary target | Web platform |
| Build | CMake + custom build script (`mainBuild.sh`) |
| Status | Active development |

## Design Direction

- Absorb client-specific requirements through a **shared modules first, branch later** model
- **Cross-platform** structure supporting Windows, macOS, and WebAssembly together
- Aim for **minimum size and maximum performance**
- **Web platform focus** — browser-based sound tracing solution

## exaEngine Modules

ExaStudio's core engine (`exaEngine`) is organized as follows.

```
exaEngine/
├── Engine/        # shared engine modules
├── Project/       # project management
├── core/          # core libraries
├── 3rd_party/     # external dependencies
├── buildTools/    # custom build system
└── cmake/         # CMake modules
```

## Build

```bash
# Entry point — auto-detect platform, build dependencies, then build the main target
./exaEngine/mainBuild.sh
```

Platform-specific option overrides are managed under `exaEngine/buildTools/configs/`.

| Path | Applies to |
|---|---|
| `cmake_opts/*.conf` | Desktop defaults for Windows/macOS |
| `cmake_opts/wasm/*.conf` | WebAssembly build overrides |

## Static vs Dynamic Linking

Library linking differs by platform.

| Platform | Linking |
|---|---|
| Windows | DLL (dynamic) |
| macOS | dylib (dynamic) / static |
| iOS | **static only** |
| WebAssembly | **static only** |

iOS and WASM do not have the same dynamic library model, so all dependencies must be built statically (`BUILD_SHARED_LIBS=OFF`).

:::info Coming Soon
User guides covering installation, workflow, shortcuts, and major feature panels will be added later.
:::
