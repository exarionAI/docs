---
title: 開放原始碼授權
sidebar_label: 開放原始碼授權
description: SimpleST 引擎與 SDK 發布物所含第三方函式庫及資料集的授權聲明
---

# 開放原始碼授權

SimpleST 引擎二進位檔與各 SDK 發布物（UE · Unity · FMOD · Wwise · soundtrace.js）包含下列第三方組件。
完整授權原文原樣隨附於 SDK 的 `Licenses/` 與 `Resources/HRTF/`。SimpleST 本身與各包裝層遵循
Exarion 的非公開授權。

## 內嵌於引擎的函式庫

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- 用途：預設加速結構（BLAS/TLAS）

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio) 0.11.25
- License: Public Domain（Unlicense）或 MIT No Attribution 擇一
- 用途：音訊檔案解碼（WAV / FLAC / MP3）、平台音訊裝置

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)（stb_vorbis v1.22，經由 miniaudio extras）
- License: Public Domain 或 MIT 擇一
- 用途：Ogg Vorbis 解碼

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)（header-only C++ 版本）
- License: BSD-3-Clause
- 用途：HRIR / early bed 分割卷積所用的 FFT

### tinyobjloader

- Copyright © 2012-Present Syoyo Fujita and contributors
- Source: [tinyobjloader/tinyobjloader](https://github.com/tinyobjloader/tinyobjloader)
- License: MIT
- 用途：OBJ 場景匯入（示範與工具）

### ufbx

- Copyright © Samuli Raivio
- Source: [ufbx/ufbx](https://github.com/ufbx/ufbx)
- License: MIT 或 Public Domain（Unlicense）擇一
- 用途：FBX 場景匯入（示範與工具）

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
- 用途：引擎內建的預設 HRIR（128 tap）

## 材質資料

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 用途：預設材質庫 24 種的 9 頻段吸音與散射係數由量測值擬合（fitted）而來

## 僅供示範與測試（不包含在 SDK 發布物中）

| 函式庫 | License | 用途 |
|---|---|---|
| raylib / raygui | zlib | 示範應用程式 GUI |
| Google Test | BSD-3-Clause | 單元測試 |

## 不再包含的組件

STCoreV2 時期的 **Google Highway**、**Neumann KU100 HRTF（CC BY 3.0）**、**Dawn / Emdawnwebgpu**（WebGPU）
已不包含在 SimpleST 發布物中。
