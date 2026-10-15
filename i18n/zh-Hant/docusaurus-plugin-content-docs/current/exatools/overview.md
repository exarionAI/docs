---
title: ExaTools 概覽
---

# ExaTools

用於分析、驗證與視覺化聲學模擬結果的公用程式工具集。

## 工具

| 名稱 | 用途 | 狀態 |
|---|---|---|
| [IRAnalyzer](./iranalyzer.md) | IR 分析與視覺化、以 Embree 為基礎的驗證 | 可用 |

## SimpleST 內建的分析路徑

即使不使用額外工具，[SimpleST](../core/simplest.md) 離線引擎（`SimpleSTOffline`）也能以確定性方式產生
Raw 能量 tap、9 頻段壓力 IR 與雙耳 IR。soundtrace.js 的 `getIRs()` /
`renderMonoImpulseResponse()`，以及 UE 與 Unity 的統計介面，也都暴露同一套引擎量測
（`st_rt_get_timing`、`st_rt_ir_get_stats`）。

## 追加工具

更多工具會逐步加入。
