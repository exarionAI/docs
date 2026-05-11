---
title: Web
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# Web SDK

**soundtrace.js**는 [STCoreV2](../core/stcorev2.md)를 브라우저에서 쓰기 위한
TypeScript/WebAssembly 바인딩입니다. 애플리케이션이 소유한 `AudioContext`에
표준 `AudioNode`처럼 연결하고, Three.js 같은 렌더링 씬의 메시·재질·음원·청취자
상태를 실시간 음향 전파에 반영합니다.

## 언제 쓰는가

| 용도 | 설명 |
|---|---|
| Three.js/WebGL 앱 | 시각 장면의 콜라이더와 재질을 그대로 음향 장면으로 전달 |
| 브라우저 게임·시뮬레이터 | 음원·청취자 이동에 따라 반사·회절·투과 경로를 갱신 |
| Web Audio 그래프 | MP3, 스트리밍, 마이크 입력을 `AudioWorkletNode`로 공간화 |
| 디버깅·시각화 | valid path, BVH leaf box, ray/path 통계를 JS에서 조회 |

## 설치와 아티팩트

패키지는 ESM으로 배포되며 공개 표면은 `soundtrace.js` 엔트리에서 가져옵니다.

```ts
import {
  SoundTrace,
  UpdateType,
  PathType,
  defaultSTOption,
  type SoundMaterial,
  type Triangle,
} from 'soundtrace.js';
```

패키지에는 다음 런타임 파일이 함께 들어갑니다.

| 경로 | 용도 |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM 코어 |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM 코어 |
| `soundtrace.js/hrtf/hrtf.bytes` | 기본 HRTF 데이터셋 |
| `soundtrace.js/assets/soundMaterial.json` | 기본 사운드 재질 테이블 |
| `soundtrace.js/assets/soundMaterialAlias.json` | 앱 레이어 자동 매핑용 alias 테이블 |

:::info 배포물 기준
SDK 배포 패키지에는 `STCoreV2` 서브모듈이나 C++ 풀소스가 포함되지 않습니다.
브라우저 런타임에는 컴파일된 `exaSound.js`/`exaSound.wasm` 바이너리와 TypeScript
wrapper, HRTF·material asset만 전달됩니다.
:::

번들러에서 서브패스 파일 URL이 필요할 때는 `new URL(..., import.meta.url)`로
해결합니다.

```ts
const hrtfUrl = new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url);
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## 빠른 시작

```ts
import {
  SoundTrace,
  UpdateType,
  defaultSTOption,
  type Triangle,
  type SoundMaterial,
} from 'soundtrace.js';

// Run this inside a user click/tap handler.
const ctx = new AudioContext();
await ctx.resume();

const sound = await SoundTrace.create(ctx, { thread: 'mt' });

const listener = sound.createListener();
const source = sound.createSource();
const scene = sound.createScene().addListener(listener).addSource(source);

await listener.setHRTFFromUrl(
  new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url),
);

listener
  .setOption(defaultSTOption())
  .setAudioOption({
    sampleRate: ctx.sampleRate,
    inputSampleCount: 128,
    outputChannels: 2,
  })
  .setOrientation([1, 0, 0, 0, 1, 0, 0, 0, -1])
  .setRayCount(32, 32)
  .setRayDepth(7)
  .setPosition(0, 0, 0);

source
  .setIntensity(1)
  .setDepth(4)
  .setRayCount(64, 64)
  .setPosition(2, 0, -1);

const material: SoundMaterial = {
  reflection:   [0.95, 0.95, 0.92, 0.88, 0.80, 0.70, 0.65, 0.60],
  absorption:   [0.05, 0.05, 0.08, 0.12, 0.20, 0.30, 0.35, 0.40],
  transmission: [0.01, 0.01, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001],
  scattering: 0.12,
  index: 0,
};
sound.materials.add(material);

const vertices = new Float32Array([
  -2, -1, -2,
   2, -1, -2,
   2, -1,  2,
  -2, -1,  2,
]);
const triangles: Triangle[] = [
  { a: 0, b: 1, c: 2, materialIndex: 0 },
  { a: 0, b: 2, c: 3, materialIndex: 0 },
];

const mesh = sound.createMesh();
mesh.setData(vertices, triangles, { bvhType: 0, bvhMaxDepth: 16, primPerLeaf: 4 });

