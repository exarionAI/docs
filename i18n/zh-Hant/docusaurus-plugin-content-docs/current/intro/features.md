---
sidebar_position: 2
title: 主要功能
---

# 主要功能

## 聲學模擬

- **基於路徑追蹤的傳播** — 直接從幾何體搜尋直達音、穿透、鏡面反射（最多 16 階）與 UTD 繞射路徑
- **9 頻段材質模型** — `63 Hz ~ 16 kHz` 各八度頻段的反射、吸收、穿透與散射，24 種以 BRAS 量測為基礎的預設
- **物理衰減** — `1/r` 距離衰減、ISO 9613-1 空氣吸收、由溫度／濕度／氣壓推導的音速
- **Late reverb** — 由音源 transport ray 的擴散散射驅動的 FDN16，以及空間耦合（late coupling）衰減
- **Doppler** — 可變延遲音高，可選的移動單極子輻射增益
- **Hybrid 早期反射** — 聆聽者全域預算的 exact 物件 + HOA3 bed，渲染成本與路徑數無關

## 渲染

- **雙耳（binaural）** — 引擎內建 MIT KEMAR，另附 SADIE II D2 KEMAR HRIR
- **揚聲器** — 透過 HOA3 解碼輸出 2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 自訂配置
- **主機 pull 渲染** — 由主機音訊回呼取走區塊的三種輸出模式，以及內建重取樣器
- **離線 IR** — 以確定性方式產生 Raw 能量 tap、9 頻段壓力 IR 與雙耳 IR

## 整合

- **多平台** — Windows、macOS、Linux、Android、iOS、Web（WebAssembly）
- **遊戲引擎** — Unity、Unreal Engine 5
- **音訊中介軟體** — FMOD Studio（SimpleST Source / Listener DSP）、Wwise（Sound-tracing Renderer / Source Settings）
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **公開 C ABI** — 即時／離線 2-DLL、POD-only，以 capability 位元確認功能

## 工具

- **示範應用程式** — 即時 3D 示範、離線 IR 示範、29 個測試場景
- **ExaTools** — IR 分析、驗證與批次處理工具集
