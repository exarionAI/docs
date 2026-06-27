import type { Bindings, Heap, MemoryTraceOption, MemoryTraceSnapshot, PathData, Vec3, Ray } from './native/index.js';
import type { Disposable } from './Disposable.js';
/** Bundle of statistics / memory tracing / debug helpers. Reach via `SoundTrace.diagnostics`.
 *  Stateless wrapper — `dispose()` is a no-op kept for `Disposable` symmetry. */
export declare class Diagnostics implements Disposable {
    private readonly b;
    private readonly h;
    /** @internal — reach via `SoundTrace.diagnostics` instead of constructing. */
    constructor(b: Bindings, h: Heap);
    /** Always `false` — this wrapper has no per-instance state. */
    readonly disposed = false;
    /** No-op. Provided for `Disposable` symmetry. */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
    getVersion(): {
        major: number;
        minor: number;
        revision: number;
    };
    setMemoryTraceOption(opt: MemoryTraceOption): boolean;
    memoryTraceMark(tag: string): boolean;
    getMemoryTraceSnapshot(): MemoryTraceSnapshot | null;
    getRayTraversalCount(type: number): number;
    getRayTraversals(type: number, count?: number): PathData[];
    getRayHitTriangleCount(type: number): number;
    /** Vertices of triangles hit by rays (heatmap data layout is engine-defined). */
    getRayHitTriangleVertices(type: number, count?: number): Vec3[];
    /** Generate a width×height grid of test rays and return them. */
    testRayGeneration(width: number, height: number): Ray[];
    getLastError(): string;
}
//# sourceMappingURL=Diagnostics.d.ts.map