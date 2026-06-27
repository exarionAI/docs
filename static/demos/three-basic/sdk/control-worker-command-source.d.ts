import type { CommandExecutionResult, CommandRequest } from './control-protocol.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
export declare function executeCreateSource(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeDeleteSource(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeSetSourceParam(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeStartAudioSource(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeStopAudioSource(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeSetRenderOption(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
//# sourceMappingURL=control-worker-command-source.d.ts.map