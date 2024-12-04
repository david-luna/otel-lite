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
 * @typedef {import('@opentelemetry/api').TracerProvider} TracerProvider
 */
/**
 * @typedef {import('@opentelemetry/api').TracerOptions} TracerOptions
 */
/**
 * @typedef {import('@opentelemetry/api').Tracer} Tracer
 */

import {EventEmitter} from 'events'
import {Span} from './span.js';

// Other modules can handle 
export const SpanEvents = {
  spanEnded: 'spanEnded',
};
export const spanBus = new EventEmitter();

/**
 * Makes the passed span to emit `spanEnded` event whwn `end``
 * method is called
 * @param {Span} span 
 * @returns {Span}
 */
function withEvents(span) {
  const endFn = span.end;
  span.end = function(time) {
    endFn.apply(this, arguments);
    spanBus.emit(SpanEvents.spanEnded, span);
  };
  return span;
}

/**
 * 
 * @param {string} name
 * @param {string} [version]
 * @param {TracerOptions} [options]
 * @returns {Tracer}
 */
function getTracer(name, version, options) {
  // TODO: tracer info should go into span info
  const scope = { name, version };
  if (options?.schemaUrl) {
    scope.schemaUrl = options.schemaUrl;
  }

  return {
    startSpan(name, options, context) {
      return withEvents(new Span({
        scope,
        context,
        name,
        kind: options.kind,
        attributes: options.attributes,
        links: options.links,
        startTime: options.startTime,
        root: options.root,
      }));
    },
    startActiveSpan(name, options, context, fn) {
      const span = withEvents(new Span({
        scope,
        context,
        name,
        kind: options.kind,
        attributes: options.attributes,
        links: options.links,
        startTime: options.startTime,
        root: options.root,
      }));

      return fn(span);
    }
  };
}

/** @type {TracerProvider} */
export const tracerProvider = {
  getTracer,
}