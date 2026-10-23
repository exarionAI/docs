---
title: Unreal Engine
description: SoundTracing UE5 外掛 0.4.0（SimpleST 2.18.2 / ABI 6）的安裝、Project Settings、聆聽者／音源／物件元件、單次音效、Native/FMOD/Wwise 整合模式、平台連結契約。
---

# SoundTrace SDK for Unreal Engine

SoundTracing UE5 外掛透過 Unreal Audio Mixer 的 Spatialization 外掛 + Submix，以及 Actor Component
連接 [SimpleST](../core/simplest.md)。自 0.3.0 起，引擎從 STCoreV2 換成 SimpleST，0.4.0 使用
**SimpleST 2.18.2 / ABI 6**（前一版本：0.3.0 = SimpleST 2.12.0）。
SDK 發行版 2.18.2-jhj.4 中外掛版本維持不變，加入了 `Max Sources` 設定、FMOD/Wwise 模式的 Sound Tracing
開關傳遞，以及射線取樣器的整理。
若專案中有 FMOD 或 Wwise 外掛，同一份原始碼會以掛接到該中介軟體 SimpleST 外掛的 **整合模式** 建置。

## 目前狀態

| 項目 | 內容 |
|---|---|
| Engine | Unreal Engine 5.6（已於 5.7 驗證） |
| Plugin | `Plugins/SoundTracing` 0.4.0（`SoundTracing` 執行階段 + `SoundTracingEditor` 模組，相依 Niagara） |
| 支援平台 | Win64、Mac、Linux、Android、IOS |
| 發布 | `SoundTracing-release.zip`（外掛 + 獨立 Python 安裝程式） |
| 引擎二進位檔 | `ThirdParty/SimpleST/Binaries/<Plat>/<Config>/` — 只有 UE Debug 使用 SDK Debug，其餘使用 Release |
| Demo scene | 文件用 placeholder 3 個。尚未包含發布 scene |

## 安裝

在有 Python 3.9+ 的環境執行安裝程式。它會將所有包含的平台安裝到專案的 `Plugins/SoundTracing`，
並將既有外掛保存在 `.simplest-backups/`。不會修改專案設定。

```bash
python3 install.py /path/to/Game.uproject
python3 install.py /path/to/Game.uproject --dry-run
```

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/           Niagara 路徑視覺化、Material Preset Library
      ├─ Source/            SoundTracing · SoundTracingEditor
      └─ ThirdParty/SimpleST/
         ├─ Include/SimpleST/ABI/
         ├─ Binaries/<Plat>/<Config>/
         └─ Resources/HRTF/
