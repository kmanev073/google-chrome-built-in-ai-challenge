var background = (function () {
  'use strict';

  const browser = (
    // @ts-expect-error
    globalThis.browser?.runtime?.id == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );

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
  async function antiPhishingPipeline(tab) {
    if (!tab.url || !checkTab(tab)) {
      return;
    }
    const urlHostname = getHostnameFromTabUrl(tab.url);
    if (checkBlacklist(urlHostname)) {
      console.log("DANGER!");
      return;
    }
    if (checkedWebsites[tab.url] === "safe" || checkWhitelist(urlHostname)) {
      console.log("OK!");
      return;
    }
    const screenshot = await takeScreenshot(tab.windowId);
    console.log(screenshot);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIiwiLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSAoXG4gIC8vIEB0cy1leHBlY3QtZXJyb3JcbiAgZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZCA9PSBudWxsID8gZ2xvYmFsVGhpcy5jaHJvbWUgOiAoXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICAgIGdsb2JhbFRoaXMuYnJvd3NlclxuICApXG4pO1xuIiwiZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUJhY2tncm91bmQoYXJnKSB7XG4gIGlmIChhcmcgPT0gbnVsbCB8fCB0eXBlb2YgYXJnID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiB7IG1haW46IGFyZyB9O1xuICByZXR1cm4gYXJnO1xufVxuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiIsImltcG9ydCB7IGRlZmluZUJhY2tncm91bmQgfSBmcm9tICd3eHQvc2FuZGJveCc7XHJcblxyXG5sZXQgYmxhY2tsaXN0OiBTZXQ8c3RyaW5nPjtcclxubGV0IHdoaXRlbGlzdDogU2V0PHN0cmluZz47XHJcbmNvbnN0IGNoZWNrZWRXZWJzaXRlczogUmVjb3JkPHN0cmluZywgJ3NhZmUnIHwgJ2Rhbmdlcm91cyc+ID0ge307XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKCgpID0+IHtcclxuICBsb2FkTGlzdHMoKVxyXG4gICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICBzdWJzY3JpYmVUb09uVGFiTG9hZGVkKCk7XHJcbiAgICAgIHN1YnNjcmliZVRvT25UYWJTZWxlY3RlZCgpO1xyXG4gICAgICBjb25zb2xlLmxvZygnQW50aS1QaGlzaGluZyBleHRlbnNpb24gbG9hZGVkIHN1Y2Nlc3NmdWxseSEnKTtcclxuICAgIH0pXHJcbiAgICAuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIEFudGktUGhpc2hpbmcgZXh0ZW5zaW9uIScsIGVycm9yKTtcclxuICAgIH0pO1xyXG59KTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZldGNoSlNPTih1cmw6IHN0cmluZykge1xyXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsKTtcclxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2FkTGlzdHMoKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGJsYWNrbGlzdERhdGEgPSBhd2FpdCBmZXRjaEpTT04oJy9ibGFja2xpc3QtcGhpc2hmb3J0Lmpzb24nKTtcclxuICAgIGJsYWNrbGlzdCA9IG5ldyBTZXQoYmxhY2tsaXN0RGF0YSk7XHJcbiAgfSBjYXRjaCAoY2F1c2UpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3Igd2hpbGUgbG9hZGluZyBibGFja2xpc3QgZGF0YSEnLCB7IGNhdXNlIH0pO1xyXG4gIH1cclxuICBjb25zb2xlLmxvZyhgU3VjY2Vzc2Z1bGx5IGxvYWRlZCAke2JsYWNrbGlzdC5zaXplfSBibGFja2xpc3RlZCBkb21haW5zLmApO1xyXG5cclxuICBjb25zdCB3aGl0ZWxpc3RGaWxlcyA9IFtcclxuICAgICcvdG9wLTFtLWJ1aWx0d2l0aC5qc29uJyxcclxuICAgICcvdG9wLTFtLWNpc2NvLmpzb24nLFxyXG4gICAgJy90b3AtMW0tdHJhbmNvLmpzb24nXHJcbiAgXTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IFtidWlsdHdpdGhEYXRhLCBjaXNjb0RhdGEsIHRyYW5jb0RhdGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoXHJcbiAgICAgIHdoaXRlbGlzdEZpbGVzLm1hcCgodXJsKSA9PiBmZXRjaEpTT04odXJsKSlcclxuICAgICk7XHJcbiAgICB3aGl0ZWxpc3QgPSBuZXcgU2V0KFsuLi5idWlsdHdpdGhEYXRhLCAuLi5jaXNjb0RhdGEsIC4uLnRyYW5jb0RhdGFdKTtcclxuICB9IGNhdGNoIChjYXVzZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciB3aGlsZSBsb2FkaW5nIHdoaXRlbGlzdCBkYXRhIScsIHsgY2F1c2UgfSk7XHJcbiAgfVxyXG4gIGNvbnNvbGUubG9nKGBTdWNjZXNzZnVsbHkgbG9hZGVkICR7d2hpdGVsaXN0LnNpemV9IHdoaXRlbGlzdGVkIGRvbWFpbnMuYCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN1YnNjcmliZVRvT25UYWJMb2FkZWQoKSB7XHJcbiAgYnJvd3Nlci50YWJzLm9uVXBkYXRlZC5hZGRMaXN0ZW5lcigodGFiSWQsIGNoYW5nZUluZm8sIHRhYikgPT4ge1xyXG4gICAgYW50aVBoaXNoaW5nUGlwZWxpbmUodGFiKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3Vic2NyaWJlVG9PblRhYlNlbGVjdGVkKCkge1xyXG4gIGJyb3dzZXIudGFicy5vbkFjdGl2YXRlZC5hZGRMaXN0ZW5lcihhc3luYyAoeyB0YWJJZCB9KSA9PiB7XHJcbiAgICBjb25zdCB0YWIgPSBhd2FpdCBicm93c2VyLnRhYnMuZ2V0KHRhYklkKTtcclxuICAgIGFudGlQaGlzaGluZ1BpcGVsaW5lKHRhYik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoZWNrVGFiKHRhYjogY2hyb21lLnRhYnMuVGFiKSB7XHJcbiAgaWYgKHRhYi5zdGF0dXMgIT09ICdjb21wbGV0ZScgfHwgIXRhYi5hY3RpdmUpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGlmICh0YWIudXJsICYmIHRhYi51cmwuc3RhcnRzV2l0aCgnaHR0cHM6Ly8nKSkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAodGFiLnVybCAmJiB0YWIudXJsLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEhvc3RuYW1lRnJvbVRhYlVybCh0YWJVcmw6IHN0cmluZykge1xyXG4gIGxldCB1cmw7XHJcbiAgdHJ5IHtcclxuICAgIHVybCA9IG5ldyBVUkwodGFiVXJsKTtcclxuICB9IGNhdGNoIChjYXVzZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gcGFyc2UgdGFiIHVybCEnLCB7IGNhdXNlIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKHVybC5ob3N0bmFtZSAmJiAodXJsLnByb3RvY29sID09PSAnaHR0cDonIHx8IHVybC5wcm90b2NvbCA9PT0gJ2h0dHBzOicpKSB7XHJcbiAgICByZXR1cm4gdXJsLmhvc3RuYW1lLnN0YXJ0c1dpdGgoJ3d3dy4nKVxyXG4gICAgICA/IHVybC5ob3N0bmFtZS5zdWJzdHJpbmcoNClcclxuICAgICAgOiB1cmwuaG9zdG5hbWU7XHJcbiAgfVxyXG5cclxuICB0aHJvdyBuZXcgRXJyb3IoYFByb3RvY29sICR7dXJsLnByb3RvY29sfSBpcyBub3Qgc3VwcG9ydGVkIWApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGVja0JsYWNrbGlzdCh1cmxIb3N0bmFtZTogc3RyaW5nKSB7XHJcbiAgbGV0IHBoaXNoaW5nID0gZmFsc2U7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblxyXG4gIGlmIChibGFja2xpc3QuaGFzKHVybEhvc3RuYW1lKSkge1xyXG4gICAgcGhpc2hpbmcgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgdG90YWxUaW1lID0gTWF0aC5mbG9vcihwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZSk7XHJcbiAgY29uc29sZS5sb2coYEJsYWNrIGxpc3QgY2hlY2sgZG9uZSBpbiAke3RvdGFsVGltZX0gbXMuYCk7XHJcblxyXG4gIHJldHVybiBwaGlzaGluZztcclxufVxyXG5cclxuZnVuY3Rpb24gY2hlY2tXaGl0ZWxpc3QodXJsSG9zdG5hbWU6IHN0cmluZykge1xyXG4gIGxldCBsZWdpdCA9IGZhbHNlO1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cclxuICBpZiAod2hpdGVsaXN0Lmhhcyh1cmxIb3N0bmFtZSkpIHtcclxuICAgIGxlZ2l0ID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHRvdGFsVGltZSA9IE1hdGguZmxvb3IocGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFRpbWUpO1xyXG4gIGNvbnNvbGUubG9nKGBXaGl0ZSBsaXN0IGNoZWNrIGRvbmUgaW4gJHt0b3RhbFRpbWV9IG1zLmApO1xyXG5cclxuICByZXR1cm4gbGVnaXQ7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRha2VTY3JlZW5zaG90KHdpbmRvd0lkOiBudW1iZXIpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIGNvbnN0IG1heEF0dGVtcHRzID0gMztcclxuICBjb25zdCBkZWxheU1zID0gNTAwO1xyXG5cclxuICBmb3IgKGxldCBhdHRlbXB0cyA9IDA7IGF0dGVtcHRzIDwgbWF4QXR0ZW1wdHM7IGF0dGVtcHRzKyspIHtcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGRlbGF5TXMpKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzY3JlZW5zaG90ID0gYXdhaXQgYnJvd3Nlci50YWJzLmNhcHR1cmVWaXNpYmxlVGFiKHdpbmRvd0lkLCB7XHJcbiAgICAgICAgZm9ybWF0OiAncG5nJ1xyXG4gICAgICB9KTtcclxuICAgICAgaWYgKHNjcmVlbnNob3QpIHtcclxuICAgICAgICByZXR1cm4gc2NyZWVuc2hvdDtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAvKiBlbXB0eSAqL1xyXG4gICAgICBjb25zb2xlLmxvZyhlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNhcHR1cmUgc2NyZWVuc2hvdCBhZnRlciBtdWx0aXBsZSBhdHRlbXB0cyEnKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gYW50aVBoaXNoaW5nUGlwZWxpbmUodGFiOiBjaHJvbWUudGFicy5UYWIpIHtcclxuICBpZiAoIXRhYi51cmwgfHwgIWNoZWNrVGFiKHRhYikpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGNvbnN0IHVybEhvc3RuYW1lID0gZ2V0SG9zdG5hbWVGcm9tVGFiVXJsKHRhYi51cmwpO1xyXG5cclxuICBpZiAoY2hlY2tCbGFja2xpc3QodXJsSG9zdG5hbWUpKSB7XHJcbiAgICBjb25zb2xlLmxvZygnREFOR0VSIScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKGNoZWNrZWRXZWJzaXRlc1t0YWIudXJsXSA9PT0gJ3NhZmUnIHx8IGNoZWNrV2hpdGVsaXN0KHVybEhvc3RuYW1lKSkge1xyXG4gICAgLy9ub3RpZnlQb3B1cCh0YWIudXJsLCAnc2FmZScpO1xyXG4gICAgY29uc29sZS5sb2coJ09LIScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgc2NyZWVuc2hvdCA9IGF3YWl0IHRha2VTY3JlZW5zaG90KHRhYi53aW5kb3dJZCk7XHJcbiAgY29uc29sZS5sb2coc2NyZWVuc2hvdCk7XHJcbn1cclxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztFQUFPLE1BQU0sT0FBTztFQUNwQjtFQUNBLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsTUFBTTtFQUM3RDtFQUNBLElBQUksVUFBVSxDQUFDO0VBQ2Y7RUFDQSxDQUFDOztFQ05NLFNBQVMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO0VBQ3RDLEVBQUUsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLE9BQU8sR0FBRyxLQUFLLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtFQUNwRSxFQUFFLE9BQU8sR0FBRztFQUNaOztFQ0hBO0VBQ0EsSUFBSSxhQUFhLEdBQUcsTUFBTTtFQUMxQixFQUFFLFdBQVcsQ0FBQyxZQUFZLEVBQUU7RUFDNUIsSUFBSSxJQUFJLFlBQVksS0FBSyxZQUFZLEVBQUU7RUFDdkMsTUFBTSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUk7RUFDM0IsTUFBTSxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO0VBQ3pELE1BQU0sSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHO0VBQzlCLE1BQU0sSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHO0VBQzlCLEtBQUssTUFBTTtFQUNYLE1BQU0sTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztFQUM5RCxNQUFNLElBQUksTUFBTSxJQUFJLElBQUk7RUFDeEIsUUFBUSxNQUFNLElBQUksbUJBQW1CLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDO0VBQ3ZFLE1BQU0sTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU07RUFDdEQs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QUFBO0VBQy9ELEVBQUEsTUFBTSxXQUFjLEdBQUEsQ0FBQTtFQUNwQixFQUFBLE1BQU0sT0FBVSxHQUFBLEdBQUE7RUFFaEIsRUFBQSxLQUFBLElBQVMsUUFBVyxHQUFBLENBQUEsRUFBRyxRQUFXLEdBQUEsV0FBQSxFQUFhLFFBQVksRUFBQSxFQUFBO0VBQ3pELElBQUEsTUFBTSxJQUFJLE9BQVEsQ0FBQSxDQUFDLFlBQVksVUFBVyxDQUFBLE9BQUEsRUFBUyxPQUFPLENBQUMsQ0FBQTtFQUUzRCxJQUFJLElBQUE7RUFDRixNQUFBLE1BQU0sVUFBYSxHQUFBLE1BQU0sT0FBUSxDQUFBLElBQUEsQ0FBSyxrQkFBa0IsUUFBVSxFQUFBO0VBQUEsUUFDaEUsTUFBUSxFQUFBO0VBQUEsT0FDVCxDQUFBO0VBQ0QsTUFBQSxJQUFJLFVBQVksRUFBQTtFQUNkLFFBQU8sT0FBQSxVQUFBO0VBQUE7RUFDVCxhQUNPLENBQUcsRUFBQTtFQUVWLE1BQUEsT0FBQSxDQUFRLElBQUksQ0FBQyxDQUFBO0VBQUE7RUFDZjtFQUdGLEVBQU0sTUFBQSxJQUFJLE1BQU0sdURBQXVELENBQUE7RUFDekU7RUFFQSxlQUFlLHFCQUFxQixHQUFzQixFQUFBO0VBQ3hELEVBQUEsSUFBSSxDQUFDLEdBQUksQ0FBQSxHQUFBLElBQU8sQ0FBQyxRQUFBLENBQVMsR0FBRyxDQUFHLEVBQUE7RUFDOUIsSUFBQTtFQUFBO0VBR0YsRUFBTSxNQUFBLFdBQUEsR0FBYyxxQkFBc0IsQ0FBQSxHQUFBLENBQUksR0FBRyxDQUFBO0VBRWpELEVBQUksSUFBQSxjQUFBLENBQWUsV0FBVyxDQUFHLEVBQUE7RUFDL0IsSUFBQSxPQUFBLENBQVEsSUFBSSxTQUFTLENBQUE7RUFDckIsSUFBQTtFQUFBO0VBR0YsRUFBQSxJQUFJLGdCQUFnQixHQUFJLENBQUEsR0FBRyxNQUFNLE1BQVUsSUFBQSxjQUFBLENBQWUsV0FBVyxDQUFHLEVBQUE7RUFFdEUsSUFBQSxPQUFBLENBQVEsSUFBSSxLQUFLLENBQUE7RUFDakIsSUFBQTtFQUFBO0VBR0YsRUFBQSxNQUFNLFVBQWEsR0FBQSxNQUFNLGNBQWUsQ0FBQSxHQUFBLENBQUksUUFBUSxDQUFBO0VBQ3BELEVBQUEsT0FBQSxDQUFRLElBQUksVUFBVSxDQUFBO0VBQ3hCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyXX0=
