from fastapi import APIRouter, HTTPException, Response, Depends, status
from core.database import get_database
from core.security import hash_password, verify_password, create_access_token, get_current_user
from models.user import new_user_doc
from schemas.models import RegisterRequest, LoginRequest, UserResponse, UpdateModelRequest
import os

router = APIRouter(prefix="/auth", tags=["auth"])

IS_PROD    = os.getenv("ENV", "development") == "production"
COOKIE_MAX = int(os.getenv("JWT_EXPIRE_MINUTES", "10080")) * 60

# bcrypt supports max 72 bytes — we enforce this at the API layer too
_MAX_PASSWORD_BYTES = 72


def _validate_password(password: str, field: str = "Password"):
    if len(password) < 6:
        raise HTTPException(status_code=400, detail=f"{field} must be at least 6 characters.")
    if len(password.encode("utf-8")) > _MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"{field} is too long. Maximum is 72 characters.",
        )


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=IS_PROD,
        samesite="lax",
        max_age=COOKIE_MAX,
        path="/",
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: RegisterRequest, response: Response):
    _validate_password(body.password)

    db = get_database()
    existing = await db.users.find_one({"email": body.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    hashed  = hash_password(body.password)
    doc     = new_user_doc(email=body.email, hashed_password=hashed)
    result  = await db.users.insert_one(doc)
    user_id = str(result.inserted_id)
    token   = create_access_token(user_id=user_id, email=body.email)

    _set_cookie(response, token)

    return UserResponse(
        id=user_id,
        email=body.email,
        preferred_model="gemini-2.0-flash",
        token=token,
    )


@router.post("/login", response_model=UserResponse)
async def login(body: LoginRequest, response: Response):
    db = get_database()

    user = await db.users.find_one({"email": body.email.lower().strip()})

    # Verify password — security.py handles 72-byte truncation internally
    # so existing hashed passwords from before this fix still work correctly
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = str(user["_id"])
    token   = create_access_token(user_id=user_id, email=user["email"])

    _set_cookie(response, token)

    return UserResponse(
        id=user_id,
        email=user["email"],
        preferred_model=user.get("preferred_model", "gemini-2.0-flash"),
        token=token,
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", httponly=True, samesite="lax", path="/")
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_database()
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        preferred_model=user.get("preferred_model", "gemini-2.0-flash"),
    )


@router.patch("/model", response_model=UserResponse)
async def update_preferred_model(
    body: UpdateModelRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    from bson import ObjectId
    from datetime import datetime, timezone

    await db.users.update_one(
        {"_id": ObjectId(current_user["sub"])},
        {"$set": {
            "preferred_model": body.preferred_model,
            "updated_at":      datetime.now(timezone.utc),
        }},
    )
    user = await db.users.find_one({"_id": ObjectId(current_user["sub"])})
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        preferred_model=user.get("preferred_model", "gemini-2.0-flash"),
    )
