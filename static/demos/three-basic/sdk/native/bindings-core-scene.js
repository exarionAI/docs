import { cw } from './binding-utils.js';
export function makeCoreSceneBindings(mod) {
    return {
        exaGetVersion: cw(mod, 'exaGetVersion', null, ['number', 'number', 'number']),
        exaGetPathTypeCount: cw(mod, 'exaGetPathTypeCount', 'number', []),
        exaGetLastError: cw(mod, 'exaGetLastError', 'string', []),
        exaGetRuntimeOption: cw(mod, 'exaGetRuntimeOption', 'boolean', ['number']),
        exaSetRuntimeOption: cw(mod, 'exaSetRuntimeOption', 'boolean', ['number']),
        exaGetDefaultMeshBuildOption: cw(mod, 'exaGetDefaultMeshBuildOption', 'boolean', ['number']),
        exaSetDefaultMeshBuildOption: cw(mod, 'exaSetDefaultMeshBuildOption', 'boolean', ['number']),
        // ------------------------------------------------------------------------
        // Propagator queries (sceneID is i64 in the C API but always fits in 32 bits in practice).
        // ------------------------------------------------------------------------
        exaPropagatorGetGuidePlaneCount: cw(mod, 'exaPropagatorGetGuidePlaneCount', 'number', ['number']),
        exaPropagatorGetGuidePlanes: cw(mod, 'exaPropagatorGetGuidePlanes', 'boolean', ['number', 'number', 'number']),
        exaPropagatorGetAmbientSoundPathCount: cw(mod, 'exaPropagatorGetAmbientSoundPathCount', 'number', ['number']),
        exaPropagatorGetAmbientSoundPaths: cw(mod, 'exaPropagatorGetAmbientSoundPaths', 'boolean', ['number', 'number', 'number']),
        exaPropagatorGetMirrorPositionCount: cw(mod, 'exaPropagatorGetMirrorPositionCount', 'number', ['number']),
        exaPropagatorGetMirrorPositions: cw(mod, 'exaPropagatorGetMirrorPositions', 'boolean', ['number', 'number', 'number']),
        exaPropagatorGetProfile: cw(mod, 'exaPropagatorGetProfile', 'boolean', ['number']),
        exaUpdatePropagation: cw(mod, 'exaUpdatePropagation', 'number', ['number']),
        exaPropagatorSetJobTimingOption: cw(mod, 'exaPropagatorSetJobTimingOption', 'boolean', ['number']),
        exaPropagatorGetJobTimingFrames: cw(mod, 'exaPropagatorGetJobTimingFrames', 'number', ['number', 'number', 'number']),
        exaPropagatorResetJobTiming: cw(mod, 'exaPropagatorResetJobTiming', 'boolean', []),
        exaPropagatorGetEffectiveMaxDepth: cw(mod, 'exaPropagatorGetEffectiveMaxDepth', 'number', []),
        exaPropagatorGetSourceEffectiveMaxDepth: cw(mod, 'exaPropagatorGetSourceEffectiveMaxDepth', 'number', ['number']),
        // ------------------------------------------------------------------------
        // Scene
        // ------------------------------------------------------------------------
        exaNewScene: cw(mod, 'exaNewScene', 'number', []),
        exaDeleteScene: cw(mod, 'exaDeleteScene', null, ['number']),
        exaTickScene: cw(mod, 'exaTickScene', null, ['number', 'number']),
        exaSceneGetObjectCount: cw(mod, 'exaSceneGetObjectCount', 'number', ['number']),
        exaSceneAddObject: cw(mod, 'exaSceneAddObject', 'boolean', ['number', 'number']),
        exaSceneRemoveObject: cw(mod, 'exaSceneRemoveObject', 'boolean', ['number', 'number']),
        exaSceneClearObjects: cw(mod, 'exaSceneClearObjects', 'boolean', ['number']),
        exaSceneGetSourceCount: cw(mod, 'exaSceneGetSourceCount', 'boolean', ['number', 'number']),
        exaSceneAddSource: cw(mod, 'exaSceneAddSource', 'boolean', ['number', 'number']),
        exaSceneRemoveSource: cw(mod, 'exaSceneRemoveSource', 'boolean', ['number', 'number']),
        exaSceneClearSources: cw(mod, 'exaSceneClearSources', 'boolean', ['number']),
        exaSceneGetListenerCount: cw(mod, 'exaSceneGetListenerCount', 'boolean', ['number', 'number']),
        exaSceneAddListener: cw(mod, 'exaSceneAddListener', 'boolean', ['number', 'number']),
        exaSceneRemoveListener: cw(mod, 'exaSceneRemoveListener', 'boolean', ['number', 'number']),
        exaSceneClearListeners: cw(mod, 'exaSceneClearListeners', 'boolean', ['number']),
    };
}
//# sourceMappingURL=bindings-core-scene.js.map