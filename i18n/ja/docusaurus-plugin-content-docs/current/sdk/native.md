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

## API リファレンス

リアルタイム DLL（`st_rt_*`、`STRealtime.h`）とオフライン DLL（`st_off_*`、`STOffline.h`）のすべての export をカテゴリ別にまとめています。カテゴリと関数を展開すると、シグネチャ・用途・呼び出しタイミングとスレッド・パラメータ・戻り値が表示されます。スレッドタグの意味は [スレッドモデル](#スレッドモデル) を参照してください。失敗した呼び出しの原因は `st_rt_get_last_status` / `st_rt_get_last_error`（オフラインは `st_off_*`）で読み取ります。

:::note
関数ごとの説明文は現在韓国語のみで提供しています。識別子・シグネチャ・値の範囲は言語に依存しません。
:::

<details>
<summary><strong>컨텍스트 · 런타임 — 생성, 버전·capability, 상태, idle/run, 스레드 속성·인벤토리, 메모리 예산, 타이밍</strong> — 24개</summary>

<details>
<summary><code>st_rt_get_api_version</code> — 이 라이브러리의 ABI 버전 번호를 돌려준다</summary>

```c
uint32_t st_rt_get_api_version(void);
```

**용도** — 로드한 `SimpleSTRealtime` 라이브러리가 호스트가 컴파일한 헤더와 같은 ABI인지 판정하는 기준값입니다. 버전 문자열이 아니라 이 값으로 호환성을 판단합니다.

**언제·어떻게** — 라이브러리를 로드한 직후, 컨텍스트를 만들기 전에 부릅니다. 반환값을 헤더의 `ST_ABI_VERSION`과 비교해 다르면 그 라이브러리를 쓰지 않습니다. 모든 버전 스탬프 구조체의 `apiVersion` 필드에도 같은 값(`ST_ABI_VERSION`)을 넣습니다. 스레드: `[any]` — 컴파일 상수라 어느 스레드에서 불러도 되고 블록하지 않습니다.

| 파라미터 | 설명 |
|---|---|
| (없음) | |

**반환** — 라이브러리의 ABI 버전(`ST_ABI_VERSION`, 현재 `6`). 실패하지 않습니다.

</details>

<details>
<summary><code>st_rt_get_version_string</code> — 제품 릴리스 버전 문자열을 돌려준다</summary>

```c
const char* st_rt_get_version_string(void);
```

**용도** — 로그·진단 화면에 표시할 사람이 읽는 릴리스 버전입니다. 오프라인 라이브러리의 `st_off_get_version_string`과 같은 형태입니다.

**언제·어떻게** — 언제든 부를 수 있습니다. ABI 호환성 판정에는 쓰지 말고 `st_rt_get_api_version`을 씁니다. 스레드: `[any]` — 어느 스레드에서나 블록 없이 호출할 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| (없음) | |

**반환** — 라이브러리 안의 정적 NUL 종료 문자열. 호출자가 해제하지 않습니다.

</details>

<details>
<summary><code>st_rt_get_capabilities</code> — 능력 워드 0(<code>ST_CAP_*</code>)을 돌려준다</summary>

```c
uint64_t st_rt_get_capabilities(void);
```

**용도** — 이 라이브러리가 어떤 기능 표면을 지원하는지 비트로 알려 줍니다. 호스트는 선택 기능(호스트 pull 렌더, 스레드 속성, IR 통계 등)을 쓰기 전에 해당 `ST_CAP_*` 비트를 확인해 기능 유무에 따라 분기합니다.

**언제·어떻게** — 컨텍스트 없이 언제든 부를 수 있습니다. `st_rt_get_capability_word(0)`과 같은 값입니다. 워드 0의 비트는 `ST_CAP_*` 이름만 해당하며, `ST_CAP1_*` 비트는 반드시 `st_rt_get_capability_word(1)`로 확인합니다(같은 자리 번호라도 워드마다 뜻이 다릅니다). 다음 자리는 옛 능력의 결번이라 절대 세워지지 않습니다: `ST_CAP_RETIRED_MASK`(8·9·10·13·18·20·21·25). 스레드: `[any]` — 컴파일 상수입니다.

| 파라미터 | 설명 |
|---|---|
| (없음) | |

**반환** — 능력 워드 0의 64비트 마스크. 비트 63 `ST_CAP_CAPABILITY_WORDS`가 서 있으면 `st_rt_get_capability_word`로 워드 1 이상을 읽을 수 있습니다.

</details>

<details>
<summary><code>st_rt_get_capability_word</code> — 지정한 번호의 능력 워드를 돌려준다</summary>

```c
uint64_t st_rt_get_capability_word(uint32_t word);
```

**용도** — 워드 0의 64자리가 모두 찼기 때문에 새 능력은 워드 1부터 `ST_CAP<n>_*` 이름으로 추가됩니다. 이 함수로 워드 번호를 지정해 읽습니다.

**언제·어떻게** — 컨텍스트 없이 언제든 부를 수 있습니다. 먼저 `st_rt_get_capabilities()`에 `ST_CAP_CAPABILITY_WORDS`(비트 63)가 있는지 확인합니다. 예를 들어 엔진 쉼(`st_rt_idle`/`st_rt_run`)은 `st_rt_get_capability_word(1) & ST_CAP1_ENGINE_IDLE`, 음원 메모리 예산은 `ST_CAP1_MEMORY_BUDGET`(워드 1의 비트 63)로 확인합니다. 서로 다른 워드의 비트를 섞어 AND 하지 않습니다. 스레드: `[any]` — 컴파일 상수입니다.

| 파라미터 | 설명 |
|---|---|
| `word` | 워드 번호. `0` = `st_rt_get_capabilities()`와 같은 값(`ST_CAP_*`), `1` = `ST_CAP1_*`. 헤더가 아는 워드 수는 `ST_CAPABILITY_WORD_COUNT`(현재 `2`) |

**반환** — 해당 워드의 64비트 마스크. 모르는 워드(`word ≥ ST_CAPABILITY_WORD_COUNT`)는 `0`(= 그 능력 없음)입니다.

</details>

<details>
<summary><code>st_rt_get_sample_rate</code> — 엔진 내부 샘플레이트를 돌려준다</summary>

```c
int st_rt_get_sample_rate(void);
```

**용도** — 엔진이 내부적으로 쓰는 고정 샘플레이트를 알려 줍니다. 호스트 오디오가 다른 레이트로 돈다면 `STRT_CreateOptions.hostSampleRate`로 엔진이 경계에서 변환하게 합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[any]` — 컴파일 상수입니다.

| 파라미터 | 설명 |
|---|---|
| (없음) | |

**반환** — `44100`(Hz, 고정).

</details>

<details>
<summary><code>st_rt_set_thread_attributes</code> — 엔진 스레드 종류별 우선순위·코어 선호·affinity를 지정한다</summary>

```c
int st_rt_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**용도** — 게임·미들웨어 호스트가 자기 스레드 배치 정책에 맞춰 엔진이 만드는 스레드의 우선순위·코어 선호·affinity를 종류별로 지정합니다(FMOD `Thread_SetAttributes`와 같은 역할). 컨텍스트와 무관한 **프로세스 전역** 표이며, Realtime 라이브러리와 Offline 라이브러리는 각자 자기 표를 가집니다 — 두 라이브러리를 함께 쓰면 `st_rt_`와 `st_off_` 양쪽에 같은 값을 지정해야 합니다.

**언제·어떻게** — **`st_rt_create` 전에** 부르는 것이 계약입니다. 이미 시작된 스레드에는 소급되지 않고, 이후 생기는 스레드(다음 `st_rt_create`, 다음 `st_rt_render_start`, 다음 파일 입력 부착)부터 적용됩니다. 실제 OS 스레드가 있는 종류는 `ST_THREAD_COMPUTE_POOL`(계산 풀) · `ST_THREAD_AUDIO_RENDER`(렌더 스레드) · `ST_THREAD_FILE_DECODER`(파일 디코더) 셋뿐이고, 나머지 값은 공유 계산 풀 위에서 도는 논리 역할이라 저장만 되고 물리 스레드에는 적용되지 않습니다 — 계산 작업의 정책은 `ST_THREAD_COMPUTE_POOL`로 지정합니다. `ST_THREAD_PRIORITY_DEFAULT`는 플랫폼 기본표를 그대로 쓰므로, affinity나 코어 선호만 지정해도 오디오 렌더 스레드의 기본 우선순위 승격은 유지됩니다. 명시 우선순위를 주면 그 값이 대신 적용됩니다. 스레드: `[any]` — 프로세스 전역 표를 짧은 뮤텍스 하나로 갱신합니다.

| 파라미터 | 설명 |
|---|---|
| `threadType` | `STThreadType` 값 `0`~`10`(아래 표). 범위 밖이면 `0` |
| `attributes` | 요청값. 호출자가 `structSize = sizeof(STThreadAttributes)`, `apiVersion = ST_ABI_VERSION`을 채운다. `NULL`이면 그 종류를 기본값으로 되돌린다(리셋) |

**구조체** `STThreadAttributes`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `priority` | `STThreadPriority`(아래 표). 기본 `ST_THREAD_PRIORITY_DEFAULT`(0) |
| `flags` | `ST_THREAD_FLAG_*` 조합. 기본 `0` |
| `affinityMask` | 논리 프로세서 비트마스크, `0` = 지정 없음. **Windows만 존중**합니다. 프로세스 마스크의 부분집합이 아니면 커널이 거절합니다. 64 논리 프로세서를 넘는 머신에서는 현재 프로세서 그룹 안에서만 해석됩니다 |
| `reserved[4]` | 모두 `0`이어야 합니다 |

모든 필드가 `0`(DEFAULT · flags 0 · affinity 0)이면 "지정 없음"과 같습니다.

**열거형** `STThreadType`

| 값 | 이름 | 의미 |
|---|---|---|
| `0` | `ST_THREAD_LANE_DIRECT` | 논리 역할: direct 전파 작업(전용 스레드 없음) |
| `1` | `ST_THREAD_LANE_GUIDE` | 논리 역할: guide 작업 |
| `2` | `ST_THREAD_LANE_REFLECTION_DIFFRACTION` | 논리 역할: 반사/회절 작업 |
| `3` | `ST_THREAD_LANE_REVERB` | 논리 역할: 잔향 작업 |
| `4` | `ST_THREAD_COMPUTE_POOL` | 실제 스레드: 계산 풀 워커. PIPELINED는 `max(3,N)−1`개(Direct 전용 1개 포함), SYNCHRONOUS는 `N>1`일 때 `N`개 |
| `5` | `ST_THREAD_AUDIO_RENDER` | 실제 스레드: `st_rt_render_start`가 여는 렌더 스레드(`HOST_PULL` 모드에는 없음) |
| `6` | `ST_THREAD_FILE_DECODER` | 실제 스레드: 파일 디코더, 엔진당 최대 1개 |
| `7` | `ST_THREAD_ACCEL_BUILD` | 예약값. 가속구조 빌드는 호출 스레드에서 실행되어 별도 워커가 없음 |
| `8` | `ST_THREAD_IR_CONVERTER` | 논리 역할: IR 변환 작업 |
| `9` | `ST_THREAD_AU_PREPARE` | 논리 역할: IR 준비 작업 |
| `10` | `ST_THREAD_SCENE_INPUT` | 논리 역할: 씬 입력 작업 |
| `11` | `ST_THREAD_TYPE_COUNT` | 종류 수(인자로 쓰지 않음) |

**열거형** `STThreadPriority`

| 값 | 이름 | Windows | macOS QoS |
|---|---|---|---|
| `0` | `ST_THREAD_PRIORITY_DEFAULT` | 플랫폼 기본표 그대로 | 플랫폼 기본표 그대로 |
| `1` | `ST_THREAD_PRIORITY_LOW` | LOWEST | BACKGROUND |
| `2` | `ST_THREAD_PRIORITY_BELOW_NORMAL` | BELOW_NORMAL | UTILITY |
| `3` | `ST_THREAD_PRIORITY_NORMAL` | NORMAL | USER_INITIATED |
| `4` | `ST_THREAD_PRIORITY_ABOVE_NORMAL` | ABOVE_NORMAL | USER_INTERACTIVE |
| `5` | `ST_THREAD_PRIORITY_HIGH` | HIGHEST | USER_INTERACTIVE |
| `6` | `ST_THREAD_PRIORITY_TIME_CRITICAL` | TIME_CRITICAL | USER_INTERACTIVE |

**플래그** `ST_THREAD_FLAG_*`

| 플래그 | 의미 |
|---|---|
| `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` (`1u << 0`) | 성능 코어 선호 |
| `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES` (`1u << 1`) | 효율 코어 선호 |

코어 선호는 Windows 11 EcoQoS로 적용되며 macOS에서는 무시됩니다(QoS 클래스가 클러스터 배치를 정합니다). 두 플래그를 동시에 켜면 거절됩니다.

**반환** — `1` = 성공 / `0` = 실패(`threadType` 범위 밖, `structSize`/`apiVersion` 불일치, `priority` 범위 밖, 코어 선호 플래그 상충, `reserved[]`가 0이 아님). 실패 시 표는 바뀌지 않습니다. 컨텍스트를 받지 않으므로 `st_rt_get_last_status`에는 아무것도 남지 않습니다.

</details>

<details>
<summary><code>st_rt_get_thread_attributes</code> — 스레드 종류별로 저장된 속성 요청값을 읽는다</summary>

```c
int st_rt_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**용도** — `st_rt_set_thread_attributes`로 저장한 값을 확인합니다. 실제로 OS에 적용된 값이 아니라 **요청값 그대로**를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 한 번도 지정하지 않은 종류는 기본값(priority `DEFAULT` · flags `0` · affinityMask `0`)을 돌려줍니다. 스레드: `[any]` — 프로세스 전역 표를 짧은 뮤텍스 하나로 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `threadType` | `STThreadType` 값 `0`~`10`. 범위 밖이면 `0` |
| `outAttributes` | 출력. 호출자가 `structSize = sizeof(STThreadAttributes)`, `apiVersion = ST_ABI_VERSION`을 채운다. 성공 시 `priority`·`flags`·`affinityMask`가 채워지고 `reserved[]`는 0이 된다 |

`STThreadAttributes` 필드는 `st_rt_set_thread_attributes` 항목 참고.

**반환** — `1` = 성공 / `0` = 거절(`outAttributes`가 `NULL`, 스탬프 불일치, `threadType` 범위 밖).

</details>

<details>
<summary><code>st_rt_init_create_options</code> — 생성 옵션 구조체를 기본값으로 채운다</summary>

```c
void st_rt_init_create_options(STRT_CreateOptions* outOptions);
```

**용도** — `STRT_CreateOptions`를 올바른 버전 스탬프와 기본값으로 초기화합니다. 호스트는 이 함수로 채운 뒤 필요한 필드만 바꿔 `st_rt_create`에 넘깁니다. 이렇게 하면 이후 추가되는 필드도 안전한 기본값(0)으로 채워집니다.

**언제·어떻게** — `st_rt_create` 직전에 부릅니다. `structSize`와 `apiVersion`이 자동으로 채워지고, `scheduler`는 `ST_RT_SCHEDULER_PIPELINED`, 나머지 필드는 모두 `0`(각 필드의 "기본" 의미)입니다. 스레드: `[any]` — 호출자 소유 구조체만 채웁니다.

| 파라미터 | 설명 |
|---|---|
| `outOptions` | 채울 구조체. `NULL`이면 아무 일도 하지 않는다 |

**구조체** `STRT_CreateOptions`

| 필드 | 형 | 기본 | 설명 |
|---|---|---|---|
| `structSize` | `uint32_t` | `sizeof(STRT_CreateOptions)` | 버전 스탬프. 다르면 생성 거절 |
| `apiVersion` | `uint32_t` | `ST_ABI_VERSION` | 버전 스탬프. 다르면 생성 거절 |
| `scheduler` | `int32_t` | `ST_RT_SCHEDULER_PIPELINED`(1) | `STRT_Scheduler`. `PIPELINED`(1) = 엔진 워커가 전파·IR을 백그라운드에서 최신 프레임 우선으로 계산하는 실시간 기본 모드. `SYNCHRONOUS`(0) = 호스트가 `st_rt_propagate`를 부르는 스레드에서 파이프라인이 도는 동기 모드(진단·호환용). 생성 후 바꿀 수 없음(`st_rt_get_scheduler`) |
| `seedValue` | `uint32_t` | `0` | 호환용 필드. 기본 백엔드의 출력에는 영향이 없습니다 |
| `maxDelaySeconds` | `float` | `0` | 렌더 지연 링 길이(초). `0` = 플랫폼 기본(데스크톱 2.0 s, Android·iOS 1.0 s, Emscripten 0.5 s). 그 외 값은 약 0.0118 s(한 처리 블록 + 8샘플)~60 s, 유한값이어야 함. 생성 후에는 `st_rt_render_set_max_delay_seconds`로 바꿉니다 |
| `maxComputeThreads` | `uint32_t` | `0` | 전파·IR 계산에 쓸 스레드 수 상한 = 엔진 소유 공유 계산 풀의 폭. `0` = 자동 = `min(퍼포먼스 코어 수, 6)`, 최소 1. 환경변수의 영향을 받지 않습니다. PIPELINED에서는 예산 `N`이 최소 3으로 올려지고 오디오 슬롯 1 + Direct 전용 워커 1 + 일반 워커 `N−2`로 나뉩니다(아래 `st_rt_create`의 스레드 수 표). 지원 여부는 `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | `float` | `0` | 씬 단위 → 미터 변환 인자. `0` = 기본 1.0(씬 단위 = 미터). 센티미터 호스트는 `0.01f`, 피트 호스트는 `0.3048f`. **생성 전용**이라 런타임 setter가 없습니다. 비유한값·0 이하 값은 거절. 지원 여부는 `ST_CAP_SCENE_RATIO` |
| `renderOutputMode` | `int32_t` | `ST_RT_RENDER_OUTPUT_DEVICE`(0) | `STRT_RenderOutputMode`(아래 표). 범위 밖은 거절. 지원 여부는 `ST_CAP_HOST_PULL_RENDER` / `ST_CAP_HOST_PULL_BUFFERED` |
| `hostSampleRate` | `int32_t` | `0` | 호스트 샘플레이트. `0` = 엔진 레이트(44100) — 리샘플러를 만들지 않습니다. 그 외 값이면 엔진이 내장 윈도 sinc 변환기로 스트림 입력(`st_rt_source_write_stream`)과 pull 출력(`st_rt_render_process`)을 변환하며, 공개 API에서 "프레임" 단위로 나오는 값(`write_stream`·`render_process`·`render_get_latency_frames`·`STStreamDesc.capacityFrames`·`STStreamStatus`)이 **전부 이 레이트**가 됩니다. 허용 범위 `[8000, 384000]`. `DEVICE` 모드에서 0이 아닌 값은 거절(장치 경로는 엔진 레이트 고정). 지원 여부는 `ST_CAP_HOST_SAMPLE_RATE` |
| `backend` | `int32_t` | `ST_BACKEND_ST`(0) | `STBackend` 파이프라인 선택. `ST_BACKEND_ST`(0)이 기본 엔진입니다. `ST_BACKEND_EXA`(1)는 라이브러리가 `ST_CAP_BACKEND_EXA`를 광고할 때만 쓸 수 있고 `SYNCHRONOUS` 스케줄러와 `maxDelaySeconds = 0`이 필요합니다. 그 밖·사용 불가 값은 거절 |
| `startIdle` | `uint32_t` | `0` | `0` = 생성 직후 `RUNNING`, `1` = 생성 직후 `IDLE` — 호스트가 `st_rt_run`을 불러야 전파·IR·렌더가 돕니다(들려줄 것이 없을 때 계산이 공회전하지 않게). 그 밖 값은 거절. 지원 여부는 `ST_CAP1_ENGINE_IDLE` |
| `maxSources` | `uint32_t` | `0` | 최대 음원 수. `0` = 플랫폼 기본(데스크톱 128, Android·iOS 48, Emscripten 32). 생성 후에는 `st_rt_set_memory_budget`으로 바꿉니다. 지원 여부는 `ST_CAP1_MEMORY_BUDGET` |

**열거형** `STRT_RenderOutputMode`

| 값 | 이름 | 의미 |
|---|---|---|
| `0` | `ST_RT_RENDER_OUTPUT_DEVICE` | 기본. `st_rt_render_start`가 출력 장치와 엔진 렌더 스레드를 열고 엔진이 장치까지 직접 출력합니다 |
| `1` | `ST_RT_RENDER_OUTPUT_HOST_PULL` | 호스트 pull. 엔진은 장치도 렌더 스레드도 만들지 않고, 호스트가 자기 오디오 스레드에서 `st_rt_render_process`를 불러 블록을 가져갑니다. 이 모드에서도 `st_rt_render_start(useHrtf)`는 반드시 불러야 합니다(바이노럴/스피커 선택과 "렌더 허용" 플래그를 겸함) |
| `2` | `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED` | 엔진 렌더 스레드가 링(8블록 용량·3블록 목표)을 채우고 `st_rt_render_process`는 링에서 복사만 합니다. 호스트 콜백 비용이 memcpy 수준으로 내려가고 지터는 링이 흡수합니다. 블록 처리 자체가 계속 블록 시간을 넘으면 링도 막지 못하며 무음으로 채워집니다. 지연 상한 ≈ 엔진 3블록. `hostSampleRate ≠ 0`이면 변환은 렌더 스레드에서 합니다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_create</code> — 실시간 컨텍스트(엔진·워커·계산 풀)를 만든다</summary>

```c
STStatus st_rt_create(const STRT_CreateOptions* options, STRT_Context** outContext);
```

**용도** — 실시간 엔진 인스턴스 하나를 만듭니다. 씬·소스·리스너·렌더 등 다른 모든 `st_rt_*` 호출은 이 컨텍스트를 받습니다. 스케줄러·계산 스레드 폭·단위 배율·출력 모드·호스트 샘플레이트처럼 실행 중에 바꿀 수 없는 설정은 여기서 확정됩니다.

**언제·어떻게** — 스레드 속성(`st_rt_set_thread_attributes`)을 쓰려면 그보다 먼저 지정한 뒤 부릅니다. `st_rt_init_create_options`로 옵션을 채우고 필요한 필드만 바꿔 넘깁니다. 성공하면 씬 구성(메시·오브젝트·소스·리스너) → `st_rt_build` → `st_rt_render_start` 순으로 진행하고, 끝나면 `st_rt_destroy`로 해제합니다. 생성 직후 상태는 PIPELINED 스케줄러, 샘플레이트 44100 Hz, 레인 갱신 주기 direct 10 ms / 반사·회절 0 ms / 잔향 4 ms, 엔진 쉼 `RUNNING`(`startIdle = 1`이면 `IDLE`)이며, 기본 백엔드 컨텍스트는 출력단 등라우드니스 보정이 켜진 상태로 시작합니다(`st_rt_render_set_loudness_compensation`으로 끌 수 있습니다). 스레드: `[control, blocking]` — 엔진·워커·계산 풀을 만드는 긴 구간이라 게임 루프나 오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `options` | 생성 옵션. `NULL`이면 `st_rt_init_create_options`의 기본값으로 만든다. 직접 채울 때는 `structSize`/`apiVersion` 스탬프가 맞아야 한다 |
| `outContext` | 출력 핸들. 성공하면 새 컨텍스트, 실패하면 `NULL`이 들어간다. `NULL`을 넘기면 `ST_STATUS_INVALID_ARGUMENT` |

`STRT_CreateOptions` 필드는 `st_rt_init_create_options` 항목 참고.

**엔진이 띄우는 스레드 수** — `N`은 SYNCHRONOUS에서는 해석된 `maxComputeThreads` 예산, PIPELINED에서는 `max(3, 해석된 예산)`입니다. 파일 입력(`st_rt_source_set_audio_file`)이 하나라도 있으면 파일 디코더 스레드 1개가 더해지고, 호스트 스트림 입력에는 디코더가 없습니다. 가속구조 빌드는 호출 스레드에서 실행되어 추가 스레드가 없습니다.

| 출력 모드 | SYNCHRONOUS | PIPELINED |
|---|---|---|
| `DEVICE` | 풀 워커 `N`(N=1이면 0, 호출 스레드에서 인라인) + 렌더 1 + 장치 1 | 풀 워커 `N−1`(Direct 전용 1 + 일반 `N−2`) + 렌더 1 + 장치 1 |
| `HOST_PULL` | 위에서 렌더·장치 스레드가 빠짐 | 위에서 렌더·장치 스레드가 빠짐 |
| `HOST_PULL_BUFFERED` | 렌더 스레드만 있고 장치 스레드 없음 | 렌더 스레드만 있고 장치 스레드 없음 |

PIPELINED의 렌더 스레드는 예산 `N` 안의 오디오 슬롯이며 우선순위만 승격됩니다. 실제 수는 `st_rt_get_thread_inventory`로 확인합니다.

**반환** — `STStatus`.
- `ST_STATUS_OK` — 성공.
- `ST_STATUS_INVALID_ARGUMENT` — `outContext`가 `NULL`, 또는 옵션 값이 범위 밖(`scheduler`, `maxDelaySeconds`, `sceneRatio`, `renderOutputMode`, `hostSampleRate`, `backend`, `startIdle`).
- `ST_STATUS_VERSION_MISMATCH` — `structSize`/`apiVersion` 불일치.
- `ST_STATUS_INITIALIZATION_FAILED` / `ST_STATUS_ALLOCATION_FAILED` — 엔진 초기화·할당 실패.

실패 사유 문자열은 `st_rt_get_last_error(NULL, ...)`로 읽습니다(같은 호출 스레드의 마지막 실패한 생성).

</details>

<details>
<summary><code>st_rt_get_backend</code> — 컨텍스트가 쓰는 파이프라인 백엔드를 돌려준다</summary>

```c
int st_rt_get_backend(const STRT_Context* context);
```

**용도** — 생성 시 `STRT_CreateOptions.backend`로 선택된 파이프라인을 확인합니다. 실행 중 전환은 지원하지 않습니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있습니다. 스레드: `[control]` — 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STBackend` 값(`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1). `context`가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_destroy</code> — 컨텍스트를 해제한다(워커 정지·join)</summary>

```c
void st_rt_destroy(STRT_Context* context);
```

**용도** — 컨텍스트와 엔진이 소유한 모든 자원(씬, 소스, 워커·계산 풀 스레드, 렌더 출력)을 해제합니다.

**언제·어떻게** — 컨텍스트 사용이 끝났을 때 한 번 부릅니다. 호출 뒤 핸들은 무효이므로 다른 스레드가 같은 컨텍스트를 쓰고 있지 않아야 합니다. 스레드: `[control, blocking]` — 워커를 멈추고 join하므로 오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 해제할 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_get_last_status</code> — 컨텍스트에 남은 마지막 상태 코드를 읽는다</summary>

```c
STStatus st_rt_get_last_status(const STRT_Context* context);
```

**용도** — `int`/`void`를 돌려주는 함수가 실패했을 때 그 사유를 `STStatus`로 확인합니다. 많은 함수가 실패 시 이 진단 필드에 상태를 남깁니다.

**언제·어떻게** — 실패를 돌려받은 직후 같은 제어 스레드에서 부릅니다. 사람이 읽는 메시지는 `st_rt_get_last_error`로 얻습니다. 오디오 경로(`st_rt_render_process`)가 남긴 상태가 있으면 그것을 먼저 돌려주고 비웁니다. 같은 컨텍스트를 여러 스레드에서 동시에 쓰면 오류 경로의 진단 기록은 직렬화되지 않습니다. 스레드: `[control]` — 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 마지막 `STStatus`. `context`가 `NULL`이면 `ST_STATUS_INVALID_CONTEXT`.

| 값 | 이름 |
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
| `11` | `ST_STATUS_BUDGET_EXCEEDED` — 음원 메모리 예산 초과(`st_rt_source_create`, 거절 정책 `ST_MEMORY_REJECT_NEW`일 때) |

</details>

<details>
<summary><code>st_rt_get_last_error</code> — 마지막 오류 메시지 문자열을 복사한다</summary>

```c
int st_rt_get_last_error(const STRT_Context* context, char* outMessage, int capacity);
```

**용도** — 마지막 실패의 사람이 읽는 설명을 얻어 로그에 남깁니다. `context`에 `NULL`을 넘기면 컨텍스트가 없는 `st_rt_create` 실패의 사유를 읽을 수 있습니다.

**언제·어떻게** — 실패 직후 부릅니다. 필요한 크기를 먼저 알고 싶으면 `outMessage = NULL`로 불러 반환값만 받습니다. `context = NULL`일 때는 **이 호출 스레드**에서 마지막으로 실패한 `st_rt_create`의 메시지이며, 다음 `st_rt_create` 호출이 이를 지웁니다. 스레드: `[control]` — 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들. `NULL`이면 이 스레드의 마지막 생성 실패 메시지 |
| `outMessage` | 출력 버퍼. `NULL`이면 복사하지 않고 크기만 돌려준다 |
| `capacity` | `outMessage` 바이트 수. 모자라면 `capacity − 1`바이트로 잘라 NUL로 끝낸다 |

**반환** — 메시지 전체를 담는 데 필요한 바이트 수(NUL 포함). 반환값이 `capacity`보다 크면 잘린 것입니다.

</details>

<details>
<summary><code>st_rt_is_acoustic_feature_enabled</code> — 개별 음향 기능(공기흡수·전파지연·직접음 차폐)이 켜져 있는지 읽는다</summary>

```c
int st_rt_is_acoustic_feature_enabled(const STRT_Context* context, int feature);
```

**용도** — `st_rt_set_acoustic_feature_enabled`로 켜고 끈 음향 기능의 현재 상태를 확인합니다. 경로 종류 게이트와 함께 청취 A/B 비교(무엇이 소리에 기여하는지 하나씩 분리)에 씁니다.

**언제·어떻게** — 생성 후 언제든 부릅니다. 기본은 세 기능 모두 켜짐입니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽지만 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`(0, 대기 감쇠·고역 손실) / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`(1, 경로 길이 기반 전파 지연) / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`(2, 직접음 차폐) |

**반환** — `1` = 켜짐 / `0` = 꺼짐 / `-1` = `context`가 `NULL`.

</details>

<details>
<summary><code>st_rt_idle</code> — 엔진 전체를 쉬게 한다(계산 정지 후 렌더가 꼬리를 낸 뒤 무음)</summary>

```c
int st_rt_idle(STRT_Context* context);
```

**용도** — 들려줄 것이 없을 때(재생 정지·일시정지·방 없음) 전파·IR 계산과 렌더 처리를 멈춰 CPU를 돌려받습니다. 캐시와 평활 이력은 보존되므로 `st_rt_run`으로 깨우면 이어서 계산합니다.

**언제·어떻게** — 렌더 중 언제든 부를 수 있고 완료를 기다리지 않습니다. 호출하면 전파 레인·IR 조립·IR 준비 작업의 새 실행이 멈춥니다(이미 돌던 1회는 끝까지 갑니다). 렌더는 채택된 IR로 입력과 꼬리를 계속 내다가 다음 조건이 모두 맞으면 처리를 멈추고 0만 냅니다(`DRAINING` → `IDLE`): 재생 중인 입력에 아직 꺼내지 않은 소리가 없음, 모든 소스 입력이 지연선 길이 + 1 s 동안 무음, 출력이 −80 dBFS 아래로 0.5 s 지속. 입력이 계속 소리를 내면 상한(5 s와 "입력 무음 길이 + 2 s" 중 큰 값)에서 한 블록 페이드 뒤 강제로 `IDLE`이 됩니다. 렌더가 돌지 않을 때(`st_rt_render_start` 전, `st_rt_render_stop` 뒤)는 바로 `IDLE`입니다. 쉬는 동안에도 setter는 받고, 재생 요청은 깨운 뒤 반영됩니다. 호스트 스트림·스피커 세트 링은 소비되지 않습니다(쓰기는 링이 찰 때까지 받음). 출력 장치는 그대로 열려 있으므로 오래 쉴 때는 `IDLE`을 확인한 뒤 `st_rt_render_stop`을 부릅니다. SYNCHRONOUS 스케줄러는 계산이 `st_rt_propagate`에서만 돌므로 렌더 쪽만 쉽니다. 지원 여부는 `ST_CAP1_ENGINE_IDLE`. 스레드: `[control]` — 짧은 잠금만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `1` = 성공(이미 쉬는 중이면 아무 일도 하지 않음) / `0` = `context`가 `NULL`.

</details>

<details>
<summary><code>st_rt_run</code> — 쉬는 엔진을 깨운다</summary>

```c
int st_rt_run(STRT_Context* context);
```

**용도** — `st_rt_idle`로 쉬게 했거나 `startIdle = 1`로 만든 컨텍스트에서 전파·IR·렌더를 다시 돌립니다.

**언제·어떻게** — 재생을 다시 시작할 때 부릅니다. 바로 `RUNNING`이 되고 계산 작업을 깨우며, 쉬는 동안 받아 둔 장면·모션·정책 변경이 그때 반영됩니다. IR 조립의 시간축(평활·히스테리시스)은 쉰 시간을 건너뜁니다. 강제 `IDLE`로 멈췄던 지연선·잔향 상태는 이어서 나오며 첫 블록은 페이드인됩니다. 완료를 기다리지 않습니다. 스레드: `[control]` — 짧은 잠금과 계산 작업 깨우기만 합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `1` = 성공 / `0` = `context`가 `NULL`.

</details>

<details>
<summary><code>st_rt_get_idle_state</code> — 엔진 쉼 상태(RUNNING / DRAINING / IDLE)를 읽는다</summary>

```c
int st_rt_get_idle_state(const STRT_Context* context);
```

**용도** — `st_rt_idle` 뒤 렌더가 꼬리를 다 냈는지 확인합니다. 예를 들어 `IDLE`이 된 뒤에 `st_rt_render_stop`으로 장치를 닫습니다.

**언제·어떻게** — 언제든 부를 수 있습니다. `IDLE`은 "새 계산 없음 + 렌더 0 출력"이라는 뜻이며, 진행 중이던 계산 1회까지 끝났다는 뜻은 아닙니다. 스레드: `[any]` — atomic 하나를 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STRT_IdleState`: `ST_RT_IDLE_RUNNING`(0, 도는 중) / `ST_RT_IDLE_DRAINING`(1, 쉼을 요청받았고 렌더가 남은 소리를 내는 중) / `ST_RT_IDLE_IDLE`(2, 계산 쉼 + 렌더는 0만 냄 — `startIdle = 1`이면 생성 직후 이 상태). `context`가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_get_scheduler</code> — 컨텍스트의 스케줄러를 돌려준다</summary>

```c
int st_rt_get_scheduler(const STRT_Context* context);
```

**용도** — 생성 시 확정된 스케줄러를 확인합니다. 레인 갱신 주기(`st_rt_set_lane_update_interval`)처럼 PIPELINED에서만 의미가 있는 API를 쓸지, `st_rt_propagate`를 직접 돌려야 하는지 판단할 때 씁니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있습니다. 값은 불변입니다. 스레드: `[any]` — 생성 시 확정된 불변값을 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STRT_Scheduler`: `ST_RT_SCHEDULER_SYNCHRONOUS`(0) / `ST_RT_SCHEDULER_PIPELINED`(1).

</details>

<details>
<summary><code>st_rt_get_timing</code> — 파이프라인 단계별 최근 소요 시간을 한 번에 읽는다</summary>

```c
int st_rt_get_timing(const STRT_Context* context, STTiming* outTiming);
```

**용도** — 전파(레인 3분할)·IR 변환·IR 발행·블록 렌더의 최근 1회 소요 시간을 하나의 구조체로 얻어, 호스트 프로파일러나 HUD에 엔진 부하를 표시합니다. 타이밍을 얻는 유일한 표면입니다.

**언제·어떻게** — 언제든 폴링할 수 있습니다(예: 프레임마다). `irPublishSequence`를 두 번 읽은 값과 비교하면 그 사이에 IR이 새로 발행됐는지 알 수 있습니다. 지원 여부는 `ST_CAP_ENGINE_TIMING`(`irPublishSequence`는 `ST_CAP_IR_STATS`). 스레드: `[any]` — atomic만 읽습니다. 단, 스탬프가 틀린 오류 경로는 컨텍스트 진단 버퍼에 기록합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outTiming` | 출력. 호출자가 `structSize = sizeof(STTiming)`, `apiVersion = ST_ABI_VERSION`을 채운다 |

**구조체** `STTiming`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채우는 스탬프 |
| `propagateTotalMs` | 전파 전체(ms). PIPELINED에서는 레인이 서로 다른 워커·주기로 돌므로 세 레인의 합이 아니라 가장 무거운 반사·회절 레인 값과 같습니다(`== propagateReflDiffMs`). SYNCHRONOUS에서는 ≈ direct + reflDiff + reverb |
| `propagateDirectMs` | Direct 레인(직접음 + 투과) |
| `propagateReflDiffMs` | 반사·회절 레인(guide 포함) |
| `propagateReverbMs` | 잔향 레인(확산·소스 수송) |
| `irBuildMs` | 기하 → IR 변환 |
| `auralUpdateIrMs` | IR 발행(렌더 측 반영) |
| `auralProcessMs` | 블록당 렌더 처리 시간(렌더 스레드 또는 호스트 pull 콜백) |
| `irPublishSequence` | IR 발행 시퀀스의 하위 32비트. `st_rt_ir_get_stats`의 `publishSequence`와 같은 값, `0` = 아직 발행 없음 |
| `reserved[7]` | 예약 |

아직 한 번도 돌지 않은 단계는 `0`입니다.

**반환** — `1` = 성공 / `0` = `context`·`outTiming`이 `NULL`이거나 스탬프 불일치(불일치는 `st_rt_get_last_status`에 `ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_set_memory_budget</code> — 음원 메모리 예산(최대 음원 수·바이트 상한·거절 정책)을 지정한다</summary>

```c
int st_rt_set_memory_budget(STRT_Context* context, const STMemoryBudget* budget);
```

**용도** — 모바일·웹처럼 메모리가 빠듯한 플랫폼에서 음원 수와 음원별 메모리 합을 상한으로 묶습니다. 음원 하나는 고정 비용(전파·IR 사본·수송·스트림 링)과 지연 링(장면 최장 경로에 비례, 바닥 `ringFloorSeconds` ~ 천장 `st_rt_render_get_max_delay_seconds`), 경로 레인으로 메모리를 씁니다. 예산을 넘는 `st_rt_source_create`는 정책에 따라 거절되거나 가장 먼 음원을 내보내고 받아들여지므로, 생성 뒤에는 새 음원 때문에 메모리가 늘지 않습니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있습니다. 최대 음원 수만 정하려면 생성 시 `STRT_CreateOptions.maxSources`로도 됩니다. 기존 값을 바탕으로 바꾸려면 `st_rt_get_memory_budget`으로 읽어 필요한 필드만 고친 뒤 set 합니다. 상한을 줄여도 이미 있는 음원은 유지되고 새 생성부터 적용됩니다. 사용량은 `st_rt_get_memory_stats`로 봅니다. 지원 여부는 `ST_CAP1_MEMORY_BUDGET`(능력 워드 1). 스레드: `[control]` — 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `budget` | 새 정책. 호출자가 `structSize = sizeof(STMemoryBudget)`, `apiVersion = ST_ABI_VERSION`을 채운다. `0`인 필드는 기본값을 뜻한다 |

**구조체** `STMemoryBudget`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채우는 스탬프 |
| `maxSources` | 최대 음원 수. `0` = 플랫폼 기본 |
| `rejectPolicy` | `STMemoryRejectPolicy`: `ST_MEMORY_REJECT_NEW`(0, 기본) = 넘으면 `st_rt_source_create`가 실패 핸들(`v < 0`)과 `ST_STATUS_BUDGET_EXCEEDED`를 돌려준다. `ST_MEMORY_EVICT_FARTHEST`(1) = 리스너에서 가장 먼 음원을 `st_rt_source_destroy`와 같은 경로로 내보내고 새 음원을 받는다(내보낸 id는 `STMemoryStats.lastEvictedSource`) |
| `sourceBudgetBytes` | 음원별 가변 메모리 합의 상한(바이트) = 추적 바이트 + `fixedPerSourceBytes` × 음원 수. `0` = 무제한(관측만) |
| `fixedPerSourceBytes` | 음원 하나의 고정 비용 추정치. `0` = 엔진 기본(2.5 MiB). 예산 추정에만 쓰인다 |
| `ringFloorSeconds` | 입력을 붙인 직후·경로가 없는 음원의 지연 링 크기(초). `0` = 0.25 |
| `ringGrowthHeadroom` | 링 성장 여유 배율 — 필요 지연 × 이 값(+50 ms, 125 ms 단위 올림). `0` = 1.25 |
| `allowShrink` | `0` = 링을 줄이지 않음(세션 중 최대치 유지), `1` = 축소 허용 |
| `reserved[5]` | 모두 `0`이어야 한다 |

**플랫폼 기본값**

| 빌드 타깃 | `maxSources` | `sourceBudgetBytes` | 지연 링 천장 |
|---|---|---|---|
| 데스크톱 | 128 | 무제한 | 2.0 s |
| Android · iOS | 48 | 96 MiB | 1.0 s |
| Emscripten(웹) | 32 | 64 MiB | 0.5 s |

**반환** — `1` = 적용 / `0` = 거절. 거절 시 상태는 바뀌지 않으며 `st_rt_get_last_status`에 `ST_STATUS_VERSION_MISMATCH`(`budget`이 `NULL`이거나 스탬프 불일치) 또는 `ST_STATUS_INVALID_ARGUMENT`(값이 비유한·범위 밖, `reserved`가 0이 아님)가 남습니다. `context`가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_get_memory_budget</code> — 현재 음원 메모리 예산 정책을 읽는다</summary>

```c
int st_rt_get_memory_budget(const STRT_Context* context, STMemoryBudget* outBudget);
```

**용도** — 현재 적용 중인 예산 정책(플랫폼 기본값이 채워진 실효값)을 확인하거나, 일부 필드만 바꾸기 위한 출발점으로 씁니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있습니다. 읽은 구조체를 고쳐 `st_rt_set_memory_budget`에 넘기는 것이 전형적인 패턴입니다. 지원 여부는 `ST_CAP1_MEMORY_BUDGET`. 스레드: `[control]` — 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outBudget` | 출력. 호출자가 `structSize`/`apiVersion`을 채운다. 성공 시 `reserved[]`는 0이 된다 |

`STMemoryBudget` 필드는 `st_rt_set_memory_budget` 항목 참고.

**반환** — `1` = 성공 / `0` = `context`가 `NULL`, 또는 `outBudget`이 `NULL`이거나 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_get_memory_stats</code> — 음원 메모리 사용량·거절·퇴거 통계를 읽는다</summary>

```c
int st_rt_get_memory_stats(const STRT_Context* context, STMemoryStats* outStats);
```

**용도** — 예산 대비 현재 사용량을 관측해 예산 값을 정하거나, 거절·퇴거가 일어났는지 확인합니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있습니다. 제어 쪽 기록과 풀만 읽고 오디오 스레드에는 접근하지 않습니다. 지원 여부는 `ST_CAP1_MEMORY_BUDGET`. 스레드: `[control]` — 제어 스레드에서 부릅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outStats` | 출력. 호출자가 `structSize = sizeof(STMemoryStats)`, `apiVersion = ST_ABI_VERSION`을 채운다 |

**구조체** `STMemoryStats`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채우는 스탬프 |
| `sourceCount` | 현재 음원 수 |
| `maxSources` | 적용 중인 최대 음원 수 |
| `trackedBytes` | 추적 바이트 = 설치된 지연 링(교체 대기 링 포함) + 경로 레인 추정 + 풀에 보관 중인 링 |
| `estimatedBytes` | `trackedBytes + fixedPerSourceBytes × sourceCount`. 예산 판정은 이 값이 넘치면 풀 보관 링을 먼저 비우고 다시 잰다 |
| `sourceBudgetBytes` | 적용 중인 바이트 상한(`0` = 무제한) |
| `pooledRingBytes` | 재사용을 위해 보관 중인 링 바이트(`trackedBytes`에 포함). 상한 데스크톱 16 MiB · 모바일 8 MiB · 웹 4 MiB, 10 s 미사용 시 해제 |
| `rejectedCreates` | 예산 초과로 거절된 `st_rt_source_create` 누계 |
| `evictions` | `ST_MEMORY_EVICT_FARTHEST`로 내보낸 음원 누계 |
| `lastEvictedSource` | 마지막으로 내보낸 음원 id, `-1` = 없음 |
| `ringBytesPerSourceMax` | 가장 큰 음원 지연 링 바이트 |
| `reserved[6]` | 예약 |

**반환** — `1` = 성공 / `0` = `context`가 `NULL`, 또는 `outStats`가 `NULL`이거나 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_ir_get_stats</code> — 마지막 IR 발행 하나의 일관된 계측 스냅샷을 읽는다</summary>

```c
int st_rt_ir_get_stats(const STRT_Context* context, STIrStats* outStats);
```

**용도** — 호스트에 임베드했을 때 "IR 굽기가 왜 느린가"를 엔진 내부를 보지 않고 가르기 위한 계측입니다. 모든 필드가 같은 발행의 값이라는 것이 계약이며, 다음 셋을 구분할 수 있습니다: ① 일이 많다 → `stagedBedCells`·`mergedBedCells`·`exactTaps`, ② 선점당한다 → `prepareCpuUs` ≪ `prepareTotalUs`(CPU/wall 비율이 낮음), ③ 느린 코어에 있다 → `prepareCpuUs` ≈ `prepareTotalUs`인데 절대값이 큼(`prepareCpuIndex`로 논리 프로세서 확인). 호스트 프레임 사이 `publishSequence` 증가량은 발행 주기를 줍니다.

**언제·어떻게** — 언제든 폴링할 수 있습니다. PIPELINED에서는 장면이 멈추면 발행도 멈춥니다 — 레인 입력과 조립 키가 그대로이고 마지막 변화 뒤 2 s가 지나면 다시 조립하지 않습니다(레인은 계속 돕니다). 무엇이든 바뀌면 바로 조립·발행하고, 그 뒤 2 s 동안은 많아야 50 ms마다 한 번 다시 조립합니다. 그래서 정지 장면에서 "IR이 최신인가"는 `publishSequence` 대신 `settled`로 판단합니다. SYNCHRONOUS에서도 유효합니다(호출 스레드가 굽고 곧바로 채택하므로 CPU/wall 비율이 1에 가깝습니다). 지원 여부는 `ST_CAP_IR_STATS`. 스레드: `[any]` — 락 없는 일관 스냅샷이며 찢어진 값을 내보내지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outStats` | 출력. 호출자가 `structSize = sizeof(STIrStats)`, `apiVersion = ST_ABI_VERSION`을 채운다. 거절일 때는 손대지 않는다 |

**구조체** `STIrStats`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채우는 스탬프 |
| `publishSequence` | 렌더가 새 IR을 채택할 때마다 +1. `0` = 아직 발행 없음 |
| `lastPublishLaneMask` | 직전 발행 이후 기하가 전진한 레인 비트: `ST_IR_LANE_DIRECT`(`1u<<0`) · `ST_IR_LANE_REFLECTION_DIFFRACTION`(`1u<<1`) · `ST_IR_LANE_REVERB`(`1u<<2`), 그리고 기하 비트가 하나도 없을 때만 서는 `ST_IR_LANE_POLICY_ONLY`(`1u<<3`, 새 기하 없이 다시 변환 — IR 정책 변경이거나 조립이 아직 수렴 중) |
| `stagedBedCells` | early bed 병합 입력 셀 수(소스별 합) |
| `mergedBedCells` | early bed 병합 출력 셀 수 |
| `activePartitions` / `maxPartitions` | bed 컨볼루션 파티션 수(활성 / 최대) |
| `irSpanMs` | 병합 bed IR 길이(ms) |
| `exactTaps` | exact 경로 탭 수 |
| `sendTaps` | 잔향 send 탭 수 |
| `rainTaps` | 1차 산란(diffuse rain) 탭 수 |
| `prepareMergeUs` | bed 병합·밴드 정규화 시간(µs) |
| `prepareBakeUs` | bed 시간 영역 굽기 시간(FFT 제외, µs) |
| `prepareFftUs` | 파티션 FFT 시간(µs) |
| `prepareTotalUs` | IR 준비 전체 wall 시간(µs). PIPELINED는 굽기 스레드의 준비만, SYNCHRONOUS는 적용까지 포함한 전체라 두 스케줄러 값을 나란히 비교하지 않습니다. 단계 µs 셋의 합은 이보다 작습니다 |
| `prepareCpuUs` | 같은 구간의 굽기 스레드 CPU 시간(µs). Windows는 해상도가 스케줄러 틱(약 15.6 ms)이라 한 값보다 여러 발행의 비율 추세를 봅니다. POSIX는 훨씬 촘촘합니다 |
| `prepareCpuIndex` | 준비가 끝난 순간 그 스레드가 있던 논리 프로세서 번호(힌트). 미지원 = `0xFFFFFFFF`(macOS는 항상 이 값) |
| `directLaneFrames` / `exactLaneFrames` / `reverbLaneFrames` | IR 조립이 받은 레인 프레임 누계(direct · 반사/회절 · 잔향, uint32 순환). 변경(소스 추가·리스너 이동 등) 직후 값을 기록해 두고 +2 이상이 되면, 그 변화 뒤에 시작한 레인 실행 결과가 조립에 들어갔다는 뜻입니다 |
| `settled` | `1` = 조립이 받은 레인 프레임을 모두 처리했고(수렴) 마지막 발행 IR을 렌더가 채택함 |
| `reserved[2]` | 모두 0 |

`directLaneFrames`~`settled`는 `ST_CAP1_ENGINE_IDLE` 표지로 PIPELINED에서만 의미가 있고(SYNCHRONOUS는 0과 `settled = 1`), 나머지 스냅샷과 따로 읽는 값입니다. bed 관련 8필드(`stagedBedCells`·`mergedBedCells`·`activePartitions`·`maxPartitions`·`irSpanMs`·`prepareMergeUs`·`prepareBakeUs`·`prepareFftUs`)는 early bed 렌더 모드(`STRenderOptions.reserved0 = 1`)에서만 0이 아닙니다 — exact objects 모드(`0`)의 0은 "굽기 단계 자체가 없음"입니다. `exactTaps`·`sendTaps`·`rainTaps`는 모드와 무관하게 채워집니다.

**반환** — `1` = 성공(아직 발행이 없으면 `publishSequence = 0`으로 성공) / `0` = 거절: `context`·`outStats`가 `NULL`, 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`), 스냅샷이 동시 발행과 연달아 충돌(`ST_STATUS_UNAVAILABLE` — 드물며 다시 부르면 됩니다).

</details>

<details>
<summary><code>st_rt_get_thread_inventory</code> — 컨텍스트가 지금 띄우고 있는 스레드 수를 종류별로 읽는다</summary>

```c
int st_rt_get_thread_inventory(const STRT_Context* context, STThreadInventory* outInventory);
```

**용도** — 스레드 속성(`STThreadAttributes`)이 "무엇을 심을지"라면 인벤토리는 "실제로 몇 개가 떠 있는지"입니다. 호스트가 자기 스레드 예산을 추측이 아니라 수치로 세울 수 있게 합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 종류별 카운터는 각각 독립 atomic이라 같은 순간의 스냅샷은 아닙니다 — 스레드가 뜨고 지는 중이면 합이 순간적으로 어긋날 수 있으며 오류가 아닙니다. 출력 장치 스레드(오디오 드라이버)는 별도 경로로 만들어져 인벤토리에 포함되지 않습니다. 지원 여부는 `ST_CAP_THREAD_INVENTORY`. 스레드: `[any]` — 종류별 atomic 카운터만 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outInventory` | 출력. 호출자가 `structSize = sizeof(STThreadInventory)`, `apiVersion = ST_ABI_VERSION`을 채운다 |

**구조체** `STThreadInventory`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채우는 스탬프 |
| `countByRole[ST_THREAD_TYPE_COUNT]` | `STThreadType` 순서의 스레드 수(인덱스 = 종류). 논리 역할(LANE_*·IR_CONVERTER·AU_PREPARE·SCENE_INPUT)은 계산 풀 위에서 돌아 항상 `0`, `ST_THREAD_ACCEL_BUILD`도 `0` |
| `reserved[5]` | 예약 |

`STThreadType` 값은 `st_rt_set_thread_attributes` 항목 참고.

전형적인 값(PIPELINED, 계산 풀 예산 `N = max(3, 해석된 예산)`, 파일 소스 있음):

| 출력 모드 | LANE_* | IR_CONVERTER · AU_PREPARE | COMPUTE_POOL | AUDIO_RENDER | FILE_DECODER |
|---|---|---|---|---|---|
| `DEVICE` | 0 | 0 | `N−1`(Direct 전용 1 포함) | 1 | 1 |
| `HOST_PULL` | 0 | 0 | `N−1` | 0 | 1 |

SYNCHRONOUS는 LANE_* 이 모두 0이고, 파일 입력이 없으면 FILE_DECODER는 0입니다.

**반환** — `1` = 성공 / `0` = `context`·`outInventory`가 `NULL`이거나 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`).

</details>

</details>

<details>
<summary><strong>재질 · 메시 · 오브젝트 · 씬</strong> — 17개</summary>

<details>
<summary><code>st_rt_material_create</code> — 음향 재질 하나를 등록하고 핸들을 받는다</summary>

```c
STMaterialId st_rt_material_create(STRT_Context* context, const STMaterial* material);
```

**용도** — 9개 옥타브 밴드의 반사·흡수·투과·산란 계수로 정의한 재질을 엔진에 등록합니다. 메시(`st_rt_mesh_create`)는 이 함수가 돌려준 재질 핸들을 참조해 표면의 음향 특성을 정합니다.

**언제·어떻게** — 재질을 쓰는 메시를 만들기 전에 호출합니다. 여러 재질은 이 함수를 반복 호출해 등록하며, 반환 핸들의 `v`는 등록 순서대로 연속입니다. 기본 재질 라이브러리가 필요하면 `st_rt_material_load_defaults`를 함께 씁니다. 스레드: `[control]` — 제어 스레드 전용이며 워커와 배타가 되어 잠깐 블록될 수 있으니 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `material` | 등록할 재질. 호출자가 `structSize = sizeof(STMaterial)`, `apiVersion = ST_ABI_VERSION`을 채웁니다. 계수보다 스탬프를 먼저 검증합니다 |

**구조체** `STMaterial`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STMaterial)` — 호출자가 채움 |
| `apiVersion` | `ST_ABI_VERSION` — 호출자가 채움 |
| `reflection[ST_FREQUENCY_BANDS]` | 밴드별 반사 에너지 비율, `[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | 밴드별 흡수 에너지 비율, `[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | 밴드별 투과 에너지 비율, `[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 반사 에너지 중 확산(diffuse)으로 가는 비율, `[0, 1]`. R+A+T 합에는 들어가지 않습니다 |
| `reserved[8]` | 예약 |

- 밴드는 `ST_FREQUENCY_BANDS` = 9개(63 · 125 · 250 · 500 · 1000 · 2000 · 4000 · 8000 · 16000 Hz) 고정입니다.
- 모든 계수는 **에너지 도메인**(무차원 에너지 비율)입니다. 압력 진폭이 아닙니다.
- 밴드마다 `|R + A + T − 1| <= ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`(0.001)를 만족해야 합니다. 엔진은 값을 유도·정규화·클램프·보간하지 않으므로, 합이 1이 되도록 호출자가 맞춰 넣어야 합니다.

**반환** — 재질 핸들(`STMaterialId`, `struct { int32_t v; }`). 메시·오브젝트 핸들(`STMeshId`·`STObjectId`)도 같은 꼴의 서로 다른 타입이라 섞어 넣으면 컴파일 오류가 납니다. 실패하면 `v < 0`이고 `st_rt_get_last_status`에 원인이 남습니다: `material`이 NULL이면 `ST_STATUS_INVALID_ARGUMENT`, 스탬프 불일치면 `ST_STATUS_VERSION_MISMATCH`, 비유한 값·범위 밖 값·R+A+T 합 불일치면 `ST_STATUS_INVALID_MATERIAL`.

</details>

<details>
<summary><code>st_rt_material_load_defaults</code> — 기본 재질 라이브러리를 한 번에 등록한다</summary>

```c
STMaterialId st_rt_material_load_defaults(STRT_Context* context);
```

**용도** — 엔진에 내장된 기본 재질 라이브러리를 통째로 등록합니다. 재질 계수를 직접 준비하지 않고 바로 씬을 구성할 때 씁니다.

**언제·어떻게** — 메시를 만들기 전에 호출합니다. 반환값은 라이브러리의 **첫 재질** 핸들이며, 나머지 재질은 `v+1`, `v+2` … 순서대로 연속입니다. `st_rt_material_create`로 등록한 재질과 함께 써도 됩니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 라이브러리 첫 재질의 핸들. 실패하면 `v < 0`.

</details>

<details>
<summary><code>st_rt_scene_set_edge_split_collinear_overlaps</code> — 공선으로 겹치는 음향 엣지의 분할 여부를 정한다</summary>

```c
void st_rt_scene_set_edge_split_collinear_overlaps(STRT_Context* context, int enabled);
```

**용도** — 메시를 만들 때 컴파일되는 음향 엣지(회절 엣지) 토폴로지에서, 한 직선 위에 겹쳐 놓인(공선 중첩) 엣지를 분할해 다룰지 정하는 씬 빌드 옵션입니다. 지원 여부는 capability 비트 `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`로 확인합니다.

**언제·어떻게** — 메시 생성 시점의 값이 쓰이므로 **이 호출 뒤에 만드는 메시에만** 적용됩니다. 이미 만든 메시의 토폴로지는 바뀌지 않으니 `st_rt_mesh_create` 전에 설정합니다. 기본은 꺼짐입니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | `0` = 끔(기본) / 0 이외 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_scene_set_solid_wedge_gate</code> — 회절 쐐기의 오리엔티드 기각 게이트를 켜고 끈다</summary>

```c
void st_rt_scene_set_solid_wedge_gate(STRT_Context* context, int enabled);
```

**용도** — 두 면이 만나는 회절 쐐기(wedge)에서, 메시의 와인딩(법선 방향)으로 볼록·오목을 가려 쐐기의 고체 쪽으로 들어가는 회절 경로를 기각하는 게이트입니다. 지원 여부는 capability 비트 `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`로 확인합니다.

**언제·어떻게** — 기본은 꺼짐입니다. 전파 단계에서 판정하므로 기존 메시에도 적용됩니다. 켜면 판정이 메시 와인딩에 의존하므로, 메시 하나 안에서 와인딩을 일관되게 유지하고 법선이 공기 쪽을 향하게 해야 합니다 — 와인딩을 뒤집으면 볼록·오목이 바뀌어 기각되는 회절 경로 집합이 반대가 됩니다(`st_rt_mesh_create`의 와인딩 안내 참고). 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | `0` = 끔(기본) / 0 이외 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_scene_set_accel</code> — 메시·정적 씬 가속구조 종류를 고른다</summary>

```c
int st_rt_scene_set_accel(STRT_Context* context, int kind);
```

**용도** — 메시 BLAS와 정적 씬 가속구조에 쓸 구조 종류를 선택합니다. 엔진은 생성 시 `SIMPLEST_ACCEL` 환경변수도 읽지만, 이 함수로 호스트가 자기 프로세스 환경을 바꾸지 않고 같은 선택을 할 수 있습니다.

**언제·어떻게** — 오브젝트를 추가하기 전에 호출합니다. 이후의 빌드에만 적용되며 기존 메시의 BLAS는 생성 시점의 값으로 지어진 그대로입니다. 기본값은 `2`(TinyBVH)입니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH(기본) / `3` = LBVH / `4` = LBVH_Simd |

**반환** — `1` = 적용 / `0` = `kind`가 범위 밖이거나 컨텍스트가 없음.

</details>

<details>
<summary><code>st_rt_scene_set_triangle_intersection</code> — 삼각형 교차 커널을 고른다</summary>

```c
int st_rt_scene_set_triangle_intersection(STRT_Context* context, int kind);
```

**용도** — 레이-삼각형 교차 판정에 쓸 커널을 선택합니다. 세 커널 모두 양면 교차입니다.

**언제·어떻게** — 커널은 `st_rt_mesh_create` 시점에 메시에 고정되므로 **이 호출 뒤에 추가하는 메시에만** 적용됩니다(기존 메시 소급 없음). 메시마다 다른 커널을 쓰는 구성도 유효합니다. 기본은 `0`(MollerTrumbore)입니다. 현재 값은 `st_rt_scene_get_triangle_intersection`으로 읽습니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `kind` | `0` = MollerTrumbore(기본) / `1` = PluckerAdaptive / `2` = Watertight |

**반환** — `1` = 적용 / `0` = 잘못된 `kind` 또는 컨텍스트 없음.

</details>

<details>
<summary><code>st_rt_scene_get_triangle_intersection</code> — 현재 삼각형 교차 커널 설정을 읽는다</summary>

```c
int st_rt_scene_get_triangle_intersection(const STRT_Context* context);
```

**용도** — `st_rt_scene_set_triangle_intersection`으로 지정한 값, 즉 다음에 만들 메시에 적용될 교차 커널을 조회합니다.

**언제·어떻게** — 언제든 호출할 수 있습니다. 이미 만든 메시는 각자 생성 시점의 커널을 유지하므로, 반환값이 기존 메시의 커널과 같다는 보장은 없습니다. 스레드: `[control]` — 씬 read 락만 잡는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight. 컨텍스트가 없으면 `-1`.

</details>

<details>
<summary><code>st_rt_scene_get_stats</code> — 라이브 메시·오브젝트·소스·삼각형 수를 조회한다</summary>

```c
int st_rt_scene_get_stats(STRT_Context* context, STSceneStats* outStats);
```

**용도** — 현재 살아 있는 음향 씬의 인벤토리(메시·오브젝트·소스 개수와 삼각형 수)를 한 번의 read 락 스냅샷으로 돌려줍니다. 모든 값이 같은 시점의 씬을 기술하므로 진단·메모리 규모 파악에 씁니다. 지원 여부는 capability 비트 `ST_CAP_SCENE_STATS`로 확인합니다.

**언제·어떻게** — 씬 구성 중이든 렌더 중이든 제어 스레드에서 언제든 호출할 수 있습니다. 스레드: `[control]` — 씬 read 락만 잡는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outStats` | 결과를 받을 구조체. 호출자가 `structSize = sizeof(STSceneStats)`, `apiVersion = ST_ABI_VERSION`을 채웁니다 |

**구조체** `STSceneStats`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STSceneStats)` — 호출자가 채움 |
| `apiVersion` | `ST_ABI_VERSION` — 호출자가 채움 |
| `meshCount` | 라이브 메시 수 |
| `objectCount` | 라이브 오브젝트 수. destroy가 성공하는 즉시 줄어듭니다 |
| `sourceCount` | 라이브 소스 수. 비활성(disabled) 소스도 포함하며 destroy가 성공하는 즉시 줄어듭니다 |
| `reserved0` | 예약 |
| `triangleCount` | 라이브 오브젝트가 참조하는 메시의 삼각형을 **인스턴스별로** 합친 값. 100개 삼각형 메시를 오브젝트 3개가 공유하면 300 |
| `uniqueTriangleCount` | 라이브 메시 리소스를 **한 번씩만** 합친 값(위 예에서 100). 기하·가속구조 메모리 규모를 볼 때 씁니다 |
| `reserved[4]` | 예약 |

**반환** — `1` = 성공 / `0` = `context`·`outStats`가 NULL(`ST_STATUS_INVALID_ARGUMENT`)이거나 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_rt_scene_raycast</code> — 엔진 가속구조로 최근접 히트를 질의한다</summary>

```c
int st_rt_scene_raycast(STRT_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**용도** — 전파 계산이 쓰는 바로 그 가속구조(정적+동적 오브젝트 모두)에 레이를 쏘아 가장 가까운 히트 하나를 돌려줍니다. 읽기 전용 질의라 파이프라인 상태를 바꾸지 않으므로, 호스트가 엔진이 실제로 보는 음향 기하를 확인하거나 자체 로직(가림 판정·디버그 표시 등)에 쓸 수 있습니다. 지원 여부는 capability 비트 `ST_CAP_SCENE_RAYCAST`로 확인합니다.

**언제·어떻게** — `st_rt_build`로 가속구조를 지은 뒤에 의미가 있습니다. 빌드 전이면 오류 없이 미스를 돌려줍니다. 씬 read 락만 잡으므로 `ST_RT_SCHEDULER_PIPELINED`에서도 워커와 함께 돌 수 있습니다. 스레드: `[control]` — 씬 read 락만 잡는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `origin` | 레이 원점, 월드 좌표 3성분(씬 단위). 유한해야 합니다 |
| `direction` | 레이 방향 3성분. 엔진이 정규화하므로 단위벡터일 필요는 없지만 유한하고 0벡터가 아니어야 합니다 |
| `maxDistanceMeters` | 최대 거리(미터, 씬 단위 × `sceneRatio` 규약). `<= 0` 또는 비유한 값이면 무한 |
| `outHit` | 결과를 받을 구조체. 호출자가 `structSize = sizeof(STRayHit)`, `apiVersion = ST_ABI_VERSION`을 채웁니다 |

**구조체** `STRayHit`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STRayHit)` — 호출자가 채움 |
| `apiVersion` | `ST_ABI_VERSION` — 호출자가 채움 |
| `hit` | `1` = 히트 / `0` = 미스 |
| `distanceMeters` | 원점에서 히트점까지 거리(미터). 씬 거리 × `sceneRatio`(생성 옵션, 기본 1) |
| `point[3]` | 히트점. 씬 프레임 좌표 그대로(단위 변환 없음) |
| `normal[3]` | 히트 삼각형의 단위 기하 법선. 항상 **레이 원점 쪽**을 향하도록 정렬되며, 메시 와인딩이 주는 부호는 유지되지 않습니다 |
| `objectId` | 히트한 오브젝트 id(`STObjectId`의 `v` 값). 미스면 `-1` |
| `meshId` | 그 오브젝트의 메시 id(`STMeshId`의 `v` 값). 미스면 `-1` |
| `triangleIndex` | 메시 로컬 삼각형 인덱스. 미스면 `-1` |
| `materialIndex` | 그 삼각형의 재질 인덱스(`STMaterialId`의 `v` 값). 미스면 `-1` |
| `reserved[6]` | 예약 |

미스(`hit == 0`)이면 `distanceMeters`·`point`·`normal`은 0이고 네 id는 모두 `-1`입니다. `0`은 유효한 id이므로 미스 표식으로 쓰지 않습니다. id 필드는 핸들 구조체가 아닌 `int32_t`입니다.

**반환** — `1` = 호출 성공(히트 여부는 `outHit->hit`로 판단 — 미스는 실패가 아닙니다) / `0` = 실패: `context`·포인터 NULL, 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`), `origin`·`direction` 비유한 또는 `direction`이 0벡터(`ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_rt_mesh_create</code> — 삼각형 메시를 등록하고 핸들을 받는다</summary>

```c
STMeshId st_rt_mesh_create(STRT_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**용도** — 음향 기하로 쓸 삼각형 메시를 등록합니다. 메시는 기하 리소스이고, 씬에 실제로 놓으려면 `st_rt_object_create`/`st_rt_object_create_q`로 이 메시를 참조하는 오브젝트(인스턴스)를 만듭니다. 메시 하나를 여러 오브젝트가 공유할 수 있습니다.

**언제·어떻게** — 쓸 재질을 먼저 등록한 뒤 호출합니다. 재질 지정은 둘 중 하나입니다.

- `triangleMaterialIndices == NULL`: 메시 전체가 `material` 하나를 씁니다.
- `triangleMaterialIndices != NULL`: 삼각형마다 재질을 지정합니다(배열 길이 `mesh->numTriangles`). 이때 `material` 인자는 무시됩니다. 지원 여부는 `ST_CAP_PER_TRIANGLE_MATERIALS`로 확인합니다.

교차 커널(`st_rt_scene_set_triangle_intersection`), 엣지 분할 옵션(`st_rt_scene_set_edge_split_collinear_overlaps`), 가속구조 종류(`st_rt_scene_set_accel`)는 이 호출 시점의 값으로 메시에 고정됩니다. 입력 배열은 호출 중에 복사되므로 반환 뒤 해제해도 됩니다. 스레드: `[control, blocking]` — 음향 엣지 토폴로지를 컴파일하는 긴 배타 구간이므로 게임 루프·오디오 스레드에서 부르지 마십시오.

와인딩: 교차는 양면이고 반사·투과는 와인딩과 무관하지만, 회절 엣지 판정 일부(두께 0 판의 엣지 채택, `st_rt_scene_set_solid_wedge_gate`)는 와인딩에 의존합니다. 메시 하나 안에서 와인딩을 **일관되게** 유지하고, 가능하면 법선이 공기 쪽을 향하게 하십시오. 좌표계를 미러링해 가져올 때는 인덱스 순서도 함께 뒤집어야 합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 메시 기하(`STMesh`). NULL 불가 |
| `material` | 메시 전체 재질 핸들. `triangleMaterialIndices`가 NULL일 때만 쓰이며 등록된 재질이어야 합니다 |
| `triangleMaterialIndices` | 삼각형별 재질 인덱스 배열(`numTriangles`개, 각 원소는 등록된 `STMaterialId`의 `v` 값) 또는 NULL |

**구조체** `STMesh`

| 필드 | 설명 |
|---|---|
| `numVertices` | 정점 수(> 0) |
| `vertices` | 정점 좌표 xyz 인터리브 배열, `numVertices * 3`개 float. 씬 단위(메시 로컬 프레임) |
| `numTriangles` | 삼각형 수(> 0) |
| `triangles` | 삼각형 정점 인덱스 배열, `numTriangles * 3`개 int. 각 값은 `[0, numVertices)` |

**반환** — 메시 핸들. 실패하면 `v < 0`: `mesh`·배열 포인터가 NULL이거나 개수가 0 이하면 `ST_STATUS_INVALID_ARGUMENT`, 인덱스 범위 밖·등록되지 않은 재질 등으로 메시가 거절되면 `ST_STATUS_INVALID_MATERIAL`.

</details>

<details>
<summary><code>st_rt_object_create</code> — 메시를 행렬 변환으로 씬에 배치한다</summary>

```c
STObjectId st_rt_object_create(STRT_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**용도** — 등록된 메시를 월드 변환과 함께 씬에 놓는 오브젝트(인스턴스)를 만듭니다. 전파 계산과 `st_rt_scene_raycast`는 오브젝트만 봅니다. 회전을 쿼터니언으로 주려면 `st_rt_object_create_q`를 씁니다.

**언제·어떻게** — `st_rt_mesh_create` 뒤에 호출합니다. `isDynamic`으로 정적/동적을 정합니다.

- 정적(`0`): `st_rt_build`(정적+동적 전체 빌드)가 발행하는 정적 TLAS에 들어갑니다. 추가·제거·변환 변경은 다음 `st_rt_build` 전까지 발행된 정적 구조에 반영되지 않습니다. 움직이지 않는 벽·바닥 등 건축 기하에 씁니다.
- 동적(`1`): 동적 오브젝트 TLAS에 들어가며, 변환 변경이 전체 빌드 없이 동적 재구축(refit, `st_rt_build_dynamic`)으로 반영됩니다. 문·차량 등 움직이는 기하에 씁니다.

스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 배치할 메시 핸들 |
| `transform` | 로컬→월드 변환(`STTransform`). NULL이면 항등 변환 |
| `isDynamic` | `0` = 정적 / 0 이외 = 동적 |

**구조체** `STTransform`

| 필드 | 설명 |
|---|---|
| `m00, m01, m02` | 3x3 회전·스케일 행렬 1행 |
| `m10, m11, m12` | 2행 |
| `m20, m21, m22` | 3행 |
| `tx, ty, tz` | 평행이동(씬 단위) |

행 우선(row-major)이며 점을 **열벡터로** 곱합니다: `x' = m00*x + m01*y + m02*z + tx`, `y' = m10*x + m11*y + m12*z + ty`, `z' = m20*x + m21*y + m22*z + tz` (`m00*x + m10*y + m20*z` 꼴이 아닙니다). 비균등 스케일과 행렬식이 음수인 변환(거울·음수 스케일)도 받습니다. 성분이 비유한이거나 역행렬을 만들 수 없는 변환은 거절됩니다. 좌표계는 왼손, +Y up, +Z forward, +X right입니다.

**반환** — 오브젝트 핸들. 실패하면 `v < 0`(없는 메시, 쓸 수 없는 변환 등).

</details>

<details>
<summary><code>st_rt_object_create_q</code> — 메시를 위치·쿼터니언·스케일로 씬에 배치한다</summary>

```c
STObjectId st_rt_object_create_q(STRT_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**용도** — `st_rt_object_create`와 같은 오브젝트를 만들되, 변환을 위치·회전 쿼터니언·스케일(TRS)로 받습니다. 게임 엔진의 트랜스폼을 행렬로 바꾸지 않고 바로 넘길 때 씁니다.

**언제·어떻게** — `st_rt_mesh_create` 뒤에 호출합니다. 정적/동적의 의미와 빌드 반영 시점은 `st_rt_object_create`와 같습니다. 이후 변환은 `st_rt_object_set_transform_q`로 갱신합니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 배치할 메시 핸들 |
| `position` | 월드 위치 xyz(씬 단위). NULL 불가 |
| `quatXYZW` | 로컬→월드 회전 쿼터니언, **XYZW 순서**. 엔진이 정규화하며 노름이 `1e-12` 미만이면 항등 회전으로 대체합니다. NULL 불가 |
| `scale` | 축별 스케일 xyz. 회전에 열 스케일로 합성되며(R·S) 비균등 스케일을 허용합니다. NULL 불가 |
| `isDynamic` | `0` = 정적 / 0 이외 = 동적 |

**반환** — 오브젝트 핸들. 실패하면 `v < 0`(포인터 NULL, 없는 메시, 쓸 수 없는 변환 등).

</details>

<details>
<summary><code>st_rt_object_set_transform</code> — 오브젝트의 행렬 변환을 바꾼다</summary>

```c
void st_rt_object_set_transform(STRT_Context* context, STObjectId object, const STTransform* transform);
```

**용도** — 이미 배치한 오브젝트의 로컬→월드 변환을 행렬로 갱신합니다.

**언제·어떻게** — 오브젝트를 움직일 때 호출합니다. 동적 오브젝트는 전체 빌드 없이 동적 재구축으로 반영됩니다. 정적 오브젝트의 변경은 대기 상태로 두었다가 다음 `st_rt_build`에서 반영되므로, 매 프레임 움직이는 기하는 동적(`isDynamic = 1`)으로 만드십시오. 쿼터니언으로 주려면 `st_rt_object_set_transform_q`를 씁니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `object` | 대상 오브젝트 핸들 |
| `transform` | 새 변환. `STTransform` 필드는 `st_rt_object_create` 항목 참고. NULL이면 아무것도 하지 않습니다 |

**반환** — 없음. 없는 오브젝트나 쓸 수 없는 변환(비유한·역행렬 불가)은 무시됩니다.

</details>

<details>
<summary><code>st_rt_object_set_transform_q</code> — 오브젝트 변환을 위치·쿼터니언·스케일로 바꾼다</summary>

```c
void st_rt_object_set_transform_q(STRT_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**용도** — `st_rt_object_set_transform`의 TRS판입니다. 게임 엔진 트랜스폼(위치·쿼터니언·스케일)을 그대로 넘겨 오브젝트를 갱신합니다.

**언제·어떻게** — 정적/동적별 반영 시점은 `st_rt_object_set_transform`과 같습니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `object` | 대상 오브젝트 핸들 |
| `position` | 월드 위치 xyz(씬 단위) |
| `quatXYZW` | 로컬→월드 회전 쿼터니언, **XYZW 순서**. 엔진이 정규화하며 노름이 `1e-12` 미만이면 항등 회전으로 대체합니다 |
| `scale` | 축별 스케일 xyz(R·S 합성, 비균등 허용) |

**반환** — 없음. 포인터 중 하나라도 NULL이면 아무것도 하지 않으며, 없는 오브젝트나 쓸 수 없는 변환은 무시됩니다.

</details>

<details>
<summary><code>st_rt_mesh_destroy</code> — 메시와 그 메시를 쓰는 오브젝트를 제거한다</summary>

```c
int st_rt_mesh_destroy(STRT_Context* context, STMeshId mesh);
```

**용도** — 등록한 메시 리소스를 씬에서 제거합니다. 이 메시를 참조하던 오브젝트도 함께 해제됩니다.

**언제·어떻게** — 더 이상 쓰지 않는 기하를 정리할 때 호출합니다. 정적 오브젝트가 함께 제거되면 다음 `st_rt_build` 전까지 발행된 정적 구조에 남아 있으므로, 제거 뒤 `st_rt_build`를 호출해 반영하십시오. 제거된 핸들은 다시 쓰지 않습니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 제거할 메시 핸들 |

**반환** — `1` = 제거됨 / `0` = 컨텍스트가 없거나 없는 메시.

</details>

<details>
<summary><code>st_rt_object_destroy</code> — 오브젝트를 씬에서 제거한다</summary>

```c
int st_rt_object_destroy(STRT_Context* context, STObjectId object);
```

**용도** — 배치한 오브젝트(인스턴스)를 씬에서 뺍니다. 참조하던 메시 리소스는 남습니다.

**언제·어떻게** — 성공 즉시 `st_rt_scene_get_stats`의 `objectCount`가 줄어듭니다. 정적 오브젝트는 다음 `st_rt_build` 전까지 발행된 정적 구조에 남아 있으므로, 제거 뒤 `st_rt_build`를 호출해 반영하십시오. 동적 오브젝트는 동적 재구축에서 빠집니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `object` | 제거할 오브젝트 핸들 |

**반환** — `1` = 제거됨 / `0` = 컨텍스트가 없거나 없는(이미 제거된) 오브젝트.

</details>

<details>
<summary><code>st_rt_mesh_set_material</code> — 메시 전체의 재질을 런타임에 바꾼다</summary>

```c
int st_rt_mesh_set_material(STRT_Context* context, STMeshId mesh, STMaterialId material);
```

**용도** — 이미 등록한 메시의 재질을 다른 재질 하나로 교체합니다. 메시를 다시 만들지 않고 표면 음향 특성만 바꿀 때 씁니다.

**언제·어떻게** — 씬 구성 뒤 언제든 호출할 수 있습니다. 메시의 모든 삼각형이 `material`을 쓰게 되며, 생성 시 삼각형별로 지정한 재질도 이 하나로 바뀝니다. 재질이 유효하지 않으면 기존 재질을 그대로 둡니다. 이 메시를 쓰는 모든 오브젝트에 반영됩니다. 스레드: `[control]` — 제어 스레드 전용, 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 대상 메시 핸들 |
| `material` | 새 재질 핸들(등록된 재질) |

**반환** — `1` = 변경됨 / `0` = 컨텍스트가 없거나, 없는 메시이거나, 등록되지 않은 재질.

</details>

</details>

<details>
<summary><strong>음원 — 생성, 위치·방향·속도, 지향성, 경로 게이트·볼륨, 레이 예산</strong> — 21개</summary>

<details>
<summary><code>st_rt_source_create</code> — 음원을 만들고 핸들을 돌려준다</summary>

```c
STSourceId st_rt_source_create(STRT_Context* context, const STSourceDesc* source);
```

**용도** — 씬에 음원 하나를 등록하고 이후 모든 `st_rt_source_*` 호출에 쓰는 `STSourceId` 핸들을 돌려줍니다. 위치·방향·속도·압력 배율·지향 프로필·동적/정적 여부를 한 번에 정합니다.

**언제·어떻게** — 컨텍스트를 만든 뒤 언제든 부릅니다. 만든 뒤 오디오 입력(`st_rt_source_set_audio_file`, `st_rt_source_attach_stream` 등)을 붙이고, 움직이는 음원은 매 프레임 `st_rt_source_set_position` / `st_rt_source_set_velocity`로 갱신합니다. 생성 직후 상태: source energy 1.0, 경로 볼륨 4종 1.0, 경로 종류 게이트 5종 모두 켜짐, 활성(enabled), 쉼 아님(`ST_RT_IDLE_RUNNING`), 지향성 테이블 없음, 수송 갱신 단계 수 0(기본), 수송 레이 격자 16 × 8, 소스별 최대 깊이 4. orientation은 `direction`에 맞는 roll 없는 최소 회전으로 맞춰집니다(`direction`이 `{0,0,1}`이면 항등). 스레드: `[control]` — 씬 락을 잡을 수 있으니 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 생성 기술자 `STSourceDesc`(아래). NULL이면 실패. 이 구조체에는 `structSize` / `apiVersion` 스탬프가 없습니다 |

**구조체** `STSourceDesc`

| 필드 | 설명 |
|---|---|
| `positionX`, `positionY`, `positionZ` | 월드 위치. **씬 단위 그대로**(엔진이 `sceneRatio`로 미터 환산). 유한값이어야 합니다 |
| `directionX`, `directionY`, `directionZ` | 소스 정면(forward) 방향. 엔진이 정규화하고, 이 방향에 맞춰 소스 orientation(로컬 forward = +Z)을 roll 없이 설정합니다. 0벡터면 +Z. 유한값이어야 합니다 |
| `velocityX`, `velocityY`, `velocityZ` | 소스 속도, 씬 단위/초. Doppler 계산 전에 m/s로 환산됩니다. 유한값이어야 합니다 |
| `intensity` | 무차원 **선형 압력(pressure) 배율**. 음향 인텐시티(W/m²)·SPL(dB)·보정된 Pa가 아닙니다. 유한하고 0 이상이어야 합니다. 에너지 영역 배율은 별도로 `st_rt_source_set_energy`로 줍니다 |
| `directional` | `0` = 무지향(전 밴드 onAxis = offAxis = 1). `0` 아님 = 간이 지향 프로필(onAxis = 1, offAxis = 0). 밴드별로 세밀하게 정하려면 생성 뒤 `st_rt_source_set_axis_attenuation` 또는 `st_rt_source_set_directivity`를 씁니다 |
| `isDynamic` | `1` = 동적 소스(잔향을 매 프레임 다시 계산), `0` = 정적 소스(잔향을 캐시해 재사용). 수송 갱신 단계 수의 기본값도 이 값으로 갈립니다(`st_rt_source_set_transport_refresh_steps` 참고) |

**반환** — 성공 시 `v >= 0`인 `STSourceId`. 실패는 **`v < 0`**이고 `st_rt_get_last_status`로 사유를 봅니다.
- `ST_STATUS_INVALID_ARGUMENT` — `source`가 NULL, 위치·방향·속도·`intensity`에 비유한값, `intensity < 0`, 그 밖에 엔진이 거절한 경우.
- `ST_STATUS_BUDGET_EXCEEDED` — 음원 메모리 예산(`STRT_CreateOptions.maxSources`, `st_rt_set_memory_budget`의 `maxSources` · `sourceBudgetBytes`)을 넘었을 때. 정책이 `ST_MEMORY_REJECT_NEW`(기본)일 때만 나며, `ST_MEMORY_EVICT_FARTHEST`면 리스너에서 가장 먼 음원을 `st_rt_source_destroy`와 같은 경로로 내보내고 새 음원을 받습니다(내보낸 id는 `STMemoryStats.lastEvictedSource`). 지원 여부는 `st_rt_get_capability_word(1)`의 `ST_CAP1_MEMORY_BUDGET`으로 확인합니다.

</details>

<details>
<summary><code>st_rt_source_set_position</code> — 음원 위치를 옮긴다</summary>

```c
void st_rt_source_set_position(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**용도** — 음원의 월드 위치를 갱신합니다. 움직이는 음원을 게임 오브젝트에 붙여 따라가게 할 때 씁니다.

**언제·어떻게** — 게임 루프에서 매 프레임 불러도 됩니다. 속도를 아는 호스트는 `st_rt_source_set_velocity`도 함께 갱신합니다. 스레드: `[control]` — `ST_RT_SCHEDULER_PIPELINED`에서는 모션 큐에 넣고 돌아오며, 오디오 콜백에서는 부르지 않습니다. 스피커 세트 멤버 소스에는 쓸 수 없습니다(무시되고 `last_status` = `ST_STATUS_INVALID_ARGUMENT`) — 세트의 포즈 갱신을 씁니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `x`, `y`, `z` | 새 월드 위치, **씬 단위**(좌표 변환 없이 그대로) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_set_direction</code> — 음원 정면 방향을 바꾼다</summary>

```c
void st_rt_source_set_direction(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**용도** — 음원의 정면(forward) 방향을 바꿉니다. 콘 감쇠(`st_rt_source_set_axis_attenuation`)와 지향성 테이블(`st_rt_source_set_directivity`)이 이 방향을 기준으로 적용됩니다.

**언제·어떻게** — 언제든 부릅니다. 이 setter는 소스 orientation을 "+Z에서 그 방향으로 가는 **roll 없는 최소 회전**"으로 함께 갱신합니다. roll이 필요한 지향성 테이블(좌우가 비대칭인 음원 등)은 이 함수 대신 `st_rt_source_set_orientation_q`를 씁니다. 스레드: `[control]`. 스피커 세트 멤버 소스에는 쓸 수 없습니다(무시, `ST_STATUS_INVALID_ARGUMENT`).

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `x`, `y`, `z` | 월드 기준 정면 방향 벡터. 좌표계는 +X right · +Y up · +Z forward |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_set_velocity</code> — 음원 속도를 준다</summary>

```c
void st_rt_source_set_velocity(STRT_Context* context, STSourceId source, float x, float y, float z);
```

**용도** — 음원의 이동 속도를 갱신합니다. 엔진은 이 값을 Doppler 계산에 씁니다.

**언제·어떻게** — 위치 갱신과 같은 주기로 부릅니다. 스레드: `[control]` — `ST_RT_SCHEDULER_PIPELINED`에서는 모션 큐에 넣고 돌아옵니다. 스피커 세트 멤버 소스에는 쓸 수 없습니다(무시, `ST_STATUS_INVALID_ARGUMENT`).

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `x`, `y`, `z` | 속도 벡터, **씬 단위/초**. 엔진이 `sceneRatio`로 m/s로 환산합니다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_destroy</code> — 음원을 지운다</summary>

```c
int st_rt_source_destroy(STRT_Context* context, STSourceId source);
```

**용도** — 음원을 씬에서 제거하고 그 렌더 상태를 정리합니다. 음원 메모리 예산에서 자리를 돌려받는 것도 이 호출입니다.

**언제·어떻게** — 더 쓰지 않는 음원에 부릅니다. 렌더 중이면 3 ms 램프로 소리를 내린 뒤 렌더 상태를 거둡니다. 지운 소스의 소스별 쉼(`st_rt_source_idle`) 설정도 함께 사라집니다. 스레드: `[control]`. 스피커 세트 멤버 소스는 지울 수 없습니다(`0`, `ST_STATUS_INVALID_ARGUMENT`) — 세트를 지웁니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 지울 음원 핸들 |

**반환** — `1` = 제거됨 / `0` = 실패(컨텍스트 NULL, 없는 음원, 스피커 세트 멤버).

</details>

<details>
<summary><code>st_rt_source_set_path_enabled</code> — 음원 하나의 경로 종류를 켜고 끈다</summary>

```c
void st_rt_source_set_path_enabled(STRT_Context* context, STSourceId source, int pathType, int enabled);
```

**용도** — 음원 하나에 대해 특정 경로 종류(직접·투과·반사·회절·잔향)를 계산·기여에서 빼거나 다시 넣습니다. 전역 게이트 `st_rt_set_path_type_enabled`의 소스별 판입니다. 특정 음원만 잔향을 빼는 식의 연출이나 청취 A/B 비교에 씁니다.

**언제·어떻게** — 언제든 부릅니다. 기본은 5종 모두 켜짐입니다. 경로를 완전히 빼는 대신 크기만 줄이려면 `st_rt_source_set_path_volume`(`STSourceVolumeKind`: `ST_SOURCE_VOLUME_DIRECT`(0, 투과 포함) / `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3), 선형 압력 배율)을 씁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb. 범위 밖은 무시됩니다 |
| `enabled` | `0` = 끔, `0` 아님 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_is_path_enabled</code> — 음원 하나의 경로 종류 게이트를 읽는다</summary>

```c
int st_rt_source_is_path_enabled(STRT_Context* context, STSourceId source, int pathType);
```

**용도** — `st_rt_source_set_path_enabled`로 정한 소스별 경로 게이트의 현재 값을 조회합니다.

**언제·어떻게** — 언제든 부릅니다. 스레드: `[control]` — 씬 read 락만 잡는 순수 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |

**반환** — `1` = 켜짐 / `0` = 꺼짐. 컨텍스트 NULL, 없는 음원, 범위 밖 `pathType`도 `0`입니다.

</details>

<details>
<summary><code>st_rt_source_set_energy</code> — 음원의 에너지 배율을 정한다</summary>

```c
int st_rt_source_set_energy(STRT_Context* context, STSourceId source, float energy);
```

**용도** — 음원의 상대 방사 에너지를 **energy-domain**(무차원 에너지 비율) 배율로 정합니다. `STSourceDesc::intensity`(압력 배율)와 별개의 배율이며, 지향성 테이블을 `ST_DIRECTIVITY_POWER_MEAN`으로 정규화했을 때 총 방사 파워를 잡는 자리이기도 합니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 기본값은 1.0입니다. 에너지와 압력의 관계는 **energy = gain²**입니다 — 압력 이득 g를 원하면 `g * g`를 넣습니다(예: −6 dB, g ≈ 0.5 → energy ≈ 0.25). 엔진은 렌더 경계에서 한 번만 제곱근을 취합니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `energy` | 에너지 배율. 유한하고 0 이상. 기본 1.0 |

**반환** — `1` = 적용 / `0` = 실패(컨텍스트 NULL, 비유한값 또는 음수, 없는 음원).

</details>

<details>
<summary><code>st_rt_source_get_energy</code> — 음원의 에너지 배율을 읽는다</summary>

```c
float st_rt_source_get_energy(STRT_Context* context, STSourceId source);
```

**용도** — `st_rt_source_set_energy`로 정한 에너지 배율(energy-domain)을 조회합니다.

**언제·어떻게** — 언제든 부릅니다. 스레드: `[control]` — 씬 read 락만 잡는 순수 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |

**반환** — 현재 에너지 배율(기본 1.0). 컨텍스트 NULL이거나 없는 음원이면 `-1.0`.

</details>

<details>
<summary><code>st_rt_source_set_enabled</code> — 음원 전체를 켜고 끈다</summary>

```c
void st_rt_source_set_enabled(STRT_Context* context, STSourceId source, int enabled);
```

**용도** — 음원을 지우지 않고 전파 계산에서 통째로 빼거나 다시 넣는 마스터 스위치입니다. 경로 종류별 게이트(`st_rt_source_set_path_enabled`)보다 위에 있습니다.

**언제·어떻게** — 언제든 부릅니다. 생성 직후는 켜짐입니다. 클립을 트리거(`st_rt_source_trigger`)할 음원은 켜 둔 채로 씁니다. 들려줄 것이 잠시 없는 음원을 상태째 쉬게 하려면 `st_rt_source_idle`을 씁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `enabled` | `0` = 끔, `0` 아님 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_set_ray_count</code> — 음원의 수송 레이 격자 크기를 정한다</summary>

```c
void st_rt_source_set_ray_count(STRT_Context* context, STSourceId source, int width, int height);
```

**용도** — 이 음원이 쏘는 수송(diffuse transport) 레이 격자 N = `width` × `height`를 정합니다. 음원별로 품질과 계산 비용을 맞추는 손잡이입니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 기본 격자는 16 × 8입니다. 레이 수가 늘수록 비용이 늘며, 그 비용을 여러 전파에 나누려면 `st_rt_source_set_transport_refresh_steps`를 함께 씁니다. 값이 0 이하이거나 엔진의 수송 예산(격자·깊이에 따른 상한)을 넘으면 거절되고 `last_status`에 `ST_STATUS_INVALID_ARGUMENT`가 남습니다(사유는 `st_rt_get_last_error`). 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `width` | 격자 가로 레이 수, 1 이상. 기본 16 |
| `height` | 격자 세로 레이 수, 1 이상. 기본 8 |

**반환** — 없음. 성공 여부는 `st_rt_get_last_status`로 확인합니다.

</details>

<details>
<summary><code>st_rt_source_set_depth</code> — 음원별 최대 반사 깊이를 정한다</summary>

```c
void st_rt_source_set_depth(STRT_Context* context, STSourceId source, int depth);
```

**용도** — 이 음원 수송 레이의 최대 반사(바운스) 깊이를 정합니다. `st_rt_source_set_ray_count`와 함께 음원별 품질·비용을 정하는 손잡이입니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 소스별 기본값은 4입니다. 엔진의 수송 예산을 넘거나 허용 범위 밖이면 거절되고 `last_status`에 `ST_STATUS_INVALID_ARGUMENT`가 남습니다(사유는 `st_rt_get_last_error`). 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `depth` | 최대 반사 깊이. 기본 4 |

**반환** — 없음. 성공 여부는 `st_rt_get_last_status`로 확인합니다.

</details>

<details>
<summary><code>st_rt_source_set_transport_refresh_steps</code> — 수송 레이 격자를 몇 번의 전파에 나눠 갱신할지 정한다</summary>

```c
int st_rt_source_set_transport_refresh_steps(STRT_Context* context, STSourceId source, int steps);
```

**용도** — 이 음원의 수송 레이 격자 N(= `width` × `height`)을 **n번의 전파에 걸쳐** 갱신하게 합니다. 한 전파가 교체하는 레이는 ceil(N/n)개이고 전체 비용은 Σ N/n입니다. 엔진은 전역 예산 상한을 두지 않으므로, 음원이 많을 때 비용은 호스트가 n으로 통제합니다. 지원 여부는 `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`로 확인합니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 격자를 나누면 갱신되지 않은 레이의 방향이 전파 사이에 유지돼 잔향 탭이 매끄럽게 이어지고, `steps = 1`은 매 전파 전 격자를 다시 깔아 그 연속성을 끊는 대신 완전히 결정적입니다. IR 재변환은 유발하지 않지만 값이 바뀌면 씬 스냅샷을 다시 발행해 워커에 전달하고, 수송 캐시는 다음 전파에서 다시 만들어집니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `steps` | `0` = 기본(스케줄러와 `isDynamic`이 정함 — `ST_RT_SCHEDULER_PIPELINED`는 동적 8 · 정적 16, `ST_RT_SCHEDULER_SYNCHRONOUS`는 동적 1 · 정적 16) / `1` = 매 전파 전량 재추적(저장소를 만들지 않는 결정적 경로) / `2` 이상 = n번으로 나눠 갱신, 사용 시 `[1, N]`으로 clamp. 음수는 거절 |

**반환** — `1` = 성공 / `0` = 실패. 음수 `steps`는 `ST_STATUS_INVALID_ARGUMENT`, 없는 음원은 `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_rt_source_get_transport_refresh_steps</code> — 수송 갱신 단계 수 저장값을 읽는다</summary>

```c
int st_rt_source_get_transport_refresh_steps(const STRT_Context* context, STSourceId source);
```

**용도** — `st_rt_source_set_transport_refresh_steps`로 저장한 값을 조회합니다.

**언제·어떻게** — 언제든 부릅니다. 돌려주는 값은 **저장값 그대로**(0 포함)이며, 스케줄러 기본과 격자 clamp를 거친 실효 n이 아닙니다. 스레드: `[control]` — 씬 read 락만 잡는 순수 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |

**반환** — 저장된 단계 수(`0` = 기본). 실패 시 `-1`.

</details>

<details>
<summary><code>st_rt_source_set_axis_attenuation</code> — 콘(on/off-axis) 지향 감쇠를 밴드별로 정한다</summary>

```c
void st_rt_source_set_axis_attenuation(STRT_Context* context, STSourceId source, const float onAxis[ST_FREQUENCY_BANDS], const float offAxis[ST_FREQUENCY_BANDS]);
```

**용도** — 음원의 정면(on-axis)과 측후면(off-axis) 방사를 9밴드별로 정하는 간단한 콘 지향성입니다. 측정 지향성 자료가 없을 때 음원의 대략적인 방향성을 줍니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 기본은 무지향(전 밴드 1.0)입니다. 무지향은 `onAxis[] = offAxis[] = 1.0`, 단순 지향은 `onAxis[] = 1.0` / `offAxis[] = 0.0`을 넣습니다(`STSourceDesc::directional`의 두 프로필과 같습니다). 정면 방향은 `st_rt_source_set_direction` / `st_rt_source_set_orientation_q`가 정합니다. 지향성 테이블(`st_rt_source_set_directivity`)이 붙어 있는 동안에는 테이블이 쓰이고, 이 콘 값은 보존됐다가 테이블을 떼면 다시 쓰입니다. 스레드: `[control]`. 스피커 세트 멤버 소스에는 쓸 수 없습니다(무시, `ST_STATUS_INVALID_ARGUMENT`).

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `onAxis` | 정면 방사 감쇠, `ST_FREQUENCY_BANDS`(9)개, 밴드 63 Hz … 16 kHz. NULL이면 아무것도 바꾸지 않습니다 |
| `offAxis` | 측후면 방사 감쇠, 9개. NULL이면 아무것도 바꾸지 않습니다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_set_orientation_q</code> — 음원 로컬 프레임을 쿼터니언으로 정한다</summary>

```c
int st_rt_source_set_orientation_q(STRT_Context* context, STSourceId source, const float quatXYZW[4]);
```

**용도** — 음원 로컬 프레임을 월드에 얹는 회전을 단위 쿼터니언(로컬→월드)으로 정합니다. `st_rt_source_set_direction`과 달리 **roll까지** 표현하므로, 좌우가 비대칭인 지향성 테이블의 프레임을 정확히 정할 때 씁니다. 지원 여부는 `ST_CAP_SOURCE_DIRECTIVITY`로 확인합니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 로컬축은 forward = +Z / up = +Y / right = +X입니다. `st_rt_source_set_direction`과 양방향으로 동기화됩니다 — 이 함수를 부르면 direction = forward(q)로 함께 갱신되고, `st_rt_source_set_direction`을 부르면 orientation이 roll 없는 최소 회전으로 바뀝니다(마지막에 부른 쪽이 이깁니다). 쿼터니언은 엔진이 정규화하므로 대략 정규화된 값을 넣어도 됩니다. 지향성 테이블(`st_rt_source_set_directivity`)과 짝으로 씁니다. 스레드: `[control]`. 스피커 세트 멤버 소스는 `0`(`ST_STATUS_INVALID_ARGUMENT`)입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `quatXYZW` | 로컬→월드 회전 쿼터니언, **X, Y, Z, W 순서**(`st_rt_object_create_q`와 같은 순서) |

**반환** — `1` = 성공 / `0` = 실패. `ST_STATUS_INVALID_ARGUMENT`(비유한 성분 또는 퇴화, norm &lt; 1e-12), `ST_STATUS_NOT_FOUND`(없는 음원).

</details>

<details>
<summary><code>st_rt_source_set_directivity</code> — 음원에 지향성 테이블을 붙이거나 뗀다</summary>

```c
int st_rt_source_set_directivity(STRT_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**용도** — 측정 자료 등에서 얻은 방향별·밴드별 방사 에너지 테이블을 음원에 붙입니다. 콘 공식(`st_rt_source_set_axis_attenuation`)으로 표현할 수 없는 실제 음원의 지향 패턴을 쓸 때 필요합니다. 지원 여부는 `ST_CAP_SOURCE_DIRECTIVITY`로 확인합니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 엔진이 테이블을 **복사**하고 정규화 스칼라도 이 호출에서 한 번 계산하므로, 돌아온 뒤 호스트 버퍼는 해제해도 됩니다. 테이블이 붙어 있는 동안에는 콘 감쇠 대신 테이블이 쓰이고, `table = NULL`로 떼면 보존돼 있던 콘 값으로 돌아갑니다. 테이블 조회 방향은 소스 로컬 프레임 기준이므로 `st_rt_source_set_orientation_q`와 짝으로 씁니다. 스레드: `[control]`. 스피커 세트 멤버 소스는 `0`(`ST_STATUS_INVALID_ARGUMENT`)입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |
| `table` | 지향성 테이블 `STSourceDirectivity`(아래). 호출자가 `structSize` / `apiVersion`을 채웁니다. NULL = 테이블 제거 |

**구조체** `STSourceDirectivity`

소스 로컬 프레임(forward = +Z, up = +Y, right = +X)의 등각 방위각(az) × 고도각(el) 노드 격자 × 9밴드 **에너지** 테이블입니다. 방향 규약은 엔진 전역과 같습니다: az = atan2(x, z)(정면 0°, 오른쪽 +90°), el = asin(y)(위 = +). 노드는 az_i = i × 360/`azCount`(360°에서 wrap), el_j = −90 + j × 180/(`elCount` − 1)이고, 조회는 az wrap · el clamp 쌍선형 보간입니다. `elCount`가 홀수면 수평면(el = 0)이 노드 위에 놓이며, 권장 격자는 5° 간격(`azCount` = 72, `elCount` = 37)입니다.

| 필드 | 설명 |
|---|---|
| `structSize` | 호출자가 `sizeof(STSourceDirectivity)`로 채웁니다 |
| `apiVersion` | 호출자가 `ST_ABI_VERSION`으로 채웁니다 |
| `azCount` | 방위각 노드 수, `[3, 361]` |
| `elCount` | 고도각 노드 수, `[2, 181]` |
| `levelMode` | `STDirectivityLevelMode` — 테이블의 절대 레벨 해석(아래) |
| `reserved0` | 예약 |
| `energy` | 테이블 데이터, `elCount` × `azCount` × `ST_FREQUENCY_BANDS`개 float. 레이아웃은 `[el][az][band]`(band가 가장 빠른 축). **energy-domain**(pressure가 아님), 모든 값이 유한하고 0 이상이어야 합니다 |
| `reserved[6]` | 예약 |

**열거형** `STDirectivityLevelMode` — raw 테이블은 그대로 두고, 엔진이 설정 시 한 번 계산하는 밴드별 정규화 스칼라만 바꿉니다.

| 값 | 설명 |
|---|---|
| `ST_DIRECTIVITY_ABSOLUTE` (0) | 정규화 없음, 값을 그대로 씁니다. 절대 레벨까지 담긴 측정 테이블용 |
| `ST_DIRECTIVITY_POWER_MEAN` (1) | 밴드별 구면 파워 평균이 1이 되도록 정규화(등방사파워). 지향 패턴만 쓰고 총 방사 파워는 `intensity` / `st_rt_source_set_energy`로 따로 잡을 때. **기본 권장** |
| `ST_DIRECTIVITY_ON_AXIS` (2) | 정면(az = 0, el = 0) 값이 1이 되도록 정규화. 게임 툴의 콘 관례와 같은 자리 |

**반환** — `1` = 성공(테이블 제거 성공 포함) / `0` = 실패. `last_status`:
- `ST_STATUS_VERSION_MISMATCH` — `table`의 `structSize` / `apiVersion` 불일치.
- `ST_STATUS_INVALID_ARGUMENT` — `levelMode`가 `STDirectivityLevelMode` 밖, `azCount` · `elCount` 범위 밖, `energy`가 NULL, `energy`에 비유한·음수 원소(사유는 `st_rt_get_last_error`), 스피커 세트 멤버.
- `ST_STATUS_NOT_FOUND` — 없는 음원.

</details>

<details>
<summary><code>st_rt_source_idle</code> — 음원 하나를 쉬게 한다</summary>

```c
int st_rt_source_idle(STRT_Context* context, STSourceId source);
```

**용도** — 엔진 전체 쉼(`st_rt_idle`)과 별개로 음원 하나만 계산·렌더를 멈춥니다. 재생이 끝났지만 곧 다시 쓸 음원을 지우지 않고 비용 없이 붙잡아 둘 때 씁니다. 지원 여부는 `st_rt_get_capability_word(1)`의 `ST_CAP1_ENGINE_IDLE`로 확인합니다.

**언제·어떻게** — 그 음원이 들려줄 것을 멈춘 뒤(stop · pause · 0 쓰기) 부릅니다. 만든 직후 음원은 RUNNING입니다(엔진 전체가 IDLE이어도).
- 부르면 전파 레인(direct · 반사/회절 · 잔향)이 그 음원을 더 계산하지 않고 마지막 결과를 얼립니다. 쉬는 동안 리스너나 음원이 움직여도 그 음원의 전파 경로는 옛 자리 그대로이고, 방(정적·동적 기하)이 바뀌면 한 번 다시 계산해 다시 얼립니다.
- `ST_RT_IDLE_DRAINING` 동안 렌더는 그 음원의 남은 소리(꼬리)를 냅니다. 입력이 계속 소리를 내면 DRAINING으로 계속 렌더합니다.
- 입력이 지연선 길이(max delay) + 1 s 동안 무음이면 `ST_RT_IDLE_IDLE`이 되어, 렌더가 그 음원의 입력을 읽지도 렌더하지도 않고 IR 조립에서도 빠집니다(공유 잔향 탱크의 꼬리는 이어집니다).
- 동시에 쉴 수 있는 음원은 128개까지입니다. 같은 값을 다시 부르면 아무 일도 하지 않습니다.
- 전파를 얼리는 것은 `ST_RT_SCHEDULER_PIPELINED`입니다. `ST_RT_SCHEDULER_SYNCHRONOUS`에서는 `st_rt_propagate`가 쉬는 음원도 계산하고 렌더 쪽 쉼만 같습니다.
- 스피커 세트 멤버는 세트가 쉼을 소유하므로 `st_rt_speaker_set_idle` / `_run`을 씁니다.

스레드: `[control]` — 씬 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 쉬게 할 음원 핸들 |

**반환** — `1` = 성공 / `0` = 실패: 컨텍스트 NULL, 없는 음원(`ST_STATUS_NOT_FOUND`), 스피커 세트 멤버(`ST_STATUS_INVALID_ARGUMENT`), 동시 쉼 표가 가득 참(`ST_STATUS_UNAVAILABLE`, 아무것도 바뀌지 않음).

</details>

<details>
<summary><code>st_rt_source_run</code> — 쉬던 음원을 다시 돌린다</summary>

```c
int st_rt_source_run(STRT_Context* context, STSourceId source);
```

**용도** — `st_rt_source_idle`로 쉬게 한 음원을 다시 계산·렌더하게 합니다. 지원 여부는 `ST_CAP1_ENGINE_IDLE`로 확인합니다.

**언제·어떻게** — 그 음원을 다시 재생하기 직전에 부릅니다. 다음 전파부터 다시 계산하고 다음 블록부터 렌더합니다. 붙잡아 둔 IR로 바로 소리를 내고, 그 음원을 담은 다음 IR(조립 한 주기 뒤)부터 새 결과를 씁니다. 쉬는 동안 읽지 않은 호스트 스트림 프레임은 그 자리부터 이어서 나갑니다. 이미 RUNNING이면 아무 일도 하지 않습니다. 스레드: `[control]` — 씬 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 깨울 음원 핸들 |

**반환** — `1` = 성공 / `0` = 실패: 컨텍스트 NULL, 없는 음원(`ST_STATUS_NOT_FOUND`), 스피커 세트 멤버(`ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_rt_source_get_idle_state</code> — 음원의 쉼 상태를 읽는다</summary>

```c
int st_rt_source_get_idle_state(const STRT_Context* context, STSourceId source);
```

**용도** — 음원 하나의 쉼 상태를 조회합니다. `st_rt_source_idle` 뒤 꼬리가 다 나갔는지 확인할 때 씁니다.

**언제·어떻게** — 언제든 부릅니다. 쉼을 부탁하지 않았으면 RUNNING, 렌더가 남은 소리를 내는 중이면 DRAINING, 다 비웠으면 IDLE입니다. 렌더가 돌지 않거나 엔진 전체가 IDLE이면 쉼을 부탁한 음원은 IDLE입니다. 스레드: `[control]` — 씬 read 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |

**반환** — `STRT_IdleState` 값: `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1) / `ST_RT_IDLE_IDLE`(2). 없는 음원이나 컨텍스트 NULL이면 `-1`.

</details>

<details>
<summary><code>st_rt_source_get_position_seconds</code> — 음원 입력의 재생 위치를 초로 읽는다</summary>

```c
double st_rt_source_get_position_seconds(STRT_Context* context, STSourceId source);
```

**용도** — 음원에 붙인 파일 입력의 현재 재생 위치를 소스 시간(초)으로 조회합니다. 재생 UI의 진행 표시나 `st_rt_source_seek`과 짝을 맞출 때 씁니다. 지원 여부는 `ST_CAP_SOURCE_PLAYBACK_CONTROL`로 확인합니다.

**언제·어떻게** — 오디오 입력을 붙인 뒤 언제든 부릅니다. 값은 소스 시간 기준 초이며 `hostSampleRate`나 피치와 무관합니다. 호스트 스트림 같은 라이브 PCM 입력은 타임라인을 호스트가 소유하므로 위치가 없습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 대상 음원 핸들 |

**반환** — 재생 위치(초). 없는 음원이거나 라이브 입력이면 `-1`.

</details>

</details>

<details>
<summary><strong>음원 — 오디오 입력(파일·클립·스트림), 재생 제어, 소스 EQ</strong> — 27개</summary>

<details>
<summary><code>st_rt_source_clear_audio</code> — 소스에서 오디오 입력(파일·클립·호스트 스트림)을 떼어 냅니다</summary>

```c
int st_rt_source_clear_audio(STRT_Context* context, STSourceId source);
```

**용도** — 소스에 붙은 오디오 입력을 분리합니다. 소스와 렌더 슬롯은 그대로 남고 그 소스만 무음이 됩니다. 파일 입력(`st_rt_source_set_audio_file` 계열)과 호스트 스트림(`st_rt_source_attach_stream`) 모두 "오디오 입력"이므로 둘 다 이 함수로 뗍니다.

**언제·어떻게** — 소스를 지우지 않고 소리만 끊거나, 다른 입력으로 바꾸기 전에 비워 둘 때 씁니다. 분리는 3 ms 램프로 내려갑니다. 스트림을 분리한 뒤의 `st_rt_source_write_stream`은 아무것도 쓰지 않고 `0`을 돌려줍니다. 같은 소스에 `st_rt_source_write_stream`과 동시에 부르지 마십시오. 소스를 지우는 `st_rt_source_destroy`도 입력을 함께 분리하므로 그 전에 이 함수를 부를 필요는 없습니다. 스피커 세트 멤버 소스에는 거절됩니다(`ST_STATUS_INVALID_ARGUMENT`). 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id(`STSourceId`, `st_rt_source_create`가 돌려준 값) |

**반환** — `1` = 분리함 / `0` = 실패(컨텍스트 NULL, 없는 소스, 스피커 세트 멤버 등).

</details>

<details>
<summary><code>st_rt_source_set_eq</code> — 소스 원음에 9밴드 그래픽 EQ를 겁니다</summary>

```c
int st_rt_source_set_eq(STRT_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**용도** — 소스 신호에 밴드별 게인을 걸어 음색을 보정합니다. 필터는 크로스오버 앞, 즉 소스 신호 자체에 걸리므로 그 소스의 직접·투과·반사·회절·잔향 송출이 모두 같은 필터를 거칩니다(실제 스피커 신호 체인에 EQ를 단 것과 같습니다). 출력단 EQ(`st_rt_render_set_eq`)와 같은 필터 설계이고 오프라인 `st_off_source_set_eq`와 같은 구현입니다.

**언제·어떻게** — 소스를 만든 뒤 언제든, 재생 중에도 부를 수 있습니다. IR을 무효화하지 않고 렌더 스레드에 할당 없는 명령으로 전달됩니다. 재생 중에 바꾸면 필터 상태를 유지한 채 계수만 즉시 바뀝니다(매끄러운 램프는 하지 않습니다 — 클릭 없는 전환이 필요하면 `st_rt_source_set_parametric_eq`를 쓰십시오). 이 함수와 `st_rt_source_set_parametric_eq`는 **같은 소스 EQ**를 바꾸며 마지막에 부른 쪽이 이깁니다. `gainsDb = NULL`을 넘기면 EQ를 끄고 지웁니다(파라메트릭으로 건 설정도 이것으로 지웁니다). 설정은 소스를 지울 때까지 유지됩니다. 스피커 세트 멤버 소스에도 걸 수 있습니다. 지원 여부는 `ST_CAP_SOURCE_EQ`(`st_rt_get_capability_word(0)`)로 확인합니다. 스레드: `[control]` — 씬 read 락과 렌더 제어 락을 잠깐 잡으므로 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `gainsDb` | `ST_FREQUENCY_BANDS`(9)개 게인(dB), 밴드 순서 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz. 각 값은 유한하고 `[-ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`(±24 dB) 안이어야 합니다 — 밖이면 클램프하지 않고 거절합니다. `NULL` 또는 전 밴드 0 dB면 EQ를 끕니다(EQ가 없는 결과와 비트 동일) |

**필터 정의** — 밴드마다 RBJ peaking biquad 하나(Q = 1.414, 약 1옥타브)를 밴드 오름차순으로 직렬 연결합니다. 표본률은 엔진 내부 44100 Hz 고정이며 호스트 표본률(`hostSampleRate`)과 무관합니다. `|g| ≤ 1e-4 dB`인 밴드는 건너뜁니다. 이웃 밴드의 응답이 겹치므로(피킹 필터 스커트) 밴드 중심에서 정확히 지정 게인이 되게 하려면 호스트가 게인을 보정해 넣어야 합니다.

**반환** — `1` = 성공 / `0` = 실패. 실패 시 `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`(비유한 값 또는 `|g| > 24`, 아무것도 바꾸지 않음) / `ST_STATUS_NOT_FOUND`(소스 없음) / `ST_STATUS_UNAVAILABLE`(이 컨텍스트의 백엔드가 소스 EQ를 지원하지 않음).

</details>

<details>
<summary><code>st_rt_source_get_eq</code> — 소스 EQ를 9밴드 게인으로 읽습니다</summary>

```c
int st_rt_source_get_eq(STRT_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**용도** — 현재 소스 EQ를 9밴드 그래픽 뷰로 돌려줍니다. 소스 EQ는 하나이고 이 함수는 그 밴드 목록을 9밴드 게인으로 보여 주는 호환 뷰입니다.

**언제·어떻게** — EQ가 없거나 꺼져 있으면 전부 0을 씁니다. 9밴드 모양(canonical 중심 주파수·Q 1.414 `ST_PARAMETRIC_EQ_PEAKING` 9개·프리앰프 0·켜짐)이면 그 게인을 씁니다. 그 밖의 파라메트릭 설정이면 9밴드로 표현할 수 없으므로 `0` + `ST_STATUS_UNAVAILABLE`을 돌려주고 `outGainsDb`는 건드리지 않습니다. `UNAVAILABLE`의 뜻을 가르려면 `st_rt_source_get_parametric_eq`를 부르십시오 — 성공하면 "파라메트릭 설정이라 9밴드로 못 읽음"이고(설정은 그쪽으로 읽습니다), 같은 `UNAVAILABLE`로 실패하면 백엔드가 소스 EQ를 지원하지 않는 것입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `outGainsDb` | 호출자 소유 `float[ST_FREQUENCY_BANDS]` 출력 버퍼(63…16k Hz 순서, dB). `NULL`이면 거절 |

**반환** — `1` = 성공 / `0` = 실패. 실패 시 `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`(`outGainsDb`가 NULL) / `ST_STATUS_NOT_FOUND`(소스 없음) / `ST_STATUS_UNAVAILABLE`(위 두 경우).

</details>

<details>
<summary><code>st_rt_source_set_parametric_eq</code> — 소스 원음에 최대 16밴드 파라메트릭 EQ를 겁니다</summary>

```c
int st_rt_source_set_parametric_eq(STRT_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**용도** — 소스 신호에 밴드 종류·주파수·게인·Q를 직접 정한 파라메트릭 EQ를 겁니다. 거는 자리는 `st_rt_source_set_eq`와 같고(크로스오버 앞, 그 소스의 모든 경로) **같은 EQ**입니다. 가상 스피커처럼 소스마다 다른 주파수 보정이 필요할 때 씁니다.

**언제·어떻게** — 소스를 만든 뒤 언제든, 재생 중에도 부를 수 있습니다. IR을 무효화하지 않고 렌더 스레드에 할당 없는 명령으로 전달됩니다. 값이 바뀌면 옛 설정과 새 설정을 20 ms 동안 나란히 돌려 출력을 크로스페이드하므로 클릭이 나지 않습니다. 그 사이 또 바뀌면 가장 최근 값 하나만 기다렸다가 이어서 넘어갑니다. 이 함수와 `st_rt_source_set_eq`는 모두 소스 EQ의 목록 전체를 바꾸며 마지막 setter가 이깁니다. 꺼진 목록·효과 없는 목록도 저장되어 getter가 그대로 돌려줍니다 — 끄고 지우려면 `st_rt_source_set_eq(context, source, NULL)`을 부릅니다. 스피커 세트 멤버 소스(`st_rt_speaker_set_get_source`로 받은 id)에도 그대로 걸 수 있어 가상 스피커마다 다른 보정을 줄 수 있습니다. AutoEq `ParametricEQ.txt`는 `st_rt_render_parse_autoeq_parametric`로 읽어 결과를 그대로 넘길 수 있습니다. 설정은 소스를 지울 때까지 유지됩니다. 지원 여부는 `ST_CAP1_SOURCE_PARAMETRIC_EQ`(`st_rt_get_capability_word(1)`)로 확인합니다. 스레드: `[control]` — 씬 read 락과 렌더 제어 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `bands` | `STParametricEqBand` 배열(`bandCount`개). `bandCount = 0`이면 `NULL`이어도 됩니다 |
| `bandCount` | 밴드 수, `[0, ST_PARAMETRIC_EQ_MAX_BANDS]`(0~16). 범위 밖은 거절 |
| `preampDb` | 밴드 앞에 거는 선형 게인(dB), `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[-48, +12]`. 주 용도는 클리핑 방지용 음수 값입니다 |
| `enabled` | `0` = 목록은 저장하되 통과(EQ 없음과 같음) / 그 밖 = 켬 |

**구조체** `STParametricEqBand` (32바이트, 배열 원소라 버전 스탬프 없음)

| 필드 | 설명 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5). 알 수 없는 값은 거절 |
| `enabled` | `0` = 이 밴드 건너뜀(항등) / 그 밖 = 켬 |
| `frequencyHz` | PEAKING·NOTCH는 중심, 셸프는 중점, LP·HP는 코너 주파수. `[ST_PARAMETRIC_EQ_MIN_FREQUENCY_HZ, min(ST_PARAMETRIC_EQ_MAX_FREQUENCY_HZ, 0.49·Fs)]` = 20 Hz ~ 20 kHz(Fs = 44100) |
| `gainDb` | PEAKING·LOW_SHELF·HIGH_SHELF만 씁니다(LP·HP·NOTCH는 값만 저장). `[-ST_PARAMETRIC_EQ_MAX_GAIN_DB, +ST_PARAMETRIC_EQ_MAX_GAIN_DB]` = ±24 dB |
| `q` | `[ST_PARAMETRIC_EQ_MIN_Q, ST_PARAMETRIC_EQ_MAX_Q]` = 0.1 ~ 30. LOW_SHELF·HIGH_SHELF는 `[0.1, ST_PARAMETRIC_EQ_MAX_SHELF_Q]` = 0.1 ~ 3 — 큰 게인의 셸프에 큰 Q를 주면 모서리에 큰 공진 피크가 생기고, 소스 EQ는 리미터 앞이라 막을 것이 없습니다 |
| `reserved[3]` | 반드시 0(아니면 거절) |

**필터 정의** — 밴드마다 RBJ Audio EQ Cookbook 2차 섹션 하나이고, 체인은 프리앰프 → 밴드 0…`bandCount-1` 직렬입니다. 표본률은 엔진 내부 44100 Hz입니다. `enabled = 0`인 밴드와 `|gainDb| ≤ 1e-4`인 PEAKING·셸프 밴드는 정확히 항등입니다. 전체가 꺼져 있거나 효과가 없으면(전 밴드 항등 + 프리앰프 0 dB) 전환 램프가 끝난 뒤부터 EQ가 없는 결과와 비트 동일합니다.

**값 검증** — 비유한 값·알 수 없는 `type`·`reserved ≠ 0`·`bandCount` 범위 밖·(`bandCount > 0`인데) `bands` NULL은 거절하고 아무것도 바꾸지 않습니다. 유한한 값이 범위를 벗어나면 **클램프**하고, getter는 클램프된 실효값을 돌려줍니다(9밴드 `st_rt_source_set_eq`는 클램프하지 않고 거절하는 것과 다릅니다).

**반환** — `1` = 성공 / `0` = 실패. 실패 시 `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`(위 검증) / `ST_STATUS_NOT_FOUND`(소스 없음) / `ST_STATUS_UNAVAILABLE`(이 컨텍스트의 백엔드가 소스 EQ를 지원하지 않음).

</details>

<details>
<summary><code>st_rt_source_get_parametric_eq</code> — 소스 EQ의 밴드 목록·프리앰프·켜짐을 읽습니다</summary>

```c
int st_rt_source_get_parametric_eq(STRT_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**용도** — 소스 EQ의 현재 설정을 클램프된 실효값으로 돌려줍니다. `st_rt_source_set_eq`(9밴드)로 건 설정도 9개 `ST_PARAMETRIC_EQ_PEAKING` 밴드로 읽힙니다. EQ가 없으면 0밴드·꺼짐입니다.

**언제·어떻게** — 출력 규약은 `st_rt_render_get_parametric_eq`와 같습니다. `outBands = NULL`이면 크기 질의로 동작해 밴드는 쓰지 않고 개수·프리앰프·켜짐만 채운 뒤 `1`을 돌려줍니다. `bandCapacity`를 `ST_PARAMETRIC_EQ_MAX_BANDS`(16)로 주면 늘 들어갑니다. 반환된 밴드의 `reserved`는 0으로 채워집니다. 스레드: `[control]` — 씬 read 락과 렌더 제어 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `outBands` | 호출자 소유 `STParametricEqBand` 배열. `NULL`이면 크기 질의. 필드는 `st_rt_source_set_parametric_eq` 항목 참고 |
| `bandCapacity` | `outBands` 원소 수. 음수면 거절. 밴드 수보다 작으면 `0` + `ST_STATUS_BUFFER_TOO_SMALL`(개수·프리앰프·켜짐은 씀) |
| `outBandCount` | 밴드 수를 받을 포인터. `NULL`이면 건너뜀 |
| `outPreampDb` | 프리앰프(dB)를 받을 포인터. `NULL`이면 건너뜀 |
| `outEnabled` | 켜짐(`0`/`1`)을 받을 포인터. `NULL`이면 건너뜀 |

**반환** — `1` = 성공 / `0` = 실패. 실패 시 `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`(`bandCapacity < 0`) / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_NOT_FOUND`(소스 없음) / `ST_STATUS_UNAVAILABLE`(이 컨텍스트의 백엔드가 소스 EQ를 지원하지 않음).

</details>

<details>
<summary><code>st_rt_source_set_path_volume</code> — 소스의 경로 종류별 볼륨을 정합니다</summary>

```c
int st_rt_source_set_path_volume(STRT_Context* context, STSourceId source, int volumeKind, float volume);
```

**용도** — 한 소스의 직접음·반사·회절·잔향 기여를 따로 키우거나 줄입니다. 값은 선형 압력 배율입니다. 직접음 볼륨은 투과 경로도 포함하고, 잔향 볼륨은 리스너가 공유하는 후기 잔향에 **이 소스가 보내는 양**만 조절합니다.

**언제·어떻게** — 소스를 만든 뒤 언제든 부릅니다. 생성 직후 4종 모두 `1.0`입니다. 경로를 완전히 빼려면 `st_rt_source_set_path_enabled`를, 소스 전체 레벨은 `st_rt_source_set_volume`을 씁니다. 스피커 세트 멤버 소스에도 걸 수 있습니다. 지원 여부는 `ST_CAP_SOURCE_PATH_VOLUME`으로 확인합니다. 스레드: `[control]` — 씬 read 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`(0, 투과 포함) / `ST_SOURCE_VOLUME_REFLECTION`(1) / `ST_SOURCE_VOLUME_DIFFRACTION`(2) / `ST_SOURCE_VOLUME_REVERB`(3, 공유 후기 잔향으로의 송출). 그 밖은 거절 |
| `volume` | 선형 압력 배율, 유한한 `0` 이상. 기본 `1.0` |

**반환** — `1` = 적용 / `0` = 실패(알 수 없는 `volumeKind`, 비유한·음수 `volume`, 없는 소스).

</details>

<details>
<summary><code>st_rt_source_get_path_volume</code> — 소스의 경로 종류별 볼륨을 읽습니다</summary>

```c
float st_rt_source_get_path_volume(STRT_Context* context, STSourceId source, int volumeKind);
```

**용도** — `st_rt_source_set_path_volume`으로 정한 경로 종류별 선형 볼륨을 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]` — 씬 read 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `volumeKind` | `STSourceVolumeKind` — `DIRECT`(0) / `REFLECTION`(1) / `DIFFRACTION`(2) / `REVERB`(3) |

**반환** — 선형 볼륨(기본 `1.0`). 알 수 없는 `volumeKind`나 컨텍스트 NULL이면 `-1`.

</details>

<details>
<summary><code>st_rt_source_set_audio_file</code> — 오디오 파일을 열어 소스의 입력으로 붙입니다</summary>

```c
int st_rt_source_set_audio_file(STRT_Context* context, STSourceId source, const char* audioPath, int loop);
```

**용도** — 엔진이 파일을 직접 열고 디코드해 소스 입력으로 씁니다. 호스트가 PCM을 다루지 않아도 되는 가장 간단한 입력 방식입니다.

**언제·어떻게** — 소스를 만든 뒤 부르고, 붙인 직후는 정지 상태라 `st_rt_source_play`부터 소리가 납니다. 채널은 모노로 섞이고(스테레오 = 1/√2·L + 1/√2·R) 엔진 레이트 44.1 kHz로 변환됩니다. 같은 소스에 호스트 스트림이 붙어 있으면 파일 입력이 스트림을 밀어냅니다(이후 `st_rt_source_write_stream`은 `0`). 반복 횟수는 나중에 `st_rt_source_set_loop_count`로 바꿀 수 있습니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control, blocking]` — 파일 열기와 디코더 생성을 하므로 게임 루프·오디오 스레드에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `audioPath` | 파일 경로, **UTF-8**(Windows에서도 — 한글 경로 가능). 지원: WAV(PCM·float·ADPCM·µ-law·A-law, RF64·W64), FLAC, MP3, Ogg Vorbis. Ogg Opus·AAC/M4A·ALAC·WMA는 열지 못해 실패합니다 |
| `loop` | `0` = 한 번 재생 / 그 밖 = 무한 반복 |

**반환** — `1` = 입력을 붙임 / `0` = 실패(경로 NULL, 열 수 없는 파일·지원하지 않는 포맷, 없는 소스, 스피커 세트 멤버 등).

</details>

<details>
<summary><code>st_rt_source_set_audio_asset</code> — 호스트 에셋 시스템의 인코딩 파일을 스트리밍 입력으로 붙입니다</summary>

```c
int st_rt_source_set_audio_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io, int repeatCount);
```

**용도** — 게임 엔진의 팩 파일·가상 파일 시스템처럼 OS 경로로 열 수 없는 오디오를 호스트 콜백으로 읽게 합니다. `st_rt_source_set_audio_file`과 같은 디코더(WAV/FLAC/MP3/Vorbis)를 쓰며, 파일 전체를 미리 읽지 않고 탐색 가능한 스트림으로 디코드합니다.

**언제·어떻게** — 재생 규약은 `st_rt_source_set_audio_file`과 같습니다(붙인 직후 정지, `st_rt_source_play`로 시작). 콜백 표는 복사되지만, `userData`와 호스트 에셋 시스템은 입력이 붙어 있는 동안 살아 있어야 합니다. `open`/`close`는 제어 스레드에서, `read`/`seek`은 이 호출 중의 탐색 과정과 단일 디코더 워커 스레드에서 불립니다. 콜백은 예외를 던지거나 엔진 API를 다시 부르면 안 됩니다. `close`는 성공한 `open`마다 한 번 불립니다(디코더 초기화 실패 포함). 서로 다른 컨텍스트는 동시에 디코드할 수 있습니다. 붙이기에 실패하면 이전 입력이 유지됩니다. 지원 여부는 `ST_CAP_AUDIO_ASSET_IO`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control, blocking]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `assetName` | `io->open`에 그대로 넘길 에셋 이름 |
| `io` | `STAudioAssetIO` 콜백 표. 호출자가 `structSize = sizeof(STAudioAssetIO)`, `apiVersion = ST_ABI_VERSION`을 채우고 `reserved`는 0 |
| `repeatCount` | 추가 반복 횟수 — `0` = 한 번 / `-1` = 무한 / 양수 N = N번 더 |

**구조체** `STAudioAssetIO`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STAudioAssetIO)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `userData` | 모든 콜백의 첫 인자로 전달되는 호스트 포인터 |
| `open` | `void* open(void* userData, const char* assetName)` — 에셋을 열고 핸들을 돌려줍니다 |
| `read` | `uint64_t read(void* userData, void* handle, void* output, uint64_t bytes)` — 읽은 바이트 수를 돌려줍니다(`0` = EOF, 요청보다 크면 안 됨) |
| `seek` | `int seek(void* userData, void* handle, int64_t offset, int origin)` — `origin` `0` = 처음 기준 / `1` = 현재 위치 기준. `1` = 성공 / `0` = 오류 |
| `close` | `void close(void* userData, void* handle)` — 핸들을 닫습니다 |
| `reserved[2]` | 0 |

**반환** — `1` = 입력을 붙임 / `0` = 실패(이전 입력 유지).

</details>

<details>
<summary><code>st_rt_source_set_audio_clip</code> — 짧은 파일을 통째로 디코드해 캐시 클립으로 붙입니다</summary>

```c
int st_rt_source_set_audio_clip(STRT_Context* context, STSourceId source, const char* audioPath);
```

**용도** — 짧은 소리를 한 번만 44.1 kHz 모노 PCM으로 전부 디코드해 소스에 캐시합니다. 같은 소리를 반복해서 낼 때 소스를 새로 만들거나 다시 디코드하지 않고, 살아 있는 소스에서 `st_rt_source_trigger`(한 번씩) 또는 `st_rt_source_set_retrigger_interval`(일정 간격)로 다시 시작하기 위한 입력입니다.

**언제·어떻게** — 포맷·다운믹스는 `st_rt_source_set_audio_file`과 같고, 디코드된 길이는 최대 60초입니다. 붙이기에 실패하면 이전 입력이 유지됩니다. 성공하면 클립은 일시정지 상태로 시작하고 재시작 간격 `0`, EOF 반복 횟수 `0`이 되며, 소스의 볼륨·피치는 그대로 유지됩니다. 지원 여부는 `ST_CAP_SOURCE_RETRIGGER`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control, blocking]` — 파일 전체를 디코드하므로 게임 루프·오디오 스레드에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `audioPath` | 파일 경로(UTF-8). 지원 포맷은 `st_rt_source_set_audio_file` 항목 참고 |

**반환** — `1` = 클립을 붙임 / `0` = 실패(이전 입력 유지).

</details>

<details>
<summary><code>st_rt_source_set_audio_clip_asset</code> — 호스트 에셋을 통째로 디코드해 캐시 클립으로 붙입니다</summary>

```c
int st_rt_source_set_audio_clip_asset(STRT_Context* context, STSourceId source, const char* assetName, const STAudioAssetIO* io);
```

**용도** — `st_rt_source_set_audio_clip`의 에셋 버전입니다. 호스트 콜백(`STAudioAssetIO`)으로 읽은 인코딩 데이터를 44.1 kHz 모노 PCM으로 전부 디코드해 캐시합니다.

**언제·어떻게** — 동작·제약(최대 60초, 일시정지로 시작, 간격 `0`·EOF 반복 `0`, 볼륨·피치 유지, 실패 시 이전 입력 유지)은 `st_rt_source_set_audio_clip`과 같습니다. 캐시 클립이므로 콜백은 이 호출 안에서 모두 불리고 닫힙니다 — `userData`는 이 함수가 반환할 때까지만 유효하면 됩니다. 지원 여부는 `ST_CAP_SOURCE_RETRIGGER`와 `ST_CAP_AUDIO_ASSET_IO`로 확인합니다. 스레드: `[control, blocking]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `assetName` | `io->open`에 넘길 에셋 이름 |
| `io` | `STAudioAssetIO` 콜백 표(호출자가 `structSize`/`apiVersion`을 채움). 필드는 `st_rt_source_set_audio_asset` 항목 참고 |

**반환** — `1` = 클립을 붙임 / `0` = 실패(이전 입력 유지).

</details>

<details>
<summary><code>st_rt_source_set_retrigger_interval</code> — 캐시 클립을 일정 간격으로 다시 시작하게 합니다</summary>

```c
int st_rt_source_set_retrigger_interval(STRT_Context* context, STSourceId source, double seconds);
```

**용도** — 같은 캐시 클립을 시작-시작 간격 `seconds`마다 출력 시각 기준으로 다시 시작합니다. 제어 스레드의 호출 타이밍에 흔들리지 않는 규칙적인 반복음이 필요할 때 씁니다. 재시작해도 음향 경로·지연·잔향 상태는 유지됩니다.

**언제·어떻게** — `st_rt_source_set_audio_clip`/`_clip_asset`으로 붙인 캐시 클립에만 쓸 수 있습니다. 간격은 가장 가까운 44.1 kHz 출력 표본으로 반올림되며 피치는 간격을 바꾸지 않습니다. 변경은 다음 입력 읽기 경계에서 적용되고 새 간격 하나를 온전히 시작합니다. EOF 뒤에 켜면 클립이 다시 시작됩니다. 같은 (양자화된) 간격을 다시 걸면 진행 중인 클럭은 그대로입니다. `0`을 주면 이후 재시작을 취소하고 지금 울리는 샷은 끝까지 냅니다. `st_rt_source_play`가 시작·재개, `st_rt_source_pause`가 클럭을 멈추고, `st_rt_source_stop`은 일시정지·되감기를 하되 간격 설정은 유지합니다. EOF 반복(`st_rt_source_set_loop_count`)과 양수 간격은 함께 쓸 수 없습니다. 재시작 시 커서 리셋은 3 ms 전환으로 이어지고, 끝나지 않은 이전 샷은 섞이지 않고 교체됩니다. 지원 여부는 `ST_CAP_SOURCE_RETRIGGER`로 확인합니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id(캐시 클립이 붙은 소스) |
| `seconds` | 시작-시작 간격(초). 양수 범위는 출력 1표본 ~ 3600 s. `0` = 끔(기본) |

**반환** — `1` = 성공 / `0` = 실패(잘못된 값, 없는 소스, 캐시 클립이 아닌 입력 등).

</details>

<details>
<summary><code>st_rt_source_get_retrigger_interval</code> — 캐시 클립의 재시작 간격을 읽습니다</summary>

```c
double st_rt_source_get_retrigger_interval(STRT_Context* context, STSourceId source);
```

**용도** — `st_rt_source_set_retrigger_interval`로 건 간격을 양자화된 실효값(초)으로 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 양자화된 간격(초). `0` = 꺼짐 / `-1` = 소스 없음 또는 캐시 클립이 아님.

</details>

<details>
<summary><code>st_rt_source_trigger</code> — 캐시 클립을 한 번 처음부터 울리도록 요청합니다</summary>

```c
int st_rt_source_trigger(STRT_Context* context, STSourceId source);
```

**용도** — 살아 있는 소스의 캐시 클립을 외부 이벤트 한 번에 맞춰 처음부터 다시 시작합니다. 디코드도 소스 생성도 하지 않으므로 짧은 소리를 자주 낼 때 소스를 새로 만드는 대신 씁니다. 재시작해도 음향 지연·반사·잔향 이력은 그대로 이어집니다.

**언제·어떻게** — 캐시 클립이 붙어 있고 재시작 간격 `0`, EOF 반복 횟수 `0`이어야 합니다. 별도의 `st_rt_source_play`는 필요 없습니다. 요청은 컨텍스트의 초기 음장이 소비된 뒤 다음 엔진 블록에서 시작되며, 그 전에 여러 번 요청하면 한 번으로 합쳐집니다. `st_rt_source_pause`/`st_rt_source_stop`, 성공한 `st_rt_source_seek`, 간격·반복 설정 변경은 대기 중인 요청을 취소합니다. 렌더되도록 소스를 켜 둔 상태(`st_rt_source_set_enabled`)로 유지하십시오. 커서는 입력 읽기 경계에서 3 ms 전환으로 리셋되고 끝나지 않은 이전 샷은 교체됩니다. `1`은 큐에 들어갔다는 뜻이지 장치에서 이미 재생됐다는 뜻이 아닙니다. 지원 여부는 `ST_CAP_SOURCE_TRIGGER`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id(캐시 클립이 붙은 소스) |

**반환** — `1` = 큐에 넣음 / `0` = 거절(캐시 클립이 아님, 간격·반복이 0이 아님, 없는 소스 등).

</details>

<details>
<summary><code>st_rt_source_seek</code> — 파일 입력의 재생 위치를 옮깁니다</summary>

```c
int st_rt_source_seek(STRT_Context* context, STSourceId source, double seconds);
```

**용도** — 파일·에셋·클립 입력의 재생 커서를 소스 시간 기준 `seconds`로 옮깁니다.

**언제·어떻게** — 위치는 원본 파일 프레임 단위로 내림되며, 재생/일시정지 상태는 유지됩니다. 디코더·피치 선읽기를 버리고 설정된 반복 횟수를 새로 채웁니다. 압축 포맷의 탐색 정확도는 코덱에 따라 제한됩니다. 호스트 스트림(라이브 PCM)은 호스트가 타임라인을 소유하므로 거절됩니다. 현재 위치는 `st_rt_source_get_position_seconds`로 읽습니다(초 단위, `hostSampleRate`·피치와 무관). 성공한 탐색은 대기 중인 `st_rt_source_trigger` 요청을 취소합니다. 지원 여부는 `ST_CAP_SOURCE_PLAYBACK_CONTROL`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control, blocking]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `seconds` | 소스 시간 위치(초). 유한한 `0` 이상 |

**반환** — `1` = 성공 / `0` = 실패(잘못된 값, 없는 소스, 파일 입력이 아님 등).

</details>

<details>
<summary><code>st_rt_source_set_loop_count</code> — 파일 입력의 반복 횟수를 정합니다</summary>

```c
int st_rt_source_set_loop_count(STRT_Context* context, STSourceId source, int repeatCount);
```

**용도** — 파일·에셋·클립 입력이 끝에 닿았을 때 처음으로 돌아가 몇 번 더 재생할지 정합니다.

**언제·어떻게** — 현재 커서 위치에서 반복 예산을 새로 채웁니다. `st_rt_source_stop`은 되감으면서 이 예산을 복원합니다. 호스트 스트림(라이브 PCM)은 거절됩니다. 캐시 클립에서는 양수 재시작 간격(`st_rt_source_set_retrigger_interval`)과 함께 쓸 수 없고, 반복 설정을 바꾸면 대기 중인 `st_rt_source_trigger` 요청이 취소됩니다(트리거는 반복 횟수 `0`을 요구합니다). 지원 여부는 `ST_CAP_SOURCE_PLAYBACK_CONTROL`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control, blocking]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `repeatCount` | 추가 반복 횟수 — `0` = 한 번 / `-1` = 무한 / 양수 N = N번 더. `-1` 미만은 거절 |

**반환** — `1` = 성공 / `0` = 실패(잘못된 값, 없는 소스, 파일 입력이 아님 등).

</details>

<details>
<summary><code>st_rt_source_get_loop_count</code> — 파일 입력의 반복 횟수를 읽습니다</summary>

```c
int st_rt_source_get_loop_count(STRT_Context* context, STSourceId source);
```

**용도** — 설정된 추가 반복 횟수를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 반복 횟수(`0` 이상). `-1` = 무한 / `-2` = 소스 없음 또는 지원하지 않는 입력.

</details>

<details>
<summary><code>st_rt_source_set_volume</code> — 소스 입력의 볼륨을 정합니다</summary>

```c
int st_rt_source_set_volume(STRT_Context* context, STSourceId source, float volume);
```

**용도** — 소스 입력 신호에 선형 압력 게인을 겁니다. 음향 경로·DSP 처리 **앞**에 걸리므로 그 소스의 모든 경로(직접·반사·회절·잔향 송출)가 함께 바뀝니다.

**언제·어떻게** — 오디오 입력이 붙은 소스에 언제든, 재생 중에도 부를 수 있습니다. 바뀐 값은 3 ms 램프로 넘어갑니다. 경로 종류별 비율은 `st_rt_source_set_path_volume`으로 따로 정합니다. 지원 여부는 `ST_CAP_SOURCE_PLAYBACK_CONTROL`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다(멤버 레벨은 스피커 세트 API가 정합니다). 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `volume` | 선형 압력 게인, `[0, 16]`, 기본 `1`. 범위 밖·비유한 값은 거절 |

**반환** — `1` = 성공 / `0` = 실패(범위 밖 값, 없는 소스 또는 오디오 입력 없음 등).

</details>

<details>
<summary><code>st_rt_source_get_volume</code> — 소스 입력의 볼륨을 읽습니다</summary>

```c
float st_rt_source_get_volume(STRT_Context* context, STSourceId source);
```

**용도** — `st_rt_source_set_volume`으로 정한 선형 볼륨을 돌려줍니다. 램프 중이면 램프의 목표값입니다.

**언제·어떻게** — 언제든 부를 수 있고, 스피커 세트 멤버 소스에도 쓸 수 있습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 선형 볼륨(기본 `1`). `-1` = 소스 없음.

</details>

<details>
<summary><code>st_rt_source_set_pitch</code> — 소스 입력의 재생 속도(피치)를 정합니다</summary>

```c
int st_rt_source_set_pitch(STRT_Context* context, STSourceId source, float ratio);
```

**용도** — 입력을 재생 속도 비율로 빠르게/느리게 읽어 피치를 바꿉니다. 시간 늘이기는 하지 않으므로 파일의 재생 길이나 호스트 스트림 링의 소비 속도가 함께 바뀝니다.

**언제·어떻게** — 오디오 입력이 붙은 소스에 언제든 부를 수 있습니다. 호스트가 이미 자체적으로 피치를 바꾼 신호를 넣는다면 이중으로 걸리지 않게 하십시오. 1이 아닌 비율은 대역 제한 sinc 보간을 쓰며 최대 67프레임의 선읽기가 생깁니다. 캐시 클립의 재시작 간격은 피치의 영향을 받지 않습니다. 지원 여부는 `ST_CAP_SOURCE_PLAYBACK_CONTROL`로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control]` — 필터 계수를 만들므로 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `ratio` | 재생 속도 비율, `[0.25, 4]`, 기본 `1`. 범위 밖·비유한 값은 거절 |

**반환** — `1` = 성공 / `0` = 실패(범위 밖 값, 없는 소스 또는 오디오 입력 없음 등).

</details>

<details>
<summary><code>st_rt_source_get_pitch</code> — 소스 입력의 재생 속도 비율을 읽습니다</summary>

```c
float st_rt_source_get_pitch(STRT_Context* context, STSourceId source);
```

**용도** — `st_rt_source_set_pitch`로 정한 재생 속도 비율을 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 재생 속도 비율(기본 `1`). `-1` = 소스 없음.

</details>

<details>
<summary><code>st_rt_source_attach_stream</code> — 호스트가 PCM을 밀어 넣는 스트림 입력을 소스에 붙입니다</summary>

```c
int st_rt_source_attach_stream(STRT_Context* context, STSourceId source, const STStreamDesc* desc);
```

**용도** — 음성 채팅·합성음·외부 미들웨어 출력처럼 호스트가 실시간으로 만드는 모노 PCM을 소스 입력으로 씁니다. 파일 입력이 "엔진이 파일을 연다"라면 이쪽은 "호스트가 PCM을 민다"입니다. 렌더 주도권과 오디오 장치는 그대로 엔진이 쥐며, 엔진 렌더 스레드가 512프레임 블록을 당길 때 소스별 링버퍼에서 읽어 갑니다(호스트 푸시 렌더가 아닙니다).

**언제·어떻게** — 소스를 만든 뒤 부르고, 이어서 `st_rt_source_write_stream`으로 PCM을 공급합니다. 수명·재생 규약은 파일 입력과 같습니다: 붙인 직후는 정지 상태이고 `st_rt_source_play`부터 소리가 나며, `st_rt_source_pause`/`st_rt_source_stop`도 그대로 먹습니다(`stop`은 링에 쌓인 프레임을 버립니다 — 라이브 스트림에 "처음으로 되감기"는 없습니다). 분리는 `st_rt_source_clear_audio`가 하고, `st_rt_source_destroy`도 스트림을 분리해 슬롯을 반납합니다. 같은 소스에 파일 입력을 붙이면 파일이 스트림을 밀어내고, 반대로 이 함수는 파일 입력을 밀어냅니다. 동시에 붙어 있을 수 있는 스트림은 64개이며, 반납된 슬롯은 다음 attach가 재사용합니다(누적 카운터는 attach마다 0에서 다시 셉니다). 링 할당은 이 호출에서 한 번만 일어납니다. 스트림에서는 `st_rt_source_seek`·`st_rt_source_set_loop_count`가 거절됩니다. 지원 여부는 `ST_CAP_SOURCE_STREAM_INPUT`(실시간 전용)으로 확인합니다. 스피커 세트 멤버 소스에는 거절됩니다. 스레드: `[control]` — 씬 read 락과 재생 뮤텍스를 잡습니다. 같은 소스에 대해 `st_rt_source_write_stream`과 동시에 부르지 마십시오(다른 소스끼리는 무관).

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |
| `desc` | `STStreamDesc`. 호출자가 `structSize = sizeof(STStreamDesc)`, `apiVersion = ST_ABI_VERSION`을 채웁니다 |

**구조체** `STStreamDesc`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STStreamDesc)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `sampleRate` | 입력 표본률. 엔진 레이트(`st_rt_get_sample_rate`, 44100)여야 합니다. 단, `STRT_CreateOptions.hostSampleRate`를 지정한 컨텍스트에서는 그 값이어야 하며, 엔진이 소스마다 호스트→엔진 변환기를 링 앞단에 겁니다 |
| `channels` | `1`만 허용(모노 전용) |
| `capacityFrames` | 링 크기, **호스트 프레임**(= `sampleRate` 기준). `0` = 기본 8192 호스트 프레임(엔진 레이트에서 약 186 ms), 그 밖은 `[512, 1048576]`. 엔진은 이를 엔진 프레임으로 환산(반올림)한 뒤 2의 거듭제곱으로 올려 잡으므로 실제 용량은 요청보다 큽니다 — `STStreamStatus.capacityFrames`로 확인하십시오 |
| `reserved[5]` | 0 |

**반환** — `1` = 성공 / `0` = 실패. 실패 시 `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH`(`desc` 스탬프 불일치) / `ST_STATUS_INVALID_ARGUMENT`(`sampleRate`가 위 규칙과 다름, `channels ≠ 1`, `capacityFrames`가 0도 `[512, 1048576]`도 아님) / `ST_STATUS_NOT_FOUND`(소스 없음) / `ST_STATUS_UNAVAILABLE`(동시 스트림 슬롯 64개 소진).

</details>

<details>
<summary><code>st_rt_source_write_stream</code> — 스트림 입력 링에 모노 PCM을 씁니다</summary>

```c
int st_rt_source_write_stream(STRT_Context* context, STSourceId source, const float* mono, int frames);
```

**용도** — `st_rt_source_attach_stream`으로 붙인 소스의 링버퍼에 모노 float PCM을 넣습니다. 블로킹하지 않으며 락도 할당도 하지 않으므로 호스트 오디오 스레드에서 직접 부를 수 있습니다.

**언제·어떻게** — 소스당 **단일 생산자**를 전제로 렌더 스레드와 SPSC로 만납니다 — 한 소스에는 한 스레드만 쓰십시오. 같은 소스에 대해 `st_rt_source_attach_stream`/`st_rt_source_clear_audio`와 동시에 부르지 마십시오(다른 소스끼리는 무관). 실패해도 진단 버퍼(`st_rt_get_last_status`)를 건드리지 않고 `0`으로만 알립니다. 비유한 샘플(NaN/Inf)은 검사하지 않으므로 유한성 보장은 호스트 책임입니다. 반환값의 뜻이 `hostSampleRate` 지정 여부에 따라 다르니 아래를 구분해 읽으십시오. 스레드: `[any]` — 어느 스레드에서 불러도 되고 블록하지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 스트림이 붙은 소스 id |
| `mono` | 모노 float PCM 버퍼(`frames`개) |
| `frames` | 쓸 프레임 수, **호스트 프레임**(`STStreamDesc.sampleRate` 기준) |

**반환** — 쓴 프레임 수. 스트림이 붙어 있지 않거나 분리된 뒤면 `0`.

- `hostSampleRate == 0`(변환 없음): 실제로 링에 들어간 프레임 수(`0`…`frames`). 링이 가득 차면 나머지는 버려지고 `droppedFrames`에 누적됩니다. 반환이 `frames`보다 작으면 남은 몫을 다음 호출에 다시 밀어도 되므로 백프레셔 신호로 쓸 수 있습니다.
- `hostSampleRate ≠ 0`(리샘플 경로): 항상 `frames`. 변환기가 입력을 전부 소비하므로 같은 프레임을 다시 밀면 안 됩니다(신호가 겹칩니다). 넘쳐 버려진 몫은 `droppedFrames`로만 보고되며 반환값에는 백프레셔 신호가 없습니다 — `st_rt_source_get_stream_status`의 `queuedFrames`/`capacityFrames`를 보고 공급량을 조절하십시오(예: `queuedFrames`가 용량의 3/4을 넘으면 미는 양을 줄임).

</details>

<details>
<summary><code>st_rt_source_get_stream_status</code> — 스트림 입력 링의 잔량·언더런·드롭 통계를 읽습니다</summary>

```c
int st_rt_source_get_stream_status(const STRT_Context* context, STSourceId source, STStreamStatus* outStatus);
```

**용도** — 스트림 링에 쌓인 양과 누적 언더런·드롭·기록량을 돌려줍니다. 리샘플 경로(`hostSampleRate ≠ 0`)에서는 `st_rt_source_write_stream` 반환값에 백프레셔 신호가 없으므로 `queuedFrames`와 `capacityFrames`의 비가 유일한 공급 조절 신호입니다.

**언제·어떻게** — 정상 경로는 atomic 읽기만 하므로 오디오 스레드를 포함한 어느 스레드에서든 부를 수 있습니다. 단, 스탬프가 틀리거나 스트림이 없는 오류 경로는 컨텍스트의 진단 버퍼에 쓰며 이 쓰기는 스레드 간에 직렬화되지 않습니다 — 인자를 올바르게 채우면 닿지 않습니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 스트림이 붙은 소스 id |
| `outStatus` | `STStreamStatus` 출력. 호출자가 `structSize = sizeof(STStreamStatus)`, `apiVersion = ST_ABI_VERSION`을 채웁니다 |

**구조체** `STStreamStatus`

프레임 필드 다섯 개는 모두 **호스트 프레임**(`STStreamDesc.sampleRate` = `hostSampleRate`, 지정하지 않았으면 44100 기준)입니다. 환산은 조회 시점에 한 번 반올림하므로 오차가 누적되지 않습니다. 48 kHz 호스트에서는 `capacityFrames`가 2의 거듭제곱이 아니니(예: 엔진 8192 → 호스트 8916) 링 크기를 2의 거듭제곱으로 가정하지 마십시오. 누적 카운터 3개는 attach 시점부터의 합이고, 다시 attach하면 0에서 셉니다.

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STStreamStatus)` |
| `apiVersion` | `ST_ABI_VERSION` |
| `queuedFrames` | 지금 링에 쌓여 있는 프레임 |
| `capacityFrames` | 엔진이 실제로 잡은 링 용량 |
| `underrunFrames` | 누계: 링이 비어 무음으로 채운 프레임 |
| `droppedFrames` | 누계: 링이 가득 차 버린 프레임 |
| `totalWrittenFrames` | 누계: 실제로 링에 들어간 프레임 |
| `reserved[6]` | 예약 |

**반환** — `1` = 성공 / `0` = 실패. 실패 시 `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH`(스탬프 불일치) / `ST_STATUS_NOT_FOUND`(스트림이 붙어 있지 않음). `outStatus`나 컨텍스트가 NULL이어도 `0`.

</details>

<details>
<summary><code>st_rt_source_play</code> — 소스 입력의 재생을 시작하거나 재개합니다</summary>

```c
void st_rt_source_play(STRT_Context* context, STSourceId source);
```

**용도** — 파일·에셋·클립·스트림 입력의 재생을 시작합니다. 입력을 붙인 직후는 정지 상태이므로 소리를 내려면 이 함수를 불러야 합니다.

**언제·어떻게** — 오디오 입력을 붙인 뒤 부릅니다. 실제 소리는 그 소스의 첫 IR이 렌더러에 닿은 뒤부터 납니다. 일시정지 상태면 그 위치에서 재개하고, 캐시 클립의 재시작 간격 클럭도 시작·재개합니다. `st_rt_source_trigger`로만 울리는 클립에는 필요 없습니다. 스피커 세트 멤버 소스에는 무시됩니다. 스레드: `[control]` — 재생 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_pause</code> — 소스 입력의 재생을 일시정지합니다</summary>

```c
void st_rt_source_pause(STRT_Context* context, STSourceId source);
```

**용도** — 현재 커서 위치를 유지한 채 재생을 멈춥니다. `st_rt_source_play`로 같은 위치에서 재개합니다.

**언제·어떻게** — 커서는 즉시 멈추고, 출력은 마지막 파형 끝점을 3 ms 램프로 0까지 내려 클릭 없이 끊깁니다. 이미 방에 퍼진 잔향은 계속 울릴 수 있습니다. 캐시 클립의 재시작 클럭도 멈추며, 대기 중인 `st_rt_source_trigger` 요청은 취소됩니다. 스피커 세트 멤버 소스에는 무시됩니다. 스레드: `[control]` — 재생 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_source_stop</code> — 소스 입력의 재생을 멈추고 처음으로 되돌립니다</summary>

```c
void st_rt_source_stop(STRT_Context* context, STSourceId source);
```

**용도** — 재생을 멈추고 커서를 처음으로 되감습니다. 다음 `st_rt_source_play`는 처음부터 재생합니다.

**언제·어떻게** — 출력은 `st_rt_source_pause`와 같이 3 ms 램프로 끊기고, 이미 방에 퍼진 잔향은 계속 울릴 수 있습니다. 파일 입력은 되감기와 함께 설정된 반복 횟수를 복원합니다. 캐시 클립은 재시작 간격 설정을 유지하고, 대기 중인 `st_rt_source_trigger` 요청은 취소됩니다. 호스트 스트림은 되감을 처음이 없으므로 링에 쌓인 프레임을 버립니다. 스피커 세트 멤버 소스에는 무시됩니다. 스레드: `[control]` — 재생 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 실시간 컨텍스트 핸들 |
| `source` | 대상 소스 id |

**반환** — 없음.

</details>

</details>

<details>
<summary><strong>리스너 · 전파 · 음향 정책</strong> — 27개</summary>

<details>
<summary><code>st_rt_listener_set_position</code> — 리스너 위치를 설정한다</summary>

```c
void st_rt_listener_set_position(STRT_Context* context, float x, float y, float z);
```

**용도** — 리스너(청취자)의 월드 위치를 바꿉니다. 모든 소스의 직접음·반사·회절·잔향 경로가 이 위치를 끝점으로 계산됩니다.

**언제·어떻게** — 게임 루프에서 카메라나 플레이어 머리 위치가 바뀔 때마다 부릅니다. 방향은 `st_rt_listener_set_rotation` / `st_rt_listener_set_rotation_ypr` / `st_rt_listener_set_orientation_q`로 따로 주며, 위치를 바꿔도 방향은 유지됩니다. 좌표는 **씬 단위 그대로** 넣습니다(`STRT_CreateOptions.sceneRatio`로 미터 변환은 엔진이 합니다). 스레드: `[control]` — 제어 스레드에서 부르고 오디오 콜백에서는 부르지 마십시오. `ST_RT_SCHEDULER_PIPELINED`에서는 씬을 직접 잠그지 않고 모션 큐에 넣고 돌아오며, 전파 워커가 다음 사이클에 가장 최근 값을 반영합니다. `ST_RT_SCHEDULER_SYNCHRONOUS`에서는 다음 `st_rt_propagate`가 새 위치를 봅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `x` | 월드 X 좌표(씬 단위, +X = right) |
| `y` | 월드 Y 좌표(씬 단위, +Y = up) |
| `z` | 월드 Z 좌표(씬 단위, +Z = forward) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_listener_set_velocity</code> — 리스너 속도를 설정한다(도플러용)</summary>

```c
void st_rt_listener_set_velocity(STRT_Context* context, float x, float y, float z);
```

**용도** — 리스너의 이동 속도 벡터를 알려 줍니다. 엔진은 소스·리스너 속도로 경로별 도플러 슬로프를 계산합니다.

**언제·어떻게** — 위치와 함께 매 프레임 갱신하는 것이 일반적입니다. 속도는 **씬 단위/초**로 넣으며, 엔진이 `sceneRatio`를 곱해 m/s로 바꾼 뒤 음속으로 나눕니다. 정지한 리스너는 `(0, 0, 0)`입니다. 도플러 피치 렌더 자체는 `STRenderOptions.useDoppler`, 움직이는 소스의 방사 이득은 `st_rt_set_doppler_gain_mode`가 담당합니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오. `PIPELINED`에서는 모션 큐에 들어가 다음 전파 사이클에 반영됩니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `x` | 속도 X 성분(씬 단위/초) |
| `y` | 속도 Y 성분(씬 단위/초) |
| `z` | 속도 Z 성분(씬 단위/초) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_listener_set_rotation</code> — 리스너 방향을 yaw·pitch(라디안)로 설정한다</summary>

```c
void st_rt_listener_set_rotation(STRT_Context* context, float yaw, float pitch);
```

**용도** — 리스너의 머리 방향을 yaw·pitch로 정합니다. 공간화(패닝·HRTF·스피커 디코딩)의 방위각·고도각이 이 방향을 기준으로 계산됩니다. roll(머리 기울임)은 표현하지 않습니다.

**언제·어떻게** — 카메라 회전이 바뀔 때마다 부릅니다. 각도는 **라디안**입니다. 회전 행렬은 `R = Ry(yaw)·Rx(pitch)`이고, `yaw = 0, pitch = 0`이면 forward = +Z, up = +Y, right = +X(항등)입니다. **yaw 양수 = 오른쪽으로 돈다**(위에서 내려다봐서 시계 방향), **pitch 양수 = 아래를 본다**. 방향 벡터 `d`에서 역으로 구하려면 `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`를 씁니다. 엔진 좌표계는 Unity와 같으므로 Unity 호스트는 변환 없이 넣으면 되고, forward를 −Z로 두는 호스트(OpenGL식 카메라)는 Z를 뒤집거나 yaw에 180도를 더해 넣어야 합니다. 리스너 방향 setter 세 개(`st_rt_listener_set_rotation`, `st_rt_listener_set_rotation_ypr`, `st_rt_listener_set_orientation_q`)는 같은 방향 값을 덮어쓰며 **마지막에 부른 쪽이 이깁니다**. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오. `PIPELINED`에서는 모션 큐로 들어갑니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `yaw` | +Y축 회전(라디안). 양수 = 오른쪽으로 돈다 |
| `pitch` | +X축 회전(라디안). 양수 = 아래를 본다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_listener_set_orientation_q</code> — 리스너 방향을 쿼터니언(XYZW)으로 설정한다(roll 포함)</summary>

```c
int st_rt_listener_set_orientation_q(STRT_Context* context, const float quatXYZW[4]);
```

**용도** — 리스너 방향을 로컬→월드 단위 쿼터니언으로 줍니다. yaw·pitch로는 표현할 수 없는 roll(머리 기울임)까지 담을 수 있어, VR 헤드 트래킹처럼 호스트가 이미 쿼터니언을 가진 경우에 그대로 넘길 수 있습니다.

**언제·어떻게** — 로컬 축은 forward = +Z · up = +Y · right = +X입니다. 성분 순서는 **XYZW**이고 정규화는 엔진이 하므로 호스트가 미리 정규화할 필요는 없습니다. 검증은 `st_rt_source_set_orientation_q`와 같습니다. `st_rt_listener_set_rotation(yaw, pitch)`는 `q = q_y(yaw) · q_x(pitch)`인 roll 0 경우와 같습니다. 리스너 방향 setter 세 개는 **마지막에 부른 쪽이 이깁니다**. 지원 여부는 `st_rt_get_capability_word(1)`의 `ST_CAP1_LISTENER_ORIENTATION_Q` 비트로 확인합니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오. `PIPELINED`에서는 모션 큐로 들어갑니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `quatXYZW` | 로컬→월드 회전 쿼터니언 `[x, y, z, w]`. 비유한 성분이 있거나 노름이 퇴화(`norm < 1e-12`)하면 거절 |

**반환** — `1` = 적용 / `0` = 실패. 비유한·퇴화 쿼터니언이면 아무것도 바꾸지 않고 `st_rt_get_last_status`에 `ST_STATUS_INVALID_ARGUMENT`를 남깁니다.

</details>

<details>
<summary><code>st_rt_listener_set_rotation_ypr</code> — 리스너 방향을 yaw·pitch·roll(라디안)로 설정한다</summary>

```c
int st_rt_listener_set_rotation_ypr(STRT_Context* context, float yaw, float pitch, float roll);
```

**용도** — `st_rt_listener_set_rotation`에 roll을 더한 오일러 각 버전입니다. 머리 기울임을 오일러 각으로 다루는 호스트용입니다.

**언제·어떻게** — 회전 행렬은 `R = Ry(yaw)·Rx(pitch)·Rz(roll)`이며, Unity `Quaternion.Euler(pitch, yaw, roll)`(도를 라디안으로 바꾼 값)과 같은 순서입니다. yaw·pitch의 뜻은 `st_rt_listener_set_rotation`과 같고(yaw 양수 = 오른쪽으로 돈다, pitch 양수 = 아래를 본다), **roll 양수 = right 축이 위로 기운다**(머리가 왼쪽으로 기울고 오른쪽 귀가 올라간다). `roll = 0`이면 `st_rt_listener_set_rotation(yaw, pitch)`와 같은 행렬입니다. 리스너 방향 setter 세 개는 **마지막에 부른 쪽이 이깁니다**. 지원 여부는 `ST_CAP1_LISTENER_ORIENTATION_Q`(능력 워드 1)로 확인합니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오. `PIPELINED`에서는 모션 큐로 들어갑니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `yaw` | +Y축 회전(라디안). 양수 = 오른쪽으로 돈다 |
| `pitch` | +X축 회전(라디안). 양수 = 아래를 본다 |
| `roll` | +Z축 회전(라디안). 양수 = right 축이 위로(머리가 왼쪽으로 기움) |

**반환** — `1` = 적용 / `0` = 실패. 비유한 값이 있으면 아무것도 바꾸지 않고 `ST_STATUS_INVALID_ARGUMENT`를 남깁니다.

</details>

<details>
<summary><code>st_rt_set_path_type_enabled</code> — 경로 종류별 전파를 전역으로 켜고 끈다</summary>

```c
void st_rt_set_path_type_enabled(STRT_Context* context, int pathType, int enabled);
```

**용도** — 직접음·투과·반사·회절·잔향 중 특정 종류의 경로를 엔진 전체에서 계산하지 않게 합니다. 어떤 성분이 소리에 얼마나 기여하는지 하나씩 분리해 들어 보거나, 필요 없는 종류를 빼서 비용을 줄일 때 씁니다.

**언제·어떻게** — 기본값은 5종 전부 켜짐입니다. 전파 단계의 게이트이므로 끈 종류는 경로 자체가 만들어지지 않습니다(렌더 단계 게이트인 `STRenderOptions.render*`와 다릅니다). 소스 하나에만 적용하려면 `st_rt_source_set_path_enabled`를 씁니다. `st_rt_set_acoustic_feature_enabled`와 조합하면 "사운드 트레이싱 끔" 기준선을 설정만으로 만들 수 있습니다 — 반사·회절·잔향을 끄고 음향 기능 세 가지를 모두 끄면 거리 감쇠와 패닝만 남습니다. 스레드: `[control]` — 씬 write 락을 잡으므로 워커와 잠깐 경합할 수 있습니다. 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb. 범위 밖 값은 무시 |
| `enabled` | `0` = 끔, 그 외 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_set_acoustic_feature_enabled</code> — 공기 흡수·전파 지연·직접음 차폐를 개별로 켜고 끈다</summary>

```c
int st_rt_set_acoustic_feature_enabled(STRT_Context* context, int feature, int enabled);
```

**용도** — 개별 음향 기능을 끄고 켜서 청취 A/B 비교를 할 수 있게 합니다. 경로 종류 게이트(`st_rt_set_path_type_enabled`)와 함께 "무엇이 소리에 기여하는지"를 하나씩 분리해 들려주기 위한 표면입니다.

**언제·어떻게** — 기본값은 세 기능 모두 켜짐(물리 그대로)입니다. 반사·회절·잔향 경로를 끄고 세 기능을 모두 끄면 거리 감쇠와 스테레오 패닝만 남는 기준선이 됩니다. 현재 값은 `st_rt_is_acoustic_feature_enabled`로 읽습니다. 이 함수는 **IR 재변환 유발** setter입니다 — 호출만으로 IR 변환 파이프라인이 다시 돌아 새 IR이 발행되므로(`PIPELINED`는 워커를 깨움), 값이 바뀔 때만 부르십시오. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`(0) = 대기 감쇠(고역 손실) / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`(1) = 경로 길이 기반 전파 지연 / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`(2) = 직접음 차폐(가시성 검사) |
| `enabled` | `0` = 끔, 그 외 = 켬 |

**반환** — `1` = 적용 / `0` = `feature`가 범위 밖이거나 실패.

</details>

<details>
<summary><code>st_rt_set_late_coupling</code> — 리스너–소스 확산장 결합에 따른 잔향 감쇠를 세부 설정한다</summary>

```c
int st_rt_set_late_coupling(STRT_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**용도** — 리스너가 소스의 확산장에 얼마나 결합돼 있는지에 따라 late reverb(FDN) 주입을 감쇠합니다. 잔향 탱크는 완전히 섞인 단일 공간이라 기본적으로 어디서든 같은 크기로 들리는데, ㄷ자·ㅁ자처럼 모퉁이 너머로 갈라진 공간에서 "소스에서 멀어졌는데 잔향이 그대로이거나 오히려 커지는" 문제를 고치기 위한 옵션입니다.

**언제·어떻게** — 대부분은 `st_rt_set_late_coupling_preset`으로 충분하고, 세부 조정이 필요할 때만 이 함수를 씁니다. 결합 감쇠(`floorDb`)·send 평탄화(`sendNormalizeTrim`)·방향 표본 수집(`rainDirectionWalk`)은 함께 쓰도록 설계됐습니다 — 평탄화 없이 결합만 켜면 멀어질수록 잔향 주입이 커지는 역전이 남고, 방향 표본 수집을 끄면 갈라진 공간 건너편의 잔향 방향 정보가 부족해집니다. 개별 파라미터 구성은 앞으로 바뀔 수 있으므로 가능하면 프리셋을 쓰십시오. 현재 값은 `st_rt_get_late_coupling`으로 읽습니다. **IR 재변환 유발** setter입니다(호출하면 IR이 다시 변환·발행됨). 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `floorDb` | 완전 차단 시 감쇠 깊이(dB, 0 이상). `0` = 결합 감쇠 끔. 기본 `9` |
| `visibleLow` | 가시 비율이 이 값 아래면 완전 차단으로 보고 `floorDb`만큼 감쇠. `[0, 1)`. `0` → 기본 `0.05` |
| `visibleHigh` | 가시 비율이 이 값 위면 같은 공간으로 보고 **정확히 0 dB**. `[0, 1]`. `0` → 기본 `0.60` |
| `sendNormalizeTrim` | 잔향 send 총합 평탄화 트림(0 이상). `0` = 평탄화 안 함. 기본 `0.75` |
| `rainDirectionWalk` | `1`(기본) = 잔향 방향 표본을 계속 모은다(에너지는 나르지 않음) / `0` = 끔 |

**반환** — `1` = 적용 / `0` = 범위 밖(비유한·음수, `visibleLow >= 1`, `visibleHigh > 1`) 또는 실패. 실패하면 값은 바뀌지 않습니다.

</details>

<details>
<summary><code>st_rt_get_late_coupling</code> — 현재 late 결합 감쇠 설정을 읽는다</summary>

```c
int st_rt_get_late_coupling(const STRT_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**용도** — `st_rt_set_late_coupling` / `st_rt_set_late_coupling_preset`으로 걸린 현재 값을 돌려줍니다. 프리셋이 실제로 어떤 값을 채웠는지 확인하거나 UI에 표시할 때 씁니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 필요 없는 출력 인자는 `NULL`로 넘기면 건너뜁니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outFloorDb` | 완전 차단 감쇠 깊이(dB)를 받을 포인터. `NULL` 허용 |
| `outVisibleLow` | 완전 차단 무릎점을 받을 포인터. `NULL` 허용 |
| `outVisibleHigh` | 같은 공간(0 dB) 무릎점을 받을 포인터. `NULL` 허용 |
| `outSendNormalizeTrim` | send 평탄화 트림을 받을 포인터. `NULL` 허용 |
| `outRainDirectionWalk` | 방향 표본 수집 여부(`1`/`0`)를 받을 포인터. `NULL` 허용 |

**반환** — `1` = 성공(출력 포인터에 현재 값을 씀) / `0` = 컨텍스트가 없음.

</details>

<details>
<summary><code>st_rt_set_late_coupling_preset</code> — late 결합 감쇠를 권장 프리셋으로 한 번에 설정한다</summary>

```c
int st_rt_set_late_coupling_preset(STRT_Context* context, int preset);
```

**용도** — `st_rt_set_late_coupling`의 다섯 값을 권장 조합으로 한 번에 채웁니다. 프리셋은 감쇠 바닥 깊이만 다르고 나머지(무릎 두 점·평탄화 트림·방향 표본 수집)는 같은 권장값입니다.

**언제·어떻게** — 엔진 기본 상태는 `ST_LATE_COUPLING_DEFAULT`와 같습니다. 어느 프리셋이든 리스너가 소스와 같은 공간에 있으면 감쇠는 정확히 0 dB이고, 단일 방에서는 사실상 차이가 나지 않습니다 — 차이는 모퉁이 너머로 갈라진 공간에서만 나므로 선택은 청감의 문제입니다. 개별 조정이 필요하면 `st_rt_set_late_coupling`을 씁니다. **IR 재변환 유발** setter입니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `preset` | `ST_LATE_COUPLING_OFF`(0) = 결합 감쇠·평탄화·방향 표본 수집 전부 끔 / `ST_LATE_COUPLING_SUBTLE`(1) = 바닥 6 dB / `ST_LATE_COUPLING_DEFAULT`(2) = 바닥 9 dB(엔진 기본) / `ST_LATE_COUPLING_STRONG`(3) = 바닥 12 dB |

**반환** — `1` = 적용 / `0` = `preset`이 범위 밖이거나 실패.

</details>

<details>
<summary><code>st_rt_set_physical_distance_attenuation</code> — 물리 거리 감쇠의 기준 거리·최소 거리를 설정한다</summary>

```c
void st_rt_set_physical_distance_attenuation(STRT_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**용도** — 경로 길이에 따른 거리 감쇠(구면 확산)의 기준점을 정합니다. 엔진의 거리 감쇠 법칙은 물리적 압력 확산 하나이며, 압력 이득은 `referenceDistanceMeters / max(거리, minDistanceMeters)`입니다. 즉 기준 거리에서 이득 1(0 dB)이 됩니다.

**언제·어떻게** — 기본값은 기준 거리 1.0 m · 최소 거리 1.0 m입니다(1 m 안쪽에서는 더 커지지 않음). `minDistanceMeters`를 기준 거리보다 작게 주면 근접장 부스트가 생깁니다(예: 기준 1, 최소 0.25 → 최대 이득 4배). 두 값은 **미터**로 주며 `sceneRatio`가 적용되지 않습니다(비교 대상인 경로 길이가 이미 미터로 변환되어 있기 때문). **IR 재변환 유발** setter입니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `referenceDistanceMeters` | 이득 1이 되는 기준 거리(m). 기본 `1.0` |
| `minDistanceMeters` | 거리 하한(m). 이보다 가까워도 이 거리로 계산. 기본 `1.0` |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_set_atmosphere</code> — 대기 조건(온도·습도·기압)을 설정한다</summary>

```c
void st_rt_set_atmosphere(STRT_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**용도** — 공기 흡수와 음속 계산에 쓰는 대기 상태를 정합니다. 음속은 고정 상수가 아니라 이 대기 값에서 유도되며, 밴드별 공기 흡수(고역 손실)는 ISO 9613-1 순음 흡수 공식으로 계산됩니다. 덥고 건조한 사막, 춥고 습한 실외처럼 환경에 따라 원거리 고역 감쇠와 지연이 달라지는 것을 표현할 수 있습니다.

**언제·어떻게** — 기본값은 20.0 °C · 50.0 % RH · 101.325 kPa입니다. 레벨 로드나 날씨 변경처럼 값이 바뀔 때만 부릅니다. 공기 흡수 자체를 끄려면 `st_rt_set_acoustic_feature_enabled(ST_ACOUSTIC_FEATURE_AIR_ABSORPTION, 0)`을 씁니다. **IR 재변환 유발** setter입니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `temperatureC` | 기온(°C). 기본 `20.0` |
| `relativeHumidityPercent` | 상대 습도(%, 0~100). 기본 `50.0` |
| `pressureKPa` | 대기압(kPa). 기본 `101.325` |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_set_doppler_gain_mode</code> — 움직이는 소스의 도플러 방사 이득 모드를 설정한다</summary>

```c
int st_rt_set_doppler_gain_mode(STRT_Context* context, int mode);
```

**용도** — 소스가 움직일 때 진행 방향 쪽으로 소리가 더 크게, 반대쪽으로 더 작게 방사되는 효과(이동 단극자 근사)를 켜고 끕니다. 가변 지연에 의한 도플러 **피치** 변화(`STRenderOptions.useDoppler`)와는 별개의 스위치입니다.

**언제·어떻게** — 기본값은 `ST_DOPPLER_GAIN_MOVING_MONOPOLE`입니다. 정지한 소스에서는 이득이 1이라 영향이 없고, IR 변환 때 경로마다 한 번 계산하므로 렌더 비용은 들지 않습니다. 현재 값은 `st_rt_get_doppler_gain_mode`로 읽습니다. 지원 여부는 `ST_CAP_DOPPLER_GAIN_MODE`로 확인합니다. **IR 재변환 유발** setter입니다(같은 값을 다시 넣으면 아무 일도 하지 않습니다). 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) = 방사 이득 없음 / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`(1) = 이동 단극자 근사: 압력 `D^2`, 에너지 `D^4`, `D = 1/(1 - Mr)`(소스 속도의 방사 방향 마하 수 `Mr`), 경로의 방사 방향마다 따로 계산 |

**반환** — `1` = 적용 / `0` = `mode`가 범위 밖이거나 실패.

</details>

<details>
<summary><code>st_rt_get_doppler_gain_mode</code> — 현재 도플러 방사 이득 모드를 읽는다</summary>

```c
int st_rt_get_doppler_gain_mode(const STRT_Context* context);
```

**용도** — `st_rt_set_doppler_gain_mode`로 설정된 현재 모드를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STDopplerGainMode` 값(`0` = `ST_DOPPLER_GAIN_OFF`, `1` = `ST_DOPPLER_GAIN_MOVING_MONOPOLE`).

</details>

<details>
<summary><code>st_rt_set_early_late_band_energy_targets</code> — 초기 반사·잔향의 밴드별 에너지 배율을 따로 설정한다</summary>

```c
int st_rt_set_early_late_band_energy_targets(STRT_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**용도** — 초기(early) 성분과 잔향(late) 성분의 주파수 밴드별 에너지를 서로 독립적으로 조정합니다. 예를 들어 잔향의 고역만 줄이거나 초기 반사의 저역만 키우는 식의 음색 보정을 재질을 건드리지 않고 할 수 있습니다.

**언제·어떻게** — 두 배열을 **한 번에 교체**합니다(한쪽만 바꾸려면 다른 쪽에 현재 값을 다시 넣습니다). 배열은 63, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz 순서의 9개 값이며 **energy-domain** 배율입니다(`2.0` ≈ +3 dB, `0.5` ≈ −3 dB). early 배열은 개별 경로(exact/early tap)에만, late 배열은 잔향 send·탱크 구동에만 적용되며 둘이 서로 곱해지지 않습니다. 기본값은 전부 `1.0`(중립)입니다. 지원 여부는 `ST_CAP_EARLY_LATE_BAND_ENERGY`로 확인합니다. **IR 재변환 유발** setter입니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `earlyBandEnergy` | 초기 성분 밴드별 에너지 배율 9개. 비유한 값은 `1.0`으로, 나머지는 `[0, 16]`으로 정규화. `NULL` 불가 |
| `lateBandEnergy` | 잔향 성분 밴드별 에너지 배율 9개. 정규화 규칙 동일. `NULL` 불가 |

**반환** — `1` = 적용 / `0` = 배열 중 하나가 `NULL`이거나 실패.

</details>

<details>
<summary><code>st_rt_set_max_depth</code> — 반사·회절 경로의 전역 최대 차수를 설정한다</summary>

```c
void st_rt_set_max_depth(STRT_Context* context, int depth);
```

**용도** — 반사·회절 경로 탐색이 따라갈 최대 경계면 상호작용 횟수(차수)를 엔진 전체에 대해 정합니다. 값을 올리면 고차 반사까지 정확히 추적하는 대신 전파 비용이 늘어납니다.

**언제·어떻게** — 기본값은 전역 8입니다. 소스별 깊이(기본 4)는 `st_rt_source_set_depth`로 따로 정합니다. 보통 씬을 만든 뒤 품질 설정 단계에서 한 번 부릅니다. 스레드: `[control]` — 씬 write 락을 잡으므로 워커와 잠깐 경합할 수 있습니다. 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `depth` | 최대 차수, `[1, 64]`. 기본 `8`. 범위 밖 값은 무시(이전 값 유지) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_set_transmission_max_depth</code> — 직접음·투과 경로가 통과할 최대 면 수를 설정한다</summary>

```c
void st_rt_set_transmission_max_depth(STRT_Context* context, int depth);
```

**용도** — 소스→리스너 직선이 가려졌을 때 투과 경로가 몇 개의 면까지 통과할 수 있는지 정합니다. 벽 여러 겹을 넘어오는 소리를 어디까지 계산할지 정하는 값입니다.

**언제·어떻게** — 기본값은 64입니다. `0`이면 투과 면을 통과하지 않습니다. 투과 경로 자체를 끄려면 `st_rt_set_path_type_enabled`(Transmission = 1)를 씁니다. 스레드: `[control]` — 씬 write 락을 잡습니다. 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `depth` | 통과 가능한 최대 면 수, `[0, 64]`. 기본 `64`. 범위 밖 값은 무시(이전 값 유지) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_listener_set_ray_count</code> — 리스너 탐색(guide) 광선 수를 설정한다</summary>

```c
void st_rt_listener_set_ray_count(STRT_Context* context, int width, int height);
```

**용도** — 리스너에서 쏘는 탐색(guide/probe) 광선의 개수를 `width × height`로 정합니다. 이 광선이 반사·회절 경로 후보를 찾으므로, 늘리면 작은 반사면을 놓칠 확률이 줄고 전파 비용이 늘어납니다.

**언제·어떻게** — 기본값은 16 × 16(256개)입니다. 소스 쪽 수송 광선은 `st_rt_source_set_ray_count`로 따로 정합니다. 광선 방향 분포는 `st_rt_listener_set_ray_sampling_method`가 정합니다. 스레드: `[control]` — 씬 write 락을 잡습니다. 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `width` | 격자 가로 수, `[1, 4096]`. 기본 `16` |
| `height` | 격자 세로 수, `[1, 4096]`. 기본 `16`. 둘 중 하나라도 범위 밖이면 호출 전체를 무시 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_listener_set_ray_sampling_method</code> — 리스너 탐색 광선의 방향 분포를 설정한다</summary>

```c
int st_rt_listener_set_ray_sampling_method(STRT_Context* context, int method);
```

**용도** — 리스너 탐색 광선을 구면에 어떻게 분포시킬지 고릅니다. 현재 선택할 수 있는 분포는 `ST_RAY_SAMPLING_FIBONACCI_SPHERE` 하나이며, 이 함수는 그 값을 명시적으로 확인·설정하는 용도로 남아 있습니다.

**언제·어떻게** — 기본값이자 유일하게 받는 값이 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)입니다. 피보나치 분포는 결정적이고 시드를 쓰지 않습니다. 나머지 `STRaySamplingMethod` 값은 번호 호환을 위해 열거형에만 남아 있고 거절됩니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `method` | `STRaySamplingMethod`. `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)만 허용. `ST_RAY_SAMPLING_LEGACY_GRID`(0) / `ST_RAY_SAMPLING_EQUAL_AREA_GRID`(2) / `ST_RAY_SAMPLING_SOBOL_SPHERE`(3) / `ST_RAY_SAMPLING_ICOSAHEDRAL`(4)는 거절 |

**반환** — `1` = 적용 / `0` = 거절(상태는 바뀌지 않고 `ST_STATUS_INVALID_ARGUMENT`를 남김).

</details>

<details>
<summary><code>st_rt_listener_get_ray_sampling_method</code> — 리스너 탐색 광선의 방향 분포를 읽는다</summary>

```c
int st_rt_listener_get_ray_sampling_method(const STRT_Context* context);
```

**용도** — 현재 리스너 탐색 광선 분포를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 선택 가능한 분포가 피보나치 하나이므로 정상 컨텍스트에서는 항상 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`입니다. 스레드: `[control]` — 씬 read 락만 잡는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STRaySamplingMethod` 값(항상 `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`) / `-1` = 컨텍스트가 없음.

</details>

<details>
<summary><code>st_rt_set_source_ray_sampling_method</code> — 소스 수송 광선의 방향 분포를 설정한다</summary>

```c
int st_rt_set_source_ray_sampling_method(STRT_Context* context, int method);
```

**용도** — 소스에서 쏘는 수송(잔향·확산 에너지용) 광선의 구면 분포를 고릅니다. 리스너 쪽과 마찬가지로 현재 선택할 수 있는 값은 `ST_RAY_SAMPLING_FIBONACCI_SPHERE` 하나입니다.

**언제·어떻게** — 기본값이자 유일하게 받는 값이 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)입니다. 소스 수송 광선 수는 `st_rt_source_set_ray_count`로 정합니다. 스레드: `[control]` — 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `method` | `STRaySamplingMethod`. `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)만 허용, 나머지 값은 거절 |

**반환** — `1` = 적용 / `0` = 거절(상태는 바뀌지 않고 `ST_STATUS_INVALID_ARGUMENT`를 남김).

</details>

<details>
<summary><code>st_rt_get_source_ray_sampling_method</code> — 소스 수송 광선의 방향 분포를 읽는다</summary>

```c
int st_rt_get_source_ray_sampling_method(const STRT_Context* context);
```

**용도** — 현재 소스 수송 광선 분포를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 정상 컨텍스트에서는 항상 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`입니다. 스레드: `[control]` — 씬 read 락만 잡는 질의입니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STRaySamplingMethod` 값(항상 `1` = `ST_RAY_SAMPLING_FIBONACCI_SPHERE`) / `-1` = 컨텍스트가 없음.

</details>

<details>
<summary><code>st_rt_build</code> — 정적·동적 가속구조를 전부 빌드한다</summary>

```c
void st_rt_build(STRT_Context* context);
```

**용도** — 메시·오브젝트 배치로 정적 TLAS와 동적 TLAS를 모두 새로 짓습니다. 전파와 `st_rt_scene_raycast`가 이 가속구조를 사용하므로, 씬을 구성한 뒤 한 번은 반드시 불러야 합니다.

**언제·어떻게** — 메시·오브젝트를 만든 뒤, 첫 `st_rt_propagate` 전에 부릅니다. 이후 **정적** 오브젝트를 추가·삭제·이동하는 등 정적 구성이 바뀌면 다시 불러야 합니다 — 정적 TLAS는 `st_rt_build` 전까지 이전에 발행된 것이 그대로 쓰이고, 그 사이의 정적 변경은 보이지 않습니다. 동적 오브젝트(`isDynamic = 1`)의 이동만 반영하려면 더 가벼운 `st_rt_build_dynamic`을 씁니다. 스레드: `[control, blocking]` — 가속구조 전체 빌드라 긴 배타 구간입니다. 게임 루프의 매 프레임 경로나 오디오 스레드에서 부르지 말고, 로딩 단계에서 부르십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_build_dynamic</code> — 동적 오브젝트 가속구조만 다시 맞춘다</summary>

```c
void st_rt_build_dynamic(STRT_Context* context);
```

**용도** — 동적 오브젝트(`isDynamic = 1`)로 이루어진 동적 TLAS만 갱신(refit)합니다. 문·엘리베이터처럼 움직이는 기하가 있을 때, 전체 빌드 없이 그 변화를 전파에 반영하기 위한 가벼운 경로입니다.

**언제·어떻게** — 동적 오브젝트의 변환(`st_rt_object_set_transform` 등)을 바꾼 뒤 부릅니다. 정적 TLAS는 건드리지 않으므로 정적 구성 변경에는 `st_rt_build`가 필요합니다. 스레드: `[control]` — 씬 write 락을 잡으므로 워커와 잠깐 경합할 수 있습니다. 오디오 콜백에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_set_lane_update_interval</code> — 전파 레인별 갱신 주기를 설정한다</summary>

```c
int st_rt_set_lane_update_interval(STRT_Context* context, int lane, float milliseconds);
```

**용도** — `PIPELINED` 스케줄러에서 직접음·반사/회절·잔향 세 전파 레인이 얼마나 자주 다시 계산될지 정합니다. CPU 사용량과 반응성 사이의 균형을 호스트가 조절하는 손잡이입니다. 반사/회절 레인이 전파 비용의 대부분을 쓰므로, CPU를 아끼고 싶다면 이 레인의 주기를 먼저 올리십시오. 그 대가로 초기 반사가 리스너 움직임을 조금 늦게 따라오지만, 직접음 레인의 주기는 그대로라 무음이나 끊김은 생기지 않습니다.

**언제·어떻게** — **런타임에 언제든** 부를 수 있습니다(스레드 속성과 달리 `st_rt_create` 전 제약이 없음). 워커가 도는 중에 바꿔도 다음 사이클부터 새 값으로 돌며, 이미 대기에 들어간 마감은 유지되고 다음 실행부터 새 값을 씁니다. 각 레인은 Guide나 호스트의 새 요청이 없어도 독립적으로 반복 실행됩니다. 주기의 의미는 레인마다 다릅니다(아래 표). `ST_RT_SCHEDULER_SYNCHRONOUS`에는 레인이 없어 실패합니다. 지원 여부는 `ST_CAP_LANE_UPDATE_INTERVAL`로 확인합니다. 스레드: `[control]` — 값을 atomic으로 저장하고 워커에 전달합니다. 오디오 콜백에서는 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `lane` | `STPropagationLane` — `ST_PROPAGATION_LANE_DIRECT`(0): 연속 실행 **시작** 사이 최소 간격, 기본 10 ms / `ST_PROPAGATION_LANE_REFLECTION_DIFFRACTION`(1): 연속 두 실행 사이 최소 간격, 기본 0 ms(제한 없음). 대기 중 도착한 요청은 마감까지 하나로 접혀 굶지 않음 / `ST_PROPAGATION_LANE_REVERB`(2): 실행 **완료 후** 다음 실행까지 최소 간격, 기본 4 ms |
| `milliseconds` | 최소 간격(ms), `[0, 60000]`. `0` = 추가 대기 없음. 음수·NaN·무한대·60000 초과는 clamp하지 않고 거절 |

**반환** — `1` = 적용 / `0` = 거절. `lane`이 범위 밖이거나 `milliseconds`가 허용 범위 밖이면 `ST_STATUS_INVALID_ARGUMENT`, `SYNCHRONOUS` 스케줄러면 `ST_STATUS_UNAVAILABLE`을 `st_rt_get_last_status`에 남깁니다.

</details>

<details>
<summary><code>st_rt_get_lane_update_interval</code> — 전파 레인의 갱신 주기를 읽는다</summary>

```c
float st_rt_get_lane_update_interval(const STRT_Context* context, int lane);
```

**용도** — 레인에 저장된 갱신 주기를 ms 단위로 돌려줍니다.

**언제·어떻게** — 마지막 `st_rt_set_lane_update_interval`이 거절됐더라도 현재 **저장된 값**을 돌려주므로, 넣은 값이 실제로 적용됐는지 확인할 때 씁니다. 스레드: `[any]` — atomic 하나만 읽으므로 어느 스레드에서 불러도 되고 블록하지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `lane` | `STPropagationLane` — `DIRECT`(0) / `REFLECTION_DIFFRACTION`(1) / `REVERB`(2) |

**반환** — 저장된 주기(ms). `lane`이 범위 밖이거나 컨텍스트가 없으면 `0`.

</details>

<details>
<summary><code>st_rt_propagate</code> — 전파를 실행하거나(SYNCHRONOUS) 전파 워커를 깨운다(PIPELINED)</summary>

```c
int st_rt_propagate(STRT_Context* context);
```

**용도** — 현재 씬·소스·리스너 상태로 음향 전파와 IR 변환을 진행시킵니다. 스케줄러에 따라 동작이 다릅니다.

**언제·어떻게** — `st_rt_build` 뒤에 부릅니다.

- `ST_RT_SCHEDULER_SYNCHRONOUS`: 전파·IR 파이프라인이 **호출 스레드에서 실제로 돕니다**. 호스트가 이 함수를 불러야만 계산이 진행되므로 게임 루프에서 주기적으로(예: 매 프레임) 부릅니다. 이 스케줄러에서는 쉬게 한 소스(`st_rt_source_idle`)도 계산됩니다.
- `ST_RT_SCHEDULER_PIPELINED`(기본): 워커를 깨우고 **즉시 돌아옵니다**. 레인은 호스트 요청 없이도 `st_rt_set_lane_update_interval` 주기에 따라 반복 실행되므로, 이 호출은 "변경이 있으니 바로 돌아라"라는 신호입니다.

스레드: `[control, runs-here]` — `SYNCHRONOUS`에서는 호출 스레드가 전파 비용을 그대로 부담하므로 오디오 스레드에서 부르지 마십시오.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 전파된 경로 수(`PIPELINED`에서는 워커가 가장 최근에 낸 값). `PIPELINED`에서 워커 오류가 있으면 `-1`, 컨텍스트가 없으면 `0`.

</details>

</details>

<details>
<summary><strong>렌더 · 출력단 · 스피커 세트</strong> — 56개</summary>

<details>
<summary><code>st_rt_render_set_spatializer</code> — 공간화 방식(패닝 / HRIR 데이터셋)을 고른다</summary>

```c
int st_rt_render_set_spatializer(STRT_Context* context, int type);
```

**용도** — 렌더 경로의 공간화 구현을 고릅니다. `PANNING`은 HRIR 데이터 없이 스테레오 패닝으로, `MIT_KEMAR`와 `SADIE_D2_KEMAR`는 측정 HRIR 컨볼루션으로 바이노럴 출력을 만듭니다. SADIE II D2는 데이터셋의 측정 ITD·위상까지 담은 기준 HRTF입니다.

**언제·어떻게** — HRIR 공간화(1·2)는 헤드폰 바이노럴 출력, 즉 `st_rt_render_start(context, 1)`로 시작한 렌더에서 쓰입니다. 보통 `st_rt_render_start` 전에 한 번 고릅니다. 스레드: `[control, blocking]` — HRIR 데이터셋을 읽어 들이는 긴 구간이라 게임 루프·오디오 스레드에서 부르지 않습니다. 지원 여부는 `ST_CAP_HRTF`, `ST_CAP_SADIE_D2_HRTF`(능력 워드 0)로 확인합니다.

`PANNING`과 `MIT_KEMAR`는 라이브러리에 내장돼 있습니다. `SADIE_D2_KEMAR`는 외부 파일 `SADIE_D2_44K_16bit_256tap.hrtfbin`(SDK의 `Resources/HRTF/`에 라이선스 `LICENSE-SADIE-II.txt`와 함께 들어 있음)이 있어야 하며, 엔진은 다음 순서로 찾습니다.

1. 환경변수 `SIMPLEST_SADIE_D2_HRTF_PATH`(파일 경로)
2. 현재 작업 폴더, 3. 실행 파일 폴더, 4. 이 라이브러리의 폴더 — 각각 그 폴더와 상위 8단계에서 `Assets/HRTF/`, `SimpleST/Assets/HRTF/`, `Resources/HRTF/` 아래의 그 파일

배포에서는 라이브러리 옆(또는 상위)에 `Resources/HRTF/SADIE_D2_44K_16bit_256tap.hrtfbin`을 두는 것이 가장 간단합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`(0, 기본) / `ST_SPATIALIZER_MIT_KEMAR`(1) / `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) |

**반환** — `1` = 적용 / `0` = 실패. 범위 밖 `type`이면 `0`입니다. SADIE D2 자산 파일을 찾지 못하면 `0`이고 `st_rt_get_last_status`에 `ST_STATUS_UNAVAILABLE`("SADIE D2 HRTF asset not found ...")이 남습니다.

</details>

<details>
<summary><code>st_rt_render_get_spatializer</code> — 현재 공간화 방식을 읽는다</summary>

```c
int st_rt_render_get_spatializer(const STRT_Context* context);
```

**용도** — `st_rt_render_set_spatializer`로 고른 공간화 방식을 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[any]` — atomic 읽기라 어느 스레드에서 불러도 블록하지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STSpatializerType` 값(`0` PANNING / `1` MIT_KEMAR / `2` SADIE_D2_KEMAR). 기본은 `0`. 컨텍스트가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_render_set_limiter_type</code> — 출력 리미터 종류를 고른다</summary>

```c
void st_rt_render_set_limiter_type(STRT_Context* context, int type);
```

**용도** — 최종 믹스(마스터 버스)의 마지막 단계인 출력 리미터의 알고리즘을 고릅니다. 리미터는 스테레오(헤드폰·패닝)와 스피커 레이아웃 출력 모두에 걸리며, N채널 출력에는 모든 채널에 같은 이득을 거는 채널 링크로 동작합니다. 32채널을 넘는 커스텀 레이아웃에서는 리미터를 통과시킵니다.

**언제·어떻게** — 렌더 중에도 바꿀 수 있습니다. 리미터를 켜고 끄는 것은 이 함수가 아니라 `STRenderOptions.useLimiter`(기본 `1`, `st_rt_render_set_options`)입니다. 종류를 바꾸면 리미터 지연이 달라지므로 `st_rt_render_get_limiter_latency_samples`를 다시 읽습니다. 스레드: `[control]` — 렌더 스테이지를 바꾸는 제어 스레드 호출이라 오디오 콜백에서 부르지 않습니다. true-peak 종류 지원은 `ST_CAP1_TRUE_PEAK_OUTPUT_LIMITER`(능력 워드 1), 룩어헤드 리미터는 `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`(능력 워드 0)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `type` | `STOutputLimiterType`. `0`·`1`·`2` 밖의 값은 `LEGACY_ENVELOPE`로 처리됩니다 |

**`STOutputLimiterType` 값**

| 값 | 동작 |
|---|---|
| `ST_OUTPUT_LIMITER_LEGACY_ENVELOPE`(0) | 룩어헤드 없음, 2 ms attack, −0.2 dBFS 샘플 피크 + ±1 하드 클립(참조용). 지연 0 |
| `ST_OUTPUT_LIMITER_LOOKAHEAD_PEAK`(1) | 룩어헤드 선형 램프, −0.2 dBFS 샘플 피크(참조용). 지연 = 룩어헤드 |
| `ST_OUTPUT_LIMITER_TRUE_PEAK`(2, 기본) | ITU-R BS.1770-5 4× true-peak 사이드체인, 천장 −1 dBTP(고정), 룩어헤드(= attack) + hold 10 ms + 자동 release 60→400 ms. 출력 true-peak가 천장을 넘지 않습니다. 지연 = `max(lookahead, 1) + 5` 샘플(기본 132 → 137, 3.1 ms) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_get_limiter_type</code> — 현재 출력 리미터 종류를 읽는다</summary>

```c
int st_rt_render_get_limiter_type(const STRT_Context* context);
```

**용도** — `st_rt_render_set_limiter_type`로 건 리미터 종류를 돌려줍니다.

**언제·어떻게** — 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STOutputLimiterType` 값(기본 `2` = `TRUE_PEAK`). 컨텍스트가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_render_set_limiter_lookahead_samples</code> — 리미터 룩어헤드 길이를 정한다</summary>

```c
int st_rt_render_set_limiter_lookahead_samples(STRT_Context* context, int samples);
```

**용도** — `LOOKAHEAD_PEAK`·`TRUE_PEAK` 리미터가 피크를 미리 보는 길이(= attack)를 샘플 단위로 정합니다. 길수록 이득 변화가 부드럽고, 짧을수록 출력 지연이 줄어듭니다.

**언제·어떻게** — 룩어헤드 버퍼를 다시 구성합니다. 바꾼 뒤에는 `st_rt_render_get_limiter_latency_samples`로 실제 지연을 다시 읽습니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `samples` | 룩어헤드 샘플 수(44.1 kHz 엔진 샘플), `[0, ST_OUTPUT_LIMITER_MAX_LOOKAHEAD_SAMPLES]` = `[0, 511]`. 기본 `ST_OUTPUT_LIMITER_DEFAULT_LOOKAHEAD_SAMPLES` = 132(3 ms) |

**반환** — `1` = 적용 / `0` = 거절(범위 밖, 컨텍스트 `NULL`).

</details>

<details>
<summary><code>st_rt_render_get_limiter_lookahead_samples</code> — 리미터 룩어헤드 길이를 읽는다</summary>

```c
int st_rt_render_get_limiter_lookahead_samples(const STRT_Context* context);
```

**용도** — 현재 리미터 룩어헤드 샘플 수를 돌려줍니다.

**언제·어떻게** — 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 룩어헤드 샘플 수(기본 `132`). 컨텍스트가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_render_get_limiter_latency_samples</code> — 리미터가 더하는 출력 지연을 읽는다</summary>

```c
int st_rt_render_get_limiter_latency_samples(const STRT_Context* context);
```

**용도** — 출력 리미터가 신호에 더하는 고정 지연을 엔진 샘플 단위로 돌려줍니다. 영상·입력 이벤트와의 싱크 보정, 측정 시 정렬에 씁니다.

**언제·어떻게** — 리미터 종류·룩어헤드·`useLimiter`를 바꾼 뒤 다시 읽습니다. 값은 다음 규칙을 따릅니다.

- `useLimiter` = 1 · `TRUE_PEAK`: `max(lookahead, 1) + 5`(기본 137 샘플, 3.1 ms)
- `useLimiter` = 1 · `LOOKAHEAD_PEAK`: `lookahead`
- `useLimiter` = 1 · `LEGACY_ENVELOPE`: 0
- `useLimiter` = 0: 0

스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 리미터 지연(샘플). 컨텍스트가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_render_set_master_gain_db</code> — 마스터 출력 게인을 정한다</summary>

```c
int st_rt_render_set_master_gain_db(STRT_Context* context, float gainDb);
```

**용도** — 렌더 출력단의 볼륨입니다. 전파·IR 결과를 무효화하지 않으므로 IR 재계산 없이 전체 음량을 조절할 때 씁니다. 출력 EQ 뒤·리미터 앞에 걸려 키운 만큼은 리미터가 받습니다. 스테레오·스피커 레이아웃 등 채널 수와 무관하게 모든 출력에 걸립니다.

**언제·어떻게** — 렌더 중 언제든 부를 수 있습니다. 값이 바뀌면 20 ms 선형 램프로 넘어가고, 0 dB이면 곱셈을 하지 않습니다. 등라우드니스 보정의 `followMasterGain`이 켜져 있으면 보정도 이 게인을 따라 다시 계산됩니다(`st_rt_render_set_loudness_compensation` 참고). 스레드: `[control]` — 출력단만 바꾸며 오디오 콜백에서 부르지 않습니다. 지원 여부는 `ST_CAP1_MASTER_GAIN`(능력 워드 1)으로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `gainDb` | 게인 [dB], `[ST_MASTER_GAIN_MIN_DB, ST_MASTER_GAIN_MAX_DB]` = `[−96, +24]`. 기본 0 |

**반환** — `1` = 적용 / `0` = 실패. 비유한 값·범위 밖이면 `ST_STATUS_INVALID_ARGUMENT`이고 아무것도 바꾸지 않습니다. `ST_BACKEND_EXA` 백엔드 컨텍스트는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_rt_render_get_master_gain_db</code> — 마스터 출력 게인을 읽는다</summary>

```c
float st_rt_render_get_master_gain_db(const STRT_Context* context);
```

**용도** — 저장된 마스터 게인 [dB]을 돌려줍니다.

**언제·어떻게** — 스레드: `[control]` — 오디오라이저 컨트롤 락을 짧게 잡고 저장값을 복사합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 마스터 게인 [dB](기본 `0`). 컨텍스트가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_render_set_loudness_compensation</code> — 등라우드니스 보정(ISO 226)을 설정한다</summary>

```c
int st_rt_render_set_loudness_compensation(STRT_Context* context, const STLoudnessCompensationDesc* desc);
```

**용도** — 사람 귀는 콘텐츠가 균형 잡힌 기준 레벨보다 작게 재생되면 저역·초고역을 덜 듣습니다. 이 단은 ISO 226:2003 등라우드니스 곡선 두 개(기준 레벨 R, 재생 레벨 P)의 모양 차를 저역 셸프와 고역 셸프로 근사해 되돌립니다. P가 R보다 크면 반대로 깎습니다. 엔진은 절대 SPL을 모르므로 레벨은 호스트가 phon(1 kHz 순음 dB SPL)으로 줍니다.

**언제·어떻게** — 출력단(스테레오·바이노럴과 스피커 레이아웃 모두)에서 출력 EQ 뒤, 마스터 게인·리미터 앞에 등라우드니스 보정 → 가상 베이스 순으로 걸립니다. 전파·IR 결과를 무효화하지 않습니다. `st_rt_create` 직후 **켜져 있고** 마스터 게인을 따라갑니다(기준 83 → 재생 70 phon, 120 Hz에서 저역 약 +7.2 dB, 고역 +1.8 dB). 미들웨어·게임 믹스처럼 출력 음색을 호스트가 소유하는 통합에서는 생성 직후 끄는 것을 검토합니다. 끈 동안은 샘플을 건드리지 않습니다.

켜고 끄기·값 변경은 클릭 없이 넘어갑니다(셸프 파라미터 50 ms smoothstep 램프, 끌 때는 0 dB 도착 뒤 5.8 ms 원 신호 크로스페이드). 출력 채널 수가 바뀌면(스피커 레이아웃 변경 등) 이력을 비우고 켬과 같은 램프로 다시 들어갑니다. `followMasterGain`이면 볼륨 변경 때 마스터 게인 램프(20 ms)와 함께 움직이지만 별도 명령이라 시작이 최대 한 블록 어긋날 수 있습니다(각각 램프라 불연속은 없음). 32채널을 넘는 커스텀 스피커 레이아웃에는 걸리지 않습니다.

기본값을 유지한 채 켜고 끄려면 get으로 채운 뒤 `enabled`만 바꿔 set합니다.

```c
STLoudnessCompensationDesc d = { sizeof d, ST_ABI_VERSION };
st_rt_render_get_loudness_compensation(ctx, &d);
d.enabled = 0;                                  /* 끄기 */
st_rt_render_set_loudness_compensation(ctx, &d);
```

스레드: `[control]` — 출력단만 바꾸며, 제어 스레드에서 ISO 226 피팅(수십 µs)을 합니다. 지원 여부는 `ST_CAP1_LOUDNESS_COMPENSATION`(능력 워드 1)으로 확인합니다. 오프라인 라이브러리에는 없습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `desc` | 설정. 호출자가 `structSize` / `apiVersion`을 채우고 `reserved`는 0이어야 합니다 |

**구조체** `STLoudnessCompensationDesc`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STLoudnessCompensationDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1. 생성 직후 1 |
| `followMasterGain` | 0/1. 1이면 실효 재생 레벨 = `playbackLevelPhon` + 마스터 게인 dB. `playbackLevelPhon`을 "마스터 게인 0 dB일 때의 재생 레벨"로 한 번 맞춰 두면 마스터 게인을 볼륨 노브로 쓰는 호스트에서 보정이 자동으로 따라갑니다. 생성 직후 1 |
| `referenceLevelPhon` | 기준 청취 레벨 `[0, 120]` phon, 기본 83(영화·음악 마스터링 기준 모니터 레벨) |
| `playbackLevelPhon` | 실제 재생 레벨 `[0, 120]` phon, 기본 70(가정·헤드폰 통상 청취 레벨). 기준과 같으면 보정 0 |
| `bassScale` | 저역 셸프 게인 배율 `[0, 1]`, 기본 1(ISO 그대로) |
| `trebleScale` | 고역 셸프 게인 배율 `[0, 1]`, 기본 1. 0이면 저역만 보정 |
| `maxShelfGainDb` | 셸프 게인 절대값 상한 `[0, 40]` dB(배율 뒤에 적용), 기본 15. 저역 셸프가 상한에 닿으면 게인만 자르지 않고 "셸프가 상한에 닿는 재생 레벨"의 모양(코너·기울기)을 씁니다. 고역 셸프는 모양이 고정이라 게인만 자릅니다 |
| `reserved[5]` | 0 |

ISO 식의 유효 범위(20 Hz–4 kHz는 20–90 phon, 5–12.5 kHz는 20–80 phon) 밖의 레벨은 그 주파수에서 끝 레벨 등고선의 모양으로 평가합니다(R·P가 둘 다 80 phon을 넘으면 고역 보정 0). 1.25–5 kHz의 ISO 오목부(수 dB 미만)는 셸프로 만들지 않습니다. 근사 오차는 레벨 차가 크고 낮은 쪽 레벨이 낮을수록 커집니다(중역 기준 ISO 표 최대 오차: 83→70 0.5 dB, 83→60 0.9 dB, 83→40 1.9 dB, 90→20 3.7 dB).

**반환** — `1` = 적용 / `0` = 실패. `NULL`·필드 범위 밖·`reserved` ≠ 0이면 `ST_STATUS_INVALID_ARGUMENT`, 스탬프 불일치면 `ST_STATUS_VERSION_MISMATCH`(둘 다 아무것도 바꾸지 않음). `ST_BACKEND_EXA` 백엔드 컨텍스트는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_rt_render_get_loudness_compensation</code> — 등라우드니스 보정 설정을 읽는다</summary>

```c
int st_rt_render_get_loudness_compensation(const STRT_Context* context, STLoudnessCompensationDesc* outDesc);
```

**용도** — 저장된 등라우드니스 보정 설정(요청값)을 돌려줍니다. 한 번도 set하지 않았으면 생성 직후 기본값을 채웁니다. 기본값을 유지한 채 일부 필드만 바꿀 때 먼저 부릅니다.

**언제·어떻게** — 스레드: `[control]` — 오디오라이저 컨트롤 락을 짧게 잡고 저장값을 복사합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outDesc` | 출력. 호출자가 `structSize` / `apiVersion`을 채웁니다. 필드는 `st_rt_render_set_loudness_compensation` 항목 참고 |

**반환** — `1` = 성공 / `0` = 실패. `ST_BACKEND_EXA` 백엔드 컨텍스트는 기본값(꺼짐)을 채웁니다.

</details>

<details>
<summary><code>st_rt_render_set_virtual_bass</code> — 가상 베이스(배음 합성)를 설정한다</summary>

```c
int st_rt_render_set_virtual_bass(STRT_Context* context, const STVirtualBassDesc* desc);
```

**용도** — 저역을 재생하지 못하는 작은 드라이버·이어폰에서 저음을 느끼게 하는 missing fundamental 효과입니다. 차단 주파수 아래 저역을 떼어 2·3·4차 배음을 만들고 대역통과로 다듬어 원 신호에 더합니다. 배음 레벨은 입력 레벨에 비례합니다.

**언제·어떻게** — 출력단에서 등라우드니스 보정 뒤, 마스터 게인·리미터 앞에 걸립니다. 기본은 꺼짐입니다. 전파·IR 결과를 무효화하지 않습니다. 켜고 끄기·값 변경은 30 ms smoothstep 램프로 넘어가고, 켬·차단/대역 변경 때는 혼합 0에서 필터를 23 ms 안정시킨 뒤 올립니다. 출력 채널 수가 바뀌면 이력을 비우고 다시 들어갑니다. 스피커 레이아웃의 LFE 채널은 건너뛰고, 32채널을 넘는 커스텀 레이아웃에는 걸리지 않습니다.

저역에 여러 톤이 함께 있으면 대역 안 혼변조(합음 f1+f2 등)가 생깁니다. 예를 들어 같은 진폭의 40 Hz + 55 Hz에서는 합음 95 Hz가 2차 배음보다 8.6–10.5 dB 큽니다. 단일 톤이면 2·3·4차 배음만 나옵니다(그 밖 성분 −77 dB 이하). 적용 여부는 청음으로 판단합니다. 기본값으로 켜려면 get으로 채운 뒤 `enabled`만 1로 바꿔 set합니다. 스레드: `[control]` — 출력단만 바꾸며 오디오 콜백에서 부르지 않습니다. 지원 여부는 `ST_CAP1_VIRTUAL_BASS`(능력 워드 1)로 확인합니다. 오프라인 라이브러리에는 없습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `desc` | 설정. 호출자가 `structSize` / `apiVersion`을 채우고 `reserved`는 0이어야 합니다 |

**구조체** `STVirtualBassDesc`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STVirtualBassDesc)` / `ST_ABI_VERSION` |
| `enabled` | 0/1. 기본 0 |
| `mode` | `STVirtualBassMode` — `ST_VIRTUAL_BASS_HYBRID`(0, 기본): 원 저역을 그대로 두고 배음을 더함(저역이 나오는 이어폰 등) / `ST_VIRTUAL_BASS_HARMONICS_ONLY`(1): 원 신호를 `cutoffHz` LR4 HPF로 거르고 배음만 남김(작은 드라이버 보호) |
| `cutoffHz` | 저역 분리·HPF 차단 `[40, 160]` Hz, 기본 90 |
| `harmonicLowHz` | 배음 대역 하한 `[20, 1000]` Hz, 기본 70 |
| `harmonicHighHz` | 배음 대역 상한 `[20, 1000]` Hz, `harmonicLowHz`보다 커야 함. 기본 220 |
| `intensity` | 배음 혼합 강도(선형) `[0, 4]`. 1 = 대역통과 전 배음 에너지가 분리한 저역 에너지와 같음. 기본 0.5(−6 dB) — HYBRID에서 2차 배음이 기본파와 거의 같은 크기로 들리는 값입니다. 기본파가 없는 `HARMONICS_ONLY`는 1.0 안팎을 권합니다 |
| `reserved[6]` | 0 |

**반환** — `1` = 적용 / `0` = 실패. `NULL`·필드 범위 밖·`reserved` ≠ 0이면 `ST_STATUS_INVALID_ARGUMENT`, 스탬프 불일치면 `ST_STATUS_VERSION_MISMATCH`(둘 다 아무것도 바꾸지 않음). `ST_BACKEND_EXA` 백엔드 컨텍스트는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_rt_render_get_virtual_bass</code> — 가상 베이스 설정을 읽는다</summary>

```c
int st_rt_render_get_virtual_bass(const STRT_Context* context, STVirtualBassDesc* outDesc);
```

**용도** — 저장된 가상 베이스 설정(요청값)을 돌려줍니다. 한 번도 set하지 않았으면 기본값을 채웁니다.

**언제·어떻게** — 스레드: `[control]` — 오디오라이저 컨트롤 락을 짧게 잡고 저장값을 복사합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outDesc` | 출력. 호출자가 `structSize` / `apiVersion`을 채웁니다. 필드는 `st_rt_render_set_virtual_bass` 항목 참고 |

**반환** — `1` = 성공 / `0` = 실패. `ST_BACKEND_EXA` 백엔드 컨텍스트는 기본값(꺼짐)을 채웁니다.

</details>

<details>
<summary><code>st_rt_render_set_eq</code> — 출력 9밴드 그래픽 EQ(믹서 EQ)를 건다</summary>

```c
int st_rt_render_set_eq(STRT_Context* context, const float gainsDb[ST_FREQUENCY_BANDS], int enabled);
```

**용도** — 렌더 출력에만 걸리는 9밴드 톤 컨트롤입니다. 전파·IR 결과를 무효화하지 않습니다. 출력 EQ는 하나이고 이 함수는 출력 파라메트릭 EQ(`st_rt_render_set_parametric_eq`)의 **호환 뷰**입니다 — 엔진 밴드 중심(63…16k Hz)마다 Q 1.414 피킹 필터 9개 + 프리앰프 0 dB로 설정됩니다.

**언제·어떻게** — 렌더 중 언제든 부를 수 있습니다. 이 함수와 `st_rt_render_set_parametric_eq`는 같은 EQ의 밴드 목록 전체를 바꾸며 **마지막에 부른 쪽이 이깁니다**. 이 경로는 계수를 즉시 교체하고(램프 없음) 9채널 이상 스피커 레이아웃에서는 통과시킵니다. 토글만 하려는 경우에도 `ST_FREQUENCY_BANDS`개 게인을 반드시 같이 넘깁니다. 9밴드 전용 getter는 없으며, `st_rt_render_get_parametric_eq`가 이 설정을 9개 `PEAKING` 밴드로 돌려줍니다. 스레드: `[control]` — 출력단만 바꾸며 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `gainsDb` | 밴드 게인 [dB] `ST_FREQUENCY_BANDS`(9)개, 순서 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz. 엔진이 `[−24, +24]` dB로 clamp합니다. `NULL`이면 아무것도 하지 않습니다 |
| `enabled` | 0이면 계수는 갱신하되 우회합니다. 0 밖이면 켭니다 |

**반환** — `1` = 적용 / `0` = 실패(`gainsDb`가 `NULL` 등).

</details>

<details>
<summary><code>st_rt_render_set_parametric_eq</code> — 출력 파라메트릭 EQ를 건다</summary>

```c
int st_rt_render_set_parametric_eq(STRT_Context* context, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**용도** — 헤드폰 보정(AutoEq 프로파일 등)이나 출력 음색 조정을 위한 최대 16밴드 파라메트릭 EQ입니다. 렌더 출력에만 걸려 전파·IR 결과를 무효화하지 않습니다.

**언제·어떻게** — 렌더 중 언제든 부를 수 있고, 바뀌면 20 ms 크로스페이드로 넘어갑니다(9밴드 뷰에서 넘어올 때도). 걸리는 자리는 렌더 체인 끝, 마스터 게인 앞(스테레오·바이노럴)이고, 스피커 출력에서는 디코드·거리 정렬 뒤입니다. 모든 출력 채널(스피커 LFE 포함)에 같은 필터가 걸립니다 — 음향 합에 건 것과 같아 저역을 메인·LFE가 어떻게 나눠 내든 결과 음색이 같습니다. 채널마다 다른 보정은 `st_rt_render_set_speaker_channel_eq`를 씁니다. 64채널까지 처리합니다. `st_rt_render_set_eq`와 같은 EQ이므로 마지막에 부른 setter가 이깁니다. AutoEq 텍스트는 `st_rt_render_parse_autoeq_parametric`으로 밴드 배열로 바꿔 넣습니다. 스레드: `[control]` — 출력단만 바꾸며 오디오 콜백에서 부르지 않습니다. 지원 여부는 `ST_CAP1_OUTPUT_PARAMETRIC_EQ`(능력 워드 1)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `bands` | 밴드 배열 `bandCount`개. 호출 동안만 읽습니다. `bandCount` = 0이면 `NULL`이어도 됩니다 |
| `bandCount` | 밴드 수 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` = `[0, 16]` |
| `preampDb` | 프리앰프 [dB], `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]` = `[−48, +12]`으로 clamp. 주 용도는 클리핑 방지용 음수이며, 키우는 일은 마스터 게인이 맡습니다 |
| `enabled` | 0이면 목록은 저장하되 통과시킵니다 |

**구조체** `STParametricEqBand` (32 bytes, 배열 원소라 버전 스탬프 없음)

| 필드 | 설명 |
|---|---|
| `type` | `STParametricEqType` — `PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 이 밴드는 항등(건너뜀), 그 밖 = 켬 |
| `frequencyHz` | 중심(PEAKING·NOTCH) 또는 코너(셸프 중점·LP·HP) 주파수. `[20, min(20000, 0.49·Fs)]` Hz로 clamp |
| `gainDb` | PEAKING·LOW_SHELF·HIGH_SHELF만 사용(LP·HP·NOTCH는 저장만). `[−24, +24]` dB로 clamp |
| `q` | `[0.1, 30]`, 셸프는 `[0.1, 3]`으로 clamp(큰 Q의 셸프는 모서리에 큰 공진 피크를 만듭니다) |
| `reserved[3]` | 0이어야 합니다(아니면 거절) |

필터 정의(출력 EQ·소스 EQ·스피커 채널 EQ 공통): 밴드마다 RBJ Audio EQ Cookbook 2차 섹션 하나이고, 셸프는 Q를 쓰는 RBJ 셸프(AutoEq와 같음)입니다. Fs는 엔진 내부 표본률 44100 Hz, 계수·연산은 double Direct Form I입니다. 체인은 프리앰프 → 밴드 0..count−1 직렬입니다. `enabled` = 0인 밴드와 \|gain\| ≤ 1e-4 dB인 PEAKING·셸프는 정확히 항등이고, 전체가 꺼져 있거나 효과가 없으면(전 밴드 항등 + 프리앰프 0 dB) 샘플을 건드리지 않습니다. 값이 바뀌면 옛 설정과 새 설정을 20 ms 동안 나란히 돌려 출력을 크로스페이드하고(계수 보간이 아니라 클릭·발산 없음), 그 사이 또 바뀌면 가장 최근 값 하나만 기다렸다가 이어서 넘어갑니다. 유한 값은 위 범위로 clamp하고 getter는 clamp된 실효값을 돌려줍니다.

**반환** — `1` = 적용 / `0` = 실패. `0`일 때 `st_rt_get_last_status`:

- `ST_STATUS_INVALID_ARGUMENT` — `bandCount` 범위 밖, `bands` `NULL`(`bandCount` > 0), 비유한 값, 알 수 없는 `type`, `reserved` ≠ 0. 아무것도 바꾸지 않습니다.
- `ST_STATUS_UNAVAILABLE` — `ST_BACKEND_EXA` 백엔드 컨텍스트

</details>

<details>
<summary><code>st_rt_render_get_parametric_eq</code> — 출력 EQ 밴드 목록을 읽는다</summary>

```c
int st_rt_render_get_parametric_eq(const STRT_Context* context, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**용도** — 지금 출력 EQ의 밴드 목록(clamp된 실효값)·프리앰프·켜짐 상태를 돌려줍니다. `st_rt_render_set_eq`로 건 설정도 9개 `PEAKING` 밴드(Q 1.414)로 읽힙니다.

**언제·어떻게** — 크기를 모르면 `outBands`를 `NULL`로 불러 `outBandCount`만 받은 뒤 다시 부릅니다. `ST_PARAMETRIC_EQ_MAX_BANDS`(16)개 용량을 주면 늘 들어갑니다. 스레드: `[control]` — 오디오라이저 컨트롤 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outBands` | 밴드 출력 배열. `NULL`이면 크기 질의(밴드는 쓰지 않음). 필드는 `st_rt_render_set_parametric_eq` 항목 참고 |
| `bandCapacity` | `outBands` 용량(원소 수), 0 이상 |
| `outBandCount` | 밴드 수 출력. `NULL`이면 건너뜀 |
| `outPreampDb` | 프리앰프 [dB] 출력. `NULL`이면 건너뜀 |
| `outEnabled` | 켜짐(0/1) 출력. `NULL`이면 건너뜀 |

**반환** — `1` = 성공(크기 질의 포함) / `0` = 실패. `0`일 때 `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`(`bandCapacity < 0`) / `ST_STATUS_BUFFER_TOO_SMALL`(용량이 밴드 수보다 작음 — 이때도 개수·프리앰프·켜짐은 씁니다) / `ST_STATUS_UNAVAILABLE`(`ST_BACKEND_EXA` 백엔드).

</details>

<details>
<summary><code>st_rt_render_parse_autoeq_parametric</code> — AutoEq ParametricEQ.txt를 밴드 배열로 파싱한다</summary>

```c
int32_t st_rt_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**용도** — AutoEq의 `ParametricEQ.txt`(Equalizer APO 문법의 부분집합) 텍스트를 `STParametricEqBand` 배열과 프리앰프로 바꿉니다. 결과는 그대로 `st_rt_render_set_parametric_eq`(켜짐으로), `st_rt_source_set_parametric_eq`, `st_rt_render_set_speaker_channel_eq`에 넣습니다.

**언제·어떻게** — 컨텍스트가 필요 없고, 전역 상태·할당이 없습니다. 오프라인 라이브러리의 `st_off_render_parse_autoeq_parametric`과 같은 구현·같은 계약입니다. 스레드: `[any]` — 어느 스레드에서 불러도 블록하지 않습니다. 지원 여부는 `ST_CAP1_OUTPUT_PARAMETRIC_EQ`(능력 워드 1)에 포함됩니다.

받는 문법(대소문자 무시):

```text
Preamp: -6.2 dB
Filter 1: ON LSC Fc 105 Hz Gain 6.8 dB Q 0.70
```

- `Preamp: <수> [dB]` — 여러 줄이면 dB로 더합니다.
- `Filter[ <번호>]: ON|OFF <종류> Fc <수> [Hz] [Gain <수> [dB]] [Q <수>]` — 종류는 `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`. Q를 생략하면 셸프·LP·HP는 0.7071이고 PK·NO는 Q가 필수입니다. Gain은 PK·셸프에 필수입니다. `OFF` 필터는 `enabled` 0 밴드로 들어가 밴드 수에 셉니다.
- 빈 줄과 `#` 뒤(줄 끝 주석)는 무시하고, UTF-8 BOM·CRLF를 받습니다. 수는 로캘과 무관하게 읽습니다.
- 거절: 그 밖의 명령(`Channel`·`Device`·`GraphicEQ`·`Include` 등), `BP`·`AP`·`IIR`, 셸프 기울기 형식(`LS 6dB`), `BW Oct`, 범위 밖 값(Fc `[20, 20000]` Hz · Gain ±24 dB · Q `[0.1, 30]`, 셸프 Q `[0.1, 3]` · 프리앰프 최종합 `[−48, +12]` dB), 주석 밖 비 ASCII, 지수 표기. 파서는 clamp하지 않고 거절합니다.

| 파라미터 | 설명 |
|---|---|
| `utf8Text` | NUL 종료 UTF-8 텍스트. 필수 |
| `outBands` | 밴드 출력 배열. `bandCapacity` > 0이면 필수. `reserved`는 0으로 채워집니다 |
| `bandCapacity` | `outBands` 용량, 0 이상 |
| `outBandCount` | 밴드 수 출력. 필수 |
| `outPreampDb` | 프리앰프 [dB] 출력. 필수 |
| `outErrorLine` | 실패 시 오류 줄 번호(1부터, 줄과 무관한 오류는 0 — 프리앰프 최종합 범위 밖은 파일 끝에서 판정해 0이며, 줄 단위 오류가 있으면 그쪽이 먼저 보고됩니다). `NULL` 허용 |
| `outErrorMessage` | 실패 사유(NUL 종료 영문, 용량에 맞춰 자름). `NULL` 허용 |
| `errorMessageCapacity` | `outErrorMessage` 바이트 용량 |

**반환** — `STAutoEqParseStatus`. 성공이면 `outBands[0..*outBandCount)`와 `*outPreampDb`를 쓰고, 실패면 `*outBandCount` = 0 · `*outPreampDb` = 0입니다. 컨텍스트가 없으므로 `st_rt_get_last_status`에는 남지 않습니다.

| 값 | 뜻 |
|---|---|
| `ST_AUTOEQ_PARSE_OK`(0) | 성공 |
| `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`(1) | `utf8Text`·`outBandCount`·`outPreampDb` `NULL`, `bandCapacity < 0`, `outBands`가 `NULL`인데 `bandCapacity > 0` |
| `ST_AUTOEQ_PARSE_SYNTAX`(2) | 줄 형식 오류(수 아님·필수 필드 누락·중복·알 수 없는 토큰) |
| `ST_AUTOEQ_PARSE_UNSUPPORTED`(3) | 지원하지 않는 명령·필터 종류·기울기·BW 형식 |
| `ST_AUTOEQ_PARSE_OUT_OF_RANGE`(4) | 범위 밖 값 |
| `ST_AUTOEQ_PARSE_TOO_MANY_BANDS`(5) | `ST_PARAMETRIC_EQ_MAX_BANDS` 또는 `bandCapacity` 초과 |
| `ST_AUTOEQ_PARSE_EMPTY`(6) | `Preamp`·`Filter` 줄이 하나도 없음 |

</details>

<details>
<summary><code>st_rt_render_set_options</code> — 렌더 옵션(경로 성분·공간화·리미터 게이트)을 바꾼다</summary>

```c
void st_rt_render_set_options(STRT_Context* context, const STRenderOptions* options);
```

**용도** — 오랄라이제이션 단계의 게이트를 한 번에 바꿉니다. 직접음·투과·반사·회절·잔향 성분을 개별로 끄고 켜 청취 비교(A/B)를 하거나, 초기 반사 렌더 경로(exact 객체 / hybrid HOA bed), 공간화·HRTF, 경로 페이드, 출력 리미터를 고릅니다. 전파와 IR 변환은 같은 데이터를 계속 만들고, 이 옵션은 렌더 합성 단계만 거릅니다.

**언제·어떻게** — 렌더 중에도 부를 수 있습니다. 일부만 바꾸려면 `st_rt_render_get_options`로 현재 값을 받아 필드를 고친 뒤 넘깁니다. 스피커 출력이 활성인 동안에는 레이아웃이 early 경로(전체 앰비소닉)·`useSpatialization` = 1·`useHrtf` = 0을 소유하므로 그 값들은 유지되고 나머지 게이트만 적용됩니다. 스피커를 끈 뒤에는 `reserved0`이 다시 0/1 범위로 제한됩니다. 1차 산란 게이트(`st_rt_render_set_diffuse_rain_enabled`)는 이 구조체 밖의 값이라 이 호출이 바꾸지 않습니다. 스레드: `[control]` — IR 정책 훅이 포함된 제어 스레드 호출이라 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `options` | 새 옵션. `NULL`이면 아무것도 하지 않습니다 |

**구조체** `STRenderOptions` (버전 스탬프 없는 `int` 필드 12개, 0 = 끔 / 0 밖 = 켬)

| 필드 | 기본 | 설명 |
|---|---|---|
| `renderDirect` | 1 | 직접음 렌더 |
| `renderTransmission` | 1 | 투과음 렌더 |
| `renderReflection` | 1 | 반사음 렌더 |
| `renderDiffraction` | 1 | 회절음 렌더 |
| `renderLateReverb` | 1 | 후기 잔향(FDN 탱크). 0은 탱크만 끄고 1차 산란은 남깁니다 |
| `useDoppler` | 1 | 가변 지연 도플러(피치). 실시간에서는 무시되고 늘 1입니다 — 0을 넘겨도 켜지고 get은 1을 돌려줍니다. 움직이는 소스의 방사 이득은 별개 스위치(`st_rt_set_doppler_gain_mode`)입니다 |
| `usePathFade` | 1 | 경로 페이드. 길이는 `st_rt_render_set_path_fade_time` |
| `reserved0` | 1 | 초기 반사 렌더 경로(`STEarlySpatialMode`와 같은 번호). `0` = Objects: 모든 초기 경로를 exact 객체로 개별 렌더(경로 수에 비례해 렌더 비용이 늚). `1` = Hybrid: 리스너 전역 예산 안의 exact 객체 + 나머지 초기 반사·1차 산란은 HOA3 bed. 실시간 게임 통합은 1을 권합니다. 범위 밖 값은 `[0, 1]`로 clamp됩니다. 스피커 출력 중에는 레이아웃 전용 경로를 나타내는 다른 값이 읽힐 수 있습니다 |
| `useSpatialization` | 1 | 공간화(패닝·HRIR) 사용 |
| `useHrtf` | 0 | HRTF 바이노럴 공간화. `st_rt_render_start`의 `useHrtf` 인자가 렌더 시작 때 이 값을 정합니다 |
| `useLimiter` | 1 | 출력 리미터 켬. 종류는 `st_rt_render_set_limiter_type` |
| `outputBandPressure` | 0 | 예약 슬롯. 실시간에서는 항상 0입니다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_get_options</code> — 현재 렌더 옵션을 읽는다</summary>

```c
void st_rt_render_get_options(const STRT_Context* context, STRenderOptions* outOptions);
```

**용도** — 지금 적용된 `STRenderOptions`를 채웁니다. 일부 필드만 바꿀 때 먼저 읽는 용도입니다.

**언제·어떻게** — 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outOptions` | 출력. `NULL`이면 아무것도 하지 않습니다. 필드는 `st_rt_render_set_options` 항목 참고 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_set_diffuse_rain_enabled</code> — 1차 산란(diffuse rain) 렌더를 끄고 켠다</summary>

```c
void st_rt_render_set_diffuse_rain_enabled(STRT_Context* context, int enabled);
```

**용도** — 1차 산란은 직접음·반사음·회절음·잔향(`STRenderOptions`의 `render*`)과 나란한 독립 렌더 성분입니다. 이 게이트로 1차 산란만 끄고 켜 청취 비교를 합니다. 끄면 hybrid 경로의 rain bed 셀과 Objects 경로의 rain RIR 셀만 빠지고 FDN 꼬리는 그대로입니다. 반대로 `renderLateReverb` = 0은 탱크만 끄고 1차 산란은 남깁니다.

**언제·어떻게** — 렌더 중에도 부를 수 있으며 IR 재변환 없이 렌더 준비만 다시 합니다. `STRenderOptions` 밖의 값이라 `st_rt_render_set_options`와 스피커 레이아웃 전환이 이 값을 바꾸지 않습니다. 사운드 트레이싱을 끄면(`st_rt_render_set_sound_tracing_enabled(…, 0)`) 1차 산란도 함께 꺼집니다. 기본 1. 스레드: `[control]` — 렌더 준비를 다시 발행하는 제어 스레드 호출입니다. 지원 여부는 `ST_CAP1_RENDER_DIFFUSE_RAIN_GATE`(능력 워드 1)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | 0 = 1차 산란 끔, 0 밖 = 켬(기본) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_is_diffuse_rain_enabled</code> — 1차 산란 렌더 게이트 상태를 읽는다</summary>

```c
int st_rt_render_is_diffuse_rain_enabled(const STRT_Context* context);
```

**용도** — `st_rt_render_set_diffuse_rain_enabled`로 건 값을 돌려줍니다.

**언제·어떻게** — 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `1` = 켜짐(기본) / `0` = 꺼짐. 컨텍스트가 없으면 `-1`.

</details>

<details>
<summary><code>st_rt_render_set_sound_tracing_enabled</code> — 사운드 트레이싱 효과를 끄고 켠다(기준선 비교)</summary>

```c
void st_rt_render_set_sound_tracing_enabled(STRT_Context* context, int enabled);
```

**용도** — 사운드 트레이싱 효과를 끈 "거리 감쇠 + 패닝" 기준선과 비교하기 위한 토글입니다. `enabled` = 0은 별도의 바이패스 렌더러가 아닙니다 — 같은 추적 파이프라인을 그대로 돌리되 반사·회절·잔향·1차 산란 경로와 공기흡수·전파지연·직접음 차폐를 꺼서 거리 감쇠와 공간화만 남깁니다. 공간화 방식(`st_rt_render_set_spatializer`)은 그대로입니다.

**언제·어떻게** — 렌더 중에도 부를 수 있습니다. 끈 상태에서도 씬 setter·전파 워커·IR 변환·발행은 계속 돕니다 — 스케줄러나 데이터 펌프를 멈추는 기능이 아니며, CPU를 아끼려면 `st_rt_idle`을 씁니다. 그래서 끈 상태에서도 첫 IR이 설치된 뒤부터 소리가 납니다. 기본은 켜짐입니다. 스레드: `[control]` — 씬 락을 여러 번 잡으므로 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | 0 = 기준선(거리 감쇠 + 공간화만), 0 밖 = 사운드 트레이싱 켬(기본) |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_is_sound_tracing_enabled</code> — 사운드 트레이싱 효과가 켜져 있는지 읽는다</summary>

```c
int st_rt_render_is_sound_tracing_enabled(const STRT_Context* context);
```

**용도** — `st_rt_render_set_sound_tracing_enabled`로 건 값을 돌려줍니다.

**언제·어떻게** — 스레드: `[any]` — atomic 읽기라 어느 스레드에서 불러도 블록하지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `1` = 켜짐(기본) / `0` = 꺼짐 또는 컨텍스트 `NULL`.

</details>

<details>
<summary><code>st_rt_render_set_path_fade_time</code> — 경로 페이드 시간을 정한다</summary>

```c
void st_rt_render_set_path_fade_time(STRT_Context* context, float seconds);
```

**용도** — IR이 갱신되면서 경로가 바뀔 때 클릭 없이 넘어가도록 거는 페이드의 길이(초)를 정합니다. 소스·리스너가 움직이는 장면에서 전환의 부드러움과 반응성 사이를 조정합니다. `STRenderOptions.usePathFade`가 켜져 있을 때(기본) 쓰입니다.

**언제·어떻게** — 렌더 중에도 부를 수 있습니다. 시간 인자는 씬 단위와 무관한 초입니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `seconds` | 페이드 길이 [s], 양의 유한 값. 기본 0.05 s. 0 이하·비유한 값은 무시됩니다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_get_path_fade_time</code> — 경로 페이드 시간을 읽는다</summary>

```c
float st_rt_render_get_path_fade_time(const STRT_Context* context);
```

**용도** — 현재 경로 페이드 시간(초)을 돌려줍니다.

**언제·어떻게** — 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 페이드 시간 [s](기본 `0.05`). 컨텍스트가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_render_set_max_delay_seconds</code> — 렌더 지연 링의 최대 지연을 정한다</summary>

```c
int st_rt_render_set_max_delay_seconds(STRT_Context* context, float seconds);
```

**용도** — 렌더러가 표현할 수 있는 최대 전파 지연(초)을 정합니다. 지연이 이 한계를 넘는 exact 경로는 렌더에서 빠지고 후기 잔향은 FDN이 덮습니다. 큰 실내·야외처럼 늦게 도착하는 경로가 필요하면 늘리고, 메모리를 줄이려면 줄입니다. 지연 링 메모리는 렌더하는 소스마다 9밴드 × 링 길이로 늘어납니다. 음원 메모리 예산(`STMemoryBudget`)에서는 이 값이 소스별 지연 링의 천장입니다.

**언제·어떻게** — 지연 링을 재할당하므로 소스를 많이 만들기 전, 렌더를 시작하기 전에 정하는 것이 좋습니다. 생성 시점 값은 `STRT_CreateOptions.maxDelaySeconds`(0 = 기본 2.0 s)로도 줄 수 있습니다. 스레드: `[control, blocking]` — 지연 링 재할당이 있는 긴 구간이라 게임 루프·오디오 스레드에서 부르지 않습니다. 지원 여부는 `ST_CAP_RUNTIME_DELAY_RESIZE`(능력 워드 0)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `seconds` | 최대 지연 [s], 약 `0.012`(엔진 블록 512 + 보간 여유 8 샘플) ~ `60`. 기본 2.0. 씬 단위와 무관한 초 |

**반환** — `1` = 적용(같은 값이면 그대로 1) / `0` = 거절(범위 밖·비유한 값, 컨텍스트 `NULL`).

</details>

<details>
<summary><code>st_rt_render_get_max_delay_seconds</code> — 렌더 지연 링의 최대 지연을 읽는다</summary>

```c
float st_rt_render_get_max_delay_seconds(const STRT_Context* context);
```

**용도** — 현재 최대 지연(초)을 돌려줍니다.

**언제·어떻게** — 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 최대 지연 [s](기본 `2.0`). 컨텍스트가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_render_get_ring_buffer_samples</code> — 지연 링 길이(샘플)를 읽는다</summary>

```c
int st_rt_render_get_ring_buffer_samples(const STRT_Context* context);
```

**용도** — 현재 최대 지연에 대응하는 렌더 지연 링의 길이를 엔진 샘플(44.1 kHz) 단위로 돌려줍니다. 최대 지연 × 44100에 렌더 블록(512)과 보간 여유를 더한 값이라 메모리 추정에 씁니다.

**언제·어떻게** — `st_rt_render_set_max_delay_seconds` 뒤에 다시 읽습니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽는 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 링 길이(샘플). 컨텍스트가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_render_start</code> — 오디오 렌더를 시작한다(출력 모드별)</summary>

```c
int st_rt_render_start(STRT_Context* context, int useHrtf);
```

**용도** — 렌더 출력을 시작하고 출력 형태(헤드폰 바이노럴 / 스테레오 패닝 / 스피커 레이아웃)를 정합니다. 무엇을 띄우는지는 생성 옵션 `STRT_CreateOptions.renderOutputMode`에 따라 다릅니다.

| `renderOutputMode` | `st_rt_render_start`가 하는 일 | 출력을 가져가는 쪽 |
|---|---|---|
| `ST_RT_RENDER_OUTPUT_DEVICE`(0, 기본) | OS 오디오 장치를 열고 엔진 렌더 스레드를 띄웁니다 | 엔진이 장치까지 직접 냅니다 |
| `ST_RT_RENDER_OUTPUT_HOST_PULL`(1) | **스레드도 장치도 만들지 않고** 바이노럴/스피커 선택과 "렌더 허용" 플래그만 세웁니다. pull 버퍼와 리샘플러를 여기서 잡습니다 | 호스트가 자기 오디오 스레드에서 `st_rt_render_process`를 부릅니다 |
| `ST_RT_RENDER_OUTPUT_HOST_PULL_BUFFERED`(2) | 엔진 렌더 스레드를 띄워 출력 링(8블록 용량·3블록 목표)을 채웁니다. 장치는 없습니다 | 호스트가 `st_rt_render_process`로 링에서 복사만 합니다 |

**언제·어떻게** — 씬·소스·리스너를 준비한 뒤 부릅니다. HOST_PULL 계열에서도 **반드시 불러야 합니다** — 부르기 전 `st_rt_render_process`는 0 프레임을 돌려줍니다. HRIR 공간화를 쓸 거면 먼저 `st_rt_render_set_spatializer`로 데이터셋을 고르고 `useHrtf` = 1로 시작합니다. 스피커 레이아웃(`st_rt_render_set_speaker_layout[_custom]`)을 걸어 두고 `useHrtf` = 0으로 시작하면 그 레이아웃의 N채널로 출력하며, 스피커 출력의 활성 판정(`st_rt_render_get_speaker_channels`)은 이 호출 이후에 섭니다. 엔진이 쉬는 중(`st_rt_idle`)에 시작하면 IDLE 상태로 시작합니다. 스레드: `[control, blocking]` — DEVICE 모드는 장치·스레드 기동이 있는 긴 구간이라 게임 루프·오디오 스레드에서 부르지 않습니다. HOST_PULL 지원은 `ST_CAP_HOST_PULL_RENDER`, BUFFERED는 `ST_CAP_HOST_PULL_BUFFERED`(능력 워드 0)로 확인합니다.

스레드 수(PIPELINED 스케줄러, N = `max(3, 계산 스레드 예산)`): DEVICE = 계산 워커 N−1 + 렌더 1 + 장치 1, HOST_PULL = 계산 워커 N−1(렌더·장치 0), HOST_PULL_BUFFERED = 계산 워커 N−1 + 렌더 1(장치 0). 파일 입력이 있으면 디코더 스레드 1개가 더해집니다. 실측은 `st_rt_get_thread_inventory`로 봅니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `useHrtf` | 1 = HRTF 바이노럴 2채널(`st_rt_render_set_spatializer`로 고른 HRIR). 0 = 스테레오 패닝 2채널, 또는 스피커 레이아웃을 걸었으면 그 N채널. `STRenderOptions.useHrtf`도 이 값으로 정해집니다 |

**반환** — `1` = 시작됨(DEVICE 모드에서 이미 돌고 있으면 그대로 1) / `0` = 실패(컨텍스트 `NULL`, 장치 기동 실패 등).

</details>

<details>
<summary><code>st_rt_render_stop</code> — 오디오 렌더를 멈춘다</summary>

```c
void st_rt_render_stop(STRT_Context* context);
```

**용도** — `st_rt_render_start`로 시작한 렌더를 멈춥니다.

**언제·어떻게** — 모드별 동작:

- DEVICE: 장치를 멈추고 렌더 스레드를 join합니다.
- HOST_PULL: "렌더 허용" 플래그를 내리고 이월 FIFO를 비웁니다(다음 start가 남은 꼬리를 내보내지 않게). 이후 `st_rt_render_process`는 0을 돌려줍니다.
- HOST_PULL_BUFFERED: 렌더 스레드를 멈추고 출력 링을 버립니다. 링에 있던 몫은 스피커 세트의 `contentFrame`에 이미 세었지만 들리지 않으므로, 세트 위치를 맞추려면 버리기 전에 `contentFrame − latencyFrames`(들린 위치)를 읽고 `st_rt_speaker_set_relocate`로 다시 잡습니다.

`st_rt_render_process`와 동시에 불러도 안전합니다 — 엔진이 렌더 허용을 내리고 진행 중인 `st_rt_render_process`가 빠져나갈 때까지 기다린 뒤 멈춥니다. 오래 쉬게 할 때 장치까지 놓으려면 `st_rt_get_idle_state`가 IDLE이 된 뒤 이 함수를 부릅니다. 스레드: `[control, blocking]` — 장치 정지·스레드 join이 있어 게임 루프·오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_is_running</code> — 렌더가 돌고 있는지 읽는다</summary>

```c
int st_rt_render_is_running(const STRT_Context* context);
```

**용도** — 렌더 상태를 돌려줍니다. 출력 모드와 무관하게 일관된 뜻입니다 — DEVICE는 장치가 도는지, HOST_PULL은 장치가 아니라 "렌더 허용" 플래그(`st_rt_render_start` 뒤·`st_rt_render_stop` 전)를 봅니다.

**언제·어떻게** — 스레드: `[control]` — 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `1` = 렌더 중 / `0` = 멈춤 또는 컨텍스트 `NULL`.

</details>

<details>
<summary><code>st_rt_render_process</code> — 호스트 오디오 스레드에서 출력 블록을 가져간다(pull 렌더)</summary>

```c
int st_rt_render_process(STRT_Context* context, float* interleavedOut, int frames);
```

**용도** — HOST_PULL 계열 출력 모드의 진입점입니다. 엔진 출력이 호스트 오디오 그래프를 지나야 하는 통합 — 게임 엔진 서브믹스 이펙트, 오디오 캡처·녹화 파이프라인 등 — 에서 호스트가 자기 오디오 스레드에서 블록을 가져갑니다. HOST_PULL은 이 호출 스레드에서 렌더하고, HOST_PULL_BUFFERED는 엔진 렌더 스레드가 채운 링에서 복사만 합니다(호스트 콜백 비용 ≈ memcpy, 지터는 링이 흡수). 세 출력 모드 모두 같은 블록 함수를 쓰므로 소리는 같습니다.

**언제·어떻게** — `st_rt_render_start` 뒤, 호스트 오디오 콜백마다 부릅니다. 스레드: `[audio]` — 호스트 오디오 스레드(MMCSS/HIGHEST)에서 불러도 안전합니다. 락·할당·시스템콜을 새로 만들지 않고(버퍼와 리샘플러는 `st_rt_render_start`에서 잡고, IR 채택은 포인터 교체), 호출 스레드의 우선순위·affinity는 건드리지 않습니다. FTZ/DAZ만 이 호출 구간 동안 켰다가 원래대로 되돌립니다.

- **채널 수** — 바이노럴·스테레오면 2, 스피커 레이아웃이 활성이면 `st_rt_render_get_speaker_channels()` 값입니다. 그 함수가 0을 돌려주면 출력은 **2채널**입니다 — 0을 채널 수로 쓰지 않습니다.
- **레이아웃 전환** — 렌더 중에 `st_rt_render_set_speaker_layout[_custom]` / `st_rt_render_disable_speaker_output`을 부르면 pull 출력이 재구성됩니다(채널 수·엔진 블록·이월 FIFO·출력 리샘플러). 전환은 이 함수와 동시에 불러도 안전합니다 — 엔진이 렌더 허용을 내리고 진행 중인 호출이 빠져나갈 때까지 기다린 뒤 바꿉니다(`st_rt_render_start` / `stop`도 같음). 전환 창에 걸린 호출은 **0 프레임**을 돌려주므로 그 블록은 호스트가 무음으로 처리합니다. 전환 뒤에는 `st_rt_render_get_speaker_channels()`를 다시 읽어 그 폭으로 버퍼를 잡습니다.
- **언더런** — 소스 스트림이 요청보다 적게 채워졌으면 그 소스는 무음으로 채우고 `STStreamStatus.underrunFrames`에 누적합니다. **절대 stall하지 않습니다.** BUFFERED에서 블록당 렌더 비용이 지속적으로 블록 시간(11.61 ms)을 넘으면 링도 막지 못해, 그 언더런은 엔진 링 카운터에 잡히고 무음으로 채워집니다.
- **임의 `frames`** — 내부는 512프레임 엔진 블록으로 렌더하고 남는 몫은 이월 FIFO에 둡니다. 호스트 블록이 512의 배수가 아니어도(예: 48 kHz에서 1024 = 941.6 엔진 프레임) stall하지 않지만, FIFO에 남은 몫은 그만큼 지연입니다. 지연 상한은 1 엔진 블록 + 리샘플러 지연이고, 호스트 블록이 512의 배수면 이월 잔량은 0으로 고정됩니다(`st_rt_render_get_latency_frames` 참고).
- **샘플레이트** — `frames`는 `STRT_CreateOptions.hostSampleRate`(0이면 엔진 레이트 44100) 단위입니다. 0이 아니면 엔진이 출력 쪽 변환을 합니다(BUFFERED는 렌더 스레드에서 변환).

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `interleavedOut` | 출력 버퍼. interleaved float, `frames × 채널 수`개를 담아야 합니다 |
| `frames` | 요청 프레임 수(호스트 레이트), 1 이상 |

**반환** — 실제로 쓴 프레임 수(정상은 `frames`). 부분 반환(`0 < 반환 < frames`)이면 나머지는 무음으로 채워져 있습니다. `0`인 경우와 `st_rt_get_last_status`:

| 상황 | 상태 |
|---|---|
| 컨텍스트·버퍼 `NULL`, `frames` ≤ 0 | `ST_STATUS_INVALID_ARGUMENT` |
| DEVICE 모드 컨텍스트 | `ST_STATUS_UNAVAILABLE` |
| `st_rt_render_start` 전 | `ST_STATUS_UNAVAILABLE` |
| 레이아웃 전환 창 | 0 프레임(무음 처리) |

</details>

<details>
<summary><code>st_rt_render_get_latency_frames</code> — pull 출력단이 들고 있는 지연을 읽는다</summary>

```c
int st_rt_render_get_latency_frames(const STRT_Context* context);
```

**용도** — pull 경로의 **출력단**이 지금 들고 있는 지연을 호스트 프레임으로 돌려줍니다. A/V 싱크 보정에 씁니다.

지연 = 이월 FIFO 잔량 + 출력 리샘플러 지연 + 입력 리샘플러 고정 지연

**언제·어떻게** — 고정값이 아니라 **호출 시점의 스냅샷**입니다. 요청 `frames`가 512의 배수가 아니면 호출마다 이월 잔량만큼(0..511 엔진 프레임 상당) 흔들리고, 상한은 1 엔진 블록 + 리샘플러 지연입니다. A/V 싱크에 쓸 때는 블록 처리 **직전**에 한 번 읽습니다. `hostSampleRate` = 0(무변환)에서도 이월 FIFO가 있으므로 0이 아닐 수 있습니다. BUFFERED 모드에서는 링에 쌓인 프레임(호스트 레이트) + 변환기 지연이며 상한은 약 3 엔진 블록입니다. 스레드: `[any]` — 어느 스레드에서 불러도 블록하지 않습니다.

이 값은 출력단의 몫만 셉니다. "지금 민 입력 프레임이 몇 프레임 뒤에 나오나"의 전체 답은 이 값 + `STStreamStatus.queuedFrames` + 엔진 DSP의 고정 지연(리미터 지연 등, 설정이 같으면 상수)입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 지연(호스트 프레임). DEVICE 모드에서는 언제나 `0`.

</details>

<details>
<summary><code>st_rt_render_get_process_stats</code> — 마지막 렌더 블록의 단계별 시간을 읽는다</summary>

```c
int st_rt_render_get_process_stats(const STRT_Context* context, STProcessStats* outStats);
```

**용도** — 마지막으로 끝난 512프레임 렌더 블록 하나의 단계별 순수 연산 시간(µs)과 탭 수를 돌려줍니다. "렌더가 왜 무거운가"를 호스트가 엔진 내부를 보지 않고 가를 때 씁니다. 세 출력 모드 모두 같은 블록 함수라 값의 뜻이 같습니다(HOST_PULL은 호스트 콜백 안에서 잰 값).

**언제·어떻게** — 렌더 중 언제든, 어느 스레드에서든 부를 수 있습니다. 스레드: `[any]` — seqlock 스냅샷(필드별 atomic, 최대 8회 재시도)이라 블록하지 않습니다. 지원 여부는 `ST_CAP_PROCESS_STATS`(능력 워드 0)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outStats` | 출력. 호출자가 `structSize` / `apiVersion`을 채웁니다 |

**구조체** `STProcessStats`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STProcessStats)` / `ST_ABI_VERSION` |
| `blockSequence` | 블록마다 +1. 0 = 아직 블록이 돈 적 없음(무음 프리롤 동안도 0) |
| `sourceInputUs` | 소스 입력 읽기 + 9밴드 크로스오버 + 밴드 지연 링 쓰기(소스 합) |
| `exactTapsUs` | exact 경로 탭 렌더(HRIR 버스 누적 또는 스테레오 패닝, 소스 합) |
| `bedUs` | early bed — 소스별 send 버스 합 + 병합 bed 컨볼루션 |
| `sendUs` | 잔향 send — 소스별 밴드 버스 합 + 리스너 전역 send 탭 렌더 |
| `lateUs` | FDN16 후기 잔향 |
| `outputUs` | 나머지 — HRTF 스펙트럼 합성·HOA 디코드·EQ·리미터·모드 페이드 |
| `totalUs` | 블록 전체(`STTiming.auralProcessMs`와 같은 구간). 여섯 단계의 합은 이 값과 같거나 약간 작습니다 |
| `activeSources` | 입력이 붙은 소스 수 |
| `exactTaps` | 그 블록이 실제로 렌더한 exact 탭 수(소스 합) |
| `sendTaps` | 리스너 전역 send 탭 수 — 소스 수와 무관하고 시간 bin 수가 상한입니다 |
| `reserved[8]` | 예약 |

**반환** — `1` = 성공 / `0` = 실패. `NULL`·스탬프 불일치는 `ST_STATUS_VERSION_MISMATCH`, 엔진 미초기화는 `ST_STATUS_INVALID_CONTEXT`, 스냅샷 실패는 `ST_STATUS_UNAVAILABLE`(`outStats` 무변경).

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout</code> — 프리셋 스피커 레이아웃으로 출력한다</summary>

```c
int st_rt_render_set_speaker_layout(STRT_Context* context, int preset);
```

**용도** — 헤드폰 바이노럴 대신 실제 스피커 배치(2.0~7.1)로 N채널 출력을 냅니다. 스피커 출력에서는 레이아웃이 전체 앰비소닉 early 경로·공간화 켬·HRTF 끔을 소유합니다(`st_rt_render_set_options` 참고).

**언제·어떻게** — 보통 `st_rt_render_start(context, 0)` 전에 겁니다. 렌더 중에 부르면 오디오 장치를 stop → 적용 → start로 재기동하고, 장치가 N채널 포맷을 거부하면 스테레오로 한 번 강등해 재시도합니다. HOST_PULL 계열에서는 pull 출력이 재구성되며, 그동안 `st_rt_render_process`는 0 프레임을 돌려줍니다. 부른 뒤 `st_rt_render_get_speaker_channels()`로 실제 출력 폭을 다시 읽습니다. 레이아웃을 걸 때마다(같은 레이아웃이라도) 스피커 채널 EQ가 전부 비워지므로 채널 EQ는 레이아웃을 건 뒤에 설정합니다. 스레드: `[control, blocking]` — 장치 재기동이 있어 게임 루프·오디오 스레드에서 부르지 않습니다.

채널 순서는 WAVEFORMATEXTENSIBLE 표준 순서(FL FR FC LFE BL BR SL SR 중 레이아웃에 없는 채널은 건너뜀)를 따르고, 방향 규약은 엔진 전역과 같습니다(azimuth 정면 0° · 오른쪽 +90°, elevation 위쪽 +).

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `preset` | `0` = 2.0 / `1` = 2.1 / `2` = 4.1 / `3` = 5.1 / `4` = 7.1 / `5` = 랩톱 근접 2.0 |

`5`(LaptopNearfield20, "MacBook Pro 16-inch reference")는 정확히 2 PCM 채널이고 `0`과 다른 것은 청취 기하(반각 30° → 15.642°)뿐입니다. 기기·OS가 소유한 내장 스피커 처리(우퍼·와이드 스테레오·공간 음향 DSP 등)는 건드리지 않습니다.

**반환** — `1` = 적용 / `0` = 실패. 범위 밖 `preset`이면 아무것도 하지 않고 `0`.

</details>

<details>
<summary><code>st_rt_render_set_speaker_layout_custom</code> — 임의 스피커 배치로 출력한다</summary>

```c
int st_rt_render_set_speaker_layout_custom(STRT_Context* context, const float* azimuthDegrees, const float* elevationDegrees, const unsigned char* isLfe, const float* gainTrim, const float* distanceMeters, int channelCount);
```

**용도** — 프리셋에 없는 스피커 배치(돔·불규칙 배열 등)를 채널별 방향·LFE 여부·트림·거리로 직접 정의합니다. 거리를 주면 가장 먼 스피커를 기준으로 지연·1/r 레벨을 정렬해 스피커까지 거리가 다른 설치를 보정합니다.

**언제·어떻게** — 호출 시점·재기동·채널 EQ 초기화·`st_rt_render_get_speaker_channels` 재확인은 `st_rt_render_set_speaker_layout`과 같습니다. 채널 순서는 배열 순서이고, 방향 규약은 엔진 전역과 같습니다(azimuth 정면 0° · 오른쪽 +90°, elevation 위쪽 +). 리미터·등라우드니스 보정·가상 베이스는 32채널까지, 출력 파라메트릭 EQ·스피커 채널 EQ는 64채널까지 걸립니다. 스레드: `[control, blocking]` — 장치 재기동이 있어 게임 루프·오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `azimuthDegrees` | 채널별 방위각 [°] `channelCount`개. 필수 |
| `elevationDegrees` | 채널별 고도각 [°] `channelCount`개. 필수 |
| `isLfe` | 채널별 LFE 여부(0/1) `channelCount`개. 필수 |
| `gainTrim` | 채널별 선형 트림 `channelCount`개. `NULL`이면 모두 1.0 |
| `distanceMeters` | 채널별 스피커 거리 [m] `channelCount`개(씬 단위가 아니라 미터). `NULL`이 아니고 모든 비-LFE 채널이 양수면 렌더 출력단에서 가장 먼 스피커 기준 지연·1/r 레벨 정렬을 겁니다. `NULL`이면 정렬하지 않습니다 |
| `channelCount` | 채널 수, 1 이상 |

**반환** — `1` = 적용 / `0` = 실패(`azimuthDegrees`·`elevationDegrees`·`isLfe`가 `NULL`이거나 `channelCount` ≤ 0 등).

</details>

<details>
<summary><code>st_rt_render_disable_speaker_output</code> — 스피커 출력을 끄고 스테레오로 돌아간다</summary>

```c
void st_rt_render_disable_speaker_output(STRT_Context* context);
```

**용도** — 스피커 레이아웃 출력을 끄고 기본 스테레오(2채널) 경로로 되돌립니다.

**언제·어떻게** — 렌더 중이면 장치 재기동(DEVICE) 또는 pull 출력 재구성(HOST_PULL 계열)이 일어나며, 그동안 `st_rt_render_process`는 0 프레임을 돌려줍니다. 스피커 채널 EQ가 전부 비워지고, `STRenderOptions.reserved0`은 다시 0/1 범위로 제한됩니다. 스레드: `[control, blocking]` — 장치 재기동이 있어 게임 루프·오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_render_get_speaker_channels</code> — 스피커 출력 채널 수를 읽는다</summary>

```c
int st_rt_render_get_speaker_channels(STRT_Context* context);
```

**용도** — 스피커 출력이 활성이면 현재 출력 채널 수를 돌려줍니다. HOST_PULL 계열에서는 실제 `st_rt_render_process` 출력 폭과 일치합니다(0이면 2채널).

**언제·어떻게** — 활성 판정은 `st_rt_render_start` 이후에 섭니다 — 레이아웃만 걸고 렌더를 시작하지 않았으면 아직 0입니다. 레이아웃을 바꾼 뒤에는 다시 읽어 버퍼 폭을 맞춥니다. 스레드: `[control]` — 비원자 멤버 읽기라 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 출력 채널 수. 스피커 출력이 비활성이면 `0`(이때 출력은 2채널).

</details>

<details>
<summary><code>st_rt_render_set_speaker_channel_eq</code> — 스피커 출력 채널 하나에 EQ를 건다(룸 보정)</summary>

```c
int st_rt_render_set_speaker_channel_eq(STRT_Context* context, int32_t channelIndex, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**용도** — 물리 스피커마다 잰 룸 보정처럼 출력 채널 하나에만 거는 파라메트릭 EQ입니다. 전 채널 공통 톤은 출력 EQ(`st_rt_render_set_parametric_eq`)가 맡습니다.

**언제·어떻게** — 스피커 경로에서 전역 출력 EQ 바로 뒤, 마스터 게인 앞에 걸립니다. 스피커 레이아웃 출력에서만 걸리고, 스테레오·바이노럴 출력에는 효과가 없습니다. 설정하지 않은(또는 꺼진·효과 없는) 채널은 샘플을 건드리지 않습니다. **레이아웃을 걸 때마다(`st_rt_render_set_speaker_layout[_custom]`, 같은 레이아웃이라도) 그리고 `st_rt_render_disable_speaker_output` 때 전 채널이 비워집니다** — 채널 번호의 뜻이 레이아웃마다 달라(같은 3번이 5.1에서는 LFE) 옛 번호에 남기면 엉뚱한 스피커에 걸리기 때문입니다. 레이아웃을 건 뒤에 설정합니다. 채널 수는 `st_rt_render_get_speaker_channels`와 달리 `st_rt_render_start` 전이어도 레이아웃을 건 직후부터 셉니다. 값이 바뀌면 20 ms 크로스페이드로 넘어갑니다. 스레드: `[control]` — 출력단만 바꾸며 오디오 콜백에서 부르지 않습니다. 지원 여부는 `ST_CAP1_SPEAKER_CHANNEL_EQ`(능력 워드 1)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `channelIndex` | 출력 채널 번호(레이아웃 채널 순서, LFE 포함), `[0, 레이아웃 채널 수)`. 64채널까지 |
| `bands` | 밴드 배열 `bandCount`개. `bandCount` = 0이면 `NULL` 허용. `STParametricEqBand` 필드·필터 정의는 `st_rt_render_set_parametric_eq` 항목 참고 |
| `bandCount` | 밴드 수 `[0, ST_PARAMETRIC_EQ_MAX_BANDS]` |
| `preampDb` | 프리앰프 [dB], `[−48, +12]`으로 clamp |
| `enabled` | 0이면 목록은 저장하되 통과 |

**반환** — `1` = 적용 / `0` = 실패. `0`일 때 `st_rt_get_last_status`: `ST_STATUS_INVALID_ARGUMENT`(채널 범위 밖·레이아웃 없음, 그 밖 검증은 `st_rt_render_set_parametric_eq`와 같음) / `ST_STATUS_UNAVAILABLE`(`ST_BACKEND_EXA` 백엔드).

</details>

<details>
<summary><code>st_rt_render_get_speaker_channel_eq</code> — 스피커 채널 EQ를 읽는다</summary>

```c
int st_rt_render_get_speaker_channel_eq(const STRT_Context* context, int32_t channelIndex, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**용도** — 출력 채널 하나의 EQ 밴드 목록(clamp된 실효값)·프리앰프·켜짐을 돌려줍니다. 설정하지 않은 채널은 0밴드·꺼짐입니다.

**언제·어떻게** — 출력 규약(크기 질의, `NULL` 출력 건너뛰기, 용량 부족 처리)은 `st_rt_render_get_parametric_eq`와 같습니다. 스레드: `[control]` — 오디오라이저 컨트롤 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `channelIndex` | 출력 채널 번호, `[0, 레이아웃 채널 수)` |
| `outBands` | 밴드 출력 배열. `NULL`이면 크기 질의 |
| `bandCapacity` | `outBands` 용량, 0 이상 |
| `outBandCount` | 밴드 수 출력. `NULL`이면 건너뜀 |
| `outPreampDb` | 프리앰프 [dB] 출력. `NULL`이면 건너뜀 |
| `outEnabled` | 켜짐(0/1) 출력. `NULL`이면 건너뜀 |

**반환** — `1` = 성공 / `0` = 실패(`ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_BUFFER_TOO_SMALL` / `ST_STATUS_UNAVAILABLE`, 뜻은 `st_rt_render_get_parametric_eq`와 같음).

</details>

<details>
<summary><code>st_rt_render_clear_speaker_channel_eqs</code> — 모든 스피커 채널 EQ를 끈다</summary>

```c
int st_rt_render_clear_speaker_channel_eqs(STRT_Context* context);
```

**용도** — 전 채널의 스피커 채널 EQ를 한 번에 끕니다.

**언제·어떻게** — 재생 중이면 20 ms 램프로 넘어갑니다. 레이아웃이 없어도 성공합니다. 스레드: `[control]` — 출력단만 바꾸며 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `1` = 성공 / `0` = 실패(`ST_BACKEND_EXA` 백엔드는 `ST_STATUS_UNAVAILABLE`).

</details>

<details>
<summary><code>st_rt_speaker_set_create</code> — 다채널 입력을 재생할 가상 스피커 세트를 만든다</summary>

```c
STSpeakerSetId st_rt_speaker_set_create(STRT_Context* context, const STSpeakerSetDesc* desc);
```

**용도** — 스피커 세트는 다채널 PCM 입력 하나(콘텐츠 채널 C개)를 방 안의 가상 스피커 N개로 재생합니다. 스피커 하나는 엔진이 만든 소스(멤버 소스) 하나이고, 한 채널을 여러 스피커가 나눠 낼 수 있습니다(영화관 배열). 입력 링은 세트에 **하나**(interleaved)라, 렌더 블록마다 한 번 꺼내 모든 스피커가 같은 블록·같은 표본을 읽습니다 — 언더런도 전 채널 동시라 채널끼리 어긋나지 않습니다. 스테레오 입력을 3.0/5.1/7.1로 올리는 업믹스 입력도 지원합니다.

**언제·어떻게** — 씬·리스너를 준비한 뒤 만들고, `st_rt_speaker_set_write`로 링을 채운 다음 `st_rt_speaker_set_play`로 재생합니다. 멤버는 만들자마자 재생 상태로 들어가지만 세트가 play되기 전에는 무음을 냅니다. 멤버 품질 설정(광선 수·깊이·수송 갱신 단계)은 `st_rt_speaker_set_get_source`로 받은 id에 생성 뒤 아무 때나 겁니다(첫 전파 전이면 첫 IR부터 그 값). 스레드: `[control, blocking]` — 멤버 소스 N개 생성(+지향성·게인)이 있어 게임 루프·오디오 스레드에서 부르지 않습니다. 지원 여부는 `ST_CAP1_SPEAKER_SET`(능력 워드 1)으로 확인합니다.

- **한도** — 세트 `ST_SPEAKER_SET_MAX_SETS`(12)개, 세트당 채널 `ST_SPEAKER_SET_MAX_CHANNELS`(16)·스피커 `ST_SPEAKER_SET_MAX_SPEAKERS`(64). 세트는 호스트 스트림 슬롯(64)을 쓰지 않습니다. 쓰지 않는 슬롯·쉬는 세트는 렌더 블록마다 원자 읽기 몇 번뿐입니다.
- **좌표** — 스피커 포즈는 **세트 좌표**이고, 월드 = 앵커 ∘ 세트 변환 ∘ 스피커 포즈입니다. `WORLD` 앵커는 항등(방 고정), `LISTENER` 앵커는 리스너 위치 + yaw(+Y축 회전)입니다. `LISTENER` 앵커는 `st_rt_speaker_set_update`의 리스너 필드로만 다시 계산되며 일반 리스너 setter(머리 회전 포함)는 세트를 움직이지 않습니다. 생성 시점 앵커는 그때의 리스너 위치·yaw입니다. 쿼터니언은 XYZW이고 엔진이 정규화합니다(노름 `< 1e-12`는 거절). 스피커 로컬 프레임·지향성 테이블 프레임은 소스와 같습니다(forward = +Z).
- **레벨** — 멤버 볼륨(소스 볼륨과 같은 자리, 3 ms 램프) = `muted`·`silenced`면 0, 아니면 `gain × trim`. `ST_SPEAKER_SET_FLAG_ARRAY_TRIM`이면 `trim = 1/√N`이고, N은 같은 채널에서 `muted`가 아니고 `gain` > 0인 스피커 수입니다(`silenced`는 셈). LFE는 특별 처리가 없습니다. `st_rt_source_get_volume`은 램프의 목표값을 돌려줍니다.
- **멤버 소유권** — 멤버 소스는 세트가 소유합니다. 멤버 id에 대한 입력(`set_audio_*`·`attach_stream`·`clear_audio`), 재생(play/pause/stop/seek/loop/trigger/retrigger), 포즈(position/direction/velocity/orientation_q), 방사(directivity/axis_attenuation), 볼륨·피치·destroy, `st_rt_source_idle`/`_run`은 0을 돌려주거나 무시되고 `ST_STATUS_INVALID_ARGUMENT`가 남습니다. 품질 설정(광선 수·깊이·갱신 단계·EQ·경로 켜기·경로 볼륨)과 getter는 그대로 씁니다. 지향성은 생성 때 정하고, 무지향 스피커의 회전은 엔진에 보내지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `desc` | 세트 기술자. 호출자가 `structSize` / `apiVersion`을 채웁니다. 포인터 배열은 호출 동안만 읽습니다(복사) |

**구조체** `STSpeakerSetDesc`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDesc)` / `ST_ABI_VERSION` |
| `channelCount` | 콘텐츠 채널 수 `[1, ST_SPEAKER_SET_MAX_CHANNELS]` |
| `speakerCount` | 스피커 수 `[1, ST_SPEAKER_SET_MAX_SPEAKERS]` |
| `speakers` | `STSpeakerDesc` 배열 `speakerCount`개 |
| `directivities` | 공유 지향성 테이블 포인터 배열(`STSourceDirectivity`). 같은 테이블을 가리키는 스피커는 엔진 사본 하나를 같이 씁니다. 각 테이블 검증은 `st_rt_source_set_directivity`와 같습니다. `NULL` 허용(`directivityCount` 0) |
| `directivityCount` | `directivities` 원소 수 |
| `anchor` | `STSpeakerSetAnchor` — `ST_SPEAKER_SET_ANCHOR_WORLD`(0) / `ST_SPEAKER_SET_ANCHOR_LISTENER`(1) |
| `position[3]` / `rotationXYZW[4]` | 세트 변환(앵커 좌표) |
| `sampleRate` | 입력 레이트. 엔진 레이트(44100), 또는 `hostSampleRate`를 지정한 컨텍스트면 그 값이어야 합니다 |
| `capacityFrames` | 링 용량(호스트 프레임), `[512, 1048576]`. 0 = 16384 |
| `flags` | `ST_SPEAKER_SET_FLAG_ARRAY_TRIM`(채널을 공유하는 스피커 N개에 1/√N) / `ST_SPEAKER_SET_FLAG_STATIC`(멤버 소스를 정적 `isDynamic` 0으로) |
| `inputChannels` | 업믹스 입력. 0 = `channelCount` 그대로. 2 = 스테레오를 `channelCount`(3 = L R C, 6 = 5.1, 8 = 7.1)로 올림 — 이때 write는 스테레오를 받습니다 |
| `upmixWindowFrames` | 업믹스 창 길이 `[1024, 65536]` 짝수, 0 = 4096. 창 지연 = 창의 절반(기본 2048) |
| `reserved[5]` | 0 |

**구조체** `STSpeakerDesc`

| 필드 | 설명 |
|---|---|
| `channel` | 이 스피커가 내는 콘텐츠 채널 `[0, channelCount)` |
| `directivityIndex` | -1 = 무지향, 그 밖 = `STSpeakerSetDesc.directivities` 인덱스 |
| `pose` | `STSpeakerPose` — 세트 좌표 포즈와 레벨 |
| `reserved[2]` | 0 |

**구조체** `STSpeakerPose`

| 필드 | 설명 |
|---|---|
| `position[3]` / `rotationXYZW[4]` | 세트 좌표 위치·회전 |
| `gain` | 선형 압력 `[0, 16]` |
| `muted` | 0/1 — 1이면 볼륨 0이고 `ARRAY_TRIM`의 N에서 빠집니다 |
| `silenced` | 0/1 — 1이면 볼륨 0이지만 N은 그대로(측정용 단독 재생: 나머지를 `silenced`로) |
| `reserved[2]` | 0 |

**업믹스 입력**(`inputChannels` = 2) — 엔진 내장 업믹서가 좌우 성분의 레벨 차로 앞쪽 방위(±30°)를, 상관도로 앞·옆·뒤(상관 → 앞, 무상관 → 옆, 역상 → 뒤)를 잡아 스피커 고리에 에너지를 보존하며 나누고, LFE에는 (L + R)/2의 저역(80 Hz까지, 160 Hz에서 0)을 더합니다. 3.0은 가운데 뽑기라 앞에 상관으로 모인 몫만 FC로 옮기고 나머지는 L·R에 남겨 스테레오 이미지를 유지합니다(LFE 없음). 출력 채널 순서는 3.0 = FL FR FC, 5.1 = FL FR FC LFE SL SR, 7.1 = FL FR FC LFE SL SR BL BR이고(스피커 `channel` 번호와 같음), 가정하는 각은 FL −30° · FR 30° · FC 0°, 5.1 SL −110° · SR 110°, 7.1 SL −90° · SR 90° · BL −150° · BR 150°입니다. 업믹스는 write를 부른 생산자 스레드에서 호스트 레이트로 돕니다(할당 없음). 창 지연을 잘라 내 입력 프레임 n = 콘텐츠 프레임 n이지만, 입력이 `inputDelayFrames`만큼 더 들어가야 링에 나오므로 프리필을 그만큼 더 합니다. stop/relocate 뒤 첫 write가 업믹스 이력도 버립니다.

**반환** — 세트 핸들. 실패면 `v < 0`이고 만들던 멤버는 모두 지웁니다. `st_rt_get_last_status`: `ST_STATUS_VERSION_MISMATCH` / `ST_STATUS_INVALID_ARGUMENT`(범위·비유한·채널·레이트·`reserved`) / `ST_STATUS_UNAVAILABLE`(세트 `ST_SPEAKER_SET_MAX_SETS`개 소진).

</details>

<details>
<summary><code>st_rt_speaker_set_destroy</code> — 스피커 세트를 지운다</summary>

```c
int st_rt_speaker_set_destroy(STRT_Context* context, STSpeakerSetId set);
```

**용도** — 멤버 소스를 지우고(3 ms 페이드) 세트 슬롯을 반납합니다.

**언제·어떻게** — 세트가 더 필요 없을 때 부릅니다. 멤버 id에 `st_rt_source_destroy`를 부르는 것은 거절되므로 반드시 이 함수로 지웁니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `1` = 지움 / `0` = 없는 세트.

</details>

<details>
<summary><code>st_rt_speaker_set_get_source</code> — 스피커 하나의 멤버 소스 id를 얻는다</summary>

```c
STSourceId st_rt_speaker_set_get_source(STRT_Context* context, STSpeakerSetId set, int speakerIndex);
```

**용도** — `speakerIndex`번 스피커를 맡은 멤버 소스 id를 돌려줍니다. 멤버별 품질 설정(광선 수·깊이·수송 갱신 단계·EQ·경로 켜기·경로 볼륨)과 소스 getter에 씁니다.

**언제·어떻게** — 세트를 만든 뒤 아무 때나 부릅니다. 첫 전파 전에 품질을 걸면 첫 IR부터 그 값입니다. 입력·재생·포즈·방사·볼륨·피치·destroy는 세트가 소유하므로 이 id로는 거절됩니다(`st_rt_speaker_set_create` 참고). 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `speakerIndex` | 스피커 번호 `[0, speakerCount)` (`STSpeakerSetDesc.speakers` 순서) |

**반환** — 멤버 소스 id. 실패(없는 세트·범위 밖)면 `v < 0`.

</details>

<details>
<summary><code>st_rt_speaker_set_update</code> — 세트 변환·스피커 포즈·리스너를 일괄 갱신한다</summary>

```c
int st_rt_speaker_set_update(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetUpdate* update, uint32_t* outChanged);
```

**용도** — 세트 변환, 스피커 포즈·레벨 전부, 리스너 포즈, `ARRAY_TRIM` 플래그를 한 번에 바꿉니다. 값이 직전 적용값과 비트 동일하면 엔진에 보내지 않아, 매 프레임 불러도 바뀐 것만 반영됩니다.

**언제·어떻게** — 게임 루프에서 프레임마다 부를 수 있습니다. `LISTENER` 앵커 세트는 이 호출의 리스너 필드로만 다시 계산되고, 같은 호출이 엔진 리스너도 같은 배치로 옮깁니다(`st_rt_listener_set_position`/`rotation`과 같은 뜻). 원자성: SYNCHRONOUS 스케줄러는 다음 `st_rt_propagate`가 갱신 전체를 한 번에 봅니다. PIPELINED는 스피커 위치 전부와 리스너 위치를 한 리비전에 넣으며, 회전 변경은 씬 커밋이라 위치보다 작업 하나만큼 먼저 보일 수 있습니다. `outChanged`가 0이면 엔진에 아무것도 보내지 않은 것이므로 SYNCHRONOUS 호스트는 propagate를 건너뛰어도 됩니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `update` | 갱신 내용. 호출자가 `structSize` / `apiVersion`을 채웁니다. `fields`에 든 것만 읽습니다 |
| `outChanged` | 엔진에 보낸 항목 비트 출력. `NULL` 허용. `ST_SPEAKER_SET_CHANGED_LISTENER`(엔진 리스너 포즈) / `ST_SPEAKER_SET_CHANGED_POSES`(멤버 소스 월드 위치·회전) / `ST_SPEAKER_SET_CHANGED_GAINS`(멤버 소스 볼륨) |

**구조체** `STSpeakerSetUpdate`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetUpdate)` / `ST_ABI_VERSION` |
| `fields` | 읽을 항목 비트: `ST_SPEAKER_SET_UPDATE_TRANSFORM` / `_SPEAKERS` / `_LISTENER` / `_FLAGS` |
| `position[3]` / `rotationXYZW[4]` | TRANSFORM — 세트 변환(앵커 좌표) |
| `listenerPosition[3]` | LISTENER — 리스너 위치(씬 단위) |
| `listenerYaw` | LISTENER — yaw [rad], +Y축 |
| `listenerPitch` | LISTENER — pitch [rad]. 리스너에만 걸리고 앵커는 yaw만 따릅니다 |
| `speakerCount` | SPEAKERS — 세트의 스피커 수와 같아야 합니다 |
| `speakers` | SPEAKERS — `STSpeakerPose` 배열 `speakerCount`개(전부). 필드는 `st_rt_speaker_set_create` 항목 참고 |
| `flags` | FLAGS — `ST_SPEAKER_SET_FLAG_ARRAY_TRIM` 켬/끔(그 밖 비트는 0) |
| `reserved[5]` | 0 |

**반환** — `1` = 성공 / `0` = 실패.

</details>

<details>
<summary><code>st_rt_speaker_set_write</code> — 세트 링에 interleaved PCM을 쓴다</summary>

```c
int st_rt_speaker_set_write(STRT_Context* context, STSpeakerSetId set, const float* interleaved, int frames);
```

**용도** — 세트의 다채널 콘텐츠를 링에 공급합니다. 파일 디코드·웹 PCM·마이크 등 어디서 온 것이든 같은 방식으로 씁니다.

**언제·어떻게** — 재생 전에 프리필하고, 재생 중에는 `st_rt_speaker_set_get_status`의 `queuedFrames`를 보며 공급량을 맞춥니다. 렌더가 돌지 않는 동안에도 쓸 수 있고, 엔진·세트가 쉬는 동안 쓴 프레임은 링에 남았다가 깨운 뒤 나갑니다. 스레드: `[any]` — 단일 생산자 전용이며 락·할당이 없습니다(업믹스도 이 호출 스레드에서 돕니다).

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `interleaved` | interleaved float, `frames × 입력 채널 수`개. 입력 채널 수 = `channelCount`, 업믹스 입력이면 2 |
| `frames` | 프레임 수(호스트 프레임 = `STSpeakerSetDesc.sampleRate`) |

**반환** — `hostSampleRate` = 0이고 업믹스가 없으면 링에 실제로 들어간 프레임 수(백프레셔 — 나머지는 다시 씁니다). 그 밖(`hostSampleRate` 지정 또는 업믹스 입력)이면 항상 `frames`이고 백프레셔가 없으므로 `queuedFrames`로 공급량을 맞춥니다. 넘친 몫은 `droppedFrames`로만 남습니다.

</details>

<details>
<summary><code>st_rt_speaker_set_write_planar</code> — 세트 링에 채널별 배열로 PCM을 쓴다</summary>

```c
int st_rt_speaker_set_write_planar(STRT_Context* context, STSpeakerSetId set, const float* const* channels, int frames);
```

**용도** — `st_rt_speaker_set_write`와 같고 입력만 채널별(planar) 배열입니다. 디코더가 planar로 내는 경우 interleave 복사를 피합니다.

**언제·어떻게** — `st_rt_speaker_set_write`와 같습니다. 스레드: `[any]` — 단일 생산자 전용, 락·할당 없음.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `channels` | 채널 포인터 배열 `channels[입력 채널 수]`, 각 `frames`개 float. 입력 채널 수 = `channelCount`, 업믹스 입력이면 2 |
| `frames` | 프레임 수(호스트 프레임) |

**반환** — `st_rt_speaker_set_write`와 같습니다.

</details>

<details>
<summary><code>st_rt_speaker_set_play</code> — 세트 재생을 시작한다</summary>

```c
int st_rt_speaker_set_play(STRT_Context* context, STSpeakerSetId set);
```

**용도** — 세트 전체의 재생을 요청합니다. 모든 멤버가 같은 렌더 블록에서 함께 시작합니다.

**언제·어떻게** — 요청 상태는 **호출 즉시** 바뀌고, 소리는 다음 렌더 블록 경계에서 세트 전체에 한 번에 걸립니다. 그래서 렌더가 멈춘 동안에도 stop → relocate → write(프리필) → play가 쌓였다가 다음 첫 블록에서 한꺼번에 걸립니다. play는 멤버 소스를 담은 IR이 렌더러에 채택될 때까지 `ST_SPEAKER_SET_STARTING`으로 기다리고(콘텐츠를 꺼내지 않음), 그 뒤에는 링이 비어 있어도 시작합니다(언더런으로 셈) — 호스트가 먼저 채웁니다. **첫 재생은 페이드인 없이** 시작하고, 일시정지·정지 뒤 다시 시작할 때는 132표본 페이드인을 겁니다. pause 뒤 재개는 멈춘 바로 그 프레임부터입니다. 엔진이 쉬는 중이면 깨운 뒤 블록 경계에서 풀립니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `1` = 요청됨 / `0` = 실패(없는 세트 등).

</details>

<details>
<summary><code>st_rt_speaker_set_pause</code> — 세트를 일시정지한다(큐 유지)</summary>

```c
int st_rt_speaker_set_pause(STRT_Context* context, STSpeakerSetId set);
```

**용도** — 세트 전체를 일시정지합니다. 링에 쌓인 큐를 남기므로 다시 play하면 멈춘 바로 그 프레임부터 이어집니다.

**언제·어떻게** — 요청은 즉시, 소리는 다음 렌더 블록 경계에서 걸립니다. 멈출 때는 채널마다 마지막 출력 표본에서 0까지 132표본 램프를 걸고 링에서 더 꺼내지 않으므로 `contentFrame`은 실제로 낸 위치입니다. 이미 방에 나간 잔향은 계속 울립니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `1` = 요청됨 / `0` = 실패(없는 세트 등).

</details>

<details>
<summary><code>st_rt_speaker_set_stop</code> — 세트를 정지한다(큐 비움)</summary>

```c
int st_rt_speaker_set_stop(STRT_Context* context, STSpeakerSetId set);
```

**용도** — 세트 전체를 정지하고 링의 큐를 비웁니다.

**언제·어떻게** — 요청은 즉시, 소리는 다음 렌더 블록 경계에서 걸립니다(132표본 램프 아웃). 이미 방에 나간 잔향은 계속 울립니다. 탐색하려면 stop(또는 pause) 직후 `st_rt_speaker_set_relocate` → write(프리필) → play 순으로 부릅니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `1` = 요청됨 / `0` = 실패(없는 세트 등).

</details>

<details>
<summary><code>st_rt_speaker_set_relocate</code> — 세트의 콘텐츠 위치를 다시 잡는다(탐색)</summary>

```c
int st_rt_speaker_set_relocate(STRT_Context* context, STSpeakerSetId set, int64_t contentFrame);
```

**용도** — 탐색(seek)용입니다. 호출 시점까지 쓴 프레임을 버리고, 다음 꺼냄부터 `contentFrame`을 이 값에서 셉니다. 그 뒤에 쓴 프레임은 남습니다.

**언제·어떻게** — 요청 상태가 정지·일시정지일 때만 받습니다(stop 직후 바로 불러도 됩니다). 입력 리샘플러(`hostSampleRate`)·업믹스 이력도 다음 write에서 버리므로, relocate 뒤 첫 출력 표본은 그 뒤 처음 쓴 호스트 프레임(= `contentFrame` 기준값)에 표본 단위로 맞습니다. HOST_PULL_BUFFERED에서 `st_rt_render_stop`/`start`로 출력 링을 버리기 전에는 `contentFrame − latencyFrames`(들린 위치)를 읽어 두었다가 이 함수로 다시 잡습니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `contentFrame` | 새 콘텐츠 위치 기준(호스트 프레임) |

**반환** — `1` = 적용 / `0` = 실패(재생 중, 없는 세트 등).

</details>

<details>
<summary><code>st_rt_speaker_set_idle</code> — 세트(멤버 전원)를 쉬게 한다</summary>

```c
int st_rt_speaker_set_idle(STRT_Context* context, STSpeakerSetId set);
```

**용도** — 들려줄 것이 없는 세트의 계산·렌더 비용을 없앱니다. 멤버 전원을 한 번에(씬 커밋 1번) 쉬게 하고(동작은 `st_rt_source_idle`과 같음), 세트 창이 멤버와 같은 길이(지연선 길이 + 1 s) 동안 무음이고 원음 모드 지연 링도 비면 렌더 블록마다 하던 링 꺼내기·원음 믹스도 멈춥니다(블록 시각 `renderFrame`도 멈춤).

**언제·어떻게** — 재생을 멈춘 뒤(stop·pause·무음 쓰기) 부릅니다. 쉬는 동안 쓴 프레임은 링에 남았다가 깨운 뒤 나갑니다. 멤버 id에 대한 `st_rt_source_idle`/`_run`은 거절되므로 세트는 이 함수와 `st_rt_speaker_set_run`으로 다룹니다. 스레드: `[control]` — 씬 락을 잡습니다. 지원 여부는 `ST_CAP1_ENGINE_IDLE`(능력 워드 1)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `1` = 성공 / `0` = 실패(`ST_STATUS_NOT_FOUND` 없는 세트, `ST_STATUS_UNAVAILABLE`).

</details>

<details>
<summary><code>st_rt_speaker_set_run</code> — 쉬는 세트를 깨운다</summary>

```c
int st_rt_speaker_set_run(STRT_Context* context, STSpeakerSetId set);
```

**용도** — `st_rt_speaker_set_idle`로 쉬게 한 세트를 다시 돌립니다. 멤버를 먼저 깨운 뒤 세트 창을 열어, 그 사이 렌더 블록이 끼어도 콘텐츠를 잃지 않습니다.

**언제·어떻게** — 다시 재생하기 전에 부릅니다. 쉬는 동안 링에 쓴 프레임은 깨운 뒤 나갑니다. 스레드: `[control]` — 씬 락을 잡습니다. 지원 여부는 `ST_CAP1_ENGINE_IDLE`(능력 워드 1)로 확인합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `1` = 성공 / `0` = 실패(`ST_STATUS_NOT_FOUND` 없는 세트, `ST_STATUS_UNAVAILABLE`).

</details>

<details>
<summary><code>st_rt_speaker_set_get_idle_state</code> — 세트의 쉼 상태를 읽는다</summary>

```c
int st_rt_speaker_set_get_idle_state(const STRT_Context* context, STSpeakerSetId set);
```

**용도** — 세트의 쉼·실행 상태를 `STRT_IdleState`로 돌려줍니다. 세트와 멤버가 모두 쉬어야 IDLE입니다.

**언제·어떻게** — `st_rt_speaker_set_idle` 뒤 꼬리가 다 나갔는지 확인할 때 씁니다. 스레드: `[control]` — 제어 스레드용 질의입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |

**반환** — `ST_RT_IDLE_RUNNING`(0) / `ST_RT_IDLE_DRAINING`(1, 남은 소리를 내는 중) / `ST_RT_IDLE_IDLE`(2). 없는 세트·컨텍스트 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_rt_speaker_set_set_direct</code> — 원음 모드(전파를 건너뛴 직접 출력)를 설정한다</summary>

```c
int st_rt_speaker_set_set_direct(STRT_Context* context, STSpeakerSetId set, const STSpeakerSetDirect* direct);
```

**용도** — 원음 모드는 전파·오랄라이제이션을 건너뛰고 세트 채널을 출력 채널로 바로 냅니다. 켜고 끌 때 방 안의 스피커 소리와 콘텐츠 원음 사이를 같은 콘텐츠 위치에서 크로스페이드합니다. 같은 링·`contentFrame`·transport·페이드를 쓰며, 렌더 블록마다 꺼낸 같은 콘텐츠 표본을 원음 g, 젖은 경로(멤버 소스) 1 − g로 나누고 g를 크로스페이드 동안 선형으로 옮깁니다. 젖은 경로가 0이 돼도 방에 이미 나간 잔향은 자연 감쇠합니다.

**언제·어떻게** — 매번 설정 전체를 보내며 다음 렌더 블록부터 적용됩니다. 세트가 소리를 내지 않던 동안(정지·일시정지·시작 대기) 바꾼 설정은 크로스페이드 없이 바로 걸립니다 — 원음 모드로 처음 재생하면 첫 표본부터 원음만 나갑니다. 원음은 `delayFrames` 뒤에 행렬을 거쳐 출력단(출력 EQ → 마스터 게인 → 리미터) **앞**에 더해지므로 리미터·출력단 지연은 젖은 경로와 같고, 남는 차이인 젖은 경로의 전파 지연(거리/음속)을 `delayFrames`로 맞춥니다. 원음이 켜진 동안 `delayFrames`를 바꾸면 이어 붙이지 않고 건너뜁니다. 헤드폰 출력에서도 원음은 HRTF를 타지 않습니다. 원음을 한 번도 켜지 않은 세트의 출력은 이 기능이 없을 때와 비트 동일합니다. 스레드: `[control]` — 오디오 콜백에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `direct` | 원음 설정. 호출자가 `structSize` / `apiVersion`을 채웁니다 |

**구조체** `STSpeakerSetDirect`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetDirect)` / `ST_ABI_VERSION` |
| `enabled` | 0 = 젖은 경로(기본), 1 = 원음 |
| `crossfadeMs` | 전환 길이 `[0, 1000]` ms. 3 ms보다 짧으면 3 ms |
| `delayFrames` | 원음 지연(호스트 프레임), `[0, 1 s]` |
| `outputChannels` | `matrix` 행 수. 0이면 행렬 없음(엔진 기본 매핑) |
| `matrix` | `outputChannels × channelCount`, 출력 행 우선 — `matrix[o * channelCount + c]`. `NULL` 허용 |
| `reserved[6]` | 0 |

`outputChannels`가 지금 출력 채널 수(스테레오 2 · 스피커 레이아웃 N)와 다르거나 `matrix`가 `NULL`이면 엔진 기본 매핑을 씁니다.

| 조건 | 기본 매핑 |
|---|---|
| 채널 수 = 출력 수 | 그대로 |
| 출력 2 | ITU-R BS.775 다운믹스 — 3.0은 FL FR FC(FC 0.7071), 그 밖은 FL FR FC LFE SL SR [BL BR \| BC]로 읽고 FC·서라운드·백 0.7071, LFE 0(제외), 6.1의 BC는 양쪽 0.5, 모노는 양쪽 0.7071, 그 밖 채널 수는 짝수 → L · 홀수 → R |
| 그 밖 | 앞에서부터 1:1 |

다운믹스는 정규화하지 않습니다(리미터가 받습니다).

**반환** — `1` = 적용 / `0` = 실패(`ST_STATUS_VERSION_MISMATCH` · `ST_STATUS_INVALID_ARGUMENT` · `ST_STATUS_NOT_FOUND`).

</details>

<details>
<summary><code>st_rt_speaker_set_get_status</code> — 세트의 재생 상태·카운터·시각을 읽는다</summary>

```c
int st_rt_speaker_set_get_status(const STRT_Context* context, STSpeakerSetId set, STSpeakerSetStatus* outStatus);
```

**용도** — 세트의 transport 상태, 링 상태, 누적 카운터, 표본 단위 정렬용 렌더 시각을 한 번에 돌려줍니다. 공급량 조절(`queuedFrames`), 재생 위치 표시, 영상과의 표본 단위 싱크에 씁니다.

**언제·어떻게** — 어느 스레드에서든 부를 수 있습니다. 프레임 필드는 전부 호스트 프레임(엔진 프레임 누계를 조회 때 round-half-up 한 번 환산)이고, 카운터는 생성 시점부터의 누계입니다. `state`·`contentFrame`·`renderFrame`·`playRenderFrame`·`playContentFrame`은 렌더 블록 하나가 함께 쓰는 값이라 한 번의 호출 안에서 서로 맞습니다. `latencyFrames`는 출력단 상태를 따로 읽으므로 렌더와 다른 스레드에서 읽으면 ±1블록 어긋날 수 있습니다 — 표본 단위 정렬은 렌더 시각 필드로 합니다. 스레드: `[any]` — 블록하지 않습니다.

표본 단위 정렬: 재생이 `playRenderFrame`에서 시작한 뒤 언더런 없이 이어졌다면, 렌더 위치 r(`renderFrame` 축)의 콘텐츠는 `playContentFrame + (r − playRenderFrame)`입니다(3 ms 페이드인 포함). 출력 표본은 그 뒤 `latencyFrames`(출력단 + 리미터)만큼 늦게 나옵니다. 소리의 전파 지연(거리/음속)과 필터 군지연은 여기 들어가지 않으며, `hostSampleRate`를 지정했으면 두 축의 환산 반올림으로 ±1 프레임 차이가 날 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `set` | 세트 핸들 |
| `outStatus` | 출력. 호출자가 `structSize` / `apiVersion`을 채웁니다 |

**구조체** `STSpeakerSetStatus`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | `sizeof(STSpeakerSetStatus)` / `ST_ABI_VERSION` |
| `state` | `STSpeakerSetState` — `STOPPED`(0) / `PLAYING`(1) / `PAUSED`(2) / `STARTING`(3, play 요청 후 멤버 소스를 담은 IR 채택 대기 — 콘텐츠를 꺼내지 않음) |
| `queuedFrames` | 링에 쌓인 몫 |
| `capacityFrames` | 엔진이 실제로 잡은 링 용량 |
| `latencyFrames` | 렌더 → 출력 지연: 출력단(pull FIFO·버퍼드 링·출력 리샘플러) + 리미터 |
| `contentFrame` | relocate 기준 + 렌더가 링에서 꺼낸 몫 |
| `underrunFrames` | 재생 중 링이 비어 무음으로 채운 몫 |
| `droppedFrames` | 링이 가득 차 버린 몫 |
| `totalWrittenFrames` | 링에 실제로 들어간 몫 |
| `renderFrame` | 컨텍스트가 지금까지 렌더한 프레임(무음 프리롤 블록 포함) |
| `playRenderFrame` | 마지막 재생 시작 블록의 첫 표본 렌더 위치. 시작 전 −1 |
| `playContentFrame` | 그 표본의 콘텐츠 프레임 |
| `appliedSetters` | `st_rt_speaker_set_update`가 엔진에 보낸 값 수(위치·회전·게인·리스너 위치·회전) |
| `skippedSetters` | 비트 동일·무지향 회전이라 보내지 않은 값 수 |
| `directMix` | 원음 몫 0..1(직전 블록 끝). 0 = 젖은 경로만 |
| `inputDelayFrames` | 업믹스 창 지연(호스트 프레임, 업믹스 없으면 0) |
| `reserved[4]` | 예약 |

**반환** — `1` = 성공 / `0` = 실패(`NULL`, 스탬프 불일치, 없는 세트).

</details>

</details>

<details>
<summary><strong>디버그 · 시각화</strong> — 9개</summary>

<details>
<summary><code>st_rt_debug_get_frame_generation</code> — 전파 프레임 세대 번호를 읽는다</summary>

```c
uint64_t st_rt_debug_get_frame_generation(const STRT_Context* context);
```

**용도** — 새 전파 결과가 나왔는지 값의 변화만으로 가볍게 감지하는 카운터입니다. 디버그 시각화가 매 프레임 스냅샷을 다시 가져올 필요가 있는지 판단할 때 씁니다.

**언제·어떻게** — 언제든 폴링할 수 있습니다. 값이 바뀌었으면 `st_rt_debug_acquire_snapshot`을 불러 새 스냅샷을 잡습니다. `st_rt_debug_copy_visual_paths`에 넘길 세대는 이 값이 아니라 `st_rt_debug_acquire_snapshot`이 돌려준 `frameGeneration`을 씁니다. 스레드: `[any]` — atomic 하나를 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 현재 세대 번호. 아직 전파 결과가 없거나 `context`가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_debug_set_collect_failed_walks</code> — 중도에 실패한 경로 walk도 시각화용으로 수집할지 정한다</summary>

```c
void st_rt_debug_set_collect_failed_walks(STRT_Context* context, int enabled);
```

**용도** — 기본 시각화는 소스에서 리스너까지 완주한 경로만 담습니다. 이 옵션을 켜면 중간에 끊긴 walk도 수집돼 "왜 이 경로가 연결되지 않았는가"를 디버깅할 수 있습니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있고 이후 전파 결과부터 반영됩니다. 수집 대상 경로 종류는 `st_rt_debug_set_collect_visual_paths`의 마스크로 따로 정하며, 이 플래그는 그 마스크와 독립적으로 유지됩니다(`st_rt_debug_get_collect_mask`에는 나타나지 않습니다). 실패 walk는 `STVisualPathRecord.valid = 0`으로 들어오고, 복사할 때 `ST_VISUAL_PATH_COPY_ALL`로 가져옵니다. 기본은 꺼짐입니다. 스레드: `[control]` — 씬 쓰기 락을 잡으므로 오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | `0` = 끔(기본) / `0`이 아닌 값 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_rt_debug_set_collect_visual_paths</code> — 시각화용으로 수집할 경로 종류 마스크를 지정한다</summary>

```c
int st_rt_debug_set_collect_visual_paths(STRT_Context* context, uint32_t mask);
```

**용도** — 에디터·디버그 뷰에서 guide 레이, 소스 수송 레이, 직접음·투과 경로, 반사·회절 경로를 선분으로 그리기 위해 전파가 경로 기하를 기록하게 합니다.

**언제·어떻게** — 생성 후 언제든 부를 수 있고 이후 전파 결과부터 반영됩니다. 수집된 결과는 `st_rt_debug_acquire_snapshot` → `st_rt_debug_copy_visual_paths` 순으로 가져옵니다. 기본 마스크는 `0`(수집 안 함)입니다. 지원 여부는 `ST_CAP_PATH_COLLECTION_MASK`. 스레드: `[control]` — 씬 쓰기 락을 잡으므로 오디오 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mask` | `STPathCollectionFlag` 조합(아래 표). `0` = 수집 끔. 정의되지 않은 비트가 있으면 거절 |

**열거형** `STPathCollectionFlag`

| 값 | 이름 | 수집 대상 |
|---|---|---|
| `1u << 0` | `ST_PATH_COLLECTION_GUIDE_RAY` | 리스너에서 쏜 guide 레이 |
| `1u << 1` | `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY` | 소스 수송 레이 |
| `1u << 2` | `ST_PATH_COLLECTION_DIRECT_TRANSMISSION` | 직접음·투과 경로 |
| `1u << 3` | `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION` | 반사·회절 경로(반사 구간을 포함한 혼합 회절 경로가 있어 한 비트로 묶임) |
| 위 넷의 OR | `ST_PATH_COLLECTION_ALL` | 전부 |

**반환** — `1` = 적용 / `0` = 거절(`context`가 `NULL`, `mask`에 정의되지 않은 비트).

</details>

<details>
<summary><code>st_rt_debug_get_collect_mask</code> — 현재 경로 수집 마스크를 읽는다</summary>

```c
uint32_t st_rt_debug_get_collect_mask(const STRT_Context* context);
```

**용도** — `st_rt_debug_set_collect_visual_paths`로 지정한 수집 마스크를 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 실패 walk 수집 여부(`st_rt_debug_set_collect_failed_walks`)는 이 값에 포함되지 않습니다. 스레드: `[any]` — atomic 사본을 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STPathCollectionFlag` 비트 조합. 기본 `0`, `context`가 `NULL`이면 `0`.

</details>

<details>
<summary><code>st_rt_debug_acquire_snapshot</code> — 최신 전파 진단 스냅샷을 잡고 요약을 읽는다</summary>

```c
int st_rt_debug_acquire_snapshot(STRT_Context* context, STPropagationSnapshotInfo* outInfo);
```

**용도** — 최신 전파 세대 하나를 진단용으로 고정하고, 그 세대의 경로 수·시각화 버퍼 크기를 한 번에 돌려줍니다. 모든 값이 **같은 세대**에서 온 것이므로 경로 수 통계와 시각화 경로가 서로 어긋나지 않습니다.

**언제·어떻게** — 시각화 경로를 가져오려면 먼저 이 함수로 스냅샷을 잡고, 돌려받은 `frameGeneration`과 개수로 버퍼를 준비해 `st_rt_debug_copy_visual_paths`를 부릅니다. 다시 부르면 그사이 새 세대가 나왔을 경우 그 세대로 바뀌므로, 복사는 마지막으로 잡은 세대에 대해 합니다. 시각화 경로·점 개수는 `st_rt_debug_set_collect_visual_paths`로 수집을 켰을 때만 0이 아닙니다. 스레드: `[control]` — 진단 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outInfo` | 출력. 호출자가 `structSize = sizeof(STPropagationSnapshotInfo)`, `apiVersion = ST_ABI_VERSION`을 채운다 |

**구조체** `STPropagationSnapshotInfo`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채우는 스탬프 |
| `frameGeneration` | 이 스냅샷의 세대. `st_rt_debug_copy_visual_paths`에 그대로 넘긴다 |
| `collectionMask` | 이 세대를 만들 때 쓰인 수집 마스크(`STPathCollectionFlag`) |
| `reserved0` | 예약 |
| `visualPathCount` | 시각화 경로 전체 수(실패 walk 포함) |
| `validVisualPathCount` | 완주한 시각화 경로 수. 유효 경로는 배열 앞쪽을 차지한다 |
| `visualPointCount` | 시각화 점 전체 수 |
| `validVisualPointCount` | 유효 경로에 속한 점 수. 배열 앞쪽을 차지한다 |
| `totalPathCount` | 이 세대의 전체 음향 경로 수 |
| `reflectionPathCount` | 반사 경로 수 |
| `diffractionPathCount` | 회절 경로 수 |
| `sourceSideOnlyPaths` | 소스 쪽 회절 모서리만 있는 회절 경로 수 |
| `unclassifiedPaths` | 분류되지 않은 회절 경로 수(정상 동작에서는 0) |
| `sourceSideEvents` | 소스 쪽 회절 이벤트 수 |
| `terminalOnlyPaths` | 리스너 쪽 끝 모서리 회절만 있는 경로 수 |
| `sourceAndTerminalPaths` | 소스 쪽과 리스너 쪽 회절이 모두 있는 경로 수 |
| `terminalEvents` | 리스너 쪽 끝 모서리 회절 이벤트 수 |
| `reserved[4]` | 예약 |

**반환** — `1` = 성공 / `0` = `context`·`outInfo`가 `NULL`, 스탬프 불일치, 또는 아직 전파 결과가 한 번도 없음. 실패 시 `outInfo`는 바뀌지 않습니다.

</details>

<details>
<summary><code>st_rt_debug_copy_visual_paths</code> — 잡아 둔 스냅샷의 시각화 경로와 점을 복사한다</summary>

```c
int st_rt_debug_copy_visual_paths(STRT_Context* context, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**용도** — 디버그 뷰에서 경로를 선분으로 그리기 위해 경로 레코드와 꼭짓점 배열을 호스트 버퍼로 복사합니다. 오디오 데이터는 이 표면을 통과하지 않습니다(검사·시각화 전용).

**언제·어떻게** — `st_rt_debug_acquire_snapshot`을 먼저 부르고, 그 `frameGeneration`과 개수로 버퍼를 준비합니다: `VALID_ONLY`면 경로 `validVisualPathCount`개·점 `validVisualPointCount`개, `ALL`이면 `visualPathCount`개·`visualPointCount`개. 버퍼는 해당 세트 전체를 담아야 하며 부분 복사는 하지 않습니다. 각 레코드의 `points[pointOffset .. pointOffset + pointCount)`가 순서대로 이어진 경로 하나입니다. 스레드: `[control]` — 진단 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `frameGeneration` | `st_rt_debug_acquire_snapshot`이 돌려준 세대. 잡아 둔 스냅샷의 세대와 다르면 실패 |
| `copyMode` | `STVisualPathCopyMode`: `ST_VISUAL_PATH_COPY_VALID_ONLY`(0) = 완주한 경로만 / `ST_VISUAL_PATH_COPY_ALL`(1) = 실패 walk 포함 전부. 그 밖 값은 실패 |
| `outPaths` | 경로 레코드 출력 배열. 복사할 경로가 0개면 `NULL` 가능 |
| `pathCapacity` | `outPaths` 원소 수 |
| `outPoints` | 점 출력 배열. 복사할 점이 0개면 `NULL` 가능 |
| `pointCapacity` | `outPoints` 원소 수 |

**구조체** `STVisualPathRecord`

| 필드 | 설명 |
|---|---|
| `pointOffset` | 이 경로의 첫 점이 `outPoints`에서 차지하는 인덱스 |
| `pointCount` | 이 경로의 점 수 |
| `depth` | 경로 깊이(상호작용 차수) |
| `pathKind` | `STPathKind`(아래 표) |
| `soundSourceIndex` | 소스 인덱스. guide 레이는 `-1` |
| `valid` | `1` = 완주 / `0` = 중도 실패 walk |
| `totalLengthMeters` | 경로 전체 길이(m) |
| `reserved0` | 예약 |

음향 경로의 점 순서는 소스 → 상호작용 지점들 → 리스너이고, guide 레이는 리스너 → 히트 지점들입니다.

**열거형** `STPathKind`

| 값 | 이름 | 의미 |
|---|---|---|
| `0` | `ST_PATH_GUIDE_RAY` | guide 레이 |
| `1` | `ST_PATH_DIRECT` | 직접음(투과 포함) |
| `2` | `ST_PATH_REFLECTION` | 반사 |
| `3` | `ST_PATH_DIFFRACTION_UNKNOWN` | 분류되지 않은 회절(정상 동작에서는 나오지 않음) |
| `1 << 2` | `ST_PATH_DIFFRACTION_S` | 소스 쪽 모서리 회절 |
| `1 << 3` | `ST_PATH_DIFFRACTION_L` | 리스너 쪽 끝 모서리 회절 |
| `S \| L` | `ST_PATH_DIFFRACTION_SL` | 소스 쪽과 리스너 쪽 회절 모두 |
| `1 << 4` | `ST_PATH_SOURCE_TRANSPORT_RAY` | 소스 수송 레이 |

**구조체** `STVisualPoint`

| 필드 | 설명 |
|---|---|
| `x`, `y`, `z` | 점 좌표(씬 프레임) |
| `flags` | `STVisualPointFlag`: `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`(`1u << 0`, 회절 지점) |

**반환** — `1` = 성공 / `0` = 실패: `context`가 `NULL`, `copyMode`가 범위 밖, 아직 스냅샷이 없음, `frameGeneration`이 잡아 둔 세대와 다름, 버퍼 용량 부족(또는 필요한데 `NULL`). 세대 불일치로 실패하면 `st_rt_debug_acquire_snapshot`을 다시 부른 뒤 복사합니다.

</details>

<details>
<summary><code>st_rt_debug_copy_mesh_accel_nodes</code> — 메시 하나의 가속구조(BLAS) 노드 박스를 복사한다</summary>

```c
int st_rt_debug_copy_mesh_accel_nodes(STRT_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**용도** — 전파가 쓰는 메시 가속구조의 노드 경계 상자를 시각화용으로 꺼냅니다. 메시가 어떻게 분할됐는지 확인하거나 에디터에 BVH 박스를 겹쳐 그릴 때 씁니다. 전파가 쓰는 구조를 읽기만 합니다.

**언제·어떻게** — `st_rt_mesh_create` 뒤 언제든 부를 수 있습니다. BLAS는 메시 생성 시점의 `st_rt_scene_set_accel` 값으로 지어집니다. 보통 `outNodes = NULL`로 먼저 불러 노드 수를 받고 버퍼를 할당한 뒤 다시 부릅니다. 큰 메시는 수천 노드이므로 시각화에는 `maxDepth`로 윗단만 보는 것이 일반적입니다. 버퍼가 모자라면 전위 순서의 앞부분(맨 왼쪽 가지부터)만 쓰이므로, 윗단만 원하면 `maxDepth`로 자릅니다. 지원 여부는 `ST_CAP_ACCEL_DEBUG_NODES`. 스레드: `[control]` — 씬 읽기 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 대상 메시 핸들(`st_rt_mesh_create`가 돌려준 값) |
| `maxDepth` | `< 0` = 전 깊이. `0` 이상이면 `depth ≤ maxDepth`인 노드만 세고 쓴다 |
| `outNodes` | 출력 배열. `NULL`이면 크기 질의(`nodeCapacity` 무시) |
| `nodeCapacity` | `outNodes` 원소 수. 앞에서부터 `min(전체, nodeCapacity)`개를 쓴다 |

**구조체** `STAccelNode` (32바이트, 버전 스탬프 없는 배열 원소)

| 필드 | 설명 |
|---|---|
| `boundsMin[3]` | 노드 상자 최소 좌표 |
| `boundsMax[3]` | 노드 상자 최대 좌표 |
| `depth` | 깊이, 루트 = `0` |
| `primitiveCount` | 리프: 담긴 프리미티브 수(≥ 0) / 내부 노드: `-1` |

- **순서**: 깊이 우선 전위(pre-order). 루트가 `[0]`이고, 각 노드의 부모는 배열 앞쪽에서 가장 가까운 `depth − 1` 노드입니다 — 부모 인덱스 없이 트리를 복원할 수 있습니다.
- **좌표**: 메시 BLAS는 `st_rt_mesh_create`에 넘긴 정점 프레임(메시 로컬)입니다. 인스턴스 위치에 그리려면 호스트가 오브젝트 변환을 곱합니다. `sceneRatio` 변환은 없습니다.
- **가속구조 종류별 의미**(`st_rt_scene_set_accel`의 kind): BVH 계열(`0` BinnedSAH, `2` TinyBVH, `3` LBVH, `4` LBVH_Simd)은 빌드된 이진 트리이며, 4/8-wide 순회 표현의 상자는 이 목록의 부분집합입니다. TinyBVH BVH8의 리프는 삼각형 4개 이하입니다. KD(`1` HybridKD)는 루트 상자를 분할 평면으로 잘라 상자를 유도하므로 형제 상자가 겹치지 않고 부모를 정확히 나눕니다. 빈 리프(`primitiveCount = 0`)가 있을 수 있고, 여러 리프에 걸친 삼각형은 리프마다 셉니다.

**반환** — `maxDepth` 안의 **전체** 노드 수(≥ 0), 실패 시 `-1`(`context`가 `NULL`, 없는 메시 → `ST_STATUS_NOT_FOUND`). 버퍼가 모자라 잘린 복사도 전체 수를 돌려주며 `st_rt_get_last_status`에 `ST_STATUS_BUFFER_TOO_SMALL`을 남깁니다.

</details>

<details>
<summary><code>st_rt_debug_copy_scene_accel_nodes</code> — 씬 최상위 가속구조(TLAS) 노드 박스를 복사한다</summary>

```c
int st_rt_debug_copy_scene_accel_nodes(STRT_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**용도** — 오브젝트 인스턴스 위에 지은 씬 가속구조의 노드 상자를 시각화용으로 꺼냅니다. 정적·동적 오브젝트가 씬에서 어떻게 묶였는지 확인할 때 씁니다.

**언제·어떻게** — `st_rt_build` 뒤에 부릅니다. 정적 TLAS는 `st_rt_build`가 발행한 것이라, 다음 `st_rt_build` 전까지는 스테이징된 정적 변경이 보이지 않습니다. 동적 TLAS는 동적 재구축이 다시 발행합니다. 크기 질의(`outNodes = NULL`)·`maxDepth`·잘린 복사 규약은 `st_rt_debug_copy_mesh_accel_nodes`와 같습니다. 지원 여부는 `ST_CAP_ACCEL_DEBUG_NODES`. 스레드: `[control]` — 씬 읽기 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `layer` | `STAccelLayer`: `ST_ACCEL_LAYER_STATIC`(0) = `st_rt_build`가 발행한 정적 TLAS / `ST_ACCEL_LAYER_DYNAMIC`(1) = 동적 오브젝트 TLAS |
| `maxDepth` | `< 0` = 전 깊이. `0` 이상이면 `depth ≤ maxDepth`인 노드만 |
| `outNodes` | 출력 배열. `NULL`이면 크기 질의 |
| `nodeCapacity` | `outNodes` 원소 수 |

`STAccelNode` 필드는 `st_rt_debug_copy_mesh_accel_nodes` 항목 참고. TLAS의 좌표는 씬(월드) 프레임이며, 리프의 프리미티브는 삼각형이 아니라 오브젝트 인스턴스입니다.

**반환** — `maxDepth` 안의 전체 노드 수(≥ 0). 그 TLAS가 아직 없으면(빌드 전, 해당 종류의 오브젝트 없음) `0`이며 오류가 아닙니다. `-1` = 실패(`context`가 `NULL`, `layer` 범위 밖 → `ST_STATUS_INVALID_ARGUMENT`). 잘린 복사는 `st_rt_debug_copy_mesh_accel_nodes`와 같이 `ST_STATUS_BUFFER_TOO_SMALL`을 남깁니다.

</details>

<details>
<summary><code>st_rt_debug_build_mesh_accel_nodes</code> — 컨텍스트 없이 메시 하나의 BLAS를 지어 노드 박스를 돌려준다</summary>

```c
int st_rt_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**용도** — 호스트 에디터가 씬을 만들기 전에 메시의 가속구조를 미리 볼 때 씁니다. `st_rt_mesh_create`와 같은 입력 검증·같은 빌드 경로를 거치므로, 같은 `accelKind`면 실시간 컨텍스트가 짓는 BLAS와 같은 트리가 나옵니다.

**언제·어떻게** — 컨텍스트 없이 언제든 부를 수 있습니다. 매 호출이 BLAS를 새로 짓기 때문에(메시 크기에 비례하는 비용) 결과는 호스트가 캐시합니다. 크기 질의(`outNodes = NULL`)·`maxDepth`·전위 순서 규약은 `st_rt_debug_copy_mesh_accel_nodes`와 같습니다. 지원 여부는 `ST_CAP_ACCEL_DEBUG_NODES`. 스레드: `[any]` — 전역 상태를 쓰지 않습니다(빌드 비용은 호출 스레드가 부담합니다).

| 파라미터 | 설명 |
|---|---|
| `mesh` | 입력 메시. `vertices`는 xyz 인터리브(`numVertices × 3` float), `triangles`는 정점 인덱스(`numTriangles × 3` int) |
| `accelKind` | `st_rt_scene_set_accel`의 kind: `0` BinnedSAH / `1` HybridKD / `2` TinyBVH / `3` LBVH / `4` LBVH_Simd. `-1` = 엔진 기본(TinyBVH, 환경변수 `SIMPLEST_ACCEL`이 있으면 그 값) |
| `maxDepth` | `< 0` = 전 깊이. `0` 이상이면 `depth ≤ maxDepth`인 노드만 |
| `outNodes` | 출력 배열. `NULL`이면 크기 질의 |
| `nodeCapacity` | `outNodes` 원소 수 |

**구조체** `STMesh`

| 필드 | 설명 |
|---|---|
| `numVertices` | 정점 수 |
| `vertices` | 정점 좌표 배열(xyz 인터리브) |
| `numTriangles` | 삼각형 수 |
| `triangles` | 삼각형 정점 인덱스 배열(삼각형당 3개) |

`STAccelNode` 필드와 노드 순서·좌표 규약은 `st_rt_debug_copy_mesh_accel_nodes` 항목 참고. 좌표는 입력 정점 프레임 그대로입니다.

**반환** — `maxDepth` 안의 전체 노드 수(≥ 0). `-1` = 실패(`mesh`나 배열이 `NULL`, 개수 0 이하, 비유한 정점, 범위 밖 인덱스, 잘못된 `accelKind`, 할당 실패). 컨텍스트가 없으므로 `st_rt_get_last_status`에는 아무것도 남지 않습니다.

</details>

</details>

<details>
<summary><strong>오프라인(`st_off_*`) — 컨텍스트 · 씬 · 음원 · 리스너</strong> — 72개</summary>

<details>
<summary><code>st_off_get_api_version</code> — 오프라인 DLL의 ABI 버전을 돌려준다</summary>

```c
uint32_t st_off_get_api_version(void);
```

**용도** — 로드한 `SimpleSTOffline` 라이브러리가 어떤 ABI 버전으로 빌드됐는지 알려 줍니다. 호스트가 컴파일한 헤더(`STTypes.h`의 `ST_ABI_VERSION`)와 DLL이 같은 구조체 배치를 쓰는지 확인하는 유일한 판정 수단입니다.

**언제·어떻게** — 라이브러리를 로드한 직후, 컨텍스트를 만들기 전에 한 번 불러 `ST_ABI_VERSION`과 비교합니다. 다르면 구조체 레이아웃이 어긋나므로 사용을 중단합니다. 모든 버전 스탬프 구조체의 `apiVersion` 필드에도 이 값(`ST_ABI_VERSION`)을 넣습니다. 스레드: `[any]` — 컴파일 상수라 어느 스레드에서나 블록 없이 부를 수 있습니다.

**파라미터** — 없음.

**반환** — 라이브러리의 ABI 버전(`ST_ABI_VERSION`과 같은 값이어야 호환).

</details>

<details>
<summary><code>st_off_get_version_string</code> — 제품 릴리스 버전 문자열을 돌려준다</summary>

```c
const char* st_off_get_version_string(void);
```

**용도** — 로그·진단 화면에 표시할 제품 릴리스 버전을 사람이 읽을 수 있는 문자열로 줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. ABI 호환성 판정에는 쓰지 않습니다 — 그 판정은 `st_off_get_api_version`으로 합니다. 스레드: `[any]` — 블록하지 않습니다.

**파라미터** — 없음.

**반환** — DLL이 소유한 정적 NUL 종료 문자열. 호출자가 해제하지 않습니다.

</details>

<details>
<summary><code>st_off_get_capabilities</code> — 능력 워드 0(<code>ST_CAP_*</code>)을 돌려준다</summary>

```c
uint64_t st_off_get_capabilities(void);
```

**용도** — 이 오프라인 라이브러리가 지원하는 기능을 비트마스크로 알려 줍니다. 기능이 선택적으로 추가되는 ABI라서, 호스트는 함수 존재가 아니라 이 비트로 지원 여부를 판단합니다.

**언제·어떻게** — 초기화 시 한 번 읽어 두고 `ST_CAP_*` 비트로 AND해 확인합니다. 예: `ST_CAP_OFFLINE`, `ST_CAP_SCENE_RAYCAST`, `ST_CAP_SOURCE_DIRECTIVITY`, `ST_CAP_SCENE_RATIO`, `ST_CAP_THREAD_ATTRIBUTES`, `ST_CAP_SOURCE_EQ` 등. 실시간 DLL과 집합이 다릅니다 — 실시간 전용 비트(`ST_CAP_REALTIME_SINGLE` / `ST_CAP_REALTIME_MULTI`, `ST_CAP_RUNTIME_DELAY_RESIZE`, `ST_CAP_LOOKAHEAD_OUTPUT_LIMITER`, `ST_CAP_ENGINE_TIMING` 등)는 없고 `ST_CAP_OFFLINE_*` 비트가 있습니다. Exa 백엔드가 포함된 빌드는 `ST_CAP_BACKEND_EXA`가 더해집니다. 워드 1 이상의 능력(`ST_CAP1_*`)은 `st_off_get_capability_word`로 읽습니다 — 서로 다른 워드의 비트를 섞어 AND하지 않습니다. 스레드: `[any]` — 컴파일 상수입니다.

**파라미터** — 없음.

**반환** — 능력 워드 0의 비트 OR(`st_off_get_capability_word(0)`과 같은 값).

</details>

<details>
<summary><code>st_off_get_capability_word</code> — 능력 워드 n을 돌려준다</summary>

```c
uint64_t st_off_get_capability_word(uint32_t word);
```

**용도** — 워드 0의 64비트가 다 찬 뒤 추가된 능력을 워드 단위로 조회합니다. 이 함수가 있다는 것 자체는 워드 0의 `ST_CAP_CAPABILITY_WORDS` 비트로 알 수 있습니다.

**언제·어떻게** — 초기화 시 필요한 워드를 읽고, 같은 워드의 상수(`ST_CAP1_*`는 워드 1)로만 AND합니다. 오프라인 DLL의 워드 1에는 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN`, `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`, `ST_CAP1_OFFLINE_MAX_DELAY`, `ST_CAP1_SOURCE_PARAMETRIC_EQ`, `ST_CAP1_LISTENER_ORIENTATION_Q`가 들어 있습니다. 스레드: `[any]` — 컴파일 상수입니다.

| 파라미터 | 설명 |
|---|---|
| `word` | 워드 번호. `0` = `st_off_get_capabilities()`와 같은 값, `1` = `ST_CAP1_*` 워드. 헤더가 아는 워드 수는 `ST_CAPABILITY_WORD_COUNT`이며 그 밖의 번호는 `0`을 돌려줍니다 |

**반환** — 해당 워드의 비트 OR. 모르는 워드는 `0`(= 해당 능력 없음).

</details>

<details>
<summary><code>st_off_get_sample_rate</code> — 엔진 샘플레이트(44100 Hz)를 돌려준다</summary>

```c
int st_off_get_sample_rate(void);
```

**용도** — 엔진이 IR과 오디오를 만드는 고정 샘플레이트를 알려 줍니다. 오프라인 렌더 결과의 샘플 수를 시간으로 바꾸거나, 다른 레이트로 리샘플할지 판단할 때 씁니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 값은 44100 Hz로 고정이며, 호스트가 다른 레이트를 쓰면 리샘플은 호스트 몫입니다. 스레드: `[any]` — 컴파일 상수입니다.

**파라미터** — 없음.

**반환** — `44100`.

</details>

<details>
<summary><code>st_off_set_thread_attributes</code> — 엔진 스레드 종류별 우선순위·코어 선호·affinity를 지정한다</summary>

```c
int st_off_set_thread_attributes(int threadType, const STThreadAttributes* attributes);
```

**용도** — 엔진이 만드는 스레드의 속성을 호스트가 스레드 **생성 전에** 정합니다. 호스트가 자기 스레드 예산·우선순위 정책 안에 엔진 계산 스레드를 맞춰 넣기 위한 표면입니다.

**언제·어떻게** — `st_off_create` **전에** 부르는 것이 계약입니다. 이미 시작된 스레드에는 적용되지 않고 이후 만들어지는 스레드(다음 `st_off_create`의 계산 풀 등)부터 적용됩니다. 표는 컨텍스트와 무관한 **프로세스 전역**이고, 실시간 DLL과 오프라인 DLL은 각자 자기 표를 가집니다 — 두 DLL을 함께 쓰면 `st_rt_set_thread_attributes`와 이 함수 양쪽에 같은 값을 넣어야 합니다. 오프라인 셸에서 실제로 의미가 있는 종류는 `ST_THREAD_COMPUTE_POOL`뿐이고, 나머지 종류는 값이 저장만 되고 적용될 스레드가 없습니다(배치 워커는 `STThreadType`에 속하지 않습니다). `affinityMask`와 코어 선호 플래그는 Windows에서만 반영되고 macOS에서는 무시됩니다(QoS 클래스가 배치를 정합니다). 지원 여부는 `ST_CAP_THREAD_ATTRIBUTES`. 스레드: `[any]` — 프로세스 전역 표를 뮤텍스로 한 번 갱신합니다.

| 파라미터 | 설명 |
|---|---|
| `threadType` | `STThreadType` 값, `[0, ST_THREAD_TYPE_COUNT)`. 오프라인에서 적용되는 것은 `ST_THREAD_COMPUTE_POOL`(4) — 계산 풀 워커(`maxComputeThreads` N > 1일 때 N개) |
| `attributes` | 지정할 속성. 호출자가 `structSize = sizeof(STThreadAttributes)`, `apiVersion = ST_ABI_VERSION`을 채웁니다. `NULL`이면 그 종류를 기본값으로 되돌립니다 |

**구조체** `STThreadAttributes`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STThreadAttributes)`. 호출자가 채움 |
| `apiVersion` | `ST_ABI_VERSION`. 호출자가 채움 |
| `priority` | `STThreadPriority` — `ST_THREAD_PRIORITY_DEFAULT`(0, 플랫폼 기본 그대로) / `LOW`(1) / `BELOW_NORMAL`(2) / `NORMAL`(3) / `ABOVE_NORMAL`(4) / `HIGH`(5) / `TIME_CRITICAL`(6). Windows는 같은 이름의 스레드 우선순위(LOW→LOWEST, HIGH→HIGHEST)로, macOS는 QoS 클래스(LOW→BACKGROUND, BELOW_NORMAL→UTILITY, NORMAL→USER_INITIATED, 그 이상→USER_INTERACTIVE)로 매핑됩니다 |
| `flags` | `ST_THREAD_FLAG_PREFER_PERFORMANCE_CORES` / `ST_THREAD_FLAG_PREFER_EFFICIENCY_CORES`. 둘을 동시에 켜면 거절됩니다. Windows만 반영 |
| `affinityMask` | 논리 프로세서 비트마스크, `0` = 지정 없음. Windows만 반영하며, 64개를 넘는 머신에서는 현재 프로세서 그룹 안에서만 해석됩니다 |
| `reserved[4]` | 전부 `0`이어야 합니다 |

**반환** — `1` = 성공 / `0` = 실패: `threadType` 범위 밖, `structSize`/`apiVersion` 불일치, `priority` 범위 밖, 코어 선호 플래그 상충, `reserved[]`가 0이 아님. 컨텍스트를 받지 않으므로 `st_off_get_last_status`에는 아무것도 남지 않습니다.

</details>

<details>
<summary><code>st_off_get_thread_attributes</code> — 저장된 스레드 속성 요청값을 읽는다</summary>

```c
int st_off_get_thread_attributes(int threadType, STThreadAttributes* outAttributes);
```

**용도** — `st_off_set_thread_attributes`로 지정해 둔 값을 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 돌려주는 값은 실제로 스레드에 심긴 값이 아니라 저장된 **요청값** 그대로입니다. 지정하지 않은 종류의 기본값은 `priority` = `ST_THREAD_PRIORITY_DEFAULT` · `flags` = 0 · `affinityMask` = 0입니다. 스레드: `[any]` — 프로세스 전역 표를 뮤텍스로 한 번 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `threadType` | `STThreadType` 값, `[0, ST_THREAD_TYPE_COUNT)` |
| `outAttributes` | 결과를 받을 구조체. 호출자가 `structSize`/`apiVersion`을 채웁니다. 필드는 `st_off_set_thread_attributes` 항목 참고 |

**반환** — `1` = 성공 / `0` = 거절(`outAttributes`가 `NULL`, 스탬프 불일치, `threadType` 범위 밖).

</details>

<details>
<summary><code>st_off_get_thread_inventory</code> — 이 컨텍스트가 띄운 스레드 수를 종류별로 읽는다</summary>

```c
int st_off_get_thread_inventory(const STOFF_Context* context, STThreadInventory* outInventory);
```

**용도** — 컨텍스트가 지금 실제로 몇 개의 스레드를 점유하는지 종류별 수치로 줍니다. 호스트가 스레드 예산을 추측이 아니라 측정값으로 세우게 하려는 것입니다.

**언제·어떻게** — 컨텍스트를 만든 뒤 언제든 부릅니다. 오프라인 셸에는 전파 레인·오디오 렌더·장치·파일 디코더 스레드가 없으므로 값이 서는 자리는 `ST_THREAD_COMPUTE_POOL`뿐입니다 — `maxComputeThreads`가 N > 1이면 N, 1이면 0(호출자 스레드에서 인라인 실행). `ST_THREAD_ACCEL_BUILD`는 예약 역할이라 0입니다. 종류별 값은 각각 독립 atomic이라 같은 순간의 스냅샷은 아닙니다. 지원 여부는 `ST_CAP_THREAD_INVENTORY`. 스레드: `[any]` — atomic 카운터만 읽어 블록하지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outInventory` | 결과를 받을 구조체. 호출자가 `structSize = sizeof(STThreadInventory)`, `apiVersion = ST_ABI_VERSION`을 채웁니다 |

**구조체** `STThreadInventory`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STThreadInventory)`. 호출자가 채움 |
| `apiVersion` | `ST_ABI_VERSION`. 호출자가 채움 |
| `countByRole[ST_THREAD_TYPE_COUNT]` | `STThreadType` 순서의 종류별 스레드 수(인덱스 = 종류). 오프라인은 `[ST_THREAD_COMPUTE_POOL]`만 0이 아닐 수 있습니다 |
| `reserved[5]` | 예약 |

**반환** — `1` = 성공 / `0` = `context`·`outInventory`가 `NULL`이거나 스탬프 불일치(`st_off_get_last_status`에 `ST_STATUS_VERSION_MISMATCH`).

</details>

<details>
<summary><code>st_off_init_create_options</code> — <code>STOFF_CreateOptions</code>를 기본값으로 채운다</summary>

```c
void st_off_init_create_options(STOFF_CreateOptions* outOptions);
```

**용도** — 컨텍스트 생성 옵션을 버전 스탬프와 기본값으로 초기화합니다. 호스트가 바꾸고 싶은 필드만 덮어쓰고 나머지는 엔진 기본값을 받게 하려는 것입니다.

**언제·어떻게** — `st_off_create` 직전에 부릅니다. 구조체 전체를 0으로 지운 뒤 `structSize`와 `apiVersion`을 채우므로, 0이 곧 "기본"인 필드들이 모두 기본값이 됩니다. 이어서 필요한 필드(`maxComputeThreads`, `sceneRatio` 등)만 바꾸고 `st_off_create`에 넘깁니다. 스레드: `[any]` — 호출자 소유 POD만 채웁니다.

| 파라미터 | 설명 |
|---|---|
| `outOptions` | 채울 구조체. `NULL`이면 아무것도 하지 않습니다 |

**구조체** `STOFF_CreateOptions`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STOFF_CreateOptions)`. 이 함수가 채웁니다 |
| `apiVersion` | `ST_ABI_VERSION`. 이 함수가 채웁니다 |
| `seedValue` | 기본 `0`. 기본(ST) 백엔드의 출력에는 영향이 없습니다 — ABI 호환과 Exa 백엔드를 위해 남아 있는 필드입니다 |
| `maxComputeThreads` | 컨텍스트가 쓰는 계산 스레드 상한. `0` = 자동 = min(퍼포먼스 코어 수, 6), 최소 1. 이 값이 엔진 소유 공유 계산 풀의 폭이 되며, 오프라인 셸에서는 이것이 컨텍스트가 만드는 스레드의 전부입니다 — `1`이면 풀 스레드 0개(모든 계산을 호출 스레드에서 인라인 실행), N > 1이면 계산 풀 워커 N개. 환경 변수는 영향을 주지 않습니다. 배치 워커는 컨텍스트가 아니라 `st_off_batch_create`가 만든 배치 객체가 소유합니다. 지원 여부는 `ST_CAP_MAX_COMPUTE_THREADS` |
| `sceneRatio` | 씬 단위 → 미터 변환 인자. `0` = 기본 = `1.0`(씬 단위가 곧 미터). 센티미터 호스트는 `0.01f`, 피트 호스트는 `0.3048f`. **초기화 전용**이라 런타임 setter가 없습니다. 좌표는 씬 단위 그대로 넣고, 엔진은 전파 지연·거리 감쇠·공기 흡수·잔향 기술자·`...Meters` 출력 필드처럼 미터가 필요한 곳에서만 이 인자를 곱합니다. 비유한 값이나 0 이하(0 제외)는 `st_off_create`가 거절합니다. 지원 여부는 `ST_CAP_SCENE_RATIO` |
| `backend` | `STBackend` — `ST_BACKEND_ST`(0, 기본) / `ST_BACKEND_EXA`(1). 생성 시 전체 파이프라인을 고르며 런타임 전환은 없습니다. Exa는 라이브러리가 `ST_CAP_BACKEND_EXA`를 광고할 때만 쓸 수 있습니다 |
| `reserved[5]` | 예약. 0으로 둡니다 |

오프라인 옵션에는 실시간의 `scheduler`·`maxDelaySeconds`·`renderOutputMode`·`hostSampleRate`·`startIdle`·`maxSources`에 해당하는 필드가 없습니다 — 스케줄러 없이 호출 스레드가 파이프라인을 구동하고, 장치·스트리밍·음원 예산이 없기 때문입니다. 렌더 지연 링 길이는 생성 뒤 `st_off_render_set_max_delay_seconds`로 정합니다(기본 4.0 s).

**반환** — 없음.

</details>

<details>
<summary><code>st_off_create</code> — 오프라인 컨텍스트를 만든다</summary>

```c
STStatus st_off_create(const STOFF_CreateOptions* options, STOFF_Context** outContext);
```

**용도** — 오프라인 엔진 인스턴스(씬·재질·소스·리스너·IR 캐시를 소유)와 그 계산 풀을 만듭니다. 오프라인 컨텍스트는 장치·오디오 렌더·전파 워커 스레드 없이, 호출 스레드가 `st_off_ir_compute`로 전파를 한 번 돌려 결정적인 IR을 만드는 용도입니다.

**언제·어떻게** — 필요하면 `st_off_set_thread_attributes`를 먼저 부르고, `st_off_init_create_options`로 옵션을 초기화한 뒤 호출합니다. 성공 직후의 상태: 리스너 하나가 자동으로 만들어져 활성이고(id `1`, 위치 (0,0,0), 방향 항등), IR 캐시는 비어 있어 `st_off_ir_compute` 전에는 렌더 계열이 `ST_STATUS_UNAVAILABLE`로 실패합니다. 삼각형 교차 커널은 `0`(MollerTrumbore), early 공간 모드는 `ST_EARLY_SPATIAL_OBJECTS`, 렌더 지연 링은 4.0 s이며, 그 밖의 기본값(대기·거리 감쇠·에너지 타깃·경로 종류·음향 기능·소스 기본값)은 실시간과 같습니다. 서로 **다른** 컨텍스트라면 `st_off_create`/`st_off_destroy`를 여러 스레드에서 동시에 불러도 되고, 다른 컨텍스트의 compute·렌더·배치 작업과 겹쳐도 됩니다(Exa 백엔드는 서로 다른 컨텍스트라도 compute를 동시에 돌리면 안 됩니다). 실패 이유 문자열은 `st_off_get_last_error(NULL, ...)`로 같은 스레드에서 읽습니다. 스레드: `[control, blocking]` — 엔진과 계산 풀을 만드는 긴 구간입니다.

| 파라미터 | 설명 |
|---|---|
| `options` | 생성 옵션. `NULL`이면 `st_off_init_create_options`의 기본값을 씁니다. 필드는 `st_off_init_create_options` 항목 참고 |
| `outContext` | 만든 컨텍스트를 받을 포인터. 실패하면 `NULL`이 들어갑니다 |

**반환** — `STStatus`: `ST_STATUS_OK` = 성공 / `ST_STATUS_INVALID_ARGUMENT` = `outContext`가 `NULL`, 알 수 없거나 이 빌드에 없는 `backend`, 잘못된 `sceneRatio` / `ST_STATUS_VERSION_MISMATCH` = `structSize`·`apiVersion` 불일치 / `ST_STATUS_INITIALIZATION_FAILED` = 엔진 초기화 실패 / `ST_STATUS_ALLOCATION_FAILED` = 메모리 할당 실패.

</details>

<details>
<summary><code>st_off_get_backend</code> — 컨텍스트가 쓰는 백엔드를 돌려준다</summary>

```c
int st_off_get_backend(const STOFF_Context* context);
```

**용도** — 생성 시 `STOFF_CreateOptions.backend`로 고른 파이프라인을 확인합니다.

**언제·어떻게** — 생성 뒤 언제든 부릅니다. 백엔드는 생성 시 확정되며 런타임에 바꿀 수 없습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STBackend` 값(`ST_BACKEND_ST` = 0 / `ST_BACKEND_EXA` = 1). `context`가 `NULL`이면 `-1`.

</details>

<details>
<summary><code>st_off_destroy</code> — 오프라인 컨텍스트를 파괴한다</summary>

```c
void st_off_destroy(STOFF_Context* context);
```

**용도** — 컨텍스트와 그 엔진·계산 풀·IR 캐시를 해제합니다.

**언제·어떻게** — 그 컨텍스트에 대한 다른 호출이 모두 끝난 뒤 부릅니다. 파괴 중이거나 파괴된 컨텍스트를 다른 스레드가 쓰면 안 됩니다. 배치(`st_off_batch_*`)에 등록한 컨텍스트는 그 작업의 완료 레코드를 `st_off_batch_poll`로 받은 뒤에만 파괴합니다. 이 함수는 그 컨텍스트의 계산 풀 워커만 join합니다(`maxComputeThreads`가 1이면 join할 스레드가 없습니다). 서로 다른 컨텍스트라면 여러 스레드에서 동시에 불러도 됩니다. 스레드: `[control, blocking]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 파괴할 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_get_last_status</code> — 마지막 호출의 상태 코드를 읽는다</summary>

```c
STStatus st_off_get_last_status(const STOFF_Context* context);
```

**용도** — `0`/`-1`/실패 핸들만 돌려주는 함수가 왜 실패했는지 상태 코드로 확인합니다.

**언제·어떻게** — 실패를 반환한 호출 직후, 같은 스레드에서 부릅니다. 컨텍스트마다 진단 필드가 하나라서 같은 컨텍스트를 여러 스레드에서 동시에 쓰면 값이 섞일 수 있습니다. 사람이 읽을 메시지는 `st_off_get_last_error`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STStatus`: `ST_STATUS_OK`(0) / `INVALID_CONTEXT`(1) / `INVALID_ARGUMENT`(2) / `VERSION_MISMATCH`(3) / `INITIALIZATION_FAILED`(4) / `ALLOCATION_FAILED`(5) / `NOT_FOUND`(6) / `BUFFER_TOO_SMALL`(7) / `INVALID_MATERIAL`(8) / `STALE_SNAPSHOT`(9) / `UNAVAILABLE`(10). `context`가 `NULL`이면 `ST_STATUS_INVALID_CONTEXT`.

</details>

<details>
<summary><code>st_off_get_last_error</code> — 마지막 오류 메시지를 복사한다</summary>

```c
int st_off_get_last_error(const STOFF_Context* context, char* outMessage, int capacity);
```

**용도** — 마지막 실패의 사람이 읽을 수 있는 설명(예: 검증기의 거절 사유)을 얻습니다. `context`를 `NULL`로 주면 `st_off_create` 실패 이유를 얻을 수 있습니다 — 그때는 컨텍스트가 없기 때문입니다.

**언제·어떻게** — 실패 직후 같은 스레드에서 부릅니다. `NULL` 컨텍스트로 부르면 이 호출 스레드에서 마지막으로 실패한 `st_off_create`의 메시지를 돌려주며, 다음 create가 이를 지웁니다. 필요한 크기를 모르면 `outMessage = NULL`로 먼저 불러 길이를 받습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들. `NULL`이면 이 스레드의 마지막 create 실패 메시지 |
| `outMessage` | 메시지를 받을 버퍼. `NULL`이면 복사하지 않고 길이만 돌려줍니다 |
| `capacity` | `outMessage`의 바이트 수. 부족하면 잘라서 NUL로 끝냅니다 |

**반환** — 메시지 전체를 담는 데 필요한 바이트 수(NUL 포함). 반환값이 `capacity`보다 크면 잘린 것입니다.

</details>

<details>
<summary><code>st_off_material_create</code> — 음향 재질 하나를 등록한다</summary>

```c
STMaterialId st_off_material_create(STOFF_Context* context, const STMaterial* material);
```

**용도** — 메시 표면에 쓸 9밴드 음향 재질(반사·흡수·투과·산란)을 등록하고 핸들을 받습니다. 재질 계수는 엔진이 보정하지 않는 엄격한 입력이라, 등록 시점에 검증해 잘못된 값을 바로 거절합니다.

**언제·어떻게** — 메시를 만들기 전에 필요한 재질을 모두 등록하고, 받은 핸들을 `st_off_mesh_create`의 `material`(또는 삼각형별 재질 인덱스)에 씁니다. 여러 재질은 이 함수를 반복 호출해 등록하며, 반환 id는 등록 순서대로 연속입니다. 실시간 `st_rt_material_create`와 같은 계약입니다. 스레드: `[control]` — 씬 쓰기 락을 잡아 잠깐 블록될 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `material` | 등록할 재질. 호출자가 `structSize`/`apiVersion`을 채웁니다 |

**구조체** `STMaterial`

| 필드 | 설명 |
|---|---|
| `structSize` | `sizeof(STMaterial)`. 계수를 읽기 전에 검증합니다 |
| `apiVersion` | `ST_ABI_VERSION` |
| `reflection[ST_FREQUENCY_BANDS]` | 밴드별 반사 에너지 비율, `[0, 1]` |
| `absorption[ST_FREQUENCY_BANDS]` | 밴드별 흡수 에너지 비율, `[0, 1]` |
| `transmission[ST_FREQUENCY_BANDS]` | 밴드별 투과 에너지 비율, `[0, 1]` |
| `scattering[ST_FREQUENCY_BANDS]` | 반사 에너지 중 확산 비율, `[0, 1]`. R+A+T 합 검사에서는 빠집니다 |
| `reserved[8]` | 예약 |

밴드 순서는 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz(`ST_FREQUENCY_BANDS` = 9)입니다. 모든 계수는 **에너지 도메인**의 무차원 비율이고, 밴드마다 `|R + A + T − 1| ≤ ST_MATERIAL_ENERGY_BALANCE_TOLERANCE`(0.001)를 만족해야 합니다. 엔진은 값을 유도·정규화·클램프·보간하지 않습니다.

**반환** — 재질 핸들 `STMaterialId`. 실패는 `v < 0`: `context`·`material`이 `NULL`이면 `ST_STATUS_INVALID_ARGUMENT`, 계수 검증에 걸리면 `ST_STATUS_INVALID_MATERIAL`(스탬프 불일치는 `ST_STATUS_VERSION_MISMATCH`)이 `st_off_get_last_status`에 남고, 사유는 `st_off_get_last_error`로 읽습니다.

</details>

<details>
<summary><code>st_off_material_load_defaults</code> — 기본 재질 라이브러리를 통째로 등록한다</summary>

```c
STMaterialId st_off_material_load_defaults(STOFF_Context* context);
```

**용도** — 재질 계수를 직접 준비하지 않고도 씬을 구성할 수 있도록 엔진 내장 기본 재질 묶음을 한 번에 등록합니다.

**언제·어떻게** — 메시를 만들기 전에 부릅니다. 반환된 핸들이 묶음의 첫 재질이고, 이후 재질은 `v+1`, `v+2` … 순서로 연속입니다. 실시간 `st_rt_material_load_defaults`와 같은 계약입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 첫 재질의 핸들 `STMaterialId`. 실패는 `v < 0`.

</details>

<details>
<summary><code>st_off_scene_set_edge_split_collinear_overlaps</code> — 메시 엣지 토폴로지 컴파일 옵션을 켜고 끈다</summary>

```c
void st_off_scene_set_edge_split_collinear_overlaps(STOFF_Context* context, int enabled);
```

**용도** — `st_off_mesh_create`가 메시의 음향 엣지(회절 후보) 토폴로지를 컴파일할 때, 한 직선 위에서 겹치는 엣지들을 분할해 다룰지 정하는 씬 빌드 옵션입니다.

**언제·어떻게** — 메시를 만들기 전에 부릅니다. 이 호출 뒤에 추가되는 메시에만 적용되고, 이미 만든 메시는 생성 시점에 컴파일한 토폴로지를 유지합니다. 지원 여부는 `ST_CAP_ACOUSTIC_EDGE_BUILD_OPTIONS`. 실시간 `st_rt_scene_set_edge_split_collinear_overlaps`와 같은 계약입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | `0` = 끔 / 그 밖 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_scene_set_solid_wedge_gate</code> — 두 면 회절 쐐기의 각도 구간 기각을 켜고 끈다</summary>

```c
void st_off_scene_set_solid_wedge_gate(STOFF_Context* context, int enabled);
```

**용도** — 회절 경로를 검증할 때 두 면으로 이루어진 쐐기(wedge)의 솔리드 쪽 각도 구간을 지나는 경로를 기각하는 게이트입니다. 기본은 꺼져 있습니다.

**언제·어떻게** — 전파 시점에 적용되는 옵션이라 `st_off_ir_compute` 전에 정합니다. 켜면 쐐기의 볼록/오목 판정에 메시 와인딩(삼각형 정점 순서가 주는 법선 부호)이 쓰이므로, 와인딩을 뒤집으면 기각되는 회절 경로 집합이 반대가 됩니다 — 메시 하나 안에서 와인딩을 일관되게 유지하고 가능하면 법선이 공기 쪽을 향하게 합니다. 지원 여부는 `ST_CAP_EXPERIMENTAL_SOLID_WEDGE_GATE`. 실시간 `st_rt_scene_set_solid_wedge_gate`와 같은 계약입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `enabled` | `0` = 끔(기본) / 그 밖 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_scene_set_accel</code> — 메시·정적 가속구조 종류를 고른다</summary>

```c
int st_off_scene_set_accel(STOFF_Context* context, int kind);
```

**용도** — 레이 교차에 쓰는 BLAS·정적 가속구조의 구현을 호스트가 고릅니다. 씬 규모나 빌드 시간·질의 속도 우선순위에 따라 구조를 바꿔 비교할 수 있게 합니다.

**언제·어떻게** — 오브젝트를 넣기 전에 부릅니다. 이후의 빌드에만 적용됩니다. 기본은 `2`(TinyBVH)입니다. 실시간 `st_rt_scene_set_accel`과 완전히 같은 계약입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `kind` | `0` = BinnedSAH / `1` = HybridKD / `2` = TinyBVH(기본) / `3` = LBVH / `4` = LBVH_Simd |

**반환** — `1` = 적용 / `0` = `kind` 범위 밖이거나 컨텍스트 없음.

</details>

<details>
<summary><code>st_off_scene_set_triangle_intersection</code> — 삼각형 교차 커널을 고른다</summary>

```c
int st_off_scene_set_triangle_intersection(STOFF_Context* context, int kind);
```

**용도** — 레이–삼각형 교차 계산 방식을 고릅니다. 기본값은 실시간과 같은 MollerTrumbore라서, 오프라인이 실시간과 같은 기하 통계를 냅니다.

**언제·어떻게** — 커널은 `st_off_mesh_create` 시점에 메시에 고정되므로 이 호출 **이후 추가하는 메시에만** 적용됩니다(기존 메시에는 소급하지 않으며, 메시마다 커널이 달라도 유효한 구성입니다). 보통 메시를 만들기 전에 한 번 부릅니다. 세 커널 모두 양면 교차이며 백페이스 컬링이 없습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `kind` | `0` = MollerTrumbore(기본) / `1` = PluckerAdaptive / `2` = Watertight |

**반환** — `1` = 적용 / `0` = 잘못된 `kind`이거나 컨텍스트 없음.

</details>

<details>
<summary><code>st_off_scene_get_triangle_intersection</code> — 다음 메시에 적용될 교차 커널을 읽는다</summary>

```c
int st_off_scene_get_triangle_intersection(const STOFF_Context* context);
```

**용도** — `st_off_scene_set_triangle_intersection`으로 지정한 값을 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 값은 **다음 `st_off_mesh_create`에 적용될** 커널이며, 이미 만든 메시의 커널과 다를 수 있습니다. 스레드: `[control]` — 씬 읽기 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `0` = MollerTrumbore / `1` = PluckerAdaptive / `2` = Watertight.

</details>

<details>
<summary><code>st_off_scene_raycast</code> — 엔진 가속구조로 최근접 히트를 질의한다</summary>

```c
int st_off_scene_raycast(STOFF_Context* context, const float origin[3], const float direction[3], float maxDistanceMeters, STRayHit* outHit);
```

**용도** — 전파가 쓰는 바로 그 가속구조(정적+동적 TLAS)에 레이 한 개를 쏴서 가장 가까운 히트를 돌려줍니다. 호스트가 자기 물리 엔진과 별도로, 엔진이 실제로 보는 음향 기하를 확인·디버그할 수 있게 합니다.

**언제·어떻게** — `st_off_build` 뒤에 부릅니다. 빌드 전이면 오류 없이 미스가 됩니다. 읽기 전용 질의라 파이프라인 상태를 바꾸지 않습니다. 지원 여부는 `ST_CAP_SCENE_RAYCAST`. 스레드: `[control]` — 씬 읽기 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `origin` | 레이 원점, 월드 좌표 3성분(씬 단위). 유한해야 합니다 |
| `direction` | 레이 방향 3성분. 엔진이 정규화하며 유한하고 0벡터가 아니어야 합니다 |
| `maxDistanceMeters` | 최대 거리(미터). `sceneRatio`로 씬 단위로 되돌려 적용합니다. `≤ 0` 또는 비유한 값 = 무한 |
| `outHit` | 결과. 호출자가 `structSize = sizeof(STRayHit)`, `apiVersion = ST_ABI_VERSION`을 채웁니다 |

**구조체** `STRayHit`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채움 |
| `hit` | `1` = 히트 / `0` = 미스 |
| `distanceMeters` | 원점에서 히트점까지 거리(씬 거리 × `sceneRatio`). 미스면 0 |
| `point[3]` | 히트점, 씬 좌표 그대로. 미스면 0 |
| `normal[3]` | 히트 삼각형의 단위 기하 법선. 항상 레이 원점 쪽을 향하도록 정렬되며(와인딩 부호는 유지되지 않음) 미스면 0 |
| `objectId` | 히트한 오브젝트 id. 미스면 `-1` |
| `meshId` | 그 오브젝트의 메시 id. 미스면 `-1` |
| `triangleIndex` | 메시 로컬 삼각형 인덱스. 미스면 `-1` |
| `materialIndex` | 그 삼각형의 재질 인덱스. 미스면 `-1` |
| `reserved[6]` | 예약 |

`0`은 유효한 id이므로 미스 판정은 반드시 `hit`(또는 id가 `-1`인지)로 합니다.

**반환** — `1` = 호출 성공(히트 여부는 `outHit->hit`, 미스는 실패가 아님) / `0` = `context`·포인터가 `NULL`, 스탬프 불일치(`ST_STATUS_VERSION_MISMATCH`), `origin`·`direction` 비유한 또는 `direction`이 0벡터(`ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_mesh_create</code> — 삼각형 메시를 등록한다</summary>

```c
STMeshId st_off_mesh_create(STOFF_Context* context, const STMesh* mesh, STMaterialId material, const int32_t* triangleMaterialIndices);
```

**용도** — 음향 기하로 쓸 삼각형 메시를 등록합니다. 등록 시점에 회절용 음향 엣지 토폴로지를 컴파일하고 교차 커널을 고정합니다. 메시는 그 자체로는 씬에 놓이지 않고, `st_off_object_create`로 인스턴스를 만들어야 전파에 참여합니다.

**언제·어떻게** — 재질을 등록하고, 필요하면 `st_off_scene_set_triangle_intersection`·`st_off_scene_set_edge_split_collinear_overlaps`를 정한 뒤 부릅니다. 재질은 둘 중 하나로 지정합니다 — `triangleMaterialIndices`가 `NULL`이면 메시 전체가 `material` 하나를 쓰고, `NULL`이 아니면 삼각형마다 재질 인덱스를 주며 그때 `material` 인자는 무시됩니다(지원 여부 `ST_CAP_PER_TRIANGLE_MATERIALS`). 메시 하나 안에서는 와인딩을 일관되게 유지합니다 — 부분적으로 뒤집힌 와인딩은 두께 0 판의 회절 엣지를 잃게 할 수 있습니다. 실시간 `st_rt_mesh_create`와 완전히 같은 계약입니다. 스레드: `[control, blocking]` — 음향 엣지 토폴로지 컴파일이 메시 크기에 비례해 오래 걸릴 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 메시 데이터. 엔진이 호출 중에 읽어 들입니다 |
| `material` | 메시 전체 재질 핸들(`triangleMaterialIndices == NULL`일 때만 사용) |
| `triangleMaterialIndices` | 삼각형별 재질 인덱스 배열(`mesh->numTriangles`개, 재질 핸들의 `v` 값). `NULL`이면 `material` 하나를 씁니다 |

**구조체** `STMesh`

| 필드 | 설명 |
|---|---|
| `numVertices` | 정점 수(> 0) |
| `vertices` | xyz가 이어진 정점 배열(`numVertices × 3` float), 메시 로컬 좌표(씬 단위) |
| `numTriangles` | 삼각형 수(> 0) |
| `triangles` | 정점 인덱스 배열(`numTriangles × 3` int) |

**반환** — 메시 핸들 `STMeshId`. 실패는 `v < 0`(컨텍스트·`mesh`·배열이 `NULL`이거나 정점·삼각형 수가 0 이하 등).

</details>

<details>
<summary><code>st_off_object_create</code> — 메시 인스턴스를 행렬 변환으로 씬에 놓는다</summary>

```c
STObjectId st_off_object_create(STOFF_Context* context, STMeshId mesh, const STTransform* transform, int isDynamic);
```

**용도** — 등록한 메시를 월드 변환과 함께 씬에 배치해 전파에 참여시킵니다. 같은 메시를 여러 오브젝트가 공유할 수 있습니다.

**언제·어떻게** — `st_off_mesh_create` 뒤, `st_off_build` 전에 부릅니다. 정적 오브젝트(`isDynamic = 0`)는 정적 가속구조에, 동적 오브젝트는 동적 TLAS에 들어가며 `st_off_object_set_transform*`로 옮긴 뒤 `st_off_build_dynamic`으로 갱신합니다. 쿼터니언으로 배치하려면 `st_off_object_create_q`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | `st_off_mesh_create`가 돌려준 메시 핸들 |
| `transform` | 메시 로컬 → 월드 변환 |
| `isDynamic` | `0` = 정적 / 그 밖 = 동적 |

**구조체** `STTransform`

| 필드 | 설명 |
|---|---|
| `m00, m01, m02` / `m10, m11, m12` / `m20, m21, m22` | 3×3 회전·스케일, 행 우선(row-major) |
| `tx, ty, tz` | 이동(씬 단위) |

점은 열벡터로 곱합니다: `x' = m00·x + m01·y + m02·z + tx`, `y' = m10·x + m11·y + m12·z + ty`, `z' = m20·x + m21·y + m22·z + tz`. 비균등 스케일과 행렬식이 음수인 변환(거울·음수 스케일)도 받습니다.

**반환** — 오브젝트 핸들 `STObjectId`. 실패는 `v < 0`.

</details>

<details>
<summary><code>st_off_object_create_q</code> — 메시 인스턴스를 위치·쿼터니언·스케일로 씬에 놓는다</summary>

```c
STObjectId st_off_object_create_q(STOFF_Context* context, STMeshId mesh, const float position[3], const float quatXYZW[4], const float scale[3], int isDynamic);
```

**용도** — `st_off_object_create`의 쿼터니언판입니다. 게임 엔진의 TRS(위치·회전·스케일) 표현을 행렬로 바꾸지 않고 그대로 넣을 수 있습니다.

**언제·어떻게** — `st_off_object_create`와 같습니다(`st_off_build` 전, 동적이면 이후 `st_off_build_dynamic`). 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 메시 핸들 |
| `position` | 위치 xyz(씬 단위) |
| `quatXYZW` | 로컬 → 월드 회전 쿼터니언, **XYZW 순서**. 엔진이 정규화하며 `norm < 1e-12`이면 항등으로 대체합니다 |
| `scale` | 축별 스케일 xyz. R·S로 합성되며 비균등을 허용합니다 |
| `isDynamic` | `0` = 정적 / 그 밖 = 동적 |

**반환** — 오브젝트 핸들 `STObjectId`. 실패는 `v < 0`.

</details>

<details>
<summary><code>st_off_source_create</code> — 음원을 만든다</summary>

```c
STSourceId st_off_source_create(STOFF_Context* context, const STSourceDesc* source);
```

**용도** — IR을 계산할 음원을 씬에 추가합니다. 오프라인 컨텍스트의 음원은 오디오 입력(파일·스트림)을 받지 않고, 리스너와 짝을 이뤄 IR 계산·렌더의 대상이 됩니다. 실시간과 달리 음원 수 예산이 없습니다.

**언제·어떻게** — 씬을 구성한 뒤 `st_off_ir_compute` 전에 만듭니다. 생성 직후 상태는 실시간과 같습니다 — source energy 1.0, 경로 볼륨 4종 1.0, 지향성 테이블 없음, 방향은 `direction`에 맞춘 roll 없는 회전, 수송 갱신 단계 수 0. 이후 위치·방향·레이 수·깊이·EQ·지향성 등은 `st_off_source_set_*`로 바꿉니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 기술자. 모든 값이 유한해야 하고 `intensity ≥ 0`이어야 합니다 |

**구조체** `STSourceDesc`

| 필드 | 설명 |
|---|---|
| `positionX, positionY, positionZ` | 위치(씬 단위) |
| `directionX, directionY, directionZ` | 정면 방향. 이 방향에 맞는 roll 없는 소스 프레임이 만들어집니다 |
| `velocityX, velocityY, velocityZ` | 속도(씬 단위/초). `sceneRatio`로 m/s로 바뀌어 도플러 방사 이득(`st_off_set_doppler_gain_mode`)에 쓰입니다 |
| `intensity` | 무차원 선형 **압력** 게인(≥ 0). 음향 인텐시티(W/m²)·SPL·Pa가 아닙니다. 별도의 에너지 배율은 `st_off_source_set_energy` |
| `directional` | `0` = 무지향(onAxis = offAxis = 1) / 그 밖 = 지향 프로파일(onAxis = 1, offAxis = 0) |
| `isDynamic` | `1` = 동적 / `0` = 정적. 오프라인에서 정적 소스의 수송은 계산마다 한 번 굽고 고정되며, 동적 소스는 매 계산 전량 재추적합니다 |

**반환** — 음원 핸들 `STSourceId`. 실패는 `v < 0`(`NULL`, 비유한 값, 음수 `intensity`는 `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_listener_create</code> — 리스너를 하나 더 만든다</summary>

```c
STListenerId st_off_listener_create(STOFF_Context* context);
```

**용도** — 오프라인 컨텍스트는 리스너를 여러 개 둘 수 있습니다. 한 씬에서 여러 청취 위치의 IR을 한 번의 `st_off_ir_compute`로 얻기 위한 것입니다. 실시간 DLL에는 없는 오프라인 전용 함수입니다.

**언제·어떻게** — 컨텍스트를 만들면 리스너 하나(id `1`)가 자동으로 만들어져 활성 상태입니다. 그 외 청취 위치마다 이 함수를 부릅니다. 새 리스너는 자동으로 활성이 되지 않습니다 — 리스너 위치·방향 setter(`st_off_listener_set_position` 등)는 **활성 리스너**에 적용되므로, `st_off_listener_set_active`로 전환한 뒤 포즈를 지정합니다. IR 계산은 등록된 리스너마다 이루어지고, 렌더·원시 IR 조회 함수가 리스너 핸들을 인자로 받습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 새 리스너 핸들 `STListenerId`. 실패는 `v < 0`.

</details>

<details>
<summary><code>st_off_listener_set_active</code> — 활성 리스너를 바꾼다</summary>

```c
void st_off_listener_set_active(STOFF_Context* context, STListenerId listener);
```

**용도** — 리스너 포즈 setter(`st_off_listener_set_position` · `_set_rotation` · `_set_orientation_q` · `_set_rotation_ypr`)가 어느 리스너에 적용될지 고릅니다.

**언제·어떻게** — 여러 리스너를 쓸 때, 각 리스너의 포즈를 지정하기 직전에 부릅니다. 존재하지 않는 리스너 핸들이면 아무것도 바꾸지 않습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `listener` | 활성으로 만들 리스너 핸들 |

**반환** — 없음. 전환 여부는 `st_off_listener_get_active`로 확인합니다.

</details>

<details>
<summary><code>st_off_listener_get_active</code> — 현재 활성 리스너를 읽는다</summary>

```c
STListenerId st_off_listener_get_active(const STOFF_Context* context);
```

**용도** — 포즈 setter가 지금 어느 리스너를 대상으로 하는지 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 생성 직후 값은 자동 생성된 리스너 `1`입니다. 스레드: `[any]` — atomic 읽기입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 활성 리스너 핸들. `context`가 `NULL`이면 `v = -1`.

</details>

<details>
<summary><code>st_off_listener_destroy</code> — 리스너를 지운다</summary>

```c
int st_off_listener_destroy(STOFF_Context* context, STListenerId listener);
```

**용도** — 더 이상 계산할 필요가 없는 청취 위치를 제거해 다음 계산의 비용을 줄입니다.

**언제·어떻게** — 활성 리스너는 지울 수 없습니다 — 먼저 `st_off_listener_set_active`로 다른 리스너로 전환합니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `listener` | 지울 리스너 핸들 |

**반환** — `1` = 제거 / `0` = 컨텍스트 없음, 없는 리스너, 또는 활성 리스너.

</details>

<details>
<summary><code>st_off_source_set_position</code> — 음원 위치를 바꾼다</summary>

```c
void st_off_source_set_position(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**용도** — 음원을 옮깁니다.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 변경은 다음 계산에 반영됩니다. 실시간과 달리 모션 큐가 없고 즉시 씬에 적용됩니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `x`, `y`, `z` | 월드 위치(씬 단위) |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_source_set_direction</code> — 음원 정면 방향을 바꾼다</summary>

```c
void st_off_source_set_direction(STOFF_Context* context, STSourceId source, float x, float y, float z);
```

**용도** — 지향성 음원(콘 또는 지향성 테이블)의 정면을 돌립니다.

**언제·어떻게** — 소스 프레임(`st_off_source_set_orientation_q`)과 양방향 동기화됩니다 — 이 함수를 부르면 프레임은 "+Z에서 이 방향으로 가는 roll 없는 최소 회전"이 됩니다. roll이 필요하면 이 함수 대신 `st_off_source_set_orientation_q`를 씁니다. 변경은 다음 `st_off_ir_compute`에 반영됩니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `x`, `y`, `z` | 월드 방향 벡터 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_listener_set_position</code> — 활성 리스너의 위치를 바꾼다</summary>

```c
void st_off_listener_set_position(STOFF_Context* context, float x, float y, float z);
```

**용도** — 청취 위치를 지정합니다.

**언제·어떻게** — **활성 리스너**에 적용됩니다(여러 리스너는 `st_off_listener_set_active`로 전환하며 지정). 방향은 유지됩니다. 변경은 다음 `st_off_ir_compute`에 반영됩니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `x`, `y`, `z` | 월드 위치(씬 단위) |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_listener_set_rotation</code> — 활성 리스너의 방향을 yaw·pitch로 정한다</summary>

```c
void st_off_listener_set_rotation(STOFF_Context* context, float yaw, float pitch);
```

**용도** — 바이노럴·공간화 렌더가 기준으로 삼는 리스너 머리 방향을 지정합니다.

**언제·어떻게** — 활성 리스너에 적용됩니다. 회전은 R = Ry(yaw)·Rx(pitch)이며, yaw = pitch = 0이면 forward = +Z, up = +Y, right = +X입니다. forward = (sin(yaw)·cos(pitch), −sin(pitch), cos(yaw)·cos(pitch)). 방향 벡터 d에서 역으로 구하려면 `yaw = atan2f(d.x, d.z); pitch = -asinf(d.y);`. roll은 표현할 수 없습니다 — 필요하면 `st_off_listener_set_rotation_ypr` 또는 `st_off_listener_set_orientation_q`를 씁니다. 리스너 방향 setter 셋은 마지막에 부른 쪽이 이깁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `yaw` | 라디안. 양수 = 위에서 내려다볼 때 시계 방향(오른쪽으로 돈다) |
| `pitch` | 라디안. 양수 = 아래를 본다 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_listener_set_orientation_q</code> — 활성 리스너의 방향을 쿼터니언으로 정한다</summary>

```c
int st_off_listener_set_orientation_q(STOFF_Context* context, const float quatXYZW[4]);
```

**용도** — roll(머리 기울임)까지 포함한 리스너 방향을 게임 엔진의 쿼터니언 그대로 넣습니다.

**언제·어떻게** — 활성 리스너에 적용됩니다. 로컬 축은 forward = +Z · up = +Y · right = +X이고, 소스 `orientation_q`와 같은 순서·같은 검증입니다. yaw/pitch 표현은 q = q_y(yaw)·q_x(pitch)인 roll 0 경우에 해당합니다. 리스너 방향 setter 셋은 마지막에 부른 쪽이 이깁니다. 지원 여부는 워드 1의 `ST_CAP1_LISTENER_ORIENTATION_Q`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `quatXYZW` | 로컬 → 월드 단위 쿼터니언, **XYZW 순서**. 엔진이 정규화합니다 |

**반환** — `1` = 성공 / `0` = 실패. 비유한 성분이나 퇴화(`norm < 1e-12`)는 `ST_STATUS_INVALID_ARGUMENT`이며 아무것도 바꾸지 않습니다.

</details>

<details>
<summary><code>st_off_listener_set_rotation_ypr</code> — 활성 리스너의 방향을 yaw·pitch·roll로 정한다</summary>

```c
int st_off_listener_set_rotation_ypr(STOFF_Context* context, float yaw, float pitch, float roll);
```

**용도** — `st_off_listener_set_rotation`에 roll을 더한 오일러판입니다.

**언제·어떻게** — 활성 리스너에 적용됩니다. 회전은 R = Ry(yaw)·Rx(pitch)·Rz(roll)이며 Unity `Quaternion.Euler(pitch, yaw, roll)`(도 → 라디안)과 같은 순서입니다. `roll = 0`이면 `st_off_listener_set_rotation(yaw, pitch)`와 같은 행렬입니다. 리스너 방향 setter 셋은 마지막에 부른 쪽이 이깁니다. 지원 여부는 `ST_CAP1_LISTENER_ORIENTATION_Q`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `yaw` | 라디안. 양수 = 오른쪽으로 돈다 |
| `pitch` | 라디안. 양수 = 아래를 본다 |
| `roll` | 라디안. 양수 = right 축이 위로 기운다(머리가 왼쪽으로 기울고 오른쪽 귀가 올라감) |

**반환** — `1` = 성공 / `0` = 실패. 비유한 값은 `ST_STATUS_INVALID_ARGUMENT`이며 아무것도 바꾸지 않습니다.

</details>

<details>
<summary><code>st_off_object_set_transform</code> — 오브젝트 변환을 행렬로 바꾼다</summary>

```c
void st_off_object_set_transform(STOFF_Context* context, STObjectId object, const STTransform* transform);
```

**용도** — 배치한 오브젝트를 옮기거나 회전·스케일합니다.

**언제·어떻게** — 바꾼 뒤 가속구조에 반영해야 다음 계산에 쓰입니다 — 동적 오브젝트는 `st_off_build_dynamic`(동적 TLAS refit), 정적 오브젝트는 `st_off_build`(전체 빌드). 쿼터니언판은 `st_off_object_set_transform_q`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `object` | 오브젝트 핸들 |
| `transform` | 새 로컬 → 월드 변환. `STTransform` 필드는 `st_off_object_create` 항목 참고 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_object_set_transform_q</code> — 오브젝트 변환을 위치·쿼터니언·스케일로 바꾼다</summary>

```c
void st_off_object_set_transform_q(STOFF_Context* context, STObjectId object, const float position[3], const float quatXYZW[4], const float scale[3]);
```

**용도** — `st_off_object_set_transform`의 쿼터니언판입니다. 실시간 `st_rt_object_set_transform_q`와 같은 계약입니다.

**언제·어떻게** — `st_off_object_set_transform`과 같습니다(이후 `st_off_build_dynamic` 또는 `st_off_build`). 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `object` | 오브젝트 핸들 |
| `position` | 위치 xyz(씬 단위) |
| `quatXYZW` | 회전 쿼터니언, **XYZW 순서**. 엔진이 정규화합니다 |
| `scale` | 축별 스케일 xyz(비균등 허용) |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_source_destroy</code> — 음원을 지운다</summary>

```c
int st_off_source_destroy(STOFF_Context* context, STSourceId source);
```

**용도** — 음원을 씬에서 제거합니다. 소스 EQ 등 소스별 설정도 함께 사라집니다.

**언제·어떻게** — 다음 `st_off_ir_compute`부터 그 음원은 계산되지 않습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |

**반환** — `1` = 제거 / `0` = 컨텍스트 없음 또는 없는 음원.

</details>

<details>
<summary><code>st_off_mesh_destroy</code> — 메시를 지운다</summary>

```c
int st_off_mesh_destroy(STOFF_Context* context, STMeshId mesh);
```

**용도** — 등록한 메시를 제거합니다.

**언제·어떻게** — 씬 구성을 바꾼 뒤에는 `st_off_build`로 가속구조를 다시 짓습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 메시 핸들 |

**반환** — `1` = 제거 / `0` = 컨텍스트 없음 또는 제거 실패.

</details>

<details>
<summary><code>st_off_object_destroy</code> — 오브젝트를 지운다</summary>

```c
int st_off_object_destroy(STOFF_Context* context, STObjectId object);
```

**용도** — 배치한 메시 인스턴스를 씬에서 뺍니다.

**언제·어떻게** — 씬 구성을 바꾼 뒤에는 `st_off_build`로 가속구조를 다시 짓습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `object` | 오브젝트 핸들 |

**반환** — `1` = 제거 / `0` = 컨텍스트 없음 또는 없는 오브젝트.

</details>

<details>
<summary><code>st_off_mesh_set_material</code> — 메시 재질을 바꾼다</summary>

```c
int st_off_mesh_set_material(STOFF_Context* context, STMeshId mesh, STMaterialId material);
```

**용도** — 기하를 다시 등록하지 않고 메시의 재질만 교체합니다. 재질 A/B 비교에 씁니다.

**언제·어떻게** — 변경은 다음 `st_off_ir_compute`에 반영됩니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mesh` | 메시 핸들 |
| `material` | 새 재질 핸들 |

**반환** — `1` = 성공 / `0` = 컨텍스트 없음, 없는 메시·재질.

</details>

<details>
<summary><code>st_off_source_set_ray_count</code> — 음원의 수송 레이 격자 크기를 정한다</summary>

```c
void st_off_source_set_ray_count(STOFF_Context* context, STSourceId source, int width, int height);
```

**용도** — 음원에서 쏘는 확산 수송(diffuse transport) 레이의 수를 정합니다. 레이 수 N = `width × height`이며, 늘리면 잔향·확산 성분의 통계가 안정되는 대신 계산 비용이 늘어납니다.

**언제·어떻게** — `st_off_ir_compute` 전에 음원마다 부릅니다. 기본은 16 × 8입니다. 받아들일 수 없는 값이면 설정을 바꾸지 않고 `st_off_get_last_status`에 `ST_STATUS_INVALID_ARGUMENT`를 남깁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `width` | 격자 가로 레이 수(기본 16) |
| `height` | 격자 세로 레이 수(기본 8) |

**반환** — 없음. 실패는 `st_off_get_last_status`로 확인합니다.

</details>

<details>
<summary><code>st_off_source_set_depth</code> — 음원별 최대 반사 깊이를 정한다</summary>

```c
void st_off_source_set_depth(STOFF_Context* context, STSourceId source, int depth);
```

**용도** — 이 음원에서 추적하는 반사 차수 상한을 음원마다 따로 정합니다. 중요한 음원만 깊게 추적해 비용을 배분할 때 씁니다.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 기본은 음원별 4입니다(전역 상한은 `st_off_set_max_depth`, 기본 8). 받아들일 수 없는 값이면 `st_off_get_last_status`에 `ST_STATUS_INVALID_ARGUMENT`를 남깁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `depth` | 최대 반사 깊이(기본 4) |

**반환** — 없음. 실패는 `st_off_get_last_status`로 확인합니다.

</details>

<details>
<summary><code>st_off_source_set_energy</code> — 음원의 에너지 배율을 정한다</summary>

```c
int st_off_source_set_energy(STOFF_Context* context, STSourceId source, float energy);
```

**용도** — `STSourceDesc.intensity`(압력 도메인 게인)와 별개인 **에너지 도메인** 상대 배율로 음원 세기를 조정합니다. 지원 여부는 `ST_CAP_SOURCE_ENERGY`.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 기본은 1.0입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `energy` | 에너지 배율. 유한하고 `≥ 0`이어야 합니다(기본 1.0) |

**반환** — `1` = 성공 / `0` = 컨텍스트 없음, 비유한·음수 값, 없는 음원.

</details>

<details>
<summary><code>st_off_source_set_transport_refresh_steps</code> — 음원별 수송 갱신 단계 수를 저장한다</summary>

```c
int st_off_source_set_transport_refresh_steps(STOFF_Context* context, STSourceId source, int steps);
```

**용도** — 실시간 컨텍스트에서 음원의 수송 레이 격자 N을 n번의 전파에 나눠 갱신하게 하는 값입니다. 오프라인에도 같은 setter가 있는 것은, 호스트가 같은 씬 설정을 실시간 컨텍스트에 그대로 재생할 수 있도록 값을 왕복시키기 위해서입니다.

**언제·어떻게** — 오프라인 컨텍스트는 롤링 수송을 쓰지 않으므로 **동적 음원의 n을 무시하고 매 계산 전량 재추적합니다**(실효 n = 1). 그래서 같은 씬·같은 입력이면 몇 번을 계산해도 같은 RIR이 나옵니다. 정적 음원은 n과 무관하게 계산마다 한 번 구운 결과로 고정됩니다. 값 자체는 저장되고 `st_off_source_get_transport_refresh_steps`가 그대로 돌려줍니다. 실시간 `st_rt_source_set_transport_refresh_steps`와 시그니처·반환 계약이 같습니다. 지원 여부는 `ST_CAP_SOURCE_TRANSPORT_REFRESH_STEPS`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `steps` | `0` = 기본(셸·음원 플래그가 정함) / `1` = 매 전파 전량 재추적 / `≥ 2` = n번에 나눠 갱신(실시간에서 `[1, N]`으로 clamp). 음수는 거절 |

**반환** — `1` = 성공 / `0` = 실패: 음수 `steps`는 `ST_STATUS_INVALID_ARGUMENT`, 없는 음원은 `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_off_source_get_transport_refresh_steps</code> — 저장된 수송 갱신 단계 수를 읽는다</summary>

```c
int st_off_source_get_transport_refresh_steps(const STOFF_Context* context, STSourceId source);
```

**용도** — `st_off_source_set_transport_refresh_steps`로 저장한 값을 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 돌려주는 값은 실효 n이 아니라 **저장값 그대로**(0 포함)입니다 — 오프라인의 동적 음원 실효값은 항상 1입니다. 스레드: `[control]` — 씬 읽기 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |

**반환** — 저장된 단계 수(`≥ 0`). 실패는 `-1`.

</details>

<details>
<summary><code>st_off_source_set_orientation_q</code> — 음원 로컬 프레임을 쿼터니언으로 정한다</summary>

```c
int st_off_source_set_orientation_q(STOFF_Context* context, STSourceId source, const float quatXYZW[4]);
```

**용도** — 음원의 로컬 프레임을 roll까지 포함해 월드에 얹습니다. 지향성 테이블은 이 프레임 기준으로 조회되므로, 테이블을 쓰는 음원은 이 함수로 방향을 지정합니다.

**언제·어떻게** — 로컬 축은 forward = +Z / up = +Y / right = +X입니다. `st_off_source_set_direction`과 양방향 동기화됩니다 — 여기서 프레임을 주면 direction = forward(q)로 함께 바뀌고, direction setter를 부르면 프레임은 roll 없는 최소 회전이 됩니다. roll이 필요하면 반드시 이 함수를 씁니다. 실시간 `st_rt_source_set_orientation_q`와 같은 계약입니다. 지원 여부는 `ST_CAP_SOURCE_DIRECTIVITY`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `quatXYZW` | 로컬 → 월드 단위 쿼터니언, **XYZW 순서**. 엔진이 정규화합니다 |

**반환** — `1` = 성공 / `0` = 실패: 비유한 성분 또는 퇴화(`norm < 1e-12`)는 `ST_STATUS_INVALID_ARGUMENT`, 없는 음원은 `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_off_source_set_directivity</code> — 음원 지향성 테이블을 붙이거나 뗀다</summary>

```c
int st_off_source_set_directivity(STOFF_Context* context, STSourceId source, const STSourceDirectivity* table);
```

**용도** — 측정·저작한 방위각 × 고도각 × 9밴드 에너지 테이블로 음원의 방사 패턴을 지정합니다. 단순한 정면/측면 콘보다 실제 음원(악기·스피커·사람 목소리 등)의 방사를 정확히 담을 수 있습니다.

**언제·어떻게** — 테이블이 붙어 있는 동안에는 콘 감쇠(`STSourceDesc.directional`이 만든 on/off-axis) 대신 테이블이 쓰이고, `table = NULL`로 떼면 콘 공식으로 돌아갑니다. 엔진이 테이블을 **복사**하므로 호출이 돌아온 뒤 호스트 버퍼를 해제해도 됩니다. 조회 방향은 소스 프레임 기준이라 `st_off_source_set_orientation_q`와 짝으로 씁니다. 실시간 `st_rt_source_set_directivity`와 같은 계약입니다. 지원 여부는 `ST_CAP_SOURCE_DIRECTIVITY`. 스레드: `[control]` — 테이블 복사와 정규화 스칼라 계산을 이 호출에서 한 번 합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `table` | 지향성 테이블. 호출자가 `structSize`/`apiVersion`을 채웁니다. `NULL`이면 테이블 제거 |

**구조체** `STSourceDirectivity`

| 필드 | 설명 |
|---|---|
| `structSize` / `apiVersion` | 호출자가 채움 |
| `azCount` | 방위각 노드 수, `[3, 361]`. 노드 az_i = i·360/azCount(360°에서 wrap) |
| `elCount` | 고도각 노드 수, `[2, 181]`. 노드 el_j = −90 + j·180/(elCount−1). 홀수면 수평면(0°)이 노드에 놓입니다. 권장 격자는 5° 간격(72 × 37) |
| `levelMode` | `STDirectivityLevelMode` — `ST_DIRECTIVITY_ABSOLUTE`(0, 값을 그대로 씀: 절대 레벨까지 담긴 측정 자료용) / `ST_DIRECTIVITY_POWER_MEAN`(1, 밴드별 구면 파워 평균이 1이 되도록 정규화: 패턴만 쓰고 총 파워는 intensity/energy로 잡을 때, 권장) / `ST_DIRECTIVITY_ON_AXIS`(2, 정면 값이 1이 되도록 정규화) |
| `reserved0` | 예약 |
| `energy` | `elCount × azCount × ST_FREQUENCY_BANDS`개 float, 레이아웃 `[el][az][band]`(band가 가장 빠름). **에너지 도메인**, 유한하고 `≥ 0` |
| `reserved[6]` | 예약 |

방향 규약은 소스 로컬 프레임에서 az = atan2(x, z)(정면 0, 오른쪽 +90°), el = asin(y)(위 +)이며, 조회는 az wrap · el clamp 쌍선형 보간입니다.

**반환** — `1` = 성공(테이블 제거 포함) / `0` = 실패: 스탬프 불일치 `ST_STATUS_VERSION_MISMATCH`, `levelMode`·`azCount`·`elCount` 범위 밖·`energy`가 `NULL`·비유한 또는 음수 원소 `ST_STATUS_INVALID_ARGUMENT`(사유는 `st_off_get_last_error`), 없는 음원 `ST_STATUS_NOT_FOUND`.

</details>

<details>
<summary><code>st_off_source_set_eq</code> — 음원 원음에 9밴드 그래픽 EQ를 건다</summary>

```c
int st_off_source_set_eq(STOFF_Context* context, STSourceId source, const float gainsDb[ST_FREQUENCY_BANDS]);
```

**용도** — 음원 신호 자체의 음색을 9밴드로 보정합니다. 크로스오버 앞에서 걸리므로 그 음원의 모든 경로(직접·투과·반사·회절)와 잔향 송출에 같은 필터가 적용됩니다. 실시간 `st_rt_source_set_eq`와 같은 구현이라 같은 결과를 냅니다.

**언제·어떻게** — 렌더 전용 설정이라 IR 캐시를 무효화하지 않습니다 — `st_off_ir_compute`를 다시 하지 않고 렌더만 다시 하면 바로 반영됩니다(압력 IR의 솔로·혼합·배치 렌더 모두). `gainsDb = NULL` 또는 전 밴드 0 dB면 EQ를 끄며, 그 결과는 EQ가 없는 결과와 비트 동일합니다. 설정은 음원을 지울 때까지 유지되고 `st_off_trim_memory`에도 남습니다. 파라메트릭 EQ(`st_off_source_set_parametric_eq`)와 같은 EQ를 공유하며 마지막에 부른 setter가 이깁니다. 지원 여부는 `ST_CAP_SOURCE_EQ`. 스레드: `[control]` — 씬 읽기 락과 오디오라이저 컨트롤 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `gainsDb` | 밴드별 게인(dB), 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz 순서. 유한하고 `[−ST_SOURCE_EQ_MAX_GAIN_DB, +ST_SOURCE_EQ_MAX_GAIN_DB]`(±24 dB) 범위여야 하며 클램프하지 않고 거절합니다. `NULL` = 끔 |

필터는 밴드마다 RBJ 피킹 biquad 하나(중심 = 밴드 중심, Q = 1.414)를 44100 Hz에서 오름차순 직렬로 겁니다. 이웃 밴드끼리 응답이 겹치므로 밴드 중심에서 정확히 지정값을 원하면 호스트가 게인을 보정해 넣습니다.

**반환** — `1` = 성공 / `0` = 실패: 비유한 값 또는 범위 밖 `ST_STATUS_INVALID_ARGUMENT`(아무것도 바꾸지 않음), 없는 음원 `ST_STATUS_NOT_FOUND`, 소스 EQ를 지원하지 않는 백엔드(Exa) `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_source_get_eq</code> — 음원 EQ를 9밴드 게인으로 읽는다</summary>

```c
int st_off_source_get_eq(STOFF_Context* context, STSourceId source, float outGainsDb[ST_FREQUENCY_BANDS]);
```

**용도** — 현재 음원 EQ를 9밴드 그래픽 EQ 뷰로 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. EQ가 꺼져 있으면 전부 0입니다. 파라메트릭 EQ로 9밴드 모양이 아닌 설정을 걸었다면 그래픽 뷰로 표현할 수 없어 실패합니다 — `0` + `ST_STATUS_UNAVAILABLE`일 때 `st_off_source_get_parametric_eq`를 불러 성공하면 그쪽으로 설정을 읽고, 같은 `UNAVAILABLE`로 실패하면 백엔드가 소스 EQ를 지원하지 않는 것입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `outGainsDb` | 9밴드 게인(dB)을 받을 배열 |

**반환** — `1` = 성공 / `0` = 실패: `outGainsDb`가 `NULL`이면 `ST_STATUS_INVALID_ARGUMENT`, 없는 음원 `ST_STATUS_NOT_FOUND`, `ST_STATUS_UNAVAILABLE`(백엔드 미지원 또는 9밴드로 표현할 수 없는 파라메트릭 설정 — 이때 `outGainsDb`는 건드리지 않음).

</details>

<details>
<summary><code>st_off_source_set_parametric_eq</code> — 음원 원음에 파라메트릭 EQ를 건다</summary>

```c
int st_off_source_set_parametric_eq(STOFF_Context* context, STSourceId source, const STParametricEqBand* bands, int32_t bandCount, float preampDb, int32_t enabled);
```

**용도** — 9밴드 고정 EQ보다 자유로운 밴드 목록(피킹·셸프·LP·HP·노치)으로 음원 음색을 보정합니다. `st_off_source_set_eq`와 **같은 EQ**이며, 걸리는 위치(크로스오버 앞, 그 음원의 모든 경로)도 같습니다. AutoEq 프로파일은 `st_off_render_parse_autoeq_parametric`으로 읽어 그대로 넣을 수 있습니다.

**언제·어떻게** — 오프라인은 램프 없이 즉시 바뀌고, 압력 렌더의 솔로·혼합·배치 모두에 같은 필터가 걸립니다. IR 캐시를 무효화하지 않으므로 렌더만 다시 하면 반영됩니다. 두 소스 EQ setter는 목록 전체를 바꾸며 마지막에 부른 쪽이 이깁니다. 꺼진 목록이나 효과 없는 목록도 저장되며, 끄고 지우려면 `st_off_source_set_eq(context, source, NULL)`을 부릅니다. 설정은 음원을 지울 때까지 유지됩니다. 실시간 `st_rt_source_set_parametric_eq`와 같은 계약·같은 구현입니다. 지원 여부는 워드 1의 `ST_CAP1_SOURCE_PARAMETRIC_EQ`. 스레드: `[control]` — 씬 읽기 락과 오디오라이저 컨트롤 락을 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `bands` | 밴드 배열(`bandCount`개). `bandCount = 0`이면 `NULL`이어도 됩니다 |
| `bandCount` | 밴드 수, `[0, ST_PARAMETRIC_EQ_MAX_BANDS]`(16) |
| `preampDb` | 프리앰프(dB), `[ST_PARAMETRIC_EQ_MIN_PREAMP_DB, ST_PARAMETRIC_EQ_MAX_PREAMP_DB]`(−48 ~ +12)로 clamp. 주 용도는 클리핑 방지용 음수 값 |
| `enabled` | `0` = 목록은 저장하되 통과 / 그 밖 = 켬 |

**구조체** `STParametricEqBand`

| 필드 | 설명 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | `0` = 이 밴드는 항등(건너뜀) / 그 밖 = 켬 |
| `frequencyHz` | 중심(PEAKING·NOTCH) 또는 코너(셸프 중점·LP·HP) 주파수. `[20, min(20000, 0.49·44100)]`로 clamp |
| `gainDb` | PEAKING·셸프만 사용. `[−24, +24]`로 clamp |
| `q` | `[0.1, 30]`, 셸프는 `[0.1, 3]`로 clamp |
| `reserved[3]` | 반드시 `0` |

비유한 값·알 수 없는 `type`·`reserved ≠ 0`·밴드 수 범위 밖은 거절하고(아무것도 바꾸지 않음), 유한 값은 위 범위로 clamp합니다. 필터는 밴드마다 RBJ 2차 섹션(44100 Hz, double)이며 체인은 프리앰프 → 밴드 0..count−1 직렬입니다.

**반환** — `1` = 성공 / `0` = 실패: `ST_STATUS_INVALID_ARGUMENT` / `ST_STATUS_NOT_FOUND`(음원 없음) / `ST_STATUS_UNAVAILABLE`(Exa 백엔드).

</details>

<details>
<summary><code>st_off_source_get_parametric_eq</code> — 음원 EQ를 파라메트릭 밴드 목록으로 읽는다</summary>

```c
int st_off_source_get_parametric_eq(STOFF_Context* context, STSourceId source, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outEnabled);
```

**용도** — 현재 음원 EQ를 clamp된 실효값의 밴드 목록으로 돌려줍니다. 9밴드 setter로 건 설정도 PEAKING 밴드 9개로 읽힙니다.

**언제·어떻게** — 크기를 모르면 `outBands = NULL`로 먼저 불러 밴드 수를 받습니다. `ST_PARAMETRIC_EQ_MAX_BANDS`개 용량을 주면 항상 들어갑니다. EQ가 없으면 0밴드·꺼짐입니다. 출력 규약은 실시간 `st_rt_render_get_parametric_eq`와 같습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `outBands` | 밴드를 받을 배열. `NULL`이면 크기 질의(밴드는 쓰지 않음) |
| `bandCapacity` | `outBands`의 원소 수(`≥ 0`) |
| `outBandCount` | 밴드 수. `NULL`이면 건너뜀 |
| `outPreampDb` | 프리앰프(dB). `NULL`이면 건너뜀 |
| `outEnabled` | 켜짐 여부. `NULL`이면 건너뜀 |

`STParametricEqBand` 필드는 `st_off_source_set_parametric_eq` 항목 참고.

**반환** — `1` = 성공(크기 질의 포함) / `0` = 실패: `bandCapacity < 0`이면 `ST_STATUS_INVALID_ARGUMENT`, 용량이 밴드 수보다 작으면 `ST_STATUS_BUFFER_TOO_SMALL`(밴드 수·프리앰프·켜짐은 씀), 없는 음원 `ST_STATUS_NOT_FOUND`, Exa 백엔드 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_source_set_path_volume</code> — 음원의 경로 종류별 볼륨을 정한다</summary>

```c
int st_off_source_set_path_volume(STOFF_Context* context, STSourceId source, int volumeKind, float volume);
```

**용도** — 한 음원의 직접음·반사·회절·잔향 기여를 따로 키우거나 줄입니다. 물리 결과를 유지하면서 믹스 관점의 조정이 필요할 때 씁니다. 지원 여부는 `ST_CAP_SOURCE_PATH_VOLUME`.

**언제·어떻게** — 기본은 네 종류 모두 1.0입니다. 값은 **압력 도메인** 선형 배율입니다. 스레드: `[control]` — 씬 읽기 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `source` | 음원 핸들 |
| `volumeKind` | `STSourceVolumeKind` — `ST_SOURCE_VOLUME_DIRECT`(0, 투과 포함) / `ST_SOURCE_VOLUME_REFLECTION`(1) / `ST_SOURCE_VOLUME_DIFFRACTION`(2) / `ST_SOURCE_VOLUME_REVERB`(3, 이 음원이 리스너 공유 잔향 탱크를 구동하는 양만 조정) |
| `volume` | 선형 압력 배율. 유한하고 `≥ 0`(기본 1.0) |

**반환** — `1` = 성공 / `0` = 컨텍스트 없음, 범위 밖 `volumeKind`, 비유한·음수 `volume`, 없는 음원.

</details>

<details>
<summary><code>st_off_set_path_type_enabled</code> — 경로 종류를 전역으로 켜고 끈다</summary>

```c
void st_off_set_path_type_enabled(STOFF_Context* context, int pathType, int enabled);
```

**용도** — 직접음·투과·반사·회절·잔향 중 특정 경로 종류를 계산에서 빼서, 각 성분이 결과에 무엇을 기여하는지 분리해 들어 보거나 비용을 줄입니다.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 기본은 다섯 종류 모두 켜짐입니다. `st_off_set_acoustic_feature_enabled`와 조합하면 "거리 감쇠 + 패닝만 남긴" 기준선을 설정만으로 만들 수 있습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `pathType` | `0` = Direct / `1` = Transmission / `2` = Reflection / `3` = Diffraction / `4` = Reverb |
| `enabled` | `0` = 끔 / 그 밖 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_set_acoustic_feature_enabled</code> — 개별 음향 기능을 켜고 끈다</summary>

```c
int st_off_set_acoustic_feature_enabled(STOFF_Context* context, int feature, int enabled);
```

**용도** — 공기 흡수·전파 지연·직접음 차폐를 하나씩 끄고 켜서 청취 A/B 비교를 합니다. 실시간 `st_rt_set_acoustic_feature_enabled`와 같은 계약입니다.

**언제·어떻게** — 기본은 세 기능 모두 켜짐(물리 그대로)입니다. IR 정책 설정이라 호출하면 IR 캐시가 무효화되므로, 렌더 전에 `st_off_ir_compute`를 다시 부릅니다. 반사·회절·잔향을 끄고(`st_off_set_path_type_enabled`) 세 기능을 모두 끄면 거리 감쇠 + 패닝만 남습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `feature` | `ST_ACOUSTIC_FEATURE_AIR_ABSORPTION`(0, 대기 감쇠·고역 손실) / `ST_ACOUSTIC_FEATURE_PROPAGATION_DELAY`(1, 경로 길이 기반 전파 지연) / `ST_ACOUSTIC_FEATURE_DIRECT_OCCLUSION`(2, 직접음 가시성 검사) |
| `enabled` | `0` = 끔 / 그 밖 = 켬 |

**반환** — `1` = 성공 / `0` = 범위 밖 `feature`이거나 실패.

</details>

<details>
<summary><code>st_off_is_acoustic_feature_enabled</code> — 음향 기능의 켜짐 여부를 읽는다</summary>

```c
int st_off_is_acoustic_feature_enabled(const STOFF_Context* context, int feature);
```

**용도** — `st_off_set_acoustic_feature_enabled`로 지정한 상태를 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `feature` | `ST_ACOUSTIC_FEATURE_*`(0~2) |

**반환** — `1` = 켜짐 / `0` = 꺼짐 / `-1` = 컨텍스트 없음.

</details>

<details>
<summary><code>st_off_set_late_coupling</code> — late 잔향 결합 감쇠 파라미터를 개별로 정한다</summary>

```c
int st_off_set_late_coupling(STOFF_Context* context, float floorDb, float visibleLow, float visibleHigh, float sendNormalizeTrim, int rainDirectionWalk);
```

**용도** — 리스너가 음원의 확산장에 얼마나 결합돼 있는지(가시몫)에 따라 late 잔향 주입을 감쇠합니다. 잔향 탱크는 완전 혼합된 단일 공간이라 기본적으로 어디서나 같은 크기로 들리는데, ㄷ자·ㅁ자처럼 모퉁이 너머로 갈라진 공간에서 "멀어졌는데 잔향이 그대로이거나 오히려 커지는" 문제를 고치기 위한 옵션입니다.

**언제·어떻게** — 보통은 `st_off_set_late_coupling_preset`으로 충분하고, 세밀한 조정이 필요할 때 이 함수를 씁니다. 결합 감쇠·send 평탄화·rain 방향 워크는 함께 켜도록 설계된 묶음입니다 — 평탄화 없이 결합만 켜면 멀어질수록 잔향 주입이 오히려 커질 수 있고, rain 워크가 없으면 갈라진 공간 건너편의 late 방향 표본이 부족해집니다. 음원과 같은 공간(가시몫이 `visibleHigh` 이상)은 정확히 0 dB입니다. 파라미터 구성은 아직 확정되지 않아 바뀔 수 있습니다. IR 정책이라 바뀐 값은 다음 `st_off_ir_compute`부터 반영됩니다. 실시간 `st_rt_set_late_coupling`과 같은 계약입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `floorDb` | 완전 차단 시 감쇠 깊이(dB). `0` = 결합 감쇠 끔. 기본 9 |
| `visibleLow` | 가시몫이 이보다 작으면 완전 차단으로 보고 바닥 감쇠를 줍니다. `0` → 기본 0.05 |
| `visibleHigh` | 가시몫이 이보다 크면 같은 공간으로 보고 정확히 0 dB. `0` → 기본 0.60 |
| `sendNormalizeTrim` | send 총합 평탄화 트림. `0` = 평탄화 안 함. 기본 0.75 |
| `rainDirectionWalk` | `0` = 끔 / 그 밖 = 켬(기본). 체인이 끝난 뒤에도 late 방향 표본을 계속 모읍니다(에너지는 나르지 않음) |

**반환** — `1` = 성공 / `0` = 범위 밖 값이거나 실패.

</details>

<details>
<summary><code>st_off_get_late_coupling</code> — late 잔향 결합 감쇠 파라미터를 읽는다</summary>

```c
int st_off_get_late_coupling(const STOFF_Context* context, float* outFloorDb, float* outVisibleLow, float* outVisibleHigh, float* outSendNormalizeTrim, int* outRainDirectionWalk);
```

**용도** — 현재 적용 중인 late 결합 감쇠 설정(개별 setter 또는 프리셋으로 건 값)을 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 필요 없는 출력은 `NULL`로 둡니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `outFloorDb` | 바닥 감쇠 깊이(dB). `NULL` 허용 |
| `outVisibleLow` | 완전 차단 무릎. `NULL` 허용 |
| `outVisibleHigh` | 같은 공간 무릎. `NULL` 허용 |
| `outSendNormalizeTrim` | send 평탄화 트림. `NULL` 허용 |
| `outRainDirectionWalk` | rain 방향 워크 켜짐 여부. `NULL` 허용 |

각 값의 뜻은 `st_off_set_late_coupling` 항목 참고.

**반환** — `1` = 성공 / `0` = 컨텍스트 없음.

</details>

<details>
<summary><code>st_off_set_late_coupling_preset</code> — late 잔향 결합 감쇠를 권장 프리셋으로 정한다</summary>

```c
int st_off_set_late_coupling_preset(STOFF_Context* context, int preset);
```

**용도** — 바닥 감쇠 깊이만 고르고 나머지(무릎 두 점·평탄화 트림·rain 워크)는 권장값으로 채우는 한 번 설정입니다.

**언제·어떻게** — 프리셋 선택은 주로 청감 문제입니다 — 단일 방에서는 가시몫이 무릎 위라 감쇠가 개입하지 않고, 어느 프리셋이든 음원과 같은 공간은 정확히 0 dB입니다. 개별 조정이 필요하면 `st_off_set_late_coupling`을 씁니다. IR 정책이라 바뀐 값은 다음 `st_off_ir_compute`부터 반영됩니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `preset` | `ST_LATE_COUPLING_OFF`(0, 결합 감쇠·평탄화·rain 워크 전부 끔) / `ST_LATE_COUPLING_SUBTLE`(1, 바닥 6 dB) / `ST_LATE_COUPLING_DEFAULT`(2, 바닥 9 dB, 엔진 기본) / `ST_LATE_COUPLING_STRONG`(3, 바닥 12 dB) |

**반환** — `1` = 성공 / `0` = 범위 밖 `preset`이거나 실패.

</details>

<details>
<summary><code>st_off_set_physical_distance_attenuation</code> — 거리 감쇠 기준 거리와 최소 거리를 정한다</summary>

```c
void st_off_set_physical_distance_attenuation(STOFF_Context* context, float referenceDistanceMeters, float minDistanceMeters);
```

**용도** — 물리적 구면 확산(압력 1/R) 거리 감쇠의 기준점과 근거리 한계를 정합니다. 엔진의 유일한 거리 감쇠 법칙이며, 압력 게인은 `reference / max(R, min)`입니다.

**언제·어떻게** — 기본은 기준 1.0 m · 최소 1.0 m입니다(최소 거리를 기준 거리보다 작게 두면 기준보다 가까울 때 근거리 증폭이 생깁니다). 두 값은 `sceneRatio`와 무관하게 **호스트가 미터로** 줍니다 — 비교 대상인 경로 길이가 이미 미터로 환산돼 있기 때문입니다. IR 캐시를 무효화하므로 렌더 전에 `st_off_ir_compute`를 다시 부릅니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `referenceDistanceMeters` | 게인이 1이 되는 기준 거리(m). 기본 1.0 |
| `minDistanceMeters` | 이보다 가까운 거리는 이 값으로 봅니다(m). 기본 1.0 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_set_atmosphere</code> — 대기 조건(온도·습도·기압)을 정한다</summary>

```c
void st_off_set_atmosphere(STOFF_Context* context, float temperatureC, float relativeHumidityPercent, float pressureKPa);
```

**용도** — 공기 흡수(고역 손실)와 음속을 결정하는 대기 상태를 지정합니다. 음속은 고정 상수가 아니라 이 값에서 런타임에 유도되므로 전파 지연도 함께 바뀝니다.

**언제·어떻게** — 기본은 20.0 °C · 50.0 %RH · 101.325 kPa입니다. IR 캐시를 무효화하므로 렌더 전에 `st_off_ir_compute`를 다시 부릅니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `temperatureC` | 기온(°C). 기본 20.0 |
| `relativeHumidityPercent` | 상대 습도(%). 기본 50.0 |
| `pressureKPa` | 기압(kPa). 기본 101.325 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_set_doppler_gain_mode</code> — 움직이는 음원의 방사 이득 모드를 고른다</summary>

```c
int st_off_set_doppler_gain_mode(STOFF_Context* context, int mode);
```

**용도** — 음원이 움직일 때 진행 방향 쪽 방사가 커지고 반대쪽이 작아지는 이득을 IR에 반영할지 정합니다. 가변 지연에 의한 도플러 피치와는 별개의 스위치입니다. 지원 여부는 `ST_CAP_DOPPLER_GAIN_MODE`.

**언제·어떻게** — 기본은 `ST_DOPPLER_GAIN_MOVING_MONOPOLE`입니다. 음원 속도는 `STSourceDesc.velocity*`로 주며, 정지 음원의 이득은 1입니다. IR 캐시를 무효화하므로 렌더 전에 `st_off_ir_compute`를 다시 부릅니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `mode` | `STDopplerGainMode` — `ST_DOPPLER_GAIN_OFF`(0) / `ST_DOPPLER_GAIN_MOVING_MONOPOLE`(1, 기본: 움직이는 단극자 근사 — 압력 D², 에너지 D⁴, D = 1/(1−Mr), 방사 경로 방향마다 따로 계산) |

**반환** — `1` = 성공 / `0` = 컨텍스트 없음 또는 범위 밖 `mode`.

</details>

<details>
<summary><code>st_off_get_doppler_gain_mode</code> — 도플러 방사 이득 모드를 읽는다</summary>

```c
int st_off_get_doppler_gain_mode(const STOFF_Context* context);
```

**용도** — `st_off_set_doppler_gain_mode`로 지정한 값을 확인합니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[control]` — 락 없이 엔진 상태를 읽습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — `STDopplerGainMode` 값(`0` = OFF / `1` = MOVING_MONOPOLE). 컨텍스트가 없으면 `-1`.

</details>

<details>
<summary><code>st_off_set_early_late_band_energy_targets</code> — early·late 밴드별 에너지 배율을 정한다</summary>

```c
int st_off_set_early_late_band_energy_targets(STOFF_Context* context, const float earlyBandEnergy[ST_FREQUENCY_BANDS], const float lateBandEnergy[ST_FREQUENCY_BANDS]);
```

**용도** — 초기음(early)과 후기 잔향(late)의 스펙트럼을 서로 독립적으로 밴드별 조정합니다. 측정값에 맞추거나 잔향 음색만 따로 다듬을 때 씁니다. 실시간 `st_rt_set_early_late_band_energy_targets`의 오프라인 대응입니다. 지원 여부는 `ST_CAP_EARLY_LATE_BAND_ENERGY`.

**언제·어떻게** — 두 배열을 한 번에 교체합니다. early 배율은 exact·초기 탭에만, late 배율은 잔향 send·탱크 구동에만 적용되며 서로 곱하지 않습니다. 기본은 모두 1.0(중립)입니다. IR 캐시를 무효화하므로 렌더 전에 `st_off_ir_compute`를 다시 부릅니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `earlyBandEnergy` | 초기음 밴드별 **에너지 도메인** 배율(63 ~ 16k Hz 9개). 비유한 값은 1.0으로, 나머지는 `[0, 16]`으로 정규화 |
| `lateBandEnergy` | 후기 잔향 밴드별 에너지 배율. 규칙은 위와 같음 |

**반환** — `1` = 성공 / `0` = 컨텍스트 없음 또는 배열이 `NULL`.

</details>

<details>
<summary><code>st_off_set_max_depth</code> — 전역 최대 반사 깊이를 정한다</summary>

```c
void st_off_set_max_depth(STOFF_Context* context, int depth);
```

**용도** — 반사 경로 탐색의 전역 차수 상한을 정해 계산 비용과 초기 반사 밀도를 조절합니다.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 기본은 8입니다(음원별 상한은 `st_off_source_set_depth`, 기본 4). 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `depth` | 전역 최대 반사 깊이(기본 8) |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_set_transmission_max_depth</code> — 투과 경로의 최대 깊이를 정한다</summary>

```c
void st_off_set_transmission_max_depth(STOFF_Context* context, int depth);
```

**용도** — 직접음이 벽을 투과할 때 몇 개의 면까지 통과를 추적할지 상한을 정합니다.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 기본은 64입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `depth` | 투과 최대 깊이(기본 64) |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_listener_set_ray_count</code> — 리스너 가이드 레이 격자 크기를 정한다</summary>

```c
void st_off_listener_set_ray_count(STOFF_Context* context, int width, int height);
```

**용도** — 리스너에서 쏘는 가이드(probe) 레이 수를 정합니다(N = `width × height`). 반사·회절 경로 탐색과 공간 통계의 해상도를 계산 비용과 맞바꿉니다.

**언제·어떻게** — `st_off_ir_compute` 전에 부릅니다. 기본은 16 × 16입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `width` | 격자 가로 레이 수(기본 16) |
| `height` | 격자 세로 레이 수(기본 16) |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_listener_set_ray_sampling_method</code> — 리스너 가이드 레이의 방향 분포를 고른다</summary>

```c
int st_off_listener_set_ray_sampling_method(STOFF_Context* context, int method);
```

**용도** — 리스너 가이드 레이를 구면에 어떻게 배치할지 정하는 setter입니다. 현재는 피보나치 구면 분포만 선택할 수 있으며, 다른 값은 번호 호환을 위해 열거형에만 남아 있습니다. 피보나치 분포는 시드를 쓰지 않는 결정적 분포입니다.

**언제·어떻게** — 기본값이 이미 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`라 보통 부를 필요가 없습니다. 지원 여부는 `ST_CAP_RAY_SAMPLING_METHODS`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `method` | `STRaySamplingMethod`. 받아들이는 값은 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)뿐 — `LEGACY_GRID`(0) / `EQUAL_AREA_GRID`(2) / `SOBOL_SPHERE`(3) / `ICOSAHEDRAL`(4)는 거절 |

**반환** — `1` = 성공 / `0` = 그 밖의 값(`ST_STATUS_INVALID_ARGUMENT`, 상태 불변) 또는 컨텍스트 없음.

</details>

<details>
<summary><code>st_off_set_source_ray_sampling_method</code> — 음원 수송 레이의 방향 분포를 고른다</summary>

```c
int st_off_set_source_ray_sampling_method(STOFF_Context* context, int method);
```

**용도** — 음원 수송 레이의 구면 배치를 정하는 setter입니다. `st_off_listener_set_ray_sampling_method`와 마찬가지로 피보나치 구면 분포만 선택할 수 있습니다.

**언제·어떻게** — 기본값이 이미 `ST_RAY_SAMPLING_FIBONACCI_SPHERE`입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |
| `method` | `STRaySamplingMethod`. `ST_RAY_SAMPLING_FIBONACCI_SPHERE`(1)만 허용, 나머지는 거절 |

**반환** — `1` = 성공 / `0` = 그 밖의 값(`ST_STATUS_INVALID_ARGUMENT`, 상태 불변) 또는 컨텍스트 없음.

</details>

<details>
<summary><code>st_off_build</code> — 씬 가속구조를 전체 빌드한다</summary>

```c
void st_off_build(STOFF_Context* context);
```

**용도** — 등록한 메시·오브젝트로 정적+동적 가속구조를 모두 짓습니다. 전파와 `st_off_scene_raycast`는 이 구조를 씁니다.

**언제·어떻게** — 메시·오브젝트를 추가하거나 지운 뒤, 정적 오브젝트를 옮긴 뒤, 그리고 `st_off_ir_compute` 전에 부릅니다. 빌드 전에는 레이 질의가 모두 미스입니다. 가속구조 종류는 `st_off_scene_set_accel`이 정합니다. 스레드: `[control, blocking]` — 씬 크기에 비례하는 긴 배타 구간입니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_build_dynamic</code> — 동적 오브젝트의 TLAS만 갱신한다</summary>

```c
void st_off_build_dynamic(STOFF_Context* context);
```

**용도** — 동적 오브젝트의 변환만 바뀌었을 때 전체 빌드 없이 동적 TLAS를 refit해 빠르게 반영합니다.

**언제·어떻게** — `st_off_object_set_transform` / `_q`로 동적 오브젝트를 옮긴 뒤, `st_off_ir_compute` 전에 부릅니다. 메시·오브젝트를 추가·삭제했거나 정적 오브젝트가 바뀌었다면 `st_off_build`를 씁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 컨텍스트 핸들 |

**반환** — 없음.

</details>

</details>

<details>
<summary><strong>오프라인(`st_off_*`) — IR 계산·렌더, 배치, 디버그</strong> — 49개</summary>

<details>
<summary><code>st_off_render_parse_autoeq_parametric</code> — AutoEq ParametricEQ.txt 텍스트를 파라메트릭 EQ 밴드 배열로 파싱한다</summary>

```c
int32_t st_off_render_parse_autoeq_parametric(const char* utf8Text, STParametricEqBand* outBands, int32_t bandCapacity, int32_t* outBandCount, float* outPreampDb, int32_t* outErrorLine, char* outErrorMessage, int32_t errorMessageCapacity);
```

**용도** — AutoEq가 배포하는 `ParametricEQ.txt`(Equalizer APO 문법의 부분집합)를 읽어 `STParametricEqBand` 배열과 프리앰프 값으로 바꿉니다. 결과를 `st_off_source_set_parametric_eq`에 그대로 넣을 수 있어, 헤드폰 보정 곡선 같은 외부 EQ 파일을 호스트가 직접 파싱하지 않고 소스 EQ로 걸 수 있습니다. 실시간 `st_rt_render_parse_autoeq_parametric`과 같은 구현·같은 계약입니다.

**언제·어떻게** — 컨텍스트가 필요 없으므로 언제든 부를 수 있습니다. 성공하면 결과를 켜짐(`enabled` = 1)으로 `st_off_source_set_parametric_eq`에 넘깁니다. 지원 여부는 `st_off_get_capability_word(1)`의 `ST_CAP1_SOURCE_PARAMETRIC_EQ`로 확인합니다(이 파서는 그 비트에 포함되며 별도 비트가 없습니다). 스레드: `[any]` — 전역 상태도 할당도 없어 어느 스레드에서나 블록 없이 부를 수 있습니다.

받는 문법(대소문자 무시):

- `Preamp: <수> [dB]` — 여러 줄이면 dB로 더합니다.
- `Filter[ <번호>]: ON|OFF <종류> Fc <수> [Hz] [Gain <수> [dB]] [Q <수>]` — 종류는 `PK`·`PEQ`·`MODAL` / `LSC`·`LS` / `HSC`·`HS` / `LP`·`LPQ` / `HP`·`HPQ` / `NO`. Q를 생략하면 셸프·LP·HP는 0.7071이고, `PK`·`NO`는 Q가 필수입니다. Gain은 PK·셸프에 필수입니다. `OFF` 필터는 `enabled` = 0 밴드로 들어가 밴드 수에 셉니다.
- 빈 줄과 `#` 뒤(줄 끝 주석)는 무시하고, UTF-8 BOM·CRLF를 받습니다. 수는 로캘과 무관하게 읽습니다.

거절하는 것: 그 밖의 명령(`Channel`·`Device`·`GraphicEQ`·`Include` 등), `BP`·`AP`·`IIR`, 셸프 기울기 형식(`LS 6dB`), `BW Oct`, 범위 밖 값(Fc [20, 20000] Hz · Gain ±24 dB · Q [0.1, 30], 셸프는 Q [0.1, 3] · 프리앰프 최종합 [−48, +12] dB), 주석 밖의 비 ASCII 문자, 지수 표기. 파서는 clamp하지 않고 거절합니다(setter는 같은 범위로 clamp합니다).

| 파라미터 | 설명 |
|---|---|
| `utf8Text` | NUL 종료 UTF-8 텍스트(파일 내용 전체). 필수 |
| `outBands` | 밴드를 받을 호출자 배열. `bandCapacity`가 0보다 크면 필수 |
| `bandCapacity` | `outBands` 원소 수. 0 이상. 최대 밴드 수는 `ST_PARAMETRIC_EQ_MAX_BANDS`(16) |
| `outBandCount` | 파싱된 밴드 수를 받는다. 필수(NULL 불가) |
| `outPreampDb` | 프리앰프(dB)를 받는다. 필수(NULL 불가) |
| `outErrorLine` | 실패한 줄 번호(1부터, 줄과 무관한 오류는 0). NULL 허용 |
| `outErrorMessage` | 실패 사유(NUL 종료 영문). NULL 허용 |
| `errorMessageCapacity` | `outErrorMessage` 바이트 수. 이 길이에 맞춰 자른다 |

**구조체** `STParametricEqBand` (32바이트, 버전 스탬프 없는 배열 원소)

| 필드 | 설명 |
|---|---|
| `type` | `STParametricEqType` — `ST_PARAMETRIC_EQ_PEAKING`(0) / `LOW_SHELF`(1) / `HIGH_SHELF`(2) / `LOW_PASS`(3) / `HIGH_PASS`(4) / `NOTCH`(5) |
| `enabled` | 0 = 항등(건너뜀), 그 밖 = 켬 |
| `frequencyHz` | 중심(PEAKING·NOTCH) 또는 코너(셸프 중점·LP·HP) 주파수 |
| `gainDb` | PEAKING·LOW_SHELF·HIGH_SHELF만 사용 |
| `q` | Q 값 |
| `reserved[3]` | 0. 파서는 0으로 채운다 |

**반환** — `STAutoEqParseStatus`. `ST_AUTOEQ_PARSE_OK`(0)이면 `outBands[0..*outBandCount)`와 `*outPreampDb`를 씁니다. 실패하면 `*outBandCount` = 0 · `*outPreampDb` = 0이고 오류 줄·메시지를 씁니다: `ST_AUTOEQ_PARSE_INVALID_ARGUMENT`(1, 필수 포인터 NULL·용량 음수 등) / `SYNTAX`(2, 줄 형식 오류) / `UNSUPPORTED`(3, 지원하지 않는 명령·필터·형식) / `OUT_OF_RANGE`(4, 범위 밖 값) / `TOO_MANY_BANDS`(5, `ST_PARAMETRIC_EQ_MAX_BANDS` 또는 `bandCapacity` 초과) / `EMPTY`(6, Preamp·Filter 줄이 하나도 없음). 컨텍스트가 없으므로 last_status는 남지 않습니다.

</details>

<details>
<summary><code>st_off_render_set_spatializer</code> — 컨텍스트의 공간화기(HRTF 종류)를 고르고 HRIR 데이터셋을 로드한다</summary>

```c
int st_off_render_set_spatializer(STOFF_Context* context, int type);
```

**용도** — 오프라인 컨텍스트의 공간화 구현(패닝 / 내장 MIT KEMAR / SADIE II D2)을 고르고, 필요한 HRIR 데이터셋을 로드합니다. 실시간 `st_rt_render_set_spatializer`와 같은 값 집합을 받습니다.

**언제·어떻게** — 바이노럴 IR·오디션 렌더는 요청 구조체(`STOfflineBinauralIRRequestOptions.hrtfType`)로 요청마다 공간화기를 고르므로, 그 렌더만 쓴다면 이 함수를 따로 부를 필요는 없습니다. SADIE D2는 외부 자산 파일 `SADIE_D2_44K_16bit_256tap.hrtfbin`이 있어야 합니다 — 엔진은 환경변수 `SIMPLEST_SADIE_D2_HRTF_PATH`, 현재 작업 폴더, 실행 파일 폴더, DLL 폴더(각각 그 폴더와 상위 8단계의 `Assets/HRTF/`·`SimpleST/Assets/HRTF/`·`Resources/HRTF/`) 순서로 찾습니다. 배포에서는 DLL 옆(또는 상위)의 `Resources/HRTF/`에 두는 것이 가장 간단합니다. 스레드: `[control, blocking]` — HRIR 데이터셋을 로드하는 긴 구간이 있으므로 지연에 민감한 스레드에서 부르지 않습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `type` | `STSpatializerType` — `ST_SPATIALIZER_PANNING`(0, HRIR 데이터 불필요) / `ST_SPATIALIZER_MIT_KEMAR`(1, DLL 내장) / `ST_SPATIALIZER_SADIE_D2_KEMAR`(2, 외부 자산 필요). 그 밖의 값은 거절 |

**반환** — `1` = 적용 / `0` = 실패. 컨텍스트가 NULL이거나 `type`이 범위 밖이면 0. SADIE D2를 골랐는데 자산 파일이 없으면 0과 `ST_STATUS_UNAVAILABLE`("SADIE D2 HRTF asset not found ...")를 남깁니다.

</details>

<details>
<summary><code>st_off_render_set_early_spatial_mode</code> — 바이노럴·오디션 렌더의 초기 반사 렌더 경로(exact 객체 / HOA3 bed)를 고른다</summary>

```c
int st_off_render_set_early_spatial_mode(STOFF_Context* context, int mode);
```

**용도** — 바이노럴 IR과 오디션 렌더가 초기 반사를 어느 경로로 낼지 고릅니다. `ST_EARLY_SPATIAL_OBJECTS`(기본)는 모든 초기 경로를 exact 객체로 합성하는 정본이고, `ST_EARLY_SPATIAL_BED`는 실시간 헤드폰 기본 경로(예산 안 exact 객체 + 나머지 초기 반사·1차 산란은 HOA3 bed → 바이노럴 디코드)로 렌더합니다. BED로 렌더한 결과는 "그 소스 하나만 있는 정지 장면의 동기 실시간 출력"과 같으므로, 게임에서 실제로 들릴 소리를 오프라인으로 미리 들어 보거나 비교할 때 씁니다.

**언제·어떻게** — 모드와 계산·렌더는 다음 순서로 연결됩니다.

1. 이 함수로 모드를 고릅니다. IR 캐시는 비우지 않습니다.
2. `st_off_ir_compute` — BED이면 리스너마다 전파는 한 번 하고 변환을 두 번 해 exact 정본과 bed 변형을 함께 캐시합니다(변환 시간과 IR 메모리만 늘고 전파 비용은 같습니다). OBJECTS이면 변환도 한 번입니다.
3. `st_off_ir_render_binaural` / `st_off_ir_render_audition_pair`는 **렌더 시점의 모드**를 따릅니다. BED로 계산한 캐시는 두 변형을 모두 가지므로 다시 계산하지 않고 모드를 오가며 둘 다 렌더할 수 있습니다. 변형이 없는 캐시(OBJECTS로 계산한 캐시 등)를 BED로 렌더하면 0과 `ST_STATUS_UNAVAILABLE`이 돌아오며, 이때는 모드를 BED로 둔 채 다시 compute합니다. 결과 info의 `earlySpatialMode`가 실제로 쓴 모드입니다.

압력 IR(솔로·혼합·배치)과 원시 IR 조회는 모드와 무관하게 항상 exact 정본입니다. IR 아카이브는 BED로 계산한 캐시면 두 변형을 함께 저장하고, 아카이브를 적재해도 컨텍스트의 모드는 바뀌지 않습니다. BED 렌더는 IR을 설치한 뒤 무음 워밍업(16384프레임 ≈ 0.37 s, 출력에서 버림)으로 경로 페이드·게인 램프를 정착시킨 다음 입력을 넣으므로 그만큼 렌더 시간이 늘어납니다. 소스 여러 개를 함께 튼 실시간 출력은 병합 bed·send를 소스끼리 공유하므로 쌍별 결과의 합과 미세하게 다릅니다. 두 모드 모두 late 확산장을 리스너 주변 1차 산란의 도착 방향 분포로 가중합니다(압력 IR은 공간화를 하지 않으므로 영향이 없습니다).

지원 여부는 `st_off_get_capability_word(1)`의 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`로 확인합니다. 스레드: `[control]` — 잡 뮤텍스를 잡으므로 진행 중인 compute·렌더가 끝날 때까지 블록될 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `mode` | `STEarlySpatialMode` — `ST_EARLY_SPATIAL_OBJECTS`(0, 기본, exact 정본) / `ST_EARLY_SPATIAL_BED`(1, 실시간 bed 경로). 그 밖의 값은 거절 |

**반환** — `1` = 성공 / `0` = 실패. 그 밖의 값이면 `ST_STATUS_INVALID_ARGUMENT`, `ST_BACKEND_EXA` 컨텍스트에서 BED를 고르면 `ST_STATUS_UNAVAILABLE`(OBJECTS는 언제나 됩니다).

</details>

<details>
<summary><code>st_off_render_get_early_spatial_mode</code> — 현재 early 공간 모드를 읽는다</summary>

```c
int st_off_render_get_early_spatial_mode(const STOFF_Context* context);
```

**용도** — `st_off_render_set_early_spatial_mode`로 고른 현재 모드를 돌려줍니다. 기본값은 `ST_EARLY_SPATIAL_OBJECTS`(0)로, 실시간 기본값(BED)과 다릅니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 실제 렌더에 쓰인 모드는 결과 info(`STOfflineBinauralIRInfo.earlySpatialMode`, `STOFF_AuditionInfo.earlySpatialMode`)로도 확인할 수 있습니다. 스레드: `[any]` — atomic 읽기라 어느 스레드에서나 블록 없이 부를 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — 현재 모드(`ST_EARLY_SPATIAL_OBJECTS`(0) / `ST_EARLY_SPATIAL_BED`(1)). `context`가 NULL이면 `-1`.

</details>

<details>
<summary><code>st_off_render_set_max_delay_seconds</code> — 오프라인 렌더가 쓰는 지연 링 길이(초)를 정한다</summary>

```c
int st_off_render_set_max_delay_seconds(STOFF_Context* context, float seconds);
```

**용도** — 압력·바이노럴·오디션·배치 렌더가 쓰는 지연 링의 길이를 정합니다. 지연이 링 한계를 넘는 exact 경로는 렌더에서 빠지고(late는 FDN이 덮습니다), 따라서 기본 4 s보다 늦게 도착하는 경로가 필요한 큰 공간이나 긴 IR에서는 이 값을 늘립니다.

**언제·어떻게** — IR 캐시와 무관한 렌더 설정이라 다시 compute하지 않아도 다음 렌더부터 적용됩니다. 링 메모리는 렌더하는 소스마다 9밴드 × 링 길이입니다. IR 아카이브는 저장할 때의 값을 기록하고, 적재한 컨텍스트는 그 값을 씁니다(적재 뒤 다시 바꿀 수 있습니다). 지원 여부는 `st_off_get_capability_word(1)`의 `ST_CAP1_OFFLINE_MAX_DELAY`로 확인합니다. 스레드: `[control, blocking]` — 잡 뮤텍스를 잡고 지연 링을 재할당합니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `seconds` | 링 길이(초). 기본 4.0 s(실시간 기본 2.0 s와 다름). 범위는 실시간 `st_rt_render_set_max_delay_seconds`와 같은 약 0.012 s ~ 60 s. 범위 밖·비유한 값은 거절 |

**반환** — `1` = 성공 / `0` = 실패. 범위 밖·비유한 값이면 `ST_STATUS_INVALID_ARGUMENT`, 링 길이를 바꾸지 못하는 백엔드면 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_render_get_max_delay_seconds</code> — 현재 렌더 지연 링 길이(초)를 읽는다</summary>

```c
float st_off_render_get_max_delay_seconds(const STOFF_Context* context);
```

**용도** — `st_off_render_set_max_delay_seconds`로 정한(또는 아카이브에서 적재한) 현재 지연 링 길이를 돌려줍니다.

**언제·어떻게** — 렌더 길이보다 늦게 도착하는 경로가 잘리지 않는지 확인할 때 씁니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — 현재 값(초, 기본 4.0). `context`가 NULL이면 `0`.

</details>

<details>
<summary><code>st_off_debug_set_collect_visual_paths</code> — 다음 계산에서 시각화용 경로를 어떤 종류까지 수집할지 정한다</summary>

```c
int st_off_debug_set_collect_visual_paths(STOFF_Context* context, uint32_t mask);
```

**용도** — 전파 경로를 3D 뷰에 겹쳐 그리기 위한 시각화 경로 수집을 켜고, 수집할 경로 종류를 마스크로 고릅니다. 기본은 0(수집 안 함)이라 디버그 시각화가 필요할 때만 비용을 냅니다.

**언제·어떻게** — 시각화 스냅샷은 `st_off_ir_compute`가 발행하므로 compute **전에** 마스크를 정합니다. 계산 뒤 `st_off_debug_get_snapshot_info` → `st_off_debug_copy_visual_paths` 순서로 읽습니다. 실패한 walk까지 보려면 `st_off_debug_set_collect_failed_walks`를 함께 켭니다. 지원 여부는 `ST_CAP_PATH_COLLECTION_MASK`로 확인합니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `mask` | `STPathCollectionFlag` 비트 OR — `ST_PATH_COLLECTION_GUIDE_RAY`(1) / `ST_PATH_COLLECTION_SOURCE_TRANSPORT_RAY`(2) / `ST_PATH_COLLECTION_DIRECT_TRANSMISSION`(4) / `ST_PATH_COLLECTION_REFLECTION_DIFFRACTION`(8, 반사 구간을 포함하는 회절 경로가 있어 두 종류가 한 비트를 공유) / `ST_PATH_COLLECTION_ALL`. 0 = 수집 안 함 |

**반환** — `1` = 적용 / `0` = 실패(`context` NULL 또는 정의되지 않은 비트).

</details>

<details>
<summary><code>st_off_debug_set_collect_failed_walks</code> — 시각화 수집에 중도 실패한 walk도 포함할지 정한다</summary>

```c
void st_off_debug_set_collect_failed_walks(STOFF_Context* context, int enabled);
```

**용도** — 기본적으로 시각화 스냅샷에는 완주한 경로만 의미 있게 쓰입니다. 이 옵션을 켜면 도중에 실패한 walk도 기록해, 경로가 왜 생기지 않는지 디버깅할 수 있습니다. 실패한 walk는 `STVisualPathRecord.valid` = 0으로 표시됩니다.

**언제·어떻게** — `st_off_debug_set_collect_visual_paths`와 함께 compute 전에 설정합니다. 실패 walk를 받으려면 `st_off_debug_copy_visual_paths`를 `ST_VISUAL_PATH_COPY_ALL`로 부릅니다(`VALID_ONLY`는 완주 경로만 복사합니다). 기본은 꺼짐입니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `enabled` | 0 = 끔(기본) / 그 밖 = 켬 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_ir_compute</code> — 전파와 IR 변환을 한 번 돌려 canonical IR 캐시를 만든다</summary>

```c
int st_off_ir_compute(STOFF_Context* context);
```

**용도** — 오프라인 IR 생성의 출발점입니다. 등록된 리스너마다 전파(기하)와 IR 변환을 한 번 돌려, 리스너 × 소스 쌍마다 **canonical 원시 IR**을 캐시에 만듭니다. 원시 IR은 시간 영역 샘플이 아니라 파라미터 형태(에너지 영역 초기 탭, late 잔향 송출 탭, 1차 산란 셀, late 잔향 기술자)라서 IR 길이와 무관하게 한 번만 계산됩니다. 이후의 모든 결과는 이 같은 세대에서 파생됩니다.

- 원시 IR 조회: `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_*` — 탭·셀·기술자를 그대로 복사
- 압력 IR: `st_off_ir_render_pressure`(쌍 하나) / `st_off_ir_render_pressure_mixed`(소스 여러 개 합) — 광대역 모노 또는 9밴드 분리
- 바이노럴 IR: `st_off_ir_render_binaural` — 스테레오(L/R)
- 오디션: `st_off_ir_render_audition_pair` — 드라이 신호를 고정 RIR 컨볼루션과 엔진 렌더 단계로 각각 렌더

렌더 함수는 캐시를 소비만 하므로 길이·출력 모드·HRTF를 바꿔 여러 번 렌더해도 다시 계산하지 않습니다.

**언제·어떻게** — 장면(재질·메시·오브젝트)·소스·리스너·전파 옵션을 설정하고 `st_off_build`로 가속구조를 지은 뒤 부릅니다. 장면·소스·리스너나 IR 정책(대기, 거리 감쇠, Doppler gain mode, 에너지 타깃 등)을 바꾸면 다시 compute해야 결과에 반영됩니다. 반면 렌더 전용 설정(소스 EQ, early 공간 모드 전환, 지연 링 길이)은 캐시를 유지한 채 다음 렌더부터 적용됩니다. early 공간 모드가 `ST_EARLY_SPATIAL_BED`이면 쌍마다 bed 변형도 함께 만듭니다(`st_off_render_set_early_spatial_mode` 참고). 시각화 경로 수집이 켜져 있으면 같은 세대의 시각화 스냅샷도 발행합니다.

성공하면 캐시 세대(`st_off_ir_get_cache_generation`)가 바뀌고 모든 결과 info에 그 세대가 실립니다. 계산이 실패하거나 취소되면 새 캐시는 발행되지 않고 이전 캐시가 그대로 남습니다. 진행률은 다른 스레드에서 `st_off_ir_get_progress`로 읽고, 취소는 `st_off_ir_request_cancel`로 겁니다. `st_off_ir_archive_load_pair`로 아카이브를 적재한 render-only 컨텍스트에서는 거절됩니다. `maxComputeThreads`가 1보다 크면 병렬 구간은 컨텍스트의 계산 풀 워커에서 돕니다. 여러 컨텍스트를 병렬로 계산하려면 배치 API(`st_off_batch_*`)를 씁니다.

스레드: `[control, runs-here]` — 전파·변환 파이프라인 전체가 **호출 스레드에서 실제로 돌고** 끝날 때까지 돌아오지 않습니다. 이 컨텍스트의 다른 잡(렌더·조회)과는 잡 뮤텍스로 직렬화됩니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — `1` = 성공(캐시 발행) / `0` = 실패. 계산 실패·취소·render-only 컨텍스트는 `ST_STATUS_INITIALIZATION_FAILED`("canonical IR computation failed or was canceled").

</details>

<details>
<summary><code>st_off_ir_archive_save</code> — 현재 canonical IR 캐시 전체를 버전 있는 아카이브 파일로 저장한다</summary>

```c
int st_off_ir_archive_save(STOFF_Context* context, const char* utf8Path);
```

**용도** — 계산한 canonical IR 캐시를 파일로 남겨, 나중에 장면·가속구조·전파·IR 변환 없이 같은 결과를 다시 렌더할 수 있게 합니다. 무거운 계산은 한 번만 하고, 렌더(길이·출력 모드·HRTF 변경)는 별도 프로세스나 별도 시점에 하고 싶을 때 씁니다.

**언제·어떻게** — `st_off_ir_compute`가 성공해 캐시가 있을 때 부릅니다. DSP는 돌지 않습니다. 임시 파일에 쓰고 검증한 뒤 대상 경로로 발행하며, **이미 있는 파일은 덮어쓰지 않습니다**(그 경우 실패). early 공간 모드 BED로 계산한 캐시면 bed 변형도 함께 저장하고, 현재 렌더 지연 링 길이(`st_off_render_get_max_delay_seconds`)도 기록합니다. 시각화 스냅샷은 저장되지 않습니다. 적재는 `st_off_ir_archive_load_pair`로 합니다. 형식·엔진 버전이 같아야 적재할 수 있고, 호스트는 추가로 아카이브를 만든 DLL과 같은 바이너리(해시)인지 맞춰야 합니다. `ST_BACKEND_ST` 컨텍스트에서만 됩니다. 스레드: `[control, runs-here]` — 직렬화·파일 쓰기가 호출 스레드에서 돕니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `utf8Path` | 저장할 파일 경로(UTF-8, NUL 종료). 비어 있으면 거절. 이미 있는 파일이면 실패 |

**반환** — `1` = 성공 / `0` = 실패. 경로가 NULL·빈 문자열이거나 ST 백엔드가 아니면 `ST_STATUS_INVALID_ARGUMENT`, 완전한 canonical 캐시가 없거나 저장에 실패하면 `ST_STATUS_UNAVAILABLE`. 실패해도 대상 경로의 기존 파일은 그대로입니다.

</details>

<details>
<summary><code>st_off_ir_archive_load_pair</code> — 아카이브에서 리스너·소스 쌍 하나를 적재해 렌더 전용 컨텍스트로 만든다</summary>

```c
int st_off_ir_archive_load_pair(STOFF_Context* context, const char* utf8Path, STListenerId listener, STSourceId source);
```

**용도** — `st_off_ir_archive_save`로 저장한 아카이브에서 기록된 쌍 하나를 꺼내, 장면·BVH·전파·IR 변환 없이 바로 렌더할 수 있게 설치합니다. 계산 비용 없이 저장된 IR을 다시 듣거나 다른 길이·출력 모드로 렌더할 때 씁니다.

**언제·어떻게** — 새로 만든 오프라인 컨텍스트에 부르는 것이 전형입니다. 쌍은 새 콜드 렌더러에 설치되고, 그 뒤 컨텍스트는 **render-only**가 됩니다: `st_off_ir_compute`는 거절되고 렌더가 암묵적으로 다시 계산하지 않습니다. `st_off_ir_clear_cache`나 `st_off_trim_memory`(`ST_OFFLINE_TRIM_IR_CACHE`)를 부른 뒤에도 render-only이며, 다시 렌더하려면 다시 적재합니다. 기존 렌더·조회 함수(`st_off_ir_render_*`, `st_off_ir_get_raw_descriptor`, `st_off_ir_copy_raw_*`)는 **아카이브에 기록된 ID**를 그대로 받습니다. 렌더 지연 링 길이는 아카이브에 기록된 값으로 바뀌고(적재 뒤 다시 바꿀 수 있음), early 공간 모드는 바뀌지 않습니다. 시각화 스냅샷은 복원되지 않습니다. 형식·엔진 버전이 같아야 하고, 호스트는 만든 DLL과 같은 바이너리인지도 맞춰야 합니다. `ST_BACKEND_ST` 컨텍스트에서만 됩니다. 스레드: `[control, runs-here]` — 파일 읽기와 설치가 호출 스레드에서 돕니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `utf8Path` | 아카이브 파일 경로(UTF-8, NUL 종료). 비어 있으면 거절 |
| `listener` | 적재할 쌍의 리스너 ID(아카이브에 기록된 값) |
| `source` | 적재할 쌍의 소스 ID(아카이브에 기록된 값) |

**반환** — `1` = 성공 / `0` = 실패. 경로가 NULL·빈 문자열이거나 ST 백엔드가 아니면 `ST_STATUS_INVALID_ARGUMENT`, 쌍이 아카이브에 없거나 형식·버전이 맞지 않거나 적재가 취소되면 `ST_STATUS_UNAVAILABLE`. 실패해도 그 전에 발행된 캐시는 그대로입니다.

</details>

<details>
<summary><code>st_off_ir_clear_cache</code> — canonical IR 캐시를 비운다</summary>

```c
void st_off_ir_clear_cache(STOFF_Context* context);
```

**용도** — 발행된 오프라인 조회 산출물(canonical 원시 IR, 아카이브 기록, 시각화 스냅샷)을 비웁니다. 장면·엔진 옵션·전파 작업 버퍼는 남깁니다(작업 버퍼까지 반납하려면 `st_off_trim_memory`).

**언제·어떻게** — 큰 캐시를 다 쓴 뒤 메모리를 돌려받거나, 옛 결과를 실수로 렌더하지 않게 할 때 부릅니다. 비운 뒤에는 `st_off_ir_compute`를 다시 불러야 렌더·조회가 됩니다(그 전에는 `ST_STATUS_UNAVAILABLE`). 아카이브로 적재한 render-only 컨텍스트는 비운 뒤 다시 적재해야 합니다. `st_off_trim_memory(context, ST_OFFLINE_TRIM_IR_CACHE)`와 같습니다. 스레드: `[control]` — 잡 뮤텍스를 잡으므로 진행 중인 compute·렌더가 끝날 때까지 기다릴 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_trim_memory</code> — 장면·설정은 남기고 IR 캐시·작업 버퍼·렌더 상태 메모리를 반납한다</summary>

```c
int st_off_trim_memory(STOFF_Context* context, uint32_t flags);
```

**용도** — 컨텍스트를 놀리는 동안(배치 재사용 풀 등) 쥐고 있는 메모리를 줄입니다. 장면·BVH·재질·소스·리스너·옵션은 남기므로 컨텍스트를 다시 만들 필요가 없고, 다음 compute·렌더는 버퍼를 다시 잡으며 결과는 반납하지 않은 컨텍스트·새 컨텍스트와 비트 동일합니다.

**언제·어떻게** — `ST_OFFLINE_TRIM_IR_CACHE`를 고르면 `st_off_ir_clear_cache`와 같아서 다음 렌더 전에 compute가 필요하고(아카이브로 적재한 render-only 컨텍스트는 다시 적재), 고르지 않으면 캐시된 IR을 그대로 렌더할 수 있습니다. 배치에 등록한 컨텍스트는 그 작업의 완료 레코드를 `st_off_batch_poll`로 받은 뒤에 부릅니다. 지원 여부는 `ST_CAP_OFFLINE_TRIM_MEMORY`로 확인합니다. `ST_BACKEND_EXA` 컨텍스트는 백엔드 작업 버퍼를 비우지 않습니다(IR 캐시·실행 프레임은 비웁니다). 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `flags` | `ST_OFFLINE_TRIM_*` 비트 OR. 0이면 아무것도 하지 않음 |

`flags` 비트:

| 비트 | 비우는 것 |
|---|---|
| `ST_OFFLINE_TRIM_IR_CACHE` (1) | `st_off_ir_clear_cache`와 같음 — canonical 원시 IR·아카이브 기록·시각화 스냅샷. 다음 렌더 전에 compute 필요 |
| `ST_OFFLINE_TRIM_PROPAGATION_SCRATCH` (2) | 전파기·IR 변환기·실행 프레임이 다음 compute를 위해 쥔 최대 크기 작업 버퍼. 크기는 레이 수·반사 차수를 따른다(예: 소스 64×32 ×3, 리스너 64×64, 깊이 4에서 약 23 MB). 캐시된 IR은 그대로 렌더된다 |
| `ST_OFFLINE_TRIM_RENDER_STATE` (4) | 다음 렌더가 처음부터 다시 만드는 렌더 상태(소스 렌더 상태·경로 상태, 오프라인 렌더 계획) |
| `ST_OFFLINE_TRIM_ALL` | 셋 다 |

**반환** — `1` = 성공(`flags` = 0이면 아무것도 하지 않고 1) / `0` = `context` NULL 또는 정의되지 않은 비트(`ST_STATUS_INVALID_ARGUMENT`, 아무것도 비우지 않음).

</details>

<details>
<summary><code>st_off_ir_get_progress</code> — 진행 중인 계산·렌더의 진행률(0~1)을 읽는다</summary>

```c
float st_off_ir_get_progress(const STOFF_Context* context);
```

**용도** — `st_off_ir_compute`가 호출 스레드를 붙잡고 도는 동안 **다른 스레드에서** 진행률을 읽기 위한 함수입니다. `st_off_ir_request_cancel`과 함께, 계산 중에 다른 스레드에서 부르도록 의도된 유일한 쌍입니다.

**언제·어떻게** — UI 스레드 등에서 주기적으로 폴링합니다. 진행률은 **1.0에서 시작합니다** — 할 일의 총량이 0이면 "할 일 없음 = 완료"로 1.0을 돌려주므로, 0.0을 기대하는 폴링 루프는 계산이 시작되기 전에 완료로 오판할 수 있습니다. 완료 판정은 `st_off_ir_compute`의 반환으로 하고, 진행률은 표시용으로만 씁니다. 스레드: `[any]` — lock-free atomic 읽기라 어느 스레드에서나 블록 없이 부를 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — 진행률 `[0, 1]`(완료한 작업량 ÷ 총량, 총량 0이면 1.0). `context`가 NULL이면 `0`.

</details>

<details>
<summary><code>st_off_ir_request_cancel</code> — 진행 중인 계산·렌더를 중단시킨다</summary>

```c
void st_off_ir_request_cancel(STOFF_Context* context);
```

**용도** — 오래 걸리는 `st_off_ir_compute`나 렌더를 **다른 스레드에서** 중단시킵니다. `st_off_ir_get_progress`와 함께 lock-free로 부를 수 있는 유일한 쌍입니다.

**언제·어떻게** — 계산·렌더가 도는 동안 다른 스레드에서 부릅니다. 부른 시점에 이미 진행 중인 잡만 중단되며, 그 뒤에 새로 시작하는 compute·렌더에는 영향이 없습니다(미리 걸어 둘 수 없습니다). 취소된 compute는 0을 돌려주고 새 캐시를 발행하지 않으므로 이전 캐시가 그대로 남습니다. 취소된 렌더는 0과 `ST_STATUS_UNAVAILABLE`을 돌려줍니다. 배치 작업 전체를 멈추려면 `st_off_batch_cancel`을 씁니다. 스레드: `[any]` — lock-free atomic이라 어느 스레드에서나 블록 없이 부를 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_ir_get_cache_generation</code> — 현재 canonical IR 캐시의 세대 번호를 읽는다</summary>

```c
uint64_t st_off_ir_get_cache_generation(const STOFF_Context* context);
```

**용도** — 캐시가 마지막으로 발행된 세대를 돌려줍니다. 원시 IR 기술자와 모든 렌더 결과 info(`cacheGeneration` 필드)에도 같은 번호가 실리므로, 여러 번 조회·렌더한 결과가 **같은 계산에서 나왔는지** 호스트가 확인할 수 있습니다.

**언제·어떻게** — compute 전에는 0입니다. compute가 성공할 때마다 바뀝니다. 탭 복사·렌더 결과의 `cacheGeneration`과 비교해, 그 사이에 다른 스레드가 다시 계산하지 않았는지 검사하는 데 씁니다. 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |

**반환** — 현재 세대 번호. 캐시가 없거나(compute 전) `context`가 NULL이면 `0`.

</details>

<details>
<summary><code>st_off_ir_get_raw_descriptor</code> — 리스너·소스 쌍의 원시 IR 요약(개수·세대·late 잔향 기술자·수송 에너지)을 읽는다</summary>

```c
int st_off_ir_get_raw_descriptor(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDescriptor* outDescriptor);
```

**용도** — canonical 캐시에 있는 쌍 하나의 원시 IR 머리 정보를 돌려줍니다. 탭·셀·연속성 ID 개수(복사 버퍼 크기), 음속·샘플레이트, 캐시 세대, late 잔향 기술자(T60·평균 자유 행로·실내 부피 등), 소스 수송 에너지 수지를 한 번에 얻습니다. 엔진의 렌더를 거치지 않고 기하·통계 데이터를 직접 분석하거나 자체 렌더러에 넣을 때 출발점입니다.

**언제·어떻게** — `st_off_ir_compute` 뒤(또는 아카이브 적재 뒤)에 부릅니다. 반환된 개수로 버퍼를 잡고 `st_off_ir_copy_raw_early_taps` / `st_off_ir_copy_raw_diffuse_rain_cells` / `st_off_ir_copy_raw_reverb_send_taps` / `st_off_ir_copy_raw_continuity_ids`로 내용을 복사합니다. 원시 IR은 early 공간 모드와 무관하게 항상 exact 정본입니다. 지원 여부는 `ST_CAP_OFFLINE_RAW_IR`로 확인합니다. 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `outDescriptor` | 결과를 받을 구조체. 호출자가 `structSize` = `sizeof(STRawIRDescriptor)`, `apiVersion` = `st_off_get_api_version()`을 채운다 |

**구조체** `STRawIRDescriptor`

| 필드 | 설명 |
|---|---|
| `structSize`, `apiVersion` | 호출자가 채우는 버전 스탬프 |
| `cacheGeneration` | 이 결과가 속한 캐시 세대 |
| `listenerId`, `sourceId` | 쌍의 ID |
| `sampleRate` | 샘플레이트(44100 Hz 고정) |
| `soundSpeedMetersPerSecond` | 이 계산에 쓴 음속(m/s). 대기 설정에서 유도된 값 |
| `earlyTapCount` | 원시 초기 탭 수(`st_off_ir_copy_raw_early_taps`의 필요 개수). 기하 경로만 센다 |
| `reverbSendTapCount` | late 잔향 송출 탭 수(`st_off_ir_copy_raw_reverb_send_taps`의 필요 개수) |
| `continuityIdCount` | 연속성 ID 총수(`st_off_ir_copy_raw_continuity_ids`의 필요 개수) |
| `sourceTransportEnergy` | `STRawIRSourceTransportEnergy` — 소스 수송 에너지 수지(아래 표) |
| `lateReverb` | `STRawIRReverbDescriptor` — late 잔향장 기술자(아래 표) |
| `diffuseRainCellCount` | 1차 산란 셀 수(`st_off_ir_copy_raw_diffuse_rain_cells`의 필요 개수). 지원 여부는 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN` |
| `reserved[5]` | 예약 |

**구조체** `STRawIRSourceTransportEnergy` — 9밴드 배열은 모두 에너지 영역입니다.

| 필드 | 설명 |
|---|---|
| `valid` | 1 = 값이 유효 / 0 = 없음 |
| `emitted[9]` | 소스 수송이 방출한 에너지 |
| `diffuseReleased[9]` | 확산 에너지로 풀려나 late 잔향 송출로 간 에너지 |
| `escapedCoherent[9]` | 결맞은 채로 빠져나간 에너지 |
| `depthRemainder[9]` | 반사 깊이 한도에서 남은 에너지 |
| `boundaryAndAirLoss[9]` | 경계(흡수)·공기 흡수로 잃은 에너지 |

**구조체** `STRawIRReverbDescriptor` — 반사율·공기 항은 에너지 영역, `diffuseFieldPressureGain`·`level`·`dryInputGain`은 압력 영역 선형 배율입니다.

| 필드 | 설명 |
|---|---|
| `valid` | 1 = 값이 유효 / 0 = 없음 |
| `avgReflection[9]` | 평균 반사율(에너지) |
| `airEnergyGainPerMeanFreePath[9]` | 평균 자유 행로 하나를 지날 때의 공기 흡수 에너지 이득 |
| `eyringT60Seconds[9]` | Eyring 잔향 시간 T60(초) |
| `diffuseFieldPressureGain[9]` | 확산장 압력 이득(압력 영역) |
| `roomVolumeMetersCubed` | 추정 실내 부피(m³) |
| `meanFreePath` | 평균 자유 행로(m) |
| `meanFreeFlightTimeSeconds` | 평균 자유 비행 시간(초) |
| `boundaryHitRatio` | 경계 적중 비율(무차원) |
| `reserved[2]` | 예약 |
| `level` | late 레벨(압력 영역) |
| `dryInputGain` | 드라이 입력 이득(압력 영역) |

길이·부피 출력은 `sceneRatio`를 반영한 실제 미터 단위입니다.

**반환** — `1` = 성공 / `0` = 실패. `outDescriptor`가 NULL이거나 스탬프가 틀리면 `ST_STATUS_INVALID_ARGUMENT`, 캐시가 없거나 그 쌍이 없으면 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_early_taps</code> — 쌍의 원시 초기 탭(직접·투과·반사·회절 경로)을 복사한다</summary>

```c
int st_off_ir_copy_raw_early_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRTap* outTaps, int tapCapacity);
```

**용도** — 기하 경로 하나하나를 에너지 영역 탭으로 내보냅니다(경로 종류, 지연, 9밴드 에너지 이득, 도래 방향, 경로 길이, Doppler 기울기, 경로 ID). 직접음 도착 시각·ITDG·경로 수 같은 기하 지표를 계산하거나 자체 렌더러를 구동할 때 씁니다. 압력이 필요하면 각 밴드 에너지에 `sqrt`를 **한 번** 적용합니다.

**언제·어떻게** — 원시 초기 탭은 **기하 경로만**입니다. 압력 IR 렌더에 들어가는 1차 산란(diffuse rain) 셀은 1 ms 셀로 모은 통계 성분이라 여기에 포함되지 않으며(`earlyTapCount`와 연속성 ID도 마찬가지), 따로 `st_off_ir_copy_raw_diffuse_rain_cells`로 받습니다. 그래서 기하 지표가 그 셀에 흔들리지 않습니다. 크기 질의: `outTaps` = NULL, `tapCapacity` = 0으로 부르면 필요한 개수를 돌려줍니다(`STRawIRDescriptor.earlyTapCount`와 같음). 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `outTaps` | 탭을 받을 호출자 배열. NULL이면 크기 질의(이때 `tapCapacity`는 0이어야 함) |
| `tapCapacity` | `outTaps` 원소 수. 0 이상 |

**구조체** `STRawIRTap` (에너지 영역)

| 필드 | 설명 |
|---|---|
| `pathType` | 0 = Direct / 1 = Transmission / 2 = Reflection / 3 = Diffraction |
| `depth` | 상호작용 차수 |
| `delaySeconds` | 도착 지연(초) |
| `delaySamples` | 도착 지연(44.1 kHz 샘플, 소수 포함) |
| `bandEnergyGain[9]` | 9밴드 에너지 이득. 압력은 `sqrt`로 얻는다 |
| `dirFromListener[3]` | 리스너에서 본 도래 방향 |
| `matchDirFromListener[3]` | 경로 대응(연속성 매칭)에만 쓰는 리스너 쪽 방향(월드 좌표) |
| `matchDirFromSource[3]` | 경로 대응(연속성 매칭)에만 쓰는 소스 쪽 방향(월드 좌표) |
| `pathLengthMeters` | 경로 길이(m, `sceneRatio` 반영) |
| `relativeSpeed` | 상대 속도(m/s) — `delayChangePerSample` × 음속 |
| `delayChangePerSample` | 샘플당 지연 변화(Doppler 기울기) |
| `pathId` | 64비트 토폴로지 기반 경로 ID(같은 경로를 계산 사이에 대응시키는 키) |
| `interactionSignature` | 같은 `pathId`를 공유하는 물리적 분기를 가르는 상호작용·재질 판별자 |
| `continuityOffset` | 이 탭의 연속성 ID가 `st_off_ir_copy_raw_continuity_ids` 배열에서 시작하는 인덱스 |
| `continuityCount` | 이 탭의 연속성 ID 수. 유일한 경로는 0(`pathId`가 곧 그 ID) |

**반환** — 복사한(또는 필요한) 탭 수. 실패는 `0`: 용량 음수·`outTaps` NULL인데 용량 0 아님은 `ST_STATUS_INVALID_ARGUMENT`, 용량 부족은 `ST_STATUS_BUFFER_TOO_SMALL`, 캐시·쌍이 없으면 `ST_STATUS_UNAVAILABLE`. 탭이 하나도 없는 정상 결과도 0이므로 구분은 `st_off_get_last_status`로 합니다.

</details>

<details>
<summary><code>st_off_ir_copy_raw_diffuse_rain_cells</code> — 쌍의 1차 산란(diffuse rain) 셀을 복사한다</summary>

```c
int st_off_ir_copy_raw_diffuse_rain_cells(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRDiffuseRainCell* outCells, int cellCapacity);
```

**용도** — 산란점에서 리스너로 바로 가는 산란 에너지를 직접음 이후 1 ms 셀로 모은 통계 성분을 내보냅니다. 압력·바이노럴 렌더는 이 셀을 late 스템으로 렌더합니다(기하 경로가 아니므로 `st_off_ir_copy_raw_early_taps`에는 없습니다). 렌더 IR을 원시 성분으로 분해하거나 자체 렌더러에서 1차 산란을 재현할 때 씁니다.

**언제·어떻게** — 계약은 다른 원시 복사와 같습니다: `outCells` = NULL, `cellCapacity` = 0이면 필요한 개수(`STRawIRDescriptor.diffuseRainCellCount`와 같음)를 돌려줍니다. 산란이 없으면 0입니다. 렌더 압력 = `polarity` × √(에너지)입니다. 지원 여부는 `st_off_get_capability_word(1)`의 `ST_CAP1_OFFLINE_RAW_DIFFUSE_RAIN`으로 확인합니다. 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `outCells` | 셀을 받을 호출자 배열. NULL이면 크기 질의(이때 `cellCapacity`는 0이어야 함) |
| `cellCapacity` | `outCells` 원소 수. 0 이상 |

**구조체** `STRawIRDiffuseRainCell` (에너지 영역)

| 필드 | 설명 |
|---|---|
| `pathId` | 셀 번호만으로 정해지는 결정적 ID(같은 셀은 같은 ID) |
| `cellIndex` | 직접음 이후 1 ms 셀 번호(0부터) |
| `polarity` | 렌더 압력 부호 +1 / −1(셀마다 결정적) |
| `delaySeconds` | 셀 안의 에너지 가중 도착 시각(초) |
| `delaySamples` | 같은 값(44.1 kHz 샘플) |
| `bandEnergyGain[9]` | 9밴드 에너지 이득 |
| `dirFromListener[3]` | 에너지 가중 도래 방향(리스너 로컬) |
| `delayChangePerSample` | 샘플당 지연 변화 |
| `reserved[4]` | 예약 |

**반환** — 복사한(또는 필요한) 셀 수. 실패는 `0`: 인자 오류는 `ST_STATUS_INVALID_ARGUMENT`, 용량 부족은 `ST_STATUS_BUFFER_TOO_SMALL`, 캐시·쌍이 없으면 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_reverb_send_taps</code> — 쌍의 late 잔향 송출 탭(확산 에너지 사건)을 복사한다</summary>

```c
int st_off_ir_copy_raw_reverb_send_taps(STOFF_Context* context, STListenerId listener, STSourceId source, STRawIRReverbSendTap* outTaps, int tapCapacity);
```

**용도** — 소스 수송에서 얻은 통계적 확산 에너지 사건(late 잔향 탱크를 여기하는 송출 탭)을 내보냅니다. 엔진 렌더에서는 이 탭들이 압력으로 실현돼 FDN에 들어갑니다. exact 초기 경로(직접·투과·반사·회절)는 FDN에 들어가지 않고 별도 경로로 렌더됩니다. late 잔향의 시간·스펙트럼 입력을 분석하거나 자체 잔향기에 넣을 때 씁니다.

**언제·어떻게** — `outTaps` = NULL, `tapCapacity` = 0이면 필요한 개수(`STRawIRDescriptor.reverbSendTapCount`와 같음)를 돌려줍니다. 렌더 요청의 `reverbSendMask`가 이 탭 중 어느 것이 탱크를 여기할지 고릅니다. 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `outTaps` | 탭을 받을 호출자 배열. NULL이면 크기 질의(이때 `tapCapacity`는 0이어야 함) |
| `tapCapacity` | `outTaps` 원소 수. 0 이상 |

**구조체** `STRawIRReverbSendTap` (에너지 영역)

| 필드 | 설명 |
|---|---|
| `sourcePathType` | 소스 쪽 경로 계열 라우팅 태그(현재 소스 수송은 Reflection) |
| `role` | `STReverbSendRole` — 현재 값은 `ST_REVERB_SEND_OBSERVED_SCATTER`(0) 하나 |
| `depth` | 안정적인 수송 시간 빈 순번 |
| `reserved0` | 예약 |
| `delaySeconds` | 지연(초) |
| `delaySamples` | 지연(44.1 kHz 샘플) |
| `bandEnergy[9]` | 9밴드 에너지 |
| `matchDirFromSource[3]` | 소스 쪽 방향 |
| `pathLengthMeters` | 경로 길이(m, `sceneRatio` 반영) |
| `relativeSpeed` | 상대 속도(m/s) |
| `delayChangePerSample` | 샘플당 지연 변화 |
| `pathId` | 64비트 경로 ID |

**반환** — 복사한(또는 필요한) 탭 수. 실패는 `0`: 인자 오류는 `ST_STATUS_INVALID_ARGUMENT`, 용량 부족은 `ST_STATUS_BUFFER_TOO_SMALL`, 캐시·쌍이 없으면 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_copy_raw_continuity_ids</code> — 원시 초기 탭들의 연속성 경로 ID 배열을 복사한다</summary>

```c
int st_off_ir_copy_raw_continuity_ids(STOFF_Context* context, STListenerId listener, STSourceId source, uint64_t* outPathIds, int idCapacity);
```

**용도** — 하나의 탭으로 합쳐진 경로가 여러 토폴로지 경로 ID를 가질 때, 같은 경로로 판정된 그 ID들(별칭)을 하나의 평탄한 배열로 내보냅니다. 탭 `i`의 ID는 `outPathIds[taps[i].continuityOffset .. + taps[i].continuityCount)`입니다. 유일한 경로의 탭은 범위가 비어 있습니다(`pathId`가 곧 그 ID). 계산 결과 사이에서 경로 대응을 호스트가 직접 맺을 때, 대표 `pathId`가 바뀌어도 같은 경로임을 알아보는 데 씁니다.

**언제·어떻게** — `st_off_ir_copy_raw_early_taps`와 같은 캐시 세대에서 함께 복사합니다(1차 산란 셀은 포함되지 않습니다). `outPathIds` = NULL, `idCapacity` = 0이면 필요한 개수(`STRawIRDescriptor.continuityIdCount`와 같음)를 돌려줍니다. 스레드: `[control]` — 잡 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `outPathIds` | 64비트 경로 ID를 받을 호출자 배열. NULL이면 크기 질의(이때 `idCapacity`는 0이어야 함) |
| `idCapacity` | `outPathIds` 원소 수. 0 이상 |

**반환** — 복사한(또는 필요한) ID 수. 실패는 `0`: 인자 오류는 `ST_STATUS_INVALID_ARGUMENT`, 용량 부족은 `ST_STATUS_BUFFER_TOO_SMALL`, 캐시·쌍이 없으면 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_init_pressure_request</code> — 압력 IR 요청 구조체를 기본값으로 채운다</summary>

```c
void st_off_ir_init_pressure_request(STOfflinePressureIRRequestOptions* outOptions);
```

**용도** — `STOfflinePressureIRRequestOptions`의 버전 스탬프와 기본값을 한 번에 채웁니다. 압력 IR 렌더(`st_off_ir_render_pressure`, `st_off_ir_render_pressure_mixed`, `st_off_batch_add_pressure_render*`)에 넘기기 전에 항상 이 함수로 초기화한 뒤 필요한 필드만 바꿉니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 스레드: `[any]` — 호출자 구조체만 채우므로 어느 스레드에서나 블록 없이 부를 수 있습니다.

| 파라미터 | 설명 |
|---|---|
| `outOptions` | 채울 구조체. NULL이면 아무것도 하지 않음 |

**구조체** `STOfflinePressureIRRequestOptions`

| 필드 | 기본값 | 설명 |
|---|---|---|
| `structSize` | `sizeof(STOfflinePressureIRRequestOptions)` | 버전 스탬프 |
| `apiVersion` | `st_off_get_api_version()` 값 | 버전 스탬프 |
| `outputMode` | `ST_PRESSURE_IR_BROADBAND_MONO`(0) | `STPressureIROutput` — `ST_PRESSURE_IR_BROADBAND_MONO`(0, 광대역 모노 1채널) / `ST_PRESSURE_IR_SEPARATE_BANDS`(1, 9밴드 분리). 같은 요청에서 모노 = 9밴드의 합이 성립한다 |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 결과에 넣을 성분. `ST_OFFLINE_OUTPUT_DIRECT`(1) / `TRANSMISSION`(2) / `REFLECTION`(4) / `DIFFRACTION`(8) / `LATE_REVERB`(16)의 OR. 묶음 `ST_OFFLINE_OUTPUT_EARLY_ALL`(초기 4종), `ST_OFFLINE_OUTPUT_FULL`(전부). `LATE_REVERB`는 late 잔향과 1차 산란 셀을 함께 싣는다. `FULL` 밖의 비트는 거절 |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | late 잔향 탱크를 여기할 송출 탭을 초기 경로 4비트(`ST_OFFLINE_OUTPUT_DIRECT`·`TRANSMISSION`·`REFLECTION`·`DIFFRACTION`)로 고른다. `ST_OFFLINE_REVERB_SEND_ALL` = `ST_OFFLINE_OUTPUT_EARLY_ALL`. `EARLY_ALL` 밖의 비트는 거절 |
| `renderMethod` | 0 | 렌더러 선택자. 압력 IR 렌더러는 하나이며 0·1·2(`ST_PRESSURE_IR_RENDER_SIMULATE` / `SYNTHESIZE_EXACT` / `SIMULATE2`, 레거시 별칭)는 모두 같은 렌더로 가서 결과가 바이트 동일하다. 새 코드는 0. 그 밖의 값은 거절 |
| `reserved[9]` | 0 | 예약 |

`outputMask`는 들리는(반환되는) 성분을, `reverbSendMask`는 어떤 송출 탭이 late 탱크를 여기할지를 정합니다. 예를 들어 `outputMask` = `ST_OFFLINE_OUTPUT_LATE_REVERB`만 두면 초기 경로를 뺀 late 스템만 얻습니다.

**반환** — 없음.

</details>

<details>
<summary><code>st_off_ir_get_pressure_band_centers</code> — 9밴드 압력 IR의 밴드 중심 주파수(Hz)를 복사한다</summary>

```c
int st_off_ir_get_pressure_band_centers(float* outHz, int capacity);
```

**용도** — `ST_PRESSURE_IR_SEPARATE_BANDS` 결과의 밴드 `b`가 어느 주파수 대역인지 알려 줍니다. 엔진 밴드는 63 / 125 / 250 / 500 / 1k / 2k / 4k / 8k / 16k Hz의 9개(`ST_FREQUENCY_BANDS`)입니다.

**언제·어떻게** — 컨텍스트 없이 언제든 부를 수 있습니다. 밴드 분리 IR을 저장하거나 그래프로 그릴 때 라벨로 씁니다. 지원 여부는 `ST_CAP_OFFLINE_PRESSURE_BAND_METADATA`로 확인합니다. 스레드: `[any]` — 컴파일 상수를 복사합니다.

| 파라미터 | 설명 |
|---|---|
| `outHz` | 중심 주파수를 받을 배열. NULL이면 크기 질의(이때 `capacity`는 0) |
| `capacity` | `outHz` 원소 수. 9 이상이어야 한다 |

**반환** — 밴드 수 `9`(복사 성공 또는 크기 질의). `capacity`가 9보다 작거나, `outHz` NULL인데 `capacity`가 0이 아니면 `0`.

</details>

<details>
<summary><code>st_off_ir_render_pressure</code> — 리스너·소스 쌍 하나의 압력 IR(광대역 모노 또는 9밴드)을 렌더한다</summary>

```c
int st_off_ir_render_pressure(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**용도** — canonical 캐시의 쌍 하나를 시간 영역 압력 임펄스 응답(RIR)으로 렌더합니다. exact 초기 경로와 송출 탭을 임펄스로 합성하고 late 잔향은 FDN으로 렌더합니다. 음향 분석(T60·C80·EDT 등)이나 측정값과의 비교, 외부 컨볼루션 리버브용 IR 추출에 씁니다. 공간화하지 않은 압력 신호이며 early 공간 모드와 무관하게 항상 exact 정본입니다.

**언제·어떻게** — `st_off_ir_compute` 뒤에 부릅니다. 결과는 호출자 소유 버퍼에 한 번에 씁니다.

1. 크기 질의: `outValues` = NULL, `capacityValues` = 0으로 부르면 필요한 값 개수를 돌려주고, 쌍이 유효하면 `outInfo`도 채웁니다.
2. 그 크기로 버퍼를 잡고 다시 부릅니다.

샘플레이트는 44100 Hz 고정입니다. 길이는 `floor(seconds × 44100)` 프레임이고, 값 개수는 모노면 프레임 수, 밴드 분리면 9 × 프레임 수입니다. 밴드 분리 배치는 `values[band × bandStride + sample]`(`bandStride` = `frameCount`)입니다. 출력은 **정규화하지 않은** 절대 레벨이며 정규화 옵션은 없습니다. 지연 링 한계(`st_off_render_set_max_delay_seconds`, 기본 4 s)보다 늦게 도착하는 exact 경로는 빠집니다. 소스 EQ가 걸려 있으면 같은 필터가 적용됩니다. 같은 요청을 반복 렌더하면 비트 동일합니다. 다른 스레드에서 `st_off_ir_request_cancel`로 중단할 수 있습니다. 지원 여부는 `ST_CAP_OFFLINE_PRESSURE_IR`로 확인합니다. 스레드: `[control, blocking]` — 렌더가 호출 스레드에서 돌고, 이 컨텍스트의 다른 잡과 직렬화됩니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `seconds` | IR 길이(초). 유한한 양수, 최소 1프레임 |
| `options` | `st_off_ir_init_pressure_request`로 초기화한 요청. NULL 불가. 필드는 그 항목 참고 |
| `outValues` | 결과를 받을 호출자 버퍼(float). NULL이면 크기 질의 |
| `capacityValues` | `outValues`의 float 개수. 크기 질의면 0 |
| `outInfo` | 결과 메타데이터. NULL 허용. 넘기면 호출자가 `structSize` = `sizeof(STOfflinePressureIRInfo)`, `apiVersion`을 채운다 |

**구조체** `STOfflinePressureIRInfo`

| 필드 | 설명 |
|---|---|
| `structSize`, `apiVersion` | 호출자가 채우는 버전 스탬프 |
| `cacheGeneration` | 렌더에 쓴 캐시 세대 |
| `listenerId` | 리스너 ID |
| `sourceId` | 소스 ID. 혼합 렌더는 `-1` |
| `sampleRate` | 44100 |
| `frameCount` | 프레임 수 |
| `bandCount` | 1(광대역 모노) 또는 9(밴드 분리) |
| `bandStride` | 밴드 간 간격 = `frameCount` |
| `valueCount` | 전체 float 개수 = `frameCount × bandCount` |
| `outputMode` | 실제로 쓴 `STPressureIROutput` |
| `reverbSendTapCount` | 렌더에 들어간 송출 탭 수(혼합 렌더는 소스별 합) |
| `outputMask`, `reverbSendMask` | 실제로 쓴 마스크 |
| `sourceCount` | 렌더에 들어간 소스 수. 솔로 렌더는 1 |
| `reserved[9]` | 예약 |

**반환** — 쓴(또는 필요한) float 개수. 실패는 `0`: 캐시가 없으면 `ST_STATUS_UNAVAILABLE`, 요청·길이·마스크·스탬프가 잘못됐거나 크기 질의에서 쌍이 없으면 `ST_STATUS_INVALID_ARGUMENT`, 버퍼가 모자라면 `ST_STATUS_BUFFER_TOO_SMALL`, 렌더 실패·취소는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_render_pressure_mixed</code> — 리스너 하나와 소스 여러 개를 한 번에 실어 합쳐진 압력 IR 하나를 렌더한다</summary>

```c
int st_off_ir_render_pressure_mixed(STOFF_Context* context, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options, float* outValues, int capacityValues, STOfflinePressureIRInfo* outInfo);
```

**용도** — 같은 리스너에 대한 여러 소스의 RIR을 따로 렌더해 더하는 대신, 한 임펄스 렌더에 모두 실어 RIR 하나를 냅니다. 결과는 소스별 `st_off_ir_render_pressure` 결과의 합과 같습니다: exact 탭은 요청 순서대로 같은 출력에 누적되고, 송출은 리스너 쪽에 진폭(부호 포함) 그대로 누적돼 FDN이 한 번만 돕니다. FDN이 선형·시불변이라 late도 솔로 합처럼 결맞게 더해지면서 FDN 비용은 한 번입니다. 여러 음원이 동시에 울리는 장면의 RIR이 필요할 때 씁니다.

**언제·어떻게** — `st_off_ir_compute` 뒤에 부릅니다. 버퍼·크기 질의 규약, 길이·샘플레이트·정규화 없음은 `st_off_ir_render_pressure`와 같습니다. 그 리스너의 소스 일부만 넣어도 됩니다. 부동소수 합산 순서만 솔로 합과 달라 비트 동일은 아니며, 합산 순서는 `sources` 배열 순서입니다(소스 등록 순서와 무관). 같은 요청의 반복 렌더는 비트 동일하고, `sourceCount` = 1이면 솔로 렌더와 비트 동일합니다. 원시 IR 조회는 여전히 소스별입니다. 지원 여부는 `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`로 확인합니다. 스레드: `[control, blocking]` — 렌더가 호출 스레드에서 돕니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `sources` | 소스 핸들 배열. 중복 없음, 전부 그 리스너의 canonical 쌍이어야 함 |
| `sourceCount` | 소스 수. `1` 이상 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`(1024) 이하 |
| `seconds` | IR 길이(초). 유한한 양수, 최소 1프레임 |
| `options` | `st_off_ir_init_pressure_request`로 초기화한 요청 |
| `outValues` | 결과 버퍼. NULL이면 크기 질의 |
| `capacityValues` | `outValues`의 float 개수. 크기 질의면 0 |
| `outInfo` | 결과 메타데이터(`STOfflinePressureIRInfo`, 필드는 `st_off_ir_render_pressure` 항목 참고). NULL 허용. `sourceId` = -1, `sourceCount` = 소스 수, `reverbSendTapCount` = 소스별 합 |

**반환** — 쓴(또는 필요한) float 개수. 실패는 `0`: 캐시가 없으면 `ST_STATUS_UNAVAILABLE`, 중복·미등록 소스·잘못된 요청은 `ST_STATUS_INVALID_ARGUMENT`, 버퍼가 모자라면 `ST_STATUS_BUFFER_TOO_SMALL`, 렌더 실패·취소는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_init_binaural_request</code> — 바이노럴 IR 요청 구조체를 기본값으로 채운다</summary>

```c
void st_off_ir_init_binaural_request(STOfflineBinauralIRRequestOptions* outOptions);
```

**용도** — `STOfflineBinauralIRRequestOptions`의 버전 스탬프와 기본값을 채웁니다. `st_off_ir_render_binaural`과 `st_off_ir_render_audition_pair`에 넘기기 전에 항상 이 함수로 초기화합니다.

**언제·어떻게** — 기본 `hrtfType`은 SADIE D2라 외부 자산 파일이 있어야 합니다(`st_off_render_set_spatializer` 항목의 탐색 순서 참고). 자산 없이 쓰려면 `hrtfType`을 `ST_SPATIALIZER_MIT_KEMAR`(1, 내장) 또는 `ST_SPATIALIZER_PANNING`(0)으로 바꿉니다. 스레드: `[any]` — 호출자 구조체만 채웁니다.

| 파라미터 | 설명 |
|---|---|
| `outOptions` | 채울 구조체. NULL이면 아무것도 하지 않음 |

**구조체** `STOfflineBinauralIRRequestOptions`

| 필드 | 기본값 | 설명 |
|---|---|---|
| `structSize` | `sizeof(STOfflineBinauralIRRequestOptions)` | 버전 스탬프 |
| `apiVersion` | `st_off_get_api_version()` 값 | 버전 스탬프 |
| `outputMask` | `ST_OFFLINE_OUTPUT_FULL` | 결과에 넣을 성분(`ST_OFFLINE_OUTPUT_*`, `st_off_ir_init_pressure_request` 항목과 같은 뜻) |
| `reverbSendMask` | `ST_OFFLINE_REVERB_SEND_ALL` | late 탱크를 여기할 송출 탭(초기 경로 4비트) |
| `hrtfType` | `ST_SPATIALIZER_SADIE_D2_KEMAR`(2) | `STSpatializerType` — `PANNING`(0) / `MIT_KEMAR`(1) / `SADIE_D2_KEMAR`(2) |
| `reserved[10]` | 0 | 예약 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_ir_render_binaural</code> — 리스너·소스 쌍 하나의 바이노럴(스테레오 L/R) IR을 렌더한다</summary>

```c
int st_off_ir_render_binaural(STOFF_Context* context, STListenerId listener, STSourceId source, double seconds, const STOfflineBinauralIRRequestOptions* options, float* outInterleavedLR, int capacityFrames, STOfflineBinauralIRInfo* outInfo);
```

**용도** — canonical 캐시의 쌍 하나를 HRTF로 공간화한 2채널 임펄스 응답으로 렌더합니다. 헤드폰 청취용 BRIR을 얻거나 외부 컨볼버에 넣을 때 씁니다. 초기 반사 경로는 렌더 시점의 early 공간 모드를 따릅니다(`st_off_render_set_early_spatial_mode`).

**언제·어떻게** — `st_off_ir_compute` 뒤에 부르며, 크기 질의는 압력 IR과 같은 방식입니다(`outInterleavedLR` = NULL, `capacityFrames` = 0 → 필요한 프레임 수와 `outInfo`). `capacityFrames`는 float 개수가 아니라 **스테레오 프레임 수**이고, 버퍼는 L/R 인터리브(`[L0, R0, L1, R1, …]`)로 프레임 수 × 2개의 float를 담아야 합니다. 길이는 `floor(seconds × 44100)` 프레임, 샘플레이트는 44100 Hz 고정입니다. 리미터와 정규화는 언제나 꺼져 있습니다(정규화 옵션 없음). OBJECTS 모드에서는 경로 페이드와 Doppler도 고정으로 꺼지고, BED 모드는 동기 실시간 bed 경로라 경로 페이드·Doppler·게인 램프가 실시간 기본값으로 켜진 채 정상 상태에서 렌더됩니다(정지 장면에서는 결과에 영향이 없습니다). SADIE D2 자산이 없으면 크기 질의부터 실패합니다. 지원 여부는 `ST_CAP_OFFLINE_BINAURAL_IR`로 확인합니다. 스레드: `[control, blocking]` — 렌더가 호출 스레드에서 돕니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `seconds` | IR 길이(초). 유한한 양수, 최소 1프레임 |
| `options` | `st_off_ir_init_binaural_request`로 초기화한 요청. NULL 불가 |
| `outInterleavedLR` | L/R 인터리브 결과 버퍼. NULL이면 크기 질의 |
| `capacityFrames` | 버퍼의 **스테레오 프레임** 수. 크기 질의면 0 |
| `outInfo` | 결과 메타데이터. NULL 허용. 넘기면 호출자가 `structSize` = `sizeof(STOfflineBinauralIRInfo)`, `apiVersion`을 채운다 |

**구조체** `STOfflineBinauralIRInfo`

| 필드 | 설명 |
|---|---|
| `structSize`, `apiVersion` | 호출자가 채우는 버전 스탬프 |
| `cacheGeneration` | 렌더에 쓴 캐시 세대 |
| `listenerId`, `sourceId` | 쌍의 ID |
| `sampleRate` | 44100 |
| `frameCount` | 스테레오 프레임 수 |
| `channelCount` | 2 고정 |
| `valueCount` | float 개수 = `frameCount × 2` |
| `reverbSendTapCount` | 렌더에 들어간 송출 탭 수 |
| `outputMask`, `reverbSendMask` | 실제로 쓴 마스크 |
| `hrtfType` | 실제로 쓴 `STSpatializerType` |
| `earlySpatialMode` | 실제로 쓴 `STEarlySpatialMode`(지원 여부 `ST_CAP1_OFFLINE_EARLY_SPATIAL_MODE`) |
| `reserved[9]` | 예약 |

**반환** — 쓴(또는 필요한) 스테레오 프레임 수. 실패는 `0`: 캐시가 없거나 SADIE D2 자산이 없거나 BED 모드인데 캐시에 bed 변형이 없으면 `ST_STATUS_UNAVAILABLE`, 요청·스탬프가 잘못됐거나 크기 질의에서 쌍이 없으면 `ST_STATUS_INVALID_ARGUMENT`, 버퍼가 모자라면 `ST_STATUS_BUFFER_TOO_SMALL`, 렌더 실패·취소는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_ir_render_audition_pair</code> — 드라이 신호를 고정 RIR 컨볼루션과 엔진 렌더 단계로 각각 렌더해 한 쌍으로 돌려준다</summary>

```c
int st_off_ir_render_audition_pair(STOFF_Context* context, STListenerId listener, STSourceId source, double irSeconds, const STOfflineBinauralIRRequestOptions* options, const float* dryMono, int dryFrames, float* outConvolvedLR, float* outStageLR, int capacityFrames, STOFF_AuditionInfo* outInfo);
```

**용도** — 같은 canonical 쌍에서 두 가지 청취 결과를 만듭니다: (1) 바이노럴 IR을 고정 RIR로 렌더해 드라이 신호와 컨볼루션한 결과, (2) 같은 쌍을 엔진의 렌더 단계(실시간 렌더와 공유하는 단계)에 두고 드라이 신호를 직접 통과시킨 결과. 두 결과를 나란히 들어 보거나 비교해, 추출한 IR이 엔진이 실제로 내는 소리를 얼마나 대표하는지 확인할 때 씁니다.

**언제·어떻게** — `st_off_ir_compute` 뒤에 부릅니다. 두 출력 버퍼는 모두 L/R 인터리브 스테레오 프레임이고, 둘 다 넘기거나 둘 다 NULL이어야 합니다. 둘 다 NULL이면 `capacityFrames`는 0이어야 하고 `dryMono`도 NULL이어도 되며, `dryFrames`로 크기만 계산하는 메타데이터 질의가 됩니다. 출력 길이는 `dryFrames + irFrames − 1` 프레임(`irFrames` = `floor(irSeconds × 44100)`)이고, 각 버퍼는 그 프레임 수 × 2개의 float를 담아야 합니다. 공간화기·마스크·early 공간 모드·리미터/정규화 꺼짐 규칙은 `st_off_ir_render_binaural`과 같습니다. 스레드: `[control, blocking]` — 렌더가 호출 스레드에서 돕니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `irSeconds` | 컨볼루션에 쓸 IR 길이(초). 유한한 양수, 최소 1프레임 |
| `options` | `st_off_ir_init_binaural_request`로 초기화한 요청(`STOfflineBinauralIRRequestOptions`, 필드는 그 항목 참고) |
| `dryMono` | 44.1 kHz 모노 드라이 신호. 렌더할 때 필수, 크기 질의면 NULL 허용 |
| `dryFrames` | 드라이 신호 프레임 수. 1 이상(크기 질의에도 필요) |
| `outConvolvedLR` | 고정 RIR 컨볼루션 결과(L/R 인터리브). `outStageLR`와 함께 NULL이면 크기 질의 |
| `outStageLR` | 엔진 렌더 단계 결과(L/R 인터리브) |
| `capacityFrames` | 각 버퍼의 스테레오 프레임 수. 크기 질의면 0 |
| `outInfo` | 결과 메타데이터. NULL 허용. 넘기면 호출자가 `structSize` = `sizeof(STOFF_AuditionInfo)`, `apiVersion`을 채운다 |

**구조체** `STOFF_AuditionInfo`

| 필드 | 설명 |
|---|---|
| `structSize`, `apiVersion` | 호출자가 채우는 버전 스탬프 |
| `cacheGeneration` | 렌더에 쓴 캐시 세대 |
| `listenerId`, `sourceId` | 쌍의 ID |
| `sampleRate` | 44100 |
| `frameCount` | 출력 스테레오 프레임 수 = `dryFrameCount + irFrameCount − 1` |
| `dryFrameCount` | 드라이 신호 프레임 수 |
| `irFrameCount` | IR 프레임 수 |
| `earlySpatialMode` | 실제로 쓴 `STEarlySpatialMode` |
| `reserved[7]` | 예약 |

**반환** — 출력 스테레오 프레임 수. 실패는 `0`: 캐시가 없거나 SADIE D2 자산이 없거나 BED 모드인데 bed 변형이 없으면 `ST_STATUS_UNAVAILABLE`, 버퍼 한쪽만 NULL·`dryFrames` 0 이하·잘못된 요청은 `ST_STATUS_INVALID_ARGUMENT`, 버퍼가 모자라면 `ST_STATUS_BUFFER_TOO_SMALL`, 렌더 실패·취소는 `ST_STATUS_UNAVAILABLE`.

</details>

<details>
<summary><code>st_off_debug_get_snapshot_info</code> — 리스너의 마지막 계산 세대에 대한 진단 스냅샷 요약(경로 수·시각화 버퍼 크기)을 읽는다</summary>

```c
int st_off_debug_get_snapshot_info(STOFF_Context* context, STListenerId listener, STPropagationSnapshotInfo* outInfo);
```

**용도** — 마지막 `st_off_ir_compute`가 그 리스너에 대해 발행한 진단 스냅샷의 요약을 돌려줍니다. 전체·반사·회절 경로 수와 회절 분류 카운터, 시각화 경로·점 개수가 모두 **한 세대에서 온 값**임이 `frameGeneration`으로 보장됩니다. 경로 수 확인과 `st_off_debug_copy_visual_paths` 버퍼 크기 결정에 씁니다.

**언제·어떻게** — 스냅샷은 `st_off_ir_compute`가 발행하므로 그 전에는 0을 돌려줍니다. 시각화 경로·점을 받으려면 compute 전에 `st_off_debug_set_collect_visual_paths`로 수집을 켜 둡니다. 돌려받은 `frameGeneration`을 `st_off_debug_copy_visual_paths`에 그대로 넘기면 같은 세대를 복사하는지 검사할 수 있습니다. 스레드: `[control]` — 잡·시각화 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `outInfo` | 결과 구조체. 호출자가 `structSize` = `sizeof(STPropagationSnapshotInfo)`, `apiVersion`을 채운다 |

**구조체** `STPropagationSnapshotInfo`

| 필드 | 설명 |
|---|---|
| `structSize`, `apiVersion` | 호출자가 채우는 버전 스탬프 |
| `frameGeneration` | 이 스냅샷의 세대(오프라인은 IR 캐시 세대) |
| `collectionMask` | 이 세대를 수집할 때의 `STPathCollectionFlag` 마스크 |
| `reserved0` | 예약 |
| `visualPathCount` | 전체 시각화 경로 레코드 수(실패 walk 포함, `ST_VISUAL_PATH_COPY_ALL`의 필요 개수) |
| `validVisualPathCount` | 완주 경로 레코드 수(`ST_VISUAL_PATH_COPY_VALID_ONLY`의 필요 개수) |
| `visualPointCount` | 전체 시각화 점 수 |
| `validVisualPointCount` | 완주 경로의 점 수 |
| `totalPathCount` | 전체 경로 수 |
| `reflectionPathCount` | 반사 경로 수 |
| `diffractionPathCount` | 회절 경로 수 |
| `sourceSideOnlyPaths` | 소스 쪽 엣지에서만 회절한 경로 수 |
| `unclassifiedPaths` | 분류되지 않은 회절 경로 수 |
| `sourceSideEvents` | 소스 쪽 회절 사건 수 |
| `terminalOnlyPaths` | 리스너 쪽 말단 엣지에서만 회절한 경로 수 |
| `sourceAndTerminalPaths` | 양쪽 모두에서 회절한 경로 수 |
| `terminalEvents` | 리스너 쪽 말단 회절 사건 수 |
| `reserved[4]` | 예약 |

완주 경로와 그 점은 각 배열의 앞부분(prefix)을 차지합니다.

**반환** — `1` = 성공 / `0` = 실패 또는 스냅샷 없음(compute 전, 그 리스너 없음, `outInfo` NULL·스탬프 불일치).

</details>

<details>
<summary><code>st_off_debug_copy_visual_paths</code> — 시각화 경로 레코드와 점을 호출자 버퍼로 복사한다</summary>

```c
int st_off_debug_copy_visual_paths(STOFF_Context* context, STListenerId listener, uint64_t frameGeneration, int copyMode, STVisualPathRecord* outPaths, uint32_t pathCapacity, STVisualPoint* outPoints, uint32_t pointCapacity);
```

**용도** — 마지막 계산 세대의 시각화 경로(소스 → 상호작용 지점 → 리스너, 가이드 레이는 리스너 → 적중점)를 레코드 배열과 점 배열로 복사해 3D 뷰에 그릴 수 있게 합니다. 정점 좌표는 씬 단위 그대로라 호스트 씬에 바로 겹쳐 그릴 수 있습니다.

**언제·어떻게** — `st_off_debug_get_snapshot_info`로 개수를 얻어 버퍼를 잡은 뒤 부릅니다. 크기 질의 모드는 없습니다 — 용량이 필요한 개수보다 작으면 실패합니다. `frameGeneration`에 `st_off_debug_get_snapshot_info`가 돌려준 값을 넣으면, 그 사이 새 세대가 발행됐을 때 실패합니다. 0을 넣으면 세대 검사 없이 현재 스냅샷을 복사합니다. 레코드 `i`의 점은 `outPoints[pointOffset .. pointOffset + pointCount)`입니다. 스레드: `[control]` — 잡·시각화 뮤텍스를 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `listener` | 리스너 핸들 |
| `frameGeneration` | 기대하는 세대(`st_off_debug_get_snapshot_info`의 값). 0 = 검사 없이 현재 스냅샷 |
| `copyMode` | `STVisualPathCopyMode` — `ST_VISUAL_PATH_COPY_VALID_ONLY`(0, 완주 경로만) / `ST_VISUAL_PATH_COPY_ALL`(1, 실패 walk 포함). 그 밖의 값은 거절 |
| `outPaths` | 경로 레코드 버퍼. 복사할 경로가 있으면 NULL 불가 |
| `pathCapacity` | `outPaths` 원소 수. 모드에 맞는 경로 수 이상 |
| `outPoints` | 점 버퍼. 복사할 점이 있으면 NULL 불가 |
| `pointCapacity` | `outPoints` 원소 수. 모드에 맞는 점 수 이상 |

**구조체** `STVisualPathRecord`

| 필드 | 설명 |
|---|---|
| `pointOffset`, `pointCount` | 이 경로의 점이 점 배열에서 차지하는 구간(순서 있는 경로) |
| `depth` | 상호작용 차수 |
| `pathKind` | `STPathKind` — `ST_PATH_GUIDE_RAY`(0) / `ST_PATH_DIRECT`(1, 투과 포함) / `ST_PATH_REFLECTION`(2) / `ST_PATH_DIFFRACTION_S`(4, 소스 쪽 엣지) / `ST_PATH_DIFFRACTION_L`(8, 리스너 쪽 말단 엣지) / `ST_PATH_DIFFRACTION_SL`(12) / `ST_PATH_SOURCE_TRANSPORT_RAY`(16). `ST_PATH_DIFFRACTION_UNKNOWN`(3)은 정상적으로는 나오지 않는다 |
| `soundSourceIndex` | 소스 인덱스. 가이드 레이는 -1 |
| `valid` | 1 = 완주 / 0 = 중도 실패 walk |
| `totalLengthMeters` | 경로 전체 길이(m, `sceneRatio` 반영) |
| `reserved0` | 예약 |

**구조체** `STVisualPoint`

| 필드 | 설명 |
|---|---|
| `x`, `y`, `z` | 정점 좌표(씬 단위 그대로) |
| `flags` | `STVisualPointFlag` — `ST_VISUAL_POINT_NONE`(0) / `ST_VISUAL_POINT_DIFFRACTION`(1, 회절 지점) |

**반환** — `1` = 성공 / `0` = 실패. `copyMode`가 잘못됐거나 필요한 버퍼가 NULL이면 `ST_STATUS_INVALID_ARGUMENT`, 스냅샷이 없거나 세대가 바뀌었으면 `ST_STATUS_UNAVAILABLE`, 용량이 모자라면 `ST_STATUS_BUFFER_TOO_SMALL`.

</details>

<details>
<summary><code>st_off_debug_copy_mesh_accel_nodes</code> — 메시 BLAS의 노드 박스를 시각화용으로 복사한다</summary>

```c
int st_off_debug_copy_mesh_accel_nodes(STOFF_Context* context, STMeshId mesh, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**용도** — 전파가 쓰는 메시 가속구조(BLAS)의 노드 경계 상자를 읽기 전용으로 복사합니다. 가속구조가 메시를 어떻게 나눴는지 디버그 시각화할 때 씁니다. 실시간 `st_rt_debug_copy_mesh_accel_nodes`와 같은 계약이며, 오프라인 컨텍스트도 실시간과 같은 경계 설정으로 BLAS를 지으므로 같은 가속구조 종류면 결과가 같습니다.

**언제·어떻게** — 메시를 만든 뒤 언제든 부를 수 있습니다. BLAS는 메시 생성 시점의 `st_off_scene_set_accel` 값으로 지어집니다. 노드는 깊이 우선 **전위** 순서이고 루트가 `[0]`(depth 0)이며, 각 노드의 부모는 배열 앞쪽에서 가장 가까운 depth − 1 노드입니다. 좌표는 `st_off_mesh_create`에 넘긴 정점 프레임(메시 로컬)이라 인스턴스로 그리려면 호스트가 오브젝트 변환을 곱합니다. 큰 메시는 수천 노드라 보통 `maxDepth`로 윗단만 봅니다. 버퍼가 모자라면 전위 순서의 앞부분(맨 왼쪽 가지부터)만 쓰이므로, 윗단을 원하면 `maxDepth`로 자릅니다. 지원 여부는 `ST_CAP_ACCEL_DEBUG_NODES`로 확인합니다. 스레드: `[control]` — 씬 read 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `mesh` | 메시 핸들 |
| `maxDepth` | 음수 = 전 깊이. 0 이상이면 depth가 `maxDepth` 이하인 노드만 센다·쓴다 |
| `outNodes` | 노드 버퍼. NULL이면 크기 질의(`nodeCapacity` 무시) |
| `nodeCapacity` | `outNodes` 원소 수. 앞에서부터 min(전체, `nodeCapacity`)개를 쓴다 |

**구조체** `STAccelNode` (32바이트, 버전 스탬프 없는 배열 원소)

| 필드 | 설명 |
|---|---|
| `boundsMin[3]`, `boundsMax[3]` | 노드 경계 상자(그 가속구조가 지어진 프레임, `sceneRatio` 변환 없음) |
| `depth` | 깊이. 루트 = 0 |
| `primitiveCount` | 리프: 담긴 프리미티브 수(0 이상) / 내부 노드: -1 |

가속구조 종류별 의미: BVH 계열(0 BinnedSAH, 2 TinyBVH, 3 LBVH, 4 LBVH_Simd)은 빌드된 이진 트리이고, 4/8-wide 순회 표현은 이 트리를 접은 것이라 그 박스들은 이 목록의 부분집합입니다. KD(1 HybridKD)는 루트 박스를 분할 평면으로 잘라 유도한 박스라 형제 박스가 겹치지 않고 부모를 정확히 나누며, 빈 리프(`primitiveCount` 0)가 있고 여러 리프에 걸친 삼각형은 리프마다 셉니다.

**반환** — `maxDepth` 안의 **전체** 노드 수(0 이상) / `-1` = 실패(`context` NULL, 없는 메시는 `ST_STATUS_NOT_FOUND`). 잘린 복사는 전체 수를 그대로 돌려주고 `ST_STATUS_BUFFER_TOO_SMALL`을 남깁니다.

</details>

<details>
<summary><code>st_off_debug_copy_scene_accel_nodes</code> — 씬 TLAS(오브젝트 인스턴스 가속구조)의 노드 박스를 복사한다</summary>

```c
int st_off_debug_copy_scene_accel_nodes(STOFF_Context* context, int layer, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**용도** — 오브젝트 인스턴스 위에 지은 씬 가속구조(TLAS)의 노드 경계 상자를 복사합니다. 씬 전체의 공간 분할을 시각화할 때 씁니다. 실시간 `st_rt_debug_copy_scene_accel_nodes`와 같은 계약입니다.

**언제·어떻게** — 정적 TLAS는 `st_off_build`가 발행한 것이며, 다음 빌드 전까지는 지난 발행본 그대로입니다(스테이징된 정적 변경은 보이지 않습니다). 동적 TLAS는 동적 오브젝트 재구축이 다시 발행합니다. 좌표는 씬(월드) 프레임이고, TLAS 리프의 프리미티브는 삼각형이 아니라 오브젝트 인스턴스입니다. 노드 순서·`maxDepth`·크기 질의·잘림 규약과 `STAccelNode` 필드는 `st_off_debug_copy_mesh_accel_nodes` 항목과 같습니다. 지원 여부는 `ST_CAP_ACCEL_DEBUG_NODES`. 스레드: `[control]` — 씬 read 락만 잡습니다.

| 파라미터 | 설명 |
|---|---|
| `context` | 오프라인 컨텍스트 핸들 |
| `layer` | `STAccelLayer` — `ST_ACCEL_LAYER_STATIC`(0, `st_off_build`가 발행한 정적 TLAS) / `ST_ACCEL_LAYER_DYNAMIC`(1, 동적 오브젝트 TLAS) |
| `maxDepth` | 음수 = 전 깊이. 0 이상이면 그 깊이까지만 |
| `outNodes` | 노드 버퍼. NULL이면 크기 질의 |
| `nodeCapacity` | `outNodes` 원소 수 |

**반환** — `maxDepth` 안의 전체 노드 수(0 이상). 그 TLAS가 아직 없으면(빌드 전, 해당 종류 오브젝트 없음) 오류가 아니라 `0`. `-1` = 실패(`context` NULL, `layer` 범위 밖은 `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_debug_build_mesh_accel_nodes</code> — 컨텍스트 없이 메시 하나의 BLAS를 지어 노드 박스를 돌려준다</summary>

```c
int st_off_debug_build_mesh_accel_nodes(const STMesh* mesh, int accelKind, int maxDepth, STAccelNode* outNodes, uint32_t nodeCapacity);
```

**용도** — 씬이나 컨텍스트를 만들기 전에, 메시 하나에 대해 가속구조가 어떻게 지어질지 미리 볼 수 있게 합니다(호스트 에디터 미리보기 등). 메시 생성과 같은 입력 검증·같은 빌드 경로라 같은 `accelKind`면 컨텍스트가 짓는 BLAS와 같은 트리입니다. 실시간 `st_rt_debug_build_mesh_accel_nodes`와 결과가 같습니다.

**언제·어떻게** — 매 호출이 BLAS를 새로 짓습니다(메시 크기에 비례). 결과는 호스트가 캐시합니다. 노드 순서·`maxDepth`·크기 질의·잘림 규약과 `STAccelNode` 필드는 `st_off_debug_copy_mesh_accel_nodes` 항목과 같습니다. 스레드: `[any]` — 전역 상태가 없어 어느 스레드에서나 부를 수 있습니다(빌드 비용만큼 시간이 걸립니다).

| 파라미터 | 설명 |
|---|---|
| `mesh` | 삼각형 메시(아래 구조체). NULL 불가 |
| `accelKind` | `st_off_scene_set_accel`의 kind — 0 BinnedSAH / 1 HybridKD / 2 TinyBVH / 3 LBVH / 4 LBVH_Simd. `-1` = 엔진 기본(TinyBVH) |
| `maxDepth` | 음수 = 전 깊이. 0 이상이면 그 깊이까지만 |
| `outNodes` | 노드 버퍼. NULL이면 크기 질의 |
| `nodeCapacity` | `outNodes` 원소 수 |

**구조체** `STMesh`

| 필드 | 설명 |
|---|---|
| `numVertices` | 정점 수 |
| `vertices` | xyz 인터리브 float 배열(`numVertices × 3`개) |
| `numTriangles` | 삼각형 수 |
| `triangles` | 정점 인덱스 배열(`numTriangles × 3`개) |

**반환** — `maxDepth` 안의 전체 노드 수(0 이상) / `-1` = 실패(mesh·배열 NULL, 개수 0 이하, 비유한 정점, 범위 밖 인덱스, 잘못된 kind, 할당 실패). 컨텍스트가 없으므로 last_status는 남지 않습니다.

</details>

<details>
<summary><code>st_off_batch_create</code> — 여러 컨텍스트의 계산·압력 IR 렌더를 병렬 실행할 배치 객체를 만든다</summary>

```c
STOFF_Batch* st_off_batch_create(int32_t workerCount);
```

**용도** — 오프라인 배치 런타임의 시작점입니다. 컨텍스트마다 장면·소스·리스너·옵션을 평소처럼 설정해 둔 뒤 그 컨텍스트들과 압력 IR 렌더 요청을 배치에 한 번 등록하면, 엔진이 자체 **배치 워커** 스레드로 작업마다 `st_off_ir_compute`와 등록된 압력 렌더를 차례로 돌리고 끝난 작업을 폴링으로 돌려줍니다. 많은 장면·위치의 RIR을 대량 생성할 때 호스트가 스레드 풀을 직접 짜지 않아도 됩니다. 결과는 같은 컨텍스트에서 호출 스레드로 `st_off_ir_compute` → `st_off_ir_render_pressure`를 돌린 것과 비트 동일합니다.

**언제·어떻게** — 수명 주기는 다음과 같습니다.

1. `st_off_batch_create` — 배치 객체 생성(이때는 스레드를 만들지 않음)
2. `st_off_batch_add_job` — 컨텍스트 하나 = 작업 하나로 등록
3. `st_off_batch_add_pressure_render` / `st_off_batch_add_pressure_render_mixed` — 작업마다 렌더 요청 등록
4. `st_off_batch_start` — 배치 워커를 띄우고 즉시 반환(배치당 한 번)
5. `st_off_batch_poll`(완료 레코드 수신) · `st_off_batch_wait` · `st_off_batch_remaining` — 진행 관찰
6. `st_off_batch_fetch_pressure` — 완료된 작업의 결과 복사
7. `st_off_batch_release_job` — 다 받은 작업의 결과 메모리 반납
8. `st_off_batch_destroy` — 남은 작업 취소, 워커 join, 해제

배치는 압력 IR만 다룹니다(바이노럴·오디션 렌더는 컨텍스트 함수로 직접 부릅니다). 배치 워커는 컨텍스트 내부 계산 풀 워커와 별개이며 `STThreadType`에 속하지 않습니다. 지원 여부는 `ST_CAP_OFFLINE_BATCH`로 확인합니다. 스레드: `[any]` — 배치 워커는 start에서 만듭니다.

| 파라미터 | 설명 |
|---|---|
| `workerCount` | 배치 워커 수. 0 이하 = 하드웨어 스레드 수. 실제로 띄우는 수는 작업 수를 넘지 않는다 |

**반환** — 배치 핸들. 할당 실패면 NULL.

</details>

<details>
<summary><code>st_off_batch_destroy</code> — 배치를 취소·정리하고 해제한다</summary>

```c
void st_off_batch_destroy(STOFF_Batch* batch);
```

**용도** — 남은 작업을 취소하고 배치 워커를 모두 join한 뒤 배치와 보관 중인 결과를 해제합니다.

**언제·어떻게** — 결과를 다 받은 뒤, 또는 중단하고 싶을 때 부릅니다. 돌아온 뒤에는 배치가 등록된 컨텍스트를 더 참조하지 않습니다. 실행 중인 작업이 취소에 반응해 멈출 때까지 기다리므로 블록됩니다. 스레드: `[any, blocking]` — 어느 스레드에서나 부를 수 있지만 워커 join까지 블록됩니다.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들. NULL이면 아무것도 하지 않음 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_batch_get_last_status</code> — 배치 자체의 마지막 호출 상태 코드를 읽는다</summary>

```c
int st_off_batch_get_last_status(const STOFF_Batch* batch);
```

**용도** — 배치 함수(`add_*`, `start`, `fetch_pressure`, `release_job` 등)가 실패했을 때 원인을 `STStatus`로 돌려줍니다. 작업별 실패(계산·렌더 실패)는 여기가 아니라 `st_off_batch_get_job_error`로 읽습니다.

**언제·어떻게** — 배치 함수가 실패 값(-1 / 0)을 돌려준 직후에 부릅니다. 성공한 호출은 `ST_STATUS_OK`로 지웁니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |

**반환** — `STStatus` 값(`ST_STATUS_OK`, `ST_STATUS_INVALID_ARGUMENT`, `ST_STATUS_UNAVAILABLE`, `ST_STATUS_BUFFER_TOO_SMALL` 등). `batch`가 NULL이면 `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_get_last_error</code> — 배치 자체의 마지막 오류 메시지를 복사한다</summary>

```c
int st_off_batch_get_last_error(const STOFF_Batch* batch, char* outMessage, int32_t capacity);
```

**용도** — `st_off_batch_get_last_status`와 짝인 사람이 읽을 수 있는 오류 메시지(영문)를 돌려줍니다.

**언제·어떻게** — 배치 함수가 실패한 직후 로그용으로 부릅니다. 오류가 없으면 빈 문자열입니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들. NULL이면 빈 문자열을 복사 |
| `outMessage` | 메시지를 받을 버퍼. NUL 종료, `capacity`에 맞춰 자른다 |
| `capacity` | `outMessage` 바이트 수. 1 이상 |

**반환** — `1` = 복사함 / `0` = `outMessage`가 NULL이거나 `capacity`가 0 이하.

</details>

<details>
<summary><code>st_off_batch_worker_count</code> — 배치에 설정된 배치 워커 수를 읽는다</summary>

```c
int32_t st_off_batch_worker_count(const STOFF_Batch* batch);
```

**용도** — `st_off_batch_create`에 넘긴 값을 해석한 워커 수(0 이하를 넘겼으면 하드웨어 스레드 수)를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. `st_off_batch_start`는 이 값과 작업 수 중 작은 쪽만큼 워커를 띄웁니다. 완료 레코드의 `workerIndex`는 0부터 이 값 미만입니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |

**반환** — 워커 수. `batch`가 NULL이면 `0`.

</details>

<details>
<summary><code>st_off_batch_add_job</code> — 컨텍스트 하나를 배치 작업으로 등록한다</summary>

```c
int32_t st_off_batch_add_job(STOFF_Batch* batch, STOFF_Context* context);
```

**용도** — 장면·소스·리스너·옵션을 다 설정한 오프라인 컨텍스트를 작업 하나로 등록합니다. 작업은 배치 워커 하나에서 `st_off_ir_compute`를 돌린 뒤 그 작업에 등록된 압력 렌더를 등록 순서대로 실행합니다.

**언제·어떻게** — `st_off_batch_start` **전에만** 받습니다. 한 배치 안에서 같은 컨텍스트를 두 작업에 등록하지 않습니다. 컨텍스트 포인터는 **빌린 것**입니다: 등록부터 그 작업의 완료 레코드를 `st_off_batch_poll`로 받을 때까지 그 컨텍스트를 파괴하거나 다른 API를 부르면 안 됩니다. 완료 레코드를 받은 뒤에는 배치가 그 컨텍스트를 다시 참조하지 않으므로 배치가 살아 있어도 호스트가 다시 소유합니다 — 원시 IR 조회, 장면·소스 수정, 파괴, 다른 배치 재등록이 모두 되며, 그 작업의 결과는 배치가 따로 보관하므로 `st_off_batch_fetch_pressure`는 그대로 됩니다. 이 동작은 `ST_CAP_OFFLINE_BATCH_CONTEXT_RETURN`으로 확인하며, 이 비트가 없는 라이브러리에서는 배치를 파괴할 때까지 등록한 컨텍스트에 손대지 않습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `context` | 등록할 오프라인 컨텍스트(빌려줌) |

**반환** — 작업 인덱스(0부터, 등록 순서). 실패는 `-1`: `context`가 유효하지 않거나 이미 start한 배치면 배치 상태에 `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_add_pressure_render</code> — 작업에 리스너·소스 쌍 하나의 압력 IR 렌더 요청을 추가한다</summary>

```c
int32_t st_off_batch_add_pressure_render(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, STSourceId source, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**용도** — `st_off_ir_render_pressure`의 배치판입니다. 작업이 compute를 끝낸 뒤 이 요청을 렌더하고, 결과를 배치가 보관했다가 `st_off_batch_fetch_pressure`로 내줍니다.

**언제·어떻게** — `st_off_batch_start` 전에 부릅니다. 한 작업에 여러 요청을 넣을 수 있고 등록 순서대로 실행됩니다. 요청 하나가 실패하면 그 작업은 실패로 끝나고 뒤의 렌더는 실행되지 않습니다. 쌍 존재 여부는 렌더 시점에 검사하므로 미등록 쌍은 작업 실패(`st_off_batch_get_job_error`)로 나타납니다. 요청 필드·길이·정규화 없음 등 결과의 뜻은 `st_off_ir_render_pressure`와 같습니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `jobIndex` | `st_off_batch_add_job`이 돌려준 작업 인덱스 |
| `listener` | 리스너 핸들 |
| `source` | 소스 핸들 |
| `seconds` | IR 길이(초). 유한한 양수 |
| `options` | `st_off_ir_init_pressure_request`로 초기화한 요청(`STOfflinePressureIRRequestOptions`, 필드는 그 항목 참고). 등록 시점에 복사 |

**반환** — 그 작업 안의 렌더 인덱스(0부터, 등록 순서). 실패는 `-1`: 잘못된 요청, 없는 작업 인덱스, 이미 start한 배치면 배치 상태에 `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_add_pressure_render_mixed</code> — 작업에 리스너 하나·소스 여러 개의 혼합 압력 IR 렌더 요청을 추가한다</summary>

```c
int32_t st_off_batch_add_pressure_render_mixed(STOFF_Batch* batch, int32_t jobIndex, STListenerId listener, const STSourceId* sources, int32_t sourceCount, double seconds, const STOfflinePressureIRRequestOptions* options);
```

**용도** — `st_off_ir_render_pressure_mixed`의 배치판입니다. 같은 작업의 솔로 렌더와 **같은 렌더 인덱스 공간**을 쓰며, 결과는 `st_off_batch_fetch_pressure`로 받습니다(`info.sourceId` = -1, `info.sourceCount` = 소스 수).

**언제·어떻게** — `st_off_batch_start` 전에 부릅니다. 소스 목록은 등록 시점에 복사하므로 호출 뒤 배열을 재사용해도 됩니다. 핸들 유효성·중복은 등록 시점에 검사하고, 쌍 존재 여부는 작업이 compute를 끝낸 뒤 렌더 시점에 검사하므로 미등록 쌍은 작업 실패(`st_off_batch_get_job_error`)로 나타납니다. 지원 여부는 `ST_CAP_OFFLINE_PRESSURE_RENDER_MIXED`. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `jobIndex` | 작업 인덱스 |
| `listener` | 리스너 핸들 |
| `sources` | 소스 핸들 배열. 중복 없음 |
| `sourceCount` | 소스 수. `1` 이상 `ST_OFFLINE_PRESSURE_MIXED_MAX_SOURCES`(1024) 이하 |
| `seconds` | IR 길이(초). 유한한 양수 |
| `options` | `st_off_ir_init_pressure_request`로 초기화한 요청 |

**반환** — 그 작업 안의 렌더 인덱스. 실패는 `-1`: 잘못된 요청·소스 수 범위 밖·유효하지 않거나 중복된 핸들·없는 작업 인덱스·이미 start한 배치면 배치 상태에 `ST_STATUS_INVALID_ARGUMENT`.

</details>

<details>
<summary><code>st_off_batch_start</code> — 배치 워커를 띄워 등록된 작업 실행을 시작한다</summary>

```c
int st_off_batch_start(STOFF_Batch* batch);
```

**용도** — 등록을 마감하고 배치 워커를 띄웁니다. 워커는 작업을 하나씩 가져가 compute와 렌더를 돌립니다.

**언제·어떻게** — 작업과 렌더 요청을 모두 등록한 뒤 한 번만 부릅니다. 즉시 돌아오며, 이후 진행은 `st_off_batch_poll` / `st_off_batch_wait` / `st_off_batch_remaining`으로 관찰합니다. start 뒤에는 `add_*`가 거절됩니다. 배치는 다시 start할 수 없으므로 새 일감은 새 배치로 등록합니다. 스레드: `[control]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |

**반환** — `1` = 시작 / `0` = 실패(작업이 없거나 이미 start함 → 배치 상태에 `ST_STATUS_INVALID_ARGUMENT`).

</details>

<details>
<summary><code>st_off_batch_poll</code> — 끝난 작업의 완료 레코드를 꺼낸다</summary>

```c
int32_t st_off_batch_poll(STOFF_Batch* batch, STOfflineBatchCompletion* outCompletions, int32_t capacity);
```

**용도** — 작업이 하나 끝날 때마다 생기는 완료 레코드를 최대 `capacity`개 꺼내(큐에서 비우며) 복사합니다. 완료 레코드를 받는 것이 그 작업 결과를 fetch하고 컨텍스트를 돌려받는 조건입니다.

**언제·어떻게** — start 뒤 아무 스레드에서나 주기적으로 부르거나, `st_off_batch_wait` 뒤에 한꺼번에 비웁니다. 작업마다 레코드는 정확히 한 번 나옵니다. 레코드를 받은 작업에 대해 `st_off_batch_fetch_pressure` → `st_off_batch_release_job`을 부릅니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `outCompletions` | 레코드를 받을 배열. 엔진이 각 레코드의 `structSize`·`apiVersion`을 채운다 |
| `capacity` | `outCompletions` 원소 수. 1 이상 |

**구조체** `STOfflineBatchCompletion`

| 필드 | 설명 |
|---|---|
| `structSize`, `apiVersion` | 엔진이 채우는 버전 스탬프 |
| `jobIndex` | 끝난 작업의 인덱스 |
| `status` | 0 = 성공 / 1 = compute·렌더 실패(메시지는 `st_off_batch_get_job_error`) / 2 = 취소 |
| `renderCount` | 성공한 압력 렌더 수 |
| `workerIndex` | 그 작업을 돈 배치 워커 번호 |
| `computeMicros` | 그 작업의 compute 경과 시간(µs) |
| `renderMicros` | 그 작업의 렌더 경과 시간(µs) |
| `reserved[8]` | 예약 |

**반환** — 복사한 레코드 수(0 이상). 새 완료가 없거나 `batch`·`outCompletions`가 NULL이거나 `capacity`가 0 이하면 `0`.

</details>

<details>
<summary><code>st_off_batch_wait</code> — 모든 작업이 끝날 때까지(또는 시간 초과까지) 기다린다</summary>

```c
int st_off_batch_wait(STOFF_Batch* batch, int32_t timeoutMs);
```

**용도** — 폴링 루프 대신 배치 전체의 완료를 블록해서 기다립니다.

**언제·어떻게** — start 뒤에 부릅니다. 기다림이 끝나도 완료 레코드는 큐에 남아 있으므로 이어서 `st_off_batch_poll`로 비웁니다(레코드를 받아야 fetch·컨텍스트 반환이 됩니다). 스레드: `[any, blocking]` — 어느 스레드에서나 부를 수 있지만 완료 또는 시간 초과까지 블록됩니다.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `timeoutMs` | 최대 대기 시간(ms). 음수 = 무한 대기 |

**반환** — `1` = 모든 작업 완료 / `0` = 시간 초과 또는 `batch` NULL.

</details>

<details>
<summary><code>st_off_batch_remaining</code> — 아직 끝나지 않은 작업 수를 읽는다</summary>

```c
int32_t st_off_batch_remaining(const STOFF_Batch* batch);
```

**용도** — 진행 표시나 완료 판정에 쓰는 남은 작업 수를 돌려줍니다.

**언제·어떻게** — 언제든 부를 수 있습니다. 끝난(성공·실패·취소) 작업은 빠집니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |

**반환** — 끝나지 않은 작업 수. `batch`가 NULL이면 `0`.

</details>

<details>
<summary><code>st_off_batch_cancel</code> — 남은 작업을 취소하고 실행 중인 작업에 취소를 건다</summary>

```c
void st_off_batch_cancel(STOFF_Batch* batch);
```

**용도** — 배치 전체를 중단합니다. 아직 시작하지 않은 작업은 취소(`status` 2)로 끝나고, 실행 중인 작업의 컨텍스트에는 `st_off_ir_request_cancel`과 같은 취소가 걸립니다.

**언제·어떻게** — 어느 스레드에서나 부를 수 있고 기다리지 않고 돌아옵니다. 실행 중이던 작업은 중단 시점에 따라 실패(`status` 1) 또는 취소(`status` 2)로 끝납니다. 이후에도 모든 작업의 완료 레코드가 나오므로 `st_off_batch_poll`로 받은 뒤 컨텍스트를 돌려받습니다. 중단 전에 끝난 작업의 결과는 그대로 fetch할 수 있습니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들. NULL이면 아무것도 하지 않음 |

**반환** — 없음.

</details>

<details>
<summary><code>st_off_batch_fetch_pressure</code> — 완료된 작업의 압력 IR 렌더 결과를 호출자 버퍼로 복사한다</summary>

```c
int32_t st_off_batch_fetch_pressure(STOFF_Batch* batch, int32_t jobIndex, int32_t renderIndex, float* outValues, int32_t capacityValues, STOfflinePressureIRInfo* outInfo);
```

**용도** — 배치가 보관 중인 렌더 결과(값 배열과 메타데이터)를 꺼냅니다. 배치는 결과를 컨텍스트와 별도로 보관하므로 컨텍스트를 바꾸거나 파괴한 뒤에도 꺼낼 수 있습니다.

**언제·어떻게** — 그 작업의 완료 레코드를 `st_off_batch_poll`로 받은 뒤에 부릅니다. `outValues` = NULL이면 값 개수와 `outInfo`만 돌려주므로, 먼저 크기를 얻고 버퍼를 잡아 다시 부릅니다. 값 배치(모노 / `values[band × bandStride + sample]`)와 info 필드는 `st_off_ir_render_pressure`와 같습니다. 다 받은 작업은 `st_off_batch_release_job`으로 반납합니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `jobIndex` | 작업 인덱스 |
| `renderIndex` | 그 작업의 렌더 인덱스(`add_pressure_render*`의 반환값) |
| `outValues` | 결과 버퍼. NULL이면 개수·info만 |
| `capacityValues` | `outValues`의 float 개수 |
| `outInfo` | 결과 메타데이터(`STOfflinePressureIRInfo`, 필드는 `st_off_ir_render_pressure` 항목 참고). NULL 허용. 넘기면 호출자가 `structSize`·`apiVersion`을 채운다 |

**반환** — 값 개수(복사했거나 필요한 float 수). 실패는 `0`: 렌더가 끝나지 않았거나 실패했거나 이미 반납됐으면 `ST_STATUS_UNAVAILABLE`, 버퍼가 모자라면 `ST_STATUS_BUFFER_TOO_SMALL`, `outInfo` 스탬프가 틀리면 `ST_STATUS_INVALID_ARGUMENT`(모두 배치 상태에 남음).

</details>

<details>
<summary><code>st_off_batch_release_job</code> — 완료된 작업의 결과 메모리를 반납한다</summary>

```c
int st_off_batch_release_job(STOFF_Batch* batch, int32_t jobIndex);
```

**용도** — 다 받은 작업의 렌더 결과를 배치에서 지워 메모리를 돌려받습니다. 큰 배치에서 결과를 받는 즉시 반납하면 최대 메모리 사용량이 줄어듭니다.

**언제·어떻게** — 그 작업의 결과를 `st_off_batch_fetch_pressure`로 다 받은 뒤 부릅니다. 반납한 작업의 결과는 더 fetch할 수 없습니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `jobIndex` | 작업 인덱스 |

**반환** — `1` = 반납 / `0` = 작업이 아직 끝나지 않음(배치 상태에 `ST_STATUS_UNAVAILABLE`) 또는 `batch` NULL.

</details>

<details>
<summary><code>st_off_batch_get_job_error</code> — 작업별 실패 메시지를 복사한다</summary>

```c
int st_off_batch_get_job_error(const STOFF_Batch* batch, int32_t jobIndex, char* outMessage, int32_t capacity);
```

**용도** — 완료 레코드의 `status`가 1(실패) 또는 2(취소)인 작업의 사유(영문)를 돌려줍니다. 예: compute 실패·취소, 미등록 쌍 등으로 인한 렌더 실패.

**언제·어떻게** — 완료 레코드를 받은 뒤 부릅니다. 배치 함수 호출 자체의 오류는 `st_off_batch_get_last_status` / `st_off_batch_get_last_error`로 읽습니다. 스레드: `[any]`.

| 파라미터 | 설명 |
|---|---|
| `batch` | 배치 핸들 |
| `jobIndex` | 작업 인덱스 |
| `outMessage` | 메시지를 받을 버퍼. NUL 종료, `capacity`에 맞춰 자른다 |
| `capacity` | `outMessage` 바이트 수. 1 이상 |

**반환** — `1` = 메시지가 있음(복사함) / `0` = 메시지 없음(성공한 작업 등) 또는 인자 오류.

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
- **iOS**: 静的ライブラリひとつ（`libsimplest_static.a`）にリアルタイム・オフラインの両方が入っています。device / simulator を区別してリンクします。
- **Web**: `SimpleSTRealtime.mjs/.wasm` は pthreads ビルドのため、ページと Worker のレスポンスに `Cross-Origin-Opener-Policy: same-origin`、
  `Cross-Origin-Embedder-Policy: require-corp` が必要です。`[control]` 呼び出しはひとつの Worker からのみ行い（メインスレッドでのブロッキング呼び出しは
  `Atomics.wait` の制限で失敗）、オーディオは AudioWorklet と共有リングでやり取りします。TypeScript facade が必要なら [Web SDK](./web.md) を使ってください。
- **ホストサンプルレート**: エンジン内部は 44.1 kHz で、`hostSampleRate` を指定すると入力・出力をエンジンが変換します。

## 次のドキュメント

- [Web SDK](./web.md) · [Unity SDK](./unity.md) · [Unreal Engine SDK](./ue.md)
- [FMOD プラグイン](./fmod.md) · [Wwise プラグイン](./wwise.md)
