# Anti-Phishing Browser Extension Example Phishing Pages

This folder contains three example phishing pages simulating real-world scenarios. They are clones of Google, Facebook, and Microsoft login pages. Use these pages to test and validate that the anti-phishing extension effectively detects and alerts users to phishing attempts.

## Setup Local Environment

To run the examples you first need to start a local python server that will serve the pages. Use the following commands:

```bash
cd examples
python3 -m http.server 8888
```
## Access the Pages

- Google Login: [http://localhost:8888/google/](http://localhost:8888/google/)
- Facebook Login: [http://localhost:8888/facebook/](http://localhost:8888/facebook/)
- Microsoft Login: [http://localhost:8888/microsoft/](http://localhost:8888/microsoft/)
