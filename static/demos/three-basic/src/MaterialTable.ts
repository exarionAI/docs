import type { Bindings, Heap, SoundMaterial } from './native/index.js';
import { SOUND_MATERIAL_SIZE, writeSoundMaterial } from './native/index.js';
import type { Disposable } from './Disposable.js';

/** Handle to the global material table. Reach via `SoundTrace.materials`.
 *  This wrapper is stateless — it owns no wasm-side resource of its own, so
 *  `dispose()` is a no-op kept only to satisfy the `Disposable` contract. */
export class MaterialTable implements Disposable {
  /** @internal — reach via `SoundTrace.materials` instead of constructing. */
  constructor(private readonly b: Bindings, private readonly h: Heap) {}

  /** Always `false` — this wrapper has no per-instance state to release. */
  readonly disposed = false;
  /** No-op. Provided for `Disposable` symmetry. */
  dispose(): void { /* stateless wrapper */ }
  /** @inheritdoc */
  [Symbol.dispose](): void { /* stateless wrapper */ }

  /** Add a new material to the table. Returns the assigned 0-based index. */
  add(material: SoundMaterial): number {
    return this.h.withScope(s => {
      const p = s.block(SOUND_MATERIAL_SIZE);
      writeSoundMaterial(this.h, p, material);
      return this.b.exaAddSoundMaterial(p);
    });
  }

  /** Replace the material at an existing index. */
  set(index: number, material: SoundMaterial): boolean {
    return this.h.withScope(s => {
      const p = s.block(SOUND_MATERIAL_SIZE);
      writeSoundMaterial(this.h, p, material);
      return this.b.exaSetSoundMaterial(index, p);
    });
  }
}
