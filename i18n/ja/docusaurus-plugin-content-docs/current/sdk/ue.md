---
title: Unreal Engine
description: SoundTrace Unreal Engine SDK のインストール、モノラル音声のインポート、プラグイン設定、Detail Properties、公開 API。
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal Engine SDK は、Unreal の音源、リスナー、メッシュを [STCoreV2](../core/stcorev2.md) に接続するリアルタイム空間音響プラグインです。プロジェクト全体の設定と Actor Component を通じて、音響パス、マテリアル、HRTF、GPU 処理を構成します。

## 要件とプラットフォーム

| 項目 | 要件 / 対応範囲 |
|---|---|
| Unreal Engine | `5.6` 以降 |
| 対応プラットフォーム | Windows x64, macOS, Linux, Android, iOS |

## インストール

1. Unreal Editor と対象プロジェクトを閉じます。
2. SDK の `Plugins/SoundTracing` を対象プロジェクトの `Plugins/` にコピーします。
3. `.uproject` を開き、`SoundTracing` plugin を有効化します。
4. C++ module の compile を完了し、Editor を再起動します。
5. `Project Settings > Plugins > SoundTracing` でグローバル設定を確認します。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

Plugin フォルダーだけを配布する場合も、`Content/STData` と `ThirdParty/STCoreV2` を
保持してください。Material preset、custom HRTF、native runtime がこれらのパスを使用します。

## Unreal Editor 設定

1. `Edit > Project Settings > Platforms` で対象プラットフォームの `Audio` 設定を開きます。
2. `Spatialization Plugin` を `SoundTracing` に設定します。
3. `Source Data Override Plugin` を `SoundTracing` に設定します。
4. エディターを再起動します。
5. `Project Settings > Plugins > SoundTracing` を開き、全体設定を確認します。

![Project Settings で SoundTracing を選択](/img/unreal/ST_Listener_Setting_Editor01.png)

Windows プロジェクトでは以下の値から始め、オーディオ負荷に合わせて調整します。

| 設定 | 開始値 |
|---|---:|
| `Audio Sample Rate` | `48000 Hz` |
| `Callback Buffer Frame Size` | `1024` |
| `Buffers To Enqueue` | `2` |

## オーディオアセットのインポート設定 — モノラル

![通常の Sound Wave とモノラル Sound Wave アセット](/img/unreal/MonoSoundImport.png)

SoundTrace で空間化する音源はモノラル（1 チャンネル）で用意します。

1. 音声編集ツールから元の音声をモノラル PCM WAV ファイルとして書き出します。
2. Content Browser の `Import` で取り込みます。`Sound Wave` アセットが生成されます。
3. Sound Wave のチャンネル数が `1` であることを確認します。
4. Audio Component の `Sound` にこのアセットを指定します。

モノラルは入力音源のチャンネル構成です。ヘッドホンでの方向感は SoundTrace がリスナーを基準にレンダリングします。基本的な取り込み手順は [Unreal の音声インポートガイド](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-audio-files?application_version=5.6) を参照してください。

## クイックスタート

1. `Project Settings > Plugins > SoundTracing` で `Quality Preset = Fast` から始めます。
2. Content Browser の `Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` からソース設定アセットを作成します。
3. `Sound Attenuation` アセットを作成して `Enable Spatialization` を有効にします。`Spatialization Method` を `Plugin-Spatialized` にし、`Spatialization Plugin Settings` 配列にソース設定アセットを追加します。
4. Audio Component にモノラル Sound Wave を指定します。`Allow Spatialization` を有効、`Override Attenuation` を無効にして、`Attenuation Settings` に Sound Attenuation アセットを指定します。
5. 音響ジオメトリに使用する `StaticMeshComponent` または `SkinnedMeshComponent` の直下に `SoundTracingObjectComponent` を子として追加します。
6. Object の `Auto Set Materials` を実行し、必要なスロットを調整します。
7. PIE を開始して Audio Component を再生します。`SoundTracing.Status` で準備状態とパス数を確認します。
8. パスを表示するには Actor に `SoundTracingPathVisualizerComponent` を追加します。

全体設定は SoundTracing プラグイン設定で管理し、実行時の状態は `SoundTracingSubsystem` から取得します。Listener Component がない場合は Unreal オーディオリスナーの位置とプロジェクトの既定リスナー設定を使用します。

## コンポーネント概要

