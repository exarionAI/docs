import type { AudioOption } from './native-public.js';
type NativeEnumValue = number;
export interface SourceNativeLike {
    readonly id: number;
    dispose(): void;
    getIntensity(): number;
    getPosition(): {
        x: number;
        y: number;
        z: number;
    };
    isPathEnabled(pathType: NativeEnumValue): boolean;
    setIntensity(value: number): SourceNativeLike;
    setPathEnable(pathType: NativeEnumValue, enabled: boolean): SourceNativeLike;
    setPosition(x: number, y: number, z: number): SourceNativeLike;
}
export interface MeshNativeLike {
    readonly id: number;
    dispose(): void;
}
export interface ObjectNativeLike {
    readonly id: number;
    dispose(): void;
    getPosition(): {
        x: number;
        y: number;
        z: number;
    };
    getScale(): {
        x: number;
        y: number;
        z: number;
    };
    getUpdateType(): number;
    setPosition(x: number, y: number, z: number): ObjectNativeLike;
    setRotationQuat(x: number, y: number, z: number, w: number): ObjectNativeLike;
    setScale(x: number, y: number, z: number): ObjectNativeLike;
    setUpdateType(value: NativeEnumValue): boolean;
}
export interface ListenerNativeLike {
    readonly id: number;
    getAudioOption(): AudioOption;
    getDelayInterpolation(): NativeEnumValue;
    getDiffuseEnabled(): boolean;
    getDiffuseQuality(): NativeEnumValue;
    getHrtfMode(): NativeEnumValue | null;
    getHrtfQuality(): NativeEnumValue;
    getLateReverbMode(): NativeEnumValue;
    getPerBandLateReverb(): boolean;
    getPosition(): {
        x: number;
        y: number;
        z: number;
    };
    setAudioOption(option: AudioOption): ListenerNativeLike;
    setDelayInterpolation(value: NativeEnumValue): boolean;
    setDiffuseEnabled(value: boolean): boolean;
    setDiffuseQuality(value: NativeEnumValue): boolean;
    setEarlyRenderPathBudget(value: number): boolean;
    setHrtfQuality(value: NativeEnumValue): boolean;
    setLateReverbMode(value: NativeEnumValue): boolean;
    setOrientationQuat(x: number, y: number, z: number, w: number): ListenerNativeLike;
    setPerBandLateReverb(value: boolean): boolean;
    setPosition(x: number, y: number, z: number): ListenerNativeLike;
}
export {};
//# sourceMappingURL=facade-native-types.d.ts.map