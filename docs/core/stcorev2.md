---
title: STCoreV2
---

# STCoreV2

**모듈식 음향 경로 탐색과 lock-free 데이터 전달을 채택한 차세대 Sound Tracing 코어.**

STCoreV2는 [STCore](./stcore.md)의 후속 라인으로, 메시·재질·청취자·음원으로부터
임펄스 응답(IR)과 공간 오디오를 실시간 합성하는 C++ 라이브러리입니다.

## 개요

| 항목 | 값 |
|---|---|
| 기준 브랜치 | `feat/lock-free-hybrid-v2-reverb` (lock-free reverb) |
| 주 언어 | C++ (C++17 빌드, C API 노출) |
| 빌드 시스템 | CMake 3.22+ |
| 플랫폼 | macOS · Windows · Linux |
| Web 빌드 | Emscripten 지원 (`EMSCRIPTEN_KEEPALIVE` export) |
| 가속기 | 내장 BVH **또는** External callback (게임 엔진 BVH 등) |
| Max Path Depth | **64** (`EXA_MAX_DEPTH_LIMIT`) |
| 테스트 | Google Test (unit + benchmark) |
| 상태 | 활성 개발 |

## 아키텍처

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

엔진은 크게 네 계층입니다.

- **Scene → Snapshot** — 매 틱 장면 상태가 POD 기반 `SceneSnapshot`으로 떠지고,
  `TripleBuffer`를 통해 propagation·렌더 스레드에 lock-free로 전달됩니다.
- **Propagation (모듈식)** — `IPathModule` 공통 인터페이스 위에 4종 모듈이 동시
  실행되며, 모듈별로 알고리즘 교체·수치 비교가 가능합니다. 가속기는 내장 BVH
  외에도 호스트 측 BVH를 콜백으로 위임할 수 있습니다.
- **Auralizator** — 추적된 경로를 IR로 합성하고, 필터·주파수 분해·HRTF를
  적용하여 공간 오디오를 생성합니다.
- **Audio Output** — 채널 매핑 후 호출자에게 반환합니다.

## 모듈 구성

```
exaSound/
├── src/
│   ├── core/                    # 엔진 코어
│   │   ├── EngineConfig         #  엔진 설정
│   │   ├── SceneSnapshot         #  immutable per-tick snapshot
│   │   ├── SnapshotBuilder       #  스냅샷 빌더
│   │   ├── ExternalAccelerator   #  외부 BVH 콜백
│   │   ├── IAccelerator          #  가속기 추상
│   │   ├── Handle / Ref / FixedPool / PoolAllocator
│   │   ├── ThreadAffinity / Telemetry
│   │   └── PropagationResult
│   ├── propagation/
│   │   ├── Propagator            #  최상위 dispatch
│   │   ├── RGC                   #  Ray Generation 클러스터
│   │   ├── module/               #  Path Module 추상화
│   │   │   ├── IPathModule       #   공통 인터페이스
│   │   │   ├── PathModuleRegistry
│   │   │   ├── reflection/       #   SpecularReflectionModule
│   │   │   ├── diffraction/      #   UTDDiffractionModule
│   │   │   ├── diffuse/          #   DiffuseOffsetModule
│   │   │   └── reverb/           #   StaticReverbModule
│   │   ├── UTDDiffraction.hpp    #  UTD 공식
│   │   └── Ray/                  #  Ray·평면 유틸
│   ├── auralizator/              # 음향화 (이전 auralization)
│   │   ├── core / filter / frequence / HRTF / states
│   ├── scene/
│   │   ├── SoundObject           #  Object·Mesh·Preprocessing
│   │   └── BVH                   #  Native BVH/TLAS
│   ├── math/, utils/, objects/, config/
│   ├── exasound.h                # C++ 메인 헤더
│   └── exasoundC.h               # **공개 C API**
├── tests/                        # Google Test
└── demo/                         # 데모
```

## Public C API

C 링키지 API (`exasoundC.h`, **약 120개 export**)로 공개됩니다.

