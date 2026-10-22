---
title: Unreal Engine
description: SoundTracing UE5 プラグイン 0.4.0（SimpleST 2.18.2 / ABI 6）のインストール、Project Settings、リスナー・音源・オブジェクトコンポーネント、ワンショットサウンド、Native/FMOD/Wwise 統合モード、プラットフォームリンク契約。
---

# SoundTrace SDK for Unreal Engine

SoundTracing UE5 プラグインは、Unreal Audio Mixer の Spatialization プラグイン + サブミックス、そして
Actor Component を通して [SimpleST](../core/simplest.md) を接続します。0.3.0 からエンジンが STCoreV2 から
SimpleST に変わり、0.4.0 は **SimpleST 2.18.2 / ABI 6** を使います（以前のリリース: 0.3.0 = SimpleST 2.12.0）。
プロジェクトに FMOD または Wwise プラグインがあると、同じソースがそのミドルウェアの SimpleST プラグインへ接続する
**統合モード**でビルドされます。

## 現在の状態

| 項目 | 内容 |
|---|---|
| Engine | Unreal Engine 5.6（5.7 で検証） |
| Plugin | `Plugins/SoundTracing` 0.4.0（`SoundTracing` ランタイム + `SoundTracingEditor` モジュール、Niagara 依存） |
| 対応プラットフォーム | Win64、Mac、Linux、Android、IOS |
| 配布 | `SoundTracing-release.zip`（プラグイン + 独立 Python インストーラー） |
| エンジンバイナリ | `ThirdParty/SimpleST/Binaries/<Plat>/<Config>/` — UE Debug のみ SDK Debug、他は Release |
| Demo scene | ドキュメント用プレースホルダー 3 件。配布 scene はまだ未同梱 |

## インストール

Python 3.9+ がある環境でインストーラーを実行します。プロジェクトの `Plugins/SoundTracing` に同梱の全
プラットフォームをインストールし、既存のプラグインは `.simplest-backups/` に保管します。プロジェクト設定は変更しません。

```bash
python3 install.py /path/to/Game.uproject
python3 install.py /path/to/Game.uproject --dry-run
```

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/           Niagara 経路可視化, Material Preset Library
      ├─ Source/            SoundTracing · SoundTracingEditor
      └─ ThirdParty/SimpleST/
         ├─ Include/SimpleST/ABI/
         ├─ Binaries/<Plat>/<Config>/
         └─ Resources/HRTF/
