---
title: Unreal Engine
description: SoundTracing Unreal Engine 플러그인 0.2.0 설치, Unity식 구성요소, HRTF, geometry, material, GPU backend와 Blueprint API.
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal SDK는 Unreal Audio Extension Plugin과 Actor Component를 통해
[STCoreV2](../core/stcorev2.md)를 연결합니다. 0.2.0부터 STCoreV2 v0.7의 C-ABI 4를 사용하고,
Unity SDK와 같은 Manager, Listener, Source, Object, PathVisualizer 구성을 제공합니다.

이 문서는 Unreal native audio integration을 기준으로 설명합니다. FMOD와 Wwise는 같은
프로젝트에서 native integration과 함께 켜는 방식이 아니라 각각 별도 integration build로
구성해야 합니다.

## 요구 사항과 플랫폼

| 항목 | 현재 버전/범위 |
|---|---|
| Unreal Engine | `5.6` |
| SoundTracing plugin | `0.2.0` Beta |
| STCoreV2 | `v0.7`, C-ABI `4` |
| 지원 target 선언 | Win64, macOS, Linux, Android, iOS |
| 현재 SDK checkout의 prebuilt binary | Win64 Release |
| Source channel | Mono 또는 Stereo, 최대 2 channels |
| 추가 plugin | Niagara. `SoundTracing.uplugin`이 자동 활성화 |

현재 Win64 package에는 다음 파일이 포함됩니다.

```text
Plugins/SoundTracing/ThirdParty/STCoreV2/
├─ Binaries/Win64/Release/exaSound.dll
├─ Binaries/Win64/Release/webgpu_dawn.dll
└─ Lib/Win64/Release/exaSound.lib
```

다른 target을 빌드하려면 해당 플랫폼의 `exaSound` runtime과 link artifact를 같은
ThirdParty 구조에 추가해야 합니다. `SupportedTargetPlatforms` 선언만으로 native binary가
생성되지는 않습니다.

:::warning ABI 4 전용
SoundTracing 0.2.0은 ABI 3 이하의 `exaSound`와 호환되지 않습니다. 예전 DLL을 섞으면
`STCoreV2 export table is incomplete` 오류와 함께 초기화가 중단됩니다.
:::

## 설치

1. Unreal Editor와 대상 프로젝트를 닫습니다.
2. SDK의 `Plugins/SoundTracing`을 대상 프로젝트의 `Plugins/` 아래에 복사합니다.
3. `.uproject`를 열고 `SoundTracing` plugin을 활성화합니다.
4. C++ module compile을 완료하고 Editor를 다시 시작합니다.
5. `Project Settings > Plugins > SoundTracing`에서 전역 설정을 확인합니다.

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

Plugin 폴더만 배포할 때도 `Content/STData`와 `ThirdParty/STCoreV2`를 함께 유지하십시오.
Material preset, HRTF와 native runtime이 이 경로를 사용합니다.

## Unreal Audio 설정

Native Unreal audio integration은 target platform의 Audio 설정에서 다음 두 plugin을
사용합니다.

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

설정을 바꾼 뒤 Editor를 다시 시작하십시오. 각 `Audio Component` 또는 `Sound Attenuation`
asset에서도 Spatialization을 활성화하고 `SoundTracing Audio Spatialization Settings`를
지정해야 합니다.

SDK 샘플 프로젝트는 다음 Windows audio 설정을 시작점으로 사용합니다.

| 항목 | 샘플 값 |
|---|---:|
| Audio Sample Rate | `48000` Hz |
| Callback Buffer Frame Size | `1024` |
| Buffers To Enqueue | `2` |

이 값은 플러그인의 고정 요구 사항이 아니라 샘플 기준입니다. 기존 프로젝트의 audio
budget이 다르면 먼저 위 설정으로 동작을 확인한 뒤 callback 크기와 buffer 수를 조정하십시오.

## 가장 빠른 설정

1. `Project Settings > Plugins > SoundTracing`에서 Runtime Options와 Default Listener
   Settings를 확인합니다.
2. Content Browser의 `Sounds > SoundTracing`에서
   `SoundTracing Audio Spatialization Settings` asset을 만듭니다.
3. `Audio Component` 또는 `Sound Attenuation`의 Spatialization Plugin Settings에 이 asset을
   연결합니다.
