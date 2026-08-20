---
title: Unity
description: SoundTrace Unity SDK のインストール、主要コンポーネント API、HRTF、GPU/BVH、Surface および Solid Distance Transmission の設定。
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK は、Unity のメッシュ、Renderer のマテリアルスロット、音源、リスナーを
[STCoreV2](../core/stcorev2.md) に接続するリアルタイム空間オーディオプラグインです。

このページは、現在の Unity SDK の公開コンポーネントと Inspector の仕様に基づいています。

## 要件とプラットフォーム

| 項目 | 現在のパッケージ基準 |
|---|---|
| Unity | 2022.3 LTS 以降 |
| バンドル済みネイティブプラグイン | macOS、Windows x64、iOS、Android |
| Linux | 現在のパッケージにはバイナリがないため、Linux ホストで別途ビルドが必要 |
| Unity WebGL | 未対応。Unity WebGL では `OnAudioFilterRead` ベースの DSP 処理を使用できません |

`Use GPU Backend` は、reflection と reverb propagation に WebGPU compute provider を
要求します。diffraction は CPU で計算します。実際に有効になるかどうかはネイティブ
プラグインとデバイスによって決まり、GPU の初期化に失敗した場合は CPU propagation を使用します。

## インストール

SoundTrace Unity SDK パッケージとインストール手順は、契約済みの評価・ライセンス
配布チャネルから提供されます。受領した配布物に含まれる手順に従ってください。

サンプルは Package Manager で SoundTrace SDK を選択し、`Samples > Demo Assets > Import` から
インポートします。

## Unity Audio 設定

1. `Edit > Project Settings > Audio` を開きます。
2. `Default Speaker Mode` を `Stereo` に設定します。
3. `DSP Buffer Size` を `Best latency` に設定します。

![Unity Audio 設定](/img/unity/Image01_AudioSetting.png)

この設定が異なる場合、Manager と Listener の Inspector に警告が表示されます。

## Audio Asset Import 設定

モノラルのサウンドソースの使用を前提とし、オーディオクリップは PCM フォーマットに設定します。

![Audio Asset Import 設定](/img/unity/ImportSetting.png)

## 最短セットアップ

1. 空の GameObject に `SoundTraceManager` を追加します。
2. Main Camera に `SoundTraceListener` を追加します。
3. 音源 GameObject に `SoundTraceSource` を追加し、同じ GameObject の `AudioSource` に clip を設定します。
4. 音響 geometry として使用する Mesh GameObject に `SoundTraceObject` を追加します。
5. 必要に応じて、Manager と同じ GameObject に `SoundTracePathVisualizer` を追加します。
6. Play Mode で Console エラー、音声、path を確認します。

同時にロードされている scene 全体で、有効な Manager と Path Visualizer はそれぞれ 1 つだけ
使用できます。複数の Listener を登録できますが、Source のレンダリングには最初に登録された
`PrimaryListener` が使用されます。

## コンポーネント概要

| コンポーネント | 役割 | 必須依存関係 |
|---|---|---|
| `SoundTraceManager` | ランタイム、scene、マテリアル登録、propagation backend の管理 | ランタイムごとに 1 つ |
| `SoundTraceListener` | Listener transform、ray 品質、出力/HRTF 設定 | 有効な Manager |
| `SoundTraceSource` | `AudioSource` 出力の空間化、path ごとの設定 | 同じ GameObject の `AudioSource`、有効な Listener |
| `SoundTraceObject` | Mesh と submesh のマテリアルを音響 scene に登録 | `MeshFilter`、`MeshRenderer` |
| `SoundTracePathVisualizer` | 有効な path と hit triangle のデバッグ表示 | Manager と同じ GameObject |

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| フィールド | デフォルト値 | 動作 |
|---|---:|---|
| `bool propagateOnStart` | `true` | `Start()` で初期 scene graph と transform を同期した後、最初の propagation を要求します。 |
| `bool loadDefaultMaterialsOnEnable` | `true` | `OnEnable()` でバンドル済み Material Preset Library をネイティブ material table に登録します。 |
| `int propagationThreadCount` | `-1` | サウンドエンジン内部の propagation job 実行スレッド数を指定します。ネイティブで `-1` は `std::thread::hardware_concurrency()` が返す論理スレッド数を基準に自動設定され、`0` と `1` はシングルスレッドで動作します。`2` 以上は呼び出しスレッドを含め、指定した数を使用します。 |
| `bool useGpuBackend` | `false` | propagation を job マルチスレッドではなく GPU compute shader で計算します。 |
| `int pathCacheSize` | `256` | 生成される path の cache buffer size で、最小値は `0`、最大値は `1024` です。値を大きくすると空間オーディオの効果が向上しますが、計算量も増加します。デバイス性能に応じて、デフォルト値の `256` より低い値から始めることを推奨します。 |

