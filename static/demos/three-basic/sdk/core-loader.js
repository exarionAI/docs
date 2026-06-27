import { webPthreadPoolSize } from './facade.js';
const loaded = new Map();
const WASM_PAGE_BYTES = 64 * 1024;
const DEFAULT_IOS_SHARED_MEMORY_MAX_MB = 512;
function isIosWebKit() {
    if (typeof navigator === 'undefined')
        return false;
    const ua = navigator.userAgent;
    return /\b(iPhone|iPad|iPod)\b/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function parseMemoryMaxMb() {
    if (typeof location !== 'undefined') {
        const requested = new URLSearchParams(location.search).get('wasmMemoryMaxMb');
        if (requested) {
            const value = Number(requested);
            if (Number.isFinite(value) && value >= 64 && value <= 2048)
                return value;
        }
    }
    return isIosWebKit() ? DEFAULT_IOS_SHARED_MEMORY_MAX_MB : null;
}
function createSharedWasmMemory(maxMb) {
    const initialPages = 16 * 1024 * 1024 / WASM_PAGE_BYTES;
    const maximumPages = Math.floor((maxMb * 1024 * 1024) / WASM_PAGE_BYTES);
    try {
        return new WebAssembly.Memory({ initial: initialPages, maximum: maximumPages, shared: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`[soundtrace.js] shared wasm memory allocation failed max=${maxMb}MB: ${message}`);
    }
}
function shouldDropNativeLog(message) {
    return message.includes('[Exarion][Info] SetupPlaneUsage:');
}
function printNativeError(...args) {
    const message = args.map((arg) => String(arg)).join(' ');
    if (shouldDropNativeLog(message))
        return;
    console.error(...args);
}
function injectScript(url) {
    const cached = loaded.get(url);
    if (cached)
        return cached;
    const p = new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = url;
        el.async = true;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`[soundtrace.js] failed to load glue: ${url}`));
        document.head.appendChild(el);
    });
    loaded.set(url, p);
    return p;
}
export async function loadCore(thread, coreBaseUrl) {
    const baseUrl = coreBaseUrl.replace(/\/$/, '');
    const glueUrl = `${baseUrl}/${thread}/exaSound.js`;
    await injectScript(glueUrl);
    const factory = globalThis.ExaSoundModule;
    if (!factory) {
        throw new Error(`[soundtrace.js] ExaSoundModule not found on globalThis after loading ${glueUrl}`);
    }
    const memoryMaxMb = parseMemoryMaxMb();
    const moduleOptions = {
        locateFile: (path) => `${baseUrl}/${thread}/${path}`,
        printErr: printNativeError,
        // Tell Emscripten where the main script is so pthread workers can spawn
        // from the same URL. Relying on document.currentScript alone is fragile
        // and breaks init in some loading paths.
        mainScriptUrlOrBlob: glueUrl,
    };
    // mt only: size the pthread pool to the device, overriding the shipped glue
    // default that caps at 8. The glue reads Module["pthreadPoolSize"] when set.
    if (thread === 'mt') {
        moduleOptions.pthreadPoolSize = webPthreadPoolSize();
    }
    if (memoryMaxMb !== null) {
        moduleOptions.wasmMemory = createSharedWasmMemory(memoryMaxMb);
    }
    try {
        return await factory(moduleOptions);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`[soundtrace.js] core factory failed thread=${thread} memoryMax=${memoryMaxMb ?? 'emscripten-default'}MB: ${message}`);
    }
}
//# sourceMappingURL=core-loader.js.map