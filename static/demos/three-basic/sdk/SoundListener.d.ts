import type { Bindings, Heap } from './native/index.js';
import type { Disposable } from './Disposable.js';
import { SoundListenerBase } from './SoundListener-base.js';
import { DelayInterpolation, DiffuseQuality, HrtfMode, HrtfQuality, LateReverbMode } from './SoundListener-options.js';
export { DelayInterpolation, DiffuseQuality, HrtfMode, HrtfModeName, HrtfQuality, LateReverbMode } from './SoundListener-options.js';
export declare class SoundListener extends SoundListenerBase implements Disposable {
    private _disposed;
    private inPtr;
    private inBytes;
    private outPtr;
    private outBytes;
    get disposed(): boolean;
    constructor(b: Bindings, h: Heap);
    private ensureBuffers;
    /**
     * Render one block in ST mode (called from the main thread).
     * NOTE: current STCoreV2 treats this argument as frameCount, not total
     * interleaved samples. Older 0519-era builds used total sample count here.
     * @param sourceID source ID
     * @param input    interleaved Float32Array (length = frames × channelCount)
     * @param output   output buffer (length = frames × outputChannels)
     */
    render(sourceID: number, input: Float32Array, output: Float32Array, channelCount: number): boolean;
    setMaxDelay(sourceID: number, v: number): boolean;
    setPathFadeTime(sourceID: number, v: number): boolean;
    setMaxDelayRate(sourceID: number, v: number): boolean;
    getMaxDelayRate(sourceID: number): number;
    setDelayInterpolation(mode: DelayInterpolation): boolean;
    getDelayInterpolation(): DelayInterpolation;
    setDiffuseEnabled(enabled: boolean): boolean;
    getDiffuseEnabled(): boolean;
    setDiffuseQuality(quality: DiffuseQuality): boolean;
    getDiffuseQuality(): DiffuseQuality;
    setHrtfQuality(quality: HrtfQuality): boolean;
    getHrtfQuality(): HrtfQuality;
    /** Early-path render budget: cap the number of early (direct + reflection /
     *  diffraction) paths rendered per audio block to the `budget` loudest. Bounds
     *  the audio-thread render cost, which scales with the live path count and
     *  spikes while a source moves. The direct path is always kept. `0` =
     *  unbounded (default; behavior unchanged). Race-safe (forwarded to the audio
     *  thread via the render-request snapshot). */
    setEarlyRenderPathBudget(budget: number): boolean;
    getEarlyRenderPathBudget(): number;
    setLateReverbMode(mode: LateReverbMode): boolean;
    getLateReverbMode(): LateReverbMode;
    setPerBandLateReverb(enabled: boolean): boolean;
    getPerBandLateReverb(): boolean;
    getHrtfMode(): HrtfMode | null;
    setHrtfMode(mode: HrtfMode, data: Uint8Array): boolean;
    loadParametricHrtf(data: Uint8Array): boolean;
    loadConvolutionHrtf(data: Uint8Array): boolean;
    private loadHrtfTable;
    /** Read `len` floats of statistics — caller supplies the engine-agreed length. */
    getStatistics(sourceID: number, len: number): Float32Array;
    clearRenderState(): boolean;
    /** @inheritdoc */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
}
//# sourceMappingURL=SoundListener.d.ts.map