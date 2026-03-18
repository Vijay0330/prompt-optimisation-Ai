from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from core.database import get_database
from core.security import get_current_user
from models.chat import new_chat_doc, chat_to_json
from models.message import message_to_json
from schemas.models import ChatCreate, ChatResponse
from typing import List

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("", response_model=List[ChatResponse])
async def list_chats(current_user: dict = Depends(get_current_user)):
    """List all chats for the logged-in user, newest first."""
    db = get_database()
    cursor = db.chats.find(
        {"user_id": current_user["sub"]}
    ).sort("updated_at", -1)
    chats = await cursor.to_list(length=100)
    return [chat_to_json(c) for c in chats]


@router.post("", response_model=ChatResponse, status_code=201)
async def create_chat(body: ChatCreate, current_user: dict = Depends(get_current_user)):
    """Create a new chat session."""
    db = get_database()
    doc = new_chat_doc(
        user_id=current_user["sub"],
        title=body.title or "New Chat",
        mode=body.mode,
        model=body.model,
    )
    result = await db.chats.insert_one(doc)
    doc["_id"] = result.inserted_id
    return chat_to_json(doc)


@router.get("/{chat_id}")
async def get_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    """Load a chat with all its messages."""
    db = get_database()

    try:
        oid = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID.")

    chat = await db.chats.find_one({"_id": oid, "user_id": current_user["sub"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")

    messages_cursor = db.messages.find({"chat_id": chat_id}).sort("created_at", 1)
    messages = await messages_cursor.to_list(length=500)

    return {
        "chat": chat_to_json(chat),
        "messages": [message_to_json(m) for m in messages],
    }


@router.patch("/{chat_id}/title")
async def update_chat_title(
    chat_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Rename a chat."""
    db = get_database()
    try:
        oid = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID.")

    await db.chats.update_one(
        {"_id": oid, "user_id": current_user["sub"]},
        {"$set": {"title": body.get("title", "Untitled")[:80], "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Title updated."}


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(chat_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a chat and all its messages."""
    db = get_database()

    try:
        oid = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID.")

    chat = await db.chats.find_one({"_id": oid, "user_id": current_user["sub"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")

    await db.chats.delete_one({"_id": oid})
    await db.messages.delete_many({"chat_id": chat_id})