const floor = sound.createObject().setMesh(mesh.id);
floor.setUpdateType(UpdateType.Rebuild);
scene.addObject(floor);

scene.tick(0);
scene.updatePropagation();

const spatialNode = await sound.createWorkletNode(listener, source, 2);
const buffer = await fetch('/audio/music.mp3')
  .then((r) => r.arrayBuffer())
  .then((b) => ctx.decodeAudioData(b));

const player = ctx.createBufferSource();
player.buffer = buffer;
player.loop = true;
player.connect(spatialNode).connect(sound.output).connect(ctx.destination);
player.start();
```

## 런타임 구조

```
AudioBufferSourceNode
        │
        ▼
AudioWorkletNode  (listener, source pair)
        │
        ▼
sound.output      (GainNode, master output)
        │
        ▼
ctx.destination
```

`soundtrace.js`는 `AudioContext`를 직접 만들지 않습니다. 앱이 만든 컨텍스트를
받고, 출력으로 `AudioNode`를 돌려줍니다. 따라서 공간화 앞뒤에 EQ, 컴프레서,
마스터 볼륨 같은 일반 Web Audio 노드를 자유롭게 삽입할 수 있습니다.

## 스레드 모드

| 모드 | 선택값 | 사용 상황 | 오디오 경로 |
|---|---|---|---|
| Multi | `{ thread: 'mt' }` | 권장. `SharedArrayBuffer`와 COOP/COEP 헤더를 쓸 수 있는 배포 환경 | WASM이 `AudioWorkletProcessor` 안에서 직접 렌더 |
| Single | `{ thread: 'st' }` | 헤더 제약이 있거나 단순 장면을 먼저 확인할 때 | JS 메인 스레드에서 블록 렌더 후 worklet/ring 또는 fallback으로 전달 |

MT 모드는 브라우저가 `crossOriginIsolated === true`여야 합니다. HTML 응답에 다음
헤더를 설정하세요.

```txt
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite 개발 서버 예시:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

## Scene 작성 흐름

1. `SoundTrace.create(ctx, options)`로 WASM 코어를 로드합니다.
2. `createScene()`, `createListener()`, `createSource()`를 만들고 scene에 추가합니다.
3. `createMesh()`에 정점과 삼각형, BVH 옵션을 넘깁니다.
4. `createObject()`에 mesh ID와 transform을 지정하고 scene에 추가합니다.
5. 프레임마다 움직인 음원·청취자·콜라이더를 갱신합니다.
6. `scene.tick(dt)`와 `scene.updatePropagation()`으로 전파 결과를 갱신합니다.
7. 오디오는 MT에서는 worklet이 렌더하고, ST에서는 `listener.render()` fallback을
   직접 펌프할 수 있습니다.

## TypeScript API

### `SoundTrace`

| API | 설명 |
|---|---|
| `new SoundTrace(audioContext, options)` | 인스턴스 생성. 사용 전 `load()` 필요 |
| `SoundTrace.create(audioContext, options)` | 생성과 `load()`를 한 번에 수행 |
| `load()` | `st` 또는 `mt` WASM 로드, `exaInit()`, `output` 생성 |
| `output` | master `GainNode` |
| `audioContext` | 생성자에서 받은 컨텍스트 |
| `createScene()` | `SoundScene` 생성 |
| `createObject()` | `SoundObject` 생성 |
| `createMesh()` | `SoundMesh` 생성 |
| `createSource()` | `SoundSource` 생성 |
| `createListener()` | `SoundListener` 생성. listener ID가 renderer handle 역할도 함 |
| `materials` | 전역 material table wrapper |
| `propagator` | valid path, guide plane, profile 조회 |
| `diagnostics` | 버전, 메모리 trace, ray 통계 조회 |
| `createWorkletNode(listener, source, channels = 2)` | MT 모드용 `AudioWorkletNode` 생성 |
| `reset()` | 코어 상태 reset |
| `dispose()` | 출력 노드 disconnect, WASM wrapper 참조 해제 |

`SoundTraceOptions`:

| 필드 | 기본값 | 범위·주의 |
|---|---:|---|
| `thread` | `'st'` | `'st'` 또는 `'mt'`. 실제 서비스는 MT 권장 |
| `coreBaseUrl` | 패키지 내부 `./core` | 직접 호스팅할 때 `./core`처럼 `st/`, `mt/`가 있는 디렉터리 지정 |

### `SoundScene`

