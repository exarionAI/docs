---
title: FMOD
description: SimpleSTFmod — structure, installation, Studio authoring, one-shots and the warm source pool, game-side C API, and UE/Unity integration of the SimpleST DSP plug-in for FMOD Studio / FMOD Engine.
---

# SimpleST FMOD Plug-in

**SimpleSTFmod** is a DSP plug-in for using [SimpleST](../core/simplest.md) in FMOD Studio / FMOD
Engine. It consists of two DSPs — **SimpleST Source**, inserted on events in the authoring tool, and
**SimpleST Listener**, placed once on the master bus — plus a C API through which the game engine
uploads geometry.

| Item | Value |
|---|---|
| Plug-in version | v0.3.0 (SimpleST 2.18.2). Previous release: v0.2.0 (SimpleST 2.12.0). The DSP description version FMOD sees is 0.3.0 starting with SDK release 2.18.2-jhj.4 (earlier 0.3.0 builds showed 0.2.0) |
| FMOD | Studio / Engine 2.03 ~ 2.04 (plug-in SDK 110 build = 2.00 ~ 2.04, 204 build = 2.04+) |
| Platforms | Windows x64 · macOS · Linux · Android · iOS (static) · Web (static, FMOD HTML5 pthreads) |
| Distribution | `SimpleST-fmod-release.zip` (per-platform `plugins/` + `install.py`, includes UE and Unity glue) |
| Commercial distribution | Requires confirmation from FMOD (sales@fmod.com) |

## Structure

![SimpleSTFmod structure](/img/fmod/structure.png)

```text
[event master track]                               [master bus]
 SimpleST Source  ──(mono PCM, write_stream)──▶  SimpleST Listener ──▶ stereo (HRTF/panning)
   · 3D Attributes (Studio, automatic) → source pose · st_rt_render_process (one render for all sources)
   · output is silent (dry pass-through without a Listener) · FMOD listener 0 → SimpleST listener
                 └──────────── SystemRuntime (one per FMOD::System) ─┘
                               · SimpleST context + control thread
                               · game-side C API (geometry upload etc.)
```

- SimpleST is an "N source inputs → one listener mix output" design, so the plug-in follows the
  **Resonance / Meta XR Audio style** (Sources push audio and output silence; the Listener on the
  bus renders everything at once), not the Steam Audio style (per-source output).
- The plug-in dynamically binds `SimpleSTRealtime` **from its own folder**, and the game side obtains
  the `st_rt_*` functions of the **same module** through the exported `SimpleSTFmod_GetRealtimeProc`
  — there is one engine instance.
- The renderer is elected every block as "the Listener whose process is currently running". The
  dummy preview instances Studio creates do not hijack the live Listener; if the renderer stalls for
  250 ms another Listener takes over, and if there is none the Sources fall back to dry.
- Engine sources are created only for Sources that actually received audio (protecting the 64
  concurrent stream slots). The engine source of a finished voice stays in a warm pool for the next
  voice to reuse — see [One-shots and the warm source pool](#one-shots-and-the-warm-source-pool).
- **The output limiter is turned off**: SimpleST 2.18 turns on a true-peak limiter (−1 dBTP,
  137-sample latency) right after creation, but inside FMOD the master bus handles limiting.

## Installation

### FMOD Studio (authoring tool)

![Plug-in install location](/img/fmod/studio-plugins-folder.png)

1. **Match the version**: Studio 2.03.x → SDK 110 build, Studio 2.04.x → SDK 204 build. The 204
   plug-in does not load in Studio 2.03.
2. Copy the contents of the distribution `plugins/` folder (`SimpleSTFmod.dll` · `SimpleSTFmod.plugin.js` ·
   `SimpleSTRealtime.dll` · `Resources/HRTF/`) into **the Studio project's `Plugins/`** (better for
   version control) or the user plug-in folder, then restart Studio.
   - Windows: `%localappdata%/FMOD Studio/Plugins`
   - macOS: `~/Library/Preferences/FMOD Studio/Plugins/SimpleST` (`install.py fmod --payload mac --studio "/Applications/FMOD Studio.app"`)
