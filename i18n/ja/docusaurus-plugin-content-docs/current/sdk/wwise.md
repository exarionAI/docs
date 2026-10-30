---
title: Wwise
description: Sound-Tracing SDK for Wwise（SimpleSTWwise）— Wwise 2025.1 向け Object Processor + Metadata プラグインの構造、インストール、オーサリング、ワンショットとウォーム音源プール、ゲーム側 C API、UE・Unity 統合、EQ。
---

# Sound-Tracing SDK for Wwise

**Sound-Tracing SDK for Wwise**（ランチャーのプラグイン名 `Sound-tracing`、バイナリ名 `SimpleSTWwise`）は、
Sound-Tracing SDK を Wwise 2025.1 で使うためのプラグインです。Audio Objects バスに挿す **Sound-tracing Renderer**（Object Processor）と、
サウンド/アクターミキサーに付ける **Sound-tracing Source Settings**（Metadata）の 2 つのプラグイン、そしてゲームエンジンが
ジオメトリを登録する C API で構成されます。

| 項目 | 値 |
|---|---|
| Wwise | 2025.1（プラグインバイナリは SDK バージョンに紐づきます） |
| Audiokinetic | CompanyID **325**、PluginID 1001（Renderer）· 1002（Source Settings）。ランチャーのプラグイン名 `Sound-tracing` |
| プラットフォーム | Windows（vc170）· macOS · Linux · Android · iOS（静的）· Web（静的） |
| ダウンロード | Audiokinetic Launcher ストア |

## 構造

![SimpleSTWwise の構造](/img/wwise/structure.png)

- **なぜ Object Processor か**: バスのすべてのオーディオオブジェクトを位置メタデータと一緒に 1 つのコールバックで受け取るため、
  push と render が同じ `Execute` の中で起こります。FMOD 版（Source push + Listener pull）と違ってブロック順序の
  スキューがなく、ボイスが無音出力をする必要もないため Wwise のメータリング/仮想化がそのまま動作します。システムの Audio
  Device も置き換えません。
- **座標**: Wwise はオブジェクト位置をバスのリスナー基準で移動・回転して渡します。レンダラーがバスの
  ゲームオブジェクト（=リスナー）のワールドポーズで元に戻します。Wwise と Sound-Tracing SDK はどちらも左手系、+X right、+Y up、
  +Z forward なので軸変換はありません（Unreal 統合のみ例外 — 下記）。
