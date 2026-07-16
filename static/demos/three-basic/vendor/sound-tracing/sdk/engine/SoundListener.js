import { RENDER_STATS_SIZE, isOk, readRenderStats, requireOk, writeRenderStatsHeader } from '../native/index.js';
import { SoundListenerBase } from './SoundListener-base.js';
import { isDelayInterpolation, isOutputMode, isSupportedHrtfMode } from './SoundListener-options.js';
export { DelayInterpolation, DiffusePathBudget, HrtfMode, HrtfModeName, HrtfPathBudget, OutputMode } from './SoundListener-options.js';
export class SoundListener extends SoundListenerBase {
    _disposed = false;
    inPtr = 0;
    inBytes = 0;
    outPtr = 0;
    outBytes = 0;
    get disposed() { return this._disposed; }
    constructor(b, h) {
        super(b, h);
    }
    ensureBuffers(inFloats, outFloats) {
        const inNeed = inFloats * 4;
        const outNeed = outFloats * 4;
        // Invalidate the cache BEFORE free/malloc: Heap.malloc THROWS on failure,
        // and a stale {ptr, bytes} pair would satisfy the next call from the freed
        // block (use-after-free) and let dispose free it again (finding #13).
        if (inNeed > this.inBytes) {
            const prev = this.inPtr;
            this.inPtr = 0;
            this.inBytes = 0;
            if (prev)
                this.h.free(prev);
            this.inPtr = this.h.malloc(inNeed);
            this.inBytes = inNeed;
        }
        if (outNeed > this.outBytes) {
            const prev = this.outPtr;
            this.outPtr = 0;
            this.outBytes = 0;
            if (prev)
                this.h.free(prev);
            this.outPtr = this.h.malloc(outNeed);
            this.outBytes = outNeed;
        }
    }
    /**
     * Render one block in ST mode (called from the main thread).
     *
     * v0.7 ExaResult semantics: EXA_OK (spatialized) and EXA_OK_BYPASSED (dry
     * pass-through — the source has no propagated IR yet) BOTH produce output;
     * only a negative result is a render failure. This method copies the output
     * and returns true for both success shapes (the truthiness FLIP is handled
     * here — never `if (ret)` an ExaResult).
     *
     * @param sourceID source ID
     * @param input    interleaved Float32Array (length = frames × channelCount)
     * @param output   output buffer (length = frames × outputChannels)
     */
    render(sourceID, input, output, channelCount) {
        if (!Number.isInteger(channelCount) || channelCount <= 0 || input.length % channelCount !== 0) {
            throw new Error('[soundtrace.js] render input length must be divisible by channelCount');
        }
        const frameCount = input.length / channelCount;
        this.ensureBuffers(input.length, output.length);
        this.h.writeF32Array(this.inPtr, input);
        const result = this.b.exaRenderSound(this.id, sourceID, this.inPtr, input.length, frameCount, channelCount, this.outPtr, output.length);
        const ok = isOk(result); // EXA_OK or EXA_OK_BYPASSED — output was produced
        if (ok)
            output.set(this.h.readF32Array(this.outPtr, output.length));
        return ok;
    }
    /** Cumulative audio-thread exaRenderSound failure count for this listener
     *  (control-thread observable; the audio thread cannot surface its errors
     *  through exaGetLastError). */
    getRenderErrorCount() {
        return Number(this.b.exaGetRenderErrorCount(this.id));
    }
    // --- per-(listener, source) render-time tunables ---
    // Race-safe — the underlying command queue forwards updates to the audio thread.
    setMaxDelay(sourceID, seconds) {
        return isOk(this.b.exaRenderSetMaxDelay(this.id, sourceID, seconds));
    }
    getMaxDelay(sourceID) {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaRenderGetMaxDelay(this.id, sourceID, p), 'exaRenderGetMaxDelay', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    setPathFadeTime(sourceID, seconds) {
        return isOk(this.b.exaRenderSetPathFadeTime(this.id, sourceID, seconds));
    }
    getPathFadeTime(sourceID) {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaRenderGetPathFadeTime(this.id, sourceID, p), 'exaRenderGetPathFadeTime', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    setMaxDelayRate(sourceID, v) {
        return isOk(this.b.exaRenderSetMaxDelayRate(this.id, sourceID, v));
    }
    getMaxDelayRate(sourceID) {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaRenderGetMaxDelayRate(this.id, sourceID, p), 'exaRenderGetMaxDelayRate', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    setDelayInterpolation(mode) {
        return isOk(this.b.exaListenerSetDelayInterpolation(this.id, mode));
    }
    getDelayInterpolation() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaListenerGetDelayInterpolation(this.id, p), 'exaListenerGetDelayInterpolation', this.b.exaGetLastError);
            const mode = this.h.readI32(p);
            if (!isDelayInterpolation(mode)) {
                throw new Error(`[soundtrace.js] unsupported delay interpolation from native: ${mode}`);
            }
            return mode;
        });
    }
    setDiffuseEnabled(enabled) {
        return isOk(this.b.exaListenerSetDiffuseEnabled(this.id, enabled));
    }
    getDiffuseEnabled() {
        return this.h.withScope(s => {
            const p = s.i32(); // ExaBool out-param is int32 in v0.7
            requireOk(this.b.exaListenerIsDiffuseEnabled(this.id, p), 'exaListenerIsDiffuseEnabled', this.b.exaGetLastError);
            return this.h.readI32(p) !== 0;
        });
    }
    /** Diffuse-rain path budget — a RAW top-K count (v0.7 replaced the LOW/MED/
     *  HIGH quality enum). Documented operating points: DiffusePathBudget.*. */
    setDiffusePathBudget(budget) {
        if (!Number.isInteger(budget) || budget < 0) {
            throw new Error('[soundtrace.js] diffusePathBudget must be an integer >= 0');
        }
        return isOk(this.b.exaListenerSetDiffusePathBudget(this.id, budget));
    }
    getDiffusePathBudget() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaListenerGetDiffusePathBudget(this.id, p), 'exaListenerGetDiffusePathBudget', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    /** HRTF path budget — RAW top-K full-voice paths (v0.7). Only affects the
     *  table-backed modes; BAND8 spatializes every path already. */
    setHrtfPathBudget(budget) {
        if (!Number.isInteger(budget) || budget < 0) {
            throw new Error('[soundtrace.js] hrtfPathBudget must be an integer >= 0');
        }
        return isOk(this.b.exaListenerSetHrtfPathBudget(this.id, budget));
    }
    getHrtfPathBudget() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaListenerGetHrtfPathBudget(this.id, p), 'exaListenerGetHrtfPathBudget', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    /** Early-path render budget: cap the number of early (direct + reflection /
     *  diffraction) paths rendered per audio block to the `budget` loudest. Bounds
     *  the audio-thread render cost, which scales with the live path count and
     *  spikes while a source moves. The direct path is always kept. `0` =
     *  unbounded (default; behavior unchanged). Race-safe (forwarded to the audio
     *  thread via the render-request snapshot). Native name: exaListenerSetEarlyPathBudget. */
    setEarlyRenderPathBudget(budget) {
        if (!Number.isInteger(budget) || budget < 0) {
            throw new Error('[soundtrace.js] earlyRenderPathBudget must be an integer >= 0');
        }
        return isOk(this.b.exaListenerSetEarlyPathBudget(this.id, budget));
    }
    getEarlyRenderPathBudget() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaListenerGetEarlyPathBudget(this.id, p), 'exaListenerGetEarlyPathBudget', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    /** Current table-backed HRTF mode, or null when the listener renders with
     *  the table-free BAND8 default. */
    getHrtfMode() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaListenerGetHrtfMode(this.id, p), 'exaListenerGetHrtfMode', this.b.exaGetLastError);
            const mode = this.h.readI32(p);
            return isSupportedHrtfMode(mode) ? mode : null;
        });
    }
    setLateReverbToneCorrection(enabled) {
        void enabled;
        return false;
    }
    setAmbisonicHybrid(enabled) {
        return isOk(this.b.exaListenerSetAmbisonicHybridEnabled(this.id, enabled));
    }
    getAmbisonicHybrid() {
        return this.h.withScope(s => {
            const p = s.i32(); // ExaBool out-param is int32 in v0.7
            requireOk(this.b.exaListenerIsAmbisonicHybridEnabled(this.id, p), 'exaListenerIsAmbisonicHybridEnabled', this.b.exaGetLastError);
            return this.h.readI32(p) !== 0;
        });
    }
    /** Listener output mode (EXA_OUTPUT_MODE_*): Hrtf (default binaural) or
     *  Speaker (internal Ambisonic speaker renderer, 1ch/2ch scope). Out-of-range
     *  is rejected by the core. Core 7efb8b87. */
    setOutputMode(mode) {
        return isOk(this.b.exaListenerSetOutputMode(this.id, mode));
    }
    getOutputMode() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaListenerGetOutputMode(this.id, p), 'exaListenerGetOutputMode', this.b.exaGetLastError);
            const mode = this.h.readI32(p);
            if (!isOutputMode(mode)) {
                throw new Error(`[soundtrace.js] unsupported output mode from native: ${mode}`);
            }
            return mode;
        });
    }
    /** Number of mono impulse-response samples exaRenderMonoImpulseResponse would
     *  write for `seconds` at the current listener sample rate — ceil(seconds *
     *  sampleRate). 0 when listener/seconds/sample-rate is invalid. Use to size
     *  the render buffer. Core 7efb8b87. */
    getMonoImpulseResponseSampleCount(seconds) {
        return this.b.exaGetMonoImpulseResponseSampleCount(this.id, seconds);
    }
    /** Render a mono impulse response by driving the current (listener, source)
     *  render state with a unit delta impulse. Offline/control-thread helper for
     *  inspection and baking (NOT a realtime audio callback). The listener MUST be
     *  configured for 1 output channel (setAudioOption); the current output mode
     *  is respected. Returns the rendered samples; an empty Float32Array when the
     *  sample count is 0 (invalid listener/seconds/sample-rate). Throws on a
     *  native error (non-mono listener / bad handle / offline render failure).
     *  Core 7efb8b87. */
    renderMonoImpulseResponse(sourceID, seconds) {
        const sampleCount = this.getMonoImpulseResponseSampleCount(seconds);
        if (sampleCount <= 0)
            return new Float32Array(0);
        return this.h.withScope(s => {
            const p = s.block(sampleCount * 4);
            requireOk(this.b.exaRenderMonoImpulseResponse(this.id, sourceID, seconds, p, sampleCount), 'exaRenderMonoImpulseResponse', this.b.exaGetLastError);
            return this.h.readF32Array(p, sampleCount);
        });
    }
    /**
     * Load an HRTF table through the single vendor-neutral v0.7 loader
     * (exaListenerLoadHrtf): the container format is auto-detected from the
     * 4-byte magic — BPH1 (parametric), MPI1 (min-phase HRIR: enables BOTH Hrir
     * and HrirInterpolated), legacy SAH1 (HrirInterpolated only). Loading does
     * NOT switch the active mode — call setHrtfMode() afterwards.
     */
    loadHrtf(data) {
        if (data.byteLength === 0) {
            return isOk(this.b.exaListenerLoadHrtf(this.id, 0, 0));
        }
        return this.h.withScope(s => {
            const p = s.alloc(data.byteLength);
            this.h.writeBytes(p, data);
            return isOk(this.b.exaListenerLoadHrtf(this.id, p, data.byteLength));
        });
    }
    /** Select the HRTF spatializer mode. Selecting a table-backed mode with no
     *  resident table fails with EXA_ERR_NOT_LOADED (no silent BAND8 fallback) —
     *  load the table first via loadHrtf(). */
    setHrtfMode(mode) {
        return isOk(this.b.exaListenerSetHrtfMode(this.id, mode));
    }
    /** Bitmask of EXA_HRTF_KIND_* — which HRTF tables are resident (0 = none;
     *  BAND8 always renders without a table). Discovers what setHrtfMode will
     *  accept without EXA_ERR_NOT_LOADED. */
    getLoadedHrtfKinds() {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaListenerGetLoadedHrtfKinds(this.id, p), 'exaListenerGetLoadedHrtfKinds', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    /** Per-source render statistics as the v0.7 versioned ExaRenderStats struct
     *  (replaces the old 21-float positional exaGetStatistics array). */
    getRenderStats(sourceID) {
        return this.h.withScope(s => {
            const p = s.block(RENDER_STATS_SIZE);
            writeRenderStatsHeader(this.h, p);
            requireOk(this.b.exaRenderGetStats(this.id, sourceID, p), 'exaRenderGetStats', this.b.exaGetLastError);
            return readRenderStats(this.h, p);
        });
    }
    clearRenderState() {
        return isOk(this.b.exaRenderClearState(this.id));
    }
    /** @inheritdoc */
    dispose() {
        if (this._disposed)
            return;
        if (this.inPtr)
            this.h.free(this.inPtr);
        if (this.outPtr)
            this.h.free(this.outPtr);
        this.b.exaListenerDestroy(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundListener.js.map