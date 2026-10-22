---
sidebar_position: 2
title: STCoreV2에서 SimpleST로
sidebar_label: STCoreV2 → SimpleST
description: 이전 세대 엔진 STCoreV2(exasoundC.h)에서 현행 SimpleST ABI 6으로 옮길 때 바뀐 개념과 API 대응표.
---

# STCoreV2에서 SimpleST로

**STCoreV2**(`exaSound`, `exasoundC.h`의 `exa*` API)는 Sound Tracing의 이전 세대 코어였습니다.
2026년 10월부로 모든 SDK·플러그인·데모가 [SimpleST](./simplest.md)로 교체되었고,
STCoreV2 구현은 더 이상 배포되지 않습니다. 이 페이지는 STCoreV2 통합을 가진 팀이 옮길 때
확인할 차이점을 정리합니다.

:::info 이 URL에 대해
이 페이지의 주소(`/core/stcorev2`)는 과거 STCoreV2 레퍼런스가 있던 자리입니다. 레퍼런스 본문은
[SimpleST](./simplest.md)로 대체되었습니다.
:::

## 바뀐 개념

| 항목 | STCoreV2 | SimpleST |
|---|---|---|
| 헤더 / 접두 | `exasoundC.h`, `exa*` 단일 DLL | `STRealtime.h`(`st_rt_*`) + `STOffline.h`(`st_off_*`) 2-DLL, 공통 `STTypes.h` |
| 컨텍스트 | 전역 `exaInit()` / `exaReset()` | 컨텍스트 객체 `st_rt_create` / `st_rt_destroy`. 프로세스에 여러 개 가능 |
| 엔티티 id | 전부 `int`, **0 = 무효** | 타입 핸들 `STMeshId` 등, **`v < 0` = 무효**, 0은 유효 |
| 씬 | `exaNewScene` + `exaSceneAdd*` | 컨텍스트가 곧 씬. 리스너는 실시간 컨텍스트당 1개(암묵) |
| 재질 | 8밴드(`67.5…8k Hz`), 삼각형에 흡수/투과 직접 저장, `reflection = 1 − (A+T)` 유도, `Surface` / `Solid Distance` 투과 모델 | **9밴드(63…16k Hz)** R/A/T/scattering 명시, `|R+A+T−1| ≤ 0.001` 엄격 검증, 자동 유도 없음, 불변 재질(교체 시 새 재질 핸들) |
| 거리 감쇠 | 다항식 `1/(c + l·d + q·d²)` 음원별·경로별 | 물리 `1/r` + 참조/최소 거리(`st_rt_set_physical_distance_attenuation`), ISO 9613-1 공기 흡수 |
| 음원 오디오 | 렌더러가 음원별로 출력(`exaRenderSound`, `exaCreateRenderer`) | 음원은 **모노 입력 스트림**, 리스너 렌더러가 전 음원을 한 번에 스테레오/N채널 믹스(`st_rt_render_process`) |
| 렌더 출력 | 호출자가 음원별 버퍼 수집 | `DEVICE` / `HOST_PULL` / `HOST_PULL_BUFFERED` 세 모드, 호스트 샘플레이트 변환 내장 |
| 초기 반사 | 경로별 오브젝트 | Objects / **Hybrid(exact 예산 + HOA3 bed)** |
| HRTF | KU100 parametric / convolution / SADIE H12 테이블 로드, Band8 | 패닝 / 내장 **MIT KEMAR** / **SADIE II D2**(파일 1개). KU100·H12·Band8·parametric은 없음 |
| GPU | WebGPU(Dawn) propagation provider | **없음**(CPU 파이프라인 스케줄러). `enableGpu` 류는 오류 반환 |
| 가속구조 | HKDTree / LBVH / LBVH_SIMD4·8·16 / NWAY, 메시별 빌드 옵션 | 컨텍스트 전역 `st_rt_scene_set_accel`(TinyBVH 기본), 메시별 옵션 없음 |
| 스킨드 메시 | `exaMeshUpdateVertices` → `exaMeshRefit` 2-call refit | **refit 없음** — 새 포즈는 새 메시 생성(`st_rt_mesh_create`)로 교체 |
| 오브젝트 갱신 | `STATIC / REFIT / REBUILD / DYNAMIC` 4종 | `isDynamic` 플래그(정적 = 정적 TLAS, 동적 = 변환만 갱신) |
| path cache / seed | `pathCacheSize`, `seedValue` 옵션 | `seedValue`만(`STRT_CreateOptions`), path cache 옵션 없음 |
| 전파 호출 | `exaTickScene` 동기 | `st_rt_propagate` — PIPELINED는 워커를 깨우고 즉시 반환, SYNCHRONOUS는 호출 스레드에서 실행 |
| 통계 | `exaGetStatistics`, `exaPropagatorGetProfile`, `exaGetMemoryTraceSnapshot` | `st_rt_get_timing`, `st_rt_ir_get_stats`, `st_rt_render_get_process_stats`, `st_rt_scene_get_stats` |
| 시각화 | `exaGetValidPaths`(`ExaPathData`) | `st_rt_debug_set_collect_visual_paths` + `acquire_snapshot` + `copy_visual_paths` |
| 좌표 | 우수, `+Y` up, `-Z` forward, `exaListenerSetCoordinateBasis` | **왼손, `+Y` up, `+Z` forward(Unity와 동일)**, basis API 없음 — 래퍼가 변환 |
| 단위 | `ExaSTOption.sceneRatio` | `STRT_CreateOptions.sceneRatio`(생성 시 1회) |
| 최대 깊이 | `EXA_MAX_DEPTH = 16` | 반사 16, 투과 64 |

