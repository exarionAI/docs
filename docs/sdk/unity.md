---
title: Unity
description: SoundTrace Unity SDK 설치, 품질 프리셋, Band8/Parametric HRTF, GPU backend와 세 샘플 씬.
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# SoundTrace SDK for Unity

SoundTrace Unity SDK는 Unity scene의 메시, 렌더링 material slot, 음원, listener를
[STCoreV2](../core/stcorev2.md)에 연결하는 실시간 공간 음향 플러그인입니다.

## 요구 사항

| 항목 | 내용 |
|---|---|
| Unity | 2022.3 LTS 이상 |
| 데스크톱 | macOS, Windows, Linux |
| 모바일 | iOS, Android |
| Web | WebGL ST/MT plugin 포함 |

GPU propagation은 설치된 native plugin과 플랫폼이 지원할 때만 활성화되며, 지원하지
않으면 CPU로 fallback합니다. 현재 iOS와 Android는 CPU propagation을 사용합니다.

## 설치

Unity Package Manager에서 `Add package from git URL...`을 선택하고 SDK 저장소 URL을
입력합니다.

```text
https://github.com/exarionAI/Unity_SoundTraceSDK.git
```

배포 방식에 따라 인증 또는 라이선스 package가 필요할 수 있습니다. 직접 clone한 경우
SDK root를 프로젝트의 `Packages/` 또는 개발 셸의 `Assets/SoundTrace` 한 곳에만 둡니다.
두 위치에 동시에 설치하면 duplicate compile이 발생합니다.

## Unity Audio 설정

1. `Edit > Project Settings > Audio`를 엽니다.
2. `Default Speaker Mode`를 `Stereo`로 설정합니다.
3. `DSP Buffer Size`를 `Best latency`로 설정합니다.

![Unity Audio 설정](/img/unity/Image01_AudioSetting.png)

## 가장 빠른 설정

1. 빈 GameObject에 `SoundTraceManager`를 추가합니다.
2. Main Camera에 `SoundTraceListener`를 추가합니다.
3. 음원 GameObject에 `SoundTraceSource`를 추가하고 `AudioSource` clip을 지정합니다.
4. 음향 geometry로 사용할 Mesh GameObject에 `SoundTraceObject`를 추가합니다.
5. 필요하면 Manager와 같은 GameObject에 `SoundTracePathVisualizer`를 추가합니다.
6. Play Mode에서 소리와 path를 확인합니다.

![SoundTraceManager](/img/unity/Image06_Manager.png)

![SoundTraceListener](/img/unity/Image04_Listener.png)

![SoundTraceSource](/img/unity/Image05_Source.png)

![SoundTraceObject](/img/unity/Image03_SoundTraceObject.png)

## 품질 프리셋

`SoundTraceListener`의 `Quality Preset`만 먼저 선택하십시오.

| 프리셋 | 권장 대상 |
|---|---|
| `Fast` | 모바일, 저전력 장치, 많은 음원 |
| `Middle` | 기본값. 일반 게임과 데스크톱 |
| `Quality` | 고성능 장치와 품질 우선 데모 |

프리셋은 listener ray와 HRTF/diffuse render 품질을 함께 적용합니다. 개별 property를
편집하면 `Custom`으로 바뀝니다. 일반 통합에서는 ray resolution, depth, path budget을
직접 조정하지 말고 프리셋으로 성능을 맞추십시오.

## HRTF 선택

`SoundTraceListener > HRTF`에서 선택합니다.

| 모드 | 특징 |
|---|---|
| `Band8` | 외부 HRTF table이 필요 없는 가벼운 기본 경로 |
| `Parametric` | KU100 parametric asset을 사용하는 측정 기반 경로 |

Unity wrapper의 현재 초기값은 `Parametric`입니다. `Band8`은 asset load 없이 실행되며,
`Parametric`은 `Runtime/Resources/SoundTrace/HRTF/KU100_bprime.bytes`를 로드합니다.

SDK에는 HRIR 계열 고급 모드도 있지만, 기본 제품 문서는 `Band8`과 `Parametric` 선택에
집중합니다.

## GPU backend

`SoundTraceManager > Use GPU Backend`를 켜면 GPU propagation을 요청합니다.

