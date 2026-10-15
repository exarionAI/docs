---
title: ExaTools 개요
---

# ExaTools

음향 시뮬레이션 결과를 분석·검증·시각화하는 유틸리티 도구 모음입니다.

## 도구

| 이름 | 용도 | 상태 |
|---|---|---|
| [IRAnalyzer](./iranalyzer.md) | IR 분석·시각화, Embree 기반 검증 | 사용 가능 |

## SimpleST에 내장된 분석 경로

별도 도구 없이도 [SimpleST](../core/simplest.md) 오프라인 엔진(`SimpleSTOffline`)이 Raw 에너지 탭,
9밴드 압력 IR, 바이노럴 IR을 결정적으로 생성합니다. soundtrace.js의 `getIRs()` /
`renderMonoImpulseResponse()`와 UE·Unity의 통계 표면도 같은 엔진 계측(`st_rt_get_timing`,
`st_rt_ir_get_stats`)을 노출합니다.

## 추가 도구

추가 도구는 점진적으로 합류할 예정입니다.
