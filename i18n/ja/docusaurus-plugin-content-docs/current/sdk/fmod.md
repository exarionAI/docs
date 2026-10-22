---
title: FMOD
description: SimpleSTFmod — FMOD Studio / FMOD Engine 向け SimpleST DSP プラグインの構造、インストール、Studio でのオーサリング、ワンショットとウォーム音源プール、ゲーム側 C API、UE・Unity 統合。
---

# SimpleST FMOD プラグイン

**SimpleSTFmod** は、[SimpleST](../core/simplest.md) を FMOD Studio / FMOD Engine で使うための DSP
プラグインです。オーサリングツールでイベントに挿して使う **SimpleST Source** と、マスターバスに 1 つ置く
**SimpleST Listener** の 2 つの DSP、そしてゲームエンジンがジオメトリを登録する C API で構成されます。

| 項目 | 値 |
|---|---|
| プラグインバージョン | v0.3.0（SimpleST 2.18.2）。以前のリリース: v0.2.0（SimpleST 2.12.0） |
| FMOD | Studio / Engine 2.03 ~ 2.04（plug-in SDK 110 ビルド = 2.00 ~ 2.04、204 ビルド = 2.04+） |
| プラットフォーム | Windows x64 · macOS · Linux · Android · iOS（静的）· Web（静的、FMOD HTML5 pthreads） |
| 配布 | `SimpleST-fmod-release.zip`（プラットフォーム別 `plugins/` + `install.py`、UE・Unity グルーを含む） |
| 商用配布条件 | FMOD（sales@fmod.com）への確認が必要 |

## 構造

![SimpleSTFmod の構造](/img/fmod/structure.png)

```text
[イベントマスタートラック]                         [マスターバス]
 SimpleST Source  ──(モノ PCM, write_stream)──▶  SimpleST Listener ──▶ ステレオ(HRTF/パンニング)
   · 3D Attributes(Studio 自動) → 音源位置          · st_rt_render_process (全音源を 1 回レンダー)
   · 出力は無音 (Listener がなければ dry 通過)       · FMOD リスナー 0 → SimpleST リスナー
                 └──────────── SystemRuntime (FMOD::System ごとに 1 個) ─┘
                               · SimpleST コンテキスト + コントロールスレッド
                               · ゲーム側 C API (ジオメトリアップロードなど)
```

- SimpleST は「音源 N 個の入力 → リスナーミックス 1 つの出力」構造なので、Steam Audio 方式（音源ごとの出力）ではなく
  **Resonance / Meta XR Audio 方式**（Source は送り込んで無音、バスの Listener が一度にレンダー）です。
- プラグインが `SimpleSTRealtime` を**自分のフォルダーから**動的にバインドし、ゲーム側はプラグインが export する
  `SimpleSTFmod_GetRealtimeProc` で**同じモジュール**の `st_rt_*` を受け取ります — エンジンインスタンスは 1 つです。
- レンダラーは「今 process が動いている Listener」がブロックごとに選出されます。Studio が作るプレビュー用のダミー
  インスタンスがライブの Listener を横取りすることはなく、レンダラーが 250 ms 停止すると別の Listener が引き継ぎ、
  誰もいなければ Source は dry に戻ります。