```

インストール後、`.uproject` で `SoundTracing` plugin を有効にし、editor を再起動して module compile を
完了します。インストール物には UE ラッパーソース、アセット、公開 C ABI ヘッダー、プラットフォーム別エンジンバイナリ、HRTF と
ライセンスのみが含まれます。

## 統合モード — Native / FMOD / Wwise

![統合モードの選択](/img/ue/integration-mode.png)

`SoundTracing.Build.cs` が `.uproject` で有効なプラグインを見て統合を選びます
（`Wwise` → `FMODStudio` → Native の順、強制は環境変数
`SOUNDTRACING_UNREAL_INTEGRATION=native|fmod|wwise`）。コンポーネントは 3 つのモードで名前も使い方も同じです。

| | Native | FMOD | Wwise |
|---|---|---|---|
| SimpleST コンテキスト・レンダー | SoundTracing（UE Audio Mixer Spatialization + サブミックス） | `SimpleSTFmod`（Source/Listener DSP） | `SimpleSTWwise`（Sound-tracing Renderer） |
| SoundTracing が行うこと | すべて | ジオメトリ・材質・可視化・統計のみ | 同じ（`sceneRatio = 0.01`、Unreal 軸の通知） |
| リスナー | UE リスナー / `ListenerComponent` | FMOD リスナー 0 | Wwise リスナー |
| エンジン DLL の位置 | `ThirdParty/SimpleST/Binaries` | `FMODStudio/Binaries/<Plat>/` | `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` |

FMOD・Wwise モードでは `ListenerComponent` の出力設定（HRTF・出力モード）と Source Settings アセットは
使われません — ミドルウェアプラグインのパラメータがその役割を担います。

### FMOD モードのインストール

```bash
python3 install.py /path/to/Game.uproject --fmod <fmod/plugins フォルダー>
```

`--fmod` は `SimpleSTFmod`・`SimpleSTRealtime`・HRTF を `Plugins/FMODStudio/Binaries/<Plat>/` にコピーし、
`Config/DefaultEngine.ini` に `+PluginFiles=SimpleSTFmod` を追加します（= Project Settings › FMOD Studio ›
Plugin Files）。その後、FMOD Studio でマスターバスに SimpleST Listener を、3D イベントのマスタートラックに
SimpleST Source を入れます — [FMOD プラグイン](./fmod.md)。

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

### Wwise モードのインストール

```bash
python3 install.py /path/to/Game.uproject --wwise <wwise/SDK フォルダー>
```

SoundTracing はモジュール起動時にプラグインを掴んで `sceneRatio = 0.01`（Wwise Unreal の単位 = cm）に設定し、
`SimpleSTWwise_SetWorldAxes(UNREAL)` で Unreal の軸（+Z 上）を通知します。Wwise for Unreal 2024.1+ は
位置を軸変換なしで渡すためです — [Wwise プラグイン](./wwise.md)。

![UE Wwise インストール結果](/img/wwise/ue-install.png)

## Unreal Audio 設定（Native モード）

各 target platform の Audio 設定で次の plugin を選択します。

![Audio プラグイン設定](/img/ue/audio-plugin-settings.png)

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

Audio Mixer Sample Rate はどの値でも構いません。SimpleST は 44.1 kHz で動作し、デバイスレートへ変換します
（44.1 kHz なら変換をスキップします）。

## Project Settings › Plugins › SoundTracing

![Project Settings](/img/ue/project-settings.png)

| カテゴリ | 項目 | 既定値 | 説明 |
|---|---|---:|---|
| Runtime | `Max Compute Threads` | `0` | SimpleST 計算スレッドの上限。0 = auto（min(パフォーマンスコア, 6)）。再起動が必要 |
| Runtime | `Prefer Performance Cores` | `true` | 伝搬レーン・計算プールをパフォーマンスコアに固定（Windows 11 EcoQoS を無効化）。ハイブリッド CPU で推奨 |
| Runtime | `Render Mode` | `Buffered` | `Buffered`（SimpleST レンダースレッドがリングを埋め、コールバックはコピー、≈3 ブロック遅延）/ `In Callback`（Unreal オーディオコールバック内でレンダー、最低遅延） |
| Runtime | `Max Delay Seconds` | `0` | レンダラーが維持する最大経路遅延。0 = エンジン既定の 2 s |
| Runtime | `Dry Fallback When Unavailable` | `true` | ランタイムがない、または失敗した場合、音源を無音ではなく dry で再生 |
| Runtime | `Output Submix Parent` | 空 | 空間化出力サブミックスの親 |
| Propagation | `Reflection Update Interval (ms)` | `33` | 反射/回折レーンの最小周期。伝搬コストの大半なので、CPU を取り戻すにはここを上げる。0 = 制限なし |
| Propagation | `Direct Update Interval (ms)` / `Reverb Update Interval (ms)` | `10` / `4` | direct、reverb レーンの最小周期 |
| Propagation | `Acceleration Structure` | `TinyBVH` | BinnedSAH / HybridKD / TinyBVH / LBVH / LBVH SIMD |
| Propagation | `Static Rebuild Delay Seconds` | `0.1` | 静的ジオメトリの変更を静的加速構造に畳み込む前の待機（レベルストリーミングのバッチ処理） |
| Listener | `Default Listener Settings` | — | 下記のリスナー設定構造体 |
| Sources | `Source Ray Resolution Cap` / `Source Ray Depth Cap` | `0` / `0` | すべての音源アセットの transport ray 格子・深度の上限。0 = アセット値のまま |
| Materials | `Material Preset Library` | 空 | 起動時に SimpleST へ登録するライブラリ。空ならプラグインのバンドルを使用 |

## リスナー設定（`FSoundTracingListenerSettings`）

![リスナー設定](/img/ue/listener-settings.png)

プロジェクト既定値は Project Settings に、レベルごとの override は `USoundTracingListenerComponent` に置きます。

| カテゴリ | 項目 | 既定値 | 選択肢 / 説明 |
|---|---|---:|---|
| Quality Preset | `Quality Preset` | `Balanced` | `Custom`（フィールド維持）/ `Fast`（12×12、深度 4）/ `Balanced`（16×16、深度 8 = エンジン既定）/ `Quality`（24×24、深度 8） |
| Listener Rays | `Ray Resolution` / `Ray Depth` | `16` / `8` | guide ray N×N（`4..64`）、反射の最大次数（`1..16`）。Custom のときのみ編集可 |
| Listener Rays | `Ray Sampling` | `FibonacciSphere` | LegacyGrid / FibonacciSphere / EqualAreaGrid / SobolSphere / Icosahedral |
| Output | `Output Mode` | `Headphones` | `Headphones`（バイノーラル HRIR）/ `Speakers (HOA decode)` / `Stereo Panning` |
| Output | `HRTF Dataset` | `SADIE II D2 KEMAR` | SADIE II D2（8,802 方向・256 タップ、プラグイン同梱）/ MIT KEMAR（128 タップ、エンジン内蔵） |
| Output | `Speaker Layout` | `Stereo 2.0` | Stereo 2.0 / Laptop Stereo 2.0 / 2.1 / 4.1 / 5.1 / 7.1 |
| Output | `Early Reflections` | `Hybrid Ambisonic Bed` | Headphones・Stereo Panning 専用。`Objects` は基準聴取用 — 音源 8 個のホールでブロック 16.8 ms（上限 11.6 ms）、Hybrid は 2.4 ms |
| Render | `Doppler` / `Doppler Gain` | `true` / `Off` | 可変遅延ピッチ / 移動モノポール放射ゲイン |
| Render | `Late Reverb` / `Late Reverb Coupling` | `true` / `Default` | FDN16 / Off · Subtle 6 dB · Default 9 dB · Strong 12 dB |
| Render | `Path Fade Time Seconds` | `0.05` | 経路の出現・消滅クロスフェード |
| Render | `Limiter` | `Off` | Off / Envelope / LookaheadPeak / True Peak。`True Peak`（0.4.0）は SimpleST 2.18 の true-peak リミッター（−1 dBTP、137 サンプル遅延）。エンジン 2.18 は生成直後にリミッターを有効にしますが、プラグインの既定は `Off` で、Unreal のマスターチェーンがリミッティングを担います。0.4.0 でスピーカー出力（`Speakers`）でも `Off` が適用されるよう修正 |
| Render | `Output EQ Enabled` / `Output EQ Gains Db` | `false` | 63 ~ 16k Hz 9バンド ±24 dB |
| Paths | `Enable Direct/Transmission/Reflection/Diffraction/Reverb Path` | すべて `true` | グローバル経路ゲート |
| Acoustics | `Propagation Delay` / `Direct Occlusion` | `true` / `true` | 無効にすると、それぞれ全経路が直接音の時刻に重なる / 直接音がジオメトリを通過する |
| Acoustics | `Reference Distance Meters` / `Min Distance Meters` | `1.0` / `1.0` | 物理 `1/r` 減衰の開始距離 / 近接クランプ |
| Air Absorption | `Air Absorption Enabled`、`Temperature Celsius`、`Relative Humidity Percent`、`Pressure Pa` | `true`、`20`、`50`、`101325` | ISO 9613-1。音速は温度から導出 |

### `USoundTracingListenerComponent`

任意のコンポーネントです。なくてもプラグインはプロジェクト既定のリスナー設定とオーディオデバイスリスナーの transform で
動作します。Pawn やカメラに付けてレベルごとの override を与えるか、transform を直接供給します。

| 項目 | 説明 |
|---|---|
| `Override Project Listener Settings` / `Listener Settings` | 上記の構造体でプロジェクト既定値を上書き |
| `Drive Listener Transform` | このコンポーネントの world transform・速度をオーディオデバイスリスナーの代わりに SimpleST へ渡す |
| `ApplyListenerSettings()`、`SetQualityPreset()`、`SetHrtfDataset()`、`SetOutputMode()`、`SetSpeakerLayout()` | Blueprint からのランタイム変更 |
| `ResetMotionState()` | テレポート・リスポーン後の Doppler スパイク防止 |

## 音源設定アセット（`USoundTracingSourceSettings`）

![Source Settings アセット](/img/ue/source-settings-asset.png)

Content Browser で `SoundTracing Source Settings` アセットを作成し、Audio Component または Sound
Attenuation の spatialization plugin settings に接続します。用途別の shared asset を preset のように使ってください。

| preset asset | 用途 |
|---|---|
| `ST_Source_Fast` | 多数の同時音源、背景 source |
| `ST_Source_Balanced` | 一般的な gameplay source |
| `ST_Source_Quality` | 主役の音源、品質優先 demo |

| カテゴリ | 項目 | 既定値 | 説明 |
|---|---|---:|---|
| Attenuation | `Preserve Unreal Attenuation` | `false` | 有効にすると Unreal の距離減衰を維持（通常は無効 — SimpleST が物理減衰） |
| Attenuation | `Disable Unreal Reverb Sends` | `false` | Unreal のリバーブセンドを遮断 |
| Emission | `Gain Boost Db` | `0` | 入力レベル（±24 dB） |
| Emission | `Direct/Reflection/Diffraction/Reverb Send Db` | `0` | SimpleST path volume |
| Emission | `Directivity` | `0` | 0 全指向 ~ 1 カーディオイド |
| Reverb Rays | `Ray Preset` | `Balanced` | `Fast`（8×4、深度 3）/ `Balanced`（16×8、深度 4 = エンジン既定）/ `Quality`（24×12、深度 6）/ `Custom` |
| Reverb Rays | `Ray Resolution` / `Ray Depth` | `16` / `4` | N×N/2 transport ray、深度。Custom のときのみ編集可 |
| Reverb Rays | `Transport Refresh Steps` | `0` | 輸送格子を n 回の伝搬に分けて更新（0 = エンジン既定） |
| Reverb Rays | `Stationary Emitter` | `false` | 動かないエミッターのヒント |
| Per-Path Enable | `Direct/Transmission/Reflection/Diffraction/Reverb Path Enabled` | すべて `true` | 音源ごとの経路ゲート |
| Bypass | `Bypass` | `false` | SimpleST を経由せずに通過 |

## ワンショットサウンド

エンジンは**新しい音源**のすべての経路を 150 ms かけてフェードインし最初の IR を待つため、銃声・足音のたびにエンジン
音源を新しく作ると、短いショットが小さく遅れて聞こえます。プラグインはモードごとにこれを処理します。

- **Native モード**: コンテキスト開始時にエンジン音源プールをあらかじめ作っておき、ボイスが終わるとその音源をプールへ
  戻して、最も近い次のボイスが引き継ぎます。ショットごとに Audio Component・サウンドを新しく再生しても、エンジン
  音源は新しく作られません。
- **FMOD / Wwise モード**: レンダーはミドルウェアプラグインが行うため、そのウォーム音源プール（FMOD 0.3.0 · Wwise 0.2.0）に
  従います — [FMOD](./fmod.md#ワンショットとウォーム音源プール) · [Wwise](./wwise.md#ワンショットとウォーム音源プール)。
  **Wwise AudioLink** のように音ごとに新しいゲームオブジェクトを登録する場合も処理されます。

## ジオメトリ（`USoundTracingObjectComponent`）

![Object Component](/img/ue/object-component.png)

音響 geometry として使う `StaticMeshComponent` または `SkinnedMeshComponent` の**直下の child** として
追加します。同じメッシュ asset・LOD・材質配置を使うオブジェクトは SimpleST メッシュを 1 つ共有します。

| 項目 | 既定値 | 説明 |
|---|---:|---|
| `Acoustic Mobility` | `Auto` | `Auto`（親の Mobility に従う）/ `Static`（静的加速構造、移動すると再ビルド）/ `Movable`（動的インスタンス、伝搬周期ごとに変換を適用） |
| `Sound Material Slots` | — | レンダー材質スロット → `Sound Material Type`（preset index）。`Auto Set Materials` ボタンが名前・エイリアスで自動配置 |
| `Skinned Pose Refresh Seconds` | `0` | スキンド親専用。SimpleST には vertex refit がないため、この周期ごとに**新しいメッシュをビルド**して差し替え。0 = 登録時のポーズを維持 |
| `Auto Register Native Object` / `Sync Transform On Tick` / `Auto Sync Materials` | `true` | 高度な設定 |
| Debug: `Visualize Acoustic Mesh`、`Visualize BVH`（+ `BVH Depth`、`BVH Leaves Only`） | 無効 | 選択時にアップロードされた三角形・加速構造ノードボックスをエディターに表示 |

専用サーバーでは登録をスキップします。Blueprint から `RegisterNativeObject`、`UnregisterNativeObject`、
`SyncNativeTransform`、`RefreshNativeMesh`、材質スロットの get/set を呼び出せます。

## Material preset

プラグイン content の `SoundTraceMaterialPresetLibrary` が SoundTrace ゲーム材質 22 種の 9バンド preset を
提供します。Unity・Web SDK と名前・順序（インデックス 0 `Concrete` ~ 21 `FiberglassReinforcedPlastic`）・
9バンド値がすべて同じです。測定データではなくゲーム用プリセットで、既存の 8バンド値から反射 R と透過 T は
そのまま残し、吸収は A = 1 − R − T、16 kHz バンドは 8 kHz の値を繰り返して変換しました。旧 STCoreV2 の
材質ライブラリと `soundMaterial.json` も読み込み時（`Import From JSON` を含む）に同じ規則で変換されるため、
変換された asset は保存し直してください。
`Sound Material Slots` は render material 名と alias で最も近い preset を選びます。9バンドの
reflection・absorption・transmission・scattering を直接編集する作業は、別の Material Preset Library
asset を作った場合に限ってください。バンドごとに `R + A + T = 1`（±0.001）でなければなりません。

## Path visualization

![Path Visualizer](/img/ue/path-visualizer.png)

Actor に `SoundTracingPathVisualizerComponent` を追加すると、Niagara ベースの path segment を表示します。
経路の種類（Direct・Reflection・Diffraction・Reverb・Transmission・GuideRay）ごとの色、最大経路数、線幅、
アルファを調整します。デバッグとデモ用であり、shipping の性能測定では無効にしてください。

## 統計（`USoundTracingSubsystem`）

Blueprint から読める World Subsystem です — 統合モード、シーンのメッシュ/オブジェクト/音源/三角形数、
有効経路数、レーン別の伝搬・IR・レンダー時間（ms）、レンダーブロック統計（active sources、exact/send taps）。

## プラットフォームリンク契約

| UE プラットフォーム | SDK パス（`Binaries/` 以下） | リンク |
|---|---|---|
| Win64 | `Win64/<Config>/SimpleSTRealtime.dll` | ランタイム export バインディング |
| Mac | `Mac/<Config>/libSimpleSTRealtime.dylib` | Universal、ランタイムバインディング |
| Linux | `Linux/<Config>/libSimpleSTRealtime.so` | x86_64、ランタイムバインディング |
| Android | `Android/<ABI>/<Config>/libSimpleSTRealtime.so` | UPL で APK の ABI 別フォルダーにコピー。HRTF は UFS から抽出 |
| IOS | `IOS/device` または `IOS/simulator` 以下の `<Config>/libsimplest_static.a` | 静的リンク、直接の関数ポインターバインディング |

UE Debug のみ SDK Debug を使い、Development/DebugGame/Shipping は Release を使います。
欠落は UBT 段階でエラーになります。ミドルウェアプラグインが静的リンクされる iOS・Web では FMOD/Wwise
モードはまだサポートされません（デスクトップは Win64 で検証、Mac/Linux は同じコード経路）。

## Demo scene placeholder

現在の SDK checkout には、以下の 3 つのドキュメント用 demo scene は含まれていません。実際の asset が
追加されたときに Unity ドキュメントと同じパターンで接続する場所です。

### SampleScene01 — Basic Room

:::note Placeholder
基本的な source、listener、static room geometry、material preset、direct/reflection path を
説明する scene です。
:::

### SampleScene02 — Material and Dynamic Door

:::note Placeholder
shared source preset、material の変更、Movable door の遮蔽、Buffered/In Callback レンダーモードの比較を
説明する scene です。
:::

### SampleScene03 — Multiroom

:::note Placeholder
複数の source、room 間の移動、diffraction/transmission、HRTF の方向感、late reverb coupling を説明する
scene です。
:::

## トラブルシューティング

| 症状 | 確認すること |
|---|---|
| plugin が選択リストにない | plugin enable、module compile、target platform の Audio 設定 |
| native library のロード失敗 | `ThirdParty/SimpleST/Binaries` の target 別 binary、Config（Debug/Release）の一致 |
| 統合モードが想定と違う | `.uproject` の Wwise/FMODStudio プラグインの有効状態、`SOUNDTRACING_UNREAL_INTEGRATION` |
| FMOD/Wwise モードで音が空間化されない | FMOD Studio / Wwise プロジェクト側の SimpleST DSP 構成、ランタイムの READY 状態（Output Log） |
| source が空間化されない（Native） | Audio Component に SoundTracing Source Settings asset が接続されているか |
| geometry が反映されない | Object Component の immediate parent が対応 mesh component か、`Acoustic Mobility` |
| レンダーブロック超過（オーディオの途切れ） | `Early Reflections = Hybrid`、`Reflection Update Interval` の引き上げ、Quality Preset の引き下げ |
| 銃声・足音が小さい、または遅れて聞こえる（FMOD/Wwise モード） | FMOD プラグイン 0.3.0 / Wwise プラグイン 0.2.0 以上か、`SIMPLESTFMOD_WARM_SOURCES=0` が設定されていないか |
| path が見えない | visualizer component、Niagara plugin、path enable の状態 |

## 次のドキュメント

- [FMOD プラグイン](./fmod.md) · [Wwise プラグイン](./wwise.md)
- [Unity SDK](./unity.md) · [Web SDK](./web.md)
- [SimpleST](../core/simplest.md)
