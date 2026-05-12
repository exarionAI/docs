---
title: STCoreV2
---

# STCoreV2

**モジュール式の音響経路探索とlock-freeデータ転送を採用した次世代Sound Tracingコア。**

STCoreV2は [STCore](./stcore.md) の後継ラインです。メッシュ、材質、リスナー、音源からインパルス応答（IR）と空間オーディオをリアルタイムに合成するC++ライブラリです。

## 概要

| 項目 | 値 |
|---|---|
| 基準ブランチ | `feat/lock-free-hybrid-v2-reverb` (lock-free reverb) |
| 主言語 | C++ (C++17ビルド、C API公開) |
| ビルドシステム | CMake 3.22+ |
| プラットフォーム | macOS · Windows · Linux |
| Webビルド | Emscripten対応 (`EMSCRIPTEN_KEEPALIVE` export) |
| アクセラレータ | 内蔵BVH **または** External callback（ゲームエンジンBVHなど） |
| Max Path Depth | **16** (`EXA_MAX_DEPTH`) |
| テスト | Google Test (unit + benchmark) |
| 状態 | アクティブ開発 |

## アーキテクチャ

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

エンジンは大きく4層で構成されます。

- **Scene → Snapshot** — 毎tickのシーン状態をPODベースの`SceneSnapshot`として取得し、`TripleBuffer`を通してpropagation/rendererスレッドへlock-freeで渡します。
- **Propagation (モジュール式)** — `IPathModule`共通インターフェース上で4種類のモジュールが動作します。モジュールごとにアルゴリズムの差し替えや数値比較が可能です。アクセラレータは内蔵BVHに加え、ホスト側BVHへコールバック委譲できます。
- **Auralizator** — 追跡済み経路をIRへ合成し、filter、frequency decomposition、HRTFを適用して空間オーディオを生成します。
- **Audio Output** — チャンネルマッピング後に呼び出し側へ返します。

## モジュール構成

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

C linkage API (`exasoundC.h`, **約120 export**) として公開されます。

| カテゴリ | 代表関数 |
|---|---|
| ライフサイクル | `exaInit`, `exaReset`, `exaGetVersion`, `exaGetPathTypeCount` |
| Scene | `exaNewScene`, `exaTickScene`, `exaSceneAddObject/Source/Listener` |
| Object | `exaNewObject`, `exaObjectSetPosition/Rotation/Scale/Mesh`, `exaObjectSetUpdateType` |
| Mesh | `exaNewMesh`, `exaMeshSetData`, `exaMeshUpdateVertices`, `exaMeshRefit`, `exaMeshSetMaterial` |
| Material | `exaAddSoundMaterial`, `exaSetSoundMaterial` |
| SoundSource | `exaNewSoundSource`, `exaSoundSourceSetPosition/Direction/Velocity/Intensity` |
| Listener (basic) | `exaNewListener`, `exaListenerSetPosition/Orientation/Velocity`, `exaListenerSetRayCount/RayDepth` |
| Listener (HRTF) | `exaListenerSetHRTFFromFile/Memory` |
| Renderer | `exaCreateRenderer`, `exaRenderSound`, `exaRemoveRenderer` |
| 結果取得 | `exaGetValidPathCount`, `exaGetValidPaths`, `exaGetSortedIRDatas` |
| 診断・可視化 | `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot`, `exaGetLastError` |

## はじめに

### 要件

- CMake 3.22以上
- C++17互換コンパイラ
- macOS · Windows · Linux

### ビルド

```bash
cd exaSound
cmake -S . -B build
cmake --build build
```

テスト込み:

```bash
cmake -S . -B build -DBUILD_TESTS=ON
cmake --build build --target unit_tests
./build/tests/unit/unit_tests
```

### 最小利用シナリオ（疑似コード）

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
exaListenerSetRayDepth(listenerID, 16);    // up to EXA_MAX_DEPTH = 16
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

> このコードはAPIの流れを示す疑似例です。実際のシグネチャは`exasoundC.h`で確認してください。

## 主要概念

### Path Module構造

伝搬アルゴリズムは4種類のモジュールに分離され、内部パイプラインで動作します。

