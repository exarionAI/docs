---
title: Open-Source Licenses
sidebar_label: Open-Source Licenses
description: License notices for the third-party libraries and datasets included in the SimpleST engine and SDK distributions
---

# Open-Source Licenses

The SimpleST engine binaries and each SDK distribution (UE · Unity · FMOD · Wwise · soundtrace.js)
include the following third-party components. The full license texts are bundled unchanged under
the SDK's `Licenses/` and `Resources/HRTF/`. SimpleST itself and the wrappers are covered by
Exarion's proprietary license.

## Libraries vendored into the engine

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- Use: default acceleration structure (BLAS/TLAS)

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio) 0.11.25
- License: Public Domain (Unlicense) or MIT No Attribution, at your option
- Use: audio file decoding (WAV / FLAC / MP3), platform audio devices

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb) (stb_vorbis v1.22, via miniaudio extras)
- License: Public Domain or MIT, at your option
- Use: Ogg Vorbis decoding

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft) (header-only C++ version)
- License: BSD-3-Clause
- Use: FFT for HRIR / early bed partitioned convolution

### tinyobjloader

- Copyright © 2012-Present Syoyo Fujita and contributors
- Source: [tinyobjloader/tinyobjloader](https://github.com/tinyobjloader/tinyobjloader)
- License: MIT
- Use: OBJ scene import (demos and tools)

### ufbx

- Copyright © Samuli Raivio
- Source: [ufbx/ufbx](https://github.com/ufbx/ufbx)
- License: MIT or Public Domain (Unlicense), at your option
- Use: FBX scene import (demos and tools)

## HRTF datasets

### SADIE II D2 KEMAR

- Creator: University of York, SADIE II Database (version 2.2, 2024-06-18)
- Source: [SADIE II](https://www.york.ac.uk/sadie-project/database.html), [Zenodo 12092466](https://zenodo.org/records/12092466)
- License: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- Distributed file: `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` — a derived distribution
  format that losslessly packs the official 44.1 kHz HRIRs as 16-bit integers (not a new
  measurement). The license text is in `LICENSE-SADIE-II.txt`

### MIT KEMAR

- Creator: Bill Gardner, Keith Martin — MIT Media Lab Machine Listening Group (1994)
- Source: [MIT KEMAR HRTF Measurements](https://sound.media.mit.edu/resources/KEMAR.html)
- License: free use provided the copyright notice is retained (Copyright © 1994 MIT Media Laboratory)
- Use: the default HRIR embedded in the engine (128 taps)

## Material data

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Use: the 9-band absorption and scattering coefficients of the 24 default materials are fitted from the measurements

## Demo and test only (not included in SDK distributions)

| Library | License | Use |
|---|---|---|
| raylib / raygui | zlib | Demo app GUI |
| Google Test | BSD-3-Clause | Unit tests |

## Components no longer included

The STCoreV2-era **Google Highway**, **Neumann KU100 HRTF (CC BY 3.0)**, and **Dawn / Emdawnwebgpu**
(WebGPU) are not included in SimpleST distributions.