| API | 설명 |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | 사운드 콜라이더 관리 |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | 음원 관리 |
| `addListener(listener)`, `removeListener(listener)` | 청취자 관리 |
| `tick(dt)` | object update type을 소비하고 TLAS/BVH 상태 갱신 |
| `updatePropagation()` | ray/path 전파 계산 실행 |

### `SoundObject`와 `UpdateType`

| 값 | 용도 |
|---|---|
| `UpdateType.Static` (`0`) | 기본값. 지오메트리와 transform이 변하지 않는 정적 콜라이더 |
| `UpdateType.Refit` (`1`) | 정점 위치만 바뀌고 topology가 같은 경우. 스키닝/애니메이션 콜라이더 |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()` 호출, topology 변경, BVH 옵션 변경, scene 추가·삭제 |

:::warning Refit 사용 규칙
`Refit`은 **스키닝 애니메이션을 사운드 콜라이더로 쓰는 상황**에 사용합니다.
이 경우 BVH는 반드시 `LBVH`로 빌드하세요. 프레임마다
`mesh.updateVertices(vertices)`로 vertex buffer만 갱신하고, 해당 object를
`UpdateType.Refit`으로 표시한 뒤 `scene.tick(dt)`를 실행합니다. BLAS refit과 TLAS
refit은 `SoundScene::tick()` 안에서 update flag를 소비하며 처리됩니다.
:::

:::info Rebuild가 필요한 경우
`SoundMesh.setData()`는 내부 BVH 객체를 새로 만들기 때문에, 이미 scene에 붙은
object라면 다음 tick 전에 `object.setUpdateType(UpdateType.Rebuild)`를 호출하세요.
`scene.tick(dt)`가 이 flag를 보고 BLAS/TLAS rebuild를 정리합니다.
:::

### `SoundMesh`

| API | 설명 |
|---|---|
| `setData(vertices, triangles, opts?)` | geometry와 BVH를 새로 빌드 |
| `updateVertices(vertices)` | vertex buffer만 갱신 |
| `setMaterial(materialIndex)` | 전체 triangle 재질 변경 |
| `setMaterialRange(triStart, triCount, materialIndex)` | 일부 triangle 재질 변경 |
| `getBVHWireframe()` | BVH leaf AABB 시각화용 float 배열 |
| `intersect(sceneID, ray)` | scene 내 사운드 메시 raycast |

Web SDK는 BLAS refit/rebuild를 별도 mesh 메서드로 노출하지 않습니다. two-level BVH
동기화는 `SoundObject`의 `UpdateType` flag를 통해 scene tick에서 처리됩니다.
topology, triangle 목록, BVH 옵션이 바뀌면 `setData()`를 다시 호출하고, 이미 scene에
붙은 object는 `UpdateType.Rebuild`로 표시하세요.

`MeshBuildOptions`:

| 필드 | 기본값 | 권장 범위 | 설명 |
|---|---:|---:|---|
| `bvhType` | `0` | `0` 또는 `1` | `0 = HKDtree`, `1 = LBVH` |
| `bvhMaxDepth` | `24` | `1..32` | 트리 최대 깊이. 깊을수록 leaf가 작아질 수 있지만 build 비용 증가 |
| `primPerLeaf` | `4` | `1..32` | leaf 하나에 넣을 primitive 수. 낮으면 node가 늘고, 높으면 leaf 내부 triangle test가 늘어남 |

BVH 선택 기준:

| 타입 | 값 | 쓰임 |
|---|---:|---|
| `HKDtree` | `0` | **정적 사운드 콜라이더**. 벽, 방, 바닥처럼 topology와 vertex가 고정된 메시. 현재 엔진에서 `SBVH`의 대용으로 존재 |
| `LBVH` | `1` | **동적·스키닝 콜라이더 필수 선택**. vertex가 프레임마다 바뀌고 scene tick refit 경로가 필요한 메시 |

`SpatialBuilder`에는 `SBVH`, `WBVH` 같은 이름이 남아 있지만 Web SDK의
`SoundMesh.setData()` 경로에는 `HKDtree`와 `LBVH`만 연결되어 있습니다. 다른 값을
넘기지 마세요.

### `SoundListener`

| API | 설명 |
|---|---|
| `setPosition(x, y, z)`, `setVelocity(x, y, z)` | 청취자 위치·속도 |
| `setOrientation(mat3x3)` | row-major 3x3 방향 행렬. 데모는 `right, up, forward(-Z)` |
| `setOrientationQuat(qx, qy, qz, qw)` | quaternion 방향 |
| `setOption(option)` | 전파 옵션 일괄 설정 |
| `setAudioOption(option)` | 오디오 렌더링 sample/block/channel 설정 |
| `setPathEnable(pathType, enabled)` | direct/reflection/diffraction/reverb/transmission on/off |
| `setRayCount(width, height)` | listener guide ray grid 크기 |
| `setRayDepth(depth)` | 최대 path depth |
| `setHRTFFromUrl(url)` | HRTF 파일 fetch 후 적용 |
| `setHRTFFromMemory(buffer)` | HRTF binary 직접 적용 |
| `render(sourceID, input, output, channelCount)` | ST fallback 수동 렌더 |
| `setMaxDelay(sourceID, v)` | delay line 최대 길이 |
| `setPathFadeTime(sourceID, v)` | path 변경 cross-fade 시간 |
| `setMaxDelayRate(sourceID, v)` | delay 변화 rate limit |

`STOption` 파라미터:

| 필드 | 기본값 | 최소·최대 | 왜 조절하는가 |
|---|---:|---:|---|
| `maxDepth` | `16` | `1..16` | 반사·회절 path의 최대 깊이. 높을수록 풍부하지만 비용이 `ray 수 × depth`로 증가 |
| `listenerWidth` | `32` | `1..32` 권장, 하드 상한 `255` | 수평 ray 해상도. 데모 검증 범위는 `1..32` |
| `listenerHeight` | `32` | `1..32` 권장, 하드 상한 `255` | 수직 ray 해상도 |
| `seedValue` | `0` | `0..2^32-1` | 난수/캐시 seed. 현재 C API는 `0`이면 `pathCacheSize`를 `0`으로 강제 |
| `maxSoundSource` | `116` | `1..116` | scene에서 추적할 수 있는 source 상한 |
| `pathCacheSize` | `16384` | `0..16384` | path cache 용량. 큰 값은 메모리 증가, `seedValue=0`이면 비활성화 |
| `enableEnergyBasedTermination` | `false` | boolean | 에너지가 충분히 낮은 path를 조기 종료해 깊은 path 비용을 줄임 |
| `energyThreshold` | `0.001` | `0..1` | EBT 기준. `0.01`은 RT20, `0.001`은 RT30, `0.000001`은 RT60에 가까운 보수적 설정 |
| `samePlaneEpsilonDist` | `0.001` | `0..` | 거의 같은 평면을 병합할 거리 허용치. 단위는 scene meter 기준 |
| `samePlaneEpsilonNormal` | `0.999` | `0..1` | 평면 normal 유사도. 1에 가까울수록 더 엄격 |
| `guideRayMethod` | `0` | `0` 또는 `1` | `0 = GridStaggered`, `1 = Fibonacci` |

Ray count와 depth는 드래그 중 매 픽셀마다 바꾸지 말고, UI에서는 slider release 시점에
적용하는 편이 안전합니다. 내부 path cache와 guide-plane buffer가 재할당될 수 있기
때문입니다.

`AudioOption` 파라미터:

| 필드 | 권장값 | 설명 |
|---|---:|---|
| `sampleRate` | `ctx.sampleRate` | 브라우저 `AudioContext`와 반드시 맞춤 |
| `inputSampleCount` | MT `128`, ST `sampleRate / 100` 또는 fallback `1024` | 엔진이 한 번에 처리할 frame 수 |
| `outputChannels` | `2` | HRTF binaural 출력. 현재 실시간 경로는 stereo 권장 |

### `SoundSource`

| API | 설명 |
|---|---|
| `setPosition(x, y, z)` | 음원 위치 |
| `setDirection(x, y, z)` | 방향성 음원용 방향 벡터 |
| `setVelocity(x, y, z)` | 도플러/동적 처리용 속도 |
| `setIntensity(v)` | 음원 기본 gain. `1.0` 기준, 음수는 피함 |
| `setGainBoostDb(db)` | 전체 gain boost. native에서 `0..20 dB`로 clamp |
| `setReverbSendDb(db)` | reverb send. native에서 `-60..20 dB`로 clamp |
| `setReflectionSendDb(db)` | reflection send. native에서 `-60..20 dB`로 clamp |
| `setDepth(depth)` | source ray depth. 데모 기본 `4`, 실사용은 `1..16` 권장 |
| `setRayCount(width, height)` | source ray grid. 데모 기본 `64 × 64` |
| `setDistanceAttenuation(pathType, vec3)` | path type별 거리 감쇠 곡선 |

Path type:

| 이름 | 값 |
|---|---:|
| `PathType.Direct` | `0` |
| `PathType.Reflection` | `1` |
| `PathType.Diffraction` | `2` |
| `PathType.Reverb` | `3` |
| `PathType.Transmission` | `4` |

거리 감쇠는 `vec3 = { x: constant, y: linear, z: quadratic }`이고 내부 계산은
다음 형태입니다.

```txt
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

