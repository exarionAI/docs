import type { AmbientPhysicalFilterOption, AirAbsorptionOption, Bindings, Heap, Transform, Vec3, AudioOption, STOption } from './native/index.js';
export declare class SoundListenerBase {
    protected readonly b: Bindings;
    protected readonly h: Heap;
    readonly id: number;
    constructor(b: Bindings, h: Heap);
    setTransform(t: Transform): this;
    getTransform(): Transform;
    setPosition(x: number, y: number, z: number): this;
    getPosition(): Vec3;
    setVelocity(x: number, y: number, z: number): this;
    getVelocity(): Vec3;
    setOrientation(mat3x3: ArrayLike<number>): this;
    setOrientationQuat(qx: number, qy: number, qz: number, qw: number): this;
    setOption(opt: STOption): this;
    getOption(): STOption;
    setAudioOption(opt: AudioOption): this;
    getAudioOption(): AudioOption;
    setAmbientPhysicalFilterOption(opt: AmbientPhysicalFilterOption): this;
    getAmbientPhysicalFilterOption(): AmbientPhysicalFilterOption;
    setAirAbsorptionOption(opt: AirAbsorptionOption): this;
    getAirAbsorptionOption(): AirAbsorptionOption;
    setPathEnable(pathType: number, enabled: boolean): this;
    isPathEnabled(pathType: number): boolean;
    setRayCount(w: number, h: number): this;
    getRayCount(): {
        width: number;
        height: number;
    };
    setRayDepth(d: number): this;
    getRayDepth(): number;
}
//# sourceMappingURL=SoundListener-base.d.ts.map