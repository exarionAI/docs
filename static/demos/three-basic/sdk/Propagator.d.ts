import type { Bindings, Heap, AmbientSoundPath, GuidePlane, MirrorPosition, PerceptualDepthOption, PropagationFrameTiming, PropagationJobTimingOption, PropagatorProfile } from './native/index.js';
import type { PathData } from './native/index.js';
import type { Disposable } from './Disposable.js';
/** Propagation query API. Reach via `SoundTrace.propagator`.
 *  Stateless wrapper — `dispose()` is a no-op kept for `Disposable` symmetry. */
export declare class Propagator implements Disposable {
    private readonly b;
    private readonly h;
    /** @internal — reach via `SoundTrace.propagator` instead of constructing. */
    constructor(b: Bindings, h: Heap);
    /** Always `false` — this wrapper has no per-instance state. */
    readonly disposed = false;
    /** No-op. Provided for `Disposable` symmetry. */
    dispose(): void;
    /** @inheritdoc */
    [Symbol.dispose](): void;
    /** Number of guide planes in the scene. */
    getGuidePlaneCount(sceneID: number): number;
    /** Guide planes for a scene (capped by `maxCount`). */
    getGuidePlanes(sceneID: number, maxCount?: number): GuidePlane[];
    getAmbientSoundPathCount(sceneID: number): number;
    getAmbientSoundPaths(sceneID: number, maxCount?: number): AmbientSoundPath[];
    /** Number of mirror (image-source) positions in the scene. */
    getMirrorPositionCount(sceneID: number): number;
    getMirrorPositions(sceneID: number, maxCount?: number): MirrorPosition[];
    /** Profile snapshot from the most recent updatePropagation. null = no data yet. */
    getProfile(): PropagatorProfile | null;
    /** Number of valid paths currently held by the engine. */
    getValidPathCount(): number;
    /**
     * Read all valid paths back into PathData[] (~1.4 KB each).
     * Pass a `count` cap when the live count is large.
     *
     * Note: we trust the C-side return (actual entries written) over the
     * earlier `getValidPathCount()`. A propagation publish can land between
     * the two calls and the new published frame may have fewer paths than the
     * count we just read — without honoring the actual write count we'd be
     * reading back stale leftover bytes from the previous fill, which renders
     * as a flickering ghost path.
     */
    getValidPaths(count?: number): PathData[];
    /** Inverse of the distance-attenuation curve (find the distance for a target attenuation). */
    findAttenuationForDistance(sceneID: number, sourceID: number, pathType: number, targetAttenuation: number): number;
    /** Sort the IR data (next exaGetValidPaths call will reflect the new order). */
    sortIRDatas(): boolean;
    setJobTimingOption(option: PropagationJobTimingOption): boolean;
    getJobTimingFrames(sceneID: number, maxFrames?: number): PropagationFrameTiming[];
    resetJobTiming(): boolean;
    getEffectiveMaxDepth(): number;
    getSourceEffectiveMaxDepth(sourceID: number): number;
    private requireInitialized;
    setPerceptualDepthOption(option: PerceptualDepthOption): boolean;
    getPerceptualDepthOption(): PerceptualDepthOption | null;
}
//# sourceMappingURL=Propagator.d.ts.map