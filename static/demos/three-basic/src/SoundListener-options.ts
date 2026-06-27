export const HrtfMode = {
  Parametric: 1,
  Convolution: 2,
} as const;
export type HrtfMode = (typeof HrtfMode)[keyof typeof HrtfMode];

export const HrtfModeName = {
  Parametric: 'parametric',
  Convolution: 'convolution',
} as const;
export type HrtfModeName = (typeof HrtfModeName)[keyof typeof HrtfModeName];

export const HrtfQuality = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;
export type HrtfQuality = (typeof HrtfQuality)[keyof typeof HrtfQuality];

export const DiffuseQuality = {
  Low: 0,
  Medium: 1,
  High: 2,
} as const;
export type DiffuseQuality = (typeof DiffuseQuality)[keyof typeof DiffuseQuality];

export const LateReverbMode = {
  OnePole: 0,
  Tilt: 1,
  EightBand: 2,
} as const;
export type LateReverbMode = (typeof LateReverbMode)[keyof typeof LateReverbMode];

export const DelayInterpolation = {
  Linear: 0,
  CubicLagrange: 1,
  Lagrange6: 2,
} as const;
export type DelayInterpolation = (typeof DelayInterpolation)[keyof typeof DelayInterpolation];

export function isSupportedHrtfMode(value: number): value is HrtfMode {
  return value === HrtfMode.Parametric || value === HrtfMode.Convolution;
}

export function isHrtfQuality(value: number): value is HrtfQuality {
  return value === HrtfQuality.Low || value === HrtfQuality.Medium || value === HrtfQuality.High;
}

export function isDiffuseQuality(value: number): value is DiffuseQuality {
  return value === DiffuseQuality.Low || value === DiffuseQuality.Medium || value === DiffuseQuality.High;
}

export function isLateReverbMode(value: number): value is LateReverbMode {
  return value === LateReverbMode.OnePole || value === LateReverbMode.Tilt || value === LateReverbMode.EightBand;
}

export function isDelayInterpolation(value: number): value is DelayInterpolation {
  return value === DelayInterpolation.Linear
    || value === DelayInterpolation.CubicLagrange
    || value === DelayInterpolation.Lagrange6;
}
