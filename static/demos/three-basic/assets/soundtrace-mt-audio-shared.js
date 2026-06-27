export const MT_AUDIO_RING_STATE_READ_INDEX = 0;
export const MT_AUDIO_RING_STATE_WRITE_INDEX = 1;
export const MT_AUDIO_RING_STATE_LENGTH = 2;
export const MT_AUDIO_BLOCK_FRAMES = 128;
export const MT_AUDIO_RING_CAPACITY_FRAMES = 4096;
export function createMtAudioSharedBuffers(channels, options = {}) {
    ensureSharedAudioSupport();
    const blockFrames = options.blockFrames ?? MT_AUDIO_BLOCK_FRAMES;
    const capacityFrames = options.capacityFrames ?? MT_AUDIO_RING_CAPACITY_FRAMES;
    validateAudioDimensions(channels, blockFrames, capacityFrames);
    return {
        blockFrames,
        channels,
        input: createMtAudioRing(channels, capacityFrames),
        output: createMtAudioRing(channels, capacityFrames),
    };
}
export function createMtAudioRingView(ring) {
    validateAudioDimensions(ring.channels, 1, ring.capacityFrames);
    return {
        channels: ring.channels,
        capacityFrames: ring.capacityFrames,
        state: new Int32Array(ring.stateBuffer),
        samples: new Float32Array(ring.sampleBuffer),
    };
}
export function getReadableFrameCount(view) {
    const writeFrame = Atomics.load(view.state, MT_AUDIO_RING_STATE_WRITE_INDEX);
    const readFrame = Atomics.load(view.state, MT_AUDIO_RING_STATE_READ_INDEX);
    return Math.max(0, writeFrame - readFrame);
}
export function getWritableFrameCount(view) {
    return view.capacityFrames - getReadableFrameCount(view);
}
export function writeInterleavedFrames(view, source, frameCount) {
    if (frameCount < 0 || !Number.isInteger(frameCount)) {
        throw new Error(`[soundtrace.js] frameCount must be a non-negative integer (got ${frameCount})`);
    }
    if (source.length < frameCount * view.channels) {
        throw new Error(`[soundtrace.js] source length ${source.length} is too small for ${frameCount} frames x ${view.channels} channels`);
    }
    if (getWritableFrameCount(view) < frameCount) {
        return false;
    }
    const writeFrame = Atomics.load(view.state, MT_AUDIO_RING_STATE_WRITE_INDEX);
    copyFramesIntoRing(view, source, frameCount, writeFrame);
    Atomics.store(view.state, MT_AUDIO_RING_STATE_WRITE_INDEX, writeFrame + frameCount);
    return true;
}
export function readInterleavedFrames(view, destination, frameCount) {
    if (frameCount < 0 || !Number.isInteger(frameCount)) {
        throw new Error(`[soundtrace.js] frameCount must be a non-negative integer (got ${frameCount})`);
    }
    if (destination.length < frameCount * view.channels) {
        throw new Error(`[soundtrace.js] destination length ${destination.length} is too small for ${frameCount} frames x ${view.channels} channels`);
    }
    const readableFrames = getReadableFrameCount(view);
    const framesToRead = Math.min(frameCount, readableFrames);
    if (framesToRead === 0) {
        return 0;
    }
    const readFrame = Atomics.load(view.state, MT_AUDIO_RING_STATE_READ_INDEX);
    copyFramesFromRing(view, destination, framesToRead, readFrame);
    Atomics.store(view.state, MT_AUDIO_RING_STATE_READ_INDEX, readFrame + framesToRead);
    return framesToRead;
}
function ensureSharedAudioSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        throw new Error('[soundtrace.js] SharedArrayBuffer is required for MT audio');
    }
}
function validateAudioDimensions(channels, blockFrames, capacityFrames) {
    if (!Number.isInteger(channels) || channels < 1) {
        throw new Error(`[soundtrace.js] channels must be an integer >= 1 (got ${channels})`);
    }
    if (!Number.isInteger(blockFrames) || blockFrames < 1) {
        throw new Error(`[soundtrace.js] blockFrames must be an integer >= 1 (got ${blockFrames})`);
    }
    if (!Number.isInteger(capacityFrames) || capacityFrames < blockFrames) {
        throw new Error(`[soundtrace.js] capacityFrames must be an integer >= blockFrames (got ${capacityFrames}, blockFrames=${blockFrames})`);
    }
}
function createMtAudioRing(channels, capacityFrames) {
    return {
        channels,
        capacityFrames,
        stateBuffer: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MT_AUDIO_RING_STATE_LENGTH),
        sampleBuffer: new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * capacityFrames * channels),
    };
}
function copyFramesIntoRing(view, source, frameCount, writeFrame) {
    const frameStride = view.channels;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const ringFrameIndex = (writeFrame + frameIndex) % view.capacityFrames;
        const ringOffset = ringFrameIndex * frameStride;
        const sourceOffset = frameIndex * frameStride;
        for (let channelIndex = 0; channelIndex < frameStride; channelIndex += 1) {
            const sample = source[sourceOffset + channelIndex];
            if (sample === undefined) {
                throw new Error(`[soundtrace.js] missing input sample for frame ${frameIndex} channel ${channelIndex}`);
            }
            view.samples[ringOffset + channelIndex] = sample;
        }
    }
}
function copyFramesFromRing(view, destination, frameCount, readFrame) {
    const frameStride = view.channels;
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const ringFrameIndex = (readFrame + frameIndex) % view.capacityFrames;
        const ringOffset = ringFrameIndex * frameStride;
        const destinationOffset = frameIndex * frameStride;
        for (let channelIndex = 0; channelIndex < frameStride; channelIndex += 1) {
            destination[destinationOffset + channelIndex] =
                view.samples[ringOffset + channelIndex] ?? 0;
        }
    }
}
//# sourceMappingURL=soundtrace-mt-audio-shared.js.map