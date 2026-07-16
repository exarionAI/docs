export function isControlErrorCode(value) {
    switch (value) {
        case 'INIT_FAILED':
        case 'NOT_READY':
        case 'COI_REQUIRED':
        case 'BAD_HANDLE':
        case 'CORE_ERROR':
        case 'UNSUPPORTED_MT_NATIVE':
        case 'DISPOSED':
            return true;
        default:
            return false;
    }
}
export function normalizeCaughtUnknown(error) {
    if (error instanceof Error) {
        return error;
    }
    if (readTypedControlErrorFields(error)) {
        return error;
    }
    return new Error(String(error));
}
export function getCaughtMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function toCommandError(error, fallbackMessage) {
    const typed = readTypedControlErrorFields(error);
    if (typed && typed.message !== undefined) {
        return {
            code: typed.code,
            message: typed.message,
            fatal: typed.fatal,
        };
    }
    return {
        code: 'CORE_ERROR',
        message: `${fallbackMessage}: ${getCaughtMessage(normalizeCaughtUnknown(error))}`,
    };
}
export function toControlError(error, code, fallbackMessage) {
    const typed = readTypedControlErrorFields(error);
    if (typed) {
        return {
            code: typed.code,
            message: typed.message ?? fallbackMessage,
            fatal: typed.fatal,
        };
    }
    return {
        code,
        message: `${fallbackMessage}: ${getCaughtMessage(normalizeCaughtUnknown(error))}`,
    };
}
function readTypedControlErrorFields(error) {
    if (!isRecord(error)) {
        return null;
    }
    const code = error.code;
    if (typeof code !== 'string' || !isControlErrorCode(code)) {
        return null;
    }
    return {
        code,
        message: typeof error.message === 'string' ? error.message : undefined,
        fatal: typeof error.fatal === 'boolean' ? error.fatal : undefined,
    };
}
function isRecord(value) {
    return value !== null && typeof value === 'object';
}
//# sourceMappingURL=control-worker-error-utils.js.map