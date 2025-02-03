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

import { DiagLogLevel } from "@opentelemetry/api";

/**
 * @param {string | undefined} val
 * @param {string} def
 * @returns {string}
 */
export function parseString(val, def) {
  if (typeof val !== 'string') {
    return def;
  }
  return val;
}

/**
 * @param {string | undefined} val
 * @param {string[]} def
 * @returns {string[]} An array with non empty strings
 */
export function parseStringList(val, def) {
  if (!val) {
    return def;
  }
  const set = new Set(
    val.split(',')
    .map(v => v.trim())
  );
  set.delete(''); // make sure there is no empty string

  return Array.from(set)
}

/**
 * @param {string | undefined} val
 * @param {boolean} positive
 * @param {number} def
 * @returns {number}
 */
export function parseNumber(val, positive, def) {
  if (typeof val === 'undefined' || val.trim() === '') {
    return def;
  }

  const num = Number(val);
  return isNaN(num) || (positive && num < 0) ? def : num; 
}

/**
 * @param {string} level
 * @param {import('@opentelemetry/api').DiagLogLevel} def
 * @returns {import('@opentelemetry/api').DiagLogLevel}
 */
export function parseLogLevel(level, def) {
  if (typeof level !== 'string') {
    return def;
  }

  switch (level.toUpperCase()) {
    case 'NONE':
      return DiagLogLevel.NONE;
    case 'ERROR':
      return DiagLogLevel.ERROR;
    case 'WARN':
      return DiagLogLevel.WARN;
    case 'INFO':
      return DiagLogLevel.INFO;
    case 'DEBUG':
      return DiagLogLevel.DEBUG;
    case 'VERBOSE':
      return DiagLogLevel.VERBOSE;
    case 'ALL':
      return DiagLogLevel.ALL;
  }
  return def;
}
