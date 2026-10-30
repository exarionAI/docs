---
title: Open-Source Licenses
sidebar_label: Open-Source Licenses
description: License notices for the third-party libraries and datasets included in the Sound-Tracing SDK distributions
---

# Open-Source Licenses

The Sound-Tracing SDK and each plug-in distribution (UE · Unity · FMOD · Wwise · soundtrace.js)
include the following third-party components. The full license texts are bundled unchanged under
the SDK's `Licenses/` and `Resources/HRTF/`. The Sound-Tracing SDK itself and the plug-ins are
covered by Exarion's proprietary license.

## Libraries

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- Use: acceleration structure (BLAS/TLAS)

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio)
- License: MIT
- Use: audio file decoding (WAV / FLAC / MP3), platform audio devices

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)
- License: MIT
- Use: Ogg Vorbis decoding

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)
- License: BSD-3-Clause
- Use: FFT for HRIR convolution

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
- Use: the default HRIR embedded in the engine

## Material data

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Use: the 9-band absorption and scattering coefficients of the engine default material library
  (`st_rt_material_load_defaults` — FMOD and Wwise plug-ins) are fitted from the measurements