### 公開プロパティ

| プロパティ | 型 / アクセス | 正確な意味 |
|---|---|---|
| `Instance` | `static SoundTraceManager` / `get; private set;` | 同時にロードされているすべての scene で使用するシングルトン Manager です。有効な Manager がない場合は `null` です。 |
| `DefaultMaterialsLoaded` | `int` / `get; private set;` | `OnEnable()` で自動登録されたバンドル済みマテリアル数です。自動ロードが無効、または asset がない場合は `0` です。 |
| `Scene` | `SoundScene` / `get; private set;` | Manager が所有する低レベル scene です。無効状態、または初期化失敗後は `null` です。 |
| `PrimaryListener` | `SoundTraceListener` / `get` | Source のレンダリングに使用される、最初に登録された Listener です。登録済み Listener がなければ `null` です。 |
| `ListenerCount` | `int` / `get` | Manager に現在登録されている Listener の数です。 |
| `SourceCount` | `int` / `get` | Manager に現在登録されている Source の数です。 |
| `ObjectCount` | `int` / `get` | Manager に現在登録されている Object の数です。 |
| `LastValidPathCount` | `int` / `get; private set;` | 最後に完了した propagation 結果の有効 path 数です。propagation を実行できない場合は `0` です。 |
| `LastNativeError` | `string` / `get; private set;` | 直近の scene graph または propagation エラーです。エラーがない場合は空文字列です。 |
| `PropagationThreadCount` | `int` / `get` | propagation job の実行スレッド数です。`-1` は最大値を意味します。 |
| `IsGpuPropagate` | `bool` / `get; private set;` | `exaPropagatorInitGpu()` が成功し、GPU propagation provider が有効になったかを表します。 |
| `GpuBackendStatus` | `string` / `get; private set;` | GPU Backend の初期化結果です：`GPU active` または `CPU fallback (<ExaResult>): <error>`。 |
| `PathCacheSize` | `int` / `get` | 生成される path の cache buffer size です。 |

### 公開メソッド

| メソッド | 動作 |
|---|---|
| `public void ResetMotionState()` | teleport、respawn、scene 遷移の直後に、登録済みのすべての Listener と Source の motion history を初期化します。 |

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

通常は Main Camera に追加します。

### Inspector

| フィールド | デフォルト値 | 範囲/選択肢 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`, `Fast`, `Middle`, `Quality` |
| `Ray Resolution` | `16` | `1..32`。水平/垂直に同じ値を適用 |
| `Ray Depth` | `4` | `1..16` |
| `Output Mode` | `Headset` | `Headset`, `Speaker` |
| `HRTF` | `HRIR Interpolated` | 以下の 3 モード |

`Fast`、`Middle`、`Quality` を選択すると、ray 値と関連する render 品質値がまとめて
適用され、Inspector の ray フィールドは無効になります。値を直接編集するには、先に
`Custom` を選択してください。プリセットから `Custom` に戻すと、最後に適用された値が保持されます。

| プリセット | Ray Resolution | Ray Depth | 推奨開始点 |
|---|---:|---:|---|
| `Custom` | 保存された値 | 保存された値 | 手動チューニング |
| `Fast` | `16` | `4` | モバイル、多数の音源 |
| `Middle` | `24` | `8` | 一般的なゲームとデスクトップ |
| `Quality` | `32` | `12` | 音響の比重が大きく、その他の処理負荷が小さいアプリ |

### HRTF と出力モード

| モード | 必要な asset | 説明 |
|---|---|---|
| `Band8` | なし | 外部 HRTF table を読み込まない軽量モード |
| `Hrir` | `KU100_convolution.bytes` | HRIR モード |
| `HRIR Interpolated` | `KU100_convolution.bytes` | HRIR モードに補間計算を適用し、方向感を向上させます。 |

Asset は `Runtime/Resources/SoundTrace/HRTF/` から読み込まれます。必要な asset が存在しない、
または空の場合、Listener の初期化は失敗し、別のモードへ自動的に切り替わることはありません。

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource` は、同じ GameObject の `AudioSource` 出力を処理します。有効化時に、
SoundTrace が空間化と Doppler を担当するように `AudioSource.spatialBlend` と
`AudioSource.dopplerLevel` を `0` に設定します。

