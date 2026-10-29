---
title: Unity
description: SoundTrace Unity SDK 0.4.0（SimpleST 2.22.0 / ABI 6）のインストール、コンポーネントの Inspector 契約、HRTF・出力、ソース・出力 EQ、材質、FMOD/Wwise 統合モード、WebGL。
---

# SoundTrace SDK for Unity

SoundTrace Unity SDK は、Unity のメッシュ、Renderer のマテリアルスロット、音源、リスナーを
[SimpleST](../core/simplest.md) に接続するリアルタイム空間オーディオプラグインです。0.3.0 からエンジンが
STCoreV2 から SimpleST に変わり、0.4.0 は **SimpleST 2.22.0 / ABI 6** を使います（SDK リリース 2.22.0-jhj.5。以前の SDK
リリース 2.18.2-jhj.7 では同じ 0.4.0 が SimpleST 2.18.2 を使い、0.3.0 = SimpleST 2.12.0）。レンダラーは **Hybrid** で起動します。
今回のリリースでパッケージバージョンはそのままで、[ソース EQ と出力 EQ](#eq) が入り、リスナーの向きをクォータニオンで渡すため
頭部の傾き（roll）が反映されます（従来は yaw/pitch のみ）。2.18.2 SDK で[音源数の上限](#音源数の上限)と Android 最小 API 28 が
入りました。
`SoundTraceManager`、`SoundTraceListener`、`SoundTraceSource`、`SoundTraceObject`、
`SoundTracePathVisualizer` のコンポーネント名とスクリプト GUID、サンプルシーンはそのままです。

## 要件とプラットフォーム

| 項目 | 現在のパッケージ基準 |
|---|---|
| Unity | 2022.3 LTS 以降（2022.3.62f2 · 6000.3 で検証） |
| パッケージ | `SoundTrace-SimpleST-release.unitypackage`（基本・Wwise 用）/ `SoundTrace-SimpleST-FMOD-release.unitypackage`（FMOD エディション）→ `Assets/SoundTrace` |
| バンドル済みネイティブプラグイン | Windows x64 · macOS Universal · Linux x86_64 · Android（ARMv7/ARM64/x86_64、API 28+ — エンジン `.so` が `libaaudio` を直接リンクするため、ビルド段階で検査）· iOS 15+（device/simulator XCFramework）· WebGL |
| WebGL | 対応 — 独立した pthread WASM + AudioWorklet 経路（`OnAudioFilterRead` は未使用） |
| GPU | なし。`SoundTraceManager.IsGpuPropagate` は常に `false` |

## インストール

1. 対象プロジェクトの Unity を閉じる必要はありません。`Assets > Import Package > Custom Package` で
   `.unitypackage` を選ぶと `Assets/SoundTrace` にインストールされます。
2. STCoreV2 ベースの旧版 `Assets/SoundTrace` がある場合は、**先に Assets の外へバックアップ**してからインポートします。
   旧ネイティブプラグインが一緒にロードされないようにするためです。同じ SimpleST パッケージの更新は
   GUID を維持するため、上書きして構いません。
3. 配布フォルダーの `install.py` で自動インストールすることもできます。ファイルハッシュ・GUID を検査し、既存のインストールを
   プロジェクトの `.simplest-backups` に保存します。

```bash
python3 install.py /path/to/UnityProject
```

FMOD・Wwise と併用する場合は、下の [FMODと併用する](#fmodと併用する)・[Wwiseと併用する](#wwiseと併用する) に従います。
FMOD は FMOD エディションパッケージを入れるだけで済み、Wwise プラグインは Audiokinetic Launcher がインストールします。

サンプルは Package Manager で SoundTrace SDK を選択し、`Samples > Demo Assets > Import` から
インポートします。サンプル UI は `com.unity.ugui` がある場合にのみコンパイルされます。

## Unity Audio 設定

1. `Edit > Project Settings > Audio` を開きます。
2. `Default Speaker Mode` を `Stereo` に設定します。
3. `DSP Buffer Size` を `Best latency` に設定します。

![Unity Audio 設定](/img/unity/Image01_AudioSetting.png)

この設定が異なる場合、Manager と Listener の Inspector に警告が表示されます。出力サンプルレートはデバイスの
値をそのまま使い（SimpleST が内部の 44.1 kHz と変換）、デバイスレートが変わるとネイティブ状態を
同じ設定で再生成します。

## Audio Asset Import 設定

モノラルのサウンドソースの使用を前提とし、オーディオクリップは PCM フォーマットに設定します。WebGL では
`Decompress On Load` が必要です。

![Audio Asset Import 設定](/img/unity/ImportSetting.png)

## 最短セットアップ

1. 空の GameObject に `SoundTraceManager` を追加します。
2. `AudioListener` のある Main Camera に `SoundTraceListener` を追加します。
3. 音源 GameObject に `SoundTraceSource` を追加し、同じ GameObject の `AudioSource` に clip を設定します。
4. 音響 geometry として使用する Mesh GameObject に `SoundTraceObject` を追加します。
5. 必要に応じて、Manager と同じ GameObject に `SoundTracePathVisualizer` を追加します。
6. Play Mode で Console エラー、音声、path を確認します。

同時にロードされている scene 全体で、有効な Manager と Path Visualizer はそれぞれ 1 つだけ
使用できます。リスナーは SimpleST コンテキストごとに 1 つで、最初に登録された `PrimaryListener` がレンダーします。

## コンポーネント概要

| コンポーネント | 役割 | 必須の依存関係 |
|---|---|---|
| `SoundTraceManager` | ランタイム（コンテキスト・コントロールスレッド）、scene、材質登録、伝搬 | ランタイムごとに 1 個 |
| `SoundTraceListener` | Listener transform、ray 品質、出力/HRTF、遅延・フェード | 有効な Manager、`AudioListener` |
| `SoundTraceSource` | `AudioSource` 出力をモノストリームとして入力、path ごとの設定 | 同じ GameObject の `AudioSource`、有効な Listener |
| `SoundTraceObject` | Mesh と submesh 材質を音響 scene に登録 | `MeshFilter`、`MeshRenderer`（Read/Write Enabled） |
| `SoundTracePathVisualizer` | 有効 path と hit triangle のデバッグ表示 | Manager と同じ GameObject |

## オーディオの流れとスレッド

- `SoundTraceSource.OnAudioFilterRead` が入力を**モノのホストストリーム**（`st_rt_source_write_stream`）に
  入れ、Unity の dry 出力を消去します。`SoundTraceListener` のコールバックが空間音響ミックス全体を一度に
  取得します（`st_rt_render_process`、Buffered モード）。
- シーン変更・ソース生成/削除・伝搬・可視化スナップショットは専用の **control thread**（`SoundTraceControlThread`）で
  直列処理します。オーディオコールバックにはシーン制御 API やマネージドヒープ割り当てが入りません。
- 位置は固定ステップのモーションサンプリング（`SoundTraceFixedStepMotion`）で速度を推定します。テレポート
  後は `ResetMotionState()` で Doppler スパイクを防ぎます。
- レンダーを開始するたびに（再起動・HRTF トグルを含む）Hybrid（`reserved0 = 1`）と**エンジンリミッター無効**を明示し、
  マスターゲインは 0 dB にします。リミッティングは Unity ミキサーが担います — SimpleST 2.18 は生成直後に true-peak
  リミッター（137 サンプル遅延）を有効にするため、ラッパーが無効にします。レンダーオプションはエンジン生成時とスピーカーレイアウト
  変更時にのみプリセットで再適用され、`render_start` はそのまま維持します。
- エンジンを作成した直後に**等ラウドネス補正を無効にします**（`SoundTraceRuntime.DisableLoudnessCompensation`、WebGL を含む）。
  SimpleST 2.21 から生成直後に有効になる出力段の低域・高域シェルフで、音色とレベルは Unity ミキサーが担います。無効にした出力は
  エンジン 2.20 とビット一致します。

## SoundTraceManager

![SoundTraceManager Inspector](/img/unity/Img_STManager.png)

### Inspector

| フィールド | 既定値 | 動作 |
|---|---:|---|
| `Propagate On Start` | `true` | `Start()` で初期 scene graph と transform を同期した後、最初の伝搬を要求します。 |
| `Load Default Materials On Enable` | `true` | `OnEnable()` でバンドル済み Material Preset Library（SoundTrace ゲーム材質 22 種）をネイティブ材質テーブルに登録します。 |
| `Propagation Thread Count` | `-1` | SimpleST 計算プールの幅（`maxComputeThreads`）。`-1` は自動（論理スレッド数基準、エンジンが min(パフォーマンスコア, 6) に調整）、`0`/`1` はシングル、`2` 以上は指定数。ネイティブ初期化前に適用されます。 |

### 公開プロパティ

| プロパティ | 型 | 意味 |
|---|---|---|
| `Instance` | `static SoundTraceManager` | シングルトンの Manager。なければ `null` |
| `Scene` | `SoundScene` | Manager が所有する低レベル scene |
| `PrimaryListener` / `ListenerCount` / `SourceCount` / `ObjectCount` | — | 登録状況 |
| `DefaultMaterialsLoaded` | `int` | 自動登録されたバンドル材質数 |
| `LastValidPathCount` | `int` | 直近の伝搬の有効 path 数 |
| `LastNativeError` | `string` | 直近の scene graph/伝搬エラー |
| `PropagationThreadCount` | `int` | 適用された計算スレッド数 |
| `IsGpuPropagate` / `GpuBackendStatus` | `bool` / `string` | 互換用。常に `false` / `"CPU"` |

### 公開メソッド

| メソッド | 動作 |
|---|---|
| `ResetMotionState()` | teleport、respawn、scene 切り替えの直後に、すべての Listener と Source の motion history を初期化します。 |

### 音源数の上限

`SoundTraceRuntime.MaxSources`（静的 `uint`、既定 `0`）は、同時に生存するエンジン音源数の上限です。
`0` ならエンジンのプラットフォーム既定（デスクトップ 128 · Android/iOS 48 · WebGL 32）を使います。最初の `SoundTraceListener` が有効になる
**前に**設定します（`STRT_CreateOptions.maxSources` として渡されます）。上限を超える音源は例外を投げません —
`SoundSourceCore` が `ST_STATUS_BUDGET_EXCEEDED` を一度警告し、その `AudioSource` を dry のままにします。
エンジンのポリシーは [SimpleST — 音源メモリ予算](../core/simplest.md#音源メモリ予算)を参照してください。

```csharp
SoundTraceRuntime.MaxSources = 64;   // 最初の Listener 有効化の前
```

## SoundTraceListener

![SoundTraceListener Inspector](/img/unity/Img_STListener.png)

通常は Main Camera に追加します。

### Inspector

| フィールド | 既定値 | 範囲/選択肢 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`、`Fast`、`Middle`、`Quality` |
| `Ray Resolution` | `16` | `1..32`。リスナー guide ray の横/縦に同じ値 |
| `Ray Depth` | `4` | `1..16`。反射の最大深度 |
| `Output Mode` | `Headset` | `Headset`（バイノーラル）、`Speaker`（ステレオパンニング） |
| `HRTF` | `HRIR Interpolated` | 下記 3 モード |
| `Max Delay Seconds` | `0` | `0..5 s`。音源ごとの遅延リングの天井。`0` = エンジンのプラットフォーム天井（デスクトップ 2 s · Android/iOS 1 s · WebGL 0.5 s）。0 以外なら天井を上書きします（0.012 s 未満は 0.012 s） |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。経路の出現/消滅クロスフェード |
| `Output EQ` | 無効 | SimpleST のミックス全体にかけるパラメトリック EQ — [EQ](#eq) |

`Max Delay Seconds` の既定値は SDK リリース 2.18.2 で `2` → `0`（エンジンポリシー）に変わりました。エンジンは音源ごとに
経路が必要とする分だけ遅延リングを確保し、この値を天井としてのみ使います。`2` が保存された既存シーンは従来どおり動作します。
この値を保存したことのないリスナー（同梱サンプル 01–03 を含む）は `0` を使います。デスクトップは天井が 2 s のままなので変わりませんが、
Android/iOS では 1 s、WebGL では 0.5 s を超える経路がレンダリングされなくなります。これらのプラットフォームで従来の到達距離を保つには、リスナーの
`maxDelaySeconds` を `2` に設定してください。

`Fast`、`Middle`、`Quality` を選ぶと ray 値が一緒に適用され、Inspector でロックされます。直接
編集するには `Custom` を選んでください。

| プリセット | Ray Resolution | Ray Depth | 推奨の出発点 |
|---|---:|---:|---|
| `Custom` | 保存された値 | 保存された値 | 手動チューニング |
| `Fast` | `16` | `4` | モバイル、多数の音源 |
| `Middle` | `24` | `8` | 一般的なゲームとデスクトップ |
| `Quality` | `32` | `12` | 音響の比重が大きいアプリ |

### HRTF と出力モード

| モード | 必要な asset | 説明 |
|---|---|---|
| `Band8` | なし | 外部テーブルなしの軽量モード — SimpleST では**ステレオパンニング**としてレンダーされます |
| `Hrir` | なし | エンジン内蔵の **MIT KEMAR** HRIR |
| `HRIR Interpolated` | なし | MIT KEMAR HRIR（既定）。SimpleST は広帯域 HRIR コンボリューションを行います |

旧 `KU100_convolution.bytes` リソースはもう使われません。`Output Mode = Speaker` は
パンニング出力です。

## SoundTraceSource

![SoundTraceSource Inspector](/img/unity/Img_STSource.png)

`SoundTraceSource` は、同じ GameObject の `AudioSource` 出力をモノストリームとしてエンジンへ
送り込みます。有効化時に、SoundTrace が空間化と Doppler を担当するように `AudioSource.spatialBlend` と
`AudioSource.dopplerLevel` を `0` に設定します。

### Inspector

| フィールド | 既定値 | 動作 |
|---|---:|---|
| `Intensity` | `1` | 音源の放射強度（圧力倍率）。範囲 `0..10` |
| `Reverb Ray Resolution` | `24` | source transport ray の横・縦解像度。範囲 `1..32` |
| `Reverb Ray Depth` | `4` | transport ray の最大反射深度。範囲 `1..16` |
| `Enable Direct` / `Reflection` / `Diffraction` / `Reverb` / `Transmission` | `true` | path ごとのゲート |
| `Bypass` | `false` | SoundTrace レンダーをスキップし、元の `AudioSource` 出力をそのまま通す |
| `Source EQ` | 無効 | この音源信号にかけるパラメトリック EQ — [EQ](#eq) |

STCoreV2 の path ごとの `Distance Attenuation`（0.5 ~ 1.5）と `Max Delay Rate`、`Path Hold Time` は
ありません。SimpleST は物理 `1/r` 減衰と空気吸収を適用し、最大遅延とフェードは Listener の
設定です。Scene View の `Show Gizmo` は path ごとの可聴範囲を表示します。

### 公開メソッド

| メソッド | 動作 |
|---|---|
| `SetBypass(bool enabled)` | `true` のとき SoundTrace レンダーをスキップし、元の出力を通します。 |
| `ResetMotionState()` | 現在の Transform を motion の基準点として再設定し、teleport 後の Doppler spike を防ぎます。 |

複数の `AudioSource` の再生タイミングを合わせるには、同一の `AudioSettings.dspTime` を基準に
`PlayScheduled()` を呼んでください。

## EQ

SDK リリース 2.22.0-jhj から、SimpleST のパラメトリック EQ を 2 か所で使います。

| 位置 | Inspector | スクリプト | かける場所 |
|---|---|---|---|
| ソース EQ | `SoundTraceSource`（と `SoundTraceClipSource`）の `Source EQ` | `SetSourceEq(SoundTraceEq)`、`SetSourceEqEnabled(bool)`、`GetSourceEq()` | 音源信号、SimpleST のバンド分割の前。その音源のすべての経路が同じ音色 |
| 出力 EQ | `SoundTraceListener` の `Output EQ` | `SetOutputEq(SoundTraceEq)`、`SetOutputEqEnabled(bool)`、`GetOutputEq()` | SimpleST のミックス全体、レンダー末尾（マスターゲインの前） |

- `SoundTraceEq`: `enabled`、`preampDb`（−48 ~ +12）、`bands`（最大 16 個）。
- `SoundTraceEqBand`: `enabled`、`type`、`frequencyHz`（20 ~ 20,000）、`gainDb`（±24、Peaking・シェルフのみ）、`q`（0.1 ~ 30、シェルフは 3 まで）。
- `SoundTraceEqFilterType`: `Peaking (Bell)` · `Low Shelf` · `High Shelf` · `High Cut (Low-pass)` · `Low Cut (High-pass)` ·
  `Notch`。カットは 12 dB/oct 固定で、Inspector は Gain を使わない種類では Gain を隠します。
- 既定は無効で、無効の間はエンジンを呼び出しません。変更された設定だけを送り、エンジンが 20 ms のクロスフェードで切り替えます。
  出力 EQ だけを変えた Inspector 編集ではレンダーを再起動しません。
- ソース EQ を無効にするとエンジンから解除し、ネイティブ音源を作り直すと再びかけます。
- 対応状況は `SoundTraceRuntime.SupportsSourceParametricEq` / `SupportsOutputParametricEq` で確認します。対応していない
  エンジンでは、有効にした EQ を一度の警告とともに無視します。
- FMOD/Wwise 統合モードでは `SoundTraceListener`・`SoundTraceSource` が無効になるため、ミドルウェアプラグインの EQ を使います —
  [FMOD](./fmod.md#eq) · [Wwise](./wwise.md#eq)。

## SoundTraceObject

![SoundTraceObject Inspector](/img/unity/Img_STObj.png)

`SoundTraceObject` は `MeshFilter.sharedMesh` と Renderer の submesh マテリアルスロットを登録します。
Build でメッシュデータを読む必要があるため、Import Settings の `Read/Write Enabled` を有効にしてください。
手続き的メッシュでは `UploadMeshData(true)` を呼ばないでください。

### Geometry と加速構造

![Scene View に表示した BVH](/img/unity/Img_STObjDome.png)

| フィールド | 既定値 | 説明 |
|---|---:|---|
| `BVH Type` | `LBVH_SIMD8` | `HKDTree`（→ SimpleST HybridKD）、`LBVH`（→ LBVH）、`LBVH_SIMD4/8/16`（→ LBVH_SIMD） |
| `BVH Max Depth` / `Primitives Per Leaf` | `12` / `16` | 互換用フィールド。**SimpleST が leaf サイズを内部で決めるため無視**されます |
| `Update Mode` | `Static` | `Static`（静的 TLAS）/ `Dynamic`（変換のみ更新）。`Refit`・`Rebuild` は互換用 |

`BVH Type` はメッシュ登録時点の加速構造の種類を選ぶだけです。同じ Mesh asset・マテリアルスロット・BVH 設定を
使う object は、`SoundTraceMeshCache` がネイティブメッシュを refcount で共有します。

### スキンド・手続き的メッシュ

SimpleST には vertex refit がありません。変形したジオメトリを反映するには新しい Mesh を焼き、
`SoundTraceObject` を再登録（または `MeshCore.SetData`）して**新しいネイティブメッシュに差し替え**ます。
毎フレームの差し替えはコストが大きいため、定期的に（例: 0.2 ~ 0.5 s）更新してください。

### 公開メソッド

`Auto Set` は Renderer material 名をバンドル済み preset とマッチングします。Imported model root に
mesh がなく child が geometry を所有する場合は `Add To Child Meshes` を使ってください。

| メソッド | 動作 |
|---|---|
| `AutoSetMaterialSlots()` | すべての submesh の Renderer material 名をバンドル済み preset と自動マッチングします。 |
| `GetMaterialPresetIndex(int slotIndex)` / `GetPresetName(int slotIndex)` | スロットの preset index / 表示名を返します。 |
| `SetMaterialPresetIndex(int slotIndex, int presetIndex)` | 1 つのスロットの preset を変更します。 |
| `SetMaterialPresetForAllSlots(int presetIndex)` | すべてのスロットに同じ preset を適用します。 |
| `GetNativeMaterialIndices()` | submesh ごとの preset index をネイティブ登録形式の配列で返します。 |
| `GetTriangleCount()` | すべての submesh の triangle 数を返します。 |
| `static IsGpuCompatibleBvhType(BvhType value)` | 互換用。SIMD 系なら `true` |

## サウンド材質

既定のオーサリング asset は `Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset`
です。`SoundTrace > Material Preset Library` で次の作業を行います。

- preset の追加、削除、並べ替え
- `soundMaterial.json` の import/export とバンドル JSON の再インポート
- Scattering と **9バンド**の Reflection、Absorption、Transmission グラフの編集

![Material Preset Library](/img/unity/Image_Mat_01.png)

周波数帯域の中心は `63`、`125`、`250`、`500`、`1000`、`2000`、`4000`、`8000`、`16000 Hz` です。
各バンドの `R + A + T` は `1` でなければならず、許容誤差は `0.001` です。不正な長さと係数はエラーとして
報告され、8バンドの入力を 9バンドに自動で埋めることはしません。

既定材質は SoundTrace ゲーム材質 22 種で、以前のバージョンと名前・インデックスが同じです。既存シーンの
材質スロットインデックスは元の材質をそのまま指します。

| インデックス | 材質 |
|---|---|
| 0 ~ 5 | `Concrete`, `Fabric`, `Wood`, `Brick`, `ConcreteBlock`, `Glass` |
| 6 ~ 11 | `Gravel`, `GypsumBoard`, `Linoleum,RubberOrAsphaltTile`, `Marble`, `Plaster`, `Plywood` |
| 12 ~ 17 | `Sherdded-woodFiberborad`, `Snow`, `Soil`, `Steel`, `Stone`, `WaterSurface` |
| 18 ~ 21 | `TunableAbsorber`, `LowVarianceTarget`, `ConcreteBlockPainted`, `FiberglassReinforcedPlastic` |

測定データではなくゲーム用プリセットです。既存の 8バンド（63 Hz ~ 8 kHz）値から反射 R と透過 T は
そのまま残し、吸収は A = 1 − R − T、16 kHz バンドは 8 kHz の値を繰り返し、scattering は 9バンドに
同じ値として変換しました。エンジンとバンド構成が変わったため、STCore と音響結果は完全には同じに
なりません。ユーザー材質は 9バンドで再入力します。

![材質の帯域別グラフ編集](/img/unity/Image_Mat_02.png)

STCoreV2 の `Transmission Model`（`Surface` / `Solid Distance`）はありません。透過はバンドごとの表面
透過係数 `T` のみで表現します。

## SoundTracePathVisualizer

![SoundTracePathVisualizer Inspector](/img/unity/Img_STPathVisual.png)

Manager と同じ GameObject に 1 つだけ追加します。

| Inspector フィールド | 既定値 | 説明 |
|---|---:|---|
| `Enable Path Visualization` | 有効 | path mesh を表示するか |
| `Refresh Interval Ms` | `50` | 可視化 mesh を再生成する最小間隔。伝搬周期には影響しない |
| `Max Visualized Paths` | `1024` | 表示する最大 path 数（`16..5000`） |
| `Path Width` | `0.08` | 線幅 |
| `Path Alpha Intensity` | `0.5` | 表示強度 |
| `Path Depth Mode` / `Sorting Layer` / `Sorting Order` | `AlwaysOnTop` / `Default` / `10` | レンダーソート |
| `Draw Hit Triangles` | 無効 | Scene View に hit triangle を表示 |

Direct、Reflection、Diffraction、Reverb、Transmission を path 種類ごとの色で表示します。
デバッグ用であり、性能測定と release build では無効にしてください。主な公開メンバーは
`Active`、`Render()`、`Clear()` です。

## FMODと併用する

プロジェクトに SimpleST FMOD プラグイン（`SimpleSTFmod`）があると、SoundTrace は自動的に **FMOD 統合**として
動作します。空間音響レンダーは FMOD Studio の SimpleST Source / Listener DSP が行い、SoundTrace は
`SoundTraceManager` + `SoundTraceObject` でジオメトリ・材質だけをプラグインのコンテキストに登録します。
`SoundTraceListener` / `SoundTraceSource` は警告を出して無効になります。

![FMOD エディションパッケージのインポート](/img/fmod/unity-fmod-edition-import.png)

1. FMOD for Unity 2.04 をプロジェクトに入れます（`Assets/Plugins/FMOD`。tgz でインストールした場合は `Packages/` に embed）。
2. **FMOD エディション**パッケージ `SoundTrace-SimpleST-FMOD-release.unitypackage` を Project ウィンドウにドラッグ＆ドロップします。
   専用のメニューはありません。パッケージの `Runtime/Plugins/FMOD` に `SimpleSTFmod`（Windows x64・macOS）が入っており、
   エディターのロード時に SoundTrace がこれを FMOD プラグインフォルダーにコピーし、FMOD Settings › Dynamic Plugins に
   登録します。FMOD を後から入れても、次のロード時に同じ処理を行います。
3. FMOD Studio でマスターバスに **SimpleST Listener** を、3D イベントのマスタートラックに FMOD Spatializer の代わりに
   **SimpleST Source** を入れます — [FMOD プラグイン](./fmod.md)。
4. シーンには `SoundTraceManager` とジオメトリ用の `SoundTraceObject`、FMOD の `StudioListener` を置きます。

エンジンインスタンスは 1 つです。SimpleSTFmod が、SoundTrace が P/Invoke するのと同じ `SimpleSTRealtime` を
ロードし、すべての制御呼び出しはプラグインのコントロールスレッドで実行されます。2026-10-07 に Unity 6000.3 +
FMOD for Unity 2.04 で E2E 通過（オブジェクト 0→6→0、経路 1→266→1）。

## Wwiseと併用する

Wwise Unity 統合の DSP フォルダーに `SimpleSTWwise` があると **Wwise 統合**として動作します（FMOD が
一緒にある場合は FMOD 優先）。

SoundTrace は基本パッケージを使い、Wwise プラグインは他の Wwise プラグインと同様に Audiokinetic Launcher がインストールします。

![ランチャーにインストールされた Sound-tracing](/img/wwise/launcher-bundle.png)

1. 基本パッケージ `SoundTrace-SimpleST-release.unitypackage` を Project ウィンドウにドラッグ＆ドロップします。
2. Audiokinetic Launcher › **Plug-ins › Add from directory** で Wwise 配布物の `launcher` フォルダーを選び、
   **Sound-tracing** をインストールします。
3. Launcher › **Unity › Integrate（または Modify）Wwise in Project** を実行します。ランチャーが Wwise SDK にインストールされた
   プラグイン（Sound-tracing を含む）を Wwise Unity 統合の DSP フォルダーに入れ、Wwise サウンドエンジンがロードします。
   Unity エディターを閉じた状態で実行します。
4. Wwise プロジェクトで Audio Objects バスに **Sound-tracing Renderer** を入れ、3D サウンドをそのバスへ
   送ります（Attenuation は無効にするか平坦に）— [Wwise プラグイン](./wwise.md)。
5. シーンには `AkInitializer`、`AkAudioListener`、エミッターの `AkGameObj` と `SoundTraceManager`、
   `SoundTraceObject` を置きます。Wwise Unity の単位はメートルなので `sceneRatio = 1` です。

## WebGL

Unity WebGL は `OnAudioFilterRead` を提供しないため、別の経路を使います。AudioClip の PCM と
再生状態を渡し、SimpleST buffered host renderer の結果を共有リングバッファで AudioWorklet に送ります。

- AudioClip は **Decompress On Load** でインポートします。
- HTTPS または localhost で `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp` ヘッダーを付けて配信します。オーディオはユーザー入力後に開始します。
- ビルド後処理が `Runtime/Web/*.bytes` を `StreamingAssets/SoundTrace/` にコピーするため、そのフォルダーも一緒に配布します。
- Unity AudioMixer のエフェクトチェーンは WebGL の独立した SoundTrace 出力には適用されません。

## サンプル

### ST_SampleScene01

![ST_SampleScene01](/img/unity/SampleScene01.png)

基本的な room、source、listener、geometry、material preset と path visualization を確認します。

### ST_SampleScene02

![ST_SampleScene02](/img/unity/SampleScene02.png)

source/listener の移動、material preset の変更、Unity 元のオーディオと SoundTrace 出力の比較を
確認します。

### ST_SampleScene03

![ST_SampleScene03](/img/unity/Img_25_Sample03.png)

広い空間の複数 source、wall occlusion、移動中の HRTF 方向感と room response を確認します。

## STCoreV2 から変わった契約

| 以前 | 現在 |
|---|---|
| `exaSound` / STCoreV2 エントリポイント | `st_rt_*` / SimpleST ABI 6 |
| 0 = 無効ハンドル | **-1 = 無効**、0 は有効 |
| ソースごとのリスナーレンダー | ソースごとの mono stream + リスナー全体 mix |
| 8バンド材質・scalar scattering | 63…16000 Hz **9バンド** R/A/T/scattering |
| 変更可能な native material | 不変 material、新しい material/mesh で再バインド |
| STCore 多項式距離減衰 | SimpleST 物理距離減衰 |
| STCore GPU/provider/path-cache 設定 | SimpleST CPU pipeline スケジューラ |
| KU100 Resources テーブル | 内蔵 MIT KEMAR HRTF |
| `exaMeshUpdateVertices` → `exaMeshRefit` | 新しいメッシュへ差し替え |

## トラブルシューティング

| 症状 | 確認すること |
|---|---|
| 音が出ない | Console の最初の Manager 初期化エラー、Stereo/Best latency、AudioSource の clip、Manager/Listener の有無 |
| Source/Listener/Object が Manager を要求する | cascade エラーより前に記録された `Failed to initialize SoundTraceManager` の原因を確認 |
| 旧版と衝突する | STCoreV2 の `Assets/SoundTrace` を Assets の外へ移したか |
| Geometry が反映されない | `Read/Write Enabled`、MeshFilter/MeshRenderer、child mesh の位置、登録状態 |
| 実行中に変形した mesh が反映されない | SimpleST には refit がない。新しいメッシュへ差し替え |
| FMOD/Wwise モードで Listener/Source が無効になる | 正常 — レンダーはミドルウェアプラグインが担当 |
| 一部の音源が空間化されず dry で聞こえる | Console の `ST_STATUS_BUDGET_EXCEEDED` 警告 — 音源を減らすか `SoundTraceRuntime.MaxSources` を上げる |
| Android ビルドが `SimpleST requires Android API 28 or newer` で失敗する | Player Settings › Minimum API Level を 28 以上に |
| EQ を有効にしても音が変わらない | Console の EQ 非対応警告、FMOD/Wwise 統合モードか（ミドルウェアの EQ を使用） |
| Teleport 後に pitch が跳ねる | transform 変更の直後に `ResetMotionState()` を呼ぶ |
| 性能が足りない | `Quality → Middle → Fast`、Reverb Ray Resolution の縮小、path visualizer の無効化の順に確認 |
| 複数の音源が comb filtering のように聞こえる | 同一の `AudioSettings.dspTime` で `PlayScheduled()` を実行 |

## 次のドキュメント

- [SDK概要](./overview.md)
- [FMOD プラグイン](./fmod.md) · [Wwise プラグイン](./wwise.md)
- [Web SDK](./web.md) · [Unreal Engine SDK](./ue.md)