| 構成要素 | Unreal Engine SDK | 役割 |
|---|---|---|
| SoundTracing プラグイン設定 | `SoundTracingSettings`, `SoundTracingSubsystem` | プロジェクト設定と実行時の状態取得・制御 |
| リスナー | `SoundTracingListenerComponent` | リスナーの品質・出力設定と Transform の上書き |
| ソース | `SoundTracingSourceSettings` + `Audio Component` | ソース別の放射強度、音響パス、減衰 |
| サウンドオブジェクト | `SoundTracingObjectComponent` | メッシュ、BVH、マテリアルスロットの登録 |
| 音響マテリアル | `SoundTracingMaterialPresetLibrary` | マテリアルプリセットと帯域別の反射・吸収・透過 |
| サウンドパス可視化 | `SoundTracingPathVisualizerComponent` | Niagara による音響パス表示 |

## SoundTracing プラグイン設定

<span id="project-settings" />

<span id="soundtracingsubsystem" />

![SoundTracing のランタイムと既定リスナー設定](/img/unreal/ST_Listener_Setting_Editor02.png)

![SoundTracing のソース上限、減衰、マテリアル、パス設定](/img/unreal/ST_Listener_Setting_Editor03.png)

### Detail Properties

`SoundTracingSettings` が全体設定を管理し、`SoundTracingSubsystem` がランタイムを制御します。全体設定は `Project Settings > Plugins > SoundTracing` で編集します。表は SDK の既定値、画像は設定例です。

