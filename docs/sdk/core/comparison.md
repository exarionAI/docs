---
title: STCore vs STCoreV2
---

# STCore vs STCoreV2

[STCore](./stcore.md)와 [STCoreV2](./stcorev2.md)의 기능 차이를 한 페이지로 정리합니다.
선택 가이드는 [활용 권장 케이스](#활용-권장-케이스)를 참고하세요.

## 한눈에 보기

| 항목 | STCore | STCoreV2 |
|---|---|---|
| 세대 | 1세대 | 2세대 |
| 활성 개발 | — | ✅ |
| 신규 통합 권장 | △ (특수 케이스) | ✅ |
| 주 언어 | C / C++ | C++ (코어) + **C API** 노출 |
| 빌드 | Visual Studio 솔루션 + CMake | CMake (cross-platform) |
| 1차 플랫폼 | Windows | macOS · Windows · Linux · WebAssembly |
| HW 가속 | **FPGA** 인터페이스 포함 | SW only |

## 전파 알고리즘

| 구분 | STCore | STCoreV2 |
|---|---|---|
| 핵심 모듈 | `SoundTracer` (Core/) | `Propagator` + `IRUpdater` (propagation/) |
| 기반 접근 | 결정론적 광선 추적 | 광선 추적 + **통계적 음향 전파(SSP)** |
| Ray Generation | `RGC` (Ray Generation Cluster) | `RGC` + 청취자별 ray count/depth API |
| 회절 모델 | `UTDDiffraction` (Uniform Theory of Diffraction) | (구현 방식 별도 — 통계적 전파 + 평면 기반 처리) |
| 잔향 영역 | `ReverberationZoneManager` | (해당 분리 모듈 없음 — Propagator에 통합) |
| 결과 자료구조 | `PathPPV`, `PropagationPath` | `PathPPV`, `Primitive`, sorted IR data |

## 음향 처리 (Auralization)

| 구분 | STCore | STCoreV2 |
|---|---|---|
| 모듈 | `Auralization/` (Attenuation, FrequencyPartition, FrequencyResponse, PropagationPath, HRTF) | `auralization/` (core, frequence, filter, HRTF, request, states) |
| HRTF | `HRTF.h` + MIT HRTF library | `HRTF.h` + 외부 HRTF 파일/메모리 로드 API |
| HRTF 로딩 API | (직접 라이브러리 호출) | `exaListenerSetHRTFFromFile/Memory` |
| 주파수 분할 | `FrequencyPartition` | frequence/ 모듈 |
| 컨볼루션 | `Auralizator` | filter/ 모듈 (FilterChain, IRConvolver) |

## 재질 (Material) 모델

| 구분 | STCore | STCoreV2 |
|---|---|---|
| 모델 | (별도 Material 객체·ID 기반) | **Triangle 단위 직접 저장** (absorption/transmission) |
| 반사 계산 | 명시적 반사 계수 | `reflection = 1 − (absorption + transmission)` |
| 경로 통계 노출 | (재질 ID 포함) | 흡수 계수만 노출 |

## API · 통합

| 구분 | STCore | STCoreV2 |
|---|---|---|
| API 노출 | C++ 직접 라이브러리 링크 | **C 함수 110+개** (`exasoundC.h`) |
| Web 빌드 | — | **Emscripten** (`EMSCRIPTEN_KEEPALIVE`) |
| 바인딩 호환성 | C++ 타깃 한정 | Web/Python/Unity/Unreal 통합 가능 |
| 진단·통계 | (사내 사용 위주) | `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot` |
| 에러 보고 | (반환값 위주) | `exaGetLastError()` 단일 진입점 |

## 플랫폼·빌드

| 구분 | STCore | STCoreV2 |
|---|---|---|
| Windows | ✅ (1차 타깃) | ✅ |
| macOS | △ (CMake 시도 가능) | ✅ |
| Linux | △ | ✅ |
| WebAssembly | — | ✅ (Emscripten export) |
| 빌드 시스템 | Visual Studio `.sln` + CMake | CMake 3.22+ |
| C++ 표준 | (프로젝트 설정 의존) | C++17 빌드 / C++20 코딩 가이드 |

## HW 가속

| 구분 | STCore | STCoreV2 |
|---|---|---|
| FPGA 인터페이스 | ✅ (`HW/` — bfm_api, fpga_interface, libusb) | — |
| Bus Functional Model | ✅ | — |
| USB 디바이스 통신 | ✅ (libusb) | — |

> 동일 음향 알고리즘을 SW(범용 CPU)와 HW(FPGA 가속) 양쪽에서 실행하는 것이 STCore의 차별점입니다. STCoreV2는 현재 SW only이며 향후 HW 백엔드 합류는 별도 계획입니다.

## 테스트·문서

| 구분 | STCore | STCoreV2 |
|---|---|---|
| 자동화 테스트 | — (Doxygen 문서만) | **Google Test** (unit + benchmark) |
| 문서화 | Doxygen | Doxygen + 사내 디자인 문서(`docs/design/`) |

## 활용 권장 케이스

### STCoreV2를 선택하는 경우 — *기본*

- 신규 프로젝트
- 웹 통합 (브라우저 / WebAssembly)
- 크로스플랫폼 (macOS·Linux 포함) 배포
- 다양한 언어 바인딩 (Python·Unity·Unreal) 계획
- 통계적 음향 전파(SSP) 모델 활용

### STCore를 선택하는 경우 — *특수 케이스*

- 이미 STCore에 통합된 코드의 유지보수
- **FPGA 가속 경로**가 필요하며 V2의 SSP 모델로 대체 불가
- Visual Studio 솔루션 기반 기존 빌드 시스템과 직접 통합
- UTD 회절 모델에 의존하는 검증된 결과를 그대로 보존해야 함

## 참고

- [STCore](./stcore.md) — 1세대 코어 상세
- [STCoreV2](./stcorev2.md) — 2세대 코어 상세
- [SDK 개요](../overview.md)