### Inspector

| フィールド | デフォルト値 | 動作 |
|---|---:|---|
| `Intensity` | `1` | Source の放射強度です。範囲は `0..10` です。 |
| `Ray Resolution` | `24` | Reverb ray の水平・垂直解像度に同じ値を適用します。範囲は `1..32` です。 |
| `Reverb Ray Depth` | `4` | Reverb ray の最大反射深度です。範囲は `1..16` です。 |
| `Enable Direct` | `true` | Direct path を有効にします。 |
| `Enable Reflection` | `true` | Reflection path を有効にします。 |
| `Enable Diffraction` | `true` | Diffraction path を有効にします。 |
| `Enable Reverb` | `true` | Reverb path を有効にします。 |
| `Enable Transmission` | `true` | Transmission path を有効にします。 |
| `Direct Attenuation` | `1.0` | Direct path の距離減衰です。値が大きいほど、同じ距離で音が小さく聞こえます。範囲は `0.5..1.5` です。 |
| `Reflection Attenuation` | `1.0` | Reflection path の距離減衰です。値が大きいほど、同じ距離で音が小さく聞こえます。範囲は `0.5..1.5` です。 |
| `Diffraction Attenuation` | `1.0` | Diffraction path の距離減衰です。値が大きいほど、同じ距離で音が小さく聞こえます。範囲は `0.5..1.5` です。 |
| `Reverb Attenuation` | `1.0` | Reverb path の距離減衰です。値が大きいほど、同じ距離で音が小さく聞こえます。範囲は `0.5..1.5` です。 |
| `Transmission Attenuation` | `1.0` | Transmission path の距離減衰です。値が大きいほど、同じ距離で音が小さく聞こえます。範囲は `0.5..1.5` です。 |
| `Max Delay Seconds` | `1.0 s` | Source renderer が保持する propagation delay の最大値です。長くするほどメモリ使用量が増加します。範囲は `0.01..5 s` です。 |
| `Path Fade Time Seconds` | `0.066 s` | Path が renderer に入る、または消える際の fade 時間です。範囲は `0.001..0.5 s` です。 |
| `Path Hold Time Seconds` | `0.120 s` | 消えた non-direct path が fade を開始するまで保持する時間です。`0` は hold を無効にします。 |
| `Max Delay Rate` | `0.1` | sample ごとに許可する delay 変化量の上限です。範囲は `0.001..0.999` です。 |
| `Bypass` | `false` | SoundTrace spatial rendering をスキップし、元の `AudioSource` 出力をそのまま渡します。 |

Distance Attenuation の値が大きいほど、該当 path の距離減衰が速くなります。`Show Gizmo` は
Direct、Reflection、Diffraction、Reverb、Transmission ごとの到達範囲を Scene View に
個別表示します。

Render Tuning は source-listener の組に適用されます。`Path Hold = 0` は hold を無効にします。

### 公開メソッド

| メソッド | 動作 |
|---|---|
| `SetBypass(bool enabled)` | `true` の場合は SoundTrace spatial rendering をスキップし、元の `AudioSource` 出力をそのまま渡します。`false` の場合は SoundTrace rendering を再び適用します。 |
| `ResetMotionState()` | 現在の Transform を motion の基準点として再設定し、速度を `0` として反映することで、teleport や respawn 後の Doppler spike を防ぎます。 |

