export type WorkerHostedMtPrecondition = 'crossOriginIsolated' | 'SharedArrayBuffer';

export interface WorkerHostedMtSupport {
  readonly supported: boolean;
  readonly crossOriginIsolated: boolean;
  readonly sharedArrayBuffer: boolean;
  readonly missing: readonly WorkerHostedMtPrecondition[];
}

export function workerHostedMtSupport(): WorkerHostedMtSupport {
  const crossOriginIsolated = globalThis.crossOriginIsolated === true;
  const sharedArrayBuffer = typeof SharedArrayBuffer === 'function';
  const missing: WorkerHostedMtPrecondition[] = [];
  if (!crossOriginIsolated) missing.push('crossOriginIsolated');
  if (!sharedArrayBuffer) missing.push('SharedArrayBuffer');
  return {
    supported: crossOriginIsolated && sharedArrayBuffer,
    crossOriginIsolated,
    sharedArrayBuffer,
    missing,
  };
}

export * from './facade-native-types.js';
export * from './facade-options.js';
export * from './facade-execution.js';
export * from './facade-coordinate.js';
export * from './facade-entities.js';
