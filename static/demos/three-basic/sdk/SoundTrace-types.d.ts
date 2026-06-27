import type { MaterialRef, SoundMaterialAliasAsset, SoundMaterialAsset } from './material-resolver.js';
import type { MemoryTraceSnapshot, PathData, PropagatorProfile, Vec3 } from './native-public.js';
import type { Source, SourcePathType } from './facade.js';
export type HrtfLoadMode = 'parametric' | 'convolution';
export type HrtfSource = string | URL | ArrayBuffer | ArrayBufferView;
export declare const HRTF_ASSET_FILES: Record<HrtfLoadMode, string>;
export declare const FACADE_SOURCE_RAY_WIDTH = 16;
export declare const FACADE_SOURCE_RAY_HEIGHT = 16;
export declare const FACADE_SOURCE_RAY_DEPTH = 6;
export declare const FACADE_DISTANCE_ATTENUATION: {
    x: number;
    y: number;
    z: number;
};
export declare const FACADE_SOURCE_RENDER_STATISTICS_LENGTH = 9;
export declare const FACADE_STATISTICS_RAY_DATA_LIMIT = 64;
export declare const FACADE_STATISTICS_PATHS: readonly SourcePathType[];
export declare class SoundTraceMtUnsupportedError extends Error {
    readonly code = "UNSUPPORTED_MT_NATIVE";
    constructor(message: string, options?: {
        readonly cause?: unknown;
    });
}
export interface StatisticsSnapshotOptions {
    readonly source?: Source;
    readonly sourceStatisticsLength?: number;
    readonly includeValidPaths?: boolean;
    readonly validPathLimit?: number;
    readonly includeRayData?: boolean;
    readonly rayDataLimit?: number;
}
export interface StatisticsSourceSnapshot {
    readonly sourceId: number;
    readonly values: Float32Array;
}
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
export declare function normalizeCaughtError(error: unknown): Error;
export declare function fetchJson(url: string, label: string): Promise<unknown>;
export declare function normalizeStatisticsLength(value: number | undefined): number;
export declare function normalizeOptionalLimit(value: number | undefined, label: string): number | undefined;
export declare function normalizeLimit(value: number | undefined, fallback: number, label: string): number;
export declare function assertNeverHrtfMode(value: never): never;
export declare function resolveHrtfLoadMode(mode: HrtfLoadMode): HrtfLoadMode;
//# sourceMappingURL=SoundTrace-types.d.ts.map