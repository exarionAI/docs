import { Diagnostics } from './Diagnostics.js';
import { MaterialTable } from './MaterialTable.js';
import { Propagator } from './Propagator.js';
import { SoundListener } from './SoundListener.js';
import { FACADE_BVH, Mesh, Source, applySourcePathOptions, indicesToTriangles, objectUpdateTypeValue, qualityPreset, sourcePathTypeValue, transformVec3, transformVertices, type ObjectUpdateType, type QualityTier, type SourcePathOptions, type Vec3In } from './facade.js';
import { SoundMesh } from './SoundMesh.js';
import { SoundObject } from './SoundObject.js';
import { SoundScene } from './SoundScene.js';
import { PathType, SoundSource } from './SoundSource.js';
import type { Triangle } from './native/index.js';
import { createDisposedError } from './soundtrace-mt-facade-errors.js';
import { SoundTraceMtUnsupportedError, normalizeLimit, normalizeOptionalLimit, normalizeStatisticsLength, FACADE_DISTANCE_ATTENUATION, FACADE_SOURCE_RAY_DEPTH, FACADE_SOURCE_RAY_HEIGHT, FACADE_SOURCE_RAY_WIDTH, FACADE_STATISTICS_PATHS, FACADE_STATISTICS_RAY_DATA_LIMIT, type StatisticsPathSnapshot, type StatisticsSnapshot, type StatisticsSnapshotOptions, type StatisticsSourceSnapshot } from './SoundTrace-types.js';
import { resolveMaterialName, type MaterialRef } from './material-resolver.js';
import type { DebugSnapshot, DebugSnapshotOptions } from './control-protocol.js';
import type { SoundTrace } from './SoundTrace.js';

export function facadeScene(self: SoundTrace): SoundScene {
  self.assertLocalControlAvailable('facade scene mutation');
  if (!self._scene) throw new Error('[soundtrace.js] not loaded — call load() first');
  return self._scene;
}

export function setQuality(self: SoundTrace, quality: QualityTier): SoundTrace {
  self.quality = quality;
  const mtFacadeState = self.mtFacadeState();
  if (mtFacadeState) {
    mtFacadeState.applyQuality(quality);
    return self;
  }
  const preset = qualityPreset(quality);
  const listener = self._sceneListener;
  if (listener) self.applyQualityPreset(listener, preset);
  return self;
}

export function setAudioOption(self: SoundTrace, options: { readonly inputSampleCount?: number; readonly outputChannels?: number } = {}): SoundTrace {
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
  if (!listener) throw new Error('[soundtrace.js] not loaded — call load() first');
  listener.setAudioOption(audioOption);
  return self;
}

