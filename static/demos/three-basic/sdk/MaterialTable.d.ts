import type { Bindings, Heap, SoundMaterial } from './native/index.js';
import type { Disposable } from './Disposable.js';
/** Handle to the global material table. Reach via `SoundTrace.materials`.
 *  This wrapper is stateless — it owns no wasm-side resource of its own, so
 *  `dispose()` is a no-op kept only to satisfy the `Disposable` contract. */
export declare class MaterialTable implements Disposable {
    private readonly b;
    private readonly h;
    /** @internal — reach via `SoundTrace.materials` instead of constructing. */
    constructor(b: Bindings, h: Heap);
    /** Always `false` — this wrapper has no per-instance state to release. */
    readonly disposed = false;
    /** No-op. Provided for `Disposable` symmetry. */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
    /** Add a new material to the table. Returns the assigned 0-based index. */
    add(material: SoundMaterial): number;
    /** Replace the material at an existing index. */
    set(index: number, material: SoundMaterial): boolean;
}
//# sourceMappingURL=MaterialTable.d.ts.map