- **ボイスとエンジン音源**: オーディオオブジェクト（ボイス）ごとに Sound-Tracing SDK 音源を 1 つ使いますが、終了したボイスのエンジン
  音源はウォームプールに残り、次のボイスが引き継ぎます — [ワンショットとウォーム音源プール](#ワンショットとウォーム音源プール)。
- **コアの共有**: FMOD プラグインと同じランタイム層を共有し、`SimpleSTRealtime` を自分のフォルダーから
  動的にバインドし、ゲーム側は `SimpleSTWwise_GetRealtimeProc` で同じモジュールの `st_rt_*` を受け取ります。
- **出力リミッターは無効にします**: Wwise の中ではマスターバスがリミッティングを担います。
- **等ラウドネス補正も無効にします**: 音色とレベルは Wwise のミックスが担います。
- **リスナーの向き**: バスリスナーの front・top 方向をクォータニオンで渡し、頭部の傾き（roll）まで反映します。
- **ライフサイクル**: ランタイムはサウンドエンジンの Init フック（静的登録）または最初のレンダラーインスタンス生成時に開始し、
  `AK::SoundEngine::Term` のグローバルコールバックで終了します。

## インストール

### Authoring（オーサリングツール）

![ランチャーバンドルのインストール](/img/wwise/launcher-bundle.png)

Audiokinetic Launcher ストアで **Sound-Tracing SDK for Wwise**（プラグイン名 `Sound-tracing`）を入手した後、
Launcher › **Plug-ins** で使用する Wwise バージョンにインストールします（Windows・macOS 共通）。プラグインには Authoring プラグインと
Windows（vc170）・macOS のサウンドエンジンプラグインが入っています。Authoring プラグインは Mac でも **Windows DLL**
（`Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + エンジン + HRTF）です。

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

1. バスを 1 つ（例: `SoundTracing`）作り、**Bus Configuration = Audio Objects** に設定します。
2. そのバスの Effects に **Sound-tracing Renderer** を挿入します。バス出力はステレオ 1 本になります
   （HRTF を有効にするとバイノーラル — ヘッドフォン）。
3. 3D サウンドをそのバスへルーティングします: Positioning で **3D Spatialization = Position（または + Orientation）**、
   Listener Relative Routing を有効化。**距離減衰（Attenuation）は無効にするか平坦に** — Sound-Tracing SDK が物理距離減衰を
   直接行うため、無効にしないと二重減衰になります（オブジェクトバッファには Wwise のボリューム/減衰がすでに掛かって届きます）。
4. 音源ごとの調整が必要な場合は、サウンド/アクターミキサー/バスに **Metadata › Sound-tracing Source Settings** を追加します。
5. オーサリングツール内にはゲームシーンがないため、`Wwise.exe` / `WwiseConsole.exe` では **8 × 3 × 10 m のオーディションルーム**が
   自動的に敷かれます（`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`、`"0"` で無効）。

![Positioning 設定](/img/wwise/positioning-attenuation.png)

### プロパティ

![Sound-tracing Renderer のプロパティ](/img/wwise/renderer-properties.png)

| プラグイン | プロパティ | 意味 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | Sound-Tracing SDK レンダー / レンダラーが直接パンニングするオブジェクトのレベル |
| | HRTF (Binaural) | 有効でバイノーラル、無効でステレオパンニング |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 入力レベル、経路ごとのボリューム（Sound-Tracing SDK path volume） |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | オブジェクトの front 基準の指向性 |
| | Stationary (never moves) | 動かないエミッターのヒント（生成時に適用） |
| | Bypass SimpleST (RTPC) | Sound-Tracing SDK を経由せず、レンダラーが Wwise パンニングでミックス |
| 両方（EQ グループ） | EQ / EQ Preamp (dB, RTPC) | 4 バンド EQ の有効化・プリアンプ — [EQ](#eq) |
| | Band n Type / Band n Frequency (Hz, RTPC) / Band n Gain (dB, RTPC) / Band n Q (RTPC) (n = 1 ~ 4) | バンドごとのフィルター種類・周波数・ゲイン・Q |

![Source Settings メタデータ](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID、プロパティ名、AudioEnginePropertyID はプロジェクトとバンクが保存するため、配布後は
変更しません。

## ワンショットとウォーム音源プール

FMOD プラグインと同じウォーム音源プールが入ります（共通コア）。音ごとに新しい
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

- ランタイムの開始: 静的登録なら `SoundEngine::Init` の中で、DLL 登録なら最初の Sound-Tracing SDK バスが再生されるとき。
  それまでは `GetStatus` が 0 です。
- **Unreal の軸**: Wwise for Unreal 2024.1+ は Unreal のベクトルをそのまま渡すため（+Z 上）、`SetWorldAxes(UNREAL)` を
  呼ばないとレンダラーが (Y, Z, X) に変換せず、ゲームが登録したジオメトリと合いません。呼ばないとリスナー・音源が
  見当違いの壁に遮蔽されます。
- **音源の上限**: `SimpleSTWwise_Config.maxSources` はエンジン音源数の上限です（0 = プラットフォーム
  既定）。超えるとエンジンが音源の生成を拒否し、そのボイスは dry で再生されます。構造体の末尾に追加したフィールドなので、以前の短い
  構造体を渡すホストも動作します。

### サウンドトレーシングのオンオフ

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // オフ。1 = オン(既定)
```

ゲーム側の A/B スイッチです。実行中のランタイムに適用され、コントロールスレッドで
非同期に反映されます。動作は [FMOD 版](./fmod.md#サウンドトレーシングのオンオフ)と同じです。

- **オフにすると** Sound-Tracing SDK レンダラーのバイパス（`st_rt_render_set_sound_tracing_enabled`）がかかり、ウォーム音源プールを空にした後は再び
  満たさず、プラグインが伝搬レーンを起こしません。
- **伝搬レーンが完全に止まるわけではありません。** エンジンには伝搬の一時停止がないため、音源が残っている間、レーンは
  独自の周期で動き続けます。
- **オンにすると**プラグインのレンダーオプションを再適用します。
- キューに入れば 1、実行中のランタイムがなければ 0 を返します。後から開始されたランタイムはオンの状態で開始するため、ランタイムの
  準備ができた後に状態を再送してください。
- ゲーム API バージョン 1 のままの任意 export です。export を探し、なければスキップしてください。

UE SoundTracing の `SetSoundTracingEnabled` が Wwise モードでこの関数を呼びます — [Unreal Engine SDK](./ue.md)。

## UE · Unity 統合

- **Unreal Engine**: ランチャーに Sound-tracing をインストールしてから Launcher › Unreal Engine › **Modify Wwise in Project** を実行すると、
  ランチャーが `SimpleSTWwise`・`SimpleSTRealtime`・HRTF を `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin` にコピーします。SoundTracing プラグインは Wwise モードでビルドされ、
  `sceneRatio = 0.01` と Unreal の軸を設定してジオメトリのみを登録します — [Unreal Engine SDK](./ue.md)。
- **Unity**: ランチャーに Sound-tracing をインストールしてから Launcher › Unity › **Integrate/Modify Wwise in Project** を実行すると、
  ランチャーがプラグインを Wwise Unity 統合の DSP フォルダーに入れます。エンジンは SoundTrace の `SimpleSTRealtime` を共有し、単位はメートルです —
  [Unity SDK](./unity.md#wwiseと併用する)。

![ランチャーの Modify Wwise in Project](/img/wwise/launcher-modify-project.png)

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

- リスナー 1 個（エンジンの制約）。同じバスが 2 番目のリスナー用に再度インスタンス化されると、そのインスタンスはすべての
  オブジェクトを Wwise パンニングでミックスします。
- オーディオオブジェクトには速度がないため Doppler はありません。
- EQ はプラグインあたり 4 バンド固定です（UE・Unity・Web は最大 16 バンド）。
- エンジン音源数はプラットフォームの上限（`maxSources`）を超えません。超過したボイスは dry です。
- 新しいオーディオオブジェクトを初めて見たとき、オーディオスレッドで小さなスロットを 1 つ割り当てます。エンジン音源そのものは
  コントロールスレッドでウォームプールの音源を再利用するか、新しく作ります。

## ログ / 環境変数

| 変数 | 意味 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | ログファイルのパス |
| `SIMPLESTWWISE_LOG_STDERR` | stderr ログ |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | SimpleSTRealtime のパスを強制 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` オーディションルーム（m）、`"0"` で無効 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` でウォーム音源プールを無効にし、ボイスごとに新しいエンジン音源（比較用、共通コアの変数） |

レンダラーの警告は Wwise Capture Log にも表示されます（`PostMonitorMessage`）。

## EQ

Sound-Tracing SDK のパラメトリック EQ を 2 か所でかけます。

- **ソース EQ** — 音源信号そのものに、エンジンのバンド分割の前でかけます。その音源の直接音・反射・回折・残響がすべて同じ音色になります。
- **出力 EQ** — Sound-Tracing SDK のミックス全体に、レンダー末尾（マスターゲインの前）でかけます。

フィルターの種類は Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の 6 種（カットは 12 dB/oct 固定）、
範囲は周波数 20 ~ 20,000 Hz、ゲイン ±24 dB（Peaking・シェルフのみ）、Q 0.1 ~ 30（シェルフは 3 まで）、プリアンプ −48 ~ +12 dB です。
既定は無効で、無効の間はエンジンを呼び出さないため、出力は EQ がないときと同じです。変更された値だけを送り、エンジンが
20 ms のクロスフェードで切り替えます。

2 つのプラグインに同じ 4 バンドの EQ プロパティグループがあります（FMOD 版と同じ共通コア）。

| プラグイン | プロパティグループ | かける場所 |
|---|---|---|
| Sound-tracing Source Settings | `Source EQ`、`Source EQ Band 1 ~ 4` | **ソース EQ** — オブジェクトのオーディオがエンジンに入る前 |
| Sound-tracing Renderer | `Output EQ`、`Output EQ Band 1 ~ 4` | **出力 EQ** — レンダーされたミックス |

- `EQ` は有効/無効、`EQ Preamp` はバンド前のゲイン（−48 ~ +12 dB）です。
- `Band n Type` は Off · Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の列挙プロパティのため RTPC では変更できません。
  Preamp · `Band n Frequency` · `Band n Gain` · `Band n Q` は RTPC に対応します。
- EQ プロパティの AudioEnginePropertyID は Source Settings 8 ~ 25、Renderer 3 ~ 20 で、バンクには既存フィールドの後ろに同じ順序で
  付きます。ウォームプールで再利用するエンジン音源は、前のボイスの EQ を解除するか新しい EQ に置き換えてから開始します。

## 次のドキュメント

- [FMOD プラグイン](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
