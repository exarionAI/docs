export function resolveThread(opt = 'auto') {
    if (opt === 'st' || opt === 'mt')
        return opt;
    const iso = typeof globalThis !== 'undefined'
        && globalThis.crossOriginIsolated === true;
    return iso ? 'mt' : 'st';
}
/** Resolve `mode` (preferred) and/or `thread` (advanced) into the concrete build
 *  variant + whether to auto-enable GPU. `mode` wins when set; gpu mode still
 *  honours an explicit `thread`, else picks the isolation-aware default. */
export function resolveMode(mode, thread) {
    switch (mode) {
        case undefined: return { thread: resolveThread(thread), gpu: false };
        case 'single_thread': return { thread: 'st', gpu: false };
        case 'multi_thread': return { thread: 'mt', gpu: false };
        case 'gpu': return { thread: resolveThread(thread ?? 'auto'), gpu: true };
        default: throw new Error(`[soundtrace.js] unknown mode: ${mode}`);
    }
}
/** Pthread pool size the mt build uses. We override the shipped glue default
 *  (which caps at 8) via `Module["pthreadPoolSize"]` in core-loader, removing
 *  the cap: one worker per logical core, minus one reserved for the main thread.
 *  In practice bounded by what the browser reports for hardwareConcurrency.
 *  core-loader sets the SAME value — keep them in sync. */
export function webPthreadPoolSize() {
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    return Math.max(1, cores - 1);
}
/** Resolve a throughput tier to a `propagationThreadCount`:
 *  - 'max'    → -1 (engine auto; uses the whole pool)
 *  - 'medium' → half the pool size
 *  - 'low'    → a quarter of the pool size
 *  Medium/low are taken against the actual (device-adaptive) pool and clamp ≥1. */
export function resolveThroughput(tier) {
    if (tier === 'max')
        return -1;
    const pool = webPthreadPoolSize();
    const div = tier === 'medium' ? 2 : 4;
    return Math.max(1, Math.floor(pool / div));
}
//# sourceMappingURL=facade-execution.js.map