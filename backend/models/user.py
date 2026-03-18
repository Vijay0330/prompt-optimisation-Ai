from datetime import datetime, timezone


def new_user_doc(email: str, hashed_password: str, preferred_model: str = "gemini-2.0-flash") -> dict:
    """Returns a new user document ready to insert into MongoDB."""
    return {
        "email": email.lower().strip(),
        "hashed_password": hashed_password,
        "preferred_model": preferred_model,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
