---
sidebar_position: 2
title: 主要功能
---

# 主要功能

## 聲學模擬

- **基於路徑追蹤的傳播** — 直接從幾何體搜尋直達音、穿透、鏡面反射（最多 16 階）與 UTD 繞射路徑
- **9 頻段材質模型**
- **物理衰減** — `1/r` 距離衰減、ISO 9613-1 空氣吸收、由溫度／濕度／氣壓推導的音速
- **Late reverb**
- **Doppler**
- **雙耳渲染** — 以 HRTF 為基礎的雙耳輸出

## 整合

- **多平台** — Windows、macOS、Linux、Android、iOS、Web（WebAssembly）
- **遊戲引擎** — Unity、Unreal Engine 5
- **音訊中介軟體** — FMOD Studio、Wwise
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **原生 C/C++** — 公開 C ABI（即時／離線）
