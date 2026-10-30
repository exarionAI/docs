---
title: FMOD
description: Sound-Tracing SDK for FMOD（SimpleSTFmod）— FMOD Studio / FMOD Engine 向け DSP プラグインの構造、インストール、Studio でのオーサリング、ワンショットとウォーム音源プール、ゲーム側 C API、UE・Unity 統合、EQ。
---

# Sound-Tracing SDK for FMOD

**Sound-Tracing SDK for FMOD**（バイナリ名 `SimpleSTFmod`）は、Sound-Tracing SDK を
FMOD Studio / FMOD Engine で使うための DSP プラグインです。オーサリングツールでイベントに挿して使う **SimpleST Source** と、マスターバスに 1 つ置く
**SimpleST Listener** の 2 つの DSP、そしてゲームエンジンがジオメトリを登録する C API で構成されます。

| 項目 | 値 |
|---|---|
| FMOD | Studio / Engine 2.03 ~ 2.04（plug-in SDK 110 ビルド = 2.00 ~ 2.04、204 ビルド = 2.04+） |
| プラットフォーム | Windows x64 · macOS · Linux · Android · iOS（静的）· Web（静的、FMOD HTML5 pthreads） |
| 製品のダウンロード | [contact@exarion.ai](mailto:contact@exarion.ai) までお問い合わせください |

## 構造

![SimpleSTFmod の構造](/img/fmod/structure.png)

- エンジンは「音源 N 個の入力 → リスナーミックス 1 つの出力」構造なので、Source は送り込んで無音、バスの Listener が一度にレンダーします。
- プラグインが `SimpleSTRealtime` を**自分のフォルダーから**動的にバインドし、ゲーム側はプラグインが export する
  `SimpleSTFmod_GetRealtimeProc` で**同じモジュール**の `st_rt_*` を受け取ります — エンジンインスタンスは 1 つです。
- レンダラーは「今 process が動いている Listener」がブロックごとに選出されます。Studio が作るプレビュー用のダミー
  インスタンスがライブの Listener を横取りすることはなく、レンダラーが 250 ms 停止すると別の Listener が引き継ぎ、
  誰もいなければ Source は dry に戻ります。
