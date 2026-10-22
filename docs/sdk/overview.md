---
sidebar_position: 1
title: SDK 개요
description: SimpleST 실시간 공간 음향 엔진의 Web, Unity, Unreal Engine, FMOD, Wwise 통합 개요.
---

# SDK 개요

SoundTrace SDK는 [SimpleST](../core/simplest.md) 엔진을 웹·게임 엔진·오디오 미들웨어에서
사용할 수 있게 감싸는 제품군입니다. 모든 래퍼는 같은 저장소에서 같은 엔진 SDK
(`out/dist/<platform>_release/SimpleST`)를 소비하며, **SimpleST 2.12.0 / ABI 6** 기준입니다.

## 통합 라인업

| 이름 | 대상 | 형태 | 상태 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.0.0 (vendor ZIP / npm tgz) | 사용 가능 |
| [Unity](./unity.md) | Unity 2022.3 LTS 이상 (Unity 6 검증) | `.unitypackage` 0.3.0 | 사용 가능 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.3.0 + Python 설치기 | 사용 가능 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP 플러그인 | 사용 가능 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing` (Object Processor + Metadata) 플러그인 | 사용 가능 (Audiokinetic 파트너 승인 진행 중) |
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
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 24+ |
| iOS | device arm64 · simulator arm64/x86_64 정적 라이브러리 / XCFramework | iOS 15+ |
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

## 어디서 시작할까

- 브라우저와 Three.js → [Web SDK](./web.md)
- Unity 게임 → [Unity SDK](./unity.md)
- Unreal Engine 게임 → [Unreal Engine SDK](./ue.md)
- FMOD Studio로 저작하는 프로젝트 → [FMOD 플러그인](./fmod.md)
- Wwise로 저작하는 프로젝트 → [Wwise 플러그인](./wwise.md)
- 네이티브 C/C++ → [SimpleST](../core/simplest.md)
- STCoreV2 통합을 옮기는 중 → [STCoreV2 → SimpleST](../core/stcorev2.md)
