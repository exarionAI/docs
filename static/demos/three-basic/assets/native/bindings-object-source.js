import { cw } from './binding-utils.js';
export function makeObjectSourceBindings(mod) {
    return {
        exaNewObject: cw(mod, 'exaNewObject', 'number', []),
        exaDeleteObject: cw(mod, 'exaDeleteObject', null, ['number']),
        exaObjectSetUpdateType: cw(mod, 'exaObjectSetUpdateType', 'boolean', ['number', 'number']),
        exaObjectgetUpdateType: cw(mod, 'exaObjectgetUpdateType', 'number', ['number']),
        exaObjectGetPosition: cw(mod, 'exaObjectGetPosition', 'boolean', ['number', 'number', 'number', 'number']),
        exaObjectSetPosition: cw(mod, 'exaObjectSetPosition', 'boolean', ['number', 'number', 'number', 'number']),
        exaObjectGetRotation: cw(mod, 'exaObjectGetRotation', 'boolean', ['number', 'number', 'number', 'number', 'number']),
        exaObjectSetRotation: cw(mod, 'exaObjectSetRotation', 'boolean', ['number', 'number', 'number', 'number', 'number']),
        exaObjectGetScale: cw(mod, 'exaObjectGetScale', 'boolean', ['number', 'number', 'number', 'number']),
        exaObjectSetScale: cw(mod, 'exaObjectSetScale', 'boolean', ['number', 'number', 'number', 'number']),
        exaObjectGetMesh: cw(mod, 'exaObjectGetMesh', 'boolean', ['number', 'number']),
        exaObjectSetMesh: cw(mod, 'exaObjectSetMesh', 'boolean', ['number', 'number']),
        // ------------------------------------------------------------------------
        // Mesh
        // ------------------------------------------------------------------------
        exaNewMesh: cw(mod, 'exaNewMesh', 'number', []),
        exaDeleteMesh: cw(mod, 'exaDeleteMesh', null, ['number']),
        exaMeshSetData: cw(mod, 'exaMeshSetData', 'boolean', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),
        exaGetSoundMesh: cw(mod, 'exaGetSoundMesh', 'number', ['string']),
        exaRegisterMesh: cw(mod, 'exaRegisterMesh', 'boolean', ['string', 'number']),
        exaGetSoundMeshVrtsTrisAll: cw(mod, 'exaGetSoundMeshVrtsTrisAll', 'boolean', ['number', 'number', 'number']),
        exaMeshUpdateVertices: cw(mod, 'exaMeshUpdateVertices', 'boolean', ['number', 'number', 'number']),
        exaMeshRefit: cw(mod, 'exaMeshRefit', 'boolean', ['number']),
        exaMeshSetMaterial: cw(mod, 'exaMeshSetMaterial', 'boolean', ['number', 'number']),
        exaMeshSetMaterialRange: cw(mod, 'exaMeshSetMaterialRange', 'boolean', ['number', 'number', 'number', 'number']),
        exaIntersectSoundMesh: cw(mod, 'exaIntersectSoundMesh', 'boolean', ['number', 'number', 'number']),
        // ------------------------------------------------------------------------
        // Material
        // ------------------------------------------------------------------------
        exaAddSoundMaterial: cw(mod, 'exaAddSoundMaterial', 'number', ['number']),
        exaSetSoundMaterial: cw(mod, 'exaSetSoundMaterial', 'boolean', ['number', 'number']),
        // ------------------------------------------------------------------------
        // Sound Source
        // ------------------------------------------------------------------------
        exaNewSoundSource: cw(mod, 'exaNewSoundSource', 'number', []),
        exaDeleteSoundSource: cw(mod, 'exaDeleteSoundSource', null, ['number']),
        exaSoundSourceGetPosition: cw(mod, 'exaSoundSourceGetPosition', 'boolean', ['number', 'number', 'number', 'number']),
        exaSoundSourceSetPosition: cw(mod, 'exaSoundSourceSetPosition', 'boolean', ['number', 'number', 'number', 'number']),
        exaSoundSourceGetDirection: cw(mod, 'exaSoundSourceGetDirection', 'boolean', ['number', 'number', 'number', 'number']),
        exaSoundSourceSetDirection: cw(mod, 'exaSoundSourceSetDirection', 'boolean', ['number', 'number', 'number', 'number']),
        exaSoundSourceGetVelocity: cw(mod, 'exaSoundSourceGetVelocity', 'boolean', ['number', 'number', 'number', 'number']),
        exaSoundSourceSetVelocity: cw(mod, 'exaSoundSourceSetVelocity', 'boolean', ['number', 'number', 'number', 'number']),
        exaSoundSourceSetIntensity: cw(mod, 'exaSoundSourceSetIntensity', 'boolean', ['number', 'number']),
        exaSoundSourceGetIntensity: cw(mod, 'exaSoundSourceGetIntensity', 'boolean', ['number', 'number']),
        exaSoundSourceSetGainBoostDb: cw(mod, 'exaSoundSourceSetGainBoostDb', 'boolean', ['number', 'number']),
        exaSoundSourceGetGainBoostDb: cw(mod, 'exaSoundSourceGetGainBoostDb', 'boolean', ['number', 'number']),
        exaSoundSourceSetReverbSendDb: cw(mod, 'exaSoundSourceSetReverbSendDb', 'boolean', ['number', 'number']),
        exaSoundSourceGetReverbSendDb: cw(mod, 'exaSoundSourceGetReverbSendDb', 'boolean', ['number', 'number']),
        exaSoundSourceSetReflectionSendDb: cw(mod, 'exaSoundSourceSetReflectionSendDb', 'boolean', ['number', 'number']),
        exaSoundSourceGetReflectionSendDb: cw(mod, 'exaSoundSourceGetReflectionSendDb', 'boolean', ['number', 'number']),
        exaSoundSourceSetPathEnable: cw(mod, 'exaSoundSourceSetPathEnable', 'boolean', ['number', 'number', 'boolean']),
        exaSoundSourceIsPathEnabled: cw(mod, 'exaSoundSourceIsPathEnabled', 'boolean', ['number', 'number', 'number']),
        exaSoundSourceSetAmbientEnabled: cw(mod, 'exaSoundSourceSetAmbientEnabled', 'boolean', ['number', 'boolean']),
        exaSoundSourceGetAmbientEnabled: cw(mod, 'exaSoundSourceGetAmbientEnabled', 'boolean', ['number', 'number']),
        exaSoundSourceSetDepth: cw(mod, 'exaSoundSourceSetDepth', 'boolean', ['number', 'number']),
        exaSoundSourceGetDepth: cw(mod, 'exaSoundSourceGetDepth', 'boolean', ['number', 'number']),
        exaSoundSourceSetRayCount: cw(mod, 'exaSoundSourceSetRayCount', 'boolean', ['number', 'number', 'number']),
        exaSoundSourceGetRayCount: cw(mod, 'exaSoundSourceGetRayCount', 'boolean', ['number', 'number', 'number']),
        /** ExaVec3f out by pointer */
        exaSoundSourceGetDistanceAttenuation: cw(mod, 'exaSoundSourceGetDistanceAttenuation', 'boolean', ['number', 'number', 'number']),
        /** ExaVec3f by value — lowered to an sret pointer by the ABI. */
        exaSoundSourceSetDistanceAttenuation: cw(mod, 'exaSoundSourceSetDistanceAttenuation', 'boolean', ['number', 'number', 'number']),
        /** Native name is inverted: this applies four attenuation values. */
        exaSoundSourceGetDistanceAttenuations: cw(mod, 'exaSoundSourceGetDistanceAttenuations', 'boolean', ['number', 'number', 'number', 'number', 'number']),
        /** Native name is inverted: this writes four attenuation values to pointers. */
        exaSoundSourceSetDistanceAttenuations: cw(mod, 'exaSoundSourceSetDistanceAttenuations', 'boolean', ['number', 'number', 'number', 'number', 'number']),
    };
}
//# sourceMappingURL=bindings-object-source.js.map