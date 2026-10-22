---
sidebar_position: 1
title: SDK 概要
description: SimpleST リアルタイム空間音響エンジンの Web、Unity、Unreal Engine、FMOD、Wwise 統合の概要。
---

# SDK 概要

SoundTrace SDK は、[SimpleST](../core/simplest.md) エンジンを Web・ゲームエンジン・オーディオミドルウェアから
利用できるようにラップする製品群です。すべてのラッパーは同じリポジトリの同じエンジン SDK
（`out/dist/<platform>_release/SimpleST`）を消費し、**SimpleST 2.12.0 / ABI 6** を基準とします。

## 統合ラインアップ

| 名前 | 対象 | 形態 | 状態 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.0.0（vendor ZIP / npm tgz） | 利用可能 |
| [Unity](./unity.md) | Unity 2022.3 LTS 以降（Unity 6 で検証） | `.unitypackage` 0.3.0 | 利用可能 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.3.0 + Python インストーラー | 利用可能 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP プラグイン | 利用可能 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing`（Object Processor + Metadata）プラグイン | 利用可能（Audiokinetic パートナー承認進行中） |
| [Python](./python.md) | 解析・研究 | — | 予定 |

UE・Unity ラッパーは、プロジェクトに FMOD または Wwise プラグインがあると自動的にそのミドルウェアの
SimpleST プラグインへ接続する**統合モード**に切り替わります（Meta XR Audio と同様の分離）。その場合、ゲームエンジン
側のコンポーネントはジオメトリ・材質・可視化のみを担当し、レンダーはミドルウェアプラグインが行います。

## 対応プラットフォーム

| プラットフォーム | エンジンバイナリ | 備考 |
|---|---|---|
| Windows x64 | `SimpleSTRealtime.dll` | Wwise Authoring プラグインは Windows DLL |
| macOS | Universal dylib（arm64 + x86_64） | |
| Linux x86_64 | `.so`（glibc 2.34+） | |
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 24+ |
| iOS | device arm64 · simulator arm64/x86_64 静的ライブラリ / XCFramework | iOS 15+ |
| Web | pthreads WASM（`SimpleSTRealtime.mjs/.wasm`）+ シングルスレッド Offline | COOP/COEP が必要 |

## 共通の利用原則

1. **品質プリセットから始めます** — `Fast` / `Balanced` / `Quality`。リスナー guide ray と反射深度を
   まとめて決め、既定の `Balanced` はエンジン既定（16×16、深度 8）と同じです。
2. **初期反射は Hybrid** です。すべての統合がレンダー開始後に Hybrid を適用します。Objects モードは
   基準聴取・オフライン比較用です。
3. **HRTF は 2 種類**です。エンジン内蔵の MIT KEMAR と、同梱配布される SADIE II D2 KEMAR。
   スピーカー出力は HOA3 デコード（2.0 ~ 7.1）で、軽量なステレオパンニングのフォールバックがあります。
4. **材質は 9バンドプリセット**を名前でマッピングします。Unity・Web・UE はすべて同じ SoundTrace ゲーム材質
   22 種（測定データではないゲームプリセット、同じ名前・順序・9バンド値）を既定とし、FMOD・Wwise は材質名を
   公開せずエンジン既定ライブラリを使います。直接編集は、バンドごとに R+A+T=1 を満たす検証済みの値に限ります。
5. レイ解像度・深度・レーン更新周期のような高度なノブは**測定後にのみ**調整します。
6. 単位はメートルです。cm 単位のホスト（UE、Wwise for Unreal）はラッパーが `sceneRatio = 0.01` を設定します。

## どこから始めるか

- ブラウザーと Three.js → [Web SDK](./web.md)
- Unity ゲーム → [Unity SDK](./unity.md)
- Unreal Engine ゲーム → [Unreal Engine SDK](./ue.md)
- FMOD Studio でオーサリングするプロジェクト → [FMOD プラグイン](./fmod.md)
- Wwise でオーサリングするプロジェクト → [Wwise プラグイン](./wwise.md)
- ネイティブ C/C++ → [SimpleST](../core/simplest.md)
- STCoreV2 統合を移行中 → [STCoreV2 → SimpleST](../core/stcorev2.md)
