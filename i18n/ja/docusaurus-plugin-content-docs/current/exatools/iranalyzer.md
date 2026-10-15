---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response (IR) 解析・可視化ツール。**

IRAnalyzer は、Sound Tracing 幾何音響シミュレータが生成した IR の正確性を検証し、実測
データや他のシミュレータの結果と比較分析するツールです。2 つの実行ファイルで構成されます。

:::note
IRAnalyzer のリアルタイムシミュレーションバックエンド連携オプションは STCoreV2 ソースツリー基準で作成されています。
SimpleST オフライン ABI（`SimpleSTOffline`）をバックエンドとして使う連携は別の作業であり、それまでは
SimpleST が生成した圧力 IR（WAV）を外部 IR として読み込んで解析する流れを使います。
:::

## 構成

| モジュール | 実行ファイル | 説明 |
|---|---|---|
| **simulator** | `rir_sim` | Embree ベースの独立経路追跡 IR 合成器（検証用 baseline） |
| **viewer** | `rir_viewer` | SDL3 + ImGui ベースのリアルタイム可視化・解析ツール |

## ビルド

### 要件

- CMake 3.20+
- C++20 互換コンパイラ
- macOS 13.0+（Apple プラットフォームを優先サポート）

多くの依存関係は CMake `FetchContent` で自動ダウンロードされます。

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### 任意依存関係

| 依存関係 | CMake 変数 | 用途 |
|---|---|---|
| Intel Embree 4 | （システムインストール） | `rir_sim` の経路追跡 |
| STCoreV2 ソース（レガシー） | `STCORE_SOURCE_DIR` | 旧リアルタイムシミュレーションバックエンド |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | `.skp` ファイルの直接ロード |

```bash
# SketchUp SDK を追加
cmake -S . -B build \
  -DSKETCHUP_SDK_DIR=/path/to/sketchup-sdk-mac \
  -DCMAKE_BUILD_TYPE=Release
```

### テスト

```bash
cd build && ctest
```

## Viewer (`rir_viewer`)

ImGui docking ベースのマルチパネル UI として動作します。

| パネル | 機能 |
|---|---|
| **3D Viewport** | シーン geometry、音響経路、デバッグ可視化 |
| **Control** | シミュレーションパラメータ（ray 解像度、max depth、チューニング） |
| **View** | シーン統計、レンダリングオプション（wireframe、face culling） |
| **Materials** | バンドごとの吸音率・散乱係数、BRAS CSV の自動マッピング |

## Simulator (`rir_sim`)

Embree を直接使って経路を追跡し IR を合成する**独立**合成器です。同じ
シーン・材質条件で SimpleST と結果を比較して正確性を検証する*基準線（reference）*
として使います。

## 活用シナリオ

- **回帰検証** — エンジン変更前後の IR 差分の確認
- **アルゴリズム比較** — 決定論的追跡（rir_sim、Embree）vs 統計的音響伝搬（SimpleST）
- **材質チューニング** — バンドごとの吸音率を調整して即時可視化
- **実測比較** — 測定した IR とシミュレーション IR を同じ座標でオーバーレイ（BRAS CR2 ~ CR4 基準）

## 参考

- [SimpleST](../core/simplest.md) — 解析対象のシミュレータ
- [ExaTools概要](./overview.md)
