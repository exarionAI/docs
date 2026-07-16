export const HRTF_ASSET_FILES = {
    parametric: 'KU100_bprime.bin',
    convolution: 'KU100_convolution.bin',
    steamaudio: 'sadie_h12_steamaudio.bin',
};
export const FACADE_SOURCE_RAY_WIDTH = 16;
export const FACADE_SOURCE_RAY_HEIGHT = 16;
export const FACADE_SOURCE_RAY_DEPTH = 6;
export const FACADE_DISTANCE_ATTENUATION = { x: 1, y: 0, z: 1 };
export const FACADE_STATISTICS_RAY_DATA_LIMIT = 64;
export const FACADE_STATISTICS_PATHS = [
    'direct',
    'reflection',
    'reverberation',
    'diffraction',
];
export class SoundTraceMtUnsupportedError extends Error {
    code = 'UNSUPPORTED_MT_NATIVE';
    constructor(message, options = {}) {
        super(message);
        this.name = 'SoundTraceMtUnsupportedError';
        if (options.cause !== undefined)
            this.cause = options.cause;
    }
}
export function normalizeCaughtError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
export async function fetchJson(url, label) {
    let response;
    try {
        response = await fetch(url);
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`[soundtrace.js] failed to fetch ${label} ${url}: ${reason}`, { cause: error });
    }
    if (!response.ok)
        throw new Error(`[soundtrace.js] failed to fetch ${label} ${url}: HTTP ${response.status}`);
    return response.json();
}
export function normalizeOptionalLimit(value, label) {
    if (value === undefined)
        return undefined;
    if (!Number.isInteger(value) || value < 0)
        throw new Error(`[soundtrace.js] ${label} must be an integer >= 0 (got ${value})`);
    return value;
}
export function normalizeLimit(value, fallback, label) {
    const resolved = value ?? fallback;
    if (!Number.isInteger(resolved) || resolved < 0)
        throw new Error(`[soundtrace.js] ${label} must be an integer >= 0 (got ${resolved})`);
    return resolved;
}
export function assertNeverHrtfMode(value) {
    throw new Error(`[soundtrace.js] Unsupported HRTF mode ${String(value)}; use parametric, convolution, or steamaudio`);
}
export function resolveHrtfLoadMode(mode) {
    switch (mode) {
        case 'parametric':
        case 'convolution':
        case 'steamaudio':
            return mode;
        default:
            assertNeverHrtfMode(mode);
    }
}
//# sourceMappingURL=SoundTrace-types.js.map