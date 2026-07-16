import { MATERIAL_SIZE, isOk, readMaterial, requireOk, writeMaterial } from '../native/index.js';
/** Handle to the global material table. Reach via `SoundTrace.materials`.
 *  This wrapper is stateless — it owns no wasm-side resource of its own, so
 *  `dispose()` is a no-op kept only to satisfy the `Disposable` contract. */
export class MaterialTable {
    b;
    h;
    /** @internal — reach via `SoundTrace.materials` instead of constructing. */
    constructor(b, h) {
        this.b = b;
        this.h = h;
    }
    /** Always `false` — this wrapper has no per-instance state to release. */
    disposed = false;
    /** No-op. Provided for `Disposable` symmetry. */
    dispose() { }
    /** @inheritdoc */
    [Symbol.dispose]() { }
    /** Add a new material to the table. Returns the assigned 0-based index
     *  (v0.7: exaMaterialCreate writes the id through an out-param — the old
     *  ExaMaterial.index field is gone). */
    add(material) {
        return this.h.withScope(s => {
            const p = s.block(MATERIAL_SIZE);
            writeMaterial(this.h, p, material);
            const idPtr = s.i32();
            requireOk(this.b.exaMaterialCreate(p, idPtr), 'exaMaterialCreate', this.b.exaGetLastError);
            return this.h.readI32(idPtr);
        });
    }
    /** Replace the material at an existing index (scenes are re-flattened). */
    set(index, material) {
        return this.h.withScope(s => {
            const p = s.block(MATERIAL_SIZE);
            writeMaterial(this.h, p, material);
            return isOk(this.b.exaMaterialSet(index, p));
        });
    }
    /** Read an existing material's coefficients (v0.7 exaMaterialGet, D-08). */
    get(index) {
        return this.h.withScope(s => {
            const p = s.block(MATERIAL_SIZE);
            requireOk(this.b.exaMaterialGet(index, p), 'exaMaterialGet', this.b.exaGetLastError);
            return readMaterial(this.h, p);
        });
    }
}
//# sourceMappingURL=MaterialTable.js.map