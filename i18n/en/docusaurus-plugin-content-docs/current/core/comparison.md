---
title: STCore vs STCoreV2
---

# STCore vs STCoreV2

This page summarizes the functional differences between [STCore](./stcore.md) and [STCoreV2](./stcorev2.md).
For selection guidance, see [Recommended Use Cases](#recommended-use-cases).

:::note Baseline branches
- **STCore** — `main`
- **STCoreV2** — `feat/lock-free-hybrid-v2-reverb` (lock-free reverb)
:::

## At a Glance

| Item | STCore | STCoreV2 |
|---|---|---|
| Generation | 1st generation | 2nd generation |
| Active development | — | ✅ |
| Recommended for new integrations | △ (special cases) | ✅ |
| Primary language | C / C++ | C++ core + **C API** |
| Build | Visual Studio solution + CMake | CMake (cross-platform) |
| Primary platform | Windows | macOS · Windows · Linux · WebAssembly |
| HW acceleration | Includes **FPGA** interface | SW only |

## Propagation Algorithm

| Area | STCore | STCoreV2 |
|---|---|---|
| Core module | `SoundTracer` (Core/) | `Propagator` + **`IPathModule` system** (propagation/module/) |
| Algorithm separation | Single pipeline | **Modular**: Specular / UTDDiffraction / DiffuseOffset / StaticReverb; algorithms can be selected and swapped per listener |
| Ray Generation | `RGC` (Ray Generation Cluster) | `RGC` + per-listener ray count/depth APIs |
| Diffraction model | `UTDDiffraction` (Uniform Theory of Diffraction) | `UTDDiffraction` (Uniform Theory of Diffraction) |
| Reverb | `ReverberationZoneManager` | **`StaticReverbModule`** as a separate module, ReverbHitCollector + ReverbCoefficients |
| Max Path Depth | Project setting | **16** (`EXA_MAX_DEPTH`) |
| Result data structures | `PathPPV`, `PropagationPath` | `PathPPV`, `Primitive`, sorted IR data |

## Auralization

| Area | STCore | STCoreV2 |
|---|---|---|
| Module | `Auralization/` (Attenuation, FrequencyPartition, FrequencyResponse, PropagationPath, HRTF) | **`auralizator/`** (core, frequence, filter, HRTF, states) |
| HRTF | `HRTF.h` + MIT HRTF library | `HRTF.h` + external HRTF file/memory load APIs |
| HRTF loading API | Direct library calls | `exaListenerSetHRTFFromFile/Memory` |
| Frequency partitioning | `FrequencyPartition` | `frequence/` (FrequencyBandResponse, etc.) |
| Convolution | `Auralizator` | `filter/` (FilterChain, IRConvolver) |

## Material Model

| Area | STCore | STCoreV2 |
|---|---|---|
| Model | Separate Material object/ID model | **Stored directly per triangle** (absorption/transmission) |
| Reflection calculation | Explicit reflection coefficient | `reflection = 1 − (absorption + transmission)` |
| Path statistics | Includes material IDs | Exposes absorption coefficients |

## API and Integration

| Area | STCore | STCoreV2 |
|---|---|---|
| API exposure | Direct C++ library linking | **120+ C functions** (`exasoundC.h`) |
| Web build | — | **Emscripten** (`EMSCRIPTEN_KEEPALIVE`) |
| Binding compatibility | C++ targets only | Web/Python/Unity/Unreal integration |
| Algorithm structure | Single implementation | Internally separated reflection / diffraction / diffuse / reverb modules |
| Diagnostics/statistics | Mostly internal | `exaPropagatorGetProfile`, `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot` |
| Error reporting | Mostly return values | Single entry point: `exaGetLastError()` |

## Platforms and Build

| Area | STCore | STCoreV2 |
|---|---|---|
| Windows | ✅ primary target | ✅ |
| macOS | △ possible CMake attempt | ✅ |
| Linux | △ | ✅ |
| WebAssembly | — | ✅ Emscripten export |
| Build system | Visual Studio `.sln` + CMake | CMake 3.22+ |
| C++ standard | Project-dependent | C++17 build / C++20 coding guide |

## Accelerators and External Integration

| Area | STCore | STCoreV2 |
|---|---|---|
| FPGA interface | ✅ (`HW/` — bfm_api, fpga_interface, libusb) | — |
| Bus Functional Model | ✅ | — |
| USB device communication | ✅ (libusb) | — |
| Built-in BVH/TLAS | Custom | ✅ Native BVH/TLAS |
| **External BVH callback** | — | ✅ **`ExternalAccelerator`** delegates ray intersection to a host BVH such as a game engine |
| Accelerator abstraction | — | `IAccelerator` interface |

> STCore's differentiator is that the same acoustic algorithm can run on both SW (general CPU)
> and HW (FPGA acceleration). STCoreV2 is currently SW only, but its **external accelerator
> callback** can delegate ray intersection to a BVH owned by the host, such as a game engine BVH,
> which lowers integration cost.

## Concurrency and Data Transfer

| Area | STCore | STCoreV2 |
|---|---|---|
| Scene data transfer | Estimated direct reference + mutex model | **`SceneSnapshot`** — immutable per-tick POD snapshot |
| Multi-slot buffer | — | **`TripleBuffer`** (lock-free) |
| Thread affinity | — | `ThreadAffinity` module |
| Diagnostic telemetry | Internal | `Telemetry` module |

## Tests and Documentation

| Area | STCore | STCoreV2 |
|---|---|---|
| Automated tests | — Doxygen docs only | **Google Test** (unit + benchmark) |
| Documentation | Doxygen | Doxygen + internal design docs (`docs/design/`) |

## Recommended Use Cases

### Choose STCoreV2 — *default*

- New projects
- Web integration (browser / WebAssembly)
- Cross-platform deployment, including macOS and Linux
- Plans for language bindings such as Python, Unity, or Unreal
- Statistical sound propagation (SSP) workflows

### Choose STCore — *special cases*

- Maintenance of code already integrated with STCore
- A required **FPGA acceleration path** that cannot be replaced by the V2 SSP model
- Direct integration with an existing Visual Studio solution-based build system
- Preservation of validated results that depend on the UTD diffraction model

## References

- [STCore](./stcore.md) — first-generation core details
- [STCoreV2](./stcorev2.md) — second-generation core details
- [SDK Overview](../sdk/overview.md)
