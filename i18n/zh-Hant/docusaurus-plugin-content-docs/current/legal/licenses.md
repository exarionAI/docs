---
title: 開放原始碼授權
sidebar_label: 開放原始碼授權
description: Sound-Tracing SDK 發布物所含第三方函式庫及資料集的授權聲明
---

# 開放原始碼授權

Sound-Tracing SDK 與各外掛發布物（UE · Unity · FMOD · Wwise · soundtrace.js）包含下列
第三方組件。完整授權原文原樣隨附於 SDK 的 `Licenses/` 與 `Resources/HRTF/`。Sound-Tracing SDK
本身與各外掛遵循 Exarion 的非公開授權。

## 函式庫

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- 用途：加速結構（BLAS/TLAS）

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio)
- License: MIT
- 用途：音訊檔案解碼（WAV / FLAC / MP3）、平台音訊裝置

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)
- License: MIT
- 用途：Ogg Vorbis 解碼

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)
- License: BSD-3-Clause
- 用途：HRIR 卷積所用的 FFT

## HRTF 資料集

### SADIE II D2 KEMAR

- Creator: University of York, SADIE II Database (version 2.2, 2024-06-18)
- Source: [SADIE II](https://www.york.ac.uk/sadie-project/database.html), [Zenodo 12092466](https://zenodo.org/records/12092466)
- License: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- 發布檔案：`Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` — 將官方 44.1 kHz HRIR 無損封裝為
  16 位元整數的衍生發布格式（並非新的量測）。授權原文見 `LICENSE-SADIE-II.txt`

### MIT KEMAR

- Creator: Bill Gardner, Keith Martin — MIT Media Lab Machine Listening Group (1994)
- Source: [MIT KEMAR HRTF Measurements](https://sound.media.mit.edu/resources/KEMAR.html)
- License: 在保留著作權聲明的條件下可自由使用（Copyright © 1994 MIT Media Laboratory）
- 用途：引擎內建的預設 HRIR

## 材質資料

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 用途：引擎預設材質庫（`st_rt_material_load_defaults` — FMOD、Wwise 外掛）的 9 頻段
  吸音與散射係數由量測值擬合（fitted）而來
