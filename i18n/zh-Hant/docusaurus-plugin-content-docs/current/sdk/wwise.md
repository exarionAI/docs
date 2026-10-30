---
title: Wwise
description: Sound-Tracing SDK for Wwise（SimpleSTWwise）— Wwise 2025.1 用 Object Processor + Metadata 外掛的結構、安裝、創作、單次音效與預熱音源池、遊戲端 C API、UE 與 Unity 整合、EQ。
---

# Sound-Tracing SDK for Wwise

**Sound-Tracing SDK for Wwise**（Launcher 外掛名稱 `Sound-tracing`，二進位檔名稱 `SimpleSTWwise`）是在
Wwise 2025.1 中使用 Sound-Tracing SDK 的外掛。它由兩個外掛組成：插在 Audio Objects 匯流排上的 **Sound-tracing Renderer**（Object Processor），
以及附加到聲音／Actor-Mixer 的 **Sound-tracing Source Settings**（Metadata）；另外還有供遊戲引擎
上傳幾何體的 C API。

| 項目 | 值 |
|---|---|
| Wwise | 2025.1（外掛二進位檔綁定於 SDK 版本） |
| Audiokinetic | CompanyID **325**，PluginID 1001（Renderer）· 1002（Source Settings）。Launcher 外掛名稱 `Sound-tracing` |
| 平台 | Windows（vc170）· macOS · Linux · Android · iOS（靜態）· Web（靜態） |
| 下載 | Audiokinetic Launcher 商店 |

## 結構

![SimpleSTWwise 結構](/img/wwise/structure.png)

- **為什麼是 Object Processor**：匯流排上的所有音訊物件會連同位置 metadata 在同一個回呼中收到，
  因此 push 與 render 發生在同一個 `Execute` 內。與 FMOD 版（Source push + Listener pull）不同，
  沒有區塊順序偏移，voice 也不需要輸出靜音，Wwise 的計量與虛擬化照常運作。也不會取代系統 Audio
  Device。
- **座標**：Wwise 會將物件位置相對於匯流排聆聽者平移、旋轉後提供。渲染器以匯流排
  game object（= 聆聽者）的世界姿態還原。Wwise 與 Sound-Tracing SDK 都是左手系、+X 向右、+Y 向上、
  +Z 向前，因此沒有軸轉換（只有 Unreal 整合例外 — 見下文）。