- 활성화에 성공하면 GPU backend를 사용합니다.
- plugin 또는 device가 지원하지 않으면 CPU fallback으로 계속 실행합니다.
- `Propagation Thread Count` 값은 fallback용으로 유지됩니다.
- WebGL GPU build는 STCoreV2의 WebGPU build를 사용합니다.

Play Mode의 Manager runtime state에서 `Active`, `Requested / CPU fallback`,
`Disabled` 상태를 확인할 수 있습니다.

## 사운드 재질 프리셋

`SoundTraceObject`는 Unity material slot을 SoundTrace material preset에 연결합니다.

1. 메시 import 설정에서 `Read/Write Enabled`를 켭니다.
2. `SoundTraceObject` Inspector에서 `Auto Set`을 실행합니다.
3. 자동 매칭이 틀린 submesh만 dropdown에서 preset을 변경합니다.

![Material Preset Library](/img/unity/Image_Mat_01.png)

기본 library는
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`입니다.
처음에는 `Concrete`, `Steel`, `Marble`, `Snow`, `Soil` 같은 기본 preset을 사용하십시오.
8-band 수치를 직접 편집하는 기능은 커스텀 재질 제작용 고급 경로입니다.

## 오브젝트 업데이트

| 모드 | 사용 대상 |
|---|---|
| `Static` | 움직이지 않는 room, wall, floor |
| `Dynamic` | Transform만 움직이는 door, prop |
| `Refit` | topology는 유지되고 vertex가 변하는 skinned/animated mesh |
| `Rebuild` | topology 자체가 변경되는 특수 geometry |

대부분의 scene은 `Static`과 `Dynamic`만 사용하면 됩니다. `Refit`과 `Rebuild`는 실제
geometry 변경이 필요한 경우에만 선택하십시오.

## 주요 컴포넌트

### SoundTraceManager

scene당 하나만 둡니다. native runtime, material preset, propagation update와 GPU/CPU
backend를 관리합니다.

### SoundTraceListener

보통 Main Camera에 붙입니다. `Quality Preset`과 `HRTF`를 선택하고 나머지 고급 설정은
기본값으로 유지합니다.

### SoundTraceSource

같은 GameObject의 `AudioSource` 출력을 공간화합니다. 여러 source의 재생 시점을 맞춰야
하면 `AudioSettings.dspTime`과 `PlayScheduled()`를 사용합니다.

### SoundTraceObject

`MeshFilter`와 `MeshRenderer` geometry를 SoundTrace scene에 등록합니다. 여러 child mesh가
있는 모델은 `Add To Child Meshes`를 사용합니다.

### SoundTracePathVisualizer

direct, reflection, diffraction, reverb, transmission path를 디버깅용 line으로 표시합니다.
출시 build의 필수 기능이 아니며 성능 측정 시에는 끄십시오.

## 샘플

### SampleScene01

![SampleScene01](/img/unity/SampleScene01.png)

기본 room, source, listener, SoundTraceObject와 path visualization을 확인하는 입문 scene입니다.

### SampleScene02

![SampleScene02](/img/unity/SampleScene02.png)

source/listener 이동, material preset 변경, Unity 원본 오디오와 SoundTrace 출력 비교를
한 화면에서 확인합니다.

### SampleScene03

![SampleScene03](/img/unity/Img_25_Sample03.png)

넓은 공간에서 NPC 음원, 벽 차폐, 이동 중 HRTF 방향감과 room response를 확인합니다.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소리가 나지 않음 | Stereo/Best latency 설정, AudioSource clip, Listener/Manager 존재 여부 |
| geometry가 반영되지 않음 | `Read/Write Enabled`, MeshFilter/MeshRenderer, Object update mode |
| GPU가 활성화되지 않음 | 현재 platform plugin 지원 여부. CPU fallback warning은 정상 동작 |
| 성능이 부족함 | `Quality → Middle → Fast`, path visualizer 비활성화 순서로 확인 |
| 방향이 이상함 | Main Camera의 Transform과 AudioListener 중복 여부 확인 |
| 여러 음원이 울려 들림 | 같은 `AudioSettings.dspTime`으로 `PlayScheduled()` 실행 |

## 다음 문서

- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
- [Performance Guide](./performance.md)
