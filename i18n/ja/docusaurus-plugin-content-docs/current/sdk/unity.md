---
title: Unity
---

# SoundTrace SDK for Unity

SoundTrace SDK for Unityは、ネイティブエンジン [STCoreV2](../core/stcorev2.md) をUnityで使うためのリアルタイム空間音響プラグインです。Unityシーンのメッシュ、レンダリングmaterial slot、音源、リスナーTransformをSoundTraceランタイムへ渡し、direct、reflection、diffraction、reverb、transmission pathを計算してUnity `AudioSource` の出力へ反映します。

## Requirements

| 項目 | 要件 |
|---|---|
| Unity | `2022.3.62f2`以上 |
| プラットフォーム | macOS, Windows, Linux, iOS, Android, WebGL |

## Unity Project Setup

### Unity Audio設定

1. `Edit > Project Settings > Audio`を開きます。
2. `Default Speaker Mode`を`Stereo`に設定します。
3. `DSP Buffer Size`を`Best latency`に設定します。

![Unity Audio設定画面](/img/unity/Image01_AudioSetting.png)

## Getting Started

![モデルRead/Write設定](/img/unity/Image02_ModelRW.png)

1. `Read/Write Enabled`を有効にしたメッシュをシーンへ配置し、`SoundTraceObject`を追加します。

![SoundTraceObjectコンポーネント](/img/unity/Image03_SoundTraceObject.png)

2. リスナー役のGameObjectに`SoundTraceListener`を追加します。Unity標準の`AudioListener`と一緒に構成してください。標準Unityシーンでは`AudioListener`がすでにMain Cameraに付いている点に注意してください。

![SoundTraceListenerコンポーネント](/img/unity/Image04_Listener.png)

3. ソース役のGameObjectを作成し、`SoundTraceSource`を追加します。Unity `AudioSource`は自動的に追加されます。

![SoundTraceSourceコンポーネント](/img/unity/Image05_Source.png)

4. Unity `AudioSource`に再生したいaudio clipを割り当てます。
5. マネージャー役のGameObjectを作成し、`SoundTraceManager`と`SoundTracePathVisualizer`を追加します。

![SoundTraceManagerとPath Visualizerコンポーネント](/img/unity/Image06_Manager.png)

6. リスナー、ソース、`SoundTraceObject` geometryの間で反射音響pathが作られる位置へ再配置します。

![リスナー、ソース、ジオメトリの配置](/img/unity/Image07_Positioning.png)

7. Play Modeを実行します。
8. `SoundTracePathVisualizer`でpath visualizationを有効にします。
9. リスナー、ソース、オブジェクトの間に反射path lineが表示されれば、基本接続は成功です。

![反射path lineの成功確認](/img/unity/Image08_Success.png)

10. リスナーまたはソースの位置を動かし、音が物理的に変化するか確認します。
11. `SoundTraceObject`の`Update Mode`が`Static`の場合、Transformを動かしてもruntime geometry update用の再構築は行いません。
12. 移動が必要なオブジェクトには`Refit`を使います。

![移動可能オブジェクト設定](/img/unity/Image09_Movable.png)

13. `Rebuild`は形状が大きく変わる場合だけ使い、毎frame rebuildする構成は避けます。

![移動後のpath確認](/img/unity/Image10_Moved.png)

## Main Features

### SoundTraceObject

`SoundTraceObject`はUnity `MeshFilter`/`MeshRenderer`をSoundTrace collision geometryとして登録します。現在`MeshFilter`と`MeshRenderer`ベースのコンポーネントであり、SoundTrace geometryとして使うメッシュはimport settingで`Read/Write Enabled`が必要です。`SkinnedMeshRenderer`のvertex deformationを毎tick自動bakeするものとして想定しないでください。

レンダリングmaterial自体を変更する機能ではありません。各render material slotをSoundTrace material preset indexへ対応付け、そのindexを該当submesh triangleに付与します。

### Sound material slots

- `Auto Set`はUnity render material名を読み、最も近いSoundTrace material presetを自動割り当てします。
- たとえば`Sword`のようなファンタジー剣モデルのmaterial名に`Metal`が含まれる場合、`Steel`系presetへ割り当てられます。
- 一致する名前がない、またはmaterialが空の場合のfallbackは`Concrete`です。
- 自動割り当てが違う場合は、各submesh rowのdropdownから手動でpresetを選びます。
- 反射を強く確認したい場合は`Steel`/`Marble`、吸音を確認したい場合は`Snow`/`Soil`、透過を確認したい場合は`Fabric`でテストすることを推奨します。

### BVH and update mode

| 設定 | 説明 |
|---|---|
| `HKDTree` | SBVHに近い性格の高ディテール構造です。Raycastが速く、穴のある複雑な静的背景メッシュでprimitive detailを保ちやすいです。代わりにrebuildは遅くなります。 |
| `LBVH` | buildが速い標準LBVHです。複雑な形状ではgeometryをより粗く近似するため、デザイナーが作った穴が塞がったように動作する場合があります。 |
| `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` | LBVH系のSIMD variantです。複雑なシーンほど高いSIMD widthの選択肢が有利になる場合があります。 |
| `bvhMaxDepth` | BVH最大depthです。大きいほどtraversal pruningの効果を受けやすいため、まず大きめの値からテストする構成を推奨します。 |
| `primitivesPerLeaf` | 最終leaf nodeに入るtriangle数です。小さくするとdetailは上がりますが、build/traversal costが変わります。 |
| `Static` | 静的geometry用です。runtimeの移動や形状変更を伝播へ反映しない構成で使います。 |
| `Refit` | 既存構造を維持しながらruntime transformまたはshape updateへ追従します。 |
| `Rebuild` | topologyまたは形状がBVH再構築を必要とするほど変わる場合だけ使います。 |

