import { VEC3_SIZE, writeVec3 } from '../native/index.js';
export function createRuntimeHotTransformAdapters(context) {
    const { bindings, getListenerId, heap, requireNativeSuccess } = context;
    return {
        async applyHotSourceTransform(payload) {
            requireNativeSuccess(bindings.exaSourceSetPosition(payload.engineId, ...payload.position), `failed to set HOT source transform position for source ${payload.engineId}`);
            requireNativeSuccess(bindings.exaSourceSetDirection(payload.engineId, ...payload.direction), `failed to set HOT source transform direction for source ${payload.engineId}`);
            requireNativeSuccess(bindings.exaSourceSetVelocity(payload.engineId, ...payload.velocity), `failed to set HOT source transform velocity for source ${payload.engineId}`);
            requireNativeSuccess(bindings.exaSourceSetIntensity(payload.engineId, payload.intensity), `failed to set HOT source transform intensity for source ${payload.engineId}`);
            return { applied: true };
        },
        async applyHotListenerTransform(payload) {
            const listenerId = getListenerId();
            heap.withScope((scope) => {
                const positionPtr = scope.block(VEC3_SIZE);
                writeVec3(heap, positionPtr, {
                    x: payload.position[0],
                    y: payload.position[1],
                    z: payload.position[2],
                });
                requireNativeSuccess(bindings.exaListenerSetPosition(listenerId, positionPtr), `failed to set HOT listener transform position for listener ${listenerId}`);
            });
            requireNativeSuccess(bindings.exaListenerSetOrientationQuaternion(listenerId, ...payload.orientation), `failed to set HOT listener transform orientation for listener ${listenerId}`);
            return { applied: true };
        },
        async applyHotMeshTransform(payload) {
            requireNativeSuccess(bindings.exaObjectSetPosition(payload.engineId, ...payload.position), `failed to set HOT mesh transform position for object ${payload.engineId}`);
            requireNativeSuccess(bindings.exaObjectSetOrientation(payload.engineId, ...payload.orientation), `failed to set HOT mesh transform orientation for object ${payload.engineId}`);
            requireNativeSuccess(bindings.exaObjectSetScale(payload.engineId, ...payload.scale), `failed to set HOT mesh transform scale for object ${payload.engineId}`);
            return { applied: true };
        },
    };
}
//# sourceMappingURL=control-worker-runtime-hot-transforms.js.map