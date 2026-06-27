import { HrtfMode, } from './SoundListener.js';
import { PathType } from './SoundSource.js';
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
            scheduler.assertHostLive('source dispose');
            if (deleted) {
                return;
            }
            deleted = true;
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
        getDiffuseQuality() {
            scheduler.assertHostLive('listener diffuse quality read');
            return cache.renderOptions.diffuseQuality;
        },
        getHrtfMode() {
            scheduler.assertHostLive('listener HRTF mode read');
            return HrtfMode.Parametric;
        },
        getHrtfQuality() {
            scheduler.assertHostLive('listener HRTF quality read');
            return cache.renderOptions.hrtfQuality;
        },
        getLateReverbMode() {
            scheduler.assertHostLive('listener late reverb mode read');
            return cache.renderOptions.lateReverbMode;
        },
        getPerBandLateReverb() {
            scheduler.assertHostLive('listener per-band late reverb read');
            return cache.renderOptions.perBandLateReverb;
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
        setDiffuseQuality(value) {
            cache.renderOptions.diffuseQuality = value;
            queueListenerPatch({ diffuseQuality: value });
            return true;
        },
        setEarlyRenderPathBudget(value) {
            cache.renderOptions.earlyRenderPathBudget = value;
            queueListenerPatch({ earlyRenderPathBudget: value });
            return true;
        },
        setHrtfQuality(value) {
            cache.renderOptions.hrtfQuality = value;
            queueListenerPatch({ hrtfQuality: value });
            return true;
        },
        setLateReverbMode(value) {
            cache.renderOptions.lateReverbMode = value;
            queueListenerPatch({ lateReverbMode: value });
            return true;
        },
        setOrientationQuat(x, y, z, w) {
            scheduler.assertHostLive('listener pose');
            cache.orientation = [x, y, z, w];
            scheduler.stageListenerTransform(cache);
            return this;
        },
        setPerBandLateReverb(value) {
            cache.renderOptions.perBandLateReverb = value;
            queueListenerPatch({ perBandLateReverb: value });
            return true;
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