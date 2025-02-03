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

import * as diagch from 'diagnostics_channel';

import {diag} from '@opentelemetry/api';

/**
 * @typedef {Object} ChannelNames
 * @property {'SpanEnded'} SpanEnded
 * @property {'BatchReady'} BatchReady
 * @property {'BatchExported'} BatchExported
 */

/** @type {ChannelNames} */
export const channels = {
  // Span events
  SpanEnded: 'SpanEnded',
  // Processor events
  BatchReady: 'BatchReady',
  // Exporter events
  BatchExported: 'BatchExported',
};
const ChannelMap = new Map(Object.keys(channels).map((key) => {
  return [key, diagch.channel(key)]
}))

/**
 * @param {keyof ChannelNames} name 
 * @param {(...args: unknown[]) => void} handler 
 */
export function subscribe(name, handler) {
  diag.debug(`Subscription for channel "${name} created."`)
  diagch.subscribe(name, handler);
}
/**
 * @param {keyof ChannelNames} name 
 * @param {any} data 
 */
export function publish(name, data) {
  const channel = ChannelMap.get(name);

  if (channel) {
    diag.debug(`Publishign data for channel "${name}".`, data)
    channel.publish(data)
  } else {
    diag.warn(`No channel defined for "${name}".`)
  }
}

// // for debug purposes
// for (const evtName of Object.values(AgentEvents)) {
//   console.log('attach logger to event', evtName)
//   EventBus.on(evtName, function (data) {
//     console.log(`event "${evtName}"`)
//     console.dir(data, {depth:9})
//   });
// }
