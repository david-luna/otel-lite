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

import {credentials, makeGenericClientConstructor} from '@grpc/grpc-js';
// import {getEnvVar} from '../environment/environment.js';
import {AgentEvents, EventBus} from '../events.js';
import {toServiceRequest} from './transform.js';
import {getProtoRoot} from './proto.js';
// const EXPORT_TIMEOUT = getEnvVar('OTEL_BSP_EXPORT_TIMEOUT'); // maybe not needed

const root = getProtoRoot();
// console.dir(root.toJSON(), {depth:90});
const reqType = 'opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest';
const svrType = 'opentelemetry.proto.collector.trace.v1.TraceService';
const Encoder = root.lookupType(reqType);
/** @type {TraceService} */
const Service = root.lookupType(svrType);
// https://github.com/protobufjs/protobuf.js/?tab=readme-ov-file#using-services
const Client = makeGenericClientConstructor({}, 'traces');
const client = new Client(
  // TODO: get grpcServerUrl from ENV,
  'http://localhost:8080',
  credentials.createInsecure()
);
const rpcImpl = function(method, requestData, callback) {
  client.makeUnaryRequest(
    method.name,
    arg => arg,
    arg => arg,
    requestData,
    callback
  );
};
const TraceService = new Service(rpcImpl);

/**
 * 
 * @param {Error|null} err 
 * @param {ExportTraceServiceResponse} response 
 */
function exportCallback (err, response) {}

/**
 * @param {Object} record
 * @param {number} record.id
 * @param {Span[]} record.batch
 */
function handleBatch(record) {
  const { id, batch } = record;

  // TODO: add all transformation to transform.js
  const payload = Encoder.encode(toServiceRequest(batch));

  console.log('export payload')
  console.dir(payload, {depth:9})

  Service.export(payload, exportCallback);
  // TODO: send request via 
  EventBus.emit(AgentEvents.BatchExported, {id})
}

export function startExporter() {
  EventBus.on(AgentEvents.BatchReady, handleBatch);
}

