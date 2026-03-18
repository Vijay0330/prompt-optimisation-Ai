from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.database import connect_db, close_db
from api.routes          import router as prompt_router
from api.auth            import router as auth_router
from api.chats           import router as chats_router
from api.output_routes   import router as output_router
from api.feedback_routes import router as feedback_router
from api.rag_routes      import router as rag_router      # ← Phase 5


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Connect to MongoDB ────────────────────────────────────────────────────
    await connect_db()

    # ── Phase 5: Seed ChromaDB knowledge base at startup ─────────────────────
    try:
        from services.knowledge_seeder import seed_knowledge_base
        await seed_knowledge_base()
    except Exception as e:
        print(f"[Startup] Knowledge base seeding failed (non-fatal): {e}")

    yield
    await close_db()


app = FastAPI(
    title="Prompt Intelligence Assistant",
    description="AI workspace with RAG, custom HuggingFace model, feedback loop, and output generation",
    version="5.0.0",
    lifespan=lifespan,
)

_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,     prefix="/api")
app.include_router(chats_router,    prefix="/api")
app.include_router(prompt_router,   prefix="/api")
app.include_router(output_router,   prefix="/api")
app.include_router(feedback_router, prefix="/api")
app.include_router(rag_router,      prefix="/api")       # ← Phase 5


@app.get("/")
def health_check():
    return {
        "status":  "ok",
        "version": "5.0.0",
        "message": "PIA — Phase 5 RAG active",
    }
