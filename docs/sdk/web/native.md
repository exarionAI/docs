---
title: Native API
description: soundtrace.js의 single-thread 저수준 API와 현재 지원 범위입니다.
---

# Native API

Native API는 scene, listener, source, mesh, BVH를 직접 제어해야 하는 고급
single-thread 통합용입니다. 일반 앱은 [Facade API](./facade.md)를 사용하세요.

```ts
import { SoundTrace } from '@exarionai/soundtrace.js';
import {
  BvhType,
  PathType,
  UpdateType,
  type MeshBuildOptions,
} from '@exarionai/soundtrace.js/native';
```

## 지원 범위

:::warning 현재 공개 타입 계약
`@exarionai/soundtrace.js/native`는 저수준 클래스와 타입을 export하지만, 현재
`SoundTrace.create()`의 공개 반환 타입은 facade입니다. 따라서 `createScene()`,
`createListener()`, `createSource()` 같은 factory를 사용하는 완전한 direct-native
TypeScript 진입 흐름은 아직 공개 계약으로 제공되지 않습니다.

공개 타입이 확장되기 전에는 facade를 사용하세요. 내부 구현에 대한 cast나 비공개
deep import는 버전 호환성을 보장하지 않습니다.
:::

또한 direct-native 제어는 ST 전용입니다. worker-hosted MT에서 다음 surface는
`SoundTraceMtUnsupportedError`를 발생시킵니다.

- `createScene()`, `createListener()`, `createSource()`
- `createMesh()`, `createObject()`, `createCollider()`
- `materials`, `propagator`, `diagnostics`
- `createWorkletNode()`
- 동기 native getter

MT 애플리케이션은 facade와 `await sound.debugSnapshot()`을 사용하세요.

## 객체 모델

| 객체 | 역할 |
|---|---|
| `SoundScene` | object, source, 단일 listener를 소유하고 propagation 실행 |
| `SoundListener` | listener pose, ray와 render 옵션 관리 |
| `SoundSource` | source pose, gain, path별 옵션 관리 |
| `SoundMesh` | triangle geometry와 BLAS 관리 |
| `SoundObject` | scene transform과 mesh instance 관리 |
| `SoundCollider` | `SoundMesh`와 `SoundObject`의 수명주기 결합 |
| `MaterialTable` | 주파수 대역별 재질 등록 |
| `Propagator` | valid path와 profile 조회 |
| `Diagnostics` | ray, 메모리, 런타임 진단 조회 |

## 장면 업데이트

저수준 장면은 다음 순서로 갱신합니다.

```ts
scene.tick(dt);
scene.updatePropagation();
```

`scene.update(dt)`는 두 호출을 순서대로 실행하는 단축 API입니다.

장면의 listener는 하나입니다.

```ts
scene.setListener(listener);
scene.addSource(source);
scene.addCollider(collider);
```

## Geometry 변경

| 변경 | API | update type |
|---|---|---|
| transform만 변경 | `object.setPosition(...)` 등 | object 상태에 맞게 갱신 |
| vertex만 변경 | `mesh.updateVertices(...)` | `UpdateType.Refit` |
| topology 또는 BVH 옵션 변경 | `mesh.setData(...)` | `UpdateType.Rebuild` |

Refit은 topology가 유지되는 애니메이션 geometry에 사용합니다. 이 경로는
refit 가능한 LBVH 계열과 함께 사용하세요.

```ts
mesh.updateVertices(vertices);
object.setUpdateType(UpdateType.Refit);
scene.tick(dt);
```

Topology가 바뀌면 rebuild를 명시합니다.

```ts
mesh.setData(vertices, triangles, buildOptions);
object.setUpdateType(UpdateType.Rebuild);
scene.tick(dt);
```

## BVH 선택

| 타입 | 용도 |
|---|---|
| `BvhType.HKDtree` | 벽, 바닥 등 정적 geometry |
| `BvhType.LBVH` | vertex가 자주 바뀌는 geometry |
| `BvhType.LBVH_SIMD*` | SIMD 폭을 명시한 LBVH |
| `BvhType.LBVH_NWAY*` | N-way LBVH |

`BvhType.Default`는 per-mesh에서 엔진 기본값을 따르는 sentinel입니다. process-wide
기본값을 정할 때는 concrete BVH 타입을 사용하세요.

```ts
const buildOptions: MeshBuildOptions = {
  bvhType: BvhType.HKDtree,
  bvhMaxDepth: 0,
  primPerLeaf: 0,
};
```

## 오디오

Native 실시간 렌더링도 `AudioWorkletNode`를 사용합니다. 기본 계약은 다음과 같습니다.

- sample rate: `AudioContext.sampleRate`
- block size: 128 samples
- output: 2-channel binaural

Facade의 `source.play()`가 이 설정과 graph 연결을 관리합니다. direct-native
`createWorkletNode()`는 공개 factory 타입이 제공된 뒤에만 애플리케이션 코드에서
사용하는 것을 권장합니다.

## 진단

| 필요 정보 | Facade | Native ST |
|---|---|---|
| valid path와 profile | `await debugSnapshot()` | `Propagator` |
| ray와 메모리 통계 | `await debugSnapshot()` | `Diagnostics` |
| 앱이 설정한 pose | entity 상태 | native object getter |

MT에서는 propagation 결과를 동기 getter로 읽지 마세요.

## 관련 문서

- [Web SDK 개요](pathname:///sdk/web)
- [Facade API](./facade.md)
- [Performance Guide](../performance.md)
