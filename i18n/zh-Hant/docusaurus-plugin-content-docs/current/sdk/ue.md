---
title: Unreal Engine
description: SoundTrace Unreal Engine SDK 安裝、單聲道音訊匯入、外掛設定、Detail Properties 與公開 API。
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal Engine SDK 是即時空間音訊外掛，將 Unreal 的音源、聆聽器和網格連接至 [STCoreV2](../core/stcorev2.md)。透過專案全域設定與 Actor Component 設定聲學路徑、材質、HRTF 和 GPU 運算。

## 需求與平台

| 項目 | 要求 / 支援範圍 |
|---|---|
| Unreal Engine | `5.6` 以上 |
| 支援平台 | Windows x64, macOS, Linux, Android, iOS |

## 安裝

1. 關閉 Unreal Editor 與目標專案。
2. 將 SDK 的 `Plugins/SoundTracing` 複製到目標專案的 `Plugins/`。
3. 開啟 `.uproject` 並啟用 `SoundTracing` plugin。
4. 完成 C++ module 編譯並重新啟動 Editor。
5. 在 `Project Settings > Plugins > SoundTracing` 檢查全域設定。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

只散佈 Plugin 資料夾時，也要保留 `Content/STData` 與 `ThirdParty/STCoreV2`。Material
preset、custom HRTF 與 native runtime 會使用這些路徑。

## Unreal 編輯器設定

1. 在 `Edit > Project Settings > Platforms` 中開啟目標平台的 `Audio` 設定。
2. 將 `Spatialization Plugin` 設為 `SoundTracing`。
3. 將 `Source Data Override Plugin` 設為 `SoundTracing`。
4. 重新啟動編輯器。
5. 開啟 `Project Settings > Plugins > SoundTracing`，檢查全域設定。

![在 Project Settings 中選擇 SoundTracing](/img/unreal/ST_Listener_Setting_Editor01.png)

Windows 專案可從以下數值開始，再依音訊負載調整。

| 設定 | 起始值 |
|---|---:|
| `Audio Sample Rate` | `48000 Hz` |
| `Callback Buffer Frame Size` | `1024` |
| `Buffers To Enqueue` | `2` |

## 音訊資產匯入設定 — 單聲道

![一般與單聲道 Sound Wave 資產](/img/unreal/MonoSoundImport.png)

用於 SoundTrace 空間化的音源應準備為單聲道（1 個聲道）。

1. 在音訊編輯工具中將原始音訊匯出為單聲道 PCM WAV 檔案。
2. 使用 Content Browser 的 `Import` 匯入，產生 `Sound Wave` 資產。
3. 確認 Sound Wave 的聲道數為 `1`。
4. 將該資產指定至 Audio Component 的 `Sound` 欄位。

單聲道描述的是輸入音源的聲道配置。SoundTrace 依聆聽器位置繪製耳機方向感。基本匯入流程請參閱 [Unreal 音訊匯入指南](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-audio-files?application_version=5.6)。

## 快速開始

1. 在 `Project Settings > Plugins > SoundTracing` 中從 `Quality Preset = Fast` 開始。
2. 在 Content Browser 的 `Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` 中建立音源設定資產。
3. 建立 `Sound Attenuation` 資產並啟用 `Enable Spatialization`。將 `Spatialization Method` 設為 `Plugin-Spatialized`，把音源設定資產加入 `Spatialization Plugin Settings` 陣列。
4. 為 Audio Component 指定單聲道 Sound Wave。啟用 `Allow Spatialization`，關閉 `Override Attenuation`，將 Sound Attenuation 資產指定至 `Attenuation Settings`。
5. 在用於聲學幾何的 `StaticMeshComponent` 或 `SkinnedMeshComponent` 下直接新增子元件 `SoundTracingObjectComponent`。
6. 執行 Object 的 `Auto Set Materials` 並依需求調整材質槽。
7. 啟動 PIE 並播放 Audio Component。使用 `SoundTracing.Status` 檢查執行階段就緒狀態和路徑數。
8. 為 Actor 新增 `SoundTracingPathVisualizerComponent` 以顯示路徑。

在 SoundTracing 外掛設定中管理全域配置，透過 `SoundTracingSubsystem` 查詢執行階段狀態。未新增 Listener Component 時，使用 Unreal 音訊聆聽器的位置及專案預設聆聽器設定。

## 元件概覽

