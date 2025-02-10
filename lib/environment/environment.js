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

import { DiagLogLevel } from '@opentelemetry/api';
import { parseBaggage, parseBoolean, parseCompression, parseLogLevel, parseNumber, parseString, parseStringList } from './parsers.js';

// Define env vars here
const envParsers = {
  OTEL_NODE_ENABLED_INSTRUMENTATIONS: (v) => parseStringList(v, []),
  OTEL_NODE_DISABLED_INSTRUMENTATIONS: (v) => parseStringList(v, []),
  OTEL_LOG_LEVEL: (v) => parseLogLevel(v, DiagLogLevel.INFO),
  // Batch Span processor
  OTEL_BSP_SCHEDULE_DELAY: (v) => parseNumber(v, true, 5000),
  OTEL_BSP_EXPORT_TIMEOUT: (v) => parseNumber(v, true, 30000),
  OTEL_BSP_MAX_QUEUE_SIZE: (v) => parseNumber(v, true, 2048),
  OTEL_BSP_MAX_EXPORT_BATCH_SIZE: (v) => parseNumber(v, true, 512),
  // Exporter
  // default to grpc host:port since is the only protocol supported
  OTEL_EXPORTER_OTLP_ENDPOINT: (v) => parseString(v, 'localhost:4317'),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: (v) => parseString(v, 'localhost:4317'),
  OTEL_EXPORTER_OTLP_INSECURE: parseBoolean,
  OTEL_EXPORTER_OTLP_TRACES_INSECURE: parseBoolean,
  OTEL_EXPORTER_OTLP_HEADERS: parseBaggage,
  OTEL_EXPORTER_OTLP_TRACES_HEADERS: parseBaggage,
  OTEL_EXPORTER_OTLP_COMPRESSION: parseCompression,
  OTEL_EXPORTER_OTLP_TRACES_COMPRESSION: parseCompression,
  OTEL_EXPORTER_OTLP_CERTIFICATE: (v) => parseString(v, ''),
  OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE: (v) => parseString(v, ''),
  OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE: (v) => parseString(v, ''),
  OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE: (v) => parseString(v, ''),
  OTEL_EXPORTER_OTLP_CLIENT_KEY: (v) => parseString(v, ''),
  OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY: (v) => parseString(v, ''),
  // Limits
  OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT: (v) => parseNumber(v, true, Infinity),
  OTEL_ATTRIBUTE_COUNT_LIMIT: (v) => parseNumber(v, true, 128),
  OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT: (v) => parseNumber(v, true, Infinity),
  OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT: (v) => parseNumber(v, true, 128),
  OTEL_SPAN_EVENT_COUNT_LIMIT: (v) => parseNumber(v, true, 128),
  OTEL_EVENT_ATTRIBUTE_COUNT_LIMIT: (v) => parseNumber(v, true, 128),
  OTEL_SPAN_LINK_COUNT_LIMIT: (v) => parseNumber(v, true, 128),
  OTEL_LINK_ATTRIBUTE_COUNT_LIMIT: (v) => parseNumber(v, true, 128),
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
function getVar(name) {
  if (name in envParsers) {
    const parser = envParsers[name];

    // @ts-ignore -- ???
    return parser(envSnapshot[name]);
  }

  return undefined;
}

/**
 * @template {EnvParsersKey} T
 * @param {T} preferred
 * @param {T} [fallback]
 * @returns {ReturnType<EnvParsers[T]>}
 */
export function getEnvVar(preferred, fallback) {
  if (preferred in envSnapshot || !fallback) {
    return getVar(preferred);
  }

  return getVar(fallback);
}
