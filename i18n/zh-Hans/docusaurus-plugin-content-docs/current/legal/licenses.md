---
title: 开源许可证
sidebar_label: 开源许可证
description: Sound-Tracing SDK 发行包中包含的第三方库和数据集的许可声明
---

# 开源许可证

Sound-Tracing SDK 和各插件发行包（UE · Unity · FMOD · Wwise · soundtrace.js）包含以下第三方组件。
完整许可证原文原样随附在 SDK 的 `Licenses/` 和 `Resources/HRTF/` 中。Sound-Tracing SDK 本身和插件遵循
Exarion 的私有许可证。

## 库

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- 用途：加速结构（BLAS/TLAS）

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio)
- License: MIT
- 用途：音频文件解码（WAV / FLAC / MP3）、平台音频设备

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)
- License: MIT
- 用途：Ogg Vorbis 解码

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)
- License: BSD-3-Clause
- 用途：HRIR 卷积所用的 FFT

## HRTF 数据集

### SADIE II D2 KEMAR

- Creator: University of York, SADIE II Database (version 2.2, 2024-06-18)
- Source: [SADIE II](https://www.york.ac.uk/sadie-project/database.html), [Zenodo 12092466](https://zenodo.org/records/12092466)
- License: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- 分发文件：`Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` — 把官方 44.1 kHz HRIR 无损打包为
  16 位整数的变体分发格式（不是新的测量）。许可证原文为 `LICENSE-SADIE-II.txt`

### MIT KEMAR

- Creator: Bill Gardner, Keith Martin — MIT Media Lab Machine Listening Group (1994)
- Source: [MIT KEMAR HRTF Measurements](https://sound.media.mit.edu/resources/KEMAR.html)
- License: 在保留版权声明的条件下自由使用（Copyright © 1994 MIT Media Laboratory）
- 用途：引擎内置的默认 HRIR

## 材质数据

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 用途：引擎默认材质库（`st_rt_material_load_defaults` — FMOD、Wwise 插件）的 9 频段
  吸声与散射系数从测量值拟合（fitted）
