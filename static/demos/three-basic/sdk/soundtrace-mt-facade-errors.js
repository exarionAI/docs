export class MtFacadeError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'MtFacadeError';
        this.code = code;
    }
}
export function createBadHandleError(message) {
    return new MtFacadeError('BAD_HANDLE', `[soundtrace.js] ${message}`);
}
export function createDisposedError(message) {
    return new MtFacadeError('DISPOSED', `[soundtrace.js] ${message}`);
}
//# sourceMappingURL=soundtrace-mt-facade-errors.js.map