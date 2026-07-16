import { FACADE_BVH, Mesh, Source, applySourcePathOptions, indicesToTriangles, objectUpdateTypeValue, qualityPreset, sourcePathTypeValue, toVec3 } from './facade.js';
import { SoundMesh } from '../engine/SoundMesh.js';
import { SoundObject } from '../engine/SoundObject.js';
import { PathType, SoundSource } from '../engine/SoundSource.js';
import { SoundTraceMtUnsupportedError, normalizeLimit, normalizeOptionalLimit, FACADE_DISTANCE_ATTENUATION, FACADE_SOURCE_RAY_DEPTH, FACADE_SOURCE_RAY_HEIGHT, FACADE_SOURCE_RAY_WIDTH, FACADE_STATISTICS_PATHS, FACADE_STATISTICS_RAY_DATA_LIMIT } from './SoundTrace-types.js';
import { resolveMaterialName } from './material-resolver.js';
import { seedSingleThreadSceneGraph } from './SoundTrace-lifecycle.js';
import { GPU_PROPAGATION_STATS_SIZE, EXA_MAX_SOUNDSOURCE, IR_SIZE, readGpuPropagationStats, readIR, requireOk, writeGpuPropagationStatsHeader, } from '../native/index.js';
export function facadeScene(self) {
    self.assertLocalControlAvailable('facade scene mutation');
    if (!self._scene)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    return self._scene;
}
export function setQuality(self, quality) {
    self.quality = quality;
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        mtFacadeState.applyQuality(quality);
        return self;
    }
    const preset = qualityPreset(quality);
    const listener = self._sceneListener;
    if (listener)
        self.applyQualityPreset(listener, preset);
    return self;
}
export function setAudioOption(self, options = {}) {
    const audioOption = {
        sampleRate: self.ctx.sampleRate,
        inputSampleCount: options.inputSampleCount ?? 128,
        outputChannels: options.outputChannels ?? 2,
    };
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        mtFacadeState.applyAudioOption(audioOption);
        return self;
    }
    const listener = self._sceneListener;
    if (!listener)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    listener.setAudioOption(audioOption);
    return self;
}
export function getStatistics(self, options = {}) {
    if (self.mtFacadeState()) {
        throw new SoundTraceMtUnsupportedError('[soundtrace.js] getStatistics() is synchronous native diagnostics and is unsupported for thread=mt; use await debugSnapshot() instead');
    }
    const diagnostics = self.diagnostics;
    const propagator = self.propagator;
    const includeRayData = options.includeRayData === true;
    const rayDataLimit = normalizeLimit(options.rayDataLimit, FACADE_STATISTICS_RAY_DATA_LIMIT, 'rayDataLimit');
    const paths = FACADE_STATISTICS_PATHS.map((path) => {
        const type = sourcePathTypeValue(path);
        const base = {
            path,
            rayTraversalCount: diagnostics.getRayTraversalCount(type),
            rayHitTriangleCount: diagnostics.getRayHitTriangleCount(type),
        };
        if (!includeRayData)
            return base;
        return {
            ...base,
            rayTraversals: diagnostics.getRayTraversals(type, rayDataLimit),
            rayHitTriangleVertices: diagnostics.getRayHitTriangleVertices(type, rayDataLimit),
        };
    });
    const base = {
        validPathCount: propagator.getValidPathCount(),
        profile: propagator.getProfile(),
        memoryTrace: diagnostics.getMemoryTraceSnapshot(),
        paths,
    };
    const withSource = options.source === undefined
        ? base
        : {
            ...base,
            source: self.getSourceStatisticsSnapshot(options.source),
        };
    if (options.includeValidPaths !== true)
        return withSource;
    return {
        ...withSource,
        validPaths: propagator.getValidPaths(normalizeOptionalLimit(options.validPathLimit, 'validPathLimit')),
    };
}
export function getSourceStatisticsSnapshot(self, source) {
    const listener = self._sceneListener;
    if (!listener)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    const sourceId = source.native.id;
    return {
        sourceId,
        // v0.7: versioned ExaRenderStats struct (exaRenderGetStats) — the
        // 21-float positional exaGetStatistics array is gone.
        stats: listener.getRenderStats(sourceId),
    };
}
/** GPU propagation dispatch statistics (exaPropagatorGetGpuStats, core
 *  7efb8b87). Reports cumulative GPU reflection dispatch / ready / CPU-fallback
 *  counters. Synchronous native diagnostics — unsupported for thread=mt. */
