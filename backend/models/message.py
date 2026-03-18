from datetime import datetime, timezone
from typing import Optional


def new_message_doc(
    chat_id: str,
    user_id: str,
    role: str,                  # "user" | "assistant" | "error"
    content: str,
    mode: str,
    result: Optional[dict] = None,     # structured result for prompt_optimization
    summary: Optional[dict] = None,    # structured result for summarise
    casual_reply: Optional[str] = None,
) -> dict:
    """Returns a new message document ready to insert into MongoDB."""
    return {
        "chat_id": chat_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "mode": mode,
        "result": result,
        "summary": summary,
        "casual_reply": casual_reply,
        "created_at": datetime.now(timezone.utc),
    }


def message_to_json(doc: dict) -> dict:
    """Serialise a MongoDB message document to a JSON-safe dict."""
    return {
        "id": str(doc["_id"]),
        "chat_id": str(doc["chat_id"]),
        "user_id": str(doc["user_id"]),
        "role": doc.get("role", "user"),
        "content": doc.get("content", ""),
        "mode": doc.get("mode", "prompt_optimization"),
        "result": doc.get("result"),
        "summary": doc.get("summary"),
        "casual_reply": doc.get("casual_reply"),
        "created_at": doc["created_at"].isoformat(),
    }
