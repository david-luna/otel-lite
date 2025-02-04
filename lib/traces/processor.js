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

// OTEL JS SDK defines more that one type of processor: `SimpleSpanProcessor` and `BatchSpanProcessor`
// In order to keep things small we will have a processor similar to `BatchSpanProcessor`
// because `BatchSpanProcessor` can be tuned via env vars to behave like a `SimpleSpanProcessor`

import {diag} from '@opentelemetry/api';

import {channels, publish, subscribe} from '../channels.js';
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
 * @param {import('./span.js').Span} span 
 */
function handleSpan(span) {
  // Queue size is the size of the batches + the current buffer
  let queueSize = buffer.length;
  for (const b of batches.values()) {
    queueSize += b.length;
  }

  if (queueSize > MAX_QUEUE_SIZE) {
    diag.warn(`Max queue size (${MAX_QUEUE_SIZE}) exceeded. Dropping Span`);
    return;
  }

  // Reset any scheduled task and add the new Span
  clearTimeout(timer);
  diag.info(`Pushing Span ${span}`,MAX_EXPORT_BATCH_SIZE);
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
  diag.info(`Creating batch with length ${batch.length}`);
  if (batch.length) {
    const id = batchId++;
    batches.set(id, batch)
    publish(channels.BatchReady, {id, batch})
  }
}

/**
 * @param {Object} params
 * @param {number} params.id
 */
function clearBatch({id}) {
  if (batches.has(id)) {
    batches.delete(id);
  }
}

export async function startProcessor() {
  subscribe(channels.SpanEnded, handleSpan);
  subscribe(channels.BatchExported, clearBatch);
}