export function getGpuStats(self) {
    if (self.mtFacadeState()) {
        throw new SoundTraceMtUnsupportedError('[soundtrace.js] getGpuStats() is synchronous native diagnostics and is unsupported for thread=mt');
    }
    const b = self.bindings();
    const h = self.heap();
    return h.withScope(s => {
        const p = s.block(GPU_PROPAGATION_STATS_SIZE);
        writeGpuPropagationStatsHeader(h, p);
        requireOk(b.exaPropagatorGetGpuStats(p), 'exaPropagatorGetGpuStats', b.exaGetLastError);
        const raw = readGpuPropagationStats(h, p);
        return {
            dispatchCount: raw.dispatchCount,
            readyCount: raw.readyCount,
            cpuFallbackCount: raw.cpuFallbackCount,
        };
    });
}
/** Path-response impulse-response records from the most recent propagation
 *  (exaGetIRCount / exaGetIRs, core 7efb8b87). Returns one record per
 *  propagated path; an empty array when no snapshot is available. Synchronous
 *  native diagnostics — unsupported for thread=mt. */
export function getIRs(self) {
    if (self.mtFacadeState()) {
        throw new SoundTraceMtUnsupportedError('[soundtrace.js] getIRs() is synchronous native diagnostics and is unsupported for thread=mt');
    }
    const b = self.bindings();
    const h = self.heap();
    const count = b.exaGetIRCount();
    if (count <= 0)
        return [];
    return h.withScope(s => {
        const p = s.block(count * IR_SIZE);
        // exaGetIRs returns the number of records actually copied (<= count).
        const written = b.exaGetIRs(p, count);
        const n = Math.max(0, Math.min(written, count));
        const out = [];
        for (let i = 0; i < n; i++) {
            const rec = readIR(h, p + i * IR_SIZE);
            out.push({
                energyPerBand: Array.from(rec.energyPerBand),
                toaMs: rec.toaMs,
                pathType: rec.pathType,
            });
        }
        return out;
    });
}
/** Render a mono impulse response for `(this.listener, source)` by driving the
 *  render state with a unit delta impulse (exaRenderMonoImpulseResponse, core
 *  7efb8b87). Offline/control-thread helper for inspection and baking. The
 *  scene listener MUST be configured for 1 output channel (setAudioOption); the
 *  current output mode is respected. Returns the rendered samples (empty when
 *  the sample count is 0). Throws on a native error (non-mono listener / bad
 *  handle / offline render failure). Unsupported for thread=mt. */
export function renderMonoImpulseResponse(self, source, seconds) {
    if (self.mtFacadeState()) {
        throw new SoundTraceMtUnsupportedError('[soundtrace.js] renderMonoImpulseResponse() is synchronous native rendering and is unsupported for thread=mt');
    }
    const listener = self._sceneListener;
    if (!listener)
        throw new Error('[soundtrace.js] not loaded — call load() first');
    return listener.renderMonoImpulseResponse(source.native.id, seconds);
}
/** Build a material-name->index resolver bound to the host's loaded name maps.
 *  Numeric refs pass through unchanged; names resolve via the loaded asset
 *  (falling back to defaultMaterialType for unknown names). Shared by addMesh
 *  (initial material) and the per-Mesh runtime setMaterial(name) (TASK-0022). */