4. 음향 geometry로 사용할 `StaticMeshComponent` 또는 `SkinnedMeshComponent`의 바로 아래에
   `SoundTracingObjectComponent`를 child component로 추가합니다.
5. Object Component의 `Auto Set Materials`를 실행하고 잘못 매칭된 slot만 수정합니다.
6. PIE를 실행하고 `SoundTracing.Status`로 native runtime, backend, listener와 path 수를
   확인합니다.

별도의 Listener Component가 없어도 plugin은 Unreal audio-device listener의 transform과
Project Settings의 Default Listener Settings를 사용합니다.

## 구성요소 개요

| Unity SDK | Unreal Engine SDK | 역할 |
|---|---|---|
| `SoundTraceManager` | `Project Settings > Plugins > SoundTracing` | Native runtime, thread, GPU, cache와 기본 Listener 설정 |
| `SoundTraceListener` | `SoundTracingListenerComponent` | Level별 Listener profile과 선택적 transform override |
| `SoundTraceSource` | `SoundTracing Audio Spatialization Settings` | Source별 emission, ray, path, attenuation과 render tuning |
| `SoundTraceObject` | `SoundTracingObjectComponent` | Static/Skinned geometry, BVH와 material slot 등록 |
| `SoundTracePathVisualizer` | `SoundTracingPathVisualizerComponent` | Niagara 기반 propagation path 표시 |
| Manager runtime panel | `SoundTracingSubsystem` | Blueprint에서 runtime 상태와 최근 propagation 결과 조회 |

## Project Settings

`Project Settings > Plugins > SoundTracing`은 Unity의 `SoundTraceManager`에 해당합니다.

### Runtime Options

