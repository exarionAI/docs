---
title: Facade API
description: ST와 MT에서 동일하게 사용하는 soundtrace.js 권장 API — 생성 옵션, 장면·음원·메시 API, 수명주기, EQ.
---

# Facade API

Facade는 일반 웹 애플리케이션의 권장 진입점입니다. `SoundTrace`가 장면 수명주기를
관리하고 `Listener`, `Source`, `Mesh`가 앱의 3D 상태를 표현합니다. 모든 공개 메서드는
`thread: 'st'`와 `'mt'`에서 동일하게 동작하며, 진단은 전부 비동기입니다.

[Web SDK 개요](../web.md) · [Native API](./native.md)

## 기본 흐름

```ts
const sound = await SoundTrace.create(audioContext, options);
sound.output.connect(audioContext.destination);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

await source.play(inputNode);      // 입력 캡처. 출력은 sound.output 하나
await sound.update(0);
```

## `SoundTrace` 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `thread` | `'auto'` | `'st'`(동기 전파) / `'mt'`(파이프라인 전파). 둘 다 전용 Worker + pthread WASM |
| `mode` | 미지정 | `'single_thread'` / `'multi_thread'`. `thread`의 별칭이며 `mode`가 우선 |
| `quality` | `'balanced'` | `'fast'`, `'balanced'`, `'quality'` |
| `earlyReflectionMode` | `'hybrid'` | 실시간은 항상 Hybrid. 다른 값은 거부 |
| `coordinateBasis` | 엔진 좌표계(`+Z` forward) | 렌더러 좌표계를 SDK 좌표계로 변환 |
| `coreBaseUrl` | 패키지 내부 | `SimpleSTRealtime.mjs/.wasm`, `SimpleSTOffline.mjs`가 있는 URL |
| `assetBaseUrl` | 패키지 내부 | 재질 JSON과 HRTF asset URL |
| `propagationThreadCount` | 동기 1 / 파이프라인 3 | 계산 예산 1 ~ 5 (음수 = 5). 파이프라인은 최소 3 |
| `throughput` | 미지정 | `'low'` / `'medium'` / `'max'` — MT 워커 예산 단축 표기 |
| `sceneRatio` | `1.0` | 장면 길이 단위당 미터(cm = 0.01). 지오메트리 사전 스케일과 **혼용 금지** |
| `maxSources` | `0` | 동시에 살아 있는 엔진 음원 수 상한(0 ~ 512 정수). `0` = wasm 플랫폼 기본(32음원 · 음원 메모리 64 MiB · 지연 링 천장 0.5 s — 힙이 256 MiB 고정이라 보수적). 넘는 음원 생성은 엔진이 status 11(`BUDGET_EXCEEDED`)로 거절하고 기존 음원은 계속 렌더됩니다 |
| `autoLoadMaterials` | `true` | 기본 재질 테이블을 로드해 이름 매핑 활성화 |
| `debug` | `false` | 초기화 진단 로그 한 줄 출력 |

```ts
const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',
  quality: 'balanced',
  coordinateBasis: { right: [-1, 0, 0], up: [0, 1, 0], forward: [0, 0, -1] }, // Three.js
});
```

## 주요 API

### `SoundTrace`