複数の `AudioSource` の再生タイミングを合わせる場合は、同じ `AudioSettings.dspTime` を基準に
`PlayScheduled()` を呼び出してください。

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject` は、`MeshFilter.sharedMesh` と Renderer の submesh マテリアルスロットを登録します。
Build でメッシュデータを読み取る必要があるため、Import Settings の `Read/Write Enabled` を有効にしてください。

### Geometry と BVH

![Scene View に表示した BVH](/img/unity/Img_STObjDome.png)

| フィールド | デフォルト値 | 説明 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`, `LBVH`, `LBVH_SIMD4`, `LBVH_SIMD8`, `LBVH_SIMD16` |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Update Mode` | `Static` | `Static`, `Dynamic`, `Refit`, `Rebuild` |

#### BVH Type

| BVH Type | 説明 |
|---|---|
| `HKDTree` | KD 分割ベースの traversal です。Refit に対応していますが、Refit 後は BVH-style fallback traversal に切り替わります。GPU backend には対応していません。 |
| `LBVH` | Morton code ベースで、HKDTree より rebuild が速く、Refit に対応しています。低レベル API で vertex をアップロードしてから Refit することで、SkinnedMesh や procedural mesh の変形に適用できます。scalar 形式は GPU backend に対応していません。 |
| `LBVH_SIMD4` | LBVH leaf intersection を 4 個単位の SIMD batch で並列処理します。Refit 対応および GPU Backend 対応。 |
| `LBVH_SIMD8` | LBVH leaf intersection を 8 個単位の SIMD batch で並列処理する現在のデフォルト値です。Refit 対応および GPU Backend 対応。 |
| `LBVH_SIMD16` | LBVH leaf intersection を 16 個単位の SIMD batch で並列処理します。Refit 対応および GPU Backend 対応。 |

GPU を要求した scene で `HKDTree` または scalar `LBVH` を選択すると、Inspector に警告が表示されます。

#### Update Mode

| Update Mode | STCoreV2 update policy | 意味 |
|---|---|---|
| `Static` | `EXA_OBJECT_UPDATE_STATIC` (0) | 実行時の TLAS/BLAS 更新を行いません。動かない level geometry に使用します。 |
| `Refit` | `EXA_OBJECT_UPDATE_REFIT` (1) | Deformation 用のポリシーです。mesh BLAS を refit し、TLAS bounds を更新します。topology が変わらない skinned・procedural mesh が対象です。 |
| `Rebuild` | `EXA_OBJECT_UPDATE_REBUILD` (2) | Topology が変わる geometry に使用し、BVH を再ビルドします。 |
| `Dynamic` | `EXA_OBJECT_UPDATE_DYNAMIC` (3) | Transform のみ変化する場合に TLAS instance だけを更新します。 |

#### Refit と vertex アップロード

`Refit` は STCoreV2 における **vertex 変形（skinned animation）のための update policy** です。
ただし core は vertex をいつアップロードするかを自分では決めません。mesh の更新は
`exaMeshUpdateVertices` → `exaMeshRefit` の 2-call protocol であり、object の `Refit` は
その結果を BLAS と TLAS bounds に反映させるためのポリシースイッチです。つまり
**vertex をアップロードするのは host SDK 側**です。

現在 Unity の `SoundTraceObject` MonoBehaviour は Transform だけを自動同期し、vertex の
アップロードは呼び出しません。`MeshFilter`/`MeshRenderer` を要求するため
`SkinnedMeshRenderer` を直接バインドせず、mesh geometry は `OnEnable` 時に一度だけ
スナップショットされます。したがって Unity で skinned・procedural の変形を音に反映するには、
`Update Mode` を `Refit` にしたうえで、以下のように `MeshCore` から vertex を自分で
アップロードしてください。UE プラグインの `SoundTracingObjectComponent` は、この
アップロードを skeletal mesh に対して自動的に実行します。

```csharp
using Exarion.SoundTrace;
using Exarion.SoundTrace.Core;
using Exarion.SoundTrace.Native;
using UnityEngine;

[RequireComponent(typeof(SoundTraceObject))]
public sealed class SoundTraceSkinnedRefit : MonoBehaviour
{
    [SerializeField] private SkinnedMeshRenderer skin;

    private SoundTraceObject _object;
    private Mesh _baked;
    private ExaVec3f[] _vertices;

