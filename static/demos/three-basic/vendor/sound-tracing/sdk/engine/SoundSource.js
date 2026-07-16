import { assertDirectivityArrays, EXA_MAX_FREQUENCY_COUNT, isOk, readVec3, requireOk, writeVec3, VEC3_SIZE, } from '../native/index.js';
/** Path type constants used by `exaSourceGetDistanceAttenuation(id, pathType, ...)`
 *  etc. Mirrors the public EXA_PATH_* values (valid range [0, EXA_PATH_COUNT)).
 *  All five types — including transmission (official as of v0.7) — accept
 *  their own distance-attenuation curve. */
export const PathType = {
    Direct: 0,
    Reflection: 1,
    Diffraction: 2,
    Reverb: 3,
    Transmission: 4,
};
export class SoundSource {
    b;
    h;
    id;
    _disposed = false;
    /** @inheritdoc */
    get disposed() { return this._disposed; }
    /** @internal — construct via `SoundTrace.createSource()`. */
    constructor(b, h) {
        this.b = b;
        this.h = h;
        this.id = h.withScope(s => {
            const p = s.i32();
            requireOk(b.exaSourceCreate(p), 'exaSourceCreate', b.exaGetLastError);
            return h.readI32(p);
        });
    }
    // --- position ---
    setPosition(x, y, z) {
        requireOk(this.b.exaSourceSetPosition(this.id, x, y, z), 'exaSourceSetPosition', this.b.exaGetLastError);
        return this;
    }
    getPosition() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            requireOk(this.b.exaSourceGetPosition(this.id, x, y, z), 'exaSourceGetPosition', this.b.exaGetLastError);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    // --- direction ---
    setDirection(x, y, z) {
        requireOk(this.b.exaSourceSetDirection(this.id, x, y, z), 'exaSourceSetDirection', this.b.exaGetLastError);
        return this;
    }
    getDirection() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            requireOk(this.b.exaSourceGetDirection(this.id, x, y, z), 'exaSourceGetDirection', this.b.exaGetLastError);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    // --- velocity ---
    setVelocity(x, y, z) {
        requireOk(this.b.exaSourceSetVelocity(this.id, x, y, z), 'exaSourceSetVelocity', this.b.exaGetLastError);
        return this;
    }
    getVelocity() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            requireOk(this.b.exaSourceGetVelocity(this.id, x, y, z), 'exaSourceGetVelocity', this.b.exaGetLastError);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    // --- scalar params ---
    setIntensity(v) {
        requireOk(this.b.exaSourceSetIntensity(this.id, v), 'exaSourceSetIntensity', this.b.exaGetLastError);
        return this;
    }
    getIntensity() {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaSourceGetIntensity(this.id, p), 'exaSourceGetIntensity', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    setGainBoostDb(db) {
        requireOk(this.b.exaSourceSetGainBoostDb(this.id, db), 'exaSourceSetGainBoostDb', this.b.exaGetLastError);
        return this;
    }
    getGainBoostDb() {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaSourceGetGainBoostDb(this.id, p), 'exaSourceGetGainBoostDb', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    setReverbSendDb(db) {
        requireOk(this.b.exaSourceSetReverbSendDb(this.id, db), 'exaSourceSetReverbSendDb', this.b.exaGetLastError);
        return this;
    }
    getReverbSendDb() {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaSourceGetReverbSendDb(this.id, p), 'exaSourceGetReverbSendDb', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    setReflectionSendDb(db) {
        requireOk(this.b.exaSourceSetReflectionSendDb(this.id, db), 'exaSourceSetReflectionSendDb', this.b.exaGetLastError);
        return this;
    }
    getReflectionSendDb() {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaSourceGetReflectionSendDb(this.id, p), 'exaSourceGetReflectionSendDb', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    // --- source path enable ---
    setPathEnable(pathType, enabled) {
        requireOk(this.b.exaSourceSetPathEnabled(this.id, pathType, enabled), 'exaSourceSetPathEnabled', this.b.exaGetLastError);
        return this;
    }
    isPathEnabled(pathType) {
        return this.h.withScope(s => {
            const p = s.i32(); // ExaBool out-param is int32 in v0.7
            requireOk(this.b.exaSourceIsPathEnabled(this.id, pathType, p), 'exaSourceIsPathEnabled', this.b.exaGetLastError);
            return this.h.readI32(p) !== 0;
        });
    }
    setAmbientEnabled(enabled) {
        requireOk(this.b.exaSourceSetAmbientEnabled(this.id, enabled), 'exaSourceSetAmbientEnabled', this.b.exaGetLastError);
        return this;
    }
    getAmbientEnabled() {
        return this.h.withScope(s => {
            const p = s.i32(); // ExaBool out-param is int32 in v0.7
            requireOk(this.b.exaSourceIsAmbientEnabled(this.id, p), 'exaSourceIsAmbientEnabled', this.b.exaGetLastError);
            return this.h.readI32(p) !== 0;
        });
    }
    /** Per-source trace-depth OVERRIDE, range [0, EXA_MAX_DEPTH]. 0 (the v0.7
     *  default for a fresh source) means INHERIT the listener/global depth. */
    setTraceDepthOverride(depth) {
        requireOk(this.b.exaSourceSetTraceDepthOverride(this.id, depth), 'exaSourceSetTraceDepthOverride', this.b.exaGetLastError);
        return this;
    }
    /** Raw override value (0 = inherit), NOT the effective per-frame depth. */
    getTraceDepthOverride() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaSourceGetTraceDepthOverride(this.id, p), 'exaSourceGetTraceDepthOverride', this.b.exaGetLastError);
            return this.h.readI32(p);
        });
    }
    /** @deprecated v0.7 renamed the native depth knob to
     *  exaSourceSetTraceDepthOverride — use setTraceDepthOverride(). */
    setDepth(depth) { return this.setTraceDepthOverride(depth); }
    /** @deprecated use getTraceDepthOverride(). */
    getDepth() { return this.getTraceDepthOverride(); }
    getDepthOk() {
        return this.h.withScope(s => isOk(this.b.exaSourceGetTraceDepthOverride(this.id, s.i32())));
    }
    // --- ray count ---
    setRayCount(w, h) {
        requireOk(this.b.exaSourceSetRayCount(this.id, w, h), 'exaSourceSetRayCount', this.b.exaGetLastError);
        return this;
    }
    getRayCount() {
        return this.h.withScope(s => {
            const w = s.i32(), h = s.i32();
            requireOk(this.b.exaSourceGetRayCount(this.id, w, h), 'exaSourceGetRayCount', this.b.exaGetLastError);
            return { width: this.h.readI32(w), height: this.h.readI32(h) };
        });
    }
    // --- reverb ray aliases ---
    setReverbRayCount(width, height) { return this.setRayCount(width, height); }
    getReverbRayCount() { return this.getRayCount(); }
    setReverbRayDepth(depth) { return this.setTraceDepthOverride(depth); }
    getReverbRayDepth() { return this.getTraceDepthOverride(); }
    // --- distance attenuation ---
    getDistanceAttenuation(pathType) {
        return this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            requireOk(this.b.exaSourceGetDistanceAttenuation(this.id, pathType, p), 'exaSourceGetDistanceAttenuation', this.b.exaGetLastError);
            return readVec3(this.h, p);
        });
    }
    setDistanceAttenuation(pathType, v) {
        this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            writeVec3(this.h, p, v);
            requireOk(this.b.exaSourceSetDistanceAttenuation(this.id, pathType, p), 'exaSourceSetDistanceAttenuation', this.b.exaGetLastError);
        });
        return this;
    }
    /** Set all four path-type attenuations (direct / reflection / diffraction /
     *  reverb) in one call. v0.7 fixed the historical native Get/Set name
     *  inversion — Set now really sets. */
    setAllDistanceAttenuations(direct, reflection, diffraction, reverb) {
        this.h.withScope(s => {
            const d = s.block(VEC3_SIZE);
            writeVec3(this.h, d, direct);
            const r = s.block(VEC3_SIZE);
            writeVec3(this.h, r, reflection);
            const df = s.block(VEC3_SIZE);
            writeVec3(this.h, df, diffraction);
            const rv = s.block(VEC3_SIZE);
            writeVec3(this.h, rv, reverb);
            requireOk(this.b.exaSourceSetDistanceAttenuations(this.id, d, r, df, rv), 'exaSourceSetDistanceAttenuations', this.b.exaGetLastError);
        });
        return this;
    }
    getAllDistanceAttenuations() {
        return this.h.withScope(s => {
            const d = s.block(VEC3_SIZE);
            const r = s.block(VEC3_SIZE);
            const df = s.block(VEC3_SIZE);
            const rv = s.block(VEC3_SIZE);
            requireOk(this.b.exaSourceGetDistanceAttenuations(this.id, d, r, df, rv), 'exaSourceGetDistanceAttenuations', this.b.exaGetLastError);
            return {
                direct: readVec3(this.h, d),
                reflection: readVec3(this.h, r),
                diffraction: readVec3(this.h, df),
                reverb: readVec3(this.h, rv),
            };
        });
    }
    /** Inverse of the distance-attenuation curve: the distance (meters) at which
     *  this source's `pathType` attenuation reaches `targetAttenuation`. */
    findDistanceForAttenuation(pathType, targetAttenuation) {
        return this.h.withScope(s => {
            const p = s.f32();
            requireOk(this.b.exaSourceFindDistanceForAttenuation(this.id, pathType, targetAttenuation, p), 'exaSourceFindDistanceForAttenuation', this.b.exaGetLastError);
            return this.h.readF32(p);
        });
    }
    /** Stage this source's axisymmetric per-band directivity table.
     *  `anglesDeg` are strictly-ascending angles-from-front (2..512 of them);
     *  `attenDbPerBand` is a row-major `[angle][band]` array of length
     *  `anglesDeg.length * EXA_MAX_FREQUENCY_COUNT` — energy attenuation in dB
     *  (0 = on-axis, negative = quieter off-axis). Staging only; call
     *  `setDirectivityEnabled(true)` to apply. Ascending-angle and finite-value
     *  checks are enforced by the core (surfaced as an error). */
    setDirectivityTable(anglesDeg, attenDbPerBand) {
        const nAngles = assertDirectivityArrays(anglesDeg, attenDbPerBand);
        const expected = nAngles * EXA_MAX_FREQUENCY_COUNT;
        this.h.withScope(s => {
            const anglesPtr = s.block(nAngles * 4, p => this.h.writeF32Array(p, anglesDeg));
            const attenPtr = s.block(expected * 4, p => this.h.writeF32Array(p, attenDbPerBand));
            requireOk(this.b.exaSourceSetDirectivityTable(this.id, anglesPtr, nAngles, attenPtr), 'exaSourceSetDirectivityTable', this.b.exaGetLastError);
        });
        return this;
    }
    /** Enable or disable the staged directivity table. Disabled (default) leaves
     *  the source omni — bit-identical to a build without directivity. */
    setDirectivityEnabled(enabled) {
        requireOk(this.b.exaSourceSetDirectivityEnabled(this.id, enabled ? 1 : 0), 'exaSourceSetDirectivityEnabled', this.b.exaGetLastError);
        return this;
    }
    dispose() {
        if (this._disposed)
            return;
        this.b.exaSourceDestroy(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundSource.js.map