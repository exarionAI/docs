// ExaResult — the unified return type of the v0.7 (ABI 4) C-API surface.
//
// TRUTHINESS FLIP (read before touching any call site): the legacy ABI <= 3
// surface returned ExaBool where NON-ZERO meant success, so `if (ret)` was the
// success test. v0.7 returns ExaResult where ZERO (EXA_OK) is success,
// positive is success-with-info (EXA_OK_BYPASSED) and NEGATIVE is an error.
// A bare `if (ret)` on an ExaResult therefore silently treats success as
// failure and vice versa (the exact bug class that muted web audio in the core
// review, C1). NEVER truthiness-test an ExaResult — use the helpers below:
//   - isOk(r)      success including informational (r >= 0)
//   - isError(r)   real failure (r < 0)
//   - requireOk()  throw with the native detail message + numeric code
//
// NOTE: the diagnostics header (exaSoundDiagnostics.h) intentionally KEEPS the
// legacy ExaBool convention (non-zero = success) for exaPropagatorGetProfile /
// exaPropagator*JobTiming* / exaDiag*. Those call sites must NOT use these
// helpers; they stay boolean.
export const EXA_OK = 0;
/** Success; output is a dry (not-spatialized) bypass. */
export const EXA_OK_BYPASSED = 1;
export const EXA_ERR_NOT_INITIALIZED = -1;
export const EXA_ERR_INVALID_HANDLE = -2;
export const EXA_ERR_INVALID_ARG = -3;
export const EXA_ERR_OUT_OF_RANGE = -4;
export const EXA_ERR_NOT_LOADED = -5;
export const EXA_ERR_BUFFER_TOO_SMALL = -6;
export const EXA_ERR_WRONG_THREAD = -7;
export const EXA_ERR_UNSUPPORTED = -8;
export const EXA_ERR_ALREADY = -9;
export const EXA_ERR_INTERNAL = -100;
const EXA_RESULT_NAMES = {
    [EXA_OK]: 'EXA_OK',
    [EXA_OK_BYPASSED]: 'EXA_OK_BYPASSED',
    [EXA_ERR_NOT_INITIALIZED]: 'EXA_ERR_NOT_INITIALIZED',
    [EXA_ERR_INVALID_HANDLE]: 'EXA_ERR_INVALID_HANDLE',
    [EXA_ERR_INVALID_ARG]: 'EXA_ERR_INVALID_ARG',
    [EXA_ERR_OUT_OF_RANGE]: 'EXA_ERR_OUT_OF_RANGE',
    [EXA_ERR_NOT_LOADED]: 'EXA_ERR_NOT_LOADED',
    [EXA_ERR_BUFFER_TOO_SMALL]: 'EXA_ERR_BUFFER_TOO_SMALL',
    [EXA_ERR_WRONG_THREAD]: 'EXA_ERR_WRONG_THREAD',
    [EXA_ERR_UNSUPPORTED]: 'EXA_ERR_UNSUPPORTED',
    [EXA_ERR_ALREADY]: 'EXA_ERR_ALREADY',
    [EXA_ERR_INTERNAL]: 'EXA_ERR_INTERNAL',
};
/** Symbolic name for an ExaResult code (falls back to the number). */
export function exaResultName(result) {
    return EXA_RESULT_NAMES[result] ?? `ExaResult(${result})`;
}
/** Success, INCLUDING informational successes such as EXA_OK_BYPASSED. */
export function isOk(result) {
    return result >= EXA_OK;
}
/** Real failure (negative code). */
export function isError(result) {
    return result < EXA_OK;
}
/** Error thrown by requireOk — carries the raw code for programmatic handling. */
export class ExaResultError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = 'ExaResultError';
        this.code = code;
    }
}
/**
 * Central success gate for every native call site (the requireNativeSuccess
 * of the v0.7 surface). Throws on a negative ExaResult with the calling
 * thread's exaGetLastError() detail plus the symbolic + numeric code.
 * Informational successes (EXA_OK_BYPASSED) pass. Returns the result so the
 * caller can still distinguish EXA_OK from EXA_OK_BYPASSED.
 */
export function requireOk(result, context, getLastError) {
    if (result >= EXA_OK)
        return result;
    const detail = getLastError ? getLastError().trim() : '';
    const reason = detail.length > 0 ? `: ${detail}` : '';
    throw new ExaResultError(`[soundtrace.js] ${context} failed (${exaResultName(result)})${reason}`, result);
}
//# sourceMappingURL=result.js.map