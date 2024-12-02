var content = (function () {
	'use strict';

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
	content;

	function defineContentScript(definition) {
	  return definition;
	}

	let languageDetector = null;
	const definition = defineContentScript({
	  matches: ["*://*/*"],
	  runAt: "document_start",
	  main: async () => {
	    subscribeToMessages();
	    languageDetector = await setupDetector();
	  }
	});
	function subscribeToMessages() {
	  onMessage("getPageLanguages", () => {
	    return detectPageLanguages();
	  });
	}
	async function setupDetector() {
	  if ("translation" in self) {
	    const selfWithTranslation = self;
	    if ("canDetect" in selfWithTranslation.translation && "createDetector" in selfWithTranslation.translation) {
	      const canDetect = await selfWithTranslation.translation.canDetect();
	      if (canDetect === "no") {
	        return null;
	      }
	      const languageDetector2 = await selfWithTranslation.translation.createDetector();
	      if (canDetect === "after-download") {
	        console.log("Language detector model downloading!");
	        languageDetector2.addEventListener("downloadprogress", (e) => {
	          console.log(`Download progress - ${e.loaded}/${e.total}`);
	        });
	        await languageDetector2.ready;
	        console.log("Language detector model downloaded successfully!");
	      }
	      return languageDetector2;
	    }
	  }
	  return null;
	}
	async function detectPageLanguages() {
	  if (!languageDetector) {
	    return [];
	  }
	  const allTextOnPage = document.querySelector(":root")?.textContent ?? "";
	  const detectedLanguages = await languageDetector.detect(allTextOnPage);
	  return detectedLanguages.slice(0, 2).map((d) => d.detectedLanguage);
	}
	content;

	const browser = (
	  // @ts-expect-error
	  globalThis.browser?.runtime?.id == null ? globalThis.chrome : (
	    // @ts-expect-error
	    globalThis.browser
	  )
	);

	function print$1(method, ...args) {
	  if (typeof args[0] === "string") {
	    const message = args.shift();
	    method(`[wxt] ${message}`, ...args);
	  } else {
	    method("[wxt]", ...args);
	  }
	}
	const logger$1 = {
	  debug: (...args) => print$1(console.debug, ...args),
	  log: (...args) => print$1(console.log, ...args),
	  warn: (...args) => print$1(console.warn, ...args),
	  error: (...args) => print$1(console.error, ...args)
	};

	const __vite_import_meta_env__ = {"BASE_URL": "/", "BROWSER": "chrome", "CHROME": true, "COMMAND": "serve", "DEV": true, "EDGE": false, "ENTRYPOINT": "content", "FIREFOX": false, "MANIFEST_VERSION": 3, "MODE": "development", "OPERA": false, "PROD": false, "SAFARI": false, "SSR": false, "VITE_CJS_IGNORE_WARNING": "true"};
	class WxtLocationChangeEvent extends Event {
	  constructor(newUrl, oldUrl) {
	    super(WxtLocationChangeEvent.EVENT_NAME, {});
	    this.newUrl = newUrl;
	    this.oldUrl = oldUrl;
	  }
	  static EVENT_NAME = getUniqueEventName("wxt:locationchange");
	}
	function getUniqueEventName(eventName) {
	  const entrypointName = typeof (__vite_import_meta_env__) === "undefined" ? "build" : "content";
	  return `${browser?.runtime?.id}:${entrypointName}:${eventName}`;
	}

	function createLocationWatcher(ctx) {
	  let interval;
	  let oldUrl;
	  return {
	    /**
	     * Ensure the location watcher is actively looking for URL changes. If it's already watching,
	     * this is a noop.
	     */
	    run() {
	      if (interval != null) return;
	      oldUrl = new URL(location.href);
	      interval = ctx.setInterval(() => {
	        let newUrl = new URL(location.href);
	        if (newUrl.href !== oldUrl.href) {
	          window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
	          oldUrl = newUrl;
	        }
	      }, 1e3);
	    }
	  };
	}

	class ContentScriptContext {
	  constructor(contentScriptName, options) {
	    this.contentScriptName = contentScriptName;
	    this.options = options;
	    this.abortController = new AbortController();
	    if (this.isTopFrame) {
	      this.listenForNewerScripts({ ignoreFirstEvent: true });
	      this.stopOldScripts();
	    } else {
	      this.listenForNewerScripts();
	    }
	  }
	  static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName(
	    "wxt:content-script-started"
	  );
	  isTopFrame = window.self === window.top;
	  abortController;
	  locationWatcher = createLocationWatcher(this);
	  get signal() {
	    return this.abortController.signal;
	  }
	  abort(reason) {
	    return this.abortController.abort(reason);
	  }
	  get isInvalid() {
	    if (browser.runtime.id == null) {
	      this.notifyInvalidated();
	    }
	    return this.signal.aborted;
	  }
	  get isValid() {
	    return !this.isInvalid;
	  }
	  /**
	   * Add a listener that is called when the content script's context is invalidated.
	   *
	   * @returns A function to remove the listener.
	   *
	   * @example
	   * browser.runtime.onMessage.addListener(cb);
	   * const removeInvalidatedListener = ctx.onInvalidated(() => {
	   *   browser.runtime.onMessage.removeListener(cb);
	   * })
	   * // ...
	   * removeInvalidatedListener();
	   */
	  onInvalidated(cb) {
	    this.signal.addEventListener("abort", cb);
	    return () => this.signal.removeEventListener("abort", cb);
	  }
	  /**
	   * Return a promise that never resolves. Useful if you have an async function that shouldn't run
	   * after the context is expired.
	   *
	   * @example
	   * const getValueFromStorage = async () => {
	   *   if (ctx.isInvalid) return ctx.block();
	   *
	   *   // ...
	   * }
	   */
	  block() {
	    return new Promise(() => {
	    });
	  }
	  /**
	   * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
	   */
	  setInterval(handler, timeout) {
	    const id = setInterval(() => {
	      if (this.isValid) handler();
	    }, timeout);
	    this.onInvalidated(() => clearInterval(id));
	    return id;
	  }
	  /**
	   * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
	   */
	  setTimeout(handler, timeout) {
	    const id = setTimeout(() => {
	      if (this.isValid) handler();
	    }, timeout);
	    this.onInvalidated(() => clearTimeout(id));
	    return id;
	  }
	  /**
	   * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
	   * invalidated.
	   */
	  requestAnimationFrame(callback) {
	    const id = requestAnimationFrame((...args) => {
	      if (this.isValid) callback(...args);
	    });
	    this.onInvalidated(() => cancelAnimationFrame(id));
	    return id;
	  }
	  /**
	   * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
	   * invalidated.
	   */
	  requestIdleCallback(callback, options) {
	    const id = requestIdleCallback((...args) => {
	      if (!this.signal.aborted) callback(...args);
	    }, options);
	    this.onInvalidated(() => cancelIdleCallback(id));
	    return id;
	  }
	  /**
	   * Call `target.addEventListener` and remove the event listener when the context is invalidated.
	   *
	   * Includes additional events useful for content scripts:
	   *
	   * - `"wxt:locationchange"` - Triggered when HTML5 history mode is used to change URL. Content
	   *   scripts are not reloaded when navigating this way, so this can be used to reset the content
	   *   script state on URL change, or run custom code.
	   *
	   * @example
	   * ctx.addEventListener(document, "visibilitychange", () => {
	   *   // ...
	   * });
	   * ctx.addEventListener(document, "wxt:locationchange", () => {
	   *   // ...
	   * });
	   */
	  addEventListener(target, type, handler, options) {
	    if (type === "wxt:locationchange") {
	      if (this.isValid) this.locationWatcher.run();
	    }
	    target.addEventListener?.(
	      type.startsWith("wxt:") ? getUniqueEventName(type) : type,
	      // @ts-expect-error: Event don't match, but that's OK, EventTarget doesn't allow custom types in the callback
	      handler,
	      {
	        ...options,
	        signal: this.signal
	      }
	    );
	  }
	  /**
	   * @internal
	   * Abort the abort controller and execute all `onInvalidated` listeners.
	   */
	  notifyInvalidated() {
	    this.abort("Content script context invalidated");
	    logger$1.debug(
	      `Content script "${this.contentScriptName}" context invalidated`
	    );
	  }
	  stopOldScripts() {
	    window.postMessage(
	      {
	        type: ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
	        contentScriptName: this.contentScriptName
	      },
	      "*"
	    );
	  }
	  listenForNewerScripts(options) {
	    let isFirst = true;
	    const cb = (event) => {
	      if (event.data?.type === ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE && event.data?.contentScriptName === this.contentScriptName) {
	        const wasFirst = isFirst;
	        isFirst = false;
	        if (wasFirst && options?.ignoreFirstEvent) return;
	        this.notifyInvalidated();
	      }
	    };
	    addEventListener("message", cb);
	    this.onInvalidated(() => removeEventListener("message", cb));
	  }
	}

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
	const result = (async () => {
	  try {
	    initPlugins();
	    const { main, ...options } = definition;
	    const ctx = new ContentScriptContext("content", options);
	    return await main(ctx);
	  } catch (err) {
	    logger.error(
	      `The content script "${"content"}" crashed on startup!`,
	      err
	    );
	    throw err;
	  }
	})();

	return result;

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3NlcmlhbGl6ZS1lcnJvci9lcnJvci1jb25zdHJ1Y3RvcnMuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc2VyaWFsaXplLWVycm9yL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tZXNzYWdpbmcvbGliL2NodW5rLUJRTEZTRkZaLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tZXNzYWdpbmcvbm9kZV9tb2R1bGVzL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9kaXN0L2Jyb3dzZXItcG9seWZpbGwuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21lc3NhZ2luZy9saWIvaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvdXRpbHMvbWVzc2FnaW5nLnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3NhbmRib3gvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL3NyYy9lbnRyeXBvaW50cy9jb250ZW50LnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9jbGllbnQvY29udGVudC1zY3JpcHRzL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2NsaWVudC9jb250ZW50LXNjcmlwdHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgbGlzdCA9IFtcblx0Ly8gTmF0aXZlIEVTIGVycm9ycyBodHRwczovLzI2Mi5lY21hLWludGVybmF0aW9uYWwub3JnLzEyLjAvI3NlYy13ZWxsLWtub3duLWludHJpbnNpYy1vYmplY3RzXG5cdEV2YWxFcnJvcixcblx0UmFuZ2VFcnJvcixcblx0UmVmZXJlbmNlRXJyb3IsXG5cdFN5bnRheEVycm9yLFxuXHRUeXBlRXJyb3IsXG5cdFVSSUVycm9yLFxuXG5cdC8vIEJ1aWx0LWluIGVycm9yc1xuXHRnbG9iYWxUaGlzLkRPTUV4Y2VwdGlvbixcblxuXHQvLyBOb2RlLXNwZWNpZmljIGVycm9yc1xuXHQvLyBodHRwczovL25vZGVqcy5vcmcvYXBpL2Vycm9ycy5odG1sXG5cdGdsb2JhbFRoaXMuQXNzZXJ0aW9uRXJyb3IsXG5cdGdsb2JhbFRoaXMuU3lzdGVtRXJyb3IsXG5dXG5cdC8vIE5vbi1uYXRpdmUgRXJyb3JzIGFyZSB1c2VkIHdpdGggYGdsb2JhbFRoaXNgIGJlY2F1c2UgdGhleSBtaWdodCBiZSBtaXNzaW5nLiBUaGlzIGZpbHRlciBkcm9wcyB0aGVtIHdoZW4gdW5kZWZpbmVkLlxuXHQuZmlsdGVyKEJvb2xlYW4pXG5cdC5tYXAoXG5cdFx0Y29uc3RydWN0b3IgPT4gW2NvbnN0cnVjdG9yLm5hbWUsIGNvbnN0cnVjdG9yXSxcblx0KTtcblxuY29uc3QgZXJyb3JDb25zdHJ1Y3RvcnMgPSBuZXcgTWFwKGxpc3QpO1xuXG5leHBvcnQgZGVmYXVsdCBlcnJvckNvbnN0cnVjdG9ycztcbiIsImltcG9ydCBlcnJvckNvbnN0cnVjdG9ycyBmcm9tICcuL2Vycm9yLWNvbnN0cnVjdG9ycy5qcyc7XG5cbmV4cG9ydCBjbGFzcyBOb25FcnJvciBleHRlbmRzIEVycm9yIHtcblx0bmFtZSA9ICdOb25FcnJvcic7XG5cblx0Y29uc3RydWN0b3IobWVzc2FnZSkge1xuXHRcdHN1cGVyKE5vbkVycm9yLl9wcmVwYXJlU3VwZXJNZXNzYWdlKG1lc3NhZ2UpKTtcblx0fVxuXG5cdHN0YXRpYyBfcHJlcGFyZVN1cGVyTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcblx0XHR9IGNhdGNoIHtcblx0XHRcdHJldHVybiBTdHJpbmcobWVzc2FnZSk7XG5cdFx0fVxuXHR9XG59XG5cbmNvbnN0IGNvbW1vblByb3BlcnRpZXMgPSBbXG5cdHtcblx0XHRwcm9wZXJ0eTogJ25hbWUnLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdtZXNzYWdlJyxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0fSxcblx0e1xuXHRcdHByb3BlcnR5OiAnc3RhY2snLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdjb2RlJyxcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdjYXVzZScsXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdH0sXG5dO1xuXG5jb25zdCB0b0pzb25XYXNDYWxsZWQgPSBuZXcgV2Vha1NldCgpO1xuXG5jb25zdCB0b0pTT04gPSBmcm9tID0+IHtcblx0dG9Kc29uV2FzQ2FsbGVkLmFkZChmcm9tKTtcblx0Y29uc3QganNvbiA9IGZyb20udG9KU09OKCk7XG5cdHRvSnNvbldhc0NhbGxlZC5kZWxldGUoZnJvbSk7XG5cdHJldHVybiBqc29uO1xufTtcblxuY29uc3QgZ2V0RXJyb3JDb25zdHJ1Y3RvciA9IG5hbWUgPT4gZXJyb3JDb25zdHJ1Y3RvcnMuZ2V0KG5hbWUpID8/IEVycm9yO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuY29uc3QgZGVzdHJveUNpcmN1bGFyID0gKHtcblx0ZnJvbSxcblx0c2Vlbixcblx0dG8sXG5cdGZvcmNlRW51bWVyYWJsZSxcblx0bWF4RGVwdGgsXG5cdGRlcHRoLFxuXHR1c2VUb0pTT04sXG5cdHNlcmlhbGl6ZSxcbn0pID0+IHtcblx0aWYgKCF0bykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KGZyb20pKSB7XG5cdFx0XHR0byA9IFtdO1xuXHRcdH0gZWxzZSBpZiAoIXNlcmlhbGl6ZSAmJiBpc0Vycm9yTGlrZShmcm9tKSkge1xuXHRcdFx0Y29uc3QgRXJyb3IgPSBnZXRFcnJvckNvbnN0cnVjdG9yKGZyb20ubmFtZSk7XG5cdFx0XHR0byA9IG5ldyBFcnJvcigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0byA9IHt9O1xuXHRcdH1cblx0fVxuXG5cdHNlZW4ucHVzaChmcm9tKTtcblxuXHRpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcblx0XHRyZXR1cm4gdG87XG5cdH1cblxuXHRpZiAodXNlVG9KU09OICYmIHR5cGVvZiBmcm9tLnRvSlNPTiA9PT0gJ2Z1bmN0aW9uJyAmJiAhdG9Kc29uV2FzQ2FsbGVkLmhhcyhmcm9tKSkge1xuXHRcdHJldHVybiB0b0pTT04oZnJvbSk7XG5cdH1cblxuXHRjb25zdCBjb250aW51ZURlc3Ryb3lDaXJjdWxhciA9IHZhbHVlID0+IGRlc3Ryb3lDaXJjdWxhcih7XG5cdFx0ZnJvbTogdmFsdWUsXG5cdFx0c2VlbjogWy4uLnNlZW5dLFxuXHRcdGZvcmNlRW51bWVyYWJsZSxcblx0XHRtYXhEZXB0aCxcblx0XHRkZXB0aCxcblx0XHR1c2VUb0pTT04sXG5cdFx0c2VyaWFsaXplLFxuXHR9KTtcblxuXHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhmcm9tKSkge1xuXHRcdGlmICh2YWx1ZSAmJiB2YWx1ZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgJiYgdmFsdWUuY29uc3RydWN0b3IubmFtZSA9PT0gJ0J1ZmZlcicpIHtcblx0XHRcdHRvW2tleV0gPSAnW29iamVjdCBCdWZmZXJdJztcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdC8vIFRPRE86IFVzZSBgc3RyZWFtLmlzUmVhZGFibGUoKWAgd2hlbiB0YXJnZXRpbmcgTm9kZS5qcyAxOC5cblx0XHRpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUucGlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0dG9ba2V5XSA9ICdbb2JqZWN0IFN0cmVhbV0nO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSB7XG5cdFx0XHQvLyBHcmFjZWZ1bGx5IGhhbmRsZSBub24tY29uZmlndXJhYmxlIGVycm9ycyBsaWtlIGBET01FeGNlcHRpb25gLlxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dG9ba2V5XSA9IHZhbHVlO1xuXHRcdFx0fSBjYXRjaCB7fVxuXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRpZiAoIXNlZW4uaW5jbHVkZXMoZnJvbVtrZXldKSkge1xuXHRcdFx0ZGVwdGgrKztcblx0XHRcdHRvW2tleV0gPSBjb250aW51ZURlc3Ryb3lDaXJjdWxhcihmcm9tW2tleV0pO1xuXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHR0b1trZXldID0gJ1tDaXJjdWxhcl0nO1xuXHR9XG5cblx0Zm9yIChjb25zdCB7cHJvcGVydHksIGVudW1lcmFibGV9IG9mIGNvbW1vblByb3BlcnRpZXMpIHtcblx0XHRpZiAodHlwZW9mIGZyb21bcHJvcGVydHldICE9PSAndW5kZWZpbmVkJyAmJiBmcm9tW3Byb3BlcnR5XSAhPT0gbnVsbCkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRvLCBwcm9wZXJ0eSwge1xuXHRcdFx0XHR2YWx1ZTogaXNFcnJvckxpa2UoZnJvbVtwcm9wZXJ0eV0pID8gY29udGludWVEZXN0cm95Q2lyY3VsYXIoZnJvbVtwcm9wZXJ0eV0pIDogZnJvbVtwcm9wZXJ0eV0sXG5cdFx0XHRcdGVudW1lcmFibGU6IGZvcmNlRW51bWVyYWJsZSA/IHRydWUgOiBlbnVtZXJhYmxlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUVycm9yKHZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3Qge1xuXHRcdG1heERlcHRoID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuXHRcdHVzZVRvSlNPTiA9IHRydWUsXG5cdH0gPSBvcHRpb25zO1xuXG5cdGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG5cdFx0cmV0dXJuIGRlc3Ryb3lDaXJjdWxhcih7XG5cdFx0XHRmcm9tOiB2YWx1ZSxcblx0XHRcdHNlZW46IFtdLFxuXHRcdFx0Zm9yY2VFbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0bWF4RGVwdGgsXG5cdFx0XHRkZXB0aDogMCxcblx0XHRcdHVzZVRvSlNPTixcblx0XHRcdHNlcmlhbGl6ZTogdHJ1ZSxcblx0XHR9KTtcblx0fVxuXG5cdC8vIFBlb3BsZSBzb21ldGltZXMgdGhyb3cgdGhpbmdzIGJlc2lkZXMgRXJyb3Igb2JqZWN0c+KAplxuXHRpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Ly8gYEpTT04uc3RyaW5naWZ5KClgIGRpc2NhcmRzIGZ1bmN0aW9ucy4gV2UgZG8gdG9vLCB1bmxlc3MgYSBmdW5jdGlvbiBpcyB0aHJvd24gZGlyZWN0bHkuXG5cdFx0Ly8gV2UgaW50ZW50aW9uYWxseSB1c2UgYHx8YCBiZWNhdXNlIGAubmFtZWAgaXMgYW4gZW1wdHkgc3RyaW5nIGZvciBhbm9ueW1vdXMgZnVuY3Rpb25zLlxuXHRcdHJldHVybiBgW0Z1bmN0aW9uOiAke3ZhbHVlLm5hbWUgfHwgJ2Fub255bW91cyd9XWA7XG5cdH1cblxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZUVycm9yKHZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3Qge21heERlcHRoID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZfSA9IG9wdGlvbnM7XG5cblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHRpZiAoaXNNaW5pbXVtVmlhYmxlU2VyaWFsaXplZEVycm9yKHZhbHVlKSkge1xuXHRcdGNvbnN0IEVycm9yID0gZ2V0RXJyb3JDb25zdHJ1Y3Rvcih2YWx1ZS5uYW1lKTtcblx0XHRyZXR1cm4gZGVzdHJveUNpcmN1bGFyKHtcblx0XHRcdGZyb206IHZhbHVlLFxuXHRcdFx0c2VlbjogW10sXG5cdFx0XHR0bzogbmV3IEVycm9yKCksXG5cdFx0XHRtYXhEZXB0aCxcblx0XHRcdGRlcHRoOiAwLFxuXHRcdFx0c2VyaWFsaXplOiBmYWxzZSxcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiBuZXcgTm9uRXJyb3IodmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFcnJvckxpa2UodmFsdWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odmFsdWUpXG5cdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0JiYgJ25hbWUnIGluIHZhbHVlXG5cdCYmICdtZXNzYWdlJyBpbiB2YWx1ZVxuXHQmJiAnc3RhY2snIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpc01pbmltdW1WaWFibGVTZXJpYWxpemVkRXJyb3IodmFsdWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odmFsdWUpXG5cdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0JiYgJ21lc3NhZ2UnIGluIHZhbHVlXG5cdCYmICFBcnJheS5pc0FycmF5KHZhbHVlKTtcbn1cblxuZXhwb3J0IHtkZWZhdWx0IGFzIGVycm9yQ29uc3RydWN0b3JzfSBmcm9tICcuL2Vycm9yLWNvbnN0cnVjdG9ycy5qcyc7XG4iLCJ2YXIgX19kZWZQcm9wID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xudmFyIF9fZGVmUHJvcHMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbnZhciBfX2dldE93blByb3BEZXNjcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzO1xudmFyIF9fZ2V0T3duUHJvcFN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIF9faGFzT3duUHJvcCA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgX19wcm9wSXNFbnVtID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcbnZhciBfX2RlZk5vcm1hbFByb3AgPSAob2JqLCBrZXksIHZhbHVlKSA9PiBrZXkgaW4gb2JqID8gX19kZWZQcm9wKG9iaiwga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUsIHZhbHVlIH0pIDogb2JqW2tleV0gPSB2YWx1ZTtcbnZhciBfX3NwcmVhZFZhbHVlcyA9IChhLCBiKSA9PiB7XG4gIGZvciAodmFyIHByb3AgaW4gYiB8fCAoYiA9IHt9KSlcbiAgICBpZiAoX19oYXNPd25Qcm9wLmNhbGwoYiwgcHJvcCkpXG4gICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gIGlmIChfX2dldE93blByb3BTeW1ib2xzKVxuICAgIGZvciAodmFyIHByb3Agb2YgX19nZXRPd25Qcm9wU3ltYm9scyhiKSkge1xuICAgICAgaWYgKF9fcHJvcElzRW51bS5jYWxsKGIsIHByb3ApKVxuICAgICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gICAgfVxuICByZXR1cm4gYTtcbn07XG52YXIgX19zcHJlYWRQcm9wcyA9IChhLCBiKSA9PiBfX2RlZlByb3BzKGEsIF9fZ2V0T3duUHJvcERlc2NzKGIpKTtcbnZhciBfX29ialJlc3QgPSAoc291cmNlLCBleGNsdWRlKSA9PiB7XG4gIHZhciB0YXJnZXQgPSB7fTtcbiAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpXG4gICAgaWYgKF9faGFzT3duUHJvcC5jYWxsKHNvdXJjZSwgcHJvcCkgJiYgZXhjbHVkZS5pbmRleE9mKHByb3ApIDwgMClcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgaWYgKHNvdXJjZSAhPSBudWxsICYmIF9fZ2V0T3duUHJvcFN5bWJvbHMpXG4gICAgZm9yICh2YXIgcHJvcCBvZiBfX2dldE93blByb3BTeW1ib2xzKHNvdXJjZSkpIHtcbiAgICAgIGlmIChleGNsdWRlLmluZGV4T2YocHJvcCkgPCAwICYmIF9fcHJvcElzRW51bS5jYWxsKHNvdXJjZSwgcHJvcCkpXG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xudmFyIF9fYXN5bmMgPSAoX190aGlzLCBfX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGZ1bGZpbGxlZCA9ICh2YWx1ZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgcmVqZWN0ZWQgPSAodmFsdWUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0ZXAoZ2VuZXJhdG9yLnRocm93KHZhbHVlKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzdGVwID0gKHgpID0+IHguZG9uZSA/IHJlc29sdmUoeC52YWx1ZSkgOiBQcm9taXNlLnJlc29sdmUoeC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTtcbiAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkoX190aGlzLCBfX2FyZ3VtZW50cykpLm5leHQoKSk7XG4gIH0pO1xufTtcblxuLy8gc3JjL2dlbmVyaWMudHNcbmltcG9ydCB7IHNlcmlhbGl6ZUVycm9yLCBkZXNlcmlhbGl6ZUVycm9yIH0gZnJvbSBcInNlcmlhbGl6ZS1lcnJvclwiO1xuZnVuY3Rpb24gZGVmaW5lR2VuZXJpY01lc3NhbmdpbmcoY29uZmlnKSB7XG4gIGxldCByZW1vdmVSb290TGlzdGVuZXI7XG4gIGxldCBwZXJUeXBlTGlzdGVuZXJzID0ge307XG4gIGZ1bmN0aW9uIGNsZWFudXBSb290TGlzdGVuZXIoKSB7XG4gICAgaWYgKE9iamVjdC5lbnRyaWVzKHBlclR5cGVMaXN0ZW5lcnMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmVtb3ZlUm9vdExpc3RlbmVyID09IG51bGwgPyB2b2lkIDAgOiByZW1vdmVSb290TGlzdGVuZXIoKTtcbiAgICAgIHJlbW92ZVJvb3RMaXN0ZW5lciA9IHZvaWQgMDtcbiAgICB9XG4gIH1cbiAgbGV0IGlkU2VxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMWU0KTtcbiAgZnVuY3Rpb24gZ2V0TmV4dElkKCkge1xuICAgIHJldHVybiBpZFNlcSsrO1xuICB9XG4gIHJldHVybiB7XG4gICAgc2VuZE1lc3NhZ2UodHlwZSwgZGF0YSwgLi4uYXJncykge1xuICAgICAgcmV0dXJuIF9fYXN5bmModGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgdmFyIF9hMiwgX2IsIF9jLCBfZDtcbiAgICAgICAgY29uc3QgX21lc3NhZ2UgPSB7XG4gICAgICAgICAgaWQ6IGdldE5leHRJZCgpLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IChfYiA9IHlpZWxkIChfYTIgPSBjb25maWcudmVyaWZ5TWVzc2FnZURhdGEpID09IG51bGwgPyB2b2lkIDAgOiBfYTIuY2FsbChjb25maWcsIF9tZXNzYWdlKSkgIT0gbnVsbCA/IF9iIDogX21lc3NhZ2U7XG4gICAgICAgIChfYyA9IGNvbmZpZy5sb2dnZXIpID09IG51bGwgPyB2b2lkIDAgOiBfYy5kZWJ1ZyhgW21lc3NhZ2luZ10gc2VuZE1lc3NhZ2Uge2lkPSR7bWVzc2FnZS5pZH19IFxcdTI1MDBcXHUxNDA1YCwgbWVzc2FnZSwgLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0geWllbGQgY29uZmlnLnNlbmRNZXNzYWdlKG1lc3NhZ2UsIC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCB7IHJlcywgZXJyIH0gPSByZXNwb25zZSAhPSBudWxsID8gcmVzcG9uc2UgOiB7IGVycjogbmV3IEVycm9yKFwiTm8gcmVzcG9uc2VcIikgfTtcbiAgICAgICAgKF9kID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9kLmRlYnVnKGBbbWVzc2FnaW5nXSBzZW5kTWVzc2FnZSB7aWQ9JHttZXNzYWdlLmlkfX0gXFx1MTQwQVxcdTI1MDBgLCB7IHJlcywgZXJyIH0pO1xuICAgICAgICBpZiAoZXJyICE9IG51bGwpXG4gICAgICAgICAgdGhyb3cgZGVzZXJpYWxpemVFcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBvbk1lc3NhZ2UodHlwZSwgb25SZWNlaXZlZCkge1xuICAgICAgdmFyIF9hMiwgX2IsIF9jO1xuICAgICAgaWYgKHJlbW92ZVJvb3RMaXN0ZW5lciA9PSBudWxsKSB7XG4gICAgICAgIChfYTIgPSBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2EyLmRlYnVnKFxuICAgICAgICAgIGBbbWVzc2FnaW5nXSBcIiR7dHlwZX1cIiBpbml0aWFsaXplZCB0aGUgbWVzc2FnZSBsaXN0ZW5lciBmb3IgdGhpcyBjb250ZXh0YFxuICAgICAgICApO1xuICAgICAgICByZW1vdmVSb290TGlzdGVuZXIgPSBjb25maWcuYWRkUm9vdExpc3RlbmVyKChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgdmFyIF9hMywgX2IyO1xuICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS50eXBlICE9IFwic3RyaW5nXCIgfHwgdHlwZW9mIG1lc3NhZ2UudGltZXN0YW1wICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmJyZWFrRXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXJyID0gRXJyb3IoXG4gICAgICAgICAgICAgIGBbbWVzc2FnaW5nXSBVbmtub3duIG1lc3NhZ2UgZm9ybWF0LCBtdXN0IGluY2x1ZGUgdGhlICd0eXBlJyAmICd0aW1lc3RhbXAnIGZpZWxkcywgcmVjZWl2ZWQ6ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgICAgICApfWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAoX2EzID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9hMy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgICAoX2IyID0gY29uZmlnID09IG51bGwgPyB2b2lkIDAgOiBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2IyLmRlYnVnKFwiW21lc3NhZ2luZ10gUmVjZWl2ZWQgbWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9IHBlclR5cGVMaXN0ZW5lcnNbbWVzc2FnZS50eXBlXTtcbiAgICAgICAgICBpZiAobGlzdGVuZXIgPT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICBjb25zdCByZXMgPSBsaXN0ZW5lcihtZXNzYWdlKTtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcykudGhlbigocmVzMikgPT4ge1xuICAgICAgICAgICAgdmFyIF9hNCwgX2IzO1xuICAgICAgICAgICAgcmV0dXJuIChfYjMgPSAoX2E0ID0gY29uZmlnLnZlcmlmeU1lc3NhZ2VEYXRhKSA9PSBudWxsID8gdm9pZCAwIDogX2E0LmNhbGwoY29uZmlnLCByZXMyKSkgIT0gbnVsbCA/IF9iMyA6IHJlczI7XG4gICAgICAgICAgfSkudGhlbigocmVzMikgPT4ge1xuICAgICAgICAgICAgdmFyIF9hNDtcbiAgICAgICAgICAgIChfYTQgPSBjb25maWcgPT0gbnVsbCA/IHZvaWQgMCA6IGNvbmZpZy5sb2dnZXIpID09IG51bGwgPyB2b2lkIDAgOiBfYTQuZGVidWcoYFttZXNzYWdpbmddIG9uTWVzc2FnZSB7aWQ9JHttZXNzYWdlLmlkfX0gXFx1MjUwMFxcdTE0MDVgLCB7IHJlczogcmVzMiB9KTtcbiAgICAgICAgICAgIHJldHVybiB7IHJlczogcmVzMiB9O1xuICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIHZhciBfYTQ7XG4gICAgICAgICAgICAoX2E0ID0gY29uZmlnID09IG51bGwgPyB2b2lkIDAgOiBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2E0LmRlYnVnKGBbbWVzc2FnaW5nXSBvbk1lc3NhZ2Uge2lkPSR7bWVzc2FnZS5pZH19IFxcdTI1MDBcXHUxNDA1YCwgeyBlcnIgfSk7XG4gICAgICAgICAgICByZXR1cm4geyBlcnI6IHNlcmlhbGl6ZUVycm9yKGVycikgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAocGVyVHlwZUxpc3RlbmVyc1t0eXBlXSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IEVycm9yKFxuICAgICAgICAgIGBbbWVzc2FnaW5nXSBJbiB0aGlzIEpTIGNvbnRleHQsIG9ubHkgb25lIGxpc3RlbmVyIGNhbiBiZSBzZXR1cCBmb3IgJHt0eXBlfWBcbiAgICAgICAgKTtcbiAgICAgICAgKF9iID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9iLmVycm9yKGVycik7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIHBlclR5cGVMaXN0ZW5lcnNbdHlwZV0gPSBvblJlY2VpdmVkO1xuICAgICAgKF9jID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9jLmxvZyhgW21lc3NhZ2luZ10gQWRkZWQgbGlzdGVuZXIgZm9yICR7dHlwZX1gKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwZXJUeXBlTGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICBjbGVhbnVwUm9vdExpc3RlbmVyKCk7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVtb3ZlQWxsTGlzdGVuZXJzKCkge1xuICAgICAgT2JqZWN0LmtleXMocGVyVHlwZUxpc3RlbmVycykuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICBkZWxldGUgcGVyVHlwZUxpc3RlbmVyc1t0eXBlXTtcbiAgICAgIH0pO1xuICAgICAgY2xlYW51cFJvb3RMaXN0ZW5lcigpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IHtcbiAgX19zcHJlYWRWYWx1ZXMsXG4gIF9fc3ByZWFkUHJvcHMsXG4gIF9fb2JqUmVzdCxcbiAgX19hc3luYyxcbiAgZGVmaW5lR2VuZXJpY01lc3Nhbmdpbmdcbn07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoXCJ3ZWJleHRlbnNpb24tcG9seWZpbGxcIiwgW1wibW9kdWxlXCJdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGZhY3RvcnkobW9kdWxlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbW9kID0ge1xuICAgICAgZXhwb3J0czoge31cbiAgICB9O1xuICAgIGZhY3RvcnkobW9kKTtcbiAgICBnbG9iYWwuYnJvd3NlciA9IG1vZC5leHBvcnRzO1xuICB9XG59KSh0eXBlb2YgZ2xvYmFsVGhpcyAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0aGlzLCBmdW5jdGlvbiAobW9kdWxlKSB7XG4gIC8qIHdlYmV4dGVuc2lvbi1wb2x5ZmlsbCAtIHYwLjEwLjAgLSBGcmkgQXVnIDEyIDIwMjIgMTk6NDI6NDQgKi9cblxuICAvKiAtKi0gTW9kZTogaW5kZW50LXRhYnMtbW9kZTogbmlsOyBqcy1pbmRlbnQtbGV2ZWw6IDIgLSotICovXG5cbiAgLyogdmltOiBzZXQgc3RzPTIgc3c9MiBldCB0dz04MDogKi9cblxuICAvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gICAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAgICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy4gKi9cbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgaWYgKCFnbG9iYWxUaGlzLmNocm9tZT8ucnVudGltZT8uaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHNjcmlwdCBzaG91bGQgb25seSBiZSBsb2FkZWQgaW4gYSBicm93c2VyIGV4dGVuc2lvbi5cIik7XG4gIH1cblxuICBpZiAodHlwZW9mIGdsb2JhbFRoaXMuYnJvd3NlciA9PT0gXCJ1bmRlZmluZWRcIiB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsVGhpcy5icm93c2VyKSAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIGNvbnN0IENIUk9NRV9TRU5EX01FU1NBR0VfQ0FMTEJBQ0tfTk9fUkVTUE9OU0VfTUVTU0FHRSA9IFwiVGhlIG1lc3NhZ2UgcG9ydCBjbG9zZWQgYmVmb3JlIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkLlwiOyAvLyBXcmFwcGluZyB0aGUgYnVsayBvZiB0aGlzIHBvbHlmaWxsIGluIGEgb25lLXRpbWUtdXNlIGZ1bmN0aW9uIGlzIGEgbWlub3JcbiAgICAvLyBvcHRpbWl6YXRpb24gZm9yIEZpcmVmb3guIFNpbmNlIFNwaWRlcm1vbmtleSBkb2VzIG5vdCBmdWxseSBwYXJzZSB0aGVcbiAgICAvLyBjb250ZW50cyBvZiBhIGZ1bmN0aW9uIHVudGlsIHRoZSBmaXJzdCB0aW1lIGl0J3MgY2FsbGVkLCBhbmQgc2luY2UgaXQgd2lsbFxuICAgIC8vIG5ldmVyIGFjdHVhbGx5IG5lZWQgdG8gYmUgY2FsbGVkLCB0aGlzIGFsbG93cyB0aGUgcG9seWZpbGwgdG8gYmUgaW5jbHVkZWRcbiAgICAvLyBpbiBGaXJlZm94IG5lYXJseSBmb3IgZnJlZS5cblxuICAgIGNvbnN0IHdyYXBBUElzID0gZXh0ZW5zaW9uQVBJcyA9PiB7XG4gICAgICAvLyBOT1RFOiBhcGlNZXRhZGF0YSBpcyBhc3NvY2lhdGVkIHRvIHRoZSBjb250ZW50IG9mIHRoZSBhcGktbWV0YWRhdGEuanNvbiBmaWxlXG4gICAgICAvLyBhdCBidWlsZCB0aW1lIGJ5IHJlcGxhY2luZyB0aGUgZm9sbG93aW5nIFwiaW5jbHVkZVwiIHdpdGggdGhlIGNvbnRlbnQgb2YgdGhlXG4gICAgICAvLyBKU09OIGZpbGUuXG4gICAgICBjb25zdCBhcGlNZXRhZGF0YSA9IHtcbiAgICAgICAgXCJhbGFybXNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjbGVhckFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImJvb2ttYXJrc1wiOiB7XG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDaGlsZHJlblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFJlY2VudFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFN1YlRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUcmVlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwibW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZWFyY2hcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJicm93c2VyQWN0aW9uXCI6IHtcbiAgICAgICAgICBcImRpc2FibGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJlbmFibGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEJhZGdlVGV4dFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJvcGVuUG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEJhZGdlVGV4dFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEljb25cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRQb3B1cFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFRpdGxlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYnJvd3NpbmdEYXRhXCI6IHtcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUNhY2hlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlQ29va2llc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZURvd25sb2Fkc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUZvcm1EYXRhXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlSGlzdG9yeVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUxvY2FsU3RvcmFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVBhc3N3b3Jkc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVBsdWdpbkRhdGFcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvbW1hbmRzXCI6IHtcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvbnRleHRNZW51c1wiOiB7XG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJjb29raWVzXCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbENvb2tpZVN0b3Jlc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImRldnRvb2xzXCI6IHtcbiAgICAgICAgICBcImluc3BlY3RlZFdpbmRvd1wiOiB7XG4gICAgICAgICAgICBcImV2YWxcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDIsXG4gICAgICAgICAgICAgIFwic2luZ2xlQ2FsbGJhY2tBcmdcIjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicGFuZWxzXCI6IHtcbiAgICAgICAgICAgIFwiY3JlYXRlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDMsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzLFxuICAgICAgICAgICAgICBcInNpbmdsZUNhbGxiYWNrQXJnXCI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImVsZW1lbnRzXCI6IHtcbiAgICAgICAgICAgICAgXCJjcmVhdGVTaWRlYmFyUGFuZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJkb3dubG9hZHNcIjoge1xuICAgICAgICAgIFwiY2FuY2VsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZG93bmxvYWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJlcmFzZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEZpbGVJY29uXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3BlblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInBhdXNlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRmlsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlc3VtZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNob3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJleHRlbnNpb25cIjoge1xuICAgICAgICAgIFwiaXNBbGxvd2VkRmlsZVNjaGVtZUFjY2Vzc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImlzQWxsb3dlZEluY29nbml0b0FjY2Vzc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImhpc3RvcnlcIjoge1xuICAgICAgICAgIFwiYWRkVXJsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGVsZXRlQWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGVsZXRlUmFuZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVVcmxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRWaXNpdHNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZWFyY2hcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpMThuXCI6IHtcbiAgICAgICAgICBcImRldGVjdExhbmd1YWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWNjZXB0TGFuZ3VhZ2VzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiaWRlbnRpdHlcIjoge1xuICAgICAgICAgIFwibGF1bmNoV2ViQXV0aEZsb3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpZGxlXCI6IHtcbiAgICAgICAgICBcInF1ZXJ5U3RhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtYW5hZ2VtZW50XCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFNlbGZcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRFbmFibGVkXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidW5pbnN0YWxsU2VsZlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm5vdGlmaWNhdGlvbnNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRQZXJtaXNzaW9uTGV2ZWxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWdlQWN0aW9uXCI6IHtcbiAgICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJoaWRlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0SWNvblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzaG93XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGVybWlzc2lvbnNcIjoge1xuICAgICAgICAgIFwiY29udGFpbnNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZXF1ZXN0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicnVudGltZVwiOiB7XG4gICAgICAgICAgXCJnZXRCYWNrZ3JvdW5kUGFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBsYXRmb3JtSW5mb1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm9wZW5PcHRpb25zUGFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlcXVlc3RVcGRhdGVDaGVja1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlbmRNZXNzYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDNcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VuZE5hdGl2ZU1lc3NhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRVbmluc3RhbGxVUkxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXNzaW9uc1wiOiB7XG4gICAgICAgICAgXCJnZXREZXZpY2VzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UmVjZW50bHlDbG9zZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZXN0b3JlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3RvcmFnZVwiOiB7XG4gICAgICAgICAgXCJsb2NhbFwiOiB7XG4gICAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm1hbmFnZWRcIjoge1xuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic3luY1wiOiB7XG4gICAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRhYnNcIjoge1xuICAgICAgICAgIFwiY2FwdHVyZVZpc2libGVUYWJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZXRlY3RMYW5ndWFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRpc2NhcmRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkdXBsaWNhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJleGVjdXRlU2NyaXB0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Q3VycmVudFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFpvb21cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRab29tU2V0dGluZ3NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnb0JhY2tcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnb0ZvcndhcmRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJoaWdobGlnaHRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJpbnNlcnRDU1NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicXVlcnlcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZWxvYWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVDU1NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZW5kTWVzc2FnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFpvb21cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRab29tU2V0dGluZ3NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b3BTaXRlc1wiOiB7XG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3ZWJOYXZpZ2F0aW9uXCI6IHtcbiAgICAgICAgICBcImdldEFsbEZyYW1lc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEZyYW1lXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwid2ViUmVxdWVzdFwiOiB7XG4gICAgICAgICAgXCJoYW5kbGVyQmVoYXZpb3JDaGFuZ2VkXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwid2luZG93c1wiOiB7XG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0TGFzdEZvY3VzZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKGFwaU1ldGFkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXBpLW1ldGFkYXRhLmpzb24gaGFzIG5vdCBiZWVuIGluY2x1ZGVkIGluIGJyb3dzZXItcG9seWZpbGxcIik7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEEgV2Vha01hcCBzdWJjbGFzcyB3aGljaCBjcmVhdGVzIGFuZCBzdG9yZXMgYSB2YWx1ZSBmb3IgYW55IGtleSB3aGljaCBkb2VzXG4gICAgICAgKiBub3QgZXhpc3Qgd2hlbiBhY2Nlc3NlZCwgYnV0IGJlaGF2ZXMgZXhhY3RseSBhcyBhbiBvcmRpbmFyeSBXZWFrTWFwXG4gICAgICAgKiBvdGhlcndpc2UuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY3JlYXRlSXRlbVxuICAgICAgICogICAgICAgIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgaW4gb3JkZXIgdG8gY3JlYXRlIHRoZSB2YWx1ZSBmb3IgYW55XG4gICAgICAgKiAgICAgICAga2V5IHdoaWNoIGRvZXMgbm90IGV4aXN0LCB0aGUgZmlyc3QgdGltZSBpdCBpcyBhY2Nlc3NlZC4gVGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gcmVjZWl2ZXMsIGFzIGl0cyBvbmx5IGFyZ3VtZW50LCB0aGUga2V5IGJlaW5nIGNyZWF0ZWQuXG4gICAgICAgKi9cblxuXG4gICAgICBjbGFzcyBEZWZhdWx0V2Vha01hcCBleHRlbmRzIFdlYWtNYXAge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVJdGVtLCBpdGVtcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN1cGVyKGl0ZW1zKTtcbiAgICAgICAgICB0aGlzLmNyZWF0ZUl0ZW0gPSBjcmVhdGVJdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2V0KGtleSkge1xuICAgICAgICAgIGlmICghdGhpcy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoa2V5LCB0aGlzLmNyZWF0ZUl0ZW0oa2V5KSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHN1cGVyLmdldChrZXkpO1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gb2JqZWN0IHdpdGggYSBgdGhlbmAgbWV0aG9kLCBhbmQgY2FuXG4gICAgICAgKiB0aGVyZWZvcmUgYmUgYXNzdW1lZCB0byBiZWhhdmUgYXMgYSBQcm9taXNlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHRlc3QuXG4gICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdGhlbmFibGUuXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCBpc1RoZW5hYmxlID0gdmFsdWUgPT4ge1xuICAgICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSBcImZ1bmN0aW9uXCI7XG4gICAgICB9O1xuICAgICAgLyoqXG4gICAgICAgKiBDcmVhdGVzIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gd2hpY2gsIHdoZW4gY2FsbGVkLCB3aWxsIHJlc29sdmUgb3IgcmVqZWN0XG4gICAgICAgKiB0aGUgZ2l2ZW4gcHJvbWlzZSBiYXNlZCBvbiBob3cgaXQgaXMgY2FsbGVkOlxuICAgICAgICpcbiAgICAgICAqIC0gSWYsIHdoZW4gY2FsbGVkLCBgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yYCBjb250YWlucyBhIG5vbi1udWxsIG9iamVjdCxcbiAgICAgICAqICAgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCB0aGF0IHZhbHVlLlxuICAgICAgICogLSBJZiB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggZXhhY3RseSBvbmUgYXJndW1lbnQsIHRoZSBwcm9taXNlIGlzXG4gICAgICAgKiAgIHJlc29sdmVkIHRvIHRoYXQgdmFsdWUuXG4gICAgICAgKiAtIE90aGVyd2lzZSwgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgdG8gYW4gYXJyYXkgY29udGFpbmluZyBhbGwgb2YgdGhlXG4gICAgICAgKiAgIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwcm9taXNlXG4gICAgICAgKiAgICAgICAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJlc29sdXRpb24gYW5kIHJlamVjdGlvbiBmdW5jdGlvbnMgb2YgYVxuICAgICAgICogICAgICAgIHByb21pc2UuXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlc29sdmVcbiAgICAgICAqICAgICAgICBUaGUgcHJvbWlzZSdzIHJlc29sdXRpb24gZnVuY3Rpb24uXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlamVjdFxuICAgICAgICogICAgICAgIFRoZSBwcm9taXNlJ3MgcmVqZWN0aW9uIGZ1bmN0aW9uLlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGFkYXRhXG4gICAgICAgKiAgICAgICAgTWV0YWRhdGEgYWJvdXQgdGhlIHdyYXBwZWQgbWV0aG9kIHdoaWNoIGhhcyBjcmVhdGVkIHRoZSBjYWxsYmFjay5cbiAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbWV0YWRhdGEuc2luZ2xlQ2FsbGJhY2tBcmdcbiAgICAgICAqICAgICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIG9ubHkgdGhlIGZpcnN0XG4gICAgICAgKiAgICAgICAgYXJndW1lbnQgb2YgdGhlIGNhbGxiYWNrLCBhbHRlcm5hdGl2ZWx5IGFuIGFycmF5IG9mIGFsbCB0aGVcbiAgICAgICAqICAgICAgICBjYWxsYmFjayBhcmd1bWVudHMgaXMgcmVzb2x2ZWQuIEJ5IGRlZmF1bHQsIGlmIHRoZSBjYWxsYmFja1xuICAgICAgICogICAgICAgIGZ1bmN0aW9uIGlzIGludm9rZWQgd2l0aCBvbmx5IGEgc2luZ2xlIGFyZ3VtZW50LCB0aGF0IHdpbGwgYmVcbiAgICAgICAqICAgICAgICByZXNvbHZlZCB0byB0aGUgcHJvbWlzZSwgd2hpbGUgYWxsIGFyZ3VtZW50cyB3aWxsIGJlIHJlc29sdmVkIGFzXG4gICAgICAgKiAgICAgICAgYW4gYXJyYXkgaWYgbXVsdGlwbGUgYXJlIGdpdmVuLlxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn1cbiAgICAgICAqICAgICAgICBUaGUgZ2VuZXJhdGVkIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICovXG5cblxuICAgICAgY29uc3QgbWFrZUNhbGxiYWNrID0gKHByb21pc2UsIG1ldGFkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiAoLi4uY2FsbGJhY2tBcmdzKSA9PiB7XG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVqZWN0KG5ldyBFcnJvcihleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnIHx8IGNhbGxiYWNrQXJncy5sZW5ndGggPD0gMSAmJiBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShjYWxsYmFja0FyZ3NbMF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY2FsbGJhY2tBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwbHVyYWxpemVBcmd1bWVudHMgPSBudW1BcmdzID0+IG51bUFyZ3MgPT0gMSA/IFwiYXJndW1lbnRcIiA6IFwiYXJndW1lbnRzXCI7XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSB3cmFwcGVyIGZ1bmN0aW9uIGZvciBhIG1ldGhvZCB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBtZXRhZGF0YS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICogICAgICAgIFRoZSBuYW1lIG9mIHRoZSBtZXRob2Qgd2hpY2ggaXMgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhZGF0YVxuICAgICAgICogICAgICAgIE1ldGFkYXRhIGFib3V0IHRoZSBtZXRob2QgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7aW50ZWdlcn0gbWV0YWRhdGEubWluQXJnc1xuICAgICAgICogICAgICAgIFRoZSBtaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudHMgd2hpY2ggbXVzdCBiZSBwYXNzZWQgdG8gdGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24uIElmIGNhbGxlZCB3aXRoIGZld2VyIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtpbnRlZ2VyfSBtZXRhZGF0YS5tYXhBcmdzXG4gICAgICAgKiAgICAgICAgVGhlIG1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtYXkgYmUgcGFzc2VkIHRvIHRoZVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uLiBJZiBjYWxsZWQgd2l0aCBtb3JlIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtib29sZWFufSBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZ1xuICAgICAgICogICAgICAgIFdoZXRoZXIgb3Igbm90IHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggb25seSB0aGUgZmlyc3RcbiAgICAgICAqICAgICAgICBhcmd1bWVudCBvZiB0aGUgY2FsbGJhY2ssIGFsdGVybmF0aXZlbHkgYW4gYXJyYXkgb2YgYWxsIHRoZVxuICAgICAgICogICAgICAgIGNhbGxiYWNrIGFyZ3VtZW50cyBpcyByZXNvbHZlZC4gQnkgZGVmYXVsdCwgaWYgdGhlIGNhbGxiYWNrXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gaXMgaW52b2tlZCB3aXRoIG9ubHkgYSBzaW5nbGUgYXJndW1lbnQsIHRoYXQgd2lsbCBiZVxuICAgICAgICogICAgICAgIHJlc29sdmVkIHRvIHRoZSBwcm9taXNlLCB3aGlsZSBhbGwgYXJndW1lbnRzIHdpbGwgYmUgcmVzb2x2ZWQgYXNcbiAgICAgICAqICAgICAgICBhbiBhcnJheSBpZiBtdWx0aXBsZSBhcmUgZ2l2ZW4uXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge2Z1bmN0aW9uKG9iamVjdCwgLi4uKil9XG4gICAgICAgKiAgICAgICBUaGUgZ2VuZXJhdGVkIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCB3cmFwQXN5bmNGdW5jdGlvbiA9IChuYW1lLCBtZXRhZGF0YSkgPT4ge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYXN5bmNGdW5jdGlvbldyYXBwZXIodGFyZ2V0LCAuLi5hcmdzKSB7XG4gICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgbWV0YWRhdGEubWluQXJncykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtZXRhZGF0YS5tYXhBcmdzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChtZXRhZGF0YS5mYWxsYmFja1RvTm9DYWxsYmFjaykge1xuICAgICAgICAgICAgICAvLyBUaGlzIEFQSSBtZXRob2QgaGFzIGN1cnJlbnRseSBubyBjYWxsYmFjayBvbiBDaHJvbWUsIGJ1dCBpdCByZXR1cm4gYSBwcm9taXNlIG9uIEZpcmVmb3gsXG4gICAgICAgICAgICAgIC8vIGFuZCBzbyB0aGUgcG9seWZpbGwgd2lsbCB0cnkgdG8gY2FsbCBpdCB3aXRoIGEgY2FsbGJhY2sgZmlyc3QsIGFuZCBpdCB3aWxsIGZhbGxiYWNrXG4gICAgICAgICAgICAgIC8vIHRvIG5vdCBwYXNzaW5nIHRoZSBjYWxsYmFjayBpZiB0aGUgZmlyc3QgY2FsbCBmYWlscy5cbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgICByZWplY3RcbiAgICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChjYkVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGAke25hbWV9IEFQSSBtZXRob2QgZG9lc24ndCBzZWVtIHRvIHN1cHBvcnQgdGhlIGNhbGxiYWNrIHBhcmFtZXRlciwgYCArIFwiZmFsbGluZyBiYWNrIHRvIGNhbGwgaXQgd2l0aG91dCBhIGNhbGxiYWNrOiBcIiwgY2JFcnJvcik7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpOyAvLyBVcGRhdGUgdGhlIEFQSSBtZXRob2QgbWV0YWRhdGEsIHNvIHRoYXQgdGhlIG5leHQgQVBJIGNhbGxzIHdpbGwgbm90IHRyeSB0b1xuICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgdW5zdXBwb3J0ZWQgY2FsbGJhY2sgYW55bW9yZS5cblxuICAgICAgICAgICAgICAgIG1ldGFkYXRhLmZhbGxiYWNrVG9Ob0NhbGxiYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEubm9DYWxsYmFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLm5vQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICAgIC8qKlxuICAgICAgICogV3JhcHMgYW4gZXhpc3RpbmcgbWV0aG9kIG9mIHRoZSB0YXJnZXQgb2JqZWN0LCBzbyB0aGF0IGNhbGxzIHRvIGl0IGFyZVxuICAgICAgICogaW50ZXJjZXB0ZWQgYnkgdGhlIGdpdmVuIHdyYXBwZXIgZnVuY3Rpb24uIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHJlY2VpdmVzLFxuICAgICAgICogYXMgaXRzIGZpcnN0IGFyZ3VtZW50LCB0aGUgb3JpZ2luYWwgYHRhcmdldGAgb2JqZWN0LCBmb2xsb3dlZCBieSBlYWNoIG9mXG4gICAgICAgKiB0aGUgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgb3JpZ2luYWwgbWV0aG9kLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcbiAgICAgICAqICAgICAgICBUaGUgb3JpZ2luYWwgdGFyZ2V0IG9iamVjdCB0aGF0IHRoZSB3cmFwcGVkIG1ldGhvZCBiZWxvbmdzIHRvLlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gbWV0aG9kXG4gICAgICAgKiAgICAgICAgVGhlIG1ldGhvZCBiZWluZyB3cmFwcGVkLiBUaGlzIGlzIHVzZWQgYXMgdGhlIHRhcmdldCBvZiB0aGUgUHJveHlcbiAgICAgICAqICAgICAgICBvYmplY3Qgd2hpY2ggaXMgY3JlYXRlZCB0byB3cmFwIHRoZSBtZXRob2QuXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgVGhlIHdyYXBwZXIgZnVuY3Rpb24gd2hpY2ggaXMgY2FsbGVkIGluIHBsYWNlIG9mIGEgZGlyZWN0IGludm9jYXRpb25cbiAgICAgICAqICAgICAgICBvZiB0aGUgd3JhcHBlZCBtZXRob2QuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge1Byb3h5PGZ1bmN0aW9uPn1cbiAgICAgICAqICAgICAgICBBIFByb3h5IG9iamVjdCBmb3IgdGhlIGdpdmVuIG1ldGhvZCwgd2hpY2ggaW52b2tlcyB0aGUgZ2l2ZW4gd3JhcHBlclxuICAgICAgICogICAgICAgIG1ldGhvZCBpbiBpdHMgcGxhY2UuXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCB3cmFwTWV0aG9kID0gKHRhcmdldCwgbWV0aG9kLCB3cmFwcGVyKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkobWV0aG9kLCB7XG4gICAgICAgICAgYXBwbHkodGFyZ2V0TWV0aG9kLCB0aGlzT2JqLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gd3JhcHBlci5jYWxsKHRoaXNPYmosIHRhcmdldCwgLi4uYXJncyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgbGV0IGhhc093blByb3BlcnR5ID0gRnVuY3Rpb24uY2FsbC5iaW5kKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuICAgICAgLyoqXG4gICAgICAgKiBXcmFwcyBhbiBvYmplY3QgaW4gYSBQcm94eSB3aGljaCBpbnRlcmNlcHRzIGFuZCB3cmFwcyBjZXJ0YWluIG1ldGhvZHNcbiAgICAgICAqIGJhc2VkIG9uIHRoZSBnaXZlbiBgd3JhcHBlcnNgIGFuZCBgbWV0YWRhdGFgIG9iamVjdHMuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuICAgICAgICogICAgICAgIFRoZSB0YXJnZXQgb2JqZWN0IHRvIHdyYXAuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IFt3cmFwcGVycyA9IHt9XVxuICAgICAgICogICAgICAgIEFuIG9iamVjdCB0cmVlIGNvbnRhaW5pbmcgd3JhcHBlciBmdW5jdGlvbnMgZm9yIHNwZWNpYWwgY2FzZXMuIEFueVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uIHByZXNlbnQgaW4gdGhpcyBvYmplY3QgdHJlZSBpcyBjYWxsZWQgaW4gcGxhY2Ugb2YgdGhlXG4gICAgICAgKiAgICAgICAgbWV0aG9kIGluIHRoZSBzYW1lIGxvY2F0aW9uIGluIHRoZSBgdGFyZ2V0YCBvYmplY3QgdHJlZS4gVGhlc2VcbiAgICAgICAqICAgICAgICB3cmFwcGVyIG1ldGhvZHMgYXJlIGludm9rZWQgYXMgZGVzY3JpYmVkIGluIHtAc2VlIHdyYXBNZXRob2R9LlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbbWV0YWRhdGEgPSB7fV1cbiAgICAgICAqICAgICAgICBBbiBvYmplY3QgdHJlZSBjb250YWluaW5nIG1ldGFkYXRhIHVzZWQgdG8gYXV0b21hdGljYWxseSBnZW5lcmF0ZVxuICAgICAgICogICAgICAgIFByb21pc2UtYmFzZWQgd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFzeW5jaHJvbm91cy4gQW55IGZ1bmN0aW9uIGluXG4gICAgICAgKiAgICAgICAgdGhlIGB0YXJnZXRgIG9iamVjdCB0cmVlIHdoaWNoIGhhcyBhIGNvcnJlc3BvbmRpbmcgbWV0YWRhdGEgb2JqZWN0XG4gICAgICAgKiAgICAgICAgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGBtZXRhZGF0YWAgdHJlZSBpcyByZXBsYWNlZCB3aXRoIGFuXG4gICAgICAgKiAgICAgICAgYXV0b21hdGljYWxseS1nZW5lcmF0ZWQgd3JhcHBlciBmdW5jdGlvbiwgYXMgZGVzY3JpYmVkIGluXG4gICAgICAgKiAgICAgICAge0BzZWUgd3JhcEFzeW5jRnVuY3Rpb259XG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge1Byb3h5PG9iamVjdD59XG4gICAgICAgKi9cblxuICAgICAgY29uc3Qgd3JhcE9iamVjdCA9ICh0YXJnZXQsIHdyYXBwZXJzID0ge30sIG1ldGFkYXRhID0ge30pID0+IHtcbiAgICAgICAgbGV0IGNhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgbGV0IGhhbmRsZXJzID0ge1xuICAgICAgICAgIGhhcyhwcm94eVRhcmdldCwgcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3AgaW4gdGFyZ2V0IHx8IHByb3AgaW4gY2FjaGU7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGdldChwcm94eVRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjYWNoZVtwcm9wXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEocHJvcCBpbiB0YXJnZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHRhcmdldFtwcm9wXTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBtZXRob2Qgb24gdGhlIHVuZGVybHlpbmcgb2JqZWN0LiBDaGVjayBpZiB3ZSBuZWVkIHRvIGRvXG4gICAgICAgICAgICAgIC8vIGFueSB3cmFwcGluZy5cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB3cmFwcGVyc1twcm9wXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpYWwtY2FzZSB3cmFwcGVyIGZvciB0aGlzIG1ldGhvZC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBNZXRob2QodGFyZ2V0LCB0YXJnZXRbcHJvcF0sIHdyYXBwZXJzW3Byb3BdKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNPd25Qcm9wZXJ0eShtZXRhZGF0YSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGFzeW5jIG1ldGhvZCB0aGF0IHdlIGhhdmUgbWV0YWRhdGEgZm9yLiBDcmVhdGUgYVxuICAgICAgICAgICAgICAgIC8vIFByb21pc2Ugd3JhcHBlciBmb3IgaXQuXG4gICAgICAgICAgICAgICAgbGV0IHdyYXBwZXIgPSB3cmFwQXN5bmNGdW5jdGlvbihwcm9wLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwTWV0aG9kKHRhcmdldCwgdGFyZ2V0W3Byb3BdLCB3cmFwcGVyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgbWV0aG9kIHRoYXQgd2UgZG9uJ3Qga25vdyBvciBjYXJlIGFib3V0LiBSZXR1cm4gdGhlXG4gICAgICAgICAgICAgICAgLy8gb3JpZ2luYWwgbWV0aG9kLCBib3VuZCB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5iaW5kKHRhcmdldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmIChoYXNPd25Qcm9wZXJ0eSh3cmFwcGVycywgcHJvcCkgfHwgaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIHByb3ApKSkge1xuICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIG9iamVjdCB0aGF0IHdlIG5lZWQgdG8gZG8gc29tZSB3cmFwcGluZyBmb3IgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICAgIC8vIG9mLiBDcmVhdGUgYSBzdWItb2JqZWN0IHdyYXBwZXIgZm9yIGl0IHdpdGggdGhlIGFwcHJvcHJpYXRlIGNoaWxkXG4gICAgICAgICAgICAgIC8vIG1ldGFkYXRhLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBPYmplY3QodmFsdWUsIHdyYXBwZXJzW3Byb3BdLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc093blByb3BlcnR5KG1ldGFkYXRhLCBcIipcIikpIHtcbiAgICAgICAgICAgICAgLy8gV3JhcCBhbGwgcHJvcGVydGllcyBpbiAqIG5hbWVzcGFjZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwT2JqZWN0KHZhbHVlLCB3cmFwcGVyc1twcm9wXSwgbWV0YWRhdGFbXCIqXCJdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55IHdyYXBwaW5nIGZvciB0aGlzIHByb3BlcnR5LFxuICAgICAgICAgICAgICAvLyBzbyBqdXN0IGZvcndhcmQgYWxsIGFjY2VzcyB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2V0KHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc2V0KHByb3h5VGFyZ2V0LCBwcm9wLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgIGNhY2hlW3Byb3BdID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGRlZmluZVByb3BlcnR5KHByb3h5VGFyZ2V0LCBwcm9wLCBkZXNjKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwgZGVzYyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGRlbGV0ZVByb3BlcnR5KHByb3h5VGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eShjYWNoZSwgcHJvcCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH07IC8vIFBlciBjb250cmFjdCBvZiB0aGUgUHJveHkgQVBJLCB0aGUgXCJnZXRcIiBwcm94eSBoYW5kbGVyIG11c3QgcmV0dXJuIHRoZVxuICAgICAgICAvLyBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgdGFyZ2V0IGlmIHRoYXQgdmFsdWUgaXMgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZFxuICAgICAgICAvLyBub24tY29uZmlndXJhYmxlLiBGb3IgdGhpcyByZWFzb24sIHdlIGNyZWF0ZSBhbiBvYmplY3Qgd2l0aCB0aGVcbiAgICAgICAgLy8gcHJvdG90eXBlIHNldCB0byBgdGFyZ2V0YCBpbnN0ZWFkIG9mIHVzaW5nIGB0YXJnZXRgIGRpcmVjdGx5LlxuICAgICAgICAvLyBPdGhlcndpc2Ugd2UgY2Fubm90IHJldHVybiBhIGN1c3RvbSBvYmplY3QgZm9yIEFQSXMgdGhhdFxuICAgICAgICAvLyBhcmUgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZCBub24tY29uZmlndXJhYmxlLCBzdWNoIGFzIGBjaHJvbWUuZGV2dG9vbHNgLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgcHJveHkgaGFuZGxlcnMgdGhlbXNlbHZlcyB3aWxsIHN0aWxsIHVzZSB0aGUgb3JpZ2luYWwgYHRhcmdldGBcbiAgICAgICAgLy8gaW5zdGVhZCBvZiB0aGUgYHByb3h5VGFyZ2V0YCwgc28gdGhhdCB0aGUgbWV0aG9kcyBhbmQgcHJvcGVydGllcyBhcmVcbiAgICAgICAgLy8gZGVyZWZlcmVuY2VkIHZpYSB0aGUgb3JpZ2luYWwgdGFyZ2V0cy5cblxuICAgICAgICBsZXQgcHJveHlUYXJnZXQgPSBPYmplY3QuY3JlYXRlKHRhcmdldCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkocHJveHlUYXJnZXQsIGhhbmRsZXJzKTtcbiAgICAgIH07XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSBzZXQgb2Ygd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFuIGV2ZW50IG9iamVjdCwgd2hpY2ggaGFuZGxlc1xuICAgICAgICogd3JhcHBpbmcgb2YgbGlzdGVuZXIgZnVuY3Rpb25zIHRoYXQgdGhvc2UgbWVzc2FnZXMgYXJlIHBhc3NlZC5cbiAgICAgICAqXG4gICAgICAgKiBBIHNpbmdsZSB3cmFwcGVyIGlzIGNyZWF0ZWQgZm9yIGVhY2ggbGlzdGVuZXIgZnVuY3Rpb24sIGFuZCBzdG9yZWQgaW4gYVxuICAgICAgICogbWFwLiBTdWJzZXF1ZW50IGNhbGxzIHRvIGBhZGRMaXN0ZW5lcmAsIGBoYXNMaXN0ZW5lcmAsIG9yIGByZW1vdmVMaXN0ZW5lcmBcbiAgICAgICAqIHJldHJpZXZlIHRoZSBvcmlnaW5hbCB3cmFwcGVyLCBzbyB0aGF0ICBhdHRlbXB0cyB0byByZW1vdmUgYVxuICAgICAgICogcHJldmlvdXNseS1hZGRlZCBsaXN0ZW5lciB3b3JrIGFzIGV4cGVjdGVkLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7RGVmYXVsdFdlYWtNYXA8ZnVuY3Rpb24sIGZ1bmN0aW9uPn0gd3JhcHBlck1hcFxuICAgICAgICogICAgICAgIEEgRGVmYXVsdFdlYWtNYXAgb2JqZWN0IHdoaWNoIHdpbGwgY3JlYXRlIHRoZSBhcHByb3ByaWF0ZSB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgZm9yIGEgZ2l2ZW4gbGlzdGVuZXIgZnVuY3Rpb24gd2hlbiBvbmUgZG9lcyBub3QgZXhpc3QsIGFuZCByZXRyaWV2ZVxuICAgICAgICogICAgICAgIGFuIGV4aXN0aW5nIG9uZSB3aGVuIGl0IGRvZXMuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAqL1xuXG5cbiAgICAgIGNvbnN0IHdyYXBFdmVudCA9IHdyYXBwZXJNYXAgPT4gKHtcbiAgICAgICAgYWRkTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lciwgLi4uYXJncykge1xuICAgICAgICAgIHRhcmdldC5hZGRMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lciksIC4uLmFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhc0xpc3RlbmVyKHRhcmdldCwgbGlzdGVuZXIpIHtcbiAgICAgICAgICByZXR1cm4gdGFyZ2V0Lmhhc0xpc3RlbmVyKHdyYXBwZXJNYXAuZ2V0KGxpc3RlbmVyKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICAgIHRhcmdldC5yZW1vdmVMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lcikpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBvblJlcXVlc3RGaW5pc2hlZFdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhbiBvblJlcXVlc3RGaW5pc2hlZCBsaXN0ZW5lciBmdW5jdGlvbiBzbyB0aGF0IGl0IHdpbGwgcmV0dXJuIGFcbiAgICAgICAgICogYGdldENvbnRlbnQoKWAgcHJvcGVydHkgd2hpY2ggcmV0dXJucyBhIGBQcm9taXNlYCByYXRoZXIgdGhhbiB1c2luZyBhXG4gICAgICAgICAqIGNhbGxiYWNrIEFQSS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHJlcVxuICAgICAgICAgKiAgICAgICAgVGhlIEhBUiBlbnRyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBuZXR3b3JrIHJlcXVlc3QuXG4gICAgICAgICAqL1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uUmVxdWVzdEZpbmlzaGVkKHJlcSkge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRSZXEgPSB3cmFwT2JqZWN0KHJlcSwge31cbiAgICAgICAgICAvKiB3cmFwcGVycyAqL1xuICAgICAgICAgICwge1xuICAgICAgICAgICAgZ2V0Q29udGVudDoge1xuICAgICAgICAgICAgICBtaW5BcmdzOiAwLFxuICAgICAgICAgICAgICBtYXhBcmdzOiAwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgbGlzdGVuZXIod3JhcHBlZFJlcSk7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IG9uTWVzc2FnZVdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhIG1lc3NhZ2UgbGlzdGVuZXIgZnVuY3Rpb24gc28gdGhhdCBpdCBtYXkgc2VuZCByZXNwb25zZXMgYmFzZWQgb25cbiAgICAgICAgICogaXRzIHJldHVybiB2YWx1ZSwgcmF0aGVyIHRoYW4gYnkgcmV0dXJuaW5nIGEgc2VudGluZWwgdmFsdWUgYW5kIGNhbGxpbmcgYVxuICAgICAgICAgKiBjYWxsYmFjay4gSWYgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHJldHVybnMgYSBQcm9taXNlLCB0aGUgcmVzcG9uc2UgaXNcbiAgICAgICAgICogc2VudCB3aGVuIHRoZSBwcm9taXNlIGVpdGhlciByZXNvbHZlcyBvciByZWplY3RzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0geyp9IG1lc3NhZ2VcbiAgICAgICAgICogICAgICAgIFRoZSBtZXNzYWdlIHNlbnQgYnkgdGhlIG90aGVyIGVuZCBvZiB0aGUgY2hhbm5lbC5cbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHNlbmRlclxuICAgICAgICAgKiAgICAgICAgRGV0YWlscyBhYm91dCB0aGUgc2VuZGVyIG9mIHRoZSBtZXNzYWdlLlxuICAgICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCopfSBzZW5kUmVzcG9uc2VcbiAgICAgICAgICogICAgICAgIEEgY2FsbGJhY2sgd2hpY2gsIHdoZW4gY2FsbGVkIHdpdGggYW4gYXJiaXRyYXJ5IGFyZ3VtZW50LCBzZW5kc1xuICAgICAgICAgKiAgICAgICAgdGhhdCB2YWx1ZSBhcyBhIHJlc3BvbnNlLlxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICogICAgICAgIFRydWUgaWYgdGhlIHdyYXBwZWQgbGlzdGVuZXIgcmV0dXJuZWQgYSBQcm9taXNlLCB3aGljaCB3aWxsIGxhdGVyXG4gICAgICAgICAqICAgICAgICB5aWVsZCBhIHJlc3BvbnNlLiBGYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uTWVzc2FnZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkge1xuICAgICAgICAgIGxldCBkaWRDYWxsU2VuZFJlc3BvbnNlID0gZmFsc2U7XG4gICAgICAgICAgbGV0IHdyYXBwZWRTZW5kUmVzcG9uc2U7XG4gICAgICAgICAgbGV0IHNlbmRSZXNwb25zZVByb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHdyYXBwZWRTZW5kUmVzcG9uc2UgPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgZGlkQ2FsbFNlbmRSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsZXQgcmVzdWx0O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGxpc3RlbmVyKG1lc3NhZ2UsIHNlbmRlciwgd3JhcHBlZFNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlzUmVzdWx0VGhlbmFibGUgPSByZXN1bHQgIT09IHRydWUgJiYgaXNUaGVuYWJsZShyZXN1bHQpOyAvLyBJZiB0aGUgbGlzdGVuZXIgZGlkbid0IHJldHVybmVkIHRydWUgb3IgYSBQcm9taXNlLCBvciBjYWxsZWRcbiAgICAgICAgICAvLyB3cmFwcGVkU2VuZFJlc3BvbnNlIHN5bmNocm9ub3VzbHksIHdlIGNhbiBleGl0IGVhcmxpZXJcbiAgICAgICAgICAvLyBiZWNhdXNlIHRoZXJlIHdpbGwgYmUgbm8gcmVzcG9uc2Ugc2VudCBmcm9tIHRoaXMgbGlzdGVuZXIuXG5cbiAgICAgICAgICBpZiAocmVzdWx0ICE9PSB0cnVlICYmICFpc1Jlc3VsdFRoZW5hYmxlICYmICFkaWRDYWxsU2VuZFJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSAvLyBBIHNtYWxsIGhlbHBlciB0byBzZW5kIHRoZSBtZXNzYWdlIGlmIHRoZSBwcm9taXNlIHJlc29sdmVzXG4gICAgICAgICAgLy8gYW5kIGFuIGVycm9yIGlmIHRoZSBwcm9taXNlIHJlamVjdHMgKGEgd3JhcHBlZCBzZW5kTWVzc2FnZSBoYXNcbiAgICAgICAgICAvLyB0byB0cmFuc2xhdGUgdGhlIG1lc3NhZ2UgaW50byBhIHJlc29sdmVkIHByb21pc2Ugb3IgYSByZWplY3RlZFxuICAgICAgICAgIC8vIHByb21pc2UpLlxuXG5cbiAgICAgICAgICBjb25zdCBzZW5kUHJvbWlzZWRSZXN1bHQgPSBwcm9taXNlID0+IHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihtc2cgPT4ge1xuICAgICAgICAgICAgICAvLyBzZW5kIHRoZSBtZXNzYWdlIHZhbHVlLlxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobXNnKTtcbiAgICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgLy8gU2VuZCBhIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGVycm9yIGlmIHRoZSByZWplY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAvLyBpcyBhbiBpbnN0YW5jZSBvZiBlcnJvciwgb3IgdGhlIG9iamVjdCBpdHNlbGYgb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcblxuICAgICAgICAgICAgICBpZiAoZXJyb3IgJiYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgfHwgdHlwZW9mIGVycm9yLm1lc3NhZ2UgPT09IFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZFwiO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICBfX21veldlYkV4dGVuc2lvblBvbHlmaWxsUmVqZWN0X186IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgIC8vIFByaW50IGFuIGVycm9yIG9uIHRoZSBjb25zb2xlIGlmIHVuYWJsZSB0byBzZW5kIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIG9uTWVzc2FnZSByZWplY3RlZCByZXBseVwiLCBlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTsgLy8gSWYgdGhlIGxpc3RlbmVyIHJldHVybmVkIGEgUHJvbWlzZSwgc2VuZCB0aGUgcmVzb2x2ZWQgdmFsdWUgYXMgYVxuICAgICAgICAgIC8vIHJlc3VsdCwgb3RoZXJ3aXNlIHdhaXQgdGhlIHByb21pc2UgcmVsYXRlZCB0byB0aGUgd3JhcHBlZFNlbmRSZXNwb25zZVxuICAgICAgICAgIC8vIGNhbGxiYWNrIHRvIHJlc29sdmUgYW5kIHNlbmQgaXQgYXMgYSByZXNwb25zZS5cblxuXG4gICAgICAgICAgaWYgKGlzUmVzdWx0VGhlbmFibGUpIHtcbiAgICAgICAgICAgIHNlbmRQcm9taXNlZFJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kUHJvbWlzZWRSZXN1bHQoc2VuZFJlc3BvbnNlUHJvbWlzZSk7XG4gICAgICAgICAgfSAvLyBMZXQgQ2hyb21lIGtub3cgdGhhdCB0aGUgbGlzdGVuZXIgaXMgcmVwbHlpbmcuXG5cblxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrID0gKHtcbiAgICAgICAgcmVqZWN0LFxuICAgICAgICByZXNvbHZlXG4gICAgICB9LCByZXBseSkgPT4ge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIC8vIERldGVjdCB3aGVuIG5vbmUgb2YgdGhlIGxpc3RlbmVycyByZXBsaWVkIHRvIHRoZSBzZW5kTWVzc2FnZSBjYWxsIGFuZCByZXNvbHZlXG4gICAgICAgICAgLy8gdGhlIHByb21pc2UgdG8gdW5kZWZpbmVkIGFzIGluIEZpcmVmb3guXG4gICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9pc3N1ZXMvMTMwXG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSA9PT0gQ0hST01FX1NFTkRfTUVTU0FHRV9DQUxMQkFDS19OT19SRVNQT05TRV9NRVNTQUdFKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlcGx5ICYmIHJlcGx5Ll9fbW96V2ViRXh0ZW5zaW9uUG9seWZpbGxSZWplY3RfXykge1xuICAgICAgICAgIC8vIENvbnZlcnQgYmFjayB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZXJyb3IgaW50b1xuICAgICAgICAgIC8vIGFuIEVycm9yIGluc3RhbmNlLlxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IocmVwbHkubWVzc2FnZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVwbHkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCB3cmFwcGVkU2VuZE1lc3NhZ2UgPSAobmFtZSwgbWV0YWRhdGEsIGFwaU5hbWVzcGFjZU9iaiwgLi4uYXJncykgPT4ge1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPCBtZXRhZGF0YS5taW5BcmdzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1ldGFkYXRhLm1heEFyZ3MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRDYiA9IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrLmJpbmQobnVsbCwge1xuICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFyZ3MucHVzaCh3cmFwcGVkQ2IpO1xuICAgICAgICAgIGFwaU5hbWVzcGFjZU9iai5zZW5kTWVzc2FnZSguLi5hcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBzdGF0aWNXcmFwcGVycyA9IHtcbiAgICAgICAgZGV2dG9vbHM6IHtcbiAgICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgICBvblJlcXVlc3RGaW5pc2hlZDogd3JhcEV2ZW50KG9uUmVxdWVzdEZpbmlzaGVkV3JhcHBlcnMpXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgb25NZXNzYWdlOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICAgIG9uTWVzc2FnZUV4dGVybmFsOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICAgIHNlbmRNZXNzYWdlOiB3cmFwcGVkU2VuZE1lc3NhZ2UuYmluZChudWxsLCBcInNlbmRNZXNzYWdlXCIsIHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgICBtYXhBcmdzOiAzXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgdGFiczoge1xuICAgICAgICAgIHNlbmRNZXNzYWdlOiB3cmFwcGVkU2VuZE1lc3NhZ2UuYmluZChudWxsLCBcInNlbmRNZXNzYWdlXCIsIHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDIsXG4gICAgICAgICAgICBtYXhBcmdzOiAzXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IHNldHRpbmdNZXRhZGF0YSA9IHtcbiAgICAgICAgY2xlYXI6IHtcbiAgICAgICAgICBtaW5BcmdzOiAxLFxuICAgICAgICAgIG1heEFyZ3M6IDFcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgbWluQXJnczogMSxcbiAgICAgICAgICBtYXhBcmdzOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHNldDoge1xuICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgbWF4QXJnczogMVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgYXBpTWV0YWRhdGEucHJpdmFjeSA9IHtcbiAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgIFwiKlwiOiBzZXR0aW5nTWV0YWRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgc2VydmljZXM6IHtcbiAgICAgICAgICBcIipcIjogc2V0dGluZ01ldGFkYXRhXG4gICAgICAgIH0sXG4gICAgICAgIHdlYnNpdGVzOiB7XG4gICAgICAgICAgXCIqXCI6IHNldHRpbmdNZXRhZGF0YVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHdyYXBPYmplY3QoZXh0ZW5zaW9uQVBJcywgc3RhdGljV3JhcHBlcnMsIGFwaU1ldGFkYXRhKTtcbiAgICB9OyAvLyBUaGUgYnVpbGQgcHJvY2VzcyBhZGRzIGEgVU1EIHdyYXBwZXIgYXJvdW5kIHRoaXMgZmlsZSwgd2hpY2ggbWFrZXMgdGhlXG4gICAgLy8gYG1vZHVsZWAgdmFyaWFibGUgYXZhaWxhYmxlLlxuXG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHdyYXBBUElzKGNocm9tZSk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWxUaGlzLmJyb3dzZXI7XG4gIH1cbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YnJvd3Nlci1wb2x5ZmlsbC5qcy5tYXBcbiIsImltcG9ydCB7XG4gIF9fc3ByZWFkUHJvcHMsXG4gIF9fc3ByZWFkVmFsdWVzLFxuICBkZWZpbmVHZW5lcmljTWVzc2FuZ2luZ1xufSBmcm9tIFwiLi9jaHVuay1CUUxGU0ZGWi5qc1wiO1xuXG4vLyBzcmMvZXh0ZW5zaW9uLnRzXG5pbXBvcnQgQnJvd3NlciBmcm9tIFwid2ViZXh0ZW5zaW9uLXBvbHlmaWxsXCI7XG5mdW5jdGlvbiBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmcoY29uZmlnKSB7XG4gIHJldHVybiBkZWZpbmVHZW5lcmljTWVzc2FuZ2luZyhfX3NwcmVhZFByb3BzKF9fc3ByZWFkVmFsdWVzKHt9LCBjb25maWcpLCB7XG4gICAgc2VuZE1lc3NhZ2UobWVzc2FnZSwgdGFiSWQpIHtcbiAgICAgIGlmICh0YWJJZCA9PSBudWxsKVxuICAgICAgICByZXR1cm4gQnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgcmV0dXJuIEJyb3dzZXIudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgbWVzc2FnZSk7XG4gICAgfSxcbiAgICBhZGRSb290TGlzdGVuZXIocHJvY2Vzc01lc3NhZ2UpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyID0gKG1lc3NhZ2UsIHNlbmRlcikgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NNZXNzYWdlKF9fc3ByZWFkUHJvcHMoX19zcHJlYWRWYWx1ZXMoe30sIG1lc3NhZ2UpLCB7IHNlbmRlciB9KSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gcHJvY2Vzc01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICB9O1xuICAgICAgQnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gKCkgPT4gQnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgfVxuICB9KSk7XG59XG5leHBvcnQge1xuICBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmdcbn07XG4iLCJpbXBvcnQgeyBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmcgfSBmcm9tICdAd2ViZXh0LWNvcmUvbWVzc2FnaW5nJztcclxuXHJcbmludGVyZmFjZSBQcm90b2NvbE1hcCB7XHJcbiAgZ2V0UGFnZUxhbmd1YWdlcygpOiBzdHJpbmdbXTtcclxuICBzZXRDb3VudChkYXRhOiBudW1iZXIpOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgeyBzZW5kTWVzc2FnZSwgb25NZXNzYWdlIH0gPVxyXG4gIGRlZmluZUV4dGVuc2lvbk1lc3NhZ2luZzxQcm90b2NvbE1hcD4oKTtcclxuIiwiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUNvbnRlbnRTY3JpcHQoZGVmaW5pdGlvbikge1xuICByZXR1cm4gZGVmaW5pdGlvbjtcbn1cbiIsImltcG9ydCB7IGRlZmluZUNvbnRlbnRTY3JpcHQgfSBmcm9tICd3eHQvc2FuZGJveCc7XHJcblxyXG50eXBlIENhbkRldGVjdCA9ICdubycgfCAncmVhZGlseScgfCAnYWZ0ZXItZG93bmxvYWQnO1xyXG5cclxudHlwZSBEZXRlY3RvckV2ZW50cyA9ICdkb3dubG9hZHByb2dyZXNzJztcclxuXHJcbnR5cGUgRG93bmxvYWRQcm9ncmVzc0V2ZW50QXJncyA9IHtcclxuICBsb2FkZWQ6IG51bWJlcjtcclxuICB0b3RhbDogbnVtYmVyO1xyXG59O1xyXG5cclxudHlwZSBEZXRlY3RvciA9IHtcclxuICBkZXRlY3Q6IChcclxuICAgIHRleHQ6IHN0cmluZ1xyXG4gICkgPT4gUHJvbWlzZTx7IGNvbmZpZGVuY2U6IG51bWJlcjsgZGV0ZWN0ZWRMYW5ndWFnZTogc3RyaW5nIH1bXT47XHJcbiAgcmVhZHk6IFByb21pc2U8dm9pZD47XHJcbiAgYWRkRXZlbnRMaXN0ZW5lcjogKFxyXG4gICAgZXZlbnROYW1lOiBEZXRlY3RvckV2ZW50cyxcclxuICAgIGNhbGxiYWNrOiAoZTogRG93bmxvYWRQcm9ncmVzc0V2ZW50QXJncykgPT4gdm9pZFxyXG4gICkgPT4gdm9pZDtcclxufTtcclxuXHJcbnR5cGUgVHJhbnNsYXRpb24gPSB7XHJcbiAgY2FuRGV0ZWN0OiAoKSA9PiBQcm9taXNlPENhbkRldGVjdD47XHJcbiAgY3JlYXRlRGV0ZWN0b3I6ICgpID0+IFByb21pc2U8RGV0ZWN0b3I+O1xyXG59O1xyXG5cclxudHlwZSBTZWxmV2l0aFRyYW5zbGF0aW9uID0ge1xyXG4gIHRyYW5zbGF0aW9uOiBUcmFuc2xhdGlvbjtcclxufTtcclxuXHJcbmxldCBsYW5ndWFnZURldGVjdG9yOiBEZXRlY3RvciB8IG51bGwgPSBudWxsO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XHJcbiAgbWF0Y2hlczogWycqOi8vKi8qJ10sXHJcbiAgcnVuQXQ6ICdkb2N1bWVudF9zdGFydCcsXHJcbiAgbWFpbjogYXN5bmMgKCkgPT4ge1xyXG4gICAgc3Vic2NyaWJlVG9NZXNzYWdlcygpO1xyXG4gICAgbGFuZ3VhZ2VEZXRlY3RvciA9IGF3YWl0IHNldHVwRGV0ZWN0b3IoKTtcclxuICB9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gc3Vic2NyaWJlVG9NZXNzYWdlcygpIHtcclxuICBvbk1lc3NhZ2UoJ2dldFBhZ2VMYW5ndWFnZXMnLCAoKSA9PiB7XHJcbiAgICByZXR1cm4gZGV0ZWN0UGFnZUxhbmd1YWdlcygpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzZXR1cERldGVjdG9yKCkge1xyXG4gIGlmICgndHJhbnNsYXRpb24nIGluIHNlbGYpIHtcclxuICAgIGNvbnN0IHNlbGZXaXRoVHJhbnNsYXRpb24gPSBzZWxmIGFzIFNlbGZXaXRoVHJhbnNsYXRpb247XHJcbiAgICBpZiAoXHJcbiAgICAgICdjYW5EZXRlY3QnIGluIHNlbGZXaXRoVHJhbnNsYXRpb24udHJhbnNsYXRpb24gJiZcclxuICAgICAgJ2NyZWF0ZURldGVjdG9yJyBpbiBzZWxmV2l0aFRyYW5zbGF0aW9uLnRyYW5zbGF0aW9uXHJcbiAgICApIHtcclxuICAgICAgY29uc3QgY2FuRGV0ZWN0ID0gYXdhaXQgc2VsZldpdGhUcmFuc2xhdGlvbi50cmFuc2xhdGlvbi5jYW5EZXRlY3QoKTtcclxuXHJcbiAgICAgIGlmIChjYW5EZXRlY3QgPT09ICdubycpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgbGFuZ3VhZ2VEZXRlY3RvciA9XHJcbiAgICAgICAgYXdhaXQgc2VsZldpdGhUcmFuc2xhdGlvbi50cmFuc2xhdGlvbi5jcmVhdGVEZXRlY3RvcigpO1xyXG5cclxuICAgICAgaWYgKGNhbkRldGVjdCA9PT0gJ2FmdGVyLWRvd25sb2FkJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdMYW5ndWFnZSBkZXRlY3RvciBtb2RlbCBkb3dubG9hZGluZyEnKTtcclxuICAgICAgICBsYW5ndWFnZURldGVjdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2Rvd25sb2FkcHJvZ3Jlc3MnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coYERvd25sb2FkIHByb2dyZXNzIC0gJHtlLmxvYWRlZH0vJHtlLnRvdGFsfWApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IGxhbmd1YWdlRGV0ZWN0b3IucmVhZHk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0xhbmd1YWdlIGRldGVjdG9yIG1vZGVsIGRvd25sb2FkZWQgc3VjY2Vzc2Z1bGx5IScpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gbGFuZ3VhZ2VEZXRlY3RvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBkZXRlY3RQYWdlTGFuZ3VhZ2VzKCkge1xyXG4gIGlmICghbGFuZ3VhZ2VEZXRlY3Rvcikge1xyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgYWxsVGV4dE9uUGFnZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJzpyb290Jyk/LnRleHRDb250ZW50ID8/ICcnO1xyXG4gIGNvbnN0IGRldGVjdGVkTGFuZ3VhZ2VzID0gYXdhaXQgbGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QoYWxsVGV4dE9uUGFnZSk7XHJcbiAgcmV0dXJuIGRldGVjdGVkTGFuZ3VhZ2VzLnNsaWNlKDAsIDIpLm1hcCgoZCkgPT4gZC5kZXRlY3RlZExhbmd1YWdlKTtcclxufVxyXG4iLCJleHBvcnQgY29uc3QgYnJvd3NlciA9IChcbiAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkID09IG51bGwgPyBnbG9iYWxUaGlzLmNocm9tZSA6IChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgZ2xvYmFsVGhpcy5icm93c2VyXG4gIClcbik7XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICBjb25zdCBlbnRyeXBvaW50TmFtZSA9IHR5cGVvZiBpbXBvcnQubWV0YS5lbnYgPT09IFwidW5kZWZpbmVkXCIgPyBcImJ1aWxkXCIgOiBpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVDtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2VudHJ5cG9pbnROYW1lfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uLy4uL3NhbmRib3gvdXRpbHMvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0SW50ZXJ2YWwoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhckludGVydmFsKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldFRpbWVvdXRgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRUaW1lb3V0KGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhclRpbWVvdXQoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBDYWxsIGB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcmAgYW5kIHJlbW92ZSB0aGUgZXZlbnQgbGlzdGVuZXIgd2hlbiB0aGUgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW5jbHVkZXMgYWRkaXRpb25hbCBldmVudHMgdXNlZnVsIGZvciBjb250ZW50IHNjcmlwdHM6XG4gICAqXG4gICAqIC0gYFwid3h0OmxvY2F0aW9uY2hhbmdlXCJgIC0gVHJpZ2dlcmVkIHdoZW4gSFRNTDUgaGlzdG9yeSBtb2RlIGlzIHVzZWQgdG8gY2hhbmdlIFVSTC4gQ29udGVudFxuICAgKiAgIHNjcmlwdHMgYXJlIG5vdCByZWxvYWRlZCB3aGVuIG5hdmlnYXRpbmcgdGhpcyB3YXksIHNvIHRoaXMgY2FuIGJlIHVzZWQgdG8gcmVzZXQgdGhlIGNvbnRlbnRcbiAgICogICBzY3JpcHQgc3RhdGUgb24gVVJMIGNoYW5nZSwgb3IgcnVuIGN1c3RvbSBjb2RlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjdHguYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcbiAgICogICAvLyAuLi5cbiAgICogfSk7XG4gICAqIGN0eC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50LCBcInd4dDpsb2NhdGlvbmNoYW5nZVwiLCAoKSA9PiB7XG4gICAqICAgLy8gLi4uXG4gICAqIH0pO1xuICAgKi9cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IEV2ZW50IGRvbid0IG1hdGNoLCBidXQgdGhhdCdzIE9LLCBFdmVudFRhcmdldCBkb2Vzbid0IGFsbG93IGN1c3RvbSB0eXBlcyBpbiB0aGUgY2FsbGJhY2tcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICBsaXN0ZW5Gb3JOZXdlclNjcmlwdHMob3B0aW9ucykge1xuICAgIGxldCBpc0ZpcnN0ID0gdHJ1ZTtcbiAgICBjb25zdCBjYiA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSAmJiBldmVudC5kYXRhPy5jb250ZW50U2NyaXB0TmFtZSA9PT0gdGhpcy5jb250ZW50U2NyaXB0TmFtZSkge1xuICAgICAgICBjb25zdCB3YXNGaXJzdCA9IGlzRmlyc3Q7XG4gICAgICAgIGlzRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgaWYgKHdhc0ZpcnN0ICYmIG9wdGlvbnM/Lmlnbm9yZUZpcnN0RXZlbnQpIHJldHVybjtcbiAgICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiByZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYikpO1xuICB9XG59XG4iXSwibmFtZXMiOlsidGhpcyIsImxhbmd1YWdlRGV0ZWN0b3IiLCJwcmludCIsImxvZ2dlciJdLCJtYXBwaW5ncyI6Ijs7O0NBQUEsTUFBTSxJQUFJLEdBQUc7Q0FDYjtDQUNBLENBQUMsU0FBUztDQUNWLENBQUMsVUFBVTtDQUNYLENBQUMsY0FBYztDQUNmLENBQUMsV0FBVztDQUNaLENBQUMsU0FBUztDQUNWLENBQUMsUUFBUTs7Q0FFVDtDQUNBLENBQUMsVUFBVSxDQUFDLFlBQVk7O0NBRXhCO0NBQ0E7Q0FDQSxDQUFDLFVBQVUsQ0FBQyxjQUFjO0NBQzFCLENBQUMsVUFBVSxDQUFDLFdBQVc7Q0FDdkI7Q0FDQTtDQUNBLEVBQUUsTUFBTSxDQUFDLE9BQU87Q0FDaEIsRUFBRSxHQUFHO0NBQ0wsRUFBRSxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQztDQUNoRCxFQUFFOztDQUVGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDOztDQ3JCaEMsTUFBTSxRQUFRLFNBQVMsS0FBSyxDQUFDO0NBQ3BDLENB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QUFFO2NBQ1o7Q0FDWCxZQUFVLFdBQVcsRUFBRTtlQUNYLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFdBQVcsRUFBRTtlQUNYLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFdBQVcsRUFBRTtlQUNYLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLE1BQU0sRUFBRTtlQUNOLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLE9BQU8sRUFBRTtlQUNQLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFFBQVEsRUFBRTtlQUNSLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFFBQVEsRUFBRTtlQUNSLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFdBQVcsRUFBRTtlQUNYLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLGFBQWEsRUFBRTtlQUNiLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFNBQVMsRUFBRTtlQUNULFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLGlCQUFpQixFQUFFO2VBQ2pCLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO2NBQ1o7Q0FDWCxZQUFVLFFBQVEsRUFBRTtlQUNSLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO0NBQ3ZCO1lBQ1M7Q0FDVCxVQUFRLFVBQVUsRUFBRTtDQUNwQixZQUFVLEtBQUssRUFBRTtlQUNMLFNBQVMsRUFBRSxDQUFDO0NBQ3hCLGNBQVksU0FBUyxFQUFFO0NBQ3ZCO1lB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QUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLElBQUk7Q0FDL0Q7Q0FDQSxNQUFNLE9BQU87Q0FDYixNQUFNO0NBQ04sUUFBUSxHQUFHLE9BQU87Q0FDbEIsUUFBUSxNQUFNLEVBQUUsSUFBSSxDQUFDO0NBQ3JCO0NBQ0EsS0FBSztDQUNMO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQSxFQUFFLGlCQUFpQixHQUFHO0NBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQztDQUNwRCxJQUFJQyxRQUFNLENBQUMsS0FBSztDQUNoQixNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQjtDQUNyRSxLQUFLO0NBQ0w7Q0FDQSxFQUFFLGNBQWMsR0FBRztDQUNuQixJQUFJLE1BQU0sQ0FBQyxXQUFXO0NBQ3RCLE1BQU07Q0FDTixRQUFRLElBQUksRUFBRSxvQkFBb0IsQ0FBQywyQkFBMkI7Q0FDOUQsUUFBUSxpQkFBaUIsRUFBRSxJQUFJLENBQUM7Q0FDaEMsT0FBTztDQUNQLE1BQU07Q0FDTixLQUFLO0NBQ0w7Q0FDQSxFQUFFLHFCQUFxQixDQUFDLE9BQU8sRUFBRTtDQUNqQyxJQUFJLElBQUksT0FBTyxHQUFHLElBQUk7Q0FDdEIsSUFBSSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssS0FBSztDQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssb0JBQW9CLENBQUMsMkJBQTJCLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7Q0FDN0ksUUFBUSxNQUFNLFFBQVEsR0FBRyxPQUFPO0NBQ2hDLFFBQVEsT0FBTyxHQUFHLEtBQUs7Q0FDdkIsUUFBUSxJQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUU7Q0FDbkQsUUFBUSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7Q0FDaEM7Q0FDQSxLQUFLO0NBQ0wsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO0NBQ25DLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztDQUNoRTtDQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDYsOCw5LDEwLDExLDEyXX0=
