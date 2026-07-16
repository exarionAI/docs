import { Heap, isError, makeBindings, exaResultName, requireOk, MATERIAL_SIZE, MESH_BUILD_OPTION_SIZE, LISTENER_OPTION_SIZE, RUNTIME_OPTION_SIZE, writeMaterial, writeMeshBuildOption, writeListenerOption, writeRuntimeOption, } from '../native/index.js';
import { ControlWorkerNativeAudio } from './control-worker-native-audio.js';
import { createRuntimeCommandAdapters } from './control-worker-runtime-commands.js';
import { createRuntimeHotTransformAdapters } from './control-worker-runtime-hot-transforms.js';
import { readStartupMeshBuildOption, readValidPathCount, resolveQualityOption, } from './control-worker-runtime-startup.js';
export async function createDefaultControlWorkerRuntime(module, request, postEvent) {
    const heap = new Heap(module);
    const bindings = makeBindings(module);
    let sceneId = 0;
    let listenerId = 0;
    let disposed = false;
    let lastValidPathCount;
    const meshIdsByObjectId = new Map();
    let audioRenderer = null;
    const getAudioRenderer = () => {
        audioRenderer ??= new ControlWorkerNativeAudio(module, bindings, () => listenerId, postEvent);
        return audioRenderer;
    };
    // Central worker-side gate for every native call (v0.7 ExaResult: 0 = OK,
    // NEGATIVE = error — the truthiness FLIP means `if (result)` would treat
    // success as failure; never do that). Throws with the native detail message
    // plus the symbolic + numeric code.
    const requireNativeSuccess = (result, context) => {
        if (result >= 0)
            return;
        const lastError = bindings.exaGetLastError().trim();
        const detail = lastError.length > 0 ? `: ${lastError}` : '';
        throw new Error(`[soundtrace.js] ${context} (${exaResultName(result)})${detail}`);
    };
    const createEntity = (create, context) => heap.withScope((scope) => {
        const idPtr = scope.i32();
        requireOk(create(idPtr), context, bindings.exaGetLastError);
        return heap.readI32(idPtr);
    });
    const rebuildDefaultScene = () => {
        if (listenerId !== 0) {
            bindings.exaListenerDestroy(listenerId);
            listenerId = 0;
        }
        if (sceneId !== 0) {
            bindings.exaSceneDestroy(sceneId);
            sceneId = 0;
        }
        sceneId = createEntity(bindings.exaSceneCreate, 'exaSceneCreate');
        listenerId = createEntity(bindings.exaListenerCreate, 'exaListenerCreate');
        requireNativeSuccess(bindings.exaSceneAddListener(sceneId, listenerId), 'failed to add default listener to default scene');
    };
    // v0.7 (D-12): runtime options configure engine construction and are
    // PRE-INIT ONLY — the core returns EXA_ERR_ALREADY after exaInit. The old
    // core silently ignored this (the mt thread-pool size was never actually
    // applied); keep this call strictly before exaInit.
    const applyRuntimeOption = () => {
        heap.withScope((scope) => {
            const runtimeOptPtr = scope.block(RUNTIME_OPTION_SIZE);
            writeRuntimeOption(heap, runtimeOptPtr, {
                propagationThreadCount: request.pthreadPoolSize,
                reserved: [0, 0, 0, 0],
            });
            requireNativeSuccess(bindings.exaSetRuntimeOption(runtimeOptPtr), 'failed to set runtime option');
        });
    };
    const applyStartupOptions = () => {
        // v0.7 (D-14): the trace grid / bounce depth left ExaListenerOption; the
        // quality tier applies them through their SOLE writers, then the remaining
        // option fields through exaListenerSetOption.
        const preset = resolveQualityOption(request.startup?.quality, request.startup?.sceneRatio);
        requireNativeSuccess(bindings.exaListenerSetRayCount(listenerId, preset.listenerWidth, preset.listenerHeight), 'failed to set listener ray count');
        requireNativeSuccess(bindings.exaListenerSetRayDepth(listenerId, preset.maxDepth), 'failed to set listener ray depth');
        heap.withScope((scope) => {
            const listenerOptPtr = scope.block(LISTENER_OPTION_SIZE);
            writeListenerOption(heap, listenerOptPtr, preset);
            requireNativeSuccess(bindings.exaListenerSetOption(listenerId, listenerOptPtr), 'failed to set listener option');
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
                requireNativeSuccess(bindings.exaMeshSetDefaultBuildOption(meshOptPtr), 'failed to set mesh build option');
            });
        }
    };
    const registerStartupMaterials = () => {
        const materials = request.startup?.materials;
        if (!materials || materials.length === 0) {
            return;
        }
        // Register every material in array order so the assigned core index equals
        // the array position — keeping MT indices identical to the ST path, where
        // the facade resolves names against the same asset (TASK-0022 A). v0.7:
        // exaMaterialCreate returns the id via out-param (ExaMaterial lost its
        // index field), so array order is the ONLY index contract.
        materials.forEach((material, position) => {
            heap.withScope((scope) => {
                const ptr = scope.block(MATERIAL_SIZE);
                writeMaterial(heap, ptr, {
                    reflection: material.reflection,
                    absorption: material.absorption,
                    transmission: material.transmission,
                    scattering: material.scattering,
                });
                const idPtr = scope.i32();
                requireNativeSuccess(bindings.exaMaterialCreate(ptr, idPtr), `failed to register material at index ${position}`);
                if (heap.readI32(idPtr) < 0) {
                    throw new Error(`[soundtrace.js] failed to register material at index ${position}`);
                }
            });
        });
    };
    const ensureInitialized = () => {
        applyRuntimeOption(); // must precede exaInit (D-12 pre-init contract)
        requireNativeSuccess(bindings.exaInit(), 'exaInit failed');
        registerStartupMaterials();
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
        async tick(_deltaSeconds) {
            if (disposed) {
                return { updateReturn: 0, validPathCount: undefined };
            }
            // v0.7 frame loop: exaSceneUpdateGeometry (pure TLAS refresh, the old
            // deltaTime is gone) + exaScenePropagate (status and path count are
            // separate — the old zero-was-seven-things return is history).
            requireNativeSuccess(bindings.exaSceneUpdateGeometry(sceneId), 'exaSceneUpdateGeometry failed');
            const pathCount = heap.withScope((scope) => {
                const countPtr = scope.i32();
                const result = bindings.exaScenePropagate(sceneId, countPtr);
                if (isError(result)) {
                    const lastError = bindings.exaGetLastError().trim();
                    throw new Error(lastError.length > 0
                        ? lastError
                        : `[soundtrace.js] exaScenePropagate failed (${exaResultName(result)})`);
                }
                return heap.readI32(countPtr);
            });
            lastValidPathCount = readValidPathCount(bindings, heap);
            return {
                updateReturn: pathCount,
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
            // The native worklet thread is process-global (AudioWorkletEntry.cpp
            // keeps s_workletInitialized as a file static) and exa_audio_worklet_init
            // short-circuits after the first call, so the glue would never wire its
            // dispatcher onto a replacement proxy port — a rebuilt renderer here
            // silently stops receiving worklet -> wasm messages. Keep the renderer
            // across reset; only its per-scene sessions are stale.
            audioRenderer?.clearSessions();
            requireNativeSuccess(bindings.exaReset(), 'exaReset failed');
            meshIdsByObjectId.clear();
            lastValidPathCount = undefined;
            // exaReset deleted the core system singleton (Core.cpp: `delete sys`),
            // so the engine is back to PRE-INIT: every entity registry is gone and
            // exaSceneCreate would fail with EXA_ERR_NOT_INITIALIZED. Re-run the
            // exact boot sequence construction uses — runtime options first (D-12
            // pre-init contract), exaInit, startup materials (array order is the
            // index contract), default scene, startup options. Calling only
            // rebuildDefaultScene() here bricked the runtime on the first reset
            // (finding #2/M5). The old ids died with exaReset — zero them so the
            // rebuild skips its stale destroy branch.
            sceneId = 0;
            listenerId = 0;
            ensureInitialized();
        },
        async startAudioSource(command) {
            return getAudioRenderer().startSourceSession(command);
        },
        async stopAudioSource(command) {
            return audioRenderer?.stopSourceSession(command.sessionId) ?? { stopped: false };
        },
        handleAudioWorkletRelay(message) {
            audioRenderer?.handleRelay(message);
        },
        async dispose() {
            if (disposed) {
                return;
            }
            disposed = true;
            audioRenderer?.dispose();
            audioRenderer = null;
            if (listenerId !== 0) {
                bindings.exaListenerDestroy(listenerId);
                listenerId = 0;
            }
            if (sceneId !== 0) {
                bindings.exaSceneDestroy(sceneId);
                sceneId = 0;
            }
            meshIdsByObjectId.clear();
            lastValidPathCount = undefined;
            bindings.exaReset();
        },
    };
}
//# sourceMappingURL=control-worker-runtime.js.map