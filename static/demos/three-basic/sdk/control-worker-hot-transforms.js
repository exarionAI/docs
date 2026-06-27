import { readChangedListenerTransform, } from './control-hot-listener-transform.js';
import { readChangedMeshTransforms, } from './control-hot-mesh-transform.js';
import { readChangedSourceTransforms, } from './control-hot-source-transform.js';
import { getCaughtMessage, normalizeCaughtUnknown, } from './control-worker-error-utils.js';
export function applyPendingHotTransforms(context) {
    const pending = [];
    const sourceWork = applyPendingSourceTransforms(context);
    if (sourceWork) {
        pending.push(sourceWork);
    }
    const listenerWork = applyPendingListenerTransform(context);
    if (listenerWork) {
        pending.push(listenerWork);
    }
    const meshWork = applyPendingMeshTransforms(context);
    if (meshWork) {
        pending.push(meshWork);
    }
    if (pending.length === 0) {
        return;
    }
    return Promise.all(pending).then(() => undefined);
}
function applyPendingSourceTransforms(context) {
    if (!context.state.runtime
        || !context.sourceTransformLane
        || !context.sourceTransformReadCursor) {
        return;
    }
    const entries = readChangedSourceTransforms(context.sourceTransformLane, context.sourceTransformReadCursor);
    if (entries.length === 0) {
        return;
    }
    const applyHotSourceTransform = context.dependencies.applyHotSourceTransform
        ?? context.state.runtime.applyHotSourceTransform;
    if (!applyHotSourceTransform) {
        context.dependencies.postResponse({
            kind: 'log',
            level: 'error',
            message: '[soundtrace.js] HOT source transform adapter is not installed; source transform updates skipped',
        });
        return;
    }
    const apply = async () => {
        for (const entry of entries) {
            const engineId = context.state.sourceHandleMap.get(entry.handle);
            if (engineId === undefined) {
                context.dependencies.postResponse({
                    kind: 'log',
                    level: 'warn',
                    message: `[soundtrace.js] HOT source transform for unknown source handle skipped: ${entry.handle}`,
                });
                continue;
            }
            const { slot, ...payload } = entry;
            void slot;
            try {
                await applyHotSourceTransform({
                    ...payload,
                    engineId,
                });
            }
            catch (error) {
                let caughtError;
                if (error instanceof Error) {
                    caughtError = error;
                }
                else {
                    caughtError = normalizeCaughtUnknown(error);
                }
                const message = getCaughtMessage(caughtError);
                context.dependencies.postResponse({
                    kind: 'log',
                    level: 'error',
                    message: `[soundtrace.js] failed to apply HOT source transform for source handle ${entry.handle} (${engineId}): ${message}`,
                });
            }
        }
    };
    return apply();
}
function applyPendingListenerTransform(context) {
    if (!context.state.runtime
        || !context.listenerTransformLane
        || !context.listenerTransformReadCursor) {
        return;
    }
    const payload = readChangedListenerTransform(context.listenerTransformLane, context.listenerTransformReadCursor);
    if (!payload) {
        return;
    }
    const applyHotListenerTransform = context.dependencies.applyHotListenerTransform
        ?? context.state.runtime.applyHotListenerTransform;
    if (!applyHotListenerTransform) {
        context.dependencies.postResponse({
            kind: 'log',
            level: 'error',
            message: '[soundtrace.js] HOT listener transform adapter is not installed; listener transform updates skipped',
        });
        return;
    }
    return applyListenerTransform(payload, applyHotListenerTransform, context);
}
async function applyListenerTransform(payload, applyHotListenerTransform, context) {
    try {
        await applyHotListenerTransform(payload);
    }
    catch (error) {
        const caughtError = error instanceof Error
            ? error
            : normalizeCaughtUnknown(error);
        const message = getCaughtMessage(caughtError);
        context.dependencies.postResponse({
            kind: 'log',
            level: 'error',
            message: `[soundtrace.js] failed to apply HOT listener transform: ${message}`,
        });
    }
}
function applyPendingMeshTransforms(context) {
    if (!context.state.runtime
        || !context.meshTransformLane
        || !context.meshTransformReadCursor) {
        return;
    }
    const entries = readChangedMeshTransforms(context.meshTransformLane, context.meshTransformReadCursor);
    if (entries.length === 0) {
        return;
    }
    const applyHotMeshTransform = context.dependencies.applyHotMeshTransform
        ?? context.state.runtime.applyHotMeshTransform;
    if (!applyHotMeshTransform) {
        context.dependencies.postResponse({
            kind: 'log',
            level: 'error',
            message: '[soundtrace.js] HOT mesh transform adapter is not installed; mesh transform updates skipped',
        });
        return;
    }
    return applyMeshTransforms(entries, applyHotMeshTransform, context);
}
async function applyMeshTransforms(entries, applyHotMeshTransform, context) {
    for (const entry of entries) {
        const engineId = context.state.meshHandleMap.get(entry.handle);
        if (engineId === undefined) {
            context.dependencies.postResponse({
                kind: 'log',
                level: 'warn',
                message: `[soundtrace.js] HOT mesh transform for unknown mesh handle skipped: ${entry.handle}`,
            });
            continue;
        }
        const { slot, ...payload } = entry;
        void slot;
        try {
            await applyHotMeshTransform({
                ...payload,
                engineId,
            });
        }
        catch (error) {
            const caughtError = error instanceof Error
                ? error
                : normalizeCaughtUnknown(error);
            const message = getCaughtMessage(caughtError);
            context.dependencies.postResponse({
                kind: 'log',
                level: 'error',
                message: `[soundtrace.js] failed to apply HOT mesh transform for mesh handle ${entry.handle} (${engineId}): ${message}`,
            });
        }
    }
}
//# sourceMappingURL=control-worker-hot-transforms.js.map