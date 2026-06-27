import type {
  ControlRequest,
  ControlResponse,
  ControlTransport,
} from './control-protocol.js';

export function createWorkerControlTransport(worker: Worker): ControlTransport {
  return {
    postMessage(message: ControlRequest): void {
      worker.postMessage(message);
    },
    onMessage(handler: (response: ControlResponse) => void): () => void {
      const onMessage = (event: MessageEvent<ControlResponse>): void => {
        handler(event.data);
      };
      const onError = (event: ErrorEvent): void => {
        handler({
          kind: 'error',
          code: 'CORE_ERROR',
          message: `[soundtrace.js] control worker error: ${event.message || 'unknown worker error'}`,
          fatal: true,
        });
      };
      const onMessageError = (): void => {
        handler({
          kind: 'error',
          code: 'CORE_ERROR',
          message: '[soundtrace.js] control worker messageerror',
          fatal: true,
        });
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.addEventListener('messageerror', onMessageError);

      return () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        worker.removeEventListener('messageerror', onMessageError);
      };
    },
  };
}
