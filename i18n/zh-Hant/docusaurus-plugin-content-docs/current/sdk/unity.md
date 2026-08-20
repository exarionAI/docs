---
title: Unity
description: SoundTrace Unity SDK 安裝、主要元件 API、HRTF、GPU/BVH、Surface 與 Solid Distance Transmission 設定。
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK 是一款即時空間音訊外掛，用於將 Unity 的網格、Renderer 材質插槽、音源與聆聽者連接到
[STCoreV2](../core/stcorev2.md)。

本頁以目前 Unity SDK 的公開元件與 Inspector 契約為準。

## 要求與平台

| 項目 | 目前套件狀態 |
|---|---|
| Unity | 2022.3 LTS 或更新版本 |
| 隨附原生外掛 | macOS、Windows x64、iOS、Android |
| Linux | 目前套件不含二進位檔，需在 Linux 主機上另行建置 |
| Unity WebGL | 不支援。Unity WebGL 無法使用以 `OnAudioFilterRead` 為基礎的 DSP 處理 |

`Use GPU Backend` 會為 reflection 與 reverb propagation 要求 WebGPU compute provider。
diffraction 仍由 CPU 計算。實際是否啟用取決於原生外掛與裝置；GPU 初始化失敗時使用
CPU propagation。

## 安裝

SoundTrace Unity SDK 套件與安裝說明會透過已簽約的評估或授權交付管道提供。
請遵循收到的發行套件所附安裝步驟。

在 Package Manager 中選擇 SoundTrace SDK，然後透過 `Samples > Demo Assets > Import`
匯入範例。

## Unity Audio 設定

1. 開啟 `Edit > Project Settings > Audio`。
2. 將 `Default Speaker Mode` 設為 `Stereo`。
3. 將 `DSP Buffer Size` 設為 `Best latency`。

![Unity Audio 設定](/img/unity/Image01_AudioSetting.png)

如果這些設定不一致，Manager 與 Listener Inspector 會顯示警告。

## Audio Asset Import 設定

以使用單聲道音源為前提，音訊剪輯設定為 PCM 格式。

![Audio Asset Import 設定](/img/unity/ImportSetting.png)

## 最快設定

1. 在空白 GameObject 上加入 `SoundTraceManager`。
2. 在 Main Camera 上加入 `SoundTraceListener`。
3. 在音源 GameObject 上加入 `SoundTraceSource`，並為同一 GameObject 上的 `AudioSource` 指定 clip。
4. 在要作為聲學幾何體的 Mesh GameObject 上加入 `SoundTraceObject`。
5. 如有需要，在與 Manager 相同的 GameObject 上加入 `SoundTracePathVisualizer`。
6. 在 Play Mode 中檢查 Console 錯誤、聲音與 path。

在所有同時載入的 scene 中，只能各有一個啟用中的 Manager 與 Path Visualizer。
可以註冊多個 Listener，但 Source 渲染會使用第一個註冊的 `PrimaryListener`。

## 元件概覽

| 元件 | 作用 | 必要相依性 |
|---|---|---|
| `SoundTraceManager` | 管理執行階段、scene、材質註冊與 propagation backend | 每個執行階段 1 個 |
| `SoundTraceListener` | Listener transform、ray 品質、輸出/HRTF 設定 | 啟用中的 Manager |
| `SoundTraceSource` | 將 `AudioSource` 輸出空間化並設定各類 path | 同一 GameObject 上的 `AudioSource`、啟用中的 Listener |
| `SoundTraceObject` | 將 Mesh 與 submesh 材質註冊到聲學 scene | `MeshFilter`、`MeshRenderer` |
| `SoundTracePathVisualizer` | 偵錯顯示有效 path 與 hit triangle | 與 Manager 相同的 GameObject |

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| 欄位 | 預設值 | 行為 |
|---|---:|---|
| `bool propagateOnStart` | `true` | 在 `Start()` 中同步初始 scene graph 與 transform，然後要求第一次 propagation。 |
| `bool loadDefaultMaterialsOnEnable` | `true` | 在 `OnEnable()` 中將隨附的 Material Preset Library 註冊到原生 material table。 |
| `int propagationThreadCount` | `-1` | 指定聲音引擎內部 propagation job 的執行執行緒數。在原生平台上，`-1` 依 `std::thread::hardware_concurrency()` 回傳的邏輯執行緒數自動設定，`0` 和 `1` 以單執行緒運作。`2` 以上使用指定數量，其中包含呼叫執行緒。 |
| `bool useGpuBackend` | `false` | propagation 不使用 job 多執行緒，而是透過 GPU compute shader 計算。 |
| `int pathCacheSize` | `256` | 生成 path 的 cache buffer size，最小值為 `0`，最大值為 `1024`。數值越高，空間音訊效果越好，但計算量也會隨之增加。建議依裝置效能，從低於預設值 `256` 的設定開始。 |

