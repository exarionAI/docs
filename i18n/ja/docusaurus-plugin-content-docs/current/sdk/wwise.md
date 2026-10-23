---
title: Wwise
description: Sound-tracing（SimpleSTWwise）— Wwise 2025.1 向け SimpleST Object Processor + Metadata プラグインの構造、インストール、オーサリング、ワンショットとウォーム音源プール、ゲーム側 C API、UE・Unity 統合。
---

# Sound-tracing Wwise プラグイン

**Sound-tracing**（ソース・バイナリ名 `SimpleSTWwise`）は、[SimpleST](../core/simplest.md) を Wwise 2025.1 で
使うためのプラグインです。Audio Objects バスに挿す **Sound-tracing Renderer**（Object Processor）と、
サウンド/アクターミキサーに付ける **Sound-tracing Source Settings**（Metadata）の 2 つのプラグイン、そしてゲームエンジンが
ジオメトリを登録する C API で構成されます。

| 項目 | 値 |
|---|---|
| プラグインバージョン | v0.2.0（SimpleST 2.18.2）。以前のリリース: v0.1.0（SimpleST 2.12.0、Wwise 2025.1.11 サウンドエンジンで E2E 検証） |
| Audiokinetic | CompanyID **325**、PluginID 1001（Renderer）· 1002（Source Settings）。ランチャーバンドル `Sound-tracing` |
| Wwise | 2025.1（プラグインバイナリは SDK バージョンに紐づきます） |
| プラットフォーム | Windows（vc170）· macOS · Linux · Android · iOS（静的）· Web（静的） |
| 配布 | `SimpleST-wwise-release.zip`（プラットフォーム別 SDK + Authoring + ランチャーパッケージ + `install.py`、UE・Unity グルーを含む） |
| パートナー承認 | Community Partner Program 一次承認（2026-10-08）。最終承認は進行中 |

## 構造

![SimpleSTWwise の構造](/img/wwise/structure.png)

```text
 3D サウンド群 ──(Listener Relative Routing)──▶ [SimpleST バス: Bus Configuration = Audio Objects]
   + Sound-tracing Source Settings (メタデータ, 任意)        Sound-tracing Renderer (Object Processor)
                                                        · オブジェクトごと: モノダウンミックス → st_rt_source_write_stream
                                                          位置 = バスリスナー基準の相対座標 → ワールド座標へ逆変換
                                                        · st_rt_render_process 1 回 → ステレオ出力オブジェクト 1 個
                                                        · SimpleST が受け取らないオブジェクト(2D / Bypass / 64 個超過)は
                                                          レンダラーが Wwise パンニングで直接ミックス ("Dry Level")
                                   SystemRuntime (プロセスごとに 1 個 = Wwise サウンドエンジン 1 個)
```

- **なぜ Object Processor か**: バスのすべてのオーディオオブジェクトを位置メタデータと一緒に 1 つのコールバックで受け取るため、
  push と render が同じ `Execute` の中で起こります。FMOD 版（Source push + Listener pull）と違ってブロック順序の
  スキューがなく、ボイスが無音出力をする必要もないため Wwise のメータリング/仮想化がそのまま動作します。システムの Audio
  Device も置き換えません。
- **座標**: Wwise はオブジェクト位置をバスのリスナー基準で移動・回転して渡します。レンダラーがバスの
  ゲームオブジェクト（=リスナー）のワールドポーズで元に戻します。Wwise と SimpleST はどちらも左手系、+X right、+Y up、
  +Z forward なので軸変換はありません（Unreal 統合のみ例外 — 下記）。
