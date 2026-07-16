import { loadCore } from '../engine/core-loader.js';
import { makeBindings, Heap, MESH_BUILD_OPTION_SIZE, RUNTIME_OPTION_SIZE, isError, readMeshBuildOption, readRuntimeOption, requireOk, writeMeshBuildOption, writeRuntimeOption } from '../native/index.js';
import { SoundListener } from '../engine/SoundListener.js';
import { SoundScene } from '../engine/SoundScene.js';
import { BVHType } from '../engine/SoundMesh.js';
import { Listener, applyQualityRenderOptions, isIdentityBasis, qualityPreset, webPthreadPoolSize, workerHostedMtSupport } from './facade.js';
import { loadMtWorkerHostedControl } from '../mt/soundtrace-mt-worker-load.js';
import { SoundTraceMtFacadeState } from '../mt/soundtrace-mt-facade-state.js';
import { SoundTraceMtUnsupportedError } from './SoundTrace-types.js';
import { createDisposedError } from '../mt/soundtrace-mt-facade-errors.js';
import { releaseSoundTraceResources } from './SoundTrace-dispose.js';
const GPU_PROPAGATION_MAX_DEPTH = 8;
export async function loadSoundTrace(self) {
    // Dispose is terminal (M8 contract, finding #18): a re-load would build a
    // zombie whose resources nothing can ever reclaim — the _disposed guard
    // stops dispose() from running a second time.
    if (self._disposed) {
        throw createDisposedError('load() is not available after SoundTrace.dispose()');
    }
    if (self.module || self._workerHostedControl)
        return;
    if (self._loadPromise) {
        await self._loadPromise;
        return;
    }
    const loadPromise = self.thread === 'mt'
        ? self.loadWorkerHostedControl()
        : self.loadSingleThreadCore();
    self._loadPromise = loadPromise;
    try {
        await loadPromise;
    }
    catch (error) {
        self._loadPromise = null;
        throw error;
    }
    // dispose() may have run while the load was in flight (finding #5): it
    // found nothing to release back then, so release what the load just built
    // and report the instance dead instead of resurrecting it (the React
    // mount/unmount idiom leaked one worker + pthread pool per cycle).
    if (self._disposed) {
        releaseSoundTraceResources(self);
        throw createDisposedError('SoundTrace was disposed while load() was in flight');
    }
}
/** Build the ST scene graph on an INITIALIZED core: scene + listener wrappers,
 *  coordinate basis, quality preset, default audio option, facade listener.
 *  Called from BOTH load() and reset() — reset() destroys every entity via
 *  exaReset, and keeping this list in one place is what stops the two paths
 *  from drifting apart again (findings #1/#3, root cause #1: every reset bug
 *  was a hand-maintained copy of this list missing an entry). */