```

安裝後在 `.uproject` 中啟用 `SoundTracing` plugin，並重新啟動 editor 完成 module compile。
安裝內容只包含 UE 包裝層原始碼、資產、公開 C ABI 標頭、各平台引擎二進位檔、HRTF 與授權。

## 整合模式 — Native / FMOD / Wwise

![整合模式選擇](/img/ue/integration-mode.png)

`SoundTracing.Build.cs` 會依 `.uproject` 中啟用的外掛選擇整合方式
（依 `Wwise` → `FMODStudio` → Native 的順序，可用環境變數
`SOUNDTRACING_UNREAL_INTEGRATION=native|fmod|wwise` 強制指定）。元件在三種模式下的名稱與用法相同。

| | Native | FMOD | Wwise |
|---|---|---|---|
| SimpleST 上下文與渲染 | SoundTracing（UE Audio Mixer Spatialization + Submix） | `SimpleSTFmod`（Source/Listener DSP） | `SimpleSTWwise`（Sound-tracing Renderer） |
| SoundTracing 負責的工作 | 全部 | 只有幾何體、材質、視覺化、統計 | 相同（`sceneRatio = 0.01`，通知 Unreal 軸） |
| 聆聽者 | UE 聆聽者 / `ListenerComponent` | FMOD 聆聽者 0 | Wwise 聆聽者 |
| 引擎 DLL 位置 | `ThirdParty/SimpleST/Binaries` | `FMODStudio/Binaries/<Plat>/` | `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` |

在 FMOD 與 Wwise 模式下，`ListenerComponent` 的輸出設定（HRTF、輸出模式）與 Source Settings 資產
不會被使用 — 由中介軟體外掛的參數承擔這個角色。

### FMOD 模式安裝

```bash
python3 install.py /path/to/Game.uproject --fmod <fmod/plugins 資料夾>
```

`--fmod` 會將 `SimpleSTFmod`、`SimpleSTRealtime`、HRTF 複製到 `Plugins/FMODStudio/Binaries/<Plat>/`，
並在 `Config/DefaultEngine.ini` 加入 `+PluginFiles=SimpleSTFmod`（= Project Settings › FMOD Studio ›
Plugin Files）。之後在 FMOD Studio 中於主匯流排放入 SimpleST Listener，在 3D 事件的主軌放入
SimpleST Source — [FMOD 外掛](./fmod.md)。

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

### Wwise 模式安裝

```bash
python3 install.py /path/to/Game.uproject --wwise <wwise/SDK 資料夾>
```

SoundTracing 在模組啟動時取得外掛，設定 `sceneRatio = 0.01`（Wwise Unreal 單位 = cm），
並以 `SimpleSTWwise_SetWorldAxes(UNREAL)` 通知 Unreal 軸（+Z 向上）。這是因為 Wwise for Unreal 2024.1+
傳遞位置時不做軸轉換 — [Wwise 外掛](./wwise.md)。

![UE Wwise 安裝結果](/img/wwise/ue-install.png)

## Unreal Audio 設定（Native 模式）

在各 target platform 的 Audio 設定中選擇下列 plugin。

![Audio 外掛設定](/img/ue/audio-plugin-settings.png)

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

Audio Mixer Sample Rate 可為任意值。SimpleST 以 44.1 kHz 運行並轉換為裝置取樣率
（若為 44.1 kHz 則略過轉換）。

## Project Settings › Plugins › SoundTracing

![Project Settings](/img/ue/project-settings.png)

| 分類 | 項目 | 預設值 | 說明 |
|---|---|---:|---|
| Runtime | `Max Compute Threads` | `0` | SimpleST 計算執行緒上限。0 = auto（min(效能核心數, 6)）。需要重新啟動 |
| Runtime | `Prefer Performance Cores` | `true` | 將傳播 lane 與計算池固定在效能核心（關閉 Windows 11 EcoQoS）。混合架構 CPU 建議開啟 |
| Runtime | `Render Mode` | `Buffered` | `Buffered`（SimpleST 渲染執行緒填滿環形緩衝區，回呼只複製，≈3 個區塊延遲）/ `In Callback`（在 Unreal 音訊回呼內渲染，最低延遲） |
| Runtime | `Max Sources` | `0` | 進階。同時存活的引擎音源數上限。0 = 引擎平台預設（桌面 128，Android/iOS 48）。超出的音源會被引擎拒絕（`ST_STATUS_BUDGET_EXCEEDED`，顯示於記錄），元件回退到 dry 路徑。在由 SoundTracing 建立上下文的 Native 模式中於建立時套用（需要重新啟動）。FMOD/Wwise 模式依照外掛設定 — [音源記憶體預算](../core/simplest.md#音源記憶體預算) |
| Runtime | `Max Delay Seconds` | `0` | 進階。逐音源延遲環的上限。0 = 引擎平台預設（桌面 2 s，Android/iOS 1 s）。環只會依路徑所需增長 |
| Runtime | `Dry Fallback When Unavailable` | `true` | 執行階段不存在或失敗時，音源以 dry 播放而非靜音 |
| Runtime | `Output Submix Parent` | 空白 | 空間化輸出 Submix 的父項 |
| Propagation | `Reflection Update Interval (ms)` | `33` | 反射／繞射 lane 的最小週期。佔傳播成本的大部分，要省回 CPU 就提高這裡。0 = 不限制 |
| Propagation | `Direct Update Interval (ms)` / `Reverb Update Interval (ms)` | `10` / `4` | direct、reverb lane 的最小週期 |
| Propagation | `Acceleration Structure` | `TinyBVH` | BinnedSAH / HybridKD / TinyBVH / LBVH / LBVH SIMD |
| Propagation | `Static Rebuild Delay Seconds` | `0.1` | 將靜態幾何體變更併入靜態加速結構前的等待時間（關卡串流批次） |
| Listener | `Default Listener Settings` | — | 下方的聆聽者設定結構 |
| Sources | `Source Ray Resolution Cap` / `Source Ray Depth Cap` | `0` / `0` | 所有音源資產的 transport ray 格網與深度上限。0 = 依資產值 |
| Materials | `Material Preset Library` | 空白 | 啟動時註冊到 SimpleST 的程式庫。空白時使用外掛隨附的程式庫 |

## 聆聽者設定（`FSoundTracingListenerSettings`）

![聆聽者設定](/img/ue/listener-settings.png)

專案預設值放在 Project Settings，逐關卡的 override 放在 `USoundTracingListenerComponent`。

| 分類 | 項目 | 預設值 | 選項 / 說明 |
|---|---|---:|---|
| Quality Preset | `Quality Preset` | `Balanced` | `Custom`（保留欄位）/ `Fast`（12×12，深度 4）/ `Balanced`（16×16，深度 8 = 引擎預設）/ `Quality`（24×24，深度 8） |
| Listener Rays | `Ray Resolution` / `Ray Depth` | `16` / `8` | guide ray N×N（`4..64`）、反射最大階數（`1..16`）。只有 Custom 時可編輯 |
| Listener Rays | `Ray Sampling` | `FibonacciSphere` | 僅 `FibonacciSphere`。SimpleST 2.18 只接受 Fibonacci，因此其餘 4 種（LegacyGrid / EqualAreaGrid / SobolSphere / Icosahedral）已在編輯器中隱藏，已儲存的值會改送 FibonacciSphere 並留下一次警告 |
| Output | `Output Mode` | `Headphones` | `Headphones`（雙耳 HRIR）/ `Speakers (HOA decode)` / `Stereo Panning` |
| Output | `HRTF Dataset` | `SADIE II D2 KEMAR` | SADIE II D2（8,802 個方向 · 256 tap，外掛隨附）/ MIT KEMAR（128 tap，引擎內建） |
| Output | `Speaker Layout` | `Stereo 2.0` | Stereo 2.0 / Laptop Stereo 2.0 / 2.1 / 4.1 / 5.1 / 7.1 |
| Output | `Early Reflections` | `Hybrid Ambisonic Bed` | 僅限 Headphones 與 Stereo Panning。`Objects` 用於基準聆聽 — 8 音源廳堂中區塊 16.8 ms（上限 11.6 ms），Hybrid 2.4 ms |
| Render | `Doppler` / `Doppler Gain` | `true` / `Off` | 可變延遲音高 / 移動單極子輻射增益 |
| Render | `Late Reverb` / `Late Reverb Coupling` | `true` / `Default` | FDN16 / Off · Subtle 6 dB · Default 9 dB · Strong 12 dB |
| Render | `Path Fade Time Seconds` | `0.05` | 路徑出現／消失的交叉淡化 |
| Render | `Limiter` | `Off` | Off / Envelope / LookaheadPeak / True Peak。`True Peak`（0.4.0）為 SimpleST 2.18 true-peak 限幅器（−1 dBTP，137 樣本延遲）。引擎 2.18 在建立後會立即啟用限幅器，但外掛預設為 `Off`，由 Unreal 主輸出鏈負責限幅。0.4.0 修正為在揚聲器輸出（`Speakers`）時也會套用 `Off` |
| Render | `Output EQ Enabled` / `Output EQ Gains Db` | `false` | 63 ~ 16k Hz 9 頻段 ±24 dB |
| Paths | `Enable Direct/Transmission/Reflection/Diffraction/Reverb Path` | 全部 `true` | 全域路徑閘門 |
| Acoustics | `Propagation Delay` / `Direct Occlusion` | `true` / `true` | 關閉時分別為：所有路徑重疊在直達音時刻 / 直達音穿過幾何體 |
| Acoustics | `Reference Distance Meters` / `Min Distance Meters` | `1.0` / `1.0` | 物理 `1/r` 衰減的起始距離 / 近距離箝制 |
| Air Absorption | `Air Absorption Enabled`、`Temperature Celsius`、`Relative Humidity Percent`、`Pressure Pa` | `true`、`20`、`50`、`101325` | ISO 9613-1。音速由溫度推導 |

### `USoundTracingListenerComponent`

選用元件。即使沒有，外掛也會以專案預設聆聽者設定與音訊裝置聆聽者的 transform 運作。
附加到 Pawn 或相機以提供逐關卡 override，或直接提供 transform。

| 項目 | 說明 |
|---|---|
| `Override Project Listener Settings` / `Listener Settings` | 以上述結構覆寫專案預設值 |
| `Drive Listener Transform` | 將此元件的 world transform 與速度傳給 SimpleST，取代音訊裝置聆聽者 |
| `ApplyListenerSettings()`、`SetQualityPreset()`、`SetHrtfDataset()`、`SetOutputMode()`、`SetSpeakerLayout()` | 從 Blueprint 在執行期變更 |
| `ResetMotionState()` | 防止瞬移與重生後的 Doppler 尖峰 |

## 音源設定資產（`USoundTracingSourceSettings`）

![Source Settings 資產](/img/ue/source-settings-asset.png)

在 Content Browser 建立 `SoundTracing Source Settings` 資產，並連接到 Audio Component 或 Sound
Attenuation 的 spatialization plugin settings。請依用途把共用資產當作 preset 使用。

| preset 資產 | 用途 |
|---|---|
| `ST_Source_Fast` | 大量同時音源、背景 source |
| `ST_Source_Balanced` | 一般 gameplay source |
| `ST_Source_Quality` | 主角音源、品質優先的 demo |

| 分類 | 項目 | 預設值 | 說明 |
|---|---|---:|---|
| Attenuation | `Preserve Unreal Attenuation` | `false` | 開啟時保留 Unreal 的距離衰減（通常關閉 — 由 SimpleST 進行物理衰減） |
| Attenuation | `Disable Unreal Reverb Sends` | `false` | 阻斷 Unreal 的 reverb send |
| Emission | `Gain Boost Db` | `0` | 輸入位準（±24 dB） |
| Emission | `Direct/Reflection/Diffraction/Reverb Send Db` | `0` | SimpleST path volume |
| Emission | `Directivity` | `0` | 0 全指向 ~ 1 心形 |
| Reverb Rays | `Ray Preset` | `Balanced` | `Fast`（8×4，深度 3）/ `Balanced`（16×8，深度 4 = 引擎預設）/ `Quality`（24×12，深度 6）/ `Custom` |
| Reverb Rays | `Ray Resolution` / `Ray Depth` | `16` / `4` | N×N/2 transport ray、深度。只有 Custom 時可編輯 |
| Reverb Rays | `Transport Refresh Steps` | `0` | 將傳輸格網分成 n 次傳播更新（0 = 引擎預設） |
| Reverb Rays | `Stationary Emitter` | `false` | 不移動的 emitter 提示 |
| Per-Path Enable | `Direct/Transmission/Reflection/Diffraction/Reverb Path Enabled` | 全部 `true` | 逐音源路徑閘門 |
| Bypass | `Bypass` | `false` | 不經過 SimpleST 直通 |

## 單次音效

引擎會讓 **新音源** 的所有路徑在 150 ms 內淡入並等待第一個 IR，因此若每次槍聲、腳步聲都新建引擎
音源，短槍聲聽起來會小而且延遲。外掛依模式處理這個問題。

- **Native 模式**：在上下文啟動時預先建立引擎音源池，voice 結束後將該音源歸還到池中，由最近的下一個
  voice 接手。即使每一發都重新播放 Audio Component 或聲音，也不會新建引擎音源。
- **FMOD / Wwise 模式**：渲染由中介軟體外掛負責，因此依照其預熱音源池（FMOD 0.3.0 · Wwise 0.2.0）運作
  — [FMOD](./fmod.md#單次音效與預熱音源池) · [Wwise](./wwise.md#單次音效與預熱音源池)。像 **Wwise AudioLink**
  這樣每個聲音都註冊新 game object 的情況也能處理。

## 幾何體（`USoundTracingObjectComponent`）

![Object Component](/img/ue/object-component.png)

作為要用於聲學 geometry 的 `StaticMeshComponent` 或 `SkinnedMeshComponent` 的 **直接子項** 加入。
使用相同網格資產、LOD 與材質配置的物件會共用一個 SimpleST 網格。

| 項目 | 預設值 | 說明 |
|---|---:|---|
| `Acoustic Mobility` | `Auto` | `Auto`（跟隨父項 Mobility）/ `Static`（靜態加速結構，移動時重建）/ `Movable`（動態實例，每個傳播週期套用變換） |
| `Sound Material Slots` | — | 渲染材質插槽 → `Sound Material Type`（preset index）。`Auto Set Materials` 按鈕依名稱與別名自動配置 |
| `Skinned Pose Refresh Seconds` | `0` | 僅限蒙皮父項。SimpleST 沒有 vertex refit，因此每隔此週期 **建置新網格** 並替換。0 = 保留註冊時的姿態 |
| `Auto Register Native Object` / `Sync Transform On Tick` / `Auto Sync Materials` | `true` | 進階 |
| Debug: `Visualize Acoustic Mesh`、`Visualize BVH`（+ `BVH Depth`、`BVH Leaves Only`） | 關 | 選取時在編輯器中顯示上傳的三角形與加速結構節點方框 |

專用伺服器會略過註冊。可從 Blueprint 呼叫 `RegisterNativeObject`、`UnregisterNativeObject`、
`SyncNativeTransform`、`RefreshNativeMesh` 與材質插槽的 get/set。

## Material preset

外掛 content 中的 `SoundTraceMaterialPresetLibrary` 提供 SoundTrace 遊戲材質 22 種的 9 頻段 preset，
名稱、順序（索引 0 `Concrete` ~ 21 `FiberglassReinforcedPlastic`）與 9 頻段數值都與 Unity、Web SDK 相同。
這些是遊戲用預設，並非量測資料。轉換方式：保留原 8 頻段的反射 R 與穿透 T，吸收 A = 1 − R − T，16 kHz
頻段重複 8 kHz 的值。舊 STCoreV2 材質庫與 `soundMaterial.json` 在載入時（包括 `Import From JSON`）也依
相同規則轉換，請重新儲存轉換後的資產。
`Sound Material Slots` 依 render material 名稱與 alias 選擇最接近的 preset。直接編輯 9 頻段
reflection、absorption、transmission、scattering 的工作，請限制在另行建立 Material Preset Library
資產的情況。每個頻段都必須滿足 `R + A + T = 1`（±0.001）。

## Path visualization

![Path Visualizer](/img/ue/path-visualizer.png)

在 Actor 上加入 `SoundTracingPathVisualizerComponent` 即可顯示以 Niagara 為基礎的 path segment。
可調整各路徑種類（Direct、Reflection、Diffraction、Reverb、Transmission、GuideRay）的顏色、最大路徑數、
線寬與 alpha。僅供偵錯與示範，shipping 效能量測中請停用。

## 統計（`USoundTracingSubsystem`）

可從 Blueprint 讀取的 World Subsystem — 整合模式、場景網格／物件／音源／三角形數、
有效路徑數、各 lane 的傳播／IR／渲染時間（ms）、渲染區塊統計（active sources、exact/send taps）。

以 `SetSoundTracingEnabled(bool)` / `IsSoundTracingEnabled()` 整體開啟或關閉 Sound Tracing。關閉期間，
即使聆聽者或音源移動也不會喚醒傳播 lane，也不會收集視覺化路徑，因此不會殘留最後的路徑。
在 FMOD 與 Wwise 模式中，從 SDK 發行版 2.18.2-jhj.4 起會將此開關傳給中介軟體外掛
（`SimpleSTFmod_SetSoundTracingEnabled` / `SimpleSTWwise_SetSoundTracingEnabled`）。在此之前，因為是外掛擁有的
上下文，關閉沒有效果。掛接到新的執行階段後也會再次送出關閉狀態，若是沒有此 export 的舊版
外掛則會留下警告。SimpleST 沒有傳播暫停功能，因此只要還有音源，lane 就會依自身週期
持續運轉。

## 平台連結契約

| UE 平台 | SDK 路徑（`Binaries/` 之下） | 連結 |
|---|---|---|
| Win64 | `Win64/<Config>/SimpleSTRealtime.dll` | 執行期 export 綁定 |
| Mac | `Mac/<Config>/libSimpleSTRealtime.dylib` | Universal，執行期綁定 |
| Linux | `Linux/<Config>/libSimpleSTRealtime.so` | x86_64，執行期綁定 |
| Android | `Android/<ABI>/<Config>/libSimpleSTRealtime.so` | 以 UPL 複製到 APK 各 ABI 資料夾。HRTF 從 UFS 解出 |
| IOS | `IOS/device` 或 `IOS/simulator` 之下的 `<Config>/libsimplest_static.a` | 靜態連結，直接函式指標綁定 |

只有 UE Debug 使用 SDK Debug，Development/DebugGame/Shipping 使用 Release。
缺少時會在 UBT 階段出錯。在中介軟體外掛以靜態連結的 iOS 與 Web 上，FMOD/Wwise 模式
尚未支援（桌機 Win64 已驗證，Mac/Linux 為相同的程式碼路徑）。

## Demo scene placeholder

目前的 SDK checkout 尚未包含下列三個文件用 demo scene。待實際資產加入後，
會依 Unity 文件相同的模式連結。

### SampleScene01 — Basic Room

:::note Placeholder
用來說明基本 source、listener、static room geometry、material preset、direct/reflection path 的 scene。
:::

### SampleScene02 — Material and Dynamic Door

:::note Placeholder
用來說明 shared source preset、material 變更、Movable door 遮蔽、Buffered/In Callback 渲染模式比較的 scene。
:::

### SampleScene03 — Multiroom

:::note Placeholder
用來說明多個 source、room 之間移動、diffraction/transmission、HRTF 方向感、late reverb coupling 的 scene。
:::

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| plugin 不在選擇清單中 | plugin enable、module compile、target platform 的 Audio 設定 |
| native library 載入失敗 | `ThirdParty/SimpleST/Binaries` 中各 target 的 binary、Config（Debug/Release）是否相符 |
| 整合模式與預期不同 | `.uproject` 中 Wwise/FMODStudio 外掛的啟用狀態、`SOUNDTRACING_UNREAL_INTEGRATION` |
| FMOD/Wwise 模式下聲音沒有空間化 | FMOD Studio / Wwise 專案端的 SimpleST DSP 設定、執行階段 READY 狀態（Output Log） |
| source 沒有空間化（Native） | Audio Component 是否連接了 SoundTracing Source Settings 資產 |
| geometry 沒有反映 | Object Component 的 immediate parent 是否為支援的 mesh component、`Acoustic Mobility` |
| 渲染區塊超時（音訊中斷） | `Early Reflections = Hybrid`、提高 `Reflection Update Interval`、降低 Quality Preset |
| 槍聲、腳步聲聽起來小或延遲（FMOD/Wwise 模式） | 是否為 FMOD 外掛 0.3.0 / Wwise 外掛 0.2.0 以上、是否設定了 `SIMPLESTFMOD_WARM_SOURCES=0` |
| 部分音源以 dry 播放（Native） | Output Log 中的 `ST_STATUS_BUDGET_EXCEEDED` — 減少音源或提高 `Max Sources` |
| 在 FMOD/Wwise 模式中關閉 Sound Tracing 仍沒有變化 | 外掛是否為 export `*_SetSoundTracingEnabled` 的版本（沒有時 Output Log 會出現警告） |
| 看不到 path | visualizer component、Niagara plugin、path enable 狀態、Sound Tracing 是否處於關閉狀態 |

## 下一篇

- [FMOD 外掛](./fmod.md) · [Wwise 外掛](./wwise.md)
- [Unity SDK](./unity.md) · [Web SDK](./web.md)
- [SimpleST](../core/simplest.md)
