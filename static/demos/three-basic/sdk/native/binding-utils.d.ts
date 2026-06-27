import type { ExaSoundModule } from '../types.js';
export type CType = 'number' | 'string' | 'boolean' | null;
export type JsFn<R, A extends unknown[]> = (...args: A) => R;
export declare function cw<R, A extends unknown[]>(mod: ExaSoundModule, name: string, ret: CType, args: readonly CType[]): JsFn<R, A>;
export declare function hasExport(mod: ExaSoundModule, name: string): boolean;
export declare function optionalCw<R, A extends unknown[]>(mod: ExaSoundModule, name: string, ret: CType, args: CType[], fallback: JsFn<R, A>): JsFn<R, A>;
/** GPU enable (gated addon, Asyncify). exaEnableGpuPropagation suspends while
 *  the browser WebGPU device is acquired, so it must be called through
 *  ccall({async:true}) which returns a Promise -- a plain cwrap would not await
 *  the suspension. A CPU-only core lacks the export and reports false. Verified
 *  in a browser: asyncifyReturnedPromise=true, enabled=true (TASK-0005 S4). */
export declare function makeGpuEnable(mod: ExaSoundModule): () => Promise<boolean>;
export declare function missingAudioWorkletExport(name: string): never;
//# sourceMappingURL=binding-utils.d.ts.map