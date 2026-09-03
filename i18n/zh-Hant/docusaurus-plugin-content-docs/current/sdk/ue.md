---
title: Unreal Engine
description: SoundTracing Unreal Engine 外掛 0.2.0 的安裝、Unity 風格元件、HRTF、幾何、材質、GPU 後端與 Blueprint API。
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal SDK 透過 Unreal Audio Extension Plugin 與 Actor Component 連接
[STCoreV2](../core/stcorev2.md)。0.2.0 使用 STCoreV2 v0.7 的 C-ABI 4，並提供與 Unity SDK
一致的 Manager、Listener、Source、Object 與 PathVisualizer 架構。

本文介紹 Unreal native audio integration。FMOD 與 Wwise 應分別建置成獨立 integration，
不能在同一個 build 中與 native integration 同時啟用。

## 需求與平台

| 項目 | 目前版本／範圍 |
|---|---|
| Unreal Engine | `5.6` |
| SoundTracing plugin | `0.2.0` Beta |
| STCoreV2 | `v0.7`，C-ABI `4` |
| 宣告支援的 target platform | Win64、macOS、Linux、Android、iOS |
| 目前 SDK checkout 內的 prebuilt binary | Win64 Release |
| Source channel | Mono 或 Stereo，最多 2 channels |
| 附加 plugin | Niagara，由 `SoundTracing.uplugin` 自動啟用 |

目前 Win64 package 包含：

```text
Plugins/SoundTracing/ThirdParty/STCoreV2/
├─ Binaries/Win64/Release/exaSound.dll
├─ Binaries/Win64/Release/webgpu_dawn.dll
└─ Lib/Win64/Release/exaSound.lib
```

建置其他 target 時，必須將對應 platform 的 `exaSound` runtime 與 link artifact 放入相同的
ThirdParty 結構。`SupportedTargetPlatforms` 的宣告不會自動產生 native binary。

:::warning 僅支援 ABI 4
SoundTracing 0.2.0 不相容 ABI 3 或更舊的 `exaSound`。混用舊 DLL 時，初始化會因
`STCoreV2 export table is incomplete` 錯誤而停止。
:::

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

## Unreal Audio 設定

Native Unreal audio integration 需要在各 target platform 的 Audio 設定中選擇：

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

變更後請重新啟動 Editor。每個 `Audio Component` 或 `Sound Attenuation` asset 也要啟用
Spatialization，並指定 `SoundTracing Audio Spatialization Settings` asset。

SDK sample project 使用以下 Windows audio 值作為起點：

| 設定 | Sample 值 |
|---|---:|
| Audio Sample Rate | `48000` Hz |
| Callback Buffer Frame Size | `1024` |
| Buffers To Enqueue | `1` |

這些是 sample 值，不是 plugin 的硬性需求。若專案的 audio budget 不同，請先以這些值確認
功能，再調整 callback 與 buffer size。

## 最快設定

1. 檢查 `Project Settings > Plugins > SoundTracing` 的 Runtime Options 與
   Default Listener Settings。
2. 在 Content Browser 的 `Sounds > SoundTracing` 建立
   `SoundTracing Audio Spatialization Settings` asset。
3. 將 asset 指派給 `Audio Component` 或 `Sound Attenuation` 的
   Spatialization Plugin Settings。
4. 在作為聲學 geometry 的 `StaticMeshComponent` 或 `SkinnedMeshComponent` 正下方新增
   `SoundTracingObjectComponent` child component。
5. 執行 Object Component 的 `Auto Set Materials`，只修正配對錯誤的 slot。
6. 啟動 PIE，執行 `SoundTracing.Status` 檢查 native runtime、backend、listener 與 path 數量。

沒有 Listener Component 時 plugin 仍可運作。此時它會跟隨 Unreal audio-device listener，
並使用 Project Settings 的 Default Listener Settings。

## 元件概覽

| Unity SDK | Unreal Engine SDK | 作用 |
|---|---|---|
| `SoundTraceManager` | `Project Settings > Plugins > SoundTracing` | Native runtime、thread、GPU、cache 與預設 Listener 設定 |
| `SoundTraceListener` | `SoundTracingListenerComponent` | Level 級 Listener profile 與可選 transform override |
| `SoundTraceSource` | `SoundTracing Audio Spatialization Settings` | Source 級 emission、ray、path、attenuation 與 render tuning |
| `SoundTraceObject` | `SoundTracingObjectComponent` | Static/Skinned geometry、BVH 與 material slot 註冊 |
| `SoundTracePathVisualizer` | `SoundTracingPathVisualizerComponent` | 以 Niagara 顯示 propagation path |
| Manager runtime panel | `SoundTracingSubsystem` | 透過 Blueprint 讀取 runtime 狀態與最近 propagation 結果 |

