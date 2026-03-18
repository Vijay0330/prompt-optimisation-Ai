import os
import json
import re
import asyncio
import httpx
from typing import Dict, Any

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
with open(_PROMPT_PATH, "r") as f:
    _SYSTEM_PROMPT_TEMPLATE = f.read()

MAX_RETRIES   = 3
RETRY_DELAYS  = [5, 15, 30]
DEFAULT_MODEL = "gemini-2.0-flash"


def _build_url(model: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )


async def compile_prompt(
    user_prompt: str,
    retrieved_tools_text: str,
    model: str = DEFAULT_MODEL,
    rag_context: str = "",          # ← Phase 5: injected RAG context
) -> Dict[str, Any]:
    """
    Send the user prompt + retrieved tools (+ optional RAG context) to Gemini.
    Returns structured JSON: { optimized_prompt, skill_persona, mcp_suggestions }
    """
    full_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
        user_prompt=user_prompt,
        retrieved_tools=retrieved_tools_text,
        rag_context=rag_context or "",
    )

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024},
    }

    url        = _build_url(model)
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 429:
                    wait = RETRY_DELAYS[attempt]
                    print(f"[Gemini] Rate limited. Attempt {attempt+1}. Waiting {wait}s...")
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
            return _parse_json_response(raw_text)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(RETRY_DELAYS[min(attempt, 2)])
                last_error = str(e)
                continue
            raise

    raise Exception(
        f"Gemini rate limit exceeded after {MAX_RETRIES} retries. Last: {last_error}"
    )


def _parse_json_response(raw_text: str) -> Dict[str, Any]:
    cleaned = re.sub(r"```(?:json)?", "", raw_text).strip().strip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        return {
            "optimized_prompt": raw_text[:500] if raw_text else "Unable to parse response.",
            "skill_persona":    "N/A",
            "mcp_suggestions":  [],
        }