| フィールド | 既定値 | 説明 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`。`-1` は論理コア数から自動設定し、`0` と `1` は単一スレッドです。変更後は再起動します。 |
| `Use GPU Backend` | 無効 | GPU 処理を要求し、初期化できない場合は CPU を使用します。変更後は再起動します。 |
| `Path Cache Size` | `256` | `0..1024`。有効なソースが共有するパスキャッシュです。`0` はキャッシュを無効にします。 |
| `Propagation Interval (ms)` | `0` | `0..500`。伝播要求の最小間隔です。`0` は毎ゲーム tick に要求し、処理中の要求はまとめられます。 |
| `Quality Preset`, `Listener Rays`, `HRTF`, `Render Quality` | `Fast` | 既定のリスナープロファイルです。各項目は後述のリスナー Detail Properties 表で説明します。 |
| `Source Ray Resolution Cap` | `0` | `0..32`。ソース別リバーブ ray 解像度の全体上限です。`0` は追加制限なしです。 |
| `Source Ray Depth Cap` | `0` | `0..16`。ソース別リバーブ ray 深度の全体上限です。`0` は追加制限なしです。 |
| パス別 `Strength` | 各 `1.0` | `Direct`、`Reflection`、`Diffraction`、`Reverb`、`Transmission` の減衰強度（`0.5..1.5`）です。プロジェクトの減衰設定を使うソースに適用します。値が大きいほど同じ距離で強く減衰します。 |
| `Material Preset Library` | 未指定 | 未指定時は同梱ライブラリを使用します。別のライブラリを選択したら再起動します。 |
| `Paths`, `Air Absorption` | 有効 | 既定リスナーのパス種類と空気吸収設定です。 |

### 公開メソッド

Blueprint では `Get World Subsystem` で `SoundTracingSubsystem` を取得します。C++ では `USoundTracingSubsystem::Get(WorldContextObject)` を使用します。

| メソッド | 戻り値 / 動作 |
|---|---|
| `Get(const UObject* WorldContextObject)` | 指定した World の Subsystem を返す C++ 静的メソッドです。 |
| `IsNativeRuntimeReady()` | `bool`。ネイティブライブラリ、シーン、リスナーが準備済みかを返します。 |
| `IsGpuPropagationActive()` | `bool`。GPU 伝播が実際に有効かを返します。 |
| `GetGpuBackendStatus()` | `FString`。`GPU active`、`CPU`、または理由を含む `CPU fallback (...)` です。ランタイムにアクセスできない場合は `Unavailable` です。 |
| `GetLastValidPathCount()` | `int32`。最後に完了した伝播フレームの有効パス数です。 |
| `GetLastNativeError()` | `FString`。最新のネイティブエラーです。最後のフレームが成功した場合は空です。 |
| `GetNativeVersion()` | `FString`。`major.minor.revision` 形式のネイティブライブラリバージョンです。 |
| `GetRegisteredObjectCount()` | `int32`。現在の World に登録されたオブジェクト数です。 |
| `GetActiveListenerSettings()` | `FSoundTracingListenerSettings`。現在適用中のリスナー設定です。 |
| `ResetMotionState()` | テレポートやレベル切り替え後にリスナーとソースの移動履歴を初期化します。 |
| `RequestPropagationFrame()` | 通常の更新周期とは別に伝播処理を要求します。 |

### 公開プロパティ

以下は `USoundTracingSettings` の C++ 設定メンバーです。`GetDefault<USoundTracingSettings>()` でプロジェクト設定を読み取れます。

| プロパティ | 型 | 説明 |
|---|---|---|
| `PropagationThreadCount` | `int32` | 設定された伝播スレッド数です。 |
| `bEnableGpuPropagation` | `bool` | GPU 使用要求です。実際の状態は `IsGpuPropagationActive()` で確認します。 |
| `PathCacheSize` | `int32` | パスキャッシュのサイズです。 |
| `PropagationIntervalMs` | `int32` | 伝播要求の最小間隔（ms）です。 |
| `DefaultListenerSettings` | `FSoundTracingListenerSettings` | プロジェクトの既定リスナープロファイルです。 |
| `SourceRayResolutionCap`, `SourceRayDepthCap` | `int32` | ソース ray の解像度と深度の全体上限です。 |
| `DefaultSourceAttenuationStrengths` | `FSoundTracingAttenuationStrengths` | パス種類ごとの既定の距離減衰強度です。 |
| `MaterialPresetLibrary` | `TSoftObjectPtr<USoundTracingMaterialPresetLibrary>` | 起動時に登録するマテリアルライブラリです。 |

## リスナー

<span id="soundtracinglistenercomponent" />

![既定のリスナープロファイル](/img/unreal/ST_Listener_Setting_Editor02.png)

Pawn や Camera に `SoundTracingListenerComponent` を追加すると、レベルごとにプロジェクトのリスナープロファイルを上書きしたり、Unreal オーディオデバイスのリスナーの代わりにこのコンポーネントの Transform を使用したりできます。

### Detail Properties

リスナープロファイルの共通設定は Project Settings と Listener Component で同じです。上の画像はプロジェクトの既定プロファイルです。コンポーネントでは以下の上書きオプションも設定します。

| フィールド | 既定値 | 動作 |
|---|---:|---|
| `Override Project Listener Settings` | オン | Project Settings の代わりに `Listener Settings` を適用 |
| `Listener Settings` | `Fast` | Quality、HRTF、output mode、path、air absorption |
| `Drive Listener Transform` | オフ | この component の world transform と velocity を native listener に送信 |

1 つの World で active listener を駆動できる Listener Component は 1 つです。別の component
が Begin Play すると以前の component を置き換え、Output Log に警告を出します。

| リスナープロファイルの項目 | 既定値 | 説明 |
|---|---:|---|
| `Quality Preset` | `Fast` | `Custom`、`Fast`、`Middle`、`Quality` から選択します。 |
| `Ray Resolution`, `Ray Depth` | `16`, `4` | それぞれ `1..32`、`1..16`。パス探索の解像度と深度で、`Custom` で編集できます。 |
| `Output Mode` | `Headphones` | ヘッドホンまたはスピーカー出力を選択します。 |
| `Hrtf Mode` | `HRIR Interpolated` | 後述の HRTF 表を参照してください。 |
| `Custom HRTF Relative Path` | 空文字列 | プラグイン Content を基準とした独自 HRTF のパスです。空の場合は内蔵テーブルを使用します。 |
| `HRTF Path Budget` | `1` | `1..32`。方向別 HRTF を適用する上位パス数です。 |
| `Diffuse Enabled`, `Diffuse Quality` | 無効, `Low` | 初期散乱音と品質を設定します。`Low/Medium/High` は最大 `128/512/1024` 本の散乱パスを保持します。 |
| `Delay Interpolation` | `Linear` | `Linear`、`Cubic Lagrange`、`Lagrange 6` の遅延補間を選択します。 |
| `Early Path Budget` | `128` | `0..4096`。完全な移動遅延処理を適用する初期の間接パス数です。`0` は上限を解除します。 |
| `Render Band Tier` | `Merged4` | `Merged4` または `Full8` でレンダリング帯域数を選択します。 |
| パス別 `Enable … Path` | すべて有効 | `Direct`、`Reflection`、`Diffraction`、`Reverb`、`Transmission` を個別に有効・無効にします。 |
| `Air Absorption Enabled` | 有効 | 空気吸収による減衰を適用します。 |
| `Temperature Celsius` | `20` | `-40..60 °C`。気温です。 |
| `Relative Humidity Percent` | `50` | `0..100%`。相対湿度です。 |
| `Pressure Pa` | `101325` | `50000..120000 Pa`。気圧です。 |

#### Quality Preset

`Fast`、`Middle`、`Quality` は ray と高度な render 品質値をまとめて適用します。
手動編集する場合は `Custom` を選択してください。

| Preset | Ray Resolution | Ray Depth | HRTF Path Budget | Diffuse | Delay Interpolation | Early Path Budget |
|---|---:|---:|---:|---|---|---:|
| `Custom` | 保存値 | 保存値 | 保存値 | 保存値 | 保存値 | 保存値 |
| `Fast` | `16` | `4` | `1` | オフ / Low | Linear | `128` |
| `Middle` | `24` | `8` | `1` | オン / Medium | Cubic Lagrange | `128` |
| `Quality` | `32` | `12` | `1` | オン / High | Lagrange 6 | `128` |

`HRTF Path Budget` は full directional HRTF voice を割り当てる上位 path 数です。組み込み
preset は audio-thread の余裕を保つため、すべて `1` を使用します。Custom で増やすと、
source が多い scene で dropout が発生することがあります。

#### HRTF と出力モード

| HRTF モード | 必要な asset | 説明 |
|---|---|---|
| `Band8` | なし | 8-band magnitude と ITD を使う軽量モード |
| `HRIR` | STCoreV2 embedded table | 測定 HRIR の最も近い方向を使用 |
| `HRIR Interpolated` | STCoreV2 embedded table | 方向に応じて測定 HRIR を補間する既定モード |

`Custom HRTF Relative Path` にプラグインの `Content` を基準とする `MPI1`、`SAH1`、`BPH1` テーブルのパスを指定できます。空にすると STCoreV2 の内蔵テーブルを使用します。

| Output Mode | 説明 |
|---|---|
| `Headphones` | Binaural HRTF 出力 |
| `Speaker` | 内部 Ambisonic stereo decode |

高度な `Render Band Tier` は `Merged4` が推奨で、`Full8` は path ごとの
audio-thread band 処理を増やします。Air Absorption の既定値は `20 °C`、相対湿度
`50%`、`101325 Pa` で、ISO 9613-1 の減衰に使用します。

### 公開メソッド

| メソッド | 動作 |
|---|---|
| `ApplyListenerSettings()` | 現在の Detail Properties 値を native listener に再適用 |
| `SetQualityPreset(Preset)` | Quality preset を変更して即時適用 |
| `SetHrtfMode(Mode)` | HRTF mode を変更して即時適用 |
| `SetOutputMode(Mode)` | Headphones/Speaker を変更して即時適用 |
| `ResetMotionState()` | Teleport、respawn 後に listener/source の velocity history を初期化 |
| `GetListenerSettings()` | Component の現在の listener settings を返す |
| `static GetActiveListener(const UWorld* World)` | C++ で該当 World の有効な Listener Component を返します。 |

### 公開プロパティ

| プロパティ | 型 / アクセス | 説明 |
|---|---|---|
| `bOverrideProjectListenerSettings` | `bool` / 読み書き | このコンポーネントのリスナープロファイルを使うかを指定します。 |
| `ListenerSettings` | `FSoundTracingListenerSettings` / 読み書き | コンポーネントの品質、出力、パス設定です。実行中に直接変更した場合は `ApplyListenerSettings()` で反映します。 |
| `bDriveListenerTransform` | `bool` / 読み書き | コンポーネントの位置と向きでリスナーを駆動するかを指定します。 |

## ソース

<span id="soundtracing-audio-spatialization-settings" />

![ソース設定アセットの Detail Properties](/img/unreal/STSettingAssets_SourceSetups.png)

Content Browser の
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` から作成します。
同じ用途の source 間で 1 つの asset を共有し、Audio Component ごとの複製を避けてください。

