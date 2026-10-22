---
title: Unity
description: SoundTrace Unity SDK 0.4.0(SimpleST 2.18.2 / ABI 6) 설치, 컴포넌트 Inspector 계약, HRTF·출력, 재질, FMOD/Wwise 통합 모드, WebGL.
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK는 Unity의 메시, Renderer 재질 슬롯, 음원, 리스너를
[SimpleST](../core/simplest.md)에 연결하는 실시간 공간 음향 플러그인입니다. 0.3.0부터 엔진이
STCoreV2에서 SimpleST로 바뀌었고, 0.4.0은 **SimpleST 2.18.2 / ABI 6**을 씁니다(이전 릴리스: 0.3.0 =
SimpleST 2.12.0). 렌더러는 **Hybrid**로 시작합니다.
`SoundTraceManager`, `SoundTraceListener`, `SoundTraceSource`, `SoundTraceObject`,
`SoundTracePathVisualizer` 컴포넌트 이름과 스크립트 GUID, 샘플 씬은 그대로입니다.

## 요구 사항과 플랫폼

| 항목 | 현재 패키지 기준 |
|---|---|
| Unity | 2022.3 LTS 이상 (2022.3.62f2 · 6000.3 검증) |
| 패키지 | `SoundTrace-SimpleST-release.unitypackage` → `Assets/SoundTrace` |
| 번들 네이티브 플러그인 | Windows x64 · macOS Universal · Linux x86_64 · Android(ARMv7/ARM64/x86_64, API 24+) · iOS 15+(device/simulator XCFramework) · WebGL |
| WebGL | 지원 — 독립 pthread WASM + AudioWorklet 경로 (`OnAudioFilterRead` 미사용) |
| GPU | 없음. `SoundTraceManager.IsGpuPropagate`는 항상 `false` |

## 설치

1. 대상 프로젝트의 Unity를 닫지 않아도 됩니다. `Assets > Import Package > Custom Package`에서
   `.unitypackage`를 선택하면 `Assets/SoundTrace`에 설치됩니다.
2. STCoreV2 기반 구버전 `Assets/SoundTrace`가 있으면 **먼저 Assets 밖으로 백업**한 뒤 임포트합니다.
   옛 네이티브 플러그인이 함께 로드되지 않게 하기 위해서입니다. 같은 SimpleST 패키지의 업데이트는
   GUID를 유지하므로 덮어써도 됩니다.
3. 배포 폴더의 `install.py`로 자동 설치할 수도 있습니다. 파일 해시·GUID를 검사하고 기존 설치를
   프로젝트의 `.simplest-backups`에 보존합니다.

```bash
python3 install.py /path/to/UnityProject
# FMOD / Wwise 플러그인까지 함께: --fmod <plugins 폴더> 또는 --wwise <plugins 폴더>
```

샘플은 Package Manager에서 SoundTrace SDK를 선택한 뒤 `Samples > Demo Assets > Import`로
가져옵니다. 샘플 UI는 `com.unity.ugui`가 있을 때만 컴파일됩니다.

## Unity Audio 설정

1. `Edit > Project Settings > Audio`를 엽니다.
2. `Default Speaker Mode`를 `Stereo`로 설정합니다.
3. `DSP Buffer Size`를 `Best latency`로 설정합니다.

![Unity Audio 설정](/img/unity/Image01_AudioSetting.png)

Manager와 Listener Inspector는 이 설정이 다르면 경고를 표시합니다. 출력 샘플레이트는 장치
값을 그대로 쓰며(SimpleST가 내부 44.1 kHz와 변환), 장치 레이트가 바뀌면 네이티브 상태를
같은 설정으로 재생성합니다.

## Audio Asset Import 설정

모노 사운드 소스 사용을 전제로 하며, 오디오 클립은 PCM 포맷으로 설정합니다. WebGL은
`Decompress On Load`가 필요합니다.

![Audio Asset Import 설정](/img/unity/ImportSetting.png)

## 가장 빠른 설정

1. 빈 GameObject에 `SoundTraceManager`를 추가합니다.
2. `AudioListener`가 있는 Main Camera에 `SoundTraceListener`를 추가합니다.
3. 음원 GameObject에 `SoundTraceSource`를 추가하고 같은 GameObject의 `AudioSource`에 clip을 지정합니다.
4. 음향 geometry로 사용할 Mesh GameObject에 `SoundTraceObject`를 추가합니다.
5. 필요하면 Manager와 같은 GameObject에 `SoundTracePathVisualizer`를 추가합니다.
6. Play Mode에서 Console 오류, 소리, path를 확인합니다.

