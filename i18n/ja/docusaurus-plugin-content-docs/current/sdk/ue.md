---
title: Unreal Engine
description: SoundTracing Unreal Engine プラグイン 0.2.0 の導入、Unity 形式のコンポーネント、HRTF、ジオメトリ、マテリアル、GPU バックエンド、Blueprint API。
---

# SoundTrace SDK for Unreal Engine

SoundTrace Unreal SDK は、Unreal Audio Extension Plugin と Actor Component を通じて
[STCoreV2](../core/stcorev2.md) を接続します。0.2.0 では STCoreV2 v0.7 の C-ABI 4 を使用し、
Unity SDK と同じ Manager、Listener、Source、Object、PathVisualizer の構成を提供します。

このガイドは Unreal native audio integration を対象にしています。FMOD と Wwise は、
同じ build で native integration と同時に有効化するのではなく、それぞれ個別の
integration build として構成してください。

## 要件とプラットフォーム

| 項目 | 現在のバージョン／範囲 |
|---|---|
| Unreal Engine | `5.6` |
| SoundTracing plugin | `0.2.0` Beta |
| STCoreV2 | `v0.7`、C-ABI `4` |
| 宣言済み target platform | Win64、macOS、Linux、Android、iOS |
| 現在の SDK checkout に含まれる prebuilt binary | Win64 Release |
| Source channel | Mono または Stereo、最大 2 channels |
| 追加 plugin | Niagara。 `SoundTracing.uplugin` が自動で有効化 |

現在の Win64 package には次のファイルが含まれます。

```text
Plugins/SoundTracing/ThirdParty/STCoreV2/
├─ Binaries/Win64/Release/exaSound.dll
├─ Binaries/Win64/Release/webgpu_dawn.dll
└─ Lib/Win64/Release/exaSound.lib
```

別の target を build するには、その platform の `exaSound` runtime と link artifact を
同じ ThirdParty 構造に追加してください。`SupportedTargetPlatforms` の宣言だけでは
native binary は生成されません。

:::warning ABI 4 専用
SoundTracing 0.2.0 は ABI 3 以前の `exaSound` と互換性がありません。古い DLL が混在すると
`STCoreV2 export table is incomplete` エラーで初期化が停止します。
:::

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

## Unreal Audio 設定

Native Unreal audio integration では、各 target platform の Audio 設定で次の 2 つを
選択します。

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

変更後は Editor を再起動してください。各 `Audio Component` または
`Sound Attenuation` asset でも Spatialization を有効にし、
`SoundTracing Audio Spatialization Settings` asset を指定します。

SDK sample project は次の Windows audio 設定を開始点として使用します。

| 項目 | Sample 値 |
|---|---:|
| Audio Sample Rate | `48000` Hz |
| Callback Buffer Frame Size | `1024` |
| Buffers To Enqueue | `1` |

これらは plugin の固定要件ではなく sample 値です。既存プロジェクトの audio budget が
異なる場合は、まずこの値で動作を確認してから callback と buffer size を調整してください。

## 最短セットアップ

1. `Project Settings > Plugins > SoundTracing` の Runtime Options と
   Default Listener Settings を確認します。
2. Content Browser の `Sounds > SoundTracing` から
   `SoundTracing Audio Spatialization Settings` asset を作成します。
3. `Audio Component` または `Sound Attenuation` の Spatialization Plugin Settings に
   asset を割り当てます。
4. 音響 geometry に使う `StaticMeshComponent` または `SkinnedMeshComponent` の直下に
   `SoundTracingObjectComponent` を child component として追加します。
5. Object Component の `Auto Set Materials` を実行し、誤った slot だけを修正します。
6. PIE を開始し、`SoundTracing.Status` で native runtime、backend、listener、path 数を
   確認します。

Listener Component がなくても plugin は動作します。その場合は Unreal audio-device
listener を追跡し、Project Settings の Default Listener Settings を使用します。

## コンポーネント概要

