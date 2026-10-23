---
sidebar_position: 1
title: SimpleST
description: Sound Tracing の現行ネイティブエンジン SimpleST — C++20 幾何音響コア、2-DLL 公開 C ABI（ABI 6）、9バンド材質、Hybrid 初期反射、ホスト pull レンダー。
---

# SimpleST

**SimpleST** は Sound Tracing 製品群の現行ネイティブエンジンです。メッシュ・材質・音源・リスナーから
直接音・透過・反射・回折経路と late reverb 統計を幾何学的に計算し、その結果を
リアルタイム空間オーディオまたは決定的なインパルス応答（IR）として合成する C++20 ライブラリです。
前世代エンジン [STCoreV2](./stcorev2.md) を置き換え、すべての SDK・ミドルウェアプラグインが
このエンジンの公開 C ABI の上で動作します。

![エンジンパイプライン](/img/core/pipeline-overview.png)

## 概要

| 項目 | 値 |
|---|---|
| エンジンバージョン | **2.18.2**（`ST_VERSION_STRING`）、SDK リリース 2.18.2-jhj.3。以前のリリース: 2.12.0 |
| 公開 ABI | **ABI 6**（`ST_ABI_VERSION`、3.0 クリーンブレーク）。2.12.0 以降の変更はすべて additive |
| 主言語 | C++20（C ABI を公開、C11 ヘッダー互換） |
| ビルドシステム | CMake 3.21+ · プラットフォーム別エントリポイント `mainBuild.sh` |
| プラットフォーム | Windows x64 · macOS Universal · Linux x86_64 · Android（arm64-v8a/armeabi-v7a/x86_64）· iOS（device/simulator）· Web（Emscripten、pthreads） |
| 配布形態 | リアルタイム DLL `SimpleSTRealtime` + オフライン DLL `SimpleSTOffline`（iOS/Web は静的ライブラリ） |
| サンプルレート | エンジン内部は 44.1 kHz 固定、ホストレートは内蔵リサンプラーで変換 |
| バンド | 9 オクターブバンド `63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz` |
| 加速構造 | TinyBVH（既定）· BinnedSAH · HybridKD · LBVH · LBVH_SIMD |
| テスト | 回帰ハーネス `SimpleST_demo` + CTest 90 余り |

## アーキテクチャ

```text
SceneManager → STPropagator → STIRConverter ─┬→ STOnlineAuralizator  (リアルタイムストリーム)
                                             └→ STOfflineAuralizator (決定的 RIR / バンド IR)
```

- **SceneManager** — メッシュ・材質・音源・リスナーと TLAS/BLAS を所有します。静的ジオメトリは
  一度だけビルドし、動的オブジェクトは変換のみ更新します。
- **STPropagator** — 幾何専用のステージです。直接音/透過/反射/回折経路を見つけ、late reverb 用の
  ルーム統計（mean free path、表面積、材質分布）と source transport（拡散輸送）レイを計算します。
  音響ゲインはここでは計算しません。
- **STIRConverter** — 幾何を音響ドメインへ変換します。遅延・Doppler slope・9バンドエネルギーゲイン・
  距離/空気減衰・UTD 回折・reverb send tap・HOA3 early bed 集約がここで決まります。
- **Auralizator** — 共通の実行器の上に 2 つのレンダラーがあります。リアルタイムレンダラーは 9バンドクロスオーバー →
  バンド遅延リング → 経路タップ（Doppler/フェード）→ 空間化（パンニング / MIT KEMAR / SADIE II D2 HRIR）→
  FDN16 late reverb → リミッターの順に処理します。

![エンジンシェル3種](/img/core/engine-shells.png)

エンジンシェルは 3 種類です。

| シェル | 用途 |
|---|---|
| `STRealTimeEngine` | 同期伝搬 + オーディオレンダー。診断・互換用 |
| `STRealTimeMultiEngine` | Propagator/IRConverter ワーカーと latest-only トリプルバッファ。**リアルタイムの既定** |
| `STOfflineEngine` | canonical IR キャッシュを一度作り、Raw エネルギー / 圧力 IR / バイノーラル IR を決定的に派生 |

