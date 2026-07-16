import { cw, optionalCw, missingAudioWorkletExport } from './binding-utils.js';
// v0.7 (ABI 4): render + listener families. All core functions return
// ExaResult (0 = success — see result.ts). The exaDiag* block keeps the
// LEGACY ExaBool convention (diagnostics header).
export function makeRenderListenerBindings(mod) {
    return {
        /** RT-safe render call. Returns EXA_OK (spatialized), EXA_OK_BYPASSED
         *  (dry pass-through — still produced output!) or a negative error.
         *  NEVER truthiness-test this result. */
        exaRenderSound: cw(mod, 'exaRenderSound', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),
        /** Control-thread poll of cumulative audio-thread render failures. Native
         *  return is uint64; with WASM_BIGINT glue this may surface as a BigInt —
         *  callers convert via Number(). 0 for an unknown listener. */
        exaGetRenderErrorCount: cw(mod, 'exaGetRenderErrorCount', 'number', ['number']),
        // Render-time per-(listener, source) configuration (exaRender* prefix).
        exaRenderSetMaxDelay: cw(mod, 'exaRenderSetMaxDelay', 'number', ['number', 'number', 'number']),
        exaRenderGetMaxDelay: cw(mod, 'exaRenderGetMaxDelay', 'number', ['number', 'number', 'number']),
        exaRenderSetPathFadeTime: cw(mod, 'exaRenderSetPathFadeTime', 'number', ['number', 'number', 'number']),
        exaRenderGetPathFadeTime: cw(mod, 'exaRenderGetPathFadeTime', 'number', ['number', 'number', 'number']),
        exaRenderSetMaxDelayRate: cw(mod, 'exaRenderSetMaxDelayRate', 'number', ['number', 'number', 'number']),
        exaRenderGetMaxDelayRate: cw(mod, 'exaRenderGetMaxDelayRate', 'number', ['number', 'number', 'number']),
        /** Versioned ExaRenderStats out-struct (D-20) — replaces the old 21-float
         *  positional statistics array. Stamp structSize/version before the call
         *  (structs.ts writeRenderStatsHeader). */
        exaRenderGetStats: cw(mod, 'exaRenderGetStats', 'number', ['number', 'number', 'number']),
        exaRenderClearState: cw(mod, 'exaRenderClearState', 'number', ['number']),
        // ------------------------------------------------------------------------
        // Diagnostics (exaSoundDiagnostics.h — LEGACY ExaBool convention:
        // non-zero/true = success. Do NOT apply the ExaResult flip here.)
        // ------------------------------------------------------------------------
        exaDiagSetMemoryTraceOption: cw(mod, 'exaDiagSetMemoryTraceOption', 'boolean', ['number']),
        exaDiagMemoryTraceMark: cw(mod, 'exaDiagMemoryTraceMark', 'boolean', ['string']),
        exaDiagGetMemoryTraceSnapshot: cw(mod, 'exaDiagGetMemoryTraceSnapshot', 'boolean', ['number']),
        /** Merged count + fill: writes up to `capacity` ExaPathData records and
         *  reports the AVAILABLE count via outCountPtr (may exceed capacity). */
        exaDiagGetRayTraversals: cw(mod, 'exaDiagGetRayTraversals', 'boolean', ['number', 'number', 'number', 'number']),
        /** Same contract; elements are ExaVec3f, THREE per hit triangle. */
        exaDiagGetRayHitTriangles: cw(mod, 'exaDiagGetRayHitTriangles', 'boolean', ['number', 'number', 'number', 'number']),
        // ------------------------------------------------------------------------
        // Listener
        // ------------------------------------------------------------------------
        exaListenerCreate: cw(mod, 'exaListenerCreate', 'number', ['number']),
        /** v0.7: also detaches the listener from every scene first (D-07). */
        exaListenerDestroy: cw(mod, 'exaListenerDestroy', 'number', ['number']),
        // (exaListenerGet/SetTransform were REMOVED in v0.7 — ExaSTTransform is
        //  gone; use position + orientation (+ velocity) individually.)
        exaListenerGetPosition: cw(mod, 'exaListenerGetPosition', 'number', ['number', 'number']),
        /** ExaVec3f by value — the clang wasm32 ABI lowers 12-byte structs to a byval pointer. */
        exaListenerSetPosition: cw(mod, 'exaListenerSetPosition', 'number', ['number', 'number']),
        exaListenerGetVelocity: cw(mod, 'exaListenerGetVelocity', 'number', ['number', 'number']),
        exaListenerSetVelocity: cw(mod, 'exaListenerSetVelocity', 'number', ['number', 'number']),
        exaListenerSetOrientation: cw(mod, 'exaListenerSetOrientation', 'number', ['number', 'number']),
        /** Underscore dropped from the old exaListenerSetOrientation_Quaternion. */
        exaListenerSetOrientationQuaternion: cw(mod, 'exaListenerSetOrientationQuaternion', 'number', ['number', 'number', 'number', 'number', 'number']),
        /** NEW in v0.7 (D-16): quaternion getter (x,y,z,w out-params; q ≡ -q). */
        exaListenerGetOrientation: cw(mod, 'exaListenerGetOrientation', 'number', ['number', 'number', 'number', 'number', 'number']),
        /** ExaListenerOption (52 B, v0.7 — grid/depth/quality fields removed, D-14). */
        exaListenerGetOption: cw(mod, 'exaListenerGetOption', 'number', ['number', 'number']),
        exaListenerSetOption: cw(mod, 'exaListenerSetOption', 'number', ['number', 'number']),
        /** NEW in v0.7 (D-14): curated propagation preset (EXA_PRESET_*, 1=ULTRA…
         *  5=LOWEST — INVERTED scale) applied through the grid/depth sole writers. */
        exaListenerApplyPreset: cw(mod, 'exaListenerApplyPreset', 'number', ['number', 'number']),
        exaListenerGetAudioOption: cw(mod, 'exaListenerGetAudioOption', 'number', ['number', 'number']),
        exaListenerSetAudioOption: cw(mod, 'exaListenerSetAudioOption', 'number', ['number', 'number']),
        exaListenerGetAmbientPhysicalFilterOption: cw(mod, 'exaListenerGetAmbientPhysicalFilterOption', 'number', ['number', 'number']),
        exaListenerSetAmbientPhysicalFilterOption: cw(mod, 'exaListenerSetAmbientPhysicalFilterOption', 'number', ['number', 'number']),
        exaListenerGetAirAbsorptionOption: cw(mod, 'exaListenerGetAirAbsorptionOption', 'number', ['number', 'number']),
        exaListenerSetAirAbsorptionOption: cw(mod, 'exaListenerSetAirAbsorptionOption', 'number', ['number', 'number']),
        /** EXA_HRTF_MODE_* (vendor-neutral). Selecting a table-backed mode with no
         *  resident table returns EXA_ERR_NOT_LOADED (no silent BAND8 fallback). */
        exaListenerSetHrtfMode: cw(mod, 'exaListenerSetHrtfMode', 'number', ['number', 'number']),
        exaListenerGetHrtfMode: cw(mod, 'exaListenerGetHrtfMode', 'number', ['number', 'number']),
        /** Single vendor-neutral HRTF loader (D-06): sniffs the 4-byte magic
         *  (BPH1 / MPI1 / legacy SAH1) and installs the matching table slot(s).
         *  Replaces the three Load{Parametric,Convolution,SteamAudio}Hrtf loaders. */
        exaListenerLoadHrtf: cw(mod, 'exaListenerLoadHrtf', 'number', ['number', 'number', 'number']),
        /** Bitmask of EXA_HRTF_KIND_* — which tables are resident (out u32). */
        exaListenerGetLoadedHrtfKinds: cw(mod, 'exaListenerGetLoadedHrtfKinds', 'number', ['number', 'number']),
        exaListenerSetAmbisonicHybridEnabled: cw(mod, 'exaListenerSetAmbisonicHybridEnabled', 'number', ['number', 'boolean']),
        exaListenerIsAmbisonicHybridEnabled: cw(mod, 'exaListenerIsAmbisonicHybridEnabled', 'number', ['number', 'number']),
        exaListenerSetDiffuseEnabled: cw(mod, 'exaListenerSetDiffuseEnabled', 'number', ['number', 'boolean']),
        exaListenerIsDiffuseEnabled: cw(mod, 'exaListenerIsDiffuseEnabled', 'number', ['number', 'number']),
        // Quality knobs -> raw path budgets (top-K counts, larger = higher quality;
        // documented operating points: EXA_DIFFUSE_BUDGET_* / EXA_HRTF_BUDGET_*).
        exaListenerSetDiffusePathBudget: cw(mod, 'exaListenerSetDiffusePathBudget', 'number', ['number', 'number']),
        exaListenerGetDiffusePathBudget: cw(mod, 'exaListenerGetDiffusePathBudget', 'number', ['number', 'number']),
        exaListenerSetHrtfPathBudget: cw(mod, 'exaListenerSetHrtfPathBudget', 'number', ['number', 'number']),
        exaListenerGetHrtfPathBudget: cw(mod, 'exaListenerGetHrtfPathBudget', 'number', ['number', 'number']),
        exaListenerSetEarlyPathBudget: cw(mod, 'exaListenerSetEarlyPathBudget', 'number', ['number', 'number']),
        exaListenerGetEarlyPathBudget: cw(mod, 'exaListenerGetEarlyPathBudget', 'number', ['number', 'number']),
        exaListenerSetDelayInterpolation: cw(mod, 'exaListenerSetDelayInterpolation', 'number', ['number', 'number']),
        exaListenerGetDelayInterpolation: cw(mod, 'exaListenerGetDelayInterpolation', 'number', ['number', 'number']),
        // Per-listener coordinate basis (host->core HRTF frame). The three
        // `const float[3]` array params decay to pointers. Rows of the basis are
        // {right, up, forward}; reflected (det < 0) bases are allowed.
        exaListenerSetCoordinateBasis: cw(mod, 'exaListenerSetCoordinateBasis', 'number', ['number', 'number', 'number', 'number']),
        exaListenerGetCoordinateBasis: cw(mod, 'exaListenerGetCoordinateBasis', 'number', ['number', 'number', 'number', 'number']),
        // Perceptual-depth adaptation (GLOBAL — no listener id; ExaResult in v0.7).
        exaPropagatorGetPerceptualDepthOption: cw(mod, 'exaPropagatorGetPerceptualDepthOption', 'number', ['number']),
        exaPropagatorSetPerceptualDepthOption: cw(mod, 'exaPropagatorSetPerceptualDepthOption', 'number', ['number']),
        exaListenerSetPathEnabled: cw(mod, 'exaListenerSetPathEnabled', 'number', ['number', 'number', 'boolean']),
        /** outEnabledPtr is an ExaBool = int32 — allocate 4 bytes, read i32. */
        exaListenerIsPathEnabled: cw(mod, 'exaListenerIsPathEnabled', 'number', ['number', 'number', 'number']),
        /** SOLE writer of the trace grid (D-14; ExaListenerOption no longer carries it). */
        exaListenerSetRayCount: cw(mod, 'exaListenerSetRayCount', 'number', ['number', 'number', 'number']),
        exaListenerGetRayCount: cw(mod, 'exaListenerGetRayCount', 'number', ['number', 'number', 'number']),
        /** SOLE writer of the bounce depth (D-14). */
        exaListenerSetRayDepth: cw(mod, 'exaListenerSetRayDepth', 'number', ['number', 'number']),
        exaListenerGetRayDepth: cw(mod, 'exaListenerGetRayDepth', 'number', ['number', 'number']),
        // ------------------------------------------------------------------------
        // Web Audio Worklet — only present in the standalone wasm build with
        // -sAUDIO_WORKLET=1. In other builds cwrap returns a stub that throws on
        // the first call; SoundTrace.createWorkletNode() guards before invoking
        // these so the user gets a clearer error message.
        // ------------------------------------------------------------------------
        /// One-time bootstrap. `onReadyPtr` is a function pointer produced by
        /// `addFunction(cb, 'vi')`.
        exa_audio_worklet_init: optionalCw(mod, 'exa_audio_worklet_init', null, ['number', 'number', 'number'], () => missingAudioWorkletExport('exa_audio_worklet_init')),
        /// Creates an AudioWorkletNode for the given (listener, source) pair.
        /// Returns 0 if init is incomplete or allocation failed.
        exa_audio_worklet_create_node: optionalCw(mod, 'exa_audio_worklet_create_node', 'number', ['number', 'number', 'number', 'number'], () => missingAudioWorkletExport('exa_audio_worklet_create_node')),
        /// Creates one AudioWorkletNode that renders and mixes multiple sources.
        exa_audio_worklet_create_mixer_node: optionalCw(mod, 'exa_audio_worklet_create_mixer_node', 'number', ['number', 'number', 'number', 'number', 'number'], () => missingAudioWorkletExport('exa_audio_worklet_create_mixer_node')),
        // v0.7 (core 7efb8b87): raw native bindings for the new C-ABI surface —
        // listener output mode, path-response IR export, mono IR render, and GPU
        // dispatch stats. Bound so the SDK tracks the core ABI (cabi-binding-
        // coverage). No facade wrapper yet: marshalling of ExaIR /
        // ExaGpuPropagationStats / mono-sample buffers is deferred to a later task.
        exaListenerSetOutputMode: cw(mod, 'exaListenerSetOutputMode', 'number', ['number', 'number']),
        exaListenerGetOutputMode: cw(mod, 'exaListenerGetOutputMode', 'number', ['number', 'number']),
        exaGetIRCount: cw(mod, 'exaGetIRCount', 'number', []),
        exaGetIRs: cw(mod, 'exaGetIRs', 'number', ['number', 'number']),
        exaGetMonoImpulseResponseSampleCount: cw(mod, 'exaGetMonoImpulseResponseSampleCount', 'number', ['number', 'number']),
        exaRenderMonoImpulseResponse: cw(mod, 'exaRenderMonoImpulseResponse', 'number', ['number', 'number', 'number', 'number', 'number']),
        exaPropagatorGetGpuStats: cw(mod, 'exaPropagatorGetGpuStats', 'number', ['number']),
    };
}
//# sourceMappingURL=bindings-render-listener.js.map