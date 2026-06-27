import type { CommandRequest, DebugSnapshotRequest, FrameRequest } from './control-protocol.js';
import { type ListenerTransformHotLane, type ListenerTransformReadCursor } from './control-hot-listener-transform.js';
import { type MeshTransformHotLane, type MeshTransformReadCursor } from './control-hot-mesh-transform.js';
import { type SourceTransformHotLane, type SourceTransformReadCursor } from './control-hot-source-transform.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
import type { ControlWorkerDependencies } from './control-worker-host-types.js';
import type { ControlWorkerState } from './control-worker-state.js';
interface ControlLoopContext {
    readonly dependencies: ControlWorkerDependencies;
    readonly getCommandContext: () => ControlWorkerCommandContext;
    readonly listenerTransformLane: ListenerTransformHotLane | null;
    readonly listenerTransformReadCursor: ListenerTransformReadCursor | null;
    readonly meshTransformLane: MeshTransformHotLane | null;
    readonly meshTransformReadCursor: MeshTransformReadCursor | null;
    readonly sourceTransformLane: SourceTransformHotLane | null;
    readonly sourceTransformReadCursor: SourceTransformReadCursor | null;
    readonly state: ControlWorkerState;
}
export declare function enqueueFrameRequest(request: FrameRequest, context: ControlLoopContext): void;
export declare function enqueueCommandRequest(request: CommandRequest, context: ControlLoopContext): void;
export declare function enqueueDebugSnapshotRequest(request: DebugSnapshotRequest, context: ControlLoopContext): void;
export declare function scheduleControlLoop(context: ControlLoopContext): void;
export {};
//# sourceMappingURL=control-worker-control-loop.d.ts.map