---
sidebar_position: 1
title: Sound Tracing 是什麼？
description: 以射線追蹤為基礎的即時空間聲學模擬（直達音、穿透、反射、繞射、殘響）概念介紹。
---

# Sound Tracing 是什麼？

**Sound-Tracing** 是以世宗大學 [朴宇燦教授](https://prof.sejong.ac.kr/pwchan/index.do) 研究團隊
研發的 sound tracing 論文為基礎打造的即時空間聲學解決方案。

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

1. **場景輸入**：接收網格、材質（9 頻段）、音源與聆聽者位置。
2. **路徑追蹤**：找出直達音、穿透、反射、繞射路徑，並收集空間的擴散特性來驅動 late reverb。
3. **IR 轉換**：將抵達路徑的延遲、Doppler、頻段能量與方向資訊轉換到聲學領域。
4. **渲染**：以雙耳（HRTF）、panning、揚聲器配置產生即時輸出或確定性的 IR。

## 下一步

- [主要功能](./features.md) — 提供哪些功能
- [支援平台](../sdk/overview.md) — 開始寫程式的起點
