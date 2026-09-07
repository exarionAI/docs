---
title: Unreal Engine
description: SoundTrace Unreal Engine SDK 설치, 모노 오디오 임포트, 플러그인 세팅, Detail Properties와 공개 API 안내.
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal Engine SDK는 Unreal의 오디오 소스, 리스너와 메시를
[STCoreV2](../core/stcorev2.md)에 연결하는 실시간 공간 음향 플러그인입니다.
프로젝트 전역 설정과 Actor Component를 통해 음향 경로, 재질, HRTF와 GPU 연산을 구성합니다.

## 요구 사항과 플랫폼

| 항목 | 요구 사항 / 지원 범위 |
|---|---|
| Unreal Engine | `5.6` 이상 |
| 지원 플랫폼 | Windows x64, macOS, Linux, Android, iOS |

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

## Unreal 에디터 설정

1. `Edit > Project Settings > Platforms`에서 대상 플랫폼의 `Audio` 설정을 엽니다.
2. `Spatialization Plugin`을 `SoundTracing`으로 설정합니다.
3. `Source Data Override Plugin`을 `SoundTracing`으로 설정합니다.
4. 에디터를 다시 시작합니다.
5. `Project Settings > Plugins > SoundTracing`을 열어 전역 설정을 확인합니다.

![Project Settings에서 SoundTracing 선택](/img/unreal/ST_Listener_Setting_Editor01.png)

Windows 프로젝트는 아래 값으로 시작한 뒤 오디오 부하에 맞춰 조정할 수 있습니다.

| 설정 | 시작 값 |
|---|---:|
| `Audio Sample Rate` | `48000 Hz` |
| `Callback Buffer Frame Size` | `1024` |
| `Buffers To Enqueue` | `2` |

## 오디오 에셋 임포트 설정 — 모노

![일반 Sound Wave와 모노 Sound Wave 에셋](/img/unreal/MonoSoundImport.png)

SoundTrace로 공간화할 음원은 모노(1채널)로 준비합니다.

1. 오디오 편집 도구에서 원본을 모노 PCM WAV 파일로 내보냅니다.
2. Content Browser의 `Import`로 파일을 가져옵니다. 가져온 파일은 `Sound Wave` 에셋으로 생성됩니다.
3. Sound Wave의 채널 수가 `1`인지 확인합니다.
4. Audio Component의 `Sound`에 이 에셋을 지정합니다.

모노는 입력 음원의 채널 구성입니다. 헤드폰 방향감은 SoundTrace가 리스너를 기준으로 렌더링합니다.
오디오 파일을 가져오는 기본 절차는 [Unreal 오디오 임포트 안내](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-audio-files?application_version=5.6)를 참고하십시오.

## 가장 빠른 시작

1. `Project Settings > Plugins > SoundTracing`에서 `Quality Preset = Fast`로 시작합니다.
2. Content Browser의 `Sounds > SoundTracing > SoundTracing Audio Spatialization Settings`에서
   소스 설정 에셋을 만듭니다.
3. `Sound Attenuation` 에셋을 만들고 `Enable Spatialization`을 켭니다.
   `Spatialization Method`는 `Plugin-Spatialized`로 선택하고,
   `Spatialization Plugin Settings` 배열에 앞서 만든 소스 설정 에셋을 넣습니다.
4. Audio Component에 모노 Sound Wave를 지정합니다. `Allow Spatialization`을 켜고,
   `Override Attenuation`을 끈 뒤 `Attenuation Settings`에 Sound Attenuation 에셋을 넣습니다.
5. 음향 지오메트리로 사용할 `StaticMeshComponent` 또는 `SkinnedMeshComponent`의 바로 아래에
   `SoundTracingObjectComponent`를 자식 컴포넌트로 추가합니다.
6. Object의 `Auto Set Materials`를 실행하고 필요한 재질 슬롯을 조정합니다.
7. PIE를 실행하고 Audio Component를 재생합니다. `SoundTracing.Status`로 런타임 준비 상태와 경로 수를 확인합니다.
8. 경로를 보려면 Actor에 `SoundTracingPathVisualizerComponent`를 추가합니다.

프로젝트 전역 설정은 SoundTracing 플러그인 세팅에서 관리하며, 런타임 상태는 `SoundTracingSubsystem`으로 조회합니다.
Listener Component를 추가하지 않으면 Unreal 오디오 리스너의 위치와 프로젝트의 기본 리스너 설정을 사용합니다.

## 컴포넌트 개요