동시에 로드된 scene 전체에서 활성 Manager와 Path Visualizer는 각각 하나만 사용할 수
있습니다. 리스너는 SimpleST 컨텍스트당 하나이며 첫 번째로 등록된 `PrimaryListener`가 렌더합니다.

## 컴포넌트 개요

| 컴포넌트 | 역할 | 필수 의존성 |
|---|---|---|
| `SoundTraceManager` | 런타임(컨텍스트·컨트롤 스레드), scene, 재질 등록, 전파 | 런타임당 1개 |
| `SoundTraceListener` | Listener transform, ray 품질, 출력/HRTF, 지연·페이드 | 활성 Manager, `AudioListener` |
| `SoundTraceSource` | `AudioSource` 출력을 모노 스트림으로 입력, path별 설정 | 같은 GameObject의 `AudioSource`, 활성 Listener |
| `SoundTraceObject` | Mesh와 submesh 재질을 음향 scene에 등록 | `MeshFilter`, `MeshRenderer` (Read/Write Enabled) |
| `SoundTracePathVisualizer` | 유효 path와 hit triangle 디버그 표시 | Manager와 같은 GameObject |

## 오디오 흐름과 스레드

- `SoundTraceSource.OnAudioFilterRead`가 입력을 **모노 호스트 스트림**(`st_rt_source_write_stream`)에
  넣고 Unity의 dry 출력을 지웁니다. `SoundTraceListener`의 콜백이 전체 공간 음향 믹스를 한 번
  가져옵니다(`st_rt_render_process`, Buffered 모드).
- 씬 변경·소스 생성/삭제·전파·시각화 스냅샷은 전용 **control thread**(`SoundTraceControlThread`)에서
  직렬 처리합니다. 오디오 콜백에는 씬 제어 API나 관리 힙 할당이 들어가지 않습니다.
- 위치는 고정 스텝 모션 샘플링(`SoundTraceFixedStepMotion`)으로 속도를 추정합니다. 텔레포트
  뒤에는 `ResetMotionState()`로 Doppler 스파이크를 막습니다.
- 렌더를 시작할 때마다(재시작·HRTF 토글 포함) Hybrid(`reserved0 = 1`)와 **엔진 리미터 끔**을 명시하고
  마스터 게인은 0 dB로 둡니다. 리미팅은 Unity 믹서가 맡습니다 — SimpleST 2.18은 생성 직후 true-peak
  리미터(137샘플 지연)를 켜므로 래퍼가 끕니다. 렌더 옵션은 엔진 생성 시와 스피커 레이아웃 변경 때만 프리셋으로
  다시 깔리고 `render_start`는 그대로 둡니다.

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| 필드 | 기본값 | 동작 |
|---|---:|---|
| `Propagate On Start` | `true` | `Start()`에서 초기 scene graph와 transform을 동기화한 뒤 첫 전파를 요청합니다. |
| `Load Default Materials On Enable` | `true` | `OnEnable()`에서 번들 Material Preset Library(SoundTrace 게임 재질 22종)를 네이티브 재질 테이블에 등록합니다. |
| `Propagation Thread Count` | `-1` | SimpleST 계산 풀 폭(`maxComputeThreads`). `-1`은 자동(논리 스레드 수 기준, 엔진이 min(퍼포먼스 코어, 6)로 조정), `0`/`1`은 싱글, `2` 이상은 지정 수. 네이티브 초기화 전에 적용됩니다. |

### 공개 프로퍼티

| 프로퍼티 | 타입 | 의미 |
|---|---|---|
| `Instance` | `static SoundTraceManager` | 싱글턴 Manager. 없으면 `null` |
| `Scene` | `SoundScene` | Manager가 소유한 저수준 scene |
| `PrimaryListener` / `ListenerCount` / `SourceCount` / `ObjectCount` | — | 등록 현황 |
| `DefaultMaterialsLoaded` | `int` | 자동 등록된 번들 재질 수 |
| `LastValidPathCount` | `int` | 가장 최근 전파의 유효 path 수 |
| `LastNativeError` | `string` | 최근 scene graph/전파 오류 |
| `PropagationThreadCount` | `int` | 적용된 계산 스레드 수 |
| `IsGpuPropagate` / `GpuBackendStatus` | `bool` / `string` | 호환용. 항상 `false` / `"CPU"` |

