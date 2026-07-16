import { createListenerTransformHotLane, writeListenerTransformHotSlot, } from '../control/control-hot-listener-transform.js';
import { createMeshTransformHotLane, writeMeshTransformHotSlot, } from '../control/control-hot-mesh-transform.js';
import { createSourceTransformHotLane, writeSourceTransformHotSlot, } from '../control/control-hot-source-transform.js';
const HOT_SOURCE_TRANSFORM_CAPACITY = 1024;
const HOT_MESH_TRANSFORM_CAPACITY = 1024;
export class MtHotTransformSupportError extends Error {
    code = 'COI_REQUIRED';
    constructor(message) {
        super(message);
        this.name = 'MtHotTransformSupportError';
    }
}
export function assertMtHotTransformSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        throw new MtHotTransformSupportError('[soundtrace.js] SharedArrayBuffer is required for thread=mt HOT transform lanes');
    }
    const crossOriginIsolated = readOptionalBoolean(globalThis, 'crossOriginIsolated');
    if (crossOriginIsolated === false) {
        throw new MtHotTransformSupportError('[soundtrace.js] crossOriginIsolated is required for thread=mt HOT transform lanes');
    }
}
export function createMtHotTransformLanes() {
    assertMtHotTransformSupport();
    return {
        source: createSourceTransformHotLane(HOT_SOURCE_TRANSFORM_CAPACITY),
        listener: createListenerTransformHotLane(),
        mesh: createMeshTransformHotLane(HOT_MESH_TRANSFORM_CAPACITY),
    };
}
export class SoundTraceMtHotTransformBridge {
    lanes;
    sourceSlots = new Map();
    meshSlots = new Map();
    constructor(lanes) {
        this.lanes = lanes;
    }
    releaseSourceHandle(handle) {
        this.sourceSlots.delete(handle);
    }
    releaseMeshHandle(handle) {
        this.meshSlots.delete(handle);
    }
    reset() {
        this.sourceSlots.clear();
        this.meshSlots.clear();
    }
    stageSourceTransform(handle, cache) {
        const slot = this.resolveSlot(this.sourceSlots, handle, this.lanes.source.capacity, 'source transform');
        writeSourceTransformHotSlot(this.lanes.source, slot, {
            handle,
            position: toVec3Tuple(cache.position),
            direction: toVec3Tuple(cache.direction),
            velocity: toVec3Tuple(cache.velocity),
            intensity: cache.intensity,
        });
    }
    stageListenerTransform(cache) {
        writeListenerTransformHotSlot(this.lanes.listener, {
            position: toVec3Tuple(cache.position),
            orientation: cache.orientation,
        });
    }
    stageMeshTransform(handle, cache) {
        const slot = this.resolveSlot(this.meshSlots, handle, this.lanes.mesh.capacity, 'mesh transform');
        writeMeshTransformHotSlot(this.lanes.mesh, slot, {
            handle,
            position: toVec3Tuple(cache.position),
            orientation: cache.orientation,
            scale: toVec3Tuple(cache.scale),
        });
    }
    resolveSlot(slots, handle, capacity, label) {
        const current = slots.get(handle);
        if (current !== undefined) {
            return current;
        }
        for (let slot = 0; slot < capacity; slot += 1) {
            if (!hasAssignedSlot(slots, slot)) {
                slots.set(handle, slot);
                return slot;
            }
        }
        throw new RangeError(`[soundtrace.js] ${label} lane capacity exceeded (${capacity})`);
    }
}
function hasAssignedSlot(slots, slot) {
    for (const assigned of slots.values()) {
        if (assigned === slot) {
            return true;
        }
    }
    return false;
}
function toVec3Tuple(value) {
    return [value.x, value.y, value.z];
}
function readOptionalBoolean(target, key) {
    const value = Reflect.get(target, key);
    return typeof value === 'boolean' ? value : undefined;
}
//# sourceMappingURL=soundtrace-mt-hot-transforms.js.map