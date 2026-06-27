import { type ControlCommand, type ControlErrorCode, type ControlRequest, type ControlResponse, type ControlResponseByRequestKind, type ControlTransport, type DebugSnapshot, type DebugSnapshotOptions, type DebugSnapshotRequest, type DebugSnapshotResponse, type DisposeRequest, type ErrorResponse, type FrameRequest, type FrameResultResponse, type InitRequest, type ReadyResponse, type ResultResponse } from './control-protocol.js';

type PendingResult = {
  readonly kind: ControlRequest['kind'];
  readonly resolve: (value: ControlResponse) => void;
  readonly reject: (error: unknown) => void;
};

type ControlRequestWithoutId = Omit<InitRequest, 'id'> | { readonly kind: 'command'; readonly command: ControlCommand } | Omit<FrameRequest, 'id'> | Omit<DebugSnapshotRequest, 'id'> | Omit<DisposeRequest, 'id'>;

export class ControlClientError extends Error {
  readonly code: ControlErrorCode;
  readonly requestId?: number;
  readonly fatal: boolean;

  constructor(code: ControlErrorCode, message: string, options: { requestId?: number; fatal?: boolean; cause?: unknown } = {}) {
    super(message);
    this.name = 'ControlClientError';
    this.code = code;
    this.requestId = options.requestId;
    this.fatal = options.fatal ?? false;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class ControlClient {
  private readonly transport: ControlTransport;
  private readonly pending = new Map<number, PendingResult>();
  private nextRequestId = 1;
  private readonly unsub: () => void;
  private disposed = false;
  private fatal = false;
  private readonly disposePromise: { value: Promise<void> | null } = { value: null };

  constructor(transport: ControlTransport) {
    this.transport = transport;
    this.unsub = transport.onMessage(this.onMessage.bind(this));
  }

  send(request: ControlRequestWithoutId): Promise<ControlResponse> {
    if (this.disposed || this.fatal) {
      return Promise.reject(this.createError('DISPOSED', 'control client is disposed'));
    }

    const id = this.nextRequestId++;
    let envelope: ControlRequest;
    switch (request.kind) {
      case 'init':
        envelope = {
          kind: 'init',
          id,
          coreBaseUrl: request.coreBaseUrl,
          hotTransforms: request.hotTransforms,
          pthreadPoolSize: request.pthreadPoolSize,
          startup: request.startup,
          thread: request.thread,
        };
        break;
      case 'command':
        envelope = {
          kind: 'command',
          id,
          command: request.command,
        };
        break;
      case 'frame':
        envelope = {
          kind: 'frame',
          id,
          dt: request.dt,
        };
        break;
      case 'debugSnapshot':
        envelope = {
          kind: 'debugSnapshot',
          id,
          options: request.options,
        };
        break;
      case 'dispose':
        envelope = buildDisposeRequest(id);
        break;
      default:
        envelope = assertNever(request);
    }
    const promise = new Promise<ControlResponse>(
      (resolve, reject) => {
        this.pending.set(id, {
          kind: request.kind,
          resolve: (value) => {
            const responseKind = value.kind;
            if (isExpectedResponse(request.kind, value)) {
              resolve(value);
              return;
            }

            reject(this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${responseKind} response for ${request.kind} request`, { requestId: id }));
          },
          reject,
        });
      });

    try {
      this.transport.postMessage(envelope);
    } catch (error) {
      if (error instanceof Error) {
        this.rejectDispatchFailure(id, error);
        return promise;
      }
      this.rejectDispatchFailure(id, new Error(String(error)));
    }

    return promise;
  }

  async command(command: ControlCommand): Promise<unknown> {
    const response = await this.send({ kind: 'command', command });
    if (response.kind !== 'result') {
      throw this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${response.kind} response for command request`);
    }
    return response.result;
  }

  async frame(dt: number): Promise<FrameResultResponse> {
    const response = await this.send({ kind: 'frame', dt });
    if (response.kind !== 'frameResult') {
      throw this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${response.kind} response for frame request`);
    }
    return response;
  }

  async debugSnapshot(options: DebugSnapshotOptions): Promise<DebugSnapshot> {
    const response = await this.send({ kind: 'debugSnapshot', options });
    if (response.kind !== 'debugSnapshot') {
      throw this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${response.kind} response for debugSnapshot request`);
    }
    return response.snapshot;
  }

  async dispose(): Promise<void> {
    if (this.disposePromise.value) {
      return this.disposePromise.value;
    }

    const done = Promise.resolve()
      .then(() => {
        this.disposed = true;
        const disposeError = this.createError('DISPOSED', 'control client is disposed');
        for (const pending of this.pending.values()) {
          pending.reject(disposeError);
        }
        this.pending.clear();

        const id = this.nextRequestId++;
        const disposeRequest = buildDisposeRequest(id);
        try {
          this.transport.postMessage(disposeRequest);
        } catch (error) {
          if (error instanceof Error) {
            this.warnDisposeDispatchFailure(error);
            return;
          }
          this.warnDisposeDispatchFailure(new Error(String(error)));
        }
      })
      .then(() => {
        this.unsub();
      });

    this.disposePromise.value = done;
    return done;
  }

  private onMessage(response: ControlResponse): void {
    if (response.kind === 'log') {
      return;
    }

    if (response.kind === 'error') {
      this.handleError(response);
      return;
    }

    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }
    this.pending.delete(response.id);
    pending.resolve(response);
  }

  private handleError(response: ErrorResponse): void {
    const error = this.createError(response.code, response.message, { requestId: response.id, fatal: response.fatal });

    if (response.fatal || response.id === undefined) {
      this.fatal = true;
      this.disposed = true;
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
      return;
    }

    const pending = this.pending.get(response.id);
    if (pending) {
      this.pending.delete(response.id);
      pending.reject(error);
    }
  }

  private createError(code: ControlErrorCode, message: string, options: { requestId?: number; fatal?: boolean; cause?: unknown } = {}): ControlClientError {
    return new ControlClientError(code, message, { requestId: options.requestId, fatal: options.fatal, cause: options.cause });
  }

  private rejectDispatchFailure(id: number, cause: Error): void {
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }

    this.pending.delete(id);
    pending.reject(this.createError('CORE_ERROR', `failed to dispatch request ${id}`, { requestId: id, cause }));
  }

  private warnDisposeDispatchFailure(cause: Error): void {
    console.warn(
      '[soundtrace.js] control client dispose dispatch failed after local teardown',
      cause,
    );
  }
}

function buildDisposeRequest(id: number): DisposeRequest {
  return { kind: 'dispose', id };
}

function isExpectedResponse<K extends ControlRequest['kind']>(
  kind: K,
  response: ControlResponse,
): response is ControlResponseByRequestKind<K> {
  switch (kind) {
    case 'init':
      return response.kind === 'ready';
    case 'command':
    case 'dispose':
      return response.kind === 'result';
    case 'frame':
      return response.kind === 'frameResult';
    case 'debugSnapshot':
      return response.kind === 'debugSnapshot';
    default:
      return assertNever(kind);
  }
}

function assertNever(value: never): never {
  throw new Error(`[soundtrace.js] unexpected control variant: ${String(value)}`);
}

export type { ControlRequest, ControlResponse, ControlTransport, ReadyResponse, ResultResponse, FrameResultResponse, DebugSnapshotResponse };
