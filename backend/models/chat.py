from datetime import datetime, timezone


def new_chat_doc(user_id: str, title: str, mode: str, model: str) -> dict:
    """Returns a new chat document ready to insert into MongoDB."""
    return {
        "user_id": user_id,
        "title": title[:80],          # cap title length
        "mode": mode,                  # prompt_optimization | summarise | agent
        "model": model,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def chat_to_json(doc: dict) -> dict:
    """Serialise a MongoDB chat document to a JSON-safe dict."""
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "title": doc.get("title", "Untitled"),
        "mode": doc.get("mode", "prompt_optimization"),
        "model": doc.get("model", "gemini-2.0-flash"),
        "created_at": doc["created_at"].isoformat(),
        "updated_at": doc["updated_at"].isoformat(),
    }
