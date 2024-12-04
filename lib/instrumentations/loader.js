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

import { getEnvVar } from '../environment/environment.js';

// This map contains @opentelemetry/instrumetation-* names and the class
// name of the instrumentation
/** @type {Map<string, string>} */
const instrMap = new Map([
  ['http', 'HttpInstrumentation']
]);
const instances = [];

export async function loadInstrumentations() {
  // Get all instrumentations from ENV
  const enabled = new Set(getEnvVar('OTEL_NODE_ENABLED_INSTRUMENTATIONS'));
  const disabled = new Set(getEnvVar('OTEL_NODE_DISABLED_INSTRUMENTATIONS'));

  for (const instr of enabled) {
    if (disabled.has(instr)) {
      continue;
    }
    
    // Get package name and instrumentation class name
    const isMapped = instrMap.has(instr);
    const pkgName = isMapped ? `@opentelemetry/instrumentation-${instr}` : instr;
    const className = isMapped ? instrMap.get(instr) : 'Instrumentation';

    try {
      const pkg = await import(pkgName);
      const ctor = pkg[className];
      const instance = new ctor();
      instances.push(instance);
    } catch (err) {
      console.error(`Instrumentation package ${pkgName} could not be loaded`, err);
    }
  }
}
