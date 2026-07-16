import { cw } from './binding-utils.js';
// v0.7 (ABI 4) clean-break surface. Every core function returns ExaResult
// (0 = EXA_OK; negative = error — see result.ts for the truthiness FLIP).
// Typed handles (ExaSceneId{int32 v} etc.) are plain int32 at the wasm FFI
// boundary — JS passes/receives the raw `.v` value; the per-family type safety
// lives in the C header, not here. Creators write the new id through an int32
// out-pointer instead of returning it.
//
// EXCEPTION: the diagnostics header (exaSoundDiagnostics.h) keeps the legacy
// ExaBool convention (non-zero = success) — those bindings stay 'boolean'.
export function makeCoreSceneBindings(mod) {
    return {
        exaGetVersion: cw(mod, 'exaGetVersion', 'number', ['number', 'number', 'number']),
        /** LEGACY: predates EXA_PATH_TRANSMISSION and still returns 4 — use the
         *  compile-time EXA_PATH_COUNT (5) as the authoritative count. */
        exaGetPathTypeCount: cw(mod, 'exaGetPathTypeCount', 'number', []),
        exaGetLastError: cw(mod, 'exaGetLastError', 'string', []),
        exaGetRuntimeOption: cw(mod, 'exaGetRuntimeOption', 'number', ['number']),
        exaSetRuntimeOption: cw(mod, 'exaSetRuntimeOption', 'number', ['number']),
        exaMeshGetDefaultBuildOption: cw(mod, 'exaMeshGetDefaultBuildOption', 'number', ['number']),
        exaMeshSetDefaultBuildOption: cw(mod, 'exaMeshSetDefaultBuildOption', 'number', ['number']),
        // ------------------------------------------------------------------------
        // Propagator visualization getters (ExaResult; counts via out-param).
        // ------------------------------------------------------------------------
        exaPropagatorGetGuidePlaneCount: cw(mod, 'exaPropagatorGetGuidePlaneCount', 'number', ['number', 'number']),
        exaPropagatorGetGuidePlanes: cw(mod, 'exaPropagatorGetGuidePlanes', 'number', ['number', 'number', 'number']),
        exaPropagatorGetAmbientSoundPathCount: cw(mod, 'exaPropagatorGetAmbientSoundPathCount', 'number', ['number', 'number']),
        exaPropagatorGetAmbientSoundPaths: cw(mod, 'exaPropagatorGetAmbientSoundPaths', 'number', ['number', 'number', 'number']),
        exaPropagatorGetMirrorPositionCount: cw(mod, 'exaPropagatorGetMirrorPositionCount', 'number', ['number', 'number']),
        exaPropagatorGetMirrorPositions: cw(mod, 'exaPropagatorGetMirrorPositions', 'number', ['number', 'number', 'number']),
        /** Merged count + fill (promoted from diagnostics, D-25(1)): fills up to
         *  `capacity` records and ALWAYS reports the available count via
         *  outCountPtr (may exceed capacity). Probe with (0, 0, outCountPtr). */
        exaPropagatorGetValidPaths: cw(mod, 'exaPropagatorGetValidPaths', 'number', ['number', 'number', 'number']),
        exaPropagatorGetEffectiveMaxDepth: cw(mod, 'exaPropagatorGetEffectiveMaxDepth', 'number', ['number']),
        exaPropagatorGetSourceEffectiveMaxDepth: cw(mod, 'exaPropagatorGetSourceEffectiveMaxDepth', 'number', ['number', 'number']),
        // ------------------------------------------------------------------------
        // Propagation timing diagnostics (exaSoundDiagnostics.h — LEGACY ExaBool
        // convention: non-zero/true = success; GetJobTimingFrames returns the
        // count written. Do NOT apply the ExaResult flip here.)
        // ------------------------------------------------------------------------
        exaPropagatorGetProfile: cw(mod, 'exaPropagatorGetProfile', 'boolean', ['number']),
        exaPropagatorSetJobTimingOption: cw(mod, 'exaPropagatorSetJobTimingOption', 'boolean', ['number']),
        exaPropagatorGetJobTimingFrames: cw(mod, 'exaPropagatorGetJobTimingFrames', 'number', ['number', 'number', 'number']),
        exaPropagatorResetJobTiming: cw(mod, 'exaPropagatorResetJobTiming', 'boolean', []),
        // ------------------------------------------------------------------------
        // Scene
        // ------------------------------------------------------------------------
        exaSceneCreate: cw(mod, 'exaSceneCreate', 'number', ['number']),
        exaSceneDestroy: cw(mod, 'exaSceneDestroy', 'number', ['number']),
        /** Pure geometry/TLAS refresh — the old tick-style deltaTime is gone (C6). */
        exaSceneUpdateGeometry: cw(mod, 'exaSceneUpdateGeometry', 'number', ['number']),
        /** Runs propagation; outPathCountPtr is optional (pass 0 to skip). On the
         *  wasm mt build the call is async (count reports the previous frame). */
        exaScenePropagate: cw(mod, 'exaScenePropagate', 'number', ['number', 'number']),
        exaSceneGetObjectCount: cw(mod, 'exaSceneGetObjectCount', 'number', ['number', 'number']),
        exaSceneAddObject: cw(mod, 'exaSceneAddObject', 'number', ['number', 'number']),
        exaSceneRemoveObject: cw(mod, 'exaSceneRemoveObject', 'number', ['number', 'number']),
        exaSceneClearObjects: cw(mod, 'exaSceneClearObjects', 'number', ['number']),
        exaSceneGetSourceCount: cw(mod, 'exaSceneGetSourceCount', 'number', ['number', 'number']),
        exaSceneAddSource: cw(mod, 'exaSceneAddSource', 'number', ['number', 'number']),
        exaSceneRemoveSource: cw(mod, 'exaSceneRemoveSource', 'number', ['number', 'number']),
        exaSceneClearSources: cw(mod, 'exaSceneClearSources', 'number', ['number']),
        exaSceneGetListenerCount: cw(mod, 'exaSceneGetListenerCount', 'number', ['number', 'number']),
        exaSceneAddListener: cw(mod, 'exaSceneAddListener', 'number', ['number', 'number']),
        exaSceneRemoveListener: cw(mod, 'exaSceneRemoveListener', 'number', ['number', 'number']),
        exaSceneClearListeners: cw(mod, 'exaSceneClearListeners', 'number', ['number']),
        /** Cast a ray against the scene TLAS (renamed — it always cast against the
         *  SCENE). A miss is a SUCCESS with outHit->hit == 0; check the hit flag,
         *  not the result. */
        exaSceneRaycast: cw(mod, 'exaSceneRaycast', 'number', ['number', 'number', 'number']),
    };
}
//# sourceMappingURL=bindings-core-scene.js.map