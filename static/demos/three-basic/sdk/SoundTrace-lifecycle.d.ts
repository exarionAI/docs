import { type MeshBuildOption, type RuntimeOption, type STOption } from './native/index.js';
import { SoundListener } from './SoundListener.js';
import { SoundTraceMtFacadeState } from './soundtrace-mt-facade-state.js';
import type { StartupOptions } from './control-protocol.js';
import type { SoundTrace } from './SoundTrace.js';
export declare function loadSoundTrace(self: SoundTrace): Promise<void>;
export declare function loadSingleThreadCore(self: SoundTrace): Promise<void>;
export declare function loadWorkerHostedControl(self: SoundTrace): Promise<void>;
export declare function enableGpu(self: SoundTrace): Promise<boolean>;
export declare function buildWorkerStartupOptions(self: SoundTrace): StartupOptions;
export declare function resolveWorkerPthreadPoolSize(self: SoundTrace): number;
export declare function getMtFacadeState(self: SoundTrace): SoundTraceMtFacadeState | null;
export declare function applyStartupOptions(self: SoundTrace): void;
export declare function applyQualityPreset(self: SoundTrace, listener: SoundListener, preset?: STOption): void;
export declare function getRuntimeOption(self: SoundTrace): RuntimeOption;
export declare function getDefaultMeshBuildOption(self: SoundTrace): MeshBuildOption;
//# sourceMappingURL=SoundTrace-lifecycle.d.ts.map