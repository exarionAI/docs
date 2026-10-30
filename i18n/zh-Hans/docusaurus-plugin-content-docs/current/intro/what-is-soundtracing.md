---
sidebar_position: 1
title: Sound Tracing 是什么？
description: 基于光线追踪的实时空间声学仿真（直达声、透射、反射、绕射、混响）概念介绍。
---

# Sound Tracing 是什么？

**Sound-Tracing** 是基于世宗大学[朴宇燦教授](https://prof.sejong.ac.kr/pwchan/index.do)研究团队
研究开发的声音追踪（sound tracing）论文构建的实时空间声学解决方案。

它是光线追踪（ray tracing）在声学领域的对应方法，以几何方式处理反射、绕射、透射、吸收等现象，
从而重现空间自身的听感。

![路径可视化](/img/intro/path-visualization.png)

## 解决什么问题

- **有空间感的声音**：根据空间信息（几何体与材质）生成脉冲响应（IR），让同一个声源在洞穴、
  音乐厅、巷道中听起来各不相同。
- **实时响应**：当听者、声源或环境变化时更新 IR，以适合游戏、VR、模拟器的延迟提供结果。
- **基于物理的一致性**：不依赖启发式混响预设，而是使用直接从几何体推导出的结果，
  因此能自然适应场景变化。

## 如何工作

![Sound Tracing 概念图](/img/intro/pipeline-concept.png)

1. **场景输入**：接收网格、材质（9 频段）、声源与听者位置。
2. **路径追踪**：找到直达声、透射、反射、绕射路径，并收集空间的扩散特性以驱动 late reverb。
3. **IR 转换**：把到达路径的延迟、Doppler、频段能量和方向信息转换到声学域。
4. **渲染**：通过双耳（HRTF）、声像、扬声器布局生成实时输出或确定性 IR。

## 下一步

- [主要功能](./features.md) — 查看提供的能力
- [支持的平台](../sdk/overview.md) — 代码入口
