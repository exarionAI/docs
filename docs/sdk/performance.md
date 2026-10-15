---
title: Performance Guide
description: SimpleST 기반 통합의 성능 축 — 레이 예산, 레인 주기, Hybrid 초기 반사, 렌더 모드, 스레드, 측정 지표.
---

# Performance Guide

SimpleST는 리스너 guide ray, 음원 transport ray, 반사 깊이, 음원 수, 지오메트리 크기를 높일수록
경로가 안정되고 공간감이 좋아지지만, 전파 시간과 오디오 렌더 블록 비용도 함께 오릅니다.
이 문서는 Web·Unity·UE·FMOD·Wwise 통합에 공통인 비용 축과 시작점을 정리합니다.

## 고정 런타임 계약

| 항목 | 현재 계약 |
|---|---|
| 리스너 | 실시간 컨텍스트당 1개 |
| 출력 | 바이노럴/패닝 2ch, 또는 스피커 레이아웃(HOA3 디코드) N채널 |
| 엔진 샘플레이트 | 44.1 kHz 고정, 호스트 레이트는 내장 리샘플러 |
| 렌더 블록 | 512 프레임 (≈11.6 ms @ 44.1 kHz) — 블록당 렌더 비용이 이 예산 안이어야 끊기지 않음 |
| 동시 음원 스트림 | 64개 (초과 음원은 dry 또는 생성 실패) |
| 반사 최대 깊이 | 16 · 투과 64 |
| 기본 guide ray / 깊이 | `16 × 16` / 8 (전역), 음원별 깊이 4 |
| 기본 transport ray | `16 × 8` |
| 계산 스레드 | `maxComputeThreads = 0` → min(퍼포먼스 코어, 6) |

## 주요 옵션과 tradeoff

| 옵션 | 품질 영향 | 성능 영향 |
|---|---|---|
| 리스너 guide ray (N×N) | 반사·회절 경로 발견과 방향 안정성 | 격자 면적에 비례해 반사/회절 레인 비용 증가 |
| 반사 깊이 | 고차 반사·혼합 회절 경로 허용 | 경로 탐색과 IR 탭 수 증가 |
| 음원 transport ray (W×H) × 깊이 | late reverb 룸 응답과 재질 반응 안정성 | 음원 수 × 격자 × 깊이에 비례 |
| 음원 수 | 동시에 공간화되는 이미터 | 전파 + 렌더(탭 수) 비용 |
| 초기 반사 모드 | Objects = 모든 경로 개별 HRTF, Hybrid = 예산 + HOA3 bed | **Objects는 경로 수에 비례**해 렌더 블록이 커짐 |
| 반사 레인 주기 | 길수록 초기 반사가 리스너 움직임을 늦게 따라옴 | 전파 CPU를 가장 크게 절감 |
| 렌더 모드 | Buffered ≈3 블록 지연 / In Callback 최저 지연 | In Callback은 렌더 비용이 호스트 오디오 스레드에 실림 |
| HRTF 데이터셋 | SADIE D2(256탭) > MIT KEMAR(128탭) 해상도 | 탭 길이에 비례한 컨볼루션 비용 |
| 동적 오브젝트 수 | 움직이는 차폐물 반영 | 동적 TLAS 재구축 비용 |

## 초기 반사: Hybrid를 쓰라

음원 8개가 있는 잔향 홀(Sibenik)에서 측정한 렌더 블록 비용입니다.

| 모드 | exact 오브젝트 | 블록 비용 | 판정 |
|---|---:|---:|---|
| Objects | ≈650 | 16.8 ms | 11.6 ms 예산 초과 — 끊김 |
| Hybrid | ≈33 | 2.4 ms | 통과 |

Hybrid는 리스너 전역 예산(반사 12+4 · 회절 3+1)만 exact 오브젝트로 렌더하고 나머지를 HOA3
bed로 모읍니다. HRTF 다음원에서 −1 ~ −2 dB 정도의 음량 차이가 있습니다. 모든 공식 통합이
Hybrid를 기본으로 걸며, Objects는 기준 청취·오프라인 A/B용입니다.

## 품질 프리셋 (통합별)

