import type { ExaSoundModule } from '../types.js';
import { cw, makeGpuEnable } from './binding-utils.js';
import { makeCoreSceneBindings } from './bindings-core-scene.js';
import { makeObjectSourceBindings } from './bindings-object-source.js';
import { makeRenderListenerBindings } from './bindings-render-listener.js';

export function makeBindings(mod: ExaSoundModule) {
  let initialized = false;
  const exaInit = cw<void, []>(mod, 'exaInit', null, []);
  const exaReset = cw<void, []>(mod, 'exaReset', null, []);
  return {
    exaInit: (): void => {
      exaInit();
      initialized = true;
    },
    exaReset: (): void => {
      initialized = false;
      exaReset();
    },
    exaIsInitialized: (): boolean => initialized,
    exaEnableGpuPropagation: makeGpuEnable(mod),
    ...makeCoreSceneBindings(mod),
    ...makeObjectSourceBindings(mod),
    ...makeRenderListenerBindings(mod),
  };
}

export type Bindings = ReturnType<typeof makeBindings>;
