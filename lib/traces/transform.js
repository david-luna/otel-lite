/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.trace.v1.ISpan} ISpan
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.common.v1.IKeyValue} IKeyValue
 */
/**
 * @typedef {import('../opentelemetry/types-proto.js').opentelemetry.proto.common.v1.IAnyValue} IAnyValue
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
function hexToBinary(hexStr) {
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
export function toHrTime(time) {
  const seconds = Math.trunc(time / 1000);
  const nanos = Math.round((time % 1000) * Math.pow(10,6));
  return [seconds, nanos];
}

/**
 * @param {import('@opentelemetry/api').TimeInput} input
 * @returns {import('long').default}
 */
function timeInputToLong(input) {
  if (Array.isArray(input)) {
    return new Long(input[0], input[1]);
  }

  if (typeof input === 'number') {
    const origtime = performance.timeOrigin
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
 * @returns {IAnyValue}
 */
function toAnyValue(val) {
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { intValue: val } : { doubleValue: val };
  }
  if (typeof val === 'boolean') {
    return { boolValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(v => toAnyValue(v)) } };
  }
  if (typeof val === 'object' && val != null) {
    return { kvlistValue: { values: recordToKeyValue(val) } };
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
      value: toAnyValue(record[key])
    });
  }

  return result;
}

/**
 * 
 * @param {import('./span.js').Span} span
 * @returns {ISpan}
 */
export function toProtoSpan(span) {
  /** @type {ISpan} */
  const result = {};

  const {spanId, traceId, traceState, traceFlags} = span.spanContext();
  result.traceId = hexToBinary(traceId);
  result.spanId = hexToBinary(spanId);

  if (traceState) {
    result.traceState = traceState.serialize();
  }

  if (span._parentSpanId) {
    result.parentSpanId = hexToBinary(span._parentSpanId);
  }
  
  if (traceFlags) {
    result.flags = traceFlags;
  }

  result.name = span._name;
  // OTEL API SpanKind and proto SpanKind are not aligned (later has one more value)
  result.kind = span._spanKind + 1;
  result.startTimeUnixNano = timeInputToLong(span._startTime);
  result.endTimeUnixNano = timeInputToLong(span._endTime);

  // TODO: add transformer to IKeyValue type
  result.attributes = recordToKeyValue(span._attributes);
  // TODO: implementation of dropped attribs in span
  // result.droppedAttributesCount = 

  if (Array.isArray(span._events) && span._events.length) {
    result.events = [];
    for (const evt of span._events) {
      result.events.push({
        name: evt.name,
        timeUnixNano: timeInputToLong(evt.time),
        attributes: recordToKeyValue(evt.attributes),
      })
    }
    // TODO: implementation of dropped events in span
    // result.droppedEventsCount = 
  }

  if (Array.isArray(span._links) && span._links.length) {
    result.links = [];
    for (const l of span._links) {
      result.links.push({
        traceId: hexToBinary(l.context.traceId),
        spanId: hexToBinary(l.context.spanId),
        flags: l.context.traceFlags,
        // TODO: add transformer to IKeyValue type
        attributes: recordToKeyValue(l.attributes),
        // droppedAttributesCount: ???
      })
    }
    // TODO: implementation of dropped links in span
    // result.droppedLinksCount = 
  }

  // @ts-ignore -- TS is having trouble to check enums with different keys
  result.status = span._status;

  return result;
}