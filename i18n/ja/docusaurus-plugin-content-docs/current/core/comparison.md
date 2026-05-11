---
title: STCore vs STCoreV2
---

# STCore vs STCoreV2

このページでは、[STCore](./stcore.md) と [STCoreV2](./stcorev2.md) の機能差分を1ページにまとめます。選定の目安は [推奨ユースケース](#推奨ユースケース) を参照してください。

:::note 基準ブランチ
- **STCore** — `main`
- **STCoreV2** — `feat/lock-free-hybrid-v2-reverb` (lock-free reverb)
:::

## 概要

| 項目 | STCore | STCoreV2 |
|---|---|---|
| 世代 | 第1世代 | 第2世代 |
| アクティブ開発 | — | ✅ |
| 新規統合の推奨 | △（特殊ケース） | ✅ |
| 主言語 | C / C++ | C++コア + **C API** |
| ビルド | Visual Studioソリューション + CMake | CMake (cross-platform) |
| 主プラットフォーム | Windows | macOS · Windows · Linux · WebAssembly |
| HWアクセラレーション | **FPGA** インターフェースあり | SW only |

## 伝搬アルゴリズム

| 区分 | STCore | STCoreV2 |
|---|---|---|
| コアモジュール | `SoundTracer` (Core/) | `Propagator` + **`IPathModule` system** (propagation/module/) |
| アルゴリズム分離 | 単一パイプライン | **モジュール式**: Specular / UTDDiffraction / DiffuseOffset / StaticReverb。リスナーごとに選択・差し替え可能 |
| Ray Generation | `RGC` (Ray Generation Cluster) | `RGC` + リスナー別ray count/depth API |
| 回折モデル | `UTDDiffraction` (Uniform Theory of Diffraction) | `UTDDiffraction` (Uniform Theory of Diffraction) |
| 残響処理 | `ReverberationZoneManager` | **`StaticReverbModule`**。ReverbHitCollector + ReverbCoefficients |
| Max Path Depth | プロジェクト設定 | **64** (`EXA_MAX_DEPTH_LIMIT`) |
| 結果データ構造 | `PathPPV`, `PropagationPath` | `PathPPV`, `Primitive`, sorted IR data |

## 音響化 (Auralization)

| 区分 | STCore | STCoreV2 |
|---|---|---|
| モジュール | `Auralization/` | **`auralizator/`** (core, frequence, filter, HRTF, states) |
| HRTF | `HRTF.h` + MIT HRTF library | `HRTF.h` + 外部HRTFファイル/メモリロードAPI |
| HRTFロードAPI | 直接ライブラリ呼び出し | `exaListenerSetHRTFFromFile/Memory` |
| 周波数分割 | `FrequencyPartition` | `frequence/` (FrequencyBandResponseなど) |
| コンボリューション | `Auralizator` | `filter/` (FilterChain, IRConvolver) |

## 材質モデル

| 区分 | STCore | STCoreV2 |
|---|---|---|
| モデル | 別Materialオブジェクト・IDベース | **Triangle単位で直接保存** (absorption/transmission) |
| 反射計算 | 明示的な反射係数 | `reflection = 1 − (absorption + transmission)` |
| 経路統計 | material IDを含む | absorption係数を公開 |

## API・統合

| 区分 | STCore | STCoreV2 |
|---|---|---|
| API公開 | C++ライブラリを直接リンク | **120以上のC関数** (`exasoundC.h`) |
| Webビルド | — | **Emscripten** (`EMSCRIPTEN_KEEPALIVE`) |
| バインディング互換 | C++ターゲット限定 | Web/Python/Unity/Unreal統合が可能 |
| アルゴリズム構造 | 単一実装 | reflection / diffraction / diffuse / reverbモジュールに内部分離 |
| 診断・統計 | 主に社内用 | `exaPropagatorGetProfile`, `exaPropagatorGetGuidePlanes/MirrorPositions`, `exaGetStatistics`, `exaGetMemoryTraceSnapshot` |
| エラー報告 | 主に戻り値 | `exaGetLastError()` の単一入口 |

## プラットフォーム・ビルド

| 区分 | STCore | STCoreV2 |
|---|---|---|
| Windows | ✅ | ✅ |
| macOS | △ CMake試行可能 | ✅ |
| Linux | △ | ✅ |
| WebAssembly | — | ✅ |
| ビルドシステム | Visual Studio `.sln` + CMake | CMake 3.22+ |
| C++標準 | プロジェクト設定依存 | C++17ビルド / C++20コーディングガイド |

## アクセラレータ・外部統合

| 区分 | STCore | STCoreV2 |
|---|---|---|
| FPGAインターフェース | ✅ (`HW/` — bfm_api, fpga_interface, libusb) | — |
| Bus Functional Model | ✅ | — |
| USBデバイス通信 | ✅ (libusb) | — |
| 内蔵BVH/TLAS | 独自 | ✅ Native BVH/TLAS |
| **外部BVHコールバック** | — | ✅ **`ExternalAccelerator`** — ホストのBVHへray intersectionを委譲 |
| アクセラレータ抽象 | — | `IAccelerator` interface |

> STCoreの特徴は、同じ音響アルゴリズムをSW（汎用CPU）とHW（FPGAアクセラレーション）の両方で実行できる点です。STCoreV2は現在SW onlyですが、**外部アクセラレータコールバック**により、ゲームエンジンなどホスト側のBVHへray intersectionを委譲できます。

## 並行性・データ転送

| 区分 | STCore | STCoreV2 |
|---|---|---|
| Sceneデータ転送 | 直接参照・mutexベースと推定 | **`SceneSnapshot`** — immutable per-tick POD snapshot |
| 多重スロットバッファ | — | **`TripleBuffer`** (lock-free) |
| スレッドアフィニティ | — | `ThreadAffinity` module |
| 診断テレメトリ | 社内用 | `Telemetry` module |

## テスト・文書

| 区分 | STCore | STCoreV2 |
|---|---|---|
| 自動テスト | — Doxygen文書のみ | **Google Test** (unit + benchmark) |
| 文書化 | Doxygen | Doxygen + 内部設計文書 (`docs/design/`) |

## 推奨ユースケース

### STCoreV2を選ぶ場合 — *標準*

- 新規プロジェクト
- Web統合（ブラウザ / WebAssembly）
- macOS・Linuxを含むクロスプラットフォーム配布
- Python・Unity・Unrealなど複数言語バインディングの計画
- 統計的音響伝搬（SSP）モデルの利用

### STCoreを選ぶ場合 — *特殊ケース*

- 既にSTCoreへ統合されたコードの保守
- **FPGAアクセラレーション経路**が必要で、V2のSSPモデルでは代替できない場合
- Visual Studioソリューションベースの既存ビルドシステムと直接統合する場合
- UTD回折モデルに依存する検証済み結果を保持する必要がある場合

## 参考

- [STCore](./stcore.md) — 第1世代コア詳細
- [STCoreV2](./stcorev2.md) — 第2世代コア詳細
- [SDK概要](../sdk/overview.md)
