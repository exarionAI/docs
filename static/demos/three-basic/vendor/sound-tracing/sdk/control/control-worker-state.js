export function createControlWorkerState() {
    return {
        runtime: null,
        pendingFrames: [],
        pendingCommands: [],
        pendingDebugSnapshots: [],
        sourceHandleMap: new Map(),
        meshHandleMap: new Map(),
        controlLoopRunning: false,
        disposed: false,
    };
}
//# sourceMappingURL=control-worker-state.js.map