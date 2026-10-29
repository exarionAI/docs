---
sidebar_position: 1
title: SDK 概要
description: SimpleST リアルタイム空間音響エンジンの Web、Unity、Unreal Engine、FMOD、Wwise 統合の概要。
---

# SDK 概要

SoundTrace SDK は、[SimpleST](../core/simplest.md) エンジンを Web・ゲームエンジン・オーディオミドルウェアから
利用できるようにラップする製品群です。すべてのラッパーは同じリポジトリの同じエンジン SDK
（`out/dist/<platform>_release/SimpleST`）を消費し、**SimpleST 2.22.0 / ABI 6** を基準とします。
現在の SDK リリースは 2.22.0-jhj.5（2026-10-28）です。ラッパーのバージョンはそのままで、5 つのラッパーすべてに
[ソース EQ と出力 EQ](#音色調整-eq) が入りました。リスナーの向きはクォータニオンで渡すため頭部の傾き（roll）が保たれ、
エンジン 2.21 が有効にする等ラウドネス補正はラッパーが無効にします（下記の原則 8）。[音源数の上限](#音源数の上限)は 2.18.2 SDK と同じです。
以前の SDK リリース: 2.18.2-jhj.7 — SimpleST 2.18.2、ラッパーのバージョンは現在と同じ。その前のリリース: 2.12.0 — Web 1.0.0 · Unity 0.3.0 ·
UE 0.3.0 · FMOD 0.2.0 · Wwise 0.1.0。レガシーラインとして引き続き提供されます。

## 統合ラインアップ

| 名前 | 対象 | 形態 | 状態 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.1.0（vendor ZIP / npm tgz） | 利用可能 |
| [Unity](./unity.md) | Unity 2022.3 LTS 以降（Unity 6 で検証） | `.unitypackage` 0.4.0 | 利用可能 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.4.0 + Python インストーラー | 利用可能 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP プラグイン 0.3.0 | 利用可能 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing`（Object Processor + Metadata）プラグイン 0.2.0 | 利用可能（Audiokinetic パートナー承認進行中） |
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
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 28+（エンジン `.so` が `libaaudio` を直接リンク） |
| iOS | device arm64 · simulator arm64 静的ライブラリ / XCFramework | iOS 15+ |
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
7. **出力リミッターはホストのマスターチェーンの役割**です。エンジン 2.18.0 はコンテキスト生成直後に true-peak リミッター
   （−1 dBTP、137 サンプル遅延）を有効にしますが、UE・Unity・FMOD・Wwise・Web ラッパーはドキュメント化された既定値どおりリミッターを
   **無効の状態**に保ちます。有効にする方法は各 SDK ページを参照してください。
8. **等ラウドネス補正もホストのミックスの役割**です。エンジン 2.21.0 はコンテキスト生成直後に
   [等ラウドネス補正](../core/simplest.md#等ラウドネス補正)（低域シェルフ約 +7.2 dB @ 120 Hz、高域 +1.8 dB）を有効にしますが、
   すべてのラッパーは生成直後にこれを無効にします。無効にした出力はエンジン 2.20 とビット一致します。音色は下記の EQ やホストのミキサーで調整します。

## 音色調整 (EQ)

SDK リリース 2.22.0-jhj から、エンジンの[パラメトリック EQ](../core/simplest.md#パラメトリック-eq) をすべてのラッパーが 2 か所で
公開します。

- **ソース EQ** — 音源信号そのものに、エンジンのバンド分割の前でかけます。その音源の直接音・反射・回折・残響がすべて同じ音色になります。
- **出力 EQ** — SimpleST のミックス全体に、レンダー末尾（マスターゲインの前）でかけます。

| SDK | ソース EQ | 出力 EQ | バンド |
|---|---|---|---|
| [Unreal Engine](./ue.md#eq) | Source Settings アセット `Source EQ`、Blueprint `SetSourceEq` | Project Settings `Output EQ`、`USoundTracingSubsystem::SetOutputEq` | 最大 16 |
| [Unity](./unity.md#eq) | `SoundTraceSource` Inspector `Source EQ`、`SetSourceEq` | `SoundTraceListener` Inspector `Output EQ`、`SetOutputEq` | 最大 16 |
| [Web](./web.md#eq) | `source.setEq(eq \| null)` | `sound.setOutputEq(eq \| null)` | 最大 16 |
| [FMOD](./fmod.md#eq) | SimpleST Source DSP の EQ パラメーター | SimpleST Listener DSP の EQ パラメーター | 4 固定 |
| [Wwise](./wwise.md#eq) | Sound-tracing Source Settings の EQ プロパティ | Sound-tracing Renderer の EQ プロパティ | 4 固定 |

- フィルターの種類は Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の 6 種です（カットは 12 dB/oct 固定）。
  Web のみ Web Audio `BiquadFilterType` の名前（`'peaking'`、`'lowshelf'`、`'highshelf'`、`'lowpass'`、`'highpass'`、`'notch'`）を使います。
- 範囲: 周波数 20 ~ 20,000 Hz、ゲイン ±24 dB（Peaking・シェルフのみ）、Q 0.1 ~ 30（シェルフは 3 まで）、プリアンプ −48 ~ +12 dB。
- **既定は無効**で、無効の間はエンジンを呼び出さないため、出力は EQ がないときと同じです。変更された値だけを送り、エンジンが
  20 ms のクロスフェードで切り替えます。
- UE・Unity が FMOD/Wwise 統合モードのときは、ゲームエンジン側の EQ は送りません。ミドルウェアプラグインの EQ を使ってください。

## 音源数の上限

SDK リリース 2.18.2 から、エンジンがプラットフォームごとに同時音源数と音源メモリに上限を設けます — デスクトップ
128 音源 · メモリ無制限 · 遅延リングの天井 2.0 s、Android/iOS 48 音源 · 96 MiB · 1.0 s、Web 32 音源 · 64 MiB · 0.5 s。
上限を超える音源はエンジンが生成を拒否し（`ST_STATUS_BUDGET_EXCEEDED`）、ゲームは停止しません。デスクトップの
既定 128 音源は従来（無制限）からの**挙動の変更**です。エンジン側の詳細は
[SimpleST — 音源メモリ予算](../core/simplest.md#音源メモリ予算)を参照してください。

| SDK | 音源数の設定（0 = プラットフォーム既定） | 拒否された音源 | 遅延リングの天井 |
|---|---|---|---|
| [Unreal Engine](./ue.md) | Project Settings `Max Sources` | dry 経路にフォールバック | `Max Delay Seconds`（0 = プラットフォーム既定） |
| [Unity](./unity.md) | `SoundTraceRuntime.MaxSources` | 警告を残し `AudioSource` を dry | `SoundTraceListener.maxDelaySeconds`（既定 0 = プラットフォーム既定） |
| [Web](./web.md) | `SoundTrace.create` オプション `maxSources` | 生成を拒否（status 11）、既存の音源はレンダーを継続 | `setRenderOptions({ maxDelaySeconds })` |
| [FMOD](./fmod.md) | `SimpleSTFmod_Config.maxSources` | そのボイスを dry で再生 | エンジンのプラットフォーム既定 |
| [Wwise](./wwise.md) | `SimpleSTWwise_Config.maxSources` | そのボイスを dry で再生 | エンジンのプラットフォーム既定 |

## どこから始めるか

- ブラウザーと Three.js → [Web SDK](./web.md)
- Unity ゲーム → [Unity SDK](./unity.md)
- Unreal Engine ゲーム → [Unreal Engine SDK](./ue.md)
- FMOD Studio でオーサリングするプロジェクト → [FMOD プラグイン](./fmod.md)
- Wwise でオーサリングするプロジェクト → [Wwise プラグイン](./wwise.md)
- ネイティブ C/C++ → [SimpleST](../core/simplest.md)
- STCoreV2 統合を移行中 → [STCoreV2 → SimpleST](../core/stcorev2.md)
