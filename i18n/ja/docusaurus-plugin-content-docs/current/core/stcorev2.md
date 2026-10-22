---
sidebar_position: 2
title: STCoreV2 から SimpleST へ
sidebar_label: STCoreV2 → SimpleST
description: 前世代エンジン STCoreV2（exasoundC.h）から現行の SimpleST ABI 6 へ移行する際に変わった概念と API 対応表。
---

# STCoreV2 から SimpleST へ

**STCoreV2**（`exaSound`、`exasoundC.h` の `exa*` API）は Sound Tracing の前世代コアでした。
2026 年 10 月をもって、すべての SDK・プラグイン・デモが [SimpleST](./simplest.md) に置き換えられ、
STCoreV2 の実装は配布されなくなりました。このページは、STCoreV2 統合を持つチームが移行する際に
確認すべき差分をまとめたものです。

:::info この URL について
このページのアドレス（`/core/stcorev2`）は、かつて STCoreV2 リファレンスがあった場所です。リファレンス本文は
[SimpleST](./simplest.md) に置き換えられました。
:::

## 変わった概念

| 項目 | STCoreV2 | SimpleST |
|---|---|---|
| ヘッダー / プレフィックス | `exasoundC.h`、`exa*` の単一 DLL | `STRealtime.h`（`st_rt_*`）+ `STOffline.h`（`st_off_*`）の 2-DLL、共通 `STTypes.h` |
| コンテキスト | グローバル `exaInit()` / `exaReset()` | コンテキストオブジェクト `st_rt_create` / `st_rt_destroy`。1 プロセスに複数可 |
| エンティティ id | すべて `int`、**0 = 無効** | 型付きハンドル `STMeshId` など、**`v < 0` = 無効**、0 は有効 |
| シーン | `exaNewScene` + `exaSceneAdd*` | コンテキストがそのままシーン。リスナーはリアルタイムコンテキストごとに 1 個（暗黙） |
| 材質 | 8バンド（`67.5…8k Hz`）、三角形に吸収/透過を直接保存、`reflection = 1 − (A+T)` を導出、`Surface` / `Solid Distance` 透過モデル | **9バンド（63…16k Hz）** R/A/T/scattering を明示、`|R+A+T−1| ≤ 0.001` の厳格検証、自動導出なし、不変材質（差し替え時は新しい材質ハンドル） |
| 距離減衰 | 多項式 `1/(c + l·d + q·d²)` を音源ごと・経路ごとに | 物理 `1/r` + 参照/最小距離（`st_rt_set_physical_distance_attenuation`）、ISO 9613-1 空気吸収 |
| 音源オーディオ | レンダラーが音源ごとに出力（`exaRenderSound`、`exaCreateRenderer`） | 音源は**モノ入力ストリーム**、リスナーレンダラーが全音源を一度にステレオ/Nチャンネルへミックス（`st_rt_render_process`） |
| レンダー出力 | 呼び出し側が音源ごとのバッファを収集 | `DEVICE` / `HOST_PULL` / `HOST_PULL_BUFFERED` の 3 モード、ホストサンプルレート変換を内蔵 |
| 初期反射 | 経路ごとのオブジェクト | Objects / **Hybrid（exact 予算 + HOA3 bed）** |
| HRTF | KU100 parametric / convolution / SADIE H12 テーブルロード、Band8 | パンニング / 内蔵 **MIT KEMAR** / **SADIE II D2**（ファイル 1 つ）。KU100・H12・Band8・parametric はなし |
| GPU | WebGPU（Dawn）propagation provider | **なし**（CPU パイプラインスケジューラ）。`enableGpu` 類はエラーを返す |
| 加速構造 | HKDTree / LBVH / LBVH_SIMD4·8·16 / NWAY、メッシュごとのビルドオプション | コンテキスト全体の `st_rt_scene_set_accel`（TinyBVH 既定）、メッシュごとのオプションなし |
| スキンドメッシュ | `exaMeshUpdateVertices` → `exaMeshRefit` の 2-call refit | **refit なし** — 新しいポーズは新しいメッシュ生成（`st_rt_mesh_create`）で差し替え |
| オブジェクト更新 | `STATIC / REFIT / REBUILD / DYNAMIC` の 4 種 | `isDynamic` フラグ（静的 = 静的 TLAS、動的 = 変換のみ更新） |
| path cache / seed | `pathCacheSize`、`seedValue` オプション | `seedValue` のみ（`STRT_CreateOptions`）、path cache オプションなし |
| 伝搬呼び出し | `exaTickScene` 同期 | `st_rt_propagate` — PIPELINED はワーカーを起こして即座に返り、SYNCHRONOUS は呼び出しスレッドで実行 |
| 統計 | `exaGetStatistics`、`exaPropagatorGetProfile`、`exaGetMemoryTraceSnapshot` | `st_rt_get_timing`、`st_rt_ir_get_stats`、`st_rt_render_get_process_stats`、`st_rt_scene_get_stats` |
| 可視化 | `exaGetValidPaths`（`ExaPathData`） | `st_rt_debug_set_collect_visual_paths` + `acquire_snapshot` + `copy_visual_paths` |
| 座標 | 右手系、`+Y` up、`-Z` forward、`exaListenerSetCoordinateBasis` | **左手系、`+Y` up、`+Z` forward（Unity と同一）**、basis API なし — ラッパーが変換 |
| 単位 | `ExaSTOption.sceneRatio` | `STRT_CreateOptions.sceneRatio`（生成時に 1 回） |
| 最大深度 | `EXA_MAX_DEPTH = 16` | 反射 16、透過 64 |

