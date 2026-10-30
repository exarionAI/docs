---
title: Performance Guide
description: 以 Sound-Tracing SDK 為基礎之整合的效能軸線 — 射線預算、lane 週期、Hybrid 早期反射、渲染模式、執行緒、量測指標。
---

# Performance Guide

在 Sound-Tracing SDK 中，提高聆聽者 guide ray、音源 transport ray、反射深度、音源數與幾何體規模，
會讓路徑更穩定、空間感更好，但傳播時間與音訊渲染區塊成本也會隨之上升。
本文整理 Web、Unity、UE、FMOD、Wwise 整合共通的成本軸線與起點。

## 固定執行階段契約

| 項目 | 目前契約 |
|---|---|
| 聆聽者 | 每個即時上下文 1 個 |
| 輸出 | 雙耳／panning 2ch，或揚聲器配置（HOA3 解碼）N 聲道 |
| 引擎取樣率 | 固定 44.1 kHz，主機取樣率由內建重取樣器轉換 |
| 渲染區塊 | 512 影格（≈11.6 ms @ 44.1 kHz）— 每區塊的渲染成本必須落在此預算內才不會中斷 |
| 同時音源串流 | 64 個（超出的音源為 dry 或建立失敗） |
| 反射最大深度 | 16 · 穿透 64 |
| 預設 guide ray / 深度 | `16 × 16` / 8（全域），逐音源深度 4 |
| 預設 transport ray | `16 × 8` |
| 計算執行緒 | `maxComputeThreads = 0` → min(效能核心數, 6) |

## 主要選項與取捨

| 選項 | 品質影響 | 效能影響 |
|---|---|---|
| 聆聽者 guide ray（N×N） | 反射與繞射路徑的發現與方向穩定性 | 反射／繞射 lane 成本與格網面積成正比 |
| 反射深度 | 允許高階反射與混合繞射路徑 | 路徑搜尋與 IR tap 數增加 |
| 音源 transport ray（W×H）× 深度 | late reverb 的房間響應與材質反應穩定性 | 與音源數 × 格網 × 深度成正比 |
| 音源數 | 同時空間化的 emitter | 傳播 + 渲染（tap 數）成本 |
| 早期反射模式 | Objects = 所有路徑各自 HRTF，Hybrid = 預算 + HOA3 bed | **Objects 的渲染區塊與路徑數成正比** 增大 |
| 反射 lane 週期 | 越長，早期反射跟上聆聽者移動的速度越慢 | 對傳播 CPU 的節省最大 |
| 渲染模式 | Buffered ≈3 個區塊延遲 / In Callback 最低延遲 | In Callback 的渲染成本落在主機音訊執行緒上 |
| HRTF 資料集 | SADIE D2（256 tap）> MIT KEMAR（128 tap）的解析度 | 卷積成本與 tap 長度成正比 |
| 動態物件數 | 反映移動中的遮蔽物 | 動態 TLAS 重建成本 |

## 早期反射：請使用 Hybrid

在有 8 個音源的殘響廳堂（Sibenik）中量測的渲染區塊成本。

| 模式 | exact 物件 | 區塊成本 | 判定 |
|---|---:|---:|---|
| Objects | ≈650 | 16.8 ms | 超出 11.6 ms 預算 — 中斷 |
| Hybrid | ≈33 | 2.4 ms | 通過 |

Hybrid 只將聆聽者全域預算（反射 12+4 · 繞射 3+1）渲染為 exact 物件，其餘彙整到 HOA3 bed。
在 HRTF 多音源情況下約有 −1 ~ −2 dB 的音量差異。所有官方整合都預設啟用 Hybrid，
Objects 用於基準聆聽與離線 A/B。

## 品質預設（依整合）

| 整合 | Fast | Balanced / Middle | Quality |
|---|---|---|---|
| Web（`quality`） | 8×8，深度 4 | 16×16，深度 6 | 24×24，深度 8 |
| Unity Listener | 16，深度 4 | 24，深度 8 | 32，深度 12 |
| UE Listener | 12×12，深度 4 | 16×16，深度 8 | 24×24，深度 8 |
| UE Source（transport） | 8×4，深度 3 | 16×8，深度 4 | 24×12，深度 6 |

Web 的音源 transport ray 也遵循相同的值。Unity 音源的 transport ray 預設為 24 / 深度 4。

## 起始預設

| 情況 | guide ray | transport ray | 深度 | 反射 lane 週期 | 備註 |
|---|---|---|---|---|---|
| 行動裝置 / Web 多音源 | 8×8 ~ 12×12 | 8×4 ~ 8×8 | 4 | 33 ~ 66 ms | Fast 預設 |
| 桌機遊戲 | 16×16 | 16×8 | 8 | 33 ms（UE 預設）~ 0 | Balanced |
| 品質示範 | 24×24 ~ 32×32 | 24×12 | 8 ~ 12 | 0 ms | Quality，音源 ≤ 8 |

若空間感偏弱，不要先增加音源數，而是把 guide ray 與 transport ray／深度分開、逐級提高並確認。
效能不足時，依 (1) 確認 Hybrid → (2) 降低品質預設 → (3) 提高反射 lane 週期
→ (4) 關閉路徑視覺化 的順序調整。

## 執行緒與 lane

PIPELINED 排程器讓 Direct / Reflection-Diffraction / Reverb lane 以各自獨立的節奏運行。

| lane | 預設最小週期 | 意義 |
|---|---:|---|
| Direct | 10 ms | 連續執行起點之間的間隔。直達音與穿透 — 維持不出現 dropout |
| Reflection-Diffraction | 0 ms（立即） | 傳播成本的大部分。等待中的請求會合併為一個 |
| Reverb | 4 ms | 執行完成後到下一次之間的間隔 |

`maxComputeThreads` 預算 N 在 PIPELINED 下至少為 3（音訊 1 + Direct 專用 1 + 一般 N−2）。
在混合架構 CPU 上建議以 `st_rt_set_thread_attributes`（UE 的 `Prefer Performance Cores`）固定在
效能核心。實際執行緒數以 `st_rt_get_thread_inventory` 確認。

## 需要量測的指標

| 分組 | 指標 | 來源 |
|---|---|---|
| 傳播 | 各 lane 的 ms（direct / reflDiff / reverb）、IR 建置 ms | `st_rt_get_timing`（Web `debugSnapshot().simplest.timing`、UE Subsystem） |
| 渲染區塊 | `totalUs`、各階段 µs（sourceInput / exactTaps / bed / send / late / output）、activeSources、exactTaps、sendTaps | `st_rt_render_get_process_stats` |
| IR 發布 | publishSequence 節奏、bed 格數、prepare CPU/wall 比率（搶占 vs 慢核心） | `st_rt_ir_get_stats` |
| 場景 | 網格、物件、音源、三角形數 | `st_rt_scene_get_stats` |
| 音訊輸入 | queued / capacity / dropped / underrun 影格 | `st_rt_source_get_stream_status` |
| 延遲 | 輸出端延遲（影格）+ 佇列 + 固定 DSP 延遲 | `st_rt_render_get_latency_frames` |
| 主機 | 影格時間 p50/p95/p99、音訊回呼超時次數 | 平台分析工具 |

## 公開準則

| 項目 | 準則 |
|---|---|
| 已實測的值 | 一併標註平台、主機版本、Sound-Tracing SDK commit 與版本、情境 |
| 未量測的值 | 不要估算數字，標註為 `Measurement pending` |
| 串流上限 | 將引擎上限 64 與實際建議音源數分開 |
| Raw log | 不要原樣放進客戶文件，只公開彙總表與解讀 |
