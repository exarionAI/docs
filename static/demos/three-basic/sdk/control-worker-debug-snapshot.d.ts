import type { ControlWorkerDependencies } from './control-worker-host-types.js';
import type { PendingDebugSnapshot } from './control-worker-state.js';
import type { ControlWorkerRuntime } from './control-worker-runtime-types.js';
interface DebugSnapshotContext {
    readonly dependencies: ControlWorkerDependencies;
    readonly runtime: ControlWorkerRuntime | null;
}
export declare function resolveDebugSnapshots(snapshots: readonly PendingDebugSnapshot[], context: DebugSnapshotContext): Promise<void>;
export {};
//# sourceMappingURL=control-worker-debug-snapshot.d.ts.map