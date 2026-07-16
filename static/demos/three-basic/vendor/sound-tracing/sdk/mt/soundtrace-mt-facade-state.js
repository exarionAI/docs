import { Listener, Mesh, Source, indicesToTriangles, isIdentityBasis, objectUpdateTypeValue, qualityPreset, toVec3 } from '../facade/facade.js';
import { HrtfMode } from '../engine/SoundListener.js';
import { createBadHandleError, createDisposedError } from './soundtrace-mt-facade-errors.js';
import { createMtListenerNative, createMtSourceNative } from './soundtrace-mt-facade-natives.js';
import { createMtMeshPair } from './soundtrace-mt-facade-mesh.js';
import { cloneTupleVec3, defaultAudioOption, defaultPathOptions, resolveListenerRenderCache } from './soundtrace-mt-facade-defaults.js';
import { SoundTraceMtHotTransformBridge } from './soundtrace-mt-hot-transforms.js';
export class SoundTraceMtFacadeState {
    host;
    client;
    coordinateTransform;
    hotTransformBridge;
    activeSourceHandles = new Set();
    /** Live (created, not yet disposed) source count — the MT side of the
     *  EXA_MAX_SOUNDSOURCE ceiling guard in addSource (S1). */
    get liveSourceCount() { return this.activeSourceHandles.size; }
    activeMeshHandles = new Set();
    pendingCommands = new Set();
    nextSourceHandle = 1;
    nextMeshHandle = 1;
    pendingError = null;
    disposed = false;
    listenerCache;
    listener;
    constructor(options) {
        this.client = options.client;
        this.coordinateTransform = options.coordinateTransform;
        this.hotTransformBridge = new SoundTraceMtHotTransformBridge(options.hotTransforms);
        this.host = options.host;
        const preset = qualityPreset(options.quality);
        this.listenerCache = {
            position: { x: 0, y: 0, z: 0 },
            orientation: [0, 0, 0, 1],
            audioOption: defaultAudioOption(options.sampleRate),
            hrtfMode: HrtfMode.Parametric,
            ambisonicHybrid: false,
            outputMode: 0, // EXA_OUTPUT_MODE_HRTF — engine default
            renderOptions: resolveListenerRenderCache(options.quality),
            rayCount: [preset.listenerWidth, preset.listenerHeight],
            rayDepth: preset.maxDepth,
        };
        this.listener = new Listener(createMtListenerNative({ cache: this.listenerCache, scheduler: this }));
        // Delegate the host->core coordinate frame to the core (HRTF-stage basis)
        // instead of pre-transforming geometry. Identity is left unset so the render
        // stays bit-identical to the no-basis path. (TASK-0014)
        if (!isIdentityBasis(this.coordinateTransform)) {
            const t = this.coordinateTransform;
            this.queueCommand({
                op: 'setListenerOption',
                patch: { coordinateBasis: { right: [...t.right], up: [...t.up], forward: [...t.forward] } },
            });
        }
    }
    assertHostLive(operation) {
        if (this.disposed) {
            throw createDisposedError(`${operation} is not available after SoundTrace.dispose()`);
        }
    }
    assertSourceHandle(handle) {
        if (!this.activeSourceHandles.has(handle)) {
            throw createBadHandleError(`source handle ${handle} is no longer valid`);
        }
    }
    assertMeshHandle(handle) {
        if (!this.activeMeshHandles.has(handle)) {
            throw createBadHandleError(`mesh handle ${handle} is no longer valid`);
        }
    }
    deleteSourceHandle(handle) {
        this.activeSourceHandles.delete(handle);
        this.hotTransformBridge.releaseSourceHandle(handle);
    }
    deleteMeshHandle(handle) {
        this.activeMeshHandles.delete(handle);
        this.hotTransformBridge.releaseMeshHandle(handle);
    }
    /** True until SoundTrace.dispose(). Entity dispose consults this instead of
     *  assertHostLive: disposing an entity AFTER its world was torn down is a
     *  no-op by the M8 contract (finding #20 — ST already no-ops; MT threw
     *  DISPOSED out of teardown code, the one place that must never throw). */
    isHostLive() {
        return !this.disposed;
    }
    /** True while the worker still knows this handle. reset() clears every
     *  handle map on both sides — a delete queued for a forgotten handle comes
     *  back BAD_HANDLE and latches pendingError into the NEXT update()
     *  (finding #19), so entity dispose must consult this first. */
    isSourceHandleLive(handle) {
        return this.activeSourceHandles.has(handle);
    }
    isMeshHandleLive(handle) {
        return this.activeMeshHandles.has(handle);
    }
    queueCommand(command) {
        this.assertHostLive(`command ${command.op}`);
        const pending = this.client.command(command).then(() => undefined).catch((error) => {
            if (this.pendingError === null) {
                this.pendingError = error;
            }
        });
        this.pendingCommands.add(pending);
        void pending.finally(() => {
            this.pendingCommands.delete(pending);
        });
    }
    stageListenerTransform(cache) {
        this.assertHostLive('listener transform');
        this.hotTransformBridge.stageListenerTransform(cache);
    }
    stageMeshTransform(handle, cache) {
        this.assertHostLive('mesh transform');
        this.assertMeshHandle(handle);
        this.hotTransformBridge.stageMeshTransform(handle, cache);
    }
    stageSourceTransform(handle, cache) {
        this.assertHostLive('source transform');
        this.assertSourceHandle(handle);
        this.hotTransformBridge.stageSourceTransform(handle, cache);
    }
    addSource(options) {
        this.assertHostLive('addSource');
        const handle = this.nextSourceHandle++;
        this.activeSourceHandles.add(handle);
        const position = toVec3(options.position);
        const cache = {
            position: cloneTupleVec3(position),
            direction: { x: 0, y: 0, z: 1 },
            intensity: options.gain ?? 1,
            paths: defaultPathOptions(options.paths),
            velocity: { x: 0, y: 0, z: 0 },
        };
        this.queueCommand({
            op: 'createSource',
            handle,
            initial: {
                position,
                direction: [0, 0, 1],
                velocity: [0, 0, 0],
                intensity: cache.intensity,
                rayCount: [16, 16],
                depth: 6,
                distanceAttenuation: {
                    direct: [1, 0, 1],
                    reflection: [1, 0, 1],
                    diffraction: [1, 0, 1],
                    reverberation: [1, 0, 1],
                },
                paths: {
                    direct: cache.paths.direct,
                    reflection: cache.paths.reflection,
                    reverberation: cache.paths.reverberation,
                    diffraction: cache.paths.diffraction,
                },
            },
        });
        return new Source(createMtSourceNative({ handle, cache, scheduler: this }), this.host);
    }
    addMesh(options) {
        this.assertHostLive('addMesh');
        const handle = this.nextMeshHandle++;
        this.activeMeshHandles.add(handle);
        const objectCache = {
            position: { x: 0, y: 0, z: 0 },
            orientation: [0, 0, 0, 1],
            scale: { x: 1, y: 1, z: 1 },
            updateType: options.updateType === undefined ? 0 : objectUpdateTypeValue(options.updateType),
        };
        const triangles = options.triangles ?? indicesToTriangles(options.indices ?? [], options.material);
        this.queueCommand({
            op: 'createMesh',
            handle,
            initial: {
                vertices: Float32Array.from(options.vertices),
                triangles,
                material: options.material,
                bvhType: 2,
                updateType: objectCache.updateType,
            },
        });
        const { meshNative, objectNative } = createMtMeshPair({ handle, objectCache, scheduler: this });
        return new Mesh(meshNative, objectNative, options.resolveMaterial);
    }
    applyQuality(quality) {
        this.assertHostLive('setQuality');
        const preset = qualityPreset(quality);
        const renderOptions = resolveListenerRenderCache(quality);
        this.listenerCache.rayCount = [preset.listenerWidth, preset.listenerHeight];
        this.listenerCache.rayDepth = preset.maxDepth;
        this.listenerCache.renderOptions = renderOptions;
        this.queueCommand({
            op: 'setListenerOption',
            patch: {
                rayCount: this.listenerCache.rayCount,
                rayDepth: this.listenerCache.rayDepth,
                ...renderOptions,
            },
        });
    }
    applyAudioOption(option) {
        this.listener.native.setAudioOption(option);
    }
    async loadListenerHrtf(mode, bytes) {
        this.assertHostLive('loadHrtf');
        const transferBytes = Uint8Array.from(bytes);
        await this.flushPending();
        await this.client.command({
            op: 'loadListenerHrtf',
            mode,
            bytes: transferBytes,
        });
        this.listenerCache.hrtfMode = hrtfModeValue(mode);
    }
    async update(dt) {
        this.assertHostLive('update');
        await this.flushPending();
        const result = await this.client.frame(dt);
        return result.updateReturn;
    }
    async debugSnapshot(options) {
        this.assertHostLive('debugSnapshot');
        await this.flushPending();
        return this.client.debugSnapshot(options);
    }
    /** Everything the fresh worker-side listener cannot reconstruct from
     *  StartupOptions after reset(): the live option cache plus the coordinate
     *  basis. reset() re-pushes THIS — never a hand-maintained copy. The old
     *  inline list drifted from the cache and silently lost coordinateBasis
     *  (finding #3: mirrored HRTF for the rest of the session) and
     *  ambisonicHybrid (finding #22). hrtfMode is deliberately absent: the
     *  loaded HRTF tables died with the listener, so the cache reverts to the
     *  core default instead of pretending the mode still has data. */
    listenerReseedPatch() {
        const patch = {
            audioOption: this.listenerCache.audioOption,
            rayCount: this.listenerCache.rayCount,
            rayDepth: this.listenerCache.rayDepth,
            ambisonicHybrid: this.listenerCache.ambisonicHybrid,
            outputMode: this.listenerCache.outputMode,
            ...this.listenerCache.renderOptions,
        };
        if (!isIdentityBasis(this.coordinateTransform)) {
            const t = this.coordinateTransform;
            patch.coordinateBasis = { right: [...t.right], up: [...t.up], forward: [...t.forward] };
        }
        return patch;
    }
    async reset() {
        this.assertHostLive('reset');
        await this.flushPending();
        await this.client.command({ op: 'reset' });
        this.activeSourceHandles.clear();
        this.activeMeshHandles.clear();
        this.hotTransformBridge.reset();
        this.listenerCache.hrtfMode = HrtfMode.Parametric;
        this.queueCommand({
            op: 'setListenerOption',
            patch: this.listenerReseedPatch(),
        });
        this.hotTransformBridge.stageListenerTransform(this.listenerCache);
        await this.flushPending();
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.activeSourceHandles.clear();
        this.activeMeshHandles.clear();
    }
    async flushPending() {
        await Promise.all(this.pendingCommands);
        if (this.pendingError !== null) {
            const error = this.pendingError;
            this.pendingError = null;
            throw error;
        }
    }
}
function hrtfModeValue(mode) {
    switch (mode) {
        case 'parametric':
            return HrtfMode.Parametric;
        case 'convolution': // legacy wire alias of the v0.7 HRIR (nearest) mode
            return HrtfMode.Hrir;
        case 'steamaudio': // legacy wire alias of the v0.7 HRIR_INTERPOLATED mode
            return HrtfMode.HrirInterpolated;
    }
}
//# sourceMappingURL=soundtrace-mt-facade-state.js.map