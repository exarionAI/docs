---
title: Facade API
description: ST와 MT에서 동일하게 사용하는 soundtrace.js 권장 API입니다.
---

# Facade API

Facade는 일반 웹 애플리케이션의 권장 진입점입니다. `SoundTrace`가 장면 수명주기를
관리하고 `Listener`, `Source`, `Mesh`가 앱의 3D 상태를 표현합니다.

[Web SDK 개요](pathname:///sdk/web) · [Native API](./native.md)

## 기본 흐름

```ts
const sound = await SoundTrace.create(audioContext, options);

sound.listener.setPose(listenerPose);
const mesh = sound.addMesh(meshOptions);
const source = sound.addSource(sourceOptions);

const spatial = await source.play(inputNode);
spatial.connect(sound.output).connect(audioContext.destination);

await sound.update(0);
```

ST와 worker-hosted MT에서 이 호출 흐름은 같습니다. MT의 동기 native getter 대신
`debugSnapshot()` 같은 비동기 readback을 사용합니다.

## `SoundTrace` 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `mode` | 미지정 | `'single_thread'`, `'multi_thread'`, `'gpu'` 중 하나 |
| `thread` | `'auto'` | 고급 WASM 선택: `'auto'`, `'st'`, `'mt'`; `mode`가 우선 |
| `quality` | `'balanced'` | `'fast'`, `'balanced'`, `'quality'` |
| `throughput` | 미지정 | MT worker 예산: `'low'`, `'medium'`, `'max'` |
| `coordinateBasis` | 코어 좌표계 | 렌더러 좌표계를 SDK 좌표계로 변환 |
| `coreBaseUrl` | 패키지 내부 | `st/`, `mt/`가 들어 있는 코어 URL |
| `assetBaseUrl` | 패키지 내부 | 재질과 HRTF asset URL |
| `propagationThreadCount` | 엔진 기본값 | MT propagation thread 수의 저수준 override |
| `defaultMeshBuild` | 엔진 기본값 | `addMesh()`가 사용할 기본 BVH build 옵션 |
| `sceneRatio` | `1.0` | 장면 길이 단위당 미터. 지오메트리 사전 스케일과 혼용 금지(이중 스케일) |
| `autoLoadMaterials` | `true` | 기본 재질을 로드해 이름 기반 매핑 활성화 |
| `transmissionModel` | `'surface'` | 직접음이 재질을 투과할 때의 에너지 감쇠 모델. [재질 투과 모델](#재질-투과-모델) 참고 |
| `debug` | `false` | 초기화 진단 로그 출력 |

Three.js는 카메라가 `-Z`를 바라보므로 다음 basis로 시작할 수 있습니다.

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  coordinateBasis: {
    right: [-1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },
});
```

## 주요 API

### `SoundTrace`

| API | 설명 |
|---|---|
| `SoundTrace.create(ctx, options?)` | 엔진을 생성하고 로드 |
| `listener` | 장면의 단일 청취자 |
| `addMesh(options)` | 음향 geometry 추가 |
| `removeMesh(mesh)` | geometry 제거 |
| `addSource(options)` | 공간 음원 추가 |
| `setQuality(tier)` | 품질 preset 변경 |
| `setAudioOption(options)` | block과 출력 channel override |
| `loadHrtf(mode, source?)` | packaged 또는 custom HRTF 로드 |
| `update(dt?)` | 장면을 갱신하고 propagation 실행 |
| `debugSnapshot(options?)` | MT 호환 비동기 진단 snapshot |
| `reset()` | 엔진 상태 초기화 |
| `dispose()` | SDK가 소유한 리소스 해제 |

### `Listener`

```ts
sound.listener
  .setPose({ position: [0, 1.6, 0], orientation: [0, 0, 0, 1] })
  .setRenderOptions({ hrtfQuality: 'medium' });
```

장면에는 listener가 하나 있습니다. listener는 `SoundTrace`가 소유하므로 별도로
dispose하지 않습니다.

### `Source`

```ts
const source = sound.addSource({
  position: [2, 1, -1],
  gain: 1,
  paths: {
    direct: true,
    reflection: true,
    diffraction: true,
    reverberation: true,
  },
});

source.setPose({ position: [1, 1, -2] });
source.setGain(0.8);
source.setPathEnabled('reverberation', false);
```

`play(input, channels?)`는 입력을 연결한 `AudioWorkletNode`를 반환합니다. 출력은
앱이 `sound.output` 또는 다른 Web Audio graph에 연결합니다.

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

`indices`는 메시 전체가 하나의 재질을 사용할 때 편리합니다. 면별 재질이 필요하면
`{ a, b, c, materialIndex }` 형태의 `triangles`를 전달하세요.

## 재질 투과 모델

`transmissionModel`은 직접음이 벽 같은 재질을 통과할 때 에너지를 잃는 방식을
선택합니다.

| 값 | 동작 |
|---|---|
| `'surface'` (기본) | 표면을 지날 때마다 재질의 투과 계수를 한 번 적용. 벽 두께와 무관 |
| `'solid'` | 두께 인식: ray가 solid 내부를 지나는 거리에 재질별 per-band 두께를 적용. 두꺼운 벽이 더 많이 차단 |

```ts
const sound = await SoundTrace.create(audioContext, {
  mode: 'single_thread',
  transmissionModel: 'solid',
});
```

`'solid'`는 두께가 저작된 재질만 전환하며, 두께가 없는 재질은 `'surface'` 동작을
유지합니다. 기본 재질 테이블에서는 22종 중 15종이 두께를 포함합니다.

:::warning
opt-in 옵션입니다 — 벽 너머 음원의 크기가 달라지므로, 기존 장면의 사운드를
유지해야 한다면 기본값을 그대로 두세요.
:::

## 프레임 업데이트

pose 변경은 빠르게 기록할 수 있지만, propagation update는 동시에 하나만 실행하는
것이 안전합니다.

```ts
let updateInFlight: Promise<number> | undefined;

function frame(dt: number) {
  if (!updateInFlight) {
    updateInFlight = sound.update(dt).finally(() => {
      updateInFlight = undefined;
    });
  }
}
```

## 수명주기

`SoundTrace`, `Source`, `Mesh`는 `dispose()`를 지원합니다. `SoundTrace.dispose()`는
listener를 포함해 SDK가 소유한 리소스를 정리하며 여러 번 호출해도 안전합니다.

```ts
source.dispose();
mesh.dispose();
sound.dispose();
```

## 관련 문서

- [Web SDK 개요](pathname:///sdk/web)
- [Native API](./native.md)
- [Performance Guide](../performance.md)
