from datetime import datetime, timezone
from typing import Optional


def new_training_doc(
    user_id: str,
    chat_id: str,
    message_id: str,
    prompt: str,
    response: str,
    mode: str,
    model_used: str,
) -> dict:
    """Create a new training data document."""
    return {
        "user_id":    user_id,
        "chat_id":    chat_id,
        "message_id": message_id,        # assistant message _id in messages collection
        "prompt":     prompt,
        "response":   response,
        "mode":       mode,
        "model_used": model_used,
        "feedback":   None,              # None | 1 (thumbs up) | -1 (thumbs down)
        "used_in_training": False,       # flipped to True when included in a training run
        "created_at": datetime.now(timezone.utc),
        "feedback_at": None,
    }


def training_doc_to_json(doc: dict) -> dict:
    return {
        "id":               str(doc["_id"]),
        "user_id":          doc.get("user_id", ""),
        "chat_id":          doc.get("chat_id", ""),
        "message_id":       doc.get("message_id", ""),
        "prompt":           doc.get("prompt", ""),
        "response":         doc.get("response", ""),
        "mode":             doc.get("mode", ""),
        "model_used":       doc.get("model_used", ""),
        "feedback":         doc.get("feedback"),           # None | 1 | -1
        "used_in_training": doc.get("used_in_training", False),
        "created_at":       doc["created_at"].isoformat(),
        "feedback_at":      doc["feedback_at"].isoformat() if doc.get("feedback_at") else None,
    }
