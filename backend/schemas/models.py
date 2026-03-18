from pydantic import BaseModel, EmailStr
from typing import List, Optional, Literal, Dict, Any


# ── Auth ──────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    preferred_model: str
    token: Optional[str] = None


# ── Chats ─────────────────────────────────────────────────────────────────────
class ChatCreate(BaseModel):
    title: Optional[str] = "New Chat"
    mode:  Literal["prompt_optimization", "summarise", "agent"] = "prompt_optimization"
    model: str = "gemini-2.0-flash"

class ChatResponse(BaseModel):
    id: str
    title: str
    mode: str
    model: str
    created_at: str
    updated_at: str


# ── Prompt Analyze ────────────────────────────────────────────────────────────
class PromptRequest(BaseModel):
    prompt:  str
    mode:    Literal["prompt_optimization", "summarise", "agent"] = "prompt_optimization"
    model:   str = "gemini-2.0-flash"    # "free" → HuggingFace
    chat_id: Optional[str] = None

class SummaryResult(BaseModel):
    tldr:       str
    key_points: List[str]
    read_time:  str

# ── Phase 5: RAG Citation ─────────────────────────────────────────────────────
class RagCitation(BaseModel):
    index:  int
    title:  str
    source: str
    type:   str    # "knowledge_base" | "user_document" | "web_search"
    score:  float

class PromptResponse(BaseModel):
    optimized_prompt: Optional[str]          = None
    skill_persona:    Optional[str]          = None
    mcp_suggestions:  Optional[List[str]]    = None
    summary:          Optional[SummaryResult] = None
    agent_reply:      Optional[str]          = None
    casual_reply:     Optional[str]          = None
    chat_id:          Optional[str]          = None
    mode:             Optional[str]          = None
    # Phase 4
    training_id:      Optional[str]          = None
    used_fallback:    Optional[bool]         = None
    # Phase 5 RAG
    rag_citations:    Optional[List[RagCitation]] = None
    rag_used:         Optional[bool]         = None


# ── Output Generation ─────────────────────────────────────────────────────────
class PptOptions(BaseModel):
    theme:         str = "ocean"
    font_size:     str = "medium"
    custom_header: Optional[str] = None

class OutputRequest(BaseModel):
    prompt:      str
    output_type: Literal["image", "pdf", "ppt"]
    model:       str = "gemini-2.0-flash"
    chat_id:     Optional[str] = None
    ppt_options: Optional[PptOptions] = None

class OutputResponse(BaseModel):
    output_type:  str
    image_url:    Optional[str] = None
    file_b64:     Optional[str] = None
    filename:     Optional[str] = None
    mime_type:    Optional[str] = None
    preview_text: Optional[str] = None
    slide_count:  Optional[int] = None
    page_count:   Optional[int] = None
    chat_id:      Optional[str] = None
    mode:         str = "output"


# ── Feedback ──────────────────────────────────────────────────────────────────
class FeedbackRequest(BaseModel):
    training_id: str
    feedback:    int    # 1 = up, -1 = down


# ── Model preference ──────────────────────────────────────────────────────────
class UpdateModelRequest(BaseModel):
    preferred_model: str
