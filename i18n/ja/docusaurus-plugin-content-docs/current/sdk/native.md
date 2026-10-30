---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — 全プラットフォーム共通コアのバイナリ、ヘッダー、最小利用フロー、関数群、スレッド規則。
---

# Sound-Tracing SDK (C/C++)

すべてのプラットフォームで同じコアを使います。Unity · Unreal Engine · FMOD · Wwise · Web SDK はこのバイナリを
各プラットフォームの流儀で包んだラッパーであり、ネイティブ C/C++ ではヘッダーをインクルードし、プラットフォームに合ったバイナリをリンクするだけです。

## 配布物

| プラットフォーム | バイナリ (`Binaries/`) | リンク |
|---|---|---|
| Windows x64 | `Win64/Release/SimpleSTRealtime.dll` + `.lib` | 動的 |
| macOS (Universal) | `Mac/Release/libSimpleSTRealtime.dylib` | 動的 |
| Linux x86_64 | `Linux/Release/libSimpleSTRealtime.so` | 動的 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSimpleSTRealtime.so` | 動的 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsimplest_static.a` | 静的 |
| Web | `Web/Release/SimpleSTRealtime.mjs` + `.wasm` (pthreads) | WASM モジュール (COOP/COEP が必要) |

オフライン IR 計算用の `SimpleSTOffline`（同じフォルダー、`st_off_*`）も同梱されています。ヘッダーは全プラットフォーム共通です。

```text
SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| ヘッダー | コンテキスト | 関数接頭辞 | 役割 |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | リアルタイム伝搬 + オーディオレンダリング |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | オフライン IR 計算・レンダリング |
| `STTypes.h` | — | `ST_*` | 共通 POD・enum |

エンティティ id は型別ハンドル（`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`、それぞれ
`struct { int32_t v; }`）で、**失敗は `v < 0`** です。座標系は左手系 `+Y` up · `+Z` forward、単位はメートル
（`STRT_CreateOptions.sceneRatio` で cm = `0.01` を指定）、リスナー角度はラジアンです。

## 最小利用フロー

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // ホストのオーディオコールバックがブロックを取りに来る
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// ホストミックスが音色・レベルを受け持つなら生成直後に無効化する（公式ラッパーはすべて無効化）
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 材質 — 既定ライブラリを登録すると最初の材質のハンドルが返る
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. メッシュ + オブジェクト (xyz interleaved、インデックス付き三角形)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = メッシュ全体で材質ひとつ
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 音源・リスナー
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW、roll を含む

// 4. ホスト PCM 入力ストリーム (モノラル)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. ビルド + レンダリング開始 + 出力段を明示
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid 初期反射 (リアルタイム推奨)
ro.useLimiter = 0;               // ホストのマスターチェーンがリミッティングを受け持つなら無効化
st_rt_render_set_options(ctx, &ro);

// 6. ゲームループ (制御スレッド)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // ワーカーを起こして即座に返る

// 7. オーディオコールバック (ホストのオーディオスレッド)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## 関数群

| family | 代表的な関数 |
|---|---|
| ライフサイクル | `st_rt_init_create_options`, `st_rt_create`, `st_rt_destroy`, `st_rt_get_version_string`, `st_rt_get_capability_word`, `st_rt_get_last_status` / `st_rt_get_last_error` |
| material | `st_rt_material_create`, `st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`, `st_rt_mesh_set_material`, `st_rt_object_create[_q]`, `st_rt_object_set_transform[_q]`, `*_destroy` |
| source | `st_rt_source_create`, `set_position` / `set_velocity` / `set_orientation_q`, `set_directivity`, `set_energy`, `set_path_enabled`, `set_path_volume`, `set_parametric_eq` |
| source 入力・再生 | `st_rt_source_attach_stream` + `write_stream`, `set_audio_file`, `set_audio_clip`, `play` / `pause` / `stop` / `seek`, `set_volume`, `set_pitch`, `set_loop_count`, `trigger` |
| listener | `st_rt_listener_set_position` / `set_velocity` / `set_orientation_q` / `set_rotation_ypr`, `set_ray_count` |
| 伝搬 | `st_rt_build`, `st_rt_build_dynamic`, `st_rt_propagate`, `st_rt_set_max_depth`, `st_rt_set_path_type_enabled`, `st_rt_set_lane_update_interval` |
| 音響ポリシー | `st_rt_set_atmosphere`, `st_rt_set_acoustic_feature_enabled`, `st_rt_set_late_coupling_preset` |
| render | `st_rt_render_start` / `stop`, `st_rt_render_process`, `set_options` / `get_options`, `set_spatializer`, `set_speaker_layout`, `set_parametric_eq`, `set_loudness_compensation`, `set_master_gain_db`, `set_limiter_type`, `set_max_delay_seconds`, `get_latency_frames` |
| メモリ予算 | `STRT_CreateOptions.maxSources`, `st_rt_set_memory_budget`, `st_rt_get_memory_stats` |
| 診断 | `st_rt_get_timing`, `st_rt_scene_get_stats`, `st_rt_ir_get_stats`, `st_rt_debug_copy_visual_paths` |

空間化は `st_rt_render_set_spatializer` で `0` パンニング · `1` MIT KEMAR（内蔵）· `2` SADIE II D2 KEMAR（`Resources/HRTF`）から
選び、スピーカー出力は `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1）で有効にします。材質は 9 バンド
（`63 Hz ~ 16 kHz`）の `reflection / absorption / transmission / scattering` で、バンドごとに `R + A + T = 1` でなければなりません。

