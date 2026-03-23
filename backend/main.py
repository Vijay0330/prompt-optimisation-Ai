from dotenv import load_dotenv
load_dotenv()

import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.database import connect_db, close_db
from api.routes          import router as prompt_router
from api.auth            import router as auth_router
from api.chats           import router as chats_router
from api.output_routes   import router as output_router
from api.feedback_routes import router as feedback_router
from api.rag_routes      import router as rag_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Connect to MongoDB — must succeed before serving requests ─────────────
    await connect_db()

    # ── Seed knowledge base in background — does NOT block port binding ───────
    # Render kills the process if port is not bound within ~60s.
    # sentence-transformers downloads ~90MB on first run which takes >60s.
    # Running it as a background task lets uvicorn bind the port immediately
    # while seeding completes in the background.
    asyncio.create_task(_seed_bg())

    yield
    await close_db()


async def _seed_bg():
    """Background task — seeds ChromaDB after server is already running."""
    try:
        from services.knowledge_seeder import seed_knowledge_base
        await seed_knowledge_base()
    except Exception as e:
        print(f"[Startup] Knowledge base seeding failed (non-fatal): {e}")


app = FastAPI(
    title="Prompt Intelligence Assistant",
    description="AI workspace with RAG, HuggingFace model, feedback loop, and output generation",
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
app.include_router(rag_router,      prefix="/api")


@app.get("/")
def health_check():
    return {
        "status":  "ok",
        "version": "5.0.0",
        "message": "PIA — Phase 5 RAG active",
    }
