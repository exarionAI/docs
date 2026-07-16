function cloneVec3(value) {
    return { x: value.x, y: value.y, z: value.z };
}
export function createMtMeshPair(options) {
    const { handle, objectCache, scheduler } = options;
    let deleted = false;
    const assertLive = (operation) => {
        scheduler.assertHostLive(operation);
        if (deleted) {
            scheduler.assertMeshHandle(handle);
        }
        scheduler.assertMeshHandle(handle);
    };
    const disposeShared = () => {
        if (deleted) {
            return;
        }
        deleted = true;
        // Same contract as the source twin (M8/M5): dispose after the world was
        // torn down (finding #20) or after reset forgot the handle (finding #19)
        // is a no-op — teardown code must never throw, and a delete queued for a
        // forgotten handle would latch BAD_HANDLE into the next update().
        if (!scheduler.isHostLive() || !scheduler.isMeshHandleLive(handle)) {
            return;
        }
        scheduler.deleteMeshHandle(handle);
        scheduler.queueCommand({ op: 'deleteMesh', handle });
    };
    return {
        meshNative: {
            id: handle,
            dispose() {
                disposeShared();
            },
            // Fire-and-forget like the other MT mesh commands (setUpdateType, pose):
            // the command is enqueued and its worker-side success/failure surfaces via
            // the control-loop drain, not synchronously here. Returns true = "accepted
            // for dispatch". A dead handle is already rejected by assertLive above.
            setMaterial(materialIndex) {
                assertLive('mesh material');
                scheduler.queueCommand({ op: 'setMeshMaterial', handle, material: materialIndex });
                return true;
            },
            setMaterialRange(triStart, triCount, materialIndex) {
                assertLive('mesh material range');
                scheduler.queueCommand({
                    op: 'setMeshMaterialRange',
                    handle,
                    triStart,
                    triCount,
                    material: materialIndex,
                });
                return true;
            },
        },
        objectNative: {
            id: handle,
            dispose() {
                disposeShared();
            },
            getPosition() {
                assertLive('mesh position read');
                return cloneVec3(objectCache.position);
            },
            getScale() {
                assertLive('mesh scale read');
                return cloneVec3(objectCache.scale);
            },
            getUpdateType() {
                assertLive('mesh update type read');
                return objectCache.updateType;
            },
            setPosition(x, y, z) {
                assertLive('mesh pose');
                objectCache.position = { x, y, z };
                scheduler.stageMeshTransform(handle, objectCache);
                return this;
            },
            setRotationQuat(x, y, z, w) {
                assertLive('mesh pose');
                objectCache.orientation = [x, y, z, w];
                scheduler.stageMeshTransform(handle, objectCache);
                return this;
            },
            setScale(x, y, z) {
                assertLive('mesh pose');
                objectCache.scale = { x, y, z };
                scheduler.stageMeshTransform(handle, objectCache);
                return this;
            },
            setUpdateType(value) {
                assertLive('mesh update type');
                objectCache.updateType = value;
                scheduler.queueCommand({
                    op: 'setMeshUpdateType',
                    handle,
                    updateType: value,
                });
                return true;
            },
        },
    };
}
//# sourceMappingURL=soundtrace-mt-facade-mesh.js.map