| 元件 | Unreal Engine SDK | 用途 |
|---|---|---|
| SoundTracing 外掛設定 | `SoundTracingSettings`, `SoundTracingSubsystem` | 專案配置及執行階段狀態查詢與控制 |
| 聆聽器 | `SoundTracingListenerComponent` | 聆聽器品質、輸出設定和位置覆寫 |
| 音源 | `SoundTracingSourceSettings` + `Audio Component` | 各音源的輻射強度、聲學路徑和衰減 |
| 聲音物件 | `SoundTracingObjectComponent` | 註冊網格、BVH 和材質槽 |
| 聲學材質 | `SoundTracingMaterialPresetLibrary` | 材質預設及各頻帶的反射、吸收和透射 |
| 聲音路徑視覺化 | `SoundTracingPathVisualizerComponent` | 使用 Niagara 顯示聲學路徑 |

## SoundTracing 外掛設定

<span id="project-settings" />

<span id="soundtracingsubsystem" />

![SoundTracing 執行階段與預設聆聽器設定](/img/unreal/ST_Listener_Setting_Editor02.png)

![SoundTracing 音源上限、衰減、材質和路徑設定](/img/unreal/ST_Listener_Setting_Editor03.png)

### Detail Properties

`SoundTracingSettings` 管理全域設定，`SoundTracingSubsystem` 控制執行階段。在 `Project Settings > Plugins > SoundTracing` 中編輯全域配置。表格列出 SDK 預設值，圖片展示設定範例。

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`。`-1` 依邏輯核心數自動設定，`0` 和 `1` 使用單一執行緒。修改後重新啟動。 |
| `Use GPU Backend` | 停用 | 要求 GPU 運算，初始化失敗時改用 CPU。修改後重新啟動。 |
| `Path Cache Size` | `256` | `0..1024`，作用中音源共用的路徑快取大小。`0` 關閉快取。 |
| `Propagation Interval (ms)` | `0` | `0..500`，傳播要求的最小間隔。`0` 表示每個遊戲 tick 要求一次，執行中的要求會合併。 |
| `Quality Preset`, `Listener Rays`, `HRTF`, `Render Quality` | `Fast` | 預設聆聽器配置。各欄位詳見下方聆聽器的 Detail Properties 表。 |
| `Source Ray Resolution Cap` | `0` | `0..32`，各音源殘響射線解析度的全域上限。`0` 不施加額外限制。 |
| `Source Ray Depth Cap` | `0` | `0..16`，各音源殘響射線深度的全域上限。`0` 不施加額外限制。 |
| 各路徑 `Strength` | 各 `1.0` | `Direct`、`Reflection`、`Diffraction`、`Reverb` 和 `Transmission` 的衰減強度，範圍 `0.5..1.5`。套用至使用專案衰減設定的音源；數值越大，相同距離下衰減越快。 |
| `Material Preset Library` | 未指定 | 未指定時使用內建程式庫。選擇其他程式庫後重新啟動。 |
| `Paths`, `Air Absorption` | 啟用 | 預設聆聽器的路徑類型和空氣吸收設定。 |

### 公開方法

在 Blueprint 中使用 `Get World Subsystem` 取得 `SoundTracingSubsystem`。C++ 可使用 `USoundTracingSubsystem::Get(WorldContextObject)`。

| 方法 | 傳回值 / 行為 |
|---|---|
| `Get(const UObject* WorldContextObject)` | C++ 靜態方法，傳回對應 World 的 Subsystem。 |
| `IsNativeRuntimeReady()` | `bool`，原生程式庫、場景和聆聽器是否就緒。 |
| `IsGpuPropagationActive()` | `bool`，GPU 傳播是否實際啟用。 |
| `GetGpuBackendStatus()` | `FString`：`GPU active`、`CPU` 或包含原因的 `CPU fallback (...)`。無法存取執行階段時傳回 `Unavailable`。 |
| `GetLastValidPathCount()` | `int32`，最近完成的傳播影格的有效路徑數。 |
| `GetLastNativeError()` | `FString`，最近的原生錯誤。最新影格成功時為空。 |
| `GetNativeVersion()` | `FString`，以 `major.minor.revision` 格式表示的原生程式庫版本。 |
| `GetRegisteredObjectCount()` | `int32`，目前 World 中註冊的物件數。 |
| `GetActiveListenerSettings()` | `FSoundTracingListenerSettings`，目前實際套用的聆聽器設定。 |
| `ResetMotionState()` | 在傳送或切換關卡後重設聆聽器和音源的運動歷史。 |
| `RequestPropagationFrame()` | 在一般更新週期之外要求傳播計算。 |

### 公開屬性

以下為 `USoundTracingSettings` 的 C++ 配置成員。使用 `GetDefault<USoundTracingSettings>()` 讀取專案設定。

| 屬性 | 型別 | 說明 |
|---|---|---|
| `PropagationThreadCount` | `int32` | 設定的傳播執行緒數。 |
| `bEnableGpuPropagation` | `bool` | GPU 使用要求旗標。透過 `IsGpuPropagationActive()` 檢查實際啟用狀態。 |
| `PathCacheSize` | `int32` | 路徑快取大小。 |
| `PropagationIntervalMs` | `int32` | 傳播要求最小間隔，單位毫秒。 |
| `DefaultListenerSettings` | `FSoundTracingListenerSettings` | 專案預設聆聽器配置。 |
| `SourceRayResolutionCap`, `SourceRayDepthCap` | `int32` | 音源射線解析度和深度的全域上限。 |
| `DefaultSourceAttenuationStrengths` | `FSoundTracingAttenuationStrengths` | 各路徑類型的預設距離衰減強度。 |
| `MaterialPresetLibrary` | `TSoftObjectPtr<USoundTracingMaterialPresetLibrary>` | 啟動時註冊的材質程式庫。 |

## 聆聽器

<span id="soundtracinglistenercomponent" />

![預設聆聽器配置](/img/unreal/ST_Listener_Setting_Editor02.png)

將 `SoundTracingListenerComponent` 新增至 Pawn 或 Camera，可依關卡覆寫專案聆聽器配置，或使用該元件的 Transform 取代 Unreal 音訊裝置聆聽器。

### Detail Properties

Project Settings 和 Listener Component 共用聆聽器配置欄位。上圖為專案預設配置，元件還提供以下覆寫選項。

| 欄位 | 預設值 | 行為 |
|---|---:|---|
| `Override Project Listener Settings` | 開啟 | 使用 `Listener Settings` 取代 Project Settings |
| `Listener Settings` | `Fast` | Quality、HRTF、output mode、path 與 air absorption |
| `Drive Listener Transform` | 關閉 | 將此 component 的 world transform 與 velocity 傳送給 native listener |

一個 World 中只能有一個 Listener Component 驅動 active listener。另一個 component 開始
Begin Play 時會取代前一個，並在 Output Log 寫入警告。

| 聆聽器配置欄位 | 預設值 | 說明 |
|---|---:|---|
| `Quality Preset` | `Fast` | 選擇 `Custom`、`Fast`、`Middle` 或 `Quality`。 |
| `Ray Resolution`, `Ray Depth` | `16`, `4` | 分別為 `1..32` 和 `1..16`。路徑追蹤解析度和深度，可在 `Custom` 下編輯。 |
| `Output Mode` | `Headphones` | 選擇耳機或喇叭輸出。 |
| `Hrtf Mode` | `HRIR Interpolated` | 參閱下方 HRTF 表。 |
| `Custom HRTF Relative Path` | 空字串 | 相對於外掛 Content 的自訂 HRTF 路徑。留空使用內建表。 |
| `HRTF Path Budget` | `1` | `1..32`，套用方向性 HRTF 處理的優先路徑數。 |
| `Diffuse Enabled`, `Diffuse Quality` | 停用, `Low` | 控制早期散射聲及其品質。`Low/Medium/High` 最多保留 `128/512/1024` 條散射路徑。 |
| `Delay Interpolation` | `Linear` | 選擇 `Linear`、`Cubic Lagrange` 或 `Lagrange 6` 延遲插值。 |
| `Early Path Budget` | `128` | `0..4096`，套用完整移動延遲處理的早期間接路徑數。`0` 取消限制。 |
| `Render Band Tier` | `Merged4` | 透過 `Merged4` 或 `Full8` 選擇繪製頻帶數。 |
| 各路徑 `Enable … Path` | 全部啟用 | 分別啟用或關閉 `Direct`、`Reflection`、`Diffraction`、`Reverb` 和 `Transmission` 路徑。 |
| `Air Absorption Enabled` | 啟用 | 套用空氣吸收造成的衰減。 |
| `Temperature Celsius` | `20` | `-40..60 °C`，空氣溫度。 |
| `Relative Humidity Percent` | `50` | `0..100%`，相對濕度。 |
| `Pressure Pa` | `101325` | `50000..120000 Pa`，氣壓。 |

#### Quality Preset

`Fast`、`Middle`、`Quality` 會一起套用 ray 與進階 render 品質值。需要手動編輯時選擇
`Custom`。

| Preset | Ray Resolution | Ray Depth | HRTF Path Budget | Diffuse | Delay Interpolation | Early Path Budget |
|---|---:|---:|---:|---|---|---:|
| `Custom` | 儲存值 | 儲存值 | 儲存值 | 儲存值 | 儲存值 | 儲存值 |
| `Fast` | `16` | `4` | `1` | 關閉 / Low | Linear | `128` |
| `Middle` | `24` | `8` | `1` | 開啟 / Medium | Cubic Lagrange | `128` |
| `Quality` | `32` | `12` | `1` | 開啟 / High | Lagrange 6 | `128` |

`HRTF Path Budget` 是獲得完整 directional HRTF voice 的高優先 path 數。所有內建 preset
都維持 `1`，為 audio thread 保留餘裕。在 Custom 中提高它可能讓多 source scene 發生
dropout。

#### HRTF 與輸出模式

| HRTF 模式 | 所需 asset | 說明 |
|---|---|---|
| `Band8` | 無 | 使用 8-band magnitude 與 ITD 的輕量模式 |
| `HRIR` | STCoreV2 embedded table | 使用最近方向的量測 HRIR |
| `HRIR Interpolated` | STCoreV2 embedded table | 依方向插值量測 HRIR；預設模式 |

`Custom HRTF Relative Path` 可指定相對於外掛 `Content` 的 `MPI1`、`SAH1` 或 `BPH1` 表路徑。留空使用 STCoreV2 內建表。

| Output Mode | 說明 |
|---|---|
| `Headphones` | Binaural HRTF 輸出 |
| `Speaker` | 內部 Ambisonic stereo decode |

進階 `Render Band Tier` 建議使用 `Merged4`；`Full8` 會增加每條 path 的 audio-thread
band 處理。Air Absorption 預設值為 `20 °C`、相對濕度 `50%`、`101325 Pa`，用於
ISO 9613-1 衰減。

### 公開方法

| 方法 | 行為 |
|---|---|
| `ApplyListenerSettings()` | 將目前 Detail Properties 值重新套用到 native listener |
| `SetQualityPreset(Preset)` | 變更並立即套用 quality preset |
| `SetHrtfMode(Mode)` | 變更並立即套用 HRTF mode |
| `SetOutputMode(Mode)` | 切換 Headphones/Speaker 並立即套用 |
| `ResetMotionState()` | Teleport、respawn 後清除 listener/source velocity history |
| `GetListenerSettings()` | 回傳 component 目前的 listener settings |
| `static GetActiveListener(const UWorld* World)` | 在 C++ 中傳回對應 World 的作用中 Listener Component。 |

### 公開屬性

| 屬性 | 型別 / 存取 | 說明 |
|---|---|---|
| `bOverrideProjectListenerSettings` | `bool` / 讀寫 | 是否使用該元件的聆聽器配置。 |
| `ListenerSettings` | `FSoundTracingListenerSettings` / 讀寫 | 元件的品質、輸出和路徑設定。執行階段直接修改後，呼叫 `ApplyListenerSettings()` 套用。 |
| `bDriveListenerTransform` | `bool` / 讀寫 | 是否使用元件的位置和方向驅動聆聽器。 |

## 音源

<span id="soundtracing-audio-spatialization-settings" />

![音源設定資產的 Detail Properties](/img/unreal/STSettingAssets_SourceSetups.png)

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` 中建立。相同用途的
source 應共用一個 asset，不必為每個 Audio Component 複製。

