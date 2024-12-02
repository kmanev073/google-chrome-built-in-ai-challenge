var background = (function () {
  'use strict';

  const browser = (
    // @ts-expect-error
    globalThis.browser?.runtime?.id == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );

  const list = [
  	// Native ES errors https://262.ecma-international.org/12.0/#sec-well-known-intrinsic-objects
  	EvalError,
  	RangeError,
  	ReferenceError,
  	SyntaxError,
  	TypeError,
  	URIError,

  	// Built-in errors
  	globalThis.DOMException,

  	// Node-specific errors
  	// https://nodejs.org/api/errors.html
  	globalThis.AssertionError,
  	globalThis.SystemError,
  ]
  	// Non-native Errors are used with `globalThis` because they might be missing. This filter drops them when undefined.
  	.filter(Boolean)
  	.map(
  		constructor => [constructor.name, constructor],
  	);

  const errorConstructors = new Map(list);

  class NonError extends Error {
  	name = 'NonError';

  	constructor(message) {
  		super(NonError._prepareSuperMessage(message));
  	}

  	static _prepareSuperMessage(message) {
  		try {
  			return JSON.stringify(message);
  		} catch {
  			return String(message);
  		}
  	}
  }

  const commonProperties = [
  	{
  		property: 'name',
  		enumerable: false,
  	},
  	{
  		property: 'message',
  		enumerable: false,
  	},
  	{
  		property: 'stack',
  		enumerable: false,
  	},
  	{
  		property: 'code',
  		enumerable: true,
  	},
  	{
  		property: 'cause',
  		enumerable: false,
  	},
  ];

  const toJsonWasCalled = new WeakSet();

  const toJSON = from => {
  	toJsonWasCalled.add(from);
  	const json = from.toJSON();
  	toJsonWasCalled.delete(from);
  	return json;
  };

  const getErrorConstructor = name => errorConstructors.get(name) ?? Error;

  // eslint-disable-next-line complexity
  const destroyCircular = ({
  	from,
  	seen,
  	to,
  	forceEnumerable,
  	maxDepth,
  	depth,
  	useToJSON,
  	serialize,
  }) => {
  	if (!to) {
  		if (Array.isArray(from)) {
  			to = [];
  		} else if (!serialize && isErrorLike(from)) {
  			const Error = getErrorConstructor(from.name);
  			to = new Error();
  		} else {
  			to = {};
  		}
  	}

  	seen.push(from);

  	if (depth >= maxDepth) {
  		return to;
  	}

  	if (useToJSON && typeof from.toJSON === 'function' && !toJsonWasCalled.has(from)) {
  		return toJSON(from);
  	}

  	const continueDestroyCircular = value => destroyCircular({
  		from: value,
  		seen: [...seen],
  		forceEnumerable,
  		maxDepth,
  		depth,
  		useToJSON,
  		serialize,
  	});

  	for (const [key, value] of Object.entries(from)) {
  		if (value && value instanceof Uint8Array && value.constructor.name === 'Buffer') {
  			to[key] = '[object Buffer]';
  			continue;
  		}

  		// TODO: Use `stream.isReadable()` when targeting Node.js 18.
  		if (value !== null && typeof value === 'object' && typeof value.pipe === 'function') {
  			to[key] = '[object Stream]';
  			continue;
  		}

  		if (typeof value === 'function') {
  			continue;
  		}

  		if (!value || typeof value !== 'object') {
  			// Gracefully handle non-configurable errors like `DOMException`.
  			try {
  				to[key] = value;
  			} catch {}

  			continue;
  		}

  		if (!seen.includes(from[key])) {
  			depth++;
  			to[key] = continueDestroyCircular(from[key]);

  			continue;
  		}

  		to[key] = '[Circular]';
  	}

  	for (const {property, enumerable} of commonProperties) {
  		if (typeof from[property] !== 'undefined' && from[property] !== null) {
  			Object.defineProperty(to, property, {
  				value: isErrorLike(from[property]) ? continueDestroyCircular(from[property]) : from[property],
  				enumerable: forceEnumerable ? true : enumerable,
  				configurable: true,
  				writable: true,
  			});
  		}
  	}

  	return to;
  };

  function serializeError(value, options = {}) {
  	const {
  		maxDepth = Number.POSITIVE_INFINITY,
  		useToJSON = true,
  	} = options;

  	if (typeof value === 'object' && value !== null) {
  		return destroyCircular({
  			from: value,
  			seen: [],
  			forceEnumerable: true,
  			maxDepth,
  			depth: 0,
  			useToJSON,
  			serialize: true,
  		});
  	}

  	// People sometimes throw things besides Error objects…
  	if (typeof value === 'function') {
  		// `JSON.stringify()` discards functions. We do too, unless a function is thrown directly.
  		// We intentionally use `||` because `.name` is an empty string for anonymous functions.
  		return `[Function: ${value.name || 'anonymous'}]`;
  	}

  	return value;
  }

  function deserializeError(value, options = {}) {
  	const {maxDepth = Number.POSITIVE_INFINITY} = options;

  	if (value instanceof Error) {
  		return value;
  	}

  	if (isMinimumViableSerializedError(value)) {
  		const Error = getErrorConstructor(value.name);
  		return destroyCircular({
  			from: value,
  			seen: [],
  			to: new Error(),
  			maxDepth,
  			depth: 0,
  			serialize: false,
  		});
  	}

  	return new NonError(value);
  }

  function isErrorLike(value) {
  	return Boolean(value)
  	&& typeof value === 'object'
  	&& 'name' in value
  	&& 'message' in value
  	&& 'stack' in value;
  }

  function isMinimumViableSerializedError(value) {
  	return Boolean(value)
  	&& typeof value === 'object'
  	&& 'message' in value
  	&& !Array.isArray(value);
  }

  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };
  function defineGenericMessanging(config) {
    let removeRootListener;
    let perTypeListeners = {};
    function cleanupRootListener() {
      if (Object.entries(perTypeListeners).length === 0) {
        removeRootListener == null ? void 0 : removeRootListener();
        removeRootListener = void 0;
      }
    }
    let idSeq = Math.floor(Math.random() * 1e4);
    function getNextId() {
      return idSeq++;
    }
    return {
      sendMessage(type, data, ...args) {
        return __async(this, null, function* () {
          var _a2, _b, _c, _d;
          const _message = {
            id: getNextId(),
            type,
            data,
            timestamp: Date.now()
          };
          const message = (_b = yield (_a2 = config.verifyMessageData) == null ? void 0 : _a2.call(config, _message)) != null ? _b : _message;
          (_c = config.logger) == null ? void 0 : _c.debug(`[messaging] sendMessage {id=${message.id}} \u2500\u1405`, message, ...args);
          const response = yield config.sendMessage(message, ...args);
          const { res, err } = response != null ? response : { err: new Error("No response") };
          (_d = config.logger) == null ? void 0 : _d.debug(`[messaging] sendMessage {id=${message.id}} \u140A\u2500`, { res, err });
          if (err != null)
            throw deserializeError(err);
          return res;
        });
      },
      onMessage(type, onReceived) {
        var _a2, _b, _c;
        if (removeRootListener == null) {
          (_a2 = config.logger) == null ? void 0 : _a2.debug(
            `[messaging] "${type}" initialized the message listener for this context`
          );
          removeRootListener = config.addRootListener((message) => {
            var _a3, _b2;
            if (typeof message.type != "string" || typeof message.timestamp !== "number") {
              if (config.breakError) {
                return;
              }
              const err = Error(
                `[messaging] Unknown message format, must include the 'type' & 'timestamp' fields, received: ${JSON.stringify(
                message
              )}`
              );
              (_a3 = config.logger) == null ? void 0 : _a3.error(err);
              throw err;
            }
            (_b2 = config == null ? void 0 : config.logger) == null ? void 0 : _b2.debug("[messaging] Received message", message);
            const listener = perTypeListeners[message.type];
            if (listener == null)
              return;
            const res = listener(message);
            return Promise.resolve(res).then((res2) => {
              var _a4, _b3;
              return (_b3 = (_a4 = config.verifyMessageData) == null ? void 0 : _a4.call(config, res2)) != null ? _b3 : res2;
            }).then((res2) => {
              var _a4;
              (_a4 = config == null ? void 0 : config.logger) == null ? void 0 : _a4.debug(`[messaging] onMessage {id=${message.id}} \u2500\u1405`, { res: res2 });
              return { res: res2 };
            }).catch((err) => {
              var _a4;
              (_a4 = config == null ? void 0 : config.logger) == null ? void 0 : _a4.debug(`[messaging] onMessage {id=${message.id}} \u2500\u1405`, { err });
              return { err: serializeError(err) };
            });
          });
        }
        if (perTypeListeners[type] != null) {
          const err = Error(
            `[messaging] In this JS context, only one listener can be setup for ${type}`
          );
          (_b = config.logger) == null ? void 0 : _b.error(err);
          throw err;
        }
        perTypeListeners[type] = onReceived;
        (_c = config.logger) == null ? void 0 : _c.log(`[messaging] Added listener for ${type}`);
        return () => {
          delete perTypeListeners[type];
          cleanupRootListener();
        };
      },
      removeAllListeners() {
        Object.keys(perTypeListeners).forEach((type) => {
          delete perTypeListeners[type];
        });
        cleanupRootListener();
      }
    };
  }

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  var browserPolyfill$1 = {exports: {}};

  var browserPolyfill = browserPolyfill$1.exports;

  var hasRequiredBrowserPolyfill;

  function requireBrowserPolyfill () {
  	if (hasRequiredBrowserPolyfill) return browserPolyfill$1.exports;
  	hasRequiredBrowserPolyfill = 1;
  	(function (module, exports) {
  		(function (global, factory) {
  		  {
  		    factory(module);
  		  }
  		})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : browserPolyfill, function (module) {

  		  if (!globalThis.chrome?.runtime?.id) {
  		    throw new Error("This script should only be loaded in a browser extension.");
  		  }

  		  if (typeof globalThis.browser === "undefined" || Object.getPrototypeOf(globalThis.browser) !== Object.prototype) {
  		    const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received."; // Wrapping the bulk of this polyfill in a one-time-use function is a minor
  		    // optimization for Firefox. Since Spidermonkey does not fully parse the
  		    // contents of a function until the first time it's called, and since it will
  		    // never actually need to be called, this allows the polyfill to be included
  		    // in Firefox nearly for free.

  		    const wrapAPIs = extensionAPIs => {
  		      // NOTE: apiMetadata is associated to the content of the api-metadata.json file
  		      // at build time by replacing the following "include" with the content of the
  		      // JSON file.
  		      const apiMetadata = {
  		        "alarms": {
  		          "clear": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "clearAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "get": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "getAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "bookmarks": {
  		          "create": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "get": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getChildren": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getRecent": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getSubTree": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getTree": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "move": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          },
  		          "remove": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeTree": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "search": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "update": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          }
  		        },
  		        "browserAction": {
  		          "disable": {
  		            "minArgs": 0,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "enable": {
  		            "minArgs": 0,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "getBadgeBackgroundColor": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getBadgeText": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getPopup": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getTitle": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "openPopup": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "setBadgeBackgroundColor": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "setBadgeText": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "setIcon": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "setPopup": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "setTitle": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          }
  		        },
  		        "browsingData": {
  		          "remove": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          },
  		          "removeCache": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeCookies": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeDownloads": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeFormData": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeHistory": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeLocalStorage": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removePasswords": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removePluginData": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "settings": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "commands": {
  		          "getAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "contextMenus": {
  		          "remove": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "update": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          }
  		        },
  		        "cookies": {
  		          "get": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getAll": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getAllCookieStores": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "remove": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "set": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "devtools": {
  		          "inspectedWindow": {
  		            "eval": {
  		              "minArgs": 1,
  		              "maxArgs": 2,
  		              "singleCallbackArg": false
  		            }
  		          },
  		          "panels": {
  		            "create": {
  		              "minArgs": 3,
  		              "maxArgs": 3,
  		              "singleCallbackArg": true
  		            },
  		            "elements": {
  		              "createSidebarPane": {
  		                "minArgs": 1,
  		                "maxArgs": 1
  		              }
  		            }
  		          }
  		        },
  		        "downloads": {
  		          "cancel": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "download": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "erase": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getFileIcon": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "open": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "pause": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeFile": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "resume": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "search": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "show": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          }
  		        },
  		        "extension": {
  		          "isAllowedFileSchemeAccess": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "isAllowedIncognitoAccess": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "history": {
  		          "addUrl": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "deleteAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "deleteRange": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "deleteUrl": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getVisits": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "search": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "i18n": {
  		          "detectLanguage": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getAcceptLanguages": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "identity": {
  		          "launchWebAuthFlow": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "idle": {
  		          "queryState": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "management": {
  		          "get": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "getSelf": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "setEnabled": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          },
  		          "uninstallSelf": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          }
  		        },
  		        "notifications": {
  		          "clear": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "create": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "getAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "getPermissionLevel": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "update": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          }
  		        },
  		        "pageAction": {
  		          "getPopup": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getTitle": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "hide": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "setIcon": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "setPopup": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "setTitle": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          },
  		          "show": {
  		            "minArgs": 1,
  		            "maxArgs": 1,
  		            "fallbackToNoCallback": true
  		          }
  		        },
  		        "permissions": {
  		          "contains": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getAll": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "remove": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "request": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "runtime": {
  		          "getBackgroundPage": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "getPlatformInfo": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "openOptionsPage": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "requestUpdateCheck": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "sendMessage": {
  		            "minArgs": 1,
  		            "maxArgs": 3
  		          },
  		          "sendNativeMessage": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          },
  		          "setUninstallURL": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "sessions": {
  		          "getDevices": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "getRecentlyClosed": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "restore": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          }
  		        },
  		        "storage": {
  		          "local": {
  		            "clear": {
  		              "minArgs": 0,
  		              "maxArgs": 0
  		            },
  		            "get": {
  		              "minArgs": 0,
  		              "maxArgs": 1
  		            },
  		            "getBytesInUse": {
  		              "minArgs": 0,
  		              "maxArgs": 1
  		            },
  		            "remove": {
  		              "minArgs": 1,
  		              "maxArgs": 1
  		            },
  		            "set": {
  		              "minArgs": 1,
  		              "maxArgs": 1
  		            }
  		          },
  		          "managed": {
  		            "get": {
  		              "minArgs": 0,
  		              "maxArgs": 1
  		            },
  		            "getBytesInUse": {
  		              "minArgs": 0,
  		              "maxArgs": 1
  		            }
  		          },
  		          "sync": {
  		            "clear": {
  		              "minArgs": 0,
  		              "maxArgs": 0
  		            },
  		            "get": {
  		              "minArgs": 0,
  		              "maxArgs": 1
  		            },
  		            "getBytesInUse": {
  		              "minArgs": 0,
  		              "maxArgs": 1
  		            },
  		            "remove": {
  		              "minArgs": 1,
  		              "maxArgs": 1
  		            },
  		            "set": {
  		              "minArgs": 1,
  		              "maxArgs": 1
  		            }
  		          }
  		        },
  		        "tabs": {
  		          "captureVisibleTab": {
  		            "minArgs": 0,
  		            "maxArgs": 2
  		          },
  		          "create": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "detectLanguage": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "discard": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "duplicate": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "executeScript": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "get": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getCurrent": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          },
  		          "getZoom": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "getZoomSettings": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "goBack": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "goForward": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "highlight": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "insertCSS": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "move": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          },
  		          "query": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "reload": {
  		            "minArgs": 0,
  		            "maxArgs": 2
  		          },
  		          "remove": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "removeCSS": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "sendMessage": {
  		            "minArgs": 2,
  		            "maxArgs": 3
  		          },
  		          "setZoom": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "setZoomSettings": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "update": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          }
  		        },
  		        "topSites": {
  		          "get": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "webNavigation": {
  		          "getAllFrames": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "getFrame": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          }
  		        },
  		        "webRequest": {
  		          "handlerBehaviorChanged": {
  		            "minArgs": 0,
  		            "maxArgs": 0
  		          }
  		        },
  		        "windows": {
  		          "create": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "get": {
  		            "minArgs": 1,
  		            "maxArgs": 2
  		          },
  		          "getAll": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "getCurrent": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "getLastFocused": {
  		            "minArgs": 0,
  		            "maxArgs": 1
  		          },
  		          "remove": {
  		            "minArgs": 1,
  		            "maxArgs": 1
  		          },
  		          "update": {
  		            "minArgs": 2,
  		            "maxArgs": 2
  		          }
  		        }
  		      };

  		      if (Object.keys(apiMetadata).length === 0) {
  		        throw new Error("api-metadata.json has not been included in browser-polyfill");
  		      }
  		      /**
  		       * A WeakMap subclass which creates and stores a value for any key which does
  		       * not exist when accessed, but behaves exactly as an ordinary WeakMap
  		       * otherwise.
  		       *
  		       * @param {function} createItem
  		       *        A function which will be called in order to create the value for any
  		       *        key which does not exist, the first time it is accessed. The
  		       *        function receives, as its only argument, the key being created.
  		       */


  		      class DefaultWeakMap extends WeakMap {
  		        constructor(createItem, items = undefined) {
  		          super(items);
  		          this.createItem = createItem;
  		        }

  		        get(key) {
  		          if (!this.has(key)) {
  		            this.set(key, this.createItem(key));
  		          }

  		          return super.get(key);
  		        }

  		      }
  		      /**
  		       * Returns true if the given object is an object with a `then` method, and can
  		       * therefore be assumed to behave as a Promise.
  		       *
  		       * @param {*} value The value to test.
  		       * @returns {boolean} True if the value is thenable.
  		       */


  		      const isThenable = value => {
  		        return value && typeof value === "object" && typeof value.then === "function";
  		      };
  		      /**
  		       * Creates and returns a function which, when called, will resolve or reject
  		       * the given promise based on how it is called:
  		       *
  		       * - If, when called, `chrome.runtime.lastError` contains a non-null object,
  		       *   the promise is rejected with that value.
  		       * - If the function is called with exactly one argument, the promise is
  		       *   resolved to that value.
  		       * - Otherwise, the promise is resolved to an array containing all of the
  		       *   function's arguments.
  		       *
  		       * @param {object} promise
  		       *        An object containing the resolution and rejection functions of a
  		       *        promise.
  		       * @param {function} promise.resolve
  		       *        The promise's resolution function.
  		       * @param {function} promise.reject
  		       *        The promise's rejection function.
  		       * @param {object} metadata
  		       *        Metadata about the wrapped method which has created the callback.
  		       * @param {boolean} metadata.singleCallbackArg
  		       *        Whether or not the promise is resolved with only the first
  		       *        argument of the callback, alternatively an array of all the
  		       *        callback arguments is resolved. By default, if the callback
  		       *        function is invoked with only a single argument, that will be
  		       *        resolved to the promise, while all arguments will be resolved as
  		       *        an array if multiple are given.
  		       *
  		       * @returns {function}
  		       *        The generated callback function.
  		       */


  		      const makeCallback = (promise, metadata) => {
  		        return (...callbackArgs) => {
  		          if (extensionAPIs.runtime.lastError) {
  		            promise.reject(new Error(extensionAPIs.runtime.lastError.message));
  		          } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
  		            promise.resolve(callbackArgs[0]);
  		          } else {
  		            promise.resolve(callbackArgs);
  		          }
  		        };
  		      };

  		      const pluralizeArguments = numArgs => numArgs == 1 ? "argument" : "arguments";
  		      /**
  		       * Creates a wrapper function for a method with the given name and metadata.
  		       *
  		       * @param {string} name
  		       *        The name of the method which is being wrapped.
  		       * @param {object} metadata
  		       *        Metadata about the method being wrapped.
  		       * @param {integer} metadata.minArgs
  		       *        The minimum number of arguments which must be passed to the
  		       *        function. If called with fewer than this number of arguments, the
  		       *        wrapper will raise an exception.
  		       * @param {integer} metadata.maxArgs
  		       *        The maximum number of arguments which may be passed to the
  		       *        function. If called with more than this number of arguments, the
  		       *        wrapper will raise an exception.
  		       * @param {boolean} metadata.singleCallbackArg
  		       *        Whether or not the promise is resolved with only the first
  		       *        argument of the callback, alternatively an array of all the
  		       *        callback arguments is resolved. By default, if the callback
  		       *        function is invoked with only a single argument, that will be
  		       *        resolved to the promise, while all arguments will be resolved as
  		       *        an array if multiple are given.
  		       *
  		       * @returns {function(object, ...*)}
  		       *       The generated wrapper function.
  		       */


  		      const wrapAsyncFunction = (name, metadata) => {
  		        return function asyncFunctionWrapper(target, ...args) {
  		          if (args.length < metadata.minArgs) {
  		            throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
  		          }

  		          if (args.length > metadata.maxArgs) {
  		            throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
  		          }

  		          return new Promise((resolve, reject) => {
  		            if (metadata.fallbackToNoCallback) {
  		              // This API method has currently no callback on Chrome, but it return a promise on Firefox,
  		              // and so the polyfill will try to call it with a callback first, and it will fallback
  		              // to not passing the callback if the first call fails.
  		              try {
  		                target[name](...args, makeCallback({
  		                  resolve,
  		                  reject
  		                }, metadata));
  		              } catch (cbError) {
  		                console.warn(`${name} API method doesn't seem to support the callback parameter, ` + "falling back to call it without a callback: ", cbError);
  		                target[name](...args); // Update the API method metadata, so that the next API calls will not try to
  		                // use the unsupported callback anymore.

  		                metadata.fallbackToNoCallback = false;
  		                metadata.noCallback = true;
  		                resolve();
  		              }
  		            } else if (metadata.noCallback) {
  		              target[name](...args);
  		              resolve();
  		            } else {
  		              target[name](...args, makeCallback({
  		                resolve,
  		                reject
  		              }, metadata));
  		            }
  		          });
  		        };
  		      };
  		      /**
  		       * Wraps an existing method of the target object, so that calls to it are
  		       * intercepted by the given wrapper function. The wrapper function receives,
  		       * as its first argument, the original `target` object, followed by each of
  		       * the arguments passed to the original method.
  		       *
  		       * @param {object} target
  		       *        The original target object that the wrapped method belongs to.
  		       * @param {function} method
  		       *        The method being wrapped. This is used as the target of the Proxy
  		       *        object which is created to wrap the method.
  		       * @param {function} wrapper
  		       *        The wrapper function which is called in place of a direct invocation
  		       *        of the wrapped method.
  		       *
  		       * @returns {Proxy<function>}
  		       *        A Proxy object for the given method, which invokes the given wrapper
  		       *        method in its place.
  		       */


  		      const wrapMethod = (target, method, wrapper) => {
  		        return new Proxy(method, {
  		          apply(targetMethod, thisObj, args) {
  		            return wrapper.call(thisObj, target, ...args);
  		          }

  		        });
  		      };

  		      let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
  		      /**
  		       * Wraps an object in a Proxy which intercepts and wraps certain methods
  		       * based on the given `wrappers` and `metadata` objects.
  		       *
  		       * @param {object} target
  		       *        The target object to wrap.
  		       *
  		       * @param {object} [wrappers = {}]
  		       *        An object tree containing wrapper functions for special cases. Any
  		       *        function present in this object tree is called in place of the
  		       *        method in the same location in the `target` object tree. These
  		       *        wrapper methods are invoked as described in {@see wrapMethod}.
  		       *
  		       * @param {object} [metadata = {}]
  		       *        An object tree containing metadata used to automatically generate
  		       *        Promise-based wrapper functions for asynchronous. Any function in
  		       *        the `target` object tree which has a corresponding metadata object
  		       *        in the same location in the `metadata` tree is replaced with an
  		       *        automatically-generated wrapper function, as described in
  		       *        {@see wrapAsyncFunction}
  		       *
  		       * @returns {Proxy<object>}
  		       */

  		      const wrapObject = (target, wrappers = {}, metadata = {}) => {
  		        let cache = Object.create(null);
  		        let handlers = {
  		          has(proxyTarget, prop) {
  		            return prop in target || prop in cache;
  		          },

  		          get(proxyTarget, prop, receiver) {
  		            if (prop in cache) {
  		              return cache[prop];
  		            }

  		            if (!(prop in target)) {
  		              return undefined;
  		            }

  		            let value = target[prop];

  		            if (typeof value === "function") {
  		              // This is a method on the underlying object. Check if we need to do
  		              // any wrapping.
  		              if (typeof wrappers[prop] === "function") {
  		                // We have a special-case wrapper for this method.
  		                value = wrapMethod(target, target[prop], wrappers[prop]);
  		              } else if (hasOwnProperty(metadata, prop)) {
  		                // This is an async method that we have metadata for. Create a
  		                // Promise wrapper for it.
  		                let wrapper = wrapAsyncFunction(prop, metadata[prop]);
  		                value = wrapMethod(target, target[prop], wrapper);
  		              } else {
  		                // This is a method that we don't know or care about. Return the
  		                // original method, bound to the underlying object.
  		                value = value.bind(target);
  		              }
  		            } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
  		              // This is an object that we need to do some wrapping for the children
  		              // of. Create a sub-object wrapper for it with the appropriate child
  		              // metadata.
  		              value = wrapObject(value, wrappers[prop], metadata[prop]);
  		            } else if (hasOwnProperty(metadata, "*")) {
  		              // Wrap all properties in * namespace.
  		              value = wrapObject(value, wrappers[prop], metadata["*"]);
  		            } else {
  		              // We don't need to do any wrapping for this property,
  		              // so just forward all access to the underlying object.
  		              Object.defineProperty(cache, prop, {
  		                configurable: true,
  		                enumerable: true,

  		                get() {
  		                  return target[prop];
  		                },

  		                set(value) {
  		                  target[prop] = value;
  		                }

  		              });
  		              return value;
  		            }

  		            cache[prop] = value;
  		            return value;
  		          },

  		          set(proxyTarget, prop, value, receiver) {
  		            if (prop in cache) {
  		              cache[prop] = value;
  		            } else {
  		              target[prop] = value;
  		            }

  		            return true;
  		          },

  		          defineProperty(proxyTarget, prop, desc) {
  		            return Reflect.defineProperty(cache, prop, desc);
  		          },

  		          deleteProperty(proxyTarget, prop) {
  		            return Reflect.deleteProperty(cache, prop);
  		          }

  		        }; // Per contract of the Proxy API, the "get" proxy handler must return the
  		        // original value of the target if that value is declared read-only and
  		        // non-configurable. For this reason, we create an object with the
  		        // prototype set to `target` instead of using `target` directly.
  		        // Otherwise we cannot return a custom object for APIs that
  		        // are declared read-only and non-configurable, such as `chrome.devtools`.
  		        //
  		        // The proxy handlers themselves will still use the original `target`
  		        // instead of the `proxyTarget`, so that the methods and properties are
  		        // dereferenced via the original targets.

  		        let proxyTarget = Object.create(target);
  		        return new Proxy(proxyTarget, handlers);
  		      };
  		      /**
  		       * Creates a set of wrapper functions for an event object, which handles
  		       * wrapping of listener functions that those messages are passed.
  		       *
  		       * A single wrapper is created for each listener function, and stored in a
  		       * map. Subsequent calls to `addListener`, `hasListener`, or `removeListener`
  		       * retrieve the original wrapper, so that  attempts to remove a
  		       * previously-added listener work as expected.
  		       *
  		       * @param {DefaultWeakMap<function, function>} wrapperMap
  		       *        A DefaultWeakMap object which will create the appropriate wrapper
  		       *        for a given listener function when one does not exist, and retrieve
  		       *        an existing one when it does.
  		       *
  		       * @returns {object}
  		       */


  		      const wrapEvent = wrapperMap => ({
  		        addListener(target, listener, ...args) {
  		          target.addListener(wrapperMap.get(listener), ...args);
  		        },

  		        hasListener(target, listener) {
  		          return target.hasListener(wrapperMap.get(listener));
  		        },

  		        removeListener(target, listener) {
  		          target.removeListener(wrapperMap.get(listener));
  		        }

  		      });

  		      const onRequestFinishedWrappers = new DefaultWeakMap(listener => {
  		        if (typeof listener !== "function") {
  		          return listener;
  		        }
  		        /**
  		         * Wraps an onRequestFinished listener function so that it will return a
  		         * `getContent()` property which returns a `Promise` rather than using a
  		         * callback API.
  		         *
  		         * @param {object} req
  		         *        The HAR entry object representing the network request.
  		         */


  		        return function onRequestFinished(req) {
  		          const wrappedReq = wrapObject(req, {}
  		          /* wrappers */
  		          , {
  		            getContent: {
  		              minArgs: 0,
  		              maxArgs: 0
  		            }
  		          });
  		          listener(wrappedReq);
  		        };
  		      });
  		      const onMessageWrappers = new DefaultWeakMap(listener => {
  		        if (typeof listener !== "function") {
  		          return listener;
  		        }
  		        /**
  		         * Wraps a message listener function so that it may send responses based on
  		         * its return value, rather than by returning a sentinel value and calling a
  		         * callback. If the listener function returns a Promise, the response is
  		         * sent when the promise either resolves or rejects.
  		         *
  		         * @param {*} message
  		         *        The message sent by the other end of the channel.
  		         * @param {object} sender
  		         *        Details about the sender of the message.
  		         * @param {function(*)} sendResponse
  		         *        A callback which, when called with an arbitrary argument, sends
  		         *        that value as a response.
  		         * @returns {boolean}
  		         *        True if the wrapped listener returned a Promise, which will later
  		         *        yield a response. False otherwise.
  		         */


  		        return function onMessage(message, sender, sendResponse) {
  		          let didCallSendResponse = false;
  		          let wrappedSendResponse;
  		          let sendResponsePromise = new Promise(resolve => {
  		            wrappedSendResponse = function (response) {
  		              didCallSendResponse = true;
  		              resolve(response);
  		            };
  		          });
  		          let result;

  		          try {
  		            result = listener(message, sender, wrappedSendResponse);
  		          } catch (err) {
  		            result = Promise.reject(err);
  		          }

  		          const isResultThenable = result !== true && isThenable(result); // If the listener didn't returned true or a Promise, or called
  		          // wrappedSendResponse synchronously, we can exit earlier
  		          // because there will be no response sent from this listener.

  		          if (result !== true && !isResultThenable && !didCallSendResponse) {
  		            return false;
  		          } // A small helper to send the message if the promise resolves
  		          // and an error if the promise rejects (a wrapped sendMessage has
  		          // to translate the message into a resolved promise or a rejected
  		          // promise).


  		          const sendPromisedResult = promise => {
  		            promise.then(msg => {
  		              // send the message value.
  		              sendResponse(msg);
  		            }, error => {
  		              // Send a JSON representation of the error if the rejected value
  		              // is an instance of error, or the object itself otherwise.
  		              let message;

  		              if (error && (error instanceof Error || typeof error.message === "string")) {
  		                message = error.message;
  		              } else {
  		                message = "An unexpected error occurred";
  		              }

  		              sendResponse({
  		                __mozWebExtensionPolyfillReject__: true,
  		                message
  		              });
  		            }).catch(err => {
  		              // Print an error on the console if unable to send the response.
  		              console.error("Failed to send onMessage rejected reply", err);
  		            });
  		          }; // If the listener returned a Promise, send the resolved value as a
  		          // result, otherwise wait the promise related to the wrappedSendResponse
  		          // callback to resolve and send it as a response.


  		          if (isResultThenable) {
  		            sendPromisedResult(result);
  		          } else {
  		            sendPromisedResult(sendResponsePromise);
  		          } // Let Chrome know that the listener is replying.


  		          return true;
  		        };
  		      });

  		      const wrappedSendMessageCallback = ({
  		        reject,
  		        resolve
  		      }, reply) => {
  		        if (extensionAPIs.runtime.lastError) {
  		          // Detect when none of the listeners replied to the sendMessage call and resolve
  		          // the promise to undefined as in Firefox.
  		          // See https://github.com/mozilla/webextension-polyfill/issues/130
  		          if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
  		            resolve();
  		          } else {
  		            reject(new Error(extensionAPIs.runtime.lastError.message));
  		          }
  		        } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
  		          // Convert back the JSON representation of the error into
  		          // an Error instance.
  		          reject(new Error(reply.message));
  		        } else {
  		          resolve(reply);
  		        }
  		      };

  		      const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
  		        if (args.length < metadata.minArgs) {
  		          throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
  		        }

  		        if (args.length > metadata.maxArgs) {
  		          throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
  		        }

  		        return new Promise((resolve, reject) => {
  		          const wrappedCb = wrappedSendMessageCallback.bind(null, {
  		            resolve,
  		            reject
  		          });
  		          args.push(wrappedCb);
  		          apiNamespaceObj.sendMessage(...args);
  		        });
  		      };

  		      const staticWrappers = {
  		        devtools: {
  		          network: {
  		            onRequestFinished: wrapEvent(onRequestFinishedWrappers)
  		          }
  		        },
  		        runtime: {
  		          onMessage: wrapEvent(onMessageWrappers),
  		          onMessageExternal: wrapEvent(onMessageWrappers),
  		          sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
  		            minArgs: 1,
  		            maxArgs: 3
  		          })
  		        },
  		        tabs: {
  		          sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
  		            minArgs: 2,
  		            maxArgs: 3
  		          })
  		        }
  		      };
  		      const settingMetadata = {
  		        clear: {
  		          minArgs: 1,
  		          maxArgs: 1
  		        },
  		        get: {
  		          minArgs: 1,
  		          maxArgs: 1
  		        },
  		        set: {
  		          minArgs: 1,
  		          maxArgs: 1
  		        }
  		      };
  		      apiMetadata.privacy = {
  		        network: {
  		          "*": settingMetadata
  		        },
  		        services: {
  		          "*": settingMetadata
  		        },
  		        websites: {
  		          "*": settingMetadata
  		        }
  		      };
  		      return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
  		    }; // The build process adds a UMD wrapper around this file, which makes the
  		    // `module` variable available.


  		    module.exports = wrapAPIs(chrome);
  		  } else {
  		    module.exports = globalThis.browser;
  		  }
  		});
  		
  	} (browserPolyfill$1));
  	return browserPolyfill$1.exports;
  }

  var browserPolyfillExports = requireBrowserPolyfill();
  const Browser = /*@__PURE__*/getDefaultExportFromCjs(browserPolyfillExports);

  function defineExtensionMessaging(config) {
    return defineGenericMessanging(__spreadProps(__spreadValues({}, config), {
      sendMessage(message, tabId) {
        if (tabId == null)
          return Browser.runtime.sendMessage(message);
        return Browser.tabs.sendMessage(tabId, message);
      },
      addRootListener(processMessage) {
        const listener = (message, sender) => {
          if (typeof message === "object")
            return processMessage(__spreadProps(__spreadValues({}, message), { sender }));
          else
            return processMessage(message);
        };
        Browser.runtime.onMessage.addListener(listener);
        return () => Browser.runtime.onMessage.removeListener(listener);
      }
    }));
  }

  const { sendMessage, onMessage } = defineExtensionMessaging();
  background;

  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }

  // src/index.ts
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }

  let blacklist;
  let whitelist;
  const checkedWebsites = {};
  const definition = defineBackground(() => {
    loadLists().then(() => {
      subscribeToOnTabLoaded();
      subscribeToOnTabSelected();
      onMessage("setCount", ({ data }) => {
        console.log(data);
      });
      console.log("Anti-Phishing extension loaded successfully!");
    }).catch((error) => {
      console.error("Failed to load Anti-Phishing extension!", error);
    });
  });
  async function fetchJSON(url) {
    const response = await fetch(url);
    return response.json();
  }
  async function loadLists() {
    try {
      const blacklistData = await fetchJSON("/blacklist-phishfort.json");
      blacklist = new Set(blacklistData);
    } catch (cause) {
      throw new Error("Error while loading blacklist data!", { cause });
    }
    console.log(`Successfully loaded ${blacklist.size} blacklisted domains.`);
    const whitelistFiles = [
      "/top-1m-builtwith.json",
      "/top-1m-cisco.json",
      "/top-1m-tranco.json"
    ];
    try {
      const [builtwithData, ciscoData, trancoData] = await Promise.all(
        whitelistFiles.map((url) => fetchJSON(url))
      );
      whitelist = /* @__PURE__ */ new Set([...builtwithData, ...ciscoData, ...trancoData]);
    } catch (cause) {
      throw new Error("Error while loading whitelist data!", { cause });
    }
    console.log(`Successfully loaded ${whitelist.size} whitelisted domains.`);
  }
  function subscribeToOnTabLoaded() {
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      antiPhishingPipeline(tab);
    });
  }
  function subscribeToOnTabSelected() {
    browser.tabs.onActivated.addListener(async ({ tabId }) => {
      const tab = await browser.tabs.get(tabId);
      antiPhishingPipeline(tab);
    });
  }
  function checkTab(tab) {
    if (tab.status !== "complete" || !tab.active) {
      return false;
    }
    if (tab.url && tab.url.startsWith("https://")) {
      return true;
    }
    if (tab.url && tab.url.startsWith("http://")) {
      return true;
    }
    return false;
  }
  function getHostnameFromTabUrl(tabUrl) {
    let url;
    try {
      url = new URL(tabUrl);
    } catch (cause) {
      throw new Error("Failed to parse tab url!", { cause });
    }
    if (url.hostname && (url.protocol === "http:" || url.protocol === "https:")) {
      return url.hostname.startsWith("www.") ? url.hostname.substring(4) : url.hostname;
    }
    throw new Error(`Protocol ${url.protocol} is not supported!`);
  }
  function checkBlacklist(urlHostname) {
    let phishing = false;
    const startTime = performance.now();
    if (blacklist.has(urlHostname)) {
      phishing = true;
    }
    const totalTime = Math.floor(performance.now() - startTime);
    console.log(`Black list check done in ${totalTime} ms.`);
    return phishing;
  }
  function checkWhitelist(urlHostname) {
    let legit = false;
    const startTime = performance.now();
    if (whitelist.has(urlHostname)) {
      legit = true;
    }
    const totalTime = Math.floor(performance.now() - startTime);
    console.log(`White list check done in ${totalTime} ms.`);
    return legit;
  }
  async function takeScreenshot(windowId) {
    const maxAttempts = 3;
    const delayMs = 500;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        const screenshot = await browser.tabs.captureVisibleTab(windowId, {
          format: "png"
        });
        if (screenshot) {
          return screenshot;
        }
      } catch (e) {
        console.log(e);
      }
    }
    throw new Error("Failed to capture screenshot after multiple attempts!");
  }
  function getPageLanguages(tabId) {
    return sendMessage("getPageLanguages", void 0, tabId);
  }
  async function antiPhishingPipeline(tab) {
    if (!tab.id || !tab.url || !checkTab(tab)) {
      return;
    }
    const urlHostname = getHostnameFromTabUrl(tab.url);
    if (checkedWebsites[tab.url] === "dangerous" || checkBlacklist(urlHostname)) {
      checkedWebsites[tab.url] = "dangerous";
      console.log("DANGER!");
      return;
    }
    if (checkedWebsites[tab.url] === "safe" || checkWhitelist(urlHostname)) {
      checkedWebsites[tab.url] = "safe";
      console.log("OK!");
      return;
    }
    const [screenshot, pageLanguages] = await Promise.all([
      takeScreenshot(tab.windowId),
      getPageLanguages(tab.id)
    ]);
    console.log(screenshot);
    console.log(pageLanguages);
  }
  background;

  function initPlugins() {

  }

  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = `${"ws:"}//${"localhost"}:${3e3}`;
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws?.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      const hasJs = contentScript.js?.find((js) => cs.js?.includes(js));
      const hasCss = contentScript.css?.find((css) => cs.css?.includes(css));
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url)
        return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;

  return result$1;

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9zZXJpYWxpemUtZXJyb3IvZXJyb3ItY29uc3RydWN0b3JzLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3NlcmlhbGl6ZS1lcnJvci9pbmRleC5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWVzc2FnaW5nL2xpYi9jaHVuay1CUUxGU0ZGWi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWVzc2FnaW5nL25vZGVfbW9kdWxlcy93ZWJleHRlbnNpb24tcG9seWZpbGwvZGlzdC9icm93c2VyLXBvbHlmaWxsLmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tZXNzYWdpbmcvbGliL2luZGV4LmpzIiwiLi4vLi4vc3JjL3V0aWxzL21lc3NhZ2luZy50cyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIiwiLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSAoXG4gIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZCA9PSBudWxsID8gZ2xvYmFsVGhpcy5jaHJvbWUgOiAoXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICAgIGdsb2JhbFRoaXMuYnJvd3NlclxuICApXG4pO1xuIiwiY29uc3QgbGlzdCA9IFtcblx0Ly8gTmF0aXZlIEVTIGVycm9ycyBodHRwczovLzI2Mi5lY21hLWludGVybmF0aW9uYWwub3JnLzEyLjAvI3NlYy13ZWxsLWtub3duLWludHJpbnNpYy1vYmplY3RzXG5cdEV2YWxFcnJvcixcblx0UmFuZ2VFcnJvcixcblx0UmVmZXJlbmNlRXJyb3IsXG5cdFN5bnRheEVycm9yLFxuXHRUeXBlRXJyb3IsXG5cdFVSSUVycm9yLFxuXG5cdC8vIEJ1aWx0LWluIGVycm9yc1xuXHRnbG9iYWxUaGlzLkRPTUV4Y2VwdGlvbixcblxuXHQvLyBOb2RlLXNwZWNpZmljIGVycm9yc1xuXHQvLyBodHRwczovL25vZGVqcy5vcmcvYXBpL2Vycm9ycy5odG1sXG5cdGdsb2JhbFRoaXMuQXNzZXJ0aW9uRXJyb3IsXG5cdGdsb2JhbFRoaXMuU3lzdGVtRXJyb3IsXG5dXG5cdC8vIE5vbi1uYXRpdmUgRXJyb3JzIGFyZSB1c2VkIHdpdGggYGdsb2JhbFRoaXNgIGJlY2F1c2UgdGhleSBtaWdodCBiZSBtaXNzaW5nLiBUaGlzIGZpbHRlciBkcm9wcyB0aGVtIHdoZW4gdW5kZWZpbmVkLlxuXHQuZmlsdGVyKEJvb2xlYW4pXG5cdC5tYXAoXG5cdFx0Y29uc3RydWN0b3IgPT4gW2NvbnN0cnVjdG9yLm5hbWUsIGNvbnN0cnVjdG9yXSxcblx0KTtcblxuY29uc3QgZXJyb3JDb25zdHJ1Y3RvcnMgPSBuZXcgTWFwKGxpc3QpO1xuXG5leHBvcnQgZGVmYXVsdCBlcnJvckNvbnN0cnVjdG9ycztcbiIsImltcG9ydCBlcnJvckNvbnN0cnVjdG9ycyBmcm9tICcuL2Vycm9yLWNvbnN0cnVjdG9ycy5qcyc7XG5cbmV4cG9ydCBjbGFzcyBOb25FcnJvciBleHRlbmRzIEVycm9yIHtcblx0bmFtZSA9ICdOb25FcnJvcic7XG5cblx0Y29uc3RydWN0b3IobWVzc2FnZSkge1xuXHRcdHN1cGVyKE5vbkVycm9yLl9wcmVwYXJlU3VwZXJNZXNzYWdlKG1lc3NhZ2UpKTtcblx0fVxuXG5cdHN0YXRpYyBfcHJlcGFyZVN1cGVyTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcblx0XHR9IGNhdGNoIHtcblx0XHRcdHJldHVybiBTdHJpbmcobWVzc2FnZSk7XG5cdFx0fVxuXHR9XG59XG5cbmNvbnN0IGNvbW1vblByb3BlcnRpZXMgPSBbXG5cdHtcblx0XHRwcm9wZXJ0eTogJ25hbWUnLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdtZXNzYWdlJyxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0fSxcblx0e1xuXHRcdHByb3BlcnR5OiAnc3RhY2snLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdjb2RlJyxcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdjYXVzZScsXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdH0sXG5dO1xuXG5jb25zdCB0b0pzb25XYXNDYWxsZWQgPSBuZXcgV2Vha1NldCgpO1xuXG5jb25zdCB0b0pTT04gPSBmcm9tID0+IHtcblx0dG9Kc29uV2FzQ2FsbGVkLmFkZChmcm9tKTtcblx0Y29uc3QganNvbiA9IGZyb20udG9KU09OKCk7XG5cdHRvSnNvbldhc0NhbGxlZC5kZWxldGUoZnJvbSk7XG5cdHJldHVybiBqc29uO1xufTtcblxuY29uc3QgZ2V0RXJyb3JDb25zdHJ1Y3RvciA9IG5hbWUgPT4gZXJyb3JDb25zdHJ1Y3RvcnMuZ2V0KG5hbWUpID8/IEVycm9yO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuY29uc3QgZGVzdHJveUNpcmN1bGFyID0gKHtcblx0ZnJvbSxcblx0c2Vlbixcblx0dG8sXG5cdGZvcmNlRW51bWVyYWJsZSxcblx0bWF4RGVwdGgsXG5cdGRlcHRoLFxuXHR1c2VUb0pTT04sXG5cdHNlcmlhbGl6ZSxcbn0pID0+IHtcblx0aWYgKCF0bykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KGZyb20pKSB7XG5cdFx0XHR0byA9IFtdO1xuXHRcdH0gZWxzZSBpZiAoIXNlcmlhbGl6ZSAmJiBpc0Vycm9yTGlrZShmcm9tKSkge1xuXHRcdFx0Y29uc3QgRXJyb3IgPSBnZXRFcnJvckNvbnN0cnVjdG9yKGZyb20ubmFtZSk7XG5cdFx0XHR0byA9IG5ldyBFcnJvcigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0byA9IHt9O1xuXHRcdH1cblx0fVxuXG5cdHNlZW4ucHVzaChmcm9tKTtcblxuXHRpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcblx0XHRyZXR1cm4gdG87XG5cdH1cblxuXHRpZiAodXNlVG9KU09OICYmIHR5cGVvZiBmcm9tLnRvSlNPTiA9PT0gJ2Z1bmN0aW9uJyAmJiAhdG9Kc29uV2FzQ2FsbGVkLmhhcyhmcm9tKSkge1xuXHRcdHJldHVybiB0b0pTT04oZnJvbSk7XG5cdH1cblxuXHRjb25zdCBjb250aW51ZURlc3Ryb3lDaXJjdWxhciA9IHZhbHVlID0+IGRlc3Ryb3lDaXJjdWxhcih7XG5cdFx0ZnJvbTogdmFsdWUsXG5cdFx0c2VlbjogWy4uLnNlZW5dLFxuXHRcdGZvcmNlRW51bWVyYWJsZSxcblx0XHRtYXhEZXB0aCxcblx0XHRkZXB0aCxcblx0XHR1c2VUb0pTT04sXG5cdFx0c2VyaWFsaXplLFxuXHR9KTtcblxuXHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhmcm9tKSkge1xuXHRcdGlmICh2YWx1ZSAmJiB2YWx1ZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgJiYgdmFsdWUuY29uc3RydWN0b3IubmFtZSA9PT0gJ0J1ZmZlcicpIHtcblx0XHRcdHRvW2tleV0gPSAnW29iamVjdCBCdWZmZXJdJztcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdC8vIFRPRE86IFVzZSBgc3RyZWFtLmlzUmVhZGFibGUoKWAgd2hlbiB0YXJnZXRpbmcgTm9kZS5qcyAxOC5cblx0XHRpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUucGlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0dG9ba2V5XSA9ICdbb2JqZWN0IFN0cmVhbV0nO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSB7XG5cdFx0XHQvLyBHcmFjZWZ1bGx5IGhhbmRsZSBub24tY29uZmlndXJhYmxlIGVycm9ycyBsaWtlIGBET01FeGNlcHRpb25gLlxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dG9ba2V5XSA9IHZhbHVlO1xuXHRcdFx0fSBjYXRjaCB7fVxuXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRpZiAoIXNlZW4uaW5jbHVkZXMoZnJvbVtrZXldKSkge1xuXHRcdFx0ZGVwdGgrKztcblx0XHRcdHRvW2tleV0gPSBjb250aW51ZURlc3Ryb3lDaXJjdWxhcihmcm9tW2tleV0pO1xuXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHR0b1trZXldID0gJ1tDaXJjdWxhcl0nO1xuXHR9XG5cblx0Zm9yIChjb25zdCB7cHJvcGVydHksIGVudW1lcmFibGV9IG9mIGNvbW1vblByb3BlcnRpZXMpIHtcblx0XHRpZiAodHlwZW9mIGZyb21bcHJvcGVydHldICE9PSAndW5kZWZpbmVkJyAmJiBmcm9tW3Byb3BlcnR5XSAhPT0gbnVsbCkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRvLCBwcm9wZXJ0eSwge1xuXHRcdFx0XHR2YWx1ZTogaXNFcnJvckxpa2UoZnJvbVtwcm9wZXJ0eV0pID8gY29udGludWVEZXN0cm95Q2lyY3VsYXIoZnJvbVtwcm9wZXJ0eV0pIDogZnJvbVtwcm9wZXJ0eV0sXG5cdFx0XHRcdGVudW1lcmFibGU6IGZvcmNlRW51bWVyYWJsZSA/IHRydWUgOiBlbnVtZXJhYmxlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUVycm9yKHZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3Qge1xuXHRcdG1heERlcHRoID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuXHRcdHVzZVRvSlNPTiA9IHRydWUsXG5cdH0gPSBvcHRpb25zO1xuXG5cdGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG5cdFx0cmV0dXJuIGRlc3Ryb3lDaXJjdWxhcih7XG5cdFx0XHRmcm9tOiB2YWx1ZSxcblx0XHRcdHNlZW46IFtdLFxuXHRcdFx0Zm9yY2VFbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0bWF4RGVwdGgsXG5cdFx0XHRkZXB0aDogMCxcblx0XHRcdHVzZVRvSlNPTixcblx0XHRcdHNlcmlhbGl6ZTogdHJ1ZSxcblx0XHR9KTtcblx0fVxuXG5cdC8vIFBlb3BsZSBzb21ldGltZXMgdGhyb3cgdGhpbmdzIGJlc2lkZXMgRXJyb3Igb2JqZWN0c+KAplxuXHRpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Ly8gYEpTT04uc3RyaW5naWZ5KClgIGRpc2NhcmRzIGZ1bmN0aW9ucy4gV2UgZG8gdG9vLCB1bmxlc3MgYSBmdW5jdGlvbiBpcyB0aHJvd24gZGlyZWN0bHkuXG5cdFx0Ly8gV2UgaW50ZW50aW9uYWxseSB1c2UgYHx8YCBiZWNhdXNlIGAubmFtZWAgaXMgYW4gZW1wdHkgc3RyaW5nIGZvciBhbm9ueW1vdXMgZnVuY3Rpb25zLlxuXHRcdHJldHVybiBgW0Z1bmN0aW9uOiAke3ZhbHVlLm5hbWUgfHwgJ2Fub255bW91cyd9XWA7XG5cdH1cblxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZUVycm9yKHZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3Qge21heERlcHRoID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZfSA9IG9wdGlvbnM7XG5cblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHRpZiAoaXNNaW5pbXVtVmlhYmxlU2VyaWFsaXplZEVycm9yKHZhbHVlKSkge1xuXHRcdGNvbnN0IEVycm9yID0gZ2V0RXJyb3JDb25zdHJ1Y3Rvcih2YWx1ZS5uYW1lKTtcblx0XHRyZXR1cm4gZGVzdHJveUNpcmN1bGFyKHtcblx0XHRcdGZyb206IHZhbHVlLFxuXHRcdFx0c2VlbjogW10sXG5cdFx0XHR0bzogbmV3IEVycm9yKCksXG5cdFx0XHRtYXhEZXB0aCxcblx0XHRcdGRlcHRoOiAwLFxuXHRcdFx0c2VyaWFsaXplOiBmYWxzZSxcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiBuZXcgTm9uRXJyb3IodmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFcnJvckxpa2UodmFsdWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odmFsdWUpXG5cdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0JiYgJ25hbWUnIGluIHZhbHVlXG5cdCYmICdtZXNzYWdlJyBpbiB2YWx1ZVxuXHQmJiAnc3RhY2snIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpc01pbmltdW1WaWFibGVTZXJpYWxpemVkRXJyb3IodmFsdWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odmFsdWUpXG5cdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0JiYgJ21lc3NhZ2UnIGluIHZhbHVlXG5cdCYmICFBcnJheS5pc0FycmF5KHZhbHVlKTtcbn1cblxuZXhwb3J0IHtkZWZhdWx0IGFzIGVycm9yQ29uc3RydWN0b3JzfSBmcm9tICcuL2Vycm9yLWNvbnN0cnVjdG9ycy5qcyc7XG4iLCJ2YXIgX19kZWZQcm9wID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xudmFyIF9fZGVmUHJvcHMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbnZhciBfX2dldE93blByb3BEZXNjcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzO1xudmFyIF9fZ2V0T3duUHJvcFN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIF9faGFzT3duUHJvcCA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgX19wcm9wSXNFbnVtID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcbnZhciBfX2RlZk5vcm1hbFByb3AgPSAob2JqLCBrZXksIHZhbHVlKSA9PiBrZXkgaW4gb2JqID8gX19kZWZQcm9wKG9iaiwga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUsIHZhbHVlIH0pIDogb2JqW2tleV0gPSB2YWx1ZTtcbnZhciBfX3NwcmVhZFZhbHVlcyA9IChhLCBiKSA9PiB7XG4gIGZvciAodmFyIHByb3AgaW4gYiB8fCAoYiA9IHt9KSlcbiAgICBpZiAoX19oYXNPd25Qcm9wLmNhbGwoYiwgcHJvcCkpXG4gICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gIGlmIChfX2dldE93blByb3BTeW1ib2xzKVxuICAgIGZvciAodmFyIHByb3Agb2YgX19nZXRPd25Qcm9wU3ltYm9scyhiKSkge1xuICAgICAgaWYgKF9fcHJvcElzRW51bS5jYWxsKGIsIHByb3ApKVxuICAgICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gICAgfVxuICByZXR1cm4gYTtcbn07XG52YXIgX19zcHJlYWRQcm9wcyA9IChhLCBiKSA9PiBfX2RlZlByb3BzKGEsIF9fZ2V0T3duUHJvcERlc2NzKGIpKTtcbnZhciBfX29ialJlc3QgPSAoc291cmNlLCBleGNsdWRlKSA9PiB7XG4gIHZhciB0YXJnZXQgPSB7fTtcbiAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpXG4gICAgaWYgKF9faGFzT3duUHJvcC5jYWxsKHNvdXJjZSwgcHJvcCkgJiYgZXhjbHVkZS5pbmRleE9mKHByb3ApIDwgMClcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgaWYgKHNvdXJjZSAhPSBudWxsICYmIF9fZ2V0T3duUHJvcFN5bWJvbHMpXG4gICAgZm9yICh2YXIgcHJvcCBvZiBfX2dldE93blByb3BTeW1ib2xzKHNvdXJjZSkpIHtcbiAgICAgIGlmIChleGNsdWRlLmluZGV4T2YocHJvcCkgPCAwICYmIF9fcHJvcElzRW51bS5jYWxsKHNvdXJjZSwgcHJvcCkpXG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xudmFyIF9fYXN5bmMgPSAoX190aGlzLCBfX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGZ1bGZpbGxlZCA9ICh2YWx1ZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgcmVqZWN0ZWQgPSAodmFsdWUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0ZXAoZ2VuZXJhdG9yLnRocm93KHZhbHVlKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzdGVwID0gKHgpID0+IHguZG9uZSA/IHJlc29sdmUoeC52YWx1ZSkgOiBQcm9taXNlLnJlc29sdmUoeC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTtcbiAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkoX190aGlzLCBfX2FyZ3VtZW50cykpLm5leHQoKSk7XG4gIH0pO1xufTtcblxuLy8gc3JjL2dlbmVyaWMudHNcbmltcG9ydCB7IHNlcmlhbGl6ZUVycm9yLCBkZXNlcmlhbGl6ZUVycm9yIH0gZnJvbSBcInNlcmlhbGl6ZS1lcnJvclwiO1xuZnVuY3Rpb24gZGVmaW5lR2VuZXJpY01lc3NhbmdpbmcoY29uZmlnKSB7XG4gIGxldCByZW1vdmVSb290TGlzdGVuZXI7XG4gIGxldCBwZXJUeXBlTGlzdGVuZXJzID0ge307XG4gIGZ1bmN0aW9uIGNsZWFudXBSb290TGlzdGVuZXIoKSB7XG4gICAgaWYgKE9iamVjdC5lbnRyaWVzKHBlclR5cGVMaXN0ZW5lcnMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmVtb3ZlUm9vdExpc3RlbmVyID09IG51bGwgPyB2b2lkIDAgOiByZW1vdmVSb290TGlzdGVuZXIoKTtcbiAgICAgIHJlbW92ZVJvb3RMaXN0ZW5lciA9IHZvaWQgMDtcbiAgICB9XG4gIH1cbiAgbGV0IGlkU2VxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMWU0KTtcbiAgZnVuY3Rpb24gZ2V0TmV4dElkKCkge1xuICAgIHJldHVybiBpZFNlcSsrO1xuICB9XG4gIHJldHVybiB7XG4gICAgc2VuZE1lc3NhZ2UodHlwZSwgZGF0YSwgLi4uYXJncykge1xuICAgICAgcmV0dXJuIF9fYXN5bmModGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgdmFyIF9hMiwgX2IsIF9jLCBfZDtcbiAgICAgICAgY29uc3QgX21lc3NhZ2UgPSB7XG4gICAgICAgICAgaWQ6IGdldE5leHRJZCgpLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IChfYiA9IHlpZWxkIChfYTIgPSBjb25maWcudmVyaWZ5TWVzc2FnZURhdGEpID09IG51bGwgPyB2b2lkIDAgOiBfYTIuY2FsbChjb25maWcsIF9tZXNzYWdlKSkgIT0gbnVsbCA/IF9iIDogX21lc3NhZ2U7XG4gICAgICAgIChfYyA9IGNvbmZpZy5sb2dnZXIpID09IG51bGwgPyB2b2lkIDAgOiBfYy5kZWJ1ZyhgW21lc3NhZ2luZ10gc2VuZE1lc3NhZ2Uge2lkPSR7bWVzc2FnZS5pZH19IFxcdTI1MDBcXHUxNDA1YCwgbWVzc2FnZSwgLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0geWllbGQgY29uZmlnLnNlbmRNZXNzYWdlKG1lc3NhZ2UsIC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCB7IHJlcywgZXJyIH0gPSByZXNwb25zZSAhPSBudWxsID8gcmVzcG9uc2UgOiB7IGVycjogbmV3IEVycm9yKFwiTm8gcmVzcG9uc2VcIikgfTtcbiAgICAgICAgKF9kID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9kLmRlYnVnKGBbbWVzc2FnaW5nXSBzZW5kTWVzc2FnZSB7aWQ9JHttZXNzYWdlLmlkfX0gXFx1MTQwQVxcdTI1MDBgLCB7IHJlcywgZXJyIH0pO1xuICAgICAgICBpZiAoZXJyICE9IG51bGwpXG4gICAgICAgICAgdGhyb3cgZGVzZXJpYWxpemVFcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBvbk1lc3NhZ2UodHlwZSwgb25SZWNlaXZlZCkge1xuICAgICAgdmFyIF9hMiwgX2IsIF9jO1xuICAgICAgaWYgKHJlbW92ZVJvb3RMaXN0ZW5lciA9PSBudWxsKSB7XG4gICAgICAgIChfYTIgPSBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2EyLmRlYnVnKFxuICAgICAgICAgIGBbbWVzc2FnaW5nXSBcIiR7dHlwZX1cIiBpbml0aWFsaXplZCB0aGUgbWVzc2FnZSBsaXN0ZW5lciBmb3IgdGhpcyBjb250ZXh0YFxuICAgICAgICApO1xuICAgICAgICByZW1vdmVSb290TGlzdGVuZXIgPSBjb25maWcuYWRkUm9vdExpc3RlbmVyKChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgdmFyIF9hMywgX2IyO1xuICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS50eXBlICE9IFwic3RyaW5nXCIgfHwgdHlwZW9mIG1lc3NhZ2UudGltZXN0YW1wICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmJyZWFrRXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXJyID0gRXJyb3IoXG4gICAgICAgICAgICAgIGBbbWVzc2FnaW5nXSBVbmtub3duIG1lc3NhZ2UgZm9ybWF0LCBtdXN0IGluY2x1ZGUgdGhlICd0eXBlJyAmICd0aW1lc3RhbXAnIGZpZWxkcywgcmVjZWl2ZWQ6ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgICAgICApfWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAoX2EzID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9hMy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgICAoX2IyID0gY29uZmlnID09IG51bGwgPyB2b2lkIDAgOiBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2IyLmRlYnVnKFwiW21lc3NhZ2luZ10gUmVjZWl2ZWQgbWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9IHBlclR5cGVMaXN0ZW5lcnNbbWVzc2FnZS50eXBlXTtcbiAgICAgICAgICBpZiAobGlzdGVuZXIgPT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICBjb25zdCByZXMgPSBsaXN0ZW5lcihtZXNzYWdlKTtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcykudGhlbigocmVzMikgPT4ge1xuICAgICAgICAgICAgdmFyIF9hNCwgX2IzO1xuICAgICAgICAgICAgcmV0dXJuIChfYjMgPSAoX2E0ID0gY29uZmlnLnZlcmlmeU1lc3NhZ2VEYXRhKSA9PSBudWxsID8gdm9pZCAwIDogX2E0LmNhbGwoY29uZmlnLCByZXMyKSkgIT0gbnVsbCA/IF9iMyA6IHJlczI7XG4gICAgICAgICAgfSkudGhlbigocmVzMikgPT4ge1xuICAgICAgICAgICAgdmFyIF9hNDtcbiAgICAgICAgICAgIChfYTQgPSBjb25maWcgPT0gbnVsbCA/IHZvaWQgMCA6IGNvbmZpZy5sb2dnZXIpID09IG51bGwgPyB2b2lkIDAgOiBfYTQuZGVidWcoYFttZXNzYWdpbmddIG9uTWVzc2FnZSB7aWQ9JHttZXNzYWdlLmlkfX0gXFx1MjUwMFxcdTE0MDVgLCB7IHJlczogcmVzMiB9KTtcbiAgICAgICAgICAgIHJldHVybiB7IHJlczogcmVzMiB9O1xuICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIHZhciBfYTQ7XG4gICAgICAgICAgICAoX2E0ID0gY29uZmlnID09IG51bGwgPyB2b2lkIDAgOiBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2E0LmRlYnVnKGBbbWVzc2FnaW5nXSBvbk1lc3NhZ2Uge2lkPSR7bWVzc2FnZS5pZH19IFxcdTI1MDBcXHUxNDA1YCwgeyBlcnIgfSk7XG4gICAgICAgICAgICByZXR1cm4geyBlcnI6IHNlcmlhbGl6ZUVycm9yKGVycikgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAocGVyVHlwZUxpc3RlbmVyc1t0eXBlXSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IEVycm9yKFxuICAgICAgICAgIGBbbWVzc2FnaW5nXSBJbiB0aGlzIEpTIGNvbnRleHQsIG9ubHkgb25lIGxpc3RlbmVyIGNhbiBiZSBzZXR1cCBmb3IgJHt0eXBlfWBcbiAgICAgICAgKTtcbiAgICAgICAgKF9iID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9iLmVycm9yKGVycik7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIHBlclR5cGVMaXN0ZW5lcnNbdHlwZV0gPSBvblJlY2VpdmVkO1xuICAgICAgKF9jID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9jLmxvZyhgW21lc3NhZ2luZ10gQWRkZWQgbGlzdGVuZXIgZm9yICR7dHlwZX1gKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwZXJUeXBlTGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICBjbGVhbnVwUm9vdExpc3RlbmVyKCk7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVtb3ZlQWxsTGlzdGVuZXJzKCkge1xuICAgICAgT2JqZWN0LmtleXMocGVyVHlwZUxpc3RlbmVycykuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICBkZWxldGUgcGVyVHlwZUxpc3RlbmVyc1t0eXBlXTtcbiAgICAgIH0pO1xuICAgICAgY2xlYW51cFJvb3RMaXN0ZW5lcigpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IHtcbiAgX19zcHJlYWRWYWx1ZXMsXG4gIF9fc3ByZWFkUHJvcHMsXG4gIF9fb2JqUmVzdCxcbiAgX19hc3luYyxcbiAgZGVmaW5lR2VuZXJpY01lc3Nhbmdpbmdcbn07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoXCJ3ZWJleHRlbnNpb24tcG9seWZpbGxcIiwgW1wibW9kdWxlXCJdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGZhY3RvcnkobW9kdWxlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbW9kID0ge1xuICAgICAgZXhwb3J0czoge31cbiAgICB9O1xuICAgIGZhY3RvcnkobW9kKTtcbiAgICBnbG9iYWwuYnJvd3NlciA9IG1vZC5leHBvcnRzO1xuICB9XG59KSh0eXBlb2YgZ2xvYmFsVGhpcyAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0aGlzLCBmdW5jdGlvbiAobW9kdWxlKSB7XG4gIC8qIHdlYmV4dGVuc2lvbi1wb2x5ZmlsbCAtIHYwLjEwLjAgLSBGcmkgQXVnIDEyIDIwMjIgMTk6NDI6NDQgKi9cblxuICAvKiAtKi0gTW9kZTogaW5kZW50LXRhYnMtbW9kZTogbmlsOyBqcy1pbmRlbnQtbGV2ZWw6IDIgLSotICovXG5cbiAgLyogdmltOiBzZXQgc3RzPTIgc3c9MiBldCB0dz04MDogKi9cblxuICAvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gICAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAgICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy4gKi9cbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgaWYgKCFnbG9iYWxUaGlzLmNocm9tZT8ucnVudGltZT8uaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHNjcmlwdCBzaG91bGQgb25seSBiZSBsb2FkZWQgaW4gYSBicm93c2VyIGV4dGVuc2lvbi5cIik7XG4gIH1cblxuICBpZiAodHlwZW9mIGdsb2JhbFRoaXMuYnJvd3NlciA9PT0gXCJ1bmRlZmluZWRcIiB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsVGhpcy5icm93c2VyKSAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIGNvbnN0IENIUk9NRV9TRU5EX01FU1NBR0VfQ0FMTEJBQ0tfTk9fUkVTUE9OU0VfTUVTU0FHRSA9IFwiVGhlIG1lc3NhZ2UgcG9ydCBjbG9zZWQgYmVmb3JlIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkLlwiOyAvLyBXcmFwcGluZyB0aGUgYnVsayBvZiB0aGlzIHBvbHlmaWxsIGluIGEgb25lLXRpbWUtdXNlIGZ1bmN0aW9uIGlzIGEgbWlub3JcbiAgICAvLyBvcHRpbWl6YXRpb24gZm9yIEZpcmVmb3guIFNpbmNlIFNwaWRlcm1vbmtleSBkb2VzIG5vdCBmdWxseSBwYXJzZSB0aGVcbiAgICAvLyBjb250ZW50cyBvZiBhIGZ1bmN0aW9uIHVudGlsIHRoZSBmaXJzdCB0aW1lIGl0J3MgY2FsbGVkLCBhbmQgc2luY2UgaXQgd2lsbFxuICAgIC8vIG5ldmVyIGFjdHVhbGx5IG5lZWQgdG8gYmUgY2FsbGVkLCB0aGlzIGFsbG93cyB0aGUgcG9seWZpbGwgdG8gYmUgaW5jbHVkZWRcbiAgICAvLyBpbiBGaXJlZm94IG5lYXJseSBmb3IgZnJlZS5cblxuICAgIGNvbnN0IHdyYXBBUElzID0gZXh0ZW5zaW9uQVBJcyA9PiB7XG4gICAgICAvLyBOT1RFOiBhcGlNZXRhZGF0YSBpcyBhc3NvY2lhdGVkIHRvIHRoZSBjb250ZW50IG9mIHRoZSBhcGktbWV0YWRhdGEuanNvbiBmaWxlXG4gICAgICAvLyBhdCBidWlsZCB0aW1lIGJ5IHJlcGxhY2luZyB0aGUgZm9sbG93aW5nIFwiaW5jbHVkZVwiIHdpdGggdGhlIGNvbnRlbnQgb2YgdGhlXG4gICAgICAvLyBKU09OIGZpbGUuXG4gICAgICBjb25zdCBhcGlNZXRhZGF0YSA9IHtcbiAgICAgICAgXCJhbGFybXNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjbGVhckFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImJvb2ttYXJrc1wiOiB7XG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDaGlsZHJlblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFJlY2VudFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFN1YlRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUcmVlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwibW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZWFyY2hcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJicm93c2VyQWN0aW9uXCI6IHtcbiAgICAgICAgICBcImRpc2FibGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJlbmFibGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEJhZGdlVGV4dFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJvcGVuUG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEJhZGdlVGV4dFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEljb25cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRQb3B1cFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFRpdGxlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYnJvd3NpbmdEYXRhXCI6IHtcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUNhY2hlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlQ29va2llc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZURvd25sb2Fkc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUZvcm1EYXRhXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlSGlzdG9yeVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUxvY2FsU3RvcmFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVBhc3N3b3Jkc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVBsdWdpbkRhdGFcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvbW1hbmRzXCI6IHtcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvbnRleHRNZW51c1wiOiB7XG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJjb29raWVzXCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbENvb2tpZVN0b3Jlc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImRldnRvb2xzXCI6IHtcbiAgICAgICAgICBcImluc3BlY3RlZFdpbmRvd1wiOiB7XG4gICAgICAgICAgICBcImV2YWxcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDIsXG4gICAgICAgICAgICAgIFwic2luZ2xlQ2FsbGJhY2tBcmdcIjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicGFuZWxzXCI6IHtcbiAgICAgICAgICAgIFwiY3JlYXRlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDMsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzLFxuICAgICAgICAgICAgICBcInNpbmdsZUNhbGxiYWNrQXJnXCI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImVsZW1lbnRzXCI6IHtcbiAgICAgICAgICAgICAgXCJjcmVhdGVTaWRlYmFyUGFuZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJkb3dubG9hZHNcIjoge1xuICAgICAgICAgIFwiY2FuY2VsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZG93bmxvYWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJlcmFzZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEZpbGVJY29uXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3BlblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInBhdXNlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRmlsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlc3VtZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNob3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJleHRlbnNpb25cIjoge1xuICAgICAgICAgIFwiaXNBbGxvd2VkRmlsZVNjaGVtZUFjY2Vzc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImlzQWxsb3dlZEluY29nbml0b0FjY2Vzc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImhpc3RvcnlcIjoge1xuICAgICAgICAgIFwiYWRkVXJsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGVsZXRlQWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGVsZXRlUmFuZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVVcmxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRWaXNpdHNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZWFyY2hcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpMThuXCI6IHtcbiAgICAgICAgICBcImRldGVjdExhbmd1YWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWNjZXB0TGFuZ3VhZ2VzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiaWRlbnRpdHlcIjoge1xuICAgICAgICAgIFwibGF1bmNoV2ViQXV0aEZsb3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpZGxlXCI6IHtcbiAgICAgICAgICBcInF1ZXJ5U3RhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtYW5hZ2VtZW50XCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFNlbGZcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRFbmFibGVkXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidW5pbnN0YWxsU2VsZlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm5vdGlmaWNhdGlvbnNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRQZXJtaXNzaW9uTGV2ZWxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWdlQWN0aW9uXCI6IHtcbiAgICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJoaWRlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0SWNvblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzaG93XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGVybWlzc2lvbnNcIjoge1xuICAgICAgICAgIFwiY29udGFpbnNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZXF1ZXN0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicnVudGltZVwiOiB7XG4gICAgICAgICAgXCJnZXRCYWNrZ3JvdW5kUGFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBsYXRmb3JtSW5mb1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm9wZW5PcHRpb25zUGFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlcXVlc3RVcGRhdGVDaGVja1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlbmRNZXNzYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDNcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VuZE5hdGl2ZU1lc3NhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRVbmluc3RhbGxVUkxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXNzaW9uc1wiOiB7XG4gICAgICAgICAgXCJnZXREZXZpY2VzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UmVjZW50bHlDbG9zZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZXN0b3JlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3RvcmFnZVwiOiB7XG4gICAgICAgICAgXCJsb2NhbFwiOiB7XG4gICAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm1hbmFnZWRcIjoge1xuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic3luY1wiOiB7XG4gICAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRhYnNcIjoge1xuICAgICAgICAgIFwiY2FwdHVyZVZpc2libGVUYWJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZXRlY3RMYW5ndWFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRpc2NhcmRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkdXBsaWNhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJleGVjdXRlU2NyaXB0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Q3VycmVudFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFpvb21cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRab29tU2V0dGluZ3NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnb0JhY2tcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnb0ZvcndhcmRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJoaWdobGlnaHRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJpbnNlcnRDU1NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicXVlcnlcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZWxvYWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVDU1NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZW5kTWVzc2FnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFpvb21cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRab29tU2V0dGluZ3NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b3BTaXRlc1wiOiB7XG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3ZWJOYXZpZ2F0aW9uXCI6IHtcbiAgICAgICAgICBcImdldEFsbEZyYW1lc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEZyYW1lXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwid2ViUmVxdWVzdFwiOiB7XG4gICAgICAgICAgXCJoYW5kbGVyQmVoYXZpb3JDaGFuZ2VkXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwid2luZG93c1wiOiB7XG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0TGFzdEZvY3VzZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKGFwaU1ldGFkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXBpLW1ldGFkYXRhLmpzb24gaGFzIG5vdCBiZWVuIGluY2x1ZGVkIGluIGJyb3dzZXItcG9seWZpbGxcIik7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEEgV2Vha01hcCBzdWJjbGFzcyB3aGljaCBjcmVhdGVzIGFuZCBzdG9yZXMgYSB2YWx1ZSBmb3IgYW55IGtleSB3aGljaCBkb2VzXG4gICAgICAgKiBub3QgZXhpc3Qgd2hlbiBhY2Nlc3NlZCwgYnV0IGJlaGF2ZXMgZXhhY3RseSBhcyBhbiBvcmRpbmFyeSBXZWFrTWFwXG4gICAgICAgKiBvdGhlcndpc2UuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY3JlYXRlSXRlbVxuICAgICAgICogICAgICAgIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgaW4gb3JkZXIgdG8gY3JlYXRlIHRoZSB2YWx1ZSBmb3IgYW55XG4gICAgICAgKiAgICAgICAga2V5IHdoaWNoIGRvZXMgbm90IGV4aXN0LCB0aGUgZmlyc3QgdGltZSBpdCBpcyBhY2Nlc3NlZC4gVGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gcmVjZWl2ZXMsIGFzIGl0cyBvbmx5IGFyZ3VtZW50LCB0aGUga2V5IGJlaW5nIGNyZWF0ZWQuXG4gICAgICAgKi9cblxuXG4gICAgICBjbGFzcyBEZWZhdWx0V2Vha01hcCBleHRlbmRzIFdlYWtNYXAge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVJdGVtLCBpdGVtcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN1cGVyKGl0ZW1zKTtcbiAgICAgICAgICB0aGlzLmNyZWF0ZUl0ZW0gPSBjcmVhdGVJdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2V0KGtleSkge1xuICAgICAgICAgIGlmICghdGhpcy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoa2V5LCB0aGlzLmNyZWF0ZUl0ZW0oa2V5KSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHN1cGVyLmdldChrZXkpO1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gb2JqZWN0IHdpdGggYSBgdGhlbmAgbWV0aG9kLCBhbmQgY2FuXG4gICAgICAgKiB0aGVyZWZvcmUgYmUgYXNzdW1lZCB0byBiZWhhdmUgYXMgYSBQcm9taXNlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHRlc3QuXG4gICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdGhlbmFibGUuXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCBpc1RoZW5hYmxlID0gdmFsdWUgPT4ge1xuICAgICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSBcImZ1bmN0aW9uXCI7XG4gICAgICB9O1xuICAgICAgLyoqXG4gICAgICAgKiBDcmVhdGVzIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gd2hpY2gsIHdoZW4gY2FsbGVkLCB3aWxsIHJlc29sdmUgb3IgcmVqZWN0XG4gICAgICAgKiB0aGUgZ2l2ZW4gcHJvbWlzZSBiYXNlZCBvbiBob3cgaXQgaXMgY2FsbGVkOlxuICAgICAgICpcbiAgICAgICAqIC0gSWYsIHdoZW4gY2FsbGVkLCBgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yYCBjb250YWlucyBhIG5vbi1udWxsIG9iamVjdCxcbiAgICAgICAqICAgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCB0aGF0IHZhbHVlLlxuICAgICAgICogLSBJZiB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggZXhhY3RseSBvbmUgYXJndW1lbnQsIHRoZSBwcm9taXNlIGlzXG4gICAgICAgKiAgIHJlc29sdmVkIHRvIHRoYXQgdmFsdWUuXG4gICAgICAgKiAtIE90aGVyd2lzZSwgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgdG8gYW4gYXJyYXkgY29udGFpbmluZyBhbGwgb2YgdGhlXG4gICAgICAgKiAgIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwcm9taXNlXG4gICAgICAgKiAgICAgICAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJlc29sdXRpb24gYW5kIHJlamVjdGlvbiBmdW5jdGlvbnMgb2YgYVxuICAgICAgICogICAgICAgIHByb21pc2UuXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlc29sdmVcbiAgICAgICAqICAgICAgICBUaGUgcHJvbWlzZSdzIHJlc29sdXRpb24gZnVuY3Rpb24uXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlamVjdFxuICAgICAgICogICAgICAgIFRoZSBwcm9taXNlJ3MgcmVqZWN0aW9uIGZ1bmN0aW9uLlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGFkYXRhXG4gICAgICAgKiAgICAgICAgTWV0YWRhdGEgYWJvdXQgdGhlIHdyYXBwZWQgbWV0aG9kIHdoaWNoIGhhcyBjcmVhdGVkIHRoZSBjYWxsYmFjay5cbiAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbWV0YWRhdGEuc2luZ2xlQ2FsbGJhY2tBcmdcbiAgICAgICAqICAgICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIG9ubHkgdGhlIGZpcnN0XG4gICAgICAgKiAgICAgICAgYXJndW1lbnQgb2YgdGhlIGNhbGxiYWNrLCBhbHRlcm5hdGl2ZWx5IGFuIGFycmF5IG9mIGFsbCB0aGVcbiAgICAgICAqICAgICAgICBjYWxsYmFjayBhcmd1bWVudHMgaXMgcmVzb2x2ZWQuIEJ5IGRlZmF1bHQsIGlmIHRoZSBjYWxsYmFja1xuICAgICAgICogICAgICAgIGZ1bmN0aW9uIGlzIGludm9rZWQgd2l0aCBvbmx5IGEgc2luZ2xlIGFyZ3VtZW50LCB0aGF0IHdpbGwgYmVcbiAgICAgICAqICAgICAgICByZXNvbHZlZCB0byB0aGUgcHJvbWlzZSwgd2hpbGUgYWxsIGFyZ3VtZW50cyB3aWxsIGJlIHJlc29sdmVkIGFzXG4gICAgICAgKiAgICAgICAgYW4gYXJyYXkgaWYgbXVsdGlwbGUgYXJlIGdpdmVuLlxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn1cbiAgICAgICAqICAgICAgICBUaGUgZ2VuZXJhdGVkIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICovXG5cblxuICAgICAgY29uc3QgbWFrZUNhbGxiYWNrID0gKHByb21pc2UsIG1ldGFkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiAoLi4uY2FsbGJhY2tBcmdzKSA9PiB7XG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVqZWN0KG5ldyBFcnJvcihleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnIHx8IGNhbGxiYWNrQXJncy5sZW5ndGggPD0gMSAmJiBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShjYWxsYmFja0FyZ3NbMF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY2FsbGJhY2tBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwbHVyYWxpemVBcmd1bWVudHMgPSBudW1BcmdzID0+IG51bUFyZ3MgPT0gMSA/IFwiYXJndW1lbnRcIiA6IFwiYXJndW1lbnRzXCI7XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSB3cmFwcGVyIGZ1bmN0aW9uIGZvciBhIG1ldGhvZCB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBtZXRhZGF0YS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICogICAgICAgIFRoZSBuYW1lIG9mIHRoZSBtZXRob2Qgd2hpY2ggaXMgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhZGF0YVxuICAgICAgICogICAgICAgIE1ldGFkYXRhIGFib3V0IHRoZSBtZXRob2QgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7aW50ZWdlcn0gbWV0YWRhdGEubWluQXJnc1xuICAgICAgICogICAgICAgIFRoZSBtaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudHMgd2hpY2ggbXVzdCBiZSBwYXNzZWQgdG8gdGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24uIElmIGNhbGxlZCB3aXRoIGZld2VyIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtpbnRlZ2VyfSBtZXRhZGF0YS5tYXhBcmdzXG4gICAgICAgKiAgICAgICAgVGhlIG1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtYXkgYmUgcGFzc2VkIHRvIHRoZVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uLiBJZiBjYWxsZWQgd2l0aCBtb3JlIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtib29sZWFufSBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZ1xuICAgICAgICogICAgICAgIFdoZXRoZXIgb3Igbm90IHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggb25seSB0aGUgZmlyc3RcbiAgICAgICAqICAgICAgICBhcmd1bWVudCBvZiB0aGUgY2FsbGJhY2ssIGFsdGVybmF0aXZlbHkgYW4gYXJyYXkgb2YgYWxsIHRoZVxuICAgICAgICogICAgICAgIGNhbGxiYWNrIGFyZ3VtZW50cyBpcyByZXNvbHZlZC4gQnkgZGVmYXVsdCwgaWYgdGhlIGNhbGxiYWNrXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gaXMgaW52b2tlZCB3aXRoIG9ubHkgYSBzaW5nbGUgYXJndW1lbnQsIHRoYXQgd2lsbCBiZVxuICAgICAgICogICAgICAgIHJlc29sdmVkIHRvIHRoZSBwcm9taXNlLCB3aGlsZSBhbGwgYXJndW1lbnRzIHdpbGwgYmUgcmVzb2x2ZWQgYXNcbiAgICAgICAqICAgICAgICBhbiBhcnJheSBpZiBtdWx0aXBsZSBhcmUgZ2l2ZW4uXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge2Z1bmN0aW9uKG9iamVjdCwgLi4uKil9XG4gICAgICAgKiAgICAgICBUaGUgZ2VuZXJhdGVkIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCB3cmFwQXN5bmNGdW5jdGlvbiA9IChuYW1lLCBtZXRhZGF0YSkgPT4ge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYXN5bmNGdW5jdGlvbldyYXBwZXIodGFyZ2V0LCAuLi5hcmdzKSB7XG4gICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgbWV0YWRhdGEubWluQXJncykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtZXRhZGF0YS5tYXhBcmdzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChtZXRhZGF0YS5mYWxsYmFja1RvTm9DYWxsYmFjaykge1xuICAgICAgICAgICAgICAvLyBUaGlzIEFQSSBtZXRob2QgaGFzIGN1cnJlbnRseSBubyBjYWxsYmFjayBvbiBDaHJvbWUsIGJ1dCBpdCByZXR1cm4gYSBwcm9taXNlIG9uIEZpcmVmb3gsXG4gICAgICAgICAgICAgIC8vIGFuZCBzbyB0aGUgcG9seWZpbGwgd2lsbCB0cnkgdG8gY2FsbCBpdCB3aXRoIGEgY2FsbGJhY2sgZmlyc3QsIGFuZCBpdCB3aWxsIGZhbGxiYWNrXG4gICAgICAgICAgICAgIC8vIHRvIG5vdCBwYXNzaW5nIHRoZSBjYWxsYmFjayBpZiB0aGUgZmlyc3QgY2FsbCBmYWlscy5cbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgICByZWplY3RcbiAgICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChjYkVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGAke25hbWV9IEFQSSBtZXRob2QgZG9lc24ndCBzZWVtIHRvIHN1cHBvcnQgdGhlIGNhbGxiYWNrIHBhcmFtZXRlciwgYCArIFwiZmFsbGluZyBiYWNrIHRvIGNhbGwgaXQgd2l0aG91dCBhIGNhbGxiYWNrOiBcIiwgY2JFcnJvcik7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpOyAvLyBVcGRhdGUgdGhlIEFQSSBtZXRob2QgbWV0YWRhdGEsIHNvIHRoYXQgdGhlIG5leHQgQVBJIGNhbGxzIHdpbGwgbm90IHRyeSB0b1xuICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgdW5zdXBwb3J0ZWQgY2FsbGJhY2sgYW55bW9yZS5cblxuICAgICAgICAgICAgICAgIG1ldGFkYXRhLmZhbGxiYWNrVG9Ob0NhbGxiYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEubm9DYWxsYmFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLm5vQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICAgIC8qKlxuICAgICAgICogV3JhcHMgYW4gZXhpc3RpbmcgbWV0aG9kIG9mIHRoZSB0YXJnZXQgb2JqZWN0LCBzbyB0aGF0IGNhbGxzIHRvIGl0IGFyZVxuICAgICAgICogaW50ZXJjZXB0ZWQgYnkgdGhlIGdpdmVuIHdyYXBwZXIgZnVuY3Rpb24uIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHJlY2VpdmVzLFxuICAgICAgICogYXMgaXRzIGZpcnN0IGFyZ3VtZW50LCB0aGUgb3JpZ2luYWwgYHRhcmdldGAgb2JqZWN0LCBmb2xsb3dlZCBieSBlYWNoIG9mXG4gICAgICAgKiB0aGUgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgb3JpZ2luYWwgbWV0aG9kLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcbiAgICAgICAqICAgICAgICBUaGUgb3JpZ2luYWwgdGFyZ2V0IG9iamVjdCB0aGF0IHRoZSB3cmFwcGVkIG1ldGhvZCBiZWxvbmdzIHRvLlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gbWV0aG9kXG4gICAgICAgKiAgICAgICAgVGhlIG1ldGhvZCBiZWluZyB3cmFwcGVkLiBUaGlzIGlzIHVzZWQgYXMgdGhlIHRhcmdldCBvZiB0aGUgUHJveHlcbiAgICAgICAqICAgICAgICBvYmplY3Qgd2hpY2ggaXMgY3JlYXRlZCB0byB3cmFwIHRoZSBtZXRob2QuXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgVGhlIHdyYXBwZXIgZnVuY3Rpb24gd2hpY2ggaXMgY2FsbGVkIGluIHBsYWNlIG9mIGEgZGlyZWN0IGludm9jYXRpb25cbiAgICAgICAqICAgICAgICBvZiB0aGUgd3JhcHBlZCBtZXRob2QuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge1Byb3h5PGZ1bmN0aW9uPn1cbiAgICAgICAqICAgICAgICBBIFByb3h5IG9iamVjdCBmb3IgdGhlIGdpdmVuIG1ldGhvZCwgd2hpY2ggaW52b2tlcyB0aGUgZ2l2ZW4gd3JhcHBlclxuICAgICAgICogICAgICAgIG1ldGhvZCBpbiBpdHMgcGxhY2UuXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCB3cmFwTWV0aG9kID0gKHRhcmdldCwgbWV0aG9kLCB3cmFwcGVyKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkobWV0aG9kLCB7XG4gICAgICAgICAgYXBwbHkodGFyZ2V0TWV0aG9kLCB0aGlzT2JqLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gd3JhcHBlci5jYWxsKHRoaXNPYmosIHRhcmdldCwgLi4uYXJncyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgbGV0IGhhc093blByb3BlcnR5ID0gRnVuY3Rpb24uY2FsbC5iaW5kKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuICAgICAgLyoqXG4gICAgICAgKiBXcmFwcyBhbiBvYmplY3QgaW4gYSBQcm94eSB3aGljaCBpbnRlcmNlcHRzIGFuZCB3cmFwcyBjZXJ0YWluIG1ldGhvZHNcbiAgICAgICAqIGJhc2VkIG9uIHRoZSBnaXZlbiBgd3JhcHBlcnNgIGFuZCBgbWV0YWRhdGFgIG9iamVjdHMuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuICAgICAgICogICAgICAgIFRoZSB0YXJnZXQgb2JqZWN0IHRvIHdyYXAuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IFt3cmFwcGVycyA9IHt9XVxuICAgICAgICogICAgICAgIEFuIG9iamVjdCB0cmVlIGNvbnRhaW5pbmcgd3JhcHBlciBmdW5jdGlvbnMgZm9yIHNwZWNpYWwgY2FzZXMuIEFueVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uIHByZXNlbnQgaW4gdGhpcyBvYmplY3QgdHJlZSBpcyBjYWxsZWQgaW4gcGxhY2Ugb2YgdGhlXG4gICAgICAgKiAgICAgICAgbWV0aG9kIGluIHRoZSBzYW1lIGxvY2F0aW9uIGluIHRoZSBgdGFyZ2V0YCBvYmplY3QgdHJlZS4gVGhlc2VcbiAgICAgICAqICAgICAgICB3cmFwcGVyIG1ldGhvZHMgYXJlIGludm9rZWQgYXMgZGVzY3JpYmVkIGluIHtAc2VlIHdyYXBNZXRob2R9LlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbbWV0YWRhdGEgPSB7fV1cbiAgICAgICAqICAgICAgICBBbiBvYmplY3QgdHJlZSBjb250YWluaW5nIG1ldGFkYXRhIHVzZWQgdG8gYXV0b21hdGljYWxseSBnZW5lcmF0ZVxuICAgICAgICogICAgICAgIFByb21pc2UtYmFzZWQgd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFzeW5jaHJvbm91cy4gQW55IGZ1bmN0aW9uIGluXG4gICAgICAgKiAgICAgICAgdGhlIGB0YXJnZXRgIG9iamVjdCB0cmVlIHdoaWNoIGhhcyBhIGNvcnJlc3BvbmRpbmcgbWV0YWRhdGEgb2JqZWN0XG4gICAgICAgKiAgICAgICAgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGBtZXRhZGF0YWAgdHJlZSBpcyByZXBsYWNlZCB3aXRoIGFuXG4gICAgICAgKiAgICAgICAgYXV0b21hdGljYWxseS1nZW5lcmF0ZWQgd3JhcHBlciBmdW5jdGlvbiwgYXMgZGVzY3JpYmVkIGluXG4gICAgICAgKiAgICAgICAge0BzZWUgd3JhcEFzeW5jRnVuY3Rpb259XG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge1Byb3h5PG9iamVjdD59XG4gICAgICAgKi9cblxuICAgICAgY29uc3Qgd3JhcE9iamVjdCA9ICh0YXJnZXQsIHdyYXBwZXJzID0ge30sIG1ldGFkYXRhID0ge30pID0+IHtcbiAgICAgICAgbGV0IGNhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgbGV0IGhhbmRsZXJzID0ge1xuICAgICAgICAgIGhhcyhwcm94eVRhcmdldCwgcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3AgaW4gdGFyZ2V0IHx8IHByb3AgaW4gY2FjaGU7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGdldChwcm94eVRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjYWNoZVtwcm9wXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEocHJvcCBpbiB0YXJnZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHRhcmdldFtwcm9wXTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBtZXRob2Qgb24gdGhlIHVuZGVybHlpbmcgb2JqZWN0LiBDaGVjayBpZiB3ZSBuZWVkIHRvIGRvXG4gICAgICAgICAgICAgIC8vIGFueSB3cmFwcGluZy5cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB3cmFwcGVyc1twcm9wXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpYWwtY2FzZSB3cmFwcGVyIGZvciB0aGlzIG1ldGhvZC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBNZXRob2QodGFyZ2V0LCB0YXJnZXRbcHJvcF0sIHdyYXBwZXJzW3Byb3BdKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNPd25Qcm9wZXJ0eShtZXRhZGF0YSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGFzeW5jIG1ldGhvZCB0aGF0IHdlIGhhdmUgbWV0YWRhdGEgZm9yLiBDcmVhdGUgYVxuICAgICAgICAgICAgICAgIC8vIFByb21pc2Ugd3JhcHBlciBmb3IgaXQuXG4gICAgICAgICAgICAgICAgbGV0IHdyYXBwZXIgPSB3cmFwQXN5bmNGdW5jdGlvbihwcm9wLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwTWV0aG9kKHRhcmdldCwgdGFyZ2V0W3Byb3BdLCB3cmFwcGVyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgbWV0aG9kIHRoYXQgd2UgZG9uJ3Qga25vdyBvciBjYXJlIGFib3V0LiBSZXR1cm4gdGhlXG4gICAgICAgICAgICAgICAgLy8gb3JpZ2luYWwgbWV0aG9kLCBib3VuZCB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5iaW5kKHRhcmdldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmIChoYXNPd25Qcm9wZXJ0eSh3cmFwcGVycywgcHJvcCkgfHwgaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIHByb3ApKSkge1xuICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIG9iamVjdCB0aGF0IHdlIG5lZWQgdG8gZG8gc29tZSB3cmFwcGluZyBmb3IgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICAgIC8vIG9mLiBDcmVhdGUgYSBzdWItb2JqZWN0IHdyYXBwZXIgZm9yIGl0IHdpdGggdGhlIGFwcHJvcHJpYXRlIGNoaWxkXG4gICAgICAgICAgICAgIC8vIG1ldGFkYXRhLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBPYmplY3QodmFsdWUsIHdyYXBwZXJzW3Byb3BdLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc093blByb3BlcnR5KG1ldGFkYXRhLCBcIipcIikpIHtcbiAgICAgICAgICAgICAgLy8gV3JhcCBhbGwgcHJvcGVydGllcyBpbiAqIG5hbWVzcGFjZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwT2JqZWN0KHZhbHVlLCB3cmFwcGVyc1twcm9wXSwgbWV0YWRhdGFbXCIqXCJdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55IHdyYXBwaW5nIGZvciB0aGlzIHByb3BlcnR5LFxuICAgICAgICAgICAgICAvLyBzbyBqdXN0IGZvcndhcmQgYWxsIGFjY2VzcyB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2V0KHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc2V0KHByb3h5VGFyZ2V0LCBwcm9wLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgIGNhY2hlW3Byb3BdID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGRlZmluZVByb3BlcnR5KHByb3h5VGFyZ2V0LCBwcm9wLCBkZXNjKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwgZGVzYyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGRlbGV0ZVByb3BlcnR5KHByb3h5VGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eShjYWNoZSwgcHJvcCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH07IC8vIFBlciBjb250cmFjdCBvZiB0aGUgUHJveHkgQVBJLCB0aGUgXCJnZXRcIiBwcm94eSBoYW5kbGVyIG11c3QgcmV0dXJuIHRoZVxuICAgICAgICAvLyBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgdGFyZ2V0IGlmIHRoYXQgdmFsdWUgaXMgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZFxuICAgICAgICAvLyBub24tY29uZmlndXJhYmxlLiBGb3IgdGhpcyByZWFzb24sIHdlIGNyZWF0ZSBhbiBvYmplY3Qgd2l0aCB0aGVcbiAgICAgICAgLy8gcHJvdG90eXBlIHNldCB0byBgdGFyZ2V0YCBpbnN0ZWFkIG9mIHVzaW5nIGB0YXJnZXRgIGRpcmVjdGx5LlxuICAgICAgICAvLyBPdGhlcndpc2Ugd2UgY2Fubm90IHJldHVybiBhIGN1c3RvbSBvYmplY3QgZm9yIEFQSXMgdGhhdFxuICAgICAgICAvLyBhcmUgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZCBub24tY29uZmlndXJhYmxlLCBzdWNoIGFzIGBjaHJvbWUuZGV2dG9vbHNgLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgcHJveHkgaGFuZGxlcnMgdGhlbXNlbHZlcyB3aWxsIHN0aWxsIHVzZSB0aGUgb3JpZ2luYWwgYHRhcmdldGBcbiAgICAgICAgLy8gaW5zdGVhZCBvZiB0aGUgYHByb3h5VGFyZ2V0YCwgc28gdGhhdCB0aGUgbWV0aG9kcyBhbmQgcHJvcGVydGllcyBhcmVcbiAgICAgICAgLy8gZGVyZWZlcmVuY2VkIHZpYSB0aGUgb3JpZ2luYWwgdGFyZ2V0cy5cblxuICAgICAgICBsZXQgcHJveHlUYXJnZXQgPSBPYmplY3QuY3JlYXRlKHRhcmdldCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkocHJveHlUYXJnZXQsIGhhbmRsZXJzKTtcbiAgICAgIH07XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSBzZXQgb2Ygd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFuIGV2ZW50IG9iamVjdCwgd2hpY2ggaGFuZGxlc1xuICAgICAgICogd3JhcHBpbmcgb2YgbGlzdGVuZXIgZnVuY3Rpb25zIHRoYXQgdGhvc2UgbWVzc2FnZXMgYXJlIHBhc3NlZC5cbiAgICAgICAqXG4gICAgICAgKiBBIHNpbmdsZSB3cmFwcGVyIGlzIGNyZWF0ZWQgZm9yIGVhY2ggbGlzdGVuZXIgZnVuY3Rpb24sIGFuZCBzdG9yZWQgaW4gYVxuICAgICAgICogbWFwLiBTdWJzZXF1ZW50IGNhbGxzIHRvIGBhZGRMaXN0ZW5lcmAsIGBoYXNMaXN0ZW5lcmAsIG9yIGByZW1vdmVMaXN0ZW5lcmBcbiAgICAgICAqIHJldHJpZXZlIHRoZSBvcmlnaW5hbCB3cmFwcGVyLCBzbyB0aGF0ICBhdHRlbXB0cyB0byByZW1vdmUgYVxuICAgICAgICogcHJldmlvdXNseS1hZGRlZCBsaXN0ZW5lciB3b3JrIGFzIGV4cGVjdGVkLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7RGVmYXVsdFdlYWtNYXA8ZnVuY3Rpb24sIGZ1bmN0aW9uPn0gd3JhcHBlck1hcFxuICAgICAgICogICAgICAgIEEgRGVmYXVsdFdlYWtNYXAgb2JqZWN0IHdoaWNoIHdpbGwgY3JlYXRlIHRoZSBhcHByb3ByaWF0ZSB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgZm9yIGEgZ2l2ZW4gbGlzdGVuZXIgZnVuY3Rpb24gd2hlbiBvbmUgZG9lcyBub3QgZXhpc3QsIGFuZCByZXRyaWV2ZVxuICAgICAgICogICAgICAgIGFuIGV4aXN0aW5nIG9uZSB3aGVuIGl0IGRvZXMuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAqL1xuXG5cbiAgICAgIGNvbnN0IHdyYXBFdmVudCA9IHdyYXBwZXJNYXAgPT4gKHtcbiAgICAgICAgYWRkTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lciwgLi4uYXJncykge1xuICAgICAgICAgIHRhcmdldC5hZGRMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lciksIC4uLmFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhc0xpc3RlbmVyKHRhcmdldCwgbGlzdGVuZXIpIHtcbiAgICAgICAgICByZXR1cm4gdGFyZ2V0Lmhhc0xpc3RlbmVyKHdyYXBwZXJNYXAuZ2V0KGxpc3RlbmVyKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICAgIHRhcmdldC5yZW1vdmVMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lcikpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBvblJlcXVlc3RGaW5pc2hlZFdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhbiBvblJlcXVlc3RGaW5pc2hlZCBsaXN0ZW5lciBmdW5jdGlvbiBzbyB0aGF0IGl0IHdpbGwgcmV0dXJuIGFcbiAgICAgICAgICogYGdldENvbnRlbnQoKWAgcHJvcGVydHkgd2hpY2ggcmV0dXJucyBhIGBQcm9taXNlYCByYXRoZXIgdGhhbiB1c2luZyBhXG4gICAgICAgICAqIGNhbGxiYWNrIEFQSS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHJlcVxuICAgICAgICAgKiAgICAgICAgVGhlIEhBUiBlbnRyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBuZXR3b3JrIHJlcXVlc3QuXG4gICAgICAgICAqL1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uUmVxdWVzdEZpbmlzaGVkKHJlcSkge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRSZXEgPSB3cmFwT2JqZWN0KHJlcSwge31cbiAgICAgICAgICAvKiB3cmFwcGVycyAqL1xuICAgICAgICAgICwge1xuICAgICAgICAgICAgZ2V0Q29udGVudDoge1xuICAgICAgICAgICAgICBtaW5BcmdzOiAwLFxuICAgICAgICAgICAgICBtYXhBcmdzOiAwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgbGlzdGVuZXIod3JhcHBlZFJlcSk7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IG9uTWVzc2FnZVdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhIG1lc3NhZ2UgbGlzdGVuZXIgZnVuY3Rpb24gc28gdGhhdCBpdCBtYXkgc2VuZCByZXNwb25zZXMgYmFzZWQgb25cbiAgICAgICAgICogaXRzIHJldHVybiB2YWx1ZSwgcmF0aGVyIHRoYW4gYnkgcmV0dXJuaW5nIGEgc2VudGluZWwgdmFsdWUgYW5kIGNhbGxpbmcgYVxuICAgICAgICAgKiBjYWxsYmFjay4gSWYgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHJldHVybnMgYSBQcm9taXNlLCB0aGUgcmVzcG9uc2UgaXNcbiAgICAgICAgICogc2VudCB3aGVuIHRoZSBwcm9taXNlIGVpdGhlciByZXNvbHZlcyBvciByZWplY3RzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0geyp9IG1lc3NhZ2VcbiAgICAgICAgICogICAgICAgIFRoZSBtZXNzYWdlIHNlbnQgYnkgdGhlIG90aGVyIGVuZCBvZiB0aGUgY2hhbm5lbC5cbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHNlbmRlclxuICAgICAgICAgKiAgICAgICAgRGV0YWlscyBhYm91dCB0aGUgc2VuZGVyIG9mIHRoZSBtZXNzYWdlLlxuICAgICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCopfSBzZW5kUmVzcG9uc2VcbiAgICAgICAgICogICAgICAgIEEgY2FsbGJhY2sgd2hpY2gsIHdoZW4gY2FsbGVkIHdpdGggYW4gYXJiaXRyYXJ5IGFyZ3VtZW50LCBzZW5kc1xuICAgICAgICAgKiAgICAgICAgdGhhdCB2YWx1ZSBhcyBhIHJlc3BvbnNlLlxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICogICAgICAgIFRydWUgaWYgdGhlIHdyYXBwZWQgbGlzdGVuZXIgcmV0dXJuZWQgYSBQcm9taXNlLCB3aGljaCB3aWxsIGxhdGVyXG4gICAgICAgICAqICAgICAgICB5aWVsZCBhIHJlc3BvbnNlLiBGYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uTWVzc2FnZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkge1xuICAgICAgICAgIGxldCBkaWRDYWxsU2VuZFJlc3BvbnNlID0gZmFsc2U7XG4gICAgICAgICAgbGV0IHdyYXBwZWRTZW5kUmVzcG9uc2U7XG4gICAgICAgICAgbGV0IHNlbmRSZXNwb25zZVByb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHdyYXBwZWRTZW5kUmVzcG9uc2UgPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgZGlkQ2FsbFNlbmRSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsZXQgcmVzdWx0O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGxpc3RlbmVyKG1lc3NhZ2UsIHNlbmRlciwgd3JhcHBlZFNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlzUmVzdWx0VGhlbmFibGUgPSByZXN1bHQgIT09IHRydWUgJiYgaXNUaGVuYWJsZShyZXN1bHQpOyAvLyBJZiB0aGUgbGlzdGVuZXIgZGlkbid0IHJldHVybmVkIHRydWUgb3IgYSBQcm9taXNlLCBvciBjYWxsZWRcbiAgICAgICAgICAvLyB3cmFwcGVkU2VuZFJlc3BvbnNlIHN5bmNocm9ub3VzbHksIHdlIGNhbiBleGl0IGVhcmxpZXJcbiAgICAgICAgICAvLyBiZWNhdXNlIHRoZXJlIHdpbGwgYmUgbm8gcmVzcG9uc2Ugc2VudCBmcm9tIHRoaXMgbGlzdGVuZXIuXG5cbiAgICAgICAgICBpZiAocmVzdWx0ICE9PSB0cnVlICYmICFpc1Jlc3VsdFRoZW5hYmxlICYmICFkaWRDYWxsU2VuZFJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSAvLyBBIHNtYWxsIGhlbHBlciB0byBzZW5kIHRoZSBtZXNzYWdlIGlmIHRoZSBwcm9taXNlIHJlc29sdmVzXG4gICAgICAgICAgLy8gYW5kIGFuIGVycm9yIGlmIHRoZSBwcm9taXNlIHJlamVjdHMgKGEgd3JhcHBlZCBzZW5kTWVzc2FnZSBoYXNcbiAgICAgICAgICAvLyB0byB0cmFuc2xhdGUgdGhlIG1lc3NhZ2UgaW50byBhIHJlc29sdmVkIHByb21pc2Ugb3IgYSByZWplY3RlZFxuICAgICAgICAgIC8vIHByb21pc2UpLlxuXG5cbiAgICAgICAgICBjb25zdCBzZW5kUHJvbWlzZWRSZXN1bHQgPSBwcm9taXNlID0+IHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihtc2cgPT4ge1xuICAgICAgICAgICAgICAvLyBzZW5kIHRoZSBtZXNzYWdlIHZhbHVlLlxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobXNnKTtcbiAgICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgLy8gU2VuZCBhIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGVycm9yIGlmIHRoZSByZWplY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAvLyBpcyBhbiBpbnN0YW5jZSBvZiBlcnJvciwgb3IgdGhlIG9iamVjdCBpdHNlbGYgb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcblxuICAgICAgICAgICAgICBpZiAoZXJyb3IgJiYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgfHwgdHlwZW9mIGVycm9yLm1lc3NhZ2UgPT09IFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZFwiO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICBfX21veldlYkV4dGVuc2lvblBvbHlmaWxsUmVqZWN0X186IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgIC8vIFByaW50IGFuIGVycm9yIG9uIHRoZSBjb25zb2xlIGlmIHVuYWJsZSB0byBzZW5kIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIG9uTWVzc2FnZSByZWplY3RlZCByZXBseVwiLCBlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTsgLy8gSWYgdGhlIGxpc3RlbmVyIHJldHVybmVkIGEgUHJvbWlzZSwgc2VuZCB0aGUgcmVzb2x2ZWQgdmFsdWUgYXMgYVxuICAgICAgICAgIC8vIHJlc3VsdCwgb3RoZXJ3aXNlIHdhaXQgdGhlIHByb21pc2UgcmVsYXRlZCB0byB0aGUgd3JhcHBlZFNlbmRSZXNwb25zZVxuICAgICAgICAgIC8vIGNhbGxiYWNrIHRvIHJlc29sdmUgYW5kIHNlbmQgaXQgYXMgYSByZXNwb25zZS5cblxuXG4gICAgICAgICAgaWYgKGlzUmVzdWx0VGhlbmFibGUpIHtcbiAgICAgICAgICAgIHNlbmRQcm9taXNlZFJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kUHJvbWlzZWRSZXN1bHQoc2VuZFJlc3BvbnNlUHJvbWlzZSk7XG4gICAgICAgICAgfSAvLyBMZXQgQ2hyb21lIGtub3cgdGhhdCB0aGUgbGlzdGVuZXIgaXMgcmVwbHlpbmcuXG5cblxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrID0gKHtcbiAgICAgICAgcmVqZWN0LFxuICAgICAgICByZXNvbHZlXG4gICAgICB9LCByZXBseSkgPT4ge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIC8vIERldGVjdCB3aGVuIG5vbmUgb2YgdGhlIGxpc3RlbmVycyByZXBsaWVkIHRvIHRoZSBzZW5kTWVzc2FnZSBjYWxsIGFuZCByZXNvbHZlXG4gICAgICAgICAgLy8gdGhlIHByb21pc2UgdG8gdW5kZWZpbmVkIGFzIGluIEZpcmVmb3guXG4gICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9pc3N1ZXMvMTMwXG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSA9PT0gQ0hST01FX1NFTkRfTUVTU0FHRV9DQUxMQkFDS19OT19SRVNQT05TRV9NRVNTQUdFKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlcGx5ICYmIHJlcGx5Ll9fbW96V2ViRXh0ZW5zaW9uUG9seWZpbGxSZWplY3RfXykge1xuICAgICAgICAgIC8vIENvbnZlcnQgYmFjayB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZXJyb3IgaW50b1xuICAgICAgICAgIC8vIGFuIEVycm9yIGluc3RhbmNlLlxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IocmVwbHkubWVzc2FnZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVwbHkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCB3cmFwcGVkU2VuZE1lc3NhZ2UgPSAobmFtZSwgbWV0YWRhdGEsIGFwaU5hbWVzcGFjZU9iaiwgLi4uYXJncykgPT4ge1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPCBtZXRhZGF0YS5taW5BcmdzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1ldGFkYXRhLm1heEFyZ3MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRDYiA9IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrLmJpbmQobnVsbCwge1xuICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFyZ3MucHVzaCh3cmFwcGVkQ2IpO1xuICAgICAgICAgIGFwaU5hbWVzcGFjZU9iai5zZW5kTWVzc2FnZSguLi5hcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBzdGF0aWNXcmFwcGVycyA9IHtcbiAgICAgICAgZGV2dG9vbHM6IHtcbiAgICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgICBvblJlcXVlc3RGaW5pc2hlZDogd3JhcEV2ZW50KG9uUmVxdWVzdEZpbmlzaGVkV3JhcHBlcnMpXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgb25NZXNzYWdlOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICAgIG9uTWVzc2FnZUV4dGVybmFsOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICAgIHNlbmRNZXNzYWdlOiB3cmFwcGVkU2VuZE1lc3NhZ2UuYmluZChudWxsLCBcInNlbmRNZXNzYWdlXCIsIHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgICBtYXhBcmdzOiAzXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgdGFiczoge1xuICAgICAgICAgIHNlbmRNZXNzYWdlOiB3cmFwcGVkU2VuZE1lc3NhZ2UuYmluZChudWxsLCBcInNlbmRNZXNzYWdlXCIsIHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDIsXG4gICAgICAgICAgICBtYXhBcmdzOiAzXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IHNldHRpbmdNZXRhZGF0YSA9IHtcbiAgICAgICAgY2xlYXI6IHtcbiAgICAgICAgICBtaW5BcmdzOiAxLFxuICAgICAgICAgIG1heEFyZ3M6IDFcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgbWluQXJnczogMSxcbiAgICAgICAgICBtYXhBcmdzOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHNldDoge1xuICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgbWF4QXJnczogMVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgYXBpTWV0YWRhdGEucHJpdmFjeSA9IHtcbiAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgIFwiKlwiOiBzZXR0aW5nTWV0YWRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgc2VydmljZXM6IHtcbiAgICAgICAgICBcIipcIjogc2V0dGluZ01ldGFkYXRhXG4gICAgICAgIH0sXG4gICAgICAgIHdlYnNpdGVzOiB7XG4gICAgICAgICAgXCIqXCI6IHNldHRpbmdNZXRhZGF0YVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHdyYXBPYmplY3QoZXh0ZW5zaW9uQVBJcywgc3RhdGljV3JhcHBlcnMsIGFwaU1ldGFkYXRhKTtcbiAgICB9OyAvLyBUaGUgYnVpbGQgcHJvY2VzcyBhZGRzIGEgVU1EIHdyYXBwZXIgYXJvdW5kIHRoaXMgZmlsZSwgd2hpY2ggbWFrZXMgdGhlXG4gICAgLy8gYG1vZHVsZWAgdmFyaWFibGUgYXZhaWxhYmxlLlxuXG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHdyYXBBUElzKGNocm9tZSk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWxUaGlzLmJyb3dzZXI7XG4gIH1cbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YnJvd3Nlci1wb2x5ZmlsbC5qcy5tYXBcbiIsImltcG9ydCB7XG4gIF9fc3ByZWFkUHJvcHMsXG4gIF9fc3ByZWFkVmFsdWVzLFxuICBkZWZpbmVHZW5lcmljTWVzc2FuZ2luZ1xufSBmcm9tIFwiLi9jaHVuay1CUUxGU0ZGWi5qc1wiO1xuXG4vLyBzcmMvZXh0ZW5zaW9uLnRzXG5pbXBvcnQgQnJvd3NlciBmcm9tIFwid2ViZXh0ZW5zaW9uLXBvbHlmaWxsXCI7XG5mdW5jdGlvbiBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmcoY29uZmlnKSB7XG4gIHJldHVybiBkZWZpbmVHZW5lcmljTWVzc2FuZ2luZyhfX3NwcmVhZFByb3BzKF9fc3ByZWFkVmFsdWVzKHt9LCBjb25maWcpLCB7XG4gICAgc2VuZE1lc3NhZ2UobWVzc2FnZSwgdGFiSWQpIHtcbiAgICAgIGlmICh0YWJJZCA9PSBudWxsKVxuICAgICAgICByZXR1cm4gQnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgcmV0dXJuIEJyb3dzZXIudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgbWVzc2FnZSk7XG4gICAgfSxcbiAgICBhZGRSb290TGlzdGVuZXIocHJvY2Vzc01lc3NhZ2UpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyID0gKG1lc3NhZ2UsIHNlbmRlcikgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NNZXNzYWdlKF9fc3ByZWFkUHJvcHMoX19zcHJlYWRWYWx1ZXMoe30sIG1lc3NhZ2UpLCB7IHNlbmRlciB9KSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gcHJvY2Vzc01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICB9O1xuICAgICAgQnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gKCkgPT4gQnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgfVxuICB9KSk7XG59XG5leHBvcnQge1xuICBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmdcbn07XG4iLCJpbXBvcnQgeyBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmcgfSBmcm9tICdAd2ViZXh0LWNvcmUvbWVzc2FnaW5nJztcclxuXHJcbmludGVyZmFjZSBQcm90b2NvbE1hcCB7XHJcbiAgZ2V0UGFnZUxhbmd1YWdlcygpOiBzdHJpbmdbXTtcclxuICBzZXRDb3VudChkYXRhOiBudW1iZXIpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgeyBzZW5kTWVzc2FnZSwgb25NZXNzYWdlIH0gPVxyXG4gIGRlZmluZUV4dGVuc2lvbk1lc3NhZ2luZzxQcm90b2NvbE1hcD4oKTtcclxuIiwiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUJhY2tncm91bmQoYXJnKSB7XG4gIGlmIChhcmcgPT0gbnVsbCB8fCB0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB7IG1haW46IGFyZyB9O1xuICByZXR1cm4gYXJnO1xufVxuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiIsImltcG9ydCB7IG9uTWVzc2FnZSB9IGZyb20gJ0AvdXRpbHMvbWVzc2FnaW5nJztcclxuaW1wb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9IGZyb20gJ3d4dC9zYW5kYm94JztcclxuXHJcbmxldCBibGFja2xpc3Q6IFNldDxzdHJpbmc+O1xyXG5sZXQgd2hpdGVsaXN0OiBTZXQ8c3RyaW5nPjtcclxuY29uc3QgY2hlY2tlZFdlYnNpdGVzOiBSZWNvcmQ8c3RyaW5nLCAnc2FmZScgfCAnc3VzcGljaW91cycgfCAnZGFuZ2Vyb3VzJz4gPSB7fTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUJhY2tncm91bmQoKCkgPT4ge1xyXG4gIGxvYWRMaXN0cygpXHJcbiAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgIHN1YnNjcmliZVRvT25UYWJMb2FkZWQoKTtcclxuICAgICAgc3Vic2NyaWJlVG9PblRhYlNlbGVjdGVkKCk7XHJcblxyXG4gICAgICBvbk1lc3NhZ2UoJ3NldENvdW50JywgKHsgZGF0YSB9KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ0FudGktUGhpc2hpbmcgZXh0ZW5zaW9uIGxvYWRlZCBzdWNjZXNzZnVsbHkhJyk7XHJcbiAgICB9KVxyXG4gICAgLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gbG9hZCBBbnRpLVBoaXNoaW5nIGV4dGVuc2lvbiEnLCBlcnJvcik7XHJcbiAgICB9KTtcclxufSk7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBmZXRjaEpTT04odXJsOiBzdHJpbmcpIHtcclxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCk7XHJcbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gbG9hZExpc3RzKCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBibGFja2xpc3REYXRhID0gYXdhaXQgZmV0Y2hKU09OKCcvYmxhY2tsaXN0LXBoaXNoZm9ydC5qc29uJyk7XHJcbiAgICBibGFja2xpc3QgPSBuZXcgU2V0KGJsYWNrbGlzdERhdGEpO1xyXG4gIH0gY2F0Y2ggKGNhdXNlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yIHdoaWxlIGxvYWRpbmcgYmxhY2tsaXN0IGRhdGEhJywgeyBjYXVzZSB9KTtcclxuICB9XHJcbiAgY29uc29sZS5sb2coYFN1Y2Nlc3NmdWxseSBsb2FkZWQgJHtibGFja2xpc3Quc2l6ZX0gYmxhY2tsaXN0ZWQgZG9tYWlucy5gKTtcclxuXHJcbiAgY29uc3Qgd2hpdGVsaXN0RmlsZXMgPSBbXHJcbiAgICAnL3RvcC0xbS1idWlsdHdpdGguanNvbicsXHJcbiAgICAnL3RvcC0xbS1jaXNjby5qc29uJyxcclxuICAgICcvdG9wLTFtLXRyYW5jby5qc29uJ1xyXG4gIF07XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBbYnVpbHR3aXRoRGF0YSwgY2lzY29EYXRhLCB0cmFuY29EYXRhXSA9IGF3YWl0IFByb21pc2UuYWxsKFxyXG4gICAgICB3aGl0ZWxpc3RGaWxlcy5tYXAoKHVybCkgPT4gZmV0Y2hKU09OKHVybCkpXHJcbiAgICApO1xyXG4gICAgd2hpdGVsaXN0ID0gbmV3IFNldChbLi4uYnVpbHR3aXRoRGF0YSwgLi4uY2lzY29EYXRhLCAuLi50cmFuY29EYXRhXSk7XHJcbiAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3Igd2hpbGUgbG9hZGluZyB3aGl0ZWxpc3QgZGF0YSEnLCB7IGNhdXNlIH0pO1xyXG4gIH1cclxuICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGxvYWRlZCAke3doaXRlbGlzdC5zaXplfSB3aGl0ZWxpc3RlZCBkb21haW5zLmApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdWJzY3JpYmVUb09uVGFiTG9hZGVkKCkge1xyXG4gIGJyb3dzZXIudGFicy5vblVwZGF0ZWQuYWRkTGlzdGVuZXIoKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpID0+IHtcclxuICAgIGFudGlQaGlzaGluZ1BpcGVsaW5lKHRhYik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN1YnNjcmliZVRvT25UYWJTZWxlY3RlZCgpIHtcclxuICBicm93c2VyLnRhYnMub25BY3RpdmF0ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHsgdGFiSWQgfSkgPT4ge1xyXG4gICAgY29uc3QgdGFiID0gYXdhaXQgYnJvd3Nlci50YWJzLmdldCh0YWJJZCk7XHJcbiAgICBhbnRpUGhpc2hpbmdQaXBlbGluZSh0YWIpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGVja1RhYih0YWI6IGNocm9tZS50YWJzLlRhYikge1xyXG4gIGlmICh0YWIuc3RhdHVzICE9PSAnY29tcGxldGUnIHx8ICF0YWIuYWN0aXZlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAodGFiLnVybCAmJiB0YWIudXJsLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJykpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHRhYi51cmwgJiYgdGFiLnVybC5zdGFydHNXaXRoKCdodHRwOi8vJykpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRIb3N0bmFtZUZyb21UYWJVcmwodGFiVXJsOiBzdHJpbmcpIHtcclxuICBsZXQgdXJsO1xyXG4gIHRyeSB7XHJcbiAgICB1cmwgPSBuZXcgVVJMKHRhYlVybCk7XHJcbiAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHBhcnNlIHRhYiB1cmwhJywgeyBjYXVzZSB9KTtcclxuICB9XHJcblxyXG4gIGlmICh1cmwuaG9zdG5hbWUgJiYgKHVybC5wcm90b2NvbCA9PT0gJ2h0dHA6JyB8fCB1cmwucHJvdG9jb2wgPT09ICdodHRwczonKSkge1xyXG4gICAgcmV0dXJuIHVybC5ob3N0bmFtZS5zdGFydHNXaXRoKCd3d3cuJylcclxuICAgICAgPyB1cmwuaG9zdG5hbWUuc3Vic3RyaW5nKDQpXHJcbiAgICAgIDogdXJsLmhvc3RuYW1lO1xyXG4gIH1cclxuXHJcbiAgdGhyb3cgbmV3IEVycm9yKGBQcm90b2NvbCAke3VybC5wcm90b2NvbH0gaXMgbm90IHN1cHBvcnRlZCFgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hlY2tCbGFja2xpc3QodXJsSG9zdG5hbWU6IHN0cmluZykge1xyXG4gIGxldCBwaGlzaGluZyA9IGZhbHNlO1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cclxuICBpZiAoYmxhY2tsaXN0Lmhhcyh1cmxIb3N0bmFtZSkpIHtcclxuICAgIHBoaXNoaW5nID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHRvdGFsVGltZSA9IE1hdGguZmxvb3IocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFRpbWUpO1xyXG4gIGNvbnNvbGUubG9nKGBCbGFjayBsaXN0IGNoZWNrIGRvbmUgaW4gJHt0b3RhbFRpbWV9IG1zLmApO1xyXG5cclxuICByZXR1cm4gcGhpc2hpbmc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoZWNrV2hpdGVsaXN0KHVybEhvc3RuYW1lOiBzdHJpbmcpIHtcclxuICBsZXQgbGVnaXQgPSBmYWxzZTtcclxuICBjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHJcbiAgaWYgKHdoaXRlbGlzdC5oYXModXJsSG9zdG5hbWUpKSB7XHJcbiAgICBsZWdpdCA9IHRydWU7XHJcbiAgfVxyXG5cclxuICBjb25zdCB0b3RhbFRpbWUgPSBNYXRoLmZsb29yKHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRUaW1lKTtcclxuICBjb25zb2xlLmxvZyhgV2hpdGUgbGlzdCBjaGVjayBkb25lIGluICR7dG90YWxUaW1lfSBtcy5gKTtcclxuXHJcbiAgcmV0dXJuIGxlZ2l0O1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB0YWtlU2NyZWVuc2hvdCh3aW5kb3dJZDogbnVtYmVyKSB7XHJcbiAgY29uc3QgbWF4QXR0ZW1wdHMgPSAzO1xyXG4gIGNvbnN0IGRlbGF5TXMgPSA1MDA7XHJcblxyXG4gIGZvciAobGV0IGF0dGVtcHRzID0gMDsgYXR0ZW1wdHMgPCBtYXhBdHRlbXB0czsgYXR0ZW1wdHMrKykge1xyXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgZGVsYXlNcykpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHNjcmVlbnNob3QgPSBhd2FpdCBicm93c2VyLnRhYnMuY2FwdHVyZVZpc2libGVUYWIod2luZG93SWQsIHtcclxuICAgICAgICBmb3JtYXQ6ICdwbmcnXHJcbiAgICAgIH0pO1xyXG4gICAgICBpZiAoc2NyZWVuc2hvdCkge1xyXG4gICAgICAgIHJldHVybiBzY3JlZW5zaG90O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIC8qIGVtcHR5ICovXHJcbiAgICAgIGNvbnNvbGUubG9nKGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gY2FwdHVyZSBzY3JlZW5zaG90IGFmdGVyIG11bHRpcGxlIGF0dGVtcHRzIScpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRQYWdlTGFuZ3VhZ2VzKHRhYklkOiBudW1iZXIpIHtcclxuICByZXR1cm4gc2VuZE1lc3NhZ2UoJ2dldFBhZ2VMYW5ndWFnZXMnLCB1bmRlZmluZWQsIHRhYklkKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gYW50aVBoaXNoaW5nUGlwZWxpbmUodGFiOiBjaHJvbWUudGFicy5UYWIpIHtcclxuICBpZiAoIXRhYi5pZCB8fCAhdGFiLnVybCB8fCAhY2hlY2tUYWIodGFiKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdXJsSG9zdG5hbWUgPSBnZXRIb3N0bmFtZUZyb21UYWJVcmwodGFiLnVybCk7XHJcblxyXG4gIGlmIChjaGVja2VkV2Vic2l0ZXNbdGFiLnVybF0gPT09ICdkYW5nZXJvdXMnIHx8IGNoZWNrQmxhY2tsaXN0KHVybEhvc3RuYW1lKSkge1xyXG4gICAgY2hlY2tlZFdlYnNpdGVzW3RhYi51cmxdID0gJ2Rhbmdlcm91cyc7XHJcbiAgICBjb25zb2xlLmxvZygnREFOR0VSIScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKGNoZWNrZWRXZWJzaXRlc1t0YWIudXJsXSA9PT0gJ3NhZmUnIHx8IGNoZWNrV2hpdGVsaXN0KHVybEhvc3RuYW1lKSkge1xyXG4gICAgY2hlY2tlZFdlYnNpdGVzW3RhYi51cmxdID0gJ3NhZmUnO1xyXG4gICAgLy9ub3RpZnlQb3B1cCh0YWIudXJsLCAnc2FmZScpO1xyXG4gICAgY29uc29sZS5sb2coJ09LIScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgW3NjcmVlbnNob3QsIHBhZ2VMYW5ndWFnZXNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xyXG4gICAgdGFrZVNjcmVlbnNob3QodGFiLndpbmRvd0lkKSxcclxuICAgIGdldFBhZ2VMYW5ndWFnZXModGFiLmlkKVxyXG4gIF0pO1xyXG5cclxuICBjb25zb2xlLmxvZyhzY3JlZW5zaG90KTtcclxuICBjb25zb2xlLmxvZyhwYWdlTGFuZ3VhZ2VzKTtcclxufVxyXG4iXSwibmFtZXMiOlsidGhpcyJdLCJtYXBwaW5ncyI6Ijs7O0VBQU8sTUFBTSxPQUFPO0VBQ3BCO0VBQ0EsRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNO0VBQzdEO0VBQ0EsSUFBSSxVQUFVLENBQUM7RUFDZjtFQUNBLENBQUM7O0VDTkQsTUFBTSxJQUFJLEdBQUc7RUFDYjtFQUNBLENBQUMsU0FBUztFQUNWLENBQUMsVUFBVTtFQUNYLENBQUMsY0FBYztFQUNmLENBQUMsV0FBVztFQUNaLENBQUMsU0FBUztFQUNWLENBQUMsUUFBUTs7RUFFVDtFQUNBLENBQUMsVUFBVSxDQUFDLFlBQVk7O0VBRXhCO0VBQ0E7RUFDQSxDQUFDLFVBQVUsQ0FBQyxjQUFjO0VBQzFCLENBQUMsVUFBVSxDQUFDLFdBQVc7RUFDdkI7RUFDQTtFQUNBLEVBQUUsTUFBTSxDQUFDLE9BQU87RUFDaEIsRUFBRSxHQUFHO0VBQ0wsRUFBRSxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztFQUNoRCxFQUFFOztFQUVGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxD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Q2Y7RUFHRixFQUFNLE1BQUEsSUFBSSxNQUFNLHVEQUF1RCxDQUFBO0VBQ3pFO0VBRUEsU0FBUyxpQkFBaUIsS0FBZSxFQUFBO0VBQ3ZDLEVBQU8sT0FBQSxXQUFBLENBQVksa0JBQW9CLEVBQUEsS0FBQSxDQUFBLEVBQVcsS0FBSyxDQUFBO0VBQ3pEO0VBRUEsZUFBZSxxQkFBcUIsR0FBc0IsRUFBQTtFQUN4RCxFQUFJLElBQUEsQ0FBQyxJQUFJLEVBQU0sSUFBQSxDQUFDLElBQUksR0FBTyxJQUFBLENBQUMsUUFBUyxDQUFBLEdBQUcsQ0FBRyxFQUFBO0VBQ3pDLElBQUE7RUFBQTtFQUdGLEVBQU0sTUFBQSxXQUFBLEdBQWMscUJBQXNCLENBQUEsR0FBQSxDQUFJLEdBQUcsQ0FBQTtFQUVqRCxFQUFBLElBQUksZ0JBQWdCLEdBQUksQ0FBQSxHQUFHLE1BQU0sV0FBZSxJQUFBLGNBQUEsQ0FBZSxXQUFXLENBQUcsRUFBQTtFQUMzRSxJQUFnQixlQUFBLENBQUEsR0FBQSxDQUFJLEdBQUcsQ0FBSSxHQUFBLFdBQUE7RUFDM0IsSUFBQSxPQUFBLENBQVEsSUFBSSxTQUFTLENBQUE7RUFDckIsSUFBQTtFQUFBO0VBR0YsRUFBQSxJQUFJLGdCQUFnQixHQUFJLENBQUEsR0FBRyxNQUFNLE1BQVUsSUFBQSxjQUFBLENBQWUsV0FBVyxDQUFHLEVBQUE7RUFDdEUsSUFBZ0IsZUFBQSxDQUFBLEdBQUEsQ0FBSSxHQUFHLENBQUksR0FBQSxNQUFBO0VBRTNCLElBQUEsT0FBQSxDQUFRLElBQUksS0FBSyxDQUFBO0VBQ2pCLElBQUE7RUFBQTtFQUdGLEVBQUEsTUFBTSxDQUFDLFVBQVksRUFBQSxhQUFhLENBQUksR0FBQSxNQUFNLFFBQVEsR0FBSSxDQUFBO0VBQUEsSUFDcEQsY0FBQSxDQUFlLElBQUksUUFBUSxDQUFBO0VBQUEsSUFDM0IsZ0JBQUEsQ0FBaUIsSUFBSSxFQUFFO0VBQUEsR0FDeEIsQ0FBQTtFQUVELEVBQUEsT0FBQSxDQUFRLElBQUksVUFBVSxDQUFBO0VBQ3RCLEVBQUEsT0FBQSxDQUFRLElBQUksYUFBYSxDQUFBO0VBQzNCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDcsOF19
