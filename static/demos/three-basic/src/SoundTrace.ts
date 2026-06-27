import { Diagnostics } from './Diagnostics.js';
import { MaterialTable } from './MaterialTable.js';
import { Propagator } from './Propagator.js';
import { SoundListener } from './SoundListener.js';
import { SoundMesh, type MeshBuildOptions } from './SoundMesh.js';
import { SoundObject } from './SoundObject.js';
import { SoundScene } from './SoundScene.js';
import { SoundSource } from './SoundSource.js';
import { SoundCollider, type SoundColliderBuildOptions } from './SoundCollider.js';
import { Mesh, Listener, Source, resolveCoordinateTransform, resolveMode, resolveThroughput, type CoordinateTransform, type ObjectUpdateType, type QualityTier, type SourcePathOptions, type Vec3In } from './facade.js';
import type { Bindings, Heap, MeshBuildOption, RuntimeOption, STOption, Triangle } from './native/index.js';
import type { DebugSnapshot, DebugSnapshotOptions, StartupOptions } from './control-protocol.js';
import type { WorkerHostedControlState } from './soundtrace-mt-worker-load.js';
import type { ExaSoundModule, SoundTraceOptions, ThreadMode } from './types.js';
import type { Disposable } from './Disposable.js';
import type { MaterialRef } from './material-resolver.js';
import { SoundTraceMtFacadeState } from './soundtrace-mt-facade-state.js';
import { createDisposedError } from './soundtrace-mt-facade-errors.js';
import { SoundTraceMtUnsupportedError, type HrtfLoadMode, type HrtfSource, type StatisticsSnapshot, type StatisticsSnapshotOptions } from './SoundTrace-types.js';
import { addMesh as addMeshImpl, addSource as addSourceImpl, debugSnapshot as debugSnapshotImpl, facadeScene as facadeSceneImpl, getSourceStatisticsSnapshot as getSourceStatisticsSnapshotImpl, getStatistics as getStatisticsImpl, removeMesh as removeMeshImpl, reset as resetImpl, setAudioOption as setAudioOptionImpl, setQuality as setQualityImpl, update as updateImpl } from './SoundTrace-facade-methods.js';
import { applyQualityPreset as applyQualityPresetImpl, applyStartupOptions as applyStartupOptionsImpl, buildWorkerStartupOptions as buildWorkerStartupOptionsImpl, enableGpu as enableGpuImpl, getDefaultMeshBuildOption as getDefaultMeshBuildOptionImpl, getMtFacadeState, getRuntimeOption as getRuntimeOptionImpl, loadSingleThreadCore as loadSingleThreadCoreImpl, loadSoundTrace, loadWorkerHostedControl as loadWorkerHostedControlImpl, resolveWorkerPthreadPoolSize as resolveWorkerPthreadPoolSizeImpl } from './SoundTrace-lifecycle.js';
import { fetchHrtfBytes as fetchHrtfBytesImpl, hrtfUrl as hrtfUrlImpl, loadHrtf as loadHrtfImpl, loadMaterialAssets as loadMaterialAssetsImpl, readHrtfSource as readHrtfSourceImpl } from './SoundTrace-assets.js';
import { audioWorkletNodeFromHandle as audioWorkletNodeFromHandleImpl, bootstrapWorklet as bootstrapWorkletImpl, createMixerWorkletNode as createMixerWorkletNodeImpl, createMtAudioWorkletNode as createMtAudioWorkletNodeImpl, createWorkletNode as createWorkletNodeImpl, ensureMtAudioWorkletReady as ensureMtAudioWorkletReadyImpl, ensureWorkletReady as ensureWorkletReadyImpl, loadMtAudioWorkletModule as loadMtAudioWorkletModuleImpl, playSource as playSourceImpl, pumpMtControlLoop as pumpMtControlLoopImpl, requireModule as requireModuleImpl } from './SoundTrace-audio.js';
import { disposeSoundTrace } from './SoundTrace-dispose.js';

export { SoundTraceMtUnsupportedError } from './SoundTrace-types.js';
export type { HrtfLoadMode, HrtfSource, StatisticsPathSnapshot, StatisticsSnapshot, StatisticsSnapshotOptions, StatisticsSourceSnapshot } from './SoundTrace-types.js';

