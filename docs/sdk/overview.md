---
sidebar_position: 1
title: SDK 개요
description: STCoreV2 실시간 공간 음향 엔진의 Web, Unity, Unreal Engine, Python SDK 개요.
---

# SDK 개요

SoundTrace SDK는 [STCoreV2](../core/stcorev2.md)를 Web과 게임 엔진에서 사용할 수 있게
감싸는 제품군입니다.

## 바인딩

| 이름 | 대상 | 상태 |
|---|---|---|
| [Web](./web.md) | TypeScript, WebAssembly, Web Audio | 사용 가능 |
| [Unity](./unity.md) | Unity 2022.3 LTS 이상 | 사용 가능 |
| [Unreal Engine](./ue.md) | Unreal Engine 5.6 plugin | 사용 가능, demo scene은 placeholder |
| [Python](./python.md) | 분석·연구 | 예정 |

## 공통 사용 원칙

1. `fast`, `balanced`, `quality` 품질 프리셋으로 시작합니다(기본값 `balanced`).
2. HRTF는 코어 내장 테이블이 기본이며, 필요할 때만 다른 테이블을 로드합니다.
3. 지원 장치에서는 GPU backend를 사용할 수 있으며, 불가하면 CPU fallback을 사용합니다.
4. 메시에는 개별 8-band 수치보다 material preset을 우선 적용합니다.
5. ray depth, width, render budget 같은 고급 property는 문제를 측정한 뒤에만 조정합니다.

## 어디서 시작할까

- 브라우저와 Three.js → [Web SDK](./web.md)
- Unity 게임 → [Unity SDK](./unity.md)
- Unreal Engine 게임 → [Unreal Engine SDK](./ue.md)
- 네이티브 C/C++ → [STCoreV2](../core/stcorev2.md)
