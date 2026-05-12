---
title: Web
---

import useBaseUrl from '@docusaurus/useBaseUrl';

# Web SDK

**soundtrace.js**は、ブラウザで [STCoreV2](../core/stcorev2.md) を使うためのTypeScript/WebAssemblyバインディングです。アプリケーションが所有する`AudioContext`へ標準`AudioNode`のように接続し、Three.jsなどのレンダリングシーンにあるメッシュ、材質、音源、リスナー状態をリアルタイム音響伝搬へ反映します。

## いつ使うか

| 用途 | 説明 |
|---|---|
| Three.js/WebGLアプリ | 視覚シーンのcolliderとmaterialをそのまま音響シーンへ渡す |
| ブラウザゲーム・シミュレータ | 音源・リスナー移動に応じてreflection、diffraction、transmission経路を更新 |
| Web Audio graph | MP3、streaming、microphone入力を`AudioWorkletNode`で空間化 |
| デバッグ・可視化 | valid path、BVH leaf box、ray/path統計をJavaScriptから取得 |

## インストールとアーティファクト

パッケージはESMとして配布され、公開APIは`soundtrace.js`エントリからimportします。

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

パッケージには次のruntime fileが含まれます。

| パス | 用途 |
|---|---|
| `soundtrace.js/core/st/exaSound.js`, `.wasm` | single-thread WASM core |
| `soundtrace.js/core/mt/exaSound.js`, `.wasm` | multi-thread WASM core |
| `soundtrace.js/hrtf/hrtf.bytes` | default HRTF dataset |
| `soundtrace.js/assets/soundMaterial.json` | default sound material table |

bundlerでsubpath asset URLが必要な場合は`new URL(..., import.meta.url)`で解決します。

```ts
const hrtfUrl = new URL('soundtrace.js/hrtf/hrtf.bytes', import.meta.url);
const materialUrl = new URL('soundtrace.js/assets/soundMaterial.json', import.meta.url);
```

## クイックスタート

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

## Runtime構造

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

`soundtrace.js`は`AudioContext`を直接作りません。アプリが作成したcontextを受け取り、出力として`AudioNode`を返します。そのため、空間化の前後にEQ、compressor、master volumeなど通常のWeb Audio nodeを自由に挿入できます。

## スレッドモード

| モード | 選択値 | 使用状況 | Audio path |
|---|---|---|---|
| Multi | `{ thread: 'mt' }` | `SharedArrayBuffer`とCOOP/COEP headerを使える配布環境で推奨 | WASMが`AudioWorkletProcessor`内で直接render |
| Single | `{ thread: 'st' }` | header制約がある場合、または単純なsceneを最初に確認するとき | JS main threadでblock renderし、worklet/ringまたはfallbackへ渡す |

MTモードにはブラウザの`crossOriginIsolated === true`が必要です。HTML応答に次のheaderを設定してください。

