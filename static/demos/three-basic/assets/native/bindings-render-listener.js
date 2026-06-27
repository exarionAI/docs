import { cw, optionalCw, missingAudioWorkletExport } from './binding-utils.js';
export function makeRenderListenerBindings(mod) {
    return {
        exaRenderSound: cw(mod, 'exaRenderSound', 'boolean', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),
        // Auralization — config
        exaSetMaxDelay: cw(mod, 'exaSetMaxDelay', 'boolean', ['number', 'number', 'number']),
        exaSetPathFadeTime: cw(mod, 'exaSetPathFadeTime', 'boolean', ['number', 'number', 'number']),
        exaSetMaxDelayRate: cw(mod, 'exaSetMaxDelayRate', 'boolean', ['number', 'number', 'number']),
        exaGetMaxDelayRate: cw(mod, 'exaGetMaxDelayRate', 'boolean', ['number', 'number', 'number']),
        // Auralization — stats
        exaGetStatistics: cw(mod, 'exaGetStatistics', 'boolean', ['number', 'number', 'number', 'number']),
        exaListenerClearRenderState: cw(mod, 'exaListenerClearRenderState', 'boolean', ['number']),
        // ------------------------------------------------------------------------
        // Memory Trace
        // ------------------------------------------------------------------------
        exaSetMemoryTraceOption: cw(mod, 'exaSetMemoryTraceOption', 'boolean', ['number']),
        exaMemoryTraceMark: cw(mod, 'exaMemoryTraceMark', 'boolean', ['string']),
        exaGetMemoryTraceSnapshot: cw(mod, 'exaGetMemoryTraceSnapshot', 'boolean', ['number']),
        // ------------------------------------------------------------------------
        // Statistics (ray traversals / hit triangles)
        // ------------------------------------------------------------------------
        exaStatistics_GetRayTraversalCount: cw(mod, 'exaStatistics_GetRayTraversalCount', 'number', ['number']),
        exaStatistics_GetRayTraversals: cw(mod, 'exaStatistics_GetRayTraversals', 'boolean', ['number', 'number', 'number']),
        exaStatistics_GetRayHitTriangleCount: cw(mod, 'exaStatistics_GetRayHitTriangleCount', 'number', ['number']),
        exaStatistics_GetRayHitTriangles: cw(mod, 'exaStatistics_GetRayHitTriangles', 'boolean', ['number', 'number', 'number']),
        // ------------------------------------------------------------------------
        // Misc
        // ------------------------------------------------------------------------
        exaGetSortedIRDatas: cw(mod, 'exaGetSortedIRDatas', 'boolean', []),
        exaGetValidPathCount: cw(mod, 'exaGetValidPathCount', 'number', []),
        exaGetValidPaths: cw(mod, 'exaGetValidPaths', 'number', ['number', 'number']),
        exaFindAttenuationForDistance: cw(mod, 'exaFindAttenuationForDistance', 'number', ['number', 'number', 'number', 'number']),
        exaTestRayGeneration: cw(mod, 'exaTestRayGeneration', null, ['number', 'number', 'number']),
        // ------------------------------------------------------------------------
        // Listener
        // ------------------------------------------------------------------------
        exaNewListener: cw(mod, 'exaNewListener', 'number', []),
        exaDeleteListener: cw(mod, 'exaDeleteListener', null, ['number']),
        exaListenerGetTransform: cw(mod, 'exaListenerGetTransform', 'boolean', ['number', 'number']),
        exaListenerSetTransform: cw(mod, 'exaListenerSetTransform', 'boolean', ['number', 'number']),
        exaListenerGetPosition: cw(mod, 'exaListenerGetPosition', 'boolean', ['number', 'number']),
        /** ExaVec3f by value — the clang wasm32 ABI lowers 12-byte structs to an sret pointer. */
        exaListenerSetPosition: cw(mod, 'exaListenerSetPosition', 'boolean', ['number', 'number']),
        exaListenerGetVelocity: cw(mod, 'exaListenerGetVelocity', 'boolean', ['number', 'number']),
        exaListenerSetVelocity: cw(mod, 'exaListenerSetVelocity', 'boolean', ['number', 'number']),
        exaListenerSetOrientation: cw(mod, 'exaListenerSetOrientation', 'boolean', ['number', 'number']),
        exaListenerSetOrientation_Quaternion: cw(mod, 'exaListenerSetOrientation_Quaternion', 'boolean', ['number', 'number', 'number', 'number', 'number']),
        /** Receives ExaSTOption by pointer. */
        exaListenerGetOption: cw(mod, 'exaListenerGetOption', 'boolean', ['number', 'number']),
        /** ExaSTOption is passed through a temporary wasm buffer. */
        exaListenerSetOption: cw(mod, 'exaListenerSetOption', 'boolean', ['number', 'number']),
        exaListenerGetAudioOption: cw(mod, 'exaListenerGetAudioOption', 'boolean', ['number', 'number']),
        /** ExaAudioOption is passed through a temporary wasm buffer. */
        exaListenerSetAudioOption: cw(mod, 'exaListenerSetAudioOption', 'boolean', ['number', 'number']),
        exaListenerGetAmbientPhysicalFilterOption: cw(mod, 'exaListenerGetAmbientPhysicalFilterOption', 'boolean', ['number', 'number']),
        /** ExaAmbientPhysicalFilterOption is passed through a temporary wasm buffer. */
        exaListenerSetAmbientPhysicalFilterOption: cw(mod, 'exaListenerSetAmbientPhysicalFilterOption', 'boolean', ['number', 'number']),
        // Air absorption (v0.6 / ABI 2): atmospheric conditions for BOTH geometric and
        // ambient air absorption. The by-value option is lowered to a pointer arg.
        exaListenerGetAirAbsorptionOption: cw(mod, 'exaListenerGetAirAbsorptionOption', 'boolean', ['number', 'number']),
        exaListenerSetAirAbsorptionOption: cw(mod, 'exaListenerSetAirAbsorptionOption', 'boolean', ['number', 'number']),
        exaListenerSetLateReverbMode: cw(mod, 'exaListenerSetLateReverbMode', 'boolean', ['number', 'number']),
        exaListenerGetLateReverbMode: cw(mod, 'exaListenerGetLateReverbMode', 'boolean', ['number', 'number']),
        exaListenerSetPerBandLateReverb: cw(mod, 'exaListenerSetPerBandLateReverb', 'boolean', ['number', 'boolean']),
        exaListenerGetPerBandLateReverb: cw(mod, 'exaListenerGetPerBandLateReverb', 'boolean', ['number', 'number']),
        exaListenerSetHrtfMode: cw(mod, 'exaListenerSetHrtfMode', 'boolean', ['number', 'number']),
        exaListenerGetHrtfMode: cw(mod, 'exaListenerGetHrtfMode', 'boolean', ['number', 'number']),
        exaListenerSetDiffuseEnabled: cw(mod, 'exaListenerSetDiffuseEnabled', 'boolean', ['number', 'boolean']),
        exaListenerGetDiffuseEnabled: cw(mod, 'exaListenerGetDiffuseEnabled', 'boolean', ['number', 'number']),
        exaListenerSetDiffuseQuality: cw(mod, 'exaListenerSetDiffuseQuality', 'boolean', ['number', 'number']),
        exaListenerGetDiffuseQuality: cw(mod, 'exaListenerGetDiffuseQuality', 'boolean', ['number', 'number']),
        exaListenerSetHrtfQuality: cw(mod, 'exaListenerSetHrtfQuality', 'boolean', ['number', 'number']),
        exaListenerGetHrtfQuality: cw(mod, 'exaListenerGetHrtfQuality', 'boolean', ['number', 'number']),
        exaListenerSetEarlyRenderPathBudget: cw(mod, 'exaListenerSetEarlyRenderPathBudget', 'boolean', ['number', 'number']),
        exaListenerGetEarlyRenderPathBudget: cw(mod, 'exaListenerGetEarlyRenderPathBudget', 'boolean', ['number', 'number']),
        exaListenerSetDelayInterpolation: cw(mod, 'exaListenerSetDelayInterpolation', 'boolean', ['number', 'number']),
        exaListenerGetDelayInterpolation: cw(mod, 'exaListenerGetDelayInterpolation', 'boolean', ['number', 'number']),
        exaListenerLoadParametricHrtf: cw(mod, 'exaListenerLoadParametricHrtf', 'boolean', ['number', 'number', 'number']),
        exaListenerLoadConvolutionHrtf: cw(mod, 'exaListenerLoadConvolutionHrtf', 'boolean', ['number', 'number', 'number']),
        // Perceptual-depth adaptation (v0.6 / ABI 2): GLOBAL (no listener id), pointer arg.
        exaPropagatorGetPerceptualDepthOption: cw(mod, 'exaPropagatorGetPerceptualDepthOption', 'boolean', ['number']),
        exaPropagatorSetPerceptualDepthOption: cw(mod, 'exaPropagatorSetPerceptualDepthOption', 'boolean', ['number']),
        exaListenerSetPathEnable: cw(mod, 'exaListenerSetPathEnable', 'boolean', ['number', 'number', 'boolean']),
        exaListenerIsPathEnabled: cw(mod, 'exaListenerIsPathEnabled', 'boolean', ['number', 'number', 'number']),
        exaListenerSetRayCount: cw(mod, 'exaListenerSetRayCount', 'boolean', ['number', 'number', 'number']),
        exaListenerGetRayCount: cw(mod, 'exaListenerGetRayCount', 'boolean', ['number', 'number', 'number']),
        exaListenerSetRayDepth: cw(mod, 'exaListenerSetRayDepth', 'boolean', ['number', 'number']),
        exaListenerGetRayDepth: cw(mod, 'exaListenerGetRayDepth', 'boolean', ['number', 'number']),
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
    };
}
//# sourceMappingURL=bindings-render-listener.js.map