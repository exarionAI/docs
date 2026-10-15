---
title: FMOD
description: SimpleSTFmod — FMOD Studio / FMOD Engine 用 SimpleST DSP 外掛的結構、安裝、Studio 創作、遊戲端 C API、UE 與 Unity 整合。
---

# SimpleST FMOD 外掛

**SimpleSTFmod** 是在 FMOD Studio / FMOD Engine 中使用 [SimpleST](../core/simplest.md) 的 DSP 外掛。
它由兩個 DSP 組成：在創作工具中插到事件上的 **SimpleST Source**，以及放在主匯流排上的一個
**SimpleST Listener**；另外還有供遊戲引擎上傳幾何體的 C API。

| 項目 | 值 |
|---|---|
| 外掛版本 | v0.2.0 |
| FMOD | Studio / Engine 2.03 ~ 2.04（plug-in SDK 110 建置 = 2.00 ~ 2.04，204 建置 = 2.04+） |
| 平台 | Windows x64 · macOS · Linux · Android · iOS（靜態）· Web（靜態，FMOD HTML5 pthreads） |
| 發布 | `SimpleST-fmod-release.zip`（各平台 `plugins/` + `install.py`，含 UE 與 Unity 整合程式碼） |
| 商業發布條件 | 需向 FMOD（sales@fmod.com）確認 |

## 結構

![SimpleSTFmod 結構](/img/fmod/structure.png)

```text
[事件主軌]                                          [主匯流排]
 SimpleST Source  ──(單聲道 PCM, write_stream)──▶  SimpleST Listener ──▶ 立體聲（HRTF/panning）
   · 3D Attributes（Studio 自動）→ 音源位置            · st_rt_render_process（全部音源一次渲染）
   · 輸出為靜音（沒有 Listener 時 dry 直通）           · FMOD 聆聽者 0 → SimpleST 聆聽者
                 └──────────── SystemRuntime（每個 FMOD::System 1 個）─┘
                               · SimpleST 上下文 + 控制執行緒
                               · 遊戲端 C API（幾何體上傳等）
```

- SimpleST 是「N 個音源輸入 → 1 個聆聽者混音輸出」的結構，因此不是 Steam Audio 式（逐音源輸出），
  而是 **Resonance / Meta XR Audio 式**（Source 只推入並輸出靜音，由匯流排上的 Listener 一次渲染）。
- 外掛 **從自己的資料夾** 動態綁定 `SimpleSTRealtime`，遊戲端透過外掛 export 的
  `SimpleSTFmod_GetRealtimeProc` 取得 **同一模組** 的 `st_rt_*` — 引擎實例只有一個。
- 渲染器在每個區塊選出「目前正在執行 process 的 Listener」。Studio 為預覽建立的虛設實例
  不會搶走即時的 Listener；若渲染器停止 250 ms，其他 Listener 會接手，若沒有任何 Listener，
  Source 們會回到 dry。
- 引擎音源只為實際有音訊進入的 Source 建立（保護 64 個同時串流）。

## 安裝

### FMOD Studio（創作工具）

![外掛安裝位置](/img/fmod/studio-plugins-folder.png)

1. **對齊版本**：Studio 2.03.x → SDK 110 建置，Studio 2.04.x → SDK 204 建置。204 外掛在
   Studio 2.03 中不會出現。
2. 將發布 `plugins/` 資料夾的內容（`SimpleSTFmod.dll` · `SimpleSTFmod.plugin.js` · `SimpleSTRealtime.dll` ·
   `Resources/HRTF/`）複製到 **Studio 專案的 `Plugins/`**（有利於版本控制）或使用者外掛資料夾，
   然後重新啟動 Studio。
   - Windows: `%localappdata%/FMOD Studio/Plugins`
   - macOS: `~/Library/Preferences/FMOD Studio/Plugins/SimpleST`（`install.py fmod --payload mac --studio "/Applications/FMOD Studio.app"`）
3. Studio 記錄中的 `No FMOD symbols found in dynamic library '.../SimpleSTRealtime.dll'` 無害
   （Studio 會把資料夾中的所有 DLL 當作外掛候選開啟。引擎 DLL 由 SimpleSTFmod 直接載入）。

安裝程式會檢查 manifest 雜湊、平台、Studio/SDK 版本，並將既有檔案備份到掃描器之外。
若沒有 HRTF 資源，會回退到引擎內建的 MIT KEMAR。

