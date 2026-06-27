import { applyListenerRenderOptions, applySourcePathOptions, objectUpdateTypeName, objectUpdateTypeValue, sourcePathTypeValue } from './facade-options.js';
import { CORE_COORDINATE_TRANSFORM, transformQuat, transformScale, transformVec3 } from './facade-coordinate.js';
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
    coordinateTransform;
    constructor(src, host, coordinateTransform = CORE_COORDINATE_TRANSFORM) {
        this.src = src;
        this.host = host;
        this.coordinateTransform = coordinateTransform;
    }
    get native() { return this.src; }
    setPose(p) {
        if (p.position) {
            const [x, y, z] = transformVec3(p.position, this.coordinateTransform);
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
    dispose() { this.src.dispose(); }
}
/** A piece of scene geometry (an acoustic mesh + its scene object). */
export class Mesh {
    mesh;
    obj;
    coordinateTransform;
    constructor(mesh, obj, coordinateTransform = CORE_COORDINATE_TRANSFORM) {
        this.mesh = mesh;
        this.obj = obj;
        this.coordinateTransform = coordinateTransform;
    }
    get native() { return this.mesh; }
    get object() { return this.obj; }
    getUpdateType() {
        return objectUpdateTypeName(this.obj.getUpdateType());
    }
    setUpdateType(type) {
        requireObjectUpdateTypeSet(this.obj.setUpdateType(objectUpdateTypeValue(type)));
        return this;
    }
    setPose(p) {
        if (p.position) {
            const [x, y, z] = transformVec3(p.position, this.coordinateTransform);
            this.obj.setPosition(x, y, z);
        }
        if (p.orientation) {
            const [x, y, z, w] = transformQuat(p.orientation, this.coordinateTransform);
            this.obj.setRotationQuat(x, y, z, w);
        }
        if (p.scale) {
            const [x, y, z] = transformScale(p.scale, this.coordinateTransform);
            this.obj.setScale(x, y, z);
        }
        return this;
    }
    dispose() { this.mesh.dispose(); this.obj.dispose(); }
}
/** The single scene listener (the "ears"). */
export class Listener {
    lis;
    coordinateTransform;
    constructor(lis, coordinateTransform = CORE_COORDINATE_TRANSFORM) {
        this.lis = lis;
        this.coordinateTransform = coordinateTransform;
    }
    get native() { return this.lis; }
    setPose(p) {
        if (p.position) {
            const [x, y, z] = transformVec3(p.position, this.coordinateTransform);
            this.lis.setPosition(x, y, z);
        }
        if (p.orientation) {
            const [x, y, z, w] = transformQuat(p.orientation, this.coordinateTransform);
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
}
//# sourceMappingURL=facade-entities.js.map