| 필드 | 기본값 | 범위/동작 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`. `-1`은 STCoreV2가 논리 core 수에서 하나를 뺀 값을 선택합니다. `0` 또는 `1`은 serial입니다. GPU 사용 중에는 비활성화됩니다. 재시작 필요 |
| `Use GPU Backend` | 꺼짐 | Dawn/WebGPU 초기화를 요청합니다. 실패하면 CPU로 fallback합니다. 재시작 필요 |
| `Path Cache Size` | `256` | `0..1024`. 모든 active source가 공유하는 path cache budget입니다. `0`은 cache를 끕니다. |
| `Propagation Interval (ms)` | `0` | `0..500`. `0`은 game tick마다 요청하며, 이전 frame이 실행 중이면 요청을 합칩니다. Unity 샘플 씬은 모두 `50`을 사용합니다. |

### Sources

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `Source Ray Resolution Cap` | `0` | `0..32`. 모든 source의 reverb ray grid 상한입니다. `0`은 source asset 값을 그대로 둡니다. Source가 많을 때 가장 먼저 낮추는 값입니다. Unity 샘플 씬은 source 1~2개에 `8`, 8개에 `24`를 씁니다. |
| `Source Ray Depth Cap` | `0` | `0..16`. 모든 source의 reverb ray depth 상한입니다. `0`은 source asset 값을 그대로 둡니다. |

두 값은 source asset의 `Ray Preset`/`Ray Resolution` 위에 적용되며, `0`(Listener 상속)인 source는
Listener grid를 기준으로 잘립니다. Project Settings에서 바꾸면 재생 중인 source에도 즉시 반영됩니다.

### Listener, Attenuation과 Materials

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `Default Listener Settings` | `Fast` | Level에 Listener Component override가 없을 때 적용합니다. |
| `Default Source Attenuation Strengths` | path별 `1.0` | Source asset이 project attenuation을 사용하도록 설정했을 때 적용합니다. 범위는 `0.5..1.5`입니다. |
| `Material Preset Library` | 비어 있음 | 비어 있으면 plugin의 `SoundTraceMaterialPresetLibrary`를 사용합니다. 다른 library를 지정하면 재시작해야 합니다. |

SDK 샘플 프로젝트의 `DefaultGame.ini`는 데모용으로 `Middle`, GPU backend 켜짐, `Propagation Interval`
`50 ms`, Source Ray Cap `16` / depth `4`를 override합니다. Plugin 자체의 기본값은 위 표와 같습니다.

## SoundTracingListenerComponent

Pawn이나 Camera에 추가하여 Project Settings의 Listener profile을 Level별로 바꾸거나,
Unreal audio-device listener 대신 이 component의 transform을 사용할 수 있습니다.

### Inspector

| 필드 | 기본값 | 동작 |
|---|---:|---|
| `Override Project Listener Settings` | 켜짐 | `Listener Settings`를 Project Settings 대신 적용합니다. |
| `Listener Settings` | `Fast` | Quality, HRTF, output mode, path와 air absorption 설정입니다. |
| `Drive Listener Transform` | 꺼짐 | 이 component의 world transform과 velocity를 native listener에 전달합니다. |

한 World에서는 하나의 Listener Component만 active listener를 구동합니다. 둘 이상이
Begin Play되면 나중 component가 이전 component를 교체하고 Output Log에 경고를 남깁니다.

### Quality preset

`Fast`, `Middle`, `Quality`를 선택하면 ray와 고급 render 품질 값이 함께 적용됩니다.
직접 편집하려면 `Custom`을 선택하십시오.

| 프리셋 | Ray Resolution | Ray Depth | HRTF Path Budget | Diffuse | Delay Interpolation | Early Path Budget |
|---|---:|---:|---:|---|---|---:|
| `Custom` | 저장된 값 | 저장된 값 | 저장된 값 | 저장된 값 | 저장된 값 | 저장된 값 |
| `Fast` | `16` | `4` | `1` | 꺼짐 / Low | Linear | `128` |
| `Middle` | `24` | `8` | `1` | 켜짐 / Medium | Cubic Lagrange | `128` |
| `Quality` | `32` | `12` | `1` | 켜짐 / High | Lagrange 6 | `128` |

`HRTF Path Budget`은 full directional HRTF voice를 받을 상위 path 수입니다. 기본 preset은
audio-thread 여유를 위해 모두 `1`을 사용합니다. Custom에서 값을 크게 올리면 source가 많은
scene에서 dropout이 발생할 수 있습니다.

### HRTF와 출력 모드

| HRTF 모드 | 필요한 asset | 설명 |
|---|---|---|
| `Band8` | 없음 | 8-band magnitude와 ITD를 사용하는 경량 모드 |
| `HRIR` | STCoreV2 embedded table | 측정 HRIR의 가장 가까운 방향을 사용 |
| `HRIR Interpolated` | STCoreV2 embedded table | 측정 HRIR을 방향에 따라 보간하는 기본 모드 |

0.1.0의 `Parametric`, `Convolution`, `SteamAudio` 모드는 0.2.0에서 제거됐습니다.
`Custom HRTF Relative Path`에는 plugin `Content` 기준의 `MPI1`, `SAH1`, `BPH1` table 경로를
지정할 수 있습니다. 비워 두면 STCoreV2에 내장된 table을 사용합니다.

| Output Mode | 설명 |
|---|---|
| `Headphones` | Binaural HRTF 출력 |
| `Speaker` | 내부 Ambisonic stereo decode 출력 |

Advanced 설정의 `Render Band Tier`는 `Merged4`가 권장 기본값이며, `Full8`은 path별
audio-thread band 연산을 늘립니다. Air Absorption 기본값은 `20 °C`, 상대습도 `50%`,
`101325 Pa`이고 ISO 9613-1 감쇠에 사용됩니다.

### Blueprint 메서드

| 메서드 | 동작 |
|---|---|
| `ApplyListenerSettings()` | 현재 Inspector 값을 native listener에 다시 적용합니다. |
| `SetQualityPreset(Preset)` | Quality preset을 변경하고 즉시 적용합니다. |
| `SetHrtfMode(Mode)` | HRTF mode를 변경하고 즉시 적용합니다. |
| `SetOutputMode(Mode)` | Headphones/Speaker를 변경하고 즉시 적용합니다. |
| `ResetMotionState()` | Teleport, respawn 뒤 listener/source velocity history를 초기화합니다. |
| `GetListenerSettings()` | 현재 component의 listener settings를 반환합니다. |

## SoundTracing Audio Spatialization Settings

Content Browser에서 `Sounds > SoundTracing > SoundTracing Audio Spatialization Settings`를
만들고 같은 역할의 source가 공유하도록 구성합니다. Audio Component마다 asset을 복제할
필요는 없습니다.

### Inspector

| 필드 | 기본값 | 범위/동작 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`. 모든 path에 곱하는 linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`. Intensity 위에 적용하는 추가 gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`. Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`. Early reflection send |
| `Ray Preset` | `Custom` | `Custom`, `Fast`(8×8, depth 4), `Middle`(16×16, depth 4), `Quality`(24×24, depth 4). `Custom`이 아니면 아래 두 값을 preset 값으로 덮어씁니다. Unity `SoundTraceSource`의 `Reverb Ray Resolution`에 해당하며, asset을 공유하는 모든 source에 적용됩니다. |
| `Ray Resolution` | `24` | `0..32`. `0`은 Listener의 ray grid를 상속하고 그 외 값은 `N × N` source reverb ray를 사용 |
| `Ray Depth` | `4` | `0..16`. `0`은 Listener의 depth를 상속 |
| `Direct/Reflection/Diffraction/Reverb/Transmission` | 모두 켜짐 | Source별 path family enable |
| `Override Project Attenuation Strengths` | 켜짐 | 꺼지면 Project Settings의 기본 attenuation을 사용 |
| path별 `Strength` | `1.0` | `0.5..1.5`. 값이 클수록 같은 거리에서 더 빠르게 감쇠 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`. Renderer가 유지하는 최대 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`. Path 진입/제거 fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`. 사라진 non-direct path를 fade 전에 유지. `0`은 hold 끄기 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`. Sample마다 허용하는 최대 delay 변화량 |
| `Bypass` | 꺼짐 | SoundTrace spatial rendering을 건너뛰고 입력을 그대로 통과 |

Source 위치는 0.2.0부터 spatializer가 각 audio block의
`FAudioPluginSourceInputData::SpatializationParams`에서 직접 갱신합니다. 예전처럼 source가
native `(0,0,0)`에 남는 문제가 발생하면 plugin 0.2.0 binary와 module이 함께 배포됐는지
확인하십시오.

## SoundTracingObjectComponent

`SoundTracingObjectComponent`는 immediate parent의 `StaticMeshComponent` 또는
`SkinnedMeshComponent`를 음향 geometry로 등록합니다. Actor의 임의 위치에 두는 것이 아니라
대상 mesh component의 바로 아래 child로 추가해야 합니다.

### Inspector

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `Auto Register Native Object` | 켜짐 | Begin Play에서 native object를 자동 등록 |
| `Sync Transform On Tick` | 켜짐 | Parent transform이 바뀔 때만 native transform 갱신 |
| `Auto Sync Materials` | 켜짐 | Parent render material이 바뀌면 slot 목록 갱신 |
| `Update Type` | `Static` | Geometry update policy |
| `BVH Type` | `LBVH SIMD8` | Native acceleration structure builder |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Sync Skinned Vertices On Tick` | 꺼짐 | `Refit`에서 현재 skeletal pose를 매 tick 업로드 |
| `Sound Material Slots` | 자동 생성 | Render material slot과 SoundTrace preset의 mapping |
| `Visualize BVH` | 꺼짐 | Editor component visualizer로 BVH line 표시 |

