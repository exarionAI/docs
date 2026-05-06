---
title: STCoreV2
---

# STCoreV2

**통계적 음향 전파(Statistical Sound Propagation, SSP) 기반의 차세대 Sound Tracing
코어.**

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
| 테스트 | Google Test |
| 상태 | 활성 개발 |

## 아키텍처

엔진은 세 개의 큰 모듈로 구성됩니다.

```
┌──────────────────────────────────────────────────┐
│  Scene                                           │
│    └─ Object  ←  Mesh (vertices/tris) + Material │
│    └─ SoundSource (위치·방향·강도·속도)          │
│    └─ Listener (위치·자세·HRTF)                  │
└────────────────────┬─────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐   ┌──────────────────────┐
│ Propagation       │   │ Auralization         │
│  - Ray/Path 탐색  │   │  - IR 합성           │
│  - BVH·SoundMesh  │   │  - 컨볼루션·HRTF     │
│  - Guide/Mirror   │   │  - 출력 채널 매핑    │
└───────────────────┘   └──────────────────────┘
```

- **Scene** — 시뮬레이션 대상 세계의 정적·동적 데이터를 관리합니다.
- **Propagation** — 광선 추적 + 평면 기반 처리로 유효 음향 경로를 탐색합니다.
- **Auralization** — 탐색된 경로를 IR로 합성하고 음원과 컨볼루션하여 출력 신호를
  생성합니다. HRTF가 적용 가능합니다.

## Public C API

엔진은 C 링키지 API(`exasoundC.h`, 약 110개 export 함수)로 공개됩니다. 모든 바인딩
(Web/Python/Unity/Unreal)이 이 헤더를 통해 코어에 접근하도록 설계되어 있습니다.

| 카테고리 | 대표 함수 |
|---|---|
| 라이프사이클 | `exaInit`, `exaReset`, `exaGetVersion` |
| Scene | `exaNewScene`, `exaDeleteScene`, `exaTickScene`, `exaSceneAddObject/Source/Listener` |
| Object | `exaNewObject`, `exaObjectSetPosition/Rotation/Scale/Mesh` |
| Mesh | `exaNewMesh`, `exaMeshSetData`, `exaMeshUpdateVertices`, `exaMeshRefit`, `exaMeshSetMaterial` |
| Material | `exaAddSoundMaterial`, `exaSetSoundMaterial` |
| SoundSource | `exaNewSoundSource`, `exaSoundSourceSetPosition/Direction/Velocity/Intensity` |
| Listener | `exaNewListener`, `exaListenerSetPosition/Orientation/Velocity`, `exaListenerSetRayCount/RayDepth`, `exaListenerSetHRTFFromFile/Memory` |
| Renderer | `exaCreateRenderer`, `exaRenderSound`, `exaRemoveRenderer` |
| 결과 조회 | `exaGetValidPathCount`, `exaGetValidPaths`, `exaGetSortedIRDatas` |
| 진단 | `exaPropagatorGetProfile`, `exaGetStatistics`, `exaGetLastError` |

세부 시그니처와 구조체는 [`exasoundC.h`](#) 헤더를 참고하세요. (외부 공개 시
헤더 링크를 별도 안내합니다.)

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
exaListenerSetRayDepth(listenerID, 8);
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

> 위 코드는 API 흐름을 보여주는 의사 예제입니다. 실제 시그니처는 [exasoundC.h](#)에서 확인하세요.

## 핵심 개념

### Material 모델

`SoundTriangle` 단위에 **흡수율(absorption)**과 **투과율(transmission)**을 직접
저장합니다. 별도 Material ID/포인터를 두지 않으며, 반사 계산은 다음 규칙을
따릅니다.

```
reflection = 1 - (absorption + transmission)
```

경로 시각화·통계 구조체에는 흡수 계수만 노출됩니다.

### Ray Count · Ray Depth

청취자별로 광선 개수와 최대 반사 깊이를 설정합니다.

- **Ray Count** — 청취자에서 발사하는 광선 수. 클수록 IR 정밀도↑, 비용↑
- **Ray Depth** — 광선이 처리할 최대 반사·투과 단계 수 (`EXA_MAX_DEPTH = 16`)

| 함수 | 효과 |
|---|---|
| `exaListenerSetRayCount(id, n)` | 광선 수 설정 |
| `exaListenerSetRayDepth(id, d)` | 최대 깊이 설정 (1–16) |

### HRTF (선택)

청취자에 HRTF 데이터를 적용하면 머리 모양·귀 위치를 반영한 입체감을 얻을 수
있습니다.

```c
exaListenerSetHRTFFromFile(listenerID, "/path/to/sofa-or-binary.hrtf");
// 또는 메모리에서:
exaListenerSetHRTFFromMemory(listenerID, dataPtr, dataSize);
```

### 결과 조회

시뮬레이션 결과는 두 가지 형태로 얻을 수 있습니다.

- **유효 경로(Valid Paths)** — 음원→반사→청취자에 도달한 광선의 기하 정보.
  `exaGetValidPathCount` / `exaGetValidPaths`로 조회. 시각화·디버깅에 활용.
- **정렬된 IR(Sorted IR Datas)** — 시간축으로 정렬된 임펄스 응답.
  `exaGetSortedIRDatas`로 조회. 컨볼루션 입력으로 사용.

### Object Update Type

오브젝트의 정적/동적 여부를 명시해 BVH refit 빈도를 제어할 수 있습니다.

```c
exaObjectSetUpdateType(objID, eUpdateTypeData);
```

정적 오브젝트는 매 프레임 BVH refit 비용을 피할 수 있습니다.

## 진단·통계

| 함수 | 용도 |
|---|---|
| `exaGetStatistics()` | 광선/경로/시간 통계 |
| `exaPropagatorGetProfile(sceneID)` | 전파 단계별 프로파일 |
| `exaPropagatorGetGuidePlanes/MirrorPositions` | 알고리즘 내부 상태 (디버깅·시각화용) |
| `exaGetMemoryTraceSnapshot()` | 메모리 사용 스냅샷 |
| `exaGetLastError()` | 마지막 에러 메시지 |

## 참고

- [STCore vs STCoreV2](./comparison.md) — 두 세대의 기능 비교 표
- [STCore](./stcore.md) — 1세대 코어
- [SDK 개요](../overview.md)
- [무엇을 해결하는가 — Sound Tracing이란?](../../intro/what-is-soundtracing.md)
