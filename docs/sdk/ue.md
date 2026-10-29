---
title: Unreal Engine
description: SoundTracing UE5 플러그인 0.4.0(SimpleST 2.22.0 / ABI 6) 설치, Project Settings, 리스너·음원·오브젝트 컴포넌트, 소스·출력 EQ, 원샷 사운드, Native/FMOD/Wwise 통합 모드, 플랫폼 링크 계약.
---

# SoundTrace SDK for Unreal Engine

SoundTracing UE5 플러그인은 Unreal Audio Mixer의 Spatialization 플러그인 + 서브믹스, 그리고
Actor Component를 통해 [SimpleST](../core/simplest.md)를 연결합니다. 0.3.0부터 엔진이 STCoreV2에서
SimpleST로 바뀌었고, 0.4.0은 **SimpleST 2.22.0 / ABI 6**을 씁니다(SDK 릴리스 2.22.0-jhj.5. 이전 SDK 릴리스
2.18.2-jhj.7은 같은 0.4.0이 SimpleST 2.18.2를 썼고, 0.3.0 = SimpleST 2.12.0). 이번 릴리스에서 플러그인 버전은 그대로이고
[소스 EQ와 출력 EQ](#eq)가 들어갔으며, 리스너 방향을 쿼터니언으로 넘겨 머리 기울임(roll)이 반영됩니다(종전 yaw/pitch만).
엔진 2.21이 생성 직후 켜는 등라우드니스 보정은 플러그인이 끕니다 — 음색과 레벨은 Unreal 마스터 체인이 맡습니다.
2.18.2 SDK에서 `Max Sources` 설정, FMOD/Wwise 모드의 사운드 트레이싱 스위치 전달, 광선 샘플러 정리가 들어갔습니다.
프로젝트에 FMOD 또는 Wwise 플러그인이 있으면 같은 소스가 그 미들웨어의 SimpleST 플러그인에 붙는
**통합 모드**로 빌드됩니다.

## 현재 상태

| 항목 | 내용 |
|---|---|
| Engine | Unreal Engine 5.6 (5.7 검증) |
| Plugin | `Plugins/SoundTracing` 0.4.0 (`SoundTracing` 런타임 + `SoundTracingEditor` 모듈, Niagara 의존) |
| 지원 플랫폼 | Win64, Mac, Linux, Android, IOS |
| 배포 | `SoundTracing-release.zip` (플러그인 + 독립 Python 설치기) |
| 엔진 바이너리 | `ThirdParty/SimpleST/Binaries/<Plat>/<Config>/` — UE Debug만 SDK Debug, 나머지는 Release |
| Demo scene | 문서용 placeholder 3개. 배포 scene은 아직 포함하지 않음 |

## 설치

Python 3.9+가 있는 환경에서 설치기를 실행합니다. 프로젝트의 `Plugins/SoundTracing`에 모든 포함
플랫폼을 설치하고, 기존 플러그인은 `.simplest-backups/`에 보관합니다. 프로젝트 설정은 수정하지 않습니다.

```bash
python3 install.py /path/to/Game.uproject
python3 install.py /path/to/Game.uproject --dry-run
```

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/           Niagara 경로 시각화, Material Preset Library
      ├─ Source/            SoundTracing · SoundTracingEditor
      └─ ThirdParty/SimpleST/
         ├─ Include/SimpleST/ABI/
         ├─ Binaries/<Plat>/<Config>/
         └─ Resources/HRTF/
```

설치 뒤 `.uproject`에서 `SoundTracing` plugin을 활성화하고 editor를 다시 시작해 module compile을
완료합니다. 설치물은 UE 래퍼 소스, 에셋, 공개 C ABI 헤더, 플랫폼별 엔진 바이너리, HRTF와
라이선스만 포함합니다.

## 통합 모드 — Native / FMOD / Wwise

![통합 모드 선택](/img/ue/integration-mode.png)

`SoundTracing.Build.cs`가 `.uproject`에 켜진 플러그인을 보고 통합을 고릅니다
(`Wwise` → `FMODStudio` → Native 순, 강제는 환경변수
`SOUNDTRACING_UNREAL_INTEGRATION=native|fmod|wwise`). 컴포넌트는 세 모드에서 이름도 쓰는 법도 같습니다.

| | Native | FMOD | Wwise |
|---|---|---|---|
| SimpleST 컨텍스트·렌더 | SoundTracing(UE Audio Mixer Spatialization + 서브믹스) | `SimpleSTFmod`(Source/Listener DSP) | `SimpleSTWwise`(Sound-tracing Renderer) |
| SoundTracing이 하는 일 | 전부 | 지오메트리·재질·시각화·통계만 | 같음 (`sceneRatio = 0.01`, Unreal 축 알림) |
| 리스너 | UE 리스너 / `ListenerComponent` | FMOD 리스너 0 | Wwise 리스너 |
| 엔진 DLL 위치 | `ThirdParty/SimpleST/Binaries` | `FMODStudio/Binaries/<Plat>/` | `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` |

FMOD·Wwise 모드에서는 `ListenerComponent`의 출력 설정(HRTF·출력 모드)과 Source Settings 에셋이
쓰이지 않습니다 — 미들웨어 플러그인의 파라미터가 그 역할입니다.

### FMOD 모드 설치

```bash
python3 install.py /path/to/Game.uproject --fmod <fmod/plugins 폴더>
```

`--fmod`는 `SimpleSTFmod`·`SimpleSTRealtime`·HRTF를 `Plugins/FMODStudio/Binaries/<Plat>/`에 복사하고
`Config/DefaultEngine.ini`에 `+PluginFiles=SimpleSTFmod`를 넣습니다(= Project Settings › FMOD Studio ›
Plugin Files). 이후 FMOD Studio에서 마스터 버스에 SimpleST Listener, 3D 이벤트 마스터 트랙에
SimpleST Source를 넣습니다 — [FMOD 플러그인](./fmod.md).

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

### Wwise 모드 설치

```bash
python3 install.py /path/to/Game.uproject --wwise <wwise/SDK 폴더>
```

SoundTracing은 모듈 시작 때 플러그인을 잡아 `sceneRatio = 0.01`(Wwise Unreal 단위 = cm)로 설정하고
`SimpleSTWwise_SetWorldAxes(UNREAL)`로 언리얼 축(+Z 위)을 알립니다. Wwise for Unreal 2024.1+는
위치를 축 변환 없이 넘기기 때문입니다 — [Wwise 플러그인](./wwise.md).

![UE Wwise 설치 결과](/img/wwise/ue-install.png)

## Unreal Audio 설정 (Native 모드)

각 target platform의 Audio 설정에서 다음 plugin을 선택합니다.

![Audio 플러그인 설정](/img/ue/audio-plugin-settings.png)

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

Audio Mixer Sample Rate는 어떤 값이든 됩니다. SimpleST는 44.1 kHz로 돌고 장치 레이트로 변환합니다
(44.1 kHz면 변환을 건너뜁니다).

## Project Settings › Plugins › SoundTracing

![Project Settings](/img/ue/project-settings.png)

| 카테고리 | 항목 | 기본값 | 설명 |
|---|---|---:|---|
| Runtime | `Max Compute Threads` | `0` | SimpleST 계산 스레드 상한. 0 = auto(min(퍼포먼스 코어, 6)). 재시작 필요 |
| Runtime | `Prefer Performance Cores` | `true` | 전파 레인·계산 풀을 퍼포먼스 코어에 고정(Windows 11 EcoQoS 끔). 하이브리드 CPU 권장 |
| Runtime | `Render Mode` | `Buffered` | `Buffered`(SimpleST 렌더 스레드가 링을 채우고 콜백은 복사, ≈3 블록 지연) / `In Callback`(Unreal 오디오 콜백 안에서 렌더, 최저 지연) |
| Runtime | `Max Sources` | `0` | 고급. 동시에 살아 있는 엔진 음원 수 상한. 0 = 엔진 플랫폼 기본(데스크톱 128, Android/iOS 48). 넘는 음원은 엔진이 거절하고(`ST_STATUS_BUDGET_EXCEEDED`, 로그에 표시) 컴포넌트는 dry 경로로 폴백합니다. SoundTracing이 컨텍스트를 만드는 Native 모드에서 생성 때 적용(재시작 필요). FMOD/Wwise 모드는 플러그인 설정을 따릅니다 — [음원 메모리 예산](../core/simplest.md#음원-메모리-예산) |
| Runtime | `Max Delay Seconds` | `0` | 고급. 음원별 지연 링의 천장. 0 = 엔진 플랫폼 기본(데스크톱 2 s, Android/iOS 1 s). 링은 경로가 필요한 만큼만 자랍니다 |
| Runtime | `Dry Fallback When Unavailable` | `true` | 런타임이 없거나 실패하면 음원을 무음 대신 dry로 재생 |
| Runtime | `Output Submix Parent` | 비어 있음 | 공간화 출력 서브믹스의 부모 |
| Propagation | `Reflection Update Interval (ms)` | `33` | 반사/회절 레인 최소 주기. 전파 비용의 대부분이라 CPU를 되사려면 여기를 올림. 0 = 제한 없음 |
| Propagation | `Direct Update Interval (ms)` / `Reverb Update Interval (ms)` | `10` / `4` | direct, reverb 레인 최소 주기 |
| Propagation | `Acceleration Structure` | `TinyBVH` | BinnedSAH / HybridKD / TinyBVH / LBVH / LBVH SIMD |
| Propagation | `Static Rebuild Delay Seconds` | `0.1` | 정적 지오메트리 변경을 정적 가속구조에 접기 전 대기(레벨 스트리밍 배칭) |
| Listener | `Default Listener Settings` | — | 아래 리스너 설정 구조체 |
| Sources | `Source Ray Resolution Cap` / `Source Ray Depth Cap` | `0` / `0` | 모든 음원 에셋의 transport ray 격자·깊이 상한. 0 = 에셋 값 그대로 |
| Listener | `Output EQ` | 꺼짐 | SimpleST 믹스 전체에 거는 파라메트릭 출력 EQ — [EQ](#eq). 켜져 있는 동안 리스너의 그래픽 `Output EQ`를 대신합니다. Native 모드 전용 |
| Materials | `Material Preset Library` | 비어 있음 | 시작 시 SimpleST에 등록할 라이브러리. 비면 플러그인 번들 사용 |

## 리스너 설정 (`FSoundTracingListenerSettings`)

![리스너 설정](/img/ue/listener-settings.png)

프로젝트 기본값은 Project Settings에, 레벨별 override는 `USoundTracingListenerComponent`에 둡니다.

| 카테고리 | 항목 | 기본값 | 선택지 / 설명 |
|---|---|---:|---|
| Quality Preset | `Quality Preset` | `Balanced` | `Custom`(필드 유지) / `Fast`(12×12, 깊이 4) / `Balanced`(16×16, 깊이 8 = 엔진 기본) / `Quality`(24×24, 깊이 8) |
| Listener Rays | `Ray Resolution` / `Ray Depth` | `16` / `8` | guide ray N×N (`4..64`), 반사 최대 차수 (`1..16`). Custom일 때만 편집 |
| Listener Rays | `Ray Sampling` | `FibonacciSphere` | `FibonacciSphere`만. SimpleST 2.18은 Fibonacci만 받으므로 나머지 4종(LegacyGrid / EqualAreaGrid / SobolSphere / Icosahedral)은 에디터에서 숨겨졌고, 저장된 값은 FibonacciSphere로 보내며 경고를 한 번 남깁니다 |
| Output | `Output Mode` | `Headphones` | `Headphones`(바이노럴 HRIR) / `Speakers (HOA decode)` / `Stereo Panning` |
| Output | `HRTF Dataset` | `SADIE II D2 KEMAR` | SADIE II D2(8,802방향·256탭, 플러그인 동봉) / MIT KEMAR(128탭, 엔진 내장) |
| Output | `Speaker Layout` | `Stereo 2.0` | Stereo 2.0 / Laptop Stereo 2.0 / 2.1 / 4.1 / 5.1 / 7.1 |
| Output | `Early Reflections` | `Hybrid Ambisonic Bed` | Headphones·Stereo Panning 전용. `Objects`는 기준 청취용 — 음원 8개 홀에서 블록 16.8 ms(한계 11.6 ms), Hybrid 2.4 ms |
| Render | `Doppler` / `Doppler Gain` | `true` / `Off` | 가변 지연 피치 / 이동 모노폴 방사 게인 |
| Render | `Late Reverb` / `Late Reverb Coupling` | `true` / `Default` | FDN16 / Off · Subtle 6 dB · Default 9 dB · Strong 12 dB |
| Render | `Path Fade Time Seconds` | `0.05` | 경로 등장·소멸 크로스페이드 |
| Render | `Limiter` | `Off` | Off / Envelope / LookaheadPeak / True Peak. `True Peak`(0.4.0)는 SimpleST 2.18 true-peak 리미터(−1 dBTP, 137샘플 지연). 엔진 2.18은 생성 직후 리미터를 켜지만 플러그인 기본은 `Off`로, Unreal 마스터 체인이 리미팅을 맡습니다. 0.4.0에서 스피커 출력(`Speakers`)에서도 `Off`가 적용되도록 수정 |
| Render | `Output EQ Enabled` / `Output EQ Gains Db` | `false` | 63 ~ 16k Hz 9밴드 ±24 dB 그래픽 EQ. Project Settings의 파라메트릭 `Output EQ`가 켜져 있으면 그쪽이 이기고, 끄면 이 값이 돌아옵니다 |
| Paths | `Enable Direct/Transmission/Reflection/Diffraction/Reverb Path` | 전부 `true` | 전역 경로 게이트 |
| Acoustics | `Propagation Delay` / `Direct Occlusion` | `true` / `true` | 끄면 각각 모든 경로가 직접음 시각에 겹침 / 직접음이 지오메트리를 통과 |
| Acoustics | `Reference Distance Meters` / `Min Distance Meters` | `1.0` / `1.0` | 물리 `1/r` 감쇠 시작 거리 / 근접 클램프 |
| Air Absorption | `Air Absorption Enabled`, `Temperature Celsius`, `Relative Humidity Percent`, `Pressure Pa` | `true`, `20`, `50`, `101325` | ISO 9613-1. 음속은 온도에서 유도 |

### `USoundTracingListenerComponent`

선택 컴포넌트입니다. 없어도 플러그인은 프로젝트 기본 리스너 설정과 오디오 장치 리스너 transform으로
동작합니다. Pawn이나 카메라에 붙여 레벨별 override를 주거나 transform을 직접 공급합니다.

| 항목 | 설명 |
|---|---|
| `Override Project Listener Settings` / `Listener Settings` | 위 구조체로 프로젝트 기본값을 덮어씀 |
| `Drive Listener Transform` | 이 컴포넌트의 world transform·속도를 오디오 장치 리스너 대신 SimpleST에 전달(회전은 roll 포함) |
| `ApplyListenerSettings()`, `SetQualityPreset()`, `SetHrtfDataset()`, `SetOutputMode()`, `SetSpeakerLayout()` | Blueprint에서 런타임 변경 |
| `ResetMotionState()` | 텔레포트·리스폰 뒤 Doppler 스파이크 방지 |

## 음원 설정 에셋 (`USoundTracingSourceSettings`)

![Source Settings 에셋](/img/ue/source-settings-asset.png)

Content Browser에서 `SoundTracing Source Settings` 에셋을 만들고 Audio Component 또는 Sound
Attenuation의 spatialization plugin settings에 연결합니다. 용도별 shared asset을 preset처럼 쓰십시오.

| preset asset | 용도 |
|---|---|
| `ST_Source_Fast` | 많은 동시 음원, 배경 source |
| `ST_Source_Balanced` | 일반 gameplay source |
| `ST_Source_Quality` | 주연 음원, 품질 우선 demo |

| 카테고리 | 항목 | 기본값 | 설명 |
|---|---|---:|---|
| Attenuation | `Preserve Unreal Attenuation` | `false` | 켜면 Unreal 거리 감쇠를 유지(보통 끔 — SimpleST가 물리 감쇠) |
| Attenuation | `Disable Unreal Reverb Sends` | `false` | Unreal 리버브 센드 차단 |
| Emission | `Gain Boost Db` | `0` | 입력 레벨 (±24 dB) |
| Emission | `Direct/Reflection/Diffraction/Reverb Send Db` | `0` | SimpleST path volume |
| Emission | `Directivity` | `0` | 0 전지향 ~ 1 카디오이드 |
| Reverb Rays | `Ray Preset` | `Balanced` | `Fast`(8×4, 깊이 3) / `Balanced`(16×8, 깊이 4 = 엔진 기본) / `Quality`(24×12, 깊이 6) / `Custom` |
| Reverb Rays | `Ray Resolution` / `Ray Depth` | `16` / `4` | N×N/2 transport ray, 깊이. Custom일 때만 편집 |
| Reverb Rays | `Transport Refresh Steps` | `0` | 수송 격자를 n번의 전파에 나눠 갱신(0 = 엔진 기본) |
| Reverb Rays | `Stationary Emitter` | `false` | 움직이지 않는 이미터 힌트 |
| Per-Path Enable | `Direct/Transmission/Reflection/Diffraction/Reverb Path Enabled` | 전부 `true` | 음원별 경로 게이트 |
| Bypass | `Bypass` | `false` | SimpleST를 거치지 않고 통과 |
| EQ | `Source EQ` | 꺼짐 | 이 에셋을 쓰는 음원 신호에 거는 파라메트릭 EQ — [EQ](#eq) |

## EQ

SDK 릴리스 2.22.0-jhj부터 SimpleST 파라메트릭 EQ를 두 자리에서 씁니다. 두 자리 모두 같은 구조체
`FSoundTracingEq`(`Enabled`, `Preamp (dB)` −48 ~ +12, `Bands` 최대 16개)를 씁니다.

| 자리 | 설정 | 런타임 변경 | 거는 곳 |
|---|---|---|---|
| 소스 EQ | Source Settings 에셋 `Source EQ` | `USoundTracingSourceSettings::SetSourceEq` / `GetSourceEq` (Blueprint) | 음원 신호, SimpleST 밴드 분리 앞. 직접음·반사·회절·잔향 송출이 모두 같은 톤 |
| 출력 EQ | Project Settings › SoundTracing › Listener › `Output EQ` | `USoundTracingSubsystem::SetOutputEq` / `ClearOutputEqOverride` / `GetOutputEq` | SimpleST 믹스 전체, 렌더 끝(마스터 게인 앞) |

밴드(`FSoundTracingEqBand`)는 `Enabled`, `Type`, `Frequency Hz`(20 ~ 20,000), `Gain (dB)`(±24, Peaking·셸프만),
`Q`(0.1 ~ 30, 셸프는 3까지)입니다. `Type`(`ESoundTracingEqFilterType`)은 `Peaking (Bell)` · `Low Shelf` · `High Shelf` ·
`High Cut (Low-pass)` · `Low Cut (High-pass)` · `Notch`이고 컷은 12 dB/oct 고정입니다.

- 기본은 꺼짐이고 꺼져 있으면 SimpleST를 호출하지 않습니다. 값이 바뀌면 SimpleST가 20 ms 크로스페이드로 넘어갑니다.
- `SetSourceEq`는 그 에셋으로 재생 중인 보이스에도 바로 반영되고, 엔진 음원 풀에서 재사용하는 음원은 생성 때 EQ를 다시
  걸거나 지웁니다.
- `SetOutputEq`는 `ClearOutputEqOverride`를 부를 때까지 Project Settings 값을 덮어쓰고, 런타임을 다시 시작해도 유지됩니다.
  꺼진 EQ를 넘기면 출력 EQ가 꺼집니다.
- **Native 모드 전용**입니다. FMOD/Wwise 모드에서는 미들웨어 플러그인의 EQ를 씁니다 —
  [FMOD](./fmod.md#eq) · [Wwise](./wwise.md#eq).
- EQ export가 없는 이전 SimpleST 런타임에서는 EQ 설정을 무시하고 경고를 한 번 남깁니다.

## 원샷 사운드

엔진은 **새 음원**의 모든 경로를 150 ms에 걸쳐 페이드인하고 첫 IR을 기다리므로, 짧은 소리를 재생할 때마다 엔진
음원을 새로 만들면 소리가 작고 늦게 들립니다. 플러그인은 모드별로 이를 처리합니다.

- **Native 모드**: 컨텍스트 시작 때 엔진 음원 풀을 미리 만들어 두고, 보이스가 끝나면 그 음원을 풀로
  돌려 가장 가까운 다음 보이스가 이어 받습니다. 재생할 때마다 Audio Component·사운드를 새로 재생해도 엔진
  음원이 새로 만들어지지 않습니다.
- **FMOD / Wwise 모드**: 렌더는 미들웨어 플러그인이 하므로 그 웜 음원 풀(FMOD 0.3.0 · Wwise 0.2.0)을
  따릅니다 — [FMOD](./fmod.md#원샷과-웜-음원-풀) · [Wwise](./wwise.md#원샷과-웜-음원-풀). **Wwise AudioLink**처럼
  소리마다 새 게임 오브젝트를 등록하는 경우도 처리됩니다.

## 지오메트리 (`USoundTracingObjectComponent`)

![Object Component](/img/ue/object-component.png)

음향 geometry로 사용할 `StaticMeshComponent` 또는 `SkinnedMeshComponent`의 **바로 아래 child**로
추가합니다. 같은 메시 asset·LOD·재질 배치를 쓰는 오브젝트는 SimpleST 메시 하나를 공유합니다.

| 항목 | 기본값 | 설명 |
|---|---:|---|
| `Acoustic Mobility` | `Auto` | `Auto`(부모 Mobility 따름) / `Static`(정적 가속구조, 이동하면 재빌드) / `Movable`(동적 인스턴스, 매 전파 주기 변환 적용) |
| `Sound Material Slots` | — | 렌더 재질 슬롯 → `Sound Material Type`(preset index). `Auto Set Materials` 버튼이 이름·별칭으로 자동 배치 |
| `Skinned Pose Refresh Seconds` | `0` | 스킨드 부모 전용. SimpleST에는 vertex refit이 없으므로 이 주기마다 **새 메시를 빌드**해 교체. 0 = 등록 시 포즈 유지 |
| `Auto Register Native Object` / `Sync Transform On Tick` / `Auto Sync Materials` | `true` | 고급 |
| Debug: `Visualize Acoustic Mesh`, `Visualize BVH`(+ `BVH Depth`, `BVH Leaves Only`) | 꺼짐 | 선택 시 업로드 삼각형·가속구조 노드 박스를 에디터에 표시 |

전용 서버는 등록을 건너뜁니다. Blueprint에서 `RegisterNativeObject`, `UnregisterNativeObject`,
`SyncNativeTransform`, `RefreshNativeMesh`, 재질 슬롯 get/set을 호출할 수 있습니다.

## Material preset

플러그인 content의 `SoundTraceMaterialPresetLibrary`가 SoundTrace 게임 재질 22종 9밴드 preset을
제공합니다. Unity·Web SDK와 이름·순서(인덱스 0 `Concrete` ~ 21 `FiberglassReinforcedPlastic`)와 9밴드
값이 모두 같습니다. 측정 데이터가 아닌 게임용 프리셋으로, 기존 8밴드 값에서 반사 R과 투과 T는 그대로
두고 흡수는 A = 1 − R − T, 16 kHz 밴드는 8 kHz 값을 반복해 변환했습니다. 옛 STCoreV2 재질 라이브러리와
`soundMaterial.json`도 로드할 때(`Import From JSON` 포함) 같은 규칙으로 변환되므로 변환된 asset은
다시 저장하십시오.
`Sound Material Slots`는 render material 이름과 alias로 가장 가까운 preset을 선택합니다. 9밴드
reflection·absorption·transmission·scattering을 직접 편집하는 작업은 별도 Material Preset Library
asset을 만든 경우로 제한하십시오. 밴드마다 `R + A + T = 1`(±0.001)이어야 합니다.

## Path visualization

![Path Visualizer](/img/ue/path-visualizer.png)

Actor에 `SoundTracingPathVisualizerComponent`를 추가하면 Niagara 기반 path segment를 표시합니다.
경로 종류(Direct·Reflection·Diffraction·Reverb·Transmission·GuideRay)별 색, 최대 경로 수, 선 폭,
알파를 조절합니다. 디버그와 데모용이며 shipping 성능 측정에서는 비활성화하십시오.

## 통계 (`USoundTracingSubsystem`)

Blueprint에서 읽을 수 있는 World Subsystem입니다 — 통합 모드, 씬 메시/오브젝트/음원/삼각형 수,
유효 경로 수, 레인별 전파·IR·렌더 시간(ms), 렌더 블록 통계(active sources, exact/send taps).

`SetSoundTracingEnabled(bool)` / `IsSoundTracingEnabled()`로 사운드 트레이싱 전체를 켜고 끕니다. 꺼져 있는
동안에는 리스너·음원이 움직여도 전파 레인을 깨우지 않고, 시각화 경로도 모으지 않아 마지막 경로가 남지 않습니다.
FMOD·Wwise 모드에서는 SDK 릴리스 2.18.2부터 이 스위치를 미들웨어 플러그인에 넘깁니다
(`SimpleSTFmod_SetSoundTracingEnabled` / `SimpleSTWwise_SetSoundTracingEnabled`). 그 전에는 플러그인이 소유한
컨텍스트라 끄기가 효과가 없었습니다. 새 런타임에 붙은 뒤에도 꺼진 상태를 다시 보내고, 이 export가 없는 구형
플러그인이면 경고를 남깁니다. SimpleST에는 전파 일시정지가 없으므로 음원이 남아 있는 동안 레인은 자체 주기로
계속 돕니다.

## 플랫폼 링크 계약

| UE 플랫폼 | SDK 경로 (`Binaries/` 아래) | 연결 |
|---|---|---|
| Win64 | `Win64/<Config>/SimpleSTRealtime.dll` | 런타임 export 바인딩 |
| Mac | `Mac/<Config>/libSimpleSTRealtime.dylib` | Universal, 런타임 바인딩 |
| Linux | `Linux/<Config>/libSimpleSTRealtime.so` | x86_64, 런타임 바인딩 |
| Android | `Android/<ABI>/<Config>/libSimpleSTRealtime.so` | UPL로 APK ABI별 폴더에 복사. HRTF는 UFS에서 추출 |
| IOS | `IOS/device` 또는 `IOS/simulator` 아래 `<Config>/libsimplest_static.a` | 정적 링크, 직접 함수 포인터 바인딩 |

UE Debug만 SDK Debug를 사용하고 Development/DebugGame/Shipping은 Release를 사용합니다.
누락은 UBT 단계에서 오류입니다. 미들웨어 플러그인이 정적 링크되는 iOS·Web에서 FMOD/Wwise
모드는 아직 지원하지 않습니다(데스크톱 Win64 검증, Mac/Linux 같은 코드 경로).

## Demo scene placeholder

현재 SDK checkout에는 아래 세 문서용 demo scene이 포함되어 있지 않습니다. 실제 asset이
추가될 때 Unity 문서와 같은 패턴으로 연결할 자리입니다.

### SampleScene01 — Basic Room

:::note Placeholder
기본 source, listener, static room geometry, material preset, direct/reflection path를
설명할 scene입니다.
:::

### SampleScene02 — Material and Dynamic Door

:::note Placeholder
shared source preset, material 변경, Movable door 차폐, Buffered/In Callback 렌더 모드 비교를
설명할 scene입니다.
:::

### SampleScene03 — Multiroom

:::note Placeholder
여러 source, room 이동, diffraction/transmission, HRTF 방향감, late reverb coupling을 설명할
scene입니다.
:::

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| plugin이 선택 목록에 없음 | plugin enable, module compile, target platform Audio 설정 |
| native library load 실패 | `ThirdParty/SimpleST/Binaries`의 target별 binary, Config(Debug/Release) 매칭 |
| 통합 모드가 예상과 다름 | `.uproject`의 Wwise/FMODStudio 플러그인 활성 상태, `SOUNDTRACING_UNREAL_INTEGRATION` |
| FMOD/Wwise 모드에서 소리가 공간화되지 않음 | FMOD Studio / Wwise 프로젝트 쪽 SimpleST DSP 구성, 런타임 READY 상태(Output Log) |
| source가 공간화되지 않음 (Native) | Audio Component에 SoundTracing Source Settings asset 연결 여부 |
| geometry가 반영되지 않음 | Object Component의 immediate parent가 지원 mesh component인지, `Acoustic Mobility` |
| 렌더 블록 초과 (오디오 끊김) | `Early Reflections = Hybrid`, `Reflection Update Interval` 상향, Quality Preset 하향 |
| 짧은 소리가 작거나 늦게 들림 (FMOD/Wwise 모드) | FMOD 플러그인 0.3.0 / Wwise 플러그인 0.2.0 이상인지, `SIMPLESTFMOD_WARM_SOURCES=0`이 설정되어 있지 않은지 |
| 일부 음원이 dry로 재생됨 (Native) | Output Log의 `ST_STATUS_BUDGET_EXCEEDED` — 음원을 줄이거나 `Max Sources`를 올림 |
| EQ를 켜도 소리가 그대로임 | Native 모드인지(FMOD/Wwise 모드는 미들웨어 EQ), Output Log의 EQ 미지원 경고(이전 SimpleST 런타임) |
| FMOD/Wwise 모드에서 사운드 트레이싱을 꺼도 그대로임 | 플러그인이 `*_SetSoundTracingEnabled`를 export하는 버전인지(없으면 Output Log에 경고) |
| path가 보이지 않음 | visualizer component, Niagara plugin, path enable 상태, 사운드 트레이싱이 꺼져 있지 않은지 |

## 다음 문서

- [FMOD 플러그인](./fmod.md) · [Wwise 플러그인](./wwise.md)
- [Unity SDK](./unity.md) · [Web SDK](./web.md)
- [SimpleST](../core/simplest.md)
