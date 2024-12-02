import { defineContentScript } from 'wxt/sandbox';

type CanDetect = 'no' | 'readily' | 'after-download';

type DetectorEvents = 'downloadprogress';

type DownloadProgressEventArgs = {
  loaded: number;
  total: number;
};

type Detector = {
  detect: (
    text: string
  ) => Promise<{ confidence: number; detectedLanguage: string }[]>;
  ready: Promise<void>;
  addEventListener: (
    eventName: DetectorEvents,
    callback: (e: DownloadProgressEventArgs) => void
  ) => void;
};

type Translation = {
  canDetect: () => Promise<CanDetect>;
  createDetector: () => Promise<Detector>;
};

type SelfWithTranslation = {
  translation: Translation;
};

let languageDetector: Detector | null = null;

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_start',
  main: async () => {
    subscribeToMessages();
    languageDetector = await setupDetector();
  }
});

function subscribeToMessages() {
  onMessage('getPageLanguages', () => {
    return detectPageLanguages();
  });
}

async function setupDetector() {
  if ('translation' in self) {
    const selfWithTranslation = self as SelfWithTranslation;
    if (
      'canDetect' in selfWithTranslation.translation &&
      'createDetector' in selfWithTranslation.translation
    ) {
      const canDetect = await selfWithTranslation.translation.canDetect();

      if (canDetect === 'no') {
        return null;
      }

      const languageDetector =
        await selfWithTranslation.translation.createDetector();

      if (canDetect === 'after-download') {
        console.log('Language detector model downloading!');
        languageDetector.addEventListener('downloadprogress', (e) => {
          console.log(`Download progress - ${e.loaded}/${e.total}`);
        });
        await languageDetector.ready;
        console.log('Language detector model downloaded successfully!');
      }

      return languageDetector;
    }
  }

  return null;
}

async function detectPageLanguages() {
  if (!languageDetector) {
    return [];
  }

  const allTextOnPage = document.querySelector(':root')?.textContent ?? '';
  const detectedLanguages = await languageDetector.detect(allTextOnPage);
  return detectedLanguages.slice(0, 2).map((d) => d.detectedLanguage);
}
