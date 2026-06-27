import { DelayInterpolation, DiffuseQuality, HrtfQuality, LateReverbMode } from './SoundListener.js';
import type { AudioOption, Vec3 } from './native/index.js';
import type { ListenerCache, SourceCache } from './soundtrace-mt-facade-types.js';
import type { QualityTier, SourcePathOptions } from './facade.js';

export function cloneTupleVec3(value: readonly [number, number, number]): Vec3 {
  return { x: value[0], y: value[1], z: value[2] };
}

export function defaultPathOptions(overrides: SourcePathOptions | undefined): SourceCache['paths'] {
  return {
    direct: overrides?.direct ?? true,
    reflection: overrides?.reflection ?? true,
    reverberation: overrides?.reverberation ?? true,
    diffraction: overrides?.diffraction ?? true,
  };
}

export function defaultAudioOption(sampleRate: number): AudioOption {
  return { sampleRate, inputSampleCount: 128, outputChannels: 2 };
}

export function resolveListenerRenderCache(tier: QualityTier): ListenerCache['renderOptions'] {
  switch (tier) {
    case 'fast':
    case 'speed':
      return {
        hrtfQuality: HrtfQuality.Low,
        diffuseEnabled: false,
        diffuseQuality: DiffuseQuality.Low,
        lateReverbMode: LateReverbMode.OnePole,
        perBandLateReverb: false,
        delayInterpolation: DelayInterpolation.Linear,
        earlyRenderPathBudget: 128,
      };
    case 'middle':
    case 'balanced':
      return {
        hrtfQuality: HrtfQuality.Medium,
        diffuseEnabled: true,
        diffuseQuality: DiffuseQuality.Medium,
        lateReverbMode: LateReverbMode.Tilt,
        perBandLateReverb: false,
        delayInterpolation: DelayInterpolation.CubicLagrange,
        earlyRenderPathBudget: 128,
      };
    case 'quality':
      return {
        hrtfQuality: HrtfQuality.High,
        diffuseEnabled: true,
        diffuseQuality: DiffuseQuality.High,
        lateReverbMode: LateReverbMode.EightBand,
        perBandLateReverb: true,
        delayInterpolation: DelayInterpolation.Lagrange6,
        earlyRenderPathBudget: 128,
      };
    default:
      throw new Error(`[soundtrace.js] unknown quality tier: ${tier}`);
  }
}
