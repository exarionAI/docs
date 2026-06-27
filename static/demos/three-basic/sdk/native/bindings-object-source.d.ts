import type { ExaSoundModule } from '../types.js';
export declare function makeObjectSourceBindings(mod: ExaSoundModule): {
    exaNewObject: import("./binding-utils.js").JsFn<number, []>;
    exaDeleteObject: import("./binding-utils.js").JsFn<void, [objectID: number]>;
    exaObjectSetUpdateType: import("./binding-utils.js").JsFn<boolean, [objectID: number, t: number]>;
    exaObjectgetUpdateType: import("./binding-utils.js").JsFn<number, [objectID: number]>;
    exaObjectGetPosition: import("./binding-utils.js").JsFn<boolean, [id: number, x: number, y: number, z: number]>;
    exaObjectSetPosition: import("./binding-utils.js").JsFn<boolean, [id: number, x: number, y: number, z: number]>;
    exaObjectGetRotation: import("./binding-utils.js").JsFn<boolean, [id: number, qx: number, qy: number, qz: number, qw: number]>;
    exaObjectSetRotation: import("./binding-utils.js").JsFn<boolean, [id: number, qx: number, qy: number, qz: number, qw: number]>;
    exaObjectGetScale: import("./binding-utils.js").JsFn<boolean, [id: number, sx: number, sy: number, sz: number]>;
    exaObjectSetScale: import("./binding-utils.js").JsFn<boolean, [id: number, sx: number, sy: number, sz: number]>;
    exaObjectGetMesh: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaObjectSetMesh: import("./binding-utils.js").JsFn<boolean, [id: number, meshID: number]>;
    exaNewMesh: import("./binding-utils.js").JsFn<number, []>;
    exaDeleteMesh: import("./binding-utils.js").JsFn<void, [mesh: number]>;
    exaMeshSetData: import("./binding-utils.js").JsFn<boolean, [mesh: number, vertsPtr: number, numVerts: number, trisPtr: number, numTris: number, bvhMaxDepth: number, primPerLeaf: number, bvhType: number]>;
    exaGetSoundMesh: import("./binding-utils.js").JsFn<number, [path: string]>;
    exaRegisterMesh: import("./binding-utils.js").JsFn<boolean, [path: string, meshID: number]>;
    exaGetSoundMeshVrtsTrisAll: import("./binding-utils.js").JsFn<boolean, [meshID: number, outPtrPtr: number, outCountPtr: number]>;
    exaMeshUpdateVertices: import("./binding-utils.js").JsFn<boolean, [meshID: number, vertsPtr: number, numVerts: number]>;
    exaMeshRefit: import("./binding-utils.js").JsFn<boolean, [meshID: number]>;
    exaMeshSetMaterial: import("./binding-utils.js").JsFn<boolean, [meshID: number, matIdx: number]>;
    exaMeshSetMaterialRange: import("./binding-utils.js").JsFn<boolean, [meshID: number, triStart: number, triCount: number, matIdx: number]>;
    exaIntersectSoundMesh: import("./binding-utils.js").JsFn<boolean, [sceneID: number, rayPtr: number, hitPtr: number]>;
    exaAddSoundMaterial: import("./binding-utils.js").JsFn<number, [matPtr: number]>;
    exaSetSoundMaterial: import("./binding-utils.js").JsFn<boolean, [index: number, matPtr: number]>;
    exaNewSoundSource: import("./binding-utils.js").JsFn<number, []>;
    exaDeleteSoundSource: import("./binding-utils.js").JsFn<void, [id: number]>;
    exaSoundSourceGetPosition: import("./binding-utils.js").JsFn<boolean, [id: number, xPtr: number, yPtr: number, zPtr: number]>;
    exaSoundSourceSetPosition: import("./binding-utils.js").JsFn<boolean, [id: number, x: number, y: number, z: number]>;
    exaSoundSourceGetDirection: import("./binding-utils.js").JsFn<boolean, [id: number, xPtr: number, yPtr: number, zPtr: number]>;
    exaSoundSourceSetDirection: import("./binding-utils.js").JsFn<boolean, [id: number, x: number, y: number, z: number]>;
    exaSoundSourceGetVelocity: import("./binding-utils.js").JsFn<boolean, [id: number, xPtr: number, yPtr: number, zPtr: number]>;
    exaSoundSourceSetVelocity: import("./binding-utils.js").JsFn<boolean, [id: number, x: number, y: number, z: number]>;
    exaSoundSourceSetIntensity: import("./binding-utils.js").JsFn<boolean, [id: number, v: number]>;
    exaSoundSourceGetIntensity: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaSoundSourceSetGainBoostDb: import("./binding-utils.js").JsFn<boolean, [id: number, db: number]>;
    exaSoundSourceGetGainBoostDb: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaSoundSourceSetReverbSendDb: import("./binding-utils.js").JsFn<boolean, [id: number, db: number]>;
    exaSoundSourceGetReverbSendDb: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaSoundSourceSetReflectionSendDb: import("./binding-utils.js").JsFn<boolean, [id: number, db: number]>;
    exaSoundSourceGetReflectionSendDb: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaSoundSourceSetPathEnable: import("./binding-utils.js").JsFn<boolean, [id: number, pathType: number, enabled: boolean]>;
    exaSoundSourceIsPathEnabled: import("./binding-utils.js").JsFn<boolean, [id: number, pathType: number, outPtr: number]>;
    exaSoundSourceSetAmbientEnabled: import("./binding-utils.js").JsFn<boolean, [id: number, enabled: boolean]>;
    exaSoundSourceGetAmbientEnabled: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaSoundSourceSetDepth: import("./binding-utils.js").JsFn<boolean, [id: number, d: number]>;
    exaSoundSourceGetDepth: import("./binding-utils.js").JsFn<boolean, [id: number, outPtr: number]>;
    exaSoundSourceSetRayCount: import("./binding-utils.js").JsFn<boolean, [id: number, w: number, h: number]>;
    exaSoundSourceGetRayCount: import("./binding-utils.js").JsFn<boolean, [id: number, wPtr: number, hPtr: number]>;
    /** ExaVec3f out by pointer */
    exaSoundSourceGetDistanceAttenuation: import("./binding-utils.js").JsFn<boolean, [id: number, pathType: number, outVec3Ptr: number]>;
    /** ExaVec3f by value — lowered to an sret pointer by the ABI. */
    exaSoundSourceSetDistanceAttenuation: import("./binding-utils.js").JsFn<boolean, [id: number, pathType: number, vec3Ptr: number]>;
    /** Native name is inverted: this applies four attenuation values. */
    exaSoundSourceGetDistanceAttenuations: import("./binding-utils.js").JsFn<boolean, [id: number, dPtr: number, rPtr: number, dfPtr: number, rvPtr: number]>;
    /** Native name is inverted: this writes four attenuation values to pointers. */
    exaSoundSourceSetDistanceAttenuations: import("./binding-utils.js").JsFn<boolean, [id: number, dPtr: number, rPtr: number, dfPtr: number, rvPtr: number]>;
};
//# sourceMappingURL=bindings-object-source.d.ts.map