| API | 설명 |
|---|---|
| `SoundTrace.create(ctx, options?)` | 엔진을 생성하고 로드 (생성자 + `load()`) |
| `output` / `audioContext` | 리스너 마스터 출력 노드(스테레오)와 앱이 넘긴 `AudioContext` |
| `listener` | 장면의 단일 청취자 |
| `descriptor` | `{ transport: 'worker', thread: 'st' \| 'mt' }` — 진단용. 분기에 쓰지 않음 |
| `addMesh(options)` / `removeMesh(mesh)` | 음향 geometry 추가/제거 |
| `addSource(options)` | 공간 음원 추가 |
| `setQuality(tier)` | 품질 프리셋 변경(리스너·음원 레이와 깊이) |
| `setAudioOption(options)` | 입력 블록 크기, 출력 채널 override |
| `setOutputEq(eq \| null)` | 전역 출력 파라메트릭 EQ(최대 16밴드). `null`이면 끔. `reset()` 뒤에도 유지 — [EQ](#eq) |
| `loadHrtf(mode, source?)` | `'mit-kemar'` / `'sadie-d2'` (별칭 `'convolution'` / `'steamaudio'`) |
| `loadMaterialAssets()` | 재질 테이블 수동 로드 (`autoLoadMaterials: false`일 때) |
| `update(dt?)` | 장면을 갱신하고 전파 실행. 이번 프레임의 유효 경로 수로 resolve |
| `debugSnapshot(options?)` | 비동기 진단 스냅샷. `.simplest`에 scene/timing/render/IR 통계, `features`·`output`(리미터·종류·지연·마스터 게인·출력 EQ `eq`)·`inputs`(라이브/클립 음원 수) |
| `getStatistics(options?)` | `debugSnapshot` 래퍼. `validPathCount`와 `.simplest` |
| `getIRs()` | 별도 Offline Worker에서 9밴드 early path IR 재계산 |
| `renderMonoImpulseResponse(source, sec)` | Offline Worker에서 44.1 kHz 모노 압력 IR (최대 30 s) |
| `reset()` | 엔진 상태 초기화 (async). Hybrid·재질·품질이 재적용됨 |
| `dispose()` | SDK가 소유한 리소스 해제. 멱등, `using` 호환 |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: camera.quaternion.toArray() })
  .setRenderOptions({ useDoppler: true, useLimiter: false, pathFadeTime: 0.05, maxDelaySeconds: 2 }) // useLimiter 기본 false
  .setOutputMode('hrtf');   // 'hrtf'(바이노럴) | 'speaker'(스테레오 패닝)
```

장면에는 listener가 하나이며 `SoundTrace`가 소유합니다. `orientation`은 카메라의 활성 회전
쿼터니언(XYZW)을 그대로 넘깁니다. 머리 기울임(roll)까지 엔진에 전달됩니다(실시간·오프라인 IR 분석 모두).

`setRenderOptions`가 받는 키:

| 키 | 의미 |
|---|---|
| `earlyReflectionMode` | `'hybrid'`만 허용 |
| `useDoppler` | 가변 지연 Doppler 피치 — 실시간에서는 항상 켜지고 `false`는 무시됩니다 |
| `useLimiter` | 출력 리미터. 기본 `false` — 앱의 Web Audio 마스터 버스가 리미팅을 맡습니다(SDK가 렌더 시작·HRTF/출력 변경·reset마다 끕니다). `true`면 true-peak 리미터(−1 dBTP, 137샘플 지연) |
| `pathFadeTime` | 경로 등장/소멸 크로스페이드(초) |
| `maxDelaySeconds` | 음원별 지연 링의 천장(초). 엔진은 음원마다 경로가 필요한 만큼만 링을 잡습니다(바닥 0.25 s). 웹 플랫폼 기본 천장은 0.5 s |
| `diffuseEnabled` | late reverb 렌더 on/off. 1차 산란(diffuse rain) 렌더도 함께 켜고 끕니다 |

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: { direct: true, reflection: true, diffraction: true, reverberation: true },
});

source.setPose({ position: [1, 1, -2], velocity: [0.5, 0, 0] });
source.setGain(0.8);                          // 압력 게인. 엔진에는 energy = gain² 로 전달
source.setPathEnabled('reverberation', false);
source.setDirection([0, 0, -1]);
```