### SoundTraceListener

`SoundTraceListener`はシーンのリスナーです。毎frame Transform positionとorientationをネイティブlistenerへ同期し、listener ray設定とpath type enableを保持します。

| 設定 | 説明 |
|---|---|
| `Ray Resolution` | listener guide rayの解像度です。範囲は`1-64`で、1つの値がnative listener widthとheightの両方へ同じように適用されます。値が`16`の場合は`16 x 16` guide rayを使います。 |
| `Ray Depth` | rayの反射/伝播depthです。範囲は`1-16`です。値が大きいほど残響感と複雑なpath表現は向上しますが、計算量も増えます。 |
| `Per-path enable` | `Direct`, `Reflection`, `Diffraction`, `Reverb`, `Transmission` pathをtype別に有効化または無効化します。 |

複雑なゲームシーンの初期値は`Ray Resolution 16`、`Ray Depth 4`を推奨します。

### SoundTraceSource

`SoundTraceSource`はUnity `AudioSource`を必要とするSoundTrace音源コンポーネントです。Unity audio filter callbackである`OnAudioFilterRead`で入力bufferをSoundTrace spatial outputへin-placeレンダリングします。

| 設定 | 説明 |
|---|---|
| `Intensity` | ソースの基本強度です。 |
| `Gain Boost Db`, `Reverb Send Db`, `Reflection Send Db` | 全体gainとreverb/reflection send levelをdB単位で調整します。 |
| `Reverb Rays` | ソース側の残響ray設定です。`Ray Resolution`の範囲は`1-64`で、reverb ray widthとheightの両方へ同じように適用されます。`Reverb Ray Depth`の範囲は`1-16`です。listener rayとは別設定です。 |
| `Per-path enable` | ソース単位でpath typeを有効化または無効化します。 |
| `Distance Attenuation` | path type別の減衰範囲を調整します。現在のinspector sliderはattenuation constantを制御し、値が大きいほど有効範囲が小さくなります。 |
| `Distance Attenuation Gizmos` | path type別の減衰範囲をScene Viewのwire sphereで表示します。 |
| `Bypass` | SoundTrace空間レンダリングをスキップし、元の`AudioSource`出力をそのまま通します。 |

### SoundTraceManager

`SoundTraceManager`はシーンごとのSoundTrace runtime ownerです。listener、source、objectはenable時にmanagerへ登録され、managerがscene tickとpropagation updateを実行します。

### SoundTraceManager settings

| 設定 | 説明 |
|---|---|
| `Propagation Interval Ms` | ray-trace propagation passを実行する間隔です。position sync tickは毎frame実行され、propagationはこの間隔でthrottleされます。 |
| `Propagate On Start` | `Start()`時点でscene graphを一度flushし、続けてpropagation passとvisualizer updateを即時に一度実行します。次のpropagationは`Propagation Interval Ms`後に実行されます。 |
| `Load Default Materials On Enable` | パッケージの標準`SoundTraceMaterialPresetLibrary.asset`をnative material tableへ登録します。 |
| `Propagation Thread Count` | 内部job systemのworker数です。`-1`の場合、STCoreV2がlogical hardware threadを基準に選択します。アプリケーション側でCPU budgetを見て割り当てる必要があり、実運用テストでは3 thread以上から始める構成を推奨します。 |

### SoundTracePathVisualizer

`SoundTracePathVisualizer`はvalid pathをruntime line rendererとして表示するデバッグコンポーネントです。reflection、diffraction、reverb、transmission pathがシーン内でどう生成されるかを目視確認するために使います。

| 設定 | 説明 |
|---|---|
| `Enable Path Visualization` | path line renderingを有効化または無効化します。 |
| `Max Visualized Paths` | 画面に表示する最大path数です。 |
| `Path Width` | line widthです。 |
| `Path Alpha Intensity` | attenuationベースのalpha scaling強度です。 |
| `Draw Valid Paths`, `Draw Hit Triangles` | Scene View debug drawing optionです。 |

### SoundTraceMaterialPresetLibrary

標準material preset libraryはパッケージ内の`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`にあります。Unityメニュー`SoundTrace > Material Preset Library`から選択できます。

各presetは8-bandの`Reflection`, `Absorption`, `Transmission`と`Scattering`値を持ちます。ScriptableObjectを直接編集してmaterial propertyを変更したり、新しいpresetを追加したりできます。inspector toolbarから`soundMaterial.json`のimport/exportも可能です。

## Samples

:::info 予定
サンプル文書は別ページとして追加予定です。
:::

## Troubleshooting

:::info 予定
トラブルシューティング文書は別ページとして追加予定です。
:::
