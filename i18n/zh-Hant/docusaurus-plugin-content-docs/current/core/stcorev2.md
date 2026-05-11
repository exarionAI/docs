---
title: STCoreV2
---

# STCoreV2

**采用模組化聲學路徑搜尋和 lock-free 資料傳递的下一代 Sound Tracing core。**

STCoreV2 是 [STCore](./stcore.md) 的後續線路。它是一個 C++ 函式庫，可從網格、材質、聽者和聲源即時合成脈衝響應 (IR) 與空間音訊。

## 概覽

| 專案 | 值 |
|---|---|
| 基準分支 | `feat/lock-free-hybrid-v2-reverb` (lock-free reverb) |
| 主要語言 | C++ (C++17 build，暴露 C API) |
| 建置系統 | CMake 3.22+ |
| 平台 | macOS · Windows · Linux |
| Web 建置 | 支援 Emscripten (`EMSCRIPTEN_KEEPALIVE` export) |
| 加速器 | 内置 BVH **或** external callback（遊戲引擎 BVH 等） |
| Max Path Depth | **64** (`EXA_MAX_DEPTH_LIMIT`) |
| 測試 | Google Test (unit + benchmark) |
| 狀態 | 活躍開發 |

## 架构

```
                Scene
                  │
                  ▼
        SceneSnapshot  ── lock-free per-tick snapshot
                  │       (TripleBuffer · POD · immutable)
                  ▼
        ┌─────────────────────────────────────────────┐
        │  Propagation                                │
        │   ├ IAccelerator                            │
        │   │   ├ Internal BVH                        │
        │   │   └ ExternalAccelerator (callback)      │
        │   └ Path Modules  (IPathModule)             │
        │       ├ SpecularReflectionModule            │
        │       ├ UTDDiffractionModule                │
        │       ├ DiffuseOffsetModule                 │
        │       └ StaticReverbModule                  │
        │       (+ ScatterHandoff, ComparisonReport)  │
        └─────────────────────────────────────────────┘
                  │
                  ▼
        Auralizator (filter / frequence / HRTF / states)
                  │
                  ▼
              Audio Output
```

引擎大致分為四層。

- **Scene → Snapshot** — 每個 tick 將場景狀態捕获為基於 POD 的 `SceneSnapshot`，並透過 `TripleBuffer` lock-free 傳递给 propagation/render 執行緒。
- **Propagation (模組化)** — 四類模組執行在 `IPathModule` 共用介面之上，可替換演算法並比較數值行為。加速器既可以使用内置 BVH，也可以透過 callback 委托给主機侧 BVH。
- **Auralizator** — 將追蹤到的路徑合成為 IR，並應用 filter、frequency decomposition、HRTF 產生空間音訊。
- **Audio Output** — 经過聲道映射後返回给调用方。

## 模組結構

```
exaSound/
├── src/
│   ├── core/                    # engine core
│   │   ├── EngineConfig         #  engine settings
│   │   ├── SceneSnapshot         #  immutable per-tick snapshot
│   │   ├── SnapshotBuilder       #  snapshot builder
│   │   ├── ExternalAccelerator   #  external BVH callback
│   │   ├── IAccelerator          #  accelerator abstraction
│   │   ├── Handle / Ref / FixedPool / PoolAllocator
│   │   ├── ThreadAffinity / Telemetry
│   │   └── PropagationResult
│   ├── propagation/
│   │   ├── Propagator            #  top-level dispatch
│   │   ├── RGC                   #  Ray Generation Cluster
│   │   ├── module/               #  Path Module abstraction
│   │   │   ├── IPathModule       #   common interface
│   │   │   ├── PathModuleRegistry
│   │   │   ├── reflection/       #   SpecularReflectionModule
│   │   │   ├── diffraction/      #   UTDDiffractionModule
│   │   │   ├── diffuse/          #   DiffuseOffsetModule
│   │   │   └── reverb/           #   StaticReverbModule
│   │   ├── UTDDiffraction.hpp    #  UTD formula
│   │   └── Ray/                  #  ray and plane utilities
│   ├── auralizator/              # auralization
│   │   ├── core / filter / frequence / HRTF / states
│   ├── scene/
│   │   ├── SoundObject           #  Object / Mesh / Preprocessing
│   │   └── BVH                   #  Native BVH/TLAS
│   ├── math/, utils/, objects/, config/
│   ├── exasound.h                # C++ main header
│   └── exasoundC.h               # **public C API**
├── tests/                        # Google Test
└── demo/                         # demos
```

