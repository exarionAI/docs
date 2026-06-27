export declare const SOURCE_TRANSFORM_FLOAT_COUNT = 10;
export type SourceTransformFloatTuple = readonly [number, number, number];
export interface SourceTransformPayload {
    readonly handle: number;
    readonly position: SourceTransformFloatTuple;
    readonly direction: SourceTransformFloatTuple;
    readonly velocity: SourceTransformFloatTuple;
    readonly intensity: number;
}
export interface SourceTransformHotLane {
    readonly capacity: number;
    readonly versionBuffer: SharedArrayBuffer;
    readonly handleBuffer: SharedArrayBuffer;
    readonly transformBuffer: SharedArrayBuffer;
    readonly versions: Int32Array;
    readonly handles: Int32Array;
    readonly transforms: Float32Array;
}
export interface SourceTransformReadCursor {
    readonly seen: Int32Array;
}
export interface SourceTransformReadEntry extends SourceTransformPayload {
    readonly slot: number;
}
export declare function createSourceTransformHotLane(capacity: number): SourceTransformHotLane;
export declare function createSourceTransformReadCursor(capacity: number): SourceTransformReadCursor;
export declare function writeSourceTransformHotSlot(lane: SourceTransformHotLane, slot: number, payload: SourceTransformPayload): void;
export declare function readChangedSourceTransforms(lane: SourceTransformHotLane, cursor: SourceTransformReadCursor): SourceTransformReadEntry[];
//# sourceMappingURL=control-hot-source-transform.d.ts.map