Static Mesh는 Forced LOD가 있으면 그 LOD를, 없으면 LOD 0을 올립니다. Skinned Mesh도 Forced
LOD를 우선하고 현재 pose의 vertex를 등록합니다.

### Geometry와 BVH

| BVH Type | Refit | GPU backend | 설명 |
|---|---|---|---|
| `HKDTree` | 지원 | 미지원 | KD split 기반. Refit 뒤 BVH-style fallback traversal 사용 |
| `LBVH` | 지원 | 미지원 | Scalar Morton LBVH |
| `LBVH SIMD4` | 지원 | 지원 | 4-wide leaf intersection |
| `LBVH SIMD8` | 지원 | 지원 | 현재 기본값 |
| `LBVH SIMD16` | 지원 | 지원 | 16-wide leaf intersection |

GPU backend를 요청했는데 `HKDTree`나 scalar `LBVH`를 선택하면 plugin은 upload 가능한
`LBVH SIMD8`로 native builder를 대체합니다.

| Update Type | 사용 대상 |
|---|---|
| `Static` | 움직이지 않는 level geometry |
| `Dynamic` | Transform만 변하는 door, prop. TLAS instance 갱신 |
| `Refit` | Vertex pose가 변하고 topology는 유지되는 Skinned Mesh |
| `Rebuild` | Triangle topology가 바뀌어 BVH를 다시 만들어야 하는 geometry |

