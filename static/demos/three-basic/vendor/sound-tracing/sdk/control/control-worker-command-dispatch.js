import { alignCommandOutcomes } from './control-worker-command-results.js';
import { executeCreateSource, executeDeleteSource, executeStartAudioSource, executeStopAudioSource, executeSetRenderOption, executeSetSourceParam, } from './control-worker-command-source.js';
import { executeCreateMesh, executeDeleteMesh, executeSetMeshMaterial, executeSetMeshMaterialRange, executeSetMeshUpdateType, } from './control-worker-command-mesh.js';
import { executeLoadListenerHrtf, executeReset, executeSetListenerOption, } from './control-worker-command-listener.js';
export async function safeDrainCommands(commands, context) {
    if (commands.length === 0) {
        return [];
    }
    const outcomes = [];
    let pendingCommands = [];
    const flushPendingCommands = async () => {
        if (pendingCommands.length === 0) {
            return;
        }
        const runtime = context.getRuntime();
        if (!runtime?.drainCommands) {
            outcomes.push(...pendingCommands.map((command) => ({
                id: command.id,
                error: {
                    code: 'UNSUPPORTED_MT_NATIVE',
                    message: '[soundtrace.js] command executor is not installed on this runtime',
                },
            })));
            pendingCommands = [];
            return;
        }
        try {
            outcomes.push(...await runtime.drainCommands(pendingCommands));
        }
        catch (error) {
            let normalizedError = error;
            if (!(normalizedError instanceof Error)) {
                normalizedError = context.normalizeCaughtUnknown(normalizedError);
            }
            const fallbackError = context.toCommandError(normalizedError, 'command drain failed');
            outcomes.push(...pendingCommands.map((command) => ({ id: command.id, error: fallbackError })));
        }
        finally {
            pendingCommands = [];
        }
    };
    for (const command of commands) {
        if (isRemovedTransformCommand(command)) {
            await flushPendingCommands();
            outcomes.push(unsupportedRemovedTransformCommand(command));
            continue;
        }
        if (isImmediateCommand(command)) {
            await flushPendingCommands();
            outcomes.push(await executeImmediateCommand(command, context));
            continue;
        }
        pendingCommands.push(command);
    }
    await flushPendingCommands();
    return alignCommandOutcomes(commands, outcomes, context.toCommandError);
}
async function executeImmediateCommand(command, context) {
    switch (command.command.op) {
        case 'createSource':
            return executeCreateSource(command, context);
        case 'createMesh':
            return executeCreateMesh(command, context);
        case 'deleteSource':
            return executeDeleteSource(command, context);
        case 'deleteMesh':
            return executeDeleteMesh(command, context);
        case 'setMeshMaterial':
            return executeSetMeshMaterial(command, context);
        case 'setMeshMaterialRange':
            return executeSetMeshMaterialRange(command, context);
        case 'setMeshUpdateType':
            return executeSetMeshUpdateType(command, context);
        case 'setSourceParam':
            return executeSetSourceParam(command, context);
        case 'startAudioSource':
            return executeStartAudioSource(command, context);
        case 'stopAudioSource':
            return executeStopAudioSource(command, context);
        case 'setRenderOption':
            return executeSetRenderOption(command, context);
        case 'setListenerOption':
            return executeSetListenerOption(command, context);
        case 'loadListenerHrtf':
            return executeLoadListenerHrtf(command, context);
        case 'reset':
            return executeReset(command, context);
        default:
            return {
                id: command.id,
                error: {
                    code: 'UNSUPPORTED_MT_NATIVE',
                    message: `[soundtrace.js] unhandled immediate command op: ${command.command.op}`,
                },
            };
    }
}
function isImmediateCommand(command) {
    switch (command.command.op) {
        case 'createSource':
        case 'createMesh':
        case 'deleteSource':
        case 'deleteMesh':
        case 'setMeshMaterial':
        case 'setMeshMaterialRange':
        case 'setSourceParam':
        case 'setMeshUpdateType':
        case 'startAudioSource':
        case 'stopAudioSource':
        case 'setRenderOption':
        case 'setListenerOption':
        case 'loadListenerHrtf':
        case 'reset':
            return true;
        default:
            return false;
    }
}
function isRemovedTransformCommand(command) {
    const op = command.command.op;
    return op === 'setListenerPose' || op === 'setMeshPose';
}
function unsupportedRemovedTransformCommand(command) {
    const op = command.command.op;
    return {
        id: command.id,
        error: {
            code: 'UNSUPPORTED_MT_NATIVE',
            message: op === 'setListenerPose'
                ? '[soundtrace.js] listener transform command transport was removed pending the Todo9 HOT bridge'
                : '[soundtrace.js] mesh transform command transport was removed pending the Todo9 HOT bridge',
        },
    };
}
//# sourceMappingURL=control-worker-command-dispatch.js.map