"""
PIA Push-to-Hub Script
══════════════════════
Pushes the already-trained local model to HuggingFace Hub.
Run this AFTER train.py has completed successfully.

This script uses chunked upload which is much more memory efficient
than model.push_to_hub() — won't get Killed.

Run:
    python scripts/push_model.py
"""

import os
import sys
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print(f"[Push] Loaded .env from {env_path}")

HF_TOKEN      = os.getenv("HF_TOKEN", "")
HF_USERNAME   = os.getenv("HF_USERNAME", "")
HF_MODEL_NAME = os.getenv("HF_MODEL_NAME", "prompt-intelligence-assistant")
MONGODB_URI   = os.getenv("MONGODB_URI", "")
MONGODB_DB    = os.getenv("MONGODB_DB_NAME", "promptai")

HF_REPO_ID = f"{HF_USERNAME}/{HF_MODEL_NAME}"
LOCAL_DIR  = Path(__file__).parent.parent / "trained_model" / "model"


def check():
    if not HF_TOKEN:
        print("[Push] ❌ HF_TOKEN not set in .env")
        sys.exit(1)
    if not HF_USERNAME:
        print("[Push] ❌ HF_USERNAME not set in .env")
        sys.exit(1)
    if not LOCAL_DIR.exists():
        print(f"[Push] ❌ No trained model found at: {LOCAL_DIR}")
        print("[Push] Run python scripts/train.py first.")
        sys.exit(1)

    # Show local model files
    files = list(LOCAL_DIR.iterdir())
    if not files:
        print(f"[Push] ❌ Model directory is empty: {LOCAL_DIR}")
        sys.exit(1)

    print(f"[Push] Found local model at: {LOCAL_DIR}")
    total_mb = sum(f.stat().st_size for f in files if f.is_file()) / (1024*1024)
    print(f"[Push] Files to upload:")
    for f in sorted(files):
        if f.is_file():
            size_mb = f.stat().st_size / (1024*1024)
            print(f"         {f.name:40s}  {size_mb:.1f} MB")
    print(f"[Push] Total size: {total_mb:.1f} MB")


def push():
    """
    Use HfApi.upload_folder() — uploads file by file in chunks.
    Much more memory efficient than model.push_to_hub().
    Does NOT load the model into RAM at all.
    """
    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("[Push] ❌ huggingface_hub not installed.")
        print("[Push] Run: pip install huggingface_hub")
        sys.exit(1)

    api = HfApi(token=HF_TOKEN)

    # Make sure the repo exists
    try:
        api.repo_info(repo_id=HF_REPO_ID, repo_type="model")
        print(f"[Push] Repo exists: {HF_REPO_ID}")
    except Exception:
        print(f"[Push] Repo not found — creating: {HF_REPO_ID}")
        try:
            api.create_repo(repo_id=HF_MODEL_NAME, repo_type="model", private=False)
            print(f"[Push] ✅ Repo created.")
        except Exception as e:
            print(f"[Push] ❌ Could not create repo: {e}")
            sys.exit(1)

    print(f"[Push] Uploading to https://huggingface.co/{HF_REPO_ID} ...")
    print("[Push] This uploads file-by-file — won't run out of memory...")

    try:
        from datetime import datetime
        commit_msg = f"Fine-tuned PIA model — {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        # upload_folder uploads each file individually — very memory efficient
        api.upload_folder(
            folder_path=str(LOCAL_DIR),
            repo_id=HF_REPO_ID,
            repo_type="model",
            commit_message=commit_msg,
            ignore_patterns=["*.pyc", "__pycache__", "*.lock"],
        )

        print(f"\n[Push] ✅ SUCCESS!")
        print(f"[Push] Model live at: https://huggingface.co/{HF_REPO_ID}")
        print(f"[Push] → Click 'Files and versions' tab to verify upload")
        return True

    except Exception as e:
        print(f"[Push] ❌ Upload failed: {e}")
        print(f"[Push] Common causes:")
        print(f"[Push]   • HF_TOKEN expired → regenerate at huggingface.co/settings/tokens")
        print(f"[Push]   • No internet connection")
        print(f"[Push]   • Repo name mismatch in .env")
        return False


def save_version_to_mongo(pushed: bool):
    """Save version record to MongoDB so dashboard shows the update."""
    if not MONGODB_URI or not pushed:
        return
    try:
        from pymongo import MongoClient
        from datetime import datetime, timezone

        client = MongoClient(MONGODB_URI)
        db     = client[MONGODB_DB]

        # Count how many examples were used (read from training_data collection)
        trained_count = db.training_data.count_documents({"feedback": 1})

        db.model_versions.insert_one({
            "version":       datetime.now(timezone.utc).strftime("v%Y%m%d-%H%M"),
            "trained_at":    datetime.now(timezone.utc),
            "examples_used": trained_count,
            "base_model":    os.getenv("BASE_MODEL", "google/flan-t5-base"),
            "hf_repo":       HF_REPO_ID,
            "pushed_to_hub": True,
        })

        # Mark all positive examples as used in training
        db.training_data.update_many(
            {"feedback": 1, "used_in_training": False},
            {"$set": {"used_in_training": True}},
        )

        client.close()
        print(f"[Push] ✅ Version record saved to MongoDB — dashboard will update.")
    except Exception as e:
        print(f"[Push] ⚠️  Could not save to MongoDB: {e} (not critical)")


def main():
    print("=" * 60)
    print("  PIA Push-to-Hub Script")
    print(f"  Target: https://huggingface.co/{HF_REPO_ID}")
    print("=" * 60)

    check()
    pushed = push()
    save_version_to_mongo(pushed)

    print("\n" + "=" * 60)
    if pushed:
        print("  ✅ Model successfully pushed to HuggingFace!")
        print(f"  🔗 https://huggingface.co/{HF_REPO_ID}")
        print("  📊 Check your dashboard at localhost:5173/dashboard")
    else:
        print("  ❌ Push failed — see errors above.")
    print("=" * 60)


if __name__ == "__main__":
    main()
