import { SoundListener } from './SoundListener.js';
import { SoundSource } from './SoundSource.js';
import { Source } from './facade.js';
import type { ExaSoundModule } from './types.js';
import type { SoundTrace } from './SoundTrace.js';
export declare function playSource(self: SoundTrace, source: Source, channels: number): Promise<AudioWorkletNode>;
export declare function createWorkletNode(self: SoundTrace, listener: SoundListener, source: SoundSource, channels?: number): Promise<AudioWorkletNode>;
export declare function createMtAudioWorkletNode(self: SoundTrace, sourceHandle: number, channels: number): Promise<AudioWorkletNode>;
export declare function pumpMtControlLoop(self: SoundTrace): void;
export declare function createMixerWorkletNode(self: SoundTrace, listener: SoundListener, sources: readonly SoundSource[], channels?: number): Promise<AudioWorkletNode>;
export declare function audioWorkletNodeFromHandle(self: SoundTrace, handle: number): AudioWorkletNode;
export declare function ensureWorkletReady(self: SoundTrace): Promise<void>;
export declare function bootstrapWorklet(self: SoundTrace): Promise<void>;
export declare function requireModule(self: SoundTrace): ExaSoundModule;
export declare function ensureMtAudioWorkletReady(self: SoundTrace): Promise<void>;
export declare function loadMtAudioWorkletModule(self: SoundTrace): Promise<void>;
//# sourceMappingURL=SoundTrace-audio.d.ts.map