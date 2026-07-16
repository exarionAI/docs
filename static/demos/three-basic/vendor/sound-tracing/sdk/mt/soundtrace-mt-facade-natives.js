import { assertDirectivityArrays } from '../native/index.js';
import { PathType } from '../engine/SoundSource.js';
function cloneVec3(value) {
    return { x: value.x, y: value.y, z: value.z };
}
function cloneAudioOption(value) {
    return {
        sampleRate: value.sampleRate,
        inputSampleCount: value.inputSampleCount,
        outputChannels: value.outputChannels,
    };
}
function sourcePathKey(pathType) {
    switch (pathType) {
        case PathType.Direct:
            return 'direct';
        case PathType.Reflection:
            return 'reflection';
        case PathType.Diffraction:
            return 'diffraction';
        case PathType.Reverb:
            return 'reverberation';
        default:
            throw new Error(`[soundtrace.js] unsupported source path type ${pathType}`);
    }
}
export function createMtSourceNative(options) {
    const { cache, handle, scheduler } = options;
    let deleted = false;
    const assertLive = () => {
        scheduler.assertHostLive('source facade access');
        if (deleted) {
            scheduler.assertSourceHandle(handle);
        }
        scheduler.assertSourceHandle(handle);
    };
    return {
        id: handle,
        dispose() {
            if (deleted) {
                return;
            }
            deleted = true;
            // M8/M5 contract: disposing an entity after its world was torn down
            // (SoundTrace.dispose, finding #20) or forgotten (reset, finding #19)
            // is a no-op — teardown code must never throw, and a delete queued for
            // a forgotten handle would latch BAD_HANDLE into the next update().
            if (!scheduler.isHostLive() || !scheduler.isSourceHandleLive(handle)) {
                return;
            }
            scheduler.deleteSourceHandle(handle);
            scheduler.queueCommand({ op: 'deleteSource', handle });
        },
        getIntensity() {
            assertLive();
            return cache.intensity;
        },
        getPosition() {
            assertLive();
            return cloneVec3(cache.position);
        },
        isPathEnabled(pathType) {
            assertLive();
            return cache.paths[sourcePathKey(pathType)];
        },
        setIntensity(value) {
            assertLive();
            cache.intensity = value;
            scheduler.stageSourceTransform(handle, cache);
            return this;
        },
        setPathEnable(pathType, enabled) {
            assertLive();
            const path = sourcePathKey(pathType);
            cache.paths[path] = enabled;
            scheduler.queueCommand({ op: 'setSourceParam', handle, patch: { paths: { [path]: enabled } } });
            return this;
        },
        setPosition(x, y, z) {
            assertLive();
            cache.position = { x, y, z };
            scheduler.stageSourceTransform(handle, cache);
            return this;
        },
        setDirectivityTable(anglesDeg, attenDbPerBand) {
            assertLive();
            assertDirectivityArrays(anglesDeg, attenDbPerBand);
            // Copy into fresh Float32Arrays: structured-cloned to the worker, and the
            // copy detaches the payload from the caller-owned input.
            scheduler.queueCommand({
                op: 'setSourceParam', handle,
                patch: {
                    directivityTable: {
                        anglesDeg: Float32Array.from(anglesDeg),
                        attenDbPerBand: Float32Array.from(attenDbPerBand),
                    },
                },
            });
            return this;
        },
        setDirectivityEnabled(enabled) {
            assertLive();
            scheduler.queueCommand({ op: 'setSourceParam', handle, patch: { directivityEnabled: enabled } });
            return this;
        },
    };
}
export function createMtListenerNative(options) {
    const { cache, scheduler } = options;
    const queueListenerPatch = (patch) => {
        scheduler.assertHostLive('listener facade access');
        scheduler.queueCommand({ op: 'setListenerOption', patch });
    };
    return {
        id: 1,
        setLateReverbToneCorrection(_enabled) {
            // Test-only diagnostic seam (TASK-0019), wired only on the single-thread
            // local-control path. The worker-hosted MT path does not route it, so this
            // returns false and the demo reports tone correction unavailable in MT.
            return false;
        },
        getAudioOption() {
            scheduler.assertHostLive('listener audio option read');
            return cloneAudioOption(cache.audioOption);
        },
        getDelayInterpolation() {
            scheduler.assertHostLive('listener delay interpolation read');
            return cache.renderOptions.delayInterpolation;
        },
        getDiffuseEnabled() {
            scheduler.assertHostLive('listener diffuse enabled read');
            return cache.renderOptions.diffuseEnabled;
        },
        getDiffusePathBudget() {
            scheduler.assertHostLive('listener diffuse path budget read');
            return cache.renderOptions.diffusePathBudget;
        },
        getHrtfMode() {
            scheduler.assertHostLive('listener HRTF mode read');
            return cache.hrtfMode;
        },
        getHrtfPathBudget() {
            scheduler.assertHostLive('listener HRTF path budget read');
            return cache.renderOptions.hrtfPathBudget;
        },
        getPosition() {
            scheduler.assertHostLive('listener position read');
            return cloneVec3(cache.position);
        },
        setAudioOption(option) {
            scheduler.assertHostLive('listener audio option');
            cache.audioOption = cloneAudioOption(option);
            queueListenerPatch({ audioOption: cloneAudioOption(option) });
            return this;
        },
        setDelayInterpolation(value) {
            cache.renderOptions.delayInterpolation = value;
            queueListenerPatch({ delayInterpolation: value });
            return true;
        },
        setDiffuseEnabled(value) {
            cache.renderOptions.diffuseEnabled = value;
            queueListenerPatch({ diffuseEnabled: value });
            return true;
        },
        setDiffusePathBudget(value) {
            cache.renderOptions.diffusePathBudget = value;
            queueListenerPatch({ diffusePathBudget: value });
            return true;
        },
        setEarlyRenderPathBudget(value) {
            cache.renderOptions.earlyRenderPathBudget = value;
            queueListenerPatch({ earlyRenderPathBudget: value });
            return true;
        },
        setAmbisonicHybrid(enabled) {
            cache.ambisonicHybrid = enabled;
            queueListenerPatch({ ambisonicHybrid: enabled });
            return true;
        },
        setOutputMode(mode) {
            cache.outputMode = mode;
            queueListenerPatch({ outputMode: mode });
            return true;
        },
        getOutputMode() {
            // Host mirror — the facade is the sole mutator, so the cached value tracks
            // the worker-side listener without a round-trip (keeps the getter sync).
            return cache.outputMode;
        },
        setHrtfPathBudget(value) {
            cache.renderOptions.hrtfPathBudget = value;
            queueListenerPatch({ hrtfPathBudget: value });
            return true;
        },
        setOrientationQuat(x, y, z, w) {
            scheduler.assertHostLive('listener pose');
            cache.orientation = [x, y, z, w];
            scheduler.stageListenerTransform(cache);
            return this;
        },
        setPosition(x, y, z) {
            scheduler.assertHostLive('listener pose');
            cache.position = { x, y, z };
            scheduler.stageListenerTransform(cache);
            return this;
        },
    };
}
//# sourceMappingURL=soundtrace-mt-facade-natives.js.map