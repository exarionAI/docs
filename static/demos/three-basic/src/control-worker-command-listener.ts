import type { CommandExecutionResult, CommandRequest } from './control-protocol.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
import { toAppliedResult } from './control-worker-command-results.js';

export async function executeReset(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'reset') {
    return unsupportedResult(command.id, 'non-reset command routed to reset executor');
  }

  const runtime = context.getRuntime();
  if (!runtime) {
    return { id: command.id, error: { code: 'NOT_READY', message: '[soundtrace.js] runtime is not ready for reset' } };
  }

  try {
    await runtime.reset();
    context.clearHandleMaps();
    return { id: command.id, result: { reset: true } };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      '[soundtrace.js] reset failed',
    );
  }
}

export async function executeSetListenerOption(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'setListenerOption') {
    return unsupportedResult(command.id, 'non-setListenerOption command routed to setListenerOption executor');
  }

  const setListenerOption = context.dependencies.setListenerOption ?? context.getRuntime()?.setListenerOption;
  if (!setListenerOption) {
    return coreError(command.id, 'listener option adapter is not installed on this worker runtime');
  }

  try {
    const payload = await setListenerOption(command.command);
    return { id: command.id, result: toAppliedResult(payload, {}) };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      '[soundtrace.js] setListenerOption failed',
    );
  }
}

function coreError(id: number, message: string): CommandExecutionResult {
  return { id, error: { code: 'CORE_ERROR', message: `[soundtrace.js] ${message}` } };
}

function unsupportedResult(id: number, message: string): CommandExecutionResult {
  return { id, error: { code: 'UNSUPPORTED_MT_NATIVE', message: `[soundtrace.js] ${message}` } };
}

function commandFailure(
  id: number,
  error: unknown,
  context: ControlWorkerCommandContext,
  fallbackMessage: string,
): CommandExecutionResult {
  return {
    id,
    error: context.toCommandError(error, fallbackMessage),
  };
}
