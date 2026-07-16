import { applyListenerRenderOptions, applySourcePathOptions, listenerOutputModeName, listenerOutputModeValue, objectUpdateTypeName, objectUpdateTypeValue, sourcePathTypeValue } from './facade-options.js';
import { toQuat, toVec3 } from './facade-coordinate.js';
function requireObjectUpdateTypeSet(ok) {
    if (!ok)
        throw new Error('[soundtrace.js] failed to set object update type');
}
/** A spatialized sound source. Reach the low-level object via `.native`.
 *  Created via `SoundTrace.addSource()`; `play()` wires an input node into the
 *  wasm AudioWorklet for spatialized rendering. */
export class Source {
    src;
    host;
    _disposed = false;
    constructor(src, host) {
        this.src = src;
        this.host = host;
    }
    get native() { return this.src; }
    setPose(p) {
        // Host coordinates pass through to the core unchanged; any coordinate-frame
        // difference is delegated to the core via the listener's coordinate basis.
        if (p.position) {
            const [x, y, z] = toVec3(p.position);
            this.src.setPosition(x, y, z);
        }
        return this;
    }
    /** Linear gain (1 = unity). Maps to the source intensity. */
    setGain(linear) { this.src.setIntensity(linear); return this; }
    setPathEnabled(path, enabled) {
        this.src.setPathEnable(sourcePathTypeValue(path), enabled);
        return this;
    }
    setPathOptions(options) {
        applySourcePathOptions(this.src, options);
        return this;
    }
    isPathEnabled(path) {
        return this.src.isPathEnabled(sourcePathTypeValue(path));
    }
    /** Stage this source's per-band directivity table (energy dB). `anglesDeg`
     *  are strictly-ascending angles-from-front (2..512 of them); `attenDbPerBand`
     *  is a row-major `[angle][band]` array of length `anglesDeg.length * 8`
     *  (0 dB on-axis, negative = quieter). Call `setDirectivityEnabled(true)` to
     *  apply. Array-shape checks (angle count, length) throw synchronously; in
     *  worker-hosted (MT) sessions the core's ascending-angle / finite-value
     *  rejection surfaces asynchronously through the command pipeline. */
    setDirectivityTable(anglesDeg, attenDbPerBand) {
        this.src.setDirectivityTable(anglesDeg, attenDbPerBand);
        return this;
    }
    /** Enable or disable the staged directivity table (disabled = omni source). */
    setDirectivityEnabled(enabled) {
        this.src.setDirectivityEnabled(enabled);
        return this;
    }
    /** Wire `input` (a dry AudioNode) through the wasm AudioWorklet for
     *  spatialized rendering. Returns the worklet node; the caller connects it
     *  onward (typically `worklet.connect(sound.output).connect(ctx.destination)`).
     *  The input→worklet connection is made here; the output connection is the
     *  caller's responsibility so the audio graph stays caller-owned. */
    async play(input, channels = 2) {
        const node = await this.host._playSource(this, channels);
        input.connect(node);
        return node;
    }
    get disposed() { return this._disposed; }
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        this.src.dispose();
    }
    [Symbol.dispose]() { this.dispose(); }
}
/** A piece of scene geometry (an acoustic mesh + its scene object). */
export class Mesh {
    mesh;
    obj;
    resolveMaterial;
    _disposed = false;
    constructor(mesh, obj, 
    /** Resolves string material refs to indices. Optional: when omitted, only
     *  numeric refs are accepted by `setMaterial`. Injected by `addMesh`. */
    resolveMaterial) {
        this.mesh = mesh;
        this.obj = obj;
        this.resolveMaterial = resolveMaterial;
    }
    get native() { return this.mesh; }
    get object() { return this.obj; }
    /** Reassign this mesh's material at runtime by index or name (e.g. 'wood').
     *  Name resolution requires the resolver injected at `addMesh` time; passing
     *  a name without it throws. No mesh rebuild — the change is in-place
     *  (ST: `exaMeshSetMaterial`; MT: a queued `setMeshMaterial` command). */
    setMaterial(material) {
        let index;
        if (typeof material === 'number') {
            index = material;
        }
        else if (this.resolveMaterial) {
            index = this.resolveMaterial(material);
        }
        else {
            throw new Error('[soundtrace.js] material name resolution is unavailable for this mesh — pass a numeric material index, or load material assets so names resolve');
        }
        if (!this.mesh.setMaterial(index)) {
            throw new Error('[soundtrace.js] failed to set mesh material');
        }
        return this;
    }
    /** Reassign a sub-range of triangles by index range.
     *  Indices are passed directly to the native wrapper; numeric indices only.
     *  MT wrappers queue `setMeshMaterialRange`, ST applies immediately.
     */
    setMaterialRange(triStart, triCount, material) {
        let index;
        if (typeof material === 'number') {
            index = material;
        }
        else if (this.resolveMaterial) {
            index = this.resolveMaterial(material);
        }
        else {
            throw new Error('[soundtrace.js] material name resolution is unavailable for this mesh — pass a numeric material index, or load material assets so names resolve');
        }
        if (!this.mesh.setMaterialRange(triStart, triCount, index)) {
            throw new Error('[soundtrace.js] failed to set mesh material range');
        }
        return this;
    }
    getUpdateType() {
        return objectUpdateTypeName(this.obj.getUpdateType());
    }
    setUpdateType(type) {
        requireObjectUpdateTypeSet(this.obj.setUpdateType(objectUpdateTypeValue(type)));
        return this;
    }
    setPose(p) {
        // Geometry passes through in host coordinates (see Source.setPose).
        if (p.position) {
            const [x, y, z] = toVec3(p.position);
            this.obj.setPosition(x, y, z);
        }
        if (p.orientation) {
            const [x, y, z, w] = toQuat(p.orientation);
            this.obj.setRotationQuat(x, y, z, w);
        }
        if (p.scale) {
            const [x, y, z] = toVec3(p.scale);
            this.obj.setScale(x, y, z);
        }
        return this;
    }
    get disposed() { return this._disposed; }
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        this.mesh.dispose();
        this.obj.dispose();
    }
    [Symbol.dispose]() { this.dispose(); }
}
/** The single scene listener (the "ears"). Owned by the `SoundTrace` world and
 *  released on `sound.dispose()` — there is exactly one listener per scene and
 *  it is not independently disposable (no `dispose()` by design). */
