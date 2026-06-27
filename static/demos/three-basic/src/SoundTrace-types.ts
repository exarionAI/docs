import type { MaterialRef, SoundMaterialAliasAsset, SoundMaterialAsset } from './material-resolver.js';
import type { MemoryTraceSnapshot, PathData, PropagatorProfile, Vec3 } from './native-public.js';
import type { Source, SourcePathType } from './facade.js';

export type HrtfLoadMode = 'parametric' | 'convolution';
export type HrtfSource = string | URL | ArrayBuffer | ArrayBufferView;

export const HRTF_ASSET_FILES: Record<HrtfLoadMode, string> = {
  parametric: 'KU100_bprime.bin',
  convolution: 'KU100_convolution.bin',
} as const;
export const FACADE_SOURCE_RAY_WIDTH = 16;
export const FACADE_SOURCE_RAY_HEIGHT = 16;
export const FACADE_SOURCE_RAY_DEPTH = 6;
export const FACADE_DISTANCE_ATTENUATION = { x: 1, y: 0, z: 1 };
export const FACADE_SOURCE_RENDER_STATISTICS_LENGTH = 9;
export const FACADE_STATISTICS_RAY_DATA_LIMIT = 64;
export const FACADE_STATISTICS_PATHS: readonly SourcePathType[] = [
  'direct',
  'reflection',
  'reverberation',
  'diffraction',
] as const;

export class SoundTraceMtUnsupportedError extends Error {
  readonly code = 'UNSUPPORTED_MT_NATIVE';
  constructor(message: string, options: { readonly cause?: unknown } = {}) {
    super(message);
    this.name = 'SoundTraceMtUnsupportedError';
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export interface StatisticsSnapshotOptions {
  readonly source?: Source;
  readonly sourceStatisticsLength?: number;
  readonly includeValidPaths?: boolean;
  readonly validPathLimit?: number;
  readonly includeRayData?: boolean;
  readonly rayDataLimit?: number;
}
export interface StatisticsSourceSnapshot { readonly sourceId: number; readonly values: Float32Array }
export interface StatisticsPathSnapshot {
  readonly path: SourcePathType;
  readonly rayTraversalCount: number;
  readonly rayHitTriangleCount: number;
  readonly rayTraversals?: readonly PathData[];
  readonly rayHitTriangleVertices?: readonly Vec3[];
}
export interface StatisticsSnapshot {
  readonly source?: StatisticsSourceSnapshot;
  readonly validPathCount: number;
  readonly validPaths?: readonly PathData[];
  readonly profile: PropagatorProfile | null;
  readonly memoryTrace: MemoryTraceSnapshot | null;
  readonly paths: readonly StatisticsPathSnapshot[];
}

export type MaterialAssets = {
  readonly material: SoundMaterialAsset;
  readonly alias: SoundMaterialAliasAsset;
};
export type { MaterialRef, SoundMaterialAliasAsset, SoundMaterialAsset };

export function normalizeCaughtError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
export async function fetchJson(url: string, label: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[soundtrace.js] failed to fetch ${label} ${url}: ${reason}`, { cause: error });
  }
  if (!response.ok) throw new Error(`[soundtrace.js] failed to fetch ${label} ${url}: HTTP ${response.status}`);
  return response.json();
}
export function normalizeStatisticsLength(value: number | undefined): number {
  const length = value ?? FACADE_SOURCE_RENDER_STATISTICS_LENGTH;
  if (!Number.isInteger(length) || length < 3) throw new Error(`[soundtrace.js] sourceStatisticsLength must be an integer >= 3 (got ${length})`);
  return length;
}
export function normalizeOptionalLimit(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0) throw new Error(`[soundtrace.js] ${label} must be an integer >= 0 (got ${value})`);
  return value;
}
export function normalizeLimit(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 0) throw new Error(`[soundtrace.js] ${label} must be an integer >= 0 (got ${resolved})`);
  return resolved;
}
export function assertNeverHrtfMode(value: never): never {
  throw new Error(`[soundtrace.js] Unsupported HRTF mode ${String(value)}; use parametric or convolution`);
}
export function resolveHrtfLoadMode(mode: HrtfLoadMode): HrtfLoadMode {
  switch (mode) {
    case 'parametric':
    case 'convolution':
      return mode;
    default:
      assertNeverHrtfMode(mode);
  }
}
