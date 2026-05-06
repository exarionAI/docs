---
title: STCore
---

# STCore

**1세대 Sound Tracing 코어 모듈. FPGA 하드웨어 가속과 연동되는 SoundTracer + Auralizator 라이브러리.**

STCore는 Sound Tracing 기술의 첫 세대 구현체로, C/C++ 기반의 음향 시뮬레이션
라이브러리이며 FPGA 가속기와 통신하는 HW 인터페이스 계층을 포함합니다. 현재는
유지보수 모드이며, 신규 개발은 [STCoreV2](./stcorev2.md)에서 이루어집니다.

## 개요

| 항목 | 값 |
|---|---|
| 주 언어 | C / C++ |
| 빌드 | Visual Studio 솔루션 (`SoundTracer.sln`) + CMake |
| 1차 플랫폼 | Windows (x64) |
| HW 가속 | FPGA 인터페이스 (libusb 기반) |
| 상태 | 유지보수 |
| 후속 라인 | [STCoreV2](./stcorev2.md) |

## 모듈 구성

```
STCore/
├── SoundTracerSource/
│   ├── Core/         # 음향 추적·음향화 핵심
│   ├── HW/           # FPGA 인터페이스
│   ├── Auralization/ # 컨볼루션·HRTF
│   ├── Math/         # 벡터·행렬 유틸리티
│   ├── Objects/      # Scene 객체
│   ├── OperatorSource/
│   ├── GL/           # 시각화 헬퍼
│   └── Utils/        # 공통 유틸
├── SoundTracer/         # Visual Studio 데모/런처
├── SoundTracingDemo/    # 데모 애플리케이션
├── LIB/                 # 빌드 산출물
└── Doc/                 # Doxygen 문서
```

### Core 모듈 핵심 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `SoundTracer` | 광선 추적 기반 음향 경로 탐색 |
| `Auralizator` | 경로 → IR 합성 → 컨볼루션 |
| `UTDDiffraction` | UTD(Uniform Theory of Diffraction) 회절 모델 |
| `ReverberationZoneManager` | 잔향 영역 관리 |
| `RGC` | Ray Generation 클러스터 |
| `PathPPV` | 경로 정보 자료구조 |

### HW 모듈

`HW/` 디렉터리는 FPGA 가속기와의 통신 계층입니다.

- `fpga_interface.{cpp,h}` — 보드 제어
- `bfm_api.{c,h}` — Bus Functional Model 인터페이스
- `mem_api.{c,h}` — 디바이스 메모리 액세스
- `libusb` — USB 통신

이 계층 덕에 동일한 음향 알고리즘을 SW(범용 CPU)와 HW(FPGA 가속) 양쪽에서 실행할
수 있습니다.

## STCoreV2와의 관계

STCoreV2는 STCore에서 전파 모델·빌드·API 노출 방식을 확장한 후속 라인입니다. 전체
비교 표는 [STCore vs STCoreV2](./comparison.md) 페이지를 참고하세요.

## 언제 STCore를 선택하는가

신규 프로젝트는 [STCoreV2](./stcorev2.md)를 권장합니다. STCore는 다음의 경우에만
사용을 검토하세요.

- 이미 STCore에 통합된 코드가 있고 V2로 마이그레이션 중인 경우
- FPGA 가속 경로가 필요하며 V2의 SSP 모델로 대체할 수 없는 경우
- Visual Studio 솔루션 기반의 기존 빌드 시스템과 직접 통합해야 하는 경우

## 참고

- [STCoreV2](./stcorev2.md) — 활성 개발 중인 차세대 코어
- [SDK 개요](../overview.md)
