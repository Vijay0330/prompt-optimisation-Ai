from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone

from schemas.models import PromptRequest, PromptResponse
from services.prompt_analyzer import extract_keywords, detect_task_type
from services.mcp_retriever import retrieve_tools, format_tools_for_prompt
from services.ai_compiler import compile_prompt
from services.summariser import summarise
from services.chat_agent import chat_with_agent
from services.casual_responder import detect_casual
from services.hf_inference import query_free_model
from services.feedback_collector import save_interaction
from services.rag_pipeline import run_rag          # ← Phase 5
from models.chat import new_chat_doc
from models.message import new_message_doc, message_to_json
from core.database import get_database
from core.security import get_current_user

router = APIRouter()
FREE_MODEL_ID = "free"


@router.post("/prompt-analyze", response_model=PromptResponse)
async def analyze_prompt(
    request: PromptRequest,
    current_user: dict = Depends(get_current_user),
):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    db      = get_database()
    user_id = current_user["sub"]
    mode    = request.mode
    model   = request.model or "gemini-2.0-flash"
    is_free = model == FREE_MODEL_ID

    # ── Resolve / create chat ─────────────────────────────────────────────────
    chat_id = request.chat_id
    if chat_id:
        try:
            chat_doc = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        except Exception:
            chat_doc = None
        if not chat_doc:
            raise HTTPException(status_code=404, detail="Chat not found.")
        if is_free:
            model = "gemini-2.0-flash"
    else:
        title = request.prompt[:60].strip()
        effective_model = "gemini-2.0-flash" if is_free else model
        doc   = new_chat_doc(user_id=user_id, title=title, mode=mode, model=effective_model)
        res   = await db.chats.insert_one(doc)
        chat_id = str(res.inserted_id)

    # ── Save user message ─────────────────────────────────────────────────────
    await db.messages.insert_one(new_message_doc(
        chat_id=chat_id, user_id=user_id, role="user",
        content=request.prompt, mode=mode,
    ))
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )

    # ── Casual intercept ──────────────────────────────────────────────────────
    casual_reply = detect_casual(request.prompt)
    if casual_reply:
        asst_doc = new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content="", mode=mode,
            casual_reply=casual_reply,
        )
        await db.messages.insert_one(asst_doc)
        return PromptResponse(casual_reply=casual_reply, chat_id=chat_id, mode=mode)

    # ── Phase 5: Run RAG pipeline ─────────────────────────────────────────────
    # Summarise mode only uses RAG for enrichment, not as primary source
    use_web    = (mode != "summarise")
    rag_context, citations = await run_rag(
        query=request.prompt,
        mode=mode,
        user_id=user_id,
        use_web=use_web,
    )

    # ─────────────────────────────────────────────────────────────────────────
    # FREE MODEL PATH
    # ─────────────────────────────────────────────────────────────────────────
    if is_free:
        hf_response, used_fallback = await query_free_model(request.prompt)

        if used_fallback:
            model = "gemini-2.0-flash"
            try:
                history_cursor = db.messages.find({"chat_id": chat_id}).sort("created_at", 1)
                history_docs   = await history_cursor.to_list(length=50)
                history        = [message_to_json(m) for m in history_docs]
                hf_response    = await chat_with_agent(
                    user_message=request.prompt,
                    history=history[:-1],
                    model=model,
                    rag_context=rag_context,    # ← RAG injected
                )
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"AI error: {str(e)}")

        asst_doc = new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content=hf_response, mode=mode,
        )
        result      = await db.messages.insert_one(asst_doc)
        msg_id      = str(result.inserted_id)
        model_label = "gemini-fallback" if used_fallback else "pia-free"
        training_id = await save_interaction(
            db, user_id, chat_id, msg_id,
            prompt=request.prompt, response=hf_response,
            mode=mode, model_used=model_label,
        )

        return PromptResponse(
            agent_reply=hf_response,
            chat_id=chat_id, mode=mode,
            used_fallback=used_fallback,
            training_id=training_id,
            rag_citations=citations,             # ← Phase 5
            rag_used=bool(citations),            # ← Phase 5
        )

    # ─────────────────────────────────────────────────────────────────────────
    # PROMPT OPTIMIZATION — RAG enriches MCP tool selection + prompt quality
    # ─────────────────────────────────────────────────────────────────────────
    if mode == "prompt_optimization":
        keywords      = extract_keywords(request.prompt)
        task_type     = detect_task_type(request.prompt)
        matched_tools = retrieve_tools(keywords, task_type, top_k=5)
        tools_text    = format_tools_for_prompt(matched_tools)

        try:
            result = await compile_prompt(
                request.prompt, tools_text,
                model=model,
                rag_context=rag_context,        # ← RAG injected
            )
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

        response_text = result.get("optimized_prompt", "")
        asst_doc = new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content="", mode=mode,
            result={
                "optimized_prompt": response_text,
                "skill_persona":    result.get("skill_persona", ""),
                "mcp_suggestions":  result.get("mcp_suggestions", []),
            },
        )
        res    = await db.messages.insert_one(asst_doc)
        msg_id = str(res.inserted_id)
        training_id = await save_interaction(
            db, user_id, chat_id, msg_id,
            prompt=request.prompt, response=response_text,
            mode=mode, model_used=model,
        )

        return PromptResponse(
            optimized_prompt=response_text,
            skill_persona=result.get("skill_persona", ""),
            mcp_suggestions=result.get("mcp_suggestions", []),
            chat_id=chat_id, mode=mode,
            training_id=training_id,
            rag_citations=citations,
            rag_used=bool(citations),
        )

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARISE — RAG enriches background context
    # ─────────────────────────────────────────────────────────────────────────
    elif mode == "summarise":
        try:
            summary_result = await summarise(request.prompt, model=model)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

        summary_text = summary_result.get("tldr", "")
        asst_doc = new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content="", mode=mode,
            summary=summary_result,
        )
        res    = await db.messages.insert_one(asst_doc)
        msg_id = str(res.inserted_id)
        training_id = await save_interaction(
            db, user_id, chat_id, msg_id,
            prompt=request.prompt, response=summary_text,
            mode=mode, model_used=model,
        )

        return PromptResponse(
            summary=summary_result,
            chat_id=chat_id, mode=mode,
            training_id=training_id,
            rag_citations=citations,
            rag_used=bool(citations),
        )

    # ─────────────────────────────────────────────────────────────────────────
    # AGENT — RAG is primary grounding source
    # ─────────────────────────────────────────────────────────────────────────
    elif mode == "agent":
        history_cursor = db.messages.find({"chat_id": chat_id}).sort("created_at", 1)
        history_docs   = await history_cursor.to_list(length=50)
        history        = [message_to_json(m) for m in history_docs]

        try:
            agent_reply = await chat_with_agent(
                user_message=request.prompt,
                history=history[:-1],
                model=model,
                rag_context=rag_context,        # ← RAG injected
            )
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

        asst_doc = new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content=agent_reply, mode=mode,
        )
        res    = await db.messages.insert_one(asst_doc)
        msg_id = str(res.inserted_id)
        training_id = await save_interaction(
            db, user_id, chat_id, msg_id,
            prompt=request.prompt, response=agent_reply,
            mode=mode, model_used=model,
        )

        return PromptResponse(
            agent_reply=agent_reply,
            chat_id=chat_id, mode=mode,
            training_id=training_id,
            rag_citations=citations,            # ← Phase 5
            rag_used=bool(citations),           # ← Phase 5
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")
