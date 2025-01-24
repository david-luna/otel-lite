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
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.trace.v1.ISpan} ISpan
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.common.v1.IKeyValue} IKeyValue
 */

import {randomBytes} from 'node:crypto';
import {trace, TraceFlags} from '@opentelemetry/api';
import {hexToBinary, timeInputToLong, toAnyValue} from './transform.js';

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
  /** @type {Context} */
  _contex;
  /** @type {SpanContext} */
  _spanContex;
  /** @type {Map<string, IKeyValue>} */
  _attribsMap;
  /** @type {ISpan} */
  _span;
  /**
   * @param {{
   *   scope:Scope;
   *   context: Context;
   *   parentSpanId?: string;
   *   name: string;
   *   kind?: SpanKind;
   *   attributes?: Attributes;
   *   links: Link[];
   *   startTime: TimeInput;
   *   root: boolean;
   * }} options 
   */
  constructor(options) {
    if (options.root) trace.deleteSpan(options.context);
    const parent = trace.getSpan(options.context);
    const parentCtx = parent?.spanContext();
    const isParentCtxValid = parentCtx && trace.isSpanContextValid(parentCtx);

    const spanId = getRandHex(16);
    const traceId = isParentCtxValid ? parentCtx.traceId : getRandHex(32);
    // TODO: set a sampler here
    const traceFlags = isParentCtxValid ? parentCtx.traceFlags : TraceFlags.SAMPLED;
    const traceState = isParentCtxValid ? parentCtx.traceState : undefined;

    // Set some properties for the API
    this._scope = options.scope;
    this._contex = options.context;
    this._spanContex = {
      traceId,
      spanId,
      traceFlags, 
      traceState,
    };

    // Set the span with the types defined in protos
    this._span = {};
    this._span.traceId = hexToBinary(traceId);
    this._span.spanId = hexToBinary(spanId);
    this._span.name = options.name;
    // OTEL API SpanKind and proto SpanKind are not aligned (later has one more value)
    this._span.kind = (options.kind ?? 0) + 1;
    this._span.startTimeUnixNano = timeInputToLong(options.startTime ?? Date.now());

    if (traceState) {
      this._span.traceState = traceState.serialize();
    }
  
    if (options.parentSpanId) {
      this._span.parentSpanId = hexToBinary(options.parentSpanId);
    }

    if (options.attributes) {
      this.setAttributes(options.attributes);
    }
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
    if (!this._attribsMap) {
      this._attribsMap = new Map();
      this._span.attributes = [];
    }

    const value = toAnyValue(val);
    let attribute = this._attribsMap.get(name);
    if (!attribute) {
      attribute = { key: name, value };
      this._attribsMap.set(name, attribute);
      this._span.attributes.push(attribute);  
    } else {
      attribute.value = value;
    }
    
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
    let time, attributes;

    if (isTimeInput(attribsOrStart)) {
      time = attribsOrStart;
    } else if (isTimeInput(start)) {
      time = start;
    } else {
      // TODO: add diff between creation of span and perf.now()
      time = Date.now();
    }

    if (attribsOrStart && !isTimeInput(attribsOrStart)) {
      attributes = attribsOrStart;
    }

    if (!this._span.events) {
      this._span.events = [];
    }

    const event = { name, timeUnixNano: timeInputToLong(time) };

    if (attributes) {
      event.attributes = [];
      for (const [key, val] of Object.entries(attributes)) {
        event.attributes.push({ key, value: toAnyValue(val) });
      }
    }

    return this;
  }

  /**
   * @param {Link} link
   * @returns {Span}
   */
  addLink(link) {
    if (!this._span.links) {
      this._span.links = [];
    }

    const { traceId, spanId } = link.context;
    const linkToAdd = {
      traceId: hexToBinary(traceId),
      spanId: hexToBinary(spanId),
    };

    // TODO: implement dropped attributes
    if (link.attributes) {
      linkToAdd.attributes = [];
      for (const [key, val] of Object.entries(link.attributes)) {
        linkToAdd.attributes.push({ key, value: toAnyValue(val) });
      }
    } 
    
    this._span.links.push(linkToAdd);
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
    // @ts-ignore -- TS is having trouble to check enums with different keys
    this._span.status = status;
    return this;
  }

  /**
   * @param {string} name
   * @returns {Span}
   */
  updateName(name) {
    this._span.name = name;
    return this;
  }

  /**
   * @param {TimeInput} time
   */
  end(time) {
    // TODO: use perf time origin to calculate that
    this._span.endTimeUnixNano =timeInputToLong(time || Date.now());
  }

  /**
   * @returns {boolean}
   */
  isRecording() {
    return true;
  }
}
