---
title: STCore
---

# STCore

**The first-generation Sound Tracing core module: SoundTracer + Auralizator libraries integrated with FPGA hardware acceleration.**

STCore is the first-generation implementation of Sound Tracing technology. It is a C/C++ acoustic simulation library and includes an HW interface layer for communicating with an FPGA accelerator. It is currently in maintenance mode, and new development happens in [STCoreV2](./stcorev2.md).

## Overview

| Item | Value |
|---|---|
| Primary language | C / C++ |
| Build | Visual Studio solution (`SoundTracer.sln`) + CMake |
| Primary platform | Windows (x64) |
| HW acceleration | FPGA interface (libusb-based) |
| Status | Maintenance |
| Successor | [STCoreV2](./stcorev2.md) |

## Module Layout

```
STCore/
├── SoundTracerSource/
│   ├── Core/         # acoustic tracing and auralization core
│   ├── HW/           # FPGA interface
│   ├── Auralization/ # convolution and HRTF
│   ├── Math/         # vector and matrix utilities
│   ├── Objects/      # scene objects
│   ├── OperatorSource/
│   ├── GL/           # visualization helpers
│   └── Utils/        # common utilities
├── SoundTracer/         # Visual Studio demo/launcher
├── SoundTracingDemo/    # demo application
├── LIB/                 # build outputs
└── Doc/                 # Doxygen documentation
```

### Core Components

| Component | Role |
|---|---|
| `SoundTracer` | Acoustic path search based on ray tracing |
| `Auralizator` | Path to IR synthesis to convolution |
| `UTDDiffraction` | UTD (Uniform Theory of Diffraction) diffraction model |
| `ReverberationZoneManager` | Reverberation zone management |
| `RGC` | Ray Generation Cluster |
| `PathPPV` | Path information data structure |

### HW Module

The `HW/` directory is the communication layer for the FPGA accelerator.

- `fpga_interface.{cpp,h}` — board control
- `bfm_api.{c,h}` — Bus Functional Model interface
- `mem_api.{c,h}` — device memory access
- `libusb` — USB communication

This layer allows the same acoustic algorithm to run on both SW (general CPU) and HW (FPGA acceleration).

## Relationship to STCoreV2

STCoreV2 is the successor line that extends STCore's propagation model, build system, and API exposure. See [STCore vs STCoreV2](./comparison.md) for the full comparison table.

## When to Choose STCore

New projects should use [STCoreV2](./stcorev2.md). Consider STCore only in these cases:

- Existing code is already integrated with STCore and is being migrated to V2
- An FPGA acceleration path is required and cannot be replaced by the V2 SSP model
- You must integrate directly with an existing Visual Studio solution-based build system

## References

- [STCoreV2](./stcorev2.md) — actively developed next-generation core
- [SDK Overview](../sdk/overview.md)
