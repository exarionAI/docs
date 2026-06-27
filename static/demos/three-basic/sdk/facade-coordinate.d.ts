import type { Triangle } from './native-public.js';
export type Vec3In = readonly [number, number, number] | {
    x: number;
    y: number;
    z: number;
};
export type QuatIn = [number, number, number, number] | {
    x: number;
    y: number;
    z: number;
    w: number;
};
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
export declare const CORE_COORDINATE_TRANSFORM: CoordinateTransform;
export declare function toVec3(v: Vec3In): [number, number, number];
export declare function toQuat(q: QuatIn): [number, number, number, number];
export declare function resolveCoordinateTransform(option?: CoordinateBasisOption): CoordinateTransform;
export declare function transformVec3(value: Vec3In, transform?: CoordinateTransform): [number, number, number];
export declare function transformQuat(value: QuatIn, transform?: CoordinateTransform): [number, number, number, number];
export declare function transformScale(value: Vec3In, transform?: CoordinateTransform): [number, number, number];
export declare function transformVertices(vertices: ArrayLike<number>, transform?: CoordinateTransform): ArrayLike<number>;
export interface Pose {
    position?: Vec3In;
    orientation?: QuatIn;
    scale?: Vec3In;
}
/** Expand a flat index buffer (triplets) into per-triangle records, applying a
 *  single material index to every triangle. */
export declare function indicesToTriangles(indices: ArrayLike<number>, material: number): Triangle[];
//# sourceMappingURL=facade-coordinate.d.ts.map