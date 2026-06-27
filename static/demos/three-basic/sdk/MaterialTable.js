import { SOUND_MATERIAL_SIZE, writeSoundMaterial } from './native/index.js';
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
    /** Add a new material to the table. Returns the assigned 0-based index. */
    add(material) {
        return this.h.withScope(s => {
            const p = s.block(SOUND_MATERIAL_SIZE);
            writeSoundMaterial(this.h, p, material);
            return this.b.exaAddSoundMaterial(p);
        });
    }
    /** Replace the material at an existing index. */
    set(index, material) {
        return this.h.withScope(s => {
            const p = s.block(SOUND_MATERIAL_SIZE);
            writeSoundMaterial(this.h, p, material);
            return this.b.exaSetSoundMaterial(index, p);
        });
    }
}
//# sourceMappingURL=MaterialTable.js.map