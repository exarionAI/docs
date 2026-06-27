import {
  type InitRequest,
  type CommandRequest,
  type ControlRequest,
} from './control-protocol.js';
import {
  createListenerTransformReadCursor,
  type ListenerTransformHotLane,
  type ListenerTransformReadCursor,
} from './control-hot-listener-transform.js';
import {
  createMeshTransformReadCursor,
  type MeshTransformHotLane,
  type MeshTransformReadCursor,
} from './control-hot-mesh-transform.js';
import {
  createSourceTransformReadCursor,
  type SourceTransformHotLane,
  type SourceTransformReadCursor,
} from './control-hot-source-transform.js';
import {
  createDefaultControlWorkerRuntime,
} from './control-worker-runtime.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
import {
  normalizeCaughtUnknown,
  toCommandError,
} from './control-worker-error-utils.js';
import {
  createDefaultPostResponse,
  defaultCreateModule,
  defaultFrameScheduler,
  defaultLoadScript,
} from './control-worker-defaults.js';
import {
  type ControlWorkerDependencies,
  type ControlWorkerHostInitOptions,
  getDependenciesFromOptions,
} from './control-worker-host-types.js';
import {
  enqueueCommandRequest,
  enqueueDebugSnapshotRequest,
  enqueueFrameRequest,
} from './control-worker-control-loop.js';
import {
  handleWorkerDispose,
  handleWorkerInit,
} from './control-worker-lifecycle.js';
import {
  createControlWorkerState,
  type ControlWorkerState,
} from './control-worker-state.js';

const defaultCreateRuntime = createDefaultControlWorkerRuntime;

export class ControlWorkerHost {
  private readonly dependencies: ControlWorkerDependencies;
  private readonly state: ControlWorkerState = createControlWorkerState();
  private listenerTransformLane: ListenerTransformHotLane | null;
  private listenerTransformReadCursor: ListenerTransformReadCursor | null;
  private meshTransformLane: MeshTransformHotLane | null;
  private meshTransformReadCursor: MeshTransformReadCursor | null;
  private sourceTransformLane: SourceTransformHotLane | null;
  private sourceTransformReadCursor: SourceTransformReadCursor | null;

  constructor(options: ControlWorkerHostInitOptions = {}) {
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

  async handleRequest(request: ControlRequest): Promise<void> {
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

  private getCommandContext(): ControlWorkerCommandContext {
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

  private getLoopContext(): {
    readonly dependencies: ControlWorkerDependencies;
    readonly getCommandContext: () => ControlWorkerCommandContext;
    readonly listenerTransformLane: ListenerTransformHotLane | null;
    readonly listenerTransformReadCursor: ListenerTransformReadCursor | null;
    readonly meshTransformLane: MeshTransformHotLane | null;
    readonly meshTransformReadCursor: MeshTransformReadCursor | null;
    readonly sourceTransformLane: SourceTransformHotLane | null;
    readonly sourceTransformReadCursor: SourceTransformReadCursor | null;
    readonly state: ControlWorkerState;
  } {
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

  private configureHotTransformLanes(request: InitRequest): void {
    if (!request.hotTransforms) {
      return;
    }

    this.listenerTransformLane = request.hotTransforms.listener;
    this.listenerTransformReadCursor = createListenerTransformReadCursor();
    this.meshTransformLane = request.hotTransforms.mesh;
    this.meshTransformReadCursor = createMeshTransformReadCursor(
      request.hotTransforms.mesh.capacity,
    );
    this.sourceTransformLane = request.hotTransforms.source;
    this.sourceTransformReadCursor = createSourceTransformReadCursor(
      request.hotTransforms.source.capacity,
    );
  }
}

export type {
  ControlWorkerDependencies,
  ControlWorkerHostInitOptions,
} from './control-worker-host-types.js';

function assertNever(value: never): never {
  throw new Error(`[soundtrace.js] unexpected control request: ${String(value)}`);
}
