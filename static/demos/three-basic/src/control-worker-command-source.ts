import type { CommandExecutionResult, CommandRequest } from './control-protocol.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
import { toAppliedResult, toDeleteResult } from './control-worker-command-results.js';

export async function executeCreateSource(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'createSource') {
    return unsupportedResult(command.id, 'non-createSource command routed to createSource executor');
  }
  if (context.sourceHandleMap.has(command.command.handle)) {
    return badHandle(command.id, `duplicate source handle: ${command.command.handle}`);
  }

  const createSource = context.dependencies.createSource ?? context.getRuntime()?.createSource;
  if (!createSource) {
    return coreError(command.id, 'source create adapter is not installed on this worker runtime');
  }

  try {
    const engineId = await createSource(command.command);
    context.sourceHandleMap.set(command.command.handle, engineId);
    return { id: command.id, result: { engineId } };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      `[soundtrace.js] createSource failed for handle ${command.command.handle}`,
    );
  }
}

export async function executeDeleteSource(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'deleteSource') {
    return unsupportedResult(command.id, 'non-deleteSource command routed to deleteSource executor');
  }

  const engineId = context.sourceHandleMap.get(command.command.handle);
  if (engineId === undefined) {
    return badHandle(command.id, `unknown source handle: ${command.command.handle}`);
  }

  const deleteSource = context.dependencies.deleteSource ?? context.getRuntime()?.deleteSource;
  if (!deleteSource) {
    return coreError(command.id, 'source delete adapter is not installed on this worker runtime');
  }

  try {
    const payload = await deleteSource({ ...command.command, engineId });
    context.sourceHandleMap.delete(command.command.handle);
    return { id: command.id, result: toDeleteResult(payload, engineId) };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      `[soundtrace.js] deleteSource failed for handle ${command.command.handle}`,
    );
  }
}

export async function executeSetSourceParam(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'setSourceParam') {
    return unsupportedResult(command.id, 'non-setSourceParam command routed to setSourceParam executor');
  }
  if (hasSourceTransformPatch(command.command.patch)) {
    return unsupportedResult(command.id, `transform-like source params are not supported in command lane for handle ${command.command.handle}`);
  }

  const engineId = context.sourceHandleMap.get(command.command.handle);
  if (engineId === undefined) {
    return badHandle(command.id, `unknown source handle: ${command.command.handle}`);
  }

  const setSourceParam = context.dependencies.setSourceParam ?? context.getRuntime()?.setSourceParam;
  if (!setSourceParam) {
    return coreError(command.id, 'source setSourceParam adapter is not installed on this worker runtime');
  }

  try {
    const payload = await setSourceParam({ ...command.command, engineId });
    return { id: command.id, result: toAppliedResult(payload, { engineId }) };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      `[soundtrace.js] setSourceParam failed for handle ${command.command.handle}`,
    );
  }
}

export async function executeStartAudioSource(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'startAudioSource') {
    return unsupportedResult(command.id, 'non-startAudioSource command routed to startAudioSource executor');
  }

  const engineId = context.sourceHandleMap.get(command.command.handle);
  if (engineId === undefined) {
    return badHandle(command.id, `unknown source handle: ${command.command.handle}`);
  }

  const startAudioSource = context.getRuntime()?.startAudioSource;
  if (!startAudioSource) {
    return coreError(command.id, 'source audio start adapter is not installed on this worker runtime');
  }

  try {
    const payload = await startAudioSource({ ...command.command, engineId });
    return {
      id: command.id,
      result: toAppliedResult(payload, {
        engineId,
        sessionId: command.command.sessionId,
      }),
    };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      `[soundtrace.js] startAudioSource failed for handle ${command.command.handle}`,
    );
  }
}

export async function executeStopAudioSource(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'stopAudioSource') {
    return unsupportedResult(command.id, 'non-stopAudioSource command routed to stopAudioSource executor');
  }

  const stopAudioSource = context.getRuntime()?.stopAudioSource;
  if (!stopAudioSource) {
    return coreError(command.id, 'source audio stop adapter is not installed on this worker runtime');
  }

  try {
    const payload = await stopAudioSource(command.command);
    return {
      id: command.id,
      result: toAppliedResult(payload, {
        sessionId: command.command.sessionId,
      }),
    };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      `[soundtrace.js] stopAudioSource failed for session ${command.command.sessionId}`,
    );
  }
}

export async function executeSetRenderOption(
  command: CommandRequest,
  context: ControlWorkerCommandContext,
): Promise<CommandExecutionResult> {
  if (command.command.op !== 'setRenderOption') {
    return unsupportedResult(command.id, 'non-setRenderOption command routed to setRenderOption executor');
  }

  const engineId = context.sourceHandleMap.get(command.command.source);
  if (engineId === undefined) {
    return badHandle(command.id, `unknown source handle: ${command.command.source}`);
  }

  const setRenderOption = context.dependencies.setRenderOption ?? context.getRuntime()?.setRenderOption;
  if (!setRenderOption) {
    return coreError(command.id, 'source render option adapter is not installed on this worker runtime');
  }

  try {
    const payload = await setRenderOption({ ...command.command, engineId });
    return { id: command.id, result: toAppliedResult(payload, { engineId }) };
  } catch (error) {
    return commandFailure(
      command.id,
      error instanceof Error ? error : context.normalizeCaughtUnknown(error),
      context,
      `[soundtrace.js] setRenderOption failed for source ${command.command.source}`,
    );
  }
}

function hasSourceTransformPatch(patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((key) =>
    key === 'position'
    || key === 'direction'
    || key === 'velocity'
    || key === 'intensity',
  );
}

function badHandle(id: number, message: string): CommandExecutionResult {
  return { id, error: { code: 'BAD_HANDLE', message: `[soundtrace.js] ${message}` } };
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