export class SoundTrace implements Disposable {
  readonly ctx: AudioContext;
  readonly thread: ThreadMode;
  readonly coreBaseUrl: string;
  readonly assetBaseUrl: string;
  readonly propagationThreadCount: number | undefined;
  readonly defaultMeshBuild: MeshBuildOptions | undefined;
  readonly coordinateTransform: CoordinateTransform;
  module: ExaSoundModule | null = null;
  _bindings: Bindings | null = null;
  _heap: Heap | null = null;
  _output: GainNode | null = null;
  _workerHostedControl: WorkerHostedControlState | null = null;
  _mtFacadeState: SoundTraceMtFacadeState | null = null;
  _loadPromise: Promise<void> | null = null;
  _disposed = false;
  _materials: MaterialTable | null = null;
  _propagator: Propagator | null = null;
  _diagnostics: Diagnostics | null = null;
  readonly _autoGpu: boolean;
  readonly _autoLoadMaterials: boolean;
  _scene: SoundScene | null = null;
  _sceneListener: SoundListener | null = null;
  _facadeListener: Listener | null = null;
  _aliasReverseIndex = new Map<string, string>();
  _nameToIndex = new Map<string, number>();
  _defaultMaterialType = 0;
  _ctxHandle = 0;
  _workletInitPromise: Promise<void> | null = null;
  _mtAudioWorkletInitPromise: Promise<void> | null = null;
  _gpuEnablePromise: Promise<boolean> | null = null;
  _nextMtAudioSessionId = 1;
  quality: QualityTier;

  constructor(audioContext: AudioContext, options: SoundTraceOptions = {}) {
    this.ctx = audioContext;
    const resolved = resolveMode(options.mode, options.thread);
    this.thread = resolved.thread;
    this._autoGpu = resolved.gpu;
    this.quality = options.quality ?? 'middle';
    this.coreBaseUrl = options.coreBaseUrl ?? new URL('./core', import.meta.url).href;
    const assetBaseUrl = options.assetBaseUrl ?? new URL('./assets', import.meta.url).href;
    this.assetBaseUrl = assetBaseUrl.endsWith('/') ? assetBaseUrl : `${assetBaseUrl}/`;
    this.propagationThreadCount = options.propagationThreadCount ?? (options.throughput !== undefined ? resolveThroughput(options.throughput) : undefined);
    this.defaultMeshBuild = options.defaultMeshBuild;
    this.coordinateTransform = resolveCoordinateTransform(options.coordinateBasis);
    this._autoLoadMaterials = options.autoLoadMaterials ?? true;
  }

