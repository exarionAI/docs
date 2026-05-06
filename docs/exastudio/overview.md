---
title: ExaStudio 개요
---

# ExaStudio

**Sound Tracing 워크플로우용 크로스플랫폼 렌더링 소프트웨어.**

ExaStudio는 사내 **exaEngine**(사운드 트레이싱 렌더링 엔진) 위에 구축된 통합
도구입니다. 음향 장면을 구성하고, 시뮬레이션 결과를 시각화하며, 결과 산출까지
하나의 환경에서 처리하는 것을 목표로 합니다.

## 개요

| 항목 | 값 |
|---|---|
| 기반 엔진 | exaEngine (자체) |
| 플랫폼 | Windows · macOS · **WebAssembly** |
| 1차 타깃 | 웹 플랫폼 |
| 빌드 | CMake + 자체 빌드 스크립트(`mainBuild.sh`) |
| 상태 | 활성 개발 |

## 설계 방향

- **공통 모듈 정립 → 브랜치 분기** 모델로 클라이언트별 요구사항을 흡수
- **크로스플랫폼** 구조 (Windows / macOS / WebAssembly 동시 지원)
- **최소 용량 · 최대 성능** 지향
- **웹 플랫폼 주력** — 브라우저에서 동작하는 사운드 트레이싱 솔루션

## exaEngine 모듈

ExaStudio의 핵심 엔진(`exaEngine`)은 다음과 같이 구성됩니다.

```
exaEngine/
├── Engine/        # 엔진 공통 모듈
├── Project/       # 프로젝트 관리
├── core/          # 핵심 라이브러리
├── 3rd_party/     # 외부 의존성
├── buildTools/    # 자체 빌드 시스템
└── cmake/         # CMake 모듈
```

## 빌드

```bash
# 진입점 — 플랫폼 자동 감지 + 의존성 빌드 + 본 빌드
./exaEngine/mainBuild.sh
```

플랫폼별 옵션 오버라이드는 `exaEngine/buildTools/configs/` 하위에서 관리됩니다.

| 경로 | 적용 |
|---|---|
| `cmake_opts/*.conf` | 데스크톱 (Windows/macOS) 기본 |
| `cmake_opts/wasm/*.conf` | WebAssembly 빌드 오버라이드 |

## 정적 vs 동적 링킹

플랫폼별 라이브러리 링킹 방식이 다릅니다.

| 플랫폼 | 링킹 |
|---|---|
| Windows | DLL (동적) |
| macOS | dylib (동적) / static |
| iOS | **static only** |
| WebAssembly | **static only** |

iOS와 WASM은 동적 라이브러리 개념이 없어 모든 의존성이 정적 빌드되어야 합니다
(`BUILD_SHARED_LIBS=OFF`).

:::info 작성 예정 (Coming Soon)
사용자 가이드(설치, 워크플로우, 단축키, 주요 기능 패널)는 추후 추가 예정입니다.
:::
