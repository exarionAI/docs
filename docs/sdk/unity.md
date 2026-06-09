---
title: Unity
---

# SoundTrace SDK for Unity

SoundTrace SDK for Unity는 [STCoreV2](../core/stcorev2.md) 네이티브 엔진을 Unity에서 사용하기 위한 실시간 공간 음향 플러그인입니다. Unity 씬의 메시, 렌더링 머티리얼 슬롯, 음원, 리스너 위치를 SoundTrace 런타임에 전달하고 direct, reflection, diffraction, reverb, transmission path를 계산해 Unity `AudioSource` 출력에 반영합니다.

## Requirements

| 항목 | 요구 사항 |
|---|---|
| Unity | `2022.3.62f2` 이상 |
| 플랫폼 | macOS, Windows, Linux, iOS, Android, WebGL |

## Unity Project Setup

### Unity Audio 설정

1. `Edit > Project Settings > Audio`를 엽니다.
2. `Default Speaker Mode`를 `Stereo`로 설정합니다.
3. `DSP Buffer Size`를 `Best latency`로 설정합니다.

![Unity Audio 설정 화면](/img/unity/Image01_AudioSetting.png)

## Getting Started

![모델 Read/Write 설정](/img/unity/Image02_ModelRW.png)

1. `Read/Write Enabled`가 켜진 메시를 씬에 배치하고 `SoundTraceObject`를 붙입니다.

![SoundTraceObject 컴포넌트](/img/unity/Image03_SoundTraceObject.png)

2. 리스너 역할 GameObject에 `SoundTraceListener`를 붙입니다. Unity 빌트인 `AudioListener`와 함께 구성하십시오. 기본 Unity 씬에서는 `AudioListener`가 이미 Main Camera에 붙어 있는 점에 유의하십시오.

![SoundTraceListener 컴포넌트](/img/unity/Image04_Listener.png)

3. 소스 역할 GameObject를 만들고 `SoundTraceSource`를 붙입니다. Unity `AudioSource`는 자동으로 부착됩니다.

![SoundTraceSource 컴포넌트](/img/unity/Image05_Source.png)

4. Unity `AudioSource`에 재생할 audio clip을 배정합니다.
5. 매니저 역할 GameObject를 만들고 `SoundTraceManager`와 `SoundTracePathVisualizer`를 붙입니다.

![SoundTraceManager와 Path Visualizer 컴포넌트](/img/unity/Image06_Manager.png)

6. 리스너, 소스, `SoundTraceObject` geometry가 반사 음향을 만들 수 있는 위치에 오도록 다시 배치합니다.

![리스너, 소스, 지오메트리 배치](/img/unity/Image07_Positioning.png)

7. Play Mode를 실행합니다.
8. `SoundTracePathVisualizer`에서 path visualization을 켭니다.
9. 리스너, 소스, 오브젝트 사이에 반사 path line이 보이면 기본 연결은 성공입니다.

![반사 path line 성공 확인](/img/unity/Image08_Success.png)

![Path type 색상 확인](/img/unity/Image11_PathTypes.png)

10. 빨간 라인 - 직접음(`Direct Path`)<br />주황 라인 - 반사음(`Reflection Path`)<br />초록 라인 - 회절음(`Diffraction Path`)
11. 리스너나 소스 위치를 움직여 소리가 물리적으로 변하는지 확인합니다.
12. `SoundTraceObject`의 `Update Mode`가 `Static`이면 runtime Transform 이동은 propagation에 반영되지 않으며 TLAS refit 비용도 없습니다.
13. Transform 이동을 반영해야 하는 오브젝트는 `Dynamic`으로 설정합니다.

![이동 가능한 오브젝트 설정](/img/unity/Image09_Movable.png)

14. Skinned/animated mesh처럼 topology는 유지되고 vertex 위치만 바뀌는 경우는 `Refit`을 사용합니다.
15. `Rebuild`는 topology, triangle list, BVH option, shape 구조가 실제로 바뀌는 경우에만 사용하고, 매 frame 호출되는 구성은 피합니다.

![이동 후 path 확인](/img/unity/Image10_Moved.png)

## Main Features

### SoundTraceObject

![SoundTraceObject 인스펙터](/img/unity/Image_20_Object.png)

`SoundTraceObject`는 Unity `MeshFilter`/`MeshRenderer`를 SoundTrace collision geometry로 등록합니다. 현재 `MeshFilter`와 `MeshRenderer` 기반 컴포넌트이며, SoundTrace geometry로 쓸 메시의 import setting에는 `Read/Write Enabled`가 필요합니다. `SkinnedMeshRenderer`의 vertex deformation을 매 tick 자동 bake한다고 가정하지 마십시오.

