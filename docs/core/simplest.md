---
sidebar_position: 1
title: SimpleST
description: Sound Tracing의 현행 네이티브 엔진 SimpleST — C++20 기하음향 코어, 2-DLL 공개 C ABI(ABI 6), 9밴드 재질, Hybrid 초기 반사, 파라메트릭 EQ, 호스트 pull 렌더.
---

# SimpleST

**SimpleST**는 Sound Tracing 제품군의 현행 네이티브 엔진입니다. 메시·재질·음원·리스너로부터
직접음·투과·반사·회절 경로와 late reverb 통계를 기하학적으로 계산하고, 그 결과를
실시간 공간 오디오 또는 결정적 임펄스 응답(IR)으로 합성하는 C++20 라이브러리입니다.
이전 세대 엔진 [STCoreV2](./stcorev2.md)를 대체하며, 모든 SDK·미들웨어 플러그인이
이 엔진의 공개 C ABI 위에서 동작합니다.

![엔진 파이프라인](/img/core/pipeline-overview.png)

## 개요

| 항목 | 값 |
|---|---|
| 엔진 버전 | **2.22.0** (`ST_VERSION_STRING`), SDK 릴리스 2.22.0-jhj.5. 이전 SDK 릴리스: 2.18.2-jhj.7(엔진 2.18.2), 2.12.0 |
| 공개 ABI | **ABI 6** (`ST_ABI_VERSION`, 3.0 클린 브레이크). 2.12.0 이후 변경은 전부 additive |
| 주 언어 | C++20 (C ABI 노출, C11 헤더 호환) |
| 빌드 시스템 | CMake 3.21+ · 플랫폼 진입점 `mainBuild.sh` |
| 플랫폼 | Windows x64 · macOS Universal · Linux x86_64 · Android(arm64-v8a/armeabi-v7a/x86_64) · iOS(device/simulator) · Web(Emscripten, pthreads) |
| 배포 형태 | 실시간 DLL `SimpleSTRealtime` + 오프라인 DLL `SimpleSTOffline` (iOS/Web은 정적 라이브러리) |
| 샘플레이트 | 엔진 내부 44.1 kHz 고정, 호스트 레이트는 내장 리샘플러로 변환 |
| 밴드 | 9 옥타브 밴드 `63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz` |
| 가속구조 | TinyBVH(기본) · BinnedSAH · HybridKD · LBVH · LBVH_SIMD |
| 테스트 | 회귀 하네스 `SimpleST_demo` + CTest 110여 개 |

## 아키텍처

```text
SceneManager → STPropagator → STIRConverter ─┬→ STOnlineAuralizator  (실시간 스트림)
                                             └→ STOfflineAuralizator (결정적 RIR / 밴드 IR)
```

- **SceneManager** — 메시·재질·음원·리스너와 TLAS/BLAS를 소유합니다. 정적 지오메트리는
  한 번 빌드하고, 동적 오브젝트는 변환만 갱신합니다.
- **STPropagator** — 기하 전용 단계입니다. 직접음/투과/반사/회절 경로를 찾고, late reverb용
  룸 통계(mean free path, 표면적, 재질 분포)와 source transport(확산 수송) 레이를 계산합니다.
  음향 게인은 여기서 계산하지 않습니다.
- **STIRConverter** — 기하를 음향 도메인으로 바꿉니다. 지연·Doppler slope·9밴드 에너지 게인·
  거리/공기 감쇠·UTD 회절·reverb send tap·HOA3 early bed 집계가 여기서 결정됩니다.
- **Auralizator** — 공용 실행기 위에 두 렌더러가 있습니다. 실시간 렌더러는 9밴드 크로스오버 →
  밴드 지연 링 → 경로 탭(Doppler/페이드) → 공간화(패닝 / MIT KEMAR / SADIE II D2 HRIR) →
  FDN16 late reverb → 리미터 순으로 처리합니다.

![엔진 셸 3종](/img/core/engine-shells.png)

엔진 셸은 세 종류입니다.

| 셸 | 용도 |
|---|---|
| `STRealTimeEngine` | 동기 전파 + 오디오 렌더. 진단·호환용 |
| `STRealTimeMultiEngine` | Propagator/IRConverter 워커와 latest-only 트리플 버퍼. **실시간 기본** |
| `STOfflineEngine` | canonical IR 캐시를 한 번 만들고 Raw 에너지 / 압력 IR / 바이노럴 IR을 결정적으로 파생 |

