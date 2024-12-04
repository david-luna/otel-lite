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

import { parseNumber, parseStringList } from './parsers.js';

// Define env vars here
const envParsers = {
  OTEL_NODE_ENABLED_INSTRUMENTATIONS: (v) => parseStringList(v, []),
  OTEL_NODE_DISABLED_INSTRUMENTATIONS: (v) => parseStringList(v, []),
  OTEL_BSP_SCHEDULE_DELAY: (v) => parseNumber(v, true, 5000),
  OTEL_BSP_EXPORT_TIMEOUT: (v) => parseNumber(v, true, 30000),
  OTEL_BSP_MAX_QUEUE_SIZE: (v) => parseNumber(v, true, 2048),
  OTEL_BSP_MAX_EXPORT_BATCH_SIZE: (v) => parseNumber(v, true, 512),
};

/**
 * @typedef {typeof envParsers} EnvParsers
 */
/**
 * @typedef {keyof EnvParsers} EnvParsersKey
 */
/** 
 * @typedef {Record<EnvParsersKey, string | undefined>} Env
 */

// Keep a clone of the env so it's not tampered
/** @type {Env} */
// @ts-ignore -- conflict with NodeJS.ProcessEnv
const envSnapshot = Object.assign({}, process.env);


/**
 * @template {EnvParsersKey} T
 * @param {T} name 
 * @returns {ReturnType<EnvParsers[T]>}
 */
export function getEnvVar(name) {
  if (name in envParsers) {
    const parser = envParsers[name];

    // @ts-ignore -- ???
    return parser(envSnapshot[name]);
  }

  return undefined;
}
