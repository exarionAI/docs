// Material name → index resolution (S4).
//
// Pure logic — no wasm, no AudioContext. The SoundTrace facade loads
// `soundMaterial.json` + `soundMaterialAlias.json` during load(), registers
// every material into the engine's MaterialTable, and builds a reverse index
// (name/alias → materialType index) so addMesh({material:'concrete'}) resolves
// without a round-trip. Numeric indices pass through unchanged. Unknown names
// fall back to `defaultMaterialType` (from the alias asset, default 0).
/**
 * Build a reverse index mapping every alias (and canonical name) to its
 * canonical material name. Both keys and values are normalized to lowercase
 * so lookups are case-insensitive. The canonical name itself is also inserted
 * as a key (canonical → canonical), so a direct name match works too.
 */
export function buildAliasReverseIndex(aliases) {
    const idx = new Map();
    for (const [canonical, syns] of Object.entries(aliases)) {
        const c = canonical.toLowerCase();
        idx.set(c, c);
        for (const syn of syns) {
            idx.set(String(syn).toLowerCase(), c);
        }
    }
    return idx;
}
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
export function resolveMaterialName(ref, aliasReverseIndex, nameToIndex, defaultMaterialType) {
    if (typeof ref === 'number')
        return ref;
    if (typeof ref !== 'string')
        return defaultMaterialType;
    const key = ref.toLowerCase();
    const canonical = aliasReverseIndex.get(key);
    if (canonical === undefined)
        return defaultMaterialType;
    const idx = nameToIndex.get(canonical);
    return idx ?? defaultMaterialType;
}
/**
 * Build the canonical-name → materialType index from the material asset.
 * Names are lowercased for case-insensitive matching against the alias index.
 */
export function buildNameToIndex(asset) {
    const m = new Map();
    for (const mat of asset._soundMaterials) {
        m.set(mat.description.toLowerCase(), mat.materialType);
    }
    return m;
}
/** Convert a raw material asset entry to the C-ABI SoundMaterial shape. */
export function toSoundMaterial(entry) {
    return {
        reflection: entry.reflection,
        absorption: entry.absorption,
        transmission: entry.transmission,
        scattering: entry.scattering,
        index: entry.materialType,
    };
}
//# sourceMappingURL=material-resolver.js.map