import { normalizeCaughtUnknown, toControlError, } from './control-worker-error-utils.js';
export async function resolveDebugSnapshots(snapshots, context) {
    const runtime = context.runtime;
    if (!runtime?.debugSnapshot) {
        for (const snapshot of snapshots) {
            context.dependencies.postResponse({
                kind: 'error',
                id: snapshot.id,
                code: 'UNSUPPORTED_MT_NATIVE',
                message: '[soundtrace.js] debugSnapshot is not installed on this worker runtime',
            });
        }
        return;
    }
    for (const snapshot of snapshots) {
        try {
            context.dependencies.postResponse({
                kind: 'debugSnapshot',
                id: snapshot.id,
                snapshot: await runtime.debugSnapshot(snapshot.options),
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
            const responseError = toControlError(caughtError, 'CORE_ERROR', '[soundtrace.js] debugSnapshot failed');
            context.dependencies.postResponse({
                kind: 'error',
                id: snapshot.id,
                code: responseError.code,
                message: responseError.message,
                fatal: responseError.fatal,
            });
        }
    }
}
//# sourceMappingURL=control-worker-debug-snapshot.js.map