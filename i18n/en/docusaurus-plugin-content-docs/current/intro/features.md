---
sidebar_position: 2
title: Features
---

# Features

## Acoustic Simulation

- **Path-tracing-based propagation** — finds direct, transmission, specular reflection (up to order 16), and UTD diffraction paths directly from the geometry
- **9-band material model** — reflection, absorption, transmission, and scattering per octave band from `63 Hz ~ 16 kHz`, with 24 presets fitted from BRAS measurements
- **Physical attenuation** — `1/r` distance attenuation, ISO 9613-1 air absorption, speed of sound derived from temperature, humidity, and pressure
- **Late reverb** — FDN16 driven by the diffuse scattering of source transport rays, with late coupling attenuation
- **Doppler** — variable-delay pitch, optional moving-monopole radiation gain
- **Hybrid early reflections** — a listener-global budget of exact objects plus an HOA3 bed, so render cost is independent of the path count

## Rendering

- **Binaural** — engine-embedded MIT KEMAR, bundled SADIE II D2 KEMAR HRIR
- **Speakers** — HOA3 decode to 2.0 / 2.1 / 4.1 / 5.1 / 7.1 / custom layouts
- **Host pull render** — three output modes in which the host audio callback pulls blocks, with a built-in resampler
- **Offline IR** — deterministic Raw energy taps, 9-band pressure IR, and binaural IR

## Integration

- **Multi-platform** — Windows, macOS, Linux, Android, iOS, Web (WebAssembly)
- **Game engines** — Unity, Unreal Engine 5
- **Audio middleware** — FMOD Studio (SimpleST Source / Listener DSP), Wwise (Sound-tracing Renderer / Source Settings)
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **Public C ABI** — real-time and offline 2-DLL split, POD-only, feature discovery via capability bits

## Tools

- **Demo apps** — real-time 3D demo, offline IR demo, 29 test scenes
- **ExaTools** — IR analysis, validation, and batch-processing tools
