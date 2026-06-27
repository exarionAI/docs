import type { CommandExecutionFailure, ControlErrorCode } from './control-protocol.js';

export type ControlWorkerRuntimeError = {
  readonly code: ControlErrorCode;
  readonly message: string;
  readonly fatal?: boolean;
};

export function isControlErrorCode(value: string): value is ControlErrorCode {
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

export function normalizeCaughtUnknown(error: unknown): unknown {
  if (error instanceof Error) {
    return error;
  }
  if (readTypedControlErrorFields(error)) {
    return error;
  }
  return new Error(String(error));
}

export function getCaughtMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function toCommandError(
  error: unknown,
  fallbackMessage: string,
): CommandExecutionFailure['error'] {
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

export function toControlError(
  error: unknown,
  code: ControlErrorCode,
  fallbackMessage: string,
): ControlWorkerRuntimeError {
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

function readTypedControlErrorFields(
  error: unknown,
): {
  readonly code: ControlErrorCode;
  readonly message?: string;
  readonly fatal?: boolean;
} | null {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
