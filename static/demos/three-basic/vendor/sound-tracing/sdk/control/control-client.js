/**
 * Buffers to transfer (zero-copy) alongside a request, instead of paying a
 * structured-clone copy across the worker boundary. Currently the createMesh
 * vertex buffer: the facade builds it fresh via `Float32Array.from(...)`, so
 * transferring it never detaches a caller-owned array. HRTF payloads are also
 * copied into exact-length buffers before dispatch. Large mesh/HRTF uploads
 * previously janked on the clone copy.
 */
export function collectRequestTransferables(request) {
    if (request.kind === 'command' && request.command.op === 'createMesh') {
        const buffer = request.command.initial.vertices.buffer;
        if (buffer instanceof ArrayBuffer && buffer.byteLength > 0) {
            return [buffer];
        }
    }
    if (request.kind === 'command' && request.command.op === 'loadListenerHrtf') {
        const buffer = request.command.bytes.buffer;
        if (buffer instanceof ArrayBuffer && buffer.byteLength > 0) {
            return [buffer];
        }
    }
    return [];
}
export class ControlClientError extends Error {
    code;
    requestId;
    fatal;
    constructor(code, message, options = {}) {
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
    transport;
    pending = new Map();
    nextRequestId = 1;
    unsub;
    disposed = false;
    fatal = false;
    disposePromise = { value: null };
    constructor(transport) {
        this.transport = transport;
        this.unsub = transport.onMessage(this.onMessage.bind(this));
    }
    send(request) {
        if (this.disposed || this.fatal) {
            return Promise.reject(this.createError('DISPOSED', 'control client is disposed'));
        }
        const id = this.nextRequestId++;
        let envelope;
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
        const promise = new Promise((resolve, reject) => {
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
            this.transport.postMessage(envelope, collectRequestTransferables(envelope));
        }
        catch (error) {
            if (error instanceof Error) {
                this.rejectDispatchFailure(id, error);
                return promise;
            }
            this.rejectDispatchFailure(id, new Error(String(error)));
        }
        return promise;
    }
    async command(command) {
        const response = await this.send({ kind: 'command', command });
        if (response.kind !== 'result') {
            throw this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${response.kind} response for command request`);
        }
        return response.result;
    }
    async frame(dt) {
        const response = await this.send({ kind: 'frame', dt });
        if (response.kind !== 'frameResult') {
            throw this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${response.kind} response for frame request`);
        }
        return response;
    }
    async debugSnapshot(options) {
        const response = await this.send({ kind: 'debugSnapshot', options });
        if (response.kind !== 'debugSnapshot') {
            throw this.createError('CORE_ERROR', `[soundtrace.js] unexpected ${response.kind} response for debugSnapshot request`);
        }
        return response.snapshot;
    }
    async dispose() {
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
            }
            catch (error) {
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
    onMessage(response) {
        if (response.kind === 'log') {
            forwardWorkerLog(response);
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
    handleError(response) {
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
    createError(code, message, options = {}) {
        return new ControlClientError(code, message, { requestId: options.requestId, fatal: options.fatal, cause: options.cause });
    }
    rejectDispatchFailure(id, cause) {
        const pending = this.pending.get(id);
        if (!pending) {
            return;
        }
        this.pending.delete(id);
        pending.reject(this.createError('CORE_ERROR', `failed to dispatch request ${id}`, { requestId: id, cause }));
    }
    warnDisposeDispatchFailure(cause) {
        console.warn('[soundtrace.js] control client dispose dispatch failed after local teardown', cause);
    }
}
function buildDisposeRequest(id) {
    return { kind: 'dispose', id };
}
function isExpectedResponse(kind, response) {
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
function assertNever(value) {
    throw new Error(`[soundtrace.js] unexpected control variant: ${String(value)}`);
}
// The worker reroutes the core's stderr (printErr) into {kind:'log'} responses
// (control-worker-lifecycle). On the ST path the very same lines reach the
// console through core-loader's printNativeError — so this sink, including the
// noise filter, must stay in lockstep with that one or the identical scene is
// diagnosable on one thread mode and silent on the other (finding #12,
// root cause #6). Every native diagnostic — e.g. the core's
// "[Exarion][Warn] SoundSource slot out of range" for the S1 source ceiling —
// was silently dropped here before this routing existed.
/** Mirrors core-loader.ts shouldDropNativeLog: per-frame telemetry noise. */
function shouldDropNativeLog(message) {
    return message.includes('[Exarion][Info] SetupPlaneUsage:');
}
function forwardWorkerLog(response) {
    if (shouldDropNativeLog(response.message))
        return;
    const sink = response.level === 'error'
        ? console.error
        : response.level === 'warn' ? console.warn : console.info;
    sink('[soundtrace.js][worker]', response.message);
}
//# sourceMappingURL=control-client.js.map