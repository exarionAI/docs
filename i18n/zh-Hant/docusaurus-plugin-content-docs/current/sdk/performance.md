---
title: Performance Guide
---

# Web SDK Performance Guide

在 soundtrace.js 中，提高 ray count、depth、source count 以及 geometry/BVH 設定，
可以改善聲學路徑的穩定性與空間感。同樣的設定也會同時提高傳播計算時間、記憶體用量、
主執行緒 frame time 與 AudioWorklet 負載。

本文是 SDK 整合方選擇選項時的效能/品質參考。下列預設為起點；實際建議的 source
數量與各平台上限，會在測量完成後以數值表更新。

## 固定執行階段合約

| 項目 | 目前合約 |
|---|---|
| Listener | 每個 scene 1 個 |
| Realtime output | stereo/binaural 2ch |
| 音訊渲染路徑 | ST/MT 皆為 WASM `AudioWorkletProcessor` |
| Multi-source 音訊 | 每個 source 呼叫 `source.play(input, 2)`（facade）/ ST·direct-native 使用 `createWorkletNode()` |
| Native source cap | 16 sources（`EXA_MAX_SOUNDSOURCE`） |
| Ray depth 上限 | 16（`EXA_MAX_DEPTH`） |
| 預設品質預設 | `quality: 'balanced'` = listener ray `24 x 24`，depth `8` |

`16` 是 native cap，也就是一個 scene 中可同時存在的 source 數量上限。對客戶應用
建議的即時 source 數，必須在此上限之內，依平台、geometry 規模、ray budget、BVH 與
ST/MT 模式分別測量。

各品質預設所設定的 listener ray grid 與 depth 如下。

| Preset | Listener ray | Depth |
|---|---|---|
| `fast` | `16 x 16` | `4` |
| `balanced`（預設） | `24 x 24` | `8` |
| `quality` | `32 x 32` | `12` |

## 主要選項與取捨

| 選項 | 品質影響 | 效能影響 |
|---|---|---|
| Listener ray width/height | 改善以聽者為基準的路徑發現與方向穩定性 | 傳播計算隨 ray grid 面積成比例增加 |
| Listener depth | 允許更深的 reflection/diffraction/reverb 路徑 | path search 與 cache pressure 增加 |
| Source reverb ray width/height | 改善 source 側 late reverb 覆蓋與材質反應穩定性 | 成本隨 source 數與 ray grid 面積增加 |
| Source reverb depth | 增加 source 側 late reverb 的追蹤深度 | depth 越大，path search 與 cache pressure 越高 |
| Source count | 同時空間化的 emitter 增加 | propagation 與 AudioWorklet mixer 成本增加 |
| BVH type | 改變 traversal/build 特性 | 依幾何體與更新方式，build/refit/traversal 成本不同 |
| BVH max depth | 控制樹的深度 | 過淺會使 traversal 沒效率，過深會增加 build/memory 成本 |
| Prims per leaf | 控制每個 leaf 的三角形數 | 依場景結構，traversal/build 的平衡點不同 |
| Animated/refit geometry | 反映移動中的 collider | refit/rebuild 成本增加，作為 stress 項目單獨測量 |
| Thread mode | MT 可將 propagation job 分散到 worker 執行緒 | 需要 cross-origin isolation，執行緒/記憶體開銷增加 |

## Reverb ray budget

Reverb ray 並不是 listener ray 的複製值。source 側 late reverb 的成本會以
`source count × width × height × depth` 成長，因此 production 預設值要與 listener
ray 分開，依場景逐步提高。QA 基準 sweep 為 source `[4, 8, 12, 16]`，general ray 與
reverb ray 各自經過 `4 x 4 x 3`、`8 x 8 x 7`、`16 x 16 x 11`、`32 x 32 x 16` 階段，
path cache `[256, 512, 1024]`。

## 起始預設

在實測表格完成之前，請將下列值作為起點，並依應用的目標 FPS 與聽感品質調整。