### Detail Properties

| フィールド | 既定値 | 範囲／動作 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`。全 path に掛ける linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`。Intensity に追加する gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`。Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`。Early reflection send |
| `Ray Preset` | `Custom` | `Custom`、`Fast`(8×8、depth 4)、`Middle`(16×16、depth 4)、`Quality`(24×24、depth 4)。`Custom` 以外は下の 2 値を preset 値で上書き。Unity `SoundTraceSource` の `Reverb Ray Resolution` に相当し、asset を共有する全 source に適用 |
| `Ray Resolution` | `24` | `0..32`。`0` は Listener grid を継承。それ以外は `N × N` source reverb ray |
| `Ray Depth` | `4` | `0..16`。`0` は Listener depth を継承 |
| パス別 `… Path Enabled` | すべて有効 | ソースごとに `Direct`、`Reflection`、`Diffraction`、`Reverb`、`Transmission` を有効・無効にします。 |
| `Override Project Attenuation Strengths` | オン | オフでは Project Settings の attenuation を使用 |
| Path ごとの `Strength` | `1.0` | `0.5..1.5`。値が大きいほど同じ距離で速く減衰 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`。Renderer が保持する最大 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。Path 追加／削除時の fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`。消えた non-direct path を fade 前に保持。`0` は無効 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`。Sample ごとの最大 delay 変化量 |
| `Bypass` | オフ | SoundTrace spatial rendering を行わず入力を通過 |

#### Audio Component への接続

ソース設定アセットを Sound Attenuation に接続し、その Attenuation アセットを Audio Component に指定します。同じ種類の音源は両アセットを共有できます。

![Sound Attenuation の Spatialization Plugin Settings にソース設定を指定](/img/unreal/ST_AttenAsset_PutSettingAssetHere.png)

`Enable Spatialization` を有効にし、プラグインによる空間化を選択します。`Spatialization Plugin Settings` 配列に `SoundTracing Audio Spatialization Settings` アセットを追加します。

![Audio Component の Attenuation Settings に Sound Attenuation を指定](/img/unreal/ST_Source_PutAssetHere.png)

Audio Component の `Allow Spatialization` を有効、`Override Attenuation` を無効にします。作成した Sound Attenuation を `Attenuation Settings` に指定します。

### 公開メソッド

以下は `USoundTracingSourceSettings` の C++ メソッドです。再生・停止には Audio Component の `Play()` と `Stop()` を使用します。

| メソッド | 戻り値 / 動作 |
|---|---|
| `GetEffectiveAttenuationStrengths()` | `FSoundTracingAttenuationStrengths`。上書き設定に応じてソースまたはプロジェクトの減衰強度を返します。 |
| `ApplyRayPreset()` | `RayPreset` に従って `RayResolution` と `RayDepth` を更新します。`Custom` では値を保持します。 |

## サウンドオブジェクト

<span id="soundtracingobjectcomponent" />

![SoundTracingObjectComponent Detail Properties](/img/unreal/STObj_01.png)

`SoundTracingObjectComponent` は immediate parent の `StaticMeshComponent` または
`SkinnedMeshComponent` を音響 geometry として登録します。Actor 階層の任意の場所ではなく、
対象 mesh component の直下に追加してください。

### Detail Properties

| フィールド | 既定値 | 説明 |
|---|---:|---|
| `Auto Register Native Object` | オン | Begin Play で native object を自動登録 |
| `Sync Transform On Tick` | オン | Parent が変化した場合のみ native transform を更新 |
| `Auto Sync Materials` | オン | Parent render material 変更時に slot を更新 |
| `Update Type` | `Static` | Geometry update policy |
| `BVH Type` | `LBVH SIMD8` | Native acceleration structure builder |
| `BVH Max Depth` | `12` | `1..32` |
| `Primitives Per Leaf` | `16` | `1..128` |
| `Sync Skinned Vertices On Tick` | オフ | `Refit` で現在の skeletal pose を毎 tick upload |
| `Sound Material Slots` | 自動生成 | Render material slot と SoundTrace preset の mapping |
| `Visualize BVH` | オフ | Editor component visualizer で BVH line を表示 |
| `BVH Visualization Color` | シアン | BVH の表示色です。 |
| `Native Object Id`, `Native Mesh Id` | `-1` | 登録されたネイティブ ID です。読み取り専用で、未登録時は `-1` です。 |

Static Mesh は Forced LOD があればそれを、なければ LOD 0 を upload します。Skinned Mesh も
Forced LOD を優先し、現在 pose の vertex を登録します。

#### Geometry と BVH

| BVH Type | Refit | GPU backend | 説明 |
|---|---|---|---|
| `HKDTree` | 対応 | 非対応 | KD split。Refit 後は BVH-style fallback traversal |
| `LBVH` | 対応 | 非対応 | Scalar Morton LBVH |
| `LBVH SIMD4` | 対応 | 対応 | 4-wide leaf intersection |
| `LBVH SIMD8` | 対応 | 対応 | 現在の既定値 |
| `LBVH SIMD16` | 対応 | 対応 | 16-wide leaf intersection |

GPU backend が要求された状態で `HKDTree` または scalar `LBVH` を選ぶと、plugin は
GPU upload 可能な `LBVH SIMD8` native builder に置き換えます。

| Update Type | 用途 |
|---|---|
| `Static` | 動かない level geometry |
| `Dynamic` | Transform だけ変化する door や prop。TLAS instance を更新 |
| `Refit` | Topology を保ったまま vertex pose が変化する Skinned Mesh |
| `Rebuild` | Triangle topology が変わり BVH の再作成が必要な geometry |

Skinned animation を反映するには、`Update Type = Refit` と
`Sync Skinned Vertices On Tick = true` を両方有効にします。Plugin は現在 pose の vertex
を upload し、native mesh を refit します。毎 tick CPU skinning と vertex upload が発生する
ため、対象数と LOD を制限してください。

同じ Static Mesh、LOD、material mapping、BVH 設定の object は 1 つの native BVH を共有します。
Skinned Mesh の cache key には component path が含まれ、別 pose が同じ native mesh を
上書きしません。

### 公開メソッド

| メソッド | 動作 |
|---|---|
| `RegisterNativeObject()` | Parent geometry を native scene に登録 |
| `UnregisterNativeObject()` | Native object 登録を解除 |
| `SyncNativeTransform()` | 現在の parent transform を即時反映 |
| `RefreshNativeMesh()` | Mesh または material 変更後に geometry を再 upload |
| `SyncMaterialsFromParent()` (`Auto Set Materials`) | 親の描画マテリアル名とエイリアスからプリセットを自動照合します。 |
| `SetMaterialPresetIndex(Slot, Preset)` | 1 つの slot の preset index を変更 |
| `SetMaterialPresetForAllSlots(Preset)` | 全 slot に同じ preset を適用 |
| `SetUpdateType(Type)` | Native object update policy を変更 |
| `GetResolvedMeshLodIndex()` | 実際に upload した LOD index を返す |
| `GetUploadedTriangleCount()` | 最後に upload した triangle 数を返す |
| `IsRegistered()` | Native object と mesh が両方有効か返す |
| `GetNativeObjectId()`, `GetNativeMeshId()` | 登録されたネイティブ ID を返します。未登録時は `-1` です。 |
| `GetTargetMeshComponent()` | 登録対象である直上の親メッシュコンポーネントを返します。 |
| `static IsGpuCompatibleBvhType(ESoundTracingBvhType InBvhType)` | SIMD LBVH 系列の場合に `true` を返します。 |
| `GetBvhMaxDepth()`, `GetPrimitivesPerLeafNode()`, `GetBvhType()` | C++ で BVH 設定を取得します。 |
| `GetSoundMaterialSlots()` | C++ で音響マテリアルスロット配列の読み取り専用参照を返します。 |
| `BuildNativeBvhDebugLineSegments(TArray<FVector>& OutLocalLinePoints)` | C++ で BVH デバッグ線分をローカル座標で取得します。 |
| `ShouldVisualizeBvh()`, `GetBvhVisualizationColor()` | Editor 専用の C++ メソッドで BVH の表示状態と色を取得します。 |

## 音響マテリアルと Transmission

![SoundTracing Material Preset Library Detail Properties](/img/unreal/ST_Material_Graph.png)

### Detail Properties

既定 library は plugin の
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset` です。現在、Unity/Web SDK
と同じ 22 material table を含みます。

