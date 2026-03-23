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
    # ── MongoDB — connect but never crash startup on failure ──────────────────
    # If connect_db() raises, catch it and log — uvicorn still binds the port.
    # Requests that need DB will fail gracefully with 503 instead of killing
    # the entire process with exit status 3.
    try:
        await connect_db()
    except Exception as e:
        print(f"[Startup] MongoDB connection failed: {e}")
        print("[Startup] Server starting anyway — DB calls will retry.")

    # ── Knowledge base seeding — fully non-blocking background task ───────────
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
