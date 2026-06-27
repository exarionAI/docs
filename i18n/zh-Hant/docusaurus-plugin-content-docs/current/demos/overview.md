---
title: 示範列表
---

# 示範

## three-basic

`three-basic` 是把 Web SDK 連接到 Three.js scene 的官方瀏覽器示範。`simple.ts`
是 scene setup、Web Audio graph、sound collider、material table、
source/listener movement 和 MT startup 的參考範例。

| 項目 | 內容 |
|---|---|
| 文件內靜態 MT 示範 | `/demos/three-basic/simple.html` |
| 本地 demo repo | `projects/soundtrace-three-basic` |
| SDK snapshot sync | `SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk` |
| MT 執行條件 | COOP/COEP headers、`SharedArrayBuffer`、`crossOriginIsolated === true` |

在 `simple.html` 中將 `Backend` 設為 `mt` 時，示範使用 Web SDK 的 worker-hosted MT
路徑。`source transform`、`listener transform` 和 `mesh transform` 透過 HOT lane
傳遞，non-transform 工作透過 command channel 處理。