## Public C API

透過 C linkage API (`exasoundC.h`, **约 120 個 export**) 公開。

| 類別 | 代表函數 |
|---|---|
| 生命周期 | `exaInit`, `exaReset`, `exaGetVersion`, `exaGetPathTypeCount` |
| Scene | `exaNewScene`, `exaTickScene`, `exaSceneAddObject/Source/Listener` |
| Object | `exaNewObject`, `exaObjectSetPosition/Rotation/Scale/Mesh`, `exaObjectSetUpdateType` |
| Mesh | `exaNewMesh`, `exaMeshSetData`, `exaMeshUpdateVertices`, `exaMeshRefit`, `exaMeshSetMaterial` |
| Material | `exaAddSoundMaterial`, `exaSetSoundMaterial` |
| SoundSource | `exaNewSoundSource`, `exaSoundSourceSetPosition/Direction/Velocity/Intensity` |
| Listener (basic) | `exaNewListener`, `exaListenerSetPosition/Orientation/Velocity`, `exaListenerSetRayCount/RayDepth` |
| Listener (HRTF) | `exaListenerSetHRTFFromFile/Memory` |
| Renderer | `exaCreateRenderer`, `exaRenderSound`, `exaRemoveRenderer` |
| 結果查詢 | `exaGetValidPathCount`, `exaGetValidPaths`, `exaGetSortedIRDatas` |
| 診斷/視覺化 | `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot`, `exaGetLastError` |

## 開始使用

### 要求

- CMake 3.22 或更高
- C++17 兼容编譯器
- macOS · Windows · Linux

### 建置

```bash
cd exaSound
cmake -S . -B build
cmake --build build
```

包含測試:

```bash
cmake -S . -B build -DBUILD_TESTS=ON
cmake --build build --target unit_tests
./build/tests/unit/unit_tests
```

### 最小使用場景（伪程式碼）

```c
#include "exasoundC.h"

// 1. Initialize the engine
exaInit();

// 2. Create a scene
int sceneID = exaNewScene();

// 3. Register a mesh and assign material
int meshID = exaNewMesh();
exaMeshSetData(meshID, vertices, vertexCount, indices, indexCount);
exaMeshSetMaterial(meshID, materialIndex);

// 4. Attach the mesh to an object and add it to the scene
int objID = exaNewObject();
exaObjectSetMesh(objID, meshID);
exaObjectSetPosition(objID, 0.f, 0.f, 0.f);
exaSceneAddObject(sceneID, objID);

// 5. Configure source and listener
int srcID = exaNewSoundSource();
exaSoundSourceSetPosition(srcID, 1.f, 1.f, 0.f);
exaSoundSourceSetIntensity(srcID, 1.0f);
exaSceneAddSource(sceneID, srcID);

int listenerID = exaNewListener();
exaListenerSetPosition(listenerID, -1.f, 1.f, 0.f);
exaListenerSetRayCount(listenerID, 4096);
exaListenerSetRayDepth(listenerID, 16);    // up to EXA_MAX_DEPTH = 64
exaSceneAddListener(sceneID, listenerID);

// 6. Simulate and render audio each frame
for (;;) {
  exaTickScene(sceneID, deltaTime);
  exaRenderSound(/* render args */);
  // Query results through exaGetValidPaths / exaGetSortedIRDatas
}

// 7. Clean up
exaReset();
```

> 上面程式碼只是展示 API 流程。實際籤名請查看 `exasoundC.h`。

## 核心概念

### Path Module 結構

傳播演演算法分离為四類模組，並在內部 pipeline 中工作。

| 模組 | 路徑類型 | 位置 |
|---|---|---|
| `SpecularReflectionModule` | 镜面反射 | `propagation/module/reflection/` |
| `UTDDiffractionModule` | 繞射(UTD) | `propagation/module/diffraction/` |
| `DiffuseOffsetModule` | 散射 | `propagation/module/diffuse/` |
| `StaticReverbModule` | 靜態混響 | `propagation/module/reverb/` |

