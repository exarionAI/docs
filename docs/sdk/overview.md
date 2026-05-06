---
sidebar_position: 1
title: SDK 개요
---

# SDK 개요

Sound Tracing SDK는 음향 시뮬레이션 코어 라이브러리와 각 플랫폼용 바인딩으로
구성됩니다.

## 구성 요소

### 코어 (Core)

C/C++로 구현된 시뮬레이션 엔진입니다. 두 세대 라인업을 운용합니다.

| 이름 | 설명 | 상태 |
|---|---|---|
| [STCore](./core/stcore.md) | 1세대 Sound Tracing 코어 | 유지보수 |
| [STCoreV2](./core/stcorev2.md) | 통계적 음향 전파(SSP) 기반 차세대 코어 | 활성 개발 |

### 바인딩 (Bindings)

코어를 각 플랫폼/언어에서 사용할 수 있도록 감싸는 계층입니다.

| 이름 | 대상 | 상태 |
|---|---|---|
| [Web](./bindings/web.md) | 브라우저 (WebAssembly) | 예정 |
| [Python](./bindings/python.md) | 분석·연구 | 예정 |
| [Unity](./bindings/unity.md) | Unity 게임 엔진 | 예정 |
| [Unreal Engine](./bindings/ue.md) | Unreal Engine | 예정 |

## 어디서 시작할까

- 처음 보는 경우 → [Sound Tracing이란?](../intro/what-is-soundtracing.md)
- 직접 코드를 다루려는 경우 → [STCoreV2](./core/stcorev2.md) (가장 최신)