- **voice 與引擎音源**：每個音訊物件（voice）使用一個 Sound-Tracing SDK 音源，但已結束 voice 的引擎
  音源會保留在預熱池中，由下一個 voice 接手 — [單次音效與預熱音源池](#單次音效與預熱音源池)。
- **共用核心**：與 FMOD 外掛共用同一層執行階段，從自己的資料夾動態綁定 `SimpleSTRealtime`，
  遊戲端以 `SimpleSTWwise_GetRealtimeProc` 取得同一模組的 `st_rt_*`。
- **輸出限幅器會關閉**：在 Wwise 中由主匯流排負責限幅。
- **等響度補償也會關閉**：音色與音量由 Wwise 混音負責。
- **聆聽者方向**：將匯流排聆聽者的 front 與 top 方向以四元數傳入，連頭部傾斜（roll）也會反映。
- **生命週期**：執行階段在音效引擎 Init 掛勾（靜態註冊）或建立第一個 Renderer 實例時啟動，
  並在 `AK::SoundEngine::Term` 的全域回呼中結束。

## 安裝

### Authoring（創作工具）

![Launcher 套件組安裝](/img/wwise/launcher-bundle.png)

從 Audiokinetic Launcher 商店取得 **Sound-Tracing SDK for Wwise**（外掛名稱 `Sound-tracing`）後，
在 Launcher › **Plug-ins** 安裝到所使用的 Wwise 版本（Windows、macOS 通用）。外掛含 Authoring 外掛以及
Windows（vc170）、macOS 音效引擎外掛。Authoring 外掛在 Mac 上也是 **Windows DLL**
（`Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + 引擎 + HRTF）。

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

1. 建立一個匯流排（例如 `SoundTracing`），並設定 **Bus Configuration = Audio Objects**。
2. 在該匯流排的 Effects 插入 **Sound-tracing Renderer**。匯流排輸出會成為 1 個立體聲
   （開啟 HRTF 為雙耳 — 耳機）。
3. 將 3D 聲音路由到該匯流排：在 Positioning 中設定 **3D Spatialization = Position（或 + Orientation）**，
   開啟 Listener Relative Routing。**距離衰減（Attenuation）關閉或設為平坦** — Sound-Tracing SDK 自行進行物理
   距離衰減，不關閉會造成雙重衰減（物件緩衝區送來時已經乘上 Wwise 的音量／衰減）。
4. 需要逐音源調整時，在聲音／Actor-Mixer／匯流排上加入 **Metadata › Sound-tracing Source Settings**。
5. 創作工具內沒有遊戲場景，因此在 `Wwise.exe` / `WwiseConsole.exe` 中會自動鋪設 **8 × 3 × 10 m 的試聽室**
   （`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`，`"0"` 則關閉）。

![Positioning 設定](/img/wwise/positioning-attenuation.png)

### 屬性

![Sound-tracing Renderer 屬性](/img/wwise/renderer-properties.png)

| 外掛 | 屬性 | 意義 |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | Sound-Tracing SDK 渲染 / 由渲染器直接 panning 的物件位準 |
| | HRTF (Binaural) | 開啟為雙耳，關閉為立體聲 panning |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | 輸入位準、逐路徑音量（Sound-Tracing SDK path volume） |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | 以物件 front 為基準的指向性 |
| | Stationary (never moves) | 不移動的 emitter 提示（建立時套用） |
| | Bypass SimpleST (RTPC) | 不經過 Sound-Tracing SDK，由渲染器以 Wwise panning 混音 |
| 兩者皆有（EQ 群組） | EQ / EQ Preamp (dB, RTPC) | 4 頻段 EQ 開關與前級增益 — [EQ](#eq) |
| | Band n Type / Band n Frequency (Hz, RTPC) / Band n Gain (dB, RTPC) / Band n Q (RTPC) (n = 1 ~ 4) | 各頻段的濾波器種類、頻率、增益、Q |

![Source Settings metadata](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID、屬性名稱、AudioEnginePropertyID 會由專案與 bank 儲存，發布後
不要更改。

## 單次音效與預熱音源池

內含與 FMOD 外掛相同的預熱音源池（共用核心）。即使每個聲音都會
產生新 voice，也不會為每個 voice 新建引擎音源，因此省去了新音源 150 ms 的路徑淡入與等待第一個 IR，
短聲音能以正常音量準時聽到。不需要變更 Wwise 專案設定。

- 已結束 voice 已交出的 PCM 會最多再播放 300 ms 後才停止音源（殘響會延續），並將最多
  16 個音源以預熱狀態保留 2 秒。
- 下一個 voice 會接到最近的預熱音源。0.25 m 以內立即播放，更遠時約 25 ms 後播放。
- 像 Unreal 的 **Wwise AudioLink** 這樣每個聲音都註冊新 game object 的整合，也由這條路徑處理。

量測值（同一位置 16 個 voice 的引擎音源建立數 16 → 4、位準 +15.7 dB、移動時 +19.3 dB 等）請見
[FMOD 外掛](./fmod.md#單次音效與預熱音源池)。環境變數 `SIMPLESTFMOD_WARM_SOURCES=0`（因為是共用核心，
Wwise 版也使用同一名稱）時，會像以前一樣為每個 voice 新建音源（供比較）。

## 遊戲端 C API

`include/SimpleSTWwise/SimpleSTWwise.h` — 由 SoundEngine 函式庫 export。請從 **Wwise 載入的那個模組**
綁定（Unreal：`FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`，靜態平台則直接
呼叫）。與 FMOD 版契約相同，但沒有系統索引（每個行程 1 個音效引擎）。

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal（cm）。Unity 為 0（=1.0，m）
cfg.maxSources = 0;                              // 0 = 引擎平台預設（桌面 128，Android/iOS 48，Web 32）
SimpleSTWwise_Configure(&cfg);                   // 在 AK::SoundEngine::Init 之前
SimpleSTWwise_SetWorldAxes(SIMPLESTWWISE_AXES_UNREAL);   // 只有 Unreal。Unity 為預設（WWISE）

SimpleSTWwise_Status st = { sizeof st };
SimpleSTWwise_GetStatus(&st);                    // 成為 READY 之後再上傳幾何體
void* p = SimpleSTWwise_GetRealtimeProc("st_rt_mesh_create");
SimpleSTWwise_InvokeOnControlThread(
    [](STRT_Context* ctx, void* user) { /* st_rt_mesh_create / object_create / build ... */ }, user, 1);
```

- 執行階段啟動：靜態註冊時在 `SoundEngine::Init` 內，DLL 註冊時在第一個 Sound-Tracing SDK 匯流排播放時。
  在那之前 `GetStatus` 為 0。
- **Unreal 軸**：Wwise for Unreal 2024.1+ 直接傳遞 Unreal 向量（+Z 向上），因此必須呼叫
  `SetWorldAxes(UNREAL)`，渲染器才會轉換為 (Y, Z, X)，與遊戲上傳的幾何體一致。若不呼叫，
  聆聽者與音源會被錯誤的牆壁遮蔽。
- **音源上限**：`SimpleSTWwise_Config.maxSources` 是引擎音源數上限（0 = 平台
  預設）。超過時引擎會拒絕建立音源，該 voice 以 dry 播放。這是附加在結構末端的欄位，因此傳入舊版較短
  結構的主機也能運作。

### 開啟與關閉 Sound Tracing

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // 關閉。1 = 開啟（預設）
```

這是遊戲端的 A/B 開關。套用於執行中的執行階段，並在控制執行緒上以非同步方式
反映。行為與 [FMOD 版](./fmod.md#開啟與關閉-sound-tracing) 相同。

- **關閉時** 會啟用 Sound-Tracing SDK 渲染器旁路（`st_rt_render_set_sound_tracing_enabled`），清空預熱音源池後不再
  重新填入，外掛也不會喚醒傳播 lane。
- **傳播 lane 不會完全停止。** 引擎沒有傳播暫停功能，只要還有音源，lane 就會依自身週期
  持續運轉。
- **開啟時** 會重新套用外掛的渲染選項。
- 排入佇列時回傳 1，沒有執行中的執行階段時回傳 0。之後才啟動的執行階段會以開啟狀態啟動，因此請在
  執行階段就緒後再次送出狀態。
- 這是遊戲 API 版本 1 維持不變的選用 export。請先查找 export，沒有時就略過。

UE SoundTracing 的 `SetSoundTracingEnabled` 在 Wwise 模式中會呼叫此函式 — [Unreal Engine SDK](./ue.md)。

## UE · Unity 整合

- **Unreal Engine**：在 Launcher 安裝 Sound-tracing 後執行 Launcher › Unreal Engine › **Modify Wwise in Project**，
  Launcher 會將 `SimpleSTWwise`、`SimpleSTRealtime`、HRTF 複製到 `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin`。SoundTracing 外掛以 Wwise 模式建置，
  設定 `sceneRatio = 0.01` 與 Unreal 軸，只上傳幾何體 — [Unreal Engine SDK](./ue.md)。
- **Unity**：在 Launcher 安裝 Sound-tracing 後執行 Launcher › Unity › **Integrate/Modify Wwise in Project**，
  Launcher 會將外掛放入 Wwise Unity 整合的 DSP 資料夾。引擎共用 SoundTrace 的 `SimpleSTRealtime`，單位為公尺 —
  [Unity SDK](./unity.md#與-wwise-搭配使用)。

![Launcher 的 Modify Wwise in Project](/img/wwise/launcher-modify-project.png)

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

- 聆聽者 1 個（引擎的限制）。若同一匯流排為第二個聆聽者再次實例化，該實例會把所有物件
  以 Wwise panning 混音。
- 音訊物件沒有速度，因此沒有 Doppler。
- EQ 每個外掛固定 4 頻段（UE、Unity、Web 最多 16 頻段）。
- 引擎音源數不會超過平台上限（`maxSources`）。超出的 voice 為 dry。
- 第一次看到新的音訊物件時，會在音訊執行緒上配置一個小插槽。引擎音源本身由控制執行緒從預熱池
  重複使用或新建。

## 記錄 / 環境變數

| 變數 | 意義 |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | 記錄檔路徑 |
| `SIMPLESTWWISE_LOG_STDERR` | stderr 記錄 |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | 強制指定 SimpleSTRealtime 路徑 |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` 試聽室（m），`"0"` 關閉 |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` 時關閉預熱音源池，每個 voice 都新建引擎音源（供比較，共用核心變數） |

渲染器警告也會顯示在 Wwise Capture Log（`PostMonitorMessage`）。

## EQ

在兩個位置套用 Sound-Tracing SDK 的參數式 EQ。

- **音源 EQ** — 在引擎分頻之前作用於音源訊號本身。該音源的直達音、反射、繞射、殘響全部帶有相同音色。
- **輸出 EQ** — 在渲染末端（主增益之前）作用於整個 Sound-Tracing SDK 混音。

濾波器種類為 Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 共 6 種（切除固定 12 dB/oct），
範圍為頻率 20 ~ 20,000 Hz，增益 ±24 dB（僅 Peaking 與 shelf），Q 0.1 ~ 30（shelf 最多 3），前級增益 −48 ~ +12 dB。
預設為關閉，關閉時不會呼叫引擎，因此輸出與沒有 EQ 時相同。只送出變更的值，引擎以
20 ms 交叉淡化切換。

兩個外掛都有相同的 4 頻段 EQ 屬性群組（與 FMOD 版相同的共用核心）。

| 外掛 | 屬性群組 | 作用處 |
|---|---|---|
| Sound-tracing Source Settings | `Source EQ`、`Source EQ Band 1 ~ 4` | **音源 EQ** — 物件音訊進入引擎之前 |
| Sound-tracing Renderer | `Output EQ`、`Output EQ Band 1 ~ 4` | **輸出 EQ** — 渲染後的混音 |

- `EQ` 為開關，`EQ Preamp` 為頻段前的增益（−48 ~ +12 dB）。
- `Band n Type` 為 Off · Peaking · Low Shelf · High Shelf · High Cut · Low Cut · Notch 的列舉屬性，無法以 RTPC 變更。
  Preamp · `Band n Frequency` · `Band n Gain` · `Band n Q` 支援 RTPC。
- EQ 屬性的 AudioEnginePropertyID 為 Source Settings 8 ~ 25、Renderer 3 ~ 20，在 bank 中依相同順序接在既有欄位之後。
  從預熱池重複使用的引擎音源會先清除前一個 voice 的 EQ 或換成新的 EQ 後再開始。

## 下一篇

- [FMOD 外掛](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