| 통합 | Fast | Balanced / Middle | Quality |
|---|---|---|---|
| Web (`quality`) | 8×8, 깊이 4 | 16×16, 깊이 6 | 24×24, 깊이 8 |
| Unity Listener | 16, 깊이 4 | 24, 깊이 8 | 32, 깊이 12 |
| UE Listener | 12×12, 깊이 4 | 16×16, 깊이 8 | 24×24, 깊이 8 |
| UE Source(transport) | 8×4, 깊이 3 | 16×8, 깊이 4 | 24×12, 깊이 6 |

Web은 음원 transport ray도 같은 값을 따릅니다. Unity 음원의 transport ray는 기본 24 / 깊이 4입니다.

## 시작 preset

| 상황 | guide ray | transport ray | 깊이 | 반사 레인 주기 | 비고 |
|---|---|---|---|---|---|
| 모바일 / Web 다음원 | 8×8 ~ 12×12 | 8×4 ~ 8×8 | 4 | 33 ~ 66 ms | Fast 프리셋 |
| 데스크톱 게임 | 16×16 | 16×8 | 8 | 33 ms (UE 기본) ~ 0 | Balanced |
| 품질 데모 | 24×24 ~ 32×32 | 24×12 | 8 ~ 12 | 0 ms | Quality, 음원 ≤ 8 |

공간감이 약하면 음원 수를 먼저 늘리지 말고, guide ray와 transport ray·깊이를 분리해서 단계적으로
올려 확인합니다. 성능이 부족하면 (1) Hybrid 확인 → (2) 품질 프리셋 하향 → (3) 반사 레인 주기 상향
→ (4) 경로 시각화 끄기 순서로 조정합니다.

## 스레드와 레인

PIPELINED 스케줄러는 Direct / Reflection-Diffraction / Reverb 레인을 독립 케이던스로 돌립니다.

| 레인 | 기본 최소 주기 | 의미 |
|---|---:|---|
| Direct | 10 ms | 연속 실행 시작 사이 간격. 직접음·투과 — 드롭아웃이 없게 유지 |
| Reflection-Diffraction | 0 ms (즉시) | 전파 비용의 대부분. 대기 중 요청은 하나로 접힘 |
| Reverb | 4 ms | 실행 완료 후 다음까지 간격 |

`maxComputeThreads` 예산 N은 PIPELINED에서 최소 3(오디오 1 + Direct 전용 1 + 일반 N−2)입니다.
하이브리드 CPU에서는 `st_rt_set_thread_attributes`(UE `Prefer Performance Cores`)로 퍼포먼스 코어에
고정하는 것이 권장됩니다. 실제 스레드 수는 `st_rt_get_thread_inventory`로 확인합니다.

## 측정해야 하는 지표

| 그룹 | 지표 | 출처 |
|---|---|---|
| 전파 | 레인별 ms (direct / reflDiff / reverb), IR 빌드 ms | `st_rt_get_timing` (Web `debugSnapshot().simplest.timing`, UE Subsystem) |
| 렌더 블록 | `totalUs`, 단계별 µs(sourceInput / exactTaps / bed / send / late / output), activeSources, exactTaps, sendTaps | `st_rt_render_get_process_stats` |
| IR 발행 | publishSequence 케이던스, bed 셀 수, prepare CPU/wall 비율(선점 vs 느린 코어) | `st_rt_ir_get_stats` |
| 씬 | 메시·오브젝트·음원·삼각형 수 | `st_rt_scene_get_stats` |
| 오디오 입력 | queued / capacity / dropped / underrun 프레임 | `st_rt_source_get_stream_status` |
| 지연 | 출력단 지연(프레임) + 큐 + 고정 DSP 지연 | `st_rt_render_get_latency_frames` |
| 호스트 | 프레임 시간 p50/p95/p99, 오디오 콜백 초과 횟수 | 플랫폼 프로파일러 |

## 공개 기준

| 항목 | 기준 |
|---|---|
| 실측 완료 값 | 플랫폼, 호스트 버전, SimpleST commit·버전, 시나리오를 함께 표기 |
| 미측정 값 | 숫자를 추정하지 않고 `Measurement pending`으로 표기 |
| 스트림 상한 | 엔진 상한 64와 실제 권장 음원 수를 분리 |
| Raw log | 고객 문서에 그대로 넣지 않고 요약 table과 해석만 공개 |