## 함수 대응표

| STCoreV2 | SimpleST (실시간) |
|---|---|
| `exaInit()` / `exaReset()` | `st_rt_create(&opt, &ctx)` / `st_rt_destroy(ctx)` |
| `exaGetVersion()` | `st_rt_get_version_string()`, `st_rt_get_api_version()`, `st_rt_get_capabilities()` |
| `exaGetLastError()` | `st_rt_get_last_status(ctx)`, `st_rt_get_last_error(ctx, buf, cap)` |
| `exaNewScene()` / `exaTickScene()` | (컨텍스트) / `st_rt_propagate(ctx)` |
| `exaAddSoundMaterial()` / `exaSetSoundMaterial()` | `st_rt_material_create(ctx, &mat)` / 재질은 불변 — 새 재질 생성 후 `st_rt_mesh_set_material` |
| 기본 재질 테이블 로드(SDK 측) | `st_rt_material_load_defaults(ctx)` |
| `exaNewMesh()` + `exaMeshSetData()` + `exaMeshSetMaterial()` | `st_rt_mesh_create(ctx, &mesh, material, triMaterialIndices)` |
| `exaMeshUpdateVertices()` + `exaMeshRefit()` | 없음 — 새 메시 생성 후 오브젝트 교체 |
| `exaNewObject()` + `exaObjectSetMesh()` + `exaSceneAddObject()` | `st_rt_object_create(ctx, mesh, &transform, isDynamic)` 또는 `_q`(위치·쿼터니언·스케일) |
| `exaObjectSetPosition/Rotation/Scale()` | `st_rt_object_set_transform[_q]()` |
| `exaObjectSetUpdateType()` | 생성 시 `isDynamic`; 정적 변경은 `st_rt_build`, 동적은 `st_rt_build_dynamic` |
| `exaNewSoundSource()` + `exaSceneAddSource()` | `st_rt_source_create(ctx, &desc)` |
| `exaSoundSourceSetPosition/Direction/Velocity()` | `st_rt_source_set_position/direction/velocity()` |
| `exaSoundSourceSetIntensity()` | `STSourceDesc.intensity`(압력 배율) + `st_rt_source_set_energy()`(에너지 배율) |
| `exaSoundSourceSetRayCount/Depth()` | `st_rt_source_set_ray_count()`, `st_rt_source_set_depth()` |
| `exaSoundSourceSetReverbSendDb()` | `st_rt_source_set_path_volume(ctx, src, ST_SOURCE_VOLUME_REVERB, linear)` |
| `exaSoundSourceSetPathEnable()` | `st_rt_source_set_path_enabled(ctx, src, pathType, enabled)` |
| 음원별 지향성 테이블 | `st_rt_source_set_directivity()` + `st_rt_source_set_orientation_q()`, 콘 공식은 `st_rt_source_set_axis_attenuation()` |
| `exaNewListener()` + `exaSceneAddListener()` | 암묵 리스너 1개(`st_rt_listener_*`) |
| `exaListenerSetPosition/Orientation/Velocity()` | `st_rt_listener_set_position/rotation(yaw,pitch)/velocity()` |
| `exaListenerSetRayCount/RayDepth()` | `st_rt_listener_set_ray_count()`, `st_rt_set_max_depth()` |
| `exaListenerSetOption()` (`sceneRatio` 등) | `STRT_CreateOptions.sceneRatio`, `st_rt_set_*` 정책 함수들 |
| `exaListenerSetCoordinateBasis()` | 없음 — 호스트 래퍼에서 변환 |
| `exaListenerSetHrtfMode()` / `exaListenerLoadHrtf()` | `st_rt_render_set_spatializer(ctx, 0/1/2)` |
| `exaCreateRenderer()` / `exaRenderSound()` / `exaRemoveRenderer()` | `st_rt_render_start(ctx, useHrtf)` / `st_rt_render_process(ctx, out, frames)` / `st_rt_render_stop(ctx)` |
| 음원 오디오 입력(호스트 믹싱) | `st_rt_source_attach_stream()` + `st_rt_source_write_stream()`, 또는 `st_rt_source_set_audio_file()` |
| `exaGetValidPathCount/Paths()` | `st_rt_debug_set_collect_visual_paths(mask)` → `st_rt_debug_acquire_snapshot()` → `st_rt_debug_copy_visual_paths()` |
| `exaGetSortedIRDatas()` | 실시간 ABI에는 없음 — 오프라인 `st_off_ir_compute()` + `st_off_ir_copy_raw_early_taps()` / `render_pressure()` |
| `exaGetStatistics()` / `exaPropagatorGetProfile()` | `st_rt_get_timing()`, `st_rt_ir_get_stats()`, `st_rt_render_get_process_stats()`, `st_rt_scene_get_stats()` |
| `exaGetMemoryTraceSnapshot()` | 없음 |
| `exaPropagatorInitGpu()` / `exaPropagatorSetGpuProvider()` | 없음(CPU 전용) |
| `exaPropagatorGetGuidePlanes/MirrorPositions()` | 없음(guide ray는 visual path 수집 mask로 관찰) |