3. `No FMOD symbols found in dynamic library '.../SimpleSTRealtime.dll'` in the Studio log is harmless
   (Studio opens every DLL in the folder as a plug-in candidate; the engine DLL is loaded by
   SimpleSTFmod itself).

The installer checks manifest hashes, the platform, and the Studio/SDK version, and backs up
existing files outside the scanner's reach. If the HRTF resource is missing, the engine falls back
to the embedded MIT KEMAR.

### Game runtime

| Platform | Linking | Artifacts |
|---|---|---|
| win / mac / linux | Dynamic | `SimpleSTFmod.{dll,dylib,so}` + `SimpleSTRealtime.*` next to it + `Resources/HRTF` |
| android | Dynamic | `<abi>/plugins/libSimpleSTFmod.so` + `libSimpleSTRealtime.so` (app library folder) |
| ios | Static | `SimpleSTFmod.xcframework` (includes the engine objects) |
| web | Static | `libSimpleSTFmod.a` (includes the engine) — link with the FMOD HTML5 pthreads build + `-pthread` |

On dynamic platforms, once FMOD loads the plug-in, the plug-in finds the engine next to itself. On
static platforms (iOS/Web), register directly before loading banks.

```cpp
studioSystem->registerPlugin(FMOD_SimpleST_Source_GetDSPDescription());
studioSystem->registerPlugin(FMOD_SimpleST_Listener_GetDSPDescription());
```

## Using it in FMOD Studio

![SimpleST Listener on the master bus](/img/fmod/studio-master-bus-listener.png)

1. Add **Exarion › SimpleST Listener** to the master bus (one per project. If two run at the same
   time, only one renders and the other passes through).
2. On the master track of 3D events, **remove or bypass the FMOD Spatializer** and add
   **Exarion › SimpleST Source** (leaving it in causes double spatialization).
3. There is no game scene inside Studio, so when running in the authoring tool an
   **8 × 3 × 10 m audition room** is laid down automatically (`SIMPLESTFMOD_AUDITION_ROOM="W,H,D"`
   changes the size, `"0"` disables it). Move the source outside the room in the preview to hear
   wall occlusion.

![SimpleST Source on a 3D event](/img/fmod/studio-event-source.png)

### DSP parameters

![SimpleST Source deck UI](/img/fmod/studio-source-params.png)

| DSP | Parameter | Meaning |
|---|---|---|
| SimpleST Source | Gain / Direct / Reflections / Diffraction / Reverb Send (dB) | Input level, per-path volume (SimpleST path volume) |
| | Directivity (0 ~ 1) | 0 omnidirectional ~ 1 cardioid (relative to the event forward) |
| | Stationary | Hint that the emitter never moves (applied at creation) |
| | Bypass | Dry pass-through without going through SimpleST |
| | 3D Attributes / Overall Gain / Atten Range | FMOD special data parameters (automatic) |
| SimpleST Listener | Wet Level / Dry Level (dB) | Level of the SimpleST render / of the other audio on the bus |
| | HRTF | On = binaural (headphones), off = stereo panning |

**Bypassing** the Listener returns the Sources to dry pass-through (for A/B comparison). DSP names and
parameter names are stored as identifiers in the banks, so they are not changed after release.

## One-shots and the warm source pool

For sounds that get a new voice on every event, the plug-in reuses
engine sources across voices starting with 0.3.0. No changes to FMOD Studio events or the DSP setup
are needed.

- The engine fades in every path of a **new source** over 150 ms and waits for its first IR. 0.2.0
  created a new engine source per voice, so a 25 ms sound came out 15 ~ 20 dB too quiet and late, and it
  deleted the source as soon as the voice ended, cutting off the tail still left in the stream ring.
- 0.3.0 **plays out up to 300 ms** of the PCM a finished voice already pushed, then stops the source
  (reverb keeps ringing) and keeps that source warm — **up to 16 sources, for 2 seconds**.