| Unity SDK | Unreal Engine SDK | 役割 |
|---|---|---|
| `SoundTraceManager` | `Project Settings > Plugins > SoundTracing` | Native runtime、thread、GPU、cache、既定 Listener 設定 |
| `SoundTraceListener` | `SoundTracingListenerComponent` | Level 単位の Listener profile と任意の transform override |
| `SoundTraceSource` | `SoundTracing Audio Spatialization Settings` | Source 単位の emission、ray、path、attenuation、render tuning |
| `SoundTraceObject` | `SoundTracingObjectComponent` | Static/Skinned geometry、BVH、material slot 登録 |
| `SoundTracePathVisualizer` | `SoundTracingPathVisualizerComponent` | Niagara による propagation path 表示 |
| Manager runtime panel | `SoundTracingSubsystem` | Blueprint から runtime 状態と最新 propagation 結果を取得 |

## Project Settings

`Project Settings > Plugins > SoundTracing` は Unity の `SoundTraceManager` に相当します。

### Runtime Options

| フィールド | 既定値 | 範囲／動作 |
|---|---:|---|
| `Propagation Thread Count` | `-1` | `-1..64`。`-1` は STCoreV2 が論理 core 数 - 1 を選択。`0` または `1` は serial。GPU 使用中は無効。再起動が必要 |
| `Use GPU Backend` | オフ | Dawn/WebGPU の初期化を要求し、失敗時は CPU に fallback。再起動が必要 |
| `Path Cache Size` | `256` | `0..1024`。全 active source が共有する cache budget。`0` は cache 無効 |
| `Propagation Interval (ms)` | `0` | `0..500`。`0` は game tick ごとに要求し、実行中の frame があれば要求を統合 |

### Listener、Attenuation、Materials

| フィールド | 既定値 | 説明 |
|---|---:|---|
| `Default Listener Settings` | `Fast` | Level の Listener Component override がない場合に使用 |
| `Default Source Attenuation Strengths` | path ごとに `1.0` | Source asset が project attenuation を使用する場合に適用。範囲 `0.5..1.5` |
| `Material Preset Library` | 空 | 空の場合は同梱 `SoundTraceMaterialPresetLibrary` を使用。別 library を指定した後は再起動 |

SDK sample project の `DefaultGame.ini` はデモ用に `Middle` と GPU 有効を override します。
Plugin 自体の既定値は上表のとおりです。

## SoundTracingListenerComponent

Pawn または Camera に追加し、Level 単位で Project Settings の Listener profile を
上書きするか、Unreal audio-device listener の代わりにこの component の transform を
使用します。

### Inspector

| フィールド | 既定値 | 動作 |
|---|---:|---|
| `Override Project Listener Settings` | オン | Project Settings の代わりに `Listener Settings` を適用 |
| `Listener Settings` | `Fast` | Quality、HRTF、output mode、path、air absorption |
| `Drive Listener Transform` | オフ | この component の world transform と velocity を native listener に送信 |

1 つの World で active listener を駆動できる Listener Component は 1 つです。別の component
が Begin Play すると以前の component を置き換え、Output Log に警告を出します。

### Quality preset

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

### HRTF と出力モード

| HRTF モード | 必要な asset | 説明 |
|---|---|---|
| `Band8` | なし | 8-band magnitude と ITD を使う軽量モード |
| `HRIR` | STCoreV2 embedded table | 測定 HRIR の最も近い方向を使用 |
| `HRIR Interpolated` | STCoreV2 embedded table | 方向に応じて測定 HRIR を補間する既定モード |

0.1.0 の `Parametric`、`Convolution`、`SteamAudio` は 0.2.0 で削除されました。
`Custom HRTF Relative Path` には plugin `Content` 基準の `MPI1`、`SAH1`、`BPH1`
table path を指定できます。空の場合は STCoreV2 embedded table を使用します。

| Output Mode | 説明 |
|---|---|
| `Headphones` | Binaural HRTF 出力 |
| `Speaker` | 内部 Ambisonic stereo decode |

