import { getCaughtMessage, normalizeCaughtUnknown, } from './control-worker-error-utils.js';
export function createDefaultPostResponse() {
    return (response) => {
        if (typeof postMessage === 'function') {
            postMessage(response);
        }
    };
}
export const defaultLoadScript = async (url) => {
    if (typeof importScripts !== 'function') {
        throw new Error('[soundtrace.js] worker bootstrap requires importScripts');
    }
    try {
        importScripts(url);
    }
    catch (error) {
        throw new Error(`[soundtrace.js] failed to load worker glue: ${url}: ${getCaughtMessage(normalizeCaughtUnknown(error))}`);
    }
};
export const defaultCreateModule = async (glueUrl, moduleArg) => {
    const factory = globalThis.ExaSoundModule;
    if (!factory) {
        throw new Error(`[soundtrace.js] ExaSoundModule missing after loading ${glueUrl}`);
    }
    return factory(moduleArg);
};
export const defaultFrameScheduler = (work) => {
    setTimeout(work, 0);
};
//# sourceMappingURL=control-worker-defaults.js.map