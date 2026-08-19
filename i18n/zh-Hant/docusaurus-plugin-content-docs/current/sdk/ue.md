---
title: Unreal Engine
description: 安裝 SoundTracing UE5 外掛，並設定音訊整合、HRTF、GPU 傳播、材質預設與範例預留內容。
---

# SoundTrace SDK for Unreal Engine

UE5 SDK 透過 Unreal Audio Extension 外掛與 Actor Component 連接
[STCoreV2](../core/stcorev2.md)。目前原始碼專案以 Unreal Engine 5.6 為目標，
並包含原生 Unreal Audio、FMOD 與 Wwise 整合的選擇路徑。

## 目前狀態

| 項目 | 狀態 |
|---|---|
| 引擎 | Unreal Engine 5.6 |
| 外掛 | `Plugins/SoundTracing` |
| 宣告的目標平台 | Win64、macOS、Linux、Android、iOS |
| 目前簽出中包含的預先建置二進位檔 | Win64 Release |
| 示範場景 | 三個文件預留場景；尚未包含場景資源 |

其他目標平台需要發行套件中提供對應的 STCoreV2 二進位檔。

## 安裝

1. 關閉專案。
2. 將 `Plugins/SoundTracing` 複製到目標專案的 `Plugins/` 目錄。
3. 開啟 `.uproject` 並啟用 `SoundTracing` 外掛。
4. 重新啟動編輯器並完成模組編譯。
5. 開啟 `Project Settings > Plugins > SoundTracing`。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

## Unreal Audio 設定

為每個目標平台選擇：

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

範例專案使用 48 kHz、1024 影格回呼與一個排隊緩衝區。調校前應先使用目前專案的音訊
預算驗證功能。

## 最快設定

### 1. Project Settings

開始時只決定：

- HRTF：`Band8` 或 `Parametric`
- 是否要求 GPU 傳播
- 預設啟用的路徑

保持射線解析度、深度與 Early Path 預算的預設值。

### 2. 音源設定資源

在 Content Browser 中建立可重複使用的 `SoundTracing Audio Spatialization Settings`
資源。將共用資源作為預設使用，不要逐一編輯 Audio Component。

| 預設資源 | 用途 |
|---|---|
| `ST_Source_Fast` | 大量同時播放的音源或背景音源 |
| `ST_Source_Middle` | 一般遊戲音源 |
| `ST_Source_Quality` | 主角音源與品質優先示範 |

目前外掛公開了進階音源屬性，但大多數專案只需要修改強度、路徑啟用旗標與衰減覆寫。

### 3. Audio Component

將共用的 SoundTracing 設定資源指派給 Audio Component，或指派到 Sound Attenuation
的 Spatialization Plugin Settings。

### 4. 幾何體

將 `SoundTracingObjectComponent` 作為目標 `StaticMeshComponent` 或
`SkinnedMeshComponent` 的直接子元件加入。目前實作使用它的直接父網格。

### 5. 材質

執行 `Sync Materials From Parent`，將渲染材質名稱對應到 SoundTrace 材質預設，
然後只修正不相符的插槽。

## HRTF

主要指南使用兩種模式。

| 模式 | 行為 |
|---|---|
| `Band8` | 不需要外部 HRTF 資源的輕量渲染 |
| `Parametric` | 使用 KU100 參數表的測量型渲染 |

原始碼還包含進階 `Convolution` 與 `SteamAudio` 模式。只有在發行套件已驗證對應資源
與平台二進位檔後才應使用。

## GPU 後端

啟用 `bEnableGpuPropagation` 會要求初始化 GPU Provider。

- 初始化成功後使用 GPU 傳播。
- 缺少 Export、裝置或後端時繼續使用 CPU。
- Win64 套件必須包含 `webgpu_dawn.dll`。
- GPU 部署應使用相容的 LBVH 系列幾何體設定。

透過 Output Log 中的 `SoundTracing GPU propagation enabled` 或 CPU 回退警告確認
實際執行路徑。

## 材質預設

外掛內容包含預設 `SoundTraceMaterialPresetLibrary`。
`SoundTracingObjectComponent` 將渲染材質名稱與別名對應到預設。優先使用內建預設；
直接編輯 8 頻段反射、吸收、透射與散射值時，應建立獨立的自訂資料庫。

## 物件更新

| 模式 | 用途 |
|---|---|
| `Static` | 不移動的關卡幾何體 |
| `Dynamic` | 僅 Transform 移動的門與道具 |
| `Refit` | 頂點姿勢變化的蒙皮網格 |
| `Rebuild` | 拓撲變化的幾何體 |

## 路徑視覺化

加入 `SoundTracingPathVisualizerComponent` 可顯示以 Niagara 為基礎的路徑線段。
這是除錯／示範功能，正式效能測量時應停用。

## 示範場景預留內容

目前簽出不包含以下三個示範資源。這些章節保留未來場景發行後要接入的文件結構。

### SampleScene01 — Basic Room

:::note 預留內容
基本音源、聆聽者、靜態房間幾何體、材質預設與直達／反射路徑。
:::

### SampleScene02 — Material and Dynamic Door

:::note 預留內容
共用音源預設、材質變更、動態門遮蔽與 CPU/GPU 比較。
:::

### SampleScene03 — Multiroom

:::note 預留內容
多音源、房間切換、繞射／透射與 HRTF 方向。
:::

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 選擇器中沒有外掛 | 外掛啟用狀態、模組編譯與平台 Audio 設定 |
| 原生函式庫載入失敗 | `ThirdParty/STCoreV2` 下的目標平台二進位檔與已打包相依項目 |
| 音源未空間化 | Audio Component 是否指派 SoundTracing 音源設定資源 |
| 幾何體被忽略 | Object Component 的直接父層是否為支援的網格元件 |
| GPU 回退至 CPU | GPU Provider／Export／裝置與 `webgpu_dawn.dll` 打包 |
| 路徑不可見 | Visualizer Component、Niagara 外掛與路徑啟用狀態 |

## 下一步

- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
