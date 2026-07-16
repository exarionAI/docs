export class MtNativeAudioBridge {
    context;
    worker;
    nodes = new Map();
    nodeFailures = new Map();
    pendingNodes = new Map();
    bootstrapNode = null;
    disposed = false;
    constructor(context, worker) {
        this.context = context;
        this.worker = worker;
        worker.addEventListener('message', this.onWorkerMessage);
    }
    takeNode(nodeId) {
        const failure = this.nodeFailures.get(nodeId);
        if (failure) {
            this.nodeFailures.delete(nodeId);
            return Promise.reject(failure);
        }
        const node = this.nodes.get(nodeId);
        if (node) {
            this.nodes.delete(nodeId);
            return Promise.resolve(node);
        }
        if (this.disposed) {
            return Promise.reject(new Error('[soundtrace.js] MT native audio bridge is disposed'));
        }
        return new Promise((resolve, reject) => {
            this.pendingNodes.set(nodeId, { resolve, reject });
        });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.worker.removeEventListener('message', this.onWorkerMessage);
        this.bootstrapNode?.disconnect();
        this.bootstrapNode = null;
        for (const node of this.nodes.values())
            node.disconnect();
        this.nodes.clear();
        this.nodeFailures.clear();
        const error = new Error('[soundtrace.js] MT native audio bridge is disposed');
        for (const pending of this.pendingNodes.values())
            pending.reject(error);
        this.pendingNodes.clear();
    }
    onWorkerMessage = (event) => {
        if (!isAudioWorkletBridgeEvent(event.data))
            return;
        const bridgeEvent = event.data;
        // handleEvent must never reject into the void: a createNode failure has a
        // takeNode() caller waiting on it, and every other failure needs a voice.
        this.handleEvent(bridgeEvent).catch((error) => {
            this.failEvent(bridgeEvent, toError(error));
        });
    };
    failEvent(event, error) {
        if (event.op === 'createNode') {
            this.failNode(event.nodeId, error);
            return;
        }
        console.error('[soundtrace.js] MT native audio bridge could not handle a worklet event', error);
    }
    failNode(nodeId, error) {
        const pending = this.pendingNodes.get(nodeId);
        if (pending) {
            this.pendingNodes.delete(nodeId);
            pending.reject(error);
            return;
        }
        // The node result can fail before the facade gets around to claiming it.
        this.nodeFailures.set(nodeId, error);
    }
    async handleEvent(event) {
        if (event.op === 'addModule') {
            try {
                await this.context.audioWorklet.addModule(event.url);
                this.postRelay({
                    kind: 'audioWorkletRelay',
                    op: 'moduleResult',
                    requestId: event.requestId,
                });
            }
            catch (error) {
                this.postRelay({
                    kind: 'audioWorkletRelay',
                    op: 'moduleResult',
                    requestId: event.requestId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            return;
        }
        if (event.op === 'portMessage') {
            this.forwardPortMessage(event.payload);
            return;
        }
        const node = new AudioWorkletNode(this.context, event.name, event.options);
        const pending = this.pendingNodes.get(event.nodeId);
        if (pending) {
            this.pendingNodes.delete(event.nodeId);
            pending.resolve(node);
        }
        else {
            this.nodes.set(event.nodeId, node);
        }
    }
    forwardPortMessage(payload) {
        if (isBootstrapMessage(payload)) {
            this.bootstrapNode = new AudioWorkletNode(this.context, 'em-bootstrap', {
                processorOptions: payload,
            });
            this.bootstrapNode.port.onmessage = (event) => {
                this.postRelay({
                    kind: 'audioWorkletRelay',
                    op: 'portMessage',
                    payload: event.data,
                });
            };
            return;
        }
        if (!this.bootstrapNode) {
            throw new Error('[soundtrace.js] AudioWorklet bootstrap message was not received');
        }
        this.bootstrapNode.port.postMessage(payload);
    }
    postRelay(message) {
        this.worker.postMessage(message);
    }
}
export function isAudioWorkletBridgeEvent(value) {
    if (!isRecord(value) || value.kind !== 'audioWorkletEvent')
        return false;
    return value.op === 'addModule'
        || value.op === 'portMessage'
        || value.op === 'createNode';
}
function isBootstrapMessage(value) {
    return isRecord(value) && value._boot === 1;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function toError(value) {
    return value instanceof Error ? value : new Error(String(value));
}
//# sourceMappingURL=soundtrace-mt-native-audio.js.map