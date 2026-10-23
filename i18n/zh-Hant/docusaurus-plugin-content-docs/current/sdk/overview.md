---
sidebar_position: 1
title: SDK 概覽
description: SimpleST 即時空間聲學引擎的 Web、Unity、Unreal Engine、FMOD、Wwise 整合概覽。
---

# SDK 概覽

SoundTrace SDK 是將 [SimpleST](../core/simplest.md) 引擎包裝起來，讓 Web、遊戲引擎與音訊中介軟體
能夠使用的產品線。所有包裝層都從同一個儲存庫取用同一份引擎 SDK
（`out/dist/<platform>_release/SimpleST`），並以 **SimpleST 2.18.2 / ABI 6** 為基準。
目前的 SDK 發行版為 2.18.2-jhj.3（2026-10-23）。引擎加入了[音源記憶體預算](#音源數上限)，包裝層版本
維持不變。
前一版本：2.12.0 — Web 1.0.0 · Unity 0.3.0 · UE 0.3.0 · FMOD 0.2.0 · Wwise 0.1.0。仍作為舊版產品線持續提供。

## 整合陣容

| 名稱 | 目標 | 形式 | 狀態 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.1.0（vendor ZIP / npm tgz） | 可用 |
| [Unity](./unity.md) | Unity 2022.3 LTS 以上（已於 Unity 6 驗證） | `.unitypackage` 0.4.0 | 可用 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.4.0 + Python 安裝程式 | 可用 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP 外掛 0.3.0 | 可用 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing`（Object Processor + Metadata）外掛 0.2.0 | 可用（Audiokinetic 合作夥伴核准進行中） |
| [Python](./python.md) | 分析與研究 | — | 規劃中 |

若專案中有 FMOD 或 Wwise 外掛，UE 與 Unity 包裝層會自動切換為掛接到該中介軟體 SimpleST 外掛的
**整合模式**（與 Meta XR Audio 相同的分工）。此時遊戲引擎端的元件只負責幾何體、材質與視覺化，
渲染由中介軟體外掛負責。

## 支援平台

| 平台 | 引擎二進位檔 | 備註 |
|---|---|---|
| Windows x64 | `SimpleSTRealtime.dll` | Wwise Authoring 外掛為 Windows DLL |
| macOS | Universal dylib（arm64 + x86_64） | |
| Linux x86_64 | `.so`（glibc 2.34+） | |
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 28+（引擎 `.so` 直接連結 `libaaudio`） |
| iOS | device arm64 · simulator arm64 靜態函式庫 / XCFramework | iOS 15+ |
| Web | pthreads WASM（`SimpleSTRealtime.mjs/.wasm`）+ 單執行緒 Offline | 需要 COOP/COEP |

## 共同使用原則

1. **從品質預設開始** — `Fast` / `Balanced` / `Quality`。它們同時決定聆聽者 guide ray 與反射深度，
   預設值 `Balanced` 等同引擎預設（16×16，深度 8）。
2. **早期反射使用 Hybrid**。所有整合都會在渲染啟動後套用 Hybrid。Objects 模式用於基準聆聽與離線比較。
3. **HRTF 有兩種**：引擎內建的 MIT KEMAR，以及隨附發布的 SADIE II D2 KEMAR。
   揚聲器輸出為 HOA3 解碼（2.0 ~ 7.1），另有輕量的立體聲 panning 回退。
4. **材質以 9 頻段預設**依名稱對應。Unity、Web、UE 預設使用同一套 SoundTrace 遊戲材質 22 種（遊戲預設，
   並非量測資料；名稱、順序與 9 頻段數值相同）；FMOD、Wwise 不公開材質名稱，使用引擎預設材質庫。直接
   編輯僅限於每個頻段都滿足 R+A+T=1 的已驗證數值。
5. 射線解析度、深度、lane 更新週期等進階旋鈕 **只在量測之後** 才調整。
6. 單位為公尺。以 cm 為單位的主機（UE、Wwise for Unreal）由包裝層代入 `sceneRatio = 0.01`。
7. **輸出限幅器由主機主輸出鏈負責**。引擎 2.18.0 在上下文建立後會立即啟用 true-peak 限幅器
   （−1 dBTP，137 樣本延遲），但 UE、Unity、FMOD、Wwise、Web 包裝層依照文件所述的預設值，將限幅器維持在
   **關閉狀態**。啟用方式請參考各 SDK 頁面。

## 音源數上限

從 SDK 發行版 2.18.2-jhj.3 起，引擎會依平台對同時音源數與音源記憶體設定上限 — 桌面
128 個音源 · 記憶體無限制 · 延遲環上限 2.0 s，Android/iOS 48 個音源 · 96 MiB · 1.0 s，Web 32 個音源 · 64 MiB · 0.5 s。
超過上限的音源會被引擎拒絕建立（`ST_STATUS_BUDGET_EXCEEDED`），遊戲不會因此停止。桌面
預設 128 個音源相對於以前（無限制）是 **行為變更**。引擎端的細節請參考
[SimpleST — 音源記憶體預算](../core/simplest.md#音源記憶體預算)。

| SDK | 音源數設定（0 = 平台預設） | 被拒絕的音源 | 延遲環上限 |
|---|---|---|---|
| [Unreal Engine](./ue.md) | Project Settings `Max Sources` | 回退到 dry 路徑 | `Max Delay Seconds`（0 = 平台預設） |
| [Unity](./unity.md) | `SoundTraceRuntime.MaxSources` | 記錄警告並讓 `AudioSource` 為 dry | `SoundTraceListener.maxDelaySeconds`（預設 0 = 平台預設） |
| [Web](./web.md) | `SoundTrace.create` 選項 `maxSources` | 拒絕建立（status 11），既有音源繼續渲染 | `setRenderOptions({ maxDelaySeconds })` |
| [FMOD](./fmod.md) | `SimpleSTFmod_Config.maxSources` | 該 voice 以 dry 播放 | 引擎平台預設 |
| [Wwise](./wwise.md) | `SimpleSTWwise_Config.maxSources` | 該 voice 以 dry 播放 | 引擎平台預設 |

## 從哪裡開始

- 瀏覽器與 Three.js → [Web SDK](./web.md)
- Unity 遊戲 → [Unity SDK](./unity.md)
- Unreal Engine 遊戲 → [Unreal Engine SDK](./ue.md)
- 以 FMOD Studio 創作的專案 → [FMOD 外掛](./fmod.md)
- 以 Wwise 創作的專案 → [Wwise 外掛](./wwise.md)
- 原生 C/C++ → [SimpleST](../core/simplest.md)
- 正在遷移 STCoreV2 整合 → [STCoreV2 → SimpleST](../core/stcorev2.md)
