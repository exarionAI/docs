export function requireMeshId(meshIdsByObjectId, objectId) {
    const meshId = meshIdsByObjectId.get(objectId);
    if (meshId === undefined) {
        throw new Error(`[soundtrace.js] no mesh runtime mapping for object ${objectId}`);
    }
    return meshId;
}
export function requireNumber(value, label) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(`[soundtrace.js] ${label} must be a finite number`);
    }
    return value;
}
export function requireInteger(value, label) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new Error(`[soundtrace.js] ${label} must be an integer`);
    }
    return value;
}
export function requireBoolean(value, label) {
    if (typeof value !== 'boolean') {
        throw new Error(`[soundtrace.js] ${label} must be a boolean`);
    }
    return value;
}
export function readVec3Tuple(value, label) {
    const tuple = readTuple(value, label, 3);
    return [tuple[0], tuple[1], tuple[2]];
}
export function readQuatTuple(value, label) {
    const tuple = readTuple(value, label, 4);
    return [tuple[0], tuple[1], tuple[2], tuple[3]];
}
export function readIntegerPair(value, label) {
    if (!Array.isArray(value) || value.length !== 2) {
        throw new Error(`[soundtrace.js] ${label} must be an array of length 2`);
    }
    return [requireInteger(value[0], `${label}[0]`), requireInteger(value[1], `${label}[1]`)];
}
export function isRecord(value) {
    return value !== null && typeof value === 'object';
}
function readTuple(value, label, length) {
    if (!Array.isArray(value) || value.length !== length) {
        throw new Error(`[soundtrace.js] ${label} must be an array of length ${length}`);
    }
    return value.map((entry) => requireNumber(entry, label));
}
//# sourceMappingURL=control-worker-runtime-command-shared.js.map