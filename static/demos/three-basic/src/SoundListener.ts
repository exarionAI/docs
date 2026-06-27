import type { Bindings, Heap } from './native/index.js';
import type { Disposable } from './Disposable.js';
import { SoundListenerBase } from './SoundListener-base.js';
import { DelayInterpolation, DiffuseQuality, HrtfMode, HrtfQuality, LateReverbMode, isDelayInterpolation, isDiffuseQuality, isHrtfQuality, isLateReverbMode, isSupportedHrtfMode } from './SoundListener-options.js';

export { DelayInterpolation, DiffuseQuality, HrtfMode, HrtfModeName, HrtfQuality, LateReverbMode } from './SoundListener-options.js';

export class SoundListener extends SoundListenerBase implements Disposable {
  private _disposed = false;
  private inPtr = 0;
  private inBytes = 0;
  private outPtr = 0;
  private outBytes = 0;

  get disposed(): boolean { return this._disposed; }

  constructor(b: Bindings, h: Heap) {
    super(b, h);
  }

  private ensureBuffers(inFloats: number, outFloats: number): void {
    const inNeed = inFloats * 4;
    const outNeed = outFloats * 4;
    if (inNeed > this.inBytes) {
      if (this.inPtr) this.h.free(this.inPtr);
      this.inPtr = this.h.malloc(inNeed);
      this.inBytes = inNeed;
    }
    if (outNeed > this.outBytes) {
      if (this.outPtr) this.h.free(this.outPtr);
      this.outPtr = this.h.malloc(outNeed);
      this.outBytes = outNeed;
    }
  }

  /**
   * Render one block in ST mode (called from the main thread).
   * NOTE: current STCoreV2 treats this argument as frameCount, not total
   * interleaved samples. Older 0519-era builds used total sample count here.
   * @param sourceID source ID
   * @param input    interleaved Float32Array (length = frames × channelCount)
   * @param output   output buffer (length = frames × outputChannels)
   */
  render(sourceID: number, input: Float32Array, output: Float32Array, channelCount: number): boolean {
    if (!Number.isInteger(channelCount) || channelCount <= 0 || input.length % channelCount !== 0) {
      throw new Error('[soundtrace.js] render input length must be divisible by channelCount');
    }
    const frameCount = input.length / channelCount;
    this.ensureBuffers(input.length, output.length);
    this.h.writeF32Array(this.inPtr, input);
    const ok = this.b.exaRenderSound(
      this.id, sourceID, this.inPtr, input.length, frameCount, channelCount, this.outPtr, output.length,
    );
    if (ok) output.set(this.h.readF32Array(this.outPtr, output.length));
    return ok;
  }

  // --- per-(listener, source) render-time tunables ---
  // Race-safe — the underlying command queue forwards updates to the audio thread.

  setMaxDelay(sourceID: number, v: number): boolean {
    return this.b.exaSetMaxDelay(this.id, sourceID, v);
  }
  setPathFadeTime(sourceID: number, v: number): boolean {
    return this.b.exaSetPathFadeTime(this.id, sourceID, v);
  }
  setMaxDelayRate(sourceID: number, v: number): boolean {
    return Boolean(this.b.exaSetMaxDelayRate(this.id, sourceID, v));
  }
  getMaxDelayRate(sourceID: number): number {
    return this.h.withScope(s => {
      const p = s.f32();
      if (!this.b.exaGetMaxDelayRate(this.id, sourceID, p)) {
        throw new Error(`[soundtrace.js] failed to get max delay rate: ${this.b.exaGetLastError()}`);
      }
      return this.h.readF32(p);
    });
  }

  setDelayInterpolation(mode: DelayInterpolation): boolean {
    return Boolean(this.b.exaListenerSetDelayInterpolation(this.id, mode));
  }
  getDelayInterpolation(): DelayInterpolation {
    return this.h.withScope(s => {
      const p = s.i32();
      if (!this.b.exaListenerGetDelayInterpolation(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get delay interpolation: ${this.b.exaGetLastError()}`);
      }
      const mode = this.h.readI32(p);
      if (!isDelayInterpolation(mode)) {
        throw new Error(`[soundtrace.js] unsupported delay interpolation from native: ${mode}`);
      }
      return mode;
    });
  }

  setDiffuseEnabled(enabled: boolean): boolean {
    return Boolean(this.b.exaListenerSetDiffuseEnabled(this.id, enabled));
  }
  getDiffuseEnabled(): boolean {
    return this.h.withScope(s => {
      const p = s.bool();
      if (!this.b.exaListenerGetDiffuseEnabled(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get diffuse enabled: ${this.b.exaGetLastError()}`);
      }
      return this.h.readBool(p);
    });
  }

  setDiffuseQuality(quality: DiffuseQuality): boolean {
    return Boolean(this.b.exaListenerSetDiffuseQuality(this.id, quality));
  }
  getDiffuseQuality(): DiffuseQuality {
    return this.h.withScope(s => {
      const p = s.i32();
      if (!this.b.exaListenerGetDiffuseQuality(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get diffuse quality: ${this.b.exaGetLastError()}`);
      }
      const quality = this.h.readI32(p);
      if (!isDiffuseQuality(quality)) {
        throw new Error(`[soundtrace.js] unsupported diffuse quality from native: ${quality}`);
      }
      return quality;
    });
  }

  setHrtfQuality(quality: HrtfQuality): boolean {
    return Boolean(this.b.exaListenerSetHrtfQuality(this.id, quality));
  }
  getHrtfQuality(): HrtfQuality {
    return this.h.withScope(s => {
      const p = s.i32();
      if (!this.b.exaListenerGetHrtfQuality(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get HRTF quality: ${this.b.exaGetLastError()}`);
      }
      const quality = this.h.readI32(p);
      if (!isHrtfQuality(quality)) {
        throw new Error(`[soundtrace.js] unsupported HRTF quality from native: ${quality}`);
      }
      return quality;
    });
  }

