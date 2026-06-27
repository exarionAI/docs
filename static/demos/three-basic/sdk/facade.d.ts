export type WorkerHostedMtPrecondition = 'crossOriginIsolated' | 'SharedArrayBuffer';
export interface WorkerHostedMtSupport {
    readonly supported: boolean;
    readonly crossOriginIsolated: boolean;
    readonly sharedArrayBuffer: boolean;
    readonly missing: readonly WorkerHostedMtPrecondition[];
}
export declare function workerHostedMtSupport(): WorkerHostedMtSupport;
export * from './facade-native-types.js';
export * from './facade-options.js';
export * from './facade-execution.js';
export * from './facade-coordinate.js';
export * from './facade-entities.js';
//# sourceMappingURL=facade.d.ts.map