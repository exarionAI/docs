---
sidebar_position: 1
title: What Is Sound Tracing?
---

# What Is Sound Tracing?

**Sound Tracing** is a technology for physically simulating the acoustic propagation paths from sound sources to listeners in a virtual space. It is the acoustic counterpart of ray tracing in graphics: reflections, diffraction, absorption, and related phenomena are handled geometrically to reproduce the characteristic sound of a space.

## What It Solves

- **Spatial sound**: Generates impulse responses (IRs) from spatial information such as geometry and materials, so the same source sounds different in a cave, concert hall, or alley.
- **Real-time response**: Updates IRs when the listener, source, or environment changes, with latency suitable for games, VR, and simulators.
- **Physics-based consistency**: Uses results derived directly from geometry instead of heuristic reverb presets, so it adapts naturally as the scene changes.

## How It Works

1. **Scene input**: Receives meshes, materials (absorption/transmission), source positions, and listener positions.
2. **Path tracing**: Searches acoustic propagation paths in a ray-tracing-like way, with acoustic-specific algorithms such as plane-based backtracking, coplane handling, and boundary detection.
3. **IR synthesis**: Collects time, attenuation, and direction information from arrival paths and synthesizes an impulse response.
4. **Convolution**: Convolves the IR with the source signal to produce the final output.

## Next Steps

- [Features](./features.md) — see the capabilities provided
- [Products](./products.md) — SDK, tools, and demo lineup
- [SDK Getting Started](../sdk/overview.md) — the entry point for code