高度な `Render Band Tier` は `Merged4` が推奨で、`Full8` は path ごとの
audio-thread band 処理を増やします。Air Absorption の既定値は `20 °C`、相対湿度
`50%`、`101325 Pa` で、ISO 9613-1 の減衰に使用します。

### Blueprint メソッド

| メソッド | 動作 |
|---|---|
| `ApplyListenerSettings()` | 現在の Inspector 値を native listener に再適用 |
| `SetQualityPreset(Preset)` | Quality preset を変更して即時適用 |
| `SetHrtfMode(Mode)` | HRTF mode を変更して即時適用 |
| `SetOutputMode(Mode)` | Headphones/Speaker を変更して即時適用 |
| `ResetMotionState()` | Teleport、respawn 後に listener/source の velocity history を初期化 |
| `GetListenerSettings()` | Component の現在の listener settings を返す |

## SoundTracing Audio Spatialization Settings

Content Browser の
`Sounds > SoundTracing > SoundTracing Audio Spatialization Settings` から作成します。
同じ用途の source 間で 1 つの asset を共有し、Audio Component ごとの複製を避けてください。

### Inspector

| フィールド | 既定値 | 範囲／動作 |
|---|---:|---|
| `Intensity` | `1.0` | `0..10`。全 path に掛ける linear emission gain |
| `Gain Boost Db` | `0 dB` | `-24..24 dB`。Intensity に追加する gain |
| `Reverb Send Db` | `0 dB` | `-24..24 dB`。Late reverb send |
| `Reflection Send Db` | `0 dB` | `-24..24 dB`。Early reflection send |
| `Ray Resolution` | `24` | `0..32`。`0` は Listener grid を継承。それ以外は `N × N` source reverb ray |
| `Ray Depth` | `4` | `0..16`。`0` は Listener depth を継承 |
| `Direct/Reflection/Diffraction/Reverb/Transmission` | すべてオン | Source ごとの path family enable |
| `Override Project Attenuation Strengths` | オン | オフでは Project Settings の attenuation を使用 |
| Path ごとの `Strength` | `1.0` | `0.5..1.5`。値が大きいほど同じ距離で速く減衰 |
| `Max Delay Seconds` | `1.0 s` | `0.01..5 s`。Renderer が保持する最大 propagation delay |
| `Path Fade Time Seconds` | `0.066 s` | `0.001..0.5 s`。Path 追加／削除時の fade |
| `Path Hold Time Seconds` | `0.120 s` | `0..1 s`。消えた non-direct path を fade 前に保持。`0` は無効 |
| `Max Delay Rate` | `0.1` | `0.001..0.999`。Sample ごとの最大 delay 変化量 |
| `Bypass` | オフ | SoundTrace spatial rendering を行わず入力を通過 |

0.2.0 以降、spatializer は各 audio block の
`FAudioPluginSourceInputData::SpatializationParams` から source を直接更新します。
Source が native `(0,0,0)` に残る場合は、0.2.0 の module と binary が一緒に配布されて
いるか確認してください。

## SoundTracingObjectComponent

`SoundTracingObjectComponent` は immediate parent の `StaticMeshComponent` または
`SkinnedMeshComponent` を音響 geometry として登録します。Actor 階層の任意の場所ではなく、
対象 mesh component の直下に追加してください。

### Inspector

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

Static Mesh は Forced LOD があればそれを、なければ LOD 0 を upload します。Skinned Mesh も
Forced LOD を優先し、現在 pose の vertex を登録します。

### Geometry と BVH

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

### Blueprint メソッド

| メソッド | 動作 |
|---|---|
| `RegisterNativeObject()` | Parent geometry を native scene に登録 |
| `UnregisterNativeObject()` | Native object 登録を解除 |
| `SyncNativeTransform()` | 現在の parent transform を即時反映 |
| `RefreshNativeMesh()` | Mesh または material 変更後に geometry を再 upload |
| `Auto Set Materials` | Parent render material 名と alias から preset を自動選択 |
| `SetMaterialPresetIndex(Slot, Preset)` | 1 つの slot の preset index を変更 |
| `SetMaterialPresetForAllSlots(Preset)` | 全 slot に同じ preset を適用 |
| `SetUpdateType(Type)` | Native object update policy を変更 |
| `GetResolvedMeshLodIndex()` | 実際に upload した LOD index を返す |
| `GetUploadedTriangleCount()` | 最後に upload した triangle 数を返す |
| `IsRegistered()` | Native object と mesh が両方有効か返す |

