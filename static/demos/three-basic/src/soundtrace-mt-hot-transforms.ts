import {
  createListenerTransformHotLane,
  writeListenerTransformHotSlot,
  type ListenerTransformHotLane,
} from './control-hot-listener-transform.js';
import {
  createMeshTransformHotLane,
  writeMeshTransformHotSlot,
  type MeshTransformHotLane,
} from './control-hot-mesh-transform.js';
import {
  createSourceTransformHotLane,
  writeSourceTransformHotSlot,
  type SourceTransformHotLane,
} from './control-hot-source-transform.js';
import type {
  ListenerCache,
  ObjectCache,
  SourceCache,
} from './soundtrace-mt-facade-types.js';

const HOT_SOURCE_TRANSFORM_CAPACITY = 1024;
const HOT_MESH_TRANSFORM_CAPACITY = 1024;

export interface MtHotTransformLanes {
  readonly source: SourceTransformHotLane;
  readonly listener: ListenerTransformHotLane;
  readonly mesh: MeshTransformHotLane;
}

export class MtHotTransformSupportError extends Error {
  readonly code = 'COI_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'MtHotTransformSupportError';
  }
}

export function assertMtHotTransformSupport(): void {
  if (typeof SharedArrayBuffer === 'undefined') {
    throw new MtHotTransformSupportError(
      '[soundtrace.js] SharedArrayBuffer is required for thread=mt HOT transform lanes',
    );
  }

  const crossOriginIsolated = readOptionalBoolean(globalThis, 'crossOriginIsolated');
  if (crossOriginIsolated === false) {
    throw new MtHotTransformSupportError(
      '[soundtrace.js] crossOriginIsolated is required for thread=mt HOT transform lanes',
    );
  }
}

export function createMtHotTransformLanes(): MtHotTransformLanes {
  assertMtHotTransformSupport();
  return {
    source: createSourceTransformHotLane(HOT_SOURCE_TRANSFORM_CAPACITY),
    listener: createListenerTransformHotLane(),
    mesh: createMeshTransformHotLane(HOT_MESH_TRANSFORM_CAPACITY),
  };
}

export class SoundTraceMtHotTransformBridge {
  private readonly sourceSlots = new Map<number, number>();
  private readonly meshSlots = new Map<number, number>();

  constructor(private readonly lanes: MtHotTransformLanes) {}

  releaseSourceHandle(handle: number): void {
    this.sourceSlots.delete(handle);
  }

  releaseMeshHandle(handle: number): void {
    this.meshSlots.delete(handle);
  }

  reset(): void {
    this.sourceSlots.clear();
    this.meshSlots.clear();
  }

  stageSourceTransform(handle: number, cache: SourceCache): void {
    const slot = this.resolveSlot(
      this.sourceSlots,
      handle,
      this.lanes.source.capacity,
      'source transform',
    );
    writeSourceTransformHotSlot(this.lanes.source, slot, {
      handle,
      position: toVec3Tuple(cache.position),
      direction: toVec3Tuple(cache.direction),
      velocity: toVec3Tuple(cache.velocity),
      intensity: cache.intensity,
    });
  }

  stageListenerTransform(cache: ListenerCache): void {
    writeListenerTransformHotSlot(this.lanes.listener, {
      position: toVec3Tuple(cache.position),
      orientation: cache.orientation,
    });
  }

  stageMeshTransform(handle: number, cache: ObjectCache): void {
    const slot = this.resolveSlot(
      this.meshSlots,
      handle,
      this.lanes.mesh.capacity,
      'mesh transform',
    );
    writeMeshTransformHotSlot(this.lanes.mesh, slot, {
      handle,
      position: toVec3Tuple(cache.position),
      orientation: cache.orientation,
      scale: toVec3Tuple(cache.scale),
    });
  }

  private resolveSlot(
    slots: Map<number, number>,
    handle: number,
    capacity: number,
    label: string,
  ): number {
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

function hasAssignedSlot(slots: Map<number, number>, slot: number): boolean {
  for (const assigned of slots.values()) {
    if (assigned === slot) {
      return true;
    }
  }
  return false;
}

function toVec3Tuple(value: { readonly x: number; readonly y: number; readonly z: number }): readonly [number, number, number] {
  return [value.x, value.y, value.z];
}

function readOptionalBoolean(target: object, key: string): boolean | undefined {
  const value = Reflect.get(target, key);
  return typeof value === 'boolean' ? value : undefined;
}
