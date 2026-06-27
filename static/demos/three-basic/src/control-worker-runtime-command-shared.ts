import type {
  CommandCreateMesh,
  CommandCreateSource,
  CommandDeleteMesh,
  CommandDeleteSource,
  CommandSetListenerOption,
  CommandSetMeshMaterial,
  CommandSetMeshMaterialRange,
  CommandSetMeshUpdateType,
  CommandSetRenderOption,
  CommandSetSourceParam,
} from './control-protocol.js';
import type { Bindings, Heap } from './native/index.js';

type RequireNativeSuccess = (ok: boolean, context: string) => void;

export type RuntimeCommandAdapterSet = {
  readonly createSource: (command: CommandCreateSource) => Promise<number>;
  readonly createMesh: (command: CommandCreateMesh) => Promise<number>;
  readonly deleteSource: (command: CommandDeleteSource & { readonly engineId: number }) => Promise<unknown>;
  readonly deleteMesh: (command: CommandDeleteMesh & { readonly engineId: number }) => Promise<unknown>;
  readonly setMeshMaterial: (
    command: CommandSetMeshMaterial & { readonly engineId: number },
  ) => Promise<unknown>;
  readonly setMeshMaterialRange: (
    command: CommandSetMeshMaterialRange & { readonly engineId: number },
  ) => Promise<unknown>;
  readonly setMeshUpdateType: (
    command: CommandSetMeshUpdateType & { readonly engineId: number },
  ) => Promise<unknown>;
  readonly setSourceParam: (command: CommandSetSourceParam & { readonly engineId: number }) => Promise<unknown>;
  readonly setRenderOption: (
    command: CommandSetRenderOption & { readonly engineId: number },
  ) => Promise<unknown>;
  readonly setListenerOption: (command: CommandSetListenerOption) => Promise<unknown>;
};

export interface RuntimeCommandAdapterContext {
  readonly heap: Heap;
  readonly bindings: Bindings;
  readonly getSceneId: () => number;
  readonly getListenerId: () => number;
  readonly meshIdsByObjectId: Map<number, number>;
  readonly requireNativeSuccess: RequireNativeSuccess;
}

export function requireMeshId(meshIdsByObjectId: Map<number, number>, objectId: number): number {
  const meshId = meshIdsByObjectId.get(objectId);
  if (meshId === undefined) {
    throw new Error(`[soundtrace.js] no mesh runtime mapping for object ${objectId}`);
  }
  return meshId;
}

export function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`[soundtrace.js] ${label} must be a finite number`);
  }
  return value;
}

export function requireInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`[soundtrace.js] ${label} must be an integer`);
  }
  return value;
}

export function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`[soundtrace.js] ${label} must be a boolean`);
  }
  return value;
}

export function readVec3Tuple(value: unknown, label: string): readonly [number, number, number] {
  const tuple = readTuple(value, label, 3);
  return [tuple[0], tuple[1], tuple[2]];
}

export function readQuatTuple(value: unknown, label: string): readonly [number, number, number, number] {
  const tuple = readTuple(value, label, 4);
  return [tuple[0], tuple[1], tuple[2], tuple[3]];
}

export function readIntegerPair(value: unknown, label: string): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`[soundtrace.js] ${label} must be an array of length 2`);
  }
  return [requireInteger(value[0], `${label}[0]`), requireInteger(value[1], `${label}[1]`)];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function readTuple(value: unknown, label: string, length: number): number[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error(`[soundtrace.js] ${label} must be an array of length ${length}`);
  }
  return value.map((entry) => requireNumber(entry, label));
}