### 遊戲執行階段

| 平台 | 連結 | 產物 |
|---|---|---|
| win / mac / linux | 動態 | `SimpleSTFmod.{dll,dylib,so}` + 旁邊的 `SimpleSTRealtime.*` + `Resources/HRTF` |
| android | 動態 | `<abi>/plugins/libSimpleSTFmod.so` + `libSimpleSTRealtime.so`（應用程式函式庫資料夾） |
| ios | 靜態 | `SimpleSTFmod.xcframework`（含引擎物件） |
| web | 靜態 | `libSimpleSTFmod.a`（含引擎）— FMOD HTML5 pthreads 建置 + 以 `-pthread` 連結 |

動態平台上，FMOD 載入外掛後，外掛會在旁邊尋找引擎。靜態平台（iOS/Web）則在載入 bank 之前直接註冊。

```cpp
studioSystem->registerPlugin(FMOD_SimpleST_Source_GetDSPDescription());
studioSystem->registerPlugin(FMOD_SimpleST_Listener_GetDSPDescription());
```

## 在 FMOD Studio 中使用

![主匯流排上的 SimpleST Listener](/img/fmod/studio-master-bus-listener.png)

1. 在主匯流排加入 **Exarion › SimpleST Listener**（每個專案 1 個。若同時有 2 個在運行，
   只有一個會渲染，其餘直通）。
2. 在 3D 事件的主軌 **移除或 bypass FMOD Spatializer**，並加入 **Exarion › SimpleST Source**
   （不移除會造成雙重空間化）。
3. Studio 內沒有遊戲場景，因此在創作工具中運行時會自動鋪設 **8 × 3 × 10 m 的試聽室**
   （以 `SIMPLESTFMOD_AUDITION_ROOM="W,H,D"` 變更大小，`"0"` 則關閉）。在預覽中把音源移到
   房間外面就能聽到牆壁遮蔽。

![3D 事件上的 SimpleST Source](/img/fmod/studio-event-source.png)

### DSP 參數

![SimpleST Source deck UI](/img/fmod/studio-source-params.png)

| DSP | 參數 | 意義 |
|---|---|---|
| SimpleST Source | Gain / Direct / Reflections / Diffraction / Reverb Send (dB) | 輸入位準、逐路徑音量（SimpleST path volume） |
| | Directivity (0 ~ 1) | 0 全指向 ~ 1 心形（以事件 forward 為基準） |
| | Stationary | 不移動的 emitter 提示（建立時套用） |
| | Bypass | 不經過 SimpleST，dry 直通 |
| | 3D Attributes / Overall Gain / Atten Range | FMOD 特殊 data 參數（自動） |
| SimpleST Listener | Wet Level / Dry Level (dB) | SimpleST 渲染 / 匯流排上其他音訊的位準 |
| | HRTF | 開啟為雙耳（耳機），關閉為立體聲 panning |

將 Listener **bypass** 後，Source 們會回到 dry 直通（供 A/B 比較）。DSP 名稱與參數名稱會由 bank
作為識別碼儲存，發布後不要更改。

## 遊戲端 C API

`include/SimpleSTFmod/SimpleSTFmod.h` — 由外掛函式庫 export。請從 **FMOD 載入的那個模組** 綁定。
所有呼叫都在遊戲執行緒上進行，SimpleST `[control]` 呼叫必須在 `SimpleSTFmod_InvokeOnControlThread`
之內進行。

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // 預設。IN_CALLBACK = 在 FMOD 混音器回呼內渲染
cfg.sceneRatio = 0.f;                            // 0 = 1.0（FMOD UE/Unity 整合的單位為公尺）
SimpleSTFmod_Configure(&cfg);                    // 在執行階段啟動之前（建立第一個 SimpleST DSP 之前）

SimpleSTFmod_Status st = { sizeof st };
SimpleSTFmod_GetStatus(SIMPLESTFMOD_SYSTEM_LATEST, &st);   // state READY, boundSources, latency, defaultMaterialId

typedef STMeshId (*mesh_create_fn)(STRT_Context*, const STMesh*, STMaterialId, const int32_t*);
mesh_create_fn meshCreate = (mesh_create_fn)SimpleSTFmod_GetRealtimeProc("st_rt_mesh_create");

