import type {
  DebugSnapshot,
  DebugSnapshotOptions,
  ControlCommand,
} from './control-protocol.js';
import type {
  AudioOption,
  Vec3,
} from './native/index.js';
import type {
  QualityTier,
  SourcePathOptions,
  SourcePathType,
} from './facade.js';
import type {
  DelayInterpolation,
  DiffuseQuality,
  HrtfQuality,
  LateReverbMode,
} from './SoundListener.js';

export interface MtFacadeClient {
  command(command: ControlCommand): Promise<unknown>;
  frame(dt: number): Promise<{ readonly updateReturn: number; readonly validPathCount?: number }>;
  debugSnapshot(options: DebugSnapshotOptions): Promise<DebugSnapshot>;
  dispose(): Promise<void>;
}

export interface MtCommandScheduler {
  assertHostLive(operation: string): void;
  assertSourceHandle(handle: number): void;
  assertMeshHandle(handle: number): void;
  deleteSourceHandle(handle: number): void;
  deleteMeshHandle(handle: number): void;
  queueCommand(command: ControlCommand): void;
  stageListenerTransform(cache: ListenerCache): void;
  stageMeshTransform(handle: number, cache: ObjectCache): void;
  stageSourceTransform(handle: number, cache: SourceCache): void;
}

export interface SourceCache {
  position: Vec3;
  direction: Vec3;
  intensity: number;
  paths: {
    direct: boolean;
    reflection: boolean;
    reverberation: boolean;
    diffraction: boolean;
  };
  velocity: Vec3;
}

export interface ListenerCache {
  position: Vec3;
  orientation: readonly [number, number, number, number];
  audioOption: AudioOption;
  renderOptions: {
    hrtfQuality: HrtfQuality;
    diffuseEnabled: boolean;
    diffuseQuality: DiffuseQuality;
    lateReverbMode: LateReverbMode;
    perBandLateReverb: boolean;
    delayInterpolation: DelayInterpolation;
    earlyRenderPathBudget: number;
  };
  rayCount: readonly [number, number];
  rayDepth: number;
}

export interface ObjectCache {
  position: Vec3;
  orientation: readonly [number, number, number, number];
  scale: Vec3;
  updateType: number;
}

export interface SourcePathPatch {
  readonly path: SourcePathType;
  readonly enabled: boolean;
}

export interface MtListenerQualityState {
  readonly quality: QualityTier;
  readonly listener: ListenerCache;
}
