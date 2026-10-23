---
title: Wwise
description: Sound-tracing (SimpleSTWwise) — structure, installation, authoring, one-shots and the warm source pool, game-side C API, and UE/Unity integration of the SimpleST Object Processor + Metadata plug-in for Wwise 2025.1.
---

# Sound-tracing Wwise Plug-in

**Sound-tracing** (source and binary name `SimpleSTWwise`) is a plug-in for using
[SimpleST](../core/simplest.md) in Wwise 2025.1. It consists of two plug-ins — **Sound-tracing
Renderer** (Object Processor), inserted on an Audio Objects bus, and **Sound-tracing Source
Settings** (Metadata), attached to sounds/actor-mixers — plus a C API through which the game engine
uploads geometry.

| Item | Value |
|---|---|
| Plug-in version | v0.2.0 (SimpleST 2.18.2). Previous release: v0.1.0 (SimpleST 2.12.0, E2E verified on the Wwise 2025.1.11 sound engine) |
| Audiokinetic | CompanyID **325**, PluginID 1001 (Renderer) · 1002 (Source Settings). Launcher bundle `Sound-tracing` |
| Wwise | 2025.1 (plug-in binaries are tied to the SDK version) |
| Platforms | Windows (vc170) · macOS · Linux · Android · iOS (static) · Web (static) |
| Distribution | `SimpleST-wwise-release.zip` (per-platform SDK + Authoring + launcher package + `install.py`, includes UE and Unity glue) |
| Partner approval | Community Partner Program first-stage approval (2026-10-08). Final approval in progress |

## Structure

![SimpleSTWwise structure](/img/wwise/structure.png)

```text
 3D sounds ──(Listener Relative Routing)──▶ [SimpleST bus: Bus Configuration = Audio Objects]
   + Sound-tracing Source Settings (metadata, optional)     Sound-tracing Renderer (Object Processor)
                                                        · per object: mono downmix → st_rt_source_write_stream
                                                          position = bus-listener-relative → converted back to world
                                                        · one st_rt_render_process → one stereo output object
                                                        · objects SimpleST does not take (2D / Bypass / beyond 64)
                                                          are mixed by the renderer with Wwise panning ("Dry Level")
                                   SystemRuntime (one per process = one Wwise sound engine)
```

- **Why an Object Processor**: it receives every audio object on the bus, together with its position
  metadata, in one callback, so push and render happen inside the same `Execute`. Unlike the FMOD
  version (Source push + Listener pull) there is no block-order skew, voices do not need to output
  silence, and Wwise metering/virtualization keep working as they are. The system Audio Device is
  not replaced either.
- **Coordinates**: Wwise delivers object positions translated and rotated relative to the bus
  listener. The renderer converts them back using the world pose of the bus game object (= the
  listener). Wwise and SimpleST are both left-handed, +X right, +Y up, +Z forward, so there is no
  axis conversion (the Unreal integration is the only exception — see below).
