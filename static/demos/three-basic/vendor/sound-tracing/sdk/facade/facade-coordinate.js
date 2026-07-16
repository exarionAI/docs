export const CORE_COORDINATE_TRANSFORM = {
    right: [1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, 1],
};
function isVec3Tuple(value) {
    return Array.isArray(value);
}
export function toVec3(v) {
    if (isVec3Tuple(v))
        return [v[0], v[1], v[2]];
    return [v.x, v.y, v.z];
}
export function toQuat(q) {
    return Array.isArray(q) ? [q[0], q[1], q[2], q[3]] : [q.x, q.y, q.z, q.w];
}
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function length(v) {
    return Math.hypot(v[0], v[1], v[2]);
}
function normalizeBasisVector(value, label) {
    const vector = toVec3(value);
    const len = length(vector);
    if (len === 0) {
        throw new Error(`[soundtrace.js] coordinateBasis.${label} must be non-zero`);
    }
    return [vector[0] / len, vector[1] / len, vector[2] / len];
}
function assertOrthonormalBasis(transform) {
    const rightUp = Math.abs(dot(transform.right, transform.up));
    const upForward = Math.abs(dot(transform.up, transform.forward));
    const forwardRight = Math.abs(dot(transform.forward, transform.right));
    if (rightUp > 1e-4 || upForward > 1e-4 || forwardRight > 1e-4) {
        throw new Error('[soundtrace.js] coordinateBasis vectors must be orthogonal');
    }
    // Handedness is intentionally NOT constrained: REFLECTED (det < 0) bases are
    // valid. The basis is delegated to the core (exaListenerSetCoordinateBasis),
    // which applies it to the HRTF direction only — a mirror flips azimuth and ITD
    // together without corrupting scene geometry or triangle winding, which the old
    // per-vector geometry transform could not express. (TASK-0014 / ADR-0006)
}
/** True when the resolved basis is the core's native frame (identity rows), i.e.
 *  the host already speaks the core coordinate frame. Callers use this to skip
 *  delegating the basis to the core, keeping the identity render bit-identical to
 *  the prior (no-basis) behavior. */
export function isIdentityBasis(t) {
    return t.right[0] === 1 && t.right[1] === 0 && t.right[2] === 0
        && t.up[0] === 0 && t.up[1] === 1 && t.up[2] === 0
        && t.forward[0] === 0 && t.forward[1] === 0 && t.forward[2] === 1;
}
export function resolveCoordinateTransform(option = {}) {
    const transform = {
        right: normalizeBasisVector(option.right ?? CORE_COORDINATE_TRANSFORM.right, 'right'),
        up: normalizeBasisVector(option.up ?? CORE_COORDINATE_TRANSFORM.up, 'up'),
        forward: normalizeBasisVector(option.forward ?? CORE_COORDINATE_TRANSFORM.forward, 'forward'),
    };
    assertOrthonormalBasis(transform);
    return transform;
}
export function transformVec3(value, transform = CORE_COORDINATE_TRANSFORM) {
    const vector = toVec3(value);
    return [dot(vector, transform.right), dot(vector, transform.up), dot(vector, transform.forward)];
}
export function transformQuat(value, transform = CORE_COORDINATE_TRANSFORM) {
    const [x, y, z, w] = toQuat(value);
    const [tx, ty, tz] = transformVec3([x, y, z], transform);
    return [tx, ty, tz, w];
}
export function transformScale(value, transform = CORE_COORDINATE_TRANSFORM) {
    const vector = toVec3(value);
    return [
        Math.abs(transform.right[0]) * vector[0] + Math.abs(transform.right[1]) * vector[1] + Math.abs(transform.right[2]) * vector[2],
        Math.abs(transform.up[0]) * vector[0] + Math.abs(transform.up[1]) * vector[1] + Math.abs(transform.up[2]) * vector[2],
        Math.abs(transform.forward[0]) * vector[0] + Math.abs(transform.forward[1]) * vector[1] + Math.abs(transform.forward[2]) * vector[2],
    ];
}
export function transformVertices(vertices, transform = CORE_COORDINATE_TRANSFORM) {
    if (vertices.length % 3 !== 0) {
        throw new Error(`[soundtrace.js] vertices.length must be a multiple of 3 (got ${vertices.length})`);
    }
    if (transform === CORE_COORDINATE_TRANSFORM)
        return vertices;
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
/** Expand a flat index buffer (triplets) into per-triangle records, applying a
 *  single material index to every triangle. */
export function indicesToTriangles(indices, material) {
    if (indices.length % 3 !== 0) {
        throw new Error(`[soundtrace.js] indices.length must be a multiple of 3 (got ${indices.length})`);
    }
    const tris = [];
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
//# sourceMappingURL=facade-coordinate.js.map