## スレッド規則

ヘッダーのすべての関数の上に、呼び出し可能なスレッドのタグがあります。

| タグ | 意味 |
|---|---|
| `[control]` | 制御スレッド。シーンロックを取る可能性があるため、オーディオコールバックからは呼びません |
| `[control, blocking]` | 加速構造のビルド、レンダリングの start/stop、HRIR のロードのような長い区間 |
| `[audio]` | ホストのオーディオスレッドで安全 — `st_rt_source_write_stream`, `st_rt_render_process` |
| `[any]` | どのスレッドからでも |

`[control]` 呼び出しは専用の制御スレッドひとつに直列化してください。公式ラッパーはすべてこの構造です。

## プラットフォームメモ

- **Android**: API 28 以上。ABI ごとの `.so` をアプリのライブラリフォルダーに置きます。
- **iOS**: 静的ライブラリひとつ（`libsimplest_static.a`）にリアルタイム・オフラインの両方が入っています。device / simulator を区別してリンクします。
- **Web**: `SimpleSTRealtime.mjs/.wasm` は pthreads ビルドのため、ページと Worker のレスポンスに `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp` が必要です。`[control]` 呼び出しはひとつの Worker からのみ行い（メインスレッドでのブロッキング呼び出しは
  `Atomics.wait` の制限で失敗）、オーディオは AudioWorklet と共有リングでやり取りします。TypeScript facade が必要なら [Web SDK](./web.md) を使ってください。
- **ホストサンプルレート**: エンジン内部は 44.1 kHz で、`hostSampleRate` を指定すると入力・出力をエンジンが変換します。

## オフライン IR

`SimpleSTOffline`（`st_off_*`）は同じシーン API で、デバイスやワーカーなしに一度だけ伝搬して IR を作ります。

| 出力 | 関数 |
|---|---|
| 計算 | `st_off_ir_compute` |
| 音圧 IR (モノラル / 9 バンド) | `st_off_ir_init_pressure_request`, `st_off_ir_render_pressure` |
| バイノーラル IR | `st_off_ir_init_binaural_request`, `st_off_ir_render_binaural` |
| Raw エネルギータップ | `st_off_ir_copy_raw_early_taps`, `st_off_ir_copy_raw_reverb_send_taps` |

## 次のドキュメント

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD プラグイン](./fmod.md) · [Wwise プラグイン](./wwise.md)
