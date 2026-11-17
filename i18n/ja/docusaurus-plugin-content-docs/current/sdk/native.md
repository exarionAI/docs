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
| Windows x64 | `Win64/Release/SoundTracingRealtime.dll` + `.lib` | 動的 |
| macOS (Universal) | `Mac/Release/libSoundTracingRealtime.dylib` | 動的 |
| Linux x86_64 | `Linux/Release/libSoundTracingRealtime.so` | 動的 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSoundTracingRealtime.so` | 動的 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsoundtracing_static.a` | 静的 |
| Web | `Web/Release/SoundTracingRealtime.mjs` + `.wasm` (pthreads) | WASM モジュール (COOP/COEP が必要) |

オフライン IR 計算用の `SoundTracingOffline`（同じフォルダー、`st_off_*`）も同梱されています。ヘッダーは全プラットフォーム共通です。

```text
SoundTracing/
├─ Include/SoundTracing/ABI/   STRealtime.h · STOffline.h · STTypes.h
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
#include <SoundTracing/ABI/STRealtime.h>

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

## API リファレンス

リアルタイム DLL（`st_rt_*`、`STRealtime.h`）とオフライン DLL（`st_off_*`、`STOffline.h`）のすべての export をカテゴリ別にまとめています。カテゴリと関数を展開すると、シグネチャ・用途・呼び出しタイミングとスレッド・パラメータ・戻り値が表示されます。スレッドタグの意味は [スレッドモデル](#スレッドモデル) を参照してください。失敗した呼び出しの原因は `st_rt_get_last_status` / `st_rt_get_last_error`（オフラインは `st_off_*`）で読み取ります。

<details>
<summary><strong>コンテキスト · ランタイム — 生成、バージョン・capability、状態、idle/run、スレッド属性・インベントリ、メモリ予算、タイミング</strong> — 24 個</summary>

<details>
<summary><code>st_rt_get_api_version</code> — このライブラリの ABI バージョン番号を返す</summary>

```c
uint32_t st_rt_get_api_version(void);
```

**用途** — ロードした `SoundTracingRealtime` ライブラリが、ホストがコンパイルしたヘッダーと同じ ABI かどうかを判定する基準値です。バージョン文字列ではなく、この値で互換性を判断します。

**呼び出し方** — ライブラリをロードした直後、コンテキストを作る前に呼びます。戻り値をヘッダーの `ST_ABI_VERSION` と比較し、異なればそのライブラリは使いません。すべてのバージョンスタンプ付き構造体の `apiVersion` フィールドにも同じ値（`ST_ABI_VERSION`）を入れます。スレッド: `[any]` — コンパイル定数なので、どのスレッドから呼んでもよく、ブロックしません。

| パラメータ | 説明 |
|---|---|
| (なし) | |

**戻り値** — ライブラリの ABI バージョン（`ST_ABI_VERSION`、現在 `6`）。失敗しません。

</details>

<details>
<summary><code>st_rt_get_version_string</code> — 製品リリースのバージョン文字列を返す</summary>

```c
const char* st_rt_get_version_string(void);
```

**用途** — ログ・診断画面に表示する、人が読むためのリリースバージョンです。オフラインライブラリの `st_off_get_version_string` と同じ形式です。

**呼び出し方** — いつでも呼べます。ABI 互換性の判定には使わず、`st_rt_get_api_version` を使います。スレッド: `[any]` — どのスレッドからでもブロックせずに呼べます。

| パラメータ | 説明 |
|---|---|
| (なし) | |

**戻り値** — ライブラリ内の静的な NUL 終端文字列。呼び出し側は解放しません。

</details>

<details>
<summary><code>st_rt_get_capabilities</code> — 能力ワード 0（<code>ST_CAP_*</code>）を返す</summary>

```c
uint64_t st_rt_get_capabilities(void);
```

**用途** — このライブラリがどの機能群をサポートしているかをビットで知らせます。ホストはオプション機能（ホスト pull レンダリング、スレッド属性、IR 統計など）を使う前に該当する `ST_CAP_*` ビットを確認し、機能の有無で分岐します。

**呼び出し方** — コンテキストなしでいつでも呼べます。`st_rt_get_capability_word(0)` と同じ値です。ワード 0 のビットは `ST_CAP_*` の名前だけが該当し、`ST_CAP1_*` ビットは必ず `st_rt_get_capability_word(1)` で確認します（同じビット位置でもワードごとに意味が異なります）。次の位置は旧能力の欠番で、決して立ちません: `ST_CAP_RETIRED_MASK`（8・9・10・13・18・20・21・25）。スレッド: `[any]` — コンパイル定数です。

| パラメータ | 説明 |
|---|---|
| (なし) | |

**戻り値** — 能力ワード 0 の 64 ビットマスク。ビット 63 `ST_CAP_CAPABILITY_WORDS` が立っていれば、`st_rt_get_capability_word` でワード 1 以降を読めます。

</details>

<details>
<summary><code>st_rt_get_capability_word</code> — 指定した番号の能力ワードを返す</summary>

```c
uint64_t st_rt_get_capability_word(uint32_t word);
```

**用途** — ワード 0 の 64 ビットがすべて埋まったため、新しい能力はワード 1 から `ST_CAP<n>_*` という名前で追加されます。この関数でワード番号を指定して読みます。

**呼び出し方** — コンテキストなしでいつでも呼べます。まず `st_rt_get_capabilities()` に `ST_CAP_CAPABILITY_WORDS`（ビット 63）があるかを確認します。たとえばエンジン休止（`st_rt_idle`/`st_rt_run`）は `st_rt_get_capability_word(1) & ST_CAP1_ENGINE_IDLE`、音源メモリ予算は `ST_CAP1_MEMORY_BUDGET`（ワード 1 のビット 63）で確認します。異なるワードのビットを混ぜて AND しません。スレッド: `[any]` — コンパイル定数です。

| パラメータ | 説明 |
|---|---|
| `word` | ワード番号。`0` = `st_rt_get_capabilities()` と同じ値（`ST_CAP_*`）、`1` = `ST_CAP1_*`。ヘッダーが知っているワード数は `ST_CAPABILITY_WORD_COUNT`（現在 `2`） |

**戻り値** — 該当ワードの 64 ビットマスク。未知のワード（`word ≥ ST_CAPABILITY_WORD_COUNT`）は `0`（= その能力なし）です。

</details>

<details>
<summary><code>st_rt_get_sample_rate</code> — エンジン内部のサンプルレートを返す</summary>

```c
int st_rt_get_sample_rate(void);
```

**用途** — エンジンが内部で使う固定サンプルレートを知らせます。ホストのオーディオが別のレートで動くなら、`STRT_CreateOptions.hostSampleRate` でエンジンに境界での変換を任せます。

**呼び出し方** — いつでも呼べます。スレッド: `[any]` — コンパイル定数です。

| パラメータ | 説明 |
|---|---|
| (なし) | |

**戻り値** — `44100`（Hz、固定）。

</details>

<details>
<summary><code>st_rt_set_thread_attributes</code> — エンジンスレッドの種類ごとに優先度・コア選好・affinity を指定する</summary>

```c
int st_rt_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**用途** — ゲーム・ミドルウェアのホストが自身のスレッド配置ポリシーに合わせて、エンジンが作るスレッドの優先度・コア選好・affinity を種類ごとに指定します（FMOD `Thread_SetAttributes` と同じ役割）。コンテキストとは無関係な **プロセス全体** の表で、Realtime ライブラリと Offline ライブラリはそれぞれ自分の表を持ちます — 両方のライブラリを併用する場合は `st_rt_` と `st_off_` の両方に同じ値を指定する必要があります。

**呼び出し方** — **`st_rt_create` の前に** 呼ぶのが契約です。すでに開始したスレッドには遡及せず、以降に生まれるスレッド（次の `st_rt_create`、次の `st_rt_render_start`、次のファイル入力のアタッチ）から適用されます。実際の OS スレッドがある種類は `ST_THREAD_COMPUTE_POOL`（計算プール）· `ST_THREAD_AUDIO_RENDER`（レンダリングスレッド）· `ST_THREAD_FILE_DECODER`（ファイルデコーダー）の 3 つだけで、残りの値は共有計算プール上で動く論理的な役割のため、保存されるだけで物理スレッドには適用されません — 計算処理のポリシーは `ST_THREAD_COMPUTE_POOL` で指定します。`ST_THREAD_PRIORITY_DEFAULT` はプラットフォームの既定表をそのまま使うため、affinity やコア選好だけを指定しても、オーディオレンダリングスレッドの既定の優先度引き上げは維持されます。明示的な優先度を与えると、その値が代わりに適用されます。スレッド: `[any]` — プロセス全体の表を短いミューテックスひとつで更新します。

| パラメータ | 説明 |
|---|---|
| `threadType` | `STThreadType` の値 `0`〜`10`（下表）。範囲外なら `0` |
| `attributes` | 要求値。呼び出し側が `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION` を設定する。`NULL` ならその種類を既定値に戻す（リセット） |

**構造体** `STThreadAttributes`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `priority` | `STThreadPriority`（下表）。既定 `ST_THREAD_PRIORITY_DEFAULT`（0） |
| `flags` | `ST_THREAD_FLAG_*` の組み合わせ。既定 `0` |
| `affinityMask` | 論理プロセッサのビットマスク、`0` = 指定なし。**Windows のみ尊重** します。プロセスマスクの部分集合でなければカーネルが拒否します。64 論理プロセッサを超えるマシンでは、現在のプロセッサグループ内でのみ解釈されます |
| `reserved[4]` | すべて `0` でなければなりません |

すべてのフィールドが `0`（DEFAULT · flags 0 · affinity 0）なら「指定なし」と同じです。

**列挙型** `STThreadType`

| 値 | 名前 | 意味 |
|---|---|---|
| `0` | `ST_THREAD_LANE_DIRECT` | 論理的な役割: direct 伝搬処理（専用スレッドなし） |
| `1` | `ST_THREAD_LANE_GUIDE` | 論理的な役割: guide 処理 |
| `2` | `ST_THREAD_LANE_REFLECTION_DIFFRACTION` | 論理的な役割: 反射/回折処理 |
| `3` | `ST_THREAD_LANE_REVERB` | 論理的な役割: 残響処理 |
| `4` | `ST_THREAD_COMPUTE_POOL` | 実スレッド: 計算プールのワーカー。PIPELINED は `max(3,N)−1` 個（Direct 専用 1 個を含む）、SYNCHRONOUS は `N>1` のとき `N` 個 |
| `5` | `ST_THREAD_AUDIO_RENDER` | 実スレッド: `st_rt_render_start` が開くレンダリングスレッド（`HOST_PULL` モードにはない） |
| `6` | `ST_THREAD_FILE_DECODER` | 実スレッド: ファイルデコーダー、エンジンあたり最大 1 個 |
| `7` | `ST_THREAD_ACCEL_BUILD` | 予約値。加速構造のビルドは呼び出しスレッドで実行され、別のワーカーはない |
| `8` | `ST_THREAD_IR_CONVERTER` | 論理的な役割: IR 変換処理 |
| `9` | `ST_THREAD_AU_PREPARE` | 論理的な役割: IR 準備処理 |
| `10` | `ST_THREAD_SCENE_INPUT` | 論理的な役割: シーン入力処理 |
| `11` | `ST_THREAD_TYPE_COUNT` | 種類の数（引数には使わない） |

**列挙型** `STThreadPriority`

| 値 | 名前 | Windows | macOS QoS |
|---|---|---|---|
| `0` | `ST_THREAD_PRIORITY_DEFAULT` | プラットフォームの既定表のまま | プラットフォームの既定表のまま |
| `1` | `ST_THREAD_PRIORITY_LOW` | LOWEST | BACKGROUND |
| `2` | `ST_THREAD_PRIORITY_BELOW_NORMAL` | BELOW_NORMAL | UTILITY |
| `3` | `ST_THREAD_PRIORITY_NORMAL` | NORMAL | USER_INITIATED |
| `4` | `ST_THREAD_PRIORITY_ABOVE_NORMAL` | ABOVE_NORMAL | USER_INTERACTIVE |
| `5` | `ST_THREAD_PRIORITY_HIGH` | HIGHEST | USER_INTERACTIVE |
| `6` | `ST_THREAD_PRIORITY_TIME_CRITICAL` | TIME_CRITICAL | USER_INTERACTIVE |

**フラグ** `ST_THREAD_FLAG_*`

| フラグ | 意味 |
|---|---|
| `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` (`1u << 0`) | パフォーマンスコアを優先 |
| `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES` (`1u << 1`) | 効率コアを優先 |

コア選好は Windows 11 EcoQoS として適用され、macOS では無視されます（QoS クラスがクラスター配置を決めます）。2 つのフラグを同時に有効にすると拒否されます。

**戻り値** — `1` = 成功 / `0` = 失敗（`threadType` が範囲外、`structSize`/`apiVersion` の不一致、`priority` が範囲外、コア選好フラグの競合、`reserved[]` が 0 でない）。失敗時は表は変わりません。コンテキストを受け取らないため、`st_rt_get_last_status` には何も残りません。

</details>

<details>
<summary><code>st_rt_get_thread_attributes</code> — スレッドの種類ごとに保存された属性の要求値を読む</summary>

```c
int st_rt_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**用途** — `st_rt_set_thread_attributes` で保存した値を確認します。実際に OS に適用された値ではなく、**要求値そのもの** を返します。

**呼び出し方** — いつでも呼べます。一度も指定していない種類は既定値（priority `DEFAULT` · flags `0` · affinityMask `0`）を返します。スレッド: `[any]` — プロセス全体の表を短いミューテックスひとつで読みます。

| パラメータ | 説明 |
|---|---|
| `threadType` | `STThreadType` の値 `0`〜`10`。範囲外なら `0` |
| `outAttributes` | 出力。呼び出し側が `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION` を設定する。成功時は `priority`・`flags`・`affinityMask` が設定され、`reserved[]` は 0 になる |

`STThreadAttributes` のフィールドは `st_rt_set_thread_attributes` の項目を参照。

**戻り値** — `1` = 成功 / `0` = 拒否（`outAttributes` が `NULL`、スタンプ不一致、`threadType` が範囲外）。

</details>

<details>
<summary><code>st_rt_init_create_options</code> — 生成オプション構造体を既定値で埋める</summary>

```c
void st_rt_init_create_options(STRT_CreateOptions* outOptions);
```

**用途** — `STRT_CreateOptions` を正しいバージョンスタンプと既定値で初期化します。ホストはこの関数で埋めたあと、必要なフィールドだけを変えて `st_rt_create` に渡します。こうすると、今後追加されるフィールドも安全な既定値（0）で埋まります。

**呼び出し方** — `st_rt_create` の直前に呼びます。`structSize` と `apiVersion` が自動で設定され、`scheduler` は `ST_RT_SCHEDULER_PIPELINED`、残りのフィールドはすべて `0`（各フィールドの「既定」の意味）です。スレッド: `[any]` — 呼び出し側が所有する構造体を埋めるだけです。

| パラメータ | 説明 |
|---|---|
| `outOptions` | 埋める構造体。`NULL` なら何もしない |

**構造体** `STRT_CreateOptions`

| フィールド | 型 | 既定 | 説明 |
|---|---|---|---|
| `structSize` | `uint32_t` | `sizeof(STRT_CreateOptions)` | バージョンスタンプ。異なれば生成を拒否 |
| `apiVersion` | `uint32_t` | `ST_ABI_VERSION` | バージョンスタンプ。異なれば生成を拒否 |
| `scheduler` | `int32_t` | `ST_RT_SCHEDULER_PIPELINED`(1) | `STRT_Scheduler`。`PIPELINED`(1) = エンジンのワーカーが伝搬・IR をバックグラウンドで最新フレーム優先で計算する、リアルタイムの既定モード。`SYNCHRONOUS`(0) = ホストが `st_rt_propagate` を呼ぶスレッドでパイプラインが動く同期モード（診断・互換用）。生成後は変更不可（`st_rt_get_scheduler`） |
| `seedValue` | `uint32_t` | `0` | 互換用フィールド。既定バックエンドの出力には影響しません |
| `maxDelaySeconds` | `float` | `0` | レンダリングの遅延リング長（秒）。`0` = プラットフォーム既定（デスクトップ 2.0 s、Android・iOS 1.0 s、Emscripten 0.5 s）。それ以外の値は約 0.0118 s（1 処理ブロック + 8 サンプル）〜60 s、有限値であること。生成後は `st_rt_render_set_max_delay_seconds` で変更します |
| `maxComputeThreads` | `uint32_t` | `0` | 伝搬・IR 計算に使うスレッド数の上限 = エンジン所有の共有計算プールの幅。`0` = 自動 = `min(パフォーマンスコア数, 6)`、最小 1。環境変数の影響は受けません。PIPELINED では予算 `N` が最小 3 に引き上げられ、オーディオスロット 1 + Direct 専用ワーカー 1 + 汎用ワーカー `N−2` に分けられます（下の `st_rt_create` のスレッド数の表）。サポート有無は `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | `float` | `0` | シーン単位 → メートルの変換係数。`0` = 既定 1.0（シーン単位 = メートル）。センチメートルのホストは `0.01f`、フィートのホストは `0.3048f`。**生成時専用** のためランタイムの setter はありません。非有限値・0 以下の値は拒否。サポート有無は `ST_CAP_SCENE_RATIO` |
| `renderOutputMode` | `int32_t` | `ST_RT_RENDER_OUTPUT_DEVICE`(0) | `STRT_RenderOutputMode`（下表）。範囲外は拒否。サポート有無は `ST_CAP_HOST_PULL_RENDER` / `ST_CAP_HOST_PULL_BUFFERED` |
| `hostSampleRate` | `int32_t` | `0` | ホストのサンプルレート。`0` = エンジンのレート（44100）— リサンプラーを作りません。それ以外の値なら、エンジンが内蔵の窓付き sinc 変換器でストリーム入力（`st_rt_source_write_stream`）と pull 出力（`st_rt_render_process`）を変換し、公開 API で「フレーム」単位として出てくる値（`write_stream`・`render_process`・`render_get_latency_frames`・`STStreamDesc.capacityFrames`・`STStreamStatus`）が **すべてこのレート** になります。許容範囲 `[8000, 384000]`。`DEVICE` モードで 0 以外の値は拒否（デバイス経路はエンジンのレートに固定）。サポート有無は `ST_CAP_HOST_SAMPLE_RATE` |
| `backend` | `int32_t` | `ST_BACKEND_ST`(0) | `STBackend` パイプラインの選択。`ST_BACKEND_ST`(0) が既定のエンジンです。`ST_BACKEND_EXA`(1) はライブラリが `ST_CAP_BACKEND_EXA` を公開しているときだけ使え、`SYNCHRONOUS` スケジューラーと `maxDelaySeconds = 0` が必要です。それ以外・使用不可の値は拒否 |
| `startIdle` | `uint32_t` | `0` | `0` = 生成直後 `RUNNING`、`1` = 生成直後 `IDLE` — ホストが `st_rt_run` を呼ぶまで伝搬・IR・レンダリングは動きません（聞かせるものがないときに計算が空回りしないように）。それ以外の値は拒否。サポート有無は `ST_CAP1_ENGINE_IDLE` |
| `maxSources` | `uint32_t` | `0` | 最大音源数。`0` = プラットフォーム既定（デスクトップ 128、Android・iOS 48、Emscripten 32）。生成後は `st_rt_set_memory_budget` で変更します。サポート有無は `ST_CAP1_MEMORY_BUDGET` |

**列挙型** `STRT_RenderOutputMode`

| 値 | 名前 | 意味 |
|---|---|---|
| `0` | `ST_RT_RENDER_OUTPUT_DEVICE` | 既定。`st_rt_render_start` が出力デバイスとエンジンのレンダリングスレッドを開き、エンジンがデバイスまで直接出力します |
| `1` | `ST_RT_RENDER_OUTPUT_HOST_PULL` | ホスト pull。エンジンはデバイスもレンダリングスレッドも作らず、ホストが自身のオーディオスレッドで `st_rt_render_process` を呼んでブロックを取得します。このモードでも `st_rt_render_start(useHrtf)` は必ず呼ぶ必要があります（バイノーラル/スピーカーの選択と「レンダリング許可」フラグを兼ねる） |
| `2` | `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED` | エンジンのレンダリングスレッドがリング（容量 8 ブロック・目標 3 ブロック）を埋め、`st_rt_render_process` はリングからコピーするだけです。ホストコールバックのコストが memcpy 程度に下がり、ジッターはリングが吸収します。ブロック処理そのものが継続的にブロック時間を超えるとリングでも防げず、無音で埋められます。遅延の上限 ≈ エンジン 3 ブロック。`hostSampleRate ≠ 0` なら変換はレンダリングスレッドで行います |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_create</code> — リアルタイムコンテキスト（エンジン・ワーカー・計算プール）を作る</summary>

```c
STStatus st_rt_create(const STRT_CreateOptions* options, STRT_Context** outContext);
```

**用途** — リアルタイムエンジンのインスタンスをひとつ作ります。シーン・ソース・リスナー・レンダリングなど他のすべての `st_rt_*` 呼び出しはこのコンテキストを受け取ります。スケジューラー・計算スレッド幅・単位倍率・出力モード・ホストサンプルレートのように実行中に変更できない設定は、ここで確定します。

**呼び出し方** — スレッド属性（`st_rt_set_thread_attributes`）を使うなら、それより先に指定してから呼びます。`st_rt_init_create_options` でオプションを埋め、必要なフィールドだけを変えて渡します。成功したら、シーン構成（メッシュ・オブジェクト・ソース・リスナー）→ `st_rt_build` → `st_rt_render_start` の順に進め、終わったら `st_rt_destroy` で解放します。生成直後の状態は PIPELINED スケジューラー、サンプルレート 44100 Hz、レーン更新周期 direct 10 ms / 反射・回折 0 ms / 残響 4 ms、エンジン休止 `RUNNING`（`startIdle = 1` なら `IDLE`）で、既定バックエンドのコンテキストは出力段の等ラウドネス補正が有効な状態で始まります（`st_rt_render_set_loudness_compensation` で無効にできます）。スレッド: `[control, blocking]` — エンジン・ワーカー・計算プールを作る長い区間なので、ゲームループやオーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `options` | 生成オプション。`NULL` なら `st_rt_init_create_options` の既定値で作る。自分で埋める場合は `structSize`/`apiVersion` スタンプが合っている必要がある |
| `outContext` | 出力ハンドル。成功すれば新しいコンテキスト、失敗すれば `NULL` が入る。`NULL` を渡すと `ST_STATUS_INVALID_ARGUMENT` |

`STRT_CreateOptions` のフィールドは `st_rt_init_create_options` の項目を参照。

**エンジンが立ち上げるスレッド数** — `N` は SYNCHRONOUS では解決済みの `maxComputeThreads` 予算、PIPELINED では `max(3, 解決済みの予算)` です。ファイル入力（`st_rt_source_set_audio_file`）がひとつでもあればファイルデコーダースレッドが 1 個加わり、ホストストリーム入力にはデコーダーはありません。加速構造のビルドは呼び出しスレッドで実行されるため、追加のスレッドはありません。

| 出力モード | SYNCHRONOUS | PIPELINED |
|---|---|---|
| `DEVICE` | プールワーカー `N`（N=1 なら 0、呼び出しスレッドでインライン）+ レンダリング 1 + デバイス 1 | プールワーカー `N−1`（Direct 専用 1 + 汎用 `N−2`）+ レンダリング 1 + デバイス 1 |
| `HOST_PULL` | 上からレンダリング・デバイススレッドがなくなる | 上からレンダリング・デバイススレッドがなくなる |
| `HOST_PULL_BUFFERED` | レンダリングスレッドのみでデバイススレッドなし | レンダリングスレッドのみでデバイススレッドなし |

PIPELINED のレンダリングスレッドは予算 `N` 内のオーディオスロットで、優先度だけが引き上げられます。実際の数は `st_rt_get_thread_inventory` で確認します。

**戻り値** — `STStatus`。
- `ST_STATUS_OK` — 成功。
- `ST_STATUS_INVALID_ARGUMENT` — `outContext` が `NULL`、またはオプション値が範囲外（`scheduler`、`maxDelaySeconds`、`sceneRatio`、`renderOutputMode`、`hostSampleRate`、`backend`、`startIdle`）。
- `ST_STATUS_VERSION_MISMATCH` — `structSize`/`apiVersion` の不一致。
- `ST_STATUS_INITIALIZATION_FAILED` / `ST_STATUS_ALLOCATION_FAILED` — エンジンの初期化・割り当ての失敗。

失敗理由の文字列は `st_rt_get_last_error(NULL, ...)` で読みます（同じ呼び出しスレッドで最後に失敗した生成）。

</details>

<details>
<summary><code>st_rt_get_backend</code> — コンテキストが使うパイプラインバックエンドを返す</summary>

```c
int st_rt_get_backend(const STRT_Context* context);
```

**用途** — 生成時に `STRT_CreateOptions.backend` で選択されたパイプラインを確認します。実行中の切り替えはサポートしていません。

**呼び出し方** — 生成後いつでも呼べます。スレッド: `[control]` — 制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STBackend` の値（`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1）。`context` が `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_destroy</code> — コンテキストを解放する（ワーカー停止・join）</summary>

```c
void st_rt_destroy(STRT_Context* context);
```

**用途** — コンテキストと、エンジンが所有するすべてのリソース（シーン、ソース、ワーカー・計算プールのスレッド、レンダリング出力）を解放します。

**呼び出し方** — コンテキストを使い終えたときに一度呼びます。呼び出し後はハンドルが無効になるため、他のスレッドが同じコンテキストを使っていてはいけません。スレッド: `[control, blocking]` — ワーカーを止めて join するため、オーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | 解放するコンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_get_last_status</code> — コンテキストに残った最後のステータスコードを読む</summary>

```c
STStatus st_rt_get_last_status(const STRT_Context* context);
```

**用途** — `int`/`void` を返す関数が失敗したとき、その理由を `STStatus` で確認します。多くの関数は失敗時にこの診断フィールドにステータスを残します。

**呼び出し方** — 失敗が返った直後に、同じ制御スレッドから呼びます。人が読むメッセージは `st_rt_get_last_error` で得ます。オーディオ経路（`st_rt_render_process`）が残したステータスがあれば、それを先に返してクリアします。同じコンテキストを複数のスレッドから同時に使うと、エラー経路の診断記録は直列化されません。スレッド: `[control]` — 制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 最後の `STStatus`。`context` が `NULL` なら `ST_STATUS_INVALID_CONTEXT`。

| 値 | 名前 |
|---|---|
| `0` | `ST_STATUS_OK` |
| `1` | `ST_STATUS_INVALID_CONTEXT` |
| `2` | `ST_STATUS_INVALID_ARGUMENT` |
| `3` | `ST_STATUS_VERSION_MISMATCH` |
| `4` | `ST_STATUS_INITIALIZATION_FAILED` |
| `5` | `ST_STATUS_ALLOCATION_FAILED` |
| `6` | `ST_STATUS_NOT_FOUND` |
| `7` | `ST_STATUS_BUFFER_TOO_SMALL` |
| `8` | `ST_STATUS_INVALID_MATERIAL` |
| `9` | `ST_STATUS_STALE_SNAPSHOT` |
| `10` | `ST_STATUS_UNAVAILABLE` |
| `11` | `ST_STATUS_BUDGET_EXCEEDED` — 音源メモリ予算の超過（`st_rt_source_create`、拒否ポリシーが `ST_MEMORY_REJECT_NEW` のとき） |

</details>

<details>
<summary><code>st_rt_get_last_error</code> — 最後のエラーメッセージ文字列をコピーする</summary>

```c
int st_rt_get_last_error(const STRT_Context* context, char* outMessage, int capacity);
```

**用途** — 最後の失敗について人が読める説明を取得し、ログに残します。`context` に `NULL` を渡すと、コンテキストのない `st_rt_create` の失敗理由を読めます。

**呼び出し方** — 失敗の直後に呼びます。必要なサイズを先に知りたければ、`outMessage = NULL` で呼んで戻り値だけを受け取ります。`context = NULL` のときは **この呼び出しスレッド** で最後に失敗した `st_rt_create` のメッセージで、次の `st_rt_create` 呼び出しがこれを消去します。スレッド: `[control]` — 制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル。`NULL` ならこのスレッドの最後の生成失敗メッセージ |
| `outMessage` | 出力バッファー。`NULL` ならコピーせずサイズだけを返す |
| `capacity` | `outMessage` のバイト数。足りなければ `capacity − 1` バイトで切り詰めて NUL で終端する |

**戻り値** — メッセージ全体を格納するのに必要なバイト数（NUL を含む）。戻り値が `capacity` より大きければ切り詰められています。

</details>

<details>
<summary><code>st_rt_is_acoustic_feature_enabled</code> — 個別の音響機能（空気吸収・伝搬遅延・直接音の遮蔽）が有効かを読む</summary>

```c
int st_rt_is_acoustic_feature_enabled(const STRT_Context* context, int feature);
```

**用途** — `st_rt_set_acoustic_feature_enabled` で有効/無効にした音響機能の現在の状態を確認します。経路種別ゲートと組み合わせて、試聴の A/B 比較（何が音に寄与しているかをひとつずつ切り分ける）に使います。

**呼び出し方** — 生成後いつでも呼びます。既定では 3 つの機能すべてが有効です。スレッド: `[control]` — ロックなしでエンジン状態を読みますが、制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`（0、大気減衰・高域損失）/ `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`（1、経路長に基づく伝搬遅延）/ `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`（2、直接音の遮蔽） |

**戻り値** — `1` = 有効 / `0` = 無効 / `-1` = `context` が `NULL`。

</details>

<details>
<summary><code>st_rt_idle</code> — エンジン全体を休止させる（計算停止後、レンダリングがテールを出し切ってから無音）</summary>

```c
int st_rt_idle(STRT_Context* context);
```

**用途** — 聞かせるものがないとき（再生停止・一時停止・部屋なし）に伝搬・IR 計算とレンダリング処理を止め、CPU を取り戻します。キャッシュと平滑化の履歴は保持されるため、`st_rt_run` で起こすと続きから計算します。

**呼び出し方** — レンダリング中いつでも呼べ、完了を待ちません。呼び出すと伝搬レーン・IR 組み立て・IR 準備処理の新しい実行が止まります（すでに動いていた 1 回は最後まで進みます）。レンダリングは採用済みの IR で入力とテールを出し続け、次の条件がすべて揃うと処理を止めて 0 だけを出します（`DRAINING` → `IDLE`）: 再生中の入力にまだ取り出していない音がない、すべてのソース入力が遅延線の長さ + 1 s のあいだ無音、出力が −80 dBFS 未満で 0.5 s 継続。入力が鳴り続ける場合は、上限（5 s と「入力の無音長 + 2 s」の大きい方）で 1 ブロックのフェードのあと強制的に `IDLE` になります。レンダリングが動いていないとき（`st_rt_render_start` の前、`st_rt_render_stop` の後）はすぐに `IDLE` です。休止中も setter は受け付け、再生要求は起こした後に反映されます。ホストストリーム・スピーカーセットのリングは消費されません（書き込みはリングが満杯になるまで受け付ける）。出力デバイスは開いたままなので、長く休止する場合は `IDLE` を確認してから `st_rt_render_stop` を呼びます。SYNCHRONOUS スケジューラーは計算が `st_rt_propagate` でしか動かないため、レンダリング側だけが休止します。サポート有無は `ST_CAP1_ENGINE_IDLE`。スレッド: `[control]` — 短いロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `1` = 成功（すでに休止中なら何もしない）/ `0` = `context` が `NULL`。

</details>

<details>
<summary><code>st_rt_run</code> — 休止中のエンジンを起こす</summary>

```c
int st_rt_run(STRT_Context* context);
```

**用途** — `st_rt_idle` で休止させた、または `startIdle = 1` で作ったコンテキストで、伝搬・IR・レンダリングを再び動かします。

**呼び出し方** — 再生を再開するときに呼びます。すぐに `RUNNING` になって計算処理を起こし、休止中に受け付けておいたシーン・モーション・ポリシーの変更がそのとき反映されます。IR 組み立ての時間軸（平滑化・ヒステリシス）は休止していた時間を飛ばします。強制 `IDLE` で止まっていた遅延線・残響の状態は続きから出力され、最初のブロックはフェードインされます。完了を待ちません。スレッド: `[control]` — 短いロックと計算処理の起床だけを行います。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `1` = 成功 / `0` = `context` が `NULL`。

</details>

<details>
<summary><code>st_rt_get_idle_state</code> — エンジンの休止状態（RUNNING / DRAINING / IDLE）を読む</summary>

```c
int st_rt_get_idle_state(const STRT_Context* context);
```

**用途** — `st_rt_idle` の後、レンダリングがテールを出し切ったかを確認します。たとえば `IDLE` になった後に `st_rt_render_stop` でデバイスを閉じます。

**呼び出し方** — いつでも呼べます。`IDLE` は「新しい計算なし + レンダリングは 0 を出力」という意味で、進行中だった計算 1 回まで終わったという意味ではありません。スレッド: `[any]` — atomic をひとつ読みます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STRT_IdleState`: `ST_RT_IDLE_RUNNING`（0、動作中）/ `ST_RT_IDLE_DRAINING`（1、休止を要求され、レンダリングが残りの音を出している）/ `ST_RT_IDLE_IDLE`（2、計算休止 + レンダリングは 0 だけを出す — `startIdle = 1` なら生成直後この状態）。`context` が `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_get_scheduler</code> — コンテキストのスケジューラーを返す</summary>

```c
int st_rt_get_scheduler(const STRT_Context* context);
```

**用途** — 生成時に確定したスケジューラーを確認します。レーン更新周期（`st_rt_set_lane_update_interval`）のように PIPELINED でのみ意味がある API を使うか、`st_rt_propagate` を自分で回す必要があるかを判断するときに使います。

**呼び出し方** — 生成後いつでも呼べます。値は不変です。スレッド: `[any]` — 生成時に確定した不変値を読みます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STRT_Scheduler`: `ST_RT_SCHEDULER_SYNCHRONOUS`(0) / `ST_RT_SCHEDULER_PIPELINED`(1)。

</details>

<details>
<summary><code>st_rt_get_timing</code> — パイプラインの段階ごとの直近の所要時間を一度に読む</summary>

```c
int st_rt_get_timing(const STRT_Context* context, STTiming* outTiming);
```

**用途** — 伝搬（レーン 3 分割）・IR 変換・IR 発行・ブロックレンダリングの直近 1 回の所要時間をひとつの構造体で取得し、ホストのプロファイラーや HUD にエンジン負荷を表示します。タイミングを取得する唯一の手段です。

**呼び出し方** — いつでもポーリングできます（例: フレームごと）。`irPublishSequence` を 2 回読んだ値を比較すると、その間に IR が新しく発行されたかがわかります。サポート有無は `ST_CAP_ENGINE_TIMING`（`irPublishSequence` は `ST_CAP_IR_STATS`）。スレッド: `[any]` — atomic だけを読みます。ただし、スタンプが誤っているエラー経路はコンテキストの診断バッファーに記録します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outTiming` | 出力。呼び出し側が `structSize = sizeof(STTiming)`、`apiVersion = ST_ABI_VERSION` を設定する |

**構造体** `STTiming`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が設定するスタンプ |
| `propagateTotalMs` | 伝搬全体（ms）。PIPELINED ではレーンがそれぞれ異なるワーカー・周期で動くため、3 レーンの合計ではなく最も重い反射・回折レーンの値と同じです（`== propagateReflDiffMs`）。SYNCHRONOUS では ≈ direct + reflDiff + reverb |
| `propagateDirectMs` | Direct レーン（直接音 + 透過） |
| `propagateReflDiffMs` | 反射・回折レーン（guide を含む） |
| `propagateReverbMs` | 残響レーン（拡散・ソース輸送） |
| `irBuildMs` | 幾何 → IR 変換 |
| `auralUpdateIrMs` | IR 発行（レンダリング側への反映） |
| `auralProcessMs` | ブロックあたりのレンダリング処理時間（レンダリングスレッドまたはホスト pull コールバック） |
| `irPublishSequence` | IR 発行シーケンスの下位 32 ビット。`st_rt_ir_get_stats` の `publishSequence` と同じ値、`0` = まだ発行なし |
| `reserved[7]` | 予約 |

まだ一度も動いていない段階は `0` です。

**戻り値** — `1` = 成功 / `0` = `context`・`outTiming` が `NULL`、またはスタンプ不一致（不一致は `st_rt_get_last_status` に `ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_set_memory_budget</code> — 音源メモリ予算（最大音源数・バイト上限・拒否ポリシー）を指定する</summary>

```c
int st_rt_set_memory_budget(STRT_Context* context, const STMemoryBudget* budget);
```

**用途** — モバイル・Web のようにメモリが厳しいプラットフォームで、音源数と音源ごとのメモリ合計に上限をかけます。音源ひとつは固定コスト（伝搬・IR のコピー・輸送・ストリームリング）と遅延リング（シーンの最長経路に比例、下限 `ringFloorSeconds` 〜 上限 `st_rt_render_get_max_delay_seconds`）、経路レーンでメモリを使います。予算を超える `st_rt_source_create` はポリシーに従って拒否されるか、最も遠い音源を追い出して受け入れられるため、生成後は新しい音源によってメモリが増えません。

**呼び出し方** — 生成後いつでも呼べます。最大音源数だけを決めるなら、生成時の `STRT_CreateOptions.maxSources` でも構いません。既存の値をもとに変更するなら、`st_rt_get_memory_budget` で読み、必要なフィールドだけを直して set します。上限を下げても既存の音源は維持され、新しい生成から適用されます。使用量は `st_rt_get_memory_stats` で確認します。サポート有無は `ST_CAP1_MEMORY_BUDGET`（能力ワード 1）。スレッド: `[control]` — 制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `budget` | 新しいポリシー。呼び出し側が `structSize = sizeof(STMemoryBudget)`、`apiVersion = ST_ABI_VERSION` を設定する。`0` のフィールドは既定値を意味する |

**構造体** `STMemoryBudget`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が設定するスタンプ |
| `maxSources` | 最大音源数。`0` = プラットフォーム既定 |
| `rejectPolicy` | `STMemoryRejectPolicy`: `ST_MEMORY_REJECT_NEW`（0、既定）= 超えると `st_rt_source_create` が失敗ハンドル（`v < 0`）と `ST_STATUS_BUDGET_EXCEEDED` を返す。`ST_MEMORY_EVICT_FARTHEST`（1）= リスナーから最も遠い音源を `st_rt_source_destroy` と同じ経路で追い出し、新しい音源を受け入れる（追い出した id は `STMemoryStats.lastEvictedSource`） |
| `sourceBudgetBytes` | 音源ごとの可変メモリ合計の上限（バイト）= 追跡バイト + `fixedPerSourceBytes` × 音源数。`0` = 無制限（観測のみ） |
| `fixedPerSourceBytes` | 音源ひとつの固定コストの推定値。`0` = エンジン既定（2.5 MiB）。予算の推定にのみ使われる |
| `ringFloorSeconds` | 入力をアタッチした直後・経路のない音源の遅延リングサイズ（秒）。`0` = 0.25 |
| `ringGrowthHeadroom` | リング拡張の余裕倍率 — 必要な遅延 × この値（+50 ms、125 ms 単位で切り上げ）。`0` = 1.25 |
| `allowShrink` | `0` = リングを縮小しない（セッション中の最大値を維持）、`1` = 縮小を許可 |
| `reserved[5]` | すべて `0` でなければならない |

**プラットフォーム既定値**

| ビルドターゲット | `maxSources` | `sourceBudgetBytes` | 遅延リング上限 |
|---|---|---|---|
| デスクトップ | 128 | 無制限 | 2.0 s |
| Android · iOS | 48 | 96 MiB | 1.0 s |
| Emscripten（Web） | 32 | 64 MiB | 0.5 s |

**戻り値** — `1` = 適用 / `0` = 拒否。拒否時は状態は変わらず、`st_rt_get_last_status` に `ST_STATUS_VERSION_MISMATCH`（`budget` が `NULL`、またはスタンプ不一致）または `ST_STATUS_INVALID_ARGUMENT`（値が非有限・範囲外、`reserved` が 0 でない）が残ります。`context` が `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_get_memory_budget</code> — 現在の音源メモリ予算ポリシーを読む</summary>

```c
int st_rt_get_memory_budget(const STRT_Context* context, STMemoryBudget* outBudget);
```

**用途** — 現在適用中の予算ポリシー（プラットフォーム既定値が埋められた実効値）を確認したり、一部のフィールドだけを変えるための出発点として使います。

**呼び出し方** — 生成後いつでも呼べます。読んだ構造体を直して `st_rt_set_memory_budget` に渡すのが典型的なパターンです。サポート有無は `ST_CAP1_MEMORY_BUDGET`。スレッド: `[control]` — 制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outBudget` | 出力。呼び出し側が `structSize`/`apiVersion` を設定する。成功時は `reserved[]` が 0 になる |

`STMemoryBudget` のフィールドは `st_rt_set_memory_budget` の項目を参照。

**戻り値** — `1` = 成功 / `0` = `context` が `NULL`、または `outBudget` が `NULL` かスタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_get_memory_stats</code> — 音源メモリの使用量・拒否・追い出しの統計を読む</summary>

```c
int st_rt_get_memory_stats(const STRT_Context* context, STMemoryStats* outStats);
```

**用途** — 予算に対する現在の使用量を観測して予算値を決めたり、拒否・追い出しが起きたかを確認します。

**呼び出し方** — 生成後いつでも呼べます。制御側の記録とプールだけを読み、オーディオスレッドにはアクセスしません。サポート有無は `ST_CAP1_MEMORY_BUDGET`。スレッド: `[control]` — 制御スレッドから呼びます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outStats` | 出力。呼び出し側が `structSize = sizeof(STMemoryStats)`、`apiVersion = ST_ABI_VERSION` を設定する |

**構造体** `STMemoryStats`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が設定するスタンプ |
| `sourceCount` | 現在の音源数 |
| `maxSources` | 適用中の最大音源数 |
| `trackedBytes` | 追跡バイト = 設置済みの遅延リング（差し替え待ちのリングを含む）+ 経路レーンの推定 + プールに保管中のリング |
| `estimatedBytes` | `trackedBytes + fixedPerSourceBytes × sourceCount`。予算判定では、この値が超えるとプール保管のリングを先に空けてから測り直す |
| `sourceBudgetBytes` | 適用中のバイト上限（`0` = 無制限） |
| `pooledRingBytes` | 再利用のために保管中のリングのバイト数（`trackedBytes` に含まれる）。上限はデスクトップ 16 MiB · モバイル 8 MiB · Web 4 MiB、10 s 未使用で解放 |
| `rejectedCreates` | 予算超過で拒否された `st_rt_source_create` の累計 |
| `evictions` | `ST_MEMORY_EVICT_FARTHEST` で追い出した音源の累計 |
| `lastEvictedSource` | 最後に追い出した音源の id、`-1` = なし |
| `ringBytesPerSourceMax` | 最大の音源遅延リングのバイト数 |
| `reserved[6]` | 予約 |

**戻り値** — `1` = 成功 / `0` = `context` が `NULL`、または `outStats` が `NULL` かスタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_ir_get_stats</code> — 直近の IR 発行ひとつについて一貫した計測スナップショットを読む</summary>

```c
int st_rt_ir_get_stats(const STRT_Context* context, STIrStats* outStats);
```

**用途** — ホストに組み込んだときに「IR のベイクがなぜ遅いのか」を、エンジン内部を見ずに切り分けるための計測です。すべてのフィールドが同じ発行の値であることが契約で、次の 3 つを区別できます: ① 仕事が多い → `stagedBedCells`・`mergedBedCells`・`exactTaps`、② プリエンプトされている → `prepareCpuUs` ≪ `prepareTotalUs`（CPU/wall 比が低い）、③ 遅いコアにいる → `prepareCpuUs` ≈ `prepareTotalUs` なのに絶対値が大きい（`prepareCpuIndex` で論理プロセッサを確認）。ホストのフレーム間の `publishSequence` の増分が発行周期を示します。

**呼び出し方** — いつでもポーリングできます。PIPELINED ではシーンが止まると発行も止まります — レーン入力と組み立てキーが変わらず、最後の変化から 2 s 経つと再組み立てしません（レーンは動き続けます）。何かが変われば即座に組み立て・発行し、その後 2 s のあいだは多くても 50 ms ごとに 1 回再組み立てします。そのため静止シーンで「IR が最新か」は `publishSequence` ではなく `settled` で判断します。SYNCHRONOUS でも有効です（呼び出しスレッドがベイクしてすぐ採用するため、CPU/wall 比は 1 に近くなります）。サポート有無は `ST_CAP_IR_STATS`。スレッド: `[any]` — ロックなしの一貫したスナップショットで、不整合な値を返しません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outStats` | 出力。呼び出し側が `structSize = sizeof(STIrStats)`、`apiVersion = ST_ABI_VERSION` を設定する。拒否時は変更しない |

**構造体** `STIrStats`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が設定するスタンプ |
| `publishSequence` | レンダリングが新しい IR を採用するたびに +1。`0` = まだ発行なし |
| `lastPublishLaneMask` | 直前の発行以降に幾何が前進したレーンのビット: `ST_IR_LANE_DIRECT`(`1u<<0`) · `ST_IR_LANE_REFLECTION_DIFFRACTION`(`1u<<1`) · `ST_IR_LANE_REVERB`(`1u<<2`)、そして幾何ビットがひとつもないときだけ立つ `ST_IR_LANE_POLICY_ONLY`（`1u<<3`、新しい幾何なしで再変換 — IR ポリシーの変更、または組み立てがまだ収束中） |
| `stagedBedCells` | early bed マージの入力セル数（ソースごとの合計） |
| `mergedBedCells` | early bed マージの出力セル数 |
| `activePartitions` / `maxPartitions` | bed 畳み込みのパーティション数（アクティブ / 最大） |
| `irSpanMs` | マージ済み bed IR の長さ（ms） |
| `exactTaps` | exact 経路のタップ数 |
| `sendTaps` | 残響 send のタップ数 |
| `rainTaps` | 1 次散乱（diffuse rain）のタップ数 |
| `prepareMergeUs` | bed マージ・バンド正規化の時間（µs） |
| `prepareBakeUs` | bed の時間領域ベイクの時間（FFT を除く、µs） |
| `prepareFftUs` | パーティション FFT の時間（µs） |
| `prepareTotalUs` | IR 準備全体の wall 時間（µs）。PIPELINED はベイクスレッドの準備のみ、SYNCHRONOUS は適用まで含めた全体のため、2 つのスケジューラーの値を並べて比較しません。段階別 µs 3 つの合計はこれより小さくなります |
| `prepareCpuUs` | 同じ区間のベイクスレッドの CPU 時間（µs）。Windows は分解能がスケジューラーティック（約 15.6 ms）のため、単一の値より複数の発行の比率の傾向を見ます。POSIX ははるかに細かいです |
| `prepareCpuIndex` | 準備が終わった瞬間にそのスレッドがいた論理プロセッサ番号（ヒント）。未サポート = `0xFFFFFFFF`（macOS は常にこの値） |
| `directLaneFrames` / `exactLaneFrames` / `reverbLaneFrames` | IR 組み立てが受け取ったレーンフレームの累計（direct · 反射/回折 · 残響、uint32 で循環）。変更（ソース追加・リスナー移動など）の直後の値を記録しておき、+2 以上になれば、その変化の後に開始したレーン実行の結果が組み立てに入ったことを意味します |
| `settled` | `1` = 組み立てが受け取ったレーンフレームをすべて処理し（収束）、最後に発行した IR をレンダリングが採用した |
| `reserved[2]` | すべて 0 |

`directLaneFrames`〜`settled` は `ST_CAP1_ENGINE_IDLE` を目印とし、PIPELINED でのみ意味があり（SYNCHRONOUS は 0 と `settled = 1`）、残りのスナップショットとは別に読む値です。bed 関連の 8 フィールド（`stagedBedCells`・`mergedBedCells`・`activePartitions`・`maxPartitions`・`irSpanMs`・`prepareMergeUs`・`prepareBakeUs`・`prepareFftUs`）は early bed レンダリングモード（`STRenderOptions.reserved0 = 1`）でのみ 0 以外になります — exact objects モード（`0`）での 0 は「ベイク段階そのものがない」ことを意味します。`exactTaps`・`sendTaps`・`rainTaps` はモードに関係なく埋められます。

**戻り値** — `1` = 成功（まだ発行がなければ `publishSequence = 0` で成功）/ `0` = 拒否: `context`・`outStats` が `NULL`、スタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）、スナップショットが同時発行と連続して衝突（`ST_STATUS_UNAVAILABLE` — まれで、呼び直せば済みます）。

</details>

<details>
<summary><code>st_rt_get_thread_inventory</code> — コンテキストが現在立ち上げているスレッド数を種類ごとに読む</summary>

```c
int st_rt_get_thread_inventory(const STRT_Context* context, STThreadInventory* outInventory);
```

**用途** — スレッド属性（`STThreadAttributes`）が「何を設定するか」なら、インベントリは「実際にいくつ動いているか」です。ホストが自身のスレッド予算を推測ではなく数値で立てられるようにします。

**呼び出し方** — いつでも呼べます。種類ごとのカウンターはそれぞれ独立した atomic なので、同一時点のスナップショットではありません — スレッドの起動・終了中は合計が一時的にずれることがあり、エラーではありません。出力デバイスのスレッド（オーディオドライバー）は別の経路で作られるため、インベントリには含まれません。サポート有無は `ST_CAP_THREAD_INVENTORY`。スレッド: `[any]` — 種類ごとの atomic カウンターだけを読みます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outInventory` | 出力。呼び出し側が `structSize = sizeof(STThreadInventory)`、`apiVersion = ST_ABI_VERSION` を設定する |

**構造体** `STThreadInventory`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が設定するスタンプ |
| `countByRole[ST_THREAD_TYPE_COUNT]` | `STThreadType` の順のスレッド数（インデックス = 種類）。論理的な役割（LANE_*・IR_CONVERTER・AU_PREPARE・SCENE_INPUT）は計算プール上で動くため常に `0`、`ST_THREAD_ACCEL_BUILD` も `0` |
| `reserved[5]` | 予約 |

`STThreadType` の値は `st_rt_set_thread_attributes` の項目を参照。

典型的な値（PIPELINED、計算プール予算 `N = max(3, 解決済みの予算)`、ファイルソースあり）:

| 出力モード | LANE_* | IR_CONVERTER · AU_PREPARE | COMPUTE_POOL | AUDIO_RENDER | FILE_DECODER |
|---|---|---|---|---|---|
| `DEVICE` | 0 | 0 | `N−1`（Direct 専用 1 を含む） | 1 | 1 |
| `HOST_PULL` | 0 | 0 | `N−1` | 0 | 1 |

SYNCHRONOUS は LANE_* がすべて 0 で、ファイル入力がなければ FILE_DECODER は 0 です。

**戻り値** — `1` = 成功 / `0` = `context`・`outInventory` が `NULL`、またはスタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

</details>

<details>
<summary><strong>材質 · メッシュ · オブジェクト · シーン</strong> — 17 個</summary>

<details>
<summary><code>st_rt_material_create</code> — 音響材質をひとつ登録してハンドルを受け取る</summary>

```c
STMaterialId st_rt_material_create(STRT_Context* context, const STMaterial* material);
```

**用途** — 9 つのオクターブバンドの反射・吸収・透過・散乱係数で定義した材質をエンジンに登録します。メッシュ（`st_rt_mesh_create`）はこの関数が返した材質ハンドルを参照して、表面の音響特性を決めます。

**呼び出し方** — その材質を使うメッシュを作る前に呼びます。複数の材質はこの関数を繰り返し呼んで登録し、戻りハンドルの `v` は登録順に連続します。既定の材質ライブラリが必要なら `st_rt_material_load_defaults` を併用します。スレッド: `[control]` — 制御スレッド専用で、ワーカーと排他になり短時間ブロックすることがあるため、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `material` | 登録する材質。呼び出し側が `structSize = sizeof(STMaterial)`、`apiVersion = ST_ABI_VERSION` を設定します。係数よりスタンプを先に検証します |

**構造体** `STMaterial`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STMaterial)` — 呼び出し側が設定 |
| `apiVersion` | `ST_ABI_VERSION` — 呼び出し側が設定 |
| `reflection[ST_FREQUENCY_BANDS]` | バンドごとの反射エネルギー比、`[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | バンドごとの吸収エネルギー比、`[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | バンドごとの透過エネルギー比、`[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 反射エネルギーのうち拡散（diffuse）に回る比率、`[0, 1]`。R+A+T の合計には含まれません |
| `reserved[8]` | 予約 |

- バンドは `ST_FREQUENCY_BANDS` = 9 個（63 · 125 · 250 · 500 · 1000 · 2000 · 4000 · 8000 · 16000 Hz）固定です。
- すべての係数は **エネルギー領域**（無次元のエネルギー比）です。圧力振幅ではありません。
- バンドごとに `|R + A + T − 1| <= ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`（0.001）を満たす必要があります。エンジンは値の導出・正規化・クランプ・補間を行わないため、合計が 1 になるよう呼び出し側で合わせて渡す必要があります。

**戻り値** — 材質ハンドル（`STMaterialId`、`struct { int32_t v; }`）。メッシュ・オブジェクトのハンドル（`STMeshId`・`STObjectId`）も同じ形の別の型なので、混同して渡すとコンパイルエラーになります。失敗すると `v < 0` で、`st_rt_get_last_status` に原因が残ります: `material` が NULL なら `ST_STATUS_INVALID_ARGUMENT`、スタンプ不一致なら `ST_STATUS_VERSION_MISMATCH`、非有限値・範囲外の値・R+A+T 合計の不一致なら `ST_STATUS_INVALID_MATERIAL`。

</details>

<details>
<summary><code>st_rt_material_load_defaults</code> — 既定の材質ライブラリを一括で登録する</summary>

```c
STMaterialId st_rt_material_load_defaults(STRT_Context* context);
```

**用途** — エンジンに内蔵された既定の材質ライブラリを丸ごと登録します。材質係数を自分で用意せず、すぐにシーンを構成するときに使います。

**呼び出し方** — メッシュを作る前に呼びます。戻り値はライブラリの **最初の材質** のハンドルで、残りの材質は `v+1`、`v+2` … の順に連続します。`st_rt_material_create` で登録した材質と併用しても構いません。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — ライブラリの最初の材質のハンドル。失敗すると `v < 0`。

</details>

<details>
<summary><code>st_rt_scene_set_edge_split_collinear_overlaps</code> — 共線上で重なる音響エッジを分割するかを決める</summary>

```c
void st_rt_scene_set_edge_split_collinear_overlaps(STRT_Context* context, int enabled);
```

**用途** — メッシュ作成時にコンパイルされる音響エッジ（回折エッジ）のトポロジーで、一直線上に重なって置かれた（共線重複）エッジを分割して扱うかを決めるシーンビルドオプションです。サポート有無は capability ビット `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS` で確認します。

**呼び出し方** — メッシュ作成時点の値が使われるため、**この呼び出しの後に作るメッシュにのみ** 適用されます。既存のメッシュのトポロジーは変わらないので、`st_rt_mesh_create` の前に設定します。既定は無効です。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | `0` = 無効（既定）/ 0 以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_scene_set_solid_wedge_gate</code> — 回折ウェッジの向き付き棄却ゲートを有効/無効にする</summary>

```c
void st_rt_scene_set_solid_wedge_gate(STRT_Context* context, int enabled);
```

**用途** — 2 つの面が交わる回折ウェッジ（wedge）で、メッシュのワインディング（法線方向）から凸・凹を判別し、ウェッジの固体側に入る回折経路を棄却するゲートです。サポート有無は capability ビット `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE` で確認します。

**呼び出し方** — 既定は無効です。伝搬段階で判定するため、既存のメッシュにも適用されます。有効にすると判定がメッシュのワインディングに依存するため、メッシュ内でワインディングを一貫させ、法線が空気側を向くようにする必要があります — ワインディングを反転すると凸・凹が入れ替わり、棄却される回折経路の集合が逆になります（`st_rt_mesh_create` のワインディングの説明を参照）。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | `0` = 無効（既定）/ 0 以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_scene_set_accel</code> — メッシュ・静的シーンの加速構造の種類を選ぶ</summary>

```c
int st_rt_scene_set_accel(STRT_Context* context, int kind);
```

**用途** — メッシュの BLAS と静的シーンの加速構造に使う構造の種類を選択します。エンジンは生成時に `SOUNDTRACING_ACCEL` 環境変数も読みますが、この関数を使えばホストは自プロセスの環境を変えずに同じ選択ができます。

**呼び出し方** — オブジェクトを追加する前に呼びます。以降のビルドにのみ適用され、既存メッシュの BLAS は作成時点の値で構築されたままです。既定値は `2`（TinyBVH）です。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH（既定）/ `3` = LBVH / `4` = LBVH_Simd |

**戻り値** — `1` = 適用 / `0` = `kind` が範囲外、またはコンテキストがない。

</details>

<details>
<summary><code>st_rt_scene_set_triangle_intersection</code> — 三角形交差カーネルを選ぶ</summary>

```c
int st_rt_scene_set_triangle_intersection(STRT_Context* context, int kind);
```

**用途** — レイ-三角形の交差判定に使うカーネルを選択します。3 つのカーネルはいずれも両面交差です。

**呼び出し方** — カーネルは `st_rt_mesh_create` の時点でメッシュに固定されるため、**この呼び出しの後に追加するメッシュにのみ** 適用されます（既存メッシュへの遡及なし）。メッシュごとに異なるカーネルを使う構成も有効です。既定は `0`（MollerTrumbore）です。現在の値は `st_rt_scene_get_triangle_intersection` で読みます。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `kind` | `0` = MollerTrumbore（既定）/ `1` = PluckerAdaptive / `2` = Watertight |

**戻り値** — `1` = 適用 / `0` = 不正な `kind`、またはコンテキストなし。

</details>

<details>
<summary><code>st_rt_scene_get_triangle_intersection</code> — 現在の三角形交差カーネルの設定を読む</summary>

```c
int st_rt_scene_get_triangle_intersection(const STRT_Context* context);
```

**用途** — `st_rt_scene_set_triangle_intersection` で指定した値、つまり次に作るメッシュに適用される交差カーネルを照会します。

**呼び出し方** — いつでも呼べます。既存のメッシュはそれぞれ作成時点のカーネルを保持するため、戻り値が既存メッシュのカーネルと同じである保証はありません。スレッド: `[control]` — シーンの read ロックだけを取る照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight。コンテキストがなければ `-1`。

</details>

<details>
<summary><code>st_rt_scene_get_stats</code> — 有効なメッシュ・オブジェクト・ソース・三角形の数を照会する</summary>

```c
int st_rt_scene_get_stats(STRT_Context* context, STSceneStats* outStats);
```

**用途** — 現在生きている音響シーンのインベントリ（メッシュ・オブジェクト・ソースの個数と三角形数）を、1 回の read ロックのスナップショットで返します。すべての値が同一時点のシーンを記述するため、診断・メモリ規模の把握に使います。サポート有無は capability ビット `ST_CAP_SCENE_STATS` で確認します。

**呼び出し方** — シーン構成中でもレンダリング中でも、制御スレッドからいつでも呼べます。スレッド: `[control]` — シーンの read ロックだけを取る照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outStats` | 結果を受け取る構造体。呼び出し側が `structSize = sizeof(STSceneStats)`、`apiVersion = ST_ABI_VERSION` を設定します |

**構造体** `STSceneStats`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STSceneStats)` — 呼び出し側が設定 |
| `apiVersion` | `ST_ABI_VERSION` — 呼び出し側が設定 |
| `meshCount` | 有効なメッシュ数 |
| `objectCount` | 有効なオブジェクト数。destroy が成功した時点ですぐに減ります |
| `sourceCount` | 有効なソース数。無効化（disabled）されたソースも含み、destroy が成功した時点ですぐに減ります |
| `reserved0` | 予約 |
| `triangleCount` | 有効なオブジェクトが参照するメッシュの三角形を **インスタンスごとに** 合計した値。100 三角形のメッシュを 3 つのオブジェクトが共有すれば 300 |
| `uniqueTriangleCount` | 有効なメッシュリソースを **一度ずつだけ** 合計した値（上の例では 100）。幾何・加速構造のメモリ規模を見るときに使います |
| `reserved[4]` | 予約 |

**戻り値** — `1` = 成功 / `0` = `context`・`outStats` が NULL（`ST_STATUS_INVALID_ARGUMENT`）、またはスタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_scene_raycast</code> — エンジンの加速構造で最近接ヒットを照会する</summary>

```c
int st_rt_scene_raycast(STRT_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**用途** — 伝搬計算が使うのとまったく同じ加速構造（静的+動的オブジェクトの両方）にレイを飛ばし、最も近いヒットをひとつ返します。読み取り専用の照会でパイプラインの状態を変えないため、ホストがエンジンが実際に見ている音響幾何を確認したり、独自ロジック（遮蔽判定・デバッグ表示など）に使えます。サポート有無は capability ビット `ST_CAP_SCENE_RAYCAST` で確認します。

**呼び出し方** — `st_rt_build` で加速構造を構築した後に意味を持ちます。ビルド前ならエラーなしでミスを返します。シーンの read ロックだけを取るため、`ST_RT_SCHEDULER_PIPELINED` でもワーカーと並行して動けます。スレッド: `[control]` — シーンの read ロックだけを取る照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `origin` | レイの原点、ワールド座標の 3 成分（シーン単位）。有限である必要があります |
| `direction` | レイの方向の 3 成分。エンジンが正規化するため単位ベクトルである必要はありませんが、有限かつゼロベクトルでないことが必要です |
| `maxDistanceMeters` | 最大距離（メートル、シーン単位 × `sceneRatio` の規約）。`<= 0` または非有限値なら無限 |
| `outHit` | 結果を受け取る構造体。呼び出し側が `structSize = sizeof(STRayHit)`、`apiVersion = ST_ABI_VERSION` を設定します |

**構造体** `STRayHit`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STRayHit)` — 呼び出し側が設定 |
| `apiVersion` | `ST_ABI_VERSION` — 呼び出し側が設定 |
| `hit` | `1` = ヒット / `0` = ミス |
| `distanceMeters` | 原点からヒット点までの距離（メートル）。シーン距離 × `sceneRatio`（生成オプション、既定 1） |
| `point[3]` | ヒット点。シーンフレームの座標そのまま（単位変換なし） |
| `normal[3]` | ヒットした三角形の単位幾何法線。常に **レイの原点側** を向くように揃えられ、メッシュのワインディングによる符号は保持されません |
| `objectId` | ヒットしたオブジェクトの id（`STObjectId` の `v` 値）。ミスなら `-1` |
| `meshId` | そのオブジェクトのメッシュ id（`STMeshId` の `v` 値）。ミスなら `-1` |
| `triangleIndex` | メッシュローカルの三角形インデックス。ミスなら `-1` |
| `materialIndex` | その三角形の材質インデックス（`STMaterialId` の `v` 値）。ミスなら `-1` |
| `reserved[6]` | 予約 |

ミス（`hit == 0`）の場合、`distanceMeters`・`point`・`normal` は 0 で、4 つの id はすべて `-1` です。`0` は有効な id なのでミスの目印には使いません。id フィールドはハンドル構造体ではなく `int32_t` です。

**戻り値** — `1` = 呼び出し成功（ヒットの有無は `outHit->hit` で判断 — ミスは失敗ではありません）/ `0` = 失敗: `context`・ポインターが NULL、スタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）、`origin`・`direction` が非有限、または `direction` がゼロベクトル（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_mesh_create</code> — 三角形メッシュを登録してハンドルを受け取る</summary>

```c
STMeshId st_rt_mesh_create(STRT_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**用途** — 音響幾何として使う三角形メッシュを登録します。メッシュは幾何リソースで、シーンに実際に置くには `st_rt_object_create`/`st_rt_object_create_q` でこのメッシュを参照するオブジェクト（インスタンス）を作ります。ひとつのメッシュを複数のオブジェクトで共有できます。

**呼び出し方** — 使う材質を先に登録してから呼びます。材質の指定は次のどちらかです。

- `triangleMaterialIndices == NULL`: メッシュ全体がひとつの `material` を使います。
- `triangleMaterialIndices != NULL`: 三角形ごとに材質を指定します（配列長 `mesh->numTriangles`）。このとき `material` 引数は無視されます。サポート有無は `ST_CAP_PER_TRIANGLE_MATERIALS` で確認します。

交差カーネル（`st_rt_scene_set_triangle_intersection`）、エッジ分割オプション（`st_rt_scene_set_edge_split_collinear_overlaps`）、加速構造の種類（`st_rt_scene_set_accel`）は、この呼び出し時点の値でメッシュに固定されます。入力配列は呼び出し中にコピーされるため、戻った後に解放して構いません。スレッド: `[control, blocking]` — 音響エッジのトポロジーをコンパイルする長い排他区間なので、ゲームループ・オーディオスレッドからは呼ばないでください。

ワインディング: 交差は両面で、反射・透過はワインディングに依存しませんが、回折エッジ判定の一部（厚さ 0 の板のエッジ採用、`st_rt_scene_set_solid_wedge_gate`）はワインディングに依存します。メッシュ内でワインディングを **一貫して** 保ち、可能なら法線が空気側を向くようにしてください。座標系をミラーリングして取り込む場合は、インデックスの順序も合わせて反転する必要があります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | メッシュ幾何（`STMesh`）。NULL 不可 |
| `material` | メッシュ全体の材質ハンドル。`triangleMaterialIndices` が NULL のときだけ使われ、登録済みの材質である必要があります |
| `triangleMaterialIndices` | 三角形ごとの材質インデックス配列（`numTriangles` 個、各要素は登録済みの `STMaterialId` の `v` 値）または NULL |

**構造体** `STMesh`

| フィールド | 説明 |
|---|---|
| `numVertices` | 頂点数（> 0） |
| `vertices` | 頂点座標の xyz インターリーブ配列、`numVertices * 3` 個の float。シーン単位（メッシュローカルフレーム） |
| `numTriangles` | 三角形数（> 0） |
| `triangles` | 三角形の頂点インデックス配列、`numTriangles * 3` 個の int。各値は `[0, numVertices)` |

**戻り値** — メッシュハンドル。失敗すると `v < 0`: `mesh`・配列ポインターが NULL、または個数が 0 以下なら `ST_STATUS_INVALID_ARGUMENT`、インデックスの範囲外・未登録の材質などでメッシュが拒否されると `ST_STATUS_INVALID_MATERIAL`。

</details>

<details>
<summary><code>st_rt_object_create</code> — メッシュを行列変換でシーンに配置する</summary>

```c
STObjectId st_rt_object_create(STRT_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**用途** — 登録済みのメッシュをワールド変換とともにシーンに置くオブジェクト（インスタンス）を作ります。伝搬計算と `st_rt_scene_raycast` はオブジェクトだけを見ます。回転をクォータニオンで与えるなら `st_rt_object_create_q` を使います。

**呼び出し方** — `st_rt_mesh_create` の後に呼びます。`isDynamic` で静的/動的を決めます。

- 静的（`0`）: `st_rt_build`（静的+動的の全体ビルド）が発行する静的 TLAS に入ります。追加・削除・変換の変更は、次の `st_rt_build` までは発行済みの静的構造に反映されません。動かない壁・床などの建築幾何に使います。
- 動的（`1`）: 動的オブジェクトの TLAS に入り、変換の変更は全体ビルドなしで動的再構築（refit、`st_rt_build_dynamic`）によって反映されます。ドア・車両などの動く幾何に使います。

スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | 配置するメッシュのハンドル |
| `transform` | ローカル→ワールド変換（`STTransform`）。NULL なら恒等変換 |
| `isDynamic` | `0` = 静的 / 0 以外 = 動的 |

**構造体** `STTransform`

| フィールド | 説明 |
|---|---|
| `m00, m01, m02` | 3x3 回転・スケール行列の 1 行目 |
| `m10, m11, m12` | 2 行目 |
| `m20, m21, m22` | 3 行目 |
| `tx, ty, tz` | 平行移動（シーン単位） |

行優先（row-major）で、点を **列ベクトルとして** 掛けます: `x' = m00*x + m01*y + m02*z + tx`、`y' = m10*x + m11*y + m12*z + ty`、`z' = m20*x + m21*y + m22*z + tz`（`m00*x + m10*y + m20*z` の形ではありません）。非一様スケールや行列式が負の変換（ミラー・負のスケール）も受け付けます。成分が非有限、または逆行列を作れない変換は拒否されます。座標系は左手系、+Y up、+Z forward、+X right です。

**戻り値** — オブジェクトハンドル。失敗すると `v < 0`（存在しないメッシュ、使用できない変換など）。

</details>

<details>
<summary><code>st_rt_object_create_q</code> — メッシュを位置・クォータニオン・スケールでシーンに配置する</summary>

```c
STObjectId st_rt_object_create_q(STRT_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**用途** — `st_rt_object_create` と同じオブジェクトを作りますが、変換を位置・回転クォータニオン・スケール（TRS）で受け取ります。ゲームエンジンのトランスフォームを行列に変換せず、そのまま渡すときに使います。

**呼び出し方** — `st_rt_mesh_create` の後に呼びます。静的/動的の意味とビルドへの反映タイミングは `st_rt_object_create` と同じです。以降の変換は `st_rt_object_set_transform_q` で更新します。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | 配置するメッシュのハンドル |
| `position` | ワールド位置 xyz（シーン単位）。NULL 不可 |
| `quatXYZW` | ローカル→ワールドの回転クォータニオン、**XYZW 順**。エンジンが正規化し、ノルムが `1e-12` 未満なら恒等回転に置き換えます。NULL 不可 |
| `scale` | 軸ごとのスケール xyz。回転に列スケールとして合成され（R·S）、非一様スケールを許容します。NULL 不可 |
| `isDynamic` | `0` = 静的 / 0 以外 = 動的 |

**戻り値** — オブジェクトハンドル。失敗すると `v < 0`（ポインターが NULL、存在しないメッシュ、使用できない変換など）。

</details>

<details>
<summary><code>st_rt_object_set_transform</code> — オブジェクトの行列変換を変更する</summary>

```c
void st_rt_object_set_transform(STRT_Context* context, STObjectId object, const STTransform* transform);
```

**用途** — 配置済みのオブジェクトのローカル→ワールド変換を行列で更新します。

**呼び出し方** — オブジェクトを動かすときに呼びます。動的オブジェクトは全体ビルドなしで動的再構築によって反映されます。静的オブジェクトの変更は保留状態となり次の `st_rt_build` で反映されるため、毎フレーム動く幾何は動的（`isDynamic = 1`）で作ってください。クォータニオンで与えるなら `st_rt_object_set_transform_q` を使います。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `object` | 対象オブジェクトのハンドル |
| `transform` | 新しい変換。`STTransform` のフィールドは `st_rt_object_create` の項目を参照。NULL なら何もしません |

**戻り値** — なし。存在しないオブジェクトや使用できない変換（非有限・逆行列不可）は無視されます。

</details>

<details>
<summary><code>st_rt_object_set_transform_q</code> — オブジェクトの変換を位置・クォータニオン・スケールで変更する</summary>

```c
void st_rt_object_set_transform_q(STRT_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**用途** — `st_rt_object_set_transform` の TRS 版です。ゲームエンジンのトランスフォーム（位置・クォータニオン・スケール）をそのまま渡してオブジェクトを更新します。

**呼び出し方** — 静的/動的ごとの反映タイミングは `st_rt_object_set_transform` と同じです。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `object` | 対象オブジェクトのハンドル |
| `position` | ワールド位置 xyz（シーン単位） |
| `quatXYZW` | ローカル→ワールドの回転クォータニオン、**XYZW 順**。エンジンが正規化し、ノルムが `1e-12` 未満なら恒等回転に置き換えます |
| `scale` | 軸ごとのスケール xyz（R·S 合成、非一様を許容） |

**戻り値** — なし。ポインターのいずれかが NULL なら何もせず、存在しないオブジェクトや使用できない変換は無視されます。

</details>

<details>
<summary><code>st_rt_mesh_destroy</code> — メッシュとそのメッシュを使うオブジェクトを削除する</summary>

```c
int st_rt_mesh_destroy(STRT_Context* context, STMeshId mesh);
```

**用途** — 登録したメッシュリソースをシーンから削除します。このメッシュを参照していたオブジェクトも一緒に解放されます。

**呼び出し方** — もう使わない幾何を整理するときに呼びます。静的オブジェクトが一緒に削除された場合、次の `st_rt_build` までは発行済みの静的構造に残るため、削除後に `st_rt_build` を呼んで反映してください。削除したハンドルは再利用しません。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | 削除するメッシュのハンドル |

**戻り値** — `1` = 削除された / `0` = コンテキストがない、または存在しないメッシュ。

</details>

<details>
<summary><code>st_rt_object_destroy</code> — オブジェクトをシーンから削除する</summary>

```c
int st_rt_object_destroy(STRT_Context* context, STObjectId object);
```

**用途** — 配置したオブジェクト（インスタンス）をシーンから外します。参照していたメッシュリソースは残ります。

**呼び出し方** — 成功するとすぐに `st_rt_scene_get_stats` の `objectCount` が減ります。静的オブジェクトは次の `st_rt_build` までは発行済みの静的構造に残るため、削除後に `st_rt_build` を呼んで反映してください。動的オブジェクトは動的再構築から外れます。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `object` | 削除するオブジェクトのハンドル |

**戻り値** — `1` = 削除された / `0` = コンテキストがない、または存在しない（すでに削除された）オブジェクト。

</details>

<details>
<summary><code>st_rt_mesh_set_material</code> — メッシュ全体の材質を実行時に変更する</summary>

```c
int st_rt_mesh_set_material(STRT_Context* context, STMeshId mesh, STMaterialId material);
```

**用途** — 登録済みのメッシュの材質を別の材質ひとつに置き換えます。メッシュを作り直さずに表面の音響特性だけを変えるときに使います。

**呼び出し方** — シーン構成後いつでも呼べます。メッシュのすべての三角形が `material` を使うようになり、生成時に三角形ごとに指定した材質もこのひとつに置き換わります。材質が無効なら既存の材質をそのまま残します。このメッシュを使うすべてのオブジェクトに反映されます。スレッド: `[control]` — 制御スレッド専用、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | 対象メッシュのハンドル |
| `material` | 新しい材質ハンドル（登録済みの材質） |

**戻り値** — `1` = 変更された / `0` = コンテキストがない、存在しないメッシュ、または未登録の材質。

</details>

</details>

<details>
<summary><strong>音源 — 生成、位置・方向・速度、指向性、経路ゲート・ボリューム、レイ予算</strong> — 21 個</summary>

<details>
<summary><code>st_rt_source_create</code> — 音源を作ってハンドルを返す</summary>

```c
STSourceId st_rt_source_create(STRT_Context* context, const STSourceDesc* source);
```

**用途** — シーンに音源をひとつ登録し、以降のすべての `st_rt_source_*` 呼び出しで使う `STSourceId` ハンドルを返します。位置・方向・速度・圧力倍率・指向プロファイル・動的/静的の別を一度に決めます。

**呼び出し方** — コンテキストを作った後いつでも呼びます。作った後にオーディオ入力（`st_rt_source_set_audio_file`、`st_rt_source_attach_stream` など）をアタッチし、動く音源は毎フレーム `st_rt_source_set_position` / `st_rt_source_set_velocity` で更新します。生成直後の状態: source energy 1.0、経路ボリューム 4 種 1.0、経路種別ゲート 5 種すべて有効、有効（enabled）、休止なし（`ST_RT_IDLE_RUNNING`）、指向性テーブルなし、輸送更新ステップ数 0（既定）、輸送レイグリッド 16 × 8、ソースごとの最大深さ 4。orientation は `direction` に合う roll なしの最小回転に合わせられます（`direction` が `{0,0,1}` なら恒等）。スレッド: `[control]` — シーンロックを取る可能性があるため、オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 生成記述子 `STSourceDesc`（下記）。NULL なら失敗。この構造体には `structSize` / `apiVersion` スタンプはありません |

**構造体** `STSourceDesc`

| フィールド | 説明 |
|---|---|
| `positionX`, `positionY`, `positionZ` | ワールド位置。**シーン単位のまま**（エンジンが `sceneRatio` でメートルに換算）。有限値である必要があります |
| `directionX`, `directionY`, `directionZ` | ソースの正面（forward）方向。エンジンが正規化し、この方向に合わせてソースの orientation（ローカル forward = +Z）を roll なしで設定します。ゼロベクトルなら +Z。有限値である必要があります |
| `velocityX`, `velocityY`, `velocityZ` | ソースの速度、シーン単位/秒。Doppler 計算の前に m/s に換算されます。有限値である必要があります |
| `intensity` | 無次元の **線形圧力（pressure）倍率**。音響インテンシティ（W/m²）・SPL（dB）・校正済みの Pa ではありません。有限かつ 0 以上である必要があります。エネルギー領域の倍率は別途 `st_rt_source_set_energy` で与えます |
| `directional` | `0` = 無指向（全バンド onAxis = offAxis = 1）。`0` 以外 = 簡易指向プロファイル（onAxis = 1、offAxis = 0）。バンドごとに細かく決めるなら、生成後に `st_rt_source_set_axis_attenuation` または `st_rt_source_set_directivity` を使います |
| `isDynamic` | `1` = 動的ソース（残響を毎フレーム再計算）、`0` = 静的ソース（残響をキャッシュして再利用）。輸送更新ステップ数の既定値もこの値で分かれます（`st_rt_source_set_transport_refresh_steps` を参照） |

**戻り値** — 成功時は `v >= 0` の `STSourceId`。失敗は **`v < 0`** で、`st_rt_get_last_status` で理由を確認します。
- `ST_STATUS_INVALID_ARGUMENT` — `source` が NULL、位置・方向・速度・`intensity` に非有限値、`intensity < 0`、その他エンジンが拒否した場合。
- `ST_STATUS_BUDGET_EXCEEDED` — 音源メモリ予算（`STRT_CreateOptions.maxSources`、`st_rt_set_memory_budget` の `maxSources` · `sourceBudgetBytes`）を超えたとき。ポリシーが `ST_MEMORY_REJECT_NEW`（既定）のときだけ発生し、`ST_MEMORY_EVICT_FARTHEST` ならリスナーから最も遠い音源を `st_rt_source_destroy` と同じ経路で追い出して新しい音源を受け入れます（追い出した id は `STMemoryStats.lastEvictedSource`）。サポート有無は `st_rt_get_capability_word(1)` の `ST_CAP1_MEMORY_BUDGET` で確認します。

</details>

<details>
<summary><code>st_rt_source_set_position</code> — 音源の位置を移動する</summary>

```c
void st_rt_source_set_position(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 音源のワールド位置を更新します。動く音源をゲームオブジェクトに追従させるときに使います。

**呼び出し方** — ゲームループで毎フレーム呼んで構いません。速度がわかるホストは `st_rt_source_set_velocity` も一緒に更新します。スレッド: `[control]` — `ST_RT_SCHEDULER_PIPELINED` ではモーションキューに入れて戻り、オーディオコールバックからは呼びません。スピーカーセットのメンバーソースには使えません（無視され `last_status` = `ST_STATUS_INVALID_ARGUMENT`）— セットのポーズ更新を使います。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `x`, `y`, `z` | 新しいワールド位置、**シーン単位**（座標変換なしでそのまま） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_set_direction</code> — 音源の正面方向を変更する</summary>

```c
void st_rt_source_set_direction(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 音源の正面（forward）方向を変更します。コーン減衰（`st_rt_source_set_axis_attenuation`）と指向性テーブル（`st_rt_source_set_directivity`）は、この方向を基準に適用されます。

**呼び出し方** — いつでも呼びます。この setter はソースの orientation を「+Z からその方向へ向かう **roll なしの最小回転**」として合わせて更新します。roll が必要な指向性テーブル（左右が非対称な音源など）には、この関数の代わりに `st_rt_source_set_orientation_q` を使います。スレッド: `[control]`。スピーカーセットのメンバーソースには使えません（無視、`ST_STATUS_INVALID_ARGUMENT`）。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `x`, `y`, `z` | ワールド基準の正面方向ベクトル。座標系は +X right · +Y up · +Z forward |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_set_velocity</code> — 音源の速度を与える</summary>

```c
void st_rt_source_set_velocity(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 音源の移動速度を更新します。エンジンはこの値を Doppler 計算に使います。

**呼び出し方** — 位置の更新と同じ周期で呼びます。スレッド: `[control]` — `ST_RT_SCHEDULER_PIPELINED` ではモーションキューに入れて戻ります。スピーカーセットのメンバーソースには使えません（無視、`ST_STATUS_INVALID_ARGUMENT`）。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `x`, `y`, `z` | 速度ベクトル、**シーン単位/秒**。エンジンが `sceneRatio` で m/s に換算します |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_destroy</code> — 音源を削除する</summary>

```c
int st_rt_source_destroy(STRT_Context* context, STSourceId source);
```

**用途** — 音源をシーンから削除し、そのレンダリング状態を片付けます。音源メモリ予算の枠を取り戻すのもこの呼び出しです。

**呼び出し方** — もう使わない音源に対して呼びます。レンダリング中なら 3 ms のランプで音を下げてからレンダリング状態を回収します。削除したソースのソース単位の休止（`st_rt_source_idle`）設定も一緒に消えます。スレッド: `[control]`。スピーカーセットのメンバーソースは削除できません（`0`、`ST_STATUS_INVALID_ARGUMENT`）— セットを削除します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 削除する音源のハンドル |

**戻り値** — `1` = 削除された / `0` = 失敗（コンテキストが NULL、存在しない音源、スピーカーセットのメンバー）。

</details>

<details>
<summary><code>st_rt_source_set_path_enabled</code> — 音源ひとつの経路種別を有効/無効にする</summary>

```c
void st_rt_source_set_path_enabled(STRT_Context* context, STSourceId source, int pathType, int enabled);
```

**用途** — 音源ひとつについて、特定の経路種別（直接・透過・反射・回折・残響）を計算・寄与から外したり、戻したりします。グローバルゲート `st_rt_set_path_type_enabled` のソース単位版です。特定の音源だけ残響を外すといった演出や、試聴の A/B 比較に使います。

**呼び出し方** — いつでも呼びます。既定では 5 種すべてが有効です。経路を完全に外すのではなく大きさだけを下げるなら、`st_rt_source_set_path_volume`（`STSourceVolumeKind`: `ST_SOURCE_VOLUME_DIRECT`（0、透過を含む）/ `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3)、線形圧力倍率）を使います。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb。範囲外は無視されます |
| `enabled` | `0` = 無効、`0` 以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_is_path_enabled</code> — 音源ひとつの経路種別ゲートを読む</summary>

```c
int st_rt_source_is_path_enabled(STRT_Context* context, STSourceId source, int pathType);
```

**用途** — `st_rt_source_set_path_enabled` で決めたソース単位の経路ゲートの現在値を照会します。

**呼び出し方** — いつでも呼びます。スレッド: `[control]` — シーンの read ロックだけを取る純粋な照会です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |

**戻り値** — `1` = 有効 / `0` = 無効。コンテキストが NULL、存在しない音源、範囲外の `pathType` も `0` です。

</details>

<details>
<summary><code>st_rt_source_set_energy</code> — 音源のエネルギー倍率を決める</summary>

```c
int st_rt_source_set_energy(STRT_Context* context, STSourceId source, float energy);
```

**用途** — 音源の相対放射エネルギーを **energy-domain**（無次元のエネルギー比）の倍率で決めます。`STSourceDesc::intensity`（圧力倍率）とは別の倍率で、指向性テーブルを `ST_DIRECTIVITY_POWER_MEAN` で正規化したときに総放射パワーを決める場所でもあります。

**呼び出し方** — 生成後いつでも呼びます。既定値は 1.0 です。エネルギーと圧力の関係は **energy = gain²** です — 圧力ゲイン g が欲しければ `g * g` を入れます（例: −6 dB、g ≈ 0.5 → energy ≈ 0.25）。エンジンはレンダリング境界で一度だけ平方根を取ります。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `energy` | エネルギー倍率。有限かつ 0 以上。既定 1.0 |

**戻り値** — `1` = 適用 / `0` = 失敗（コンテキストが NULL、非有限値または負値、存在しない音源）。

</details>

<details>
<summary><code>st_rt_source_get_energy</code> — 音源のエネルギー倍率を読む</summary>

```c
float st_rt_source_get_energy(STRT_Context* context, STSourceId source);
```

**用途** — `st_rt_source_set_energy` で決めたエネルギー倍率（energy-domain）を照会します。

**呼び出し方** — いつでも呼びます。スレッド: `[control]` — シーンの read ロックだけを取る純粋な照会です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |

**戻り値** — 現在のエネルギー倍率（既定 1.0）。コンテキストが NULL、または存在しない音源なら `-1.0`。

</details>

<details>
<summary><code>st_rt_source_set_enabled</code> — 音源全体を有効/無効にする</summary>

```c
void st_rt_source_set_enabled(STRT_Context* context, STSourceId source, int enabled);
```

**用途** — 音源を削除せずに伝搬計算から丸ごと外したり戻したりするマスタースイッチです。経路種別ごとのゲート（`st_rt_source_set_path_enabled`）より上位にあります。

**呼び出し方** — いつでも呼びます。生成直後は有効です。クリップをトリガー（`st_rt_source_trigger`）する音源は有効のまま使います。聞かせるものが一時的にない音源を状態ごと休止させるなら `st_rt_source_idle` を使います。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `enabled` | `0` = 無効、`0` 以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_set_ray_count</code> — 音源の輸送レイグリッドのサイズを決める</summary>

```c
void st_rt_source_set_ray_count(STRT_Context* context, STSourceId source, int width, int height);
```

**用途** — この音源が放つ輸送（diffuse transport）レイのグリッド N = `width` × `height` を決めます。音源ごとに品質と計算コストを調整するつまみです。

**呼び出し方** — 生成後いつでも呼びます。既定のグリッドは 16 × 8 です。レイ数が増えるほどコストが増え、そのコストを複数回の伝搬に分散させるなら `st_rt_source_set_transport_refresh_steps` を併用します。値が 0 以下、またはエンジンの輸送予算（グリッド・深さに応じた上限）を超えると拒否され、`last_status` に `ST_STATUS_INVALID_ARGUMENT` が残ります（理由は `st_rt_get_last_error`）。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `width` | グリッドの横方向のレイ数、1 以上。既定 16 |
| `height` | グリッドの縦方向のレイ数、1 以上。既定 8 |

**戻り値** — なし。成否は `st_rt_get_last_status` で確認します。

</details>

<details>
<summary><code>st_rt_source_set_depth</code> — 音源ごとの最大反射深さを決める</summary>

```c
void st_rt_source_set_depth(STRT_Context* context, STSourceId source, int depth);
```

**用途** — この音源の輸送レイの最大反射（バウンス）深さを決めます。`st_rt_source_set_ray_count` とともに、音源ごとの品質・コストを決めるつまみです。

**呼び出し方** — 生成後いつでも呼びます。ソースごとの既定値は 4 です。エンジンの輸送予算を超える、または許容範囲外なら拒否され、`last_status` に `ST_STATUS_INVALID_ARGUMENT` が残ります（理由は `st_rt_get_last_error`）。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `depth` | 最大反射深さ。既定 4 |

**戻り値** — なし。成否は `st_rt_get_last_status` で確認します。

</details>

<details>
<summary><code>st_rt_source_set_transport_refresh_steps</code> — 輸送レイグリッドを何回の伝搬に分けて更新するかを決める</summary>

```c
int st_rt_source_set_transport_refresh_steps(STRT_Context* context, STSourceId source, int steps);
```

**用途** — この音源の輸送レイグリッド N（= `width` × `height`）を **n 回の伝搬にわたって** 更新させます。1 回の伝搬で入れ替えるレイは ceil(N/n) 本で、全体のコストは Σ N/n です。エンジンはグローバルな予算上限を設けないため、音源が多いときのコストはホストが n で制御します。サポート有無は `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS` で確認します。

**呼び出し方** — 生成後いつでも呼びます。グリッドを分割すると、更新されなかったレイの方向が伝搬間で維持されて残響タップが滑らかにつながります。`steps = 1` は毎回の伝搬でグリッド全体を敷き直し、その連続性を断つ代わりに完全に決定的です。IR の再変換は引き起こしませんが、値が変わるとシーンスナップショットを再発行してワーカーに渡し、輸送キャッシュは次の伝搬で作り直されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `steps` | `0` = 既定（スケジューラーと `isDynamic` で決まる — `ST_RT_SCHEDULER_PIPELINED` は動的 8 · 静的 16、`ST_RT_SCHEDULER_SYNCHRONOUS` は動的 1 · 静的 16）/ `1` = 毎回の伝搬で全量を再追跡（ストレージを作らない決定的な経路）/ `2` 以上 = n 回に分けて更新、使用時に `[1, N]` に clamp。負値は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗。負の `steps` は `ST_STATUS_INVALID_ARGUMENT`、存在しない音源は `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_rt_source_get_transport_refresh_steps</code> — 輸送更新ステップ数の保存値を読む</summary>

```c
int st_rt_source_get_transport_refresh_steps(const STRT_Context* context, STSourceId source);
```

**用途** — `st_rt_source_set_transport_refresh_steps` で保存した値を照会します。

**呼び出し方** — いつでも呼びます。返す値は **保存値そのもの**（0 を含む）で、スケジューラーの既定とグリッドの clamp を経た実効 n ではありません。スレッド: `[control]` — シーンの read ロックだけを取る純粋な照会です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |

**戻り値** — 保存されたステップ数（`0` = 既定）。失敗時は `-1`。

</details>

<details>
<summary><code>st_rt_source_set_axis_attenuation</code> — コーン（on/off-axis）指向減衰をバンドごとに決める</summary>

```c
void st_rt_source_set_axis_attenuation(STRT_Context* context, STSourceId source, const float onAxis[ST_FREQUENCY_BANDS], const float offAxis[ST_FREQUENCY_BANDS]);
```

**用途** — 音源の正面（on-axis）と側後方（off-axis）の放射を 9 バンドごとに決める、簡易なコーン指向性です。測定された指向性データがないときに、音源のおおまかな方向性を与えます。

**呼び出し方** — 生成後いつでも呼びます。既定は無指向（全バンド 1.0）です。無指向は `onAxis[] = offAxis[] = 1.0`、単純な指向は `onAxis[] = 1.0` / `offAxis[] = 0.0` を入れます（`STSourceDesc::directional` の 2 つのプロファイルと同じです）。正面方向は `st_rt_source_set_direction` / `st_rt_source_set_orientation_q` が決めます。指向性テーブル（`st_rt_source_set_directivity`）がアタッチされている間はテーブルが使われ、このコーンの値は保持されて、テーブルを外すと再び使われます。スレッド: `[control]`。スピーカーセットのメンバーソースには使えません（無視、`ST_STATUS_INVALID_ARGUMENT`）。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `onAxis` | 正面放射の減衰、`ST_FREQUENCY_BANDS`（9）個、バンド 63 Hz … 16 kHz。NULL なら何も変更しません |
| `offAxis` | 側後方放射の減衰、9 個。NULL なら何も変更しません |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_set_orientation_q</code> — 音源のローカルフレームをクォータニオンで決める</summary>

```c
int st_rt_source_set_orientation_q(STRT_Context* context, STSourceId source, const float quatXYZW[4]);
```

**用途** — 音源のローカルフレームをワールドに載せる回転を、単位クォータニオン（ローカル→ワールド）で決めます。`st_rt_source_set_direction` と違って **roll まで** 表現できるため、左右が非対称な指向性テーブルのフレームを正確に決めるときに使います。サポート有無は `ST_CAP_SOURCE_DIRECTIVITY` で確認します。

**呼び出し方** — 生成後いつでも呼びます。ローカル軸は forward = +Z / up = +Y / right = +X です。`st_rt_source_set_direction` と双方向に同期します — この関数を呼ぶと direction = forward(q) として合わせて更新され、`st_rt_source_set_direction` を呼ぶと orientation が roll なしの最小回転に変わります（最後に呼んだ方が優先）。クォータニオンはエンジンが正規化するため、おおよそ正規化された値を入れても構いません。指向性テーブル（`st_rt_source_set_directivity`）と組み合わせて使います。スレッド: `[control]`。スピーカーセットのメンバーソースは `0`（`ST_STATUS_INVALID_ARGUMENT`）です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `quatXYZW` | ローカル→ワールドの回転クォータニオン、**X, Y, Z, W の順**（`st_rt_object_create_q` と同じ順序） |

**戻り値** — `1` = 成功 / `0` = 失敗。`ST_STATUS_INVALID_ARGUMENT`（非有限の成分または退化、norm &lt; 1e-12）、`ST_STATUS_NOT_FOUND`（存在しない音源）。

</details>

<details>
<summary><code>st_rt_source_set_directivity</code> — 音源に指向性テーブルをアタッチまたはデタッチする</summary>

```c
int st_rt_source_set_directivity(STRT_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**用途** — 測定データなどから得た方向別・バンド別の放射エネルギーテーブルを音源にアタッチします。コーンの式（`st_rt_source_set_axis_attenuation`）では表現できない実際の音源の指向パターンを使うときに必要です。サポート有無は `ST_CAP_SOURCE_DIRECTIVITY` で確認します。

**呼び出し方** — 生成後いつでも呼びます。エンジンはテーブルを **コピー** し、正規化スカラーもこの呼び出しで一度計算するため、戻った後にホストのバッファーを解放して構いません。テーブルがアタッチされている間はコーン減衰の代わりにテーブルが使われ、`table = NULL` で外すと保持されていたコーンの値に戻ります。テーブルの参照方向はソースのローカルフレーム基準なので、`st_rt_source_set_orientation_q` と組み合わせて使います。スレッド: `[control]`。スピーカーセットのメンバーソースは `0`（`ST_STATUS_INVALID_ARGUMENT`）です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |
| `table` | 指向性テーブル `STSourceDirectivity`（下記）。呼び出し側が `structSize` / `apiVersion` を設定します。NULL = テーブルを削除 |

**構造体** `STSourceDirectivity`

ソースのローカルフレーム（forward = +Z、up = +Y、right = +X）における等角の方位角（az）× 仰角（el）のノードグリッド × 9 バンドの **エネルギー** テーブルです。方向の規約はエンジン全体と同じです: az = atan2(x, z)（正面 0°、右 +90°）、el = asin(y)（上 = +）。ノードは az_i = i × 360/`azCount`（360° で wrap）、el_j = −90 + j × 180/(`elCount` − 1) で、参照は az wrap · el clamp の双線形補間です。`elCount` が奇数なら水平面（el = 0）がノード上に載り、推奨グリッドは 5° 間隔（`azCount` = 72、`elCount` = 37）です。

| フィールド | 説明 |
|---|---|
| `structSize` | 呼び出し側が `sizeof(STSourceDirectivity)` で設定します |
| `apiVersion` | 呼び出し側が `ST_ABI_VERSION` で設定します |
| `azCount` | 方位角のノード数、`[3, 361]` |
| `elCount` | 仰角のノード数、`[2, 181]` |
| `levelMode` | `STDirectivityLevelMode` — テーブルの絶対レベルの解釈（下記） |
| `reserved0` | 予約 |
| `energy` | テーブルデータ、`elCount` × `azCount` × `ST_FREQUENCY_BANDS` 個の float。レイアウトは `[el][az][band]`（band が最も速い軸）。**energy-domain**（pressure ではない）で、すべての値が有限かつ 0 以上である必要があります |
| `reserved[6]` | 予約 |

**列挙型** `STDirectivityLevelMode` — raw テーブルはそのままにし、エンジンが設定時に一度計算するバンドごとの正規化スカラーだけを変えます。

| 値 | 説明 |
|---|---|
| `ST_DIRECTIVITY_ABSOLUTE` (0) | 正規化なし、値をそのまま使います。絶対レベルまで含む測定テーブル用 |
| `ST_DIRECTIVITY_POWER_MEAN` (1) | バンドごとの球面パワー平均が 1 になるよう正規化（等放射パワー）。指向パターンだけを使い、総放射パワーは `intensity` / `st_rt_source_set_energy` で別に決めるとき。**既定の推奨** |
| `ST_DIRECTIVITY_ON_AXIS` (2) | 正面（az = 0、el = 0）の値が 1 になるよう正規化。ゲームツールのコーンの慣習と同じ位置づけ |

**戻り値** — `1` = 成功（テーブル削除の成功を含む）/ `0` = 失敗。`last_status`:
- `ST_STATUS_VERSION_MISMATCH` — `table` の `structSize` / `apiVersion` の不一致。
- `ST_STATUS_INVALID_ARGUMENT` — `levelMode` が `STDirectivityLevelMode` の範囲外、`azCount` · `elCount` が範囲外、`energy` が NULL、`energy` に非有限・負の要素（理由は `st_rt_get_last_error`）、スピーカーセットのメンバー。
- `ST_STATUS_NOT_FOUND` — 存在しない音源。

</details>

<details>
<summary><code>st_rt_source_idle</code> — 音源ひとつを休止させる</summary>

```c
int st_rt_source_idle(STRT_Context* context, STSourceId source);
```

**用途** — エンジン全体の休止（`st_rt_idle`）とは別に、音源ひとつだけの計算・レンダリングを止めます。再生は終わったがすぐにまた使う音源を、削除せずにコストなしで保持しておくときに使います。サポート有無は `st_rt_get_capability_word(1)` の `ST_CAP1_ENGINE_IDLE` で確認します。

**呼び出し方** — その音源が聞かせるものを止めた後（stop · pause · 0 の書き込み）に呼びます。作成直後の音源は RUNNING です（エンジン全体が IDLE でも）。
- 呼ぶと、伝搬レーン（direct · 反射/回折 · 残響）はその音源をそれ以上計算せず、最後の結果を凍結します。休止中にリスナーや音源が動いても、その音源の伝搬経路は元の位置のままで、部屋（静的・動的な幾何）が変わると一度再計算して再び凍結します。
- `ST_RT_IDLE_DRAINING` の間、レンダリングはその音源の残りの音（テール）を出します。入力が鳴り続ける場合は DRAINING のままレンダリングを続けます。
- 入力が遅延線の長さ（max delay）+ 1 s のあいだ無音なら `ST_RT_IDLE_IDLE` になり、レンダリングはその音源の入力を読まずレンダリングもせず、IR 組み立てからも外れます（共有残響タンクのテールは続きます）。
- 同時に休止できる音源は 128 個までです。同じ値で再度呼んでも何もしません。
- 伝搬を凍結するのは `ST_RT_SCHEDULER_PIPELINED` です。`ST_RT_SCHEDULER_SYNCHRONOUS` では `st_rt_propagate` が休止中の音源も計算し、レンダリング側の休止だけが同じです。
- スピーカーセットのメンバーはセットが休止を所有するため、`st_rt_speaker_set_idle` / `_run` を使います。

スレッド: `[control]` — シーンロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 休止させる音源のハンドル |

**戻り値** — `1` = 成功 / `0` = 失敗: コンテキストが NULL、存在しない音源（`ST_STATUS_NOT_FOUND`）、スピーカーセットのメンバー（`ST_STATUS_INVALID_ARGUMENT`）、同時休止の表が満杯（`ST_STATUS_UNAVAILABLE`、何も変わらない）。

</details>

<details>
<summary><code>st_rt_source_run</code> — 休止中の音源を再び動かす</summary>

```c
int st_rt_source_run(STRT_Context* context, STSourceId source);
```

**用途** — `st_rt_source_idle` で休止させた音源を再び計算・レンダリングさせます。サポート有無は `ST_CAP1_ENGINE_IDLE` で確認します。

**呼び出し方** — その音源を再び再生する直前に呼びます。次の伝搬から再計算し、次のブロックからレンダリングします。保持していた IR ですぐに音を出し、その音源を含む次の IR（組み立て 1 周期後）から新しい結果を使います。休止中に読まれなかったホストストリームのフレームは、その位置から続けて出力されます。すでに RUNNING なら何もしません。スレッド: `[control]` — シーンロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 起こす音源のハンドル |

**戻り値** — `1` = 成功 / `0` = 失敗: コンテキストが NULL、存在しない音源（`ST_STATUS_NOT_FOUND`）、スピーカーセットのメンバー（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_source_get_idle_state</code> — 音源の休止状態を読む</summary>

```c
int st_rt_source_get_idle_state(const STRT_Context* context, STSourceId source);
```

**用途** — 音源ひとつの休止状態を照会します。`st_rt_source_idle` の後、テールが出し切られたかを確認するときに使います。

**呼び出し方** — いつでも呼びます。休止を要求していなければ RUNNING、レンダリングが残りの音を出している間は DRAINING、出し切れば IDLE です。レンダリングが動いていない、またはエンジン全体が IDLE なら、休止を要求した音源は IDLE です。スレッド: `[control]` — シーンの read ロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |

**戻り値** — `STRT_IdleState` の値: `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1) / `ST_RT_IDLE_IDLE`(2)。存在しない音源またはコンテキストが NULL なら `-1`。

</details>

<details>
<summary><code>st_rt_source_get_position_seconds</code> — 音源入力の再生位置を秒で読む</summary>

```c
double st_rt_source_get_position_seconds(STRT_Context* context, STSourceId source);
```

**用途** — 音源にアタッチしたファイル入力の現在の再生位置を、ソース時間（秒）で照会します。再生 UI の進行表示や `st_rt_source_seek` との整合に使います。サポート有無は `ST_CAP_SOURCE_PLAYBACK_CONTROL` で確認します。

**呼び出し方** — オーディオ入力をアタッチした後いつでも呼びます。値はソース時間基準の秒で、`hostSampleRate` やピッチとは無関係です。ホストストリームのようなライブ PCM 入力はタイムラインをホストが所有するため、位置はありません。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 対象音源のハンドル |

**戻り値** — 再生位置（秒）。存在しない音源、またはライブ入力なら `-1`。

</details>

</details>

<details>
<summary><strong>音源 — オーディオ入力（ファイル・クリップ・ストリーム）、再生制御、ソース EQ</strong> — 27 個</summary>

<details>
<summary><code>st_rt_source_clear_audio</code> — ソースからオーディオ入力（ファイル・クリップ・ホストストリーム）を外す</summary>

```c
int st_rt_source_clear_audio(STRT_Context* context, STSourceId source);
```

**用途** — ソースにアタッチされたオーディオ入力を切り離します。ソースとレンダリングスロットはそのまま残り、そのソースだけが無音になります。ファイル入力（`st_rt_source_set_audio_file` 系）とホストストリーム（`st_rt_source_attach_stream`）はどちらも「オーディオ入力」なので、両方ともこの関数で外します。

**呼び出し方** — ソースを削除せずに音だけを止めるとき、または別の入力に替える前に空にしておくときに使います。切り離しは 3 ms のランプで下がります。ストリームを切り離した後の `st_rt_source_write_stream` は何も書かずに `0` を返します。同じソースに対して `st_rt_source_write_stream` と同時に呼ばないでください。ソースを削除する `st_rt_source_destroy` も入力を一緒に切り離すため、その前にこの関数を呼ぶ必要はありません。スピーカーセットのメンバーソースでは拒否されます（`ST_STATUS_INVALID_ARGUMENT`）。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id（`STSourceId`、`st_rt_source_create` が返した値） |

**戻り値** — `1` = 切り離した / `0` = 失敗（コンテキストが NULL、存在しないソース、スピーカーセットのメンバーなど）。

</details>

<details>
<summary><code>st_rt_source_set_eq</code> — ソースの原音に 9 バンドのグラフィック EQ をかける</summary>

```c
int st_rt_source_set_eq(STRT_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — ソース信号にバンドごとのゲインをかけて音色を補正します。フィルターはクロスオーバーの前、つまりソース信号そのものにかかるため、そのソースの直接・透過・反射・回折・残響の送出がすべて同じフィルターを通ります（実際のスピーカーの信号チェーンに EQ を入れたのと同じです）。出力段 EQ（`st_rt_render_set_eq`）と同じフィルター設計で、オフラインの `st_off_source_set_eq` と同じ実装です。

**呼び出し方** — ソースを作った後いつでも、再生中でも呼べます。IR を無効化せず、レンダリングスレッドに割り当てのないコマンドとして渡されます。再生中に変更するとフィルター状態を保ったまま係数だけが即座に変わります（滑らかなランプはかけません — クリックのない切り替えが必要なら `st_rt_source_set_parametric_eq` を使ってください）。この関数と `st_rt_source_set_parametric_eq` は **同じソース EQ** を変更し、最後に呼んだ方が優先されます。`gainsDb = NULL` を渡すと EQ を無効にして消去します（パラメトリックでかけた設定もこれで消去します）。設定はソースを削除するまで維持されます。スピーカーセットのメンバーソースにもかけられます。サポート有無は `ST_CAP_SOURCE_EQ`（`st_rt_get_capability_word(0)`）で確認します。スレッド: `[control]` — シーンの read ロックとレンダリング制御ロックを短時間取るため、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `gainsDb` | `ST_FREQUENCY_BANDS`（9）個のゲイン（dB）、バンド順 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz。各値は有限で、`[-ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`（±24 dB）内である必要があります — 範囲外ならクランプせず拒否します。`NULL` または全バンド 0 dB なら EQ を無効にします（EQ がない結果とビット一致） |

**フィルター定義** — バンドごとに RBJ peaking biquad をひとつ（Q = 1.414、約 1 オクターブ）、バンドの昇順に直列接続します。サンプルレートはエンジン内部の 44100 Hz 固定で、ホストのサンプルレート（`hostSampleRate`）とは無関係です。`|g| ≤ 1e-4 dB` のバンドはスキップします。隣接バンドの応答が重なる（ピーキングフィルターのスカート）ため、バンド中心で正確に指定ゲインにするには、ホストがゲインを補正して入れる必要があります。

**戻り値** — `1` = 成功 / `0` = 失敗。失敗時の `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`（非有限値または `|g| > 24`、何も変更しない）/ `ST_STATUS_NOT_FOUND`（ソースなし）/ `ST_STATUS_UNAVAILABLE`（このコンテキストのバックエンドがソース EQ をサポートしない）。

</details>

<details>
<summary><code>st_rt_source_get_eq</code> — ソース EQ を 9 バンドのゲインとして読む</summary>

```c
int st_rt_source_get_eq(STRT_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 現在のソース EQ を 9 バンドのグラフィックビューで返します。ソース EQ はひとつで、この関数はそのバンドリストを 9 バンドのゲインとして見せる互換ビューです。

**呼び出し方** — EQ がない、または無効なら、すべて 0 を書き込みます。9 バンドの形（canonical な中心周波数・Q 1.414 の `ST_PARAMETRIC_EQ_PEAKING` 9 個・プリアンプ 0・有効）ならそのゲインを書き込みます。それ以外のパラメトリック設定は 9 バンドで表現できないため、`0` + `ST_STATUS_UNAVAILABLE` を返し、`outGainsDb` には触れません。`UNAVAILABLE` の意味を区別するには `st_rt_source_get_parametric_eq` を呼んでください — 成功すれば「パラメトリック設定のため 9 バンドで読めない」で（設定はそちらで読みます）、同じ `UNAVAILABLE` で失敗すればバックエンドがソース EQ をサポートしていません。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `outGainsDb` | 呼び出し側所有の `float[ST_FREQUENCY_BANDS]` 出力バッファー（63…16k Hz の順、dB）。`NULL` なら拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗。失敗時の `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`（`outGainsDb` が NULL）/ `ST_STATUS_NOT_FOUND`（ソースなし）/ `ST_STATUS_UNAVAILABLE`（上記 2 つのケース）。

</details>

<details>
<summary><code>st_rt_source_set_parametric_eq</code> — ソースの原音に最大 16 バンドのパラメトリック EQ をかける</summary>

```c
int st_rt_source_set_parametric_eq(STRT_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — ソース信号に、バンドの種類・周波数・ゲイン・Q を直接指定したパラメトリック EQ をかけます。かかる位置は `st_rt_source_set_eq` と同じで（クロスオーバーの前、そのソースのすべての経路）、**同じ EQ** です。仮想スピーカーのように、ソースごとに異なる周波数補正が必要なときに使います。

**呼び出し方** — ソースを作った後いつでも、再生中でも呼べます。IR を無効化せず、レンダリングスレッドに割り当てのないコマンドとして渡されます。値が変わると旧設定と新設定を 20 ms のあいだ並行して動かして出力をクロスフェードするため、クリックは出ません。その間にさらに変わった場合は、最新の値ひとつだけを待機させて続けて移行します。この関数と `st_rt_source_set_eq` はいずれもソース EQ のリスト全体を変更し、最後の setter が優先されます。無効なリスト・効果のないリストも保存され、getter はそのまま返します — 無効化して消去するには `st_rt_source_set_eq(context, source, NULL)` を呼びます。スピーカーセットのメンバーソース（`st_rt_speaker_set_get_source` で受け取った id）にもそのままかけられるため、仮想スピーカーごとに異なる補正を与えられます。AutoEq の `ParametricEQ.txt` は `st_rt_render_parse_autoeq_parametric` で読み、結果をそのまま渡せます。設定はソースを削除するまで維持されます。サポート有無は `ST_CAP1_SOURCE_PARAMETRIC_EQ`（`st_rt_get_capability_word(1)`）で確認します。スレッド: `[control]` — シーンの read ロックとレンダリング制御ロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `bands` | `STParametricEqBand` の配列（`bandCount` 個）。`bandCount = 0` なら `NULL` でも構いません |
| `bandCount` | バンド数、`[0, ST_PARAMETRIC_EQ_MAX_BANDS]`（0〜16）。範囲外は拒否 |
| `preampDb` | バンドの前にかける線形ゲイン（dB）、`[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[-48, +12]`。主な用途はクリッピング防止のための負の値です |
| `enabled` | `0` = リストは保存するが素通し（EQ なしと同じ）/ それ以外 = 有効 |

**構造体** `STParametricEqBand`（32 バイト、配列要素のためバージョンスタンプなし）

| フィールド | 説明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5)。未知の値は拒否 |
| `enabled` | `0` = このバンドをスキップ（恒等）/ それ以外 = 有効 |
| `frequencyHz` | PEAKING・NOTCH は中心、シェルフは中点、LP・HP はコーナー周波数。`[ST_PARAMETRIC_EQ_MIN_FREQUENCY_HZ, min(ST_PARAMETRIC_EQ_MAX_FREQUENCY_HZ, 0.49·Fs)]` = 20 Hz 〜 20 kHz（Fs = 44100） |
| `gainDb` | PEAKING・LOW_SHELF・HIGH_SHELF のみが使います（LP・HP・NOTCH は値を保存するだけ）。`[-ST_PARAMETRIC_EQ_MAX_GAIN_DB, +ST_PARAMETRIC_EQ_MAX_GAIN_DB]` = ±24 dB |
| `q` | `[ST_PARAMETRIC_EQ_MIN_Q, ST_PARAMETRIC_EQ_MAX_Q]` = 0.1 〜 30。LOW_SHELF・HIGH_SHELF は `[0.1, ST_PARAMETRIC_EQ_MAX_SHELF_Q]` = 0.1 〜 3 — 大きなゲインのシェルフに大きな Q を与えると角に大きな共振ピークが生じ、ソース EQ はリミッターの前にあるため防ぐものがありません |
| `reserved[3]` | 必ず 0（そうでなければ拒否） |

**フィルター定義** — バンドごとに RBJ Audio EQ Cookbook の 2 次セクションがひとつで、チェーンはプリアンプ → バンド 0…`bandCount-1` の直列です。サンプルレートはエンジン内部の 44100 Hz です。`enabled = 0` のバンドと、`|gainDb| ≤ 1e-4` の PEAKING・シェルフバンドは正確に恒等です。全体が無効、または効果がなければ（全バンド恒等 + プリアンプ 0 dB）、切り替えランプが終わった後から EQ がない結果とビット一致します。

**値の検証** — 非有限値・未知の `type`・`reserved ≠ 0`・`bandCount` の範囲外・（`bandCount > 0` なのに）`bands` が NULL の場合は拒否し、何も変更しません。有限値が範囲を外れた場合は **クランプ** し、getter はクランプされた実効値を返します（9 バンドの `st_rt_source_set_eq` がクランプせず拒否するのとは異なります）。

**戻り値** — `1` = 成功 / `0` = 失敗。失敗時の `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`（上記の検証）/ `ST_STATUS_NOT_FOUND`（ソースなし）/ `ST_STATUS_UNAVAILABLE`（このコンテキストのバックエンドがソース EQ をサポートしない）。

</details>

<details>
<summary><code>st_rt_source_get_parametric_eq</code> — ソース EQ のバンドリスト・プリアンプ・有効状態を読む</summary>

```c
int st_rt_source_get_parametric_eq(STRT_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — ソース EQ の現在の設定を、クランプされた実効値で返します。`st_rt_source_set_eq`（9 バンド）でかけた設定も 9 個の `ST_PARAMETRIC_EQ_PEAKING` バンドとして読めます。EQ がなければ 0 バンド・無効です。

**呼び出し方** — 出力の規約は `st_rt_render_get_parametric_eq` と同じです。`outBands = NULL` ならサイズ照会として動作し、バンドは書かずに個数・プリアンプ・有効状態だけを埋めて `1` を返します。`bandCapacity` を `ST_PARAMETRIC_EQ_MAX_BANDS`（16）にすれば常に収まります。返されるバンドの `reserved` は 0 で埋められます。スレッド: `[control]` — シーンの read ロックとレンダリング制御ロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `outBands` | 呼び出し側所有の `STParametricEqBand` 配列。`NULL` ならサイズ照会。フィールドは `st_rt_source_set_parametric_eq` の項目を参照 |
| `bandCapacity` | `outBands` の要素数。負なら拒否。バンド数より小さければ `0` + `ST_STATUS_BUFFER_TOO_SMALL`（個数・プリアンプ・有効状態は書き込む） |
| `outBandCount` | バンド数を受け取るポインター。`NULL` ならスキップ |
| `outPreampDb` | プリアンプ（dB）を受け取るポインター。`NULL` ならスキップ |
| `outEnabled` | 有効状態（`0`/`1`）を受け取るポインター。`NULL` ならスキップ |

**戻り値** — `1` = 成功 / `0` = 失敗。失敗時の `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`（`bandCapacity < 0`）/ `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_NOT_FOUND`（ソースなし）/ `ST_STATUS_UNAVAILABLE`（このコンテキストのバックエンドがソース EQ をサポートしない）。

</details>

<details>
<summary><code>st_rt_source_set_path_volume</code> — ソースの経路種別ごとのボリュームを決める</summary>

```c
int st_rt_source_set_path_volume(STRT_Context* context, STSourceId source, int volumeKind, float volume);
```

**用途** — ひとつのソースの直接音・反射・回折・残響の寄与を個別に上げ下げします。値は線形の圧力倍率です。直接音のボリュームは透過経路も含み、残響のボリュームはリスナーが共有する後期残響に **このソースが送る量** だけを調整します。

**呼び出し方** — ソースを作った後いつでも呼びます。生成直後は 4 種すべて `1.0` です。経路を完全に外すなら `st_rt_source_set_path_enabled` を、ソース全体のレベルには `st_rt_source_set_volume` を使います。スピーカーセットのメンバーソースにもかけられます。サポート有無は `ST_CAP_SOURCE_PATH_VOLUME` で確認します。スレッド: `[control]` — シーンの read ロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`（0、透過を含む）/ `ST_SOURCE_VOLUME_REFLECTION`(1) / `ST_SOURCE_VOLUME_DIFFRACTION`(2) / `ST_SOURCE_VOLUME_REVERB`（3、共有後期残響への送出）。それ以外は拒否 |
| `volume` | 線形の圧力倍率、有限かつ `0` 以上。既定 `1.0` |

**戻り値** — `1` = 適用 / `0` = 失敗（未知の `volumeKind`、非有限・負の `volume`、存在しないソース）。

</details>

<details>
<summary><code>st_rt_source_get_path_volume</code> — ソースの経路種別ごとのボリュームを読む</summary>

```c
float st_rt_source_get_path_volume(STRT_Context* context, STSourceId source, int volumeKind);
```

**用途** — `st_rt_source_set_path_volume` で決めた経路種別ごとの線形ボリュームを返します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]` — シーンの read ロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `volumeKind` | `STSourceVolumeKind` — `DIRECT`(0) / `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3) |

**戻り値** — 線形ボリューム（既定 `1.0`）。未知の `volumeKind` またはコンテキストが NULL なら `-1`。

</details>

<details>
<summary><code>st_rt_source_set_audio_file</code> — オーディオファイルを開いてソースの入力としてアタッチする</summary>

```c
int st_rt_source_set_audio_file(STRT_Context* context, STSourceId source, const char* audioPath, int loop);
```

**用途** — エンジンがファイルを直接開いてデコードし、ソース入力として使います。ホストが PCM を扱わなくて済む、最も簡単な入力方式です。

**呼び出し方** — ソースを作った後に呼び、アタッチ直後は停止状態なので `st_rt_source_play` から音が出ます。チャンネルはモノラルにミックスされ（ステレオ = 1/√2·L + 1/√2·R）、エンジンのレート 44.1 kHz に変換されます。同じソースにホストストリームがアタッチされていれば、ファイル入力がストリームを置き換えます（以降の `st_rt_source_write_stream` は `0`）。繰り返し回数は後から `st_rt_source_set_loop_count` で変更できます。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control, blocking]` — ファイルのオープンとデコーダーの作成を行うため、ゲームループ・オーディオスレッドからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `audioPath` | ファイルパス、**UTF-8**（Windows でも — 非 ASCII 文字を含むパスも可）。対応: WAV（PCM・float・ADPCM・µ-law・A-law、RF64・W64）、FLAC、MP3、Ogg Vorbis。Ogg Opus・AAC/M4A・ALAC・WMA は開けずに失敗します |
| `loop` | `0` = 1 回再生 / それ以外 = 無限ループ |

**戻り値** — `1` = 入力をアタッチした / `0` = 失敗（パスが NULL、開けないファイル・未対応のフォーマット、存在しないソース、スピーカーセットのメンバーなど）。

</details>

<details>
<summary><code>st_rt_source_set_audio_asset</code> — ホストのアセットシステムのエンコード済みファイルをストリーミング入力としてアタッチする</summary>

```c
int st_rt_source_set_audio_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io, int repeatCount);
```

**用途** — ゲームエンジンのパックファイル・仮想ファイルシステムのように OS のパスで開けないオーディオを、ホストのコールバックで読ませます。`st_rt_source_set_audio_file` と同じデコーダー（WAV/FLAC/MP3/Vorbis）を使い、ファイル全体を先読みせずにシーク可能なストリームとしてデコードします。

**呼び出し方** — 再生の規約は `st_rt_source_set_audio_file` と同じです（アタッチ直後は停止、`st_rt_source_play` で開始）。コールバック表はコピーされますが、`userData` とホストのアセットシステムは入力がアタッチされている間生きている必要があります。`open`/`close` は制御スレッドから、`read`/`seek` はこの呼び出し中のプローブ処理と単一のデコーダーワーカースレッドから呼ばれます。コールバックは例外を投げたり、エンジン API を再度呼んだりしてはいけません。`close` は成功した `open` ごとに一度呼ばれます（デコーダー初期化の失敗を含む）。異なるコンテキストは同時にデコードできます。アタッチに失敗すると以前の入力が維持されます。サポート有無は `ST_CAP_AUDIO_ASSET_IO` で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control, blocking]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `assetName` | `io->open` にそのまま渡すアセット名 |
| `io` | `STAudioAssetIO` のコールバック表。呼び出し側が `structSize = sizeof(STAudioAssetIO)`、`apiVersion = ST_ABI_VERSION` を設定し、`reserved` は 0 |
| `repeatCount` | 追加の繰り返し回数 — `0` = 1 回 / `-1` = 無限 / 正の N = さらに N 回 |

**構造体** `STAudioAssetIO`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STAudioAssetIO)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `userData` | すべてのコールバックの第 1 引数として渡されるホストのポインター |
| `open` | `void* open(void* userData, const char* assetName)` — アセットを開いてハンドルを返します |
| `read` | `uint64_t read(void* userData, void* handle, void* output, uint64_t bytes)` — 読み取ったバイト数を返します（`0` = EOF、要求より大きくてはならない） |
| `seek` | `int seek(void* userData, void* handle, int64_t offset, int origin)` — `origin` `0` = 先頭基準 / `1` = 現在位置基準。`1` = 成功 / `0` = エラー |
| `close` | `void close(void* userData, void* handle)` — ハンドルを閉じます |
| `reserved[2]` | 0 |

**戻り値** — `1` = 入力をアタッチした / `0` = 失敗（以前の入力を維持）。

</details>

<details>
<summary><code>st_rt_source_set_audio_clip</code> — 短いファイルを丸ごとデコードしてキャッシュクリップとしてアタッチする</summary>

```c
int st_rt_source_set_audio_clip(STRT_Context* context, STSourceId source, const char* audioPath);
```

**用途** — 短い音を一度だけ 44.1 kHz モノラル PCM にすべてデコードし、ソースにキャッシュします。同じ音を繰り返し鳴らすときに、ソースを作り直したり再デコードしたりせず、生きているソースで `st_rt_source_trigger`（1 回ずつ）または `st_rt_source_set_retrigger_interval`（一定間隔）で再開始するための入力です。

**呼び出し方** — フォーマット・ダウンミックスは `st_rt_source_set_audio_file` と同じで、デコード後の長さは最大 60 秒です。アタッチに失敗すると以前の入力が維持されます。成功するとクリップは一時停止状態で始まり、再開始間隔 `0`、EOF 繰り返し回数 `0` になり、ソースのボリューム・ピッチはそのまま維持されます。サポート有無は `ST_CAP_SOURCE_RETRIGGER` で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control, blocking]` — ファイル全体をデコードするため、ゲームループ・オーディオスレッドからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `audioPath` | ファイルパス（UTF-8）。対応フォーマットは `st_rt_source_set_audio_file` の項目を参照 |

**戻り値** — `1` = クリップをアタッチした / `0` = 失敗（以前の入力を維持）。

</details>

<details>
<summary><code>st_rt_source_set_audio_clip_asset</code> — ホストのアセットを丸ごとデコードしてキャッシュクリップとしてアタッチする</summary>

```c
int st_rt_source_set_audio_clip_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io);
```

**用途** — `st_rt_source_set_audio_clip` のアセット版です。ホストのコールバック（`STAudioAssetIO`）で読んだエンコード済みデータを 44.1 kHz モノラル PCM にすべてデコードしてキャッシュします。

**呼び出し方** — 動作・制約（最大 60 秒、一時停止で開始、間隔 `0`・EOF 繰り返し `0`、ボリューム・ピッチ維持、失敗時は以前の入力を維持）は `st_rt_source_set_audio_clip` と同じです。キャッシュクリップなので、コールバックはこの呼び出しの中ですべて呼ばれて閉じられます — `userData` はこの関数が戻るまで有効であれば十分です。サポート有無は `ST_CAP_SOURCE_RETRIGGER` と `ST_CAP_AUDIO_ASSET_IO` で確認します。スレッド: `[control, blocking]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `assetName` | `io->open` に渡すアセット名 |
| `io` | `STAudioAssetIO` のコールバック表（呼び出し側が `structSize`/`apiVersion` を設定）。フィールドは `st_rt_source_set_audio_asset` の項目を参照 |

**戻り値** — `1` = クリップをアタッチした / `0` = 失敗（以前の入力を維持）。

</details>

<details>
<summary><code>st_rt_source_set_retrigger_interval</code> — キャッシュクリップを一定間隔で再開始させる</summary>

```c
int st_rt_source_set_retrigger_interval(STRT_Context* context, STSourceId source, double seconds);
```

**用途** — 同じキャッシュクリップを、開始から開始までの間隔 `seconds` ごとに出力時刻基準で再開始します。制御スレッドの呼び出しタイミングに揺さぶられない、規則的な繰り返し音が必要なときに使います。再開始しても音響経路・遅延・残響の状態は維持されます。

**呼び出し方** — `st_rt_source_set_audio_clip`/`_clip_asset` でアタッチしたキャッシュクリップにのみ使えます。間隔は最も近い 44.1 kHz の出力サンプルに丸められ、ピッチは間隔を変えません。変更は次の入力読み取り境界で適用され、新しい間隔ひとつを完全に開始します。EOF の後に有効にするとクリップが再開始されます。同じ（量子化された）間隔を再設定しても、進行中のクロックはそのままです。`0` を与えると以降の再開始を取り消し、今鳴っているショットは最後まで出します。`st_rt_source_play` が開始・再開、`st_rt_source_pause` がクロックを止め、`st_rt_source_stop` は一時停止・巻き戻しを行いますが間隔設定は維持します。EOF 繰り返し（`st_rt_source_set_loop_count`）と正の間隔は併用できません。再開始時のカーソルリセットは 3 ms の切り替えでつながり、終わっていない前のショットはミックスされずに置き換えられます。サポート有無は `ST_CAP_SOURCE_RETRIGGER` で確認します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id（キャッシュクリップがアタッチされたソース） |
| `seconds` | 開始から開始までの間隔（秒）。正の範囲は出力 1 サンプル 〜 3600 s。`0` = 無効（既定） |

**戻り値** — `1` = 成功 / `0` = 失敗（不正な値、存在しないソース、キャッシュクリップでない入力など）。

</details>

<details>
<summary><code>st_rt_source_get_retrigger_interval</code> — キャッシュクリップの再開始間隔を読む</summary>

```c
double st_rt_source_get_retrigger_interval(STRT_Context* context, STSourceId source);
```

**用途** — `st_rt_source_set_retrigger_interval` で設定した間隔を、量子化された実効値（秒）で返します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — 量子化された間隔（秒）。`0` = 無効 / `-1` = ソースがない、またはキャッシュクリップではない。

</details>

<details>
<summary><code>st_rt_source_trigger</code> — キャッシュクリップを先頭から 1 回鳴らすよう要求する</summary>

```c
int st_rt_source_trigger(STRT_Context* context, STSourceId source);
```

**用途** — 生きているソースのキャッシュクリップを、外部イベント 1 回に合わせて先頭から再開始します。デコードもソース生成も行わないため、短い音を頻繁に鳴らすときにソースを作り直す代わりに使います。再開始しても音響遅延・反射・残響の履歴はそのまま続きます。

**呼び出し方** — キャッシュクリップがアタッチされ、再開始間隔 `0`、EOF 繰り返し回数 `0` である必要があります。別途 `st_rt_source_play` は不要です。要求はコンテキストの初期音場が消費された後の次のエンジンブロックで開始され、それまでに複数回要求すると 1 回にまとめられます。`st_rt_source_pause`/`st_rt_source_stop`、成功した `st_rt_source_seek`、間隔・繰り返し設定の変更は、待機中の要求を取り消します。レンダリングされるよう、ソースは有効な状態（`st_rt_source_set_enabled`）に保ってください。カーソルは入力読み取り境界で 3 ms の切り替えでリセットされ、終わっていない前のショットは置き換えられます。`1` はキューに入ったという意味で、デバイスですでに再生されたという意味ではありません。サポート有無は `ST_CAP_SOURCE_TRIGGER` で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id（キャッシュクリップがアタッチされたソース） |

**戻り値** — `1` = キューに入れた / `0` = 拒否（キャッシュクリップでない、間隔・繰り返しが 0 でない、存在しないソースなど）。

</details>

<details>
<summary><code>st_rt_source_seek</code> — ファイル入力の再生位置を移動する</summary>

```c
int st_rt_source_seek(STRT_Context* context, STSourceId source, double seconds);
```

**用途** — ファイル・アセット・クリップ入力の再生カーソルを、ソース時間基準の `seconds` に移動します。

**呼び出し方** — 位置は元ファイルのフレーム単位で切り捨てられ、再生/一時停止の状態は維持されます。デコーダー・ピッチの先読みを破棄し、設定された繰り返し回数を改めて満たします。圧縮フォーマットのシーク精度はコーデックによって制限されます。ホストストリーム（ライブ PCM）はホストがタイムラインを所有するため拒否されます。現在位置は `st_rt_source_get_position_seconds` で読みます（秒単位、`hostSampleRate`・ピッチとは無関係）。成功したシークは待機中の `st_rt_source_trigger` 要求を取り消します。サポート有無は `ST_CAP_SOURCE_PLAYBACK_CONTROL` で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control, blocking]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `seconds` | ソース時間の位置（秒）。有限かつ `0` 以上 |

**戻り値** — `1` = 成功 / `0` = 失敗（不正な値、存在しないソース、ファイル入力でないなど）。

</details>

<details>
<summary><code>st_rt_source_set_loop_count</code> — ファイル入力の繰り返し回数を決める</summary>

```c
int st_rt_source_set_loop_count(STRT_Context* context, STSourceId source, int repeatCount);
```

**用途** — ファイル・アセット・クリップ入力が終端に達したとき、先頭に戻って何回追加で再生するかを決めます。

**呼び出し方** — 現在のカーソル位置から繰り返しの予算を改めて満たします。`st_rt_source_stop` は巻き戻しとともにこの予算を復元します。ホストストリーム（ライブ PCM）は拒否されます。キャッシュクリップでは正の再開始間隔（`st_rt_source_set_retrigger_interval`）と併用できず、繰り返し設定を変更すると待機中の `st_rt_source_trigger` 要求が取り消されます（トリガーは繰り返し回数 `0` を要求します）。サポート有無は `ST_CAP_SOURCE_PLAYBACK_CONTROL` で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control, blocking]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `repeatCount` | 追加の繰り返し回数 — `0` = 1 回 / `-1` = 無限 / 正の N = さらに N 回。`-1` 未満は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗（不正な値、存在しないソース、ファイル入力でないなど）。

</details>

<details>
<summary><code>st_rt_source_get_loop_count</code> — ファイル入力の繰り返し回数を読む</summary>

```c
int st_rt_source_get_loop_count(STRT_Context* context, STSourceId source);
```

**用途** — 設定された追加の繰り返し回数を返します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — 繰り返し回数（`0` 以上）。`-1` = 無限 / `-2` = ソースがない、または未対応の入力。

</details>

<details>
<summary><code>st_rt_source_set_volume</code> — ソース入力のボリュームを決める</summary>

```c
int st_rt_source_set_volume(STRT_Context* context, STSourceId source, float volume);
```

**用途** — ソースの入力信号に線形の圧力ゲインをかけます。音響経路・DSP 処理の **前** にかかるため、そのソースのすべての経路（直接・反射・回折・残響の送出）が一緒に変わります。

**呼び出し方** — オーディオ入力がアタッチされたソースに、いつでも、再生中でも呼べます。変更した値は 3 ms のランプで移行します。経路種別ごとの比率は `st_rt_source_set_path_volume` で別に決めます。サポート有無は `ST_CAP_SOURCE_PLAYBACK_CONTROL` で確認します。スピーカーセットのメンバーソースでは拒否されます（メンバーのレベルはスピーカーセット API が決めます）。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `volume` | 線形の圧力ゲイン、`[0, 16]`、既定 `1`。範囲外・非有限の値は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗（範囲外の値、存在しないソース、またはオーディオ入力がないなど）。

</details>

<details>
<summary><code>st_rt_source_get_volume</code> — ソース入力のボリュームを読む</summary>

```c
float st_rt_source_get_volume(STRT_Context* context, STSourceId source);
```

**用途** — `st_rt_source_set_volume` で決めた線形ボリュームを返します。ランプ中ならランプの目標値です。

**呼び出し方** — いつでも呼べ、スピーカーセットのメンバーソースにも使えます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — 線形ボリューム（既定 `1`）。`-1` = ソースなし。

</details>

<details>
<summary><code>st_rt_source_set_pitch</code> — ソース入力の再生速度（ピッチ）を決める</summary>

```c
int st_rt_source_set_pitch(STRT_Context* context, STSourceId source, float ratio);
```

**用途** — 入力を再生速度の比率で速く/遅く読み、ピッチを変えます。タイムストレッチは行わないため、ファイルの再生長やホストストリームのリングの消費速度も一緒に変わります。

**呼び出し方** — オーディオ入力がアタッチされたソースにいつでも呼べます。ホストがすでに独自にピッチを変えた信号を入れる場合は、二重にかからないようにしてください。1 以外の比率は帯域制限 sinc 補間を使い、最大 67 フレームの先読みが生じます。キャッシュクリップの再開始間隔はピッチの影響を受けません。サポート有無は `ST_CAP_SOURCE_PLAYBACK_CONTROL` で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control]` — フィルター係数を作るため、オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `ratio` | 再生速度の比率、`[0.25, 4]`、既定 `1`。範囲外・非有限の値は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗（範囲外の値、存在しないソース、またはオーディオ入力がないなど）。

</details>

<details>
<summary><code>st_rt_source_get_pitch</code> — ソース入力の再生速度の比率を読む</summary>

```c
float st_rt_source_get_pitch(STRT_Context* context, STSourceId source);
```

**用途** — `st_rt_source_set_pitch` で決めた再生速度の比率を返します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — 再生速度の比率（既定 `1`）。`-1` = ソースなし。

</details>

<details>
<summary><code>st_rt_source_attach_stream</code> — ホストが PCM を送り込むストリーム入力をソースにアタッチする</summary>

```c
int st_rt_source_attach_stream(STRT_Context* context, STSourceId source, const STStreamDesc* desc);
```

**用途** — ボイスチャット・合成音・外部ミドルウェアの出力のように、ホストがリアルタイムに生成するモノラル PCM をソース入力として使います。ファイル入力が「エンジンがファイルを開く」なら、こちらは「ホストが PCM を送り込む」です。レンダリングの主導権とオーディオデバイスはエンジンが握ったままで、エンジンのレンダリングスレッドが 512 フレームのブロックを取り込むときにソースごとのリングバッファーから読み出します（ホストプッシュ型のレンダリングではありません）。

**呼び出し方** — ソースを作った後に呼び、続けて `st_rt_source_write_stream` で PCM を供給します。寿命・再生の規約はファイル入力と同じです: アタッチ直後は停止状態で `st_rt_source_play` から音が出て、`st_rt_source_pause`/`st_rt_source_stop` もそのまま効きます（`stop` はリングに溜まったフレームを破棄します — ライブストリームに「先頭への巻き戻し」はありません）。切り離しは `st_rt_source_clear_audio` が行い、`st_rt_source_destroy` もストリームを切り離してスロットを返却します。同じソースにファイル入力をアタッチするとファイルがストリームを置き換え、逆にこの関数はファイル入力を置き換えます。同時にアタッチできるストリームは 64 個で、返却されたスロットは次の attach が再利用します（累積カウンターは attach ごとに 0 から数え直します）。リングの割り当てはこの呼び出しで一度だけ行われます。ストリームでは `st_rt_source_seek`・`st_rt_source_set_loop_count` が拒否されます。サポート有無は `ST_CAP_SOURCE_STREAM_INPUT`（リアルタイム専用）で確認します。スピーカーセットのメンバーソースでは拒否されます。スレッド: `[control]` — シーンの read ロックと再生ミューテックスを取ります。同じソースに対して `st_rt_source_write_stream` と同時に呼ばないでください（異なるソース同士は無関係）。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |
| `desc` | `STStreamDesc`。呼び出し側が `structSize = sizeof(STStreamDesc)`、`apiVersion = ST_ABI_VERSION` を設定します |

**構造体** `STStreamDesc`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STStreamDesc)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `sampleRate` | 入力のサンプルレート。エンジンのレート（`st_rt_get_sample_rate`、44100）である必要があります。ただし `STRT_CreateOptions.hostSampleRate` を指定したコンテキストではその値である必要があり、エンジンがソースごとにホスト→エンジンの変換器をリングの前段にかけます |
| `channels` | `1` のみ許可（モノラル専用） |
| `capacityFrames` | リングのサイズ、**ホストフレーム**（= `sampleRate` 基準）。`0` = 既定 8192 ホストフレーム（エンジンのレートで約 186 ms）、それ以外は `[512, 1048576]`。エンジンはこれをエンジンフレームに換算（四捨五入）したうえで 2 のべき乗に切り上げて確保するため、実際の容量は要求より大きくなります — `STStreamStatus.capacityFrames` で確認してください |
| `reserved[5]` | 0 |

**戻り値** — `1` = 成功 / `0` = 失敗。失敗時の `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH`（`desc` のスタンプ不一致）/ `ST_STATUS_INVALID_ARGUMENT`（`sampleRate` が上記の規則と異なる、`channels ≠ 1`、`capacityFrames` が 0 でも `[512, 1048576]` でもない）/ `ST_STATUS_NOT_FOUND`（ソースなし）/ `ST_STATUS_UNAVAILABLE`（同時ストリームスロット 64 個を使い切った）。

</details>

<details>
<summary><code>st_rt_source_write_stream</code> — ストリーム入力のリングにモノラル PCM を書き込む</summary>

```c
int st_rt_source_write_stream(STRT_Context* context, STSourceId source, const float* mono, int frames);
```

**用途** — `st_rt_source_attach_stream` でアタッチしたソースのリングバッファーにモノラル float PCM を入れます。ブロッキングせず、ロックも割り当ても行わないため、ホストのオーディオスレッドから直接呼べます。

**呼び出し方** — ソースごとに **単一のプロデューサー** を前提として、レンダリングスレッドと SPSC でやり取りします — ひとつのソースにはひとつのスレッドだけが書き込んでください。同じソースに対して `st_rt_source_attach_stream`/`st_rt_source_clear_audio` と同時に呼ばないでください（異なるソース同士は無関係）。失敗しても診断バッファー（`st_rt_get_last_status`）には触れず、`0` でのみ知らせます。非有限のサンプル（NaN/Inf）は検査しないため、有限性の保証はホストの責任です。戻り値の意味は `hostSampleRate` を指定したかどうかで異なるので、以下を区別して読んでください。スレッド: `[any]` — どのスレッドから呼んでもよく、ブロックしません。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | ストリームがアタッチされたソースの id |
| `mono` | モノラル float PCM バッファー（`frames` 個） |
| `frames` | 書き込むフレーム数、**ホストフレーム**（`STStreamDesc.sampleRate` 基準） |

**戻り値** — 書き込んだフレーム数。ストリームがアタッチされていない、または切り離された後なら `0`。

- `hostSampleRate == 0`（変換なし）: 実際にリングに入ったフレーム数（`0`…`frames`）。リングが満杯なら残りは破棄され、`droppedFrames` に累積されます。戻り値が `frames` より小さければ残りを次の呼び出しで再送してよいため、バックプレッシャーの信号として使えます。
- `hostSampleRate ≠ 0`（リサンプル経路）: 常に `frames`。変換器が入力をすべて消費するため、同じフレームを再送してはいけません（信号が重複します）。あふれて破棄された分は `droppedFrames` でのみ報告され、戻り値にはバックプレッシャーの信号がありません — `st_rt_source_get_stream_status` の `queuedFrames`/`capacityFrames` を見て供給量を調整してください（例: `queuedFrames` が容量の 3/4 を超えたら送る量を減らす）。

</details>

<details>
<summary><code>st_rt_source_get_stream_status</code> — ストリーム入力リングの残量・アンダーラン・ドロップの統計を読む</summary>

```c
int st_rt_source_get_stream_status(const STRT_Context* context, STSourceId source, STStreamStatus* outStatus);
```

**用途** — ストリームリングに溜まっている量と、累積のアンダーラン・ドロップ・書き込み量を返します。リサンプル経路（`hostSampleRate ≠ 0`）では `st_rt_source_write_stream` の戻り値にバックプレッシャーの信号がないため、`queuedFrames` と `capacityFrames` の比が唯一の供給調整の信号です。

**呼び出し方** — 正常経路は atomic の読み取りだけなので、オーディオスレッドを含むどのスレッドからでも呼べます。ただし、スタンプが誤っている、またはストリームがないエラー経路はコンテキストの診断バッファーに書き込み、この書き込みはスレッド間で直列化されません — 引数を正しく設定すれば到達しません。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | ストリームがアタッチされたソースの id |
| `outStatus` | `STStreamStatus` の出力。呼び出し側が `structSize = sizeof(STStreamStatus)`、`apiVersion = ST_ABI_VERSION` を設定します |

**構造体** `STStreamStatus`

フレームのフィールド 5 つはすべて **ホストフレーム**（`STStreamDesc.sampleRate` = `hostSampleRate`、指定しなければ 44100 基準）です。換算は照会時に一度だけ四捨五入するため、誤差は累積しません。48 kHz のホストでは `capacityFrames` が 2 のべき乗にならないため（例: エンジン 8192 → ホスト 8916）、リングのサイズを 2 のべき乗と仮定しないでください。累積カウンター 3 つは attach 時点からの合計で、再度 attach すると 0 から数えます。

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STStreamStatus)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `queuedFrames` | 現在リングに溜まっているフレーム |
| `capacityFrames` | エンジンが実際に確保したリング容量 |
| `underrunFrames` | 累計: リングが空で無音で埋めたフレーム |
| `droppedFrames` | 累計: リングが満杯で破棄したフレーム |
| `totalWrittenFrames` | 累計: 実際にリングに入ったフレーム |
| `reserved[6]` | 予約 |

**戻り値** — `1` = 成功 / `0` = 失敗。失敗時の `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH`（スタンプ不一致）/ `ST_STATUS_NOT_FOUND`（ストリームがアタッチされていない）。`outStatus` やコンテキストが NULL でも `0`。

</details>

<details>
<summary><code>st_rt_source_play</code> — ソース入力の再生を開始または再開する</summary>

```c
void st_rt_source_play(STRT_Context* context, STSourceId source);
```

**用途** — ファイル・アセット・クリップ・ストリーム入力の再生を開始します。入力をアタッチした直後は停止状態なので、音を出すにはこの関数を呼ぶ必要があります。

**呼び出し方** — オーディオ入力をアタッチした後に呼びます。実際の音はそのソースの最初の IR がレンダラーに届いてから出ます。一時停止状態ならその位置から再開し、キャッシュクリップの再開始間隔のクロックも開始・再開します。`st_rt_source_trigger` だけで鳴らすクリップには不要です。スピーカーセットのメンバーソースでは無視されます。スレッド: `[control]` — 再生ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_pause</code> — ソース入力の再生を一時停止する</summary>

```c
void st_rt_source_pause(STRT_Context* context, STSourceId source);
```

**用途** — 現在のカーソル位置を保ったまま再生を止めます。`st_rt_source_play` で同じ位置から再開します。

**呼び出し方** — カーソルは即座に止まり、出力は最後の波形の終端を 3 ms のランプで 0 まで下げ、クリックなしで途切れます。すでに部屋に広がった残響は鳴り続けることがあります。キャッシュクリップの再開始クロックも止まり、待機中の `st_rt_source_trigger` 要求は取り消されます。スピーカーセットのメンバーソースでは無視されます。スレッド: `[control]` — 再生ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_source_stop</code> — ソース入力の再生を止めて先頭に戻す</summary>

```c
void st_rt_source_stop(STRT_Context* context, STSourceId source);
```

**用途** — 再生を止め、カーソルを先頭に巻き戻します。次の `st_rt_source_play` は先頭から再生します。

**呼び出し方** — 出力は `st_rt_source_pause` と同様に 3 ms のランプで途切れ、すでに部屋に広がった残響は鳴り続けることがあります。ファイル入力は巻き戻しとともに設定された繰り返し回数を復元します。キャッシュクリップは再開始間隔の設定を維持し、待機中の `st_rt_source_trigger` 要求は取り消されます。ホストストリームは巻き戻す先頭がないため、リングに溜まったフレームを破棄します。スピーカーセットのメンバーソースでは無視されます。スレッド: `[control]` — 再生ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | リアルタイムコンテキストハンドル |
| `source` | 対象ソースの id |

**戻り値** — なし。

</details>

</details>

<details>
<summary><strong>リスナー · 伝搬 · 音響ポリシー</strong> — 27 個</summary>

<details>
<summary><code>st_rt_listener_set_position</code> — リスナーの位置を設定する</summary>

```c
void st_rt_listener_set_position(STRT_Context* context, float x, float y, float z);
```

**用途** — リスナー（聴取者）のワールド位置を変更します。すべてのソースの直接音・反射・回折・残響の経路が、この位置を終点として計算されます。

**呼び出し方** — ゲームループでカメラやプレイヤーの頭の位置が変わるたびに呼びます。向きは `st_rt_listener_set_rotation` / `st_rt_listener_set_rotation_ypr` / `st_rt_listener_set_orientation_q` で別に与え、位置を変えても向きは維持されます。座標は **シーン単位のまま** 入れます（`STRT_CreateOptions.sceneRatio` によるメートル変換はエンジンが行います）。スレッド: `[control]` — 制御スレッドから呼び、オーディオコールバックからは呼ばないでください。`ST_RT_SCHEDULER_PIPELINED` ではシーンを直接ロックせずモーションキューに入れて戻り、伝搬ワーカーが次のサイクルで最新の値を反映します。`ST_RT_SCHEDULER_SYNCHRONOUS` では次の `st_rt_propagate` が新しい位置を参照します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `x` | ワールド X 座標（シーン単位、+X = right） |
| `y` | ワールド Y 座標（シーン単位、+Y = up） |
| `z` | ワールド Z 座標（シーン単位、+Z = forward） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_listener_set_velocity</code> — リスナーの速度を設定する（ドップラー用）</summary>

```c
void st_rt_listener_set_velocity(STRT_Context* context, float x, float y, float z);
```

**用途** — リスナーの移動速度ベクトルを知らせます。エンジンはソース・リスナーの速度から経路ごとのドップラースロープを計算します。

**呼び出し方** — 位置とともに毎フレーム更新するのが一般的です。速度は **シーン単位/秒** で入れ、エンジンが `sceneRatio` を掛けて m/s に変換したうえで音速で割ります。静止したリスナーは `(0, 0, 0)` です。ドップラーのピッチレンダリング自体は `STRenderOptions.useDoppler`、動くソースの放射ゲインは `st_rt_set_doppler_gain_mode` が受け持ちます。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。`PIPELINED` ではモーションキューに入り、次の伝搬サイクルで反映されます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `x` | 速度の X 成分（シーン単位/秒） |
| `y` | 速度の Y 成分（シーン単位/秒） |
| `z` | 速度の Z 成分（シーン単位/秒） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_listener_set_rotation</code> — リスナーの向きを yaw・pitch（ラジアン）で設定する</summary>

```c
void st_rt_listener_set_rotation(STRT_Context* context, float yaw, float pitch);
```

**用途** — リスナーの頭の向きを yaw・pitch で決めます。空間化（パンニング・HRTF・スピーカーデコーディング）の方位角・仰角は、この向きを基準に計算されます。roll（頭の傾き）は表現しません。

**呼び出し方** — カメラの回転が変わるたびに呼びます。角度は **ラジアン** です。回転行列は `R = Ry(yaw)·Rx(pitch)` で、`yaw = 0, pitch = 0` なら forward = +Z、up = +Y、right = +X（恒等）です。**yaw が正 = 右に回る**（上から見下ろして時計回り）、**pitch が正 = 下を向く**。方向ベクトル `d` から逆に求めるには `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);` を使います。エンジンの座標系は Unity と同じなので Unity のホストは変換なしで入れればよく、forward を −Z とするホスト（OpenGL 式のカメラ）は Z を反転するか yaw に 180 度を足して入れる必要があります。リスナーの向きの setter 3 つ（`st_rt_listener_set_rotation`、`st_rt_listener_set_rotation_ypr`、`st_rt_listener_set_orientation_q`）は同じ向きの値を上書きし、**最後に呼んだものが優先** されます。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。`PIPELINED` ではモーションキューに入ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `yaw` | +Y 軸回りの回転（ラジアン）。正 = 右に回る |
| `pitch` | +X 軸回りの回転（ラジアン）。正 = 下を向く |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_listener_set_orientation_q</code> — リスナーの向きをクォータニオン（XYZW）で設定する（roll を含む）</summary>

```c
int st_rt_listener_set_orientation_q(STRT_Context* context, const float quatXYZW[4]);
```

**用途** — リスナーの向きをローカル→ワールドの単位クォータニオンで与えます。yaw・pitch では表現できない roll（頭の傾き）まで含められるため、VR のヘッドトラッキングのようにホストがすでにクォータニオンを持っている場合にそのまま渡せます。

**呼び出し方** — ローカル軸は forward = +Z · up = +Y · right = +X です。成分の順序は **XYZW** で、正規化はエンジンが行うためホストが事前に正規化する必要はありません。検証は `st_rt_source_set_orientation_q` と同じです。`st_rt_listener_set_rotation(yaw, pitch)` は `q = q_y(yaw) · q_x(pitch)` である roll 0 の場合と同じです。リスナーの向きの setter 3 つは **最後に呼んだものが優先** されます。サポート有無は `st_rt_get_capability_word(1)` の `ST_CAP1_LISTENER_ORIENTATION_Q` ビットで確認します。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。`PIPELINED` ではモーションキューに入ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `quatXYZW` | ローカル→ワールドの回転クォータニオン `[x, y, z, w]`。非有限の成分がある、またはノルムが退化（`norm < 1e-12`）していれば拒否 |

**戻り値** — `1` = 適用 / `0` = 失敗。非有限・退化したクォータニオンなら何も変更せず、`st_rt_get_last_status` に `ST_STATUS_INVALID_ARGUMENT` を残します。

</details>

<details>
<summary><code>st_rt_listener_set_rotation_ypr</code> — リスナーの向きを yaw・pitch・roll（ラジアン）で設定する</summary>

```c
int st_rt_listener_set_rotation_ypr(STRT_Context* context, float yaw, float pitch, float roll);
```

**用途** — `st_rt_listener_set_rotation` に roll を加えたオイラー角版です。頭の傾きをオイラー角で扱うホスト向けです。

**呼び出し方** — 回転行列は `R = Ry(yaw)·Rx(pitch)·Rz(roll)` で、Unity の `Quaternion.Euler(pitch, yaw, roll)`（度をラジアンに変換した値）と同じ順序です。yaw・pitch の意味は `st_rt_listener_set_rotation` と同じで（yaw が正 = 右に回る、pitch が正 = 下を向く）、**roll が正 = right 軸が上に傾く**（頭が左に傾き、右耳が上がる）。`roll = 0` なら `st_rt_listener_set_rotation(yaw, pitch)` と同じ行列です。リスナーの向きの setter 3 つは **最後に呼んだものが優先** されます。サポート有無は `ST_CAP1_LISTENER_ORIENTATION_Q`（能力ワード 1）で確認します。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。`PIPELINED` ではモーションキューに入ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `yaw` | +Y 軸回りの回転（ラジアン）。正 = 右に回る |
| `pitch` | +X 軸回りの回転（ラジアン）。正 = 下を向く |
| `roll` | +Z 軸回りの回転（ラジアン）。正 = right 軸が上に（頭が左に傾く） |

**戻り値** — `1` = 適用 / `0` = 失敗。非有限の値があれば何も変更せず、`ST_STATUS_INVALID_ARGUMENT` を残します。

</details>

<details>
<summary><code>st_rt_set_path_type_enabled</code> — 経路種別ごとの伝搬をグローバルに有効/無効にする</summary>

```c
void st_rt_set_path_type_enabled(STRT_Context* context, int pathType, int enabled);
```

**用途** — 直接音・透過・反射・回折・残響のうち特定の種類の経路を、エンジン全体で計算しないようにします。どの成分が音にどれだけ寄与しているかをひとつずつ切り分けて聴いたり、不要な種類を外してコストを下げるときに使います。

**呼び出し方** — 既定値は 5 種すべて有効です。伝搬段階のゲートなので、無効にした種類は経路そのものが作られません（レンダリング段階のゲートである `STRenderOptions.render*` とは異なります）。ソースひとつだけに適用するなら `st_rt_source_set_path_enabled` を使います。`st_rt_set_acoustic_feature_enabled` と組み合わせると「サウンドトレーシング無効」の基準線を設定だけで作れます — 反射・回折・残響を無効にし、音響機能 3 つをすべて無効にすると、距離減衰とパンニングだけが残ります。スレッド: `[control]` — シーンの write ロックを取るため、ワーカーと短時間競合することがあります。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb。範囲外の値は無視 |
| `enabled` | `0` = 無効、それ以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_set_acoustic_feature_enabled</code> — 空気吸収・伝搬遅延・直接音の遮蔽を個別に有効/無効にする</summary>

```c
int st_rt_set_acoustic_feature_enabled(STRT_Context* context, int feature, int enabled);
```

**用途** — 個別の音響機能を有効/無効にして、試聴の A/B 比較をできるようにします。経路種別ゲート（`st_rt_set_path_type_enabled`）とともに、「何が音に寄与しているか」をひとつずつ切り分けて聴かせるための手段です。

**呼び出し方** — 既定値は 3 つの機能すべて有効（物理どおり）です。反射・回折・残響の経路を無効にし、3 つの機能をすべて無効にすると、距離減衰とステレオパンニングだけが残る基準線になります。現在の値は `st_rt_is_acoustic_feature_enabled` で読みます。この関数は **IR 再変換を引き起こす** setter です — 呼ぶだけで IR 変換パイプラインが再実行されて新しい IR が発行されるため（`PIPELINED` はワーカーを起こす）、値が変わるときだけ呼んでください。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`(0) = 大気減衰（高域損失）/ `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`(1) = 経路長に基づく伝搬遅延 / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`(2) = 直接音の遮蔽（可視性検査） |
| `enabled` | `0` = 無効、それ以外 = 有効 |

**戻り値** — `1` = 適用 / `0` = `feature` が範囲外、または失敗。

</details>

<details>
<summary><code>st_rt_set_late_coupling</code> — リスナーとソースの拡散音場の結合に応じた残響減衰を詳細設定する</summary>

```c
int st_rt_set_late_coupling(STRT_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**用途** — リスナーがソースの拡散音場にどれだけ結合しているかに応じて、late reverb（FDN）への注入を減衰させます。残響タンクは完全に混ざった単一空間なので、既定ではどこでも同じ大きさで聞こえますが、コの字・ロの字のように角の向こうで分かれた空間で「ソースから離れたのに残響がそのまま、またはむしろ大きくなる」問題を直すためのオプションです。

**呼び出し方** — ほとんどの場合は `st_rt_set_late_coupling_preset` で十分で、細かな調整が必要なときだけこの関数を使います。結合減衰（`floorDb`）・send の平坦化（`sendNormalizeTrim`）・方向サンプル収集（`rainDirectionWalk`）は併用するよう設計されています — 平坦化なしで結合だけを有効にすると、離れるほど残響の注入が大きくなる逆転が残り、方向サンプル収集を無効にすると、分かれた空間の向こう側の残響の方向情報が不足します。個々のパラメータ構成は今後変わる可能性があるため、できるだけプリセットを使ってください。現在の値は `st_rt_get_late_coupling` で読みます。**IR 再変換を引き起こす** setter です（呼ぶと IR が再変換・発行される）。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `floorDb` | 完全遮断時の減衰の深さ（dB、0 以上）。`0` = 結合減衰を無効。既定 `9` |
| `visibleLow` | 可視比率がこの値を下回ると完全遮断とみなし、`floorDb` だけ減衰。`[0, 1)`。`0` → 既定 `0.05` |
| `visibleHigh` | 可視比率がこの値を上回ると同じ空間とみなし、**正確に 0 dB**。`[0, 1]`。`0` → 既定 `0.60` |
| `sendNormalizeTrim` | 残響 send 総和の平坦化トリム（0 以上）。`0` = 平坦化しない。既定 `0.75` |
| `rainDirectionWalk` | `1`（既定）= 残響の方向サンプルを収集し続ける（エネルギーは運ばない）/ `0` = 無効 |

**戻り値** — `1` = 適用 / `0` = 範囲外（非有限・負値、`visibleLow >= 1`、`visibleHigh > 1`）または失敗。失敗すると値は変わりません。

</details>

<details>
<summary><code>st_rt_get_late_coupling</code> — 現在の late 結合減衰の設定を読む</summary>

```c
int st_rt_get_late_coupling(const STRT_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**用途** — `st_rt_set_late_coupling` / `st_rt_set_late_coupling_preset` で設定された現在の値を返します。プリセットが実際にどの値を設定したかを確認したり、UI に表示したりするときに使います。

**呼び出し方** — いつでも呼べます。不要な出力引数は `NULL` を渡せばスキップします。スレッド: `[control]` — ロックなしでエンジン状態を読む照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outFloorDb` | 完全遮断時の減衰の深さ（dB）を受け取るポインター。`NULL` 可 |
| `outVisibleLow` | 完全遮断のニーポイントを受け取るポインター。`NULL` 可 |
| `outVisibleHigh` | 同一空間（0 dB）のニーポイントを受け取るポインター。`NULL` 可 |
| `outSendNormalizeTrim` | send 平坦化トリムを受け取るポインター。`NULL` 可 |
| `outRainDirectionWalk` | 方向サンプル収集の有無（`1`/`0`）を受け取るポインター。`NULL` 可 |

**戻り値** — `1` = 成功（出力ポインターに現在の値を書き込む）/ `0` = コンテキストがない。

</details>

<details>
<summary><code>st_rt_set_late_coupling_preset</code> — late 結合減衰を推奨プリセットで一括設定する</summary>

```c
int st_rt_set_late_coupling_preset(STRT_Context* context, int preset);
```

**用途** — `st_rt_set_late_coupling` の 5 つの値を推奨の組み合わせで一度に設定します。プリセット間で異なるのは減衰の下限の深さだけで、残り（2 つのニーポイント・平坦化トリム・方向サンプル収集）は同じ推奨値です。

**呼び出し方** — エンジンの既定状態は `ST_LATE_COUPLING_DEFAULT` と同じです。どのプリセットでも、リスナーがソースと同じ空間にいれば減衰は正確に 0 dB で、単一の部屋では実質的に差は出ません — 差は角の向こうで分かれた空間でのみ生じるため、選択は聴感の問題です。個別の調整が必要なら `st_rt_set_late_coupling` を使います。**IR 再変換を引き起こす** setter です。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `preset` | `ST_LATE_COUPLING_OFF`(0) = 結合減衰・平坦化・方向サンプル収集をすべて無効 / `ST_LATE_COUPLING_SUBTLE`(1) = 下限 6 dB / `ST_LATE_COUPLING_DEFAULT`(2) = 下限 9 dB（エンジン既定）/ `ST_LATE_COUPLING_STRONG`(3) = 下限 12 dB |

**戻り値** — `1` = 適用 / `0` = `preset` が範囲外、または失敗。

</details>

<details>
<summary><code>st_rt_set_physical_distance_attenuation</code> — 物理的な距離減衰の基準距離・最小距離を設定する</summary>

```c
void st_rt_set_physical_distance_attenuation(STRT_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**用途** — 経路長に応じた距離減衰（球面拡散）の基準点を決めます。エンジンの距離減衰則は物理的な圧力拡散ひとつで、圧力ゲインは `referenceDistanceMeters / max(距離, minDistanceMeters)` です。つまり基準距離でゲイン 1（0 dB）になります。

**呼び出し方** — 既定値は基準距離 1.0 m · 最小距離 1.0 m です（1 m より内側ではそれ以上大きくならない）。`minDistanceMeters` を基準距離より小さくすると近接場ブーストが生じます（例: 基準 1、最小 0.25 → 最大ゲイン 4 倍）。2 つの値は **メートル** で与え、`sceneRatio` は適用されません（比較対象の経路長がすでにメートルに変換されているため）。**IR 再変換を引き起こす** setter です。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `referenceDistanceMeters` | ゲインが 1 になる基準距離（m）。既定 `1.0` |
| `minDistanceMeters` | 距離の下限（m）。これより近くてもこの距離で計算。既定 `1.0` |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_set_atmosphere</code> — 大気条件（温度・湿度・気圧）を設定する</summary>

```c
void st_rt_set_atmosphere(STRT_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**用途** — 空気吸収と音速の計算に使う大気の状態を決めます。音速は固定定数ではなくこの大気の値から導出され、バンドごとの空気吸収（高域損失）は ISO 9613-1 の純音吸収式で計算されます。暑く乾燥した砂漠、寒く湿った屋外のように、環境によって遠距離の高域減衰と遅延が変わることを表現できます。

**呼び出し方** — 既定値は 20.0 °C · 50.0 % RH · 101.325 kPa です。レベルのロードや天候の変化のように値が変わるときだけ呼びます。空気吸収そのものを無効にするなら `st_rt_set_acoustic_feature_enabled(ST_ACOUSTIC_FEATURE_AIR_ABSORPTION, 0)` を使います。**IR 再変換を引き起こす** setter です。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `temperatureC` | 気温（°C）。既定 `20.0` |
| `relativeHumidityPercent` | 相対湿度（%、0〜100）。既定 `50.0` |
| `pressureKPa` | 大気圧（kPa）。既定 `101.325` |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_set_doppler_gain_mode</code> — 動くソースのドップラー放射ゲインのモードを設定する</summary>

```c
int st_rt_set_doppler_gain_mode(STRT_Context* context, int mode);
```

**用途** — ソースが動くとき、進行方向側へは音がより大きく、反対側へはより小さく放射される効果（移動単極子近似）を有効/無効にします。可変遅延によるドップラーの **ピッチ** 変化（`STRenderOptions.useDoppler`）とは別のスイッチです。

**呼び出し方** — 既定値は `ST_DOPPLER_GAIN_MOVING_MONOPOLE` です。静止したソースではゲインが 1 なので影響はなく、IR 変換時に経路ごとに一度計算するため、レンダリングのコストはかかりません。現在の値は `st_rt_get_doppler_gain_mode` で読みます。サポート有無は `ST_CAP_DOPPLER_GAIN_MODE` で確認します。**IR 再変換を引き起こす** setter です（同じ値を再設定しても何もしません）。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) = 放射ゲインなし / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`(1) = 移動単極子近似: 圧力 `D^2`、エネルギー `D^4`、`D = 1/(1 - Mr)`（ソース速度の放射方向のマッハ数 `Mr`）、経路の放射方向ごとに個別に計算 |

**戻り値** — `1` = 適用 / `0` = `mode` が範囲外、または失敗。

</details>

<details>
<summary><code>st_rt_get_doppler_gain_mode</code> — 現在のドップラー放射ゲインのモードを読む</summary>

```c
int st_rt_get_doppler_gain_mode(const STRT_Context* context);
```

**用途** — `st_rt_set_doppler_gain_mode` で設定された現在のモードを返します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]` — ロックなしでエンジン状態を読む照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STDopplerGainMode` の値（`0` = `ST_DOPPLER_GAIN_OFF`、`1` = `ST_DOPPLER_GAIN_MOVING_MONOPOLE`）。

</details>

<details>
<summary><code>st_rt_set_early_late_band_energy_targets</code> — 初期反射・残響のバンドごとのエネルギー倍率を個別に設定する</summary>

```c
int st_rt_set_early_late_band_energy_targets(STRT_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**用途** — 初期（early）成分と残響（late）成分の周波数バンドごとのエネルギーを、互いに独立して調整します。たとえば残響の高域だけを下げる、初期反射の低域だけを上げるといった音色補正を、材質に手を加えずに行えます。

**呼び出し方** — 2 つの配列を **一度に置き換え** ます（片方だけを変えるなら、もう片方に現在の値を入れ直します）。配列は 63、125、250、500、1k、2k、4k、8k、16k Hz の順の 9 個の値で、**energy-domain** の倍率です（`2.0` ≈ +3 dB、`0.5` ≈ −3 dB）。early 配列は個別の経路（exact/early tap）にのみ、late 配列は残響の send・タンクの駆動にのみ適用され、互いに掛け合わされることはありません。既定値はすべて `1.0`（中立）です。サポート有無は `ST_CAP_EARLY_LATE_BAND_ENERGY` で確認します。**IR 再変換を引き起こす** setter です。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `earlyBandEnergy` | 初期成分のバンドごとのエネルギー倍率 9 個。非有限値は `1.0` に、それ以外は `[0, 16]` に正規化。`NULL` 不可 |
| `lateBandEnergy` | 残響成分のバンドごとのエネルギー倍率 9 個。正規化の規則は同じ。`NULL` 不可 |

**戻り値** — `1` = 適用 / `0` = 配列のいずれかが `NULL`、または失敗。

</details>

<details>
<summary><code>st_rt_set_max_depth</code> — 反射・回折経路のグローバル最大次数を設定する</summary>

```c
void st_rt_set_max_depth(STRT_Context* context, int depth);
```

**用途** — 反射・回折経路の探索がたどる境界面との相互作用の最大回数（次数）を、エンジン全体について決めます。値を上げると高次反射まで正確に追跡できる代わりに、伝搬コストが増えます。

**呼び出し方** — 既定値はグローバルで 8 です。ソースごとの深さ（既定 4）は `st_rt_source_set_depth` で別に決めます。通常はシーンを作った後、品質設定の段階で一度呼びます。スレッド: `[control]` — シーンの write ロックを取るため、ワーカーと短時間競合することがあります。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `depth` | 最大次数、`[1, 64]`。既定 `8`。範囲外の値は無視（以前の値を維持） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_set_transmission_max_depth</code> — 直接音・透過経路が通過できる最大面数を設定する</summary>

```c
void st_rt_set_transmission_max_depth(STRT_Context* context, int depth);
```

**用途** — ソース→リスナーの直線が遮られたとき、透過経路がいくつの面まで通過できるかを決めます。何重もの壁を越えてくる音をどこまで計算するかを決める値です。

**呼び出し方** — 既定値は 64 です。`0` なら透過面を通過しません。透過経路そのものを無効にするなら `st_rt_set_path_type_enabled`（Transmission = 1）を使います。スレッド: `[control]` — シーンの write ロックを取ります。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `depth` | 通過可能な最大面数、`[0, 64]`。既定 `64`。範囲外の値は無視（以前の値を維持） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_listener_set_ray_count</code> — リスナーの探索（guide）レイ数を設定する</summary>

```c
void st_rt_listener_set_ray_count(STRT_Context* context, int width, int height);
```

**用途** — リスナーから放つ探索（guide/probe）レイの本数を `width × height` で決めます。このレイが反射・回折経路の候補を見つけるため、増やすと小さな反射面を見逃す確率が下がり、伝搬コストが増えます。

**呼び出し方** — 既定値は 16 × 16（256 本）です。ソース側の輸送レイは `st_rt_source_set_ray_count` で別に決めます。レイの方向分布は `st_rt_listener_set_ray_sampling_method` が決めます。スレッド: `[control]` — シーンの write ロックを取ります。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `width` | グリッドの横方向の数、`[1, 4096]`。既定 `16` |
| `height` | グリッドの縦方向の数、`[1, 4096]`。既定 `16`。どちらかが範囲外なら呼び出し全体を無視 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_listener_set_ray_sampling_method</code> — リスナーの探索レイの方向分布を設定する</summary>

```c
int st_rt_listener_set_ray_sampling_method(STRT_Context* context, int method);
```

**用途** — リスナーの探索レイを球面上にどう分布させるかを選びます。現在選択できる分布は `ST_RAY_SAMPLING_FIBONACCI_SPHERE` ひとつだけで、この関数はその値を明示的に確認・設定する用途で残されています。

**呼び出し方** — 既定値であり唯一受け付ける値が `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) です。フィボナッチ分布は決定的で、シードを使いません。残りの `STRaySamplingMethod` の値は番号の互換性のために列挙型にのみ残っており、拒否されます。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `method` | `STRaySamplingMethod`。`ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) のみ許可。`ST_RAY_SAMPLING_LEGACY_GRID`(0) / `ST_RAY_SAMPLING_EQUAL_AREA_GRID`(2) / `ST_RAY_SAMPLING_SOBOL_SPHERE`(3) / `ST_RAY_SAMPLING_ICOSAHEDRAL`(4) は拒否 |

**戻り値** — `1` = 適用 / `0` = 拒否（状態は変わらず、`ST_STATUS_INVALID_ARGUMENT` を残す）。

</details>

<details>
<summary><code>st_rt_listener_get_ray_sampling_method</code> — リスナーの探索レイの方向分布を読む</summary>

```c
int st_rt_listener_get_ray_sampling_method(const STRT_Context* context);
```

**用途** — 現在のリスナーの探索レイの分布を返します。

**呼び出し方** — いつでも呼べます。選択可能な分布がフィボナッチひとつなので、正常なコンテキストでは常に `ST_RAY_SAMPLING_FIBONACCI_SPHERE` です。スレッド: `[control]` — シーンの read ロックだけを取る照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STRaySamplingMethod` の値（常に `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`）/ `-1` = コンテキストがない。

</details>

<details>
<summary><code>st_rt_set_source_ray_sampling_method</code> — ソースの輸送レイの方向分布を設定する</summary>

```c
int st_rt_set_source_ray_sampling_method(STRT_Context* context, int method);
```

**用途** — ソースから放つ輸送（残響・拡散エネルギー用）レイの球面分布を選びます。リスナー側と同様に、現在選択できる値は `ST_RAY_SAMPLING_FIBONACCI_SPHERE` ひとつだけです。

**呼び出し方** — 既定値であり唯一受け付ける値が `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) です。ソースの輸送レイ数は `st_rt_source_set_ray_count` で決めます。スレッド: `[control]` — オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `method` | `STRaySamplingMethod`。`ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) のみ許可、それ以外の値は拒否 |

**戻り値** — `1` = 適用 / `0` = 拒否（状態は変わらず、`ST_STATUS_INVALID_ARGUMENT` を残す）。

</details>

<details>
<summary><code>st_rt_get_source_ray_sampling_method</code> — ソースの輸送レイの方向分布を読む</summary>

```c
int st_rt_get_source_ray_sampling_method(const STRT_Context* context);
```

**用途** — 現在のソースの輸送レイの分布を返します。

**呼び出し方** — いつでも呼べます。正常なコンテキストでは常に `ST_RAY_SAMPLING_FIBONACCI_SPHERE` です。スレッド: `[control]` — シーンの read ロックだけを取る照会です。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STRaySamplingMethod` の値（常に `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`）/ `-1` = コンテキストがない。

</details>

<details>
<summary><code>st_rt_build</code> — 静的・動的の加速構造をすべてビルドする</summary>

```c
void st_rt_build(STRT_Context* context);
```

**用途** — メッシュ・オブジェクトの配置から、静的 TLAS と動的 TLAS の両方を新たに構築します。伝搬と `st_rt_scene_raycast` はこの加速構造を使うため、シーンを構成した後に必ず一度は呼ぶ必要があります。

**呼び出し方** — メッシュ・オブジェクトを作った後、最初の `st_rt_propagate` の前に呼びます。以降、**静的** オブジェクトの追加・削除・移動など静的な構成が変わったら、再度呼ぶ必要があります — 静的 TLAS は `st_rt_build` までは以前に発行されたものがそのまま使われ、その間の静的な変更は見えません。動的オブジェクト（`isDynamic = 1`）の移動だけを反映するなら、より軽い `st_rt_build_dynamic` を使います。スレッド: `[control, blocking]` — 加速構造全体のビルドなので長い排他区間です。ゲームループの毎フレームの経路やオーディオスレッドからは呼ばず、ロード段階で呼んでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_build_dynamic</code> — 動的オブジェクトの加速構造だけを更新する</summary>

```c
void st_rt_build_dynamic(STRT_Context* context);
```

**用途** — 動的オブジェクト（`isDynamic = 1`）で構成される動的 TLAS だけを更新（refit）します。ドア・エレベーターのように動く幾何があるとき、全体ビルドなしでその変化を伝搬に反映するための軽い経路です。

**呼び出し方** — 動的オブジェクトの変換（`st_rt_object_set_transform` など）を変更した後に呼びます。静的 TLAS には触れないため、静的な構成の変更には `st_rt_build` が必要です。スレッド: `[control]` — シーンの write ロックを取るため、ワーカーと短時間競合することがあります。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_set_lane_update_interval</code> — 伝搬レーンごとの更新周期を設定する</summary>

```c
int st_rt_set_lane_update_interval(STRT_Context* context, int lane, float milliseconds);
```

**用途** — `PIPELINED` スケジューラーで、直接音・反射/回折・残響の 3 つの伝搬レーンをどのくらいの頻度で再計算するかを決めます。CPU 使用量と応答性のバランスをホストが調整するつまみです。反射/回折レーンが伝搬コストの大部分を占めるため、CPU を節約したいならまずこのレーンの周期を上げてください。その代償として初期反射がリスナーの動きに少し遅れて追従しますが、直接音レーンの周期はそのままなので無音や途切れは生じません。

**呼び出し方** — **実行時にいつでも** 呼べます（スレッド属性と違い、`st_rt_create` 前という制約はない）。ワーカーの動作中に変更しても次のサイクルから新しい値で動き、すでに待機に入った期限は維持され、次の実行から新しい値を使います。各レーンは Guide やホストからの新しい要求がなくても独立して繰り返し実行されます。周期の意味はレーンごとに異なります（下表）。`ST_RT_SCHEDULER_SYNCHRONOUS` にはレーンがないため失敗します。サポート有無は `ST_CAP_LANE_UPDATE_INTERVAL` で確認します。スレッド: `[control]` — 値を atomic に保存してワーカーに渡します。オーディオコールバックからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `lane` | `STPropagationLane` — `ST_PROPAGATION_LANE_DIRECT`(0): 連続する実行の **開始** 間の最小間隔、既定 10 ms / `ST_PROPAGATION_LANE_REFLECTION_DIFFRACTION`(1): 連続する 2 回の実行間の最小間隔、既定 0 ms（制限なし）。待機中に届いた要求は期限までひとつにまとめられ、取り残されない / `ST_PROPAGATION_LANE_REVERB`(2): 実行 **完了後** から次の実行までの最小間隔、既定 4 ms |
| `milliseconds` | 最小間隔（ms）、`[0, 60000]`。`0` = 追加の待機なし。負値・NaN・無限大・60000 超は clamp せず拒否 |

**戻り値** — `1` = 適用 / `0` = 拒否。`lane` が範囲外、または `milliseconds` が許容範囲外なら `ST_STATUS_INVALID_ARGUMENT`、`SYNCHRONOUS` スケジューラーなら `ST_STATUS_UNAVAILABLE` を `st_rt_get_last_status` に残します。

</details>

<details>
<summary><code>st_rt_get_lane_update_interval</code> — 伝搬レーンの更新周期を読む</summary>

```c
float st_rt_get_lane_update_interval(const STRT_Context* context, int lane);
```

**用途** — レーンに保存された更新周期を ms 単位で返します。

**呼び出し方** — 最後の `st_rt_set_lane_update_interval` が拒否されていても現在 **保存されている値** を返すため、入れた値が実際に適用されたかを確認するときに使います。スレッド: `[any]` — atomic をひとつ読むだけなので、どのスレッドから呼んでもよく、ブロックしません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `lane` | `STPropagationLane` — `DIRECT`(0) / `REFLECTION_DIFFRACTION`(1) / `REVERB`(2) |

**戻り値** — 保存された周期（ms）。`lane` が範囲外、またはコンテキストがなければ `0`。

</details>

<details>
<summary><code>st_rt_propagate</code> — 伝搬を実行する（SYNCHRONOUS）か、伝搬ワーカーを起こす（PIPELINED）</summary>

```c
int st_rt_propagate(STRT_Context* context);
```

**用途** — 現在のシーン・ソース・リスナーの状態で、音響伝搬と IR 変換を進めます。スケジューラーによって動作が異なります。

**呼び出し方** — `st_rt_build` の後に呼びます。

- `ST_RT_SCHEDULER_SYNCHRONOUS`: 伝搬・IR パイプラインが **呼び出しスレッドで実際に動きます**。ホストがこの関数を呼ばない限り計算が進まないため、ゲームループで周期的に（例: 毎フレーム）呼びます。このスケジューラーでは休止させたソース（`st_rt_source_idle`）も計算されます。
- `ST_RT_SCHEDULER_PIPELINED`（既定）: ワーカーを起こして **即座に戻ります**。レーンはホストの要求がなくても `st_rt_set_lane_update_interval` の周期に従って繰り返し実行されるため、この呼び出しは「変更があるのですぐに動け」という合図です。

スレッド: `[control, runs-here]` — `SYNCHRONOUS` では呼び出しスレッドが伝搬コストをそのまま負担するため、オーディオスレッドからは呼ばないでください。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 伝搬された経路数（`PIPELINED` ではワーカーが直近に出した値）。`PIPELINED` でワーカーのエラーがあれば `-1`、コンテキストがなければ `0`。

</details>

</details>

<details>
<summary><strong>レンダリング · 出力段 · スピーカーセット</strong> — 56 個</summary>

<details>
<summary><code>st_rt_render_set_spatializer</code> — 空間化方式（パンニング / HRIR データセット）を選ぶ</summary>

```c
int st_rt_render_set_spatializer(STRT_Context* context, int type);
```

**用途** — レンダリング経路の空間化の実装を選びます。`PANNING` は HRIR データなしでステレオパンニングにより、`MIT_KEMAR` と `SADIE_D2_KEMAR` は測定 HRIR の畳み込みによりバイノーラル出力を作ります。SADIE II D2 はデータセットの測定 ITD・位相まで含む基準 HRTF です。

**呼び出し方** — HRIR 空間化（1・2）はヘッドホンのバイノーラル出力、つまり `st_rt_render_start(context, 1)` で開始したレンダリングで使われます。通常は `st_rt_render_start` の前に一度選びます。スレッド: `[control, blocking]` — HRIR データセットを読み込む長い区間なので、ゲームループ・オーディオスレッドからは呼びません。サポート有無は `ST_CAP_HRTF`、`ST_CAP_SADIE_D2_HRTF`（能力ワード 0）で確認します。

`PANNING` と `MIT_KEMAR` はライブラリに内蔵されています。`SADIE_D2_KEMAR` には外部ファイル `SADIE_D2_44K_16bit_256tap.hrtfbin`（SDK の `Resources/HRTF/` にライセンス `LICENSE-SADIE-II.txt` とともに同梱）が必要で、エンジンは次の順で探します。

1. 環境変数 `SOUNDTRACING_SADIE_D2_HRTF_PATH`（ファイルパス）
2. 現在の作業フォルダー、3. 実行ファイルのフォルダー、4. このライブラリのフォルダー — それぞれそのフォルダーと上位 8 階層の `Assets/HRTF/`、`SoundTracing/Assets/HRTF/`、`Resources/HRTF/` の下にあるそのファイル

配布では、ライブラリの隣（または上位）に `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin` を置くのが最も簡単です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`（0、既定）/ `ST_SPATIALIZER_MIT_KEMAR`(1) / `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) |

**戻り値** — `1` = 適用 / `0` = 失敗。範囲外の `type` なら `0` です。SADIE D2 のアセットファイルが見つからなければ `0` で、`st_rt_get_last_status` に `ST_STATUS_UNAVAILABLE`（"SADIE D2 HRTF asset not found ..."）が残ります。

</details>

<details>
<summary><code>st_rt_render_get_spatializer</code> — 現在の空間化方式を読む</summary>

```c
int st_rt_render_get_spatializer(const STRT_Context* context);
```

**用途** — `st_rt_render_set_spatializer` で選んだ空間化方式を返します。

**呼び出し方** — いつでも呼べます。スレッド: `[any]` — atomic の読み取りなので、どのスレッドから呼んでもブロックしません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STSpatializerType` の値（`0` PANNING / `1` MIT_KEMAR / `2` SADIE_D2_KEMAR）。既定は `0`。コンテキストが `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_render_set_limiter_type</code> — 出力リミッターの種類を選ぶ</summary>

```c
void st_rt_render_set_limiter_type(STRT_Context* context, int type);
```

**用途** — 最終ミックス（マスターバス）の最終段である出力リミッターのアルゴリズムを選びます。リミッターはステレオ（ヘッドホン・パンニング）とスピーカーレイアウトの両方の出力にかかり、N チャンネル出力ではすべてのチャンネルに同じゲインをかけるチャンネルリンクとして動作します。32 チャンネルを超えるカスタムレイアウトではリミッターを素通しします。

**呼び出し方** — レンダリング中でも変更できます。リミッターの有効/無効はこの関数ではなく `STRenderOptions.useLimiter`（既定 `1`、`st_rt_render_set_options`）です。種類を変えるとリミッターの遅延が変わるため、`st_rt_render_get_limiter_latency_samples` を読み直します。スレッド: `[control]` — レンダリングステージを変更する制御スレッドの呼び出しなので、オーディオコールバックからは呼びません。true-peak 種のサポートは `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER`（能力ワード 1）、ルックアヘッドリミッターは `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`（能力ワード 0）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `type` | `STOutputLimiterType`。`0`・`1`・`2` 以外の値は `LEGACY_ENVELOPE` として扱われます |

**`STOutputLimiterType` の値**

| 値 | 動作 |
|---|---|
| `ST_OUTPUT_LIMITER_LEGACY_ENVELOPE`(0) | ルックアヘッドなし、2 ms attack、−0.2 dBFS のサンプルピーク + ±1 のハードクリップ（参照用）。遅延 0 |
| `ST_OUTPUT_LIMITER_LOOKAHEAD_PEAK`(1) | ルックアヘッドの線形ランプ、−0.2 dBFS のサンプルピーク（参照用）。遅延 = ルックアヘッド |
| `ST_OUTPUT_LIMITER_TRUE_PEAK`（2、既定） | ITU-R BS.1770-5 の 4× true-peak サイドチェーン、上限 −1 dBTP（固定）、ルックアヘッド（= attack）+ hold 10 ms + 自動 release 60→400 ms。出力の true-peak は上限を超えません。遅延 = `max(lookahead, 1) + 5` サンプル（既定 132 → 137、3.1 ms） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_get_limiter_type</code> — 現在の出力リミッターの種類を読む</summary>

```c
int st_rt_render_get_limiter_type(const STRT_Context* context);
```

**用途** — `st_rt_render_set_limiter_type` で設定したリミッターの種類を返します。

**呼び出し方** — スレッド: `[control]` — ロックなしでエンジン状態を読む、制御スレッド用の照会です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STOutputLimiterType` の値（既定 `2` = `TRUE_PEAK`）。コンテキストが `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_render_set_limiter_lookahead_samples</code> — リミッターのルックアヘッド長を設定する</summary>

```c
int st_rt_render_set_limiter_lookahead_samples(STRT_Context* context, int samples);
```

**用途** — `LOOKAHEAD_PEAK`・`TRUE_PEAK` リミッターがピークを先読みする長さ（= attack）をサンプル単位で設定します。長いほどゲイン変化が滑らかになり、短いほど出力遅延が減ります。

**呼び出し方** — ルックアヘッドバッファーを再構成します。変更後は `st_rt_render_get_limiter_latency_samples` で実際の遅延を読み直します。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `samples` | ルックアヘッドのサンプル数（44.1 kHz エンジンサンプル）、`[0, ST_OUTPUT_LIMITER_MAX_LOOKAHEAD_SAMPLES]` = `[0, 511]`。既定 `ST_OUTPUT_LIMITER_DEFAULT_LOOKAHEAD_SAMPLES` = 132（3 ms） |

**戻り値** — `1` = 適用 / `0` = 拒否（範囲外、コンテキストが `NULL`）。

</details>

<details>
<summary><code>st_rt_render_get_limiter_lookahead_samples</code> — リミッターのルックアヘッド長を読み取る</summary>

```c
int st_rt_render_get_limiter_lookahead_samples(const STRT_Context* context);
```

**用途** — 現在のリミッターのルックアヘッドサンプル数を返します。

**呼び出し方** — スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — ルックアヘッドのサンプル数（既定 `132`）。コンテキストが `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_render_get_limiter_latency_samples</code> — リミッターが加える出力遅延を読み取る</summary>

```c
int st_rt_render_get_limiter_latency_samples(const STRT_Context* context);
```

**用途** — 出力リミッターが信号に加える固定遅延をエンジンサンプル単位で返します。映像・入力イベントとの同期補正や、測定時の位置合わせに使います。

**呼び出し方** — リミッターの種類・ルックアヘッド・`useLimiter` を変更した後に読み直します。値は次の規則に従います。

- `useLimiter` = 1 · `TRUE_PEAK`: `max(lookahead, 1) + 5`（既定 137 サンプル、3.1 ms）
- `useLimiter` = 1 · `LOOKAHEAD_PEAK`: `lookahead`
- `useLimiter` = 1 · `LEGACY_ENVELOPE`: 0
- `useLimiter` = 0: 0

スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — リミッター遅延（サンプル）。コンテキストが `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_render_set_master_gain_db</code> — マスター出力ゲインを設定する</summary>

```c
int st_rt_render_set_master_gain_db(STRT_Context* context, float gainDb);
```

**用途** — レンダリング出力段のボリュームです。伝搬・IR の結果を無効化しないため、IR を再計算せずに全体の音量を調整するときに使います。出力 EQ の後・リミッターの前にかかるため、上げた分はリミッターが受け止めます。ステレオ・スピーカーレイアウトなどチャンネル数に関係なく、すべての出力にかかります。

**呼び出し方** — レンダリング中いつでも呼べます。値が変わると 20 ms の線形ランプで移行し、0 dB なら乗算を行いません。等ラウドネス補正の `followMasterGain` が有効なら、補正もこのゲインに追従して再計算されます（`st_rt_render_set_loudness_compensation` を参照）。スレッド: `[control]` — 出力段だけを変更し、オーディオコールバックからは呼びません。対応可否は `ST_CAP1_MASTER_GAIN`（機能ワード 1）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `gainDb` | ゲイン [dB]、`[ST_MASTER_GAIN_MIN_DB, ST_MASTER_GAIN_MAX_DB]` = `[−96, +24]`。既定 0 |

**戻り値** — `1` = 適用 / `0` = 失敗。非有限値・範囲外なら `ST_STATUS_INVALID_ARGUMENT` で、何も変更しません。`ST_BACKEND_EXA` バックエンドのコンテキストは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_master_gain_db</code> — マスター出力ゲインを読み取る</summary>

```c
float st_rt_render_get_master_gain_db(const STRT_Context* context);
```

**用途** — 保存されたマスターゲイン [dB] を返します。

**呼び出し方** — スレッド: `[control]` — オーラライザーの制御ロックを短時間取り、保存値をコピーします。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — マスターゲイン [dB]（既定 `0`）。コンテキストが `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_render_set_loudness_compensation</code> — 等ラウドネス補正（ISO 226）を設定する</summary>

```c
int st_rt_render_set_loudness_compensation(STRT_Context* context, const STLoudnessCompensationDesc* desc);
```

**用途** — 人の耳は、コンテンツがバランスの取れた基準レベルより小さく再生されると低域・超高域が聞こえにくくなります。この段は ISO 226:2003 の等ラウドネス曲線 2 本（基準レベル R、再生レベル P）の形状差を低域シェルフと高域シェルフで近似して補います。P が R より大きい場合は逆に削ります。エンジンは絶対 SPL を知らないため、レベルはホストが phon（1 kHz 純音の dB SPL）で与えます。

**呼び出し方** — 出力段（ステレオ・バイノーラルとスピーカーレイアウトの両方）で、出力 EQ の後、マスターゲイン・リミッターの前に、等ラウドネス補正 → 仮想ベースの順でかかります。伝搬・IR の結果を無効化しません。`st_rt_create` 直後は **有効** で、マスターゲインに追従します（基準 83 → 再生 70 phon、120 Hz で低域約 +7.2 dB、高域 +1.8 dB）。ミドルウェア・ゲームミックスのように出力の音色をホストが受け持つ統合では、生成直後に無効化することを検討してください。無効の間はサンプルに手を加えません。

有効/無効の切り替え・値の変更はクリックなしで移行します（シェルフパラメータは 50 ms の smoothstep ランプ、無効化時は 0 dB 到達後に 5.8 ms の原信号クロスフェード）。出力チャンネル数が変わると（スピーカーレイアウトの変更など）履歴をクリアし、有効化時と同じランプで再開します。`followMasterGain` の場合、ボリューム変更時にマスターゲインのランプ（20 ms）と一緒に動きますが、別コマンドのため開始が最大 1 ブロックずれることがあります（それぞれランプなので不連続はありません）。32 チャンネルを超えるカスタムスピーカーレイアウトにはかかりません。

既定値を保ったまま有効/無効を切り替えるには、get で埋めてから `enabled` だけを変更して set します。

```c
STLoudnessCompensationDesc d = { sizeof d, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &d);
d.enabled = 0;                                  /* 無効化 */
st_rt_render_set_loudness_compensation(ctx, &d);
```

スレッド: `[control]` — 出力段だけを変更し、制御スレッドで ISO 226 のフィッティング（数十 µs）を行います。対応可否は `ST_CAP1_LOUDNESS_COMPENSATION`（機能ワード 1）で確認します。オフラインライブラリにはありません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `desc` | 設定。呼び出し側が `structSize` / `apiVersion` を埋め、`reserved` は 0 である必要があります |

**構造体** `STLoudnessCompensationDesc`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STLoudnessCompensationDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1。生成直後は 1 |
| `followMasterGain` | 0/1。1 なら実効再生レベル = `playbackLevelPhon` + マスターゲイン dB。`playbackLevelPhon` を「マスターゲイン 0 dB のときの再生レベル」に一度合わせておけば、マスターゲインをボリュームノブとして使うホストで補正が自動的に追従します。生成直後は 1 |
| `referenceLevelPhon` | 基準リスニングレベル `[0, 120]` phon、既定 83（映画・音楽マスタリングの基準モニターレベル） |
| `playbackLevelPhon` | 実際の再生レベル `[0, 120]` phon、既定 70（家庭・ヘッドホンの通常リスニングレベル）。基準と同じなら補正 0 |
| `bassScale` | 低域シェルフゲインの倍率 `[0, 1]`、既定 1（ISO のまま） |
| `trebleScale` | 高域シェルフゲインの倍率 `[0, 1]`、既定 1。0 なら低域のみ補正 |
| `maxShelfGainDb` | シェルフゲイン絶対値の上限 `[0, 40]` dB（倍率の後に適用）、既定 15。低域シェルフが上限に達した場合、ゲインだけを切るのではなく「シェルフが上限に達する再生レベル」の形状（コーナー・傾き）を使います。高域シェルフは形状が固定なのでゲインだけを切ります |
| `reserved[5]` | 0 |

ISO 式の有効範囲（20 Hz–4 kHz は 20–90 phon、5–12.5 kHz は 20–80 phon）外のレベルは、その周波数での端のレベルの等高線の形状で評価します（R・P がともに 80 phon を超えると高域補正は 0）。1.25–5 kHz の ISO の凹部（数 dB 未満）はシェルフで再現しません。近似誤差はレベル差が大きく、低い側のレベルが低いほど大きくなります（中域基準の ISO 表に対する最大誤差: 83→70 0.5 dB、83→60 0.9 dB、83→40 1.9 dB、90→20 3.7 dB）。

**戻り値** — `1` = 適用 / `0` = 失敗。`NULL`・フィールドの範囲外・`reserved` ≠ 0 なら `ST_STATUS_INVALID_ARGUMENT`、スタンプ不一致なら `ST_STATUS_VERSION_MISMATCH`（どちらも何も変更しません）。`ST_BACKEND_EXA` バックエンドのコンテキストは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_loudness_compensation</code> — 等ラウドネス補正の設定を読み取る</summary>

```c
int st_rt_render_get_loudness_compensation(const STRT_Context* context, STLoudnessCompensationDesc* outDesc);
```

**用途** — 保存された等ラウドネス補正の設定（要求値）を返します。一度も set していなければ生成直後の既定値を埋めます。既定値を保ったまま一部のフィールドだけを変更するとき、先に呼びます。

**呼び出し方** — スレッド: `[control]` — オーラライザーの制御ロックを短時間取り、保存値をコピーします。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outDesc` | 出力。呼び出し側が `structSize` / `apiVersion` を埋めます。フィールドは `st_rt_render_set_loudness_compensation` の項を参照 |

**戻り値** — `1` = 成功 / `0` = 失敗。`ST_BACKEND_EXA` バックエンドのコンテキストは既定値（無効）を埋めます。

</details>

<details>
<summary><code>st_rt_render_set_virtual_bass</code> — 仮想ベース（倍音合成）を設定する</summary>

```c
int st_rt_render_set_virtual_bass(STRT_Context* context, const STVirtualBassDesc* desc);
```

**用途** — 低域を再生できない小型ドライバー・イヤホンで低音を感じさせる missing fundamental 効果です。カットオフ周波数以下の低域を分離して 2・3・4 次倍音を生成し、バンドパスで整えて原信号に加えます。倍音レベルは入力レベルに比例します。

**呼び出し方** — 出力段で等ラウドネス補正の後、マスターゲイン・リミッターの前にかかります。既定は無効です。伝搬・IR の結果を無効化しません。有効/無効の切り替え・値の変更は 30 ms の smoothstep ランプで移行し、有効化・カットオフ/帯域の変更時はミックス 0 でフィルターを 23 ms 安定させてから上げます。出力チャンネル数が変わると履歴をクリアして再開します。スピーカーレイアウトの LFE チャンネルはスキップし、32 チャンネルを超えるカスタムレイアウトにはかかりません。

低域に複数のトーンが同時にあると帯域内の相互変調（和音 f1+f2 など）が生じます。たとえば同じ振幅の 40 Hz + 55 Hz では、和音 95 Hz が 2 次倍音より 8.6–10.5 dB 大きくなります。単一トーンなら 2・3・4 次倍音だけが出ます（それ以外の成分は −77 dB 以下）。適用するかどうかは試聴で判断します。既定値で有効にするには get で埋めてから `enabled` だけを 1 に変えて set します。スレッド: `[control]` — 出力段だけを変更し、オーディオコールバックからは呼びません。対応可否は `ST_CAP1_VIRTUAL_BASS`（機能ワード 1）で確認します。オフラインライブラリにはありません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `desc` | 設定。呼び出し側が `structSize` / `apiVersion` を埋め、`reserved` は 0 である必要があります |

**構造体** `STVirtualBassDesc`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STVirtualBassDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1。既定 0 |
| `mode` | `STVirtualBassMode` — `ST_VIRTUAL_BASS_HYBRID`（0、既定）: 原信号の低域をそのまま残して倍音を加える（低域が出るイヤホンなど） / `ST_VIRTUAL_BASS_HARMONICS_ONLY`（1）: 原信号を `cutoffHz` の LR4 HPF でフィルタリングし倍音だけを残す（小型ドライバーの保護） |
| `cutoffHz` | 低域分離・HPF のカットオフ `[40, 160]` Hz、既定 90 |
| `harmonicLowHz` | 倍音帯域の下限 `[20, 1000]` Hz、既定 70 |
| `harmonicHighHz` | 倍音帯域の上限 `[20, 1000]` Hz、`harmonicLowHz` より大きい必要があります。既定 220 |
| `intensity` | 倍音のミックス強度（線形） `[0, 4]`。1 = バンドパス前の倍音エネルギーが分離した低域エネルギーと等しい。既定 0.5（−6 dB） — HYBRID で 2 次倍音が基本波とほぼ同じ大きさに聞こえる値です。基本波のない `HARMONICS_ONLY` では 1.0 前後を推奨します |
| `reserved[6]` | 0 |

**戻り値** — `1` = 適用 / `0` = 失敗。`NULL`・フィールドの範囲外・`reserved` ≠ 0 なら `ST_STATUS_INVALID_ARGUMENT`、スタンプ不一致なら `ST_STATUS_VERSION_MISMATCH`（どちらも何も変更しません）。`ST_BACKEND_EXA` バックエンドのコンテキストは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_virtual_bass</code> — 仮想ベースの設定を読み取る</summary>

```c
int st_rt_render_get_virtual_bass(const STRT_Context* context, STVirtualBassDesc* outDesc);
```

**用途** — 保存された仮想ベースの設定（要求値）を返します。一度も set していなければ既定値を埋めます。

**呼び出し方** — スレッド: `[control]` — オーラライザーの制御ロックを短時間取り、保存値をコピーします。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outDesc` | 出力。呼び出し側が `structSize` / `apiVersion` を埋めます。フィールドは `st_rt_render_set_virtual_bass` の項を参照 |

**戻り値** — `1` = 成功 / `0` = 失敗。`ST_BACKEND_EXA` バックエンドのコンテキストは既定値（無効）を埋めます。

</details>

<details>
<summary><code>st_rt_render_set_eq</code> — 出力 9 バンドグラフィック EQ（ミキサー EQ）をかける</summary>

```c
int st_rt_render_set_eq(STRT_Context* context, const float gainsDb[ST_FREQUENCY_BANDS], int enabled);
```

**用途** — レンダリング出力にのみかかる 9 バンドのトーンコントロールです。伝搬・IR の結果を無効化しません。出力 EQ はひとつで、この関数は出力パラメトリック EQ（`st_rt_render_set_parametric_eq`）の **互換ビュー** です — エンジンのバンド中心（63…16k Hz）ごとに Q 1.414 のピーキングフィルター 9 個 + プリアンプ 0 dB として設定されます。

**呼び出し方** — レンダリング中いつでも呼べます。この関数と `st_rt_render_set_parametric_eq` は同じ EQ のバンドリスト全体を置き換え、**最後に呼んだ方が優先されます**。この経路は係数を即座に置き換え（ランプなし）、9 チャンネル以上のスピーカーレイアウトではスルーします。トグルだけしたい場合でも `ST_FREQUENCY_BANDS` 個のゲインを必ず一緒に渡します。9 バンド専用の getter はなく、`st_rt_render_get_parametric_eq` がこの設定を 9 個の `PEAKING` バンドとして返します。スレッド: `[control]` — 出力段だけを変更し、オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `gainsDb` | バンドゲイン [dB] `ST_FREQUENCY_BANDS`（9）個、順序は 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz。エンジンが `[−24, +24]` dB に clamp します。`NULL` なら何もしません |
| `enabled` | 0 なら係数は更新しつつバイパスします。0 以外なら有効にします |

**戻り値** — `1` = 適用 / `0` = 失敗（`gainsDb` が `NULL` など）。

</details>

<details>
<summary><code>st_rt_render_set_parametric_eq</code> — 出力パラメトリック EQ をかける</summary>

```c
int st_rt_render_set_parametric_eq(STRT_Context* context, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — ヘッドホン補正（AutoEq プロファイルなど）や出力の音色調整のための最大 16 バンドのパラメトリック EQ です。レンダリング出力にのみかかり、伝搬・IR の結果を無効化しません。

**呼び出し方** — レンダリング中いつでも呼べ、変更されると 20 ms のクロスフェードで移行します（9 バンドビューから移る場合も同様）。かかる位置はレンダリングチェーンの末尾、マスターゲインの前（ステレオ・バイノーラル）で、スピーカー出力ではデコード・距離整列の後です。すべての出力チャンネル（スピーカーの LFE を含む）に同じフィルターがかかります — 音響的な合計にかけたのと同じなので、低域をメイン・LFE がどう分担しても結果の音色は同じです。チャンネルごとに異なる補正には `st_rt_render_set_speaker_channel_eq` を使います。64 チャンネルまで処理します。`st_rt_render_set_eq` と同じ EQ なので、最後に呼んだ setter が優先されます。AutoEq のテキストは `st_rt_render_parse_autoeq_parametric` でバンド配列に変換して渡します。スレッド: `[control]` — 出力段だけを変更し、オーディオコールバックからは呼びません。対応可否は `ST_CAP1_OUTPUT_PARAMETRIC_EQ`（機能ワード 1）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `bands` | バンド配列 `bandCount` 個。呼び出し中のみ読み取ります。`bandCount` = 0 なら `NULL` でも構いません |
| `bandCount` | バンド数 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` = `[0, 16]` |
| `preampDb` | プリアンプ [dB]、`[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[−48, +12]` に clamp。主な用途はクリッピング防止のための負の値で、上げるのはマスターゲインが受け持ちます |
| `enabled` | 0 ならリストは保存しつつスルーします |

**構造体** `STParametricEqBand`（32 bytes、配列要素なのでバージョンスタンプなし）

| フィールド | 説明 |
|---|---|
| `type` | `STParametricEqType` — `PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = このバンドは恒等（スキップ）、それ以外 = 有効 |
| `frequencyHz` | 中心（PEAKING・NOTCH）またはコーナー（シェルフの中点・LP・HP）周波数。`[20, min(20000, 0.49·Fs)]` Hz に clamp |
| `gainDb` | PEAKING・LOW_SHELF・HIGH_SHELF のみ使用（LP・HP・NOTCH は保存のみ）。`[−24, +24]` dB に clamp |
| `q` | `[0.1, 30]`、シェルフは `[0.1, 3]` に clamp（大きな Q のシェルフは端に大きな共振ピークを作ります） |
| `reserved[3]` | 0 である必要があります（そうでなければ拒否） |

フィルター定義（出力 EQ・音源 EQ・スピーカーチャンネル EQ 共通）: バンドごとに RBJ Audio EQ Cookbook の 2 次セクションがひとつで、シェルフは Q を使う RBJ シェルフ（AutoEq と同じ）です。Fs はエンジン内部のサンプルレート 44100 Hz、係数・演算は double の Direct Form I です。チェーンはプリアンプ → バンド 0..count−1 の直列です。`enabled` = 0 のバンドと \|gain\| ≤ 1e-4 dB の PEAKING・シェルフは厳密に恒等で、全体が無効か効果がない場合（全バンド恒等 + プリアンプ 0 dB）はサンプルに手を加えません。値が変わると旧設定と新設定を 20 ms の間並行して動かして出力をクロスフェードし（係数補間ではないのでクリック・発散なし）、その間にさらに変更されると最新の値ひとつだけを待機させてから続けて移行します。有限値は上記の範囲に clamp し、getter は clamp された実効値を返します。

**戻り値** — `1` = 適用 / `0` = 失敗。`0` のときの `st_rt_get_last_status`:

- `ST_STATUS_INVALID_ARGUMENT` — `bandCount` の範囲外、`bands` が `NULL`（`bandCount` > 0）、非有限値、不明な `type`、`reserved` ≠ 0。何も変更しません。
- `ST_STATUS_UNAVAILABLE` — `ST_BACKEND_EXA` バックエンドのコンテキスト

</details>

<details>
<summary><code>st_rt_render_get_parametric_eq</code> — 出力 EQ のバンドリストを読み取る</summary>

```c
int st_rt_render_get_parametric_eq(const STRT_Context* context, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 現在の出力 EQ のバンドリスト（clamp された実効値）・プリアンプ・有効状態を返します。`st_rt_render_set_eq` でかけた設定も 9 個の `PEAKING` バンド（Q 1.414）として読み取れます。

**呼び出し方** — サイズがわからなければ `outBands` を `NULL` にして呼び、`outBandCount` だけを受け取ってから再度呼びます。`ST_PARAMETRIC_EQ_MAX_BANDS`（16）個の容量を渡せば常に収まります。スレッド: `[control]` — オーラライザーの制御ロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outBands` | バンド出力配列。`NULL` ならサイズ問い合わせ（バンドは書き込まない）。フィールドは `st_rt_render_set_parametric_eq` の項を参照 |
| `bandCapacity` | `outBands` の容量（要素数）、0 以上 |
| `outBandCount` | バンド数の出力。`NULL` ならスキップ |
| `outPreampDb` | プリアンプ [dB] の出力。`NULL` ならスキップ |
| `outEnabled` | 有効（0/1）の出力。`NULL` ならスキップ |

**戻り値** — `1` = 成功（サイズ問い合わせを含む） / `0` = 失敗。`0` のときの `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`（`bandCapacity < 0`） / `ST_STATUS_BUFFER_TOO_SMALL`（容量がバンド数より小さい — この場合も個数・プリアンプ・有効状態は書き込みます） / `ST_STATUS_UNAVAILABLE`（`ST_BACKEND_EXA` バックエンド）。

</details>

<details>
<summary><code>st_rt_render_parse_autoeq_parametric</code> — AutoEq の ParametricEQ.txt をバンド配列にパースする</summary>

```c
int32_t st_rt_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**用途** — AutoEq の `ParametricEQ.txt`（Equalizer APO 文法のサブセット）のテキストを `STParametricEqBand` 配列とプリアンプに変換します。結果はそのまま `st_rt_render_set_parametric_eq`（有効として）、`st_rt_source_set_parametric_eq`、`st_rt_render_set_speaker_channel_eq` に渡せます。

**呼び出し方** — コンテキストは不要で、グローバル状態・割り当てはありません。オフラインライブラリの `st_off_render_parse_autoeq_parametric` と同じ実装・同じ契約です。スレッド: `[any]` — どのスレッドから呼んでもブロックしません。対応可否は `ST_CAP1_OUTPUT_PARAMETRIC_EQ`（機能ワード 1）に含まれます。

受け付ける文法（大文字小文字を区別しない）:

```text
Preamp: -6.2 dB
Filter 1: ON LSC Fc 105 Hz Gain 6.8 dB Q 0.70
```

- `Preamp: <数値> [dB]` — 複数行あれば dB で加算します。
- `Filter[ <番号>]: ON|OFF <種類> Fc <数値> [Hz] [Gain <数値> [dB]] [Q <数値>]` — 種類は `PK`・`PEQ`・`MODAL` / `LSC`・`LS` / `HSC`・`HS` / `LP`・`LPQ` / `HP`・`HPQ` / `NO`。Q を省略するとシェルフ・LP・HP は 0.7071 で、PK・NO は Q が必須です。Gain は PK・シェルフで必須です。`OFF` フィルターは `enabled` 0 のバンドとして入り、バンド数に数えます。
- 空行と `#` 以降（行末コメント）は無視し、UTF-8 BOM・CRLF を受け付けます。数値はロケールに関係なく読み取ります。
- 拒否: それ以外のコマンド（`Channel`・`Device`・`GraphicEQ`・`Include` など）、`BP`・`AP`・`IIR`、シェルフの傾き形式（`LS 6dB`）、`BW Oct`、範囲外の値（Fc `[20, 20000]` Hz · Gain ±24 dB · Q `[0.1, 30]`、シェルフ Q `[0.1, 3]` · プリアンプ最終合計 `[−48, +12]` dB）、コメント外の非 ASCII、指数表記。パーサーは clamp せずに拒否します。

| パラメータ | 説明 |
|---|---|
| `utf8Text` | NUL 終端の UTF-8 テキスト。必須 |
| `outBands` | バンド出力配列。`bandCapacity` > 0 なら必須。`reserved` は 0 で埋められます |
| `bandCapacity` | `outBands` の容量、0 以上 |
| `outBandCount` | バンド数の出力。必須 |
| `outPreampDb` | プリアンプ [dB] の出力。必須 |
| `outErrorLine` | 失敗時のエラー行番号（1 始まり、行に関係ないエラーは 0 — プリアンプ最終合計の範囲外はファイル末尾で判定するため 0 で、行単位のエラーがあればそちらが先に報告されます）。`NULL` 可 |
| `outErrorMessage` | 失敗理由（NUL 終端の英文、容量に合わせて切り詰め）。`NULL` 可 |
| `errorMessageCapacity` | `outErrorMessage` のバイト容量 |

**戻り値** — `STAutoEqParseStatus`。成功なら `outBands[0..*outBandCount)` と `*outPreampDb` を書き込み、失敗なら `*outBandCount` = 0 · `*outPreampDb` = 0 です。コンテキストがないため `st_rt_get_last_status` には残りません。

| 値 | 意味 |
|---|---|
| `ST_AUTOEQ_PARSE_OK`(0) | 成功 |
| `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`(1) | `utf8Text`・`outBandCount`・`outPreampDb` が `NULL`、`bandCapacity < 0`、`outBands` が `NULL` なのに `bandCapacity > 0` |
| `ST_AUTOEQ_PARSE_SYNTAX`(2) | 行の形式エラー（数値でない・必須フィールドの欠落・重複・不明なトークン） |
| `ST_AUTOEQ_PARSE_UNSUPPORTED`(3) | 未対応のコマンド・フィルター種類・傾き・BW 形式 |
| `ST_AUTOEQ_PARSE_OUT_OF_RANGE`(4) | 範囲外の値 |
| `ST_AUTOEQ_PARSE_TOO_MANY_BANDS`(5) | `ST_PARAMETRIC_EQ_MAX_BANDS` または `bandCapacity` 超過 |
| `ST_AUTOEQ_PARSE_EMPTY`(6) | `Preamp`・`Filter` 行がひとつもない |

</details>

<details>
<summary><code>st_rt_render_set_options</code> — レンダリングオプション（経路成分・空間化・リミッターのゲート）を変更する</summary>

```c
void st_rt_render_set_options(STRT_Context* context, const STRenderOptions* options);
```

**用途** — オーラライゼーション段のゲートをまとめて変更します。直接音・透過・反射・回折・残響の成分を個別にオン/オフして試聴比較（A/B）したり、初期反射のレンダリング経路（exact オブジェクト / hybrid HOA bed）、空間化・HRTF、経路フェード、出力リミッターを選択したりします。伝搬と IR 変換は同じデータを作り続け、このオプションはレンダリング合成段だけをフィルタリングします。

**呼び出し方** — レンダリング中でも呼べます。一部だけを変更するには `st_rt_render_get_options` で現在値を受け取り、フィールドを修正してから渡します。スピーカー出力が有効な間は、レイアウトが early 経路（全体アンビソニックス）・`useSpatialization` = 1・`useHrtf` = 0 を受け持つため、それらの値は維持され、残りのゲートだけが適用されます。スピーカーを無効にした後は `reserved0` が再び 0/1 の範囲に制限されます。1 次散乱のゲート（`st_rt_render_set_diffuse_rain_enabled`）はこの構造体の外の値なので、この呼び出しでは変わりません。スレッド: `[control]` — IR ポリシーフックを含む制御スレッド呼び出しなので、オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `options` | 新しいオプション。`NULL` なら何もしません |

**構造体** `STRenderOptions`（バージョンスタンプのない `int` フィールド 12 個、0 = 無効 / 0 以外 = 有効）

| フィールド | 既定 | 説明 |
|---|---|---|
| `renderDirect` | 1 | 直接音のレンダリング |
| `renderTransmission` | 1 | 透過音のレンダリング |
| `renderReflection` | 1 | 反射音のレンダリング |
| `renderDiffraction` | 1 | 回折音のレンダリング |
| `renderLateReverb` | 1 | 後期残響（FDN タンク）。0 はタンクだけを無効にし、1 次散乱は残します |
| `useDoppler` | 1 | 可変遅延ドップラー（ピッチ）。リアルタイムでは無視され常に 1 です — 0 を渡しても有効になり、get は 1 を返します。移動する音源の放射ゲインは別のスイッチ（`st_rt_set_doppler_gain_mode`）です |
| `usePathFade` | 1 | 経路フェード。長さは `st_rt_render_set_path_fade_time` |
| `reserved0` | 1 | 初期反射のレンダリング経路（`STEarlySpatialMode` と同じ番号）。`0` = Objects: すべての初期経路を exact オブジェクトとして個別にレンダリング（経路数に比例してレンダリングコストが増える）。`1` = Hybrid: リスナー全体の予算内の exact オブジェクト + 残りの初期反射・1 次散乱は HOA3 bed。リアルタイムのゲーム統合では 1 を推奨します。範囲外の値は `[0, 1]` に clamp されます。スピーカー出力中は、レイアウト専用経路を表す別の値が読み取られることがあります |
| `useSpatialization` | 1 | 空間化（パンニング・HRIR）を使用 |
| `useHrtf` | 0 | HRTF バイノーラル空間化。`st_rt_render_start` の `useHrtf` 引数がレンダリング開始時にこの値を決めます |
| `useLimiter` | 1 | 出力リミッターを有効化。種類は `st_rt_render_set_limiter_type` |
| `outputBandPressure` | 0 | 予約スロット。リアルタイムでは常に 0 です |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_get_options</code> — 現在のレンダリングオプションを読み取る</summary>

```c
void st_rt_render_get_options(const STRT_Context* context, STRenderOptions* outOptions);
```

**用途** — 現在適用されている `STRenderOptions` を埋めます。一部のフィールドだけを変更するときに先に読む用途です。

**呼び出し方** — スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outOptions` | 出力。`NULL` なら何もしません。フィールドは `st_rt_render_set_options` の項を参照 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_set_diffuse_rain_enabled</code> — 1 次散乱（diffuse rain）のレンダリングをオン/オフする</summary>

```c
void st_rt_render_set_diffuse_rain_enabled(STRT_Context* context, int enabled);
```

**用途** — 1 次散乱は直接音・反射音・回折音・残響（`STRenderOptions` の `render*`）と並ぶ独立したレンダリング成分です。このゲートで 1 次散乱だけをオン/オフして試聴比較します。無効にすると hybrid 経路の rain bed セルと Objects 経路の rain RIR セルだけが外れ、FDN テールはそのままです。逆に `renderLateReverb` = 0 はタンクだけを無効にし、1 次散乱は残します。

**呼び出し方** — レンダリング中でも呼べ、IR の再変換なしでレンダリング準備だけをやり直します。`STRenderOptions` の外の値なので、`st_rt_render_set_options` とスピーカーレイアウトの切り替えではこの値は変わりません。サウンドトレーシングを無効にすると（`st_rt_render_set_sound_tracing_enabled(…, 0)`）1 次散乱も一緒に無効になります。既定 1。スレッド: `[control]` — レンダリング準備を再発行する制御スレッド呼び出しです。対応可否は `ST_CAP1_RENDER_DIFFUSE_RAIN_GATE`（機能ワード 1）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | 0 = 1 次散乱を無効、0 以外 = 有効（既定） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_is_diffuse_rain_enabled</code> — 1 次散乱のレンダリングゲートの状態を読み取る</summary>

```c
int st_rt_render_is_diffuse_rain_enabled(const STRT_Context* context);
```

**用途** — `st_rt_render_set_diffuse_rain_enabled` で設定した値を返します。

**呼び出し方** — スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `1` = 有効（既定） / `0` = 無効。コンテキストがなければ `-1`。

</details>

<details>
<summary><code>st_rt_render_set_sound_tracing_enabled</code> — サウンドトレーシング効果をオン/オフする（ベースライン比較）</summary>

```c
void st_rt_render_set_sound_tracing_enabled(STRT_Context* context, int enabled);
```

**用途** — サウンドトレーシング効果を無効にした「距離減衰 + パンニング」のベースラインと比較するためのトグルです。`enabled` = 0 は別のバイパスレンダラーではありません — 同じトレーシングパイプラインをそのまま動かしつつ、反射・回折・残響・1 次散乱の経路と空気吸収・伝搬遅延・直接音の遮蔽を無効にして、距離減衰と空間化だけを残します。空間化方式（`st_rt_render_set_spatializer`）はそのままです。

**呼び出し方** — レンダリング中でも呼べます。無効の状態でもシーンの setter・伝搬ワーカー・IR 変換・発行は動き続けます — スケジューラーやデータポンプを止める機能ではなく、CPU を節約するには `st_rt_idle` を使います。そのため無効の状態でも、最初の IR がインストールされた後から音が出ます。既定は有効です。スレッド: `[control]` — シーンロックを何度も取るため、オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | 0 = ベースライン（距離減衰 + 空間化のみ）、0 以外 = サウンドトレーシング有効（既定） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_is_sound_tracing_enabled</code> — サウンドトレーシング効果が有効かどうかを読み取る</summary>

```c
int st_rt_render_is_sound_tracing_enabled(const STRT_Context* context);
```

**用途** — `st_rt_render_set_sound_tracing_enabled` で設定した値を返します。

**呼び出し方** — スレッド: `[any]` — atomic 読み取りなので、どのスレッドから呼んでもブロックしません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `1` = 有効（既定） / `0` = 無効またはコンテキストが `NULL`。

</details>

<details>
<summary><code>st_rt_render_set_path_fade_time</code> — 経路フェード時間を設定する</summary>

```c
void st_rt_render_set_path_fade_time(STRT_Context* context, float seconds);
```

**用途** — IR の更新で経路が変わるときにクリックなしで移行するためにかけるフェードの長さ（秒）を設定します。音源・リスナーが動くシーンで、切り替えの滑らかさと応答性のバランスを調整します。`STRenderOptions.usePathFade` が有効なとき（既定）に使われます。

**呼び出し方** — レンダリング中でも呼べます。時間引数はシーン単位に関係のない秒です。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `seconds` | フェード長 [s]、正の有限値。既定 0.05 s。0 以下・非有限値は無視されます |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_get_path_fade_time</code> — 経路フェード時間を読み取る</summary>

```c
float st_rt_render_get_path_fade_time(const STRT_Context* context);
```

**用途** — 現在の経路フェード時間（秒）を返します。

**呼び出し方** — スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — フェード時間 [s]（既定 `0.05`）。コンテキストが `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_render_set_max_delay_seconds</code> — レンダリング遅延リングの最大遅延を設定する</summary>

```c
int st_rt_render_set_max_delay_seconds(STRT_Context* context, float seconds);
```

**用途** — レンダラーが表現できる最大伝搬遅延（秒）を設定します。遅延がこの上限を超える exact 経路はレンダリングから外れ、後期残響は FDN がカバーします。大きな室内・屋外のように遅れて到達する経路が必要なら増やし、メモリを減らしたいなら減らします。遅延リングのメモリは、レンダリングする音源ごとに 9 バンド × リング長だけ増えます。音源メモリ予算（`STMemoryBudget`）では、この値が音源ごとの遅延リングの上限です。

**呼び出し方** — 遅延リングを再割り当てするため、音源を多数作る前、レンダリングを開始する前に設定するのが望ましいです。生成時の値は `STRT_CreateOptions.maxDelaySeconds`（0 = 既定 2.0 s）でも指定できます。スレッド: `[control, blocking]` — 遅延リングの再割り当てを伴う長い区間なので、ゲームループ・オーディオスレッドからは呼びません。対応可否は `ST_CAP_RUNTIME_DELAY_RESIZE`（機能ワード 0）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `seconds` | 最大遅延 [s]、約 `0.012`（エンジンブロック 512 + 補間余裕 8 サンプル） ~ `60`。既定 2.0。シーン単位に関係のない秒 |

**戻り値** — `1` = 適用（同じ値ならそのまま 1） / `0` = 拒否（範囲外・非有限値、コンテキストが `NULL`）。

</details>

<details>
<summary><code>st_rt_render_get_max_delay_seconds</code> — レンダリング遅延リングの最大遅延を読み取る</summary>

```c
float st_rt_render_get_max_delay_seconds(const STRT_Context* context);
```

**用途** — 現在の最大遅延（秒）を返します。

**呼び出し方** — スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 最大遅延 [s]（既定 `2.0`）。コンテキストが `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_render_get_ring_buffer_samples</code> — 遅延リングの長さ（サンプル）を読み取る</summary>

```c
int st_rt_render_get_ring_buffer_samples(const STRT_Context* context);
```

**用途** — 現在の最大遅延に対応するレンダリング遅延リングの長さを、エンジンサンプル（44.1 kHz）単位で返します。最大遅延 × 44100 にレンダリングブロック（512）と補間余裕を加えた値なので、メモリの見積もりに使います。

**呼び出し方** — `st_rt_render_set_max_delay_seconds` の後に読み直します。スレッド: `[control]` — ロックなしでエンジン状態を読む制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — リング長（サンプル）。コンテキストが `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_render_start</code> — オーディオレンダリングを開始する（出力モード別）</summary>

```c
int st_rt_render_start(STRT_Context* context, int useHrtf);
```

**用途** — レンダリング出力を開始し、出力形態（ヘッドホンバイノーラル / ステレオパンニング / スピーカーレイアウト）を決めます。何を起動するかは生成オプション `STRT_CreateOptions.renderOutputMode` によって異なります。

| `renderOutputMode` | `st_rt_render_start` が行うこと | 出力を取りに来る側 |
|---|---|---|
| `ST_RT_RENDER_OUTPUT_DEVICE`(0, 既定) | OS のオーディオデバイスを開き、エンジンのレンダリングスレッドを起動します | エンジンがデバイスまで直接出力します |
| `ST_RT_RENDER_OUTPUT_HOST_PULL`(1) | **スレッドもデバイスも作らず**、バイノーラル/スピーカーの選択と「レンダリング許可」フラグだけを立てます。pull バッファーとリサンプラーをここで確保します | ホストが自身のオーディオスレッドで `st_rt_render_process` を呼びます |
| `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED`(2) | エンジンのレンダリングスレッドを起動し、出力リング（8 ブロック容量・3 ブロック目標）を埋めます。デバイスはありません | ホストが `st_rt_render_process` でリングからコピーするだけです |

**呼び出し方** — シーン・音源・リスナーを準備した後に呼びます。HOST_PULL 系でも **必ず呼ぶ必要があります** — 呼ぶ前の `st_rt_render_process` は 0 フレームを返します。HRIR 空間化を使う場合は、先に `st_rt_render_set_spatializer` でデータセットを選び、`useHrtf` = 1 で開始します。スピーカーレイアウト（`st_rt_render_set_speaker_layout[_custom]`）を設定しておいて `useHrtf` = 0 で開始すると、そのレイアウトの N チャンネルで出力し、スピーカー出力の有効判定（`st_rt_render_get_speaker_channels`）はこの呼び出しの後に確定します。エンジンが休止中（`st_rt_idle`）に開始すると IDLE 状態で開始します。スレッド: `[control, blocking]` — DEVICE モードはデバイス・スレッドの起動を伴う長い区間なので、ゲームループ・オーディオスレッドからは呼びません。HOST_PULL の対応は `ST_CAP_HOST_PULL_RENDER`、BUFFERED は `ST_CAP_HOST_PULL_BUFFERED`（機能ワード 0）で確認します。

スレッド数（PIPELINED スケジューラー、N = `max(3, 計算スレッド予算)`）: DEVICE = 計算ワーカー N−1 + レンダリング 1 + デバイス 1、HOST_PULL = 計算ワーカー N−1（レンダリング・デバイス 0）、HOST_PULL_BUFFERED = 計算ワーカー N−1 + レンダリング 1（デバイス 0）。ファイル入力があればデコーダースレッドが 1 つ加わります。実測は `st_rt_get_thread_inventory` で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `useHrtf` | 1 = HRTF バイノーラル 2 チャンネル（`st_rt_render_set_spatializer` で選んだ HRIR）。0 = ステレオパンニング 2 チャンネル、またはスピーカーレイアウトを設定していればその N チャンネル。`STRenderOptions.useHrtf` もこの値で決まります |

**戻り値** — `1` = 開始（DEVICE モードですでに動作中ならそのまま 1） / `0` = 失敗（コンテキストが `NULL`、デバイス起動の失敗など）。

</details>

<details>
<summary><code>st_rt_render_stop</code> — オーディオレンダリングを停止する</summary>

```c
void st_rt_render_stop(STRT_Context* context);
```

**用途** — `st_rt_render_start` で開始したレンダリングを停止します。

**呼び出し方** — モード別の動作:

- DEVICE: デバイスを停止し、レンダリングスレッドを join します。
- HOST_PULL: 「レンダリング許可」フラグを下ろし、繰り越し FIFO を空にします（次の start が残りのテールを出力しないように）。以降 `st_rt_render_process` は 0 を返します。
- HOST_PULL_BUFFERED: レンダリングスレッドを停止し、出力リングを破棄します。リングにあった分はスピーカーセットの `contentFrame` にすでに数えられていますが聞こえないため、セットの位置を合わせるには破棄する前に `contentFrame − latencyFrames`（聞こえた位置）を読み、`st_rt_speaker_set_relocate` で再設定します。

`st_rt_render_process` と同時に呼んでも安全です — エンジンがレンダリング許可を下ろし、進行中の `st_rt_render_process` が抜けるまで待ってから停止します。長時間休止させるときにデバイスまで解放するには、`st_rt_get_idle_state` が IDLE になった後にこの関数を呼びます。スレッド: `[control, blocking]` — デバイスの停止・スレッドの join を伴うため、ゲームループ・オーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_is_running</code> — レンダリングが動作中かどうかを読み取る</summary>

```c
int st_rt_render_is_running(const STRT_Context* context);
```

**用途** — レンダリング状態を返します。出力モードに関係なく一貫した意味です — DEVICE はデバイスが動いているか、HOST_PULL はデバイスではなく「レンダリング許可」フラグ（`st_rt_render_start` の後・`st_rt_render_stop` の前）を見ます。

**呼び出し方** — スレッド: `[control]` — 制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `1` = レンダリング中 / `0` = 停止またはコンテキストが `NULL`。

</details>

<details>
<summary><code>st_rt_render_process</code> — ホストのオーディオスレッドで出力ブロックを取得する（pull レンダリング）</summary>

```c
int st_rt_render_process(STRT_Context* context, float* interleavedOut, int frames);
```

**用途** — HOST_PULL 系出力モードのエントリーポイントです。エンジン出力がホストのオーディオグラフを通る必要がある統合 — ゲームエンジンのサブミックスエフェクト、オーディオキャプチャ・録音パイプラインなど — で、ホストが自身のオーディオスレッドでブロックを取得します。HOST_PULL はこの呼び出しスレッドでレンダリングし、HOST_PULL_BUFFERED はエンジンのレンダリングスレッドが埋めたリングからコピーするだけです（ホストコールバックのコスト ≈ memcpy、ジッターはリングが吸収）。3 つの出力モードはすべて同じブロック関数を使うため、音は同じです。

**呼び出し方** — `st_rt_render_start` の後、ホストのオーディオコールバックごとに呼びます。スレッド: `[audio]` — ホストのオーディオスレッド（MMCSS/HIGHEST）から呼んでも安全です。ロック・割り当て・システムコールを新たに発生させず（バッファーとリサンプラーは `st_rt_render_start` で確保し、IR の採用はポインター交換）、呼び出しスレッドの優先度・affinity には手を加えません。FTZ/DAZ だけをこの呼び出しの間有効にし、元に戻します。

- **チャンネル数** — バイノーラル・ステレオなら 2、スピーカーレイアウトが有効なら `st_rt_render_get_speaker_channels()` の値です。その関数が 0 を返した場合、出力は **2 チャンネル** です — 0 をチャンネル数として使いません。
- **レイアウトの切り替え** — レンダリング中に `st_rt_render_set_speaker_layout[_custom]` / `st_rt_render_disable_speaker_output` を呼ぶと、pull 出力が再構成されます（チャンネル数・エンジンブロック・繰り越し FIFO・出力リサンプラー）。切り替えはこの関数と同時に呼んでも安全です — エンジンがレンダリング許可を下ろし、進行中の呼び出しが抜けるまで待ってから切り替えます（`st_rt_render_start` / `stop` も同様）。切り替えウィンドウにかかった呼び出しは **0 フレーム** を返すので、そのブロックはホストが無音として処理します。切り替え後は `st_rt_render_get_speaker_channels()` を読み直し、その幅でバッファーを確保します。
- **アンダーラン** — 音源ストリームが要求より少なくしか埋まっていなければ、その音源は無音で埋め、`STStreamStatus.underrunFrames` に累積します。**決して stall しません。** BUFFERED でブロックあたりのレンダリングコストが継続的にブロック時間（11.61 ms）を超えるとリングでも防げず、そのアンダーランはエンジンのリングカウンターに記録され、無音で埋められます。
- **任意の `frames`** — 内部は 512 フレームのエンジンブロックでレンダリングし、余った分は繰り越し FIFO に置きます。ホストブロックが 512 の倍数でなくても（例: 48 kHz で 1024 = 941.6 エンジンフレーム）stall しませんが、FIFO に残った分はその分の遅延になります。遅延の上限は 1 エンジンブロック + リサンプラー遅延で、ホストブロックが 512 の倍数なら繰り越し残量は 0 に固定されます（`st_rt_render_get_latency_frames` を参照）。
- **サンプルレート** — `frames` は `STRT_CreateOptions.hostSampleRate`（0 ならエンジンレート 44100）単位です。0 でなければエンジンが出力側の変換を行います（BUFFERED はレンダリングスレッドで変換）。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `interleavedOut` | 出力バッファー。interleaved float で、`frames × チャンネル数` 個を格納できる必要があります |
| `frames` | 要求フレーム数（ホストレート）、1 以上 |

**戻り値** — 実際に書き込んだフレーム数（正常時は `frames`）。部分的な戻り値（`0 < 戻り値 < frames`）の場合、残りは無音で埋められています。`0` の場合と `st_rt_get_last_status`:

| 状況 | ステータス |
|---|---|
| コンテキスト・バッファーが `NULL`、`frames` ≤ 0 | `ST_STATUS_INVALID_ARGUMENT` |
| DEVICE モードのコンテキスト | `ST_STATUS_UNAVAILABLE` |
| `st_rt_render_start` の前 | `ST_STATUS_UNAVAILABLE` |
| レイアウト切り替えウィンドウ | 0 フレーム（無音として処理） |

</details>

<details>
<summary><code>st_rt_render_get_latency_frames</code> — pull 出力段が保持している遅延を読み取る</summary>

```c
int st_rt_render_get_latency_frames(const STRT_Context* context);
```

**用途** — pull 経路の **出力段** が現在保持している遅延をホストフレームで返します。A/V 同期の補正に使います。

遅延 = 繰り越し FIFO 残量 + 出力リサンプラー遅延 + 入力リサンプラーの固定遅延

**呼び出し方** — 固定値ではなく **呼び出し時点のスナップショット** です。要求 `frames` が 512 の倍数でなければ、呼び出しごとに繰り越し残量の分（0..511 エンジンフレーム相当）だけ揺れ、上限は 1 エンジンブロック + リサンプラー遅延です。A/V 同期に使う場合は、ブロック処理の **直前** に一度読みます。`hostSampleRate` = 0（変換なし）でも繰り越し FIFO があるため 0 でないことがあります。BUFFERED モードではリングに溜まったフレーム（ホストレート） + 変換器の遅延で、上限は約 3 エンジンブロックです。スレッド: `[any]` — どのスレッドから呼んでもブロックしません。

この値は出力段の分だけを数えます。「今プッシュした入力フレームが何フレーム後に出るか」の完全な答えは、この値 + `STStreamStatus.queuedFrames` + エンジン DSP の固定遅延（リミッター遅延など、設定が同じなら定数）です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 遅延（ホストフレーム）。DEVICE モードでは常に `0`。

</details>

<details>
<summary><code>st_rt_render_get_process_stats</code> — 最後のレンダリングブロックの段階別時間を読み取る</summary>

```c
int st_rt_render_get_process_stats(const STRT_Context* context, STProcessStats* outStats);
```

**用途** — 最後に完了した 512 フレームのレンダリングブロックひとつについて、段階別の純粋な演算時間（µs）とタップ数を返します。「レンダリングがなぜ重いか」を、ホストがエンジン内部を見ずに切り分けるときに使います。3 つの出力モードはすべて同じブロック関数なので値の意味も同じです（HOST_PULL はホストコールバック内で計測した値）。

**呼び出し方** — レンダリング中いつでも、どのスレッドからでも呼べます。スレッド: `[any]` — seqlock スナップショット（フィールドごとの atomic、最大 8 回リトライ）なのでブロックしません。対応可否は `ST_CAP_PROCESS_STATS`（機能ワード 0）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outStats` | 出力。呼び出し側が `structSize` / `apiVersion` を埋めます |

**構造体** `STProcessStats`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STProcessStats)` / `ST_ABI_VERSION` |
| `blockSequence` | ブロックごとに +1。0 = まだブロックが一度も動いていない（無音のプリロール中も 0） |
| `sourceInputUs` | 音源入力の読み取り + 9 バンドクロスオーバー + バンド遅延リングへの書き込み（音源の合計） |
| `exactTapsUs` | exact 経路のタップレンダリング（HRIR バスへの累積またはステレオパンニング、音源の合計） |
| `bedUs` | early bed — 音源ごとの send バス合計 + 統合 bed の畳み込み |
| `sendUs` | 残響 send — 音源ごとのバンドバス合計 + リスナー全体の send タップレンダリング |
| `lateUs` | FDN16 後期残響 |
| `outputUs` | 残り — HRTF スペクトル合成・HOA デコード・EQ・リミッター・モードフェード |
| `totalUs` | ブロック全体（`STTiming.auralProcessMs` と同じ区間）。6 段階の合計はこの値と同じか、わずかに小さくなります |
| `activeSources` | 入力が接続された音源の数 |
| `exactTaps` | そのブロックが実際にレンダリングした exact タップ数（音源の合計） |
| `sendTaps` | リスナー全体の send タップ数 — 音源数に関係なく、時間 bin 数が上限です |
| `reserved[8]` | 予約 |

**戻り値** — `1` = 成功 / `0` = 失敗。`NULL`・スタンプ不一致は `ST_STATUS_VERSION_MISMATCH`、エンジン未初期化は `ST_STATUS_INVALID_CONTEXT`、スナップショット失敗は `ST_STATUS_UNAVAILABLE`（`outStats` は変更なし）。

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout</code> — プリセットのスピーカーレイアウトで出力する</summary>

```c
int st_rt_render_set_speaker_layout(STRT_Context* context, int preset);
```

**用途** — ヘッドホンバイノーラルの代わりに実際のスピーカー配置（2.0~7.1）で N チャンネル出力を行います。スピーカー出力では、レイアウトが全体アンビソニックスの early 経路・空間化有効・HRTF 無効を受け持ちます（`st_rt_render_set_options` を参照）。

**呼び出し方** — 通常は `st_rt_render_start(context, 0)` の前に設定します。レンダリング中に呼ぶとオーディオデバイスを stop → 適用 → start で再起動し、デバイスが N チャンネルフォーマットを拒否した場合はステレオに一度降格して再試行します。HOST_PULL 系では pull 出力が再構成され、その間 `st_rt_render_process` は 0 フレームを返します。呼び出し後は `st_rt_render_get_speaker_channels()` で実際の出力幅を読み直します。レイアウトを設定するたびに（同じレイアウトでも）スピーカーチャンネル EQ がすべてクリアされるため、チャンネル EQ はレイアウトを設定した後に設定します。スレッド: `[control, blocking]` — デバイスの再起動を伴うため、ゲームループ・オーディオスレッドからは呼びません。

チャンネル順は WAVEFORMATEXTENSIBLE の標準順（FL FR FC LFE BL BR SL SR のうちレイアウトにないチャンネルはスキップ）に従い、方向の規約はエンジン全体と同じです（azimuth 正面 0° · 右 +90°、elevation 上方向 +）。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `preset` | `0` = 2.0 / `1` = 2.1 / `2` = 4.1 / `3` = 5.1 / `4` = 7.1 / `5` = ラップトップ近接 2.0 |

`5`（LaptopNearfield20、"MacBook Pro 16-inch reference"）は厳密に 2 PCM チャンネルで、`0` と異なるのはリスニングジオメトリ（半角 30° → 15.642°）だけです。機器・OS が受け持つ内蔵スピーカー処理（ウーファー・ワイドステレオ・空間オーディオ DSP など）には手を加えません。

**戻り値** — `1` = 適用 / `0` = 失敗。範囲外の `preset` なら何もせず `0`。

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout_custom</code> — 任意のスピーカー配置で出力する</summary>

```c
int st_rt_render_set_speaker_layout_custom(STRT_Context* context, const float* azimuthDegrees, const float* elevationDegrees, const unsigned char* isLfe, const float* gainTrim, const float* distanceMeters, int channelCount);
```

**用途** — プリセットにないスピーカー配置（ドーム・不規則な配列など）を、チャンネルごとの方向・LFE かどうか・トリム・距離で直接定義します。距離を与えると、最も遠いスピーカーを基準に遅延・1/r レベルを揃え、スピーカーまでの距離が異なる設置を補正します。

**呼び出し方** — 呼び出しタイミング・再起動・チャンネル EQ の初期化・`st_rt_render_get_speaker_channels` の再確認は `st_rt_render_set_speaker_layout` と同じです。チャンネル順は配列の順で、方向の規約はエンジン全体と同じです（azimuth 正面 0° · 右 +90°、elevation 上方向 +）。リミッター・等ラウドネス補正・仮想ベースは 32 チャンネルまで、出力パラメトリック EQ・スピーカーチャンネル EQ は 64 チャンネルまでかかります。スレッド: `[control, blocking]` — デバイスの再起動を伴うため、ゲームループ・オーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `azimuthDegrees` | チャンネルごとの方位角 [°] `channelCount` 個。必須 |
| `elevationDegrees` | チャンネルごとの仰角 [°] `channelCount` 個。必須 |
| `isLfe` | チャンネルごとの LFE かどうか（0/1） `channelCount` 個。必須 |
| `gainTrim` | チャンネルごとの線形トリム `channelCount` 個。`NULL` ならすべて 1.0 |
| `distanceMeters` | チャンネルごとのスピーカー距離 [m] `channelCount` 個（シーン単位ではなくメートル）。`NULL` でなく、すべての非 LFE チャンネルが正なら、レンダリング出力段で最も遠いスピーカー基準の遅延・1/r レベル整列をかけます。`NULL` なら整列しません |
| `channelCount` | チャンネル数、1 以上 |

**戻り値** — `1` = 適用 / `0` = 失敗（`azimuthDegrees`・`elevationDegrees`・`isLfe` が `NULL` か、`channelCount` ≤ 0 など）。

</details>

<details>
<summary><code>st_rt_render_disable_speaker_output</code> — スピーカー出力を無効にしてステレオに戻す</summary>

```c
void st_rt_render_disable_speaker_output(STRT_Context* context);
```

**用途** — スピーカーレイアウト出力を無効にし、既定のステレオ（2 チャンネル）経路に戻します。

**呼び出し方** — レンダリング中ならデバイスの再起動（DEVICE）または pull 出力の再構成（HOST_PULL 系）が発生し、その間 `st_rt_render_process` は 0 フレームを返します。スピーカーチャンネル EQ はすべてクリアされ、`STRenderOptions.reserved0` は再び 0/1 の範囲に制限されます。スレッド: `[control, blocking]` — デバイスの再起動を伴うため、ゲームループ・オーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_render_get_speaker_channels</code> — スピーカー出力のチャンネル数を読み取る</summary>

```c
int st_rt_render_get_speaker_channels(STRT_Context* context);
```

**用途** — スピーカー出力が有効なら現在の出力チャンネル数を返します。HOST_PULL 系では実際の `st_rt_render_process` の出力幅と一致します（0 なら 2 チャンネル）。

**呼び出し方** — 有効判定は `st_rt_render_start` の後に確定します — レイアウトだけを設定してレンダリングを開始していなければ、まだ 0 です。レイアウトを変更した後は読み直してバッファー幅を合わせます。スレッド: `[control]` — 非アトミックなメンバーの読み取りなので、オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 出力チャンネル数。スピーカー出力が無効なら `0`（このとき出力は 2 チャンネル）。

</details>

<details>
<summary><code>st_rt_render_set_speaker_channel_eq</code> — スピーカー出力チャンネルひとつに EQ をかける（ルーム補正）</summary>

```c
int st_rt_render_set_speaker_channel_eq(STRT_Context* context, int32_t channelIndex, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 物理スピーカーごとに測定したルーム補正のように、出力チャンネルひとつにだけかけるパラメトリック EQ です。全チャンネル共通の音色は出力 EQ（`st_rt_render_set_parametric_eq`）が受け持ちます。

**呼び出し方** — スピーカー経路で全体の出力 EQ の直後、マスターゲインの前にかかります。スピーカーレイアウト出力でのみかかり、ステレオ・バイノーラル出力には効果がありません。設定していない（または無効・効果なしの）チャンネルはサンプルに手を加えません。**レイアウトを設定するたびに（`st_rt_render_set_speaker_layout[_custom]`、同じレイアウトでも）、また `st_rt_render_disable_speaker_output` のときに全チャンネルがクリアされます** — チャンネル番号の意味がレイアウトごとに異なり（同じ 3 番が 5.1 では LFE）、古い番号のまま残すと別のスピーカーにかかってしまうためです。レイアウトを設定した後に設定します。チャンネル数は `st_rt_render_get_speaker_channels` と異なり、`st_rt_render_start` の前でもレイアウトを設定した直後から数えます。値が変わると 20 ms のクロスフェードで移行します。スレッド: `[control]` — 出力段だけを変更し、オーディオコールバックからは呼びません。対応可否は `ST_CAP1_SPEAKER_CHANNEL_EQ`（機能ワード 1）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `channelIndex` | 出力チャンネル番号（レイアウトのチャンネル順、LFE を含む）、`[0, レイアウトのチャンネル数)`。64 チャンネルまで |
| `bands` | バンド配列 `bandCount` 個。`bandCount` = 0 なら `NULL` 可。`STParametricEqBand` のフィールド・フィルター定義は `st_rt_render_set_parametric_eq` の項を参照 |
| `bandCount` | バンド数 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` |
| `preampDb` | プリアンプ [dB]、`[−48, +12]` に clamp |
| `enabled` | 0 ならリストは保存しつつスルー |

**戻り値** — `1` = 適用 / `0` = 失敗。`0` のときの `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`（チャンネルの範囲外・レイアウトなし、その他の検証は `st_rt_render_set_parametric_eq` と同じ） / `ST_STATUS_UNAVAILABLE`（`ST_BACKEND_EXA` バックエンド）。

</details>

<details>
<summary><code>st_rt_render_get_speaker_channel_eq</code> — スピーカーチャンネル EQ を読み取る</summary>

```c
int st_rt_render_get_speaker_channel_eq(const STRT_Context* context, int32_t channelIndex, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 出力チャンネルひとつの EQ バンドリスト（clamp された実効値）・プリアンプ・有効状態を返します。設定していないチャンネルは 0 バンド・無効です。

**呼び出し方** — 出力の規約（サイズ問い合わせ、`NULL` 出力のスキップ、容量不足の処理）は `st_rt_render_get_parametric_eq` と同じです。スレッド: `[control]` — オーラライザーの制御ロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `channelIndex` | 出力チャンネル番号、`[0, レイアウトのチャンネル数)` |
| `outBands` | バンド出力配列。`NULL` ならサイズ問い合わせ |
| `bandCapacity` | `outBands` の容量、0 以上 |
| `outBandCount` | バンド数の出力。`NULL` ならスキップ |
| `outPreampDb` | プリアンプ [dB] の出力。`NULL` ならスキップ |
| `outEnabled` | 有効（0/1）の出力。`NULL` ならスキップ |

**戻り値** — `1` = 成功 / `0` = 失敗（`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_UNAVAILABLE`、意味は `st_rt_render_get_parametric_eq` と同じ）。

</details>

<details>
<summary><code>st_rt_render_clear_speaker_channel_eqs</code> — すべてのスピーカーチャンネル EQ を無効にする</summary>

```c
int st_rt_render_clear_speaker_channel_eqs(STRT_Context* context);
```

**用途** — 全チャンネルのスピーカーチャンネル EQ をまとめて無効にします。

**呼び出し方** — 再生中なら 20 ms のランプで移行します。レイアウトがなくても成功します。スレッド: `[control]` — 出力段だけを変更し、オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `1` = 成功 / `0` = 失敗（`ST_BACKEND_EXA` バックエンドは `ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_create</code> — マルチチャンネル入力を再生する仮想スピーカーセットを作成する</summary>

```c
STSpeakerSetId st_rt_speaker_set_create(STRT_Context* context, const STSpeakerSetDesc* desc);
```

**用途** — スピーカーセットは、マルチチャンネル PCM 入力ひとつ（コンテンツチャンネル C 個）を部屋の中の仮想スピーカー N 個で再生します。スピーカーひとつはエンジンが作った音源（メンバー音源）ひとつで、ひとつのチャンネルを複数のスピーカーで分担して出力できます（映画館の配列）。入力リングはセットに **ひとつ**（interleaved）なので、レンダリングブロックごとに一度取り出し、すべてのスピーカーが同じブロック・同じサンプルを読みます — アンダーランも全チャンネル同時なので、チャンネル同士がずれることはありません。ステレオ入力を 3.0/5.1/7.1 に拡張するアップミックス入力にも対応します。

**呼び出し方** — シーン・リスナーを準備した後に作成し、`st_rt_speaker_set_write` でリングを埋めてから `st_rt_speaker_set_play` で再生します。メンバーは作成直後から再生状態に入りますが、セットが play されるまでは無音を出します。メンバーの品質設定（光線数・深さ・輸送更新段階）は、`st_rt_speaker_set_get_source` で受け取った id に生成後いつでも設定できます（最初の伝搬の前なら最初の IR からその値）。スレッド: `[control, blocking]` — メンバー音源 N 個の生成（+指向性・ゲイン）を伴うため、ゲームループ・オーディオスレッドからは呼びません。対応可否は `ST_CAP1_SPEAKER_SET`（機能ワード 1）で確認します。

- **上限** — セット `ST_SPEAKER_SET_MAX_SETS`（12）個、セットあたりチャンネル `ST_SPEAKER_SET_MAX_CHANNELS`（16）・スピーカー `ST_SPEAKER_SET_MAX_SPEAKERS`（64）。セットはホストストリームのスロット（64）を使いません。使っていないスロット・休止中のセットは、レンダリングブロックごとにアトミック読み取りが数回あるだけです。
- **座標** — スピーカーのポーズは **セット座標** で、ワールド = アンカー ∘ セット変換 ∘ スピーカーポーズです。`WORLD` アンカーは恒等（部屋に固定）、`LISTENER` アンカーはリスナー位置 + yaw（+Y 軸回転）です。`LISTENER` アンカーは `st_rt_speaker_set_update` のリスナーフィールドでのみ再計算され、通常のリスナー setter（頭部回転を含む）はセットを動かしません。生成時のアンカーはその時点のリスナー位置・yaw です。クォータニオンは XYZW で、エンジンが正規化します（ノルム `< 1e-12` は拒否）。スピーカーのローカルフレーム・指向性テーブルのフレームは音源と同じです（forward = +Z）。
- **レベル** — メンバーのボリューム（音源ボリュームと同じ位置、3 ms ランプ） = `muted`・`silenced` なら 0、それ以外は `gain × trim`。`ST_SPEAKER_SET_FLAG_ARRAY_TRIM` なら `trim = 1/√N` で、N は同じチャンネルで `muted` でなく `gain` > 0 のスピーカー数です（`silenced` は数える）。LFE に特別な処理はありません。`st_rt_source_get_volume` はランプの目標値を返します。
- **メンバーの所有権** — メンバー音源はセットが所有します。メンバー id に対する入力（`set_audio_*`・`attach_stream`・`clear_audio`）、再生（play/pause/stop/seek/loop/trigger/retrigger）、ポーズ（position/direction/velocity/orientation_q）、放射（directivity/axis_attenuation）、ボリューム・ピッチ・destroy、`st_rt_source_idle`/`_run` は 0 を返すか無視され、`ST_STATUS_INVALID_ARGUMENT` が残ります。品質設定（光線数・深さ・更新段階・EQ・経路の有効化・経路ボリューム）と getter はそのまま使えます。指向性は生成時に決まり、無指向スピーカーの回転はエンジンに送りません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `desc` | セット記述子。呼び出し側が `structSize` / `apiVersion` を埋めます。ポインター配列は呼び出し中のみ読み取ります（コピー） |

**構造体** `STSpeakerSetDesc`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDesc)` / `ST_ABI_VERSION` |
| `channelCount` | コンテンツチャンネル数 `[1, ST_SPEAKER_SET_MAX_CHANNELS]` |
| `speakerCount` | スピーカー数 `[1, ST_SPEAKER_SET_MAX_SPEAKERS]` |
| `speakers` | `STSpeakerDesc` 配列 `speakerCount` 個 |
| `directivities` | 共有指向性テーブルのポインター配列（`STSourceDirectivity`）。同じテーブルを指すスピーカーはエンジンのコピーひとつを共用します。各テーブルの検証は `st_rt_source_set_directivity` と同じです。`NULL` 可（`directivityCount` 0） |
| `directivityCount` | `directivities` の要素数 |
| `anchor` | `STSpeakerSetAnchor` — `ST_SPEAKER_SET_ANCHOR_WORLD`(0) / `ST_SPEAKER_SET_ANCHOR_LISTENER`(1) |
| `position[3]` / `rotationXYZW[4]` | セット変換（アンカー座標） |
| `sampleRate` | 入力レート。エンジンレート（44100）、または `hostSampleRate` を指定したコンテキストならその値である必要があります |
| `capacityFrames` | リング容量（ホストフレーム）、`[512, 1048576]`。0 = 16384 |
| `flags` | `ST_SPEAKER_SET_FLAG_ARRAY_TRIM`（チャンネルを共有するスピーカー N 個に 1/√N） / `ST_SPEAKER_SET_FLAG_STATIC`（メンバー音源を静的 `isDynamic` 0 に） |
| `inputChannels` | アップミックス入力。0 = `channelCount` のまま。2 = ステレオを `channelCount`（3 = L R C、6 = 5.1、8 = 7.1）に拡張 — このとき write はステレオを受け取ります |
| `upmixWindowFrames` | アップミックスのウィンドウ長 `[1024, 65536]` の偶数、0 = 4096。ウィンドウ遅延 = ウィンドウの半分（既定 2048） |
| `reserved[5]` | 0 |

**構造体** `STSpeakerDesc`

| フィールド | 説明 |
|---|---|
| `channel` | このスピーカーが出力するコンテンツチャンネル `[0, channelCount)` |
| `directivityIndex` | -1 = 無指向、それ以外 = `STSpeakerSetDesc.directivities` のインデックス |
| `pose` | `STSpeakerPose` — セット座標のポーズとレベル |
| `reserved[2]` | 0 |

**構造体** `STSpeakerPose`

| フィールド | 説明 |
|---|---|
| `position[3]` / `rotationXYZW[4]` | セット座標の位置・回転 |
| `gain` | 線形圧力 `[0, 16]` |
| `muted` | 0/1 — 1 ならボリューム 0 で、`ARRAY_TRIM` の N から外れます |
| `silenced` | 0/1 — 1 ならボリューム 0 ですが N はそのまま（測定用の単独再生: 残りを `silenced` に） |
| `reserved[2]` | 0 |

**アップミックス入力**（`inputChannels` = 2） — エンジン内蔵のアップミキサーが、左右成分のレベル差で前方の方位（±30°）を、相関度で前・横・後ろ（相関 → 前、無相関 → 横、逆相 → 後ろ）を判定し、スピーカーリングにエネルギーを保存しながら分配します。LFE には (L + R)/2 の低域（80 Hz まで、160 Hz で 0）を加えます。3.0 はセンター抽出で、前方に相関として集まった分だけを FC に移し、残りは L・R に残してステレオイメージを維持します（LFE なし）。出力チャンネル順は 3.0 = FL FR FC、5.1 = FL FR FC LFE SL SR、7.1 = FL FR FC LFE SL SR BL BR で（スピーカーの `channel` 番号と同じ）、想定する角度は FL −30° · FR 30° · FC 0°、5.1 SL −110° · SR 110°、7.1 SL −90° · SR 90° · BL −150° · BR 150° です。アップミックスは write を呼んだプロデューサースレッドでホストレートで動きます（割り当てなし）。ウィンドウ遅延を切り落とすため入力フレーム n = コンテンツフレーム n ですが、入力が `inputDelayFrames` だけ余分に入らないとリングに出てこないため、その分プリフィルを多めに行います。stop/relocate 後の最初の write はアップミックスの履歴も破棄します。

**戻り値** — セットハンドル。失敗なら `v < 0` で、作成途中のメンバーはすべて削除します。`st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH` / `ST_STATUS_INVALID_ARGUMENT`（範囲・非有限・チャンネル・レート・`reserved`） / `ST_STATUS_UNAVAILABLE`（セット `ST_SPEAKER_SET_MAX_SETS` 個を使い切った）。

</details>

<details>
<summary><code>st_rt_speaker_set_destroy</code> — スピーカーセットを削除する</summary>

```c
int st_rt_speaker_set_destroy(STRT_Context* context, STSpeakerSetId set);
```

**用途** — メンバー音源を削除し（3 ms フェード）、セットのスロットを返却します。

**呼び出し方** — セットが不要になったときに呼びます。メンバー id に対する `st_rt_source_destroy` の呼び出しは拒否されるため、必ずこの関数で削除します。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `1` = 削除 / `0` = 存在しないセット。

</details>

<details>
<summary><code>st_rt_speaker_set_get_source</code> — スピーカーひとつのメンバー音源 id を取得する</summary>

```c
STSourceId st_rt_speaker_set_get_source(STRT_Context* context, STSpeakerSetId set, int speakerIndex);
```

**用途** — `speakerIndex` 番のスピーカーを担当するメンバー音源 id を返します。メンバーごとの品質設定（光線数・深さ・輸送更新段階・EQ・経路の有効化・経路ボリューム）と音源の getter に使います。

**呼び出し方** — セットを作成した後いつでも呼べます。最初の伝搬の前に品質を設定すれば、最初の IR からその値になります。入力・再生・ポーズ・放射・ボリューム・ピッチ・destroy はセットが所有するため、この id では拒否されます（`st_rt_speaker_set_create` を参照）。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `speakerIndex` | スピーカー番号 `[0, speakerCount)`（`STSpeakerSetDesc.speakers` の順） |

**戻り値** — メンバー音源 id。失敗（存在しないセット・範囲外）なら `v < 0`。

</details>

<details>
<summary><code>st_rt_speaker_set_update</code> — セット変換・スピーカーポーズ・リスナーを一括更新する</summary>

```c
int st_rt_speaker_set_update(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetUpdate* update, uint32_t* outChanged);
```

**用途** — セット変換、スピーカーのポーズ・レベルすべて、リスナーのポーズ、`ARRAY_TRIM` フラグをまとめて変更します。値が直前の適用値とビット単位で同じならエンジンに送らないため、毎フレーム呼んでも変わったものだけが反映されます。

**呼び出し方** — ゲームループで毎フレーム呼べます。`LISTENER` アンカーのセットはこの呼び出しのリスナーフィールドでのみ再計算され、同じ呼び出しがエンジンのリスナーも同じ配置に移動します（`st_rt_listener_set_position`/`rotation` と同じ意味）。原子性: SYNCHRONOUS スケジューラーでは、次の `st_rt_propagate` が更新全体を一度に参照します。PIPELINED はスピーカー位置すべてとリスナー位置をひとつのリビジョンに入れ、回転の変更はシーンコミットなので位置よりジョブひとつ分早く見えることがあります。`outChanged` が 0 ならエンジンに何も送っていないので、SYNCHRONOUS のホストは propagate をスキップして構いません。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `update` | 更新内容。呼び出し側が `structSize` / `apiVersion` を埋めます。`fields` に含まれるものだけを読み取ります |
| `outChanged` | エンジンに送った項目のビット出力。`NULL` 可。`ST_SPEAKER_SET_CHANGED_LISTENER`（エンジンのリスナーポーズ） / `ST_SPEAKER_SET_CHANGED_POSES`（メンバー音源のワールド位置・回転） / `ST_SPEAKER_SET_CHANGED_GAINS`（メンバー音源のボリューム） |

**構造体** `STSpeakerSetUpdate`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetUpdate)` / `ST_ABI_VERSION` |
| `fields` | 読み取る項目のビット: `ST_SPEAKER_SET_UPDATE_TRANSFORM` / `_SPEAKERS` / `_LISTENER` / `_FLAGS` |
| `position[3]` / `rotationXYZW[4]` | TRANSFORM — セット変換（アンカー座標） |
| `listenerPosition[3]` | LISTENER — リスナー位置（シーン単位） |
| `listenerYaw` | LISTENER — yaw [rad]、+Y 軸 |
| `listenerPitch` | LISTENER — pitch [rad]。リスナーにのみ適用され、アンカーは yaw だけに従います |
| `speakerCount` | SPEAKERS — セットのスピーカー数と同じである必要があります |
| `speakers` | SPEAKERS — `STSpeakerPose` 配列 `speakerCount` 個（すべて）。フィールドは `st_rt_speaker_set_create` の項を参照 |
| `flags` | FLAGS — `ST_SPEAKER_SET_FLAG_ARRAY_TRIM` の有効/無効（それ以外のビットは 0） |
| `reserved[5]` | 0 |

**戻り値** — `1` = 成功 / `0` = 失敗。

</details>

<details>
<summary><code>st_rt_speaker_set_write</code> — セットのリングに interleaved PCM を書き込む</summary>

```c
int st_rt_speaker_set_write(STRT_Context* context, STSpeakerSetId set, const float* interleaved, int frames);
```

**用途** — セットのマルチチャンネルコンテンツをリングに供給します。ファイルデコード・Web PCM・マイクなど、どこから来たものでも同じ方法で書き込みます。

**呼び出し方** — 再生前にプリフィルし、再生中は `st_rt_speaker_set_get_status` の `queuedFrames` を見ながら供給量を調整します。レンダリングが動いていない間も書き込め、エンジン・セットが休止中に書き込んだフレームはリングに残り、起こした後に出力されます。スレッド: `[any]` — 単一プロデューサー専用で、ロック・割り当てはありません（アップミックスもこの呼び出しスレッドで動きます）。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `interleaved` | interleaved float、`frames × 入力チャンネル数` 個。入力チャンネル数 = `channelCount`、アップミックス入力なら 2 |
| `frames` | フレーム数（ホストフレーム = `STSpeakerSetDesc.sampleRate`） |

**戻り値** — `hostSampleRate` = 0 でアップミックスがなければ、リングに実際に入ったフレーム数（バックプレッシャー — 残りは再度書き込みます）。それ以外（`hostSampleRate` 指定またはアップミックス入力）なら常に `frames` で、バックプレッシャーがないため `queuedFrames` で供給量を調整します。あふれた分は `droppedFrames` にのみ残ります。

</details>

<details>
<summary><code>st_rt_speaker_set_write_planar</code> — セットのリングにチャンネル別配列で PCM を書き込む</summary>

```c
int st_rt_speaker_set_write_planar(STRT_Context* context, STSpeakerSetId set, const float* const* channels, int frames);
```

**用途** — `st_rt_speaker_set_write` と同じで、入力だけがチャンネル別（planar）配列です。デコーダーが planar で出力する場合に interleave のコピーを避けられます。

**呼び出し方** — `st_rt_speaker_set_write` と同じです。スレッド: `[any]` — 単一プロデューサー専用、ロック・割り当てなし。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `channels` | チャンネルポインター配列 `channels[入力チャンネル数]`、それぞれ `frames` 個の float。入力チャンネル数 = `channelCount`、アップミックス入力なら 2 |
| `frames` | フレーム数（ホストフレーム） |

**戻り値** — `st_rt_speaker_set_write` と同じです。

</details>

<details>
<summary><code>st_rt_speaker_set_play</code> — セットの再生を開始する</summary>

```c
int st_rt_speaker_set_play(STRT_Context* context, STSpeakerSetId set);
```

**用途** — セット全体の再生を要求します。すべてのメンバーが同じレンダリングブロックで一緒に開始します。

**呼び出し方** — 要求状態は **呼び出し直後** に変わり、音は次のレンダリングブロック境界でセット全体に一度にかかります。そのため、レンダリングが止まっている間も stop → relocate → write（プリフィル） → play が積み重なり、次の最初のブロックでまとめてかかります。play はメンバー音源を含む IR がレンダラーに採用されるまで `ST_SPEAKER_SET_STARTING` で待機し（コンテンツを取り出さない）、その後はリングが空でも開始します（アンダーランとして数える） — ホストが先に埋めます。**最初の再生はフェードインなし** で開始し、一時停止・停止後に再開するときは 132 サンプルのフェードインをかけます。pause 後の再開は止まったそのフレームからです。エンジンが休止中なら、起こした後にブロック境界で解除されます。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `1` = 要求済み / `0` = 失敗（存在しないセットなど）。

</details>

<details>
<summary><code>st_rt_speaker_set_pause</code> — セットを一時停止する（キュー保持）</summary>

```c
int st_rt_speaker_set_pause(STRT_Context* context, STSpeakerSetId set);
```

**用途** — セット全体を一時停止します。リングに溜まったキューを残すため、再び play すると止まったそのフレームから続きます。

**呼び出し方** — 要求は即座に、音は次のレンダリングブロック境界でかかります。停止時はチャンネルごとに最後の出力サンプルから 0 まで 132 サンプルのランプをかけ、リングからそれ以上取り出さないため、`contentFrame` は実際に出力した位置です。すでに部屋に出た残響は鳴り続けます。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `1` = 要求済み / `0` = 失敗（存在しないセットなど）。

</details>

<details>
<summary><code>st_rt_speaker_set_stop</code> — セットを停止する（キューを空にする）</summary>

```c
int st_rt_speaker_set_stop(STRT_Context* context, STSpeakerSetId set);
```

**用途** — セット全体を停止し、リングのキューを空にします。

**呼び出し方** — 要求は即座に、音は次のレンダリングブロック境界でかかります（132 サンプルのランプアウト）。すでに部屋に出た残響は鳴り続けます。シークするには、stop（または pause）直後に `st_rt_speaker_set_relocate` → write（プリフィル） → play の順で呼びます。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `1` = 要求済み / `0` = 失敗（存在しないセットなど）。

</details>

<details>
<summary><code>st_rt_speaker_set_relocate</code> — セットのコンテンツ位置を再設定する（シーク）</summary>

```c
int st_rt_speaker_set_relocate(STRT_Context* context, STSpeakerSetId set, int64_t contentFrame);
```

**用途** — シーク用です。呼び出し時点までに書き込んだフレームを破棄し、次の取り出しから `contentFrame` をこの値から数えます。その後に書き込んだフレームは残ります。

**呼び出し方** — 要求状態が停止・一時停止のときのみ受け付けます（stop 直後にすぐ呼んでも構いません）。入力リサンプラー（`hostSampleRate`）・アップミックスの履歴も次の write で破棄されるため、relocate 後の最初の出力サンプルは、その後に最初に書き込んだホストフレーム（= `contentFrame` の基準値）にサンプル単位で一致します。HOST_PULL_BUFFERED で `st_rt_render_stop`/`start` により出力リングを破棄する前には、`contentFrame − latencyFrames`（聞こえた位置）を読んでおき、この関数で再設定します。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `contentFrame` | 新しいコンテンツ位置の基準（ホストフレーム） |

**戻り値** — `1` = 適用 / `0` = 失敗（再生中、存在しないセットなど）。

</details>

<details>
<summary><code>st_rt_speaker_set_idle</code> — セット（メンバー全員）を休止させる</summary>

```c
int st_rt_speaker_set_idle(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 聞かせるものがないセットの計算・レンダリングコストをなくします。メンバー全員をまとめて（シーンコミット 1 回）休止させ（動作は `st_rt_source_idle` と同じ）、セットのウィンドウがメンバーと同じ長さ（遅延線の長さ + 1 s）の間無音で、原音モードの遅延リングも空になると、レンダリングブロックごとに行っていたリングの取り出し・原音ミックスも停止します（ブロック時刻 `renderFrame` も停止）。

**呼び出し方** — 再生を止めた後（stop・pause・無音の書き込み）に呼びます。休止中に書き込んだフレームはリングに残り、起こした後に出力されます。メンバー id に対する `st_rt_source_idle`/`_run` は拒否されるため、セットはこの関数と `st_rt_speaker_set_run` で扱います。スレッド: `[control]` — シーンロックを取ります。対応可否は `ST_CAP1_ENGINE_IDLE`（機能ワード 1）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `1` = 成功 / `0` = 失敗（`ST_STATUS_NOT_FOUND` 存在しないセット、`ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_run</code> — 休止中のセットを起こす</summary>

```c
int st_rt_speaker_set_run(STRT_Context* context, STSpeakerSetId set);
```

**用途** — `st_rt_speaker_set_idle` で休止させたセットを再び動かします。メンバーを先に起こしてからセットのウィンドウを開くため、その間にレンダリングブロックが挟まってもコンテンツを失いません。

**呼び出し方** — 再び再生する前に呼びます。休止中にリングに書き込んだフレームは、起こした後に出力されます。スレッド: `[control]` — シーンロックを取ります。対応可否は `ST_CAP1_ENGINE_IDLE`（機能ワード 1）で確認します。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `1` = 成功 / `0` = 失敗（`ST_STATUS_NOT_FOUND` 存在しないセット、`ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_get_idle_state</code> — セットの休止状態を読み取る</summary>

```c
int st_rt_speaker_set_get_idle_state(const STRT_Context* context, STSpeakerSetId set);
```

**用途** — セットの休止・実行状態を `STRT_IdleState` で返します。セットとメンバーがすべて休止して初めて IDLE になります。

**呼び出し方** — `st_rt_speaker_set_idle` の後、テールが出きったかを確認するときに使います。スレッド: `[control]` — 制御スレッド用の問い合わせです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |

**戻り値** — `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1、残りの音を出力中) / `ST_RT_IDLE_IDLE`(2)。存在しないセット・コンテキストが `NULL` なら `-1`。

</details>

<details>
<summary><code>st_rt_speaker_set_set_direct</code> — 原音モード（伝搬を省略した直接出力）を設定する</summary>

```c
int st_rt_speaker_set_set_direct(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetDirect* direct);
```

**用途** — 原音モードは伝搬・オーラライゼーションを省略し、セットのチャンネルを出力チャンネルへ直接出力します。有効/無効の切り替え時には、部屋の中のスピーカーの音とコンテンツの原音の間を同じコンテンツ位置でクロスフェードします。同じリング・`contentFrame`・transport・フェードを使い、レンダリングブロックごとに取り出した同じコンテンツサンプルを原音 g、ウェット経路（メンバー音源） 1 − g に分け、g をクロスフェードの間に線形に移動させます。ウェット経路が 0 になっても、すでに部屋に出た残響は自然減衰します。

**呼び出し方** — 毎回設定全体を送り、次のレンダリングブロックから適用されます。セットが音を出していなかった間（停止・一時停止・開始待ち）に変更した設定はクロスフェードなしで即座にかかります — 原音モードで初めて再生すると、最初のサンプルから原音だけが出力されます。原音は `delayFrames` の後に行列を経て出力段（出力 EQ → マスターゲイン → リミッター）の **前** に加算されるため、リミッター・出力段の遅延はウェット経路と同じで、残る差であるウェット経路の伝搬遅延（距離/音速）を `delayFrames` で合わせます。原音が有効な間に `delayFrames` を変更すると、つなぎ合わせずにスキップします。ヘッドホン出力でも原音は HRTF を通りません。原音を一度も有効にしていないセットの出力は、この機能がない場合とビット単位で同一です。スレッド: `[control]` — オーディオコールバックからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `direct` | 原音の設定。呼び出し側が `structSize` / `apiVersion` を埋めます |

**構造体** `STSpeakerSetDirect`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDirect)` / `ST_ABI_VERSION` |
| `enabled` | 0 = ウェット経路（既定）、1 = 原音 |
| `crossfadeMs` | 切り替えの長さ `[0, 1000]` ms。3 ms より短ければ 3 ms |
| `delayFrames` | 原音の遅延（ホストフレーム）、`[0, 1 s]` |
| `outputChannels` | `matrix` の行数。0 なら行列なし（エンジンの既定マッピング） |
| `matrix` | `outputChannels × channelCount`、出力行優先 — `matrix[o * channelCount + c]`。`NULL` 可 |
| `reserved[6]` | 0 |

`outputChannels` が現在の出力チャンネル数（ステレオ 2 · スピーカーレイアウト N）と異なるか、`matrix` が `NULL` ならエンジンの既定マッピングを使います。

| 条件 | 既定マッピング |
|---|---|
| チャンネル数 = 出力数 | そのまま |
| 出力 2 | ITU-R BS.775 ダウンミックス — 3.0 は FL FR FC（FC 0.7071）、それ以外は FL FR FC LFE SL SR [BL BR \| BC] として読み、FC・サラウンド・バック 0.7071、LFE 0（除外）、6.1 の BC は両側 0.5、モノラルは両側 0.7071、それ以外のチャンネル数は偶数 → L · 奇数 → R |
| それ以外 | 先頭から 1:1 |

ダウンミックスは正規化しません（リミッターが受け止めます）。

**戻り値** — `1` = 適用 / `0` = 失敗（`ST_STATUS_VERSION_MISMATCH` · `ST_STATUS_INVALID_ARGUMENT` · `ST_STATUS_NOT_FOUND`）。

</details>

<details>
<summary><code>st_rt_speaker_set_get_status</code> — セットの再生状態・カウンター・時刻を読み取る</summary>

```c
int st_rt_speaker_set_get_status(const STRT_Context* context, STSpeakerSetId set, STSpeakerSetStatus* outStatus);
```

**用途** — セットの transport 状態、リング状態、累積カウンター、サンプル単位の整列用のレンダリング時刻をまとめて返します。供給量の調整（`queuedFrames`）、再生位置の表示、映像とのサンプル単位の同期に使います。

**呼び出し方** — どのスレッドからでも呼べます。フレームフィールドはすべてホストフレーム（エンジンフレームの累計を問い合わせ時に round-half-up で一度換算）で、カウンターは生成時点からの累計です。`state`・`contentFrame`・`renderFrame`・`playRenderFrame`・`playContentFrame` はレンダリングブロックひとつが一緒に書き込む値なので、1 回の呼び出し内で互いに整合します。`latencyFrames` は出力段の状態を別に読むため、レンダリングと別のスレッドで読むと ±1 ブロックずれることがあります — サンプル単位の整列はレンダリング時刻フィールドで行います。スレッド: `[any]` — ブロックしません。

サンプル単位の整列: 再生が `playRenderFrame` で開始した後アンダーランなしで続いたなら、レンダリング位置 r（`renderFrame` 軸）のコンテンツは `playContentFrame + (r − playRenderFrame)` です（3 ms のフェードインを含む）。出力サンプルはその後 `latencyFrames`（出力段 + リミッター）だけ遅れて出ます。音の伝搬遅延（距離/音速）とフィルターの群遅延はここに含まれず、`hostSampleRate` を指定した場合は 2 つの軸の換算の丸めにより ±1 フレームの差が生じることがあります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `set` | セットハンドル |
| `outStatus` | 出力。呼び出し側が `structSize` / `apiVersion` を埋めます |

**構造体** `STSpeakerSetStatus`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetStatus)` / `ST_ABI_VERSION` |
| `state` | `STSpeakerSetState` — `STOPPED`(0) / `PLAYING`(1) / `PAUSED`(2) / `STARTING`(3、play 要求後にメンバー音源を含む IR の採用待ち — コンテンツを取り出さない) |
| `queuedFrames` | リングに溜まった分 |
| `capacityFrames` | エンジンが実際に確保したリング容量 |
| `latencyFrames` | レンダリング → 出力の遅延: 出力段（pull FIFO・バッファードリング・出力リサンプラー） + リミッター |
| `contentFrame` | relocate の基準 + レンダリングがリングから取り出した分 |
| `underrunFrames` | 再生中にリングが空で無音で埋めた分 |
| `droppedFrames` | リングが満杯で破棄した分 |
| `totalWrittenFrames` | リングに実際に入った分 |
| `renderFrame` | コンテキストがこれまでにレンダリングしたフレーム（無音のプリロールブロックを含む） |
| `playRenderFrame` | 最後の再生開始ブロックの最初のサンプルのレンダリング位置。開始前は −1 |
| `playContentFrame` | そのサンプルのコンテンツフレーム |
| `appliedSetters` | `st_rt_speaker_set_update` がエンジンに送った値の数（位置・回転・ゲイン・リスナー位置・回転） |
| `skippedSetters` | ビット単位で同一・無指向の回転のため送らなかった値の数 |
| `directMix` | 原音の割合 0..1（直前のブロック末尾）。0 = ウェット経路のみ |
| `inputDelayFrames` | アップミックスのウィンドウ遅延（ホストフレーム、アップミックスがなければ 0） |
| `reserved[4]` | 予約 |

**戻り値** — `1` = 成功 / `0` = 失敗（`NULL`、スタンプ不一致、存在しないセット）。

</details>

</details>

<details>
<summary><strong>デバッグ · 可視化</strong> — 9 個</summary>

<details>
<summary><code>st_rt_debug_get_frame_generation</code> — 伝搬フレームの世代番号を読み取る</summary>

```c
uint64_t st_rt_debug_get_frame_generation(const STRT_Context* context);
```

**用途** — 新しい伝搬結果が出たかを値の変化だけで軽く検出するカウンターです。デバッグ可視化が毎フレームスナップショットを取り直す必要があるかを判断するときに使います。

**呼び出し方** — いつでもポーリングできます。値が変わっていれば `st_rt_debug_acquire_snapshot` を呼んで新しいスナップショットを取得します。`st_rt_debug_copy_visual_paths` に渡す世代は、この値ではなく `st_rt_debug_acquire_snapshot` が返した `frameGeneration` を使います。スレッド: `[any]` — atomic をひとつ読み取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 現在の世代番号。まだ伝搬結果がないか `context` が `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_debug_set_collect_failed_walks</code> — 途中で失敗した経路 walk も可視化用に収集するかを設定する</summary>

```c
void st_rt_debug_set_collect_failed_walks(STRT_Context* context, int enabled);
```

**用途** — 既定の可視化は、音源からリスナーまで到達した経路だけを含みます。このオプションを有効にすると途中で途切れた walk も収集され、「なぜこの経路がつながらなかったのか」をデバッグできます。

**呼び出し方** — 生成後いつでも呼べ、以降の伝搬結果から反映されます。収集対象の経路種類は `st_rt_debug_set_collect_visual_paths` のマスクで別途指定し、このフラグはそのマスクとは独立に保持されます（`st_rt_debug_get_collect_mask` には現れません）。失敗した walk は `STVisualPathRecord.valid = 0` として入り、コピー時に `ST_VISUAL_PATH_COPY_ALL` で取得します。既定は無効です。スレッド: `[control]` — シーンの書き込みロックを取るため、オーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | `0` = 無効（既定） / `0` 以外の値 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_rt_debug_set_collect_visual_paths</code> — 可視化用に収集する経路種類のマスクを指定する</summary>

```c
int st_rt_debug_set_collect_visual_paths(STRT_Context* context, uint32_t mask);
```

**用途** — エディター・デバッグビューで guide レイ、音源輸送レイ、直接音・透過経路、反射・回折経路を線分として描画するため、伝搬に経路ジオメトリを記録させます。

**呼び出し方** — 生成後いつでも呼べ、以降の伝搬結果から反映されます。収集した結果は `st_rt_debug_acquire_snapshot` → `st_rt_debug_copy_visual_paths` の順で取得します。既定のマスクは `0`（収集しない）です。対応可否は `ST_CAP_PATH_COLLECTION_MASK`。スレッド: `[control]` — シーンの書き込みロックを取るため、オーディオスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mask` | `STPathCollectionFlag` の組み合わせ（下表）。`0` = 収集無効。未定義のビットがあれば拒否 |

**列挙型** `STPathCollectionFlag`

| 値 | 名前 | 収集対象 |
|---|---|---|
| `1u << 0` | `ST_PATH_COLLECTION_GUIDE_RAY` | リスナーから放った guide レイ |
| `1u << 1` | `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY` | 音源輸送レイ |
| `1u << 2` | `ST_PATH_COLLECTION_DIRECT_TRANSMISSION` | 直接音・透過経路 |
| `1u << 3` | `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION` | 反射・回折経路（反射区間を含む混合回折経路があるため 1 ビットにまとめている） |
| 上記 4 つの OR | `ST_PATH_COLLECTION_ALL` | すべて |

**戻り値** — `1` = 適用 / `0` = 拒否（`context` が `NULL`、`mask` に未定義のビット）。

</details>

<details>
<summary><code>st_rt_debug_get_collect_mask</code> — 現在の経路収集マスクを読み取る</summary>

```c
uint32_t st_rt_debug_get_collect_mask(const STRT_Context* context);
```

**用途** — `st_rt_debug_set_collect_visual_paths` で指定した収集マスクを確認します。

**呼び出し方** — いつでも呼べます。失敗 walk の収集有無（`st_rt_debug_set_collect_failed_walks`）はこの値に含まれません。スレッド: `[any]` — atomic のコピーを読み取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STPathCollectionFlag` のビットの組み合わせ。既定 `0`、`context` が `NULL` なら `0`。

</details>

<details>
<summary><code>st_rt_debug_acquire_snapshot</code> — 最新の伝搬診断スナップショットを取得して要約を読み取る</summary>

```c
int st_rt_debug_acquire_snapshot(STRT_Context* context, STPropagationSnapshotInfo* outInfo);
```

**用途** — 最新の伝搬世代ひとつを診断用に固定し、その世代の経路数・可視化バッファーのサイズをまとめて返します。すべての値が **同じ世代** から来たものなので、経路数の統計と可視化経路が互いにずれません。

**呼び出し方** — 可視化経路を取得するには、まずこの関数でスナップショットを取得し、返された `frameGeneration` と個数でバッファーを準備して `st_rt_debug_copy_visual_paths` を呼びます。再度呼ぶと、その間に新しい世代が出ていればその世代に切り替わるため、コピーは最後に取得した世代に対して行います。可視化経路・点の個数は、`st_rt_debug_set_collect_visual_paths` で収集を有効にしたときだけ 0 以外になります。スレッド: `[control]` — 診断ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outInfo` | 出力。呼び出し側が `structSize = sizeof(STPropagationSnapshotInfo)`、`apiVersion = ST_ABI_VERSION` を埋める |

**構造体** `STPropagationSnapshotInfo`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が埋めるスタンプ |
| `frameGeneration` | このスナップショットの世代。`st_rt_debug_copy_visual_paths` にそのまま渡す |
| `collectionMask` | この世代を作るときに使われた収集マスク（`STPathCollectionFlag`） |
| `reserved0` | 予約 |
| `visualPathCount` | 可視化経路の総数（失敗 walk を含む） |
| `validVisualPathCount` | 到達した可視化経路の数。有効な経路は配列の先頭側を占める |
| `visualPointCount` | 可視化点の総数 |
| `validVisualPointCount` | 有効な経路に属する点の数。配列の先頭側を占める |
| `totalPathCount` | この世代の音響経路の総数 |
| `reflectionPathCount` | 反射経路の数 |
| `diffractionPathCount` | 回折経路の数 |
| `sourceSideOnlyPaths` | 音源側の回折エッジだけを持つ回折経路の数 |
| `unclassifiedPaths` | 分類されなかった回折経路の数（正常動作では 0） |
| `sourceSideEvents` | 音源側の回折イベント数 |
| `terminalOnlyPaths` | リスナー側の終端エッジ回折だけを持つ経路の数 |
| `sourceAndTerminalPaths` | 音源側とリスナー側の回折を両方持つ経路の数 |
| `terminalEvents` | リスナー側の終端エッジ回折イベント数 |
| `reserved[4]` | 予約 |

**戻り値** — `1` = 成功 / `0` = `context`・`outInfo` が `NULL`、スタンプ不一致、またはまだ伝搬結果が一度もない。失敗時 `outInfo` は変更されません。

</details>

<details>
<summary><code>st_rt_debug_copy_visual_paths</code> — 取得済みスナップショットの可視化経路と点をコピーする</summary>

```c
int st_rt_debug_copy_visual_paths(STRT_Context* context, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**用途** — デバッグビューで経路を線分として描画するため、経路レコードと頂点配列をホストのバッファーにコピーします。オーディオデータはこのインターフェースを通りません（検査・可視化専用）。

**呼び出し方** — 先に `st_rt_debug_acquire_snapshot` を呼び、その `frameGeneration` と個数でバッファーを準備します: `VALID_ONLY` なら経路 `validVisualPathCount` 個・点 `validVisualPointCount` 個、`ALL` なら `visualPathCount` 個・`visualPointCount` 個。バッファーは該当するセット全体を格納できる必要があり、部分コピーは行いません。各レコードの `points[pointOffset .. pointOffset + pointCount)` が順につながった 1 本の経路です。スレッド: `[control]` — 診断ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `frameGeneration` | `st_rt_debug_acquire_snapshot` が返した世代。取得済みスナップショットの世代と異なれば失敗 |
| `copyMode` | `STVisualPathCopyMode`: `ST_VISUAL_PATH_COPY_VALID_ONLY`(0) = 到達した経路のみ / `ST_VISUAL_PATH_COPY_ALL`(1) = 失敗 walk を含むすべて。それ以外の値は失敗 |
| `outPaths` | 経路レコードの出力配列。コピーする経路が 0 個なら `NULL` 可 |
| `pathCapacity` | `outPaths` の要素数 |
| `outPoints` | 点の出力配列。コピーする点が 0 個なら `NULL` 可 |
| `pointCapacity` | `outPoints` の要素数 |

**構造体** `STVisualPathRecord`

| フィールド | 説明 |
|---|---|
| `pointOffset` | この経路の最初の点が `outPoints` で占めるインデックス |
| `pointCount` | この経路の点の数 |
| `depth` | 経路の深さ（相互作用の次数） |
| `pathKind` | `STPathKind`（下表） |
| `soundSourceIndex` | 音源インデックス。guide レイは `-1` |
| `valid` | `1` = 到達 / `0` = 途中で失敗した walk |
| `totalLengthMeters` | 経路の全長（m） |
| `reserved0` | 予約 |

音響経路の点の順序は 音源 → 相互作用点 → リスナー で、guide レイは リスナー → ヒット点 です。

**列挙型** `STPathKind`

| 値 | 名前 | 意味 |
|---|---|---|
| `0` | `ST_PATH_GUIDE_RAY` | guide レイ |
| `1` | `ST_PATH_DIRECT` | 直接音（透過を含む） |
| `2` | `ST_PATH_REFLECTION` | 反射 |
| `3` | `ST_PATH_DIFFRACTION_UNKNOWN` | 分類されなかった回折（正常動作では出ない） |
| `1 << 2` | `ST_PATH_DIFFRACTION_S` | 音源側のエッジ回折 |
| `1 << 3` | `ST_PATH_DIFFRACTION_L` | リスナー側の終端エッジ回折 |
| `S \| L` | `ST_PATH_DIFFRACTION_SL` | 音源側とリスナー側の回折の両方 |
| `1 << 4` | `ST_PATH_SOURCE_TRANSPORT_RAY` | 音源輸送レイ |

**構造体** `STVisualPoint`

| フィールド | 説明 |
|---|---|
| `x`, `y`, `z` | 点の座標（シーンフレーム） |
| `flags` | `STVisualPointFlag`: `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`(`1u << 0`、回折点) |

**戻り値** — `1` = 成功 / `0` = 失敗: `context` が `NULL`、`copyMode` が範囲外、まだスナップショットがない、`frameGeneration` が取得済みの世代と異なる、バッファー容量不足（または必要なのに `NULL`）。世代の不一致で失敗した場合は、`st_rt_debug_acquire_snapshot` を再度呼んでからコピーします。

</details>

<details>
<summary><code>st_rt_debug_copy_mesh_accel_nodes</code> — メッシュひとつの加速構造（BLAS）のノードボックスをコピーする</summary>

```c
int st_rt_debug_copy_mesh_accel_nodes(STRT_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 伝搬が使うメッシュ加速構造のノード境界ボックスを可視化用に取り出します。メッシュがどう分割されたかを確認したり、エディターに BVH ボックスを重ねて描画したりするときに使います。伝搬が使う構造を読み取るだけです。

**呼び出し方** — `st_rt_mesh_create` の後いつでも呼べます。BLAS はメッシュ生成時点の `st_rt_scene_set_accel` の値でビルドされます。通常は `outNodes = NULL` で先に呼んでノード数を受け取り、バッファーを割り当ててから再度呼びます。大きなメッシュは数千ノードになるため、可視化では `maxDepth` で上位だけを見るのが一般的です。バッファーが足りなければ前順序の先頭部分（最も左の枝から）だけが書き込まれるため、上位だけが欲しい場合は `maxDepth` で切ります。対応可否は `ST_CAP_ACCEL_DEBUG_NODES`。スレッド: `[control]` — シーンの読み取りロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | 対象のメッシュハンドル（`st_rt_mesh_create` が返した値） |
| `maxDepth` | `< 0` = 全深さ。`0` 以上なら `depth ≤ maxDepth` のノードだけを数えて書き込む |
| `outNodes` | 出力配列。`NULL` ならサイズ問い合わせ（`nodeCapacity` は無視） |
| `nodeCapacity` | `outNodes` の要素数。先頭から `min(全体, nodeCapacity)` 個を書き込む |

**構造体** `STAccelNode`（32 バイト、バージョンスタンプのない配列要素）

| フィールド | 説明 |
|---|---|
| `boundsMin[3]` | ノードボックスの最小座標 |
| `boundsMax[3]` | ノードボックスの最大座標 |
| `depth` | 深さ、ルート = `0` |
| `primitiveCount` | リーフ: 含まれるプリミティブ数（≥ 0） / 内部ノード: `-1` |

- **順序**: 深さ優先の前順序（pre-order）。ルートが `[0]` で、各ノードの親は配列の前方で最も近い `depth − 1` のノードです — 親インデックスなしでツリーを復元できます。
- **座標**: メッシュ BLAS は `st_rt_mesh_create` に渡した頂点フレーム（メッシュローカル）です。インスタンスの位置に描画するには、ホストがオブジェクト変換を掛けます。`sceneRatio` の変換はありません。
- **加速構造の種類別の意味**（`st_rt_scene_set_accel` の kind）: BVH 系（`0` BinnedSAH、`2` TinyBVH、`3` LBVH、`4` LBVH_Simd）はビルドされた二分木で、4/8-wide 走査表現のボックスはこのリストの部分集合です。TinyBVH BVH8 のリーフは三角形 4 個以下です。KD（`1` HybridKD）はルートボックスを分割平面で切ってボックスを導出するため、兄弟ボックスは重ならず親を正確に分割します。空のリーフ（`primitiveCount = 0`）がありうるほか、複数のリーフにまたがる三角形はリーフごとに数えます。

**戻り値** — `maxDepth` 内の **全体** のノード数（≥ 0）、失敗時は `-1`（`context` が `NULL`、存在しないメッシュ → `ST_STATUS_NOT_FOUND`）。バッファー不足で切り詰めたコピーも全体数を返し、`st_rt_get_last_status` に `ST_STATUS_BUFFER_TOO_SMALL` を残します。

</details>

<details>
<summary><code>st_rt_debug_copy_scene_accel_nodes</code> — シーン最上位の加速構造（TLAS）のノードボックスをコピーする</summary>

```c
int st_rt_debug_copy_scene_accel_nodes(STRT_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — オブジェクトインスタンスの上にビルドしたシーン加速構造のノードボックスを可視化用に取り出します。静的・動的オブジェクトがシーンでどのようにまとめられたかを確認するときに使います。

**呼び出し方** — `st_rt_build` の後に呼びます。静的 TLAS は `st_rt_build` が発行したものなので、次の `st_rt_build` まではステージングされた静的変更は見えません。動的 TLAS は動的再構築が再発行します。サイズ問い合わせ（`outNodes = NULL`）・`maxDepth`・切り詰めコピーの規約は `st_rt_debug_copy_mesh_accel_nodes` と同じです。対応可否は `ST_CAP_ACCEL_DEBUG_NODES`。スレッド: `[control]` — シーンの読み取りロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `layer` | `STAccelLayer`: `ST_ACCEL_LAYER_STATIC`(0) = `st_rt_build` が発行した静的 TLAS / `ST_ACCEL_LAYER_DYNAMIC`(1) = 動的オブジェクトの TLAS |
| `maxDepth` | `< 0` = 全深さ。`0` 以上なら `depth ≤ maxDepth` のノードのみ |
| `outNodes` | 出力配列。`NULL` ならサイズ問い合わせ |
| `nodeCapacity` | `outNodes` の要素数 |

`STAccelNode` のフィールドは `st_rt_debug_copy_mesh_accel_nodes` の項を参照。TLAS の座標はシーン（ワールド）フレームで、リーフのプリミティブは三角形ではなくオブジェクトインスタンスです。

**戻り値** — `maxDepth` 内の全体のノード数（≥ 0）。その TLAS がまだなければ（ビルド前、該当種類のオブジェクトなし）`0` で、エラーではありません。`-1` = 失敗（`context` が `NULL`、`layer` が範囲外 → `ST_STATUS_INVALID_ARGUMENT`）。切り詰めコピーは `st_rt_debug_copy_mesh_accel_nodes` と同様に `ST_STATUS_BUFFER_TOO_SMALL` を残します。

</details>

<details>
<summary><code>st_rt_debug_build_mesh_accel_nodes</code> — コンテキストなしでメッシュひとつの BLAS をビルドしてノードボックスを返す</summary>

```c
int st_rt_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — ホストのエディターがシーンを作る前にメッシュの加速構造をプレビューするときに使います。`st_rt_mesh_create` と同じ入力検証・同じビルド経路を通るため、同じ `accelKind` ならリアルタイムコンテキストがビルドする BLAS と同じツリーになります。

**呼び出し方** — コンテキストなしでいつでも呼べます。呼び出しごとに BLAS を新たにビルドするため（メッシュサイズに比例するコスト）、結果はホストがキャッシュします。サイズ問い合わせ（`outNodes = NULL`）・`maxDepth`・前順序の規約は `st_rt_debug_copy_mesh_accel_nodes` と同じです。対応可否は `ST_CAP_ACCEL_DEBUG_NODES`。スレッド: `[any]` — グローバル状態を使いません（ビルドコストは呼び出しスレッドが負担します）。

| パラメータ | 説明 |
|---|---|
| `mesh` | 入力メッシュ。`vertices` は xyz インターリーブ（`numVertices × 3` float）、`triangles` は頂点インデックス（`numTriangles × 3` int） |
| `accelKind` | `st_rt_scene_set_accel` の kind: `0` BinnedSAH / `1` HybridKD / `2` TinyBVH / `3` LBVH / `4` LBVH_Simd。`-1` = エンジン既定（TinyBVH、環境変数 `SOUNDTRACING_ACCEL` があればその値） |
| `maxDepth` | `< 0` = 全深さ。`0` 以上なら `depth ≤ maxDepth` のノードのみ |
| `outNodes` | 出力配列。`NULL` ならサイズ問い合わせ |
| `nodeCapacity` | `outNodes` の要素数 |

**構造体** `STMesh`

| フィールド | 説明 |
|---|---|
| `numVertices` | 頂点数 |
| `vertices` | 頂点座標配列（xyz インターリーブ） |
| `numTriangles` | 三角形数 |
| `triangles` | 三角形の頂点インデックス配列（三角形あたり 3 個） |

`STAccelNode` のフィールドとノード順序・座標の規約は `st_rt_debug_copy_mesh_accel_nodes` の項を参照。座標は入力頂点フレームのままです。

**戻り値** — `maxDepth` 内の全体のノード数（≥ 0）。`-1` = 失敗（`mesh` や配列が `NULL`、個数 0 以下、非有限の頂点、範囲外のインデックス、不正な `accelKind`、割り当て失敗）。コンテキストがないため、`st_rt_get_last_status` には何も残りません。

</details>

</details>

<details>
<summary><strong>オフライン(`st_off_*`) — コンテキスト · シーン · 音源 · リスナー</strong> — 72 個</summary>

<details>
<summary><code>st_off_get_api_version</code> — オフライン DLL の ABI バージョンを返す</summary>

```c
uint32_t st_off_get_api_version(void);
```

**用途** — ロードした `SoundTracingOffline` ライブラリがどの ABI バージョンでビルドされたかを知らせます。ホストがコンパイルしたヘッダー（`STTypes.h` の `ST_ABI_VERSION`）と DLL が同じ構造体レイアウトを使っているかを確認する唯一の判定手段です。

**呼び出し方** — ライブラリをロードした直後、コンテキストを作る前に一度呼んで `ST_ABI_VERSION` と比較します。異なれば構造体レイアウトがずれているため、使用を中止します。すべてのバージョンスタンプ付き構造体の `apiVersion` フィールドにもこの値（`ST_ABI_VERSION`）を入れます。スレッド: `[any]` — コンパイル時定数なので、どのスレッドからでもブロックなしで呼べます。

**パラメータ** — なし。

**戻り値** — ライブラリの ABI バージョン（`ST_ABI_VERSION` と同じ値なら互換）。

</details>

<details>
<summary><code>st_off_get_version_string</code> — 製品リリースのバージョン文字列を返す</summary>

```c
const char* st_off_get_version_string(void);
```

**用途** — ログ・診断画面に表示する製品リリースのバージョンを、人が読める文字列で返します。

**呼び出し方** — いつでも呼べます。ABI 互換性の判定には使いません — その判定は `st_off_get_api_version` で行います。スレッド: `[any]` — ブロックしません。

**パラメータ** — なし。

**戻り値** — DLL が所有する静的な NUL 終端文字列。呼び出し側は解放しません。

</details>

<details>
<summary><code>st_off_get_capabilities</code> — 機能ワード 0（<code>ST_CAP_*</code>）を返す</summary>

```c
uint64_t st_off_get_capabilities(void);
```

**用途** — このオフラインライブラリが対応する機能をビットマスクで知らせます。機能が選択的に追加される ABI なので、ホストは関数の存在ではなくこのビットで対応可否を判断します。

**呼び出し方** — 初期化時に一度読んでおき、`ST_CAP_*` ビットとの AND で確認します。例: `ST_CAP_OFFLINE`、`ST_CAP_SCENE_RAYCAST`、`ST_CAP_SOURCE_DIRECTIVITY`、`ST_CAP_SCENE_RATIO`、`ST_CAP_THREAD_ATTRIBUTES`、`ST_CAP_SOURCE_EQ` など。リアルタイム DLL とは集合が異なります — リアルタイム専用ビット（`ST_CAP_REALTIME_SINGLE` / `ST_CAP_REALTIME_MULTI`、`ST_CAP_RUNTIME_DELAY_RESIZE`、`ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`、`ST_CAP_ENGINE_TIMING` など）はなく、`ST_CAP_OFFLINE_*` ビットがあります。Exa バックエンドを含むビルドでは `ST_CAP_BACKEND_EXA` が加わります。ワード 1 以上の機能（`ST_CAP1_*`）は `st_off_get_capability_word` で読みます — 異なるワードのビットを混ぜて AND しません。スレッド: `[any]` — コンパイル時定数です。

**パラメータ** — なし。

**戻り値** — 機能ワード 0 のビット OR（`st_off_get_capability_word(0)` と同じ値）。

</details>

<details>
<summary><code>st_off_get_capability_word</code> — 機能ワード n を返す</summary>

```c
uint64_t st_off_get_capability_word(uint32_t word);
```

**用途** — ワード 0 の 64 ビットが埋まった後に追加された機能をワード単位で照会します。この関数があること自体は、ワード 0 の `ST_CAP_CAPABILITY_WORDS` ビットでわかります。

**呼び出し方** — 初期化時に必要なワードを読み、同じワードの定数（`ST_CAP1_*` はワード 1）とだけ AND します。オフライン DLL のワード 1 には `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN`、`ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`、`ST_CAP1_OFFLINE_MAX_DELAY`、`ST_CAP1_SOURCE_PARAMETRIC_EQ`、`ST_CAP1_LISTENER_ORIENTATION_Q` が含まれます。スレッド: `[any]` — コンパイル時定数です。

| パラメータ | 説明 |
|---|---|
| `word` | ワード番号。`0` = `st_off_get_capabilities()` と同じ値、`1` = `ST_CAP1_*` ワード。ヘッダーが知っているワード数は `ST_CAPABILITY_WORD_COUNT` で、それ以外の番号は `0` を返します |

**戻り値** — 該当ワードのビット OR。不明なワードは `0`（= 該当する機能なし）。

</details>

<details>
<summary><code>st_off_get_sample_rate</code> — エンジンのサンプルレート（44100 Hz）を返す</summary>

```c
int st_off_get_sample_rate(void);
```

**用途** — エンジンが IR とオーディオを生成する固定サンプルレートを知らせます。オフラインレンダリング結果のサンプル数を時間に変換したり、別のレートにリサンプルするかを判断したりするときに使います。

**呼び出し方** — いつでも呼べます。値は 44100 Hz 固定で、ホストが別のレートを使う場合、リサンプルはホストの役割です。スレッド: `[any]` — コンパイル時定数です。

**パラメータ** — なし。

**戻り値** — `44100`。

</details>

<details>
<summary><code>st_off_set_thread_attributes</code> — エンジンのスレッド種類ごとに優先度・コアの優先指定・affinity を指定する</summary>

```c
int st_off_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**用途** — エンジンが作るスレッドの属性を、ホストがスレッドの **生成前に** 決めます。ホストが自身のスレッド予算・優先度ポリシーの中にエンジンの計算スレッドを収めるためのインターフェースです。

**呼び出し方** — `st_off_create` の **前に** 呼ぶのが契約です。すでに開始したスレッドには適用されず、以降に作られるスレッド（次の `st_off_create` の計算プールなど）から適用されます。テーブルはコンテキストに関係のない **プロセス全体** のもので、リアルタイム DLL とオフライン DLL はそれぞれ独自のテーブルを持ちます — 両方の DLL を併用する場合は、`st_rt_set_thread_attributes` とこの関数の両方に同じ値を設定する必要があります。オフラインシェルで実際に意味があるのは `ST_THREAD_COMPUTE_POOL` だけで、それ以外の種類は値が保存されるだけで適用されるスレッドがありません（バッチワーカーは `STThreadType` に属しません）。`affinityMask` とコアの優先指定フラグは Windows でのみ反映され、macOS では無視されます（QoS クラスが配置を決めます）。対応可否は `ST_CAP_THREAD_ATTRIBUTES`。スレッド: `[any]` — プロセス全体のテーブルをミューテックスで一度更新します。

| パラメータ | 説明 |
|---|---|
| `threadType` | `STThreadType` の値、`[0, ST_THREAD_TYPE_COUNT)`。オフラインで適用されるのは `ST_THREAD_COMPUTE_POOL`(4) — 計算プールのワーカー（`maxComputeThreads` N > 1 のとき N 個） |
| `attributes` | 指定する属性。呼び出し側が `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION` を埋めます。`NULL` ならその種類を既定値に戻します |

**構造体** `STThreadAttributes`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)`。呼び出し側が埋める |
| `apiVersion` | `ST_ABI_VERSION`。呼び出し側が埋める |
| `priority` | `STThreadPriority` — `ST_THREAD_PRIORITY_DEFAULT`(0、プラットフォームの既定のまま) / `LOW`(1) / `BELOW_NORMAL`(2) / `NORMAL`(3) / `ABOVE_NORMAL`(4) / `HIGH`(5) / `TIME_CRITICAL`(6)。Windows は同名のスレッド優先度（LOW→LOWEST、HIGH→HIGHEST）に、macOS は QoS クラス（LOW→BACKGROUND、BELOW_NORMAL→UTILITY、NORMAL→USER_INITIATED、それ以上→USER_INTERACTIVE）にマッピングされます |
| `flags` | `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` / `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES`。両方を同時に有効にすると拒否されます。Windows のみ反映 |
| `affinityMask` | 論理プロセッサのビットマスク、`0` = 指定なし。Windows のみ反映し、64 個を超えるマシンでは現在のプロセッサグループ内でのみ解釈されます |
| `reserved[4]` | すべて `0` である必要があります |

**戻り値** — `1` = 成功 / `0` = 失敗: `threadType` の範囲外、`structSize`/`apiVersion` の不一致、`priority` の範囲外、コアの優先指定フラグの競合、`reserved[]` が 0 でない。コンテキストを受け取らないため、`st_off_get_last_status` には何も残りません。

</details>

<details>
<summary><code>st_off_get_thread_attributes</code> — 保存されたスレッド属性の要求値を読み取る</summary>

```c
int st_off_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**用途** — `st_off_set_thread_attributes` で指定しておいた値を確認します。

**呼び出し方** — いつでも呼べます。返す値は実際にスレッドに適用された値ではなく、保存された **要求値** そのものです。指定していない種類の既定値は `priority` = `ST_THREAD_PRIORITY_DEFAULT` · `flags` = 0 · `affinityMask` = 0 です。スレッド: `[any]` — プロセス全体のテーブルをミューテックスで一度読み取ります。

| パラメータ | 説明 |
|---|---|
| `threadType` | `STThreadType` の値、`[0, ST_THREAD_TYPE_COUNT)` |
| `outAttributes` | 結果を受け取る構造体。呼び出し側が `structSize`/`apiVersion` を埋めます。フィールドは `st_off_set_thread_attributes` の項を参照 |

**戻り値** — `1` = 成功 / `0` = 拒否（`outAttributes` が `NULL`、スタンプ不一致、`threadType` の範囲外）。

</details>

<details>
<summary><code>st_off_get_thread_inventory</code> — このコンテキストが起動したスレッド数を種類別に読み取る</summary>

```c
int st_off_get_thread_inventory(const STOFF_Context* context, STThreadInventory* outInventory);
```

**用途** — コンテキストが現在実際にいくつのスレッドを占有しているかを種類別の数値で返します。ホストがスレッド予算を推測ではなく測定値に基づいて立てられるようにするためのものです。

**呼び出し方** — コンテキストを作った後いつでも呼べます。オフラインシェルには伝搬レーン・オーディオレンダリング・デバイス・ファイルデコーダーのスレッドがないため、値が入るのは `ST_THREAD_COMPUTE_POOL` だけです — `maxComputeThreads` が N > 1 なら N、1 なら 0（呼び出し側スレッドでインライン実行）。`ST_THREAD_ACCEL_BUILD` は予約された役割なので 0 です。種類ごとの値はそれぞれ独立した atomic なので、同じ瞬間のスナップショットではありません。対応可否は `ST_CAP_THREAD_INVENTORY`。スレッド: `[any]` — atomic カウンターだけを読むのでブロックしません。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outInventory` | 結果を受け取る構造体。呼び出し側が `structSize = sizeof(STThreadInventory)`、`apiVersion = ST_ABI_VERSION` を埋めます |

**構造体** `STThreadInventory`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STThreadInventory)`。呼び出し側が埋める |
| `apiVersion` | `ST_ABI_VERSION`。呼び出し側が埋める |
| `countByRole[ST_THREAD_TYPE_COUNT]` | `STThreadType` の順の種類別スレッド数（インデックス = 種類）。オフラインでは `[ST_THREAD_COMPUTE_POOL]` だけが 0 以外になりえます |
| `reserved[5]` | 予約 |

**戻り値** — `1` = 成功 / `0` = `context`・`outInventory` が `NULL` またはスタンプ不一致（`st_off_get_last_status` に `ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_off_init_create_options</code> — <code>STOFF_CreateOptions</code> を既定値で埋める</summary>

```c
void st_off_init_create_options(STOFF_CreateOptions* outOptions);
```

**用途** — コンテキスト生成オプションをバージョンスタンプと既定値で初期化します。ホストが変更したいフィールドだけを上書きし、残りはエンジンの既定値を受け取れるようにするためのものです。

**呼び出し方** — `st_off_create` の直前に呼びます。構造体全体を 0 でクリアしてから `structSize` と `apiVersion` を埋めるため、0 が「既定」を意味するフィールドはすべて既定値になります。続けて必要なフィールド（`maxComputeThreads`、`sceneRatio` など）だけを変更し、`st_off_create` に渡します。スレッド: `[any]` — 呼び出し側が所有する POD を埋めるだけです。

| パラメータ | 説明 |
|---|---|
| `outOptions` | 埋める構造体。`NULL` なら何もしません |

**構造体** `STOFF_CreateOptions`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STOFF_CreateOptions)`。この関数が埋めます |
| `apiVersion` | `ST_ABI_VERSION`。この関数が埋めます |
| `seedValue` | 既定 `0`。既定（ST）バックエンドの出力には影響しません — ABI 互換と Exa バックエンドのために残っているフィールドです |
| `maxComputeThreads` | コンテキストが使う計算スレッドの上限。`0` = 自動 = min(パフォーマンスコア数, 6)、最小 1。この値がエンジン所有の共有計算プールの幅になり、オフラインシェルではこれがコンテキストの作るスレッドのすべてです — `1` ならプールスレッド 0 個（すべての計算を呼び出しスレッドでインライン実行）、N > 1 なら計算プールのワーカー N 個。環境変数の影響はありません。バッチワーカーはコンテキストではなく、`st_off_batch_create` が作ったバッチオブジェクトが所有します。対応可否は `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | シーン単位 → メートルの変換係数。`0` = 既定 = `1.0`（シーン単位がそのままメートル）。センチメートルのホストは `0.01f`、フィートのホストは `0.3048f`。**初期化専用** で、実行時の setter はありません。座標はシーン単位のまま入れ、エンジンは伝搬遅延・距離減衰・空気吸収・残響記述子・`...Meters` 出力フィールドのようにメートルが必要な箇所でのみこの係数を掛けます。非有限値や 0 以下（0 を除く）は `st_off_create` が拒否します。対応可否は `ST_CAP_SCENE_RATIO` |
| `backend` | `STBackend` — `ST_BACKEND_ST`(0、既定) / `ST_BACKEND_EXA`(1)。生成時にパイプライン全体を選び、実行時の切り替えはありません。Exa はライブラリが `ST_CAP_BACKEND_EXA` を公開している場合にのみ使えます |
| `reserved[5]` | 予約。0 にしておきます |

オフラインオプションには、リアルタイムの `scheduler`・`maxDelaySeconds`・`renderOutputMode`・`hostSampleRate`・`startIdle`・`maxSources` に相当するフィールドがありません — スケジューラーなしで呼び出しスレッドがパイプラインを駆動し、デバイス・ストリーミング・音源予算がないためです。レンダリング遅延リングの長さは、生成後に `st_off_render_set_max_delay_seconds` で設定します（既定 4.0 s）。

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_create</code> — オフラインコンテキストを作成する</summary>

```c
STStatus st_off_create(const STOFF_CreateOptions* options, STOFF_Context** outContext);
```

**用途** — オフラインエンジンのインスタンス（シーン・材質・音源・リスナー・IR キャッシュを所有）とその計算プールを作成します。オフラインコンテキストは、デバイス・オーディオレンダリング・伝搬ワーカースレッドなしで、呼び出しスレッドが `st_off_ir_compute` で伝搬を一度実行して決定的な IR を作る用途です。

**呼び出し方** — 必要なら先に `st_off_set_thread_attributes` を呼び、`st_off_init_create_options` でオプションを初期化してから呼び出します。成功直後の状態: リスナーがひとつ自動的に作られて有効になっており（id `1`、位置 (0,0,0)、向きは恒等）、IR キャッシュは空なので、`st_off_ir_compute` の前はレンダリング系が `ST_STATUS_UNAVAILABLE` で失敗します。三角形交差カーネルは `0`（MollerTrumbore）、early 空間モードは `ST_EARLY_SPATIAL_OBJECTS`、レンダリング遅延リングは 4.0 s で、それ以外の既定値（大気・距離減衰・エネルギーターゲット・経路種類・音響機能・音源の既定値）はリアルタイムと同じです。互いに **異なる** コンテキストであれば、`st_off_create`/`st_off_destroy` を複数のスレッドから同時に呼んでも構わず、別のコンテキストの compute・レンダリング・バッチ処理と重なっても構いません（Exa バックエンドは、異なるコンテキストであっても compute を同時に実行してはいけません）。失敗理由の文字列は `st_off_get_last_error(NULL, ...)` で同じスレッドから読みます。スレッド: `[control, blocking]` — エンジンと計算プールを作る長い区間です。

| パラメータ | 説明 |
|---|---|
| `options` | 生成オプション。`NULL` なら `st_off_init_create_options` の既定値を使います。フィールドは `st_off_init_create_options` の項を参照 |
| `outContext` | 作成したコンテキストを受け取るポインター。失敗すると `NULL` が入ります |

**戻り値** — `STStatus`: `ST_STATUS_OK` = 成功 / `ST_STATUS_INVALID_ARGUMENT` = `outContext` が `NULL`、不明またはこのビルドにない `backend`、不正な `sceneRatio` / `ST_STATUS_VERSION_MISMATCH` = `structSize`・`apiVersion` の不一致 / `ST_STATUS_INITIALIZATION_FAILED` = エンジンの初期化失敗 / `ST_STATUS_ALLOCATION_FAILED` = メモリ割り当て失敗。

</details>

<details>
<summary><code>st_off_get_backend</code> — コンテキストが使うバックエンドを返す</summary>

```c
int st_off_get_backend(const STOFF_Context* context);
```

**用途** — 生成時に `STOFF_CreateOptions.backend` で選んだパイプラインを確認します。

**呼び出し方** — 生成後いつでも呼べます。バックエンドは生成時に確定し、実行時には変更できません。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STBackend` の値（`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1）。`context` が `NULL` なら `-1`。

</details>

<details>
<summary><code>st_off_destroy</code> — オフラインコンテキストを破棄する</summary>

```c
void st_off_destroy(STOFF_Context* context);
```

**用途** — コンテキストと、そのエンジン・計算プール・IR キャッシュを解放します。

**呼び出し方** — そのコンテキストに対する他の呼び出しがすべて終わった後に呼びます。破棄中または破棄済みのコンテキストを他のスレッドが使ってはいけません。バッチ（`st_off_batch_*`）に登録したコンテキストは、そのジョブの完了レコードを `st_off_batch_poll` で受け取った後にのみ破棄します。この関数はそのコンテキストの計算プールのワーカーだけを join します（`maxComputeThreads` が 1 なら join するスレッドはありません）。異なるコンテキストであれば、複数のスレッドから同時に呼んでも構いません。スレッド: `[control, blocking]`。

| パラメータ | 説明 |
|---|---|
| `context` | 破棄するコンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_get_last_status</code> — 最後の呼び出しのステータスコードを読み取る</summary>

```c
STStatus st_off_get_last_status(const STOFF_Context* context);
```

**用途** — `0`/`-1`/失敗ハンドルだけを返す関数がなぜ失敗したかを、ステータスコードで確認します。

**呼び出し方** — 失敗を返した呼び出しの直後に、同じスレッドで呼びます。コンテキストごとに診断フィールドがひとつなので、同じコンテキストを複数のスレッドで同時に使うと値が混ざることがあります。人が読むメッセージは `st_off_get_last_error`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STStatus`: `ST_STATUS_OK`(0) / `INVALID_CONTEXT`(1) / `INVALID_ARGUMENT`(2) / `VERSION_MISMATCH`(3) / `INITIALIZATION_FAILED`(4) / `ALLOCATION_FAILED`(5) / `NOT_FOUND`(6) / `BUFFER_TOO_SMALL`(7) / `INVALID_MATERIAL`(8) / `STALE_SNAPSHOT`(9) / `UNAVAILABLE`(10)。`context` が `NULL` なら `ST_STATUS_INVALID_CONTEXT`。

</details>

<details>
<summary><code>st_off_get_last_error</code> — 最後のエラーメッセージをコピーする</summary>

```c
int st_off_get_last_error(const STOFF_Context* context, char* outMessage, int capacity);
```

**用途** — 最後の失敗について、人が読める説明（例: 検証器の拒否理由）を取得します。`context` を `NULL` で渡すと `st_off_create` の失敗理由を取得できます — その場合はコンテキストが存在しないためです。

**呼び出し方** — 失敗直後に同じスレッドで呼びます。`NULL` コンテキストで呼ぶと、この呼び出しスレッドで最後に失敗した `st_off_create` のメッセージを返し、次の create がそれを消去します。必要なサイズがわからなければ、`outMessage = NULL` で先に呼んで長さを受け取ります。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル。`NULL` ならこのスレッドの最後の create 失敗メッセージ |
| `outMessage` | メッセージを受け取るバッファー。`NULL` ならコピーせず長さだけを返します |
| `capacity` | `outMessage` のバイト数。足りなければ切り詰めて NUL で終端します |

**戻り値** — メッセージ全体を格納するのに必要なバイト数（NUL を含む）。戻り値が `capacity` より大きければ切り詰められています。

</details>

<details>
<summary><code>st_off_material_create</code> — 音響材質をひとつ登録する</summary>

```c
STMaterialId st_off_material_create(STOFF_Context* context, const STMaterial* material);
```

**用途** — メッシュ表面に使う 9 バンドの音響材質（反射・吸収・透過・散乱）を登録し、ハンドルを受け取ります。材質の係数はエンジンが補正しない厳密な入力なので、登録時点で検証して不正な値を即座に拒否します。

**呼び出し方** — メッシュを作る前に必要な材質をすべて登録し、受け取ったハンドルを `st_off_mesh_create` の `material`（または三角形ごとの材質インデックス）に使います。複数の材質はこの関数を繰り返し呼んで登録し、返される id は登録順に連続します。リアルタイムの `st_rt_material_create` と同じ契約です。スレッド: `[control]` — シーンの書き込みロックを取るため、短時間ブロックすることがあります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `material` | 登録する材質。呼び出し側が `structSize`/`apiVersion` を埋めます |

**構造体** `STMaterial`

| フィールド | 説明 |
|---|---|
| `structSize` | `sizeof(STMaterial)`。係数を読む前に検証します |
| `apiVersion` | `ST_ABI_VERSION` |
| `reflection[ST_FREQUENCY_BANDS]` | バンドごとの反射エネルギー比、`[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | バンドごとの吸収エネルギー比、`[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | バンドごとの透過エネルギー比、`[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 反射エネルギーのうちの拡散比、`[0, 1]`。R+A+T の合計チェックからは除外されます |
| `reserved[8]` | 予約 |

バンド順は 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz（`ST_FREQUENCY_BANDS` = 9）です。すべての係数は **エネルギー領域** の無次元比で、バンドごとに `|R + A + T − 1| ≤ ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`（0.001）を満たす必要があります。エンジンは値の導出・正規化・クランプ・補間を行いません。

**戻り値** — 材質ハンドル `STMaterialId`。失敗は `v < 0`: `context`・`material` が `NULL` なら `ST_STATUS_INVALID_ARGUMENT`、係数の検証に引っかかれば `ST_STATUS_INVALID_MATERIAL`（スタンプ不一致は `ST_STATUS_VERSION_MISMATCH`）が `st_off_get_last_status` に残り、理由は `st_off_get_last_error` で読み取ります。

</details>

<details>
<summary><code>st_off_material_load_defaults</code> — 既定の材質ライブラリを丸ごと登録する</summary>

```c
STMaterialId st_off_material_load_defaults(STOFF_Context* context);
```

**用途** — 材質の係数を自分で用意しなくてもシーンを構成できるよう、エンジン内蔵の既定材質セットをまとめて登録します。

**呼び出し方** — メッシュを作る前に呼びます。返されたハンドルがセットの最初の材質で、以降の材質は `v+1`、`v+2` … の順に連続します。リアルタイムの `st_rt_material_load_defaults` と同じ契約です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 最初の材質のハンドル `STMaterialId`。失敗は `v < 0`。

</details>

<details>
<summary><code>st_off_scene_set_edge_split_collinear_overlaps</code> — メッシュのエッジトポロジーのコンパイルオプションをオン/オフする</summary>

```c
void st_off_scene_set_edge_split_collinear_overlaps(STOFF_Context* context, int enabled);
```

**用途** — `st_off_mesh_create` がメッシュの音響エッジ（回折候補）のトポロジーをコンパイルするとき、一直線上で重なるエッジを分割して扱うかを決めるシーンビルドオプションです。

**呼び出し方** — メッシュを作る前に呼びます。この呼び出しの後に追加されるメッシュにのみ適用され、すでに作ったメッシュは生成時にコンパイルしたトポロジーを維持します。対応可否は `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`。リアルタイムの `st_rt_scene_set_edge_split_collinear_overlaps` と同じ契約です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | `0` = 無効 / それ以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_scene_set_solid_wedge_gate</code> — 2 面回折ウェッジの角度区間による棄却をオン/オフする</summary>

```c
void st_off_scene_set_solid_wedge_gate(STOFF_Context* context, int enabled);
```

**用途** — 回折経路を検証するとき、2 面からなるウェッジ（wedge）のソリッド側の角度区間を通る経路を棄却するゲートです。既定は無効です。

**呼び出し方** — 伝搬時に適用されるオプションなので、`st_off_ir_compute` の前に設定します。有効にするとウェッジの凸/凹判定にメッシュのワインディング（三角形の頂点順が与える法線の符号）が使われるため、ワインディングを反転すると棄却される回折経路の集合が逆になります — ひとつのメッシュ内ではワインディングを一貫させ、可能なら法線が空気側を向くようにします。対応可否は `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`。リアルタイムの `st_rt_scene_set_solid_wedge_gate` と同じ契約です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `enabled` | `0` = 無効（既定） / それ以外 = 有効 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_scene_set_accel</code> — メッシュ・静的加速構造の種類を選ぶ</summary>

```c
int st_off_scene_set_accel(STOFF_Context* context, int kind);
```

**用途** — レイ交差に使う BLAS・静的加速構造の実装をホストが選びます。シーンの規模や、ビルド時間・クエリ速度の優先度に応じて構造を切り替えて比較できるようにします。

**呼び出し方** — オブジェクトを入れる前に呼びます。以降のビルドにのみ適用されます。既定は `2`（TinyBVH）です。リアルタイムの `st_rt_scene_set_accel` と完全に同じ契約です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH（既定） / `3` = LBVH / `4` = LBVH_Simd |

**戻り値** — `1` = 適用 / `0` = `kind` が範囲外またはコンテキストなし。

</details>

<details>
<summary><code>st_off_scene_set_triangle_intersection</code> — 三角形交差カーネルを選ぶ</summary>

```c
int st_off_scene_set_triangle_intersection(STOFF_Context* context, int kind);
```

**用途** — レイ–三角形交差の計算方式を選びます。既定値はリアルタイムと同じ MollerTrumbore なので、オフラインはリアルタイムと同じ幾何統計を出します。

**呼び出し方** — カーネルは `st_off_mesh_create` の時点でメッシュに固定されるため、この呼び出しの **後に追加するメッシュにのみ** 適用されます（既存のメッシュには遡及せず、メッシュごとにカーネルが異なっても有効な構成です）。通常はメッシュを作る前に一度呼びます。3 つのカーネルはいずれも両面交差で、バックフェースカリングはありません。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `kind` | `0` = MollerTrumbore（既定） / `1` = PluckerAdaptive / `2` = Watertight |

**戻り値** — `1` = 適用 / `0` = 不正な `kind` またはコンテキストなし。

</details>

<details>
<summary><code>st_off_scene_get_triangle_intersection</code> — 次のメッシュに適用される交差カーネルを読み取る</summary>

```c
int st_off_scene_get_triangle_intersection(const STOFF_Context* context);
```

**用途** — `st_off_scene_set_triangle_intersection` で指定した値を確認します。

**呼び出し方** — いつでも呼べます。値は **次の `st_off_mesh_create` に適用される** カーネルで、すでに作ったメッシュのカーネルとは異なる場合があります。スレッド: `[control]` — シーンの読み取りロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight。

</details>

<details>
<summary><code>st_off_scene_raycast</code> — エンジンの加速構造で最近接ヒットを問い合わせる</summary>

```c
int st_off_scene_raycast(STOFF_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**用途** — 伝搬が使うのとまったく同じ加速構造（静的+動的 TLAS）にレイを 1 本飛ばし、最も近いヒットを返します。ホストが自身の物理エンジンとは別に、エンジンが実際に見ている音響ジオメトリを確認・デバッグできるようにします。

**呼び出し方** — `st_off_build` の後に呼びます。ビルド前ならエラーなしでミスになります。読み取り専用の問い合わせなので、パイプラインの状態は変わりません。対応可否は `ST_CAP_SCENE_RAYCAST`。スレッド: `[control]` — シーンの読み取りロックだけを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `origin` | レイの原点、ワールド座標 3 成分（シーン単位）。有限である必要があります |
| `direction` | レイの方向 3 成分。エンジンが正規化し、有限かつゼロベクトルでない必要があります |
| `maxDistanceMeters` | 最大距離（メートル）。`sceneRatio` でシーン単位に戻して適用します。`≤ 0` または非有限値 = 無限 |
| `outHit` | 結果。呼び出し側が `structSize = sizeof(STRayHit)`、`apiVersion = ST_ABI_VERSION` を埋めます |

**構造体** `STRayHit`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が埋める |
| `hit` | `1` = ヒット / `0` = ミス |
| `distanceMeters` | 原点からヒット点までの距離（シーン距離 × `sceneRatio`）。ミスなら 0 |
| `point[3]` | ヒット点、シーン座標のまま。ミスなら 0 |
| `normal[3]` | ヒットした三角形の単位幾何法線。常にレイの原点側を向くように揃えられ（ワインディングの符号は保持されない）、ミスなら 0 |
| `objectId` | ヒットしたオブジェクト id。ミスなら `-1` |
| `meshId` | そのオブジェクトのメッシュ id。ミスなら `-1` |
| `triangleIndex` | メッシュローカルの三角形インデックス。ミスなら `-1` |
| `materialIndex` | その三角形の材質インデックス。ミスなら `-1` |
| `reserved[6]` | 予約 |

`0` は有効な id なので、ミスの判定は必ず `hit`（または id が `-1` かどうか）で行います。

**戻り値** — `1` = 呼び出し成功（ヒットの有無は `outHit->hit`、ミスは失敗ではない） / `0` = `context`・ポインターが `NULL`、スタンプ不一致（`ST_STATUS_VERSION_MISMATCH`）、`origin`・`direction` が非有限または `direction` がゼロベクトル（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_mesh_create</code> — 三角形メッシュを登録する</summary>

```c
STMeshId st_off_mesh_create(STOFF_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**用途** — 音響ジオメトリとして使う三角形メッシュを登録します。登録時に回折用の音響エッジトポロジーをコンパイルし、交差カーネルを固定します。メッシュはそれ自体ではシーンに置かれず、`st_off_object_create` でインスタンスを作って初めて伝搬に参加します。

**呼び出し方** — 材質を登録し、必要なら `st_off_scene_set_triangle_intersection`・`st_off_scene_set_edge_split_collinear_overlaps` を設定してから呼びます。材質は次のどちらかで指定します — `triangleMaterialIndices` が `NULL` ならメッシュ全体が `material` ひとつを使い、`NULL` でなければ三角形ごとに材質インデックスを与え、その場合 `material` 引数は無視されます（対応可否 `ST_CAP_PER_TRIANGLE_MATERIALS`）。ひとつのメッシュ内ではワインディングを一貫させます — 部分的に反転したワインディングは、厚さ 0 の板の回折エッジを失わせることがあります。リアルタイムの `st_rt_mesh_create` と完全に同じ契約です。スレッド: `[control, blocking]` — 音響エッジトポロジーのコンパイルはメッシュサイズに比例して時間がかかることがあります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | メッシュデータ。エンジンが呼び出し中に読み込みます |
| `material` | メッシュ全体の材質ハンドル（`triangleMaterialIndices == NULL` のときのみ使用） |
| `triangleMaterialIndices` | 三角形ごとの材質インデックス配列（`mesh->numTriangles` 個、材質ハンドルの `v` 値）。`NULL` なら `material` ひとつを使います |

**構造体** `STMesh`

| フィールド | 説明 |
|---|---|
| `numVertices` | 頂点数（> 0） |
| `vertices` | xyz が連なった頂点配列（`numVertices × 3` float）、メッシュローカル座標（シーン単位） |
| `numTriangles` | 三角形数（> 0） |
| `triangles` | 頂点インデックス配列（`numTriangles × 3` int） |

**戻り値** — メッシュハンドル `STMeshId`。失敗は `v < 0`（コンテキスト・`mesh`・配列が `NULL`、または頂点・三角形数が 0 以下など）。

</details>

<details>
<summary><code>st_off_object_create</code> — メッシュインスタンスを行列変換でシーンに配置する</summary>

```c
STObjectId st_off_object_create(STOFF_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**用途** — 登録したメッシュをワールド変換とともにシーンに配置し、伝搬に参加させます。同じメッシュを複数のオブジェクトで共有できます。

**呼び出し方** — `st_off_mesh_create` の後、`st_off_build` の前に呼びます。静的オブジェクト（`isDynamic = 0`）は静的加速構造に、動的オブジェクトは動的 TLAS に入り、`st_off_object_set_transform*` で移動した後に `st_off_build_dynamic` で更新します。クォータニオンで配置するには `st_off_object_create_q`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | `st_off_mesh_create` が返したメッシュハンドル |
| `transform` | メッシュローカル → ワールド変換 |
| `isDynamic` | `0` = 静的 / それ以外 = 動的 |

**構造体** `STTransform`

| フィールド | 説明 |
|---|---|
| `m00, m01, m02` / `m10, m11, m12` / `m20, m21, m22` | 3×3 の回転・スケール、行優先（row-major） |
| `tx, ty, tz` | 平行移動（シーン単位） |

点は列ベクトルとして掛けます: `x' = m00·x + m01·y + m02·z + tx`、`y' = m10·x + m11·y + m12·z + ty`、`z' = m20·x + m21·y + m22·z + tz`。非均等スケールや行列式が負の変換（ミラー・負のスケール）も受け付けます。

**戻り値** — オブジェクトハンドル `STObjectId`。失敗は `v < 0`。

</details>

<details>
<summary><code>st_off_object_create_q</code> — メッシュインスタンスを位置・クォータニオン・スケールでシーンに配置する</summary>

```c
STObjectId st_off_object_create_q(STOFF_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**用途** — `st_off_object_create` のクォータニオン版です。ゲームエンジンの TRS（位置・回転・スケール）表現を行列に変換せず、そのまま渡せます。

**呼び出し方** — `st_off_object_create` と同じです（`st_off_build` の前、動的なら以降 `st_off_build_dynamic`）。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | メッシュハンドル |
| `position` | 位置 xyz（シーン単位） |
| `quatXYZW` | ローカル → ワールドの回転クォータニオン、**XYZW の順**。エンジンが正規化し、`norm < 1e-12` なら恒等で置き換えます |
| `scale` | 軸ごとのスケール xyz。R・S として合成され、非均等を許容します |
| `isDynamic` | `0` = 静的 / それ以外 = 動的 |

**戻り値** — オブジェクトハンドル `STObjectId`。失敗は `v < 0`。

</details>

<details>
<summary><code>st_off_source_create</code> — 音源を作成する</summary>

```c
STSourceId st_off_source_create(STOFF_Context* context, const STSourceDesc* source);
```

**用途** — IR を計算する音源をシーンに追加します。オフラインコンテキストの音源はオーディオ入力（ファイル・ストリーム）を受け取らず、リスナーと対になって IR 計算・レンダリングの対象になります。リアルタイムと異なり、音源数の予算はありません。

**呼び出し方** — シーンを構成した後、`st_off_ir_compute` の前に作成します。生成直後の状態はリアルタイムと同じです — source energy 1.0、経路ボリューム 4 種 1.0、指向性テーブルなし、向きは `direction` に合わせた roll なしの回転、輸送更新段階数 0。以降、位置・向き・レイ数・深さ・EQ・指向性などは `st_off_source_set_*` で変更します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源記述子。すべての値が有限で、`intensity ≥ 0` である必要があります |

**構造体** `STSourceDesc`

| フィールド | 説明 |
|---|---|
| `positionX, positionY, positionZ` | 位置（シーン単位） |
| `directionX, directionY, directionZ` | 正面方向。この方向に合った roll なしの音源フレームが作られます |
| `velocityX, velocityY, velocityZ` | 速度（シーン単位/秒）。`sceneRatio` で m/s に変換され、ドップラー放射ゲイン（`st_off_set_doppler_gain_mode`）に使われます |
| `intensity` | 無次元の線形 **圧力** ゲイン（≥ 0）。音響インテンシティ（W/m²）・SPL・Pa ではありません。別のエネルギー倍率は `st_off_source_set_energy` |
| `directional` | `0` = 無指向（onAxis = offAxis = 1） / それ以外 = 指向プロファイル（onAxis = 1、offAxis = 0） |
| `isDynamic` | `1` = 動的 / `0` = 静的。オフラインでは静的音源の輸送は計算ごとに一度ベイクされて固定され、動的音源は毎回の計算で全量を再トレースします |

**戻り値** — 音源ハンドル `STSourceId`。失敗は `v < 0`（`NULL`、非有限値、負の `intensity` は `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_listener_create</code> — リスナーをもうひとつ作成する</summary>

```c
STListenerId st_off_listener_create(STOFF_Context* context);
```

**用途** — オフラインコンテキストは複数のリスナーを持てます。ひとつのシーンで複数の受聴位置の IR を 1 回の `st_off_ir_compute` で得るためのものです。リアルタイム DLL にはないオフライン専用の関数です。

**呼び出し方** — コンテキストを作るとリスナーがひとつ（id `1`）自動的に作られ、有効な状態になります。それ以外の受聴位置ごとにこの関数を呼びます。新しいリスナーは自動的には有効になりません — リスナーの位置・向きの setter（`st_off_listener_set_position` など）は **有効なリスナー** に適用されるため、`st_off_listener_set_active` で切り替えてからポーズを指定します。IR 計算は登録されたリスナーごとに行われ、レンダリング・生 IR 取得関数はリスナーハンドルを引数に取ります。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 新しいリスナーハンドル `STListenerId`。失敗は `v < 0`。

</details>

<details>
<summary><code>st_off_listener_set_active</code> — 有効なリスナーを切り替える</summary>

```c
void st_off_listener_set_active(STOFF_Context* context, STListenerId listener);
```

**用途** — リスナーのポーズ setter（`st_off_listener_set_position` · `_set_rotation` · `_set_orientation_q` · `_set_rotation_ypr`）がどのリスナーに適用されるかを選びます。

**呼び出し方** — 複数のリスナーを使うとき、各リスナーのポーズを指定する直前に呼びます。存在しないリスナーハンドルなら何も変更しません。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `listener` | 有効にするリスナーハンドル |

**戻り値** — なし。切り替わったかどうかは `st_off_listener_get_active` で確認します。

</details>

<details>
<summary><code>st_off_listener_get_active</code> — 現在有効なリスナーを読み取る</summary>

```c
STListenerId st_off_listener_get_active(const STOFF_Context* context);
```

**用途** — ポーズ setter が現在どのリスナーを対象にしているかを確認します。

**呼び出し方** — いつでも呼べます。生成直後の値は自動生成されたリスナー `1` です。スレッド: `[any]` — atomic 読み取りです。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — 有効なリスナーハンドル。`context` が `NULL` なら `v = -1`。

</details>

<details>
<summary><code>st_off_listener_destroy</code> — リスナーを削除する</summary>

```c
int st_off_listener_destroy(STOFF_Context* context, STListenerId listener);
```

**用途** — もう計算する必要のない受聴位置を削除し、次の計算のコストを減らします。

**呼び出し方** — 有効なリスナーは削除できません — 先に `st_off_listener_set_active` で別のリスナーに切り替えます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `listener` | 削除するリスナーハンドル |

**戻り値** — `1` = 削除 / `0` = コンテキストなし、存在しないリスナー、または有効なリスナー。

</details>

<details>
<summary><code>st_off_source_set_position</code> — 音源の位置を変更する</summary>

```c
void st_off_source_set_position(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 音源を移動します。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。変更は次の計算に反映されます。リアルタイムと異なりモーションキューはなく、即座にシーンに適用されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `x`, `y`, `z` | ワールド位置（シーン単位） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_source_set_direction</code> — 音源の正面方向を変更する</summary>

```c
void st_off_source_set_direction(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 指向性音源（コーンまたは指向性テーブル）の正面を回転させます。

**呼び出し方** — 音源フレーム（`st_off_source_set_orientation_q`）と双方向に同期されます — この関数を呼ぶと、フレームは「+Z からこの方向へ向かう roll なしの最小回転」になります。roll が必要なら、この関数の代わりに `st_off_source_set_orientation_q` を使います。変更は次の `st_off_ir_compute` に反映されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `x`, `y`, `z` | ワールドの方向ベクトル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_listener_set_position</code> — 有効なリスナーの位置を変更する</summary>

```c
void st_off_listener_set_position(STOFF_Context* context, float x, float y, float z);
```

**用途** — 受聴位置を指定します。

**呼び出し方** — **有効なリスナー** に適用されます（複数のリスナーは `st_off_listener_set_active` で切り替えながら指定）。向きは維持されます。変更は次の `st_off_ir_compute` に反映されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `x`, `y`, `z` | ワールド位置（シーン単位） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_listener_set_rotation</code> — 有効なリスナーの向きを yaw・pitch で設定する</summary>

```c
void st_off_listener_set_rotation(STOFF_Context* context, float yaw, float pitch);
```

**用途** — バイノーラル・空間化レンダリングが基準とするリスナーの頭の向きを指定します。

**呼び出し方** — 有効なリスナーに適用されます。回転は R = Ry(yaw)·Rx(pitch) で、yaw = pitch = 0 なら forward = +Z、up = +Y、right = +X です。forward = (sin(yaw)·cos(pitch), −sin(pitch), cos(yaw)·cos(pitch))。方向ベクトル d から逆算するには `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`。roll は表現できません — 必要なら `st_off_listener_set_rotation_ypr` または `st_off_listener_set_orientation_q` を使います。リスナーの向きの setter 3 つは、最後に呼んだものが優先されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `yaw` | ラジアン。正 = 上から見下ろして時計回り（右に回る） |
| `pitch` | ラジアン。正 = 下を向く |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_listener_set_orientation_q</code> — 有効なリスナーの向きをクォータニオンで設定する</summary>

```c
int st_off_listener_set_orientation_q(STOFF_Context* context, const float quatXYZW[4]);
```

**用途** — roll（頭の傾き）まで含めたリスナーの向きを、ゲームエンジンのクォータニオンのまま渡します。

**呼び出し方** — 有効なリスナーに適用されます。ローカル軸は forward = +Z · up = +Y · right = +X で、音源の `orientation_q` と同じ順序・同じ検証です。yaw/pitch 表現は q = q_y(yaw)·q_x(pitch) となる roll 0 の場合に相当します。リスナーの向きの setter 3 つは、最後に呼んだものが優先されます。対応可否はワード 1 の `ST_CAP1_LISTENER_ORIENTATION_Q`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `quatXYZW` | ローカル → ワールドの単位クォータニオン、**XYZW の順**。エンジンが正規化します |

**戻り値** — `1` = 成功 / `0` = 失敗。非有限の成分や退化（`norm < 1e-12`）は `ST_STATUS_INVALID_ARGUMENT` で、何も変更しません。

</details>

<details>
<summary><code>st_off_listener_set_rotation_ypr</code> — 有効なリスナーの向きを yaw・pitch・roll で設定する</summary>

```c
int st_off_listener_set_rotation_ypr(STOFF_Context* context, float yaw, float pitch, float roll);
```

**用途** — `st_off_listener_set_rotation` に roll を加えたオイラー版です。

**呼び出し方** — 有効なリスナーに適用されます。回転は R = Ry(yaw)·Rx(pitch)·Rz(roll) で、Unity の `Quaternion.Euler(pitch, yaw, roll)`（度 → ラジアン）と同じ順序です。`roll = 0` なら `st_off_listener_set_rotation(yaw, pitch)` と同じ行列です。リスナーの向きの setter 3 つは、最後に呼んだものが優先されます。対応可否は `ST_CAP1_LISTENER_ORIENTATION_Q`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `yaw` | ラジアン。正 = 右に回る |
| `pitch` | ラジアン。正 = 下を向く |
| `roll` | ラジアン。正 = right 軸が上に傾く（頭が左に傾き、右耳が上がる） |

**戻り値** — `1` = 成功 / `0` = 失敗。非有限値は `ST_STATUS_INVALID_ARGUMENT` で、何も変更しません。

</details>

<details>
<summary><code>st_off_object_set_transform</code> — オブジェクトの変換を行列で変更する</summary>

```c
void st_off_object_set_transform(STOFF_Context* context, STObjectId object, const STTransform* transform);
```

**用途** — 配置したオブジェクトを移動・回転・スケールします。

**呼び出し方** — 変更後に加速構造へ反映して初めて次の計算に使われます — 動的オブジェクトは `st_off_build_dynamic`（動的 TLAS refit）、静的オブジェクトは `st_off_build`（全体ビルド）。クォータニオン版は `st_off_object_set_transform_q`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `object` | オブジェクトハンドル |
| `transform` | 新しいローカル → ワールド変換。`STTransform` のフィールドは `st_off_object_create` の項を参照 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_object_set_transform_q</code> — オブジェクトの変換を位置・クォータニオン・スケールで変更する</summary>

```c
void st_off_object_set_transform_q(STOFF_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**用途** — `st_off_object_set_transform` のクォータニオン版です。リアルタイムの `st_rt_object_set_transform_q` と同じ契約です。

**呼び出し方** — `st_off_object_set_transform` と同じです（その後 `st_off_build_dynamic` または `st_off_build`）。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `object` | オブジェクトハンドル |
| `position` | 位置 xyz（シーン単位） |
| `quatXYZW` | 回転クォータニオン、**XYZW 順**。エンジンが正規化します |
| `scale` | 軸ごとのスケール xyz（非均等も可） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_source_destroy</code> — 音源を削除する</summary>

```c
int st_off_source_destroy(STOFF_Context* context, STSourceId source);
```

**用途** — 音源をシーンから取り除きます。ソース EQ など音源ごとの設定も一緒に消えます。

**呼び出し方** — 次の `st_off_ir_compute` からその音源は計算されません。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |

**戻り値** — `1` = 削除 / `0` = コンテキストなし、または存在しない音源。

</details>

<details>
<summary><code>st_off_mesh_destroy</code> — メッシュを削除する</summary>

```c
int st_off_mesh_destroy(STOFF_Context* context, STMeshId mesh);
```

**用途** — 登録したメッシュを取り除きます。

**呼び出し方** — シーン構成を変えた後は `st_off_build` で加速構造を再構築します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | メッシュハンドル |

**戻り値** — `1` = 削除 / `0` = コンテキストなし、または削除失敗。

</details>

<details>
<summary><code>st_off_object_destroy</code> — オブジェクトを削除する</summary>

```c
int st_off_object_destroy(STOFF_Context* context, STObjectId object);
```

**用途** — 配置したメッシュインスタンスをシーンから外します。

**呼び出し方** — シーン構成を変えた後は `st_off_build` で加速構造を再構築します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `object` | オブジェクトハンドル |

**戻り値** — `1` = 削除 / `0` = コンテキストなし、または存在しないオブジェクト。

</details>

<details>
<summary><code>st_off_mesh_set_material</code> — メッシュの材質を変更する</summary>

```c
int st_off_mesh_set_material(STOFF_Context* context, STMeshId mesh, STMaterialId material);
```

**用途** — ジオメトリを再登録せずにメッシュの材質だけを差し替えます。材質の A/B 比較に使います。

**呼び出し方** — 変更は次の `st_off_ir_compute` に反映されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mesh` | メッシュハンドル |
| `material` | 新しい材質ハンドル |

**戻り値** — `1` = 成功 / `0` = コンテキストなし、存在しないメッシュ・材質。

</details>

<details>
<summary><code>st_off_source_set_ray_count</code> — 音源の輸送レイ格子のサイズを決める</summary>

```c
void st_off_source_set_ray_count(STOFF_Context* context, STSourceId source, int width, int height);
```

**用途** — 音源から放つ拡散輸送（diffuse transport）レイの数を決めます。レイ数 N = `width × height` で、増やすと残響・拡散成分の統計が安定する代わりに計算コストが増えます。

**呼び出し方** — `st_off_ir_compute` の前に音源ごとに呼びます。既定は 16 × 8 です。受け付けられない値の場合は設定を変えず、`st_off_get_last_status` に `ST_STATUS_INVALID_ARGUMENT` を残します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `width` | 格子の横方向レイ数（既定 16） |
| `height` | 格子の縦方向レイ数（既定 8） |

**戻り値** — なし。失敗は `st_off_get_last_status` で確認します。

</details>

<details>
<summary><code>st_off_source_set_depth</code> — 音源ごとの最大反射深度を決める</summary>

```c
void st_off_source_set_depth(STOFF_Context* context, STSourceId source, int depth);
```

**用途** — この音源で追跡する反射次数の上限を音源ごとに個別に決めます。重要な音源だけを深く追跡してコストを配分するときに使います。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。既定は音源ごとに 4 です（全体上限は `st_off_set_max_depth`、既定 8）。受け付けられない値の場合は `st_off_get_last_status` に `ST_STATUS_INVALID_ARGUMENT` を残します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `depth` | 最大反射深度（既定 4） |

**戻り値** — なし。失敗は `st_off_get_last_status` で確認します。

</details>

<details>
<summary><code>st_off_source_set_energy</code> — 音源のエネルギー倍率を決める</summary>

```c
int st_off_source_set_energy(STOFF_Context* context, STSourceId source, float energy);
```

**用途** — `STSourceDesc.intensity`（圧力ドメインのゲイン）とは別の **エネルギードメイン** の相対倍率で音源の強さを調整します。対応有無は `ST_CAP_SOURCE_ENERGY`。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。既定は 1.0 です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `energy` | エネルギー倍率。有限かつ `≥ 0` である必要があります（既定 1.0） |

**戻り値** — `1` = 成功 / `0` = コンテキストなし、非有限・負の値、存在しない音源。

</details>

<details>
<summary><code>st_off_source_set_transport_refresh_steps</code> — 音源ごとの輸送更新ステップ数を保存する</summary>

```c
int st_off_source_set_transport_refresh_steps(STOFF_Context* context, STSourceId source, int steps);
```

**用途** — リアルタイムコンテキストで、音源の輸送レイ格子 N を n 回の伝搬に分けて更新させる値です。オフラインにも同じ setter があるのは、ホストが同じシーン設定をリアルタイムコンテキストでそのまま再現できるよう値を往復させるためです。

**呼び出し方** — オフラインコンテキストはローリング輸送を使わないため、**動的音源の n を無視して計算のたびに全量を再追跡します**（実効 n = 1）。そのため同じシーン・同じ入力なら何度計算しても同じ RIR が得られます。静的音源は n に関係なく、計算ごとに一度ベイクした結果で固定されます。値自体は保存され、`st_off_source_get_transport_refresh_steps` がそのまま返します。リアルタイムの `st_rt_source_set_transport_refresh_steps` とシグネチャ・戻り値の契約が同じです。対応有無は `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `steps` | `0` = 既定（シェル・音源フラグが決める） / `1` = 伝搬ごとに全量再追跡 / `≥ 2` = n 回に分けて更新（リアルタイムでは `[1, N]` に clamp）。負の値は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗: 負の `steps` は `ST_STATUS_INVALID_ARGUMENT`、存在しない音源は `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_get_transport_refresh_steps</code> — 保存された輸送更新ステップ数を読む</summary>

```c
int st_off_source_get_transport_refresh_steps(const STOFF_Context* context, STSourceId source);
```

**用途** — `st_off_source_set_transport_refresh_steps` で保存した値を確認します。

**呼び出し方** — いつでも呼べます。返す値は実効 n ではなく **保存値そのまま**（0 を含む）です — オフラインの動的音源の実効値は常に 1 です。スレッド: `[control]` — シーン読み取りロックのみを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |

**戻り値** — 保存されたステップ数（`≥ 0`）。失敗は `-1`。

</details>

<details>
<summary><code>st_off_source_set_orientation_q</code> — 音源のローカルフレームをクォータニオンで決める</summary>

```c
int st_off_source_set_orientation_q(STOFF_Context* context, STSourceId source, const float quatXYZW[4]);
```

**用途** — 音源のローカルフレームを roll まで含めてワールドに配置します。指向性テーブルはこのフレーム基準で参照されるため、テーブルを使う音源はこの関数で向きを指定します。

**呼び出し方** — ローカル軸は forward = +Z / up = +Y / right = +X です。`st_off_source_set_direction` と双方向に同期されます — ここでフレームを与えると direction = forward(q) に合わせて変わり、direction の setter を呼ぶとフレームは roll なしの最小回転になります。roll が必要なら必ずこの関数を使います。リアルタイムの `st_rt_source_set_orientation_q` と同じ契約です。対応有無は `ST_CAP_SOURCE_DIRECTIVITY`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `quatXYZW` | ローカル → ワールドの単位クォータニオン、**XYZW 順**。エンジンが正規化します |

**戻り値** — `1` = 成功 / `0` = 失敗: 非有限の成分または縮退（`norm < 1e-12`）は `ST_STATUS_INVALID_ARGUMENT`、存在しない音源は `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_set_directivity</code> — 音源の指向性テーブルを付ける・外す</summary>

```c
int st_off_source_set_directivity(STOFF_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**用途** — 測定・作成した方位角 × 仰角 × 9 バンドのエネルギーテーブルで音源の放射パターンを指定します。単純な正面/側面のコーンよりも、実際の音源（楽器・スピーカー・人の声など）の放射を正確に表現できます。

**呼び出し方** — テーブルが付いている間はコーン減衰（`STSourceDesc.directional` による on/off-axis）の代わりにテーブルが使われ、`table = NULL` で外すとコーンの式に戻ります。エンジンがテーブルを **コピー** するため、呼び出しが戻った後にホストのバッファーを解放しても構いません。参照方向はソースフレーム基準なので、`st_off_source_set_orientation_q` と組み合わせて使います。リアルタイムの `st_rt_source_set_directivity` と同じ契約です。対応有無は `ST_CAP_SOURCE_DIRECTIVITY`。スレッド: `[control]` — テーブルのコピーと正規化スカラーの計算をこの呼び出しで一度行います。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `table` | 指向性テーブル。呼び出し側が `structSize`/`apiVersion` を埋めます。`NULL` ならテーブルを除去 |

**構造体** `STSourceDirectivity`

| フィールド | 説明 |
|---|---|
| `structSize` / `apiVersion` | 呼び出し側が埋める |
| `azCount` | 方位角ノード数、`[3, 361]`。ノード az_i = i·360/azCount（360° で wrap） |
| `elCount` | 仰角ノード数、`[2, 181]`。ノード el_j = −90 + j·180/(elCount−1)。奇数なら水平面（0°）がノードに乗ります。推奨格子は 5° 間隔（72 × 37） |
| `levelMode` | `STDirectivityLevelMode` — `ST_DIRECTIVITY_ABSOLUTE`（0、値をそのまま使う: 絶対レベルまで含む測定データ向け） / `ST_DIRECTIVITY_POWER_MEAN`（1、バンドごとの球面パワー平均が 1 になるよう正規化: パターンだけを使い総パワーは intensity/energy で決める場合、推奨） / `ST_DIRECTIVITY_ON_AXIS`（2、正面の値が 1 になるよう正規化） |
| `reserved0` | 予約 |
| `energy` | `elCount × azCount × ST_FREQUENCY_BANDS` 個の float、レイアウト `[el][az][band]`（band が最も速い）。**エネルギードメイン**、有限かつ `≥ 0` |
| `reserved[6]` | 予約 |

方向の規約はソースのローカルフレームで az = atan2(x, z)（正面 0、右 +90°）、el = asin(y)（上が +）で、参照は az wrap · el clamp の双線形補間です。

**戻り値** — `1` = 成功（テーブル除去を含む） / `0` = 失敗: スタンプ不一致 `ST_STATUS_VERSION_MISMATCH`、`levelMode`・`azCount`・`elCount` の範囲外・`energy` が `NULL`・非有限または負の要素 `ST_STATUS_INVALID_ARGUMENT`（理由は `st_off_get_last_error`）、存在しない音源 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_set_eq</code> — 音源の原音に 9 バンドのグラフィック EQ をかける</summary>

```c
int st_off_source_set_eq(STOFF_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 音源信号そのものの音色を 9 バンドで補正します。クロスオーバーの前でかかるため、その音源のすべての経路（直接・透過・反射・回折）と残響センドに同じフィルターが適用されます。リアルタイムの `st_rt_source_set_eq` と同じ実装なので同じ結果になります。

**呼び出し方** — レンダリング専用の設定なので IR キャッシュを無効化しません — `st_off_ir_compute` をやり直さず、レンダリングだけをやり直せばすぐに反映されます（圧力 IR のソロ・ミックス・バッチレンダリングすべて）。`gainsDb = NULL` または全バンド 0 dB なら EQ をオフにし、その結果は EQ なしの結果とビット単位で同一です。設定は音源を削除するまで保持され、`st_off_trim_memory` でも残ります。パラメトリック EQ（`st_off_source_set_parametric_eq`）と同じ EQ を共有し、最後に呼んだ setter が優先されます。対応有無は `ST_CAP_SOURCE_EQ`。スレッド: `[control]` — シーン読み取りロックとオーラライザー制御ロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `gainsDb` | バンドごとのゲイン（dB）、63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz の順。有限かつ `[−ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`（±24 dB）の範囲である必要があり、クランプせずに拒否します。`NULL` = オフ |

フィルターはバンドごとに RBJ ピーキング biquad をひとつ（中心 = バンド中心、Q = 1.414）、44100 Hz で昇順に直列にかけます。隣接バンド同士の応答が重なるため、バンド中心で正確に指定値を得たい場合はホストがゲインを補正して渡します。

**戻り値** — `1` = 成功 / `0` = 失敗: 非有限の値または範囲外 `ST_STATUS_INVALID_ARGUMENT`（何も変更しない）、存在しない音源 `ST_STATUS_NOT_FOUND`、ソース EQ に対応しないバックエンド（Exa） `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_source_get_eq</code> — 音源 EQ を 9 バンドのゲインとして読む</summary>

```c
int st_off_source_get_eq(STOFF_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 現在の音源 EQ を 9 バンドのグラフィック EQ ビューとして返します。

**呼び出し方** — いつでも呼べます。EQ がオフならすべて 0 です。パラメトリック EQ で 9 バンドの形ではない設定をかけた場合はグラフィックビューで表現できないため失敗します — `0` + `ST_STATUS_UNAVAILABLE` のときは `st_off_source_get_parametric_eq` を呼び、成功すればそちらで設定を読み、同じ `UNAVAILABLE` で失敗すればバックエンドがソース EQ に対応していないということです。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `outGainsDb` | 9 バンドのゲイン（dB）を受け取る配列 |

**戻り値** — `1` = 成功 / `0` = 失敗: `outGainsDb` が `NULL` なら `ST_STATUS_INVALID_ARGUMENT`、存在しない音源 `ST_STATUS_NOT_FOUND`、`ST_STATUS_UNAVAILABLE`（バックエンド非対応、または 9 バンドで表現できないパラメトリック設定 — このとき `outGainsDb` には触れない）。

</details>

<details>
<summary><code>st_off_source_set_parametric_eq</code> — 音源の原音にパラメトリック EQ をかける</summary>

```c
int st_off_source_set_parametric_eq(STOFF_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 9 バンド固定 EQ より自由なバンドリスト（ピーキング・シェルフ・LP・HP・ノッチ）で音源の音色を補正します。`st_off_source_set_eq` と **同じ EQ** で、かかる位置（クロスオーバーの前、その音源のすべての経路）も同じです。AutoEq プロファイルは `st_off_render_parse_autoeq_parametric` で読み込んでそのまま渡せます。

**呼び出し方** — オフラインではランプなしで即座に変わり、圧力レンダリングのソロ・ミックス・バッチすべてに同じフィルターがかかります。IR キャッシュを無効化しないため、レンダリングだけやり直せば反映されます。2 つのソース EQ setter はリスト全体を置き換え、最後に呼んだ方が優先されます。オフのリストや効果のないリストも保存され、オフにして消去するには `st_off_source_set_eq(context, source, NULL)` を呼びます。設定は音源を削除するまで保持されます。リアルタイムの `st_rt_source_set_parametric_eq` と同じ契約・同じ実装です。対応有無はワード 1 の `ST_CAP1_SOURCE_PARAMETRIC_EQ`。スレッド: `[control]` — シーン読み取りロックとオーラライザー制御ロックを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `bands` | バンド配列（`bandCount` 個）。`bandCount = 0` なら `NULL` でも構いません |
| `bandCount` | バンド数、`[0, ST_PARAMETRIC_EQ_MAX_BANDS]`（16） |
| `preampDb` | プリアンプ（dB）、`[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]`（−48 ~ +12）に clamp。主な用途はクリッピング防止用の負の値 |
| `enabled` | `0` = リストは保存するがバイパス / それ以外 = オン |

**構造体** `STParametricEqBand`

| フィールド | 説明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | `0` = このバンドは恒等（スキップ） / それ以外 = オン |
| `frequencyHz` | 中心（PEAKING・NOTCH）またはコーナー（シェルフの中点・LP・HP）周波数。`[20, min(20000, 0.49·44100)]` に clamp |
| `gainDb` | PEAKING・シェルフのみ使用。`[−24, +24]` に clamp |
| `q` | `[0.1, 30]`、シェルフは `[0.1, 3]` に clamp |
| `reserved[3]` | 必ず `0` |

非有限の値・未知の `type`・`reserved ≠ 0`・範囲外のバンド数は拒否し（何も変更しない）、有限の値は上記の範囲に clamp します。フィルターはバンドごとに RBJ 2 次セクション（44100 Hz、double）で、チェーンはプリアンプ → バンド 0..count−1 の直列です。

**戻り値** — `1` = 成功 / `0` = 失敗: `ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_NOT_FOUND`（音源なし） / `ST_STATUS_UNAVAILABLE`（Exa バックエンド）。

</details>

<details>
<summary><code>st_off_source_get_parametric_eq</code> — 音源 EQ をパラメトリックバンドリストとして読む</summary>

```c
int st_off_source_get_parametric_eq(STOFF_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 現在の音源 EQ を clamp 後の実効値のバンドリストとして返します。9 バンド setter でかけた設定も PEAKING バンド 9 個として読めます。

**呼び出し方** — サイズがわからなければ、まず `outBands = NULL` で呼んでバンド数を受け取ります。`ST_PARAMETRIC_EQ_MAX_BANDS` 個の容量を渡せば常に収まります。EQ がなければ 0 バンド・オフです。出力の規約はリアルタイムの `st_rt_render_get_parametric_eq` と同じです。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `outBands` | バンドを受け取る配列。`NULL` ならサイズ照会（バンドは書かない） |
| `bandCapacity` | `outBands` の要素数（`≥ 0`） |
| `outBandCount` | バンド数。`NULL` ならスキップ |
| `outPreampDb` | プリアンプ（dB）。`NULL` ならスキップ |
| `outEnabled` | オン/オフ。`NULL` ならスキップ |

`STParametricEqBand` のフィールドは `st_off_source_set_parametric_eq` の項を参照。

**戻り値** — `1` = 成功（サイズ照会を含む） / `0` = 失敗: `bandCapacity < 0` なら `ST_STATUS_INVALID_ARGUMENT`、容量がバンド数より小さければ `ST_STATUS_BUFFER_TOO_SMALL`（バンド数・プリアンプ・オン/オフは書く）、存在しない音源 `ST_STATUS_NOT_FOUND`、Exa バックエンド `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_source_set_path_volume</code> — 音源の経路種別ごとのボリュームを決める</summary>

```c
int st_off_source_set_path_volume(STOFF_Context* context, STSourceId source, int volumeKind, float volume);
```

**用途** — ひとつの音源の直接音・反射・回折・残響の寄与を個別に上げ下げします。物理的な結果を保ったまま、ミックス上の調整が必要なときに使います。対応有無は `ST_CAP_SOURCE_PATH_VOLUME`。

**呼び出し方** — 既定は 4 種類すべて 1.0 です。値は **圧力ドメイン** の線形倍率です。スレッド: `[control]` — シーン読み取りロックのみを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `source` | 音源ハンドル |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`（0、透過を含む） / `ST_SOURCE_VOLUME_REFLECTION`(1) / `ST_SOURCE_VOLUME_DIFFRACTION`(2) / `ST_SOURCE_VOLUME_REVERB`（3、この音源がリスナー共有の残響タンクを駆動する量のみを調整） |
| `volume` | 線形の圧力倍率。有限かつ `≥ 0`（既定 1.0） |

**戻り値** — `1` = 成功 / `0` = コンテキストなし、範囲外の `volumeKind`、非有限・負の `volume`、存在しない音源。

</details>

<details>
<summary><code>st_off_set_path_type_enabled</code> — 経路種別をグローバルにオン・オフする</summary>

```c
void st_off_set_path_type_enabled(STOFF_Context* context, int pathType, int enabled);
```

**用途** — 直接音・透過・反射・回折・残響のうち特定の経路種別を計算から外し、各成分が結果に何を寄与しているかを分離して聴いたり、コストを減らしたりします。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。既定は 5 種類すべてオンです。`st_off_set_acoustic_feature_enabled` と組み合わせると、「距離減衰 + パンニングだけを残した」ベースラインを設定だけで作れます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |
| `enabled` | `0` = オフ / それ以外 = オン |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_set_acoustic_feature_enabled</code> — 個別の音響機能をオン・オフする</summary>

```c
int st_off_set_acoustic_feature_enabled(STOFF_Context* context, int feature, int enabled);
```

**用途** — 空気吸収・伝搬遅延・直接音の遮蔽をひとつずつオン・オフして、試聴の A/B 比較を行います。リアルタイムの `st_rt_set_acoustic_feature_enabled` と同じ契約です。

**呼び出し方** — 既定は 3 機能すべてオン（物理そのまま）です。IR ポリシー設定なので、呼ぶと IR キャッシュが無効化されます。そのためレンダリングの前に `st_off_ir_compute` を再度呼びます。反射・回折・残響をオフにし（`st_off_set_path_type_enabled`）、3 機能をすべてオフにすると、距離減衰 + パンニングだけが残ります。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`（0、大気減衰・高域損失） / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`（1、経路長に基づく伝搬遅延） / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`（2、直接音の可視性検査） |
| `enabled` | `0` = オフ / それ以外 = オン |

**戻り値** — `1` = 成功 / `0` = 範囲外の `feature`、または失敗。

</details>

<details>
<summary><code>st_off_is_acoustic_feature_enabled</code> — 音響機能のオン・オフ状態を読む</summary>

```c
int st_off_is_acoustic_feature_enabled(const STOFF_Context* context, int feature);
```

**用途** — `st_off_set_acoustic_feature_enabled` で指定した状態を確認します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]` — ロックなしでエンジンの状態を読みます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `feature` | `ST_ACOUSTIC_FEATURE_*`(0~2) |

**戻り値** — `1` = オン / `0` = オフ / `-1` = コンテキストなし。

</details>

<details>
<summary><code>st_off_set_late_coupling</code> — late 残響の結合減衰パラメータを個別に決める</summary>

```c
int st_off_set_late_coupling(STOFF_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**用途** — リスナーが音源の拡散場にどれだけ結合しているか（可視率）に応じて late 残響の注入を減衰します。残響タンクは完全に混合された単一空間なので、既定ではどこでも同じ大きさで聞こえますが、コの字・ロの字のように角の向こうで分かれた空間で「離れたのに残響がそのまま、またはむしろ大きくなる」問題を直すためのオプションです。

**呼び出し方** — 通常は `st_off_set_late_coupling_preset` で十分で、細かな調整が必要なときにこの関数を使います。結合減衰・send 平坦化・rain 方向ウォークは一緒に有効にするよう設計されたセットです — 平坦化なしで結合だけを有効にすると、離れるほど残響の注入がむしろ大きくなることがあり、rain ウォークがないと分かれた空間の向こう側の late 方向サンプルが不足します。音源と同じ空間（可視率が `visibleHigh` 以上）は正確に 0 dB です。パラメータ構成はまだ確定しておらず、変わる可能性があります。IR ポリシーなので、変更した値は次の `st_off_ir_compute` から反映されます。リアルタイムの `st_rt_set_late_coupling` と同じ契約です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `floorDb` | 完全遮断時の減衰の深さ（dB）。`0` = 結合減衰オフ。既定 9 |
| `visibleLow` | 可視率がこれより小さければ完全遮断とみなし、底の減衰を与えます。`0` → 既定 0.05 |
| `visibleHigh` | 可視率がこれより大きければ同じ空間とみなし、正確に 0 dB。`0` → 既定 0.60 |
| `sendNormalizeTrim` | send 総和の平坦化トリム。`0` = 平坦化しない。既定 0.75 |
| `rainDirectionWalk` | `0` = オフ / それ以外 = オン（既定）。チェーンが終わった後も late 方向サンプルを集め続けます（エネルギーは運びません） |

**戻り値** — `1` = 成功 / `0` = 範囲外の値、または失敗。

</details>

<details>
<summary><code>st_off_get_late_coupling</code> — late 残響の結合減衰パラメータを読む</summary>

```c
int st_off_get_late_coupling(const STOFF_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**用途** — 現在適用中の late 結合減衰の設定（個別 setter またはプリセットでかけた値）を確認します。

**呼び出し方** — いつでも呼べます。不要な出力は `NULL` にします。スレッド: `[control]` — ロックなしでエンジンの状態を読みます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `outFloorDb` | 底の減衰の深さ（dB）。`NULL` 可 |
| `outVisibleLow` | 完全遮断のニー。`NULL` 可 |
| `outVisibleHigh` | 同一空間のニー。`NULL` 可 |
| `outSendNormalizeTrim` | send 平坦化トリム。`NULL` 可 |
| `outRainDirectionWalk` | rain 方向ウォークのオン/オフ。`NULL` 可 |

各値の意味は `st_off_set_late_coupling` の項を参照。

**戻り値** — `1` = 成功 / `0` = コンテキストなし。

</details>

<details>
<summary><code>st_off_set_late_coupling_preset</code> — late 残響の結合減衰を推奨プリセットで決める</summary>

```c
int st_off_set_late_coupling_preset(STOFF_Context* context, int preset);
```

**用途** — 底の減衰の深さだけを選び、残り（ニー 2 点・平坦化トリム・rain ウォーク）は推奨値で埋める一括設定です。

**呼び出し方** — プリセットの選択は主に聴感の問題です — 単一の部屋では可視率がニーより上なので減衰は介入せず、どのプリセットでも音源と同じ空間は正確に 0 dB です。個別の調整が必要なら `st_off_set_late_coupling` を使います。IR ポリシーなので、変更した値は次の `st_off_ir_compute` から反映されます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `preset` | `ST_LATE_COUPLING_OFF`（0、結合減衰・平坦化・rain ウォークをすべてオフ） / `ST_LATE_COUPLING_SUBTLE`（1、底 6 dB） / `ST_LATE_COUPLING_DEFAULT`（2、底 9 dB、エンジン既定） / `ST_LATE_COUPLING_STRONG`（3、底 12 dB） |

**戻り値** — `1` = 成功 / `0` = 範囲外の `preset`、または失敗。

</details>

<details>
<summary><code>st_off_set_physical_distance_attenuation</code> — 距離減衰の基準距離と最小距離を決める</summary>

```c
void st_off_set_physical_distance_attenuation(STOFF_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**用途** — 物理的な球面拡散（圧力 1/R）による距離減衰の基準点と近距離の限界を決めます。エンジン唯一の距離減衰則で、圧力ゲインは `reference / max(R, min)` です。

**呼び出し方** — 既定は基準 1.0 m · 最小 1.0 m です（最小距離を基準距離より小さくすると、基準より近いときに近距離の増幅が生じます）。2 つの値は `sceneRatio` に関係なく **ホストがメートルで** 渡します — 比較対象の経路長がすでにメートルに換算されているためです。IR キャッシュを無効化するので、レンダリングの前に `st_off_ir_compute` を再度呼びます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `referenceDistanceMeters` | ゲインが 1 になる基準距離（m）。既定 1.0 |
| `minDistanceMeters` | これより近い距離はこの値とみなします（m）。既定 1.0 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_set_atmosphere</code> — 大気条件（温度・湿度・気圧）を決める</summary>

```c
void st_off_set_atmosphere(STOFF_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**用途** — 空気吸収（高域損失）と音速を決める大気状態を指定します。音速は固定定数ではなくこの値から実行時に導出されるため、伝搬遅延も一緒に変わります。

**呼び出し方** — 既定は 20.0 °C · 50.0 %RH · 101.325 kPa です。IR キャッシュを無効化するので、レンダリングの前に `st_off_ir_compute` を再度呼びます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `temperatureC` | 気温（°C）。既定 20.0 |
| `relativeHumidityPercent` | 相対湿度（%）。既定 50.0 |
| `pressureKPa` | 気圧（kPa）。既定 101.325 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_set_doppler_gain_mode</code> — 移動する音源の放射ゲインモードを選ぶ</summary>

```c
int st_off_set_doppler_gain_mode(STOFF_Context* context, int mode);
```

**用途** — 音源が動くとき、進行方向側の放射が大きくなり反対側が小さくなるゲインを IR に反映するかどうかを決めます。可変遅延によるドップラーピッチとは別のスイッチです。対応有無は `ST_CAP_DOPPLER_GAIN_MODE`。

**呼び出し方** — 既定は `ST_DOPPLER_GAIN_MOVING_MONOPOLE` です。音源の速度は `STSourceDesc.velocity*` で与え、静止音源のゲインは 1 です。IR キャッシュを無効化するので、レンダリングの前に `st_off_ir_compute` を再度呼びます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`（1、既定: 移動する単極子近似 — 圧力 D²、エネルギー D⁴、D = 1/(1−Mr)、放射経路の方向ごとに個別に計算） |

**戻り値** — `1` = 成功 / `0` = コンテキストなし、または範囲外の `mode`。

</details>

<details>
<summary><code>st_off_get_doppler_gain_mode</code> — ドップラー放射ゲインモードを読む</summary>

```c
int st_off_get_doppler_gain_mode(const STOFF_Context* context);
```

**用途** — `st_off_set_doppler_gain_mode` で指定した値を確認します。

**呼び出し方** — いつでも呼べます。スレッド: `[control]` — ロックなしでエンジンの状態を読みます。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — `STDopplerGainMode` の値（`0` = OFF / `1` = MOVING_MONOPOLE）。コンテキストがなければ `-1`。

</details>

<details>
<summary><code>st_off_set_early_late_band_energy_targets</code> — early・late のバンドごとのエネルギー倍率を決める</summary>

```c
int st_off_set_early_late_band_energy_targets(STOFF_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**用途** — 初期音（early）と後期残響（late）のスペクトルを互いに独立してバンドごとに調整します。測定値に合わせたり、残響の音色だけを別途整えたりするときに使います。リアルタイムの `st_rt_set_early_late_band_energy_targets` のオフライン版です。対応有無は `ST_CAP_EARLY_LATE_BAND_ENERGY`。

**呼び出し方** — 2 つの配列を一度に置き換えます。early 倍率は exact・初期タップにのみ、late 倍率は残響 send・タンク駆動にのみ適用され、互いに掛け合わせません。既定はすべて 1.0（中立）です。IR キャッシュを無効化するので、レンダリングの前に `st_off_ir_compute` を再度呼びます。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `earlyBandEnergy` | 初期音のバンドごとの **エネルギードメイン** 倍率（63 ~ 16k Hz の 9 個）。非有限の値は 1.0 に、それ以外は `[0, 16]` に正規化 |
| `lateBandEnergy` | 後期残響のバンドごとのエネルギー倍率。規則は上と同じ |

**戻り値** — `1` = 成功 / `0` = コンテキストなし、または配列が `NULL`。

</details>

<details>
<summary><code>st_off_set_max_depth</code> — グローバルな最大反射深度を決める</summary>

```c
void st_off_set_max_depth(STOFF_Context* context, int depth);
```

**用途** — 反射経路探索のグローバルな次数上限を決め、計算コストと初期反射の密度を調節します。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。既定は 8 です（音源ごとの上限は `st_off_source_set_depth`、既定 4）。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `depth` | グローバルな最大反射深度（既定 8） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_set_transmission_max_depth</code> — 透過経路の最大深度を決める</summary>

```c
void st_off_set_transmission_max_depth(STOFF_Context* context, int depth);
```

**用途** — 直接音が壁を透過するとき、何枚の面まで通過を追跡するかの上限を決めます。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。既定は 64 です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `depth` | 透過の最大深度（既定 64） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_listener_set_ray_count</code> — リスナーのガイドレイ格子のサイズを決める</summary>

```c
void st_off_listener_set_ray_count(STOFF_Context* context, int width, int height);
```

**用途** — リスナーから放つガイド（probe）レイの数を決めます（N = `width × height`）。反射・回折経路探索と空間統計の解像度を計算コストと引き換えにします。

**呼び出し方** — `st_off_ir_compute` の前に呼びます。既定は 16 × 16 です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `width` | 格子の横方向レイ数（既定 16） |
| `height` | 格子の縦方向レイ数（既定 16） |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_listener_set_ray_sampling_method</code> — リスナーのガイドレイの方向分布を選ぶ</summary>

```c
int st_off_listener_set_ray_sampling_method(STOFF_Context* context, int method);
```

**用途** — リスナーのガイドレイを球面上にどう配置するかを決める setter です。現在はフィボナッチ球面分布のみ選択でき、ほかの値は番号の互換性のため列挙型にだけ残っています。フィボナッチ分布はシードを使わない決定的な分布です。

**呼び出し方** — 既定値がすでに `ST_RAY_SAMPLING_FIBONACCI_SPHERE` なので、通常は呼ぶ必要はありません。対応有無は `ST_CAP_RAY_SAMPLING_METHODS`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `method` | `STRaySamplingMethod`。受け付ける値は `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) のみ — `LEGACY_GRID`(0) / `EQUAL_AREA_GRID`(2) / `SOBOL_SPHERE`(3) / `ICOSAHEDRAL`(4) は拒否 |

**戻り値** — `1` = 成功 / `0` = それ以外の値（`ST_STATUS_INVALID_ARGUMENT`、状態は不変）、またはコンテキストなし。

</details>

<details>
<summary><code>st_off_set_source_ray_sampling_method</code> — 音源輸送レイの方向分布を選ぶ</summary>

```c
int st_off_set_source_ray_sampling_method(STOFF_Context* context, int method);
```

**用途** — 音源輸送レイの球面配置を決める setter です。`st_off_listener_set_ray_sampling_method` と同様に、フィボナッチ球面分布のみ選択できます。

**呼び出し方** — 既定値がすでに `ST_RAY_SAMPLING_FIBONACCI_SPHERE` です。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |
| `method` | `STRaySamplingMethod`。`ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) のみ許可、それ以外は拒否 |

**戻り値** — `1` = 成功 / `0` = それ以外の値（`ST_STATUS_INVALID_ARGUMENT`、状態は不変）、またはコンテキストなし。

</details>

<details>
<summary><code>st_off_build</code> — シーンの加速構造を全体ビルドする</summary>

```c
void st_off_build(STOFF_Context* context);
```

**用途** — 登録したメッシュ・オブジェクトから静的 + 動的の加速構造をすべて構築します。伝搬と `st_off_scene_raycast` はこの構造を使います。

**呼び出し方** — メッシュ・オブジェクトを追加・削除した後、静的オブジェクトを動かした後、そして `st_off_ir_compute` の前に呼びます。ビルド前はレイ照会がすべてミスになります。加速構造の種類は `st_off_scene_set_accel` が決めます。スレッド: `[control, blocking]` — シーンサイズに比例する長い排他区間です。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_build_dynamic</code> — 動的オブジェクトの TLAS だけを更新する</summary>

```c
void st_off_build_dynamic(STOFF_Context* context);
```

**用途** — 動的オブジェクトの変換だけが変わったとき、全体ビルドなしで動的 TLAS を refit して素早く反映します。

**呼び出し方** — `st_off_object_set_transform` / `_q` で動的オブジェクトを動かした後、`st_off_ir_compute` の前に呼びます。メッシュ・オブジェクトを追加・削除した場合や静的オブジェクトが変わった場合は `st_off_build` を使います。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | コンテキストハンドル |

**戻り値** — なし。

</details>

</details>

<details>
<summary><strong>オフライン(`st_off_*`) — IR 計算・レンダリング、バッチ、デバッグ</strong> — 49 個</summary>

<details>
<summary><code>st_off_render_parse_autoeq_parametric</code> — AutoEq の ParametricEQ.txt テキストをパラメトリック EQ バンド配列にパースする</summary>

```c
int32_t st_off_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**用途** — AutoEq が配布する `ParametricEQ.txt`（Equalizer APO 文法のサブセット）を読み込み、`STParametricEqBand` 配列とプリアンプ値に変換します。結果を `st_off_source_set_parametric_eq` にそのまま渡せるため、ヘッドホン補正カーブのような外部 EQ ファイルをホストが自前でパースせずにソース EQ としてかけられます。リアルタイムの `st_rt_render_parse_autoeq_parametric` と同じ実装・同じ契約です。

**呼び出し方** — コンテキストが不要なので、いつでも呼べます。成功したら結果をオン（`enabled` = 1）で `st_off_source_set_parametric_eq` に渡します。対応有無は `st_off_get_capability_word(1)` の `ST_CAP1_SOURCE_PARAMETRIC_EQ` で確認します（このパーサーはそのビットに含まれ、別のビットはありません）。スレッド: `[any]` — グローバル状態も割り当てもないため、どのスレッドからでもブロックせずに呼べます。

受け付ける文法（大文字小文字は区別しない）:

- `Preamp: <数値> [dB]` — 複数行あれば dB で加算します。
- `Filter[ <番号>]: ON|OFF <種類> Fc <数値> [Hz] [Gain <数値> [dB]] [Q <数値>]` — 種類は `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`。Q を省略するとシェルフ・LP・HP は 0.7071 で、`PK`·`NO` は Q が必須です。Gain は PK・シェルフに必須です。`OFF` フィルターは `enabled` = 0 のバンドとして入り、バンド数に数えられます。
- 空行と `#` 以降（行末コメント）は無視し、UTF-8 BOM・CRLF を受け付けます。数値はロケールに関係なく読みます。

拒否するもの: それ以外のコマンド（`Channel`·`Device`·`GraphicEQ`·`Include` など）、`BP`·`AP`·`IIR`、シェルフの傾き形式（`LS 6dB`）、`BW Oct`、範囲外の値（Fc [20, 20000] Hz · Gain ±24 dB · Q [0.1, 30]、シェルフは Q [0.1, 3] · プリアンプの最終合計 [−48, +12] dB）、コメント外の非 ASCII 文字、指数表記。パーサーは clamp せずに拒否します（setter は同じ範囲で clamp します）。

| パラメータ | 説明 |
|---|---|
| `utf8Text` | NUL 終端の UTF-8 テキスト（ファイル内容全体）。必須 |
| `outBands` | バンドを受け取る呼び出し側の配列。`bandCapacity` が 0 より大きければ必須 |
| `bandCapacity` | `outBands` の要素数。0 以上。最大バンド数は `ST_PARAMETRIC_EQ_MAX_BANDS`(16) |
| `outBandCount` | パースされたバンド数を受け取る。必須（NULL 不可） |
| `outPreampDb` | プリアンプ（dB）を受け取る。必須（NULL 不可） |
| `outErrorLine` | 失敗した行番号（1 から、行に関係ないエラーは 0）。NULL 可 |
| `outErrorMessage` | 失敗理由（NUL 終端の英文）。NULL 可 |
| `errorMessageCapacity` | `outErrorMessage` のバイト数。この長さに合わせて切り詰める |

**構造体** `STParametricEqBand`（32 バイト、バージョンスタンプのない配列要素）

| フィールド | 説明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 恒等（スキップ）、それ以外 = オン |
| `frequencyHz` | 中心（PEAKING・NOTCH）またはコーナー（シェルフの中点・LP・HP）周波数 |
| `gainDb` | PEAKING・LOW_SHELF・HIGH_SHELF のみ使用 |
| `q` | Q 値 |
| `reserved[3]` | 0。パーサーは 0 で埋める |

**戻り値** — `STAutoEqParseStatus`。`ST_AUTOEQ_PARSE_OK`(0) なら `outBands[0..*outBandCount)` と `*outPreampDb` を書きます。失敗すると `*outBandCount` = 0 · `*outPreampDb` = 0 となり、エラー行・メッセージを書きます: `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`（1、必須ポインターが NULL・容量が負など） / `SYNTAX`（2、行の形式エラー） / `UNSUPPORTED`（3、対応しないコマンド・フィルター・形式） / `OUT_OF_RANGE`（4、範囲外の値） / `TOO_MANY_BANDS`（5、`ST_PARAMETRIC_EQ_MAX_BANDS` または `bandCapacity` を超過） / `EMPTY`（6、Preamp・Filter 行がひとつもない）。コンテキストがないため last_status は残りません。

</details>

<details>
<summary><code>st_off_render_set_spatializer</code> — コンテキストの空間化器（HRTF の種類）を選び、HRIR データセットをロードする</summary>

```c
int st_off_render_set_spatializer(STOFF_Context* context, int type);
```

**用途** — オフラインコンテキストの空間化実装（パンニング / 内蔵 MIT KEMAR / SADIE II D2）を選び、必要な HRIR データセットをロードします。リアルタイムの `st_rt_render_set_spatializer` と同じ値の集合を受け付けます。

**呼び出し方** — バイノーラル IR・オーディションのレンダリングはリクエスト構造体（`STOfflineBinauralIRRequestOptions.hrtfType`）でリクエストごとに空間化器を選ぶため、そのレンダリングだけを使うならこの関数を別途呼ぶ必要はありません。SADIE D2 には外部アセットファイル `SADIE_D2_44K_16bit_256tap.hrtfbin` が必要です — エンジンは環境変数 `SOUNDTRACING_SADIE_D2_HRTF_PATH`、現在の作業フォルダー、実行ファイルのフォルダー、DLL のフォルダー（それぞれそのフォルダーと上位 8 階層の `Assets/HRTF/`·`SoundTracing/Assets/HRTF/`·`Resources/HRTF/`）の順に探します。配布では DLL の隣（または上位）の `Resources/HRTF/` に置くのが最も簡単です。スレッド: `[control, blocking]` — HRIR データセットをロードする長い区間があるため、遅延に敏感なスレッドからは呼びません。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`（0、HRIR データ不要） / `ST_SPATIALIZER_MIT_KEMAR`（1、DLL 内蔵） / `ST_SPATIALIZER_SADIE_D2_KEMAR`（2、外部アセットが必要）。それ以外の値は拒否 |

**戻り値** — `1` = 適用 / `0` = 失敗。コンテキストが NULL、または `type` が範囲外なら 0。SADIE D2 を選んだのにアセットファイルがなければ 0 と `ST_STATUS_UNAVAILABLE`（"SADIE D2 HRTF asset not found ..."）を残します。

</details>

<details>
<summary><code>st_off_render_set_early_spatial_mode</code> — バイノーラル・オーディションレンダリングの初期反射レンダリング経路（exact オブジェクト / HOA3 bed）を選ぶ</summary>

```c
int st_off_render_set_early_spatial_mode(STOFF_Context* context, int mode);
```

**用途** — バイノーラル IR とオーディションレンダリングが初期反射をどの経路で出すかを選びます。`ST_EARLY_SPATIAL_OBJECTS`（既定）はすべての初期経路を exact オブジェクトとして合成する正本で、`ST_EARLY_SPATIAL_BED` はリアルタイムのヘッドホン既定経路（予算内の exact オブジェクト + 残りの初期反射・1 次散乱は HOA3 bed → バイノーラルデコード）でレンダリングします。BED でレンダリングした結果は「そのソースひとつだけがある静止シーンの同期リアルタイム出力」と同じなので、ゲームで実際に聞こえる音をオフラインで事前に聴いたり比較したりするときに使います。

**呼び出し方** — モードと計算・レンダリングは次の順序でつながります。

1. この関数でモードを選びます。IR キャッシュは空にしません。
2. `st_off_ir_compute` — BED ならリスナーごとに伝搬は 1 回、変換を 2 回行い、exact 正本と bed 変形を一緒にキャッシュします（変換時間と IR メモリだけが増え、伝搬コストは同じです）。OBJECTS なら変換も 1 回です。
3. `st_off_ir_render_binaural` / `st_off_ir_render_audition_pair` は **レンダリング時点のモード** に従います。BED で計算したキャッシュは両方の変形を持つため、再計算せずにモードを切り替えて両方をレンダリングできます。変形のないキャッシュ（OBJECTS で計算したキャッシュなど）を BED でレンダリングすると 0 と `ST_STATUS_UNAVAILABLE` が返り、その場合はモードを BED にしたまま再度 compute します。結果 info の `earlySpatialMode` が実際に使ったモードです。

圧力 IR（ソロ・ミックス・バッチ）と生 IR の照会は、モードに関係なく常に exact 正本です。IR アーカイブは BED で計算したキャッシュなら両方の変形を一緒に保存し、アーカイブをロードしてもコンテキストのモードは変わりません。BED レンダリングは IR を設置した後、無音のウォームアップ（16384 フレーム ≈ 0.37 s、出力からは破棄）で経路フェード・ゲインランプを落ち着かせてから入力を入れるため、その分レンダリング時間が増えます。複数のソースを同時に鳴らしたリアルタイム出力は、統合された bed・send をソース同士で共有するため、ペアごとの結果の合計とはわずかに異なります。両モードとも、late 拡散場をリスナー周辺の 1 次散乱の到来方向分布で重み付けします（圧力 IR は空間化を行わないため影響はありません）。

対応有無は `st_off_get_capability_word(1)` の `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE` で確認します。スレッド: `[control]` — ジョブミューテックスを取るため、進行中の compute・レンダリングが終わるまでブロックされることがあります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `mode` | `STEarlySpatialMode` — `ST_EARLY_SPATIAL_OBJECTS`（0、既定、exact 正本） / `ST_EARLY_SPATIAL_BED`（1、リアルタイム bed 経路）。それ以外の値は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗。それ以外の値なら `ST_STATUS_INVALID_ARGUMENT`、`ST_BACKEND_EXA` コンテキストで BED を選ぶと `ST_STATUS_UNAVAILABLE`（OBJECTS は常に可能です）。

</details>

<details>
<summary><code>st_off_render_get_early_spatial_mode</code> — 現在の early 空間モードを読む</summary>

```c
int st_off_render_get_early_spatial_mode(const STOFF_Context* context);
```

**用途** — `st_off_render_set_early_spatial_mode` で選んだ現在のモードを返します。既定値は `ST_EARLY_SPATIAL_OBJECTS`(0) で、リアルタイムの既定値（BED）とは異なります。

**呼び出し方** — いつでも呼べます。実際のレンダリングに使われたモードは結果 info（`STOfflineBinauralIRInfo.earlySpatialMode`、`STOFF_AuditionInfo.earlySpatialMode`）でも確認できます。スレッド: `[any]` — atomic 読み取りなので、どのスレッドからでもブロックせずに呼べます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — 現在のモード（`ST_EARLY_SPATIAL_OBJECTS`(0) / `ST_EARLY_SPATIAL_BED`(1)）。`context` が NULL なら `-1`。

</details>

<details>
<summary><code>st_off_render_set_max_delay_seconds</code> — オフラインレンダリングが使う遅延リングの長さ（秒）を決める</summary>

```c
int st_off_render_set_max_delay_seconds(STOFF_Context* context, float seconds);
```

**用途** — 圧力・バイノーラル・オーディション・バッチレンダリングが使う遅延リングの長さを決めます。遅延がリングの限界を超える exact 経路はレンダリングから外れる（late は FDN が補います）ため、既定の 4 s より遅れて到着する経路が必要な大きな空間や長い IR ではこの値を増やします。

**呼び出し方** — IR キャッシュとは無関係なレンダリング設定なので、再度 compute しなくても次のレンダリングから適用されます。リングのメモリはレンダリングするソースごとに 9 バンド × リング長です。IR アーカイブは保存時の値を記録し、ロードしたコンテキストはその値を使います（ロード後に再び変更できます）。対応有無は `st_off_get_capability_word(1)` の `ST_CAP1_OFFLINE_MAX_DELAY` で確認します。スレッド: `[control, blocking]` — ジョブミューテックスを取り、遅延リングを再割り当てします。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `seconds` | リング長（秒）。既定 4.0 s（リアルタイムの既定 2.0 s とは異なる）。範囲はリアルタイムの `st_rt_render_set_max_delay_seconds` と同じ約 0.012 s ~ 60 s。範囲外・非有限の値は拒否 |

**戻り値** — `1` = 成功 / `0` = 失敗。範囲外・非有限の値なら `ST_STATUS_INVALID_ARGUMENT`、リング長を変更できないバックエンドなら `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_render_get_max_delay_seconds</code> — 現在のレンダリング遅延リングの長さ（秒）を読む</summary>

```c
float st_off_render_get_max_delay_seconds(const STOFF_Context* context);
```

**用途** — `st_off_render_set_max_delay_seconds` で決めた（またはアーカイブからロードした）現在の遅延リングの長さを返します。

**呼び出し方** — レンダリング長より遅れて到着する経路が切り捨てられていないか確認するときに使います。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — 現在の値（秒、既定 4.0）。`context` が NULL なら `0`。

</details>

<details>
<summary><code>st_off_debug_set_collect_visual_paths</code> — 次の計算で可視化用経路をどの種類まで収集するかを決める</summary>

```c
int st_off_debug_set_collect_visual_paths(STOFF_Context* context, uint32_t mask);
```

**用途** — 伝搬経路を 3D ビューに重ねて描くための可視化経路の収集を有効にし、収集する経路の種類をマスクで選びます。既定は 0（収集しない）なので、デバッグ可視化が必要なときだけコストがかかります。

**呼び出し方** — 可視化スナップショットは `st_off_ir_compute` が発行するため、compute の **前に** マスクを決めます。計算後は `st_off_debug_get_snapshot_info` → `st_off_debug_copy_visual_paths` の順に読みます。失敗した walk まで見るには `st_off_debug_set_collect_failed_walks` も一緒に有効にします。対応有無は `ST_CAP_PATH_COLLECTION_MASK` で確認します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `mask` | `STPathCollectionFlag` のビット OR — `ST_PATH_COLLECTION_GUIDE_RAY`(1) / `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY`(2) / `ST_PATH_COLLECTION_DIRECT_TRANSMISSION`(4) / `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION`（8、反射区間を含む回折経路があるため 2 種類がひとつのビットを共有） / `ST_PATH_COLLECTION_ALL`。0 = 収集しない |

**戻り値** — `1` = 適用 / `0` = 失敗（`context` が NULL、または未定義のビット）。

</details>

<details>
<summary><code>st_off_debug_set_collect_failed_walks</code> — 可視化の収集に途中で失敗した walk も含めるかを決める</summary>

```c
void st_off_debug_set_collect_failed_walks(STOFF_Context* context, int enabled);
```

**用途** — 既定では、可視化スナップショットでは完走した経路だけが意味を持って使われます。このオプションを有効にすると途中で失敗した walk も記録し、経路がなぜ生成されないのかをデバッグできます。失敗した walk は `STVisualPathRecord.valid` = 0 で示されます。

**呼び出し方** — `st_off_debug_set_collect_visual_paths` と一緒に compute の前に設定します。失敗 walk を受け取るには `st_off_debug_copy_visual_paths` を `ST_VISUAL_PATH_COPY_ALL` で呼びます（`VALID_ONLY` は完走した経路だけをコピーします）。既定はオフです。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `enabled` | 0 = オフ（既定） / それ以外 = オン |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_ir_compute</code> — 伝搬と IR 変換を一度実行し、canonical IR キャッシュを作る</summary>

```c
int st_off_ir_compute(STOFF_Context* context);
```

**用途** — オフライン IR 生成の出発点です。登録されたリスナーごとに伝搬（幾何）と IR 変換を一度実行し、リスナー × ソースのペアごとに **canonical 生 IR** をキャッシュに作ります。生 IR は時間領域のサンプルではなくパラメータ形式（エネルギードメインの初期タップ、late 残響のセンドタップ、1 次散乱セル、late 残響の記述子）なので、IR の長さに関係なく一度だけ計算されます。以降のすべての結果はこの同じ世代から派生します。

- 生 IR の照会: `st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_*` — タップ・セル・記述子をそのままコピー
- 圧力 IR: `st_off_ir_render_pressure`（ペアひとつ） / `st_off_ir_render_pressure_mixed`（複数ソースの合計） — 広帯域モノラルまたは 9 バンド分離
- バイノーラル IR: `st_off_ir_render_binaural` — ステレオ（L/R）
- オーディション: `st_off_ir_render_audition_pair` — ドライ信号を固定 RIR の畳み込みとエンジンのレンダリング段でそれぞれレンダリング

レンダリング関数はキャッシュを消費するだけなので、長さ・出力モード・HRTF を変えて何度レンダリングしても再計算しません。

**呼び出し方** — シーン（材質・メッシュ・オブジェクト）・ソース・リスナー・伝搬オプションを設定し、`st_off_build` で加速構造を構築した後に呼びます。シーン・ソース・リスナーや IR ポリシー（大気、距離減衰、Doppler gain mode、エネルギーターゲットなど）を変えた場合は、再度 compute して初めて結果に反映されます。一方、レンダリング専用の設定（ソース EQ、early 空間モードの切り替え、遅延リングの長さ）はキャッシュを保ったまま次のレンダリングから適用されます。early 空間モードが `ST_EARLY_SPATIAL_BED` なら、ペアごとに bed 変形も一緒に作ります（`st_off_render_set_early_spatial_mode` を参照）。可視化経路の収集が有効なら、同じ世代の可視化スナップショットも発行します。

成功するとキャッシュ世代（`st_off_ir_get_cache_generation`）が変わり、すべての結果 info にその世代が載ります。計算が失敗またはキャンセルされると新しいキャッシュは発行されず、以前のキャッシュがそのまま残ります。進捗率は別スレッドから `st_off_ir_get_progress` で読み、キャンセルは `st_off_ir_request_cancel` で行います。`st_off_ir_archive_load_pair` でアーカイブをロードした render-only コンテキストでは拒否されます。`maxComputeThreads` が 1 より大きければ、並列区間はコンテキストの計算プールのワーカーで実行されます。複数のコンテキストを並列に計算するにはバッチ API（`st_off_batch_*`）を使います。

スレッド: `[control, runs-here]` — 伝搬・変換パイプライン全体が **呼び出しスレッドで実際に実行され**、終わるまで戻りません。このコンテキストのほかのジョブ（レンダリング・照会）とはジョブミューテックスで直列化されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — `1` = 成功（キャッシュを発行） / `0` = 失敗。計算失敗・キャンセル・render-only コンテキストは `ST_STATUS_INITIALIZATION_FAILED`（"canonical IR computation failed or was canceled"）。

</details>

<details>
<summary><code>st_off_ir_archive_save</code> — 現在の canonical IR キャッシュ全体をバージョン付きアーカイブファイルに保存する</summary>

```c
int st_off_ir_archive_save(STOFF_Context* context, const char* utf8Path);
```

**用途** — 計算した canonical IR キャッシュをファイルに残し、後でシーン・加速構造・伝搬・IR 変換なしに同じ結果を再びレンダリングできるようにします。重い計算は一度だけ行い、レンダリング（長さ・出力モード・HRTF の変更）は別プロセスや別のタイミングで行いたいときに使います。

**呼び出し方** — `st_off_ir_compute` が成功してキャッシュがあるときに呼びます。DSP は実行されません。一時ファイルに書いて検証した後に対象パスへ発行し、**既存のファイルは上書きしません**（その場合は失敗）。early 空間モード BED で計算したキャッシュなら bed 変形も一緒に保存し、現在のレンダリング遅延リングの長さ（`st_off_render_get_max_delay_seconds`）も記録します。可視化スナップショットは保存されません。ロードは `st_off_ir_archive_load_pair` で行います。形式・エンジンのバージョンが同じでなければロードできず、さらにホストは、アーカイブを作成した DLL と同じバイナリ（ハッシュ）であることを合わせる必要があります。`ST_BACKEND_ST` コンテキストでのみ使えます。スレッド: `[control, runs-here]` — シリアライズ・ファイル書き込みが呼び出しスレッドで実行されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `utf8Path` | 保存するファイルパス（UTF-8、NUL 終端）。空なら拒否。既存のファイルなら失敗 |

**戻り値** — `1` = 成功 / `0` = 失敗。パスが NULL・空文字列、または ST バックエンドでなければ `ST_STATUS_INVALID_ARGUMENT`、完全な canonical キャッシュがない、または保存に失敗すると `ST_STATUS_UNAVAILABLE`。失敗しても対象パスの既存ファイルはそのままです。

</details>

<details>
<summary><code>st_off_ir_archive_load_pair</code> — アーカイブからリスナー・ソースのペアをひとつロードし、レンダリング専用コンテキストにする</summary>

```c
int st_off_ir_archive_load_pair(STOFF_Context* context, const char* utf8Path, STListenerId listener, STSourceId source);
```

**用途** — `st_off_ir_archive_save` で保存したアーカイブから記録済みのペアをひとつ取り出し、シーン・BVH・伝搬・IR 変換なしにすぐレンダリングできるよう設置します。計算コストなしに保存済みの IR を聴き直したり、別の長さ・出力モードでレンダリングしたりするときに使います。

**呼び出し方** — 新しく作ったオフラインコンテキストに対して呼ぶのが典型です。ペアは新しいコールドレンダラーに設置され、その後コンテキストは **render-only** になります: `st_off_ir_compute` は拒否され、レンダリングが暗黙に再計算することもありません。`st_off_ir_clear_cache` や `st_off_trim_memory`（`ST_OFFLINE_TRIM_IR_CACHE`）を呼んだ後も render-only のままで、再びレンダリングするには再度ロードします。既存のレンダリング・照会関数（`st_off_ir_render_*`、`st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_*`）は **アーカイブに記録された ID** をそのまま受け取ります。レンダリング遅延リングの長さはアーカイブに記録された値に変わり（ロード後に再び変更可能）、early 空間モードは変わりません。可視化スナップショットは復元されません。形式・エンジンのバージョンが同じである必要があり、ホストは作成した DLL と同じバイナリであることも合わせる必要があります。`ST_BACKEND_ST` コンテキストでのみ使えます。スレッド: `[control, runs-here]` — ファイルの読み込みと設置が呼び出しスレッドで実行されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `utf8Path` | アーカイブファイルのパス（UTF-8、NUL 終端）。空なら拒否 |
| `listener` | ロードするペアのリスナー ID（アーカイブに記録された値） |
| `source` | ロードするペアのソース ID（アーカイブに記録された値） |

**戻り値** — `1` = 成功 / `0` = 失敗。パスが NULL・空文字列、または ST バックエンドでなければ `ST_STATUS_INVALID_ARGUMENT`、ペアがアーカイブにない、形式・バージョンが合わない、またはロードがキャンセルされると `ST_STATUS_UNAVAILABLE`。失敗しても、それ以前に発行されたキャッシュはそのままです。

</details>

<details>
<summary><code>st_off_ir_clear_cache</code> — canonical IR キャッシュを空にする</summary>

```c
void st_off_ir_clear_cache(STOFF_Context* context);
```

**用途** — 発行済みのオフライン照会用成果物（canonical 生 IR、アーカイブ記録、可視化スナップショット）を空にします。シーン・エンジンオプション・伝搬の作業バッファーは残します（作業バッファーまで返却するには `st_off_trim_memory`）。

**呼び出し方** — 大きなキャッシュを使い終えた後にメモリを取り戻したいときや、古い結果を誤ってレンダリングしないようにしたいときに呼びます。空にした後は `st_off_ir_compute` を再度呼ばないとレンダリング・照会ができません（それまでは `ST_STATUS_UNAVAILABLE`）。アーカイブでロードした render-only コンテキストは、空にした後に再度ロードする必要があります。`st_off_trim_memory(context, ST_OFFLINE_TRIM_IR_CACHE)` と同じです。スレッド: `[control]` — ジョブミューテックスを取るため、進行中の compute・レンダリングが終わるまで待つことがあります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_trim_memory</code> — シーン・設定は残し、IR キャッシュ・作業バッファー・レンダリング状態のメモリを返却する</summary>

```c
int st_off_trim_memory(STOFF_Context* context, uint32_t flags);
```

**用途** — コンテキストを遊ばせている間（バッチの再利用プールなど）、保持しているメモリを減らします。シーン・BVH・材質・ソース・リスナー・オプションは残すためコンテキストを作り直す必要はなく、次の compute・レンダリングはバッファーを再確保し、結果は返却していないコンテキスト・新しいコンテキストとビット単位で同一です。

**呼び出し方** — `ST_OFFLINE_TRIM_IR_CACHE` を選ぶと `st_off_ir_clear_cache` と同じなので次のレンダリングの前に compute が必要になり（アーカイブでロードした render-only コンテキストは再ロード）、選ばなければキャッシュ済みの IR をそのままレンダリングできます。バッチに登録したコンテキストは、そのジョブの完了レコードを `st_off_batch_poll` で受け取った後に呼びます。対応有無は `ST_CAP_OFFLINE_TRIM_MEMORY` で確認します。`ST_BACKEND_EXA` コンテキストはバックエンドの作業バッファーを空にしません（IR キャッシュ・実行フレームは空にします）。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `flags` | `ST_OFFLINE_TRIM_*` のビット OR。0 なら何もしない |

`flags` のビット:

| ビット | 空にするもの |
|---|---|
| `ST_OFFLINE_TRIM_IR_CACHE` (1) | `st_off_ir_clear_cache` と同じ — canonical 生 IR・アーカイブ記録・可視化スナップショット。次のレンダリングの前に compute が必要 |
| `ST_OFFLINE_TRIM_PROPAGATION_SCRATCH` (2) | 伝搬器・IR 変換器・実行フレームが次の compute のために保持する最大サイズの作業バッファー。サイズはレイ数・反射次数に従う（例: ソース 64×32 ×3、リスナー 64×64、深度 4 で約 23 MB）。キャッシュ済みの IR はそのままレンダリングされる |
| `ST_OFFLINE_TRIM_RENDER_STATE` (4) | 次のレンダリングが最初から作り直すレンダリング状態（ソースのレンダリング状態・経路状態、オフラインレンダリング計画） |
| `ST_OFFLINE_TRIM_ALL` | 3 つすべて |

**戻り値** — `1` = 成功（`flags` = 0 なら何もせず 1） / `0` = `context` が NULL、または未定義のビット（`ST_STATUS_INVALID_ARGUMENT`、何も空にしない）。

</details>

<details>
<summary><code>st_off_ir_get_progress</code> — 進行中の計算・レンダリングの進捗率（0~1）を読む</summary>

```c
float st_off_ir_get_progress(const STOFF_Context* context);
```

**用途** — `st_off_ir_compute` が呼び出しスレッドを占有して実行されている間、**別のスレッドから** 進捗率を読むための関数です。`st_off_ir_request_cancel` とともに、計算中に別スレッドから呼ぶことを意図した唯一のペアです。

**呼び出し方** — UI スレッドなどから定期的にポーリングします。進捗率は **1.0 から始まります** — 作業の総量が 0 なら「作業なし = 完了」として 1.0 を返すため、0.0 を期待するポーリングループは計算が始まる前に完了と誤判定することがあります。完了判定は `st_off_ir_compute` の戻り値で行い、進捗率は表示用にのみ使います。スレッド: `[any]` — lock-free の atomic 読み取りなので、どのスレッドからでもブロックせずに呼べます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — 進捗率 `[0, 1]`（完了した作業量 ÷ 総量、総量 0 なら 1.0）。`context` が NULL なら `0`。

</details>

<details>
<summary><code>st_off_ir_request_cancel</code> — 進行中の計算・レンダリングを中断させる</summary>

```c
void st_off_ir_request_cancel(STOFF_Context* context);
```

**用途** — 時間のかかる `st_off_ir_compute` やレンダリングを **別のスレッドから** 中断させます。`st_off_ir_get_progress` とともに lock-free で呼べる唯一のペアです。

**呼び出し方** — 計算・レンダリングの実行中に別スレッドから呼びます。呼んだ時点ですでに進行中のジョブだけが中断され、その後に新しく始まる compute・レンダリングには影響しません（事前にかけておくことはできません）。キャンセルされた compute は 0 を返して新しいキャッシュを発行しないため、以前のキャッシュがそのまま残ります。キャンセルされたレンダリングは 0 と `ST_STATUS_UNAVAILABLE` を返します。バッチジョブ全体を止めるには `st_off_batch_cancel` を使います。スレッド: `[any]` — lock-free の atomic なので、どのスレッドからでもブロックせずに呼べます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_ir_get_cache_generation</code> — 現在の canonical IR キャッシュの世代番号を読む</summary>

```c
uint64_t st_off_ir_get_cache_generation(const STOFF_Context* context);
```

**用途** — キャッシュが最後に発行された世代を返します。生 IR 記述子とすべてのレンダリング結果 info（`cacheGeneration` フィールド）にも同じ番号が載るため、何度も照会・レンダリングした結果が **同じ計算から得られたものか** をホストが確認できます。

**呼び出し方** — compute の前は 0 です。compute が成功するたびに変わります。タップのコピー・レンダリング結果の `cacheGeneration` と比較して、その間に別スレッドが再計算していないかを検査するのに使います。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |

**戻り値** — 現在の世代番号。キャッシュがない（compute 前）、または `context` が NULL なら `0`。

</details>

<details>
<summary><code>st_off_ir_get_raw_descriptor</code> — リスナー・ソースのペアの生 IR 概要（個数・世代・late 残響記述子・輸送エネルギー）を読む</summary>

```c
int st_off_ir_get_raw_descriptor(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDescriptor* outDescriptor);
```

**用途** — canonical キャッシュにあるペアひとつの生 IR のヘッダー情報を返します。タップ・セル・連続性 ID の個数（コピーバッファーのサイズ）、音速・サンプルレート、キャッシュ世代、late 残響記述子（T60・平均自由行程・室容積など）、ソース輸送のエネルギー収支を一度に得られます。エンジンのレンダリングを経ずに幾何・統計データを直接分析したり、独自のレンダラーに入れたりするときの出発点です。

**呼び出し方** — `st_off_ir_compute` の後（またはアーカイブのロード後）に呼びます。返された個数でバッファーを確保し、`st_off_ir_copy_raw_early_taps` / `st_off_ir_copy_raw_diffuse_rain_cells` / `st_off_ir_copy_raw_reverb_send_taps` / `st_off_ir_copy_raw_continuity_ids` で内容をコピーします。生 IR は early 空間モードに関係なく常に exact 正本です。対応有無は `ST_CAP_OFFLINE_RAW_IR` で確認します。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `outDescriptor` | 結果を受け取る構造体。呼び出し側が `structSize` = `sizeof(STRawIRDescriptor)`、`apiVersion` = `st_off_get_api_version()` を埋める |

**構造体** `STRawIRDescriptor`

| フィールド | 説明 |
|---|---|
| `structSize`, `apiVersion` | 呼び出し側が埋めるバージョンスタンプ |
| `cacheGeneration` | この結果が属するキャッシュ世代 |
| `listenerId`, `sourceId` | ペアの ID |
| `sampleRate` | サンプルレート（44100 Hz 固定） |
| `soundSpeedMetersPerSecond` | この計算に使った音速（m/s）。大気設定から導出された値 |
| `earlyTapCount` | 生の初期タップ数（`st_off_ir_copy_raw_early_taps` の必要個数）。幾何経路のみを数える |
| `reverbSendTapCount` | late 残響のセンドタップ数（`st_off_ir_copy_raw_reverb_send_taps` の必要個数） |
| `continuityIdCount` | 連続性 ID の総数（`st_off_ir_copy_raw_continuity_ids` の必要個数） |
| `sourceTransportEnergy` | `STRawIRSourceTransportEnergy` — ソース輸送のエネルギー収支（下表） |
| `lateReverb` | `STRawIRReverbDescriptor` — late 残響場の記述子（下表） |
| `diffuseRainCellCount` | 1 次散乱セル数（`st_off_ir_copy_raw_diffuse_rain_cells` の必要個数）。対応有無は `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` |
| `reserved[5]` | 予約 |

**構造体** `STRawIRSourceTransportEnergy` — 9 バンド配列はすべてエネルギードメインです。

| フィールド | 説明 |
|---|---|
| `valid` | 1 = 値が有効 / 0 = なし |
| `emitted[9]` | ソース輸送が放出したエネルギー |
| `diffuseReleased[9]` | 拡散エネルギーとして解放され、late 残響のセンドに回ったエネルギー |
| `escapedCoherent[9]` | コヒーレントなまま抜け出たエネルギー |
| `depthRemainder[9]` | 反射深度の上限で残ったエネルギー |
| `boundaryAndAirLoss[9]` | 境界（吸収）・空気吸収で失われたエネルギー |

**構造体** `STRawIRReverbDescriptor` — 反射率・空気の項はエネルギードメイン、`diffuseFieldPressureGain`・`level`・`dryInputGain` は圧力ドメインの線形倍率です。

| フィールド | 説明 |
|---|---|
| `valid` | 1 = 値が有効 / 0 = なし |
| `avgReflection[9]` | 平均反射率（エネルギー） |
| `airEnergyGainPerMeanFreePath[9]` | 平均自由行程ひとつ分を通過するときの空気吸収によるエネルギーゲイン |
| `eyringT60Seconds[9]` | Eyring 残響時間 T60（秒） |
| `diffuseFieldPressureGain[9]` | 拡散場の圧力ゲイン（圧力ドメイン） |
| `roomVolumeMetersCubed` | 推定室容積（m³） |
| `meanFreePath` | 平均自由行程（m） |
| `meanFreeFlightTimeSeconds` | 平均自由飛行時間（秒） |
| `boundaryHitRatio` | 境界ヒット率（無次元） |
| `reserved[2]` | 予約 |
| `level` | late レベル（圧力ドメイン） |
| `dryInputGain` | ドライ入力ゲイン（圧力ドメイン） |

長さ・容積の出力は `sceneRatio` を反映した実際のメートル単位です。

**戻り値** — `1` = 成功 / `0` = 失敗。`outDescriptor` が NULL、またはスタンプが誤っていれば `ST_STATUS_INVALID_ARGUMENT`、キャッシュがない、またはそのペアがなければ `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_early_taps</code> — ペアの生の初期タップ（直接・透過・反射・回折経路）をコピーする</summary>

```c
int st_off_ir_copy_raw_early_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRTap* outTaps, int tapCapacity);
```

**用途** — 幾何経路一つひとつをエネルギードメインのタップとして出力します（経路種別、遅延、9 バンドのエネルギーゲイン、到来方向、経路長、Doppler 勾配、経路 ID）。直接音の到着時刻・ITDG・経路数といった幾何指標を計算したり、独自のレンダラーを駆動したりするときに使います。圧力が必要なら、各バンドのエネルギーに `sqrt` を **一度** 適用します。

**呼び出し方** — 生の初期タップは **幾何経路のみ** です。圧力 IR のレンダリングに入る 1 次散乱（diffuse rain）セルは 1 ms セルに集めた統計成分なのでここには含まれず（`earlyTapCount` と連続性 ID も同様）、別途 `st_off_ir_copy_raw_diffuse_rain_cells` で受け取ります。そのため幾何指標がそのセルに揺さぶられません。サイズ照会: `outTaps` = NULL、`tapCapacity` = 0 で呼ぶと必要な個数を返します（`STRawIRDescriptor.earlyTapCount` と同じ）。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `outTaps` | タップを受け取る呼び出し側の配列。NULL ならサイズ照会（このとき `tapCapacity` は 0 でなければならない） |
| `tapCapacity` | `outTaps` の要素数。0 以上 |

**構造体** `STRawIRTap`（エネルギードメイン）

| フィールド | 説明 |
|---|---|
| `pathType` | 0 = Direct / 1 = Transmission / 2 = Reflection / 3 = Diffraction |
| `depth` | 相互作用の次数 |
| `delaySeconds` | 到着遅延（秒） |
| `delaySamples` | 到着遅延（44.1 kHz サンプル、小数を含む） |
| `bandEnergyGain[9]` | 9 バンドのエネルギーゲイン。圧力は `sqrt` で得る |
| `dirFromListener[3]` | リスナーから見た到来方向 |
| `matchDirFromListener[3]` | 経路の対応付け（連続性マッチング）にのみ使うリスナー側の方向（ワールド座標） |
| `matchDirFromSource[3]` | 経路の対応付け（連続性マッチング）にのみ使うソース側の方向（ワールド座標） |
| `pathLengthMeters` | 経路長（m、`sceneRatio` を反映） |
| `relativeSpeed` | 相対速度（m/s） — `delayChangePerSample` × 音速 |
| `delayChangePerSample` | サンプルあたりの遅延変化（Doppler 勾配） |
| `pathId` | 64 ビットのトポロジーベース経路 ID（同じ経路を計算間で対応付けるキー） |
| `interactionSignature` | 同じ `pathId` を共有する物理的な分岐を区別する相互作用・材質の判別子 |
| `continuityOffset` | このタップの連続性 ID が `st_off_ir_copy_raw_continuity_ids` 配列内で始まるインデックス |
| `continuityCount` | このタップの連続性 ID 数。一意な経路は 0（`pathId` がそのままその ID） |

**戻り値** — コピーした（または必要な）タップ数。失敗は `0`: 容量が負・`outTaps` が NULL なのに容量が 0 でない場合は `ST_STATUS_INVALID_ARGUMENT`、容量不足は `ST_STATUS_BUFFER_TOO_SMALL`、キャッシュ・ペアがなければ `ST_STATUS_UNAVAILABLE`。タップがひとつもない正常な結果も 0 なので、区別は `st_off_get_last_status` で行います。

</details>

<details>
<summary><code>st_off_ir_copy_raw_diffuse_rain_cells</code> — ペアの 1 次散乱（diffuse rain）セルをコピーする</summary>

```c
int st_off_ir_copy_raw_diffuse_rain_cells(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDiffuseRainCell* outCells, int cellCapacity);
```

**用途** — 散乱点からリスナーへ直接向かう散乱エネルギーを、直接音以降の 1 ms セルに集めた統計成分として出力します。圧力・バイノーラルレンダリングはこのセルを late ステムとしてレンダリングします（幾何経路ではないため `st_off_ir_copy_raw_early_taps` には含まれません）。レンダリング IR を生の成分に分解したり、独自のレンダラーで 1 次散乱を再現したりするときに使います。

**呼び出し方** — 契約はほかの生コピーと同じです: `outCells` = NULL、`cellCapacity` = 0 なら必要な個数（`STRawIRDescriptor.diffuseRainCellCount` と同じ）を返します。散乱がなければ 0 です。レンダリング圧力 = `polarity` × √(エネルギー) です。対応有無は `st_off_get_capability_word(1)` の `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` で確認します。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `outCells` | セルを受け取る呼び出し側の配列。NULL ならサイズ照会（このとき `cellCapacity` は 0 でなければならない） |
| `cellCapacity` | `outCells` の要素数。0 以上 |

**構造体** `STRawIRDiffuseRainCell`（エネルギードメイン）

| フィールド | 説明 |
|---|---|
| `pathId` | セル番号だけで決まる決定的な ID（同じセルは同じ ID） |
| `cellIndex` | 直接音以降の 1 ms セル番号（0 から） |
| `polarity` | レンダリング圧力の符号 +1 / −1（セルごとに決定的） |
| `delaySeconds` | セル内のエネルギー加重到着時刻（秒） |
| `delaySamples` | 同じ値（44.1 kHz サンプル） |
| `bandEnergyGain[9]` | 9 バンドのエネルギーゲイン |
| `dirFromListener[3]` | エネルギー加重の到来方向（リスナーローカル） |
| `delayChangePerSample` | サンプルあたりの遅延変化 |
| `reserved[4]` | 予約 |

**戻り値** — コピーした（または必要な）セル数。失敗は `0`: 引数エラーは `ST_STATUS_INVALID_ARGUMENT`、容量不足は `ST_STATUS_BUFFER_TOO_SMALL`、キャッシュ・ペアがなければ `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_reverb_send_taps</code> — ペアの late 残響センドタップ（拡散エネルギーイベント）をコピーする</summary>

```c
int st_off_ir_copy_raw_reverb_send_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRReverbSendTap* outTaps, int tapCapacity);
```

**用途** — ソース輸送から得た統計的な拡散エネルギーイベント（late 残響タンクを励起するセンドタップ）を出力します。エンジンのレンダリングでは、これらのタップが圧力として実現されて FDN に入ります。exact 初期経路（直接・透過・反射・回折）は FDN に入らず、別経路でレンダリングされます。late 残響の時間・スペクトル入力を分析したり、独自のリバーブに入れたりするときに使います。

**呼び出し方** — `outTaps` = NULL、`tapCapacity` = 0 なら必要な個数（`STRawIRDescriptor.reverbSendTapCount` と同じ）を返します。レンダリングリクエストの `reverbSendMask` が、これらのタップのうちどれがタンクを励起するかを選びます。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `outTaps` | タップを受け取る呼び出し側の配列。NULL ならサイズ照会（このとき `tapCapacity` は 0 でなければならない） |
| `tapCapacity` | `outTaps` の要素数。0 以上 |

**構造体** `STRawIRReverbSendTap`（エネルギードメイン）

| フィールド | 説明 |
|---|---|
| `sourcePathType` | ソース側の経路系統のルーティングタグ（現在のソース輸送は Reflection） |
| `role` | `STReverbSendRole` — 現在の値は `ST_REVERB_SEND_OBSERVED_SCATTER`(0) ひとつ |
| `depth` | 安定した輸送時間ビンの順番 |
| `reserved0` | 予約 |
| `delaySeconds` | 遅延（秒） |
| `delaySamples` | 遅延（44.1 kHz サンプル） |
| `bandEnergy[9]` | 9 バンドのエネルギー |
| `matchDirFromSource[3]` | ソース側の方向 |
| `pathLengthMeters` | 経路長（m、`sceneRatio` を反映） |
| `relativeSpeed` | 相対速度（m/s） |
| `delayChangePerSample` | サンプルあたりの遅延変化 |
| `pathId` | 64 ビットの経路 ID |

**戻り値** — コピーした（または必要な）タップ数。失敗は `0`: 引数エラーは `ST_STATUS_INVALID_ARGUMENT`、容量不足は `ST_STATUS_BUFFER_TOO_SMALL`、キャッシュ・ペアがなければ `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_continuity_ids</code> — 生の初期タップの連続性経路 ID 配列をコピーする</summary>

```c
int st_off_ir_copy_raw_continuity_ids(STOFF_Context* context, STListenerId listener, STSourceId source, uint64_t* outPathIds, int idCapacity);
```

**用途** — ひとつのタップにまとめられた経路が複数のトポロジー経路 ID を持つとき、同じ経路と判定されたそれらの ID（エイリアス）をひとつの平坦な配列として出力します。タップ `i` の ID は `outPathIds[taps[i].continuityOffset .. + taps[i].continuityCount)` です。一意な経路のタップは範囲が空です（`pathId` がそのままその ID）。計算結果間の経路の対応付けをホストが自前で行うとき、代表 `pathId` が変わっても同じ経路だと識別するのに使います。

**呼び出し方** — `st_off_ir_copy_raw_early_taps` と同じキャッシュ世代から一緒にコピーします（1 次散乱セルは含まれません）。`outPathIds` = NULL、`idCapacity` = 0 なら必要な個数（`STRawIRDescriptor.continuityIdCount` と同じ）を返します。スレッド: `[control]` — ジョブミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `outPathIds` | 64 ビットの経路 ID を受け取る呼び出し側の配列。NULL ならサイズ照会（このとき `idCapacity` は 0 でなければならない） |
| `idCapacity` | `outPathIds` の要素数。0 以上 |

**戻り値** — コピーした（または必要な）ID 数。失敗は `0`: 引数エラーは `ST_STATUS_INVALID_ARGUMENT`、容量不足は `ST_STATUS_BUFFER_TOO_SMALL`、キャッシュ・ペアがなければ `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_init_pressure_request</code> — 圧力 IR リクエスト構造体を既定値で埋める</summary>

```c
void st_off_ir_init_pressure_request(STOfflinePressureIRRequestOptions* outOptions);
```

**用途** — `STOfflinePressureIRRequestOptions` のバージョンスタンプと既定値を一度に埋めます。圧力 IR のレンダリング（`st_off_ir_render_pressure`、`st_off_ir_render_pressure_mixed`、`st_off_batch_add_pressure_render*`）に渡す前に、必ずこの関数で初期化してから必要なフィールドだけを変更します。

**呼び出し方** — いつでも呼べます。スレッド: `[any]` — 呼び出し側の構造体を埋めるだけなので、どのスレッドからでもブロックせずに呼べます。

| パラメータ | 説明 |
|---|---|
| `outOptions` | 埋める構造体。NULL なら何もしない |

**構造体** `STOfflinePressureIRRequestOptions`

| フィールド | 既定値 | 説明 |
|---|---|---|
| `structSize` | `sizeof(STOfflinePressureIRRequestOptions)` | バージョンスタンプ |
| `apiVersion` | `st_off_get_api_version()` の値 | バージョンスタンプ |
| `outputMode` | `ST_PRESSURE_IR_BROADBAND_MONO`(0) | `STPressureIROutput` — `ST_PRESSURE_IR_BROADBAND_MONO`（0、広帯域モノラル 1 チャンネル） / `ST_PRESSURE_IR_SEPARATE_BANDS`（1、9 バンド分離）。同じリクエストではモノラル = 9 バンドの合計が成り立つ |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 結果に含める成分。`ST_OFFLINE_OUTPUT_DIRECT`(1) / `TRANSMISSION`(2) / `REFLECTION`(4) / `DIFFRACTION`(8) / `LATE_REVERB`(16) の OR。まとめ `ST_OFFLINE_OUTPUT_EARLY_ALL`（初期 4 種）、`ST_OFFLINE_OUTPUT_FULL`（すべて）。`LATE_REVERB` は late 残響と 1 次散乱セルを一緒に含める。`FULL` 以外のビットは拒否 |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | late 残響タンクを励起するセンドタップを初期経路の 4 ビット（`ST_OFFLINE_OUTPUT_DIRECT`·`TRANSMISSION`·`REFLECTION`·`DIFFRACTION`）で選ぶ。`ST_OFFLINE_REVERB_SEND_ALL` = `ST_OFFLINE_OUTPUT_EARLY_ALL`。`EARLY_ALL` 以外のビットは拒否 |
| `renderMethod` | 0 | レンダラーの選択子。圧力 IR のレンダラーはひとつで、0・1・2（`ST_PRESSURE_IR_RENDER_SIMULATE` / `SYNTHESIZE_EXACT` / `SIMULATE2`、レガシーのエイリアス）はすべて同じレンダリングに行き、結果はバイト単位で同一。新しいコードは 0。それ以外の値は拒否 |
| `reserved[9]` | 0 | 予約 |

`outputMask` は聞こえる（返される）成分を、`reverbSendMask` はどのセンドタップが late タンクを励起するかを決めます。たとえば `outputMask` = `ST_OFFLINE_OUTPUT_LATE_REVERB` だけにすると、初期経路を除いた late ステムだけが得られます。

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_ir_get_pressure_band_centers</code> — 9 バンド圧力 IR のバンド中心周波数（Hz）をコピーする</summary>

```c
int st_off_ir_get_pressure_band_centers(float* outHz, int capacity);
```

**用途** — `ST_PRESSURE_IR_SEPARATE_BANDS` の結果のバンド `b` がどの周波数帯域かを知らせます。エンジンのバンドは 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz の 9 個（`ST_FREQUENCY_BANDS`）です。

**呼び出し方** — コンテキストなしでいつでも呼べます。バンド分離 IR を保存したりグラフに描いたりするときのラベルに使います。対応有無は `ST_CAP_OFFLINE_PRESSURE_BAND_METADATA` で確認します。スレッド: `[any]` — コンパイル時定数をコピーします。

| パラメータ | 説明 |
|---|---|
| `outHz` | 中心周波数を受け取る配列。NULL ならサイズ照会（このとき `capacity` は 0） |
| `capacity` | `outHz` の要素数。9 以上でなければならない |

**戻り値** — バンド数 `9`（コピー成功またはサイズ照会）。`capacity` が 9 より小さい、または `outHz` が NULL なのに `capacity` が 0 でなければ `0`。

</details>

<details>
<summary><code>st_off_ir_render_pressure</code> — リスナー・ソースのペアひとつの圧力 IR（広帯域モノラルまたは 9 バンド）をレンダリングする</summary>

```c
int st_off_ir_render_pressure(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — canonical キャッシュのペアひとつを時間領域の圧力インパルス応答（RIR）としてレンダリングします。exact 初期経路とセンドタップをインパルスとして合成し、late 残響は FDN でレンダリングします。音響分析（T60・C80・EDT など）や測定値との比較、外部の畳み込みリバーブ用の IR 抽出に使います。空間化していない圧力信号で、early 空間モードに関係なく常に exact 正本です。

**呼び出し方** — `st_off_ir_compute` の後に呼びます。結果は呼び出し側が所有するバッファーに一度に書きます。

1. サイズ照会: `outValues` = NULL、`capacityValues` = 0 で呼ぶと必要な値の個数を返し、ペアが有効なら `outInfo` も埋めます。
2. そのサイズでバッファーを確保して再度呼びます。

サンプルレートは 44100 Hz 固定です。長さは `floor(seconds × 44100)` フレームで、値の個数はモノラルならフレーム数、バンド分離なら 9 × フレーム数です。バンド分離の配置は `values[band × bandStride + sample]`（`bandStride` = `frameCount`）です。出力は **正規化しない** 絶対レベルで、正規化オプションはありません。遅延リングの限界（`st_off_render_set_max_delay_seconds`、既定 4 s）より遅れて到着する exact 経路は除外されます。ソース EQ がかかっていれば同じフィルターが適用されます。同じリクエストを繰り返しレンダリングするとビット単位で同一です。別スレッドから `st_off_ir_request_cancel` で中断できます。対応有無は `ST_CAP_OFFLINE_PRESSURE_IR` で確認します。スレッド: `[control, blocking]` — レンダリングが呼び出しスレッドで実行され、このコンテキストのほかのジョブと直列化されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `seconds` | IR の長さ（秒）。有限の正の値、最小 1 フレーム |
| `options` | `st_off_ir_init_pressure_request` で初期化したリクエスト。NULL 不可。フィールドはその項を参照 |
| `outValues` | 結果を受け取る呼び出し側のバッファー（float）。NULL ならサイズ照会 |
| `capacityValues` | `outValues` の float 個数。サイズ照会なら 0 |
| `outInfo` | 結果のメタデータ。NULL 可。渡す場合は呼び出し側が `structSize` = `sizeof(STOfflinePressureIRInfo)`、`apiVersion` を埋める |

**構造体** `STOfflinePressureIRInfo`

| フィールド | 説明 |
|---|---|
| `structSize`, `apiVersion` | 呼び出し側が埋めるバージョンスタンプ |
| `cacheGeneration` | レンダリングに使ったキャッシュ世代 |
| `listenerId` | リスナー ID |
| `sourceId` | ソース ID。ミックスレンダリングは `-1` |
| `sampleRate` | 44100 |
| `frameCount` | フレーム数 |
| `bandCount` | 1（広帯域モノラル）または 9（バンド分離） |
| `bandStride` | バンド間の間隔 = `frameCount` |
| `valueCount` | 全 float 個数 = `frameCount × bandCount` |
| `outputMode` | 実際に使った `STPressureIROutput` |
| `reverbSendTapCount` | レンダリングに入ったセンドタップ数（ミックスレンダリングはソースごとの合計） |
| `outputMask`, `reverbSendMask` | 実際に使ったマスク |
| `sourceCount` | レンダリングに入ったソース数。ソロレンダリングは 1 |
| `reserved[9]` | 予約 |

**戻り値** — 書いた（または必要な）float 個数。失敗は `0`: キャッシュがなければ `ST_STATUS_UNAVAILABLE`、リクエスト・長さ・マスク・スタンプが誤っている、またはサイズ照会でペアがなければ `ST_STATUS_INVALID_ARGUMENT`、バッファーが足りなければ `ST_STATUS_BUFFER_TOO_SMALL`、レンダリングの失敗・キャンセルは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_render_pressure_mixed</code> — リスナーひとつと複数のソースを一度に載せ、合成された圧力 IR をひとつレンダリングする</summary>

```c
int st_off_ir_render_pressure_mixed(STOFF_Context* context, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 同じリスナーに対する複数ソースの RIR を個別にレンダリングして足す代わりに、ひとつのインパルスレンダリングにすべて載せて RIR をひとつ出力します。結果はソースごとの `st_off_ir_render_pressure` の結果の合計と同じです: exact タップはリクエスト順に同じ出力へ累積され、センドはリスナー側に振幅（符号を含む）のまま累積されて FDN は一度だけ実行されます。FDN は線形・時不変なので、late もソロの合計と同様にコヒーレントに加算されつつ、FDN のコストは一度で済みます。複数の音源が同時に鳴るシーンの RIR が必要なときに使います。

**呼び出し方** — `st_off_ir_compute` の後に呼びます。バッファー・サイズ照会の規約、長さ・サンプルレート・正規化なしは `st_off_ir_render_pressure` と同じです。そのリスナーのソースの一部だけを入れても構いません。浮動小数点の加算順序だけがソロの合計と異なるためビット単位で同一ではなく、加算順序は `sources` 配列の順です（ソースの登録順とは無関係）。同じリクエストの繰り返しレンダリングはビット単位で同一で、`sourceCount` = 1 ならソロレンダリングとビット単位で同一です。生 IR の照会は引き続きソースごとです。対応有無は `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED` で確認します。スレッド: `[control, blocking]` — レンダリングが呼び出しスレッドで実行されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `sources` | ソースハンドルの配列。重複なし、すべてそのリスナーの canonical ペアである必要がある |
| `sourceCount` | ソース数。`1` 以上 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`(1024) 以下 |
| `seconds` | IR の長さ（秒）。有限の正の値、最小 1 フレーム |
| `options` | `st_off_ir_init_pressure_request` で初期化したリクエスト |
| `outValues` | 結果バッファー。NULL ならサイズ照会 |
| `capacityValues` | `outValues` の float 個数。サイズ照会なら 0 |
| `outInfo` | 結果のメタデータ（`STOfflinePressureIRInfo`、フィールドは `st_off_ir_render_pressure` の項を参照）。NULL 可。`sourceId` = -1、`sourceCount` = ソース数、`reverbSendTapCount` = ソースごとの合計 |

**戻り値** — 書いた（または必要な）float 個数。失敗は `0`: キャッシュがなければ `ST_STATUS_UNAVAILABLE`、重複・未登録のソース・不正なリクエストは `ST_STATUS_INVALID_ARGUMENT`、バッファーが足りなければ `ST_STATUS_BUFFER_TOO_SMALL`、レンダリングの失敗・キャンセルは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_init_binaural_request</code> — バイノーラル IR リクエスト構造体を既定値で埋める</summary>

```c
void st_off_ir_init_binaural_request(STOfflineBinauralIRRequestOptions* outOptions);
```

**用途** — `STOfflineBinauralIRRequestOptions` のバージョンスタンプと既定値を埋めます。`st_off_ir_render_binaural` と `st_off_ir_render_audition_pair` に渡す前に、必ずこの関数で初期化します。

**呼び出し方** — 既定の `hrtfType` は SADIE D2 なので、外部アセットファイルが必要です（`st_off_render_set_spatializer` の項の探索順を参照）。アセットなしで使うには `hrtfType` を `ST_SPATIALIZER_MIT_KEMAR`（1、内蔵）または `ST_SPATIALIZER_PANNING`(0) に変更します。スレッド: `[any]` — 呼び出し側の構造体を埋めるだけです。

| パラメータ | 説明 |
|---|---|
| `outOptions` | 埋める構造体。NULL なら何もしない |

**構造体** `STOfflineBinauralIRRequestOptions`

| フィールド | 既定値 | 説明 |
|---|---|---|
| `structSize` | `sizeof(STOfflineBinauralIRRequestOptions)` | バージョンスタンプ |
| `apiVersion` | `st_off_get_api_version()` の値 | バージョンスタンプ |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 結果に含める成分（`ST_OFFLINE_OUTPUT_*`、`st_off_ir_init_pressure_request` の項と同じ意味） |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | late タンクを励起するセンドタップ（初期経路の 4 ビット） |
| `hrtfType` | `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) | `STSpatializerType` — `PANNING`(0) / `MIT_KEMAR`(1) / `SADIE_D2_KEMAR`(2) |
| `reserved[10]` | 0 | 予約 |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_ir_render_binaural</code> — リスナー・ソースのペアひとつのバイノーラル（ステレオ L/R）IR をレンダリングする</summary>

```c
int st_off_ir_render_binaural(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflineBinauralIRRequestOptions* options, float* outInterleavedLR, int capacityFrames, STOfflineBinauralIRInfo* outInfo);
```

**用途** — canonical キャッシュのペアひとつを HRTF で空間化した 2 チャンネルのインパルス応答としてレンダリングします。ヘッドホン試聴用の BRIR を得たり、外部のコンボルバーに入れたりするときに使います。初期反射経路はレンダリング時点の early 空間モードに従います（`st_off_render_set_early_spatial_mode`）。

**呼び出し方** — `st_off_ir_compute` の後に呼び、サイズ照会は圧力 IR と同じ方式です（`outInterleavedLR` = NULL、`capacityFrames` = 0 → 必要なフレーム数と `outInfo`）。`capacityFrames` は float 個数ではなく **ステレオフレーム数** で、バッファーは L/R インターリーブ（`[L0, R0, L1, R1, …]`）でフレーム数 × 2 個の float を格納できる必要があります。長さは `floor(seconds × 44100)` フレーム、サンプルレートは 44100 Hz 固定です。リミッターと正規化は常にオフです（正規化オプションなし）。OBJECTS モードでは経路フェードと Doppler も固定でオフになり、BED モードは同期リアルタイムの bed 経路なので、経路フェード・Doppler・ゲインランプがリアルタイムの既定値で有効なまま定常状態でレンダリングされます（静止シーンでは結果に影響しません）。SADIE D2 アセットがなければサイズ照会から失敗します。対応有無は `ST_CAP_OFFLINE_BINAURAL_IR` で確認します。スレッド: `[control, blocking]` — レンダリングが呼び出しスレッドで実行されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `seconds` | IR の長さ（秒）。有限の正の値、最小 1 フレーム |
| `options` | `st_off_ir_init_binaural_request` で初期化したリクエスト。NULL 不可 |
| `outInterleavedLR` | L/R インターリーブの結果バッファー。NULL ならサイズ照会 |
| `capacityFrames` | バッファーの **ステレオフレーム** 数。サイズ照会なら 0 |
| `outInfo` | 結果のメタデータ。NULL 可。渡す場合は呼び出し側が `structSize` = `sizeof(STOfflineBinauralIRInfo)`、`apiVersion` を埋める |

**構造体** `STOfflineBinauralIRInfo`

| フィールド | 説明 |
|---|---|
| `structSize`, `apiVersion` | 呼び出し側が埋めるバージョンスタンプ |
| `cacheGeneration` | レンダリングに使ったキャッシュ世代 |
| `listenerId`, `sourceId` | ペアの ID |
| `sampleRate` | 44100 |
| `frameCount` | ステレオフレーム数 |
| `channelCount` | 2 固定 |
| `valueCount` | float 個数 = `frameCount × 2` |
| `reverbSendTapCount` | レンダリングに入ったセンドタップ数 |
| `outputMask`, `reverbSendMask` | 実際に使ったマスク |
| `hrtfType` | 実際に使った `STSpatializerType` |
| `earlySpatialMode` | 実際に使った `STEarlySpatialMode`（対応有無 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`） |
| `reserved[9]` | 予約 |

**戻り値** — 書いた（または必要な）ステレオフレーム数。失敗は `0`: キャッシュがない、SADIE D2 アセットがない、または BED モードなのにキャッシュに bed 変形がなければ `ST_STATUS_UNAVAILABLE`、リクエスト・スタンプが誤っている、またはサイズ照会でペアがなければ `ST_STATUS_INVALID_ARGUMENT`、バッファーが足りなければ `ST_STATUS_BUFFER_TOO_SMALL`、レンダリングの失敗・キャンセルは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_render_audition_pair</code> — ドライ信号を固定 RIR の畳み込みとエンジンのレンダリング段でそれぞれレンダリングし、ペアで返す</summary>

```c
int st_off_ir_render_audition_pair(STOFF_Context* context, STListenerId listener, STSourceId source, double irSeconds, const STOfflineBinauralIRRequestOptions* options, const float* dryMono, int dryFrames, float* outConvolvedLR, float* outStageLR, int capacityFrames, STOFF_AuditionInfo* outInfo);
```

**用途** — 同じ canonical ペアから 2 種類の試聴結果を作ります: (1) バイノーラル IR を固定 RIR としてレンダリングし、ドライ信号と畳み込んだ結果、(2) 同じペアをエンジンのレンダリング段（リアルタイムレンダリングと共有する段）に置き、ドライ信号を直接通した結果。2 つの結果を並べて聴いたり比較したりして、抽出した IR がエンジンが実際に出す音をどれだけ代表しているかを確認するときに使います。

**呼び出し方** — `st_off_ir_compute` の後に呼びます。2 つの出力バッファーはどちらも L/R インターリーブのステレオフレームで、両方渡すか両方 NULL にする必要があります。両方 NULL なら `capacityFrames` は 0 でなければならず、`dryMono` も NULL で構いません。この場合は `dryFrames` でサイズだけを計算するメタデータ照会になります。出力の長さは `dryFrames + irFrames − 1` フレーム（`irFrames` = `floor(irSeconds × 44100)`）で、各バッファーはそのフレーム数 × 2 個の float を格納できる必要があります。空間化器・マスク・early 空間モード・リミッター/正規化オフの規則は `st_off_ir_render_binaural` と同じです。スレッド: `[control, blocking]` — レンダリングが呼び出しスレッドで実行されます。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `irSeconds` | 畳み込みに使う IR の長さ（秒）。有限の正の値、最小 1 フレーム |
| `options` | `st_off_ir_init_binaural_request` で初期化したリクエスト（`STOfflineBinauralIRRequestOptions`、フィールドはその項を参照） |
| `dryMono` | 44.1 kHz モノラルのドライ信号。レンダリング時は必須、サイズ照会なら NULL 可 |
| `dryFrames` | ドライ信号のフレーム数。1 以上（サイズ照会でも必要） |
| `outConvolvedLR` | 固定 RIR の畳み込み結果（L/R インターリーブ）。`outStageLR` と一緒に NULL ならサイズ照会 |
| `outStageLR` | エンジンのレンダリング段の結果（L/R インターリーブ） |
| `capacityFrames` | 各バッファーのステレオフレーム数。サイズ照会なら 0 |
| `outInfo` | 結果のメタデータ。NULL 可。渡す場合は呼び出し側が `structSize` = `sizeof(STOFF_AuditionInfo)`、`apiVersion` を埋める |

**構造体** `STOFF_AuditionInfo`

| フィールド | 説明 |
|---|---|
| `structSize`, `apiVersion` | 呼び出し側が埋めるバージョンスタンプ |
| `cacheGeneration` | レンダリングに使ったキャッシュ世代 |
| `listenerId`, `sourceId` | ペアの ID |
| `sampleRate` | 44100 |
| `frameCount` | 出力ステレオフレーム数 = `dryFrameCount + irFrameCount − 1` |
| `dryFrameCount` | ドライ信号のフレーム数 |
| `irFrameCount` | IR のフレーム数 |
| `earlySpatialMode` | 実際に使った `STEarlySpatialMode` |
| `reserved[7]` | 予約 |

**戻り値** — 出力ステレオフレーム数。失敗は `0`: キャッシュがない、SADIE D2 アセットがない、または BED モードなのに bed 変形がなければ `ST_STATUS_UNAVAILABLE`、バッファーの片方だけが NULL・`dryFrames` が 0 以下・不正なリクエストは `ST_STATUS_INVALID_ARGUMENT`、バッファーが足りなければ `ST_STATUS_BUFFER_TOO_SMALL`、レンダリングの失敗・キャンセルは `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_debug_get_snapshot_info</code> — リスナーの最後の計算世代に対する診断スナップショットの概要（経路数・可視化バッファーサイズ）を読む</summary>

```c
int st_off_debug_get_snapshot_info(STOFF_Context* context, STListenerId listener, STPropagationSnapshotInfo* outInfo);
```

**用途** — 最後の `st_off_ir_compute` がそのリスナーについて発行した診断スナップショットの概要を返します。全体・反射・回折の経路数と回折分類カウンター、可視化経路・点の個数がすべて **同じ世代からの値** であることが `frameGeneration` で保証されます。経路数の確認と `st_off_debug_copy_visual_paths` のバッファーサイズ決定に使います。

**呼び出し方** — スナップショットは `st_off_ir_compute` が発行するため、それ以前は 0 を返します。可視化経路・点を受け取るには、compute の前に `st_off_debug_set_collect_visual_paths` で収集を有効にしておきます。返された `frameGeneration` を `st_off_debug_copy_visual_paths` にそのまま渡すと、同じ世代をコピーしているかを検査できます。スレッド: `[control]` — ジョブ・可視化ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `outInfo` | 結果構造体。呼び出し側が `structSize` = `sizeof(STPropagationSnapshotInfo)`、`apiVersion` を埋める |

**構造体** `STPropagationSnapshotInfo`

| フィールド | 説明 |
|---|---|
| `structSize`, `apiVersion` | 呼び出し側が埋めるバージョンスタンプ |
| `frameGeneration` | このスナップショットの世代（オフラインは IR キャッシュ世代） |
| `collectionMask` | この世代を収集したときの `STPathCollectionFlag` マスク |
| `reserved0` | 予約 |
| `visualPathCount` | 全可視化経路レコード数（失敗 walk を含む、`ST_VISUAL_PATH_COPY_ALL` の必要個数） |
| `validVisualPathCount` | 完走経路のレコード数（`ST_VISUAL_PATH_COPY_VALID_ONLY` の必要個数） |
| `visualPointCount` | 全可視化点数 |
| `validVisualPointCount` | 完走経路の点数 |
| `totalPathCount` | 全経路数 |
| `reflectionPathCount` | 反射経路数 |
| `diffractionPathCount` | 回折経路数 |
| `sourceSideOnlyPaths` | ソース側エッジでのみ回折した経路数 |
| `unclassifiedPaths` | 分類されていない回折経路数 |
| `sourceSideEvents` | ソース側の回折イベント数 |
| `terminalOnlyPaths` | リスナー側の末端エッジでのみ回折した経路数 |
| `sourceAndTerminalPaths` | 両側で回折した経路数 |
| `terminalEvents` | リスナー側の末端回折イベント数 |
| `reserved[4]` | 予約 |

完走経路とその点は、各配列の先頭部分（prefix）を占めます。

**戻り値** — `1` = 成功 / `0` = 失敗またはスナップショットなし（compute 前、そのリスナーがない、`outInfo` が NULL・スタンプ不一致）。

</details>

<details>
<summary><code>st_off_debug_copy_visual_paths</code> — 可視化経路レコードと点を呼び出し側のバッファーにコピーする</summary>

```c
int st_off_debug_copy_visual_paths(STOFF_Context* context, STListenerId listener, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**用途** — 最後の計算世代の可視化経路（ソース → 相互作用点 → リスナー、ガイドレイはリスナー → ヒット点）をレコード配列と点配列にコピーし、3D ビューに描けるようにします。頂点座標はシーン単位のままなので、ホストのシーンにそのまま重ねて描けます。

**呼び出し方** — `st_off_debug_get_snapshot_info` で個数を得てバッファーを確保した後に呼びます。サイズ照会モードはありません — 容量が必要な個数より小さいと失敗します。`frameGeneration` に `st_off_debug_get_snapshot_info` が返した値を入れると、その間に新しい世代が発行された場合は失敗します。0 を入れると世代の検査なしで現在のスナップショットをコピーします。レコード `i` の点は `outPoints[pointOffset .. pointOffset + pointCount)` です。スレッド: `[control]` — ジョブ・可視化ミューテックスを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `listener` | リスナーハンドル |
| `frameGeneration` | 期待する世代（`st_off_debug_get_snapshot_info` の値）。0 = 検査なしで現在のスナップショット |
| `copyMode` | `STVisualPathCopyMode` — `ST_VISUAL_PATH_COPY_VALID_ONLY`（0、完走経路のみ） / `ST_VISUAL_PATH_COPY_ALL`（1、失敗 walk を含む）。それ以外の値は拒否 |
| `outPaths` | 経路レコードのバッファー。コピーする経路があれば NULL 不可 |
| `pathCapacity` | `outPaths` の要素数。モードに応じた経路数以上 |
| `outPoints` | 点のバッファー。コピーする点があれば NULL 不可 |
| `pointCapacity` | `outPoints` の要素数。モードに応じた点数以上 |

**構造体** `STVisualPathRecord`

| フィールド | 説明 |
|---|---|
| `pointOffset`, `pointCount` | この経路の点が点配列で占める区間（順序付きの経路） |
| `depth` | 相互作用の次数 |
| `pathKind` | `STPathKind` — `ST_PATH_GUIDE_RAY`(0) / `ST_PATH_DIRECT`（1、透過を含む） / `ST_PATH_REFLECTION`(2) / `ST_PATH_DIFFRACTION_S`（4、ソース側エッジ） / `ST_PATH_DIFFRACTION_L`（8、リスナー側の末端エッジ） / `ST_PATH_DIFFRACTION_SL`(12) / `ST_PATH_SOURCE_TRANSPORT_RAY`(16)。`ST_PATH_DIFFRACTION_UNKNOWN`(3) は通常は出現しない |
| `soundSourceIndex` | ソースインデックス。ガイドレイは -1 |
| `valid` | 1 = 完走 / 0 = 途中で失敗した walk |
| `totalLengthMeters` | 経路全体の長さ（m、`sceneRatio` を反映） |
| `reserved0` | 予約 |

**構造体** `STVisualPoint`

| フィールド | 説明 |
|---|---|
| `x`, `y`, `z` | 頂点座標（シーン単位のまま） |
| `flags` | `STVisualPointFlag` — `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`（1、回折点） |

**戻り値** — `1` = 成功 / `0` = 失敗。`copyMode` が誤っている、または必要なバッファーが NULL なら `ST_STATUS_INVALID_ARGUMENT`、スナップショットがない、または世代が変わっていれば `ST_STATUS_UNAVAILABLE`、容量が足りなければ `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_off_debug_copy_mesh_accel_nodes</code> — メッシュ BLAS のノードボックスを可視化用にコピーする</summary>

```c
int st_off_debug_copy_mesh_accel_nodes(STOFF_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 伝搬が使うメッシュの加速構造（BLAS）のノード境界ボックスを読み取り専用でコピーします。加速構造がメッシュをどう分割したかをデバッグ可視化するときに使います。リアルタイムの `st_rt_debug_copy_mesh_accel_nodes` と同じ契約で、オフラインコンテキストもリアルタイムと同じ境界設定で BLAS を構築するため、加速構造の種類が同じなら結果も同じです。

**呼び出し方** — メッシュを作成した後いつでも呼べます。BLAS はメッシュ作成時点の `st_off_scene_set_accel` の値で構築されます。ノードは深さ優先の **前順（pre-order）** で、ルートが `[0]`（depth 0）であり、各ノードの親は配列の前方で最も近い depth − 1 のノードです。座標は `st_off_mesh_create` に渡した頂点フレーム（メッシュローカル）なので、インスタンスとして描くにはホストがオブジェクトの変換を掛けます。大きなメッシュは数千ノードになるため、通常は `maxDepth` で上位だけを見ます。バッファーが足りなければ前順の先頭部分（最も左の枝から）だけが書かれるので、上位を見たい場合は `maxDepth` で切ります。対応有無は `ST_CAP_ACCEL_DEBUG_NODES` で確認します。スレッド: `[control]` — シーンの read ロックのみを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `mesh` | メッシュハンドル |
| `maxDepth` | 負 = 全深度。0 以上なら depth が `maxDepth` 以下のノードのみを数える・書く |
| `outNodes` | ノードバッファー。NULL ならサイズ照会（`nodeCapacity` は無視） |
| `nodeCapacity` | `outNodes` の要素数。先頭から min(全体, `nodeCapacity`) 個を書く |

**構造体** `STAccelNode`（32 バイト、バージョンスタンプのない配列要素）

| フィールド | 説明 |
|---|---|
| `boundsMin[3]`, `boundsMax[3]` | ノードの境界ボックス（その加速構造が構築されたフレーム、`sceneRatio` 変換なし） |
| `depth` | 深さ。ルート = 0 |
| `primitiveCount` | リーフ: 含まれるプリミティブ数（0 以上） / 内部ノード: -1 |

加速構造の種類ごとの意味: BVH 系（0 BinnedSAH、2 TinyBVH、3 LBVH、4 LBVH_Simd）はビルドされた二分木で、4/8-wide のトラバーサル表現はこの木を畳んだものなので、そのボックスはこのリストの部分集合です。KD（1 HybridKD）はルートボックスを分割平面で切って導出したボックスなので、兄弟ボックスは重ならず親を正確に分割し、空のリーフ（`primitiveCount` 0）があり、複数のリーフにまたがる三角形はリーフごとに数えます。

**戻り値** — `maxDepth` 内の **全体** のノード数（0 以上） / `-1` = 失敗（`context` が NULL、存在しないメッシュは `ST_STATUS_NOT_FOUND`）。切り詰められたコピーは全体数をそのまま返し、`ST_STATUS_BUFFER_TOO_SMALL` を残します。

</details>

<details>
<summary><code>st_off_debug_copy_scene_accel_nodes</code> — シーン TLAS（オブジェクトインスタンスの加速構造）のノードボックスをコピーする</summary>

```c
int st_off_debug_copy_scene_accel_nodes(STOFF_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — オブジェクトインスタンスの上に構築したシーンの加速構造（TLAS）のノード境界ボックスをコピーします。シーン全体の空間分割を可視化するときに使います。リアルタイムの `st_rt_debug_copy_scene_accel_nodes` と同じ契約です。

**呼び出し方** — 静的 TLAS は `st_off_build` が発行したもので、次のビルドまでは前回の発行版のままです（ステージングされた静的変更は見えません）。動的 TLAS は動的オブジェクトの再構築が再発行します。座標はシーン（ワールド）フレームで、TLAS リーフのプリミティブは三角形ではなくオブジェクトインスタンスです。ノード順序・`maxDepth`・サイズ照会・切り詰めの規約と `STAccelNode` のフィールドは `st_off_debug_copy_mesh_accel_nodes` の項と同じです。対応有無は `ST_CAP_ACCEL_DEBUG_NODES`。スレッド: `[control]` — シーンの read ロックのみを取ります。

| パラメータ | 説明 |
|---|---|
| `context` | オフラインコンテキストハンドル |
| `layer` | `STAccelLayer` — `ST_ACCEL_LAYER_STATIC`（0、`st_off_build` が発行した静的 TLAS） / `ST_ACCEL_LAYER_DYNAMIC`（1、動的オブジェクトの TLAS） |
| `maxDepth` | 負 = 全深度。0 以上ならその深さまで |
| `outNodes` | ノードバッファー。NULL ならサイズ照会 |
| `nodeCapacity` | `outNodes` の要素数 |

**戻り値** — `maxDepth` 内の全体のノード数（0 以上）。その TLAS がまだなければ（ビルド前、該当種類のオブジェクトなし）エラーではなく `0`。`-1` = 失敗（`context` が NULL、`layer` が範囲外なら `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_debug_build_mesh_accel_nodes</code> — コンテキストなしでメッシュひとつの BLAS を構築し、ノードボックスを返す</summary>

```c
int st_off_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — シーンやコンテキストを作る前に、メッシュひとつについて加速構造がどう構築されるかを事前に確認できるようにします（ホストエディターのプレビューなど）。メッシュ作成と同じ入力検証・同じビルド経路なので、同じ `accelKind` ならコンテキストが構築する BLAS と同じ木になります。リアルタイムの `st_rt_debug_build_mesh_accel_nodes` と結果は同じです。

**呼び出し方** — 呼び出しのたびに BLAS を新しく構築します（メッシュサイズに比例）。結果はホストがキャッシュします。ノード順序・`maxDepth`・サイズ照会・切り詰めの規約と `STAccelNode` のフィールドは `st_off_debug_copy_mesh_accel_nodes` の項と同じです。スレッド: `[any]` — グローバル状態がないため、どのスレッドからでも呼べます（ビルドコストの分だけ時間がかかります）。

| パラメータ | 説明 |
|---|---|
| `mesh` | 三角形メッシュ（下の構造体）。NULL 不可 |
| `accelKind` | `st_off_scene_set_accel` の kind — 0 BinnedSAH / 1 HybridKD / 2 TinyBVH / 3 LBVH / 4 LBVH_Simd。`-1` = エンジン既定（TinyBVH） |
| `maxDepth` | 負 = 全深度。0 以上ならその深さまで |
| `outNodes` | ノードバッファー。NULL ならサイズ照会 |
| `nodeCapacity` | `outNodes` の要素数 |

**構造体** `STMesh`

| フィールド | 説明 |
|---|---|
| `numVertices` | 頂点数 |
| `vertices` | xyz インターリーブの float 配列（`numVertices × 3` 個） |
| `numTriangles` | 三角形数 |
| `triangles` | 頂点インデックス配列（`numTriangles × 3` 個） |

**戻り値** — `maxDepth` 内の全体のノード数（0 以上） / `-1` = 失敗（mesh・配列が NULL、個数が 0 以下、非有限の頂点、範囲外のインデックス、不正な kind、割り当て失敗）。コンテキストがないため last_status は残りません。

</details>

<details>
<summary><code>st_off_batch_create</code> — 複数コンテキストの計算・圧力 IR レンダリングを並列実行するバッチオブジェクトを作る</summary>

```c
STOFF_Batch* st_off_batch_create(int32_t workerCount);
```

**用途** — オフラインバッチランタイムの出発点です。コンテキストごとにシーン・ソース・リスナー・オプションを通常どおり設定しておき、それらのコンテキストと圧力 IR レンダリングリクエストをバッチに一度登録すると、エンジンが独自の **バッチワーカー** スレッドでジョブごとに `st_off_ir_compute` と登録済みの圧力レンダリングを順に実行し、終わったジョブをポーリングで返します。多数のシーン・位置の RIR を大量生成するとき、ホストがスレッドプールを自前で組む必要がありません。結果は、同じコンテキストで呼び出しスレッドから `st_off_ir_compute` → `st_off_ir_render_pressure` を実行したものとビット単位で同一です。

**呼び出し方** — ライフサイクルは次のとおりです。

1. `st_off_batch_create` — バッチオブジェクトの作成（この時点ではスレッドを作らない）
2. `st_off_batch_add_job` — コンテキストひとつ = ジョブひとつとして登録
3. `st_off_batch_add_pressure_render` / `st_off_batch_add_pressure_render_mixed` — ジョブごとにレンダリングリクエストを登録
4. `st_off_batch_start` — バッチワーカーを起動して即座に返る（バッチごとに 1 回）
5. `st_off_batch_poll`（完了レコードの受信） · `st_off_batch_wait` · `st_off_batch_remaining` — 進行の観察
6. `st_off_batch_fetch_pressure` — 完了したジョブの結果をコピー
7. `st_off_batch_release_job` — 受け取り終えたジョブの結果メモリを返却
8. `st_off_batch_destroy` — 残りのジョブをキャンセル、ワーカーを join、解放

バッチは圧力 IR のみを扱います（バイノーラル・オーディションのレンダリングはコンテキスト関数で直接呼びます）。バッチワーカーはコンテキスト内部の計算プールのワーカーとは別で、`STThreadType` には属しません。対応有無は `ST_CAP_OFFLINE_BATCH` で確認します。スレッド: `[any]` — バッチワーカーは start で作られます。

| パラメータ | 説明 |
|---|---|
| `workerCount` | バッチワーカー数。0 以下 = ハードウェアスレッド数。実際に起動する数はジョブ数を超えない |

**戻り値** — バッチハンドル。割り当て失敗なら NULL。

</details>

<details>
<summary><code>st_off_batch_destroy</code> — バッチをキャンセル・整理して解放する</summary>

```c
void st_off_batch_destroy(STOFF_Batch* batch);
```

**用途** — 残りのジョブをキャンセルし、バッチワーカーをすべて join した後、バッチと保管中の結果を解放します。

**呼び出し方** — 結果をすべて受け取った後、または中断したいときに呼びます。戻った後は、バッチは登録されたコンテキストをもう参照しません。実行中のジョブがキャンセルに反応して止まるまで待つため、ブロックします。スレッド: `[any, blocking]` — どのスレッドからでも呼べますが、ワーカーの join までブロックします。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル。NULL なら何もしない |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_batch_get_last_status</code> — バッチ自体の最後の呼び出しのステータスコードを読む</summary>

```c
int st_off_batch_get_last_status(const STOFF_Batch* batch);
```

**用途** — バッチ関数（`add_*`、`start`、`fetch_pressure`、`release_job` など）が失敗したとき、原因を `STStatus` で返します。ジョブごとの失敗（計算・レンダリングの失敗）はここではなく `st_off_batch_get_job_error` で読みます。

**呼び出し方** — バッチ関数が失敗値（-1 / 0）を返した直後に呼びます。成功した呼び出しは `ST_STATUS_OK` でクリアします。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |

**戻り値** — `STStatus` の値（`ST_STATUS_OK`、`ST_STATUS_INVALID_ARGUMENT`、`ST_STATUS_UNAVAILABLE`、`ST_STATUS_BUFFER_TOO_SMALL` など）。`batch` が NULL なら `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_get_last_error</code> — バッチ自体の最後のエラーメッセージをコピーする</summary>

```c
int st_off_batch_get_last_error(const STOFF_Batch* batch, char* outMessage, int32_t capacity);
```

**用途** — `st_off_batch_get_last_status` と対になる、人が読めるエラーメッセージ（英文）を返します。

**呼び出し方** — バッチ関数が失敗した直後にログ用として呼びます。エラーがなければ空文字列です。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル。NULL なら空文字列をコピー |
| `outMessage` | メッセージを受け取るバッファー。NUL 終端、`capacity` に合わせて切り詰める |
| `capacity` | `outMessage` のバイト数。1 以上 |

**戻り値** — `1` = コピーした / `0` = `outMessage` が NULL、または `capacity` が 0 以下。

</details>

<details>
<summary><code>st_off_batch_worker_count</code> — バッチに設定されたバッチワーカー数を読む</summary>

```c
int32_t st_off_batch_worker_count(const STOFF_Batch* batch);
```

**用途** — `st_off_batch_create` に渡した値を解釈したワーカー数（0 以下を渡した場合はハードウェアスレッド数）を返します。

**呼び出し方** — いつでも呼べます。`st_off_batch_start` はこの値とジョブ数のうち小さい方の数だけワーカーを起動します。完了レコードの `workerIndex` は 0 からこの値未満です。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |

**戻り値** — ワーカー数。`batch` が NULL なら `0`。

</details>

<details>
<summary><code>st_off_batch_add_job</code> — コンテキストひとつをバッチジョブとして登録する</summary>

```c
int32_t st_off_batch_add_job(STOFF_Batch* batch, STOFF_Context* context);
```

**用途** — シーン・ソース・リスナー・オプションをすべて設定したオフラインコンテキストをジョブひとつとして登録します。ジョブはバッチワーカーひとつで `st_off_ir_compute` を実行した後、そのジョブに登録された圧力レンダリングを登録順に実行します。

**呼び出し方** — `st_off_batch_start` の **前にのみ** 受け付けます。ひとつのバッチ内で同じコンテキストを 2 つのジョブに登録しないでください。コンテキストのポインターは **借用** です: 登録からそのジョブの完了レコードを `st_off_batch_poll` で受け取るまで、そのコンテキストを破棄したりほかの API を呼んだりしてはいけません。完了レコードを受け取った後はバッチがそのコンテキストを再び参照しないため、バッチが生きていてもホストが所有権を取り戻します — 生 IR の照会、シーン・ソースの変更、破棄、別バッチへの再登録がすべて可能で、そのジョブの結果はバッチが別途保管しているので `st_off_batch_fetch_pressure` はそのまま使えます。この動作は `ST_CAP_OFFLINE_BATCH_CONTEXT_RETURN` で確認し、このビットがないライブラリではバッチを破棄するまで登録したコンテキストに触れないでください。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `context` | 登録するオフラインコンテキスト（貸し出し） |

**戻り値** — ジョブインデックス（0 から、登録順）。失敗は `-1`: `context` が無効、またはすでに start したバッチならバッチの状態に `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_add_pressure_render</code> — ジョブにリスナー・ソースのペアひとつの圧力 IR レンダリングリクエストを追加する</summary>

```c
int32_t st_off_batch_add_pressure_render(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**用途** — `st_off_ir_render_pressure` のバッチ版です。ジョブが compute を終えた後にこのリクエストをレンダリングし、結果をバッチが保管しておいて `st_off_batch_fetch_pressure` で渡します。

**呼び出し方** — `st_off_batch_start` の前に呼びます。ひとつのジョブに複数のリクエストを入れることができ、登録順に実行されます。リクエストがひとつでも失敗するとそのジョブは失敗で終わり、後続のレンダリングは実行されません。ペアの存在はレンダリング時点で検査するため、未登録のペアはジョブの失敗（`st_off_batch_get_job_error`）として現れます。リクエストのフィールド・長さ・正規化なしなど、結果の意味は `st_off_ir_render_pressure` と同じです。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `jobIndex` | `st_off_batch_add_job` が返したジョブインデックス |
| `listener` | リスナーハンドル |
| `source` | ソースハンドル |
| `seconds` | IR の長さ（秒）。有限の正の値 |
| `options` | `st_off_ir_init_pressure_request` で初期化したリクエスト（`STOfflinePressureIRRequestOptions`、フィールドはその項を参照）。登録時点でコピー |

**戻り値** — そのジョブ内のレンダリングインデックス（0 から、登録順）。失敗は `-1`: 不正なリクエスト、存在しないジョブインデックス、すでに start したバッチならバッチの状態に `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_add_pressure_render_mixed</code> — ジョブにリスナーひとつ・複数ソースのミックス圧力 IR レンダリングリクエストを追加する</summary>

```c
int32_t st_off_batch_add_pressure_render_mixed(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**用途** — `st_off_ir_render_pressure_mixed` のバッチ版です。同じジョブのソロレンダリングと **同じレンダリングインデックス空間** を使い、結果は `st_off_batch_fetch_pressure` で受け取ります（`info.sourceId` = -1、`info.sourceCount` = ソース数）。

**呼び出し方** — `st_off_batch_start` の前に呼びます。ソースリストは登録時点でコピーするため、呼び出し後に配列を再利用しても構いません。ハンドルの有効性・重複は登録時点で検査し、ペアの存在はジョブが compute を終えた後のレンダリング時点で検査するため、未登録のペアはジョブの失敗（`st_off_batch_get_job_error`）として現れます。対応有無は `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `jobIndex` | ジョブインデックス |
| `listener` | リスナーハンドル |
| `sources` | ソースハンドルの配列。重複なし |
| `sourceCount` | ソース数。`1` 以上 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`(1024) 以下 |
| `seconds` | IR の長さ（秒）。有限の正の値 |
| `options` | `st_off_ir_init_pressure_request` で初期化したリクエスト |

**戻り値** — そのジョブ内のレンダリングインデックス。失敗は `-1`: 不正なリクエスト・範囲外のソース数・無効または重複したハンドル・存在しないジョブインデックス・すでに start したバッチなら、バッチの状態に `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_start</code> — バッチワーカーを起動し、登録されたジョブの実行を開始する</summary>

```c
int st_off_batch_start(STOFF_Batch* batch);
```

**用途** — 登録を締め切り、バッチワーカーを起動します。ワーカーはジョブをひとつずつ取り出して compute とレンダリングを実行します。

**呼び出し方** — ジョブとレンダリングリクエストをすべて登録した後に一度だけ呼びます。即座に戻り、以降の進行は `st_off_batch_poll` / `st_off_batch_wait` / `st_off_batch_remaining` で観察します。start 後は `add_*` が拒否されます。バッチは再度 start できないため、新しい作業は新しいバッチで登録します。スレッド: `[control]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |

**戻り値** — `1` = 開始 / `0` = 失敗（ジョブがない、またはすでに start 済み → バッチの状態に `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_batch_poll</code> — 終わったジョブの完了レコードを取り出す</summary>

```c
int32_t st_off_batch_poll(STOFF_Batch* batch, STOfflineBatchCompletion* outCompletions, int32_t capacity);
```

**用途** — ジョブがひとつ終わるたびに生成される完了レコードを最大 `capacity` 個取り出して（キューから取り除きながら）コピーします。完了レコードを受け取ることが、そのジョブの結果を fetch し、コンテキストを取り戻すための条件です。

**呼び出し方** — start 後に任意のスレッドから定期的に呼ぶか、`st_off_batch_wait` の後にまとめて取り出します。ジョブごとにレコードはちょうど一度だけ出ます。レコードを受け取ったジョブについて `st_off_batch_fetch_pressure` → `st_off_batch_release_job` を呼びます。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `outCompletions` | レコードを受け取る配列。エンジンが各レコードの `structSize`・`apiVersion` を埋める |
| `capacity` | `outCompletions` の要素数。1 以上 |

**構造体** `STOfflineBatchCompletion`

| フィールド | 説明 |
|---|---|
| `structSize`, `apiVersion` | エンジンが埋めるバージョンスタンプ |
| `jobIndex` | 終わったジョブのインデックス |
| `status` | 0 = 成功 / 1 = compute・レンダリングの失敗（メッセージは `st_off_batch_get_job_error`） / 2 = キャンセル |
| `renderCount` | 成功した圧力レンダリング数 |
| `workerIndex` | そのジョブを実行したバッチワーカーの番号 |
| `computeMicros` | そのジョブの compute の経過時間（µs） |
| `renderMicros` | そのジョブのレンダリングの経過時間（µs） |
| `reserved[8]` | 予約 |

**戻り値** — コピーしたレコード数（0 以上）。新しい完了がない、`batch`・`outCompletions` が NULL、または `capacity` が 0 以下なら `0`。

</details>

<details>
<summary><code>st_off_batch_wait</code> — すべてのジョブが終わるまで（またはタイムアウトまで）待つ</summary>

```c
int st_off_batch_wait(STOFF_Batch* batch, int32_t timeoutMs);
```

**用途** — ポーリングループの代わりに、バッチ全体の完了をブロックして待ちます。

**呼び出し方** — start 後に呼びます。待機が終わっても完了レコードはキューに残っているので、続けて `st_off_batch_poll` で取り出します（レコードを受け取って初めて fetch・コンテキストの返却ができます）。スレッド: `[any, blocking]` — どのスレッドからでも呼べますが、完了またはタイムアウトまでブロックします。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `timeoutMs` | 最大待機時間（ms）。負 = 無限に待機 |

**戻り値** — `1` = すべてのジョブが完了 / `0` = タイムアウト、または `batch` が NULL。

</details>

<details>
<summary><code>st_off_batch_remaining</code> — まだ終わっていないジョブ数を読む</summary>

```c
int32_t st_off_batch_remaining(const STOFF_Batch* batch);
```

**用途** — 進行表示や完了判定に使う残りのジョブ数を返します。

**呼び出し方** — いつでも呼べます。終わった（成功・失敗・キャンセル）ジョブは除かれます。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |

**戻り値** — 終わっていないジョブ数。`batch` が NULL なら `0`。

</details>

<details>
<summary><code>st_off_batch_cancel</code> — 残りのジョブをキャンセルし、実行中のジョブにキャンセルをかける</summary>

```c
void st_off_batch_cancel(STOFF_Batch* batch);
```

**用途** — バッチ全体を中断します。まだ始まっていないジョブはキャンセル（`status` 2）で終わり、実行中のジョブのコンテキストには `st_off_ir_request_cancel` と同じキャンセルがかかります。

**呼び出し方** — どのスレッドからでも呼べ、待たずに戻ります。実行中だったジョブは中断のタイミングに応じて失敗（`status` 1）またはキャンセル（`status` 2）で終わります。その後もすべてのジョブの完了レコードが出るので、`st_off_batch_poll` で受け取ってからコンテキストを取り戻します。中断前に終わったジョブの結果はそのまま fetch できます。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル。NULL なら何もしない |

**戻り値** — なし。

</details>

<details>
<summary><code>st_off_batch_fetch_pressure</code> — 完了したジョブの圧力 IR レンダリング結果を呼び出し側のバッファーにコピーする</summary>

```c
int32_t st_off_batch_fetch_pressure(STOFF_Batch* batch, int32_t jobIndex, int32_t renderIndex, float* outValues, int32_t capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — バッチが保管しているレンダリング結果（値の配列とメタデータ）を取り出します。バッチは結果をコンテキストとは別に保管しているため、コンテキストを変更・破棄した後でも取り出せます。

**呼び出し方** — そのジョブの完了レコードを `st_off_batch_poll` で受け取った後に呼びます。`outValues` = NULL なら値の個数と `outInfo` だけを返すので、まずサイズを得てからバッファーを確保して再度呼びます。値の配置（モノラル / `values[band × bandStride + sample]`）と info のフィールドは `st_off_ir_render_pressure` と同じです。受け取り終えたジョブは `st_off_batch_release_job` で返却します。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `jobIndex` | ジョブインデックス |
| `renderIndex` | そのジョブのレンダリングインデックス（`add_pressure_render*` の戻り値） |
| `outValues` | 結果バッファー。NULL なら個数・info のみ |
| `capacityValues` | `outValues` の float 個数 |
| `outInfo` | 結果のメタデータ（`STOfflinePressureIRInfo`、フィールドは `st_off_ir_render_pressure` の項を参照）。NULL 可。渡す場合は呼び出し側が `structSize`・`apiVersion` を埋める |

**戻り値** — 値の個数（コピーした、または必要な float 数）。失敗は `0`: レンダリングが終わっていない、失敗した、またはすでに返却済みなら `ST_STATUS_UNAVAILABLE`、バッファーが足りなければ `ST_STATUS_BUFFER_TOO_SMALL`、`outInfo` のスタンプが誤っていれば `ST_STATUS_INVALID_ARGUMENT`（いずれもバッチの状態に残る）。

</details>

<details>
<summary><code>st_off_batch_release_job</code> — 完了したジョブの結果メモリを返却する</summary>

```c
int st_off_batch_release_job(STOFF_Batch* batch, int32_t jobIndex);
```

**用途** — 受け取り終えたジョブのレンダリング結果をバッチから消去し、メモリを取り戻します。大きなバッチで結果を受け取り次第返却すると、最大メモリ使用量が減ります。

**呼び出し方** — そのジョブの結果を `st_off_batch_fetch_pressure` ですべて受け取った後に呼びます。返却したジョブの結果はもう fetch できません。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `jobIndex` | ジョブインデックス |

**戻り値** — `1` = 返却 / `0` = ジョブがまだ終わっていない（バッチの状態に `ST_STATUS_UNAVAILABLE`）、または `batch` が NULL。

</details>

<details>
<summary><code>st_off_batch_get_job_error</code> — ジョブごとの失敗メッセージをコピーする</summary>

```c
int st_off_batch_get_job_error(const STOFF_Batch* batch, int32_t jobIndex, char* outMessage, int32_t capacity);
```

**用途** — 完了レコードの `status` が 1（失敗）または 2（キャンセル）のジョブの理由（英文）を返します。例: compute の失敗・キャンセル、未登録のペアなどによるレンダリングの失敗。

**呼び出し方** — 完了レコードを受け取った後に呼びます。バッチ関数の呼び出し自体のエラーは `st_off_batch_get_last_status` / `st_off_batch_get_last_error` で読みます。スレッド: `[any]`。

| パラメータ | 説明 |
|---|---|
| `batch` | バッチハンドル |
| `jobIndex` | ジョブインデックス |
| `outMessage` | メッセージを受け取るバッファー。NUL 終端、`capacity` に合わせて切り詰める |
| `capacity` | `outMessage` のバイト数。1 以上 |

**戻り値** — `1` = メッセージあり（コピーした） / `0` = メッセージなし（成功したジョブなど）、または引数エラー。

</details>

</details>

## スレッドモデル

![Sound-Tracing SDK (C/C++) のスレッドとデータフロー](/img/sdk/native-architecture.png)

ホストが提供するスレッドは 2 つです — **制御スレッドひとつ**（シーン・音源・リスナー・伝搬の呼び出し）と **オーディオスレッド**
（PCM 入力・レンダリング出力）。残りはエンジンがコンテキスト内で作ります。

### 呼び出し可能なスレッド

ヘッダーのすべての関数の上にタグがあります。

| タグ | 意味 | 代表的な関数 |
|---|---|---|
| `[control]` | 制御スレッド。シーンロックを取る可能性があるため、オーディオコールバックからは呼びません | 生成・シーン・音源・リスナーの setter、`st_rt_propagate`（PIPELINED ではワーカーを起こして即座に返る） |
| `[control, blocking]` | 長い排他区間 — ゲームループ・オーディオスレッドからは呼びません | `st_rt_build`、`st_rt_render_start` / `stop`、HRIR のロード、遅延リングの再割り当て |
| `[audio]` | ホストのオーディオスレッドで安全 — ロック・割り当て・システムコールなし | `st_rt_source_write_stream`、`st_rt_render_process` |
| `[any]` | どのスレッドからでも（atomic 読み取り / 定数） | `st_rt_get_timing`、`st_rt_get_thread_inventory`、`st_rt_get_lane_update_interval` |

`[control]` 呼び出しは **専用の制御スレッドひとつ** に直列化してください。公式ラッパーはすべてこの構造です。

### エンジンが作るスレッド

| 種類 (`STThreadType`) | 個数 | 役割 |
|---|---|---|
| `ST_THREAD_COMPUTE_POOL` | PIPELINED: N − 1（Direct 専用 1 + 汎用 N − 2）、N = max(3, 予算) · SYNCHRONOUS: N（N = 1 なら呼び出し元でインライン） | 伝搬レーン・IR 変換・IR 準備の task はすべてこのプールで動きます |
| `ST_THREAD_AUDIO_RENDER` | 1 (DEVICE · HOST_PULL_BUFFERED) / 0 (HOST_PULL) | ブロックレンダリング。BUFFERED ではリングを埋め、コールバックはコピーだけを行います |
| デバイススレッド | 1 (DEVICE のみ) | OS 出力デバイス（WASAPI · CoreAudio · AAudio）のドライバー。インベントリには含まれません |
| `ST_THREAD_FILE_DECODER` | ≤ 1 | `st_rt_source_set_audio_file` の入力があるときのみ。ホストストリーム入力では存在しません |

- **予算**: `STRT_CreateOptions.maxComputeThreads` — `0` = auto = min(パフォーマンスコア数, 6)。環境変数の影響はありません。
- **スケジューラー**: `STRT_CreateOptions.scheduler` — `ST_RT_SCHEDULER_PIPELINED`（既定、レーンがワーカー上で独立した周期で動く）/
  `ST_RT_SCHEDULER_SYNCHRONOUS`（`st_rt_propagate` が呼び出しスレッドで伝搬を完了してから返る）。
- **合計 (DEVICE モード)**: PIPELINED = N + 1（+ ファイルデコーダー 1）· SYNCHRONOUS = N + 2（+ 1）。HOST_PULL ではレンダリング・デバイススレッドがなくなり、
  HOST_PULL_BUFFERED ではレンダリング 1 だけが残ります。実測は `st_rt_get_thread_inventory`（`[any]`、種類別の atomic カウンター）で確認します。
- 加速構造（TinyBVH）のビルドは呼び出しスレッドで実行され、別のワーカーは作りません。

### 伝搬レーンの周期

PIPELINED の幾何レーン 3 種は `st_rt_set_lane_update_interval(ctx, lane, ms)` で **実行時にいつでも** 周期を変更できます
（`[0, 60000]` ms、範囲外は拒否）。

| `STPropagationLane` | 既定 | 意味 |
|---|---|---|
| `DIRECT` (0) | 10 ms | 連続する実行の開始間の最小間隔 |
| `REFLECTION_DIFFRACTION` (1) | 0 ms | 連続する 2 回の実行間の最小間隔。伝搬コストの大部分 — CPU を取り戻すにはまずここを上げます（初期反射がリスナーに遅れて追従する代償があり、無音・ドロップアウトはありません） |
| `REVERB` (2) | 4 ms | 実行完了から次の実行までの最小間隔 |

### スレッド属性

`st_rt_set_thread_attributes(threadType, &attr)` は **コンテキスト生成前に** 種類ごとに指定します（すでに動いているスレッドには
遡及しません。プロセス全体に適用され、FMOD の `Thread_SetAttributes` と同じ位置づけです）。論理的な役割（`LANE_*` · `IR_CONVERTER` ·
`AU_PREPARE` · `SCENE_INPUT`）には専用スレッドがないため、プールのポリシーは `ST_THREAD_COMPUTE_POOL` に設定します。

```c
STThreadAttributes attr = { sizeof attr, ST_ABI_VERSION };
attr.priority = ST_THREAD_PRIORITY_ABOVE_NORMAL;            // DEFAULT · LOW · BELOW_NORMAL · NORMAL · ABOVE_NORMAL · HIGH · TIME_CRITICAL
attr.flags    = ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES;    // または PREFER_EFFICIENCY_CORES（両方有効にすると拒否）
attr.affinityMask = 0;                                      // 論理プロセッサのビットマスク、Windows のみ尊重。0 = 指定なし
st_rt_set_thread_attributes(ST_THREAD_COMPUTE_POOL, &attr);
st_rt_set_thread_attributes(ST_THREAD_AUDIO_RENDER, &attr);
```

### 出力モードと遅延

| `renderOutputMode` | エンジンスレッド | ホストコールバックが行うこと | 遅延 |
|---|---|---|---|
| `DEVICE` (0) | レンダリング 1 + デバイス 1 | なし — エンジンがデバイスを直接開きます | デバイスバッファー |
| `HOST_PULL` (1) | なし | `st_rt_render_process` がコールバック内でブロックをレンダリング | 0 ブロック（レンダリングコストがコールバックに乗る） |
| `HOST_PULL_BUFFERED` (2) | レンダリング 1 | リングからコピーのみ（≈ memcpy） | リング ≈ 3 ブロック（`st_rt_render_get_latency_frames`） |

3 つのモードすべてで `st_rt_render_start(useHrtf)` を呼ぶ必要があります（HOST_PULL 系ではスレッド・デバイスを作らず、レンダリング許可フラグと
バイノーラル/スピーカーの選択だけを行います）。`hostSampleRate ≠ 0` の場合、レート変換はレンダリングスレッド（BUFFERED）またはコールバック（HOST_PULL）でエンジンが行います。
UE · Unity · FMOD · Wwise プラグインはすべて BUFFERED を使います。

## プラットフォームメモ

- **Android**: API 28 以上。ABI ごとの `.so` をアプリのライブラリフォルダーに置きます。
- **iOS**: 静的ライブラリひとつ（`libsoundtracing_static.a`）にリアルタイム・オフラインの両方が入っています。device / simulator を区別してリンクします。
- **Web**: `SoundTracingRealtime.mjs/.wasm` は pthreads ビルドのため、ページと Worker のレスポンスに `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp` が必要です。`[control]` 呼び出しはひとつの Worker からのみ行い（メインスレッドでのブロッキング呼び出しは
  `Atomics.wait` の制限で失敗）、オーディオは AudioWorklet と共有リングでやり取りします。TypeScript facade が必要なら [Web SDK](./web.md) を使ってください。
- **ホストサンプルレート**: エンジン内部は 44.1 kHz で、`hostSampleRate` を指定すると入力・出力をエンジンが変換します。

## 次のドキュメント

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD プラグイン](./fmod.md) · [Wwise プラグイン](./wwise.md)