Custom library は Content Browser の
`Sounds > SoundTracing > SoundTracing Material Preset Library` から作成します。新しい asset
は現在の既定 library を複製します。Project Settings の `Material Preset Library` に指定し、
Editor を再起動してください。

| フィールド | 説明 |
|---|---|
| `Presets` | 音響マテリアル一覧です。 |
| `Display Name`, `Aliases` | 選択一覧の表示名と、描画マテリアルの自動照合に使うエイリアスです。 |
| `Material Index` | ネイティブマテリアルのインデックスで、一覧の順序に合わせて管理されます。 |
| `Scattering` | `0..1`。鏡面反射と散乱の比率です。 |
| `Reflection`, `Absorption`, `Transmission` | 8 帯域の反射・吸収・透過エネルギー係数です。各値は `0..1` です。 |
| `Transmission Model` | `Surface` または `Solid Distance` を選択します。 |
| `Thickness to -30 dB (m)` | `Solid Distance` の帯域別減衰基準距離です。 |
| `ResetToBundledJson` | プリセット一覧を同梱 JSON の値に戻します。 |

周波数帯域の中心は `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、
`8000 Hz` です。Editor の band graph を click または drag して値を編集できます。

#### Transmission Model

| モデル | 入力 | Geometry 条件 |
|---|---|---|
| `Surface` | 1 回の表面通過後に残る帯域別 energy coefficient `0..1` | 開いた面や薄い surface に使用可能 |
| `Solid Distance` | 透過 energy が `-30 dB` になる帯域別基準距離 (m) | 閉じた volume と一貫した face 方向が必要 |

`Solid Distance` 値は object の実際の厚みではありません。Runtime は geometry 内部を通った
実距離を測定し、この基準距離で減衰します。`0` はその band を完全に遮断します。

`ImportFromJson`、`ExportToJson`、`ResetToBundledJson` は Unity/Web と共通の
`soundMaterial.json` 形式を使用します。`transmissionDistanceToMinus30DbMeters` がなければ
`Surface`、有効な 8 値があれば `Solid Distance` です。

### 公開メソッド

| メソッド | 戻り値 / 動作 |
|---|---|
| `NormalizePresets()` | プリセットのインデックスと帯域別の値を正規化します。 |
| `GetPresetCount()` | プリセット数を返します。 |
| `FindBestPresetIndexByName(const FString& RenderMaterialName)` | 描画マテリアル名とエイリアスに一致するプリセットのインデックスを探します。 |
| `GetPresetDisplayName(int32 PresetIndex)` | プリセットの表示名を返します。 |
| `ResetToBundledJson()` | 一覧を同梱 JSON で置き換えます。エディターのボタンまたは C++ から呼び出します。 |
| `ExportToJson()` | `soundMaterial.json` 形式の文字列を返します。 |
| `ImportFromJson(const FString& JsonText)` | JSON で一覧を置き換えます。読み取れるマテリアルがない場合は `false` を返します。 |
| `FindBestPresetIndex(const UMaterialInterface* RenderMaterial)` | C++ で描画マテリアルに合うプリセットを探します。 |
| `FindPresetIndexByToken(const FString& Token, int32 FallbackIndex)` | C++ でトークンからプリセットを探し、見つからなければ fallback インデックスを使用します。 |
| `static GetFrequencyBandCentersHz()` | C++ で 8 個の中心周波数配列の読み取り専用参照を取得します。 |
| `static LoadDefaultLibrary()` | C++ でプロジェクト指定のライブラリ、または既定ライブラリを読み込みます。 |
| `static MakeFallbackPresets()` | C++ で代替プリセット配列を生成します。 |
| `static ParseSoundMaterialJson(const FString& JsonText, TArray<FSoundTracingMaterialPreset>& OutPresets)` | C++ で JSON をプリセット配列として読み取ります。 |
| `static SerializeSoundMaterialJson(const TArray<FSoundTracingMaterialPreset>& InPresets)` | C++ でプリセット配列を JSON 文字列に変換します。 |
| `static LoadBundledJson(FString& OutJson)` | C++ で同梱 JSON を文字列として読み取り、成否を返します。 |

### 公開プロパティ

| プロパティ | 型 / アクセス | 説明 |
|---|---|---|
| `Presets` | `TArray<FSoundTracingMaterialPreset>` / 読み書き | ライブラリに保存されたプリセット配列です。 |
| `FrequencyBandCount` | `static constexpr int32` / 定数 | 周波数帯域数で、値は `8` です。 |

## サウンドパス可視化

<span id="soundtracingpathvisualizercomponent" />

![Add Component の検索結果に表示される Sound Tracing Path Visualizer](/img/unreal/PathVisualizer_01.png)

Actor の `Add Component` で `Sound Tracing Path Visualizer` を検索して追加します。この C++ コンポーネントは、パス描画に必要な Niagara コンポーネントを生成します。

![NS_Arrow を使用する Niagara コンポーネントの Detail Properties](/img/unreal/PathVisualizer_02.png)

Actor に `SoundTracingPathVisualizerComponent` を追加すると、最新 propagation frame を
Niagara line segment で表示します。

:::note NS_Arrow 内蔵アセットのパス
`Niagara System Asset` はプラグイン内蔵の `NS_Arrow` を使用します。既定のパスは `/SoundTracing/FX/NS_Arrow.NS_Arrow` です。関連マテリアルは `/SoundTracing/Materials/MAT_ArrowLine` にあります。プラグインのインストールや移動では `Content/FX` と `Content/Materials` の両方を保持し、Niagara システムとマテリアルの参照が切れていないことを確認してください。
:::

### Detail Properties

| フィールド | 既定値 | 説明 |
|---|---:|---|
| `Visualization Enabled` | オン | Path 表示の有効化 |
| `Refresh Interval Ms` | `50` | 可視化の最小更新間隔。Propagation 周期には影響しない |
| `Max Visualized Paths` | `1024` | 最大表示 path 数。範囲 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 強度。範囲 `0.01..2.0` |
| `Niagara System` | 空 | 空の場合は plugin 既定 Niagara system を使用 |

色は Direct=赤、Reflection=橙、Diffraction=緑、Transmission=シアン、Reverb=紫です。性能測定では可視化を無効にしてください。

### 公開メソッド

| メソッド | 戻り値 / 動作 |
|---|---|
| `SetVisualizationEnabled(bool bEnabled)` | 実行中にパス表示を有効・無効にします。 |
| `GetActivePathCount()` | `int32`。可視化コンポーネントが現在保持しているパス数を返します。 |

## サンプルデモ

### Test

![Unreal Test デモ画像のプレースホルダー](/img/unreal/demo-placeholder.svg)

SDK サンプルプロジェクトの `Content/FirstPerson/Test.umap` を開き、メッシュ登録、BVH、音響マテリアルスロットを確認します。

1. レベルのメッシュを選び、`SoundTracingObjectComponent` の親接続とマテリアルスロットを確認します。
2. PIE で音を再生し、リスナーを動かして方向感や遮蔽による変化を確認します。
3. プリセットを切り替えて反射・吸収・透過を比較します。
4. Path Visualizer を有効にし、聞こえ方の変化と音響パスを確認します。

サンプルマップは SDK サンプルプロジェクトの Content に含まれます。プラグインのみを導入したプロジェクトでは、必要なサンプルアセットを依存関係と一緒に Migrate してください。

## トラブルシューティングのヒント

| 症状 | 確認項目 |
|---|---|
| Audio の選択肢にプラグインがない | SoundTracing の有効化、C++ モジュールのビルド、対象プラットフォームの Audio 設定、エディターの再起動を確認します。 |
| ネイティブライブラリの読み込み・ABI エラー | 同じ SDK 配布版のプラグインとネイティブライブラリを使用し、ThirdParty ファイルがパッケージに含まれることを確認します。 |
| 音が出ない・空間化されない | モノラル Sound Wave、Audio Component の再生、2 つの全体 Audio プラグイン、Spatialization の有効化、アセット接続を確認します。 |
| ソース設定が反映されない | `Audio Component → Sound Attenuation → SoundTracing Source Settings` の接続と `Override Attenuation` を確認します。 |
| リスナー位置が異なる | `Drive Listener Transform` が有効ならコンポーネントの位置、無効なら Unreal オーディオリスナーの位置を使用します。 |
| リスナー置き換えの警告 | 1 つの World につき有効な Listener Component を 1 つに保ちます。 |
| ジオメトリが音に反映されない | Object Component が対応メッシュの直下にあることと、メッシュデータ・三角形が存在することを確認します。 |
| スキンアニメーションが反映されない | `Update Type = Refit`、`Sync Skinned Vertices On Tick = true`、LOD を確認します。 |
| GPU が有効にならない | `GetGpuBackendStatus()` と Output Log を確認します。Windows では `exaSound.dll` と `webgpu_dawn.dll` を一緒に配布します。 |
| パスが表示されない | Niagara の有効化、`Visualization Enabled`、ソース・リスナーのパス設定、`GetLastValidPathCount()` を確認します。 |
| テレポート後にピッチが跳ねる | 位置を変更した直後に Listener または Subsystem の `ResetMotionState()` を呼び出します。 |
| 音源が多いと音が途切れる | 以下の順に伝播処理とオーディオバッファを調整します。 |

### 音源が多い場合の途切れ

1. `Propagation Interval (ms)` を `50` にして伝播要求の頻度を下げます。
2. `Source Ray Resolution Cap` を `8..16` に下げるか、ソースの `Ray Preset` を `Fast` にします。
3. リスナーは `Quality Preset = Fast`、`HRTF Path Budget = 1`、`Render Band Tier = Merged4` から始めます。
4. `Propagation Thread Count` を `2..3` にして再起動し、ゲーム・描画・オーディオスレッドに実行の余裕を確保します。
5. `Buffers To Enqueue` を `2` 以上にします。必要なら `Callback Buffer Frame Size` も調整します。
6. パス可視化を無効にし、設定を 1 つずつ変更して比較します。

### ランタイム状態の確認

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` はネイティブバージョン、準備状態、処理バックエンド、オブジェクト・パス数、リスナー設定を出力します。`SoundTracing.DumpGpuPropagationStats` は GPU 実行と CPU フォールバックの統計を出力します。

## 次に読む

- [SDK 概要](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
