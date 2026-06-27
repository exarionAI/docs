import type { CommandSetRenderOption } from './control-protocol.js';
import { AUDIO_OPTION_SIZE, writeAudioOption } from './native/index.js';
import type {
  RuntimeCommandAdapterContext,
  RuntimeCommandAdapterSet,
} from './control-worker-runtime-command-shared.js';
import {
  isRecord,
  readIntegerPair,
  readQuatTuple,
  readVec3Tuple,
  requireBoolean,
  requireInteger,
  requireNumber,
} from './control-worker-runtime-command-shared.js';
import { VEC3_SIZE, writeVec3 } from './native/index.js';

const LISTENER_PATH_TYPES = [
  ['direct', 0],
  ['reflection', 1],
  ['diffraction', 2],
  ['reverberation', 3],
] as const;

export function createRuntimeListenerCommandAdapters(
  context: RuntimeCommandAdapterContext,
): Pick<RuntimeCommandAdapterSet, 'setListenerOption' | 'setRenderOption'> {
  const { bindings, getListenerId, heap, requireNativeSuccess } = context;

  const applyListenerOptionPatch = (patch: Record<string, unknown>): void => {
    const listenerId = getListenerId();
    for (const [key, value] of Object.entries(patch)) {
      switch (key) {
        case 'hrtfMode':
          requireNativeSuccess(bindings.exaListenerSetHrtfMode(listenerId, requireInteger(value, 'hrtfMode')), `failed to set hrtfMode for listener ${listenerId}`);
          break;
        case 'diffuseEnabled':
          requireNativeSuccess(bindings.exaListenerSetDiffuseEnabled(listenerId, requireBoolean(value, 'diffuseEnabled')), `failed to set diffuseEnabled for listener ${listenerId}`);
          break;
        case 'diffuseQuality':
          requireNativeSuccess(bindings.exaListenerSetDiffuseQuality(listenerId, requireInteger(value, 'diffuseQuality')), `failed to set diffuseQuality for listener ${listenerId}`);
          break;
        case 'hrtfQuality':
          requireNativeSuccess(bindings.exaListenerSetHrtfQuality(listenerId, requireInteger(value, 'hrtfQuality')), `failed to set hrtfQuality for listener ${listenerId}`);
          break;
        case 'earlyRenderPathBudget':
          requireNativeSuccess(bindings.exaListenerSetEarlyRenderPathBudget(listenerId, requireInteger(value, 'earlyRenderPathBudget')), `failed to set earlyRenderPathBudget for listener ${listenerId}`);
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
            requireNativeSuccess(
              bindings.exaListenerSetAudioOption(listenerId, optionPtr),
              `failed to set audioOption for listener ${listenerId}`,
            );
          });
          break;
        case 'lateReverbMode':
          requireNativeSuccess(bindings.exaListenerSetLateReverbMode(listenerId, requireInteger(value, 'lateReverbMode')), `failed to set lateReverbMode for listener ${listenerId}`);
          break;
        case 'perBandLateReverb':
          requireNativeSuccess(bindings.exaListenerSetPerBandLateReverb(listenerId, requireBoolean(value, 'perBandLateReverb')), `failed to set perBandLateReverb for listener ${listenerId}`);
          break;
        case 'rayCount': {
          const rayCount = readIntegerPair(value, 'rayCount');
          requireNativeSuccess(bindings.exaListenerSetRayCount(listenerId, rayCount[0], rayCount[1]), `failed to set listener rayCount for listener ${listenerId}`);
          break;
        }
        case 'rayDepth':
          requireNativeSuccess(bindings.exaListenerSetRayDepth(listenerId, requireInteger(value, 'rayDepth')), `failed to set listener rayDepth for listener ${listenerId}`);
          break;
        case 'paths':
          applyListenerPathOptions(listenerId, value, bindings, requireNativeSuccess);
          break;
        default:
          throw new Error(`[soundtrace.js] unsupported listener option patch key: ${key}`);
      }
    }
  };

  return {
    async setListenerOption(command) {
      applyListenerOptionPatch(command.patch);
      return { applied: true };
    },

    async setRenderOption(command: CommandSetRenderOption & { readonly engineId: number }) {
      applyRenderOptionPatch(command.engineId, command.patch, bindings, getListenerId(), requireNativeSuccess);
      return { applied: true };
    },
  };
}

function applyRenderOptionPatch(
  sourceId: number,
  patch: Record<string, unknown>,
  bindings: RuntimeCommandAdapterContext['bindings'],
  listenerId: number,
  requireNativeSuccess: RuntimeCommandAdapterContext['requireNativeSuccess'],
): void {
  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case 'maxDelay':
        requireNativeSuccess(bindings.exaSetMaxDelay(listenerId, sourceId, requireNumber(value, 'maxDelay')), `failed to set maxDelay for source ${sourceId}`);
        break;
      case 'pathFadeTime':
        requireNativeSuccess(bindings.exaSetPathFadeTime(listenerId, sourceId, requireNumber(value, 'pathFadeTime')), `failed to set pathFadeTime for source ${sourceId}`);
        break;
      case 'maxDelayRate':
        requireNativeSuccess(bindings.exaSetMaxDelayRate(listenerId, sourceId, requireNumber(value, 'maxDelayRate')), `failed to set maxDelayRate for source ${sourceId}`);
        break;
      default:
        throw new Error(`[soundtrace.js] render option patch key "${key}" has no existing worker native binding`);
    }
  }
}

function applyListenerPathOptions(
  listenerId: number,
  value: unknown,
  bindings: RuntimeCommandAdapterContext['bindings'],
  requireNativeSuccess: RuntimeCommandAdapterContext['requireNativeSuccess'],
): void {
  if (!isRecord(value)) {
    throw new Error('[soundtrace.js] listener paths patch must be an object');
  }

  for (const [key, pathType] of LISTENER_PATH_TYPES) {
    const enabled = value[key];
    if (enabled !== undefined) {
      requireNativeSuccess(
        bindings.exaListenerSetPathEnable(listenerId, pathType, requireBoolean(enabled, `listener path "${key}"`)),
        `failed to set listener path ${key} for listener ${listenerId}`,
      );
    }
  }
}
