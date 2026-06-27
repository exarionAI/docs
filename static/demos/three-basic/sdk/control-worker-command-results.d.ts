import type { CommandExecutionFailure, CommandExecutionResult, CommandRequest, ControlResponse, EngineId, FrameResultResponse } from './control-protocol.js';
import type { FrameExecutionResult } from './control-worker-runtime-types.js';
export declare function normalizeFrameResult(result: FrameExecutionResult): FrameExecutionResult;
export declare function alignCommandOutcomes(commands: readonly CommandRequest[], results: readonly CommandExecutionResult[], toCommandError: (error: unknown, fallbackMessage: string) => CommandExecutionFailure['error']): CommandExecutionResult[];
export declare function emitCommandOutcomes(postResponse: (response: ControlResponse) => void, outcomes: readonly CommandExecutionResult[], commands: readonly CommandRequest[]): void;
export declare function toCreateMeshResult(engineId: EngineId): {
    readonly engineId: EngineId;
};
export declare function toDeleteResult(payload: unknown, engineId: EngineId): Record<string, unknown>;
export declare function toAppliedResult(payload: unknown, fields: Record<string, unknown>): Record<string, unknown>;
export declare function toFrameResultResponse(id: number, result: FrameExecutionResult): FrameResultResponse;
//# sourceMappingURL=control-worker-command-results.d.ts.map