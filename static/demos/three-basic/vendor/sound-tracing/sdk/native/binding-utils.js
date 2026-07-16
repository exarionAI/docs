export function cw(mod, name, ret, args) {
    if (typeof mod.cwrap !== 'function') {
        throw new Error('[soundtrace.js] Module.cwrap not available on ExaSound module');
    }
    const fn = mod.cwrap(name, ret, args);
    if (ret !== 'boolean')
        return fn;
    // emscripten's cwrap skips return conversion on its all-numeric fast path,
    // so a declared 'boolean' comes back as the raw ExaBool int (finding #15).
    // Coerce here — version-independent, and a real boolean passes unchanged.
    return ((...a) => !!fn(...a));
}
export function hasExport(mod, name) {
    const exports = mod;
    return typeof exports[`_${name}`] === 'function';
}
export function optionalCw(mod, name, ret, args, fallback) {
    return hasExport(mod, name) ? cw(mod, name, ret, args) : fallback;
}
/** GPU enable (gated addon, Asyncify). exaPropagatorInitGpu (v0.7 rename of
 *  the old GPU-enable entry point) suspends while the browser WebGPU device is
 *  acquired, so it must be called through ccall({async:true}) which returns a
 *  Promise -- a plain cwrap would not await the suspension. A CPU-only core
 *  lacks the export and reports false. Verified in a browser:
 *  asyncifyReturnedPromise=true, enabled=true (TASK-0005 S4).
 *
 *  v0.7 return contract (ExaResult — NOT the legacy truthy ExaBool):
 *  EXA_OK (0) = GPU device acquired; EXA_ERR_UNSUPPORTED (-8) = no device
 *  (every propagation call falls back to CPU — safe). The resolved boolean is
 *  `result === EXA_OK`, i.e. the truthiness FLIP is applied right here. */
export function makeGpuEnable(mod) {
    if (!hasExport(mod, 'exaPropagatorInitGpu') || typeof mod.ccall !== 'function') {
        return () => Promise.resolve(false);
    }
    const ccall = mod.ccall;
    // The Promise.resolve wrapper is load-bearing: it normalizes both Asyncify
    // shapes (a real thenable on the suspend path, a resolved value on the
    // sync-completion path).
    return () => Promise.resolve(ccall('exaPropagatorInitGpu', 'number', [], [], { async: true })).then((result) => Number(result) === 0 /* EXA_OK */);
}
export function missingAudioWorkletExport(name) {
    throw new Error(`[soundtrace.js] native AudioWorklet export ${name} is not available in this core build`);
}
//# sourceMappingURL=binding-utils.js.map