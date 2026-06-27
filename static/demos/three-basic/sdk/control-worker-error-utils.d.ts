import type { CommandExecutionFailure, ControlErrorCode } from './control-protocol.js';
export type ControlWorkerRuntimeError = {
    readonly code: ControlErrorCode;
    readonly message: string;
    readonly fatal?: boolean;
};
export declare function isControlErrorCode(value: string): value is ControlErrorCode;
export declare function normalizeCaughtUnknown(error: unknown): unknown;
export declare function getCaughtMessage(error: unknown): string;
export declare function toCommandError(error: unknown, fallbackMessage: string): CommandExecutionFailure['error'];
export declare function toControlError(error: unknown, code: ControlErrorCode, fallbackMessage: string): ControlWorkerRuntimeError;
//# sourceMappingURL=control-worker-error-utils.d.ts.map