SimpleSTFmod_InvokeOnControlThread(SIMPLESTFMOD_SYSTEM_LATEST,
    [](STRT_Context* ctx, void* user) {
        /* st_rt_mesh_create / st_rt_object_create_q / st_rt_build ... */
    }, user, /*wait=*/1);
```

- 系統索引 = `FMOD_DSP_STATE::systemobject`（行程中最先建立的 FMOD::System 為 0）。
  編輯器整合會建立多個 System，因此 `SIMPLESTFMOD_SYSTEM_LATEST(-1)` = 最近的執行階段。
- FMOD 與 SimpleST 的座標系相同（左手系，+Y 向上，+Z 向前）。FMOD UE 整合的 `(UE.Y, UE.Z, UE.X)/100`
  轉換與 SoundTracing UE 外掛的轉換相同。
- 外掛上下文已先註冊了預設材質庫。請以 `defaultMaterialId` 加上 preset index 使用。

## UE · Unity 整合

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

- **Unreal Engine**：`install.py /path/to/Game.uproject --fmod <plugins>` 會將外掛、引擎、HRTF 放進
  `Plugins/FMODStudio/Binaries/<Plat>/`，並在 `DefaultEngine.ini` 加入 `+PluginFiles=SimpleSTFmod`。
  SoundTracing 外掛以 FMOD 模式建置，只上傳幾何體 — [Unreal Engine SDK](./ue.md)。UE 5.7 + FMOD for
  Unreal 2.04 聆聽驗證（2026-10-15）。
- **Unity**：**SoundTrace › FMOD › Install SimpleST FMOD Plug-in...** 選單會執行 DLL/bundle 複製與
  Dynamic Plugins 註冊 — [Unity SDK](./unity.md#與-fmod-搭配使用)。Unity 6000.3 + FMOD for Unity 2.04 E2E 通過。

![Unity FMOD 安裝選單](/img/fmod/unity-install-menu.png)

## 驗證結果（2026-10-01 · FMOD 2.04.00）

| 測試 | 內容 | 結果 |
|---|---|---|
| `core_smoke` | 不含 FMOD 只有執行階段：48 kHz/1024 區塊、右側 80° 噪音、上傳房間 → 殘響、渲染器選出／接手規則 | PASS — ILD +14.6 dB |
| `fmod_host_smoke` | FMOD Core 主機 `loadPlugin` → Source/Listener → WAV，以遊戲 API 建立房間 | PASS |
| `studio_project` | FMOD Studio（fmodstudiocl）辨識兩個 DSP、載入參數、建置 bank | PASS |
| `studio_smoke` | 在 Studio API 執行階段以 3D 播放該 bank，由右向左移動 | PASS — ILD +14.97 → −14.80 dB |

渲染延遲（BUFFERED，48 kHz）：約 1,790 影格（≈37 ms）。FMOD Studio GUI 即時試聽於 2026-10-15
手動驗證。

## 已知限制

- 聆聽者 1 個（無 roll）、同時串流 64 個（超出部分為 dry）、輸出僅立體聲（未暴露揚聲器配置）。
- Source 之後的事件效果／send 收到的是靜音（SimpleST 混音從 Listener 匯流排輸出）。
- `Overall Gain`（虛擬化用的可聽度）為基於距離的估計值。
- FMOD Studio 可能建立多個 System，每個 System 都會產生一個 SimpleST 上下文。
- SDK 110 發布建置必須以官方 FMOD 2.03 SDK 重新建置（FMOD EULA 禁止再發布 SDK）。

## 記錄 / 環境變數

| 變數 | 意義 |
|---|---|
| `SIMPLESTFMOD_LOG_FILE` | 記錄檔路徑 |
| `SIMPLESTFMOD_LOG_STDERR` | stderr 記錄 |
| `SIMPLESTFMOD_RUNTIME_LIBRARY` | 強制指定 SimpleSTRealtime 路徑 |
| `SIMPLESTFMOD_AUDITION_ROOM` | `"W,H,D"` 試聽室（m），`"0"` 關閉 |

在 Windows 上永遠也會經 `OutputDebugString` 輸出。控制執行緒在渲染器狀態每次改變時會留下
`SimpleST Listener rendering` / `no SimpleST Listener rendering`。

## 下一篇

- [Wwise 外掛](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
