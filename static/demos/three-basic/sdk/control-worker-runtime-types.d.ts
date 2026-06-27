import type { CommandCreateMesh, CommandCreateSource, CommandDeleteMesh, CommandDeleteSource, CommandExecutionResult, CommandRequest, CommandSetListenerOption, CommandSetMeshMaterial, CommandSetMeshMaterialRange, CommandSetMeshUpdateType, CommandSetRenderOption, CommandSetSourceParam, CommandStartAudioSource, CommandStopAudioSource, DebugSnapshot, DebugSnapshotOptions } from './control-protocol.js';
type EngineIdResult = number;
export type FrameExecutionResult = {
    readonly updateReturn: number;
    readonly validPathCount?: number;
};
export interface ControlWorkerRuntime {
    readonly createSource?: (command: CommandCreateSource) => EngineIdResult | Promise<EngineIdResult>;
    readonly createMesh?: (command: CommandCreateMesh) => EngineIdResult | Promise<EngineIdResult>;
    readonly deleteSource?: (command: CommandDeleteSource & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly deleteMesh?: (command: CommandDeleteMesh & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly setMeshMaterial?: (command: CommandSetMeshMaterial & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly setMeshMaterialRange?: (command: CommandSetMeshMaterialRange & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly setMeshUpdateType?: (command: CommandSetMeshUpdateType & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly setSourceParam?: (command: CommandSetSourceParam & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly startAudioSource?: (command: CommandStartAudioSource & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly stopAudioSource?: (command: CommandStopAudioSource) => unknown | Promise<unknown>;
    readonly setRenderOption?: (command: CommandSetRenderOption & {
        readonly engineId: number;
    }) => unknown | Promise<unknown>;
    readonly setListenerOption?: (command: CommandSetListenerOption) => unknown | Promise<unknown>;
    readonly applyHotListenerTransform?: (command: {
        readonly position: readonly [number, number, number];
        readonly orientation: readonly [number, number, number, number];
    }) => unknown | Promise<unknown>;
    readonly applyHotMeshTransform?: (command: {
        readonly engineId: number;
        readonly handle: number;
        readonly position: readonly [number, number, number];
        readonly orientation: readonly [number, number, number, number];
        readonly scale: readonly [number, number, number];
    }) => unknown | Promise<unknown>;
    readonly applyHotSourceTransform?: (command: {
        readonly engineId: number;
        readonly handle: number;
        readonly position: readonly [number, number, number];
        readonly direction: readonly [number, number, number];
        readonly velocity: readonly [number, number, number];
        readonly intensity: number;
    }) => unknown | Promise<unknown>;
    readonly drainCommands?: (commands: readonly CommandRequest[]) => CommandExecutionResult[] | Promise<CommandExecutionResult[]>;
    readonly debugSnapshot?: (options: DebugSnapshotOptions) => DebugSnapshot | Promise<DebugSnapshot>;
    readonly tick: (deltaSeconds: number) => FrameExecutionResult | Promise<FrameExecutionResult>;
    readonly reset: () => void | Promise<void>;
    readonly dispose: () => void | Promise<void>;
}
export {};
//# sourceMappingURL=control-worker-runtime-types.d.ts.map