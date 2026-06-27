import { MEMORY_TRACE_OPTION_SIZE, MEMORY_TRACE_SNAPSHOT_SIZE, PATH_DATA_SIZE, RAY_SIZE, VEC3_SIZE, readMemoryTraceSnapshot, readPathData, readRay, readVec3, writeMemoryTraceOption, } from './native/index.js';
/** Bundle of statistics / memory tracing / debug helpers. Reach via `SoundTrace.diagnostics`.
 *  Stateless wrapper — `dispose()` is a no-op kept for `Disposable` symmetry. */
export class Diagnostics {
    b;
    h;
    /** @internal — reach via `SoundTrace.diagnostics` instead of constructing. */
    constructor(b, h) {
        this.b = b;
        this.h = h;
    }
    /** Always `false` — this wrapper has no per-instance state. */
    disposed = false;
    /** No-op. Provided for `Disposable` symmetry. */
    dispose() { }
    /** @inheritdoc */
    [Symbol.dispose]() { }
    // --- Engine version ---
    getVersion() {
        return this.h.withScope(s => {
            const mj = s.u32(), mn = s.u32(), rv = s.u32();
            this.b.exaGetVersion(mj, mn, rv);
            return {
                major: this.h.readU32(mj),
                minor: this.h.readU32(mn),
                revision: this.h.readU32(rv),
            };
        });
    }
    // --- Memory trace ---
    setMemoryTraceOption(opt) {
        return this.h.withScope(s => {
            const p = s.block(MEMORY_TRACE_OPTION_SIZE);
            writeMemoryTraceOption(this.h, p, opt);
            return this.b.exaSetMemoryTraceOption(p);
        });
    }
    memoryTraceMark(tag) { return this.b.exaMemoryTraceMark(tag); }
    getMemoryTraceSnapshot() {
        return this.h.withScope(s => {
            const p = s.block(MEMORY_TRACE_SNAPSHOT_SIZE);
            const ok = this.b.exaGetMemoryTraceSnapshot(p);
            return ok ? readMemoryTraceSnapshot(this.h, p) : null;
        });
    }
    // --- Ray statistics ---
    getRayTraversalCount(type) {
        return this.b.exaStatistics_GetRayTraversalCount(type);
    }
    getRayTraversals(type, count) {
        const n = Math.min(this.getRayTraversalCount(type), count ?? Number.MAX_SAFE_INTEGER);
        if (n <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(n * PATH_DATA_SIZE);
            const ok = this.b.exaStatistics_GetRayTraversals(type, p, n);
            if (!ok)
                return [];
            const out = [];
            for (let i = 0; i < n; i++)
                out.push(readPathData(this.h, p + i * PATH_DATA_SIZE));
            return out;
        });
    }
    getRayHitTriangleCount(type) {
        return this.b.exaStatistics_GetRayHitTriangleCount(type);
    }
    /** Vertices of triangles hit by rays (heatmap data layout is engine-defined). */
    getRayHitTriangleVertices(type, count) {
        const n = Math.min(this.getRayHitTriangleCount(type), count ?? Number.MAX_SAFE_INTEGER);
        if (n <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(n * VEC3_SIZE);
            const ok = this.b.exaStatistics_GetRayHitTriangles(type, p, n);
            if (!ok)
                return [];
            const out = [];
            for (let i = 0; i < n; i++)
                out.push(readVec3(this.h, p + i * VEC3_SIZE));
            return out;
        });
    }
    // --- Debug: ray generation ---
    /** Generate a width×height grid of test rays and return them. */
    testRayGeneration(width, height) {
        const n = width * height;
        return this.h.withScope(s => {
            const p = s.alloc(n * RAY_SIZE);
            this.b.exaTestRayGeneration(p, width, height);
            const out = [];
            for (let i = 0; i < n; i++)
                out.push(readRay(this.h, p + i * RAY_SIZE));
            return out;
        });
    }
    getLastError() { return this.b.exaGetLastError(); }
}
//# sourceMappingURL=Diagnostics.js.map