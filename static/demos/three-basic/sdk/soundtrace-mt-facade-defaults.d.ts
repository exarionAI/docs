import type { AudioOption, Vec3 } from './native/index.js';
import type { ListenerCache, SourceCache } from './soundtrace-mt-facade-types.js';
import type { QualityTier, SourcePathOptions } from './facade.js';
export declare function cloneTupleVec3(value: readonly [number, number, number]): Vec3;
export declare function defaultPathOptions(overrides: SourcePathOptions | undefined): SourceCache['paths'];
export declare function defaultAudioOption(sampleRate: number): AudioOption;
export declare function resolveListenerRenderCache(tier: QualityTier): ListenerCache['renderOptions'];
//# sourceMappingURL=soundtrace-mt-facade-defaults.d.ts.map