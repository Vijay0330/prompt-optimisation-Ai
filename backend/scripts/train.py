"""
PIA Fine-Tuning Script — Memory Optimized
══════════════════════════════════════════
Fine-tunes google/flan-t5-base on collected positive-feedback interactions
from MongoDB, then pushes the updated model to HuggingFace Hub.

Run:
    python scripts/train.py

Requirements (install once):
    pip install transformers datasets torch accelerate huggingface_hub pymongo python-dotenv sentencepiece

Memory optimizations applied:
- Reduced batch size to 1 to avoid OOM
- Gradient accumulation to simulate larger batch
- Reduced sequence lengths
- Dynamic padding (not max_length) to save memory
- torch.no_grad() during evaluation
- fp16 disabled on CPU (causes errors on CPU)
"""

import os
import sys
import gc
from datetime import datetime, timezone
from pathlib import Path

# ── Load .env ─────────────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)
    print(f"[Train] Loaded .env from {env_path}")

# ── Config ────────────────────────────────────────────────────────────────────
MONGODB_URI   = os.getenv("MONGODB_URI", "")
MONGODB_DB    = os.getenv("MONGODB_DB_NAME", "promptai")
HF_TOKEN      = os.getenv("HF_TOKEN", "")
HF_USERNAME   = os.getenv("HF_USERNAME", "")
HF_MODEL_NAME = os.getenv("HF_MODEL_NAME", "prompt-intelligence-assistant")
BASE_MODEL    = os.getenv("BASE_MODEL", "google/flan-t5-base")

HF_REPO_ID = f"{HF_USERNAME}/{HF_MODEL_NAME}"
LOCAL_DIR  = Path(__file__).parent.parent / "trained_model"

# ── Memory-safe hyperparameters ───────────────────────────────────────────────
MAX_SAMPLES         = int(os.getenv("TRAIN_MAX_SAMPLES", "500"))
MAX_INPUT_LENGTH    = 256    # reduced from 512 → saves ~50% memory
MAX_TARGET_LENGTH   = 128    # reduced from 256 → saves ~50% memory
BATCH_SIZE          = 1      # reduced from 4 → biggest memory saver
GRAD_ACCUM_STEPS    = 4      # simulates batch size of 4 without the memory cost
NUM_EPOCHS          = 3
LEARNING_RATE       = 3e-4


