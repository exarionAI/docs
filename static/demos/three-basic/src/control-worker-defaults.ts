import {
  getCaughtMessage,
  normalizeCaughtUnknown,
} from './control-worker-error-utils.js';
import type {
  CreateModule,
  LoadScript,
  PostMessage,
  ScheduleFrameWork,
} from './control-worker-host-types.js';
import type { ExaSoundFactory } from './types.js';

declare global {
  // eslint-disable-next-line no-var
  var ExaSoundModule: ExaSoundFactory | undefined;
}

export function createDefaultPostResponse(): PostMessage {
  return (response) => {
    if (typeof postMessage === 'function') {
      postMessage(response);
    }
  };
}

export const defaultLoadScript: LoadScript = async (url) => {
  if (typeof importScripts !== 'function') {
    throw new Error('[soundtrace.js] worker bootstrap requires importScripts');
  }
  try {
    importScripts(url);
  } catch (error) {
    throw new Error(
      `[soundtrace.js] failed to load worker glue: ${url}: ${getCaughtMessage(normalizeCaughtUnknown(error))}`,
    );
  }
};

export const defaultCreateModule: CreateModule = async (glueUrl, moduleArg) => {
  const factory = globalThis.ExaSoundModule;
  if (!factory) {
    throw new Error(`[soundtrace.js] ExaSoundModule missing after loading ${glueUrl}`);
  }
  return factory(moduleArg);
};

export const defaultFrameScheduler: ScheduleFrameWork = (work) => {
  setTimeout(work, 0);
};
