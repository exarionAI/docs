---
title: Unreal Engine
description: SoundTracing UE5 プラグインの導入と、オーディオ統合、HRTF、GPU 伝搬、マテリアルプリセット、サンプルプレースホルダーについて説明します。
---

# SoundTrace SDK for Unreal Engine

UE5 SDK は Unreal Audio Extension プラグインと Actor Component を通して
[STCoreV2](../core/stcorev2.md) を接続します。現在のソースプロジェクトは
Unreal Engine 5.6 を対象とし、ネイティブ Unreal Audio、FMOD、Wwise 統合の
選択経路を含みます。

## 現在の状態

| 項目 | 状態 |
|---|---|
| エンジン | Unreal Engine 5.6 |
| プラグイン | `Plugins/SoundTracing` |
| 宣言済みターゲット | Win64、macOS、Linux、Android、iOS |
| 現在のチェックアウトに含まれるビルド済みバイナリ | Win64 Release |
| デモシーン | ドキュメント用プレースホルダー 3 件。シーンアセットは未同梱 |

その他のターゲットプラットフォームでは、配布パッケージに対応する STCoreV2
バイナリが必要です。

## インストール

1. プロジェクトを閉じます。
2. `Plugins/SoundTracing` を対象プロジェクトの `Plugins/` ディレクトリへコピーします。
3. `.uproject` を開き、`SoundTracing` プラグインを有効にします。
4. エディターを再起動し、モジュールのコンパイルを完了します。
5. `Project Settings > Plugins > SoundTracing` を開きます。

```text
YourProject/
└─ Plugins/
   └─ SoundTracing/
      ├─ Content/
      ├─ Source/
      └─ ThirdParty/
```

## Unreal Audio 設定

各ターゲットプラットフォームで次を選択します。

```text
Spatialization Plugin: SoundTracing
Source Data Override Plugin: SoundTracing
```

サンプルプロジェクトは 48 kHz、1024 フレームのコールバック、キューバッファ 1 個を
使用します。調整前に、現在のプロジェクトのオーディオ予算で動作を確認してください。

## 最短セットアップ

### 1. Project Settings

最初は次の項目だけを決定します。

- HRTF: `Band8` または `Parametric`
- GPU 伝搬を要求するか
- 既定の経路有効状態

レイ解像度、深度、Early Path 予算は既定値のままにします。

### 2. 音源設定アセット

Content Browser で再利用可能な `SoundTracing Audio Spatialization Settings`
アセットを作成します。各 Audio Component を個別編集せず、共有アセットを
プリセットとして扱います。

| プリセットアセット | 用途 |
|---|---|
| `ST_Source_Fast` | 同時発音数が多い音源または背景音源 |
| `ST_Source_Middle` | 通常のゲームプレイ音源 |
| `ST_Source_Quality` | ヒーロー音源および品質優先デモ |

現在のプラグインは高度な音源プロパティも公開しますが、多くのプロジェクトでは
強度、経路有効フラグ、減衰オーバーライドだけを変更してください。

### 3. Audio Component

共有 SoundTracing 設定アセットを Audio Component または Sound Attenuation の
Spatialization Plugin Settings に割り当てます。

### 4. ジオメトリ

`SoundTracingObjectComponent` を対象の `StaticMeshComponent` または
`SkinnedMeshComponent` の直接の子として追加します。現在の実装は直近の親メッシュを
使用します。

### 5. マテリアル

`Sync Materials From Parent` を実行してレンダーマテリアル名を SoundTrace の
マテリアルプリセットへマッピングし、誤っているスロットだけを修正します。

## HRTF

主要ガイドでは 2 つのモードを使用します。

| モード | 動作 |
|---|---|
| `Band8` | 外部 HRTF アセットを使わない軽量レンダリング |
| `Parametric` | KU100 パラメトリックテーブルを使用する計測ベースレンダリング |

ソースには高度な `Convolution` と `SteamAudio` モードも含まれます。対応アセットと
プラットフォームバイナリを検証済みの配布物でのみ使用してください。

## GPU バックエンド

`bEnableGpuPropagation` を有効にすると GPU Provider の初期化を要求します。

- 初期化に成功すると GPU 伝搬を使用します。
- Export、デバイス、バックエンドがない場合は CPU で継続します。
- Win64 パッケージでは `webgpu_dawn.dll` をステージングする必要があります。
- GPU 配布では互換性のある LBVH 系ジオメトリ設定を使用してください。

実際の経路は Output Log の `SoundTracing GPU propagation enabled` または
CPU フォールバック警告で確認します。

## マテリアルプリセット

プラグインコンテンツには既定の `SoundTraceMaterialPresetLibrary` が含まれます。
`SoundTracingObjectComponent` はレンダーマテリアル名とエイリアスをプリセットへ
マッピングします。まず同梱プリセットを使用し、8 バンドの反射、吸収、透過、
散乱値の直接編集は別のカスタムライブラリで行ってください。

## オブジェクト更新

| モード | 用途 |
|---|---|
| `Static` | 移動しないレベルジオメトリ |
| `Dynamic` | Transform のみ移動するドアや小物 |
| `Refit` | 頂点姿勢が変化するスキンメッシュ |
| `Rebuild` | トポロジーが変化するジオメトリ |

## 経路可視化

`SoundTracingPathVisualizerComponent` を追加すると、Niagara ベースの経路セグメントを
表示できます。これはデバッグ／デモ機能であり、出荷時の性能測定では無効にします。

## デモシーンのプレースホルダー

現在のチェックアウトには、次の 3 つのデモアセットは含まれていません。シーンの
配布開始後に接続するドキュメント構造を予約しています。

### SampleScene01 — Basic Room

:::note プレースホルダー
基本的な音源、リスナー、静的ルームジオメトリ、マテリアルプリセット、
直接／反射経路。
:::

### SampleScene02 — Material and Dynamic Door

:::note プレースホルダー
共有音源プリセット、マテリアル変更、Dynamic Door の遮蔽、CPU/GPU 比較。
:::

### SampleScene03 — Multiroom

:::note プレースホルダー
複数音源、部屋間移動、回折／透過、HRTF 方向。
:::

## トラブルシューティング

| 症状 | 確認項目 |
|---|---|
| セレクターにプラグインが表示されない | プラグインの有効状態、モジュールコンパイル、プラットフォーム Audio 設定 |
| ネイティブライブラリの読み込みに失敗する | `ThirdParty/STCoreV2` 内のターゲット別バイナリとステージ済み依存関係 |
| 音源が空間化されない | SoundTracing 音源設定アセットが Audio Component に割り当てられているか |
| ジオメトリが無視される | Object Component の直近の親が対応メッシュコンポーネントか |
| GPU が CPU にフォールバックする | GPU Provider／Export／デバイスと `webgpu_dawn.dll` のステージング |
| 経路が表示されない | Visualizer Component、Niagara プラグイン、経路有効状態 |

## 次に読む

- [Unity SDK](./unity.md)
- [Web SDK](./web.md)
- [STCoreV2](../core/stcorev2.md)
