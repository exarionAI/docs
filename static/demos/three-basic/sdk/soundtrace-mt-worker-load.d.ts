import { ControlClient } from './control-client.js';
import type { ReadyResponse, StartupOptions } from './control-protocol.js';
import { type MtHotTransformLanes } from './soundtrace-mt-hot-transforms.js';
export interface MtWorkerLoadOptions {
    readonly coreBaseUrl: string;
    readonly pthreadPoolSize: number;
    readonly startup: StartupOptions;
}
export interface WorkerHostedControlState {
    readonly client: ControlClient;
    readonly hotTransforms: MtHotTransformLanes;
    readonly worker: Worker;
    readonly ready: ReadyResponse;
}
export declare function loadMtWorkerHostedControl(options: MtWorkerLoadOptions): Promise<WorkerHostedControlState>;
//# sourceMappingURL=soundtrace-mt-worker-load.d.ts.map