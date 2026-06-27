import { type ControlCommand, type ControlErrorCode, type ControlRequest, type ControlResponse, type ControlTransport, type DebugSnapshot, type DebugSnapshotOptions, type DebugSnapshotRequest, type DebugSnapshotResponse, type DisposeRequest, type FrameRequest, type FrameResultResponse, type InitRequest, type ReadyResponse, type ResultResponse } from './control-protocol.js';
type ControlRequestWithoutId = Omit<InitRequest, 'id'> | {
    readonly kind: 'command';
    readonly command: ControlCommand;
} | Omit<FrameRequest, 'id'> | Omit<DebugSnapshotRequest, 'id'> | Omit<DisposeRequest, 'id'>;
export declare class ControlClientError extends Error {
    readonly code: ControlErrorCode;
    readonly requestId?: number;
    readonly fatal: boolean;
    constructor(code: ControlErrorCode, message: string, options?: {
        requestId?: number;
        fatal?: boolean;
        cause?: unknown;
    });
}
export declare class ControlClient {
    private readonly transport;
    private readonly pending;
    private nextRequestId;
    private readonly unsub;
    private disposed;
    private fatal;
    private readonly disposePromise;
    constructor(transport: ControlTransport);
    send(request: ControlRequestWithoutId): Promise<ControlResponse>;
    command(command: ControlCommand): Promise<unknown>;
    frame(dt: number): Promise<FrameResultResponse>;
    debugSnapshot(options: DebugSnapshotOptions): Promise<DebugSnapshot>;
    dispose(): Promise<void>;
    private onMessage;
    private handleError;
    private createError;
    private rejectDispatchFailure;
    private warnDisposeDispatchFailure;
}
export type { ControlRequest, ControlResponse, ControlTransport, ReadyResponse, ResultResponse, FrameResultResponse, DebugSnapshotResponse };
//# sourceMappingURL=control-client.d.ts.map