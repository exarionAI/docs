---
title: Wwise
description: Sound-tracing（SimpleSTWwise）— Wwise 2025.1 向け SimpleST Object Processor + Metadata プラグインの構造、インストール、オーサリング、ゲーム側 C API、UE・Unity 統合。
---

# Sound-tracing Wwise プラグイン

**Sound-tracing**（ソース・バイナリ名 `SimpleSTWwise`）は、[SimpleST](../core/simplest.md) を Wwise 2025.1 で
使うためのプラグインです。Audio Objects バスに挿す **Sound-tracing Renderer**（Object Processor）と、
サウンド/アクターミキサーに付ける **Sound-tracing Source Settings**（Metadata）の 2 つのプラグイン、そしてゲームエンジンが
ジオメトリを登録する C API で構成されます。

| 項目 | 値 |
|---|---|
| プラグインバージョン | v0.1.0（Wwise 2025.1.11 サウンドエンジンで E2E 検証） |
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
- **コアの共有**: FMOD プラグインと同じランタイム層を共有し、`SimpleSTRealtime` を自分のフォルダーから
  動的にバインドし、ゲーム側は `SimpleSTWwise_GetRealtimeProc` で同じモジュールの `st_rt_*` を受け取ります。
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

## ゲーム側 C API

`include/SimpleSTWwise/SimpleSTWwise.h` — SoundEngine ライブラリが export します。**Wwise がロードしたそのモジュール**から
バインドします（Unreal: `FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`、静的プラットフォームは直接
呼び出し）。FMOD 版と同じ契約ですが、システムインデックスはありません（プロセスごとにサウンドエンジン 1 つ）。

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal(cm)。Unity は 0(=1.0, m)
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
- 新しいオーディオオブジェクトを初めて見たとき、エンジン音源の生成がオーディオスレッドで割り当てを行います（スロットプールは予定）。
- ランチャーバンドルは現在 Authoring + Windows_vc170 のみを含みます。Mac・Linux・Android・iOS バンドルと EULA・ロゴは準備中です。
- Wwise オーサリングツール GUI での手動オーディションはまだ記録されていません。

## ログ / 環境変数

| 変数 | 意味 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | ログファイルのパス |
| `SIMPLESTWWISE_LOG_STDERR` | stderr ログ |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | SimpleSTRealtime のパスを強制 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` オーディションルーム（m）、`"0"` で無効 |

レンダラーの警告は Wwise Capture Log にも表示されます（`PostMonitorMessage`）。

## 次のドキュメント

- [FMOD プラグイン](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
