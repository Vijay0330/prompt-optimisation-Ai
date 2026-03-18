import base64
import urllib.parse
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from schemas.models import OutputRequest, OutputResponse
from services.pdf_generator import generate_pdf
from services.ppt_generator import generate_ppt
from models.chat import new_chat_doc
from models.message import new_message_doc
from core.database import get_database
from core.security import get_current_user

router = APIRouter()

# Pollinations base URL (image generation — no API key needed)
POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"


@router.post("/generate-output", response_model=OutputResponse)
async def generate_output(
    request: OutputRequest,
    current_user: dict = Depends(get_current_user),
):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    db      = get_database()
    user_id = current_user["sub"]
    model   = request.model or "gemini-2.0-flash"

    # ── Resolve or auto-create chat ──────────────────────────────────────────
    chat_id = request.chat_id
    if chat_id:
        try:
            chat_doc = await db.chats.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
        except Exception:
            chat_doc = None
        if not chat_doc:
            raise HTTPException(status_code=404, detail="Chat not found.")
    else:
        title = request.prompt[:60].strip()
        doc   = new_chat_doc(user_id=user_id, title=title, mode="output", model=model)
        res   = await db.chats.insert_one(doc)
        chat_id = str(res.inserted_id)

    # ── Save user message ────────────────────────────────────────────────────
    await db.messages.insert_one(new_message_doc(
        chat_id=chat_id, user_id=user_id,
        role="user", content=request.prompt, mode="output",
    ))
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"updated_at": datetime.now(timezone.utc)}},
    )

    # ── IMAGE ────────────────────────────────────────────────────────────────
    if request.output_type == "image":
        encoded  = urllib.parse.quote(request.prompt)
        # Width/height for high quality, nologo flag for clean output
        image_url = f"{POLLINATIONS_BASE}/{encoded}?width=1280&height=720&nologo=true&enhance=true"

        await db.messages.insert_one(new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content="", mode="output",
            result={"output_type": "image", "image_url": image_url, "prompt": request.prompt},
        ))

        return OutputResponse(
            output_type="image",
            image_url=image_url,
            preview_text=request.prompt,
            chat_id=chat_id,
        )

    # ── PDF ──────────────────────────────────────────────────────────────────
    elif request.output_type == "pdf":
        try:
            pdf_bytes, meta = await generate_pdf(request.prompt, model=model)
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"PDF generation failed: {str(e)}")

        file_b64  = base64.b64encode(pdf_bytes).decode("utf-8")
        filename  = f"{meta['title'][:40].replace(' ', '_')}.pdf"

        await db.messages.insert_one(new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content="", mode="output",
            result={
                "output_type":  "pdf",
                "filename":     filename,
                "title":        meta["title"],
                "page_count":   meta["page_count"],
                "section_count": meta["section_count"],
            },
        ))

        return OutputResponse(
            output_type="pdf",
            file_b64=file_b64,
            filename=filename,
            mime_type="application/pdf",
            preview_text=meta["title"],
            page_count=meta["page_count"],
            chat_id=chat_id,
        )

    # ── PPT ──────────────────────────────────────────────────────────────────
    elif request.output_type == "ppt":
        opts = request.ppt_options
        theme         = opts.theme         if opts else "ocean"
        font_size     = opts.font_size     if opts else "medium"
        custom_header = opts.custom_header if opts else None

        try:
            pptx_bytes, meta = await generate_ppt(
                topic=request.prompt,
                model=model,
                theme=theme,
                font_size=font_size,
                custom_header=custom_header,
            )
        except ValueError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"PPT generation failed: {str(e)}")

        file_b64  = base64.b64encode(pptx_bytes).decode("utf-8")
        filename  = f"{meta['title'][:40].replace(' ', '_')}.pptx"
        mime_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

        await db.messages.insert_one(new_message_doc(
            chat_id=chat_id, user_id=user_id,
            role="assistant", content="", mode="output",
            result={
                "output_type": "ppt",
                "filename":    filename,
                "title":       meta["title"],
                "slide_count": meta["slide_count"],
                "theme":       theme,
            },
        ))

        return OutputResponse(
            output_type="ppt",
            file_b64=file_b64,
            filename=filename,
            mime_type=mime_type,
            preview_text=meta["title"],
            slide_count=meta["slide_count"],
            chat_id=chat_id,
        )

    else:
        raise HTTPException(status_code=400, detail=f"Unknown output_type: {request.output_type}")
