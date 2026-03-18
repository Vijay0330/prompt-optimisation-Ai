"""
Web Search RAG Service
───────────────────────
Uses DuckDuckGo Search (free, no API key, no rate limits for reasonable use)
to retrieve live web results and inject them into the RAG context.

Results are:
  1. Fetched from DuckDuckGo
  2. Embedded and stored in web_snippets ChromaDB collection (cached 1hr)
  3. Returned as RAG context chunks with source URLs
"""

import asyncio
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from services.embedder import embed_texts, embed_query
from services.vector_store import (
    add_documents, query_collection, delete_by_metadata, get_collection_count
)

CACHE_TTL_MINUTES = 60   # cache web results for 1 hour


def _query_hash(query: str) -> str:
    """Stable hash of a query string for cache key."""
    return hashlib.md5(query.lower().strip().encode()).hexdigest()[:16]


def _is_stale(fetched_at_iso: str) -> bool:
    """Check if a cached web snippet is older than TTL."""
    try:
        fetched = datetime.fromisoformat(fetched_at_iso.replace("Z", "+00:00"))
        age     = datetime.now(timezone.utc) - fetched
        return age > timedelta(minutes=CACHE_TTL_MINUTES)
    except Exception:
        return True


async def _ddg_search(query: str, max_results: int = 5) -> List[Dict]:
    """
    Run a DuckDuckGo search and return snippets.
    Returns list of { title, body, url }
    """
    try:
        from duckduckgo_search import DDGS
        loop = asyncio.get_event_loop()

        def _search():
            with DDGS() as ddgs:
                results = list(ddgs.text(
                    query,
                    max_results=max_results,
                    safesearch="moderate",
                ))
            return results

        results = await loop.run_in_executor(None, _search)
        return [
            {
                "title": r.get("title", ""),
                "body":  r.get("body", ""),
                "url":   r.get("href", ""),
            }
            for r in results
            if r.get("body")
        ]
    except Exception as e:
        print(f"[WebRAG] DuckDuckGo search failed: {e}")
        return []


async def search_and_embed(query: str, max_results: int = 5) -> List[Dict]:
    """
    Main entry point.
    1. Check if we have a fresh cached result for this query
    2. If not, search DuckDuckGo
    3. Embed + store results in web_snippets collection
    4. Return top relevant snippets as context chunks
    """
    query_key = _query_hash(query)

    # ── Check cache ───────────────────────────────────────────────────────────
    # Try to retrieve cached results for this exact query
    try:
        query_vec = await embed_query(query)
        cached    = query_collection(
            "web_snippets",
            query_embedding=query_vec,
            n_results=max_results,
            where={"query_hash": query_key},
        )
        # Filter out stale entries
        fresh = [c for c in cached if not _is_stale(c["metadata"].get("fetched_at", ""))]
        if fresh:
            print(f"[WebRAG] Cache hit for '{query[:50]}' — {len(fresh)} snippets")
            return _format_snippets(fresh)
    except Exception:
        pass   # cache miss or error — proceed to live search

    # ── Live search ───────────────────────────────────────────────────────────
    print(f"[WebRAG] Live search for: '{query[:60]}'")
    raw_results = await _ddg_search(query, max_results)

    if not raw_results:
        return []

    # ── Embed and store ───────────────────────────────────────────────────────
    texts      = [f"{r['title']}. {r['body']}" for r in raw_results]
    embeddings = await embed_texts(texts)
    now_iso    = datetime.now(timezone.utc).isoformat()

    doc_ids   = [f"web_{query_key}_{i}" for i in range(len(raw_results))]
    metadatas = [
        {
            "source":      r["url"],
            "title":       r["title"][:200],
            "query":       query[:200],
            "query_hash":  query_key,
            "fetched_at":  now_iso,
            "type":        "web_search",
        }
        for r in raw_results
    ]

    add_documents("web_snippets", doc_ids, embeddings, texts, metadatas)

    # ── Return top results by relevance ───────────────────────────────────────
    query_vec = await embed_query(query)
    results   = query_collection(
        "web_snippets",
        query_embedding=query_vec,
        n_results=max_results,
        where={"query_hash": query_key},
    )
    return _format_snippets(results)


def _format_snippets(raw: List[Dict]) -> List[Dict]:
    """Normalise snippets into standard RAG chunk format."""
    return [
        {
            "text":   r["text"],
            "source": r["metadata"].get("source", "web"),
            "title":  r["metadata"].get("title", "Web Result"),
            "score":  r["score"],
            "type":   "web_search",
        }
        for r in raw
        if r["score"] > 0.2   # filter very low relevance snippets
    ]
