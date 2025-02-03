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

import { context } from '@opentelemetry/api';
import { channels, publish } from '../channels.js';

import {Span} from './span.js';

/**
 * @param {import('./span.js').Scope} scope
 * @returns {any}
 */
function spanFactory(scope) {
  /**
   * we want to cover the following signatures
   * startSpan(name, options, context)
   * startActiveSpan(name, fn)
   * startActiveSpan(name, options, fn)
   * startActiveSpan(name, options, context, fn)
   */
  return function startSpan() {
    const args = [].slice.call(arguments);
    const len = args.length;
    // name is always the 1st arg
    const name = args[0];
    // options are defined if there are more than 2 args
    const options = len > 2 ? args[1] : {};
    // context is the 3rd param if is not a function, otherwise the active context
    const ctx = args[2] && typeof args[2] !== 'function' ? args[2] : context.active();
    // callback function is the last param if defined
    const fn = typeof args[len - 1] === 'function' ? args[len - 1] : null;

    const span = new Span({
      scope,
      context: ctx,
      name,
      kind: options.kind,
      attributes: options.attributes,
      links: options.links,
      startTime: options.startTime,
      root: options.root,
    });

    const endFn = span.end;
    span.end = function() {
      endFn.apply(this, arguments);
      publish(channels.SpanEnded, span);
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
 * @param {import('@opentelemetry/api').TracerOptions} [options]
 * @returns {import('@opentelemetry/api').Tracer}
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

/** @type {import('@opentelemetry/api').TracerProvider} */
export const tracerProvider = {
  getTracer,
}