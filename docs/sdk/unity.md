---
title: Unity
description: SoundTrace Unity SDK 설치, 주요 컴포넌트 API, HRTF, GPU/BVH, Surface 및 Solid Distance Transmission 설정.
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK는 Unity의 메시, Renderer 재질 슬롯, 음원, 리스너를
[STCoreV2](../core/stcorev2.md)에 연결하는 실시간 공간 음향 플러그인입니다.

이 페이지는 현재 Unity SDK의 공개 컴포넌트와 Inspector 계약을 기준으로 합니다.

## 요구 사항과 플랫폼

| 항목 | 현재 패키지 기준 |
|---|---|
| Unity | 2022.3 LTS 이상 |
| 번들 네이티브 플러그인 | macOS, Windows x64, iOS, Android |
| Linux | 현재 패키지에 바이너리가 없으므로 Linux 호스트에서 별도 빌드 필요 |
| Unity WebGL | 미지원. Unity WebGL에서는 `OnAudioFilterRead` 기반 DSP 처리를 사용할 수 없음 |

`Use GPU Backend`는 propagation의 반사·리버브 연산에 WebGPU compute provider를
요청합니다. 회절은 CPU에서 계산합니다. 실제 활성 여부는 네이티브 플러그인과 장치에서
결정되며, GPU 초기화에 실패하면 CPU로 실행합니다.

## 설치

SoundTrace Unity SDK 패키지와 설치 안내는 계약된 평가·라이선스 배포 채널로
제공합니다. 전달받은 배포본의 설치 절차를 따르십시오.

샘플은 Package Manager에서 SoundTrace SDK를 선택한 뒤 `Samples > Demo Assets > Import`로
가져옵니다.

## Unity Audio 설정

1. `Edit > Project Settings > Audio`를 엽니다.
2. `Default Speaker Mode`를 `Stereo`로 설정합니다.
3. `DSP Buffer Size`를 `Best latency`로 설정합니다.

![Unity Audio 설정](/img/unity/Image01_AudioSetting.png)

Manager와 Listener Inspector는 이 설정이 다르면 경고를 표시합니다.

## Audio Asset Import 설정

모노 사운드 소스 사용을 전제로 하며, 오디오 클립은 PCM 포맷으로 설정합니다.

![Audio Asset Import 설정](/img/unity/ImportSetting.png)

## 가장 빠른 설정

1. 빈 GameObject에 `SoundTraceManager`를 추가합니다.
2. Main Camera에 `SoundTraceListener`를 추가합니다.
3. 음원 GameObject에 `SoundTraceSource`를 추가하고 같은 GameObject의 `AudioSource`에 clip을 지정합니다.
4. 음향 geometry로 사용할 Mesh GameObject에 `SoundTraceObject`를 추가합니다.
5. 필요하면 Manager와 같은 GameObject에 `SoundTracePathVisualizer`를 추가합니다.
6. Play Mode에서 Console 오류, 소리, path를 확인합니다.

동시에 로드된 scene 전체에서 활성 Manager와 Path Visualizer는 각각 하나만 사용할 수
있습니다. 여러 Listener를 등록할 수 있지만 Source 렌더링은 첫 번째로 등록된
`PrimaryListener`를 사용합니다.

## 컴포넌트 개요

| 컴포넌트 | 역할 | 필수 의존성 |
|---|---|---|
| `SoundTraceManager` | 런타임, scene, 재질 등록, propagation backend 관리 | 런타임당 1개 |
| `SoundTraceListener` | Listener transform, ray 품질, 출력/HRTF 설정 | 활성 Manager |
| `SoundTraceSource` | `AudioSource` 출력 공간화, path별 설정 | 같은 GameObject의 `AudioSource`, 활성 Listener |
| `SoundTraceObject` | Mesh와 submesh 재질을 음향 scene에 등록 | `MeshFilter`, `MeshRenderer` |
| `SoundTracePathVisualizer` | 유효 path와 hit triangle 디버그 표시 | Manager와 같은 GameObject |

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| 필드 | 기본값 | 동작 |
|---|---:|---|
| `bool propagateOnStart` | `true` | `Start()`에서 초기 scene graph와 transform을 동기화한 뒤 첫 propagation을 요청합니다. |
| `bool loadDefaultMaterialsOnEnable` | `true` | `OnEnable()`에서 번들 Material Preset Library를 네이티브 material table에 등록합니다. |
| `int propagationThreadCount` | `-1` | 사운드 엔진 내부 propagation job의 실행 스레드 수를 지정합니다. 네이티브에서 `-1`은 `std::thread::hardware_concurrency()`로 조회한 논리 스레드 수를 기준으로 자동 설정하고, `0`과 `1`은 싱글쓰레드로 작동합니다. `2` 이상은 호출 스레드를 포함하여 지정한 수만큼 사용합니다. |
| `bool useGpuBackend` | `false` | propagation을 job 멀티스레드가 아닌 GPU compute shader로 계산합니다. |
| `int pathCacheSize` | `256` | 최소 `0`, 최대 `1024`인 생성 path의 cache buffer size입니다. 값이 높을수록 공간 음향감은 좋아지지만 계산량도 함께 증가합니다. 기기 성능에 따라 기본값 `256`보다 낮게 설정하여 시작하는 것을 권장합니다. |

