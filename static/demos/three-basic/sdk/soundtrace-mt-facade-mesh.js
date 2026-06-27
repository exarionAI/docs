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
        scheduler.assertHostLive('mesh dispose');
        if (deleted) {
            return;
        }
        deleted = true;
        scheduler.deleteMeshHandle(handle);
        scheduler.queueCommand({ op: 'deleteMesh', handle });
    };
    return {
        meshNative: {
            id: handle,
            dispose() {
                disposeShared();
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