import type { InitRequest } from './control-protocol.js';
import { type ControlWorkerRuntimeError } from './control-worker-error-utils.js';
import type { ControlWorkerDependencies } from './control-worker-host-types.js';
import type { ControlWorkerState } from './control-worker-state.js';
interface LifecycleContext {
    readonly dependencies: ControlWorkerDependencies;
    readonly state: ControlWorkerState;
}
export declare function handleWorkerInit(request: InitRequest, context: LifecycleContext): Promise<void>;
export declare function handleWorkerDispose(request: {
    readonly kind: 'dispose';
    readonly id: number;
}, context: LifecycleContext): Promise<void>;
export declare function markWorkerFatal(error: unknown, context: LifecycleContext): void;
export declare function terminateWorkerRuntime(context: LifecycleContext, fatalError?: ControlWorkerRuntimeError): Promise<ControlWorkerRuntimeError | null>;
export {};
//# sourceMappingURL=control-worker-lifecycle.d.ts.map