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

import {AgentEvents, EventBus} from '../events.js';
import {getEnvVar} from '../environment/environment.js';

const SCHEDULE_DELAY = getEnvVar('OTEL_BSP_SCHEDULE_DELAY');
const MAX_QUEUE_SIZE = getEnvVar('OTEL_BSP_MAX_QUEUE_SIZE');
const MAX_EXPORT_BATCH_SIZE = getEnvVar('OTEL_BSP_MAX_EXPORT_BATCH_SIZE');

/** @type {Map<number, any[]>} */
const batches = new Map();
const buffer = [];
let batchId = 0;
let timer;

/**
 * @param {import('@opentelemetry/api').Span} span 
 */
function handleSpan(span) {
  // Queue size is the size of the batches + the current buffer
  let queueSize = buffer.length;
  for (const b of batches.values()) {
    queueSize += b.length;
  }

  if (queueSize > MAX_QUEUE_SIZE) {
    console.log(`Max queue size (${MAX_QUEUE_SIZE}) exceeded. Dropping Span`);
    return;
  }

  // Reset any scheduled task and add the new Span
  clearTimeout(timer);
  buffer.push(span);

  // Create a batch it right away or schedule a task
  if (buffer.length >= MAX_EXPORT_BATCH_SIZE) {
    addBatch();
  } else {
    timer = setTimeout(addBatch, SCHEDULE_DELAY);
    timer.unref();
  }
}

function addBatch() {
  const batch = buffer.splice(0, MAX_EXPORT_BATCH_SIZE);
  if (batch.length) {
    const id = batchId++;
    batches.set(id, batch)
    EventBus.emit(AgentEvents.BatchReady, {id, batch});
  }
}

/**
 * @param {number} id 
 */
function clearBatch(id) {
  if (batches.has(id)) {
    batches.delete(id);
  }
}

export function startProcessor() {
  EventBus.on(AgentEvents.SpanEnded, handleSpan);
  EventBus.on(AgentEvents.BatchExported, clearBatch);
}
