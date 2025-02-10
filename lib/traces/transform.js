/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.trace.v1.ISpan} ISpan
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.common.v1.IKeyValue} IKeyValue
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.common.v1.IAnyValue} IAnyValue
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.trace.v1.IScopeSpans} IScopeSpans
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest} IExportTraceServiceRequest
 */

import {performance} from 'perf_hooks';

import Long from 'long';

/**
 * @param {number} charCode
 * @returns {number}
 */
function intValue(charCode) {
  // 0-9
  if (charCode >= 48 && charCode <= 57) {
    return charCode - 48;
  }

  // a-f
  if (charCode >= 97 && charCode <= 102) {
    return charCode - 87;
  }

  // A-F
  return charCode - 55;
}

/**
 * @param {string} hexStr
 * @returns {Uint8Array}
 */
export function hexToBinary(hexStr) {
  const buf = new Uint8Array(hexStr.length / 2);
  let offset = 0;

  for (let i = 0; i < hexStr.length; i += 2) {
    const hi = intValue(hexStr.charCodeAt(i));
    const lo = intValue(hexStr.charCodeAt(i + 1));
    buf[offset++] = (hi << 4) | lo;
  }

  return buf;
}

/**
 * @param {number} time
 * @returns {import('@opentelemetry/api').HrTime}
 */
function toHrTime(time) {
  const seconds = Math.trunc(time / 1000);
  const nanos = Math.round((time % 1000) * Math.pow(10, 6));
  return [seconds, nanos];
}

/**
 * @param {import('@opentelemetry/api').TimeInput} input
 * @returns {import('long').default}
 */
export function timeInputToLong(input) {
  if (Array.isArray(input)) {
    return new Long(input[0], input[1]);
  }

  if (typeof input === 'number') {
    const origtime = performance.timeOrigin;
    const origHr = input < origtime ? toHrTime(origtime) : [0, 0];
    const inpHr = toHrTime(input);
    const hrTime = [origHr[0] + inpHr[0], origHr[1] + inpHr[1]];
    const nanosInASecond = Math.pow(10, 9);

    if (hrTime[1] > nanosInASecond) {
      hrTime[0] += 1;
      hrTime[1] -= nanosInASecond;
    }
    return new Long(hrTime[0], hrTime[1]);
  }

  if (input instanceof Date) {
    const hrTime = toHrTime(input.getTime());
    return new Long(hrTime[0], hrTime[1]);
  }
}

/**
 * @param {any} val
 * @param {number} [limit=Infinity]
 * @returns {IAnyValue}
 */
export function toAnyValue(val, limit = Infinity) {
  if (typeof val === 'string') {
    if (val.length > limit) val = val.substring(0, limit - 1);
    return {stringValue: val};
  }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? {intValue: val} : {doubleValue: val};
  }
  if (typeof val === 'boolean') {
    return {boolValue: val};
  }
  if (Array.isArray(val)) {
    return {arrayValue: {values: val.map((v) => toAnyValue(v))}};
  }
  if (typeof val === 'object' && val != null) {
    return {kvlistValue: {values: recordToKeyValue(val)}};
  }

  return {};
}

/**
 * @param {Record<string, any>} record
 * @returns {IKeyValue[]}
 */
function recordToKeyValue(record) {
  /** @type {IKeyValue[]} */
  const result = [];

  for (const key of Object.keys(record)) {
    result.push({
      key,
      value: toAnyValue(record[key]),
    });
  }

  return result;
}

/**
 * TODO: add the resource (maybe accept a resource param?)
 * @param {import('./span.js').Span[]} spans
 * @returns {IExportTraceServiceRequest}
 */
export function toServiceRequest(spans) {
  /** @type {Map<string, ISpan[]>} */
  const scopesMap = new Map();
  for (const span of spans) {
    const {_scope} = span;
    const key = JSON.stringify(_scope, Object.keys(_scope).sort());
    const list = scopesMap.get(key) || [];
    list.push(span._span);
    scopesMap.set(key, list);
  }

  /** @type {IScopeSpans[]} */
  const scopeSpans = [];
  for (const [scopeStr, spans] of scopesMap.entries()) {
    scopeSpans.push({
      scope: JSON.parse(scopeStr),
      spans,
    });
  }

  return {
    // TODO: resource missing here
    resourceSpans: [{scopeSpans}],
  };
}
