---
sidebar_position: 2
title: 주요 기능
---

# 주요 기능

## 음향 시뮬레이션

- **경로 추적 기반 전파** — 직접음·투과·정반사(최대 16차)·UTD 회절 경로를 지오메트리에서 직접 탐색
- **9밴드 재질 모델** — `63 Hz ~ 16 kHz` 옥타브 밴드별 반사·흡수·투과·산란. 엔진 기본 검증 라이브러리는 BRAS 측정 기반 24종, Unity·Web·UE SDK 기본 재질은 SoundTrace 게임 재질 22종
- **물리 감쇠** — `1/r` 거리 감쇠, ISO 9613-1 공기 흡수, 온도·습도·기압에서 유도한 음속
- **Late reverb** — 음원 수송 레이의 확산 산란이 구동하는 FDN16, 공간 결합(late coupling) 감쇠
- **Doppler** — 가변 지연 피치, 선택적 이동 모노폴 방사 게인
- **Hybrid 초기 반사** — 리스너 전역 예산의 exact 오브젝트 + HOA3 bed로 경로 수와 무관한 렌더 비용

## 렌더링

- **바이노럴** — 엔진 내장 MIT KEMAR, 동봉 SADIE II D2 KEMAR HRIR
- **스피커** — HOA3 디코드로 2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 커스텀 레이아웃
- **호스트 pull 렌더** — 호스트 오디오 콜백이 블록을 가져가는 세 가지 출력 모드와 내장 리샘플러
- **오프라인 IR** — Raw 에너지 탭, 9밴드 압력 IR, 바이노럴 IR을 결정적으로 생성

## 통합

- **다중 플랫폼** — Windows, macOS, Linux, Android, iOS, Web(WebAssembly)
- **게임 엔진** — Unity, Unreal Engine 5
- **오디오 미들웨어** — FMOD Studio(SimpleST Source / Listener DSP), Wwise(Sound-tracing Renderer / Source Settings)
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **공개 C ABI** — 실시간·오프라인 2-DLL, POD-only, capability 비트로 기능 확인

## 도구

- **데모 앱** — 실시간 3D 데모, 오프라인 IR 데모, 29개 테스트 씬
- **ExaTools** — IR 분석·검증·배치 처리 도구 모음