- The next voice attaches to the nearest warm source. **Within 0.25 m it starts immediately**;
  farther away, playback starts about 25 ms later. Warm sources not reused within 2 seconds are
  released.

Results compared with 0.2.0, measured with the core test (the same runtime without FMOD):

| Item | 0.2.0 (new source per voice) | 0.3.0 (warm pool) |
|---|---|---|
| Engine sources created for 16 voices at one spot (120 ms apart) | 16 | 4 |
| Level, voices at one spot | Baseline | +15.7 dB (full level) |
| Level, moving voices | Baseline | +19.3 dB (full level) |
| Voice start → first sound | 92 ms | 69 ms |
| Audible length of a 350 ms voice | 275 ms | 350 ms |

With the environment variable `SIMPLESTFMOD_WARM_SOURCES=0`, a new source is created per voice as
before (for comparison).

## Game-side C API

`include/SimpleSTFmod/SimpleSTFmod.h` — exported by the plug-in library. Bind from **the module FMOD
loaded**. Make every call from the game thread, and make SimpleST `[control]` calls only inside
`SimpleSTFmod_InvokeOnControlThread`.

```c
SimpleSTFmod_Config cfg; SimpleSTFmod_InitConfig(&cfg);
cfg.renderMode = SIMPLESTFMOD_RENDER_BUFFERED;   // default. IN_CALLBACK = render inside the FMOD mixer callback
cfg.sceneRatio = 0.f;                            // 0 = 1.0 (FMOD UE/Unity integrations use metres)
cfg.maxSources = 0;                              // 0 = engine platform default (desktop 128, Android/iOS 48, web 32)
SimpleSTFmod_Configure(&cfg);                    // before the runtime starts (before the first SimpleST DSP is created)

SimpleSTFmod_Status st = { sizeof st };
SimpleSTFmod_GetStatus(SIMPLESTFMOD_SYSTEM_LATEST, &st);   // state READY, boundSources, latency, defaultMaterialId

typedef STMeshId (*mesh_create_fn)(STRT_Context*, const STMesh*, STMaterialId, const int32_t*);
mesh_create_fn meshCreate = (mesh_create_fn)SimpleSTFmod_GetRealtimeProc("st_rt_mesh_create");

SimpleSTFmod_InvokeOnControlThread(SIMPLESTFMOD_SYSTEM_LATEST,
    [](STRT_Context* ctx, void* user) {
        /* st_rt_mesh_create / st_rt_object_create_q / st_rt_build ... */
    }, user, /*wait=*/1);
```

- System index = `FMOD_DSP_STATE::systemobject` (the first FMOD::System created in the process is 0).
  Editor integrations create multiple Systems, so `SIMPLESTFMOD_SYSTEM_LATEST(-1)` = the most recent
  runtime.
- FMOD and SimpleST share the same coordinate system (left-handed, +Y up, +Z forward). The
  `(UE.Y, UE.Z, UE.X)/100` conversion of the FMOD UE integration is identical to the conversion in the
  SoundTracing UE plugin.
- The default material library is registered in the plug-in context first. Add the preset index to
  `defaultMaterialId`.
