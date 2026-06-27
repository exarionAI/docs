export function createWorkerControlTransport(worker) {
    return {
        postMessage(message) {
            worker.postMessage(message);
        },
        onMessage(handler) {
            const onMessage = (event) => {
                handler(event.data);
            };
            const onError = (event) => {
                handler({
                    kind: 'error',
                    code: 'CORE_ERROR',
                    message: `[soundtrace.js] control worker error: ${event.message || 'unknown worker error'}`,
                    fatal: true,
                });
            };
            const onMessageError = () => {
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
//# sourceMappingURL=control-worker-transport.js.map