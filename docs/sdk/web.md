---
title: Web
description: soundtrace.js WebAssembly SDK의 설치, HRTF, 품질 프리셋, CPU/MT/WebGPU 백엔드 가이드.
---

# Web SDK

**soundtrace.js**는 [STCoreV2](../core/stcorev2.md)를 브라우저에서 사용하는
TypeScript/WebAssembly SDK입니다. Three.js 같은 렌더링 씬의 메시, 재질, 음원,
리스너를 Sound Tracing 장면으로 연결하고 Web Audio graph에 공간화 출력을 제공합니다.

전체 생성 옵션과 entity API는 [Facade API](./web/facade.md), ST 전용 저수준
통합은 [Native API](./web/native.md)를 참고하세요.

## 현재 SDK 핵심

| 항목 | 권장 사용법 |
|---|---|
| HRTF | 기본은 코어 내장 HRIR 테이블(로드 불필요), 파라메트릭 방향 렌더링은 `loadHrtf('parametric')` |
| 실행 백엔드 | `Single Thread`, `Multi Thread`, `WebGPU` 중 선택 |
| 품질 | `Fast`, `Balanced`, `Quality` 프리셋으로 선택 |
| 재질 | `concrete`, `wood`, `glass`, `metal` 같은 이름으로 material preset 지정 |
| 저수준 설정 | ray resolution, depth, render budget은 프리셋이 관리하므로 일반 통합에서는 직접 조정하지 않음 |

## 요구 사항

- Node.js 20 이상
- Web Audio API와 AudioWorklet을 지원하는 최신 브라우저
- `Multi Thread` 사용 시 COOP/COEP와 `crossOriginIsolated === true`
- `WebGPU` 사용 시 `navigator.gpu`를 제공하는 브라우저와 GPU
- 라이선스 SDK 배포본

## 설치

`soundtrace.js`는 라이선스 계약으로 제공되는 비공개 패키지 `@exarionai/soundtrace.js`
입니다. 배포본을 받은 뒤에는 아래 예제의 import 지정자를 그대로 사용합니다.

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
```

패키지는 WASM 코어(`core/st`, `core/mt`)와 재질·HRTF asset을 함께 담고 있으며 런타임에
직접 fetch합니다. 번들러가 이 모듈 그래프를 사전 번들링하면 worker와 wasm 로딩이
깨지므로, Vite에서는 패키지를 사전 번들링 대상에서 제외합니다.

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ['@exarionai/soundtrace.js'] },
});
```

코어와 asset을 직접 호스팅해야 하면 `coreBaseUrl`, `assetBaseUrl` 옵션으로 URL을
지정할 수 있습니다. 자세한 내용은 [Facade API](./web/facade.md)를 참고하세요.

## 빠른 시작

다음 코드는 사용자 클릭이나 탭 이벤트 안에서 실행해야 합니다.

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';

const audioContext = new AudioContext();
await audioContext.resume();

const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});

const room = sound.addMesh({
  vertices,
  indices,
  material: 'concrete',
});

const source = sound.addSource({
  position: [2, 1.5, -1],
  gain: 1,
});

sound.listener.setPose({
  position: [0, 1.7, 0],
});

await sound.update(0);
```

Three.js는 카메라가 `-Z`를 바라보므로 위 `coordinateBasis`를 사용합니다. 좌표 basis를
생략하면 좌우 또는 전후 HRTF 방향이 뒤집혀 들릴 수 있습니다.

## HRTF 선택

코어는 모든 listener에 min-phase HRIR 테이블을 내장한 상태로 시작합니다. 따라서
`loadHrtf()`를 호출하지 않아도 바이노럴 렌더링이 동작하며, 이것이 기본 경로입니다.

측정 데이터를 축약한 KU100 parametric 테이블로 바꾸려면 명시적으로 로드합니다.

```ts
await sound.loadHrtf('parametric');
```

| 호출 | 사용하는 테이블 | 추가 asset |
|---|---|---|
| (호출하지 않음) | 코어 내장 min-phase HRIR | 없음 |
| `loadHrtf('parametric')` | KU100 parametric | `KU100_bprime.bin` |
| `loadHrtf('convolution')` | 코어 내장 HRIR(최근접 조회로 전환) | 없음 |
| `loadHrtf('steamaudio')` | SADIE H12 HRIR | `sadie_h12_steamaudio.bin` |

앱이 소유한 테이블을 쓰려면 두 번째 인자로 URL, `ArrayBuffer`, typed array를 넘깁니다.

```ts
await sound.loadHrtf('parametric', '/assets/my-hrtf.bin');
```

:::note
8-band 크기 + ITD로 렌더링하는 `Band8` 스페셜라이저가 코어에 존재하지만 facade에서는
선택할 수 없습니다. `setRenderOptions()`는 `hrtfMode` 키를 거부하며, 전환은 native
`setHrtfMode()`를 통해서만 가능합니다.
:::

## 백엔드 선택

| 모드 | 코드 | 조건 | 동작 |
|---|---|---|---|
| Single Thread | `mode: 'single_thread'` | 일반 브라우저 | 가장 단순한 CPU 경로 |
| Multi Thread | `mode: 'multi_thread'` | COOP/COEP, SharedArrayBuffer | worker-hosted MT CPU 경로 |
| WebGPU | `mode: 'gpu'` | WebGPU | GPU 전파를 시도하고 불가하면 CPU fallback |

### Multi Thread 배포 헤더

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

MT 모드는 전용 worker가 engine session을 소유합니다. main thread는 UI와 Web Audio
graph를 유지하고, transform은 빠른 상태 경로로, create/delete/material 변경은 순서가
보장되는 command 경로로 전달됩니다.

### WebGPU

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'gpu',
  quality: 'balanced',
});
```