export function seedSingleThreadSceneGraph(self) {
    if (!self._bindings || !self._heap)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    self._scene = new SoundScene(self._bindings, self._heap);
    self._sceneListener = new SoundListener(self._bindings, self._heap);
    // Delegate the host->core coordinate frame to the core (HRTF-stage basis)
    // instead of pre-transforming geometry. Identity is left unset so the render
    // stays bit-identical to the no-basis path. (TASK-0014)
    if (!isIdentityBasis(self.coordinateTransform)) {
        const t = self.coordinateTransform;
        if (!self._sceneListener.setCoordinateBasis(t.right, t.up, t.forward)) {
            throw new Error(`[soundtrace.js] failed to set listener coordinate basis: ${self._bindings.exaGetLastError()}`);
        }
    }
    self.applyQualityPreset(self._sceneListener);
    // Apply the default audio option so the ST render path is audible out of the
    // box — symmetric with MT (SoundTraceMtFacadeState seeds defaultAudioOption).
    // Without this the native inputSampleCount stays 0 and the worklet emits
    // silence even though paths are valid. Callers can still override via
    // sound.setAudioOption(...).
    self._sceneListener.setAudioOption({ sampleRate: self.ctx.sampleRate, inputSampleCount: 128, outputChannels: 2 });
    self._scene.setListener(self._sceneListener);
    self._facadeListener = new Listener(self._sceneListener);
}
export async function loadSingleThreadCore(self) {
    self.module = await loadCore(self.thread, self.coreBaseUrl);
    self._heap = new Heap(self.module);
    self._bindings = makeBindings(self.module);
    self.applyStartupOptions();
    requireOk(self._bindings.exaInit(), 'exaInit', self._bindings.exaGetLastError);
    self._output = self.ctx.createGain();
    self._output.gain.value = 1.0;
    seedSingleThreadSceneGraph(self);
    const gpu = self._autoGpu ? await self.enableGpu() : false;
    if (self._autoLoadMaterials) {
        await self.loadMaterialAssets().catch((e) => {
            const reason = e instanceof Error ? e.message : String(e);
            console.warn(`[soundtrace.js] material assets not loaded (${reason}); string material refs will fall back to defaultMaterialType`);
        });
    }
    if (self._debug) {
        console.log(`[soundtrace.js] ready (thread=${self.thread}, quality=${self.quality}${self._autoGpu ? `, gpu=${gpu}` : ''})`);
    }
}
export async function loadWorkerHostedControl(self) {
    // Guard the MT precondition up-front so a missing cross-origin isolation
    // surfaces as a clear, actionable error here — not as a low-level
    // "SharedArrayBuffer is required" deep inside the worker bootstrap.
    const support = workerHostedMtSupport();
    if (!support.supported) {
        throw new SoundTraceMtUnsupportedError(`[soundtrace.js] thread=mt requires ${support.missing.join(', ')} — enable cross-origin isolation (COOP: same-origin, COEP: require-corp), or use thread:'auto' / mode:'single_thread'`);
    }
    if (self._autoGpu) {
        throw self.createMtUnsupportedError("mode:gpu auto-enable (GPU propagation is ST-only today — omit `thread` or pass thread:'st' with mode:'gpu')");
    }
    // Prepare the material table + name maps before building startup options so
    // the worker registers the same indices the facade resolves names against.
    // Graceful like ST: on failure, string refs fall back to defaultMaterialType
    // and the worker keeps its empty default table. (TASK-0022 A)
    if (self._autoLoadMaterials) {
        await self.prepareWorkerMaterials().catch((e) => {
            const reason = e instanceof Error ? e.message : String(e);
            console.warn(`[soundtrace.js] material assets not loaded (${reason}); string material refs will fall back to defaultMaterialType`);
        });
    }
    self._workerHostedControl = await loadMtWorkerHostedControl({
        audioContext: self.ctx,
        coreBaseUrl: self.coreBaseUrl,
        pthreadPoolSize: self.resolveWorkerPthreadPoolSize(),
        startup: self.buildWorkerStartupOptions(),
    });
    self._mtFacadeState = new SoundTraceMtFacadeState({
        client: self._workerHostedControl.client,
        coordinateTransform: self.coordinateTransform,
        host: self,
        hotTransforms: self._workerHostedControl.hotTransforms,
        quality: self.quality,
        sampleRate: self.ctx.sampleRate,
    });
    self._output = self.ctx.createGain();
    self._output.gain.value = 1.0;
    if (self._debug) {
        console.log(`[soundtrace.js] ready (thread=mt, quality=${self.quality}, workerHostedControl=true)`);
    }
}
export async function enableGpu(self) {
    self.assertLocalControlAvailable('enableGpu');
    // Memoize the in-flight/settled result. On a GPU core build,
    // exaPropagatorInitGpu (v0.7 rename of the GPU-enable entry point) suspends
    // via Asyncify while the WebGPU device is acquired, and Asyncify has a
    // SINGLE global suspend slot — two concurrent in-flight calls would corrupt
    // it (lost/wrong result, hang, or abort). The ??= serializes that and makes
    // repeat calls idempotent, matching the core's "create + register the
    // provider once" semantics (same idiom as load() / _ensureWorkletReady). A
    // synchronous throw from bindings() (not loaded) is NOT memoized — the ??=
    // right side never assigns — so callers can retry after load(). Verified in
    // a browser: TASK-0005 S4 (asyncifyReturnedPromise). The binding maps the
    // ExaResult to a boolean (EXA_OK -> true; EXA_ERR_UNSUPPORTED -> false with
    // automatic CPU fallback).
    self._gpuEnablePromise ??= self.bindings().exaPropagatorInitGpu().then((enabled) => {
        self._gpuEnabled = enabled;
        if (enabled && self._sceneListener) {
            self.applyQualityPreset(self._sceneListener);
        }
        return enabled;
    });
    return self._gpuEnablePromise;
}
/** ST/MT shared semantics for options.defaultMeshBuild (finding #16): fill
 *  the per-field defaults and reject BvhType.Default in ONE place. ST applies
 *  the result directly (applyStartupOptions); MT ships it to the worker,
 *  whose all-or-nothing transport reader (readStartupMeshBuildOption) would
 *  silently drop a partial option. */