export class Listener {
    lis;
    constructor(lis) {
        this.lis = lis;
    }
    get native() { return this.lis; }
    setPose(p) {
        // Pose passes through in host coordinates; the host->core frame difference is
        // applied by the core at the HRTF stage via the listener coordinate basis.
        if (p.position) {
            const [x, y, z] = toVec3(p.position);
            this.lis.setPosition(x, y, z);
        }
        if (p.orientation) {
            const [x, y, z, w] = toQuat(p.orientation);
            this.lis.setOrientationQuat(x, y, z, w);
        }
        return this;
    }
    setAudioOption(option) {
        this.lis.setAudioOption(option);
        return this;
    }
    setRenderOptions(options) {
        applyListenerRenderOptions(this.native, options);
        return this;
    }
    /** Select the listener output mode: `'hrtf'` (default binaural) or
     *  `'speaker'` (internal Ambisonic speaker renderer, 1ch/2ch scope). HRTF
     *  modes and loaded HRTF assets apply to `'hrtf'` output only. Core 7efb8b87.
     *  Works in both `thread:'st'` (direct C-ABI) and `thread:'mt'` (routed as a
     *  worker listener command; the mode is mirrored on the host for {@link
     *  getOutputMode}). */
    setOutputMode(mode) {
        const set = this.lis.setOutputMode;
        if (!set)
            throw outputModeUnsupported();
        if (!set.call(this.lis, listenerOutputModeValue(mode))) {
            throw new Error('[soundtrace.js] failed to set listener output mode');
        }
        return this;
    }
    /** Current listener output mode (`'hrtf'` | `'speaker'`). Core 7efb8b87. In
     *  `thread:'mt'` this returns the host-mirrored value (the facade is the sole
     *  mutator, so it tracks the worker-side listener without a round-trip). */
    getOutputMode() {
        const get = this.lis.getOutputMode;
        if (!get)
            throw outputModeUnsupported();
        return listenerOutputModeName(get.call(this.lis));
    }
}
// Defensive fallback: every shipped listener native (st engine + mt worker
// proxy) implements output mode, so this only guards a hand-built native that
// omits it.
function outputModeUnsupported() {
    return new Error('[soundtrace.js] listener native does not implement output mode');
}
//# sourceMappingURL=facade-entities.js.map