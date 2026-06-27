import type { AudioOption, Vec3 } from './native/index.js';
import type {
  ListenerNativeLike,
  SourceNativeLike,
} from './facade.js';
import type {
  ListenerCache,
  MtCommandScheduler,
  SourceCache,
} from './soundtrace-mt-facade-types.js';
import {
  HrtfMode,
  type DelayInterpolation,
  type DiffuseQuality,
  type HrtfQuality,
  type LateReverbMode,
} from './SoundListener.js';
import { PathType, type PathTypeValue } from './SoundSource.js';

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

function cloneAudioOption(value: AudioOption): AudioOption {
  return {
    sampleRate: value.sampleRate,
    inputSampleCount: value.inputSampleCount,
    outputChannels: value.outputChannels,
  };
}

function sourcePathKey(pathType: PathTypeValue): 'direct' | 'reflection' | 'diffraction' | 'reverberation' {
  switch (pathType) {
    case PathType.Direct:
      return 'direct';
    case PathType.Reflection:
      return 'reflection';
    case PathType.Diffraction:
      return 'diffraction';
    case PathType.Reverb:
      return 'reverberation';
    default:
      throw new Error(`[soundtrace.js] unsupported source path type ${pathType}`);
  }
}

export function createMtSourceNative(options: {
  readonly handle: number;
  readonly scheduler: MtCommandScheduler;
  readonly cache: SourceCache;
}): SourceNativeLike {
  const { cache, handle, scheduler } = options;
  let deleted = false;

  const assertLive = (): void => {
    scheduler.assertHostLive('source facade access');
    if (deleted) {
      scheduler.assertSourceHandle(handle);
    }
    scheduler.assertSourceHandle(handle);
  };

  return {
    id: handle,
    dispose(): void {
      scheduler.assertHostLive('source dispose');
      if (deleted) {
        return;
      }
      deleted = true;
      scheduler.deleteSourceHandle(handle);
      scheduler.queueCommand({ op: 'deleteSource', handle });
    },
    getIntensity(): number {
      assertLive();
      return cache.intensity;
    },
    getPosition(): Vec3 {
      assertLive();
      return cloneVec3(cache.position);
    },
    isPathEnabled(pathType: PathTypeValue): boolean {
      assertLive();
      return cache.paths[sourcePathKey(pathType)];
    },
    setIntensity(value: number) {
      assertLive();
      cache.intensity = value;
      scheduler.stageSourceTransform(handle, cache);
      return this;
    },
    setPathEnable(pathType: PathTypeValue, enabled: boolean) {
      assertLive();
      const path = sourcePathKey(pathType);
      cache.paths[path] = enabled;
      scheduler.queueCommand({ op: 'setSourceParam', handle, patch: { paths: { [path]: enabled } } });
      return this;
    },
    setPosition(x: number, y: number, z: number) {
      assertLive();
      cache.position = { x, y, z };
      scheduler.stageSourceTransform(handle, cache);
      return this;
    },
  };
}

export function createMtListenerNative(options: {
  readonly cache: ListenerCache;
  readonly scheduler: MtCommandScheduler;
}): ListenerNativeLike {
  const { cache, scheduler } = options;
  const queueListenerPatch = (patch: Record<string, unknown>): void => {
    scheduler.assertHostLive('listener facade access');
    scheduler.queueCommand({ op: 'setListenerOption', patch });
  };

  return {
    id: 1,
    getAudioOption(): AudioOption {
      scheduler.assertHostLive('listener audio option read');
      return cloneAudioOption(cache.audioOption);
    },
    getDelayInterpolation(): DelayInterpolation {
      scheduler.assertHostLive('listener delay interpolation read');
      return cache.renderOptions.delayInterpolation;
    },
    getDiffuseEnabled(): boolean {
      scheduler.assertHostLive('listener diffuse enabled read');
      return cache.renderOptions.diffuseEnabled;
    },
    getDiffuseQuality(): DiffuseQuality {
      scheduler.assertHostLive('listener diffuse quality read');
      return cache.renderOptions.diffuseQuality;
    },
    getHrtfMode(): HrtfMode {
      scheduler.assertHostLive('listener HRTF mode read');
      return HrtfMode.Parametric;
    },
    getHrtfQuality(): HrtfQuality {
      scheduler.assertHostLive('listener HRTF quality read');
      return cache.renderOptions.hrtfQuality;
    },
    getLateReverbMode(): LateReverbMode {
      scheduler.assertHostLive('listener late reverb mode read');
      return cache.renderOptions.lateReverbMode;
    },
    getPerBandLateReverb(): boolean {
      scheduler.assertHostLive('listener per-band late reverb read');
      return cache.renderOptions.perBandLateReverb;
    },
    getPosition(): Vec3 {
      scheduler.assertHostLive('listener position read');
      return cloneVec3(cache.position);
    },
    setAudioOption(option: AudioOption) {
      scheduler.assertHostLive('listener audio option');
      cache.audioOption = cloneAudioOption(option);
      queueListenerPatch({ audioOption: cloneAudioOption(option) });
      return this;
    },
    setDelayInterpolation(value: DelayInterpolation): boolean {
      cache.renderOptions.delayInterpolation = value;
      queueListenerPatch({ delayInterpolation: value });
      return true;
    },
    setDiffuseEnabled(value: boolean): boolean {
      cache.renderOptions.diffuseEnabled = value;
      queueListenerPatch({ diffuseEnabled: value });
      return true;
    },
    setDiffuseQuality(value: DiffuseQuality): boolean {
      cache.renderOptions.diffuseQuality = value;
      queueListenerPatch({ diffuseQuality: value });
      return true;
    },
    setEarlyRenderPathBudget(value: number): boolean {
      cache.renderOptions.earlyRenderPathBudget = value;
      queueListenerPatch({ earlyRenderPathBudget: value });
      return true;
    },
    setHrtfQuality(value: HrtfQuality): boolean {
      cache.renderOptions.hrtfQuality = value;
      queueListenerPatch({ hrtfQuality: value });
      return true;
    },
    setLateReverbMode(value: LateReverbMode): boolean {
      cache.renderOptions.lateReverbMode = value;
      queueListenerPatch({ lateReverbMode: value });
      return true;
    },
    setOrientationQuat(x: number, y: number, z: number, w: number) {
      scheduler.assertHostLive('listener pose');
      cache.orientation = [x, y, z, w];
      scheduler.stageListenerTransform(cache);
      return this;
    },
    setPerBandLateReverb(value: boolean): boolean {
      cache.renderOptions.perBandLateReverb = value;
      queueListenerPatch({ perBandLateReverb: value });
      return true;
    },
    setPosition(x: number, y: number, z: number) {
      scheduler.assertHostLive('listener pose');
      cache.position = { x, y, z };
      scheduler.stageListenerTransform(cache);
      return this;
    },
  };
}
