import { createMtAudioRingView, getReadableFrameCount, getWritableFrameCount, readInterleavedFrames, writeInterleavedFrames, } from './soundtrace-mt-audio-shared.js';
const AUDIO_PUMP_INTERVAL_MS = 4;
export class ControlWorkerAudioRenderer {
    bindings;
    heap;
    getListenerId;
    sessions = new Map();
    timer = null;
    constructor(bindings, heap, getListenerId) {
        this.bindings = bindings;
        this.heap = heap;
        this.getListenerId = getListenerId;
    }
    startSourceSession(command) {
        this.stopSourceSession(command.sessionId);
        const inputView = createMtAudioRingView(command.shared.input);
        const outputView = createMtAudioRingView(command.shared.output);
        const blockSampleCount = command.shared.blockFrames * command.shared.channels;
        const session = {
            channels: command.shared.channels,
            sessionId: command.sessionId,
            engineId: command.engineId,
            blockFrames: command.shared.blockFrames,
            blockSampleCount,
            inputView,
            outputView,
            inputBlock: new Float32Array(blockSampleCount),
            outputBlock: new Float32Array(blockSampleCount),
            inputPtr: this.heap.malloc(Float32Array.BYTES_PER_ELEMENT * blockSampleCount),
            outputPtr: this.heap.malloc(Float32Array.BYTES_PER_ELEMENT * blockSampleCount),
        };
        this.sessions.set(command.sessionId, session);
        this.ensurePumpStarted();
        this.pump();
        return {
            sessionId: command.sessionId,
            started: true,
        };
    }
    stopSourceSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return {
                sessionId,
                stopped: false,
            };
        }
        this.sessions.delete(sessionId);
        this.heap.free(session.inputPtr);
        this.heap.free(session.outputPtr);
        if (this.sessions.size === 0) {
            this.stopPump();
        }
        return {
            sessionId,
            stopped: true,
        };
    }
    dispose() {
        for (const sessionId of [...this.sessions.keys()]) {
            this.stopSourceSession(sessionId);
        }
        this.stopPump();
    }
    ensurePumpStarted() {
        if (this.timer !== null) {
            return;
        }
        this.timer = setInterval(() => {
            this.pump();
        }, AUDIO_PUMP_INTERVAL_MS);
    }
    stopPump() {
        if (this.timer === null) {
            return;
        }
        clearInterval(this.timer);
        this.timer = null;
    }
    pump() {
        for (const session of this.sessions.values()) {
            this.pumpSession(session);
        }
    }
    pumpSession(session) {
        while (getReadableFrameCount(session.inputView) >= session.blockFrames
            && getWritableFrameCount(session.outputView) >= session.blockFrames) {
            const framesRead = readInterleavedFrames(session.inputView, session.inputBlock, session.blockFrames);
            if (framesRead !== session.blockFrames) {
                return;
            }
            this.heap.writeF32Array(session.inputPtr, session.inputBlock);
            const ok = this.bindings.exaRenderSound(this.getListenerId(), session.engineId, session.inputPtr, session.blockSampleCount, session.blockFrames, session.channels, session.outputPtr, session.blockSampleCount);
            if (!ok) {
                const lastError = this.bindings.exaGetLastError();
                console.error(`[soundtrace.js] mt audio render failed for session ${session.sessionId}: ${lastError || 'unknown error'}`);
                this.stopSourceSession(session.sessionId);
                return;
            }
            session.outputBlock.set(this.heap.readF32Array(session.outputPtr, session.blockSampleCount));
            if (!writeInterleavedFrames(session.outputView, session.outputBlock, session.blockFrames)) {
                return;
            }
        }
    }
}
//# sourceMappingURL=control-worker-audio.js.map