| 구성요소 | Unreal Engine SDK | 역할 |
|---|---|---|
| 사운드트레이싱 플러그인 세팅 | `SoundTracingSettings`, `SoundTracingSubsystem` | 프로젝트 설정, 런타임 상태 조회와 제어 |
| 리스너 | `SoundTracingListenerComponent` | 리스너 품질·출력 설정과 위치 재정의 |
| 소스 | `SoundTracingSourceSettings` + `Audio Component` | 소스별 방사 강도, 음향 경로와 감쇠 설정 |
| 사운드 오브젝트 | `SoundTracingObjectComponent` | 메시, BVH와 재질 슬롯 등록 |
| 사운드 재질 | `SoundTracingMaterialPresetLibrary` | 재질 프리셋과 대역별 반사·흡수·투과 설정 |
| 사운드 패스 비주얼 | `SoundTracingPathVisualizerComponent` | Niagara로 음향 경로 표시 |

## 사운드트레이싱 플러그인 세팅

<span id="project-settings" />

<span id="soundtracingsubsystem" />

![SoundTracing 런타임과 기본 리스너 설정](/img/unreal/ST_Listener_Setting_Editor02.png)

![SoundTracing 소스 상한, 감쇠, 재질과 경로 설정](/img/unreal/ST_Listener_Setting_Editor03.png)

### Detail Properties

