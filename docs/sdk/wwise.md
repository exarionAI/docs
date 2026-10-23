---
title: Wwise
description: Sound-tracing(SimpleSTWwise) — Wwise 2025.1용 SimpleST Object Processor + Metadata 플러그인의 구조, 설치, 저작, 원샷과 웜 음원 풀, 게임 쪽 C API, UE·Unity 통합.
---

# Sound-tracing Wwise 플러그인

**Sound-tracing**(소스·바이너리 이름 `SimpleSTWwise`)은 [SimpleST](../core/simplest.md)를 Wwise 2025.1에서
쓰기 위한 플러그인입니다. Audio Objects 버스에 꽂는 **Sound-tracing Renderer**(Object Processor)와
사운드/액터믹서에 붙이는 **Sound-tracing Source Settings**(Metadata) 두 플러그인, 그리고 게임 엔진이
지오메트리를 올리는 C API로 구성됩니다.

| 항목 | 값 |
|---|---|
| 플러그인 버전 | v0.2.0 (SimpleST 2.18.2). 이전 릴리스: v0.1.0 (SimpleST 2.12.0, Wwise 2025.1.11 사운드엔진 E2E 검증) |
| Audiokinetic | CompanyID **325**, PluginID 1001(Renderer) · 1002(Source Settings). 런처 번들 `Sound-tracing` |
| Wwise | 2025.1 (플러그인 바이너리는 SDK 버전에 묶입니다) |
| 플랫폼 | Windows(vc170) · macOS · Linux · Android · iOS(정적) · Web(정적) |
| 배포 | `SimpleST-wwise-release.zip` (플랫폼별 SDK + Authoring + 런처 패키지 + `install.py`, UE·Unity 글루 포함) |
| 파트너 승인 | Community Partner Program 1차 승인(2026-10-08). 최종 승인 진행 중 |

## 구조

![SimpleSTWwise 구조](/img/wwise/structure.png)

```text
 3D 사운드들 ──(Listener Relative Routing)──▶ [SimpleST 버스: Bus Configuration = Audio Objects]
   + Sound-tracing Source Settings (메타데이터, 선택)        Sound-tracing Renderer (Object Processor)
                                                        · 오브젝트마다: 모노 다운믹스 → st_rt_source_write_stream
                                                          위치 = 버스 리스너 기준 상대좌표 → 월드좌표로 역변환
                                                        · st_rt_render_process 1회 → 스테레오 출력 오브젝트 1개
                                                        · SimpleST가 안 받는 오브젝트(2D / Bypass / 64개 초과)는
                                                          렌더러가 Wwise 패닝으로 직접 믹스 ("Dry Level")
                                   SystemRuntime (프로세스당 1개 = Wwise 사운드엔진 1개)
```

- **왜 Object Processor인가**: 버스의 모든 오디오 오브젝트를 위치 메타데이터와 함께 한 콜백에 받으므로
  push와 render가 같은 `Execute` 안에서 일어납니다. FMOD판(Source push + Listener pull)과 달리 블록 순서
  스큐가 없고, 보이스가 무음 출력을 할 필요가 없어 Wwise 미터링/가상화가 그대로 동작합니다. 시스템 Audio
  Device도 대체하지 않습니다.
- **좌표**: Wwise는 오브젝트 위치를 버스 리스너 기준으로 이동·회전해서 줍니다. 렌더러가 버스
  게임오브젝트(=리스너)의 월드 포즈로 되돌립니다. Wwise와 SimpleST는 둘 다 왼손, +X right, +Y up,
  +Z forward라 축 변환이 없습니다(Unreal 통합만 예외 — 아래).
