var content = (function () {
  'use strict';

  function defineContentScript(definition) {
    return definition;
  }

  const definition = defineContentScript({
    matches: ["*://*/*"],
    runAt: "document_start",
    main: async (ctx) => {
      if ("translation" in self) {
        const selfWithTranslation = self;
        if ("canDetect" in selfWithTranslation.translation && "createDetector" in selfWithTranslation.translation) {
          if (ctx) {
            const canDetect = await selfWithTranslation.translation.canDetect();
            detectPageLanguage(selfWithTranslation.translation, canDetect);
          } else {
            console.log("no ctx");
          }
        } else {
          console.log("no canDetect or createDetector");
        }
      } else {
        console.log("no translation");
      }
    }
  });
  async function detectPageLanguage(translation, canDetect) {
    let detector;
    if (canDetect === "no") {
      return;
    }
    if (canDetect === "readily") {
      detector = await translation.createDetector();
    } else {
      detector = await translation.createDetector();
      detector.addEventListener("downloadprogress", (e) => {
        console.log(e.loaded, e.total);
      });
      await detector.ready;
    }
    const allTextOnPage = document.querySelector("html")?.innerText ?? "";
    const detectedLanguages = await detector.detect(allTextOnPage);
    console.log("detectedLanguages", detectedLanguages.slice(0, 2));
    console.log("allTextOnPage", allTextOnPage);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3NhbmRib3gvZGVmaW5lLWNvbnRlbnQtc2NyaXB0Lm1qcyIsIi4uLy4uLy4uL3NyYy9lbnRyeXBvaW50cy9jb250ZW50LnRzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9jbGllbnQvY29udGVudC1zY3JpcHRzL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2NsaWVudC9jb250ZW50LXNjcmlwdHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUNvbnRlbnRTY3JpcHQoZGVmaW5pdGlvbikge1xuICByZXR1cm4gZGVmaW5pdGlvbjtcbn1cbiIsImltcG9ydCB7IGRlZmluZUNvbnRlbnRTY3JpcHQgfSBmcm9tICd3eHQvc2FuZGJveCc7XHJcblxyXG4vLyBpbXBvcnQgdHlwZSB7IENvbnRlbnRTY3JpcHRDb250ZXh0IH0gZnJvbSAnd3h0L2NsaWVudCc7XHJcblxyXG50eXBlIENhbkRldGVjdCA9ICdubycgfCAncmVhZGlseScgfCAnYWZ0ZXItZG93bmxvYWQnO1xyXG5cclxudHlwZSBEZXRlY3RvckV2ZW50cyA9ICdkb3dubG9hZHByb2dyZXNzJztcclxuXHJcbnR5cGUgRG93bmxvYWRQcm9ncmVzc0V2ZW50QXJncyA9IHtcclxuICBsb2FkZWQ6IG51bWJlcjtcclxuICB0b3RhbDogbnVtYmVyO1xyXG59O1xyXG5cclxudHlwZSBEZXRlY3RvciA9IHtcclxuICBkZXRlY3Q6ICh0ZXh0OiBzdHJpbmcpID0+IFByb21pc2U8c3RyaW5nW10+O1xyXG4gIHJlYWR5OiBQcm9taXNlPHZvaWQ+O1xyXG4gIGFkZEV2ZW50TGlzdGVuZXI6IChcclxuICAgIGV2ZW50TmFtZTogRGV0ZWN0b3JFdmVudHMsXHJcbiAgICBjYWxsYmFjazogKGU6IERvd25sb2FkUHJvZ3Jlc3NFdmVudEFyZ3MpID0+IHZvaWRcclxuICApID0+IHZvaWQ7XHJcbn07XHJcblxyXG50eXBlIFRyYW5zbGF0aW9uID0ge1xyXG4gIGNhbkRldGVjdDogKCkgPT4gUHJvbWlzZTxDYW5EZXRlY3Q+O1xyXG4gIGNyZWF0ZURldGVjdG9yOiAoKSA9PiBQcm9taXNlPERldGVjdG9yPjtcclxufTtcclxuXHJcbnR5cGUgU2VsZldpdGhUcmFuc2xhdGlvbiA9IHtcclxuICB0cmFuc2xhdGlvbjogVHJhbnNsYXRpb247XHJcbn07XHJcblxyXG4vLyBleHBvcnQgZGVmYXVsdCBkZWZpbmVDb250ZW50U2NyaXB0KHtcclxuLy8gICBtYXRjaGVzOiBbJzxhbGxfdXJscz4nXSxcclxuLy8gICBtYWluOiBhc3luYyAoY3R4OiBDb250ZW50U2NyaXB0Q29udGV4dCkgPT4ge1xyXG4vLyAgICAgY29uc29sZS5sb2coJ1RFU1QnKTtcclxuLy8gICAgIGlmICgndHJhbnNsYXRpb24nIGluIHNlbGYpIHtcclxuLy8gICAgICAgY29uc3Qgc2VsZldpdGhUcmFuc2xhdGlvbiA9IHNlbGYgYXMgU2VsZldpdGhUcmFuc2xhdGlvbjtcclxuLy8gICAgICAgaWYgKCdjcmVhdGVUcmFuc2xhdG9yJyBpbiBzZWxmV2l0aFRyYW5zbGF0aW9uLnRyYW5zbGF0aW9uKSB7XHJcbi8vICAgICAgICAgaWYgKGN0eCkge1xyXG4vLyAgICAgICAgICAgY29uc3QgY2FuRGV0ZWN0ID0gYXdhaXQgc2VsZldpdGhUcmFuc2xhdGlvbi50cmFuc2xhdGlvbi5jYW5EZXRlY3QoKTtcclxuLy8gICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW5EZXRlY3QnLCBjYW5EZXRlY3QpO1xyXG4vLyAgICAgICAgIH1cclxuLy8gICAgICAgfVxyXG4vLyAgICAgfVxyXG4vLyAgIH1cclxuLy8gfSk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb250ZW50U2NyaXB0KHtcclxuICBtYXRjaGVzOiBbJyo6Ly8qLyonXSxcclxuICBydW5BdDogJ2RvY3VtZW50X3N0YXJ0JyxcclxuICBtYWluOiBhc3luYyAoY3R4KSA9PiB7XHJcbiAgICAvLyBjb25zdCB1aSA9IGNyZWF0ZUludGVncmF0ZWRVaShjdHgsIHtcclxuICAgIC8vICAgcG9zaXRpb246ICdpbmxpbmUnLFxyXG4gICAgLy8gICBhbmNob3I6ICdib2R5JyxcclxuICAgIC8vICAgb25Nb3VudDogKGNvbnRhaW5lcikgPT4ge1xyXG4gICAgLy8gICAgIC8vIEFwcGVuZCBjaGlsZHJlbiB0byB0aGUgY29udGFpbmVyXHJcbiAgICAvLyAgICAgY29uc3QgYXBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xyXG4gICAgLy8gICAgIGFwcC50ZXh0Q29udGVudCA9ICdLQUxPJztcclxuICAgIC8vICAgICBjb250YWluZXIuYXBwZW5kKGFwcCk7XHJcbiAgICAvLyAgIH1cclxuICAgIC8vIH0pO1xyXG5cclxuICAgIC8vIC8vIENhbGwgbW91bnQgdG8gYWRkIHRoZSBVSSB0byB0aGUgRE9NXHJcbiAgICAvLyB1aS5tb3VudCgpO1xyXG5cclxuICAgIGlmICgndHJhbnNsYXRpb24nIGluIHNlbGYpIHtcclxuICAgICAgY29uc3Qgc2VsZldpdGhUcmFuc2xhdGlvbiA9IHNlbGYgYXMgU2VsZldpdGhUcmFuc2xhdGlvbjtcclxuICAgICAgaWYgKFxyXG4gICAgICAgICdjYW5EZXRlY3QnIGluIHNlbGZXaXRoVHJhbnNsYXRpb24udHJhbnNsYXRpb24gJiZcclxuICAgICAgICAnY3JlYXRlRGV0ZWN0b3InIGluIHNlbGZXaXRoVHJhbnNsYXRpb24udHJhbnNsYXRpb25cclxuICAgICAgKSB7XHJcbiAgICAgICAgaWYgKGN0eCkge1xyXG4gICAgICAgICAgY29uc3QgY2FuRGV0ZWN0ID0gYXdhaXQgc2VsZldpdGhUcmFuc2xhdGlvbi50cmFuc2xhdGlvbi5jYW5EZXRlY3QoKTtcclxuICAgICAgICAgIGRldGVjdFBhZ2VMYW5ndWFnZShzZWxmV2l0aFRyYW5zbGF0aW9uLnRyYW5zbGF0aW9uLCBjYW5EZXRlY3QpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnbm8gY3R4Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdubyBjYW5EZXRlY3Qgb3IgY3JlYXRlRGV0ZWN0b3InKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coJ25vIHRyYW5zbGF0aW9uJyk7XHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGRldGVjdFBhZ2VMYW5ndWFnZShcclxuICB0cmFuc2xhdGlvbjogVHJhbnNsYXRpb24sXHJcbiAgY2FuRGV0ZWN0OiBDYW5EZXRlY3RcclxuKSB7XHJcbiAgbGV0IGRldGVjdG9yO1xyXG4gIGlmIChjYW5EZXRlY3QgPT09ICdubycpIHtcclxuICAgIC8vIFRoZSBsYW5ndWFnZSBkZXRlY3RvciBpc24ndCB1c2FibGUuXHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmIChjYW5EZXRlY3QgPT09ICdyZWFkaWx5Jykge1xyXG4gICAgLy8gVGhlIGxhbmd1YWdlIGRldGVjdG9yIGNhbiBpbW1lZGlhdGVseSBiZSB1c2VkLlxyXG4gICAgZGV0ZWN0b3IgPSBhd2FpdCB0cmFuc2xhdGlvbi5jcmVhdGVEZXRlY3RvcigpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBUaGUgbGFuZ3VhZ2UgZGV0ZWN0b3IgY2FuIGJlIHVzZWQgYWZ0ZXIgbW9kZWwgZG93bmxvYWQuXHJcbiAgICBkZXRlY3RvciA9IGF3YWl0IHRyYW5zbGF0aW9uLmNyZWF0ZURldGVjdG9yKCk7XHJcbiAgICBkZXRlY3Rvci5hZGRFdmVudExpc3RlbmVyKCdkb3dubG9hZHByb2dyZXNzJywgKGUpID0+IHtcclxuICAgICAgY29uc29sZS5sb2coZS5sb2FkZWQsIGUudG90YWwpO1xyXG4gICAgfSk7XHJcbiAgICBhd2FpdCBkZXRlY3Rvci5yZWFkeTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGFsbFRleHRPblBhZ2UgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdodG1sJyk/LmlubmVyVGV4dCA/PyAnJztcclxuICBjb25zdCBkZXRlY3RlZExhbmd1YWdlcyA9IGF3YWl0IGRldGVjdG9yLmRldGVjdChhbGxUZXh0T25QYWdlKTtcclxuICBjb25zb2xlLmxvZygnZGV0ZWN0ZWRMYW5ndWFnZXMnLCBkZXRlY3RlZExhbmd1YWdlcy5zbGljZSgwLCAyKSk7XHJcbiAgY29uc29sZS5sb2coJ2FsbFRleHRPblBhZ2UnLCBhbGxUZXh0T25QYWdlKTtcclxufVxyXG4iLCJleHBvcnQgY29uc3QgYnJvd3NlciA9IChcbiAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkID09IG51bGwgPyBnbG9iYWxUaGlzLmNocm9tZSA6IChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgZ2xvYmFsVGhpcy5icm93c2VyXG4gIClcbik7XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICBjb25zdCBlbnRyeXBvaW50TmFtZSA9IHR5cGVvZiBpbXBvcnQubWV0YS5lbnYgPT09IFwidW5kZWZpbmVkXCIgPyBcImJ1aWxkXCIgOiBpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVDtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2VudHJ5cG9pbnROYW1lfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uLy4uL3NhbmRib3gvdXRpbHMvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0SW50ZXJ2YWwoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhckludGVydmFsKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldFRpbWVvdXRgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRUaW1lb3V0KGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhclRpbWVvdXQoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBDYWxsIGB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcmAgYW5kIHJlbW92ZSB0aGUgZXZlbnQgbGlzdGVuZXIgd2hlbiB0aGUgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogSW5jbHVkZXMgYWRkaXRpb25hbCBldmVudHMgdXNlZnVsIGZvciBjb250ZW50IHNjcmlwdHM6XG4gICAqXG4gICAqIC0gYFwid3h0OmxvY2F0aW9uY2hhbmdlXCJgIC0gVHJpZ2dlcmVkIHdoZW4gSFRNTDUgaGlzdG9yeSBtb2RlIGlzIHVzZWQgdG8gY2hhbmdlIFVSTC4gQ29udGVudFxuICAgKiAgIHNjcmlwdHMgYXJlIG5vdCByZWxvYWRlZCB3aGVuIG5hdmlnYXRpbmcgdGhpcyB3YXksIHNvIHRoaXMgY2FuIGJlIHVzZWQgdG8gcmVzZXQgdGhlIGNvbnRlbnRcbiAgICogICBzY3JpcHQgc3RhdGUgb24gVVJMIGNoYW5nZSwgb3IgcnVuIGN1c3RvbSBjb2RlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjdHguYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcbiAgICogICAvLyAuLi5cbiAgICogfSk7XG4gICAqIGN0eC5hZGRFdmVudExpc3RlbmVyKGRvY3VtZW50LCBcInd4dDpsb2NhdGlvbmNoYW5nZVwiLCAoKSA9PiB7XG4gICAqICAgLy8gLi4uXG4gICAqIH0pO1xuICAgKi9cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IEV2ZW50IGRvbid0IG1hdGNoLCBidXQgdGhhdCdzIE9LLCBFdmVudFRhcmdldCBkb2Vzbid0IGFsbG93IGN1c3RvbSB0eXBlcyBpbiB0aGUgY2FsbGJhY2tcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICBsaXN0ZW5Gb3JOZXdlclNjcmlwdHMob3B0aW9ucykge1xuICAgIGxldCBpc0ZpcnN0ID0gdHJ1ZTtcbiAgICBjb25zdCBjYiA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSAmJiBldmVudC5kYXRhPy5jb250ZW50U2NyaXB0TmFtZSA9PT0gdGhpcy5jb250ZW50U2NyaXB0TmFtZSkge1xuICAgICAgICBjb25zdCB3YXNGaXJzdCA9IGlzRmlyc3Q7XG4gICAgICAgIGlzRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgaWYgKHdhc0ZpcnN0ICYmIG9wdGlvbnM/Lmlnbm9yZUZpcnN0RXZlbnQpIHJldHVybjtcbiAgICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiByZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYikpO1xuICB9XG59XG4iXSwibmFtZXMiOlsicHJpbnQiLCJsb2dnZXIiXSwibWFwcGluZ3MiOiI7OztFQUFPLFNBQVMsbUJBQW1CLENBQUMsVUFBVSxFQUFFO0VBQ2hELEVBQUUsT0FBTyxVQUFVO0VBQ25COztBQzZDQSxxQkFBZSxtQkFBb0IsQ0FBQTtFQUFBLEVBQ2pDLE9BQUEsRUFBUyxDQUFDLFNBQVMsQ0FBQTtFQUFBLEVBQ25CLEtBQU8sRUFB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Q0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO0VBQ25ELElBQUksSUFBSSxJQUFJLEtBQUssb0JBQW9CLEVBQUU7RUFDdkMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUU7RUFDbEQ7RUFDQSxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0I7RUFDM0IsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLElBQUk7RUFDL0Q7RUFDQSxNQUFNLE9BQU87RUFDYixNQUFNO0VBQ04sUUFBUSxHQUFHLE9BQU87RUFDbEIsUUFBUSxNQUFNLEVBQUUsSUFBSSxDQUFDO0VBQ3JCO0VBQ0EsS0FBSztFQUNMO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxFQUFFLGlCQUFpQixHQUFHO0VBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQztFQUNwRCxJQUFJQyxRQUFNLENBQUMsS0FBSztFQUNoQixNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHFCQUFxQjtFQUNyRSxLQUFLO0VBQ0w7RUFDQSxFQUFFLGNBQWMsR0FBRztFQUNuQixJQUFJLE1BQU0sQ0FBQyxXQUFXO0VBQ3RCLE1BQU07RUFDTixRQUFRLElBQUksRUFBRSxvQkFBb0IsQ0FBQywyQkFBMkI7RUFDOUQsUUFBUSxpQkFBaUIsRUFBRSxJQUFJLENBQUM7RUFDaEMsT0FBTztFQUNQLE1BQU07RUFDTixLQUFLO0VBQ0w7RUFDQSxFQUFFLHFCQUFxQixDQUFDLE9BQU8sRUFBRTtFQUNqQyxJQUFJLElBQUksT0FBTyxHQUFHLElBQUk7RUFDdEIsSUFBSSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssS0FBSztFQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssb0JBQW9CLENBQUMsMkJBQTJCLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsS0FBSyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7RUFDN0ksUUFBUSxNQUFNLFFBQVEsR0FBRyxPQUFPO0VBQ2hDLFFBQVEsT0FBTyxHQUFHLEtBQUs7RUFDdkIsUUFBUSxJQUFJLFFBQVEsSUFBSSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUU7RUFDbkQsUUFBUSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7RUFDaEM7RUFDQSxLQUFLO0VBQ0wsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO0VBQ25DLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztFQUNoRTtFQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwyLDMsNCw1LDZdfQ==