| API | 설명 |
|---|---|
| `play(input, channels?)` | 입력을 연결한 `AudioWorkletNode`를 반환. **출력은 무음**이고 실제 소리는 `sound.output` |
| `setPose(pose)` / `setGain(g)` | 위치·속도·방향, 게인 |
| `setPathEnabled(path, on)` / `setPathOptions(o)` / `isPathEnabled(path)` | `'direct'`(투과 포함) / `'reflection'` / `'diffraction'` / `'reverberation'` |
| `setDirection(v)` | 음원 forward. roll 없는 최소 회전으로 orientation이 함께 갱신됨 |
| `setDirectivityTable(anglesDeg, attenDbPerBand)` / `setDirectivityEnabled(on)` | 각도별 9밴드 감쇠 테이블을 Sound-Tracing SDK 지향성 테이블로 변환해 적용 |
| `setEq(eq \| null)` | 이 음원의 소스 파라메트릭 EQ(최대 16밴드, 엔진 밴드 분리 앞). `null`이면 제거 — [EQ](#eq) |
| `dispose()` | 음원과 스트림 해제 |

#### 거리 감쇠

모든 경로에 물리 `1/r` 감쇠와 ISO 9613-1 공기 흡수를 적용하며, 참조 거리(1 m)·최소 거리(1 m)는
엔진 정책입니다. 음원별 감쇠 곡선 옵션은 없습니다.

### `Mesh`

```ts
const mesh = sound.addMesh({
  vertices: geometry.attributes.position.array,
  indices: geometry.index.array,
  material: 'concrete',
});

mesh.setPose({
  position: object.position.toArray(),
  orientation: object.quaternion.toArray(),
  scale: object.scale.toArray(),
});
```

`indices`는 메시 전체가 하나의 재질일 때 씁니다. 면별 재질이 필요하면
`{ a, b, c, materialIndex }` 형태의 `triangles`를 전달하세요.

| API | 설명 |
|---|---|
| `setMaterial(material)` | 메시 전체 재질 교체. Sound-Tracing SDK 재질은 불변이라 내부적으로 새 재질/메시 핸들로 재바인딩 |
| `setMaterialRange(triStart, triCount, material)` | triangle 범위별 재질 교체 |
| `setUpdateType(type)` / `getUpdateType()` | `'static'`(정적 TLAS) / `'dynamic'`(변환만 갱신). `'refit'`·`'rebuild'`는 호환용이며 메시를 다시 만듭니다 |
| `setPose(pose)` | position, orientation, scale 갱신 |
| `dispose()` | 메시와 오브젝트 해제 |

BVH는 Sound-Tracing SDK가 소유합니다(TinyBVH 기본). 메시별 빌드 옵션은 없습니다.

## 프레임 업데이트

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => { updateInFlight = undefined; });
  }
}
```

pose 변경은 빠르게 기록할 수 있지만, 전파 update는 동시에 하나만 실행하는 것이 안전합니다.

## 수명주기

`SoundTrace`, `Source`, `Mesh`는 `dispose()`를 지원합니다. `SoundTrace.dispose()`는 listener와
Worker를 포함해 SDK가 소유한 리소스를 정리하며 여러 번 호출해도 안전합니다.

## EQ

Sound-Tracing SDK의 파라메트릭 EQ를 두 자리에서 겁니다.

- **소스 EQ** — 음원 신호 자체에 엔진의 밴드 분리 앞에서 겁니다. 그 음원의 직접음·반사·회절·잔향이 모두 같은 톤이 됩니다.
- **출력 EQ** — Sound-Tracing SDK 믹스 전체에 렌더 끝(마스터 게인 앞)에서 겁니다.

필터 종류는 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 6종(컷은 12 dB/oct 고정),
범위는 주파수 20 ~ 20,000 Hz, 게인 ±24 dB(Peaking·셸프만), Q 0.1 ~ 30(셸프는 3까지), 프리앰프 −48 ~ +12 dB입니다.
기본은 꺼짐이고, 꺼져 있으면 엔진을 호출하지 않으므로 출력은 EQ가 없을 때와 같습니다. 바뀐 값만 보내며 엔진이
20 ms 크로스페이드로 넘어갑니다.

| API | 거는 곳 |
|---|---|
| `Source.setEq(eq \| null)` | 이 음원의 소스 EQ(최대 16밴드). `null`이면 제거 |
| `SoundTrace.setOutputEq(eq \| null)` | 전역 출력 EQ 하나. `null`이면 끔. `reset()` 뒤에도 유지 |

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });
```

- `eq = { enabled = true, preampDb = 0, bands = [] }`, `band = { type = 'peaking', enabled = true, frequencyHz = 1000, gainDb = 0, q = 0.7071 }`
- `type`은 Web Audio `BiquadFilterType` 이름 `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'`입니다.
- 범위 밖 값은 `RangeError`로 거절하고 명령을 보내지 않습니다. `{ enabled: false }`는 밴드를 보관한 채 통과시킵니다.
- 적용된 출력 EQ는 `debugSnapshot().simplest.output.eq`에 있습니다.

## 관련 문서

- [Web SDK 개요](../web.md)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
