---
title: Wwise
description: Sound-Tracing SDK for Wwise(SimpleSTWwise) — Wwise 2025.1용 Object Processor + Metadata 플러그인의 구조, 설치, 저작, 원샷과 웜 음원 풀, 게임 쪽 C API, UE·Unity 통합, EQ.
---

# Sound-Tracing SDK for Wwise

**Sound-Tracing SDK for Wwise**(런처 플러그인 이름 `Sound-tracing`, 바이너리 이름 `SimpleSTWwise`)는
Sound-Tracing SDK를 Wwise 2025.1에서 쓰기 위한 플러그인입니다. Audio Objects 버스에 꽂는 **Sound-tracing Renderer**(Object Processor)와
사운드/액터믹서에 붙이는 **Sound-tracing Source Settings**(Metadata) 두 플러그인, 그리고 게임 엔진이
지오메트리를 올리는 C API로 구성됩니다.

| 항목 | 값 |
|---|---|
| Wwise | 2025.1 (플러그인 바이너리는 SDK 버전에 묶입니다) |
| Audiokinetic | CompanyID **325**, PluginID 1001(Renderer) · 1002(Source Settings). 런처 플러그인 이름 `Sound-tracing` |
| 플랫폼 | Windows(vc170) · macOS · Linux · Android · iOS(정적) · Web(정적) |
| 다운로드 | Audiokinetic Launcher 스토어 |

## 구조

![SimpleSTWwise 구조](/img/wwise/structure.png)

- **왜 Object Processor인가**: 버스의 모든 오디오 오브젝트를 위치 메타데이터와 함께 한 콜백에 받으므로
  push와 render가 같은 `Execute` 안에서 일어납니다. FMOD판(Source push + Listener pull)과 달리 블록 순서
  스큐가 없고, 보이스가 무음 출력을 할 필요가 없어 Wwise 미터링/가상화가 그대로 동작합니다. 시스템 Audio
  Device도 대체하지 않습니다.
- **좌표**: Wwise는 오브젝트 위치를 버스 리스너 기준으로 이동·회전해서 줍니다. 렌더러가 버스
  게임오브젝트(=리스너)의 월드 포즈로 되돌립니다. Wwise와 Sound-Tracing SDK는 둘 다 왼손, +X right, +Y up,
  +Z forward라 축 변환이 없습니다(Unreal 통합만 예외 — 아래).
