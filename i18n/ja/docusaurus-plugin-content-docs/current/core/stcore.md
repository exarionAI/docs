---
title: STCore
---

# STCore

**第1世代Sound Tracingコアモジュール。FPGAハードウェアアクセラレーションと連携するSoundTracer + Auralizatorライブラリです。**

STCoreはSound Tracing技術の第1世代実装です。C/C++ベースの音響シミュレーションライブラリであり、FPGAアクセラレータと通信するHWインターフェース層を含みます。現在は保守モードで、新規開発は [STCoreV2](./stcorev2.md) で行われます。

## 概要

| 項目 | 値 |
|---|---|
| 主言語 | C / C++ |
| ビルド | Visual Studioソリューション (`SoundTracer.sln`) + CMake |
| 主プラットフォーム | Windows (x64) |
| HWアクセラレーション | FPGAインターフェース (libusbベース) |
| 状態 | 保守 |
| 後継ライン | [STCoreV2](./stcorev2.md) |

## モジュール構成

```
STCore/
├── SoundTracerSource/
│   ├── Core/         # acoustic tracing and auralization core
│   ├── HW/           # FPGA interface
│   ├── Auralization/ # convolution and HRTF
│   ├── Math/         # vector and matrix utilities
│   ├── Objects/      # scene objects
│   ├── OperatorSource/
│   ├── GL/           # visualization helpers
│   └── Utils/        # common utilities
├── SoundTracer/         # Visual Studio demo/launcher
├── SoundTracingDemo/    # demo application
├── LIB/                 # build outputs
└── Doc/                 # Doxygen documentation
```

### Coreモジュールの主要コンポーネント

| コンポーネント | 役割 |
|---|---|
| `SoundTracer` | ray tracingベースの音響経路探索 |
| `Auralizator` | 経路 → IR合成 → コンボリューション |
| `UTDDiffraction` | UTD (Uniform Theory of Diffraction) 回折モデル |
| `ReverberationZoneManager` | 残響領域管理 |
| `RGC` | Ray Generation Cluster |
| `PathPPV` | 経路情報データ構造 |

### HWモジュール

`HW/` ディレクトリはFPGAアクセラレータとの通信層です。

- `fpga_interface.{cpp,h}` — ボード制御
- `bfm_api.{c,h}` — Bus Functional Modelインターフェース
- `mem_api.{c,h}` — デバイスメモリアクセス
- `libusb` — USB通信

この層により、同じ音響アルゴリズムをSW（汎用CPU）とHW（FPGAアクセラレーション）の両方で実行できます。

## STCoreV2との関係

STCoreV2は、STCoreの伝搬モデル、ビルド、API公開方式を拡張した後継ラインです。全体比較は [STCore vs STCoreV2](./comparison.md) を参照してください。

## STCoreを選ぶ場面

新規プロジェクトには [STCoreV2](./stcorev2.md) を推奨します。STCoreは次の場合のみ検討してください。

- 既にSTCoreに統合されたコードがあり、V2へ移行中の場合
- FPGAアクセラレーション経路が必要で、V2のSSPモデルでは代替できない場合
- Visual Studioソリューションベースの既存ビルドシステムと直接統合する必要がある場合

## 参考

- [STCoreV2](./stcorev2.md) — アクティブ開発中の次世代コア
- [SDK概要](../sdk/overview.md)
