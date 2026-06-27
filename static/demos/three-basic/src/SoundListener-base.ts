import type { AmbientPhysicalFilterOption, AirAbsorptionOption, Bindings, Heap, Transform, Vec3, AudioOption, STOption } from './native/index.js';
import { AMBIENT_PHYSICAL_FILTER_OPTION_SIZE, AIR_ABSORPTION_OPTION_SIZE, AUDIO_OPTION_SIZE, MAT3X3_SIZE, ST_OPTION_SIZE, TRANSFORM_SIZE, VEC3_SIZE, readAmbientPhysicalFilterOption, readAirAbsorptionOption, readAudioOption, readSTOption, readTransform, readVec3, writeAmbientPhysicalFilterOption, writeAirAbsorptionOption, writeAudioOption, writeSTOption, writeTransform } from './native/index.js';

export class SoundListenerBase {
  protected readonly b: Bindings;
  protected readonly h: Heap;
  readonly id: number;

  constructor(b: Bindings, h: Heap) {
    this.b = b;
    this.h = h;
    this.id = b.exaNewListener();
  }

  // --- transform (pointer-based; preferred path) ---
  setTransform(t: Transform): this {
    this.h.withScope(s => {
      const p = s.block(TRANSFORM_SIZE);
      writeTransform(this.h, p, t);
      this.b.exaListenerSetTransform(this.id, p);
    });
    return this;
  }
  getTransform(): Transform {
    return this.h.withScope(s => {
      const p = s.block(TRANSFORM_SIZE);
      this.b.exaListenerGetTransform(this.id, p);
      return readTransform(this.h, p);
    });
  }

  // --- position / velocity (ExaVec3f by value, lowered to an sret pointer) ---
  setPosition(x: number, y: number, z: number): this {
    this.h.withScope(s => {
      const p = s.block(VEC3_SIZE);
      this.h.writeF32(p + 0, x); this.h.writeF32(p + 4, y); this.h.writeF32(p + 8, z);
      this.b.exaListenerSetPosition(this.id, p);
    });
    return this;
  }
  getPosition(): Vec3 {
    return this.h.withScope(s => {
      const p = s.block(VEC3_SIZE);
      this.b.exaListenerGetPosition(this.id, p);
      return readVec3(this.h, p);
    });
  }
  setVelocity(x: number, y: number, z: number): this {
    this.h.withScope(s => {
      const p = s.block(VEC3_SIZE);
      this.h.writeF32(p + 0, x); this.h.writeF32(p + 4, y); this.h.writeF32(p + 8, z);
      this.b.exaListenerSetVelocity(this.id, p);
    });
    return this;
  }
  getVelocity(): Vec3 {
    return this.h.withScope(s => {
      const p = s.block(VEC3_SIZE);
      this.b.exaListenerGetVelocity(this.id, p);
      return readVec3(this.h, p);
    });
  }

  // --- orientation ---
  setOrientation(mat3x3: ArrayLike<number>): this {
    this.h.withScope(s => {
      const p = s.block(MAT3X3_SIZE);
      this.h.writeF32Array(p, mat3x3);
      this.b.exaListenerSetOrientation(this.id, p);
    });
    return this;
  }
  setOrientationQuat(qx: number, qy: number, qz: number, qw: number): this {
    this.b.exaListenerSetOrientation_Quaternion(this.id, qx, qy, qz, qw);
    return this;
  }

  // --- options ---
  setOption(opt: STOption): this {
    this.h.withScope(s => {
      const p = s.block(ST_OPTION_SIZE);
      writeSTOption(this.h, p, opt);
      if (!this.b.exaListenerSetOption(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to set listener option: ${this.b.exaGetLastError()}`);
      }
    });
    return this;
  }
  getOption(): STOption {
    return this.h.withScope(s => {
      const p = s.block(ST_OPTION_SIZE);
      if (!this.b.exaListenerGetOption(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get listener option: ${this.b.exaGetLastError()}`);
      }
      return readSTOption(this.h, p);
    });
  }