### 공개 메서드

| 메서드 | 동작 |
|---|---|
| `ResetMotionState()` | teleport, respawn, scene 전환 직후 모든 Listener와 Source의 motion history를 초기화합니다. |

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

보통 Main Camera에 추가합니다.

### Inspector

| 필드 | 기본값 | 범위/선택지 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`, `Fast`, `Middle`, `Quality` |
| `Ray Resolution` | `16` | `1..32`; 리스너 guide ray 가로/세로에 같은 값 |
| `Ray Depth` | `4` | `1..16`; 반사 최대 깊이 |
| `Output Mode` | `Headset` | `Headset`(바이노럴), `Speaker`(스테레오 패닝) |
| `HRTF` | `HRIR Interpolated` | 아래 세 모드 |
| `Max Delay Seconds` | `2.0 s` | `0.012..5 s`; 렌더러가 유지하는 최대 경로 지연 |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`; 경로 등장/소멸 크로스페이드 |

`Fast`, `Middle`, `Quality`를 선택하면 ray 값이 함께 적용되고 Inspector에서 잠깁니다. 직접
편집하려면 `Custom`을 선택하십시오.

| 프리셋 | Ray Resolution | Ray Depth | 권장 시작점 |
|---|---:|---:|---|
| `Custom` | 저장된 값 | 저장된 값 | 수동 튜닝 |
| `Fast` | `16` | `4` | 모바일, 많은 음원 |
| `Middle` | `24` | `8` | 일반 게임과 데스크톱 |
| `Quality` | `32` | `12` | 음향 비중이 큰 앱 |

### HRTF와 출력 모드

| 모드 | 필요한 asset | 설명 |
|---|---|---|
| `Band8` | 없음 | 외부 테이블 없는 경량 모드 — SimpleST에서는 **스테레오 패닝**으로 렌더됩니다 |
| `Hrir` | 없음 | 엔진에 내장된 **MIT KEMAR** HRIR |
| `HRIR Interpolated` | 없음 | MIT KEMAR HRIR(기본). SimpleST는 광대역 HRIR 컨볼루션을 수행합니다 |

구 `KU100_convolution.bytes` 리소스는 더 이상 쓰이지 않습니다. `Output Mode = Speaker`는
패닝 출력입니다.

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource`는 같은 GameObject의 `AudioSource` 출력을 모노 스트림으로 엔진에 밀어
넣습니다. 활성화할 때 SoundTrace가 공간화와 Doppler를 담당하도록 `AudioSource.spatialBlend`와
`AudioSource.dopplerLevel`을 `0`으로 설정합니다.

### Inspector

| 필드 | 기본값 | 동작 |
|---|---:|---|
| `Intensity` | `1` | 음원 방사 강도(압력 배율). 범위 `0..10` |
| `Reverb Ray Resolution` | `24` | source transport ray 가로·세로 해상도. 범위 `1..32` |
| `Reverb Ray Depth` | `4` | transport ray 최대 반사 깊이. 범위 `1..16` |
| `Enable Direct` / `Reflection` / `Diffraction` / `Reverb` / `Transmission` | `true` | path별 게이트 |
| `Bypass` | `false` | SoundTrace 렌더를 건너뛰고 원본 `AudioSource` 출력을 그대로 전달 |

STCoreV2의 path별 `Distance Attenuation`(0.5 ~ 1.5)과 `Max Delay Rate`, `Path Hold Time`은
없습니다. SimpleST는 물리 `1/r` 감쇠와 공기 흡수를 적용하며, 최대 지연과 페이드는 Listener
설정입니다. Scene View의 `Show Gizmo`는 path별 가청 범위를 표시합니다.

### 공개 메서드

| 메서드 | 동작 |
|---|---|
| `SetBypass(bool enabled)` | `true`이면 SoundTrace 렌더를 건너뛰고 원본 출력을 전달합니다. |
| `ResetMotionState()` | 현재 Transform을 motion 기준점으로 다시 설정해 teleport 뒤 Doppler spike를 방지합니다. |

여러 `AudioSource`의 재생 시점을 맞출 때는 동일한 `AudioSettings.dspTime`을 기준으로
`PlayScheduled()`를 호출하십시오.

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject`는 `MeshFilter.sharedMesh`와 Renderer의 submesh 재질 슬롯을 등록합니다.
Build에서 메시 데이터를 읽어야 하므로 Import Settings의 `Read/Write Enabled`를 켜십시오.
절차적 메시에는 `UploadMeshData(true)`를 호출하지 않습니다.

