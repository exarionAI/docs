import { cw } from './binding-utils.js';
// v0.7 (ABI 4): object / mesh / material / source families. All ExaResult
// (0 = success — see result.ts). Handles are the raw int32 `.v` of the typed
// C handles; creators use int32 out-pointers.
export function makeObjectSourceBindings(mod) {
    return {
        exaObjectCreate: cw(mod, 'exaObjectCreate', 'number', ['number']),
        exaObjectDestroy: cw(mod, 'exaObjectDestroy', 'number', ['number']),
        exaObjectSetUpdateType: cw(mod, 'exaObjectSetUpdateType', 'number', ['number', 'number']),
        /** v0.7 fixed the lowercase-g typo (exaObjectgetUpdateType) and moved the
         *  value to an out-param. */
        exaObjectGetUpdateType: cw(mod, 'exaObjectGetUpdateType', 'number', ['number', 'number']),
        exaObjectGetPosition: cw(mod, 'exaObjectGetPosition', 'number', ['number', 'number', 'number', 'number']),
        exaObjectSetPosition: cw(mod, 'exaObjectSetPosition', 'number', ['number', 'number', 'number', 'number']),
        // Rotation -> Orientation rename (quaternion terminology unification).
        exaObjectGetOrientation: cw(mod, 'exaObjectGetOrientation', 'number', ['number', 'number', 'number', 'number', 'number']),
        exaObjectSetOrientation: cw(mod, 'exaObjectSetOrientation', 'number', ['number', 'number', 'number', 'number', 'number']),
        exaObjectGetScale: cw(mod, 'exaObjectGetScale', 'number', ['number', 'number', 'number', 'number']),
        exaObjectSetScale: cw(mod, 'exaObjectSetScale', 'number', ['number', 'number', 'number', 'number']),
        /** outMeshPtr receives the attached mesh id; 0 = no mesh attached. */
        exaObjectGetMesh: cw(mod, 'exaObjectGetMesh', 'number', ['number', 'number']),
        exaObjectSetMesh: cw(mod, 'exaObjectSetMesh', 'number', ['number', 'number']),
        // ------------------------------------------------------------------------
        // Mesh
        // ------------------------------------------------------------------------
        exaMeshCreate: cw(mod, 'exaMeshCreate', 'number', ['number']),
        /** v0.7: also detaches the mesh from every object referencing it (D-07). */
        exaMeshDestroy: cw(mod, 'exaMeshDestroy', 'number', ['number']),
        exaMeshSetData: cw(mod, 'exaMeshSetData', 'number', ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']),
        /** Borrow the ENGINE-OWNED triangle-vertex float array (renamed from
         *  exaGetSoundMeshVrtsTrisAll). outCount is the number of FLOATS; the
         *  pointer is invalidated by the next mesh mutation — copy out. */
        exaMeshGetTriangleVertices: cw(mod, 'exaMeshGetTriangleVertices', 'number', ['number', 'number', 'number']),
        exaMeshUpdateVertices: cw(mod, 'exaMeshUpdateVertices', 'number', ['number', 'number', 'number']),
        exaMeshRefit: cw(mod, 'exaMeshRefit', 'number', ['number']),
        exaMeshSetMaterial: cw(mod, 'exaMeshSetMaterial', 'number', ['number', 'number']),
        exaMeshSetMaterialRange: cw(mod, 'exaMeshSetMaterialRange', 'number', ['number', 'number', 'number', 'number']),
        // (exaGetSoundMesh / exaRegisterMesh were REMOVED in v0.7 — a path->id
        //  cache is host business, D-15. soundtrace.js never exposed them.)
        // ------------------------------------------------------------------------
        // Material (global table; id.v is the 0-based table index)
        // ------------------------------------------------------------------------
        /** Append a material; the new id is written through outIdPtr (int32). */
        exaMaterialCreate: cw(mod, 'exaMaterialCreate', 'number', ['number', 'number']),
        exaMaterialSet: cw(mod, 'exaMaterialSet', 'number', ['number', 'number']),
        exaMaterialGet: cw(mod, 'exaMaterialGet', 'number', ['number', 'number']),
        // ------------------------------------------------------------------------
        // Source (exaSoundSource* -> exaSource* rename)
        // ------------------------------------------------------------------------
        exaSourceCreate: cw(mod, 'exaSourceCreate', 'number', ['number']),
        exaSourceDestroy: cw(mod, 'exaSourceDestroy', 'number', ['number']),
        exaSourceGetPosition: cw(mod, 'exaSourceGetPosition', 'number', ['number', 'number', 'number', 'number']),
        exaSourceSetPosition: cw(mod, 'exaSourceSetPosition', 'number', ['number', 'number', 'number', 'number']),
        exaSourceGetDirection: cw(mod, 'exaSourceGetDirection', 'number', ['number', 'number', 'number', 'number']),
        exaSourceSetDirection: cw(mod, 'exaSourceSetDirection', 'number', ['number', 'number', 'number', 'number']),
        exaSourceGetVelocity: cw(mod, 'exaSourceGetVelocity', 'number', ['number', 'number', 'number', 'number']),
        exaSourceSetVelocity: cw(mod, 'exaSourceSetVelocity', 'number', ['number', 'number', 'number', 'number']),
        exaSourceSetIntensity: cw(mod, 'exaSourceSetIntensity', 'number', ['number', 'number']),
        exaSourceGetIntensity: cw(mod, 'exaSourceGetIntensity', 'number', ['number', 'number']),
        exaSourceSetGainBoostDb: cw(mod, 'exaSourceSetGainBoostDb', 'number', ['number', 'number']),
        exaSourceGetGainBoostDb: cw(mod, 'exaSourceGetGainBoostDb', 'number', ['number', 'number']),
        exaSourceSetReverbSendDb: cw(mod, 'exaSourceSetReverbSendDb', 'number', ['number', 'number']),
        exaSourceGetReverbSendDb: cw(mod, 'exaSourceGetReverbSendDb', 'number', ['number', 'number']),
        exaSourceSetReflectionSendDb: cw(mod, 'exaSourceSetReflectionSendDb', 'number', ['number', 'number']),
        exaSourceGetReflectionSendDb: cw(mod, 'exaSourceGetReflectionSendDb', 'number', ['number', 'number']),
        exaSourceSetPathEnabled: cw(mod, 'exaSourceSetPathEnabled', 'number', ['number', 'number', 'boolean']),
        /** outEnabledPtr is an ExaBool = int32 — allocate 4 bytes, read i32. */
        exaSourceIsPathEnabled: cw(mod, 'exaSourceIsPathEnabled', 'number', ['number', 'number', 'number']),
        exaSourceSetAmbientEnabled: cw(mod, 'exaSourceSetAmbientEnabled', 'number', ['number', 'boolean']),
        exaSourceIsAmbientEnabled: cw(mod, 'exaSourceIsAmbientEnabled', 'number', ['number', 'number']),
        /** 0 = inherit the listener/global trace depth (v0.7 default, D-13). */
        exaSourceSetTraceDepthOverride: cw(mod, 'exaSourceSetTraceDepthOverride', 'number', ['number', 'number']),
        exaSourceGetTraceDepthOverride: cw(mod, 'exaSourceGetTraceDepthOverride', 'number', ['number', 'number']),
        exaSourceSetRayCount: cw(mod, 'exaSourceSetRayCount', 'number', ['number', 'number', 'number']),
        exaSourceGetRayCount: cw(mod, 'exaSourceGetRayCount', 'number', ['number', 'number', 'number']),
        /** ExaVec3f out by pointer. */
        exaSourceGetDistanceAttenuation: cw(mod, 'exaSourceGetDistanceAttenuation', 'number', ['number', 'number', 'number']),
        /** ExaVec3f by value — lowered to a byval pointer by the wasm32 ABI. */
        exaSourceSetDistanceAttenuation: cw(mod, 'exaSourceSetDistanceAttenuation', 'number', ['number', 'number', 'number']),
        /** v0.7 fixed the historical Get/Set NAME INVERSION: Set now SETS the four
         *  path-type attenuations (by-value vec3s -> byval pointers)… */
        exaSourceSetDistanceAttenuations: cw(mod, 'exaSourceSetDistanceAttenuations', 'number', ['number', 'number', 'number', 'number', 'number']),
        /** …and Get now WRITES the four attenuations to the out-pointers. */
        exaSourceGetDistanceAttenuations: cw(mod, 'exaSourceGetDistanceAttenuations', 'number', ['number', 'number', 'number', 'number', 'number']),
        /** Inverse of the attenuation curve — renamed from the backwards
         *  exaFindAttenuationForDistance; the decoy sceneID is gone (D-19).
         *  The distance (meters) is written through outDistPtr (float). */
        exaSourceFindDistanceForAttenuation: cw(mod, 'exaSourceFindDistanceForAttenuation', 'number', ['number', 'number', 'number', 'number']),
        /** Per-source directivity table (v0.7): angular attenuation applied per
         *  propagation path. Setting a table does not enable it — call
         *  exaSourceSetDirectivityEnabled. anglesDeg / attenDbPerBand are heap
         *  pointers. Low-level cw only; a facade that marshals JS angle/atten
         *  arrays into the wasm heap is deferred to a follow-up (as with ExaIR). */
        exaSourceSetDirectivityTable: cw(mod, 'exaSourceSetDirectivityTable', 'number', ['number', 'number', 'number', 'number']),
        exaSourceSetDirectivityEnabled: cw(mod, 'exaSourceSetDirectivityEnabled', 'number', ['number', 'number']),
    };
}
//# sourceMappingURL=bindings-object-source.js.map