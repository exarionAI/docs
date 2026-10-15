---
title: FMOD
description: SimpleSTFmod — FMOD Studio / FMOD Engine용 SimpleST DSP 플러그인의 구조, 설치, Studio 저작, 게임 쪽 C API, UE·Unity 통합.
---

# SimpleST FMOD 플러그인

**SimpleSTFmod**는 [SimpleST](../core/simplest.md)를 FMOD Studio / FMOD Engine에서 쓰기 위한 DSP
플러그인입니다. 저작툴에서 이벤트에 꽂아 쓰는 **SimpleST Source**와 마스터 버스에 하나 두는
**SimpleST Listener** 두 DSP, 그리고 게임 엔진이 지오메트리를 올리는 C API로 구성됩니다.

| 항목 | 값 |
|---|---|
| 플러그인 버전 | v0.2.0 |
| FMOD | Studio / Engine 2.03 ~ 2.04 (plug-in SDK 110 빌드 = 2.00 ~ 2.04, 204 빌드 = 2.04+) |
| 플랫폼 | Windows x64 · macOS · Linux · Android · iOS(정적) · Web(정적, FMOD HTML5 pthreads) |
| 배포 | `SimpleST-fmod-release.zip` (플랫폼별 `plugins/` + `install.py`, UE·Unity 글루 포함) |
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
- 엔진 음원은 오디오가 실제로 들어온 Source에만 만듭니다(동시 스트림 64개 보호).

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

Listener를 **bypass**하면 Source들이 dry 통과로 돌아갑니다(A/B 비교용). DSP 이름과 파라미터
이름은 뱅크가 식별자로 저장하므로 배포 후 바꾸지 않습니다.

## 게임 쪽 C API

`include/SimpleSTFmod/SimpleSTFmod.h` — 플러그인 라이브러리가 export합니다. **FMOD가 로드한 그 모듈**에서
바인딩합니다. 모든 호출은 게임 스레드에서 하고, SimpleST `[control]` 호출은 반드시
`SimpleSTFmod_InvokeOnControlThread` 안에서 합니다.

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // 기본. IN_CALLBACK = FMOD 믹서 콜백 안에서 렌더
cfg.sceneRatio = 0.f;                            // 0 = 1.0 (FMOD UE/Unity 통합 단위는 미터)
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

## UE · Unity 통합

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

- **Unreal Engine**: `install.py /path/to/Game.uproject --fmod <plugins>`가 `Plugins/FMODStudio/Binaries/<Plat>/`에
  플러그인·엔진·HRTF를 넣고 `DefaultEngine.ini`에 `+PluginFiles=SimpleSTFmod`를 추가합니다. SoundTracing
  플러그인은 FMOD 모드로 빌드되어 지오메트리만 올립니다 — [Unreal Engine SDK](./ue.md). UE 5.7 + FMOD for
  Unreal 2.04 청취 검증(2026-10-15).
- **Unity**: **SoundTrace › FMOD › Install SimpleST FMOD Plug-in...** 메뉴가 DLL/bundle 복사와 Dynamic Plugins
  등록을 수행합니다 — [Unity SDK](./unity.md#fmod와-함께-쓰기). Unity 6000.3 + FMOD for Unity 2.04 E2E 통과.

![Unity FMOD 설치 메뉴](/img/fmod/unity-install-menu.png)

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

- 리스너 1개(roll 없음), 동시 스트림 64개(초과분 dry), 출력 스테레오만(스피커 레이아웃 미노출).
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

Windows에서는 항상 `OutputDebugString`으로도 나갑니다. 컨트롤 스레드가 렌더러 상태가 바뀔 때마다
`SimpleST Listener rendering` / `no SimpleST Listener rendering`을 남깁니다.

## 다음 문서

- [Wwise 플러그인](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