每個模組實作 `IPathModule`，並分两阶段執行。

1. **Phase 1 — `buildSetupPlanes`**：從 guide ray 結果建置 SetupPlane
2. **Phase 2 — `validatePaths`**：追蹤並驗證路徑，把有效路徑写入輸出 buffer

Specular 到 Diffuse 之間透過 `ScatterHandoffEntry` 傳递 path 狀態。

### Lock-free snapshot (`SceneSnapshot`)

場景狀態在每個 tick 被捕获為 immutable POD snapshot。

- 所有結構都是扁平陣列、non-virtual、无 heap pointer，可複製到 `TripleBuffer` slot
- propagation/audio 執行緒读取不同 slot，lock-free 執行
- geometry 由独立 BVH double buffer 管理（Phase 3）

因此多執行緒模擬與渲染无需 mutex 也能安全进行。

### Material 模型

`SoundTriangle` 直接存储 **absorption** 和 **transmission**。不使用独立 Material ID/pointer，反射计算遵循：

```
reflection = 1 - (absorption + transmission)
```

`ExaRayHit` 結構暴露 `materialId` 字段，因此 ray cast 時可以直接识別命中的材質。

### Ray Count 與 Ray Depth

按 listener 設定 ray 數量和最大反射深度。

| 函數 | 效果 |
|---|---|
| `exaListenerSetRayCount(id, n)` | 設定 ray 數量 |
| `exaListenerSetRayDepth(id, d)` | 設定最大深度 (`1 ≤ d ≤ EXA_MAX_DEPTH = 64`) |

> **Note**: 舊的 `EXA_MAX_DEPTH = 16` 限制已擴充為 `EXA_MAX_DEPTH_LIMIT = 64`，同時保留 backward-compatible alias。

### Diffuse Scattering 選項

`ExaSTOption` 新增了散射相關参數，用於微调模擬。

| 字段 | 含义 |
|---|---|
| `diffuseEnabled` | 啟用/停用散射 |
| `diffuseStartDepth` | 開始散射的反射深度，預設 5 |
| `diffuseMaxOffsetRadius` | 散射 offset 半徑 |
| `diffuseCurveA/B/C` | 距离和角度的散射曲線系數 |
| `guideDiffuseEnabled` | 使用 guide diffuse ray |
| `guideDiffuseListenerHeadRadius` | 聽者头部半徑，預設 0.0875 m |

### HRTF

```c
exaListenerSetHRTFFromFile(listenerID, "/path/to/hrtf");
exaListenerSetHRTFFromMemory(listenerID, dataPtr, dataSize);
```

### 結果查詢

| 形式 | 函數 |
|---|---|
| 有效路徑（視覺化/调試） | `exaGetValidPathCount`, `exaGetValidPaths` |
| 排序後的 IR（卷積輸入） | `exaGetSortedIRDatas` |
| Guide Plane / Mirror Position（診斷） | `exaPropagatorGetGuidePlanes`, `exaPropagatorGetMirrorPositions` |

`ExaPathData` 按 `pos[0]=source`, `pos[1..N]=hit points`, `pos[N+1]=listener` 的顺序存储。

### Object Update Type

```c
exaObjectSetUpdateType(objID, eUpdateTypeData);  // 0=Static, 1=Refit, 2=Rebuild
```

靜態 object 可以避免每帧 BVH refit 成本。

## 診斷與統計

| 函數 | 用途 |
|---|---|
| `exaGetStatistics()` | ray、path、時間統計 |
| `exaPropagatorGetProfile(sceneID)` | 傳播阶段 profile |
| `exaPropagatorGetGuidePlanes/MirrorPositions` | 演算法內部狀態 |
| `exaGetMemoryTraceSnapshot()` | 記憶體使用 snapshot |
| `exaGetLastError()` | 最後一条錯誤訊息 |

## 參考

- [STCore vs STCoreV2](./comparison.md) — 兩代功能比較表
- [STCore](./stcore.md) — 第一代 core
- [SDK 概覽](../sdk/overview.md)
- [Sound Tracing 是什麼?](../intro/what-is-soundtracing.md)
