import type { Bindings, Heap, Vec3 } from './native/index.js';
import { readVec3, writeVec3, VEC3_SIZE } from './native/index.js';
import type { Disposable } from './Disposable.js';

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
} as const;
export type PathTypeValue = (typeof PathType)[keyof typeof PathType];
export interface DistanceAttenuations {
  direct: Vec3;
  reflection: Vec3;
  diffraction: Vec3;
  reverb: Vec3;
}

export class SoundSource implements Disposable {
  private readonly b: Bindings;
  private readonly h: Heap;
  readonly id: number;
  private _disposed = false;
  /** @inheritdoc */
  get disposed(): boolean { return this._disposed; }

  /** @internal — construct via `SoundTrace.createSource()`. */
  constructor(b: Bindings, h: Heap) {
    this.b = b;
    this.h = h;
    this.id = b.exaNewSoundSource();
  }

  // --- position ---
  setPosition(x: number, y: number, z: number): this {
    this.b.exaSoundSourceSetPosition(this.id, x, y, z);
    return this;
  }
  getPosition(): Vec3 {
    return this.h.withScope(s => {
      const x = s.f32(), y = s.f32(), z = s.f32();
      this.b.exaSoundSourceGetPosition(this.id, x, y, z);
      return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
    });
  }

  // --- direction ---
  setDirection(x: number, y: number, z: number): this {
    this.b.exaSoundSourceSetDirection(this.id, x, y, z);
    return this;
  }
  getDirection(): Vec3 {
    return this.h.withScope(s => {
      const x = s.f32(), y = s.f32(), z = s.f32();
      this.b.exaSoundSourceGetDirection(this.id, x, y, z);
      return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
    });
  }

  // --- velocity ---
  setVelocity(x: number, y: number, z: number): this {
    this.b.exaSoundSourceSetVelocity(this.id, x, y, z);
    return this;
  }
  getVelocity(): Vec3 {
    return this.h.withScope(s => {
      const x = s.f32(), y = s.f32(), z = s.f32();
      this.b.exaSoundSourceGetVelocity(this.id, x, y, z);
      return { x: this.h.readF32(x), y: this.h.readF32(y), z: this.h.readF32(z) };
    });
  }

  // --- scalar params ---
  setIntensity(v: number): this { this.b.exaSoundSourceSetIntensity(this.id, v); return this; }
  getIntensity(): number {
    return this.h.withScope(s => {
      const p = s.f32();
      this.b.exaSoundSourceGetIntensity(this.id, p);
      return this.h.readF32(p);
    });
  }

  setGainBoostDb(db: number): this { this.b.exaSoundSourceSetGainBoostDb(this.id, db); return this; }
  getGainBoostDb(): number {
    return this.h.withScope(s => {
      const p = s.f32();
      this.b.exaSoundSourceGetGainBoostDb(this.id, p);
      return this.h.readF32(p);
    });
  }

  setReverbSendDb(db: number): this { this.b.exaSoundSourceSetReverbSendDb(this.id, db); return this; }
  getReverbSendDb(): number {
    return this.h.withScope(s => {
      const p = s.f32();
      this.b.exaSoundSourceGetReverbSendDb(this.id, p);
      return this.h.readF32(p);
    });
  }

  setReflectionSendDb(db: number): this { this.b.exaSoundSourceSetReflectionSendDb(this.id, db); return this; }
  getReflectionSendDb(): number {
    return this.h.withScope(s => {
      const p = s.f32();
      this.b.exaSoundSourceGetReflectionSendDb(this.id, p);
      return this.h.readF32(p);
    });
  }

  // --- source path enable ---
  setPathEnable(pathType: PathTypeValue, enabled: boolean): this {
    this.b.exaSoundSourceSetPathEnable(this.id, pathType, enabled);
    return this;
  }
  isPathEnabled(pathType: PathTypeValue): boolean {
    return this.h.withScope(s => {
      const p = s.bool();
      this.b.exaSoundSourceIsPathEnabled(this.id, pathType, p);
      return this.h.readBool(p);
    });
  }
  setAmbientEnabled(enabled: boolean): this {
    this.b.exaSoundSourceSetAmbientEnabled(this.id, enabled);
    return this;
  }
  getAmbientEnabled(): boolean {
    return this.h.withScope(s => {
      const p = s.bool();
      this.b.exaSoundSourceGetAmbientEnabled(this.id, p);
      return this.h.readBool(p);
    });
  }

  setDepth(depth: number): this { this.b.exaSoundSourceSetDepth(this.id, depth); return this; }
  getDepth(): number {
    return this.h.withScope(s => {
      const p = s.i32();
      this.b.exaSoundSourceGetDepth(this.id, p);
      return this.h.readI32(p);
    });
  }
  getDepthOk(): boolean {
    return this.h.withScope(s => this.b.exaSoundSourceGetDepth(this.id, s.i32()));
  }

  // --- ray count ---
  setRayCount(w: number, h: number): this {
    this.b.exaSoundSourceSetRayCount(this.id, w, h);
    return this;
  }
  getRayCount(): { width: number; height: number } {
    return this.h.withScope(s => {
      const w = s.i32(), h = s.i32();
      this.b.exaSoundSourceGetRayCount(this.id, w, h);
      return { width: this.h.readI32(w), height: this.h.readI32(h) };
    });
  }

  // --- reverb ray aliases ---
  setReverbRayCount(width: number, height: number): this { return this.setRayCount(width, height); }
  getReverbRayCount(): { width: number; height: number } { return this.getRayCount(); }
  setReverbRayDepth(depth: number): this { return this.setDepth(depth); }
  getReverbRayDepth(): number { return this.getDepth(); }

  // --- distance attenuation ---
  getDistanceAttenuation(pathType: PathTypeValue): Vec3 {
    return this.h.withScope(s => {
      const p = s.block(VEC3_SIZE);
      this.b.exaSoundSourceGetDistanceAttenuation(this.id, pathType, p);
      return readVec3(this.h, p);
    });
  }
  setDistanceAttenuation(pathType: PathTypeValue, v: Vec3): this {
    this.h.withScope(s => {
      const p = s.block(VEC3_SIZE);
      writeVec3(this.h, p, v);
      this.b.exaSoundSourceSetDistanceAttenuation(this.id, pathType, p);
    });
    return this;
  }
  /** Set all four path-type attenuations (direct / reflection / diffraction / reverb) in one call. */
  setAllDistanceAttenuations(direct: Vec3, reflection: Vec3, diffraction: Vec3, reverb: Vec3): this {
    this.h.withScope(s => {
      const d = s.block(VEC3_SIZE); writeVec3(this.h, d, direct);
      const r = s.block(VEC3_SIZE); writeVec3(this.h, r, reflection);
      const df = s.block(VEC3_SIZE); writeVec3(this.h, df, diffraction);
      const rv = s.block(VEC3_SIZE); writeVec3(this.h, rv, reverb);
      this.b.exaSoundSourceGetDistanceAttenuations(this.id, d, r, df, rv);
    });
    return this;
  }
  getAllDistanceAttenuations(): DistanceAttenuations {
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

  dispose(): void {
    if (this._disposed) return;
    this.b.exaDeleteSoundSource(this.id);
    this._disposed = true;
  }
  /** @inheritdoc */
  [Symbol.dispose](): void { this.dispose(); }
}
