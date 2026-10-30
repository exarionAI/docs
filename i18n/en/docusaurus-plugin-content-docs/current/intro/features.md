---
sidebar_position: 2
title: Features
---

# Features

## Acoustic Simulation

- **Path-tracing-based propagation** — finds direct, transmission, specular reflection (up to order 16), and UTD diffraction paths directly from the geometry
- **9-band material model**
- **Physical attenuation** — `1/r` distance attenuation, ISO 9613-1 air absorption, speed of sound derived from temperature, humidity, and pressure
- **Late reverb**
- **Doppler**
- **Binaural rendering** — HRTF-based binaural output

## Integration

- **Multi-platform** — Windows, macOS, Linux, Android, iOS, Web (WebAssembly)
- **Game engines** — Unity, Unreal Engine 5
- **Audio middleware** — FMOD Studio, Wwise
- **Web** — `@exarionai/soundtrace.js` TypeScript facade + Worker/AudioWorklet
- **Native C/C++** — public C ABI (real-time and offline)
