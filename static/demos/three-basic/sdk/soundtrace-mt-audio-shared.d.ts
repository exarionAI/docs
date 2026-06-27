export declare const MT_AUDIO_RING_STATE_READ_INDEX = 0;
export declare const MT_AUDIO_RING_STATE_WRITE_INDEX = 1;
export declare const MT_AUDIO_RING_STATE_LENGTH = 2;
export declare const MT_AUDIO_BLOCK_FRAMES = 128;
export declare const MT_AUDIO_RING_CAPACITY_FRAMES = 4096;
export interface MtAudioRing {
    readonly channels: number;
    readonly capacityFrames: number;
    readonly stateBuffer: SharedArrayBuffer;
    readonly sampleBuffer: SharedArrayBuffer;
}
export interface MtAudioSharedBuffers {
    readonly blockFrames: number;
    readonly channels: number;
    readonly input: MtAudioRing;
    readonly output: MtAudioRing;
}
export interface MtAudioRingView {
    readonly channels: number;
    readonly capacityFrames: number;
    readonly state: Int32Array;
    readonly samples: Float32Array;
}
export declare function createMtAudioSharedBuffers(channels: number, options?: {
    readonly blockFrames?: number;
    readonly capacityFrames?: number;
}): MtAudioSharedBuffers;
export declare function createMtAudioRingView(ring: MtAudioRing): MtAudioRingView;
export declare function getReadableFrameCount(view: MtAudioRingView): number;
export declare function getWritableFrameCount(view: MtAudioRingView): number;
export declare function writeInterleavedFrames(view: MtAudioRingView, source: Float32Array, frameCount: number): boolean;
export declare function readInterleavedFrames(view: MtAudioRingView, destination: Float32Array, frameCount: number): number;
//# sourceMappingURL=soundtrace-mt-audio-shared.d.ts.map