# Anti-Phishing Browser Extension Frontend

This anti-phishing browser extension is built using the [WXT](https://wxt.dev/) framework and [SolidJS](https://www.solidjs.com/), ensuring a modern and efficient user experience. It employs [Bun](https://bun.sh/), [Vite](https://vite.dev/), [shadcn-solid](https://shadcn-solid.com/), and [Tailwind CSS](https://tailwindcss.com/). Designed to be universally compatible, the extension supports all browsers utilizing manifest version 3, providing a robust defense against phishing threats.

## Enable Chrome Built-in AI Features

Before you start your development journey you will need to enable the built-in features of your Chrome browser!

1. Enable **APIs for Gemini Nano**: [chrome://flags/#prompt-api-for-gemini-nano](chrome://flags/#prompt-api-for-gemini-nano)
2. Enable **Language detection web platform API**: [chrome://flags/#language-detection-api](chrome://flags/#language-detection-api)
3. Set **Enables optimization guide on device** to *Enabled BypassPerfAndTextSafety*: [chrome://flags/#optimization-guide-on-device-model](chrome://flags/#optimization-guide-on-device-model)
4. Open the JS console and execute `await ai.languageDetector.create()` **TWICE**! (the first time an error will appear)
5. Visit the **Components** page: [chrome://components](chrome://components)
6. Check if the **Optimization Guide On Device Model** component is present in the list and wait for its status to become *Up-to-date*
7. Check status of the model by running this code in the JS console: `await ai.languageDetector.capabilities()`. It should state *readily*.

## Setup Local Environment

1. Install all the needed libraries: 
   ```bash
   bun install
   ```
2. Run the post install WXT script:
   ```bash
   bun run postinstall
   ```
3. Create an empty folder `.wxt/chrome-data`
4. Create a `.env` file. Take a look at `.env.example`
5. Try out your extension:
    ```bash
    bun run dev
    ```