export function getStatistics(self: SoundTrace, options: StatisticsSnapshotOptions = {}): StatisticsSnapshot {
  if (self.mtFacadeState()) {
    throw new SoundTraceMtUnsupportedError(
      '[soundtrace.js] getStatistics() is synchronous native diagnostics and is unsupported for thread=mt; use await debugSnapshot() instead',
    );
  }
  const diagnostics = self.diagnostics;
  const propagator = self.propagator;
  const includeRayData = options.includeRayData === true;
  const rayDataLimit = normalizeLimit(
    options.rayDataLimit,
    FACADE_STATISTICS_RAY_DATA_LIMIT,
    'rayDataLimit',
  );
  const paths = FACADE_STATISTICS_PATHS.map((path): StatisticsPathSnapshot => {
    const type = sourcePathTypeValue(path);
    const base = {
      path,
      rayTraversalCount: diagnostics.getRayTraversalCount(type),
      rayHitTriangleCount: diagnostics.getRayHitTriangleCount(type),
    };
    if (!includeRayData) return base;
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
      source: self.getSourceStatisticsSnapshot(
        options.source,
        normalizeStatisticsLength(options.sourceStatisticsLength),
      ),
    };
  if (options.includeValidPaths !== true) return withSource;
  return {
    ...withSource,
    validPaths: propagator.getValidPaths(
      normalizeOptionalLimit(options.validPathLimit, 'validPathLimit'),
    ),
  };
}

export function getSourceStatisticsSnapshot(self: SoundTrace, source: Source, length: number): StatisticsSourceSnapshot {
  const listener = self._sceneListener;
  if (!listener) throw new Error('[soundtrace.js] not loaded — call load() first');
  const sourceId = source.native.id;
  return {
    sourceId,
    values: listener.getStatistics(sourceId, length),
  };
}

export function addMesh(self: SoundTrace, opts: { vertices: ArrayLike<number>; indices?: ArrayLike<number>; triangles?: Triangle[]; material?: MaterialRef; updateType?: ObjectUpdateType }): Mesh {
  const rawMaterial = opts.material ?? 0;
  const materialIndex = typeof rawMaterial === 'number'
    ? rawMaterial
    : resolveMaterialName(rawMaterial, self._aliasReverseIndex, self._nameToIndex, self._defaultMaterialType);
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
    });
    self.pumpMtControlLoop();
    return mesh;
  }
  const scene = self.facadeScene();
  const mesh = new SoundMesh(self.bindings(), self.heap());
  mesh.setData(transformVertices(opts.vertices, self.coordinateTransform), triangles, { bvhType: FACADE_BVH });
  const obj = new SoundObject(self.bindings(), self.heap());
  obj.setMesh(mesh.id);
  if (opts.updateType !== undefined) obj.setUpdateType(objectUpdateTypeValue(opts.updateType));
  scene.addObject(obj);
  return new Mesh(mesh, obj, self.coordinateTransform);
}

export function removeMesh(self: SoundTrace, mesh: Mesh): SoundTrace {
  if (self.mtFacadeState()) {
    mesh.dispose();
    return self;
  }
  self.facadeScene().removeObject(mesh.object);
  mesh.dispose();
  return self;
}

export function addSource(self: SoundTrace, opts: { position: Vec3In; gain?: number; paths?: SourcePathOptions }): Source {
  const mtFacadeState = self.mtFacadeState();
  if (mtFacadeState) {
    const source = mtFacadeState.addSource(opts);
    self.pumpMtControlLoop();
    return source;
  }
  const scene = self.facadeScene();
  const src = new SoundSource(self.bindings(), self.heap());
  const [x, y, z] = transformVec3(opts.position, self.coordinateTransform);
  src.setPosition(x, y, z);
  src.setIntensity(opts.gain ?? 1.0);
  src.setRayCount(FACADE_SOURCE_RAY_WIDTH, FACADE_SOURCE_RAY_HEIGHT);
  src.setDepth(FACADE_SOURCE_RAY_DEPTH);
  src.setDistanceAttenuation(PathType.Direct, FACADE_DISTANCE_ATTENUATION);
  src.setDistanceAttenuation(PathType.Reflection, FACADE_DISTANCE_ATTENUATION);
  src.setDistanceAttenuation(PathType.Diffraction, FACADE_DISTANCE_ATTENUATION);
  src.setDistanceAttenuation(PathType.Reverb, FACADE_DISTANCE_ATTENUATION);
  src.setDistanceAttenuation(PathType.Transmission, FACADE_DISTANCE_ATTENUATION);
  if (opts.paths !== undefined) applySourcePathOptions(src, opts.paths);
  scene.addSource(src);
  return new Source(src, self, self.coordinateTransform);
}

export function update(self: SoundTrace, dt = 0): number | Promise<number> {
  const mtFacadeState = self.mtFacadeState();
  if (mtFacadeState) {
    return mtFacadeState.update(dt);
  }
  const scene = self.facadeScene();
  scene.tick(dt);
  return scene.updatePropagation();
}

export async function debugSnapshot(self: SoundTrace, options: DebugSnapshotOptions = {}): Promise<DebugSnapshot> {
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
  const snapshot: DebugSnapshot = { validPathCount };
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

export function reset(self: SoundTrace): void | Promise<void> {
  const mtFacadeState = self.mtFacadeState();
  if (mtFacadeState) {
    return mtFacadeState.reset();
  }
  const b = self.bindings();
  b.exaReset();
  self.applyStartupOptions();
  b.exaInit();
}
