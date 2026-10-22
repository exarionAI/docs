---
title: Wwise
description: Sound-tracing（SimpleSTWwise）— Wwise 2025.1 用 SimpleST Object Processor + Metadata 外掛的結構、安裝、創作、單次音效與預熱音源池、遊戲端 C API、UE 與 Unity 整合。
---

# Sound-tracing Wwise 外掛

**Sound-tracing**（原始碼與二進位檔名稱為 `SimpleSTWwise`）是在 Wwise 2025.1 中使用
[SimpleST](../core/simplest.md) 的外掛。它由兩個外掛組成：插在 Audio Objects 匯流排上的
**Sound-tracing Renderer**（Object Processor），以及附加到聲音／Actor-Mixer 的
**Sound-tracing Source Settings**（Metadata）；另外還有供遊戲引擎上傳幾何體的 C API。

| 項目 | 值 |
|---|---|
| 外掛版本 | v0.2.0（SimpleST 2.18.2）。前一版本：v0.1.0（SimpleST 2.12.0，已於 Wwise 2025.1.11 音效引擎 E2E 驗證） |
| Audiokinetic | CompanyID **325**，PluginID 1001（Renderer）· 1002（Source Settings）。Launcher 套件組 `Sound-tracing` |
| Wwise | 2025.1（外掛二進位檔綁定於 SDK 版本） |
| 平台 | Windows（vc170）· macOS · Linux · Android · iOS（靜態）· Web（靜態） |
| 發布 | `SimpleST-wwise-release.zip`（各平台 SDK + Authoring + Launcher 套件 + `install.py`，含 UE 與 Unity 整合程式碼） |
| 合作夥伴核准 | Community Partner Program 第一階段核准（2026-10-08）。最終核准進行中 |

## 結構

![SimpleSTWwise 結構](/img/wwise/structure.png)

```text
 3D 聲音們 ──(Listener Relative Routing)──▶ [SimpleST 匯流排: Bus Configuration = Audio Objects]
   + Sound-tracing Source Settings（Metadata，選用）        Sound-tracing Renderer (Object Processor)
                                                        · 每個物件：單聲道降混 → st_rt_source_write_stream
                                                          位置 = 以匯流排聆聽者為基準的相對座標 → 反變換為世界座標
                                                        · st_rt_render_process 1 次 → 1 個立體聲輸出物件
                                                        · SimpleST 不接收的物件（2D / Bypass / 超過 64 個）
                                                          由渲染器以 Wwise panning 直接混音（"Dry Level"）
                                   SystemRuntime（每個行程 1 個 = Wwise 音效引擎 1 個）
```

- **為什麼是 Object Processor**：匯流排上的所有音訊物件會連同位置 metadata 在同一個回呼中收到，
  因此 push 與 render 發生在同一個 `Execute` 內。與 FMOD 版（Source push + Listener pull）不同，
  沒有區塊順序偏移，voice 也不需要輸出靜音，Wwise 的計量與虛擬化照常運作。也不會取代系統 Audio Device。
- **座標**：Wwise 會將物件位置相對於匯流排聆聽者平移、旋轉後提供。渲染器以匯流排 game object
  （= 聆聽者）的世界姿態還原。Wwise 與 SimpleST 都是左手系、+X 向右、+Y 向上、+Z 向前，
  因此沒有軸轉換（只有 Unreal 整合例外 — 見下文）。