| Preset | Thread | Listener rays | Reverb rays | Depth | BVH | 用途 | 測量狀態 |
|---|---|---:|---:|---:|---|---|---|
| Mobile conservative | ST | `16 x 16` | `4 x 4` 或 `8 x 8` | `4` | LBVH 或 platform default | 行動裝置最低基準 | Measurement pending |
| Desktop balanced | ST 或 MT | `24 x 24` | `8 x 8` | `8` | LBVH_SIMD8 | 桌機基本基準 | Measurement pending |
| Desktop quality | MT | `32 x 32` | `16 x 16` | `12` | LBVH_SIMD8 | 品質優先桌機 | Measurement pending |
| Stress only | MT | `32 x 32` | `32 x 32` | `7..16` | BVH matrix | 僅供極限測量 | 非 realtime 預設值 |

> **MT 的效益尚未測量，並非必然更快。** 上表 MT 預設的速度效益仍是
> `Measurement pending`。MT 會將 propagation job 分散到 worker，因此效益出現在
> **ray 預算與 source 數較大時**（高 ray grid/depth、多 source）；在小型場景中，
> worker 往返與記憶體開銷可能讓 ST 更單純也更快。此外 MT 還有 cross-origin
> isolation（COOP/COEP）的部署成本。小型場景與簡單頁面請從 ST 開始，在預算較大的
> 場景中**實測比較** ST↔MT 後再選擇 MT。

若空間感偏弱，請勿先增加 source 數量；應分別、逐級提高 listener ray 與 source
reverb ray 的 count/depth。source 數量的增加放到最後測量。

## 需要測量的指標

在客戶文件中提供數值時，請在相同 duration/warmup 條件下重複測量同一 scenario，並且
只公開彙總值而非 raw log。

| 分組 | 指標 |
|---|---|
| Browser frame | 平均 FPS、frame time p50/p95/p99、worst frame、dropped frame count |
| Main-thread stall | `PerformanceObserver` longtask count/total/worst（僅支援的瀏覽器） |
| Engine propagation | `scene.tick()` + `scene.updatePropagation()` 時間 p50/p95/p99/worst |
| Native job timing | propagation job timing frame、worker 分散/等待時間 |
| Path quality | valid path count 平均/最大值、material/path 變化的聽感記錄 |
| Audio | `AudioContext.sampleRate`、`baseLatency`、`outputLatency`、state、setup time |
| Memory | native memory trace snapshot、JS heap snapshot |
| Manual observation | drop-out、定位偏弱、thermal、風扇噪音、體感耗電 |

僅靠瀏覽器 JavaScript 很難可靠取得跨平台通用的功耗/thermal 數值。功耗與 thermal
請勿作為自動測量值確定，應拆分為 manual observation 或專用設備的測量結果。

## 測量矩陣

| Matrix | 值 |
|---|---|
| Baseline | ST/MT 各 1 source，listener `16 x 16 x 3`，source `16 x 8 x 3`，static small geometry |
| Quality scale | listener `16 x 16`、`32 x 32`；source reverb `4 x 4`、`8 x 8`、`16 x 16`、`32 x 32`；depth `3`、`7`、`11`、`16` |
| Source scale | `1`、`2`、`4`、`8`、`12`、`16` sources（native cap `16`） |
| Reverb ray scale | source `[4, 8, 12, 16]`，general ray 階段 `4 x 4 x 3` → `8 x 8 x 7` → `16 x 16 x 11` → `32 x 32 x 16`，reverb ray 同階段，path cache `[256, 512, 1024]` |
| Geometry/BVH | small/medium/large geometry、HKDtree、LBVH、LBVH_SIMD4/8/16、LBVH_NWAY4/8/16 |
| Stress only | animated/refit、rebuild-heavy、native source cap、high ray budget |

## 公開準則

| 項目 | 準則 |
|---|---|
| 已實測的值 | 一併標註 platform、browser、SDK commit、STCoreV2 commit 與 scenario |
| 未測量的值 | 不要估算數字，標註為 `Measurement pending` |
| Source cap | 將 native cap `16` 與實際建議 source 數分開 |
| Stress 結果 | 作為極限/回歸偵測用途，而非 realtime 建議值 |
| Raw log | 不要原樣放進客戶文件，只公開彙總表與解讀 |
