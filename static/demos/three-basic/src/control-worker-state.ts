import type {
  ClientHandle,
  CommandRequest,
  DebugSnapshotOptions,
  EngineId,
} from './control-protocol.js';
import type { ControlWorkerRuntime } from './control-worker-runtime-types.js';

export interface PendingFrame {
  readonly id: number;
  readonly dt: number;
}

export interface PendingDebugSnapshot {
  readonly id: number;
  readonly options: DebugSnapshotOptions;
}

export interface ControlWorkerState {
  runtime: ControlWorkerRuntime | null;
  readonly pendingFrames: PendingFrame[];
  readonly pendingCommands: CommandRequest[];
  readonly pendingDebugSnapshots: PendingDebugSnapshot[];
  readonly sourceHandleMap: Map<ClientHandle, EngineId>;
  readonly meshHandleMap: Map<ClientHandle, EngineId>;
  controlLoopRunning: boolean;
  disposed: boolean;
}

export function createControlWorkerState(): ControlWorkerState {
  return {
    runtime: null,
    pendingFrames: [],
    pendingCommands: [],
    pendingDebugSnapshots: [],
    sourceHandleMap: new Map<ClientHandle, EngineId>(),
    meshHandleMap: new Map<ClientHandle, EngineId>(),
    controlLoopRunning: false,
    disposed: false,
  };
}