### 公開屬性

| 屬性 | 型別/存取方式 | 準確含義 |
|---|---|---|
| `Instance` | `static SoundTraceManager` / `get; private set;` | 所有已載入 scene 共用的單例 Manager；沒有啟用中的 Manager 時為 `null`。 |
| `DefaultMaterialsLoaded` | `int` / `get; private set;` | 在 `OnEnable()` 中自動註冊的隨附材質數量。關閉自動載入或 asset 遺失時為 `0`。 |
| `Scene` | `SoundScene` / `get; private set;` | Manager 擁有的底層 scene。處於停用狀態或初始化失敗後為 `null`。 |
| `PrimaryListener` | `SoundTraceListener` / `get` | Source 渲染使用的第一個已註冊 Listener；沒有 Listener 時為 `null`。 |
| `ListenerCount` | `int` / `get` | 目前註冊到 Manager 的 Listener 數量。 |
| `SourceCount` | `int` / `get` | 目前註冊到 Manager 的 Source 數量。 |
| `ObjectCount` | `int` / `get` | 目前註冊到 Manager 的 Object 數量。 |
| `LastValidPathCount` | `int` / `get; private set;` | 最近完成的 propagation 結果中的有效 path 數量。無法執行 propagation 時為 `0`。 |
| `LastNativeError` | `string` / `get; private set;` | 最近的 scene graph 或 propagation 錯誤；沒有錯誤時為空字串。 |
| `PropagationThreadCount` | `int` / `get` | propagation job 的執行執行緒數量。`-1` 表示最大值。 |
| `IsGpuPropagate` | `bool` / `get; private set;` | `exaPropagatorInitGpu()` 是否成功並啟用了 GPU propagation provider。 |
| `GpuBackendStatus` | `string` / `get; private set;` | GPU Backend 初始化結果：`GPU active` 或 `CPU fallback (<ExaResult>): <error>`。 |
| `PathCacheSize` | `int` / `get` | 生成 path 的 cache buffer size。 |

### 公開方法

| 方法 | 行為 |
|---|---|
| `public void ResetMotionState()` | 在 teleport、respawn 或 scene 切換後，立即重設所有已註冊 Listener 與 Source 的 motion history。 |

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

通常加入 Main Camera。

### Inspector

| 欄位 | 預設值 | 範圍/選項 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`、`Fast`、`Middle`、`Quality` |
| `Ray Resolution` | `16` | `1..32`；水平與垂直使用相同值 |
| `Ray Depth` | `4` | `1..16` |
| `Output Mode` | `Headset` | `Headset`、`Speaker` |
| `HRTF` | `HRIR Interpolated` | 以下三種模式 |

選擇 `Fast`、`Middle` 或 `Quality` 時，會同時套用 ray 值與相關的 render 品質值，
ray 欄位也會在 Inspector 中停用。若要直接編輯這些值，請先選擇 `Custom`。
從預設返回 `Custom` 時，會保留最後套用的值。

| 預設 | Ray Resolution | Ray Depth | 建議起點 |
|---|---:|---:|---|
| `Custom` | 已儲存的值 | 已儲存的值 | 手動調校 |
| `Fast` | `16` | `4` | 行動平台、大量音源 |
| `Middle` | `24` | `8` | 一般遊戲與桌面平台 |
| `Quality` | `32` | `12` | 音訊比重較高、其他處理負載較低的應用程式 |

### HRTF 與輸出模式

| 模式 | 所需 asset | 說明 |
|---|---|---|
| `Band8` | 無 | 不載入外部 HRTF table 的輕量模式 |
| `Hrir` | `KU100_convolution.bytes` | HRIR 模式 |
| `HRIR Interpolated` | `KU100_convolution.bytes` | 在 HRIR 模式中套用插值計算，以增強方向感。 |

Asset 從 `Runtime/Resources/SoundTrace/HRTF/` 載入。如果所需 asset 不存在或為空，
Listener 初始化會失敗，且不會自動切換到其他模式。

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource` 處理同一 GameObject 上的 `AudioSource` 輸出。啟用時，會將
`AudioSource.spatialBlend` 與 `AudioSource.dopplerLevel` 設為 `0`，讓 SoundTrace
負責空間化與 Doppler。

