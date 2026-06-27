import type { CommandExecutionResult, CommandRequest } from './control-protocol.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
export declare function safeDrainCommands(commands: readonly CommandRequest[], context: ControlWorkerCommandContext): Promise<CommandExecutionResult[]>;
//# sourceMappingURL=control-worker-command-dispatch.d.ts.map