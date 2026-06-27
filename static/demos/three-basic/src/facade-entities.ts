import type { AudioOption } from './native-public.js';
import type { MeshNativeLike, ObjectNativeLike, SourceNativeLike, ListenerNativeLike } from './facade-native-types.js';
import { applyListenerRenderOptions, applySourcePathOptions, objectUpdateTypeName, objectUpdateTypeValue, sourcePathTypeValue, type ListenerRenderOptions, type ObjectUpdateType, type SourcePathOptions, type SourcePathType } from './facade-options.js';
import { CORE_COORDINATE_TRANSFORM, transformQuat, transformScale, transformVec3, type CoordinateTransform, type Pose } from './facade-coordinate.js';

function requireObjectUpdateTypeSet(ok: boolean): void {
  if (!ok) throw new Error('[soundtrace.js] failed to set object update type');
}

// --- entity wrappers --------------------------------------------------------
/** Minimal SoundTrace surface that Source.play() needs. Decoupled from the
 *  full class so facade.ts stays import-cycle-free (SoundTrace imports from
 *  facade.ts, facade.ts only references this structural type). */
export interface SourceHost {
  _playSource(source: Source, channels: number): Promise<AudioWorkletNode>;
}

/** A spatialized sound source. Reach the low-level object via `.native`.
 *  Created via `SoundTrace.addSource()`; `play()` wires an input node into the
 *  wasm AudioWorklet for spatialized rendering. */
export class Source {
  constructor(
    private readonly src: SourceNativeLike,
    private readonly host: SourceHost,
    private readonly coordinateTransform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
  ) {}
  get native(): SourceNativeLike { return this.src; }
  setPose(p: Pose): this {
    if (p.position) { const [x, y, z] = transformVec3(p.position, this.coordinateTransform); this.src.setPosition(x, y, z); }
    return this;
  }
  /** Linear gain (1 = unity). Maps to the source intensity. */
  setGain(linear: number): this { this.src.setIntensity(linear); return this; }
  setPathEnabled(path: SourcePathType, enabled: boolean): this {
    this.src.setPathEnable(sourcePathTypeValue(path), enabled);
    return this;
  }
  setPathOptions(options: SourcePathOptions): this {
    applySourcePathOptions(this.src, options);
    return this;
  }
  isPathEnabled(path: SourcePathType): boolean {
    return this.src.isPathEnabled(sourcePathTypeValue(path));
  }

  /** Wire `input` (a dry AudioNode) through the wasm AudioWorklet for
   *  spatialized rendering. Returns the worklet node; the caller connects it
   *  onward (typically `worklet.connect(sound.output).connect(ctx.destination)`).
   *  The input→worklet connection is made here; the output connection is the
   *  caller's responsibility so the audio graph stays caller-owned. */
  async play(input: AudioNode, channels = 2): Promise<AudioWorkletNode> {
    const node = await this.host._playSource(this, channels);
    input.connect(node);
    return node;
  }

  dispose(): void { this.src.dispose(); }
}

/** A piece of scene geometry (an acoustic mesh + its scene object). */
export class Mesh {
  constructor(
    private readonly mesh: MeshNativeLike,
    private readonly obj: ObjectNativeLike,
    private readonly coordinateTransform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
  ) {}
  get native(): MeshNativeLike { return this.mesh; }
  get object(): ObjectNativeLike { return this.obj; }
  getUpdateType(): ObjectUpdateType {
    return objectUpdateTypeName(this.obj.getUpdateType());
  }
  setUpdateType(type: ObjectUpdateType): this {
    requireObjectUpdateTypeSet(this.obj.setUpdateType(objectUpdateTypeValue(type)));
    return this;
  }
  setPose(p: Pose): this {
    if (p.position) { const [x, y, z] = transformVec3(p.position, this.coordinateTransform); this.obj.setPosition(x, y, z); }
    if (p.orientation) { const [x, y, z, w] = transformQuat(p.orientation, this.coordinateTransform); this.obj.setRotationQuat(x, y, z, w); }
    if (p.scale) { const [x, y, z] = transformScale(p.scale, this.coordinateTransform); this.obj.setScale(x, y, z); }
    return this;
  }
  dispose(): void { this.mesh.dispose(); this.obj.dispose(); }
}

/** The single scene listener (the "ears"). */
export class Listener {
  constructor(
    private readonly lis: ListenerNativeLike,
    private readonly coordinateTransform: CoordinateTransform = CORE_COORDINATE_TRANSFORM,
  ) {}
  get native(): ListenerNativeLike { return this.lis; }
  setPose(p: Pose): this {
    if (p.position) { const [x, y, z] = transformVec3(p.position, this.coordinateTransform); this.lis.setPosition(x, y, z); }
    if (p.orientation) { const [x, y, z, w] = transformQuat(p.orientation, this.coordinateTransform); this.lis.setOrientationQuat(x, y, z, w); }
    return this;
  }
  setAudioOption(option: AudioOption): this {
    this.lis.setAudioOption(option);
    return this;
  }
  setRenderOptions(options: ListenerRenderOptions): this {
    applyListenerRenderOptions(this.native, options);
    return this;
  }
}
