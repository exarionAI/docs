---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — 모든 플랫폼 공통 코어의 바이너리, 헤더, 최소 사용 흐름, 함수군, 스레드 규칙.
---

# Sound-Tracing SDK (C/C++)

모든 플랫폼에서 같은 코어를 씁니다. Unity · Unreal Engine · FMOD · Wwise · Web SDK는 이 바이너리를
각 플랫폼 방식으로 감싼 래퍼이고, 네이티브 C/C++에서는 헤더를 포함하고 플랫폼에 맞는 바이너리를 링크하면 됩니다.

## 배포물

| 플랫폼 | 바이너리 (`Binaries/`) | 링크 |
|---|---|---|
| Windows x64 | `Win64/Release/SimpleSTRealtime.dll` + `.lib` | 동적 |
| macOS (Universal) | `Mac/Release/libSimpleSTRealtime.dylib` | 동적 |
| Linux x86_64 | `Linux/Release/libSimpleSTRealtime.so` | 동적 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSimpleSTRealtime.so` | 동적 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsimplest_static.a` | 정적 |
| Web | `Web/Release/SimpleSTRealtime.mjs` + `.wasm` (pthreads) | WASM 모듈 (COOP/COEP 필요) |

오프라인 IR 계산용 `SimpleSTOffline`(같은 폴더, `st_off_*`)이 함께 들어 있습니다. 헤더는 모든 플랫폼 공통입니다.

