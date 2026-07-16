import { balancedTracePreset, qualityTracePreset, speedTracePreset, isError, } from '../native/index.js';
export function resolveQualityOption(quality, sceneRatio) {
    const option = resolveQualityTierOption(quality);
    // World-unit scale (meters per scene unit) -> ExaListenerOption.sceneRatio.
    // Leave unset when not provided so writeListenerOption emits 0 (core default 1.0).
    if (sceneRatio !== undefined) {
        option.sceneRatio = sceneRatio;
    }
    return option;
}
function resolveQualityTierOption(quality) {
    if (!quality) {
        return balancedTracePreset();
    }
    switch (quality.toLowerCase()) {
        case 'fast':
        case 'speed':
            return speedTracePreset();
        case 'quality':
        case 'high':
            return qualityTracePreset();
        case 'middle':
        case 'balanced':
        case 'normal':
        default:
            return balancedTracePreset();
    }
}
export function readStartupMeshBuildOption(startupMesh) {
    if (!isRecord(startupMesh)) {
        return null;
    }
    const bvhType = readIntegerField(startupMesh, 'bvhType');
    const bvhMaxDepth = readIntegerField(startupMesh, 'bvhMaxDepth');
    const primPerLeaf = readIntegerField(startupMesh, 'primPerLeaf');
    if (bvhType === null || bvhMaxDepth === null || primPerLeaf === null) {
        return null;
    }
    return {
        bvhType,
        bvhMaxDepth,
        primPerLeaf,
    };
}
/** Probe the live valid-path count through the merged
 *  exaPropagatorGetValidPaths (out=NULL, capacity=0). undefined = unavailable. */
export function readValidPathCount(bindings, heap) {
    try {
        return heap.withScope((scope) => {
            const countPtr = scope.i32();
            if (isError(bindings.exaPropagatorGetValidPaths(0, 0, countPtr))) {
                return undefined;
            }
            return heap.readI32(countPtr);
        });
    }
    catch (error) {
        if (error instanceof Error) {
            return undefined;
        }
        throw error;
    }
}
function readIntegerField(record, key) {
    const value = record[key];
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }
    return null;
}
function isRecord(value) {
    return value !== null && typeof value === 'object';
}
//# sourceMappingURL=control-worker-runtime-startup.js.map