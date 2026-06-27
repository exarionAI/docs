export const MESH_TRANSFORM_FLOAT_COUNT = 10;
function ensureValidCapacity(capacity) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new RangeError('[soundtrace.js] capacity must be a positive integer');
    }
}
function ensureValidSlot(capacity, slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) {
        throw new RangeError('[soundtrace.js] slot must be an integer within [0, capacity)');
    }
}
function ensureSharedArrayBuffer() {
    if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('[soundtrace.js] SharedArrayBuffer is required for HOT mesh transform lane');
    }
}
function ensureNumberTuple(value, label, expectedLength) {
    if (!Array.isArray(value) || value.length !== expectedLength) {
        throw new TypeError(`[soundtrace.js] ${label} must be a ${expectedLength}-element number array`);
    }
    for (const entry of value) {
        if (typeof entry !== 'number' || !Number.isFinite(entry)) {
            throw new TypeError(`[soundtrace.js] ${label} must contain finite numbers only`);
        }
    }
}
function ensurePayload(payload) {
    if (!Number.isInteger(payload.handle) || payload.handle < 0) {
        throw new TypeError('[soundtrace.js] handle must be a non-negative integer');
    }
    ensureNumberTuple(payload.position, 'position', 3);
    ensureNumberTuple(payload.orientation, 'orientation', 4);
    ensureNumberTuple(payload.scale, 'scale', 3);
}
function toSlotOffset(slot) {
    return slot * MESH_TRANSFORM_FLOAT_COUNT;
}
export function createMeshTransformHotLane(capacity) {
    ensureValidCapacity(capacity);
    ensureSharedArrayBuffer();
    const versionBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * capacity);
    const handleBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * capacity);
    const transformBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * capacity * MESH_TRANSFORM_FLOAT_COUNT);
    return {
        capacity,
        versionBuffer,
        handleBuffer,
        transformBuffer,
        versions: new Int32Array(versionBuffer),
        handles: new Int32Array(handleBuffer),
        transforms: new Float32Array(transformBuffer),
    };
}
export function createMeshTransformReadCursor(capacity) {
    ensureValidCapacity(capacity);
    return {
        seen: new Int32Array(capacity),
    };
}
export function writeMeshTransformHotSlot(lane, slot, payload) {
    ensureValidSlot(lane.capacity, slot);
    ensurePayload(payload);
    const inFlightSeq = Atomics.load(lane.versions, slot);
    if ((inFlightSeq & 1) !== 0) {
        throw new Error(`[soundtrace.js] slot ${slot} is currently being written`);
    }
    const expectedEven = Atomics.load(lane.versions, slot);
    if ((expectedEven & 1) !== 0) {
        throw new Error(`[soundtrace.js] slot ${slot} write lock failed`);
    }
    Atomics.store(lane.versions, slot, expectedEven + 1);
    if (Atomics.load(lane.versions, slot) !== expectedEven + 1) {
        throw new Error(`[soundtrace.js] slot ${slot} write lock lost`);
    }
    lane.handles[slot] = payload.handle;
    const offset = toSlotOffset(slot);
    lane.transforms[offset + 0] = payload.position[0];
    lane.transforms[offset + 1] = payload.position[1];
    lane.transforms[offset + 2] = payload.position[2];
    lane.transforms[offset + 3] = payload.orientation[0];
    lane.transforms[offset + 4] = payload.orientation[1];
    lane.transforms[offset + 5] = payload.orientation[2];
    lane.transforms[offset + 6] = payload.orientation[3];
    lane.transforms[offset + 7] = payload.scale[0];
    lane.transforms[offset + 8] = payload.scale[1];
    lane.transforms[offset + 9] = payload.scale[2];
    Atomics.store(lane.versions, slot, expectedEven + 2);
}
export function readChangedMeshTransforms(lane, cursor) {
    if (cursor.seen.length !== lane.capacity) {
        throw new RangeError('[soundtrace.js] read cursor capacity does not match lane capacity');
    }
    const changed = [];
    for (let slot = 0; slot < lane.capacity; slot += 1) {
        const before = Atomics.load(lane.versions, slot);
        if (before <= cursor.seen[slot] || (before & 1) !== 0) {
            continue;
        }
        const offset = toSlotOffset(slot);
        const payload = {
            handle: lane.handles[slot],
            position: [
                lane.transforms[offset + 0],
                lane.transforms[offset + 1],
                lane.transforms[offset + 2],
            ],
            orientation: [
                lane.transforms[offset + 3],
                lane.transforms[offset + 4],
                lane.transforms[offset + 5],
                lane.transforms[offset + 6],
            ],
            scale: [
                lane.transforms[offset + 7],
                lane.transforms[offset + 8],
                lane.transforms[offset + 9],
            ],
        };
        const after = Atomics.load(lane.versions, slot);
        if (before !== after || (after & 1) !== 0 || after <= cursor.seen[slot]) {
            continue;
        }
        cursor.seen[slot] = after;
        changed.push({
            ...payload,
            slot,
        });
    }
    return changed;
}
//# sourceMappingURL=control-hot-mesh-transform.js.map