`SoundTracingSettings`에서 전역 설정을 관리하고 `SoundTracingSubsystem`에서 런타임을 제어합니다.
전역 설정은 `Project Settings > Plugins > SoundTracing`에서 편집합니다.
표는 SDK 기본값을 나타내며, 이미지의 값은 설정 예시입니다.

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`. `-1`은 논리 코어 수를 기준으로 자동 설정하며 `0`과 `1`은 단일 스레드입니다. 변경 후 재시작합니다. |
| `Use GPU Backend` | 꺼짐 | GPU 연산을 요청합니다. 초기화할 수 없으면 CPU로 실행합니다. 변경 후 재시작합니다. |
| `Path Cache Size` | `256` | `0..1024`. 활성 소스가 공유하는 경로 캐시 크기입니다. `0`은 캐시를 끕니다. |
| `Propagation Interval (ms)` | `0` | `0..500`. 연산 요청의 최소 간격입니다. `0`은 매 게임 tick에 요청하며 실행 중 요청은 합쳐집니다. |
| `Quality Preset`, `Listener Rays`, `HRTF`, `Render Quality` | `Fast` | 기본 리스너 프로필입니다. 아래 리스너 Detail Properties 표에서 각 항목을 설명합니다. |
| `Source Ray Resolution Cap` | `0` | `0..32`. 소스별 리버브 ray 해상도의 전역 상한입니다. `0`은 추가 제한을 두지 않습니다. |
| `Source Ray Depth Cap` | `0` | `0..16`. 소스별 리버브 ray 깊이의 전역 상한입니다. `0`은 추가 제한을 두지 않습니다. |
| 경로별 `Strength` | 각각 `1.0` | `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission`의 감쇠 강도입니다. `0.5..1.5`이며 프로젝트 감쇠 설정을 사용하는 소스에 적용합니다. 값이 클수록 같은 거리에서 더 빠르게 감쇠합니다. |
| `Material Preset Library` | 미지정 | 비워 두면 번들 라이브러리를 사용합니다. 다른 라이브러리를 지정하면 재시작합니다. |
| `Paths`, `Air Absorption` | 활성화 | 기본 리스너의 경로 종류와 공기 흡수 설정입니다. |

### 공개 메서드

Blueprint에서는 `Get World Subsystem`으로 `SoundTracingSubsystem`을 가져옵니다.
C++에서는 `USoundTracingSubsystem::Get(WorldContextObject)`를 사용할 수 있습니다.

| 메서드 | 반환값 / 동작 |
|---|---|
| `Get(const UObject* WorldContextObject)` | C++ 정적 메서드입니다. 해당 World의 Subsystem을 반환합니다. |
| `IsNativeRuntimeReady()` | `bool`. 네이티브 라이브러리, 씬과 리스너가 준비되었는지 반환합니다. |
| `IsGpuPropagationActive()` | `bool`. GPU 연산이 실제 활성화되었는지 반환합니다. |
| `GetGpuBackendStatus()` | `FString`. `GPU active`, `CPU` 또는 전환 사유가 포함된 `CPU fallback (...)`입니다. 런타임에 접근할 수 없으면 `Unavailable`입니다. |
| `GetLastValidPathCount()` | `int32`. 최근 완료된 연산의 유효 경로 수입니다. |
| `GetLastNativeError()` | `FString`. 최근 네이티브 오류입니다. 최근 프레임이 성공하면 빈 문자열입니다. |
| `GetNativeVersion()` | `FString`. 네이티브 라이브러리의 `major.minor.revision` 버전입니다. |
| `GetRegisteredObjectCount()` | `int32`. 현재 World에 등록된 오브젝트 수입니다. |
| `GetActiveListenerSettings()` | `FSoundTracingListenerSettings`. 실제 적용 중인 리스너 설정입니다. |
| `ResetMotionState()` | 순간이동이나 레벨 전환 뒤 리스너와 소스의 이동 이력을 초기화합니다. |
| `RequestPropagationFrame()` | 정규 갱신 주기 외에 음향 연산을 요청합니다. |

### 공개 프로퍼티

다음은 `USoundTracingSettings`의 C++ 설정 멤버입니다.
`GetDefault<USoundTracingSettings>()`로 프로젝트 설정을 읽을 수 있습니다.

| 프로퍼티 | 타입 | 설명 |
|---|---|---|
| `PropagationThreadCount` | `int32` | 설정된 연산 스레드 수입니다. |
| `bEnableGpuPropagation` | `bool` | GPU 사용 요청입니다. 실제 활성 상태는 `IsGpuPropagationActive()`로 확인합니다. |
| `PathCacheSize` | `int32` | 경로 캐시 크기입니다. |
| `PropagationIntervalMs` | `int32` | 연산 요청 최소 간격(ms)입니다. |
| `DefaultListenerSettings` | `FSoundTracingListenerSettings` | 프로젝트의 기본 리스너 프로필입니다. |
| `SourceRayResolutionCap`, `SourceRayDepthCap` | `int32` | 소스 ray의 전역 해상도·깊이 상한입니다. |
| `DefaultSourceAttenuationStrengths` | `FSoundTracingAttenuationStrengths` | 경로별 기본 거리 감쇠 강도입니다. |
| `MaterialPresetLibrary` | `TSoftObjectPtr<USoundTracingMaterialPresetLibrary>` | 시작 시 등록할 재질 라이브러리입니다. |

## 리스너

<span id="soundtracinglistenercomponent" />

![기본 리스너 프로필 설정](/img/unreal/ST_Listener_Setting_Editor02.png)

`SoundTracingListenerComponent`를 Pawn이나 Camera에 추가하여 Project Settings의 Listener profile을 Level별로 바꾸거나,
Unreal audio-device listener 대신 이 component의 transform을 사용할 수 있습니다.

### Detail Properties

리스너 프로필의 공통 설정은 Project Settings와 Listener Component에서 같습니다.
위 이미지는 Project Settings의 기본 리스너 프로필입니다. 컴포넌트에서는 아래 재정의 옵션을 함께 설정합니다.

| 필드 | 기본값 | 동작 |
|---|---:|---|
| `Override Project Listener Settings` | 켜짐 | `Listener Settings`를 Project Settings 대신 적용합니다. |
| `Listener Settings` | `Fast` | Quality, HRTF, output mode, path와 air absorption 설정입니다. |
| `Drive Listener Transform` | 꺼짐 | 이 component의 world transform과 velocity를 native listener에 전달합니다. |

한 World에서는 하나의 Listener Component만 active listener를 구동합니다. 둘 이상이
Begin Play되면 나중 component가 이전 component를 교체하고 Output Log에 경고를 남깁니다.

| 리스너 프로필 필드 | 기본값 | 설명 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`, `Fast`, `Middle`, `Quality` 중 선택합니다. |
| `Ray Resolution`, `Ray Depth` | `16`, `4` | 각각 `1..32`, `1..16`. 경로 탐색 해상도와 깊이이며 `Custom`에서 편집합니다. |
| `Output Mode` | `Headphones` | 헤드폰 또는 스피커 출력을 선택합니다. |
| `Hrtf Mode` | `HRIR Interpolated` | 아래 HRTF 표를 참고하십시오. |
| `Custom HRTF Relative Path` | 빈 문자열 | 플러그인 Content 기준의 사용자 HRTF 경로입니다. 비워 두면 내장 테이블을 사용합니다. |
| `HRTF Path Budget` | `1` | `1..32`. 방향별 HRTF를 적용할 상위 경로 수입니다. |
| `Diffuse Enabled`, `Diffuse Quality` | 꺼짐, `Low` | 초기 산란음과 품질을 설정합니다. `Low/Medium/High`는 최대 `128/512/1024`개의 산란 경로를 유지합니다. |
| `Delay Interpolation` | `Linear` | `Linear`, `Cubic Lagrange`, `Lagrange 6` 지연 보간을 선택합니다. |
| `Early Path Budget` | `128` | `0..4096`. 전체 이동 지연 처리를 적용할 초기 간접 경로 수입니다. `0`은 제한을 해제합니다. |
| `Render Band Tier` | `Merged4` | `Merged4` 또는 `Full8`로 렌더링 대역 수를 선택합니다. |
| 경로별 `Enable … Path` | 모두 켜짐 | `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission` 경로를 각각 켜거나 끕니다. |
| `Air Absorption Enabled` | 켜짐 | 공기 흡수에 의한 감쇠를 적용합니다. |
| `Temperature Celsius` | `20` | `-40..60 °C`. 공기 온도입니다. |
| `Relative Humidity Percent` | `50` | `0..100%`. 상대습도입니다. |
| `Pressure Pa` | `101325` | `50000..120000 Pa`. 기압입니다. |

