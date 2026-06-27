import {
  balancedSTOption,
  qualitySTOption,
  speedSTOption,
  type Bindings,
} from './native/index.js';

type StartupMeshBuildOption = {
  readonly bvhType: number;
  readonly bvhMaxDepth: number;
  readonly primPerLeaf: number;
};

export function resolveQualityOption(quality: string | undefined) {
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

export function readStartupMeshBuildOption(
  startupMesh: unknown,
): StartupMeshBuildOption | null {
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

export function readValidPathCount(bindings: Bindings): number | undefined {
  try {
    return bindings.exaGetValidPathCount();
  } catch (error) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

function readIntegerField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
