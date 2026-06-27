import { balancedSTOption, qualitySTOption, speedSTOption, } from './native/index.js';
export function resolveQualityOption(quality) {
    if (!quality) {
        return balancedSTOption();
    }
    switch (quality.toLowerCase()) {
        case 'fast':
        case 'speed':
            return speedSTOption();
        case 'quality':
        case 'high':
            return qualitySTOption();
        case 'middle':
        case 'balanced':
        case 'normal':
        default:
            return balancedSTOption();
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
export function readValidPathCount(bindings) {
    try {
        return bindings.exaGetValidPathCount();
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