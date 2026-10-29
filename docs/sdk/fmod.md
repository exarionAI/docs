---
title: FMOD
description: SimpleSTFmod — FMOD Studio / FMOD Engine용 SimpleST DSP 플러그인의 구조, 설치, Studio 저작, EQ, 원샷과 웜 음원 풀, 게임 쪽 C API, UE·Unity 통합.
---

# SimpleST FMOD 플러그인

**SimpleSTFmod**는 [SimpleST](../core/simplest.md)를 FMOD Studio / FMOD Engine에서 쓰기 위한 DSP
플러그인입니다. 저작툴에서 이벤트에 꽂아 쓰는 **SimpleST Source**와 마스터 버스에 하나 두는
**SimpleST Listener** 두 DSP, 그리고 게임 엔진이 지오메트리를 올리는 C API로 구성됩니다.

| 항목 | 값 |
|---|---|
| 플러그인 버전 | v0.3.0 (SimpleST 2.22.0, SDK 릴리스 2.22.0-jhj.5 — 4밴드 [EQ](#eq), 리스너 roll). 이전 릴리스: v0.3.0 (SimpleST 2.18.2), v0.2.0 (SimpleST 2.12.0). FMOD가 보는 DSP 디스크립션 버전은 0.3.0입니다(SDK 2.18.2 초기 배포본은 0.2.0으로 표시) |
| FMOD | Studio / Engine 2.03 ~ 2.04 (plug-in SDK 110 빌드 = 2.00 ~ 2.04, 204 빌드 = 2.04+) |
| 플랫폼 | Windows x64 · macOS · Linux · Android · iOS(정적) · Web(정적, FMOD HTML5 pthreads) |
| 배포 | `SimpleST-fmod-release.zip` (플랫폼별 `plugins/` + `install.py`, FMOD 에디션 UE 플러그인·Unity 패키지 포함) |
| 상용 배포 조건 | FMOD(sales@fmod.com) 확인 필요 |

## 구조

![SimpleSTFmod 구조](/img/fmod/structure.png)

```text
[이벤트 마스터 트랙]                               [마스터 버스]
 SimpleST Source  ──(모노 PCM, write_stream)──▶  SimpleST Listener ──▶ 스테레오(HRTF/패닝)
   · 3D Attributes(Studio 자동) → 음원 위치         · st_rt_render_process (전 음원 1회 렌더)
   · 출력은 무음 (Listener 없으면 dry 통과)          · FMOD 리스너 0 → SimpleST 리스너
                 └──────────── SystemRuntime (FMOD::System당 1개) ─┘
                               · SimpleST 컨텍스트 + 컨트롤 스레드
                               · 게임 쪽 C API (지오메트리 업로드 등)
```

- SimpleST는 "음원 N개 입력 → 리스너 믹스 1개 출력" 구조라 Steam Audio식(음원별 출력)이 아니라
  **Resonance / Meta XR Audio식**(Source는 밀어넣고 무음, 버스의 Listener가 한 번에 렌더)입니다.
- 플러그인이 `SimpleSTRealtime`을 **자기 폴더에서** 동적 바인딩하고, 게임 쪽은 플러그인이 export하는
  `SimpleSTFmod_GetRealtimeProc`으로 **같은 모듈**의 `st_rt_*`를 받습니다 — 엔진 인스턴스는 하나입니다.
- 렌더러는 "지금 process가 돌고 있는 Listener"가 매 블록 선출됩니다. Studio가 만드는 미리보기용 더미
  인스턴스가 라이브 Listener를 가로채지 않으며, 렌더러가 250 ms 동안 멈추면 다른 Listener가 넘겨받고
  아무도 없으면 Source들은 dry로 돌아갑니다.
- 엔진 음원은 오디오가 실제로 들어온 Source에만 만듭니다(동시 스트림 64개 보호). 끝난 보이스의 엔진
  음원은 웜 풀에 남겨 다음 보이스가 재사용합니다 — [원샷과 웜 음원 풀](#원샷과-웜-음원-풀).
- **출력 리미터는 끕니다**: SimpleST 2.18은 생성 직후 true-peak 리미터(−1 dBTP, 137샘플 지연)를 켜지만,
  FMOD 안에서는 마스터 버스가 리미팅을 맡습니다.
- **등라우드니스 보정도 끕니다**: SimpleST 2.21은 생성 직후 출력단 등라우드니스 보정(저역 셸프 약 +7.2 dB @ 120 Hz)을
  켜지만, 음색과 레벨은 FMOD 믹스가 맡습니다. 리미터와 함께 컨텍스트 생성 직후와 사운드 트레이싱을 다시 켤 때 끕니다.
- **리스너 방향**: FMOD 리스너의 forward·up을 SimpleST 쿼터니언으로 넘겨 머리 기울임(roll)까지 반영합니다(SDK 릴리스
  2.22.0-jhj부터).

## 설치

### FMOD Studio (저작툴)

![플러그인 설치 위치](/img/fmod/studio-plugins-folder.png)

1. **버전 맞추기**: Studio 2.03.x → SDK 110 빌드, Studio 2.04.x → SDK 204 빌드. 204 플러그인은
   Studio 2.03에서 뜨지 않습니다.
2. 배포 `plugins/` 폴더 내용(`SimpleSTFmod.dll` · `SimpleSTFmod.plugin.js` · `SimpleSTRealtime.dll` ·
   `Resources/HRTF/`)을 **Studio 프로젝트의 `Plugins/`**(버전관리에 유리) 또는 사용자 플러그인 폴더에
   복사하고 Studio를 재시작합니다.
   - Windows: `%localappdata%/FMOD Studio/Plugins`
   - macOS: `~/Library/Preferences/FMOD Studio/Plugins/SimpleST` (`install.py fmod --payload mac --studio "/Applications/FMOD Studio.app"`)
3. Studio 로그의 `No FMOD symbols found in dynamic library '.../SimpleSTRealtime.dll'`은 무해합니다
   (Studio가 폴더의 모든 DLL을 플러그인 후보로 열어 봅니다. 엔진 DLL은 SimpleSTFmod가 직접 로드합니다).

설치기는 manifest 해시·플랫폼·Studio/SDK 버전을 검사하고 기존 파일을 스캐너 밖에 백업합니다.
HRTF 리소스가 없으면 엔진 내장 MIT KEMAR로 폴백합니다.

### 게임 런타임

| 플랫폼 | 링크 | 산출물 |
|---|---|---|
| win / mac / linux | 동적 | `SimpleSTFmod.{dll,dylib,so}` + 옆에 `SimpleSTRealtime.*` + `Resources/HRTF` |
| android | 동적 | `<abi>/plugins/libSimpleSTFmod.so` + `libSimpleSTRealtime.so` (앱 라이브러리 폴더) |
| ios | 정적 | `SimpleSTFmod.xcframework` (엔진 오브젝트 포함) |
| web | 정적 | `libSimpleSTFmod.a` (엔진 포함) — FMOD HTML5 pthreads 빌드 + `-pthread`로 링크 |

동적 플랫폼은 FMOD가 플러그인을 로드하면 플러그인이 엔진을 옆에서 찾습니다. 정적 플랫폼(iOS/Web)은
뱅크 로드 전에 직접 등록합니다.

```cpp
studioSystem->registerPlugin(FMOD_SimpleST_Source_GetDSPDescription());
studioSystem->registerPlugin(FMOD_SimpleST_Listener_GetDSPDescription());
```

## FMOD Studio에서 쓰기

![마스터 버스의 SimpleST Listener](/img/fmod/studio-master-bus-listener.png)

1. 마스터 버스에 **Exarion › SimpleST Listener**를 추가합니다(프로젝트당 1개. 동시에 2개가 돌면 하나만
   렌더하고 나머지는 통과).
2. 3D 이벤트의 마스터 트랙에서 **FMOD Spatializer를 지우거나 bypass**하고 **Exarion › SimpleST Source**를
   추가합니다(안 지우면 이중 공간화).
3. Studio 안에는 게임 씬이 없으므로 저작툴에서 돌 때는 **8 × 3 × 10 m 오디션 룸**이 자동으로 깔립니다
   (`SIMPLESTFMOD_AUDITION_ROOM="W,H,D"`로 크기 변경, `"0"`이면 끔). 미리보기에서 음원을 방 밖으로
   옮기면 벽 차폐를 들을 수 있습니다.

![3D 이벤트의 SimpleST Source](/img/fmod/studio-event-source.png)

### DSP 파라미터

![SimpleST Source 덱 UI](/img/fmod/studio-source-params.png)

| DSP | 파라미터 | 의미 |
|---|---|---|
| SimpleST Source | Gain / Direct / Reflections / Diffraction / Reverb Send (dB) | 입력 레벨, 경로별 볼륨(SimpleST path volume) |
| | Directivity (0 ~ 1) | 0 전지향 ~ 1 카디오이드(이벤트 forward 기준) |
| | Stationary | 움직이지 않는 이미터 힌트(생성 시 적용) |
| | Bypass | SimpleST를 거치지 않고 dry 통과 |
| | 3D Attributes / Overall Gain / Atten Range | FMOD 특수 data 파라미터(자동) |
| SimpleST Listener | Wet Level / Dry Level (dB) | SimpleST 렌더 / 버스의 다른 오디오 레벨 |
| | HRTF | 켜면 바이노럴(헤드폰), 끄면 스테레오 패닝 |
| 둘 다 (EQ 블록) | EQ / EQ Preamp (dB) | 4밴드 EQ 켬·프리앰프 — [EQ](#eq) |
| | EQn Type / EQn Freq (Hz) / EQn Gain (dB) / EQn Q (n = 1 ~ 4) | 밴드별 필터 종류·주파수·게인·Q |

Listener를 **bypass**하면 Source들이 dry 통과로 돌아갑니다(A/B 비교용). DSP 이름과 파라미터
이름은 뱅크가 식별자로 저장하므로 배포 후 바꾸지 않습니다.

### EQ

SDK 릴리스 2.22.0-jhj부터 두 DSP에 같은 4밴드 EQ 파라미터 블록이 있습니다. SimpleST 파라메트릭 EQ를 그대로 씁니다.

| DSP | 거는 곳 |
|---|---|
| SimpleST Source | **소스 EQ** — SimpleST에 들어가는 이벤트 신호에, 엔진 밴드 분리 앞에서. 직접음·반사·회절·잔향이 모두 같은 톤 |
| SimpleST Listener | **출력 EQ** — SimpleST 믹스에, Wet Level 앞에서 |

- `EQ`는 켬/끔, `EQ Preamp`는 밴드 앞 게인(−48 ~ +12 dB, 부스트할 때 음수로 여유를 둡니다)입니다.
- `EQn Type`은 Off · Peaking · Low Shelf · High Shelf · High Cut(12 dB/oct 저역 통과) · Low Cut(12 dB/oct 고역 통과) · Notch입니다.
- `EQn Freq`는 20 ~ 20,000 Hz, `EQn Gain`은 ±24 dB(Peaking·셸프만), `EQn Q`는 0.1 ~ 30(셸프는 3까지)입니다.
- 4밴드는 저역 컷·저역 셸프·고역 셸프·고역 컷을 한 번에 걸 수 있는 수입니다. `EQn Type`은 정수 파라미터(값 이름 7개,
  0 = Off), 나머지는 실수 파라미터입니다.
- 기본은 꺼짐이고 꺼져 있으면 엔진을 호출하지 않습니다. 바뀐 값만 보내고 엔진이 20 ms 크로스페이드로 넘어갑니다.
- Listener가 여러 개면 렌더러로 선출된 인스턴스의 EQ가 쓰입니다. 웜 풀에서 재사용하는 엔진 음원은 앞 보이스의 EQ를
  지우거나 새 EQ로 바꾼 뒤 시작합니다.

## 원샷과 웜 음원 풀

이벤트마다 새 보이스가 오는 짧은 소리를 위해, 0.3.0부터 플러그인이 엔진 음원을 보이스
사이에 재사용합니다. FMOD Studio 이벤트나 DSP 구성은 바꿀 필요가 없습니다.

- 엔진은 **새 음원**의 모든 경로를 150 ms에 걸쳐 페이드인하고 첫 IR을 기다립니다. 0.2.0은 보이스마다
  엔진 음원을 새로 만들어 25 ms짜리 소리가 15 ~ 20 dB 작고 늦게 들렸고, 보이스가 끝나는 즉시 음원을 지워
  스트림 링에 남은 끝부분이 잘렸습니다.
- 0.3.0은 끝난 보이스가 이미 밀어 넣은 PCM을 **최대 300 ms까지 마저 재생**한 뒤 음원을 정지하고(잔향은
  이어짐), 그 음원을 **최대 16개, 2초 동안** 웜 상태로 둡니다.
- 다음 보이스는 가장 가까운 웜 음원에 붙습니다. **0.25 m 안이면 바로**, 더 멀면 약 25 ms 뒤에 재생을
  시작합니다. 2초 안에 다시 쓰이지 않은 웜 음원은 해제됩니다.

코어 테스트(FMOD 없이 같은 런타임)로 잰 0.2.0 대비 결과입니다.

| 항목 | 0.2.0 (보이스마다 새 음원) | 0.3.0 (웜 풀) |
|---|---|---|
| 같은 위치 보이스 16개(120 ms 간격)의 엔진 음원 생성 | 16 | 4 |
| 같은 위치 보이스 레벨 | 기준 | +15.7 dB (제 음량) |
| 이동하는 보이스 레벨 | 기준 | +19.3 dB (제 음량) |
| 보이스 시작 → 첫 소리 | 92 ms | 69 ms |
| 350 ms 보이스의 들리는 길이 | 275 ms | 350 ms |

환경 변수 `SIMPLESTFMOD_WARM_SOURCES=0`이면 예전처럼 보이스마다 새 음원을 만듭니다(비교용).

## 게임 쪽 C API

`include/SimpleSTFmod/SimpleSTFmod.h` — 플러그인 라이브러리가 export합니다. **FMOD가 로드한 그 모듈**에서
바인딩합니다. 모든 호출은 게임 스레드에서 하고, SimpleST `[control]` 호출은 반드시
`SimpleSTFmod_InvokeOnControlThread` 안에서 합니다.

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // 기본. IN_CALLBACK = FMOD 믹서 콜백 안에서 렌더
cfg.sceneRatio = 0.f;                            // 0 = 1.0 (FMOD UE/Unity 통합 단위는 미터)
cfg.maxSources = 0;                              // 0 = 엔진 플랫폼 기본(데스크톱 128, Android/iOS 48, 웹 32)
SimpleSTFmod_Configure(&cfg);                    // 런타임 시작 전(첫 SimpleST DSP 생성 전)

SimpleSTFmod_Status st = { sizeof st };
SimpleSTFmod_GetStatus(SIMPLESTFMOD_SYSTEM_LATEST, &st);   // state READY, boundSources, latency, defaultMaterialId

typedef STMeshId (*mesh_create_fn)(STRT_Context*, const STMesh*, STMaterialId, const int32_t*);
mesh_create_fn meshCreate = (mesh_create_fn)SimpleSTFmod_GetRealtimeProc("st_rt_mesh_create");

SimpleSTFmod_InvokeOnControlThread(SIMPLESTFMOD_SYSTEM_LATEST,
    [](STRT_Context* ctx, void* user) {
        /* st_rt_mesh_create / st_rt_object_create_q / st_rt_build ... */
    }, user, /*wait=*/1);
```

- 시스템 인덱스 = `FMOD_DSP_STATE::systemobject`(프로세스에서 먼저 만든 FMOD::System이 0).
  에디터 통합은 System을 여러 개 만들므로 `SIMPLESTFMOD_SYSTEM_LATEST(-1)` = 가장 최근 런타임.
- 좌표계는 FMOD와 SimpleST가 같습니다(왼손, +Y up, +Z forward). FMOD UE 통합의 `(UE.Y, UE.Z, UE.X)/100`
  변환이 SoundTracing UE 플러그인의 변환과 동일합니다.
- 플러그인 컨텍스트에는 기본 재질 라이브러리가 먼저 등록되어 있습니다. `defaultMaterialId`부터 preset
  index를 더해 쓰십시오.
- **음원 상한**(SDK 릴리스 2.18.2부터): `SimpleSTFmod_Config.maxSources`는 엔진 음원 수 상한입니다(0 = 플랫폼
  기본). 넘으면 엔진이 음원 생성을 거절하고 그 보이스는 dry로 재생됩니다. 구조체 끝에 덧붙인 필드라 이전의 짧은
  구조체를 넘기는 호스트도 동작합니다 — [음원 메모리 예산](../core/simplest.md#음원-메모리-예산).

### 사운드 트레이싱 켜고 끄기

```c
SimpleSTFmod_SetSoundTracingEnabled(SIMPLESTFMOD_SYSTEM_LATEST, 0);   // 끄기. 1 = 켜기(기본)
```

SDK 릴리스 2.18.2에서 추가된 게임 쪽 A/B 스위치입니다. 런타임 하나(`systemIndex < 0` = 가장 최근)에 적용되며
컨트롤 스레드에서 비동기로 반영됩니다.

- **끄면** SimpleST 렌더러 바이패스(`st_rt_render_set_sound_tracing_enabled`)가 걸리고, 웜 음원 풀을 비운 뒤 다시
  채우지 않으며, 플러그인이 전파 레인을 깨우지 않습니다.
- **전파 레인이 완전히 멈추지는 않습니다.** SimpleST에는 전파 일시정지가 없어, 음원이 남아 있는 동안 레인은
  자체 주기로 계속 돕니다.
- **켜면** 플러그인의 렌더 옵션을 다시 겁니다.
- 큐에 넣으면 1, 런타임이 없으면 0을 돌려줍니다. 나중에 시작된 런타임은 켜진 상태로 시작합니다.
- 게임 API 버전 1은 그대로인 선택 export입니다. export를 찾아보고 없으면 건너뛰십시오.

UE SoundTracing의 `SetSoundTracingEnabled`가 FMOD 모드에서 이 함수를 부릅니다 — [Unreal Engine SDK](./ue.md).

## UE · Unity 통합

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

- **Unreal Engine**: 배포물의 `Unreal/SoundTracing`(FMOD 에디션)을 프로젝트 `Plugins/`에 넣고 빌드하면
  빌드가 플러그인·엔진·HRTF를 `Plugins/FMODStudio/Binaries/<Plat>/`에 넣고 `DefaultEngine.ini`에
  `+PluginFiles=SimpleSTFmod`를 추가합니다. SoundTracing 플러그인은 FMOD 모드로 빌드되어 지오메트리만 올립니다 — [Unreal Engine SDK](./ue.md). UE 5.7 + FMOD for
  Unreal 2.04 청취 검증(2026-10-15).
- **Unity**: FMOD 에디션 패키지(`SoundTrace-SimpleST-FMOD-release.unitypackage`)를 드래그 앤 드롭하면, 에디터가
  로드될 때 SoundTrace가 DLL/bundle을 FMOD 플러그인 폴더에 복사하고 Dynamic Plugins에 등록합니다 —
  [Unity SDK](./unity.md#fmod와-함께-쓰기). Unity 6000.3 + FMOD for Unity 2.04 E2E 통과.

![FMOD 에디션 패키지 가져오기](/img/fmod/unity-fmod-edition-import.png)

## 검증 결과 (2026-10-01 · FMOD 2.04.00)

| 테스트 | 내용 | 결과 |
|---|---|---|
| `core_smoke` | FMOD 없이 런타임만: 48 kHz/1024 블록, 80° 우측 노이즈, 룸 업로드 → 잔향, 렌더러 선출/인계 규칙 | PASS — ILD +14.6 dB |
| `fmod_host_smoke` | FMOD Core 호스트 `loadPlugin` → Source/Listener → WAV, 게임 API로 룸 | PASS |
| `studio_project` | FMOD Studio(fmodstudiocl)가 두 DSP 인식, 파라미터 로드, 뱅크 빌드 | PASS |
| `studio_smoke` | 그 뱅크를 Studio API 런타임에서 3D 재생, 우→좌 이동 | PASS — ILD +14.97 → −14.80 dB |

렌더 지연(BUFFERED, 48 kHz): 약 1,790 프레임(≈37 ms). FMOD Studio GUI 실시간 오디션은 2026-10-15
수동 검증.

## 알려진 한계

- 리스너 1개, 동시 스트림 64개(초과분 dry), 출력 스테레오만(스피커 레이아웃 미노출).
- EQ는 DSP당 4밴드 고정입니다(UE·Unity·Web은 최대 16밴드).
- 엔진 음원 수는 플랫폼 상한(`maxSources`)을 넘지 않습니다. 초과 보이스는 dry입니다.
- Source 뒤의 이벤트 이펙트/센드는 무음을 받습니다(SimpleST 믹스는 Listener 버스에서 나옵니다).
- `Overall Gain`(가상화용 가청도)은 거리 기반 추정치입니다.
- FMOD Studio는 System을 여러 개 만들 수 있어 System마다 SimpleST 컨텍스트가 생깁니다.
- SDK 110 배포 빌드는 공식 FMOD 2.03 SDK로 다시 빌드해야 합니다(FMOD EULA상 SDK 재배포 금지).

## 로그 / 환경변수

| 변수 | 의미 |
|---|---|
| `SIMPLESTFMOD_LOG_FILE` | 로그 파일 경로 |
| `SIMPLESTFMOD_LOG_STDERR` | stderr 로그 |
| `SIMPLESTFMOD_RUNTIME_LIBRARY` | SimpleSTRealtime 경로 강제 |
| `SIMPLESTFMOD_AUDITION_ROOM` | `"W,H,D"` 오디션 룸(m), `"0"` 끔 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"`이면 웜 음원 풀을 끄고 보이스마다 새 엔진 음원(비교용) |

Windows에서는 항상 `OutputDebugString`으로도 나갑니다. 컨트롤 스레드가 렌더러 상태가 바뀔 때마다
`SimpleST Listener rendering` / `no SimpleST Listener rendering`을 남깁니다.

## 다음 문서

- [Wwise 플러그인](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
