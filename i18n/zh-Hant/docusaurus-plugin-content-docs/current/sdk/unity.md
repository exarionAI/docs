---
title: Unity
description: SoundTrace Unity SDK 0.4.0（SimpleST 2.18.2 / ABI 6）的安裝、元件 Inspector 契約、HRTF 與輸出、材質、FMOD/Wwise 整合模式、WebGL。
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK 是將 Unity 的網格、Renderer 材質插槽、音源與聆聽者連接到
[SimpleST](../core/simplest.md) 的即時空間聲學外掛。自 0.3.0 起，引擎從 STCoreV2 換成 SimpleST，
0.4.0 使用 **SimpleST 2.18.2 / ABI 6**（前一版本：0.3.0 = SimpleST 2.12.0）。渲染器以 **Hybrid** 啟動。SDK 發行版 2.18.2-jhj.3 中套件版本維持不變，
加入了[音源數上限](#音源數上限)與 Android 最低 API 28。
`SoundTraceManager`、`SoundTraceListener`、`SoundTraceSource`、`SoundTraceObject`、
`SoundTracePathVisualizer` 的元件名稱、指令碼 GUID 與範例場景維持不變。

## 需求與平台

| 項目 | 目前套件基準 |
|---|---|
| Unity | 2022.3 LTS 以上（已於 2022.3.62f2 · 6000.3 驗證） |
| 套件 | `SoundTrace-SimpleST-release.unitypackage` → `Assets/SoundTrace` |
| 隨附原生外掛 | Windows x64 · macOS Universal · Linux x86_64 · Android（ARMv7/ARM64/x86_64，API 28+ — 引擎 `.so` 直接連結 `libaaudio`，因此在建置階段檢查）· iOS 15+（device/simulator XCFramework）· WebGL |
| WebGL | 支援 — 獨立的 pthread WASM + AudioWorklet 路徑（不使用 `OnAudioFilterRead`） |
| GPU | 無。`SoundTraceManager.IsGpuPropagate` 永遠為 `false` |

## 安裝

1. 不需要關閉目標專案的 Unity。在 `Assets > Import Package > Custom Package` 選擇
   `.unitypackage`，即安裝到 `Assets/SoundTrace`。
2. 若已有以 STCoreV2 為基礎的舊版 `Assets/SoundTrace`，請 **先備份到 Assets 之外** 再匯入，
   以免舊的原生外掛一併被載入。同一 SimpleST 套件的更新會保留 GUID，可直接覆寫。
3. 也可以用發布資料夾的 `install.py` 自動安裝。它會檢查檔案雜湊與 GUID，並將既有安裝保存在
   專案的 `.simplest-backups`。

```bash
python3 install.py /path/to/UnityProject
# 連同 FMOD / Wwise 外掛一起安裝：--fmod <plugins 資料夾> 或 --wwise <plugins 資料夾>
```

範例請在 Package Manager 選擇 SoundTrace SDK 後，透過 `Samples > Demo Assets > Import` 匯入。
範例 UI 只有在存在 `com.unity.ugui` 時才會編譯。

## Unity Audio 設定

1. 開啟 `Edit > Project Settings > Audio`。
2. 將 `Default Speaker Mode` 設為 `Stereo`。
3. 將 `DSP Buffer Size` 設為 `Best latency`。

![Unity Audio 設定](/img/unity/Image01_AudioSetting.png)

若這些設定不同，Manager 與 Listener Inspector 會顯示警告。輸出取樣率直接使用裝置的值
（SimpleST 與內部 44.1 kHz 之間自行轉換）；裝置取樣率改變時，會以相同設定重建原生狀態。

## Audio Asset Import 設定

以使用單聲道音源為前提，音訊剪輯設為 PCM 格式。WebGL 需要 `Decompress On Load`。

![Audio Asset Import 設定](/img/unity/ImportSetting.png)

## 最快設定

1. 在空的 GameObject 上加入 `SoundTraceManager`。
2. 在帶有 `AudioListener` 的 Main Camera 上加入 `SoundTraceListener`。
3. 在音源 GameObject 上加入 `SoundTraceSource`，並為同一 GameObject 上的 `AudioSource` 指定 clip。
4. 在要作為聲學 geometry 的 Mesh GameObject 上加入 `SoundTraceObject`。
5. 如有需要，在與 Manager 相同的 GameObject 上加入 `SoundTracePathVisualizer`。
6. 在 Play Mode 中檢查 Console 錯誤、聲音與 path。

在所有同時載入的 scene 中，啟用中的 Manager 與 Path Visualizer 各只能有一個。
每個 SimpleST 上下文只有一個聆聽者，由第一個註冊的 `PrimaryListener` 進行渲染。

## 元件概覽

| 元件 | 作用 | 必要相依性 |
|---|---|---|
| `SoundTraceManager` | 執行階段（上下文、控制執行緒）、scene、材質註冊、傳播 | 每個執行階段 1 個 |
| `SoundTraceListener` | Listener transform、ray 品質、輸出/HRTF、延遲與淡化 | 啟用中的 Manager、`AudioListener` |
| `SoundTraceSource` | 將 `AudioSource` 輸出作為單聲道串流輸入，逐 path 設定 | 同一 GameObject 上的 `AudioSource`、啟用中的 Listener |
| `SoundTraceObject` | 將 Mesh 與 submesh 材質註冊到聲學 scene | `MeshFilter`、`MeshRenderer`（Read/Write Enabled） |
| `SoundTracePathVisualizer` | 偵錯顯示有效 path 與 hit triangle | 與 Manager 相同的 GameObject |

## 音訊流程與執行緒

- `SoundTraceSource.OnAudioFilterRead` 將輸入放進 **單聲道主機串流**（`st_rt_source_write_stream`），
  並清除 Unity 的 dry 輸出。`SoundTraceListener` 的回呼一次取回整個空間聲學混音
  （`st_rt_render_process`，Buffered 模式）。
- 場景變更、音源建立／刪除、傳播、視覺化快照都在專用的 **control thread**（`SoundTraceControlThread`）
  上序列處理。音訊回呼中不會有場景控制 API 或受控堆積配置。
- 位置以固定步長的動作取樣（`SoundTraceFixedStepMotion`）估計速度。瞬移之後以
  `ResetMotionState()` 防止 Doppler 尖峰。
- 每次啟動渲染時（包含重新啟動與切換 HRTF），都會明確指定 Hybrid（`reserved0 = 1`）與 **關閉引擎限幅器**，
  並將主增益維持在 0 dB。限幅由 Unity 混音器負責 — SimpleST 2.18 在建立後會立即啟用 true-peak
  限幅器（137 樣本延遲），因此由包裝層將其關閉。渲染選項只會在引擎建立時與揚聲器配置變更時以預設
  重新套用，`render_start` 會維持原樣。

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| 欄位 | 預設值 | 行為 |
|---|---:|---|
| `Propagate On Start` | `true` | 在 `Start()` 中同步初始 scene graph 與 transform，然後要求第一次傳播。 |
| `Load Default Materials On Enable` | `true` | 在 `OnEnable()` 中將隨附的 Material Preset Library（SoundTrace 遊戲材質 22 種）註冊到原生材質表。 |
| `Propagation Thread Count` | `-1` | SimpleST 計算池寬度（`maxComputeThreads`）。`-1` 為自動（以邏輯執行緒數為基準，引擎調整為 min(效能核心數, 6)），`0`/`1` 為單執行緒，`2` 以上為指定數。在原生初始化之前套用。 |

### 公開屬性

| 屬性 | 型別 | 意義 |
|---|---|---|
| `Instance` | `static SoundTraceManager` | 單例 Manager。不存在時為 `null` |
| `Scene` | `SoundScene` | Manager 擁有的低階 scene |
| `PrimaryListener` / `ListenerCount` / `SourceCount` / `ObjectCount` | — | 註冊狀態 |
| `DefaultMaterialsLoaded` | `int` | 自動註冊的隨附材質數 |
| `LastValidPathCount` | `int` | 最近一次傳播的有效 path 數 |
| `LastNativeError` | `string` | 最近的 scene graph／傳播錯誤 |
| `PropagationThreadCount` | `int` | 套用的計算執行緒數 |
| `IsGpuPropagate` / `GpuBackendStatus` | `bool` / `string` | 相容用途。永遠為 `false` / `"CPU"` |

### 公開方法

| 方法 | 行為 |
|---|---|
| `ResetMotionState()` | 在 teleport、respawn、scene 切換後，立即重設所有 Listener 與 Source 的 motion history。 |

### 音源數上限

`SoundTraceRuntime.MaxSources`（靜態 `uint`，預設 `0`）是同時存活的引擎音源數上限。
`0` 時使用引擎平台預設（桌面 128 · Android/iOS 48 · WebGL 32）。請在第一個 `SoundTraceListener` 啟用
**之前** 設定（透過 `STRT_CreateOptions.maxSources` 傳遞）。超過上限的音源不會擲回例外 —
`SoundSourceCore` 會對 `ST_STATUS_BUDGET_EXCEEDED` 警告一次，並讓該 `AudioSource` 維持 dry。
引擎政策請參考 [SimpleST — 音源記憶體預算](../core/simplest.md#音源記憶體預算)。

```csharp
SoundTraceRuntime.MaxSources = 64;   // 在第一個 Listener 啟用之前
```

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

通常加入 Main Camera。

### Inspector

| 欄位 | 預設值 | 範圍/選項 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`、`Fast`、`Middle`、`Quality` |
| `Ray Resolution` | `16` | `1..32`；聆聽者 guide ray 的橫向與縱向使用相同的值 |
| `Ray Depth` | `4` | `1..16`；反射最大深度 |
| `Output Mode` | `Headset` | `Headset`（雙耳）、`Speaker`（立體聲 panning） |
| `HRTF` | `HRIR Interpolated` | 下列三種模式 |
| `Max Delay Seconds` | `0` | `0..5 s`；逐音源延遲環的上限。`0` = 引擎平台上限（桌面 2 s · Android/iOS 1 s · WebGL 0.5 s）。非 0 時覆寫上限（小於 0.012 s 時為 0.012 s） |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`；路徑出現／消失的交叉淡化 |

`Max Delay Seconds` 預設值在 SDK 發行版 2.18.2-jhj.3 中由 `2` → `0`（引擎政策）。引擎只為每個音源配置
路徑所需長度的延遲環，並僅將此值作為上限。已儲存 `2` 的既有場景會照以前的方式運作。

選擇 `Fast`、`Middle`、`Quality` 時會一併套用 ray 值並在 Inspector 中鎖定。
要直接編輯，請選擇 `Custom`。

| 預設 | Ray Resolution | Ray Depth | 建議起點 |
|---|---:|---:|---|
| `Custom` | 儲存的值 | 儲存的值 | 手動調校 |
| `Fast` | `16` | `4` | 行動裝置、大量音源 |
| `Middle` | `24` | `8` | 一般遊戲與桌機 |
| `Quality` | `32` | `12` | 以聲學為重的應用程式 |

### HRTF 與輸出模式

| 模式 | 需要的資源 | 說明 |
|---|---|---|
| `Band8` | 無 | 不需外部表的輕量模式 — 在 SimpleST 中以 **立體聲 panning** 渲染 |
| `Hrir` | 無 | 引擎內建的 **MIT KEMAR** HRIR |
| `HRIR Interpolated` | 無 | MIT KEMAR HRIR（預設）。SimpleST 執行全頻 HRIR 卷積 |

舊的 `KU100_convolution.bytes` 資源已不再使用。`Output Mode = Speaker` 為 panning 輸出。

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource` 將同一 GameObject 上 `AudioSource` 的輸出以單聲道串流推入引擎。
啟用時會把 `AudioSource.spatialBlend` 與 `AudioSource.dopplerLevel` 設為 `0`，
讓 SoundTrace 負責空間化與 Doppler。

### Inspector

| 欄位 | 預設值 | 行為 |
|---|---:|---|
| `Intensity` | `1` | 音源輻射強度（壓力倍率）。範圍 `0..10` |
| `Reverb Ray Resolution` | `24` | source transport ray 的橫向與縱向解析度。範圍 `1..32` |
| `Reverb Ray Depth` | `4` | transport ray 的最大反射深度。範圍 `1..16` |
| `Enable Direct` / `Reflection` / `Diffraction` / `Reverb` / `Transmission` | `true` | 逐 path 閘門 |
| `Bypass` | `false` | 略過 SoundTrace 渲染，原樣傳遞原始 `AudioSource` 輸出 |

STCoreV2 的逐 path `Distance Attenuation`（0.5 ~ 1.5）、`Max Delay Rate`、`Path Hold Time` 已不存在。
SimpleST 套用物理 `1/r` 衰減與空氣吸收，最大延遲與淡化則是 Listener 的設定。
Scene View 的 `Show Gizmo` 顯示逐 path 的可聽範圍。

### 公開方法

| 方法 | 行為 |
|---|---|
| `SetBypass(bool enabled)` | 為 `true` 時略過 SoundTrace 渲染，傳遞原始輸出。 |
| `ResetMotionState()` | 將目前 Transform 重新設為 motion 基準點，防止 teleport 後的 Doppler spike。 |

要對齊多個 `AudioSource` 的播放時間點時，請以相同的 `AudioSettings.dspTime` 為基準呼叫 `PlayScheduled()`。

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject` 註冊 `MeshFilter.sharedMesh` 與 Renderer 的 submesh 材質插槽。
Build 中需要讀取網格資料，請開啟 Import Settings 的 `Read/Write Enabled`。
程序化網格不要呼叫 `UploadMeshData(true)`。

### Geometry 與加速結構

![在 Scene View 中顯示的 BVH](/img/unity/Img_STObjDome.png)

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`（→ SimpleST HybridKD）、`LBVH`（→ LBVH）、`LBVH_SIMD4/8/16`（→ LBVH_SIMD） |
| `BVH Max Depth` / `Primitives Per Leaf` | `12` / `16` | 相容用途的欄位。**SimpleST 在內部決定 leaf 大小，因此會被忽略** |
| `Update Mode` | `Static` | `Static`（靜態 TLAS）/ `Dynamic`（只更新變換）。`Refit`、`Rebuild` 為相容用途 |

`BVH Type` 只選擇網格註冊時的加速結構種類。使用相同 Mesh 資產、材質插槽與 BVH 設定的 object，
由 `SoundTraceMeshCache` 以 refcount 共用原生網格。

### 蒙皮與程序化網格

SimpleST 沒有 vertex refit。要反映變形後的幾何體，請烘焙新的 Mesh 並重新註冊 `SoundTraceObject`
（或 `MeshCore.SetData`），**替換為新的原生網格**。每影格替換成本很高，請定期（例如 0.2 ~ 0.5 s）更新。

### 公開方法

`Auto Set` 會將 Renderer material 名稱與隨附 preset 比對。若匯入模型的根節點沒有 mesh、
由 child 擁有 geometry，請使用 `Add To Child Meshes`。

| 方法 | 行為 |
|---|---|
| `AutoSetMaterialSlots()` | 將所有 submesh 的 Renderer material 名稱與隨附 preset 自動比對。 |
| `GetMaterialPresetIndex(int slotIndex)` / `GetPresetName(int slotIndex)` | 回傳插槽的 preset index / 顯示名稱。 |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 變更單一插槽的 preset。 |
| `SetMaterialPresetForAllSlots(int presetIndex)` | 對所有插槽套用相同的 preset。 |
| `GetNativeMaterialIndices()` | 以原生註冊格式的陣列回傳逐 submesh 的 preset index。 |
| `GetTriangleCount()` | 回傳所有 submesh 的 triangle 數。 |
| `static IsGpuCompatibleBvhType(BvhType value)` | 相容用途。SIMD 系列為 `true` |

## 聲音材質

預設的創作資產為 `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。
在 `SoundTrace > Material Preset Library` 中可進行下列操作。

- 新增、刪除 preset、變更順序
- `soundMaterial.json` 的 import/export 與重新匯入隨附 JSON
- 編輯 Scattering 與 **9 頻段** Reflection、Absorption、Transmission 圖表

![Material Preset Library](/img/unity/Image_Mat_01.png)

頻段中心為 `63`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000`、`16000 Hz`。
每個頻段的 `R + A + T` 必須為 `1`，容許誤差 `0.001`。錯誤的長度與係數會回報為錯誤，
不會把 8 頻段輸入自動填成 9 頻段。

預設材質為 SoundTrace 遊戲材質 22 種，名稱與索引皆與先前版本相同。既有場景的材質插槽索引仍指向
原本的材質。

| 索引 | 材質 |
|---|---|
| 0 ~ 5 | `Concrete`, `Fabric`, `Wood`, `Brick`, `ConcreteBlock`, `Glass` |
| 6 ~ 11 | `Gravel`, `GypsumBoard`, `Linoleum,RubberOrAsphaltTile`, `Marble`, `Plaster`, `Plywood` |
| 12 ~ 17 | `Sherdded-woodFiberborad`, `Snow`, `Soil`, `Steel`, `Stone`, `WaterSurface` |
| 18 ~ 21 | `TunableAbsorber`, `LowVarianceTarget`, `ConcreteBlockPainted`, `FiberglassReinforcedPlastic` |

這些是遊戲用預設，並非量測資料。轉換方式：保留原 8 頻段（63 Hz ~ 8 kHz）的反射 R 與穿透 T，
吸收 A = 1 − R − T，16 kHz 頻段重複 8 kHz 的值，scattering 在 9 個頻段取相同值。由於引擎與頻段
構成已改變，聲學結果與 STCore 並不完全相同。請以 9 頻段重新輸入使用者材質。

![逐頻段材質圖表編輯](/img/unity/Image_Mat_02.png)

STCoreV2 的 `Transmission Model`（`Surface` / `Solid Distance`）已不存在。穿透只以逐頻段的
表面穿透係數 `T` 表示。

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

只在與 Manager 相同的 GameObject 上加入一個。

| Inspector 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Enable Path Visualization` | 開 | 是否顯示 path mesh |
| `Refresh Interval Ms` | `50` | 重建視覺化 mesh 的最小間隔。不影響傳播週期 |
| `Max Visualized Paths` | `1024` | 顯示的最大 path 數（`16..5000`） |
| `Path Width` | `0.08` | 線寬 |
| `Path Alpha Intensity` | `0.5` | 顯示強度 |
| `Path Depth Mode` / `Sorting Layer` / `Sorting Order` | `AlwaysOnTop` / `Default` / `10` | 渲染排序 |
| `Draw Hit Triangles` | 關 | 在 Scene View 中顯示 hit triangle |

Direct、Reflection、Diffraction、Reverb、Transmission 以 path 種類的顏色顯示。
僅供偵錯，效能量測與 release build 中請停用。主要公開成員為 `Active`、`Render()`、`Clear()`。

## 與 FMOD 搭配使用

若專案中有 SimpleST FMOD 外掛（`SimpleSTFmod`），SoundTrace 會自動以 **FMOD 整合** 運作。
空間聲學渲染由 FMOD Studio 的 SimpleST Source / Listener DSP 負責，SoundTrace 只以
`SoundTraceManager` + `SoundTraceObject` 將幾何體與材質上傳到外掛上下文。
`SoundTraceListener` / `SoundTraceSource` 會留下警告並停用。

![Unity FMOD 安裝選單](/img/fmod/unity-install-menu.png)

1. 安裝 FMOD for Unity 2.04（tgz 安裝版 embed 到 `Packages/`）。
2. 在 **SoundTrace › FMOD › Install SimpleST FMOD Plug-in...** 選單中選擇含有 `SimpleSTFmod` 的資料夾
   （例如 `fmod/plugins`，Mac 為 `mac/plugins`）。DLL/bundle 會複製到 FMOD 外掛資料夾，
   並註冊到 FMOD Settings › Dynamic Plugins。
3. 在 FMOD Studio 中於主匯流排放入 **SimpleST Listener**，在 3D 事件的主軌以 **SimpleST Source**
   取代 FMOD Spatializer — [FMOD 外掛](./fmod.md)。
4. 場景中放置 `SoundTraceManager`、幾何體用的 `SoundTraceObject`，以及 FMOD `StudioListener`。

引擎實例只有一個。SimpleSTFmod 載入與 SoundTrace P/Invoke 相同的 `SimpleSTRealtime`，
所有控制呼叫都在外掛的控制執行緒上執行。2026-10-07 Unity 6000.3 + FMOD for Unity 2.04
E2E 通過（物件 0→6→0，路徑 1→266→1）。

## 與 Wwise 搭配使用

若 Wwise Unity 整合的 DSP 資料夾中有 `SimpleSTWwise`，則以 **Wwise 整合** 運作
（若同時有 FMOD，FMOD 優先）。

![Unity Wwise 安裝選單](/img/wwise/unity-install-menu.png)

1. 以 Audiokinetic Launcher 安裝 Wwise Unity 整合。
2. 在 **SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** 選單中選擇含有 `SimpleSTWwise` 的資料夾。
   它會複製到 DSP 資料夾，由 Wwise 音效引擎載入。
3. 在 Wwise 專案中於 Audio Objects 匯流排放入 **Sound-tracing Renderer**，並將 3D 聲音送到該匯流排
   （Attenuation 關閉或設為平坦）— [Wwise 外掛](./wwise.md)。
4. 場景中放置 `AkInitializer`、`AkAudioListener`、emitter 的 `AkGameObj`，以及 `SoundTraceManager`、
   `SoundTraceObject`。Wwise Unity 的單位為公尺，因此 `sceneRatio = 1`。

## WebGL

Unity WebGL 不提供 `OnAudioFilterRead`，因此使用另一條路徑。傳遞 AudioClip PCM 與播放狀態，
並將 SimpleST buffered host renderer 的結果經共享環形緩衝區送到 AudioWorklet。

- AudioClip 以 **Decompress On Load** 匯入。
- 在 HTTPS 或 localhost 上以 `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp` 標頭提供服務。音訊在使用者輸入之後才開始。
- 建置後處理會將 `Runtime/Web/*.bytes` 複製到 `StreamingAssets/SoundTrace/`，請一併部署該資料夾。
- Unity AudioMixer 效果鏈不會套用到 WebGL 的獨立 SoundTrace 輸出。

## 範例

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

確認基本的 room、source、listener、geometry、material preset 與 path visualization。

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

確認 source/listener 移動、material preset 變更，以及 Unity 原始 audio 與 SoundTrace 輸出的比較。

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

確認寬廣空間中的多個 source、wall occlusion，以及移動中的 HRTF 方向感與 room response。

## 自 STCoreV2 改變的契約

| 之前 | 現在 |
|---|---|
| `exaSound` / STCoreV2 進入點 | `st_rt_*` / SimpleST ABI 6 |
| 0 = 無效控制代碼 | **-1 = 無效**，0 為有效 |
| 逐音源的聆聽者渲染 | 逐音源 mono stream + 聆聽者整體 mix |
| 8 頻段材質、scalar scattering | 63…16000 Hz **9 頻段** R/A/T/scattering |
| 可變更的 native material | 不可變 material，重新綁定到新的 material/mesh |
| STCore 多項式距離衰減 | SimpleST 物理距離衰減 |
| STCore GPU/provider/path-cache 設定 | SimpleST CPU pipeline 排程器 |
| KU100 Resources 表 | 內建 MIT KEMAR HRTF |
| `exaMeshUpdateVertices` → `exaMeshRefit` | 替換為新網格 |

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 沒有聲音 | Console 中第一個 Manager 初始化錯誤、Stereo/Best latency、AudioSource clip、Manager/Listener 是否存在 |
| Source/Listener/Object 要求 Manager | 在連鎖錯誤之前記錄的 `Failed to initialize SoundTraceManager` 原因 |
| 與舊版衝突 | 是否已將 STCoreV2 的 `Assets/SoundTrace` 移到 Assets 之外 |
| Geometry 沒有反映 | `Read/Write Enabled`、MeshFilter/MeshRenderer、child mesh 位置、註冊狀態 |
| 執行中變形的 mesh 沒有反映 | SimpleST 沒有 refit。替換為新網格 |
| FMOD/Wwise 模式下 Listener/Source 被停用 | 正常 — 渲染由中介軟體外掛負責 |
| 部分音源沒有空間化而聽起來是 dry | Console 中的 `ST_STATUS_BUDGET_EXCEEDED` 警告 — 減少音源或提高 `SoundTraceRuntime.MaxSources` |
| Android 建置以 `SimpleST requires Android API 28 or newer` 失敗 | 將 Player Settings › Minimum API Level 設為 28 以上 |
| Teleport 後 pitch 跳動 | 在 transform 變更後立即呼叫 `ResetMotionState()` |
| 效能不足 | 依 `Quality → Middle → Fast`、縮小 Reverb Ray Resolution、停用 path visualizer 的順序確認 |
| 多個音源聽起來像 comb filtering | 以相同的 `AudioSettings.dspTime` 執行 `PlayScheduled()` |

## 下一篇

- [SDK 概覽](./overview.md)
- [FMOD 外掛](./fmod.md) · [Wwise 外掛](./wwise.md)
- [Web SDK](./web.md) · [Unreal Engine SDK](./ue.md)
