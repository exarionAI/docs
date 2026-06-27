import type { AudioOption } from './native-public.js';
import type { MeshNativeLike, ObjectNativeLike, SourceNativeLike, ListenerNativeLike } from './facade-native-types.js';
import { type ListenerRenderOptions, type ObjectUpdateType, type SourcePathOptions, type SourcePathType } from './facade-options.js';
import { type CoordinateTransform, type Pose } from './facade-coordinate.js';
/** Minimal SoundTrace surface that Source.play() needs. Decoupled from the
 *  full class so facade.ts stays import-cycle-free (SoundTrace imports from
 *  facade.ts, facade.ts only references this structural type). */
export interface SourceHost {
    _playSource(source: Source, channels: number): Promise<AudioWorkletNode>;
}
/** A spatialized sound source. Reach the low-level object via `.native`.
 *  Created via `SoundTrace.addSource()`; `play()` wires an input node into the
 *  wasm AudioWorklet for spatialized rendering. */
export declare class Source {
    private readonly src;
    private readonly host;
    private readonly coordinateTransform;
    constructor(src: SourceNativeLike, host: SourceHost, coordinateTransform?: CoordinateTransform);
    get native(): SourceNativeLike;
    setPose(p: Pose): this;
    /** Linear gain (1 = unity). Maps to the source intensity. */
    setGain(linear: number): this;
    setPathEnabled(path: SourcePathType, enabled: boolean): this;
    setPathOptions(options: SourcePathOptions): this;
    isPathEnabled(path: SourcePathType): boolean;
    /** Wire `input` (a dry AudioNode) through the wasm AudioWorklet for
     *  spatialized rendering. Returns the worklet node; the caller connects it
     *  onward (typically `worklet.connect(sound.output).connect(ctx.destination)`).
     *  The input→worklet connection is made here; the output connection is the
     *  caller's responsibility so the audio graph stays caller-owned. */
    play(input: AudioNode, channels?: number): Promise<AudioWorkletNode>;
    dispose(): void;
}
/** A piece of scene geometry (an acoustic mesh + its scene object). */
export declare class Mesh {
    private readonly mesh;
    private readonly obj;
    private readonly coordinateTransform;
    constructor(mesh: MeshNativeLike, obj: ObjectNativeLike, coordinateTransform?: CoordinateTransform);
    get native(): MeshNativeLike;
    get object(): ObjectNativeLike;
    getUpdateType(): ObjectUpdateType;
    setUpdateType(type: ObjectUpdateType): this;
    setPose(p: Pose): this;
    dispose(): void;
}
/** The single scene listener (the "ears"). */
export declare class Listener {
    private readonly lis;
    private readonly coordinateTransform;
    constructor(lis: ListenerNativeLike, coordinateTransform?: CoordinateTransform);
    get native(): ListenerNativeLike;
    setPose(p: Pose): this;
    setAudioOption(option: AudioOption): this;
    setRenderOptions(options: ListenerRenderOptions): this;
}
//# sourceMappingURL=facade-entities.d.ts.map