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
import * as Protobuf from 'protobufjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

// map the service proto files
const prefix = resolve(__dirname, '..');
const paths = [
  '/opentelemetry/proto/collector/logs/v1/logs_service.proto',
  '/opentelemetry/proto/collector/metrics/v1/metrics_service.proto',
  '/opentelemetry/proto/collector/trace/v1/trace_service.proto',
];

// Create a new Root so we can patch it
const Root = Protobuf.default.Root;
const root = new Root();

// This function is patched because the Root class does not have any
// referece of which is the root path of the proto files. Instead it
// takes the folder of current file being processed as the root path
// resulting in duplicated subpaths
//
// Ref: https://github.com/protobufjs/protobuf.js/issues/1971
root.resolvePath = function patchResolvePath(filename) {
  let path = Root.prototype.resolvePath.apply(root, arguments);
  if (filename) {
    const folder = resolve(filename, '..');
    path = prefix + path.replace(folder, '');
  }
  return path;
};

// Load the files at once
root.loadSync(paths.map((p) => `${prefix}${p}`));

/**
 * Return `any` for now otherwise we get type errors when using
 * `root.lookupType(...)` in `normalize.js
 * @returns {import('protobufjs').Root}
 */
export function getProtoRoot() {
  return root;
}
