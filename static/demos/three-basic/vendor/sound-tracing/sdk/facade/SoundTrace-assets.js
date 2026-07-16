import { HrtfMode } from '../engine/SoundListener.js';
import { buildAliasReverseIndex, buildNameToIndex, buildWorkerMaterialPayload, toSoundMaterial } from './material-resolver.js';
import { assertNeverHrtfMode, fetchJson, HRTF_ASSET_FILES, resolveHrtfLoadMode } from './SoundTrace-types.js';
/** Facade mode string -> v0.7 EXA_HRTF_MODE_* value. 'convolution' and
 *  'steamaudio' are legacy aliases of the vendor-neutral HRIR modes. */
function hrtfModeValue(mode) {
    switch (mode) {
        case 'parametric': return HrtfMode.Parametric;
        case 'convolution': return HrtfMode.Hrir;
        case 'steamaudio': return HrtfMode.HrirInterpolated;
        default: return assertNeverHrtfMode(mode);
    }
}
export async function loadHrtf(self, mode, source) {
    const resolvedMode = resolveHrtfLoadMode(mode);
    const bytes = await self.readHrtfSource(resolvedMode, source);
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        await mtFacadeState.loadListenerHrtf(resolvedMode, bytes);
        return;
    }
    const listener = self._sceneListener ?? self.createListener();
    // v0.7 single loader: exaListenerLoadHrtf sniffs the table magic
    // (BPH1/MPI1/SAH1); the spatializer mode is selected separately afterwards.
    if (!listener.loadHrtf(bytes)) {
        throw new Error(`[soundtrace.js] failed to load ${resolvedMode} HRTF: ${self.getLastError()}`);
    }
    if (!listener.setHrtfMode(hrtfModeValue(resolvedMode))) {
        throw new Error(`[soundtrace.js] failed to set ${resolvedMode} HRTF mode: ${self.getLastError()}`);
    }
}
export async function readHrtfSource(self, mode, source) {
    if (source === undefined || typeof source === 'string' || source instanceof URL) {
        return self.fetchHrtfBytes(self.hrtfUrl(mode, source));
    }
    if (source instanceof ArrayBuffer)
        return new Uint8Array(source);
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}
export function hrtfUrl(self, mode, source) {
    if (source !== undefined)
        return source instanceof URL ? source.href : source;
    return new URL(`hrtf/${HRTF_ASSET_FILES[mode]}`, self.assetBaseUrl).href;
}
export async function fetchHrtfBytes(self, url) {
    let response;
    try {
        response = await fetch(url);
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`[soundtrace.js] failed to fetch HRTF asset ${url}: ${reason}`, { cause: error });
    }
    if (!response.ok) {
        throw new Error(`[soundtrace.js] failed to fetch HRTF asset ${url}: HTTP ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
}
async function fetchMaterialAssets(self) {
    const matUrl = new URL('soundMaterial.json', self.assetBaseUrl).href;
    const aliasUrl = new URL('soundMaterialAlias.json', self.assetBaseUrl).href;
    const [matRes, aliasRes] = await Promise.all([
        fetchJson(matUrl, 'material data'),
        fetchJson(aliasUrl, 'material alias'),
    ]);
    return {
        matAsset: matRes,
        aliasAsset: aliasRes,
    };
}
function applyMaterialNameMaps(self, matAsset, aliasAsset) {
    self._nameToIndex = buildNameToIndex(matAsset);
    self._aliasReverseIndex = buildAliasReverseIndex(aliasAsset.aliases);
    self._defaultMaterialType = aliasAsset.defaultMaterialType ?? 0;
}
export async function loadMaterialAssets(self) {
    const { matAsset, aliasAsset } = await fetchMaterialAssets(self);
    // Register every material into the engine so the indices we hand out
    // actually exist in the wasm-side table.
    const table = self.materials;
    for (const entry of matAsset._soundMaterials) {
        table.add(toSoundMaterial(entry));
    }
    applyMaterialNameMaps(self, matAsset, aliasAsset);
}
/**
 * MT counterpart of loadMaterialAssets: builds the same name→index maps and
 * prepares the worker material payload (`_workerMaterials`) without touching
 * the wasm table here — the worker registers the table itself at init from
 * StartupOptions.materials. Must run before buildWorkerStartupOptions().
 * (TASK-0022 A)
 */
export async function prepareWorkerMaterials(self) {
    const { matAsset, aliasAsset } = await fetchMaterialAssets(self);
    self._workerMaterials = buildWorkerMaterialPayload(matAsset);
    applyMaterialNameMaps(self, matAsset, aliasAsset);
}
//# sourceMappingURL=SoundTrace-assets.js.map