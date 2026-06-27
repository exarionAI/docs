import { type HrtfLoadMode, type HrtfSource } from './SoundTrace-types.js';
import type { SoundTrace } from './SoundTrace.js';
export declare function loadHrtf(self: SoundTrace, mode: HrtfLoadMode, source?: HrtfSource): Promise<void>;
export declare function readHrtfSource(self: SoundTrace, mode: HrtfLoadMode, source: HrtfSource | undefined): Promise<Uint8Array>;
export declare function hrtfUrl(self: SoundTrace, mode: HrtfLoadMode, source: string | URL | undefined): string;
export declare function fetchHrtfBytes(self: SoundTrace, url: string): Promise<Uint8Array>;
export declare function loadMaterialAssets(self: SoundTrace): Promise<void>;
//# sourceMappingURL=SoundTrace-assets.d.ts.map