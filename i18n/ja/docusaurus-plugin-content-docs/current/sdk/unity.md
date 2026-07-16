---
title: Unity
description: SoundTrace Unity SDK の導入方法と、品質プリセット、Band8/Parametric HRTF、GPU 伝搬、3 つのサンプルシーンについて説明します。
---

# SoundTrace SDK for Unity

Unity SDK は、Unity のメッシュ、レンダーマテリアルスロット、音源、リスナーを
[STCoreV2](../core/stcorev2.md) に接続します。

## 要件

| 項目 | 対応 |
|---|---|
| Unity | 2022.3 LTS 以降 |
| デスクトップ | macOS、Windows、Linux |
| モバイル | iOS、Android |
| Web | WebGL ST/MT プラグイン |

GPU 伝搬は、インストール済みネイティブプラグインとプラットフォームが対応している
場合のみ有効になります。未対応構成では CPU 伝搬を継続します。現在、iOS と Android
は CPU 伝搬を使用します。

## インストール

Unity Package Manager で `Add package from git URL...` を選択し、次を入力します。

```text
https://github.com/exarionAI/Unity_SoundTraceSDK.git
```

認証またはライセンス済みパッケージが必要になる場合があります。直接クローンする
場合は、SDK を `Packages/` または開発シェルの `Assets/SoundTrace` のどちらか一方に
配置し、両方には配置しないでください。

## Unity Audio 設定

1. `Edit > Project Settings > Audio` を開きます。
2. `Default Speaker Mode` を `Stereo` に設定します。
3. `DSP Buffer Size` を `Best latency` に設定します。

![Unity Audio settings](/img/unity/Image01_AudioSetting.png)

## 最短セットアップ

1. 空の GameObject に `SoundTraceManager` を追加します。
2. Main Camera に `SoundTraceListener` を追加します。
3. 音源 GameObject に `SoundTraceSource` を追加し、`AudioSource` のクリップを設定します。
4. 音響ジオメトリとして使用するメッシュ GameObject に `SoundTraceObject` を追加します。
5. 必要に応じて Manager GameObject に `SoundTracePathVisualizer` を追加します。
6. Play Mode に入り、音声と経路を確認します。

![SoundTraceManager](/img/unity/Image06_Manager.png)

![SoundTraceListener](/img/unity/Image04_Listener.png)

![SoundTraceSource](/img/unity/Image05_Source.png)

![SoundTraceObject](/img/unity/Image03_SoundTraceObject.png)

## 品質プリセット

最初は `SoundTraceListener > Quality Preset` だけを選択してください。

| プリセット | 推奨対象 |
|---|---|
| `Fast` | モバイル、低消費電力デバイス、多数の音源 |
| `Middle` | 通常のゲームおよびデスクトップの既定値 |
| `Quality` | ハイエンドデバイスおよび品質優先デモ |

プリセットはリスナーレイと HRTF／Diffuse のレンダリング品質をまとめて適用します。
プリセット管理対象のプロパティを個別編集すると、プリセットは `Custom` に変わります。
通常の統合では、レイ解像度、深度、経路予算を手動調整せずプリセットを使用してください。

## HRTF の選択

`SoundTraceListener > HRTF` でモードを選択します。

| モード | 動作 |
|---|---|
| `Band8` | 外部 HRTF テーブルを使わない軽量経路 |
| `Parametric` | KU100 パラメトリックアセットを使用する計測ベース経路 |

現在の Unity ラッパーの既定値は `Parametric` です。`Parametric` は
`Runtime/Resources/SoundTrace/HRTF/KU100_bprime.bytes` を読み込み、`Band8` は
アセットの読み込みを必要としません。高度な HRIR モードも存在しますが、主要ガイド
では Band8 と Parametric に絞ります。

## GPU バックエンド

GPU 伝搬を要求するには `SoundTraceManager > Use GPU Backend` を有効にします。

