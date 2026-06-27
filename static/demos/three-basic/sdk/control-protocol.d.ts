import type { MtAudioSharedBuffers } from './soundtrace-mt-audio-shared.js';
import type { MtHotTransformLanes } from './soundtrace-mt-hot-transforms.js';
export type RequestId = number;
export type ClientHandle = number;
export type EngineId = number;
export type SourcePathType = 'direct' | 'reflection' | 'reverberation' | 'diffraction';
export interface StartupOptions {
    readonly quality?: string;
    readonly runtimeMode?: string;
    readonly mesh?: unknown;
}
export type ControlErrorCode = 'INIT_FAILED' | 'NOT_READY' | 'COI_REQUIRED' | 'BAD_HANDLE' | 'CORE_ERROR' | 'UNSUPPORTED_MT_NATIVE' | 'DISPOSED';
export interface CommandExecutionError {
    readonly code: ControlErrorCode;
    readonly message: string;
    readonly fatal?: boolean;
}
export interface CommandExecutionSuccess {
    readonly id: RequestId;
    readonly result: unknown;
}
export interface CommandExecutionFailure {
    readonly id: RequestId;
    readonly error: CommandExecutionError;
}
export type CommandExecutionResult = CommandExecutionSuccess | CommandExecutionFailure;
export interface InitRequest {
    readonly kind: 'init';
    readonly id: RequestId;
    readonly coreBaseUrl: string;
    readonly hotTransforms?: MtHotTransformLanes;
    readonly pthreadPoolSize: number;
    readonly startup: StartupOptions;
    readonly thread: 'st' | 'mt';
}
export interface SourceInitialState {
    readonly position: [number, number, number];
    readonly direction: [number, number, number];
    readonly velocity: [number, number, number];
    readonly intensity: number;
    readonly rayCount: [number, number];
    readonly depth: number;
    readonly distanceAttenuation: Record<SourcePathType, [number, number, number]>;
    readonly paths?: unknown;
}
export interface MeshInitialState {
    readonly vertices: Float32Array;
    readonly triangles: Array<{
        readonly a: number;
        readonly b: number;
        readonly c: number;
        readonly materialIndex: number;
    }>;
    readonly material: number;
    readonly bvhType: number;
    readonly updateType?: number;
    readonly pose?: unknown;
}
export interface CommandCreateSource {
    readonly op: 'createSource';
    readonly handle: ClientHandle;
    readonly initial: SourceInitialState;
}
export interface CommandDeleteSource {
    readonly op: 'deleteSource';
    readonly handle: ClientHandle;
}
export interface CommandSetSourceParam {
    readonly op: 'setSourceParam';
    readonly handle: ClientHandle;
    readonly patch: Record<string, unknown>;
}
export interface CommandStartAudioSource {
    readonly op: 'startAudioSource';
    readonly sessionId: number;
    readonly handle: ClientHandle;
    readonly shared: MtAudioSharedBuffers;
}
export interface CommandStopAudioSource {
    readonly op: 'stopAudioSource';
    readonly sessionId: number;
}
export interface CommandCreateMesh {
    readonly op: 'createMesh';
    readonly handle: ClientHandle;
    readonly initial: MeshInitialState;
}
export interface CommandDeleteMesh {
    readonly op: 'deleteMesh';
    readonly handle: ClientHandle;
}
export interface CommandSetMeshMaterial {
    readonly op: 'setMeshMaterial';
    readonly handle: ClientHandle;
    readonly material: number;
}
export interface CommandSetMeshMaterialRange {
    readonly op: 'setMeshMaterialRange';
    readonly handle: ClientHandle;
    readonly triStart: number;
    readonly triCount: number;
    readonly material: number;
}
export interface CommandSetMeshUpdateType {
    readonly op: 'setMeshUpdateType';
    readonly handle: ClientHandle;
    readonly updateType: number;
}
export interface RemovedMeshTransformCommand {
    readonly op: 'setMeshPose';
    readonly handle: ClientHandle;
    readonly pose: unknown;
}
export interface RemovedListenerTransformCommand {
    readonly op: 'setListenerPose';
    readonly pose: unknown;
}
export interface CommandSetListenerOption {
    readonly op: 'setListenerOption';
    readonly patch: Record<string, unknown>;
}
export interface CommandSetRenderOption {
    readonly op: 'setRenderOption';
    readonly source: ClientHandle;
    readonly patch: Record<string, unknown>;
}
export interface CommandSetQuality {
    readonly op: 'setQuality';
    readonly quality: string;
}
export interface CommandEnableGpu {
    readonly op: 'enableGpu';
}
export interface CommandReset {
    readonly op: 'reset';
}
export type ControlCommand = CommandCreateSource | CommandDeleteSource | CommandCreateMesh | CommandDeleteMesh | CommandStartAudioSource | CommandStopAudioSource | CommandSetMeshMaterial | CommandSetMeshMaterialRange | CommandSetMeshUpdateType | CommandSetQuality | CommandEnableGpu | CommandReset | CommandSetSourceParam | CommandSetListenerOption | CommandSetRenderOption;
export type RemovedTransformCommand = RemovedMeshTransformCommand | RemovedListenerTransformCommand;
export interface CommandRequest {
    readonly kind: 'command';
    readonly id: RequestId;
    readonly command: ControlCommand | RemovedTransformCommand;
}
export interface FrameRequest {
    readonly kind: 'frame';
    readonly id: RequestId;
    readonly dt: number;
}
export interface DebugSnapshot {
    readonly validPathCount?: number;
    readonly paths?: readonly unknown[];
    readonly profile?: unknown;
    readonly memoryTrace?: unknown;
}
export interface DebugSnapshotOptions {
    readonly includeProfile?: boolean;
    readonly includeMemory?: boolean;
    readonly includePaths?: boolean;
}
export interface DebugSnapshotRequest {
    readonly kind: 'debugSnapshot';
    readonly id: RequestId;
    readonly options: DebugSnapshotOptions;
}
export interface DisposeRequest {
    readonly kind: 'dispose';
    readonly id: RequestId;
}
export type ControlRequest = InitRequest | CommandRequest | FrameRequest | DebugSnapshotRequest | DisposeRequest;
export interface ReadyResponse {
    readonly kind: 'ready';
    readonly id: RequestId;
    readonly workerHostedControl: true;
}
export interface ResultResponse {
    readonly kind: 'result';
    readonly id: RequestId;
    readonly result: unknown;
}
export interface FrameResultResponse {
    readonly kind: 'frameResult';
    readonly id: RequestId;
    readonly updateReturn: number;
    readonly validPathCount?: number;
}
export interface DebugSnapshotResponse {
    readonly kind: 'debugSnapshot';
    readonly id: RequestId;
    readonly snapshot: DebugSnapshot;
}
export interface ErrorResponse {
    readonly kind: 'error';
    readonly id?: RequestId;
    readonly code: ControlErrorCode;
    readonly message: string;
    readonly fatal?: boolean;
}
export interface LogResponse {
    readonly kind: 'log';
    readonly level: 'info' | 'warn' | 'error';
    readonly message: string;
}
export type ControlResponse = ReadyResponse | ResultResponse | FrameResultResponse | DebugSnapshotResponse | ErrorResponse | LogResponse;
export type ControlResponseByRequestKind<K extends ControlRequest['kind']> = K extends 'init' ? ReadyResponse : K extends 'command' ? ResultResponse : K extends 'frame' ? FrameResultResponse : K extends 'debugSnapshot' ? DebugSnapshotResponse : K extends 'dispose' ? ResultResponse : never;
export interface ControlTransport {
    postMessage(message: ControlRequest): void;
    onMessage(handler: (response: ControlResponse) => void): () => void;
}
//# sourceMappingURL=control-protocol.d.ts.map