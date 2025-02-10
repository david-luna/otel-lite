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

import {context, diag, DiagConsoleLogger, trace} from '@opentelemetry/api';

import {ContextManager} from './context/manager.js';
import {loadInstrumentations} from './instrumentations/loader.js';
import {startExporter} from './traces/exporter.js';
import {startProcessor} from './traces/processor.js'
import {tracerProvider} from './traces/provider.js';
import {getEnvVar} from './environment/environment.js';

// Set the logger
diag.setLogger(
    new DiagConsoleLogger(),
    { logLevel: getEnvVar('OTEL_LOG_LEVEL')}
);

// Set context manager
context.setGlobalContextManager(ContextManager);

// Set instrumentations
await loadInstrumentations(tracerProvider);

// TODO: Set resource (detectors)

// Set providers for other consumers (like app devs)
// - Traces
trace.setGlobalTracerProvider(tracerProvider);
// - Metrics
// - Logs

// -- Start
// processors
await startProcessor();
// exporters
await startExporter();
// TODO: - make sure to flush the data when SIGKILL
