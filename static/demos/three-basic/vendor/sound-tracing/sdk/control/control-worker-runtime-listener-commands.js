import { HrtfMode } from '../engine/SoundListener.js';
import { AUDIO_OPTION_SIZE, writeAudioOption } from '../native/index.js';
import { isRecord, readIntegerPair, readVec3Tuple, requireBoolean, requireInteger, requireNumber, } from './control-worker-runtime-command-shared.js';
import { EXA_PATH_DIFFRACTION, EXA_PATH_DIRECT, EXA_PATH_REFLECTION, EXA_PATH_REVERB, MAT3X3_SIZE, } from '../native/index.js';
const LISTENER_PATH_TYPES = [
    ['direct', EXA_PATH_DIRECT],
    ['reflection', EXA_PATH_REFLECTION],
    ['diffraction', EXA_PATH_DIFFRACTION],
    ['reverberation', EXA_PATH_REVERB],
];
export function createRuntimeListenerCommandAdapters(context) {
    const { bindings, getListenerId, heap, requireNativeSuccess } = context;
    const applyListenerOptionPatch = (patch) => {
        const listenerId = getListenerId();
        for (const [key, value] of Object.entries(patch)) {
            switch (key) {
                case 'hrtfMode':
                    requireNativeSuccess(bindings.exaListenerSetHrtfMode(listenerId, requireInteger(value, 'hrtfMode')), `failed to set hrtfMode for listener ${listenerId}`);
                    break;
                case 'diffuseEnabled':
                    requireNativeSuccess(bindings.exaListenerSetDiffuseEnabled(listenerId, requireBoolean(value, 'diffuseEnabled')), `failed to set diffuseEnabled for listener ${listenerId}`);
                    break;
                // v0.7: LOW/MED/HIGH quality enums became RAW path budgets.
                case 'diffusePathBudget':
                    requireNativeSuccess(bindings.exaListenerSetDiffusePathBudget(listenerId, requireInteger(value, 'diffusePathBudget')), `failed to set diffusePathBudget for listener ${listenerId}`);
                    break;
                case 'hrtfPathBudget':
                    requireNativeSuccess(bindings.exaListenerSetHrtfPathBudget(listenerId, requireInteger(value, 'hrtfPathBudget')), `failed to set hrtfPathBudget for listener ${listenerId}`);
                    break;
                case 'earlyRenderPathBudget':
                    requireNativeSuccess(bindings.exaListenerSetEarlyPathBudget(listenerId, requireInteger(value, 'earlyRenderPathBudget')), `failed to set earlyRenderPathBudget for listener ${listenerId}`);
                    break;
                case 'ambisonicHybrid':
                    requireNativeSuccess(bindings.exaListenerSetAmbisonicHybridEnabled(listenerId, requireBoolean(value, 'ambisonicHybrid')), `failed to set ambisonicHybrid for listener ${listenerId}`);
                    break;
                case 'outputMode':
                    requireNativeSuccess(bindings.exaListenerSetOutputMode(listenerId, requireInteger(value, 'outputMode')), `failed to set outputMode for listener ${listenerId}`);
                    break;
                case 'delayInterpolation':
                    requireNativeSuccess(bindings.exaListenerSetDelayInterpolation(listenerId, requireInteger(value, 'delayInterpolation')), `failed to set delayInterpolation for listener ${listenerId}`);
                    break;
                case 'audioOption':
                    if (!isRecord(value)) {
                        throw new Error('[soundtrace.js] audioOption patch must be an object');
                    }
                    heap.withScope((scope) => {
                        const optionPtr = scope.block(AUDIO_OPTION_SIZE);
                        writeAudioOption(heap, optionPtr, {
                            sampleRate: requireNumber(value.sampleRate, 'audioOption.sampleRate'),
                            inputSampleCount: requireInteger(value.inputSampleCount, 'audioOption.inputSampleCount'),
                            outputChannels: requireInteger(value.outputChannels, 'audioOption.outputChannels'),
                        });
                        requireNativeSuccess(bindings.exaListenerSetAudioOption(listenerId, optionPtr), `failed to set audioOption for listener ${listenerId}`);
                    });
                    break;
                case 'rayCount': {
                    const rayCount = readIntegerPair(value, 'rayCount');
                    requireNativeSuccess(bindings.exaListenerSetRayCount(listenerId, rayCount[0], rayCount[1]), `failed to set listener rayCount for listener ${listenerId}`);
                    break;
                }
                case 'rayDepth':
                    requireNativeSuccess(bindings.exaListenerSetRayDepth(listenerId, requireInteger(value, 'rayDepth')), `failed to set listener rayDepth for listener ${listenerId}`);
                    break;
                case 'coordinateBasis': {
                    if (!isRecord(value)) {
                        throw new Error('[soundtrace.js] coordinateBasis patch must be an object');
                    }
                    const right = readVec3Tuple(value.right, 'coordinateBasis.right');
                    const up = readVec3Tuple(value.up, 'coordinateBasis.up');
                    const forward = readVec3Tuple(value.forward, 'coordinateBasis.forward');
                    heap.withScope((scope) => {
                        const basisPtr = scope.block(MAT3X3_SIZE);
                        heap.writeF32(basisPtr + 0, right[0]);
                        heap.writeF32(basisPtr + 4, right[1]);
                        heap.writeF32(basisPtr + 8, right[2]);
                        heap.writeF32(basisPtr + 12, up[0]);
                        heap.writeF32(basisPtr + 16, up[1]);
                        heap.writeF32(basisPtr + 20, up[2]);
                        heap.writeF32(basisPtr + 24, forward[0]);
                        heap.writeF32(basisPtr + 28, forward[1]);
                        heap.writeF32(basisPtr + 32, forward[2]);
                        requireNativeSuccess(bindings.exaListenerSetCoordinateBasis(listenerId, basisPtr + 0, basisPtr + 12, basisPtr + 24), `failed to set coordinateBasis for listener ${listenerId}`);
                    });
                    break;
                }
                case 'paths':
                    applyListenerPathOptions(listenerId, value, bindings, requireNativeSuccess);
                    break;
                default:
                    throw new Error(`[soundtrace.js] unsupported listener option patch key: ${key}`);
            }
        }
    };
    return {
        async loadListenerHrtf(command) {
            loadListenerHrtfTable(command, bindings, heap, getListenerId(), requireNativeSuccess);
            return { applied: true };
        },
        async setListenerOption(command) {
            applyListenerOptionPatch(command.patch);
            return { applied: true };
        },
        async setRenderOption(command) {
            applyRenderOptionPatch(command.engineId, command.patch, bindings, getListenerId(), requireNativeSuccess);
            return { applied: true };
        },
    };
}
function loadListenerHrtfTable(command, bindings, heap, listenerId, requireNativeSuccess) {
    const bytes = command.bytes;
    if (!(bytes instanceof Uint8Array)) {
        throw new Error('[soundtrace.js] HRTF bytes must be a Uint8Array');
    }
    // v0.7 single loader (exaListenerLoadHrtf) sniffs the container magic
    // (BPH1/MPI1/SAH1); the wire `mode` only picks the spatializer selected
    // AFTER the load.
    const loadResult = bytes.byteLength === 0
        ? bindings.exaListenerLoadHrtf(listenerId, 0, 0)
        : heap.withScope((scope) => {
            const ptr = scope.alloc(bytes.byteLength);
            heap.writeBytes(ptr, bytes);
            return bindings.exaListenerLoadHrtf(listenerId, ptr, bytes.byteLength);
        });
    requireNativeSuccess(loadResult, `failed to load ${command.mode} HRTF for listener ${listenerId}`);
    requireNativeSuccess(bindings.exaListenerSetHrtfMode(listenerId, hrtfModeValue(command.mode)), `failed to set ${command.mode} HRTF mode for listener ${listenerId}`);
}
function hrtfModeValue(mode) {
    switch (mode) {
        case 'parametric':
            return HrtfMode.Parametric;
        case 'convolution': // legacy wire alias of the v0.7 HRIR (nearest) mode
            return HrtfMode.Hrir;
        case 'steamaudio': // legacy wire alias of the v0.7 HRIR_INTERPOLATED mode
            return HrtfMode.HrirInterpolated;
    }
}
function applyRenderOptionPatch(sourceId, patch, bindings, listenerId, requireNativeSuccess) {
    for (const [key, value] of Object.entries(patch)) {
        switch (key) {
            case 'maxDelay':
                requireNativeSuccess(bindings.exaRenderSetMaxDelay(listenerId, sourceId, requireNumber(value, 'maxDelay')), `failed to set maxDelay for source ${sourceId}`);
                break;
            case 'pathFadeTime':
                requireNativeSuccess(bindings.exaRenderSetPathFadeTime(listenerId, sourceId, requireNumber(value, 'pathFadeTime')), `failed to set pathFadeTime for source ${sourceId}`);
                break;
            case 'maxDelayRate':
                requireNativeSuccess(bindings.exaRenderSetMaxDelayRate(listenerId, sourceId, requireNumber(value, 'maxDelayRate')), `failed to set maxDelayRate for source ${sourceId}`);
                break;
            default:
                throw new Error(`[soundtrace.js] render option patch key "${key}" has no existing worker native binding`);
        }
    }
}
function applyListenerPathOptions(listenerId, value, bindings, requireNativeSuccess) {
    if (!isRecord(value)) {
        throw new Error('[soundtrace.js] listener paths patch must be an object');
    }
    for (const [key, pathType] of LISTENER_PATH_TYPES) {
        const enabled = value[key];
        if (enabled !== undefined) {
            requireNativeSuccess(bindings.exaListenerSetPathEnabled(listenerId, pathType, requireBoolean(enabled, `listener path "${key}"`)), `failed to set listener path ${key} for listener ${listenerId}`);
        }
    }
}
//# sourceMappingURL=control-worker-runtime-listener-commands.js.map