- 初期化に成功すると GPU バックエンドを使用します。
- 未対応のプラグインまたはデバイスでは CPU フォールバックを継続します。
- `Propagation Thread Count` はフォールバック用に保持されます。
- WebGL は STCoreV2 WebGPU ビルドを使用します。

Manager のランタイム状態には `Active`、`Requested / CPU fallback`、`Disabled` の
いずれかが表示されます。

## 音響マテリアルプリセット

`SoundTraceObject` は Unity のマテリアルスロットを SoundTrace のマテリアル
プリセットへマッピングします。

1. メッシュのインポート設定で `Read/Write Enabled` を有効にします。
2. `SoundTraceObject` Inspector で `Auto Set` を実行します。
3. 誤って割り当てられたサブメッシュだけを修正します。

![Material Preset Library](/img/unity/Image_Mat_01.png)

既定ライブラリは
`Runtime/Resources/SoundTrace/SoundTraceMaterialPresetLibrary.asset` です。
まず `Concrete`、`Steel`、`Marble`、`Snow`、`Soil` などのプリセットを使用します。
8 バンド値の直接編集は、高度なカスタムマテリアル向けワークフローです。

## オブジェクト更新

| モード | 用途 |
|---|---|
| `Static` | 移動しない部屋、壁、床 |
| `Dynamic` | Transform のみ移動するドアや小物 |
| `Refit` | トポロジーが安定したスキン／アニメーションメッシュ |
| `Rebuild` | 実際にトポロジーが変化するジオメトリ |

ほとんどのシーンでは `Static` と `Dynamic` だけで十分です。

## 主要コンポーネント

### SoundTraceManager

シーンごとに 1 つ使用します。ネイティブランタイム、マテリアルプリセット、
伝搬更新、GPU/CPU バックエンド選択を所有します。

### SoundTraceListener

通常は Main Camera に追加します。`Quality Preset` と `HRTF` を選択し、高度な設定は
既定値のまま使用します。

### SoundTraceSource

同じ GameObject の `AudioSource` を空間化します。複数音源を同期する場合は、
共通の `AudioSettings.dspTime` と `PlayScheduled()` を使用します。

### SoundTraceObject

`MeshFilter` と `MeshRenderer` のジオメトリを登録します。複数のメッシュ子を持つ
インポートモデルでは `Add To Child Meshes` を使用します。

### SoundTracePathVisualizer

直接、反射、回折、残響、透過の各経路をデバッグ表示します。出荷時の性能測定では
無効にしてください。

## サンプル

### SampleScene01

![SampleScene01](/img/unity/SampleScene01.png)

基本的な部屋、音源、リスナー、ジオメトリ、マテリアル、経路可視化。

### SampleScene02

![SampleScene02](/img/unity/SampleScene02.png)

音源／リスナーの移動、マテリアルプリセット、Unity Audio と SoundTrace 出力の比較。

### SampleScene03

![SampleScene03](/img/unity/Img_25_Sample03.png)

広い空間の NPC 音源、壁による遮蔽、移動リスナーの HRTF 方向、ルームレスポンス。

## トラブルシューティング

| 症状 | 確認項目 |
|---|---|
| 音が出ない | Stereo／Best latency、AudioSource クリップ、Listener、Manager |
| ジオメトリが無視される | `Read/Write Enabled`、MeshFilter/MeshRenderer、更新モード |
| GPU が有効にならない | プラットフォームのプラグイン対応。CPU フォールバック警告は正常 |
| 性能が低い | `Quality → Middle → Fast` の順で下げ、その後に可視化を無効化 |
| 方向が正しくない | Main Camera の Transform と AudioListener の重複 |
| 複数音源がフランジングする | 同じ `AudioSettings.dspTime` から開始 |

## 次に読む

- [Web SDK](./web.md)
- [Unreal Engine SDK](./ue.md)
- [SDK 概要](./overview.md)
