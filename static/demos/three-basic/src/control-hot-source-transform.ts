export const SOURCE_TRANSFORM_FLOAT_COUNT = 10;

export type SourceTransformFloatTuple = readonly [number, number, number];

export interface SourceTransformPayload {
  readonly handle: number;
  readonly position: SourceTransformFloatTuple;
  readonly direction: SourceTransformFloatTuple;
  readonly velocity: SourceTransformFloatTuple;
  readonly intensity: number;
}

export interface SourceTransformHotLane {
  readonly capacity: number;
  readonly versionBuffer: SharedArrayBuffer;
  readonly handleBuffer: SharedArrayBuffer;
  readonly transformBuffer: SharedArrayBuffer;
  readonly versions: Int32Array;
  readonly handles: Int32Array;
  readonly transforms: Float32Array;
}

export interface SourceTransformReadCursor {
  readonly seen: Int32Array;
}

export interface SourceTransformReadEntry extends SourceTransformPayload {
  readonly slot: number;
}

function ensureValidCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new RangeError('[soundtrace.js] capacity must be a positive integer');
  }
}

function ensureValidSlot(capacity: number, slot: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) {
    throw new RangeError('[soundtrace.js] slot must be an integer within [0, capacity)');
  }
}

function ensureSharedArrayBuffer(): void {
  if (typeof SharedArrayBuffer === 'undefined') {
    throw new Error('[soundtrace.js] SharedArrayBuffer is required for HOT source transform lane');
  }
}

function ensureFloatTuple(value: unknown, label: string): asserts value is SourceTransformFloatTuple {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`[soundtrace.js] ${label} must be a 3-element number array`);
  }

  for (const point of value) {
    if (typeof point !== 'number' || !Number.isFinite(point)) {
      throw new TypeError(`[soundtrace.js] ${label} must contain finite numbers only`);
    }
  }
}

function ensurePayload(payload: SourceTransformPayload): void {
  if (!Number.isInteger(payload.handle) || payload.handle < 0) {
    throw new TypeError('[soundtrace.js] handle must be a non-negative integer');
  }

  ensureFloatTuple(payload.position, 'position');
  ensureFloatTuple(payload.direction, 'direction');
  ensureFloatTuple(payload.velocity, 'velocity');

  if (typeof payload.intensity !== 'number' || !Number.isFinite(payload.intensity)) {
    throw new TypeError('[soundtrace.js] intensity must be a finite number');
  }
}

function toSlotOffset(slot: number): number {
  return slot * SOURCE_TRANSFORM_FLOAT_COUNT;
}

export function createSourceTransformHotLane(capacity: number): SourceTransformHotLane {
  ensureValidCapacity(capacity);
  ensureSharedArrayBuffer();

  const versionBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * capacity);
  const handleBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * capacity);
  const transformBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * capacity * SOURCE_TRANSFORM_FLOAT_COUNT);

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

export function createSourceTransformReadCursor(capacity: number): SourceTransformReadCursor {
  ensureValidCapacity(capacity);
  return {
    seen: new Int32Array(capacity),
  };
}

export function writeSourceTransformHotSlot(
  lane: SourceTransformHotLane,
  slot: number,
  payload: SourceTransformPayload,
): void {
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
  const { position, direction, velocity } = payload;
  lane.transforms[offset + 0] = position[0];
  lane.transforms[offset + 1] = position[1];
  lane.transforms[offset + 2] = position[2];
  lane.transforms[offset + 3] = direction[0];
  lane.transforms[offset + 4] = direction[1];
  lane.transforms[offset + 5] = direction[2];
  lane.transforms[offset + 6] = velocity[0];
  lane.transforms[offset + 7] = velocity[1];
  lane.transforms[offset + 8] = velocity[2];
  lane.transforms[offset + 9] = payload.intensity;

  Atomics.store(lane.versions, slot, expectedEven + 2);
}

export function readChangedSourceTransforms(
  lane: SourceTransformHotLane,
  cursor: SourceTransformReadCursor,
): SourceTransformReadEntry[] {
  if (cursor.seen.length !== lane.capacity) {
    throw new RangeError('[soundtrace.js] read cursor capacity does not match lane capacity');
  }

  const changed: SourceTransformReadEntry[] = [];

  for (let slot = 0; slot < lane.capacity; slot += 1) {
    const before = Atomics.load(lane.versions, slot);
    if (before <= cursor.seen[slot]) {
      continue;
    }
    if ((before & 1) !== 0) {
      continue;
    }

    const offset = toSlotOffset(slot);
    const payload: SourceTransformPayload = {
      handle: lane.handles[slot],
      position: [
        lane.transforms[offset + 0],
        lane.transforms[offset + 1],
        lane.transforms[offset + 2],
      ],
      direction: [
        lane.transforms[offset + 3],
        lane.transforms[offset + 4],
        lane.transforms[offset + 5],
      ],
      velocity: [
        lane.transforms[offset + 6],
        lane.transforms[offset + 7],
        lane.transforms[offset + 8],
      ],
      intensity: lane.transforms[offset + 9],
    };

    const after = Atomics.load(lane.versions, slot);
    if (before !== after || (after & 1) !== 0) {
      continue;
    }

    if (after <= cursor.seen[slot]) {
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
