---
sidebar_position: 1
title: Sound Tracing 是什麼？
description: 以射線追蹤為基礎的即時空間聲學模擬（直達音、穿透、反射、繞射、殘響）概念介紹。
---

# Sound Tracing 是什麼？

**Sound Tracing** 是一種以物理為基礎、模擬虛擬空間中音源傳到聆聽者之前所經過的聲學傳播路徑的技術。
它對應於光線領域的 ray tracing，在聲學領域以幾何方式處理反射、繞射、穿透、吸收等現象，
重現空間特有的聽感。

![路徑視覺化](/img/intro/path-visualization.png)

## 解決什麼問題

- **有空間感的聲音**：根據空間資訊（幾何體與材質）產生脈衝響應（IR），讓同一個音源在洞穴、
  音樂廳、巷道中聽起來各不相同。
- **即時響應**：當聆聽者、音源或環境改變時更新 IR，以遊戲、VR、模擬器可接受的延遲提供結果。
- **基於物理的一致性**：不依賴啟發式的殘響預設，而是使用直接從幾何體推導的結果，
  因此能自然地隨場景變化調整。

## 如何運作

![Sound Tracing 概念圖](/img/intro/pipeline-concept.png)

1. **場景輸入**：接收網格、材質（9 頻段反射／吸收／穿透／散射）、音源與聆聽者位置。
2. **路徑追蹤**：由聆聽者發出的 guide ray 搭配 image source 驗證，找出直達音、穿透與鏡面反射路徑，
   並在網格邊緣（wedge）上求解 UTD 繞射路徑。由音源發出的 transport ray 收集擴散散射與房間統計
   （平均自由路徑、表面積、材質分布），用來驅動 late reverb。
3. **IR 轉換**：將抵達路徑的延遲、Doppler、9 頻段能量與方向資訊轉換到聲學領域，並以 **Hybrid**
   彙整方式將早期反射分成 exact 物件與 HOA3 bed。
4. **渲染**：經過頻段延遲環 → 路徑 tap → 空間化（HRTF／panning／揚聲器）→ FDN16 late reverb → 限幅器，
   產生即時立體聲或 N 聲道輸出，或確定性的 IR。

這條管線目前的實作就是 [SimpleST](../core/simplest.md) 引擎，所有 SDK 與中介軟體外掛都建構在它之上。

## 下一步

- [主要功能](./features.md) — 提供哪些功能
- [產品線](./products.md) — 引擎、SDK、外掛與工具陣容
- [SDK 入門](../sdk/overview.md) — 開始寫程式的起點
