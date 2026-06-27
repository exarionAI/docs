import { type ControlRequest } from './control-protocol.js';
import { type ControlWorkerHostInitOptions } from './control-worker-host-types.js';
export declare class ControlWorkerHost {
    private readonly dependencies;
    private readonly state;
    private listenerTransformLane;
    private listenerTransformReadCursor;
    private meshTransformLane;
    private meshTransformReadCursor;
    private sourceTransformLane;
    private sourceTransformReadCursor;
    constructor(options?: ControlWorkerHostInitOptions);
    handleRequest(request: ControlRequest): Promise<void>;
    private getCommandContext;
    private getLoopContext;
    private configureHotTransformLanes;
}
export type { ControlWorkerDependencies, ControlWorkerHostInitOptions, } from './control-worker-host-types.js';
//# sourceMappingURL=control-worker.d.ts.map