- **보이스와 엔진 음원**: 오디오 오브젝트(보이스)마다 SimpleST 음원을 하나 쓰지만, 끝난 보이스의 엔진
  음원은 웜 풀에 남아 다음 보이스가 이어 받습니다 — [원샷과 웜 음원 풀](#원샷과-웜-음원-풀).
- **코어 공유**: FMOD 플러그인과 같은 런타임 계층을 공유하며, `SimpleSTRealtime`을 자기 폴더에서
  동적 바인딩하고 게임 쪽은 `SimpleSTWwise_GetRealtimeProc`으로 같은 모듈의 `st_rt_*`를 받습니다.
- **출력 리미터는 끕니다**: SimpleST 2.18은 생성 직후 true-peak 리미터를 켜지만, Wwise 안에서는 마스터
  버스가 리미팅을 맡습니다.
- **수명주기**: 런타임은 사운드엔진 Init 훅(정적 등록) 또는 첫 렌더러 인스턴스 생성 시 시작하고,
  `AK::SoundEngine::Term`의 글로벌 콜백에서 종료합니다.

## 설치

### Authoring (저작툴)

![런처 번들 설치](/img/wwise/launcher-bundle.png)

- **Windows**: 배포 `packages/`의 런처 번들(`bundle.json` + `*.tar.xz`)을 Audiokinetic Launcher의
  **Add from directory**로 설치하거나, 배포 폴더를 Wwise 설치 폴더(`SDK/…`, `Authoring/…`)에 그대로
  덮어씁니다. Authoring 플러그인은 `Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + 엔진 + HRTF입니다.
- **macOS**: Wwise Authoring은 Mac에서도 **Windows DLL**을 사용합니다. 설치 위치는
  `/Library/Application Support/Audiokinetic/Wwise <version>/Authoring/x64/Release/bin/Plugins`이며,
  `python3 install.py wwise --payload win --wwise-root "/Applications/Audiokinetic/Wwise_2025.1.11.9262"`로
  설치합니다. 기존 파일은 `bin/.simplest-backups`에 보관됩니다.

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

1. 버스 하나(예: `SimpleST`)를 만들고 **Bus Configuration = Audio Objects**로 설정합니다.
2. 그 버스 Effects에 **Sound-tracing Renderer**를 삽입합니다. 버스 출력은 스테레오 1개가 됩니다
   (HRTF 켜면 바이노럴 — 헤드폰).
3. 3D 사운드를 그 버스로 라우팅합니다: Positioning에서 **3D Spatialization = Position(또는 + Orientation)**,
   Listener Relative Routing 켬. **거리 감쇠(Attenuation)는 끄거나 평평하게** — SimpleST가 물리 거리감쇠를
   직접 하므로 안 끄면 이중 감쇠입니다(오브젝트 버퍼에는 Wwise 볼륨/감쇠가 이미 곱해져 옵니다).
4. 음원별 조정이 필요하면 사운드/액터믹서/버스에 **Metadata › Sound-tracing Source Settings**를 추가합니다.
5. 저작툴 안에는 게임 씬이 없으므로 `Wwise.exe` / `WwiseConsole.exe`에서는 **8 × 3 × 10 m 오디션 룸**이
   자동으로 깔립니다(`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`, `"0"`이면 끔).

![Positioning 설정](/img/wwise/positioning-attenuation.png)

### 프로퍼티

![Sound-tracing Renderer 프로퍼티](/img/wwise/renderer-properties.png)

| 플러그인 | 프로퍼티 | 의미 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | SimpleST 렌더 / 렌더러가 직접 패닝하는 오브젝트 레벨 |
| | HRTF (Binaural) | 켜면 바이노럴, 끄면 스테레오 패닝 |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 입력 레벨, 경로별 볼륨(SimpleST path volume) |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | 오브젝트 front 기준 지향성 |
| | Stationary (never moves) | 움직이지 않는 이미터 힌트(생성 시 적용) |
| | Bypass SimpleST (RTPC) | SimpleST를 거치지 않고 렌더러가 Wwise 패닝으로 믹스 |

![Source Settings 메타데이터](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID, 프로퍼티 이름, AudioEnginePropertyID는 프로젝트와 뱅크가 저장하므로 배포 후
바꾸지 않습니다.

## 원샷과 웜 음원 풀

0.2.0부터 FMOD 플러그인 0.3.0과 같은 웜 음원 풀이 들어갑니다(공용 코어). 소리마다 새
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

- 런타임 시작: 정적 등록이면 `SoundEngine::Init` 안에서, DLL 등록이면 첫 SimpleST 버스가 재생될 때.
  그 전엔 `GetStatus`가 0입니다.
- **Unreal 축**: Wwise for Unreal 2024.1+는 언리얼 벡터를 그대로 넘기므로(+Z 위) `SetWorldAxes(UNREAL)`을
  불러야 렌더러가 (Y, Z, X)로 바꿔 게임이 올린 지오메트리와 맞습니다. 안 부르면 리스너·음원이
  엉뚱한 벽에 차폐됩니다(2026-10-15 수정).
- **음원 상한**(SDK 릴리스 2.18.2-jhj.3): `SimpleSTWwise_Config.maxSources`는 엔진 음원 수 상한입니다(0 = 플랫폼
  기본). 넘으면 엔진이 음원 생성을 거절하고 그 보이스는 dry로 재생됩니다. 구조체 끝에 덧붙인 필드라 이전의 짧은
  구조체를 넘기는 호스트도 동작합니다 — [음원 메모리 예산](../core/simplest.md#음원-메모리-예산).

### 사운드 트레이싱 켜고 끄기

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // 끄기. 1 = 켜기(기본)
```

SDK 릴리스 2.18.2-jhj.3에서 추가된 게임 쪽 A/B 스위치입니다. 실행 중인 런타임에 적용되며 컨트롤 스레드에서
비동기로 반영됩니다. 동작은 [FMOD판](./fmod.md#사운드-트레이싱-켜고-끄기)과 같습니다.

- **끄면** SimpleST 렌더러 바이패스(`st_rt_render_set_sound_tracing_enabled`)가 걸리고, 웜 음원 풀을 비운 뒤 다시
  채우지 않으며, 플러그인이 전파 레인을 깨우지 않습니다.
- **전파 레인이 완전히 멈추지는 않습니다.** SimpleST에는 전파 일시정지가 없어, 음원이 남아 있는 동안 레인은
  자체 주기로 계속 돕니다.
- **켜면** 플러그인의 렌더 옵션을 다시 겁니다.
- 큐에 넣으면 1, 실행 중인 런타임이 없으면 0을 돌려줍니다. 나중에 시작된 런타임은 켜진 상태로 시작하므로, 런타임이
  준비된 뒤 상태를 다시 보내십시오.
- 게임 API 버전 1은 그대로인 선택 export입니다. export를 찾아보고 없으면 건너뛰십시오.

UE SoundTracing의 `SetSoundTracingEnabled`가 Wwise 모드에서 이 함수를 부릅니다 — [Unreal Engine SDK](./ue.md).

## UE · Unity 통합

- **Unreal Engine**: `install.py /path/to/Game.uproject --wwise <wwise/SDK>`가 `SimpleSTWwise`·`SimpleSTRealtime`·HRTF를
  `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin`에 넣습니다. SoundTracing 플러그인은 Wwise 모드로 빌드되어
  `sceneRatio = 0.01`과 Unreal 축을 설정하고 지오메트리만 올립니다 — [Unreal Engine SDK](./ue.md).
  E2E PASS(2026-10-07: 객체 6 / 삼각형 288 / 경로 1 → 346 → 1).
- **Unity**: **SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** 메뉴가 Wwise Unity 통합의 DSP 폴더에
  플러그인을 복사합니다. 엔진은 SoundTrace의 `SimpleSTRealtime`을 공유하고 단위는 미터입니다 —
  [Unity SDK](./unity.md#wwise와-함께-쓰기).

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

- 리스너 1개(SimpleST 제약). 같은 버스가 두 번째 리스너용으로 또 인스턴스되면 그 인스턴스는 모든
  오브젝트를 Wwise 패닝으로 믹스합니다.
- 오디오 오브젝트에는 속도가 없어 SimpleST Doppler가 없습니다.
- 엔진 음원 수는 플랫폼 상한(`maxSources`)을 넘지 않습니다. 초과 보이스는 dry입니다.
- 새 오디오 오브젝트를 처음 볼 때 오디오 스레드에서 작은 슬롯 하나를 할당합니다. 엔진 음원 자체는
  컨트롤 스레드에서 웜 풀의 음원을 재사용하거나 새로 만듭니다.
- 런처 번들은 현재 Authoring + Windows_vc170만 포함합니다. Mac·Linux·Android·iOS 번들과 EULA·로고는 준비 중입니다.
- Wwise 저작툴 GUI 수동 오디션은 아직 기록되지 않았습니다.

## 로그 / 환경변수

| 변수 | 의미 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | 로그 파일 경로 |
| `SIMPLESTWWISE_LOG_STDERR` | stderr 로그 |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | SimpleSTRealtime 경로 강제 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` 오디션 룸(m), `"0"` 끔 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"`이면 웜 음원 풀을 끄고 보이스마다 새 엔진 음원(비교용, 공용 코어 변수) |

렌더러 경고는 Wwise Capture Log에도 뜹니다(`PostMonitorMessage`).

## 다음 문서

- [FMOD 플러그인](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
