export declare const MESH_TRANSFORM_FLOAT_COUNT = 10;
export type MeshTransformVec3Tuple = readonly [number, number, number];
export type MeshTransformQuatTuple = readonly [number, number, number, number];
export interface MeshTransformPayload {
    readonly handle: number;
    readonly position: MeshTransformVec3Tuple;
    readonly orientation: MeshTransformQuatTuple;
    readonly scale: MeshTransformVec3Tuple;
}
export interface MeshTransformHotLane {
    readonly capacity: number;
    readonly versionBuffer: SharedArrayBuffer;
    readonly handleBuffer: SharedArrayBuffer;
    readonly transformBuffer: SharedArrayBuffer;
    readonly versions: Int32Array;
    readonly handles: Int32Array;
    readonly transforms: Float32Array;
}
export interface MeshTransformReadCursor {
    readonly seen: Int32Array;
}
export interface MeshTransformReadEntry extends MeshTransformPayload {
    readonly slot: number;
}
export declare function createMeshTransformHotLane(capacity: number): MeshTransformHotLane;
export declare function createMeshTransformReadCursor(capacity: number): MeshTransformReadCursor;
export declare function writeMeshTransformHotSlot(lane: MeshTransformHotLane, slot: number, payload: MeshTransformPayload): void;
export declare function readChangedMeshTransforms(lane: MeshTransformHotLane, cursor: MeshTransformReadCursor): MeshTransformReadEntry[];
//# sourceMappingURL=control-hot-mesh-transform.d.ts.map