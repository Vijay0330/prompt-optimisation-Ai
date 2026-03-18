"""
HuggingFace Inference Service
──────────────────────────────
Calls your custom fine-tuned model on HuggingFace Hub via the Inference API.
Model: {HF_USERNAME}/prompt-intelligence-assistant
Base:  google/flan-t5-base (fine-tuned via scripts/train.py)

Cold-start fallback: if the model is not loaded or returns an error,
we fall back to Gemini and include a note in the response.
"""

import os
import asyncio
import httpx
from typing import Tuple

HF_TOKEN        = os.getenv("HF_TOKEN", "")
HF_USERNAME     = os.getenv("HF_USERNAME", "")
HF_MODEL_NAME   = os.getenv("HF_MODEL_NAME", "prompt-intelligence-assistant")
HF_INFERENCE_URL = (
    f"https://api-inference.huggingface.co/models/{HF_USERNAME}/{HF_MODEL_NAME}"
)

# How long to wait for HF inference (shared CPU can be slow)
HF_TIMEOUT = 45.0

# Minimum tokens to accept as a valid response
MIN_RESPONSE_LENGTH = 10

# Prompt template — wraps user input for flan-t5 style
PROMPT_TEMPLATE = """You are a helpful AI assistant called Prompt Intelligence Assistant.
Answer the following clearly and helpfully.

User: {prompt}
Assistant:"""


async def _call_hf_inference(prompt: str) -> str:
    """
    Send a prompt to the HuggingFace Inference API.
    Returns the generated text string.
    Raises on network/model errors.
    """
    if not HF_TOKEN:
        raise ValueError("HF_TOKEN is not set in environment.")
    if not HF_USERNAME:
        raise ValueError("HF_USERNAME is not set in environment.")

    formatted = PROMPT_TEMPLATE.format(prompt=prompt)

    payload = {
        "inputs": formatted,
        "parameters": {
            "max_new_tokens":   512,
            "temperature":      0.7,
            "do_sample":        True,
            "repetition_penalty": 1.3,
            "return_full_text": False,   # only return generated part, not the prompt
        },
        "options": {
            "wait_for_model": True,      # wait if model is loading (cold start)
            "use_cache":      False,
        },
    }

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type":  "application/json",
    }

    async with httpx.AsyncClient(timeout=HF_TIMEOUT) as client:
        response = await client.post(HF_INFERENCE_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    # HF returns a list of generated texts
    if isinstance(data, list) and data:
        text = data[0].get("generated_text", "")
    elif isinstance(data, dict):
        text = data.get("generated_text", "")
    else:
        text = ""

    return text.strip()


async def query_free_model(prompt: str) -> Tuple[str, bool]:
    """
    Main entry point for the "Free" model option.

    Returns:
        (response_text, used_fallback)
        used_fallback=True means we fell back to Gemini (cold start or error)

    The caller is responsible for the Gemini fallback — we just signal it.
    """
    if not HF_TOKEN or not HF_USERNAME:
        # Credentials not configured — signal fallback immediately
        return "", True

    try:
        text = await _call_hf_inference(prompt)

        # Sanity check — reject empty or too-short responses
        if not text or len(text) < MIN_RESPONSE_LENGTH:
            return "", True

        return text, False   # success — no fallback needed

    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status in (503, 500):
            # Model loading or temporarily unavailable — use fallback
            print(f"[HF] Model unavailable ({status}) — falling back to Gemini")
            return "", True
        if status == 401:
            print("[HF] Invalid HF_TOKEN — falling back to Gemini")
            return "", True
        if status == 404:
            print("[HF] Model not found on HuggingFace Hub — falling back to Gemini")
            return "", True
        # Any other HTTP error — fallback
        print(f"[HF] HTTP error {status} — falling back to Gemini")
        return "", True

    except (httpx.TimeoutException, httpx.ConnectError):
        print("[HF] Timeout or connection error — falling back to Gemini")
        return "", True

    except Exception as e:
        print(f"[HF] Unexpected error: {e} — falling back to Gemini")
        return "", True