## 공개 C ABI

공개 ABI는 두 DLL로 물리적으로 분리되어 있고 공통 POD는 `STTypes.h`에 있습니다.

| 헤더 | 컨텍스트 | 함수 접두 | 역할 |
|---|---|---|---|
| `SimpleST/ABI/STRealtime.h` | `STRT_Context*` | `st_rt_*` | 실시간 전파 + 오디오 렌더 (181 export) |
| `SimpleST/ABI/STOffline.h` | `STOFF_Context*` | `st_off_*` | 오프라인 IR 계산·렌더 (121 export) |
| `SimpleST/ABI/STTypes.h` | — | `ST_*` | 공통 POD·enum·capability 비트 |

이름 규칙은 `st_<dll>_<family>_<verb>[_<what>]`이고, family는
`scene / mesh / object / material / source / listener / render / debug / ir`입니다.
컨텍스트 생애주기·빌드·전역 정책 함수에는 family가 없습니다.

### 엔티티 핸들

메시·오브젝트·음원·리스너·재질 id는 서로 다른 struct 타입입니다. 크기와 호출 규약은
`int32_t`와 같지만, 종류를 섞어 넣으면 컴파일이 깨집니다.

```c
typedef struct STMeshId     { int32_t v; } STMeshId;
typedef struct STObjectId   { int32_t v; } STObjectId;
typedef struct STSourceId   { int32_t v; } STSourceId;
typedef struct STListenerId { int32_t v; } STListenerId;
typedef struct STMaterialId { int32_t v; } STMaterialId;
```

생성 함수는 핸들을 값으로 돌려주고 **실패는 `v < 0`** 입니다. `0`은 유효한 id입니다.

### 실시간 함수군 요약

| family | 대표 함수 |
|---|---|
| 생애주기 | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_api_version`, `st_rt_get_version_string`, `st_rt_get_capabilities`, `st_rt_get_capability_word`, `st_rt_get_last_status/error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`(재질 하나 또는 삼각형별 재질 인덱스), `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| scene | `st_rt_scene_set_accel`, `st_rt_scene_set_triangle_intersection`, `st_rt_scene_get_stats`, `st_rt_scene_raycast` |
| source | `st_rt_source_create`, `set_position/direction/velocity`, `set_orientation_q`, `set_directivity`, `set_axis_attenuation`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_ray_count`, `set_depth`, `set_transport_refresh_steps`, `set_parametric_eq` / `set_eq`(소스 EQ) |
| source 오디오 입력 | `st_rt_source_set_audio_file`(WAV/FLAC/MP3/Ogg), `st_rt_source_attach_stream` + `write_stream` + `get_stream_status`(호스트 PCM), `st_rt_source_set_audio_clip` / `set_audio_clip_asset`(캐시 클립), `clear_audio` |
| source 재생 제어 | `st_rt_source_play/pause/stop/seek`, `set_volume`(선형 0 ~ 16), `set_pitch`(0.25 ~ 4), `set_loop_count`, `st_rt_source_trigger`, `set_retrigger_interval` |
| listener | `st_rt_listener_set_position/velocity/rotation`, `set_rotation_ypr`, `set_orientation_q`(2.22, 머리 roll 포함), `set_ray_count`, `set_ray_sampling_method` |
| 전파 | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_transmission_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| 음향 정책 | `st_rt_set_atmosphere`, `st_rt_set_physical_distance_attenuation`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_doppler_gain_mode`, `st_rt_set_late_coupling[_preset]`, `st_rt_set_early_late_band_energy_targets` |
| render | `st_rt_render_start/stop`, `st_rt_render_process`(호스트 pull), `set_options/get_options`, `set_spatializer`, `set_speaker_layout[_custom]`, `set_parametric_eq`, `set_eq`, `set_loudness_compensation`, `set_virtual_bass`, `set_master_gain_db`, `set_limiter_type`, `get_limiter_latency_samples`, `set_path_fade_time`, `set_max_delay_seconds`, `get_latency_frames`, `get_process_stats` |
| 스레드 | `st_rt_set_thread_attributes`, `st_rt_get_thread_inventory`, `STRT_CreateOptions.maxComputeThreads` |
| 쉼·실행 | `st_rt_idle`, `st_rt_run`, `st_rt_get_idle_state`, `STRT_CreateOptions.startIdle`(2.20, 1이면 IDLE로 시작해 `st_rt_run`까지 계산·렌더가 쉼), 음원별 `st_rt_source_idle/run` |
| 메모리 예산 | `st_rt_set_memory_budget`, `st_rt_get_memory_budget`, `st_rt_get_memory_stats`, `STRT_CreateOptions.maxSources` — [음원 메모리 예산](#음원-메모리-예산) |
| 진단 | `st_rt_get_timing`, `st_rt_ir_get_stats`, `st_rt_debug_acquire_snapshot`, `st_rt_debug_copy_visual_paths`, `st_rt_debug_copy_mesh/scene_accel_nodes` |

### 스레드 태그

헤더의 모든 export 위에는 호출 가능한 스레드를 나타내는 한 줄 태그가 있습니다.

| 태그 | 의미 |
|---|---|
| `[control]` | 제어 스레드용. 씬 락을 잡을 수 있으므로 오디오 콜백에서 부르지 않습니다 |
| `[control, blocking]` | 가속구조 빌드, 장치 start/stop, HRIR 로드처럼 긴 배타 구간 |
| `[any]` | 락 없이 atomic·상수만 읽거나 호출자 POD만 채웁니다 |
| `[audio]` | 호스트 오디오 스레드에서 안전 — `st_rt_render_process`, `st_rt_source_write_stream` |

:::tip
FMOD·Wwise·UE·Unity 래퍼는 전부 **전용 컨트롤 스레드**를 두고 `[control]` 호출을 그곳으로
직렬화합니다. 직접 ABI를 쓸 때도 같은 구조를 권장합니다.
:::

## 시작하기

### SDK 레이아웃

`mainBuild.sh build <platform> release`가 만드는 SDK는 UE `ThirdParty`와 같은 레이아웃입니다.

```text
out/dist/<platform>_release/SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/ SimpleSTRealtime.{dll,dylib,so} · SimpleSTOffline.* · (iOS/Web) libsimplest_static.a
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin + 라이선스
└─ Licenses/                miniaudio · tinybvh
```

### 최소 사용 시나리오

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);             // scheduler=PIPELINED, sceneRatio=1(m), renderOutputMode=DEVICE
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 호스트가 블록을 가져가는 경우
opt.hostSampleRate   = 48000;                 // 호스트 레이트. 0 = 44100 그대로

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error */ }

