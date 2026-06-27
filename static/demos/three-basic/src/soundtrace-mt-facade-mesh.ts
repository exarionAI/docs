import type { Vec3 } from './native/index.js';
import type {
  MeshNativeLike,
  ObjectNativeLike,
} from './facade.js';
import type {
  MtCommandScheduler,
  ObjectCache,
} from './soundtrace-mt-facade-types.js';

function cloneVec3(value: Vec3): Vec3 {
  return { x: value.x, y: value.y, z: value.z };
}

export function createMtMeshPair(options: {
  readonly handle: number;
  readonly objectCache: ObjectCache;
  readonly scheduler: MtCommandScheduler;
}): { readonly meshNative: MeshNativeLike; readonly objectNative: ObjectNativeLike } {
  const { handle, objectCache, scheduler } = options;
  let deleted = false;

  const assertLive = (operation: string): void => {
    scheduler.assertHostLive(operation);
    if (deleted) {
      scheduler.assertMeshHandle(handle);
    }
    scheduler.assertMeshHandle(handle);
  };

  const disposeShared = (): void => {
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
      dispose(): void {
        disposeShared();
      },
    },
    objectNative: {
      id: handle,
      dispose(): void {
        disposeShared();
      },
      getPosition(): Vec3 {
        assertLive('mesh position read');
        return cloneVec3(objectCache.position);
      },
      getScale(): Vec3 {
        assertLive('mesh scale read');
        return cloneVec3(objectCache.scale);
      },
      getUpdateType(): number {
        assertLive('mesh update type read');
        return objectCache.updateType;
      },
      setPosition(x: number, y: number, z: number) {
        assertLive('mesh pose');
        objectCache.position = { x, y, z };
        scheduler.stageMeshTransform(handle, objectCache);
        return this;
      },
      setRotationQuat(x: number, y: number, z: number, w: number) {
        assertLive('mesh pose');
        objectCache.orientation = [x, y, z, w];
        scheduler.stageMeshTransform(handle, objectCache);
        return this;
      },
      setScale(x: number, y: number, z: number) {
        assertLive('mesh pose');
        objectCache.scale = { x, y, z };
        scheduler.stageMeshTransform(handle, objectCache);
        return this;
      },
      setUpdateType(value: number): boolean {
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