```text
SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| 헤더 | 컨텍스트 | 함수 접두 | 역할 |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | 실시간 전파 + 오디오 렌더 |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | 오프라인 IR 계산·렌더 |
| `STTypes.h` | — | `ST_*` | 공통 POD·enum |

엔티티 id는 타입별 핸들(`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`, 각각
`struct { int32_t v; }`)이고 **실패는 `v < 0`** 입니다. 좌표계는 왼손 `+Y` up · `+Z` forward, 단위는 미터
(`STRT_CreateOptions.sceneRatio`로 cm = `0.01` 지정), 리스너 각도는 라디안입니다.

## 최소 사용 흐름

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 호스트 오디오 콜백이 블록을 가져감
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// 호스트 믹스가 음색·레벨을 맡으면 생성 직후 끈다 (모든 공식 래퍼가 끔)
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 재질 — 기본 라이브러리를 등록하면 첫 재질의 핸들이 돌아온다
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. 메시 + 오브젝트 (xyz interleaved, 인덱스 삼각형)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = 메시 전체 재질 하나
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 음원·리스너
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW, roll 포함

// 4. 호스트 PCM 입력 스트림 (모노)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 빌드 + 렌더 시작 + 출력단 명시
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid 초기 반사 (실시간 권장)
ro.useLimiter = 0;               // 호스트 마스터 체인이 리미팅을 맡으면 끔
st_rt_render_set_options(ctx, &ro);

// 6. 게임 루프 (제어 스레드)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // 워커를 깨우고 즉시 반환

// 7. 오디오 콜백 (호스트 오디오 스레드)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## 함수군

| family | 대표 함수 |
|---|---|
| 생애주기 | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_version_string`, `st_rt_get_capability_word`, `st_rt_get_last_status` / `st_rt_get_last_error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`, `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| source | `st_rt_source_create`, `set_position` / `set_velocity` / `set_orientation_q`, `set_directivity`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_parametric_eq` |
| source 입력·재생 | `st_rt_source_attach_stream` + `write_stream`, `set_audio_file`, `set_audio_clip`, `play` / `pause` / `stop` / `seek`, `set_volume`, `set_pitch`, `set_loop_count`, `trigger` |
| listener | `st_rt_listener_set_position` / `set_velocity` / `set_orientation_q` / `set_rotation_ypr`, `set_ray_count` |
| 전파 | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| 음향 정책 | `st_rt_set_atmosphere`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_late_coupling_preset` |
| render | `st_rt_render_start` / `stop`, `st_rt_render_process`, `set_options` / `get_options`, `set_spatializer`, `set_speaker_layout`, `set_parametric_eq`, `set_loudness_compensation`, `set_master_gain_db`, `set_limiter_type`, `set_max_delay_seconds`, `get_latency_frames` |
| 메모리 예산 | `STRT_CreateOptions.maxSources`, `st_rt_set_memory_budget`, `st_rt_get_memory_stats` |
| 스레드 | `STRT_CreateOptions.maxComputeThreads` / `.scheduler`, `st_rt_set_thread_attributes`, `st_rt_get_thread_inventory`, `st_rt_set_lane_update_interval` — [스레드 모델](#스레드-모델) |
| 진단 | `st_rt_get_timing`, `st_rt_scene_get_stats`, `st_rt_ir_get_stats`, `st_rt_debug_copy_visual_paths` |

공간화는 `st_rt_render_set_spatializer`로 `0` 패닝 · `1` MIT KEMAR(내장) · `2` SADIE II D2 KEMAR(`Resources/HRTF`)를
고르고, 스피커 출력은 `st_rt_render_set_speaker_layout`(2.0 / 2.1 / 4.1 / 5.1 / 7.1)로 켭니다. 재질은 9밴드
(`63 Hz ~ 16 kHz`) `reflection / absorption / transmission / scattering`이며 밴드마다 `R + A + T = 1`이어야 합니다.

## 스레드 모델

![Sound-Tracing SDK (C/C++) 스레드와 데이터 흐름](/img/sdk/native-architecture.png)

호스트가 제공하는 스레드는 둘입니다 — **제어 스레드 하나**(씬·음원·리스너·전파 호출)와 **오디오 스레드**
(PCM 입력·렌더 출력). 나머지는 엔진이 컨텍스트 안에서 만듭니다.

### 호출 가능한 스레드

헤더의 모든 함수 위에 태그가 있습니다.

| 태그 | 의미 | 대표 함수 |
|---|---|---|
| `[control]` | 제어 스레드. 씬 락을 잡을 수 있으므로 오디오 콜백에서 부르지 않습니다 | 생성·씬·음원·리스너 setter, `st_rt_propagate`(PIPELINED는 워커를 깨우고 즉시 반환) |
| `[control, blocking]` | 긴 배타 구간 — 게임 루프·오디오 스레드에서 부르지 않습니다 | `st_rt_build`, `st_rt_render_start` / `stop`, HRIR 로드, 지연 링 재할당 |
| `[audio]` | 호스트 오디오 스레드에서 안전 — 락·할당·시스템콜 없음 | `st_rt_source_write_stream`, `st_rt_render_process` |
| `[any]` | 어느 스레드에서나 (atomic 읽기 / 상수) | `st_rt_get_timing`, `st_rt_get_thread_inventory`, `st_rt_get_lane_update_interval` |

`[control]` 호출은 **전용 컨트롤 스레드 하나**로 직렬화하십시오. 모든 공식 래퍼가 이 구조입니다.

### 엔진이 만드는 스레드

| 종류 (`STThreadType`) | 개수 | 역할 |
|---|---|---|
| `ST_THREAD_COMPUTE_POOL` | PIPELINED: N − 1 (Direct 전용 1 + 일반 N − 2), N = max(3, 예산) · SYNCHRONOUS: N (N = 1이면 호출자 인라인) | 전파 레인·IR 변환·IR 준비 task가 모두 이 풀에서 돕니다 |
| `ST_THREAD_AUDIO_RENDER` | 1 (DEVICE · HOST_PULL_BUFFERED) / 0 (HOST_PULL) | 블록 렌더. BUFFERED에서는 링을 채우고 콜백은 복사만 합니다 |
| 장치 스레드 | 1 (DEVICE만) | OS 출력 장치(WASAPI · CoreAudio · AAudio) 드라이버. 인벤토리에는 포함되지 않습니다 |
| `ST_THREAD_FILE_DECODER` | ≤ 1 | `st_rt_source_set_audio_file` 입력이 있을 때만. 호스트 스트림 입력에는 없습니다 |

- **예산**: `STRT_CreateOptions.maxComputeThreads` — `0` = auto = min(퍼포먼스 코어, 6). 환경변수 영향 없음.
- **스케줄러**: `STRT_CreateOptions.scheduler` — `ST_RT_SCHEDULER_PIPELINED`(기본, 레인이 워커에서 독립 주기로 돕니다) /
  `ST_RT_SCHEDULER_SYNCHRONOUS`(`st_rt_propagate`가 호출 스레드에서 전파를 끝내고 반환).
- **합계 (DEVICE 모드)**: PIPELINED = N + 1 (+ 파일 디코더 1) · SYNCHRONOUS = N + 2 (+ 1). HOST_PULL은 렌더·장치 스레드가 빠지고,
  HOST_PULL_BUFFERED는 렌더 1만 남습니다. 실측은 `st_rt_get_thread_inventory`(`[any]`, 종류별 atomic 카운터)로 봅니다.
- 가속구조(TinyBVH) 빌드는 호출 스레드에서 실행되며 별도 워커를 만들지 않습니다.

### 전파 레인 주기

PIPELINED의 기하 레인 3종은 `st_rt_set_lane_update_interval(ctx, lane, ms)`로 **런타임에 언제든** 주기를 바꿉니다
(`[0, 60000]` ms, 범위 밖은 거절).

| `STPropagationLane` | 기본 | 의미 |
|---|---|---|
| `DIRECT` (0) | 10 ms | 연속 실행 시작 사이 최소 간격 |
| `REFLECTION_DIFFRACTION` (1) | 0 ms | 연속 두 실행 사이 최소 간격. 전파 비용의 대부분 — CPU를 되사려면 여기를 먼저 올립니다(초기 반사가 리스너를 늦게 따라오는 대가, 무음·드롭아웃은 없음) |
| `REVERB` (2) | 4 ms | 실행 완료 후 다음 실행까지 최소 간격 |

### 스레드 속성

`st_rt_set_thread_attributes(threadType, &attr)`는 **컨텍스트 생성 전에** 종류별로 지정합니다(이미 도는 스레드에는
소급되지 않음, 프로세스 전역, FMOD `Thread_SetAttributes`와 같은 자리). 논리 역할(`LANE_*` · `IR_CONVERTER` ·
`AU_PREPARE` · `SCENE_INPUT`)은 전용 스레드가 없으므로 풀 정책은 `ST_THREAD_COMPUTE_POOL`에 겁니다.

```c
STThreadAttributes attr = { sizeof attr, ST_ABI_VERSION };
attr.priority = ST_THREAD_PRIORITY_ABOVE_NORMAL;            // DEFAULT · LOW · BELOW_NORMAL · NORMAL · ABOVE_NORMAL · HIGH · TIME_CRITICAL
attr.flags    = ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES;    // 또는 PREFER_EFFICIENCY_CORES (둘 다 켜면 거절)
attr.affinityMask = 0;                                      // 논리 프로세서 비트마스크, Windows만 존중. 0 = 지정 없음
st_rt_set_thread_attributes(ST_THREAD_COMPUTE_POOL, &attr);
st_rt_set_thread_attributes(ST_THREAD_AUDIO_RENDER, &attr);
```

### 출력 모드와 지연

| `renderOutputMode` | 엔진 스레드 | 호스트 콜백이 하는 일 | 지연 |
|---|---|---|---|
| `DEVICE` (0) | 렌더 1 + 장치 1 | 없음 — 엔진이 장치를 직접 엽니다 | 장치 버퍼 |
| `HOST_PULL` (1) | 없음 | `st_rt_render_process`가 콜백 안에서 블록을 렌더 | 0 블록 (렌더 비용이 콜백에 실림) |
| `HOST_PULL_BUFFERED` (2) | 렌더 1 | 링에서 복사만 (≈ memcpy) | 링 ≈ 3 블록 (`st_rt_render_get_latency_frames`) |

세 모드 모두 `st_rt_render_start(useHrtf)`는 불러야 합니다(HOST_PULL 계열에서는 스레드·장치를 만들지 않고 렌더 허용 플래그와
바이노럴/스피커 선택만 합니다). `hostSampleRate ≠ 0`이면 레이트 변환은 렌더 스레드(BUFFERED) 또는 콜백(HOST_PULL)에서 엔진이 합니다.
UE · Unity · FMOD · Wwise 플러그인은 모두 BUFFERED를 씁니다.

## 플랫폼 메모

- **Android**: API 28 이상. ABI별 `.so`를 앱 라이브러리 폴더에 넣습니다.
- **iOS**: 정적 라이브러리 하나(`libsimplest_static.a`)에 실시간·오프라인이 모두 들어 있습니다. device / simulator를 구분해 링크합니다.
- **Web**: `SimpleSTRealtime.mjs/.wasm`은 pthreads 빌드라 페이지와 Worker 응답에 `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`가 필요합니다. `[control]` 호출은 한 Worker에서만 하고(메인 스레드의 블로킹 호출은
  `Atomics.wait` 제한으로 실패), 오디오는 AudioWorklet에서 공유 링으로 주고받습니다. TypeScript facade가 필요하면 [Web SDK](./web.md)를 쓰십시오.
- **호스트 샘플레이트**: 엔진 내부는 44.1 kHz이고 `hostSampleRate`를 지정하면 입력·출력을 엔진이 변환합니다.

## 오프라인 IR

`SimpleSTOffline`(`st_off_*`)은 같은 씬 API로 장치·워커 없이 한 번 전파해 IR을 만듭니다.

| 출력 | 함수 |
|---|---|
| 계산 | `st_off_ir_compute` |
| 압력 IR (모노 / 9밴드) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| 바이노럴 IR | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| Raw 에너지 탭 | `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |

## 다음 문서

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD 플러그인](./fmod.md) · [Wwise 플러그인](./wwise.md)