## 公開 C ABI

公開 ABI は 2 つの DLL に物理的に分離されており、共通の POD は `STTypes.h` にあります。

| ヘッダー | コンテキスト | 関数プレフィックス | 役割 |
|---|---|---|---|
| `SimpleST/ABI/STRealtime.h` | `STRT_Context*` | `st_rt_*` | リアルタイム伝搬 + オーディオレンダー（146 export） |
| `SimpleST/ABI/STOffline.h` | `STOFF_Context*` | `st_off_*` | オフライン IR 計算・レンダー（116 export） |
| `SimpleST/ABI/STTypes.h` | — | `ST_*` | 共通 POD・enum・capability ビット |

命名規則は `st_<dll>_<family>_<verb>[_<what>]` で、family は
`scene / mesh / object / material / source / listener / render / debug / ir` です。
コンテキストのライフサイクル・ビルド・グローバルポリシー関数には family がありません。

### エンティティハンドル

メッシュ・オブジェクト・音源・リスナー・材質の id は互いに異なる struct 型です。サイズと呼び出し規約は
`int32_t` と同じですが、種類を混ぜて渡すとコンパイルが通りません。

```c
typedef struct STMeshId     { int32_t v; } STMeshId;
typedef struct STObjectId   { int32_t v; } STObjectId;
typedef struct STSourceId   { int32_t v; } STSourceId;
typedef struct STListenerId { int32_t v; } STListenerId;
typedef struct STMaterialId { int32_t v; } STMaterialId;
```

生成関数はハンドルを値で返し、**失敗は `v < 0`** です。`0` は有効な id です。

### リアルタイム関数群の要約

