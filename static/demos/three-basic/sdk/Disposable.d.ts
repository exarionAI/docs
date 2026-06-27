/**
 * Marker interface for any soundtrace.js object that owns wasm-side resources
 * and must be released explicitly.
 *
 * Idiomatic patterns:
 *
 * ```ts
 * const lst = sound.createListener();
 * try {
 *   // ... use lst ...
 * } finally {
 *   lst.dispose();
 * }
 * ```
 *
 * Or, with TypeScript 5.2+ `using`:
 *
 * ```ts
 * using lst = sound.createListener();
 * // automatically disposed at end of scope via [Symbol.dispose]
 * ```
 *
 * `dispose()` is idempotent — calling it twice is a safe no-op.
 * `disposed` flips to `true` after the first call. Methods on a disposed
 * object are not guaranteed to throw, but their behaviour is undefined.
 */
export interface Disposable {
    /** Releases any wasm-side resources owned by this object. Idempotent. */
    dispose(): void;
    /** `true` once `dispose()` has run at least once. */
    readonly disposed: boolean;
    /** TypeScript 5.2+ `using` integration — calls `dispose()`. */
    [Symbol.dispose](): void;
}
//# sourceMappingURL=Disposable.d.ts.map