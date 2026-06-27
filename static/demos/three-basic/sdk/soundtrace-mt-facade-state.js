import { Listener, Mesh, Source, indicesToTriangles, objectUpdateTypeValue, qualityPreset, transformVec3, transformVertices } from './facade.js';
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
            renderOptions: resolveListenerRenderCache(options.quality),
            rayCount: [preset.listenerWidth, preset.listenerHeight],
            rayDepth: preset.maxDepth,
        };
        this.listener = new Listener(createMtListenerNative({ cache: this.listenerCache, scheduler: this }), this.coordinateTransform);
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
        const position = transformVec3(options.position, this.coordinateTransform);
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
        return new Source(createMtSourceNative({ handle, cache, scheduler: this }), this.host, this.coordinateTransform);
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
                vertices: Float32Array.from(transformVertices(options.vertices, this.coordinateTransform)),
                triangles,
                material: options.material,
                bvhType: 2,
                updateType: objectCache.updateType,
            },
        });
        const { meshNative, objectNative } = createMtMeshPair({ handle, objectCache, scheduler: this });
        return new Mesh(meshNative, objectNative, this.coordinateTransform);
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
    async reset() {
        this.assertHostLive('reset');
        await this.flushPending();
        await this.client.command({ op: 'reset' });
        this.activeSourceHandles.clear();
        this.activeMeshHandles.clear();
        this.hotTransformBridge.reset();
        this.queueCommand({
            op: 'setListenerOption',
            patch: {
                audioOption: this.listenerCache.audioOption,
                rayCount: this.listenerCache.rayCount,
                rayDepth: this.listenerCache.rayDepth,
                ...this.listenerCache.renderOptions,
            },
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
//# sourceMappingURL=soundtrace-mt-facade-state.js.map