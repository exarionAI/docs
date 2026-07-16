import { createListenerTransformReadCursor, } from './control-hot-listener-transform.js';
import { createMeshTransformReadCursor, } from './control-hot-mesh-transform.js';
import { createSourceTransformReadCursor, } from './control-hot-source-transform.js';
import { createDefaultControlWorkerRuntime, } from './control-worker-runtime.js';
import { isRecord } from './control-worker-runtime-command-shared.js';
import { normalizeCaughtUnknown, toCommandError, } from './control-worker-error-utils.js';
import { createDefaultPostResponse, defaultCreateModule, defaultFrameScheduler, defaultLoadScript, } from './control-worker-defaults.js';
import { getDependenciesFromOptions, } from './control-worker-host-types.js';
import { enqueueCommandRequest, enqueueDebugSnapshotRequest, enqueueFrameRequest, } from './control-worker-control-loop.js';
import { handleWorkerDispose, handleWorkerInit, } from './control-worker-lifecycle.js';
import { createControlWorkerState, } from './control-worker-state.js';
const defaultCreateRuntime = createDefaultControlWorkerRuntime;
export class ControlWorkerHost {
    dependencies;
    state = createControlWorkerState();
    listenerTransformLane;
    listenerTransformReadCursor;
    meshTransformLane;
    meshTransformReadCursor;
    sourceTransformLane;
    sourceTransformReadCursor;
    constructor(options = {}) {
        const dependencies = getDependenciesFromOptions(options);
        const postResponse = dependencies?.postResponse?.bind(dependencies);
        const loadScript = dependencies?.loadScript?.bind(dependencies);
        const createSource = dependencies?.createSource?.bind(dependencies);
        const createMesh = dependencies?.createMesh?.bind(dependencies);
        const deleteSource = dependencies?.deleteSource?.bind(dependencies);
        const deleteMesh = dependencies?.deleteMesh?.bind(dependencies);
        const setMeshMaterial = dependencies?.setMeshMaterial?.bind(dependencies);
        const setMeshMaterialRange = dependencies?.setMeshMaterialRange?.bind(dependencies);
        const setMeshUpdateType = dependencies?.setMeshUpdateType?.bind(dependencies);
        const setSourceParam = dependencies?.setSourceParam?.bind(dependencies);
        const setRenderOption = dependencies?.setRenderOption?.bind(dependencies);
        const setListenerOption = dependencies?.setListenerOption?.bind(dependencies);
        const applyHotListenerTransform = dependencies?.applyHotListenerTransform?.bind(dependencies);
        const applyHotMeshTransform = dependencies?.applyHotMeshTransform?.bind(dependencies);
        const applyHotSourceTransform = dependencies?.applyHotSourceTransform?.bind(dependencies);
        const listenerTransformLane = dependencies?.listenerTransformLane ?? null;
        const meshTransformLane = dependencies?.meshTransformLane ?? null;
        const sourceTransformLane = dependencies?.sourceTransformLane ?? null;
        const createModule = dependencies?.createModule?.bind(dependencies);
        const createRuntime = dependencies?.createRuntime?.bind(dependencies);
        const schedule = dependencies?.schedule?.bind(dependencies);
        this.dependencies = {
            postResponse: postResponse ?? createDefaultPostResponse(),
            createSource: createSource ?? undefined,
            createMesh: createMesh ?? undefined,
            deleteSource: deleteSource ?? undefined,
            deleteMesh: deleteMesh ?? undefined,
            setMeshMaterial: setMeshMaterial ?? undefined,
            setMeshMaterialRange: setMeshMaterialRange ?? undefined,
            setMeshUpdateType: setMeshUpdateType ?? undefined,
            setSourceParam: setSourceParam ?? undefined,
            setRenderOption: setRenderOption ?? undefined,
            setListenerOption: setListenerOption ?? undefined,
            applyHotListenerTransform: applyHotListenerTransform ?? undefined,
            applyHotMeshTransform: applyHotMeshTransform ?? undefined,
            applyHotSourceTransform: applyHotSourceTransform ?? undefined,
            listenerTransformLane: listenerTransformLane ?? undefined,
            meshTransformLane: meshTransformLane ?? undefined,
            sourceTransformLane: sourceTransformLane ?? undefined,
            loadScript: loadScript ?? defaultLoadScript,
            createModule: createModule ?? defaultCreateModule,
            createRuntime: createRuntime ?? defaultCreateRuntime,
            schedule: schedule ?? defaultFrameScheduler,
        };
        this.listenerTransformLane = listenerTransformLane;
        this.listenerTransformReadCursor = listenerTransformLane
            ? createListenerTransformReadCursor()
            : null;
        this.meshTransformLane = meshTransformLane;
        this.meshTransformReadCursor = meshTransformLane
            ? createMeshTransformReadCursor(meshTransformLane.capacity)
            : null;
        this.sourceTransformLane = sourceTransformLane;
        this.sourceTransformReadCursor = sourceTransformLane
            ? createSourceTransformReadCursor(sourceTransformLane.capacity)
            : null;
    }
    async handleRequest(request) {
        // Runtime schema guard: postMessage payloads are untyped at runtime, so a
        // malformed/hostile message must fail closed with a structured error rather
        // than being accessed positionally or thrown into the bootstrap catch.
        const invalid = describeInvalidWorkerMessage(request);
        if (invalid !== null) {
            const id = isRecord(request) && 'id' in request && typeof request.id === 'number'
                ? request.id
                : undefined;
            this.dependencies.postResponse({
                kind: 'error',
                ...(id !== undefined ? { id } : {}),
                code: 'MALFORMED_REQUEST',
                message: `[soundtrace.js] malformed control request: ${invalid}`,
            });
            return;
        }
        // Fire-and-forget, and the only inbound message without an id — dispatched
        // before the id-carrying request contract below so everything after this
        // narrows to a ControlRequest.
        if (request.kind === 'audioWorkletRelay') {
            this.state.runtime?.handleAudioWorkletRelay?.(request);
            return;
        }
        if (request.kind === 'init') {
            this.configureHotTransformLanes(request);
            await handleWorkerInit(request, {
                dependencies: this.dependencies,
                state: this.state,
            });
            return;
        }
        if (request.kind === 'dispose') {
            await handleWorkerDispose(request, {
                dependencies: this.dependencies,
                state: this.state,
            });
            return;
        }
        if (this.state.disposed) {
            this.dependencies.postResponse({
                kind: 'error',
                id: request.id,
                code: 'DISPOSED',
                message: '[soundtrace.js] worker host is disposed',
            });
            return;
        }
        if (request.kind === 'frame') {
            enqueueFrameRequest(request, this.getLoopContext());
            return;
        }
        if (request.kind === 'command') {
            enqueueCommandRequest(request, this.getLoopContext());
            return;
        }
        if (request.kind === 'debugSnapshot') {
            enqueueDebugSnapshotRequest(request, this.getLoopContext());
            return;
        }
        return assertNever(request);
    }
    getCommandContext() {
        return {
            dependencies: this.dependencies,
            getRuntime: () => this.state.runtime,
            sourceHandleMap: this.state.sourceHandleMap,
            meshHandleMap: this.state.meshHandleMap,
            clearHandleMaps: () => {
                this.state.sourceHandleMap.clear();
                this.state.meshHandleMap.clear();
            },
            normalizeCaughtUnknown,
            toCommandError,
        };
    }
    getLoopContext() {
        return {
            dependencies: this.dependencies,
            getCommandContext: this.getCommandContext.bind(this),
            listenerTransformLane: this.listenerTransformLane,
            listenerTransformReadCursor: this.listenerTransformReadCursor,
            meshTransformLane: this.meshTransformLane,
            meshTransformReadCursor: this.meshTransformReadCursor,
            sourceTransformLane: this.sourceTransformLane,
            sourceTransformReadCursor: this.sourceTransformReadCursor,
            state: this.state,
        };
    }
    configureHotTransformLanes(request) {
        if (!request.hotTransforms) {
            return;
        }
        this.listenerTransformLane = request.hotTransforms.listener;
        this.listenerTransformReadCursor = createListenerTransformReadCursor();
        this.meshTransformLane = request.hotTransforms.mesh;
        this.meshTransformReadCursor = createMeshTransformReadCursor(request.hotTransforms.mesh.capacity);
        this.sourceTransformLane = request.hotTransforms.source;
        this.sourceTransformReadCursor = createSourceTransformReadCursor(request.hotTransforms.source.capacity);
    }
}
const WORKER_INBOUND_KINDS = new Set([
    'init', 'dispose', 'frame', 'command', 'debugSnapshot', 'audioWorkletRelay',
]);
/** Returns a human-readable reason when `message` is not a structurally valid
 *  ControlWorkerInbound, or null when it is acceptable to dispatch. */
