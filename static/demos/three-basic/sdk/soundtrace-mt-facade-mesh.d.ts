import type { MeshNativeLike, ObjectNativeLike } from './facade.js';
import type { MtCommandScheduler, ObjectCache } from './soundtrace-mt-facade-types.js';
export declare function createMtMeshPair(options: {
    readonly handle: number;
    readonly objectCache: ObjectCache;
    readonly scheduler: MtCommandScheduler;
}): {
    readonly meshNative: MeshNativeLike;
    readonly objectNative: ObjectNativeLike;
};
//# sourceMappingURL=soundtrace-mt-facade-mesh.d.ts.map