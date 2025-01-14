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

import {EventEmitter} from 'events'

export const AgentEvents = {
  // Span events
  SpanEnded: 'SpanEnded',
  // Processor events
  BatchReady: 'BatchReady',
  // Exporter events
  BatchExported: 'BatchExported',
};
export const EventBus = new EventEmitter();

// for debug purposes
for (const evtName of Object.values(AgentEvents)) {
  console.log('attach logger to event', evtName)
  EventBus.on(evtName, function (data) {
    console.log(`event "${evtName}"`)
    console.dir(data, {depth:9})
  });
}
