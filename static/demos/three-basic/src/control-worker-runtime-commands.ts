import {
  type RuntimeCommandAdapterContext,
  type RuntimeCommandAdapterSet,
} from './control-worker-runtime-command-shared.js';
import { createRuntimeListenerCommandAdapters } from './control-worker-runtime-listener-commands.js';
import { createRuntimeMeshCommandAdapters } from './control-worker-runtime-mesh-commands.js';
import { createRuntimeSourceCommandAdapters } from './control-worker-runtime-source-commands.js';

export function createRuntimeCommandAdapters(
  context: RuntimeCommandAdapterContext,
): RuntimeCommandAdapterSet {
  return {
    ...createRuntimeSourceCommandAdapters(context),
    ...createRuntimeListenerCommandAdapters(context),
    ...createRuntimeMeshCommandAdapters(context),
  };
}
