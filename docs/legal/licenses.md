---
title: 오픈소스 라이선스
sidebar_label: 오픈소스 라이선스
description: Sound-Tracing SDK 배포물에 포함된 서드파티 라이브러리·데이터셋의 라이선스 고지
---

# 오픈소스 라이선스

Sound-Tracing SDK와 각 플러그인 배포물(UE · Unity · FMOD · Wwise · soundtrace.js)에는 다음
서드파티 구성 요소가 포함됩니다. 전체 라이선스 원문은 SDK의 `Licenses/`와 `Resources/HRTF/`에
그대로 동봉됩니다. Sound-Tracing SDK 자체와 플러그인은 Exarion의 비공개 라이선스를 따릅니다.

## 라이브러리

### tinybvh

- Copyright © 2024 Jacco Bikker
- Source: [jbikker/tinybvh](https://github.com/jbikker/tinybvh)
- License: MIT
- 용도: 가속구조(BLAS/TLAS)

### miniaudio

- Copyright © David Reid
- Source: [mackron/miniaudio](https://github.com/mackron/miniaudio)
- License: MIT
- 용도: 오디오 파일 디코드(WAV / FLAC / MP3), 플랫폼 오디오 장치

### stb_vorbis

- Copyright © Sean Barrett
- Source: [nothings/stb](https://github.com/nothings/stb)
- License: MIT
- 용도: Ogg Vorbis 디코드

### pocketfft

- Copyright © 2010-2024 Max-Planck-Society, © 2019-2020 Peter Bell
- Source: [mreineck/pocketfft](https://github.com/mreineck/pocketfft)
- License: BSD-3-Clause
- 용도: HRIR 컨볼루션용 FFT

## HRTF 데이터셋

### SADIE II D2 KEMAR

- Creator: University of York, SADIE II Database (version 2.2, 2024-06-18)
- Source: [SADIE II](https://www.york.ac.uk/sadie-project/database.html), [Zenodo 12092466](https://zenodo.org/records/12092466)
- License: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- 배포 파일: `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` — 공식 44.1 kHz HRIR을 손실 없이
  16비트 정수로 패킹한 변형 배포 형식(새 측정이 아님). 라이선스 원문은 `LICENSE-SADIE-II.txt`

### MIT KEMAR

- Creator: Bill Gardner, Keith Martin — MIT Media Lab Machine Listening Group (1994)
- Source: [MIT KEMAR HRTF Measurements](https://sound.media.mit.edu/resources/KEMAR.html)
- License: 저작권 고지를 유지하는 조건으로 자유 사용 (Copyright © 1994 MIT Media Laboratory)
- 용도: 엔진에 내장된 기본 HRIR

## 재질 데이터

### BRAS — Benchmark for Room Acoustical Simulation

- Creator: RWTH Aachen University, TU Berlin
- Source: [BRAS](https://depositonce.tu-berlin.de/handle/11303/13050)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 용도: 엔진 기본 재질 라이브러리(`st_rt_material_load_defaults` — FMOD·Wwise 플러그인)의 9밴드
  흡음·산란 계수를 측정값에서 적합(fitted)
