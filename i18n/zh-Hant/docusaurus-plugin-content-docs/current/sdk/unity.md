---
title: Unity
description: 安裝 SoundTrace Unity SDK，並使用品質預設、Band8/Parametric HRTF、GPU 傳播與三個範例場景。
---

# SoundTrace SDK for Unity

Unity SDK 將 Unity 網格、渲染材質插槽、音源與聆聽者連接到
[STCoreV2](../core/stcorev2.md)。

## 需求

| 項目 | 支援 |
|---|---|
| Unity | 2022.3 LTS 或更新版本 |
| 桌面平台 | macOS、Windows、Linux |
| 行動平台 | iOS、Android |
| Web | WebGL ST/MT 外掛 |

只有已安裝的原生外掛與平台支援時，GPU 傳播才會啟用。不支援的組態會繼續使用 CPU
傳播。目前 iOS 與 Android 使用 CPU 傳播。

## 安裝

在 Unity Package Manager 中選擇 `Add package from git URL...`，然後輸入：

```text
https://github.com/exarionAI/Unity_SoundTraceSDK.git
```

可能需要驗證或授權套件。直接複製儲存庫時，只能將 SDK 安裝到 `Packages/` 或開發環境的
`Assets/SoundTrace` 其中一處，不要同時安裝到兩處。

## Unity Audio 設定

1. 開啟 `Edit > Project Settings > Audio`。
2. 將 `Default Speaker Mode` 設為 `Stereo`。
3. 將 `DSP Buffer Size` 設為 `Best latency`。

![Unity Audio settings](/img/unity/Image01_AudioSetting.png)

## 最快設定

1. 在空 GameObject 上加入 `SoundTraceManager`。
2. 在 Main Camera 上加入 `SoundTraceListener`。
3. 在音源 GameObject 上加入 `SoundTraceSource`，並為 `AudioSource` 指定音訊片段。
4. 在作為聲學幾何體的網格 GameObject 上加入 `SoundTraceObject`。
5. 選擇性地在 Manager GameObject 上加入 `SoundTracePathVisualizer`。
6. 進入 Play Mode，確認音訊與路徑。

![SoundTraceManager](/img/unity/Image06_Manager.png)

![SoundTraceListener](/img/unity/Image04_Listener.png)

![SoundTraceSource](/img/unity/Image05_Source.png)

![SoundTraceObject](/img/unity/Image03_SoundTraceObject.png)

## 品質預設

開始時只選擇 `SoundTraceListener > Quality Preset`。

| 預設 | 建議目標 |
|---|---|
| `Fast` | 行動裝置、低功耗裝置、大量音源 |
| `Middle` | 一般遊戲與桌面平台的預設選擇 |
| `Quality` | 高階裝置與品質優先示範 |

預設會同時套用聆聽者射線與 HRTF／Diffuse 渲染品質。個別編輯受預設控制的屬性會將
預設切換為 `Custom`。一般整合應使用預設，不要手動調整射線解析度、深度或路徑預算。

## 選擇 HRTF

在 `SoundTraceListener > HRTF` 下選擇模式。

| 模式 | 行為 |
|---|---|
| `Band8` | 不使用外部 HRTF 表的輕量路徑 |
| `Parametric` | 使用 KU100 參數資源的測量型路徑 |

目前 Unity 封裝預設使用 `Parametric`。`Parametric` 會載入
`Runtime/Resources/SoundTrace/HRTF/KU100_bprime.bytes`；`Band8` 不需要載入資源。
SDK 還提供進階 HRIR 模式，但主要指南只介紹 Band8 與 Parametric。

## GPU 後端

啟用 `SoundTraceManager > Use GPU Backend` 以要求 GPU 傳播。

- 初始化成功後使用 GPU 後端。
- 不支援的外掛或裝置會繼續使用 CPU 回退。
- `Propagation Thread Count` 會保留供回退使用。
- WebGL 使用 STCoreV2 WebGPU 建置。

Manager 的執行階段狀態會顯示 `Active`、`Requested / CPU fallback` 或 `Disabled`。

## 聲學材質預設

`SoundTraceObject` 將 Unity 材質插槽對應到 SoundTrace 材質預設。

1. 在網格匯入設定中啟用 `Read/Write Enabled`。
2. 在 `SoundTraceObject` Inspector 中執行 `Auto Set`。
3. 只修正錯誤配對的子網格。

![Material Preset Library](/img/unity/Image_Mat_01.png)

預設資料庫為
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。
從 `Concrete`、`Steel`、`Marble`、`Snow`、`Soil` 等預設開始。
直接編輯原始 8 頻段值屬於進階自訂材質流程。

## 物件更新

| 模式 | 用途 |
|---|---|
| `Static` | 不移動的房間、牆面與地板 |
| `Dynamic` | 僅 Transform 移動的門與道具 |
| `Refit` | 拓撲穩定的蒙皮或動畫網格 |
| `Rebuild` | 拓撲實際變化的幾何體 |

大多數場景只需要 `Static` 與 `Dynamic`。

## 主要元件

### SoundTraceManager

每個場景使用一個。它擁有原生執行階段、材質預設、傳播更新與 GPU/CPU 後端選擇。

### SoundTraceListener

通常附加到 Main Camera。選擇 `Quality Preset` 與 `HRTF`，進階控制維持預設值。

### SoundTraceSource

空間化同一 GameObject 上的 `AudioSource`。同步多個音源時，使用共用的
`AudioSettings.dspTime` 與 `PlayScheduled()`。

### SoundTraceObject

註冊 `MeshFilter` 與 `MeshRenderer` 幾何體。匯入模型包含多個網格子物件時，
使用 `Add To Child Meshes`。

### SoundTracePathVisualizer

顯示直達、反射、繞射、殘響與透射路徑，用於除錯。正式效能測量時應停用。

## 範例

### SampleScene01

![SampleScene01](/img/unity/SampleScene01.png)

基本房間、音源、聆聽者、幾何體、材質與路徑視覺化。

### SampleScene02

![SampleScene02](/img/unity/SampleScene02.png)

音源／聆聽者移動、材質預設，以及 Unity Audio 與 SoundTrace 輸出比較。

### SampleScene03

![SampleScene03](/img/unity/Img_25_Sample03.png)

較大空間中的 NPC 音源、牆面遮蔽、移動聆聽者的 HRTF 方向與房間響應。

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 沒有聲音 | Stereo／Best latency、AudioSource 片段、Listener 與 Manager |
| 幾何體被忽略 | `Read/Write Enabled`、MeshFilter/MeshRenderer 與更新模式 |
| GPU 未啟用 | 平台外掛支援；CPU 回退警告是有效狀態 |
| 效能較低 | 依 `Quality → Middle → Fast` 降級，然後關閉視覺化 |
| 方向不正確 | Main Camera Transform 與重複的 AudioListener |
| 多個音源出現鑲邊聲 | 從相同的 `AudioSettings.dspTime` 開始播放 |

## 下一步

- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
- [SDK 概覽](./overview.md)
