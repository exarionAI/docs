export type MtFacadeErrorCode = 'BAD_HANDLE' | 'DISPOSED';
export declare class MtFacadeError extends Error {
    readonly code: MtFacadeErrorCode;
    constructor(code: MtFacadeErrorCode, message: string);
}
export declare function createBadHandleError(message: string): MtFacadeError;
export declare function createDisposedError(message: string): MtFacadeError;
//# sourceMappingURL=soundtrace-mt-facade-errors.d.ts.map