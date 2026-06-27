import { loadCore } from './core-loader.js';
import { makeBindings, Heap, MESH_BUILD_OPTION_SIZE, RUNTIME_OPTION_SIZE, readMeshBuildOption, readRuntimeOption, writeMeshBuildOption, writeRuntimeOption, type MeshBuildOption, type RuntimeOption, type STOption } from './native/index.js';
import { SoundListener } from './SoundListener.js';
import { SoundScene } from './SoundScene.js';
import { BVHType } from './SoundMesh.js';
import { Listener, applyQualityRenderOptions, qualityPreset, webPthreadPoolSize } from './facade.js';
import { loadMtWorkerHostedControl } from './soundtrace-mt-worker-load.js';
import { SoundTraceMtFacadeState } from './soundtrace-mt-facade-state.js';
import type { StartupOptions } from './control-protocol.js';
import type { SoundTrace } from './SoundTrace.js';

export async function loadSoundTrace(self: SoundTrace): Promise<void> {
  if (self.module || self._workerHostedControl) return;
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
  } catch (error) {
    self._loadPromise = null;
    throw error;
  }
}

export async function loadSingleThreadCore(self: SoundTrace): Promise<void> {
  self.module = await loadCore(self.thread, self.coreBaseUrl);
  self._heap = new Heap(self.module);
  self._bindings = makeBindings(self.module);
  self.applyStartupOptions();
  self._bindings.exaInit();
  self._output = self.ctx.createGain();
  self._output.gain.value = 1.0;

  self._scene = new SoundScene(self._bindings, self._heap);
  self._sceneListener = new SoundListener(self._bindings, self._heap);
  self.applyQualityPreset(self._sceneListener);
  self._scene.setListener(self._sceneListener);
  self._facadeListener = new Listener(self._sceneListener, self.coordinateTransform);

  const gpu = self._autoGpu ? await self.enableGpu() : false;

  if (self._autoLoadMaterials) {
    await self.loadMaterialAssets().catch((e: unknown) => {
      const reason = e instanceof Error ? e.message : String(e);
      console.warn(`[soundtrace.js] material assets not loaded (${reason}); string material refs will fall back to defaultMaterialType`);
    });
  }

  console.log(`[soundtrace.js] ready (thread=${self.thread}, quality=${self.quality}${self._autoGpu ? `, gpu=${gpu}` : ''})`);
}

export async function loadWorkerHostedControl(self: SoundTrace): Promise<void> {
  if (self._autoGpu) {
    throw self.createMtUnsupportedError('mode:gpu auto-enable');
  }

  self._workerHostedControl = await loadMtWorkerHostedControl({
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
  console.log(`[soundtrace.js] ready (thread=mt, quality=${self.quality}, workerHostedControl=true)`);
}

export async function enableGpu(self: SoundTrace): Promise<boolean> {
  self.assertLocalControlAvailable('enableGpu');
  // Memoize the in-flight/settled result. On a GPU core build,
  // exaEnableGpuPropagation suspends via Asyncify while the WebGPU device is
  // acquired, and Asyncify has a SINGLE global suspend slot — two concurrent
  // in-flight calls would corrupt it (lost/wrong result, hang, or abort). The
  // ??= serializes that and makes repeat calls idempotent, matching the core's
  // "create + register the provider once" semantics (same idiom as load() /
  // _ensureWorkletReady). A synchronous throw from bindings() (not loaded) is
  // NOT memoized — the ??= right side never assigns — so callers can retry
  // after load(). Verified in a browser: TASK-0005 S4 (asyncifyReturnedPromise).
  return (self._gpuEnablePromise ??= self.bindings().exaEnableGpuPropagation());
}

export function buildWorkerStartupOptions(self: SoundTrace): StartupOptions {
  return {
    quality: self.quality,
    mesh: self.defaultMeshBuild,
  };
}

export function resolveWorkerPthreadPoolSize(self: SoundTrace): number {
  const explicit = self.propagationThreadCount;
  if (explicit === undefined || explicit < 1) {
    return webPthreadPoolSize();
  }
  return explicit;
}

export function getMtFacadeState(self: SoundTrace): SoundTraceMtFacadeState | null {
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

export function applyStartupOptions(self: SoundTrace): void {
  const b = self.bindings();
  const h = self.heap();

  if (self.propagationThreadCount !== undefined) {
    const propagationThreadCount = self.propagationThreadCount;
    if (
      !Number.isInteger(propagationThreadCount) ||
      propagationThreadCount < -1
    ) {
      throw new Error('[soundtrace.js] propagationThreadCount must be an integer >= -1');
    }
    h.withScope(s => {
      const p = s.block(RUNTIME_OPTION_SIZE);
      writeRuntimeOption(h, p, { propagationThreadCount });
      if (!b.exaSetRuntimeOption(p)) {
        throw new Error(`[soundtrace.js] failed to set runtime option: ${b.exaGetLastError()}`);
      }
    });
  }

  if (self.defaultMeshBuild !== undefined) {
    const opt = self.defaultMeshBuild;
    if (opt.bvhType === BVHType.Default) {
      throw new Error('[soundtrace.js] defaultMeshBuild.bvhType must be a concrete BvhType, not BvhType.Default');
    }
    h.withScope(s => {
      const p = s.block(MESH_BUILD_OPTION_SIZE);
      writeMeshBuildOption(h, p, {
        bvhType: opt.bvhType ?? 0,
        bvhMaxDepth: opt.bvhMaxDepth ?? 16,
        primPerLeaf: opt.primPerLeaf ?? 4,
      });
      if (!b.exaSetDefaultMeshBuildOption(p)) {
        throw new Error(`[soundtrace.js] failed to set default mesh build option: ${b.exaGetLastError()}`);
      }
    });
  }
}

export function applyQualityPreset(self: SoundTrace, listener: SoundListener, preset: STOption = qualityPreset(self.quality)): void {
  listener.setRayCount(preset.listenerWidth, preset.listenerHeight);
  listener.setRayDepth(preset.maxDepth);
  listener.setOption(preset);
  applyQualityRenderOptions(listener, self.quality);
}

export function getRuntimeOption(self: SoundTrace): RuntimeOption {
  const b = self.bindings();
  const h = self.heap();
  return h.withScope(s => {
    const p = s.block(RUNTIME_OPTION_SIZE);
    if (!b.exaGetRuntimeOption(p)) {
      throw new Error(`[soundtrace.js] failed to get runtime option: ${b.exaGetLastError()}`);
    }
    return readRuntimeOption(h, p);
  });
}

export function getDefaultMeshBuildOption(self: SoundTrace): MeshBuildOption {
  const b = self.bindings();
  const h = self.heap();
  return h.withScope(s => {
    const p = s.block(MESH_BUILD_OPTION_SIZE);
    if (!b.exaGetDefaultMeshBuildOption(p)) {
      throw new Error(`[soundtrace.js] failed to get default mesh build option: ${b.exaGetLastError()}`);
    }
    return readMeshBuildOption(h, p);
  });
}