## Project Settings

`Project Settings > Plugins > SoundTracing` 對應 Unity 的 `SoundTraceManager`。

### Runtime Options

| 欄位 | 預設值 | 範圍／行為 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`。`-1` 讓 STCoreV2 使用邏輯 core 數減一；`0` 或 `1` 為 serial。GPU 模式停用。需要重啟 |
| `Use GPU Backend` | 關閉 | 要求 Dawn/WebGPU 初始化，失敗時 fallback 到 CPU。需要重啟 |
| `Path Cache Size` | `256` | `0..1024`。所有 active source 共用的 cache budget。`0` 停用 cache |
| `Propagation Interval (ms)` | `0` | `0..500`。`0` 表示每個 game tick 要求一次；上一個 frame 執行中會合併要求 |

### Listener、Attenuation 與 Materials

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Default Listener Settings` | `Fast` | Level 中沒有 Listener Component override 時使用 |
| `Default Source Attenuation Strengths` | 每個 path `1.0` | Source asset 不覆寫 project attenuation 時使用。範圍 `0.5..1.5` |
| `Material Preset Library` | 空 | 空時使用內建 `SoundTraceMaterialPresetLibrary`。選擇其他 library 後需要重啟 |

SDK sample project 的 `DefaultGame.ini` 為示範 override 成 `Middle` 並啟用 GPU。Plugin 本身的
預設值如上表。

## SoundTracingListenerComponent

將此元件加到 Pawn 或 Camera，可依 Level 覆寫 Project Settings 的 Listener profile，
或用此 component 的 transform 取代 Unreal audio-device listener。

### Inspector

| 欄位 | 預設值 | 行為 |
|---|---:|---|
| `Override Project Listener Settings` | 開啟 | 使用 `Listener Settings` 取代 Project Settings |
| `Listener Settings` | `Fast` | Quality、HRTF、output mode、path 與 air absorption |
| `Drive Listener Transform` | 關閉 | 將此 component 的 world transform 與 velocity 傳送給 native listener |

一個 World 中只能有一個 Listener Component 驅動 active listener。另一個 component 開始
Begin Play 時會取代前一個，並在 Output Log 寫入警告。

### Quality preset

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

### HRTF 與輸出模式

| HRTF 模式 | 所需 asset | 說明 |
|---|---|---|
| `Band8` | 無 | 使用 8-band magnitude 與 ITD 的輕量模式 |
| `HRIR` | STCoreV2 embedded table | 使用最近方向的量測 HRIR |
| `HRIR Interpolated` | STCoreV2 embedded table | 依方向插值量測 HRIR；預設模式 |

0.1.0 的 `Parametric`、`Convolution`、`SteamAudio` 已在 0.2.0 移除。
`Custom HRTF Relative Path` 可指定相對於 plugin `Content` 的 `MPI1`、`SAH1` 或
`BPH1` table 路徑。留空時使用 STCoreV2 embedded table。

| Output Mode | 說明 |
|---|---|
| `Headphones` | Binaural HRTF 輸出 |
| `Speaker` | 內部 Ambisonic stereo decode |

進階 `Render Band Tier` 建議使用 `Merged4`；`Full8` 會增加每條 path 的 audio-thread
band 處理。Air Absorption 預設值為 `20 °C`、相對濕度 `50%`、`101325 Pa`，用於
ISO 9613-1 衰減。

### Blueprint 方法

| 方法 | 行為 |
|---|---|
| `ApplyListenerSettings()` | 將目前 Inspector 值重新套用到 native listener |
| `SetQualityPreset(Preset)` | 變更並立即套用 quality preset |
| `SetHrtfMode(Mode)` | 變更並立即套用 HRTF mode |
| `SetOutputMode(Mode)` | 切換 Headphones/Speaker 並立即套用 |
| `ResetMotionState()` | Teleport、respawn 後清除 listener/source velocity history |
| `GetListenerSettings()` | 回傳 component 目前的 listener settings |

## SoundTracing Audio Spatialization Settings

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` 中建立。相同用途的
source 應共用一個 asset，不必為每個 Audio Component 複製。

### Inspector

| 欄位 | 預設值 | 範圍／行為 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`。乘到每條 path 的 linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`。在 Intensity 之上增加的 gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`。Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`。Early reflection send |
| `Ray Resolution` | `24` | `0..32`。`0` 繼承 Listener grid；其他值使用 `N × N` source reverb ray |
| `Ray Depth` | `4` | `0..16`。`0` 繼承 Listener depth |
| `Direct/Reflection/Diffraction/Reverb/Transmission` | 全部開啟 | 依 Source 啟用 path family |
| `Override Project Attenuation Strengths` | 開啟 | 關閉時使用 Project Settings attenuation |
| 每種 path 的 `Strength` | `1.0` | `0.5..1.5`。值越大，同距離下衰減越快 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`。Renderer 保留的最大 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。Path 進入／移除 fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`。缺少 non-direct path 在 fade 前的保持時間。`0` 停用 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`。每個 sample 的最大 delay 變化 |
| `Bypass` | 關閉 | 跳過 SoundTrace spatial rendering，直接傳遞輸入 |

