---
sidebar_position: 2
title: C/C++
description: Sound-Tracing SDK (C/C++) — 全平台共用核心的二進位檔、標頭檔、最小使用流程、函式族與執行緒規則。
---

# Sound-Tracing SDK (C/C++)

所有平台使用同一個核心。Unity · Unreal Engine · FMOD · Wwise · Web SDK 是依各平台方式包裝此二進位檔的
包裝層；在原生 C/C++ 中，只需引入標頭檔並連結對應平台的二進位檔即可。

## 發佈內容

| 平台 | 二進位檔 (`Binaries/`) | 連結 |
|---|---|---|
| Windows x64 | `Win64/Release/SoundTracingRealtime.dll` + `.lib` | 動態 |
| macOS (Universal) | `Mac/Release/libSoundTracingRealtime.dylib` | 動態 |
| Linux x86_64 | `Linux/Release/libSoundTracingRealtime.so` | 動態 |
| Android (arm64-v8a · armeabi-v7a · x86_64) | `Android/<ABI>/Release/libSoundTracingRealtime.so` | 動態 (API 28+) |
| iOS (device · simulator) | `IOS/<device\|simulator>/Release/libsoundtracing_static.a` | 靜態 |
| Web | `Web/Release/SoundTracingRealtime.mjs` + `.wasm` (pthreads) | WASM 模組 (需要 COOP/COEP) |

用於離線 IR 計算的 `SoundTracingOffline`（同一資料夾，`st_off_*`）也一併包含。標頭檔在所有平台通用。

```text
SoundTracing/
├─ Include/SoundTracing/ABI/   STRealtime.h · STOffline.h · STTypes.h
├─ Binaries/<Plat>/Release/
├─ Resources/HRTF/          SADIE_D2_44K_16bit_256tap.hrtfbin
└─ Licenses/
```

| 標頭檔 | 情境 | 函式前綴 | 作用 |
|---|---|---|---|
| `STRealtime.h` | `STRT_Context*` | `st_rt_*` | 即時傳播 + 音訊渲染 |
| `STOffline.h` | `STOFF_Context*` | `st_off_*` | 離線 IR 計算與渲染 |
| `STTypes.h` | — | `ST_*` | 共用 POD 與 enum |

實體 id 是依型別區分的控制代碼（`STMeshId` · `STObjectId` · `STSourceId` · `STListenerId` · `STMaterialId`，皆為
`struct { int32_t v; }`），**失敗即 `v < 0`**。座標系為左手系 `+Y` up · `+Z` forward，單位為公尺
（透過 `STRT_CreateOptions.sceneRatio` 指定 cm = `0.01`），聆聽者角度為弧度。

## 最小使用流程

```c
#include <SoundTracing/ABI/STRealtime.h>

STRT_CreateOptions opt;
st_rt_init_create_options(&opt);
opt.renderOutputMode = ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED; // 由主機音訊回呼拉取區塊
opt.hostSampleRate   = 48000;                                   // 0 = 44100

STRT_Context* ctx = NULL;
if (st_rt_create(&opt, &ctx) != ST_STATUS_OK) { /* st_rt_get_last_error(ctx) */ }

// 若主機混音負責音色與電平，則在建立後立即關閉（所有官方包裝層皆關閉）
STLoudnessCompensationDesc lc = { sizeof lc, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &lc);
lc.enabled = 0;
st_rt_render_set_loudness_compensation(ctx, &lc);

// 1. 材質 — 註冊預設資料庫後回傳第一個材質的控制代碼
STMaterialId mat = st_rt_material_load_defaults(ctx);

// 2. 網格 + 物件 (xyz interleaved，索引三角形)
STMesh mesh = { numVertices, vertices, numTriangles, triangles };
STMeshId meshId = st_rt_mesh_create(ctx, &mesh, mat, NULL);        // NULL = 整個網格使用同一材質
float pos[3] = {0,0,0}, q[4] = {0,0,0,1}, scale[3] = {1,1,1};
STObjectId objId = st_rt_object_create_q(ctx, meshId, pos, q, scale, /*isDynamic=*/0);

// 3. 音源與聆聽者
STSourceDesc desc = {0};
desc.positionX = 2.f; desc.positionY = 1.5f; desc.positionZ = -1.f;
desc.directionZ = 1.f; desc.intensity = 1.f; desc.isDynamic = 1;
STSourceId srcId = st_rt_source_create(ctx, &desc);
st_rt_listener_set_position(ctx, 0.f, 1.7f, 0.f);
float lq[4] = {0,0,0,1};
st_rt_listener_set_orientation_q(ctx, lq);                          // XYZW，包含 roll

// 4. 主機 PCM 輸入串流 (單聲道)
STStreamDesc sd = { sizeof sd, ST_ABI_VERSION, 48000, 1, 0 };
st_rt_source_attach_stream(ctx, srcId, &sd);
st_rt_source_play(ctx, srcId);

// 5. 建置 + 開始渲染 + 明確設定輸出級
st_rt_build(ctx);
st_rt_render_start(ctx, /*useHrtf=*/1);
STRenderOptions ro; st_rt_render_get_options(ctx, &ro);
ro.reserved0 = 1;                // Hybrid 早期反射 (即時建議)
ro.useLimiter = 0;               // 若主機主鏈負責限幅則關閉
st_rt_render_set_options(ctx, &ro);

// 6. 遊戲迴圈 (控制執行緒)
st_rt_source_set_position(ctx, srcId, x, y, z);
st_rt_propagate(ctx);            // 喚醒工作執行緒並立即返回

// 7. 音訊回呼 (主機音訊執行緒)
st_rt_source_write_stream(ctx, srcId, monoPcm, frames);
st_rt_render_process(ctx, interleavedStereoOut, frames);

st_rt_destroy(ctx);
```

## API 參考

依類別整理了即時 DLL（`st_rt_*`，`STRealtime.h`）與離線 DLL（`st_off_*`，`STOffline.h`）的全部匯出函式。展開類別與函式即可查看簽章、用途、呼叫時機與執行緒、參數和回傳值。執行緒標籤的意義見 [執行緒模型](#執行緒模型)；呼叫失敗的原因以 `st_rt_get_last_status` / `st_rt_get_last_error`（離線為 `st_off_*`）讀取。

<details>
<summary><strong>情境 · 執行期 — 建立、版本·capability、狀態、idle/run、執行緒屬性·清單、記憶體預算、計時</strong> — 24 個</summary>

<details>
<summary><code>st_rt_get_api_version</code> — 回傳此程式庫的 ABI 版本號</summary>

```c
uint32_t st_rt_get_api_version(void);
```

**用途** — 判定載入的 `SoundTracingRealtime` 程式庫與主機編譯時的標頭檔是否為同一 ABI 的基準值。以此值而非版本字串判斷相容性。

**呼叫方式** — 在載入程式庫後、建立情境前立即呼叫。將回傳值與標頭檔的 `ST_ABI_VERSION` 比較，不同則不使用該程式庫。所有帶版本戳記的結構體的 `apiVersion` 欄位也填入相同的值（`ST_ABI_VERSION`）。執行緒：`[any]` — 為編譯期常數，可在任意執行緒呼叫且不會阻塞。

| 參數 | 說明 |
|---|---|
| (無) | |

**回傳值** — 程式庫的 ABI 版本（`ST_ABI_VERSION`，目前為 `6`）。不會失敗。

</details>

<details>
<summary><code>st_rt_get_version_string</code> — 回傳產品發行版本字串</summary>

```c
const char* st_rt_get_version_string(void);
```

**用途** — 供日誌·診斷畫面顯示的人類可讀發行版本。與離線程式庫的 `st_off_get_version_string` 形式相同。

**呼叫方式** — 可隨時呼叫。不要用於 ABI 相容性判定，請使用 `st_rt_get_api_version`。執行緒：`[any]` — 可在任意執行緒無阻塞呼叫。

| 參數 | 說明 |
|---|---|
| (無) | |

**回傳值** — 程式庫內的靜態 NUL 結尾字串。呼叫端不釋放。

</details>

<details>
<summary><code>st_rt_get_capabilities</code> — 回傳能力字組 0（<code>ST_CAP_*</code>）</summary>

```c
uint64_t st_rt_get_capabilities(void);
```

**用途** — 以位元告知此程式庫支援哪些功能介面。主機在使用選用功能（主機 pull 渲染、執行緒屬性、IR 統計等）之前，先確認對應的 `ST_CAP_*` 位元，依功能有無進行分支。

**呼叫方式** — 不需情境，可隨時呼叫。與 `st_rt_get_capability_word(0)` 的值相同。字組 0 的位元只對應 `ST_CAP_*` 名稱，`ST_CAP1_*` 位元務必以 `st_rt_get_capability_word(1)` 確認（即使位置編號相同，各字組的意義也不同）。以下位置是舊能力的缺號，絕不會被設定：`ST_CAP_RETIRED_MASK`（8·9·10·13·18·20·21·25）。執行緒：`[any]` — 為編譯期常數。

| 參數 | 說明 |
|---|---|
| (無) | |

**回傳值** — 能力字組 0 的 64 位元遮罩。若設定了位元 63 `ST_CAP_CAPABILITY_WORDS`，即可用 `st_rt_get_capability_word` 讀取字組 1 以上。

</details>

<details>
<summary><code>st_rt_get_capability_word</code> — 回傳指定編號的能力字組</summary>

```c
uint64_t st_rt_get_capability_word(uint32_t word);
```

**用途** — 由於字組 0 的 64 個位置已全部用完，新能力從字組 1 起以 `ST_CAP<n>_*` 名稱加入。以此函式指定字組編號讀取。

**呼叫方式** — 不需情境，可隨時呼叫。先確認 `st_rt_get_capabilities()` 中有 `ST_CAP_CAPABILITY_WORDS`（位元 63）。例如引擎休眠（`st_rt_idle`/`st_rt_run`）以 `st_rt_get_capability_word(1) & ST_CAP1_ENGINE_IDLE` 確認，音源記憶體預算以 `ST_CAP1_MEMORY_BUDGET`（字組 1 的位元 63）確認。不要混合不同字組的位元做 AND。執行緒：`[any]` — 為編譯期常數。

| 參數 | 說明 |
|---|---|
| `word` | 字組編號。`0` = 與 `st_rt_get_capabilities()` 相同的值（`ST_CAP_*`），`1` = `ST_CAP1_*`。標頭檔已知的字組數為 `ST_CAPABILITY_WORD_COUNT`（目前為 `2`） |

**回傳值** — 該字組的 64 位元遮罩。未知字組（`word ≥ ST_CAPABILITY_WORD_COUNT`）為 `0`（= 無該能力）。

</details>

<details>
<summary><code>st_rt_get_sample_rate</code> — 回傳引擎內部取樣率</summary>

```c
int st_rt_get_sample_rate(void);
```

**用途** — 告知引擎內部使用的固定取樣率。若主機音訊以其他速率運作，則以 `STRT_CreateOptions.hostSampleRate` 讓引擎在邊界進行轉換。

**呼叫方式** — 可隨時呼叫。執行緒：`[any]` — 為編譯期常數。

| 參數 | 說明 |
|---|---|
| (無) | |

**回傳值** — `44100`（Hz，固定）。

</details>

<details>
<summary><code>st_rt_set_thread_attributes</code> — 依引擎執行緒類型指定優先順序·核心偏好·affinity</summary>

```c
int st_rt_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**用途** — 遊戲·中介軟體主機依自身的執行緒配置策略，依類型指定引擎所建立執行緒的優先順序·核心偏好·affinity（與 FMOD `Thread_SetAttributes` 作用相同）。這是與情境無關的 **處理程序全域** 表，Realtime 程式庫與 Offline 程式庫各自擁有自己的表 — 同時使用兩個程式庫時，必須在 `st_rt_` 與 `st_off_` 兩邊指定相同的值。

**呼叫方式** — 契約是 **在 `st_rt_create` 之前** 呼叫。不追溯套用至已啟動的執行緒，自之後產生的執行緒（下一次 `st_rt_create`、下一次 `st_rt_render_start`、下一次附加檔案輸入）起套用。有實際 OS 執行緒的類型只有 `ST_THREAD_COMPUTE_POOL`（計算集區）· `ST_THREAD_AUDIO_RENDER`（渲染執行緒）· `ST_THREAD_FILE_DECODER`（檔案解碼器）三種，其餘值是在共用計算集區上執行的邏輯角色，只會儲存而不套用到實體執行緒 — 計算工作的策略以 `ST_THREAD_COMPUTE_POOL` 指定。`ST_THREAD_PRIORITY_DEFAULT` 直接使用平台預設表，因此即使只指定 affinity 或核心偏好，音訊渲染執行緒的預設優先順序提升仍會保留。給定明確優先順序時，則改套用該值。執行緒：`[any]` — 以一個短暫的互斥鎖更新處理程序全域表。

| 參數 | 說明 |
|---|---|
| `threadType` | `STThreadType` 值 `0`~`10`（見下表）。超出範圍則為 `0` |
| `attributes` | 請求值。呼叫端填入 `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION`。若為 `NULL`，則將該類型恢復為預設值（重設） |

**結構體** `STThreadAttributes`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `priority` | `STThreadPriority`（見下表）。預設 `ST_THREAD_PRIORITY_DEFAULT`（0） |
| `flags` | `ST_THREAD_FLAG_*` 組合。預設 `0` |
| `affinityMask` | 邏輯處理器位元遮罩，`0` = 不指定。**僅 Windows 遵守**。若不是處理程序遮罩的子集，核心會拒絕。在超過 64 個邏輯處理器的機器上，僅在目前的處理器群組內解譯 |
| `reserved[4]` | 必須全部為 `0` |

所有欄位皆為 `0`（DEFAULT · flags 0 · affinity 0）時等同「不指定」。

**列舉** `STThreadType`

| 值 | 名稱 | 意義 |
|---|---|---|
| `0` | `ST_THREAD_LANE_DIRECT` | 邏輯角色：direct 傳播工作（無專用執行緒） |
| `1` | `ST_THREAD_LANE_GUIDE` | 邏輯角色：guide 工作 |
| `2` | `ST_THREAD_LANE_REFLECTION_DIFFRACTION` | 邏輯角色：反射/繞射工作 |
| `3` | `ST_THREAD_LANE_REVERB` | 邏輯角色：殘響工作 |
| `4` | `ST_THREAD_COMPUTE_POOL` | 實際執行緒：計算集區工作執行緒。PIPELINED 為 `max(3,N)−1` 個（含 Direct 專用 1 個），SYNCHRONOUS 在 `N>1` 時為 `N` 個 |
| `5` | `ST_THREAD_AUDIO_RENDER` | 實際執行緒：`st_rt_render_start` 開啟的渲染執行緒（`HOST_PULL` 模式下沒有） |
| `6` | `ST_THREAD_FILE_DECODER` | 實際執行緒：檔案解碼器，每個引擎最多 1 個 |
| `7` | `ST_THREAD_ACCEL_BUILD` | 保留值。加速結構建置在呼叫執行緒上執行，沒有獨立工作執行緒 |
| `8` | `ST_THREAD_IR_CONVERTER` | 邏輯角色：IR 轉換工作 |
| `9` | `ST_THREAD_AU_PREPARE` | 邏輯角色：IR 準備工作 |
| `10` | `ST_THREAD_SCENE_INPUT` | 邏輯角色：場景輸入工作 |
| `11` | `ST_THREAD_TYPE_COUNT` | 類型數（不作為引數使用） |

**列舉** `STThreadPriority`

| 值 | 名稱 | Windows | macOS QoS |
|---|---|---|---|
| `0` | `ST_THREAD_PRIORITY_DEFAULT` | 沿用平台預設表 | 沿用平台預設表 |
| `1` | `ST_THREAD_PRIORITY_LOW` | LOWEST | BACKGROUND |
| `2` | `ST_THREAD_PRIORITY_BELOW_NORMAL` | BELOW_NORMAL | UTILITY |
| `3` | `ST_THREAD_PRIORITY_NORMAL` | NORMAL | USER_INITIATED |
| `4` | `ST_THREAD_PRIORITY_ABOVE_NORMAL` | ABOVE_NORMAL | USER_INTERACTIVE |
| `5` | `ST_THREAD_PRIORITY_HIGH` | HIGHEST | USER_INTERACTIVE |
| `6` | `ST_THREAD_PRIORITY_TIME_CRITICAL` | TIME_CRITICAL | USER_INTERACTIVE |

**旗標** `ST_THREAD_FLAG_*`

| 旗標 | 意義 |
|---|---|
| `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` (`1u << 0`) | 偏好效能核心 |
| `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES` (`1u << 1`) | 偏好節能核心 |

核心偏好以 Windows 11 EcoQoS 套用，在 macOS 上會被忽略（由 QoS 類別決定叢集配置）。同時開啟兩個旗標會被拒絕。

**回傳值** — `1` = 成功 / `0` = 失敗（`threadType` 超出範圍、`structSize`/`apiVersion` 不符、`priority` 超出範圍、核心偏好旗標衝突、`reserved[]` 不為 0）。失敗時表不會變更。因不接收情境，`st_rt_get_last_status` 不會留下任何內容。

</details>

<details>
<summary><code>st_rt_get_thread_attributes</code> — 讀取依執行緒類型儲存的屬性請求值</summary>

```c
int st_rt_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**用途** — 確認以 `st_rt_set_thread_attributes` 儲存的值。回傳的不是實際套用到 OS 的值，而是 **原樣的請求值**。

**呼叫方式** — 可隨時呼叫。從未指定過的類型回傳預設值（priority `DEFAULT` · flags `0` · affinityMask `0`）。執行緒：`[any]` — 以一個短暫的互斥鎖讀取處理程序全域表。

| 參數 | 說明 |
|---|---|
| `threadType` | `STThreadType` 值 `0`~`10`。超出範圍則為 `0` |
| `outAttributes` | 輸出。呼叫端填入 `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION`。成功時填入 `priority`·`flags`·`affinityMask`，`reserved[]` 變為 0 |

`STThreadAttributes` 欄位請參閱 `st_rt_set_thread_attributes` 項目。

**回傳值** — `1` = 成功 / `0` = 拒絕（`outAttributes` 為 `NULL`、戳記不符、`threadType` 超出範圍）。

</details>

<details>
<summary><code>st_rt_init_create_options</code> — 以預設值填入建立選項結構體</summary>

```c
void st_rt_init_create_options(STRT_CreateOptions* outOptions);
```

**用途** — 以正確的版本戳記與預設值初始化 `STRT_CreateOptions`。主機以此函式填好後只修改需要的欄位，再傳給 `st_rt_create`。如此一來，日後新增的欄位也會以安全的預設值（0）填入。

**呼叫方式** — 在 `st_rt_create` 之前呼叫。`structSize` 與 `apiVersion` 會自動填入，`scheduler` 為 `ST_RT_SCHEDULER_PIPELINED`，其餘欄位皆為 `0`（各欄位的「預設」意義）。執行緒：`[any]` — 只填入呼叫端擁有的結構體。

| 參數 | 說明 |
|---|---|
| `outOptions` | 要填入的結構體。若為 `NULL` 則不執行任何動作 |

**結構體** `STRT_CreateOptions`

| 欄位 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `structSize` | `uint32_t` | `sizeof(STRT_CreateOptions)` | 版本戳記。不同則拒絕建立 |
| `apiVersion` | `uint32_t` | `ST_ABI_VERSION` | 版本戳記。不同則拒絕建立 |
| `scheduler` | `int32_t` | `ST_RT_SCHEDULER_PIPELINED`(1) | `STRT_Scheduler`。`PIPELINED`(1) = 引擎工作執行緒在背景以最新影格優先計算傳播·IR 的即時預設模式。`SYNCHRONOUS`(0) = 管線在主機呼叫 `st_rt_propagate` 的執行緒上執行的同步模式（診斷·相容用）。建立後無法變更（`st_rt_get_scheduler`） |
| `seedValue` | `uint32_t` | `0` | 相容用欄位。對預設後端的輸出沒有影響 |
| `maxDelaySeconds` | `float` | `0` | 渲染延遲環長度（秒）。`0` = 平台預設（桌面 2.0 s，Android·iOS 1.0 s，Emscripten 0.5 s）。其他值為約 0.0118 s（一個處理區塊 + 8 樣本）~60 s，須為有限值。建立後以 `st_rt_render_set_max_delay_seconds` 變更 |
| `maxComputeThreads` | `uint32_t` | `0` | 傳播·IR 計算可用的執行緒數上限 = 引擎擁有的共用計算集區寬度。`0` = 自動 = `min(效能核心數, 6)`，最少 1。不受環境變數影響。PIPELINED 下預算 `N` 至少提高到 3，分為音訊槽 1 + Direct 專用工作執行緒 1 + 一般工作執行緒 `N−2`（見下方 `st_rt_create` 的執行緒數表）。支援與否見 `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | `float` | `0` | 場景單位 → 公尺轉換係數。`0` = 預設 1.0（場景單位 = 公尺）。公分主機為 `0.01f`，英尺主機為 `0.3048f`。**僅限建立時**，沒有執行期 setter。非有限值·0 以下的值會被拒絕。支援與否見 `ST_CAP_SCENE_RATIO` |
| `renderOutputMode` | `int32_t` | `ST_RT_RENDER_OUTPUT_DEVICE`(0) | `STRT_RenderOutputMode`（見下表）。超出範圍則拒絕。支援與否見 `ST_CAP_HOST_PULL_RENDER` / `ST_CAP_HOST_PULL_BUFFERED` |
| `hostSampleRate` | `int32_t` | `0` | 主機取樣率。`0` = 引擎速率（44100）— 不建立重取樣器。其他值時，引擎以內建窗函數 sinc 轉換器轉換串流輸入（`st_rt_source_write_stream`）與 pull 輸出（`st_rt_render_process`），公開 API 中以「影格」為單位的值（`write_stream`·`render_process`·`render_get_latency_frames`·`STStreamDesc.capacityFrames`·`STStreamStatus`）**全部採用此速率**。允許範圍 `[8000, 384000]`。`DEVICE` 模式下非 0 的值會被拒絕（裝置路徑固定為引擎速率）。支援與否見 `ST_CAP_HOST_SAMPLE_RATE` |
| `backend` | `int32_t` | `ST_BACKEND_ST`(0) | `STBackend` 管線選擇。`ST_BACKEND_ST`(0) 為預設引擎。`ST_BACKEND_EXA`(1) 僅在程式庫宣告 `ST_CAP_BACKEND_EXA` 時可用，且需要 `SYNCHRONOUS` 排程器與 `maxDelaySeconds = 0`。其他·不可用的值會被拒絕 |
| `startIdle` | `uint32_t` | `0` | `0` = 建立後立即 `RUNNING`，`1` = 建立後立即 `IDLE` — 主機須呼叫 `st_rt_run` 才會執行傳播·IR·渲染（在沒有要播放的內容時避免計算空轉）。其他值會被拒絕。支援與否見 `ST_CAP1_ENGINE_IDLE` |
| `maxSources` | `uint32_t` | `0` | 最大音源數。`0` = 平台預設（桌面 128，Android·iOS 48，Emscripten 32）。建立後以 `st_rt_set_memory_budget` 變更。支援與否見 `ST_CAP1_MEMORY_BUDGET` |

**列舉** `STRT_RenderOutputMode`

| 值 | 名稱 | 意義 |
|---|---|---|
| `0` | `ST_RT_RENDER_OUTPUT_DEVICE` | 預設。`st_rt_render_start` 開啟輸出裝置與引擎渲染執行緒，由引擎直接輸出到裝置 |
| `1` | `ST_RT_RENDER_OUTPUT_HOST_PULL` | 主機 pull。引擎既不建立裝置也不建立渲染執行緒，由主機在自己的音訊執行緒上呼叫 `st_rt_render_process` 取得區塊。此模式下也必須呼叫 `st_rt_render_start(useHrtf)`（兼作雙耳/喇叭選擇與「允許渲染」旗標） |
| `2` | `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED` | 引擎渲染執行緒填充環（容量 8 區塊·目標 3 區塊），`st_rt_render_process` 只從環中複製。主機回呼成本降至 memcpy 等級，抖動由環吸收。若區塊處理本身持續超過區塊時間，環也無法阻擋，會以靜音填充。延遲上限 ≈ 引擎 3 區塊。`hostSampleRate ≠ 0` 時，轉換在渲染執行緒中進行 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_create</code> — 建立即時情境（引擎·工作執行緒·計算集區）</summary>

```c
STStatus st_rt_create(const STRT_CreateOptions* options, STRT_Context** outContext);
```

**用途** — 建立一個即時引擎實例。場景·音源·聆聽者·渲染等其他所有 `st_rt_*` 呼叫都接收此情境。排程器·計算執行緒寬度·單位倍率·輸出模式·主機取樣率等執行中無法變更的設定在此確定。

**呼叫方式** — 若要使用執行緒屬性（`st_rt_set_thread_attributes`），須先指定後再呼叫。以 `st_rt_init_create_options` 填入選項，只修改需要的欄位後傳入。成功後依場景組成（網格·物件·音源·聆聽者）→ `st_rt_build` → `st_rt_render_start` 的順序進行，結束時以 `st_rt_destroy` 釋放。建立後的初始狀態為 PIPELINED 排程器、取樣率 44100 Hz、通道更新週期 direct 10 ms / 反射·繞射 0 ms / 殘響 4 ms、引擎休眠 `RUNNING`（`startIdle = 1` 時為 `IDLE`），預設後端情境以輸出級等響度補償開啟的狀態啟動（可用 `st_rt_render_set_loudness_compensation` 關閉）。執行緒：`[control, blocking]` — 建立引擎·工作執行緒·計算集區的較長區間，不要在遊戲迴圈或音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `options` | 建立選項。若為 `NULL`，則以 `st_rt_init_create_options` 的預設值建立。自行填寫時 `structSize`/`apiVersion` 戳記必須相符 |
| `outContext` | 輸出控制代碼。成功時填入新情境，失敗時填入 `NULL`。傳入 `NULL` 則為 `ST_STATUS_INVALID_ARGUMENT` |

`STRT_CreateOptions` 欄位請參閱 `st_rt_init_create_options` 項目。

**引擎啟動的執行緒數** — `N` 在 SYNCHRONOUS 下為解析後的 `maxComputeThreads` 預算，在 PIPELINED 下為 `max(3, 解析後的預算)`。只要有一個檔案輸入（`st_rt_source_set_audio_file`），就會多 1 個檔案解碼器執行緒；主機串流輸入沒有解碼器。加速結構建置在呼叫執行緒上執行，沒有額外執行緒。

| 輸出模式 | SYNCHRONOUS | PIPELINED |
|---|---|---|
| `DEVICE` | 集區工作執行緒 `N`（N=1 時為 0，在呼叫執行緒上內嵌）+ 渲染 1 + 裝置 1 | 集區工作執行緒 `N−1`（Direct 專用 1 + 一般 `N−2`）+ 渲染 1 + 裝置 1 |
| `HOST_PULL` | 上述去掉渲染·裝置執行緒 | 上述去掉渲染·裝置執行緒 |
| `HOST_PULL_BUFFERED` | 只有渲染執行緒，沒有裝置執行緒 | 只有渲染執行緒，沒有裝置執行緒 |

PIPELINED 的渲染執行緒是預算 `N` 內的音訊槽，只提升優先順序。實際數量以 `st_rt_get_thread_inventory` 確認。

**回傳值** — `STStatus`。
- `ST_STATUS_OK` — 成功。
- `ST_STATUS_INVALID_ARGUMENT` — `outContext` 為 `NULL`，或選項值超出範圍（`scheduler`、`maxDelaySeconds`、`sceneRatio`、`renderOutputMode`、`hostSampleRate`、`backend`、`startIdle`）。
- `ST_STATUS_VERSION_MISMATCH` — `structSize`/`apiVersion` 不符。
- `ST_STATUS_INITIALIZATION_FAILED` / `ST_STATUS_ALLOCATION_FAILED` — 引擎初始化·配置失敗。

失敗原因字串以 `st_rt_get_last_error(NULL, ...)` 讀取（同一呼叫執行緒上最後一次失敗的建立）。

</details>

<details>
<summary><code>st_rt_get_backend</code> — 回傳情境使用的管線後端</summary>

```c
int st_rt_get_backend(const STRT_Context* context);
```

**用途** — 確認建立時以 `STRT_CreateOptions.backend` 選擇的管線。不支援執行中切換。

**呼叫方式** — 建立後可隨時呼叫。執行緒：`[control]` — 在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STBackend` 值（`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1）。`context` 為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_destroy</code> — 釋放情境（停止·join 工作執行緒）</summary>

```c
void st_rt_destroy(STRT_Context* context);
```

**用途** — 釋放情境與引擎擁有的所有資源（場景、音源、工作執行緒·計算集區執行緒、渲染輸出）。

**呼叫方式** — 情境使用結束時呼叫一次。呼叫後控制代碼即失效，因此不得有其他執行緒正在使用同一情境。執行緒：`[control, blocking]` — 會停止並 join 工作執行緒，因此不要在音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 要釋放的情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_get_last_status</code> — 讀取情境中留下的最後狀態碼</summary>

```c
STStatus st_rt_get_last_status(const STRT_Context* context);
```

**用途** — 回傳 `int`/`void` 的函式失敗時，以 `STStatus` 確認其原因。許多函式在失敗時會在此診斷欄位留下狀態。

**呼叫方式** — 收到失敗後，立即在同一控制執行緒上呼叫。人類可讀的訊息以 `st_rt_get_last_error` 取得。若有音訊路徑（`st_rt_render_process`）留下的狀態，會先回傳它並清空。多個執行緒同時使用同一情境時，錯誤路徑的診斷記錄不會被序列化。執行緒：`[control]` — 在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 最後的 `STStatus`。`context` 為 `NULL` 時為 `ST_STATUS_INVALID_CONTEXT`。

| 值 | 名稱 |
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
| `11` | `ST_STATUS_BUDGET_EXCEEDED` — 超出音源記憶體預算（`st_rt_source_create`，拒絕策略為 `ST_MEMORY_REJECT_NEW` 時） |

</details>

<details>
<summary><code>st_rt_get_last_error</code> — 複製最後的錯誤訊息字串</summary>

```c
int st_rt_get_last_error(const STRT_Context* context, char* outMessage, int capacity);
```

**用途** — 取得最後一次失敗的人類可讀說明並記錄到日誌。對 `context` 傳入 `NULL` 時，可讀取沒有情境的 `st_rt_create` 失敗原因。

**呼叫方式** — 在失敗後立即呼叫。若想先知道所需大小，以 `outMessage = NULL` 呼叫只取得回傳值。`context = NULL` 時為 **此呼叫執行緒** 上最後一次失敗的 `st_rt_create` 的訊息，下一次 `st_rt_create` 呼叫會將其清除。執行緒：`[control]` — 在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼。若為 `NULL`，則為此執行緒最後一次建立失敗的訊息 |
| `outMessage` | 輸出緩衝區。若為 `NULL`，則不複製，只回傳大小 |
| `capacity` | `outMessage` 的位元組數。不足時截斷為 `capacity − 1` 位元組並以 NUL 結尾 |

**回傳值** — 容納完整訊息所需的位元組數（含 NUL）。回傳值大於 `capacity` 表示已被截斷。

</details>

<details>
<summary><code>st_rt_is_acoustic_feature_enabled</code> — 讀取個別聲學功能（空氣吸收·傳播延遲·直達聲遮蔽）是否開啟</summary>

```c
int st_rt_is_acoustic_feature_enabled(const STRT_Context* context, int feature);
```

**用途** — 確認以 `st_rt_set_acoustic_feature_enabled` 開關的聲學功能目前狀態。與路徑類型閘門一起用於聆聽 A/B 比較（逐一分離哪些因素對聲音有貢獻）。

**呼叫方式** — 建立後可隨時呼叫。預設三項功能皆開啟。執行緒：`[control]` — 無鎖讀取引擎狀態，但在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`（0，大氣衰減·高頻損失）/ `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`（1，基於路徑長度的傳播延遲）/ `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`（2，直達聲遮蔽） |

**回傳值** — `1` = 開啟 / `0` = 關閉 / `-1` = `context` 為 `NULL`。

</details>

<details>
<summary><code>st_rt_idle</code> — 讓整個引擎休眠（停止計算，渲染輸出尾音後靜音）</summary>

```c
int st_rt_idle(STRT_Context* context);
```

**用途** — 在沒有要播放的內容時（播放停止·暫停·無房間），停止傳播·IR 計算與渲染處理以收回 CPU。快取與平滑歷程會保留，因此以 `st_rt_run` 喚醒後會接續計算。

**呼叫方式** — 渲染中可隨時呼叫，且不等待完成。呼叫後，傳播通道·IR 組合·IR 準備工作的新執行會停止（已在執行的 1 次會執行到底）。渲染以已採用的 IR 繼續輸出輸入與尾音，直到以下條件全部滿足時才停止處理並只輸出 0（`DRAINING` → `IDLE`）：播放中的輸入沒有尚未取出的聲音、所有音源輸入在延遲線長度 + 1 s 期間皆為靜音、輸出持續低於 −80 dBFS 達 0.5 s。若輸入持續發聲，則在上限（5 s 與「輸入靜音長度 + 2 s」中較大者）時經一個區塊淡出後強制變為 `IDLE`。渲染未執行時（`st_rt_render_start` 之前、`st_rt_render_stop` 之後）立即為 `IDLE`。休眠期間仍接受 setter，播放請求會在喚醒後反映。主機串流·喇叭組環不會被消耗（寫入會持續接受到環滿為止）。輸出裝置維持開啟，因此長時間休眠時請在確認 `IDLE` 後呼叫 `st_rt_render_stop`。SYNCHRONOUS 排程器的計算只在 `st_rt_propagate` 中執行，因此只有渲染端休眠。支援與否見 `ST_CAP1_ENGINE_IDLE`。執行緒：`[control]` — 只持有短暫的鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `1` = 成功（若已在休眠中則不執行任何動作）/ `0` = `context` 為 `NULL`。

</details>

<details>
<summary><code>st_rt_run</code> — 喚醒休眠中的引擎</summary>

```c
int st_rt_run(STRT_Context* context);
```

**用途** — 在以 `st_rt_idle` 休眠或以 `startIdle = 1` 建立的情境中，重新執行傳播·IR·渲染。

**呼叫方式** — 重新開始播放時呼叫。立即變為 `RUNNING` 並喚醒計算工作，休眠期間收到的場景·運動·策略變更會在此時反映。IR 組合的時間軸（平滑·遲滯）會跳過休眠的時間。因強制 `IDLE` 而停止的延遲線·殘響狀態會接續輸出，第一個區塊會淡入。不等待完成。執行緒：`[control]` — 只做短暫鎖定與喚醒計算工作。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `1` = 成功 / `0` = `context` 為 `NULL`。

</details>

<details>
<summary><code>st_rt_get_idle_state</code> — 讀取引擎休眠狀態（RUNNING / DRAINING / IDLE）</summary>

```c
int st_rt_get_idle_state(const STRT_Context* context);
```

**用途** — 確認 `st_rt_idle` 之後渲染是否已輸出完尾音。例如在變成 `IDLE` 後以 `st_rt_render_stop` 關閉裝置。

**呼叫方式** — 可隨時呼叫。`IDLE` 的意思是「沒有新計算 + 渲染輸出 0」，並不表示進行中的那 1 次計算也已結束。執行緒：`[any]` — 讀取一個 atomic。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STRT_IdleState`：`ST_RT_IDLE_RUNNING`（0，執行中）/ `ST_RT_IDLE_DRAINING`（1，已收到休眠請求，渲染正在輸出剩餘的聲音）/ `ST_RT_IDLE_IDLE`（2，計算休眠 + 渲染只輸出 0 — `startIdle = 1` 時建立後即為此狀態）。`context` 為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_get_scheduler</code> — 回傳情境的排程器</summary>

```c
int st_rt_get_scheduler(const STRT_Context* context);
```

**用途** — 確認建立時確定的排程器。用於判斷是否使用通道更新週期（`st_rt_set_lane_update_interval`）等僅在 PIPELINED 下有意義的 API，或是否需要自行執行 `st_rt_propagate`。

**呼叫方式** — 建立後可隨時呼叫。值不可變。執行緒：`[any]` — 讀取建立時確定的不可變值。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STRT_Scheduler`：`ST_RT_SCHEDULER_SYNCHRONOUS`(0) / `ST_RT_SCHEDULER_PIPELINED`(1)。

</details>

<details>
<summary><code>st_rt_get_timing</code> — 一次讀取管線各階段最近的耗時</summary>

```c
int st_rt_get_timing(const STRT_Context* context, STTiming* outTiming);
```

**用途** — 以一個結構體取得傳播（3 個通道）·IR 轉換·IR 發佈·區塊渲染最近 1 次的耗時，在主機分析器或 HUD 上顯示引擎負載。這是取得計時的唯一介面。

**呼叫方式** — 可隨時輪詢（例如每個影格）。比較兩次讀取的 `irPublishSequence`，即可得知其間是否發佈了新的 IR。支援與否見 `ST_CAP_ENGINE_TIMING`（`irPublishSequence` 見 `ST_CAP_IR_STATS`）。執行緒：`[any]` — 只讀取 atomic。但戳記錯誤的錯誤路徑會寫入情境診斷緩衝區。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outTiming` | 輸出。呼叫端填入 `structSize = sizeof(STTiming)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STTiming`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入的戳記 |
| `propagateTotalMs` | 整體傳播（ms）。PIPELINED 下各通道以不同的工作執行緒·週期執行，因此不是三個通道的總和，而是等於最重的反射·繞射通道值（`== propagateReflDiffMs`）。SYNCHRONOUS 下 ≈ direct + reflDiff + reverb |
| `propagateDirectMs` | Direct 通道（直達聲 + 透射） |
| `propagateReflDiffMs` | 反射·繞射通道（含 guide） |
| `propagateReverbMs` | 殘響通道（擴散·音源傳輸） |
| `irBuildMs` | 幾何 → IR 轉換 |
| `auralUpdateIrMs` | IR 發佈（渲染端反映） |
| `auralProcessMs` | 每區塊渲染處理時間（渲染執行緒或主機 pull 回呼） |
| `irPublishSequence` | IR 發佈序號的低 32 位元。與 `st_rt_ir_get_stats` 的 `publishSequence` 值相同，`0` = 尚未發佈 |
| `reserved[7]` | 保留 |

尚未執行過的階段為 `0`。

**回傳值** — `1` = 成功 / `0` = `context`·`outTiming` 為 `NULL` 或戳記不符（不符時 `st_rt_get_last_status` 為 `ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_set_memory_budget</code> — 指定音源記憶體預算（最大音源數·位元組上限·拒絕策略）</summary>

```c
int st_rt_set_memory_budget(STRT_Context* context, const STMemoryBudget* budget);
```

**用途** — 在行動裝置·Web 等記憶體吃緊的平台上，以上限約束音源數與各音源記憶體總和。一個音源的記憶體由固定成本（傳播·IR 副本·傳輸·串流環）、延遲環（與場景最長路徑成正比，下限 `ringFloorSeconds` ~ 上限 `st_rt_render_get_max_delay_seconds`）與路徑通道構成。超出預算的 `st_rt_source_create` 會依策略被拒絕，或逐出最遠的音源後被接受，因此建立後記憶體不會因新音源而增加。

**呼叫方式** — 建立後可隨時呼叫。若只要設定最大音源數，也可在建立時以 `STRT_CreateOptions.maxSources` 指定。若要以現有值為基礎變更，先以 `st_rt_get_memory_budget` 讀取，只修改需要的欄位後再 set。即使調降上限，現有音源仍會保留，自新的建立起套用。使用量以 `st_rt_get_memory_stats` 查看。支援與否見 `ST_CAP1_MEMORY_BUDGET`（能力字組 1）。執行緒：`[control]` — 在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `budget` | 新策略。呼叫端填入 `structSize = sizeof(STMemoryBudget)`、`apiVersion = ST_ABI_VERSION`。值為 `0` 的欄位表示預設值 |

**結構體** `STMemoryBudget`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入的戳記 |
| `maxSources` | 最大音源數。`0` = 平台預設 |
| `rejectPolicy` | `STMemoryRejectPolicy`：`ST_MEMORY_REJECT_NEW`（0，預設）= 超出時 `st_rt_source_create` 回傳失敗控制代碼（`v < 0`）與 `ST_STATUS_BUDGET_EXCEEDED`。`ST_MEMORY_EVICT_FARTHEST`（1）= 以與 `st_rt_source_destroy` 相同的路徑逐出離聆聽者最遠的音源並接受新音源（被逐出的 id 見 `STMemoryStats.lastEvictedSource`） |
| `sourceBudgetBytes` | 各音源可變記憶體總和的上限（位元組）= 追蹤位元組 + `fixedPerSourceBytes` × 音源數。`0` = 無限制（僅觀測） |
| `fixedPerSourceBytes` | 一個音源的固定成本估計值。`0` = 引擎預設（2.5 MiB）。僅用於預算估算 |
| `ringFloorSeconds` | 剛附加輸入·沒有路徑的音源的延遲環大小（秒）。`0` = 0.25 |
| `ringGrowthHeadroom` | 環成長餘裕倍率 — 所需延遲 × 此值（+50 ms，以 125 ms 為單位進位）。`0` = 1.25 |
| `allowShrink` | `0` = 不縮小環（維持工作階段中的最大值），`1` = 允許縮小 |
| `reserved[5]` | 必須全部為 `0` |

**平台預設值**

| 建置目標 | `maxSources` | `sourceBudgetBytes` | 延遲環上限 |
|---|---|---|---|
| 桌面 | 128 | 無限制 | 2.0 s |
| Android · iOS | 48 | 96 MiB | 1.0 s |
| Emscripten（Web） | 32 | 64 MiB | 0.5 s |

**回傳值** — `1` = 已套用 / `0` = 拒絕。拒絕時狀態不變，`st_rt_get_last_status` 會留下 `ST_STATUS_VERSION_MISMATCH`（`budget` 為 `NULL` 或戳記不符）或 `ST_STATUS_INVALID_ARGUMENT`（值為非有限·超出範圍、`reserved` 不為 0）。`context` 為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_get_memory_budget</code> — 讀取目前的音源記憶體預算策略</summary>

```c
int st_rt_get_memory_budget(const STRT_Context* context, STMemoryBudget* outBudget);
```

**用途** — 確認目前套用中的預算策略（已填入平台預設值的實際值），或作為只修改部分欄位的起點。

**呼叫方式** — 建立後可隨時呼叫。修改讀取到的結構體後傳給 `st_rt_set_memory_budget` 是典型模式。支援與否見 `ST_CAP1_MEMORY_BUDGET`。執行緒：`[control]` — 在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outBudget` | 輸出。呼叫端填入 `structSize`/`apiVersion`。成功時 `reserved[]` 變為 0 |

`STMemoryBudget` 欄位請參閱 `st_rt_set_memory_budget` 項目。

**回傳值** — `1` = 成功 / `0` = `context` 為 `NULL`，或 `outBudget` 為 `NULL` 或戳記不符（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_get_memory_stats</code> — 讀取音源記憶體使用量·拒絕·逐出統計</summary>

```c
int st_rt_get_memory_stats(const STRT_Context* context, STMemoryStats* outStats);
```

**用途** — 觀測相對於預算的目前使用量以決定預算值，或確認是否發生了拒絕·逐出。

**呼叫方式** — 建立後可隨時呼叫。只讀取控制端的記錄與集區，不存取音訊執行緒。支援與否見 `ST_CAP1_MEMORY_BUDGET`。執行緒：`[control]` — 在控制執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outStats` | 輸出。呼叫端填入 `structSize = sizeof(STMemoryStats)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STMemoryStats`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入的戳記 |
| `sourceCount` | 目前音源數 |
| `maxSources` | 套用中的最大音源數 |
| `trackedBytes` | 追蹤位元組 = 已安裝的延遲環（含等待替換的環）+ 路徑通道估計 + 集區中保管的環 |
| `estimatedBytes` | `trackedBytes + fixedPerSourceBytes × sourceCount`。預算判定在此值超出時，會先清空集區保管的環再重新量測 |
| `sourceBudgetBytes` | 套用中的位元組上限（`0` = 無限制） |
| `pooledRingBytes` | 為重複使用而保管的環位元組（含於 `trackedBytes`）。上限為桌面 16 MiB · 行動裝置 8 MiB · Web 4 MiB，10 s 未使用即釋放 |
| `rejectedCreates` | 因超出預算而被拒絕的 `st_rt_source_create` 累計 |
| `evictions` | 以 `ST_MEMORY_EVICT_FARTHEST` 逐出的音源累計 |
| `lastEvictedSource` | 最後被逐出的音源 id，`-1` = 無 |
| `ringBytesPerSourceMax` | 最大的音源延遲環位元組 |
| `reserved[6]` | 保留 |

**回傳值** — `1` = 成功 / `0` = `context` 為 `NULL`，或 `outStats` 為 `NULL` 或戳記不符（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_ir_get_stats</code> — 讀取最後一次 IR 發佈的一致性量測快照</summary>

```c
int st_rt_ir_get_stats(const STRT_Context* context, STIrStats* outStats);
```

**用途** — 嵌入主機時，不需檢視引擎內部即可區分「IR 烘焙為何緩慢」的量測。契約是所有欄位皆為同一次發佈的值，可區分以下三者：① 工作量大 → `stagedBedCells`·`mergedBedCells`·`exactTaps`，② 被搶占 → `prepareCpuUs` ≪ `prepareTotalUs`（CPU/wall 比例低），③ 位於慢速核心 → `prepareCpuUs` ≈ `prepareTotalUs` 但絕對值大（以 `prepareCpuIndex` 確認邏輯處理器）。主機影格之間 `publishSequence` 的增量即為發佈週期。

**呼叫方式** — 可隨時輪詢。PIPELINED 下場景靜止時發佈也會停止 — 通道輸入與組合鍵不變，且自最後一次變化後經過 2 s，就不再重新組合（通道持續執行）。只要有任何變化就立即組合·發佈，之後 2 s 內最多每 50 ms 重新組合一次。因此在靜止場景中，「IR 是否為最新」要以 `settled` 而非 `publishSequence` 判斷。SYNCHRONOUS 下也有效（呼叫執行緒烘焙後立即採用，因此 CPU/wall 比例接近 1）。支援與否見 `ST_CAP_IR_STATS`。執行緒：`[any]` — 無鎖的一致性快照，不會輸出撕裂的值。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outStats` | 輸出。呼叫端填入 `structSize = sizeof(STIrStats)`、`apiVersion = ST_ABI_VERSION`。拒絕時不會變更 |

**結構體** `STIrStats`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入的戳記 |
| `publishSequence` | 渲染每採用一次新 IR 即 +1。`0` = 尚未發佈 |
| `lastPublishLaneMask` | 自上一次發佈以來幾何有推進的通道位元：`ST_IR_LANE_DIRECT`（`1u<<0`）· `ST_IR_LANE_REFLECTION_DIFFRACTION`（`1u<<1`）· `ST_IR_LANE_REVERB`（`1u<<2`），以及僅在沒有任何幾何位元時設定的 `ST_IR_LANE_POLICY_ONLY`（`1u<<3`，沒有新幾何而重新轉換 — IR 策略變更或組合仍在收斂中） |
| `stagedBedCells` | early bed 合併輸入單元數（各音源總和） |
| `mergedBedCells` | early bed 合併輸出單元數 |
| `activePartitions` / `maxPartitions` | bed 摺積分割數（啟用 / 最大） |
| `irSpanMs` | 合併 bed IR 長度（ms） |
| `exactTaps` | exact 路徑抽頭數 |
| `sendTaps` | 殘響 send 抽頭數 |
| `rainTaps` | 一次散射（diffuse rain）抽頭數 |
| `prepareMergeUs` | bed 合併·頻帶正規化時間（µs） |
| `prepareBakeUs` | bed 時域烘焙時間（不含 FFT，µs） |
| `prepareFftUs` | 分割 FFT 時間（µs） |
| `prepareTotalUs` | IR 準備整體 wall 時間（µs）。PIPELINED 只計烘焙執行緒的準備，SYNCHRONOUS 是含套用在內的整體，因此不要並列比較兩種排程器的值。三個階段 µs 的總和小於此值 |
| `prepareCpuUs` | 同一區間的烘焙執行緒 CPU 時間（µs）。Windows 的解析度為排程器 tick（約 15.6 ms），因此要看多次發佈的比例趨勢，而非單一值。POSIX 則精細得多 |
| `prepareCpuIndex` | 準備完成當下該執行緒所在的邏輯處理器編號（提示）。不支援 = `0xFFFFFFFF`（macOS 一律為此值） |
| `directLaneFrames` / `exactLaneFrames` / `reverbLaneFrames` | IR 組合收到的通道影格累計（direct · 反射/繞射 · 殘響，uint32 循環）。在變更（新增音源·聆聽者移動等）後立即記下值，若增加 +2 以上，即表示該變化之後開始的通道執行結果已進入組合 |
| `settled` | `1` = 組合已處理完收到的所有通道影格（收斂），且渲染已採用最後發佈的 IR |
| `reserved[2]` | 全部為 0 |

`directLaneFrames`~`settled` 以 `ST_CAP1_ENGINE_IDLE` 為標誌，僅在 PIPELINED 下有意義（SYNCHRONOUS 為 0 與 `settled = 1`），與其餘快照分開讀取。bed 相關的 8 個欄位（`stagedBedCells`·`mergedBedCells`·`activePartitions`·`maxPartitions`·`irSpanMs`·`prepareMergeUs`·`prepareBakeUs`·`prepareFftUs`）僅在 early bed 渲染模式（`STRenderOptions.reserved0 = 1`）下不為 0 — exact objects 模式（`0`）的 0 表示「根本沒有烘焙階段」。`exactTaps`·`sendTaps`·`rainTaps` 與模式無關都會填入。

**回傳值** — `1` = 成功（尚未發佈時以 `publishSequence = 0` 成功）/ `0` = 拒絕：`context`·`outStats` 為 `NULL`、戳記不符（`ST_STATUS_VERSION_MISMATCH`）、快照與並行發佈連續衝突（`ST_STATUS_UNAVAILABLE` — 很少見，再次呼叫即可）。

</details>

<details>
<summary><code>st_rt_get_thread_inventory</code> — 依類型讀取情境目前啟動的執行緒數</summary>

```c
int st_rt_get_thread_inventory(const STRT_Context* context, STThreadInventory* outInventory);
```

**用途** — 若執行緒屬性（`STThreadAttributes`）是「要設定什麼」，清單就是「實際有幾個在執行」。讓主機能以數值而非猜測來規劃自己的執行緒預算。

**呼叫方式** — 可隨時呼叫。各類型的計數器是各自獨立的 atomic，因此不是同一瞬間的快照 — 執行緒啟動或結束時總和可能暫時不一致，並非錯誤。輸出裝置執行緒（音訊驅動程式）透過另外的路徑建立，不計入清單。支援與否見 `ST_CAP_THREAD_INVENTORY`。執行緒：`[any]` — 只讀取各類型的 atomic 計數器。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outInventory` | 輸出。呼叫端填入 `structSize = sizeof(STThreadInventory)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STThreadInventory`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入的戳記 |
| `countByRole[ST_THREAD_TYPE_COUNT]` | 依 `STThreadType` 順序的執行緒數（索引 = 類型）。邏輯角色（LANE_*·IR_CONVERTER·AU_PREPARE·SCENE_INPUT）在計算集區上執行，因此一律為 `0`，`ST_THREAD_ACCEL_BUILD` 也為 `0` |
| `reserved[5]` | 保留 |

`STThreadType` 值請參閱 `st_rt_set_thread_attributes` 項目。

典型值（PIPELINED，計算集區預算 `N = max(3, 解析後的預算)`，有檔案音源）：

| 輸出模式 | LANE_* | IR_CONVERTER · AU_PREPARE | COMPUTE_POOL | AUDIO_RENDER | FILE_DECODER |
|---|---|---|---|---|---|
| `DEVICE` | 0 | 0 | `N−1`（含 Direct 專用 1 個） | 1 | 1 |
| `HOST_PULL` | 0 | 0 | `N−1` | 0 | 1 |

SYNCHRONOUS 的 LANE_* 全部為 0，沒有檔案輸入時 FILE_DECODER 為 0。

**回傳值** — `1` = 成功 / `0` = `context`·`outInventory` 為 `NULL` 或戳記不符（`ST_STATUS_VERSION_MISMATCH`）。

</details>

</details>

<details>
<summary><strong>材質 · 網格 · 物件 · 場景</strong> — 17 個</summary>

<details>
<summary><code>st_rt_material_create</code> — 註冊一個聲學材質並取得控制代碼</summary>

```c
STMaterialId st_rt_material_create(STRT_Context* context, const STMaterial* material);
```

**用途** — 將以 9 個八度頻帶的反射·吸收·透射·散射係數定義的材質註冊到引擎。網格（`st_rt_mesh_create`）參照此函式回傳的材質控制代碼來決定表面的聲學特性。

**呼叫方式** — 在建立使用該材質的網格之前呼叫。多個材質以重複呼叫此函式註冊，回傳控制代碼的 `v` 依註冊順序連續。若需要預設材質庫，可搭配 `st_rt_material_load_defaults` 使用。執行緒：`[control]` — 僅限控制執行緒，會與工作執行緒互斥而可能短暫阻塞，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `material` | 要註冊的材質。呼叫端填入 `structSize = sizeof(STMaterial)`、`apiVersion = ST_ABI_VERSION`。先驗證戳記再驗證係數 |

**結構體** `STMaterial`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STMaterial)` — 由呼叫端填入 |
| `apiVersion` | `ST_ABI_VERSION` — 由呼叫端填入 |
| `reflection[ST_FREQUENCY_BANDS]` | 各頻帶反射能量比例，`[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | 各頻帶吸收能量比例，`[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | 各頻帶透射能量比例，`[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 反射能量中轉為擴散（diffuse）的比例，`[0, 1]`。不計入 R+A+T 總和 |
| `reserved[8]` | 保留 |

- 頻帶固定為 `ST_FREQUENCY_BANDS` = 9 個（63 · 125 · 250 · 500 · 1000 · 2000 · 4000 · 8000 · 16000 Hz）。
- 所有係數皆為 **能量域**（無因次能量比例），而非壓力振幅。
- 每個頻帶都必須滿足 `|R + A + T − 1| <= ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`（0.001）。引擎不會推導·正規化·箝制·內插這些值，因此須由呼叫端調整使總和為 1。

**回傳值** — 材質控制代碼（`STMaterialId`，`struct { int32_t v; }`）。網格·物件控制代碼（`STMeshId`·`STObjectId`）也是相同形式的不同型別，混用會產生編譯錯誤。失敗時 `v < 0`，`st_rt_get_last_status` 會留下原因：`material` 為 NULL 時為 `ST_STATUS_INVALID_ARGUMENT`，戳記不符時為 `ST_STATUS_VERSION_MISMATCH`，非有限值·超出範圍的值·R+A+T 總和不符時為 `ST_STATUS_INVALID_MATERIAL`。

</details>

<details>
<summary><code>st_rt_material_load_defaults</code> — 一次註冊預設材質庫</summary>

```c
STMaterialId st_rt_material_load_defaults(STRT_Context* context);
```

**用途** — 將引擎內建的預設材質庫整批註冊。用於不自行準備材質係數而直接組成場景的情況。

**呼叫方式** — 在建立網格之前呼叫。回傳值是材質庫 **第一個材質** 的控制代碼，其餘材質依 `v+1`、`v+2` … 的順序連續。可與以 `st_rt_material_create` 註冊的材質並用。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 材質庫第一個材質的控制代碼。失敗時 `v < 0`。

</details>

<details>
<summary><code>st_rt_scene_set_edge_split_collinear_overlaps</code> — 決定是否分割共線重疊的聲學邊緣</summary>

```c
void st_rt_scene_set_edge_split_collinear_overlaps(STRT_Context* context, int enabled);
```

**用途** — 場景建置選項，決定在建立網格時編譯的聲學邊緣（繞射邊緣）拓撲中，是否將重疊於同一直線上（共線重疊）的邊緣分割處理。支援與否以 capability 位元 `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS` 確認。

**呼叫方式** — 使用的是網格建立當下的值，因此 **只套用到此呼叫之後建立的網格**。已建立網格的拓撲不會變更，請在 `st_rt_mesh_create` 之前設定。預設為關閉。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | `0` = 關閉（預設）/ 0 以外 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_scene_set_solid_wedge_gate</code> — 開關繞射楔的定向剔除閘門</summary>

```c
void st_rt_scene_set_solid_wedge_gate(STRT_Context* context, int enabled);
```

**用途** — 在兩面相交的繞射楔（wedge）上，依網格的繞序（法線方向）區分凸·凹，剔除進入楔實體側的繞射路徑的閘門。支援與否以 capability 位元 `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE` 確認。

**呼叫方式** — 預設為關閉。在傳播階段判定，因此也會套用到現有網格。開啟後判定依賴網格繞序，因此必須在一個網格內保持繞序一致，並讓法線朝向空氣側 — 反轉繞序會使凸·凹互換，被剔除的繞射路徑集合也會相反（參閱 `st_rt_mesh_create` 的繞序說明）。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | `0` = 關閉（預設）/ 0 以外 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_scene_set_accel</code> — 選擇網格·靜態場景加速結構類型</summary>

```c
int st_rt_scene_set_accel(STRT_Context* context, int kind);
```

**用途** — 選擇網格 BLAS 與靜態場景加速結構使用的結構類型。引擎在建立時也會讀取 `SOUNDTRACING_ACCEL` 環境變數，但透過此函式，主機不必變更自身處理程序環境即可做相同選擇。

**呼叫方式** — 在新增物件之前呼叫。只套用到之後的建置，現有網格的 BLAS 維持以建立當下的值建置的狀態。預設值為 `2`（TinyBVH）。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH（預設）/ `3` = LBVH / `4` = LBVH_Simd |

**回傳值** — `1` = 已套用 / `0` = `kind` 超出範圍或沒有情境。

</details>

<details>
<summary><code>st_rt_scene_set_triangle_intersection</code> — 選擇三角形相交核心</summary>

```c
int st_rt_scene_set_triangle_intersection(STRT_Context* context, int kind);
```

**用途** — 選擇射線-三角形相交判定所用的核心。三種核心皆為雙面相交。

**呼叫方式** — 核心在 `st_rt_mesh_create` 時固定於網格，因此 **只套用到此呼叫之後新增的網格**（不追溯現有網格）。各網格使用不同核心的組態也有效。預設為 `0`（MollerTrumbore）。目前值以 `st_rt_scene_get_triangle_intersection` 讀取。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `kind` | `0` = MollerTrumbore（預設）/ `1` = PluckerAdaptive / `2` = Watertight |

**回傳值** — `1` = 已套用 / `0` = 無效的 `kind` 或沒有情境。

</details>

<details>
<summary><code>st_rt_scene_get_triangle_intersection</code> — 讀取目前的三角形相交核心設定</summary>

```c
int st_rt_scene_get_triangle_intersection(const STRT_Context* context);
```

**用途** — 查詢以 `st_rt_scene_set_triangle_intersection` 指定的值，即將套用到下一個建立之網格的相交核心。

**呼叫方式** — 可隨時呼叫。已建立的網格各自維持建立當下的核心，因此不保證回傳值與現有網格的核心相同。執行緒：`[control]` — 只持有場景 read 鎖的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight。沒有情境時為 `-1`。

</details>

<details>
<summary><code>st_rt_scene_get_stats</code> — 查詢存活的網格·物件·音源·三角形數</summary>

```c
int st_rt_scene_get_stats(STRT_Context* context, STSceneStats* outStats);
```

**用途** — 以一次 read 鎖快照回傳目前存活的聲學場景清單（網格·物件·音源數量與三角形數）。所有值描述同一時間點的場景，用於診斷·掌握記憶體規模。支援與否以 capability 位元 `ST_CAP_SCENE_STATS` 確認。

**呼叫方式** — 無論是場景組成中或渲染中，皆可隨時在控制執行緒上呼叫。執行緒：`[control]` — 只持有場景 read 鎖的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outStats` | 接收結果的結構體。呼叫端填入 `structSize = sizeof(STSceneStats)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STSceneStats`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STSceneStats)` — 由呼叫端填入 |
| `apiVersion` | `ST_ABI_VERSION` — 由呼叫端填入 |
| `meshCount` | 存活網格數 |
| `objectCount` | 存活物件數。destroy 成功即立即減少 |
| `sourceCount` | 存活音源數。包含停用（disabled）音源，destroy 成功即立即減少 |
| `reserved0` | 保留 |
| `triangleCount` | 存活物件所參照網格的三角形 **依實例** 加總的值。100 個三角形的網格由 3 個物件共用時為 300 |
| `uniqueTriangleCount` | 存活網格資源 **各只計一次** 加總的值（上例為 100）。用於檢視幾何·加速結構的記憶體規模 |
| `reserved[4]` | 保留 |

**回傳值** — `1` = 成功 / `0` = `context`·`outStats` 為 NULL（`ST_STATUS_INVALID_ARGUMENT`）或戳記不符（`ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_rt_scene_raycast</code> — 以引擎加速結構查詢最近命中</summary>

```c
int st_rt_scene_raycast(STRT_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**用途** — 向傳播計算所使用的同一加速結構（含靜態+動態物件）發射射線，回傳最近的一個命中。為唯讀查詢，不改變管線狀態，因此主機可用來確認引擎實際看到的聲學幾何，或用於自身邏輯（遮擋判定·除錯顯示等）。支援與否以 capability 位元 `ST_CAP_SCENE_RAYCAST` 確認。

**呼叫方式** — 在以 `st_rt_build` 建置加速結構之後才有意義。建置前呼叫會無錯誤地回傳未命中。只持有場景 read 鎖，因此在 `ST_RT_SCHEDULER_PIPELINED` 下也能與工作執行緒並行。執行緒：`[control]` — 只持有場景 read 鎖的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `origin` | 射線原點，世界座標 3 分量（場景單位）。須為有限值 |
| `direction` | 射線方向 3 分量。引擎會正規化，因此不必是單位向量，但須為有限值且非零向量 |
| `maxDistanceMeters` | 最大距離（公尺，場景單位 × `sceneRatio` 規約）。`<= 0` 或非有限值時為無限 |
| `outHit` | 接收結果的結構體。呼叫端填入 `structSize = sizeof(STRayHit)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STRayHit`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STRayHit)` — 由呼叫端填入 |
| `apiVersion` | `ST_ABI_VERSION` — 由呼叫端填入 |
| `hit` | `1` = 命中 / `0` = 未命中 |
| `distanceMeters` | 從原點到命中點的距離（公尺）。場景距離 × `sceneRatio`（建立選項，預設 1） |
| `point[3]` | 命中點。維持場景座標系座標（無單位轉換） |
| `normal[3]` | 命中三角形的單位幾何法線。一律對齊為朝向 **射線原點側**，不保留網格繞序給出的正負號 |
| `objectId` | 命中的物件 id（`STObjectId` 的 `v` 值）。未命中時為 `-1` |
| `meshId` | 該物件的網格 id（`STMeshId` 的 `v` 值）。未命中時為 `-1` |
| `triangleIndex` | 網格區域三角形索引。未命中時為 `-1` |
| `materialIndex` | 該三角形的材質索引（`STMaterialId` 的 `v` 值）。未命中時為 `-1` |
| `reserved[6]` | 保留 |

未命中（`hit == 0`）時 `distanceMeters`·`point`·`normal` 為 0，四個 id 皆為 `-1`。`0` 是有效的 id，因此不作為未命中標記。id 欄位是 `int32_t` 而非控制代碼結構體。

**回傳值** — `1` = 呼叫成功（是否命中以 `outHit->hit` 判斷 — 未命中並非失敗）/ `0` = 失敗：`context`·指標為 NULL、戳記不符（`ST_STATUS_VERSION_MISMATCH`）、`origin`·`direction` 非有限值或 `direction` 為零向量（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_mesh_create</code> — 註冊三角形網格並取得控制代碼</summary>

```c
STMeshId st_rt_mesh_create(STRT_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**用途** — 註冊作為聲學幾何使用的三角形網格。網格是幾何資源，要實際放入場景，需以 `st_rt_object_create`/`st_rt_object_create_q` 建立參照此網格的物件（實例）。一個網格可由多個物件共用。

**呼叫方式** — 先註冊要使用的材質後再呼叫。材質指定方式為以下兩者之一。

- `triangleMaterialIndices == NULL`：整個網格使用單一 `material`。
- `triangleMaterialIndices != NULL`：為每個三角形指定材質（陣列長度 `mesh->numTriangles`）。此時忽略 `material` 引數。支援與否以 `ST_CAP_PER_TRIANGLE_MATERIALS` 確認。

相交核心（`st_rt_scene_set_triangle_intersection`）、邊緣分割選項（`st_rt_scene_set_edge_split_collinear_overlaps`）、加速結構類型（`st_rt_scene_set_accel`）以此呼叫當下的值固定於網格。輸入陣列在呼叫期間複製，因此回傳後即可釋放。執行緒：`[control, blocking]` — 編譯聲學邊緣拓撲的較長獨佔區間，請勿在遊戲迴圈·音訊執行緒中呼叫。

繞序：相交為雙面，反射·透射與繞序無關，但部分繞射邊緣判定（零厚度板的邊緣採用、`st_rt_scene_set_solid_wedge_gate`）依賴繞序。請在一個網格內 **一致地** 保持繞序，並盡可能讓法線朝向空氣側。鏡像座標系匯入時，索引順序也必須一併反轉。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 網格幾何（`STMesh`）。不可為 NULL |
| `material` | 整個網格的材質控制代碼。僅在 `triangleMaterialIndices` 為 NULL 時使用，須為已註冊的材質 |
| `triangleMaterialIndices` | 各三角形材質索引陣列（`numTriangles` 個，每個元素為已註冊 `STMaterialId` 的 `v` 值）或 NULL |

**結構體** `STMesh`

| 欄位 | 說明 |
|---|---|
| `numVertices` | 頂點數（> 0） |
| `vertices` | 頂點座標 xyz 交錯陣列，`numVertices * 3` 個 float。場景單位（網格區域座標系） |
| `numTriangles` | 三角形數（> 0） |
| `triangles` | 三角形頂點索引陣列，`numTriangles * 3` 個 int。各值在 `[0, numVertices)` 內 |

**回傳值** — 網格控制代碼。失敗時 `v < 0`：`mesh`·陣列指標為 NULL 或數量在 0 以下時為 `ST_STATUS_INVALID_ARGUMENT`，因索引超出範圍·未註冊的材質等原因網格被拒絕時為 `ST_STATUS_INVALID_MATERIAL`。

</details>

<details>
<summary><code>st_rt_object_create</code> — 以矩陣變換將網格放入場景</summary>

```c
STObjectId st_rt_object_create(STRT_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**用途** — 建立將已註冊網格連同世界變換放入場景的物件（實例）。傳播計算與 `st_rt_scene_raycast` 只看物件。若要以四元數指定旋轉，請使用 `st_rt_object_create_q`。

**呼叫方式** — 在 `st_rt_mesh_create` 之後呼叫。以 `isDynamic` 決定靜態/動態。

- 靜態（`0`）：放入 `st_rt_build`（靜態+動態完整建置）發佈的靜態 TLAS。新增·移除·變換變更在下一次 `st_rt_build` 之前不會反映到已發佈的靜態結構。用於牆壁·地板等不移動的建築幾何。
- 動態（`1`）：放入動態物件 TLAS，變換變更不需完整建置，以動態重建（refit，`st_rt_build_dynamic`）反映。用於門·車輛等移動的幾何。

執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 要放置的網格控制代碼 |
| `transform` | 區域→世界變換（`STTransform`）。若為 NULL 則為恆等變換 |
| `isDynamic` | `0` = 靜態 / 0 以外 = 動態 |

**結構體** `STTransform`

| 欄位 | 說明 |
|---|---|
| `m00, m01, m02` | 3x3 旋轉·縮放矩陣第 1 列 |
| `m10, m11, m12` | 第 2 列 |
| `m20, m21, m22` | 第 3 列 |
| `tx, ty, tz` | 平移（場景單位） |

列優先（row-major），點以 **行向量** 相乘：`x' = m00*x + m01*y + m02*z + tx`、`y' = m10*x + m11*y + m12*z + ty`、`z' = m20*x + m21*y + m22*z + tz`（不是 `m00*x + m10*y + m20*z` 的形式）。也接受非等比縮放與行列式為負的變換（鏡像·負縮放）。分量為非有限值或無法求反矩陣的變換會被拒絕。座標系為左手系，+Y up、+Z forward、+X right。

**回傳值** — 物件控制代碼。失敗時 `v < 0`（不存在的網格、無法使用的變換等）。

</details>

<details>
<summary><code>st_rt_object_create_q</code> — 以位置·四元數·縮放將網格放入場景</summary>

```c
STObjectId st_rt_object_create_q(STRT_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**用途** — 建立與 `st_rt_object_create` 相同的物件，但以位置·旋轉四元數·縮放（TRS）接收變換。用於不將遊戲引擎的變換轉為矩陣而直接傳入的情況。

**呼叫方式** — 在 `st_rt_mesh_create` 之後呼叫。靜態/動態的意義與建置反映時機與 `st_rt_object_create` 相同。之後的變換以 `st_rt_object_set_transform_q` 更新。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 要放置的網格控制代碼 |
| `position` | 世界位置 xyz（場景單位）。不可為 NULL |
| `quatXYZW` | 區域→世界旋轉四元數，**XYZW 順序**。由引擎正規化，範數小於 `1e-12` 時以恆等旋轉取代。不可為 NULL |
| `scale` | 各軸縮放 xyz。以行縮放合成到旋轉中（R·S），允許非等比縮放。不可為 NULL |
| `isDynamic` | `0` = 靜態 / 0 以外 = 動態 |

**回傳值** — 物件控制代碼。失敗時 `v < 0`（指標為 NULL、不存在的網格、無法使用的變換等）。

</details>

<details>
<summary><code>st_rt_object_set_transform</code> — 變更物件的矩陣變換</summary>

```c
void st_rt_object_set_transform(STRT_Context* context, STObjectId object, const STTransform* transform);
```

**用途** — 以矩陣更新已放置物件的區域→世界變換。

**呼叫方式** — 移動物件時呼叫。動態物件不需完整建置，以動態重建反映。靜態物件的變更會保持待處理狀態，於下一次 `st_rt_build` 時反映，因此每個影格都會移動的幾何請建立為動態（`isDynamic = 1`）。若要以四元數指定，請使用 `st_rt_object_set_transform_q`。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `object` | 目標物件控制代碼 |
| `transform` | 新變換。`STTransform` 欄位請參閱 `st_rt_object_create` 項目。若為 NULL 則不執行任何動作 |

**回傳值** — 無。不存在的物件或無法使用的變換（非有限值·無法求反矩陣）會被忽略。

</details>

<details>
<summary><code>st_rt_object_set_transform_q</code> — 以位置·四元數·縮放變更物件變換</summary>

```c
void st_rt_object_set_transform_q(STRT_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**用途** — `st_rt_object_set_transform` 的 TRS 版本。直接傳入遊戲引擎的變換（位置·四元數·縮放）來更新物件。

**呼叫方式** — 靜態/動態各自的反映時機與 `st_rt_object_set_transform` 相同。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `object` | 目標物件控制代碼 |
| `position` | 世界位置 xyz（場景單位） |
| `quatXYZW` | 區域→世界旋轉四元數，**XYZW 順序**。由引擎正規化，範數小於 `1e-12` 時以恆等旋轉取代 |
| `scale` | 各軸縮放 xyz（R·S 合成，允許非等比） |

**回傳值** — 無。任一指標為 NULL 時不執行任何動作，不存在的物件或無法使用的變換會被忽略。

</details>

<details>
<summary><code>st_rt_mesh_destroy</code> — 移除網格及使用該網格的物件</summary>

```c
int st_rt_mesh_destroy(STRT_Context* context, STMeshId mesh);
```

**用途** — 從場景移除已註冊的網格資源。參照此網格的物件也會一併釋放。

**呼叫方式** — 清理不再使用的幾何時呼叫。若一併移除了靜態物件，在下一次 `st_rt_build` 之前它們仍留在已發佈的靜態結構中，因此請在移除後呼叫 `st_rt_build` 以反映。已移除的控制代碼不得再使用。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 要移除的網格控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 沒有情境或網格不存在。

</details>

<details>
<summary><code>st_rt_object_destroy</code> — 從場景移除物件</summary>

```c
int st_rt_object_destroy(STRT_Context* context, STObjectId object);
```

**用途** — 將已放置的物件（實例）從場景中移出。所參照的網格資源會保留。

**呼叫方式** — 成功後 `st_rt_scene_get_stats` 的 `objectCount` 立即減少。靜態物件在下一次 `st_rt_build` 之前仍留在已發佈的靜態結構中，因此請在移除後呼叫 `st_rt_build` 以反映。動態物件會從動態重建中移除。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `object` | 要移除的物件控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 沒有情境或物件不存在（已被移除）。

</details>

<details>
<summary><code>st_rt_mesh_set_material</code> — 在執行期變更整個網格的材質</summary>

```c
int st_rt_mesh_set_material(STRT_Context* context, STMeshId mesh, STMaterialId material);
```

**用途** — 將已註冊網格的材質替換為另一個材質。用於不重建網格、只變更表面聲學特性的情況。

**呼叫方式** — 場景組成後可隨時呼叫。網格的所有三角形都會改用 `material`，建立時依三角形指定的材質也會換成這一個。材質無效時維持原有材質。會反映到使用此網格的所有物件。執行緒：`[control]` — 僅限控制執行緒，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 目標網格控制代碼 |
| `material` | 新材質控制代碼（已註冊的材質） |

**回傳值** — `1` = 已變更 / `0` = 沒有情境、網格不存在，或材質未註冊。

</details>

</details>

<details>
<summary><strong>音源 — 建立、位置·方向·速度、指向性、路徑閘門·音量、射線預算</strong> — 21 個</summary>

<details>
<summary><code>st_rt_source_create</code> — 建立音源並回傳控制代碼</summary>

```c
STSourceId st_rt_source_create(STRT_Context* context, const STSourceDesc* source);
```

**用途** — 在場景中註冊一個音源，並回傳之後所有 `st_rt_source_*` 呼叫使用的 `STSourceId` 控制代碼。一次決定位置·方向·速度·壓力倍率·指向設定檔·動態/靜態與否。

**呼叫方式** — 建立情境後可隨時呼叫。建立後附加音訊輸入（`st_rt_source_set_audio_file`、`st_rt_source_attach_stream` 等），移動的音源則每個影格以 `st_rt_source_set_position` / `st_rt_source_set_velocity` 更新。建立後的初始狀態：source energy 1.0、4 種路徑音量 1.0、5 種路徑類型閘門全部開啟、啟用（enabled）、非休眠（`ST_RT_IDLE_RUNNING`）、無指向性表、傳輸更新步數 0（預設）、傳輸射線網格 16 × 8、各音源最大深度 4。orientation 會設為對應 `direction` 的無 roll 最小旋轉（`direction` 為 `{0,0,1}` 時為恆等）。執行緒：`[control]` — 可能持有場景鎖，因此不要在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 建立描述子 `STSourceDesc`（見下方）。NULL 則失敗。此結構體沒有 `structSize` / `apiVersion` 戳記 |

**結構體** `STSourceDesc`

| 欄位 | 說明 |
|---|---|
| `positionX`, `positionY`, `positionZ` | 世界位置。**維持場景單位**（引擎以 `sceneRatio` 換算為公尺）。須為有限值 |
| `directionX`, `directionY`, `directionZ` | 音源正面（forward）方向。由引擎正規化，並依此方向無 roll 地設定音源 orientation（區域 forward = +Z）。零向量時為 +Z。須為有限值 |
| `velocityX`, `velocityY`, `velocityZ` | 音源速度，場景單位/秒。在 Doppler 計算前換算為 m/s。須為有限值 |
| `intensity` | 無因次 **線性壓力（pressure）倍率**。不是聲強（W/m²）·SPL（dB）·校正後的 Pa。須為有限值且 0 以上。能量域倍率另以 `st_rt_source_set_energy` 指定 |
| `directional` | `0` = 無指向（全頻帶 onAxis = offAxis = 1）。非 `0` = 簡易指向設定檔（onAxis = 1，offAxis = 0）。若要依頻帶細部設定，建立後使用 `st_rt_source_set_axis_attenuation` 或 `st_rt_source_set_directivity` |
| `isDynamic` | `1` = 動態音源（每個影格重新計算殘響），`0` = 靜態音源（快取並重複使用殘響）。傳輸更新步數的預設值也依此值區分（參閱 `st_rt_source_set_transport_refresh_steps`） |

**回傳值** — 成功時為 `v >= 0` 的 `STSourceId`。失敗為 **`v < 0`**，以 `st_rt_get_last_status` 查看原因。
- `ST_STATUS_INVALID_ARGUMENT` — `source` 為 NULL、位置·方向·速度·`intensity` 有非有限值、`intensity < 0`，或其他引擎拒絕的情況。
- `ST_STATUS_BUDGET_EXCEEDED` — 超出音源記憶體預算（`STRT_CreateOptions.maxSources`、`st_rt_set_memory_budget` 的 `maxSources` · `sourceBudgetBytes`）時。僅在策略為 `ST_MEMORY_REJECT_NEW`（預設）時發生；若為 `ST_MEMORY_EVICT_FARTHEST`，則以與 `st_rt_source_destroy` 相同的路徑逐出離聆聽者最遠的音源並接受新音源（被逐出的 id 見 `STMemoryStats.lastEvictedSource`）。支援與否以 `st_rt_get_capability_word(1)` 的 `ST_CAP1_MEMORY_BUDGET` 確認。

</details>

<details>
<summary><code>st_rt_source_set_position</code> — 移動音源位置</summary>

```c
void st_rt_source_set_position(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 更新音源的世界位置。用於讓移動的音源附著於遊戲物件並跟隨。

**呼叫方式** — 可在遊戲迴圈中每個影格呼叫。知道速度的主機也一併更新 `st_rt_source_set_velocity`。執行緒：`[control]` — `ST_RT_SCHEDULER_PIPELINED` 下放入運動佇列後返回，不要在音訊回呼中呼叫。不可用於喇叭組成員音源（會被忽略，`last_status` = `ST_STATUS_INVALID_ARGUMENT`）— 請使用組的姿態更新。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `x`, `y`, `z` | 新的世界位置，**場景單位**（不做座標轉換，原樣使用） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_set_direction</code> — 變更音源正面方向</summary>

```c
void st_rt_source_set_direction(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 變更音源的正面（forward）方向。錐形衰減（`st_rt_source_set_axis_attenuation`）與指向性表（`st_rt_source_set_directivity`）以此方向為基準套用。

**呼叫方式** — 可隨時呼叫。此 setter 會一併將音源 orientation 更新為「從 +Z 轉向該方向的 **無 roll 最小旋轉**」。需要 roll 的指向性表（左右不對稱的音源等）請改用 `st_rt_source_set_orientation_q`。執行緒：`[control]`。不可用於喇叭組成員音源（忽略，`ST_STATUS_INVALID_ARGUMENT`）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `x`, `y`, `z` | 以世界為基準的正面方向向量。座標系為 +X right · +Y up · +Z forward |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_set_velocity</code> — 指定音源速度</summary>

```c
void st_rt_source_set_velocity(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 更新音源的移動速度。引擎將此值用於 Doppler 計算。

**呼叫方式** — 以與位置更新相同的週期呼叫。執行緒：`[control]` — `ST_RT_SCHEDULER_PIPELINED` 下放入運動佇列後返回。不可用於喇叭組成員音源（忽略，`ST_STATUS_INVALID_ARGUMENT`）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `x`, `y`, `z` | 速度向量，**場景單位/秒**。引擎以 `sceneRatio` 換算為 m/s |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_destroy</code> — 刪除音源</summary>

```c
int st_rt_source_destroy(STRT_Context* context, STSourceId source);
```

**用途** — 從場景移除音源並清理其渲染狀態。從音源記憶體預算中收回名額也是透過此呼叫。

**呼叫方式** — 對不再使用的音源呼叫。渲染中時以 3 ms 斜坡降低聲音後收回渲染狀態。被刪除音源的個別休眠（`st_rt_source_idle`）設定也會一併消失。執行緒：`[control]`。喇叭組成員音源無法刪除（`0`，`ST_STATUS_INVALID_ARGUMENT`）— 請刪除組。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 要刪除的音源控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 失敗（情境為 NULL、音源不存在、喇叭組成員）。

</details>

<details>
<summary><code>st_rt_source_set_path_enabled</code> — 開關單一音源的路徑類型</summary>

```c
void st_rt_source_set_path_enabled(STRT_Context* context, STSourceId source, int pathType, int enabled);
```

**用途** — 對單一音源將特定路徑類型（直達·透射·反射·繞射·殘響）從計算·貢獻中移除或重新加入。是全域閘門 `st_rt_set_path_type_enabled` 的個別音源版本。用於只移除特定音源殘響之類的演出效果或聆聽 A/B 比較。

**呼叫方式** — 可隨時呼叫。預設 5 種全部開啟。若不完全移除路徑而只降低大小，請使用 `st_rt_source_set_path_volume`（`STSourceVolumeKind`：`ST_SOURCE_VOLUME_DIRECT`（0，含透射）/ `REFLECTION`（1）/ `DIFFRACTION`（2）/ `REVERB`（3），線性壓力倍率）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb。超出範圍會被忽略 |
| `enabled` | `0` = 關閉，非 `0` = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_is_path_enabled</code> — 讀取單一音源的路徑類型閘門</summary>

```c
int st_rt_source_is_path_enabled(STRT_Context* context, STSourceId source, int pathType);
```

**用途** — 查詢以 `st_rt_source_set_path_enabled` 設定的個別音源路徑閘門目前值。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]` — 只持有場景 read 鎖的純查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |

**回傳值** — `1` = 開啟 / `0` = 關閉。情境為 NULL、音源不存在、`pathType` 超出範圍時也為 `0`。

</details>

<details>
<summary><code>st_rt_source_set_energy</code> — 設定音源的能量倍率</summary>

```c
int st_rt_source_set_energy(STRT_Context* context, STSourceId source, float energy);
```

**用途** — 以 **energy-domain**（無因次能量比例）倍率設定音源的相對輻射能量。這是與 `STSourceDesc::intensity`（壓力倍率）分開的倍率，也是將指向性表以 `ST_DIRECTIVITY_POWER_MEAN` 正規化時設定總輻射功率的位置。

**呼叫方式** — 建立後可隨時呼叫。預設值為 1.0。能量與壓力的關係為 **energy = gain²** — 若要壓力增益 g，則填入 `g * g`（例：−6 dB，g ≈ 0.5 → energy ≈ 0.25）。引擎只在渲染邊界取一次平方根。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `energy` | 能量倍率。有限值且 0 以上。預設 1.0 |

**回傳值** — `1` = 已套用 / `0` = 失敗（情境為 NULL、非有限值或負數、音源不存在）。

</details>

<details>
<summary><code>st_rt_source_get_energy</code> — 讀取音源的能量倍率</summary>

```c
float st_rt_source_get_energy(STRT_Context* context, STSourceId source);
```

**用途** — 查詢以 `st_rt_source_set_energy` 設定的能量倍率（energy-domain）。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]` — 只持有場景 read 鎖的純查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |

**回傳值** — 目前的能量倍率（預設 1.0）。情境為 NULL 或音源不存在時為 `-1.0`。

</details>

<details>
<summary><code>st_rt_source_set_enabled</code> — 開關整個音源</summary>

```c
void st_rt_source_set_enabled(STRT_Context* context, STSourceId source, int enabled);
```

**用途** — 不刪除音源而將其整個從傳播計算中移除或重新加入的主開關。位於各路徑類型閘門（`st_rt_source_set_path_enabled`）之上。

**呼叫方式** — 可隨時呼叫。建立後為開啟。要觸發片段（`st_rt_source_trigger`）的音源請保持開啟使用。若要讓暫時沒有內容可播放的音源連同狀態一起休眠，請使用 `st_rt_source_idle`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `enabled` | `0` = 關閉，非 `0` = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_set_ray_count</code> — 設定音源的傳輸射線網格大小</summary>

```c
void st_rt_source_set_ray_count(STRT_Context* context, STSourceId source, int width, int height);
```

**用途** — 設定此音源發射的傳輸（diffuse transport）射線網格 N = `width` × `height`。是依音源調整品質與計算成本的旋鈕。

**呼叫方式** — 建立後可隨時呼叫。預設網格為 16 × 8。射線數越多成本越高，若要將該成本分攤到多次傳播，請搭配 `st_rt_source_set_transport_refresh_steps`。值在 0 以下或超過引擎的傳輸預算（依網格·深度的上限）時會被拒絕，`last_status` 留下 `ST_STATUS_INVALID_ARGUMENT`（原因見 `st_rt_get_last_error`）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `width` | 網格橫向射線數，1 以上。預設 16 |
| `height` | 網格縱向射線數，1 以上。預設 8 |

**回傳值** — 無。成功與否以 `st_rt_get_last_status` 確認。

</details>

<details>
<summary><code>st_rt_source_set_depth</code> — 設定各音源的最大反射深度</summary>

```c
void st_rt_source_set_depth(STRT_Context* context, STSourceId source, int depth);
```

**用途** — 設定此音源傳輸射線的最大反射（反彈）深度。與 `st_rt_source_set_ray_count` 一起作為決定各音源品質·成本的旋鈕。

**呼叫方式** — 建立後可隨時呼叫。各音源預設值為 4。超過引擎的傳輸預算或超出允許範圍時會被拒絕，`last_status` 留下 `ST_STATUS_INVALID_ARGUMENT`（原因見 `st_rt_get_last_error`）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `depth` | 最大反射深度。預設 4 |

**回傳值** — 無。成功與否以 `st_rt_get_last_status` 確認。

</details>

<details>
<summary><code>st_rt_source_set_transport_refresh_steps</code> — 設定傳輸射線網格分幾次傳播更新</summary>

```c
int st_rt_source_set_transport_refresh_steps(STRT_Context* context, STSourceId source, int steps);
```

**用途** — 讓此音源的傳輸射線網格 N（= `width` × `height`）**分 n 次傳播** 更新。一次傳播替換的射線為 ceil(N/n) 條，整體成本為 Σ N/n。引擎不設全域預算上限，因此音源多時由主機以 n 控制成本。支援與否以 `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS` 確認。

**呼叫方式** — 建立後可隨時呼叫。分割網格時，未更新射線的方向在傳播之間保持，使殘響抽頭平滑銜接；`steps = 1` 則每次傳播重鋪整個網格，以斷開該連續性為代價換取完全決定性。不會觸發 IR 重新轉換，但值變更時會重新發佈場景快照並傳給工作執行緒，傳輸快取會在下一次傳播時重建。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `steps` | `0` = 預設（由排程器與 `isDynamic` 決定 — `ST_RT_SCHEDULER_PIPELINED` 為動態 8 · 靜態 16，`ST_RT_SCHEDULER_SYNCHRONOUS` 為動態 1 · 靜態 16）/ `1` = 每次傳播全量重新追蹤（不建立儲存區的決定性路徑）/ `2` 以上 = 分 n 次更新，使用時 clamp 到 `[1, N]`。負數會被拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗。負數 `steps` 為 `ST_STATUS_INVALID_ARGUMENT`，音源不存在為 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_rt_source_get_transport_refresh_steps</code> — 讀取傳輸更新步數的儲存值</summary>

```c
int st_rt_source_get_transport_refresh_steps(const STRT_Context* context, STSourceId source);
```

**用途** — 查詢以 `st_rt_source_set_transport_refresh_steps` 儲存的值。

**呼叫方式** — 可隨時呼叫。回傳的是 **原樣的儲存值**（含 0），而非經過排程器預設與網格 clamp 的實際 n。執行緒：`[control]` — 只持有場景 read 鎖的純查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |

**回傳值** — 儲存的步數（`0` = 預設）。失敗時為 `-1`。

</details>

<details>
<summary><code>st_rt_source_set_axis_attenuation</code> — 依頻帶設定錐形（on/off-axis）指向衰減</summary>

```c
void st_rt_source_set_axis_attenuation(STRT_Context* context, STSourceId source, const float onAxis[ST_FREQUENCY_BANDS], const float offAxis[ST_FREQUENCY_BANDS]);
```

**用途** — 依 9 個頻帶設定音源正面（on-axis）與側後方（off-axis）輻射的簡易錐形指向性。在沒有量測指向性資料時，提供音源大致的方向性。

**呼叫方式** — 建立後可隨時呼叫。預設為無指向（全頻帶 1.0）。無指向填入 `onAxis[] = offAxis[] = 1.0`，簡單指向填入 `onAxis[] = 1.0` / `offAxis[] = 0.0`（與 `STSourceDesc::directional` 的兩種設定檔相同）。正面方向由 `st_rt_source_set_direction` / `st_rt_source_set_orientation_q` 決定。附加了指向性表（`st_rt_source_set_directivity`）期間使用該表，此錐形值會被保留，移除表後再次使用。執行緒：`[control]`。不可用於喇叭組成員音源（忽略，`ST_STATUS_INVALID_ARGUMENT`）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `onAxis` | 正面輻射衰減，`ST_FREQUENCY_BANDS`（9）個，頻帶 63 Hz … 16 kHz。若為 NULL 則不變更任何內容 |
| `offAxis` | 側後方輻射衰減，9 個。若為 NULL 則不變更任何內容 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_set_orientation_q</code> — 以四元數設定音源區域座標系</summary>

```c
int st_rt_source_set_orientation_q(STRT_Context* context, STSourceId source, const float quatXYZW[4]);
```

**用途** — 以單位四元數（區域→世界）設定將音源區域座標系置於世界中的旋轉。與 `st_rt_source_set_direction` 不同，**連 roll 都能表達**，因此用於精確設定左右不對稱的指向性表的座標系。支援與否以 `ST_CAP_SOURCE_DIRECTIVITY` 確認。

**呼叫方式** — 建立後可隨時呼叫。區域軸為 forward = +Z / up = +Y / right = +X。與 `st_rt_source_set_direction` 雙向同步 — 呼叫此函式時 direction = forward(q) 會一併更新；呼叫 `st_rt_source_set_direction` 時 orientation 會變為無 roll 的最小旋轉（以最後呼叫者為準）。四元數由引擎正規化，因此填入大致正規化的值即可。與指向性表（`st_rt_source_set_directivity`）成對使用。執行緒：`[control]`。喇叭組成員音源為 `0`（`ST_STATUS_INVALID_ARGUMENT`）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `quatXYZW` | 區域→世界旋轉四元數，**X, Y, Z, W 順序**（與 `st_rt_object_create_q` 相同順序） |

**回傳值** — `1` = 成功 / `0` = 失敗。`ST_STATUS_INVALID_ARGUMENT`（非有限分量或退化，norm &lt; 1e-12）、`ST_STATUS_NOT_FOUND`（音源不存在）。

</details>

<details>
<summary><code>st_rt_source_set_directivity</code> — 為音源附加或移除指向性表</summary>

```c
int st_rt_source_set_directivity(STRT_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**用途** — 將從量測資料等取得的各方向·各頻帶輻射能量表附加到音源。使用無法以錐形公式（`st_rt_source_set_axis_attenuation`）表達的實際音源指向模式時需要。支援與否以 `ST_CAP_SOURCE_DIRECTIVITY` 確認。

**呼叫方式** — 建立後可隨時呼叫。引擎會 **複製** 表，且正規化純量也在此呼叫中計算一次，因此返回後即可釋放主機緩衝區。附加表期間以表取代錐形衰減，以 `table = NULL` 移除後回到保留的錐形值。表的查詢方向以音源區域座標系為基準，因此與 `st_rt_source_set_orientation_q` 成對使用。執行緒：`[control]`。喇叭組成員音源為 `0`（`ST_STATUS_INVALID_ARGUMENT`）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |
| `table` | 指向性表 `STSourceDirectivity`（見下方）。呼叫端填入 `structSize` / `apiVersion`。NULL = 移除表 |

**結構體** `STSourceDirectivity`

音源區域座標系（forward = +Z，up = +Y，right = +X）的等角方位角（az）× 仰角（el）節點網格 × 9 頻帶 **能量** 表。方向規約與引擎全域相同：az = atan2(x, z)（正面 0°，右側 +90°），el = asin(y)（上 = +）。節點為 az_i = i × 360/`azCount`（於 360° wrap），el_j = −90 + j × 180/(`elCount` − 1)，查詢為 az wrap · el clamp 雙線性內插。`elCount` 為奇數時水平面（el = 0）落在節點上，建議網格為 5° 間隔（`azCount` = 72，`elCount` = 37）。

| 欄位 | 說明 |
|---|---|
| `structSize` | 呼叫端填入 `sizeof(STSourceDirectivity)` |
| `apiVersion` | 呼叫端填入 `ST_ABI_VERSION` |
| `azCount` | 方位角節點數，`[3, 361]` |
| `elCount` | 仰角節點數，`[2, 181]` |
| `levelMode` | `STDirectivityLevelMode` — 表的絕對電平解譯（見下方） |
| `reserved0` | 保留 |
| `energy` | 表資料，`elCount` × `azCount` × `ST_FREQUENCY_BANDS` 個 float。配置為 `[el][az][band]`（band 為最快變動的軸）。**energy-domain**（非 pressure），所有值須為有限值且 0 以上 |
| `reserved[6]` | 保留 |

**列舉** `STDirectivityLevelMode` — 保持 raw 表不變，只變更引擎在設定時計算一次的各頻帶正規化純量。

| 值 | 說明 |
|---|---|
| `ST_DIRECTIVITY_ABSOLUTE` (0) | 不正規化，直接使用值。用於包含絕對電平的量測表 |
| `ST_DIRECTIVITY_POWER_MEAN` (1) | 正規化使各頻帶球面功率平均為 1（等輻射功率）。只使用指向模式，總輻射功率另以 `intensity` / `st_rt_source_set_energy` 設定時使用。**預設建議** |
| `ST_DIRECTIVITY_ON_AXIS` (2) | 正規化使正面（az = 0，el = 0）值為 1。與遊戲工具的錐形慣例相同的位置 |

**回傳值** — `1` = 成功（含移除表成功）/ `0` = 失敗。`last_status`：
- `ST_STATUS_VERSION_MISMATCH` — `table` 的 `structSize` / `apiVersion` 不符。
- `ST_STATUS_INVALID_ARGUMENT` — `levelMode` 不在 `STDirectivityLevelMode` 內、`azCount` · `elCount` 超出範圍、`energy` 為 NULL、`energy` 有非有限·負數元素（原因見 `st_rt_get_last_error`）、喇叭組成員。
- `ST_STATUS_NOT_FOUND` — 音源不存在。

</details>

<details>
<summary><code>st_rt_source_idle</code> — 讓單一音源休眠</summary>

```c
int st_rt_source_idle(STRT_Context* context, STSourceId source);
```

**用途** — 與引擎整體休眠（`st_rt_idle`）分開，只停止單一音源的計算·渲染。用於播放已結束但很快會再使用的音源，不刪除而以零成本保留。支援與否以 `st_rt_get_capability_word(1)` 的 `ST_CAP1_ENGINE_IDLE` 確認。

**呼叫方式** — 在該音源停止要播放的內容後（stop · pause · 寫入 0）呼叫。剛建立的音源為 RUNNING（即使引擎整體為 IDLE）。
- 呼叫後，傳播通道（direct · 反射/繞射 · 殘響）不再計算該音源並凍結最後的結果。休眠期間即使聆聽者或音源移動，該音源的傳播路徑仍維持舊位置；房間（靜態·動態幾何）變更時則重新計算一次後再凍結。
- `ST_RT_IDLE_DRAINING` 期間，渲染輸出該音源剩餘的聲音（尾音）。若輸入持續發聲，則以 DRAINING 持續渲染。
- 輸入在延遲線長度（max delay）+ 1 s 期間為靜音時變為 `ST_RT_IDLE_IDLE`，渲染既不讀取也不渲染該音源的輸入，也從 IR 組合中移除（共用殘響槽的尾音會延續）。
- 可同時休眠的音源最多 128 個。以相同值再次呼叫則不執行任何動作。
- 凍結傳播的是 `ST_RT_SCHEDULER_PIPELINED`。`ST_RT_SCHEDULER_SYNCHRONOUS` 下 `st_rt_propagate` 也會計算休眠中的音源，只有渲染端的休眠相同。
- 喇叭組成員的休眠由組擁有，請使用 `st_rt_speaker_set_idle` / `_run`。

執行緒：`[control]` — 持有場景鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 要休眠的音源控制代碼 |

**回傳值** — `1` = 成功 / `0` = 失敗：情境為 NULL、音源不存在（`ST_STATUS_NOT_FOUND`）、喇叭組成員（`ST_STATUS_INVALID_ARGUMENT`）、同時休眠表已滿（`ST_STATUS_UNAVAILABLE`，不變更任何內容）。

</details>

<details>
<summary><code>st_rt_source_run</code> — 讓休眠中的音源重新執行</summary>

```c
int st_rt_source_run(STRT_Context* context, STSourceId source);
```

**用途** — 讓以 `st_rt_source_idle` 休眠的音源重新計算·渲染。支援與否以 `ST_CAP1_ENGINE_IDLE` 確認。

**呼叫方式** — 在重新播放該音源之前呼叫。自下一次傳播起重新計算，自下一個區塊起渲染。以保留的 IR 立即發聲，自包含該音源的下一個 IR（組合一個週期後）起使用新結果。休眠期間未讀取的主機串流影格會從該位置接續輸出。已為 RUNNING 時不執行任何動作。執行緒：`[control]` — 持有場景鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 要喚醒的音源控制代碼 |

**回傳值** — `1` = 成功 / `0` = 失敗：情境為 NULL、音源不存在（`ST_STATUS_NOT_FOUND`）、喇叭組成員（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_source_get_idle_state</code> — 讀取音源的休眠狀態</summary>

```c
int st_rt_source_get_idle_state(const STRT_Context* context, STSourceId source);
```

**用途** — 查詢單一音源的休眠狀態。用於確認 `st_rt_source_idle` 之後尾音是否已全部輸出。

**呼叫方式** — 可隨時呼叫。未請求休眠時為 RUNNING，渲染正在輸出剩餘聲音時為 DRAINING，全部清空後為 IDLE。渲染未執行或引擎整體為 IDLE 時，已請求休眠的音源為 IDLE。執行緒：`[control]` — 只持有場景 read 鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |

**回傳值** — `STRT_IdleState` 值：`ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1) / `ST_RT_IDLE_IDLE`(2)。音源不存在或情境為 NULL 時為 `-1`。

</details>

<details>
<summary><code>st_rt_source_get_position_seconds</code> — 以秒讀取音源輸入的播放位置</summary>

```c
double st_rt_source_get_position_seconds(STRT_Context* context, STSourceId source);
```

**用途** — 以音源時間（秒）查詢附加於音源的檔案輸入目前播放位置。用於播放 UI 的進度顯示，或與 `st_rt_source_seek` 搭配。支援與否以 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 確認。

**呼叫方式** — 附加音訊輸入後可隨時呼叫。值是以音源時間為基準的秒數，與 `hostSampleRate` 或音高無關。主機串流等即時 PCM 輸入的時間軸由主機擁有，因此沒有位置。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 目標音源控制代碼 |

**回傳值** — 播放位置（秒）。音源不存在或為即時輸入時為 `-1`。

</details>

</details>

<details>
<summary><strong>音源 — 音訊輸入（檔案·片段·串流）、播放控制、音源 EQ</strong> — 27 個</summary>

<details>
<summary><code>st_rt_source_clear_audio</code> — 從音源移除音訊輸入（檔案·片段·主機串流）</summary>

```c
int st_rt_source_clear_audio(STRT_Context* context, STSourceId source);
```

**用途** — 分離附加於音源的音訊輸入。音源與渲染槽維持不變，只有該音源變為靜音。檔案輸入（`st_rt_source_set_audio_file` 系列）與主機串流（`st_rt_source_attach_stream`）都屬於「音訊輸入」，因此兩者都以此函式移除。

**呼叫方式** — 用於不刪除音源而只切斷聲音，或在換成其他輸入前先清空。分離以 3 ms 斜坡降低。分離串流後的 `st_rt_source_write_stream` 不寫入任何內容並回傳 `0`。請勿對同一音源與 `st_rt_source_write_stream` 同時呼叫。刪除音源的 `st_rt_source_destroy` 也會一併分離輸入，因此不需在其之前呼叫此函式。喇叭組成員音源會被拒絕（`ST_STATUS_INVALID_ARGUMENT`）。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id（`STSourceId`，`st_rt_source_create` 回傳的值） |

**回傳值** — `1` = 已分離 / `0` = 失敗（情境為 NULL、音源不存在、喇叭組成員等）。

</details>

<details>
<summary><code>st_rt_source_set_eq</code> — 對音源原音套用 9 頻帶圖形 EQ</summary>

```c
int st_rt_source_set_eq(STRT_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 對音源訊號套用各頻帶增益以修正音色。濾波器套用於分頻器之前，即音源訊號本身，因此該音源的直達·透射·反射·繞射·殘響送出全部經過相同的濾波器（等同於在實際喇叭訊號鏈上加裝 EQ）。與輸出級 EQ（`st_rt_render_set_eq`）為相同的濾波器設計，與離線 `st_off_source_set_eq` 為相同的實作。

**呼叫方式** — 建立音源後可隨時呼叫，播放中亦可。不會使 IR 失效，以無配置的命令傳給渲染執行緒。播放中變更時，保持濾波器狀態並立即只變更係數（不做平滑斜坡 — 若需要無爆音的切換，請使用 `st_rt_source_set_parametric_eq`）。此函式與 `st_rt_source_set_parametric_eq` 變更的是 **同一個音源 EQ**，以最後呼叫者為準。傳入 `gainsDb = NULL` 會關閉並清除 EQ（以參數式設定的內容也以此清除）。設定會保持到刪除音源為止。也可套用於喇叭組成員音源。支援與否以 `ST_CAP_SOURCE_EQ`（`st_rt_get_capability_word(0)`）確認。執行緒：`[control]` — 會短暫持有場景 read 鎖與渲染控制鎖，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `gainsDb` | `ST_FREQUENCY_BANDS`（9）個增益（dB），頻帶順序 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz。各值須為有限值且在 `[-ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`（±24 dB）內 — 超出時不箝制而是拒絕。`NULL` 或全頻帶 0 dB 時關閉 EQ（與無 EQ 的結果位元相同） |

**濾波器定義** — 每個頻帶一個 RBJ peaking biquad（Q = 1.414，約 1 個八度），依頻帶由低到高串聯。取樣率固定為引擎內部 44100 Hz，與主機取樣率（`hostSampleRate`）無關。`|g| ≤ 1e-4 dB` 的頻帶會略過。相鄰頻帶的響應會重疊（峰值濾波器裙帶），因此若要在頻帶中心精確達到指定增益，需由主機修正增益後填入。

**回傳值** — `1` = 成功 / `0` = 失敗。失敗時 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（非有限值或 `|g| > 24`，不變更任何內容）/ `ST_STATUS_NOT_FOUND`（無音源）/ `ST_STATUS_UNAVAILABLE`（此情境的後端不支援音源 EQ）。

</details>

<details>
<summary><code>st_rt_source_get_eq</code> — 以 9 頻帶增益讀取音源 EQ</summary>

```c
int st_rt_source_get_eq(STRT_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 以 9 頻帶圖形檢視回傳目前的音源 EQ。音源 EQ 只有一個，此函式是將其頻帶清單以 9 頻帶增益呈現的相容檢視。

**呼叫方式** — EQ 不存在或已關閉時全部寫入 0。若為 9 頻帶形狀（canonical 中心頻率·Q 1.414 的 `ST_PARAMETRIC_EQ_PEAKING` 9 個·前級 0·開啟），則寫入該增益。若為其他參數式設定，因無法以 9 頻帶表達，回傳 `0` + `ST_STATUS_UNAVAILABLE`，且不變更 `outGainsDb`。若要區分 `UNAVAILABLE` 的意義，請呼叫 `st_rt_source_get_parametric_eq` — 成功表示「為參數式設定，無法以 9 頻帶讀取」（設定請以該函式讀取），以相同的 `UNAVAILABLE` 失敗則表示後端不支援音源 EQ。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `outGainsDb` | 呼叫端擁有的 `float[ST_FREQUENCY_BANDS]` 輸出緩衝區（63…16k Hz 順序，dB）。`NULL` 則拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗。失敗時 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（`outGainsDb` 為 NULL）/ `ST_STATUS_NOT_FOUND`（無音源）/ `ST_STATUS_UNAVAILABLE`（上述兩種情況）。

</details>

<details>
<summary><code>st_rt_source_set_parametric_eq</code> — 對音源原音套用最多 16 頻帶參數式 EQ</summary>

```c
int st_rt_source_set_parametric_eq(STRT_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 對音源訊號套用直接指定頻帶類型·頻率·增益·Q 的參數式 EQ。套用位置與 `st_rt_source_set_eq` 相同（分頻器之前，該音源的所有路徑），且為 **同一個 EQ**。用於如虛擬喇叭般各音源需要不同頻率修正的情況。

**呼叫方式** — 建立音源後可隨時呼叫，播放中亦可。不會使 IR 失效，以無配置的命令傳給渲染執行緒。值變更時，新舊設定會並行執行 20 ms 並交叉淡化輸出，因此不會產生爆音。期間若再次變更，只等待最新的一個值並接續切換。此函式與 `st_rt_source_set_eq` 都會變更音源 EQ 的整個清單，以最後的 setter 為準。關閉的清單·無效果的清單也會被儲存，getter 原樣回傳 — 若要關閉並清除，請呼叫 `st_rt_source_set_eq(context, source, NULL)`。也可直接套用於喇叭組成員音源（以 `st_rt_speaker_set_get_source` 取得的 id），為每個虛擬喇叭給予不同的修正。AutoEq `ParametricEQ.txt` 可以 `st_rt_render_parse_autoeq_parametric` 讀取後直接傳入結果。設定會保持到刪除音源為止。支援與否以 `ST_CAP1_SOURCE_PARAMETRIC_EQ`（`st_rt_get_capability_word(1)`）確認。執行緒：`[control]` — 持有場景 read 鎖與渲染控制鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `bands` | `STParametricEqBand` 陣列（`bandCount` 個）。`bandCount = 0` 時可為 `NULL` |
| `bandCount` | 頻帶數，`[0, ST_PARAMETRIC_EQ_MAX_BANDS]`（0~16）。超出範圍則拒絕 |
| `preampDb` | 套用於頻帶之前的線性增益（dB），`[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[-48, +12]`。主要用途是防止削波的負值 |
| `enabled` | `0` = 儲存清單但直通（等同無 EQ）/ 其他 = 開啟 |

**結構體** `STParametricEqBand`（32 位元組，為陣列元素故無版本戳記）

| 欄位 | 說明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5)。未知值則拒絕 |
| `enabled` | `0` = 略過此頻帶（恆等）/ 其他 = 開啟 |
| `frequencyHz` | PEAKING·NOTCH 為中心頻率，擱架為中點頻率，LP·HP 為轉角頻率。`[ST_PARAMETRIC_EQ_MIN_FREQUENCY_HZ, min(ST_PARAMETRIC_EQ_MAX_FREQUENCY_HZ, 0.49·Fs)]` = 20 Hz ~ 20 kHz（Fs = 44100） |
| `gainDb` | 僅 PEAKING·LOW_SHELF·HIGH_SHELF 使用（LP·HP·NOTCH 只儲存值）。`[-ST_PARAMETRIC_EQ_MAX_GAIN_DB, +ST_PARAMETRIC_EQ_MAX_GAIN_DB]` = ±24 dB |
| `q` | `[ST_PARAMETRIC_EQ_MIN_Q, ST_PARAMETRIC_EQ_MAX_Q]` = 0.1 ~ 30。LOW_SHELF·HIGH_SHELF 為 `[0.1, ST_PARAMETRIC_EQ_MAX_SHELF_Q]` = 0.1 ~ 3 — 對大增益的擱架給予大 Q 會在轉角產生大的共振峰，而音源 EQ 位於限幅器之前，沒有東西能擋住 |
| `reserved[3]` | 必須為 0（否則拒絕） |

**濾波器定義** — 每個頻帶一個 RBJ Audio EQ Cookbook 二階節，鏈為前級 → 頻帶 0…`bandCount-1` 串聯。取樣率為引擎內部 44100 Hz。`enabled = 0` 的頻帶與 `|gainDb| ≤ 1e-4` 的 PEAKING·擱架頻帶精確為恆等。整體關閉或無效果時（全頻帶恆等 + 前級 0 dB），自切換斜坡結束後起與無 EQ 的結果位元相同。

**值驗證** — 非有限值·未知的 `type`·`reserved ≠ 0`·`bandCount` 超出範圍·（`bandCount > 0` 時）`bands` 為 NULL 會被拒絕且不變更任何內容。有限值超出範圍時會被 **箝制**，getter 回傳箝制後的實際值（與 9 頻帶 `st_rt_source_set_eq` 不箝制而拒絕不同）。

**回傳值** — `1` = 成功 / `0` = 失敗。失敗時 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（上述驗證）/ `ST_STATUS_NOT_FOUND`（無音源）/ `ST_STATUS_UNAVAILABLE`（此情境的後端不支援音源 EQ）。

</details>

<details>
<summary><code>st_rt_source_get_parametric_eq</code> — 讀取音源 EQ 的頻帶清單·前級·開啟狀態</summary>

```c
int st_rt_source_get_parametric_eq(STRT_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 以箝制後的實際值回傳音源 EQ 的目前設定。以 `st_rt_source_set_eq`（9 頻帶）套用的設定也會讀成 9 個 `ST_PARAMETRIC_EQ_PEAKING` 頻帶。沒有 EQ 時為 0 頻帶·關閉。

**呼叫方式** — 輸出規約與 `st_rt_render_get_parametric_eq` 相同。`outBands = NULL` 時作為大小查詢，不寫入頻帶，只填入數量·前級·開啟狀態後回傳 `1`。以 `ST_PARAMETRIC_EQ_MAX_BANDS`（16）作為 `bandCapacity` 一定放得下。回傳頻帶的 `reserved` 以 0 填入。執行緒：`[control]` — 持有場景 read 鎖與渲染控制鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `outBands` | 呼叫端擁有的 `STParametricEqBand` 陣列。`NULL` 則為大小查詢。欄位請參閱 `st_rt_source_set_parametric_eq` 項目 |
| `bandCapacity` | `outBands` 元素數。負數則拒絕。小於頻帶數時為 `0` + `ST_STATUS_BUFFER_TOO_SMALL`（仍寫入數量·前級·開啟狀態） |
| `outBandCount` | 接收頻帶數的指標。`NULL` 則略過 |
| `outPreampDb` | 接收前級（dB）的指標。`NULL` 則略過 |
| `outEnabled` | 接收開啟狀態（`0`/`1`）的指標。`NULL` 則略過 |

**回傳值** — `1` = 成功 / `0` = 失敗。失敗時 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（`bandCapacity < 0`）/ `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_NOT_FOUND`（無音源）/ `ST_STATUS_UNAVAILABLE`（此情境的後端不支援音源 EQ）。

</details>

<details>
<summary><code>st_rt_source_set_path_volume</code> — 設定音源各路徑類型的音量</summary>

```c
int st_rt_source_set_path_volume(STRT_Context* context, STSourceId source, int volumeKind, float volume);
```

**用途** — 分別放大或縮小單一音源的直達聲·反射·繞射·殘響貢獻。值為線性壓力倍率。直達聲音量也包含透射路徑，殘響音量只調整 **此音源送往** 聆聽者共用的後期殘響的量。

**呼叫方式** — 建立音源後可隨時呼叫。建立後 4 種皆為 `1.0`。若要完全移除路徑請使用 `st_rt_source_set_path_enabled`，音源整體電平請使用 `st_rt_source_set_volume`。也可套用於喇叭組成員音源。支援與否以 `ST_CAP_SOURCE_PATH_VOLUME` 確認。執行緒：`[control]` — 只持有場景 read 鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`（0，含透射）/ `ST_SOURCE_VOLUME_REFLECTION`（1）/ `ST_SOURCE_VOLUME_DIFFRACTION`（2）/ `ST_SOURCE_VOLUME_REVERB`（3，送往共用後期殘響）。其他則拒絕 |
| `volume` | 線性壓力倍率，有限值且 `0` 以上。預設 `1.0` |

**回傳值** — `1` = 已套用 / `0` = 失敗（未知的 `volumeKind`、非有限·負數 `volume`、音源不存在）。

</details>

<details>
<summary><code>st_rt_source_get_path_volume</code> — 讀取音源各路徑類型的音量</summary>

```c
float st_rt_source_get_path_volume(STRT_Context* context, STSourceId source, int volumeKind);
```

**用途** — 回傳以 `st_rt_source_set_path_volume` 設定的各路徑類型線性音量。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]` — 只持有場景 read 鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `volumeKind` | `STSourceVolumeKind` — `DIRECT`(0) / `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3) |

**回傳值** — 線性音量（預設 `1.0`）。未知的 `volumeKind` 或情境為 NULL 時為 `-1`。

</details>

<details>
<summary><code>st_rt_source_set_audio_file</code> — 開啟音訊檔案並附加為音源的輸入</summary>

```c
int st_rt_source_set_audio_file(STRT_Context* context, STSourceId source, const char* audioPath, int loop);
```

**用途** — 由引擎直接開啟並解碼檔案作為音源輸入。是主機不需處理 PCM 的最簡單輸入方式。

**呼叫方式** — 建立音源後呼叫，附加後立即為停止狀態，從 `st_rt_source_play` 起才發聲。聲道混為單聲道（立體聲 = 1/√2·L + 1/√2·R）並轉換為引擎速率 44.1 kHz。同一音源若已附加主機串流，檔案輸入會將其取代（之後 `st_rt_source_write_stream` 為 `0`）。重複次數之後可以 `st_rt_source_set_loop_count` 變更。喇叭組成員音源會被拒絕。執行緒：`[control, blocking]` — 會開啟檔案並建立解碼器，請勿在遊戲迴圈·音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `audioPath` | 檔案路徑，**UTF-8**（Windows 亦同 — 可使用韓文路徑）。支援：WAV（PCM·float·ADPCM·µ-law·A-law，RF64·W64）、FLAC、MP3、Ogg Vorbis。Ogg Opus·AAC/M4A·ALAC·WMA 無法開啟而失敗 |
| `loop` | `0` = 播放一次 / 其他 = 無限重複 |

**回傳值** — `1` = 已附加輸入 / `0` = 失敗（路徑為 NULL、無法開啟的檔案·不支援的格式、音源不存在、喇叭組成員等）。

</details>

<details>
<summary><code>st_rt_source_set_audio_asset</code> — 將主機資產系統的編碼檔案附加為串流輸入</summary>

```c
int st_rt_source_set_audio_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io, int repeatCount);
```

**用途** — 讓遊戲引擎的封裝檔·虛擬檔案系統等無法以 OS 路徑開啟的音訊透過主機回呼讀取。使用與 `st_rt_source_set_audio_file` 相同的解碼器（WAV/FLAC/MP3/Vorbis），不預先讀取整個檔案，而以可搜尋的串流解碼。

**呼叫方式** — 播放規約與 `st_rt_source_set_audio_file` 相同（附加後立即停止，以 `st_rt_source_play` 開始）。回呼表會被複製，但 `userData` 與主機資產系統在輸入附加期間必須保持存活。`open`/`close` 在控制執行緒上呼叫，`read`/`seek` 在此呼叫中的探測過程與單一解碼器工作執行緒上呼叫。回呼不得拋出例外或再次呼叫引擎 API。每次成功的 `open` 都會呼叫一次 `close`（含解碼器初始化失敗）。不同情境可同時解碼。附加失敗時保留先前的輸入。支援與否以 `ST_CAP_AUDIO_ASSET_IO` 確認。喇叭組成員音源會被拒絕。執行緒：`[control, blocking]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `assetName` | 原樣傳給 `io->open` 的資產名稱 |
| `io` | `STAudioAssetIO` 回呼表。呼叫端填入 `structSize = sizeof(STAudioAssetIO)`、`apiVersion = ST_ABI_VERSION`，`reserved` 為 0 |
| `repeatCount` | 額外重複次數 — `0` = 一次 / `-1` = 無限 / 正數 N = 再重複 N 次 |

**結構體** `STAudioAssetIO`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STAudioAssetIO)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `userData` | 作為所有回呼第一個引數傳入的主機指標 |
| `open` | `void* open(void* userData, const char* assetName)` — 開啟資產並回傳控制代碼 |
| `read` | `uint64_t read(void* userData, void* handle, void* output, uint64_t bytes)` — 回傳讀取的位元組數（`0` = EOF，不得大於請求量） |
| `seek` | `int seek(void* userData, void* handle, int64_t offset, int origin)` — `origin` `0` = 以開頭為基準 / `1` = 以目前位置為基準。`1` = 成功 / `0` = 錯誤 |
| `close` | `void close(void* userData, void* handle)` — 關閉控制代碼 |
| `reserved[2]` | 0 |

**回傳值** — `1` = 已附加輸入 / `0` = 失敗（保留先前的輸入）。

</details>

<details>
<summary><code>st_rt_source_set_audio_clip</code> — 將短檔案整個解碼並附加為快取片段</summary>

```c
int st_rt_source_set_audio_clip(STRT_Context* context, STSourceId source, const char* audioPath);
```

**用途** — 將短聲音只解碼一次，全部轉為 44.1 kHz 單聲道 PCM 並快取於音源。用於反覆發出相同聲音時，不重新建立音源或重新解碼，而在存活的音源上以 `st_rt_source_trigger`（每次一發）或 `st_rt_source_set_retrigger_interval`（固定間隔）重新開始的輸入。

**呼叫方式** — 格式·降混與 `st_rt_source_set_audio_file` 相同，解碼後長度最多 60 秒。附加失敗時保留先前的輸入。成功時片段以暫停狀態開始，重新開始間隔為 `0`、EOF 重複次數為 `0`，音源的音量·音高維持不變。支援與否以 `ST_CAP_SOURCE_RETRIGGER` 確認。喇叭組成員音源會被拒絕。執行緒：`[control, blocking]` — 會解碼整個檔案，請勿在遊戲迴圈·音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `audioPath` | 檔案路徑（UTF-8）。支援格式請參閱 `st_rt_source_set_audio_file` 項目 |

**回傳值** — `1` = 已附加片段 / `0` = 失敗（保留先前的輸入）。

</details>

<details>
<summary><code>st_rt_source_set_audio_clip_asset</code> — 將主機資產整個解碼並附加為快取片段</summary>

```c
int st_rt_source_set_audio_clip_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io);
```

**用途** — `st_rt_source_set_audio_clip` 的資產版本。將透過主機回呼（`STAudioAssetIO`）讀取的編碼資料全部解碼為 44.1 kHz 單聲道 PCM 並快取。

**呼叫方式** — 行為·限制（最多 60 秒、以暫停開始、間隔 `0`·EOF 重複 `0`、維持音量·音高、失敗時保留先前的輸入）與 `st_rt_source_set_audio_clip` 相同。由於是快取片段，回呼全部在此呼叫內被呼叫並關閉 — `userData` 只需在此函式返回前有效。支援與否以 `ST_CAP_SOURCE_RETRIGGER` 與 `ST_CAP_AUDIO_ASSET_IO` 確認。執行緒：`[control, blocking]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `assetName` | 傳給 `io->open` 的資產名稱 |
| `io` | `STAudioAssetIO` 回呼表（呼叫端填入 `structSize`/`apiVersion`）。欄位請參閱 `st_rt_source_set_audio_asset` 項目 |

**回傳值** — `1` = 已附加片段 / `0` = 失敗（保留先前的輸入）。

</details>

<details>
<summary><code>st_rt_source_set_retrigger_interval</code> — 讓快取片段以固定間隔重新開始</summary>

```c
int st_rt_source_set_retrigger_interval(STRT_Context* context, STSourceId source, double seconds);
```

**用途** — 以輸出時刻為基準，每隔開始-開始間隔 `seconds` 重新開始同一個快取片段。用於需要不受控制執行緒呼叫時機影響的規律重複聲。重新開始時聲學路徑·延遲·殘響狀態仍會保持。

**呼叫方式** — 僅可用於以 `st_rt_source_set_audio_clip`/`_clip_asset` 附加的快取片段。間隔四捨五入到最接近的 44.1 kHz 輸出樣本，音高不改變間隔。變更在下一個輸入讀取邊界套用，並完整開始一個新間隔。在 EOF 之後開啟會重新開始片段。再次設定相同（量化後的）間隔時，進行中的時脈保持不變。給予 `0` 則取消之後的重新開始，目前正在播放的一發會播完。`st_rt_source_play` 開始·恢復，`st_rt_source_pause` 停止時脈，`st_rt_source_stop` 會暫停·倒帶但保留間隔設定。EOF 重複（`st_rt_source_set_loop_count`）與正數間隔不可並用。重新開始時游標重設以 3 ms 切換銜接，尚未結束的前一發不會混合而是被替換。支援與否以 `ST_CAP_SOURCE_RETRIGGER` 確認。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id（已附加快取片段的音源） |
| `seconds` | 開始-開始間隔（秒）。正數範圍為輸出 1 樣本 ~ 3600 s。`0` = 關閉（預設） |

**回傳值** — `1` = 成功 / `0` = 失敗（無效值、音源不存在、非快取片段的輸入等）。

</details>

<details>
<summary><code>st_rt_source_get_retrigger_interval</code> — 讀取快取片段的重新開始間隔</summary>

```c
double st_rt_source_get_retrigger_interval(STRT_Context* context, STSourceId source);
```

**用途** — 以量化後的實際值（秒）回傳以 `st_rt_source_set_retrigger_interval` 設定的間隔。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 量化後的間隔（秒）。`0` = 關閉 / `-1` = 無音源或非快取片段。

</details>

<details>
<summary><code>st_rt_source_trigger</code> — 請求快取片段從頭播放一次</summary>

```c
int st_rt_source_trigger(STRT_Context* context, STSourceId source);
```

**用途** — 配合一次外部事件，讓存活音源的快取片段從頭重新開始。既不解碼也不建立音源，因此在頻繁發出短聲音時用來取代建立新音源。重新開始時聲學延遲·反射·殘響歷程仍會延續。

**呼叫方式** — 必須已附加快取片段，且重新開始間隔為 `0`、EOF 重複次數為 `0`。不需另外呼叫 `st_rt_source_play`。請求在情境的初始聲場被消耗後，於下一個引擎區塊開始；在此之前的多次請求會合併為一次。`st_rt_source_pause`/`st_rt_source_stop`、成功的 `st_rt_source_seek`、間隔·重複設定變更會取消等待中的請求。請將音源保持在開啟狀態（`st_rt_source_set_enabled`）以便渲染。游標在輸入讀取邊界以 3 ms 切換重設，尚未結束的前一發會被替換。`1` 表示已進入佇列，而非已在裝置上播放。支援與否以 `ST_CAP_SOURCE_TRIGGER` 確認。喇叭組成員音源會被拒絕。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id（已附加快取片段的音源） |

**回傳值** — `1` = 已加入佇列 / `0` = 拒絕（非快取片段、間隔·重複不為 0、音源不存在等）。

</details>

<details>
<summary><code>st_rt_source_seek</code> — 移動檔案輸入的播放位置</summary>

```c
int st_rt_source_seek(STRT_Context* context, STSourceId source, double seconds);
```

**用途** — 將檔案·資產·片段輸入的播放游標移到以音源時間為基準的 `seconds`。

**呼叫方式** — 位置以原始檔案影格為單位無條件捨去，播放/暫停狀態維持不變。捨棄解碼器·音高預讀，並重新填滿已設定的重複次數。壓縮格式的搜尋精度依編解碼器而受限。主機串流（即時 PCM）的時間軸由主機擁有，因此會被拒絕。目前位置以 `st_rt_source_get_position_seconds` 讀取（秒為單位，與 `hostSampleRate`·音高無關）。成功的搜尋會取消等待中的 `st_rt_source_trigger` 請求。支援與否以 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 確認。喇叭組成員音源會被拒絕。執行緒：`[control, blocking]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `seconds` | 音源時間位置（秒）。有限值且 `0` 以上 |

**回傳值** — `1` = 成功 / `0` = 失敗（無效值、音源不存在、非檔案輸入等）。

</details>

<details>
<summary><code>st_rt_source_set_loop_count</code> — 設定檔案輸入的重複次數</summary>

```c
int st_rt_source_set_loop_count(STRT_Context* context, STSourceId source, int repeatCount);
```

**用途** — 設定檔案·資產·片段輸入到達結尾時回到開頭再播放幾次。

**呼叫方式** — 從目前游標位置重新填滿重複預算。`st_rt_source_stop` 在倒帶時會恢復此預算。主機串流（即時 PCM）會被拒絕。快取片段不可與正數重新開始間隔（`st_rt_source_set_retrigger_interval`）並用，變更重複設定會取消等待中的 `st_rt_source_trigger` 請求（觸發要求重複次數為 `0`）。支援與否以 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 確認。喇叭組成員音源會被拒絕。執行緒：`[control, blocking]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `repeatCount` | 額外重複次數 — `0` = 一次 / `-1` = 無限 / 正數 N = 再重複 N 次。小於 `-1` 則拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗（無效值、音源不存在、非檔案輸入等）。

</details>

<details>
<summary><code>st_rt_source_get_loop_count</code> — 讀取檔案輸入的重複次數</summary>

```c
int st_rt_source_get_loop_count(STRT_Context* context, STSourceId source);
```

**用途** — 回傳已設定的額外重複次數。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 重複次數（`0` 以上）。`-1` = 無限 / `-2` = 無音源或不支援的輸入。

</details>

<details>
<summary><code>st_rt_source_set_volume</code> — 設定音源輸入的音量</summary>

```c
int st_rt_source_set_volume(STRT_Context* context, STSourceId source, float volume);
```

**用途** — 對音源輸入訊號套用線性壓力增益。套用於聲學路徑·DSP 處理 **之前**，因此該音源的所有路徑（直達·反射·繞射·殘響送出）會一起改變。

**呼叫方式** — 對已附加音訊輸入的音源可隨時呼叫，播放中亦可。變更的值以 3 ms 斜坡過渡。各路徑類型的比例另以 `st_rt_source_set_path_volume` 設定。支援與否以 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 確認。喇叭組成員音源會被拒絕（成員電平由喇叭組 API 決定）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `volume` | 線性壓力增益，`[0, 16]`，預設 `1`。超出範圍·非有限值則拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗（超出範圍的值、音源不存在或沒有音訊輸入等）。

</details>

<details>
<summary><code>st_rt_source_get_volume</code> — 讀取音源輸入的音量</summary>

```c
float st_rt_source_get_volume(STRT_Context* context, STSourceId source);
```

**用途** — 回傳以 `st_rt_source_set_volume` 設定的線性音量。斜坡進行中時為斜坡的目標值。

**呼叫方式** — 可隨時呼叫，也可用於喇叭組成員音源。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 線性音量（預設 `1`）。`-1` = 無音源。

</details>

<details>
<summary><code>st_rt_source_set_pitch</code> — 設定音源輸入的播放速度（音高）</summary>

```c
int st_rt_source_set_pitch(STRT_Context* context, STSourceId source, float ratio);
```

**用途** — 以播放速度比例加快/放慢讀取輸入以改變音高。不做時間伸縮，因此檔案的播放長度或主機串流環的消耗速度也會一起改變。

**呼叫方式** — 對已附加音訊輸入的音源可隨時呼叫。若主機輸入的是已自行變更音高的訊號，請避免重複套用。非 1 的比例使用頻寬受限 sinc 內插，會產生最多 67 影格的預讀。快取片段的重新開始間隔不受音高影響。支援與否以 `ST_CAP_SOURCE_PLAYBACK_CONTROL` 確認。喇叭組成員音源會被拒絕。執行緒：`[control]` — 會建立濾波器係數，請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `ratio` | 播放速度比例，`[0.25, 4]`，預設 `1`。超出範圍·非有限值則拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗（超出範圍的值、音源不存在或沒有音訊輸入等）。

</details>

<details>
<summary><code>st_rt_source_get_pitch</code> — 讀取音源輸入的播放速度比例</summary>

```c
float st_rt_source_get_pitch(STRT_Context* context, STSourceId source);
```

**用途** — 回傳以 `st_rt_source_set_pitch` 設定的播放速度比例。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 播放速度比例（預設 `1`）。`-1` = 無音源。

</details>

<details>
<summary><code>st_rt_source_attach_stream</code> — 為音源附加由主機推入 PCM 的串流輸入</summary>

```c
int st_rt_source_attach_stream(STRT_Context* context, STSourceId source, const STStreamDesc* desc);
```

**用途** — 將語音聊天·合成音·外部中介軟體輸出等由主機即時產生的單聲道 PCM 作為音源輸入。若檔案輸入是「引擎開啟檔案」，這裡就是「主機推入 PCM」。渲染主導權與音訊裝置仍由引擎掌握，引擎渲染執行緒拉取 512 影格區塊時，從各音源的環形緩衝區讀取（並非主機推送渲染）。

**呼叫方式** — 建立音源後呼叫，接著以 `st_rt_source_write_stream` 供應 PCM。生命週期·播放規約與檔案輸入相同：附加後立即為停止狀態，從 `st_rt_source_play` 起發聲，`st_rt_source_pause`/`st_rt_source_stop` 也同樣有效（`stop` 會捨棄環中累積的影格 — 即時串流沒有「倒帶到開頭」）。分離由 `st_rt_source_clear_audio` 負責，`st_rt_source_destroy` 也會分離串流並歸還槽位。對同一音源附加檔案輸入時，檔案會取代串流；反之此函式也會取代檔案輸入。可同時附加的串流為 64 個，歸還的槽位由下一次 attach 重複使用（累計計數器每次 attach 都從 0 重新計數）。環的配置只在此呼叫中發生一次。串流上 `st_rt_source_seek`·`st_rt_source_set_loop_count` 會被拒絕。支援與否以 `ST_CAP_SOURCE_STREAM_INPUT`（僅即時）確認。喇叭組成員音源會被拒絕。執行緒：`[control]` — 持有場景 read 鎖與播放互斥鎖。請勿對同一音源與 `st_rt_source_write_stream` 同時呼叫（不同音源之間無影響）。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |
| `desc` | `STStreamDesc`。呼叫端填入 `structSize = sizeof(STStreamDesc)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STStreamDesc`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STStreamDesc)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `sampleRate` | 輸入取樣率。須為引擎速率（`st_rt_get_sample_rate`，44100）。但在指定了 `STRT_CreateOptions.hostSampleRate` 的情境中須為該值，引擎會在各音源的環前端加上主機→引擎轉換器 |
| `channels` | 只允許 `1`（僅單聲道） |
| `capacityFrames` | 環大小，**主機影格**（= 以 `sampleRate` 為基準）。`0` = 預設 8192 主機影格（引擎速率下約 186 ms），其他為 `[512, 1048576]`。引擎將其換算（四捨五入）為引擎影格後進位到 2 的冪次，因此實際容量大於請求 — 請以 `STStreamStatus.capacityFrames` 確認 |
| `reserved[5]` | 0 |

**回傳值** — `1` = 成功 / `0` = 失敗。失敗時 `st_rt_get_last_status`：`ST_STATUS_VERSION_MISMATCH`（`desc` 戳記不符）/ `ST_STATUS_INVALID_ARGUMENT`（`sampleRate` 不符上述規則、`channels ≠ 1`、`capacityFrames` 既非 0 也不在 `[512, 1048576]` 內）/ `ST_STATUS_NOT_FOUND`（無音源）/ `ST_STATUS_UNAVAILABLE`（64 個同時串流槽位已用盡）。

</details>

<details>
<summary><code>st_rt_source_write_stream</code> — 將單聲道 PCM 寫入串流輸入環</summary>

```c
int st_rt_source_write_stream(STRT_Context* context, STSourceId source, const float* mono, int frames);
```

**用途** — 將單聲道 float PCM 放入以 `st_rt_source_attach_stream` 附加之音源的環形緩衝區。不阻塞，也不鎖定或配置，因此可直接在主機音訊執行緒上呼叫。

**呼叫方式** — 以每個音源 **單一生產者** 為前提，與渲染執行緒以 SPSC 銜接 — 一個音源只由一個執行緒寫入。請勿對同一音源與 `st_rt_source_attach_stream`/`st_rt_source_clear_audio` 同時呼叫（不同音源之間無影響）。失敗時也不會動到診斷緩衝區（`st_rt_get_last_status`），只以 `0` 告知。不檢查非有限樣本（NaN/Inf），因此確保有限性是主機的責任。回傳值的意義依是否指定 `hostSampleRate` 而不同，請依下方區分解讀。執行緒：`[any]` — 可在任意執行緒呼叫且不會阻塞。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 已附加串流的音源 id |
| `mono` | 單聲道 float PCM 緩衝區（`frames` 個） |
| `frames` | 要寫入的影格數，**主機影格**（以 `STStreamDesc.sampleRate` 為基準） |

**回傳值** — 寫入的影格數。未附加串流或已分離時為 `0`。

- `hostSampleRate == 0`（無轉換）：實際進入環的影格數（`0`…`frames`）。環滿時其餘會被捨棄並累計到 `droppedFrames`。回傳值小於 `frames` 時，可將剩餘部分在下一次呼叫再推入，因此可作為背壓訊號使用。
- `hostSampleRate ≠ 0`（重取樣路徑）：一律為 `frames`。轉換器會消耗全部輸入，因此不得再次推入相同影格（訊號會重疊）。溢出被捨棄的部分只透過 `droppedFrames` 回報，回傳值沒有背壓訊號 — 請查看 `st_rt_source_get_stream_status` 的 `queuedFrames`/`capacityFrames` 來調整供應量（例：`queuedFrames` 超過容量的 3/4 時減少推入量）。

</details>

<details>
<summary><code>st_rt_source_get_stream_status</code> — 讀取串流輸入環的剩餘量·欠載·捨棄統計</summary>

```c
int st_rt_source_get_stream_status(const STRT_Context* context, STSourceId source, STStreamStatus* outStatus);
```

**用途** — 回傳串流環中累積的量，以及累計的欠載·捨棄·寫入量。在重取樣路徑（`hostSampleRate ≠ 0`）中，`st_rt_source_write_stream` 的回傳值沒有背壓訊號，因此 `queuedFrames` 與 `capacityFrames` 的比例是唯一的供應調整訊號。

**呼叫方式** — 正常路徑只做 atomic 讀取，因此可在包含音訊執行緒在內的任意執行緒呼叫。但戳記錯誤或沒有串流的錯誤路徑會寫入情境的診斷緩衝區，且此寫入在執行緒之間不會被序列化 — 正確填入引數就不會觸及。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 已附加串流的音源 id |
| `outStatus` | `STStreamStatus` 輸出。呼叫端填入 `structSize = sizeof(STStreamStatus)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STStreamStatus`

五個影格欄位皆為 **主機影格**（以 `STStreamDesc.sampleRate` = `hostSampleRate`，未指定時以 44100 為基準）。換算在查詢時四捨五入一次，因此誤差不會累積。48 kHz 主機下 `capacityFrames` 不是 2 的冪次（例：引擎 8192 → 主機 8916），因此不要假設環大小為 2 的冪次。3 個累計計數器是自 attach 時起的總和，重新 attach 會從 0 計數。

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STStreamStatus)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `queuedFrames` | 目前環中累積的影格 |
| `capacityFrames` | 引擎實際配置的環容量 |
| `underrunFrames` | 累計：環為空而以靜音填充的影格 |
| `droppedFrames` | 累計：環已滿而捨棄的影格 |
| `totalWrittenFrames` | 累計：實際進入環的影格 |
| `reserved[6]` | 保留 |

**回傳值** — `1` = 成功 / `0` = 失敗。失敗時 `st_rt_get_last_status`：`ST_STATUS_VERSION_MISMATCH`（戳記不符）/ `ST_STATUS_NOT_FOUND`（未附加串流）。`outStatus` 或情境為 NULL 時也為 `0`。

</details>

<details>
<summary><code>st_rt_source_play</code> — 開始或恢復音源輸入的播放</summary>

```c
void st_rt_source_play(STRT_Context* context, STSourceId source);
```

**用途** — 開始檔案·資產·片段·串流輸入的播放。附加輸入後立即為停止狀態，因此要發聲必須呼叫此函式。

**呼叫方式** — 附加音訊輸入後呼叫。實際聲音在該音源的第一個 IR 到達渲染器後才發出。若為暫停狀態則從該位置恢復，快取片段的重新開始間隔時脈也會開始·恢復。只以 `st_rt_source_trigger` 播放的片段不需要此呼叫。喇叭組成員音源會被忽略。執行緒：`[control]` — 持有播放互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_pause</code> — 暫停音源輸入的播放</summary>

```c
void st_rt_source_pause(STRT_Context* context, STSourceId source);
```

**用途** — 保持目前游標位置並停止播放。以 `st_rt_source_play` 從同一位置恢復。

**呼叫方式** — 游標立即停止，輸出以 3 ms 斜坡將最後的波形終點降至 0，無爆音地切斷。已在房間中擴散的殘響可能持續作響。快取片段的重新開始時脈也會停止，等待中的 `st_rt_source_trigger` 請求會被取消。喇叭組成員音源會被忽略。執行緒：`[control]` — 持有播放互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_source_stop</code> — 停止音源輸入的播放並回到開頭</summary>

```c
void st_rt_source_stop(STRT_Context* context, STSourceId source);
```

**用途** — 停止播放並將游標倒帶到開頭。下一次 `st_rt_source_play` 從開頭播放。

**呼叫方式** — 輸出與 `st_rt_source_pause` 相同以 3 ms 斜坡切斷，已在房間中擴散的殘響可能持續作響。檔案輸入在倒帶的同時恢復已設定的重複次數。快取片段保留重新開始間隔設定，等待中的 `st_rt_source_trigger` 請求會被取消。主機串流沒有可倒帶的開頭，因此會捨棄環中累積的影格。喇叭組成員音源會被忽略。執行緒：`[control]` — 持有播放互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 即時情境控制代碼 |
| `source` | 目標音源 id |

**回傳值** — 無。

</details>

</details>

<details>
<summary><strong>聆聽者 · 傳播 · 聲學策略</strong> — 27 個</summary>

<details>
<summary><code>st_rt_listener_set_position</code> — 設定聆聽者位置</summary>

```c
void st_rt_listener_set_position(STRT_Context* context, float x, float y, float z);
```

**用途** — 變更聆聽者的世界位置。所有音源的直達聲·反射·繞射·殘響路徑都以此位置為終點計算。

**呼叫方式** — 在遊戲迴圈中，每當攝影機或玩家頭部位置變更時呼叫。方向另以 `st_rt_listener_set_rotation` / `st_rt_listener_set_rotation_ypr` / `st_rt_listener_set_orientation_q` 指定，變更位置時方向維持不變。座標以 **場景單位原樣** 填入（以 `STRT_CreateOptions.sceneRatio` 轉換為公尺由引擎負責）。執行緒：`[control]` — 在控制執行緒上呼叫，不要在音訊回呼中呼叫。`ST_RT_SCHEDULER_PIPELINED` 下不直接鎖定場景，而是放入運動佇列後返回，傳播工作執行緒在下一個週期反映最新值。`ST_RT_SCHEDULER_SYNCHRONOUS` 下，下一次 `st_rt_propagate` 會看到新位置。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `x` | 世界 X 座標（場景單位，+X = right） |
| `y` | 世界 Y 座標（場景單位，+Y = up） |
| `z` | 世界 Z 座標（場景單位，+Z = forward） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_listener_set_velocity</code> — 設定聆聽者速度（用於都卜勒）</summary>

```c
void st_rt_listener_set_velocity(STRT_Context* context, float x, float y, float z);
```

**用途** — 告知聆聽者的移動速度向量。引擎以音源·聆聽者速度計算各路徑的都卜勒斜率。

**呼叫方式** — 一般與位置一起每個影格更新。速度以 **場景單位/秒** 填入，引擎乘以 `sceneRatio` 轉換為 m/s 後除以音速。靜止的聆聽者為 `(0, 0, 0)`。都卜勒音高渲染本身由 `STRenderOptions.useDoppler` 負責，移動音源的輻射增益由 `st_rt_set_doppler_gain_mode` 負責。執行緒：`[control]` — 請勿在音訊回呼中呼叫。`PIPELINED` 下放入運動佇列，於下一個傳播週期反映。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `x` | 速度 X 分量（場景單位/秒） |
| `y` | 速度 Y 分量（場景單位/秒） |
| `z` | 速度 Z 分量（場景單位/秒） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_listener_set_rotation</code> — 以 yaw·pitch（弧度）設定聆聽者方向</summary>

```c
void st_rt_listener_set_rotation(STRT_Context* context, float yaw, float pitch);
```

**用途** — 以 yaw·pitch 設定聆聽者的頭部方向。空間化（平移·HRTF·喇叭解碼）的方位角·仰角以此方向為基準計算。不表達 roll（頭部傾斜）。

**呼叫方式** — 每當攝影機旋轉變更時呼叫。角度為 **弧度**。旋轉矩陣為 `R = Ry(yaw)·Rx(pitch)`，`yaw = 0, pitch = 0` 時 forward = +Z、up = +Y、right = +X（恆等）。**yaw 正值 = 向右轉**（從上往下看為順時針），**pitch 正值 = 往下看**。要從方向向量 `d` 反求，使用 `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`。引擎座標系與 Unity 相同，因此 Unity 主機不需轉換即可填入；將 forward 設為 −Z 的主機（OpenGL 式攝影機）須反轉 Z 或在 yaw 上加 180 度後填入。三個聆聽者方向 setter（`st_rt_listener_set_rotation`、`st_rt_listener_set_rotation_ypr`、`st_rt_listener_set_orientation_q`）會覆寫同一個方向值，**以最後呼叫者為準**。執行緒：`[control]` — 請勿在音訊回呼中呼叫。`PIPELINED` 下放入運動佇列。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `yaw` | 繞 +Y 軸旋轉（弧度）。正值 = 向右轉 |
| `pitch` | 繞 +X 軸旋轉（弧度）。正值 = 往下看 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_listener_set_orientation_q</code> — 以四元數（XYZW）設定聆聽者方向（含 roll）</summary>

```c
int st_rt_listener_set_orientation_q(STRT_Context* context, const float quatXYZW[4]);
```

**用途** — 以區域→世界單位四元數指定聆聽者方向。可包含 yaw·pitch 無法表達的 roll（頭部傾斜），因此在 VR 頭部追蹤等主機已有四元數的情況下可直接傳入。

**呼叫方式** — 區域軸為 forward = +Z · up = +Y · right = +X。分量順序為 **XYZW**，正規化由引擎負責，主機不需事先正規化。驗證與 `st_rt_source_set_orientation_q` 相同。`st_rt_listener_set_rotation(yaw, pitch)` 等同於 `q = q_y(yaw) · q_x(pitch)` 的 roll 0 情況。三個聆聽者方向 setter **以最後呼叫者為準**。支援與否以 `st_rt_get_capability_word(1)` 的 `ST_CAP1_LISTENER_ORIENTATION_Q` 位元確認。執行緒：`[control]` — 請勿在音訊回呼中呼叫。`PIPELINED` 下放入運動佇列。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `quatXYZW` | 區域→世界旋轉四元數 `[x, y, z, w]`。有非有限分量或範數退化（`norm < 1e-12`）則拒絕 |

**回傳值** — `1` = 已套用 / `0` = 失敗。非有限·退化的四元數不變更任何內容，並在 `st_rt_get_last_status` 留下 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_rt_listener_set_rotation_ypr</code> — 以 yaw·pitch·roll（弧度）設定聆聽者方向</summary>

```c
int st_rt_listener_set_rotation_ypr(STRT_Context* context, float yaw, float pitch, float roll);
```

**用途** — 在 `st_rt_listener_set_rotation` 上加入 roll 的歐拉角版本。供以歐拉角處理頭部傾斜的主機使用。

**呼叫方式** — 旋轉矩陣為 `R = Ry(yaw)·Rx(pitch)·Rz(roll)`，與 Unity `Quaternion.Euler(pitch, yaw, roll)`（將度轉為弧度的值）順序相同。yaw·pitch 的意義與 `st_rt_listener_set_rotation` 相同（yaw 正值 = 向右轉，pitch 正值 = 往下看），**roll 正值 = right 軸向上傾**（頭部向左傾，右耳抬起）。`roll = 0` 時與 `st_rt_listener_set_rotation(yaw, pitch)` 為相同矩陣。三個聆聽者方向 setter **以最後呼叫者為準**。支援與否以 `ST_CAP1_LISTENER_ORIENTATION_Q`（能力字組 1）確認。執行緒：`[control]` — 請勿在音訊回呼中呼叫。`PIPELINED` 下放入運動佇列。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `yaw` | 繞 +Y 軸旋轉（弧度）。正值 = 向右轉 |
| `pitch` | 繞 +X 軸旋轉（弧度）。正值 = 往下看 |
| `roll` | 繞 +Z 軸旋轉（弧度）。正值 = right 軸向上（頭部向左傾） |

**回傳值** — `1` = 已套用 / `0` = 失敗。有非有限值時不變更任何內容，並留下 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_rt_set_path_type_enabled</code> — 全域開關各路徑類型的傳播</summary>

```c
void st_rt_set_path_type_enabled(STRT_Context* context, int pathType, int enabled);
```

**用途** — 讓整個引擎不計算直達聲·透射·反射·繞射·殘響中特定類型的路徑。用於逐一分離聆聽各成分對聲音貢獻多少，或移除不需要的類型以降低成本。

**呼叫方式** — 預設值為 5 種全部開啟。這是傳播階段的閘門，因此關閉的類型根本不會產生路徑（與渲染階段閘門 `STRenderOptions.render*` 不同）。若只套用到單一音源，請使用 `st_rt_source_set_path_enabled`。與 `st_rt_set_acoustic_feature_enabled` 組合，只需設定即可建立「關閉聲音追蹤」基準線 — 關閉反射·繞射·殘響並關閉三項聲學功能後，只剩下距離衰減與平移。執行緒：`[control]` — 持有場景 write 鎖，因此可能與工作執行緒短暫競爭。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb。超出範圍的值會被忽略 |
| `enabled` | `0` = 關閉，其他 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_set_acoustic_feature_enabled</code> — 個別開關空氣吸收·傳播延遲·直達聲遮蔽</summary>

```c
int st_rt_set_acoustic_feature_enabled(STRT_Context* context, int feature, int enabled);
```

**用途** — 開關個別聲學功能以進行聆聽 A/B 比較。與路徑類型閘門（`st_rt_set_path_type_enabled`）一起，是用來逐一分離播放「哪些因素對聲音有貢獻」的介面。

**呼叫方式** — 預設值為三項功能全部開啟（依物理原樣）。關閉反射·繞射·殘響路徑並關閉三項功能後，就成為只剩距離衰減與立體聲平移的基準線。目前值以 `st_rt_is_acoustic_feature_enabled` 讀取。此函式是 **會觸發 IR 重新轉換** 的 setter — 僅呼叫就會重新執行 IR 轉換管線並發佈新 IR（`PIPELINED` 會喚醒工作執行緒），因此只在值變更時呼叫。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`(0) = 大氣衰減（高頻損失）/ `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`(1) = 基於路徑長度的傳播延遲 / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`(2) = 直達聲遮蔽（可見性檢查） |
| `enabled` | `0` = 關閉，其他 = 開啟 |

**回傳值** — `1` = 已套用 / `0` = `feature` 超出範圍或失敗。

</details>

<details>
<summary><code>st_rt_set_late_coupling</code> — 細部設定依聆聽者–音源擴散場耦合的殘響衰減</summary>

```c
int st_rt_set_late_coupling(STRT_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**用途** — 依聆聽者與音源擴散場的耦合程度衰減 late reverb（FDN）注入。殘響槽是完全混合的單一空間，預設在任何位置聽起來大小都相同；此選項用於修正在匚字形·口字形等繞過轉角而分隔的空間中，「遠離音源後殘響仍不變甚至變大」的問題。

**呼叫方式** — 大多數情況 `st_rt_set_late_coupling_preset` 就足夠，只在需要細部調整時使用此函式。耦合衰減（`floorDb`）·send 平坦化（`sendNormalizeTrim`）·方向樣本收集（`rainDirectionWalk`）設計為一起使用 — 不做平坦化只開啟耦合，會留下越遠殘響注入越大的反轉；關閉方向樣本收集，分隔空間另一側的殘響方向資訊會不足。個別參數的組成日後可能變更，因此盡可能使用預設組。目前值以 `st_rt_get_late_coupling` 讀取。這是 **會觸發 IR 重新轉換** 的 setter（呼叫後 IR 會重新轉換·發佈）。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `floorDb` | 完全阻斷時的衰減深度（dB，0 以上）。`0` = 關閉耦合衰減。預設 `9` |
| `visibleLow` | 可見比例低於此值時視為完全阻斷，衰減 `floorDb`。`[0, 1)`。`0` → 預設 `0.05` |
| `visibleHigh` | 可見比例高於此值時視為同一空間，**精確為 0 dB**。`[0, 1]`。`0` → 預設 `0.60` |
| `sendNormalizeTrim` | 殘響 send 總和平坦化修整（0 以上）。`0` = 不平坦化。預設 `0.75` |
| `rainDirectionWalk` | `1`（預設）= 持續收集殘響方向樣本（不搬運能量）/ `0` = 關閉 |

**回傳值** — `1` = 已套用 / `0` = 超出範圍（非有限·負數、`visibleLow >= 1`、`visibleHigh > 1`）或失敗。失敗時值不變。

</details>

<details>
<summary><code>st_rt_get_late_coupling</code> — 讀取目前的 late 耦合衰減設定</summary>

```c
int st_rt_get_late_coupling(const STRT_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**用途** — 回傳以 `st_rt_set_late_coupling` / `st_rt_set_late_coupling_preset` 套用的目前值。用於確認預設組實際填入了哪些值，或顯示於 UI。

**呼叫方式** — 可隨時呼叫。不需要的輸出引數傳入 `NULL` 即會略過。執行緒：`[control]` — 無鎖讀取引擎狀態的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outFloorDb` | 接收完全阻斷衰減深度（dB）的指標。允許 `NULL` |
| `outVisibleLow` | 接收完全阻斷拐點的指標。允許 `NULL` |
| `outVisibleHigh` | 接收同一空間（0 dB）拐點的指標。允許 `NULL` |
| `outSendNormalizeTrim` | 接收 send 平坦化修整的指標。允許 `NULL` |
| `outRainDirectionWalk` | 接收是否收集方向樣本（`1`/`0`）的指標。允許 `NULL` |

**回傳值** — `1` = 成功（將目前值寫入輸出指標）/ `0` = 沒有情境。

</details>

<details>
<summary><code>st_rt_set_late_coupling_preset</code> — 以建議預設組一次設定 late 耦合衰減</summary>

```c
int st_rt_set_late_coupling_preset(STRT_Context* context, int preset);
```

**用途** — 以建議組合一次填入 `st_rt_set_late_coupling` 的五個值。各預設組只有衰減底限深度不同，其餘（兩個拐點·平坦化修整·方向樣本收集）為相同的建議值。

**呼叫方式** — 引擎預設狀態與 `ST_LATE_COUPLING_DEFAULT` 相同。無論哪個預設組，聆聽者與音源在同一空間時衰減精確為 0 dB，在單一房間中實際上沒有差異 — 差異只出現在繞過轉角而分隔的空間中，因此選擇屬於聽感問題。若需要個別調整，請使用 `st_rt_set_late_coupling`。這是 **會觸發 IR 重新轉換** 的 setter。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `preset` | `ST_LATE_COUPLING_OFF`(0) = 耦合衰減·平坦化·方向樣本收集全部關閉 / `ST_LATE_COUPLING_SUBTLE`(1) = 底限 6 dB / `ST_LATE_COUPLING_DEFAULT`(2) = 底限 9 dB（引擎預設）/ `ST_LATE_COUPLING_STRONG`(3) = 底限 12 dB |

**回傳值** — `1` = 已套用 / `0` = `preset` 超出範圍或失敗。

</details>

<details>
<summary><code>st_rt_set_physical_distance_attenuation</code> — 設定物理距離衰減的參考距離·最小距離</summary>

```c
void st_rt_set_physical_distance_attenuation(STRT_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**用途** — 設定依路徑長度的距離衰減（球面擴散）的基準點。引擎的距離衰減法則只有物理壓力擴散一種，壓力增益為 `referenceDistanceMeters / max(距離, minDistanceMeters)`。也就是在參考距離處增益為 1（0 dB）。

**呼叫方式** — 預設值為參考距離 1.0 m · 最小距離 1.0 m（1 m 以內不再變大）。將 `minDistanceMeters` 設得比參考距離小會產生近場增強（例：參考 1，最小 0.25 → 最大增益 4 倍）。兩個值以 **公尺** 指定，不套用 `sceneRatio`（因為比較對象的路徑長度已轉換為公尺）。這是 **會觸發 IR 重新轉換** 的 setter。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `referenceDistanceMeters` | 增益為 1 的參考距離（m）。預設 `1.0` |
| `minDistanceMeters` | 距離下限（m）。比此更近也以此距離計算。預設 `1.0` |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_set_atmosphere</code> — 設定大氣條件（溫度·濕度·氣壓）</summary>

```c
void st_rt_set_atmosphere(STRT_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**用途** — 設定用於空氣吸收與音速計算的大氣狀態。音速並非固定常數，而是由此大氣值推導，各頻帶空氣吸收（高頻損失）以 ISO 9613-1 純音吸收公式計算。可表現如炎熱乾燥的沙漠、寒冷潮濕的戶外等，遠距離高頻衰減與延遲隨環境而異的情形。

**呼叫方式** — 預設值為 20.0 °C · 50.0 % RH · 101.325 kPa。只在載入關卡或天氣變化等值變更時呼叫。若要關閉空氣吸收本身，請使用 `st_rt_set_acoustic_feature_enabled(ST_ACOUSTIC_FEATURE_AIR_ABSORPTION, 0)`。這是 **會觸發 IR 重新轉換** 的 setter。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `temperatureC` | 氣溫（°C）。預設 `20.0` |
| `relativeHumidityPercent` | 相對濕度（%，0~100）。預設 `50.0` |
| `pressureKPa` | 大氣壓（kPa）。預設 `101.325` |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_set_doppler_gain_mode</code> — 設定移動音源的都卜勒輻射增益模式</summary>

```c
int st_rt_set_doppler_gain_mode(STRT_Context* context, int mode);
```

**用途** — 開關音源移動時朝行進方向輻射較大聲、朝反方向輻射較小聲的效果（移動單極近似）。與可變延遲造成的都卜勒 **音高** 變化（`STRenderOptions.useDoppler`）是不同的開關。

**呼叫方式** — 預設值為 `ST_DOPPLER_GAIN_MOVING_MONOPOLE`。靜止的音源增益為 1，沒有影響；在 IR 轉換時每條路徑計算一次，因此不產生渲染成本。目前值以 `st_rt_get_doppler_gain_mode` 讀取。支援與否以 `ST_CAP_DOPPLER_GAIN_MODE` 確認。這是 **會觸發 IR 重新轉換** 的 setter（再次填入相同值則不執行任何動作）。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) = 無輻射增益 / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`(1) = 移動單極近似：壓力 `D^2`，能量 `D^4`，`D = 1/(1 - Mr)`（音源速度在輻射方向上的馬赫數 `Mr`），依路徑的每個輻射方向分別計算 |

**回傳值** — `1` = 已套用 / `0` = `mode` 超出範圍或失敗。

</details>

<details>
<summary><code>st_rt_get_doppler_gain_mode</code> — 讀取目前的都卜勒輻射增益模式</summary>

```c
int st_rt_get_doppler_gain_mode(const STRT_Context* context);
```

**用途** — 回傳以 `st_rt_set_doppler_gain_mode` 設定的目前模式。

**呼叫方式** — 可隨時呼叫。執行緒：`[control]` — 無鎖讀取引擎狀態的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STDopplerGainMode` 值（`0` = `ST_DOPPLER_GAIN_OFF`，`1` = `ST_DOPPLER_GAIN_MOVING_MONOPOLE`）。

</details>

<details>
<summary><code>st_rt_set_early_late_band_energy_targets</code> — 分別設定早期反射·殘響的各頻帶能量倍率</summary>

```c
int st_rt_set_early_late_band_energy_targets(STRT_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**用途** — 彼此獨立地調整早期（early）成分與殘響（late）成分的各頻帶能量。例如只降低殘響的高頻，或只提高早期反射的低頻等音色修正，可在不動到材質的情況下進行。

**呼叫方式** — **一次替換** 兩個陣列（若只要變更其中一個，另一個請再填入目前值）。陣列為依 63、125、250、500、1k、2k、4k、8k、16k Hz 順序的 9 個值，為 **energy-domain** 倍率（`2.0` ≈ +3 dB，`0.5` ≈ −3 dB）。early 陣列只套用於個別路徑（exact/early tap），late 陣列只套用於殘響 send·槽驅動，兩者不會互相相乘。預設值全部為 `1.0`（中性）。支援與否以 `ST_CAP_EARLY_LATE_BAND_ENERGY` 確認。這是 **會觸發 IR 重新轉換** 的 setter。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `earlyBandEnergy` | 早期成分各頻帶能量倍率 9 個。非有限值正規化為 `1.0`，其餘正規化到 `[0, 16]`。不可為 `NULL` |
| `lateBandEnergy` | 殘響成分各頻帶能量倍率 9 個。正規化規則相同。不可為 `NULL` |

**回傳值** — `1` = 已套用 / `0` = 任一陣列為 `NULL` 或失敗。

</details>

<details>
<summary><code>st_rt_set_max_depth</code> — 設定反射·繞射路徑的全域最大階數</summary>

```c
void st_rt_set_max_depth(STRT_Context* context, int depth);
```

**用途** — 針對整個引擎設定反射·繞射路徑搜尋所追蹤的最大邊界面交互次數（階數）。調高值可精確追蹤到高階反射，但傳播成本會增加。

**呼叫方式** — 預設值為全域 8。各音源深度（預設 4）另以 `st_rt_source_set_depth` 設定。通常在建立場景後的品質設定階段呼叫一次。執行緒：`[control]` — 持有場景 write 鎖，因此可能與工作執行緒短暫競爭。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `depth` | 最大階數，`[1, 64]`。預設 `8`。超出範圍的值會被忽略（保留先前的值） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_set_transmission_max_depth</code> — 設定直達聲·透射路徑可穿過的最大面數</summary>

```c
void st_rt_set_transmission_max_depth(STRT_Context* context, int depth);
```

**用途** — 設定音源→聆聽者直線被遮擋時，透射路徑最多可穿過幾個面。這是決定要計算到穿過幾層牆壁的聲音的值。

**呼叫方式** — 預設值為 64。`0` 時不穿過透射面。若要關閉透射路徑本身，請使用 `st_rt_set_path_type_enabled`（Transmission = 1）。執行緒：`[control]` — 持有場景 write 鎖。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `depth` | 可穿過的最大面數，`[0, 64]`。預設 `64`。超出範圍的值會被忽略（保留先前的值） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_listener_set_ray_count</code> — 設定聆聽者探索（guide）射線數</summary>

```c
void st_rt_listener_set_ray_count(STRT_Context* context, int width, int height);
```

**用途** — 以 `width × height` 設定從聆聽者發射的探索（guide/probe）射線數量。這些射線用來尋找反射·繞射路徑候選，增加數量可降低漏掉小反射面的機率，但傳播成本會增加。

**呼叫方式** — 預設值為 16 × 16（256 條）。音源端的傳輸射線另以 `st_rt_source_set_ray_count` 設定。射線方向分佈由 `st_rt_listener_set_ray_sampling_method` 決定。執行緒：`[control]` — 持有場景 write 鎖。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `width` | 網格橫向數，`[1, 4096]`。預設 `16` |
| `height` | 網格縱向數，`[1, 4096]`。預設 `16`。任一者超出範圍則忽略整個呼叫 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_listener_set_ray_sampling_method</code> — 設定聆聽者探索射線的方向分佈</summary>

```c
int st_rt_listener_set_ray_sampling_method(STRT_Context* context, int method);
```

**用途** — 選擇聆聽者探索射線在球面上如何分佈。目前可選的分佈只有 `ST_RAY_SAMPLING_FIBONACCI_SPHERE` 一種，此函式保留作為明確確認·設定該值之用。

**呼叫方式** — 預設值，也是唯一接受的值，為 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)。費波那契分佈具決定性且不使用種子。其餘 `STRaySamplingMethod` 值為了編號相容只保留在列舉中，會被拒絕。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `method` | `STRaySamplingMethod`。只允許 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)。`ST_RAY_SAMPLING_LEGACY_GRID`(0) / `ST_RAY_SAMPLING_EQUAL_AREA_GRID`(2) / `ST_RAY_SAMPLING_SOBOL_SPHERE`(3) / `ST_RAY_SAMPLING_ICOSAHEDRAL`(4) 會被拒絕 |

**回傳值** — `1` = 已套用 / `0` = 拒絕（狀態不變，留下 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_listener_get_ray_sampling_method</code> — 讀取聆聽者探索射線的方向分佈</summary>

```c
int st_rt_listener_get_ray_sampling_method(const STRT_Context* context);
```

**用途** — 回傳目前的聆聽者探索射線分佈。

**呼叫方式** — 可隨時呼叫。可選的分佈只有費波那契一種，因此在正常情境中一律為 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`。執行緒：`[control]` — 只持有場景 read 鎖的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STRaySamplingMethod` 值（一律為 `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`）/ `-1` = 沒有情境。

</details>

<details>
<summary><code>st_rt_set_source_ray_sampling_method</code> — 設定音源傳輸射線的方向分佈</summary>

```c
int st_rt_set_source_ray_sampling_method(STRT_Context* context, int method);
```

**用途** — 選擇從音源發射的傳輸（用於殘響·擴散能量）射線的球面分佈。與聆聽者端相同，目前可選的值只有 `ST_RAY_SAMPLING_FIBONACCI_SPHERE` 一種。

**呼叫方式** — 預設值，也是唯一接受的值，為 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)。音源傳輸射線數以 `st_rt_source_set_ray_count` 設定。執行緒：`[control]` — 請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `method` | `STRaySamplingMethod`。只允許 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)，其餘值會被拒絕 |

**回傳值** — `1` = 已套用 / `0` = 拒絕（狀態不變，留下 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_rt_get_source_ray_sampling_method</code> — 讀取音源傳輸射線的方向分佈</summary>

```c
int st_rt_get_source_ray_sampling_method(const STRT_Context* context);
```

**用途** — 回傳目前的音源傳輸射線分佈。

**呼叫方式** — 可隨時呼叫。在正常情境中一律為 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`。執行緒：`[control]` — 只持有場景 read 鎖的查詢。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STRaySamplingMethod` 值（一律為 `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`）/ `-1` = 沒有情境。

</details>

<details>
<summary><code>st_rt_build</code> — 完整建置靜態·動態加速結構</summary>

```c
void st_rt_build(STRT_Context* context);
```

**用途** — 依網格·物件配置重新建置靜態 TLAS 與動態 TLAS。傳播與 `st_rt_scene_raycast` 使用此加速結構，因此組成場景後必須至少呼叫一次。

**呼叫方式** — 在建立網格·物件之後、第一次 `st_rt_propagate` 之前呼叫。之後若 **靜態** 組成變更（如新增·刪除·移動靜態物件），必須再次呼叫 — 靜態 TLAS 在 `st_rt_build` 之前會沿用先前發佈的版本，其間的靜態變更不可見。若只要反映動態物件（`isDynamic = 1`）的移動，請使用較輕量的 `st_rt_build_dynamic`。執行緒：`[control, blocking]` — 加速結構完整建置，是較長的獨佔區間。不要在遊戲迴圈的每影格路徑或音訊執行緒中呼叫，請在載入階段呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_build_dynamic</code> — 只重新調整動態物件加速結構</summary>

```c
void st_rt_build_dynamic(STRT_Context* context);
```

**用途** — 只更新（refit）由動態物件（`isDynamic = 1`）構成的動態 TLAS。在有門·電梯等移動幾何時，不需完整建置即可將其變化反映到傳播的輕量路徑。

**呼叫方式** — 在變更動態物件的變換（`st_rt_object_set_transform` 等）之後呼叫。不會動到靜態 TLAS，因此靜態組成變更需要 `st_rt_build`。執行緒：`[control]` — 持有場景 write 鎖，因此可能與工作執行緒短暫競爭。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_set_lane_update_interval</code> — 設定各傳播通道的更新週期</summary>

```c
int st_rt_set_lane_update_interval(STRT_Context* context, int lane, float milliseconds);
```

**用途** — 設定 `PIPELINED` 排程器下直達聲·反射/繞射·殘響三個傳播通道重新計算的頻率。是讓主機調整 CPU 使用量與反應性之間平衡的旋鈕。反射/繞射通道佔傳播成本的大部分，因此若想節省 CPU，請先調高此通道的週期。代價是早期反射跟隨聆聽者移動稍慢，但直達聲通道的週期不變，因此不會出現靜音或斷音。

**呼叫方式** — **執行期間隨時** 可呼叫（與執行緒屬性不同，沒有須在 `st_rt_create` 之前的限制）。即使在工作執行緒執行中變更，也會從下一個週期起以新值執行；已進入等待的截止時間維持不變，自下一次執行起使用新值。各通道即使沒有 Guide 或主機的新請求，也會獨立反覆執行。週期的意義依通道而異（見下表）。`ST_RT_SCHEDULER_SYNCHRONOUS` 沒有通道，因此會失敗。支援與否以 `ST_CAP_LANE_UPDATE_INTERVAL` 確認。執行緒：`[control]` — 以 atomic 儲存值並傳給工作執行緒。請勿在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `lane` | `STPropagationLane` — `ST_PROPAGATION_LANE_DIRECT`(0)：連續執行 **開始** 之間的最小間隔，預設 10 ms / `ST_PROPAGATION_LANE_REFLECTION_DIFFRACTION`(1)：連續兩次執行之間的最小間隔，預設 0 ms（無限制）。等待中到達的請求在截止前合併為一個，不會被餓死 / `ST_PROPAGATION_LANE_REVERB`(2)：執行 **完成後** 到下一次執行的最小間隔，預設 4 ms |
| `milliseconds` | 最小間隔（ms），`[0, 60000]`。`0` = 無額外等待。負數·NaN·無限大·超過 60000 不箝制而是拒絕 |

**回傳值** — `1` = 已套用 / `0` = 拒絕。`lane` 超出範圍或 `milliseconds` 超出允許範圍時為 `ST_STATUS_INVALID_ARGUMENT`，`SYNCHRONOUS` 排程器時為 `ST_STATUS_UNAVAILABLE`，留在 `st_rt_get_last_status` 中。

</details>

<details>
<summary><code>st_rt_get_lane_update_interval</code> — 讀取傳播通道的更新週期</summary>

```c
float st_rt_get_lane_update_interval(const STRT_Context* context, int lane);
```

**用途** — 以 ms 為單位回傳通道中儲存的更新週期。

**呼叫方式** — 即使最後一次 `st_rt_set_lane_update_interval` 被拒絕，也會回傳目前 **儲存的值**，因此用於確認填入的值是否實際套用。執行緒：`[any]` — 只讀取一個 atomic，可在任意執行緒呼叫且不會阻塞。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `lane` | `STPropagationLane` — `DIRECT`(0) / `REFLECTION_DIFFRACTION`(1) / `REVERB`(2) |

**回傳值** — 儲存的週期（ms）。`lane` 超出範圍或沒有情境時為 `0`。

</details>

<details>
<summary><code>st_rt_propagate</code> — 執行傳播（SYNCHRONOUS）或喚醒傳播工作執行緒（PIPELINED）</summary>

```c
int st_rt_propagate(STRT_Context* context);
```

**用途** — 以目前的場景·音源·聆聽者狀態推進聲學傳播與 IR 轉換。行為依排程器而異。

**呼叫方式** — 在 `st_rt_build` 之後呼叫。

- `ST_RT_SCHEDULER_SYNCHRONOUS`：傳播·IR 管線 **實際在呼叫執行緒上執行**。只有主機呼叫此函式計算才會推進，因此在遊戲迴圈中定期（例：每個影格）呼叫。此排程器下休眠的音源（`st_rt_source_idle`）也會被計算。
- `ST_RT_SCHEDULER_PIPELINED`（預設）：喚醒工作執行緒並 **立即返回**。通道即使沒有主機請求也會依 `st_rt_set_lane_update_interval` 週期反覆執行，因此此呼叫是「有變更，請立即執行」的訊號。

執行緒：`[control, runs-here]` — `SYNCHRONOUS` 下呼叫執行緒會直接承擔傳播成本，因此不要在音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 傳播的路徑數（`PIPELINED` 下為工作執行緒最近一次產生的值）。`PIPELINED` 下有工作執行緒錯誤時為 `-1`，沒有情境時為 `0`。

</details>

</details>

<details>
<summary><strong>渲染 · 輸出級 · 喇叭組</strong> — 56 個</summary>

<details>
<summary><code>st_rt_render_set_spatializer</code> — 選擇空間化方式（平移 / HRIR 資料集）</summary>

```c
int st_rt_render_set_spatializer(STRT_Context* context, int type);
```

**用途** — 選擇渲染路徑的空間化實作。`PANNING` 不使用 HRIR 資料而以立體聲平移，`MIT_KEMAR` 與 `SADIE_D2_KEMAR` 以量測 HRIR 摺積產生雙耳輸出。SADIE II D2 是包含資料集量測 ITD·相位的基準 HRTF。

**呼叫方式** — HRIR 空間化（1·2）用於耳機雙耳輸出，即以 `st_rt_render_start(context, 1)` 開始的渲染。通常在 `st_rt_render_start` 之前選擇一次。執行緒：`[control, blocking]` — 讀入 HRIR 資料集的較長區間，不要在遊戲迴圈·音訊執行緒中呼叫。支援與否以 `ST_CAP_HRTF`、`ST_CAP_SADIE_D2_HRTF`（能力字組 0）確認。

`PANNING` 與 `MIT_KEMAR` 內建於程式庫中。`SADIE_D2_KEMAR` 需要外部檔案 `SADIE_D2_44K_16bit_256tap.hrtfbin`（與授權 `LICENSE-SADIE-II.txt` 一同包含在 SDK 的 `Resources/HRTF/` 中），引擎依以下順序尋找。

1. 環境變數 `SOUNDTRACING_SADIE_D2_HRTF_PATH`（檔案路徑）
2. 目前工作資料夾，3. 執行檔資料夾，4. 此程式庫的資料夾 — 分別在該資料夾及其上 8 層中的 `Assets/HRTF/`、`SoundTracing/Assets/HRTF/`、`Resources/HRTF/` 下尋找該檔案

部署時最簡單的做法是在程式庫旁（或上層）放置 `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`（0，預設）/ `ST_SPATIALIZER_MIT_KEMAR`（1）/ `ST_SPATIALIZER_SADIE_D2_KEMAR`（2） |

**回傳值** — `1` = 已套用 / `0` = 失敗。`type` 超出範圍時為 `0`。找不到 SADIE D2 資產檔案時為 `0`，`st_rt_get_last_status` 會留下 `ST_STATUS_UNAVAILABLE`（"SADIE D2 HRTF asset not found ..."）。

</details>

<details>
<summary><code>st_rt_render_get_spatializer</code> — 讀取目前的空間化方式</summary>

```c
int st_rt_render_get_spatializer(const STRT_Context* context);
```

**用途** — 回傳以 `st_rt_render_set_spatializer` 選擇的空間化方式。

**呼叫方式** — 可隨時呼叫。執行緒：`[any]` — 為 atomic 讀取，可在任意執行緒呼叫且不會阻塞。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STSpatializerType` 值（`0` PANNING / `1` MIT_KEMAR / `2` SADIE_D2_KEMAR）。預設為 `0`。情境為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_limiter_type</code> — 選擇輸出限幅器類型</summary>

```c
void st_rt_render_set_limiter_type(STRT_Context* context, int type);
```

**用途** — 選擇最終混音（主匯流排）最後階段的輸出限幅器演算法。限幅器同時套用於立體聲（耳機·平移）與喇叭配置輸出，在 N 聲道輸出上以對所有聲道套用相同增益的聲道連結方式運作。超過 32 聲道的自訂配置會讓限幅器直通。

**呼叫方式** — 渲染中也可變更。開關限幅器的不是此函式，而是 `STRenderOptions.useLimiter`（預設 `1`，`st_rt_render_set_options`）。變更類型會使限幅器延遲改變，因此請重新讀取 `st_rt_render_get_limiter_latency_samples`。執行緒：`[control]` — 是變更渲染階段的控制執行緒呼叫，不要在音訊回呼中呼叫。true-peak 類型的支援以 `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER`（能力字組 1）確認，前瞻限幅器以 `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`（能力字組 0）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `type` | `STOutputLimiterType`。`0`·`1`·`2` 以外的值以 `LEGACY_ENVELOPE` 處理 |

**`STOutputLimiterType` 值**

| 值 | 行為 |
|---|---|
| `ST_OUTPUT_LIMITER_LEGACY_ENVELOPE`(0) | 無前瞻，2 ms attack，−0.2 dBFS 樣本峰值 + ±1 硬削波（參考用）。延遲 0 |
| `ST_OUTPUT_LIMITER_LOOKAHEAD_PEAK`(1) | 前瞻線性斜坡，−0.2 dBFS 樣本峰值（參考用）。延遲 = 前瞻 |
| `ST_OUTPUT_LIMITER_TRUE_PEAK`(2, 預設) | ITU-R BS.1770-5 4× true-peak 側鏈，上限 −1 dBTP（固定），前瞻（= attack）+ hold 10 ms + 自動 release 60→400 ms。輸出 true-peak 不會超過上限。延遲 = `max(lookahead, 1) + 5` 樣本（預設 132 → 137，3.1 ms） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_get_limiter_type</code> — 讀取目前的輸出限幅器類型</summary>

```c
int st_rt_render_get_limiter_type(const STRT_Context* context);
```

**用途** — 回傳以 `st_rt_render_set_limiter_type` 設定的限幅器類型。

**呼叫方式** — 執行緒：`[control]` — 供控制執行緒使用、無鎖讀取引擎狀態的查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STOutputLimiterType` 值（預設 `2` = `TRUE_PEAK`）。情境為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_limiter_lookahead_samples</code> — 設定限幅器預看長度</summary>

```c
int st_rt_render_set_limiter_lookahead_samples(STRT_Context* context, int samples);
```

**用途** — 以樣本為單位設定 `LOOKAHEAD_PEAK`·`TRUE_PEAK` 限幅器預先查看峰值的長度（= attack）。越長增益變化越平滑，越短輸出延遲越小。

**呼叫方式** — 重新建構預看緩衝區。變更後以 `st_rt_render_get_limiter_latency_samples` 重新讀取實際延遲。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `samples` | 預看樣本數（44.1 kHz 引擎樣本），`[0, ST_OUTPUT_LIMITER_MAX_LOOKAHEAD_SAMPLES]` = `[0, 511]`。預設 `ST_OUTPUT_LIMITER_DEFAULT_LOOKAHEAD_SAMPLES` = 132（3 ms） |

**回傳值** — `1` = 套用 / `0` = 拒絕（超出範圍、情境為 `NULL`）。

</details>

<details>
<summary><code>st_rt_render_get_limiter_lookahead_samples</code> — 讀取限幅器預看長度</summary>

```c
int st_rt_render_get_limiter_lookahead_samples(const STRT_Context* context);
```

**用途** — 回傳目前的限幅器預看樣本數。

**呼叫方式** — 執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 預看樣本數（預設 `132`）。情境為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_render_get_limiter_latency_samples</code> — 讀取限幅器增加的輸出延遲</summary>

```c
int st_rt_render_get_limiter_latency_samples(const STRT_Context* context);
```

**用途** — 以引擎樣本為單位回傳輸出限幅器加到訊號上的固定延遲。用於與影像·輸入事件的同步校正，以及量測時的對齊。

**呼叫方式** — 變更限幅器類型·預看·`useLimiter` 後重新讀取。值遵循以下規則。

- `useLimiter` = 1 · `TRUE_PEAK`: `max(lookahead, 1) + 5`（預設 137 樣本，3.1 ms）
- `useLimiter` = 1 · `LOOKAHEAD_PEAK`: `lookahead`
- `useLimiter` = 1 · `LEGACY_ENVELOPE`: 0
- `useLimiter` = 0: 0

執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 限幅器延遲（樣本）。情境為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_master_gain_db</code> — 設定主輸出增益</summary>

```c
int st_rt_render_set_master_gain_db(STRT_Context* context, float gainDb);
```

**用途** — 渲染輸出級的音量。不會使傳播·IR 結果失效，因此用於在不重新計算 IR 的情況下調整整體音量。位於輸出 EQ 之後·限幅器之前，提升的部分由限幅器承接。與立體聲·喇叭佈局等聲道數無關，套用於所有輸出。

**呼叫方式** — 渲染中隨時可呼叫。值改變時以 20 ms 線性斜坡過渡，0 dB 時不做乘法。若等響度補償的 `followMasterGain` 開啟，補償也會依此增益重新計算（參見 `st_rt_render_set_loudness_compensation`）。執行緒：`[control]` — 只變更輸出級，不在音訊回呼中呼叫。是否支援以 `ST_CAP1_MASTER_GAIN`（能力字組 1）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `gainDb` | 增益 [dB]，`[ST_MASTER_GAIN_MIN_DB, ST_MASTER_GAIN_MAX_DB]` = `[−96, +24]`。預設 0 |

**回傳值** — `1` = 套用 / `0` = 失敗。非有限值·超出範圍時為 `ST_STATUS_INVALID_ARGUMENT`，且不做任何變更。`ST_BACKEND_EXA` 後端情境為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_master_gain_db</code> — 讀取主輸出增益</summary>

```c
float st_rt_render_get_master_gain_db(const STRT_Context* context);
```

**用途** — 回傳已儲存的主增益 [dB]。

**呼叫方式** — 執行緒：`[control]` — 短暫持有 Auralizator 控制鎖並複製儲存值。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 主增益 [dB]（預設 `0`）。情境為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_render_set_loudness_compensation</code> — 設定等響度補償（ISO 226）</summary>

```c
int st_rt_render_set_loudness_compensation(STRT_Context* context, const STLoudnessCompensationDesc* desc);
```

**用途** — 內容以低於平衡基準電平的音量播放時，人耳對低頻·極高頻的感知會減弱。此級以低頻擱架與高頻擱架近似兩條 ISO 226:2003 等響度曲線（基準電平 R、播放電平 P）的形狀差並加以補回。P 大於 R 時則反向削減。引擎不知道絕對 SPL，因此電平由主機以 phon（1 kHz 純音 dB SPL）提供。

**呼叫方式** — 在輸出級（立體聲·雙耳與喇叭佈局皆是）中，位於輸出 EQ 之後、主增益·限幅器之前，依等響度補償 → 虛擬低音的順序套用。不會使傳播·IR 結果失效。`st_rt_create` 之後即 **為開啟**，並跟隨主增益（基準 83 → 播放 70 phon，120 Hz 低頻約 +7.2 dB，高頻 +1.8 dB）。在中介軟體·遊戲混音等由主機掌管輸出音色的整合中，請考慮在建立後立即關閉。關閉期間不觸碰樣本。

開關·數值變更皆無爆音過渡（擱架參數 50 ms smoothstep 斜坡，關閉時在到達 0 dB 後以 5.8 ms 與原訊號交叉淡化）。輸出聲道數改變時（喇叭佈局變更等）會清空歷史，並以與開啟相同的斜坡重新進入。`followMasterGain` 時，音量變更會與主增益斜坡（20 ms）一同移動，但因為是不同指令，起點最多可能錯開一個區塊（兩者各自為斜坡，因此不會不連續）。超過 32 聲道的自訂喇叭佈局不套用。

要保留預設值並僅切換開關，請先以 get 填入，再只改 `enabled` 後 set。

```c
STLoudnessCompensationDesc d = { sizeof d, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &d);
d.enabled = 0;                                  /* 關閉 */
st_rt_render_set_loudness_compensation(ctx, &d);
```

執行緒：`[control]` — 只變更輸出級，在控制執行緒上進行 ISO 226 擬合（數十 µs）。是否支援以 `ST_CAP1_LOUDNESS_COMPENSATION`（能力字組 1）確認。離線程式庫中沒有此函式。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `desc` | 設定。呼叫端須填入 `structSize` / `apiVersion`，`reserved` 必須為 0 |

**結構體** `STLoudnessCompensationDesc`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STLoudnessCompensationDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1。建立後為 1 |
| `followMasterGain` | 0/1。1 時實效播放電平 = `playbackLevelPhon` + 主增益 dB。將 `playbackLevelPhon` 設為「主增益 0 dB 時的播放電平」後，在把主增益當作音量旋鈕的主機中，補償會自動跟隨。建立後為 1 |
| `referenceLevelPhon` | 基準聆聽電平 `[0, 120]` phon，預設 83（電影·音樂母帶處理的基準監聽電平） |
| `playbackLevelPhon` | 實際播放電平 `[0, 120]` phon，預設 70（家用·耳機一般聆聽電平）。與基準相同時補償為 0 |
| `bassScale` | 低頻擱架增益倍率 `[0, 1]`，預設 1（依 ISO 原樣） |
| `trebleScale` | 高頻擱架增益倍率 `[0, 1]`，預設 1。0 時僅補償低頻 |
| `maxShelfGainDb` | 擱架增益絕對值上限 `[0, 40]` dB（於倍率之後套用），預設 15。低頻擱架達到上限時，不只截斷增益，而是使用「擱架達到上限時的播放電平」的形狀（轉角·斜率）。高頻擱架形狀固定，因此只截斷增益 |
| `reserved[5]` | 0 |

ISO 公式有效範圍（20 Hz–4 kHz 為 20–90 phon，5–12.5 kHz 為 20–80 phon）以外的電平，在該頻率以端點電平等響線的形狀評估（R·P 皆超過 80 phon 時高頻補償為 0）。1.25–5 kHz 的 ISO 凹陷（不到數 dB）不以擱架呈現。電平差越大、較低一方的電平越低，近似誤差越大（以中頻為準的 ISO 表最大誤差：83→70 0.5 dB，83→60 0.9 dB，83→40 1.9 dB，90→20 3.7 dB）。

**回傳值** — `1` = 套用 / `0` = 失敗。`NULL`·欄位超出範圍·`reserved` ≠ 0 時為 `ST_STATUS_INVALID_ARGUMENT`，戳記不一致時為 `ST_STATUS_VERSION_MISMATCH`（兩者皆不做任何變更）。`ST_BACKEND_EXA` 後端情境為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_loudness_compensation</code> — 讀取等響度補償設定</summary>

```c
int st_rt_render_get_loudness_compensation(const STRT_Context* context, STLoudnessCompensationDesc* outDesc);
```

**用途** — 回傳已儲存的等響度補償設定（請求值）。若從未 set，則填入建立後的預設值。在保留預設值而只變更部分欄位時先呼叫。

**呼叫方式** — 執行緒：`[control]` — 短暫持有 Auralizator 控制鎖並複製儲存值。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outDesc` | 輸出。呼叫端須填入 `structSize` / `apiVersion`。欄位參見 `st_rt_render_set_loudness_compensation` 條目 |

**回傳值** — `1` = 成功 / `0` = 失敗。`ST_BACKEND_EXA` 後端情境會填入預設值（關閉）。

</details>

<details>
<summary><code>st_rt_render_set_virtual_bass</code> — 設定虛擬低音（諧波合成）</summary>

```c
int st_rt_render_set_virtual_bass(STRT_Context* context, const STVirtualBassDesc* desc);
```

**用途** — 在無法重播低頻的小型單體·耳機上讓人感受到低音的 missing fundamental 效果。分離出截止頻率以下的低頻，產生 2·3·4 次諧波，經帶通修整後加到原訊號上。諧波電平與輸入電平成正比。

**呼叫方式** — 在輸出級中位於等響度補償之後、主增益·限幅器之前。預設為關閉。不會使傳播·IR 結果失效。開關·數值變更以 30 ms smoothstep 斜坡過渡，開啟·截止/頻帶變更時會在混合量為 0 的狀態下讓濾波器穩定 23 ms 後再拉升。輸出聲道數改變時會清空歷史並重新進入。略過喇叭佈局的 LFE 聲道，超過 32 聲道的自訂佈局不套用。

低頻中同時存在多個音調時，會產生頻帶內互調（和音 f1+f2 等）。例如等振幅的 40 Hz + 55 Hz 時，和音 95 Hz 比 2 次諧波大 8.6–10.5 dB。單一音調時只會產生 2·3·4 次諧波（其他成分 −77 dB 以下）。是否套用請以試聽判斷。要以預設值開啟，請先以 get 填入，只把 `enabled` 改為 1 後 set。執行緒：`[control]` — 只變更輸出級，不在音訊回呼中呼叫。是否支援以 `ST_CAP1_VIRTUAL_BASS`（能力字組 1）確認。離線程式庫中沒有此函式。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `desc` | 設定。呼叫端須填入 `structSize` / `apiVersion`，`reserved` 必須為 0 |

**結構體** `STVirtualBassDesc`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STVirtualBassDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1。預設 0 |
| `mode` | `STVirtualBassMode` — `ST_VIRTUAL_BASS_HYBRID`（0，預設）：保留原低頻並加上諧波（可重播低頻的耳機等）/ `ST_VIRTUAL_BASS_HARMONICS_ONLY`（1）：以 `cutoffHz` LR4 HPF 過濾原訊號，只留下諧波（保護小型單體） |
| `cutoffHz` | 低頻分離·HPF 截止 `[40, 160]` Hz，預設 90 |
| `harmonicLowHz` | 諧波頻帶下限 `[20, 1000]` Hz，預設 70 |
| `harmonicHighHz` | 諧波頻帶上限 `[20, 1000]` Hz，必須大於 `harmonicLowHz`。預設 220 |
| `intensity` | 諧波混合強度（線性）`[0, 4]`。1 = 帶通前的諧波能量等於分離出的低頻能量。預設 0.5（−6 dB） — 在 HYBRID 中 2 次諧波聽起來與基頻大小相近的值。沒有基頻的 `HARMONICS_ONLY` 建議 1.0 左右 |
| `reserved[6]` | 0 |

**回傳值** — `1` = 套用 / `0` = 失敗。`NULL`·欄位超出範圍·`reserved` ≠ 0 時為 `ST_STATUS_INVALID_ARGUMENT`，戳記不一致時為 `ST_STATUS_VERSION_MISMATCH`（兩者皆不做任何變更）。`ST_BACKEND_EXA` 後端情境為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_rt_render_get_virtual_bass</code> — 讀取虛擬低音設定</summary>

```c
int st_rt_render_get_virtual_bass(const STRT_Context* context, STVirtualBassDesc* outDesc);
```

**用途** — 回傳已儲存的虛擬低音設定（請求值）。若從未 set，則填入預設值。

**呼叫方式** — 執行緒：`[control]` — 短暫持有 Auralizator 控制鎖並複製儲存值。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outDesc` | 輸出。呼叫端須填入 `structSize` / `apiVersion`。欄位參見 `st_rt_render_set_virtual_bass` 條目 |

**回傳值** — `1` = 成功 / `0` = 失敗。`ST_BACKEND_EXA` 後端情境會填入預設值（關閉）。

</details>

<details>
<summary><code>st_rt_render_set_eq</code> — 套用輸出 9 頻段圖形 EQ（混音器 EQ）</summary>

```c
int st_rt_render_set_eq(STRT_Context* context, const float gainsDb[ST_FREQUENCY_BANDS], int enabled);
```

**用途** — 只套用於渲染輸出的 9 頻段音色控制。不會使傳播·IR 結果失效。輸出 EQ 只有一個，此函式是輸出參數式 EQ（`st_rt_render_set_parametric_eq`）的 **相容檢視** — 在每個引擎頻段中心（63…16k Hz）設定 9 個 Q 1.414 峰值濾波器 + 前級放大 0 dB。

**呼叫方式** — 渲染中隨時可呼叫。此函式與 `st_rt_render_set_parametric_eq` 會改變同一個 EQ 的整個頻段清單，**最後呼叫的一方生效**。此路徑會立即替換係數（無斜坡），在 9 聲道以上的喇叭佈局中則直通。即使只想切換開關，也務必一併傳入 `ST_FREQUENCY_BANDS` 個增益。沒有 9 頻段專用 getter，`st_rt_render_get_parametric_eq` 會將此設定以 9 個 `PEAKING` 頻段回傳。執行緒：`[control]` — 只變更輸出級，不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `gainsDb` | `ST_FREQUENCY_BANDS`（9）個頻段增益 [dB]，順序為 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz。引擎會 clamp 到 `[−24, +24]` dB。`NULL` 時不做任何事 |
| `enabled` | 0 時更新係數但旁通。非 0 時開啟 |

**回傳值** — `1` = 套用 / `0` = 失敗（`gainsDb` 為 `NULL` 等）。

</details>

<details>
<summary><code>st_rt_render_set_parametric_eq</code> — 套用輸出參數式 EQ</summary>

```c
int st_rt_render_set_parametric_eq(STRT_Context* context, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 用於耳機校正（AutoEq 設定檔等）或輸出音色調整的最多 16 頻段參數式 EQ。只套用於渲染輸出，不會使傳播·IR 結果失效。

**呼叫方式** — 渲染中隨時可呼叫，變更時以 20 ms 交叉淡化過渡（從 9 頻段檢視切換過來時亦同）。套用位置在渲染鏈末端、主增益之前（立體聲·雙耳），喇叭輸出時則在解碼·距離對齊之後。所有輸出聲道（含喇叭 LFE）套用相同濾波器 — 等同套用於聲學總和，因此無論低頻如何在主聲道·LFE 之間分配，結果音色都相同。各聲道不同的校正請使用 `st_rt_render_set_speaker_channel_eq`。最多處理 64 聲道。與 `st_rt_render_set_eq` 是同一個 EQ，因此最後呼叫的 setter 生效。AutoEq 文字以 `st_rt_render_parse_autoeq_parametric` 轉為頻段陣列後傳入。執行緒：`[control]` — 只變更輸出級，不在音訊回呼中呼叫。是否支援以 `ST_CAP1_OUTPUT_PARAMETRIC_EQ`（能力字組 1）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `bands` | `bandCount` 個頻段的陣列。只在呼叫期間讀取。`bandCount` = 0 時可為 `NULL` |
| `bandCount` | 頻段數 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` = `[0, 16]` |
| `preampDb` | 前級放大 [dB]，clamp 到 `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[−48, +12]`。主要用途是防止削波的負值，提升則交由主增益 |
| `enabled` | 0 時儲存清單但直通 |

**結構體** `STParametricEqBand`（32 bytes，為陣列元素因此無版本戳記）

| 欄位 | 說明 |
|---|---|
| `type` | `STParametricEqType` — `PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 此頻段為恆等（略過），其他 = 開啟 |
| `frequencyHz` | 中心（PEAKING·NOTCH）或轉角（擱架中點·LP·HP）頻率。clamp 到 `[20, min(20000, 0.49·Fs)]` Hz |
| `gainDb` | 僅 PEAKING·LOW_SHELF·HIGH_SHELF 使用（LP·HP·NOTCH 只儲存）。clamp 到 `[−24, +24]` dB |
| `q` | `[0.1, 30]`，擱架 clamp 到 `[0.1, 3]`（Q 大的擱架會在轉角處產生大的共振峰） |
| `reserved[3]` | 必須為 0（否則拒絕） |

濾波器定義（輸出 EQ·音源 EQ·喇叭聲道 EQ 共通）：每個頻段為一個 RBJ Audio EQ Cookbook 二階節，擱架為使用 Q 的 RBJ 擱架（與 AutoEq 相同）。Fs 為引擎內部取樣率 44100 Hz，係數·運算為 double Direct Form I。鏈為前級放大 → 頻段 0..count−1 串聯。`enabled` = 0 的頻段與 \|gain\| ≤ 1e-4 dB 的 PEAKING·擱架為精確恆等，整體關閉或無效果時（全頻段恆等 + 前級放大 0 dB）不觸碰樣本。值改變時，舊設定與新設定並行執行 20 ms 並對輸出做交叉淡化（不是係數內插，因此無爆音·發散），期間若再次變更，只等待最新的一個值再接著過渡。有限值會 clamp 到上述範圍，getter 回傳 clamp 後的實效值。

**回傳值** — `1` = 套用 / `0` = 失敗。`0` 時的 `st_rt_get_last_status`：

- `ST_STATUS_INVALID_ARGUMENT` — `bandCount` 超出範圍、`bands` 為 `NULL`（`bandCount` > 0）、非有限值、未知 `type`、`reserved` ≠ 0。不做任何變更。
- `ST_STATUS_UNAVAILABLE` — `ST_BACKEND_EXA` 後端情境

</details>

<details>
<summary><code>st_rt_render_get_parametric_eq</code> — 讀取輸出 EQ 頻段清單</summary>

```c
int st_rt_render_get_parametric_eq(const STRT_Context* context, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 回傳目前輸出 EQ 的頻段清單（clamp 後的實效值）·前級放大·開啟狀態。以 `st_rt_render_set_eq` 套用的設定也會讀成 9 個 `PEAKING` 頻段（Q 1.414）。

**呼叫方式** — 不知道大小時，以 `outBands` 為 `NULL` 呼叫只取得 `outBandCount` 後再次呼叫。給予 `ST_PARAMETRIC_EQ_MAX_BANDS`（16）個容量則一定放得下。執行緒：`[control]` — 持有 Auralizator 控制鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outBands` | 頻段輸出陣列。`NULL` 時為大小查詢（不寫入頻段）。欄位參見 `st_rt_render_set_parametric_eq` 條目 |
| `bandCapacity` | `outBands` 容量（元素數），0 以上 |
| `outBandCount` | 頻段數輸出。`NULL` 時略過 |
| `outPreampDb` | 前級放大 [dB] 輸出。`NULL` 時略過 |
| `outEnabled` | 開啟（0/1）輸出。`NULL` 時略過 |

**回傳值** — `1` = 成功（含大小查詢）/ `0` = 失敗。`0` 時的 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（`bandCapacity < 0`）/ `ST_STATUS_BUFFER_TOO_SMALL`（容量小於頻段數 — 此時仍會寫入數量·前級放大·開啟狀態）/ `ST_STATUS_UNAVAILABLE`（`ST_BACKEND_EXA` 後端）。

</details>

<details>
<summary><code>st_rt_render_parse_autoeq_parametric</code> — 將 AutoEq ParametricEQ.txt 剖析為頻段陣列</summary>

```c
int32_t st_rt_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**用途** — 將 AutoEq 的 `ParametricEQ.txt`（Equalizer APO 語法的子集）文字轉換為 `STParametricEqBand` 陣列與前級放大。結果可直接傳入 `st_rt_render_set_parametric_eq`（開啟）、`st_rt_source_set_parametric_eq`、`st_rt_render_set_speaker_channel_eq`。

**呼叫方式** — 不需要情境，沒有全域狀態·配置。與離線程式庫的 `st_off_render_parse_autoeq_parametric` 為相同實作·相同約定。執行緒：`[any]` — 在任何執行緒呼叫都不會阻塞。是否支援包含在 `ST_CAP1_OUTPUT_PARAMETRIC_EQ`（能力字組 1）中。

接受的語法（不分大小寫）：

```text
Preamp: -6.2 dB
Filter 1: ON LSC Fc 105 Hz Gain 6.8 dB Q 0.70
```

- `Preamp: <數值> [dB]` — 有多行時以 dB 相加。
- `Filter[ <編號>]: ON|OFF <類型> Fc <數值> [Hz] [Gain <數值> [dB]] [Q <數值>]` — 類型為 `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`。省略 Q 時擱架·LP·HP 為 0.7071，PK·NO 的 Q 為必填。Gain 對 PK·擱架為必填。`OFF` 濾波器會成為 `enabled` 0 的頻段並計入頻段數。
- 忽略空行與 `#` 之後（行尾註解），接受 UTF-8 BOM·CRLF。數字的讀取與地區設定無關。
- 拒絕：其他指令（`Channel`·`Device`·`GraphicEQ`·`Include` 等）、`BP`·`AP`·`IIR`、擱架斜率格式（`LS 6dB`）、`BW Oct`、超出範圍的值（Fc `[20, 20000]` Hz · Gain ±24 dB · Q `[0.1, 30]`，擱架 Q `[0.1, 3]` · 前級放大最終總和 `[−48, +12]` dB）、註解以外的非 ASCII、指數表示法。剖析器不做 clamp 而是拒絕。

| 參數 | 說明 |
|---|---|
| `utf8Text` | NUL 結尾的 UTF-8 文字。必填 |
| `outBands` | 頻段輸出陣列。`bandCapacity` > 0 時必填。`reserved` 會填 0 |
| `bandCapacity` | `outBands` 容量，0 以上 |
| `outBandCount` | 頻段數輸出。必填 |
| `outPreampDb` | 前級放大 [dB] 輸出。必填 |
| `outErrorLine` | 失敗時的錯誤行號（從 1 開始，與行無關的錯誤為 0 — 前級放大最終總和超出範圍在檔案結尾判定因此為 0，若有行級錯誤則優先回報該錯誤）。允許 `NULL` |
| `outErrorMessage` | 失敗原因（NUL 結尾英文，依容量截斷）。允許 `NULL` |
| `errorMessageCapacity` | `outErrorMessage` 位元組容量 |

**回傳值** — `STAutoEqParseStatus`。成功時寫入 `outBands[0..*outBandCount)` 與 `*outPreampDb`，失敗時 `*outBandCount` = 0 · `*outPreampDb` = 0。因為沒有情境，不會留在 `st_rt_get_last_status` 中。

| 值 | 意義 |
|---|---|
| `ST_AUTOEQ_PARSE_OK`(0) | 成功 |
| `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`(1) | `utf8Text`·`outBandCount`·`outPreampDb` 為 `NULL`、`bandCapacity < 0`、`outBands` 為 `NULL` 但 `bandCapacity > 0` |
| `ST_AUTOEQ_PARSE_SYNTAX`(2) | 行格式錯誤（非數字·缺少必填欄位·重複·未知權杖） |
| `ST_AUTOEQ_PARSE_UNSUPPORTED`(3) | 不支援的指令·濾波器類型·斜率·BW 格式 |
| `ST_AUTOEQ_PARSE_OUT_OF_RANGE`(4) | 超出範圍的值 |
| `ST_AUTOEQ_PARSE_TOO_MANY_BANDS`(5) | 超過 `ST_PARAMETRIC_EQ_MAX_BANDS` 或 `bandCapacity` |
| `ST_AUTOEQ_PARSE_EMPTY`(6) | 沒有任何 `Preamp`·`Filter` 行 |

</details>

<details>
<summary><code>st_rt_render_set_options</code> — 變更渲染選項（路徑成分·空間化·限幅器閘門）</summary>

```c
void st_rt_render_set_options(STRT_Context* context, const STRenderOptions* options);
```

**用途** — 一次變更聽覺化階段的閘門。可個別開關直達聲·透射·反射·繞射·殘響成分進行聆聽比較（A/B），或選擇早期反射渲染路徑（exact 物件 / hybrid HOA bed）、空間化·HRTF、路徑淡化、輸出限幅器。傳播與 IR 轉換仍持續產生相同資料，此選項只過濾渲染合成階段。

**呼叫方式** — 渲染中也可呼叫。若只想變更部分，請以 `st_rt_render_get_options` 取得目前值，修改欄位後傳入。喇叭輸出啟用期間，佈局掌管 early 路徑（全 Ambisonics）·`useSpatialization` = 1·`useHrtf` = 0，因此這些值會保留，只套用其餘閘門。關閉喇叭後，`reserved0` 會再次限制在 0/1 範圍。1 次散射閘門（`st_rt_render_set_diffuse_rain_enabled`）是此結構體以外的值，此呼叫不會變更它。執行緒：`[control]` — 包含 IR 策略掛鉤的控制執行緒呼叫，不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `options` | 新選項。`NULL` 時不做任何事 |

**結構體** `STRenderOptions`（無版本戳記的 `int` 欄位 12 個，0 = 關閉 / 非 0 = 開啟）

| 欄位 | 預設 | 說明 |
|---|---|---|
| `renderDirect` | 1 | 直達聲渲染 |
| `renderTransmission` | 1 | 透射聲渲染 |
| `renderReflection` | 1 | 反射聲渲染 |
| `renderDiffraction` | 1 | 繞射聲渲染 |
| `renderLateReverb` | 1 | 後期殘響（FDN 槽）。0 只關閉槽並保留 1 次散射 |
| `useDoppler` | 1 | 可變延遲都卜勒（音高）。在即時中會被忽略並恆為 1 — 傳入 0 也會開啟，get 回傳 1。移動音源的輻射增益是另一個開關（`st_rt_set_doppler_gain_mode`） |
| `usePathFade` | 1 | 路徑淡化。長度為 `st_rt_render_set_path_fade_time` |
| `reserved0` | 1 | 早期反射渲染路徑（與 `STEarlySpatialMode` 相同編號）。`0` = Objects：所有早期路徑以 exact 物件個別渲染（渲染成本隨路徑數增加）。`1` = Hybrid：聆聽者全域預算內的 exact 物件 + 其餘早期反射·1 次散射為 HOA3 bed。即時遊戲整合建議 1。超出範圍的值會 clamp 到 `[0, 1]`。喇叭輸出期間可能讀到代表佈局專用路徑的其他值 |
| `useSpatialization` | 1 | 使用空間化（聲像·HRIR） |
| `useHrtf` | 0 | HRTF 雙耳空間化。`st_rt_render_start` 的 `useHrtf` 引數在渲染開始時決定此值 |
| `useLimiter` | 1 | 開啟輸出限幅器。類型為 `st_rt_render_set_limiter_type` |
| `outputBandPressure` | 0 | 保留欄位。在即時中恆為 0 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_get_options</code> — 讀取目前的渲染選項</summary>

```c
void st_rt_render_get_options(const STRT_Context* context, STRenderOptions* outOptions);
```

**用途** — 填入目前套用的 `STRenderOptions`。用於只變更部分欄位前先讀取。

**呼叫方式** — 執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outOptions` | 輸出。`NULL` 時不做任何事。欄位參見 `st_rt_render_set_options` 條目 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_set_diffuse_rain_enabled</code> — 開關 1 次散射（diffuse rain）渲染</summary>

```c
void st_rt_render_set_diffuse_rain_enabled(STRT_Context* context, int enabled);
```

**用途** — 1 次散射是與直達聲·反射聲·繞射聲·殘響（`STRenderOptions` 的 `render*`）並列的獨立渲染成分。以此閘門只開關 1 次散射進行聆聽比較。關閉時只移除 hybrid 路徑的 rain bed 單元與 Objects 路徑的 rain RIR 單元，FDN 尾音不變。反之，`renderLateReverb` = 0 只關閉槽並保留 1 次散射。

**呼叫方式** — 渲染中也可呼叫，不重新轉換 IR，只重新進行渲染準備。這是 `STRenderOptions` 以外的值，因此 `st_rt_render_set_options` 與喇叭佈局切換不會變更此值。關閉聲音追蹤（`st_rt_render_set_sound_tracing_enabled(…, 0)`）時 1 次散射也一併關閉。預設 1。執行緒：`[control]` — 重新發佈渲染準備的控制執行緒呼叫。是否支援以 `ST_CAP1_RENDER_DIFFUSE_RAIN_GATE`（能力字組 1）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | 0 = 關閉 1 次散射，非 0 = 開啟（預設） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_is_diffuse_rain_enabled</code> — 讀取 1 次散射渲染閘門狀態</summary>

```c
int st_rt_render_is_diffuse_rain_enabled(const STRT_Context* context);
```

**用途** — 回傳以 `st_rt_render_set_diffuse_rain_enabled` 設定的值。

**呼叫方式** — 執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `1` = 開啟（預設）/ `0` = 關閉。沒有情境時為 `-1`。

</details>

<details>
<summary><code>st_rt_render_set_sound_tracing_enabled</code> — 開關聲音追蹤效果（基準線比較）</summary>

```c
void st_rt_render_set_sound_tracing_enabled(STRT_Context* context, int enabled);
```

**用途** — 用於與關閉聲音追蹤效果的「距離衰減 + 聲像」基準線進行比較的切換。`enabled` = 0 並非獨立的旁通渲染器 — 仍執行相同的追蹤管線，但關閉反射·繞射·殘響·1 次散射路徑與空氣吸收·傳播延遲·直達聲遮蔽，只保留距離衰減與空間化。空間化方式（`st_rt_render_set_spatializer`）不變。

**呼叫方式** — 渲染中也可呼叫。關閉狀態下場景 setter·傳播工作執行緒·IR 轉換·發佈仍持續運作 — 這不是停止排程器或資料幫浦的功能，要節省 CPU 請使用 `st_rt_idle`。因此即使在關閉狀態下，也要在第一個 IR 安裝後才會發聲。預設為開啟。執行緒：`[control]` — 會多次持有場景鎖，因此不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | 0 = 基準線（僅距離衰減 + 空間化），非 0 = 開啟聲音追蹤（預設） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_is_sound_tracing_enabled</code> — 讀取聲音追蹤效果是否開啟</summary>

```c
int st_rt_render_is_sound_tracing_enabled(const STRT_Context* context);
```

**用途** — 回傳以 `st_rt_render_set_sound_tracing_enabled` 設定的值。

**呼叫方式** — 執行緒：`[any]` — atomic 讀取，在任何執行緒呼叫都不會阻塞。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `1` = 開啟（預設）/ `0` = 關閉或情境為 `NULL`。

</details>

<details>
<summary><code>st_rt_render_set_path_fade_time</code> — 設定路徑淡化時間</summary>

```c
void st_rt_render_set_path_fade_time(STRT_Context* context, float seconds);
```

**用途** — 設定 IR 更新導致路徑改變時，為了無爆音過渡而套用的淡化長度（秒）。在音源·聆聽者移動的場景中，調整過渡平滑度與反應性之間的平衡。在 `STRenderOptions.usePathFade` 開啟時（預設）使用。

**呼叫方式** — 渲染中也可呼叫。時間引數是與場景單位無關的秒。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `seconds` | 淡化長度 [s]，正的有限值。預設 0.05 s。0 以下·非有限值會被忽略 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_get_path_fade_time</code> — 讀取路徑淡化時間</summary>

```c
float st_rt_render_get_path_fade_time(const STRT_Context* context);
```

**用途** — 回傳目前的路徑淡化時間（秒）。

**呼叫方式** — 執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 淡化時間 [s]（預設 `0.05`）。情境為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_render_set_max_delay_seconds</code> — 設定渲染延遲環的最大延遲</summary>

```c
int st_rt_render_set_max_delay_seconds(STRT_Context* context, float seconds);
```

**用途** — 設定渲染器可表示的最大傳播延遲（秒）。延遲超過此上限的 exact 路徑會從渲染中移除，後期殘響由 FDN 覆蓋。需要大型室內·戶外等較晚到達的路徑時調大，要減少記憶體時調小。延遲環記憶體會依每個渲染中的音源以 9 頻段 × 環長度增加。在音源記憶體預算（`STMemoryBudget`）中，此值是各音源延遲環的上限。

**呼叫方式** — 會重新配置延遲環，因此最好在建立大量音源之前、開始渲染之前設定。建立時的值也可以透過 `STRT_CreateOptions.maxDelaySeconds`（0 = 預設 2.0 s）指定。執行緒：`[control, blocking]` — 包含延遲環重新配置的長區間，不在遊戲迴圈·音訊執行緒中呼叫。是否支援以 `ST_CAP_RUNTIME_DELAY_RESIZE`（能力字組 0）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `seconds` | 最大延遲 [s]，約 `0.012`（引擎區塊 512 + 內插餘裕 8 樣本）~ `60`。預設 2.0。與場景單位無關的秒 |

**回傳值** — `1` = 套用（相同值時照樣為 1）/ `0` = 拒絕（超出範圍·非有限值、情境為 `NULL`）。

</details>

<details>
<summary><code>st_rt_render_get_max_delay_seconds</code> — 讀取渲染延遲環的最大延遲</summary>

```c
float st_rt_render_get_max_delay_seconds(const STRT_Context* context);
```

**用途** — 回傳目前的最大延遲（秒）。

**呼叫方式** — 執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 最大延遲 [s]（預設 `2.0`）。情境為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_render_get_ring_buffer_samples</code> — 讀取延遲環長度（樣本）</summary>

```c
int st_rt_render_get_ring_buffer_samples(const STRT_Context* context);
```

**用途** — 以引擎樣本（44.1 kHz）為單位回傳對應目前最大延遲的渲染延遲環長度。為最大延遲 × 44100 加上渲染區塊（512）與內插餘裕的值，用於記憶體估算。

**呼叫方式** — 在 `st_rt_render_set_max_delay_seconds` 之後重新讀取。執行緒：`[control]` — 不持鎖讀取引擎狀態的控制執行緒查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 環長度（樣本）。情境為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_render_start</code> — 開始音訊渲染（依輸出模式）</summary>

```c
int st_rt_render_start(STRT_Context* context, int useHrtf);
```

**用途** — 開始渲染輸出並決定輸出形式（耳機雙耳 / 立體聲聲像 / 喇叭佈局）。啟動什麼取決於建立選項 `STRT_CreateOptions.renderOutputMode`。

| `renderOutputMode` | `st_rt_render_start` 所做的事 | 取用輸出的一方 |
|---|---|---|
| `ST_RT_RENDER_OUTPUT_DEVICE`(0, 預設) | 開啟 OS 音訊裝置並啟動引擎渲染執行緒 | 引擎直接輸出到裝置 |
| `ST_RT_RENDER_OUTPUT_HOST_PULL`(1) | **不建立執行緒也不建立裝置**，只設定雙耳/喇叭選擇與「允許渲染」旗標。pull 緩衝區與重新取樣器在此配置 | 主機在自己的音訊執行緒上呼叫 `st_rt_render_process` |
| `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED`(2) | 啟動引擎渲染執行緒填充輸出環（容量 8 區塊·目標 3 區塊）。沒有裝置 | 主機以 `st_rt_render_process` 只從環中複製 |

**呼叫方式** — 在準備好場景·音源·聆聽者後呼叫。HOST_PULL 系列也 **必須呼叫** — 呼叫前 `st_rt_render_process` 回傳 0 幀。若要使用 HRIR 空間化，先以 `st_rt_render_set_spatializer` 選擇資料集，再以 `useHrtf` = 1 開始。若已設定喇叭佈局（`st_rt_render_set_speaker_layout[_custom]`）並以 `useHrtf` = 0 開始，則以該佈局的 N 聲道輸出，喇叭輸出的啟用判定（`st_rt_render_get_speaker_channels`）在此呼叫之後成立。在引擎閒置中（`st_rt_idle`）開始時，會以 IDLE 狀態開始。執行緒：`[control, blocking]` — DEVICE 模式包含裝置·執行緒啟動的長區間，不在遊戲迴圈·音訊執行緒中呼叫。HOST_PULL 支援以 `ST_CAP_HOST_PULL_RENDER`、BUFFERED 以 `ST_CAP_HOST_PULL_BUFFERED`（能力字組 0）確認。

執行緒數（PIPELINED 排程器，N = `max(3, 計算執行緒預算)`）：DEVICE = 計算工作執行緒 N−1 + 渲染 1 + 裝置 1，HOST_PULL = 計算工作執行緒 N−1（渲染·裝置 0），HOST_PULL_BUFFERED = 計算工作執行緒 N−1 + 渲染 1（裝置 0）。有檔案輸入時會再加 1 個解碼器執行緒。實測以 `st_rt_get_thread_inventory` 查看。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `useHrtf` | 1 = HRTF 雙耳 2 聲道（以 `st_rt_render_set_spatializer` 選擇的 HRIR）。0 = 立體聲聲像 2 聲道，或已設定喇叭佈局時為該 N 聲道。`STRenderOptions.useHrtf` 也由此值決定 |

**回傳值** — `1` = 已開始（DEVICE 模式下已在執行時照樣為 1）/ `0` = 失敗（情境為 `NULL`、裝置啟動失敗等）。

</details>

<details>
<summary><code>st_rt_render_stop</code> — 停止音訊渲染</summary>

```c
void st_rt_render_stop(STRT_Context* context);
```

**用途** — 停止以 `st_rt_render_start` 開始的渲染。

**呼叫方式** — 各模式的行為：

- DEVICE：停止裝置並 join 渲染執行緒。
- HOST_PULL：降下「允許渲染」旗標並清空結轉 FIFO（使下一次 start 不會送出殘留的尾巴）。之後 `st_rt_render_process` 回傳 0。
- HOST_PULL_BUFFERED：停止渲染執行緒並丟棄輸出環。環中的部分已計入喇叭組的 `contentFrame` 但不會被聽到，因此要對齊組的位置時，請在丟棄前讀取 `contentFrame − latencyFrames`（已聽到的位置），並以 `st_rt_speaker_set_relocate` 重新設定。

與 `st_rt_render_process` 同時呼叫也安全 — 引擎會降下允許渲染，等待進行中的 `st_rt_render_process` 退出後再停止。長時間閒置時若要連裝置一起釋放，請在 `st_rt_get_idle_state` 成為 IDLE 後呼叫此函式。執行緒：`[control, blocking]` — 包含裝置停止·執行緒 join，不在遊戲迴圈·音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_is_running</code> — 讀取渲染是否正在執行</summary>

```c
int st_rt_render_is_running(const STRT_Context* context);
```

**用途** — 回傳渲染狀態。與輸出模式無關，意義一致 — DEVICE 看裝置是否在執行，HOST_PULL 看的不是裝置而是「允許渲染」旗標（`st_rt_render_start` 之後·`st_rt_render_stop` 之前）。

**呼叫方式** — 執行緒：`[control]` — 控制執行緒用查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `1` = 渲染中 / `0` = 停止或情境為 `NULL`。

</details>

<details>
<summary><code>st_rt_render_process</code> — 在主機音訊執行緒上取得輸出區塊（pull 渲染）</summary>

```c
int st_rt_render_process(STRT_Context* context, float* interleavedOut, int frames);
```

**用途** — HOST_PULL 系列輸出模式的進入點。在引擎輸出須經過主機音訊圖的整合中 — 遊戲引擎子混音效果、音訊擷取·錄製管線等 — 由主機在自己的音訊執行緒上取得區塊。HOST_PULL 在此呼叫執行緒上渲染，HOST_PULL_BUFFERED 只從引擎渲染執行緒填充的環中複製（主機回呼成本 ≈ memcpy，抖動由環吸收）。三種輸出模式都使用相同的區塊函式，因此聲音相同。

**呼叫方式** — 在 `st_rt_render_start` 之後，於每次主機音訊回呼時呼叫。執行緒：`[audio]` — 在主機音訊執行緒（MMCSS/HIGHEST）上呼叫也安全。不會新增鎖·配置·系統呼叫（緩衝區與重新取樣器在 `st_rt_render_start` 中配置，IR 採用為指標替換），也不觸碰呼叫執行緒的優先順序·affinity。只有 FTZ/DAZ 在此呼叫區間內開啟後再還原。

- **聲道數** — 雙耳·立體聲為 2，喇叭佈局啟用時為 `st_rt_render_get_speaker_channels()` 的值。該函式回傳 0 時輸出為 **2 聲道** — 不要把 0 當作聲道數。
- **佈局切換** — 渲染中呼叫 `st_rt_render_set_speaker_layout[_custom]` / `st_rt_render_disable_speaker_output` 時，pull 輸出會重新建構（聲道數·引擎區塊·結轉 FIFO·輸出重新取樣器）。切換與此函式同時呼叫也安全 — 引擎會降下允許渲染，等待進行中的呼叫退出後再變更（`st_rt_render_start` / `stop` 亦同）。落在切換視窗內的呼叫會回傳 **0 幀**，該區塊由主機作為靜音處理。切換後重新讀取 `st_rt_render_get_speaker_channels()`，並以該寬度配置緩衝區。
- **欠載** — 音源串流填入的量少於請求時，該音源以靜音填充並累加到 `STStreamStatus.underrunFrames`。**絕不會 stall。** 在 BUFFERED 中，若每區塊渲染成本持續超過區塊時間（11.61 ms），環也無法擋住，該欠載會記錄在引擎環計數器中並以靜音填充。
- **任意 `frames`** — 內部以 512 幀引擎區塊渲染，剩餘部分放入結轉 FIFO。主機區塊不是 512 的倍數時（例：48 kHz 下 1024 = 941.6 引擎幀）也不會 stall，但 FIFO 中的剩餘部分就是相應的延遲。延遲上限為 1 個引擎區塊 + 重新取樣器延遲，主機區塊為 512 的倍數時結轉殘量固定為 0（參見 `st_rt_render_get_latency_frames`）。
- **取樣率** — `frames` 以 `STRT_CreateOptions.hostSampleRate`（0 時為引擎取樣率 44100）為單位。非 0 時由引擎進行輸出端轉換（BUFFERED 在渲染執行緒上轉換）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `interleavedOut` | 輸出緩衝區。interleaved float，須能容納 `frames × 聲道數` 個 |
| `frames` | 請求幀數（主機取樣率），1 以上 |

**回傳值** — 實際寫入的幀數（正常為 `frames`）。部分回傳（`0 < 回傳值 < frames`）時其餘部分已填入靜音。`0` 的情況與 `st_rt_get_last_status`：

| 情況 | 狀態 |
|---|---|
| 情境·緩衝區為 `NULL`、`frames` ≤ 0 | `ST_STATUS_INVALID_ARGUMENT` |
| DEVICE 模式情境 | `ST_STATUS_UNAVAILABLE` |
| `st_rt_render_start` 之前 | `ST_STATUS_UNAVAILABLE` |
| 佈局切換視窗 | 0 幀（作為靜音處理） |

</details>

<details>
<summary><code>st_rt_render_get_latency_frames</code> — 讀取 pull 輸出級持有的延遲</summary>

```c
int st_rt_render_get_latency_frames(const STRT_Context* context);
```

**用途** — 以主機幀回傳 pull 路徑 **輸出級** 目前持有的延遲。用於 A/V 同步校正。

延遲 = 結轉 FIFO 殘量 + 輸出重新取樣器延遲 + 輸入重新取樣器固定延遲

**呼叫方式** — 這不是固定值，而是 **呼叫當下的快照**。請求 `frames` 不是 512 的倍數時，每次呼叫會隨結轉殘量（相當於 0..511 引擎幀）浮動，上限為 1 個引擎區塊 + 重新取樣器延遲。用於 A/V 同步時，在區塊處理 **之前** 讀取一次。`hostSampleRate` = 0（無轉換）時也有結轉 FIFO，因此可能不為 0。BUFFERED 模式下為環中累積的幀（主機取樣率）+ 轉換器延遲，上限約為 3 個引擎區塊。執行緒：`[any]` — 在任何執行緒呼叫都不會阻塞。

此值只計算輸出級的部分。「現在推入的輸入幀會在幾幀後輸出」的完整答案是此值 + `STStreamStatus.queuedFrames` + 引擎 DSP 的固定延遲（限幅器延遲等，設定相同時為常數）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 延遲（主機幀）。DEVICE 模式下恆為 `0`。

</details>

<details>
<summary><code>st_rt_render_get_process_stats</code> — 讀取最後一個渲染區塊的各階段時間</summary>

```c
int st_rt_render_get_process_stats(const STRT_Context* context, STProcessStats* outStats);
```

**用途** — 回傳最後完成的一個 512 幀渲染區塊的各階段純運算時間（µs）與 tap 數。供主機在不查看引擎內部的情況下判斷「渲染為何繁重」。三種輸出模式都是相同的區塊函式，因此值的意義相同（HOST_PULL 為在主機回呼內量測的值）。

**呼叫方式** — 渲染中隨時、在任何執行緒都可呼叫。執行緒：`[any]` — seqlock 快照（逐欄位 atomic，最多重試 8 次），不會阻塞。是否支援以 `ST_CAP_PROCESS_STATS`（能力字組 0）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outStats` | 輸出。呼叫端須填入 `structSize` / `apiVersion` |

**結構體** `STProcessStats`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STProcessStats)` / `ST_ABI_VERSION` |
| `blockSequence` | 每個區塊 +1。0 = 尚未執行過區塊（靜音預捲期間也為 0） |
| `sourceInputUs` | 音源輸入讀取 + 9 頻段分頻 + 頻段延遲環寫入（音源合計） |
| `exactTapsUs` | exact 路徑 tap 渲染（HRIR 匯流排累加或立體聲聲像，音源合計） |
| `bedUs` | early bed — 各音源 send 匯流排合計 + 合併 bed 摺積 |
| `sendUs` | 殘響 send — 各音源頻段匯流排合計 + 聆聽者全域 send tap 渲染 |
| `lateUs` | FDN16 後期殘響 |
| `outputUs` | 其餘 — HRTF 頻譜合成·HOA 解碼·EQ·限幅器·模式淡化 |
| `totalUs` | 整個區塊（與 `STTiming.auralProcessMs` 相同的區間）。六個階段的合計等於或略小於此值 |
| `activeSources` | 有輸入的音源數 |
| `exactTaps` | 該區塊實際渲染的 exact tap 數（音源合計） |
| `sendTaps` | 聆聽者全域 send tap 數 — 與音源數無關，上限為時間 bin 數 |
| `reserved[8]` | 保留 |

**回傳值** — `1` = 成功 / `0` = 失敗。`NULL`·戳記不一致為 `ST_STATUS_VERSION_MISMATCH`，引擎未初始化為 `ST_STATUS_INVALID_CONTEXT`，快照失敗為 `ST_STATUS_UNAVAILABLE`（`outStats` 不變）。

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout</code> — 以預設喇叭佈局輸出</summary>

```c
int st_rt_render_set_speaker_layout(STRT_Context* context, int preset);
```

**用途** — 以實際喇叭配置（2.0~7.1）取代耳機雙耳，輸出 N 聲道。喇叭輸出時，佈局掌管全 Ambisonics early 路徑·空間化開啟·HRTF 關閉（參見 `st_rt_render_set_options`）。

**呼叫方式** — 通常在 `st_rt_render_start(context, 0)` 之前設定。渲染中呼叫時，會以 stop → 套用 → start 重新啟動音訊裝置，裝置拒絕 N 聲道格式時會降級為立體聲重試一次。HOST_PULL 系列中 pull 輸出會重新建構，期間 `st_rt_render_process` 回傳 0 幀。呼叫後以 `st_rt_render_get_speaker_channels()` 重新讀取實際輸出寬度。每次設定佈局時（即使是相同佈局）喇叭聲道 EQ 都會全部清空，因此聲道 EQ 請在設定佈局之後設定。執行緒：`[control, blocking]` — 包含裝置重新啟動，不在遊戲迴圈·音訊執行緒中呼叫。

聲道順序遵循 WAVEFORMATEXTENSIBLE 標準順序（FL FR FC LFE BL BR SL SR 中略過佈局沒有的聲道），方向慣例與引擎全域相同（azimuth 正前方 0° · 右方 +90°，elevation 向上為 +）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `preset` | `0` = 2.0 / `1` = 2.1 / `2` = 4.1 / `3` = 5.1 / `4` = 7.1 / `5` = 筆電近場 2.0 |

`5`（LaptopNearfield20，"MacBook Pro 16-inch reference"）恰為 2 個 PCM 聲道，與 `0` 的差別只有聆聽幾何（半角 30° → 15.642°）。不觸碰裝置·OS 掌管的內建喇叭處理（低音單體·寬立體聲·空間音訊 DSP 等）。

**回傳值** — `1` = 套用 / `0` = 失敗。`preset` 超出範圍時不做任何事並回傳 `0`。

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout_custom</code> — 以任意喇叭配置輸出</summary>

```c
int st_rt_render_set_speaker_layout_custom(STRT_Context* context, const float* azimuthDegrees, const float* elevationDegrees, const unsigned char* isLfe, const float* gainTrim, const float* distanceMeters, int channelCount);
```

**用途** — 以各聲道的方向·是否 LFE·微調·距離直接定義預設中沒有的喇叭配置（穹頂·不規則陣列等）。提供距離時，以最遠的喇叭為基準對齊延遲·1/r 電平，校正喇叭距離不同的安裝。

**呼叫方式** — 呼叫時機·重新啟動·聲道 EQ 初始化·`st_rt_render_get_speaker_channels` 重新確認與 `st_rt_render_set_speaker_layout` 相同。聲道順序為陣列順序，方向慣例與引擎全域相同（azimuth 正前方 0° · 右方 +90°，elevation 向上為 +）。限幅器·等響度補償·虛擬低音最多套用到 32 聲道，輸出參數式 EQ·喇叭聲道 EQ 最多套用到 64 聲道。執行緒：`[control, blocking]` — 包含裝置重新啟動，不在遊戲迴圈·音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `azimuthDegrees` | 各聲道方位角 [°]，`channelCount` 個。必填 |
| `elevationDegrees` | 各聲道仰角 [°]，`channelCount` 個。必填 |
| `isLfe` | 各聲道是否 LFE（0/1），`channelCount` 個。必填 |
| `gainTrim` | 各聲道線性微調，`channelCount` 個。`NULL` 時全為 1.0 |
| `distanceMeters` | 各聲道喇叭距離 [m]，`channelCount` 個（不是場景單位而是公尺）。非 `NULL` 且所有非 LFE 聲道皆為正數時，在渲染輸出級以最遠喇叭為基準對齊延遲·1/r 電平。`NULL` 時不對齊 |
| `channelCount` | 聲道數，1 以上 |

**回傳值** — `1` = 套用 / `0` = 失敗（`azimuthDegrees`·`elevationDegrees`·`isLfe` 為 `NULL` 或 `channelCount` ≤ 0 等）。

</details>

<details>
<summary><code>st_rt_render_disable_speaker_output</code> — 關閉喇叭輸出並回到立體聲</summary>

```c
void st_rt_render_disable_speaker_output(STRT_Context* context);
```

**用途** — 關閉喇叭佈局輸出，回到預設立體聲（2 聲道）路徑。

**呼叫方式** — 渲染中會發生裝置重新啟動（DEVICE）或 pull 輸出重新建構（HOST_PULL 系列），期間 `st_rt_render_process` 回傳 0 幀。喇叭聲道 EQ 全部清空，`STRenderOptions.reserved0` 再次限制在 0/1 範圍。執行緒：`[control, blocking]` — 包含裝置重新啟動，不在遊戲迴圈·音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_render_get_speaker_channels</code> — 讀取喇叭輸出聲道數</summary>

```c
int st_rt_render_get_speaker_channels(STRT_Context* context);
```

**用途** — 喇叭輸出啟用時回傳目前的輸出聲道數。HOST_PULL 系列中與實際 `st_rt_render_process` 輸出寬度一致（0 時為 2 聲道）。

**呼叫方式** — 啟用判定在 `st_rt_render_start` 之後成立 — 只設定佈局而未開始渲染時仍為 0。變更佈局後重新讀取以對齊緩衝區寬度。執行緒：`[control]` — 讀取非原子成員，不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 輸出聲道數。喇叭輸出未啟用時為 `0`（此時輸出為 2 聲道）。

</details>

<details>
<summary><code>st_rt_render_set_speaker_channel_eq</code> — 對單一喇叭輸出聲道套用 EQ（房間校正）</summary>

```c
int st_rt_render_set_speaker_channel_eq(STRT_Context* context, int32_t channelIndex, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 像針對每個實體喇叭量測的房間校正那樣，只套用於單一輸出聲道的參數式 EQ。所有聲道共通的音色由輸出 EQ（`st_rt_render_set_parametric_eq`）負責。

**呼叫方式** — 在喇叭路徑中位於全域輸出 EQ 之後、主增益之前。只在喇叭佈局輸出中套用，對立體聲·雙耳輸出無效果。未設定（或關閉·無效果）的聲道不觸碰樣本。**每次設定佈局時（`st_rt_render_set_speaker_layout[_custom]`，即使是相同佈局）以及 `st_rt_render_disable_speaker_output` 時，所有聲道都會清空** — 因為聲道編號的意義因佈局而異（同樣的 3 號在 5.1 中是 LFE），若保留舊編號會套用到錯誤的喇叭。請在設定佈局之後設定。聲道數與 `st_rt_render_get_speaker_channels` 不同，即使在 `st_rt_render_start` 之前，也從設定佈局後立即計算。值改變時以 20 ms 交叉淡化過渡。執行緒：`[control]` — 只變更輸出級，不在音訊回呼中呼叫。是否支援以 `ST_CAP1_SPEAKER_CHANNEL_EQ`（能力字組 1）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `channelIndex` | 輸出聲道編號（佈局聲道順序，含 LFE），`[0, 佈局聲道數)`。最多 64 聲道 |
| `bands` | `bandCount` 個頻段的陣列。`bandCount` = 0 時允許 `NULL`。`STParametricEqBand` 欄位·濾波器定義參見 `st_rt_render_set_parametric_eq` 條目 |
| `bandCount` | 頻段數 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` |
| `preampDb` | 前級放大 [dB]，clamp 到 `[−48, +12]` |
| `enabled` | 0 時儲存清單但直通 |

**回傳值** — `1` = 套用 / `0` = 失敗。`0` 時的 `st_rt_get_last_status`：`ST_STATUS_INVALID_ARGUMENT`（聲道超出範圍·沒有佈局，其他驗證與 `st_rt_render_set_parametric_eq` 相同）/ `ST_STATUS_UNAVAILABLE`（`ST_BACKEND_EXA` 後端）。

</details>

<details>
<summary><code>st_rt_render_get_speaker_channel_eq</code> — 讀取喇叭聲道 EQ</summary>

```c
int st_rt_render_get_speaker_channel_eq(const STRT_Context* context, int32_t channelIndex, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 回傳單一輸出聲道的 EQ 頻段清單（clamp 後的實效值）·前級放大·開啟狀態。未設定的聲道為 0 頻段·關閉。

**呼叫方式** — 輸出慣例（大小查詢、略過 `NULL` 輸出、容量不足處理）與 `st_rt_render_get_parametric_eq` 相同。執行緒：`[control]` — 持有 Auralizator 控制鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `channelIndex` | 輸出聲道編號，`[0, 佈局聲道數)` |
| `outBands` | 頻段輸出陣列。`NULL` 時為大小查詢 |
| `bandCapacity` | `outBands` 容量，0 以上 |
| `outBandCount` | 頻段數輸出。`NULL` 時略過 |
| `outPreampDb` | 前級放大 [dB] 輸出。`NULL` 時略過 |
| `outEnabled` | 開啟（0/1）輸出。`NULL` 時略過 |

**回傳值** — `1` = 成功 / `0` = 失敗（`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_UNAVAILABLE`，意義與 `st_rt_render_get_parametric_eq` 相同）。

</details>

<details>
<summary><code>st_rt_render_clear_speaker_channel_eqs</code> — 關閉所有喇叭聲道 EQ</summary>

```c
int st_rt_render_clear_speaker_channel_eqs(STRT_Context* context);
```

**用途** — 一次關閉所有聲道的喇叭聲道 EQ。

**呼叫方式** — 播放中時以 20 ms 斜坡過渡。沒有佈局也會成功。執行緒：`[control]` — 只變更輸出級，不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `1` = 成功 / `0` = 失敗（`ST_BACKEND_EXA` 後端為 `ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_create</code> — 建立播放多聲道輸入的虛擬喇叭組</summary>

```c
STSpeakerSetId st_rt_speaker_set_create(STRT_Context* context, const STSpeakerSetDesc* desc);
```

**用途** — 喇叭組以房間內的 N 個虛擬喇叭播放一個多聲道 PCM 輸入（C 個內容聲道）。一個喇叭就是一個由引擎建立的音源（成員音源），一個聲道可由多個喇叭分擔（電影院陣列）。輸入環每組只有 **一個**（interleaved），每個渲染區塊取出一次，所有喇叭讀取相同區塊·相同樣本 — 欠載也是全聲道同時發生，因此聲道之間不會錯位。也支援將立體聲輸入升混為 3.0/5.1/7.1 的升混輸入。

**呼叫方式** — 在準備好場景·聆聽者後建立，以 `st_rt_speaker_set_write` 填充環，再以 `st_rt_speaker_set_play` 播放。成員一建立即進入播放狀態，但在組 play 之前輸出靜音。成員品質設定（光線數·深度·傳輸更新階段）可在建立後隨時套用到以 `st_rt_speaker_set_get_source` 取得的 id（若在第一次傳播之前，則從第一個 IR 起即為該值）。執行緒：`[control, blocking]` — 包含建立 N 個成員音源（+指向性·增益），不在遊戲迴圈·音訊執行緒中呼叫。是否支援以 `ST_CAP1_SPEAKER_SET`（能力字組 1）確認。

- **上限** — 組 `ST_SPEAKER_SET_MAX_SETS`（12）個，每組聲道 `ST_SPEAKER_SET_MAX_CHANNELS`（16）·喇叭 `ST_SPEAKER_SET_MAX_SPEAKERS`（64）。組不使用主機串流槽（64）。未使用的槽·閒置的組在每個渲染區塊只有幾次原子讀取。
- **座標** — 喇叭姿態為 **組座標**，世界 = 錨點 ∘ 組變換 ∘ 喇叭姿態。`WORLD` 錨點為恆等（固定於房間），`LISTENER` 錨點為聆聽者位置 + yaw（繞 +Y 軸旋轉）。`LISTENER` 錨點只會由 `st_rt_speaker_set_update` 的聆聽者欄位重新計算，一般聆聽者 setter（含頭部旋轉）不會移動組。建立時的錨點為當時的聆聽者位置·yaw。四元數為 XYZW，由引擎正規化（範數 `< 1e-12` 會被拒絕）。喇叭本地座標系·指向性表座標系與音源相同（forward = +Z）。
- **電平** — 成員音量（與音源音量相同位置，3 ms 斜坡）= `muted`·`silenced` 時為 0，否則為 `gain × trim`。`ST_SPEAKER_SET_FLAG_ARRAY_TRIM` 時 `trim = 1/√N`，N 為同一聲道中非 `muted` 且 `gain` > 0 的喇叭數（`silenced` 計入）。LFE 沒有特別處理。`st_rt_source_get_volume` 回傳斜坡的目標值。
- **成員擁有權** — 成員音源由組擁有。對成員 id 的輸入（`set_audio_*`·`attach_stream`·`clear_audio`）、播放（play/pause/stop/seek/loop/trigger/retrigger）、姿態（position/direction/velocity/orientation_q）、輻射（directivity/axis_attenuation）、音量·音高·destroy、`st_rt_source_idle`/`_run` 會回傳 0 或被忽略，並留下 `ST_STATUS_INVALID_ARGUMENT`。品質設定（光線數·深度·更新階段·EQ·路徑開啟·路徑音量）與 getter 照常可用。指向性在建立時決定，無指向喇叭的旋轉不會傳給引擎。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `desc` | 組描述子。呼叫端須填入 `structSize` / `apiVersion`。指標陣列只在呼叫期間讀取（複製） |

**結構體** `STSpeakerSetDesc`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDesc)` / `ST_ABI_VERSION` |
| `channelCount` | 內容聲道數 `[1, ST_SPEAKER_SET_MAX_CHANNELS]` |
| `speakerCount` | 喇叭數 `[1, ST_SPEAKER_SET_MAX_SPEAKERS]` |
| `speakers` | `speakerCount` 個 `STSpeakerDesc` 的陣列 |
| `directivities` | 共用指向性表指標陣列（`STSourceDirectivity`）。指向同一個表的喇叭共用一份引擎副本。各表的驗證與 `st_rt_source_set_directivity` 相同。允許 `NULL`（`directivityCount` 0） |
| `directivityCount` | `directivities` 元素數 |
| `anchor` | `STSpeakerSetAnchor` — `ST_SPEAKER_SET_ANCHOR_WORLD`(0) / `ST_SPEAKER_SET_ANCHOR_LISTENER`(1) |
| `position[3]` / `rotationXYZW[4]` | 組變換（錨點座標） |
| `sampleRate` | 輸入取樣率。必須為引擎取樣率（44100），或在指定了 `hostSampleRate` 的情境中為該值 |
| `capacityFrames` | 環容量（主機幀），`[512, 1048576]`。0 = 16384 |
| `flags` | `ST_SPEAKER_SET_FLAG_ARRAY_TRIM`（共用聲道的 N 個喇叭為 1/√N）/ `ST_SPEAKER_SET_FLAG_STATIC`（成員音源為靜態 `isDynamic` 0） |
| `inputChannels` | 升混輸入。0 = 與 `channelCount` 相同。2 = 將立體聲升為 `channelCount`（3 = L R C，6 = 5.1，8 = 7.1） — 此時 write 接受立體聲 |
| `upmixWindowFrames` | 升混視窗長度 `[1024, 65536]` 偶數，0 = 4096。視窗延遲 = 視窗的一半（預設 2048） |
| `reserved[5]` | 0 |

**結構體** `STSpeakerDesc`

| 欄位 | 說明 |
|---|---|
| `channel` | 此喇叭輸出的內容聲道 `[0, channelCount)` |
| `directivityIndex` | -1 = 無指向，其他 = `STSpeakerSetDesc.directivities` 索引 |
| `pose` | `STSpeakerPose` — 組座標姿態與電平 |
| `reserved[2]` | 0 |

**結構體** `STSpeakerPose`

| 欄位 | 說明 |
|---|---|
| `position[3]` / `rotationXYZW[4]` | 組座標位置·旋轉 |
| `gain` | 線性聲壓 `[0, 16]` |
| `muted` | 0/1 — 1 時音量為 0，並從 `ARRAY_TRIM` 的 N 中排除 |
| `silenced` | 0/1 — 1 時音量為 0，但 N 不變（量測用的單獨播放：其餘設為 `silenced`） |
| `reserved[2]` | 0 |

**升混輸入**（`inputChannels` = 2） — 引擎內建升混器以左右成分的電平差決定前方方位（±30°），以相關度決定前·側·後（相關 → 前，不相關 → 側，反相 → 後），在喇叭環上保持能量進行分配，並在 LFE 加上 (L + R)/2 的低頻（至 80 Hz，160 Hz 時為 0）。3.0 為中央提取，只把前方相關集中的部分移到 FC，其餘留在 L·R 以維持立體聲聲像（無 LFE）。輸出聲道順序為 3.0 = FL FR FC，5.1 = FL FR FC LFE SL SR，7.1 = FL FR FC LFE SL SR BL BR（與喇叭 `channel` 編號相同），假設的角度為 FL −30° · FR 30° · FC 0°，5.1 SL −110° · SR 110°，7.1 SL −90° · SR 90° · BL −150° · BR 150°。升混在呼叫 write 的生產者執行緒上以主機取樣率執行（無配置）。視窗延遲已被裁除，因此輸入幀 n = 內容幀 n，但輸入要再多送入 `inputDelayFrames` 才會出現在環中，因此預填充也要相應增加。stop/relocate 之後的第一次 write 也會丟棄升混歷史。

**回傳值** — 組控制代碼。失敗時 `v < 0`，建立中的成員全部刪除。`st_rt_get_last_status`：`ST_STATUS_VERSION_MISMATCH` / `ST_STATUS_INVALID_ARGUMENT`（範圍·非有限·聲道·取樣率·`reserved`）/ `ST_STATUS_UNAVAILABLE`（組 `ST_SPEAKER_SET_MAX_SETS` 個已用盡）。

</details>

<details>
<summary><code>st_rt_speaker_set_destroy</code> — 刪除喇叭組</summary>

```c
int st_rt_speaker_set_destroy(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 刪除成員音源（3 ms 淡化）並歸還組槽。

**呼叫方式** — 不再需要組時呼叫。對成員 id 呼叫 `st_rt_source_destroy` 會被拒絕，因此務必以此函式刪除。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `1` = 已刪除 / `0` = 組不存在。

</details>

<details>
<summary><code>st_rt_speaker_set_get_source</code> — 取得單一喇叭的成員音源 id</summary>

```c
STSourceId st_rt_speaker_set_get_source(STRT_Context* context, STSpeakerSetId set, int speakerIndex);
```

**用途** — 回傳負責第 `speakerIndex` 號喇叭的成員音源 id。用於各成員的品質設定（光線數·深度·傳輸更新階段·EQ·路徑開啟·路徑音量）與音源 getter。

**呼叫方式** — 建立組後隨時呼叫。在第一次傳播之前設定品質時，從第一個 IR 起即為該值。輸入·播放·姿態·輻射·音量·音高·destroy 由組擁有，因此以此 id 呼叫會被拒絕（參見 `st_rt_speaker_set_create`）。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `speakerIndex` | 喇叭編號 `[0, speakerCount)`（`STSpeakerSetDesc.speakers` 順序） |

**回傳值** — 成員音源 id。失敗（組不存在·超出範圍）時 `v < 0`。

</details>

<details>
<summary><code>st_rt_speaker_set_update</code> — 批次更新組變換·喇叭姿態·聆聽者</summary>

```c
int st_rt_speaker_set_update(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetUpdate* update, uint32_t* outChanged);
```

**用途** — 一次變更組變換、全部喇叭姿態·電平、聆聽者姿態、`ARRAY_TRIM` 旗標。值與上次套用值位元相同時不會傳給引擎，因此即使每幀呼叫也只反映有變更的部分。

**呼叫方式** — 可在遊戲迴圈中每幀呼叫。`LISTENER` 錨點組只會由此呼叫的聆聽者欄位重新計算，同一呼叫也會以同一批次移動引擎聆聽者（與 `st_rt_listener_set_position`/`rotation` 意義相同）。原子性：SYNCHRONOUS 排程器中，下一次 `st_rt_propagate` 會一次看到整個更新。PIPELINED 會將全部喇叭位置與聆聽者位置放入同一個修訂版本，旋轉變更屬於場景提交，可能比位置早一個工作被看到。`outChanged` 為 0 表示沒有向引擎傳送任何內容，因此 SYNCHRONOUS 主機可略過 propagate。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `update` | 更新內容。呼叫端須填入 `structSize` / `apiVersion`。只讀取 `fields` 中包含的項目 |
| `outChanged` | 已傳給引擎的項目位元輸出。允許 `NULL`。`ST_SPEAKER_SET_CHANGED_LISTENER`（引擎聆聽者姿態）/ `ST_SPEAKER_SET_CHANGED_POSES`（成員音源世界位置·旋轉）/ `ST_SPEAKER_SET_CHANGED_GAINS`（成員音源音量） |

**結構體** `STSpeakerSetUpdate`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetUpdate)` / `ST_ABI_VERSION` |
| `fields` | 要讀取的項目位元：`ST_SPEAKER_SET_UPDATE_TRANSFORM` / `_SPEAKERS` / `_LISTENER` / `_FLAGS` |
| `position[3]` / `rotationXYZW[4]` | TRANSFORM — 組變換（錨點座標） |
| `listenerPosition[3]` | LISTENER — 聆聽者位置（場景單位） |
| `listenerYaw` | LISTENER — yaw [rad]，+Y 軸 |
| `listenerPitch` | LISTENER — pitch [rad]。只套用於聆聽者，錨點只跟隨 yaw |
| `speakerCount` | SPEAKERS — 必須等於組的喇叭數 |
| `speakers` | SPEAKERS — `speakerCount` 個（全部）`STSpeakerPose` 的陣列。欄位參見 `st_rt_speaker_set_create` 條目 |
| `flags` | FLAGS — `ST_SPEAKER_SET_FLAG_ARRAY_TRIM` 開/關（其他位元為 0） |
| `reserved[5]` | 0 |

**回傳值** — `1` = 成功 / `0` = 失敗。

</details>

<details>
<summary><code>st_rt_speaker_set_write</code> — 將 interleaved PCM 寫入組環</summary>

```c
int st_rt_speaker_set_write(STRT_Context* context, STSpeakerSetId set, const float* interleaved, int frames);
```

**用途** — 將組的多聲道內容供給到環中。無論來自檔案解碼·Web PCM·麥克風等何處，都以相同方式寫入。

**呼叫方式** — 播放前預填充，播放中則參照 `st_rt_speaker_set_get_status` 的 `queuedFrames` 調整供給量。渲染未執行時也可寫入，引擎·組閒置期間寫入的幀會留在環中，喚醒後輸出。執行緒：`[any]` — 僅限單一生產者，無鎖·無配置（升混也在此呼叫執行緒上執行）。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `interleaved` | interleaved float，`frames × 輸入聲道數` 個。輸入聲道數 = `channelCount`，升混輸入時為 2 |
| `frames` | 幀數（主機幀 = `STSpeakerSetDesc.sampleRate`） |

**回傳值** — `hostSampleRate` = 0 且無升混時，為實際放入環中的幀數（背壓 — 其餘部分需重新寫入）。其他情況（指定 `hostSampleRate` 或升混輸入）恆為 `frames` 且無背壓，因此以 `queuedFrames` 調整供給量。溢出的部分只會記錄在 `droppedFrames`。

</details>

<details>
<summary><code>st_rt_speaker_set_write_planar</code> — 以各聲道陣列將 PCM 寫入組環</summary>

```c
int st_rt_speaker_set_write_planar(STRT_Context* context, STSpeakerSetId set, const float* const* channels, int frames);
```

**用途** — 與 `st_rt_speaker_set_write` 相同，只是輸入為各聲道（planar）陣列。解碼器以 planar 輸出時可避免 interleave 複製。

**呼叫方式** — 與 `st_rt_speaker_set_write` 相同。執行緒：`[any]` — 僅限單一生產者，無鎖·無配置。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `channels` | 聲道指標陣列 `channels[輸入聲道數]`，各 `frames` 個 float。輸入聲道數 = `channelCount`，升混輸入時為 2 |
| `frames` | 幀數（主機幀） |

**回傳值** — 與 `st_rt_speaker_set_write` 相同。

</details>

<details>
<summary><code>st_rt_speaker_set_play</code> — 開始組播放</summary>

```c
int st_rt_speaker_set_play(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 請求整個組播放。所有成員在同一渲染區塊一起開始。

**呼叫方式** — 請求狀態在 **呼叫當下** 即改變，聲音則在下一個渲染區塊邊界一次套用到整個組。因此即使渲染停止期間，stop → relocate → write（預填充）→ play 也會累積起來，在下一個第一區塊一次套用。play 會以 `ST_SPEAKER_SET_STARTING` 等待，直到包含成員音源的 IR 被渲染器採用（不取出內容），之後即使環為空也會開始（計為欠載） — 主機應先填充。**首次播放不做淡入**，暫停·停止後重新開始時套用 132 樣本淡入。pause 之後的恢復從停止的那一幀開始。引擎閒置中時，喚醒後在區塊邊界解除。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `1` = 已請求 / `0` = 失敗（組不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_pause</code> — 暫停組（保留佇列）</summary>

```c
int st_rt_speaker_set_pause(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 暫停整個組。保留環中累積的佇列，因此再次 play 時會從停止的那一幀接續。

**呼叫方式** — 請求即時生效，聲音在下一個渲染區塊邊界套用。停止時各聲道從最後輸出樣本到 0 套用 132 樣本斜坡，且不再從環中取出，因此 `contentFrame` 為實際輸出的位置。已傳到房間中的殘響會繼續迴響。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `1` = 已請求 / `0` = 失敗（組不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_stop</code> — 停止組（清空佇列）</summary>

```c
int st_rt_speaker_set_stop(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 停止整個組並清空環中的佇列。

**呼叫方式** — 請求即時生效，聲音在下一個渲染區塊邊界套用（132 樣本斜坡淡出）。已傳到房間中的殘響會繼續迴響。要定位時，在 stop（或 pause）之後立即依 `st_rt_speaker_set_relocate` → write（預填充）→ play 的順序呼叫。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `1` = 已請求 / `0` = 失敗（組不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_relocate</code> — 重新設定組的內容位置（定位）</summary>

```c
int st_rt_speaker_set_relocate(STRT_Context* context, STSpeakerSetId set, int64_t contentFrame);
```

**用途** — 用於定位（seek）。丟棄截至呼叫時寫入的幀，從下一次取出起以此值開始計算 `contentFrame`。之後寫入的幀會保留。

**呼叫方式** — 只在請求狀態為停止·暫停時接受（在 stop 之後立即呼叫也可以）。輸入重新取樣器（`hostSampleRate`）·升混歷史也會在下一次 write 時丟棄，因此 relocate 後的第一個輸出樣本會以樣本為單位對齊之後第一次寫入的主機幀（= `contentFrame` 基準值）。在 HOST_PULL_BUFFERED 中以 `st_rt_render_stop`/`start` 丟棄輸出環之前，先讀取 `contentFrame − latencyFrames`（已聽到的位置），再以此函式重新設定。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `contentFrame` | 新內容位置基準（主機幀） |

**回傳值** — `1` = 套用 / `0` = 失敗（播放中、組不存在等）。

</details>

<details>
<summary><code>st_rt_speaker_set_idle</code> — 讓組（全部成員）閒置</summary>

```c
int st_rt_speaker_set_idle(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 消除沒有內容要播放的組的計算·渲染成本。一次（1 次場景提交）讓全部成員閒置（行為與 `st_rt_source_idle` 相同），當組視窗在與成員相同的長度（延遲線長度 + 1 s）內為靜音且原音模式延遲環也為空時，每個渲染區塊進行的環取出·原音混合也會停止（區塊時刻 `renderFrame` 也停止）。

**呼叫方式** — 在停止播放後（stop·pause·寫入靜音）呼叫。閒置期間寫入的幀會留在環中，喚醒後輸出。對成員 id 的 `st_rt_source_idle`/`_run` 會被拒絕，因此組以此函式與 `st_rt_speaker_set_run` 操作。執行緒：`[control]` — 持有場景鎖。是否支援以 `ST_CAP1_ENGINE_IDLE`（能力字組 1）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `1` = 成功 / `0` = 失敗（`ST_STATUS_NOT_FOUND` 組不存在、`ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_run</code> — 喚醒閒置的組</summary>

```c
int st_rt_speaker_set_run(STRT_Context* context, STSpeakerSetId set);
```

**用途** — 讓以 `st_rt_speaker_set_idle` 閒置的組重新執行。先喚醒成員再開啟組視窗，因此即使期間插入渲染區塊也不會遺失內容。

**呼叫方式** — 在重新播放之前呼叫。閒置期間寫入環中的幀會在喚醒後輸出。執行緒：`[control]` — 持有場景鎖。是否支援以 `ST_CAP1_ENGINE_IDLE`（能力字組 1）確認。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `1` = 成功 / `0` = 失敗（`ST_STATUS_NOT_FOUND` 組不存在、`ST_STATUS_UNAVAILABLE`）。

</details>

<details>
<summary><code>st_rt_speaker_set_get_idle_state</code> — 讀取組的閒置狀態</summary>

```c
int st_rt_speaker_set_get_idle_state(const STRT_Context* context, STSpeakerSetId set);
```

**用途** — 以 `STRT_IdleState` 回傳組的閒置·執行狀態。組與成員皆閒置時才為 IDLE。

**呼叫方式** — 用於確認 `st_rt_speaker_set_idle` 之後尾音是否已全部輸出。執行緒：`[control]` — 控制執行緒用查詢。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |

**回傳值** — `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1，正在輸出剩餘聲音) / `ST_RT_IDLE_IDLE`(2)。組不存在·情境為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_rt_speaker_set_set_direct</code> — 設定原音模式（略過傳播的直接輸出）</summary>

```c
int st_rt_speaker_set_set_direct(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetDirect* direct);
```

**用途** — 原音模式會略過傳播·聽覺化，將組聲道直接輸出到輸出聲道。開關時在相同內容位置於房間內喇叭聲與內容原音之間交叉淡化。使用相同的環·`contentFrame`·transport·淡化，將每個渲染區塊取出的相同內容樣本分為原音 g、濕路徑（成員音源）1 − g，並在交叉淡化期間線性移動 g。濕路徑變為 0 時，已傳到房間中的殘響也會自然衰減。

**呼叫方式** — 每次都傳送完整設定，從下一個渲染區塊起套用。組未發聲期間（停止·暫停·等待開始）變更的設定會不經交叉淡化直接套用 — 以原音模式首次播放時，從第一個樣本起只輸出原音。原音在 `delayFrames` 之後經過矩陣，加到輸出級（輸出 EQ → 主增益 → 限幅器）**之前**，因此限幅器·輸出級延遲與濕路徑相同，剩餘的差異即濕路徑的傳播延遲（距離/音速）以 `delayFrames` 對齊。原音開啟期間變更 `delayFrames` 時不做接合而是跳躍。耳機輸出時原音也不經過 HRTF。從未開啟原音的組，其輸出與沒有此功能時位元相同。執行緒：`[control]` — 不在音訊回呼中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `direct` | 原音設定。呼叫端須填入 `structSize` / `apiVersion` |

**結構體** `STSpeakerSetDirect`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDirect)` / `ST_ABI_VERSION` |
| `enabled` | 0 = 濕路徑（預設），1 = 原音 |
| `crossfadeMs` | 切換長度 `[0, 1000]` ms。短於 3 ms 時為 3 ms |
| `delayFrames` | 原音延遲（主機幀），`[0, 1 s]` |
| `outputChannels` | `matrix` 列數。0 時無矩陣（引擎預設對應） |
| `matrix` | `outputChannels × channelCount`，輸出列優先 — `matrix[o * channelCount + c]`。允許 `NULL` |
| `reserved[6]` | 0 |

`outputChannels` 與目前輸出聲道數（立體聲 2 · 喇叭佈局 N）不同，或 `matrix` 為 `NULL` 時，使用引擎預設對應。

| 條件 | 預設對應 |
|---|---|
| 聲道數 = 輸出數 | 原樣 |
| 輸出 2 | ITU-R BS.775 降混 — 3.0 為 FL FR FC（FC 0.7071），其他讀作 FL FR FC LFE SL SR [BL BR \| BC]，FC·環繞·後方 0.7071，LFE 0（排除），6.1 的 BC 兩側 0.5，單聲道兩側 0.7071，其他聲道數為偶數 → L · 奇數 → R |
| 其他 | 從前面起 1:1 |

降混不做正規化（由限幅器承接）。

**回傳值** — `1` = 套用 / `0` = 失敗（`ST_STATUS_VERSION_MISMATCH` · `ST_STATUS_INVALID_ARGUMENT` · `ST_STATUS_NOT_FOUND`）。

</details>

<details>
<summary><code>st_rt_speaker_set_get_status</code> — 讀取組的播放狀態·計數器·時刻</summary>

```c
int st_rt_speaker_set_get_status(const STRT_Context* context, STSpeakerSetId set, STSpeakerSetStatus* outStatus);
```

**用途** — 一次回傳組的 transport 狀態、環狀態、累計計數器、樣本級對齊用的渲染時刻。用於供給量調整（`queuedFrames`）、播放位置顯示、與影像的樣本級同步。

**呼叫方式** — 在任何執行緒都可呼叫。幀欄位全部為主機幀（引擎幀累計在查詢時以 round-half-up 換算一次），計數器為自建立起的累計。`state`·`contentFrame`·`renderFrame`·`playRenderFrame`·`playContentFrame` 是同一個渲染區塊一起寫入的值，因此在單次呼叫中彼此一致。`latencyFrames` 另外讀取輸出級狀態，因此在與渲染不同的執行緒讀取時可能相差 ±1 區塊 — 樣本級對齊請使用渲染時刻欄位。執行緒：`[any]` — 不會阻塞。

樣本級對齊：若播放從 `playRenderFrame` 開始後無欠載地持續，渲染位置 r（`renderFrame` 軸）的內容為 `playContentFrame + (r − playRenderFrame)`（含 3 ms 淡入）。輸出樣本會再晚 `latencyFrames`（輸出級 + 限幅器）輸出。聲音的傳播延遲（距離/音速）與濾波器群延遲不包含在此，若指定了 `hostSampleRate`，兩軸的換算捨入可能產生 ±1 幀差異。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `set` | 組控制代碼 |
| `outStatus` | 輸出。呼叫端須填入 `structSize` / `apiVersion` |

**結構體** `STSpeakerSetStatus`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetStatus)` / `ST_ABI_VERSION` |
| `state` | `STSpeakerSetState` — `STOPPED`(0) / `PLAYING`(1) / `PAUSED`(2) / `STARTING`(3，play 請求後等待包含成員音源的 IR 被採用 — 不取出內容) |
| `queuedFrames` | 環中累積的量 |
| `capacityFrames` | 引擎實際配置的環容量 |
| `latencyFrames` | 渲染 → 輸出延遲：輸出級（pull FIFO·緩衝環·輸出重新取樣器）+ 限幅器 |
| `contentFrame` | relocate 基準 + 渲染從環中取出的量 |
| `underrunFrames` | 播放中環為空而以靜音填充的量 |
| `droppedFrames` | 環已滿而丟棄的量 |
| `totalWrittenFrames` | 實際放入環中的量 |
| `renderFrame` | 情境至今渲染的幀（含靜音預捲區塊） |
| `playRenderFrame` | 最後一次播放開始區塊的第一個樣本渲染位置。開始前為 −1 |
| `playContentFrame` | 該樣本的內容幀 |
| `appliedSetters` | `st_rt_speaker_set_update` 傳給引擎的值數（位置·旋轉·增益·聆聽者位置·旋轉） |
| `skippedSetters` | 因位元相同·無指向旋轉而未傳送的值數 |
| `directMix` | 原音比例 0..1（上一區塊結束時）。0 = 只有濕路徑 |
| `inputDelayFrames` | 升混視窗延遲（主機幀，無升混時為 0） |
| `reserved[4]` | 保留 |

**回傳值** — `1` = 成功 / `0` = 失敗（`NULL`、戳記不一致、組不存在）。

</details>

</details>

<details>
<summary><strong>除錯 · 視覺化</strong> — 9 個</summary>

<details>
<summary><code>st_rt_debug_get_frame_generation</code> — 讀取傳播幀世代編號</summary>

```c
uint64_t st_rt_debug_get_frame_generation(const STRT_Context* context);
```

**用途** — 僅憑值的變化即可輕量偵測是否產生新傳播結果的計數器。用於判斷除錯視覺化是否需要每幀重新取得快照。

**呼叫方式** — 隨時可輪詢。值改變時呼叫 `st_rt_debug_acquire_snapshot` 取得新快照。要傳給 `st_rt_debug_copy_visual_paths` 的世代不是此值，而是使用 `st_rt_debug_acquire_snapshot` 回傳的 `frameGeneration`。執行緒：`[any]` — 讀取一個 atomic。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 目前世代編號。尚無傳播結果或 `context` 為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_debug_set_collect_failed_walks</code> — 設定是否也收集中途失敗的路徑 walk 供視覺化</summary>

```c
void st_rt_debug_set_collect_failed_walks(STRT_Context* context, int enabled);
```

**用途** — 預設視覺化只包含從音源到聆聽者走完的路徑。開啟此選項後，中途中斷的 walk 也會被收集，可用於除錯「為什麼這條路徑沒有連通」。

**呼叫方式** — 建立後隨時可呼叫，從之後的傳播結果起反映。收集對象的路徑類型另由 `st_rt_debug_set_collect_visual_paths` 的遮罩決定，此旗標獨立於該遮罩維持（不會出現在 `st_rt_debug_get_collect_mask` 中）。失敗 walk 以 `STVisualPathRecord.valid = 0` 進入，複製時以 `ST_VISUAL_PATH_COPY_ALL` 取得。預設為關閉。執行緒：`[control]` — 持有場景寫入鎖，因此不在音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | `0` = 關閉（預設）/ 非 `0` 的值 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_rt_debug_set_collect_visual_paths</code> — 指定要收集供視覺化的路徑類型遮罩</summary>

```c
int st_rt_debug_set_collect_visual_paths(STRT_Context* context, uint32_t mask);
```

**用途** — 讓傳播記錄路徑幾何，以便在編輯器·除錯檢視中以線段繪製 guide 光線、音源傳輸光線、直達聲·透射路徑、反射·繞射路徑。

**呼叫方式** — 建立後隨時可呼叫，從之後的傳播結果起反映。收集的結果依 `st_rt_debug_acquire_snapshot` → `st_rt_debug_copy_visual_paths` 的順序取得。預設遮罩為 `0`（不收集）。是否支援為 `ST_CAP_PATH_COLLECTION_MASK`。執行緒：`[control]` — 持有場景寫入鎖，因此不在音訊執行緒中呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mask` | `STPathCollectionFlag` 組合（見下表）。`0` = 關閉收集。含有未定義位元時拒絕 |

**列舉** `STPathCollectionFlag`

| 值 | 名稱 | 收集對象 |
|---|---|---|
| `1u << 0` | `ST_PATH_COLLECTION_GUIDE_RAY` | 從聆聽者發射的 guide 光線 |
| `1u << 1` | `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY` | 音源傳輸光線 |
| `1u << 2` | `ST_PATH_COLLECTION_DIRECT_TRANSMISSION` | 直達聲·透射路徑 |
| `1u << 3` | `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION` | 反射·繞射路徑（存在包含反射區段的混合繞射路徑，因此合為一個位元） |
| 上述四者的 OR | `ST_PATH_COLLECTION_ALL` | 全部 |

**回傳值** — `1` = 套用 / `0` = 拒絕（`context` 為 `NULL`、`mask` 含未定義位元）。

</details>

<details>
<summary><code>st_rt_debug_get_collect_mask</code> — 讀取目前的路徑收集遮罩</summary>

```c
uint32_t st_rt_debug_get_collect_mask(const STRT_Context* context);
```

**用途** — 確認以 `st_rt_debug_set_collect_visual_paths` 指定的收集遮罩。

**呼叫方式** — 隨時可呼叫。是否收集失敗 walk（`st_rt_debug_set_collect_failed_walks`）不包含在此值中。執行緒：`[any]` — 讀取 atomic 副本。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STPathCollectionFlag` 位元組合。預設 `0`，`context` 為 `NULL` 時為 `0`。

</details>

<details>
<summary><code>st_rt_debug_acquire_snapshot</code> — 取得最新傳播診斷快照並讀取摘要</summary>

```c
int st_rt_debug_acquire_snapshot(STRT_Context* context, STPropagationSnapshotInfo* outInfo);
```

**用途** — 將最新的一個傳播世代固定為診斷用，並一次回傳該世代的路徑數·視覺化緩衝區大小。所有值都來自 **同一世代**，因此路徑數統計與視覺化路徑不會互相錯位。

**呼叫方式** — 要取得視覺化路徑時，先以此函式取得快照，再以回傳的 `frameGeneration` 與數量準備緩衝區，呼叫 `st_rt_debug_copy_visual_paths`。再次呼叫時若期間產生了新世代會切換到該世代，因此複製要針對最後取得的世代進行。視覺化路徑·點數只有在以 `st_rt_debug_set_collect_visual_paths` 開啟收集時才不為 0。執行緒：`[control]` — 持有診斷互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outInfo` | 輸出。呼叫端須填入 `structSize = sizeof(STPropagationSnapshotInfo)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STPropagationSnapshotInfo`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入的戳記 |
| `frameGeneration` | 此快照的世代。直接傳給 `st_rt_debug_copy_visual_paths` |
| `collectionMask` | 產生此世代時使用的收集遮罩（`STPathCollectionFlag`） |
| `reserved0` | 保留 |
| `visualPathCount` | 視覺化路徑總數（含失敗 walk） |
| `validVisualPathCount` | 走完的視覺化路徑數。有效路徑位於陣列前段 |
| `visualPointCount` | 視覺化點總數 |
| `validVisualPointCount` | 屬於有效路徑的點數。位於陣列前段 |
| `totalPathCount` | 此世代的聲學路徑總數 |
| `reflectionPathCount` | 反射路徑數 |
| `diffractionPathCount` | 繞射路徑數 |
| `sourceSideOnlyPaths` | 只有音源側繞射邊的繞射路徑數 |
| `unclassifiedPaths` | 未分類的繞射路徑數（正常運作時為 0） |
| `sourceSideEvents` | 音源側繞射事件數 |
| `terminalOnlyPaths` | 只有聆聽者側末端邊繞射的路徑數 |
| `sourceAndTerminalPaths` | 同時有音源側與聆聽者側繞射的路徑數 |
| `terminalEvents` | 聆聽者側末端邊繞射事件數 |
| `reserved[4]` | 保留 |

**回傳值** — `1` = 成功 / `0` = `context`·`outInfo` 為 `NULL`、戳記不一致，或尚未有任何傳播結果。失敗時 `outInfo` 不變。

</details>

<details>
<summary><code>st_rt_debug_copy_visual_paths</code> — 複製已取得快照的視覺化路徑與點</summary>

```c
int st_rt_debug_copy_visual_paths(STRT_Context* context, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**用途** — 為了在除錯檢視中以線段繪製路徑，將路徑記錄與頂點陣列複製到主機緩衝區。音訊資料不經過此介面（僅供檢查·視覺化）。

**呼叫方式** — 先呼叫 `st_rt_debug_acquire_snapshot`，再以其 `frameGeneration` 與數量準備緩衝區：`VALID_ONLY` 時路徑 `validVisualPathCount` 個·點 `validVisualPointCount` 個，`ALL` 時為 `visualPathCount` 個·`visualPointCount` 個。緩衝區必須容納整組資料，不做部分複製。每筆記錄的 `points[pointOffset .. pointOffset + pointCount)` 依序相連構成一條路徑。執行緒：`[control]` — 持有診斷互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `frameGeneration` | `st_rt_debug_acquire_snapshot` 回傳的世代。與已取得快照的世代不同時失敗 |
| `copyMode` | `STVisualPathCopyMode`：`ST_VISUAL_PATH_COPY_VALID_ONLY`(0) = 只有走完的路徑 / `ST_VISUAL_PATH_COPY_ALL`(1) = 含失敗 walk 的全部。其他值失敗 |
| `outPaths` | 路徑記錄輸出陣列。要複製的路徑為 0 個時可為 `NULL` |
| `pathCapacity` | `outPaths` 元素數 |
| `outPoints` | 點輸出陣列。要複製的點為 0 個時可為 `NULL` |
| `pointCapacity` | `outPoints` 元素數 |

**結構體** `STVisualPathRecord`

| 欄位 | 說明 |
|---|---|
| `pointOffset` | 此路徑第一個點在 `outPoints` 中的索引 |
| `pointCount` | 此路徑的點數 |
| `depth` | 路徑深度（互動次數） |
| `pathKind` | `STPathKind`（見下表） |
| `soundSourceIndex` | 音源索引。guide 光線為 `-1` |
| `valid` | `1` = 走完 / `0` = 中途失敗的 walk |
| `totalLengthMeters` | 路徑總長度（m） |
| `reserved0` | 保留 |

聲學路徑的點順序為音源 → 各互動點 → 聆聽者，guide 光線為聆聽者 → 各命中點。

**列舉** `STPathKind`

| 值 | 名稱 | 意義 |
|---|---|---|
| `0` | `ST_PATH_GUIDE_RAY` | guide 光線 |
| `1` | `ST_PATH_DIRECT` | 直達聲（含透射） |
| `2` | `ST_PATH_REFLECTION` | 反射 |
| `3` | `ST_PATH_DIFFRACTION_UNKNOWN` | 未分類的繞射（正常運作時不會出現） |
| `1 << 2` | `ST_PATH_DIFFRACTION_S` | 音源側邊繞射 |
| `1 << 3` | `ST_PATH_DIFFRACTION_L` | 聆聽者側末端邊繞射 |
| `S \| L` | `ST_PATH_DIFFRACTION_SL` | 音源側與聆聽者側繞射皆有 |
| `1 << 4` | `ST_PATH_SOURCE_TRANSPORT_RAY` | 音源傳輸光線 |

**結構體** `STVisualPoint`

| 欄位 | 說明 |
|---|---|
| `x`, `y`, `z` | 點座標（場景座標系） |
| `flags` | `STVisualPointFlag`：`ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`(`1u << 0`，繞射點) |

**回傳值** — `1` = 成功 / `0` = 失敗：`context` 為 `NULL`、`copyMode` 超出範圍、尚無快照、`frameGeneration` 與已取得的世代不同、緩衝區容量不足（或需要時為 `NULL`）。因世代不一致而失敗時，重新呼叫 `st_rt_debug_acquire_snapshot` 後再複製。

</details>

<details>
<summary><code>st_rt_debug_copy_mesh_accel_nodes</code> — 複製單一網格的加速結構（BLAS）節點方塊</summary>

```c
int st_rt_debug_copy_mesh_accel_nodes(STRT_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 取出傳播所使用的網格加速結構的節點邊界方塊供視覺化。用於確認網格如何被分割，或在編輯器中疊加繪製 BVH 方塊。只讀取傳播所使用的結構。

**呼叫方式** — `st_rt_mesh_create` 之後隨時可呼叫。BLAS 依網格建立時的 `st_rt_scene_set_accel` 值建置。通常先以 `outNodes = NULL` 呼叫取得節點數，配置緩衝區後再次呼叫。大型網格有數千個節點，因此視覺化時一般以 `maxDepth` 只看上層。緩衝區不足時只會寫入前序順序的前段（從最左分支起），因此只需要上層時請以 `maxDepth` 截斷。是否支援為 `ST_CAP_ACCEL_DEBUG_NODES`。執行緒：`[control]` — 只持有場景讀取鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 目標網格控制代碼（`st_rt_mesh_create` 回傳的值） |
| `maxDepth` | `< 0` = 全部深度。`0` 以上時只計算並寫入 `depth ≤ maxDepth` 的節點 |
| `outNodes` | 輸出陣列。`NULL` 時為大小查詢（忽略 `nodeCapacity`） |
| `nodeCapacity` | `outNodes` 元素數。從前面起寫入 `min(全部, nodeCapacity)` 個 |

**結構體** `STAccelNode`（32 位元組，無版本戳記的陣列元素）

| 欄位 | 說明 |
|---|---|
| `boundsMin[3]` | 節點方塊最小座標 |
| `boundsMax[3]` | 節點方塊最大座標 |
| `depth` | 深度，根 = `0` |
| `primitiveCount` | 葉節點：包含的基本體數（≥ 0）/ 內部節點：`-1` |

- **順序**：深度優先前序（pre-order）。根為 `[0]`，各節點的父節點是陣列前方最近的 `depth − 1` 節點 — 不需父索引即可還原樹。
- **座標**：網格 BLAS 為傳給 `st_rt_mesh_create` 的頂點座標系（網格本地）。要繪製在實例位置時，由主機乘上物件變換。沒有 `sceneRatio` 轉換。
- **各加速結構類型的意義**（`st_rt_scene_set_accel` 的 kind）：BVH 系列（`0` BinnedSAH、`2` TinyBVH、`3` LBVH、`4` LBVH_Simd）為建置完成的二元樹，4/8-wide 走訪表示的方塊是此清單的子集。TinyBVH BVH8 的葉節點為 4 個三角形以下。KD（`1` HybridKD）以分割平面切割根方塊來推導方塊，因此兄弟方塊不重疊且精確分割父節點。可能存在空葉節點（`primitiveCount = 0`），跨多個葉節點的三角形會在每個葉節點各計一次。

**回傳值** — `maxDepth` 內的 **全部** 節點數（≥ 0），失敗時為 `-1`（`context` 為 `NULL`、網格不存在 → `ST_STATUS_NOT_FOUND`）。因緩衝區不足而截斷的複製也會回傳全部數量，並在 `st_rt_get_last_status` 留下 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_rt_debug_copy_scene_accel_nodes</code> — 複製場景頂層加速結構（TLAS）節點方塊</summary>

```c
int st_rt_debug_copy_scene_accel_nodes(STRT_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 取出建在物件實例之上的場景加速結構的節點方塊供視覺化。用於確認靜態·動態物件在場景中如何分組。

**呼叫方式** — 在 `st_rt_build` 之後呼叫。靜態 TLAS 是由 `st_rt_build` 發佈的，因此在下一次 `st_rt_build` 之前看不到暫存的靜態變更。動態 TLAS 由動態重建重新發佈。大小查詢（`outNodes = NULL`）·`maxDepth`·截斷複製的慣例與 `st_rt_debug_copy_mesh_accel_nodes` 相同。是否支援為 `ST_CAP_ACCEL_DEBUG_NODES`。執行緒：`[control]` — 只持有場景讀取鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `layer` | `STAccelLayer`：`ST_ACCEL_LAYER_STATIC`(0) = `st_rt_build` 發佈的靜態 TLAS / `ST_ACCEL_LAYER_DYNAMIC`(1) = 動態物件 TLAS |
| `maxDepth` | `< 0` = 全部深度。`0` 以上時只有 `depth ≤ maxDepth` 的節點 |
| `outNodes` | 輸出陣列。`NULL` 時為大小查詢 |
| `nodeCapacity` | `outNodes` 元素數 |

`STAccelNode` 欄位參見 `st_rt_debug_copy_mesh_accel_nodes` 條目。TLAS 的座標為場景（世界）座標系，葉節點的基本體不是三角形而是物件實例。

**回傳值** — `maxDepth` 內的全部節點數（≥ 0）。該 TLAS 尚不存在時（建置前、沒有該類型的物件）為 `0`，不是錯誤。`-1` = 失敗（`context` 為 `NULL`、`layer` 超出範圍 → `ST_STATUS_INVALID_ARGUMENT`）。截斷複製與 `st_rt_debug_copy_mesh_accel_nodes` 相同，會留下 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_rt_debug_build_mesh_accel_nodes</code> — 不需情境即建置單一網格的 BLAS 並回傳節點方塊</summary>

```c
int st_rt_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 供主機編輯器在建立場景之前預覽網格的加速結構。經過與 `st_rt_mesh_create` 相同的輸入驗證·相同的建置路徑，因此相同 `accelKind` 時會得到與即時情境所建 BLAS 相同的樹。

**呼叫方式** — 不需情境，隨時可呼叫。每次呼叫都會重新建置 BLAS（成本與網格大小成正比），因此結果由主機快取。大小查詢（`outNodes = NULL`）·`maxDepth`·前序順序慣例與 `st_rt_debug_copy_mesh_accel_nodes` 相同。是否支援為 `ST_CAP_ACCEL_DEBUG_NODES`。執行緒：`[any]` — 不使用全域狀態（建置成本由呼叫執行緒負擔）。

| 參數 | 說明 |
|---|---|
| `mesh` | 輸入網格。`vertices` 為 xyz 交錯（`numVertices × 3` float），`triangles` 為頂點索引（`numTriangles × 3` int） |
| `accelKind` | `st_rt_scene_set_accel` 的 kind：`0` BinnedSAH / `1` HybridKD / `2` TinyBVH / `3` LBVH / `4` LBVH_Simd。`-1` = 引擎預設（TinyBVH，若有環境變數 `SOUNDTRACING_ACCEL` 則為其值） |
| `maxDepth` | `< 0` = 全部深度。`0` 以上時只有 `depth ≤ maxDepth` 的節點 |
| `outNodes` | 輸出陣列。`NULL` 時為大小查詢 |
| `nodeCapacity` | `outNodes` 元素數 |

**結構體** `STMesh`

| 欄位 | 說明 |
|---|---|
| `numVertices` | 頂點數 |
| `vertices` | 頂點座標陣列（xyz 交錯） |
| `numTriangles` | 三角形數 |
| `triangles` | 三角形頂點索引陣列（每個三角形 3 個） |

`STAccelNode` 欄位與節點順序·座標慣例參見 `st_rt_debug_copy_mesh_accel_nodes` 條目。座標維持輸入頂點座標系。

**回傳值** — `maxDepth` 內的全部節點數（≥ 0）。`-1` = 失敗（`mesh` 或陣列為 `NULL`、數量為 0 以下、非有限頂點、超出範圍的索引、錯誤的 `accelKind`、配置失敗）。因為沒有情境，`st_rt_get_last_status` 中不會留下任何內容。

</details>

</details>

<details>
<summary><strong>離線(`st_off_*`) — 情境 · 場景 · 音源 · 聆聽者</strong> — 72 個</summary>

<details>
<summary><code>st_off_get_api_version</code> — 回傳離線 DLL 的 ABI 版本</summary>

```c
uint32_t st_off_get_api_version(void);
```

**用途** — 告知載入的 `SoundTracingOffline` 程式庫以哪個 ABI 版本建置。這是確認主機編譯時的標頭檔（`STTypes.h` 的 `ST_ABI_VERSION`）與 DLL 是否使用相同結構體配置的唯一判定手段。

**呼叫方式** — 在載入程式庫之後、建立情境之前呼叫一次，與 `ST_ABI_VERSION` 比較。不同時結構體佈局不一致，因此停止使用。所有帶版本戳記結構體的 `apiVersion` 欄位也填入此值（`ST_ABI_VERSION`）。執行緒：`[any]` — 編譯期常數，可在任何執行緒無阻塞呼叫。

**參數** — 無。

**回傳值** — 程式庫的 ABI 版本（須與 `ST_ABI_VERSION` 相同才相容）。

</details>

<details>
<summary><code>st_off_get_version_string</code> — 回傳產品發行版本字串</summary>

```c
const char* st_off_get_version_string(void);
```

**用途** — 以人類可讀的字串提供要顯示在日誌·診斷畫面上的產品發行版本。

**呼叫方式** — 隨時可呼叫。不用於 ABI 相容性判定 — 該判定以 `st_off_get_api_version` 進行。執行緒：`[any]` — 不會阻塞。

**參數** — 無。

**回傳值** — DLL 擁有的靜態 NUL 結尾字串。呼叫端不需釋放。

</details>

<details>
<summary><code>st_off_get_capabilities</code> — 回傳能力字組 0（<code>ST_CAP_*</code>）</summary>

```c
uint64_t st_off_get_capabilities(void);
```

**用途** — 以位元遮罩告知此離線程式庫支援的功能。由於這是功能會選擇性追加的 ABI，主機不是依函式是否存在，而是依此位元判斷是否支援。

**呼叫方式** — 在初始化時讀取一次，與 `ST_CAP_*` 位元 AND 來確認。例：`ST_CAP_OFFLINE`、`ST_CAP_SCENE_RAYCAST`、`ST_CAP_SOURCE_DIRECTIVITY`、`ST_CAP_SCENE_RATIO`、`ST_CAP_THREAD_ATTRIBUTES`、`ST_CAP_SOURCE_EQ` 等。與即時 DLL 的集合不同 — 沒有即時專用位元（`ST_CAP_REALTIME_SINGLE` / `ST_CAP_REALTIME_MULTI`、`ST_CAP_RUNTIME_DELAY_RESIZE`、`ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`、`ST_CAP_ENGINE_TIMING` 等），而有 `ST_CAP_OFFLINE_*` 位元。包含 Exa 後端的建置會加上 `ST_CAP_BACKEND_EXA`。字組 1 以上的能力（`ST_CAP1_*`）以 `st_off_get_capability_word` 讀取 — 不要混合不同字組的位元做 AND。執行緒：`[any]` — 編譯期常數。

**參數** — 無。

**回傳值** — 能力字組 0 的位元 OR（與 `st_off_get_capability_word(0)` 相同的值）。

</details>

<details>
<summary><code>st_off_get_capability_word</code> — 回傳能力字組 n</summary>

```c
uint64_t st_off_get_capability_word(uint32_t word);
```

**用途** — 以字組為單位查詢在字組 0 的 64 位元用完後追加的能力。此函式本身是否存在，可由字組 0 的 `ST_CAP_CAPABILITY_WORDS` 位元得知。

**呼叫方式** — 在初始化時讀取需要的字組，只與同一字組的常數（`ST_CAP1_*` 為字組 1）做 AND。離線 DLL 的字組 1 包含 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN`、`ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`、`ST_CAP1_OFFLINE_MAX_DELAY`、`ST_CAP1_SOURCE_PARAMETRIC_EQ`、`ST_CAP1_LISTENER_ORIENTATION_Q`。執行緒：`[any]` — 編譯期常數。

| 參數 | 說明 |
|---|---|
| `word` | 字組編號。`0` = 與 `st_off_get_capabilities()` 相同的值，`1` = `ST_CAP1_*` 字組。標頭檔所知的字組數為 `ST_CAPABILITY_WORD_COUNT`，其他編號回傳 `0` |

**回傳值** — 該字組的位元 OR。未知字組為 `0`（= 無該能力）。

</details>

<details>
<summary><code>st_off_get_sample_rate</code> — 回傳引擎取樣率（44100 Hz）</summary>

```c
int st_off_get_sample_rate(void);
```

**用途** — 告知引擎產生 IR 與音訊的固定取樣率。用於將離線渲染結果的樣本數換算為時間，或判斷是否要重新取樣為其他取樣率。

**呼叫方式** — 隨時可呼叫。值固定為 44100 Hz，主機使用其他取樣率時，重新取樣由主機負責。執行緒：`[any]` — 編譯期常數。

**參數** — 無。

**回傳值** — `44100`。

</details>

<details>
<summary><code>st_off_set_thread_attributes</code> — 依引擎執行緒類型指定優先順序·核心偏好·affinity</summary>

```c
int st_off_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**用途** — 由主機在執行緒 **建立之前** 決定引擎所建立執行緒的屬性。這是讓主機將引擎計算執行緒納入自己的執行緒預算·優先順序策略的介面。

**呼叫方式** — 約定在 `st_off_create` **之前** 呼叫。不套用到已啟動的執行緒，從之後建立的執行緒（下一次 `st_off_create` 的計算集區等）起套用。此表與情境無關，為 **處理程序全域**，即時 DLL 與離線 DLL 各自擁有自己的表 — 兩個 DLL 一起使用時，必須在 `st_rt_set_thread_attributes` 與此函式兩邊填入相同的值。在離線外殼中實際有意義的類型只有 `ST_THREAD_COMPUTE_POOL`，其他類型的值只會儲存而沒有可套用的執行緒（批次工作執行緒不屬於 `STThreadType`）。`affinityMask` 與核心偏好旗標只在 Windows 上反映，macOS 上會被忽略（由 QoS 類別決定配置）。是否支援為 `ST_CAP_THREAD_ATTRIBUTES`。執行緒：`[any]` — 以互斥鎖更新處理程序全域表一次。

| 參數 | 說明 |
|---|---|
| `threadType` | `STThreadType` 值，`[0, ST_THREAD_TYPE_COUNT)`。離線中套用的是 `ST_THREAD_COMPUTE_POOL`(4) — 計算集區工作執行緒（`maxComputeThreads` N > 1 時為 N 個） |
| `attributes` | 要指定的屬性。呼叫端須填入 `structSize = sizeof(STThreadAttributes)`、`apiVersion = ST_ABI_VERSION`。`NULL` 時將該類型還原為預設值 |

**結構體** `STThreadAttributes`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)`。由呼叫端填入 |
| `apiVersion` | `ST_ABI_VERSION`。由呼叫端填入 |
| `priority` | `STThreadPriority` — `ST_THREAD_PRIORITY_DEFAULT`（0，維持平台預設）/ `LOW`(1) / `BELOW_NORMAL`(2) / `NORMAL`(3) / `ABOVE_NORMAL`(4) / `HIGH`(5) / `TIME_CRITICAL`(6)。Windows 對應同名的執行緒優先順序（LOW→LOWEST，HIGH→HIGHEST），macOS 對應 QoS 類別（LOW→BACKGROUND，BELOW_NORMAL→UTILITY，NORMAL→USER_INITIATED，更高→USER_INTERACTIVE） |
| `flags` | `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` / `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES`。兩者同時開啟會被拒絕。僅 Windows 反映 |
| `affinityMask` | 邏輯處理器位元遮罩，`0` = 不指定。僅 Windows 反映，在超過 64 個處理器的機器上只在目前處理器群組內解譯 |
| `reserved[4]` | 必須全部為 `0` |

**回傳值** — `1` = 成功 / `0` = 失敗：`threadType` 超出範圍、`structSize`/`apiVersion` 不一致、`priority` 超出範圍、核心偏好旗標衝突、`reserved[]` 非 0。因為不接受情境，`st_off_get_last_status` 中不會留下任何內容。

</details>

<details>
<summary><code>st_off_get_thread_attributes</code> — 讀取已儲存的執行緒屬性請求值</summary>

```c
int st_off_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**用途** — 確認以 `st_off_set_thread_attributes` 指定的值。

**呼叫方式** — 隨時可呼叫。回傳的值不是實際設定到執行緒上的值，而是原樣儲存的 **請求值**。未指定類型的預設值為 `priority` = `ST_THREAD_PRIORITY_DEFAULT` · `flags` = 0 · `affinityMask` = 0。執行緒：`[any]` — 以互斥鎖讀取處理程序全域表一次。

| 參數 | 說明 |
|---|---|
| `threadType` | `STThreadType` 值，`[0, ST_THREAD_TYPE_COUNT)` |
| `outAttributes` | 接收結果的結構體。呼叫端須填入 `structSize`/`apiVersion`。欄位參見 `st_off_set_thread_attributes` 條目 |

**回傳值** — `1` = 成功 / `0` = 拒絕（`outAttributes` 為 `NULL`、戳記不一致、`threadType` 超出範圍）。

</details>

<details>
<summary><code>st_off_get_thread_inventory</code> — 依類型讀取此情境啟動的執行緒數</summary>

```c
int st_off_get_thread_inventory(const STOFF_Context* context, STThreadInventory* outInventory);
```

**用途** — 以各類型的數值提供情境目前實際佔用多少執行緒。目的是讓主機以量測值而非推測來規劃執行緒預算。

**呼叫方式** — 建立情境後隨時呼叫。離線外殼沒有傳播通道·音訊渲染·裝置·檔案解碼器執行緒，因此有值的位置只有 `ST_THREAD_COMPUTE_POOL` — `maxComputeThreads` 為 N > 1 時為 N，為 1 時為 0（在呼叫端執行緒內嵌執行）。`ST_THREAD_ACCEL_BUILD` 為保留角色，因此為 0。各類型的值是各自獨立的 atomic，因此不是同一時刻的快照。是否支援為 `ST_CAP_THREAD_INVENTORY`。執行緒：`[any]` — 只讀取 atomic 計數器，不會阻塞。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outInventory` | 接收結果的結構體。呼叫端須填入 `structSize = sizeof(STThreadInventory)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STThreadInventory`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STThreadInventory)`。由呼叫端填入 |
| `apiVersion` | `ST_ABI_VERSION`。由呼叫端填入 |
| `countByRole[ST_THREAD_TYPE_COUNT]` | 依 `STThreadType` 順序的各類型執行緒數（索引 = 類型）。離線中只有 `[ST_THREAD_COMPUTE_POOL]` 可能不為 0 |
| `reserved[5]` | 保留 |

**回傳值** — `1` = 成功 / `0` = `context`·`outInventory` 為 `NULL` 或戳記不一致（`st_off_get_last_status` 中為 `ST_STATUS_VERSION_MISMATCH`）。

</details>

<details>
<summary><code>st_off_init_create_options</code> — 以預設值填入 <code>STOFF_CreateOptions</code></summary>

```c
void st_off_init_create_options(STOFF_CreateOptions* outOptions);
```

**用途** — 以版本戳記與預設值初始化情境建立選項。目的是讓主機只覆寫想變更的欄位，其餘取得引擎預設值。

**呼叫方式** — 在 `st_off_create` 之前呼叫。先將整個結構體清為 0，再填入 `structSize` 與 `apiVersion`，因此以 0 代表「預設」的欄位全部成為預設值。接著只變更需要的欄位（`maxComputeThreads`、`sceneRatio` 等）並傳給 `st_off_create`。執行緒：`[any]` — 只填入呼叫端擁有的 POD。

| 參數 | 說明 |
|---|---|
| `outOptions` | 要填入的結構體。`NULL` 時不做任何事 |

**結構體** `STOFF_CreateOptions`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STOFF_CreateOptions)`。由此函式填入 |
| `apiVersion` | `ST_ABI_VERSION`。由此函式填入 |
| `seedValue` | 預設 `0`。對預設（ST）後端的輸出沒有影響 — 為 ABI 相容與 Exa 後端而保留的欄位 |
| `maxComputeThreads` | 情境使用的計算執行緒上限。`0` = auto = min(效能核心數, 6)，最少 1。此值即為引擎擁有的共用計算集區寬度，在離線外殼中這就是情境建立的全部執行緒 — `1` 時集區執行緒為 0 個（所有計算在呼叫執行緒內嵌執行），N > 1 時計算集區工作執行緒為 N 個。不受環境變數影響。批次工作執行緒不是由情境擁有，而是由 `st_off_batch_create` 建立的批次物件擁有。是否支援為 `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | 場景單位 → 公尺換算係數。`0` = 預設 = `1.0`（場景單位即公尺）。公分主機為 `0.01f`，英尺主機為 `0.3048f`。**僅限初始化**，沒有執行期 setter。座標以場景單位原樣傳入，引擎只在傳播延遲·距離衰減·空氣吸收·殘響描述子·`...Meters` 輸出欄位等需要公尺的地方乘上此係數。非有限值或 0 以下（0 除外）會被 `st_off_create` 拒絕。是否支援為 `ST_CAP_SCENE_RATIO` |
| `backend` | `STBackend` — `ST_BACKEND_ST`（0，預設）/ `ST_BACKEND_EXA`(1)。建立時選擇整個管線，沒有執行期切換。Exa 只有在程式庫宣告 `ST_CAP_BACKEND_EXA` 時才可使用 |
| `reserved[5]` | 保留。保持為 0 |

離線選項沒有對應即時的 `scheduler`·`maxDelaySeconds`·`renderOutputMode`·`hostSampleRate`·`startIdle`·`maxSources` 的欄位 — 因為沒有排程器而由呼叫執行緒驅動管線，且沒有裝置·串流·音源預算。渲染延遲環長度在建立後以 `st_off_render_set_max_delay_seconds` 設定（預設 4.0 s）。

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_create</code> — 建立離線情境</summary>

```c
STStatus st_off_create(const STOFF_CreateOptions* options, STOFF_Context** outContext);
```

**用途** — 建立離線引擎實例（擁有場景·材質·音源·聆聽者·IR 快取）及其計算集區。離線情境沒有裝置·音訊渲染·傳播工作執行緒，用途是由呼叫執行緒以 `st_off_ir_compute` 執行一次傳播，產生確定性的 IR。

**呼叫方式** — 需要時先呼叫 `st_off_set_thread_attributes`，以 `st_off_init_create_options` 初始化選項後呼叫。成功後的狀態：自動建立一個聆聽者並為啟用（id `1`，位置 (0,0,0)，方向恆等），IR 快取為空，因此在 `st_off_ir_compute` 之前渲染系列會以 `ST_STATUS_UNAVAILABLE` 失敗。三角形相交核心為 `0`（MollerTrumbore），early 空間模式為 `ST_EARLY_SPATIAL_OBJECTS`，渲染延遲環為 4.0 s，其他預設值（大氣·距離衰減·能量目標·路徑類型·聲學功能·音源預設值）與即時相同。若是 **不同的** 情境，可在多個執行緒同時呼叫 `st_off_create`/`st_off_destroy`，也可與其他情境的 compute·渲染·批次工作重疊（Exa 後端即使是不同情境也不可同時執行 compute）。失敗原因字串在同一執行緒以 `st_off_get_last_error(NULL, ...)` 讀取。執行緒：`[control, blocking]` — 建立引擎與計算集區的長區間。

| 參數 | 說明 |
|---|---|
| `options` | 建立選項。`NULL` 時使用 `st_off_init_create_options` 的預設值。欄位參見 `st_off_init_create_options` 條目 |
| `outContext` | 接收所建立情境的指標。失敗時填入 `NULL` |

**回傳值** — `STStatus`：`ST_STATUS_OK` = 成功 / `ST_STATUS_INVALID_ARGUMENT` = `outContext` 為 `NULL`、未知或此建置中沒有的 `backend`、錯誤的 `sceneRatio` / `ST_STATUS_VERSION_MISMATCH` = `structSize`·`apiVersion` 不一致 / `ST_STATUS_INITIALIZATION_FAILED` = 引擎初始化失敗 / `ST_STATUS_ALLOCATION_FAILED` = 記憶體配置失敗。

</details>

<details>
<summary><code>st_off_get_backend</code> — 回傳情境使用的後端</summary>

```c
int st_off_get_backend(const STOFF_Context* context);
```

**用途** — 確認建立時以 `STOFF_CreateOptions.backend` 選擇的管線。

**呼叫方式** — 建立後隨時呼叫。後端在建立時確定，執行期間無法變更。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STBackend` 值（`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1）。`context` 為 `NULL` 時為 `-1`。

</details>

<details>
<summary><code>st_off_destroy</code> — 銷毀離線情境</summary>

```c
void st_off_destroy(STOFF_Context* context);
```

**用途** — 釋放情境及其引擎·計算集區·IR 快取。

**呼叫方式** — 在對該情境的其他呼叫全部結束後呼叫。正在銷毀或已銷毀的情境不得被其他執行緒使用。註冊到批次（`st_off_batch_*`）的情境，只能在以 `st_off_batch_poll` 收到該工作的完成記錄之後銷毀。此函式只 join 該情境的計算集區工作執行緒（`maxComputeThreads` 為 1 時沒有要 join 的執行緒）。若是不同的情境，可在多個執行緒同時呼叫。執行緒：`[control, blocking]`。

| 參數 | 說明 |
|---|---|
| `context` | 要銷毀的情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_get_last_status</code> — 讀取最後一次呼叫的狀態碼</summary>

```c
STStatus st_off_get_last_status(const STOFF_Context* context);
```

**用途** — 以狀態碼確認只回傳 `0`/`-1`/失敗控制代碼的函式為何失敗。

**呼叫方式** — 在回傳失敗的呼叫之後立即於同一執行緒呼叫。每個情境只有一個診斷欄位，因此在多個執行緒同時使用同一情境時值可能混雜。人類可讀的訊息為 `st_off_get_last_error`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STStatus`：`ST_STATUS_OK`(0) / `INVALID_CONTEXT`(1) / `INVALID_ARGUMENT`(2) / `VERSION_MISMATCH`(3) / `INITIALIZATION_FAILED`(4) / `ALLOCATION_FAILED`(5) / `NOT_FOUND`(6) / `BUFFER_TOO_SMALL`(7) / `INVALID_MATERIAL`(8) / `STALE_SNAPSHOT`(9) / `UNAVAILABLE`(10)。`context` 為 `NULL` 時為 `ST_STATUS_INVALID_CONTEXT`。

</details>

<details>
<summary><code>st_off_get_last_error</code> — 複製最後的錯誤訊息</summary>

```c
int st_off_get_last_error(const STOFF_Context* context, char* outMessage, int capacity);
```

**用途** — 取得最後一次失敗的人類可讀說明（例：驗證器的拒絕原因）。將 `context` 設為 `NULL` 可取得 `st_off_create` 的失敗原因 — 因為此時沒有情境。

**呼叫方式** — 在失敗之後立即於同一執行緒呼叫。以 `NULL` 情境呼叫時，回傳此呼叫執行緒最後一次失敗的 `st_off_create` 訊息，下一次 create 會清除它。不知道所需大小時，先以 `outMessage = NULL` 呼叫取得長度。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼。`NULL` 時為此執行緒最後一次 create 失敗的訊息 |
| `outMessage` | 接收訊息的緩衝區。`NULL` 時不複製，只回傳長度 |
| `capacity` | `outMessage` 的位元組數。不足時截斷並以 NUL 結尾 |

**回傳值** — 容納完整訊息所需的位元組數（含 NUL）。回傳值大於 `capacity` 時表示已截斷。

</details>

<details>
<summary><code>st_off_material_create</code> — 註冊一個聲學材質</summary>

```c
STMaterialId st_off_material_create(STOFF_Context* context, const STMaterial* material);
```

**用途** — 註冊用於網格表面的 9 頻段聲學材質（反射·吸收·透射·散射）並取得控制代碼。材質係數是引擎不做校正的嚴格輸入，因此在註冊時驗證並立即拒絕錯誤的值。

**呼叫方式** — 在建立網格之前註冊所有需要的材質，將取得的控制代碼用於 `st_off_mesh_create` 的 `material`（或各三角形的材質索引）。多個材質以重複呼叫此函式註冊，回傳的 id 依註冊順序連續。與即時 `st_rt_material_create` 為相同約定。執行緒：`[control]` — 持有場景寫入鎖，可能短暫阻塞。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `material` | 要註冊的材質。呼叫端須填入 `structSize`/`apiVersion` |

**結構體** `STMaterial`

| 欄位 | 說明 |
|---|---|
| `structSize` | `sizeof(STMaterial)`。在讀取係數之前驗證 |
| `apiVersion` | `ST_ABI_VERSION` |
| `reflection[ST_FREQUENCY_BANDS]` | 各頻段反射能量比，`[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | 各頻段吸收能量比，`[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | 各頻段透射能量比，`[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 反射能量中的擴散比例，`[0, 1]`。不計入 R+A+T 總和檢查 |
| `reserved[8]` | 保留 |

頻段順序為 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz（`ST_FREQUENCY_BANDS` = 9）。所有係數都是 **能量域** 的無因次比例，每個頻段必須滿足 `|R + A + T − 1| ≤ ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`（0.001）。引擎不對值進行推導·正規化·clamp·內插。

**回傳值** — 材質控制代碼 `STMaterialId`。失敗時 `v < 0`：`context`·`material` 為 `NULL` 時為 `ST_STATUS_INVALID_ARGUMENT`，未通過係數驗證時為 `ST_STATUS_INVALID_MATERIAL`（戳記不一致為 `ST_STATUS_VERSION_MISMATCH`），會留在 `st_off_get_last_status` 中，原因以 `st_off_get_last_error` 讀取。

</details>

<details>
<summary><code>st_off_material_load_defaults</code> — 一次註冊整個預設材質庫</summary>

```c
STMaterialId st_off_material_load_defaults(STOFF_Context* context);
```

**用途** — 一次註冊引擎內建的預設材質組，無需自行準備材質係數即可構成場景。

**呼叫方式** — 在建立網格之前呼叫。回傳的控制代碼是材質組的第一個材質，之後的材質依 `v+1`、`v+2` … 的順序連續。與即時 `st_rt_material_load_defaults` 為相同約定。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 第一個材質的控制代碼 `STMaterialId`。失敗時 `v < 0`。

</details>

<details>
<summary><code>st_off_scene_set_edge_split_collinear_overlaps</code> — 開關網格邊拓撲編譯選項</summary>

```c
void st_off_scene_set_edge_split_collinear_overlaps(STOFF_Context* context, int enabled);
```

**用途** — 場景建置選項，決定 `st_off_mesh_create` 編譯網格的聲學邊（繞射候選）拓撲時，是否分割處理在同一直線上重疊的邊。

**呼叫方式** — 在建立網格之前呼叫。只套用到此呼叫之後加入的網格，已建立的網格維持建立時編譯的拓撲。是否支援為 `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`。與即時 `st_rt_scene_set_edge_split_collinear_overlaps` 為相同約定。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | `0` = 關閉 / 其他 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_scene_set_solid_wedge_gate</code> — 開關雙面繞射楔的角度區間剔除</summary>

```c
void st_off_scene_set_solid_wedge_gate(STOFF_Context* context, int enabled);
```

**用途** — 驗證繞射路徑時，剔除通過由兩個面構成的楔（wedge）實體側角度區間之路徑的閘門。預設為關閉。

**呼叫方式** — 這是在傳播時套用的選項，因此在 `st_off_ir_compute` 之前設定。開啟時，楔的凸/凹判定會使用網格繞向（由三角形頂點順序給出的法線正負號），因此繞向反轉時被剔除的繞射路徑集合也會相反 — 請在單一網格內保持繞向一致，並盡可能讓法線朝向空氣側。是否支援為 `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`。與即時 `st_rt_scene_set_solid_wedge_gate` 為相同約定。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `enabled` | `0` = 關閉（預設）/ 其他 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_scene_set_accel</code> — 選擇網格·靜態加速結構類型</summary>

```c
int st_off_scene_set_accel(STOFF_Context* context, int kind);
```

**用途** — 由主機選擇用於光線相交的 BLAS·靜態加速結構實作。可依場景規模或建置時間·查詢速度的優先順序更換結構進行比較。

**呼叫方式** — 在加入物件之前呼叫。只套用到之後的建置。預設為 `2`（TinyBVH）。與即時 `st_rt_scene_set_accel` 為完全相同的約定。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH（預設）/ `3` = LBVH / `4` = LBVH_Simd |

**回傳值** — `1` = 套用 / `0` = `kind` 超出範圍或沒有情境。

</details>

<details>
<summary><code>st_off_scene_set_triangle_intersection</code> — 選擇三角形相交核心</summary>

```c
int st_off_scene_set_triangle_intersection(STOFF_Context* context, int kind);
```

**用途** — 選擇光線–三角形相交的計算方式。預設值與即時相同為 MollerTrumbore，因此離線會產生與即時相同的幾何統計。

**呼叫方式** — 核心在 `st_off_mesh_create` 時固定於網格，因此只套用到此呼叫 **之後加入的網格**（不追溯既有網格，各網格核心不同也是有效的配置）。通常在建立網格之前呼叫一次。三種核心皆為雙面相交，沒有背面剔除。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `kind` | `0` = MollerTrumbore（預設）/ `1` = PluckerAdaptive / `2` = Watertight |

**回傳值** — `1` = 套用 / `0` = 錯誤的 `kind` 或沒有情境。

</details>

<details>
<summary><code>st_off_scene_get_triangle_intersection</code> — 讀取將套用到下一個網格的相交核心</summary>

```c
int st_off_scene_get_triangle_intersection(const STOFF_Context* context);
```

**用途** — 確認以 `st_off_scene_set_triangle_intersection` 指定的值。

**呼叫方式** — 隨時可呼叫。值為 **將套用到下一次 `st_off_mesh_create`** 的核心，可能與已建立網格的核心不同。執行緒：`[control]` — 只持有場景讀取鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight.

</details>

<details>
<summary><code>st_off_scene_raycast</code> — 以引擎加速結構查詢最近命中</summary>

```c
int st_off_scene_raycast(STOFF_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**用途** — 對傳播所使用的同一個加速結構（靜態+動態 TLAS）發射一條光線，回傳最近的命中。讓主機能獨立於自己的物理引擎，確認·除錯引擎實際看到的聲學幾何。

**呼叫方式** — 在 `st_off_build` 之後呼叫。建置前呼叫不會出錯而是未命中。這是唯讀查詢，不會改變管線狀態。是否支援為 `ST_CAP_SCENE_RAYCAST`。執行緒：`[control]` — 只持有場景讀取鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `origin` | 光線原點，世界座標 3 分量（場景單位）。必須為有限值 |
| `direction` | 光線方向 3 分量。由引擎正規化，必須為有限值且不可為零向量 |
| `maxDistanceMeters` | 最大距離（公尺）。以 `sceneRatio` 換回場景單位後套用。`≤ 0` 或非有限值 = 無限 |
| `outHit` | 結果。呼叫端須填入 `structSize = sizeof(STRayHit)`、`apiVersion = ST_ABI_VERSION` |

**結構體** `STRayHit`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入 |
| `hit` | `1` = 命中 / `0` = 未命中 |
| `distanceMeters` | 從原點到命中點的距離（場景距離 × `sceneRatio`）。未命中時為 0 |
| `point[3]` | 命中點，維持場景座標。未命中時為 0 |
| `normal[3]` | 命中三角形的單位幾何法線。恆對齊為朝向光線原點（不保留繞向正負號），未命中時為 0 |
| `objectId` | 命中的物件 id。未命中時為 `-1` |
| `meshId` | 該物件的網格 id。未命中時為 `-1` |
| `triangleIndex` | 網格本地三角形索引。未命中時為 `-1` |
| `materialIndex` | 該三角形的材質索引。未命中時為 `-1` |
| `reserved[6]` | 保留 |

`0` 是有效的 id，因此未命中判定務必以 `hit`（或 id 是否為 `-1`）進行。

**回傳值** — `1` = 呼叫成功（是否命中看 `outHit->hit`，未命中不算失敗）/ `0` = `context`·指標為 `NULL`、戳記不一致（`ST_STATUS_VERSION_MISMATCH`）、`origin`·`direction` 非有限或 `direction` 為零向量（`ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_mesh_create</code> — 註冊三角形網格</summary>

```c
STMeshId st_off_mesh_create(STOFF_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**用途** — 註冊用作聲學幾何的三角形網格。在註冊時編譯繞射用的聲學邊拓撲並固定相交核心。網格本身不會放進場景，必須以 `st_off_object_create` 建立實例才會參與傳播。

**呼叫方式** — 註冊材質，必要時設定 `st_off_scene_set_triangle_intersection`·`st_off_scene_set_edge_split_collinear_overlaps` 之後呼叫。材質以兩種方式之一指定 — `triangleMaterialIndices` 為 `NULL` 時整個網格使用單一 `material`，非 `NULL` 時為每個三角形提供材質索引，此時忽略 `material` 引數（是否支援 `ST_CAP_PER_TRIANGLE_MATERIALS`）。在單一網格內保持繞向一致 — 部分反轉的繞向可能使厚度為 0 的板失去繞射邊。與即時 `st_rt_mesh_create` 為完全相同的約定。執行緒：`[control, blocking]` — 聲學邊拓撲編譯可能依網格大小耗時較久。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 網格資料。引擎在呼叫期間讀入 |
| `material` | 整個網格的材質控制代碼（僅在 `triangleMaterialIndices == NULL` 時使用） |
| `triangleMaterialIndices` | 各三角形材質索引陣列（`mesh->numTriangles` 個，材質控制代碼的 `v` 值）。`NULL` 時使用單一 `material` |

**結構體** `STMesh`

| 欄位 | 說明 |
|---|---|
| `numVertices` | 頂點數（> 0） |
| `vertices` | xyz 相連的頂點陣列（`numVertices × 3` float），網格本地座標（場景單位） |
| `numTriangles` | 三角形數（> 0） |
| `triangles` | 頂點索引陣列（`numTriangles × 3` int） |

**回傳值** — 網格控制代碼 `STMeshId`。失敗時 `v < 0`（情境·`mesh`·陣列為 `NULL`，或頂點·三角形數為 0 以下等）。

</details>

<details>
<summary><code>st_off_object_create</code> — 以矩陣變換將網格實例放入場景</summary>

```c
STObjectId st_off_object_create(STOFF_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**用途** — 將已註冊的網格連同世界變換放入場景，使其參與傳播。多個物件可共用同一網格。

**呼叫方式** — 在 `st_off_mesh_create` 之後、`st_off_build` 之前呼叫。靜態物件（`isDynamic = 0`）進入靜態加速結構，動態物件進入動態 TLAS，以 `st_off_object_set_transform*` 移動後以 `st_off_build_dynamic` 更新。要以四元數放置請使用 `st_off_object_create_q`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | `st_off_mesh_create` 回傳的網格控制代碼 |
| `transform` | 網格本地 → 世界變換 |
| `isDynamic` | `0` = 靜態 / 其他 = 動態 |

**結構體** `STTransform`

| 欄位 | 說明 |
|---|---|
| `m00, m01, m02` / `m10, m11, m12` / `m20, m21, m22` | 3×3 旋轉·縮放，列優先（row-major） |
| `tx, ty, tz` | 平移（場景單位） |

點以行向量相乘：`x' = m00·x + m01·y + m02·z + tx`、`y' = m10·x + m11·y + m12·z + ty`、`z' = m20·x + m21·y + m22·z + tz`。也接受非均勻縮放與行列式為負的變換（鏡像·負縮放）。

**回傳值** — 物件控制代碼 `STObjectId`。失敗時 `v < 0`。

</details>

<details>
<summary><code>st_off_object_create_q</code> — 以位置·四元數·縮放將網格實例放入場景</summary>

```c
STObjectId st_off_object_create_q(STOFF_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**用途** — `st_off_object_create` 的四元數版。可將遊戲引擎的 TRS（位置·旋轉·縮放）表示直接傳入，無需轉換為矩陣。

**呼叫方式** — 與 `st_off_object_create` 相同（`st_off_build` 之前，動態時之後再 `st_off_build_dynamic`）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 網格控制代碼 |
| `position` | 位置 xyz（場景單位） |
| `quatXYZW` | 本地 → 世界旋轉四元數，**XYZW 順序**。由引擎正規化，`norm < 1e-12` 時以恆等取代 |
| `scale` | 各軸縮放 xyz。以 R·S 合成，允許非均勻 |
| `isDynamic` | `0` = 靜態 / 其他 = 動態 |

**回傳值** — 物件控制代碼 `STObjectId`。失敗時 `v < 0`。

</details>

<details>
<summary><code>st_off_source_create</code> — 建立音源</summary>

```c
STSourceId st_off_source_create(STOFF_Context* context, const STSourceDesc* source);
```

**用途** — 在場景中加入要計算 IR 的音源。離線情境的音源不接受音訊輸入（檔案·串流），與聆聽者配對成為 IR 計算·渲染的對象。與即時不同，沒有音源數預算。

**呼叫方式** — 構成場景後、`st_off_ir_compute` 之前建立。建立後的狀態與即時相同 — source energy 1.0、4 種路徑音量 1.0、無指向性表、方向為對齊 `direction` 的無 roll 旋轉、傳輸更新階段數 0。之後的位置·方向·光線數·深度·EQ·指向性等以 `st_off_source_set_*` 變更。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源描述子。所有值必須為有限值，且 `intensity ≥ 0` |

**結構體** `STSourceDesc`

| 欄位 | 說明 |
|---|---|
| `positionX, positionY, positionZ` | 位置（場景單位） |
| `directionX, directionY, directionZ` | 正面方向。建立對齊此方向的無 roll 音源座標系 |
| `velocityX, velocityY, velocityZ` | 速度（場景單位/秒）。以 `sceneRatio` 換算為 m/s，用於都卜勒輻射增益（`st_off_set_doppler_gain_mode`） |
| `intensity` | 無因次線性 **聲壓** 增益（≥ 0）。不是聲強（W/m²）·SPL·Pa。另外的能量倍率為 `st_off_source_set_energy` |
| `directional` | `0` = 無指向（onAxis = offAxis = 1）/ 其他 = 指向設定檔（onAxis = 1，offAxis = 0） |
| `isDynamic` | `1` = 動態 / `0` = 靜態。離線中靜態音源的傳輸在每次計算時烘焙一次並固定，動態音源每次計算都完整重新追蹤 |

**回傳值** — 音源控制代碼 `STSourceId`。失敗時 `v < 0`（`NULL`、非有限值、負的 `intensity` 為 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_listener_create</code> — 再建立一個聆聽者</summary>

```c
STListenerId st_off_listener_create(STOFF_Context* context);
```

**用途** — 離線情境可以有多個聆聽者。用於以一次 `st_off_ir_compute` 取得同一場景中多個聆聽位置的 IR。這是即時 DLL 中沒有的離線專用函式。

**呼叫方式** — 建立情境時會自動建立一個聆聽者（id `1`）並為啟用狀態。其他每個聆聽位置呼叫此函式。新聆聽者不會自動成為啟用 — 聆聽者位置·方向 setter（`st_off_listener_set_position` 等）套用於 **啟用聆聽者**，因此以 `st_off_listener_set_active` 切換後再指定姿態。IR 計算針對每個已註冊的聆聽者進行，渲染·原始 IR 查詢函式以聆聽者控制代碼為引數。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 新聆聽者控制代碼 `STListenerId`。失敗時 `v < 0`。

</details>

<details>
<summary><code>st_off_listener_set_active</code> — 變更啟用聆聽者</summary>

```c
void st_off_listener_set_active(STOFF_Context* context, STListenerId listener);
```

**用途** — 選擇聆聽者姿態 setter（`st_off_listener_set_position` · `_set_rotation` · `_set_orientation_q` · `_set_rotation_ypr`）要套用到哪個聆聽者。

**呼叫方式** — 使用多個聆聽者時，在指定各聆聽者姿態之前呼叫。聆聽者控制代碼不存在時不做任何變更。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `listener` | 要設為啟用的聆聽者控制代碼 |

**回傳值** — 無。是否已切換以 `st_off_listener_get_active` 確認。

</details>

<details>
<summary><code>st_off_listener_get_active</code> — 讀取目前的啟用聆聽者</summary>

```c
STListenerId st_off_listener_get_active(const STOFF_Context* context);
```

**用途** — 確認姿態 setter 目前以哪個聆聽者為對象。

**呼叫方式** — 隨時可呼叫。建立後的值為自動建立的聆聽者 `1`。執行緒：`[any]` — atomic 讀取。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 啟用聆聽者控制代碼。`context` 為 `NULL` 時 `v = -1`。

</details>

<details>
<summary><code>st_off_listener_destroy</code> — 刪除聆聽者</summary>

```c
int st_off_listener_destroy(STOFF_Context* context, STListenerId listener);
```

**用途** — 移除不再需要計算的聆聽位置，減少下一次計算的成本。

**呼叫方式** — 啟用聆聽者無法刪除 — 先以 `st_off_listener_set_active` 切換到其他聆聽者。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `listener` | 要刪除的聆聽者控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 沒有情境、聆聽者不存在，或為啟用聆聽者。

</details>

<details>
<summary><code>st_off_source_set_position</code> — 變更音源位置</summary>

```c
void st_off_source_set_position(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 移動音源。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。變更會反映在下一次計算中。與即時不同，沒有運動佇列，會立即套用到場景。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `x`, `y`, `z` | 世界位置（場景單位） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_source_set_direction</code> — 變更音源正面方向</summary>

```c
void st_off_source_set_direction(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**用途** — 轉動指向性音源（錐形或指向性表）的正面。

**呼叫方式** — 與音源座標系（`st_off_source_set_orientation_q`）雙向同步 — 呼叫此函式時，座標系會成為「從 +Z 轉向此方向的無 roll 最小旋轉」。需要 roll 時請改用 `st_off_source_set_orientation_q`。變更會反映在下一次 `st_off_ir_compute` 中。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `x`, `y`, `z` | 世界方向向量 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_listener_set_position</code> — 變更啟用聆聽者的位置</summary>

```c
void st_off_listener_set_position(STOFF_Context* context, float x, float y, float z);
```

**用途** — 指定聆聽位置。

**呼叫方式** — 套用於 **啟用聆聽者**（多個聆聽者以 `st_off_listener_set_active` 切換後指定）。方向維持不變。變更會反映在下一次 `st_off_ir_compute` 中。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `x`, `y`, `z` | 世界位置（場景單位） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_listener_set_rotation</code> — 以 yaw·pitch 設定啟用聆聽者的方向</summary>

```c
void st_off_listener_set_rotation(STOFF_Context* context, float yaw, float pitch);
```

**用途** — 指定雙耳·空間化渲染作為基準的聆聽者頭部方向。

**呼叫方式** — 套用於啟用聆聽者。旋轉為 R = Ry(yaw)·Rx(pitch)，yaw = pitch = 0 時 forward = +Z、up = +Y、right = +X。forward = (sin(yaw)·cos(pitch), −sin(pitch), cos(yaw)·cos(pitch))。要從方向向量 d 反求時為 `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`。無法表示 roll — 需要時請使用 `st_off_listener_set_rotation_ypr` 或 `st_off_listener_set_orientation_q`。三個聆聽者方向 setter 以最後呼叫的一方生效。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `yaw` | 弧度。正值 = 從上方俯視時順時針（向右轉） |
| `pitch` | 弧度。正值 = 向下看 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_listener_set_orientation_q</code> — 以四元數設定啟用聆聽者的方向</summary>

```c
int st_off_listener_set_orientation_q(STOFF_Context* context, const float quatXYZW[4]);
```

**用途** — 將包含 roll（頭部傾斜）的聆聽者方向以遊戲引擎的四元數原樣傳入。

**呼叫方式** — 套用於啟用聆聽者。本地軸為 forward = +Z · up = +Y · right = +X，與音源 `orientation_q` 為相同順序·相同驗證。yaw/pitch 表示相當於 q = q_y(yaw)·q_x(pitch) 的 roll 0 情況。三個聆聽者方向 setter 以最後呼叫的一方生效。是否支援為字組 1 的 `ST_CAP1_LISTENER_ORIENTATION_Q`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `quatXYZW` | 本地 → 世界單位四元數，**XYZW 順序**。由引擎正規化 |

**回傳值** — `1` = 成功 / `0` = 失敗。非有限分量或退化（`norm < 1e-12`）為 `ST_STATUS_INVALID_ARGUMENT`，且不做任何變更。

</details>

<details>
<summary><code>st_off_listener_set_rotation_ypr</code> — 以 yaw·pitch·roll 設定啟用聆聽者的方向</summary>

```c
int st_off_listener_set_rotation_ypr(STOFF_Context* context, float yaw, float pitch, float roll);
```

**用途** — 在 `st_off_listener_set_rotation` 上加入 roll 的歐拉角版。

**呼叫方式** — 套用於啟用聆聽者。旋轉為 R = Ry(yaw)·Rx(pitch)·Rz(roll)，與 Unity `Quaternion.Euler(pitch, yaw, roll)`（度 → 弧度）順序相同。`roll = 0` 時與 `st_off_listener_set_rotation(yaw, pitch)` 為相同矩陣。三個聆聽者方向 setter 以最後呼叫的一方生效。是否支援為 `ST_CAP1_LISTENER_ORIENTATION_Q`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `yaw` | 弧度。正值 = 向右轉 |
| `pitch` | 弧度。正值 = 向下看 |
| `roll` | 弧度。正值 = right 軸向上傾斜（頭向左傾、右耳抬高） |

**回傳值** — `1` = 成功 / `0` = 失敗。非有限值為 `ST_STATUS_INVALID_ARGUMENT`，且不做任何變更。

</details>

<details>
<summary><code>st_off_object_set_transform</code> — 以矩陣變更物件變換</summary>

```c
void st_off_object_set_transform(STOFF_Context* context, STObjectId object, const STTransform* transform);
```

**用途** — 移動已放置的物件，或對其旋轉、縮放。

**呼叫方式** — 變更後須反映到加速結構才會用於下一次計算 — 動態物件用 `st_off_build_dynamic`（動態 TLAS refit），靜態物件用 `st_off_build`（完整建置）。四元數版本為 `st_off_object_set_transform_q`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `object` | 物件控制代碼 |
| `transform` | 新的區域 → 世界變換。`STTransform` 欄位請參考 `st_off_object_create` 條目 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_object_set_transform_q</code> — 以位置、四元數、縮放變更物件變換</summary>

```c
void st_off_object_set_transform_q(STOFF_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**用途** — `st_off_object_set_transform` 的四元數版本。與即時 `st_rt_object_set_transform_q` 契約相同。

**呼叫方式** — 與 `st_off_object_set_transform` 相同（之後呼叫 `st_off_build_dynamic` 或 `st_off_build`）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `object` | 物件控制代碼 |
| `position` | 位置 xyz（場景單位） |
| `quatXYZW` | 旋轉四元數，**XYZW 順序**。由引擎正規化 |
| `scale` | 各軸縮放 xyz（允許非均勻） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_source_destroy</code> — 刪除音源</summary>

```c
int st_off_source_destroy(STOFF_Context* context, STSourceId source);
```

**用途** — 從場景移除音源。音源 EQ 等各音源設定也一併消失。

**呼叫方式** — 從下一次 `st_off_ir_compute` 起不再計算該音源。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 無情境或音源不存在。

</details>

<details>
<summary><code>st_off_mesh_destroy</code> — 刪除網格</summary>

```c
int st_off_mesh_destroy(STOFF_Context* context, STMeshId mesh);
```

**用途** — 移除已註冊的網格。

**呼叫方式** — 變更場景組成後，以 `st_off_build` 重新建置加速結構。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 網格控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 無情境或移除失敗。

</details>

<details>
<summary><code>st_off_object_destroy</code> — 刪除物件</summary>

```c
int st_off_object_destroy(STOFF_Context* context, STObjectId object);
```

**用途** — 將已放置的網格實例從場景中移除。

**呼叫方式** — 變更場景組成後，以 `st_off_build` 重新建置加速結構。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `object` | 物件控制代碼 |

**回傳值** — `1` = 已移除 / `0` = 無情境或物件不存在。

</details>

<details>
<summary><code>st_off_mesh_set_material</code> — 變更網格材質</summary>

```c
int st_off_mesh_set_material(STOFF_Context* context, STMeshId mesh, STMaterialId material);
```

**用途** — 不重新註冊幾何，只替換網格的材質。用於材質 A/B 比較。

**呼叫方式** — 變更會反映到下一次 `st_off_ir_compute`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mesh` | 網格控制代碼 |
| `material` | 新材質控制代碼 |

**回傳值** — `1` = 成功 / `0` = 無情境、網格或材質不存在。

</details>

<details>
<summary><code>st_off_source_set_ray_count</code> — 設定音源的傳輸射線格點大小</summary>

```c
void st_off_source_set_ray_count(STOFF_Context* context, STSourceId source, int width, int height);
```

**用途** — 設定從音源發射的擴散傳輸（diffuse transport）射線數量。射線數 N = `width × height`，增加後殘響與擴散成分的統計更穩定，但計算成本也隨之增加。

**呼叫方式** — 在 `st_off_ir_compute` 之前針對每個音源呼叫。預設為 16 × 8。若為無法接受的值，則不變更設定，並在 `st_off_get_last_status` 留下 `ST_STATUS_INVALID_ARGUMENT`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `width` | 格點水平射線數（預設 16） |
| `height` | 格點垂直射線數（預設 8） |

**回傳值** — 無。失敗以 `st_off_get_last_status` 確認。

</details>

<details>
<summary><code>st_off_source_set_depth</code> — 設定各音源的最大反射深度</summary>

```c
void st_off_source_set_depth(STOFF_Context* context, STSourceId source, int depth);
```

**用途** — 為每個音源個別設定從該音源追蹤的反射階數上限。用於只深入追蹤重要音源以分配成本。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。預設為每個音源 4（全域上限為 `st_off_set_max_depth`，預設 8）。若為無法接受的值，則在 `st_off_get_last_status` 留下 `ST_STATUS_INVALID_ARGUMENT`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `depth` | 最大反射深度（預設 4） |

**回傳值** — 無。失敗以 `st_off_get_last_status` 確認。

</details>

<details>
<summary><code>st_off_source_set_energy</code> — 設定音源的能量倍率</summary>

```c
int st_off_source_set_energy(STOFF_Context* context, STSourceId source, float energy);
```

**用途** — 以獨立於 `STSourceDesc.intensity`（壓力域增益）的 **能量域** 相對倍率調整音源強度。是否支援見 `ST_CAP_SOURCE_ENERGY`。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。預設為 1.0。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `energy` | 能量倍率。必須為有限值且 `≥ 0`（預設 1.0） |

**回傳值** — `1` = 成功 / `0` = 無情境、非有限或負值、音源不存在。

</details>

<details>
<summary><code>st_off_source_set_transport_refresh_steps</code> — 儲存各音源的傳輸更新步數</summary>

```c
int st_off_source_set_transport_refresh_steps(STOFF_Context* context, STSourceId source, int steps);
```

**用途** — 在即時情境中，讓音源的傳輸射線格點 N 分攤到 n 次傳播中更新的值。離線也有相同的 setter，是為了讓主機能將同一場景設定原樣重播到即時情境，使值得以來回傳遞。

**呼叫方式** — 離線情境不使用滾動傳輸，因此 **忽略動態音源的 n，每次計算皆全量重新追蹤**（有效 n = 1）。因此同一場景、同一輸入無論計算幾次都得到相同的 RIR。靜態音源與 n 無關，每次計算都固定為一次烘焙的結果。值本身會被儲存，`st_off_source_get_transport_refresh_steps` 原樣回傳。與即時 `st_rt_source_set_transport_refresh_steps` 的簽章與回傳契約相同。是否支援見 `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `steps` | `0` = 預設（由外殼、音源旗標決定） / `1` = 每次傳播全量重新追蹤 / `≥ 2` = 分 n 次更新（即時中 clamp 到 `[1, N]`）。負值拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗：負的 `steps` 為 `ST_STATUS_INVALID_ARGUMENT`，音源不存在為 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_get_transport_refresh_steps</code> — 讀取已儲存的傳輸更新步數</summary>

```c
int st_off_source_get_transport_refresh_steps(const STOFF_Context* context, STSourceId source);
```

**用途** — 確認以 `st_off_source_set_transport_refresh_steps` 儲存的值。

**呼叫方式** — 隨時可呼叫。回傳的不是有效 n，而是 **原樣的儲存值**（包含 0） — 離線動態音源的有效值永遠是 1。執行緒：`[control]` — 只取得場景讀取鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |

**回傳值** — 已儲存的步數（`≥ 0`）。失敗為 `-1`。

</details>

<details>
<summary><code>st_off_source_set_orientation_q</code> — 以四元數設定音源區域座標框架</summary>

```c
int st_off_source_set_orientation_q(STOFF_Context* context, STSourceId source, const float quatXYZW[4]);
```

**用途** — 將音源的區域座標框架連同 roll 一起放到世界中。指向性表以此框架為基準查詢，因此使用表的音源以此函式指定方向。

**呼叫方式** — 區域軸為 forward = +Z / up = +Y / right = +X。與 `st_off_source_set_direction` 雙向同步 — 在此給定框架時 direction = forward(q) 會一併變更，呼叫 direction setter 時框架成為不含 roll 的最小旋轉。需要 roll 時務必使用此函式。與即時 `st_rt_source_set_orientation_q` 契約相同。是否支援見 `ST_CAP_SOURCE_DIRECTIVITY`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `quatXYZW` | 區域 → 世界的單位四元數，**XYZW 順序**。由引擎正規化 |

**回傳值** — `1` = 成功 / `0` = 失敗：非有限分量或退化（`norm < 1e-12`）為 `ST_STATUS_INVALID_ARGUMENT`，音源不存在為 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_set_directivity</code> — 附加或移除音源指向性表</summary>

```c
int st_off_source_set_directivity(STOFF_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**用途** — 以量測或製作的方位角 × 仰角 × 9 頻帶能量表指定音源的輻射模式。比單純的正面/側面錐體更能準確呈現實際音源（樂器、喇叭、人聲等）的輻射。

**呼叫方式** — 附加表期間，使用表取代錐體衰減（由 `STSourceDesc.directional` 產生的 on/off-axis），以 `table = NULL` 移除後則回到錐體公式。引擎會 **複製** 表，因此呼叫返回後可釋放主機緩衝區。查詢方向以音源框架為基準，因此與 `st_off_source_set_orientation_q` 搭配使用。與即時 `st_rt_source_set_directivity` 契約相同。是否支援見 `ST_CAP_SOURCE_DIRECTIVITY`。執行緒：`[control]` — 表的複製與正規化純量計算在此呼叫中進行一次。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `table` | 指向性表。呼叫端填入 `structSize`/`apiVersion`。`NULL` 則移除表 |

**結構體** `STSourceDirectivity`

| 欄位 | 說明 |
|---|---|
| `structSize` / `apiVersion` | 由呼叫端填入 |
| `azCount` | 方位角節點數，`[3, 361]`。節點 az_i = i·360/azCount（在 360° 處 wrap） |
| `elCount` | 仰角節點數，`[2, 181]`。節點 el_j = −90 + j·180/(elCount−1)。奇數時水平面（0°）會落在節點上。建議格點為 5° 間隔（72 × 37） |
| `levelMode` | `STDirectivityLevelMode` — `ST_DIRECTIVITY_ABSOLUTE`（0，直接使用值：用於含絕對電平的量測資料） / `ST_DIRECTIVITY_POWER_MEAN`（1，正規化使各頻帶球面功率平均為 1：只用模式、總功率由 intensity/energy 決定時，建議） / `ST_DIRECTIVITY_ON_AXIS`（2，正規化使正面值為 1） |
| `reserved0` | 保留 |
| `energy` | `elCount × azCount × ST_FREQUENCY_BANDS` 個 float，佈局 `[el][az][band]`（band 變化最快）。**能量域**，有限且 `≥ 0` |
| `reserved[6]` | 保留 |

方向約定為在音源區域框架中 az = atan2(x, z)（正面 0，右側 +90°）、el = asin(y)（向上為 +），查詢為 az wrap · el clamp 雙線性內插。

**回傳值** — `1` = 成功（包含移除表） / `0` = 失敗：戳記不符為 `ST_STATUS_VERSION_MISMATCH`，`levelMode`、`azCount`、`elCount` 超出範圍、`energy` 為 `NULL`、非有限或負元素為 `ST_STATUS_INVALID_ARGUMENT`（原因見 `st_off_get_last_error`），音源不存在為 `ST_STATUS_NOT_FOUND`。

</details>

<details>
<summary><code>st_off_source_set_eq</code> — 對音源原音套用 9 頻帶圖形 EQ</summary>

```c
int st_off_source_set_eq(STOFF_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 以 9 頻帶修正音源訊號本身的音色。套用在分頻器之前，因此該音源的所有路徑（直接、透射、反射、繞射）與殘響送出都套用同一濾波器。與即時 `st_rt_source_set_eq` 實作相同，產生相同結果。

**呼叫方式** — 為渲染專用設定，不會使 IR 快取失效 — 不必重新執行 `st_off_ir_compute`，只要重新渲染即可立即反映（壓力 IR 的獨奏、混合、批次渲染皆然）。`gainsDb = NULL` 或所有頻帶 0 dB 時關閉 EQ，其結果與無 EQ 時位元相同。設定保留至音源刪除為止，`st_off_trim_memory` 之後也會保留。與參數 EQ（`st_off_source_set_parametric_eq`）共用同一 EQ，最後呼叫的 setter 生效。是否支援見 `ST_CAP_SOURCE_EQ`。執行緒：`[control]` — 取得場景讀取鎖與聲化器控制鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `gainsDb` | 各頻帶增益（dB），依 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz 順序。必須為有限值且在 `[−ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`（±24 dB）範圍內，不 clamp 而是拒絕。`NULL` = 關閉 |

濾波器在每個頻帶各一個 RBJ 峰值 biquad（中心 = 頻帶中心，Q = 1.414），在 44100 Hz 下依升序串聯。相鄰頻帶的響應會重疊，因此若希望在頻帶中心精確得到指定值，須由主機修正增益後再傳入。

**回傳值** — `1` = 成功 / `0` = 失敗：非有限值或超出範圍為 `ST_STATUS_INVALID_ARGUMENT`（不做任何變更），音源不存在為 `ST_STATUS_NOT_FOUND`，不支援音源 EQ 的後端（Exa）為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_source_get_eq</code> — 以 9 頻帶增益讀取音源 EQ</summary>

```c
int st_off_source_get_eq(STOFF_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**用途** — 以 9 頻帶圖形 EQ 檢視回傳目前的音源 EQ。

**呼叫方式** — 隨時可呼叫。EQ 關閉時全部為 0。若以參數 EQ 設定了非 9 頻帶形狀的設定，則無法以圖形檢視表示而失敗 — 得到 `0` + `ST_STATUS_UNAVAILABLE` 時呼叫 `st_off_source_get_parametric_eq`，成功則從那邊讀取設定，若以相同的 `UNAVAILABLE` 失敗，表示後端不支援音源 EQ。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `outGainsDb` | 接收 9 頻帶增益（dB）的陣列 |

**回傳值** — `1` = 成功 / `0` = 失敗：`outGainsDb` 為 `NULL` 時為 `ST_STATUS_INVALID_ARGUMENT`，音源不存在為 `ST_STATUS_NOT_FOUND`，`ST_STATUS_UNAVAILABLE`（後端不支援或無法以 9 頻帶表示的參數設定 — 此時不動 `outGainsDb`）。

</details>

<details>
<summary><code>st_off_source_set_parametric_eq</code> — 對音源原音套用參數 EQ</summary>

```c
int st_off_source_set_parametric_eq(STOFF_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**用途** — 以比 9 頻帶固定 EQ 更自由的頻帶清單（峰值、擱架、LP、HP、陷波）修正音源音色。與 `st_off_source_set_eq` 是 **同一 EQ**，套用位置（分頻器之前，該音源的所有路徑）也相同。AutoEq 設定檔可用 `st_off_render_parse_autoeq_parametric` 讀取後直接傳入。

**呼叫方式** — 離線下無斜坡、立即變更，壓力渲染的獨奏、混合、批次皆套用同一濾波器。不會使 IR 快取失效，因此只要重新渲染即可反映。兩個音源 EQ setter 都會替換整個清單，最後呼叫者生效。關閉的清單或無效果的清單也會被儲存，若要關閉並清除，請呼叫 `st_off_source_set_eq(context, source, NULL)`。設定保留至音源刪除為止。與即時 `st_rt_source_set_parametric_eq` 契約相同、實作相同。是否支援見字組 1 的 `ST_CAP1_SOURCE_PARAMETRIC_EQ`。執行緒：`[control]` — 取得場景讀取鎖與聲化器控制鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `bands` | 頻帶陣列（`bandCount` 個）。`bandCount = 0` 時可為 `NULL` |
| `bandCount` | 頻帶數，`[0, ST_PARAMETRIC_EQ_MAX_BANDS]`（16） |
| `preampDb` | 前級（dB），clamp 到 `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]`（−48 ~ +12）。主要用途是防止削波的負值 |
| `enabled` | `0` = 儲存清單但直通 / 其他 = 開啟 |

**結構體** `STParametricEqBand`

| 欄位 | 說明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | `0` = 此頻帶為恆等（略過） / 其他 = 開啟 |
| `frequencyHz` | 中心（PEAKING、NOTCH）或轉角（擱架中點、LP、HP）頻率。clamp 到 `[20, min(20000, 0.49·44100)]` |
| `gainDb` | 僅 PEAKING、擱架使用。clamp 到 `[−24, +24]` |
| `q` | `[0.1, 30]`，擱架 clamp 到 `[0.1, 3]` |
| `reserved[3]` | 必須為 `0` |

非有限值、未知 `type`、`reserved ≠ 0`、頻帶數超出範圍皆拒絕（不做任何變更），有限值則 clamp 到上述範圍。濾波器在每個頻帶為 RBJ 二階段（44100 Hz，double），鏈為前級 → 頻帶 0..count−1 串聯。

**回傳值** — `1` = 成功 / `0` = 失敗：`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_NOT_FOUND`（無音源） / `ST_STATUS_UNAVAILABLE`（Exa 後端）。

</details>

<details>
<summary><code>st_off_source_get_parametric_eq</code> — 以參數頻帶清單讀取音源 EQ</summary>

```c
int st_off_source_get_parametric_eq(STOFF_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**用途** — 以 clamp 後有效值的頻帶清單回傳目前的音源 EQ。以 9 頻帶 setter 設定的內容也會讀成 9 個 PEAKING 頻帶。

**呼叫方式** — 不知道大小時，先以 `outBands = NULL` 呼叫取得頻帶數。給予 `ST_PARAMETRIC_EQ_MAX_BANDS` 個容量則一定放得下。無 EQ 時為 0 頻帶、關閉。輸出約定與即時 `st_rt_render_get_parametric_eq` 相同。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `outBands` | 接收頻帶的陣列。`NULL` 則為大小查詢（不寫入頻帶） |
| `bandCapacity` | `outBands` 的元素數（`≥ 0`） |
| `outBandCount` | 頻帶數。`NULL` 則略過 |
| `outPreampDb` | 前級（dB）。`NULL` 則略過 |
| `outEnabled` | 是否開啟。`NULL` 則略過 |

`STParametricEqBand` 欄位請參考 `st_off_source_set_parametric_eq` 條目。

**回傳值** — `1` = 成功（包含大小查詢） / `0` = 失敗：`bandCapacity < 0` 為 `ST_STATUS_INVALID_ARGUMENT`，容量小於頻帶數為 `ST_STATUS_BUFFER_TOO_SMALL`（仍寫入頻帶數、前級、開啟狀態），音源不存在為 `ST_STATUS_NOT_FOUND`，Exa 後端為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_source_set_path_volume</code> — 設定音源各路徑種類的音量</summary>

```c
int st_off_source_set_path_volume(STOFF_Context* context, STSourceId source, int volumeKind, float volume);
```

**用途** — 個別增減單一音源的直達音、反射、繞射、殘響貢獻。用於保留物理結果的同時，需要從混音角度調整時。是否支援見 `ST_CAP_SOURCE_PATH_VOLUME`。

**呼叫方式** — 預設四種皆為 1.0。值為 **壓力域** 線性倍率。執行緒：`[control]` — 只取得場景讀取鎖。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `source` | 音源控制代碼 |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`（0，包含透射） / `ST_SOURCE_VOLUME_REFLECTION`(1) / `ST_SOURCE_VOLUME_DIFFRACTION`(2) / `ST_SOURCE_VOLUME_REVERB`（3，只調整此音源驅動聆聽者共用殘響槽的量） |
| `volume` | 線性壓力倍率。有限且 `≥ 0`（預設 1.0） |

**回傳值** — `1` = 成功 / `0` = 無情境、`volumeKind` 超出範圍、非有限或負的 `volume`、音源不存在。

</details>

<details>
<summary><code>st_off_set_path_type_enabled</code> — 全域開關路徑種類</summary>

```c
void st_off_set_path_type_enabled(STOFF_Context* context, int pathType, int enabled);
```

**用途** — 將直達音、透射、反射、繞射、殘響中的特定路徑種類排除於計算之外，以分別聆聽各成分對結果的貢獻，或降低成本。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。預設五種皆開啟。與 `st_off_set_acoustic_feature_enabled` 組合，只靠設定即可做出「只保留距離衰減 + 聲像」的基準線。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |
| `enabled` | `0` = 關閉 / 其他 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_set_acoustic_feature_enabled</code> — 開關個別聲學功能</summary>

```c
int st_off_set_acoustic_feature_enabled(STOFF_Context* context, int feature, int enabled);
```

**用途** — 逐一開關空氣吸收、傳播延遲、直達音遮蔽，進行聆聽 A/B 比較。與即時 `st_rt_set_acoustic_feature_enabled` 契約相同。

**呼叫方式** — 預設三種功能皆開啟（照物理原樣）。這是 IR 策略設定，呼叫後 IR 快取會失效，因此渲染前請重新呼叫 `st_off_ir_compute`。關閉反射、繞射、殘響（`st_off_set_path_type_enabled`）並關閉三種功能，則只剩距離衰減 + 聲像。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`（0，大氣衰減、高頻損失） / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`（1，基於路徑長度的傳播延遲） / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`（2，直達音可見性檢查） |
| `enabled` | `0` = 關閉 / 其他 = 開啟 |

**回傳值** — `1` = 成功 / `0` = `feature` 超出範圍或失敗。

</details>

<details>
<summary><code>st_off_is_acoustic_feature_enabled</code> — 讀取聲學功能是否開啟</summary>

```c
int st_off_is_acoustic_feature_enabled(const STOFF_Context* context, int feature);
```

**用途** — 確認以 `st_off_set_acoustic_feature_enabled` 指定的狀態。

**呼叫方式** — 隨時可呼叫。執行緒：`[control]` — 不取鎖讀取引擎狀態。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `feature` | `ST_ACOUSTIC_FEATURE_*`(0~2) |

**回傳值** — `1` = 開啟 / `0` = 關閉 / `-1` = 無情境。

</details>

<details>
<summary><code>st_off_set_late_coupling</code> — 個別設定 late 殘響耦合衰減參數</summary>

```c
int st_off_set_late_coupling(STOFF_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**用途** — 依聆聽者與音源擴散場的耦合程度（可見比例）衰減 late 殘響注入。殘響槽是完全混合的單一空間，預設在任何位置聽起來大小都相同；此選項用於修正 ㄈ 字形、口字形等在轉角後分隔的空間中「走遠了殘響卻不變甚至變大」的問題。

**呼叫方式** — 通常 `st_off_set_late_coupling_preset` 就足夠，需要細部調整時才使用此函式。耦合衰減、send 平坦化、rain 方向漫步是設計為一起開啟的組合 — 只開耦合而不平坦化，越遠殘響注入反而可能越大；沒有 rain 漫步，分隔空間另一側的 late 方向樣本會不足。與音源同一空間（可見比例在 `visibleHigh` 以上）時正好為 0 dB。參數組成尚未定案，可能變更。這是 IR 策略，變更的值從下一次 `st_off_ir_compute` 起反映。與即時 `st_rt_set_late_coupling` 契約相同。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `floorDb` | 完全阻斷時的衰減深度（dB）。`0` = 關閉耦合衰減。預設 9 |
| `visibleLow` | 可見比例小於此值時視為完全阻斷，套用底部衰減。`0` → 預設 0.05 |
| `visibleHigh` | 可見比例大於此值時視為同一空間，正好 0 dB。`0` → 預設 0.60 |
| `sendNormalizeTrim` | send 總和平坦化修整。`0` = 不平坦化。預設 0.75 |
| `rainDirectionWalk` | `0` = 關閉 / 其他 = 開啟（預設）。鏈結束後仍持續收集 late 方向樣本（不搬運能量） |

**回傳值** — `1` = 成功 / `0` = 值超出範圍或失敗。

</details>

<details>
<summary><code>st_off_get_late_coupling</code> — 讀取 late 殘響耦合衰減參數</summary>

```c
int st_off_get_late_coupling(const STOFF_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**用途** — 確認目前套用中的 late 耦合衰減設定（以個別 setter 或預設組設定的值）。

**呼叫方式** — 隨時可呼叫。不需要的輸出設為 `NULL`。執行緒：`[control]` — 不取鎖讀取引擎狀態。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `outFloorDb` | 底部衰減深度（dB）。允許 `NULL` |
| `outVisibleLow` | 完全阻斷拐點。允許 `NULL` |
| `outVisibleHigh` | 同一空間拐點。允許 `NULL` |
| `outSendNormalizeTrim` | send 平坦化修整。允許 `NULL` |
| `outRainDirectionWalk` | rain 方向漫步是否開啟。允許 `NULL` |

各值的意義請參考 `st_off_set_late_coupling` 條目。

**回傳值** — `1` = 成功 / `0` = 無情境。

</details>

<details>
<summary><code>st_off_set_late_coupling_preset</code> — 以建議預設組設定 late 殘響耦合衰減</summary>

```c
int st_off_set_late_coupling_preset(STOFF_Context* context, int preset);
```

**用途** — 只選擇底部衰減深度，其餘（兩個拐點、平坦化修整、rain 漫步）以建議值填入的一次性設定。

**呼叫方式** — 預設組的選擇主要是聽感問題 — 在單一房間中可見比例位於拐點之上，衰減不會介入，任何預設組在與音源同一空間時都正好為 0 dB。需要個別調整時使用 `st_off_set_late_coupling`。這是 IR 策略，變更的值從下一次 `st_off_ir_compute` 起反映。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `preset` | `ST_LATE_COUPLING_OFF`（0，耦合衰減、平坦化、rain 漫步全部關閉） / `ST_LATE_COUPLING_SUBTLE`（1，底部 6 dB） / `ST_LATE_COUPLING_DEFAULT`（2，底部 9 dB，引擎預設） / `ST_LATE_COUPLING_STRONG`（3，底部 12 dB） |

**回傳值** — `1` = 成功 / `0` = `preset` 超出範圍或失敗。

</details>

<details>
<summary><code>st_off_set_physical_distance_attenuation</code> — 設定距離衰減的參考距離與最小距離</summary>

```c
void st_off_set_physical_distance_attenuation(STOFF_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**用途** — 設定物理球面擴散（壓力 1/R）距離衰減的參考點與近距離極限。這是引擎唯一的距離衰減法則，壓力增益為 `reference / max(R, min)`。

**呼叫方式** — 預設為參考 1.0 m · 最小 1.0 m（若最小距離小於參考距離，比參考更近時會產生近距離增幅）。兩個值與 `sceneRatio` 無關，**由主機以公尺** 給定 — 因為作為比較對象的路徑長度已換算為公尺。會使 IR 快取失效，因此渲染前請重新呼叫 `st_off_ir_compute`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `referenceDistanceMeters` | 增益為 1 的參考距離（m）。預設 1.0 |
| `minDistanceMeters` | 比此值更近的距離視為此值（m）。預設 1.0 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_set_atmosphere</code> — 設定大氣條件（溫度、濕度、氣壓）</summary>

```c
void st_off_set_atmosphere(STOFF_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**用途** — 指定決定空氣吸收（高頻損失）與音速的大氣狀態。音速不是固定常數，而是在執行期間由此值推導，因此傳播延遲也會一併改變。

**呼叫方式** — 預設為 20.0 °C · 50.0 %RH · 101.325 kPa。會使 IR 快取失效，因此渲染前請重新呼叫 `st_off_ir_compute`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `temperatureC` | 氣溫（°C）。預設 20.0 |
| `relativeHumidityPercent` | 相對濕度（%）。預設 50.0 |
| `pressureKPa` | 氣壓（kPa）。預設 101.325 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_set_doppler_gain_mode</code> — 選擇移動音源的輻射增益模式</summary>

```c
int st_off_set_doppler_gain_mode(STOFF_Context* context, int mode);
```

**用途** — 決定音源移動時，前進方向輻射變大、反方向變小的增益是否反映到 IR。與可變延遲造成的都卜勒音高是不同的開關。是否支援見 `ST_CAP_DOPPLER_GAIN_MODE`。

**呼叫方式** — 預設為 `ST_DOPPLER_GAIN_MOVING_MONOPOLE`。音源速度以 `STSourceDesc.velocity*` 給定，靜止音源的增益為 1。會使 IR 快取失效，因此渲染前請重新呼叫 `st_off_ir_compute`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`（1，預設：移動單極子近似 — 壓力 D²，能量 D⁴，D = 1/(1−Mr)，依各輻射路徑方向分別計算） |

**回傳值** — `1` = 成功 / `0` = 無情境或 `mode` 超出範圍。

</details>

<details>
<summary><code>st_off_get_doppler_gain_mode</code> — 讀取都卜勒輻射增益模式</summary>

```c
int st_off_get_doppler_gain_mode(const STOFF_Context* context);
```

**用途** — 確認以 `st_off_set_doppler_gain_mode` 指定的值。

**呼叫方式** — 隨時可呼叫。執行緒：`[control]` — 不取鎖讀取引擎狀態。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — `STDopplerGainMode` 值（`0` = OFF / `1` = MOVING_MONOPOLE）。無情境時為 `-1`。

</details>

<details>
<summary><code>st_off_set_early_late_band_energy_targets</code> — 設定 early、late 各頻帶能量倍率</summary>

```c
int st_off_set_early_late_band_energy_targets(STOFF_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**用途** — 彼此獨立地依頻帶調整早期音（early）與後期殘響（late）的頻譜。用於對齊量測值，或單獨修飾殘響音色。是即時 `st_rt_set_early_late_band_energy_targets` 的離線對應。是否支援見 `ST_CAP_EARLY_LATE_BAND_ENERGY`。

**呼叫方式** — 一次替換兩個陣列。early 倍率只套用於 exact 與早期 tap，late 倍率只套用於殘響 send 與殘響槽驅動，兩者不相乘。預設皆為 1.0（中性）。會使 IR 快取失效，因此渲染前請重新呼叫 `st_off_ir_compute`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `earlyBandEnergy` | 早期音各頻帶的 **能量域** 倍率（63 ~ 16k Hz 共 9 個）。非有限值正規化為 1.0，其餘正規化到 `[0, 16]` |
| `lateBandEnergy` | 後期殘響各頻帶能量倍率。規則同上 |

**回傳值** — `1` = 成功 / `0` = 無情境或陣列為 `NULL`。

</details>

<details>
<summary><code>st_off_set_max_depth</code> — 設定全域最大反射深度</summary>

```c
void st_off_set_max_depth(STOFF_Context* context, int depth);
```

**用途** — 設定反射路徑搜尋的全域階數上限，以調節計算成本與早期反射密度。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。預設為 8（各音源上限為 `st_off_source_set_depth`，預設 4）。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `depth` | 全域最大反射深度（預設 8） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_set_transmission_max_depth</code> — 設定透射路徑的最大深度</summary>

```c
void st_off_set_transmission_max_depth(STOFF_Context* context, int depth);
```

**用途** — 設定直達音透射牆面時最多追蹤穿過幾個面的上限。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。預設為 64。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `depth` | 透射最大深度（預設 64） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_listener_set_ray_count</code> — 設定聆聽者導引射線格點大小</summary>

```c
void st_off_listener_set_ray_count(STOFF_Context* context, int width, int height);
```

**用途** — 設定從聆聽者發射的導引（probe）射線數（N = `width × height`）。以計算成本換取反射、繞射路徑搜尋與空間統計的解析度。

**呼叫方式** — 在 `st_off_ir_compute` 之前呼叫。預設為 16 × 16。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `width` | 格點水平射線數（預設 16） |
| `height` | 格點垂直射線數（預設 16） |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_listener_set_ray_sampling_method</code> — 選擇聆聽者導引射線的方向分佈</summary>

```c
int st_off_listener_set_ray_sampling_method(STOFF_Context* context, int method);
```

**用途** — 決定聆聽者導引射線如何配置在球面上的 setter。目前只能選擇費波那契球面分佈，其他值僅為編號相容而保留於列舉中。費波那契分佈是不使用種子的確定性分佈。

**呼叫方式** — 預設值已是 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`，通常不需要呼叫。是否支援見 `ST_CAP_RAY_SAMPLING_METHODS`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `method` | `STRaySamplingMethod`。只接受 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1) — `LEGACY_GRID`(0) / `EQUAL_AREA_GRID`(2) / `SOBOL_SPHERE`(3) / `ICOSAHEDRAL`(4) 皆拒絕 |

**回傳值** — `1` = 成功 / `0` = 其他值（`ST_STATUS_INVALID_ARGUMENT`，狀態不變）或無情境。

</details>

<details>
<summary><code>st_off_set_source_ray_sampling_method</code> — 選擇音源傳輸射線的方向分佈</summary>

```c
int st_off_set_source_ray_sampling_method(STOFF_Context* context, int method);
```

**用途** — 決定音源傳輸射線球面配置的 setter。與 `st_off_listener_set_ray_sampling_method` 相同，只能選擇費波那契球面分佈。

**呼叫方式** — 預設值已是 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |
| `method` | `STRaySamplingMethod`。只允許 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)，其餘拒絕 |

**回傳值** — `1` = 成功 / `0` = 其他值（`ST_STATUS_INVALID_ARGUMENT`，狀態不變）或無情境。

</details>

<details>
<summary><code>st_off_build</code> — 完整建置場景加速結構</summary>

```c
void st_off_build(STOFF_Context* context);
```

**用途** — 以已註冊的網格、物件建置靜態+動態加速結構。傳播與 `st_off_scene_raycast` 使用此結構。

**呼叫方式** — 在新增或刪除網格、物件後，移動靜態物件後，以及 `st_off_ir_compute` 之前呼叫。建置前所有射線查詢皆為未命中。加速結構種類由 `st_off_scene_set_accel` 決定。執行緒：`[control, blocking]` — 與場景大小成正比的較長獨佔區間。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_build_dynamic</code> — 只更新動態物件的 TLAS</summary>

```c
void st_off_build_dynamic(STOFF_Context* context);
```

**用途** — 只有動態物件的變換改變時，不做完整建置，而是 refit 動態 TLAS 以快速反映。

**呼叫方式** — 以 `st_off_object_set_transform` / `_q` 移動動態物件後、`st_off_ir_compute` 之前呼叫。若新增或刪除了網格、物件，或靜態物件有變更，請使用 `st_off_build`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 情境控制代碼 |

**回傳值** — 無。

</details>

</details>

<details>
<summary><strong>離線(`st_off_*`) — IR 計算·渲染、批次、除錯</strong> — 49 個</summary>

<details>
<summary><code>st_off_render_parse_autoeq_parametric</code> — 將 AutoEq ParametricEQ.txt 文字剖析為參數 EQ 頻帶陣列</summary>

```c
int32_t st_off_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**用途** — 讀取 AutoEq 發佈的 `ParametricEQ.txt`（Equalizer APO 語法的子集），轉換為 `STParametricEqBand` 陣列與前級值。結果可直接傳入 `st_off_source_set_parametric_eq`，因此主機不必自行剖析耳機校正曲線等外部 EQ 檔，即可作為音源 EQ 套用。與即時 `st_rt_render_parse_autoeq_parametric` 實作相同、契約相同。

**呼叫方式** — 不需要情境，隨時可呼叫。成功後將結果以開啟（`enabled` = 1）傳給 `st_off_source_set_parametric_eq`。是否支援以 `st_off_get_capability_word(1)` 的 `ST_CAP1_SOURCE_PARAMETRIC_EQ` 確認（此剖析器包含在該位元中，沒有獨立位元）。執行緒：`[any]` — 無全域狀態也無配置，可在任何執行緒無阻塞呼叫。

接受的語法（不分大小寫）：

- `Preamp: <數值> [dB]` — 多行時以 dB 相加。
- `Filter[ <編號>]: ON|OFF <種類> Fc <數值> [Hz] [Gain <數值> [dB]] [Q <數值>]` — 種類為 `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`。省略 Q 時擱架、LP、HP 為 0.7071，`PK`·`NO` 必須指定 Q。PK 與擱架必須指定 Gain。`OFF` 濾波器以 `enabled` = 0 的頻帶加入並計入頻帶數。
- 忽略空行與 `#` 之後（行尾註解），接受 UTF-8 BOM 與 CRLF。數值的讀取與地區設定無關。

拒絕的內容：其他命令（`Channel`·`Device`·`GraphicEQ`·`Include` 等）、`BP`·`AP`·`IIR`、擱架斜率格式（`LS 6dB`）、`BW Oct`、超出範圍的值（Fc [20, 20000] Hz · Gain ±24 dB · Q [0.1, 30]，擱架為 Q [0.1, 3] · 前級最終總和 [−48, +12] dB）、註解外的非 ASCII 字元、指數表示法。剖析器不 clamp 而是拒絕（setter 以相同範圍 clamp）。

| 參數 | 說明 |
|---|---|
| `utf8Text` | NUL 結尾的 UTF-8 文字（整個檔案內容）。必填 |
| `outBands` | 接收頻帶的呼叫端陣列。`bandCapacity` 大於 0 時必填 |
| `bandCapacity` | `outBands` 元素數。0 以上。最大頻帶數為 `ST_PARAMETRIC_EQ_MAX_BANDS`(16) |
| `outBandCount` | 接收剖析出的頻帶數。必填（不可 NULL） |
| `outPreampDb` | 接收前級（dB）。必填（不可 NULL） |
| `outErrorLine` | 失敗的行號（從 1 起，與行無關的錯誤為 0）。允許 NULL |
| `outErrorMessage` | 失敗原因（NUL 結尾英文）。允許 NULL |
| `errorMessageCapacity` | `outErrorMessage` 位元組數。依此長度截斷 |

**結構體** `STParametricEqBand`（32 位元組，無版本戳記的陣列元素）

| 欄位 | 說明 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 恆等（略過），其他 = 開啟 |
| `frequencyHz` | 中心（PEAKING、NOTCH）或轉角（擱架中點、LP、HP）頻率 |
| `gainDb` | 僅 PEAKING、LOW_SHELF、HIGH_SHELF 使用 |
| `q` | Q 值 |
| `reserved[3]` | 0。剖析器以 0 填入 |

**回傳值** — `STAutoEqParseStatus`。`ST_AUTOEQ_PARSE_OK`(0) 時寫入 `outBands[0..*outBandCount)` 與 `*outPreampDb`。失敗時 `*outBandCount` = 0 · `*outPreampDb` = 0，並寫入錯誤行與訊息：`ST_AUTOEQ_PARSE_INVALID_ARGUMENT`（1，必填指標為 NULL、容量為負等） / `SYNTAX`（2，行格式錯誤） / `UNSUPPORTED`（3，不支援的命令、濾波器、格式） / `OUT_OF_RANGE`（4，超出範圍的值） / `TOO_MANY_BANDS`（5，超過 `ST_PARAMETRIC_EQ_MAX_BANDS` 或 `bandCapacity`） / `EMPTY`（6，沒有任何 Preamp、Filter 行）。因無情境，不會留下 last_status。

</details>

<details>
<summary><code>st_off_render_set_spatializer</code> — 選擇情境的空間化器（HRTF 種類）並載入 HRIR 資料集</summary>

```c
int st_off_render_set_spatializer(STOFF_Context* context, int type);
```

**用途** — 選擇離線情境的空間化實作（聲像 / 內建 MIT KEMAR / SADIE II D2），並載入所需的 HRIR 資料集。接受與即時 `st_rt_render_set_spatializer` 相同的值集合。

**呼叫方式** — 雙耳 IR 與試聽渲染以請求結構體（`STOfflineBinauralIRRequestOptions.hrtfType`）逐請求選擇空間化器，若只使用這些渲染則不必另外呼叫此函式。SADIE D2 需要外部資產檔 `SADIE_D2_44K_16bit_256tap.hrtfbin` — 引擎依環境變數 `SOUNDTRACING_SADIE_D2_HRTF_PATH`、目前工作資料夾、執行檔資料夾、DLL 資料夾（各自為該資料夾及上層 8 層的 `Assets/HRTF/`·`SoundTracing/Assets/HRTF/`·`Resources/HRTF/`）的順序尋找。發佈時放在 DLL 旁（或上層）的 `Resources/HRTF/` 最簡單。執行緒：`[control, blocking]` — 有載入 HRIR 資料集的較長區間，不要在對延遲敏感的執行緒上呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`（0，不需 HRIR 資料） / `ST_SPATIALIZER_MIT_KEMAR`（1，DLL 內建） / `ST_SPATIALIZER_SADIE_D2_KEMAR`（2，需要外部資產）。其他值拒絕 |

**回傳值** — `1` = 已套用 / `0` = 失敗。情境為 NULL 或 `type` 超出範圍時為 0。選擇 SADIE D2 但缺少資產檔時，回傳 0 並留下 `ST_STATUS_UNAVAILABLE`（"SADIE D2 HRTF asset not found ..."）。

</details>

<details>
<summary><code>st_off_render_set_early_spatial_mode</code> — 選擇雙耳、試聽渲染的早期反射渲染路徑（exact 物件 / HOA3 bed）</summary>

```c
int st_off_render_set_early_spatial_mode(STOFF_Context* context, int mode);
```

**用途** — 選擇雙耳 IR 與試聽渲染以哪種路徑輸出早期反射。`ST_EARLY_SPATIAL_OBJECTS`（預設）是將所有早期路徑合成為 exact 物件的標準版本，`ST_EARLY_SPATIAL_BED` 則以即時耳機預設路徑（預算內 exact 物件 + 其餘早期反射與一次散射送入 HOA3 bed → 雙耳解碼）渲染。以 BED 渲染的結果等同「僅有該音源的靜止場景之同步即時輸出」，因此用於離線預聽或比較遊戲中實際會聽到的聲音。

**呼叫方式** — 模式與計算、渲染依下列順序銜接。

1. 以此函式選擇模式。不清空 IR 快取。
2. `st_off_ir_compute` — 若為 BED，每個聆聽者傳播一次、轉換兩次，同時快取 exact 標準版與 bed 變體（只增加轉換時間與 IR 記憶體，傳播成本不變）。若為 OBJECTS，轉換也只有一次。
3. `st_off_ir_render_binaural` / `st_off_ir_render_audition_pair` 依 **渲染時的模式**。以 BED 計算的快取兩種變體皆有，因此不必重新計算即可切換模式渲染兩者。以 BED 渲染沒有變體的快取（如以 OBJECTS 計算的快取）時回傳 0 與 `ST_STATUS_UNAVAILABLE`，此時將模式維持為 BED 後重新 compute。結果 info 的 `earlySpatialMode` 是實際使用的模式。

壓力 IR（獨奏、混合、批次）與原始 IR 查詢不論模式，永遠是 exact 標準版。IR 封存檔若為以 BED 計算的快取，會同時儲存兩種變體，載入封存檔也不會改變情境的模式。BED 渲染在安裝 IR 後以靜音暖機（16384 幀 ≈ 0.37 s，從輸出中捨棄）使路徑淡變與增益斜坡穩定後才送入輸入，因此渲染時間會相應增加。同時播放多個音源的即時輸出會在音源間共用合併的 bed 與 send，因此與逐對結果的總和略有差異。兩種模式都以聆聽者周圍一次散射的到達方向分佈加權 late 擴散場（壓力 IR 不做空間化，因此不受影響）。

是否支援以 `st_off_get_capability_word(1)` 的 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE` 確認。執行緒：`[control]` — 會取得工作互斥鎖，因此可能阻塞至進行中的 compute 與渲染結束為止。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `mode` | `STEarlySpatialMode` — `ST_EARLY_SPATIAL_OBJECTS`（0，預設，exact 標準版） / `ST_EARLY_SPATIAL_BED`（1，即時 bed 路徑）。其他值拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗。其他值為 `ST_STATUS_INVALID_ARGUMENT`，在 `ST_BACKEND_EXA` 情境中選擇 BED 為 `ST_STATUS_UNAVAILABLE`（OBJECTS 永遠可用）。

</details>

<details>
<summary><code>st_off_render_get_early_spatial_mode</code> — 讀取目前的 early 空間模式</summary>

```c
int st_off_render_get_early_spatial_mode(const STOFF_Context* context);
```

**用途** — 回傳以 `st_off_render_set_early_spatial_mode` 選擇的目前模式。預設值為 `ST_EARLY_SPATIAL_OBJECTS`(0)，與即時預設值（BED）不同。

**呼叫方式** — 隨時可呼叫。實際渲染使用的模式也可從結果 info（`STOfflineBinauralIRInfo.earlySpatialMode`、`STOFF_AuditionInfo.earlySpatialMode`）確認。執行緒：`[any]` — atomic 讀取，可在任何執行緒無阻塞呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — 目前模式（`ST_EARLY_SPATIAL_OBJECTS`(0) / `ST_EARLY_SPATIAL_BED`(1)）。`context` 為 NULL 時為 `-1`。

</details>

<details>
<summary><code>st_off_render_set_max_delay_seconds</code> — 設定離線渲染使用的延遲環長度（秒）</summary>

```c
int st_off_render_set_max_delay_seconds(STOFF_Context* context, float seconds);
```

**用途** — 設定壓力、雙耳、試聽、批次渲染使用的延遲環長度。延遲超過環上限的 exact 路徑會從渲染中排除（late 由 FDN 涵蓋），因此在需要晚於預設 4 s 到達之路徑的大空間或長 IR 中，請增加此值。

**呼叫方式** — 這是與 IR 快取無關的渲染設定，不必重新 compute，從下一次渲染起套用。環記憶體為每個渲染音源 9 頻帶 × 環長度。IR 封存檔會記錄儲存時的值，載入的情境使用該值（載入後可再變更）。是否支援以 `st_off_get_capability_word(1)` 的 `ST_CAP1_OFFLINE_MAX_DELAY` 確認。執行緒：`[control, blocking]` — 取得工作互斥鎖並重新配置延遲環。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `seconds` | 環長度（秒）。預設 4.0 s（與即時預設 2.0 s 不同）。範圍與即時 `st_rt_render_set_max_delay_seconds` 相同，約 0.012 s ~ 60 s。超出範圍或非有限值拒絕 |

**回傳值** — `1` = 成功 / `0` = 失敗。超出範圍或非有限值為 `ST_STATUS_INVALID_ARGUMENT`，無法變更環長度的後端為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_render_get_max_delay_seconds</code> — 讀取目前的渲染延遲環長度（秒）</summary>

```c
float st_off_render_get_max_delay_seconds(const STOFF_Context* context);
```

**用途** — 回傳以 `st_off_render_set_max_delay_seconds` 設定（或從封存檔載入）的目前延遲環長度。

**呼叫方式** — 用於確認晚於渲染長度到達的路徑是否被截斷。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — 目前值（秒，預設 4.0）。`context` 為 NULL 時為 `0`。

</details>

<details>
<summary><code>st_off_debug_set_collect_visual_paths</code> — 設定下一次計算中收集哪些種類的視覺化路徑</summary>

```c
int st_off_debug_set_collect_visual_paths(STOFF_Context* context, uint32_t mask);
```

**用途** — 開啟視覺化路徑收集，以將傳播路徑疊加繪製於 3D 檢視，並以遮罩選擇要收集的路徑種類。預設為 0（不收集），只在需要除錯視覺化時才產生成本。

**呼叫方式** — 視覺化快照由 `st_off_ir_compute` 發佈，因此須在 compute **之前** 設定遮罩。計算後依 `st_off_debug_get_snapshot_info` → `st_off_debug_copy_visual_paths` 的順序讀取。若要連失敗的 walk 一起查看，請同時開啟 `st_off_debug_set_collect_failed_walks`。是否支援以 `ST_CAP_PATH_COLLECTION_MASK` 確認。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `mask` | `STPathCollectionFlag` 位元 OR — `ST_PATH_COLLECTION_GUIDE_RAY`(1) / `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY`(2) / `ST_PATH_COLLECTION_DIRECT_TRANSMISSION`(4) / `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION`（8，因存在包含反射區段的繞射路徑，兩種共用一個位元） / `ST_PATH_COLLECTION_ALL`。0 = 不收集 |

**回傳值** — `1` = 已套用 / `0` = 失敗（`context` 為 NULL 或未定義的位元）。

</details>

<details>
<summary><code>st_off_debug_set_collect_failed_walks</code> — 設定視覺化收集是否包含中途失敗的 walk</summary>

```c
void st_off_debug_set_collect_failed_walks(STOFF_Context* context, int enabled);
```

**用途** — 預設情況下，視覺化快照中只有走完的路徑才有意義。開啟此選項後也會記錄中途失敗的 walk，以便除錯為何路徑沒有產生。失敗的 walk 以 `STVisualPathRecord.valid` = 0 標示。

**呼叫方式** — 與 `st_off_debug_set_collect_visual_paths` 一起在 compute 之前設定。若要取得失敗的 walk，以 `ST_VISUAL_PATH_COPY_ALL` 呼叫 `st_off_debug_copy_visual_paths`（`VALID_ONLY` 只複製走完的路徑）。預設為關閉。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `enabled` | 0 = 關閉（預設） / 其他 = 開啟 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_ir_compute</code> — 執行一次傳播與 IR 轉換，建立 canonical IR 快取</summary>

```c
int st_off_ir_compute(STOFF_Context* context);
```

**用途** — 離線 IR 生成的起點。對每個已註冊的聆聽者執行一次傳播（幾何）與 IR 轉換，為每組聆聽者 × 音源在快取中建立 **canonical 原始 IR**。原始 IR 不是時域樣本，而是參數形式（能量域早期 tap、late 殘響送出 tap、一次散射單元、late 殘響描述子），因此與 IR 長度無關，只計算一次。之後所有結果都衍生自這同一世代。

- 原始 IR 查詢：`st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_*` — 原樣複製 tap、單元、描述子
- 壓力 IR：`st_off_ir_render_pressure`（單一配對） / `st_off_ir_render_pressure_mixed`（多個音源之和） — 寬頻單聲道或 9 頻帶分離
- 雙耳 IR：`st_off_ir_render_binaural` — 立體聲（L/R）
- 試聽：`st_off_ir_render_audition_pair` — 將乾訊號分別以固定 RIR 摺積與引擎渲染階段渲染

渲染函式只消費快取，因此即使變更長度、輸出模式、HRTF 多次渲染也不會重新計算。

**呼叫方式** — 設定場景（材質、網格、物件）、音源、聆聽者、傳播選項，並以 `st_off_build` 建置加速結構後呼叫。變更場景、音源、聆聽者或 IR 策略（大氣、距離衰減、Doppler gain mode、能量目標等）後，須重新 compute 才會反映到結果。反之，渲染專用設定（音源 EQ、early 空間模式切換、延遲環長度）會保留快取，從下一次渲染起套用。early 空間模式為 `ST_EARLY_SPATIAL_BED` 時，每組配對也會一併建立 bed 變體（參考 `st_off_render_set_early_spatial_mode`）。若開啟視覺化路徑收集，也會發佈同一世代的視覺化快照。

成功時快取世代（`st_off_ir_get_cache_generation`）會改變，所有結果 info 都帶有該世代。計算失敗或被取消時不發佈新快取，先前的快取原樣保留。進度從其他執行緒以 `st_off_ir_get_progress` 讀取，取消以 `st_off_ir_request_cancel` 發出。在以 `st_off_ir_archive_load_pair` 載入封存檔的 render-only 情境中會被拒絕。`maxComputeThreads` 大於 1 時，平行區段在情境的計算集區工作執行緒上執行。要平行計算多個情境，請使用批次 API（`st_off_batch_*`）。

執行緒：`[control, runs-here]` — 整個傳播與轉換管線 **實際在呼叫執行緒上執行**，結束前不會返回。與此情境的其他工作（渲染、查詢）以工作互斥鎖序列化。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — `1` = 成功（已發佈快取） / `0` = 失敗。計算失敗、取消、render-only 情境為 `ST_STATUS_INITIALIZATION_FAILED`（"canonical IR computation failed or was canceled"）。

</details>

<details>
<summary><code>st_off_ir_archive_save</code> — 將目前整個 canonical IR 快取儲存為帶版本的封存檔</summary>

```c
int st_off_ir_archive_save(STOFF_Context* context, const char* utf8Path);
```

**用途** — 將計算出的 canonical IR 快取保存為檔案，日後不需場景、加速結構、傳播、IR 轉換即可重新渲染相同結果。用於重度計算只做一次，而渲染（變更長度、輸出模式、HRTF）想在其他處理程序或其他時間點進行時。

**呼叫方式** — 在 `st_off_ir_compute` 成功、快取存在時呼叫。不執行 DSP。寫入暫存檔並驗證後發佈到目標路徑，**不覆寫已存在的檔案**（此時失敗）。若為以 early 空間模式 BED 計算的快取，也會一併儲存 bed 變體，並記錄目前的渲染延遲環長度（`st_off_render_get_max_delay_seconds`）。視覺化快照不會儲存。載入以 `st_off_ir_archive_load_pair` 進行。格式與引擎版本須相同才能載入，主機另須確認是否與建立封存檔的 DLL 為同一二進位檔（雜湊）。僅在 `ST_BACKEND_ST` 情境中可用。執行緒：`[control, runs-here]` — 序列化與檔案寫入在呼叫執行緒上執行。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `utf8Path` | 要儲存的檔案路徑（UTF-8，NUL 結尾）。為空則拒絕。檔案已存在則失敗 |

**回傳值** — `1` = 成功 / `0` = 失敗。路徑為 NULL 或空字串，或非 ST 後端時為 `ST_STATUS_INVALID_ARGUMENT`；沒有完整的 canonical 快取或儲存失敗時為 `ST_STATUS_UNAVAILABLE`。即使失敗，目標路徑的既有檔案也保持原樣。

</details>

<details>
<summary><code>st_off_ir_archive_load_pair</code> — 從封存檔載入一組聆聽者·音源配對，成為渲染專用情境</summary>

```c
int st_off_ir_archive_load_pair(STOFF_Context* context, const char* utf8Path, STListenerId listener, STSourceId source);
```

**用途** — 從以 `st_off_ir_archive_save` 儲存的封存檔中取出一組已記錄的配對並安裝，不需場景、BVH、傳播、IR 轉換即可直接渲染。用於不花計算成本重聽已儲存的 IR，或以其他長度、輸出模式渲染。

**呼叫方式** — 典型用法是在新建立的離線情境上呼叫。配對會安裝到新的冷渲染器，之後情境成為 **render-only**：`st_off_ir_compute` 會被拒絕，渲染也不會隱含地重新計算。呼叫 `st_off_ir_clear_cache` 或 `st_off_trim_memory`（`ST_OFFLINE_TRIM_IR_CACHE`）後仍為 render-only，要再次渲染須重新載入。既有的渲染與查詢函式（`st_off_ir_render_*`、`st_off_ir_get_raw_descriptor`、`st_off_ir_copy_raw_*`）原樣接受 **封存檔中記錄的 ID**。渲染延遲環長度改為封存檔記錄的值（載入後可再變更），early 空間模式不變。視覺化快照不會還原。格式與引擎版本須相同，主機也須確認與建立時的 DLL 為同一二進位檔。僅在 `ST_BACKEND_ST` 情境中可用。執行緒：`[control, runs-here]` — 檔案讀取與安裝在呼叫執行緒上執行。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `utf8Path` | 封存檔路徑（UTF-8，NUL 結尾）。為空則拒絕 |
| `listener` | 要載入配對的聆聽者 ID（封存檔中記錄的值） |
| `source` | 要載入配對的音源 ID（封存檔中記錄的值） |

**回傳值** — `1` = 成功 / `0` = 失敗。路徑為 NULL 或空字串，或非 ST 後端時為 `ST_STATUS_INVALID_ARGUMENT`；配對不在封存檔中、格式或版本不符、載入被取消時為 `ST_STATUS_UNAVAILABLE`。即使失敗，先前發佈的快取也保持原樣。

</details>

<details>
<summary><code>st_off_ir_clear_cache</code> — 清空 canonical IR 快取</summary>

```c
void st_off_ir_clear_cache(STOFF_Context* context);
```

**用途** — 清空已發佈的離線查詢產物（canonical 原始 IR、封存檔記錄、視覺化快照）。保留場景、引擎選項、傳播工作緩衝區（若連工作緩衝區也要釋放，請用 `st_off_trim_memory`）。

**呼叫方式** — 用完大型快取後要收回記憶體，或避免誤渲染舊結果時呼叫。清空後須重新呼叫 `st_off_ir_compute` 才能渲染與查詢（在此之前為 `ST_STATUS_UNAVAILABLE`）。以封存檔載入的 render-only 情境清空後須重新載入。與 `st_off_trim_memory(context, ST_OFFLINE_TRIM_IR_CACHE)` 相同。執行緒：`[control]` — 會取得工作互斥鎖，因此可能等待進行中的 compute 與渲染結束。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_trim_memory</code> — 保留場景與設定，釋放 IR 快取、工作緩衝區、渲染狀態記憶體</summary>

```c
int st_off_trim_memory(STOFF_Context* context, uint32_t flags);
```

**用途** — 在情境閒置期間（批次重用集區等）減少其持有的記憶體。保留場景、BVH、材質、音源、聆聽者、選項，因此不必重新建立情境，下一次 compute 與渲染會重新取得緩衝區，結果與未釋放的情境或新情境位元相同。

**呼叫方式** — 選擇 `ST_OFFLINE_TRIM_IR_CACHE` 時與 `st_off_ir_clear_cache` 相同，下一次渲染前需要 compute（以封存檔載入的 render-only 情境須重新載入）；不選擇時可直接渲染已快取的 IR。已註冊到批次的情境，須在以 `st_off_batch_poll` 收到該工作的完成記錄後再呼叫。是否支援以 `ST_CAP_OFFLINE_TRIM_MEMORY` 確認。`ST_BACKEND_EXA` 情境不清空後端工作緩衝區（會清空 IR 快取與執行框架）。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `flags` | `ST_OFFLINE_TRIM_*` 位元 OR。0 則不做任何事 |

`flags` 位元：

| 位元 | 清空的內容 |
|---|---|
| `ST_OFFLINE_TRIM_IR_CACHE` (1) | 與 `st_off_ir_clear_cache` 相同 — canonical 原始 IR、封存檔記錄、視覺化快照。下一次渲染前需要 compute |
| `ST_OFFLINE_TRIM_PROPAGATION_SCRATCH` (2) | 傳播器、IR 轉換器、執行框架為下一次 compute 持有的最大尺寸工作緩衝區。大小取決於射線數與反射階數（例：音源 64×32 ×3、聆聽者 64×64、深度 4 時約 23 MB）。已快取的 IR 仍可原樣渲染 |
| `ST_OFFLINE_TRIM_RENDER_STATE` (4) | 下一次渲染會從頭重建的渲染狀態（音源渲染狀態、路徑狀態、離線渲染計畫） |
| `ST_OFFLINE_TRIM_ALL` | 以上三者 |

**回傳值** — `1` = 成功（`flags` = 0 時不做任何事並回傳 1） / `0` = `context` 為 NULL 或未定義的位元（`ST_STATUS_INVALID_ARGUMENT`，不清空任何內容）。

</details>

<details>
<summary><code>st_off_ir_get_progress</code> — 讀取進行中計算·渲染的進度（0~1）</summary>

```c
float st_off_ir_get_progress(const STOFF_Context* context);
```

**用途** — 在 `st_off_ir_compute` 佔住呼叫執行緒執行期間，**從其他執行緒** 讀取進度的函式。與 `st_off_ir_request_cancel` 一起，是唯一設計為在計算中從其他執行緒呼叫的一對。

**呼叫方式** — 從 UI 執行緒等定期輪詢。進度 **從 1.0 開始** — 工作總量為 0 時以「無工作 = 完成」回傳 1.0，因此期待 0.0 的輪詢迴圈可能在計算開始前就誤判為完成。完成判定以 `st_off_ir_compute` 的回傳值為準，進度僅供顯示。執行緒：`[any]` — lock-free atomic 讀取，可在任何執行緒無阻塞呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — 進度 `[0, 1]`（已完成工作量 ÷ 總量，總量為 0 時為 1.0）。`context` 為 NULL 時為 `0`。

</details>

<details>
<summary><code>st_off_ir_request_cancel</code> — 中斷進行中的計算·渲染</summary>

```c
void st_off_ir_request_cancel(STOFF_Context* context);
```

**用途** — **從其他執行緒** 中斷耗時的 `st_off_ir_compute` 或渲染。與 `st_off_ir_get_progress` 是唯一可 lock-free 呼叫的一對。

**呼叫方式** — 在計算或渲染執行期間從其他執行緒呼叫。只中斷呼叫時已在進行中的工作，之後新開始的 compute 與渲染不受影響（無法預先設定）。被取消的 compute 回傳 0 且不發佈新快取，因此先前的快取原樣保留。被取消的渲染回傳 0 與 `ST_STATUS_UNAVAILABLE`。要停止整個批次工作，請使用 `st_off_batch_cancel`。執行緒：`[any]` — lock-free atomic，可在任何執行緒無阻塞呼叫。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_ir_get_cache_generation</code> — 讀取目前 canonical IR 快取的世代編號</summary>

```c
uint64_t st_off_ir_get_cache_generation(const STOFF_Context* context);
```

**用途** — 回傳快取最後發佈的世代。原始 IR 描述子與所有渲染結果 info（`cacheGeneration` 欄位）也帶有相同編號，因此主機可確認多次查詢、渲染的結果 **是否來自同一次計算**。

**呼叫方式** — compute 之前為 0。每次 compute 成功時改變。用於與 tap 複製、渲染結果的 `cacheGeneration` 比較，檢查期間是否有其他執行緒重新計算。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |

**回傳值** — 目前世代編號。無快取（compute 之前）或 `context` 為 NULL 時為 `0`。

</details>

<details>
<summary><code>st_off_ir_get_raw_descriptor</code> — 讀取聆聽者·音源配對的原始 IR 摘要（數量、世代、late 殘響描述子、傳輸能量）</summary>

```c
int st_off_ir_get_raw_descriptor(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDescriptor* outDescriptor);
```

**用途** — 回傳 canonical 快取中一組配對的原始 IR 標頭資訊。一次取得 tap、單元、連續性 ID 的數量（複製緩衝區大小）、音速與取樣率、快取世代、late 殘響描述子（T60、平均自由路徑、室內體積等）、音源傳輸能量收支。是不經引擎渲染、直接分析幾何與統計資料，或送入自製渲染器時的起點。

**呼叫方式** — 在 `st_off_ir_compute` 之後（或載入封存檔之後）呼叫。以回傳的數量取得緩衝區，再以 `st_off_ir_copy_raw_early_taps` / `st_off_ir_copy_raw_diffuse_rain_cells` / `st_off_ir_copy_raw_reverb_send_taps` / `st_off_ir_copy_raw_continuity_ids` 複製內容。原始 IR 不論 early 空間模式，永遠是 exact 標準版。是否支援以 `ST_CAP_OFFLINE_RAW_IR` 確認。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `outDescriptor` | 接收結果的結構體。呼叫端填入 `structSize` = `sizeof(STRawIRDescriptor)`、`apiVersion` = `st_off_get_api_version()` |

**結構體** `STRawIRDescriptor`

| 欄位 | 說明 |
|---|---|
| `structSize`, `apiVersion` | 由呼叫端填入的版本戳記 |
| `cacheGeneration` | 此結果所屬的快取世代 |
| `listenerId`, `sourceId` | 配對的 ID |
| `sampleRate` | 取樣率（固定 44100 Hz） |
| `soundSpeedMetersPerSecond` | 此計算使用的音速（m/s）。由大氣設定推導的值 |
| `earlyTapCount` | 原始早期 tap 數（`st_off_ir_copy_raw_early_taps` 所需數量）。只計幾何路徑 |
| `reverbSendTapCount` | late 殘響送出 tap 數（`st_off_ir_copy_raw_reverb_send_taps` 所需數量） |
| `continuityIdCount` | 連續性 ID 總數（`st_off_ir_copy_raw_continuity_ids` 所需數量） |
| `sourceTransportEnergy` | `STRawIRSourceTransportEnergy` — 音源傳輸能量收支（見下表） |
| `lateReverb` | `STRawIRReverbDescriptor` — late 殘響場描述子（見下表） |
| `diffuseRainCellCount` | 一次散射單元數（`st_off_ir_copy_raw_diffuse_rain_cells` 所需數量）。是否支援見 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` |
| `reserved[5]` | 保留 |

**結構體** `STRawIRSourceTransportEnergy` — 9 頻帶陣列皆為能量域。

| 欄位 | 說明 |
|---|---|
| `valid` | 1 = 值有效 / 0 = 無 |
| `emitted[9]` | 音源傳輸放出的能量 |
| `diffuseReleased[9]` | 釋放為擴散能量並進入 late 殘響送出的能量 |
| `escapedCoherent[9]` | 以相干狀態逸出的能量 |
| `depthRemainder[9]` | 在反射深度上限時剩餘的能量 |
| `boundaryAndAirLoss[9]` | 因邊界（吸收）與空氣吸收損失的能量 |

**結構體** `STRawIRReverbDescriptor` — 反射率與空氣項為能量域，`diffuseFieldPressureGain`·`level`·`dryInputGain` 為壓力域線性倍率。

| 欄位 | 說明 |
|---|---|
| `valid` | 1 = 值有效 / 0 = 無 |
| `avgReflection[9]` | 平均反射率（能量） |
| `airEnergyGainPerMeanFreePath[9]` | 通過一個平均自由路徑時的空氣吸收能量增益 |
| `eyringT60Seconds[9]` | Eyring 殘響時間 T60（秒） |
| `diffuseFieldPressureGain[9]` | 擴散場壓力增益（壓力域） |
| `roomVolumeMetersCubed` | 估計室內體積（m³） |
| `meanFreePath` | 平均自由路徑（m） |
| `meanFreeFlightTimeSeconds` | 平均自由飛行時間（秒） |
| `boundaryHitRatio` | 邊界命中比例（無因次） |
| `reserved[2]` | 保留 |
| `level` | late 電平（壓力域） |
| `dryInputGain` | 乾輸入增益（壓力域） |

長度與體積輸出為已反映 `sceneRatio` 的實際公尺單位。

**回傳值** — `1` = 成功 / `0` = 失敗。`outDescriptor` 為 NULL 或戳記錯誤時為 `ST_STATUS_INVALID_ARGUMENT`，無快取或無該配對時為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_early_taps</code> — 複製配對的原始早期 tap（直接、透射、反射、繞射路徑）</summary>

```c
int st_off_ir_copy_raw_early_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRTap* outTaps, int tapCapacity);
```

**用途** — 將每條幾何路徑以能量域 tap 輸出（路徑種類、延遲、9 頻帶能量增益、到達方向、路徑長度、Doppler 斜率、路徑 ID）。用於計算直達音到達時間、ITDG、路徑數等幾何指標，或驅動自製渲染器。需要壓力時，對各頻帶能量套用 **一次** `sqrt`。

**呼叫方式** — 原始早期 tap **只有幾何路徑**。送入壓力 IR 渲染的一次散射（diffuse rain）單元是以 1 ms 單元彙整的統計成分，不包含於此（`earlyTapCount` 與連續性 ID 亦同），須另以 `st_off_ir_copy_raw_diffuse_rain_cells` 取得。因此幾何指標不會受這些單元影響。大小查詢：以 `outTaps` = NULL、`tapCapacity` = 0 呼叫則回傳所需數量（與 `STRawIRDescriptor.earlyTapCount` 相同）。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `outTaps` | 接收 tap 的呼叫端陣列。NULL 則為大小查詢（此時 `tapCapacity` 須為 0） |
| `tapCapacity` | `outTaps` 元素數。0 以上 |

**結構體** `STRawIRTap`（能量域）

| 欄位 | 說明 |
|---|---|
| `pathType` | 0 = Direct / 1 = Transmission / 2 = Reflection / 3 = Diffraction |
| `depth` | 交互作用階數 |
| `delaySeconds` | 到達延遲（秒） |
| `delaySamples` | 到達延遲（44.1 kHz 樣本，含小數） |
| `bandEnergyGain[9]` | 9 頻帶能量增益。壓力以 `sqrt` 取得 |
| `dirFromListener[3]` | 從聆聽者看的到達方向 |
| `matchDirFromListener[3]` | 僅用於路徑對應（連續性比對）的聆聽者側方向（世界座標） |
| `matchDirFromSource[3]` | 僅用於路徑對應（連續性比對）的音源側方向（世界座標） |
| `pathLengthMeters` | 路徑長度（m，已反映 `sceneRatio`） |
| `relativeSpeed` | 相對速度（m/s） — `delayChangePerSample` × 音速 |
| `delayChangePerSample` | 每樣本延遲變化（Doppler 斜率） |
| `pathId` | 64 位元基於拓撲的路徑 ID（在不同計算間對應同一路徑的鍵） |
| `interactionSignature` | 區分共用同一 `pathId` 之物理分支的交互作用·材質判別值 |
| `continuityOffset` | 此 tap 的連續性 ID 在 `st_off_ir_copy_raw_continuity_ids` 陣列中的起始索引 |
| `continuityCount` | 此 tap 的連續性 ID 數。唯一路徑為 0（`pathId` 即該 ID） |

**回傳值** — 已複製（或所需）的 tap 數。失敗為 `0`：容量為負、`outTaps` 為 NULL 但容量非 0 時為 `ST_STATUS_INVALID_ARGUMENT`，容量不足為 `ST_STATUS_BUFFER_TOO_SMALL`，無快取或配對時為 `ST_STATUS_UNAVAILABLE`。沒有任何 tap 的正常結果也是 0，因此以 `st_off_get_last_status` 區分。

</details>

<details>
<summary><code>st_off_ir_copy_raw_diffuse_rain_cells</code> — 複製配對的一次散射（diffuse rain）單元</summary>

```c
int st_off_ir_copy_raw_diffuse_rain_cells(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDiffuseRainCell* outCells, int cellCapacity);
```

**用途** — 輸出從散射點直接到達聆聽者的散射能量，以直達音之後的 1 ms 單元彙整而成的統計成分。壓力與雙耳渲染將這些單元渲染為 late stem（並非幾何路徑，因此不在 `st_off_ir_copy_raw_early_taps` 中）。用於將渲染 IR 分解為原始成分，或在自製渲染器中重現一次散射。

**呼叫方式** — 約定與其他原始複製相同：`outCells` = NULL、`cellCapacity` = 0 時回傳所需數量（與 `STRawIRDescriptor.diffuseRainCellCount` 相同）。無散射時為 0。渲染壓力 = `polarity` × √(能量)。是否支援以 `st_off_get_capability_word(1)` 的 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` 確認。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `outCells` | 接收單元的呼叫端陣列。NULL 則為大小查詢（此時 `cellCapacity` 須為 0） |
| `cellCapacity` | `outCells` 元素數。0 以上 |

**結構體** `STRawIRDiffuseRainCell`（能量域）

| 欄位 | 說明 |
|---|---|
| `pathId` | 僅由單元編號決定的確定性 ID（同一單元為同一 ID） |
| `cellIndex` | 直達音之後的 1 ms 單元編號（從 0 起） |
| `polarity` | 渲染壓力符號 +1 / −1（每個單元確定性決定） |
| `delaySeconds` | 單元內以能量加權的到達時間（秒） |
| `delaySamples` | 同一值（44.1 kHz 樣本） |
| `bandEnergyGain[9]` | 9 頻帶能量增益 |
| `dirFromListener[3]` | 以能量加權的到達方向（聆聽者區域座標） |
| `delayChangePerSample` | 每樣本延遲變化 |
| `reserved[4]` | 保留 |

**回傳值** — 已複製（或所需）的單元數。失敗為 `0`：引數錯誤為 `ST_STATUS_INVALID_ARGUMENT`，容量不足為 `ST_STATUS_BUFFER_TOO_SMALL`，無快取或配對時為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_reverb_send_taps</code> — 複製配對的 late 殘響送出 tap（擴散能量事件）</summary>

```c
int st_off_ir_copy_raw_reverb_send_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRReverbSendTap* outTaps, int tapCapacity);
```

**用途** — 輸出從音源傳輸取得的統計擴散能量事件（激發 late 殘響槽的送出 tap）。在引擎渲染中，這些 tap 會實現為壓力送入 FDN。exact 早期路徑（直接、透射、反射、繞射）不進入 FDN，而以獨立路徑渲染。用於分析 late 殘響的時間與頻譜輸入，或送入自製殘響器。

**呼叫方式** — `outTaps` = NULL、`tapCapacity` = 0 時回傳所需數量（與 `STRawIRDescriptor.reverbSendTapCount` 相同）。渲染請求的 `reverbSendMask` 決定這些 tap 中哪些會激發殘響槽。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `outTaps` | 接收 tap 的呼叫端陣列。NULL 則為大小查詢（此時 `tapCapacity` 須為 0） |
| `tapCapacity` | `outTaps` 元素數。0 以上 |

**結構體** `STRawIRReverbSendTap`（能量域）

| 欄位 | 說明 |
|---|---|
| `sourcePathType` | 音源側路徑系列的路由標籤（目前音源傳輸為 Reflection） |
| `role` | `STReverbSendRole` — 目前值只有 `ST_REVERB_SEND_OBSERVED_SCATTER`(0) 一個 |
| `depth` | 穩定的傳輸時間 bin 序號 |
| `reserved0` | 保留 |
| `delaySeconds` | 延遲（秒） |
| `delaySamples` | 延遲（44.1 kHz 樣本） |
| `bandEnergy[9]` | 9 頻帶能量 |
| `matchDirFromSource[3]` | 音源側方向 |
| `pathLengthMeters` | 路徑長度（m，已反映 `sceneRatio`） |
| `relativeSpeed` | 相對速度（m/s） |
| `delayChangePerSample` | 每樣本延遲變化 |
| `pathId` | 64 位元路徑 ID |

**回傳值** — 已複製（或所需）的 tap 數。失敗為 `0`：引數錯誤為 `ST_STATUS_INVALID_ARGUMENT`，容量不足為 `ST_STATUS_BUFFER_TOO_SMALL`，無快取或配對時為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_copy_raw_continuity_ids</code> — 複製原始早期 tap 的連續性路徑 ID 陣列</summary>

```c
int st_off_ir_copy_raw_continuity_ids(STOFF_Context* context, STListenerId listener, STSourceId source, uint64_t* outPathIds, int idCapacity);
```

**用途** — 合併為一個 tap 的路徑擁有多個拓撲路徑 ID 時，將判定為同一路徑的這些 ID（別名）輸出為一個扁平陣列。tap `i` 的 ID 為 `outPathIds[taps[i].continuityOffset .. + taps[i].continuityCount)`。唯一路徑的 tap 範圍為空（`pathId` 即該 ID）。用於主機自行在計算結果之間建立路徑對應時，即使代表 `pathId` 改變也能辨認為同一路徑。

**呼叫方式** — 與 `st_off_ir_copy_raw_early_taps` 在同一快取世代中一起複製（不包含一次散射單元）。`outPathIds` = NULL、`idCapacity` = 0 時回傳所需數量（與 `STRawIRDescriptor.continuityIdCount` 相同）。執行緒：`[control]` — 取得工作互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `outPathIds` | 接收 64 位元路徑 ID 的呼叫端陣列。NULL 則為大小查詢（此時 `idCapacity` 須為 0） |
| `idCapacity` | `outPathIds` 元素數。0 以上 |

**回傳值** — 已複製（或所需）的 ID 數。失敗為 `0`：引數錯誤為 `ST_STATUS_INVALID_ARGUMENT`，容量不足為 `ST_STATUS_BUFFER_TOO_SMALL`，無快取或配對時為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_init_pressure_request</code> — 以預設值填入壓力 IR 請求結構體</summary>

```c
void st_off_ir_init_pressure_request(STOfflinePressureIRRequestOptions* outOptions);
```

**用途** — 一次填入 `STOfflinePressureIRRequestOptions` 的版本戳記與預設值。傳給壓力 IR 渲染（`st_off_ir_render_pressure`、`st_off_ir_render_pressure_mixed`、`st_off_batch_add_pressure_render*`）之前，務必先以此函式初始化，再只變更需要的欄位。

**呼叫方式** — 隨時可呼叫。執行緒：`[any]` — 只填入呼叫端結構體，可在任何執行緒無阻塞呼叫。

| 參數 | 說明 |
|---|---|
| `outOptions` | 要填入的結構體。NULL 則不做任何事 |

**結構體** `STOfflinePressureIRRequestOptions`

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `structSize` | `sizeof(STOfflinePressureIRRequestOptions)` | 版本戳記 |
| `apiVersion` | `st_off_get_api_version()` 的值 | 版本戳記 |
| `outputMode` | `ST_PRESSURE_IR_BROADBAND_MONO`(0) | `STPressureIROutput` — `ST_PRESSURE_IR_BROADBAND_MONO`（0，寬頻單聲道 1 聲道） / `ST_PRESSURE_IR_SEPARATE_BANDS`（1，9 頻帶分離）。在同一請求中，單聲道 = 9 頻帶之和成立 |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 放入結果的成分。`ST_OFFLINE_OUTPUT_DIRECT`(1) / `TRANSMISSION`(2) / `REFLECTION`(4) / `DIFFRACTION`(8) / `LATE_REVERB`(16) 的 OR。組合 `ST_OFFLINE_OUTPUT_EARLY_ALL`（早期 4 種）、`ST_OFFLINE_OUTPUT_FULL`（全部）。`LATE_REVERB` 會同時放入 late 殘響與一次散射單元。`FULL` 以外的位元拒絕 |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | 以早期路徑 4 位元（`ST_OFFLINE_OUTPUT_DIRECT`·`TRANSMISSION`·`REFLECTION`·`DIFFRACTION`）選擇激發 late 殘響槽的送出 tap。`ST_OFFLINE_REVERB_SEND_ALL` = `ST_OFFLINE_OUTPUT_EARLY_ALL`。`EARLY_ALL` 以外的位元拒絕 |
| `renderMethod` | 0 | 渲染器選擇子。壓力 IR 渲染器只有一個，0·1·2（`ST_PRESSURE_IR_RENDER_SIMULATE` / `SYNTHESIZE_EXACT` / `SIMULATE2`，舊版別名）都走同一渲染，結果位元組相同。新程式碼用 0。其他值拒絕 |
| `reserved[9]` | 0 | 保留 |

`outputMask` 決定可聽見（被回傳）的成分，`reverbSendMask` 決定哪些送出 tap 激發 late 殘響槽。例如只設 `outputMask` = `ST_OFFLINE_OUTPUT_LATE_REVERB`，即可得到去除早期路徑的 late stem。

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_ir_get_pressure_band_centers</code> — 複製 9 頻帶壓力 IR 的頻帶中心頻率（Hz）</summary>

```c
int st_off_ir_get_pressure_band_centers(float* outHz, int capacity);
```

**用途** — 告知 `ST_PRESSURE_IR_SEPARATE_BANDS` 結果的頻帶 `b` 屬於哪個頻率範圍。引擎頻帶為 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz 共 9 個（`ST_FREQUENCY_BANDS`）。

**呼叫方式** — 不需情境，隨時可呼叫。用作儲存或繪製頻帶分離 IR 時的標籤。是否支援以 `ST_CAP_OFFLINE_PRESSURE_BAND_METADATA` 確認。執行緒：`[any]` — 複製編譯期常數。

| 參數 | 說明 |
|---|---|
| `outHz` | 接收中心頻率的陣列。NULL 則為大小查詢（此時 `capacity` 為 0） |
| `capacity` | `outHz` 元素數。須為 9 以上 |

**回傳值** — 頻帶數 `9`（複製成功或大小查詢）。`capacity` 小於 9，或 `outHz` 為 NULL 但 `capacity` 非 0 時為 `0`。

</details>

<details>
<summary><code>st_off_ir_render_pressure</code> — 渲染一組聆聽者·音源配對的壓力 IR（寬頻單聲道或 9 頻帶）</summary>

```c
int st_off_ir_render_pressure(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 將 canonical 快取中的一組配對渲染為時域壓力脈衝響應（RIR）。以脈衝合成 exact 早期路徑與送出 tap，late 殘響以 FDN 渲染。用於聲學分析（T60、C80、EDT 等）、與量測值比較，或擷取外部摺積殘響用的 IR。這是未空間化的壓力訊號，不論 early 空間模式，永遠是 exact 標準版。

**呼叫方式** — 在 `st_off_ir_compute` 之後呼叫。結果一次寫入呼叫端擁有的緩衝區。

1. 大小查詢：以 `outValues` = NULL、`capacityValues` = 0 呼叫則回傳所需的值數量，配對有效時也會填入 `outInfo`。
2. 以該大小取得緩衝區後再次呼叫。

取樣率固定為 44100 Hz。長度為 `floor(seconds × 44100)` 幀，值數量在單聲道時為幀數，頻帶分離時為 9 × 幀數。頻帶分離的佈局為 `values[band × bandStride + sample]`（`bandStride` = `frameCount`）。輸出為 **未正規化** 的絕對電平，且沒有正規化選項。晚於延遲環上限（`st_off_render_set_max_delay_seconds`，預設 4 s）到達的 exact 路徑會被排除。若有套用音源 EQ，也會套用同一濾波器。重複渲染相同請求的結果位元相同。可從其他執行緒以 `st_off_ir_request_cancel` 中斷。是否支援以 `ST_CAP_OFFLINE_PRESSURE_IR` 確認。執行緒：`[control, blocking]` — 渲染在呼叫執行緒上執行，並與此情境的其他工作序列化。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `seconds` | IR 長度（秒）。有限正數，最少 1 幀 |
| `options` | 以 `st_off_ir_init_pressure_request` 初始化的請求。不可為 NULL。欄位請參考該條目 |
| `outValues` | 接收結果的呼叫端緩衝區（float）。NULL 則為大小查詢 |
| `capacityValues` | `outValues` 的 float 數量。大小查詢時為 0 |
| `outInfo` | 結果中繼資料。允許 NULL。傳入時由呼叫端填入 `structSize` = `sizeof(STOfflinePressureIRInfo)`、`apiVersion` |

**結構體** `STOfflinePressureIRInfo`

| 欄位 | 說明 |
|---|---|
| `structSize`, `apiVersion` | 由呼叫端填入的版本戳記 |
| `cacheGeneration` | 渲染所用的快取世代 |
| `listenerId` | 聆聽者 ID |
| `sourceId` | 音源 ID。混合渲染為 `-1` |
| `sampleRate` | 44100 |
| `frameCount` | 幀數 |
| `bandCount` | 1（寬頻單聲道）或 9（頻帶分離） |
| `bandStride` | 頻帶間隔 = `frameCount` |
| `valueCount` | 總 float 數量 = `frameCount × bandCount` |
| `outputMode` | 實際使用的 `STPressureIROutput` |
| `reverbSendTapCount` | 送入渲染的送出 tap 數（混合渲染為各音源之和） |
| `outputMask`, `reverbSendMask` | 實際使用的遮罩 |
| `sourceCount` | 送入渲染的音源數。獨奏渲染為 1 |
| `reserved[9]` | 保留 |

**回傳值** — 已寫入（或所需）的 float 數量。失敗為 `0`：無快取為 `ST_STATUS_UNAVAILABLE`，請求、長度、遮罩、戳記錯誤或大小查詢時無該配對為 `ST_STATUS_INVALID_ARGUMENT`，緩衝區不足為 `ST_STATUS_BUFFER_TOO_SMALL`，渲染失敗或取消為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_render_pressure_mixed</code> — 一次放入一個聆聽者與多個音源，渲染一個合併的壓力 IR</summary>

```c
int st_off_ir_render_pressure_mixed(STOFF_Context* context, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 不必分別渲染同一聆聽者的多個音源 RIR 再相加，而是全部放入一次脈衝渲染，輸出一個 RIR。結果等同各音源 `st_off_ir_render_pressure` 結果之和：exact tap 依請求順序累加到同一輸出，送出則以振幅（含符號）原樣累加到聆聽者側，FDN 只執行一次。由於 FDN 是線性非時變的，late 也像獨奏之和一樣相干地相加，而 FDN 成本只有一次。用於需要多個音源同時發聲之場景的 RIR 時。

**呼叫方式** — 在 `st_off_ir_compute` 之後呼叫。緩衝區與大小查詢約定、長度、取樣率、無正規化皆與 `st_off_ir_render_pressure` 相同。只放入該聆聽者的部分音源也可以。只有浮點加總順序與獨奏之和不同，因此並非位元相同，加總順序為 `sources` 陣列順序（與音源註冊順序無關）。重複渲染相同請求為位元相同，`sourceCount` = 1 時與獨奏渲染位元相同。原始 IR 查詢仍是逐音源。是否支援以 `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED` 確認。執行緒：`[control, blocking]` — 渲染在呼叫執行緒上執行。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `sources` | 音源控制代碼陣列。不可重複，必須全部是該聆聽者的 canonical 配對 |
| `sourceCount` | 音源數。`1` 以上 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`(1024) 以下 |
| `seconds` | IR 長度（秒）。有限正數，最少 1 幀 |
| `options` | 以 `st_off_ir_init_pressure_request` 初始化的請求 |
| `outValues` | 結果緩衝區。NULL 則為大小查詢 |
| `capacityValues` | `outValues` 的 float 數量。大小查詢時為 0 |
| `outInfo` | 結果中繼資料（`STOfflinePressureIRInfo`，欄位請參考 `st_off_ir_render_pressure` 條目）。允許 NULL。`sourceId` = -1、`sourceCount` = 音源數、`reverbSendTapCount` = 各音源之和 |

**回傳值** — 已寫入（或所需）的 float 數量。失敗為 `0`：無快取為 `ST_STATUS_UNAVAILABLE`，重複、未註冊音源、錯誤請求為 `ST_STATUS_INVALID_ARGUMENT`，緩衝區不足為 `ST_STATUS_BUFFER_TOO_SMALL`，渲染失敗或取消為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_init_binaural_request</code> — 以預設值填入雙耳 IR 請求結構體</summary>

```c
void st_off_ir_init_binaural_request(STOfflineBinauralIRRequestOptions* outOptions);
```

**用途** — 填入 `STOfflineBinauralIRRequestOptions` 的版本戳記與預設值。傳給 `st_off_ir_render_binaural` 與 `st_off_ir_render_audition_pair` 之前，務必以此函式初始化。

**呼叫方式** — 預設 `hrtfType` 為 SADIE D2，需要外部資產檔（搜尋順序請參考 `st_off_render_set_spatializer` 條目）。若要在無資產的情況下使用，將 `hrtfType` 改為 `ST_SPATIALIZER_MIT_KEMAR`（1，內建）或 `ST_SPATIALIZER_PANNING`(0)。執行緒：`[any]` — 只填入呼叫端結構體。

| 參數 | 說明 |
|---|---|
| `outOptions` | 要填入的結構體。NULL 則不做任何事 |

**結構體** `STOfflineBinauralIRRequestOptions`

| 欄位 | 預設值 | 說明 |
|---|---|---|
| `structSize` | `sizeof(STOfflineBinauralIRRequestOptions)` | 版本戳記 |
| `apiVersion` | `st_off_get_api_version()` 的值 | 版本戳記 |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 放入結果的成分（`ST_OFFLINE_OUTPUT_*`，意義與 `st_off_ir_init_pressure_request` 條目相同） |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | 激發 late 殘響槽的送出 tap（早期路徑 4 位元） |
| `hrtfType` | `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) | `STSpatializerType` — `PANNING`(0) / `MIT_KEMAR`(1) / `SADIE_D2_KEMAR`(2) |
| `reserved[10]` | 0 | 保留 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_ir_render_binaural</code> — 渲染一組聆聽者·音源配對的雙耳（立體聲 L/R）IR</summary>

```c
int st_off_ir_render_binaural(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflineBinauralIRRequestOptions* options, float* outInterleavedLR, int capacityFrames, STOfflineBinauralIRInfo* outInfo);
```

**用途** — 將 canonical 快取中的一組配對渲染為以 HRTF 空間化的 2 聲道脈衝響應。用於取得耳機聆聽用的 BRIR，或送入外部摺積器。早期反射路徑依渲染時的 early 空間模式（`st_off_render_set_early_spatial_mode`）。

**呼叫方式** — 在 `st_off_ir_compute` 之後呼叫，大小查詢方式與壓力 IR 相同（`outInterleavedLR` = NULL、`capacityFrames` = 0 → 所需幀數與 `outInfo`）。`capacityFrames` 不是 float 數量而是 **立體聲幀數**，緩衝區以 L/R 交錯（`[L0, R0, L1, R1, …]`）存放幀數 × 2 個 float。長度為 `floor(seconds × 44100)` 幀，取樣率固定為 44100 Hz。限幅器與正規化永遠關閉（無正規化選項）。OBJECTS 模式下路徑淡變與 Doppler 也固定關閉；BED 模式是同步即時 bed 路徑，路徑淡變、Doppler、增益斜坡以即時預設值開啟，在穩態下渲染（靜止場景中對結果無影響）。缺少 SADIE D2 資產時，從大小查詢起即失敗。是否支援以 `ST_CAP_OFFLINE_BINAURAL_IR` 確認。執行緒：`[control, blocking]` — 渲染在呼叫執行緒上執行。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `seconds` | IR 長度（秒）。有限正數，最少 1 幀 |
| `options` | 以 `st_off_ir_init_binaural_request` 初始化的請求。不可為 NULL |
| `outInterleavedLR` | L/R 交錯結果緩衝區。NULL 則為大小查詢 |
| `capacityFrames` | 緩衝區的 **立體聲幀** 數。大小查詢時為 0 |
| `outInfo` | 結果中繼資料。允許 NULL。傳入時由呼叫端填入 `structSize` = `sizeof(STOfflineBinauralIRInfo)`、`apiVersion` |

**結構體** `STOfflineBinauralIRInfo`

| 欄位 | 說明 |
|---|---|
| `structSize`, `apiVersion` | 由呼叫端填入的版本戳記 |
| `cacheGeneration` | 渲染所用的快取世代 |
| `listenerId`, `sourceId` | 配對的 ID |
| `sampleRate` | 44100 |
| `frameCount` | 立體聲幀數 |
| `channelCount` | 固定 2 |
| `valueCount` | float 數量 = `frameCount × 2` |
| `reverbSendTapCount` | 送入渲染的送出 tap 數 |
| `outputMask`, `reverbSendMask` | 實際使用的遮罩 |
| `hrtfType` | 實際使用的 `STSpatializerType` |
| `earlySpatialMode` | 實際使用的 `STEarlySpatialMode`（是否支援見 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`） |
| `reserved[9]` | 保留 |

**回傳值** — 已寫入（或所需）的立體聲幀數。失敗為 `0`：無快取、缺少 SADIE D2 資產，或 BED 模式但快取中無 bed 變體時為 `ST_STATUS_UNAVAILABLE`，請求或戳記錯誤或大小查詢時無該配對為 `ST_STATUS_INVALID_ARGUMENT`，緩衝區不足為 `ST_STATUS_BUFFER_TOO_SMALL`，渲染失敗或取消為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_ir_render_audition_pair</code> — 將乾訊號分別以固定 RIR 摺積與引擎渲染階段渲染，成對回傳</summary>

```c
int st_off_ir_render_audition_pair(STOFF_Context* context, STListenerId listener, STSourceId source, double irSeconds, const STOfflineBinauralIRRequestOptions* options, const float* dryMono, int dryFrames, float* outConvolvedLR, float* outStageLR, int capacityFrames, STOFF_AuditionInfo* outInfo);
```

**用途** — 從同一 canonical 配對產生兩種聆聽結果：(1) 將雙耳 IR 渲染為固定 RIR 並與乾訊號摺積的結果，(2) 將同一配對放入引擎的渲染階段（與即時渲染共用的階段），讓乾訊號直接通過的結果。用於並排聆聽或比較兩個結果，確認擷取出的 IR 有多能代表引擎實際發出的聲音。

**呼叫方式** — 在 `st_off_ir_compute` 之後呼叫。兩個輸出緩衝區皆為 L/R 交錯的立體聲幀，必須同時傳入或同時為 NULL。皆為 NULL 時 `capacityFrames` 須為 0，`dryMono` 也可為 NULL，成為只以 `dryFrames` 計算大小的中繼資料查詢。輸出長度為 `dryFrames + irFrames − 1` 幀（`irFrames` = `floor(irSeconds × 44100)`），各緩衝區須存放該幀數 × 2 個 float。空間化器、遮罩、early 空間模式、限幅器/正規化關閉的規則與 `st_off_ir_render_binaural` 相同。執行緒：`[control, blocking]` — 渲染在呼叫執行緒上執行。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `irSeconds` | 摺積所用的 IR 長度（秒）。有限正數，最少 1 幀 |
| `options` | 以 `st_off_ir_init_binaural_request` 初始化的請求（`STOfflineBinauralIRRequestOptions`，欄位請參考該條目） |
| `dryMono` | 44.1 kHz 單聲道乾訊號。渲染時必填，大小查詢時允許 NULL |
| `dryFrames` | 乾訊號幀數。1 以上（大小查詢也需要） |
| `outConvolvedLR` | 固定 RIR 摺積結果（L/R 交錯）。與 `outStageLR` 同為 NULL 時為大小查詢 |
| `outStageLR` | 引擎渲染階段結果（L/R 交錯） |
| `capacityFrames` | 各緩衝區的立體聲幀數。大小查詢時為 0 |
| `outInfo` | 結果中繼資料。允許 NULL。傳入時由呼叫端填入 `structSize` = `sizeof(STOFF_AuditionInfo)`、`apiVersion` |

**結構體** `STOFF_AuditionInfo`

| 欄位 | 說明 |
|---|---|
| `structSize`, `apiVersion` | 由呼叫端填入的版本戳記 |
| `cacheGeneration` | 渲染所用的快取世代 |
| `listenerId`, `sourceId` | 配對的 ID |
| `sampleRate` | 44100 |
| `frameCount` | 輸出立體聲幀數 = `dryFrameCount + irFrameCount − 1` |
| `dryFrameCount` | 乾訊號幀數 |
| `irFrameCount` | IR 幀數 |
| `earlySpatialMode` | 實際使用的 `STEarlySpatialMode` |
| `reserved[7]` | 保留 |

**回傳值** — 輸出立體聲幀數。失敗為 `0`：無快取、缺少 SADIE D2 資產，或 BED 模式但無 bed 變體時為 `ST_STATUS_UNAVAILABLE`，只有一側緩衝區為 NULL、`dryFrames` 為 0 以下、錯誤請求為 `ST_STATUS_INVALID_ARGUMENT`，緩衝區不足為 `ST_STATUS_BUFFER_TOO_SMALL`，渲染失敗或取消為 `ST_STATUS_UNAVAILABLE`。

</details>

<details>
<summary><code>st_off_debug_get_snapshot_info</code> — 讀取聆聽者最後計算世代的診斷快照摘要（路徑數、視覺化緩衝區大小）</summary>

```c
int st_off_debug_get_snapshot_info(STOFF_Context* context, STListenerId listener, STPropagationSnapshotInfo* outInfo);
```

**用途** — 回傳最後一次 `st_off_ir_compute` 為該聆聽者發佈之診斷快照的摘要。`frameGeneration` 保證全部、反射、繞射路徑數與繞射分類計數器、視覺化路徑與點數皆 **來自同一世代**。用於確認路徑數與決定 `st_off_debug_copy_visual_paths` 的緩衝區大小。

**呼叫方式** — 快照由 `st_off_ir_compute` 發佈，因此在此之前回傳 0。若要取得視覺化路徑與點，須在 compute 之前以 `st_off_debug_set_collect_visual_paths` 開啟收集。將取得的 `frameGeneration` 原樣傳給 `st_off_debug_copy_visual_paths`，即可檢查是否複製同一世代。執行緒：`[control]` — 取得工作與視覺化互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `outInfo` | 結果結構體。呼叫端填入 `structSize` = `sizeof(STPropagationSnapshotInfo)`、`apiVersion` |

**結構體** `STPropagationSnapshotInfo`

| 欄位 | 說明 |
|---|---|
| `structSize`, `apiVersion` | 由呼叫端填入的版本戳記 |
| `frameGeneration` | 此快照的世代（離線為 IR 快取世代） |
| `collectionMask` | 收集此世代時的 `STPathCollectionFlag` 遮罩 |
| `reserved0` | 保留 |
| `visualPathCount` | 全部視覺化路徑記錄數（含失敗 walk，`ST_VISUAL_PATH_COPY_ALL` 所需數量） |
| `validVisualPathCount` | 走完路徑記錄數（`ST_VISUAL_PATH_COPY_VALID_ONLY` 所需數量） |
| `visualPointCount` | 全部視覺化點數 |
| `validVisualPointCount` | 走完路徑的點數 |
| `totalPathCount` | 全部路徑數 |
| `reflectionPathCount` | 反射路徑數 |
| `diffractionPathCount` | 繞射路徑數 |
| `sourceSideOnlyPaths` | 僅在音源側邊緣繞射的路徑數 |
| `unclassifiedPaths` | 未分類的繞射路徑數 |
| `sourceSideEvents` | 音源側繞射事件數 |
| `terminalOnlyPaths` | 僅在聆聽者側末端邊緣繞射的路徑數 |
| `sourceAndTerminalPaths` | 兩側皆繞射的路徑數 |
| `terminalEvents` | 聆聽者側末端繞射事件數 |
| `reserved[4]` | 保留 |

走完的路徑及其點佔據各陣列的前段（prefix）。

**回傳值** — `1` = 成功 / `0` = 失敗或無快照（compute 之前、無該聆聽者、`outInfo` 為 NULL 或戳記不符）。

</details>

<details>
<summary><code>st_off_debug_copy_visual_paths</code> — 將視覺化路徑記錄與點複製到呼叫端緩衝區</summary>

```c
int st_off_debug_copy_visual_paths(STOFF_Context* context, STListenerId listener, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**用途** — 將最後計算世代的視覺化路徑（音源 → 交互作用點 → 聆聽者，導引射線為聆聽者 → 命中點）複製為記錄陣列與點陣列，以便繪製於 3D 檢視。頂點座標維持場景單位，可直接疊加繪製於主機場景。

**呼叫方式** — 以 `st_off_debug_get_snapshot_info` 取得數量並配置緩衝區後呼叫。沒有大小查詢模式 — 容量小於所需數量則失敗。在 `frameGeneration` 傳入 `st_off_debug_get_snapshot_info` 回傳的值，則期間若發佈了新世代會失敗。傳入 0 則不檢查世代，複製目前快照。記錄 `i` 的點為 `outPoints[pointOffset .. pointOffset + pointCount)`。執行緒：`[control]` — 取得工作與視覺化互斥鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `listener` | 聆聽者控制代碼 |
| `frameGeneration` | 預期的世代（`st_off_debug_get_snapshot_info` 的值）。0 = 不檢查，使用目前快照 |
| `copyMode` | `STVisualPathCopyMode` — `ST_VISUAL_PATH_COPY_VALID_ONLY`（0，只有走完的路徑） / `ST_VISUAL_PATH_COPY_ALL`（1，含失敗 walk）。其他值拒絕 |
| `outPaths` | 路徑記錄緩衝區。有要複製的路徑時不可為 NULL |
| `pathCapacity` | `outPaths` 元素數。須不少於模式對應的路徑數 |
| `outPoints` | 點緩衝區。有要複製的點時不可為 NULL |
| `pointCapacity` | `outPoints` 元素數。須不少於模式對應的點數 |

**結構體** `STVisualPathRecord`

| 欄位 | 說明 |
|---|---|
| `pointOffset`, `pointCount` | 此路徑的點在點陣列中佔據的區間（有序路徑） |
| `depth` | 交互作用階數 |
| `pathKind` | `STPathKind` — `ST_PATH_GUIDE_RAY`(0) / `ST_PATH_DIRECT`（1，包含透射） / `ST_PATH_REFLECTION`(2) / `ST_PATH_DIFFRACTION_S`（4，音源側邊緣） / `ST_PATH_DIFFRACTION_L`（8，聆聽者側末端邊緣） / `ST_PATH_DIFFRACTION_SL`(12) / `ST_PATH_SOURCE_TRANSPORT_RAY`(16)。`ST_PATH_DIFFRACTION_UNKNOWN`(3) 正常情況下不會出現 |
| `soundSourceIndex` | 音源索引。導引射線為 -1 |
| `valid` | 1 = 走完 / 0 = 中途失敗的 walk |
| `totalLengthMeters` | 路徑總長（m，已反映 `sceneRatio`） |
| `reserved0` | 保留 |

**結構體** `STVisualPoint`

| 欄位 | 說明 |
|---|---|
| `x`, `y`, `z` | 頂點座標（維持場景單位） |
| `flags` | `STVisualPointFlag` — `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`（1，繞射點） |

**回傳值** — `1` = 成功 / `0` = 失敗。`copyMode` 錯誤或所需緩衝區為 NULL 時為 `ST_STATUS_INVALID_ARGUMENT`，無快照或世代已變更時為 `ST_STATUS_UNAVAILABLE`，容量不足為 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_off_debug_copy_mesh_accel_nodes</code> — 複製網格 BLAS 的節點方塊供視覺化</summary>

```c
int st_off_debug_copy_mesh_accel_nodes(STOFF_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 以唯讀方式複製傳播所用網格加速結構（BLAS）的節點包圍盒。用於除錯視覺化加速結構如何分割網格。與即時 `st_rt_debug_copy_mesh_accel_nodes` 契約相同，離線情境也以與即時相同的邊界設定建置 BLAS，因此相同加速結構種類的結果相同。

**呼叫方式** — 建立網格後隨時可呼叫。BLAS 以網格建立時的 `st_off_scene_set_accel` 值建置。節點為深度優先 **前序** 順序，根為 `[0]`（depth 0），各節點的父節點是陣列前方最近的 depth − 1 節點。座標為傳給 `st_off_mesh_create` 的頂點框架（網格區域座標），要以實例繪製時由主機乘上物件變換。大型網格有數千個節點，通常以 `maxDepth` 只看上層。緩衝區不足時只寫入前序順序的前段（從最左分支開始），因此若要上層，請以 `maxDepth` 截斷。是否支援以 `ST_CAP_ACCEL_DEBUG_NODES` 確認。執行緒：`[control]` — 只取得場景 read 鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `mesh` | 網格控制代碼 |
| `maxDepth` | 負數 = 全部深度。0 以上時只計算、寫入 depth 在 `maxDepth` 以下的節點 |
| `outNodes` | 節點緩衝區。NULL 則為大小查詢（忽略 `nodeCapacity`） |
| `nodeCapacity` | `outNodes` 元素數。從前端起寫入 min(全部, `nodeCapacity`) 個 |

**結構體** `STAccelNode`（32 位元組，無版本戳記的陣列元素）

| 欄位 | 說明 |
|---|---|
| `boundsMin[3]`, `boundsMax[3]` | 節點包圍盒（該加速結構建置時的框架，無 `sceneRatio` 轉換） |
| `depth` | 深度。根 = 0 |
| `primitiveCount` | 葉節點：包含的圖元數（0 以上） / 內部節點：-1 |

各加速結構種類的意義：BVH 系列（0 BinnedSAH、2 TinyBVH、3 LBVH、4 LBVH_Simd）是建置出的二元樹，4/8-wide 走訪表示是摺疊此樹而成，因此其方塊是此清單的子集。KD（1 HybridKD）是以分割平面切割根方塊所推導的方塊，兄弟方塊不重疊且精確分割父節點，存在空葉節點（`primitiveCount` 0），跨多個葉節點的三角形在每個葉節點都會計數。

**回傳值** — `maxDepth` 內的 **全部** 節點數（0 以上） / `-1` = 失敗（`context` 為 NULL，網格不存在為 `ST_STATUS_NOT_FOUND`）。截斷的複製仍回傳全部數量，並留下 `ST_STATUS_BUFFER_TOO_SMALL`。

</details>

<details>
<summary><code>st_off_debug_copy_scene_accel_nodes</code> — 複製場景 TLAS（物件實例加速結構）的節點方塊</summary>

```c
int st_off_debug_copy_scene_accel_nodes(STOFF_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 複製建置於物件實例之上的場景加速結構（TLAS）的節點包圍盒。用於視覺化整個場景的空間分割。與即時 `st_rt_debug_copy_scene_accel_nodes` 契約相同。

**呼叫方式** — 靜態 TLAS 是 `st_off_build` 發佈的版本，在下一次建置前維持上次發佈的內容（看不到已暫存的靜態變更）。動態 TLAS 由動態物件重建重新發佈。座標為場景（世界）框架，TLAS 葉節點的圖元不是三角形而是物件實例。節點順序、`maxDepth`、大小查詢、截斷約定與 `STAccelNode` 欄位皆與 `st_off_debug_copy_mesh_accel_nodes` 條目相同。是否支援見 `ST_CAP_ACCEL_DEBUG_NODES`。執行緒：`[control]` — 只取得場景 read 鎖。

| 參數 | 說明 |
|---|---|
| `context` | 離線情境控制代碼 |
| `layer` | `STAccelLayer` — `ST_ACCEL_LAYER_STATIC`（0，`st_off_build` 發佈的靜態 TLAS） / `ST_ACCEL_LAYER_DYNAMIC`（1，動態物件 TLAS） |
| `maxDepth` | 負數 = 全部深度。0 以上時只到該深度 |
| `outNodes` | 節點緩衝區。NULL 則為大小查詢 |
| `nodeCapacity` | `outNodes` 元素數 |

**回傳值** — `maxDepth` 內的全部節點數（0 以上）。該 TLAS 尚不存在時（建置前、無該種類物件）不是錯誤而是 `0`。`-1` = 失敗（`context` 為 NULL，`layer` 超出範圍為 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_debug_build_mesh_accel_nodes</code> — 不需情境，建置單一網格的 BLAS 並回傳節點方塊</summary>

```c
int st_off_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**用途** — 在建立場景或情境之前，預覽單一網格的加速結構會如何建置（主機編輯器預覽等）。與網格建立使用相同的輸入驗證與建置路徑，因此相同 `accelKind` 時與情境建置的 BLAS 為同一棵樹。與即時 `st_rt_debug_build_mesh_accel_nodes` 結果相同。

**呼叫方式** — 每次呼叫都重新建置 BLAS（與網格大小成正比）。結果由主機快取。節點順序、`maxDepth`、大小查詢、截斷約定與 `STAccelNode` 欄位皆與 `st_off_debug_copy_mesh_accel_nodes` 條目相同。執行緒：`[any]` — 無全域狀態，可在任何執行緒呼叫（耗時等同建置成本）。

| 參數 | 說明 |
|---|---|
| `mesh` | 三角形網格（見下方結構體）。不可為 NULL |
| `accelKind` | `st_off_scene_set_accel` 的 kind — 0 BinnedSAH / 1 HybridKD / 2 TinyBVH / 3 LBVH / 4 LBVH_Simd。`-1` = 引擎預設（TinyBVH） |
| `maxDepth` | 負數 = 全部深度。0 以上時只到該深度 |
| `outNodes` | 節點緩衝區。NULL 則為大小查詢 |
| `nodeCapacity` | `outNodes` 元素數 |

**結構體** `STMesh`

| 欄位 | 說明 |
|---|---|
| `numVertices` | 頂點數 |
| `vertices` | xyz 交錯 float 陣列（`numVertices × 3` 個） |
| `numTriangles` | 三角形數 |
| `triangles` | 頂點索引陣列（`numTriangles × 3` 個） |

**回傳值** — `maxDepth` 內的全部節點數（0 以上） / `-1` = 失敗（mesh 或陣列為 NULL、數量 0 以下、非有限頂點、索引超出範圍、錯誤的 kind、配置失敗）。因無情境，不會留下 last_status。

</details>

<details>
<summary><code>st_off_batch_create</code> — 建立平行執行多個情境之計算·壓力 IR 渲染的批次物件</summary>

```c
STOFF_Batch* st_off_batch_create(int32_t workerCount);
```

**用途** — 離線批次執行環境的起點。為每個情境照常設定場景、音源、聆聽者、選項後，將這些情境與壓力 IR 渲染請求一次註冊到批次，引擎便以自有的 **批次工作執行緒** 對每個工作依序執行 `st_off_ir_compute` 與已註冊的壓力渲染，並以輪詢回傳已完成的工作。大量產生多個場景、位置的 RIR 時，主機不必自行撰寫執行緒集區。結果與在同一情境中以呼叫執行緒執行 `st_off_ir_compute` → `st_off_ir_render_pressure` 位元相同。

**呼叫方式** — 生命週期如下。

1. `st_off_batch_create` — 建立批次物件（此時不建立執行緒）
2. `st_off_batch_add_job` — 以一個情境 = 一個工作註冊
3. `st_off_batch_add_pressure_render` / `st_off_batch_add_pressure_render_mixed` — 為每個工作註冊渲染請求
4. `st_off_batch_start` — 啟動批次工作執行緒並立即返回（每個批次一次）
5. `st_off_batch_poll`（接收完成記錄） · `st_off_batch_wait` · `st_off_batch_remaining` — 觀察進度
6. `st_off_batch_fetch_pressure` — 複製已完成工作的結果
7. `st_off_batch_release_job` — 釋放已全部取得之工作的結果記憶體
8. `st_off_batch_destroy` — 取消剩餘工作、join 工作執行緒、釋放

批次只處理壓力 IR（雙耳與試聽渲染以情境函式直接呼叫）。批次工作執行緒與情境內部的計算集區工作執行緒不同，不屬於 `STThreadType`。是否支援以 `ST_CAP_OFFLINE_BATCH` 確認。執行緒：`[any]` — 批次工作執行緒在 start 時建立。

| 參數 | 說明 |
|---|---|
| `workerCount` | 批次工作執行緒數。0 以下 = 硬體執行緒數。實際啟動的數量不超過工作數 |

**回傳值** — 批次控制代碼。配置失敗則為 NULL。

</details>

<details>
<summary><code>st_off_batch_destroy</code> — 取消·清理並釋放批次</summary>

```c
void st_off_batch_destroy(STOFF_Batch* batch);
```

**用途** — 取消剩餘工作，join 所有批次工作執行緒後，釋放批次與保存中的結果。

**呼叫方式** — 在取得所有結果後，或想中斷時呼叫。返回後批次不再參照已註冊的情境。會等待執行中的工作回應取消而停止，因此會阻塞。執行緒：`[any, blocking]` — 可在任何執行緒呼叫，但會阻塞至工作執行緒 join 完成。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼。NULL 則不做任何事 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_batch_get_last_status</code> — 讀取批次本身最後一次呼叫的狀態碼</summary>

```c
int st_off_batch_get_last_status(const STOFF_Batch* batch);
```

**用途** — 批次函式（`add_*`、`start`、`fetch_pressure`、`release_job` 等）失敗時以 `STStatus` 回傳原因。各工作的失敗（計算、渲染失敗）不在此處，而是以 `st_off_batch_get_job_error` 讀取。

**呼叫方式** — 在批次函式回傳失敗值（-1 / 0）後立即呼叫。成功的呼叫會以 `ST_STATUS_OK` 清除。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |

**回傳值** — `STStatus` 值（`ST_STATUS_OK`、`ST_STATUS_INVALID_ARGUMENT`、`ST_STATUS_UNAVAILABLE`、`ST_STATUS_BUFFER_TOO_SMALL` 等）。`batch` 為 NULL 時為 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_get_last_error</code> — 複製批次本身的最後錯誤訊息</summary>

```c
int st_off_batch_get_last_error(const STOFF_Batch* batch, char* outMessage, int32_t capacity);
```

**用途** — 回傳與 `st_off_batch_get_last_status` 成對、人類可讀的錯誤訊息（英文）。

**呼叫方式** — 在批次函式失敗後立即呼叫以供記錄。無錯誤時為空字串。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼。NULL 則複製空字串 |
| `outMessage` | 接收訊息的緩衝區。NUL 結尾，依 `capacity` 截斷 |
| `capacity` | `outMessage` 位元組數。1 以上 |

**回傳值** — `1` = 已複製 / `0` = `outMessage` 為 NULL 或 `capacity` 為 0 以下。

</details>

<details>
<summary><code>st_off_batch_worker_count</code> — 讀取批次設定的批次工作執行緒數</summary>

```c
int32_t st_off_batch_worker_count(const STOFF_Batch* batch);
```

**用途** — 回傳解讀傳給 `st_off_batch_create` 之值後的工作執行緒數（若傳入 0 以下則為硬體執行緒數）。

**呼叫方式** — 隨時可呼叫。`st_off_batch_start` 啟動此值與工作數中較小者的工作執行緒。完成記錄的 `workerIndex` 從 0 起、小於此值。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |

**回傳值** — 工作執行緒數。`batch` 為 NULL 時為 `0`。

</details>

<details>
<summary><code>st_off_batch_add_job</code> — 將一個情境註冊為批次工作</summary>

```c
int32_t st_off_batch_add_job(STOFF_Batch* batch, STOFF_Context* context);
```

**用途** — 將已設定好場景、音源、聆聽者、選項的離線情境註冊為一個工作。工作在一個批次工作執行緒上執行 `st_off_ir_compute` 後，依註冊順序執行該工作已註冊的壓力渲染。

**呼叫方式** — `st_off_batch_start` **之前才** 接受。同一批次中不要將同一情境註冊到兩個工作。情境指標是 **借用的**：從註冊起到以 `st_off_batch_poll` 收到該工作的完成記錄為止，不可銷毀該情境或呼叫其他 API。收到完成記錄後批次不再參照該情境，因此即使批次仍存在，主機也重新取得所有權 — 原始 IR 查詢、修改場景與音源、銷毀、重新註冊到其他批次皆可，該工作的結果由批次另行保存，因此 `st_off_batch_fetch_pressure` 照常可用。此行為以 `ST_CAP_OFFLINE_BATCH_CONTEXT_RETURN` 確認，在沒有此位元的程式庫中，銷毀批次前不要動已註冊的情境。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `context` | 要註冊的離線情境（借出） |

**回傳值** — 工作索引（從 0 起，註冊順序）。失敗為 `-1`：`context` 無效或批次已 start 時，批次狀態為 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_add_pressure_render</code> — 為工作新增一組聆聽者·音源配對的壓力 IR 渲染請求</summary>

```c
int32_t st_off_batch_add_pressure_render(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**用途** — `st_off_ir_render_pressure` 的批次版本。工作完成 compute 後渲染此請求，結果由批次保存，再以 `st_off_batch_fetch_pressure` 提供。

**呼叫方式** — 在 `st_off_batch_start` 之前呼叫。一個工作可放入多個請求，依註冊順序執行。一個請求失敗則該工作以失敗結束，之後的渲染不會執行。配對是否存在在渲染時檢查，因此未註冊的配對會以工作失敗（`st_off_batch_get_job_error`）呈現。請求欄位、長度、無正規化等結果的意義與 `st_off_ir_render_pressure` 相同。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `jobIndex` | `st_off_batch_add_job` 回傳的工作索引 |
| `listener` | 聆聽者控制代碼 |
| `source` | 音源控制代碼 |
| `seconds` | IR 長度（秒）。有限正數 |
| `options` | 以 `st_off_ir_init_pressure_request` 初始化的請求（`STOfflinePressureIRRequestOptions`，欄位請參考該條目）。於註冊時複製 |

**回傳值** — 該工作內的渲染索引（從 0 起，註冊順序）。失敗為 `-1`：錯誤請求、不存在的工作索引、批次已 start 時，批次狀態為 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_add_pressure_render_mixed</code> — 為工作新增一個聆聽者·多個音源的混合壓力 IR 渲染請求</summary>

```c
int32_t st_off_batch_add_pressure_render_mixed(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**用途** — `st_off_ir_render_pressure_mixed` 的批次版本。與同一工作的獨奏渲染使用 **相同的渲染索引空間**，結果以 `st_off_batch_fetch_pressure` 取得（`info.sourceId` = -1、`info.sourceCount` = 音源數）。

**呼叫方式** — 在 `st_off_batch_start` 之前呼叫。音源清單於註冊時複製，因此呼叫後可重用陣列。控制代碼有效性與重複於註冊時檢查，配對是否存在則在工作完成 compute 後的渲染時檢查，因此未註冊的配對會以工作失敗（`st_off_batch_get_job_error`）呈現。是否支援見 `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `jobIndex` | 工作索引 |
| `listener` | 聆聽者控制代碼 |
| `sources` | 音源控制代碼陣列。不可重複 |
| `sourceCount` | 音源數。`1` 以上 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`(1024) 以下 |
| `seconds` | IR 長度（秒）。有限正數 |
| `options` | 以 `st_off_ir_init_pressure_request` 初始化的請求 |

**回傳值** — 該工作內的渲染索引。失敗為 `-1`：錯誤請求、音源數超出範圍、無效或重複的控制代碼、不存在的工作索引、批次已 start 時，批次狀態為 `ST_STATUS_INVALID_ARGUMENT`。

</details>

<details>
<summary><code>st_off_batch_start</code> — 啟動批次工作執行緒，開始執行已註冊的工作</summary>

```c
int st_off_batch_start(STOFF_Batch* batch);
```

**用途** — 結束註冊並啟動批次工作執行緒。工作執行緒逐一取得工作並執行 compute 與渲染。

**呼叫方式** — 註冊完所有工作與渲染請求後只呼叫一次。立即返回，之後的進度以 `st_off_batch_poll` / `st_off_batch_wait` / `st_off_batch_remaining` 觀察。start 之後 `add_*` 會被拒絕。批次不能再次 start，因此新工作請註冊到新的批次。執行緒：`[control]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |

**回傳值** — `1` = 已開始 / `0` = 失敗（無工作或已 start → 批次狀態為 `ST_STATUS_INVALID_ARGUMENT`）。

</details>

<details>
<summary><code>st_off_batch_poll</code> — 取出已結束工作的完成記錄</summary>

```c
int32_t st_off_batch_poll(STOFF_Batch* batch, STOfflineBatchCompletion* outCompletions, int32_t capacity);
```

**用途** — 每當一個工作結束就會產生完成記錄，此函式最多取出 `capacity` 筆（從佇列中清除）並複製。收到完成記錄是 fetch 該工作結果並取回情境的條件。

**呼叫方式** — start 之後可在任何執行緒定期呼叫，或在 `st_off_batch_wait` 之後一次清空。每個工作的記錄恰好出現一次。對已收到記錄的工作呼叫 `st_off_batch_fetch_pressure` → `st_off_batch_release_job`。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `outCompletions` | 接收記錄的陣列。由引擎填入各記錄的 `structSize`·`apiVersion` |
| `capacity` | `outCompletions` 元素數。1 以上 |

**結構體** `STOfflineBatchCompletion`

| 欄位 | 說明 |
|---|---|
| `structSize`, `apiVersion` | 由引擎填入的版本戳記 |
| `jobIndex` | 已結束工作的索引 |
| `status` | 0 = 成功 / 1 = compute 或渲染失敗（訊息見 `st_off_batch_get_job_error`） / 2 = 取消 |
| `renderCount` | 成功的壓力渲染數 |
| `workerIndex` | 執行該工作的批次工作執行緒編號 |
| `computeMicros` | 該工作的 compute 經過時間（µs） |
| `renderMicros` | 該工作的渲染經過時間（µs） |
| `reserved[8]` | 保留 |

**回傳值** — 已複製的記錄數（0 以上）。無新完成、`batch` 或 `outCompletions` 為 NULL，或 `capacity` 為 0 以下時為 `0`。

</details>

<details>
<summary><code>st_off_batch_wait</code> — 等待至所有工作結束（或逾時）</summary>

```c
int st_off_batch_wait(STOFF_Batch* batch, int32_t timeoutMs);
```

**用途** — 以阻塞方式等待整個批次完成，取代輪詢迴圈。

**呼叫方式** — 在 start 之後呼叫。等待結束後完成記錄仍留在佇列中，因此接著以 `st_off_batch_poll` 清空（收到記錄後才能 fetch 與取回情境）。執行緒：`[any, blocking]` — 可在任何執行緒呼叫，但會阻塞至完成或逾時。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `timeoutMs` | 最大等待時間（ms）。負數 = 無限等待 |

**回傳值** — `1` = 所有工作完成 / `0` = 逾時或 `batch` 為 NULL。

</details>

<details>
<summary><code>st_off_batch_remaining</code> — 讀取尚未結束的工作數</summary>

```c
int32_t st_off_batch_remaining(const STOFF_Batch* batch);
```

**用途** — 回傳用於進度顯示或完成判定的剩餘工作數。

**呼叫方式** — 隨時可呼叫。已結束（成功、失敗、取消）的工作不計入。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |

**回傳值** — 未結束的工作數。`batch` 為 NULL 時為 `0`。

</details>

<details>
<summary><code>st_off_batch_cancel</code> — 取消剩餘工作，並對執行中的工作發出取消</summary>

```c
void st_off_batch_cancel(STOFF_Batch* batch);
```

**用途** — 中斷整個批次。尚未開始的工作以取消（`status` 2）結束，執行中工作的情境則被發出與 `st_off_ir_request_cancel` 相同的取消。

**呼叫方式** — 可在任何執行緒呼叫，不等待即返回。執行中的工作依中斷時間點以失敗（`status` 1）或取消（`status` 2）結束。之後仍會產生所有工作的完成記錄，因此以 `st_off_batch_poll` 接收後取回情境。中斷前已結束之工作的結果仍可照常 fetch。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼。NULL 則不做任何事 |

**回傳值** — 無。

</details>

<details>
<summary><code>st_off_batch_fetch_pressure</code> — 將已完成工作的壓力 IR 渲染結果複製到呼叫端緩衝區</summary>

```c
int32_t st_off_batch_fetch_pressure(STOFF_Batch* batch, int32_t jobIndex, int32_t renderIndex, float* outValues, int32_t capacityValues, STOfflinePressureIRInfo* outInfo);
```

**用途** — 取出批次保存中的渲染結果（值陣列與中繼資料）。批次與情境分開保存結果，因此變更或銷毀情境後仍可取出。

**呼叫方式** — 在以 `st_off_batch_poll` 收到該工作的完成記錄後呼叫。`outValues` = NULL 時只回傳值數量與 `outInfo`，因此先取得大小、配置緩衝區後再次呼叫。值的佈局（單聲道 / `values[band × bandStride + sample]`）與 info 欄位皆與 `st_off_ir_render_pressure` 相同。已全部取得的工作以 `st_off_batch_release_job` 釋放。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `jobIndex` | 工作索引 |
| `renderIndex` | 該工作的渲染索引（`add_pressure_render*` 的回傳值） |
| `outValues` | 結果緩衝區。NULL 則只取數量與 info |
| `capacityValues` | `outValues` 的 float 數量 |
| `outInfo` | 結果中繼資料（`STOfflinePressureIRInfo`，欄位請參考 `st_off_ir_render_pressure` 條目）。允許 NULL。傳入時由呼叫端填入 `structSize`·`apiVersion` |

**回傳值** — 值數量（已複製或所需的 float 數）。失敗為 `0`：渲染尚未結束、已失敗或已釋放時為 `ST_STATUS_UNAVAILABLE`，緩衝區不足為 `ST_STATUS_BUFFER_TOO_SMALL`，`outInfo` 戳記錯誤為 `ST_STATUS_INVALID_ARGUMENT`（皆記錄於批次狀態）。

</details>

<details>
<summary><code>st_off_batch_release_job</code> — 釋放已完成工作的結果記憶體</summary>

```c
int st_off_batch_release_job(STOFF_Batch* batch, int32_t jobIndex);
```

**用途** — 從批次中刪除已全部取得之工作的渲染結果以收回記憶體。在大型批次中一取得結果就立即釋放，可降低最大記憶體用量。

**呼叫方式** — 以 `st_off_batch_fetch_pressure` 取得該工作所有結果後呼叫。已釋放工作的結果無法再 fetch。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `jobIndex` | 工作索引 |

**回傳值** — `1` = 已釋放 / `0` = 工作尚未結束（批次狀態為 `ST_STATUS_UNAVAILABLE`）或 `batch` 為 NULL。

</details>

<details>
<summary><code>st_off_batch_get_job_error</code> — 複製各工作的失敗訊息</summary>

```c
int st_off_batch_get_job_error(const STOFF_Batch* batch, int32_t jobIndex, char* outMessage, int32_t capacity);
```

**用途** — 回傳完成記錄 `status` 為 1（失敗）或 2（取消）之工作的原因（英文）。例：compute 失敗或取消、因未註冊配對等造成的渲染失敗。

**呼叫方式** — 收到完成記錄後呼叫。批次函式呼叫本身的錯誤以 `st_off_batch_get_last_status` / `st_off_batch_get_last_error` 讀取。執行緒：`[any]`。

| 參數 | 說明 |
|---|---|
| `batch` | 批次控制代碼 |
| `jobIndex` | 工作索引 |
| `outMessage` | 接收訊息的緩衝區。NUL 結尾，依 `capacity` 截斷 |
| `capacity` | `outMessage` 位元組數。1 以上 |

**回傳值** — `1` = 有訊息（已複製） / `0` = 無訊息（成功的工作等）或引數錯誤。

</details>

</details>

## 執行緒模型

![Sound-Tracing SDK (C/C++) 執行緒與資料流](/img/sdk/native-architecture.png)

主機提供兩個執行緒 — **一個控制執行緒**（場景、音源、聆聽者、傳播呼叫）和 **音訊執行緒**
（PCM 輸入、渲染輸出）。其餘執行緒由引擎在情境內部建立。

### 可呼叫執行緒

標頭檔中每個函式上方都有標籤。

| 標籤 | 意義 | 代表函式 |
|---|---|---|
| `[control]` | 控制執行緒。可能持有場景鎖，因此不要在音訊回呼中呼叫 | 建立、場景、音源、聆聽者 setter，`st_rt_propagate`（PIPELINED 喚醒工作執行緒後立即返回） |
| `[control, blocking]` | 較長的獨佔區間 — 不要在遊戲迴圈、音訊執行緒中呼叫 | `st_rt_build`、`st_rt_render_start` / `stop`、HRIR 載入、延遲環重新配置 |
| `[audio]` | 在主機音訊執行緒上安全 — 無鎖、無配置、無系統呼叫 | `st_rt_source_write_stream`、`st_rt_render_process` |
| `[any]` | 任意執行緒（atomic 讀取 / 常數） | `st_rt_get_timing`、`st_rt_get_thread_inventory`、`st_rt_get_lane_update_interval` |

請將 `[control]` 呼叫序列化到 **唯一的專用控制執行緒**。所有官方包裝層都採用這一結構。

### 引擎建立的執行緒

| 類型 (`STThreadType`) | 數量 | 作用 |
|---|---|---|
| `ST_THREAD_COMPUTE_POOL` | PIPELINED: N − 1（Direct 專用 1 + 一般 N − 2），N = max(3, 預算) · SYNCHRONOUS: N（N = 1 時在呼叫端內嵌） | 傳播通道、IR 轉換、IR 準備 task 全部在此集區中執行 |
| `ST_THREAD_AUDIO_RENDER` | 1 (DEVICE · HOST_PULL_BUFFERED) / 0 (HOST_PULL) | 區塊渲染。BUFFERED 下填充環形緩衝區，回呼只做複製 |
| 裝置執行緒 | 1 (僅 DEVICE) | OS 輸出裝置（WASAPI · CoreAudio · AAudio）驅動程式。不計入清單 |
| `ST_THREAD_FILE_DECODER` | ≤ 1 | 僅當有 `st_rt_source_set_audio_file` 輸入時存在。主機串流輸入下沒有 |

- **預算**: `STRT_CreateOptions.maxComputeThreads` — `0` = auto = min(效能核心數, 6)。不受環境變數影響。
- **排程器**: `STRT_CreateOptions.scheduler` — `ST_RT_SCHEDULER_PIPELINED`（預設，各通道在工作執行緒上以獨立週期執行）/
  `ST_RT_SCHEDULER_SYNCHRONOUS`（`st_rt_propagate` 在呼叫執行緒上完成傳播後返回）。
- **合計 (DEVICE 模式)**: PIPELINED = N + 1（+ 檔案解碼器 1）· SYNCHRONOUS = N + 2（+ 1）。HOST_PULL 去掉渲染、裝置執行緒，
  HOST_PULL_BUFFERED 只保留渲染 1。實測用 `st_rt_get_thread_inventory`（`[any]`，依類型的 atomic 計數器）查看。
- 加速結構（TinyBVH）建置在呼叫執行緒上執行，不會建立額外的工作執行緒。

### 傳播通道週期

PIPELINED 的 3 種幾何通道可透過 `st_rt_set_lane_update_interval(ctx, lane, ms)` 在 **執行期間隨時** 更改週期
（`[0, 60000]` ms，超出範圍則拒絕）。

| `STPropagationLane` | 預設 | 意義 |
|---|---|---|
| `DIRECT` (0) | 10 ms | 連續執行開始之間的最小間隔 |
| `REFLECTION_DIFFRACTION` (1) | 0 ms | 連續兩次執行之間的最小間隔。佔傳播成本的大部分 — 要收回 CPU 先調高這裡（代價是早期反射跟隨聆聽者變慢，不會出現靜音或掉音） |
| `REVERB` (2) | 4 ms | 執行完成後到下一次執行的最小間隔 |

### 執行緒屬性

`st_rt_set_thread_attributes(threadType, &attr)` 須在 **建立情境之前** 依類型指定（對已在執行的執行緒不追溯，
處理程序全域，與 FMOD `Thread_SetAttributes` 處於同一位置）。邏輯角色（`LANE_*` · `IR_CONVERTER` ·
`AU_PREPARE` · `SCENE_INPUT`）沒有專用執行緒，因此集區策略設定在 `ST_THREAD_COMPUTE_POOL` 上。

```c
STThreadAttributes attr = { sizeof attr, ST_ABI_VERSION };
attr.priority = ST_THREAD_PRIORITY_ABOVE_NORMAL;            // DEFAULT · LOW · BELOW_NORMAL · NORMAL · ABOVE_NORMAL · HIGH · TIME_CRITICAL
attr.flags    = ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES;    // 或 PREFER_EFFICIENCY_CORES（兩者同時開啟則拒絕）
attr.affinityMask = 0;                                      // 邏輯處理器位元遮罩，僅 Windows 遵守。0 = 不指定
st_rt_set_thread_attributes(ST_THREAD_COMPUTE_POOL, &attr);
st_rt_set_thread_attributes(ST_THREAD_AUDIO_RENDER, &attr);
```

### 輸出模式與延遲

| `renderOutputMode` | 引擎執行緒 | 主機回呼所做的事 | 延遲 |
|---|---|---|---|
| `DEVICE` (0) | 渲染 1 + 裝置 1 | 無 — 引擎直接開啟裝置 | 裝置緩衝區 |
| `HOST_PULL` (1) | 無 | `st_rt_render_process` 在回呼內渲染區塊 | 0 區塊（渲染成本落在回呼上） |
| `HOST_PULL_BUFFERED` (2) | 渲染 1 | 僅從環形緩衝區複製（≈ memcpy） | 環 ≈ 3 區塊（`st_rt_render_get_latency_frames`） |

三種模式都必須呼叫 `st_rt_render_start(useHrtf)`（HOST_PULL 系列不建立執行緒、裝置，只設定渲染允許旗標和
雙耳/喇叭選擇）。`hostSampleRate ≠ 0` 時，取樣率轉換由引擎在渲染執行緒（BUFFERED）或回呼（HOST_PULL）中完成。
UE · Unity · FMOD · Wwise 外掛全部使用 BUFFERED。

## 平台備註

- **Android**: API 28 以上。將各 ABI 的 `.so` 放入應用程式的程式庫資料夾。
- **iOS**: 單一靜態程式庫（`libsoundtracing_static.a`）同時包含即時與離線。依 device / simulator 分別連結。
- **Web**: `SoundTracingRealtime.mjs/.wasm` 是 pthreads 建置，頁面與 Worker 回應需要 `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp`。`[control]` 呼叫只在一個 Worker 中進行（主執行緒上的阻塞呼叫會因
  `Atomics.wait` 限制而失敗），音訊透過共用環形緩衝區與 AudioWorklet 交換。若需要 TypeScript facade，請使用 [Web SDK](./web.md)。
- **主機取樣率**: 引擎內部為 44.1 kHz，指定 `hostSampleRate` 後由引擎轉換輸入與輸出。

## 下一篇

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD 外掛](./fmod.md) · [Wwise 外掛](./wwise.md)
