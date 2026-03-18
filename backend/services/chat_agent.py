import os
import asyncio
import httpx
from typing import List, Dict

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "..", "prompts", "agent_prompt.txt")
with open(_PROMPT_PATH, "r") as f:
    _AGENT_TEMPLATE = f.read()

MAX_RETRIES  = 3
RETRY_DELAYS = [5, 15, 30]
MEMORY_WINDOW = 10


def _build_url(model: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")
    return (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )


def _format_history(history: List[Dict]) -> str:
    if not history:
        return "(No previous messages — this is the start of the conversation.)"
    lines = []
    for msg in history[-MEMORY_WINDOW:]:
        role    = "User" if msg.get("role") == "user" else "Assistant"
        content = msg.get("content", "")
        if not content:
            content = msg.get("agent_reply") or msg.get("casual_reply") or ""
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines) if lines else "(No previous messages.)"


async def chat_with_agent(
    user_message: str,
    history:      List[Dict],
    model:        str = "gemini-2.0-flash",
    rag_context:  str = "",    # ← Phase 5: injected RAG context
) -> str:
    """
    Send user message + history (+ optional RAG context) to Gemini.
    Returns plain text reply.
    """
    history_text  = _format_history(history)
    full_history  = f"{history_text}\nUser: {user_message}"

    full_prompt = _AGENT_TEMPLATE.format(
        conversation_history=full_history,
        rag_context=rag_context or "",
    )

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048},
    }

    url        = _build_url(model)
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 429:
                    wait = RETRY_DELAYS[attempt]
                    print(f"[Agent] Rate limited. Waiting {wait}s...")
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
            return raw_text.strip()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(RETRY_DELAYS[min(attempt, 2)])
                last_error = str(e)
                continue
            raise

    raise Exception(f"Gemini rate limit exceeded after {MAX_RETRIES} retries. {last_error}")
