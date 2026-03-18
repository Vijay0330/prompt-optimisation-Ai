"""
Embedder Service — Phase 5 RAG
────────────────────────────────
Primary:  Google text-embedding-004 (free, 768-dim, uses existing GEMINI_API_KEY)
Fallback: sentence-transformers/all-MiniLM-L6-v2 (local, 384-dim, ~90MB)
"""

import os
import asyncio
import httpx
from typing import List, Optional

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
EMBED_MODEL_ID   = "text-embedding-004"
EMBED_DIM_GOOGLE = 768
EMBED_DIM_LOCAL  = 384

_local_model = None


# ── Google Embedding (primary) ────────────────────────────────────────────────

async def _embed_google_single(text: str) -> Optional[List[float]]:
    """Embed a single text using Google embedContent endpoint."""
    if not GEMINI_API_KEY:
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{EMBED_MODEL_ID}:embedContent?key={GEMINI_API_KEY}"
    )

    payload = {
        "model": f"models/{EMBED_MODEL_ID}",
        "content": {"parts": [{"text": text}]},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
        return data["embedding"]["values"]
    except Exception as e:
        print(f"[Embedder] Google embedding failed: {e} — falling back to local model")
        return None


async def _embed_google_batch(texts: List[str]) -> Optional[List[List[float]]]:
    """
    Embed multiple texts via individual calls gathered concurrently.
    Google's batchEmbedContents has format issues across versions — safer to use single calls.
    """
    if not GEMINI_API_KEY:
        return None

    try:
        tasks   = [_embed_google_single(t) for t in texts]
        results = await asyncio.gather(*tasks)
        if any(r is None for r in results):
            return None
        return list(results)
    except Exception as e:
        print(f"[Embedder] Google batch embedding failed: {e} — falling back to local model")
        return None


# ── Local Sentence-Transformers (fallback) ────────────────────────────────────

def _load_local_model():
    global _local_model
    if _local_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("[Embedder] Loading local sentence-transformers model (~90MB download on first run)...")
            _local_model = SentenceTransformer("all-MiniLM-L6-v2")
            print("[Embedder] Local model loaded.")
        except Exception as e:
            raise RuntimeError(f"[Embedder] Could not load local model: {e}")
    return _local_model


def _embed_local(texts: List[str]) -> List[List[float]]:
    model   = _load_local_model()
    vectors = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return [v.tolist() for v in vectors]


# ── Public API ────────────────────────────────────────────────────────────────

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of texts.
    Tries Google first, falls back to local MiniLM automatically.
    """
    if not texts:
        return []

    texts = [t.strip() or "empty" for t in texts]

    vectors = await _embed_google_batch(texts)
    if vectors is not None:
        return vectors

    # Fallback to local model
    loop    = asyncio.get_event_loop()
    vectors = await loop.run_in_executor(None, _embed_local, texts)
    return vectors


async def embed_query(text: str) -> List[float]:
    """Embed a single query string."""
    results = await embed_texts([text])
    return results[0] if results else []


def get_embedding_dim() -> int:
    return EMBED_DIM_GOOGLE if GEMINI_API_KEY else EMBED_DIM_LOCAL
