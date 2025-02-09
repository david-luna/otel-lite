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

import {diag, DiagLogLevel} from "@opentelemetry/api";

/**
 * @param {string | undefined} val
 * @returns {boolean}
 */
export function parseBoolean(val) {
  if (typeof val === 'string' && val.toLowerCase() === 'true') {
    return true;
  }
  if (val) {
    diag.warn(`Unrecognized boolean value "${val}. Fallback to "false".`)
  }
  return false;
}

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

const BAGGAGE_KEY_PAIR_SEPARATOR = '=';
const BAGGAGE_PROPERTIES_SEPARATOR = ';';
const BAGGAGE_ITEMS_SEPARATOR = ',';
/**
 * @param {string | undefined} val
 * @returns {Record<string, string>}
 */
export function parseBaggage(val) {
  /** @type {Record<string, string>} */
  const result = {};

  if (typeof val === 'string') {
    const items = val.split(BAGGAGE_ITEMS_SEPARATOR);
    for (const it of items) {
      const kv = it.split(BAGGAGE_PROPERTIES_SEPARATOR).shift();
      const isKV = kv.includes(BAGGAGE_KEY_PAIR_SEPARATOR);

      if (isKV) {
        const [k, v] = kv.split(BAGGAGE_KEY_PAIR_SEPARATOR);
        result[decodeURIComponent(k.trim())] = decodeURIComponent(v.trim());
      }
    }
  }

  return result;
}

/**
 * @param {string | undefined} val
 * @returns {'gzip' | ''}
 */
export function parseCompression(val) {
  return `${val}`.toLowerCase() === 'gzip' ? 'gzip' : '';
}
