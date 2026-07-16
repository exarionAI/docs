import { EXA_MAX_FREQUENCY_COUNT, EXA_PATH_DIFFRACTION, EXA_PATH_DIRECT, EXA_PATH_REFLECTION, EXA_PATH_REVERB, VEC3_SIZE, assertDirectivityArrays, requireOk, writeVec3, } from '../native/index.js';
import { isRecord, readIntegerPair, readVec3Tuple, requireBoolean, requireInteger, requireNumber, } from './control-worker-runtime-command-shared.js';
// Worker-protocol path keys -> EXA_PATH_* values. The protocol currently
// exposes the four classic path types; transmission (EXA_PATH_TRANSMISSION)
// is reachable through the ST-native surface.
const SOURCE_PATH_TYPES = [
    ['direct', EXA_PATH_DIRECT],
    ['reflection', EXA_PATH_REFLECTION],
    ['diffraction', EXA_PATH_DIFFRACTION],
    ['reverberation', EXA_PATH_REVERB],
];
export function createRuntimeSourceCommandAdapters(context) {
    const { bindings, getSceneId, heap, requireNativeSuccess } = context;
    const applySourceDistanceAttenuation = (sourceId, value) => {
        if (!isRecord(value)) {
            throw new Error('[soundtrace.js] source distanceAttenuation patch must be an object');
        }
        const direct = readVec3Tuple(value.direct, 'direct');
        const reflection = readVec3Tuple(value.reflection, 'reflection');
        const diffraction = readVec3Tuple(value.diffraction, 'diffraction');
        const reverberation = readVec3Tuple(value.reverberation, 'reverberation');
        heap.withScope((scope) => {
            const directPtr = scope.block(VEC3_SIZE);
            const reflectionPtr = scope.block(VEC3_SIZE);
            const diffractionPtr = scope.block(VEC3_SIZE);
            const reverberationPtr = scope.block(VEC3_SIZE);
            writeVec3(heap, directPtr, toVec3(direct));
            writeVec3(heap, reflectionPtr, toVec3(reflection));
            writeVec3(heap, diffractionPtr, toVec3(diffraction));
            writeVec3(heap, reverberationPtr, toVec3(reverberation));
            requireNativeSuccess(
            // v0.7 fixed the historical Get/Set name inversion — Set really sets.
            bindings.exaSourceSetDistanceAttenuations(sourceId, directPtr, reflectionPtr, diffractionPtr, reverberationPtr), `failed to set source distance attenuation for source ${sourceId}`);
        });
    };
    const applySourceDirectivity = (sourceId, value) => {
        if (!isRecord(value)) {
            throw new Error('[soundtrace.js] source directivityTable patch must be an object');
        }
        const { anglesDeg, attenDbPerBand } = value;
        // Defensive re-check: the payload crossed the worker (structured-clone)
        // boundary as `unknown` — reject a malformed patch with a clear error
        // before assertDirectivityArrays reads `.length` off a non-array.
        if (!isFloatArrayLike(anglesDeg) || !isFloatArrayLike(attenDbPerBand)) {
            throw new Error('[soundtrace.js] source directivityTable patch requires numeric anglesDeg/attenDbPerBand arrays');
        }
        const nAngles = assertDirectivityArrays(anglesDeg, attenDbPerBand);
        heap.withScope((scope) => {
            const anglesPtr = scope.block(nAngles * 4);
            const attenPtr = scope.block(nAngles * EXA_MAX_FREQUENCY_COUNT * 4);
            heap.writeF32Array(anglesPtr, anglesDeg);
            heap.writeF32Array(attenPtr, attenDbPerBand);
            requireNativeSuccess(bindings.exaSourceSetDirectivityTable(sourceId, anglesPtr, nAngles, attenPtr), `failed to set directivity table for source ${sourceId}`);
        });
    };
    const applySourcePathOptions = (sourceId, value) => {
        if (!isRecord(value)) {
            throw new Error('[soundtrace.js] source paths patch must be an object');
        }
        for (const [key, pathType] of SOURCE_PATH_TYPES) {
            const enabled = value[key];
            if (enabled !== undefined) {
                requireNativeSuccess(bindings.exaSourceSetPathEnabled(sourceId, pathType, requireBoolean(enabled, `source path "${key}"`)), `failed to set source path ${key} for source ${sourceId}`);
            }
        }
    };
    const applySourceInitialState = (command, sourceId) => {
        requireNativeSuccess(bindings.exaSourceSetPosition(sourceId, ...command.initial.position), `failed to set source position for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSourceSetDirection(sourceId, ...command.initial.direction), `failed to set source direction for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSourceSetVelocity(sourceId, ...command.initial.velocity), `failed to set source velocity for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSourceSetIntensity(sourceId, command.initial.intensity), `failed to set source intensity for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSourceSetRayCount(sourceId, command.initial.rayCount[0], command.initial.rayCount[1]), `failed to set source ray count for source ${sourceId}`);
        requireNativeSuccess(
        // v0.7: per-source depth is the TRACE-DEPTH OVERRIDE (0 = inherit).
        bindings.exaSourceSetTraceDepthOverride(sourceId, command.initial.depth), `failed to set source depth for source ${sourceId}`);
        applySourceDistanceAttenuation(sourceId, command.initial.distanceAttenuation);
        if (command.initial.paths !== undefined) {
            applySourcePathOptions(sourceId, command.initial.paths);
        }
    };
    return {
        async createSource(command) {
            const sourceId = heap.withScope((scope) => {
                const idPtr = scope.i32();
                requireOk(bindings.exaSourceCreate(idPtr), 'exaSourceCreate', bindings.exaGetLastError);
                return heap.readI32(idPtr);
            });
            try {
                applySourceInitialState(command, sourceId);
                requireNativeSuccess(bindings.exaSceneAddSource(getSceneId(), sourceId), `failed to add source ${sourceId} to scene ${getSceneId()}`);
                return sourceId;
            }
            catch (error) {
                bindings.exaSourceDestroy(sourceId);
                throw error;
            }
        },
        async deleteSource(command) {
            requireNativeSuccess(bindings.exaSceneRemoveSource(getSceneId(), command.engineId), `failed to remove source ${command.engineId} from scene ${getSceneId()}`);
            bindings.exaSourceDestroy(command.engineId);
            return { deleted: true };
        },
        async setSourceParam(command) {
            applySourceParamPatch(command.engineId, command.patch, bindings, requireNativeSuccess, {
                distanceAttenuation: applySourceDistanceAttenuation,
                paths: applySourcePathOptions,
                directivity: applySourceDirectivity,
            });
            return { applied: true };
        },
    };
}
function applySourceParamPatch(sourceId, patch, bindings, requireNativeSuccess, apply) {
    for (const [key, value] of Object.entries(patch)) {
        switch (key) {
            case 'gainBoostDb':
                requireNativeSuccess(bindings.exaSourceSetGainBoostDb(sourceId, requireNumber(value, 'gainBoostDb')), `failed to set gainBoostDb for source ${sourceId}`);
                break;
            case 'reverbSendDb':
                requireNativeSuccess(bindings.exaSourceSetReverbSendDb(sourceId, requireNumber(value, 'reverbSendDb')), `failed to set reverbSendDb for source ${sourceId}`);
                break;
            case 'reflectionSendDb':
                requireNativeSuccess(bindings.exaSourceSetReflectionSendDb(sourceId, requireNumber(value, 'reflectionSendDb')), `failed to set reflectionSendDb for source ${sourceId}`);
                break;
            case 'ambientEnabled':
                requireNativeSuccess(bindings.exaSourceSetAmbientEnabled(sourceId, requireBoolean(value, 'ambientEnabled')), `failed to set ambientEnabled for source ${sourceId}`);
                break;
            case 'depth':
                requireNativeSuccess(bindings.exaSourceSetTraceDepthOverride(sourceId, requireInteger(value, 'depth')), `failed to set depth for source ${sourceId}`);
                break;
            case 'rayCount': {
                const rayCount = readIntegerPair(value, 'rayCount');
                requireNativeSuccess(bindings.exaSourceSetRayCount(sourceId, rayCount[0], rayCount[1]), `failed to set rayCount for source ${sourceId}`);
                break;
            }
            case 'distanceAttenuation':
                apply.distanceAttenuation(sourceId, value);
                break;
            case 'paths':
                apply.paths(sourceId, value);
                break;
            case 'directivityTable':
                apply.directivity(sourceId, value);
                break;
            case 'directivityEnabled':
                requireNativeSuccess(bindings.exaSourceSetDirectivityEnabled(sourceId, requireBoolean(value, 'directivityEnabled') ? 1 : 0), `failed to set directivityEnabled for source ${sourceId}`);
                break;
            default:
                throw new Error(`[soundtrace.js] unsupported source param patch key: ${key}`);
        }
    }
}
function toVec3(value) {
    return { x: value[0], y: value[1], z: value[2] };
}
/** True for a typed array or plain array — the shapes a directivity payload can
 *  legitimately take after crossing the structured-clone boundary. */
function isFloatArrayLike(value) {
    return Array.isArray(value) || ArrayBuffer.isView(value);
}
//# sourceMappingURL=control-worker-runtime-source-commands.js.map