export function workerHostedMtSupport() {
    const crossOriginIsolated = globalThis.crossOriginIsolated === true;
    const sharedArrayBuffer = typeof SharedArrayBuffer === 'function';
    const missing = [];
    if (!crossOriginIsolated)
        missing.push('crossOriginIsolated');
    if (!sharedArrayBuffer)
        missing.push('SharedArrayBuffer');
    return {
        supported: crossOriginIsolated && sharedArrayBuffer,
        crossOriginIsolated,
        sharedArrayBuffer,
        missing,
    };
}
export * from './facade-native-types.js';
export * from './facade-options.js';
export * from './facade-execution.js';
export * from './facade-coordinate.js';
export * from './facade-entities.js';
//# sourceMappingURL=facade.js.map