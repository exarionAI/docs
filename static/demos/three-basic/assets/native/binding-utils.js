export function cw(mod, name, ret, args) {
    if (typeof mod.cwrap !== 'function') {
        throw new Error('[soundtrace.js] Module.cwrap not available on ExaSound module');
    }
    return mod.cwrap(name, ret, args);
}
export function hasExport(mod, name) {
    const exports = mod;
    return typeof exports[`_${name}`] === 'function';
}
export function optionalCw(mod, name, ret, args, fallback) {
    return hasExport(mod, name) ? cw(mod, name, ret, args) : fallback;
}
/** GPU enable (gated addon, Asyncify). exaEnableGpuPropagation suspends while
 *  the browser WebGPU device is acquired, so it must be called through
 *  ccall({async:true}) which returns a Promise -- a plain cwrap would not await
 *  the suspension. A CPU-only core lacks the export and reports false. Verified
 *  in a browser: asyncifyReturnedPromise=true, enabled=true (TASK-0005 S4). */
export function makeGpuEnable(mod) {
    if (!hasExport(mod, 'exaEnableGpuPropagation') || typeof mod.ccall !== 'function') {
        return () => Promise.resolve(false);
    }
    const ccall = mod.ccall;
    // .then(Boolean) produces the boolean at runtime (ccall is typed `unknown`),
    // so no unchecked `as Promise<boolean>` cast is needed. The Promise.resolve
    // wrapper is load-bearing: it normalizes both Asyncify shapes (a real thenable
    // on the suspend path, a resolved value on the sync-completion path).
    return () => Promise.resolve(ccall('exaEnableGpuPropagation', 'boolean', [], [], { async: true })).then(Boolean);
}
export function missingAudioWorkletExport(name) {
    throw new Error(`[soundtrace.js] native AudioWorklet export ${name} is not available in this core build`);
}
//# sourceMappingURL=binding-utils.js.map