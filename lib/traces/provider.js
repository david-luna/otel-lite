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

import {AgentEvents, EventBus} from '../events.js';
import {Span} from './span.js';

/**
 * @param {import('./span.js').Scope} scope
 * @returns {any}
 */
function spanFactory(scope) {
  return function startSpan(name, options, context, fn) {
    const span = new Span({
      scope,
      context,
      name,
      kind: options.kind,
      attributes: options.attributes,
      links: options.links,
      startTime: options.startTime,
      root: options.root,
    });

    const endFn = span.end;
    span.end = function(time) {
      endFn.apply(this, arguments);
      EventBus.emit(AgentEvents.SpanEnded, span);
    };

    // check if need to pass the span to a callback
    if (typeof fn === 'function') {
      return fn(span);
    }
    return span;
  }
}

/**
 * @param {string} name
 * @param {string} [version]
 * @param {TracerOptions} [options]
 * @returns {Tracer}
 */
function getTracer(name, version, options) {
  const scope = { name, version };
  if (options?.schemaUrl) {
    scope.schemaUrl = options.schemaUrl;
  }

  const startSpanFn = spanFactory(scope);
  return {
    startSpan: startSpanFn,
    startActiveSpan: startSpanFn,
  };
}

/** @type {TracerProvider} */
export const tracerProvider = {
  getTracer,
}