| family | 代表的な関数 |
|---|---|
| ライフサイクル | `st_rt_init_create_options`、`st_rt_create`、`st_rt_destroy`、`st_rt_get_api_version`、`st_rt_get_version_string`、`st_rt_get_capabilities`、`st_rt_get_capability_word`、`st_rt_get_last_status/error` |
| material | `st_rt_material_create`、`st_rt_material_load_defaults` |
| mesh / object | `st_rt_mesh_create`（材質 1 つ、または三角形ごとの材質インデックス）、`st_rt_mesh_set_material`、`st_rt_object_create[_q]`、`st_rt_object_set_transform[_q]`、`*_destroy` |
| scene | `st_rt_scene_set_accel`、`st_rt_scene_set_triangle_intersection`、`st_rt_scene_get_stats`、`st_rt_scene_raycast` |
| source | `st_rt_source_create`、`set_position/direction/velocity`、`set_orientation_q`、`set_directivity`、`set_axis_attenuation`、`set_energy`、`set_path_enabled`、`set_path_volume`、`set_ray_count`、`set_depth`、`set_transport_refresh_steps` |
| source オーディオ入力 | `st_rt_source_set_audio_file`（WAV/FLAC/MP3/Ogg）、`st_rt_source_attach_stream` + `write_stream` + `get_stream_status`（ホスト PCM）、`st_rt_source_set_audio_clip` / `set_audio_clip_asset`（キャッシュクリップ）、`clear_audio` |
| source 再生制御 | `st_rt_source_play/pause/stop/seek`、`set_volume`（線形 0 ~ 16）、`set_pitch`（0.25 ~ 4）、`set_loop_count`、`st_rt_source_trigger`、`set_retrigger_interval` |
| listener | `st_rt_listener_set_position/velocity/rotation`、`set_ray_count`、`set_ray_sampling_method` |
| 伝搬 | `st_rt_build`、`st_rt_build_dynamic`、`st_rt_propagate`、`st_rt_set_max_depth`、`st_rt_set_transmission_max_depth`、`st_rt_set_path_type_enabled`、`st_rt_set_lane_update_interval` |
| 音響ポリシー | `st_rt_set_atmosphere`、`st_rt_set_physical_distance_attenuation`、`st_rt_set_acoustic_feature_enabled`、`st_rt_set_doppler_gain_mode`、`st_rt_set_late_coupling[_preset]`、`st_rt_set_early_late_band_energy_targets` |
| render | `st_rt_render_start/stop`、`st_rt_render_process`（ホスト pull）、`set_options/get_options`、`set_spatializer`、`set_speaker_layout[_custom]`、`set_eq`、`set_master_gain_db`、`set_limiter_type`、`get_limiter_latency_samples`、`set_path_fade_time`、`set_max_delay_seconds`、`get_latency_frames`、`get_process_stats` |
| スレッド | `st_rt_set_thread_attributes`、`st_rt_get_thread_inventory`、`STRT_CreateOptions.maxComputeThreads` |
| メモリ予算 | `st_rt_set_memory_budget`、`st_rt_get_memory_budget`、`st_rt_get_memory_stats`、`STRT_CreateOptions.maxSources` — [音源メモリ予算](#音源メモリ予算) |
| 診断 | `st_rt_get_timing`、`st_rt_ir_get_stats`、`st_rt_debug_acquire_snapshot`、`st_rt_debug_copy_visual_paths`、`st_rt_debug_copy_mesh/scene_accel_nodes` |

### スレッドタグ

ヘッダーのすべての export の上には、呼び出し可能なスレッドを示す 1 行のタグがあります。

| タグ | 意味 |
|---|---|
| `[control]` | 制御スレッド用。シーンロックを取ることがあるためオーディオコールバックから呼びません |
| `[control, blocking]` | 加速構造のビルド、デバイスの start/stop、HRIR ロードのような長い排他区間 |
| `[any]` | ロックなしで atomic・定数のみ読むか、呼び出し側の POD を埋めるだけ |
| `[audio]` | ホストオーディオスレッドで安全 — `st_rt_render_process`、`st_rt_source_write_stream` |

:::tip
FMOD・Wwise・UE・Unity のラッパーはすべて**専用のコントロールスレッド**を持ち、`[control]` 呼び出しをそこへ
直列化します。ABI を直接使う場合も同じ構造を推奨します。
:::

## はじめに

### SDK レイアウト

`mainBuild.sh build <platform> release` が生成する SDK は UE `ThirdParty` と同じレイアウトです。

```text
out/dist/<platform>_release/SimpleST/
├─ Include/SimpleST/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/ SimpleSTRealtime.{dll,dylib,so} · SimpleSTOffline.* · (iOS/Web) libsimplest_static.a
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin + ライセンス
└─ Licenses/                miniaudio · tinybvh
```

### 最小利用シナリオ

```c
#include <SimpleST/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);             // scheduler=PIPELINED, sceneRatio=1(m), renderOutputMode=DEVICE
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // ホストがブロックを取りに来る場合
opt.hostSampleRate   = 48000;                 // ホストレート。0 = 44100 のまま

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error */ }

// 1. 材質 — 既定ライブラリ(BRAS 24種)をまとめて登録。最初の材質のハンドルが返る。
STMaterialId firstMat = st_rt_material_load_defaults(ctx);

// 2. メッシュ + オブジェクト
STMesh mesh = { numVertices, vertices, numTriangles, triangles };   // xyz interleaved, index triplets
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, firstMat, NULL);    // NULL = メッシュ全体で材質 1 つ
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 音源・リスナー
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
st_rt_listener_set_rotation(ctx, /*yaw*/0.f, /*pitch*/0.f);        // ラジアン

// 4. ホスト PCM ストリーム入力
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };     // モノ, capacity 0 = 8192 フレーム
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 加速構造ビルド + レンダー開始 + 出力段の明示
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // 1 = hybrid (2.18.0 の既定。render_start の後に明示)
ro.useLimiter = 0;               // ホストのマスターチェーンがリミッティングを担うならオフ (2.18.0 の既定 1 = true-peak)
st_rt_render_set_options(ctx, &ro);
st_rt_render_set_master_gain_db(ctx, 0.f);                          // エンジン既定 0 dB

// 6. ゲームループ(制御スレッド)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // PIPELINED はワーカーを起こして即座に返る

// 7. オーディオコールバック(ホストオーディオスレッド)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);   // [audio]
st_rt_render_process(ctx, interleavedStereoOut, frames);  // [audio]

st_rt_destroy(ctx);
```

:::note
2.18.0 から、生成直後の既定値とリアルタイムレンダープリセット（スピーカーレイアウトのオン/オフで再適用される）は
**Hybrid（`reserved0 = 1`）+ true-peak 出力リミッター（−1 dBTP、137 サンプル遅延）有効**で、マスターゲインは 0 dB です
（2.12.0 までは Objects + リミッター無効）。既定値に頼らず、Hybrid・リミッターは **`render_start` とレイアウト変更の
後に**明示してください。すべての公式プラグインがこの順序で自身の既定値を再適用します。
:::

## 主要概念

### 座標・単位の契約

- **座標系は Unity と同じです** — 左手系、`+Y` up、`+Z` forward、`+X` right。yaw 正 = 右回転、
  pitch 正 = 下向き。Unity ホストは変換なしで渡し、`-Z` forward のホスト（Three.js など）は
  ラッパーが Z を反転します。UE は `(Y, Z, X)` の並べ替えと cm→m 変換をプラグインが行います。
- **単位はメートル**です。別の単位を使うホストは `STRT_CreateOptions.sceneRatio`
  （cm = `0.01`、ft = `0.3048`）を生成時に 1 回指定します。座標はシーン単位のまま渡し、
  エンジンがメートルを必要とする箇所でのみ乗算します。ジオメトリを事前にスケールしながら `sceneRatio` も
  渡す**二重スケールは禁止**です。
- 角度: リスナーの rotation は**ラジアン**、スピーカーレイアウトのみ度（degree）です。
- メッシュのワインディング: 交差カーネルは両面なので反射・透過はワインディングに依存しませんが、回折エッジ判定の 2 箇所が
  法線の符号を見ます。1 つのメッシュ内ではワインディングを一貫させてください。

### 材質 — 9バンド、厳格検証

```c
typedef struct STMaterial {
    uint32_t structSize, apiVersion;
    float reflection[9], absorption[9], transmission[9], scattering[9];
    uint32_t reserved[8];
} STMaterial;
```

- R/A/T/scattering はすべて **energy-domain** の無次元比率で、バンドごとに
  `|R + A + T − 1| ≤ 0.001` でなければなりません。自動導出・正規化・補間はありません。
- scattering は反射エネルギーのうち拡散する比率なので、合計には含まれません。
- 既定ライブラリは BRAS 測定からフィットした 24 種です（`st_rt_material_load_defaults`）。
- `sqrt` はレンダー境界でちょうど 1 回だけ適用されます。ホストが渡す値はエネルギーです。

### 経路の種類とゲート

| pathType | 意味 |
|---|---|
| 0 Direct | 直接音 |
| 1 Transmission | ジオメトリを通過した直接音（遮蔽） |
| 2 Reflection | 鏡面反射（最大深度 `st_rt_set_max_depth`、既定 8） |
| 3 Diffraction | UTD 回折（source-side 1 + terminal 1 edge） |
| 4 Reverb | source transport 拡散輸送 → FDN16 late reverb |

グローバル（`st_rt_set_path_type_enabled`）と音源ごと（`st_rt_source_set_path_enabled`）のゲートがあり、
`st_rt_set_acoustic_feature_enabled` で空気吸収・伝搬遅延・直接音遮蔽をそれぞれ無効にできます。
すべて無効にすると、距離減衰 + ステレオパンニングだけが残る "Sound Tracing OFF" の基準線になります。

### レイ予算

| 軸 | 既定値 | 関数 |
|---|---|---|
| リスナー guide ray | `16 × 16`、Fibonacci sphere | `st_rt_listener_set_ray_count`、`_set_ray_sampling_method` |
| 反射最大深度 | グローバル 8、音源ごと 4 | `st_rt_set_max_depth`、`st_rt_source_set_depth` |
| 音源 transport ray | `16 × 8` | `st_rt_source_set_ray_count` |
| 透過最大深度 | 64 | `st_rt_set_transmission_max_depth` |
| transport 更新ステップ | 0（自動: PIPELINED 動的 8 · 静的 16） | `st_rt_source_set_transport_refresh_steps` |

### Hybrid 初期反射（リアルタイムゲーム推奨）

![Hybrid 初期反射](/img/core/hybrid-early-reflections.png)

`STRenderOptions.reserved0`（earlySpatialMode）は 2 つの値を取ります。

| 値 | 動作 | 用途 |
|---|---|---|
| `0` Objects | すべての early path を個別の空間化オブジェクトとしてレンダー | 基準聴取・オフライン A/B（2.12.0 までプリセット既定） |
| `1` Hybrid | リスナー全域予算（反射 12+4 · 回折 3+1）のみ exact、残りは HOA3 bed | **リアルタイムゲーム**（2.18.0 からエンジン既定） |

音源 8 個のホールでは Objects がブロックあたり 16.8 ms（上限 11.6 ms）、Hybrid は 2.4 ms です。
2.18.0 からエンジンの既定値も Hybrid で、UE・Unity・FMOD・Wwise・soundtrace.js はすべてレンダー開始後に Hybrid を
明示的に適用します。

### 空間化と出力

| `st_rt_render_set_spatializer` | 説明 |
|---|---|
| `0` PANNING | ステレオ振幅パンニング（既定） |
| `1` MIT_KEMAR | エンジンに内蔵された MIT KEMAR HRIR（128 タップ） |
| `2` SADIE_D2_KEMAR | 同梱配布される SADIE II D2 KEMAR HRIR（8,802 方向 · 256 タップ） |

スピーカー出力は `st_rt_render_set_speaker_layout`（2.0 / 2.1 / 4.1 / 5.1 / 7.1 / ラップトップ近接 2.0）
またはカスタムレイアウトで有効にし、内部の HOA3 デコードで N チャンネルを出力します。出力段は 9バンド EQ → マスターゲイン →
リミッターの順です。

| 出力段 | 関数 | 2.18.0 の既定 |
|---|---|---|
| マスターゲイン | `st_rt_render_set_master_gain_db`（−96 ~ +24 dB、20 ms ランプ） | 0 dB |
| リミッターの種類 | `st_rt_render_set_limiter_type` — Envelope(0) / Lookahead peak(1) / True peak(2) | True peak、シーリング −1 dBTP |
| リミッターの有効化 | `STRenderOptions.useLimiter` | 有効（1）。遅延は `st_rt_render_get_limiter_latency_samples` = 137 サンプル |

リミッターはステレオとスピーカーレイアウト（N チャンネル、チャンネルリンク）のすべての出力の最終段です。ミドルウェア・
ゲームエンジンのようにホストのマスターチェーンがリミッティングを担う統合では `useLimiter = 0` で無効にします。新機能は
`st_rt_get_capability_word(1)` の `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER` · `ST_CAP1_MASTER_GAIN` で確認します
（ワード 0 = `st_rt_get_capabilities()` のビットと混ぜて AND しないでください）。

### ホスト pull レンダー

![ホスト pull レンダー](/img/core/host-pull-render.png)

| `renderOutputMode` | エンジンスレッド | 説明 |
|---|---|---|
| `DEVICE`(0) | レンダー 1 + デバイス 1 | エンジンが WASAPI などの出力デバイスを直接開きます |
| `HOST_PULL`(1) | なし | ホストのオーディオコールバックが `st_rt_render_process` でブロックをレンダーします |
| `HOST_PULL_BUFFERED`(2) | レンダー 1 | エンジンのレンダースレッドがリングを埋め、コールバックはコピーだけを行います（≈3 ブロック遅延） |

UE・FMOD・Wwise・Unity の統合は既定で `BUFFERED` です。`hostSampleRate` を指定すると入力ストリームと
出力の両方をエンジンがウィンドウ sinc リサンプラーで変換するため、ホスト側のリサンプルは不要です。
同時ホストストリームのスロットは **64 個**です。

### スケジューラとスレッド

- `scheduler = PIPELINED`（既定）: Direct / Reflection-Diffraction / Reverb レーンが独立したケイデンスで
  動きます。既定周期は direct 10 ms · refl 0 ms（即時）· reverb 4 ms で、
  `st_rt_set_lane_update_interval` でランタイムに変更します。反射レーンの周期を上げることが
  CPU を最も多く取り戻すノブです。
- `maxComputeThreads = 0` は auto（= min(パフォーマンスコア, 6)）で、種類別の優先度・コア選好は
  `st_rt_set_thread_attributes`（FMOD `Thread_SetAttributes` と同じ位置づけ）で **create の前に**指定します。
- `st_rt_get_thread_inventory` が実際に起動しているスレッド数を種類別に返します。

### 音源メモリ予算

SDK リリース 2.18.2-jhj.3 から、リアルタイムコンテキストは同時に生存する音源数と音源メモリに上限を設けます。
ABI 6 の additive 変更で、`st_rt_get_capability_word(1)` の `ST_CAP1_MEMORY_BUDGET` で確認します。音源 1 つの
メモリは固定コスト（伝搬・IR コピー・transport・ストリームリング）と遅延リング、経路レーンで構成されます。

- **動的遅延リング** — 音源ごとの遅延リングは、その音源の経路が要求する最大遅延 × 1.25 + 50 ms（125 ms 単位で
  切り上げ、下限 0.25 s）で確保されます。さらに必要になると、コントロールスレッドが大きなリングを用意し、オーディオスレッドが
  コピー・割り当てなしで差し替えます。`st_rt_render_set_max_delay_seconds` は、すべての音源に同じ長さを確保する値ではなく
  **天井（上限値）**になりました。ボックスルームの測定では、60 音源時の音源あたりメモリは 6.89 → 2.70 MiB です。
- **プラットフォーム既定値** — `st_rt_create` がビルドターゲットに応じて設定します。

| プラットフォーム | 最大音源数 | 音源メモリ上限 | 遅延リングの天井 |
|---|---:|---:|---:|
| デスクトップ（Windows · macOS · Linux） | 128 | 無制限 | 2.0 s |
| モバイル（Android · iOS） | 48 | 96 MiB | 1.0 s |
| Web（Emscripten） | 32 | 64 MiB | 0.5 s |

- **上限を超えると** `st_rt_source_create` が失敗ハンドル（`v < 0`）を返し、最後のステータスは
  `ST_STATUS_BUDGET_EXCEEDED`(11) です。これが既定ポリシー `ST_MEMORY_REJECT_NEW` です。
  `ST_MEMORY_EVICT_FARTHEST` に切り替えると、リスナーから最も遠い音源を `st_rt_source_destroy` と同じ経路で追い出し、
  新しい音源を受け入れます（追い出した id は `STMemoryStats.lastEvictedSource`）。UE・Unity・FMOD・Wwise ラッパーは拒否された音源を dry で再生します。
- **設定** — 生成時は `STRT_CreateOptions.maxSources`（0 = プラットフォーム既定）、生成後は
  `st_rt_set_memory_budget` で変更します。`STMemoryBudget` で 0 のフィールドは既定値を維持します。上限を下げても
  既存の音源は残り、新規生成から適用されます。`st_rt_get_memory_stats` は音源数、追跡・推定バイト数、
  拒否・追い出し回数を返します。

```c
typedef struct STMemoryBudget {
    uint32_t structSize, apiVersion;
    uint32_t maxSources;            /* 0 = プラットフォーム既定 */
    int32_t  rejectPolicy;          /* ST_MEMORY_REJECT_NEW(0, 既定) / ST_MEMORY_EVICT_FARTHEST(1) */
    uint64_t sourceBudgetBytes;     /* 0 = 無制限（観測のみ） */
    uint64_t fixedPerSourceBytes;   /* 0 = エンジン既定(2.5 MiB)。推定にのみ使う */
    float    ringFloorSeconds;      /* 0 = 0.25 */
    float    ringGrowthHeadroom;    /* 0 = 1.25 */
    int32_t  allowShrink;           /* 0 = 縮小なし（セッション中の最大値を維持） */
    uint32_t reserved[5];
} STMemoryBudget;
```

:::caution 挙動の変更
- デスクトップの既定最大音源数は **128** です（従来は無制限）。それ以上必要なホストは `st_rt_set_memory_budget` で
  引き上げます。
- モバイル・Web は遅延リングの天井の既定が 1.0 s / 0.5 s のため、343 m / 171 m を超える初期経路はレンダーされません。従来の
  値が必要な場合は `st_rt_render_set_max_delay_seconds` で指定します。
- オフライン DLL（`st_off_*`）は予算の対象外です（無制限）。
- モバイル・Web は Hybrid 初期反射が前提です。Objects モードは音源あたり 30 MB を超えます。
:::

ラッパーごとの設定は [SDK 概要](../sdk/overview.md#音源数の上限)にまとめています。

### Late reverb

FDN16 を 1 つだけ現在のリスナーが所有し、入力は音源ごとの `ReverbSendTap`（source transport の最初の
拡散散乱イベント）のみです。`st_rt_set_late_coupling_preset`（OFF / SUBTLE 6 dB / DEFAULT 9 dB /
STRONG 12 dB）は、リスナーが音源の拡散場からどれだけ離れているかで注入を減衰させ、角の
向こう側でリバーブが減らない問題に対処します。

## オフラインエンジン

`SimpleSTOffline` はデバイス・ワーカーなしで呼び出しスレッド上で伝搬を一度実行して canonical IR キャッシュを
作り（`st_off_ir_compute`）、同じ世代から次を派生します。

| 出力 | 関数 |
|---|---|
| Raw エネルギータップ（early + reverb send + transport 台帳） | `st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_early_taps`、`st_off_ir_copy_raw_reverb_send_taps` |
| 圧力 IR（広帯域モノ / 9バンド分離） | `st_off_ir_init_pressure_request`、`st_off_ir_render_pressure` |
| バイノーラル IR（パンニング / MIT KEMAR / SADIE D2） | `st_off_ir_init_binaural_request`、`st_off_ir_render_binaural` |
| オーディションペア（dry WAV + レンダー） | `st_off_ir_render_audition_pair` |

オフラインコンテキストはリスナーを複数作成でき（`st_off_listener_create`）、進捗・キャンセル
（`st_off_ir_get_progress`、`st_off_ir_request_cancel`）のみ lock-free です。EDC・T60・C50 のようなエネルギー
解析は圧力 IR の `h(t)²` で計算します。

## 診断

| 関数 | 用途 |
|---|---|
| `st_rt_get_timing` | レーン別の伝搬・IR ビルド・レンダーブロック時間（ms） |
| `st_rt_ir_get_stats` | 1 回の IR 発行スナップショット（タップ数・bed セル・prepare CPU/wall） |
| `st_rt_render_get_process_stats` | 512 フレームブロックのステージ別 µs |
| `st_rt_scene_get_stats` | ライブのメッシュ・オブジェクト・音源・三角形数 |
| `st_rt_debug_set_collect_visual_paths` + `st_rt_debug_copy_visual_paths` | 可視化用の経路点列（guide ray / direct / reflection / diffraction / transport） |
| `st_rt_debug_copy_mesh_accel_nodes` / `_scene_accel_nodes` | BLAS/TLAS ノードボックス |
| `st_rt_scene_raycast` | 伝搬が使う加速構造で最近接ヒットを問い合わせ |

![SimpleST デモアプリ](/img/core/demo-app.png)

## 参考

- [STCoreV2 から SimpleST へ](./stcorev2.md) — 旧 `exa*` API との対応表
- [SDK概要](../sdk/overview.md)
- [FMOD プラグイン](../sdk/fmod.md) · [Wwise プラグイン](../sdk/wwise.md)
