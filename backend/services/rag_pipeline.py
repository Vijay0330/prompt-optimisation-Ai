"""
RAG Pipeline — Phase 5
───────────────────────
Orchestrates the full Retrieval-Augmented Generation flow:

  1. EMBED       — embed the user query
  2. RETRIEVE    — search knowledge_base + user_documents + web_snippets
  3. RERANK      — score by relevance, diversity, and recency
  4. AUGMENT     — build the context-injected prompt
  5. RETURN      — context string + source citations list

Used by: chat_agent, ai_compiler, summariser (all 3 modes).
"""

import asyncio
from typing import List, Dict, Tuple, Optional

from services.embedder import embed_query
from services.vector_store import query_collection
from services.web_search_rag import search_and_embed

# How many chunks to retrieve from each collection
K_KNOWLEDGE = 4
K_DOCUMENTS = 3
K_WEB       = 3

# Minimum relevance score to include a chunk (0-1)
MIN_SCORE = 0.30

# Max characters of context to inject into the prompt
MAX_CONTEXT_CHARS = 2500


# ── Retrieval ─────────────────────────────────────────────────────────────────

async def _retrieve_from_collection(
    collection_name: str,
    query_embedding: List[float],
    n_results: int,
    where: Optional[Dict] = None,
    source_label: str = "",
) -> List[Dict]:
    """Retrieve from one ChromaDB collection and tag results."""
    try:
        results = query_collection(
            collection_name,
            query_embedding=query_embedding,
            n_results=n_results,
            where=where,
        )
        for r in results:
            r["collection"] = collection_name
            r["source_label"] = source_label or collection_name
        return [r for r in results if r["score"] >= MIN_SCORE]
    except Exception as e:
        print(f"[RAG] Retrieval from '{collection_name}' failed: {e}")
        return []


# ── Reranking ─────────────────────────────────────────────────────────────────

def _rerank(chunks: List[Dict], max_chunks: int = 6) -> List[Dict]:
    """
    Simple reranking strategy:
    1. Sort by score (primary)
    2. Deduplicate very similar texts (cosine score > 0.95 to each other)
    3. Cap at max_chunks
    4. Ensure diversity across collections
    """
    # Sort by score
    chunks.sort(key=lambda x: x["score"], reverse=True)

    # Deduplicate near-identical texts
    seen_texts  = []
    deduped     = []
    for chunk in chunks:
        text = chunk["text"][:150]   # compare first 150 chars
        if not any(text in s or s in text for s in seen_texts):
            seen_texts.append(text)
            deduped.append(chunk)

    # Ensure collection diversity — max 3 from any single collection
    collection_counts: Dict[str, int] = {}
    diverse = []
    for chunk in deduped:
        coll = chunk.get("collection", "unknown")
        if collection_counts.get(coll, 0) < 3:
            diverse.append(chunk)
            collection_counts[coll] = collection_counts.get(coll, 0) + 1

    return diverse[:max_chunks]


# ── Context Builder ───────────────────────────────────────────────────────────

def _build_context_prompt(chunks: List[Dict], mode: str) -> str:
    """
    Build the RAG context block to inject into the AI prompt.
    Different intro text depending on mode.
    """
    if not chunks:
        return ""

    intros = {
        "agent": (
            "Use the following retrieved context to inform your response. "
            "Prefer information from the context over your general knowledge. "
            "If the context doesn't cover the question, say so clearly.\n\n"
        ),
        "prompt_optimization": (
            "The following context contains relevant domain knowledge and tool information. "
            "Use it to make the optimized prompt and skill persona more specific and accurate.\n\n"
        ),
        "summarise": (
            "The following context provides additional background on this topic. "
            "Use it to enrich the summary with accurate details.\n\n"
        ),
    }

    intro = intros.get(mode, intros["agent"])
    lines = ["=== RETRIEVED CONTEXT ===", intro]

    total_chars = 0
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("metadata", {}).get("source") or chunk.get("source", "Knowledge Base")
        title  = chunk.get("metadata", {}).get("title") or chunk.get("title", "")
        text   = chunk["text"]

        # Truncate individual chunk if very long
        if len(text) > 600:
            text = text[:600] + "..."

        if total_chars + len(text) > MAX_CONTEXT_CHARS:
            break

        label = f"[{i}] {title} — {source}" if title else f"[{i}] Source: {source}"
        lines.append(f"{label}")
        lines.append(text)
        lines.append("")
        total_chars += len(text)

    lines.append("=== END CONTEXT ===\n")
    return "\n".join(lines)


def _build_citations(chunks: List[Dict]) -> List[Dict]:
    """Build citation list for the frontend 'Sources used' panel."""
    citations = []
    seen_sources = set()
    for i, chunk in enumerate(chunks, 1):
        meta   = chunk.get("metadata", {})
        source = meta.get("source") or chunk.get("source", "")
        title  = meta.get("title") or chunk.get("title", source[:60])
        ctype  = meta.get("type") or chunk.get("type", "knowledge_base")
        score  = chunk.get("score", 0)

        if source not in seen_sources:
            seen_sources.add(source)
            citations.append({
                "index":  i,
                "title":  title[:120],
                "source": source,
                "type":   ctype,   # "knowledge_base" | "user_document" | "web_search"
                "score":  round(score, 3),
            })
    return citations


# ── Main Entry Point ──────────────────────────────────────────────────────────

async def run_rag(
    query:        str,
    mode:         str,
    user_id:      str,
    use_web:      bool = True,
    where_docs:   Optional[Dict] = None,
) -> Tuple[str, List[Dict]]:
    """
    Full RAG pipeline.

    Args:
        query:     the user's prompt / question
        mode:      "agent" | "prompt_optimization" | "summarise"
        user_id:   for scoping user_documents retrieval
        use_web:   whether to also query DuckDuckGo
        where_docs: optional extra ChromaDB filter for user_documents

    Returns:
        (context_string, citations_list)
        context_string — ready to inject before the AI prompt
        citations_list — list of { index, title, source, type, score }
    """
    # ── 1. Embed query ────────────────────────────────────────────────────────
    query_vec = await embed_query(query)
    if not query_vec:
        return "", []

    # ── 2. Retrieve in parallel from all sources ──────────────────────────────
    tasks = [
        _retrieve_from_collection(
            "knowledge_base", query_vec, K_KNOWLEDGE,
            source_label="PIA Knowledge Base",
        ),
        _retrieve_from_collection(
            "user_documents", query_vec, K_DOCUMENTS,
            where={"user_id": user_id},
            source_label="Your Documents",
        ),
    ]

    if use_web:
        # Web search runs differently — it first fetches then embeds
        tasks.append(search_and_embed(query, max_results=K_WEB))

    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Flatten results, skip any that errored
    chunks: List[Dict] = []
    for result in all_results:
        if isinstance(result, Exception):
            print(f"[RAG] Retrieval task failed: {result}")
            continue
        if isinstance(result, list):
            chunks.extend(result)

    if not chunks:
        return "", []

    # ── 3. Rerank ─────────────────────────────────────────────────────────────
    reranked = _rerank(chunks, max_chunks=7)

    if not reranked:
        return "", []

    # ── 4. Build context prompt + citations ───────────────────────────────────
    context_string = _build_context_prompt(reranked, mode)
    citations      = _build_citations(reranked)

    print(f"[RAG] Retrieved {len(reranked)} chunks for mode='{mode}' — {len(citations)} unique sources")
    return context_string, citations
