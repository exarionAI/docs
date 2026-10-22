---
sidebar_position: 2
title: 主要機能
---

# 主要機能

## 音響シミュレーション

- **経路追跡ベースの伝搬** — 直接音・透過・鏡面反射（最大16次）・UTD回折の経路をジオメトリから直接探索
- **9バンド材質モデル** — `63 Hz ~ 16 kHz` のオクターブバンドごとの反射・吸収・透過・散乱。エンジン既定の検証用ライブラリは BRAS測定に基づく24種、Unity・Web・UE SDK の既定材質は SoundTrace ゲーム材質22種
- **物理減衰** — `1/r` 距離減衰、ISO 9613-1 空気吸収、温度・湿度・気圧から導出した音速
- **Late reverb** — 音源輸送レイの拡散散乱が駆動する FDN16、空間結合（late coupling）減衰
- **Doppler** — 可変遅延ピッチ、任意の移動モノポール放射ゲイン
- **Hybrid 初期反射** — リスナー全域予算の exact オブジェクト + HOA3 bed により、経路数に依存しないレンダーコスト

## レンダリング

- **バイノーラル** — エンジン内蔵の MIT KEMAR、同梱の SADIE II D2 KEMAR HRIR
- **スピーカー** — HOA3 デコードによる 2.0 / 2.1 / 4.1 / 5.1 / 7.1 / カスタムレイアウト
- **ホスト pull レンダー** — ホストのオーディオコールバックがブロックを取りに来る3つの出力モードと内蔵リサンプラー
- **オフラインIR** — Raw エネルギータップ、9バンド圧力IR、バイノーラルIRを決定的に生成

## 統合

- **マルチプラットフォーム** — Windows、macOS、Linux、Android、iOS、Web（WebAssembly）
- **ゲームエンジン** — Unity、Unreal Engine 5
- **オーディオミドルウェア** — FMOD Studio（SimpleST Source / Listener DSP）、Wwise（Sound-tracing Renderer / Source Settings）
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **公開 C ABI** — リアルタイム・オフラインの2-DLL、POD-only、capability ビットで機能を確認

## ツール

- **デモアプリ** — リアルタイム3Dデモ、オフラインIRデモ、29個のテストシーン
- **ExaTools** — IR解析・検証・バッチ処理ツール群