Skinned animation을 반영하려면 `Update Type = Refit`과
`Sync Skinned Vertices On Tick = true`를 함께 사용하십시오. Plugin은 current pose vertex를
업로드하고 native mesh를 refit합니다. 매 tick CPU skinning과 vertex upload가 발생하므로
대상이 많은 scene에서는 update 대상과 LOD를 제한하십시오.

같은 Static Mesh, LOD, material mapping과 BVH 설정을 쓰는 object는 하나의 native BVH를
공유합니다. Skinned Mesh cache key에는 component path가 포함되어 서로 다른 pose가 같은
native mesh를 덮어쓰지 않습니다.

### Blueprint 메서드

| 메서드 | 동작 |
|---|---|
| `RegisterNativeObject()` | Parent geometry를 native scene에 등록합니다. |
| `UnregisterNativeObject()` | Native object 등록을 해제합니다. |
| `SyncNativeTransform()` | 현재 parent transform을 즉시 반영합니다. |
| `RefreshNativeMesh()` | Mesh 또는 material 변경 뒤 geometry를 다시 업로드합니다. |
| `Auto Set Materials` | Parent render material 이름과 alias로 preset을 자동 매칭합니다. |
| `SetMaterialPresetIndex(Slot, Preset)` | 한 slot의 preset index를 변경합니다. |
| `SetMaterialPresetForAllSlots(Preset)` | 모든 slot에 같은 preset을 적용합니다. |
| `SetUpdateType(Type)` | Native object의 update policy를 변경합니다. |
| `GetResolvedMeshLodIndex()` | 실제 업로드한 LOD index를 반환합니다. |
| `GetUploadedTriangleCount()` | 마지막 업로드의 triangle 수를 반환합니다. |
| `IsRegistered()` | Native object와 mesh가 모두 유효한지 반환합니다. |

## 사운드 재질과 Transmission