export function materialResolver(self) {
    return (ref) => typeof ref === 'number'
        ? ref
        : resolveMaterialName(ref, self._aliasReverseIndex, self._nameToIndex, self._defaultMaterialType);
}
export function addMesh(self, opts) {
    const resolve = materialResolver(self);
    const materialIndex = resolve(opts.material ?? 0);
    const triangles = opts.triangles
        ?? (opts.indices !== undefined
            ? indicesToTriangles(opts.indices, materialIndex)
            : (() => { throw new Error('[soundtrace.js] addMesh requires `triangles` or `indices`'); })());
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        const mesh = mtFacadeState.addMesh({
            vertices: opts.vertices,
            triangles,
            material: materialIndex,
            updateType: opts.updateType,
            resolveMaterial: resolve,
        });
        self.pumpMtControlLoop();
        return mesh;
    }
    const scene = self.facadeScene();
    const mesh = new SoundMesh(self.bindings(), self.heap());
    // Vertices pass through in host coordinates; the host->core frame difference is
    // delegated to the core via the listener coordinate basis (set at load).
    mesh.setData(opts.vertices, triangles, { bvhType: FACADE_BVH });
    const obj = new SoundObject(self.bindings(), self.heap());
    obj.setMesh(mesh.id);
    if (opts.updateType !== undefined)
        obj.setUpdateType(objectUpdateTypeValue(opts.updateType));
    scene.addObject(obj);
    return new Mesh(mesh, obj, resolve);
}
export function removeMesh(self, mesh) {
    if (self.mtFacadeState()) {
        mesh.dispose();
        return self;
    }
    self.facadeScene().removeObject(mesh.object);
    mesh.dispose();
    return self;
}
export function addSource(self, opts) {
    const mtFacadeState = self.mtFacadeState();
    // S1: the engine renders reflections/diffraction for at most
    // EXA_MAX_SOUNDSOURCE sources per listener. exaSceneAddSource accepts more
    // without complaint and propagation silently drops the overflow's jobs
    // (ReflectionDiffractionSourceJobCollector.cpp), so an unwarned 17th source
    // renders direct-only — audibly anechoic next to its neighbours. Match the
    // core's degrade-don't-reject stance: still create the source, but say so
    // once per instance. (The core's own per-frame warning also surfaces now
    // that the worker log channel is routed — finding #12.)
    const liveSourceCount = mtFacadeState
        ? mtFacadeState.liveSourceCount
        : facadeScene(self).getSourceCount();
    if (liveSourceCount >= EXA_MAX_SOUNDSOURCE && !self._sourceCapWarned) {
        self._sourceCapWarned = true;
        console.warn(`[soundtrace.js] addSource: this scene already has ${liveSourceCount} sources — the engine renders reflections/diffraction for at most ${EXA_MAX_SOUNDSOURCE} sources per listener (EXA_MAX_SOUNDSOURCE); additional sources render direct-only.`);
    }
    if (mtFacadeState) {
        const source = mtFacadeState.addSource(opts);
        self.pumpMtControlLoop();
        return source;
    }
    const scene = self.facadeScene();
    const src = new SoundSource(self.bindings(), self.heap());
    const [x, y, z] = toVec3(opts.position);
    src.setPosition(x, y, z);
    src.setIntensity(opts.gain ?? 1.0);
    src.setRayCount(FACADE_SOURCE_RAY_WIDTH, FACADE_SOURCE_RAY_HEIGHT);
    src.setDepth(FACADE_SOURCE_RAY_DEPTH);
    src.setDistanceAttenuation(PathType.Direct, FACADE_DISTANCE_ATTENUATION);
    src.setDistanceAttenuation(PathType.Reflection, FACADE_DISTANCE_ATTENUATION);
    src.setDistanceAttenuation(PathType.Diffraction, FACADE_DISTANCE_ATTENUATION);
    src.setDistanceAttenuation(PathType.Reverb, FACADE_DISTANCE_ATTENUATION);
    src.setDistanceAttenuation(PathType.Transmission, FACADE_DISTANCE_ATTENUATION);
    if (opts.paths !== undefined)
        applySourcePathOptions(src, opts.paths);
    scene.addSource(src);
    return new Source(src, self);
}
export async function update(self, dt = 0) {
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        return mtFacadeState.update(dt);
    }
    const scene = self.facadeScene();
    scene.tick(dt);
    return scene.updatePropagation();
}
export async function debugSnapshot(self, options = {}) {
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        return mtFacadeState.debugSnapshot(options);
    }
    const validPathCount = self.propagator.getValidPathCount();
    const paths = options.includePaths
        ? self.propagator.getValidPaths(undefined)
        : undefined;
    const profile = options.includeProfile
        ? self.propagator.getProfile()
        : undefined;
    const memoryTrace = options.includeMemory
        ? self.diagnostics.getMemoryTraceSnapshot()
        : undefined;
    const snapshot = { validPathCount };
    if (options.includePaths) {
        return { ...snapshot, paths, profile, memoryTrace };
    }
    if (options.includeProfile) {
        return { ...snapshot, profile, memoryTrace };
    }
    if (options.includeMemory) {
        return { ...snapshot, memoryTrace };
    }
    return snapshot;
}
export async function reset(self) {
    const mtFacadeState = self.mtFacadeState();
    if (mtFacadeState) {
        return mtFacadeState.reset();
    }
    const b = self.bindings();
    // exaReset deletes the core system singleton: every scene/listener/source/
    // material is gone and the engine is back to pre-init. The old code left
    // _scene/_sceneListener pointing at destroyed ids and never rebuilt them, so
    // the instance was permanently bricked while reset() reported success
    // (finding #1). Dispose the wrappers FIRST (their handles are still valid,
    // and SoundListener owns malloc'd heap blocks that exaReset does not free),
    // then boot the core again in the same order as load: pre-init options
    // (D-12) -> exaInit -> the shared scene-graph seed.
    self._facadeListener = null;
    self._sceneListener?.dispose();
    self._sceneListener = null;
    self._scene?.dispose();
    self._scene = null;
    requireOk(b.exaReset(), 'exaReset', b.exaGetLastError);
    self.applyStartupOptions();
    requireOk(b.exaInit(), 'exaInit', b.exaGetLastError);
    seedSingleThreadSceneGraph(self);
    // exaReset emptied the core material table. The name->index maps survive on
    // the facade, so re-register the same assets to make the indices real again;
    // skip when materials were never loaded (maps empty), degrade like load().
    if (self._nameToIndex.size > 0 || self._aliasReverseIndex.size > 0) {
        await self.loadMaterialAssets().catch((e) => {
            const reason = e instanceof Error ? e.message : String(e);
            console.warn(`[soundtrace.js] material assets not re-registered after reset (${reason}); string material refs will fall back to defaultMaterialType`);
        });
    }
}
//# sourceMappingURL=SoundTrace-facade-methods.js.map