    private void Awake()
    {
        _object = GetComponent<SoundTraceObject>();
        _baked = new Mesh();
    }

    private void LateUpdate()
    {
        SoundMeshCore mesh = _object.MeshCore;
        if (mesh == null || !mesh.IsValid)
            return;

        // 1) 現在の pose を bake して vertex を読み取ります。Unity Mesh API なので main thread です。
        skin.BakeMesh(_baked);
        Vector3[] baked = _baked.vertices;
        if (_vertices == null || _vertices.Length != baked.Length)
            _vertices = new ExaVec3f[baked.Length];
        for (int i = 0; i < baked.Length; ++i)
            _vertices[i] = new ExaVec3f(baked[i].x, baked[i].y, baked[i].z);

        // 2) アップロードと refit は control thread で 2-call protocol として実行します。
        ExaVec3f[] vertices = _vertices;
        SoundTraceControlThread.Invoke(() =>
        {
            if (mesh.UpdateVertices(vertices))
                mesh.Refit();
        });
    }

    private void OnDestroy()
    {
        if (_baked != null)
            Destroy(_baked);
    }
}
```

注意点です。

- vertex 数は build 時と **完全に一致**している必要があります。`exaMeshUpdateVertices` は
  不一致を `EXA_ERR_INVALID_ARG` として拒否します。`MeshFilter.sharedMesh` に
  `SkinnedMeshRenderer` の bind pose mesh を設定して数を合わせてください。
- vertex は mesh local 座標系のままアップロードします。object の position・rotation・scale は
  `SoundTraceObject` が別途同期するため、`BakeMesh` も scale を適用しない形で使用してください。
- native mesh は `SoundTraceMeshCache` が Mesh asset・material slot・BVH 設定をキーとして
  refcount 共有します。同じ組み合わせを使う object が複数ある場合、1 つを refit すると
  すべてが同じ変形を受けます。個別に変形させたい場合は object ごとに別の Mesh instance を
  使用してください。
- `SoundTraceControlThread.Invoke` は blocking 呼び出しです。毎フレーム多数の object に対して
  呼び出すと、main thread が control thread の propagation frame の後ろで待機します。refit
  対象は少数の object に限定してください。
- BVH Type は refit 可能な `LBVH` 系を使用してください。`HKDTree` も refit されますが、その後
  traversal が BVH-style fallback に切り替わります。
- triangle index が変わる topology 変更は refit では扱えません。`MeshCore.SetData(...)` で
  再ビルドし、`Update Mode` を `Rebuild` にしてください。

### 公開メソッド

`Auto Set` は Renderer material の名前をバンドル済み preset と照合します。Imported model の root に
mesh がなく、child が geometry を所有している場合は `Add To Child Meshes` を使用してください。

| メソッド | 動作 |
|---|---|
| `AutoSetMaterialSlots()` | すべての submesh を走査し、Renderer material 名をバンドル済み preset と自動照合してスロット構成を更新します。 |
| `GetMaterialPresetIndex(int slotIndex)` | 指定したスロットの preset index を返します。スロットがない場合、または index が無効な場合は `0` を返します。 |
| `GetPresetName(int slotIndex)` | 指定したスロットに適用された preset の表示名を返します。preset が見つからない場合は `Concrete` を返します。 |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 1 つのスロットの preset を変更します。`presetIndex` は最小 `0` に補正され、スロット index が無効な場合は `false` を返します。 |
| `SetMaterialPresetForAllSlots(int presetIndex)` | すべてのスロットに同じ preset を適用します。`presetIndex` は最小 `0` に補正され、適用するスロットがない場合は `false` を返します。 |
| `GetNativeMaterialIndices()` | submesh ごとの preset index を native mesh 登録用の配列形式で返します。空または不足しているスロットには `0` を使用します。 |
| `GetTriangleCount()` | すべての submesh の index 数を合計し、triangle 数を返します。mesh がない場合は `0` です。 |
| `static IsGpuCompatibleBvhType(BvhType value)` | `LBVH_SIMD4`、`LBVH_SIMD8`、`LBVH_SIMD16` の場合に `true` を返します。 |

## サウンドマテリアルと Transmission

デフォルトの authoring asset は
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset` です。
`SoundTrace > Material Preset Library` では、次の操作を実行できます。

