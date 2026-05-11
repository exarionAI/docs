---
title: ExaStudio概要
---

# ExaStudio

**Sound Tracingワークフロー向けのクロスプラットフォームレンダリングソフトウェア。**

ExaStudioは社内の**exaEngine**（sound tracing rendering engine）上に構築された統合ツールです。音響シーンを構成し、シミュレーション結果を可視化し、結果生成までを1つの環境で処理することを目指します。

## 概要

| 項目 | 値 |
|---|---|
| ベースエンジン | exaEngine (in-house) |
| プラットフォーム | Windows · macOS · **WebAssembly** |
| 主ターゲット | Webプラットフォーム |
| ビルド | CMake + 独自ビルドスクリプト (`mainBuild.sh`) |
| 状態 | アクティブ開発 |

## 設計方針

- **共通モジュール確立 → ブランチ分岐**モデルでクライアント別要求を吸収
- **クロスプラットフォーム**構造（Windows / macOS / WebAssemblyを同時対応）
- **最小サイズ・最大性能**志向
- **Webプラットフォーム重視** — ブラウザで動くSound Tracingソリューション

## exaEngineモジュール

ExaStudioの中核エンジン (`exaEngine`) は次の構成です。

```
exaEngine/
├── Engine/        # shared engine modules
├── Project/       # project management
├── core/          # core libraries
├── 3rd_party/     # external dependencies
├── buildTools/    # custom build system
└── cmake/         # CMake modules
```

## ビルド

```bash
# Entry point — platform auto-detect + dependency build + main build
./exaEngine/mainBuild.sh
```

プラットフォーム別オプションのoverrideは`exaEngine/buildTools/configs/`以下で管理されます。

| パス | 適用 |
|---|---|
| `cmake_opts/*.conf` | desktop (Windows/macOS) default |
| `cmake_opts/wasm/*.conf` | WebAssembly build override |

## 静的リンク vs 動的リンク

プラットフォームごとにライブラリリンク方式が異なります。

| プラットフォーム | リンク |
|---|---|
| Windows | DLL (dynamic) |
| macOS | dylib (dynamic) / static |
| iOS | **static only** |
| WebAssembly | **static only** |

iOSとWASMには動的ライブラリの概念がないため、すべての依存関係を静的ビルドする必要があります (`BUILD_SHARED_LIBS=OFF`)。

:::info 作成予定 (Coming Soon)
インストール、ワークフロー、ショートカット、主要機能パネルを含むユーザーガイドは今後追加されます。
:::