## 옮길 때 체크리스트

1. **재질을 9밴드로 다시 입력**합니다. 8밴드를 복제해 채우지 말고 16 kHz 값을 측정·추정해 넣고,
   밴드마다 R+A+T=1을 맞춥니다. `Solid Distance` 투과 거리는 SimpleST에 없으므로 표면 투과
   계수(T)로 환산합니다.
2. **음원 오디오를 모노 스트림으로** 밉니다. 음원별 출력 노드·이펙트는 리스너 믹스 뒤로 옮깁니다.
3. `exaMeshRefit` 경로가 있었다면 스킨드 메시를 **주기적으로 새 메시로 교체**하는 구조로 바꿉니다
   (UE 플러그인의 `SkinnedPoseRefreshSeconds`가 이 방식입니다).
4. 좌표계를 확인합니다. `-Z` forward 호스트는 Z 부호를 뒤집습니다(soundtrace.js는
   `coordinateBasis`가 처리합니다).
5. `exaRenderSound`를 호스트 오디오 콜백의 `st_rt_render_process`로 바꾸고,
   `renderOutputMode`와 `hostSampleRate`를 생성 옵션에 지정합니다.
6. `st_rt_render_start` **뒤에** `STRenderOptions.reserved0 = 1`(Hybrid)을 적용합니다(2.18.0부터 엔진 기본이
   Hybrid지만 명시를 권장합니다). 출력 리미터를 호스트가 맡으면 같은 자리에서 `useLimiter = 0`으로 끕니다.
7. 캐퍼빌리티 비트(`ST_CAP_*`)로 기능 존재를 확인하고, `structSize`/`apiVersion`을 채워 호출합니다.

## 참고

- [SimpleST](./simplest.md)
- 각 SDK의 변경 사항: [Web](../sdk/web.md) · [Unity](../sdk/unity.md) · [Unreal Engine](../sdk/ue.md)