- **ボイスとエンジン音源**: オーディオオブジェクト（ボイス）ごとに SimpleST 音源を 1 つ使いますが、終了したボイスのエンジン
  音源はウォームプールに残り、次のボイスが引き継ぎます — [ワンショットとウォーム音源プール](#ワンショットとウォーム音源プール)。
- **コアの共有**: FMOD プラグインと同じランタイム層を共有し、`SimpleSTRealtime` を自分のフォルダーから
  動的にバインドし、ゲーム側は `SimpleSTWwise_GetRealtimeProc` で同じモジュールの `st_rt_*` を受け取ります。
- **出力リミッターは無効にします**: SimpleST 2.18 は生成直後に true-peak リミッターを有効にしますが、Wwise の中ではマスター
  バスがリミッティングを担います。
- **ライフサイクル**: ランタイムはサウンドエンジンの Init フック（静的登録）または最初のレンダラーインスタンス生成時に開始し、
  `AK::SoundEngine::Term` のグローバルコールバックで終了します。

## インストール

### Authoring（オーサリングツール）

![ランチャーバンドルのインストール](/img/wwise/launcher-bundle.png)

- **Windows**: 配布 `packages/` のランチャーバンドル（`bundle.json` + `*.tar.xz`）を Audiokinetic Launcher の
  **Add from directory** でインストールするか、配布フォルダーを Wwise インストールフォルダー（`SDK/…`、`Authoring/…`）にそのまま
  上書きします。Authoring プラグインは `Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + エンジン + HRTF です。
- **macOS**: Wwise Authoring は Mac でも **Windows DLL** を使います。インストール先は
  `/Library/Application Support/Audiokinetic/Wwise <version>/Authoring/x64/Release/bin/Plugins` で、
  `python3 install.py wwise --payload win --wwise-root "/Applications/Audiokinetic/Wwise_2025.1.11.9262"` で
  インストールします。既存ファイルは `bin/.simplest-backups` に保管されます。

### ゲームランタイム（SoundEngine）

| プラットフォーム | 成果物 |
|---|---|
| Windows | `SDK/x64_vc170/<Config>/bin/SimpleSTWwise.dll`（+ `SimpleSTRealtime.dll`、`Resources/HRTF`）、`lib/SimpleSTWwiseFX.lib`、`include/AK/Plugin/SimpleSTWwiseFXFactory.h` |
| macOS / Linux / Android | `libSimpleSTWwise.{dylib,so}` + 同じビルドの `SimpleSTRealtime`（Android は ABI 別） |
| iOS / Web | エンジンオブジェクトを含む `libSimpleSTWwiseFX.a` — アプリで `AK/Plugin/SimpleSTWwiseFXFactory.h` を include して 2 つのプラグインを登録 |

Debug プラグインは Debug、Release プラグインは Profile/Release 構成に配置します。静的リンクのプラットフォームでは
`SimpleSTWwiseFX` ライブラリ 1 つが 2 つのプラグインを両方含みます（バンクの `PluginInfo.json` がメタデータ
プラグインの lib 名を `SimpleSTWwiseMeta` と推定する場合はエイリアスが必要になることがあります）。

## Wwise で使う

![Audio Objects バス](/img/wwise/bus-audio-objects.png)

1. バスを 1 つ（例: `SimpleST`）作り、**Bus Configuration = Audio Objects** に設定します。
2. そのバスの Effects に **Sound-tracing Renderer** を挿入します。バス出力はステレオ 1 本になります
   （HRTF を有効にするとバイノーラル — ヘッドフォン）。
3. 3D サウンドをそのバスへルーティングします: Positioning で **3D Spatialization = Position（または + Orientation）**、
   Listener Relative Routing を有効化。**距離減衰（Attenuation）は無効にするか平坦に** — SimpleST が物理距離減衰を
   直接行うため、無効にしないと二重減衰になります（オブジェクトバッファには Wwise のボリューム/減衰がすでに掛かって届きます）。
4. 音源ごとの調整が必要な場合は、サウンド/アクターミキサー/バスに **Metadata › Sound-tracing Source Settings** を追加します。
5. オーサリングツール内にはゲームシーンがないため、`Wwise.exe` / `WwiseConsole.exe` では **8 × 3 × 10 m のオーディションルーム**が
   自動的に敷かれます（`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`、`"0"` で無効）。

![Positioning 設定](/img/wwise/positioning-attenuation.png)

### プロパティ

![Sound-tracing Renderer のプロパティ](/img/wwise/renderer-properties.png)

| プラグイン | プロパティ | 意味 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | SimpleST レンダー / レンダラーが直接パンニングするオブジェクトのレベル |
| | HRTF (Binaural) | 有効でバイノーラル、無効でステレオパンニング |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 入力レベル、経路ごとのボリューム（SimpleST path volume） |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | オブジェクトの front 基準の指向性 |
| | Stationary (never moves) | 動かないエミッターのヒント（生成時に適用） |
| | Bypass SimpleST (RTPC) | SimpleST を経由せず、レンダラーが Wwise パンニングでミックス |

![Source Settings メタデータ](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID、プロパティ名、AudioEnginePropertyID はプロジェクトとバンクが保存するため、配布後は
変更しません。

## ワンショットとウォーム音源プール

0.2.0 から、FMOD プラグイン 0.3.0 と同じウォーム音源プールが入ります（共通コア）。音ごとに新しい
ボイスが来る場合でもボイスごとにエンジン音源を新しく作らないため、新しい音源の 150 ms の経路フェードインと
最初の IR 待ちがなくなり、短い音が本来の音量で遅れずに聞こえます。Wwise プロジェクトの構成を変更する必要はありません。

- 終了したボイスがすでに渡した PCM を最大 300 ms まで最後まで再生してから音源を停止し（残響は続きます）、最大
  16 個を 2 秒間ウォーム状態で保持します。
- 次のボイスは最も近いウォーム音源に割り当てられます。0.25 m 以内なら即座に、それより遠ければ約 25 ms 後に再生します。
- Unreal の **Wwise AudioLink** のように音ごとに新しいゲームオブジェクトを登録する統合も、この経路で処理されます。

測定値（同じ位置のボイス 16 個のエンジン音源生成 16 → 4、レベル +15.7 dB、移動時 +19.3 dB など）は
[FMOD プラグイン](./fmod.md#ワンショットとウォーム音源プール)にあります。環境変数 `SIMPLESTFMOD_WARM_SOURCES=0`（共通
コアのため Wwise 版も同じ名前）にすると、以前のようにボイスごとに新しい音源を作ります（比較用）。

## ゲーム側 C API

`include/SimpleSTWwise/SimpleSTWwise.h` — SoundEngine ライブラリが export します。**Wwise がロードしたそのモジュール**から
バインドします（Unreal: `FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`、静的プラットフォームは直接
呼び出し）。FMOD 版と同じ契約ですが、システムインデックスはありません（プロセスごとにサウンドエンジン 1 つ）。

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal(cm)。Unity は 0(=1.0, m)
cfg.maxSources = 0;                              // 0 = エンジンのプラットフォーム既定(デスクトップ 128, Android/iOS 48, Web 32)
SimpleSTWwise_Configure(&cfg);                   // AK::SoundEngine::Init の前
SimpleSTWwise_SetWorldAxes(SIMPLESTWWISE_AXES_UNREAL);   // Unreal のみ。Unity は既定(WWISE)

SimpleSTWwise_Status st = { sizeof st };
SimpleSTWwise_GetStatus(&st);                    // READY になってからジオメトリをアップロード
void* p = SimpleSTWwise_GetRealtimeProc("st_rt_mesh_create");
SimpleSTWwise_InvokeOnControlThread(
    [](STRT_Context* ctx, void* user) { /* st_rt_mesh_create / object_create / build ... */ }, user, 1);
```

- ランタイムの開始: 静的登録なら `SoundEngine::Init` の中で、DLL 登録なら最初の SimpleST バスが再生されるとき。
  それまでは `GetStatus` が 0 です。
- **Unreal の軸**: Wwise for Unreal 2024.1+ は Unreal のベクトルをそのまま渡すため（+Z 上）、`SetWorldAxes(UNREAL)` を
  呼ばないとレンダラーが (Y, Z, X) に変換せず、ゲームが登録したジオメトリと合いません。呼ばないとリスナー・音源が
  見当違いの壁に遮蔽されます（2026-10-15 修正）。
- **音源の上限**（SDK リリース 2.18.2-jhj.3）: `SimpleSTWwise_Config.maxSources` はエンジン音源数の上限です（0 = プラットフォーム
  既定）。超えるとエンジンが音源の生成を拒否し、そのボイスは dry で再生されます。構造体の末尾に追加したフィールドなので、以前の短い
  構造体を渡すホストも動作します — [音源メモリ予算](../core/simplest.md#音源メモリ予算)。

### サウンドトレーシングのオンオフ

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // オフ。1 = オン(既定)
```

SDK リリース 2.18.2-jhj.3 で追加されたゲーム側の A/B スイッチです。実行中のランタイムに適用され、コントロールスレッドで
非同期に反映されます。動作は [FMOD 版](./fmod.md#サウンドトレーシングのオンオフ)と同じです。

- **オフにすると** SimpleST レンダラーのバイパス（`st_rt_render_set_sound_tracing_enabled`）がかかり、ウォーム音源プールを空にした後は再び
  満たさず、プラグインが伝搬レーンを起こしません。
- **伝搬レーンが完全に止まるわけではありません。** SimpleST には伝搬の一時停止がないため、音源が残っている間、レーンは
  独自の周期で動き続けます。
- **オンにすると**プラグインのレンダーオプションを再適用します。
- キューに入れば 1、実行中のランタイムがなければ 0 を返します。後から開始されたランタイムはオンの状態で開始するため、ランタイムの
  準備ができた後に状態を再送してください。
- ゲーム API バージョン 1 のままの任意 export です。export を探し、なければスキップしてください。

UE SoundTracing の `SetSoundTracingEnabled` が Wwise モードでこの関数を呼びます — [Unreal Engine SDK](./ue.md)。

## UE · Unity 統合

- **Unreal Engine**: `install.py /path/to/Game.uproject --wwise <wwise/SDK>` が `SimpleSTWwise`・`SimpleSTRealtime`・HRTF を
  `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` に入れます。SoundTracing プラグインは Wwise モードでビルドされ、
  `sceneRatio = 0.01` と Unreal の軸を設定してジオメトリのみを登録します — [Unreal Engine SDK](./ue.md)。
  E2E PASS（2026-10-07: オブジェクト 6 / 三角形 288 / 経路 1 → 346 → 1）。
- **Unity**: **SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** メニューが Wwise Unity 統合の DSP フォルダーに
  プラグインをコピーします。エンジンは SoundTrace の `SimpleSTRealtime` を共有し、単位はメートルです —
  [Unity SDK](./unity.md#wwiseと併用する)。

![UE Wwise インストール結果](/img/wwise/ue-install.png)

## 検証結果（2026-10-01 · Wwise 2025.1.11.9262）

WwiseConsole でプロジェクト生成 → WAAPI でバス・エフェクト・メタデータ・イベントを構成 → バンク生成 → 実際の
`AkSoundEngine`（Profile）が `RegisterPluginDLL("SimpleSTWwise")` で配布用 DLL をロードしてオフラインレンダー。

| 段階 | 内容 | 結果 |
|---|---|---|
| オーサリングツール | WwiseConsole が 2 つのプラグインを認識、バンクにパラメータを記録 | PASS |
| A | ノイズ、エミッター右 80°、自由音場 | PASS — ILD +14.64 dB |
| B | Source Settings の Bypass → レンダラーが Wwise パンニングでミックス | PASS |
| C | リスナー (10,0,5) 移動 + 180° 回転、エミッター右 80° | PASS — 相対→ワールド変換が正確 |
| D | ゲーム API でルームアップロード後にトーン 1.5 s | PASS — 残響テール |
| 終了 | `AK::SoundEngine::Term` コールバックがランタイムを終了 | PASS |

レンダー遅延（BUFFERED、48 kHz、512 フレームバッファ）: 約 2,100 フレーム（≈44 ms）。Mac/Linux は実際の Wwise
登録を通過、Android は 2 つの ABI でビルド、iOS device/simulator と Web は最終リンクを通過（2026-10-06）。

## 既知の制限

- リスナー 1 個（SimpleST の制約）。同じバスが 2 番目のリスナー用に再度インスタンス化されると、そのインスタンスはすべての
  オブジェクトを Wwise パンニングでミックスします。
- オーディオオブジェクトには速度がないため SimpleST の Doppler はありません。
- エンジン音源数はプラットフォームの上限（`maxSources`）を超えません。超過したボイスは dry です。
- 新しいオーディオオブジェクトを初めて見たとき、オーディオスレッドで小さなスロットを 1 つ割り当てます。エンジン音源そのものは
  コントロールスレッドでウォームプールの音源を再利用するか、新しく作ります。
- ランチャーバンドルは現在 Authoring + Windows_vc170 のみを含みます。Mac・Linux・Android・iOS バンドルと EULA・ロゴは準備中です。
- Wwise オーサリングツール GUI での手動オーディションはまだ記録されていません。

## ログ / 環境変数

| 変数 | 意味 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | ログファイルのパス |
| `SIMPLESTWWISE_LOG_STDERR` | stderr ログ |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | SimpleSTRealtime のパスを強制 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` オーディションルーム（m）、`"0"` で無効 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` でウォーム音源プールを無効にし、ボイスごとに新しいエンジン音源（比較用、共通コアの変数） |

レンダラーの警告は Wwise Capture Log にも表示されます（`PostMonitorMessage`）。

## 次のドキュメント

- [FMOD プラグイン](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
