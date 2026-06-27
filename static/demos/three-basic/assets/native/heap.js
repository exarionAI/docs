// wasm32: pointer / size_t / int are all 4 bytes. Struct field alignment
// follows the header's `#pragma pack(push, 4)`.
export const PTR_SIZE = 4;
export class Heap {
    mod;
    constructor(mod) {
        this.mod = mod;
    }
    get _u8() {
        if (!this.mod.HEAPU8)
            throw new Error('[soundtrace.js] HEAPU8 not available');
        return this.mod.HEAPU8;
    }
    get _i32() {
        const v = this.mod.HEAP32;
        if (!v)
            throw new Error('[soundtrace.js] HEAP32 not available');
        return v;
    }
    get _u32() {
        const v = this.mod.HEAPU32;
        if (!v)
            throw new Error('[soundtrace.js] HEAPU32 not available');
        return v;
    }
    get _u16() {
        const v = this.mod.HEAPU16;
        if (!v)
            throw new Error('[soundtrace.js] HEAPU16 not available');
        return v;
    }
    get _f32() {
        if (!this.mod.HEAPF32)
            throw new Error('[soundtrace.js] HEAPF32 not available');
        return this.mod.HEAPF32;
    }
    get _f64() {
        const v = this.mod.HEAPF64;
        if (!v)
            throw new Error('[soundtrace.js] HEAPF64 not available');
        return v;
    }
    // ---- Allocation ----
    malloc(bytes) {
        const fn = this.mod._malloc;
        if (!fn)
            throw new Error('[soundtrace.js] _malloc not exported');
        const ptr = fn(bytes);
        if (!ptr)
            throw new Error(`[soundtrace.js] malloc(${bytes}) returned 0`);
        return ptr;
    }
    free(ptr) {
        if (!ptr)
            return;
        const fn = this.mod._free;
        if (!fn)
            throw new Error('[soundtrace.js] _free not exported');
        fn(ptr);
    }
    /** Scope-based alloc: allocations freed automatically when the callback
     *  returns. Ideal for pointer-out parameters. */
    withScope(fn) {
        const scope = new Scope(this);
        try {
            return fn(scope);
        }
        finally {
            scope.disposeAll();
        }
    }
    // ---- Read / write primitives ----
    readI32(ptr) { return readHeapValue(this._i32, ptr >> 2, 'i32'); }
    readU32(ptr) { return readHeapValue(this._u32, ptr >> 2, 'u32'); }
    readU16(ptr) { return readHeapValue(this._u16, ptr >> 1, 'u16'); }
    readF32(ptr) { return readHeapValue(this._f32, ptr >> 2, 'f32'); }
    readF64(ptr) { return readHeapValue(this._f64, ptr >> 3, 'f64'); }
    readU8(ptr) { return readHeapValue(this._u8, ptr, 'u8'); }
    readBool(ptr) { return this._u8[ptr] !== 0; }
    writeI32(ptr, v) { this._i32[ptr >> 2] = v; }
    writeU32(ptr, v) { this._u32[ptr >> 2] = v; }
    writeU16(ptr, v) { this._u16[ptr >> 1] = v; }
    writeF32(ptr, v) { this._f32[ptr >> 2] = v; }
    writeU8(ptr, v) { this._u8[ptr] = v; }
    writeBool(ptr, v) { this._u8[ptr] = v ? 1 : 0; }
    // ---- Array / block copy ----
    /** Copy Float32Array → HEAPF32. `ptr` is a byte offset. */
    writeF32Array(ptr, src) {
        this._f32.set(src, ptr >> 2);
    }
    /** Copy HEAPF32 → new Float32Array (independent copy). */
    readF32Array(ptr, count) {
        return this._f32.slice(ptr >> 2, (ptr >> 2) + count);
    }
    writeI32Array(ptr, src) {
        this._i32.set(src, ptr >> 2);
    }
    readI32Array(ptr, count) {
        return this._i32.slice(ptr >> 2, (ptr >> 2) + count);
    }
    writeU32Array(ptr, src) {
        this._u32.set(src, ptr >> 2);
    }
    readU32Array(ptr, count) {
        return this._u32.slice(ptr >> 2, (ptr >> 2) + count);
    }
    writeBytes(ptr, src) {
        this._u8.set(src, ptr);
    }
    readBytes(ptr, count) {
        return this._u8.slice(ptr, ptr + count);
    }
}
function readHeapValue(view, index, label) {
    const value = view[index];
    if (value === undefined) {
        throw new Error(`[soundtrace.js] HEAP${label} read out of bounds at index ${index}`);
    }
    return value;
}
/** Scoped allocator — disposeAll() frees every allocation. Use with try/finally. */
export class Scope {
    heap;
    allocs = [];
    constructor(heap) {
        this.heap = heap;
    }
    alloc(bytes) {
        const ptr = this.heap.malloc(bytes);
        this.allocs.push(ptr);
        return ptr;
    }
    /** Slot for an int32 out-pointer — initialized to 0. */
    i32(initial = 0) {
        const p = this.alloc(4);
        this.heap.writeI32(p, initial);
        return p;
    }
    f32(initial = 0) {
        const p = this.alloc(4);
        this.heap.writeF32(p, initial);
        return p;
    }
    u32(initial = 0) {
        const p = this.alloc(4);
        this.heap.writeU32(p, initial);
        return p;
    }
    bool(initial = false) {
        const p = this.alloc(1);
        this.heap.writeBool(p, initial);
        return p;
    }
    /** Allocate a byte block with optional initializer callback. */
    block(bytes, init) {
        const p = this.alloc(bytes);
        if (init)
            init(p);
        return p;
    }
    disposeAll() {
        for (const p of this.allocs)
            this.heap.free(p);
        this.allocs.length = 0;
    }
}
//# sourceMappingURL=heap.js.map