// 2.21.0부터 st_rt_create가 등라우드니스 보정을 켠다. 호스트 믹스가 음색을 맡으면 생성 직후 끈다
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 재질 — 기본 라이브러리(BRAS 24종)를 통째로 등록. 첫 재질의 핸들이 돌아온다.
STMaterialId firstMat = st_rt_material_load_defaults(ctx);

// 2. 메시 + 오브젝트
STMesh mesh = { numVertices, vertices, numTriangles, triangles };   // xyz interleaved, index triplets
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, firstMat, NULL);    // NULL = 메시 전체 재질 하나
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 음원·리스너
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
st_rt_listener_set_rotation(ctx, /*yaw*/0.f, /*pitch*/0.f);        // 라디안. roll까지: set_orientation_q(XYZW)

// 4. 호스트 PCM 스트림 입력
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };     // 모노, capacity 0 = 8192 프레임
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 가속구조 빌드 + 렌더 시작 + 출력단 명시
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // 1 = hybrid (2.18.0 기본. render_start 뒤에 명시)
ro.useLimiter = 0;               // 호스트 마스터 체인이 리미팅을 맡으면 끔 (2.18.0 기본 1 = true-peak)
st_rt_render_set_options(ctx, &ro);
st_rt_render_set_master_gain_db(ctx, 0.f);                          // 엔진 기본 0 dB

// 6. 게임 루프(제어 스레드)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // PIPELINED는 워커를 깨우고 즉시 반환

// 7. 오디오 콜백(호스트 오디오 스레드)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);   // [audio]
st_rt_render_process(ctx, interleavedStereoOut, frames);  // [audio]