- preset の追加、削除、並べ替え
- `soundMaterial.json` の import/export、およびバンドル JSON の再インポート
- Scattering と 8-band Reflection、Absorption、Transmission グラフの編集
- `Transmission Model` の選択

![Material Preset Library](/img/unity/Image_Mat_01.png)

周波数帯域の中心は `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、
`8000 Hz` です。マテリアルの順序と table index は一致させる必要があります。

![帯域別のマテリアルグラフ編集](/img/unity/Image_Mat_02.png)

### Transmission Model

| モデル | 入力 | Geometry の条件 |
|---|---|---|
| `Surface` | 各帯域で表面を通過した後に残る伝送エネルギー係数 `0..1` | 開いた面と薄い surface で使用可能 |
| `Solid Distance` | 各帯域で伝送エネルギーが `-30 dB` になるマテリアル基準距離 (m)、`0` 以上 | 閉じたボリュームと一貫した面の向きが必要 |

`Solid Distance` の入力は object の実際の厚さではありません。ランタイムは geometry 内部の実際の
通過距離に応じて減衰を適用します。モードを変更しても 8 個の値は自動計算されないため、
検証済みの値をすべて入力し、デフォルトの `0` のままにしないでください。

JSON に `transmissionDistanceToMinus30DbMeters` が存在しない場合は `Surface`、有限かつ
0 以上の値が正確に 8 個存在する場合は `Solid Distance` です。`Surface` として export する場合、
このフィールドは `null` や空配列ではなく省略されます。

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

Manager と同じ GameObject に 1 つだけ追加します。

| Inspector フィールド | デフォルト値 | 説明 |
|---|---:|---|
| `Enable Path Visualization` | オン | path mesh を表示するかどうか |
| `Refresh Interval Ms` | `50` | 可視化 mesh を再生成する最小間隔。音響 propagation の周期には影響しません |
| `Max Visualized Paths` | `1024` | 表示する path の最大数 |
| `Path Width` | `0.08` | 線幅 |
| `Path Alpha Intensity` | `0.5` | 表示強度 |
| `Draw Hit Triangles` | オフ | Scene View に hit triangle を表示 |

Direct、Reflection、Diffraction、Reverb、Transmission を path 種別ごとの色で表示します。
このコンポーネントはデバッグ用です。性能測定時と release build では無効にしてください。

主要な公開メンバーは `Instance`、設定/カウントプロパティ、`Render()`、`Clear()` です。

## サンプル

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

基本的な room、source、listener、geometry、material preset、path visualization を確認します。

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

source/listener の移動、material preset の変更、Unity の元の audio と SoundTrace 出力の比較を
確認します。

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

広い空間の複数 source、wall occlusion、移動中の HRTF 方向感と room response を確認します。

## トラブルシューティング

| 症状 | 確認事項 |
|---|---|
| 音が出ない | Console の最初の Manager 初期化エラー、Stereo/Best latency、AudioSource clip、Manager/Listener の有無 |
| Source/Listener/Object が Manager を要求する | cascade エラーより先に記録された `Failed to initialize SoundTraceManager` の原因を確認 |
| HRTF の初期化に失敗する | 選択したモードの Resources asset が存在するか、空ファイルではないかを確認 |
| Geometry が反映されない | `Read/Write Enabled`、MeshFilter/MeshRenderer、child mesh の位置、登録状態 |
| 実行中に変形した mesh が反映されない | `Update Mode` だけでは vertex/topology はアップロードされません。別途、低レベルの geometry 更新経路が必要です |
| GPU が有効にならない | `GpuBackendStatus`、Console に表示された fallback の理由、Object で SIMD BVH が選択されているかを確認 |
| Teleport 後に pitch が跳ねる | transform の変更直後に `ResetMotionState()` を呼び出す |
| 性能が不足する | `Quality → Middle → Fast` の順で変更し、path cache buffer を減らしてから path visualizer を無効化して確認 |
| 複数の音源が comb filtering のように聞こえる | 同じ `AudioSettings.dspTime` で `PlayScheduled()` を実行 |

## 次のドキュメント

- [SDK 概要](./overview.md)
- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
