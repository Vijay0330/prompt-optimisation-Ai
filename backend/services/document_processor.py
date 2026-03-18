"""
Document Processor — Phase 5 RAG
──────────────────────────────────
Handles user-uploaded documents:
  - PDF extraction (pypdf)
  - Plain text / markdown
  - Intelligent chunking with overlap
  - Embedding + storage in ChromaDB user_documents collection
"""

import hashlib
import re
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime, timezone

from services.embedder import embed_texts
from services.vector_store import (
    add_documents, delete_by_metadata, list_documents, get_collection_count
)

CHUNK_SIZE    = 500    # characters per chunk
CHUNK_OVERLAP = 100    # overlap between consecutive chunks


# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF binary."""
    try:
        from pypdf import PdfReader
        from io import BytesIO
        reader = PdfReader(BytesIO(file_bytes))
        pages  = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages).strip()
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {e}")


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Route to correct extractor based on file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in (".txt", ".md", ".rst", ".csv"):
        try:
            return file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1").strip()
    else:
        raise ValueError(f"Unsupported file type: {ext}. Use PDF, TXT, or MD.")


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Split text into overlapping chunks.
    Tries to split on sentence boundaries (. ! ?) for cleaner chunks.
    """
    # Normalise whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)

    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    chunks   = []
    start    = 0

    while start < len(text):
        end = start + chunk_size

        if end >= len(text):
            chunks.append(text[start:].strip())
            break

        # Try to find a sentence boundary near the end
        boundary = text.rfind(". ", start, end)
        if boundary == -1:
            boundary = text.rfind("\n", start, end)
        if boundary == -1 or boundary <= start:
            boundary = end

        chunk = text[start:boundary + 1].strip()
        if chunk:
            chunks.append(chunk)

        start = max(boundary + 1 - overlap, start + 1)

    return [c for c in chunks if len(c) > 30]   # filter very short chunks


# ── Document ID ───────────────────────────────────────────────────────────────

def _doc_id(user_id: str, filename: str, chunk_idx: int) -> str:
    """Stable deterministic ID for a document chunk."""
    base = hashlib.md5(f"{user_id}:{filename}".encode()).hexdigest()[:12]
    return f"doc_{base}_chunk{chunk_idx:04d}"


def _file_hash(content: bytes) -> str:
    return hashlib.md5(content).hexdigest()[:16]


# ── Public API ────────────────────────────────────────────────────────────────

async def process_and_store_document(
    file_bytes: bytes,
    filename:   str,
    user_id:    str,
    doc_title:  str = "",
) -> Dict:
    """
    Full pipeline: extract → chunk → embed → store in ChromaDB.
    Returns metadata about the stored document.
    """
    # Extract text
    text = extract_text_from_file(file_bytes, filename)
    if not text:
        raise ValueError("No text could be extracted from this file.")

    # Chunk
    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("Document produced no usable text chunks.")

    # Embed
    embeddings = await embed_texts(chunks)

    # Prepare for ChromaDB
    file_hash = _file_hash(file_bytes)
    title     = doc_title or Path(filename).stem
    now_iso   = datetime.now(timezone.utc).isoformat()

    doc_ids   = [_doc_id(user_id, filename, i) for i in range(len(chunks))]
    metadatas = [
        {
            "user_id":    user_id,
            "filename":   filename,
            "title":      title[:200],
            "file_hash":  file_hash,
            "chunk_idx":  i,
            "total_chunks": len(chunks),
            "uploaded_at": now_iso,
            "type":       "user_document",
        }
        for i in range(len(chunks))
    ]

    # Remove old version if file was re-uploaded
    delete_by_metadata("user_documents", {"file_hash": file_hash})

    add_documents("user_documents", doc_ids, embeddings, chunks, metadatas)

    return {
        "filename":     filename,
        "title":        title,
        "file_hash":    file_hash,
        "chunks":       len(chunks),
        "chars":        len(text),
        "uploaded_at":  now_iso,
        "doc_id_prefix": _doc_id(user_id, filename, 0)[:16],
    }


async def delete_user_document(user_id: str, filename: str):
    """Delete all chunks of a user's document."""
    delete_by_metadata("user_documents", {"user_id": user_id, "filename": filename})


def list_user_documents(user_id: str) -> List[Dict]:
    """List unique documents (not chunks) uploaded by a user."""
    docs = list_documents("user_documents", where={"user_id": user_id})
    seen     = {}
    for d in docs:
        fname = d["metadata"].get("filename", "")
        if fname not in seen:
            seen[fname] = {
                "filename":    fname,
                "title":       d["metadata"].get("title", fname),
                "file_hash":   d["metadata"].get("file_hash", ""),
                "total_chunks": d["metadata"].get("total_chunks", 1),
                "uploaded_at": d["metadata"].get("uploaded_at", ""),
            }
    return sorted(seen.values(), key=lambda x: x["uploaded_at"], reverse=True)
