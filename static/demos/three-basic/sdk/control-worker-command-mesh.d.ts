import type { CommandExecutionResult, CommandRequest } from './control-protocol.js';
import type { ControlWorkerCommandContext } from './control-worker-command-context.js';
export declare function executeCreateMesh(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeDeleteMesh(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeSetMeshMaterial(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeSetMeshMaterialRange(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
export declare function executeSetMeshUpdateType(command: CommandRequest, context: ControlWorkerCommandContext): Promise<CommandExecutionResult>;
//# sourceMappingURL=control-worker-command-mesh.d.ts.map