### Inspector

| 欄位 | 預設值 | 行為 |
|---|---:|---|
| `Intensity` | `1` | Source 發射強度，範圍為 `0..10`。 |
| `Ray Resolution` | `24` | 對 Reverb ray 的水平與垂直解析度套用相同數值，範圍為 `1..32`。 |
| `Reverb Ray Depth` | `4` | Reverb ray 的最大反射深度，範圍為 `1..16`。 |
| `Enable Direct` | `true` | 啟用 Direct path。 |
| `Enable Reflection` | `true` | 啟用 Reflection path。 |
| `Enable Diffraction` | `true` | 啟用 Diffraction path。 |
| `Enable Reverb` | `true` | 啟用 Reverb path。 |
| `Enable Transmission` | `true` | 啟用 Transmission path。 |
| `Direct Attenuation` | `1.0` | Direct path 的距離衰減。數值越大，在相同距離下聽到的聲音越小。範圍為 `0.5..1.5`。 |
| `Reflection Attenuation` | `1.0` | Reflection path 的距離衰減。數值越大，在相同距離下聽到的聲音越小。範圍為 `0.5..1.5`。 |
| `Diffraction Attenuation` | `1.0` | Diffraction path 的距離衰減。數值越大，在相同距離下聽到的聲音越小。範圍為 `0.5..1.5`。 |
| `Reverb Attenuation` | `1.0` | Reverb path 的距離衰減。數值越大，在相同距離下聽到的聲音越小。範圍為 `0.5..1.5`。 |
| `Transmission Attenuation` | `1.0` | Transmission path 的距離衰減。數值越大，在相同距離下聽到的聲音越小。範圍為 `0.5..1.5`。 |
| `Max Delay Seconds` | `1.0 s` | Source renderer 保留的最大 propagation delay。時間越長，記憶體使用量越多。範圍為 `0.01..5 s`。 |
| `Path Fade Time Seconds` | `0.066 s` | Path 進入或離開 renderer 時使用的 fade 時間，範圍為 `0.001..0.5 s`。 |
| `Path Hold Time Seconds` | `0.120 s` | 消失的 non-direct path 開始 fade 前的保留時間。`0` 會停用 hold。 |
| `Max Delay Rate` | `0.1` | 每個 sample 允許的最大 delay 變化量，範圍為 `0.001..0.999`。 |
| `Bypass` | `false` | 跳過 SoundTrace spatial rendering，並直接傳遞原始 `AudioSource` 輸出。 |

Distance Attenuation 值越大，對應 path 的距離衰減越快。`Show Gizmo` 會在 Scene View 中
分別顯示 Direct、Reflection、Diffraction、Reverb 與 Transmission 的可達範圍。

Render Tuning 套用於 source-listener 配對。`Path Hold = 0` 會關閉 hold。

### 公開方法

| 方法 | 動作 |
|---|---|
| `SetBypass(bool enabled)` | 為 `true` 時跳過 SoundTrace spatial rendering，並直接傳遞原始 `AudioSource` 輸出；為 `false` 時重新套用 SoundTrace rendering。 |
| `ResetMotionState()` | 將目前 Transform 重新設為 motion 基準點，並以速度 `0` 反映，避免 teleport 或 respawn 後出現 Doppler spike。 |

