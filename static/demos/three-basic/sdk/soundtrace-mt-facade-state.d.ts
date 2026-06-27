import { Listener, Mesh, Source, type CoordinateTransform, type ObjectUpdateType, type QualityTier, type SourcePathOptions, type Vec3In } from './facade.js';
import type { DebugSnapshot, DebugSnapshotOptions } from './control-protocol.js';
import type { AudioOption, Triangle } from './native/index.js';
import type { SoundTrace } from './SoundTrace.js';
import { type MtHotTransformLanes } from './soundtrace-mt-hot-transforms.js';
import type { ListenerCache, MtCommandScheduler, MtFacadeClient, ObjectCache, SourceCache } from './soundtrace-mt-facade-types.js';
export declare class SoundTraceMtFacadeState implements MtCommandScheduler {
    private readonly host;
    private readonly client;
    private readonly coordinateTransform;
    private readonly hotTransformBridge;
    private readonly activeSourceHandles;
    private readonly activeMeshHandles;
    private readonly pendingCommands;
    private nextSourceHandle;
    private nextMeshHandle;
    private pendingError;
    private disposed;
    private readonly listenerCache;
    readonly listener: Listener;
    constructor(options: {
        readonly client: MtFacadeClient;
        readonly coordinateTransform: CoordinateTransform;
        readonly host: SoundTrace;
        readonly hotTransforms: MtHotTransformLanes;
        readonly quality: QualityTier;
        readonly sampleRate: number;
    });
    assertHostLive(operation: string): void;
    assertSourceHandle(handle: number): void;
    assertMeshHandle(handle: number): void;
    deleteSourceHandle(handle: number): void;
    deleteMeshHandle(handle: number): void;
    queueCommand(command: Parameters<MtFacadeClient['command']>[0]): void;
    stageListenerTransform(cache: ListenerCache): void;
    stageMeshTransform(handle: number, cache: ObjectCache): void;
    stageSourceTransform(handle: number, cache: SourceCache): void;
    addSource(options: {
        readonly gain?: number;
        readonly paths?: SourcePathOptions;
        readonly position: Vec3In;
    }): Source;
    addMesh(options: {
        readonly indices?: ArrayLike<number>;
        readonly material: number;
        readonly triangles?: Triangle[];
        readonly updateType?: ObjectUpdateType;
        readonly vertices: ArrayLike<number>;
    }): Mesh;
    applyQuality(quality: QualityTier): void;
    applyAudioOption(option: AudioOption): void;
    update(dt: number): Promise<number>;
    debugSnapshot(options: DebugSnapshotOptions): Promise<DebugSnapshot>;
    reset(): Promise<void>;
    dispose(): void;
    private flushPending;
}
//# sourceMappingURL=soundtrace-mt-facade-state.d.ts.map