기본 library는 plugin의
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset`이며, 현재 Unity/Web SDK와
같은 22개 material table을 포함합니다.

Custom library는 Content Browser의
`Sounds > SoundTracing > SoundTracing Material Preset Library`에서 만듭니다. 새 asset은
현재 기본 library를 복제하며, Project Settings의 `Material Preset Library`에 지정한 뒤
Editor를 다시 시작해야 합니다.

각 preset은 다음 값을 가집니다.

- Display name과 render material name alias
- Scattering `0..1`
- 8-band Reflection, Absorption, Transmission `0..1`
- Transmission Model
- `Solid Distance`용 8-band `Thickness to -30 dB (m)`

주파수 대역 중심은 `67.5`, `125`, `250`, `500`, `1000`, `2000`, `4000`, `8000 Hz`입니다.
Editor의 band graph를 클릭하거나 drag하여 각 값을 편집할 수 있습니다.

### Transmission Model

| 모델 | 입력 | Geometry 조건 |
|---|---|---|
| `Surface` | 표면을 한 번 통과한 뒤 남는 대역별 energy coefficient `0..1` | 열린 면과 얇은 surface에 사용 가능 |
| `Solid Distance` | 전송 energy가 `-30 dB`가 되는 대역별 material 기준 거리(m) | 닫힌 volume과 일관된 face 방향 필요 |

`Solid Distance` 값은 object의 실제 두께가 아닙니다. Runtime이 ray가 geometry 내부를 이동한
실제 거리를 계산해 이 기준 거리로 감쇠합니다. `0`은 해당 band를 완전히 차단합니다.

Library의 `ImportFromJson`, `ExportToJson`, `ResetToBundledJson`은 Unity/Web SDK와 같은
`soundMaterial.json` 형식을 사용합니다. `transmissionDistanceToMinus30DbMeters`가 없으면
`Surface`, 유효한 8개 값이 있으면 `Solid Distance`입니다.

## SoundTracingPathVisualizerComponent

Actor에 `SoundTracingPathVisualizerComponent`를 추가하면 Niagara line segment로 마지막
propagation frame의 path를 표시합니다.

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `Visualization Enabled` | 켜짐 | Path 표시 여부 |
| `Refresh Interval Ms` | `50` | 시각화 갱신 최소 간격. Propagation 주기에는 영향 없음 |
| `Max Visualized Paths` | `1024` | 표시할 최대 path 수. 범위 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 강도. 범위 `0.01..2.0` |
| `Niagara System` | 비어 있음 | 비어 있으면 plugin의 default Niagara system 사용 |

색상은 Direct=red, Reflection=orange, Diffraction=green, Transmission=cyan,
Reverb=purple입니다. `SetVisualizationEnabled(bool)`로 runtime 표시를 제어하고
`GetActivePathCount()`로 현재 path 수를 읽을 수 있습니다. 디버그와 데모용이므로 shipping
성능 측정에서는 비활성화하십시오.

## SoundTracingSubsystem

`SoundTracingSubsystem`은 Unity Manager runtime panel에 해당하는 `WorldSubsystem`입니다.
Blueprint에서 다음 상태와 명령을 제공합니다.

| 메서드 | 동작 |
|---|---|
| `IsNativeRuntimeReady()` | Library, native init, scene과 listener 준비 여부 |
| `IsGpuPropagationActive()` | GPU device를 실제 획득했는지 반환 |
| `GetGpuBackendStatus()` | `GPU active`, `CPU`, `CPU fallback (...)` 중 하나 반환 |
| `GetLastValidPathCount()` | 최근 propagation frame의 valid path 수 |
| `GetLastNativeError()` | Control thread의 최근 native 오류. 없으면 빈 문자열 |
| `GetNativeVersion()` | Native library version `major.minor.revision` |
| `GetRegisteredObjectCount()` | 현재 World의 등록 object 수 |
| `GetActiveListenerSettings()` | Native listener에 실제 적용 중인 설정 |
| `ResetMotionState()` | Listener와 source motion history 초기화 |
| `RequestPropagationFrame()` | 정규 cadence 밖에서 propagation frame 요청 |

## GPU backend

`Use GPU Backend`을 켜고 Editor를 다시 시작하면 `exaPropagatorInitGpu`로 Dawn/WebGPU
backend를 요청합니다.

- 초기화 성공: `GPU active`
- GPU addon이 없는 native build: `CPU fallback (this exaSound build has no GPU backend)`
- Adapter/device 초기화 실패: 사유를 포함한 `CPU fallback (...)`
- GPU를 요청하지 않음: `CPU`

Win64 배포에서는 `exaSound.dll`과 같은 artifact directory의 `webgpu_dawn.dll`을 함께
stage해야 합니다. Plugin Build.cs는 이 directory의 DLL을 runtime dependency로 등록합니다.

실제 상태는 Blueprint의 `GetGpuBackendStatus()` 또는 다음 console command로 확인합니다.

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status`는 native version, ready 상태, backend, object/path 수와 listener
profile을 출력합니다. `SoundTracing.DumpGpuPropagationStats`는 GPU dispatch, ready와 CPU
fallback counter를 출력합니다.

## 좌표계

Plugin component를 사용할 때는 좌표를 직접 변환할 필요가 없습니다. 0.2.0은 Unreal 좌표를
STCoreV2에 다음과 같이 전달합니다.

```text
position / vertex / velocity = (UE.Y, UE.Z, UE.X) × 0.01 m
sceneRatio = 1
listener basis: right=(1,0,0), up=(0,1,0), forward=(0,0,-1)
```

마지막 listener basis는 ADR-0001 기준이며, 이전 버전에서 HRTF front/back이 뒤집히던 문제를
수정합니다. Custom native 연동에서만 이 contract를 직접 적용하십시오.

## 샘플 프로젝트

