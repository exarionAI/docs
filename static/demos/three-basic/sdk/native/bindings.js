import { cw, makeGpuEnable } from './binding-utils.js';
import { makeCoreSceneBindings } from './bindings-core-scene.js';
import { makeObjectSourceBindings } from './bindings-object-source.js';
import { makeRenderListenerBindings } from './bindings-render-listener.js';
export function makeBindings(mod) {
    let initialized = false;
    const exaInit = cw(mod, 'exaInit', null, []);
    const exaReset = cw(mod, 'exaReset', null, []);
    return {
        exaInit: () => {
            exaInit();
            initialized = true;
        },
        exaReset: () => {
            initialized = false;
            exaReset();
        },
        exaIsInitialized: () => initialized,
        exaEnableGpuPropagation: makeGpuEnable(mod),
        ...makeCoreSceneBindings(mod),
        ...makeObjectSourceBindings(mod),
        ...makeRenderListenerBindings(mod),
    };
}
//# sourceMappingURL=bindings.js.map