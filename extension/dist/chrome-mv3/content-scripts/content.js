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

	const __vite_import_meta_env__ = {"BASE_URL": "/", "BROWSER": "chrome", "CHROME": true, "COMMAND": "serve", "DEV": true, "EDGE": false, "ENTRYPOINT": "content", "FIREFOX": false, "MANIFEST_VERSION": 3, "MODE": "development", "OPERA": false, "PROD": false, "SAFARI": false, "SSR": false, "VITE_CJS_IGNORE_WARNING": "true", "WXT_BACKEND_URL": "http://localhost:8000/inference"};
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3NlcmlhbGl6ZS1lcnJvci9lcnJvci1jb25zdHJ1Y3RvcnMuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvc2VyaWFsaXplLWVycm9yL2luZGV4LmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tZXNzYWdpbmcvbGliL2NodW5rLUJRTEZTRkZaLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tZXNzYWdpbmcvbm9kZV9tb2R1bGVzL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9kaXN0L2Jyb3dzZXItcG9seWZpbGwuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21lc3NhZ2luZy9saWIvaW5kZXguanMiLCIuLi8uLi8uLi9zcmMvdXRpbHMvbWVzc2FnaW5nLnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3NhbmRib3gvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL3NyYy9lbnRyeXBvaW50cy9jb250ZW50LnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9jbGllbnQvY29udGVudC1zY3JpcHRzL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2NsaWVudC9jb250ZW50LXNjcmlwdHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgbGlzdCA9IFtcblx0Ly8gTmF0aXZlIEVTIGVycm9ycyBodHRwczovLzI2Mi5lY21hLWludGVybmF0aW9uYWwub3JnLzEyLjAvI3NlYy13ZWxsLWtub3duLWludHJpbnNpYy1vYmplY3RzXG5cdEV2YWxFcnJvcixcblx0UmFuZ2VFcnJvcixcblx0UmVmZXJlbmNlRXJyb3IsXG5cdFN5bnRheEVycm9yLFxuXHRUeXBlRXJyb3IsXG5cdFVSSUVycm9yLFxuXG5cdC8vIEJ1aWx0LWluIGVycm9yc1xuXHRnbG9iYWxUaGlzLkRPTUV4Y2VwdGlvbixcblxuXHQvLyBOb2RlLXNwZWNpZmljIGVycm9yc1xuXHQvLyBodHRwczovL25vZGVqcy5vcmcvYXBpL2Vycm9ycy5odG1sXG5cdGdsb2JhbFRoaXMuQXNzZXJ0aW9uRXJyb3IsXG5cdGdsb2JhbFRoaXMuU3lzdGVtRXJyb3IsXG5dXG5cdC8vIE5vbi1uYXRpdmUgRXJyb3JzIGFyZSB1c2VkIHdpdGggYGdsb2JhbFRoaXNgIGJlY2F1c2UgdGhleSBtaWdodCBiZSBtaXNzaW5nLiBUaGlzIGZpbHRlciBkcm9wcyB0aGVtIHdoZW4gdW5kZWZpbmVkLlxuXHQuZmlsdGVyKEJvb2xlYW4pXG5cdC5tYXAoXG5cdFx0Y29uc3RydWN0b3IgPT4gW2NvbnN0cnVjdG9yLm5hbWUsIGNvbnN0cnVjdG9yXSxcblx0KTtcblxuY29uc3QgZXJyb3JDb25zdHJ1Y3RvcnMgPSBuZXcgTWFwKGxpc3QpO1xuXG5leHBvcnQgZGVmYXVsdCBlcnJvckNvbnN0cnVjdG9ycztcbiIsImltcG9ydCBlcnJvckNvbnN0cnVjdG9ycyBmcm9tICcuL2Vycm9yLWNvbnN0cnVjdG9ycy5qcyc7XG5cbmV4cG9ydCBjbGFzcyBOb25FcnJvciBleHRlbmRzIEVycm9yIHtcblx0bmFtZSA9ICdOb25FcnJvcic7XG5cblx0Y29uc3RydWN0b3IobWVzc2FnZSkge1xuXHRcdHN1cGVyKE5vbkVycm9yLl9wcmVwYXJlU3VwZXJNZXNzYWdlKG1lc3NhZ2UpKTtcblx0fVxuXG5cdHN0YXRpYyBfcHJlcGFyZVN1cGVyTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcblx0XHR9IGNhdGNoIHtcblx0XHRcdHJldHVybiBTdHJpbmcobWVzc2FnZSk7XG5cdFx0fVxuXHR9XG59XG5cbmNvbnN0IGNvbW1vblByb3BlcnRpZXMgPSBbXG5cdHtcblx0XHRwcm9wZXJ0eTogJ25hbWUnLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdtZXNzYWdlJyxcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0fSxcblx0e1xuXHRcdHByb3BlcnR5OiAnc3RhY2snLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdjb2RlJyxcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHR9LFxuXHR7XG5cdFx0cHJvcGVydHk6ICdjYXVzZScsXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdH0sXG5dO1xuXG5jb25zdCB0b0pzb25XYXNDYWxsZWQgPSBuZXcgV2Vha1NldCgpO1xuXG5jb25zdCB0b0pTT04gPSBmcm9tID0+IHtcblx0dG9Kc29uV2FzQ2FsbGVkLmFkZChmcm9tKTtcblx0Y29uc3QganNvbiA9IGZyb20udG9KU09OKCk7XG5cdHRvSnNvbldhc0NhbGxlZC5kZWxldGUoZnJvbSk7XG5cdHJldHVybiBqc29uO1xufTtcblxuY29uc3QgZ2V0RXJyb3JDb25zdHJ1Y3RvciA9IG5hbWUgPT4gZXJyb3JDb25zdHJ1Y3RvcnMuZ2V0KG5hbWUpID8/IEVycm9yO1xuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgY29tcGxleGl0eVxuY29uc3QgZGVzdHJveUNpcmN1bGFyID0gKHtcblx0ZnJvbSxcblx0c2Vlbixcblx0dG8sXG5cdGZvcmNlRW51bWVyYWJsZSxcblx0bWF4RGVwdGgsXG5cdGRlcHRoLFxuXHR1c2VUb0pTT04sXG5cdHNlcmlhbGl6ZSxcbn0pID0+IHtcblx0aWYgKCF0bykge1xuXHRcdGlmIChBcnJheS5pc0FycmF5KGZyb20pKSB7XG5cdFx0XHR0byA9IFtdO1xuXHRcdH0gZWxzZSBpZiAoIXNlcmlhbGl6ZSAmJiBpc0Vycm9yTGlrZShmcm9tKSkge1xuXHRcdFx0Y29uc3QgRXJyb3IgPSBnZXRFcnJvckNvbnN0cnVjdG9yKGZyb20ubmFtZSk7XG5cdFx0XHR0byA9IG5ldyBFcnJvcigpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0byA9IHt9O1xuXHRcdH1cblx0fVxuXG5cdHNlZW4ucHVzaChmcm9tKTtcblxuXHRpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcblx0XHRyZXR1cm4gdG87XG5cdH1cblxuXHRpZiAodXNlVG9KU09OICYmIHR5cGVvZiBmcm9tLnRvSlNPTiA9PT0gJ2Z1bmN0aW9uJyAmJiAhdG9Kc29uV2FzQ2FsbGVkLmhhcyhmcm9tKSkge1xuXHRcdHJldHVybiB0b0pTT04oZnJvbSk7XG5cdH1cblxuXHRjb25zdCBjb250aW51ZURlc3Ryb3lDaXJjdWxhciA9IHZhbHVlID0+IGRlc3Ryb3lDaXJjdWxhcih7XG5cdFx0ZnJvbTogdmFsdWUsXG5cdFx0c2VlbjogWy4uLnNlZW5dLFxuXHRcdGZvcmNlRW51bWVyYWJsZSxcblx0XHRtYXhEZXB0aCxcblx0XHRkZXB0aCxcblx0XHR1c2VUb0pTT04sXG5cdFx0c2VyaWFsaXplLFxuXHR9KTtcblxuXHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhmcm9tKSkge1xuXHRcdGlmICh2YWx1ZSAmJiB2YWx1ZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgJiYgdmFsdWUuY29uc3RydWN0b3IubmFtZSA9PT0gJ0J1ZmZlcicpIHtcblx0XHRcdHRvW2tleV0gPSAnW29iamVjdCBCdWZmZXJdJztcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblxuXHRcdC8vIFRPRE86IFVzZSBgc3RyZWFtLmlzUmVhZGFibGUoKWAgd2hlbiB0YXJnZXRpbmcgTm9kZS5qcyAxOC5cblx0XHRpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgdmFsdWUucGlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0dG9ba2V5XSA9ICdbb2JqZWN0IFN0cmVhbV0nO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnKSB7XG5cdFx0XHQvLyBHcmFjZWZ1bGx5IGhhbmRsZSBub24tY29uZmlndXJhYmxlIGVycm9ycyBsaWtlIGBET01FeGNlcHRpb25gLlxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dG9ba2V5XSA9IHZhbHVlO1xuXHRcdFx0fSBjYXRjaCB7fVxuXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHRpZiAoIXNlZW4uaW5jbHVkZXMoZnJvbVtrZXldKSkge1xuXHRcdFx0ZGVwdGgrKztcblx0XHRcdHRvW2tleV0gPSBjb250aW51ZURlc3Ryb3lDaXJjdWxhcihmcm9tW2tleV0pO1xuXG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cblx0XHR0b1trZXldID0gJ1tDaXJjdWxhcl0nO1xuXHR9XG5cblx0Zm9yIChjb25zdCB7cHJvcGVydHksIGVudW1lcmFibGV9IG9mIGNvbW1vblByb3BlcnRpZXMpIHtcblx0XHRpZiAodHlwZW9mIGZyb21bcHJvcGVydHldICE9PSAndW5kZWZpbmVkJyAmJiBmcm9tW3Byb3BlcnR5XSAhPT0gbnVsbCkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRvLCBwcm9wZXJ0eSwge1xuXHRcdFx0XHR2YWx1ZTogaXNFcnJvckxpa2UoZnJvbVtwcm9wZXJ0eV0pID8gY29udGludWVEZXN0cm95Q2lyY3VsYXIoZnJvbVtwcm9wZXJ0eV0pIDogZnJvbVtwcm9wZXJ0eV0sXG5cdFx0XHRcdGVudW1lcmFibGU6IGZvcmNlRW51bWVyYWJsZSA/IHRydWUgOiBlbnVtZXJhYmxlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUVycm9yKHZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3Qge1xuXHRcdG1heERlcHRoID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZLFxuXHRcdHVzZVRvSlNPTiA9IHRydWUsXG5cdH0gPSBvcHRpb25zO1xuXG5cdGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG5cdFx0cmV0dXJuIGRlc3Ryb3lDaXJjdWxhcih7XG5cdFx0XHRmcm9tOiB2YWx1ZSxcblx0XHRcdHNlZW46IFtdLFxuXHRcdFx0Zm9yY2VFbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0bWF4RGVwdGgsXG5cdFx0XHRkZXB0aDogMCxcblx0XHRcdHVzZVRvSlNPTixcblx0XHRcdHNlcmlhbGl6ZTogdHJ1ZSxcblx0XHR9KTtcblx0fVxuXG5cdC8vIFBlb3BsZSBzb21ldGltZXMgdGhyb3cgdGhpbmdzIGJlc2lkZXMgRXJyb3Igb2JqZWN0c+KAplxuXHRpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Ly8gYEpTT04uc3RyaW5naWZ5KClgIGRpc2NhcmRzIGZ1bmN0aW9ucy4gV2UgZG8gdG9vLCB1bmxlc3MgYSBmdW5jdGlvbiBpcyB0aHJvd24gZGlyZWN0bHkuXG5cdFx0Ly8gV2UgaW50ZW50aW9uYWxseSB1c2UgYHx8YCBiZWNhdXNlIGAubmFtZWAgaXMgYW4gZW1wdHkgc3RyaW5nIGZvciBhbm9ueW1vdXMgZnVuY3Rpb25zLlxuXHRcdHJldHVybiBgW0Z1bmN0aW9uOiAke3ZhbHVlLm5hbWUgfHwgJ2Fub255bW91cyd9XWA7XG5cdH1cblxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZUVycm9yKHZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3Qge21heERlcHRoID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZfSA9IG9wdGlvbnM7XG5cblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgRXJyb3IpIHtcblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHRpZiAoaXNNaW5pbXVtVmlhYmxlU2VyaWFsaXplZEVycm9yKHZhbHVlKSkge1xuXHRcdGNvbnN0IEVycm9yID0gZ2V0RXJyb3JDb25zdHJ1Y3Rvcih2YWx1ZS5uYW1lKTtcblx0XHRyZXR1cm4gZGVzdHJveUNpcmN1bGFyKHtcblx0XHRcdGZyb206IHZhbHVlLFxuXHRcdFx0c2VlbjogW10sXG5cdFx0XHR0bzogbmV3IEVycm9yKCksXG5cdFx0XHRtYXhEZXB0aCxcblx0XHRcdGRlcHRoOiAwLFxuXHRcdFx0c2VyaWFsaXplOiBmYWxzZSxcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiBuZXcgTm9uRXJyb3IodmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNFcnJvckxpa2UodmFsdWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odmFsdWUpXG5cdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0JiYgJ25hbWUnIGluIHZhbHVlXG5cdCYmICdtZXNzYWdlJyBpbiB2YWx1ZVxuXHQmJiAnc3RhY2snIGluIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpc01pbmltdW1WaWFibGVTZXJpYWxpemVkRXJyb3IodmFsdWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odmFsdWUpXG5cdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0JiYgJ21lc3NhZ2UnIGluIHZhbHVlXG5cdCYmICFBcnJheS5pc0FycmF5KHZhbHVlKTtcbn1cblxuZXhwb3J0IHtkZWZhdWx0IGFzIGVycm9yQ29uc3RydWN0b3JzfSBmcm9tICcuL2Vycm9yLWNvbnN0cnVjdG9ycy5qcyc7XG4iLCJ2YXIgX19kZWZQcm9wID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xudmFyIF9fZGVmUHJvcHMgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbnZhciBfX2dldE93blByb3BEZXNjcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzO1xudmFyIF9fZ2V0T3duUHJvcFN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIF9faGFzT3duUHJvcCA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgX19wcm9wSXNFbnVtID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcbnZhciBfX2RlZk5vcm1hbFByb3AgPSAob2JqLCBrZXksIHZhbHVlKSA9PiBrZXkgaW4gb2JqID8gX19kZWZQcm9wKG9iaiwga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUsIHZhbHVlIH0pIDogb2JqW2tleV0gPSB2YWx1ZTtcbnZhciBfX3NwcmVhZFZhbHVlcyA9IChhLCBiKSA9PiB7XG4gIGZvciAodmFyIHByb3AgaW4gYiB8fCAoYiA9IHt9KSlcbiAgICBpZiAoX19oYXNPd25Qcm9wLmNhbGwoYiwgcHJvcCkpXG4gICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gIGlmIChfX2dldE93blByb3BTeW1ib2xzKVxuICAgIGZvciAodmFyIHByb3Agb2YgX19nZXRPd25Qcm9wU3ltYm9scyhiKSkge1xuICAgICAgaWYgKF9fcHJvcElzRW51bS5jYWxsKGIsIHByb3ApKVxuICAgICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gICAgfVxuICByZXR1cm4gYTtcbn07XG52YXIgX19zcHJlYWRQcm9wcyA9IChhLCBiKSA9PiBfX2RlZlByb3BzKGEsIF9fZ2V0T3duUHJvcERlc2NzKGIpKTtcbnZhciBfX29ialJlc3QgPSAoc291cmNlLCBleGNsdWRlKSA9PiB7XG4gIHZhciB0YXJnZXQgPSB7fTtcbiAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpXG4gICAgaWYgKF9faGFzT3duUHJvcC5jYWxsKHNvdXJjZSwgcHJvcCkgJiYgZXhjbHVkZS5pbmRleE9mKHByb3ApIDwgMClcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgaWYgKHNvdXJjZSAhPSBudWxsICYmIF9fZ2V0T3duUHJvcFN5bWJvbHMpXG4gICAgZm9yICh2YXIgcHJvcCBvZiBfX2dldE93blByb3BTeW1ib2xzKHNvdXJjZSkpIHtcbiAgICAgIGlmIChleGNsdWRlLmluZGV4T2YocHJvcCkgPCAwICYmIF9fcHJvcElzRW51bS5jYWxsKHNvdXJjZSwgcHJvcCkpXG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xudmFyIF9fYXN5bmMgPSAoX190aGlzLCBfX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSA9PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdmFyIGZ1bGZpbGxlZCA9ICh2YWx1ZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgcmVqZWN0ZWQgPSAodmFsdWUpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN0ZXAoZ2VuZXJhdG9yLnRocm93KHZhbHVlKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzdGVwID0gKHgpID0+IHguZG9uZSA/IHJlc29sdmUoeC52YWx1ZSkgOiBQcm9taXNlLnJlc29sdmUoeC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTtcbiAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkoX190aGlzLCBfX2FyZ3VtZW50cykpLm5leHQoKSk7XG4gIH0pO1xufTtcblxuLy8gc3JjL2dlbmVyaWMudHNcbmltcG9ydCB7IHNlcmlhbGl6ZUVycm9yLCBkZXNlcmlhbGl6ZUVycm9yIH0gZnJvbSBcInNlcmlhbGl6ZS1lcnJvclwiO1xuZnVuY3Rpb24gZGVmaW5lR2VuZXJpY01lc3NhbmdpbmcoY29uZmlnKSB7XG4gIGxldCByZW1vdmVSb290TGlzdGVuZXI7XG4gIGxldCBwZXJUeXBlTGlzdGVuZXJzID0ge307XG4gIGZ1bmN0aW9uIGNsZWFudXBSb290TGlzdGVuZXIoKSB7XG4gICAgaWYgKE9iamVjdC5lbnRyaWVzKHBlclR5cGVMaXN0ZW5lcnMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmVtb3ZlUm9vdExpc3RlbmVyID09IG51bGwgPyB2b2lkIDAgOiByZW1vdmVSb290TGlzdGVuZXIoKTtcbiAgICAgIHJlbW92ZVJvb3RMaXN0ZW5lciA9IHZvaWQgMDtcbiAgICB9XG4gIH1cbiAgbGV0IGlkU2VxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMWU0KTtcbiAgZnVuY3Rpb24gZ2V0TmV4dElkKCkge1xuICAgIHJldHVybiBpZFNlcSsrO1xuICB9XG4gIHJldHVybiB7XG4gICAgc2VuZE1lc3NhZ2UodHlwZSwgZGF0YSwgLi4uYXJncykge1xuICAgICAgcmV0dXJuIF9fYXN5bmModGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgdmFyIF9hMiwgX2IsIF9jLCBfZDtcbiAgICAgICAgY29uc3QgX21lc3NhZ2UgPSB7XG4gICAgICAgICAgaWQ6IGdldE5leHRJZCgpLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IChfYiA9IHlpZWxkIChfYTIgPSBjb25maWcudmVyaWZ5TWVzc2FnZURhdGEpID09IG51bGwgPyB2b2lkIDAgOiBfYTIuY2FsbChjb25maWcsIF9tZXNzYWdlKSkgIT0gbnVsbCA/IF9iIDogX21lc3NhZ2U7XG4gICAgICAgIChfYyA9IGNvbmZpZy5sb2dnZXIpID09IG51bGwgPyB2b2lkIDAgOiBfYy5kZWJ1ZyhgW21lc3NhZ2luZ10gc2VuZE1lc3NhZ2Uge2lkPSR7bWVzc2FnZS5pZH19IFxcdTI1MDBcXHUxNDA1YCwgbWVzc2FnZSwgLi4uYXJncyk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0geWllbGQgY29uZmlnLnNlbmRNZXNzYWdlKG1lc3NhZ2UsIC4uLmFyZ3MpO1xuICAgICAgICBjb25zdCB7IHJlcywgZXJyIH0gPSByZXNwb25zZSAhPSBudWxsID8gcmVzcG9uc2UgOiB7IGVycjogbmV3IEVycm9yKFwiTm8gcmVzcG9uc2VcIikgfTtcbiAgICAgICAgKF9kID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9kLmRlYnVnKGBbbWVzc2FnaW5nXSBzZW5kTWVzc2FnZSB7aWQ9JHttZXNzYWdlLmlkfX0gXFx1MTQwQVxcdTI1MDBgLCB7IHJlcywgZXJyIH0pO1xuICAgICAgICBpZiAoZXJyICE9IG51bGwpXG4gICAgICAgICAgdGhyb3cgZGVzZXJpYWxpemVFcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBvbk1lc3NhZ2UodHlwZSwgb25SZWNlaXZlZCkge1xuICAgICAgdmFyIF9hMiwgX2IsIF9jO1xuICAgICAgaWYgKHJlbW92ZVJvb3RMaXN0ZW5lciA9PSBudWxsKSB7XG4gICAgICAgIChfYTIgPSBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2EyLmRlYnVnKFxuICAgICAgICAgIGBbbWVzc2FnaW5nXSBcIiR7dHlwZX1cIiBpbml0aWFsaXplZCB0aGUgbWVzc2FnZSBsaXN0ZW5lciBmb3IgdGhpcyBjb250ZXh0YFxuICAgICAgICApO1xuICAgICAgICByZW1vdmVSb290TGlzdGVuZXIgPSBjb25maWcuYWRkUm9vdExpc3RlbmVyKChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgdmFyIF9hMywgX2IyO1xuICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS50eXBlICE9IFwic3RyaW5nXCIgfHwgdHlwZW9mIG1lc3NhZ2UudGltZXN0YW1wICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmJyZWFrRXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXJyID0gRXJyb3IoXG4gICAgICAgICAgICAgIGBbbWVzc2FnaW5nXSBVbmtub3duIG1lc3NhZ2UgZm9ybWF0LCBtdXN0IGluY2x1ZGUgdGhlICd0eXBlJyAmICd0aW1lc3RhbXAnIGZpZWxkcywgcmVjZWl2ZWQ6ICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgICAgICApfWBcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAoX2EzID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9hMy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgICAoX2IyID0gY29uZmlnID09IG51bGwgPyB2b2lkIDAgOiBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2IyLmRlYnVnKFwiW21lc3NhZ2luZ10gUmVjZWl2ZWQgbWVzc2FnZVwiLCBtZXNzYWdlKTtcbiAgICAgICAgICBjb25zdCBsaXN0ZW5lciA9IHBlclR5cGVMaXN0ZW5lcnNbbWVzc2FnZS50eXBlXTtcbiAgICAgICAgICBpZiAobGlzdGVuZXIgPT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICBjb25zdCByZXMgPSBsaXN0ZW5lcihtZXNzYWdlKTtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcykudGhlbigocmVzMikgPT4ge1xuICAgICAgICAgICAgdmFyIF9hNCwgX2IzO1xuICAgICAgICAgICAgcmV0dXJuIChfYjMgPSAoX2E0ID0gY29uZmlnLnZlcmlmeU1lc3NhZ2VEYXRhKSA9PSBudWxsID8gdm9pZCAwIDogX2E0LmNhbGwoY29uZmlnLCByZXMyKSkgIT0gbnVsbCA/IF9iMyA6IHJlczI7XG4gICAgICAgICAgfSkudGhlbigocmVzMikgPT4ge1xuICAgICAgICAgICAgdmFyIF9hNDtcbiAgICAgICAgICAgIChfYTQgPSBjb25maWcgPT0gbnVsbCA/IHZvaWQgMCA6IGNvbmZpZy5sb2dnZXIpID09IG51bGwgPyB2b2lkIDAgOiBfYTQuZGVidWcoYFttZXNzYWdpbmddIG9uTWVzc2FnZSB7aWQ9JHttZXNzYWdlLmlkfX0gXFx1MjUwMFxcdTE0MDVgLCB7IHJlczogcmVzMiB9KTtcbiAgICAgICAgICAgIHJldHVybiB7IHJlczogcmVzMiB9O1xuICAgICAgICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIHZhciBfYTQ7XG4gICAgICAgICAgICAoX2E0ID0gY29uZmlnID09IG51bGwgPyB2b2lkIDAgOiBjb25maWcubG9nZ2VyKSA9PSBudWxsID8gdm9pZCAwIDogX2E0LmRlYnVnKGBbbWVzc2FnaW5nXSBvbk1lc3NhZ2Uge2lkPSR7bWVzc2FnZS5pZH19IFxcdTI1MDBcXHUxNDA1YCwgeyBlcnIgfSk7XG4gICAgICAgICAgICByZXR1cm4geyBlcnI6IHNlcmlhbGl6ZUVycm9yKGVycikgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAocGVyVHlwZUxpc3RlbmVyc1t0eXBlXSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IEVycm9yKFxuICAgICAgICAgIGBbbWVzc2FnaW5nXSBJbiB0aGlzIEpTIGNvbnRleHQsIG9ubHkgb25lIGxpc3RlbmVyIGNhbiBiZSBzZXR1cCBmb3IgJHt0eXBlfWBcbiAgICAgICAgKTtcbiAgICAgICAgKF9iID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9iLmVycm9yKGVycik7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIHBlclR5cGVMaXN0ZW5lcnNbdHlwZV0gPSBvblJlY2VpdmVkO1xuICAgICAgKF9jID0gY29uZmlnLmxvZ2dlcikgPT0gbnVsbCA/IHZvaWQgMCA6IF9jLmxvZyhgW21lc3NhZ2luZ10gQWRkZWQgbGlzdGVuZXIgZm9yICR7dHlwZX1gKTtcbiAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgIGRlbGV0ZSBwZXJUeXBlTGlzdGVuZXJzW3R5cGVdO1xuICAgICAgICBjbGVhbnVwUm9vdExpc3RlbmVyKCk7XG4gICAgICB9O1xuICAgIH0sXG4gICAgcmVtb3ZlQWxsTGlzdGVuZXJzKCkge1xuICAgICAgT2JqZWN0LmtleXMocGVyVHlwZUxpc3RlbmVycykuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICBkZWxldGUgcGVyVHlwZUxpc3RlbmVyc1t0eXBlXTtcbiAgICAgIH0pO1xuICAgICAgY2xlYW51cFJvb3RMaXN0ZW5lcigpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IHtcbiAgX19zcHJlYWRWYWx1ZXMsXG4gIF9fc3ByZWFkUHJvcHMsXG4gIF9fb2JqUmVzdCxcbiAgX19hc3luYyxcbiAgZGVmaW5lR2VuZXJpY01lc3Nhbmdpbmdcbn07XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoXCJ3ZWJleHRlbnNpb24tcG9seWZpbGxcIiwgW1wibW9kdWxlXCJdLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIGZhY3RvcnkobW9kdWxlKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbW9kID0ge1xuICAgICAgZXhwb3J0czoge31cbiAgICB9O1xuICAgIGZhY3RvcnkobW9kKTtcbiAgICBnbG9iYWwuYnJvd3NlciA9IG1vZC5leHBvcnRzO1xuICB9XG59KSh0eXBlb2YgZ2xvYmFsVGhpcyAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFRoaXMgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0aGlzLCBmdW5jdGlvbiAobW9kdWxlKSB7XG4gIC8qIHdlYmV4dGVuc2lvbi1wb2x5ZmlsbCAtIHYwLjEwLjAgLSBGcmkgQXVnIDEyIDIwMjIgMTk6NDI6NDQgKi9cblxuICAvKiAtKi0gTW9kZTogaW5kZW50LXRhYnMtbW9kZTogbmlsOyBqcy1pbmRlbnQtbGV2ZWw6IDIgLSotICovXG5cbiAgLyogdmltOiBzZXQgc3RzPTIgc3c9MiBldCB0dz04MDogKi9cblxuICAvKiBUaGlzIFNvdXJjZSBDb2RlIEZvcm0gaXMgc3ViamVjdCB0byB0aGUgdGVybXMgb2YgdGhlIE1vemlsbGEgUHVibGljXG4gICAqIExpY2Vuc2UsIHYuIDIuMC4gSWYgYSBjb3B5IG9mIHRoZSBNUEwgd2FzIG5vdCBkaXN0cmlidXRlZCB3aXRoIHRoaXNcbiAgICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy4gKi9cbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgaWYgKCFnbG9iYWxUaGlzLmNocm9tZT8ucnVudGltZT8uaWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHNjcmlwdCBzaG91bGQgb25seSBiZSBsb2FkZWQgaW4gYSBicm93c2VyIGV4dGVuc2lvbi5cIik7XG4gIH1cblxuICBpZiAodHlwZW9mIGdsb2JhbFRoaXMuYnJvd3NlciA9PT0gXCJ1bmRlZmluZWRcIiB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZ2xvYmFsVGhpcy5icm93c2VyKSAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIGNvbnN0IENIUk9NRV9TRU5EX01FU1NBR0VfQ0FMTEJBQ0tfTk9fUkVTUE9OU0VfTUVTU0FHRSA9IFwiVGhlIG1lc3NhZ2UgcG9ydCBjbG9zZWQgYmVmb3JlIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkLlwiOyAvLyBXcmFwcGluZyB0aGUgYnVsayBvZiB0aGlzIHBvbHlmaWxsIGluIGEgb25lLXRpbWUtdXNlIGZ1bmN0aW9uIGlzIGEgbWlub3JcbiAgICAvLyBvcHRpbWl6YXRpb24gZm9yIEZpcmVmb3guIFNpbmNlIFNwaWRlcm1vbmtleSBkb2VzIG5vdCBmdWxseSBwYXJzZSB0aGVcbiAgICAvLyBjb250ZW50cyBvZiBhIGZ1bmN0aW9uIHVudGlsIHRoZSBmaXJzdCB0aW1lIGl0J3MgY2FsbGVkLCBhbmQgc2luY2UgaXQgd2lsbFxuICAgIC8vIG5ldmVyIGFjdHVhbGx5IG5lZWQgdG8gYmUgY2FsbGVkLCB0aGlzIGFsbG93cyB0aGUgcG9seWZpbGwgdG8gYmUgaW5jbHVkZWRcbiAgICAvLyBpbiBGaXJlZm94IG5lYXJseSBmb3IgZnJlZS5cblxuICAgIGNvbnN0IHdyYXBBUElzID0gZXh0ZW5zaW9uQVBJcyA9PiB7XG4gICAgICAvLyBOT1RFOiBhcGlNZXRhZGF0YSBpcyBhc3NvY2lhdGVkIHRvIHRoZSBjb250ZW50IG9mIHRoZSBhcGktbWV0YWRhdGEuanNvbiBmaWxlXG4gICAgICAvLyBhdCBidWlsZCB0aW1lIGJ5IHJlcGxhY2luZyB0aGUgZm9sbG93aW5nIFwiaW5jbHVkZVwiIHdpdGggdGhlIGNvbnRlbnQgb2YgdGhlXG4gICAgICAvLyBKU09OIGZpbGUuXG4gICAgICBjb25zdCBhcGlNZXRhZGF0YSA9IHtcbiAgICAgICAgXCJhbGFybXNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjbGVhckFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImJvb2ttYXJrc1wiOiB7XG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDaGlsZHJlblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFJlY2VudFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFN1YlRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRUcmVlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwibW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVRyZWVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZWFyY2hcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJicm93c2VyQWN0aW9uXCI6IHtcbiAgICAgICAgICBcImRpc2FibGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJlbmFibGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEJhZGdlVGV4dFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJvcGVuUG9wdXBcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEJhZGdlVGV4dFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldEljb25cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRQb3B1cFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFRpdGxlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYnJvd3NpbmdEYXRhXCI6IHtcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUNhY2hlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlQ29va2llc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZURvd25sb2Fkc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUZvcm1EYXRhXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlSGlzdG9yeVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZUxvY2FsU3RvcmFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVBhc3N3b3Jkc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVBsdWdpbkRhdGFcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXR0aW5nc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvbW1hbmRzXCI6IHtcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImNvbnRleHRNZW51c1wiOiB7XG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJjb29raWVzXCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbENvb2tpZVN0b3Jlc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImRldnRvb2xzXCI6IHtcbiAgICAgICAgICBcImluc3BlY3RlZFdpbmRvd1wiOiB7XG4gICAgICAgICAgICBcImV2YWxcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDIsXG4gICAgICAgICAgICAgIFwic2luZ2xlQ2FsbGJhY2tBcmdcIjogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicGFuZWxzXCI6IHtcbiAgICAgICAgICAgIFwiY3JlYXRlXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDMsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzLFxuICAgICAgICAgICAgICBcInNpbmdsZUNhbGxiYWNrQXJnXCI6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImVsZW1lbnRzXCI6IHtcbiAgICAgICAgICAgICAgXCJjcmVhdGVTaWRlYmFyUGFuZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJkb3dubG9hZHNcIjoge1xuICAgICAgICAgIFwiY2FuY2VsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZG93bmxvYWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJlcmFzZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEZpbGVJY29uXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3BlblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInBhdXNlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlRmlsZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlc3VtZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNob3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJleHRlbnNpb25cIjoge1xuICAgICAgICAgIFwiaXNBbGxvd2VkRmlsZVNjaGVtZUFjY2Vzc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImlzQWxsb3dlZEluY29nbml0b0FjY2Vzc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImhpc3RvcnlcIjoge1xuICAgICAgICAgIFwiYWRkVXJsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGVsZXRlQWxsXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZGVsZXRlUmFuZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZWxldGVVcmxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRWaXNpdHNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZWFyY2hcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpMThuXCI6IHtcbiAgICAgICAgICBcImRldGVjdExhbmd1YWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0QWNjZXB0TGFuZ3VhZ2VzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiaWRlbnRpdHlcIjoge1xuICAgICAgICAgIFwibGF1bmNoV2ViQXV0aEZsb3dcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJpZGxlXCI6IHtcbiAgICAgICAgICBcInF1ZXJ5U3RhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtYW5hZ2VtZW50XCI6IHtcbiAgICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFNlbGZcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRFbmFibGVkXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidW5pbnN0YWxsU2VsZlwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm5vdGlmaWNhdGlvbnNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRQZXJtaXNzaW9uTGV2ZWxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWdlQWN0aW9uXCI6IHtcbiAgICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJoaWRlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0SWNvblwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFBvcHVwXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0VGl0bGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzaG93XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGVybWlzc2lvbnNcIjoge1xuICAgICAgICAgIFwiY29udGFpbnNcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZXF1ZXN0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicnVudGltZVwiOiB7XG4gICAgICAgICAgXCJnZXRCYWNrZ3JvdW5kUGFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFBsYXRmb3JtSW5mb1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm9wZW5PcHRpb25zUGFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlcXVlc3RVcGRhdGVDaGVja1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNlbmRNZXNzYWdlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDNcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2VuZE5hdGl2ZU1lc3NhZ2VcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRVbmluc3RhbGxVUkxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXNzaW9uc1wiOiB7XG4gICAgICAgICAgXCJnZXREZXZpY2VzXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0UmVjZW50bHlDbG9zZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZXN0b3JlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3RvcmFnZVwiOiB7XG4gICAgICAgICAgXCJsb2NhbFwiOiB7XG4gICAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBcIm1hbmFnZWRcIjoge1xuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic3luY1wiOiB7XG4gICAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcImdldEJ5dGVzSW5Vc2VcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRhYnNcIjoge1xuICAgICAgICAgIFwiY2FwdHVyZVZpc2libGVUYWJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkZXRlY3RMYW5ndWFnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImRpc2NhcmRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJkdXBsaWNhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJleGVjdXRlU2NyaXB0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Q3VycmVudFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldFpvb21cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRab29tU2V0dGluZ3NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnb0JhY2tcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnb0ZvcndhcmRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJoaWdobGlnaHRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJpbnNlcnRDU1NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicXVlcnlcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZWxvYWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVDU1NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZW5kTWVzc2FnZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFpvb21cIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJzZXRab29tU2V0dGluZ3NcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0b3BTaXRlc1wiOiB7XG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ3ZWJOYXZpZ2F0aW9uXCI6IHtcbiAgICAgICAgICBcImdldEFsbEZyYW1lc1wiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImdldEZyYW1lXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwid2ViUmVxdWVzdFwiOiB7XG4gICAgICAgICAgXCJoYW5kbGVyQmVoYXZpb3JDaGFuZ2VkXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwid2luZG93c1wiOiB7XG4gICAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0TGFzdEZvY3VzZWRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaWYgKE9iamVjdC5rZXlzKGFwaU1ldGFkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYXBpLW1ldGFkYXRhLmpzb24gaGFzIG5vdCBiZWVuIGluY2x1ZGVkIGluIGJyb3dzZXItcG9seWZpbGxcIik7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEEgV2Vha01hcCBzdWJjbGFzcyB3aGljaCBjcmVhdGVzIGFuZCBzdG9yZXMgYSB2YWx1ZSBmb3IgYW55IGtleSB3aGljaCBkb2VzXG4gICAgICAgKiBub3QgZXhpc3Qgd2hlbiBhY2Nlc3NlZCwgYnV0IGJlaGF2ZXMgZXhhY3RseSBhcyBhbiBvcmRpbmFyeSBXZWFrTWFwXG4gICAgICAgKiBvdGhlcndpc2UuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY3JlYXRlSXRlbVxuICAgICAgICogICAgICAgIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgaW4gb3JkZXIgdG8gY3JlYXRlIHRoZSB2YWx1ZSBmb3IgYW55XG4gICAgICAgKiAgICAgICAga2V5IHdoaWNoIGRvZXMgbm90IGV4aXN0LCB0aGUgZmlyc3QgdGltZSBpdCBpcyBhY2Nlc3NlZC4gVGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gcmVjZWl2ZXMsIGFzIGl0cyBvbmx5IGFyZ3VtZW50LCB0aGUga2V5IGJlaW5nIGNyZWF0ZWQuXG4gICAgICAgKi9cblxuXG4gICAgICBjbGFzcyBEZWZhdWx0V2Vha01hcCBleHRlbmRzIFdlYWtNYXAge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVJdGVtLCBpdGVtcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN1cGVyKGl0ZW1zKTtcbiAgICAgICAgICB0aGlzLmNyZWF0ZUl0ZW0gPSBjcmVhdGVJdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2V0KGtleSkge1xuICAgICAgICAgIGlmICghdGhpcy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgdGhpcy5zZXQoa2V5LCB0aGlzLmNyZWF0ZUl0ZW0oa2V5KSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHN1cGVyLmdldChrZXkpO1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gb2JqZWN0IHdpdGggYSBgdGhlbmAgbWV0aG9kLCBhbmQgY2FuXG4gICAgICAgKiB0aGVyZWZvcmUgYmUgYXNzdW1lZCB0byBiZWhhdmUgYXMgYSBQcm9taXNlLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHRlc3QuXG4gICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdGhlbmFibGUuXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCBpc1RoZW5hYmxlID0gdmFsdWUgPT4ge1xuICAgICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSBcImZ1bmN0aW9uXCI7XG4gICAgICB9O1xuICAgICAgLyoqXG4gICAgICAgKiBDcmVhdGVzIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gd2hpY2gsIHdoZW4gY2FsbGVkLCB3aWxsIHJlc29sdmUgb3IgcmVqZWN0XG4gICAgICAgKiB0aGUgZ2l2ZW4gcHJvbWlzZSBiYXNlZCBvbiBob3cgaXQgaXMgY2FsbGVkOlxuICAgICAgICpcbiAgICAgICAqIC0gSWYsIHdoZW4gY2FsbGVkLCBgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yYCBjb250YWlucyBhIG5vbi1udWxsIG9iamVjdCxcbiAgICAgICAqICAgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCB0aGF0IHZhbHVlLlxuICAgICAgICogLSBJZiB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggZXhhY3RseSBvbmUgYXJndW1lbnQsIHRoZSBwcm9taXNlIGlzXG4gICAgICAgKiAgIHJlc29sdmVkIHRvIHRoYXQgdmFsdWUuXG4gICAgICAgKiAtIE90aGVyd2lzZSwgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgdG8gYW4gYXJyYXkgY29udGFpbmluZyBhbGwgb2YgdGhlXG4gICAgICAgKiAgIGZ1bmN0aW9uJ3MgYXJndW1lbnRzLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwcm9taXNlXG4gICAgICAgKiAgICAgICAgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJlc29sdXRpb24gYW5kIHJlamVjdGlvbiBmdW5jdGlvbnMgb2YgYVxuICAgICAgICogICAgICAgIHByb21pc2UuXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlc29sdmVcbiAgICAgICAqICAgICAgICBUaGUgcHJvbWlzZSdzIHJlc29sdXRpb24gZnVuY3Rpb24uXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlamVjdFxuICAgICAgICogICAgICAgIFRoZSBwcm9taXNlJ3MgcmVqZWN0aW9uIGZ1bmN0aW9uLlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGFkYXRhXG4gICAgICAgKiAgICAgICAgTWV0YWRhdGEgYWJvdXQgdGhlIHdyYXBwZWQgbWV0aG9kIHdoaWNoIGhhcyBjcmVhdGVkIHRoZSBjYWxsYmFjay5cbiAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbWV0YWRhdGEuc2luZ2xlQ2FsbGJhY2tBcmdcbiAgICAgICAqICAgICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIG9ubHkgdGhlIGZpcnN0XG4gICAgICAgKiAgICAgICAgYXJndW1lbnQgb2YgdGhlIGNhbGxiYWNrLCBhbHRlcm5hdGl2ZWx5IGFuIGFycmF5IG9mIGFsbCB0aGVcbiAgICAgICAqICAgICAgICBjYWxsYmFjayBhcmd1bWVudHMgaXMgcmVzb2x2ZWQuIEJ5IGRlZmF1bHQsIGlmIHRoZSBjYWxsYmFja1xuICAgICAgICogICAgICAgIGZ1bmN0aW9uIGlzIGludm9rZWQgd2l0aCBvbmx5IGEgc2luZ2xlIGFyZ3VtZW50LCB0aGF0IHdpbGwgYmVcbiAgICAgICAqICAgICAgICByZXNvbHZlZCB0byB0aGUgcHJvbWlzZSwgd2hpbGUgYWxsIGFyZ3VtZW50cyB3aWxsIGJlIHJlc29sdmVkIGFzXG4gICAgICAgKiAgICAgICAgYW4gYXJyYXkgaWYgbXVsdGlwbGUgYXJlIGdpdmVuLlxuICAgICAgICpcbiAgICAgICAqIEByZXR1cm5zIHtmdW5jdGlvbn1cbiAgICAgICAqICAgICAgICBUaGUgZ2VuZXJhdGVkIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAgICovXG5cblxuICAgICAgY29uc3QgbWFrZUNhbGxiYWNrID0gKHByb21pc2UsIG1ldGFkYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiAoLi4uY2FsbGJhY2tBcmdzKSA9PiB7XG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVqZWN0KG5ldyBFcnJvcihleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnIHx8IGNhbGxiYWNrQXJncy5sZW5ndGggPD0gMSAmJiBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZShjYWxsYmFja0FyZ3NbMF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY2FsbGJhY2tBcmdzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwbHVyYWxpemVBcmd1bWVudHMgPSBudW1BcmdzID0+IG51bUFyZ3MgPT0gMSA/IFwiYXJndW1lbnRcIiA6IFwiYXJndW1lbnRzXCI7XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSB3cmFwcGVyIGZ1bmN0aW9uIGZvciBhIG1ldGhvZCB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBtZXRhZGF0YS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICogICAgICAgIFRoZSBuYW1lIG9mIHRoZSBtZXRob2Qgd2hpY2ggaXMgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhZGF0YVxuICAgICAgICogICAgICAgIE1ldGFkYXRhIGFib3V0IHRoZSBtZXRob2QgYmVpbmcgd3JhcHBlZC5cbiAgICAgICAqIEBwYXJhbSB7aW50ZWdlcn0gbWV0YWRhdGEubWluQXJnc1xuICAgICAgICogICAgICAgIFRoZSBtaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudHMgd2hpY2ggbXVzdCBiZSBwYXNzZWQgdG8gdGhlXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24uIElmIGNhbGxlZCB3aXRoIGZld2VyIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtpbnRlZ2VyfSBtZXRhZGF0YS5tYXhBcmdzXG4gICAgICAgKiAgICAgICAgVGhlIG1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtYXkgYmUgcGFzc2VkIHRvIHRoZVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uLiBJZiBjYWxsZWQgd2l0aCBtb3JlIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgICAqICAgICAgICB3cmFwcGVyIHdpbGwgcmFpc2UgYW4gZXhjZXB0aW9uLlxuICAgICAgICogQHBhcmFtIHtib29sZWFufSBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZ1xuICAgICAgICogICAgICAgIFdoZXRoZXIgb3Igbm90IHRoZSBwcm9taXNlIGlzIHJlc29sdmVkIHdpdGggb25seSB0aGUgZmlyc3RcbiAgICAgICAqICAgICAgICBhcmd1bWVudCBvZiB0aGUgY2FsbGJhY2ssIGFsdGVybmF0aXZlbHkgYW4gYXJyYXkgb2YgYWxsIHRoZVxuICAgICAgICogICAgICAgIGNhbGxiYWNrIGFyZ3VtZW50cyBpcyByZXNvbHZlZC4gQnkgZGVmYXVsdCwgaWYgdGhlIGNhbGxiYWNrXG4gICAgICAgKiAgICAgICAgZnVuY3Rpb24gaXMgaW52b2tlZCB3aXRoIG9ubHkgYSBzaW5nbGUgYXJndW1lbnQsIHRoYXQgd2lsbCBiZVxuICAgICAgICogICAgICAgIHJlc29sdmVkIHRvIHRoZSBwcm9taXNlLCB3aGlsZSBhbGwgYXJndW1lbnRzIHdpbGwgYmUgcmVzb2x2ZWQgYXNcbiAgICAgICAqICAgICAgICBhbiBhcnJheSBpZiBtdWx0aXBsZSBhcmUgZ2l2ZW4uXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge2Z1bmN0aW9uKG9iamVjdCwgLi4uKil9XG4gICAgICAgKiAgICAgICBUaGUgZ2VuZXJhdGVkIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCB3cmFwQXN5bmNGdW5jdGlvbiA9IChuYW1lLCBtZXRhZGF0YSkgPT4ge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYXN5bmNGdW5jdGlvbldyYXBwZXIodGFyZ2V0LCAuLi5hcmdzKSB7XG4gICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgbWV0YWRhdGEubWluQXJncykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtZXRhZGF0YS5tYXhBcmdzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmIChtZXRhZGF0YS5mYWxsYmFja1RvTm9DYWxsYmFjaykge1xuICAgICAgICAgICAgICAvLyBUaGlzIEFQSSBtZXRob2QgaGFzIGN1cnJlbnRseSBubyBjYWxsYmFjayBvbiBDaHJvbWUsIGJ1dCBpdCByZXR1cm4gYSBwcm9taXNlIG9uIEZpcmVmb3gsXG4gICAgICAgICAgICAgIC8vIGFuZCBzbyB0aGUgcG9seWZpbGwgd2lsbCB0cnkgdG8gY2FsbCBpdCB3aXRoIGEgY2FsbGJhY2sgZmlyc3QsIGFuZCBpdCB3aWxsIGZhbGxiYWNrXG4gICAgICAgICAgICAgIC8vIHRvIG5vdCBwYXNzaW5nIHRoZSBjYWxsYmFjayBpZiB0aGUgZmlyc3QgY2FsbCBmYWlscy5cbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgICByZWplY3RcbiAgICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChjYkVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGAke25hbWV9IEFQSSBtZXRob2QgZG9lc24ndCBzZWVtIHRvIHN1cHBvcnQgdGhlIGNhbGxiYWNrIHBhcmFtZXRlciwgYCArIFwiZmFsbGluZyBiYWNrIHRvIGNhbGwgaXQgd2l0aG91dCBhIGNhbGxiYWNrOiBcIiwgY2JFcnJvcik7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpOyAvLyBVcGRhdGUgdGhlIEFQSSBtZXRob2QgbWV0YWRhdGEsIHNvIHRoYXQgdGhlIG5leHQgQVBJIGNhbGxzIHdpbGwgbm90IHRyeSB0b1xuICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgdW5zdXBwb3J0ZWQgY2FsbGJhY2sgYW55bW9yZS5cblxuICAgICAgICAgICAgICAgIG1ldGFkYXRhLmZhbGxiYWNrVG9Ob0NhbGxiYWNrID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgbWV0YWRhdGEubm9DYWxsYmFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGFkYXRhLm5vQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgICB9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICAgIC8qKlxuICAgICAgICogV3JhcHMgYW4gZXhpc3RpbmcgbWV0aG9kIG9mIHRoZSB0YXJnZXQgb2JqZWN0LCBzbyB0aGF0IGNhbGxzIHRvIGl0IGFyZVxuICAgICAgICogaW50ZXJjZXB0ZWQgYnkgdGhlIGdpdmVuIHdyYXBwZXIgZnVuY3Rpb24uIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHJlY2VpdmVzLFxuICAgICAgICogYXMgaXRzIGZpcnN0IGFyZ3VtZW50LCB0aGUgb3JpZ2luYWwgYHRhcmdldGAgb2JqZWN0LCBmb2xsb3dlZCBieSBlYWNoIG9mXG4gICAgICAgKiB0aGUgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgb3JpZ2luYWwgbWV0aG9kLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXRcbiAgICAgICAqICAgICAgICBUaGUgb3JpZ2luYWwgdGFyZ2V0IG9iamVjdCB0aGF0IHRoZSB3cmFwcGVkIG1ldGhvZCBiZWxvbmdzIHRvLlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbn0gbWV0aG9kXG4gICAgICAgKiAgICAgICAgVGhlIG1ldGhvZCBiZWluZyB3cmFwcGVkLiBUaGlzIGlzIHVzZWQgYXMgdGhlIHRhcmdldCBvZiB0aGUgUHJveHlcbiAgICAgICAqICAgICAgICBvYmplY3Qgd2hpY2ggaXMgY3JlYXRlZCB0byB3cmFwIHRoZSBtZXRob2QuXG4gICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgVGhlIHdyYXBwZXIgZnVuY3Rpb24gd2hpY2ggaXMgY2FsbGVkIGluIHBsYWNlIG9mIGEgZGlyZWN0IGludm9jYXRpb25cbiAgICAgICAqICAgICAgICBvZiB0aGUgd3JhcHBlZCBtZXRob2QuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge1Byb3h5PGZ1bmN0aW9uPn1cbiAgICAgICAqICAgICAgICBBIFByb3h5IG9iamVjdCBmb3IgdGhlIGdpdmVuIG1ldGhvZCwgd2hpY2ggaW52b2tlcyB0aGUgZ2l2ZW4gd3JhcHBlclxuICAgICAgICogICAgICAgIG1ldGhvZCBpbiBpdHMgcGxhY2UuXG4gICAgICAgKi9cblxuXG4gICAgICBjb25zdCB3cmFwTWV0aG9kID0gKHRhcmdldCwgbWV0aG9kLCB3cmFwcGVyKSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkobWV0aG9kLCB7XG4gICAgICAgICAgYXBwbHkodGFyZ2V0TWV0aG9kLCB0aGlzT2JqLCBhcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gd3JhcHBlci5jYWxsKHRoaXNPYmosIHRhcmdldCwgLi4uYXJncyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgbGV0IGhhc093blByb3BlcnR5ID0gRnVuY3Rpb24uY2FsbC5iaW5kKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xuICAgICAgLyoqXG4gICAgICAgKiBXcmFwcyBhbiBvYmplY3QgaW4gYSBQcm94eSB3aGljaCBpbnRlcmNlcHRzIGFuZCB3cmFwcyBjZXJ0YWluIG1ldGhvZHNcbiAgICAgICAqIGJhc2VkIG9uIHRoZSBnaXZlbiBgd3JhcHBlcnNgIGFuZCBgbWV0YWRhdGFgIG9iamVjdHMuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IHRhcmdldFxuICAgICAgICogICAgICAgIFRoZSB0YXJnZXQgb2JqZWN0IHRvIHdyYXAuXG4gICAgICAgKlxuICAgICAgICogQHBhcmFtIHtvYmplY3R9IFt3cmFwcGVycyA9IHt9XVxuICAgICAgICogICAgICAgIEFuIG9iamVjdCB0cmVlIGNvbnRhaW5pbmcgd3JhcHBlciBmdW5jdGlvbnMgZm9yIHNwZWNpYWwgY2FzZXMuIEFueVxuICAgICAgICogICAgICAgIGZ1bmN0aW9uIHByZXNlbnQgaW4gdGhpcyBvYmplY3QgdHJlZSBpcyBjYWxsZWQgaW4gcGxhY2Ugb2YgdGhlXG4gICAgICAgKiAgICAgICAgbWV0aG9kIGluIHRoZSBzYW1lIGxvY2F0aW9uIGluIHRoZSBgdGFyZ2V0YCBvYmplY3QgdHJlZS4gVGhlc2VcbiAgICAgICAqICAgICAgICB3cmFwcGVyIG1ldGhvZHMgYXJlIGludm9rZWQgYXMgZGVzY3JpYmVkIGluIHtAc2VlIHdyYXBNZXRob2R9LlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbbWV0YWRhdGEgPSB7fV1cbiAgICAgICAqICAgICAgICBBbiBvYmplY3QgdHJlZSBjb250YWluaW5nIG1ldGFkYXRhIHVzZWQgdG8gYXV0b21hdGljYWxseSBnZW5lcmF0ZVxuICAgICAgICogICAgICAgIFByb21pc2UtYmFzZWQgd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFzeW5jaHJvbm91cy4gQW55IGZ1bmN0aW9uIGluXG4gICAgICAgKiAgICAgICAgdGhlIGB0YXJnZXRgIG9iamVjdCB0cmVlIHdoaWNoIGhhcyBhIGNvcnJlc3BvbmRpbmcgbWV0YWRhdGEgb2JqZWN0XG4gICAgICAgKiAgICAgICAgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGBtZXRhZGF0YWAgdHJlZSBpcyByZXBsYWNlZCB3aXRoIGFuXG4gICAgICAgKiAgICAgICAgYXV0b21hdGljYWxseS1nZW5lcmF0ZWQgd3JhcHBlciBmdW5jdGlvbiwgYXMgZGVzY3JpYmVkIGluXG4gICAgICAgKiAgICAgICAge0BzZWUgd3JhcEFzeW5jRnVuY3Rpb259XG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge1Byb3h5PG9iamVjdD59XG4gICAgICAgKi9cblxuICAgICAgY29uc3Qgd3JhcE9iamVjdCA9ICh0YXJnZXQsIHdyYXBwZXJzID0ge30sIG1ldGFkYXRhID0ge30pID0+IHtcbiAgICAgICAgbGV0IGNhY2hlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgbGV0IGhhbmRsZXJzID0ge1xuICAgICAgICAgIGhhcyhwcm94eVRhcmdldCwgcHJvcCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb3AgaW4gdGFyZ2V0IHx8IHByb3AgaW4gY2FjaGU7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGdldChwcm94eVRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjYWNoZVtwcm9wXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEocHJvcCBpbiB0YXJnZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IHRhcmdldFtwcm9wXTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBtZXRob2Qgb24gdGhlIHVuZGVybHlpbmcgb2JqZWN0LiBDaGVjayBpZiB3ZSBuZWVkIHRvIGRvXG4gICAgICAgICAgICAgIC8vIGFueSB3cmFwcGluZy5cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB3cmFwcGVyc1twcm9wXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpYWwtY2FzZSB3cmFwcGVyIGZvciB0aGlzIG1ldGhvZC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBNZXRob2QodGFyZ2V0LCB0YXJnZXRbcHJvcF0sIHdyYXBwZXJzW3Byb3BdKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNPd25Qcm9wZXJ0eShtZXRhZGF0YSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGFzeW5jIG1ldGhvZCB0aGF0IHdlIGhhdmUgbWV0YWRhdGEgZm9yLiBDcmVhdGUgYVxuICAgICAgICAgICAgICAgIC8vIFByb21pc2Ugd3JhcHBlciBmb3IgaXQuXG4gICAgICAgICAgICAgICAgbGV0IHdyYXBwZXIgPSB3cmFwQXN5bmNGdW5jdGlvbihwcm9wLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwTWV0aG9kKHRhcmdldCwgdGFyZ2V0W3Byb3BdLCB3cmFwcGVyKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgbWV0aG9kIHRoYXQgd2UgZG9uJ3Qga25vdyBvciBjYXJlIGFib3V0LiBSZXR1cm4gdGhlXG4gICAgICAgICAgICAgICAgLy8gb3JpZ2luYWwgbWV0aG9kLCBib3VuZCB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5iaW5kKHRhcmdldCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmIChoYXNPd25Qcm9wZXJ0eSh3cmFwcGVycywgcHJvcCkgfHwgaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIHByb3ApKSkge1xuICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIG9iamVjdCB0aGF0IHdlIG5lZWQgdG8gZG8gc29tZSB3cmFwcGluZyBmb3IgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICAgIC8vIG9mLiBDcmVhdGUgYSBzdWItb2JqZWN0IHdyYXBwZXIgZm9yIGl0IHdpdGggdGhlIGFwcHJvcHJpYXRlIGNoaWxkXG4gICAgICAgICAgICAgIC8vIG1ldGFkYXRhLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHdyYXBPYmplY3QodmFsdWUsIHdyYXBwZXJzW3Byb3BdLCBtZXRhZGF0YVtwcm9wXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc093blByb3BlcnR5KG1ldGFkYXRhLCBcIipcIikpIHtcbiAgICAgICAgICAgICAgLy8gV3JhcCBhbGwgcHJvcGVydGllcyBpbiAqIG5hbWVzcGFjZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwT2JqZWN0KHZhbHVlLCB3cmFwcGVyc1twcm9wXSwgbWV0YWRhdGFbXCIqXCJdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55IHdyYXBwaW5nIGZvciB0aGlzIHByb3BlcnR5LFxuICAgICAgICAgICAgICAvLyBzbyBqdXN0IGZvcndhcmQgYWxsIGFjY2VzcyB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwge1xuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuXG4gICAgICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXTtcbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgc2V0KHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FjaGVbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9LFxuXG4gICAgICAgICAgc2V0KHByb3h5VGFyZ2V0LCBwcm9wLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICAgIGNhY2hlW3Byb3BdID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGRlZmluZVByb3BlcnR5KHByb3h5VGFyZ2V0LCBwcm9wLCBkZXNjKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwgZGVzYyk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIGRlbGV0ZVByb3BlcnR5KHByb3h5VGFyZ2V0LCBwcm9wKSB7XG4gICAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eShjYWNoZSwgcHJvcCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH07IC8vIFBlciBjb250cmFjdCBvZiB0aGUgUHJveHkgQVBJLCB0aGUgXCJnZXRcIiBwcm94eSBoYW5kbGVyIG11c3QgcmV0dXJuIHRoZVxuICAgICAgICAvLyBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgdGFyZ2V0IGlmIHRoYXQgdmFsdWUgaXMgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZFxuICAgICAgICAvLyBub24tY29uZmlndXJhYmxlLiBGb3IgdGhpcyByZWFzb24sIHdlIGNyZWF0ZSBhbiBvYmplY3Qgd2l0aCB0aGVcbiAgICAgICAgLy8gcHJvdG90eXBlIHNldCB0byBgdGFyZ2V0YCBpbnN0ZWFkIG9mIHVzaW5nIGB0YXJnZXRgIGRpcmVjdGx5LlxuICAgICAgICAvLyBPdGhlcndpc2Ugd2UgY2Fubm90IHJldHVybiBhIGN1c3RvbSBvYmplY3QgZm9yIEFQSXMgdGhhdFxuICAgICAgICAvLyBhcmUgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZCBub24tY29uZmlndXJhYmxlLCBzdWNoIGFzIGBjaHJvbWUuZGV2dG9vbHNgLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgcHJveHkgaGFuZGxlcnMgdGhlbXNlbHZlcyB3aWxsIHN0aWxsIHVzZSB0aGUgb3JpZ2luYWwgYHRhcmdldGBcbiAgICAgICAgLy8gaW5zdGVhZCBvZiB0aGUgYHByb3h5VGFyZ2V0YCwgc28gdGhhdCB0aGUgbWV0aG9kcyBhbmQgcHJvcGVydGllcyBhcmVcbiAgICAgICAgLy8gZGVyZWZlcmVuY2VkIHZpYSB0aGUgb3JpZ2luYWwgdGFyZ2V0cy5cblxuICAgICAgICBsZXQgcHJveHlUYXJnZXQgPSBPYmplY3QuY3JlYXRlKHRhcmdldCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHkocHJveHlUYXJnZXQsIGhhbmRsZXJzKTtcbiAgICAgIH07XG4gICAgICAvKipcbiAgICAgICAqIENyZWF0ZXMgYSBzZXQgb2Ygd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFuIGV2ZW50IG9iamVjdCwgd2hpY2ggaGFuZGxlc1xuICAgICAgICogd3JhcHBpbmcgb2YgbGlzdGVuZXIgZnVuY3Rpb25zIHRoYXQgdGhvc2UgbWVzc2FnZXMgYXJlIHBhc3NlZC5cbiAgICAgICAqXG4gICAgICAgKiBBIHNpbmdsZSB3cmFwcGVyIGlzIGNyZWF0ZWQgZm9yIGVhY2ggbGlzdGVuZXIgZnVuY3Rpb24sIGFuZCBzdG9yZWQgaW4gYVxuICAgICAgICogbWFwLiBTdWJzZXF1ZW50IGNhbGxzIHRvIGBhZGRMaXN0ZW5lcmAsIGBoYXNMaXN0ZW5lcmAsIG9yIGByZW1vdmVMaXN0ZW5lcmBcbiAgICAgICAqIHJldHJpZXZlIHRoZSBvcmlnaW5hbCB3cmFwcGVyLCBzbyB0aGF0ICBhdHRlbXB0cyB0byByZW1vdmUgYVxuICAgICAgICogcHJldmlvdXNseS1hZGRlZCBsaXN0ZW5lciB3b3JrIGFzIGV4cGVjdGVkLlxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7RGVmYXVsdFdlYWtNYXA8ZnVuY3Rpb24sIGZ1bmN0aW9uPn0gd3JhcHBlck1hcFxuICAgICAgICogICAgICAgIEEgRGVmYXVsdFdlYWtNYXAgb2JqZWN0IHdoaWNoIHdpbGwgY3JlYXRlIHRoZSBhcHByb3ByaWF0ZSB3cmFwcGVyXG4gICAgICAgKiAgICAgICAgZm9yIGEgZ2l2ZW4gbGlzdGVuZXIgZnVuY3Rpb24gd2hlbiBvbmUgZG9lcyBub3QgZXhpc3QsIGFuZCByZXRyaWV2ZVxuICAgICAgICogICAgICAgIGFuIGV4aXN0aW5nIG9uZSB3aGVuIGl0IGRvZXMuXG4gICAgICAgKlxuICAgICAgICogQHJldHVybnMge29iamVjdH1cbiAgICAgICAqL1xuXG5cbiAgICAgIGNvbnN0IHdyYXBFdmVudCA9IHdyYXBwZXJNYXAgPT4gKHtcbiAgICAgICAgYWRkTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lciwgLi4uYXJncykge1xuICAgICAgICAgIHRhcmdldC5hZGRMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lciksIC4uLmFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhc0xpc3RlbmVyKHRhcmdldCwgbGlzdGVuZXIpIHtcbiAgICAgICAgICByZXR1cm4gdGFyZ2V0Lmhhc0xpc3RlbmVyKHdyYXBwZXJNYXAuZ2V0KGxpc3RlbmVyKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICAgIHRhcmdldC5yZW1vdmVMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lcikpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBvblJlcXVlc3RGaW5pc2hlZFdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhbiBvblJlcXVlc3RGaW5pc2hlZCBsaXN0ZW5lciBmdW5jdGlvbiBzbyB0aGF0IGl0IHdpbGwgcmV0dXJuIGFcbiAgICAgICAgICogYGdldENvbnRlbnQoKWAgcHJvcGVydHkgd2hpY2ggcmV0dXJucyBhIGBQcm9taXNlYCByYXRoZXIgdGhhbiB1c2luZyBhXG4gICAgICAgICAqIGNhbGxiYWNrIEFQSS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHJlcVxuICAgICAgICAgKiAgICAgICAgVGhlIEhBUiBlbnRyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBuZXR3b3JrIHJlcXVlc3QuXG4gICAgICAgICAqL1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uUmVxdWVzdEZpbmlzaGVkKHJlcSkge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRSZXEgPSB3cmFwT2JqZWN0KHJlcSwge31cbiAgICAgICAgICAvKiB3cmFwcGVycyAqL1xuICAgICAgICAgICwge1xuICAgICAgICAgICAgZ2V0Q29udGVudDoge1xuICAgICAgICAgICAgICBtaW5BcmdzOiAwLFxuICAgICAgICAgICAgICBtYXhBcmdzOiAwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgbGlzdGVuZXIod3JhcHBlZFJlcSk7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IG9uTWVzc2FnZVdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXcmFwcyBhIG1lc3NhZ2UgbGlzdGVuZXIgZnVuY3Rpb24gc28gdGhhdCBpdCBtYXkgc2VuZCByZXNwb25zZXMgYmFzZWQgb25cbiAgICAgICAgICogaXRzIHJldHVybiB2YWx1ZSwgcmF0aGVyIHRoYW4gYnkgcmV0dXJuaW5nIGEgc2VudGluZWwgdmFsdWUgYW5kIGNhbGxpbmcgYVxuICAgICAgICAgKiBjYWxsYmFjay4gSWYgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHJldHVybnMgYSBQcm9taXNlLCB0aGUgcmVzcG9uc2UgaXNcbiAgICAgICAgICogc2VudCB3aGVuIHRoZSBwcm9taXNlIGVpdGhlciByZXNvbHZlcyBvciByZWplY3RzLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0geyp9IG1lc3NhZ2VcbiAgICAgICAgICogICAgICAgIFRoZSBtZXNzYWdlIHNlbnQgYnkgdGhlIG90aGVyIGVuZCBvZiB0aGUgY2hhbm5lbC5cbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHNlbmRlclxuICAgICAgICAgKiAgICAgICAgRGV0YWlscyBhYm91dCB0aGUgc2VuZGVyIG9mIHRoZSBtZXNzYWdlLlxuICAgICAgICAgKiBAcGFyYW0ge2Z1bmN0aW9uKCopfSBzZW5kUmVzcG9uc2VcbiAgICAgICAgICogICAgICAgIEEgY2FsbGJhY2sgd2hpY2gsIHdoZW4gY2FsbGVkIHdpdGggYW4gYXJiaXRyYXJ5IGFyZ3VtZW50LCBzZW5kc1xuICAgICAgICAgKiAgICAgICAgdGhhdCB2YWx1ZSBhcyBhIHJlc3BvbnNlLlxuICAgICAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgICAgICogICAgICAgIFRydWUgaWYgdGhlIHdyYXBwZWQgbGlzdGVuZXIgcmV0dXJuZWQgYSBQcm9taXNlLCB3aGljaCB3aWxsIGxhdGVyXG4gICAgICAgICAqICAgICAgICB5aWVsZCBhIHJlc3BvbnNlLiBGYWxzZSBvdGhlcndpc2UuXG4gICAgICAgICAqL1xuXG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG9uTWVzc2FnZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkge1xuICAgICAgICAgIGxldCBkaWRDYWxsU2VuZFJlc3BvbnNlID0gZmFsc2U7XG4gICAgICAgICAgbGV0IHdyYXBwZWRTZW5kUmVzcG9uc2U7XG4gICAgICAgICAgbGV0IHNlbmRSZXNwb25zZVByb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgIHdyYXBwZWRTZW5kUmVzcG9uc2UgPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgZGlkQ2FsbFNlbmRSZXNwb25zZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsZXQgcmVzdWx0O1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGxpc3RlbmVyKG1lc3NhZ2UsIHNlbmRlciwgd3JhcHBlZFNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGlzUmVzdWx0VGhlbmFibGUgPSByZXN1bHQgIT09IHRydWUgJiYgaXNUaGVuYWJsZShyZXN1bHQpOyAvLyBJZiB0aGUgbGlzdGVuZXIgZGlkbid0IHJldHVybmVkIHRydWUgb3IgYSBQcm9taXNlLCBvciBjYWxsZWRcbiAgICAgICAgICAvLyB3cmFwcGVkU2VuZFJlc3BvbnNlIHN5bmNocm9ub3VzbHksIHdlIGNhbiBleGl0IGVhcmxpZXJcbiAgICAgICAgICAvLyBiZWNhdXNlIHRoZXJlIHdpbGwgYmUgbm8gcmVzcG9uc2Ugc2VudCBmcm9tIHRoaXMgbGlzdGVuZXIuXG5cbiAgICAgICAgICBpZiAocmVzdWx0ICE9PSB0cnVlICYmICFpc1Jlc3VsdFRoZW5hYmxlICYmICFkaWRDYWxsU2VuZFJlc3BvbnNlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSAvLyBBIHNtYWxsIGhlbHBlciB0byBzZW5kIHRoZSBtZXNzYWdlIGlmIHRoZSBwcm9taXNlIHJlc29sdmVzXG4gICAgICAgICAgLy8gYW5kIGFuIGVycm9yIGlmIHRoZSBwcm9taXNlIHJlamVjdHMgKGEgd3JhcHBlZCBzZW5kTWVzc2FnZSBoYXNcbiAgICAgICAgICAvLyB0byB0cmFuc2xhdGUgdGhlIG1lc3NhZ2UgaW50byBhIHJlc29sdmVkIHByb21pc2Ugb3IgYSByZWplY3RlZFxuICAgICAgICAgIC8vIHByb21pc2UpLlxuXG5cbiAgICAgICAgICBjb25zdCBzZW5kUHJvbWlzZWRSZXN1bHQgPSBwcm9taXNlID0+IHtcbiAgICAgICAgICAgIHByb21pc2UudGhlbihtc2cgPT4ge1xuICAgICAgICAgICAgICAvLyBzZW5kIHRoZSBtZXNzYWdlIHZhbHVlLlxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UobXNnKTtcbiAgICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgLy8gU2VuZCBhIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGVycm9yIGlmIHRoZSByZWplY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAvLyBpcyBhbiBpbnN0YW5jZSBvZiBlcnJvciwgb3IgdGhlIG9iamVjdCBpdHNlbGYgb3RoZXJ3aXNlLlxuICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcblxuICAgICAgICAgICAgICBpZiAoZXJyb3IgJiYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgfHwgdHlwZW9mIGVycm9yLm1lc3NhZ2UgPT09IFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZFwiO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICBfX21veldlYkV4dGVuc2lvblBvbHlmaWxsUmVqZWN0X186IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgIC8vIFByaW50IGFuIGVycm9yIG9uIHRoZSBjb25zb2xlIGlmIHVuYWJsZSB0byBzZW5kIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIG9uTWVzc2FnZSByZWplY3RlZCByZXBseVwiLCBlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTsgLy8gSWYgdGhlIGxpc3RlbmVyIHJldHVybmVkIGEgUHJvbWlzZSwgc2VuZCB0aGUgcmVzb2x2ZWQgdmFsdWUgYXMgYVxuICAgICAgICAgIC8vIHJlc3VsdCwgb3RoZXJ3aXNlIHdhaXQgdGhlIHByb21pc2UgcmVsYXRlZCB0byB0aGUgd3JhcHBlZFNlbmRSZXNwb25zZVxuICAgICAgICAgIC8vIGNhbGxiYWNrIHRvIHJlc29sdmUgYW5kIHNlbmQgaXQgYXMgYSByZXNwb25zZS5cblxuXG4gICAgICAgICAgaWYgKGlzUmVzdWx0VGhlbmFibGUpIHtcbiAgICAgICAgICAgIHNlbmRQcm9taXNlZFJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kUHJvbWlzZWRSZXN1bHQoc2VuZFJlc3BvbnNlUHJvbWlzZSk7XG4gICAgICAgICAgfSAvLyBMZXQgQ2hyb21lIGtub3cgdGhhdCB0aGUgbGlzdGVuZXIgaXMgcmVwbHlpbmcuXG5cblxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrID0gKHtcbiAgICAgICAgcmVqZWN0LFxuICAgICAgICByZXNvbHZlXG4gICAgICB9LCByZXBseSkgPT4ge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIC8vIERldGVjdCB3aGVuIG5vbmUgb2YgdGhlIGxpc3RlbmVycyByZXBsaWVkIHRvIHRoZSBzZW5kTWVzc2FnZSBjYWxsIGFuZCByZXNvbHZlXG4gICAgICAgICAgLy8gdGhlIHByb21pc2UgdG8gdW5kZWZpbmVkIGFzIGluIEZpcmVmb3guXG4gICAgICAgICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhL3dlYmV4dGVuc2lvbi1wb2x5ZmlsbC9pc3N1ZXMvMTMwXG4gICAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSA9PT0gQ0hST01FX1NFTkRfTUVTU0FHRV9DQUxMQkFDS19OT19SRVNQT05TRV9NRVNTQUdFKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlcGx5ICYmIHJlcGx5Ll9fbW96V2ViRXh0ZW5zaW9uUG9seWZpbGxSZWplY3RfXykge1xuICAgICAgICAgIC8vIENvbnZlcnQgYmFjayB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZXJyb3IgaW50b1xuICAgICAgICAgIC8vIGFuIEVycm9yIGluc3RhbmNlLlxuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IocmVwbHkubWVzc2FnZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVwbHkpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCB3cmFwcGVkU2VuZE1lc3NhZ2UgPSAobmFtZSwgbWV0YWRhdGEsIGFwaU5hbWVzcGFjZU9iaiwgLi4uYXJncykgPT4ge1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPCBtZXRhZGF0YS5taW5BcmdzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1ldGFkYXRhLm1heEFyZ3MpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdyYXBwZWRDYiA9IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrLmJpbmQobnVsbCwge1xuICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFyZ3MucHVzaCh3cmFwcGVkQ2IpO1xuICAgICAgICAgIGFwaU5hbWVzcGFjZU9iai5zZW5kTWVzc2FnZSguLi5hcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBzdGF0aWNXcmFwcGVycyA9IHtcbiAgICAgICAgZGV2dG9vbHM6IHtcbiAgICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgICBvblJlcXVlc3RGaW5pc2hlZDogd3JhcEV2ZW50KG9uUmVxdWVzdEZpbmlzaGVkV3JhcHBlcnMpXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBydW50aW1lOiB7XG4gICAgICAgICAgb25NZXNzYWdlOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICAgIG9uTWVzc2FnZUV4dGVybmFsOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICAgIHNlbmRNZXNzYWdlOiB3cmFwcGVkU2VuZE1lc3NhZ2UuYmluZChudWxsLCBcInNlbmRNZXNzYWdlXCIsIHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgICBtYXhBcmdzOiAzXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgdGFiczoge1xuICAgICAgICAgIHNlbmRNZXNzYWdlOiB3cmFwcGVkU2VuZE1lc3NhZ2UuYmluZChudWxsLCBcInNlbmRNZXNzYWdlXCIsIHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDIsXG4gICAgICAgICAgICBtYXhBcmdzOiAzXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IHNldHRpbmdNZXRhZGF0YSA9IHtcbiAgICAgICAgY2xlYXI6IHtcbiAgICAgICAgICBtaW5BcmdzOiAxLFxuICAgICAgICAgIG1heEFyZ3M6IDFcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0OiB7XG4gICAgICAgICAgbWluQXJnczogMSxcbiAgICAgICAgICBtYXhBcmdzOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHNldDoge1xuICAgICAgICAgIG1pbkFyZ3M6IDEsXG4gICAgICAgICAgbWF4QXJnczogMVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgYXBpTWV0YWRhdGEucHJpdmFjeSA9IHtcbiAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgIFwiKlwiOiBzZXR0aW5nTWV0YWRhdGFcbiAgICAgICAgfSxcbiAgICAgICAgc2VydmljZXM6IHtcbiAgICAgICAgICBcIipcIjogc2V0dGluZ01ldGFkYXRhXG4gICAgICAgIH0sXG4gICAgICAgIHdlYnNpdGVzOiB7XG4gICAgICAgICAgXCIqXCI6IHNldHRpbmdNZXRhZGF0YVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHdyYXBPYmplY3QoZXh0ZW5zaW9uQVBJcywgc3RhdGljV3JhcHBlcnMsIGFwaU1ldGFkYXRhKTtcbiAgICB9OyAvLyBUaGUgYnVpbGQgcHJvY2VzcyBhZGRzIGEgVU1EIHdyYXBwZXIgYXJvdW5kIHRoaXMgZmlsZSwgd2hpY2ggbWFrZXMgdGhlXG4gICAgLy8gYG1vZHVsZWAgdmFyaWFibGUgYXZhaWxhYmxlLlxuXG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHdyYXBBUElzKGNocm9tZSk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWxUaGlzLmJyb3dzZXI7XG4gIH1cbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YnJvd3Nlci1wb2x5ZmlsbC5qcy5tYXBcbiIsImltcG9ydCB7XG4gIF9fc3ByZWFkUHJvcHMsXG4gIF9fc3ByZWFkVmFsdWVzLFxuICBkZWZpbmVHZW5lcmljTWVzc2FuZ2luZ1xufSBmcm9tIFwiLi9jaHVuay1CUUxGU0ZGWi5qc1wiO1xuXG4vLyBzcmMvZXh0ZW5zaW9uLnRzXG5pbXBvcnQgQnJvd3NlciBmcm9tIFwid2ViZXh0ZW5zaW9uLXBvbHlmaWxsXCI7XG5mdW5jdGlvbiBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmcoY29uZmlnKSB7XG4gIHJldHVybiBkZWZpbmVHZW5lcmljTWVzc2FuZ2luZyhfX3NwcmVhZFByb3BzKF9fc3ByZWFkVmFsdWVzKHt9LCBjb25maWcpLCB7XG4gICAgc2VuZE1lc3NhZ2UobWVzc2FnZSwgdGFiSWQpIHtcbiAgICAgIGlmICh0YWJJZCA9PSBudWxsKVxuICAgICAgICByZXR1cm4gQnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgcmV0dXJuIEJyb3dzZXIudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgbWVzc2FnZSk7XG4gICAgfSxcbiAgICBhZGRSb290TGlzdGVuZXIocHJvY2Vzc01lc3NhZ2UpIHtcbiAgICAgIGNvbnN0IGxpc3RlbmVyID0gKG1lc3NhZ2UsIHNlbmRlcikgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NNZXNzYWdlKF9fc3ByZWFkUHJvcHMoX19zcHJlYWRWYWx1ZXMoe30sIG1lc3NhZ2UpLCB7IHNlbmRlciB9KSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gcHJvY2Vzc01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICB9O1xuICAgICAgQnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICByZXR1cm4gKCkgPT4gQnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgfVxuICB9KSk7XG59XG5leHBvcnQge1xuICBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmdcbn07XG4iLCJpbXBvcnQgeyBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmcgfSBmcm9tICdAd2ViZXh0LWNvcmUvbWVzc2FnaW5nJztcclxuXHJcbmludGVyZmFjZSBQcm90b2NvbE1hcCB7XHJcbiAgZ2V0UGFnZUxhbmd1YWdlcygpOiBzdHJpbmdbXTtcclxuICBnZXRQYWdlSW5mbyh1cmw6IHN0cmluZyk6IFBvcHVwSW5mbztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHsgc2VuZE1lc3NhZ2UsIG9uTWVzc2FnZSB9ID1cclxuICBkZWZpbmVFeHRlbnNpb25NZXNzYWdpbmc8UHJvdG9jb2xNYXA+KCk7XHJcbiIsImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVDb250ZW50U2NyaXB0KGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIGRlZmluaXRpb247XG59XG4iLCJpbXBvcnQgeyBkZWZpbmVDb250ZW50U2NyaXB0IH0gZnJvbSAnd3h0L3NhbmRib3gnO1xyXG5cclxudHlwZSBDYW5EZXRlY3QgPSAnbm8nIHwgJ3JlYWRpbHknIHwgJ2FmdGVyLWRvd25sb2FkJztcclxuXHJcbnR5cGUgRGV0ZWN0b3JFdmVudHMgPSAnZG93bmxvYWRwcm9ncmVzcyc7XHJcblxyXG50eXBlIERvd25sb2FkUHJvZ3Jlc3NFdmVudEFyZ3MgPSB7XHJcbiAgbG9hZGVkOiBudW1iZXI7XHJcbiAgdG90YWw6IG51bWJlcjtcclxufTtcclxuXHJcbnR5cGUgRGV0ZWN0b3IgPSB7XHJcbiAgZGV0ZWN0OiAoXHJcbiAgICB0ZXh0OiBzdHJpbmdcclxuICApID0+IFByb21pc2U8eyBjb25maWRlbmNlOiBudW1iZXI7IGRldGVjdGVkTGFuZ3VhZ2U6IHN0cmluZyB9W10+O1xyXG4gIHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xyXG4gIGFkZEV2ZW50TGlzdGVuZXI6IChcclxuICAgIGV2ZW50TmFtZTogRGV0ZWN0b3JFdmVudHMsXHJcbiAgICBjYWxsYmFjazogKGU6IERvd25sb2FkUHJvZ3Jlc3NFdmVudEFyZ3MpID0+IHZvaWRcclxuICApID0+IHZvaWQ7XHJcbn07XHJcblxyXG50eXBlIFRyYW5zbGF0aW9uID0ge1xyXG4gIGNhbkRldGVjdDogKCkgPT4gUHJvbWlzZTxDYW5EZXRlY3Q+O1xyXG4gIGNyZWF0ZURldGVjdG9yOiAoKSA9PiBQcm9taXNlPERldGVjdG9yPjtcclxufTtcclxuXHJcbnR5cGUgU2VsZldpdGhUcmFuc2xhdGlvbiA9IHtcclxuICB0cmFuc2xhdGlvbjogVHJhbnNsYXRpb247XHJcbn07XHJcblxyXG5sZXQgbGFuZ3VhZ2VEZXRlY3RvcjogRGV0ZWN0b3IgfCBudWxsID0gbnVsbDtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbnRlbnRTY3JpcHQoe1xyXG4gIG1hdGNoZXM6IFsnKjovLyovKiddLFxyXG4gIHJ1bkF0OiAnZG9jdW1lbnRfc3RhcnQnLFxyXG4gIG1haW46IGFzeW5jICgpID0+IHtcclxuICAgIHN1YnNjcmliZVRvTWVzc2FnZXMoKTtcclxuICAgIGxhbmd1YWdlRGV0ZWN0b3IgPSBhd2FpdCBzZXR1cERldGVjdG9yKCk7XHJcbiAgfVxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIHN1YnNjcmliZVRvTWVzc2FnZXMoKSB7XHJcbiAgb25NZXNzYWdlKCdnZXRQYWdlTGFuZ3VhZ2VzJywgKCkgPT4ge1xyXG4gICAgcmV0dXJuIGRldGVjdFBhZ2VMYW5ndWFnZXMoKTtcclxuICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gc2V0dXBEZXRlY3RvcigpIHtcclxuICBpZiAoJ3RyYW5zbGF0aW9uJyBpbiBzZWxmKSB7XHJcbiAgICBjb25zdCBzZWxmV2l0aFRyYW5zbGF0aW9uID0gc2VsZiBhcyBTZWxmV2l0aFRyYW5zbGF0aW9uO1xyXG4gICAgaWYgKFxyXG4gICAgICAnY2FuRGV0ZWN0JyBpbiBzZWxmV2l0aFRyYW5zbGF0aW9uLnRyYW5zbGF0aW9uICYmXHJcbiAgICAgICdjcmVhdGVEZXRlY3RvcicgaW4gc2VsZldpdGhUcmFuc2xhdGlvbi50cmFuc2xhdGlvblxyXG4gICAgKSB7XHJcbiAgICAgIGNvbnN0IGNhbkRldGVjdCA9IGF3YWl0IHNlbGZXaXRoVHJhbnNsYXRpb24udHJhbnNsYXRpb24uY2FuRGV0ZWN0KCk7XHJcblxyXG4gICAgICBpZiAoY2FuRGV0ZWN0ID09PSAnbm8nKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGxhbmd1YWdlRGV0ZWN0b3IgPVxyXG4gICAgICAgIGF3YWl0IHNlbGZXaXRoVHJhbnNsYXRpb24udHJhbnNsYXRpb24uY3JlYXRlRGV0ZWN0b3IoKTtcclxuXHJcbiAgICAgIGlmIChjYW5EZXRlY3QgPT09ICdhZnRlci1kb3dubG9hZCcpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnTGFuZ3VhZ2UgZGV0ZWN0b3IgbW9kZWwgZG93bmxvYWRpbmchJyk7XHJcbiAgICAgICAgbGFuZ3VhZ2VEZXRlY3Rvci5hZGRFdmVudExpc3RlbmVyKCdkb3dubG9hZHByb2dyZXNzJywgKGUpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZCBwcm9ncmVzcyAtICR7ZS5sb2FkZWR9LyR7ZS50b3RhbH1gKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCBsYW5ndWFnZURldGVjdG9yLnJlYWR5O1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdMYW5ndWFnZSBkZXRlY3RvciBtb2RlbCBkb3dubG9hZGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGxhbmd1YWdlRGV0ZWN0b3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZGV0ZWN0UGFnZUxhbmd1YWdlcygpIHtcclxuICBpZiAoIWxhbmd1YWdlRGV0ZWN0b3IpIHtcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGFsbFRleHRPblBhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCc6cm9vdCcpPy50ZXh0Q29udGVudCA/PyAnJztcclxuICBjb25zdCBkZXRlY3RlZExhbmd1YWdlcyA9IGF3YWl0IGxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KGFsbFRleHRPblBhZ2UpO1xyXG4gIHJldHVybiBkZXRlY3RlZExhbmd1YWdlcy5zbGljZSgwLCAyKS5tYXAoKGQpID0+IGQuZGV0ZWN0ZWRMYW5ndWFnZSk7XHJcbn1cclxuIiwiZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSAoXG4gIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZCA9PSBudWxsID8gZ2xvYmFsVGhpcy5jaHJvbWUgOiAoXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICAgIGdsb2JhbFRoaXMuYnJvd3NlclxuICApXG4pO1xuIiwiZnVuY3Rpb24gcHJpbnQobWV0aG9kLCAuLi5hcmdzKSB7XG4gIGlmIChpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIpIHJldHVybjtcbiAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICBtZXRob2QoYFt3eHRdICR7bWVzc2FnZX1gLCAuLi5hcmdzKTtcbiAgfSBlbHNlIHtcbiAgICBtZXRob2QoXCJbd3h0XVwiLCAuLi5hcmdzKTtcbiAgfVxufVxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IHtcbiAgZGVidWc6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmRlYnVnLCAuLi5hcmdzKSxcbiAgbG9nOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5sb2csIC4uLmFyZ3MpLFxuICB3YXJuOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS53YXJuLCAuLi5hcmdzKSxcbiAgZXJyb3I6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmVycm9yLCAuLi5hcmdzKVxufTtcbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmV4cG9ydCBjbGFzcyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuICAgIHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuICAgIHRoaXMubmV3VXJsID0gbmV3VXJsO1xuICAgIHRoaXMub2xkVXJsID0gb2xkVXJsO1xuICB9XG4gIHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgY29uc3QgZW50cnlwb2ludE5hbWUgPSB0eXBlb2YgaW1wb3J0Lm1ldGEuZW52ID09PSBcInVuZGVmaW5lZFwiID8gXCJidWlsZFwiIDogaW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlQ7XG4gIHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtlbnRyeXBvaW50TmFtZX06JHtldmVudE5hbWV9YDtcbn1cbiIsImltcG9ydCB7IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcbiAgbGV0IGludGVydmFsO1xuICBsZXQgb2xkVXJsO1xuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0aGUgbG9jYXRpb24gd2F0Y2hlciBpcyBhY3RpdmVseSBsb29raW5nIGZvciBVUkwgY2hhbmdlcy4gSWYgaXQncyBhbHJlYWR5IHdhdGNoaW5nLFxuICAgICAqIHRoaXMgaXMgYSBub29wLlxuICAgICAqL1xuICAgIHJ1bigpIHtcbiAgICAgIGlmIChpbnRlcnZhbCAhPSBudWxsKSByZXR1cm47XG4gICAgICBvbGRVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgaW50ZXJ2YWwgPSBjdHguc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBsZXQgbmV3VXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgICAgaWYgKG5ld1VybC5ocmVmICE9PSBvbGRVcmwuaHJlZikge1xuICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50KG5ld1VybCwgb2xkVXJsKSk7XG4gICAgICAgICAgb2xkVXJsID0gbmV3VXJsO1xuICAgICAgICB9XG4gICAgICB9LCAxZTMpO1xuICAgIH1cbiAgfTtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi8uLi9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanNcIjtcbmltcG9ydCB7IGdldFVuaXF1ZUV2ZW50TmFtZSB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHJlcXVlc3RJZGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICghdGhpcy5zaWduYWwuYWJvcnRlZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSwgb3B0aW9ucyk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbElkbGVDYWxsYmFjayhpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogQ2FsbCBgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXJgIGFuZCByZW1vdmUgdGhlIGV2ZW50IGxpc3RlbmVyIHdoZW4gdGhlIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEluY2x1ZGVzIGFkZGl0aW9uYWwgZXZlbnRzIHVzZWZ1bCBmb3IgY29udGVudCBzY3JpcHRzOlxuICAgKlxuICAgKiAtIGBcInd4dDpsb2NhdGlvbmNoYW5nZVwiYCAtIFRyaWdnZXJlZCB3aGVuIEhUTUw1IGhpc3RvcnkgbW9kZSBpcyB1c2VkIHRvIGNoYW5nZSBVUkwuIENvbnRlbnRcbiAgICogICBzY3JpcHRzIGFyZSBub3QgcmVsb2FkZWQgd2hlbiBuYXZpZ2F0aW5nIHRoaXMgd2F5LCBzbyB0aGlzIGNhbiBiZSB1c2VkIHRvIHJlc2V0IHRoZSBjb250ZW50XG4gICAqICAgc2NyaXB0IHN0YXRlIG9uIFVSTCBjaGFuZ2UsIG9yIHJ1biBjdXN0b20gY29kZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY3R4LmFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsIFwidmlzaWJpbGl0eWNoYW5nZVwiLCAoKSA9PiB7XG4gICAqICAgLy8gLi4uXG4gICAqIH0pO1xuICAgKiBjdHguYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIiwgKCkgPT4ge1xuICAgKiAgIC8vIC4uLlxuICAgKiB9KTtcbiAgICovXG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiBFdmVudCBkb24ndCBtYXRjaCwgYnV0IHRoYXQncyBPSywgRXZlbnRUYXJnZXQgZG9lc24ndCBhbGxvdyBjdXN0b20gdHlwZXMgaW4gdGhlIGNhbGxiYWNrXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWVcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgJiYgZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWUpIHtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbInRoaXMiLCJsYW5ndWFnZURldGVjdG9yIiwicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7OztDQUFBLE1BQU0sSUFBSSxHQUFHO0NBQ2I7Q0FDQSxDQUFDLFNBQVM7Q0FDVixDQUFDLFVBQVU7Q0FDWCxDQUFDLGNBQWM7Q0FDZixDQUFDLFdBQVc7Q0FDWixDQUFDLFNBQVM7Q0FDVixDQUFDLFFBQVE7O0NBRVQ7Q0FDQSxDQUFDLFVBQVUsQ0FBQyxZQUFZOztDQUV4QjtDQUNBO0NBQ0EsQ0FBQyxVQUFVLENBQUMsY0FBYztDQUMxQixDQUFDLFVBQVUsQ0FBQyxXQUFXO0NBQ3ZCO0NBQ0E7Q0FDQSxFQUFFLE1BQU0sQ0FBQyxPQUFPO0NBQ2hCLEVBQUUsR0FBRztDQUNMLEVBQUUsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUM7Q0FDaEQsRUFBRTs7Q0FFRixNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQzs7Q0NyQmhDLE1BQU0sUUFBUSxTQUFTLEtBQUssQ0FBQztD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R0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJO0NBQy9EO0NBQ0EsTUFBTSxPQUFPO0NBQ2IsTUFBTTtDQUNOLFFBQVEsR0FBRyxPQUFPO0NBQ2xCLFFBQVEsTUFBTSxFQUFFLElBQUksQ0FBQztDQUNyQjtDQUNBLEtBQUs7Q0FDTDtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0EsRUFBRSxpQkFBaUIsR0FBRztDQUN0QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUM7Q0FDcEQsSUFBSUMsUUFBTSxDQUFDLEtBQUs7Q0FDaEIsTUFBTSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUI7Q0FDckUsS0FBSztDQUNMO0NBQ0EsRUFBRSxjQUFjLEdBQUc7Q0FDbkIsSUFBSSxNQUFNLENBQUMsV0FBVztDQUN0QixNQUFNO0NBQ04sUUFBUSxJQUFJLEVBQUUsb0JBQW9CLENBQUMsMkJBQTJCO0NBQzlELFFBQVEsaUJBQWlCLEVBQUUsSUFBSSxDQUFDO0NBQ2hDLE9BQU87Q0FDUCxNQUFNO0NBQ04sS0FBSztDQUNMO0NBQ0EsRUFBRSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUU7Q0FDakMsSUFBSSxJQUFJLE9BQU8sR0FBRyxJQUFJO0NBQ3RCLElBQUksTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEtBQUs7Q0FDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUFLLG9CQUFvQixDQUFDLDJCQUEyQixJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFO0NBQzdJLFFBQVEsTUFBTSxRQUFRLEdBQUcsT0FBTztDQUNoQyxRQUFRLE9BQU8sR0FBRyxLQUFLO0NBQ3ZCLFFBQVEsSUFBSSxRQUFRLElBQUksT0FBTyxFQUFFLGdCQUFnQixFQUFFO0NBQ25ELFFBQVEsSUFBSSxDQUFDLGlCQUFpQixFQUFFO0NBQ2hDO0NBQ0EsS0FBSztDQUNMLElBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztDQUNuQyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7Q0FDaEU7Q0FDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw2LDgsOSwxMCwxMSwxMl19
