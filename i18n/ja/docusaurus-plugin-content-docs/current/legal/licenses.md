---
title: オープンソースライセンス
sidebar_label: オープンソースライセンス
description: Sound-Tracing SDK 配布物に含まれるサードパーティライブラリ・データセットのライセンス通知
---

# オープンソースライセンス

Sound-Tracing SDK と各プラグイン配布物（UE · Unity · FMOD · Wwise · soundtrace.js）には、次の
サードパーティ構成要素が含まれます。ライセンス全文は SDK の `Licenses/` と `Resources/HRTF/` に
そのまま同梱されます。Sound-Tracing SDK 自体とプラグインは Exarion の非公開ライセンスに従います。

## ライブラリ

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- 用途: 加速構造（BLAS/TLAS）

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio)
- License: MIT
- 用途: オーディオファイルのデコード（WAV / FLAC / MP3）、プラットフォームオーディオデバイス

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)
- License: MIT
- 用途: Ogg Vorbis デコード

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)
- License: BSD-3-Clause
- 用途: HRIR コンボリューション用 FFT

## HRTF データセット

### SADIE II D2 KEMAR

- Creator: University of York, SADIE II Database (version 2.2, 2024-06-18)
- Source: [SADIE II](https://www.york.ac.uk/sadie-project/database.html), [Zenodo 12092466](https://zenodo.org/records/12092466)
- License: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- 配布ファイル: `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` — 公式の 44.1 kHz HRIR を損失なく
  16 ビット整数にパックした変形配布形式（新しい測定ではありません）。ライセンス全文は `LICENSE-SADIE-II.txt`

### MIT KEMAR

- Creator: Bill Gardner, Keith Martin — MIT Media Lab Machine Listening Group (1994)
- Source: [MIT KEMAR HRTF Measurements](https://sound.media.mit.edu/resources/KEMAR.html)
- License: 著作権表示を維持する条件で自由に使用可（Copyright © 1994 MIT Media Laboratory）
- 用途: エンジンに内蔵された既定 HRIR

## 材質データ

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 用途: エンジン既定材質ライブラリ（`st_rt_material_load_defaults` — FMOD・Wwise プラグイン）の 9バンド
  吸音・散乱係数を測定値からフィット（fitted）
