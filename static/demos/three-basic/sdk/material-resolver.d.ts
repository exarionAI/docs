/** A material reference accepted by the facade: a numeric index or a name. */
export type MaterialRef = number | string;
/** Shape of `assets/soundMaterial.json` (the material data table). */
export interface SoundMaterialAsset {
    _soundMaterials: Array<{
        materialType: number;
        description: string;
        scattering: number;
        reflection: ArrayLike<number>;
        absorption: ArrayLike<number>;
        transmission: ArrayLike<number>;
    }>;
}
/** Shape of `assets/soundMaterialAlias.json` (name → canonical material map). */
export interface SoundMaterialAliasAsset {
    defaultMaterialType: number;
    aliases: Record<string, string[]>;
}
/**
 * Build a reverse index mapping every alias (and canonical name) to its
 * canonical material name. Both keys and values are normalized to lowercase
 * so lookups are case-insensitive. The canonical name itself is also inserted
 * as a key (canonical → canonical), so a direct name match works too.
 */
export declare function buildAliasReverseIndex(aliases: Record<string, string[]>): Map<string, string>;
/**
 * Resolve a material reference to a numeric `materialType` index.
 *
 * - number → returned as-is (negative/NaN pass through; the engine validates).
 * - string → lowercased, matched against the reverse index to a canonical
 *   name, then looked up in `nameToIndex`. If the name is unknown, returns
 *   `defaultMaterialType`.
 *
 * `nameToIndex` maps canonical-name (lowercase) → materialType index. It is
 * built by the caller from the loaded material asset + the reverse index.
 */
export declare function resolveMaterialName(ref: MaterialRef, aliasReverseIndex: Map<string, string>, nameToIndex: Map<string, number>, defaultMaterialType: number): number;
/**
 * Build the canonical-name → materialType index from the material asset.
 * Names are lowercased for case-insensitive matching against the alias index.
 */
export declare function buildNameToIndex(asset: SoundMaterialAsset): Map<string, number>;
/** Convert a raw material asset entry to the C-ABI SoundMaterial shape. */
export declare function toSoundMaterial(entry: SoundMaterialAsset['_soundMaterials'][number]): {
    reflection: ArrayLike<number>;
    absorption: ArrayLike<number>;
    transmission: ArrayLike<number>;
    scattering: number;
    index: number;
};
//# sourceMappingURL=material-resolver.d.ts.map