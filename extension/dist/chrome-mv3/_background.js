var background = (function () {
  'use strict';

  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }

  const browser = (
    // @ts-expect-error
    globalThis.browser?.runtime?.id == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );

  const definition = defineBackground(() => {
    console.log("Hello background!", { id: browser.runtime.id });
  });
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
  const result = (async () => {
    try {
      initPlugins();
      return await definition.main();
    } catch (err) {
      logger.error(
        `The unlisted script "${"_background"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();

  return result;

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2JhY2tncm91bmQuanMiLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyL2Nocm9tZS5tanMiLCIuLi8uLi9zcmMvZW50cnlwb2ludHMvX2JhY2tncm91bmQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUJhY2tncm91bmQoYXJnKSB7XG4gIGlmIChhcmcgPT0gbnVsbCB8fCB0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB7IG1haW46IGFyZyB9O1xuICByZXR1cm4gYXJnO1xufVxuIiwiZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSAoXG4gIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZCA9PSBudWxsID8gZ2xvYmFsVGhpcy5jaHJvbWUgOiAoXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICAgIGdsb2JhbFRoaXMuYnJvd3NlclxuICApXG4pO1xuIiwiZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZCgoKSA9PiB7XG4gIGNvbnNvbGUubG9nKCdIZWxsbyBiYWNrZ3JvdW5kIScsIHsgaWQ6IGJyb3dzZXIucnVudGltZS5pZCB9KTtcbn0pO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztFQUFPLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO0VBQ3RDLEVBQUUsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLE9BQU8sR0FBRyxLQUFLLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtFQUNwRSxFQUFFLE9BQU8sR0FBRztFQUNaOztFQ0hPLE1BQU0sT0FBTztFQUNwQjtFQUNBLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTTtFQUM3RDtFQUNBLElBQUksVUFBVSxDQUFDO0VBQ2Y7RUFDQSxDQUFDOztBQ05ELHFCQUFlLGlCQUFpQixNQUFNO0VBQ3BDLEVBQUEsT0FBQSxDQUFRLElBQUksbUJBQXFCLEVBQUEsRUFBRSxJQUFJLE9BQVEsQ0FBQSxPQUFBLENBQVEsSUFBSSxDQUFBO0VBQzdELENBQUMsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxXX0=