| 카테고리 | 대표 함수 |
|---|---|
| 라이프사이클 | `exaInit`, `exaReset`, `exaGetVersion`, `exaGetPathTypeCount` |
| Scene | `exaNewScene`, `exaTickScene`, `exaSceneAddObject/Source/Listener` |
| Object | `exaNewObject`, `exaObjectSetPosition/Rotation/Scale/Mesh`, `exaObjectSetUpdateType` |
| Mesh | `exaNewMesh`, `exaMeshSetData`, `exaMeshUpdateVertices`, `exaMeshRefit`, `exaMeshSetMaterial` |
| Material | `exaAddSoundMaterial`, `exaSetSoundMaterial` |
| SoundSource | `exaNewSoundSource`, `exaSoundSourceSetPosition/Direction/Velocity/Intensity` |
| Listener (기본) | `exaNewListener`, `exaListenerSetPosition/Orientation/Velocity`, `exaListenerSetRayCount/RayDepth` |
| Listener (HRTF) | `exaListenerSetHRTFFromFile/Memory` |
| Renderer | `exaCreateRenderer`, `exaRenderSound`, `exaRemoveRenderer` |
| 결과 조회 | `exaGetValidPathCount`, `exaGetValidPaths`, `exaGetSortedIRDatas` |
| 진단·시각화 | `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot`, `exaGetLastError` |

## 시작하기

### 요구사항

- CMake 3.22 이상
- C++17 호환 컴파일러
- macOS · Windows · Linux

### 빌드

```bash
cd exaSound
cmake -S . -B build
cmake --build build
```

테스트 포함:

```bash
cmake -S . -B build -DBUILD_TESTS=ON
cmake --build build --target unit_tests
./build/tests/unit/unit_tests
```

### 최소 사용 시나리오 (의사 코드)

```c
#include "exasoundC.h"

// 1. 엔진 초기화
exaInit();

// 2. 장면 생성
int sceneID = exaNewScene();

// 3. 메시 등록 + 재질 부여
int meshID = exaNewMesh();
exaMeshSetData(meshID, vertices, vertexCount, indices, indexCount);
exaMeshSetMaterial(meshID, materialIndex);

// 4. 오브젝트에 메시를 붙이고 장면에 추가
int objID = exaNewObject();
exaObjectSetMesh(objID, meshID);
exaObjectSetPosition(objID, 0.f, 0.f, 0.f);
exaSceneAddObject(sceneID, objID);

// 5. 음원·청취자 설정
int srcID = exaNewSoundSource();
exaSoundSourceSetPosition(srcID, 1.f, 1.f, 0.f);
exaSoundSourceSetIntensity(srcID, 1.0f);
exaSceneAddSource(sceneID, srcID);

int listenerID = exaNewListener();
exaListenerSetPosition(listenerID, -1.f, 1.f, 0.f);
exaListenerSetRayCount(listenerID, 4096);
exaListenerSetRayDepth(listenerID, 16);    // up to EXA_MAX_DEPTH = 64
exaSceneAddListener(sceneID, listenerID);

// 6. 매 프레임 시뮬레이션 + 오디오 렌더
for (;;) {
  exaTickScene(sceneID, deltaTime);
  exaRenderSound(/* 렌더 인자 */);
  // exaGetValidPaths / exaGetSortedIRDatas 로 결과 조회
}

// 7. 정리
exaReset();
```

> 위 코드는 API 흐름을 보여주는 의사 예제입니다. 실제 시그니처는 `exasoundC.h`에서 확인하세요.

## 핵심 개념

### Path Module 구조

전파 알고리즘은 4종 모듈로 분리되어 내부 파이프라인에서 동작합니다.

| 모듈 | 경로 유형 | 위치 |
|---|---|---|
| `SpecularReflectionModule` | 정반사 | `propagation/module/reflection/` |
| `UTDDiffractionModule` | 회절(UTD) | `propagation/module/diffraction/` |
| `DiffuseOffsetModule` | 산란 | `propagation/module/diffuse/` |
| `StaticReverbModule` | 정적 잔향 | `propagation/module/reverb/` |

각 모듈은 `IPathModule`을 구현하며 두 단계로 동작합니다.

1. **Phase 1 — `buildSetupPlanes`** : Guide ray 결과로부터 SetupPlane 구성
2. **Phase 2 — `validatePaths`** : 경로 추적·검증, 유효 경로를 출력 버퍼에 기록

Specular → Diffuse 간에는 `ScatterHandoffEntry`로 path 상태가 전달됩니다.

