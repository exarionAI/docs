import { ControlClient } from '../control/control-client.js';
import { createWorkerControlTransport } from '../control/control-worker-transport.js';
import { createControlWorkerBootstrapUrl, releaseControlWorkerBootstrapUrl, resolveControlWorkerCoreBaseUrl, } from '../control/control-worker-bootstrap.js';
import { MtNativeAudioBridge } from './soundtrace-mt-native-audio.js';
import { createMtHotTransformLanes } from './soundtrace-mt-hot-transforms.js';
export async function loadMtWorkerHostedControl(options) {
    const hotTransforms = createMtHotTransformLanes();
    const worker = createControlWorker();
    const audioBridge = new MtNativeAudioBridge(options.audioContext, worker);
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
            audioBridge,
            hotTransforms,
            worker,
            ready: response,
        };
    }
    catch (error) {
        audioBridge.dispose();
        await disposeClientAfterInitFailure(client);
        worker.terminate();
        throw error;
    }
}
function createControlWorker() {
    const workerModuleUrl = new URL('../control/control-worker.js', import.meta.url).href;
    const workerBootstrapUrl = createControlWorkerBootstrapUrl(workerModuleUrl);
    try {
        return new Worker(workerBootstrapUrl, {
            type: 'classic',
            name: 'soundtrace-control-worker',
        });
    }
    catch (error) {
        throw new Error('[soundtrace.js] failed to create control worker', {
            cause: normalizeCaughtError(error),
        });
    }
    finally {
        releaseControlWorkerBootstrapUrl(workerBootstrapUrl);
    }
}
async function disposeClientAfterInitFailure(client) {
    try {
        await client.dispose();
    }
    catch (error) {
        const disposeError = error instanceof Error ? error : new Error(String(error));
        console.warn('[soundtrace.js] control worker client dispose failed after init error', disposeError);
    }
}
function normalizeCaughtError(error) {
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
}
//# sourceMappingURL=soundtrace-mt-worker-load.js.map