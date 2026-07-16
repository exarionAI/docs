import { AMBIENT_PHYSICAL_FILTER_OPTION_SIZE, AIR_ABSORPTION_OPTION_SIZE, AUDIO_OPTION_SIZE, LISTENER_OPTION_SIZE, MAT3X3_SIZE, VEC3_SIZE, isOk, readAmbientPhysicalFilterOption, readAirAbsorptionOption, readAudioOption, readListenerOption, readVec3, requireOk, writeAmbientPhysicalFilterOption, writeAirAbsorptionOption, writeAudioOption, writeListenerOption } from '../native/index.js';
export class SoundListenerBase {
    b;
    h;
    id;
    constructor(b, h) {
        this.b = b;
        this.h = h;
        // v0.7 creator: out-param + ExaResult (EXA_ERR_NOT_LOADED if the default
        // HRTF is missing; EXA_ERR_INTERNAL if the renderer could not be created).
        this.id = h.withScope(s => {
            const p = s.i32();
            requireOk(b.exaListenerCreate(p), 'exaListenerCreate', b.exaGetLastError);
            return h.readI32(p);
        });
    }
    // (exaListenerGet/SetTransform were removed in v0.7 with ExaSTTransform —
    //  use setPosition / setOrientationQuat / setVelocity individually.)
    // --- position / velocity (ExaVec3f by value, lowered to a byval pointer) ---
    setPosition(x, y, z) {
        this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            this.h.writeF32(p + 0, x);
            this.h.writeF32(p + 4, y);
            this.h.writeF32(p + 8, z);
            requireOk(this.b.exaListenerSetPosition(this.id, p), 'exaListenerSetPosition', this.b.exaGetLastError);
        });
        return this;
    }
    getPosition() {
        return this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            requireOk(this.b.exaListenerGetPosition(this.id, p), 'exaListenerGetPosition', this.b.exaGetLastError);
            return readVec3(this.h, p);
        });
    }
    setVelocity(x, y, z) {
        this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            this.h.writeF32(p + 0, x);
            this.h.writeF32(p + 4, y);
            this.h.writeF32(p + 8, z);
            requireOk(this.b.exaListenerSetVelocity(this.id, p), 'exaListenerSetVelocity', this.b.exaGetLastError);
        });
        return this;
    }
    getVelocity() {
        return this.h.withScope(s => {
            const p = s.block(VEC3_SIZE);
            requireOk(this.b.exaListenerGetVelocity(this.id, p), 'exaListenerGetVelocity', this.b.exaGetLastError);
            return readVec3(this.h, p);
        });
    }
    // --- orientation ---
    setOrientation(mat3x3) {
        // The target is a fixed 36-byte ExaMat3x3 block — enforce the length before
        // the copy or a longer input writes past the allocation (finding #14).
        if (mat3x3.length !== 9) {
            throw new Error(`[soundtrace.js] setOrientation requires exactly 9 floats (row-major 3x3), got ${mat3x3.length}`);
        }
        this.h.withScope(s => {
            const p = s.block(MAT3X3_SIZE);
            this.h.writeF32Array(p, mat3x3);
            requireOk(this.b.exaListenerSetOrientation(this.id, p), 'exaListenerSetOrientation', this.b.exaGetLastError);
        });
        return this;
    }
    setOrientationQuat(qx, qy, qz, qw) {
        // v0.7: underscore dropped (exaListenerSetOrientationQuaternion).
        requireOk(this.b.exaListenerSetOrientationQuaternion(this.id, qx, qy, qz, qw), 'exaListenerSetOrientationQuaternion', this.b.exaGetLastError);
        return this;
    }
    /** v0.7 (D-16): read the orientation back as a unit quaternion (q ≡ -q). */
    getOrientationQuat() {
        return this.h.withScope(s => {
            const qx = s.f32(), qy = s.f32(), qz = s.f32(), qw = s.f32();
            requireOk(this.b.exaListenerGetOrientation(this.id, qx, qy, qz, qw), 'exaListenerGetOrientation', this.b.exaGetLastError);
            return {
                x: this.h.readF32(qx), y: this.h.readF32(qy),
                z: this.h.readF32(qz), w: this.h.readF32(qw),
            };
        });
    }
    // --- coordinate basis (host->core HRTF frame) ---
    // The rows of the basis are {right, up, forward}, projecting a host direction
    // d to [d·right, d·up, d·forward]. Reflected (det < 0) bases are allowed; the
    // core applies the projection to the HRTF direction only, so geometry stays
    // frame-relative. Returns false (basis unchanged) if a vector is non-finite or
    // zero-length, or the listener does not exist.
    setCoordinateBasis(right, up, forward) {
        return this.h.withScope(s => {
            const p = s.block(MAT3X3_SIZE);
            this.h.writeF32(p + 0, right[0]);
            this.h.writeF32(p + 4, right[1]);
            this.h.writeF32(p + 8, right[2]);
            this.h.writeF32(p + 12, up[0]);
            this.h.writeF32(p + 16, up[1]);
            this.h.writeF32(p + 20, up[2]);
            this.h.writeF32(p + 24, forward[0]);
            this.h.writeF32(p + 28, forward[1]);
            this.h.writeF32(p + 32, forward[2]);
            return isOk(this.b.exaListenerSetCoordinateBasis(this.id, p + 0, p + 12, p + 24));
        });
    }
    getCoordinateBasis() {
        return this.h.withScope(s => {
            const p = s.block(MAT3X3_SIZE);
            requireOk(this.b.exaListenerGetCoordinateBasis(this.id, p + 0, p + 12, p + 24), 'exaListenerGetCoordinateBasis', this.b.exaGetLastError);
            return {
                right: [this.h.readF32(p + 0), this.h.readF32(p + 4), this.h.readF32(p + 8)],
                up: [this.h.readF32(p + 12), this.h.readF32(p + 16), this.h.readF32(p + 20)],
                forward: [this.h.readF32(p + 24), this.h.readF32(p + 28), this.h.readF32(p + 32)],
            };
        });
    }
    // --- options ---
    /** v0.7: ExaListenerOption no longer carries the trace grid / bounce depth /
     *  quality preset (D-14) — apply those via setRayCount / setRayDepth /
     *  applyPreset. */
    setOption(opt) {
        this.h.withScope(s => {
            const p = s.block(LISTENER_OPTION_SIZE);
            writeListenerOption(this.h, p, opt);
            requireOk(this.b.exaListenerSetOption(this.id, p), 'exaListenerSetOption', this.b.exaGetLastError);
        });
        return this;
    }
    getOption() {
        return this.h.withScope(s => {
            const p = s.block(LISTENER_OPTION_SIZE);
            requireOk(this.b.exaListenerGetOption(this.id, p), 'exaListenerGetOption', this.b.exaGetLastError);
            return readListenerOption(this.h, p);
        });
    }
    /** Apply a curated propagation preset (EXA_PRESET_*, 1=ULTRA…5=LOWEST —
     *  INVERTED scale) through the grid/depth sole writers. */
    applyPreset(preset) {
        requireOk(this.b.exaListenerApplyPreset(this.id, preset), 'exaListenerApplyPreset', this.b.exaGetLastError);
        return this;
    }
    setAudioOption(opt) {
        this.h.withScope(s => {
            const p = s.block(AUDIO_OPTION_SIZE);
            writeAudioOption(this.h, p, opt);
            requireOk(this.b.exaListenerSetAudioOption(this.id, p), 'exaListenerSetAudioOption', this.b.exaGetLastError);
        });
        return this;
    }
    getAudioOption() {
        return this.h.withScope(s => {
            const p = s.block(AUDIO_OPTION_SIZE);
            requireOk(this.b.exaListenerGetAudioOption(this.id, p), 'exaListenerGetAudioOption', this.b.exaGetLastError);
            return readAudioOption(this.h, p);
        });
    }
    setAmbientPhysicalFilterOption(opt) {
        this.h.withScope(s => {
            const p = s.block(AMBIENT_PHYSICAL_FILTER_OPTION_SIZE);
            writeAmbientPhysicalFilterOption(this.h, p, opt);
            requireOk(this.b.exaListenerSetAmbientPhysicalFilterOption(this.id, p), 'exaListenerSetAmbientPhysicalFilterOption', this.b.exaGetLastError);
        });
        return this;
    }
    getAmbientPhysicalFilterOption() {
        return this.h.withScope(s => {
            const p = s.block(AMBIENT_PHYSICAL_FILTER_OPTION_SIZE);
            requireOk(this.b.exaListenerGetAmbientPhysicalFilterOption(this.id, p), 'exaListenerGetAmbientPhysicalFilterOption', this.b.exaGetLastError);
            return readAmbientPhysicalFilterOption(this.h, p);
        });
    }
    // --- air absorption (atmospheric conditions) ---
    // Temperature/humidity/pressure moved here from the ambient physical filter.
    setAirAbsorptionOption(opt) {
        this.h.withScope(s => {
            const p = s.block(AIR_ABSORPTION_OPTION_SIZE);
            writeAirAbsorptionOption(this.h, p, opt);
            requireOk(this.b.exaListenerSetAirAbsorptionOption(this.id, p), 'exaListenerSetAirAbsorptionOption', this.b.exaGetLastError);
        });
        return this;
    }
    getAirAbsorptionOption() {
        return this.h.withScope(s => {
            const p = s.block(AIR_ABSORPTION_OPTION_SIZE);
            requireOk(this.b.exaListenerGetAirAbsorptionOption(this.id, p), 'exaListenerGetAirAbsorptionOption', this.b.exaGetLastError);
            return readAirAbsorptionOption(this.h, p);
        });
    }
    // --- path enable ---
    setPathEnable(pathType, enabled) {
        requireOk(this.b.exaListenerSetPathEnabled(this.id, pathType, enabled), 'exaListenerSetPathEnabled', this.b.exaGetLastError);
        return this;
    }
    isPathEnabled(pathType) {
        return this.h.withScope(s => {
            const p = s.i32(); // ExaBool out-param is int32 in v0.7
            requireOk(this.b.exaListenerIsPathEnabled(this.id, pathType, p), 'exaListenerIsPathEnabled', this.b.exaGetLastError);
            return this.h.readI32(p) !== 0;
        });
    }
    // --- ray count / depth (SOLE writers of the trace grid / bounce depth) ---
    setRayCount(w, h) {
        requireOk(this.b.exaListenerSetRayCount(this.id, w, h), 'exaListenerSetRayCount', this.b.exaGetLastError);
        return this;
    }
    getRayCount() {
        return this.h.withScope(s => {
            const w = s.i32(), h = s.i32();
            requireOk(this.b.exaListenerGetRayCount(this.id, w, h), 'exaListenerGetRayCount', this.b.exaGetLastError);
            return { width: this.h.readI32(w), height: this.h.readI32(h) };
        });
    }
    setRayDepth(d) {
        requireOk(this.b.exaListenerSetRayDepth(this.id, d), 'exaListenerSetRayDepth', this.b.exaGetLastError);
        return this;
    }
    getRayDepth() {
        return this.h.withScope(s => {
            const p = s.i32();
            requireOk(this.b.exaListenerGetRayDepth(this.id, p), 'exaListenerGetRayDepth', this.b.exaGetLastError);
            return this.h.readI32(p);
        });
    }
}
//# sourceMappingURL=SoundListener-base.js.map