import { ControlClient } from './control-client.js';
import { createWorkerControlTransport } from './control-worker-transport.js';
import {
  createControlWorkerBootstrapUrl,
  releaseControlWorkerBootstrapUrl,
  resolveControlWorkerCoreBaseUrl,
} from './control-worker-bootstrap.js';
import type { ReadyResponse, StartupOptions } from './control-protocol.js';
import { createMtHotTransformLanes, type MtHotTransformLanes } from './soundtrace-mt-hot-transforms.js';

export interface MtWorkerLoadOptions {
  readonly coreBaseUrl: string;
  readonly pthreadPoolSize: number;
  readonly startup: StartupOptions;
}

export interface WorkerHostedControlState {
  readonly client: ControlClient;
  readonly hotTransforms: MtHotTransformLanes;
  readonly worker: Worker;
  readonly ready: ReadyResponse;
}

export async function loadMtWorkerHostedControl(
  options: MtWorkerLoadOptions,
): Promise<WorkerHostedControlState> {
  const hotTransforms = createMtHotTransformLanes();
  const worker = createControlWorker();
  const client = new ControlClient(createWorkerControlTransport(worker));

  try {
    const response = await client.send({
      kind: 'init',
      coreBaseUrl: resolveControlWorkerCoreBaseUrl(options.coreBaseUrl),
      hotTransforms,
      pthreadPoolSize: options.pthreadPoolSize,
      startup: options.startup,
      thread: 'mt',
    });
    if (response.kind !== 'ready' || response.workerHostedControl !== true) {
      throw new Error('[soundtrace.js] control worker returned an unexpected init response');
    }

    return {
      client,
      hotTransforms,
      worker,
      ready: response,
    };
  } catch (error) {
    await disposeClientAfterInitFailure(client);
    worker.terminate();
    throw error;
  }
}

function createControlWorker(): Worker {
  const workerModuleUrl = new URL('./control-worker.js', import.meta.url).href;
  const workerBootstrapUrl = createControlWorkerBootstrapUrl(workerModuleUrl);

  try {
    return new Worker(workerBootstrapUrl, {
      type: 'classic',
      name: 'soundtrace-control-worker',
    });
  } catch (error) {
    throw new Error('[soundtrace.js] failed to create control worker', {
      cause: normalizeCaughtError(error),
    });
  } finally {
    releaseControlWorkerBootstrapUrl(workerBootstrapUrl);
  }
}

async function disposeClientAfterInitFailure(client: ControlClient): Promise<void> {
  try {
    await client.dispose();
  } catch (error) {
    const disposeError = error instanceof Error ? error : new Error(String(error));
    console.warn(
      '[soundtrace.js] control worker client dispose failed after init error',
      disposeError,
    );
  }
}

function normalizeCaughtError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}
