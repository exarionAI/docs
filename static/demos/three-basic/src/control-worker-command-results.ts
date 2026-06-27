import type {
  CommandExecutionFailure,
  CommandExecutionResult,
  CommandExecutionSuccess,
  CommandRequest,
  ControlResponse,
  EngineId,
  FrameResultResponse,
  ResultResponse,
} from './control-protocol.js';
import type { FrameExecutionResult } from './control-worker-runtime-types.js';

export function normalizeFrameResult(result: FrameExecutionResult): FrameExecutionResult {
  return {
    updateReturn: result.updateReturn,
    validPathCount: result.validPathCount,
  };
}

export function alignCommandOutcomes(
  commands: readonly CommandRequest[],
  results: readonly CommandExecutionResult[],
  toCommandError: (error: unknown, fallbackMessage: string) => CommandExecutionFailure['error'],
): CommandExecutionResult[] {
  const byId = new Map<number, CommandExecutionResult>();
  for (const result of results) {
    byId.set(result.id, result);
  }

  return commands.map((command) =>
    byId.get(command.id) ?? {
      id: command.id,
      error: toCommandError(undefined, `[soundtrace.js] missing command outcome for request ${command.id}`),
    },
  );
}

export function emitCommandOutcomes(
  postResponse: (response: ControlResponse) => void,
  outcomes: readonly CommandExecutionResult[],
  commands: readonly CommandRequest[],
): void {
  const byId = new Map<number, CommandExecutionResult>(outcomes.map((outcome) => [outcome.id, outcome]));
  for (const command of commands) {
    const outcome = byId.get(command.id);
    if (outcome && isCommandError(outcome)) {
      postResponse({
        kind: 'error',
        id: command.id,
        code: outcome.error.code,
        message: outcome.error.message,
        fatal: outcome.error.fatal,
      });
      continue;
    }

    if (outcome && isCommandSuccess(outcome)) {
      const response: ResultResponse = {
        kind: 'result',
        id: outcome.id,
        result: outcome.result,
      };
      postResponse(response);
      continue;
    }

    postResponse({
      kind: 'error',
      id: command.id,
      code: 'CORE_ERROR',
      message: `[soundtrace.js] command outcome missing for request ${command.id}`,
    });
  }
}

export function toCreateMeshResult(engineId: EngineId): { readonly engineId: EngineId } {
  return { engineId };
}

export function toDeleteResult(payload: unknown, engineId: EngineId): Record<string, unknown> {
  return mergePayload(payload, { engineId, deleted: true });
}

export function toAppliedResult(
  payload: unknown,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  return mergePayload(payload, { ...fields, applied: true });
}

export function toFrameResultResponse(
  id: number,
  result: FrameExecutionResult,
): FrameResultResponse {
  return {
    kind: 'frameResult',
    id,
    updateReturn: result.updateReturn,
    validPathCount: result.validPathCount,
  };
}

function isCommandError(
  outcome: CommandExecutionResult,
): outcome is CommandExecutionFailure {
  return 'error' in outcome;
}

function isCommandSuccess(
  outcome: CommandExecutionResult,
): outcome is CommandExecutionSuccess {
  return 'result' in outcome;
}

function mergePayload(
  payload: unknown,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return defaults;
  }

  const copiedPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    copiedPayload[key] = value;
  }
  return {
    ...copiedPayload,
    ...defaults,
  };
}