## 関数対応表

| STCoreV2 | SimpleST（リアルタイム） |
|---|---|
| `exaInit()` / `exaReset()` | `st_rt_create(&opt, &ctx)` / `st_rt_destroy(ctx)` |
| `exaGetVersion()` | `st_rt_get_version_string()`、`st_rt_get_api_version()`、`st_rt_get_capabilities()` |
| `exaGetLastError()` | `st_rt_get_last_status(ctx)`、`st_rt_get_last_error(ctx, buf, cap)` |
| `exaNewScene()` / `exaTickScene()` | （コンテキスト）/ `st_rt_propagate(ctx)` |
| `exaAddSoundMaterial()` / `exaSetSoundMaterial()` | `st_rt_material_create(ctx, &mat)` / 材質は不変 — 新しい材質を生成して `st_rt_mesh_set_material` |
| 既定材質テーブルのロード（SDK 側） | `st_rt_material_load_defaults(ctx)` |
| `exaNewMesh()` + `exaMeshSetData()` + `exaMeshSetMaterial()` | `st_rt_mesh_create(ctx, &mesh, material, triMaterialIndices)` |
| `exaMeshUpdateVertices()` + `exaMeshRefit()` | なし — 新しいメッシュを生成してオブジェクトを差し替え |
| `exaNewObject()` + `exaObjectSetMesh()` + `exaSceneAddObject()` | `st_rt_object_create(ctx, mesh, &transform, isDynamic)` または `_q`（位置・クォータニオン・スケール） |
| `exaObjectSetPosition/Rotation/Scale()` | `st_rt_object_set_transform[_q]()` |
| `exaObjectSetUpdateType()` | 生成時の `isDynamic`。静的の変更は `st_rt_build`、動的は `st_rt_build_dynamic` |
| `exaNewSoundSource()` + `exaSceneAddSource()` | `st_rt_source_create(ctx, &desc)` |
| `exaSoundSourceSetPosition/Direction/Velocity()` | `st_rt_source_set_position/direction/velocity()` |
| `exaSoundSourceSetIntensity()` | `STSourceDesc.intensity`（圧力倍率）+ `st_rt_source_set_energy()`（エネルギー倍率） |
| `exaSoundSourceSetRayCount/Depth()` | `st_rt_source_set_ray_count()`、`st_rt_source_set_depth()` |
| `exaSoundSourceSetReverbSendDb()` | `st_rt_source_set_path_volume(ctx, src, ST_SOURCE_VOLUME_REVERB, linear)` |
| `exaSoundSourceSetPathEnable()` | `st_rt_source_set_path_enabled(ctx, src, pathType, enabled)` |
| 音源ごとの指向性テーブル | `st_rt_source_set_directivity()` + `st_rt_source_set_orientation_q()`、コーン式は `st_rt_source_set_axis_attenuation()` |
| `exaNewListener()` + `exaSceneAddListener()` | 暗黙のリスナー 1 個（`st_rt_listener_*`） |
| `exaListenerSetPosition/Orientation/Velocity()` | `st_rt_listener_set_position/rotation(yaw,pitch)/velocity()` |
| `exaListenerSetRayCount/RayDepth()` | `st_rt_listener_set_ray_count()`、`st_rt_set_max_depth()` |
| `exaListenerSetOption()`（`sceneRatio` など） | `STRT_CreateOptions.sceneRatio`、`st_rt_set_*` ポリシー関数群 |
| `exaListenerSetCoordinateBasis()` | なし — ホストラッパーで変換 |
| `exaListenerSetHrtfMode()` / `exaListenerLoadHrtf()` | `st_rt_render_set_spatializer(ctx, 0/1/2)` |
| `exaCreateRenderer()` / `exaRenderSound()` / `exaRemoveRenderer()` | `st_rt_render_start(ctx, useHrtf)` / `st_rt_render_process(ctx, out, frames)` / `st_rt_render_stop(ctx)` |
| 音源オーディオ入力（ホストミキシング） | `st_rt_source_attach_stream()` + `st_rt_source_write_stream()`、または `st_rt_source_set_audio_file()` |
| `exaGetValidPathCount/Paths()` | `st_rt_debug_set_collect_visual_paths(mask)` → `st_rt_debug_acquire_snapshot()` → `st_rt_debug_copy_visual_paths()` |
| `exaGetSortedIRDatas()` | リアルタイム ABI にはなし — オフライン `st_off_ir_compute()` + `st_off_ir_copy_raw_early_taps()` / `render_pressure()` |
| `exaGetStatistics()` / `exaPropagatorGetProfile()` | `st_rt_get_timing()`、`st_rt_ir_get_stats()`、`st_rt_render_get_process_stats()`、`st_rt_scene_get_stats()` |
| `exaGetMemoryTraceSnapshot()` | なし |
| `exaPropagatorInitGpu()` / `exaPropagatorSetGpuProvider()` | なし（CPU 専用） |
| `exaPropagatorGetGuidePlanes/MirrorPositions()` | なし（guide ray は visual path 収集 mask で観察） |