從 0.2.0 起，spatializer 在每個 audio block 中直接讀取
`FAudioPluginSourceInputData::SpatializationParams` 更新 source。若 source 仍停留在
native `(0,0,0)`，請確認 0.2.0 plugin module 與 binary 已一起部署。

## SoundTracingObjectComponent

`SoundTracingObjectComponent` 將 immediate parent 的 `StaticMeshComponent` 或
`SkinnedMeshComponent` 註冊為聲學 geometry。它必須直接放在目標 mesh component 下方，
不能放在 Actor 階層的任意位置。

### Inspector

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

Static Mesh 設定 Forced LOD 時使用該 LOD，否則使用 LOD 0。Skinned Mesh 也優先 Forced LOD，
並上傳目前 pose vertex。

### Geometry 與 BVH

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

### Blueprint 方法

| 方法 | 行為 |
|---|---|
| `RegisterNativeObject()` | 將 Parent geometry 註冊到 native scene |
| `UnregisterNativeObject()` | 移除 native object 註冊 |
| `SyncNativeTransform()` | 立即套用目前 parent transform |
| `RefreshNativeMesh()` | Mesh 或 material 變更後重新上傳 geometry |
| `Auto Set Materials` | 依 Parent render material 名稱與 alias 自動配對 preset |
| `SetMaterialPresetIndex(Slot, Preset)` | 變更一個 slot 的 preset index |
| `SetMaterialPresetForAllSlots(Preset)` | 對所有 slot 套用同一 preset |
| `SetUpdateType(Type)` | 變更 native object update policy |
| `GetResolvedMeshLodIndex()` | 回傳實際上傳的 LOD index |
| `GetUploadedTriangleCount()` | 回傳上次上傳的 triangle 數量 |
| `IsRegistered()` | 回傳 native object 與 mesh 是否都有效 |

## 聲學材質與 Transmission

預設 library 位於 plugin 的
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset`，目前包含與 Unity/Web SDK
相同的 22 種 material table。

在 Content Browser 的
`Sounds > SoundTracing > SoundTracing Material Preset Library` 中建立 custom library。
新 asset 會複製目前的預設 library。在 Project Settings 的 `Material Preset Library` 中選擇
後重新啟動 Editor。

每個 preset 包含：

- Display name 與 render material name alias
- Scattering `0..1`
- 8-band Reflection、Absorption、Transmission `0..1`
- Transmission Model
- `Solid Distance` 使用的 8-band `Thickness to -30 dB (m)`

頻帶中心為 `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000 Hz`。
可在 Editor band graph 上點擊或拖曳來編輯。

### Transmission Model

| 模型 | 輸入 | Geometry 條件 |
|---|---|---|
| `Surface` | 穿過一次表面後剩餘的各頻帶 energy coefficient `0..1` | 可用於開放面與薄 surface |
| `Solid Distance` | 透射 energy 衰減至 `-30 dB` 時的各頻帶參考距離 (m) | 需要封閉 volume 與一致的 face 方向 |

`Solid Distance` 不是 object 的實際厚度。Runtime 會測量 ray 在 geometry 內經過的實際距離，
再依參考距離衰減。`0` 會完全阻擋該 band。

`ImportFromJson`、`ExportToJson`、`ResetToBundledJson` 使用 Unity/Web 共用的
`soundMaterial.json` 格式。沒有 `transmissionDistanceToMinus30DbMeters` 表示 `Surface`；
存在 8 個有效值表示 `Solid Distance`。

## SoundTracingPathVisualizerComponent

在 Actor 上新增 `SoundTracingPathVisualizerComponent`，可用 Niagara line segment 顯示
最近一次 propagation frame。

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Visualization Enabled` | 開啟 | 是否顯示 path |
| `Refresh Interval Ms` | `50` | 視覺化最小更新間隔，不影響 propagation |
| `Max Visualized Paths` | `1024` | 最大顯示 path 數，範圍 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 強度，範圍 `0.01..2.0` |
| `Niagara System` | 空 | 空時使用 plugin 預設 Niagara system |

顏色為 Direct=red、Reflection=orange、Diffraction=green、Transmission=cyan、
Reverb=purple。用 `SetVisualizationEnabled(bool)` 控制 runtime 顯示，用
`GetActivePathCount()` 讀取目前 path 數。Shipping 效能測試時應停用。

## SoundTracingSubsystem

