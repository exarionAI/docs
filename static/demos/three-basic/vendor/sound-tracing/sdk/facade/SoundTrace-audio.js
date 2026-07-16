import { SoundSource } from '../engine/SoundSource.js';
export async function playSource(self, source, channels) {
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState && self._workerHostedControl) {
        return self.createMtAudioWorkletNode(source.native.id, channels);
    }
    const listener = self._sceneListener;
    if (!listener)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    const native = source.native;
    if (!(native instanceof SoundSource)) {
        throw self.createMtUnsupportedError('source.play');
    }
    return self.createWorkletNode(listener, native, channels);
}
export async function createWorkletNode(self, listener, source, channels = 2) {
    await self._ensureWorkletReady();
    const handle = self.bindings().exa_audio_worklet_create_node(self._ctxHandle, listener.id, source.id, channels);
    if (!handle) {
        throw new Error('[soundtrace.js] exa_audio_worklet_create_node returned 0 — init incomplete or alloc failed');
    }
    const node = self.audioWorkletNodeFromHandle(handle);
    // Pin the input channel count explicitly. exaSound's SoundRenderer::Render
    // branches on `if (channelCount > 1) monoMixer.Process(...)` and skips
    // filling monoBuffer when given a 1-channel input → silent output.
    // Forcing 'explicit' mode with 'speakers' interpretation auto-upmixes
    // single-channel upstreams (mono mp3, etc.) to the requested channel count.
    node.channelCount = channels;
    node.channelCountMode = 'explicit';
    node.channelInterpretation = 'speakers';
    return node;
}
export async function createMtAudioWorkletNode(self, sourceHandle, channels) {
    if (!self._workerHostedControl) {
        throw new Error('[soundtrace.js] not loaded — call load() first');
    }
    if (!Number.isInteger(sourceHandle) || sourceHandle < 1) {
        throw new Error(`[soundtrace.js] invalid MT source handle ${sourceHandle}`);
    }
    const sessionId = self._nextMtAudioSessionId++;
    const startPromise = self._workerHostedControl.client.command({
        op: 'startAudioSource',
        sessionId,
        handle: sourceHandle,
        channels,
    });
    self.pumpMtControlLoop();
    const result = await startPromise;
    const nodeId = readAudioNodeId(result);
    const node = await self._workerHostedControl.audioBridge.takeNode(nodeId);
    node.channelCount = channels;
    node.channelCountMode = 'explicit';
    node.channelInterpretation = 'speakers';
    return node;
}
export function pumpMtControlLoop(self) {
    const workerHostedControl = self._workerHostedControl;
    if (!workerHostedControl) {
        return;
    }
    void workerHostedControl.client.frame(0).catch(() => undefined);
}
export async function createMixerWorkletNode(self, listener, sources, channels = 2) {
    if (sources.length === 0) {
        throw new Error('[soundtrace.js] createMixerWorkletNode requires at least one source');
    }
    await self._ensureWorkletReady();
    const heap = self.heap();
    const ids = sources.map((source) => source.id);
    const handle = heap.withScope((scope) => {
        const idsPtr = scope.alloc(ids.length * 4);
        heap.writeU32Array(idsPtr, ids);
        return self.bindings().exa_audio_worklet_create_mixer_node(self._ctxHandle, listener.id, idsPtr, ids.length, channels);
    });
    if (!handle) {
        throw new Error('[soundtrace.js] exa_audio_worklet_create_mixer_node returned 0 — init incomplete or alloc failed');
    }
    const node = self.audioWorkletNodeFromHandle(handle);
    // The native mixer worklet has one input bus. That bus is packed as one
    // mono channel per source; `channels` is the native render/output channel
    // count, not the Web Audio input channel count.
    node.channelCount = sources.length;
    node.channelCountMode = 'explicit';
    node.channelInterpretation = 'discrete';
    return node;
}
export function audioWorkletNodeFromHandle(self, handle) {
    const mod = self.requireModule();
    if (!mod.emscriptenGetAudioObject) {
        throw new Error('[soundtrace.js] emscriptenGetAudioObject not exported (build missing -sAUDIO_WORKLET=1)');
    }
    const node = mod.emscriptenGetAudioObject(handle);
    if (!(node instanceof AudioWorkletNode)) {
        throw new Error(`[soundtrace.js] unexpected object type for worklet node handle ${handle}`);
    }
    return node;
}
export function ensureWorkletReady(self) {
    if (self._workletInitPromise)
        return self._workletInitPromise;
    self._workletInitPromise = self._bootstrapWorklet();
    return self._workletInitPromise;
}
export function bootstrapWorklet(self) {
    const mod = self.requireModule();
    if (!mod.emscriptenRegisterAudioObject) {
        return Promise.reject(new Error('[soundtrace.js] emscriptenRegisterAudioObject not exported (build missing -sAUDIO_WORKLET=1)'));
    }
    if (!mod.addFunction || !mod.removeFunction) {
        return Promise.reject(new Error('[soundtrace.js] addFunction/removeFunction not exported (build missing -sALLOW_TABLE_GROWTH=1)'));
    }
    const addFunction = mod.addFunction;
    const removeFunction = mod.removeFunction;
    self._ctxHandle = mod.emscriptenRegisterAudioObject(self.ctx);
    return new Promise((resolve, reject) => {
        let cbPtr = 0;
        let timer;
        // exa_audio_worklet_init's onReady is void(*)(void*) — it carries NO
        // success flag and the core fires it on the FAILURE path too
        // (AudioWorkletEntry.cpp thread_initialized_cb / processor_created_cb).
        // The one failure cause we can name is the worklet module load: the
        // emscripten glue drives it through ctx.audioWorklet.addModule, so wrap
        // it for the init window and report a captured error instead of
        // resolving — otherwise create_node later returns 0 and the error blames
        // node creation for a module that never loaded (finding #24; mirrors the
        // MT fix in control-worker-native-audio.ts ensureReady).
        let moduleLoadError = null;
        let restoreAddModule = () => { };
        const aw = self.ctx.audioWorklet;
        if (aw && typeof aw.addModule === 'function') {
            const original = aw.addModule;
            const hadOwn = Object.prototype.hasOwnProperty.call(aw, 'addModule');
            aw.addModule = function (...args) {
                return original.apply(this, args).catch((error) => {
                    moduleLoadError = error instanceof Error ? error.message : String(error);
                    throw error;
                });
            };
            restoreAddModule = () => {
                if (hadOwn)
                    aw.addModule = original;
                else
                    delete aw.addModule;
            };
        }
        // Only the callback itself may free the slot: the core owns cbPtr until
        // its guaranteed single invocation, and there is no cancel entry point.
        // A timeout that called removeFunction handed the index to emscripten's
        // reuse free-list while the core still held it — the late fire then
        // trapped or called an unrelated function (findings #7/#8). The addModule
        // wrap shares that lifetime: it is only undone by the single fire.
        const cb = () => {
            if (timer !== undefined)
                clearTimeout(timer);
            removeFunction(cbPtr);
            restoreAddModule();
            if (moduleLoadError !== null) {
                reject(new Error(`[soundtrace.js] audio worklet init failed — module load failed: ${moduleLoadError}`));
                return;
            }
            resolve();
        };
        cbPtr = addFunction(cb, 'vi');
        // 5 s timeout — the callback normally fires within tens of ms. Rejects
        // only; the slot stays alive for the eventual fire.
        timer = setTimeout(() => {
            reject(new Error('[soundtrace.js] audio worklet init timeout (5s). Verify that ' +
                'ctx.resume() was called and the wasm was linked with -sAUDIO_WORKLET=1.'));
        }, 5000);
        self.bindings().exa_audio_worklet_init(self._ctxHandle, cbPtr, 0);
    });
}
export function requireModule(self) {
    self.assertLocalControlAvailable('audio worklet module access');
    if (!self.module)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    return self.module;
}
export function ensureMtAudioWorkletReady(self) {
    if (!self.ctx.audioWorklet?.addModule) {
        return Promise.reject(new Error('[soundtrace.js] AudioWorklet is not available on this AudioContext'));
    }
    if (self._mtAudioWorkletInitPromise) {
        return self._mtAudioWorkletInitPromise;
    }
    self._mtAudioWorkletInitPromise = self.loadMtAudioWorkletModule();
    return self._mtAudioWorkletInitPromise;
}
export async function loadMtAudioWorkletModule(self) {
    if (!self._workerHostedControl) {
        throw new Error('[soundtrace.js] not loaded — call load() first');
    }
}
function readAudioNodeId(value) {
    if (typeof value === 'object'
        && value !== null
        && 'nodeId' in value
        && typeof value.nodeId === 'number') {
        return value.nodeId;
    }
    throw new Error('[soundtrace.js] control worker did not return a native AudioWorklet node id');
}
//# sourceMappingURL=SoundTrace-audio.js.map