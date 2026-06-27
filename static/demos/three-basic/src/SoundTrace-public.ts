import type {
  CoordinateBasisOption,
  ExecutionMode,
  Listener,
  Mesh,
  ObjectUpdateType,
  QualityTier,
  Source,
  SourcePathOptions,
  ThreadOption,
  Throughput,
  Vec3In,
} from './facade.js';
import type { MaterialRef } from './material-resolver.js';
import type { Triangle } from './native-public.js';
import type {
  HrtfLoadMode,
  HrtfSource,
  StatisticsSnapshot,
  StatisticsSnapshotOptions,
} from './SoundTrace-types.js';

export interface DebugSnapshot {
  readonly validPathCount?: number;
  readonly paths?: readonly unknown[];
  readonly profile?: unknown;
  readonly memoryTrace?: unknown;
}

export interface DebugSnapshotOptions {
  readonly includeProfile?: boolean;
  readonly includeMemory?: boolean;
  readonly includePaths?: boolean;
}

export interface SoundTraceOptions {
  readonly mode?: ExecutionMode;
  readonly thread?: ThreadOption;
  readonly quality?: QualityTier;
  readonly coordinateBasis?: CoordinateBasisOption;
  readonly throughput?: Throughput;
  readonly coreBaseUrl?: string;
  readonly assetBaseUrl?: string;
  readonly propagationThreadCount?: number;
  readonly autoLoadMaterials?: boolean;
}

export interface SoundTraceAudioOptions {
  readonly inputSampleCount?: number;
  readonly outputChannels?: number;
}

export interface SoundTraceAddMeshOptions {
  readonly vertices: ArrayLike<number>;
  readonly indices?: ArrayLike<number>;
  readonly triangles?: Triangle[];
  readonly material?: MaterialRef;
  readonly updateType?: ObjectUpdateType;
}

export interface SoundTraceAddSourceOptions {
  readonly position: Vec3In;
  readonly gain?: number;
  readonly paths?: SourcePathOptions;
}

export interface SoundTraceFacade {
  readonly output: AudioNode;
  readonly audioContext: AudioContext;
  readonly workerHostedControl: boolean;
  readonly listener: Listener;
  readonly disposed: boolean;

  load(): Promise<void>;
  enableGpu(): Promise<boolean>;
  loadHrtf(mode: HrtfLoadMode, source?: HrtfSource): Promise<void>;
  loadMaterialAssets(): Promise<void>;
  setQuality(quality: QualityTier): this;
  setAudioOption(options?: SoundTraceAudioOptions): this;
  getStatistics(options?: StatisticsSnapshotOptions): StatisticsSnapshot;
  addMesh(options: SoundTraceAddMeshOptions): Mesh;
  removeMesh(mesh: Mesh): this;
  addSource(options: SoundTraceAddSourceOptions): Source;
  update(dt?: number): number | Promise<number>;
  debugSnapshot(options?: DebugSnapshotOptions): Promise<DebugSnapshot>;
  reset(): void | Promise<void>;
  dispose(): void;
}

export interface SoundTraceConstructor {
  new(audioContext: AudioContext, options?: SoundTraceOptions): SoundTraceFacade;
  create(audioContext: AudioContext, options?: SoundTraceOptions): Promise<SoundTraceFacade>;
}
