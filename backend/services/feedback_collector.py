"""
Feedback Collector & Auto-Training Trigger
──────────────────────────────────────────
- Saves interaction data to the training_data collection
- Records thumbs up/down feedback
- Checks if 100+ new positive feedback items exist → triggers background training
"""

import asyncio
import os
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from models.training_data import new_training_doc

# How many positive feedback items needed to trigger auto-training
AUTO_TRAIN_THRESHOLD = int(os.getenv("AUTO_TRAIN_THRESHOLD", "100"))

# Track if training is currently running to avoid parallel runs
_training_running = False


async def save_interaction(
    db,
    user_id:    str,
    chat_id:    str,
    message_id: str,
    prompt:     str,
    response:   str,
    mode:       str,
    model_used: str,
) -> str:
    """
    Save a prompt-response pair to training_data collection.
    Called every time an AI response is generated.
    Returns the inserted training_data document ID.
    """
    doc    = new_training_doc(user_id, chat_id, message_id, prompt, response, mode, model_used)
    result = await db.training_data.insert_one(doc)
    return str(result.inserted_id)


async def record_feedback(
    db,
    training_id: str,
    feedback:    int,   # 1 = thumbs up, -1 = thumbs down
) -> bool:
    """
    Record user feedback on a training data item.
    Returns True if the document was found and updated.
    After recording, checks if we've hit the auto-training threshold.
    """
    global _training_running

    try:
        oid = ObjectId(training_id)
    except Exception:
        return False

    result = await db.training_data.update_one(
        {"_id": oid},
        {"$set": {
            "feedback":    feedback,
            "feedback_at": datetime.now(timezone.utc),
        }},
    )

    if result.modified_count == 0:
        return False

    # ── Check auto-training threshold ────────────────────────────────────────
    if feedback == 1 and not _training_running:
        # Count positive feedback items not yet used in training
        positive_count = await db.training_data.count_documents({
            "feedback": 1,
            "used_in_training": False,
        })

        if positive_count >= AUTO_TRAIN_THRESHOLD:
            print(f"[AutoTrain] {positive_count} positive examples collected — triggering training...")
            _training_running = True
            # Run training in background so the API response is not blocked
            asyncio.create_task(_run_training_async(db))

    return True


async def _run_training_async(db):
    """
    Background task — runs the training script as a subprocess.
    Uses Python's asyncio subprocess to avoid blocking the event loop.
    """
    global _training_running
    import asyncio

    script_path = os.path.join(
        os.path.dirname(__file__), "..", "scripts", "train.py"
    )

    try:
        print("[AutoTrain] Starting fine-tuning subprocess...")
        proc = await asyncio.create_subprocess_exec(
            "python", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            print("[AutoTrain] Training completed successfully.")
            print(stdout.decode()[-500:] if stdout else "")

            # Mark used examples so they don't retrigger training
            await db.training_data.update_many(
                {"feedback": 1, "used_in_training": False},
                {"$set": {"used_in_training": True}},
            )
        else:
            print(f"[AutoTrain] Training failed (exit {proc.returncode}).")
            print(stderr.decode()[-500:] if stderr else "")

    except Exception as e:
        print(f"[AutoTrain] Error running training script: {e}")
    finally:
        _training_running = False


async def get_dashboard_stats(db) -> dict:
    """Return stats for the training dashboard."""
    total        = await db.training_data.count_documents({})
    positive     = await db.training_data.count_documents({"feedback": 1})
    negative     = await db.training_data.count_documents({"feedback": -1})
    no_feedback  = await db.training_data.count_documents({"feedback": None})
    trained      = await db.training_data.count_documents({"used_in_training": True})
    pending      = await db.training_data.count_documents({"feedback": 1, "used_in_training": False})

    # Recent 10 interactions
    cursor = db.training_data.find({}).sort("created_at", -1).limit(10)
    recent = await cursor.to_list(length=10)

    # Model version info from db (we store it after each training run)
    version_doc = await db.model_versions.find_one({}, sort=[("trained_at", -1)])

    return {
        "total_interactions":     total,
        "positive_feedback":      positive,
        "negative_feedback":      negative,
        "no_feedback":            no_feedback,
        "used_in_training":       trained,
        "pending_training":       pending,
        "threshold":              AUTO_TRAIN_THRESHOLD,
        "training_running":       _training_running,
        "next_trigger_at":        max(0, AUTO_TRAIN_THRESHOLD - pending),
        "model_version": {
            "version":     version_doc.get("version", "base") if version_doc else "base",
            "trained_at":  version_doc["trained_at"].isoformat() if version_doc and version_doc.get("trained_at") else None,
            "examples":    version_doc.get("examples_used", 0) if version_doc else 0,
            "hf_repo":     version_doc.get("hf_repo", "") if version_doc else "",
        },
        "recent": [
            {
                "id":         str(r["_id"]),
                "prompt":     r.get("prompt", "")[:80],
                "mode":       r.get("mode", ""),
                "model_used": r.get("model_used", ""),
                "feedback":   r.get("feedback"),
                "created_at": r["created_at"].isoformat(),
            }
            for r in recent
        ],
    }