- **보이스와 엔진 음원**: 오디오 오브젝트(보이스)마다 Sound-Tracing SDK 음원을 하나 쓰지만, 끝난 보이스의 엔진
  음원은 웜 풀에 남아 다음 보이스가 이어 받습니다 — [원샷과 웜 음원 풀](#원샷과-웜-음원-풀).
- **코어 공유**: FMOD 플러그인과 같은 런타임 계층을 공유하며, `SimpleSTRealtime`을 자기 폴더에서
  동적 바인딩하고 게임 쪽은 `SimpleSTWwise_GetRealtimeProc`으로 같은 모듈의 `st_rt_*`를 받습니다.
- **출력 리미터는 끕니다**: Wwise 안에서는 마스터 버스가 리미팅을 맡습니다.
- **등라우드니스 보정도 끕니다**: 음색과 레벨은 Wwise 믹스가 맡습니다.
- **리스너 방향**: 버스 리스너의 front·top 방향을 쿼터니언으로 넘겨 머리 기울임(roll)까지 반영합니다.
- **수명주기**: 런타임은 사운드엔진 Init 훅(정적 등록) 또는 첫 렌더러 인스턴스 생성 시 시작하고,
  `AK::SoundEngine::Term`의 글로벌 콜백에서 종료합니다.

## 설치

### Authoring (저작툴)

![런처 번들 설치](/img/wwise/launcher-bundle.png)

Audiokinetic Launcher 스토어에서 **Sound-Tracing SDK for Wwise**(플러그인 이름 `Sound-tracing`)를 획득한 뒤
Launcher › **Plug-ins**에서 사용하는 Wwise 버전에 설치합니다(Windows·macOS 공통). 플러그인에는 Authoring 플러그인과
Windows(vc170)·macOS 사운드엔진 플러그인이 들어 있습니다. Authoring 플러그인은 Mac에서도 **Windows DLL**
(`Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + 엔진 + HRTF)입니다.

### 게임 런타임 (SoundEngine)

| 플랫폼 | 산출물 |
|---|---|
| Windows | `SDK/x64_vc170/<Config>/bin/SimpleSTWwise.dll`(+ `SimpleSTRealtime.dll`, `Resources/HRTF`), `lib/SimpleSTWwiseFX.lib`, `include/AK/Plugin/SimpleSTWwiseFXFactory.h` |
| macOS / Linux / Android | `libSimpleSTWwise.{dylib,so}` + 같은 빌드의 `SimpleSTRealtime` (Android는 ABI별) |
| iOS / Web | 엔진 오브젝트를 포함한 `libSimpleSTWwiseFX.a` — 앱에서 `AK/Plugin/SimpleSTWwiseFXFactory.h`를 포함해 두 플러그인을 등록 |

Debug 플러그인은 Debug, Release 플러그인은 Profile/Release 구성에 배치합니다. 정적 링크 플랫폼은
`SimpleSTWwiseFX` 라이브러리 하나가 두 플러그인을 모두 담습니다(뱅크 `PluginInfo.json`이 메타데이터
플러그인 lib 이름을 `SimpleSTWwiseMeta`로 추정하면 별칭이 필요할 수 있습니다).

## Wwise에서 쓰기

![Audio Objects 버스](/img/wwise/bus-audio-objects.png)

1. 버스 하나(예: `SoundTracing`)를 만들고 **Bus Configuration = Audio Objects**로 설정합니다.
2. 그 버스 Effects에 **Sound-tracing Renderer**를 삽입합니다. 버스 출력은 스테레오 1개가 됩니다
   (HRTF 켜면 바이노럴 — 헤드폰).
3. 3D 사운드를 그 버스로 라우팅합니다: Positioning에서 **3D Spatialization = Position(또는 + Orientation)**,
   Listener Relative Routing 켬. **거리 감쇠(Attenuation)는 끄거나 평평하게** — Sound-Tracing SDK가 물리 거리감쇠를
   직접 하므로 안 끄면 이중 감쇠입니다(오브젝트 버퍼에는 Wwise 볼륨/감쇠가 이미 곱해져 옵니다).
4. 음원별 조정이 필요하면 사운드/액터믹서/버스에 **Metadata › Sound-tracing Source Settings**를 추가합니다.
5. 저작툴 안에는 게임 씬이 없으므로 `Wwise.exe` / `WwiseConsole.exe`에서는 **8 × 3 × 10 m 오디션 룸**이
   자동으로 깔립니다(`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`, `"0"`이면 끔).

![Positioning 설정](/img/wwise/positioning-attenuation.png)

### 프로퍼티

![Sound-tracing Renderer 프로퍼티](/img/wwise/renderer-properties.png)

| 플러그인 | 프로퍼티 | 의미 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | Sound-Tracing SDK 렌더 / 렌더러가 직접 패닝하는 오브젝트 레벨 |
| | HRTF (Binaural) | 켜면 바이노럴, 끄면 스테레오 패닝 |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 입력 레벨, 경로별 볼륨(Sound-Tracing SDK path volume) |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | 오브젝트 front 기준 지향성 |
| | Stationary (never moves) | 움직이지 않는 이미터 힌트(생성 시 적용) |
| | Bypass SimpleST (RTPC) | Sound-Tracing SDK를 거치지 않고 렌더러가 Wwise 패닝으로 믹스 |
| 둘 다 (EQ 그룹) | EQ / EQ Preamp (dB, RTPC) | 4밴드 EQ 켬·프리앰프 — [EQ](#eq) |
| | Band n Type / Band n Frequency (Hz, RTPC) / Band n Gain (dB, RTPC) / Band n Q (RTPC) (n = 1 ~ 4) | 밴드별 필터 종류·주파수·게인·Q |

![Source Settings 메타데이터](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID, 프로퍼티 이름, AudioEnginePropertyID는 프로젝트와 뱅크가 저장하므로 배포 후
바꾸지 않습니다.

## 원샷과 웜 음원 풀

FMOD 플러그인과 같은 웜 음원 풀이 들어갑니다(공용 코어). 소리마다 새
보이스가 오는 경우에도 보이스마다 엔진 음원을 새로 만들지 않으므로, 새 음원의 150 ms 경로 페이드인과
첫 IR 대기가 빠지고 짧은 소리가 제 음량으로 제때 들립니다. Wwise 프로젝트 구성은 바꿀 필요가 없습니다.

- 끝난 보이스가 이미 넘긴 PCM을 최대 300 ms까지 마저 재생한 뒤 음원을 정지하고(잔향은 이어짐), 최대
  16개를 2초 동안 웜 상태로 둡니다.
- 다음 보이스는 가장 가까운 웜 음원에 붙습니다. 0.25 m 안이면 바로, 더 멀면 약 25 ms 뒤에 재생합니다.
- Unreal의 **Wwise AudioLink**처럼 소리마다 새 게임 오브젝트를 등록하는 통합도 이 경로로 처리됩니다.

측정값(같은 위치 보이스 16개의 엔진 음원 생성 16 → 4, 레벨 +15.7 dB, 이동 시 +19.3 dB 등)은
[FMOD 플러그인](./fmod.md#원샷과-웜-음원-풀)에 있습니다. 환경 변수 `SIMPLESTFMOD_WARM_SOURCES=0`(공용
코어라 Wwise판도 같은 이름)이면 예전처럼 보이스마다 새 음원을 만듭니다(비교용).

## 게임 쪽 C API

`include/SimpleSTWwise/SimpleSTWwise.h` — SoundEngine 라이브러리가 export합니다. **Wwise가 로드한 그 모듈**에서
바인딩합니다(Unreal: `FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`, 정적 플랫폼은 직접
호출). FMOD판과 같은 계약이지만 시스템 인덱스가 없습니다(프로세스당 사운드엔진 1개).

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal(cm). Unity는 0(=1.0, m)
cfg.maxSources = 0;                              // 0 = 엔진 플랫폼 기본(데스크톱 128, Android/iOS 48, 웹 32)
SimpleSTWwise_Configure(&cfg);                   // AK::SoundEngine::Init 전
SimpleSTWwise_SetWorldAxes(SIMPLESTWWISE_AXES_UNREAL);   // Unreal만. Unity는 기본(WWISE)

SimpleSTWwise_Status st = { sizeof st };
SimpleSTWwise_GetStatus(&st);                    // READY가 된 뒤 지오메트리 업로드
void* p = SimpleSTWwise_GetRealtimeProc("st_rt_mesh_create");
SimpleSTWwise_InvokeOnControlThread(
    [](STRT_Context* ctx, void* user) { /* st_rt_mesh_create / object_create / build ... */ }, user, 1);
```

- 런타임 시작: 정적 등록이면 `SoundEngine::Init` 안에서, DLL 등록이면 첫 Sound-Tracing SDK 버스가 재생될 때.
  그 전엔 `GetStatus`가 0입니다.
- **Unreal 축**: Wwise for Unreal 2024.1+는 언리얼 벡터를 그대로 넘기므로(+Z 위) `SetWorldAxes(UNREAL)`을
  불러야 렌더러가 (Y, Z, X)로 바꿔 게임이 올린 지오메트리와 맞습니다. 안 부르면 리스너·음원이
  엉뚱한 벽에 차폐됩니다.
- **음원 상한**: `SimpleSTWwise_Config.maxSources`는 엔진 음원 수 상한입니다(0 = 플랫폼
  기본). 넘으면 엔진이 음원 생성을 거절하고 그 보이스는 dry로 재생됩니다. 구조체 끝에 덧붙인 필드라 이전의 짧은
  구조체를 넘기는 호스트도 동작합니다.

### 사운드 트레이싱 켜고 끄기

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // 끄기. 1 = 켜기(기본)
```

게임 쪽 A/B 스위치입니다. 실행 중인 런타임에 적용되며 컨트롤 스레드에서
비동기로 반영됩니다. 동작은 [FMOD판](./fmod.md#사운드-트레이싱-켜고-끄기)과 같습니다.

- **끄면** Sound-Tracing SDK 렌더러 바이패스(`st_rt_render_set_sound_tracing_enabled`)가 걸리고, 웜 음원 풀을 비운 뒤 다시
  채우지 않으며, 플러그인이 전파 레인을 깨우지 않습니다.
- **전파 레인이 완전히 멈추지는 않습니다.** 엔진에는 전파 일시정지가 없어, 음원이 남아 있는 동안 레인은
  자체 주기로 계속 돕니다.
- **켜면** 플러그인의 렌더 옵션을 다시 겁니다.
- 큐에 넣으면 1, 실행 중인 런타임이 없으면 0을 돌려줍니다. 나중에 시작된 런타임은 켜진 상태로 시작하므로, 런타임이
  준비된 뒤 상태를 다시 보내십시오.
- 게임 API 버전 1은 그대로인 선택 export입니다. export를 찾아보고 없으면 건너뛰십시오.

UE SoundTracing의 `SetSoundTracingEnabled`가 Wwise 모드에서 이 함수를 부릅니다 — [Unreal Engine SDK](./ue.md).

## UE · Unity 통합

- **Unreal Engine**: 런처에 Sound-tracing을 설치한 뒤 Launcher › Unreal Engine › **Modify Wwise in Project**를 실행하면
  런처가 `SimpleSTWwise`·`SimpleSTRealtime`·HRTF를 `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin`에 복사합니다. SoundTracing 플러그인은 Wwise 모드로 빌드되어
  `sceneRatio = 0.01`과 Unreal 축을 설정하고 지오메트리만 올립니다 — [Unreal Engine SDK](./ue.md).
- **Unity**: 런처에 Sound-tracing을 설치한 뒤 Launcher › Unity › **Integrate/Modify Wwise in Project**를 실행하면
  런처가 플러그인을 Wwise Unity 통합의 DSP 폴더에 넣습니다. 엔진은 SoundTrace의 `SimpleSTRealtime`을 공유하고 단위는 미터입니다 —
  [Unity SDK](./unity.md#wwise와-함께-쓰기).

![런처의 Modify Wwise in Project](/img/wwise/launcher-modify-project.png)

![UE Wwise 설치 결과](/img/wwise/ue-install.png)

## 검증 결과 (2026-10-01 · Wwise 2025.1.11.9262)

WwiseConsole로 프로젝트 생성 → WAAPI로 버스·이펙트·메타데이터·이벤트 구성 → 뱅크 생성 → 실제
`AkSoundEngine`(Profile)이 `RegisterPluginDLL("SimpleSTWwise")`로 배포용 DLL을 로드해 오프라인 렌더.

| 단계 | 내용 | 결과 |
|---|---|---|
| 저작툴 | WwiseConsole이 두 플러그인 인식, 뱅크에 파라미터 기록 | PASS |
| A | 노이즈, 이미터 우측 80°, 자유음장 | PASS — ILD +14.64 dB |
| B | Source Settings Bypass → 렌더러가 Wwise 패닝으로 믹스 | PASS |
| C | 리스너 (10,0,5) 이동 + 180° 회전, 이미터 우측 80° | PASS — 상대→월드 변환 정확 |
| D | 게임 API로 룸 업로드 후 톤 1.5 s | PASS — 잔향 꼬리 |
| 종료 | `AK::SoundEngine::Term` 콜백이 런타임 종료 | PASS |

렌더 지연(BUFFERED, 48 kHz, 512 프레임 버퍼): 약 2,100 프레임(≈44 ms). Mac/Linux는 실제 Wwise
등록 통과, Android 두 ABI 빌드, iOS device/simulator와 Web 최종 링크 통과(2026-10-06).

## 알려진 한계

- 리스너 1개(엔진 제약). 같은 버스가 두 번째 리스너용으로 또 인스턴스되면 그 인스턴스는 모든
  오브젝트를 Wwise 패닝으로 믹스합니다.
- 오디오 오브젝트에는 속도가 없어 Doppler가 없습니다.
- EQ는 플러그인당 4밴드 고정입니다(UE·Unity·Web은 최대 16밴드).
- 엔진 음원 수는 플랫폼 상한(`maxSources`)을 넘지 않습니다. 초과 보이스는 dry입니다.
- 새 오디오 오브젝트를 처음 볼 때 오디오 스레드에서 작은 슬롯 하나를 할당합니다. 엔진 음원 자체는
  컨트롤 스레드에서 웜 풀의 음원을 재사용하거나 새로 만듭니다.

## 로그 / 환경변수

| 변수 | 의미 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | 로그 파일 경로 |
| `SIMPLESTWWISE_LOG_STDERR` | stderr 로그 |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | SimpleSTRealtime 경로 강제 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` 오디션 룸(m), `"0"` 끔 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"`이면 웜 음원 풀을 끄고 보이스마다 새 엔진 음원(비교용, 공용 코어 변수) |

렌더러 경고는 Wwise Capture Log에도 뜹니다(`PostMonitorMessage`).

## EQ

Sound-Tracing SDK의 파라메트릭 EQ를 두 자리에서 겁니다.

- **소스 EQ** — 음원 신호 자체에 엔진의 밴드 분리 앞에서 겁니다. 그 음원의 직접음·반사·회절·잔향이 모두 같은 톤이 됩니다.
- **출력 EQ** — Sound-Tracing SDK 믹스 전체에 렌더 끝(마스터 게인 앞)에서 겁니다.

필터 종류는 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6종(컷은 12 dB/oct 고정),
범위는 주파수 20 ~ 20,000 Hz, 게인 ±24 dB(Peaking·셸프만), Q 0.1 ~ 30(셸프는 3까지), 프리앰프 −48 ~ +12 dB입니다.
기본은 꺼짐이고, 꺼져 있으면 엔진을 호출하지 않으므로 출력은 EQ가 없을 때와 같습니다. 바뀐 값만 보내며 엔진이
20 ms 크로스페이드로 넘어갑니다.

두 플러그인에 같은 4밴드 EQ 프로퍼티 그룹이 있습니다(FMOD판과 같은 공용 코어).

| 플러그인 | 프로퍼티 그룹 | 거는 곳 |
|---|---|---|
| Sound-tracing Source Settings | `Source EQ`, `Source EQ Band 1 ~ 4` | **소스 EQ** — 오브젝트 오디오가 엔진에 들어가기 전 |
| Sound-tracing Renderer | `Output EQ`, `Output EQ Band 1 ~ 4` | **출력 EQ** — 렌더된 믹스 |

- `EQ`는 켬/끔, `EQ Preamp`는 밴드 앞 게인(−48 ~ +12 dB)입니다.
- `Band n Type`은 Off · Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch의 열거 프로퍼티라 RTPC로 바꿀 수 없습니다.
  Preamp · `Band n Frequency` · `Band n Gain` · `Band n Q`는 RTPC를 지원합니다.
- EQ 프로퍼티의 AudioEnginePropertyID는 Source Settings 8 ~ 25, Renderer 3 ~ 20이고 뱅크에는 기존 필드 뒤에 같은 순서로
  붙습니다. 웜 풀에서 재사용하는 엔진 음원은 앞 보이스의 EQ를 지우거나 새 EQ로 바꾼 뒤 시작합니다.

## 다음 문서

- [FMOD 플러그인](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