若要同步多個 `AudioSource` 的播放時機，請以相同的 `AudioSettings.dspTime` 為基準呼叫
`PlayScheduled()`。

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject` 會註冊 `MeshFilter.sharedMesh` 與 Renderer 的 submesh 材質插槽。
由於 Build 中需要讀取網格資料，請在 Import Settings 中啟用 `Read/Write Enabled`。

### Geometry 與 BVH

![Scene View 中顯示的 BVH](/img/unity/Img_STObjDome.png)

| 欄位 | 預設值 | 說明 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`、`LBVH`、`LBVH_SIMD4`、`LBVH_SIMD8`、`LBVH_SIMD16` |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Update Mode` | `Static` | `Static`、`Dynamic`、`Refit`、`Rebuild` |

#### BVH Type

| BVH Type | 說明 |
|---|---|
| `HKDTree` | 使用以 KD 分割為基礎的 traversal。它支援 Refit，但 Refit 後會切換為 BVH-style fallback traversal。不支援 GPU backend。 |
| `LBVH` | 以 Morton code 為基礎，rebuild 速度比 HKDTree 更快，並支援 Refit。透過底層 API 上傳 vertex 後進行 Refit，可用於 SkinnedMesh 或 procedural mesh 變形。純量格式不支援 GPU backend。 |
| `LBVH_SIMD4` | 以 4 個一組的 SIMD batch 平行處理 LBVH leaf intersection。支援 Refit 及支援 GPU Backend。 |
| `LBVH_SIMD8` | 以 8 個一組的 SIMD batch 平行處理 LBVH leaf intersection，為目前的預設值。支援 Refit 及支援 GPU Backend。 |
| `LBVH_SIMD16` | 以 16 個一組的 SIMD batch 平行處理 LBVH leaf intersection。支援 Refit 及支援 GPU Backend。 |

如果在要求 GPU 的 scene 中選擇 `HKDTree` 或純量 `LBVH`，Inspector 會顯示警告。

#### Update Mode

| Update Mode | STCoreV2 update policy | 含意 |
|---|---|---|
| `Static` | `EXA_OBJECT_UPDATE_STATIC` (0) | 執行階段不更新 TLAS/BLAS。用於不移動的 level geometry。 |
| `Refit` | `EXA_OBJECT_UPDATE_REFIT` (1) | 形變（deformation）策略：refit mesh BLAS 並更新 TLAS bounds。適用於 topology 維持不變的 skinned 與 procedural mesh。 |
| `Rebuild` | `EXA_OBJECT_UPDATE_REBUILD` (2) | 用於 topology 會改變的 geometry，會重新建置 BVH。 |
| `Dynamic` | `EXA_OBJECT_UPDATE_DYNAMIC` (3) | 僅 Transform 變化時，只更新 TLAS instance。 |

#### Refit 與 vertex 上傳

`Refit` 是 STCoreV2 中**用於 vertex 形變（skinned animation）的 update policy**。但 core
不會自行決定何時上傳 vertex：mesh 更新採用 `exaMeshUpdateVertices` → `exaMeshRefit` 的
2-call protocol，而 object 上的 `Refit` 是讓該結果反映到 BLAS 與 TLAS bounds 的策略開關。
換言之，**上傳 vertex 的一方是 host SDK**。

目前 Unity 的 `SoundTraceObject` MonoBehaviour 只會自動同步 Transform，不會呼叫 vertex 上傳。
它要求 `MeshFilter`/`MeshRenderer`，因此不會直接繫結 `SkinnedMeshRenderer`，且 mesh geometry
只在 `OnEnable` 時快照一次。因此若要在 Unity 中讓 skinned 或 procedural 形變反映到聲音上，
請將 `Update Mode` 設為 `Refit`，並如下所示透過 `MeshCore` 自行上傳 vertex。UE 外掛的
`SoundTracingObjectComponent` 會為 skeletal mesh 自動完成這項上傳。

```csharp
using Exarion.SoundTrace;
using Exarion.SoundTrace.Core;
using Exarion.SoundTrace.Native;
using UnityEngine;

[RequireComponent(typeof(SoundTraceObject))]
public sealed class SoundTraceSkinnedRefit : MonoBehaviour
{
    [SerializeField] private SkinnedMeshRenderer skin;

    private SoundTraceObject _object;
    private Mesh _baked;
    private ExaVec3f[] _vertices;

    private void Awake()
    {
        _object = GetComponent<SoundTraceObject>();
        _baked = new Mesh();
    }