```txt
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite dev server例:

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

## Scene作成フロー

1. `SoundTrace.create(ctx, options)`でWASM coreをロードします。
2. `createScene()`, `createListener()`, `createSource()`を作成し、sceneへ追加します。
3. `createMesh()`へvertices、triangles、BVH optionsを渡します。
4. `createObject()`へmesh IDとtransformを指定し、sceneへ追加します。
5. 毎フレーム、動くsource、listener、colliderを更新します。
6. `scene.tick(dt)`と`scene.updatePropagation()`で伝搬結果を更新します。
7. MTではworkletがaudioをrenderし、STでは`listener.render()` fallbackを手動pumpできます。

## TypeScript API

### `SoundTrace`

| API | 説明 |
|---|---|
| `new SoundTrace(audioContext, options)` | インスタンス生成。使用前に`load()`が必要 |
| `SoundTrace.create(audioContext, options)` | 生成と`load()`を一度に実行 |
| `load()` | `st`または`mt` WASMをロードし、`exaInit()`と`output`作成を実行 |
| `output` | master `GainNode` |
| `audioContext` | constructorで受け取ったcontext |
| `createScene()` | `SoundScene`生成 |
| `createObject()` | `SoundObject`生成 |
| `createMesh()` | `SoundMesh`生成 |
| `createSource()` | `SoundSource`生成 |
| `createListener()` | `SoundListener`生成。listener IDはrenderer handleとしても使われる |
| `materials` | global material table wrapper |
| `propagator` | valid path、guide plane、profile取得 |
| `diagnostics` | version、memory trace、ray statistics取得 |
| `createWorkletNode(listener, source, channels = 2)` | MTモード用`AudioWorkletNode`生成 |
| `reset()` | core state reset |
| `dispose()` | output nodeをdisconnectし、WASM wrapper参照を解放 |

`SoundTraceOptions`:

| フィールド | default | 範囲・注意 |
|---|---:|---|
| `thread` | `'st'` | `'st'`または`'mt'`。実サービスではMT推奨 |
| `coreBaseUrl` | package internal `./core` | 自前hosting時は`./core`のように`st/`, `mt/`を含むdirectoryを指定 |

### `SoundScene`

| API | 説明 |
|---|---|
| `addObject(obj)`, `removeObject(obj)`, `clearObjects()` | sound collider管理 |
| `addSource(src)`, `removeSource(src)`, `clearSources()` | source管理 |
| `addListener(listener)`, `removeListener(listener)` | listener管理 |
| `tick(dt)` | object update typeを消費し、TLAS/BVH stateを更新 |
| `updatePropagation()` | ray/path propagationを実行 |

### `SoundObject`と`UpdateType`

| 値 | 用途 |
|---|---|
| `UpdateType.Static` (`0`) | default。geometryとtransformが変わらない静的collider |
| `UpdateType.Refit` (`1`) | vertex位置だけが変わりtopologyは同じ場合。skinning/animation collider向け |
| `UpdateType.Rebuild` (`2`) | `mesh.setData()`、topology変更、BVH option変更、scene追加・削除 |

:::warning Refitの使用規則
`Refit`は**skinned animationをsound colliderとして使う場合**に使います。この場合BVHは必ず`LBVH`でbuildしてください。毎フレーム`mesh.updateVertices(vertices)`でvertex bufferだけを更新し、対象objectを`UpdateType.Refit`にしてから`scene.tick(dt)`を実行します。BLAS refitとTLAS refitは`SoundScene::tick()`内でupdate flagを消費して処理されます。
:::

:::info Rebuildが必要な場合
`SoundMesh.setData()`は内部BVH objectを新しく作ります。既にsceneへ接続されているobjectなら、次のtick前に`object.setUpdateType(UpdateType.Rebuild)`を呼んでください。`scene.tick(dt)`がこのflagを見てBLAS/TLAS rebuildを処理します。
:::

### `SoundMesh`

| API | 説明 |
|---|---|
| `setData(vertices, triangles, opts?)` | geometryとBVHを新しくbuild |
| `updateVertices(vertices)` | vertex bufferだけ更新 |
| `setMaterial(materialIndex)` | 全triangleのmaterial変更 |
| `setMaterialRange(triStart, triCount, materialIndex)` | 一部triangleのmaterial変更 |
| `getBVHWireframe()` | BVH leaf AABB可視化用float array |
| `intersect(sceneID, ray)` | scene内sound mesh raycast |

Web SDKはBLAS refit/rebuildを個別mesh methodとして公開しません。two-level BVH同期は`SoundObject`の`UpdateType` flagを通じてscene tickで処理されます。topology、triangle list、BVH optionが変わる場合は`setData()`を再度呼び、既にsceneへ接続されたobjectを`UpdateType.Rebuild`にしてください。

`MeshBuildOptions`:

| フィールド | default | 推奨範囲 | 説明 |
|---|---:|---:|---|
| `bvhType` | `0` | `0`または`1` | `0 = HKDtree`, `1 = LBVH` |
| `bvhMaxDepth` | `24` | `1..32` | tree最大深度。深いほどleafが小さくなる場合があるがbuild cost増加 |
| `primPerLeaf` | `4` | `1..32` | leafあたりprimitive数。低いとnode増加、高いとleaf内triangle test増加 |

BVH選択:

| タイプ | 値 | 用途 |
|---|---:|---|
| `HKDtree` | `0` | **静的sound collider**。壁、部屋、床のようにtopologyとvertexが固定されたmesh。現在のengineでは`SBVH`の代替として存在 |
| `LBVH` | `1` | **動的・skinning colliderで必須**。vertexが毎フレーム変わり、scene tick refit pathが必要なmesh |

`SpatialBuilder`には`SBVH`, `WBVH`などの名前が残っていますが、Web SDKの`SoundMesh.setData()`経路には`HKDtree`と`LBVH`だけが接続されています。他の値は渡さないでください。

### `SoundListener`

| API | 説明 |
|---|---|
| `setPosition(x, y, z)`, `setVelocity(x, y, z)` | listener位置・速度 |
| `setOrientation(mat3x3)` | row-major 3x3 orientation matrix。demoは`right, up, forward(-Z)` |
| `setOrientationQuat(qx, qy, qz, qw)` | quaternion orientation |
| `setOption(option)` | propagation optionを一括設定 |
| `setAudioOption(option)` | audio sample/block/channel設定 |
| `setPathEnable(pathType, enabled)` | direct/reflection/diffraction/reverb/transmission on/off |
| `setRayCount(width, height)` | listener guide ray grid size |
| `setRayDepth(depth)` | max path depth |
| `setHRTFFromUrl(url)` | HRTF fileをfetchして適用 |
| `setHRTFFromMemory(buffer)` | HRTF binaryを直接適用 |
| `render(sourceID, input, output, channelCount)` | ST fallback manual render |
| `setMaxDelay(sourceID, v)` | delay line最大長 |
| `setPathFadeTime(sourceID, v)` | path変更cross-fade時間 |
| `setMaxDelayRate(sourceID, v)` | delay変化rate limit |

`STOption` parameters:

| フィールド | default | 最小・最大 | 調整理由 |
|---|---:|---:|---|
| `maxDepth` | `16` | `1..16` | reflection/diffraction pathの最大深度。高いほど豊かだがcostは`ray count × depth`で増加 |
| `listenerWidth` | `32` | 推奨`1..32`, hard cap `255` | horizontal ray resolution。demo検証範囲は`1..32` |
| `listenerHeight` | `32` | 推奨`1..32`, hard cap `255` | vertical ray resolution |
| `seedValue` | `0` | `0..2^32-1` | random/cache seed。現在のC APIは`0`の場合`pathCacheSize`を`0`に強制 |
| `maxSoundSource` | `116` | `1..116` | sceneで追跡できるsource上限 |
| `pathCacheSize` | `16384` | `0..16384` | path cache容量。大きいほどmemory増加、`seedValue=0`なら無効 |
| `enableEnergyBasedTermination` | `false` | boolean | energyが十分低いpathを早期終了して深いpath costを削減 |
| `energyThreshold` | `0.001` | `0..1` | EBT基準。`0.01`はRT20、`0.001`はRT30、`0.000001`はRT60に近い保守的設定 |
| `samePlaneEpsilonDist` | `0.001` | `0..` | ほぼ同じplaneをmergeする距離許容値。単位はscene meter |
| `samePlaneEpsilonNormal` | `0.999` | `0..1` | plane normal類似度。1に近いほど厳格 |
| `guideRayMethod` | `0` | `0`または`1` | `0 = GridStaggered`, `1 = Fibonacci` |

Ray countとdepthはdrag中に毎pixel変更せず、UIではslider release時点で適用する方が安全です。内部path cacheやguide-plane bufferが再確保されることがあります。

`AudioOption` parameters:

| フィールド | 推奨値 | 説明 |
|---|---:|---|
| `sampleRate` | `ctx.sampleRate` | browser `AudioContext`と必ず一致 |
| `inputSampleCount` | MT `128`, ST `sampleRate / 100` または fallback `1024` | engineが一度に処理するframe数 |
| `outputChannels` | `2` | HRTF binaural出力。現在のreal-time pathではstereo推奨 |

### `SoundSource`

| API | 説明 |
|---|---|
| `setPosition(x, y, z)` | source位置 |
| `setDirection(x, y, z)` | directional source用方向vector |
| `setVelocity(x, y, z)` | Doppler/dynamic処理用velocity |
| `setIntensity(v)` | source base gain。`1.0`基準、負値は避ける |
| `setGainBoostDb(db)` | global gain boost。nativeで`0..20 dB`にclamp |
| `setReverbSendDb(db)` | reverb send。nativeで`-60..20 dB`にclamp |
| `setReflectionSendDb(db)` | reflection send。nativeで`-60..20 dB`にclamp |
| `setDepth(depth)` | source ray depth。demo default `4`、実使用は`1..16`推奨 |
| `setRayCount(width, height)` | source ray grid。demo default `64 × 64` |
| `setDistanceAttenuation(pathType, vec3)` | path type別distance attenuation curve |

Path type:

| 名前 | 値 |
|---|---:|
| `PathType.Direct` | `0` |
| `PathType.Reflection` | `1` |
| `PathType.Diffraction` | `2` |
| `PathType.Reverb` | `3` |
| `PathType.Transmission` | `4` |

Distance attenuationは`vec3 = { x: constant, y: linear, z: quadratic }`で、内部計算は次の形です。

```txt
gain = 1 / (constant + linear * distance + quadratic * distance^2)
```

各係数は`0`以上にしてください。demoはほぼ`1 / distance`に近いcurveとして`{ x: 0.001, y: 1.0, z: 0.0 }`を使い、小さい`constant`でnear-fieldの暴走を防ぎます。`setAllDistanceAttenuations` helperは現在direct/reflection/diffraction/reverbの4種類だけを扱うため、transmissionは`setDistanceAttenuation(PathType.Transmission, value)`で個別設定してください。

### `MaterialTable`

| API | 説明 |
|---|---|
| `sound.materials.add(material)` | global material tableへ追加しindexを返す |
| `sound.materials.set(index, material)` | 既存materialを置換 |

### `Propagator`

| API | 説明 |
|---|---|
| `getValidPathCount()` | 現在のvalid path数 |
| `getValidPaths(count?)` | path polyline、energy、material hitをJS arrayで取得 |
| `getGuidePlaneCount(sceneID)`, `getGuidePlanes(sceneID)` | guide plane visualization |
| `getMirrorPositionCount(sceneID)`, `getMirrorPositions(sceneID)` | image-source position visualization |
| `getProfile()` | 最新propagation stage別msとpath count |
| `sortIRDatas()` | IR data sort要求 |
| `findAttenuationForDistance(...)` | target attenuationに対応するdistanceを逆算 |
| `startBackgroundLoop(sceneID, intervalMs = 16)` | MT WASMでengine pthreadからtick + propagation実行 |
| `stopBackgroundLoop()` | background loop停止 |

WebのMT background loopは、browser WASM memory sharing制約のために提供される補助APIです。native SDKでは呼び出し側が自分のthread/job systemで`tick()`と`updatePropagation()`を直接呼ぶモデルを維持します。

## Sound Material JSON

default materialは`soundMaterial.json`の`_soundMaterials`配列です。現在のbundleには22種類のmaterialがあり、`ConcreteBlockPainted` type `20`がthree.js demoのdefault wall/room materialです。

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

| フィールド | 範囲 | 説明 |
|---|---:|---|
| `materialType` | `0..` unique integer | triangleの`materialIndex`が参照するstable ID |
| `description` | string | UIとauthoring toolに表示する名前 |
| `scattering` | `0..1` | `0`はspecular中心、`1`はdiffuse scattering中心 |
| `reflection` | float[8], each `0..1` | 8 frequency bands別reflection coefficient |
| `absorption` | float[8], each `0..1` | 8 frequency bands別absorption coefficient |
| `transmission` | float[8], each `0..1` | 8 frequency bands別transmission coefficient |

8つのfrequency bandは固定です。

```txt
[67.5, 125, 250, 500, 1000, 2000, 4000, 8000] Hz
```

energy conservationのため、同じbandで`reflection + absorption + transmission`が概ね`1.0`付近または以下になるよう調整してください。測定ベース・tuning materialには小さな誤差がある場合がありますが、大きな超過値はpath energyを過大にします。

Runtime loading例:

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

Default material list:

| ID | Name | scattering |
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

`soundMaterialAlias.json`はengine機能ではなくUX convenience dataです。authoring toolやapp layerから来た文字列をcanonical materialへ自動mappingするための補助tableで、`soundtrace.js` core動作には必須ではありません。たとえば`cement`や`beton`を`concrete`へ、`timber`や`oak`を`wood`へまとめられます。matching失敗時、appは`defaultMaterialType`をfallbackとして使えます。

## Three.jsデモ

<iframe
  title="soundtrace.js three.js static single-thread demo"
  src={useBaseUrl('/demos/three-basic/?thread=st')}
  style={{display: 'block', width: '85%', height: '540px', margin: '0 auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px'}}
  allow="autoplay; fullscreen"
/>

runtime と demo の build:

```bash
npm install

