---
title: Native API
description: soundtrace.js의 저수준 진입점 `@exarionai/soundtrace.js/native` — WASM 모듈 로더, 힙 헬퍼, Realtime/Offline 어댑터, EQ.
---

# Native API

`@exarionai/soundtrace.js/native`는 facade가 내부에서 쓰는 Sound-Tracing SDK 모듈 로더와 어댑터를
공개합니다. 일반 앱은 [Facade API](./facade.md)를 사용하세요. 이 표면은 Sound-Tracing SDK C ABI
계약(패키지에 동봉된 `core/Include/SimpleST/ABI/*.h`)을 그대로 따르며, 버전 간 호환성 보장은
facade보다 약합니다.

```ts
import {
  SimpleSTRealtime,
  loadRealtimeModule, loadOfflineModule, analyzeScene,
  Heap, packMaterial, validateMaterial,
  ST_ABI_VERSION, ST_FREQUENCY_BANDS, ST_SAMPLE_RATE, layout,
  type SimpleSTModule, type SimpleSTMaterial, type SimpleSTDiagnostics, type SimpleSTFeatures, type SimpleSTSceneSnapshot,
} from '@exarionai/soundtrace.js/native';
```

## 지원 범위

- 모든 Sound-Tracing SDK `[control]` 호출은 **한 Worker**에서만 합니다. facade는 전용 control Worker를
  두고 그곳에서만 엔진을 만집니다.
- 메인 스레드에서 `st_rt_propagate` 같은 블로킹 진입점을 부르면 `Atomics.wait`가 막혀 실패합니다.

## 구성 요소

| 이름 | 역할 |
|---|---|
| `loadRealtimeModule(baseUrl)` | `SimpleSTRealtime.mjs` + `.wasm`(pthreads)을 로드해 `SimpleSTModule`을 돌려줍니다 |
| `loadOfflineModule(baseUrl)` | `SimpleSTOffline.mjs`(싱글스레드)를 로드합니다. IR 분석 전용 |
| `Heap` | WASM 힙에 POD를 쓰고 읽는 헬퍼. `structSize`/`apiVersion` 스탬프가 붙은 구조체 할당(`stamped`) 포함 |
| `layout` | `STRT_CreateOptions`, `STMaterial`, `STRenderOptions`, `STTiming`, `STSceneStats`, `STProcessStats`, `STIrStats` 등의 오프셋/크기 |
| `packMaterial` / `validateMaterial` | 9밴드 R/A/T/scattering을 `STMaterial`로 패킹하고 `R+A+T=1` 검증 |
| `SimpleSTRealtime` | 리스너 하나와 공유 렌더러를 소유하는 어댑터. facade 명령을 `st_rt_*` 호출로 바꿉니다. `features`는 엔진이 능력 비트와 export를 모두 갖춘 선택 기능(클립·trigger·재생 제어·true-peak 리미터·마스터 게인)입니다 |
| `analyzeScene(module, snapshot, …)` | Offline 컨텍스트에 씬 스냅샷을 복제해 Raw IR / 압력 IR을 계산 |
| `ST_ABI_VERSION` / `ST_FREQUENCY_BANDS` / `ST_SAMPLE_RATE` | `6` / `9` / `44100` |

## `SimpleSTRealtime`

facade의 control Worker가 사용하는 어댑터입니다. 직접 쓸 때는 Worker 안에서 다음 순서를
지킵니다.

```ts
const M = await loadRealtimeModule(coreBaseUrl);
const rt = new SimpleSTRealtime(M, startupOptions);   // st_rt_create, 등라우드니스 보정 끔, 재질 테이블 등록, Hybrid 적용

rt.command({ type: 'createMesh', handle, state });     // st_rt_mesh_create + st_rt_object_create_q
rt.command({ type: 'createSource', handle, state });   // st_rt_source_create + 품질 프리셋 적용
rt.attachStream(handle);                               // st_rt_source_attach_stream (모노)
rt.sourcePose(handle, cache); rt.listenerPose(cache); rt.meshPose(handle, pose);

const validPaths = rt.frame();                         // st_rt_build[_dynamic] + st_rt_propagate
rt.writeStream(handle, monoSamples);                   // [audio] st_rt_source_write_stream
const stereo = rt.render(frames);                      // [audio] st_rt_render_process

const diag = rt.diagnostics();                         // SimpleSTDiagnostics
rt.reset(); rt.dispose();
```

- `setQuality(tier)`는 리스너 guide ray, 음원 transport ray, 반사 깊이를 한 번에 설정합니다
  (`fast` 8×8/4, `balanced` 16×16/6, `quality` 24×24/8).
