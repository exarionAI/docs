import { TRIANGLE_SIZE, VEC3_SIZE, requireOk, validateMeshGeometry, writeTriangles } from '../native/index.js';
import { isRecord, readQuatTuple, readVec3Tuple, requireInteger, requireMeshId, } from './control-worker-runtime-command-shared.js';
export function createRuntimeMeshCommandAdapters(context) {
    const { bindings, getSceneId, meshIdsByObjectId, heap, requireNativeSuccess } = context;
    const applyMeshPose = (objectId, pose) => {
        if (!isRecord(pose)) {
            throw new Error('[soundtrace.js] mesh pose must be an object');
        }
        let applied = false;
        if (pose.position !== undefined) {
            const position = readVec3Tuple(pose.position, 'position');
            requireNativeSuccess(bindings.exaObjectSetPosition(objectId, position[0], position[1], position[2]), `failed to set mesh position for object ${objectId}`);
            applied = true;
        }
        if (pose.orientation !== undefined) {
            const orientation = readQuatTuple(pose.orientation, 'orientation');
            requireNativeSuccess(bindings.exaObjectSetOrientation(objectId, orientation[0], orientation[1], orientation[2], orientation[3]), `failed to set mesh rotation for object ${objectId}`);
            applied = true;
        }
        if (pose.scale !== undefined) {
            const scale = readVec3Tuple(pose.scale, 'scale');
            requireNativeSuccess(bindings.exaObjectSetScale(objectId, scale[0], scale[1], scale[2]), `failed to set mesh scale for object ${objectId}`);
            applied = true;
        }
        if (!applied) {
            throw new Error('[soundtrace.js] mesh pose patch has no supported fields');
        }
    };
    return {
        async createMesh(command) {
            const numVerts = command.initial.vertices.length / 3;
            if (!Number.isInteger(numVerts)) {
                throw new Error('[soundtrace.js] mesh vertices length must be divisible by 3');
            }
            const triangles = readTrianglesPayload(command.initial.triangles);
            // Reject out-of-range geometry before allocating any native resources, so
            // bad indices never reach the memory-unsafe core (exaMeshSetData).
            validateMeshGeometry(numVerts, triangles);
            const meshId = heap.withScope((scope) => {
                const idPtr = scope.i32();
                requireOk(bindings.exaMeshCreate(idPtr), 'exaMeshCreate', bindings.exaGetLastError);
                return heap.readI32(idPtr);
            });
            let objectId = 0;
            try {
                heap.withScope((scope) => {
                    const vertsPtr = scope.alloc(numVerts * VEC3_SIZE);
                    heap.writeF32Array(vertsPtr, command.initial.vertices);
                    const trisPtr = scope.alloc(triangles.length * TRIANGLE_SIZE);
                    writeTriangles(heap, trisPtr, triangles);
                    requireNativeSuccess(bindings.exaMeshSetData(meshId, vertsPtr, numVerts, trisPtr, triangles.length, 0, 0, command.initial.bvhType), `failed to set mesh data for mesh ${meshId}`);
                });
                requireNativeSuccess(bindings.exaMeshRefit(meshId), `failed to refit mesh ${meshId}`);
                // No whole-mesh exaMeshSetMaterial here: the material index is already
                // baked into every triangle above (ST-path parity). The call would
                // hard-fail on an empty material table (strict v0.7 validation) and
                // clobber caller-provided per-triangle materials. Explicit runtime
                // changes go through the setMeshMaterial command below.
                objectId = heap.withScope((scope) => {
                    const idPtr = scope.i32();
                    requireOk(bindings.exaObjectCreate(idPtr), 'exaObjectCreate', bindings.exaGetLastError);
                    return heap.readI32(idPtr);
                });
                requireNativeSuccess(bindings.exaObjectSetMesh(objectId, meshId), `failed to bind mesh ${meshId} to object ${objectId}`);
                if (command.initial.updateType !== undefined) {
                    requireNativeSuccess(bindings.exaObjectSetUpdateType(objectId, command.initial.updateType), `failed to set update type for object ${objectId}`);
                }
                if (command.initial.pose !== undefined) {
                    applyMeshPose(objectId, command.initial.pose);
                }
                requireNativeSuccess(bindings.exaSceneAddObject(getSceneId(), objectId), `failed to add object ${objectId} to scene ${getSceneId()}`);
                meshIdsByObjectId.set(objectId, meshId);
                return objectId;
            }
            catch (error) {
                if (objectId !== 0) {
                    bindings.exaObjectDestroy(objectId);
                }
                bindings.exaMeshDestroy(meshId);
                throw error;
            }
        },
        async deleteMesh(command) {
            const meshId = requireMeshId(meshIdsByObjectId, command.engineId);
            requireNativeSuccess(bindings.exaSceneRemoveObject(getSceneId(), command.engineId), `failed to remove object ${command.engineId} from scene ${getSceneId()}`);
            bindings.exaObjectDestroy(command.engineId);
            bindings.exaMeshDestroy(meshId);
            meshIdsByObjectId.delete(command.engineId);
            return { deleted: true };
        },
        async setMeshMaterial(command) {
            const meshId = requireMeshId(meshIdsByObjectId, command.engineId);
            requireNativeSuccess(bindings.exaMeshSetMaterial(meshId, command.material), `failed to set material for mesh ${meshId}`);
            return { accepted: true };
        },
        async setMeshMaterialRange(command) {
            const meshId = requireMeshId(meshIdsByObjectId, command.engineId);
            requireNativeSuccess(bindings.exaMeshSetMaterialRange(meshId, command.triStart, command.triCount, command.material), `failed to set material range for mesh ${meshId}`);
            return { accepted: true };
        },
        async setMeshUpdateType(command) {
            const objectId = command.engineId;
            requireNativeSuccess(bindings.exaObjectSetUpdateType(objectId, command.updateType), `failed to set update type for object ${objectId}`);
            return { accepted: true };
        },
    };
}
function readTrianglesPayload(value) {
    return value.map((triangle, index) => {
        const materialIndexValue = triangle.materialIndex;
        return {
            a: requireInteger(triangle.a, `triangles[${index}].a`),
            b: requireInteger(triangle.b, `triangles[${index}].b`),
            c: requireInteger(triangle.c, `triangles[${index}].c`),
            materialIndex: materialIndexValue === undefined
                ? 0
                : requireInteger(materialIndexValue, `triangles[${index}].materialIndex`),
        };
    });
}
//# sourceMappingURL=control-worker-runtime-mesh-commands.js.map