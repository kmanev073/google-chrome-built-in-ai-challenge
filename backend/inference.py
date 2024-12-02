import json
from prompt import SYSTEM_PROMPT, USER_PROMPT
import google.generativeai as genai


def _remove_beginning_str(beginning_str: str, content: str) -> str:
    if content.startswith(beginning_str):
        return content[len(beginning_str) :]
    return content


async def infer(
    *,
    website_url: str,
    image_base64: str,
    languages: list[str],
    model_type: str,
    api_key: str,
) -> dict:

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=model_type,
        system_instruction=SYSTEM_PROMPT,
    )

    prompt = USER_PROMPT.format(site_url=website_url, languages=languages)

    response = model.generate_content(
        [{"mime_type": "image/png", "data": image_base64}, prompt]
    )

    parsed_json = json.loads(
        _remove_beginning_str("json", response.text[:-1].strip("```"))
    )
    return parsed_json