### Lock-free 스냅샷 (`SceneSnapshot`)

장면 상태는 매 틱 immutable POD 스냅샷으로 떠집니다.

- 모든 구조는 평탄 배열·non-virtual·heap 포인터 없음 → `TripleBuffer` 슬롯에
  값 복사 가능
- propagation·audio 스레드가 별도 슬롯을 읽어 lock-free로 동작
- 지오메트리는 별도 BVH 더블 버퍼로 관리 (Phase 3)

이 구조 덕분에 다중 스레드에서 mutex 없이 안전하게 시뮬레이션·렌더가 진행됩니다.

### Material 모델

`SoundTriangle` 단위에 **흡수율(absorption)**과 **투과율(transmission)**을 직접
저장합니다. 별도 Material ID/포인터를 두지 않으며, 반사 계산은 다음 규칙입니다.

```
reflection = 1 - (absorption + transmission)
```

`ExaRayHit` 구조에는 `materialId` 필드가 노출되어 ray cast 시 어떤 재질에
충돌했는지 직접 식별할 수 있습니다.

### Ray Count · Ray Depth

청취자별로 광선 개수와 최대 반사 깊이를 설정합니다.

| 함수 | 효과 |
|---|---|
| `exaListenerSetRayCount(id, n)` | 광선 수 설정 |
| `exaListenerSetRayDepth(id, d)` | 최대 깊이 (`1 ≤ d ≤ EXA_MAX_DEPTH = 64`) |

> **Note**: 이전 `EXA_MAX_DEPTH = 16` 제한은 `EXA_MAX_DEPTH_LIMIT = 64`로 4배 확장됐습니다 (backward-compat alias 유지).

### Diffuse Scattering 옵션

`ExaSTOption`에 산란 관련 파라미터가 추가되어 시뮬레이션을 미세 조정할 수 있습니다.

| 필드 | 의미 |
|---|---|
| `diffuseEnabled` | 산란 처리 on/off |
| `diffuseStartDepth` | 산란을 시작할 반사 깊이 (기본 5) |
| `diffuseMaxOffsetRadius` | 산란 offset 반경 |
| `diffuseCurveA/B/C` | 거리·각도에 대한 산란 곡선 계수 |
| `guideDiffuseEnabled` | Guide diffuse ray 사용 |
| `guideDiffuseListenerHeadRadius` | 청취자 머리 반경 (기본 0.0875m) |

### HRTF

```c
exaListenerSetHRTFFromFile(listenerID, "/path/to/hrtf");
exaListenerSetHRTFFromMemory(listenerID, dataPtr, dataSize);
```

### 결과 조회

| 형태 | 함수 |
|---|---|
| 유효 경로 (시각화·디버깅) | `exaGetValidPathCount`, `exaGetValidPaths` |
| 정렬된 IR (컨볼루션 입력) | `exaGetSortedIRDatas` |
| Guide Plane / Mirror Position (진단) | `exaPropagatorGetGuidePlanes`, `exaPropagatorGetMirrorPositions` |

`ExaPathData`는 `pos[0]=source`, `pos[1..N]=hit points`, `pos[N+1]=listener` 순으로
저장됩니다.

### Object Update Type

```c
exaObjectSetUpdateType(objID, eUpdateTypeData);  // 0=Static, 1=Refit, 2=Rebuild
```

정적 오브젝트는 매 프레임 BVH refit 비용을 피할 수 있습니다.

## 진단·통계

| 함수 | 용도 |
|---|---|
| `exaGetStatistics()` | 광선·경로·시간 통계 |
| `exaPropagatorGetProfile(sceneID)` | 전파 단계별 프로파일 |
| `exaPropagatorGetGuidePlanes/MirrorPositions` | 알고리즘 내부 상태 |
| `exaGetMemoryTraceSnapshot()` | 메모리 사용 스냅샷 |
| `exaGetLastError()` | 마지막 에러 메시지 |

## 참고

- [STCore vs STCoreV2](./comparison.md) — 두 세대의 기능 비교 표
- [STCore](./stcore.md) — 1세대 코어
- [SDK 개요](../sdk/overview.md)
- [무엇을 해결하는가 — Sound Tracing이란?](../intro/what-is-soundtracing.md)
