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

import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

import {diag} from '@opentelemetry/api';

import {toServiceRequest} from './transform.js';
import {channels, publish, subscribe} from '../channels.js';
import {getEnvVar} from '../environment/environment.js';

const OTLP_TRACES_ENDPOINT = getEnvVar('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', 'OTEL_EXPORTER_OTLP_ENDPOINT');
const OTLP_INSECURE = getEnvVar('OTEL_EXPORTER_OTLP_TRACES_INSECURE', 'OTEL_EXPORTER_OTLP_INSECURE');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)
const protosFoler = resolve(__dirname, '..');
const protosFile = 'opentelemetry/proto/collector/trace/v1/trace_service.proto';

/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.TraceService} TraceService
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.TraceService.ExportCallback} ExportCallback
 */
/** @type {TraceService} */
let client;

/** @type {ExportCallback} */
function exportCallback(err, response) {
  if (err) {
    diag.info('export error', err);
  }
  diag.info('export response', response);
}

/**
 * @param {Object} record
 * @param {number} record.id
 * @param {import('./span.js').Span[]} record.batch
 */
function handleBatch(record) {
  const { id, batch } = record;

  const payload = toServiceRequest(batch);
  client.export(payload, exportCallback);
  publish(channels.BatchExported, {id});
}

export async function startExporter() {
  const grpc = await import('@grpc/grpc-js');
  const loader = await import('@grpc/proto-loader');
  const def = grpc.loadPackageDefinition(
    loader.loadSync(
      `${protosFoler}/${protosFile}`,
      { includeDirs: [protosFoler] }
    )
  );

  // @ts-ignore -- ??
  const Service = def.opentelemetry.proto.collector.trace.v1.TraceService;
  client = new Service(
    OTLP_TRACES_ENDPOINT,
    // TODO: set this based on ENV
    grpc.credentials.createInsecure(),
  );
  
  subscribe(channels.BatchReady, handleBatch);
}

