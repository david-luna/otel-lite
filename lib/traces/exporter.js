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
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest} IExportTraceServiceRequest
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.trace.v1.ISpan} ISpan
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.trace.v1.IScopeSpans} IScopeSpans
 */
/**
 * @typedef {import('./span.js').Span} Span
 */

// import {getEnvVar} from '../environment/environment.js';
import {AgentEvents, EventBus} from '../events.js';
import { toProtoSpan } from './transform.js';
// const EXPORT_TIMEOUT = getEnvVar('OTEL_BSP_EXPORT_TIMEOUT'); // maybe not needed


/**
 * @param {Object} record
 * @param {number} record.id
 * @param {Span[]} record.batch
 */
function handleBatch(record) {
  const { id, batch } = record;

  /** @type {Map<string, ISpan[]>} */
  const scopesMap = new Map();
  for (const span of batch) {
    const { _scope } = span;
    const key = JSON.stringify(_scope, Object.keys(_scope).sort());
    const list = scopesMap.get(key) || [];
    list.push(toProtoSpan(span));
    scopesMap.set(key, list);
  }

  /** @type {IScopeSpans[]} */
  const scopeSpans = [];
  for (const [scopeStr, spans] of scopesMap.entries()) {
    scopeSpans.push({
      scope: JSON.parse(scopeStr),
      spans,
    });
  }

  // TODO: send data to the collector endpoint
  /** @type {IExportTraceServiceRequest} */
  const reqPayload = {
    // TODO: one item per resource. Should we simplify to one unique resource?
    resourceSpans: [
      { scopeSpans }
    ]
  };

  console.log('export payload')
  console.dir(reqPayload, {depth:9})
  EventBus.emit(AgentEvents.BatchExported, {id})
}

export function startExporter() {
  EventBus.on(AgentEvents.BatchReady, handleBatch);
}

