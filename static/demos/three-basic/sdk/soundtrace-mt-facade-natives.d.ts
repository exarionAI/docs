import type { ListenerNativeLike, SourceNativeLike } from './facade.js';
import type { ListenerCache, MtCommandScheduler, SourceCache } from './soundtrace-mt-facade-types.js';
export declare function createMtSourceNative(options: {
    readonly handle: number;
    readonly scheduler: MtCommandScheduler;
    readonly cache: SourceCache;
}): SourceNativeLike;
export declare function createMtListenerNative(options: {
    readonly cache: ListenerCache;
    readonly scheduler: MtCommandScheduler;
}): ListenerNativeLike;
//# sourceMappingURL=soundtrace-mt-facade-natives.d.ts.map