- エンジン音源は、実際にオーディオが入ってきた Source にのみ作られます（同時ストリーム 64 個の保護）。終了したボイスの
  エンジン音源はウォームプールに残し、次のボイスが再利用します — [ワンショットとウォーム音源プール](#ワンショットとウォーム音源プール)。
- **出力リミッターは無効にします**: SimpleST 2.18 は生成直後に true-peak リミッター（−1 dBTP、137 サンプル遅延）を有効にしますが、
  FMOD の中ではマスターバスがリミッティングを担います。

## インストール

### FMOD Studio（オーサリングツール）

![プラグインのインストール位置](/img/fmod/studio-plugins-folder.png)

1. **バージョンを合わせる**: Studio 2.03.x → SDK 110 ビルド、Studio 2.04.x → SDK 204 ビルド。204 プラグインは
   Studio 2.03 では読み込まれません。
2. 配布 `plugins/` フォルダーの内容（`SimpleSTFmod.dll` · `SimpleSTFmod.plugin.js` · `SimpleSTRealtime.dll` ·
   `Resources/HRTF/`）を **Studio プロジェクトの `Plugins/`**（バージョン管理に有利）またはユーザープラグインフォルダーに
   コピーし、Studio を再起動します。
   - Windows: `%localappdata%/FMOD Studio/Plugins`
   - macOS: `~/Library/Preferences/FMOD Studio/Plugins/SimpleST`（`install.py fmod --payload mac --studio "/Applications/FMOD Studio.app"`）
3. Studio ログの `No FMOD symbols found in dynamic library '.../SimpleSTRealtime.dll'` は無害です
   （Studio はフォルダー内のすべての DLL をプラグイン候補として開きます。エンジン DLL は SimpleSTFmod が直接ロードします）。

インストーラーは manifest のハッシュ・プラットフォーム・Studio/SDK バージョンを検査し、既存ファイルをスキャナーの外にバックアップします。
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
| SimpleST Source | Gain / Direct / Reflections / Diffraction / Reverb Send (dB) | 入力レベル、経路ごとのボリューム（SimpleST path volume） |
| | Directivity (0 ~ 1) | 0 全指向 ~ 1 カーディオイド（イベントの forward 基準） |
| | Stationary | 動かないエミッターのヒント（生成時に適用） |
| | Bypass | SimpleST を経由せず dry で通過 |
| | 3D Attributes / Overall Gain / Atten Range | FMOD 特殊 data パラメータ（自動） |
| SimpleST Listener | Wet Level / Dry Level (dB) | SimpleST レンダー / バスの他のオーディオのレベル |
| | HRTF | 有効でバイノーラル（ヘッドフォン）、無効でステレオパンニング |

Listener を **bypass** すると Source は dry 通過に戻ります（A/B 比較用）。DSP 名とパラメータ
名はバンクが識別子として保存するため、配布後は変更しません。

## ワンショットとウォーム音源プール

イベントごとに新しいボイスが来る短い音のために、0.3.0 からプラグインがエンジン音源をボイス間で
再利用します。FMOD Studio のイベントや DSP 構成を変更する必要はありません。

- エンジンは**新しい音源**のすべての経路を 150 ms かけてフェードインし、最初の IR を待ちます。0.2.0 はボイスごとに
  エンジン音源を新しく作っていたため 25 ms の音が 15 ~ 20 dB 小さく遅れて聞こえ、ボイスが終わるとすぐに音源を削除して
  ストリームリングに残った末尾が切れていました。
- 0.3.0 は、終了したボイスがすでに送り込んだ PCM を**最大 300 ms まで最後まで再生**してから音源を停止し（残響は
  続きます）、その音源を**最大 16 個、2 秒間**ウォーム状態で保持します。
- 次のボイスは最も近いウォーム音源に割り当てられます。**0.25 m 以内なら即座に**、それより遠ければ約 25 ms 後に再生を
  開始します。2 秒以内に再利用されなかったウォーム音源は解放されます。

コアテスト（FMOD なしで同じランタイム）で測定した 0.2.0 との比較結果です。

| 項目 | 0.2.0（ボイスごとに新しい音源） | 0.3.0（ウォームプール） |
|---|---|---|
| 同じ位置のボイス 16 個（120 ms 間隔）のエンジン音源生成 | 16 | 4 |
| 同じ位置のボイスのレベル | 基準 | +15.7 dB（本来の音量） |
| 移動するボイスのレベル | 基準 | +19.3 dB（本来の音量） |
| ボイス開始 → 最初の音 | 92 ms | 69 ms |
| 350 ms ボイスの聞こえる長さ | 275 ms | 350 ms |

環境変数 `SIMPLESTFMOD_WARM_SOURCES=0` にすると、以前のようにボイスごとに新しい音源を作ります（比較用）。

## ゲーム側 C API

`include/SimpleSTFmod/SimpleSTFmod.h` — プラグインライブラリが export します。**FMOD がロードしたそのモジュール**から
バインドします。すべての呼び出しはゲームスレッドで行い、SimpleST の `[control]` 呼び出しは必ず
`SimpleSTFmod_InvokeOnControlThread` の中で行います。

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // 既定。IN_CALLBACK = FMOD ミキサーコールバック内でレンダー
cfg.sceneRatio = 0.f;                            // 0 = 1.0 (FMOD UE/Unity 統合の単位はメートル)
SimpleSTFmod_Configure(&cfg);                    // ランタイム開始前(最初の SimpleST DSP 生成前)

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
- 座標系は FMOD と SimpleST で同じです（左手系、+Y up、+Z forward）。FMOD UE 統合の `(UE.Y, UE.Z, UE.X)/100`
  変換は SoundTracing UE プラグインの変換と同一です。
- プラグインのコンテキストには既定材質ライブラリが先に登録されています。`defaultMaterialId` に preset
  index を加えて使ってください。

## UE · Unity 統合

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

- **Unreal Engine**: `install.py /path/to/Game.uproject --fmod <plugins>` が `Plugins/FMODStudio/Binaries/<Plat>/` に
  プラグイン・エンジン・HRTF を入れ、`DefaultEngine.ini` に `+PluginFiles=SimpleSTFmod` を追加します。SoundTracing
  プラグインは FMOD モードでビルドされ、ジオメトリのみを登録します — [Unreal Engine SDK](./ue.md)。UE 5.7 + FMOD for
  Unreal 2.04 で聴取検証（2026-10-15）。
- **Unity**: **SoundTrace › FMOD › Install SimpleST FMOD Plug-in...** メニューが DLL/bundle のコピーと Dynamic Plugins
  登録を行います — [Unity SDK](./unity.md#fmodと併用する)。Unity 6000.3 + FMOD for Unity 2.04 で E2E 通過。

![Unity FMOD インストールメニュー](/img/fmod/unity-install-menu.png)

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

- リスナー 1 個（roll なし）、同時ストリーム 64 個（超過分は dry）、出力はステレオのみ（スピーカーレイアウト未公開）。
- Source の後ろのイベントエフェクト/センドは無音を受け取ります（SimpleST のミックスは Listener バスから出ます）。
- `Overall Gain`（仮想化用の可聴度）は距離に基づく推定値です。
- FMOD Studio は System を複数作ることがあり、System ごとに SimpleST コンテキストができます。
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

## 次のドキュメント

- [Wwise プラグイン](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
