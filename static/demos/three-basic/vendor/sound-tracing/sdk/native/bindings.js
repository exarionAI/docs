import { cw, makeGpuEnable } from './binding-utils.js';
import { isOk } from './result.js';
import { makeCoreSceneBindings } from './bindings-core-scene.js';
import { makeObjectSourceBindings } from './bindings-object-source.js';
import { makeRenderListenerBindings } from './bindings-render-listener.js';
export function makeBindings(mod) {
    let initialized = false;
    const exaInit = cw(mod, 'exaInit', 'number', []);
    const exaReset = cw(mod, 'exaReset', 'number', []);
    return {
        /** v0.7: returns ExaResult (EXA_OK also when already initialized;
         *  EXA_ERR_NOT_LOADED if the embedded default HRTF failed to load). */
        exaInit: () => {
            const result = exaInit();
            if (isOk(result))
                initialized = true;
            return result;
        },
        exaReset: () => {
            initialized = false;
            return exaReset();
        },
        exaIsInitialized: () => initialized,
        /** GPU addon (EXA_WEBGPU builds): resolves true iff a WebGPU device was
         *  acquired (EXA_OK). Missing export / no device -> false (CPU fallback). */
        exaPropagatorInitGpu: makeGpuEnable(mod),
        ...makeCoreSceneBindings(mod),
        ...makeObjectSourceBindings(mod),
        ...makeRenderListenerBindings(mod),
    };
}
//# sourceMappingURL=bindings.js.map