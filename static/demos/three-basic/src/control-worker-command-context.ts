import type {
  ClientHandle,
  CommandExecutionFailure,
  EngineId,
} from './control-protocol.js';
import type { ControlWorkerDependencies } from './control-worker.js';
import type { ControlWorkerRuntime } from './control-worker-runtime-types.js';

export interface ControlWorkerCommandContext {
  readonly dependencies: ControlWorkerDependencies;
  readonly getRuntime: () => ControlWorkerRuntime | null;
  readonly sourceHandleMap: Map<ClientHandle, EngineId>;
  readonly meshHandleMap: Map<ClientHandle, EngineId>;
  readonly clearHandleMaps: () => void;
  readonly normalizeCaughtUnknown: (error: unknown) => unknown;
  readonly toCommandError: (
    error: unknown,
    fallbackMessage: string,
  ) => CommandExecutionFailure['error'];
}
