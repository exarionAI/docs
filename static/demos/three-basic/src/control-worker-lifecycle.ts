import type {
  ErrorResponse,
  InitRequest,
} from './control-protocol.js';
import {
  normalizeCaughtUnknown,
  toControlError,
  type ControlWorkerRuntimeError,
} from './control-worker-error-utils.js';
import type {
  ControlWorkerDependencies,
} from './control-worker-host-types.js';
import type {
  ControlWorkerState,
  PendingDebugSnapshot,
} from './control-worker-state.js';

interface LifecycleContext {
  readonly dependencies: ControlWorkerDependencies;
  readonly state: ControlWorkerState;
}

export async function handleWorkerInit(
  request: InitRequest,
  context: LifecycleContext,
): Promise<void> {
  if (context.state.disposed) {
    context.dependencies.postResponse({
      kind: 'error',
      id: request.id,
      code: 'DISPOSED',
      message: '[soundtrace.js] worker host is disposed; create a new instance after dispose',
    });
    return;
  }

  const baseUrl = request.coreBaseUrl.replace(/\/$/, '');
  const glueUrl = `${baseUrl}/${request.thread}/exaSound.js`;

  try {
    await context.dependencies.loadScript(glueUrl);
    const module = await context.dependencies.createModule(glueUrl, {
      locateFile: (path: string) => `${baseUrl}/${request.thread}/${path}`,
      mainScriptUrlOrBlob: glueUrl,
      pthreadPoolSize: request.pthreadPoolSize,
      printErr: (...args: readonly unknown[]) => {
        const message = args.map((arg) => String(arg)).join(' ');
        context.dependencies.postResponse({
          kind: 'log',
          level: 'error',
          message,
        });
      },
    });
    context.state.runtime = await context.dependencies.createRuntime(module, request);
    context.dependencies.postResponse({
      kind: 'ready',
      id: request.id,
      workerHostedControl: true,
    });
  } catch (error) {
    let caughtError: unknown;
    if (error instanceof Error) {
      caughtError = error;
    } else {
      caughtError = normalizeCaughtUnknown(error);
    }
    context.state.runtime = null;
    const initError = toControlError(
      caughtError,
      'INIT_FAILED',
      '[soundtrace.js] control-worker init failed',
    );
    const response: ErrorResponse = {
      kind: 'error',
      id: request.id,
      code: initError.code,
      message: initError.message,
      fatal: initError.fatal ?? true,
    };
    context.dependencies.postResponse(response);
  }
}

export async function handleWorkerDispose(
  request: { readonly kind: 'dispose'; readonly id: number },
  context: LifecycleContext,
): Promise<void> {
  if (context.state.disposed) {
    context.dependencies.postResponse({
      kind: 'result',
      id: request.id,
      result: { disposed: true },
    });
    return;
  }

  const disposeError = await terminateWorkerRuntime(context);
  if (disposeError) {
    context.dependencies.postResponse({
      kind: 'error',
      id: request.id,
      code: disposeError.code,
      message: disposeError.message,
      fatal: disposeError.fatal,
    });
    return;
  }

  context.dependencies.postResponse({
    kind: 'result',
    id: request.id,
    result: { disposed: true },
  });
}

export function markWorkerFatal(
  error: unknown,
  context: LifecycleContext,
): void {
  const pendingCommands = [...context.state.pendingCommands];
  const pendingSnapshots = [...context.state.pendingDebugSnapshots];
  const reason = {
    ...toControlError(
      error,
      'CORE_ERROR',
      '[soundtrace.js] control-loop fatal',
    ),
    fatal: true,
  };
  void terminateWorkerRuntime(context, reason).then((cleanupError) => {
    if (!cleanupError) {
      return;
    }
    context.dependencies.postResponse({
      kind: 'log',
      level: 'error',
      message: `[soundtrace.js] markFatal cleanup failed: ${cleanupError.message}`,
    });
  });

  for (const command of pendingCommands) {
    context.dependencies.postResponse({
      kind: 'error',
      id: command.id,
      code: 'CORE_ERROR',
      message: reason.message,
      fatal: true,
    });
  }

  rejectPendingSnapshots(pendingSnapshots, reason, context.dependencies);
}

export async function terminateWorkerRuntime(
  context: LifecycleContext,
  fatalError?: ControlWorkerRuntimeError,
): Promise<ControlWorkerRuntimeError | null> {
  if (context.state.disposed) {
    context.state.runtime = null;
    context.state.pendingFrames.length = 0;
    context.state.pendingCommands.length = 0;
    context.state.pendingDebugSnapshots.length = 0;
    return null;
  }

  context.state.disposed = true;
  context.state.controlLoopRunning = false;
  context.state.pendingFrames.length = 0;
  context.state.pendingCommands.length = 0;
  context.state.pendingDebugSnapshots.length = 0;
  context.state.sourceHandleMap.clear();
  context.state.meshHandleMap.clear();
  let cleanupError: ControlWorkerRuntimeError | null = null;

  if (context.state.runtime) {
    try {
      await context.state.runtime.dispose();
    } catch (disposeError) {
      let caughtError: unknown;
      if (disposeError instanceof Error) {
        caughtError = disposeError;
      } else {
        caughtError = normalizeCaughtUnknown(disposeError);
      }
      cleanupError = toControlError(
        caughtError,
        'CORE_ERROR',
        '[soundtrace.js] dispose failed',
      );
    }
    context.state.runtime = null;
  }

  if (fatalError !== undefined) {
    context.dependencies.postResponse({
      kind: 'error',
      code: fatalError.code,
      message: fatalError.message,
      fatal: fatalError.fatal,
    });
  }

  return cleanupError;
}

function rejectPendingSnapshots(
  snapshots: readonly PendingDebugSnapshot[],
  reason: ControlWorkerRuntimeError,
  dependencies: ControlWorkerDependencies,
): void {
  for (const snapshot of snapshots) {
    dependencies.postResponse({
      kind: 'error',
      id: snapshot.id,
      code: 'CORE_ERROR',
      message: reason.message,
      fatal: true,
    });
  }
}
