---
sidebar_position: 1
title: What Is Sound Tracing?
description: An introduction to ray-tracing-based real-time spatial acoustic simulation (direct sound, transmission, reflection, diffraction, reverberation).
---

# What Is Sound Tracing?

**Sound-Tracing** is a real-time spatial-audio solution built on the sound-tracing research
papers of [Professor Woo-Chan Park](https://prof.sejong.ac.kr/pwchan/index.do)'s lab at Sejong University.

It is the acoustic counterpart of ray tracing for light: reflection, diffraction, transmission and
absorption are handled geometrically to reproduce the unique sonic character of a space.

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

1. **Scene input**: Takes meshes, materials (9-band), sources, and the listener position.
2. **Path tracing**: Finds direct, transmission, reflection, and diffraction paths, and collects the diffuse characteristics of the space to drive the late reverb.
3. **IR conversion**: Converts the delay, Doppler, band energy, and direction of each arriving path into the acoustic domain.
4. **Render**: Produces real-time output or a deterministic IR through binaural (HRTF), panning, or speaker layouts.

## Next Steps

- [Features](./features.md) — what the stack provides
- [Supported Platforms](../sdk/overview.md) — the starting point for working with code