export function resolveDefaultMeshBuildOption(opt) {
    if (opt === undefined)
        return undefined;
    if (opt.bvhType === BVHType.Default) {
        throw new Error('[soundtrace.js] defaultMeshBuild.bvhType must be a concrete BvhType, not BvhType.Default');
    }
    return {
        bvhType: opt.bvhType ?? 0,
        bvhMaxDepth: opt.bvhMaxDepth ?? 16,
        primPerLeaf: opt.primPerLeaf ?? 4,
    };
}
export function buildWorkerStartupOptions(self) {
    return {
        quality: self.quality,
        sceneRatio: self.sceneRatio,
        mesh: resolveDefaultMeshBuildOption(self.defaultMeshBuild),
        // Ship the material table so the worker registers the same indices the
        // facade resolves names against (TASK-0022 A). Omitted when not prepared.
        ...(self._workerMaterials && self._workerMaterials.length > 0
            ? { materials: self._workerMaterials }
            : {}),
    };
}
export function resolveWorkerPthreadPoolSize(self) {
    const explicit = self.propagationThreadCount;
    if (explicit === undefined || explicit < 1) {
        return webPthreadPoolSize();
    }
    return explicit;
}
export function getMtFacadeState(self) {
    if (self._mtFacadeState) {
        return self._mtFacadeState;
    }
    if (!self._workerHostedControl) {
        return null;
    }
    self._mtFacadeState = new SoundTraceMtFacadeState({
        client: self._workerHostedControl.client,
        coordinateTransform: self.coordinateTransform,
        host: self,
        hotTransforms: self._workerHostedControl.hotTransforms,
        quality: self.quality,
        sampleRate: self.ctx.sampleRate,
    });
    return self._mtFacadeState;
}
export function applyStartupOptions(self) {
    const b = self.bindings();
    const h = self.heap();
    if (self.propagationThreadCount !== undefined) {
        const propagationThreadCount = self.propagationThreadCount;
        if (!Number.isInteger(propagationThreadCount) ||
            propagationThreadCount < -1) {
            throw new Error('[soundtrace.js] propagationThreadCount must be an integer >= -1');
        }
        h.withScope(s => {
            const p = s.block(RUNTIME_OPTION_SIZE);
            writeRuntimeOption(h, p, { propagationThreadCount });
            if (isError(b.exaSetRuntimeOption(p))) {
                throw new Error(`[soundtrace.js] failed to set runtime option: ${b.exaGetLastError()}`);
            }
        });
    }
    const meshBuild = resolveDefaultMeshBuildOption(self.defaultMeshBuild);
    if (meshBuild !== undefined) {
        h.withScope(s => {
            const p = s.block(MESH_BUILD_OPTION_SIZE);
            writeMeshBuildOption(h, p, meshBuild);
            if (isError(b.exaMeshSetDefaultBuildOption(p))) {
                throw new Error(`[soundtrace.js] failed to set default mesh build option: ${b.exaGetLastError()}`);
            }
        });
    }
}
export function applyQualityPreset(self, listener, preset = qualityPreset(self.quality)) {
    const scaledPreset = self.sceneRatio !== undefined
        ? { ...preset, sceneRatio: self.sceneRatio }
        : preset;
    const appliedPreset = self._gpuEnabled
        ? { ...scaledPreset, maxDepth: GPU_PROPAGATION_MAX_DEPTH }
        : scaledPreset;
    listener.setRayCount(appliedPreset.listenerWidth, appliedPreset.listenerHeight);
    listener.setRayDepth(appliedPreset.maxDepth);
    listener.setOption(appliedPreset);
    applyQualityRenderOptions(listener, self.quality);
}
export function getRuntimeOption(self) {
    const b = self.bindings();
    const h = self.heap();
    return h.withScope(s => {
        const p = s.block(RUNTIME_OPTION_SIZE);
        if (isError(b.exaGetRuntimeOption(p))) {
            throw new Error(`[soundtrace.js] failed to get runtime option: ${b.exaGetLastError()}`);
        }
        return readRuntimeOption(h, p);
    });
}
export function getDefaultMeshBuildOption(self) {
    const b = self.bindings();
    const h = self.heap();
    return h.withScope(s => {
        const p = s.block(MESH_BUILD_OPTION_SIZE);
        if (isError(b.exaMeshGetDefaultBuildOption(p))) {
            throw new Error(`[soundtrace.js] failed to get default mesh build option: ${b.exaGetLastError()}`);
        }
        return readMeshBuildOption(h, p);
    });
}
//# sourceMappingURL=SoundTrace-lifecycle.js.map