#### Quality Preset

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

#### HRTF와 출력 모드

| HRTF 모드 | 필요한 asset | 설명 |
|---|---|---|
| `Band8` | 없음 | 8-band magnitude와 ITD를 사용하는 경량 모드 |
| `HRIR` | STCoreV2 embedded table | 측정 HRIR의 가장 가까운 방향을 사용 |
| `HRIR Interpolated` | STCoreV2 embedded table | 측정 HRIR을 방향에 따라 보간하는 기본 모드 |

`Custom HRTF Relative Path`에는 plugin `Content` 기준의 `MPI1`, `SAH1`, `BPH1` table 경로를
지정할 수 있습니다. 비워 두면 STCoreV2에 내장된 table을 사용합니다.

| Output Mode | 설명 |
|---|---|
| `Headphones` | Binaural HRTF 출력 |
| `Speaker` | 내부 Ambisonic stereo decode 출력 |

Advanced 설정의 `Render Band Tier`는 `Merged4`가 권장 기본값이며, `Full8`은 path별
audio-thread band 연산을 늘립니다. Air Absorption 기본값은 `20 °C`, 상대습도 `50%`,
`101325 Pa`이고 ISO 9613-1 감쇠에 사용됩니다.

### 공개 메서드

| 메서드 | 동작 |
|---|---|
| `ApplyListenerSettings()` | 현재 Detail Properties 값을 native listener에 다시 적용합니다. |
| `SetQualityPreset(Preset)` | Quality preset을 변경하고 즉시 적용합니다. |
| `SetHrtfMode(Mode)` | HRTF mode를 변경하고 즉시 적용합니다. |
| `SetOutputMode(Mode)` | Headphones/Speaker를 변경하고 즉시 적용합니다. |
| `ResetMotionState()` | Teleport, respawn 뒤 listener/source velocity history를 초기화합니다. |
| `GetListenerSettings()` | 현재 component의 listener settings를 반환합니다. |
| `static GetActiveListener(const UWorld* World)` | C++에서 해당 World의 활성 Listener Component를 반환합니다. |

### 공개 프로퍼티

| 프로퍼티 | 타입 / 접근 | 설명 |
|---|---|---|
| `bOverrideProjectListenerSettings` | `bool` / 읽기·쓰기 | 컴포넌트의 리스너 프로필 사용 여부입니다. |
| `ListenerSettings` | `FSoundTracingListenerSettings` / 읽기·쓰기 | 컴포넌트의 품질·출력·경로 설정입니다. 런타임에서 직접 변경하면 `ApplyListenerSettings()`로 반영합니다. |
| `bDriveListenerTransform` | `bool` / 읽기·쓰기 | 컴포넌트의 위치와 방향으로 리스너를 구동할지 지정합니다. |

## 소스

<span id="soundtracing-audio-spatialization-settings" />

![소스 설정 에셋 Detail Properties](/img/unreal/STSettingAssets_SourceSetups.png)

Content Browser에서 `Sounds > SoundTracing > SoundTracing Audio Spatialization Settings`를
만들고 같은 역할의 source가 공유하도록 구성합니다. Audio Component마다 asset을 복제할
필요는 없습니다.

### Detail Properties

