export declare const LISTENER_TRANSFORM_FLOAT_COUNT = 7;
export type ListenerTransformPositionTuple = readonly [number, number, number];
export type ListenerTransformOrientationTuple = readonly [number, number, number, number];
export interface ListenerTransformPayload {
    readonly position: ListenerTransformPositionTuple;
    readonly orientation: ListenerTransformOrientationTuple;
}
export interface ListenerTransformHotLane {
    readonly versionBuffer: SharedArrayBuffer;
    readonly transformBuffer: SharedArrayBuffer;
    readonly versions: Int32Array;
    readonly transforms: Float32Array;
}
export interface ListenerTransformReadCursor {
    seen: number;
}
export declare function createListenerTransformHotLane(): ListenerTransformHotLane;
export declare function createListenerTransformReadCursor(): ListenerTransformReadCursor;
export declare function writeListenerTransformHotSlot(lane: ListenerTransformHotLane, payload: ListenerTransformPayload): void;
export declare function readChangedListenerTransform(lane: ListenerTransformHotLane, cursor?: ListenerTransformReadCursor): ListenerTransformPayload | null;
//# sourceMappingURL=control-hot-listener-transform.d.ts.map