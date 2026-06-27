import type { ExaSoundModule } from '../types.js';
export declare function makeRenderListenerBindings(mod: ExaSoundModule): {
    exaRenderSound: import("./binding-utils.js").JsFn<boolean, [listenerID: number, soundSourceID: number, inPtr: number, inputLength: number, frameCount: number, channelCount: number, outPtr: number, outputLength: number]>;
    exaSetMaxDelay: import("./binding-utils.js").JsFn<boolean, [lid: number, sid: number, v: number]>;
    exaSetPathFadeTime: import("./binding-utils.js").JsFn<boolean, [lid: number, sid: number, v: number]>;
    exaSetMaxDelayRate: import("./binding-utils.js").JsFn<boolean, [lid: number, sid: number, v: number]>;
    exaGetMaxDelayRate: import("./binding-utils.js").JsFn<boolean, [lid: number, sid: number, outPtr: number]>;
    exaGetStatistics: import("./binding-utils.js").JsFn<boolean, [lid: number, sid: number, outPtr: number, len: number]>;
    exaListenerClearRenderState: import("./binding-utils.js").JsFn<boolean, [lid: number]>;
    exaSetMemoryTraceOption: import("./binding-utils.js").JsFn<boolean, [optPtr: number]>;
    exaMemoryTraceMark: import("./binding-utils.js").JsFn<boolean, [tag: string]>;
    exaGetMemoryTraceSnapshot: import("./binding-utils.js").JsFn<boolean, [outPtr: number]>;
    exaStatistics_GetRayTraversalCount: import("./binding-utils.js").JsFn<number, [type: number]>;
    exaStatistics_GetRayTraversals: import("./binding-utils.js").JsFn<boolean, [type: number, outPtr: number, count: number]>;
    exaStatistics_GetRayHitTriangleCount: import("./binding-utils.js").JsFn<number, [type: number]>;
    exaStatistics_GetRayHitTriangles: import("./binding-utils.js").JsFn<boolean, [type: number, outPtr: number, count: number]>;
    exaGetSortedIRDatas: import("./binding-utils.js").JsFn<boolean, []>;
    exaGetValidPathCount: import("./binding-utils.js").JsFn<number, []>;
    exaGetValidPaths: import("./binding-utils.js").JsFn<number, [outPtr: number, count: number]>;
    exaFindAttenuationForDistance: import("./binding-utils.js").JsFn<number, [sceneID: number, sourceID: number, pathType: number, targetAtten: number]>;
    exaTestRayGeneration: import("./binding-utils.js").JsFn<void, [outPtr: number, w: number, h: number]>;
    exaNewListener: import("./binding-utils.js").JsFn<number, []>;
    exaDeleteListener: import("./binding-utils.js").JsFn<void, [id: number]>;
    exaListenerGetTransform: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetTransform: import("./binding-utils.js").JsFn<boolean, [id: number, tPtr: number]>;
    exaListenerGetPosition: import("./binding-utils.js").JsFn<boolean, [id: number, outVec3Ptr: number]>;
    /** ExaVec3f by value — the clang wasm32 ABI lowers 12-byte structs to an sret pointer. */
    exaListenerSetPosition: import("./binding-utils.js").JsFn<boolean, [id: number, vec3Ptr: number]>;
    exaListenerGetVelocity: import("./binding-utils.js").JsFn<boolean, [id: number, outVec3Ptr: number]>;
    exaListenerSetVelocity: import("./binding-utils.js").JsFn<boolean, [id: number, vec3Ptr: number]>;
    exaListenerSetOrientation: import("./binding-utils.js").JsFn<boolean, [id: number, mat3x3Ptr: number]>;
    exaListenerSetOrientation_Quaternion: import("./binding-utils.js").JsFn<boolean, [id: number, qx: number, qy: number, qz: number, qw: number]>;
    /** Receives ExaSTOption by pointer. */
    exaListenerGetOption: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    /** ExaSTOption is passed through a temporary wasm buffer. */
    exaListenerSetOption: import("./binding-utils.js").JsFn<boolean, [id: number, optPtr: number]>;
    exaListenerGetAudioOption: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    /** ExaAudioOption is passed through a temporary wasm buffer. */
    exaListenerSetAudioOption: import("./binding-utils.js").JsFn<boolean, [id: number, optPtr: number]>;
    exaListenerGetAmbientPhysicalFilterOption: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    /** ExaAmbientPhysicalFilterOption is passed through a temporary wasm buffer. */
    exaListenerSetAmbientPhysicalFilterOption: import("./binding-utils.js").JsFn<boolean, [id: number, optPtr: number]>;
    exaListenerGetAirAbsorptionOption: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetAirAbsorptionOption: import("./binding-utils.js").JsFn<boolean, [id: number, optPtr: number]>;
    exaListenerSetLateReverbMode: import("./binding-utils.js").JsFn<boolean, [id: number, mode: number]>;
    exaListenerGetLateReverbMode: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetPerBandLateReverb: import("./binding-utils.js").JsFn<boolean, [id: number, enabled: boolean]>;
    exaListenerGetPerBandLateReverb: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetHrtfMode: import("./binding-utils.js").JsFn<boolean, [id: number, mode: number]>;
    exaListenerGetHrtfMode: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetDiffuseEnabled: import("./binding-utils.js").JsFn<boolean, [id: number, enabled: boolean]>;
    exaListenerGetDiffuseEnabled: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetDiffuseQuality: import("./binding-utils.js").JsFn<boolean, [id: number, quality: number]>;
    exaListenerGetDiffuseQuality: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetHrtfQuality: import("./binding-utils.js").JsFn<boolean, [id: number, quality: number]>;
    exaListenerGetHrtfQuality: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetEarlyRenderPathBudget: import("./binding-utils.js").JsFn<boolean, [id: number, budget: number]>;
    exaListenerGetEarlyRenderPathBudget: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerSetDelayInterpolation: import("./binding-utils.js").JsFn<boolean, [id: number, mode: number]>;
    exaListenerGetDelayInterpolation: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaListenerLoadParametricHrtf: import("./binding-utils.js").JsFn<boolean, [id: number, dataPtr: number, length: number]>;
    exaListenerLoadConvolutionHrtf: import("./binding-utils.js").JsFn<boolean, [id: number, dataPtr: number, length: number]>;
    exaPropagatorGetPerceptualDepthOption: import("./binding-utils.js").JsFn<boolean, [outPtr: number]>;
    exaPropagatorSetPerceptualDepthOption: import("./binding-utils.js").JsFn<boolean, [optPtr: number]>;
    exaListenerSetPathEnable: import("./binding-utils.js").JsFn<boolean, [id: number, pathType: number, enabled: boolean]>;
    exaListenerIsPathEnabled: import("./binding-utils.js").JsFn<boolean, [id: number, pathType: number, outPtr: number]>;
    exaListenerSetRayCount: import("./binding-utils.js").JsFn<boolean, [id: number, w: number, h: number]>;
    exaListenerGetRayCount: import("./binding-utils.js").JsFn<boolean, [id: number, wPtr: number, hPtr: number]>;
    exaListenerSetRayDepth: import("./binding-utils.js").JsFn<boolean, [id: number, d: number]>;
    exaListenerGetRayDepth: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exa_audio_worklet_init: import("./binding-utils.js").JsFn<void, [ctxHandle: number, onReadyPtr: number, userDataPtr: number]>;
    exa_audio_worklet_create_node: import("./binding-utils.js").JsFn<number, [ctxHandle: number, listenerID: number, sourceID: number, channels: number]>;
    exa_audio_worklet_create_mixer_node: import("./binding-utils.js").JsFn<number, [ctxHandle: number, listenerID: number, sourceIDsPtr: number, sourceCount: number, channels: number]>;
};
//# sourceMappingURL=bindings-render-listener.d.ts.map