## 音響マテリアルと Transmission

既定 library は plugin の
`Content/STData/Material/SoundTraceMaterialPresetLibrary.uasset` です。現在、Unity/Web SDK
と同じ 22 material table を含みます。

Custom library は Content Browser の
`Sounds > SoundTracing > SoundTracing Material Preset Library` から作成します。新しい asset
は現在の既定 library を複製します。Project Settings の `Material Preset Library` に指定し、
Editor を再起動してください。

各 preset には次の値があります。

- Display name と render material name alias
- Scattering `0..1`
- 8-band Reflection、Absorption、Transmission `0..1`
- Transmission Model
- `Solid Distance` 用の 8-band `Thickness to -30 dB (m)`

周波数帯域の中心は `67.5`、`125`、`250`、`500`、`1000`、`2000`、`4000`、
`8000 Hz` です。Editor の band graph を click または drag して値を編集できます。

### Transmission Model

| モデル | 入力 | Geometry 条件 |
|---|---|---|
| `Surface` | 1 回の表面通過後に残る帯域別 energy coefficient `0..1` | 開いた面や薄い surface に使用可能 |
| `Solid Distance` | 透過 energy が `-30 dB` になる帯域別基準距離 (m) | 閉じた volume と一貫した face 方向が必要 |

`Solid Distance` 値は object の実際の厚みではありません。Runtime は geometry 内部を通った
実距離を測定し、この基準距離で減衰します。`0` はその band を完全に遮断します。

`ImportFromJson`、`ExportToJson`、`ResetToBundledJson` は Unity/Web と共通の
`soundMaterial.json` 形式を使用します。`transmissionDistanceToMinus30DbMeters` がなければ
`Surface`、有効な 8 値があれば `Solid Distance` です。

## SoundTracingPathVisualizerComponent

Actor に `SoundTracingPathVisualizerComponent` を追加すると、最新 propagation frame を
Niagara line segment で表示します。

| フィールド | 既定値 | 説明 |
|---|---:|---|
| `Visualization Enabled` | オン | Path 表示の有効化 |
| `Refresh Interval Ms` | `50` | 可視化の最小更新間隔。Propagation 周期には影響しない |
| `Max Visualized Paths` | `1024` | 最大表示 path 数。範囲 `16..5000` |
| `Path Alpha Intensity` | `0.5` | Segment alpha 強度。範囲 `0.01..2.0` |
| `Niagara System` | 空 | 空の場合は plugin 既定 Niagara system を使用 |

色は Direct=red、Reflection=orange、Diffraction=green、Transmission=cyan、
Reverb=purple です。`SetVisualizationEnabled(bool)` で runtime 表示を制御し、
`GetActivePathCount()` で現在の path 数を取得します。Shipping の性能測定では
無効化してください。

## SoundTracingSubsystem

`SoundTracingSubsystem` は Unity Manager runtime panel に相当する `WorldSubsystem` です。
Blueprint に次の状態と命令を公開します。

| メソッド | 動作 |
|---|---|
| `IsNativeRuntimeReady()` | Library、native init、scene、listener の準備状態 |
| `IsGpuPropagationActive()` | GPU device を実際に取得したか |
| `GetGpuBackendStatus()` | `GPU active`、`CPU`、`CPU fallback (...)` を返す |
| `GetLastValidPathCount()` | 最新 propagation frame の valid path 数 |
| `GetLastNativeError()` | Control thread の最新 native error。なければ空文字 |
| `GetNativeVersion()` | Native version `major.minor.revision` |
| `GetRegisteredObjectCount()` | 現在 World の登録 object 数 |
| `GetActiveListenerSettings()` | Native listener に実際に適用中の設定 |
| `ResetMotionState()` | Listener と source の motion history を初期化 |
| `RequestPropagationFrame()` | 通常周期外で propagation frame を要求 |

