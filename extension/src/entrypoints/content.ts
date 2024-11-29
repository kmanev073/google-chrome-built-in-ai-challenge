import { defineContentScript } from 'wxt/sandbox';

// import type { ContentScriptContext } from 'wxt/client';

type CanDetect = 'no' | 'readily' | 'after-download';

type DetectorEvents = 'downloadprogress';

type DownloadProgressEventArgs = {
  loaded: number;
  total: number;
};

type Detector = {
  detect: (text: string) => Promise<string[]>;
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

// export default defineContentScript({
//   matches: ['<all_urls>'],
//   main: async (ctx: ContentScriptContext) => {
//     console.log('TEST');
//     if ('translation' in self) {
//       const selfWithTranslation = self as SelfWithTranslation;
//       if ('createTranslator' in selfWithTranslation.translation) {
//         if (ctx) {
//           const canDetect = await selfWithTranslation.translation.canDetect();
//           console.log('canDetect', canDetect);
//         }
//       }
//     }
//   }
// });

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_start',
  main: async (ctx) => {
    // const ui = createIntegratedUi(ctx, {
    //   position: 'inline',
    //   anchor: 'body',
    //   onMount: (container) => {
    //     // Append children to the container
    //     const app = document.createElement('p');
    //     app.textContent = 'KALO';
    //     container.append(app);
    //   }
    // });

    // // Call mount to add the UI to the DOM
    // ui.mount();

    if ('translation' in self) {
      const selfWithTranslation = self as SelfWithTranslation;
      if (
        'canDetect' in selfWithTranslation.translation &&
        'createDetector' in selfWithTranslation.translation
      ) {
        if (ctx) {
          const canDetect = await selfWithTranslation.translation.canDetect();
          detectPageLanguage(selfWithTranslation.translation, canDetect);
        } else {
          console.log('no ctx');
        }
      } else {
        console.log('no canDetect or createDetector');
      }
    } else {
      console.log('no translation');
    }
  }
});

async function detectPageLanguage(
  translation: Translation,
  canDetect: CanDetect
) {
  let detector;
  if (canDetect === 'no') {
    // The language detector isn't usable.
    return;
  }
  if (canDetect === 'readily') {
    // The language detector can immediately be used.
    detector = await translation.createDetector();
  } else {
    // The language detector can be used after model download.
    detector = await translation.createDetector();
    detector.addEventListener('downloadprogress', (e) => {
      console.log(e.loaded, e.total);
    });
    await detector.ready;
  }

  const allTextOnPage = document.querySelector('html')?.innerText ?? '';
  const detectedLanguages = await detector.detect(allTextOnPage);
  console.log('detectedLanguages', detectedLanguages.slice(0, 2));
  console.log('allTextOnPage', allTextOnPage);
}
