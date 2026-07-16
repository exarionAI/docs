import { toAppliedResult, toCreateMeshResult, toDeleteResult, } from './control-worker-command-results.js';
export async function executeCreateMesh(command, context) {
    if (command.command.op !== 'createMesh') {
        return unsupportedResult(command.id, 'non-createMesh command routed to createMesh executor');
    }
    if (context.meshHandleMap.has(command.command.handle)) {
        return badHandle(command.id, `duplicate mesh handle: ${command.command.handle}`);
    }
    const createMesh = context.dependencies.createMesh ?? context.getRuntime()?.createMesh;
    if (!createMesh) {
        return coreError(command.id, 'mesh create adapter is not installed on this worker runtime');
    }
    try {
        const engineId = await createMesh(command.command);
        context.meshHandleMap.set(command.command.handle, engineId);
        return { id: command.id, result: toCreateMeshResult(engineId) };
    }
    catch (error) {
        return commandFailure(command.id, error instanceof Error ? error : context.normalizeCaughtUnknown(error), context, `[soundtrace.js] createMesh failed for handle ${command.command.handle}`);
    }
}
export async function executeDeleteMesh(command, context) {
    if (command.command.op !== 'deleteMesh') {
        return unsupportedResult(command.id, 'non-deleteMesh command routed to deleteMesh executor');
    }
    const engineId = context.meshHandleMap.get(command.command.handle);
    if (engineId === undefined) {
        return badHandle(command.id, `unknown mesh handle: ${command.command.handle}`);
    }
    const deleteMesh = context.dependencies.deleteMesh ?? context.getRuntime()?.deleteMesh;
    if (!deleteMesh) {
        return coreError(command.id, 'mesh delete adapter is not installed on this worker runtime');
    }
    try {
        const payload = await deleteMesh({ ...command.command, engineId });
        context.meshHandleMap.delete(command.command.handle);
        return { id: command.id, result: toDeleteResult(payload, engineId) };
    }
    catch (error) {
        return commandFailure(command.id, error instanceof Error ? error : context.normalizeCaughtUnknown(error), context, `[soundtrace.js] deleteMesh failed for handle ${command.command.handle}`);
    }
}
export async function executeSetMeshMaterial(command, context) {
    if (command.command.op !== 'setMeshMaterial') {
        return unsupportedResult(command.id, 'non-setMeshMaterial command routed to setMeshMaterial executor');
    }
    const engineId = context.meshHandleMap.get(command.command.handle);
    if (engineId === undefined) {
        return badHandle(command.id, `unknown mesh handle: ${command.command.handle}`);
    }
    const setMeshMaterial = context.dependencies.setMeshMaterial ?? context.getRuntime()?.setMeshMaterial;
    if (!setMeshMaterial) {
        return coreError(command.id, 'mesh material adapter is not installed on this worker runtime');
    }
    try {
        const payload = await setMeshMaterial({ ...command.command, engineId });
        return { id: command.id, result: toAppliedResult(payload, { engineId, material: command.command.material }) };
    }
    catch (error) {
        return commandFailure(command.id, error instanceof Error ? error : context.normalizeCaughtUnknown(error), context, `[soundtrace.js] setMeshMaterial failed for handle ${command.command.handle}`);
    }
}
export async function executeSetMeshMaterialRange(command, context) {
    if (command.command.op !== 'setMeshMaterialRange') {
        return unsupportedResult(command.id, 'non-setMeshMaterialRange command routed to setMeshMaterialRange executor');
    }
    const engineId = context.meshHandleMap.get(command.command.handle);
    if (engineId === undefined) {
        return badHandle(command.id, `unknown mesh handle: ${command.command.handle}`);
    }
    const setMeshMaterialRange = context.dependencies.setMeshMaterialRange ?? context.getRuntime()?.setMeshMaterialRange;
    if (!setMeshMaterialRange) {
        return coreError(command.id, 'mesh material range adapter is not installed on this worker runtime');
    }
    try {
        const payload = await setMeshMaterialRange({ ...command.command, engineId });
        return {
            id: command.id,
            result: toAppliedResult(payload, {
                engineId,
                triStart: command.command.triStart,
                triCount: command.command.triCount,
                material: command.command.material,
            }),
        };
    }
    catch (error) {
        return commandFailure(command.id, error instanceof Error ? error : context.normalizeCaughtUnknown(error), context, `[soundtrace.js] setMeshMaterialRange failed for handle ${command.command.handle}`);
    }
}
export async function executeSetMeshUpdateType(command, context) {
    if (command.command.op !== 'setMeshUpdateType') {
        return unsupportedResult(command.id, 'non-setMeshUpdateType command routed to setMeshUpdateType executor');
    }
    const engineId = context.meshHandleMap.get(command.command.handle);
    if (engineId === undefined) {
        return badHandle(command.id, `unknown mesh handle: ${command.command.handle}`);
    }
    const setMeshUpdateType = context.dependencies.setMeshUpdateType ?? context.getRuntime()?.setMeshUpdateType;
    if (!setMeshUpdateType) {
        return coreError(command.id, 'mesh update type adapter is not installed on this worker runtime');
    }
    try {
        const payload = await setMeshUpdateType({ ...command.command, engineId });
        return { id: command.id, result: toAppliedResult(payload, { engineId, updateType: command.command.updateType }) };
    }
    catch (error) {
        return commandFailure(command.id, error instanceof Error ? error : context.normalizeCaughtUnknown(error), context, `[soundtrace.js] setMeshUpdateType failed for handle ${command.command.handle}`);
    }
}
function badHandle(id, message) {
    return { id, error: { code: 'BAD_HANDLE', message: `[soundtrace.js] ${message}` } };
}
function coreError(id, message) {
    return { id, error: { code: 'CORE_ERROR', message: `[soundtrace.js] ${message}` } };
}
function unsupportedResult(id, message) {
    return { id, error: { code: 'UNSUPPORTED_MT_NATIVE', message: `[soundtrace.js] ${message}` } };
}
function commandFailure(id, error, context, fallbackMessage) {
    return {
        id,
        error: context.toCommandError(error, fallbackMessage),
    };
}
//# sourceMappingURL=control-worker-command-mesh.js.map