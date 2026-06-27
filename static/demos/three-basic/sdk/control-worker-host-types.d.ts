import type { CommandCreateMesh, CommandCreateSource, CommandDeleteMesh, CommandDeleteSource, CommandSetListenerOption, CommandSetMeshMaterial, CommandSetMeshMaterialRange, CommandSetMeshUpdateType, CommandSetRenderOption, CommandSetSourceParam, EngineId, InitRequest, ControlResponse } from './control-protocol.js';
import type { ListenerTransformHotLane, ListenerTransformPayload } from './control-hot-listener-transform.js';
import type { MeshTransformHotLane, MeshTransformPayload } from './control-hot-mesh-transform.js';
import type { SourceTransformHotLane, SourceTransformPayload } from './control-hot-source-transform.js';
import type { ControlWorkerRuntime } from './control-worker-runtime-types.js';
import type { ExaSoundModule } from './types.js';
export type CreateSourceOperation = (command: CommandCreateSource) => Promise<EngineId>;
export type CreateMeshOperation = (command: CommandCreateMesh) => Promise<EngineId>;
export type DeleteSourceOperation = (command: CommandDeleteSource & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type DeleteMeshOperation = (command: CommandDeleteMesh & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type SetMeshMaterialOperation = (command: CommandSetMeshMaterial & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type SetMeshMaterialRangeOperation = (command: CommandSetMeshMaterialRange & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type SetMeshUpdateTypeOperation = (command: CommandSetMeshUpdateType & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type SetSourceParamOperation = (command: CommandSetSourceParam & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type SetRenderOptionOperation = (command: CommandSetRenderOption & {
    readonly engineId: EngineId;
}) => Promise<unknown>;
export type SetListenerOptionOperation = (command: CommandSetListenerOption) => Promise<unknown>;
export type ApplyHotListenerTransformOperation = (command: ListenerTransformPayload) => unknown | Promise<unknown>;
export type ApplyHotMeshTransformOperation = (command: MeshTransformPayload & {
    readonly engineId: EngineId;
}) => unknown | Promise<unknown>;
export type ApplyHotSourceTransformOperation = (command: SourceTransformPayload & {
    readonly engineId: EngineId;
}) => unknown | Promise<unknown>;
export type PostMessage = (message: ControlResponse) => void;
export type LoadScript = (url: string) => Promise<void>;
export type CreateModule = (glueUrl: string, moduleArg: Partial<ExaSoundModule>) => Promise<ExaSoundModule>;
export type CreateRuntime = (module: ExaSoundModule, request: InitRequest) => Promise<ControlWorkerRuntime>;
export type ScheduleFrameWork = (work: () => void | Promise<void>) => void;
export interface ControlWorkerDependencies {
    createSource?: CreateSourceOperation;
    createMesh?: CreateMeshOperation;
    deleteSource?: DeleteSourceOperation;
    deleteMesh?: DeleteMeshOperation;
    setMeshMaterial?: SetMeshMaterialOperation;
    setMeshMaterialRange?: SetMeshMaterialRangeOperation;
    setMeshUpdateType?: SetMeshUpdateTypeOperation;
    setSourceParam?: SetSourceParamOperation;
    setRenderOption?: SetRenderOptionOperation;
    setListenerOption?: SetListenerOptionOperation;
    applyHotListenerTransform?: ApplyHotListenerTransformOperation;
    applyHotMeshTransform?: ApplyHotMeshTransformOperation;
    applyHotSourceTransform?: ApplyHotSourceTransformOperation;
    listenerTransformLane?: ListenerTransformHotLane;
    meshTransformLane?: MeshTransformHotLane;
    sourceTransformLane?: SourceTransformHotLane;
    postResponse: PostMessage;
    loadScript: LoadScript;
    createModule: CreateModule;
    createRuntime: CreateRuntime;
    schedule: ScheduleFrameWork;
}
export type ControlWorkerHostInitOptions = Partial<ControlWorkerDependencies> | {
    readonly dependencies?: Partial<ControlWorkerDependencies>;
};
export declare function getDependenciesFromOptions(options: ControlWorkerHostInitOptions): Partial<ControlWorkerDependencies> | undefined;
//# sourceMappingURL=control-worker-host-types.d.ts.map