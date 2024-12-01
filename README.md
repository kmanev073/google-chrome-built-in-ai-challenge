# Anti-Phishing Browser Extension

Innovative browser extension that uses advanced Large Language Models (LLMs) and visual recognition to protect users from phishing attacks. By dynamically identifying sites that mimic legitimate pages, we offer a robust layer of security beyond traditional methods. Designed with privacy and scalability in mind. Join us in making the internet safer, one click at a time.

## How to:

### Enable Chrome Built-in AI Features:

1. Enable **APIs for Gemini Nano**: [chrome://flags/#prompt-api-for-gemini-nano](chrome://flags/#prompt-api-for-gemini-nano)
2. Enable **Language detection web platform API**: [chrome://flags/#language-detection-api](chrome://flags/#language-detection-api)
3. Set **Enables optimization guide on device** to *Enabled BypassPerfAndTextSafety*: [chrome://flags/#optimization-guide-on-device-model](chrome://flags/#optimization-guide-on-device-model)
4. Open the JS console and execute `await ai.languageModel.create()` **TWICE**! (the first time an error will appear)
5. Visit the **Components** page: [chrome://components](chrome://components)
6. Check if the **Optimization Guide On Device Model** component is present in the list and wait for its status to become *Up-to-date*
7. Check status of the model by running this code in the JS console: `await ai.languageModel.capabilities()`. It should state *readily*.