import { createSignal } from 'solid-js';
import { sendMessage } from '@/utils/messaging';
import { Button } from '@/components/ui/button';
import { UrlStatus } from '@/utils/common-types';

function App() {
  const [urlStatus, setUrlStatus] = createSignal<UrlStatus>('unknown');
  const [urlsScanned, setUrlsScanned] = createSignal(0);
  const [threatsBlocked, setThreatsBlocked] = createSignal(0);

  onMount(async () => {
    subscribeToMessages();
    await getPageInfo();
  });

  function subscribeToMessages() {
    onMessage('newPageInfo', async ({ data }) => {
      const currentUrl = await getCurrentUrl();
      if (currentUrl === data.url) {
        setPopupInfo(data);
      }
    });
  }

  async function getPageInfo() {
    const currentUrl = await getCurrentUrl();
    if (currentUrl) {
      const response = await sendMessage('getPageInfo', currentUrl);
      setPopupInfo(response);
    }
  }

  async function getCurrentUrl() {
    const [tab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true
    });
    if (tab && tab.url) {
      const urlParams = new URLSearchParams(new URL(tab.url).search);
      return urlParams.get('url') ?? tab.url;
    }
    return '';
  }

  function setPopupInfo(info: PopupInfo) {
    setUrlStatus(info.urlStatus);
    setUrlsScanned(info.urlsScanned);
    setThreatsBlocked(info.threatsBlocked);
  }

  return (
    <div
      class="grid h-96 grid-cols-1 content-around gap-4"
      classList={{
        'bg-green-500': urlStatus() === 'safe',
        'bg-yellow-500': urlStatus() === 'suspicious',
        'bg-red-500': urlStatus() === 'dangerous',
        'bg-gray-300': urlStatus() === 'unknown',
        'text-white': urlStatus() === 'safe' || urlStatus() === 'dangerous'
      }}
    >
      <div class="text-center">
        <Switch>
          <Match when={urlStatus() === 'unknown'}>
            <div class="flex justify-center drop-shadow-md">
              {/* <Face class="mr-2 h-20 w-20" /> */}
            </div>
            <p class="text-lg drop-shadow-md">Checking website...</p>
          </Match>
          <Match when={urlStatus() === 'dangerous'}>
            <div class="flex justify-center drop-shadow-md">
              {/* <Cross2 class="mr-2 h-20 w-20" /> */}
            </div>
            <p class="text-lg drop-shadow-md">Phishing detected, stay away!</p>
          </Match>
          <Match when={urlStatus() === 'safe'}>
            <div class="flex justify-center drop-shadow-md">
              {/* <Check class="mr-2 h-20 w-20" /> */}
            </div>
            <p class="text-lg drop-shadow-md">This website is safe!</p>
          </Match>
          <Match when={urlStatus() === 'suspicious'}>
            <div class="flex justify-center drop-shadow-md">
              {/* <ExclamationTriangle class="mr-2 h-20 w-20" /> */}
            </div>
            <p class="text-lg drop-shadow-md">
              Suspicious website, be careful!
            </p>
          </Match>
        </Switch>
      </div>
      <div class="flex">
        <div class="m-auto text-center">
          <p class="text-lg drop-shadow-md">{urlsScanned()} websites scanned</p>
          <p class="text-lg drop-shadow-md">
            {threatsBlocked()} threats blocked
          </p>
        </div>
      </div>
      <div class="space-y-4">
        <div class="flex content-between justify-center space-x-5 drop-shadow-md">
          <Button>Get help</Button>
          <Button>Report problem</Button>
        </div>
        <div class="flex content-between">
          <p class="ml-3 mr-auto drop-shadow-md">Anti-Phishing v0.0.1</p>
          <p class="ml-auto mr-3 drop-shadow-md">About</p>
        </div>
      </div>
    </div>
  );
}

export default App;
