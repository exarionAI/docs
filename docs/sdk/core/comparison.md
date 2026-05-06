---
title: STCore vs STCoreV2
---

# STCore vs STCoreV2

[STCore](./stcore.md)와 [STCoreV2](./stcorev2.md)의 기능 차이를 한 페이지로 정리합니다.
선택 가이드는 [활용 권장 케이스](#활용-권장-케이스)를 참고하세요.

:::note 기준 브랜치
- **STCore** — `main`
- **STCoreV2** — `feat/lock-free-hybrid-v2-reverb` (lock-free reverb)
:::

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
| 핵심 모듈 | `SoundTracer` (Core/) | `Propagator` + **`IPathModule` 시스템** (propagation/module/) |
| 알고리즘 분리 | 단일 파이프라인 | **모듈식**: Specular / UTDDiffraction / DiffuseOffset / StaticReverb 4종 (각 청취자별 알고리즘 선택·교체 가능) |
| Ray Generation | `RGC` (Ray Generation Cluster) | `RGC` + 청취자별 ray count/depth API |
| 회절 모델 | `UTDDiffraction` (Uniform Theory of Diffraction) | `UTDDiffraction` (Uniform Theory of Diffraction) |
| 잔향 처리 | `ReverberationZoneManager` | **`StaticReverbModule`** (분리 모듈, ReverbHitCollector + ReverbCoefficients) |
| Max Path Depth | (프로젝트 설정) | **64** (`EXA_MAX_DEPTH_LIMIT`) |
| 결과 자료구조 | `PathPPV`, `PropagationPath` | `PathPPV`, `Primitive`, sorted IR data |

## 음향 처리 (Auralization)

| 구분 | STCore | STCoreV2 |
|---|---|---|
| 모듈 | `Auralization/` (Attenuation, FrequencyPartition, FrequencyResponse, PropagationPath, HRTF) | **`auralizator/`** (core, frequence, filter, HRTF, states) |
| HRTF | `HRTF.h` + MIT HRTF library | `HRTF.h` + 외부 HRTF 파일/메모리 로드 API |
| HRTF 로딩 API | (직접 라이브러리 호출) | `exaListenerSetHRTFFromFile/Memory` + `exaListenerClearHRTF` |
| 주파수 분할 | `FrequencyPartition` | `frequence/` (FrequencyBandResponse 등) |
| 컨볼루션 | `Auralizator` | `filter/` (FilterChain, IRConvolver) |

## 재질 (Material) 모델

| 구분 | STCore | STCoreV2 |
|---|---|---|
| 모델 | (별도 Material 객체·ID 기반) | **Triangle 단위 직접 저장** (absorption/transmission) |
| 반사 계산 | 명시적 반사 계수 | `reflection = 1 − (absorption + transmission)` |
| 경로 통계 노출 | (재질 ID 포함) | 흡수 계수만 노출 |

## API · 통합

| 구분 | STCore | STCoreV2 |
|---|---|---|
| API 노출 | C++ 직접 라이브러리 링크 | **C 함수 120+개** (`exasoundC.h`) |
| Web 빌드 | — | **Emscripten** (`EMSCRIPTEN_KEEPALIVE`) |
| 바인딩 호환성 | C++ 타깃 한정 | Web/Python/Unity/Unreal 통합 가능 |
| 알고리즘 선택 | (단일 구현) | `exaListenerSet{Reflection,Diffraction,Diffuse,Reverb}Algorithm`, `exaListenerSetModularPropagation` |
| 알고리즘 비교 | — | `exaListenerEnable/Disable/GetComparisonResult` (수치 검증) |
| 진단·통계 | (사내 사용 위주) | `exaPropagatorGetProfile/SortPlaneNodes`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot` |
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

## 가속기·외부 통합

| 구분 | STCore | STCoreV2 |
|---|---|---|
| FPGA 인터페이스 | ✅ (`HW/` — bfm_api, fpga_interface, libusb) | — |
| Bus Functional Model | ✅ | — |
| USB 디바이스 통신 | ✅ (libusb) | — |
| 내장 BVH/TLAS | (자체) | ✅ (Native BVH/TLAS) |
| **외부 BVH 콜백** | — | ✅ **`ExternalAccelerator`** — 호스트(게임 엔진 등)의 BVH로 ray intersection 위임 |
| 가속기 추상 | — | `IAccelerator` 인터페이스 |

> STCore의 차별점은 동일 음향 알고리즘을 SW(범용 CPU)와 HW(FPGA 가속) 양쪽에서
> 실행 가능하다는 점입니다. STCoreV2는 현재 SW only이지만, **외부 가속기 콜백**을
> 통해 호스트가 보유한 BVH(예: 게임 엔진 자체 BVH)에 ray intersection을 위임할 수
> 있어 통합 비용이 낮습니다.

## 동시성·데이터 전달

| 구분 | STCore | STCoreV2 |
|---|---|---|
| Scene 데이터 전달 | (직접 참조·mutex 기반으로 추정) | **`SceneSnapshot`** — immutable per-tick POD 스냅샷 |
| 다중 슬롯 버퍼 | — | **`TripleBuffer`** (lock-free) |
| 스레드 친화도 | — | `ThreadAffinity` 모듈 |
| 진단 텔레메트리 | (사내) | `Telemetry` 모듈 |

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
