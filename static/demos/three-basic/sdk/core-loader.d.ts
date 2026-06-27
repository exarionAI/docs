import type { ExaSoundFactory, ExaSoundModule, ThreadMode } from './types.js';
declare global {
    var ExaSoundModule: ExaSoundFactory | undefined;
}
export declare function loadCore(thread: ThreadMode, coreBaseUrl: string): Promise<ExaSoundModule>;
//# sourceMappingURL=core-loader.d.ts.map