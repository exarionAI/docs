import type { ListenerTransformPayload } from './control-hot-listener-transform.js';
import type { MeshTransformPayload } from './control-hot-mesh-transform.js';
import type { SourceTransformPayload } from './control-hot-source-transform.js';
import type { RuntimeCommandAdapterContext } from './control-worker-runtime-command-shared.js';
export declare function createRuntimeHotTransformAdapters(context: RuntimeCommandAdapterContext): {
    readonly applyHotSourceTransform: (payload: SourceTransformPayload & {
        readonly engineId: number;
    }) => Promise<unknown>;
    readonly applyHotListenerTransform: (payload: ListenerTransformPayload) => Promise<unknown>;
    readonly applyHotMeshTransform: (payload: MeshTransformPayload & {
        readonly engineId: number;
    }) => Promise<unknown>;
};
//# sourceMappingURL=control-worker-runtime-hot-transforms.d.ts.map