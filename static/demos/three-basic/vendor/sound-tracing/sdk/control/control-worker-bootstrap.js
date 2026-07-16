const CONTROL_WORKER_BOOTSTRAP_PREFIX = '[soundtrace.js] control worker bootstrap failed';
function quoted(value) {
    return JSON.stringify(value);
}
function resolveDocumentBaseHref() {
    if (typeof document !== 'undefined' && typeof document.baseURI === 'string') {
        return document.baseURI;
    }
    if (typeof location !== 'undefined' && typeof location.href === 'string') {
        return location.href;
    }
    return null;
}
export function resolveControlWorkerCoreBaseUrl(coreBaseUrl) {
    const documentBaseHref = resolveDocumentBaseHref();
    if (documentBaseHref === null) {
        return coreBaseUrl;
    }
    return new URL(coreBaseUrl, documentBaseHref).href.replace(/\/$/, '');
}
export function createControlWorkerBootstrapSource(moduleUrl) {
    const quotedModuleUrl = quoted(moduleUrl);
    const quotedPrefix = quoted(CONTROL_WORKER_BOOTSTRAP_PREFIX);
    return `
const moduleUrl = ${quotedModuleUrl};
const bootstrapPrefix = ${quotedPrefix};
const pending = [];
let host = null;
let bootPromise = null;
let bootFailure = null;

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function toFatalResponse(request, message) {
  const response = {
    kind: 'error',
    code: 'CORE_ERROR',
    message,
    fatal: true,
  };
  if (request && typeof request.id === 'number') {
    response.id = request.id;
  }
  return response;
}

async function dispatch(request) {
  if (bootFailure !== null) {
    self.postMessage(toFatalResponse(request, bootFailure));
    return;
  }
  if (host === null) {
    pending.push(request);
    if (bootPromise === null) {
      bootPromise = bootstrap();
    }
    return;
  }
  await host.handleRequest(request);
}

async function bootstrap() {
  try {
    const controlWorkerModule = await import(moduleUrl);
    host = new controlWorkerModule.ControlWorkerHost();
    while (pending.length > 0) {
      const request = pending.shift();
      await host.handleRequest(request);
    }
  } catch (error) {
    bootFailure = \`\${bootstrapPrefix}: \${getErrorMessage(error)}\`;
    const queued = pending.splice(0, pending.length);
    for (const request of queued) {
      self.postMessage(toFatalResponse(request, bootFailure));
    }
  }
}

self.addEventListener('message', (event) => {
  void dispatch(event.data).catch((error) => {
    const message = \`\${bootstrapPrefix}: \${getErrorMessage(error)}\`;
    self.postMessage(toFatalResponse(event.data, message));
  });
});
`;
}
export function createControlWorkerBootstrapUrl(moduleUrl) {
    if (typeof Blob === 'undefined') {
        throw new Error('[soundtrace.js] control worker bootstrap requires Blob');
    }
    if (typeof URL.createObjectURL !== 'function') {
        throw new Error('[soundtrace.js] control worker bootstrap requires URL.createObjectURL');
    }
    return URL.createObjectURL(new Blob([createControlWorkerBootstrapSource(moduleUrl)], { type: 'text/javascript' }));
}
export function releaseControlWorkerBootstrapUrl(url) {
    if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
    }
}
//# sourceMappingURL=control-worker-bootstrap.js.map