cd /Users/ethanjung/dev/soundtrace.js/STCoreV2/exaSound
./mainBuild.sh rebuild wasm release
./mainBuild.sh rebuild wasm release --use-thread

cd /Users/ethanjung/dev/soundtrace.js
npm run build

cd examples/three-basic
npm install
npm run build

cd /Users/ethanjung/dev/docs
rsync -a --delete --exclude '.DS_Store' \
  /Users/ethanjung/dev/soundtrace.js/examples/three-basic/dist/ \
  static/demos/three-basic/

npm run build
npm run serve
```

Vite dev serverはdefaultでCOOP/COEP headerを設定するため、MT modeも確認できます。文書に埋め込まれたiframeはstatic hostingでも動くように`?thread=st`で固定しています。

### 下部ボタン

| Control | 説明 |
|---|---|
| `Room` | 部屋全体colliderのmaterial選択 |
| `Collider` | static wallとFlair colliderのmaterial選択 |
| `Thread` | 開始前に`Single`または`Multi`を選択。MT不可環境では自動でST固定 |
| `Start Audio` | WASM、material、HRTF、MP3をloadしaudio開始。browser autoplay policyによりuser clickが必要 |
| `Move` / `Stop` | 音源を部屋内の楕円経路で移動、または現在位置で停止 |
| `Wall: On/Off` | listener近くのstatic wall colliderをsceneへ追加・削除 |
| `Flair: On/Off` | FBX skinned animation colliderをsceneへ追加・削除 |

`Flair`はskinningされたvertexを毎フレームsampleし、sound colliderとして使う例です。この経路は`LBVH + updateVertices + UpdateType.Refit`の組み合わせを示します。demoでBVH typeを`HKDtree`に変えた場合、Flairはbind poseベースのstatic inspection用として扱ってください。

### lil-guiパネル

| Panel | Control | 説明 |
|---|---|---|
| `Listener` | `Ray Width`, `Ray Height` | listener guide ray resolution。demo range `1..32` |
| `Listener` | `Ray Depth` | max path depth。demo range `1..16`, default `7` |
| `Debug overlays` | `Show Valid Paths` | propagation result polyline表示 |
| `Debug overlays` | `Show FPS` | Stats HUD表示 |
| `Colliders · BVH` | `Type` | `HKDtree`または`LBVH` |
| `Colliders · BVH` | `Max Depth` | BVH build depth。demo range `1..32` |
| `Colliders · BVH` | `Prims / Leaf` | leafあたりprimitive数。demo range `1..32` |
| `Colliders · BVH` | `Show BVH Boxes` | leaf AABB wireframe表示 |
| `Render Params` | `Max Delay Rate` | `0.01..0.5`, default `0.03`。delay変化速度制限 |
| `Render Params` | `Path Fade Time` | `0.005..0.2 s`, default `0.066`。path変更cross-fade |
| `Render Params` | `Max Path Delay` | `0.1..3.0 s`, default `1.0`。delay line最大長 |

### マウス操作

| 操作 | 説明 |
|---|---|
| 右ドラッグ | listener中心にcamera orbit |
| wheel | zoom |
| 青い矢印 | listener forward方向 |
| 赤い矢印 | listener right方向 |

## パフォーマンスチューニング順序

1. runtime appは`Ray Width = 16`, `Ray Height = 16`, `Ray Depth = 3`から開始します。
2. listener `Ray Width × Ray Height × Ray Depth`は必要な分だけ上げます。
3. static structureは`HKDtree`、animation colliderは`LBVH`に分けます。
4. animation colliderはtopologyを維持し、vertexだけ更新します。
5. pathが急に変わりすぎる場合は`Path Fade Time`を増やし、delay pitch wobbleが聞こえる場合は`Max Delay Rate`を下げます。
6. valid pathとBVH box overlayはdebug時だけ有効にします。

three.js demoは**1 listener + 1 source**を前提に、高品質とdebug visibilityを優先して設定されています。実際のappではgizmoは必須ではありません。特にvalid pathとBVH boxを描画する場合、WASM内部dataをJSへcopyしThree.js geometryとして再構成する通信・可視化overheadが発生します。開発中だけ有効にし、runtime配布では無効化することを推奨します。

## トラブルシューティング

| 症状 | 確認すること |
|---|---|
| MT load失敗 | HTML応答にCOOP/COEPがあり、`crossOriginIsolated`が`true`か確認 |
| `createWorkletNode` error | `SoundTrace`を`{ thread: 'mt' }`で作成したか確認 |
| 音が出ない | `ctx.resume()`をuser click内で呼んだか、`soundMaterial.json`がmaterial tableへloadされたか、absorption配列がreflection配列と同じcopyになっていないか確認 |
| 方向感がない | HRTF asset (`hrtf.bytes`) のload成功を確認 |
| frame rate低下 | `Ray Depth`, `Ray Width`, `Ray Height`を下げる。runtime開始値は`16 × 16 × depth 3`推奨 |
| mono inputが無音 | SDKはworklet node channel countを`2`, `explicit`, `speakers`に固定します。手動作成時も同じ設定が必要 |
| path gizmoが残像のように見える | `getValidPaths()`が返した実countだけを使う |
| ray/path gizmoが見えない | sceneにsound collider objectが追加されているか確認 |
| animation colliderが跳ねる | `LBVH`, `updateVertices()`, `object.setUpdateType(UpdateType.Refit)`, `scene.tick()`の流れか確認 |
| BVH option変更後にcrash | `mesh.setData()`後、objectに`UpdateType.Rebuild`を設定し`scene.tick()`を実行 |

## 参考

- [SDK概要](./overview.md)
- [STCoreV2](../core/stcorev2.md)
- [デモ](../demos/overview.md)