각 계수는 `0` 이상으로 두세요. 데모는 모든 path type에
`{ x: 0.001, y: 1.0, z: 0.0 }`을 넣어 거의 `1 / distance`에 가까운 곡선을 쓰며,
`constant`를 아주 작게 둬서 near-field 폭주를 막습니다. `setAllDistanceAttenuations`
helper는 현재 direct/reflection/diffraction/reverb 4종만 다루므로,
transmission은 `setDistanceAttenuation(PathType.Transmission, value)`로 따로 넣는
것을 권장합니다.

### `MaterialTable`

| API | 설명 |
|---|---|
| `sound.materials.add(material)` | 전역 material table에 추가하고 index 반환 |
| `sound.materials.set(index, material)` | 기존 material 교체 |

### `Propagator`

| API | 설명 |
|---|---|
| `getValidPathCount()` | 현재 valid path 개수 |
| `getValidPaths(count?)` | path polyline, 에너지, 재질 hit 정보를 JS 배열로 조회 |
| `getGuidePlaneCount(sceneID)`, `getGuidePlanes(sceneID)` | guide plane 시각화 |
| `getMirrorPositionCount(sceneID)`, `getMirrorPositions(sceneID)` | image-source 위치 시각화 |
| `getProfile()` | 최근 propagation 단계별 ms와 path count |
| `sortIRDatas()` | IR data 정렬 요청 |
| `findAttenuationForDistance(...)` | target attenuation에 해당하는 거리 역산 |
| `startBackgroundLoop(sceneID, intervalMs = 16)` | MT WASM에서 engine pthread로 tick + propagation 실행 |
| `stopBackgroundLoop()` | background loop 정지 |

