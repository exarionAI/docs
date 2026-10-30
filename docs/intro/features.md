---
sidebar_position: 2
title: 주요 기능
---

# 주요 기능

## 음향 시뮬레이션

- **경로 추적 기반 전파** — 직접음·투과·정반사(최대 16차)·UTD 회절 경로를 지오메트리에서 직접 탐색
- **9밴드 재질 모델**
- **물리 감쇠** — `1/r` 거리 감쇠, ISO 9613-1 공기 흡수, 온도·습도·기압에서 유도한 음속
- **Late reverb**
- **Doppler**
- **바이노럴 렌더링** — HRTF 기반 바이노럴 출력

## 통합

- **다중 플랫폼** — Windows, macOS, Linux, Android, iOS, Web(WebAssembly)
- **게임 엔진** — Unity, Unreal Engine 5
- **오디오 미들웨어** — FMOD Studio, Wwise
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **네이티브 C/C++** — 공개 C ABI(실시간·오프라인)
