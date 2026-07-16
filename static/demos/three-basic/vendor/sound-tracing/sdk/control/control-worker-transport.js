import { isAudioWorkletBridgeEvent } from '../mt/soundtrace-mt-native-audio.js';
export function createWorkerControlTransport(worker) {
    return {
        postMessage(message, transfer = []) {
            worker.postMessage(message, transfer);
        },
        onMessage(handler) {
            const onMessage = (event) => {
                // The worker multiplexes bridge events onto this channel;
                // MtNativeAudioBridge owns those. Both listeners share one predicate so
                // they can never disagree about who owns a message. Anything else is
                // forwarded verbatim — validating it is the client's job, not ours.
                if (isAudioWorkletBridgeEvent(event.data))
                    return;
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