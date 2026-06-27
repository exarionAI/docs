import { VEC3_SIZE, writeVec3 } from './native/index.js';
import { isRecord, readIntegerPair, readVec3Tuple, requireBoolean, requireInteger, requireNumber, } from './control-worker-runtime-command-shared.js';
const SOURCE_PATH_TYPES = [
    ['direct', 0],
    ['reflection', 1],
    ['diffraction', 2],
    ['reverberation', 3],
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
            requireNativeSuccess(bindings.exaSoundSourceSetDistanceAttenuations(sourceId, directPtr, reflectionPtr, diffractionPtr, reverberationPtr), `failed to set source distance attenuation for source ${sourceId}`);
        });
    };
    const applySourcePathOptions = (sourceId, value) => {
        if (!isRecord(value)) {
            throw new Error('[soundtrace.js] source paths patch must be an object');
        }
        for (const [key, pathType] of SOURCE_PATH_TYPES) {
            const enabled = value[key];
            if (enabled !== undefined) {
                requireNativeSuccess(bindings.exaSoundSourceSetPathEnable(sourceId, pathType, requireBoolean(enabled, `source path "${key}"`)), `failed to set source path ${key} for source ${sourceId}`);
            }
        }
    };
    const applySourceInitialState = (command, sourceId) => {
        requireNativeSuccess(bindings.exaSoundSourceSetPosition(sourceId, ...command.initial.position), `failed to set source position for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSoundSourceSetDirection(sourceId, ...command.initial.direction), `failed to set source direction for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSoundSourceSetVelocity(sourceId, ...command.initial.velocity), `failed to set source velocity for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSoundSourceSetIntensity(sourceId, command.initial.intensity), `failed to set source intensity for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSoundSourceSetRayCount(sourceId, command.initial.rayCount[0], command.initial.rayCount[1]), `failed to set source ray count for source ${sourceId}`);
        requireNativeSuccess(bindings.exaSoundSourceSetDepth(sourceId, command.initial.depth), `failed to set source depth for source ${sourceId}`);
        applySourceDistanceAttenuation(sourceId, command.initial.distanceAttenuation);
        if (command.initial.paths !== undefined) {
            applySourcePathOptions(sourceId, command.initial.paths);
        }
    };
    return {
        async createSource(command) {
            const sourceId = bindings.exaNewSoundSource();
            try {
                applySourceInitialState(command, sourceId);
                requireNativeSuccess(bindings.exaSceneAddSource(getSceneId(), sourceId), `failed to add source ${sourceId} to scene ${getSceneId()}`);
                return sourceId;
            }
            catch (error) {
                bindings.exaDeleteSoundSource(sourceId);
                throw error;
            }
        },
        async deleteSource(command) {
            requireNativeSuccess(bindings.exaSceneRemoveSource(getSceneId(), command.engineId), `failed to remove source ${command.engineId} from scene ${getSceneId()}`);
            bindings.exaDeleteSoundSource(command.engineId);
            return { deleted: true };
        },
        async setSourceParam(command) {
            applySourceParamPatch(command.engineId, command.patch, bindings, requireNativeSuccess, applySourceDistanceAttenuation, applySourcePathOptions);
            return { applied: true };
        },
    };
}
function applySourceParamPatch(sourceId, patch, bindings, requireNativeSuccess, applySourceDistanceAttenuation, applySourcePathOptions) {
    for (const [key, value] of Object.entries(patch)) {
        switch (key) {
            case 'gainBoostDb':
                requireNativeSuccess(bindings.exaSoundSourceSetGainBoostDb(sourceId, requireNumber(value, 'gainBoostDb')), `failed to set gainBoostDb for source ${sourceId}`);
                break;
            case 'reverbSendDb':
                requireNativeSuccess(bindings.exaSoundSourceSetReverbSendDb(sourceId, requireNumber(value, 'reverbSendDb')), `failed to set reverbSendDb for source ${sourceId}`);
                break;
            case 'reflectionSendDb':
                requireNativeSuccess(bindings.exaSoundSourceSetReflectionSendDb(sourceId, requireNumber(value, 'reflectionSendDb')), `failed to set reflectionSendDb for source ${sourceId}`);
                break;
            case 'ambientEnabled':
                requireNativeSuccess(bindings.exaSoundSourceSetAmbientEnabled(sourceId, requireBoolean(value, 'ambientEnabled')), `failed to set ambientEnabled for source ${sourceId}`);
                break;
            case 'depth':
                requireNativeSuccess(bindings.exaSoundSourceSetDepth(sourceId, requireInteger(value, 'depth')), `failed to set depth for source ${sourceId}`);
                break;
            case 'rayCount': {
                const rayCount = readIntegerPair(value, 'rayCount');
                requireNativeSuccess(bindings.exaSoundSourceSetRayCount(sourceId, rayCount[0], rayCount[1]), `failed to set rayCount for source ${sourceId}`);
                break;
            }
            case 'distanceAttenuation':
                applySourceDistanceAttenuation(sourceId, value);
                break;
            case 'paths':
                applySourcePathOptions(sourceId, value);
                break;
            default:
                throw new Error(`[soundtrace.js] unsupported source param patch key: ${key}`);
        }
    }
}
function toVec3(value) {
    return { x: value[0], y: value[1], z: value[2] };
}
//# sourceMappingURL=control-worker-runtime-source-commands.js.map