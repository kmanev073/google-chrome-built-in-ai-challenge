# Anti-Phishing Browser Extension

Innovative browser extension that uses advanced Large Language Models (LLMs) and visual recognition to protect users from phishing attacks. By dynamically identifying sites that mimic legitimate pages, we offer a robust layer of security beyond traditional methods. Designed with privacy and scalability in mind. Join us in making the internet safer, one click at a time.

## How It Works

This diagram describes the novel approach that the extension uses to detect phishing attacks:

![Anti-Phishing browser extension architecture diagram](./docs/anti-phishing.svg)

**Steps:**

<ol start="0">
  <li>The user selects a tab or loads a new page</li>
  <li>
    The extension checks if the visited url is present in the blacklist with dangerous websites
    <ul>
        <li>If the website is found in the list the user is redirected to a warning page</li>
        <li>If the website is not blacklisted the extension proceeds with its next checks</li>
    </ul>    
  </li>
  <li>
    The extension checks if the visited url is present in the whitelists with safe websites
    <ul>
        <li>If the website is found in the list the user is allowed to visit the page without further checks being done</li>
        <li>If the website is not whitelisted the extension proceeds with its next checks</li>
    </ul>   
  </li>
  <li>The extension uses the built-in browser API to take a screenshot of the visited webpage when it is fully loaded</li>
  <li>The service worker requests the content script to identify the language used in the page content (this needs to be done by a content script due to unresolved a bug in the browser API)</li>
  <li>The content script uses the built-in AI language detected in the browser to find which languages are used in the whole content of the page</li>
  <li>Top 2 languages are selected and passed back to the service worker</li>
  <li>The service worker makes a call to the extension's backend and sends the visited url, the screenshot and the detected languages</li>
  <li>The backend uses the configured Gemini model to decide if the visited website is dangerous or not</li>
  <li>Based on the response from the backend the extension can redirect the user to a warning page if the visited website looks suspicious</li>
</ol>
