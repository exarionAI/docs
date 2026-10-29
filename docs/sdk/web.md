---
title: Web
description: soundtrace.js 1.1.0 — SimpleST ABI 6 WebAssembly SDK의 설치, 배포 요건, HRTF, 품질 프리셋, 재질, EQ, 문제 해결.
---

# Web SDK

**soundtrace.js**는 [SimpleST](../core/simplest.md)를 브라우저에서 사용하는 TypeScript/WebAssembly
SDK입니다. Three.js 같은 렌더링 씬의 메시·재질·음원·리스너를 Sound Tracing 장면으로 연결하고,
Web Audio graph에 공간화된 스테레오 출력을 제공합니다.

1.0.0부터 엔진이 STCoreV2에서 SimpleST로 바뀌었고, 1.1.0은 **SimpleST 2.22.0 / ABI 6**을 씁니다
(SDK 릴리스 2.22.0-jhj.5. 이전 SDK 릴리스 2.18.2-jhj.7은 같은 1.1.0이 SimpleST 2.18.2를 썼고, 1.0.0 = SimpleST 2.12.0).
이번 릴리스에서 패키지 버전은 그대로이고 [소스 EQ와 출력 EQ](#eq)(`source.setEq`, `sound.setOutputEq`)가 들어갔으며,
리스너 `orientation` 쿼터니언의 머리 기울임(roll)이 엔진까지 전달됩니다(종전 yaw/pitch만). 2.18.2 SDK에서 `maxSources`
옵션(음원 수 상한)이 들어갔습니다. 기존 호출부는 바뀌지 않습니다. `SoundTrace`, `Source`, `Mesh`, `Listener` facade는 유지되지만 STCoreV2 대비
백엔드·HRTF·재질·옵션 계약이 달라졌습니다.
전체 옵션과 엔티티 API는 [Facade API](./web/facade.md), 저수준 SimpleST 모듈 접근은
[Native API](./web/native.md)를 참고하세요.

![soundtrace.js 구조](/img/web/architecture.png)

## 현재 SDK 핵심

| 항목 | 현재 동작 |
|---|---|
| 엔진 | SimpleST Realtime(pthreads WASM) + Offline(싱글스레드, IR 분석 전용) |
| 실행 모드 | `single_thread`(동기 전파) / `multi_thread`(파이프라인 전파). **둘 다 전용 Worker + pthread WASM** |
| 초기 반사 | 항상 **Hybrid**. 렌더 시작·HRTF 변경·reset 뒤에도 재적용 |
| HRTF | 내장 MIT KEMAR(`'mit-kemar'`), 동봉 SADIE II D2(`'sadie-d2'`) |
| 품질 | `fast` / `balanced` / `quality` — 리스너·음원 레이 격자와 반사 깊이를 함께 설정 |
| 재질 | 9밴드(63 Hz ~ 16 kHz) SoundTrace 게임 재질 22종, 이름·별칭·인덱스로 지정 |
| 출력 | 음원마다 모노 입력, 리스너 렌더러가 스테레오 1개를 믹스(`sound.output`) |
| 음원 상한 | 기본 32음원 · 음원 메모리 64 MiB · 지연 링 천장 0.5 s. 음원 수는 `maxSources` 옵션으로 바꿉니다 — [음원 메모리 예산](../core/simplest.md#음원-메모리-예산) |
| EQ | 음원별 소스 EQ와 전역 출력 EQ, 파라메트릭 최대 16밴드 — [EQ](#eq) |
| GPU | 없음. `mode: 'gpu'`, `enableGpu()`는 오류 |

## 요구 사항

- Node.js 20 이상(빌드 도구), 최신 Chromium 계열 브라우저 권장
- HTTPS 또는 localhost
- AudioWorklet, SharedArrayBuffer, **cross-origin isolation** — ST/MT 모두 필요합니다
  (비격리 폴백은 없습니다)
- 라이선스 SDK 배포본(vendor ZIP 또는 npm tgz)

## 설치

`soundtrace.js`는 라이선스 계약으로 제공되는 비공개 패키지 `@exarionai/soundtrace.js`입니다.
배포본은 두 형태입니다.

| 형태 | 파일 | 설치 |
|---|---|---|
| vendor 트리 | `soundtrace-js-release-vendor.zip` (루트 `sdk/`) | 정적 경로에 풀어 서빙. 동봉 `install.py`가 해시 검증 후 `vendor/sound-tracing/sdk`에 설치 |
| npm 패키지 | `exarionai-soundtrace.js-1.1.0.tgz` | `npm install /absolute/path/exarionai-soundtrace.js-1.1.0.tgz` |

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

패키지는 WASM 코어(`core/SimpleSTRealtime.mjs/.wasm`, `core/SimpleSTOffline.mjs`)와 재질·HRTF
asset을 함께 담고 런타임에 fetch합니다. 번들러가 이 모듈 그래프를 사전 번들링하면 Worker와
WASM 로딩이 깨지므로 Vite에서는 사전 번들링 대상에서 제외하고 정적 vendor 트리로 제공합니다.

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

코어와 asset을 직접 호스팅하면 `coreBaseUrl`, `assetBaseUrl` 옵션으로 URL을 지정합니다.
`.mjs`는 JavaScript, `.wasm`은 `application/wasm` MIME으로 서빙하세요.

### 배포 헤더

페이지 응답과 **Worker 스크립트 응답 모두**에 다음 헤더가 있어야 합니다.

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## 빠른 시작

다음 코드는 사용자 클릭이나 탭 이벤트 안에서 실행해야 합니다.

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  thread: 'mt',              // 'st' = 동기 전파, 'mt' = 파이프라인 전파(권장)
  quality: 'balanced',
  earlyReflectionMode: 'hybrid',
  coordinateBasis: {         // Three.js: 카메라가 -Z를 본다
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
sound.output.connect(audioContext.destination);

const room = sound.addMesh({ vertices, indices, material: 'concrete' });
const source = sound.addSource({ position: [2, 1.5, -1], gain: 1 });
sound.listener.setPose({ position: [0, 1.7, 0] });

const player = audioContext.createBufferSource();
player.buffer = decodedMonoBuffer;
player.loop = true;
await source.play(player);     // 입력 캡처 노드. 출력은 무음 — 소리는 sound.output에서 난다
await sound.update(0);
player.start();
```

SimpleST의 좌표계는 Unity와 같은 `+Z` forward입니다. Three.js처럼 `-Z`를 보는 렌더러는 위
`coordinateBasis`를 넣어야 좌우·전후가 맞습니다.

## 실행 모드

| 옵션 | 전파 | 설명 |
|---|---|---|
| `thread: 'st'` / `mode: 'single_thread'` | 동기(SYNCHRONOUS) | `update()`가 전파를 끝낸 뒤 반환. 기본 계산 예산 1 |
| `thread: 'mt'` / `mode: 'multi_thread'` | 파이프라인(PIPELINED) | Direct / Reflection-Diffraction / Reverb 레인이 워커에서 독립 실행. 기본 예산 3 |

두 모드 모두 전용 Worker가 엔진 세션을 소유하고 같은 pthread WASM을 씁니다. 배포 pthread
pool은 5이고 `propagationThreadCount`는 1 ~ 5입니다. 메인 스레드는 UI와 Web Audio graph만
유지하며, 위치 갱신은 공유 메모리 레인으로, 생성/삭제/재질 변경은 순서가 보장되는 명령 경로로
전달됩니다.

## HRTF 선택

| 호출 | 테이블 | 추가 asset |
|---|---|---|
| (호출하지 않음) | 엔진 내장 MIT KEMAR — SDK 기본값. `setOutputMode('speaker')`면 스테레오 패닝 | 없음 |
| `loadHrtf('mit-kemar')` 또는 `'convolution'` | 엔진 내장 MIT KEMAR 128탭 | 없음 |
| `loadHrtf('sadie-d2')` 또는 `'steamaudio'` | SADIE II D2 KEMAR 8,802방향 256탭 | `SADIE_D2_44K_16bit_256tap.hrtfbin` |

구 KU100 parametric / convolution / SADIE H12 테이블과 `Band8` 모드는 더 이상 없습니다.
`loadHrtf('parametric')`는 오류입니다.

```ts
await sound.loadHrtf('sadie-d2');
sound.listener.setOutputMode('speaker');   // 'hrtf'(기본) | 'speaker'(스테레오 패닝)
```

## 품질 프리셋

| 프리셋 | 리스너 guide ray | 음원 transport ray | 반사 깊이 | 용도 |
|---|---|---|---|---|
| `fast` | `8 × 8` | `8 × 8` | 4 | 모바일, 많은 동시 음원 |
| `balanced` (기본) | `16 × 16` | `16 × 16` | 6 | 데스크톱 기본 |
| `quality` | `24 × 24` | `24 × 24` | 8 | 품질 우선 데모 |

```ts
sound.setQuality('quality');
```

`'speed'`·`'middle'`은 각각 `fast`·`balanced`의 폐기 예정 별칭입니다. 성능 문제가 생기면 개별
레이 수를 만지기 전에 `quality → balanced → fast` 순서로 낮추십시오.

## 재질

메시에는 재질 이름, 별칭 또는 인덱스를 지정합니다. 기본 테이블은 SoundTrace 게임 재질 22종으로
Unity SDK와 같은 표·같은 인덱스입니다. 측정 데이터가 아닌 게임용 프리셋이며, 모든 값은 9밴드
R/A/T/scattering입니다. 기존 8밴드(63 Hz ~ 8 kHz) 값에서 반사 R과 투과 T는 그대로 두고, 흡수는
A = 1 − R − T, 16 kHz 밴드는 8 kHz 값을 반복, scattering은 9밴드에 같은 값으로 변환했습니다.

이름과 별칭은 대소문자를 구분하지 않습니다. 재질 이름은 원본 철자 그대로입니다
(`Sherdded-woodFiberborad`).

| 인덱스 | 재질 이름 | 별칭 |
|---:|---|---|
| 0 | `Concrete` | `cement`, `콘크리트` |
| 1 | `Fabric` | `cloth`, `carpet`, `curtain`, `천`, `카펫` |
| 2 | `Wood` | `timber`, `나무`, `목재` |
| 3 | `Brick` | `bricks`, `벽돌` |
| 4 | `ConcreteBlock` | `concrete block`, `cinder block`, `블록` |
| 5 | `Glass` | `window`, `유리`, `창문` |
| 6 | `Gravel` | `자갈` |
| 7 | `GypsumBoard` | `gypsum`, `drywall`, `석고보드` |
| 8 | `Linoleum,RubberOrAsphaltTile` | `linoleum`, `rubber`, `tile`, `vinyl`, `리놀륨`, `고무` |
| 9 | `Marble` | `대리석` |
| 10 | `Plaster` | `회반죽`, `플라스터` |
| 11 | `Plywood` | `합판` |
| 12 | `Sherdded-woodFiberborad` | `shreddedWoodFiberboard`, `woodFiberboard`, `fiberboard`, `목모보드` |
| 13 | `Snow` | `눈` |
| 14 | `Soil` | `dirt`, `earth`, `ground`, `흙` |
| 15 | `Steel` | `metal`, `iron`, `철`, `금속` |
| 16 | `Stone` | `rock`, `돌` |
| 17 | `WaterSurface` | `water`, `물` |
| 18 | `TunableAbsorber` | `absorber` |
| 19 | `LowVarianceTarget` | — |
| 20 | `ConcreteBlockPainted` | `painted concrete block` |
| 21 | `FiberglassReinforcedPlastic` | `fiberglass`, `frp` |

별칭의 정본은 패키지의 `assets/soundMaterialAlias.json`, 재질 값은 `assets/soundMaterial.json`입니다.

```ts
sound.addMesh({ vertices, indices, material: 'GypsumBoard' });
sound.addMesh({ vertices, indices, material: '유리' });   // → Glass (5)
```

:::warning
테이블에 없는 이름은 예외 없이 기본 재질(`defaultMaterialType = 0`, `Concrete`)로 조용히
대체됩니다. 이전 문서의 `BRAS_*` 이름도 이제 테이블에 없으므로 `Concrete`가 됩니다. 재질이 의도대로
적용됐는지 확인하려면 위 이름이나 별칭을 정확히 쓰세요.
:::

재질을 직접 정의하려면 밴드마다 `R + A + T = 1`(허용 오차 0.001)을 만족하는 9개 값 네 묶음을
넘깁니다. 배열 길이가 9가 아니면 오류입니다.

## Web Audio 연결

```ts
const node = await source.play(player);  // AudioWorkletNode: 입력 캡처용, 출력 무음
sound.output.connect(audioContext.destination);
```

`soundtrace.js`는 `AudioContext`를 만들지 않습니다. 앱이 context와 재생 노드를 소유하고,
SDK는 음원별 **입력 캡처 노드**와 **리스너 마스터 출력**(`sound.output`) 하나를 제공합니다.
음원별 출력 이펙트는 `sound.output` 뒤로 옮겨야 합니다.

SDK는 출력 리미터를 **끈 상태**로 둡니다. SimpleST 2.18은 생성 직후 true-peak 리미터(−1 dBTP, 137샘플
지연)를 켜지만, `sound.output` 뒤의 Web Audio 마스터 버스는 앱이 소유하기 때문입니다. 엔진 리미터가
필요하면 `sound.listener.setRenderOptions({ useLimiter: true })`로 true-peak 리미터를 켭니다.

같은 이유로 SimpleST 2.21부터 엔진이 생성 직후 켜는 등라우드니스 보정(저역 셸프 약 +7.2 dB @ 120 Hz, 고역 +1.8 dB)도
컨텍스트를 만든 직후 끕니다(`reset()` 포함). 끈 출력은 엔진 2.20과 비트 동일하고, 이 설정은 노출하지 않습니다.

## EQ

SDK 릴리스 2.22.0-jhj부터 SimpleST 파라메트릭 EQ를 음원과 출력에 걸 수 있습니다.

```ts
source.setEq({ bands: [
  { type: 'highpass', frequencyHz: 150 },
  { type: 'peaking', frequencyHz: 3000, gainDb: 4, q: 1.2 },
] });
sound.setOutputEq({ preampDb: -3, bands: [{ type: 'lowshelf', frequencyHz: 120, gainDb: 3 }] });

source.setEq(null);        // 소스 EQ 제거
sound.setOutputEq(null);   // 출력 EQ 끔
```

| API | 거는 곳 |
|---|---|
| `Source.setEq(eq \| null)` | 음원 신호, 엔진 밴드 분리 앞. 그 음원의 직접·반사·회절·잔향이 모두 같은 톤이 됩니다. 라이브·클립 입력 모두. `renderMonoImpulseResponse`의 오프라인 압력 IR에도 들어갑니다(`getIRs()`의 밴드 에너지에는 없음) |
| `SoundTrace.setOutputEq(eq \| null)` | 전역 출력 EQ 하나, 렌더 끝(마스터 게인 앞). `reset()` 뒤에도 유지. 오프라인 분석에는 들어가지 않습니다 |

- `eq = { enabled = true, preampDb = 0 (−48 ~ +12), bands = [] (최대 16) }`
- `band = { type = 'peaking', enabled = true, frequencyHz = 1000 (20 ~ 20,000), gainDb = 0 (±24, peaking·셸프만), q = 0.7071 (0.1 ~ 30, 셸프는 엔진이 3으로 제한) }`
- `type`은 `'peaking'` · `'lowshelf'` · `'highshelf'` · `'lowpass'` · `'highpass'` · `'notch'`입니다(Web Audio
  `BiquadFilterType` 이름, 컷은 12 dB/oct 고정).
- 범위 밖 값은 `RangeError`로 거절하고 명령을 보내지 않습니다. `{ enabled: false }`는 밴드를 보관한 채 통과시킵니다.
- EQ를 부르지 않으면 엔진 EQ를 호출하지 않으므로 출력은 EQ가 없을 때와 비트 동일합니다. 같은 값은 다시 보내지 않고,
  바뀐 값은 엔진이 20 ms 크로스페이드로 넘깁니다.
- EQ를 지원하지 않는 이전 코어에서는 엔진 버전을 밝혀 실패합니다. 적용된 출력 EQ는 `debugSnapshot().simplest.output.eq`에
  있습니다.

## 업데이트와 정리

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25], orientation: camera.quaternion.toArray() });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);   // 이번 프레임의 유효 경로 수를 돌려준다

source.dispose();
sound.dispose();
await audioContext.close();
```

## 진단과 IR 분석

```ts
const snap = await sound.debugSnapshot();
snap.simplest.timing;   // { propagationMs, directMs, reflectionDiffractionMs, reverbMs, irMs, renderMs }
snap.simplest.scene;    // { meshes, objects, sources, triangles }
snap.simplest.render;   // { blockSequence, activeSources, exactTaps, sendTaps, totalUs }

const irs = await sound.getIRs();                               // 9밴드 early path IR
const h = await sound.renderMonoImpulseResponse(source, 2.0);   // 44.1 kHz 모노 압력 IR (최대 30 s)
```

IR 분석은 별도 Offline Worker에서 씬을 복제해 계산하므로 실시간 출력은 끊기지 않습니다.
`renderMonoImpulseResponse`는 HRTF/Hybrid 출력 녹음이 아니라 압력 IR입니다.

## 데모

공개 데모 저장소 [Sound-tracing](https://github.com/exarionAI/Sound-tracing)에서 Shoebox room,
Multi-room occlusion, Runtime capability 예제를 실행할 수 있습니다.

![Shoebox room 데모](/img/web/demo-shoebox.png)

![Multi-room occlusion 데모](/img/web/demo-multiroom.png)

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소리가 나지 않음 | 사용자 gesture 안에서 `AudioContext.resume()`을 먼저 호출했는지, `sound.output`을 destination에 연결했는지 |
| `SoundTrace.create`가 cross-origin isolation 오류로 거부 | 페이지와 Worker 응답의 COOP/COEP 헤더, `crossOriginIsolated === true` (ST도 필요) |
| `mode: 'gpu'` / `enableGpu()` 오류 | SimpleST Web은 CPU 전용. 옵션을 제거 |
| `transmissionModel: 'solid'`, `defaultMeshBuild`, `hrtfQuality` 등 거부 | STCoreV2 전용 옵션. [Facade API](./web/facade.md)의 거부 목록 참고 |
| 방향이 반대로 들림 | 렌더러 좌표계에 맞는 `coordinateBasis`(`-Z` forward면 필수) |
| 재질이 안 먹는 것 같음 | 이름이 재질 테이블/별칭에 있는지(없으면 콘크리트로 대체) |
| 코어/asset 404 | 번들러 사전 번들링 제외, `coreBaseUrl`·`assetBaseUrl`, `.wasm` MIME |
| 성능이 부족함 | 품질 프리셋을 낮추고 `thread: 'mt'` 사용, 경로 시각화 끄기 |
| `setEq` / `setOutputEq`가 `RangeError` | 주파수·게인·Q·프리앰프 범위, 밴드 16개 이하인지 |

## 다음 문서

- [Facade API](./web/facade.md) — 생성 옵션, 장면·음원·메시 API, 수명주기, 거부되는 구 옵션
- [Native API](./web/native.md) — SimpleST 모듈 로더와 저수준 어댑터
- [Performance Guide](./performance.md)
