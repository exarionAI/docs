---
title: IRAnalyzer
---

# IRAnalyzer

**Room Impulse Response (IR) 解析・可視化ツール。**

IRAnalyzerは、[exaSound (STCoreV2)](../core/stcorev2.md) 幾何音響シミュレータが生成したIRの正確性を検証し、実測データや他シミュレータの結果と比較分析するツールです。2つの実行ファイルで構成されます。

## 構成

| モジュール | 実行ファイル | 説明 |
|---|---|---|
| **simulator** | `rir_sim` | Embreeベースの独立経路追跡IR合成器（検証用baseline） |
| **viewer** | `rir_viewer` | SDL3 + ImGuiベースのリアルタイム可視化・解析ツール |

## ビルド

### 要件

- CMake 3.20+
- C++20互換コンパイラ
- macOS 13.0+（Appleプラットフォームを優先サポート）

多くの依存関係はCMake `FetchContent`で自動ダウンロードされます。

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### 任意依存関係

| 依存関係 | CMake変数 | 用途 |
|---|---|---|
| Intel Embree 4 | system install | `rir_sim` path tracing |
| exaSound (STCoreV2) | `STCORE_SOURCE_DIR` | リアルタイム幾何音響シミュレーションbackend |
| SketchUp C SDK | `SKETCHUP_SDK_DIR` | `.skp`ファイル直接ロード |

```bash
# exaSound integration
cmake -S . -B build \
  -DSTCORE_SOURCE_DIR=/path/to/STCoreV2/exaSound \
  -DCMAKE_BUILD_TYPE=Release

# Add SketchUp SDK
cmake -S . -B build \
  -DSKETCHUP_SDK_DIR=/path/to/sketchup-sdk-mac \
  -DCMAKE_BUILD_TYPE=Release
```

### テスト

```bash
cd build && ctest
```

## Viewer (`rir_viewer`)

ImGui dockingベースのマルチパネルUIとして動作します。

| パネル | 機能 |
|---|---|
| **3D Viewport** | scene geometry、音響経路、debug visualization |
| **Control** | simulation parameters（ray resolution、max depth、tuning） |
| **View** | scene statistics、render options（wireframe、face culling） |
| **Materials** | 8-band absorption/scattering係数、BRAS CSV自動mapping |

## Simulator (`rir_sim`)

Embreeを直接使って経路を追跡しIRを合成する**独立**合成器です。同じscene/material条件でSTCoreV2と結果を比較し、正確性を検証する*reference* baselineとして使います。

## 活用シナリオ

- **回帰検証** — STCoreV2変更前後のIR差分確認
- **アルゴリズム比較** — deterministic tracing (`rir_sim`, Embree) vs statistical sound propagation (STCoreV2)
- **材質チューニング** — 8-band absorptionを調整して即時可視化
- **実測比較** — 測定IRとsimulation IRを同じ座標でoverlay

## 参考

- [STCoreV2](../core/stcorev2.md) — 解析対象シミュレータ
- [ExaTools概要](./overview.md)
