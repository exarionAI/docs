import type { CreateModule, LoadScript, PostMessage, ScheduleFrameWork } from './control-worker-host-types.js';
import type { ExaSoundFactory } from './types.js';
declare global {
    var ExaSoundModule: ExaSoundFactory | undefined;
}
export declare function createDefaultPostResponse(): PostMessage;
export declare const defaultLoadScript: LoadScript;
export declare const defaultCreateModule: CreateModule;
export declare const defaultFrameScheduler: ScheduleFrameWork;
//# sourceMappingURL=control-worker-defaults.d.ts.map