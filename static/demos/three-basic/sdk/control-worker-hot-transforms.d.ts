import { type ListenerTransformHotLane, type ListenerTransformReadCursor } from './control-hot-listener-transform.js';
import { type MeshTransformHotLane, type MeshTransformReadCursor } from './control-hot-mesh-transform.js';
import { type SourceTransformHotLane, type SourceTransformReadCursor } from './control-hot-source-transform.js';
import type { ControlWorkerDependencies } from './control-worker-host-types.js';
import type { ControlWorkerState } from './control-worker-state.js';
interface HotTransformContext {
    readonly dependencies: ControlWorkerDependencies;
    readonly listenerTransformLane: ListenerTransformHotLane | null;
    readonly listenerTransformReadCursor: ListenerTransformReadCursor | null;
    readonly meshTransformLane: MeshTransformHotLane | null;
    readonly meshTransformReadCursor: MeshTransformReadCursor | null;
    readonly sourceTransformLane: SourceTransformHotLane | null;
    readonly sourceTransformReadCursor: SourceTransformReadCursor | null;
    readonly state: ControlWorkerState;
}
export declare function applyPendingHotTransforms(context: HotTransformContext): Promise<void> | void;
export {};
//# sourceMappingURL=control-worker-hot-transforms.d.ts.map