- **Voices and engine sources**: each audio object (voice) uses one SimpleST source, but the engine
  source of a finished voice stays in a warm pool and the next voice picks it up — see
  [One-shots and the warm source pool](#one-shots-and-the-warm-source-pool).
- **Shared core**: it shares the same runtime layer as the FMOD plug-in, dynamically binds
  `SimpleSTRealtime` from its own folder, and the game side obtains the `st_rt_*` functions of the
  same module through `SimpleSTWwise_GetRealtimeProc`.
- **The output limiter is turned off**: SimpleST 2.18 turns on a true-peak limiter right after
  creation, but inside Wwise the master bus handles limiting.
- **Lifecycle**: the runtime starts in the sound engine Init hook (static registration) or when the
  first renderer instance is created, and shuts down in the `AK::SoundEngine::Term` global callback.

## Installation

### Authoring

![Launcher bundle installation](/img/wwise/launcher-bundle.png)

- **Windows**: install the launcher bundle (`bundle.json` + `*.tar.xz`) from the distribution
  `packages/` with **Add from directory** in the Audiokinetic Launcher, or overwrite the Wwise
  installation folder (`SDK/…`, `Authoring/…`) with the distribution folder as is. The Authoring
  plug-in is `Authoring/x64/Release/bin/Plugins/SimpleSTWwise.{dll,xml}` + the engine + the HRTF.
- **macOS**: Wwise Authoring uses the **Windows DLL** on Mac as well. The install location is
  `/Library/Application Support/Audiokinetic/Wwise <version>/Authoring/x64/Release/bin/Plugins`;
  install with
  `python3 install.py wwise --payload win --wwise-root "/Applications/Audiokinetic/Wwise_2025.1.11.9262"`.
  Existing files are kept in `bin/.simplest-backups`.

### Game runtime (SoundEngine)

| Platform | Artifacts |
|---|---|
| Windows | `SDK/x64_vc170/<Config>/bin/SimpleSTWwise.dll` (+ `SimpleSTRealtime.dll`, `Resources/HRTF`), `lib/SimpleSTWwiseFX.lib`, `include/AK/Plugin/SimpleSTWwiseFXFactory.h` |
| macOS / Linux / Android | `libSimpleSTWwise.{dylib,so}` + the `SimpleSTRealtime` of the same build (per ABI on Android) |
| iOS / Web | `libSimpleSTWwiseFX.a` including the engine objects — include `AK/Plugin/SimpleSTWwiseFXFactory.h` in the app and register both plug-ins |

Place the Debug plug-in in the Debug configuration and the Release plug-in in the Profile/Release
configurations. On statically linked platforms the single `SimpleSTWwiseFX` library contains both
plug-ins (if the bank `PluginInfo.json` assumes the metadata plug-in's lib name is
`SimpleSTWwiseMeta`, an alias may be needed).

## Using it in Wwise

![Audio Objects bus](/img/wwise/bus-audio-objects.png)

1. Create a bus (for example `SimpleST`) and set **Bus Configuration = Audio Objects**.
2. Insert **Sound-tracing Renderer** in that bus's Effects. The bus output becomes one stereo signal
   (binaural with HRTF on — headphones).
3. Route the 3D sounds to that bus: in Positioning, set **3D Spatialization = Position (or
   + Orientation)** and enable Listener Relative Routing. **Disable or flatten the distance
   attenuation (Attenuation)** — SimpleST applies physical distance attenuation itself, so leaving it
   on doubles the attenuation (the object buffers arrive with the Wwise volume/attenuation already
   applied).
4. If you need per-source adjustments, add **Metadata › Sound-tracing Source Settings** to the sound,
   actor-mixer, or bus.
5. There is no game scene inside the authoring tool, so in `Wwise.exe` / `WwiseConsole.exe` an
   **8 × 3 × 10 m audition room** is laid down automatically (`SIMPLESTWWISE_AUDITION_ROOM="W,H,D"`,
   `"0"` disables it).

![Positioning settings](/img/wwise/positioning-attenuation.png)

### Properties

![Sound-tracing Renderer properties](/img/wwise/renderer-properties.png)

| Plug-in | Property | Meaning |
|---|---|---|
| Sound-tracing Renderer | Wet Level / Dry Level (dB, RTPC) | Level of the SimpleST render / of the objects the renderer pans directly |
| | HRTF (Binaural) | On = binaural, off = stereo panning |
| Sound-tracing Source Settings | Gain / Direct / Reflections / Diffraction / Reverb Send (dB, RTPC) | Input level, per-path volume (SimpleST path volume) |
| | Directivity (0 omni ~ 1 cardioid, RTPC) | Directivity relative to the object front |
| | Stationary (never moves) | Hint that the emitter never moves (applied at creation) |
| | Bypass SimpleST (RTPC) | Skips SimpleST; the renderer mixes the object with Wwise panning |

![Source Settings metadata](/img/wwise/source-settings-metadata.png)

CompanyID/PluginID, property names, and AudioEnginePropertyIDs are stored by projects and banks, so
they are not changed after release.

## One-shots and the warm source pool

Starting with 0.2.0, the same warm source pool as FMOD plug-in 0.3.0 is included (shared core). Even
when every sound arrives as a new voice, no new engine source is
created per voice, so the 150 ms path fade-in of a new source and the wait for its first IR are
avoided, and short sounds play at full level and on time. No changes to the Wwise project setup are
needed.

- After a voice ends, the PCM it already handed over is played out for up to 300 ms, then the source
  is stopped (reverb keeps ringing); up to 16 sources are kept warm for 2 seconds.
- The next voice attaches to the nearest warm source. Within 0.25 m it plays immediately; farther
  away, it plays about 25 ms later.
- Integrations that register a new game object per sound, such as Unreal's **Wwise AudioLink**, are
  handled through this path as well.

The measurements (engine sources created for 16 voices at one spot 16 → 4, level +15.7 dB, moving
+19.3 dB, etc.) are on the [FMOD plug-in](./fmod.md#one-shots-and-the-warm-source-pool) page. With
the environment variable `SIMPLESTFMOD_WARM_SOURCES=0` (the same name in the Wwise version, since the
core is shared), a new source is created per voice as before (for comparison).

## Game-side C API

`include/SimpleSTWwise/SimpleSTWwise.h` — exported by the SoundEngine library. Bind from **the module
Wwise loaded** (Unreal: `FAkPlatform::GetDSPPluginsDirectory()` + `SimpleSTWwise.dll`; static
platforms call directly). Same contract as the FMOD version, but with no system index (one sound
engine per process).

```c
SimpleSTWwise_Config cfg; SimpleSTWwise_InitConfig(&cfg);
cfg.sceneRatio = 0.01f;                          // Wwise for Unreal (cm). Unity: 0 (= 1.0, metres)
cfg.maxSources = 0;                              // 0 = engine platform default (desktop 128, Android/iOS 48, web 32)
SimpleSTWwise_Configure(&cfg);                   // before AK::SoundEngine::Init
SimpleSTWwise_SetWorldAxes(SIMPLESTWWISE_AXES_UNREAL);   // Unreal only. Unity keeps the default (WWISE)

SimpleSTWwise_Status st = { sizeof st };
SimpleSTWwise_GetStatus(&st);                    // upload geometry once READY
void* p = SimpleSTWwise_GetRealtimeProc("st_rt_mesh_create");
SimpleSTWwise_InvokeOnControlThread(
    [](STRT_Context* ctx, void* user) { /* st_rt_mesh_create / object_create / build ... */ }, user, 1);
```

- Runtime start: inside `SoundEngine::Init` with static registration, or when the first SimpleST bus
  plays with DLL registration. Before that, `GetStatus` returns 0.
- **Unreal axes**: Wwise for Unreal 2024.1+ passes Unreal vectors unchanged (+Z up), so you must call
  `SetWorldAxes(UNREAL)` for the renderer to convert to (Y, Z, X) and match the geometry the game
  uploaded. Without it, the listener and sources are occluded by the wrong walls (fixed 2026-10-15).
- **Source cap** (SDK release 2.18.2-jhj.4): `SimpleSTWwise_Config.maxSources` is the engine source
  count cap (0 = platform default). Beyond it the engine rejects source creation and that voice plays
  dry. The field is appended to the end of the struct, so hosts that pass the older, shorter struct
  still work — see [Source memory budget](../core/simplest.md#source-memory-budget).

### Turning sound tracing on and off

```c
SimpleSTWwise_SetSoundTracingEnabled(0);   // off. 1 = on (default)
```

A game-side A/B switch added in SDK release 2.18.2-jhj.4. It applies to the running runtime and takes
effect asynchronously on the control thread. It behaves the same as the
[FMOD version](./fmod.md#turning-sound-tracing-on-and-off).

- **Turning it off** engages the SimpleST renderer bypass (`st_rt_render_set_sound_tracing_enabled`),
  empties the warm source pool without refilling it, and the plug-in stops waking the propagation lanes.
- **The propagation lanes do not stop completely.** SimpleST has no propagation pause, so while
  sources remain the lanes keep running at their own cadence.
- **Turning it on** reapplies the plug-in's render options.
- Returns 1 when queued, 0 when no runtime is running. Runtimes started later start in the on state,
  so send the state again once the runtime is ready.
- It is an optional export; the game API version stays 1. Look up the export and skip it if it is
  missing.

UE SoundTracing's `SetSoundTracingEnabled` calls this function in Wwise mode — see
[Unreal Engine SDK](./ue.md).

## UE and Unity integration

- **Unreal Engine**: `install.py /path/to/Game.uproject --wwise <wwise/SDK>` puts `SimpleSTWwise`,
  `SimpleSTRealtime`, and the HRTF into `WwiseSoundEngine/ThirdParty/<toolset>/<Config>/bin`. The
  SoundTracing plugin builds in Wwise mode, sets `sceneRatio = 0.01` and the Unreal axes, and only
  uploads geometry — see [Unreal Engine SDK](./ue.md). E2E PASS (2026-10-07: 6 objects / 288
  triangles / paths 1 → 346 → 1).
- **Unity**: the **SoundTrace › Wwise › Install SimpleST Wwise Plug-in...** menu copies the plug-in
  into the DSP folder of the Wwise Unity integration. The engine shares SoundTrace's
  `SimpleSTRealtime` and units are meters — see [Unity SDK](./unity.md#using-with-wwise).

![UE Wwise install result](/img/wwise/ue-install.png)

## Verification results (2026-10-01 · Wwise 2025.1.11.9262)

Project created with WwiseConsole → bus, effect, metadata, and event configured via WAAPI → banks
generated → the real `AkSoundEngine` (Profile) loads the distribution DLL with
`RegisterPluginDLL("SimpleSTWwise")` and renders offline.

| Stage | Content | Result |
|---|---|---|
| Authoring | WwiseConsole recognizes both plug-ins and records the parameters in the bank | PASS |
| A | Noise, emitter at 80° right, free field | PASS — ILD +14.64 dB |
| B | Source Settings Bypass → renderer mixes with Wwise panning | PASS |
| C | Listener moved to (10,0,5) + rotated 180°, emitter at 80° right | PASS — relative→world conversion exact |
| D | 1.5 s tone after uploading a room via the game API | PASS — reverb tail |
| Shutdown | The `AK::SoundEngine::Term` callback shuts down the runtime | PASS |

Render latency (BUFFERED, 48 kHz, 512-frame buffer): about 2,100 frames (≈44 ms). Mac/Linux passed
real Wwise registration, both Android ABIs built, and iOS device/simulator and Web passed final
linking (2026-10-06).

## Known limitations

- One listener (a SimpleST constraint). If the same bus is instantiated again for a second listener,
  that instance mixes every object with Wwise panning.
- Audio objects carry no velocity, so there is no SimpleST Doppler.
- The engine source count does not exceed the platform cap (`maxSources`). Excess voices are dry.
- When a new audio object is first seen, one small slot is allocated on the audio thread. The engine
  source itself is reused from the warm pool or newly created on the control thread.
- The launcher bundle currently contains only Authoring + Windows_vc170. The Mac, Linux, Android, and
  iOS bundles plus the EULA and logo are in preparation.
- Manual audition in the Wwise authoring GUI has not been recorded yet.

## Logging / environment variables

| Variable | Meaning |
|---|---|
| `SIMPLESTWWISE_LOG_FILE` | Log file path |
| `SIMPLESTWWISE_LOG_STDERR` | Log to stderr |
| `SIMPLESTWWISE_RUNTIME_LIBRARY` | Force the SimpleSTRealtime path |
| `SIMPLESTWWISE_AUDITION_ROOM` | `"W,H,D"` audition room (m), `"0"` disables it |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` disables the warm source pool and creates a new engine source per voice (for comparison; shared-core variable) |

Renderer warnings also appear in the Wwise Capture Log (`PostMonitorMessage`).

## Next

- [FMOD plug-in](./fmod.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