Web의 MT background loop는 브라우저 WASM 메모리 공유 제약 때문에 제공되는
보조 API입니다. 네이티브 SDK에서는 호출자가 자기 스레드/job 시스템에서
`tick()`과 `updatePropagation()`을 직접 호출하는 모델을 유지합니다.

## 사운드 재질 JSON

기본 재질은 `soundMaterial.json`의 `_soundMaterials` 배열입니다. 현재 번들에는
22개 재질이 있으며 `ConcreteBlockPainted` 타입 `20`이 three.js 데모의 기본 벽·방
재질입니다.

```jsonc
{
  "_soundMaterials": [
    {
      "materialType": 0,
      "description": "Concrete",
      "scattering": 0.08,
      "reflection": [0.99, 0.98, 0.94, 0.86, 0.63, 0.40, 0.35, 0.30],
      "absorption": [0.01, 0.02, 0.06, 0.14, 0.37, 0.60, 0.65, 0.70],
      "transmission": [0.005, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001, 0.001]
    }
  ]
}
```

| 필드 | 범위 | 설명 |
|---|---:|---|
| `materialType` | `0..` unique integer | triangle의 `materialIndex`가 참조하는 안정 ID |
| `description` | string | UI와 authoring tool에 보여줄 이름 |
| `scattering` | `0..1` | `0`은 specular 중심, `1`은 diffuse scattering 중심 |
| `reflection` | float[8], 각 `0..1` | 8개 주파수 대역별 반사 계수 |
| `absorption` | float[8], 각 `0..1` | 8개 주파수 대역별 흡수 계수 |
| `transmission` | float[8], 각 `0..1` | 8개 주파수 대역별 투과 계수 |

8개 주파수 대역은 고정입니다.

```txt
[67.5, 125, 250, 500, 1000, 2000, 4000, 8000] Hz
```

에너지 보존을 위해 같은 band에서 `reflection + absorption + transmission`이
대체로 `1.0` 근처 또는 이하가 되도록 조정하세요. 일부 측정 기반·튜닝 재질은 작은
오차가 있을 수 있지만, 큰 초과값은 경로 에너지를 과하게 만들 수 있습니다.

