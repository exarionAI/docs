---
sidebar_position: 1
title: SDK 概覽
description: SimpleST 即時空間聲學引擎的 Web、Unity、Unreal Engine、FMOD、Wwise 整合概覽。
---

# SDK 概覽

SoundTrace SDK 是將 [SimpleST](../core/simplest.md) 引擎包裝起來，讓 Web、遊戲引擎與音訊中介軟體
能夠使用的產品線。所有包裝層都從同一個儲存庫取用同一份引擎 SDK
（`out/dist/<platform>_release/SimpleST`），並以 **SimpleST 2.12.0 / ABI 6** 為基準。

## 整合陣容

| 名稱 | 目標 | 形式 | 狀態 |
|---|---|---|---|
| [Web](./web.md) | TypeScript · WebAssembly · Web Audio | `@exarionai/soundtrace.js` 1.0.0（vendor ZIP / npm tgz） | 可用 |
| [Unity](./unity.md) | Unity 2022.3 LTS 以上（已於 Unity 6 驗證） | `.unitypackage` 0.3.0 | 可用 |
| [Unreal Engine](./ue.md) | UE 5.6 / 5.7 | `Plugins/SoundTracing` 0.3.0 + Python 安裝程式 | 可用 |
| [FMOD](./fmod.md) | FMOD Studio / Engine 2.03 ~ 2.04 | `SimpleSTFmod` DSP 外掛 | 可用 |
| [Wwise](./wwise.md) | Wwise 2025.1 | `Sound-tracing`（Object Processor + Metadata）外掛 | 可用（Audiokinetic 合作夥伴核准進行中） |
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
| Android | arm64-v8a · armeabi-v7a · x86_64 `.so` | API 24+ |
| iOS | device arm64 · simulator arm64/x86_64 靜態函式庫 / XCFramework | iOS 15+ |
| Web | pthreads WASM（`SimpleSTRealtime.mjs/.wasm`）+ 單執行緒 Offline | 需要 COOP/COEP |

## 共同使用原則

1. **從品質預設開始** — `Fast` / `Balanced` / `Quality`。它們同時決定聆聽者 guide ray 與反射深度，
   預設值 `Balanced` 等同引擎預設（16×16，深度 8）。
2. **早期反射使用 Hybrid**。所有整合都會在渲染啟動後套用 Hybrid。Objects 模式用於基準聆聽與離線比較。
3. **HRTF 有兩種**：引擎內建的 MIT KEMAR，以及隨附發布的 SADIE II D2 KEMAR。
   揚聲器輸出為 HOA3 解碼（2.0 ~ 7.1），另有輕量的立體聲 panning 回退。
4. **材質以 9 頻段預設**（BRAS 24 種）依名稱對應。直接編輯僅限於每個頻段都滿足 R+A+T=1 的已驗證數值。
5. 射線解析度、深度、lane 更新週期等進階旋鈕 **只在量測之後** 才調整。
6. 單位為公尺。以 cm 為單位的主機（UE、Wwise for Unreal）由包裝層代入 `sceneRatio = 0.01`。

## 從哪裡開始

- 瀏覽器與 Three.js → [Web SDK](./web.md)
- Unity 遊戲 → [Unity SDK](./unity.md)
- Unreal Engine 遊戲 → [Unreal Engine SDK](./ue.md)
- 以 FMOD Studio 創作的專案 → [FMOD 外掛](./fmod.md)
- 以 Wwise 創作的專案 → [Wwise 外掛](./wwise.md)
- 原生 C/C++ → [SimpleST](../core/simplest.md)
- 正在遷移 STCoreV2 整合 → [STCoreV2 → SimpleST](../core/stcorev2.md)
