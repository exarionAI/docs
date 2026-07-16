import { MEMORY_TRACE_OPTION_SIZE, MEMORY_TRACE_SNAPSHOT_SIZE, PATH_DATA_SIZE, VEC3_SIZE, readMemoryTraceSnapshot, readPathData, readVec3, requireOk, writeMemoryTraceOption, } from '../native/index.js';
/** Bundle of statistics / memory tracing / debug helpers. Reach via `SoundTrace.diagnostics`.
 *  Stateless wrapper — `dispose()` is a no-op kept for `Disposable` symmetry.
 *
 *  NOTE: everything backed by exaSoundDiagnostics.h (exaDiag* / job timing)
 *  keeps the LEGACY ExaBool convention — non-zero = success. Only the core
 *  surface (exaGetVersion here) speaks v0.7 ExaResult. */
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
            requireOk(this.b.exaGetVersion(mj, mn, rv), 'exaGetVersion', this.b.exaGetLastError);
            return {
                major: this.h.readU32(mj),
                minor: this.h.readU32(mn),
                revision: this.h.readU32(rv),
            };
        });
    }
    // --- Memory trace (exaDiag* — legacy ExaBool success convention) ---
    setMemoryTraceOption(opt) {
        return this.h.withScope(s => {
            const p = s.block(MEMORY_TRACE_OPTION_SIZE);
            writeMemoryTraceOption(this.h, p, opt);
            return this.b.exaDiagSetMemoryTraceOption(p);
        });
    }
    memoryTraceMark(tag) { return this.b.exaDiagMemoryTraceMark(tag); }
    getMemoryTraceSnapshot() {
        return this.h.withScope(s => {
            const p = s.block(MEMORY_TRACE_SNAPSHOT_SIZE);
            const ok = this.b.exaDiagGetMemoryTraceSnapshot(p);
            return ok ? readMemoryTraceSnapshot(this.h, p) : null;
        });
    }
    // --- Ray statistics (v0.7 merged count+fill: probe with capacity 0) ---
    //
    // Probe contract (finding #27): the core writes the available count into
    // *outCount FIRST and only then rejects the null-buffer probe with
    // EXA_FALSE (Diagnostics.cpp) — so `if (!ok) return 0` threw the real count
    // away and the whole ray-visualization surface returned [] exactly when
    // there WAS data. The count out-param is trustworthy on every path (the
    // core zeroes it up front on real errors); read it unconditionally.
    // Fill contract (finding #9's shape): all-or-nothing — capacity below the
    // available set returns EXA_FALSE and writes nothing, so the buffer is
    // sized to the FULL count and the caller cap is a JS slice.
    getRayTraversalCount(type) {
        return this.h.withScope(s => {
            const countPtr = s.i32();
            this.b.exaDiagGetRayTraversals(type, 0, 0, countPtr);
            return this.h.readI32(countPtr);
        });
    }
    getRayTraversals(type, count) {
        const available = this.getRayTraversalCount(type);
        const limit = Math.min(available, count ?? Number.MAX_SAFE_INTEGER);
        if (available <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(available * PATH_DATA_SIZE);
            const countPtr = s.i32();
            if (!this.b.exaDiagGetRayTraversals(type, p, available, countPtr))
                return [];
            const written = Math.min(this.h.readI32(countPtr), limit);
            const out = [];
            for (let i = 0; i < written; i++)
                out.push(readPathData(this.h, p + i * PATH_DATA_SIZE));
            return out;
        });
    }
    getRayHitTriangleCount(type) {
        return this.h.withScope(s => {
            const countPtr = s.i32();
            this.b.exaDiagGetRayHitTriangles(type, 0, 0, countPtr);
            return this.h.readI32(countPtr);
        });
    }
    /** Vertices of triangles hit by rays — ExaVec3f elements, THREE per hit
     *  triangle (heatmap data layout is engine-defined). */
    getRayHitTriangleVertices(type, count) {
        const available = this.getRayHitTriangleCount(type);
        const limit = Math.min(available, count ?? Number.MAX_SAFE_INTEGER);
        if (available <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(available * VEC3_SIZE);
            const countPtr = s.i32();
            if (!this.b.exaDiagGetRayHitTriangles(type, p, available, countPtr))
                return [];
            const written = Math.min(this.h.readI32(countPtr), limit);
            const out = [];
            for (let i = 0; i < written; i++)
                out.push(readVec3(this.h, p + i * VEC3_SIZE));
            return out;
        });
    }
    // (testRayGeneration was removed: v0.7 gates exaTestRayGeneration behind
    //  EXA_BUILD_TESTS, so the symbol does not exist in shipped wasm builds.)
    getLastError() { return this.b.exaGetLastError(); }
}
//# sourceMappingURL=Diagnostics.js.map