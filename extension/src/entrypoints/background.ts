import { UrlStatus } from '@/utils/common-types';
import { onMessage } from '@/utils/messaging';
import { defineBackground } from 'wxt/sandbox';

let blacklist: Set<string>;
let whitelist: Set<string>;
const checkedUrls: Record<string, UrlStatus> = {};

export default defineBackground(() => {
  loadLists()
    .then(() => {
      subscribeToOnTabLoaded();
      subscribeToOnTabSelected();
      subscribeToMessages();
      console.log('Anti-Phishing extension loaded successfully!');
    })
    .catch((error) => {
      console.error('Failed to load Anti-Phishing extension!', error);
    });
});

async function fetchJSON(url: string) {
  const response = await fetch(url);
  return response.json();
}

async function loadLists() {
  try {
    const blacklistData = await fetchJSON('/blacklist-phishfort.json');
    blacklist = new Set(blacklistData);
  } catch (cause) {
    throw new Error('Error while loading blacklist data!', { cause });
  }
  console.log(`Successfully loaded ${blacklist.size} blacklisted domains.`);

  const whitelistFiles = [
    '/top-1m-builtwith.json',
    '/top-1m-cisco.json',
    '/top-1m-tranco.json'
  ];

  try {
    const [builtwithData, ciscoData, trancoData] = await Promise.all(
      whitelistFiles.map((url) => fetchJSON(url))
    );
    whitelist = new Set([...builtwithData, ...ciscoData, ...trancoData]);
  } catch (cause) {
    throw new Error('Error while loading whitelist data!', { cause });
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

function subscribeToMessages() {
  onMessage('getPageInfo', ({ data }) => {
    console.log(data);
  });
}

function checkTab(tab: chrome.tabs.Tab) {
  if (tab.status !== 'complete' || !tab.active) {
    return false;
  }

  if (tab.url && tab.url.startsWith('https://')) {
    return true;
  }

  if (tab.url && tab.url.startsWith('http://')) {
    return true;
  }

  return false;
}

function getHostnameFromTabUrl(tabUrl: string) {
  let url;
  try {
    url = new URL(tabUrl);
  } catch (cause) {
    throw new Error('Failed to parse tab url!', { cause });
  }

  if (url.hostname && (url.protocol === 'http:' || url.protocol === 'https:')) {
    return url.hostname.startsWith('www.')
      ? url.hostname.substring(4)
      : url.hostname;
  }

  throw new Error(`Protocol ${url.protocol} is not supported!`);
}

function checkBlacklist(urlHostname: string) {
  let phishing = false;
  const startTime = performance.now();

  if (blacklist.has(urlHostname)) {
    phishing = true;
  }

  const totalTime = Math.floor(performance.now() - startTime);
  console.log(`Black list check done in ${totalTime} ms.`);

  return phishing;
}

function checkWhitelist(urlHostname: string) {
  let safe = false;
  const startTime = performance.now();

  if (whitelist.has(urlHostname)) {
    safe = true;
  }

  const totalTime = Math.floor(performance.now() - startTime);
  console.log(`White list check done in ${totalTime} ms.`);

  return safe;
}

async function takeScreenshot(windowId: number) {
  const maxAttempts = 3;
  const delayMs = 500;
  let cause: unknown;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      const screenshot = await browser.tabs.captureVisibleTab(windowId, {
        format: 'png'
      });
      if (screenshot) {
        return screenshot;
      }
    } catch (e) {
      cause = e;
    }
  }

  throw new Error('Failed to capture screenshot after multiple attempts!', {
    cause
  });
}

function getPageLanguages(tabId: number) {
  return sendMessage('getPageLanguages', undefined, tabId);
}

async function checkPhishingAi(
  urlHostname: string,
  fullUrl: string,
  screenshot: string,
  languages: string[]
) {
  let phishing = false;
  const startTime = performance.now();

  const response = await fetch(import.meta.env.WXT_BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: fullUrl,
      languages,
      image_base64: screenshot
    })
  });

  const totalTime = Math.floor(performance.now() - startTime);
  console.log(`AI check done in ${totalTime} ms.`);

  const { isLoginPage, isPhishing, reasoning, websiteDomain, error } =
    await response.json();

  console.log('AI model isLoginPage:', isLoginPage);
  console.log('AI model isPhishing:', isPhishing);
  console.log('AI model reasoning:', reasoning);
  console.log('AI model websiteDomain:', websiteDomain);
  console.log('AI model error:', error);

  if (error) {
    return {
      phishing: false,
      error: true
    };
  } else {
    if (
      (isPhishing > 0.5 && isLoginPage > 0.5) ||
      (websiteDomain &&
        isPhishing <= 0.5 &&
        isLoginPage > 0.5 &&
        !urlHostname.endsWith(websiteDomain))
    ) {
      phishing = true;
    }
  }

  return {
    phishing,
    error: false
  };
}

async function antiPhishingPipeline(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url || !checkTab(tab)) {
    return;
  }

  if (checkedUrls[tab.url] === 'dangerous') {
    redirectToWarningPage();
    return;
  }

  if (
    checkedUrls[tab.url] === 'safe' ||
    checkedUrls[tab.url] === 'suspicious'
  ) {
    return;
  }

  const urlHostname = getHostnameFromTabUrl(tab.url);

  if (checkBlacklist(urlHostname)) {
    onDangerousUrl(tab.url);
    return;
  }

  if (checkWhitelist(urlHostname)) {
    onSafeUrl(tab.url);
    return;
  }

  try {
    const [screenshot, pageLanguages] = await Promise.all([
      takeScreenshot(tab.windowId),
      getPageLanguages(tab.id)
    ]);

    const screenshotCorrected = screenshot.slice(
      'data:image/png;base64,'.length
    );

    const { phishing: isPhishing } = await checkPhishingAi(
      urlHostname,
      tab.url,
      screenshotCorrected,
      pageLanguages
    );

    if (isPhishing) {
      onDangerousUrl(tab.url);
    } else {
      onSuspiciousUrl(tab.url);
    }
  } catch (e) {
    console.error('Error while analyzing page!', e);
  }
}

function onDangerousUrl(url: string) {
  checkedUrls[url] = 'dangerous';
  redirectToWarningPage();
}

function redirectToWarningPage() {
  console.log('redirect!');
}

function onSafeUrl(url: string) {
  checkedUrls[url] = 'safe';
}

function onSuspiciousUrl(url: string) {
  checkedUrls[url] = 'suspicious';
}
