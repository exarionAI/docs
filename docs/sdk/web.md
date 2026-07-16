---
title: Web
description: soundtrace.js WebAssembly SDK의 설치, HRTF, 품질 프리셋, CPU/MT/WebGPU 백엔드와 공식 올인원 데모.
---

import useSharedStaticUrl from '@site/src/hooks/useSharedStaticUrl';

# Web SDK

**soundtrace.js**는 [STCoreV2](../core/stcorev2.md)를 브라우저에서 사용하는
TypeScript/WebAssembly SDK입니다. Three.js 같은 렌더링 씬의 메시, 재질, 음원,
리스너를 Sound Tracing 장면으로 연결하고 Web Audio graph에 공간화 출력을 제공합니다.

## 현재 SDK 핵심

| 항목 | 권장 사용법 |
|---|---|
| HRTF | 가벼운 기본값은 `Band8`, 측정 기반 방향감을 강화하려면 `Parametric` |
| 실행 백엔드 | `Single Thread`, `Multi Thread`, `WebGPU` 중 선택 |
| 품질 | `Fast`, `Balanced`, `Quality` 프리셋으로 선택 |
| 재질 | `Concrete`, `Steel`, `Marble`, `Snow`, `Soil` 같은 material preset 사용 |
| 저수준 설정 | ray resolution, depth, render budget은 프리셋이 관리하므로 일반 통합에서는 직접 조정하지 않음 |

## 웹 데모

문서에 포함된 데모는
[exarionAI/Sound-tracing](https://github.com/exarionAI/Sound-tracing)의 최신
build입니다. 한 애플리케이션 안에서 세 장면을 전환합니다.

| 장면 | 확인할 내용 |
|---|---|
| Capability | WebAssembly, AudioWorklet, SharedArrayBuffer, WebGPU 지원 상태 |
| Shoebox | 움직이는 음원, 리스너, 재질, 반사 경로와 품질 프리셋 |
| Multiroom | 여러 음원, 문 개폐, 차폐와 방 사이 전파 |

<iframe
  title="Sound-tracing.js all-in-one demo"
  src={useSharedStaticUrl('/demos/three-basic/')}
  style={{width: '100%', height: '576px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

데모는 상단 탭으로 세 장면을 전환합니다. 공간 음향 비교에는 헤드폰과 최신 Chrome을
권장합니다.

## 요구 사항

- Node.js 20 이상
- Web Audio API와 AudioWorklet을 지원하는 최신 브라우저
- `Multi Thread` 사용 시 COOP/COEP와 `crossOriginIsolated === true`
- `WebGPU` 사용 시 `navigator.gpu`를 제공하는 브라우저와 GPU
- 라이선스 SDK 배포본

## 라이선스 SDK 설치

평가·라이선스 배포본은 ZIP으로 전달될 수 있습니다. 공식 데모의 설치 계약은 다음과
같습니다.

```text
your-project/
└─ vendor/
   └─ sound-tracing/
      └─ sdk/
         ├─ index.js
         ├─ core/
         │  ├─ st/
         │  └─ mt/
         └─ assets/
```

ZIP 루트의 `sdk/` 폴더를 정확히 `vendor/sound-tracing/sdk/`에 둡니다.
`.env.local`은 사용하지 않습니다. 공식 데모는 체크인된 runtime manifest를 통해
개발 시 다음 entry를 로드합니다.

```text
/vendor-runtime/sound-tracing/sdk/index.js
```

Vite 설정과 production copy 방식은
[Sound-tracing의 `vite.config.ts`](https://github.com/exarionAI/Sound-tracing/blob/dev/vite.config.ts)가
기준 구현입니다.

## 빠른 시작

다음 코드는 사용자 클릭이나 탭 이벤트 안에서 실행해야 합니다.

```ts
const { SoundTrace } = await import(
  '/vendor-runtime/sound-tracing/sdk/index.js'
);

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

### Band8

`Band8`은 별도 HRTF table을 로드하지 않는 기본 렌더링 경로입니다. 빠른 시작 코드처럼
`loadHrtf()`를 호출하지 않으면 이 경로를 사용합니다.

```ts
// Band8: 추가 HRTF asset load 없음
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  quality: 'balanced',
});
```

### Parametric

측정 데이터를 축약한 KU100 parametric table을 명시적으로 로드합니다.

```ts
await sound.loadHrtf('parametric');
```

일반 제품 문서는 `Band8`과 `Parametric` 두 선택지만 우선 제공합니다. SDK에는 고급
HRIR 계열 loader도 있지만, asset 크기와 렌더 비용을 검증한 뒤 별도로 도입하십시오.

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

메시에는 material 이름 또는 index를 지정합니다.

```ts
sound.addMesh({
  vertices,
  indices,
  material: 'steel',
});
```

처음에는 기본 preset을 사용하고, 8-band reflection/absorption/transmission 값을 직접
편집하는 작업은 커스텀 음향 재질이 반드시 필요한 경우로 제한하십시오.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 소리가 나지 않음 | 사용자 gesture 안에서 `AudioContext.resume()`을 먼저 호출했는지 확인 |
| MT 시작 실패 | COOP/COEP, SharedArrayBuffer, `crossOriginIsolated` 확인 |
| GPU가 활성화되지 않음 | `navigator.gpu`와 브라우저 hardware acceleration 확인. CPU fallback은 정상 동작 |
| 방향이 반대로 들림 | 렌더러 좌표계에 맞는 `coordinateBasis` 확인 |
| SDK entry 404 | `vendor/sound-tracing/sdk/index.js`와 runtime manifest 경로 확인 |
| 성능이 부족함 | 먼저 품질 preset을 낮추고, path visualization을 끈 뒤 다시 측정 |

## 다음 문서

- [Performance Guide](./performance.md)
- [Unity SDK](./unity.md)
- [Unreal Engine SDK](./ue.md)
- [데모](../demos/overview.md)
