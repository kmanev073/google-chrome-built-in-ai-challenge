var content = (function () {
  'use strict';

  function defineContentScript(definition) {
    return definition;
  }

  const definition = defineContentScript({
    matches: ["*://*.google.com/*"],
    main() {
      console.log("Hello content.");
    }
  });
  content;

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
        `The unlisted script "${"_content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();

  return result;

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2NvbnRlbnQuanMiLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi9zcmMvZW50cnlwb2ludHMvX2NvbnRlbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUNvbnRlbnRTY3JpcHQoZGVmaW5pdGlvbikge1xuICByZXR1cm4gZGVmaW5pdGlvbjtcbn1cbiIsImV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbnRlbnRTY3JpcHQoe1xuICBtYXRjaGVzOiBbJyo6Ly8qLmdvb2dsZS5jb20vKiddLFxuICBtYWluKCkge1xuICAgIGNvbnNvbGUubG9nKCdIZWxsbyBjb250ZW50LicpO1xuICB9LFxufSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0VBQU8sU0FBUyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUU7RUFDaEQsRUFBRSxPQUFPLFVBQVU7RUFDbkI7O0FDRkEscUJBQWUsbUJBQW9CLENBQUE7RUFBQSxFQUNqQyxPQUFBLEVBQVMsQ0FBQyxvQkFBb0IsQ0FBQTtFQUFBLEVBQzlCLElBQU8sR0FBQTtFQUNMLElBQUEsT0FBQSxDQUFRLElBQUksZ0JBQWdCLENBQUE7RUFBQTtFQUVoQyxDQUFDLENBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzBdfQ==