| 필드 | 기본값 | 범위/동작 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`. 모든 path에 곱하는 linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`. Intensity 위에 적용하는 추가 gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`. Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`. Early reflection send |
| `Ray Preset` | `Custom` | `Custom`, `Fast`(8×8, depth 4), `Middle`(16×16, depth 4), `Quality`(24×24, depth 4). `Custom`이 아니면 아래 두 값을 preset 값으로 덮어씁니다. Unity `SoundTraceSource`의 `Reverb Ray Resolution`에 해당하며, asset을 공유하는 모든 source에 적용됩니다. |
| `Ray Resolution` | `24` | `0..32`. `0`은 Listener의 ray grid를 상속하고 그 외 값은 `N × N` source reverb ray를 사용 |
| `Ray Depth` | `4` | `0..16`. `0`은 Listener의 depth를 상속 |
| 경로별 `… Path Enabled` | 모두 켜짐 | `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission` 경로를 소스별로 켜거나 끕니다. |
| `Override Project Attenuation Strengths` | 켜짐 | 꺼지면 Project Settings의 기본 attenuation을 사용 |
| path별 `Strength` | `1.0` | `0.5..1.5`. 값이 클수록 같은 거리에서 더 빠르게 감쇠 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`. Renderer가 유지하는 최대 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`. Path 진입/제거 fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`. 사라진 non-direct path를 fade 전에 유지. `0`은 hold 끄기 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`. Sample마다 허용하는 최대 delay 변화량 |
| `Bypass` | 꺼짐 | SoundTrace spatial rendering을 건너뛰고 입력을 그대로 통과 |

#### Audio Component에 연결

소스 설정 에셋을 Sound Attenuation에 연결하고, 이 Attenuation 에셋을 Audio Component에 지정합니다.
같은 종류의 음원은 두 에셋을 공유할 수 있습니다.

![Sound Attenuation의 Spatialization Plugin Settings에 소스 설정 에셋 지정](/img/unreal/ST_AttenAsset_PutSettingAssetHere.png)

`Enable Spatialization`을 켜고 플러그인 공간화 방식을 선택합니다.
`Spatialization Plugin Settings` 배열에 `SoundTracing Audio Spatialization Settings` 에셋을 추가합니다.

![Audio Component의 Attenuation Settings에 Sound Attenuation 지정](/img/unreal/ST_Source_PutAssetHere.png)

Audio Component의 `Allow Spatialization`을 켜고 `Override Attenuation`을 끕니다.
`Attenuation Settings`에 앞서 만든 Sound Attenuation을 지정합니다.

### 공개 메서드

`USoundTracingSourceSettings`가 제공하는 C++ 메서드입니다.
재생·정지 제어에는 Audio Component의 `Play()`와 `Stop()`을 사용합니다.

| 메서드 | 반환값 / 동작 |
|---|---|
| `GetEffectiveAttenuationStrengths()` | `FSoundTracingAttenuationStrengths`. 재정의 여부에 따라 소스 또는 프로젝트의 감쇠 강도를 반환합니다. |
| `ApplyRayPreset()` | `RayPreset`에 맞춰 `RayResolution`과 `RayDepth`를 갱신합니다. `Custom`에서는 값을 유지합니다. |

## 사운드 오브젝트

<span id="soundtracingobjectcomponent" />

![SoundTracingObjectComponent Detail Properties](/img/unreal/STObj_01.png)

`SoundTracingObjectComponent`는 immediate parent의 `StaticMeshComponent` 또는
`SkinnedMeshComponent`를 음향 geometry로 등록합니다. Actor의 임의 위치에 두는 것이 아니라
대상 mesh component의 바로 아래 child로 추가해야 합니다.

### Detail Properties

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
| `BVH Visualization Color` | 하늘색 | BVH 표시 색상입니다. |
| `Native Object Id`, `Native Mesh Id` | `-1` | 등록된 네이티브 ID입니다. 읽기 전용이며 미등록 상태는 `-1`입니다. |

Static Mesh는 Forced LOD가 있으면 그 LOD를, 없으면 LOD 0을 올립니다. Skinned Mesh도 Forced
LOD를 우선하고 현재 pose의 vertex를 등록합니다.

#### Geometry와 BVH

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

### 공개 메서드

