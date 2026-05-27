---
title: Performance Guide
---

# Web SDK Performance Guide

soundtrace.js는 ray count, depth, source count, geometry/BVH 설정을 높일수록
음향 경로의 안정성과 공간감이 좋아질 수 있습니다. 같은 설정은 전파 계산 시간,
메모리 사용량, 메인 스레드 frame time, AudioWorklet 부하도 함께 올립니다.

이 문서는 SDK 통합자가 옵션을 고를 때 기준으로 삼는 성능/품질 가이드입니다.
아래 preset은 출발점이며, 실제 권장 source 수와 플랫폼별 한계는 측정 완료 후
수치 표로 갱신합니다.

## 고정 런타임 계약

| 항목 | 현재 계약 |
|---|---|
| Listener | scene당 1개 |
| Realtime output | stereo/binaural 2ch |
| 오디오 렌더 경로 | ST/MT 모두 WASM `AudioWorkletProcessor` |
| Multi-source 오디오 | `createMixerWorkletNode(listener, sources, 2)` 사용 |
| Native source cap | 116 sources |
| Ray depth 상한 | 16 |
| 기본 권장 listener preset | `recommendedSTOption()` = `16 x 16`, depth `3` |
| Gain/send clamp | `-60..20 dB` |

`116`은 native cap입니다. 고객 앱에서 권장하는 실시간 source 수는 플랫폼,
geometry 크기, ray budget, BVH, ST/MT 모드에 따라 따로 측정해야 합니다.

## 주요 옵션과 tradeoff

| 옵션 | 품질 영향 | 성능 영향 |
|---|---|---|
| Listener ray width/height | 청취자 기준 경로 발견과 방향 안정성이 좋아짐 | ray grid 면적에 비례해 전파 계산 증가 |
| Listener depth | 더 깊은 reflection/diffraction/reverb 경로 허용 | path search, cache pressure 증가 |
| Source ray width/height | 음원별 경로 coverage와 material 반응 안정성 개선 | source 수와 곱해져 multi-source에서 가장 빨리 비용 증가 |
| Source depth | 음원별 전파 깊이 증가 | source-side propagation 비용 증가 |
| Source count | 동시에 공간화되는 emitter 수 증가 | propagation과 AudioWorklet mixer 비용 증가 |
| BVH type | traversal/build 특성 변경 | geometry와 update 방식에 따라 build/refit/traversal 비용 차이 |
| BVH max depth | tree 깊이 제어 | 너무 얕으면 traversal 비효율, 너무 깊으면 build/memory 비용 증가 |
| Prims per leaf | leaf 단위 triangle 수 제어 | scene 구조에 따라 traversal/build 균형점이 달라짐 |
| Animated/refit geometry | 움직이는 collider 반영 | refit/rebuild 비용 증가. stress 항목으로 분리 측정 |
| Thread mode | MT는 propagation job을 worker thread로 분산 가능 | cross-origin isolation 필요, thread/memory overhead 증가 |

## 시작 preset

실측 테이블이 채워지기 전까지는 아래 값을 시작점으로 사용하고, 앱의 목표 FPS와
청감 품질에 맞춰 조정합니다.

| Preset | Thread | Listener rays | Source rays | Depth | BVH | 용도 | 측정 상태 |
|---|---|---:|---:|---:|---|---|---|
| Mobile conservative | ST | `16 x 16` | `16 x 8` | `3` | LBVH 또는 platform default | 모바일 최소 기준 | Measurement pending |
| Desktop balanced | ST 또는 MT | `16 x 16` | `16 x 8` | `3` | LBVH_SIMD8 | 데스크탑 기본 기준 | Measurement pending |
| Desktop quality | MT | `32 x 32` | `32 x 16` | `4..7` | LBVH_SIMD8 | 품질 우선 데스크탑 | Measurement pending |
| Stress only | MT | `32 x 32` | `64 x 64` | `7..16` | BVH matrix | 한계 측정 전용 | Realtime default 아님 |

공간감이 약하면 source 수를 먼저 늘리지 말고, listener/source ray count와 depth를
단계적으로 올려 확인합니다. source 수 증가는 마지막에 측정합니다.

## 측정해야 하는 지표

고객 문서에 수치를 넣을 때는 같은 scenario를 같은 duration/warmup 조건에서 반복
측정하고, raw log가 아니라 요약값만 공개합니다.

| 그룹 | 지표 |
|---|---|
| Browser frame | 평균 FPS, frame time p50/p95/p99, worst frame, dropped frame count |
| Main-thread stall | `PerformanceObserver` longtask count/total/worst, 사용 가능 브라우저 한정 |
| Engine propagation | `scene.tick()` + `scene.updatePropagation()` 시간 p50/p95/p99/worst |
| Native job timing | propagation job timing frame, worker 분산/대기 시간 |
| Path quality | valid path count 평균/최대, material/path 변화 청감 메모 |
| Audio | `AudioContext.sampleRate`, `baseLatency`, `outputLatency`, state, setup time |
| Memory | native memory trace snapshot, JS heap snapshot |
| Manual observation | drop-out, localization weakness, thermal, fan/noise, battery 체감 |

브라우저 JavaScript만으로는 플랫폼 공통의 전력/thermal 수치를 신뢰성 있게 얻기 어렵습니다.
전력과 thermal은 자동 수치로 확정하지 말고 manual observation 또는 별도 장비 측정값으로
분리합니다.

## 측정 matrix

| Matrix | 값 |
|---|---|
| Baseline | ST/MT 각각 1 source, listener `16 x 16 x 3`, source `16 x 8 x 3`, static small geometry |
| Quality scale | listener `16 x 16`, `32 x 32`; source `16 x 8`, `32 x 16`, `64 x 64`; depth `1`, `3`, `4`, `7`, `16` |
| Source scale | `1`, `4`, `8`, `16`, `32`, `64`, `116` sources |
| Geometry/BVH | small/medium/large geometry, HKDtree, LBVH, LBVH_SIMD4/8/16, LBVH_NWAY4/8/16 |
| Stress only | animated/refit, rebuild-heavy, native source cap, high ray budget |

## 공개 기준

| 항목 | 기준 |
|---|---|
| 실측 완료 값 | platform, browser, SDK commit, STCoreV2 commit, scenario를 함께 표기 |
| 미측정 값 | 숫자를 추정하지 않고 `Measurement pending`으로 표기 |
| Source cap | native cap `116`과 실제 권장 source 수를 분리 |
| Stress 결과 | realtime 권장값이 아니라 한계/회귀 탐지 목적으로 분리 |
| Raw log | 고객 문서에 그대로 넣지 않고 요약 table과 해석만 공개 |
