import type { ExaSoundModule } from '../types.js';
export declare const PTR_SIZE = 4;
export declare class Heap {
    readonly mod: ExaSoundModule;
    constructor(mod: ExaSoundModule);
    private get _u8();
    private get _i32();
    private get _u32();
    private get _u16();
    private get _f32();
    private get _f64();
    malloc(bytes: number): number;
    free(ptr: number): void;
    /** Scope-based alloc: allocations freed automatically when the callback
     *  returns. Ideal for pointer-out parameters. */
    withScope<T>(fn: (scope: Scope) => T): T;
    readI32(ptr: number): number;
    readU32(ptr: number): number;
    readU16(ptr: number): number;
    readF32(ptr: number): number;
    readF64(ptr: number): number;
    readU8(ptr: number): number;
    readBool(ptr: number): boolean;
    writeI32(ptr: number, v: number): void;
    writeU32(ptr: number, v: number): void;
    writeU16(ptr: number, v: number): void;
    writeF32(ptr: number, v: number): void;
    writeU8(ptr: number, v: number): void;
    writeBool(ptr: number, v: boolean): void;
    /** Copy Float32Array → HEAPF32. `ptr` is a byte offset. */
    writeF32Array(ptr: number, src: ArrayLike<number>): void;
    /** Copy HEAPF32 → new Float32Array (independent copy). */
    readF32Array(ptr: number, count: number): Float32Array;
    writeI32Array(ptr: number, src: ArrayLike<number>): void;
    readI32Array(ptr: number, count: number): Int32Array;
    writeU32Array(ptr: number, src: ArrayLike<number>): void;
    readU32Array(ptr: number, count: number): Uint32Array;
    writeBytes(ptr: number, src: Uint8Array): void;
    readBytes(ptr: number, count: number): Uint8Array;
}
/** Scoped allocator — disposeAll() frees every allocation. Use with try/finally. */
export declare class Scope {
    private readonly heap;
    private readonly allocs;
    constructor(heap: Heap);
    alloc(bytes: number): number;
    /** Slot for an int32 out-pointer — initialized to 0. */
    i32(initial?: number): number;
    f32(initial?: number): number;
    u32(initial?: number): number;
    bool(initial?: boolean): number;
    /** Allocate a byte block with optional initializer callback. */
    block(bytes: number, init?: (ptr: number) => void): number;
    disposeAll(): void;
}
//# sourceMappingURL=heap.d.ts.map