st_rt_destroy(ctx);
```

:::note
2.18.0부터 생성 직후 기본값과 실시간 렌더 프리셋(스피커 레이아웃을 켜고 끌 때 다시 깔림)은
**Hybrid(`reserved0 = 1`) + true-peak 출력 리미터(−1 dBTP, 137샘플 지연) 켜짐**이고, 마스터 게인은 0 dB입니다
(2.12.0까지는 Objects + 리미터 꺼짐). 기본값에 기대지 말고 Hybrid·리미터를 **`render_start`와 레이아웃 변경
뒤에** 명시하세요. 모든 공식 플러그인이 이 순서로 자기 기본값을 다시 겁니다.

2.21.0부터 `st_rt_create`는 [등라우드니스 보정](#등라우드니스-보정)도 켭니다. 이 설정은 컨텍스트 단위라
`render_start`가 되돌리지 않으므로 생성 직후 한 번 정하면 됩니다. 공식 래퍼는 모두 생성 직후 끕니다.
:::

## 핵심 개념

### 좌표·단위 계약

- **좌표계는 Unity와 같습니다** — 왼손, `+Y` up, `+Z` forward, `+X` right. yaw 양수 = 오른쪽
  회전, pitch 양수 = 아래. Unity 호스트는 변환 없이 넣고, `-Z` forward 호스트(Three.js 등)는
  래퍼가 Z를 뒤집습니다. UE는 `(Y, Z, X)` 재배열과 cm→m 변환을 플러그인이 수행합니다.
- **단위는 미터**입니다. 다른 단위의 호스트는 `STRT_CreateOptions.sceneRatio`
  (cm = `0.01`, ft = `0.3048`)를 생성 시 1회 지정합니다. 좌표는 씬 단위 그대로 넣고,
  엔진이 미터가 필요한 곳에서만 곱합니다. 지오메트리를 미리 스케일하면서 `sceneRatio`도
  주는 **이중 스케일은 금지**입니다.
- 각도: 리스너 rotation은 **라디안**, 스피커 레이아웃만 도(degree)입니다. 2.22.0부터
  `st_rt_listener_set_orientation_q`(로컬→월드 단위 쿼터니언, XYZW)와 `st_rt_listener_set_rotation_ypr`(yaw·pitch·roll)로
  머리 기울임(roll)까지 넘길 수 있습니다. 리스너 방향 setter 셋은 마지막에 부른 쪽이 이깁니다.
- 메시 와인딩: 교차 커널은 양면이라 반사·투과는 와인딩 무관이지만, 회절 엣지 판정 두 곳이
  법선 부호를 봅니다. 메시 하나 안에서 와인딩을 일관되게 유지하세요.

### 재질 — 9밴드, 엄격 검증

```c
typedef struct STMaterial {
    uint32_t structSize, apiVersion;
    float reflection[9], absorption[9], transmission[9], scattering[9];
    uint32_t reserved[8];
} STMaterial;
```

- R/A/T/scattering은 모두 **energy-domain** 무차원 비율이며 밴드마다
  `|R + A + T − 1| ≤ 0.001`이어야 합니다. 자동 유도·정규화·보간은 없습니다.
- scattering은 반사 에너지 중 확산 비율이라 합에는 들어가지 않습니다.
- 기본 라이브러리는 BRAS 측정에서 적합한 24종입니다(`st_rt_material_load_defaults`).
- `sqrt`는 렌더 경계에서 정확히 한 번만 걸립니다. 호스트가 넣는 값은 에너지입니다.

### 경로 종류와 게이트

| pathType | 의미 |
|---|---|
| 0 Direct | 직접음 |
| 1 Transmission | 지오메트리를 통과한 직접음(차폐) |
| 2 Reflection | 정반사(최대 깊이 `st_rt_set_max_depth`, 기본 8) |
| 3 Diffraction | UTD 회절(source-side 1 + terminal 1 edge) |
| 4 Reverb | source transport 확산 수송 → FDN16 late reverb |

전역(`st_rt_set_path_type_enabled`)과 음원별(`st_rt_source_set_path_enabled`) 게이트가 있고,
`st_rt_set_acoustic_feature_enabled`로 공기 흡수·전파 지연·직접음 차폐를 각각 끌 수 있습니다.
전부 끄면 거리감쇠 + 스테레오 패닝만 남는 "Sound Tracing OFF" 기준선이 됩니다.

### 레이 예산

| 축 | 기본값 | 함수 |
|---|---|---|
| 리스너 guide ray | `16 × 16`, Fibonacci sphere | `st_rt_listener_set_ray_count`, `_set_ray_sampling_method` |
| 반사 최대 깊이 | 전역 8, 음원별 4 | `st_rt_set_max_depth`, `st_rt_source_set_depth` |
| 음원 transport ray | `16 × 8` | `st_rt_source_set_ray_count` |
| 투과 최대 깊이 | 64 | `st_rt_set_transmission_max_depth` |
| transport 갱신 단계 | 0(자동: PIPELINED 동적 8 · 정적 16) | `st_rt_source_set_transport_refresh_steps` |

### Hybrid 초기 반사 (실시간 게임 권장)

![Hybrid 초기 반사](/img/core/hybrid-early-reflections.png)

`STRenderOptions.reserved0`(earlySpatialMode)는 두 값입니다.

| 값 | 동작 | 용도 |
|---|---|---|
| `0` Objects | 모든 early path를 개별 공간화 오브젝트로 렌더 | 기준 청취·오프라인 A/B (2.12.0까지 프리셋 기본) |
| `1` Hybrid | 리스너 전역 예산(반사 12+4 · 회절 3+1)만 exact, 나머지는 HOA3 bed | **실시간 게임** (2.18.0부터 엔진 기본) |

음원 8개짜리 홀에서 Objects는 블록당 16.8 ms(한계 11.6 ms), Hybrid는 2.4 ms입니다.
2.18.0부터 엔진 기본값도 Hybrid이고, UE·Unity·FMOD·Wwise·soundtrace.js는 모두 렌더 시작 뒤 Hybrid를
명시적으로 겁니다.

### 공간화와 출력

| `st_rt_render_set_spatializer` | 설명 |
|---|---|
| `0` PANNING | 스테레오 진폭 패닝(기본) |
| `1` MIT_KEMAR | 엔진에 내장된 MIT KEMAR HRIR(128탭) |
| `2` SADIE_D2_KEMAR | 함께 배포되는 SADIE II D2 KEMAR HRIR(8,802방향 · 256탭) |

스피커 출력은 `st_rt_render_set_speaker_layout`(2.0 / 2.1 / 4.1 / 5.1 / 7.1 / 랩톱 근접 2.0)
또는 커스텀 레이아웃으로 켜며, 내부 HOA3 디코드로 N채널을 냅니다. 출력단은 출력 EQ → (스피커) 채널 EQ →
등라우드니스 보정 → 가상 베이스 → 마스터 게인 → 리미터 순입니다.

| 출력단 | 함수 | 실시간 기본 (2.22.0) |
|---|---|---|
| 출력 EQ | `st_rt_render_set_parametric_eq` — [파라메트릭 EQ](#파라메트릭-eq). 종전 9밴드 `st_rt_render_set_eq`는 같은 EQ의 그래픽 뷰 | 꺼짐 |
| 등라우드니스 보정 | `st_rt_render_set_loudness_compensation` (2.21.0) | **켜짐**(`st_rt_create`가 켬) |
| 가상 베이스 | `st_rt_render_set_virtual_bass` (2.21.0) | 꺼짐 |
| 마스터 게인 | `st_rt_render_set_master_gain_db` (−96 ~ +24 dB, 20 ms 램프) | 0 dB |
| 리미터 종류 | `st_rt_render_set_limiter_type` — Envelope(0) / Lookahead peak(1) / True peak(2) | True peak, 천장 −1 dBTP |
| 리미터 켜기 | `STRenderOptions.useLimiter` | 켜짐(1). 지연은 `st_rt_render_get_limiter_latency_samples` = 137샘플 |

리미터는 스테레오와 스피커 레이아웃(N채널, 채널 링크) 모든 출력의 마지막 단계입니다. 미들웨어·게임
엔진처럼 호스트 마스터 체인이 리미팅을 맡는 통합은 `useLimiter = 0`으로 끕니다. 새 기능은
`st_rt_get_capability_word(1)`의 `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER` · `ST_CAP1_MASTER_GAIN`으로 확인합니다
(워드 0 = `st_rt_get_capabilities()`의 비트와 섞어 AND하지 마세요).

### 파라메트릭 EQ

2.21.0부터 EQ는 RBJ 2차 필터 밴드를 직렬로 거는 파라메트릭 EQ 하나입니다. 같은 밴드 구조체
(`STParametricEqBand`)를 두 자리에서 씁니다.

| 자리 | 함수 | 거는 곳 |
|---|---|---|
| 소스 EQ | `st_rt_source_set_parametric_eq` (`ST_CAP1_SOURCE_PARAMETRIC_EQ`) | 음원 원음 PCM, 9밴드 크로스오버 **앞**. 그 음원의 직접·반사·회절·잔향 송출이 모두 같은 톤이 됩니다. 지우기는 `st_rt_source_set_eq(ctx, id, NULL)` |
| 출력 EQ | `st_rt_render_set_parametric_eq` (`ST_CAP1_OUTPUT_PARAMETRIC_EQ`) | 렌더 끝, 마스터 게인 앞의 전역 하나. 끄기는 `enabled = 0` |

- 필터 종류는 `ST_PARAMETRIC_EQ_PEAKING` · `LOW_SHELF` · `HIGH_SHELF` · `LOW_PASS` · `HIGH_PASS` · `NOTCH` 6종입니다.
  저역·고역 컷(HIGH_PASS / LOW_PASS)은 12 dB/oct 고정입니다.
- 범위: 주파수 20 ~ 20,000 Hz, 게인 ±24 dB(PEAKING·셸프만), Q 0.1 ~ 30(셸프는 3까지), 프리앰프 −48 ~ +12 dB,
  밴드 최대 16개.
- 값이 바뀌면 엔진이 20 ms 크로스페이드로 넘어갑니다. 끈 상태에서는 샘플을 건드리지 않습니다.
- 소스 EQ는 오프라인 DLL에도 있습니다(`st_off_source_set_parametric_eq`). 출력 EQ는 실시간 전용입니다.

### 등라우드니스 보정

2.21.0부터 실시간 `st_rt_create`가 등라우드니스 보정(ISO 226:2003, 기준 83 → 재생 70 phon)을 켭니다. 마스터 게인
0 dB에서 저역 셸프 약 +7.2 dB(120 Hz), 고역 셸프 약 +1.8 dB이고, 기본적으로 마스터 게인을 따라 보정량이 바뀝니다.
끄면 출력은 2.20과 비트 동일합니다. 오프라인 DLL에는 없습니다.

이 단은 재생 장치 쪽 기능이라 리미터와 같이 호스트 믹스가 음색·레벨을 소유하는 통합에서는 끄는 것을 권장합니다.
UE·Unity·FMOD·Wwise·soundtrace.js 래퍼는 모두 컨텍스트 생성 직후 끕니다(SDK 릴리스 2.22.0-jhj.5).

### 호스트 pull 렌더

![호스트 pull 렌더](/img/core/host-pull-render.png)

| `renderOutputMode` | 엔진 스레드 | 설명 |
|---|---|---|
| `DEVICE`(0) | 렌더 1 + 장치 1 | 엔진이 WASAPI 등 출력 장치를 직접 엽니다 |
| `HOST_PULL`(1) | 없음 | 호스트 오디오 콜백이 `st_rt_render_process`로 블록을 렌더합니다 |
| `HOST_PULL_BUFFERED`(2) | 렌더 1 | 엔진 렌더 스레드가 링을 채우고 콜백은 복사만 합니다(≈3 블록 지연) |

UE·FMOD·Wwise·Unity 통합은 기본 `BUFFERED`입니다. `hostSampleRate`를 지정하면 입력 스트림과
출력 모두 엔진이 윈도 sinc 리샘플러로 변환하므로 호스트 쪽 리샘플이 필요 없습니다.
동시 호스트 스트림 슬롯은 **64개**입니다.

### 스케줄러와 스레드

- `scheduler = PIPELINED`(기본): Direct / Reflection-Diffraction / Reverb 레인이 독립 케이던스로
  돕니다. 기본 주기는 direct 10 ms · refl 0 ms(즉시) · reverb 4 ms이며
  `st_rt_set_lane_update_interval`로 런타임에 바꿉니다. 반사 레인 주기를 올리는 것이
  CPU를 가장 많이 되사는 노브입니다.
- `maxComputeThreads = 0`은 auto(= min(퍼포먼스 코어, 6))이고, 종류별 우선순위·코어 선호는
  `st_rt_set_thread_attributes`(FMOD `Thread_SetAttributes`와 같은 자리)로 **create 전에** 지정합니다.
- `st_rt_get_thread_inventory`가 실제로 떠 있는 스레드 수를 종류별로 돌려줍니다.

### 음원 메모리 예산

SDK 릴리스 2.18.2부터 실시간 컨텍스트는 동시에 살아 있는 음원 수와 음원 메모리에 상한을 둡니다.
ABI 6 additive이고 `st_rt_get_capability_word(1)`의 `ST_CAP1_MEMORY_BUDGET`으로 확인합니다. 음원 하나의
메모리는 고정 비용(전파·IR 사본·수송·스트림 링)과 지연 링, 경로 레인으로 이루어집니다.

- **동적 지연 링** — 음원별 지연 링은 그 음원의 경로가 요구하는 최대 지연 × 1.25 + 50 ms(125 ms 단위
  올림, 바닥 0.25 s)로 잡힙니다. 더 필요해지면 컨트롤 스레드가 큰 링을 준비하고 오디오 스레드가 복사·할당
  없이 바꿔 낍니다. `st_rt_render_set_max_delay_seconds`는 이제 모든 음원에 같은 길이를 잡는 값이 아니라
  **천장**입니다. 박스룸 측정에서 60음원 기준 음원당 메모리는 6.89 → 2.70 MiB입니다.
- **플랫폼 기본값** — `st_rt_create`가 빌드 타깃에 따라 겁니다.

| 플랫폼 | 최대 음원 수 | 음원 메모리 상한 | 지연 링 천장 |
|---|---:|---:|---:|
| 데스크톱 (Windows · macOS · Linux) | 128 | 무제한 | 2.0 s |
| 모바일 (Android · iOS) | 48 | 96 MiB | 1.0 s |
| 웹 (Emscripten) | 32 | 64 MiB | 0.5 s |

- **상한을 넘으면** `st_rt_source_create`가 실패 핸들(`v < 0`)을 돌려주고 마지막 상태는
  `ST_STATUS_BUDGET_EXCEEDED`(11)입니다. 이것이 기본 정책 `ST_MEMORY_REJECT_NEW`입니다.
  `ST_MEMORY_EVICT_FARTHEST`로 바꾸면 리스너에서 가장 먼 음원을 `st_rt_source_destroy`와 같은 경로로 내보내고
  새 음원을 받습니다(내보낸 id는 `STMemoryStats.lastEvictedSource`). UE·Unity·FMOD·Wwise 래퍼는 거절된 음원을 dry로 재생합니다.
- **설정** — 생성 시에는 `STRT_CreateOptions.maxSources`(0 = 플랫폼 기본), 생성 뒤에는
  `st_rt_set_memory_budget`으로 바꿉니다. `STMemoryBudget`에서 0인 필드는 기본값을 유지합니다. 상한을 줄여도
  이미 있는 음원은 남고 새 생성부터 적용됩니다. `st_rt_get_memory_stats`는 음원 수, 추적·추정 바이트,
  거절·퇴거 횟수를 돌려줍니다.
- **지연 링 풀** — 회수된 지연 링을 재사용하려고 보관하는 풀은 플랫폼별 총량 상한(데스크톱 16 · 모바일 8 · 웹 4 MiB,
  넘치면 큰 링부터 해제)을 두고, 10 s 동안 쓰이지 않은 링은 해제합니다. SDK 릴리스 2.18.2-jhj.7부터
  `STMemoryStats.trackedBytes`(따라서 `estimatedBytes`)에 풀이 보관한 링이 포함되며, 예산 판정은 넘치면 풀을 먼저
  비운 뒤 다시 재므로 풀 때문에 새 음원이 거절·퇴거되지는 않습니다(구조체 레이아웃은 그대로).

```c
typedef struct STMemoryBudget {
    uint32_t structSize, apiVersion;
    uint32_t maxSources;            /* 0 = 플랫폼 기본 */
    int32_t  rejectPolicy;          /* ST_MEMORY_REJECT_NEW(0, 기본) / ST_MEMORY_EVICT_FARTHEST(1) */
    uint64_t sourceBudgetBytes;     /* 0 = 무제한(관측만) */
    uint64_t fixedPerSourceBytes;   /* 0 = 엔진 기본(2.5 MiB). 추정에만 쓴다 */
    float    ringFloorSeconds;      /* 0 = 0.25 */
    float    ringGrowthHeadroom;    /* 0 = 1.25 */
    int32_t  allowShrink;           /* 0 = 축소 없음(세션 중 최대치 유지) */
    uint32_t reserved[5];
} STMemoryBudget;
```

:::caution 행동 변경
- 데스크톱 기본 최대 음원 수가 **128**입니다(종전 무제한). 더 필요한 호스트는 `st_rt_set_memory_budget`으로
  올립니다.
- 모바일·웹은 지연 링 천장 기본이 1.0 s / 0.5 s라 343 m / 171 m를 넘는 초기 경로는 렌더되지 않습니다. 종전
  값이 필요하면 `st_rt_render_set_max_delay_seconds`로 지정합니다.
- 오프라인 DLL(`st_off_*`)은 예산 대상이 아닙니다(무제한).
- 모바일·웹은 Hybrid 초기 반사가 전제입니다. Objects 모드는 음원당 30 MB가 넘습니다.
:::

:::caution SDK 2.18.2-jhj 헤더에서 옮길 때
- `STRT_CreateOptions.maxSources`는 SDK 릴리스 2.22.0-jhj부터 **오프셋 44**입니다. 엔진 2.20이 오프셋 40을
  `startIdle`로 쓰기 때문입니다(구조체 크기 48은 그대로). 2.18.2-jhj 헤더로 빌드한 호스트는 다시 빌드하세요 —
  옛 자리에 음원 수를 쓰면 `startIdle`이 0/1이 아니어서 `st_rt_create`가 `ST_STATUS_INVALID_ARGUMENT`로 실패합니다.
- `ST_CAP1_MEMORY_BUDGET`은 이제 비트 63입니다(2.18.2-jhj는 비트 6, 엔진 2.19가 그 비트를 `ST_CAP1_SPEAKER_SET`에 씀).
  비트 번호를 직접 쓰지 말고 헤더 상수로 확인하세요.
:::

래퍼별 설정은 [SDK 개요](../sdk/overview.md#음원-수-상한)에 모아 두었습니다.

### Late reverb

FDN16 하나를 현재 리스너가 소유하고, 입력은 음원별 `ReverbSendTap`(source transport의 첫
확산 산란 이벤트)뿐입니다. `st_rt_set_late_coupling_preset`(OFF / SUBTLE 6 dB / DEFAULT 9 dB /
STRONG 12 dB)은 리스너가 음원의 확산장에서 얼마나 떨어져 있는지로 주입을 감쇠해, 모퉁이
너머에서 리버브가 줄지 않는 문제를 다룹니다.

## 오프라인 엔진

`SimpleSTOffline`은 장치·워커 없이 호출 스레드에서 전파를 한 번 실행해 canonical IR 캐시를
만들고(`st_off_ir_compute`), 같은 세대에서 다음을 파생합니다.

| 출력 | 함수 |
|---|---|
| Raw 에너지 탭 (early + reverb send + transport 장부) | `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |
| 압력 IR (광대역 모노 / 9밴드 분리) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| 바이노럴 IR (패닝 / MIT KEMAR / SADIE D2) | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| 오디션 쌍(dry WAV + 렌더) | `st_off_ir_render_audition_pair` |

