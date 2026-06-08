---
title: Unity
---

# SoundTrace SDK for Unity

SoundTrace SDK for Unity 是用於在 Unity 中使用原生 [STCoreV2](../core/stcorev2.md) 引擎的即時空間音訊外掛。它會把 Unity 場景中的網格、渲染材質槽、聲源和聽者 Transform 傳入 SoundTrace runtime，並將 direct、reflection、diffraction、reverb、transmission path 套用到 Unity `AudioSource` 輸出。

## Requirements

| 項目 | 需求 |
|---|---|
| Unity | `2022.3.62f2` 或更新版本 |
| 平台 | macOS, Windows, Linux, iOS, Android, WebGL |

## Unity Project Setup

### Unity Audio 設定

1. 開啟 `Edit > Project Settings > Audio`。
2. 將 `Default Speaker Mode` 設為 `Stereo`。
3. 將 `DSP Buffer Size` 設為 `Best latency`。

![Unity Audio 設定畫面](/img/unity/Image01_AudioSetting.png)

## Getting Started

![模型 Read/Write 設定](/img/unity/Image02_ModelRW.png)

1. 在場景中放置已啟用 `Read/Write Enabled` 的網格，並新增 `SoundTraceObject`。

![SoundTraceObject 元件](/img/unity/Image03_SoundTraceObject.png)

2. 給聽者角色的 GameObject 新增 `SoundTraceListener`。請與 Unity 內建 `AudioListener` 一起設定。預設 Unity 場景中，`AudioListener` 已經掛在 Main Camera 上，請注意這一點。

![SoundTraceListener 元件](/img/unity/Image04_Listener.png)

3. 建立聲源 GameObject 並新增 `SoundTraceSource`。Unity `AudioSource` 會自動新增。

![SoundTraceSource 元件](/img/unity/Image05_Source.png)

4. 給 Unity `AudioSource` 指定要播放的 audio clip。
5. 建立管理器 GameObject，並新增 `SoundTraceManager` 和 `SoundTracePathVisualizer`。

![SoundTraceManager 和 Path Visualizer 元件](/img/unity/Image06_Manager.png)

6. 重新放置聽者、聲源和 `SoundTraceObject` geometry，讓它們之間可以形成反射聲學路徑。

![聽者、聲源和幾何體定位](/img/unity/Image07_Positioning.png)

7. 進入 Play Mode。
8. 在 `SoundTracePathVisualizer` 中啟用 path visualization。
9. 如果聽者、聲源和物件之間出現反射 path line，基礎連線就已成功。

![反射 path line 成功確認](/img/unity/Image08_Success.png)

10. 移動聽者或聲源，確認聲音會依物理關係變化。
11. 如果 `SoundTraceObject` 的 `Update Mode` 是 `Static`，移動 Transform 不會為 runtime update 重建 geometry。
12. 對需要移動的物件使用 `Refit`。

![可移動物件設定](/img/unity/Image09_Movable.png)

13. `Rebuild` 只在形狀發生明顯變化時使用，避免每 frame rebuild 的設定。

![移動後的 path 確認](/img/unity/Image10_Moved.png)

## Main Features

### SoundTraceObject

`SoundTraceObject` 會把 Unity `MeshFilter`/`MeshRenderer` 註冊為 SoundTrace collision geometry。它目前基於 `MeshFilter` 和 `MeshRenderer`，用作 SoundTrace geometry 的網格需要在 import settings 中啟用 `Read/Write Enabled`。不要假設 `SkinnedMeshRenderer` 的 vertex deformation 會每 tick 自動 bake。

對於由多個子 mesh object 組成的 import model，可以先在根 GameObject 上新增 `SoundTraceObject`，再點擊 `Add To Child Meshes`，把元件新增到所有包含 mesh 的子物件。之後如果根元件的 `MeshFilter` 為空，請用 `Remove Root Component(s)` 移除根上的空元件。

它不是修改渲染材質本身的功能，而是把每個 render material slot 映射到 SoundTrace material preset index，並把該 index 附加到對應的 submesh triangle。

### Sound material slots

- `Auto Set` 會讀取 Unity render material 名稱，並自動分配最接近的 SoundTrace material preset。
- 例如，`Sword` 這樣的幻想劍模型的 material 名稱包含 `Metal` 時，會映射到 `Steel` 系列 preset。
- 如果沒有匹配名稱，或 material 為空，fallback 是 `Concrete`。
- 如果自動匹配不正確，請在每個 submesh row 的 dropdown 中手動選擇 preset。
- 如果想明顯感受反射，建議用 `Steel`/`Marble` 測試；想感受吸音，建議用 `Snow`/`Soil` 測試；想感受透射，建議用 `Fabric` 測試。

### BVH and update mode

