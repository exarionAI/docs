---
title: オープンソースライセンス
sidebar_label: オープンソースライセンス
description: SimpleST エンジンと SDK 配布物に含まれるサードパーティライブラリ・データセットのライセンス通知
---

# オープンソースライセンス

SimpleST エンジンバイナリと各 SDK 配布物（UE · Unity · FMOD · Wwise · soundtrace.js）には、次の
サードパーティ構成要素が含まれます。ライセンス全文は SDK の `Licenses/` と `Resources/HRTF/` に
そのまま同梱されます。SimpleST 自体とラッパーは Exarion の非公開ライセンスに従います。

## エンジンにベンダリングされたライブラリ

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- 用途: 既定の加速構造（BLAS/TLAS）

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio) 0.11.25
- License: Public Domain（Unlicense）または MIT No Attribution から選択
- 用途: オーディオファイルのデコード（WAV / FLAC / MP3）、プラットフォームオーディオデバイス

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)（stb_vorbis v1.22、miniaudio extras 経由）
- License: Public Domain または MIT から選択
- 用途: Ogg Vorbis デコード

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)（header-only C++ 版）
- License: BSD-3-Clause
- 用途: HRIR / early bed パーティションコンボリューション用 FFT

### tinyobjloader

- Copyright © 2012-Present Syoyo Fujita and contributors
- Source: [tinyobjloader/tinyobjloader](https://github.com/tinyobjloader/tinyobjloader)
- License: MIT
- 用途: OBJ シーンのインポート（デモ・ツール）

### ufbx

- Copyright © Samuli Raivio
- Source: [ufbx/ufbx](https://github.com/ufbx/ufbx)
- License: MIT または Public Domain（Unlicense）から選択
- 用途: FBX シーンのインポート（デモ・ツール）

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
- 用途: エンジンに内蔵された既定 HRIR（128 タップ）

## 材質データ

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 用途: エンジン既定材質ライブラリ（`st_rt_material_load_defaults` — FMOD・Wwise ランタイム、オーサリング
  ツールの試聴ルーム）24 種の 9バンド吸音・散乱係数を測定値からフィット（fitted）。Unity・Web・UE SDK の
  既定材質は BRAS ではなく SoundTrace ゲームプリセットです。

## デモ・テスト専用（SDK 配布物には含まれません）

| ライブラリ | License | 用途 |
|---|---|---|
| raylib / raygui | zlib | デモアプリの GUI |
| Google Test | BSD-3-Clause | 単体テスト |

## もう含まれない構成要素

STCoreV2 時代の **Google Highway**、**Neumann KU100 HRTF（CC BY 3.0）**、**Dawn / Emdawnwebgpu**（WebGPU）は
SimpleST 配布物には含まれません。
