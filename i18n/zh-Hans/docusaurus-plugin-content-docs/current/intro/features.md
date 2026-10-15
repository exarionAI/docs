---
sidebar_position: 2
title: 主要功能
---

# 主要功能

## 声学仿真

- **基于路径追踪的传播** — 直接从几何体搜索直达声、透射、镜面反射（最多 16 阶）和 UTD 绕射路径
- **9 频段材质模型** — `63 Hz ~ 16 kHz` 各倍频程频段的反射、吸收、透射、散射，基于 BRAS 测量的 24 种预设
- **物理衰减** — `1/r` 距离衰减、ISO 9613-1 空气吸收、由温度/湿度/气压推导的声速
- **Late reverb** — 由声源 transport ray 的漫散射驱动的 FDN16，带空间耦合（late coupling）衰减
- **Doppler** — 可变延迟音高，可选的运动单极子辐射增益
- **Hybrid 早期反射** — 听者全局预算的 exact 对象 + HOA3 bed，渲染成本与路径数无关

## 渲染

- **双耳** — 引擎内置 MIT KEMAR，随包提供 SADIE II D2 KEMAR HRIR
- **扬声器** — 通过 HOA3 解码输出 2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 自定义布局
- **主机 pull 渲染** — 由主机音频回调拉取块的三种输出模式，内置重采样器
- **离线 IR** — 确定性地生成 Raw 能量 tap、9 频段压力 IR、双耳 IR

## 集成

- **多平台** — Windows、macOS、Linux、Android、iOS、Web（WebAssembly）
- **游戏引擎** — Unity、Unreal Engine 5
- **音频中间件** — FMOD Studio（SimpleST Source / Listener DSP）、Wwise（Sound-tracing Renderer / Source Settings）
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **公开 C ABI** — 实时/离线 2-DLL，POD-only，通过 capability 位确认功能

## 工具

- **演示应用** — 实时 3D 演示、离线 IR 演示、29 个测试场景
- **ExaTools** — IR 分析、验证和批处理工具集
