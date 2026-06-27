export const LISTENER_TRANSFORM_FLOAT_COUNT = 7;
function ensureSharedArrayBuffer() {
    if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('[soundtrace.js] SharedArrayBuffer is required for HOT listener transform lane');
    }
}
function ensureNumberTuple(value, label, expectedLength) {
    if (!Array.isArray(value) || value.length !== expectedLength) {
        throw new TypeError(`[soundtrace.js] ${label} must be a ${expectedLength}-element number array`);
    }
    const tuple = [];
    for (const entry of value) {
        if (typeof entry !== 'number' || !Number.isFinite(entry)) {
            throw new TypeError(`[soundtrace.js] ${label} must contain finite numbers only`);
        }
        tuple.push(entry);
    }
    return tuple;
}
function ensurePayload(payload) {
    ensureNumberTuple(payload.position, 'position', 3);
    ensureNumberTuple(payload.orientation, 'orientation', 4);
}
export function createListenerTransformHotLane() {
    ensureSharedArrayBuffer();
    const versionBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    const transformBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * LISTENER_TRANSFORM_FLOAT_COUNT);
    return {
        versionBuffer,
        transformBuffer,
        versions: new Int32Array(versionBuffer),
        transforms: new Float32Array(transformBuffer),
    };
}
export function createListenerTransformReadCursor() {
    return { seen: 0 };
}
export function writeListenerTransformHotSlot(lane, payload) {
    ensurePayload(payload);
    const inFlightSeq = Atomics.load(lane.versions, 0);
    if ((inFlightSeq & 1) !== 0) {
        throw new Error('[soundtrace.js] listener transform slot is currently being written');
    }
    const expectedEven = Atomics.load(lane.versions, 0);
    if ((expectedEven & 1) !== 0) {
        throw new Error('[soundtrace.js] listener transform slot write lock failed');
    }
    Atomics.store(lane.versions, 0, expectedEven + 1);
    if (Atomics.load(lane.versions, 0) !== expectedEven + 1) {
        throw new Error('[soundtrace.js] listener transform slot write lock lost');
    }
    lane.transforms[0] = payload.position[0];
    lane.transforms[1] = payload.position[1];
    lane.transforms[2] = payload.position[2];
    lane.transforms[3] = payload.orientation[0];
    lane.transforms[4] = payload.orientation[1];
    lane.transforms[5] = payload.orientation[2];
    lane.transforms[6] = payload.orientation[3];
    Atomics.store(lane.versions, 0, expectedEven + 2);
}
export function readChangedListenerTransform(lane, cursor = createListenerTransformReadCursor()) {
    const before = Atomics.load(lane.versions, 0);
    if (before <= cursor.seen || (before & 1) !== 0) {
        return null;
    }
    const payload = {
        position: [
            lane.transforms[0],
            lane.transforms[1],
            lane.transforms[2],
        ],
        orientation: [
            lane.transforms[3],
            lane.transforms[4],
            lane.transforms[5],
            lane.transforms[6],
        ],
    };
    const after = Atomics.load(lane.versions, 0);
    if (before !== after || (after & 1) !== 0 || after <= cursor.seen) {
        return null;
    }
    cursor.seen = after;
    return payload;
}
//# sourceMappingURL=control-hot-listener-transform.js.map