  static async create(audioContext: AudioContext, options: SoundTraceOptions = {}): Promise<SoundTrace> { const inst = new SoundTrace(audioContext, options); await inst.load(); return inst; }
  async load(): Promise<void> { return loadSoundTrace(this); }
  async loadSingleThreadCore(): Promise<void> { return loadSingleThreadCoreImpl(this); }
  async loadWorkerHostedControl(): Promise<void> { return loadWorkerHostedControlImpl(this); }
  async enableGpu(): Promise<boolean> { return enableGpuImpl(this); }
  get output(): AudioNode { if (!this._output) throw new Error('[soundtrace.js] not loaded — call load() first'); return this._output; }
  get audioContext(): AudioContext { return this.ctx; }
  get workerHostedControl(): boolean { return this._workerHostedControl?.ready.workerHostedControl === true; }
  bindings(): Bindings { this.assertLocalControlAvailable('native bindings'); if (!this._bindings) throw new Error('[soundtrace.js] not loaded — call load() first'); return this._bindings; }
  heap(): Heap { this.assertLocalControlAvailable('native heap'); if (!this._heap) throw new Error('[soundtrace.js] not loaded — call load() first'); return this._heap; }
  assertLocalControlAvailable(operation: string): void { if (this.workerHostedControl) throw this.createMtUnsupportedError(operation); }
  createMtUnsupportedError(operation: string): SoundTraceMtUnsupportedError { return new SoundTraceMtUnsupportedError(`[soundtrace.js] ${operation} is not available for thread=mt`); }
  buildWorkerStartupOptions(): StartupOptions { return buildWorkerStartupOptionsImpl(this); }
  resolveWorkerPthreadPoolSize(): number { return resolveWorkerPthreadPoolSizeImpl(this); }
  mtFacadeState(): SoundTraceMtFacadeState | null { return getMtFacadeState(this); }
  applyStartupOptions(): void { return applyStartupOptionsImpl(this); }
  applyQualityPreset(listener: SoundListener, preset?: STOption): void { return applyQualityPresetImpl(this, listener, preset); }
  getRuntimeOption(): RuntimeOption { return getRuntimeOptionImpl(this); }
  getDefaultMeshBuildOption(): MeshBuildOption { return getDefaultMeshBuildOptionImpl(this); }
  createScene(): SoundScene { return new SoundScene(this.bindings(), this.heap()); }
  createObject(): SoundObject { return new SoundObject(this.bindings(), this.heap()); }
  createMesh(): SoundMesh { return new SoundMesh(this.bindings(), this.heap()); }
  createCollider(opts: SoundColliderBuildOptions = {}): SoundCollider { return new SoundCollider(this.bindings(), this.heap(), opts); }
  createSource(): SoundSource { return new SoundSource(this.bindings(), this.heap()); }
  createListener(): SoundListener { return new SoundListener(this.bindings(), this.heap()); }
  async loadHrtf(mode: HrtfLoadMode, source?: HrtfSource): Promise<void> { return loadHrtfImpl(this, mode, source); }
  readHrtfSource(mode: HrtfLoadMode, source: HrtfSource | undefined): Promise<Uint8Array> { return readHrtfSourceImpl(this, mode, source); }
  hrtfUrl(mode: HrtfLoadMode, source: string | URL | undefined): string { return hrtfUrlImpl(this, mode, source); }
  fetchHrtfBytes(url: string): Promise<Uint8Array> { return fetchHrtfBytesImpl(this, url); }
  loadMaterialAssets(): Promise<void> { return loadMaterialAssetsImpl(this); }
  facadeScene(): SoundScene { return facadeSceneImpl(this); }
  get listener(): Listener { if (this._disposed) throw createDisposedError('listener facade access is not available after SoundTrace.dispose()'); const state = this.mtFacadeState(); if (state) return state.listener; if (!this._facadeListener) throw new Error('[soundtrace.js] not loaded — call load() first'); return this._facadeListener; }
  setQuality(quality: QualityTier): this { setQualityImpl(this, quality); return this; }
  setAudioOption(options: { readonly inputSampleCount?: number; readonly outputChannels?: number } = {}): this { setAudioOptionImpl(this, options); return this; }
  getStatistics(options: StatisticsSnapshotOptions = {}): StatisticsSnapshot { return getStatisticsImpl(this, options); }
  getSourceStatisticsSnapshot(source: Source, length: number) { return getSourceStatisticsSnapshotImpl(this, source, length); }
  addMesh(opts: { vertices: ArrayLike<number>; indices?: ArrayLike<number>; triangles?: Triangle[]; material?: MaterialRef; updateType?: ObjectUpdateType }): Mesh { return addMeshImpl(this, opts); }
  removeMesh(mesh: Mesh): this { removeMeshImpl(this, mesh); return this; }
  addSource(opts: { position: Vec3In; gain?: number; paths?: SourcePathOptions }): Source { return addSourceImpl(this, opts); }
  update(dt = 0): number | Promise<number> { return updateImpl(this, dt); }
  debugSnapshot(options: DebugSnapshotOptions = {}): Promise<DebugSnapshot> { return debugSnapshotImpl(this, options); }
  get materials(): MaterialTable { if (!this._materials) this._materials = new MaterialTable(this.bindings(), this.heap()); return this._materials; }
  get propagator(): Propagator { if (!this._propagator) this._propagator = new Propagator(this.bindings(), this.heap()); return this._propagator; }
  get diagnostics(): Diagnostics { if (!this._diagnostics) this._diagnostics = new Diagnostics(this.bindings(), this.heap()); return this._diagnostics; }
  reset(): void | Promise<void> { return resetImpl(this); }
  getPathTypeCount(): number { return this.bindings().exaGetPathTypeCount(); }
  getLastError(): string { return this.bindings().exaGetLastError(); }
  registerMeshPath(path: string, meshID: number): boolean { return this.bindings().exaRegisterMesh(path, meshID); }
  lookupMeshByPath(path: string): number { return this.bindings().exaGetSoundMesh(path); }
  _playSource(source: Source, channels: number): Promise<AudioWorkletNode> { return playSourceImpl(this, source, channels); }
  createWorkletNode(listener: SoundListener, source: SoundSource, channels = 2): Promise<AudioWorkletNode> { return createWorkletNodeImpl(this, listener, source, channels); }
  createMtAudioWorkletNode(sourceHandle: number, channels: number): Promise<AudioWorkletNode> { return createMtAudioWorkletNodeImpl(this, sourceHandle, channels); }
  pumpMtControlLoop(): void { return pumpMtControlLoopImpl(this); }
  createMixerWorkletNode(listener: SoundListener, sources: readonly SoundSource[], channels = 2): Promise<AudioWorkletNode> { return createMixerWorkletNodeImpl(this, listener, sources, channels); }
  audioWorkletNodeFromHandle(handle: number): AudioWorkletNode { return audioWorkletNodeFromHandleImpl(this, handle); }
  _ensureWorkletReady(): Promise<void> { return ensureWorkletReadyImpl(this); }
  _bootstrapWorklet(): Promise<void> { return bootstrapWorkletImpl(this); }
  requireModule(): ExaSoundModule { return requireModuleImpl(this); }
  ensureMtAudioWorkletReady(): Promise<void> { return ensureMtAudioWorkletReadyImpl(this); }
  loadMtAudioWorkletModule(): Promise<void> { return loadMtAudioWorkletModuleImpl(this); }
  get disposed(): boolean { return this._disposed; }
  dispose(): void { return disposeSoundTrace(this); }
  [Symbol.dispose](): void { this.dispose(); }
}
