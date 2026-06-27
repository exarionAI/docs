import { Heap, makeBindings, MESH_BUILD_OPTION_SIZE, RUNTIME_OPTION_SIZE, ST_OPTION_SIZE, writeMeshBuildOption, writeRuntimeOption, writeSTOption, } from './native/index.js';
import { ControlWorkerAudioRenderer } from './control-worker-audio.js';
import { createRuntimeCommandAdapters } from './control-worker-runtime-commands.js';
import { createRuntimeHotTransformAdapters } from './control-worker-runtime-hot-transforms.js';
import { readStartupMeshBuildOption, readValidPathCount, resolveQualityOption, } from './control-worker-runtime-startup.js';
export async function createDefaultControlWorkerRuntime(module, request) {
    const heap = new Heap(module);
    const bindings = makeBindings(module);
    let sceneId = 0;
    let listenerId = 0;
    let disposed = false;
    let lastValidPathCount;
    const meshIdsByObjectId = new Map();
    let audioRenderer = new ControlWorkerAudioRenderer(bindings, heap, () => listenerId);
    const failIfNativeError = (context) => {
        const lastError = bindings.exaGetLastError();
        if (lastError) {
            throw new Error(`[soundtrace.js] ${context}: ${lastError}`);
        }
    };
    const requireNativeSuccess = (ok, context) => {
        if (!ok) {
            failIfNativeError(context);
            throw new Error(`[soundtrace.js] ${context}`);
        }
    };
    const rebuildDefaultScene = () => {
        if (listenerId !== 0) {
            bindings.exaDeleteListener(listenerId);
            listenerId = 0;
        }
        if (sceneId !== 0) {
            bindings.exaDeleteScene(sceneId);
            sceneId = 0;
        }
        sceneId = bindings.exaNewScene();
        listenerId = bindings.exaNewListener();
        bindings.exaSceneAddListener(sceneId, listenerId);
    };
    const applyStartupOptions = () => {
        heap.withScope((scope) => {
            const runtimeOptPtr = scope.block(RUNTIME_OPTION_SIZE);
            writeRuntimeOption(heap, runtimeOptPtr, {
                propagationThreadCount: request.pthreadPoolSize,
                reserved: [0, 0, 0, 0],
            });
            if (!bindings.exaSetRuntimeOption(runtimeOptPtr)) {
                failIfNativeError('failed to set runtime option');
            }
        });
        heap.withScope((scope) => {
            const listenerOptPtr = scope.block(ST_OPTION_SIZE);
            writeSTOption(heap, listenerOptPtr, resolveQualityOption(request.startup?.quality));
            if (!bindings.exaListenerSetOption(listenerId, listenerOptPtr)) {
                failIfNativeError('failed to set listener option');
            }
        });
        const meshBuildOption = readStartupMeshBuildOption(request.startup?.mesh);
        if (meshBuildOption) {
            heap.withScope((scope) => {
                const meshOptPtr = scope.block(MESH_BUILD_OPTION_SIZE);
                writeMeshBuildOption(heap, meshOptPtr, {
                    bvhType: meshBuildOption.bvhType,
                    bvhMaxDepth: meshBuildOption.bvhMaxDepth,
                    primPerLeaf: meshBuildOption.primPerLeaf,
                    reserved: [0, 0, 0],
                });
                if (!bindings.exaSetDefaultMeshBuildOption(meshOptPtr)) {
                    failIfNativeError('failed to set mesh build option');
                }
            });
        }
    };
    const ensureInitialized = () => {
        bindings.exaInit();
        failIfNativeError('exaInit failed');
        rebuildDefaultScene();
        applyStartupOptions();
    };
    ensureInitialized();
    const commandAdapters = createRuntimeCommandAdapters({
        heap,
        bindings,
        getSceneId: () => sceneId,
        getListenerId: () => listenerId,
        meshIdsByObjectId,
        requireNativeSuccess,
    });
    const hotTransformAdapters = createRuntimeHotTransformAdapters({
        heap,
        bindings,
        getSceneId: () => sceneId,
        getListenerId: () => listenerId,
        meshIdsByObjectId,
        requireNativeSuccess,
    });
    return {
        ...commandAdapters,
        ...hotTransformAdapters,
        async tick(deltaSeconds) {
            if (disposed) {
                return { updateReturn: 0, validPathCount: undefined };
            }
            bindings.exaTickScene(sceneId, deltaSeconds);
            const updateReturn = bindings.exaUpdatePropagation(sceneId);
            const updateError = bindings.exaGetLastError();
            if (updateError) {
                throw new Error(updateError);
            }
            lastValidPathCount = readValidPathCount(bindings);
            return {
                updateReturn,
                validPathCount: lastValidPathCount,
            };
        },
        async debugSnapshot(options) {
            if (options.includePaths || options.includeProfile || options.includeMemory) {
                const error = new Error('[soundtrace.js] debugSnapshot paths/profile/memory options are not implemented on the default worker runtime');
                error.code = 'UNSUPPORTED_MT_NATIVE';
                throw error;
            }
            return {
                validPathCount: lastValidPathCount,
            };
        },
        async reset() {
            audioRenderer.dispose();
            bindings.exaReset();
            failIfNativeError('exaReset failed');
            meshIdsByObjectId.clear();
            lastValidPathCount = undefined;
            rebuildDefaultScene();
            applyStartupOptions();
            audioRenderer = new ControlWorkerAudioRenderer(bindings, heap, () => listenerId);
        },
        async startAudioSource(command) {
            return audioRenderer.startSourceSession(command);
        },
        async stopAudioSource(command) {
            return audioRenderer.stopSourceSession(command.sessionId);
        },
        async dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            audioRenderer.dispose();
            if (listenerId !== 0) {
                bindings.exaDeleteListener(listenerId);
                listenerId = 0;
            }
            if (sceneId !== 0) {
                bindings.exaDeleteScene(sceneId);
                sceneId = 0;
            }
            meshIdsByObjectId.clear();
            lastValidPathCount = undefined;
            bindings.exaReset();
        },
    };
}
//# sourceMappingURL=control-worker-runtime.js.map