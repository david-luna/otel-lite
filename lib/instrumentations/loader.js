/*
 * Copyright XXX
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @typedef {import('../traces/provider.js').tracerProvider} TracerProvider
 */
/**
 * @typedef {Object} Instrumentation
 * @property {(provider: TracerProvider) => void} setTracerProvider
 */

import {diag} from '@opentelemetry/api';

import {getEnvVar} from '../environment/environment.js';

// Instances of the succesfully loaded instrumentations
// not used for now but may be useful fir dynamc updates:
// - config updates
// - load new instrumentations???
const instances = [];

/**
 * @param {TracerProvider} tracerProvider
 */
export async function loadInstrumentations(tracerProvider) {
  // Get all instrumentations from ENV
  const enabled = new Set(getEnvVar('OTEL_NODE_ENABLED_INSTRUMENTATIONS'));
  const disabled = new Set(getEnvVar('OTEL_NODE_DISABLED_INSTRUMENTATIONS'));

  for (const instr of enabled) {
    if (disabled.has(instr)) {
      continue;
    }

    // Get the exports of the pacakge referred
    const {name, exports} = await loadPackage(instr);

    // load as many as possible but leave a message
    if (typeof exports === 'undefined') {
      console.error(
        `Instrumentation package for ${name} could not be loaded. Check if its installed.`
      );
      continue;
    }

    // Now try to identify the instrumentation class. We do only accept classes that
    // extend from `InstrumentationBase` (made using OTEL official SDK)
    let instrCtor;
    for (const prop of Object.keys(exports)) {
      const candidate = exports[prop];
      const candidateProto = candidate.prototype;

      if (typeof candidateProto === 'undefined') {
        continue;
      }

      // Duck typing, if it talks and walks like an instrumentation then is an
      // instrumentation
      const instrApi = [
        'init',
        'setMeterProvider',
        'setLoggerProvider',
        'setTracerProvider',
      ];
      if (instrApi.every((k) => typeof candidateProto[k] === 'function')) {
        instrCtor = candidate;
        break;
      }
    }

    // And initiaize if present
    if (instrCtor) {
      /** @type {Instrumentation} */
      const instance = new instrCtor();

      // Set the providers for each signal
      instance.setTracerProvider(tracerProvider);
      instances.push(instance);
    } else {
      console.error(`Couldn't find an instrumentation in package ${name}`);
    }
  }
}

/**
 * Tries to load a package by name:
 * - if it does to have scope
 *   * 1st tries to import @opentelemetry/instrumentation{name}
 *   * if not present tries to import by name directly
 * - is it has a scope it tries to import directly
 * @param {string} name
 * @returns {Promise<{name: string; exports: Record<string, any>}>}
 */
async function loadPackage(name) {
  let exports;
  if (name.startsWith('@')) {
    try {
      exports = await import(name);
      return {name, exports};
    } catch {
      diag.info(`instrumentation "${name}" not found`);
    }
    return undefined;
  }

  try {
    exports = await import(`@opentelemetry/instrumentation-${name}`);
    return {name: `@opentelemetry/instrumentation-${name}`, exports};
  } catch {
    diag.info(
      `instrumentation "@opentelemetry/instrumentation-${name}" not found`
    );
  }

  try {
    exports = await import(name);
    return {name, exports};
  } catch {
    diag.info(`instrumentation "${name}" not found`);
  }

  return {name, exports: undefined};
}