### 공개 프로퍼티

| 프로퍼티 | 타입 / 접근 | 정확한 의미 |
|---|---|---|
| `Instance` | `static SoundTraceManager` / `get; private set;` | 동시에 로드된 scene 전체에서 사용하는 싱글턴 Manager입니다. 없으면 `null`입니다. |
| `DefaultMaterialsLoaded` | `int` / `get; private set;` | `OnEnable()`에서 자동 등록된 번들 재질 수입니다. 자동 로드를 끄거나 asset이 없으면 `0`입니다. |
| `Scene` | `SoundScene` / `get; private set;` | Manager가 소유한 저수준 scene입니다. 비활성 상태이거나 초기화에 실패하면 `null`입니다. |
| `PrimaryListener` | `SoundTraceListener` / `get` | 가장 먼저 등록된 Listener입니다. Source 렌더링이 이 Listener를 사용하며, 없으면 `null`입니다. |
| `ListenerCount` | `int` / `get` | 현재 Manager에 등록된 Listener 수입니다. |
| `SourceCount` | `int` / `get` | 현재 Manager에 등록된 Source 수입니다. |
| `ObjectCount` | `int` / `get` | 현재 Manager에 등록된 Object 수입니다. |
| `LastValidPathCount` | `int` / `get; private set;` | 가장 최근에 완료된 propagation 결과의 유효 path 수입니다. propagation을 실행할 수 없으면 `0`입니다. |
| `LastNativeError` | `string` / `get; private set;` | 최근 scene graph 또는 propagation 오류입니다. 오류가 없으면 빈 문자열입니다. |
| `PropagationThreadCount` | `int` / `get` | 프로파게이션 잡쓰레드의 실행 쓰레드 개수입니다. `-1`은 최대치를 의미합니다. |
| `IsGpuPropagate` | `bool` / `get; private set;` | `exaPropagatorInitGpu()`가 성공해 GPU propagation provider가 활성화되었는지 나타냅니다. |
| `GpuBackendStatus` | `string` / `get; private set;` | GPU Backend 초기화 결과입니다: `GPU active` 또는 `CPU fallback (<ExaResult>): <error>`. |
| `PathCacheSize` | `int` / `get` | 생성 path의 cache buffer size입니다. |

### 공개 메서드

| 메서드 | 동작 |
|---|---|
| `public void ResetMotionState()` | teleport, respawn, scene 전환 직후 모든 등록 Listener와 Source의 motion history를 초기화합니다. |

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

보통 Main Camera에 추가합니다.

### Inspector