| 設定 | 說明 |
|---|---|
| `HKDTree` | 具有 SBVH 類似特性的高細節結構。Raycast 快，且適合保留帶孔洞或複雜靜態背景網格的 primitive detail。缺點是 rebuild 較慢。 |
| `LBVH` | build 快的預設 LBVH。對於複雜形狀，它可能更粗略地近似 geometry，導致設計師製作的孔洞表現得像被封住。 |
| `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` | LBVH 系列的 SIMD variant。場景越複雜，較高 SIMD width 的選項可能越有利。 |
| `bvhMaxDepth` | BVH 最大 depth。depth 越大，越能受益於 traversal pruning，建議先從較大的值開始測試。 |
| `primitivesPerLeaf` | 最終 leaf node 內包含的 triangle 數量。範圍是 `1-128`。值越小 detail 越好，但 build/traversal cost 會變化。 |
| `Static` | 用於靜態 geometry。適合不需要把 runtime 移動或形狀變化反映到傳播中的物件。 |
| `Refit` | 保持現有結構，同時跟隨 runtime transform 或 shape update。 |
| `Rebuild` | 僅在 topology 或形狀變化到必須重建 BVH 時使用。 |

### SoundTraceListener

`SoundTraceListener` 是場景聽者。它每 frame 將 Transform position 和 orientation 同步到原生 listener，並擁有 listener ray 設定和 path type enable。

| 設定 | 說明 |
|---|---|
| `Ray Resolution` | listener guide ray 解析度。範圍是 `1-32`，同一個值會同時套用到 native listener width 和 height。值為 `16` 時使用 `16 x 16` guide rays。 |
| `Ray Depth` | ray 的反射/傳播 depth。範圍是 `1-16`。值越高，殘響感和複雜 path 表現越好，但計算量也越高。 |
| `Per-path enable` | 按類型啟用或停用 `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission` path。 |

複雜遊戲場景的初始值建議使用 `Ray Resolution 16`、`Ray Depth 4`。

### SoundTraceSource

`SoundTraceSource` 是 SoundTrace 聲源元件，需要 Unity `AudioSource`。它在 Unity audio filter callback `OnAudioFilterRead` 中，將輸入 buffer in-place 渲染為 SoundTrace spatial output。

| 設定 | 說明 |
|---|---|
| `Intensity` | 聲源基礎強度。 |
| `Gain Boost Db`, `Reverb Send Db`, `Reflection Send Db` | 以 dB 調整整體 gain 與 reverb/reflection send level。 |
| `Reverb Rays` | 聲源側的殘響 ray 設定。`Ray Resolution` 範圍是 `1-32`，會同時套用到 reverb ray width 和 height。`Reverb Ray Depth` 範圍是 `1-16`。它與 listener ray 是獨立設定。 |
| `Per-path enable` | 按聲源啟用或停用 path type。 |
| `Distance Attenuation` | 按 path type 控制衰減範圍。當前 inspector slider 控制 attenuation constant；數值越大，有效範圍越小。 |
| `Distance Attenuation Gizmos` | 在 Scene View 中用 wire sphere 顯示各 path type 的衰減範圍。 |
| `Bypass` | 跳過 SoundTrace 空間渲染，直接傳遞原始 `AudioSource` 輸出。 |

### SoundTraceManager

`SoundTraceManager` 是每個場景的 SoundTrace runtime owner。listener、source、object 啟用時會註冊到 manager，manager 負責執行 scene tick 和 propagation update。

| 設定 | 說明 |
|---|---|
| `Propagation Interval Ms` | ray-trace propagation pass 的執行間隔。position sync tick 每 frame 執行，propagation 會按該間隔 throttle。 |
| `Propagate On Start` | 在 `Start()` 時先 flush 一次 scene graph，然後立即執行一次 propagation pass 和 visualizer update。下一次 propagation 會在 `Propagation Interval Ms` 之後執行。 |
| `Load Default Materials On Enable` | 將 package 的預設 `SoundTraceMaterialPresetLibrary.asset` 註冊到 native material table。 |
| `Propagation Thread Count` | 內部 job system 的 worker 數。`-1` 表示 STCoreV2 按 logical hardware thread 選擇。應用程式開發者應根據整體 CPU budget 分配，實際專案建議從 3 個以上 thread 開始測試。 |
| `Path Cache Size` | 值為 `0` 或更低時不使用 cache buffer。值為 `1` 或更高時，每 frame 儲存 path cache，增加 ray 數量和聲學 detail。建議值為 `256`、`512`、`1024`。 |

### SoundTracePathVisualizer

`SoundTracePathVisualizer` 是將 valid path 以 runtime line renderer 顯示出來的除錯元件。用於目視確認場景中的 reflection、diffraction、reverb、transmission path 如何產生。

| 設定 | 說明 |
|---|---|
| `Enable Path Visualization` | 啟用或停用 path line rendering。 |
| `Max Visualized Paths` | 螢幕上顯示的最大 path 數量。 |
| `Path Width` | line width。 |
| `Path Alpha Intensity` | 基於 attenuation 的 alpha scaling 強度。 |
| `Draw Valid Paths`, `Draw Hit Triangles` | Scene View debug drawing 選項。 |

### SoundTraceMaterialPresetLibrary

預設 material preset library 位於 package 內部的 `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`。可透過 Unity 選單 `SoundTrace > Material Preset Library` 選擇。

每個 preset 都包含 8-band `Reflection`, `Absorption`, `Transmission` 和 `Scattering` 值。可以直接編輯 ScriptableObject 來修改 material property 或新增 preset，也可以在 inspector toolbar 中 import/export `soundMaterial.json`。

## Samples

:::info 計畫中
範例文件將作為獨立頁面新增。
:::

## Troubleshooting

:::info 計畫中
疑難排解文件將作為獨立頁面新增。
:::
