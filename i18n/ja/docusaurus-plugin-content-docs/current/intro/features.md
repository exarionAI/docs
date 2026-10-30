---
sidebar_position: 2
title: 主要機能
---

# 主要機能

## 音響シミュレーション

- **経路追跡ベースの伝搬** — 直接音・透過・鏡面反射（最大16次）・UTD回折の経路をジオメトリから直接探索
- **9バンド材質モデル**
- **物理減衰** — `1/r` 距離減衰、ISO 9613-1 空気吸収、温度・湿度・気圧から導出した音速
- **Late reverb**
- **Doppler**
- **バイノーラルレンダリング** — HRTF ベースのバイノーラル出力

## 統合

- **マルチプラットフォーム** — Windows、macOS、Linux、Android、iOS、Web（WebAssembly）
- **ゲームエンジン** — Unity、Unreal Engine 5
- **オーディオミドルウェア** — FMOD Studio、Wwise
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **ネイティブ C/C++** — 公開 C ABI（リアルタイム・オフライン）
