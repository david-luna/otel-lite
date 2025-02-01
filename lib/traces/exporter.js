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
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.TraceService} TraceService
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} ExportTraceServiceResponse
 */
/**
 * @typedef {import('./span.js').Span} Span
 */

import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
import * as protoLoader from '@grpc/proto-loader'
import * as grpc from '@grpc/grpc-js';
import { diag } from '@opentelemetry/api';
import {AgentEvents, EventBus} from '../events.js';
import {toServiceRequest} from './transform.js';
// import {getEnvVar} from '../environment/environment.js';

// const EXPORT_TIMEOUT = getEnvVar('OTEL_BSP_EXPORT_TIMEOUT'); // maybe not needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

// map the service proto files
const protosFoler = resolve(__dirname, '..');
const protosFile = 'opentelemetry/proto/collector/trace/v1/trace_service.proto';
const tracesDef = grpc.loadPackageDefinition(
  protoLoader.loadSync(
    `${protosFoler}/${protosFile}`,
    { includeDirs: [protosFoler] }
  )
);
// @ts-ignore -- ??
const Service = tracesDef.opentelemetry.proto.collector.trace.v1.TraceService;
const client = new Service(
  // TODO: check host & port from ENV (OTEL_EXPORTER_OTLP_ENDPOINT & OTEL_EXPORTER_OTLP_TRACES_ENDPOINT)
  'localhost:4317',
  // TODO: set this based on ENV
  grpc.credentials.createInsecure(),
);

/**
 * @param {Error|null} err 
 * @param {ExportTraceServiceResponse} response 
 */
function exportCallback (err, response) {
  if (err) {
    diag.info('export error', err);
  }
  diag.info('export response', response);
}

/**
 * @param {Object} record
 * @param {number} record.id
 * @param {Span[]} record.batch
 */
function handleBatch(record) {
  const { id, batch } = record;

  const payload = toServiceRequest(batch);
  // TODO: check fo retry and other features
  console.dir(payload, {depth:9})
  client.export(payload, exportCallback);
  EventBus.emit(AgentEvents.BatchExported, {id})
}

export function startExporter() {
  EventBus.on(AgentEvents.BatchReady, handleBatch);
}

