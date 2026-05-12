---
title: STCoreV2
---

# STCoreV2

**采用模块化声学路径搜索和 lock-free 数据传递的下一代 Sound Tracing core。**

STCoreV2 是 [STCore](./stcore.md) 的后续线路。它是一个 C++ 库，可从网格、材质、听者和声源实时合成脉冲响应 (IR) 与空间音频。

## 概览

| 项目 | 值 |
|---|---|
| 基准分支 | `feat/lock-free-hybrid-v2-reverb` (lock-free reverb) |
| 主要语言 | C++ (C++17 build，暴露 C API) |
| 构建系统 | CMake 3.22+ |
| 平台 | macOS · Windows · Linux |
| Web 构建 | 支持 Emscripten (`EMSCRIPTEN_KEEPALIVE` export) |
| 加速器 | 内置 BVH **或** external callback（游戏引擎 BVH 等） |
| Max Path Depth | **16** (`EXA_MAX_DEPTH`) |
| 测试 | Google Test (unit + benchmark) |
| 状态 | 活跃开发 |

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

引擎大致分为四层。

- **Scene → Snapshot** — 每个 tick 将场景状态捕获为基于 POD 的 `SceneSnapshot`，并通过 `TripleBuffer` lock-free 传递给 propagation/render 线程。
- **Propagation (模块化)** — 四类模块运行在 `IPathModule` 公共接口之上，可替换算法并比较数值行为。加速器既可以使用内置 BVH，也可以通过 callback 委托给主机侧 BVH。
- **Auralizator** — 将追踪到的路径合成为 IR，并应用 filter、frequency decomposition、HRTF 生成空间音频。
- **Audio Output** — 经过声道映射后返回给调用方。

## 模块结构

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

通过 C linkage API (`exasoundC.h`, **约 120 个 export**) 公开。

| 类别 | 代表函数 |
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
| 结果查询 | `exaGetValidPathCount`, `exaGetValidPaths`, `exaGetSortedIRDatas` |
| 诊断/可视化 | `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot`, `exaGetLastError` |

## 开始使用

### 要求

- CMake 3.22 或更高
- C++17 兼容编译器
- macOS · Windows · Linux

### 构建

```bash
cd exaSound
cmake -S . -B build
cmake --build build
```

包含测试:

```bash
cmake -S . -B build -DBUILD_TESTS=ON
cmake --build build --target unit_tests
./build/tests/unit/unit_tests
```

### 最小使用场景（伪代码）

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

> 上面代码只是展示 API 流程。实际签名请查看 `exasoundC.h`。

## 核心概念

### Path Module 结构

传播算法分离为四类模块，并在内部 pipeline 中工作。

| 模块 | 路径类型 | 位置 |
|---|---|---|
| `SpecularReflectionModule` | 镜面反射 | `propagation/module/reflection/` |
| `UTDDiffractionModule` | 绕射(UTD) | `propagation/module/diffraction/` |
| `DiffuseOffsetModule` | 散射 | `propagation/module/diffuse/` |
| `StaticReverbModule` | 静态混响 | `propagation/module/reverb/` |

每个模块实现 `IPathModule`，并分两阶段运行。

1. **Phase 1 — `buildSetupPlanes`**：从 guide ray 结果构建 SetupPlane
2. **Phase 2 — `validatePaths`**：追踪并验证路径，把有效路径写入输出 buffer

Specular 到 Diffuse 之间通过 `ScatterHandoffEntry` 传递 path 状态。

### Lock-free snapshot (`SceneSnapshot`)

场景状态在每个 tick 被捕获为 immutable POD snapshot。

- 所有结构都是扁平数组、non-virtual、无 heap pointer，可复制到 `TripleBuffer` slot
- propagation/audio 线程读取不同 slot，lock-free 运行
- geometry 由独立 BVH double buffer 管理（Phase 3）

因此多线程仿真与渲染无需 mutex 也能安全进行。

### Material 模型

`SoundTriangle` 直接存储 **absorption** 和 **transmission**。不使用独立 Material ID/pointer，反射计算遵循：

```
reflection = 1 - (absorption + transmission)
```

`ExaRayHit` 结构暴露 `materialId` 字段，因此 ray cast 时可以直接识别命中的材质。

### Ray Count 与 Ray Depth

按 listener 设置 ray 数量和最大反射深度。

| 函数 | 效果 |
|---|---|
| `exaListenerSetRayCount(id, n)` | 设置 ray 数量 |
| `exaListenerSetRayDepth(id, d)` | 设置最大深度 (`1 ≤ d ≤ EXA_MAX_DEPTH = 16`) |

当前 build 的 path depth 上限是 `EXA_MAX_DEPTH = 16`。

### Diffuse Scattering 选项

`ExaSTOption` 添加了散射相关参数，用于微调仿真。

| 字段 | 含义 |
|---|---|
| `diffuseEnabled` | 启用/禁用散射 |
| `diffuseStartDepth` | 开始散射的反射深度，默认 5 |
| `diffuseMaxOffsetRadius` | 散射 offset 半径 |
| `diffuseCurveA/B/C` | 距离和角度的散射曲线系数 |
| `guideDiffuseEnabled` | 使用 guide diffuse ray |
| `guideDiffuseListenerHeadRadius` | 听者头部半径，默认 0.0875 m |

### HRTF

```c
exaListenerSetHRTFFromFile(listenerID, "/path/to/hrtf");
exaListenerSetHRTFFromMemory(listenerID, dataPtr, dataSize);
```

### 结果查询

| 形式 | 函数 |
|---|---|
| 有效路径（可视化/调试） | `exaGetValidPathCount`, `exaGetValidPaths` |
| 排序后的 IR（卷积输入） | `exaGetSortedIRDatas` |
| Guide Plane / Mirror Position（诊断） | `exaPropagatorGetGuidePlanes`, `exaPropagatorGetMirrorPositions` |

`ExaPathData` 按 `pos[0]=source`, `pos[1..N]=hit points`, `pos[N+1]=listener` 的顺序存储。

### Object Update Type

```c
exaObjectSetUpdateType(objID, eUpdateTypeData);  // 0=Static, 1=Refit, 2=Rebuild
```

静态 object 可以避免每帧 BVH refit 成本。

## 诊断与统计

| 函数 | 用途 |
|---|---|
| `exaGetStatistics()` | ray、path、时间统计 |
| `exaPropagatorGetProfile(sceneID)` | 传播阶段 profile |
| `exaPropagatorGetGuidePlanes/MirrorPositions` | 算法内部状态 |
| `exaGetMemoryTraceSnapshot()` | 内存使用 snapshot |
| `exaGetLastError()` | 最后一条错误消息 |

## 参考

- [STCore vs STCoreV2](./comparison.md) — 两代功能比较表
- [STCore](./stcore.md) — 第一代 core
- [SDK 概览](../sdk/overview.md)
- [Sound Tracing 是什么?](../intro/what-is-soundtracing.md)