현재 SDK source project의 `Content/FirstPerson/Test.umap`에서
`SoundTracingObjectComponent`의 geometry, BVH와 material slot 구성을 확인할 수 있습니다.
이 map은 host project의 Content에 있으며 `Plugins/SoundTracing` 폴더만 복사할 때는 포함되지
않습니다.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `STCoreV2 export table is incomplete` | Plugin 0.2.0과 STCoreV2 v0.7 ABI 4 binary를 함께 배포했는지 확인. ABI 3 DLL 제거 |
| Plugin이 Audio 선택 목록에 없음 | Plugin enable, C++ module compile, target platform Audio 설정과 Editor 재시작 확인 |
| Native library load 실패 | target별 `ThirdParty/STCoreV2` binary/link artifact와 package staging 확인 |
| Source가 공간화되지 않음 | 전역 Spatialization/Source Data Override plugin, source의 Spatialization enable, SoundTracing source settings asset 연결 확인 |
| Source가 원점에 고정됨 | Plugin 0.2.0의 module과 binary가 같이 배포됐는지 확인. 0.2.0은 audio block의 spatialization params를 직접 사용 |
| Listener 위치가 다름 | Listener Component의 `Drive Listener Transform`; 꺼짐이면 Unreal audio-device listener를 사용 |
| Listener 교체 경고 | 한 World에 active `SoundTracingListenerComponent`를 하나만 유지 |
| Geometry가 반영되지 않음 | Object Component가 지원 mesh의 immediate child인지, render data와 triangle이 있는지 확인 |
| Skinned animation이 반영되지 않음 | `Update Type = Refit`, `Sync Skinned Vertices On Tick = true`, 고정 LOD와 vertex count 확인 |
| GPU가 CPU로 fallback | `webgpu_dawn.dll`, GPU 포함 native build, adapter/device, Output Log와 `SoundTracing.DumpGpuPropagationStats` 확인 |
| Path가 보이지 않음 | Niagara plugin, Visualizer의 enable 상태, max path 수와 source/listener path enable 확인 |
| Teleport 뒤 pitch가 튐 | 이동 직후 Listener Component 또는 Subsystem의 `ResetMotionState()` 호출 |
| Source가 많을 때 dropout | 아래 [Source가 많을 때 끊김](#source가-많을-때-끊김) 체크리스트 순서로 확인 |
| Editor 종료 시 stack overflow | Control thread shutdown fix가 포함된 최종 0.2.0 plugin인지 확인 |

### Source가 많을 때 끊김

Unity 샘플 씬과 같은 부하 프로파일로 맞추는 순서입니다. 한 단계씩 바꾸고 `SoundTracing.Status`로 확인하십시오.

1. `Propagation Interval (ms)`를 `50`으로 올립니다. `0`이면 매 game tick마다 propagation frame이 돌아 CPU를 계속 점유합니다. Unity 샘플 씬은 모두 `50`입니다.
2. `Source Ray Resolution Cap`을 `8..16`으로 두거나 source asset의 `Ray Preset`을 `Fast`로 바꿉니다. Source마다 자체 reverb ray를 쏘므로 source 수에 비례해 비용이 늘어납니다.
3. Listener preset을 `Fast`로 내립니다. HRTF Path Budget `1`, `Merged4`는 기본값 그대로 둡니다.
4. `Propagation Thread Count`를 `2..3`으로 명시합니다. `-1`은 논리 core 수에서 하나만 남기고 전부 propagation에 쓰는데, Unreal은 game/render/RHI/audio thread가 이미 core를 쓰고 있습니다. Unity 샘플 씬은 `2..3`을 씁니다.
5. `Project Settings > Platforms > Windows > Audio`의 `Buffers To Enqueue`를 `2` 이상으로 둡니다. `1`이면 callback이 한 번만 늦어도 바로 dropout이 납니다.
6. `SoundTracing.Status`를 두 번 실행합니다. 두 번째 출력의 audio-thread probe가 두 호출 사이의 `exaRenderSound` 평균/최대 시간과 wall-time 점유율을 보여 줍니다. block budget(1024 frames @ 48 kHz = 21.3 ms) 대비 점유율이 높으면 2~3번을 더 내립니다.
7. `SoundTracing.DumpConfig`로 `simdTarget`이 `AVX2` 이상인지 확인합니다. `SSE2`이면 SIMD runtime dispatch가 빠진 `exaSound.dll`이므로 STCoreV2 dev를 다시 빌드해야 합니다.
8. `Use GPU Backend`를 꺼서 CPU만으로 비교합니다. Unity 샘플 씬은 CPU backend를 씁니다.

STCoreV2 `3fb0dccf`(2026-08-31)는 fallback delay policy를 `D`에서 `A`로, early settle을 `6`에서 `0.5`로 되돌렸습니다.
Unity SDK가 배포하는 DLL(`3d9ddf83`)은 되돌리기 전 값이라 audio thread render 비용이 약 26% 낮습니다.
Editor를 실행하기 전에 환경 변수 `EXA_FALLBACK_DELAY_POLICY=D`와 `EXA_EARLY_SETTLE_SAMPLES=6`을 설정하면
같은 DLL로 A/B 비교를 할 수 있습니다. 값은 DLL load 시 한 번만 읽습니다.

## 다음 문서

- [SDK 개요](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
