import type { Triangle } from './native-public.js';

export type Vec3In = readonly [number, number, number] | { x: number; y: number; z: number };
export type QuatIn =
  | [number, number, number, number]
  | { x: number; y: number; z: number; w: number };
export type Vec3Tuple = readonly [number, number, number];
export interface CoordinateTransform {
  readonly right: Vec3Tuple;
  readonly up: Vec3Tuple;
  readonly forward: Vec3Tuple;
}
export type CoordinateBasisOption = Partial<{
  readonly right: Vec3In;
  readonly up: Vec3In;
  readonly forward: Vec3In;
}>;

export const CORE_COORDINATE_TRANSFORM: CoordinateTransform = {
  right: [1, 0, 0],
  up: [0, 1, 0],
  forward: [0, 0, 1],
};

function isVec3Tuple(value: Vec3In): value is readonly [number, number, number] {
  return Array.isArray(value);
}

export function toVec3(v: Vec3In): [number, number, number] {
  if (isVec3Tuple(v)) return [v[0], v[1], v[2]];
  return [v.x, v.y, v.z];
}
export function toQuat(q: QuatIn): [number, number, number, number] {
  return Array.isArray(q) ? [q[0], q[1], q[2], q[3]] : [q.x, q.y, q.z, q.w];
}

function dot(a: Vec3Tuple, b: Vec3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function length(v: Vec3Tuple): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalizeBasisVector(value: Vec3In, label: string): Vec3Tuple {
  const vector = toVec3(value);
  const len = length(vector);
  if (len === 0) {
    throw new Error(`[soundtrace.js] coordinateBasis.${label} must be non-zero`);
  }
  return [vector[0] / len, vector[1] / len, vector[2] / len];
}

function assertOrthonormalBasis(transform: CoordinateTransform): void {
  const rightUp = Math.abs(dot(transform.right, transform.up));
  const upForward = Math.abs(dot(transform.up, transform.forward));
  const forwardRight = Math.abs(dot(transform.forward, transform.right));
  if (rightUp > 1e-4 || upForward > 1e-4 || forwardRight > 1e-4) {
    throw new Error('[soundtrace.js] coordinateBasis vectors must be orthogonal');
  }

  const handedness = dot(cross(transform.right, transform.up), transform.forward);
  if (Math.abs(handedness - 1) > 1e-4) {
    throw new Error('[soundtrace.js] coordinateBasis must be right-handed');
  }
}

export function resolveCoordinateTransform(
  option: CoordinateBasisOption = {},
): CoordinateTransform {
  const transform = {
    right: normalizeBasisVector(option.right ?? CORE_COORDINATE_TRANSFORM.right, 'right'),
    up: normalizeBasisVector(option.up ?? CORE_COORDINATE_TRANSFORM.up, 'up'),
    forward: normalizeBasisVector(option.forward ?? CORE_COORDINATE_TRANSFORM.forward, 'forward'),
  };
  assertOrthonormalBasis(transform);
  return transform;
}

export function transformVec3(
  value: Vec3In,
  transform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
): [number, number, number] {
  const vector = toVec3(value);
  return [dot(vector, transform.right), dot(vector, transform.up), dot(vector, transform.forward)];
}

export function transformQuat(
  value: QuatIn,
  transform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
): [number, number, number, number] {
  const [x, y, z, w] = toQuat(value);
  const [tx, ty, tz] = transformVec3([x, y, z], transform);
  return [tx, ty, tz, w];
}

export function transformScale(
  value: Vec3In,
  transform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
): [number, number, number] {
  const vector = toVec3(value);
  return [
    Math.abs(transform.right[0]) * vector[0] + Math.abs(transform.right[1]) * vector[1] + Math.abs(transform.right[2]) * vector[2],
    Math.abs(transform.up[0]) * vector[0] + Math.abs(transform.up[1]) * vector[1] + Math.abs(transform.up[2]) * vector[2],
    Math.abs(transform.forward[0]) * vector[0] + Math.abs(transform.forward[1]) * vector[1] + Math.abs(transform.forward[2]) * vector[2],
  ];
}

export function transformVertices(
  vertices: ArrayLike<number>,
  transform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
): ArrayLike<number> {
  if (vertices.length % 3 !== 0) {
    throw new Error(`[soundtrace.js] vertices.length must be a multiple of 3 (got ${vertices.length})`);
  }
  if (transform === CORE_COORDINATE_TRANSFORM) return vertices;

  const transformed = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 3) {
    const xInput = vertices[i];
    const yInput = vertices[i + 1];
    const zInput = vertices[i + 2];
    if (xInput === undefined || yInput === undefined || zInput === undefined) {
      throw new Error(`[soundtrace.js] vertices[${i}..${i + 2}] are incomplete`);
    }
    const [x, y, z] = transformVec3([xInput, yInput, zInput], transform);
    transformed[i] = x;
    transformed[i + 1] = y;
    transformed[i + 2] = z;
  }
  return transformed;
}

export interface Pose { position?: Vec3In; orientation?: QuatIn; scale?: Vec3In }

/** Expand a flat index buffer (triplets) into per-triangle records, applying a
 *  single material index to every triangle. */
export function indicesToTriangles(indices: ArrayLike<number>, material: number): Triangle[] {
  if (indices.length % 3 !== 0) {
    throw new Error(`[soundtrace.js] indices.length must be a multiple of 3 (got ${indices.length})`);
  }
  const tris: Triangle[] = [];
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    if (a === undefined || b === undefined || c === undefined) {
      throw new Error(`[soundtrace.js] indices[${i}..${i + 2}] are incomplete`);
    }
    tris.push({ a, b, c, materialIndex: material });
  }
  return tris;
}