`SoundTracingSubsystem` 是對應 Unity Manager runtime panel 的 `WorldSubsystem`，向
Blueprint 提供：

| 方法 | 行為 |
|---|---|
| `IsNativeRuntimeReady()` | Library、native init、scene、listener 是否就緒 |
| `IsGpuPropagationActive()` | 是否實際取得 GPU device |
| `GetGpuBackendStatus()` | 回傳 `GPU active`、`CPU` 或 `CPU fallback (...)` |
| `GetLastValidPathCount()` | 最近 propagation frame 的 valid path 數 |
| `GetLastNativeError()` | Control thread 最近 native error；無錯誤時為空字串 |
| `GetNativeVersion()` | Native version `major.minor.revision` |
| `GetRegisteredObjectCount()` | 目前 World 註冊的 object 數 |
| `GetActiveListenerSettings()` | Native listener 目前實際使用的設定 |
| `ResetMotionState()` | 清除 Listener 與 source motion history |
| `RequestPropagationFrame()` | 在正常週期外要求 propagation frame |

## GPU 後端

啟用 `Use GPU Backend` 並重新啟動 Editor 後，透過 `exaPropagatorInitGpu` 要求
Dawn/WebGPU backend。

- 初始化成功：`GPU active`
- Native build 不含 GPU add-on：`CPU fallback (this exaSound build has no GPU backend)`
- Adapter/device 初始化失敗：包含原因的 `CPU fallback (...)`
- 未要求 GPU：`CPU`

Win64 散佈必須把與 `exaSound.dll` 位於相同 artifact directory 的 `webgpu_dawn.dll` 一起
stage。Plugin Build.cs 會將該目錄的 DLL 註冊為 runtime dependency。

可透過 Blueprint 的 `GetGpuBackendStatus()` 或以下 console command 檢查實際狀態：

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` 輸出 native version、ready 狀態、backend、object/path 數與 Listener
profile。`SoundTracing.DumpGpuPropagationStats` 輸出 GPU dispatch、ready、CPU fallback
counter。

## 座標系

使用 Plugin component 時不必手動轉換座標。0.2.0 將 Unreal 座標以下列方式傳給 STCoreV2：

```text
position / vertex / velocity = (UE.Y, UE.Z, UE.X) × 0.01 m
sceneRatio = 1
listener basis: right=(1,0,0), up=(0,1,0), forward=(0,0,-1)
```

Listener basis 遵循 ADR-0001，修正了舊版 HRTF 前後反轉的問題。只有 custom native
integration 才需要自行套用此 contract。

## 範例專案

目前 SDK source project 的 `Content/FirstPerson/Test.umap` 可用來查看
`SoundTracingObjectComponent` 的 geometry、BVH 與 material slot 設定。該 map 位於 host
project 的 Content，只複製 `Plugins/SoundTracing` 時不會包含。

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| `STCoreV2 export table is incomplete` | 將 Plugin 0.2.0 與 STCoreV2 v0.7 ABI 4 binary 一起部署，刪除 ABI 3 DLL |
| Audio 清單中沒有 Plugin | Plugin enable、C++ module 編譯、target Audio 設定、Editor 重啟 |
| Native library 載入失敗 | 對應 target 的 `ThirdParty/STCoreV2` runtime/link artifact 與 package staging |
| Source 沒有空間化 | 全域 Spatialization/Source Data Override、source Spatialization、SoundTracing settings asset |
| Source 停留在原點 | 確認 0.2.0 module 與 binary 一起部署；0.2.0 每個 audio block 讀取 spatialization params |
| Listener 位置錯誤 | `Drive Listener Transform`；關閉時使用 Unreal audio-device listener |
| Listener 取代警告 | 每個 World 只保留一個 active `SoundTracingListenerComponent` |
| Geometry 不生效 | Object Component 是否為支援 mesh 的 immediate child，是否有 render data 與 triangle |
| Skinned animation 不生效 | `Update Type = Refit`、`Sync Skinned Vertices On Tick = true`、固定 LOD 與 vertex count |
| GPU fallback 到 CPU | `webgpu_dawn.dll`、支援 GPU 的 native build、adapter/device、Output Log、`SoundTracing.DumpGpuPropagationStats` |
| 看不到 Path | Niagara plugin、Visualizer enable、max path 數、Source/Listener path enable |
| Teleport 後 pitch 跳變 | 移動後立即呼叫 Listener Component 或 Subsystem 的 `ResetMotionState()` |
| 多 Source 時 dropout | HRTF Path Budget `1`、`Merged4`、較低 quality preset、callback/buffer 設定 |
| Editor 結束時 stack overflow | 使用包含 control-thread shutdown fix 的最終 0.2.0 plugin |

## 下一步

- [SDK 概覽](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
