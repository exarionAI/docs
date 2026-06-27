import type { ExaSoundModule } from '../types.js';
import { cw } from './binding-utils.js';

export function makeObjectSourceBindings(mod: ExaSoundModule) {
  return {
    exaNewObject: cw<number, []>(mod, 'exaNewObject', 'number', []),
    exaDeleteObject: cw<void, [objectID: number]>(mod, 'exaDeleteObject', null, ['number']),
    exaObjectSetUpdateType: cw<boolean, [objectID: number, t: number]>(
      mod, 'exaObjectSetUpdateType', 'boolean', ['number', 'number']),
    exaObjectgetUpdateType: cw<number, [objectID: number]>(mod, 'exaObjectgetUpdateType', 'number', ['number']),
    exaObjectGetPosition: cw<boolean, [id: number, x: number, y: number, z: number]>(
      mod, 'exaObjectGetPosition', 'boolean', ['number', 'number', 'number', 'number']),
    exaObjectSetPosition: cw<boolean, [id: number, x: number, y: number, z: number]>(
      mod, 'exaObjectSetPosition', 'boolean', ['number', 'number', 'number', 'number']),
    exaObjectGetRotation: cw<boolean, [id: number, qx: number, qy: number, qz: number, qw: number]>(
      mod, 'exaObjectGetRotation', 'boolean', ['number', 'number', 'number', 'number', 'number']),
    exaObjectSetRotation: cw<boolean, [id: number, qx: number, qy: number, qz: number, qw: number]>(
      mod, 'exaObjectSetRotation', 'boolean', ['number', 'number', 'number', 'number', 'number']),
    exaObjectGetScale: cw<boolean, [id: number, sx: number, sy: number, sz: number]>(
      mod, 'exaObjectGetScale', 'boolean', ['number', 'number', 'number', 'number']),
    exaObjectSetScale: cw<boolean, [id: number, sx: number, sy: number, sz: number]>(
      mod, 'exaObjectSetScale', 'boolean', ['number', 'number', 'number', 'number']),
    exaObjectGetMesh: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaObjectGetMesh', 'boolean', ['number', 'number']),
    exaObjectSetMesh: cw<boolean, [id: number, meshID: number]>(
      mod, 'exaObjectSetMesh', 'boolean', ['number', 'number']),

    // ------------------------------------------------------------------------
    // Mesh
    // ------------------------------------------------------------------------
    exaNewMesh: cw<number, []>(mod, 'exaNewMesh', 'number', []),
    exaDeleteMesh: cw<void, [mesh: number]>(mod, 'exaDeleteMesh', null, ['number']),
    exaMeshSetData: cw<boolean, [mesh: number, vertsPtr: number, numVerts: number,
                                 trisPtr: number, numTris: number,
                                 bvhMaxDepth: number, primPerLeaf: number, bvhType: number]>(
      mod, 'exaMeshSetData', 'boolean',
      ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),
    exaGetSoundMesh: cw<number, [path: string]>(mod, 'exaGetSoundMesh', 'number', ['string']),
    exaRegisterMesh: cw<boolean, [path: string, meshID: number]>(
      mod, 'exaRegisterMesh', 'boolean', ['string', 'number']),
    exaGetSoundMeshVrtsTrisAll: cw<boolean, [meshID: number, outPtrPtr: number, outCountPtr: number]>(
      mod, 'exaGetSoundMeshVrtsTrisAll', 'boolean', ['number', 'number', 'number']),
    exaMeshUpdateVertices: cw<boolean, [meshID: number, vertsPtr: number, numVerts: number]>(
      mod, 'exaMeshUpdateVertices', 'boolean', ['number', 'number', 'number']),
    exaMeshRefit: cw<boolean, [meshID: number]>(mod, 'exaMeshRefit', 'boolean', ['number']),
    exaMeshSetMaterial: cw<boolean, [meshID: number, matIdx: number]>(
      mod, 'exaMeshSetMaterial', 'boolean', ['number', 'number']),
    exaMeshSetMaterialRange: cw<boolean, [meshID: number, triStart: number, triCount: number, matIdx: number]>(
      mod, 'exaMeshSetMaterialRange', 'boolean', ['number', 'number', 'number', 'number']),
    exaIntersectSoundMesh: cw<boolean, [sceneID: number, rayPtr: number, hitPtr: number]>(
      mod, 'exaIntersectSoundMesh', 'boolean', ['number', 'number', 'number']),

    // ------------------------------------------------------------------------
    // Material
    // ------------------------------------------------------------------------
    exaAddSoundMaterial: cw<number, [matPtr: number]>(mod, 'exaAddSoundMaterial', 'number', ['number']),
    exaSetSoundMaterial: cw<boolean, [index: number, matPtr: number]>(
      mod, 'exaSetSoundMaterial', 'boolean', ['number', 'number']),

    // ------------------------------------------------------------------------
    // Sound Source
    // ------------------------------------------------------------------------
    exaNewSoundSource: cw<number, []>(mod, 'exaNewSoundSource', 'number', []),
    exaDeleteSoundSource: cw<void, [id: number]>(mod, 'exaDeleteSoundSource', null, ['number']),
    exaSoundSourceGetPosition: cw<boolean, [id: number, xPtr: number, yPtr: number, zPtr: number]>(
      mod, 'exaSoundSourceGetPosition', 'boolean', ['number', 'number', 'number', 'number']),
    exaSoundSourceSetPosition: cw<boolean, [id: number, x: number, y: number, z: number]>(
      mod, 'exaSoundSourceSetPosition', 'boolean', ['number', 'number', 'number', 'number']),
    exaSoundSourceGetDirection: cw<boolean, [id: number, xPtr: number, yPtr: number, zPtr: number]>(
      mod, 'exaSoundSourceGetDirection', 'boolean', ['number', 'number', 'number', 'number']),
    exaSoundSourceSetDirection: cw<boolean, [id: number, x: number, y: number, z: number]>(
      mod, 'exaSoundSourceSetDirection', 'boolean', ['number', 'number', 'number', 'number']),
    exaSoundSourceGetVelocity: cw<boolean, [id: number, xPtr: number, yPtr: number, zPtr: number]>(
      mod, 'exaSoundSourceGetVelocity', 'boolean', ['number', 'number', 'number', 'number']),
    exaSoundSourceSetVelocity: cw<boolean, [id: number, x: number, y: number, z: number]>(
      mod, 'exaSoundSourceSetVelocity', 'boolean', ['number', 'number', 'number', 'number']),
    exaSoundSourceSetIntensity: cw<boolean, [id: number, v: number]>(
      mod, 'exaSoundSourceSetIntensity', 'boolean', ['number', 'number']),
    exaSoundSourceGetIntensity: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaSoundSourceGetIntensity', 'boolean', ['number', 'number']),
    exaSoundSourceSetGainBoostDb: cw<boolean, [id: number, db: number]>(
      mod, 'exaSoundSourceSetGainBoostDb', 'boolean', ['number', 'number']),
    exaSoundSourceGetGainBoostDb: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaSoundSourceGetGainBoostDb', 'boolean', ['number', 'number']),
    exaSoundSourceSetReverbSendDb: cw<boolean, [id: number, db: number]>(
      mod, 'exaSoundSourceSetReverbSendDb', 'boolean', ['number', 'number']),
    exaSoundSourceGetReverbSendDb: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaSoundSourceGetReverbSendDb', 'boolean', ['number', 'number']),
    exaSoundSourceSetReflectionSendDb: cw<boolean, [id: number, db: number]>(
      mod, 'exaSoundSourceSetReflectionSendDb', 'boolean', ['number', 'number']),
    exaSoundSourceGetReflectionSendDb: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaSoundSourceGetReflectionSendDb', 'boolean', ['number', 'number']),
    exaSoundSourceSetPathEnable: cw<boolean, [id: number, pathType: number, enabled: boolean]>(
      mod, 'exaSoundSourceSetPathEnable', 'boolean', ['number', 'number', 'boolean']),
    exaSoundSourceIsPathEnabled: cw<boolean, [id: number, pathType: number, outPtr: number]>(
      mod, 'exaSoundSourceIsPathEnabled', 'boolean', ['number', 'number', 'number']),
    exaSoundSourceSetAmbientEnabled: cw<boolean, [id: number, enabled: boolean]>(
      mod, 'exaSoundSourceSetAmbientEnabled', 'boolean', ['number', 'boolean']),
    exaSoundSourceGetAmbientEnabled: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaSoundSourceGetAmbientEnabled', 'boolean', ['number', 'number']),
    exaSoundSourceSetDepth: cw<boolean, [id: number, d: number]>(
      mod, 'exaSoundSourceSetDepth', 'boolean', ['number', 'number']),
    exaSoundSourceGetDepth: cw<boolean, [id: number, outPtr: number]>(
      mod, 'exaSoundSourceGetDepth', 'boolean', ['number', 'number']),
    exaSoundSourceSetRayCount: cw<boolean, [id: number, w: number, h: number]>(
      mod, 'exaSoundSourceSetRayCount', 'boolean', ['number', 'number', 'number']),
    exaSoundSourceGetRayCount: cw<boolean, [id: number, wPtr: number, hPtr: number]>(
      mod, 'exaSoundSourceGetRayCount', 'boolean', ['number', 'number', 'number']),
    /** ExaVec3f out by pointer */
    exaSoundSourceGetDistanceAttenuation: cw<boolean, [id: number, pathType: number, outVec3Ptr: number]>(
      mod, 'exaSoundSourceGetDistanceAttenuation', 'boolean', ['number', 'number', 'number']),
    /** ExaVec3f by value — lowered to an sret pointer by the ABI. */
    exaSoundSourceSetDistanceAttenuation: cw<boolean,
      [id: number, pathType: number, vec3Ptr: number]>(
      mod, 'exaSoundSourceSetDistanceAttenuation', 'boolean',
      ['number', 'number', 'number']),
    /** Native name is inverted: this applies four attenuation values. */
    exaSoundSourceGetDistanceAttenuations: cw<boolean,
      [id: number, dPtr: number, rPtr: number, dfPtr: number, rvPtr: number]>(
      mod, 'exaSoundSourceGetDistanceAttenuations', 'boolean',
      ['number', 'number', 'number', 'number', 'number']),
    /** Native name is inverted: this writes four attenuation values to pointers. */
    exaSoundSourceSetDistanceAttenuations: cw<boolean,
      [id: number, dPtr: number, rPtr: number, dfPtr: number, rvPtr: number]>(
      mod, 'exaSoundSourceSetDistanceAttenuations', 'boolean',
      ['number', 'number', 'number', 'number', 'number']),
  };
}
