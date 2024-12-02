import os
import sys
import uvicorn
import dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from inference import infer


dotenv.load_dotenv()

LLM_TYPE = os.getenv("LLM_TYPE")
LLM_API_KEY = os.getenv("LLM_API_KEY")

if LLM_TYPE is None or LLM_API_KEY is None:
    sys.stderr.write("LLM credentials not found!\n")
    exit(1)


app = FastAPI()


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}


class InferenceRequestPayload(BaseModel):
    url: str
    image_base64: str
    languages: list[str]


@app.post("/inference")
async def inference(payload: InferenceRequestPayload):
    return await infer(
        website_url=payload.url,
        image_base64=payload.image_base64,
        languages=payload.languages,
        model_type=LLM_TYPE,  # type: ignore
        api_key=LLM_API_KEY,  # type: ignore
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
