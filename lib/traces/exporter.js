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
const OTLP_TRACES_HEADERS = getEnvVar('OTEL_EXPORTER_OTLP_TRACES_HEADERS', 'OTEL_EXPORTER_OTLP_HEADERS');
const OTLP_TRACES_INSECURE = getEnvVar('OTEL_EXPORTER_OTLP_TRACES_INSECURE', 'OTEL_EXPORTER_OTLP_INSECURE');
const OTLP_TRACES_COMPRESSION = getEnvVar('OTEL_EXPORTER_OTLP_TRACES_COMPRESSION', 'OTEL_EXPORTER_OTLP_COMPRESSION');

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
/** @type {import('@grpc/grpc-js')} */
let grpc;
/** @type {TraceService} */
let client;

/**
 * @param {number} id 
 * @returns {ExportCallback}
 */
function callbackForBatch(id) {
  return function exportCallback(err, response) {
    if (err) {
      diag.info('export error', err);
    }
    diag.info('export response', response);
    publish(channels.BatchExported, {id});
  };
}

/**
 * @param {Object} record
 * @param {number} record.id
 * @param {import('./span.js').Span[]} record.batch
 */
function handleBatch(record) {
  const { id, batch } = record;
  const payload = toServiceRequest(batch);
  
  // TODO: check if we could use a singleton
  const meta = new grpc.Metadata();
  for (const [k, v] of Object.entries(OTLP_TRACES_HEADERS)) {
    meta.add(k, v);
  }

  // TODO: how to check that metadata has arrived to server???
  // @ts-ignore -- TraceService has not all the call signatures in its type
  client.export(payload, meta, callbackForBatch(id));
}


export async function startExporter() {
  grpc = await import('@grpc/grpc-js');
  const loader = await import('@grpc/proto-loader');
  const def = grpc.loadPackageDefinition(
    loader.loadSync(
      `${protosFoler}/${protosFile}`,
      {
        includeDirs: [protosFoler],
        // TODO: recommende in grpc.io but gives issues
        // keepCase: true,
        // longs: String,
        // enums: String,
        // defaults: true,
        // oneofs: true
       },
    )
  );

  // @ts-ignore -- ??
  const Service = def.opentelemetry.proto.collector.trace.v1.TraceService;
  client = new Service(
    OTLP_TRACES_ENDPOINT,
    // TODO: set this based on ENV
    grpc.credentials.createInsecure(),
    // https://github.com/open-telemetry/opentelemetry-js/blob/b9d5aeeb22de4a430326db7e6dbaf38c1c292a12/experimental/packages/otlp-grpc-exporter-base/src/grpc-exporter-transport.ts#L30
    {
      'grpc.default_compression_algorithm': OTLP_TRACES_COMPRESSION === 'gzip' ? 2 : 0,
    }
  );
  
  subscribe(channels.BatchReady, handleBatch);
}

