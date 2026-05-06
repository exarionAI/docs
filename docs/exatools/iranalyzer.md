---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response (IR) 분석·시각화 도구.**

IRAnalyzer는 [exaSound (STCoreV2)](../sdk/core/stcorev2.md) 기하음향 시뮬레이터가
생성한 IR의 정확성을 검증하고, 실측 데이터·다른 시뮬레이터 결과와 비교 분석하는
도구입니다. 두 개의 실행 파일로 구성됩니다.

## 구성

| 모듈 | 실행 파일 | 설명 |
|---|---|---|
| **simulator** | `rir_sim` | Embree 기반 독립 경로 추적 IR 합성기 (검증용 기준선) |
| **viewer** | `rir_viewer` | SDL3 + ImGui 기반 실시간 시각화·분석 도구 |

## 빌드

### 요구사항

- CMake 3.20+
- C++20 호환 컴파일러
- macOS 13.0+ (Apple 플랫폼 우선 지원)

대부분의 의존성은 CMake `FetchContent`로 자동 다운로드됩니다.

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### 선택적 의존성

| 의존성 | CMake 변수 | 용도 |
|---|---|---|
| Intel Embree 4 | (시스템 설치) | `rir_sim` 경로 추적 |
| exaSound (STCoreV2) | `STCORE_SOURCE_DIR` | 실시간 기하음향 시뮬레이션 백엔드 |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | `.skp` 파일 직접 로드 |

```bash
# exaSound 연동
cmake -S . -B build \
  -DSTCORE_SOURCE_DIR=/path/to/STCoreV2/exaSound \
  -DCMAKE_BUILD_TYPE=Release

# SketchUp SDK 추가
cmake -S . -B build \
  -DSKETCHUP_SDK_DIR=/path/to/sketchup-sdk-mac \
  -DCMAKE_BUILD_TYPE=Release
```

### 테스트

```bash
cd build && ctest
```

## Viewer (`rir_viewer`)

ImGui 도킹 기반의 다중 패널 인터페이스로 동작합니다.

| 패널 | 기능 |
|---|---|
| **3D Viewport** | 씬 geometry, 음향 경로, 디버그 시각화 |
| **Control** | 시뮬레이션 파라미터 (ray 해상도, max depth, 튜닝) |
| **View** | 씬 통계, 렌더링 옵션 (wireframe, face culling) |
| **Materials** | 8-band 흡음률·산란 계수, BRAS CSV 자동 매핑 |

## Simulator (`rir_sim`)

Embree를 직접 사용해 경로를 추적하고 IR을 합성하는 **독립** 합성기입니다. 동일한
씬·재질 조건에서 STCoreV2와 결과를 비교하여 정확성을 검증하는 *기준선(reference)*
으로 사용합니다.

## 활용 시나리오

- **회귀 검증** — STCoreV2 변경 전후의 IR 차이 확인
- **알고리즘 비교** — 결정론적 추적(rir_sim, Embree) vs 통계적 음향 전파(STCoreV2)
- **재질 튜닝** — 8-band 흡음률 조정 후 즉시 시각화
- **실측 비교** — 측정한 IR과 시뮬레이션 IR을 같은 좌표에서 오버레이

## 참고

- [STCoreV2](../sdk/core/stcorev2.md) — 분석 대상 시뮬레이터
- [ExaTools 개요](./overview.md)
