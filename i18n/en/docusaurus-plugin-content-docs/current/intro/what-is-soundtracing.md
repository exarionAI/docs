---
sidebar_position: 1
title: What Is Sound Tracing?
description: An introduction to ray-tracing-based real-time spatial acoustic simulation (direct sound, transmission, reflection, diffraction, reverberation).
---

# What Is Sound Tracing?

**Sound Tracing** is a technology that physically simulates the acoustic propagation paths a
sound source takes before it reaches the listener in a virtual space. It is the acoustic
counterpart of ray tracing for light: reflection, diffraction, transmission, and absorption are
handled geometrically to reproduce the unique sonic character of a space.

![Path visualization](/img/intro/path-visualization.png)

## What It Solves

- **Spatially convincing sound**: Generates impulse responses (IRs) that reflect the spatial
  information of the scene (geometry and materials), so the same source sounds different in a
  cave, a concert hall, or an alley.
- **Real-time response**: Refreshes the IR whenever the listener, the sources, or the environment
  change, with latency suitable for games, VR, and simulators.
- **Physically based consistency**: Uses results derived directly from the geometry instead of
  heuristic reverb presets, so the sound adapts naturally to scene changes.

## How It Works

![Sound Tracing concept diagram](/img/intro/pipeline-concept.png)

1. **Scene input**: Takes meshes, materials (9-band reflection/absorption/transmission/scattering),
   sources, and the listener position.
2. **Path tracing**: Guide rays shot from the listener plus image-source validation find direct,
   transmission, and specular reflection paths, and UTD diffraction paths are solved at mesh
   edges (wedges). Transport rays shot from each source collect diffuse scattering and room
   statistics (mean free path, surface area, material distribution) that drive the late reverb.
3. **IR conversion**: Converts the delay, Doppler, 9-band energy, and direction of each arriving
   path into the acoustic domain, and performs the **Hybrid** aggregation that splits early
   reflections into exact objects and an HOA3 bed.
4. **Render**: Band delay ring → path taps → spatialization (HRTF / panning / speakers) → FDN16
   late reverb → limiter, producing real-time stereo or N-channel output, or a deterministic IR.

The current implementation of this pipeline is the [SimpleST](../core/simplest.md) engine; every
SDK and middleware plug-in runs on top of it.

## Next Steps

- [Features](./features.md) — what the stack provides
- [Product Family](./products.md) — the engine, SDK, plug-in, and tool lineup
- [SDK Overview](../sdk/overview.md) — the starting point for working with code