| 필드 | 기본값 | 범위/선택지 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`, `Fast`, `Middle`, `Quality` |
| `Ray Resolution` | `16` | `1..32`; 가로/세로에 같은 값 적용 |
| `Ray Depth` | `4` | `1..16` |
| `Output Mode` | `Headset` | `Headset`, `Speaker` |
| `HRTF` | `HRIR Interpolated` | 아래 세 모드 |

`Fast`, `Middle`, `Quality`를 선택하면 ray 값과 연결된 render 품질 값이 함께 적용되고
ray 필드는 Inspector에서 비활성화됩니다. 값을 직접 편집하려면 먼저 `Custom`을
선택하십시오. 프리셋에서 `Custom`으로 돌아오면 마지막으로 적용된 값이 유지됩니다.

| 프리셋 | Ray Resolution | Ray Depth | 권장 시작점 |
|---|---:|---:|---|
| `Custom` | 저장된 값 | 저장된 값 | 수동 튜닝 |
| `Fast` | `16` | `4` | 모바일, 많은 음원 |
| `Middle` | `24` | `8` | 일반 게임과 데스크톱 |
| `Quality` | `32` | `12` | 음향 비중이 크고 기타 비중이 적은 앱 |

### HRTF와 출력 모드

| 모드 | 필요한 asset | 설명 |
|---|---|---|
| `Band8` | 없음 | 외부 HRTF table을 로드하지 않는 경량 모드 |
| `Hrir` | `KU100_convolution.bytes` | HRIR 모드 |
| `HRIR Interpolated` | `KU100_convolution.bytes` | HRIR 모드에 보간 계산을 적용해 방향감을 올려줍니다. |

Asset은 `Runtime/Resources/SoundTrace/HRTF/`에서 로드됩니다. 필요한 asset이 없거나 비어
있으면 Listener 초기화가 실패하며 다른 모드로 자동 전환되지 않습니다.

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource`는 같은 GameObject의 `AudioSource` 출력을 처리합니다. 활성화할 때
SoundTrace가 공간화와 Doppler를 담당하도록 `AudioSource.spatialBlend`와
`AudioSource.dopplerLevel`을 `0`으로 설정합니다.

### Inspector

| 필드 | 기본값 | 동작 |
|---|---:|---|
| `Intensity` | `1` | Source 방사 강도입니다. 범위는 `0..10`입니다. |
| `Ray Resolution` | `24` | Reverb ray의 가로·세로 해상도에 같은 값을 적용합니다. 범위는 `1..32`입니다. |
| `Reverb Ray Depth` | `4` | Reverb ray의 최대 반사 깊이입니다. 범위는 `1..16`입니다. |
| `Enable Direct` | `true` | Direct path를 활성화합니다. |
| `Enable Reflection` | `true` | Reflection path를 활성화합니다. |
| `Enable Diffraction` | `true` | Diffraction path를 활성화합니다. |
| `Enable Reverb` | `true` | Reverb path를 활성화합니다. |
| `Enable Transmission` | `true` | Transmission path를 활성화합니다. |
| `Direct Attenuation` | `1.0` | Direct path의 거리 감쇠입니다. 값이 클수록 같은 거리에서 소리가 더 작게 들립니다. 범위는 `0.5..1.5`입니다. |
| `Reflection Attenuation` | `1.0` | Reflection path의 거리 감쇠입니다. 값이 클수록 같은 거리에서 소리가 더 작게 들립니다. 범위는 `0.5..1.5`입니다. |
| `Diffraction Attenuation` | `1.0` | Diffraction path의 거리 감쇠입니다. 값이 클수록 같은 거리에서 소리가 더 작게 들립니다. 범위는 `0.5..1.5`입니다. |
| `Reverb Attenuation` | `1.0` | Reverb path의 거리 감쇠입니다. 값이 클수록 같은 거리에서 소리가 더 작게 들립니다. 범위는 `0.5..1.5`입니다. |
| `Transmission Attenuation` | `1.0` | Transmission path의 거리 감쇠입니다. 값이 클수록 같은 거리에서 소리가 더 작게 들립니다. 범위는 `0.5..1.5`입니다. |
| `Max Delay Seconds` | `1.0 s` | Source renderer가 유지하는 최대 propagation delay입니다. 길어질수록 메모리 사용량이 많아집니다. 범위는 `0.01..5 s`입니다. |
| `Path Fade Time Seconds` | `0.066 s` | Path가 renderer에 들어오거나 사라질 때 적용하는 fade 시간입니다. 범위는 `0.001..0.5 s`입니다. |
| `Path Hold Time Seconds` | `0.120 s` | 사라진 non-direct path가 fade를 시작하기 전까지 유지하는 시간입니다. `0`은 hold를 끕니다. |
| `Max Delay Rate` | `0.1` | sample마다 허용하는 최대 delay 변화량입니다. 범위는 `0.001..0.999`입니다. |
| `Bypass` | `false` | SoundTrace spatial rendering을 건너뛰고 원본 `AudioSource` 출력을 그대로 전달합니다. |

Distance Attenuation 값이 클수록 해당 path의 거리 감쇠가 빨라집니다. `Show Gizmo`는
Direct, Reflection, Diffraction, Reverb, Transmission별 도달 범위를 Scene View에
독립적으로 표시합니다.

Render Tuning은 source-listener 쌍에 적용됩니다. `Path Hold = 0`은 hold를 끕니다.

### 공개 메서드

