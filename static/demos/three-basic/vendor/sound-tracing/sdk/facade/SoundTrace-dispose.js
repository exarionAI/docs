import { normalizeCaughtError } from './SoundTrace-types.js';
/** Dispose is terminal (M8 contract): it runs exactly once, entity dispose
 *  after it is a no-op, and load() after it throws. */
export function disposeSoundTrace(self) {
    if (self._disposed)
        return;
    releaseSoundTraceResources(self);
}
/** The actual teardown, shared between dispose() and the load()-tail that
 *  releases a load which finished AFTER dispose() already ran (finding #5 —
 *  without it the late assignment resurrected the instance and leaked the
 *  worker + its pthread pool forever, since the _disposed guard stops
 *  dispose() from ever running again). */
export function releaseSoundTraceResources(self) {
    try {
        self._output?.disconnect();
    }
    catch (error) {
        const disconnectError = error instanceof Error ? error : new Error(String(error));
        console.warn('[soundtrace.js] output disconnect failed during teardown', disconnectError);
    }
    if (self._workerHostedControl) {
        const { audioBridge, client, worker } = self._workerHostedControl;
        self._workerHostedControl = null;
        self._mtFacadeState?.dispose();
        self._mtFacadeState = null;
        audioBridge?.dispose();
        // Post the dispose request BEFORE terminating so the worker-side
        // teardown (runtime.dispose: native handle destruction + exaReset)
        // actually runs — the old synchronous terminate() won the race against
        // the microtask-scheduled postMessage every time, leaving that whole
        // path dead code (finding #28). The fallback timer bounds a hung worker.
        const terminate = () => {
            try {
                worker.terminate();
            }
            catch { /* already gone */ }
        };
        const fallback = setTimeout(terminate, 1000);
        void client.dispose()
            .catch((error) => {
            console.warn('[soundtrace.js] control worker dispose failed during teardown', normalizeCaughtError(error));
        })
            .finally(() => {
            clearTimeout(fallback);
            terminate();
        });
    }
    else {
        try {
            self._bindings?.exaReset();
        }
        catch (error) {
            const resetError = error instanceof Error ? error : new Error(String(error));
            console.warn('[soundtrace.js] native runtime reset failed during teardown', resetError);
        }
    }
    self._output = null;
    self._materials = null;
    self._propagator = null;
    self._diagnostics = null;
    self._bindings = null;
    self._heap = null;
    self.module = null;
    self._mtFacadeState = null;
    self._scene = null;
    self._sceneListener = null;
    self._facadeListener = null;
    self._workletInitPromise = null;
    self._mtAudioWorkletInitPromise = null;
    self._gpuEnablePromise = null;
    self._gpuEnabled = false;
    self._loadPromise = null;
    self._ctxHandle = 0;
    self._disposed = true;
}
//# sourceMappingURL=SoundTrace-dispose.js.map