/*!
 * asyncemitter.js - event emitter which resolves promises.
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('assert');

/**
 * Represents a promise-resolving event emitter.
 * @alias module:utils.AsyncEmitter
 * @see EventEmitter
 * @constructor
 */

function AsyncEmitter() {
  if (!(this instanceof AsyncEmitter))
    return new AsyncEmitter();

  this._events = Object.create(null);
}

/**
 * Add a listener.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.addListener = function addListener(type, handler) {
  return this._push(type, handler, false);
};

/**
 * Add a listener.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.on = function on(type, handler) {
  return this.addListener(type, handler);
};

/**
 * Add a listener to execute once.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.once = function once(type, handler) {
  return this._push(type, handler, true);
};

/**
 * Prepend a listener.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.prependListener = function prependListener(type, handler) {
  return this._unshift(type, handler, false);
};

/**
 * Prepend a listener to execute once.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.prependOnceListener = function prependOnceListener(type, handler) {
  return this._unshift(type, handler, true);
};

/**
 * Push a listener.
 * @private
 * @param {String} type
 * @param {Function} handler
 * @param {Boolean} once
 */

AsyncEmitter.prototype._push = function _push(type, handler, once) {
  assert(typeof type === 'string', '`type` must be a string.');

  if (!this._events[type])
    this._events[type] = [];

  this._events[type].push(new Listener(handler, once));

  this.emit('newListener', type, handler);
};

/**
 * Unshift a listener.
 * @param {String} type
 * @param {Function} handler
 * @param {Boolean} once
 */

AsyncEmitter.prototype._unshift = function _unshift(type, handler, once) {
  assert(typeof type === 'string', '`type` must be a string.');

  if (!this._events[type])
    this._events[type] = [];

  this._events[type].unshift(new Listener(handler, once));

  this.emit('newListener', type, handler);
};

/**
 * Remove a listener.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.removeListener = function removeListener(type, handler) {
  assert(typeof type === 'string', '`type` must be a string.');

  const listeners = this._events[type];

  if (!listeners)
    return;

  let index = -1;

  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    if (listener.handler === handler) {
      index = i;
      break;
    }
  }

  if (index === -1)
    return;

  listeners.splice(index, 1);

  if (listeners.length === 0)
    delete this._events[type];

  this.emit('removeListener', type, handler);
};

/**
 * Set max listeners.
 * @param {Number} max
 */

AsyncEmitter.prototype.setMaxListeners = function setMaxListeners(max) {
  assert(typeof max === 'number', '`max` must be a number.');
  assert(max >= 0, '`max` must be non-negative.');
  assert(Number.isSafeInteger(max), '`max` must be an integer.');
};

/**
 * Remove all listeners.
 * @param {String?} type
 */

AsyncEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  if (arguments.length === 0) {
    this._events = Object.create(null);
    return;
  }

  assert(typeof type === 'string', '`type` must be a string.');

  delete this._events[type];
};

/**
 * Get listeners array.
 * @param {String} type
 * @returns {Function[]}
 */

AsyncEmitter.prototype.listeners = function listeners(type) {
  assert(typeof type === 'string', '`type` must be a string.');

  const listeners = this._events[type];

  if (!listeners)
    return [];

  const result = [];

  for (const {handler} of listeners)
    result.push(handler);

  return result;
};

/**
 * Get listener count for an event.
 * @param {String} type
 */

AsyncEmitter.prototype.listenerCount = function listenerCount(type) {
  assert(typeof type === 'string', '`type` must be a string.');

  const listeners = this._events[type];

  if (!listeners)
    return 0;

  return listeners.length;
};

/**
 * Add a listener.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.bind = function bind(type, handler) {
  return this.on(type, handler);
};

/**
 * Emit event.
 * @param {String} type
 * @param {...Object} args
 * @returns {Promise}
 */

AsyncEmitter.prototype.fire = function fire() {
  return this.emit.apply(this, arguments);
};

/**
 * Add a listener.
 * @param {String} type
 * @param {Function} handler
 */

AsyncEmitter.prototype.hook = function hook(type, handler) {
  return this.on(type, handler);
};