    private void LateUpdate()
    {
        SoundMeshCore mesh = _object.MeshCore;
        if (mesh == null || !mesh.IsValid)
            return;

        // 1) bake 目前的 pose 並讀取 vertex。這是 Unity Mesh API，必須在 main thread 執行。
        skin.BakeMesh(_baked);
        Vector3[] baked = _baked.vertices;
        if (_vertices == null || _vertices.Length != baked.Length)
            _vertices = new ExaVec3f[baked.Length];
        for (int i = 0; i < baked.Length; ++i)
            _vertices[i] = new ExaVec3f(baked[i].x, baked[i].y, baked[i].z);

        // 2) 上傳與 refit 在 control thread 上以 2-call protocol 執行。
        ExaVec3f[] vertices = _vertices;
        SoundTraceControlThread.Invoke(() =>
        {
            if (mesh.UpdateVertices(vertices))
                mesh.Refit();
        });
    }

    private void OnDestroy()
    {
        if (_baked != null)
            Destroy(_baked);
    }
}
```

注意事項：

- vertex 數量必須與建置時**完全一致**。數量不符時 `exaMeshUpdateVertices` 會以
  `EXA_ERR_INVALID_ARG` 拒絕。請將 `SkinnedMeshRenderer` 的 bind pose mesh 放入
  `MeshFilter.sharedMesh`，使數量對齊。
- vertex 以 mesh 區域座標系原樣上傳。object 的 position、rotation、scale 由
  `SoundTraceObject` 另行同步，因此 `BakeMesh` 也應使用不套用 scale 的形式。
- native mesh 由 `SoundTraceMeshCache` 以 Mesh asset、material slot 與 BVH 設定為鍵進行
  refcount 共用。當多個 object 使用相同組合時，refit 其中一個會讓它們全部產生相同形變。
  若需各自獨立形變，請為每個 object 使用不同的 Mesh instance。
- `SoundTraceControlThread.Invoke` 是封鎖式呼叫。每個 frame 對大量 object 呼叫會讓 main
  thread 排在 control thread 的 propagation frame 之後等待，請將 refit 對象限制在少量 object。
- BVH Type 請使用可 refit 的 `LBVH` 系列。`HKDTree` 也能 refit，但之後 traversal 會切換為
  BVH-style fallback。
- triangle index 改變的 topology 變更無法以 refit 處理。請透過 `MeshCore.SetData(...)`
  重新建置，並將 `Update Mode` 設為 `Rebuild`。

### 公開方法

`Auto Set` 會將 Renderer material 名稱與隨附 preset 配對。如果 imported model root
上沒有 mesh，而是由 child 持有 geometry，請使用 `Add To Child Meshes`。

| 方法 | 動作 |
|---|---|
| `AutoSetMaterialSlots()` | 走訪所有 submesh，將 Renderer material 名稱與隨附 preset 自動配對，並更新插槽設定。 |
| `GetMaterialPresetIndex(int slotIndex)` | 傳回指定插槽的 preset index。沒有插槽或插槽 index 無效時傳回 `0`。 |
| `GetPresetName(int slotIndex)` | 傳回指定插槽所用 preset 的顯示名稱。找不到 preset 時傳回 `Concrete`。 |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 變更一個插槽的 preset。`presetIndex` 最小會修正為 `0`，插槽 index 無效時傳回 `false`。 |
| `SetMaterialPresetForAllSlots(int presetIndex)` | 對所有插槽套用相同 preset。`presetIndex` 最小會修正為 `0`，沒有可套用的插槽時傳回 `false`。 |
| `GetNativeMaterialIndices()` | 以 native mesh 註冊所需的陣列格式傳回每個 submesh 的 preset index。空白或缺少的插槽使用 `0`。 |
| `GetTriangleCount()` | 加總所有 submesh 的 index 數並傳回 triangle 數。沒有 mesh 時傳回 `0`。 |
| `static IsGpuCompatibleBvhType(BvhType value)` | 當值為 `LBVH_SIMD4`、`LBVH_SIMD8` 或 `LBVH_SIMD16` 時傳回 `true`。 |

## 聲學材質與 Transmission

預設創作資產為
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。
在 `SoundTrace > Material Preset Library` 中可以執行以下操作：

- 加入、刪除預設並調整順序
- 匯入/匯出 `soundMaterial.json`，或重新匯入隨附 JSON
- 編輯 Scattering 與 8 頻帶 Reflection、Absorption、Transmission 圖表
- 選擇 `Transmission Model`

![Material Preset Library](/img/unity/Image_Mat_01.png)

頻帶中心為 `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、
`8000 Hz`。材質順序必須與資料表索引一致。

