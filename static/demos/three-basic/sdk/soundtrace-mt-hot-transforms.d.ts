import { type ListenerTransformHotLane } from './control-hot-listener-transform.js';
import { type MeshTransformHotLane } from './control-hot-mesh-transform.js';
import { type SourceTransformHotLane } from './control-hot-source-transform.js';
import type { ListenerCache, ObjectCache, SourceCache } from './soundtrace-mt-facade-types.js';
export interface MtHotTransformLanes {
    readonly source: SourceTransformHotLane;
    readonly listener: ListenerTransformHotLane;
    readonly mesh: MeshTransformHotLane;
}
export declare class MtHotTransformSupportError extends Error {
    readonly code = "COI_REQUIRED";
    constructor(message: string);
}
export declare function assertMtHotTransformSupport(): void;
export declare function createMtHotTransformLanes(): MtHotTransformLanes;
export declare class SoundTraceMtHotTransformBridge {
    private readonly lanes;
    private readonly sourceSlots;
    private readonly meshSlots;
    constructor(lanes: MtHotTransformLanes);
    releaseSourceHandle(handle: number): void;
    releaseMeshHandle(handle: number): void;
    reset(): void;
    stageSourceTransform(handle: number, cache: SourceCache): void;
    stageListenerTransform(cache: ListenerCache): void;
    stageMeshTransform(handle: number, cache: ObjectCache): void;
    private resolveSlot;
}
//# sourceMappingURL=soundtrace-mt-hot-transforms.d.ts.map