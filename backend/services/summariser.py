import os
import json
import re
import asyncio
import httpx
from typing import Dict, Any

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "summarise_prompt.txt")
with open(_PROMPT_PATH, "r") as f:
    _SUMMARISE_TEMPLATE = f.read()

MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 30]


def _build_url(model: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )


async def summarise(text: str, model: str = "gemini-2.0-flash") -> Dict[str, Any]:
    """
    Summarise the given text using Gemini.
    Returns { tldr, key_points, read_time }
    """
    full_prompt = _SUMMARISE_TEMPLATE.format(text=text)

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
    }

    url = _build_url(model)
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 429:
                    wait = RETRY_DELAYS[attempt]
                    print(f"[Summariser] Rate limited. Waiting {wait}s...")
                    await asyncio.sleep(wait)
                    last_error = "Rate limited"
                    continue
                response.raise_for_status()
                data = response.json()

            raw_text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            return _parse_json(raw_text)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                wait = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                await asyncio.sleep(wait)
                last_error = str(e)
                continue
            raise

    raise Exception(f"Gemini rate limit exceeded after {MAX_RETRIES} retries. {last_error}")


def _parse_json(raw: str) -> Dict[str, Any]:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {
            "tldr": "Could not parse summary. Please try again.",
            "key_points": [],
            "read_time": "Unknown",
        }
