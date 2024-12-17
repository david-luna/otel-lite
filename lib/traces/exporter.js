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

// import {getEnvVar} from '../environment/environment.js';
import {AgentEvents, EventBus} from '../events.js';
import {getProtoRoot} from './proto.js'
// const EXPORT_TIMEOUT = getEnvVar('OTEL_BSP_EXPORT_TIMEOUT'); // maybe not needed

// root of our types
const root = getProtoRoot();
const SpanProto = root.lookupType('opentelemetry.proto.trace.v1.Span');

/**
 * @param {Object} record
 * @param {number} record.id
 * @param {import('./span.js').Span[]} record.batch
 */
function handleBatch(record) {
  const { id, batch } = record;

  batch.forEach((span) => {
    const err = SpanProto.verify(span);
    console.log('span verification message', err);
  });

  EventBus.emit(AgentEvents.BatchExported, {id})
}

export function startExporter() {
  EventBus.on(AgentEvents.BatchReady, handleBatch);
}

