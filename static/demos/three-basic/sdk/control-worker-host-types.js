export function getDependenciesFromOptions(options) {
    if (hasDependencyEnvelope(options)) {
        return options.dependencies;
    }
    return options;
}
function hasDependencyEnvelope(options) {
    return 'dependencies' in options;
}
//# sourceMappingURL=control-worker-host-types.js.map