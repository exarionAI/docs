import type { CommandCreateMesh, CommandCreateSource, CommandDeleteMesh, CommandDeleteSource, CommandSetListenerOption, CommandSetMeshMaterial, CommandSetMeshMaterialRange, CommandSetMeshUpdateType, CommandSetRenderOption, CommandSetSourceParam } from './control-protocol.js';
import type { Bindings, Heap } from './native/index.js';
type RequireNativeSuccess = (ok: boolean, context: string) => void;
export type RuntimeCommandAdapterSet = {
    readonly createSource: (command: CommandCreateSource) => Promise<number>;
    readonly createMesh: (command: CommandCreateMesh) => Promise<number>;
    readonly deleteSource: (command: CommandDeleteSource & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly deleteMesh: (command: CommandDeleteMesh & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly setMeshMaterial: (command: CommandSetMeshMaterial & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly setMeshMaterialRange: (command: CommandSetMeshMaterialRange & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly setMeshUpdateType: (command: CommandSetMeshUpdateType & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly setSourceParam: (command: CommandSetSourceParam & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly setRenderOption: (command: CommandSetRenderOption & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly setListenerOption: (command: CommandSetListenerOption) => Promise<unknown>;
};
export interface RuntimeCommandAdapterContext {
    readonly heap: Heap;
    readonly bindings: Bindings;
    readonly getSceneId: () => number;
    readonly getListenerId: () => number;
    readonly meshIdsByObjectId: Map<number, number>;
    readonly requireNativeSuccess: RequireNativeSuccess;
}
export declare function requireMeshId(meshIdsByObjectId: Map<number, number>, objectId: number): number;
export declare function requireNumber(value: unknown, label: string): number;
export declare function requireInteger(value: unknown, label: string): number;
export declare function requireBoolean(value: unknown, label: string): boolean;
export declare function readVec3Tuple(value: unknown, label: string): readonly [number, number, number];
export declare function readQuatTuple(value: unknown, label: string): readonly [number, number, number, number];
export declare function readIntegerPair(value: unknown, label: string): readonly [number, number];
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export {};
//# sourceMappingURL=control-worker-runtime-command-shared.d.ts.map