### Detail Properties

| 欄位 | 預設值 | 範圍／行為 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`。乘到每條 path 的 linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`。在 Intensity 之上增加的 gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`。Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`。Early reflection send |
| `Ray Preset` | `Custom` | `Custom`、`Fast`（8×8，depth 4）、`Middle`（16×16，depth 4）、`Quality`（24×24，depth 4）。非 `Custom` 時以 preset 值覆寫下面兩個值。對應 Unity `SoundTraceSource` 的 `Reverb Ray Resolution`，套用於共用該 asset 的所有 source |
| `Ray Resolution` | `24` | `0..32`。`0` 繼承 Listener grid；其他值使用 `N × N` source reverb ray |
| `Ray Depth` | `4` | `0..16`。`0` 繼承 Listener depth |
| 各路徑 `… Path Enabled` | 全部啟用 | 依音源啟用或關閉 `Direct`、`Reflection`、`Diffraction`、`Reverb` 和 `Transmission`。 |
| `Override Project Attenuation Strengths` | 開啟 | 關閉時使用 Project Settings attenuation |
| 每種 path 的 `Strength` | `1.0` | `0.5..1.5`。值越大，同距離下衰減越快 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`。Renderer 保留的最大 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。Path 進入／移除 fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`。缺少 non-direct path 在 fade 前的保持時間。`0` 停用 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`。每個 sample 的最大 delay 變化 |
| `Bypass` | 關閉 | 跳過 SoundTrace spatial rendering，直接傳遞輸入 |

#### 連接至 Audio Component

將音源設定資產連接至 Sound Attenuation，再將該 Attenuation 資產指定給 Audio Component。同類音源可共用這兩個資產。

![在 Sound Attenuation 的 Spatialization Plugin Settings 中指定音源設定](/img/unreal/ST_AttenAsset_PutSettingAssetHere.png)

啟用 `Enable Spatialization` 並選擇外掛空間化方式。在 `Spatialization Plugin Settings` 陣列中新增 `SoundTracing Audio Spatialization Settings` 資產。

![在 Audio Component 的 Attenuation Settings 中指定 Sound Attenuation](/img/unreal/ST_Source_PutAssetHere.png)

啟用 Audio Component 的 `Allow Spatialization`，關閉 `Override Attenuation`。將先前建立的 Sound Attenuation 指定至 `Attenuation Settings`。

### 公開方法

以下為 `USoundTracingSourceSettings` 提供的 C++ 方法。使用 Audio Component 的 `Play()` 和 `Stop()` 控制播放。

| 方法 | 傳回值 / 行為 |
|---|---|
| `GetEffectiveAttenuationStrengths()` | `FSoundTracingAttenuationStrengths`，依覆寫設定傳回音源或專案的衰減強度。 |
| `ApplyRayPreset()` | 依 `RayPreset` 更新 `RayResolution` 和 `RayDepth`，`Custom` 下保留原值。 |

## 聲音物件

<span id="soundtracingobjectcomponent" />

![SoundTracingObjectComponent Detail Properties](/img/unreal/STObj_01.png)

`SoundTracingObjectComponent` 將 immediate parent 的 `StaticMeshComponent` 或
`SkinnedMeshComponent` 註冊為聲學 geometry。它必須直接放在目標 mesh component 下方，
不能放在 Actor 階層的任意位置。

### Detail Properties

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Auto Register Native Object` | 開啟 | Begin Play 時自動註冊 native object |
| `Sync Transform On Tick` | 開啟 | Parent 變化時才更新 native transform |
| `Auto Sync Materials` | 開啟 | Parent render material 變更時重新整理 slot |
| `Update Type` | `Static` | Geometry update policy |
| `BVH Type` | `LBVH SIMD8` | Native acceleration structure builder |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Sync Skinned Vertices On Tick` | 關閉 | 在 `Refit` 模式下每 tick 上傳目前 skeletal pose |
| `Sound Material Slots` | 自動產生 | Render material slot 到 SoundTrace preset 的 mapping |
| `Visualize BVH` | 關閉 | 使用 Editor component visualizer 繪製 BVH line |
| `BVH Visualization Color` | 青色 | BVH 顯示色彩。 |
| `Native Object Id`, `Native Mesh Id` | `-1` | 已註冊的原生 ID，唯讀，未註冊時為 `-1`。 |

Static Mesh 設定 Forced LOD 時使用該 LOD，否則使用 LOD 0。Skinned Mesh 也優先 Forced LOD，
並上傳目前 pose vertex。

#### Geometry 與 BVH

| BVH Type | Refit | GPU backend | 說明 |
|---|---|---|---|
| `HKDTree` | 支援 | 不支援 | KD split；Refit 後切換到 BVH-style fallback traversal |
| `LBVH` | 支援 | 不支援 | Scalar Morton LBVH |
| `LBVH SIMD4` | 支援 | 支援 | 4-wide leaf intersection |
| `LBVH SIMD8` | 支援 | 支援 | 目前預設值 |
| `LBVH SIMD16` | 支援 | 支援 | 16-wide leaf intersection |

要求 GPU backend 時若選擇 `HKDTree` 或 scalar `LBVH`，plugin 會替換成可上傳到 GPU 的
`LBVH SIMD8` native builder。

| Update Type | 用途 |
|---|---|
| `Static` | 不移動的 level geometry |
| `Dynamic` | 僅 transform 變化的 door、prop；更新 TLAS instance |
| `Refit` | Topology 不變但 vertex pose 變化的 Skinned Mesh |
| `Rebuild` | Triangle topology 變化、需要重建 BVH 的 geometry |

要同步 skinned animation，請同時啟用 `Update Type = Refit` 與
`Sync Skinned Vertices On Tick = true`。Plugin 會上傳目前 pose vertex 並 refit native mesh。
這會在每 tick 進行 CPU skinning 與 vertex upload，因此應限制物件數量與 LOD。

相同 Static Mesh、LOD、material mapping 與 BVH 設定的 object 共用一個 native BVH。
Skinned Mesh 的 cache key 包含 component path，不同 pose 不會覆寫同一個 native mesh。

### 公開方法

| 方法 | 行為 |
|---|---|
| `RegisterNativeObject()` | 將 Parent geometry 註冊到 native scene |
| `UnregisterNativeObject()` | 移除 native object 註冊 |
| `SyncNativeTransform()` | 立即套用目前 parent transform |
| `RefreshNativeMesh()` | Mesh 或 material 變更後重新上傳 geometry |
| `SyncMaterialsFromParent()` (`Auto Set Materials`) | 根據父元件的繪製材質名稱和別名自動比對預設。 |
| `SetMaterialPresetIndex(Slot, Preset)` | 變更一個 slot 的 preset index |
| `SetMaterialPresetForAllSlots(Preset)` | 對所有 slot 套用同一 preset |
| `SetUpdateType(Type)` | 變更 native object update policy |
| `GetResolvedMeshLodIndex()` | 回傳實際上傳的 LOD index |
| `GetUploadedTriangleCount()` | 回傳上次上傳的 triangle 數量 |
| `IsRegistered()` | 回傳 native object 與 mesh 是否都有效 |
| `GetNativeObjectId()`, `GetNativeMeshId()` | 傳回已註冊的原生 ID，未註冊時為 `-1`。 |
| `GetTargetMeshComponent()` | 傳回用於註冊的直接父網格元件。 |
| `static IsGpuCompatibleBvhType(ESoundTracingBvhType InBvhType)` | 屬於 SIMD LBVH 系列時傳回 `true`。 |
| `GetBvhMaxDepth()`, `GetPrimitivesPerLeafNode()`, `GetBvhType()` | 在 C++ 中查詢 BVH 設定。 |
| `GetSoundMaterialSlots()` | 在 C++ 中傳回聲學材質槽陣列的唯讀參考。 |
| `BuildNativeBvhDebugLineSegments(TArray<FVector>& OutLocalLinePoints)` | 在 C++ 中取得區域座標下的 BVH 偵錯線段。 |
| `ShouldVisualizeBvh()`, `GetBvhVisualizationColor()` | 僅 Editor 可用的 C++ 方法，用於查詢 BVH 顯示狀態和色彩。 |

## 聲學材質與 Transmission

![SoundTracing Material Preset Library Detail Properties](/img/unreal/ST_Material_Graph.png)

### Detail Properties

預設 library 位於 plugin 的
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset`，目前包含與 Unity/Web SDK
相同的 22 種 material table。

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Material Preset Library` 中建立 custom library。
新 asset 會複製目前的預設 library。在 Project Settings 的 `Material Preset Library` 中選擇
後重新啟動 Editor。

| 欄位 | 說明 |
|---|---|
| `Presets` | 聲學材質清單。 |
| `Display Name`, `Aliases` | 選擇清單中的顯示名稱及自動比對繪製材質的別名。 |
| `Material Index` | 原生材質索引，依程式庫中的清單順序維護。 |
| `Scattering` | `0..1`，鏡面反射與散射的比例。 |
| `Reflection`, `Absorption`, `Transmission` | 8 個頻帶的反射、吸收和透射能量係數，各值為 `0..1`。 |
| `Transmission Model` | 選擇 `Surface` 或 `Solid Distance`。 |
| `Thickness to -30 dB (m)` | `Solid Distance` 各頻帶的衰減參考距離。 |
| `ResetToBundledJson` | 從內建 JSON 還原預設清單。 |

頻帶中心為 `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000 Hz`。
可在 Editor band graph 上點擊或拖曳來編輯。

#### Transmission Model

| 模型 | 輸入 | Geometry 條件 |
|---|---|---|
| `Surface` | 穿過一次表面後剩餘的各頻帶 energy coefficient `0..1` | 可用於開放面與薄 surface |
| `Solid Distance` | 透射 energy 衰減至 `-30 dB` 時的各頻帶參考距離 (m) | 需要封閉 volume 與一致的 face 方向 |

`Solid Distance` 不是 object 的實際厚度。Runtime 會測量 ray 在 geometry 內經過的實際距離，
再依參考距離衰減。`0` 會完全阻擋該 band。

`ImportFromJson`、`ExportToJson`、`ResetToBundledJson` 使用 Unity/Web 共用的
`soundMaterial.json` 格式。沒有 `transmissionDistanceToMinus30DbMeters` 表示 `Surface`；
存在 8 個有效值表示 `Solid Distance`。

### 公開方法

| 方法 | 傳回值 / 行為 |
|---|---|
| `NormalizePresets()` | 正規化預設索引和各頻帶值。 |
| `GetPresetCount()` | 傳回預設數量。 |
| `FindBestPresetIndexByName(const FString& RenderMaterialName)` | 尋找與繪製材質名稱或別名相符的預設索引。 |
| `GetPresetDisplayName(int32 PresetIndex)` | 傳回預設的顯示名稱。 |
| `ResetToBundledJson()` | 以內建 JSON 取代清單，可透過編輯器按鈕或 C++ 呼叫。 |
| `ExportToJson()` | 傳回 `soundMaterial.json` 格式的字串。 |
| `ImportFromJson(const FString& JsonText)` | 使用 JSON 取代清單，沒有可解析的材質時傳回 `false`。 |
| `FindBestPresetIndex(const UMaterialInterface* RenderMaterial)` | 在 C++ 中尋找符合繪製材質的預設。 |
| `FindPresetIndexByToken(const FString& Token, int32 FallbackIndex)` | 在 C++ 中依詞尋找預設，未找到時使用 fallback 索引。 |
| `static GetFrequencyBandCentersHz()` | 在 C++ 中傳回 8 個中心頻率陣列的唯讀參考。 |
| `static LoadDefaultLibrary()` | 在 C++ 中載入專案指定的程式庫或預設程式庫。 |
| `static MakeFallbackPresets()` | 在 C++ 中建立備用預設陣列。 |
| `static ParseSoundMaterialJson(const FString& JsonText, TArray<FSoundTracingMaterialPreset>& OutPresets)` | 在 C++ 中將 JSON 解析為預設陣列。 |
| `static SerializeSoundMaterialJson(const TArray<FSoundTracingMaterialPreset>& InPresets)` | 在 C++ 中將預設陣列轉換為 JSON 字串。 |
| `static LoadBundledJson(FString& OutJson)` | 在 C++ 中讀取內建 JSON 字串並傳回是否成功。 |

### 公開屬性

| 屬性 | 型別 / 存取 | 說明 |
|---|---|---|
| `Presets` | `TArray<FSoundTracingMaterialPreset>` / 讀寫 | 程式庫中儲存的預設陣列。 |
| `FrequencyBandCount` | `static constexpr int32` / 常數 | 頻帶數量，值為 `8`。 |

## 聲音路徑視覺化

<span id="soundtracingpathvisualizercomponent" />

![Add Component 搜尋結果中的 Sound Tracing Path Visualizer](/img/unreal/PathVisualizer_01.png)

在 Actor 的 `Add Component` 中搜尋並新增 `Sound Tracing Path Visualizer`。該元件由 C++ 實作，會建立路徑繪製所需的 Niagara 元件。

![使用 NS_Arrow 的 Niagara 元件的 Detail Properties](/img/unreal/PathVisualizer_02.png)

在 Actor 上新增 `SoundTracingPathVisualizerComponent`，可用 Niagara line segment 顯示
最近一次 propagation frame。

:::note NS_Arrow 內建資產路徑
`Niagara System Asset` 使用外掛內建的 `NS_Arrow`。預設路徑為 `/SoundTracing/FX/NS_Arrow.NS_Arrow`，關聯材質位於 `/SoundTracing/Materials/MAT_ArrowLine`。安裝或移動外掛時，請同時保留 `Content/FX` 和 `Content/Materials`，並檢查 Niagara 系統及材質參考是否有效。
:::

### Detail Properties

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Visualization Enabled` | 開啟 | 是否顯示 path |
| `Refresh Interval Ms` | `50` | 視覺化最小更新間隔，不影響 propagation |
| `Max Visualized Paths` | `1024` | 最大顯示 path 數，範圍 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 強度，範圍 `0.01..2.0` |
| `Niagara System` | 空 | 空時使用 plugin 預設 Niagara system |

