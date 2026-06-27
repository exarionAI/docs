export function normalizeFrameResult(result) {
    return {
        updateReturn: result.updateReturn,
        validPathCount: result.validPathCount,
    };
}
export function alignCommandOutcomes(commands, results, toCommandError) {
    const byId = new Map();
    for (const result of results) {
        byId.set(result.id, result);
    }
    return commands.map((command) => byId.get(command.id) ?? {
        id: command.id,
        error: toCommandError(undefined, `[soundtrace.js] missing command outcome for request ${command.id}`),
    });
}
export function emitCommandOutcomes(postResponse, outcomes, commands) {
    const byId = new Map(outcomes.map((outcome) => [outcome.id, outcome]));
    for (const command of commands) {
        const outcome = byId.get(command.id);
        if (outcome && isCommandError(outcome)) {
            postResponse({
                kind: 'error',
                id: command.id,
                code: outcome.error.code,
                message: outcome.error.message,
                fatal: outcome.error.fatal,
            });
            continue;
        }
        if (outcome && isCommandSuccess(outcome)) {
            const response = {
                kind: 'result',
                id: outcome.id,
                result: outcome.result,
            };
            postResponse(response);
            continue;
        }
        postResponse({
            kind: 'error',
            id: command.id,
            code: 'CORE_ERROR',
            message: `[soundtrace.js] command outcome missing for request ${command.id}`,
        });
    }
}
export function toCreateMeshResult(engineId) {
    return { engineId };
}
export function toDeleteResult(payload, engineId) {
    return mergePayload(payload, { engineId, deleted: true });
}
export function toAppliedResult(payload, fields) {
    return mergePayload(payload, { ...fields, applied: true });
}
export function toFrameResultResponse(id, result) {
    return {
        kind: 'frameResult',
        id,
        updateReturn: result.updateReturn,
        validPathCount: result.validPathCount,
    };
}
function isCommandError(outcome) {
    return 'error' in outcome;
}
function isCommandSuccess(outcome) {
    return 'result' in outcome;
}
function mergePayload(payload, defaults) {
    if (!payload || typeof payload !== 'object') {
        return defaults;
    }
    const copiedPayload = {};
    for (const [key, value] of Object.entries(payload)) {
        copiedPayload[key] = value;
    }
    return {
        ...copiedPayload,
        ...defaults,
    };
}
//# sourceMappingURL=control-worker-command-results.js.map