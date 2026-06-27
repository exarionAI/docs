import { normalizeCaughtError } from './SoundTrace-types.js';
import type { SoundTrace } from './SoundTrace.js';

export function disposeSoundTrace(self: SoundTrace): void {
  if (self._disposed) return;
  try {
    self._output?.disconnect();
  } catch (error) {
    const disconnectError = error instanceof Error ? error : new Error(String(error));
    console.warn(
      '[soundtrace.js] output disconnect failed during teardown',
      disconnectError,
    );
  }
  if (self._workerHostedControl) {
    const { client, worker } = self._workerHostedControl;
    self._workerHostedControl = null;
    self._mtFacadeState?.dispose();
    self._mtFacadeState = null;
    void client.dispose().catch((error: unknown) => {
      console.warn(
        '[soundtrace.js] control worker dispose failed during teardown',
        normalizeCaughtError(error),
      );
    });
    worker.terminate();
  } else {
    try {
      self._bindings?.exaReset();
    } catch (error) {
      const resetError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        '[soundtrace.js] native runtime reset failed during teardown',
        resetError,
      );
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
  self._loadPromise = null;
  self._ctxHandle = 0;
  self._disposed = true;
}