色彩分別為 Direct=紅色、Reflection=橙色、Diffraction=綠色、Transmission=青色、Reverb=紫色。效能測量時請關閉視覺化。

### 公開方法

| 方法 | 傳回值 / 行為 |
|---|---|
| `SetVisualizationEnabled(bool bEnabled)` | 在執行階段啟用或關閉路徑顯示。 |
| `GetActivePathCount()` | `int32`，傳回視覺化元件目前保留的路徑數。 |

## 範例展示

### Test

![Unreal Test 展示圖片預留區](/img/unreal/demo-placeholder.svg)

開啟 SDK 範例專案中的 `Content/FirstPerson/Test.umap`，查看網格註冊、BVH 和聲學材質槽設定。

1. 選擇關卡網格，檢查 `SoundTracingObjectComponent` 的父元件連接和材質槽。
2. 在 PIE 中播放聲音並移動聆聽器，體驗方向感和遮蔽變化。
3. 切換材質預設，比較反射、吸收和透射差異。
4. 啟用 Path Visualizer，將聽感變化與聲學路徑對照。

範例地圖包含在 SDK 範例專案的 Content 中。僅安裝外掛的專案應使用 Migrate，將所需範例資產及其相依項目一起移轉。

## 疑難排解提示

| 症狀 | 檢查項目 |
|---|---|
| Audio 清單中沒有外掛 | 檢查 SoundTracing 是否啟用、C++ 模組是否建置、目標平台 Audio 設定及編輯器是否已重新啟動。 |
| 原生程式庫載入或 ABI 錯誤 | 使用同一 SDK 發行包中的外掛和原生程式庫，並確認封裝包含 ThirdParty 檔案。 |
| 沒有聲音或未空間化 | 檢查單聲道 Sound Wave、Audio Component 播放、兩個全域 Audio 外掛、Spatialization 啟用狀態和資產連接。 |
| 音源設定未生效 | 檢查 `Audio Component → Sound Attenuation → SoundTracing Source Settings` 連接和 `Override Attenuation` 設定。 |
| 聆聽器位置不符 | 啟用 `Drive Listener Transform` 時使用元件位置，否則使用 Unreal 音訊聆聽器位置。 |
| 聆聽器替換警告 | 每個 World 只保留一個作用中 Listener Component。 |
| 幾何未反映至音訊 | 檢查 Object Component 是否為支援網格的直接子元件，以及是否存在網格資料和三角形。 |
| 蒙皮動畫未生效 | 檢查 `Update Type = Refit`、`Sync Skinned Vertices On Tick = true` 和 LOD。 |
| GPU 未啟用 | 檢查 `GetGpuBackendStatus()` 和 Output Log。Windows 上需同時部署 `exaSound.dll` 和 `webgpu_dawn.dll`。 |
| 路徑不可見 | 檢查 Niagara 是否啟用、`Visualization Enabled`、音源和聆聽器的路徑設定及 `GetLastValidPathCount()`。 |
| 傳送後音高突變 | 修改位置後立即呼叫 Listener 或 Subsystem 的 `ResetMotionState()`。 |
| 音源較多時斷音 | 依下方順序調整傳播計算和音訊緩衝區。 |

### 音源較多時斷音

1. 將 `Propagation Interval (ms)` 設為 `50`，降低傳播要求頻率。
2. 將 `Source Ray Resolution Cap` 降至 `8..16`，或將音源的 `Ray Preset` 設為 `Fast`。
3. 聆聽器從 `Quality Preset = Fast`、`HRTF Path Budget = 1` 和 `Render Band Tier = Merged4` 開始。
4. 將 `Propagation Thread Count` 設為 `2..3` 並重新啟動，為遊戲、繪製和音訊執行緒保留執行時間。
5. 將 `Buffers To Enqueue` 設為至少 `2`，必要時調整 `Callback Buffer Frame Size`。
6. 關閉路徑視覺化，每次僅修改一個設定進行比較。

### 執行階段狀態

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` 輸出原生版本、就緒狀態、運算後端、物件和路徑數以及聆聽器設定。`SoundTracing.DumpGpuPropagationStats` 輸出 GPU 執行和 CPU 回退統計。

## 下一步

- [SDK 概覽](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