오프라인 컨텍스트는 리스너를 여러 개 만들 수 있고(`st_off_listener_create`), 진행률·취소
(`st_off_ir_get_progress`, `st_off_ir_request_cancel`)만 lock-free입니다. EDC·T60·C50 같은 에너지
분석은 압력 IR의 `h(t)²`로 계산합니다.

## 진단

| 함수 | 용도 |
|---|---|
| `st_rt_get_timing` | 레인별 전파·IR 빌드·렌더 블록 시간(ms) |
| `st_rt_ir_get_stats` | 한 번의 IR 발행 스냅샷(탭 수·bed 셀·prepare CPU/wall) |
| `st_rt_render_get_process_stats` | 512프레임 블록 단계별 µs |
| `st_rt_scene_get_stats` | 라이브 메시·오브젝트·음원·삼각형 수 |
| `st_rt_debug_set_collect_visual_paths` + `st_rt_debug_copy_visual_paths` | 시각화용 경로 점열(guide ray / direct / reflection / diffraction / transport) |
| `st_rt_debug_copy_mesh_accel_nodes` / `_scene_accel_nodes` | BLAS/TLAS 노드 박스 |
| `st_rt_scene_raycast` | 전파가 쓰는 가속구조로 최근접 히트 질의 |

![SimpleST 데모 앱](/img/core/demo-app.png)

## 참고

- [STCoreV2에서 SimpleST로](./stcorev2.md) — 구 `exa*` API와의 대응표
- [SDK 개요](../sdk/overview.md)
- [FMOD 플러그인](../sdk/fmod.md) · [Wwise 플러그인](../sdk/wwise.md)
