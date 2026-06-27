import type { ExaSoundModule } from '../types.js';
import { cw, makeGpuEnable } from './binding-utils.js';

export function makeCoreSceneBindings(mod: ExaSoundModule) {
  return {
    exaGetVersion: cw<void, [maj: number, min: number, rev: number]>(
      mod, 'exaGetVersion', null, ['number', 'number', 'number']),
    exaGetPathTypeCount: cw<number, []>(mod, 'exaGetPathTypeCount', 'number', []),
    exaGetLastError: cw<string, []>(mod, 'exaGetLastError', 'string', []),
    exaGetRuntimeOption: cw<boolean, [outPtr: number]>(
      mod, 'exaGetRuntimeOption', 'boolean', ['number']),
    exaSetRuntimeOption: cw<boolean, [optionPtr: number]>(
      mod, 'exaSetRuntimeOption', 'boolean', ['number']),
    exaGetDefaultMeshBuildOption: cw<boolean, [outPtr: number]>(
      mod, 'exaGetDefaultMeshBuildOption', 'boolean', ['number']),
    exaSetDefaultMeshBuildOption: cw<boolean, [optionPtr: number]>(
      mod, 'exaSetDefaultMeshBuildOption', 'boolean', ['number']),

    // ------------------------------------------------------------------------
    // Propagator queries (sceneID is i64 in the C API but always fits in 32 bits in practice).
    // ------------------------------------------------------------------------
    exaPropagatorGetGuidePlaneCount: cw<number, [sceneID: number]>(
      mod, 'exaPropagatorGetGuidePlaneCount', 'number', ['number']),
    exaPropagatorGetGuidePlanes: cw<boolean, [sceneID: number, outPtr: number, maxCount: number]>(
      mod, 'exaPropagatorGetGuidePlanes', 'boolean', ['number', 'number', 'number']),
    exaPropagatorGetAmbientSoundPathCount: cw<number, [sceneID: number]>(
      mod, 'exaPropagatorGetAmbientSoundPathCount', 'number', ['number']),
    exaPropagatorGetAmbientSoundPaths: cw<boolean, [sceneID: number, outPtr: number, maxCount: number]>(
      mod, 'exaPropagatorGetAmbientSoundPaths', 'boolean', ['number', 'number', 'number']),
    exaPropagatorGetMirrorPositionCount: cw<number, [sceneID: number]>(
      mod, 'exaPropagatorGetMirrorPositionCount', 'number', ['number']),
    exaPropagatorGetMirrorPositions: cw<boolean, [sceneID: number, outPtr: number, maxCount: number]>(
      mod, 'exaPropagatorGetMirrorPositions', 'boolean', ['number', 'number', 'number']),
    exaPropagatorGetProfile: cw<boolean, [outPtr: number]>(
      mod, 'exaPropagatorGetProfile', 'boolean', ['number']),
    exaUpdatePropagation: cw<number, [sceneID: number]>(
      mod, 'exaUpdatePropagation', 'number', ['number']),
    exaPropagatorSetJobTimingOption: cw<boolean, [optionPtr: number]>(
      mod, 'exaPropagatorSetJobTimingOption', 'boolean', ['number']),
    exaPropagatorGetJobTimingFrames: cw<number, [sceneID: number, outPtr: number, maxFrames: number]>(
      mod, 'exaPropagatorGetJobTimingFrames', 'number', ['number', 'number', 'number']),
    exaPropagatorResetJobTiming: cw<boolean, []>(
      mod, 'exaPropagatorResetJobTiming', 'boolean', []),
    exaPropagatorGetEffectiveMaxDepth: cw<number, []>(
      mod, 'exaPropagatorGetEffectiveMaxDepth', 'number', []),
    exaPropagatorGetSourceEffectiveMaxDepth: cw<number, [sourceID: number]>(
      mod, 'exaPropagatorGetSourceEffectiveMaxDepth', 'number', ['number']),

    // ------------------------------------------------------------------------
    // Scene
    // ------------------------------------------------------------------------
    exaNewScene: cw<number, []>(mod, 'exaNewScene', 'number', []),
    exaDeleteScene: cw<void, [scId: number]>(mod, 'exaDeleteScene', null, ['number']),
    exaTickScene: cw<void, [scId: number, dt: number]>(mod, 'exaTickScene', null, ['number', 'number']),
    exaSceneGetObjectCount: cw<number, [sceneID: number]>(mod, 'exaSceneGetObjectCount', 'number', ['number']),
    exaSceneAddObject: cw<boolean, [sceneID: number, objectID: number]>(
      mod, 'exaSceneAddObject', 'boolean', ['number', 'number']),
    exaSceneRemoveObject: cw<boolean, [sceneID: number, objectID: number]>(
      mod, 'exaSceneRemoveObject', 'boolean', ['number', 'number']),
    exaSceneClearObjects: cw<boolean, [sceneID: number]>(mod, 'exaSceneClearObjects', 'boolean', ['number']),
    exaSceneGetSourceCount: cw<boolean, [sceneID: number, outPtr: number]>(
      mod, 'exaSceneGetSourceCount', 'boolean', ['number', 'number']),
    exaSceneAddSource: cw<boolean, [sceneID: number, sourceID: number]>(
      mod, 'exaSceneAddSource', 'boolean', ['number', 'number']),
    exaSceneRemoveSource: cw<boolean, [sceneID: number, sourceID: number]>(
      mod, 'exaSceneRemoveSource', 'boolean', ['number', 'number']),
    exaSceneClearSources: cw<boolean, [sceneID: number]>(mod, 'exaSceneClearSources', 'boolean', ['number']),
    exaSceneGetListenerCount: cw<boolean, [sceneID: number, outPtr: number]>(
      mod, 'exaSceneGetListenerCount', 'boolean', ['number', 'number']),
    exaSceneAddListener: cw<boolean, [sceneID: number, listenerID: number]>(
      mod, 'exaSceneAddListener', 'boolean', ['number', 'number']),
    exaSceneRemoveListener: cw<boolean, [sceneID: number, listenerID: number]>(
      mod, 'exaSceneRemoveListener', 'boolean', ['number', 'number']),
    exaSceneClearListeners: cw<boolean, [sceneID: number]>(mod, 'exaSceneClearListeners', 'boolean', ['number']),

  };
}