| 메서드 | 동작 |
|---|---|
| `SetBypass(bool enabled)` | `true`이면 SoundTrace spatial rendering을 건너뛰고 원본 `AudioSource` 출력을 그대로 전달합니다. `false`이면 SoundTrace rendering을 다시 적용합니다. |
| `ResetMotionState()` | 현재 Transform을 motion 기준점으로 다시 설정하고 속도를 `0`으로 반영하여 teleport나 respawn 뒤 Doppler spike를 방지합니다. |

여러 `AudioSource`의 재생 시점을 맞출 때는 동일한 `AudioSettings.dspTime`을 기준으로
`PlayScheduled()`를 호출하십시오.

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject`는 `MeshFilter.sharedMesh`와 Renderer의 submesh 재질 슬롯을 등록합니다.
Build에서 메시 데이터를 읽어야 하므로 Import Settings의 `Read/Write Enabled`를 켜십시오.

### Geometry와 BVH

![Scene View에 표시한 BVH](/img/unity/Img_STObjDome.png)

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`, `LBVH`, `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Update Mode` | `Static` | `Static`, `Dynamic`, `Refit`, `Rebuild` |

#### BVH Type

| BVH Type | 설명 |
|---|---|
| `HKDTree` | KD 분할 기반 traversal입니다. Refit을 지원하지만 Refit 뒤에는 BVH-style fallback traversal로 전환됩니다. GPU backend는 지원하지 않습니다. |
| `LBVH` | Morton code 기반으로 HKDTree보다 rebuild가 빠르고 Refit을 지원합니다. 저수준 API로 vertex를 업로드한 뒤 Refit하여 SkinnedMesh나 procedural mesh 변형에 적용할 수 있습니다. Scalar 형식은 GPU backend를 지원하지 않습니다. |
| `LBVH_SIMD4` | LBVH leaf intersection을 4개 단위로 SIMD 병렬 처리합니다. Refit 지원 및 GPU Backend 지원. |
| `LBVH_SIMD8` | LBVH leaf intersection을 8개 단위로 SIMD 병렬 처리하는 현재 기본값입니다. Refit 지원 및 GPU Backend 지원. |
| `LBVH_SIMD16` | LBVH leaf intersection을 16개 단위로 SIMD 병렬 처리합니다. Refit 지원 및 GPU Backend 지원. |

GPU를 요청한 scene에서 `HKDTree` 또는 scalar `LBVH`를 선택하면 Inspector가 경고합니다.

#### Update Mode

| Update Mode | STCoreV2 update policy | 의미 |
|---|---|---|
| `Static` | `EXA_OBJECT_UPDATE_STATIC` (0) | 런타임 TLAS/BLAS 갱신이 없습니다. 움직이지 않는 level geometry에 사용합니다. |
| `Refit` | `EXA_OBJECT_UPDATE_REFIT` (1) | Deformation용 정책입니다. mesh BLAS를 refit하고 TLAS bounds를 갱신합니다. topology가 유지되는 skinned·procedural mesh가 대상입니다. |
| `Rebuild` | `EXA_OBJECT_UPDATE_REBUILD` (2) | Topology가 바뀌는 geometry에 사용하며 BVH를 다시 빌드합니다. |
| `Dynamic` | `EXA_OBJECT_UPDATE_DYNAMIC` (3) | Transform만 바뀔 때 TLAS instance만 갱신합니다. |

#### Refit과 vertex 업로드

`Refit`은 STCoreV2에서 **vertex 변형(skinned animation)을 위한 update policy**입니다.
다만 core는 vertex를 언제 올릴지 스스로 정하지 않습니다. mesh 갱신은
`exaMeshUpdateVertices` → `exaMeshRefit`의 2-call protocol이고, object의 `Refit`은 그
결과가 BLAS와 TLAS bounds에 반영되도록 하는 정책 스위치입니다. 즉 **vertex를 올리는 주체는
host SDK**입니다.