## GPU バックエンド

`Use GPU Backend` を有効にして Editor を再起動すると、`exaPropagatorInitGpu` で
Dawn/WebGPU backend を要求します。

- 初期化成功: `GPU active`
- Native build に GPU add-on がない: `CPU fallback (this exaSound build has no GPU backend)`
- Adapter/device 初期化失敗: 理由付き `CPU fallback (...)`
- GPU を要求していない: `CPU`

Win64 配布では `exaSound.dll` と同じ artifact directory の `webgpu_dawn.dll` を stage
してください。Plugin Build.cs はこの directory の DLL を runtime dependency に登録します。

実際の状態は Blueprint の `GetGpuBackendStatus()` または次の console command で確認します。

```text
SoundTracing.Status
SoundTracing.DumpGpuPropagationStats
```

`SoundTracing.Status` は native version、ready、backend、object/path 数、Listener profile を
出力します。`SoundTracing.DumpGpuPropagationStats` は GPU dispatch、ready、CPU fallback
counter を出力します。

## 座標系

Plugin component を使う場合、座標を手動変換する必要はありません。0.2.0 は Unreal 座標を
STCoreV2 に次のように渡します。

```text
position / vertex / velocity = (UE.Y, UE.Z, UE.X) × 0.01 m
sceneRatio = 1
listener basis: right=(1,0,0), up=(0,1,0), forward=(0,0,-1)
```

Listener basis は ADR-0001 に準拠し、以前の HRTF front/back 反転を修正します。Custom native
integration の場合だけ、この contract を手動で適用してください。

## サンプルプロジェクト

現在の SDK source project の `Content/FirstPerson/Test.umap` で、
`SoundTracingObjectComponent` の geometry、BVH、material slot 設定を確認できます。
この map は host project の Content にあり、`Plugins/SoundTracing` だけをコピーする場合は
含まれません。

## トラブルシューティング

| 症状 | 確認項目 |
|---|---|
| `STCoreV2 export table is incomplete` | Plugin 0.2.0 と STCoreV2 v0.7 ABI 4 binary を一緒に配布し、ABI 3 DLL を削除 |
| Plugin が Audio 選択肢にない | Plugin enable、C++ module compile、target Audio 設定、Editor 再起動 |
| Native library load 失敗 | Target 別 `ThirdParty/STCoreV2` runtime/link artifact と package staging |
| Source が空間化されない | Global Spatialization/Source Data Override、source Spatialization、SoundTracing settings asset |
| Source が原点に残る | 0.2.0 module と binary を一緒に配布。0.2.0 は audio block ごとに spatialization params を使用 |
| Listener 位置が違う | `Drive Listener Transform`。オフなら Unreal audio-device listener を使用 |
| Listener 置換警告 | 1 World に active `SoundTracingListenerComponent` を 1 つだけ保持 |
| Geometry が反映されない | Object Component が対応 mesh の immediate child か、render data と triangle があるか |
| Skinned animation が反映されない | `Update Type = Refit`、`Sync Skinned Vertices On Tick = true`、固定 LOD と vertex count |
| GPU が CPU に fallback | `webgpu_dawn.dll`、GPU 対応 native build、adapter/device、Output Log、`SoundTracing.DumpGpuPropagationStats` |
| Path が見えない | Niagara plugin、Visualizer enable、max path 数、Source/Listener path enable |
| Teleport 後に pitch が跳ねる | 移動直後に Listener Component または Subsystem の `ResetMotionState()` を呼ぶ |
| Source が多いと dropout | HRTF Path Budget `1`、`Merged4`、低い quality preset、callback/buffer 設定の順に確認 |
| Editor 終了時 stack overflow | Control-thread shutdown fix を含む最終 0.2.0 plugin を使用 |

## 次に読む

- [SDK 概要](./overview.md)
- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
