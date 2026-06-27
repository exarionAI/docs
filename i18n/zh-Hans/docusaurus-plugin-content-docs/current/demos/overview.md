---
title: 演示列表
---

# 演示

## three-basic

`three-basic` 是把 Web SDK 连接到 Three.js scene 的官方浏览器演示。`simple.ts`
是 scene setup、Web Audio graph、sound collider、material table、
source/listener movement 和 MT startup 的参考示例。

| 项目 | 内容 |
|---|---|
| 文档内静态 MT 演示 | `/demos/three-basic/simple.html` |
| 本地 demo repo | `projects/soundtrace-three-basic` |
| SDK snapshot sync | `SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk` |
| MT 运行条件 | COOP/COEP headers、`SharedArrayBuffer`、`crossOriginIsolated === true` |

在 `simple.html` 中将 `Backend` 设为 `mt` 时，演示使用 Web SDK 的 worker-hosted MT
路径。`source transform`、`listener transform` 和 `mesh transform` 通过 HOT lane
传递，non-transform 工作通过 command channel 处理。