| 메서드 | 동작 |
|---|---|
| `RegisterNativeObject()` | Parent geometry를 native scene에 등록합니다. |
| `UnregisterNativeObject()` | Native object 등록을 해제합니다. |
| `SyncNativeTransform()` | 현재 parent transform을 즉시 반영합니다. |
| `RefreshNativeMesh()` | Mesh 또는 material 변경 뒤 geometry를 다시 업로드합니다. |
| `SyncMaterialsFromParent()` (`Auto Set Materials`) | Parent render material 이름과 alias로 preset을 자동 매칭합니다. |
| `SetMaterialPresetIndex(Slot, Preset)` | 한 slot의 preset index를 변경합니다. |
| `SetMaterialPresetForAllSlots(Preset)` | 모든 slot에 같은 preset을 적용합니다. |
| `SetUpdateType(Type)` | Native object의 update policy를 변경합니다. |
| `GetResolvedMeshLodIndex()` | 실제 업로드한 LOD index를 반환합니다. |
| `GetUploadedTriangleCount()` | 마지막 업로드의 triangle 수를 반환합니다. |
| `IsRegistered()` | Native object와 mesh가 모두 유효한지 반환합니다. |
| `GetNativeObjectId()`, `GetNativeMeshId()` | 등록된 네이티브 ID를 반환합니다. 미등록 상태에서는 `-1`입니다. |
| `GetTargetMeshComponent()` | 등록 대상인 바로 위 부모 메시 컴포넌트를 반환합니다. |
| `static IsGpuCompatibleBvhType(ESoundTracingBvhType InBvhType)` | SIMD LBVH 계열이면 `true`를 반환합니다. |
| `GetBvhMaxDepth()`, `GetPrimitivesPerLeafNode()`, `GetBvhType()` | C++에서 BVH 설정을 조회합니다. |
| `GetSoundMaterialSlots()` | C++에서 사운드 재질 슬롯 배열의 읽기 전용 참조를 반환합니다. |
| `BuildNativeBvhDebugLineSegments(TArray<FVector>& OutLocalLinePoints)` | C++에서 BVH 디버그 선분을 로컬 좌표로 얻습니다. |
| `ShouldVisualizeBvh()`, `GetBvhVisualizationColor()` | Editor 전용 C++ 메서드로 BVH 표시 여부와 색상을 조회합니다. |

## 사운드 재질과 Transmission

![SoundTracing Material Preset Library Detail Properties](/img/unreal/ST_Material_Graph.png)

### Detail Properties

