"""
PIA Push Script
═══════════════
Pushes the already-trained local model to HuggingFace Hub.
Run this AFTER train.py has completed successfully.

Usage:
    python scripts/push_to_hub.py

This script does NOT retrain — it only uploads what's already in:
    backend/trained_model/model/
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone

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
LOCAL_MODEL_DIR = Path(__file__).parent.parent / "trained_model" / "model"


def check():
    if not HF_TOKEN:
        print("[Push] ❌ HF_TOKEN not set in .env")
        sys.exit(1)
    if not HF_USERNAME:
        print("[Push] ❌ HF_USERNAME not set in .env")
        sys.exit(1)
    if not LOCAL_MODEL_DIR.exists():
        print(f"[Push] ❌ No trained model found at: {LOCAL_MODEL_DIR}")
        print("[Push] Run python scripts/train.py first.")
        sys.exit(1)

    # Show what files exist locally
    files = list(LOCAL_MODEL_DIR.iterdir())
    print(f"[Push] Found {len(files)} model files locally:")
    total_size = 0
    for f in files:
        size_mb = f.stat().st_size / (1024 * 1024)
        total_size += size_mb
        print(f"       {f.name:40s}  {size_mb:.1f} MB")
    print(f"[Push] Total size to upload: {total_size:.1f} MB")
    print(f"[Push] Target: https://huggingface.co/{HF_REPO_ID}")
    print()


def push():
    """Push using huggingface_hub upload_folder — more reliable than model.push_to_hub for large files."""
    from huggingface_hub import HfApi, upload_folder

    api = HfApi(token=HF_TOKEN)

    # Ensure repo exists
    try:
        api.repo_info(repo_id=HF_REPO_ID, repo_type="model")
        print(f"[Push] Repo exists: {HF_REPO_ID}")
    except Exception:
        print(f"[Push] Creating repo: {HF_REPO_ID}")
        api.create_repo(repo_id=HF_MODEL_NAME, repo_type="model", private=False)

    print(f"[Push] Uploading model files to HuggingFace...")
    print(f"[Push] This may take 3-10 minutes depending on your internet speed...")
    print()

    commit = upload_folder(
        folder_path=str(LOCAL_MODEL_DIR),
        repo_id=HF_REPO_ID,
        repo_type="model",
        token=HF_TOKEN,
        commit_message=f"Fine-tuned PIA model — {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        # Upload file by file with progress tracking
        run_as_future=False,
    )

    print()
    print(f"[Push] ✅ Upload complete!")
    print(f"[Push] Commit URL: {commit}")
    print(f"[Push] View model: https://huggingface.co/{HF_REPO_ID}")
    print(f"[Push] → Click 'Files and versions' tab — you should see model files there")
    return True


def save_version(pushed: bool):
    """Save version record to MongoDB dashboard."""
    if not MONGODB_URI:
        print("[Push] ⚠️  MONGODB_URI not set — skipping version record.")
        return
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI)
        db     = client[MONGODB_DB]
        db.model_versions.insert_one({
            "version":       datetime.now(timezone.utc).strftime("v%Y%m%d-%H%M"),
            "trained_at":    datetime.now(timezone.utc),
            "examples_used": 11,    # from the training run
            "hf_repo":       HF_REPO_ID if pushed else "local-only",
            "pushed_to_hub": pushed,
        })
        client.close()
        print("[Push] ✅ Version record saved — visible in Training Dashboard.")
    except Exception as e:
        print(f"[Push] ⚠️  Could not save version record: {e}")


def main():
    print("=" * 60)
    print("  PIA Push-to-Hub Script")
    print(f"  Target: {HF_REPO_ID}")
    print("=" * 60)

    check()

    try:
        pushed = push()
        save_version(pushed)
        print()
        print("=" * 60)
        print("  ✅ Model is now live on HuggingFace!")
        print(f"  URL: https://huggingface.co/{HF_REPO_ID}")
        print("=" * 60)

    except Exception as e:
        print(f"[Push] ❌ Upload failed: {e}")
        print()
        print("[Push] Common causes:")
        print("  - Invalid HF_TOKEN: go to huggingface.co/settings/tokens → regenerate")
        print("  - Token needs Write permission (not just Read)")
        print("  - Internet connection dropped during upload")
        sys.exit(1)


if __name__ == "__main__":
    main()
