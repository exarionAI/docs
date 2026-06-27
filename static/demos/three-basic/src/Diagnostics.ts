import type { Bindings, Heap, MemoryTraceOption, MemoryTraceSnapshot, PathData, Vec3, Ray } from './native/index.js';
import {
  MEMORY_TRACE_OPTION_SIZE,
  MEMORY_TRACE_SNAPSHOT_SIZE,
  PATH_DATA_SIZE,
  RAY_SIZE,
  VEC3_SIZE,
  readMemoryTraceSnapshot,
  readPathData,
  readRay,
  readVec3,
  writeMemoryTraceOption,
} from './native/index.js';

import type { Disposable } from './Disposable.js';

/** Bundle of statistics / memory tracing / debug helpers. Reach via `SoundTrace.diagnostics`.
 *  Stateless wrapper — `dispose()` is a no-op kept for `Disposable` symmetry. */
export class Diagnostics implements Disposable {
  /** @internal — reach via `SoundTrace.diagnostics` instead of constructing. */
  constructor(private readonly b: Bindings, private readonly h: Heap) {}

  /** Always `false` — this wrapper has no per-instance state. */
  readonly disposed = false;
  /** No-op. Provided for `Disposable` symmetry. */
  dispose(): void { /* stateless wrapper */ }
  /** @inheritdoc */
  [Symbol.dispose](): void { /* stateless wrapper */ }

  // --- Engine version ---
  getVersion(): { major: number; minor: number; revision: number } {
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
  setMemoryTraceOption(opt: MemoryTraceOption): boolean {
    return this.h.withScope(s => {
      const p = s.block(MEMORY_TRACE_OPTION_SIZE);
      writeMemoryTraceOption(this.h, p, opt);
      return this.b.exaSetMemoryTraceOption(p);
    });
  }
  memoryTraceMark(tag: string): boolean { return this.b.exaMemoryTraceMark(tag); }
  getMemoryTraceSnapshot(): MemoryTraceSnapshot | null {
    return this.h.withScope(s => {
      const p = s.block(MEMORY_TRACE_SNAPSHOT_SIZE);
      const ok = this.b.exaGetMemoryTraceSnapshot(p);
      return ok ? readMemoryTraceSnapshot(this.h, p) : null;
    });
  }

  // --- Ray statistics ---
  getRayTraversalCount(type: number): number {
    return this.b.exaStatistics_GetRayTraversalCount(type);
  }
  getRayTraversals(type: number, count?: number): PathData[] {
    const n = Math.min(this.getRayTraversalCount(type), count ?? Number.MAX_SAFE_INTEGER);
    if (n <= 0) return [];
    return this.h.withScope(s => {
      const p = s.alloc(n * PATH_DATA_SIZE);
      const ok = this.b.exaStatistics_GetRayTraversals(type, p, n);
      if (!ok) return [];
      const out: PathData[] = [];
      for (let i = 0; i < n; i++) out.push(readPathData(this.h, p + i * PATH_DATA_SIZE));
      return out;
    });
  }

  getRayHitTriangleCount(type: number): number {
    return this.b.exaStatistics_GetRayHitTriangleCount(type);
  }
  /** Vertices of triangles hit by rays (heatmap data layout is engine-defined). */
  getRayHitTriangleVertices(type: number, count?: number): Vec3[] {
    const n = Math.min(this.getRayHitTriangleCount(type), count ?? Number.MAX_SAFE_INTEGER);
    if (n <= 0) return [];
    return this.h.withScope(s => {
      const p = s.alloc(n * VEC3_SIZE);
      const ok = this.b.exaStatistics_GetRayHitTriangles(type, p, n);
      if (!ok) return [];
      const out: Vec3[] = [];
      for (let i = 0; i < n; i++) out.push(readVec3(this.h, p + i * VEC3_SIZE));
      return out;
    });
  }

  // --- Debug: ray generation ---
  /** Generate a width×height grid of test rays and return them. */
  testRayGeneration(width: number, height: number): Ray[] {
    const n = width * height;
    return this.h.withScope(s => {
      const p = s.alloc(n * RAY_SIZE);
      this.b.exaTestRayGeneration(p, width, height);
      const out: Ray[] = [];
      for (let i = 0; i < n; i++) out.push(readRay(this.h, p + i * RAY_SIZE));
      return out;
    });
  }

  getLastError(): string { return this.b.exaGetLastError(); }
}