### Geometry와 가속구조

![Scene View에 표시한 BVH](/img/unity/Img_STObjDome.png)

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`(→ SimpleST HybridKD), `LBVH`(→ LBVH), `LBVH_SIMD4/8/16`(→ LBVH_SIMD) |
| `BVH Max Depth` / `Primitives Per Leaf` | `12` / `16` | 호환용 필드. **SimpleST가 leaf 크기를 내부에서 정하므로 무시**됩니다 |
| `Update Mode` | `Static` | `Static`(정적 TLAS) / `Dynamic`(변환만 갱신). `Refit`·`Rebuild`는 호환용 |

`BVH Type`은 메시 등록 시점의 가속구조 종류만 고릅니다. 같은 Mesh asset·재질 슬롯·BVH 설정을
쓰는 object는 `SoundTraceMeshCache`가 네이티브 메시를 refcount 공유합니다.

### 스킨드·절차적 메시

SimpleST에는 vertex refit이 없습니다. 변형된 지오메트리를 반영하려면 새 Mesh를 굽고
`SoundTraceObject`를 다시 등록(또는 `MeshCore.SetData`)해 **새 네이티브 메시로 교체**합니다.
매 프레임 교체는 비용이 크므로 주기적으로(예: 0.2 ~ 0.5 s) 갱신하십시오.

### 공개 메서드

`Auto Set`은 Renderer material 이름을 번들 preset과 매칭합니다. Imported model root에
mesh가 없고 child가 geometry를 소유하면 `Add To Child Meshes`를 사용하십시오.

| 메서드 | 동작 |
|---|---|
| `AutoSetMaterialSlots()` | 모든 submesh의 Renderer material 이름을 번들 preset과 자동 매칭합니다. |
| `GetMaterialPresetIndex(int slotIndex)` / `GetPresetName(int slotIndex)` | 슬롯의 preset index / 표시 이름을 반환합니다. |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 한 슬롯의 preset을 변경합니다. |
| `SetMaterialPresetForAllSlots(int presetIndex)` | 모든 슬롯에 같은 preset을 적용합니다. |
| `GetNativeMaterialIndices()` | submesh별 preset index를 네이티브 등록 형식의 배열로 반환합니다. |
| `GetTriangleCount()` | 모든 submesh의 triangle 수를 반환합니다. |
| `static IsGpuCompatibleBvhType(BvhType value)` | 호환용. SIMD 계열이면 `true` |

## 사운드 재질

기본 authoring asset은 `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`
입니다. `SoundTrace > Material Preset Library`에서 다음 작업을 수행합니다.

- preset 추가, 삭제, 순서 변경
- `soundMaterial.json` import/export 및 번들 JSON 재가져오기
- Scattering과 **9밴드** Reflection, Absorption, Transmission 그래프 편집

![Material Preset Library](/img/unity/Image_Mat_01.png)

주파수 대역 중심은 `63`, `125`, `250`, `500`, `1000`, `2000`, `4000`, `8000`, `16000 Hz`입니다.
각 밴드의 `R + A + T`는 `1`이어야 하며 허용오차는 `0.001`입니다. 잘못된 길이와 계수는 오류로
보고하고, 8밴드 입력을 9밴드로 자동으로 채우지 않습니다.

기본 재질은 SoundTrace 게임 재질 22종으로, 이전 버전과 이름·인덱스가 같습니다. 기존 씬의 재질
슬롯 인덱스는 원래 재질을 그대로 가리킵니다.

| 인덱스 | 재질 |
|---|---|
| 0 ~ 5 | `Concrete`, `Fabric`, `Wood`, `Brick`, `ConcreteBlock`, `Glass` |
| 6 ~ 11 | `Gravel`, `GypsumBoard`, `Linoleum,RubberOrAsphaltTile`, `Marble`, `Plaster`, `Plywood` |
| 12 ~ 17 | `Sherdded-woodFiberborad`, `Snow`, `Soil`, `Steel`, `Stone`, `WaterSurface` |
| 18 ~ 21 | `TunableAbsorber`, `LowVarianceTarget`, `ConcreteBlockPainted`, `FiberglassReinforcedPlastic` |

측정 데이터가 아닌 게임용 프리셋입니다. 기존 8밴드(63 Hz ~ 8 kHz) 값에서 반사 R과 투과 T는 그대로
두고, 흡수는 A = 1 − R − T, 16 kHz 밴드는 8 kHz 값을 반복, scattering은 9밴드에 같은 값으로
변환했습니다. 엔진과 밴드 구성이 바뀌었으므로 STCore와 음향 결과가 똑같지는 않습니다. 사용자 재질은
9밴드로 다시 입력합니다.

![재질 대역별 그래프 편집](/img/unity/Image_Mat_02.png)

STCoreV2의 `Transmission Model`(`Surface` / `Solid Distance`)은 없습니다. 투과는 밴드별 표면
투과 계수 `T`로만 표현합니다.

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

Manager와 같은 GameObject에 하나만 추가합니다.

| Inspector 필드 | 기본값 | 설명 |
|---|---:|---|
| `Enable Path Visualization` | 켜짐 | path mesh 표시 여부 |
| `Refresh Interval Ms` | `50` | 시각화 mesh 재생성 최소 간격. 전파 주기에는 영향 없음 |
| `Max Visualized Paths` | `1024` | 표시할 최대 path 수 (`16..5000`) |
| `Path Width` | `0.08` | 선 폭 |
| `Path Alpha Intensity` | `0.5` | 표시 강도 |
| `Path Depth Mode` / `Sorting Layer` / `Sorting Order` | `AlwaysOnTop` / `Default` / `10` | 렌더 정렬 |
| `Draw Hit Triangles` | 꺼짐 | Scene View에서 hit triangle 표시 |

Direct, Reflection, Diffraction, Reverb, Transmission을 path 종류별 색으로 표시합니다.
디버그용이며 성능 측정과 release build에서는 비활성화하십시오. 주요 공개 멤버는
`Active`, `Render()`, `Clear()`입니다.

## FMOD와 함께 쓰기

프로젝트에 SimpleST FMOD 플러그인(`SimpleSTFmod`)이 있으면 SoundTrace는 자동으로 **FMOD 통합**으로
동작합니다. 공간 음향 렌더는 FMOD Studio의 SimpleST Source / Listener DSP가 하고, SoundTrace는
`SoundTraceManager` + `SoundTraceObject`로 지오메트리·재질만 플러그인 컨텍스트에 올립니다.
`SoundTraceListener` / `SoundTraceSource`는 경고를 남기고 꺼집니다.

![Unity FMOD 설치 메뉴](/img/fmod/unity-install-menu.png)

1. FMOD for Unity 2.04를 설치합니다(tgz 설치본은 `Packages/`로 embed).
2. **SoundTrace › FMOD › Install SimpleST FMOD Plug-in...** 메뉴에서 `SimpleSTFmod`가 있는 폴더
   (예: `fmod/plugins`, Mac은 `mac/plugins`)를 고릅니다. DLL/bundle이 FMOD 플러그인 폴더에 복사되고
   FMOD Settings › Dynamic Plugins에 등록됩니다.
3. FMOD Studio에서 마스터 버스에 **SimpleST Listener**, 3D 이벤트 마스터 트랙에 FMOD Spatializer 대신
   **SimpleST Source**를 넣습니다 — [FMOD 플러그인](./fmod.md).
4. 씬에는 `SoundTraceManager`와 지오메트리용 `SoundTraceObject`, FMOD `StudioListener`를 둡니다.

엔진 인스턴스는 하나입니다. SimpleSTFmod가 SoundTrace가 P/Invoke하는 같은 `SimpleSTRealtime`을
로드하고, 모든 제어 호출은 플러그인의 컨트롤 스레드에서 실행됩니다. 2026-10-07 Unity 6000.3 +
FMOD for Unity 2.04 E2E 통과(오브젝트 0→6→0, 경로 1→266→1).

## Wwise와 함께 쓰기

Wwise Unity 통합의 DSP 폴더에 `SimpleSTWwise`가 있으면 **Wwise 통합**으로 동작합니다(FMOD가
함께 있으면 FMOD 우선).

![Unity Wwise 설치 메뉴](/img/wwise/unity-install-menu.png)

1. Audiokinetic Launcher로 Wwise Unity 통합을 설치합니다.
2. **SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** 메뉴에서 `SimpleSTWwise`가 있는 폴더를
   고릅니다. DSP 폴더에 복사되고 Wwise 사운드엔진이 로드합니다.
3. Wwise 프로젝트에서 Audio Objects 버스에 **Sound-tracing Renderer**를 넣고 3D 사운드를 그 버스로
   보냅니다(Attenuation은 끄거나 평탄) — [Wwise 플러그인](./wwise.md).
4. 씬에는 `AkInitializer`, `AkAudioListener`, 이미터의 `AkGameObj`와 `SoundTraceManager`,
   `SoundTraceObject`를 둡니다. Wwise Unity의 단위는 미터이므로 `sceneRatio = 1`입니다.

## WebGL

Unity WebGL은 `OnAudioFilterRead`를 제공하지 않으므로 별도 경로를 사용합니다. AudioClip PCM과
재생 상태를 전달하고, SimpleST buffered host renderer 결과를 공유 링버퍼로 AudioWorklet에 보냅니다.

- AudioClip은 **Decompress On Load**로 임포트합니다.
- HTTPS 또는 localhost에서 `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp` 헤더로 서비스합니다. 오디오는 사용자 입력 후 시작합니다.
- 빌드 후처리가 `Runtime/Web/*.bytes`를 `StreamingAssets/SoundTrace/`에 복사하므로 그 폴더를 함께 배포합니다.
- Unity AudioMixer 효과 체인은 WebGL의 별도 SoundTrace 출력에 적용되지 않습니다.

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

## STCoreV2에서 바뀐 계약

| 이전 | 현재 |
|---|---|
| `exaSound` / STCoreV2 진입점 | `st_rt_*` / SimpleST ABI 6 |
| 0 = 무효 핸들 | **-1 = 무효**, 0은 유효 |
| 소스마다 리스너 렌더 | 소스별 mono stream + 리스너 전체 mix |
| 8밴드 재질·scalar scattering | 63…16000 Hz **9밴드** R/A/T/scattering |
| 변경 가능한 native material | 불변 material, 새 material/mesh로 재바인딩 |
| STCore 다항식 거리 감쇠 | SimpleST 물리 거리 감쇠 |
| STCore GPU/provider/path-cache 설정 | SimpleST CPU pipeline 스케줄러 |
| KU100 Resources 테이블 | 내장 MIT KEMAR HRTF |
| `exaMeshUpdateVertices` → `exaMeshRefit` | 새 메시로 교체 |

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소리가 나지 않음 | Console의 첫 Manager 초기화 오류, Stereo/Best latency, AudioSource clip, Manager/Listener 존재 여부 |
| Source/Listener/Object가 Manager를 요구함 | cascade 오류보다 먼저 기록된 `Failed to initialize SoundTraceManager` 원인 확인 |
| 구버전과 충돌 | STCoreV2 `Assets/SoundTrace`를 Assets 밖으로 옮겼는지 |
| Geometry가 반영되지 않음 | `Read/Write Enabled`, MeshFilter/MeshRenderer, child mesh 위치, 등록 상태 |
| 실행 중 변형 mesh가 반영되지 않음 | SimpleST는 refit이 없음. 새 메시로 교체 |
| FMOD/Wwise 모드에서 Listener/Source가 꺼짐 | 정상 — 렌더는 미들웨어 플러그인이 담당 |
| Teleport 뒤 pitch가 튐 | transform 변경 직후 `ResetMotionState()` 호출 |
| 성능이 부족함 | `Quality → Middle → Fast`, Reverb Ray Resolution 축소, path visualizer 비활성화 순서로 확인 |
| 여러 음원이 comb filtering처럼 들림 | 동일한 `AudioSettings.dspTime`으로 `PlayScheduled()` 실행 |

## 다음 문서

- [SDK 개요](./overview.md)
- [FMOD 플러그인](./fmod.md) · [Wwise 플러그인](./wwise.md)
- [Web SDK](./web.md) · [Unreal Engine SDK](./ue.md)
