# Anti-Phishing Browser Extension Backend

This directory hosts the backend API for the anti-phishing browser extension. It is developed using Python 3 and FastAPI. The primary function of this API is to interface with Google's Gemini LLM, offering enhanced phishing detection capabilities by supporting prompts accompanied by images.

## Setup Local Environment

1. Create a file named `.env`. You can take a look at `.env.example`. Fill in the required environmental variables (The currently cheapest model to use is `gemini-1.5-flash`):

   ```bash
    LLM_TYPE='...'
    LLM_API_KEY='...'
   ```

2. Activate your venv by running this command on Windows:

   ```bash
   .\venv\Scripts\activate
   ```

3. Run the following command to install the required libraries:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend by running this command:
   ```bash
   python main.py
   ```
5. Access Swagger at: [http://localhost:8000/docs](http://localhost:8000/docs)

## Future Enhancements

Some additional improvements are planned for future development:

- Authentication: Implementation of authentication mechanisms for secure access
- Expanded Model Include compatibility with additional language models for improved flexibility and performance
- Bring Your Own Key: Ability to use a LLM endpoint and api key provided by the user to tackle privacy concerns