- 음원 게인은 압력 값이며 엔진에는 `st_rt_source_set_energy(gain²)`로 들어갑니다.
- `'direct'` 경로 게이트는 Direct와 Transmission을 함께 켜고 끕니다.
- 렌더 옵션 변경(`useDoppler`, `useLimiter`, `diffuseEnabled`)은 `STRenderOptions`의 해당 필드를
  덮어쓰되 `reserved0 = 1`(Hybrid)을 항상 유지합니다. Hybrid가 풀리면 `diagnostics()`가 예외를 던집니다.
- 렌더 시작마다 출력단을 명시합니다: 리미터 끔(`useLimiter: true`면 true-peak), 마스터 게인 0 dB.
- 컨텍스트를 만든 직후 엔진이 켜는 등라우드니스 보정을 끕니다(`features.loudnessCompensation`일 때).
- 리스너 방향은 forward/up에서 만든 쿼터니언으로 `st_rt_listener_set_orientation_q`에 넘겨 roll을 유지합니다.

## 진단 스냅샷

```ts
interface SimpleSTDiagnostics {
  engine: 'Sound-Tracing SDK'; abiVersion: number; version: string;
  scheduler: 'synchronous' | 'pipelined'; earlyReflectionMode: 'hybrid'; spatializer: number;
  scene:  { meshes; objects; sources; triangles };
  timing: { propagationMs; directMs; reflectionDiffractionMs; reverbMs; irMs; renderMs };
  render: { blockSequence; activeSources; exactTaps; sendTaps; totalUs } | null;
  ir:     { publishSequence; exactTaps; bedCells; sendTaps } | null;
  audioTransport?: { outputUnderrunFrames; inputDroppedFrames; streams: Array<{ handle; queuedFrames; capacityFrames; droppedFrames; underrunFrames }> };
  features?: SimpleSTFeatures;
  output?: { limiter; limiterType; limiterLatencyFrames; masterGainDb; diffuseRain; eq? };  // 적용된 출력단(eq = 출력 EQ)
  inputs?: { live; clip };                                                       // 라이브/클립 음원 수
}
```

facade의 `debugSnapshot().simplest`와 `getStatistics().simplest`가 같은 객체를 돌려줍니다.

## 오디오 계약

- 엔진 내부 레이트는 44.1 kHz이고, `STRT_CreateOptions.hostSampleRate`에 `AudioContext.sampleRate`를
  넣어 입력·출력 모두 엔진이 변환합니다.
- 음원 입력은 모노 float PCM(`st_rt_source_write_stream`), 출력은 인터리브 스테레오
  (`st_rt_render_process`)입니다. 출력 모드는 `HOST_PULL_BUFFERED`이며 AudioWorklet이 공유
  링에서 복사합니다.
- 동시 스트림 슬롯은 64개입니다. 초과 음원은 생성이 실패합니다.

## EQ

Sound-Tracing SDK의 파라메트릭 EQ를 두 자리에서 겁니다.

- **소스 EQ** — 음원 신호 자체에 엔진의 밴드 분리 앞에서 겁니다. 그 음원의 직접음·반사·회절·잔향이 모두 같은 톤이 됩니다.
- **출력 EQ** — Sound-Tracing SDK 믹스 전체에 렌더 끝(마스터 게인 앞)에서 겁니다.

필터 종류는 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6종(컷은 12 dB/oct 고정),
범위는 주파수 20 ~ 20,000 Hz, 게인 ±24 dB(Peaking·셸프만), Q 0.1 ~ 30(셸프는 3까지), 프리앰프 −48 ~ +12 dB입니다.
기본은 꺼짐이고, 꺼져 있으면 엔진을 호출하지 않으므로 출력은 EQ가 없을 때와 같습니다. 바뀐 값만 보내며 엔진이
20 ms 크로스페이드로 넘어갑니다.

| 자리 | 엔진 호출 | 지원 확인 |
|---|---|---|
| 소스 EQ | `st_rt_source_set_parametric_eq` (지우기 `st_rt_source_set_eq(ctx, id, NULL)`) | `features.sourceParametricEq` |
| 출력 EQ | `st_rt_render_set_parametric_eq` (끄기 `enabled = 0`) | `features.outputParametricEq` |

`SimpleSTRealtime` 어댑터는 facade의 `source.setEq` / `sound.setOutputEq` 명령을 이 두 호출로 바꾸며, 두 feature가 없는
코어에서는 거부합니다. 적용된 출력 EQ는 `diagnostics().output.eq`에 있습니다.

## 관련 문서

- [Web SDK 개요](../web.md)
- [Facade API](./facade.md)
