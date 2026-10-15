---
sidebar_position: 3
title: 제품군
---

# 제품군

Sound Tracing 제품군은 **엔진**, **SDK·플러그인**, **분석 도구**의 세 축으로 구성됩니다.

## Core — SimpleST

C++20 기반의 기하음향 네이티브 엔진입니다.

- [SimpleST](../core/simplest.md) — 현행 엔진. 공개 C ABI 6(실시간 `st_rt_*` / 오프라인 `st_off_*`)
- [STCoreV2 → SimpleST](../core/stcorev2.md) — 이전 세대 엔진에서 옮기는 팀을 위한 대응표

## SDK · 플러그인

엔진을 각 플랫폼·미들웨어에서 사용할 수 있도록 감싸는 라인업입니다.

- [SDK 개요](../sdk/overview.md)
- 게임 엔진: [Unity](../sdk/unity.md), [Unreal Engine](../sdk/ue.md)
- 오디오 미들웨어: [FMOD](../sdk/fmod.md), [Wwise](../sdk/wwise.md)
- 웹: [soundtrace.js](../sdk/web.md)
- 예정: [Python](../sdk/python.md)

## ExaTools

IR 분석, 데이터 변환, 배치 검증 등을 위한 유틸리티 도구 모음입니다.

- [ExaTools 개요](../exatools/overview.md)
