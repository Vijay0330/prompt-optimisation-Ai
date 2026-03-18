"""
Vector Store — ChromaDB 0.6.x Wrapper
────────────────────────────────────────
ChromaDB 0.6.x changed the Settings import path.
This version is compatible with chromadb==0.6.3.
"""

from pathlib import Path
from typing import List, Dict, Optional, Any
import chromadb

# ── ChromaDB setup ────────────────────────────────────────────────────────────
CHROMA_DIR = Path(__file__).parent.parent / "chroma_db"
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

_client: Optional[chromadb.PersistentClient] = None

COLLECTIONS = {
    "knowledge_base":   "pia_knowledge_base",
    "user_documents":   "pia_user_documents",
    "conversation_mem": "pia_conversation_memory",
    "web_snippets":     "pia_web_snippets",
}


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        print(f"[VectorStore] ChromaDB initialized at {CHROMA_DIR}")
    return _client


def get_collection(name: str):
    client    = get_chroma_client()
    coll_name = COLLECTIONS.get(name, name)
    return client.get_or_create_collection(
        name=coll_name,
        metadata={"hnsw:space": "cosine"},
    )


# ── Add / upsert ──────────────────────────────────────────────────────────────

def add_documents(
    collection_name: str,
    doc_ids:    List[str],
    embeddings: List[List[float]],
    texts:      List[str],
    metadatas:  List[Dict[str, Any]],
):
    if not doc_ids:
        return
    collection = get_collection(collection_name)
    collection.upsert(
        ids=doc_ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )
    print(f"[VectorStore] Upserted {len(doc_ids)} docs into '{collection_name}'")


# ── Query ─────────────────────────────────────────────────────────────────────

def query_collection(
    collection_name: str,
    query_embedding: List[float],
    n_results:       int = 5,
    where:           Optional[Dict] = None,
) -> List[Dict]:
    collection = get_collection(collection_name)
    count      = collection.count()
    if count == 0:
        return []

    n      = min(n_results, count)
    kwargs: Dict[str, Any] = {
        "query_embeddings": [query_embedding],
        "n_results":        n,
        "include":          ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    docs = []
    for i in range(len(results["ids"][0])):
        distance = results["distances"][0][i]
        score    = round(1 - distance, 4)
        docs.append({
            "id":       results["ids"][0][i],
            "text":     results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": round(distance, 4),
            "score":    score,
        })

    docs.sort(key=lambda x: x["score"], reverse=True)
    return docs


# ── Delete ────────────────────────────────────────────────────────────────────

def delete_documents(collection_name: str, doc_ids: List[str]):
    get_collection(collection_name).delete(ids=doc_ids)
    print(f"[VectorStore] Deleted {len(doc_ids)} docs from '{collection_name}'")


def delete_by_metadata(collection_name: str, where: Dict):
    collection = get_collection(collection_name)
    results    = collection.get(where=where, include=["documents"])
    if results["ids"]:
        collection.delete(ids=results["ids"])
        print(f"[VectorStore] Deleted {len(results['ids'])} docs from '{collection_name}'")


def get_collection_count(collection_name: str) -> int:
    return get_collection(collection_name).count()


def list_documents(
    collection_name: str,
    where: Optional[Dict] = None,
    limit: int = 100,
) -> List[Dict]:
    collection = get_collection(collection_name)
    kwargs: Dict[str, Any] = {"include": ["documents", "metadatas"], "limit": limit}
    if where:
        kwargs["where"] = where
    results = collection.get(**kwargs)
    return [
        {
            "id":       results["ids"][i],
            "text":     results["documents"][i][:200],
            "metadata": results["metadatas"][i],
        }
        for i in range(len(results["ids"]))
    ]
