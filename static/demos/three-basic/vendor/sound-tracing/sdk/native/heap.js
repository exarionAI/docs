// wasm32: pointer / size_t / int are all 4 bytes. The v0.7 header dropped
// `#pragma pack`; its structs use fixed-width fields with explicit padding,
// so wasm32 natural alignment yields the exact offsets in structs.ts.
export const PTR_SIZE = 4;
export class Heap {
    mod;
    constructor(mod) {
        this.mod = mod;
    }
    // Growth-stale view guard. The core wasm links -sALLOW_MEMORY_GROWTH=1 with
    // shared memory (ST -sAUDIO_WORKLET=1, MT pthreads), so the memory can grow
    // on a thread OTHER than the one running this SDK. Emscripten's
    // updateMemoryViews() reassigns Module.HEAP* only on the growing thread;
    // every other thread keeps stale views. Under snapshot semantics (Chrome's
    // shared WebAssembly.Memory) grow() replaces memory.buffer with a NEW
    // SharedArrayBuffer object and the old one survives at its old length, so a
    // stale view spans its WHOLE buffer -- locally indistinguishable from
    // healthy. Reads above the old break then throw "HEAP32 read out of bounds"
    // (seen as the mt control-loop fatal on the first tick after propagation
    // pthreads grew the memory) and writes are SILENT no-ops.
    //
    // Fix: compare the module view against the LIVE buffer -- mod.wasmMemory
    // (exported by core >= 194d1610) when present, else the view's own buffer
    // (older glue; still catches in-place growth). When stale, rebuild a
    // full-length view over the live buffer and cache it per element type until
    // the buffer or its length changes again. The healthy path (view already
    // spans the whole live buffer) returns the module view untouched -- no
    // rebuild churn and bit-identical to the previous behavior.
    _fullViews = new Map();
    view(modView, ctor, name) {
        if (!modView)
            throw new Error(`[soundtrace.js] ${name} not available`);
        const live = this.mod.wasmMemory?.buffer ?? modView.buffer;
        // Healthy path: the module view already covers the whole live buffer.
        if (modView.buffer === live && modView.byteLength === live.byteLength) {
            return modView;
        }
        // Stale: the memory grew on another thread. Rebuild once per (buffer,len).
        const key = ctor;
        const cached = this._fullViews.get(key);
        if (cached && cached.buffer === live &&
            cached.length === live.byteLength) {
            return cached.view;
        }
        const rebuilt = new ctor(live);
        this._fullViews.set(key, { buffer: live, length: live.byteLength, view: rebuilt });
        return rebuilt;
    }
    get _u8() {
        return this.view(this.mod.HEAPU8, Uint8Array, 'HEAPU8');
    }
    get _i32() {
        return this.view(this.mod.HEAP32, Int32Array, 'HEAP32');
    }
    get _u32() {
        return this.view(this.mod.HEAPU32, Uint32Array, 'HEAPU32');
    }
    get _u16() {
        return this.view(this.mod.HEAPU16, Uint16Array, 'HEAPU16');
    }
    get _f32() {
        return this.view(this.mod.HEAPF32, Float32Array, 'HEAPF32');
    }
    get _f64() {
        return this.view(this.mod.HEAPF64, Float64Array, 'HEAPF64');
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
    /**
     * Copy `count` floats from HEAPF32 at `ptr` into `dest` (from index 0) without
     * allocating. Use on hot paths instead of `dest.set(readF32Array(...))`, which
     * `.slice()`s a throwaway array each call. Returns `count`.
     */
    readF32ArrayInto(ptr, dest, count) {
        const start = ptr >> 2;
        dest.set(this._f32.subarray(start, start + count));
        return count;
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