/**
 * Emit event.
 * @param {String} type
 * @param {...Object} args
 * @returns {Promise}
 */

AsyncEmitter.prototype.call = function call() {
  return this.emitAsync.apply(this, arguments);
};

/**
 * Emit an event synchronously.
 * @param {String} type
 * @param {...Object} args
 * @returns {Promise}
 */

AsyncEmitter.prototype.emit = function emit(type) {
  try {
    this._emit.apply(this, arguments);
  } catch (e) {
    if (type === 'error')
      throw e;

    this._emit('error', e);
  }
};

/**
 * Emit an event synchronously.
 * @private
 * @param {String} type
 * @param {...Object} args
 * @returns {Promise}
 */

AsyncEmitter.prototype._emit = function _emit(type) {
  assert(typeof type === 'string', '`type` must be a string.');

  const listeners = this._events[type];

  if (!listeners) {
    if (type === 'error') {
      const error = arguments[1];

      if (error instanceof Error)
        throw error;

      const err = new Error(`Uncaught, unspecified "error" event. (${error})`);
      err.context = error;
      throw err;
    }
    return;
  }

  assert(listeners.length > 0);

  let args = null;

  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    const handler = listener.handler;

    if (listener.once) {
      listeners.splice(i, 1);
      i--;
    }

    switch (arguments.length) {
      case 1:
        handler();
        break;
      case 2:
        handler(arguments[1]);
        break;
      case 3:
        handler(arguments[1], arguments[2]);
        break;
      case 4:
        handler(arguments[1], arguments[2], arguments[3]);
        break;
      default:
        if (!args) {
          args = new Array(arguments.length - 1);
          for (let j = 1; j < arguments.length; j++)
            args[j - 1] = arguments[j];
        }
        handler.apply(null, args);
        break;
    }
  }
};

/**
 * Emit an event. Wait for promises to resolve.
 * @method
 * @param {String} type
 * @param {...Object} args
 * @returns {Promise}
 */

AsyncEmitter.prototype.emitAsync = async function emitAsync(type) {
  try {
    await this._emitAsync.apply(this, arguments);
  } catch (e) {
    if (type === 'error')
      throw e;

    await this._emitAsync('error', e);
  }
};

/**
 * Emit an event. Wait for promises to resolve.
 * @private
 * @param {String} type
 * @param {...Object} args
 * @returns {Promise}
 */

AsyncEmitter.prototype._emitAsync = async function _emitAsync(type) {
  assert(typeof type === 'string', '`type` must be a string.');

  const listeners = this._events[type];

  if (!listeners) {
    if (type === 'error') {
      const error = arguments[1];

      if (error instanceof Error)
        throw error;

      const err = new Error(`Uncaught, unspecified "error" event. (${error})`);
      err.context = error;
      throw err;
    }
    return;
  }

  assert(listeners.length > 0);

  let args = null;

  for (let i = 0; i < listeners.length; i++) {
    const listener = listeners[i];
    const handler = listener.handler;

    if (listener.once) {
      listeners.splice(i, 1);
      i--;
    }

    switch (arguments.length) {
      case 1:
        await handler();
        break;
      case 2:
        await handler(arguments[1]);
        break;
      case 3:
        await handler(arguments[1], arguments[2]);
        break;
      case 4:
        await handler(arguments[1], arguments[2], arguments[3]);
        break;
      default:
        if (!args) {
          args = new Array(arguments.length - 1);
          for (let j = 1; j < arguments.length; j++)
            args[j - 1] = arguments[j];
        }
        await handler.apply(null, args);
        break;
    }
  }
};

/**
 * Event Listener
 * @constructor
 * @ignore
 * @param {Function} handler
 * @param {Boolean} once
 * @property {Function} handler
 * @property {Boolean} once
 */

function Listener(handler, once) {
  assert(typeof handler === 'function', '`handler` must be a function.');
  assert(typeof once === 'boolean', '`once` must be a function.');
  this.handler = handler;
  this.once = once;
}

/*
 * Expose
 */

module.exports = AsyncEmitter;
