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
 * @typedef {import('@opentelemetry/api').Context} Context
 */
/**
 * @typedef {import('@opentelemetry/api').SpanContext} SpanContext
 */
/**
 * @typedef {import('@opentelemetry/api').Attributes} Attributes
 */
/**
 * @typedef {import('@opentelemetry/api').AttributeValue} AttributeValue
 */
/**
 * @typedef {import('@opentelemetry/api').TimeInput} TimeInput
 */
/**
 * @typedef {import('@opentelemetry/api').Link} Link
 */
/**
 * @typedef {import('@opentelemetry/api').SpanStatus} SpanStatus
 */
/**
 * @typedef {import('@opentelemetry/api').SpanKind} SpanKind
 */
/**
 * @typedef {import('@opentelemetry/api').Exception} Exception
 */

import { trace, TraceFlags } from '@opentelemetry/api';
import {randomBytes} from 'node:crypto';

/**
 * NOTE:
 * - trace ID is composed of 32 lowercase hex characters.
 * - span ID is composed of 16 lowercase hex characters.
 * @param {number} length 
 * @returns {string}
 */
function getRandHex(length) {
  return randomBytes(length).toString('hex');
}

/**
 * @param {any} input 
 * @returns {input is TimeInput}
 */
function isTimeInput(input) {
  if (
    typeof input === 'number' ||
    input instanceof Date ||
    (Array.isArray(input) && input.length === 2)
  ) {
    return true;
  }
  return false;
}

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   schemaUrl?: string;
 * }} Scope
 */

/**
 * @typedef {{
*   name: string;
*   time: TimeInput
*   attributes?: Attributes;
* }} SpanEvent
*/

export class Span {
  /** @type {Scope} */
  _scope;
  /** @type {Context} */
  _contex;
  /** @type {SpanContext} */
  _spanContex;
  /** @type {string} */
  _parentSpanId;
  /** @type {SpanKind} */
  _spanKind;
  /** @type {string} */
  _name;
  /** @type {TimeInput} */
  _startTime;
  /** @type {TimeInput} */
  _endTime;
  /** @type {Attributes} */
  _attributes;
  /** @type {Link[]} */
  _links;
  /** @type {SpanStatus} */
  _status = { code: 0 };
  /** @type {SpanEvent[]} */
  _events = [];
  /** @type {{exception: Exception, time: TimeInput}} */
  _exception;

  /**
   * @param {{
   *   scope:Scope;
   *   context: Context;
   *   prentSpanId?: string;
   *   name: string;
   *   kind?: SpanKind;
   *   attributes?: Attributes;
   *   links: Link[];
   *   startTime: TimeInput;
   *   root: boolean;
   * }} options 
   */
  constructor(options) {
    // TODO: is it really required?
    this._scope = options.scope;
    this._contex = options.context;
    this._parentSpanId = options.prentSpanId;
    this._name = options.name;
    this._spanKind = options.kind ?? 0;
    this._attributes = options.attributes ?? {};
    this._links = options.links ?? [];
    this._startTime = options.startTime ?? Date.now();

    if (options.root) trace.deleteSpan(options.context);
    const parent = trace.getSpan(options.context);
    const parentCtx = parent?.spanContext();
    const isParentCtxValid = parentCtx && trace.isSpanContextValid(parentCtx);

    const spanId = getRandHex(16);
    const traceId = isParentCtxValid ? parentCtx.traceId : getRandHex(32);
    // TODO: set a sampler here
    const traceFlags = isParentCtxValid ? parentCtx.traceFlags : TraceFlags.SAMPLED;
    const traceState = isParentCtxValid ? parentCtx.traceState : undefined;
    
    this._spanContex = {
      traceId,
      spanId,
      traceFlags, 
      traceState,
    };
  }

  /**
   * @returns {SpanContext}
   */
  spanContext() {
    return { ...this._spanContex };
  }

  /**
   * @param {string} name 
   * @param {AttributeValue} val 
   * @returns {Span}
   */
  setAttribute(name, val) {
    // TODO: limits (attrib num and value size)
    this._attributes[name] = val;
    return this;
  }

  /**
   * @param {Attributes} attribs
   * @returns {Span}
   */
  setAttributes(attribs) {
    for (const [k, v] of Object.entries(attribs)) {
      this.setAttribute(k, v);
    }
    return this;
  }

  /**
   * @param {string} name
   * @param {Attributes | TimeInput} [attribsOrStart]
   * @param {TimeInput} [start]
   * @returns {Span}
   */
  addEvent(name, attribsOrStart, start) {
    // TODO: add event count limit
    /** @type {TimeInput} */
    let time;

    if (isTimeInput(attribsOrStart)) {
      time = attribsOrStart;
    } else if (isTimeInput(start)) {
      time = start;
    } else {
      // TODO: add diff between creation of span and perf.now()
      time = Date.now();
    }

    /** @type {SpanEvent} */
    const event = { name, time };

    if (attribsOrStart && !isTimeInput(attribsOrStart)) {
      event.attributes = attribsOrStart;
    }

    this._events.push(event)
    return this;
  }

  /**
   * @param {Link} link
   * @returns {Span}
   */
  addLink(link) {
    this._links.push(link);
    return this;
  }

  /**
   * @param {Link[]} links
   * @returns {Span}
   */
  addLinks(links) {
    if (Array.isArray(links)) {
      for (const l of links) {
        this.addLink(l);
      }
    }
    return this;
  }

  /**
   * @param {SpanStatus} status
   * @returns {Span}
   */
  setStatus(status) {
    this._status = status;
    return this;
  }

  /**
   * @param {string} name
   * @returns {Span}
   */
  updateName(name) {
    this._name = name;
    return this;
  }

  /**
   * @param {TimeInput} time
   */
  end(time) {
    // TODO: use perf time origin to calculate that
    this._endTime = time || Date.now();
  }

  /**
   * @returns {boolean}
   */
  isRecording() {
    return true;
  }

  /**
   * 
   * @param {Exception} exception
   * @param {TimeInput} [time]
   */
  recordException(exception, time) {
    this._exception = { exception, time };
  };
}