function describeInvalidWorkerMessage(message) {
    if (!isRecord(message)) {
        return 'request must be an object';
    }
    if (typeof message.kind !== 'string' || !WORKER_INBOUND_KINDS.has(message.kind)) {
        return `unknown kind ${JSON.stringify(message.kind)}`;
    }
    if (message.kind === 'audioWorkletRelay') {
        return describeInvalidAudioWorkletRelay(message);
    }
    if (typeof message.id !== 'number' || !Number.isFinite(message.id)) {
        return `'${message.kind}' request is missing a numeric id`;
    }
    if (message.kind === 'command') {
        const command = message.command;
        if (!isRecord(command) || typeof command.op !== 'string') {
            return "'command' request must carry a command object with a string op";
        }
    }
    return null;
}
/** The relay is fire-and-forget, so it is validated on its own terms rather
 *  than against the id-carrying request contract. */
function describeInvalidAudioWorkletRelay(message) {
    if (message.op === 'moduleResult') {
        return typeof message.requestId === 'number'
            ? null
            : "'audioWorkletRelay.moduleResult' is missing a numeric requestId";
    }
    return message.op === 'portMessage'
        ? null
        : "'audioWorkletRelay' has an unknown op";
}
function assertNever(value) {
    throw new Error(`[soundtrace.js] unexpected control request: ${String(value)}`);
}
//# sourceMappingURL=control-worker.js.map