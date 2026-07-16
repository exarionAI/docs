export class ControlWorkerNativeAudio {
    module;
    bindings;
    getListenerId;
    postEvent;
    moduleResults = new Map();
    sessions = new Map();
    port;
    contextHandle;
    previousNodeDescriptor;
    nextModuleRequestId = 1;
    nextNodeId = 1;
    initPromise = null;
    lastModuleError = null;
    constructor(module, bindings, getListenerId, postEvent) {
        this.module = module;
        this.bindings = bindings;
        this.getListenerId = getListenerId;
        this.postEvent = postEvent;
        if (!module.emscriptenRegisterAudioObject || !module.emscriptenGetAudioObject) {
            throw new Error('[soundtrace.js] Emscripten audio object exports are unavailable in MT core');
        }
        this.port = {
            onmessage: null,
            postMessage: (payload) => this.postEvent({
                kind: 'audioWorkletEvent',
                op: 'portMessage',
                payload,
            }),
        };
        const audioWorklet = {
            addModule: (url) => this.addModule(url),
            port: this.port,
        };
        this.contextHandle = module.emscriptenRegisterAudioObject({ audioWorklet });
        this.previousNodeDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'AudioWorkletNode');
        const owner = this;
        Object.defineProperty(globalThis, 'AudioWorkletNode', {
            configurable: true,
            value: class {
                nodeId;
                constructor(_context, name, options) {
                    this.nodeId = owner.nextNodeId++;
                    owner.postEvent({
                        kind: 'audioWorkletEvent',
                        op: 'createNode',
                        nodeId: this.nodeId,
                        name,
                        options,
                    });
                }
            },
        });
    }
    async startSourceSession(command) {
        await this.ensureReady();
        const handle = this.bindings.exa_audio_worklet_create_node(this.contextHandle, this.getListenerId(), command.engineId, command.channels);
        if (!handle) {
            throw new Error('[soundtrace.js] native MT AudioWorklet node creation failed');
        }
        const node = this.module.emscriptenGetAudioObject?.(handle);
        if (!hasNodeId(node)) {
            throw new Error(`[soundtrace.js] unexpected MT AudioWorklet object for handle ${handle}`);
        }
        this.sessions.set(command.sessionId, node.nodeId);
        return { nodeId: node.nodeId, started: true };
    }
    stopSourceSession(sessionId) {
        return { stopped: this.sessions.delete(sessionId) };
    }
    handleRelay(message) {
        if (message.op === 'portMessage') {
            this.port.onmessage?.(new MessageEvent('message', { data: message.payload }));
            return;
        }
        // Kept even when nobody is waiting: ensureReady() has no other way to
        // learn WHY the core reported a failed init (see the note there).
        if (message.error)
            this.lastModuleError = message.error;
        const pending = this.moduleResults.get(message.requestId);
        if (!pending)
            return;
        this.moduleResults.delete(message.requestId);
        if (message.error)
            pending.reject(new Error(message.error));
        else
            pending.resolve();
    }
    /** Drops session bookkeeping without touching the native worklet thread,
     *  which is process-global on the core side and outlives exaReset(). */
    clearSessions() {
        this.sessions.clear();
    }
    dispose() {
        this.sessions.clear();
        const error = new Error('[soundtrace.js] native MT AudioWorklet disposed');
        for (const pending of this.moduleResults.values())
            pending.reject(error);
        this.moduleResults.clear();
        if (this.previousNodeDescriptor) {
            Object.defineProperty(globalThis, 'AudioWorkletNode', this.previousNodeDescriptor);
        }
        else {
            Reflect.deleteProperty(globalThis, 'AudioWorkletNode');
        }
    }
    addModule(url) {
        const requestId = this.nextModuleRequestId++;
        const result = new Promise((resolve, reject) => {
            this.moduleResults.set(requestId, { resolve, reject });
        });
        this.postEvent({
            kind: 'audioWorkletEvent',
            op: 'addModule',
            requestId,
            url,
        });
        return result;
    }
    ensureReady() {
        if (this.initPromise)
            return this.initPromise;
        if (!this.module.addFunction || !this.module.removeFunction) {
            return Promise.reject(new Error('[soundtrace.js] MT AudioWorklet callback exports are unavailable'));
        }
        const addFunction = this.module.addFunction;
        const removeFunction = this.module.removeFunction;
        this.initPromise = new Promise((resolve, reject) => {
            let callbackPtr = 0;
            // The core stores callbackPtr in a file static and guarantees exactly
            // ONE invocation — there is no cancel entry point (AudioWorkletEntry).
            // Freeing the slot here would hand the index to emscripten's reuse
            // free-list while the core still holds it: the late fire then traps or
            // calls an UNRELATED function (findings #7/#8). The timeout only
            // rejects; the slot stays alive until the callback frees itself.
            const timer = setTimeout(() => {
                reject(new Error('[soundtrace.js] native MT AudioWorklet init timeout (5s)'));
            }, 5000);
            callbackPtr = addFunction(() => {
                clearTimeout(timer);
                removeFunction(callbackPtr);
                // exa_audio_worklet_init's onReady is void(*)(void*) — it carries NO
                // success flag, and the core fires it on the failure path too
                // (AudioWorkletEntry.cpp thread_initialized_cb). A relayed addModule
                // error is the one failure cause we can name, so report it here
                // instead of resolving and letting create_node return 0, which would
                // blame node creation for a module that never loaded.
                if (this.lastModuleError !== null) {
                    reject(new Error(`[soundtrace.js] native MT AudioWorklet init failed — module load failed: ${this.lastModuleError}`));
                    return;
                }
                resolve();
            }, 'vi');
            this.bindings.exa_audio_worklet_init(this.contextHandle, callbackPtr, 0);
        });
        return this.initPromise;
    }
}
function hasNodeId(value) {
    return typeof value === 'object'
        && value !== null
        && 'nodeId' in value
        && typeof value.nodeId === 'number';
}
//# sourceMappingURL=control-worker-native-audio.js.map