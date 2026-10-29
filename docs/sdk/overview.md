---
sidebar_position: 1
title: SDK 개요
description: SimpleST 실시간 공간 음향 엔진의 Web, Unity, Unreal Engine, FMOD, Wwise 통합 개요.
---

# SDK 개요

SoundTrace SDK는 [SimpleST](../core/simplest.md) 엔진을 웹·게임 엔진·오디오 미들웨어에서
사용할 수 있게 감싸는 제품군입니다. 모든 래퍼는 같은 저장소에서 같은 엔진 SDK
(`out/dist/<platform>_release/SimpleST`)를 소비하며, **SimpleST 2.22.0 / ABI 6** 기준입니다.
현재 SDK 릴리스는 2.22.0-jhj.5(2026-10-28)입니다. 래퍼 버전은 그대로이고, 다섯 래퍼 모두에
[소스 EQ와 출력 EQ](#음색-조절-eq)가 들어갔습니다. 리스너 방향은 쿼터니언으로 넘겨 머리 기울임(roll)이 살아 있고,
엔진 2.21이 켜는 등라우드니스 보정은 래퍼가 끕니다(아래 원칙 8). [음원 수 상한](#음원-수-상한)은 2.18.2 SDK와 같습니다.
이전 SDK 릴리스: 2.18.2-jhj.7 — SimpleST 2.18.2, 래퍼 버전은 현재와 같음. 그 전 릴리스: 2.12.0 — Web 1.0.0 · Unity 0.3.0 ·
UE 0.3.0 · FMOD 0.2.0 · Wwise 0.1.0. 레거시 라인으로 계속 제공됩니다.

## 통합 라인업

| 이름 | 대상 | 형태 | 상태 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.1.0 (vendor ZIP / npm tgz) | 사용 가능 |
| [Unity](./unity.md) | Unity 2022.3 LTS 이상 (Unity 6 검증) | `.unitypackage` 0.4.0 | 사용 가능 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.4.0 + Python 설치기 | 사용 가능 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP 플러그인 0.3.0 | 사용 가능 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing` (Object Processor + Metadata) 플러그인 0.2.0 | 사용 가능 (Audiokinetic 파트너 승인 진행 중) |
| [Python](./python.md) | 분석·연구 | — | 예정 |

UE·Unity 래퍼는 프로젝트에 FMOD 또는 Wwise 플러그인이 있으면 자동으로 그 미들웨어의
SimpleST 플러그인에 붙는 **통합 모드**로 전환됩니다(Meta XR Audio와 같은 분리). 그때 게임 엔진
쪽 컴포넌트는 지오메트리·재질·시각화만 담당하고 렌더는 미들웨어 플러그인이 합니다.

## 지원 플랫폼

| 플랫폼 | 엔진 바이너리 | 비고 |
|---|---|---|
| Windows x64 | `SimpleSTRealtime.dll` | Wwise Authoring 플러그인은 Windows DLL |
| macOS | Universal dylib (arm64 + x86_64) | |
| Linux x86_64 | `.so` (glibc 2.34+) | |
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 28+ (엔진 `.so`가 `libaaudio`를 직접 링크) |
| iOS | device arm64 · simulator arm64 정적 라이브러리 / XCFramework | iOS 15+ |
| Web | pthreads WASM (`SimpleSTRealtime.mjs/.wasm`) + 싱글스레드 Offline | COOP/COEP 필요 |

## 공통 사용 원칙

1. **품질 프리셋으로 시작**합니다 — `Fast` / `Balanced` / `Quality`. 리스너 guide ray와 반사 깊이를
   함께 정하며, 기본값 `Balanced`는 엔진 기본(16×16, 깊이 8)과 같습니다.
2. **초기 반사는 Hybrid**입니다. 모든 통합이 렌더 시작 뒤 Hybrid를 적용합니다. Objects 모드는
   기준 청취·오프라인 비교 용도입니다.
3. **HRTF는 두 가지**입니다. 엔진 내장 MIT KEMAR, 그리고 함께 배포되는 SADIE II D2 KEMAR.
   스피커 출력은 HOA3 디코드(2.0 ~ 7.1)이고 가벼운 스테레오 패닝 폴백이 있습니다.
4. **재질은 9밴드 프리셋**을 이름으로 매핑합니다. Unity·Web·UE는 모두 같은 SoundTrace 게임 재질
   22종(측정 데이터가 아닌 게임 프리셋, 같은 이름·순서·9밴드 값)을 기본으로 쓰고, FMOD·Wwise는 재질
   이름을 노출하지 않고 엔진 기본 라이브러리를 씁니다. 직접 편집은 밴드마다 R+A+T=1을 맞춘 검증된
   값에 한합니다.
5. 레이 해상도·깊이·레인 갱신 주기 같은 고급 노브는 **측정 뒤에만** 조정합니다.
6. 단위는 미터입니다. cm 단위 호스트(UE, Wwise for Unreal)는 래퍼가 `sceneRatio = 0.01`을 넣습니다.
7. **출력 리미터는 호스트 마스터 체인의 몫**입니다. 엔진 2.18.0은 컨텍스트 생성 직후 true-peak 리미터
   (−1 dBTP, 137샘플 지연)를 켜지만, UE·Unity·FMOD·Wwise·Web 래퍼는 문서화된 기본값대로 리미터를 **끈 상태**로
   유지합니다. 켜는 방법은 각 SDK 페이지를 참고하세요.
8. **등라우드니스 보정도 호스트 믹스의 몫**입니다. 엔진 2.21.0은 컨텍스트 생성 직후
   [등라우드니스 보정](../core/simplest.md#등라우드니스-보정)(저역 셸프 약 +7.2 dB @ 120 Hz, 고역 +1.8 dB)을 켜지만,
   모든 래퍼는 생성 직후 이를 끕니다. 끈 출력은 엔진 2.20과 비트 동일합니다. 음색은 아래 EQ나 호스트 믹서로 조절합니다.

## 음색 조절 (EQ)

SDK 릴리스 2.22.0-jhj부터 엔진의 [파라메트릭 EQ](../core/simplest.md#파라메트릭-eq)를 모든 래퍼가 두 자리로
노출합니다.

- **소스 EQ** — 음원 신호 자체에 엔진의 밴드 분리 앞에서 겁니다. 그 음원의 직접음·반사·회절·잔향이 모두 같은 톤이 됩니다.
- **출력 EQ** — SimpleST 믹스 전체에 렌더 끝(마스터 게인 앞)에서 겁니다.

| SDK | 소스 EQ | 출력 EQ | 밴드 |
|---|---|---|---|
| [Unreal Engine](./ue.md#eq) | Source Settings 에셋 `Source EQ`, Blueprint `SetSourceEq` | Project Settings `Output EQ`, `USoundTracingSubsystem::SetOutputEq` | 최대 16 |
| [Unity](./unity.md#eq) | `SoundTraceSource` Inspector `Source EQ`, `SetSourceEq` | `SoundTraceListener` Inspector `Output EQ`, `SetOutputEq` | 최대 16 |
| [Web](./web.md#eq) | `source.setEq(eq \| null)` | `sound.setOutputEq(eq \| null)` | 최대 16 |
| [FMOD](./fmod.md#eq) | SimpleST Source DSP의 EQ 파라미터 | SimpleST Listener DSP의 EQ 파라미터 | 4 고정 |
| [Wwise](./wwise.md#eq) | Sound-tracing Source Settings의 EQ 프로퍼티 | Sound-tracing Renderer의 EQ 프로퍼티 | 4 고정 |

- 필터 종류는 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6종입니다(컷은 12 dB/oct 고정).
  Web만 Web Audio `BiquadFilterType` 이름(`'peaking'`, `'lowshelf'`, `'highshelf'`, `'lowpass'`, `'highpass'`, `'notch'`)을 씁니다.
- 범위: 주파수 20 ~ 20,000 Hz, 게인 ±24 dB(Peaking·셸프만), Q 0.1 ~ 30(셸프는 3까지), 프리앰프 −48 ~ +12 dB.
- **기본은 꺼짐**이고, 꺼져 있으면 엔진을 호출하지 않으므로 출력은 EQ가 없을 때와 같습니다. 바뀐 값만 보내며 엔진이
  20 ms 크로스페이드로 넘어갑니다.
- UE·Unity가 FMOD/Wwise 통합 모드일 때는 게임 엔진 쪽 EQ를 보내지 않습니다. 미들웨어 플러그인의 EQ를 쓰세요.

## 음원 수 상한

SDK 릴리스 2.18.2부터 엔진이 플랫폼별로 동시 음원 수와 음원 메모리에 상한을 둡니다 — 데스크톱
128음원 · 메모리 무제한 · 지연 링 천장 2.0 s, Android/iOS 48음원 · 96 MiB · 1.0 s, 웹 32음원 · 64 MiB · 0.5 s.
상한을 넘는 음원은 엔진이 생성을 거절하고(`ST_STATUS_BUDGET_EXCEEDED`), 게임은 멈추지 않습니다. 데스크톱
기본 128음원은 종전(무제한) 대비 **행동 변경**입니다. 엔진 쪽 세부는
[SimpleST — 음원 메모리 예산](../core/simplest.md#음원-메모리-예산)을 참고하세요.

| SDK | 음원 수 설정 (0 = 플랫폼 기본) | 거절된 음원 | 지연 링 천장 |
|---|---|---|---|
| [Unreal Engine](./ue.md) | Project Settings `Max Sources` | dry 경로로 폴백 | `Max Delay Seconds`(0 = 플랫폼 기본) |
| [Unity](./unity.md) | `SoundTraceRuntime.MaxSources` | 경고를 남기고 `AudioSource` dry | `SoundTraceListener.maxDelaySeconds`(기본 0 = 플랫폼 기본) |
| [Web](./web.md) | `SoundTrace.create` 옵션 `maxSources` | 생성 거절(status 11), 기존 음원은 계속 렌더 | `setRenderOptions({ maxDelaySeconds })` |
| [FMOD](./fmod.md) | `SimpleSTFmod_Config.maxSources` | 그 보이스를 dry로 재생 | 엔진 플랫폼 기본 |
| [Wwise](./wwise.md) | `SimpleSTWwise_Config.maxSources` | 그 보이스를 dry로 재생 | 엔진 플랫폼 기본 |

## 어디서 시작할까

- 브라우저와 Three.js → [Web SDK](./web.md)
- Unity 게임 → [Unity SDK](./unity.md)
- Unreal Engine 게임 → [Unreal Engine SDK](./ue.md)
- FMOD Studio로 저작하는 프로젝트 → [FMOD 플러그인](./fmod.md)
- Wwise로 저작하는 프로젝트 → [Wwise 플러그인](./wwise.md)
- 네이티브 C/C++ → [SimpleST](../core/simplest.md)
- STCoreV2 통합을 옮기는 중 → [STCoreV2 → SimpleST](../core/stcorev2.md)