현재 WebGPU 자동 활성화 경로는 single-thread core와 결합됩니다. `mode: 'gpu'`에
`thread: 'mt'`를 강제로 함께 지정하지 마십시오. GPU 초기화가 실패하면 SDK는 CPU로
계속 실행합니다.

## 품질 프리셋

| 프리셋 | 용도 |
|---|---|
| `fast` | 모바일, 저전력 장치, 많은 동시 음원 |
| `balanced` | 기본값. 일반 데스크톱과 제품 통합 |
| `quality` | 고성능 데스크톱, 품질 우선 데모 |

```ts
sound.setQuality('quality');
```

프리셋은 propagation과 HRTF/diffuse render budget을 함께 조정합니다. 성능 문제가
생기면 개별 ray property를 수정하기 전에 `quality → balanced → fast` 순서로 낮추십시오.

## Web Audio 연결

```ts
const player = audioContext.createBufferSource();
player.buffer = decodedBuffer;
player.loop = true;

const spatialNode = await source.play(player);
spatialNode.connect(sound.output).connect(audioContext.destination);
player.start();
```

`soundtrace.js`는 `AudioContext`를 만들지 않습니다. 앱이 context와 재생 node를 소유하고,
SDK는 source별 spatial node와 master output을 제공합니다.

## 업데이트와 정리

```ts
source.setPose({ position: [1, 1.5, -2] });
sound.listener.setPose({ position: [0, 1.7, 0.25] });
room.setPose({ position: [0, 0, 0] });

await sound.update(1 / 60);

sound.dispose();
await audioContext.close();
```

## 재질 프리셋

메시에는 material 이름 또는 index를 지정합니다. 기본 재질 테이블은 22종이며, 이름은
아래 10개 canonical name으로 매핑됩니다.

| Canonical name | 인식되는 별칭(일부) |
|---|---|
| `concrete` | cement, beton, pavement, 콘크리트 |
| `wood` | plank, timber, oak, pine, bamboo, 나무 |
| `glass` | window, mirror, 유리 |
| `metal` | steel, iron, aluminum, copper, brass, 금속 |
| `brick` | tile, ceramic, terracotta, 벽돌 |
| `fabric` | cloth, textile, carpet, curtain, 천 |
| `plastic` | rubber, vinyl, pvc, 플라스틱 |
| `water` | liquid, pool, 물 |
| `grass` | vegetation, leaves, lawn, 잔디 |
| `sand` | dirt, gravel, soil, mud, 모래, 흙 |

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',   // metal의 별칭
});
```

:::warning
테이블에 없는 이름은 예외를 던지지 않고 기본 재질(index `0`, `concrete`)로 조용히
대체됩니다. 오타가 나도 소리는 나므로, 재질이 의도대로 적용됐는지 확인하려면 위
표의 이름을 사용하세요.
:::

처음에는 기본 preset을 사용하고, 8-band reflection/absorption/transmission 값을 직접
편집하는 작업은 커스텀 음향 재질이 반드시 필요한 경우로 제한하십시오.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소리가 나지 않음 | 사용자 gesture 안에서 `AudioContext.resume()`을 먼저 호출했는지 확인 |
| MT 시작 실패 | COOP/COEP, SharedArrayBuffer, `crossOriginIsolated` 확인 |
| GPU가 활성화되지 않음 | `navigator.gpu`와 브라우저 hardware acceleration 확인. CPU fallback은 정상 동작 |
| 방향이 반대로 들림 | 렌더러 좌표계에 맞는 `coordinateBasis` 확인 |
| 재질이 안 먹는 것 같음 | 재질 이름이 위 canonical name/별칭 표에 있는지 확인 (없으면 기본 재질로 대체) |
| 코어/asset 404 | 번들러가 패키지를 사전 번들링하지 않는지, `coreBaseUrl`·`assetBaseUrl`이 맞는지 확인 |
| 성능이 부족함 | 먼저 품질 preset을 낮추고, path visualization을 끈 뒤 다시 측정 |

## 다음 문서

- [Facade API](./web/facade.md) — 생성 옵션, 장면·음원·메시 API, 수명주기
- [Native API](./web/native.md) — single-thread 저수준 통합의 지원 범위
- [Performance Guide](./performance.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
