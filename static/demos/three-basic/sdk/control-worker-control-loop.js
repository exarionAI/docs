import { emitCommandOutcomes, normalizeFrameResult, toFrameResultResponse, } from './control-worker-command-results.js';
import { safeDrainCommands } from './control-worker-command-dispatch.js';
import { normalizeCaughtUnknown, toControlError, } from './control-worker-error-utils.js';
import { markWorkerFatal } from './control-worker-lifecycle.js';
import { resolveDebugSnapshots } from './control-worker-debug-snapshot.js';
import { applyPendingHotTransforms } from './control-worker-hot-transforms.js';
export function enqueueFrameRequest(request, context) {
    if (!context.state.runtime) {
        context.dependencies.postResponse({
            kind: 'error',
            id: request.id,
            code: 'NOT_READY',
            message: '[soundtrace.js] frame requested before worker runtime is ready',
        });
        return;
    }
    context.state.pendingFrames.push(request);
    scheduleControlLoop(context);
}
export function enqueueCommandRequest(request, context) {
    if (!context.state.runtime) {
        context.dependencies.postResponse({
            kind: 'error',
            id: request.id,
            code: 'NOT_READY',
            message: '[soundtrace.js] command requested before worker runtime is ready',
        });
        return;
    }
    context.state.pendingCommands.push(request);
    scheduleControlLoop(context);
}
export function enqueueDebugSnapshotRequest(request, context) {
    if (!context.state.runtime) {
        context.dependencies.postResponse({
            kind: 'error',
            id: request.id,
            code: 'NOT_READY',
            message: '[soundtrace.js] debug snapshot requested before worker runtime is ready',
        });
        return;
    }
    context.state.pendingDebugSnapshots.push({
        id: request.id,
        options: request.options,
    });
    scheduleControlLoop(context);
}
export function scheduleControlLoop(context) {
    if (context.state.controlLoopRunning) {
        return;
    }
    if (context.state.pendingFrames.length === 0
        && context.state.pendingCommands.length === 0
        && context.state.pendingDebugSnapshots.length === 0) {
        return;
    }
    context.state.controlLoopRunning = true;
    context.dependencies.schedule(() => {
        void processControlLoop(context);
    });
}
async function processControlLoop(context) {
    if (!context.state.runtime) {
        context.state.controlLoopRunning = false;
        return;
    }
    const frames = context.state.pendingFrames.splice(0, context.state.pendingFrames.length);
    const commands = context.state.pendingCommands.splice(0, context.state.pendingCommands.length);
    const snapshots = context.state.pendingDebugSnapshots.splice(0, context.state.pendingDebugSnapshots.length);
    if (frames.length === 0 && commands.length === 0 && snapshots.length === 0) {
        context.state.controlLoopRunning = false;
        return;
    }
    let commandOutcomesEmitted = false;
    try {
        const outcomes = await safeDrainCommands(commands, context.getCommandContext());
        emitCommandOutcomes(context.dependencies.postResponse, outcomes, commands);
        commandOutcomesEmitted = true;
        const pendingTransforms = applyPendingHotTransforms(context);
        if (pendingTransforms) {
            await pendingTransforms;
        }
        if (frames.length > 0) {
            const frameTotalDt = frames.reduce((sum, frame) => sum + frame.dt, 0);
            const updateResult = normalizeFrameResult(await context.state.runtime.tick(frameTotalDt));
            for (const frame of frames) {
                context.dependencies.postResponse(toFrameResultResponse(frame.id, updateResult));
            }
        }
        if (snapshots.length > 0) {
            await resolveDebugSnapshots(snapshots, {
                dependencies: context.dependencies,
                runtime: context.state.runtime,
            });
        }
    }
    catch (error) {
        let caughtError;
        if (error instanceof Error) {
            caughtError = error;
        }
        else {
            caughtError = normalizeCaughtUnknown(error);
        }
        const fatalError = toControlError(caughtError, 'CORE_ERROR', '[soundtrace.js] control-loop fatal');
        if (!commandOutcomesEmitted) {
            for (const command of commands) {
                context.dependencies.postResponse({
                    kind: 'error',
                    id: command.id,
                    code: fatalError.code,
                    message: fatalError.message,
                    fatal: true,
                });
            }
        }
        for (const frame of frames) {
            context.dependencies.postResponse({
                kind: 'error',
                id: frame.id,
                code: fatalError.code,
                message: fatalError.message,
                fatal: true,
            });
        }
        for (const snapshot of snapshots) {
            context.dependencies.postResponse({
                kind: 'error',
                id: snapshot.id,
                code: fatalError.code,
                message: fatalError.message,
                fatal: true,
            });
        }
        markWorkerFatal(caughtError, {
            dependencies: context.dependencies,
            state: context.state,
        });
    }
    finally {
        context.state.controlLoopRunning = false;
        scheduleControlLoop(context);
    }
}
//# sourceMappingURL=control-worker-control-loop.js.map