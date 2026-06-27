import { Mesh, Source, type ObjectUpdateType, type QualityTier, type SourcePathOptions, type Vec3In } from './facade.js';
import { SoundScene } from './SoundScene.js';
import { type StatisticsSnapshot, type StatisticsSnapshotOptions, type StatisticsSourceSnapshot } from './SoundTrace-types.js';
import { type MaterialRef } from './material-resolver.js';
import type { DebugSnapshot, DebugSnapshotOptions } from './control-protocol.js';
import type { MeshTriangle } from './SoundTrace-public.js';
import type { SoundTrace } from './SoundTrace.js';
export declare function facadeScene(self: SoundTrace): SoundScene;
export declare function setQuality(self: SoundTrace, quality: QualityTier): SoundTrace;
export declare function setAudioOption(self: SoundTrace, options?: {
    readonly inputSampleCount?: number;
    readonly outputChannels?: number;
}): SoundTrace;
export declare function getStatistics(self: SoundTrace, options?: StatisticsSnapshotOptions): StatisticsSnapshot;
export declare function getSourceStatisticsSnapshot(self: SoundTrace, source: Source, length: number): StatisticsSourceSnapshot;
export declare function addMesh(self: SoundTrace, opts: {
    vertices: ArrayLike<number>;
    indices?: ArrayLike<number>;
    triangles?: MeshTriangle[];
    material?: MaterialRef;
    updateType?: ObjectUpdateType;
}): Mesh;
export declare function removeMesh(self: SoundTrace, mesh: Mesh): SoundTrace;
export declare function addSource(self: SoundTrace, opts: {
    position: Vec3In;
    gain?: number;
    paths?: SourcePathOptions;
}): Source;
export declare function update(self: SoundTrace, dt?: number): number | Promise<number>;
export declare function debugSnapshot(self: SoundTrace, options?: DebugSnapshotOptions): Promise<DebugSnapshot>;
export declare function reset(self: SoundTrace): void | Promise<void>;
//# sourceMappingURL=SoundTrace-facade-methods.d.ts.map