기본 library는 plugin의
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset`이며, 현재 Unity/Web SDK와
같은 22개 material table을 포함합니다.

Custom library는 Content Browser의
`Sounds > SoundTracing > SoundTracing Material Preset Library`에서 만듭니다. 새 asset은
현재 기본 library를 복제하며, Project Settings의 `Material Preset Library`에 지정한 뒤
Editor를 다시 시작해야 합니다.

| 필드 | 설명 |
|---|---|
| `Presets` | 사운드 재질 목록입니다. |
| `Display Name`, `Aliases` | 선택 목록의 이름과 렌더 재질 자동 매칭에 사용할 별칭입니다. |
| `Material Index` | 네이티브 재질 인덱스입니다. 목록 순서에 맞춰 관리됩니다. |
| `Scattering` | `0..1`. 정반사와 산란 비율입니다. |
| `Reflection`, `Absorption`, `Transmission` | 8개 대역의 반사·흡수·투과 에너지 계수입니다. 각 값은 `0..1`입니다. |
| `Transmission Model` | `Surface` 또는 `Solid Distance`를 선택합니다. |
| `Thickness to -30 dB (m)` | `Solid Distance`의 대역별 감쇠 기준 거리입니다. |
| `ResetToBundledJson` | 프리셋 목록을 번들 JSON의 값으로 되돌립니다. |

주파수 대역 중심은 `67.5`, `125`, `250`, `500`, `1000`, `2000`, `4000`, `8000 Hz`입니다.
Editor의 band graph를 클릭하거나 drag하여 각 값을 편집할 수 있습니다.

#### Transmission Model

| 모델 | 입력 | Geometry 조건 |
|---|---|---|
| `Surface` | 표면을 한 번 통과한 뒤 남는 대역별 energy coefficient `0..1` | 열린 면과 얇은 surface에 사용 가능 |
| `Solid Distance` | 전송 energy가 `-30 dB`가 되는 대역별 material 기준 거리(m) | 닫힌 volume과 일관된 face 방향 필요 |

`Solid Distance` 값은 object의 실제 두께가 아닙니다. Runtime이 ray가 geometry 내부를 이동한
실제 거리를 계산해 이 기준 거리로 감쇠합니다. `0`은 해당 band를 완전히 차단합니다.

Library의 `ImportFromJson`, `ExportToJson`, `ResetToBundledJson`은 Unity/Web SDK와 같은
`soundMaterial.json` 형식을 사용합니다. `transmissionDistanceToMinus30DbMeters`가 없으면
`Surface`, 유효한 8개 값이 있으면 `Solid Distance`입니다.

### 공개 메서드

| 메서드 | 반환값 / 동작 |
|---|---|
| `NormalizePresets()` | 프리셋 인덱스와 대역별 값을 정규화합니다. |
| `GetPresetCount()` | 프리셋 수를 반환합니다. |
| `FindBestPresetIndexByName(const FString& RenderMaterialName)` | 렌더 재질 이름과 별칭에 맞는 프리셋 인덱스를 찾습니다. |
| `GetPresetDisplayName(int32 PresetIndex)` | 프리셋의 표시 이름을 반환합니다. |
| `ResetToBundledJson()` | 목록을 번들 JSON으로 교체합니다. 에디터 버튼 또는 C++에서 호출합니다. |
| `ExportToJson()` | `soundMaterial.json` 형식의 문자열을 반환합니다. |
| `ImportFromJson(const FString& JsonText)` | JSON으로 목록을 교체합니다. 읽을 수 있는 재질이 없으면 `false`를 반환합니다. |
| `FindBestPresetIndex(const UMaterialInterface* RenderMaterial)` | C++에서 렌더 재질에 맞는 프리셋을 찾습니다. |
| `FindPresetIndexByToken(const FString& Token, int32 FallbackIndex)` | C++에서 토큰으로 프리셋을 찾습니다. 없으면 fallback 인덱스를 사용합니다. |
| `static GetFrequencyBandCentersHz()` | C++에서 8개 중심 주파수 배열의 읽기 전용 참조를 얻습니다. |
| `static LoadDefaultLibrary()` | C++에서 프로젝트가 지정한 라이브러리 또는 기본 라이브러리를 로드합니다. |
| `static MakeFallbackPresets()` | C++에서 기본 대체 프리셋 배열을 생성합니다. |
| `static ParseSoundMaterialJson(const FString& JsonText, TArray<FSoundTracingMaterialPreset>& OutPresets)` | C++에서 JSON을 프리셋 배열로 읽습니다. |
| `static SerializeSoundMaterialJson(const TArray<FSoundTracingMaterialPreset>& InPresets)` | C++에서 프리셋 배열을 JSON 문자열로 변환합니다. |
| `static LoadBundledJson(FString& OutJson)` | C++에서 번들 JSON 문자열을 읽고 성공 여부를 반환합니다. |

### 공개 프로퍼티

| 프로퍼티 | 타입 / 접근 | 설명 |
|---|---|---|
| `Presets` | `TArray<FSoundTracingMaterialPreset>` / 읽기·쓰기 | 라이브러리에 저장된 프리셋 배열입니다. |
| `FrequencyBandCount` | `static constexpr int32` / 상수 | 주파수 대역 수이며 `8`입니다. |

## 사운드 패스 비주얼

<span id="soundtracingpathvisualizercomponent" />

![컴포넌트 추가 검색 결과의 Sound Tracing Path Visualizer](/img/unreal/PathVisualizer_01.png)

Actor의 `Add Component`에서 `Sound Tracing Path Visualizer`를 검색해 추가합니다.
이 컴포넌트는 C++로 구현되어 있으며 경로 렌더링에 필요한 Niagara 컴포넌트를 생성합니다.

![NS_Arrow를 사용하는 Niagara 컴포넌트의 Detail Properties](/img/unreal/PathVisualizer_02.png)

Actor에 `SoundTracingPathVisualizerComponent`를 추가하면 Niagara line segment로 마지막
propagation frame의 path를 표시합니다.

:::note NS_Arrow 내장 에셋 경로
`Niagara System Asset`은 플러그인 내장 에셋인 `NS_Arrow`를 사용합니다.
기본 경로는 `/SoundTracing/FX/NS_Arrow.NS_Arrow`입니다.
함께 사용하는 재질은 `/SoundTracing/Materials/MAT_ArrowLine`에 있습니다.
플러그인을 설치하거나 옮길 때 `Content/FX`와 `Content/Materials`를 함께 유지하고,
Niagara 시스템과 재질 참조가 끊기지 않았는지 확인하십시오.
:::

### Detail Properties

| 필드 | 기본값 | 설명 |
|---|---:|---|
| `Visualization Enabled` | 켜짐 | Path 표시 여부 |
| `Refresh Interval Ms` | `50` | 시각화 갱신 최소 간격. Propagation 주기에는 영향 없음 |
| `Max Visualized Paths` | `1024` | 표시할 최대 path 수. 범위 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 강도. 범위 `0.01..2.0` |
| `Niagara System` | 비어 있음 | 비어 있으면 plugin의 default Niagara system 사용 |

색상은 Direct=빨강, Reflection=주황, Diffraction=초록, Transmission=하늘색,
Reverb=보라입니다. 성능 측정에서는 시각화를 비활성화하십시오.

### 공개 메서드

| 메서드 | 반환값 / 동작 |
|---|---|
| `SetVisualizationEnabled(bool bEnabled)` | 런타임에서 경로 표시를 켜거나 끕니다. |
| `GetActivePathCount()` | `int32`. 시각화가 유지하는 현재 경로 수를 반환합니다. |

## 샘플 데모 설명

### Test

![Unreal Test 데모 이미지 플레이스홀더](/img/unreal/demo-placeholder.svg)

SDK 샘플 프로젝트의 `Content/FirstPerson/Test.umap`을 엽니다.
오브젝트의 메시 등록, BVH와 사운드 재질 슬롯 설정을 확인할 수 있습니다.

1. 레벨의 메시를 선택해 `SoundTracingObjectComponent`의 부모 연결과 재질 슬롯을 확인합니다.
2. PIE에서 음원을 재생하고 리스너를 이동하며 방향감과 차폐에 따른 변화를 확인합니다.
3. 재질 프리셋을 바꾸어 반사·흡수·투과 차이를 비교합니다.
4. Path Visualizer를 켜서 들리는 변화와 음향 경로를 함께 확인합니다.

샘플 맵은 SDK 샘플 프로젝트의 Content에 포함됩니다.
플러그인만 설치한 프로젝트에서는 필요한 샘플 에셋을 의존성과 함께 Migrate하여 사용하십시오.

## 트러블슈팅 팁

| 증상 | 확인할 것 |
|---|---|
| 플러그인이 Audio 선택 목록에 없음 | SoundTracing 활성화, C++ 모듈 빌드, 대상 플랫폼의 Audio 설정과 에디터 재시작을 확인합니다. |
| 네이티브 라이브러리 로드 또는 ABI 오류 | 설치한 SDK의 플러그인과 네이티브 라이브러리를 함께 사용하고 패키징에 ThirdParty 파일이 포함되는지 확인합니다. |
| 소리가 나지 않거나 공간화되지 않음 | 모노 Sound Wave, Audio Component 재생, 두 전역 Audio 플러그인, Spatialization 활성화와 에셋 연결을 확인합니다. |
| 소스 설정이 적용되지 않음 | `Audio Component → Sound Attenuation → SoundTracing Source Settings` 연결과 `Override Attenuation` 설정을 확인합니다. |
| 리스너 위치가 다름 | `Drive Listener Transform`이 켜지면 컴포넌트 위치를, 꺼지면 Unreal 오디오 리스너 위치를 사용합니다. |
| 리스너 교체 경고 | 한 World의 활성 Listener Component를 하나로 유지합니다. |
| 지오메트리가 반영되지 않음 | Object Component가 지원 메시의 바로 아래 자식인지, 메시 데이터와 삼각형이 있는지 확인합니다. |
| 스킨 애니메이션이 반영되지 않음 | `Update Type = Refit`, `Sync Skinned Vertices On Tick = true`와 LOD를 확인합니다. |
| GPU가 활성화되지 않음 | `GetGpuBackendStatus()`와 Output Log를 확인합니다. Windows에서는 `exaSound.dll`과 `webgpu_dawn.dll`이 함께 배포되어야 합니다. |
| 경로가 보이지 않음 | Niagara 활성화, `Visualization Enabled`, 소스·리스너 경로 설정과 `GetLastValidPathCount()`를 확인합니다. |
| 순간이동 뒤 피치가 튐 | 위치 변경 직후 Listener 또는 Subsystem의 `ResetMotionState()`를 호출합니다. |
| 음원이 많을 때 소리가 끊김 | 아래 순서로 연산과 오디오 버퍼를 조정합니다. |

### 음원이 많을 때 소리가 끊김

1. `Propagation Interval (ms)`를 `50`으로 설정하여 연산 요청 빈도를 낮춥니다.
2. `Source Ray Resolution Cap`을 `8..16`으로 낮추거나 소스의 `Ray Preset`을 `Fast`로 설정합니다.
3. 리스너의 `Quality Preset = Fast`, `HRTF Path Budget = 1`, `Render Band Tier = Merged4`로 시작합니다.
4. `Propagation Thread Count`를 `2..3`으로 설정한 뒤 재시작하여 게임·렌더·오디오 스레드에 실행 여유를 둡니다.
5. `Buffers To Enqueue`를 `2` 이상으로 설정합니다. 필요하면 `Callback Buffer Frame Size`도 조정합니다.
6. 경로 시각화를 끄고 한 번에 하나의 설정을 바꿔 비교합니다.

### 런타임 상태 확인

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status`는 네이티브 버전, 준비 상태, 연산 방식, 오브젝트·경로 수와 리스너 설정을 출력합니다.
`SoundTracing.DumpGpuPropagationStats`는 GPU 실행과 CPU 전환 통계를 출력합니다.

## 다음 문서

- [SDK 개요](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