![자식 mesh object 자동 추가](/img/unity/Image12_ChildObjh.png)

여러 자식 mesh object로 구성된 import model에서는 루트 GameObject에 `SoundTraceObject`를 붙인 뒤 `Add To Child Meshes`를 눌러 mesh가 있는 전체 자식에게 컴포넌트를 추가할 수 있습니다. 이후 루트 컴포넌트의 `MeshFilter`가 비어 있다면 `Remove Root Component(s)`로 루트의 빈 컴포넌트를 제거합니다.

렌더링 머티리얼 자체를 바꾸는 기능이 아니라, 렌더링 material slot에 대응되는 submesh triangle에 SoundTrace material preset index를 붙이는 기능입니다.

### SoundTraceMaterialPresetLibrary

| ![Material Preset Library 1](/img/unity/Image_Mat_01.png) | ![Material Preset Library 2](/img/unity/Image_Mat_02.png) |
|---|---|

기본 material preset library는 패키지 내부 `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`에 있습니다. Unity 메뉴 `SoundTrace > Material Preset Library`에서 선택할 수 있습니다.

각 preset은 8-band `Reflection`, `Absorption`, `Transmission`과 `Scattering` 값을 가집니다. ScriptableObject를 직접 조작해 material property를 수정하거나 새 preset을 추가할 수 있고, inspector toolbar에서 `soundMaterial.json` import/export도 가능합니다.

### Sound material slots

- `Auto Set`은 Unity render material 이름을 보고 가장 유사한 SoundTrace material preset을 자동 배치합니다.
- 예를 들어 `Sword` 같은 판타지 칼 모델의 material 이름에 `Metal`이 들어가면 `Steel` 계열 preset으로 매칭됩니다.
- 일치하는 이름이 없거나 material이 비어 있으면 기본값은 `Concrete`입니다.
- 자동 매칭이 틀리면 각 submesh row의 dropdown에서 직접 preset을 선택합니다.
- 반사를 강하게 느끼려면 `Steel`/`Marble`, 흡음을 느끼려면 `Snow`/`Soil`, 투과를 느끼려면 `Fabric`으로 테스트하는 것을 권장합니다.

### BVH and update mode

| 설정 | 설명 |
|---|---|
| `HKDTree` | SBVH와 유사한 성격의 고디테일 구조입니다. Raycast가 빠르고 구멍이 있거나 복잡한 정적 배경 메시의 primitive detail 보존에 유리합니다. 대신 rebuild가 느립니다. |
| `LBVH` | build가 빠른 기본 LBVH입니다. 복잡한 형상에서는 세부 geometry가 더 러프하게 잡혀 designer가 만든 구멍이 막힌 것처럼 동작할 수 있습니다. |
| `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` | LBVH 계열의 SIMD variant입니다. 복잡한 씬일수록 SIMD width가 높은 옵션이 유리할 수 있습니다. |
| `bvhMaxDepth` | BVH 최대 depth입니다. 깊을수록 traversal pruning 효과를 더 크게 받을 수 있으므로 큰 값부터 테스트하는 구성을 권장합니다. |
| `primitivesPerLeaf` | 마지막 leaf node 안에 들어가는 triangle 개수입니다. 범위는 `1-128`입니다. 작게 잡을수록 detail은 좋아지지만 build/traversal cost가 달라집니다. |
| `Static` | 정적 collision geometry용입니다. runtime Transform 이동은 propagation에 반영되지 않으며 TLAS refit 비용도 없습니다. |
| `Dynamic` | Transform 이동을 propagation에 반영합니다. BLAS refit 없이 TLAS instance/bounds만 갱신합니다. |
| `Refit` | Skinned/animated mesh처럼 vertex 위치가 바뀌고 topology는 유지되는 경우에 사용합니다. |
| `Rebuild` | topology, triangle list, BVH option, shape 구조가 바뀌어 BVH를 다시 만들어야 할 때만 사용합니다. |

### SoundTraceListener

![SoundTraceListener 컴포넌트](/img/unity/Image04_Listener.png)

`SoundTraceListener`는 씬의 청취자입니다. 매 frame Transform position과 orientation을 네이티브 listener에 동기화하고, listener ray 설정과 path type enable을 소유합니다.

| 설정 | 설명 |
|---|---|
| `Ray Resolution` | 발사하는 listener guide ray 해상도입니다. 범위는 `1-32`이며, 하나의 값이 native listener width와 height에 동일하게 적용됩니다. 값이 `16`이면 `16 x 16` guide ray를 사용합니다. |
| `Ray Depth` | ray 반사/전파 depth입니다. 범위는 `1-16`입니다. 값이 클수록 잔향감과 복잡한 path 표현이 좋아지지만 연산량도 증가합니다. |
| `Per-path enable` | `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission` path를 타입별로 켜고 끕니다. |

