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

// Register ESM hook and start
// This is called for `--import otel-light`.

import module from 'node:module';
import {isMainThread} from 'node:worker_threads';

if (isMainThread) {
  if (typeof module.register === 'function') {
    module.register('./hook.mjs', import.meta.url);
  }

  await import('./lib/index.js');
}