  /** Early-path render budget: cap the number of early (direct + reflection /
   *  diffraction) paths rendered per audio block to the `budget` loudest. Bounds
   *  the audio-thread render cost, which scales with the live path count and
   *  spikes while a source moves. The direct path is always kept. `0` =
   *  unbounded (default; behavior unchanged). Race-safe (forwarded to the audio
   *  thread via the render-request snapshot). */
  setEarlyRenderPathBudget(budget: number): boolean {
    if (!Number.isInteger(budget) || budget < 0) {
      throw new Error('[soundtrace.js] earlyRenderPathBudget must be an integer >= 0');
    }
    return Boolean(this.b.exaListenerSetEarlyRenderPathBudget(this.id, budget));
  }
  getEarlyRenderPathBudget(): number {
    return this.h.withScope(s => {
      const p = s.u32();
      if (!this.b.exaListenerGetEarlyRenderPathBudget(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get early render path budget: ${this.b.exaGetLastError()}`);
      }
      return this.h.readU32(p);
    });
  }

  setLateReverbMode(mode: LateReverbMode): boolean {
    return Boolean(this.b.exaListenerSetLateReverbMode(this.id, mode));
  }
  getLateReverbMode(): LateReverbMode {
    return this.h.withScope(s => {
      const p = s.i32();
      if (!this.b.exaListenerGetLateReverbMode(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get late reverb mode: ${this.b.exaGetLastError()}`);
      }
      const mode = this.h.readI32(p);
      if (!isLateReverbMode(mode)) {
        throw new Error(`[soundtrace.js] unsupported late reverb mode from native: ${mode}`);
      }
      return mode;
    });
  }

  setPerBandLateReverb(enabled: boolean): boolean {
    return Boolean(this.b.exaListenerSetPerBandLateReverb(this.id, enabled));
  }
  getPerBandLateReverb(): boolean {
    return this.h.withScope(s => {
      const p = s.bool();
      if (!this.b.exaListenerGetPerBandLateReverb(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get per-band late reverb: ${this.b.exaGetLastError()}`);
      }
      return this.h.readBool(p);
    });
  }

  getHrtfMode(): HrtfMode | null {
    return this.h.withScope(s => {
      const p = s.i32();
      if (!this.b.exaListenerGetHrtfMode(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get HRTF mode: ${this.b.exaGetLastError()}`);
      }
      const mode = this.h.readI32(p);
      return isSupportedHrtfMode(mode) ? mode : null;
    });
  }

  setHrtfMode(mode: HrtfMode, data: Uint8Array): boolean {
    if (mode === HrtfMode.Parametric) return this.loadParametricHrtf(data);
    if (mode === HrtfMode.Convolution) return this.loadConvolutionHrtf(data);
    throw new Error('[soundtrace.js] Unsupported HRTF mode; use parametric or convolution');
  }

  loadParametricHrtf(data: Uint8Array): boolean {
    const loaded = this.loadHrtfTable(data, (ptr, length) =>
      this.b.exaListenerLoadParametricHrtf(this.id, ptr, length));
    return loaded ? Boolean(this.b.exaListenerSetHrtfMode(this.id, HrtfMode.Parametric)) : false;
  }

  loadConvolutionHrtf(data: Uint8Array): boolean {
    const loaded = this.loadHrtfTable(data, (ptr, length) =>
      this.b.exaListenerLoadConvolutionHrtf(this.id, ptr, length));
    return loaded ? Boolean(this.b.exaListenerSetHrtfMode(this.id, HrtfMode.Convolution)) : false;
  }

  private loadHrtfTable(data: Uint8Array, load: (ptr: number, length: number) => boolean): boolean {
    if (data.byteLength === 0) return Boolean(load(0, 0));
    return this.h.withScope(s => {
      const p = s.alloc(data.byteLength);
      this.h.writeBytes(p, data);
      return Boolean(load(p, data.byteLength));
    });
  }

  /** Read `len` floats of statistics — caller supplies the engine-agreed length. */
  getStatistics(sourceID: number, len: number): Float32Array {
    if (!Number.isInteger(len) || len < 3) {
      throw new Error(`[soundtrace.js] statistics length must be an integer >= 3 (got ${len})`);
    }
    return this.h.withScope(s => {
      const p = s.alloc(len * 4);
      if (!this.b.exaGetStatistics(this.id, sourceID, p, len)) {
        const reason = this.b.exaGetLastError();
        throw new Error(`[soundtrace.js] failed to get statistics for source ${sourceID}: ${reason}`);
      }
      return this.h.readF32Array(p, len);
    });
  }

  clearRenderState(): boolean {
    return this.b.exaListenerClearRenderState(this.id);
  }

  /** @inheritdoc */
  dispose(): void {
    if (this._disposed) return;
    if (this.inPtr) this.h.free(this.inPtr);
    if (this.outPtr) this.h.free(this.outPtr);
    this.b.exaDeleteListener(this.id);
    this._disposed = true;
  }
  /** @inheritdoc */
  [Symbol.dispose](): void { this.dispose(); }
}
