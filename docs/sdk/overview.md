---
sidebar_position: 1
title: SDK 개요
---

# SDK 개요

**SDK**는 [Core 엔진](../core/stcorev2.md)을 각 플랫폼/언어에서 사용할 수 있도록
감싸는 바인딩 라인업입니다. C/C++ 네이티브 엔진 자체에 대한 정보는 별도
[Core](../core/stcorev2.md) 섹션을 참고하세요.

## 바인딩 (Bindings)

| 이름 | 대상 | 상태 |
|---|---|---|
| [Web](./web.md) | 브라우저 (WebAssembly) | 사용 가능 (초안 문서화) |
| [Python](./python.md) | 분석·연구 | 예정 |
| [Unity](./unity.md) | Unity 게임 엔진 | 예정 |
| [Unreal Engine](./ue.md) | Unreal Engine | 예정 |

모든 바인딩은 Core의 C API(`exasoundC.h`)를 공통 진입점으로 사용합니다.

## 어디서 시작할까

- 처음 보는 경우 → [Sound Tracing이란?](../intro/what-is-soundtracing.md)
- 브라우저/Three.js 통합 → [Web SDK](./web.md)
- 네이티브(C/C++) 통합 → [STCoreV2](../core/stcorev2.md) (현 활성 라인)
- 두 세대 비교 → [STCore vs STCoreV2](../core/comparison.md)
