import { buildAliasReverseIndex, buildNameToIndex, toSoundMaterial } from './material-resolver.js';
import { assertNeverHrtfMode, fetchJson, HRTF_ASSET_FILES, resolveHrtfLoadMode, type HrtfLoadMode, type HrtfSource, type SoundMaterialAliasAsset, type SoundMaterialAsset } from './SoundTrace-types.js';
import type { SoundTrace } from './SoundTrace.js';

export async function loadHrtf(self: SoundTrace, mode: HrtfLoadMode, source?: HrtfSource): Promise<void> {
  const resolvedMode = resolveHrtfLoadMode(mode);
  const listener = self._sceneListener ?? self.createListener();
  const bytes = await self.readHrtfSource(resolvedMode, source);
  switch (resolvedMode) {
    case 'parametric':
      if (!listener.loadParametricHrtf(bytes)) {
        throw new Error(`[soundtrace.js] failed to load parametric HRTF: ${self.getLastError()}`);
      }
      return;
    case 'convolution':
      if (!listener.loadConvolutionHrtf(bytes)) {
        throw new Error(`[soundtrace.js] failed to load convolution HRTF: ${self.getLastError()}`);
      }
      return;
    default:
      assertNeverHrtfMode(resolvedMode);
  }
}

export async function readHrtfSource(self: SoundTrace, mode: HrtfLoadMode, source: HrtfSource | undefined): Promise<Uint8Array> {
  if (source === undefined || typeof source === 'string' || source instanceof URL) {
    return self.fetchHrtfBytes(self.hrtfUrl(mode, source));
  }
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

export function hrtfUrl(self: SoundTrace, mode: HrtfLoadMode, source: string | URL | undefined): string {
  if (source !== undefined) return source instanceof URL ? source.href : source;
  return new URL(`hrtf/${HRTF_ASSET_FILES[mode]}`, self.assetBaseUrl).href;
}

export async function fetchHrtfBytes(self: SoundTrace, url: string): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[soundtrace.js] failed to fetch HRTF asset ${url}: ${reason}`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`[soundtrace.js] failed to fetch HRTF asset ${url}: HTTP ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function loadMaterialAssets(self: SoundTrace): Promise<void> {
  const matUrl = new URL('soundMaterial.json', self.assetBaseUrl).href;
  const aliasUrl = new URL('soundMaterialAlias.json', self.assetBaseUrl).href;
  const [matRes, aliasRes] = await Promise.all([
    fetchJson(matUrl, 'material data'),
    fetchJson(aliasUrl, 'material alias'),
  ]);
  const matAsset = matRes as SoundMaterialAsset;
  const aliasAsset = aliasRes as SoundMaterialAliasAsset;

  // Register every material into the engine so the indices we hand out
  // actually exist in the wasm-side table.
  const table = self.materials;
  for (const entry of matAsset._soundMaterials) {
    table.add(toSoundMaterial(entry));
  }

  self._nameToIndex = buildNameToIndex(matAsset);
  self._aliasReverseIndex = buildAliasReverseIndex(aliasAsset.aliases);
  self._defaultMaterialType = aliasAsset.defaultMaterialType ?? 0;
}