| モジュール | 経路タイプ | 位置 |
|---|---|---|
| `SpecularReflectionModule` | 鏡面反射 | `propagation/module/reflection/` |
| `UTDDiffractionModule` | 回折(UTD) | `propagation/module/diffraction/` |
| `DiffuseOffsetModule` | 散乱 | `propagation/module/diffuse/` |
| `StaticReverbModule` | 静的残響 | `propagation/module/reverb/` |

各モジュールは`IPathModule`を実装し、2段階で動作します。

1. **Phase 1 — `buildSetupPlanes`**: Guide ray結果からSetupPlaneを構成
2. **Phase 2 — `validatePaths`**: 経路を追跡・検証し、有効経路を出力バッファへ記録

SpecularからDiffuseへは`ScatterHandoffEntry`でpath状態が渡されます。

### Lock-free snapshot (`SceneSnapshot`)

シーン状態は毎tick immutable POD snapshotとして取得されます。

- すべての構造はフラット配列、non-virtual、heap pointerなしで、`TripleBuffer`スロットへ値コピー可能
- propagation/audioスレッドは別スロットを読み、lock-freeで動作
- geometryは別BVH double bufferで管理（Phase 3）

この構造により、mutexなしでマルチスレッドのシミュレーションとレンダリングを安全に進められます。

### Materialモデル

`SoundTriangle`単位に**absorption**と**transmission**を直接保存します。別Material ID/pointerは持たず、反射は次の規則で計算します。

```
reflection = 1 - (absorption + transmission)
```

`ExaRayHit`には`materialId`フィールドがあり、ray cast時に衝突材質を直接識別できます。

### Ray Count・Ray Depth

リスナーごとにray数と最大反射深度を設定します。

| 関数 | 効果 |
|---|---|
| `exaListenerSetRayCount(id, n)` | ray数を設定 |
| `exaListenerSetRayDepth(id, d)` | 最大深度 (`1 ≤ d ≤ EXA_MAX_DEPTH = 16`) |

現在のbuildではpath depth上限は`EXA_MAX_DEPTH = 16`です。

### Diffuse Scatteringオプション

`ExaSTOption`には散乱関連パラメータがあり、シミュレーションを微調整できます。

| フィールド | 意味 |
|---|---|
| `diffuseEnabled` | 散乱処理のon/off |
| `diffuseStartDepth` | 散乱を開始する反射深度（default 5） |
| `diffuseMaxOffsetRadius` | 散乱offset半径 |
| `diffuseCurveA/B/C` | 距離・角度に対する散乱曲線係数 |
| `guideDiffuseEnabled` | Guide diffuse rayを使用 |
| `guideDiffuseListenerHeadRadius` | リスナー頭部半径（default 0.0875m） |

### HRTF

```c
exaListenerSetHRTFFromFile(listenerID, "/path/to/hrtf");
exaListenerSetHRTFFromMemory(listenerID, dataPtr, dataSize);
```

### 結果取得

| 形式 | 関数 |
|---|---|
| 有効経路（可視化・デバッグ） | `exaGetValidPathCount`, `exaGetValidPaths` |
| ソート済みIR（コンボリューション入力） | `exaGetSortedIRDatas` |
| Guide Plane / Mirror Position（診断） | `exaPropagatorGetGuidePlanes`, `exaPropagatorGetMirrorPositions` |

`ExaPathData`は`pos[0]=source`, `pos[1..N]=hit points`, `pos[N+1]=listener`の順に保存されます。

### Object Update Type

```c
exaObjectSetUpdateType(objID, eUpdateTypeData);  // 0=Static, 1=Refit, 2=Rebuild
```

静的オブジェクトは毎フレームのBVH refitコストを避けられます。

## 診断・統計

| 関数 | 用途 |
|---|---|
| `exaGetStatistics()` | ray・path・時間統計 |
| `exaPropagatorGetProfile(sceneID)` | 伝搬段階別プロファイル |
| `exaPropagatorGetGuidePlanes/MirrorPositions` | アルゴリズム内部状態 |
| `exaGetMemoryTraceSnapshot()` | メモリ使用snapshot |
| `exaGetLastError()` | 最後のエラーメッセージ |

## 参考

- [STCore vs STCoreV2](./comparison.md) — 2世代の機能比較表
- [STCore](./stcore.md) — 第1世代コア
- [SDK概要](../sdk/overview.md)
- [Sound Tracingとは?](../intro/what-is-soundtracing.md)
