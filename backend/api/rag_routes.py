"""
RAG Routes — Phase 5
─────────────────────
POST /api/documents/upload     — upload PDF/text to user's RAG knowledge base
GET  /api/documents            — list user's uploaded documents
DELETE /api/documents/{filename} — remove a document
GET  /api/rag/stats            — collection stats for dashboard
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional

from services.document_processor import (
    process_and_store_document,
    delete_user_document,
    list_user_documents,
)
from services.vector_store import get_collection_count
from core.security import get_current_user

router = APIRouter()

MAX_FILE_SIZE_MB = 10
ALLOWED_TYPES    = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "application/octet-stream",  # some browsers send this for txt/md
}
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".rst"}


@router.post("/documents/upload")
async def upload_document(
    file:      UploadFile = File(...),
    doc_title: Optional[str] = Form(default=""),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a PDF or text file to the user's RAG document collection.
    The file is chunked, embedded, and stored in ChromaDB.
    """
    user_id  = current_user["sub"]
    filename = file.filename or "document"

    # ── Validate extension ────────────────────────────────────────────────────
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # ── Read file ─────────────────────────────────────────────────────────────
    file_bytes = await file.read()
    size_mb    = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f}MB). Maximum is {MAX_FILE_SIZE_MB}MB.",
        )

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Process + store ───────────────────────────────────────────────────────
    try:
        meta = await process_and_store_document(
            file_bytes=file_bytes,
            filename=filename,
            user_id=user_id,
            doc_title=doc_title or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    return {
        "ok":      True,
        "message": f"Document '{meta['title']}' uploaded and indexed ({meta['chunks']} chunks).",
        "meta":    meta,
    }


@router.get("/documents")
async def list_documents(current_user: dict = Depends(get_current_user)):
    """List all documents uploaded by the current user."""
    user_id = current_user["sub"]
    try:
        docs = list_user_documents(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"documents": docs, "total": len(docs)}


@router.delete("/documents/{filename:path}")
async def delete_document(
    filename: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a user's uploaded document from the RAG index."""
    user_id = current_user["sub"]
    try:
        await delete_user_document(user_id, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"ok": True, "message": f"Document '{filename}' removed from knowledge base."}


@router.get("/rag/stats")
async def rag_stats(current_user: dict = Depends(get_current_user)):
    """Return ChromaDB collection counts for the dashboard."""
    user_id = current_user["sub"]
    try:
        user_docs = list_user_documents(user_id)
        return {
            "knowledge_base":   get_collection_count("knowledge_base"),
            "user_documents":   get_collection_count("user_documents"),
            "web_snippets":     get_collection_count("web_snippets"),
            "conversation_mem": get_collection_count("conversation_mem"),
            "user_doc_count":   len(user_docs),
            "user_docs":        user_docs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
