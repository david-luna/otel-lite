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
 * @typedef {import('../traces/provider.js').TracerProvider} TracerProvider 
 */
/**
 * @typedef {Object} Instrumentation
 * @property {(provider: TracerProvider) => void} setTracerProvider
 */

import {InstrumentationBase} from '@opentelemetry/instrumentation';
import {getEnvVar} from '../environment/environment.js';

// This map contains @opentelemetry/instrumetation-* names and the class
// name of the instrumentation
// /** @type {Map<string, string>} */
// const instrMap = new Map([
//   ['http', 'HttpInstrumentation']
// ]);
const instances = [];

/**
 * Tries to load a package by name:
 * - if it does to have scope
 *   * 1st tries to import @opentelemetry/instrumentation{name}
 *   * if not present tries to import by name directly
 * - is it has a scope it tries to import directly
 * @param {string} name 
 */
async function loadPackage(name) {
  if (name.startsWith('@')) {
    try {
      return await import(name);
    } catch (err) {
      console.log(`instrumentation "${name}" not found`);
    }
    return undefined;
  }

  try {
    return await import(`@opentelemetry/instrumentation-${name}`);
  } catch (err) {
    console.log(`instrumentation "@opentelemetry/instrumentation-${name}" not found`);
  }

  try {
    return await import(name);
  } catch (err) {
    console.log(`instrumentation "@opentelemetry/instrumentation-${name}" not found`);
  }
}

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
    const exports = await loadPackage(instr);

    // load as many as possible but leave a message
    if (typeof exports === 'undefined') {
      console.error(`Instrumentation package for ${instr} could not be loaded. Check if its installed.`);
      continue;
    }

    // Now try to identify the instrumentation class. We do only accept classes that
    // extend from `InstrumentationBase` (made using OTEL official SDK)
    let instrCtor;
    for (const prop of Object.keys(exports)) {
      const candidate = exports[prop];
      
      if (typeof candidate.prototype === 'undefined') {
        continue;
      }
      
      // This does not work if the instrumentation imported has a different version of
      // @opentelemetry/instrumentation in its dependencies. So we need a failsafe
      if (candidate.prototype instanceof InstrumentationBase) {
        instrCtor = candidate;
        break;
      }

      // Fail safe would be to check for specific properties in the object's proto
      // TODO: check for other prop types???
      if (typeof candidate.prototype.init === 'function') {
        instrCtor = candidate;
        break;
      }
    }

    // And initiaize it if present
    if (instrCtor) {
      /** @type {Instrumentation} */
      const instance = new instrCtor();
      
      // Set the providers for each signal
      instance.setTracerProvider(tracerProvider);
      instances.push(instance);
    }
  }
}
