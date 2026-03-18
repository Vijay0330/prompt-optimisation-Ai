from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from core.database import get_database
from core.security import get_current_user
from services.feedback_collector import record_feedback, get_dashboard_stats

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    training_id: str          # ID of the training_data document
    feedback:    int          # 1 = thumbs up, -1 = thumbs down


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/feedback")
async def submit_feedback(
    body: FeedbackRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Record user feedback (👍 / 👎) on an AI response.
    The training_id is returned with every AI response that is eligible for feedback.
    """
    if body.feedback not in (1, -1):
        raise HTTPException(status_code=400, detail="feedback must be 1 (up) or -1 (down).")

    db      = get_database()
    updated = await record_feedback(db, body.training_id, body.feedback)

    if not updated:
        raise HTTPException(status_code=404, detail="Training record not found.")

    return {
        "ok":      True,
        "message": "Feedback recorded. Thank you!",
    }


@router.get("/dashboard/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """
    Returns training statistics for the dashboard UI.
    Includes: total interactions, feedback counts, model version, recent items.
    """
    db    = get_database()
    stats = await get_dashboard_stats(db)
    return stats


@router.get("/dashboard/data")
async def get_training_data(
    page:     int = 1,
    limit:    int = 20,
    feedback: Optional[str] = None,   # "positive" | "negative" | "none" | None (all)
    current_user: dict = Depends(get_current_user),
):
    """Paginated list of training data items for the dashboard table."""
    db = get_database()

    query: dict = {}
    if feedback == "positive":
        query["feedback"] = 1
    elif feedback == "negative":
        query["feedback"] = -1
    elif feedback == "none":
        query["feedback"] = None

    skip   = (page - 1) * limit
    cursor = db.training_data.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs   = await cursor.to_list(length=limit)
    total  = await db.training_data.count_documents(query)

    return {
        "items": [
            {
                "id":               str(d["_id"]),
                "prompt":           d.get("prompt", "")[:120],
                "response":         d.get("response", "")[:200],
                "mode":             d.get("mode", ""),
                "model_used":       d.get("model_used", ""),
                "feedback":         d.get("feedback"),
                "used_in_training": d.get("used_in_training", False),
                "created_at":       d["created_at"].isoformat(),
            }
            for d in docs
        ],
        "total":  total,
        "page":   page,
        "limit":  limit,
        "pages":  max(1, (total + limit - 1) // limit),
    }
