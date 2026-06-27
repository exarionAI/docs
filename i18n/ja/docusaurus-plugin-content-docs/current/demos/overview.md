---
title: デモ一覧
---

# デモ

## three-basic

`three-basic`はWeb SDKをThree.js sceneにつなぐ公式browser demoです。`simple.ts`は
scene setup、Web Audio graph、sound collider、material table、source/listenerの移動、
MT startupをまとめて確認する基準例です。

| 項目 | 内容 |
|---|---|
| docs内の静的MT demo | `/demos/three-basic/simple.html` |
| local demo repo | `projects/soundtrace-three-basic` |
| SDK snapshot sync | `SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk` |
| MT実行条件 | COOP/COEP headers、`SharedArrayBuffer`、`crossOriginIsolated === true` |

`simple.html`で`Backend`を`mt`にすると、demoはWeb SDKのworker-hosted MT経路を
使います。`source transform`、`listener transform`、`mesh transform`はHOT lane、
non-transform作業はcommand channelで処理されます。
