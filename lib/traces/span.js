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
 * @typedef {{
 *   name: string;
 *   version: string;
 *   schemaUrl?: string;
 * }} Scope
 */

export class Span {
  /** @type {Scope} */
  _scope;
  /** @type {boolean} */
  _root;
  /** @type {Context} */
  _contex;
  /** @type {SpanContext} */
  _spanContex;
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
  /** @type {any[]} */
  _events = [];
  /** @type {{exception: Exception, time: TimeInput}} */
  _exception;

  /**
   * @param {{
   *   scope:Scope;
   *   context: Context;
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
    this._name = options.name;
    this._spanKind = options.kind ?? 0;
    this._attributes = options.attributes ?? {};
    this._links = options.links ?? [];
    this._startTime = options.startTime ?? Date.now();
    this._root = options.root ?? false;
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
    this._attributes[name] = val;
    return this;
  }

  /**
   * @param {Attributes} attribs
   * @returns {Span}
   */
  setAttributes(attribs) {
    for (const name in Object.keys(attribs)) {
      if (attribs[name] != null) {
        this._attributes[name] = attribs[name];
      }
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
    const event = { name };

    if (attribsOrStart) {
      if (
        typeof attribsOrStart === 'number' ||
        typeof attribsOrStart.toLocaleString === 'function' ||
        Array.isArray(attribsOrStart)
      ) {
        event.attributes = attribsOrStart;
      } else {
        event.start = attribsOrStart;
      }
    }

    if (start) {
      event.start = event;
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
    this._links.push(...links);
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
    this._endTime = time;
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
