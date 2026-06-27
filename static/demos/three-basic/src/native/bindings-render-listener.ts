import type { ExaSoundModule } from '../types.js';
import { cw, optionalCw, missingAudioWorkletExport } from './binding-utils.js';

export function makeRenderListenerBindings(mod: ExaSoundModule) {
  return {
    exaRenderSound: cw<boolean,
      [listenerID: number, soundSourceID: number, inPtr: number, inputLength: number,
       frameCount: number, channelCount: number, outPtr: number, outputLength: number]>(
      mod, 'exaRenderSound', 'boolean',
      ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),

    // Auralization — config
    exaSetMaxDelay: cw<boolean, [lid: number, sid: number, v: number]>(
      mod, 'exaSetMaxDelay', 'boolean', ['number', 'number', 'number']),
    exaSetPathFadeTime: cw<boolean, [lid: number, sid: number, v: number]>(
      mod, 'exaSetPathFadeTime', 'boolean', ['number', 'number', 'number']),
    exaSetMaxDelayRate: cw<boolean, [lid: number, sid: number, v: number]>(
      mod, 'exaSetMaxDelayRate', 'boolean', ['number', 'number', 'number']),
    exaGetMaxDelayRate: cw<boolean, [lid: number, sid: number, outPtr: number]>(
      mod, 'exaGetMaxDelayRate', 'boolean', ['number', 'number', 'number']),

    // Auralization — stats
    exaGetStatistics: cw<boolean, [lid: number, sid: number, outPtr: number, len: number]>(
      mod, 'exaGetStatistics', 'boolean', ['number', 'number', 'number', 'number']),
    exaListenerClearRenderState: cw<boolean, [lid: number]>(
      mod, 'exaListenerClearRenderState', 'boolean', ['number']),

    // ------------------------------------------------------------------------
    // Memory Trace
    // ------------------------------------------------------------------------
    exaSetMemoryTraceOption: cw<boolean, [optPtr: number]>(
      mod, 'exaSetMemoryTraceOption', 'boolean', ['number']),
    exaMemoryTraceMark: cw<boolean, [tag: string]>(mod, 'exaMemoryTraceMark', 'boolean', ['string']),
    exaGetMemoryTraceSnapshot: cw<boolean, [outPtr: number]>(
      mod, 'exaGetMemoryTraceSnapshot', 'boolean', ['number']),

    // ------------------------------------------------------------------------
    // Statistics (ray traversals / hit triangles)
    // ------------------------------------------------------------------------
    exaStatistics_GetRayTraversalCount: cw<number, [type: number]>(
      mod, 'exaStatistics_GetRayTraversalCount', 'number', ['number']),
    exaStatistics_GetRayTraversals: cw<boolean, [type: number, outPtr: number, count: number]>(
      mod, 'exaStatistics_GetRayTraversals', 'boolean', ['number', 'number', 'number']),
    exaStatistics_GetRayHitTriangleCount: cw<number, [type: number]>(
      mod, 'exaStatistics_GetRayHitTriangleCount', 'number', ['number']),
    exaStatistics_GetRayHitTriangles: cw<boolean, [type: number, outPtr: number, count: number]>(
      mod, 'exaStatistics_GetRayHitTriangles', 'boolean', ['number', 'number', 'number']),

    // ------------------------------------------------------------------------
    // Misc
    // ------------------------------------------------------------------------
    exaGetSortedIRDatas: cw<boolean, []>(mod, 'exaGetSortedIRDatas', 'boolean', []),
    exaGetValidPathCount: cw<number, []>(mod, 'exaGetValidPathCount', 'number', []),
    exaGetValidPaths: cw<number, [outPtr: number, count: number]>(
      mod, 'exaGetValidPaths', 'number', ['number', 'number']),
    exaFindAttenuationForDistance: cw<number,
      [sceneID: number, sourceID: number, pathType: number, targetAtten: number]>(
      mod, 'exaFindAttenuationForDistance', 'number',
      ['number', 'number', 'number', 'number']),
    exaTestRayGeneration: cw<void, [outPtr: number, w: number, h: number]>(
      mod, 'exaTestRayGeneration', null, ['number', 'number', 'number']),

    // ------------------------------------------------------------------------
    // Listener
    // ------------------------------------------------------------------------
    exaNewListener: cw<number, []>(mod, 'exaNewListener', 'number', []),
    exaDeleteListener: cw<void, [id: number]>(mod, 'exaDeleteListener', null, ['number']),
    exaListenerGetTransform: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetTransform', 'boolean', ['number', 'number']),
    exaListenerSetTransform: cw<boolean, [id: number, tPtr: number]>(
      mod, 'exaListenerSetTransform', 'boolean', ['number', 'number']),
    exaListenerGetPosition: cw<boolean, [id: number, outVec3Ptr: number]>(
      mod, 'exaListenerGetPosition', 'boolean', ['number', 'number']),
    /** ExaVec3f by value — the clang wasm32 ABI lowers 12-byte structs to an sret pointer. */
    exaListenerSetPosition: cw<boolean, [id: number, vec3Ptr: number]>(
      mod, 'exaListenerSetPosition', 'boolean', ['number', 'number']),
    exaListenerGetVelocity: cw<boolean, [id: number, outVec3Ptr: number]>(
      mod, 'exaListenerGetVelocity', 'boolean', ['number', 'number']),
    exaListenerSetVelocity: cw<boolean, [id: number, vec3Ptr: number]>(
      mod, 'exaListenerSetVelocity', 'boolean', ['number', 'number']),
    exaListenerSetOrientation: cw<boolean, [id: number, mat3x3Ptr: number]>(
      mod, 'exaListenerSetOrientation', 'boolean', ['number', 'number']),
    exaListenerSetOrientation_Quaternion: cw<boolean,
      [id: number, qx: number, qy: number, qz: number, qw: number]>(
      mod, 'exaListenerSetOrientation_Quaternion', 'boolean',
      ['number', 'number', 'number', 'number', 'number']),
    /** Receives ExaSTOption by pointer. */
    exaListenerGetOption: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetOption', 'boolean', ['number', 'number']),
    /** ExaSTOption is passed through a temporary wasm buffer. */
    exaListenerSetOption: cw<boolean, [id: number, optPtr: number]>(
      mod, 'exaListenerSetOption', 'boolean', ['number', 'number']),
    exaListenerGetAudioOption: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetAudioOption', 'boolean', ['number', 'number']),
    /** ExaAudioOption is passed through a temporary wasm buffer. */
    exaListenerSetAudioOption: cw<boolean, [id: number, optPtr: number]>(
      mod, 'exaListenerSetAudioOption', 'boolean', ['number', 'number']),
    exaListenerGetAmbientPhysicalFilterOption: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetAmbientPhysicalFilterOption', 'boolean', ['number', 'number']),
    /** ExaAmbientPhysicalFilterOption is passed through a temporary wasm buffer. */
    exaListenerSetAmbientPhysicalFilterOption: cw<boolean, [id: number, optPtr: number]>(
      mod, 'exaListenerSetAmbientPhysicalFilterOption', 'boolean', ['number', 'number']),
    // Air absorption (v0.6 / ABI 2): atmospheric conditions for BOTH geometric and
    // ambient air absorption. The by-value option is lowered to a pointer arg.
    exaListenerGetAirAbsorptionOption: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetAirAbsorptionOption', 'boolean', ['number', 'number']),
    exaListenerSetAirAbsorptionOption: cw<boolean, [id: number, optPtr: number]>(
      mod, 'exaListenerSetAirAbsorptionOption', 'boolean', ['number', 'number']),
    exaListenerSetLateReverbMode: cw<boolean, [id: number, mode: number]>(
      mod, 'exaListenerSetLateReverbMode', 'boolean', ['number', 'number']),
    exaListenerGetLateReverbMode: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetLateReverbMode', 'boolean', ['number', 'number']),
    exaListenerSetPerBandLateReverb: cw<boolean, [id: number, enabled: boolean]>(
      mod, 'exaListenerSetPerBandLateReverb', 'boolean', ['number', 'boolean']),
    exaListenerGetPerBandLateReverb: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetPerBandLateReverb', 'boolean', ['number', 'number']),
    exaListenerSetHrtfMode: cw<boolean, [id: number, mode: number]>(
      mod, 'exaListenerSetHrtfMode', 'boolean', ['number', 'number']),
    exaListenerGetHrtfMode: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetHrtfMode', 'boolean', ['number', 'number']),
    exaListenerSetDiffuseEnabled: cw<boolean, [id: number, enabled: boolean]>(
      mod, 'exaListenerSetDiffuseEnabled', 'boolean', ['number', 'boolean']),
    exaListenerGetDiffuseEnabled: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetDiffuseEnabled', 'boolean', ['number', 'number']),
    exaListenerSetDiffuseQuality: cw<boolean, [id: number, quality: number]>(
      mod, 'exaListenerSetDiffuseQuality', 'boolean', ['number', 'number']),
    exaListenerGetDiffuseQuality: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetDiffuseQuality', 'boolean', ['number', 'number']),
    exaListenerSetHrtfQuality: cw<boolean, [id: number, quality: number]>(
      mod, 'exaListenerSetHrtfQuality', 'boolean', ['number', 'number']),
    exaListenerGetHrtfQuality: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetHrtfQuality', 'boolean', ['number', 'number']),
    exaListenerSetEarlyRenderPathBudget: cw<boolean, [id: number, budget: number]>(
      mod, 'exaListenerSetEarlyRenderPathBudget', 'boolean', ['number', 'number']),
    exaListenerGetEarlyRenderPathBudget: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetEarlyRenderPathBudget', 'boolean', ['number', 'number']),
    exaListenerSetDelayInterpolation: cw<boolean, [id: number, mode: number]>(
      mod, 'exaListenerSetDelayInterpolation', 'boolean', ['number', 'number']),
    exaListenerGetDelayInterpolation: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetDelayInterpolation', 'boolean', ['number', 'number']),
    exaListenerLoadParametricHrtf: cw<boolean, [id: number, dataPtr: number, length: number]>(
      mod, 'exaListenerLoadParametricHrtf', 'boolean', ['number', 'number', 'number']),
    exaListenerLoadConvolutionHrtf: cw<boolean, [id: number, dataPtr: number, length: number]>(
      mod, 'exaListenerLoadConvolutionHrtf', 'boolean', ['number', 'number', 'number']),
    // Perceptual-depth adaptation (v0.6 / ABI 2): GLOBAL (no listener id), pointer arg.
    exaPropagatorGetPerceptualDepthOption: cw<boolean, [outPtr: number]>(
      mod, 'exaPropagatorGetPerceptualDepthOption', 'boolean', ['number']),
    exaPropagatorSetPerceptualDepthOption: cw<boolean, [optPtr: number]>(
      mod, 'exaPropagatorSetPerceptualDepthOption', 'boolean', ['number']),
    exaListenerSetPathEnable: cw<boolean, [id: number, pathType: number, enabled: boolean]>(
      mod, 'exaListenerSetPathEnable', 'boolean', ['number', 'number', 'boolean']),
    exaListenerIsPathEnabled: cw<boolean, [id: number, pathType: number, outPtr: number]>(
      mod, 'exaListenerIsPathEnabled', 'boolean', ['number', 'number', 'number']),
    exaListenerSetRayCount: cw<boolean, [id: number, w: number, h: number]>(
      mod, 'exaListenerSetRayCount', 'boolean', ['number', 'number', 'number']),
    exaListenerGetRayCount: cw<boolean, [id: number, wPtr: number, hPtr: number]>(
      mod, 'exaListenerGetRayCount', 'boolean', ['number', 'number', 'number']),
    exaListenerSetRayDepth: cw<boolean, [id: number, d: number]>(
      mod, 'exaListenerSetRayDepth', 'boolean', ['number', 'number']),
    exaListenerGetRayDepth: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaListenerGetRayDepth', 'boolean', ['number', 'number']),
    // ------------------------------------------------------------------------
    // Web Audio Worklet — only present in the standalone wasm build with
    // -sAUDIO_WORKLET=1. In other builds cwrap returns a stub that throws on
    // the first call; SoundTrace.createWorkletNode() guards before invoking
    // these so the user gets a clearer error message.
    // ------------------------------------------------------------------------
    /// One-time bootstrap. `onReadyPtr` is a function pointer produced by
    /// `addFunction(cb, 'vi')`.
    exa_audio_worklet_init: optionalCw<void, [ctxHandle: number, onReadyPtr: number, userDataPtr: number]>(
      mod, 'exa_audio_worklet_init', null, ['number', 'number', 'number'],
      () => missingAudioWorkletExport('exa_audio_worklet_init')),
    /// Creates an AudioWorkletNode for the given (listener, source) pair.
    /// Returns 0 if init is incomplete or allocation failed.
    exa_audio_worklet_create_node:
      optionalCw<number, [ctxHandle: number, listenerID: number, sourceID: number, channels: number]>(
        mod, 'exa_audio_worklet_create_node', 'number',
        ['number', 'number', 'number', 'number'],
        () => missingAudioWorkletExport('exa_audio_worklet_create_node')),
    /// Creates one AudioWorkletNode that renders and mixes multiple sources.
    exa_audio_worklet_create_mixer_node:
      optionalCw<number, [
        ctxHandle: number,
        listenerID: number,
        sourceIDsPtr: number,
        sourceCount: number,
        channels: number,
      ]>(
        mod, 'exa_audio_worklet_create_mixer_node', 'number',
        ['number', 'number', 'number', 'number', 'number'],
        () => missingAudioWorkletExport('exa_audio_worklet_create_mixer_node')),
  };
}
