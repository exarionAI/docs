import { readVec3, writeVec3, VEC3_SIZE } from './native/index.js';
/** Path type constants used by `exaSoundSourceGetDistanceAttenuation(id, pathType, ...)` etc.
 *  Mirrors the engine enum (`config/exa_enum.h::PathFlag::Type`). All five
 *  types — including transmission — accept their own distance-attenuation
 *  curve. exaStudio's ECS_AudioSTComponent also sets all five explicitly. */
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
        this.id = b.exaNewSoundSource();
    }
    // --- position ---
    setPosition(x, y, z) {
        this.b.exaSoundSourceSetPosition(this.id, x, y, z);
        return this;
    }
    getPosition() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            this.b.exaSoundSourceGetPosition(this.id, x, y, z);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    // --- direction ---
    setDirection(x, y, z) {
        this.b.exaSoundSourceSetDirection(this.id, x, y, z);
        return this;
    }
    getDirection() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            this.b.exaSoundSourceGetDirection(this.id, x, y, z);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    // --- velocity ---
    setVelocity(x, y, z) {
        this.b.exaSoundSourceSetVelocity(this.id, x, y, z);
        return this;
    }
    getVelocity() {
        return this.h.withScope(s => {
            const x = s.f32(), y = s.f32(), z = s.f32();
            this.b.exaSoundSourceGetVelocity(this.id, x, y, z);
            return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
        });
    }
    // --- scalar params ---
    setIntensity(v) { this.b.exaSoundSourceSetIntensity(this.id, v); return this; }
    getIntensity() {
        return this.h.withScope(s => {
            const p = s.f32();
            this.b.exaSoundSourceGetIntensity(this.id, p);
            return this.h.readF32(p);
        });
    }
    setGainBoostDb(db) { this.b.exaSoundSourceSetGainBoostDb(this.id, db); return this; }
    getGainBoostDb() {
        return this.h.withScope(s => {
            const p = s.f32();
            this.b.exaSoundSourceGetGainBoostDb(this.id, p);
            return this.h.readF32(p);
        });
    }
    setReverbSendDb(db) { this.b.exaSoundSourceSetReverbSendDb(this.id, db); return this; }
    getReverbSendDb() {
        return this.h.withScope(s => {
            const p = s.f32();
            this.b.exaSoundSourceGetReverbSendDb(this.id, p);
            return this.h.readF32(p);
        });
    }
    setReflectionSendDb(db) { this.b.exaSoundSourceSetReflectionSendDb(this.id, db); return this; }
    getReflectionSendDb() {
        return this.h.withScope(s => {
            const p = s.f32();
            this.b.exaSoundSourceGetReflectionSendDb(this.id, p);
            return this.h.readF32(p);
        });
    }
    // --- source path enable ---
    setPathEnable(pathType, enabled) {
        this.b.exaSoundSourceSetPathEnable(this.id, pathType, enabled);
        return this;
    }
    isPathEnabled(pathType) {
        return this.h.withScope(s => {
            const p = s.bool();
            this.b.exaSoundSourceIsPathEnabled(this.id, pathType, p);
            return this.h.readBool(p);
        });
    }
    setAmbientEnabled(enabled) {
        this.b.exaSoundSourceSetAmbientEnabled(this.id, enabled);
        return this;
    }
    getAmbientEnabled() {
        return this.h.withScope(s => {
            const p = s.bool();
            this.b.exaSoundSourceGetAmbientEnabled(this.id, p);
            return this.h.readBool(p);
        });
    }
    setDepth(depth) { this.b.exaSoundSourceSetDepth(this.id, depth); return this; }
    getDepth() {
        return this.h.withScope(s => {
            const p = s.i32();
            this.b.exaSoundSourceGetDepth(this.id, p);
            return this.h.readI32(p);
        });
    }
    getDepthOk() {
        return this.h.withScope(s => this.b.exaSoundSourceGetDepth(this.id, s.i32()));
    }
    // --- ray count ---
    setRayCount(w, h) {
        this.b.exaSoundSourceSetRayCount(this.id, w, h);
        return this;
    }
    getRayCount() {
        return this.h.withScope(s => {
            const w = s.i32(), h = s.i32();
            this.b.exaSoundSourceGetRayCount(this.id, w, h);
            return { width: this.h.readI32(w), height: this.h.readI32(h) };
        });
    }
    // --- reverb ray aliases ---
    setReverbRayCount(width, height) { return this.setRayCount(width, height); }
    getReverbRayCount() { return this.getRayCount(); }
    setReverbRayDepth(depth) { return this.setDepth(depth); }
    getReverbRayDepth() { return this.getDepth(); }
    // --- distance attenuation ---
    getDistanceAttenuation(pathType) {
        return this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            this.b.exaSoundSourceGetDistanceAttenuation(this.id, pathType, p);
            return readVec3(this.h, p);
        });
    }
    setDistanceAttenuation(pathType, v) {
        this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            writeVec3(this.h, p, v);
            this.b.exaSoundSourceSetDistanceAttenuation(this.id, pathType, p);
        });
        return this;
    }
    /** Set all four path-type attenuations (direct / reflection / diffraction / reverb) in one call. */
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
            this.b.exaSoundSourceGetDistanceAttenuations(this.id, d, r, df, rv);
        });
        return this;
    }
    getAllDistanceAttenuations() {
        return this.h.withScope(s => {
            const d = s.block(VEC3_SIZE);
            const r = s.block(VEC3_SIZE);
            const df = s.block(VEC3_SIZE);
            const rv = s.block(VEC3_SIZE);
            this.b.exaSoundSourceSetDistanceAttenuations(this.id, d, r, df, rv);
            return {
                direct: readVec3(this.h, d),
                reflection: readVec3(this.h, r),
                diffraction: readVec3(this.h, df),
                reverb: readVec3(this.h, rv),
            };
        });
    }
    dispose() {
        if (this._disposed)
            return;
        this.b.exaDeleteSoundSource(this.id);
        this._disposed = true;
    }
    /** @inheritdoc */
    [Symbol.dispose]() { this.dispose(); }
}
//# sourceMappingURL=SoundSource.js.map