![依頻帶編輯材質圖表](/img/unity/Image_Mat_02.png)

### Transmission Model

| 模型 | 輸入 | 幾何體條件 |
|---|---|---|
| `Surface` | 每個頻帶中穿過表面後保留的透射能量係數 `0..1` | 可用於開放面與薄表面 |
| `Solid Distance` | 每個頻帶中透射能量達到 `-30 dB` 時的材質參考距離（m），不得小於 `0` | 需要封閉體積與一致的面方向 |

`Solid Distance` 的輸入不是物件的實際厚度。執行階段會依照在幾何體內部的實際
穿行距離套用衰減。變更模式不會自動計算這 8 個值，因此請填入全部已驗證值，
不要維持預設的 `0` 狀態。

在 JSON 中，如果沒有 `transmissionDistanceToMinus30DbMeters`，則使用 `Surface`；
如果此欄位包含恰好 8 個有限且不小於 0 的值，則使用 `Solid Distance`。
匯出為 `Surface` 時會省略此欄位，而不是寫入 `null` 或空陣列。

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

只能在與 Manager 相同的 GameObject 上加入一個。

| Inspector 欄位 | 預設值 | 說明 |
|---|---:|---|
| `Enable Path Visualization` | 開啟 | 是否顯示 path mesh |
| `Refresh Interval Ms` | `50` | 重新產生視覺化 mesh 的最小間隔；不影響聲學 propagation 週期 |
| `Max Visualized Paths` | `1024` | 最多顯示的 path 數量 |
| `Path Width` | `0.08` | 線寬 |
| `Path Alpha Intensity` | `0.5` | 顯示強度 |
| `Draw Hit Triangles` | 關閉 | 在 Scene View 中顯示 hit triangle |

Direct、Reflection、Diffraction、Reverb 與 Transmission 會依 path 類型使用不同顏色顯示。
此元件用於偵錯，在效能測量與 release build 中應停用。

主要公開成員為 `Instance`、設定/計數屬性、`Render()` 與 `Clear()`。

## 範例

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

用於檢查基本房間、音源、聆聽者、幾何體、材質預設與路徑視覺化。

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

用於檢查音源/聆聽者移動、材質預設切換，以及 Unity 原始音訊與
SoundTrace 輸出的比較。

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

用於檢查大型空間中的多個音源、牆面遮蔽、移動期間的 HRTF 方向感與房間響應。

## 疑難排解

| 症狀 | 檢查項目 |
|---|---|
| 沒有聲音 | Console 中第一個 Manager 初始化錯誤、Stereo/Best latency、AudioSource clip、是否存在 Manager/Listener |
| Source/Listener/Object 要求 Manager | 檢查連鎖錯誤之前記錄的 `Failed to initialize SoundTraceManager` 原因 |
| HRTF 初始化失敗 | 所選模式對應的 Resources asset 是否存在，以及檔案是否為空 |
| Geometry 未生效 | `Read/Write Enabled`、MeshFilter/MeshRenderer、子網格位置、註冊狀態 |
| 執行階段變形 mesh 未生效 | 僅設定 `Update Mode` 不會上傳頂點/拓撲；需要獨立的底層幾何體更新路徑 |
| GPU 未啟用 | 檢查 `GpuBackendStatus`、Console 回退原因、Object 是否選擇 SIMD BVH |
| Teleport 後音高跳變 | 變更 transform 後立即呼叫 `ResetMotionState()` |
| 效能不足 | 依 `Quality → Middle → Fast` 順序檢查，縮小 path cache buffer，然後停用路徑視覺化 |
| 多個音源聽起來像梳狀濾波 | 使用相同的 `AudioSettings.dspTime` 呼叫 `PlayScheduled()` |

## 後續文件

- [SDK 概覽](./overview.md)
- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
