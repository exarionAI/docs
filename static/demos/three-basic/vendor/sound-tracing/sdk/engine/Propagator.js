import { AMBIENT_SOUND_PATH_SIZE, EXA_PROPAGATION_JOB_TIMING_MAX_FRAMES, GUIDE_PLANE_SIZE, MIRROR_POSITION_SIZE, PATH_DATA_SIZE, PERCEPTUAL_DEPTH_OPTION_SIZE, PROPAGATION_FRAME_TIMING_SIZE, PROPAGATION_JOB_TIMING_OPTION_SIZE, PROPAGATOR_PROFILE_SIZE, isError, isOk, readAmbientSoundPath, readPerceptualDepthOption, readPropagationFrameTiming, readGuidePlane, readMirrorPosition, readPathData, readPropagatorProfile, requireOk, writePerceptualDepthOption, writePropagationJobTimingOption, } from '../native/index.js';
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
    /** Number of guide planes in the current visual buffer (v0.7: ExaResult +
     *  count out-param). */
    getGuidePlaneCount(sceneID) {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaPropagatorGetGuidePlaneCount(sceneID, p), 'exaPropagatorGetGuidePlaneCount', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    /** Guide planes for a scene (capped by `maxCount`).
     *
     *  Buffer contract (findings #9/#21): the C getter is ALL-OR-NOTHING — a
     *  capacity smaller than the available set returns EXA_ERR_BUFFER_TOO_SMALL
     *  and writes nothing. Sizing the buffer to the caller's cap therefore
     *  turned an engaged cap into a silent []. Allocate the FULL count, pass it
     *  as the capacity, and apply the cap as a JS slice — the
     *  getAmbientSoundPaths template. */
    getGuidePlanes(sceneID, maxCount) {
        const count = this.getGuidePlaneCount(sceneID);
        const limit = Math.min(count, maxCount ?? Number.MAX_SAFE_INTEGER);
        if (count <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(count * GUIDE_PLANE_SIZE);
            if (isError(this.b.exaPropagatorGetGuidePlanes(sceneID, p, count)))
                return [];
            const out = [];
            for (let i = 0; i < limit; i++)
                out.push(readGuidePlane(this.h, p + i * GUIDE_PLANE_SIZE));
            return out;
        });
    }
    getAmbientSoundPathCount(sceneID) {
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaPropagatorGetAmbientSoundPathCount(sceneID, p), 'exaPropagatorGetAmbientSoundPathCount', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    getAmbientSoundPaths(sceneID, maxCount) {
        const count = this.getAmbientSoundPathCount(sceneID);
        const limit = Math.min(count, maxCount ?? Number.MAX_SAFE_INTEGER);
        if (count <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(count * AMBIENT_SOUND_PATH_SIZE);
            if (isError(this.b.exaPropagatorGetAmbientSoundPaths(sceneID, p, count)))
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
        return this.h.withScope(s => {
            const p = s.u32();
            requireOk(this.b.exaPropagatorGetMirrorPositionCount(sceneID, p), 'exaPropagatorGetMirrorPositionCount', this.b.exaGetLastError);
            return this.h.readU32(p);
        });
    }
    getMirrorPositions(sceneID, maxCount) {
        const count = this.getMirrorPositionCount(sceneID);
        const limit = Math.min(count, maxCount ?? Number.MAX_SAFE_INTEGER);
        if (count <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            const p = s.alloc(count * MIRROR_POSITION_SIZE);
            // The count getter OVERCOUNTS (Visualization.cpp: it tallies every
            // reflection plane's Max_depth-1, the fill additionally skips planes
            // with a null MirrPos) and the fill reports no written count. Zero the
            // buffer so the phantom tail parses deterministically, then drop those
            // records by their planeType: a written record always carries
            // EXA_MIRROR_PLANE_REFLECTION, a zeroed one reads NONE (0).
            this.h.writeBytes(p, new Uint8Array(count * MIRROR_POSITION_SIZE));
            if (isError(this.b.exaPropagatorGetMirrorPositions(sceneID, p, count)))
                return [];
            const out = [];
            for (let i = 0; i < count && out.length < limit; i++) {
                const record = readMirrorPosition(this.h, p + i * MIRROR_POSITION_SIZE);
                if (record.planeType !== 0)
                    out.push(record);
            }
            return out;
        });
    }
    /** Profile snapshot from the most recent propagation. null = no data yet.
     *  (Diagnostics header — legacy ExaBool success convention.) */
    getProfile() {
        return this.h.withScope(s => {
            const p = s.block(PROPAGATOR_PROFILE_SIZE);
            const ok = this.b.exaPropagatorGetProfile(p);
            return ok ? readPropagatorProfile(this.h, p) : null;
        });
    }
    // --- Valid paths ---
    /** Number of valid paths currently held by the engine. v0.7: probed through
     *  the merged exaPropagatorGetValidPaths (out=NULL, capacity=0). */
    getValidPathCount() {
        return this.h.withScope(s => {
            const countPtr = s.i32();
            requireOk(this.b.exaPropagatorGetValidPaths(0, 0, countPtr), 'exaPropagatorGetValidPaths', this.b.exaGetLastError);
            return this.h.readI32(countPtr);
        });
    }
    /**
     * Read all valid paths back into PathData[] (~1.4 KB each).
     * Pass a `count` cap when the live count is large.
     *
     * Note: we trust the C-side reported count over the earlier
     * `getValidPathCount()`. A propagation publish can land between the two
     * calls and the new published frame may have fewer paths than the count we
     * just read — without honoring the fresh count we'd be reading back stale
     * leftover bytes from the previous fill, which renders as a flickering
     * ghost path.
     */
    getValidPaths(count) {
        const available = this.getValidPathCount();
        const limit = Math.min(available, count ?? Number.MAX_SAFE_INTEGER);
        if (available <= 0 || limit <= 0)
            return [];
        return this.h.withScope(s => {
            // Buffer contract (finding #9): the call is ALL-OR-NOTHING — capacity
            // below the available count returns EXA_ERR_BUFFER_TOO_SMALL and writes
            // nothing (the old cap-sized buffer turned every engaged cap into a
            // silent []). Allocate the full count; the cap is a JS slice.
            const p = s.alloc(available * PATH_DATA_SIZE);
            const countPtr = s.i32();
            const result = this.b.exaPropagatorGetValidPaths(p, available, countPtr);
            if (isError(result))
                return [];
            // A propagation publish may land between the probe and the fill and
            // shrink the set; the fill reports what it actually wrote.
            const written = Math.min(this.h.readI32(countPtr), limit);
            const out = [];
            for (let i = 0; i < written; i++)
                out.push(readPathData(this.h, p + i * PATH_DATA_SIZE));
            return out;
        });
    }
    /** Inverse of the distance-attenuation curve: the distance (meters) at which
     *  the source's `pathType` attenuation reaches `targetAttenuation`. v0.7
     *  renamed the backwards exaFindAttenuationForDistance and dropped its decoy
     *  sceneID argument (D-19). */
    findDistanceForAttenuation(sourceID, pathType, targetAttenuation) {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaSourceFindDistanceForAttenuation(sourceID, pathType, targetAttenuation, p), 'exaSourceFindDistanceForAttenuation', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    // (exaGetSortedIRDatas was removed in v0.7 — it was a dead symbol.)
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
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaPropagatorGetEffectiveMaxDepth(p), 'exaPropagatorGetEffectiveMaxDepth', this.b.exaGetLastError);
            return this.h.readI32(p);
        });
    }
    getSourceEffectiveMaxDepth(sourceID) {
        this.requireInitialized('get source propagation effective max depth');
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaPropagatorGetSourceEffectiveMaxDepth(sourceID, p), 'exaPropagatorGetSourceEffectiveMaxDepth', this.b.exaGetLastError);
            return this.h.readI32(p);
        });
    }
    requireInitialized(operation) {
        if (this.b.exaIsInitialized())
            return;
        const nativeError = this.b.exaGetLastError().trim();
        const reason = nativeError.length > 0 ? nativeError : 'core is not initialized';
        throw new Error(`[soundtrace.js] failed to ${operation}: ${reason}`);
    }
    // --- Perceptual-depth adaptation (GLOBAL) ---
    // Adapts the global trace depth each frame to the audible reflection-order
    // count. enabled=false -> identical to before (no adaptation).
    setPerceptualDepthOption(option) {
        return this.h.withScope(s => {
            const p = s.block(PERCEPTUAL_DEPTH_OPTION_SIZE);
            writePerceptualDepthOption(this.h, p, option);
            return isOk(this.b.exaPropagatorSetPerceptualDepthOption(p));
        });
    }
    getPerceptualDepthOption() {
        return this.h.withScope(s => {
            const p = s.block(PERCEPTUAL_DEPTH_OPTION_SIZE);
            const result = this.b.exaPropagatorGetPerceptualDepthOption(p);
            return isOk(result) ? readPerceptualDepthOption(this.h, p) : null;
        });
    }
}
//# sourceMappingURL=Propagator.js.map