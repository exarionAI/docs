import type { ExaSoundModule } from '../types.js';

// wasm32: pointer / size_t / int are all 4 bytes. Struct field alignment
// follows the header's `#pragma pack(push, 4)`.
export const PTR_SIZE = 4;

export class Heap {
  constructor(public readonly mod: ExaSoundModule) {}

  private get _u8(): Uint8Array {
    if (!this.mod.HEAPU8) throw new Error('[soundtrace.js] HEAPU8 not available');
    return this.mod.HEAPU8;
  }
  private get _i32(): Int32Array {
    const v = this.mod.HEAP32;
    if (!v) throw new Error('[soundtrace.js] HEAP32 not available');
    return v;
  }
  private get _u32(): Uint32Array {
    const v = this.mod.HEAPU32;
    if (!v) throw new Error('[soundtrace.js] HEAPU32 not available');
    return v;
  }
  private get _u16(): Uint16Array {
    const v = this.mod.HEAPU16;
    if (!v) throw new Error('[soundtrace.js] HEAPU16 not available');
    return v;
  }
  private get _f32(): Float32Array {
    if (!this.mod.HEAPF32) throw new Error('[soundtrace.js] HEAPF32 not available');
    return this.mod.HEAPF32;
  }
  private get _f64(): Float64Array {
    const v = this.mod.HEAPF64;
    if (!v) throw new Error('[soundtrace.js] HEAPF64 not available');
    return v;
  }

  // ---- Allocation ----
  malloc(bytes: number): number {
    const fn = this.mod._malloc;
    if (!fn) throw new Error('[soundtrace.js] _malloc not exported');
    const ptr = fn(bytes);
    if (!ptr) throw new Error(`[soundtrace.js] malloc(${bytes}) returned 0`);
    return ptr;
  }
  free(ptr: number): void {
    if (!ptr) return;
    const fn = this.mod._free;
    if (!fn) throw new Error('[soundtrace.js] _free not exported');
    fn(ptr);
  }

  /** Scope-based alloc: allocations freed automatically when the callback
   *  returns. Ideal for pointer-out parameters. */
  withScope<T>(fn: (scope: Scope) => T): T {
    const scope = new Scope(this);
    try {
      return fn(scope);
    } finally {
      scope.disposeAll();
    }
  }

  // ---- Read / write primitives ----
  readI32(ptr: number): number { return readHeapValue(this._i32, ptr >> 2, 'i32'); }
  readU32(ptr: number): number { return readHeapValue(this._u32, ptr >> 2, 'u32'); }
  readU16(ptr: number): number { return readHeapValue(this._u16, ptr >> 1, 'u16'); }
  readF32(ptr: number): number { return readHeapValue(this._f32, ptr >> 2, 'f32'); }
  readF64(ptr: number): number { return readHeapValue(this._f64, ptr >> 3, 'f64'); }
  readU8(ptr: number): number { return readHeapValue(this._u8, ptr, 'u8'); }
  readBool(ptr: number): boolean { return this._u8[ptr] !== 0; }

  writeI32(ptr: number, v: number): void { this._i32[ptr >> 2] = v; }
  writeU32(ptr: number, v: number): void { this._u32[ptr >> 2] = v; }
  writeU16(ptr: number, v: number): void { this._u16[ptr >> 1] = v; }
  writeF32(ptr: number, v: number): void { this._f32[ptr >> 2] = v; }
  writeU8(ptr: number, v: number): void { this._u8[ptr] = v; }
  writeBool(ptr: number, v: boolean): void { this._u8[ptr] = v ? 1 : 0; }

  // ---- Array / block copy ----
  /** Copy Float32Array → HEAPF32. `ptr` is a byte offset. */
  writeF32Array(ptr: number, src: ArrayLike<number>): void {
    this._f32.set(src, ptr >> 2);
  }
  /** Copy HEAPF32 → new Float32Array (independent copy). */
  readF32Array(ptr: number, count: number): Float32Array {
    return this._f32.slice(ptr >> 2, (ptr >> 2) + count);
  }

  writeI32Array(ptr: number, src: ArrayLike<number>): void {
    this._i32.set(src, ptr >> 2);
  }
  readI32Array(ptr: number, count: number): Int32Array {
    return this._i32.slice(ptr >> 2, (ptr >> 2) + count);
  }

  writeU32Array(ptr: number, src: ArrayLike<number>): void {
    this._u32.set(src, ptr >> 2);
  }
  readU32Array(ptr: number, count: number): Uint32Array {
    return this._u32.slice(ptr >> 2, (ptr >> 2) + count);
  }

  writeBytes(ptr: number, src: Uint8Array): void {
    this._u8.set(src, ptr);
  }
  readBytes(ptr: number, count: number): Uint8Array {
    return this._u8.slice(ptr, ptr + count);
  }
}

function readHeapValue(view: ArrayLike<number>, index: number, label: string): number {
  const value = view[index];
  if (value === undefined) {
    throw new Error(`[soundtrace.js] HEAP${label} read out of bounds at index ${index}`);
  }
  return value;
}

/** Scoped allocator — disposeAll() frees every allocation. Use with try/finally. */
export class Scope {
  private readonly allocs: number[] = [];
  constructor(private readonly heap: Heap) {}

  alloc(bytes: number): number {
    const ptr = this.heap.malloc(bytes);
    this.allocs.push(ptr);
    return ptr;
  }

  /** Slot for an int32 out-pointer — initialized to 0. */
  i32(initial = 0): number {
    const p = this.alloc(4);
    this.heap.writeI32(p, initial);
    return p;
  }
  f32(initial = 0): number {
    const p = this.alloc(4);
    this.heap.writeF32(p, initial);
    return p;
  }
  u32(initial = 0): number {
    const p = this.alloc(4);
    this.heap.writeU32(p, initial);
    return p;
  }
  bool(initial = false): number {
    const p = this.alloc(1);
    this.heap.writeBool(p, initial);
    return p;
  }

  /** Allocate a byte block with optional initializer callback. */
  block(bytes: number, init?: (ptr: number) => void): number {
    const p = this.alloc(bytes);
    if (init) init(p);
    return p;
  }

  disposeAll(): void {
    for (const p of this.allocs) this.heap.free(p);
    this.allocs.length = 0;
  }
}
