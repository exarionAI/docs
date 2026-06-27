import { AMBIENT_SOUND_PATH_SIZE, EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, GUIDE_PLANE_SIZE, MIRROR_POSITION_SIZE, PATH_DATA_SIZE, PERCEPTUAL_DEPTH_OPTION_SIZE, PROPAGATION_FRAME_TIMING_SIZE, PROPAGATION_JOB_TIMING_OPTION_SIZE, PROPAGATOR_PROFILE_SIZE, readAmbientSoundPath, readPerceptualDepthOption, readPropagationFrameTiming, readGuidePlane, readMirrorPosition, readPathData, readPropagatorProfile, writePerceptualDepthOption, writePropagationJobTimingOption, } from './native/index.js';
/** Propagation query API. Reach via `SoundTrace.propagator`.
 *  Stateless wrapper — `dispose()` is a no-op kept for `Disposable` symmetry. */
export class Propagator {
    b;
    h;
    /** @internal — reach via `SoundTrace.propagator` instead of constructing. */
    constructor(b, h) {
        this.b = b;
        this.h = h;
    }
    /** Always `false` — this wrapper has no per-instance state. */
    disposed = false;
    /** No-op. Provided for `Disposable` symmetry. */
    dispose() { }
    /** @inheritdoc */
    [Symbol.dispose]() { }
    /** Number of guide planes in the scene. */
    getGuidePlaneCount(sceneID) {
        return this.b.exaPropagatorGetGuidePlaneCount(sceneID);
    }
    /** Guide planes for a scene (capped by `maxCount`). */
    getGuidePlanes(sceneID, maxCount) {
        const n = Math.min(this.getGuidePlaneCount(sceneID), maxCount ?? Number.MAX_SAFE_INTEGER);
        if (n <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(n * GUIDE_PLANE_SIZE);
            const ok = this.b.exaPropagatorGetGuidePlanes(sceneID, p, n);
            if (!ok)
                return [];
            const out = [];
            for (let i = 0; i < n; i++)
                out.push(readGuidePlane(this.h, p + i * GUIDE_PLANE_SIZE));
            return out;
        });
    }
    getAmbientSoundPathCount(sceneID) {
        return this.b.exaPropagatorGetAmbientSoundPathCount(sceneID);
    }
    getAmbientSoundPaths(sceneID, maxCount) {
        const count = this.getAmbientSoundPathCount(sceneID);
        const limit = Math.min(count, maxCount ?? Number.MAX_SAFE_INTEGER);
        if (count <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(count * AMBIENT_SOUND_PATH_SIZE);
            const ok = this.b.exaPropagatorGetAmbientSoundPaths(sceneID, p, count);
            if (!ok)
                return [];
            const out = [];
            for (let i = 0; i < limit; i++) {
                out.push(readAmbientSoundPath(this.h, p + i * AMBIENT_SOUND_PATH_SIZE));
            }
            return out;
        });
    }
    /** Number of mirror (image-source) positions in the scene. */
    getMirrorPositionCount(sceneID) {
        return this.b.exaPropagatorGetMirrorPositionCount(sceneID);
    }
    getMirrorPositions(sceneID, maxCount) {
        const n = Math.min(this.getMirrorPositionCount(sceneID), maxCount ?? Number.MAX_SAFE_INTEGER);
        if (n <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(n * MIRROR_POSITION_SIZE);
            const ok = this.b.exaPropagatorGetMirrorPositions(sceneID, p, n);
            if (!ok)
                return [];
            const out = [];
            for (let i = 0; i < n; i++)
                out.push(readMirrorPosition(this.h, p + i * MIRROR_POSITION_SIZE));
            return out;
        });
    }
    /** Profile snapshot from the most recent updatePropagation. null = no data yet. */
    getProfile() {
        return this.h.withScope(s => {
            const p = s.block(PROPAGATOR_PROFILE_SIZE);
            const ok = this.b.exaPropagatorGetProfile(p);
            return ok ? readPropagatorProfile(this.h, p) : null;
        });
    }
    // --- Valid paths ---
    /** Number of valid paths currently held by the engine. */
    getValidPathCount() { return this.b.exaGetValidPathCount(); }
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
    getValidPaths(count) {
        const n = Math.min(this.getValidPathCount(), count ?? Number.MAX_SAFE_INTEGER);
        if (n <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(n * PATH_DATA_SIZE);
            const written = this.b.exaGetValidPaths(p, n);
            const out = [];
            for (let i = 0; i < written; i++)
                out.push(readPathData(this.h, p + i * PATH_DATA_SIZE));
            return out;
        });
    }
    /** Inverse of the distance-attenuation curve (find the distance for a target attenuation). */
    findAttenuationForDistance(sceneID, sourceID, pathType, targetAttenuation) {
        return this.b.exaFindAttenuationForDistance(sceneID, sourceID, pathType, targetAttenuation);
    }
    /** Sort the IR data (next exaGetValidPaths call will reflect the new order). */
    sortIRDatas() { return this.b.exaGetSortedIRDatas(); }
    setJobTimingOption(option) {
        return this.h.withScope(s => {
            const p = s.block(PROPAGATION_JOB_TIMING_OPTION_SIZE);
            writePropagationJobTimingOption(this.h, p, option);
            return this.b.exaPropagatorSetJobTimingOption(p);
        });
    }
    getJobTimingFrames(sceneID, maxFrames = EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES) {
        const n = Math.max(0, Math.min(Math.floor(maxFrames), EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES));
        if (n <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(n * PROPAGATION_FRAME_TIMING_SIZE);
            const written = this.b.exaPropagatorGetJobTimingFrames(sceneID, p, n);
            const out = [];
            for (let i = 0; i < written; i++) {
                out.push(readPropagationFrameTiming(this.h, p + i * PROPAGATION_FRAME_TIMING_SIZE));
            }
            return out;
        });
    }
    resetJobTiming() { return this.b.exaPropagatorResetJobTiming(); }
    getEffectiveMaxDepth() {
        this.requireInitialized('get propagation effective max depth');
        return this.b.exaPropagatorGetEffectiveMaxDepth();
    }
    getSourceEffectiveMaxDepth(sourceID) {
        this.requireInitialized('get source propagation effective max depth');
        return this.b.exaPropagatorGetSourceEffectiveMaxDepth(sourceID);
    }
    requireInitialized(operation) {
        if (this.b.exaIsInitialized())
            return;
        const nativeError = this.b.exaGetLastError().trim();
        const reason = nativeError.length > 0 ? nativeError : 'core is not initialized';
        throw new Error(`[soundtrace.js] failed to ${operation}: ${reason}`);
    }
    // --- Perceptual-depth adaptation (GLOBAL; v0.6 / ABI 2) ---
    // Adapts the global trace depth each frame to the audible reflection-order
    // count. enabled=false -> identical to before (no adaptation).
    setPerceptualDepthOption(option) {
        return this.h.withScope(s => {
            const p = s.block(PERCEPTUAL_DEPTH_OPTION_SIZE);
            writePerceptualDepthOption(this.h, p, option);
            return this.b.exaPropagatorSetPerceptualDepthOption(p);
        });
    }
    getPerceptualDepthOption() {
        return this.h.withScope(s => {
            const p = s.block(PERCEPTUAL_DEPTH_OPTION_SIZE);
            const ok = this.b.exaPropagatorGetPerceptualDepthOption(p);
            return ok ? readPerceptualDepthOption(this.h, p) : null;
        });
    }
}
//# sourceMappingURL=Propagator.js.map