- **voice 與引擎音源**：每個音訊物件（voice）使用一個 SimpleST 音源，但已結束 voice 的引擎音源會保留在
  預熱池中，由下一個 voice 接手 — [單次音效與預熱音源池](#單次音效與預熱音源池)。
- **共用核心**：與 FMOD 外掛共用同一層執行階段，從自己的資料夾動態綁定 `SimpleSTRealtime`，
  遊戲端以 `SimpleSTWwise_GetRealtimeProc` 取得同一模組的 `st_rt_*`。
- **輸出限幅器會關閉**：SimpleST 2.18 在建立後會立即啟用 true-peak 限幅器，但在 Wwise 中由主匯流排
  負責限幅。
- **生命週期**：執行階段在音效引擎 Init 掛勾（靜態註冊）或建立第一個 Renderer 實例時啟動，
  並在 `AK::SoundEngine::Term` 的全域回呼中結束。

## 安裝

### Authoring（創作工具）

![Launcher 套件組安裝](/img/wwise/launcher-bundle.png)

- **Windows**：將發布 `packages/` 中的 Launcher 套件組（`bundle.json` + `*.tar.xz`）以 Audiokinetic Launcher 的
  **Add from directory** 安裝，或將發布資料夾原樣覆寫到 Wwise 安裝資料夾（`SDK/…`、`Authoring/…`）。
  Authoring 外掛為 `Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + 引擎 + HRTF。
- **macOS**：Wwise Authoring 在 Mac 上也使用 **Windows DLL**。安裝位置為
  `/Library/Application Support/Audiokinetic/Wwise <version>/Authoring/x64/Release/bin/Plugins`，
  以 `python3 install.py wwise --payload win --wwise-root "/Applications/Audiokinetic/Wwise_2025.1.11.9262"`
  安裝。既有檔案會保存在 `bin/.simplest-backups`。

### 遊戲執行階段（SoundEngine）

| 平台 | 產物 |
|---|---|
| Windows | `SDK/x64_vc170/<Config>/bin/SimpleSTWwise.dll`（+ `SimpleSTRealtime.dll`、`Resources/HRTF`）、`lib/SimpleSTWwiseFX.lib`、`include/AK/Plugin/SimpleSTWwiseFXFactory.h` |
| macOS / Linux / Android | `libSimpleSTWwise.{dylib,so}` + 同一建置的 `SimpleSTRealtime`（Android 依 ABI） |
| iOS / Web | 含引擎物件的 `libSimpleSTWwiseFX.a` — 在應用程式中 include `AK/Plugin/SimpleSTWwiseFXFactory.h` 註冊兩個外掛 |

Debug 外掛放到 Debug，Release 外掛放到 Profile/Release 組態。靜態連結平台上，
一個 `SimpleSTWwiseFX` 函式庫包含兩個外掛（若 bank 的 `PluginInfo.json` 推測 metadata 外掛的
lib 名稱為 `SimpleSTWwiseMeta`，可能需要別名）。

## 在 Wwise 中使用

![Audio Objects 匯流排](/img/wwise/bus-audio-objects.png)

1. 建立一個匯流排（例如 `SimpleST`），並設定 **Bus Configuration = Audio Objects**。
2. 在該匯流排的 Effects 插入 **Sound-tracing Renderer**。匯流排輸出會成為 1 個立體聲
   （開啟 HRTF 為雙耳 — 耳機）。
3. 將 3D 聲音路由到該匯流排：在 Positioning 中設定 **3D Spatialization = Position（或 + Orientation）**，
   開啟 Listener Relative Routing。**距離衰減（Attenuation）關閉或設為平坦** — SimpleST 自行進行物理
   距離衰減，不關閉會造成雙重衰減（物件緩衝區送來時已經乘上 Wwise 的音量／衰減）。
4. 需要逐音源調整時，在聲音／Actor-Mixer／匯流排上加入 **Metadata › Sound-tracing Source Settings**。
5. 創作工具內沒有遊戲場景，因此在 `Wwise.exe` / `WwiseConsole.exe` 中會自動鋪設 **8 × 3 × 10 m 的試聽室**
   （`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`，`"0"` 則關閉）。

![Positioning 設定](/img/wwise/positioning-attenuation.png)

### 屬性

![Sound-tracing Renderer 屬性](/img/wwise/renderer-properties.png)

| 外掛 | 屬性 | 意義 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | SimpleST 渲染 / 由渲染器直接 panning 的物件位準 |
| | HRTF (Binaural) | 開啟為雙耳，關閉為立體聲 panning |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 輸入位準、逐路徑音量（SimpleST path volume） |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | 以物件 front 為基準的指向性 |
| | Stationary (never moves) | 不移動的 emitter 提示（建立時套用） |
| | Bypass SimpleST (RTPC) | 不經過 SimpleST，由渲染器以 Wwise panning 混音 |

![Source Settings metadata](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID、屬性名稱、AudioEnginePropertyID 會由專案與 bank 儲存，發布後不要更改。

## 單次音效與預熱音源池

從 0.2.0 起加入與 FMOD 外掛 0.3.0 相同的預熱音源池（共用核心）。即使每個聲音都會
產生新 voice，也不會為每個 voice 新建引擎音源，因此省去了新音源 150 ms 的路徑淡入與等待第一個 IR，
短聲音能以正常音量準時聽到。不需要變更 Wwise 專案設定。

- 已結束 voice 已交出的 PCM 會最多再播放 300 ms 後才停止音源（殘響會延續），並將最多 16 個音源以預熱
  狀態保留 2 秒。
- 下一個 voice 會接到最近的預熱音源。0.25 m 以內立即播放，更遠時約 25 ms 後播放。
- 像 Unreal 的 **Wwise AudioLink** 這樣每個聲音都註冊新 game object 的整合，也由這條路徑處理。

量測值（同一位置 16 個 voice 的引擎音源建立數 16 → 4、位準 +15.7 dB、移動時 +19.3 dB 等）請見
[FMOD 外掛](./fmod.md#單次音效與預熱音源池)。環境變數 `SIMPLESTFMOD_WARM_SOURCES=0`（因為是共用核心，
Wwise 版也使用同一名稱）時，會像以前一樣為每個 voice 新建音源（供比較）。

## 遊戲端 C API

`include/SimpleSTWwise/SimpleSTWwise.h` — 由 SoundEngine 函式庫 export。請從 **Wwise 載入的那個模組** 綁定
（Unreal：`FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`，靜態平台則直接呼叫）。
與 FMOD 版契約相同，但沒有系統索引（每個行程 1 個音效引擎）。

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal（cm）。Unity 為 0（=1.0，m）
SimpleSTWwise_Configure(&cfg);                   // 在 AK::SoundEngine::Init 之前
SimpleSTWwise_SetWorldAxes(SIMPLESTWWISE_AXES_UNREAL);   // 只有 Unreal。Unity 為預設（WWISE）

SimpleSTWwise_Status st = { sizeof st };
SimpleSTWwise_GetStatus(&st);                    // 成為 READY 之後再上傳幾何體
void* p = SimpleSTWwise_GetRealtimeProc("st_rt_mesh_create");
SimpleSTWwise_InvokeOnControlThread(
    [](STRT_Context* ctx, void* user) { /* st_rt_mesh_create / object_create / build ... */ }, user, 1);
```

- 執行階段啟動：靜態註冊時在 `SoundEngine::Init` 內，DLL 註冊時在第一個 SimpleST 匯流排播放時。
  在那之前 `GetStatus` 為 0。
- **Unreal 軸**：Wwise for Unreal 2024.1+ 直接傳遞 Unreal 向量（+Z 向上），因此必須呼叫
  `SetWorldAxes(UNREAL)`，渲染器才會轉換為 (Y, Z, X)，與遊戲上傳的幾何體一致。若不呼叫，
  聆聽者與音源會被錯誤的牆壁遮蔽（2026-10-15 修正）。

## UE · Unity 整合

- **Unreal Engine**：`install.py /path/to/Game.uproject --wwise <wwise/SDK>` 會將 `SimpleSTWwise`、`SimpleSTRealtime`、HRTF
  放進 `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin`。SoundTracing 外掛以 Wwise 模式建置，
  設定 `sceneRatio = 0.01` 與 Unreal 軸，只上傳幾何體 — [Unreal Engine SDK](./ue.md)。
  E2E PASS（2026-10-07：物件 6 / 三角形 288 / 路徑 1 → 346 → 1）。
- **Unity**：**SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** 選單會將外掛複製到 Wwise Unity 整合的
  DSP 資料夾。引擎共用 SoundTrace 的 `SimpleSTRealtime`，單位為公尺 —
  [Unity SDK](./unity.md#與-wwise-搭配使用)。

![UE Wwise 安裝結果](/img/wwise/ue-install.png)

## 驗證結果（2026-10-01 · Wwise 2025.1.11.9262）

以 WwiseConsole 建立專案 → 以 WAAPI 設定匯流排、效果、metadata、事件 → 產生 bank → 實際的
`AkSoundEngine`（Profile）以 `RegisterPluginDLL("SimpleSTWwise")` 載入發布用 DLL 進行離線渲染。

| 階段 | 內容 | 結果 |
|---|---|---|
| 創作工具 | WwiseConsole 辨識兩個外掛，參數寫入 bank | PASS |
| A | 噪音、emitter 右側 80°、自由音場 | PASS — ILD +14.64 dB |
| B | Source Settings Bypass → 渲染器以 Wwise panning 混音 | PASS |
| C | 聆聽者移動到 (10,0,5) + 旋轉 180°，emitter 右側 80° | PASS — 相對→世界座標轉換正確 |
| D | 以遊戲 API 上傳房間後播放 1.5 s 音調 | PASS — 殘響尾音 |
| 結束 | `AK::SoundEngine::Term` 回呼結束執行階段 | PASS |

渲染延遲（BUFFERED，48 kHz，512 影格緩衝區）：約 2,100 影格（≈44 ms）。Mac/Linux 已通過實際的 Wwise
註冊，Android 兩個 ABI 建置完成，iOS device/simulator 與 Web 最終連結通過（2026-10-06）。

## 已知限制

- 聆聽者 1 個（SimpleST 的限制）。若同一匯流排為第二個聆聽者再次實例化，該實例會把所有物件
  以 Wwise panning 混音。
- 音訊物件沒有速度，因此沒有 SimpleST Doppler。
- 第一次看到新的音訊物件時，會在音訊執行緒上配置一個小插槽。引擎音源本身由控制執行緒從預熱池
  重複使用或新建。
- Launcher 套件組目前只包含 Authoring + Windows_vc170。Mac、Linux、Android、iOS 套件組與 EULA、標誌準備中。
- Wwise 創作工具 GUI 的手動試聽尚未記錄。

## 記錄 / 環境變數

| 變數 | 意義 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | 記錄檔路徑 |
| `SIMPLESTWWISE_LOG_STDERR` | stderr 記錄 |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | 強制指定 SimpleSTRealtime 路徑 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` 試聽室（m），`"0"` 關閉 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` 時關閉預熱音源池，每個 voice 都新建引擎音源（供比較，共用核心變數） |

渲染器警告也會顯示在 Wwise Capture Log（`PostMonitorMessage`）。

## 下一篇

- [FMOD 外掛](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