복잡한 게임 씬의 초기값은 `Ray Resolution 16`, `Ray Depth 4`를 권장합니다.

### SoundTraceSource

![SoundTraceSource 컴포넌트](/img/unity/Image05_Source.png)

`SoundTraceSource`는 Unity `AudioSource`를 필요로 하는 SoundTrace 음원 컴포넌트입니다. Unity audio filter callback인 `OnAudioFilterRead`에서 입력 buffer를 SoundTrace spatial output으로 in-place 렌더링합니다.

| 설정 | 설명 |
|---|---|
| `Intensity` | 소스 기본 세기입니다. |
| `Gain Boost Db`, `Reverb Send Db`, `Reflection Send Db` | 전체 gain과 reverb/reflection send level을 dB 단위로 조절합니다. |
| `Reverb Rays` | 소스의 잔향 ray 설정입니다. `Ray Resolution` 범위는 `1-32`이며 reverb ray width와 height에 동일하게 적용됩니다. `Reverb Ray Depth` 범위는 `1-16`입니다. listener ray와 별도 설정입니다. |
| `Per-path enable` | 소스 단위로 path type을 켜고 끕니다. |
| `Distance Attenuation` | path type별 감쇠 범위를 조절합니다. 현재 inspector slider는 attenuation constant를 제어하며, 숫자가 클수록 영향 범위가 작아집니다. |
| `Distance Attenuation Gizmos` | path type별 감쇠 범위를 Scene View에서 wire sphere로 확인합니다. |
| `Bypass` | SoundTrace 공간 렌더링을 건너뛰고 원본 `AudioSource` 출력을 그대로 통과시킵니다. |

### SoundTraceManager

![SoundTraceManager 컴포넌트](/img/unity/Image_21_Manager.png)

`SoundTraceManager`는 씬당 하나의 SoundTrace runtime owner입니다. listener, source, object가 enable될 때 manager에 등록되고, manager가 매 frame scene tick과 propagation update를 실행합니다.

| 설정 | 설명 |
|---|---|
| `Propagation Interval Ms` | ray-trace propagation pass를 실행하는 간격입니다. position sync tick은 매 frame 돌고, propagation은 이 간격으로 throttle됩니다. |
| `Propagate On Start` | `Start()` 시점에 scene graph를 한 번 flush한 뒤 propagation pass와 visualizer update를 즉시 한 번 실행합니다. 이후 다음 propagation은 `Propagation Interval Ms` 이후에 실행됩니다. |
| `Load Default Materials On Enable` | 패키지의 기본 `SoundTraceMaterialPresetLibrary.asset`을 native material table에 등록합니다. |
| `Propagation Thread Count` | 내부 job system worker 수입니다. `-1`이면 STCoreV2가 logical hardware thread 기준으로 선택합니다. 애플리케이션 개발자가 전체 CPU budget을 보고 배정해야 하며, 실사용에서는 3개 이상부터 테스트하는 구성을 권장합니다. |
| `Path Cache Size` | `0` 이하 값이면 cache buffer를 사용하지 않습니다. `1` 이상 값이면 frame마다 path cache를 저장해 ray 개수와 음향 detail을 증가시킵니다. 권장값은 `256`, `512`, `1024`입니다. |

### SoundTracePathVisualizer

![SoundTracePathVisualizer 컴포넌트](/img/unity/Image_22_PathVisual.png)

`SoundTracePathVisualizer`는 valid path를 런타임에서 line renderer로 보여주는 디버깅 컴포넌트입니다. 반사, 회절, 잔향, 투과 path가 scene에서 어떻게 생성되는지 육안으로 확인할 때 사용합니다.

| 설정 | 설명 |
|---|---|
| `Enable Path Visualization` | path line rendering을 켜고 끕니다. |
| `Max Visualized Paths` | 화면에 표시할 최대 path 수입니다. |
| `Path Width` | line width입니다. |
| `Path Alpha Intensity` | path attenuation 기반 alpha scaling 강도입니다. |
| `Draw Valid Paths`, `Draw Hit Triangles` | Scene View debug drawing 옵션입니다. |

## Samples

:::info 준비 중
샘플 문서는 별도 페이지로 추가될 예정입니다.
:::

## Troubleshooting

:::info 준비 중
트러블슈팅 문서는 별도 페이지로 추가될 예정입니다.
:::
