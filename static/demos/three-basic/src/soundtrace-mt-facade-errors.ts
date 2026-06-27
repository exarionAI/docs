export type MtFacadeErrorCode = 'BAD_HANDLE' | 'DISPOSED';

export class MtFacadeError extends Error {
  readonly code: MtFacadeErrorCode;

  constructor(code: MtFacadeErrorCode, message: string) {
    super(message);
    this.name = 'MtFacadeError';
    this.code = code;
  }
}

export function createBadHandleError(message: string): MtFacadeError {
  return new MtFacadeError('BAD_HANDLE', `[soundtrace.js] ${message}`);
}

export function createDisposedError(message: string): MtFacadeError {
  return new MtFacadeError('DISPOSED', `[soundtrace.js] ${message}`);
}