현재 Unity의 `SoundTraceObject` MonoBehaviour는 Transform만 자동으로 동기화하고 vertex
업로드는 호출하지 않습니다. `MeshFilter`/`MeshRenderer`를 요구하므로 `SkinnedMeshRenderer`를
직접 바인딩하지 않고, mesh geometry는 `OnEnable` 시점에 한 번 스냅샷됩니다. 따라서 Unity에서
skinned·procedural 변형을 사운드에 반영하려면 `Update Mode`를 `Refit`으로 두고 아래처럼
`MeshCore`로 vertex를 직접 올리십시오. UE 플러그인의 `SoundTracingObjectComponent`는 이
업로드를 skeletal mesh에 대해 자동으로 수행합니다.

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

        // 1) 현재 pose를 굽고 vertex를 읽습니다. Unity Mesh API이므로 main thread입니다.
        skin.BakeMesh(_baked);
        Vector3[] baked = _baked.vertices;
        if (_vertices == null || _vertices.Length != baked.Length)
            _vertices = new ExaVec3f[baked.Length];
        for (int i = 0; i < baked.Length; ++i)
            _vertices[i] = new ExaVec3f(baked[i].x, baked[i].y, baked[i].z);

        // 2) 업로드와 refit은 control thread에서 2-call protocol로 수행합니다.
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

주의할 점입니다.

- vertex 개수는 build 시점과 **정확히 일치**해야 합니다. `exaMeshUpdateVertices`는 개수가
  다르면 `EXA_ERR_INVALID_ARG`로 거부합니다. `MeshFilter.sharedMesh`에 `SkinnedMeshRenderer`의
  bind pose mesh를 넣어 count를 맞추십시오.
- vertex는 mesh local 좌표계 그대로 올립니다. object의 position·rotation·scale은
  `SoundTraceObject`가 별도로 동기화하므로 `BakeMesh`도 scale을 적용하지 않은 형태를
  사용하십시오.
- native mesh는 `SoundTraceMeshCache`가 Mesh asset·material slot·BVH 설정을 키로 refcount
  공유합니다. 같은 조합을 쓰는 object가 여럿이면 하나를 refit할 때 전부 같은 변형을 받습니다.
  개체별로 다르게 변형하려면 object마다 별도 Mesh instance를 사용하십시오.
- `SoundTraceControlThread.Invoke`는 blocking 호출입니다. 매 프레임 다수의 object에 대해
  호출하면 main thread가 control thread의 propagation frame 뒤에서 대기합니다. refit 대상은
  소수의 object로 제한하십시오.
- BVH Type은 refit 가능한 `LBVH` 계열을 사용하십시오. `HKDTree`도 refit되지만 이후 traversal이
  BVH-style fallback으로 전환됩니다.
- triangle index가 바뀌는 topology 변경은 refit으로 처리할 수 없습니다. `MeshCore.SetData(...)`로
  다시 빌드하고 `Update Mode`를 `Rebuild`로 두십시오.

### 공개 메서드

`Auto Set`은 Renderer material 이름을 번들 preset과 매칭합니다. Imported model root에
mesh가 없고 child가 geometry를 소유하면 `Add To Child Meshes`를 사용하십시오.

| 메서드 | 동작 |
|---|---|
| `AutoSetMaterialSlots()` | 모든 submesh를 순회하며 Renderer material 이름을 번들 preset과 자동 매칭하고 슬롯 구성을 갱신합니다. |
| `GetMaterialPresetIndex(int slotIndex)` | 지정한 슬롯의 preset index를 반환합니다. 슬롯이 없거나 index가 유효하지 않으면 `0`을 반환합니다. |
| `GetPresetName(int slotIndex)` | 지정한 슬롯에 적용된 preset의 표시 이름을 반환합니다. preset을 찾지 못하면 `Concrete`를 반환합니다. |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 한 슬롯의 preset을 변경합니다. `presetIndex`는 최소 `0`으로 보정되며 슬롯 index가 유효하지 않으면 `false`를 반환합니다. |
| `SetMaterialPresetForAllSlots(int presetIndex)` | 모든 슬롯에 같은 preset을 적용합니다. `presetIndex`는 최소 `0`으로 보정되며 적용할 슬롯이 없으면 `false`를 반환합니다. |
| `GetNativeMaterialIndices()` | submesh별 preset index를 native mesh 등록 형식의 배열로 반환합니다. 비어 있거나 누락된 슬롯은 `0`을 사용합니다. |
| `GetTriangleCount()` | 모든 submesh의 index 수를 합산해 triangle 수를 반환합니다. mesh가 없으면 `0`입니다. |
| `static IsGpuCompatibleBvhType(BvhType value)` | `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16`이면 `true`를 반환합니다. |

## 사운드 재질과 Transmission

