import { Diagnostics } from '../engine/Diagnostics.js';
import { MaterialTable } from '../engine/MaterialTable.js';
import { Propagator } from '../engine/Propagator.js';
import { SoundListener } from '../engine/SoundListener.js';
import { SoundMesh } from '../engine/SoundMesh.js';
import { SoundObject } from '../engine/SoundObject.js';
import { SoundScene } from '../engine/SoundScene.js';
import { SoundSource } from '../engine/SoundSource.js';
import { SoundCollider } from '../engine/SoundCollider.js';
import { resolveCoordinateTransform, resolveMode, resolveThroughput } from './facade.js';
import { createDisposedError } from '../mt/soundtrace-mt-facade-errors.js';
import { SoundTraceMtUnsupportedError } from './SoundTrace-types.js';
import { addMesh as addMeshImpl, addSource as addSourceImpl, debugSnapshot as debugSnapshotImpl, facadeScene as facadeSceneImpl, getGpuStats as getGpuStatsImpl, getIRs as getIRsImpl, getSourceStatisticsSnapshot as getSourceStatisticsSnapshotImpl, getStatistics as getStatisticsImpl, removeMesh as removeMeshImpl, renderMonoImpulseResponse as renderMonoImpulseResponseImpl, reset as resetImpl, setAudioOption as setAudioOptionImpl, setQuality as setQualityImpl, update as updateImpl } from './SoundTrace-facade-methods.js';
import { applyQualityPreset as applyQualityPresetImpl, applyStartupOptions as applyStartupOptionsImpl, buildWorkerStartupOptions as buildWorkerStartupOptionsImpl, enableGpu as enableGpuImpl, getDefaultMeshBuildOption as getDefaultMeshBuildOptionImpl, getMtFacadeState, getRuntimeOption as getRuntimeOptionImpl, loadSingleThreadCore as loadSingleThreadCoreImpl, loadSoundTrace, loadWorkerHostedControl as loadWorkerHostedControlImpl, resolveWorkerPthreadPoolSize as resolveWorkerPthreadPoolSizeImpl } from './SoundTrace-lifecycle.js';
import { fetchHrtfBytes as fetchHrtfBytesImpl, hrtfUrl as hrtfUrlImpl, loadHrtf as loadHrtfImpl, loadMaterialAssets as loadMaterialAssetsImpl, prepareWorkerMaterials as prepareWorkerMaterialsImpl, readHrtfSource as readHrtfSourceImpl } from './SoundTrace-assets.js';
import { audioWorkletNodeFromHandle as audioWorkletNodeFromHandleImpl, bootstrapWorklet as bootstrapWorkletImpl, createMixerWorkletNode as createMixerWorkletNodeImpl, createMtAudioWorkletNode as createMtAudioWorkletNodeImpl, createWorkletNode as createWorkletNodeImpl, ensureMtAudioWorkletReady as ensureMtAudioWorkletReadyImpl, ensureWorkletReady as ensureWorkletReadyImpl, loadMtAudioWorkletModule as loadMtAudioWorkletModuleImpl, playSource as playSourceImpl, pumpMtControlLoop as pumpMtControlLoopImpl, requireModule as requireModuleImpl } from './SoundTrace-audio.js';
import { disposeSoundTrace } from './SoundTrace-dispose.js';
export { SoundTraceMtUnsupportedError } from './SoundTrace-types.js';
export class SoundTrace {
    ctx;
    thread;
    coreBaseUrl;
    assetBaseUrl;
    propagationThreadCount;
    defaultMeshBuild;
    coordinateTransform;
    /** World-unit scale (meters per scene unit) -> ExaListenerOption.sceneRatio.
     *  undefined = unset (core default 1.0). See SoundTraceOptions.sceneRatio. */
    sceneRatio;
    module = null;
    _bindings = null;
    _heap = null;
    _output = null;
    _workerHostedControl = null;
    _mtFacadeState = null;
    _loadPromise = null;
    _disposed = false;
    /** One-shot latch for the EXA_MAX_SOUNDSOURCE ceiling warning (S1). */
    _sourceCapWarned = false;
    _materials = null;
    _propagator = null;
    _diagnostics = null;
    _autoGpu;
    _autoLoadMaterials;
    _debug;
    _scene = null;
    _sceneListener = null;
    _facadeListener = null;
    _aliasReverseIndex = new Map();
    _nameToIndex = new Map();
    /** Host-side mesh path->id registry (replaces the removed core registry, D-15). */
    _meshIdsByPath = new Map();
    _defaultMaterialType = 0;
    /** Worker material payload, prepared during MT load so the worker registers
     *  the same table the ST facade resolves names against. null = not prepared
     *  (no materials shipped to the worker). (TASK-0022) */
    _workerMaterials = null;
    _ctxHandle = 0;
    _workletInitPromise = null;
    _mtAudioWorkletInitPromise = null;
    _gpuEnablePromise = null;
    _gpuEnabled = false;
    _nextMtAudioSessionId = 1;
    quality;
    constructor(audioContext, options = {}) {
        this.ctx = audioContext;
        const resolved = resolveMode(options.mode, options.thread);
        this.thread = resolved.thread;
        this._autoGpu = resolved.gpu;
        this.quality = options.quality ?? 'balanced';
        this.coreBaseUrl = options.coreBaseUrl ?? new URL('../core', import.meta.url).href;
        const assetBaseUrl = options.assetBaseUrl ?? new URL('../assets', import.meta.url).href;
        this.assetBaseUrl = assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`;
        this.propagationThreadCount = options.propagationThreadCount ?? (options.throughput !== undefined ? resolveThroughput(options.throughput) : undefined);
        this.defaultMeshBuild = options.defaultMeshBuild;
        this.coordinateTransform = resolveCoordinateTransform(options.coordinateBasis);
        this.sceneRatio = options.sceneRatio;
        this._autoLoadMaterials = options.autoLoadMaterials ?? true;
        this._debug = options.debug ?? false;
    }
    static async create(audioContext, options = {}) { const inst = new SoundTrace(audioContext, options); await inst.load(); return inst; }
    async load() { return loadSoundTrace(this); }
    async loadSingleThreadCore() { return loadSingleThreadCoreImpl(this); }
    async loadWorkerHostedControl() { return loadWorkerHostedControlImpl(this); }
    async enableGpu() { return enableGpuImpl(this); }
    get output() { if (!this._output)
        throw new Error('[soundtrace.js] not loaded — call load() first'); return this._output; }
    get audioContext() { return this.ctx; }
    get workerHostedControl() { return this._workerHostedControl?.ready.workerHostedControl === true; }
    bindings() { this.assertLocalControlAvailable('native bindings'); if (!this._bindings)
        throw new Error('[soundtrace.js] not loaded — call load() first'); return this._bindings; }
    heap() { this.assertLocalControlAvailable('native heap'); if (!this._heap)
        throw new Error('[soundtrace.js] not loaded — call load() first'); return this._heap; }
    assertLocalControlAvailable(operation) { if (this.workerHostedControl)
        throw this.createMtUnsupportedError(operation); }
    createMtUnsupportedError(operation) { return new SoundTraceMtUnsupportedError(`[soundtrace.js] ${operation} is not available for thread=mt`); }
    buildWorkerStartupOptions() { return buildWorkerStartupOptionsImpl(this); }
    resolveWorkerPthreadPoolSize() { return resolveWorkerPthreadPoolSizeImpl(this); }
    mtFacadeState() { return getMtFacadeState(this); }
    applyStartupOptions() { return applyStartupOptionsImpl(this); }
    applyQualityPreset(listener, preset) { return applyQualityPresetImpl(this, listener, preset); }
    getRuntimeOption() { return getRuntimeOptionImpl(this); }
    getDefaultMeshBuildOption() { return getDefaultMeshBuildOptionImpl(this); }
    createScene() { return new SoundScene(this.bindings(), this.heap()); }
    createObject() { return new SoundObject(this.bindings(), this.heap()); }
    createMesh() { return new SoundMesh(this.bindings(), this.heap()); }
    createCollider(opts = {}) { return new SoundCollider(this.bindings(), this.heap(), opts); }
    createSource() { return new SoundSource(this.bindings(), this.heap()); }
    createListener() { return new SoundListener(this.bindings(), this.heap()); }
    async loadHrtf(mode, source) { return loadHrtfImpl(this, mode, source); }
    readHrtfSource(mode, source) { return readHrtfSourceImpl(this, mode, source); }
    hrtfUrl(mode, source) { return hrtfUrlImpl(this, mode, source); }
    fetchHrtfBytes(url) { return fetchHrtfBytesImpl(this, url); }
    loadMaterialAssets() { return loadMaterialAssetsImpl(this); }
    prepareWorkerMaterials() { return prepareWorkerMaterialsImpl(this); }
    facadeScene() { return facadeSceneImpl(this); }
    get listener() { if (this._disposed)
        throw createDisposedError('listener facade access is not available after SoundTrace.dispose()'); const state = this.mtFacadeState(); if (state)
        return state.listener; if (!this._facadeListener)
        throw new Error('[soundtrace.js] not loaded — call load() first'); return this._facadeListener; }
    setQuality(quality) { setQualityImpl(this, quality); return this; }
    setAudioOption(options = {}) { setAudioOptionImpl(this, options); return this; }
    getStatistics(options = {}) { return getStatisticsImpl(this, options); }
    getGpuStats() { return getGpuStatsImpl(this); }
    getIRs() { return getIRsImpl(this); }
    renderMonoImpulseResponse(source, seconds) { return renderMonoImpulseResponseImpl(this, source, seconds); }
    getSourceStatisticsSnapshot(source) { return getSourceStatisticsSnapshotImpl(this, source); }
    addMesh(opts) { return addMeshImpl(this, opts); }
    removeMesh(mesh) { removeMeshImpl(this, mesh); return this; }
    addSource(opts) { return addSourceImpl(this, opts); }
    update(dt = 0) { return updateImpl(this, dt); }
    debugSnapshot(options = {}) { return debugSnapshotImpl(this, options); }
    get materials() { if (!this._materials)
        this._materials = new MaterialTable(this.bindings(), this.heap()); return this._materials; }
    get propagator() { if (!this._propagator)
        this._propagator = new Propagator(this.bindings(), this.heap()); return this._propagator; }
    get diagnostics() { if (!this._diagnostics)
        this._diagnostics = new Diagnostics(this.bindings(), this.heap()); return this._diagnostics; }
    reset() { return resetImpl(this); }
    getPathTypeCount() { return this.bindings().exaGetPathTypeCount(); }
    getLastError() { return this.bindings().exaGetLastError(); }
    // v0.7 removed the core mesh path registry (exaRegisterMesh/exaGetSoundMesh
    // — a path->id cache is host business, audit D-15); the facade keeps an
    // equivalent host-side map.
    registerMeshPath(path, meshID) { this._meshIdsByPath.set(path, meshID); return true; }
    lookupMeshByPath(path) { return this._meshIdsByPath.get(path) ?? -1; }
    _playSource(source, channels) { return playSourceImpl(this, source, channels); }
    createWorkletNode(listener, source, channels = 2) { return createWorkletNodeImpl(this, listener, source, channels); }
    createMtAudioWorkletNode(sourceHandle, channels) { return createMtAudioWorkletNodeImpl(this, sourceHandle, channels); }
    pumpMtControlLoop() { return pumpMtControlLoopImpl(this); }
    createMixerWorkletNode(listener, sources, channels = 2) { return createMixerWorkletNodeImpl(this, listener, sources, channels); }
    audioWorkletNodeFromHandle(handle) { return audioWorkletNodeFromHandleImpl(this, handle); }
    _ensureWorkletReady() { return ensureWorkletReadyImpl(this); }
    _bootstrapWorklet() { return bootstrapWorkletImpl(this); }
    requireModule() { return requireModuleImpl(this); }
    ensureMtAudioWorkletReady() { return ensureMtAudioWorkletReadyImpl(this); }
    loadMtAudioWorkletModule() { return loadMtAudioWorkletModuleImpl(this); }
    get disposed() { return this._disposed; }
    dispose() { return disposeSoundTrace(this); }
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundTrace.js.map