---
title: Unreal Engine
description: SoundTracing UE5 plugin 설치, audio plugin 설정, HRTF, GPU backend, material preset과 샘플 placeholder.
---

# SoundTrace SDK for Unreal Engine

SoundTrace UE5 SDK는 Unreal Audio Extension Plugin과 Actor Component를 통해
[STCoreV2](../core/stcorev2.md)를 연결합니다. 현재 source project는 Unreal Engine
5.6 기준이며 native Unreal Audio, FMOD, Wwise integration 선택 구조를 포함합니다.

## 현재 상태

| 항목 | 내용 |
|---|---|
| Engine | Unreal Engine 5.6 |
| Plugin | `Plugins/SoundTracing` |
| Target declaration | Win64, macOS, Linux, Android, iOS |
| 현재 checkout의 prebuilt binary | Win64 Release |
| Demo scene | 문서 placeholder 3개. 배포 scene은 아직 포함하지 않음 |

다른 플랫폼은 배포 package에 해당 STCoreV2 binary가 포함되어야 합니다.

## 설치

1. 프로젝트를 닫습니다.
2. SDK의 `Plugins/SoundTracing` 폴더를 대상 프로젝트의 `Plugins/` 아래에 복사합니다.
3. `.uproject`를 열고 `SoundTracing` plugin을 활성화합니다.
4. editor를 다시 시작하고 module compile을 완료합니다.
5. `Project Settings > Plugins > SoundTracing`에서 전역 설정을 확인합니다.

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

## Unreal Audio 설정

각 target platform의 Audio 설정에서 다음 plugin을 선택합니다.

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

샘플 project는 48 kHz, 1024 callback frame, one queued buffer를 사용합니다. 기존 프로젝트의
audio budget이 다르면 먼저 현재 설정으로 기능을 확인한 뒤 조정하십시오.

## 가장 빠른 설정

### 1. Project settings

`Project Settings > Plugins > SoundTracing`에서 다음 항목만 먼저 결정합니다.

- HRTF: `Band8` 또는 `Parametric`
- GPU propagation 사용 여부
- path type 기본 enable 상태

ray resolution, depth, early path budget 같은 고급 항목은 처음에는 기본값으로 유지합니다.

### 2. Source settings asset

Content Browser에서 `SoundTracing Audio Spatialization Settings` asset을 만들고 재사용합니다.
각 Audio Component마다 모든 property를 따로 조정하지 말고, 용도별 shared asset을
preset처럼 사용하십시오.

권장 구성:

| preset asset | 용도 |
|---|---|
| `ST_Source_Fast` | 많은 동시 음원, 배경 source |
| `ST_Source_Middle` | 일반 gameplay source |
| `ST_Source_Quality` | 주연 음원, 품질 우선 demo |

현재 plugin은 source asset에 저수준 property도 노출하지만, 일반 사용자는 기본값을
복제한 뒤 `Intensity`, path enable, attenuation override 정도만 변경하면 됩니다.

### 3. Audio Component

Audio Component 또는 Sound Attenuation의 spatialization plugin settings에 위
`SoundTracing Audio Spatialization Settings` asset을 연결합니다.

### 4. Geometry

음향 geometry로 사용할 `StaticMeshComponent` 또는 `SkinnedMeshComponent`의 바로 아래
child component로 `SoundTracingObjectComponent`를 추가합니다. 현재 source는 immediate
parent mesh를 대상으로 합니다.

### 5. Material

`Sync Materials From Parent`를 실행하면 render material 이름을 기준으로 SoundTrace
material preset을 자동 배치합니다. 틀린 slot만 preset을 수정합니다.

## HRTF

기본 제품 가이드는 두 모드를 사용합니다.

| 모드 | 특징 |
|---|---|
| `Band8` | 별도 HRTF asset 없이 실행되는 가벼운 경로 |
| `Parametric` | KU100 parametric table을 사용하는 측정 기반 경로 |

plugin source에는 `Convolution`, `SteamAudio` 고급 모드도 존재합니다. 이 모드는 대응
asset과 platform binary를 검증한 배포에서만 사용하십시오.

## GPU backend

`bEnableGpuPropagation`을 켜면 plugin이 GPU provider 초기화를 시도합니다.

- 성공하면 GPU propagation을 사용합니다.
- export, device 또는 backend가 없으면 CPU로 계속 실행합니다.
- Win64 package는 `webgpu_dawn.dll`을 함께 stage해야 합니다.
- geometry는 GPU-compatible LBVH 계열을 사용하는 구성이 안전합니다.

GPU fallback은 초기화 실패가 아니라 지원 범위에 따른 정상 경로입니다. Output Log의
`SoundTracing GPU propagation enabled` 또는 CPU fallback 메시지로 실제 상태를 확인합니다.

## Material preset

plugin content의 `SoundTraceMaterialPresetLibrary`가 기본 preset을 제공합니다.
`SoundTracingObjectComponent`의 material slot은 render material 이름과 alias를 이용해
가장 가까운 preset을 선택합니다.

처음에는 기본 preset을 사용하십시오. 8-band reflection, absorption, transmission,
scattering을 직접 편집하는 작업은 별도 Material Preset Library asset을 만든 경우로
제한하는 것이 유지보수에 유리합니다.

## Object update

| 모드 | 사용 대상 |
|---|---|
| `Static` | 움직이지 않는 level geometry |
| `Dynamic` | Transform만 변하는 door, prop |
| `Refit` | vertex pose가 변하는 skinned mesh |
| `Rebuild` | topology가 실제로 바뀌는 geometry |

## Path visualization

Actor에 `SoundTracingPathVisualizerComponent`를 추가하면 Niagara 기반 path segment를
표시할 수 있습니다. 디버그와 데모용이며 shipping 성능 측정에서는 비활성화하십시오.

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
shared source preset, material 변경, dynamic door 차폐, CPU/GPU backend 비교를 설명할
scene입니다.
:::

### SampleScene03 — Multiroom

:::note Placeholder
여러 source, room 이동, diffraction/transmission, HRTF 방향감을 설명할 scene입니다.
:::

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| plugin이 선택 목록에 없음 | plugin enable, module compile, target platform Audio 설정 |
| native library load 실패 | `ThirdParty/STCoreV2`의 target별 binary와 staged dependency |
| source가 공간화되지 않음 | Audio Component에 SoundTracing source settings asset 연결 여부 |
| geometry가 반영되지 않음 | Object Component의 immediate parent가 지원 mesh component인지 확인 |
| GPU가 CPU로 fallback | GPU provider/export/device와 `webgpu_dawn.dll` stage 확인 |
| path가 보이지 않음 | visualizer component, Niagara plugin, path enable 상태 확인 |

## 다음 문서

- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
