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

import { createRequire } from "module";
import { getEnvVar } from '../environment/environment.js';

const require = createRequire(import.meta.url);

/**
 * Tries to require a module and returns it. Undefined if does not exist.
 * @param {string} name 
 * @returns {Object | undefined}
 */
function tryRequire(name) {
  try {
    return require(name)
  } catch (err) {
    console.error(`Error loading module ${name}: ${err}`);
  }
  return undefined;
}


export function setupInstrumentations() {
  // Get all instrumentations from ENV
  const enabled = new Set(getEnvVar('OTEL_NODE_ENABLED_INSTRUMENTATIONS'));
  const disabled = new Set(getEnvVar('OTEL_NODE_DISABLED_INSTRUMENTATIONS'));

  for (const instr of enabled) {
    if (disabled.has(instr)) {
      continue;
    }
    const otelInstr = `@opentelemetry/instrumentation-${instr}`;
    const instrMod = tryRequire(otelInstr) || tryRequire(instr);

    if (!instrMod) {
      console.error(`Instrumentation for option ${instr} not present. Check the name or if installed.`)
      continue;
    }

    // TODO: find which is the instrumentation object and create an instance
  }
}