런타임 로딩 예시:

```ts
const res = await fetch(new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url));
const { _soundMaterials } = await res.json() as {
  _soundMaterials: Array<{
    materialType: number;
    description: string;
    scattering: number;
    reflection: number[];
    absorption: number[];
    transmission: number[];
  }>;
};

for (const m of _soundMaterials) {
  sound.materials.add({
    reflection: m.reflection,
    absorption: m.absorption,
    transmission: m.transmission,
    scattering: m.scattering,
    index: m.materialType,
  });
}
```

기본 재질 목록:

| ID | 이름 | scattering |
|---:|---|---:|
| 0 | Concrete | 0.08 |
| 1 | Fabric | 0.40 |
| 2 | Wood | 0.15 |
| 3 | Brick | 0.25 |
| 4 | ConcreteBlock | 0.35 |
| 5 | Glass | 0.05 |
| 6 | Gravel | 0.65 |
| 7 | GypsumBoard | 0.08 |
| 8 | Linoleum,RubberOrAsphaltTile | 0.05 |
| 9 | Marble | 0.05 |
| 10 | Plaster | 0.06 |
| 11 | Plywood | 0.12 |
| 12 | Sherdded-woodFiberborad | 0.55 |
| 13 | Snow | 0.75 |
| 14 | Soil | 0.60 |
| 15 | Steel | 0.06 |
| 16 | Stone | 0.30 |
| 17 | WaterSurface | 0.03 |
| 18 | TunableAbsorber | 0.20 |
| 19 | LowVarianceTarget | 0.02 |
| 20 | ConcreteBlockPainted | 0.15 |
| 21 | FiberglassReinforcedPlastic | 0.10 |

`soundMaterialAlias.json`은 엔진 기능이 아니라 UX 편의용 데이터입니다. authoring
tool이나 앱 레이어에서 온 문자열을 canonical material로 자동 매핑할 때 쓰는
보조 테이블이며, `soundtrace.js` 코어 동작에는 필수가 아닙니다. 예를 들어
`콘크리트`, `cement`, `beton`은 `concrete`로, `나무`, `timber`, `oak`은 `wood`로
묶을 수 있습니다. 매칭 실패 시 앱은 `defaultMaterialType`을 fallback으로 사용할 수
있습니다.

## Three.js 데모