- エンジン音源は、実際にオーディオが入ってきた Source にのみ作られます（同時ストリーム 64 個の保護）。終了したボイスの
  エンジン音源はウォームプールに残し、次のボイスが再利用します — [ワンショットとウォーム音源プール](#ワンショットとウォーム音源プール)。
- **出力リミッターは無効にします**: FMOD の中ではマスターバスがリミッティングを担います。
- **等ラウドネス補正も無効にします**: 音色とレベルは FMOD のミックスが担います。
- **リスナーの向き**: FMOD リスナーの forward・up をクォータニオンで渡し、頭部の傾き（roll）まで反映します。

## インストール

### FMOD Studio（オーサリングツール）

![プラグインのインストール位置](/img/fmod/studio-plugins-folder.png)

1. **バージョンを合わせる**: Studio 2.03.x → SDK 110 ビルド、Studio 2.04.x → SDK 204 ビルド。204 プラグインは
   Studio 2.03 では読み込まれません。
2. 配布 `plugins/` フォルダーの内容（`SimpleSTFmod.dll` · `SimpleSTFmod.plugin.js` · `SimpleSTRealtime.dll` ·
   `Resources/HRTF/`）を **Studio プロジェクトの `Plugins/`**（バージョン管理に有利）またはユーザープラグインフォルダーに
   コピーし、Studio を再起動します。
   - Windows: `%localappdata%/FMOD Studio/Plugins`
   - macOS: `~/Library/Preferences/FMOD Studio/Plugins/SimpleST`
3. Studio ログの `No FMOD symbols found in dynamic library '.../SimpleSTRealtime.dll'` は無害です
   （Studio はフォルダー内のすべての DLL をプラグイン候補として開きます。エンジン DLL は SimpleSTFmod が直接ロードします）。

HRTF リソースがない場合はエンジン内蔵の MIT KEMAR にフォールバックします。

### ゲームランタイム

| プラットフォーム | リンク | 成果物 |
|---|---|---|
| win / mac / linux | 動的 | `SimpleSTFmod.{dll,dylib,so}` + 隣に `SimpleSTRealtime.*` + `Resources/HRTF` |
| android | 動的 | `<abi>/plugins/libSimpleSTFmod.so` + `libSimpleSTRealtime.so`（アプリのライブラリフォルダー） |
| ios | 静的 | `SimpleSTFmod.xcframework`（エンジンオブジェクトを含む） |
| web | 静的 | `libSimpleSTFmod.a`（エンジンを含む）— FMOD HTML5 pthreads ビルド + `-pthread` でリンク |

動的プラットフォームでは、FMOD がプラグインをロードするとプラグインが隣のエンジンを探します。静的プラットフォーム（iOS/Web）では
バンクロード前に直接登録します。

```cpp
studioSystem->registerPlugin(FMOD_SimpleST_Source_GetDSPDescription());
studioSystem->registerPlugin(FMOD_SimpleST_Listener_GetDSPDescription());
```

## FMOD Studio で使う

![マスターバスの SimpleST Listener](/img/fmod/studio-master-bus-listener.png)

1. マスターバスに **Exarion › SimpleST Listener** を追加します（プロジェクトごとに 1 個。同時に 2 個動くと 1 つだけ
   レンダーし、残りは通過）。
2. 3D イベントのマスタートラックで **FMOD Spatializer を削除するか bypass** し、**Exarion › SimpleST Source** を
   追加します（削除しないと二重空間化）。
3. Studio 内にはゲームシーンがないため、オーサリングツールで動かす際は **8 × 3 × 10 m のオーディションルーム**が自動的に敷かれます
   （`SIMPLESTFMOD_AUDITION_ROOM="W,H,D"` でサイズ変更、`"0"` で無効）。プレビューで音源を部屋の外へ
   動かすと壁の遮蔽を聴けます。

![3D イベントの SimpleST Source](/img/fmod/studio-event-source.png)

### DSP パラメータ

![SimpleST Source デッキ UI](/img/fmod/studio-source-params.png)

| DSP | パラメータ | 意味 |
|---|---|---|
| SimpleST Source | Gain / Direct / Reflections / Diffraction / Reverb Send (dB) | 入力レベル、経路ごとのボリューム（Sound-Tracing SDK path volume） |
| | Directivity (0 ~ 1) | 0 全指向 ~ 1 カーディオイド（イベントの forward 基準） |
| | Stationary | 動かないエミッターのヒント（生成時に適用） |
| | Bypass | Sound-Tracing SDK を経由せず dry で通過 |
| | 3D Attributes / Overall Gain / Atten Range | FMOD 特殊 data パラメータ（自動） |
| SimpleST Listener | Wet Level / Dry Level (dB) | Sound-Tracing SDK レンダー / バスの他のオーディオのレベル |
| | HRTF | 有効でバイノーラル（ヘッドフォン）、無効でステレオパンニング |
| 両方（EQ ブロック） | EQ / EQ Preamp (dB) | 4 バンド EQ の有効化・プリアンプ — [EQ](#eq) |
| | EQn Type / EQn Freq (Hz) / EQn Gain (dB) / EQn Q (n = 1 ~ 4) | バンドごとのフィルター種類・周波数・ゲイン・Q |

Listener を **bypass** すると Source は dry 通過に戻ります（A/B 比較用）。DSP 名とパラメータ
名はバンクが識別子として保存するため、配布後は変更しません。

## ワンショットとウォーム音源プール

イベントごとに新しいボイスが来る短い音のために、プラグインがエンジン音源をボイス間で
再利用します。FMOD Studio のイベントや DSP 構成を変更する必要はありません。

- エンジンは**新しい音源**のすべての経路を 150 ms かけてフェードインし、最初の IR を待つため、ボイスごとにエンジン音源を
  新しく作ると短い音が小さく遅れて聞こえます。
- プラグインは、終了したボイスがすでに送り込んだ PCM を**最大 300 ms まで最後まで再生**してから音源を停止し（残響は
  続きます）、その音源を**最大 16 個、2 秒間**ウォーム状態で保持します。
- 次のボイスは最も近いウォーム音源に割り当てられます。**0.25 m 以内なら即座に**、それより遠ければ約 25 ms 後に再生を
  開始します。2 秒以内に再利用されなかったウォーム音源は解放されます。

コアテスト（FMOD なしで同じランタイム）で測定した結果です。

| 項目 | ボイスごとに新しい音源 | ウォームプール |
|---|---|---|
| 同じ位置のボイス 16 個（120 ms 間隔）のエンジン音源生成 | 16 | 4 |
| 同じ位置のボイスのレベル | 基準 | +15.7 dB（本来の音量） |
| 移動するボイスのレベル | 基準 | +19.3 dB（本来の音量） |
| ボイス開始 → 最初の音 | 92 ms | 69 ms |
| 350 ms ボイスの聞こえる長さ | 275 ms | 350 ms |

環境変数 `SIMPLESTFMOD_WARM_SOURCES=0` にすると、以前のようにボイスごとに新しい音源を作ります（比較用）。

## ゲーム側 C API

`include/SimpleSTFmod/SimpleSTFmod.h` — プラグインライブラリが export します。**FMOD がロードしたそのモジュール**から
バインドします。すべての呼び出しはゲームスレッドで行い、Sound-Tracing SDK の `[control]` 呼び出しは必ず
`SimpleSTFmod_InvokeOnControlThread` の中で行います。

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // 既定。IN_CALLBACK = FMOD ミキサーコールバック内でレンダー
cfg.sceneRatio = 0.f;                            // 0 = 1.0 (FMOD UE/Unity 統合の単位はメートル)
cfg.maxSources = 0;                              // 0 = エンジンのプラットフォーム既定(デスクトップ 128, Android/iOS 48, Web 32)
SimpleSTFmod_Configure(&cfg);                    // ランタイム開始前(最初の Sound-Tracing SDK DSP 生成前)

SimpleSTFmod_Status st = { sizeof st };
SimpleSTFmod_GetStatus(SIMPLESTFMOD_SYSTEM_LATEST, &st);   // state READY, boundSources, latency, defaultMaterialId

typedef STMeshId (*mesh_create_fn)(STRT_Context*, const STMesh*, STMaterialId, const int32_t*);
mesh_create_fn meshCreate = (mesh_create_fn)SimpleSTFmod_GetRealtimeProc("st_rt_mesh_create");

SimpleSTFmod_InvokeOnControlThread(SIMPLESTFMOD_SYSTEM_LATEST,
    [](STRT_Context* ctx, void* user) {
        /* st_rt_mesh_create / st_rt_object_create_q / st_rt_build ... */
    }, user, /*wait=*/1);
```

- システムインデックス = `FMOD_DSP_STATE::systemobject`（プロセスで最初に作られた FMOD::System が 0）。
  エディター統合は System を複数作るため、`SIMPLESTFMOD_SYSTEM_LATEST(-1)` = 最新のランタイム。
- 座標系は FMOD と Sound-Tracing SDK で同じです（左手系、+Y up、+Z forward）。FMOD UE 統合の `(UE.Y, UE.Z, UE.X)/100`
  変換は SoundTracing UE プラグインの変換と同一です。
- プラグインのコンテキストには既定材質ライブラリが先に登録されています。`defaultMaterialId` に preset
  index を加えて使ってください。
- **音源の上限**: `SimpleSTFmod_Config.maxSources` はエンジン音源数の上限です（0 = プラットフォーム
  既定）。超えるとエンジンが音源の生成を拒否し、そのボイスは dry で再生されます。構造体の末尾に追加したフィールドなので、以前の短い
  構造体を渡すホストも動作します。

### サウンドトレーシングのオンオフ

```c
SimpleSTFmod_SetSoundTracingEnabled(SIMPLESTFMOD_SYSTEM_LATEST, 0);   // オフ。1 = オン(既定)
```

ゲーム側の A/B スイッチです。1 つのランタイム（`systemIndex < 0` = 最新）に適用され、
コントロールスレッドで非同期に反映されます。

- **オフにすると** Sound-Tracing SDK レンダラーのバイパス（`st_rt_render_set_sound_tracing_enabled`）がかかり、ウォーム音源プールを空にした後は再び
  満たさず、プラグインが伝搬レーンを起こしません。
- **伝搬レーンが完全に止まるわけではありません。** エンジンには伝搬の一時停止がないため、音源が残っている間、レーンは
  独自の周期で動き続けます。
- **オンにすると**プラグインのレンダーオプションを再適用します。
- キューに入れば 1、ランタイムがなければ 0 を返します。後から開始されたランタイムはオンの状態で開始します。
- ゲーム API バージョン 1 のままの任意 export です。export を探し、なければスキップしてください。

UE SoundTracing の `SetSoundTracingEnabled` が FMOD モードでこの関数を呼びます — [Unreal Engine SDK](./ue.md)。

## UE · Unity 統合

- **Unreal Engine**: 配布物の `Unreal/SoundTracing`（FMOD エディション）をプロジェクトの `Plugins/` に入れてビルドすると、
  ビルドがプラグイン・エンジン・HRTF を `Plugins/FMODStudio/Binaries/<Plat>/` に入れ、`DefaultEngine.ini` に
  `+PluginFiles=SimpleSTFmod` を追加します。SoundTracing プラグインは FMOD モードでビルドされ、ジオメトリのみを登録します — [Unreal Engine SDK](./ue.md)。
- **Unity**: FMOD エディションパッケージ（`SoundTrace-SimpleST-FMOD-release.unitypackage`）をドラッグ＆ドロップすると、
  エディターのロード時に SoundTrace が DLL/bundle を FMOD プラグインフォルダーにコピーし、Dynamic Plugins に登録します —
  [Unity SDK](./unity.md#fmodと併用する)。

![FMOD エディションパッケージのインポート](/img/fmod/unity-fmod-edition-import.png)

## 検証結果（2026-10-01 · FMOD 2.04.00）

| テスト | 内容 | 結果 |
|---|---|---|
| `core_smoke` | FMOD なしでランタイムのみ: 48 kHz/1024 ブロック、右 80° のノイズ、ルームアップロード → 残響、レンダラー選出/引き継ぎ規則 | PASS — ILD +14.6 dB |
| `fmod_host_smoke` | FMOD Core ホストの `loadPlugin` → Source/Listener → WAV、ゲーム API でルーム | PASS |
| `studio_project` | FMOD Studio（fmodstudiocl）が 2 つの DSP を認識、パラメータロード、バンクビルド | PASS |
| `studio_smoke` | そのバンクを Studio API ランタイムで 3D 再生、右→左へ移動 | PASS — ILD +14.97 → −14.80 dB |

レンダー遅延（BUFFERED、48 kHz）: 約 1,790 フレーム（≈37 ms）。FMOD Studio GUI のリアルタイムオーディションは 2026-10-15 に
手動検証。

## 既知の制限

- リスナー 1 個、同時ストリーム 64 個（超過分は dry）、出力はステレオのみ（スピーカーレイアウト未公開）。
- EQ は DSP あたり 4 バンド固定です（UE・Unity・Web は最大 16 バンド）。
- エンジン音源数はプラットフォームの上限（`maxSources`）を超えません。超過したボイスは dry です。
- Source の後ろのイベントエフェクト/センドは無音を受け取ります（Sound-Tracing SDK のミックスは Listener バスから出ます）。
- `Overall Gain`（仮想化用の可聴度）は距離に基づく推定値です。
- FMOD Studio は System を複数作ることがあり、System ごとに Sound-Tracing SDK コンテキストができます。
- SDK 110 の配布ビルドは公式 FMOD 2.03 SDK で再ビルドする必要があります（FMOD EULA 上、SDK の再配布は禁止）。

## ログ / 環境変数

| 変数 | 意味 |
|---|---|
| `SIMPLESTFMOD_LOG_FILE` | ログファイルのパス |
| `SIMPLESTFMOD_LOG_STDERR` | stderr ログ |
| `SIMPLESTFMOD_RUNTIME_LIBRARY` | SimpleSTRealtime のパスを強制 |
| `SIMPLESTFMOD_AUDITION_ROOM` | `"W,H,D"` オーディションルーム（m）、`"0"` で無効 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` でウォーム音源プールを無効にし、ボイスごとに新しいエンジン音源（比較用） |

Windows では常に `OutputDebugString` にも出力されます。コントロールスレッドはレンダラーの状態が変わるたびに
`SimpleST Listener rendering` / `no SimpleST Listener rendering` を記録します。

## EQ

Sound-Tracing SDK のパラメトリック EQ を 2 か所でかけます。

- **ソース EQ** — 音源信号そのものに、エンジンのバンド分割の前でかけます。その音源の直接音・反射・回折・残響がすべて同じ音色になります。
- **出力 EQ** — Sound-Tracing SDK のミックス全体に、レンダー末尾（マスターゲインの前）でかけます。

フィルターの種類は Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の 6 種（カットは 12 dB/oct 固定）、
範囲は周波数 20 ~ 20,000 Hz、ゲイン ±24 dB（Peaking・シェルフのみ）、Q 0.1 ~ 30（シェルフは 3 まで）、プリアンプ −48 ~ +12 dB です。
既定は無効で、無効の間はエンジンを呼び出さないため、出力は EQ がないときと同じです。変更された値だけを送り、エンジンが
20 ms のクロスフェードで切り替えます。

2 つの DSP に同じ 4 バンドの EQ パラメータブロックがあります。

| DSP | かける場所 |
|---|---|
| SimpleST Source | **ソース EQ** — エンジンに入るイベント信号 |
| SimpleST Listener | **出力 EQ** — レンダーされたミックス、Wet Level の前 |

- `EQ` は有効/無効、`EQ Preamp` はバンド前のゲイン（−48 ~ +12 dB、ブーストするときは負の値で余裕を確保します）です。
- `EQn Type`（n = 1 ~ 4）は Off · Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch の整数パラメータ（0 = Off）で、
  `EQn Freq (Hz)` · `EQn Gain (dB)` · `EQn Q` は実数パラメータです。
- 4 バンドは低域カット・低域シェルフ・高域シェルフ・高域カットを一度にかけられる数です。
- Listener が複数ある場合は、レンダラーに選出されたインスタンスの EQ が使われます。ウォームプールで再利用するエンジン音源は、前のボイスの EQ を
  解除するか新しい EQ に置き換えてから開始します。

## 次のドキュメント

- [Wwise プラグイン](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
