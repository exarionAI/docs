import type { CommandExecutionResult, CommandRequest } from './control-protocol.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
export declare function executeReset(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeSetListenerOption(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
//# sourceMappingURL=control-worker-command-listener.d.ts.map