<iframe
  title="soundtrace.js three.js static single-thread demo"
  src={useBaseUrl('/demos/three-basic/?thread=st')}
  style={{display: 'block', width: '85%', height: '540px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

로컬 실행:

```bash
cd /Users/ethanjung/dev/soundtrace.js
npm install
npm run build
cd examples/three-basic
npm install
npm run dev
```

Vite dev server는 기본적으로 COOP/COEP 헤더를 설정하므로 MT 모드도 확인할 수
있습니다. 문서에 임베드된 iframe은 정적 호스팅에서도 동작하도록 `?thread=st`로
고정했습니다.

### 하단 버튼

| 컨트롤 | 설명 |
|---|---|
| `Room` | 방 전체 collider의 재질 선택 |
| `Collider` | 정적 wall과 Flair collider의 재질 선택 |
| `Thread` | 시작 전 `Single` 또는 `Multi` 선택. MT 불가 환경이면 자동으로 ST로 고정 |
| `Start Audio` | WASM, 재질, HRTF, MP3를 로드하고 오디오를 시작. 브라우저 autoplay 정책 때문에 사용자 클릭이 필요 |
| `Move` / `Stop` | 음원을 방 안의 타원 경로로 이동하거나 현재 위치에 정지 |
| `Wall: On/Off` | 청취자 근처의 정적 wall collider를 scene에 추가·제거 |
| `Flair: On/Off` | FBX 스키닝 애니메이션 collider를 scene에 추가·제거 |

`Flair`는 스키닝된 vertex를 매 프레임 샘플링해 사운드 콜라이더로 쓰는 예제입니다.
이 경로는 `LBVH + updateVertices + UpdateType.Refit` 조합을 보여주기 위한
것입니다. 데모에서 BVH 타입을 `HKDtree`로 바꾸면 Flair는 bind pose 기반의 정적
검사용으로 취급하세요.

### lil-gui 패널

| 패널 | 컨트롤 | 설명 |
|---|---|---|
| `Listener` | `Ray Width`, `Ray Height` | listener guide ray 해상도. 데모 범위 `1..32` |
| `Listener` | `Ray Depth` | 최대 path depth. 데모 범위 `1..16`, 기본 `7` |
| `Debug overlays` | `Show Valid Paths` | 전파 결과 polyline 표시 |
| `Debug overlays` | `Show FPS` | Stats HUD 표시 |
| `Colliders · BVH` | `Type` | `HKDtree` 또는 `LBVH` |
| `Colliders · BVH` | `Max Depth` | BVH build depth. 데모 범위 `1..32` |
| `Colliders · BVH` | `Prims / Leaf` | leaf당 primitive 수. 데모 범위 `1..32` |
| `Colliders · BVH` | `Show BVH Boxes` | leaf AABB wireframe 표시 |
| `Render Params` | `Max Delay Rate` | `0.01..0.5`, 기본 `0.03`. delay 변화 속도 제한 |
| `Render Params` | `Path Fade Time` | `0.005..0.2 s`, 기본 `0.066`. path 변경 cross-fade |
| `Render Params` | `Max Path Delay` | `0.1..3.0 s`, 기본 `1.0`. delay line 최대 길이 |

### 마우스 조작

| 조작 | 설명 |
|---|---|
| 우클릭 드래그 | listener 중심으로 카메라 orbit |
| 휠 | zoom |
| 파란 화살표 | listener forward 방향 |
| 빨간 화살표 | listener right 방향 |

## 성능 튜닝 순서

1. 런타임 앱은 `Ray Width = 16`, `Ray Height = 16`, `Ray Depth = 3`에서 시작합니다.
2. listener `Ray Width × Ray Height × Ray Depth`를 필요한 만큼만 올립니다.
3. 정적 구조물은 `HKDtree`, 애니메이션 collider는 `LBVH`로 분리합니다.
4. 애니메이션 collider는 topology를 유지하고 vertex만 갱신합니다.
5. path가 너무 급격히 바뀌면 `Path Fade Time`을 늘리고, delay pitch wobble이 들리면
   `Max Delay Rate`를 낮춥니다.
6. valid path와 BVH box overlay는 디버깅 때만 켭니다.

three.js 데모는 **1 listener + 1 source**를 기준으로 높은 품질과 디버깅 가시성을
보여주도록 설정되어 있습니다. 실제 앱에서는 기즈모가 필수가 아닙니다. 특히 valid
path와 BVH box를 그릴 때는 WASM 내부 데이터를 JS로 복사하고 Three.js geometry로
재구성하는 통신·시각화 오버헤드가 생기므로, 개발 중에만 켜고 런타임 배포에서는
끄는 것을 권장합니다.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| MT 로드 실패 | HTML 응답에 COOP/COEP가 있는지, `crossOriginIsolated`가 `true`인지 확인 |
| `createWorkletNode` 에러 | `SoundTrace`를 `{ thread: 'mt' }`로 만들었는지 확인 |
| 소리가 나지 않음 | `ctx.resume()`을 사용자 클릭 안에서 호출했는지, `soundMaterial.json`이 로드되어 material table에 들어갔는지, absorption 배열이 reflection 배열과 똑같이 복붙되지 않았는지 확인 |
| 방향감이 느껴지지 않음 | HRTF asset(`hrtf.bytes`) 로드가 성공했는지 확인 |
| 프레임이 떨어짐 | `Ray Depth`, `Ray Width`, `Ray Height`를 낮춤. 일반 런타임 시작값은 `16 × 16 × depth 3` 권장 |
| mono 입력이 무음 | worklet node의 channel count는 SDK가 `2`, `explicit`, `speakers`로 고정함. 직접 노드를 만들었다면 동일 설정 필요 |
| path gizmo가 잔상처럼 보임 | `getValidPaths()`는 반환된 실제 count만 사용해야 함 |
| ray/path gizmo가 보이지 않음 | scene에 사운드 콜라이더 object가 추가되어 있는지 확인 |
| 애니메이션 collider가 튐 | `LBVH`, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, `scene.tick()` 흐름인지 확인 |
| BVH 옵션 변경 후 crash | `mesh.setData()` 뒤 object에 `UpdateType.Rebuild`를 표시하고 `scene.tick()` 실행 |

## 참고

- [SDK 개요](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [데모](../demos/overview.md)