def check_deps():
    missing = []
    for pkg in ["transformers", "datasets", "torch", "accelerate", "huggingface_hub", "sentencepiece"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[Train] ❌ Missing packages: {', '.join(missing)}")
        print("[Train] Install with: pip install transformers datasets torch accelerate huggingface_hub sentencepiece")
        sys.exit(1)
    print("[Train] ✅ All ML dependencies found.")


def check_memory():
    """Warn if available RAM is below safe threshold."""
    try:
        import psutil
        ram = psutil.virtual_memory()
        available_gb = ram.available / (1024 ** 3)
        total_gb     = ram.total    / (1024 ** 3)
        print(f"[Train] RAM: {available_gb:.1f}GB available / {total_gb:.1f}GB total")
        if available_gb < 3.0:
            print("[Train] ⚠️  Low RAM detected (<3GB free). Training may be killed by OS.")
            print("[Train] ⚠️  Close other applications before training.")
            print("[Train] ⚠️  Consider using flan-t5-small instead: set BASE_MODEL=google/flan-t5-small in .env")
    except ImportError:
        pass   # psutil not installed — skip check


def load_training_data() -> list:
    from pymongo import MongoClient
    if not MONGODB_URI:
        print("[Train] ❌ MONGODB_URI not set.")
        sys.exit(1)
    print("[Train] Connecting to MongoDB...")
    client   = MongoClient(MONGODB_URI)
    db       = client[MONGODB_DB]
    cursor   = db.training_data.find(
        {"feedback": 1, "used_in_training": False}
    ).sort("created_at", -1).limit(MAX_SAMPLES)
    examples = list(cursor)
    client.close()
    print(f"[Train] Loaded {len(examples)} positive-feedback examples.")
    return examples


def build_dataset(examples: list):
    from datasets import Dataset
    records = []
    for ex in examples:
        prompt   = ex.get("prompt", "").strip()
        response = ex.get("response", "").strip()
        if not prompt or not response:
            continue
        # Truncate very long prompts/responses before tokenization
        prompt   = prompt[:800]
        response = response[:400]
        input_text = (
            f"You are a helpful AI assistant called Prompt Intelligence Assistant.\n"
            f"User: {prompt}\nAssistant:"
        )
        records.append({"input": input_text, "target": response})
    print(f"[Train] Built dataset with {len(records)} valid records.")
    return Dataset.from_list(records)


def tokenize_dataset(dataset, tokenizer):
    """Tokenize with DYNAMIC padding — much more memory efficient than max_length padding."""
    def tokenize(batch):
        model_inputs = tokenizer(
            batch["input"],
            max_length=MAX_INPUT_LENGTH,
            truncation=True,
            padding=False,           # ← dynamic padding: pad per-batch, not to max globally
        )
        with tokenizer.as_target_tokenizer():
            labels = tokenizer(
                batch["target"],
                max_length=MAX_TARGET_LENGTH,
                truncation=True,
                padding=False,
            )
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    return dataset.map(
        tokenize,
        batched=True,
        remove_columns=["input", "target"],
        batch_size=8,    # process 8 at a time during tokenization (not training batch size)
    )


def train_model(raw_dataset, model_path: str):
    import torch
    from transformers import (
        AutoTokenizer,
        AutoModelForSeq2SeqLM,
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        DataCollatorForSeq2Seq,
        EarlyStoppingCallback,
    )

    # ── Detect device ─────────────────────────────────────────────────────────
    device  = "cuda" if torch.cuda.is_available() else "cpu"
    use_fp16 = torch.cuda.is_available()   # NEVER use fp16 on CPU — causes errors
    print(f"[Train] Device: {device.upper()} {'(GPU — fast!)' if device == 'cuda' else '(CPU — slower, ~15-30 min for small dataset)'}")

    # ── Load model ────────────────────────────────────────────────────────────
    print(f"[Train] Loading model: {model_path}")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model     = AutoModelForSeq2SeqLM.from_pretrained(
        model_path,
        torch_dtype=torch.float32,     # always float32 on CPU
    )
    model.to(device)
    print(f"[Train] Model loaded. Parameters: {sum(p.numel() for p in model.parameters()):,}")

    # ── Tokenize ──────────────────────────────────────────────────────────────
    print("[Train] Tokenizing dataset...")
    tokenized = tokenize_dataset(raw_dataset, tokenizer)
    split     = tokenized.train_test_split(test_size=max(1, int(len(tokenized)*0.1)), seed=42)
    print(f"[Train] Train: {len(split['train'])} examples | Eval: {len(split['test'])} examples")

    # ── Training args — memory safe ───────────────────────────────────────────
    args = Seq2SeqTrainingArguments(
        output_dir=str(LOCAL_DIR / "checkpoints"),
        num_train_epochs=NUM_EPOCHS,
        # ── Memory saving settings ──
        per_device_train_batch_size=BATCH_SIZE,      # 1 = least memory
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM_STEPS, # simulate batch=4
        gradient_checkpointing=True,                  # trade compute for memory
        # ── Learning ──
        learning_rate=LEARNING_RATE,
        warmup_steps=min(50, len(split['train'])),
        weight_decay=0.01,
        # ── Logging ──
        logging_dir=str(LOCAL_DIR / "logs"),
        logging_steps=max(1, len(split['train']) // 4),
        # ── Eval & save ──
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        # ── Precision ──
        fp16=use_fp16,           # only on GPU
        bf16=False,
        # ── Misc ──
        predict_with_generate=True,
        report_to="none",
        dataloader_pin_memory=False,   # avoids the pin_memory warning on CPU
        remove_unused_columns=False,
    )

    # Dynamic padding collator — pads to longest in batch, not max_length
    data_collator = DataCollatorForSeq2Seq(
        tokenizer,
        model=model,
        padding=True,              # pads to longest in batch
        pad_to_multiple_of=8,
        label_pad_token_id=-100,
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=args,
        train_dataset=split["train"],
        eval_dataset=split["test"],
        processing_class=tokenizer,  # use processing_class (new API, avoids FutureWarning)
        data_collator=data_collator,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    print(f"[Train] 🚀 Starting fine-tuning on {len(split['train'])} examples...")
    print(f"[Train] Batch size: {BATCH_SIZE} | Gradient accumulation: {GRAD_ACCUM_STEPS} steps")
    print(f"[Train] Effective batch size: {BATCH_SIZE * GRAD_ACCUM_STEPS}")
    print("[Train] This will take ~15-30 minutes on CPU for a small dataset...")

    trainer.train()
    print("[Train] ✅ Training complete.")

    # Free GPU/CPU memory before saving
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    # Save locally
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(LOCAL_DIR / "model"))
    tokenizer.save_pretrained(str(LOCAL_DIR / "model"))
    print(f"[Train] Model saved locally → {LOCAL_DIR / 'model'}")

    return model, tokenizer


def push_to_hub(model, tokenizer, examples_count: int) -> bool:
    if not HF_TOKEN or not HF_USERNAME:
        print("[Train] ⚠️  HF_TOKEN or HF_USERNAME not set — skipping push.")
        return False

    print(f"[Train] Pushing model to https://huggingface.co/{HF_REPO_ID} ...")
    try:
        model.push_to_hub(
            HF_REPO_ID,
            token=HF_TOKEN,
            commit_message=f"Fine-tuned on {examples_count} user interactions — {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        )
        tokenizer.push_to_hub(HF_REPO_ID, token=HF_TOKEN)
        print(f"[Train] ✅ Model pushed → https://huggingface.co/{HF_REPO_ID}")
        print(f"[Train] ✅ Check HuggingFace: Files and versions tab should now show model files")
        return True
    except Exception as e:
        print(f"[Train] ❌ Push failed: {e}")
        return False


def mark_trained(examples_count: int, pushed: bool):
    from pymongo import MongoClient
    client = MongoClient(MONGODB_URI)
    db     = client[MONGODB_DB]
    # Mark examples as used
    db.training_data.update_many(
        {"feedback": 1, "used_in_training": False},
        {"$set": {"used_in_training": True}},
    )
    # Save version record
    db.model_versions.insert_one({
        "version":       datetime.now(timezone.utc).strftime("v%Y%m%d-%H%M"),
        "trained_at":    datetime.now(timezone.utc),
        "examples_used": examples_count,
        "base_model":    BASE_MODEL,
        "hf_repo":       HF_REPO_ID if pushed else "local-only",
        "pushed_to_hub": pushed,
    })
    client.close()
    print(f"[Train] Version record saved to MongoDB.")


def main():
    print("=" * 60)
    print("  PIA Fine-Tuning Script (Memory Optimized)")
    print(f"  Base model : {BASE_MODEL}")
    print(f"  Target repo: {HF_REPO_ID}")
    print("=" * 60)

    check_deps()
    check_memory()

    # Load data
    examples = load_training_data()
    if len(examples) < 3:
        print(f"[Train] ⚠️  Only {len(examples)} examples. Need at least 3.")
        print("[Train] Use the app, send prompts, click 👍 on responses, then retry.")
        sys.exit(0)

    raw_dataset = build_dataset(examples)

    # Use local model if exists, else base model
    model_path = str(LOCAL_DIR / "model") if (LOCAL_DIR / "model").exists() else BASE_MODEL
    print(f"[Train] Starting from: {model_path}")

    # Train
    model, tokenizer = train_model(raw_dataset, model_path)

    # Push to HuggingFace
    pushed = push_to_hub(model, tokenizer, len(examples))

    # Save version record
    mark_trained(len(examples), pushed)

    print("\n" + "=" * 60)
    print(f"  ✅ ALL DONE!")
    print(f"  Examples used       : {len(examples)}")
    print(f"  Pushed to HF Hub    : {'✅ Yes' if pushed else '❌ No — check HF_TOKEN'}")
    if pushed:
        print(f"  View on HuggingFace : https://huggingface.co/{HF_REPO_ID}")
        print(f"  → Click 'Files and versions' tab to see uploaded model files")
    print("=" * 60)


if __name__ == "__main__":
    main()
