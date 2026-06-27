---
title: Demo List
---

# Demos

## three-basic

`three-basic` is the official browser demo that connects the Web SDK to a
Three.js scene. `simple.ts` is the reference example for scene setup, Web Audio
graph wiring, sound colliders, the material table, source/listener movement,
and MT startup.

| Item | Value |
|---|---|
| Static docs MT demo | `/demos/three-basic/simple.html` |
| Local demo repo | `projects/soundtrace-three-basic` |
| SDK snapshot sync | `SOUNDTRACE_SDK_DIR=/path/to/soundtrace.js npm run update:sdk` |
| MT requirements | COOP/COEP headers, `SharedArrayBuffer`, `crossOriginIsolated === true` |

When `Backend` is set to `mt` in `simple.html`, the demo uses the Web SDK
worker-hosted MT path. `source transform`, `listener transform`, and
`mesh transform` are sent through the HOT lane; non-transform work is handled
by the command channel.