- **Source cap** (SDK release 2.18.2-jhj.4): `SimpleSTFmod_Config.maxSources` is the engine source
  count cap (0 = platform default). Beyond it the engine rejects source creation and that voice plays
  dry. The field is appended to the end of the struct, so hosts that pass the older, shorter struct
  still work — see [Source memory budget](../core/simplest.md#source-memory-budget).

### Turning sound tracing on and off

```c
SimpleSTFmod_SetSoundTracingEnabled(SIMPLESTFMOD_SYSTEM_LATEST, 0);   // off. 1 = on (default)
```

A game-side A/B switch added in SDK release 2.18.2-jhj.4. It applies to one runtime
(`systemIndex < 0` = the most recent) and takes effect asynchronously on the control thread.

- **Turning it off** engages the SimpleST renderer bypass (`st_rt_render_set_sound_tracing_enabled`),
  empties the warm source pool without refilling it, and the plug-in stops waking the propagation lanes.
- **The propagation lanes do not stop completely.** SimpleST has no propagation pause, so while
  sources remain the lanes keep running at their own cadence.
- **Turning it on** reapplies the plug-in's render options.
- Returns 1 when queued, 0 when there is no runtime. Runtimes started later start in the on state.
- It is an optional export; the game API version stays 1. Look up the export and skip it if it is
  missing.

UE SoundTracing's `SetSoundTracingEnabled` calls this function in FMOD mode — see
[Unreal Engine SDK](./ue.md).

## UE and Unity integration

![UE FMOD Plugin Files](/img/fmod/ue-plugin-files.png)

- **Unreal Engine**: `install.py /path/to/Game.uproject --fmod <plugins>` puts the plug-in, engine,
  and HRTF into `Plugins/FMODStudio/Binaries/<Plat>/` and adds `+PluginFiles=SimpleSTFmod` to
  `DefaultEngine.ini`. The SoundTracing plugin builds in FMOD mode and only uploads geometry — see
  [Unreal Engine SDK](./ue.md). Listening verified on UE 5.7 + FMOD for Unreal 2.04 (2026-10-15).
- **Unity**: the **SoundTrace › FMOD › Install SimpleST FMOD Plug-in...** menu copies the DLL/bundle
  and registers it under Dynamic Plugins — see [Unity SDK](./unity.md#using-with-fmod). E2E passed on
  Unity 6000.3 + FMOD for Unity 2.04.

![Unity FMOD install menu](/img/fmod/unity-install-menu.png)

## Verification results (2026-10-01 · FMOD 2.04.00)

| Test | Content | Result |
|---|---|---|
| `core_smoke` | Runtime only, without FMOD: 48 kHz/1024 blocks, noise at 80° right, room upload → reverb, renderer election/takeover rules | PASS — ILD +14.6 dB |
| `fmod_host_smoke` | FMOD Core host `loadPlugin` → Source/Listener → WAV, room via the game API | PASS |
| `studio_project` | FMOD Studio (fmodstudiocl) recognizes both DSPs, loads the parameters, builds the bank | PASS |
| `studio_smoke` | 3D playback of that bank in the Studio API runtime, moving right → left | PASS — ILD +14.97 → −14.80 dB |

Render latency (BUFFERED, 48 kHz): about 1,790 frames (≈37 ms). Real-time audition in the FMOD Studio
GUI was verified manually on 2026-10-15.

## Known limitations

- One listener (no roll), 64 concurrent streams (excess goes dry), stereo output only (speaker
  layouts not exposed).
- The engine source count does not exceed the platform cap (`maxSources`). Excess voices are dry.
- Event effects/sends after the Source receive silence (the SimpleST mix comes out of the Listener bus).
- `Overall Gain` (audibility for virtualization) is a distance-based estimate.
- FMOD Studio may create multiple Systems, so each System gets its own SimpleST context.
- The SDK 110 distribution build must be rebuilt against the official FMOD 2.03 SDK (the FMOD EULA
  forbids redistributing the SDK).

## Logging / environment variables

| Variable | Meaning |
|---|---|
| `SIMPLESTFMOD_LOG_FILE` | Log file path |
| `SIMPLESTFMOD_LOG_STDERR` | Log to stderr |
| `SIMPLESTFMOD_RUNTIME_LIBRARY` | Force the SimpleSTRealtime path |
| `SIMPLESTFMOD_AUDITION_ROOM` | `"W,H,D"` audition room (m), `"0"` disables it |
| `SIMPLESTFMOD_WARM_SOURCES` | `"0"` disables the warm source pool and creates a new engine source per voice (for comparison) |

On Windows, output always also goes to `OutputDebugString`. The control thread logs
`SimpleST Listener rendering` / `no SimpleST Listener rendering` whenever the renderer state changes.

## Next

- [Wwise plug-in](./wwise.md)
- [Unreal Engine SDK](./ue.md) · [Unity SDK](./unity.md)
- [SimpleST](../core/simplest.md)
