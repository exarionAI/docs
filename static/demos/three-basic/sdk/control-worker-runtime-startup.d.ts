import { type Bindings } from './native/index.js';
type StartupMeshBuildOption = {
    readonly bvhType: number;
    readonly bvhMaxDepth: number;
    readonly primPerLeaf: number;
};
export declare function resolveQualityOption(quality: string | undefined): import("./native/structs.js").STOption;
export declare function readStartupMeshBuildOption(startupMesh: unknown): StartupMeshBuildOption | null;
export declare function readValidPathCount(bindings: Bindings): number | undefined;
export {};
//# sourceMappingURL=control-worker-runtime-startup.d.ts.map