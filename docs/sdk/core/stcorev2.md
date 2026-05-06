---
title: STCoreV2
---

# STCoreV2

**통계적 음향 전파(Statistical Sound Propagation, SSP) 기반의 차세대 Sound Tracing
코어.**

STCoreV2는 [STCore](./stcore.md)의 후속 라인으로, 통계적 음향 전파 방법론을 기반에
두고 실시간 공간 음향을 시뮬레이션하는 고성능 라이브러리입니다.

:::info
이 페이지는 외부 공개용 초안입니다. 상세 API·아키텍처 문서는 추후 보강됩니다.
:::

## 개요

| 항목 | 값 |
|---|---|
| 주 언어 | C++ (C++17 빌드 / C++20 코딩 가이드) |
| 빌드 시스템 | CMake 3.22+ |
| 플랫폼 | macOS · Windows · Linux |
| 테스트 프레임워크 | Google Test |
| 상태 | 활성 개발 (Active) |

## 구성 요소

```
STCoreV2/
├── exaSound/      # 음향 시뮬레이션 라이브러리 (코어)
│   ├── src/      # 소스
│   ├── tests/    # Unit tests (Google Test)
│   └── demo/     # 데모 애플리케이션
└── Raylib/        # 시각화 프로젝트
```

- **exaSound** — 시뮬레이션 코어 라이브러리. 응용 측에서 직접 링크하는 대상.
- **Raylib** — 시각화·디버깅용 데모 애플리케이션.

## 빠르게 시작하기

### 요구사항

- CMake 3.22 이상
- C++17 호환 컴파일러
- macOS / Windows / Linux

### 빌드

```bash
# exaSound 라이브러리 빌드
cd exaSound
cmake -S . -B build
cmake --build build
```

### 테스트 포함 빌드

```bash
cd exaSound
cmake -S . -B build -DBUILD_TESTS=ON
cmake --build build --target unit_tests
./build/tests/unit/unit_tests
```

## 핵심 개념

### Material 모델

SoundTriangle 단위에 **흡수율(absorption)**과 **투과율(transmission)** 값을 직접
저장합니다. 별도 Material ID/포인터를 두지 않으며, 반사 계산은 다음 규칙을
따릅니다.

```
reflection = 1 - (absorption + transmission)
```

경로 시각화·통계 구조체에는 흡수 계수만 노출됩니다.

## 개발 가이드라인

- **C++ 표준**: C++20
- **메모리 관리**: RAII, smart pointer
- **네이밍**: `PascalCase` (타입), `camelCase` (함수·변수), `m_` prefix (멤버)
- **문서화**: Doxygen 스타일 주석
- **커밋**: Conventional Commits, atomic commit 단위

## 참고

- [STCore](./stcore.md) — 1세대 코어
- [SDK 개요](../overview.md)
