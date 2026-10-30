---
sidebar_position: 2
title: 主要功能
---

# 主要功能

## 声学仿真

- **基于路径追踪的传播** — 直接从几何体搜索直达声、透射、镜面反射（最多 16 阶）和 UTD 绕射路径
- **9 频段材质模型**
- **物理衰减** — `1/r` 距离衰减、ISO 9613-1 空气吸收、由温度/湿度/气压推导的声速
- **Late reverb**
- **Doppler**
- **双耳渲染** — 基于 HRTF 的双耳输出

## 集成

- **多平台** — Windows、macOS、Linux、Android、iOS、Web（WebAssembly）
- **游戏引擎** — Unity、Unreal Engine 5
- **音频中间件** — FMOD Studio、Wwise
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **原生 C/C++** — 公开 C ABI（实时/离线）
