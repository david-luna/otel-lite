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

import {readFileSync} from 'fs';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';

import {diag} from '@opentelemetry/api';

import {toServiceRequest} from './transform.js';
import {channels, publish, subscribe} from '../channels.js';
import {getEnvVar} from '../environment/environment.js';

const OTLP_TRACES_ENDPOINT = getEnvVar(
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_ENDPOINT'
);
const OTLP_TRACES_HEADERS = getEnvVar('OTEL_EXPORTER_OTLP_TRACES_HEADERS');
const OTLP_HEADERS = getEnvVar('OTEL_EXPORTER_OTLP_HEADERS');
const OTLP_TRACES_INSECURE = getEnvVar(
  'OTEL_EXPORTER_OTLP_TRACES_INSECURE',
  'OTEL_EXPORTER_OTLP_INSECURE'
);
const OTLP_TRACES_COMPRESSION = getEnvVar(
  'OTEL_EXPORTER_OTLP_TRACES_COMPRESSION',
  'OTEL_EXPORTER_OTLP_COMPRESSION'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.TraceService} TraceService
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.TraceService.ExportCallback} ExportCallback
 */
/** @type {import('@grpc/grpc-js')} */
let grpc;
/** @type {import('@grpc/proto-loader')} */
let loader;
/** @type {TraceService} */
let client;
/** @type {import('@grpc/grpc-js').Metadata} */
let metadata;

export async function startExporter() {
  // Dynamic import to not mess up with grpc instrumentation
  grpc = await import('@grpc/grpc-js');
  loader = await import('@grpc/proto-loader');
  metadata = new grpc.Metadata();

  const headers = {...OTLP_HEADERS, ...OTLP_TRACES_HEADERS};
  for (const [k, v] of Object.entries(headers)) {
    metadata.add(k, v);
  }

  const protosFolder = resolve(__dirname, '..');
  const protosFile = 'opentelemetry/proto/collector/trace/v1/trace_service.proto';
  const protosPath = `${protosFolder}/${protosFile}`;
  const pkgDefinition = loader.loadSync(protosPath, {
    includeDirs: [protosFolder],
    // TODO: recommende in grpc.io but gives issues
    // keepCase: true,
    // longs: String,
    // enums: String,
    // defaults: true,
    // oneofs: true
  })
  const root = grpc.loadPackageDefinition(pkgDefinition);

  // @ts-ignore -- ??
  const Service = root.opentelemetry.proto.collector.trace.v1.TraceService;
  client = new Service(
    OTLP_TRACES_ENDPOINT,
    resolveCredentials(),
    // https://github.com/open-telemetry/opentelemetry-js/blob/b9d5aeeb22de4a430326db7e6dbaf38c1c292a12/experimental/packages/otlp-grpc-exporter-base/src/grpc-exporter-transport.ts#L30
    {
      'grpc.default_compression_algorithm':
        OTLP_TRACES_COMPRESSION === 'gzip' ? 2 : 0,
    }
  );

  subscribe(channels.BatchReady, handleBatch);
}

/**
 * @returns {import('@grpc/grpc-js').ChannelCredentials}
 */
function resolveCredentials() {
  if (OTLP_TRACES_INSECURE) {
    return grpc.credentials.createInsecure();
  }

  const rootCertPath = getEnvVar(
    'OTEL_EXPORTER_OTLP_TRACES_CERTIFICATE',
    'OTEL_EXPORTER_OTLP_CERTIFICATE'
  );
  const rootCert = readFile(rootCertPath);
  if (!rootCert) {
    diag.warn('No root certificated provided. Using insecure credentials.');
    return grpc.credentials.createInsecure();
  }

  const clientCertPath = getEnvVar(
    'OTEL_EXPORTER_OTLP_TRACES_CLIENT_CERTIFICATE',
    'OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE'
  );
  const clientCert = readFile(clientCertPath);
  const clientKeyPath = getEnvVar(
    'OTEL_EXPORTER_OTLP_TRACES_CLIENT_KEY',
    'OTEL_EXPORTER_OTLP_CLIENT_KEY'
  );
  const clientKey = readFile(clientKeyPath);

  try {
    if (clientCert && clientKey) {
      return grpc.credentials.createSsl(rootCert, clientKey, clientCert);
    } else {
      diag.warn(
        'Client key and certificate must both be provided, but one was missing - attempting to create credentials from just the root certificate'
      );
      return grpc.credentials.createSsl(rootCert);
    }
  } catch {
    diag.warn(
      'Error creating ssl credentials. Using insecure credentials instead.'
    );
    return grpc.credentials.createInsecure();
  }
}

/**
 * @param {string} path
 * @returns {Buffer | undefined}
 */
function readFile(path) {
  const filePath = path.trim();
  if (!filePath) {
    return undefined;
  }
  try {
    return readFileSync(resolve(process.cwd(), filePath));
  } catch {
    return undefined;
  }
}

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
  const {id, batch} = record;
  const payload = toServiceRequest(batch);

  // TODO: how to check that metadata has arrived to server???
  // @ts-ignore -- TraceService has not all the call signatures in its type
  client.export(payload, metadata, callbackForBatch(id));
}
