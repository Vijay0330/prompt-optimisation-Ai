import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Request, status

# ── Password hashing ──────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt hard limit is 72 bytes.
# New passlib/bcrypt versions raise ValueError instead of silently truncating.
# We truncate explicitly so behavior is consistent regardless of library version.
_BCRYPT_MAX = 72


def _safe_encode(plain: str) -> str:
    """Truncate password to 72 bytes (bcrypt limit) and return as string."""
    encoded = plain.encode("utf-8")
    if len(encoded) > _BCRYPT_MAX:
        encoded = encoded[:_BCRYPT_MAX]
    return encoded.decode("utf-8", errors="ignore")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(_safe_encode(plain))


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(_safe_encode(plain), hashed)


# ── JWT ────────────────────────────────────────────────────────────────────────
JWT_SECRET         = os.getenv("JWT_SECRET", "change-me-in-production-min-32-chars!!")
JWT_ALGORITHM      = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days


def create_access_token(user_id: str, email: str) -> str:
    expire  = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token. Please log in again. ({e})",
        )


# ── Request auth dependency ───────────────────────────────────────────────────
def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency — reads JWT from:
      1. httpOnly cookie 'access_token'   (primary)
      2. Authorization: Bearer <token>    (fallback / Swagger)
    """
    token = request.cookies.get("access_token")

    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return decode_access_token(token)