기본 authoring asset은
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`입니다.
`SoundTrace > Material Preset Library`에서 다음 작업을 수행합니다.

- preset 추가, 삭제, 순서 변경
- `soundMaterial.json` import/export 및 번들 JSON 재가져오기
- Scattering과 8-band Reflection, Absorption, Transmission 그래프 편집
- `Transmission Model` 선택

![Material Preset Library](/img/unity/Image_Mat_01.png)

주파수 대역 중심은 `67.5`, `125`, `250`, `500`, `1000`, `2000`, `4000`,
`8000 Hz`입니다. 재질 순서와 table index는 일치해야 합니다.

![재질 대역별 그래프 편집](/img/unity/Image_Mat_02.png)

### Transmission Model

| 모델 | 입력 | Geometry 조건 |
|---|---|---|
| `Surface` | 각 대역에서 표면을 통과한 뒤 남는 전송 에너지 계수 `0..1` | 열린 면과 얇은 surface에 사용 가능 |
| `Solid Distance` | 각 대역에서 전송 에너지가 `-30 dB`가 되는 재질 기준 거리(m), `0` 이상 | 닫힌 볼륨과 일관된 면 방향 필요 |

`Solid Distance`의 입력은 object의 실제 두께가 아닙니다. 런타임은 geometry 내부의 실제
통과 거리에 따라 감쇠를 적용합니다. 모드를 변경해도 8개 값은 자동 계산되지 않으므로,
검증한 값을 모두 입력하고 기본 `0` 상태로 두지 마십시오.

JSON에서 `transmissionDistanceToMinus30DbMeters`가 없으면 `Surface`, 정확히 8개의 유한한
0 이상 값으로 존재하면 `Solid Distance`입니다. `Surface`로 export할 때 이 필드는
`null`이나 빈 배열이 아니라 생략됩니다.

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

Manager와 같은 GameObject에 하나만 추가합니다.

| Inspector 필드 | 기본값 | 설명 |
|---|---:|---|
| `Enable Path Visualization` | 켜짐 | path mesh 표시 여부 |
| `Refresh Interval Ms` | `50` | 시각화 mesh 재생성 최소 간격. 음향 propagation 주기에는 영향 없음 |
| `Max Visualized Paths` | `1024` | 표시할 최대 path 수 |
| `Path Width` | `0.08` | 선 폭 |
| `Path Alpha Intensity` | `0.5` | 표시 강도 |
| `Draw Hit Triangles` | 꺼짐 | Scene View에서 hit triangle 표시 |

Direct, Reflection, Diffraction, Reverb, Transmission을 path 종류별 색으로 표시합니다.
이 컴포넌트는 디버그용이며 성능 측정과 release build에서는 비활성화하십시오.

주요 공개 멤버는 `Instance`, 설정/카운트 프로퍼티, `Render()`, `Clear()`입니다.

## 샘플

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

기본 room, source, listener, geometry, material preset과 path visualization을 확인합니다.

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

source/listener 이동, material preset 변경, Unity 원본 audio와 SoundTrace 출력 비교를
확인합니다.

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

넓은 공간의 여러 source, wall occlusion, 이동 중 HRTF 방향감과 room response를 확인합니다.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소리가 나지 않음 | Console의 첫 Manager 초기화 오류, Stereo/Best latency, AudioSource clip, Manager/Listener 존재 여부 |
| Source/Listener/Object가 Manager를 요구함 | cascade 오류보다 먼저 기록된 `Failed to initialize SoundTraceManager` 원인 확인 |
| HRTF 초기화 실패 | 선택한 모드의 Resources asset 존재 여부와 빈 파일 여부 |
| Geometry가 반영되지 않음 | `Read/Write Enabled`, MeshFilter/MeshRenderer, child mesh 위치, 등록 상태 |
| 실행 중 변형 mesh가 반영되지 않음 | `Update Mode`만으로 vertex/topology가 업로드되지 않음. 별도 저수준 geometry 갱신 경로 필요 |
| GPU가 활성화되지 않음 | `GpuBackendStatus`, Console fallback 사유, Object의 SIMD BVH 선택 확인 |
| Teleport 뒤 pitch가 튐 | transform 변경 직후 `ResetMotionState()` 호출 |
| 성능이 부족함 | `Quality → Middle → Fast`, path cache buffer 축소, path visualizer 비활성화 순서로 확인 |
| 여러 음원이 comb filtering처럼 들림 | 동일한 `AudioSettings.dspTime`으로 `PlayScheduled()` 실행 |

## 다음 문서

- [SDK 개요](./overview.md)
- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
