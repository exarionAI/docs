import { MT_AUDIO_BLOCK_FRAMES, MT_AUDIO_RING_CAPACITY_FRAMES, MT_AUDIO_RING_STATE_LENGTH, MT_AUDIO_RING_STATE_READ_INDEX, MT_AUDIO_RING_STATE_WRITE_INDEX, } from './soundtrace-mt-audio-shared.js';
export const MT_AUDIO_WORKLET_PROCESSOR_NAME = 'soundtrace-mt-audio-bridge';
export function createMtAudioWorkletModuleSource(processorName = MT_AUDIO_WORKLET_PROCESSOR_NAME) {
    return `
const READ_INDEX = ${String(MT_AUDIO_RING_STATE_READ_INDEX)};
const WRITE_INDEX = ${String(MT_AUDIO_RING_STATE_WRITE_INDEX)};
const STATE_LENGTH = ${String(MT_AUDIO_RING_STATE_LENGTH)};
const DEFAULT_BLOCK_FRAMES = ${String(MT_AUDIO_BLOCK_FRAMES)};
const DEFAULT_CAPACITY_FRAMES = ${String(MT_AUDIO_RING_CAPACITY_FRAMES)};

function readAvailableFrames(state) {
  const writeFrame = Atomics.load(state, WRITE_INDEX);
  const readFrame = Atomics.load(state, READ_INDEX);
  return Math.max(0, writeFrame - readFrame);
}

function writeFrames(state, samples, capacityFrames, channels, interleaved, frameCount) {
  const available = readAvailableFrames(state);
  if (capacityFrames - available < frameCount) {
    return false;
  }
  const writeFrame = Atomics.load(state, WRITE_INDEX);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const ringFrameIndex = (writeFrame + frameIndex) % capacityFrames;
    const ringOffset = ringFrameIndex * channels;
    const sourceOffset = frameIndex * channels;
    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      samples[ringOffset + channelIndex] = interleaved[sourceOffset + channelIndex] ?? 0;
    }
  }
  Atomics.store(state, WRITE_INDEX, writeFrame + frameCount);
  return true;
}

function readFrames(state, samples, capacityFrames, channels, output, frameCount) {
  const available = readAvailableFrames(state);
  const framesToRead = Math.min(frameCount, available);
  const readFrame = Atomics.load(state, READ_INDEX);
  for (let frameIndex = 0; frameIndex < framesToRead; frameIndex += 1) {
    const ringFrameIndex = (readFrame + frameIndex) % capacityFrames;
    const ringOffset = ringFrameIndex * channels;
    const outputOffset = frameIndex * channels;
    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      output[outputOffset + channelIndex] = samples[ringOffset + channelIndex] ?? 0;
    }
  }
  Atomics.store(state, READ_INDEX, readFrame + framesToRead);
  return framesToRead;
}

class SoundTraceMtAudioBridgeProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options.processorOptions ?? {};
    this.channels = processorOptions.channels ?? 2;
    this.blockFrames = processorOptions.blockFrames ?? DEFAULT_BLOCK_FRAMES;
    this.inputCapacityFrames = processorOptions.input?.capacityFrames ?? DEFAULT_CAPACITY_FRAMES;
    this.outputCapacityFrames = processorOptions.output?.capacityFrames ?? DEFAULT_CAPACITY_FRAMES;
    this.inputState = new Int32Array(processorOptions.input.stateBuffer);
    this.inputSamples = new Float32Array(processorOptions.input.sampleBuffer);
    this.outputState = new Int32Array(processorOptions.output.stateBuffer);
    this.outputSamples = new Float32Array(processorOptions.output.sampleBuffer);
    if (this.inputState.length < STATE_LENGTH || this.outputState.length < STATE_LENGTH) {
      throw new Error('[soundtrace.js] invalid MT audio ring state buffer');
    }
    this.interleavedInput = new Float32Array(this.blockFrames * this.channels);
    this.interleavedOutput = new Float32Array(this.blockFrames * this.channels);
  }

  process(inputs, outputs) {
    const inputChannels = inputs[0] ?? [];
    const outputChannels = outputs[0] ?? [];
    const frameCount = outputChannels[0]?.length ?? this.blockFrames;
    this.interleavedInput.fill(0);
    this.interleavedOutput.fill(0);

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      for (let channelIndex = 0; channelIndex < this.channels; channelIndex += 1) {
        const sourceChannel =
          inputChannels[channelIndex]
          ?? inputChannels[0]
          ?? null;
        const sample = sourceChannel?.[frameIndex] ?? 0;
        this.interleavedInput[frameIndex * this.channels + channelIndex] = sample;
      }
    }

    writeFrames(
      this.inputState,
      this.inputSamples,
      this.inputCapacityFrames,
      this.channels,
      this.interleavedInput,
      frameCount,
    );
    const framesRead = readFrames(
      this.outputState,
      this.outputSamples,
      this.outputCapacityFrames,
      this.channels,
      this.interleavedOutput,
      frameCount,
    );

    for (let channelIndex = 0; channelIndex < outputChannels.length; channelIndex += 1) {
      const outputChannel = outputChannels[channelIndex];
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        if (frameIndex >= framesRead) {
          outputChannel[frameIndex] = 0;
          continue;
        }
        outputChannel[frameIndex] =
          this.interleavedOutput[frameIndex * this.channels + channelIndex] ?? 0;
      }
    }

    return true;
  }
}

registerProcessor(${JSON.stringify(processorName)}, SoundTraceMtAudioBridgeProcessor);
`;
}
//# sourceMappingURL=soundtrace-mt-audio-worklet.js.map