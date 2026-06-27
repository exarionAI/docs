import type { MeshBuildOptions } from './SoundMesh.js';
import type {
  CoordinateBasisOption,
  ExecutionMode,
  QualityTier,
  ThreadOption,
  Throughput,
} from './facade.js';

/** Resolved wasm build variant. `thread: 'auto'` resolves to one of these. */
export type ThreadMode = 'st' | 'mt';

export interface SoundTraceOptions {
  /** Execution mode (preferred selector): 'single_thread' | 'multi_thread' |
   *  'gpu'. 'gpu' auto-enables WebGPU during load with CPU fallback. Takes
   *  precedence over `thread`. */
  mode?: ExecutionMode;
  /** Wasm build variant (advanced; `mode` wins if set). 'auto' (default) → 'mt'
   *  when cross-origin isolated, else 'st'. */
  thread?: ThreadOption;
  /** Facade quality tier (per-frame ray work). Default 'balanced'. */
  quality?: QualityTier;
  coordinateBasis?: CoordinateBasisOption;
  /** Propagation throughput tier (worker-thread budget; mt only): 'low' (¼ pool),
   *  'medium' (½ pool), 'max' (-1, full pool). Mapped onto propagationThreadCount;
   *  ignored if propagationThreadCount is set explicitly. */
  throughput?: Throughput;
  coreBaseUrl?: string;
  /** Base URL for packaged runtime assets. Default: `new URL('./assets', import.meta.url).href`. */
  assetBaseUrl?: string;
  /** Advanced raw override of the propagation worker count (>= -1). Takes
   *  precedence over `throughput`. */
  propagationThreadCount?: number;
  defaultMeshBuild?: MeshBuildOptions;
  /** Auto-load `soundMaterial*.json` during load() and register them with the
   *  engine so addMesh({material:'concrete'}) resolves names to indices.
   *  Default true. Set false to skip the fetch (offline/controlled envs). */
  autoLoadMaterials?: boolean;
}

export interface ExaSoundModule {
  _malloc?: (size: number) => number;
  _free?: (ptr: number) => void;
  ccall?: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
    opts?: { async?: boolean },
  ) => unknown;
  cwrap?: <R, A extends unknown[]>(
    ident: string,
    returnType: string | null,
    argTypes: readonly (string | null)[],
  ) => (...args: A) => R;
  UTF8ToString?: (ptr: number, maxBytes?: number) => string;
  stringToUTF8?: (str: string, ptr: number, maxBytes: number) => void;
  lengthBytesUTF8?: (str: string) => number;
  HEAPU8?: Uint8Array;
  HEAP8?: Int8Array;
  HEAPU16?: Uint16Array;
  HEAP16?: Int16Array;
  HEAPU32?: Uint32Array;
  HEAP32?: Int32Array;
  HEAPF32?: Float32Array;
  HEAPF64?: Float64Array;
  // Methods exported only by audio-worklet builds (-sAUDIO_WORKLET=1). Absent
  // in other builds — always check for existence before calling.
  addFunction?: (fn: (...args: unknown[]) => unknown, sig: string) => number;
  removeFunction?: (fnPtr: number) => void;
  // emscripten audio worklet — converts between a JS AudioContext /
  // AudioWorkletNode and a wasm-side handle (int). Auto-exported only by
  // -sAUDIO_WORKLET=1 builds.
  emscriptenRegisterAudioObject?: (obj: AudioContext | AudioNode) => number;
  emscriptenGetAudioObject?: (handle: number) => AudioContext | AudioNode | undefined;
  // mt builds: overrides the glue's default pthread pool size when set.
  pthreadPoolSize?: number;
  [key: string]: unknown;
}

export type ExaSoundFactory = (moduleArg?: Partial<ExaSoundModule>) => Promise<ExaSoundModule>;