## 移行時のチェックリスト

1. **材質を 9バンドで再入力**します。8バンドを複製して埋めるのではなく、16 kHz の値を測定・推定して入れ、
   バンドごとに R+A+T=1 を合わせます。`Solid Distance` 透過距離は SimpleST にないため、表面透過
   係数（T）に換算します。
2. **音源オーディオをモノストリームとして**流し込みます。音源ごとの出力ノード・エフェクトはリスナーミックスの後ろへ移します。
3. `exaMeshRefit` の経路があった場合は、スキンドメッシュを**定期的に新しいメッシュへ差し替える**構造に変えます
   （UE プラグインの `SkinnedPoseRefreshSeconds` がこの方式です）。
4. 座標系を確認します。`-Z` forward のホストは Z の符号を反転します（soundtrace.js は
   `coordinateBasis` が処理します）。
5. `exaRenderSound` をホストオーディオコールバックの `st_rt_render_process` に置き換え、
   `renderOutputMode` と `hostSampleRate` を生成オプションに指定します。
6. `st_rt_render_start` の**後に** `STRenderOptions.reserved0 = 1`（Hybrid）を適用します（2.18.0 からエンジンの既定は
   Hybrid ですが、明示を推奨します）。出力リミッターをホストが担う場合は、同じ箇所で `useLimiter = 0` にして無効にします。
7. capability ビット（`ST_CAP_*`）で機能の有無を確認し、`structSize`/`apiVersion` を埋めて呼び出します。

## 参考

- [SimpleST](./simplest.md)
- 各 SDK の変更点: [Web](../sdk/web.md) · [Unity](../sdk/unity.md) · [Unreal Engine](../sdk/ue.md)