  setAudioOption(opt: AudioOption): this {
    this.h.withScope(s => {
      const p = s.block(AUDIO_OPTION_SIZE);
      writeAudioOption(this.h, p, opt);
      if (!this.b.exaListenerSetAudioOption(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to set listener audio option: ${this.b.exaGetLastError()}`);
      }
    });
    return this;
  }
  getAudioOption(): AudioOption {
    return this.h.withScope(s => {
      const p = s.block(AUDIO_OPTION_SIZE);
      if (!this.b.exaListenerGetAudioOption(this.id, p)) {
        throw new Error(`[soundtrace.js] failed to get listener audio option: ${this.b.exaGetLastError()}`);
      }
      return readAudioOption(this.h, p);
    });
  }

  setAmbientPhysicalFilterOption(opt: AmbientPhysicalFilterOption): this {
    this.h.withScope(s => {
      const p = s.block(AMBIENT_PHYSICAL_FILTER_OPTION_SIZE);
      writeAmbientPhysicalFilterOption(this.h, p, opt);
      if (!this.b.exaListenerSetAmbientPhysicalFilterOption(this.id, p)) {
        throw new Error(
          `[soundtrace.js] failed to set ambient physical filter option: ${this.b.exaGetLastError()}`,
        );
      }
    });
    return this;
  }
  getAmbientPhysicalFilterOption(): AmbientPhysicalFilterOption {
    return this.h.withScope(s => {
      const p = s.block(AMBIENT_PHYSICAL_FILTER_OPTION_SIZE);
      if (!this.b.exaListenerGetAmbientPhysicalFilterOption(this.id, p)) {
        throw new Error(
          `[soundtrace.js] failed to get ambient physical filter option: ${this.b.exaGetLastError()}`,
        );
      }
      return readAmbientPhysicalFilterOption(this.h, p);
    });
  }

  // --- air absorption (atmospheric conditions; v0.6 / ABI 2) ---
  // Temperature/humidity/pressure moved here from the ambient physical filter.
  setAirAbsorptionOption(opt: AirAbsorptionOption): this {
    this.h.withScope(s => {
      const p = s.block(AIR_ABSORPTION_OPTION_SIZE);
      writeAirAbsorptionOption(this.h, p, opt);
      if (!this.b.exaListenerSetAirAbsorptionOption(this.id, p)) {
        throw new Error(
          `[soundtrace.js] failed to set air absorption option: ${this.b.exaGetLastError()}`,
        );
      }
    });
    return this;
  }
  getAirAbsorptionOption(): AirAbsorptionOption {
    return this.h.withScope(s => {
      const p = s.block(AIR_ABSORPTION_OPTION_SIZE);
      if (!this.b.exaListenerGetAirAbsorptionOption(this.id, p)) {
        throw new Error(
          `[soundtrace.js] failed to get air absorption option: ${this.b.exaGetLastError()}`,
        );
      }
      return readAirAbsorptionOption(this.h, p);
    });
  }

  // --- path enable ---
  setPathEnable(pathType: number, enabled: boolean): this {
    this.b.exaListenerSetPathEnable(this.id, pathType, enabled);
    return this;
  }
  isPathEnabled(pathType: number): boolean {
    return this.h.withScope(s => {
      const p = s.bool();
      this.b.exaListenerIsPathEnabled(this.id, pathType, p);
      return this.h.readBool(p);
    });
  }

  // --- ray count / depth ---
  setRayCount(w: number, h: number): this { this.b.exaListenerSetRayCount(this.id, w, h); return this; }
  getRayCount(): { width: number; height: number } {
    return this.h.withScope(s => {
      const w = s.i32(), h = s.i32();
      this.b.exaListenerGetRayCount(this.id, w, h);
      return { width: this.h.readI32(w), height: this.h.readI32(h) };
    });
  }
  setRayDepth(d: number): this { this.b.exaListenerSetRayDepth(this.id, d); return this; }
  getRayDepth(): number {
    return this.h.withScope(s => {
      const p = s.i32();
      this.b.exaListenerGetRayDepth(this.id, p);
      return this.h.readI32(p);
    });
  }
}
