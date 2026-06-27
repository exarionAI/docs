/** 'auto' → 'mt' only in a cross-origin-isolated context (SharedArrayBuffer is
 *  available); otherwise 'st'. Removes the COOP/COEP footgun for callers. */
export type ThreadOption = 'auto' | 'st' | 'mt';
export declare function resolveThread(opt?: ThreadOption): 'st' | 'mt';
/** High-level execution mode chosen at create():
 *  - 'single_thread' → st CPU build
 *  - 'multi_thread'  → mt CPU build (needs cross-origin isolation)
 *  - 'gpu'           → WebGPU offload, auto-enabled during load (graceful CPU
 *                      fallback if unavailable); pairs with the isolation-aware
 *                      thread build (or an explicit `thread`). */
export type ExecutionMode = 'single_thread' | 'multi_thread' | 'gpu';
export interface ResolvedMode {
    thread: 'st' | 'mt';
    gpu: boolean;
}
/** Resolve `mode` (preferred) and/or `thread` (advanced) into the concrete build
 *  variant + whether to auto-enable GPU. `mode` wins when set; gpu mode still
 *  honours an explicit `thread`, else picks the isolation-aware default. */
export declare function resolveMode(mode: ExecutionMode | undefined, thread?: ThreadOption): ResolvedMode;
/** Propagation worker-thread budget tier. Only meaningful for the `mt` build. */
export type Throughput = 'low' | 'medium' | 'max';
/** Pthread pool size the mt build uses. We override the shipped glue default
 *  (which caps at 8) via `Module["pthreadPoolSize"]` in core-loader, removing
 *  the cap: one worker per logical core, minus one reserved for the main thread.
 *  In practice bounded by what the browser reports for hardwareConcurrency.
 *  core-loader sets the SAME value — keep them in sync. */
export declare function webPthreadPoolSize(): number;
/** Resolve a throughput tier to a `propagationThreadCount`:
 *  - 'max'    → -1 (engine auto; uses the whole pool)
 *  - 'medium' → half the pool size
 *  - 'low'    → a quarter of the pool size
 *  Medium/low are taken against the actual (device-adaptive) pool and clamp ≥1. */
export declare function resolveThroughput(tier: Throughput): number;
//# sourceMappingURL=facade-execution.d.ts.map