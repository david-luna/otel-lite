import {AsyncLocalStorage} from 'async_hooks';
import {EventEmitter} from 'events';
import {ROOT_CONTEXT} from '@opentelemetry/api';

/** @typedef {import('@opentelemetry/api').ContextManager} ContextManager*/
/** @typedef {import('@opentelemetry/api').Context} Context*/

// Node.js API to carry context around functions
const storage = new AsyncLocalStorage();

// For event emitters handling
/**
 * @typedef {Object} ListenerRecord
 * @property {Function} listener
 * @property {Function} boundListener
 */
/** @type {WeakMap<EventEmitter, Map<string, ListenerRecord[]>>} */
const emittersMap = new WeakMap();
const addListenerMethods = [
  'addListener',
  'on',
  'once',
  'prependListener',
  'prependOnceListener',
];
const removeListenerMethods = ['removeListener', 'off'];

/**
 * @param {ContextManager} manager
 * @param {Context} context
 * @param {Function} fn
 * @returns {Function}
 */
function bindFunction(manager, context, fn) {
  const boundFn = function (...args) {
    return manager.with(context, () => fn.apply(this, args));
  };
  Object.defineProperty(boundFn, 'length', {
    enumerable: false,
    configurable: true,
    writable: false,
    value: fn.length,
  });
  return boundFn;
}

/**
 * @param {ContextManager} manager
 * @param {Context} context
 * @param {EventEmitter} emiter
 * @returns {EventEmitter}
 */
function bindEventEmitter(manager, context, emiter) {
  // Do nothing if EventEmitter is already patched
  if (emittersMap.has(emiter)) {
    return;
  }

  // Set a ref to the emitter
  emittersMap.set(emiter, new Map());

  // Patch the add listenr methods
  addListenerMethods.forEach((name) => {
    const addListener = emiter[name];

    // API check
    if (typeof addListener === 'function') {
      emiter[name] = function (evtName, listener) {
        // Get the map of listeners to work with
        /** @type {Map<string, ListenerRecord[]>} */
        const listenersMap = emittersMap.get(emiter) || new Map();

        // same listener can be added more than once, so we use an array
        const listeners = listenersMap.get(evtName) || [];
        const boundListener = bindFunction(manager, context, listener);

        listeners.push({listener, boundListener});
        listenersMap.set(evtName, listeners);

        return addListener.call(this, evtName, boundListener);
      };
    }
  });

  // Now patch the remove listener
  removeListenerMethods.forEach((name) => {
    const removeListener = emiter[name];

    // API check
    if (typeof removeListener === 'function') {
      emiter[name] = function (evtName, listener) {
        // Get the map of listeners to work with
        /** @type {Map<string, ListenerRecord[]>} */
        const listenersMap = emittersMap.get(emiter) || new Map();
        const listeners = listenersMap.get(evtName) ?? [];
        const recordIdx = listeners.findIndex((r) => r.listener === listener);
        let record;

        if (recordIdx !== -1) {
          record = listeners[recordIdx];
          listeners.splice(recordIdx, 1);
        }
        removeListener.call(this, evtName, record?.boundListener || listener);
      };
    }
  });

  // removeAllListeners is a special case
  if (typeof emiter.removeAllListeners === 'function') {
    const removeAllListeners = emiter.removeAllListeners;

    emiter.removeAllListeners = function (name) {
      if (typeof name === 'string') {
        // Get the map of listeners to work with
        /** @type {Map<string, ListenerRecord[]>} */
        const listenersMap = emittersMap.get(emiter) || new Map();
        listenersMap.set(name, []);
      } else {
        emittersMap.set(emiter, new Map());
      }
      return removeAllListeners.apply(this, arguments);
    };
  }
}

/** @type {ContextManager} */
export const ContextManager = {
  active: function () {
    return storage.getStore() ?? ROOT_CONTEXT;
  },
  enable: function () {
    return this;
  },
  disable: function () {
    storage.disable();
    return this;
  },
  with: function (context, fn, thisArg, ...args) {
    return storage.run(
      context,
      thisArg == null ? fn : fn.bind(thisArg),
      ...args
    );
  },
  // @ts-ignore -- this function return type is more specific and does not match the generic
  bind: function (context, target) {
    if (typeof target === 'function') {
      return bindFunction(this, context, target);
    } else if (target instanceof EventEmitter) {
      return bindEventEmitter(this, context, target);
    }
    return target;
  },
};
